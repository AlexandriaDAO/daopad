use candid::{CandidType, Deserialize, Nat, Principal};
use std::cell::RefCell;
use std::collections::HashMap;

use crate::icrc_types::{collect_fee, transfer_to_user, CKUSDT_CANISTER};
use crate::precision::multiply_and_divide;
use crate::types::TrackedToken;
use crate::balance_tracker::get_token_balance;
use crate::icpi_token::{burn_tokens, total_supply, get_balance};

const TIMEOUT_NANOS: u64 = 60_000_000_000; // 60 seconds

// Burn result details (exported for lib.rs)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct BurnResult {
    pub successful_transfers: Vec<(String, Nat)>,    // (token_symbol, amount)
    pub failed_transfers: Vec<(String, Nat, String)>, // (token_symbol, amount, error)
    pub icpi_burned: Nat,
}

// Pending burn operation status (exported for lib.rs)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum BurnStatus {
    Pending,
    CollectingFee,
    LockingTokens,
    CalculatingAmounts,
    TransferringTokens,
    Complete(BurnResult),
    Failed(String),
    Expired,
}

// Pending burn operation
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct PendingBurn {
    pub id: String,
    pub user: Principal,
    pub icpi_amount: Nat,
    pub tokens_to_receive: Vec<(String, Nat)>, // (token_symbol, amount)
    pub status: BurnStatus,
    pub created_at: u64,
    pub expires_at: u64,
}

// Thread-local storage (in-memory for safety)
thread_local! {
    static PENDING_BURNS: RefCell<HashMap<String, PendingBurn>> = RefCell::new(HashMap::new());
}

// Generate unique burn ID
fn generate_burn_id(user: Principal) -> String {
    format!("burn_{}_{}", user.to_text(), ic_cdk::api::time())
}

// Initiate burn - Phase 1
pub async fn initiate_burn(icpi_amount: Nat) -> Result<String, String> {
    let caller = ic_cdk::caller();

    // Validate amount
    if icpi_amount < Nat::from(1u32) {
        return Err("Amount must be positive".to_string());
    }

    // Check user balance
    let user_balance = get_balance(caller);
    if user_balance < icpi_amount {
        return Err(format!("Insufficient balance. Have: {}, Need: {}", user_balance, icpi_amount));
    }

    let burn_id = generate_burn_id(caller);
    let now = ic_cdk::api::time();

    // Create pending burn
    let pending_burn = PendingBurn {
        id: burn_id.clone(),
        user: caller,
        icpi_amount: icpi_amount.clone(),
        tokens_to_receive: Vec::new(),
        status: BurnStatus::Pending,
        created_at: now,
        expires_at: now + TIMEOUT_NANOS,
    };

    // Store pending burn
    PENDING_BURNS.with(|burns| {
        let mut burns = burns.borrow_mut();
        burns.insert(burn_id.clone(), pending_burn);
    });

    ic_cdk::println!("Burn initiated: {} for user {}", burn_id, caller);

    Ok(burn_id)
}

// Complete burn - Phase 2
pub async fn complete_burn(burn_id: String) -> Result<BurnResult, String> {
    let caller = ic_cdk::caller();
    let now = ic_cdk::api::time();

    // Get pending burn
    let mut pending_burn = PENDING_BURNS.with(|burns| {
        burns.borrow().get(&burn_id).cloned()
    }).ok_or_else(|| "Burn not found".to_string())?;

    // Verify ownership
    if pending_burn.user != caller {
        return Err("Unauthorized".to_string());
    }

    // Check expiration
    if now > pending_burn.expires_at {
        pending_burn.status = BurnStatus::Expired;
        update_pending_burn(&pending_burn);
        return Err("Burn expired".to_string());
    }

    // Step 1: Collect fee
    pending_burn.status = BurnStatus::CollectingFee;
    update_pending_burn(&pending_burn);

    let fee_result = collect_fee(caller).await;
    if let Err(e) = fee_result {
        pending_burn.status = BurnStatus::Failed(format!("Fee collection failed: {}", e));
        update_pending_burn(&pending_burn);
        return Err(format!("Fee collection failed: {}", e));
    }

    ic_cdk::println!("Fee collected for burn {}", burn_id);

    // Step 2: Lock ICPI tokens (internal operation)
    pending_burn.status = BurnStatus::LockingTokens;
    update_pending_burn(&pending_burn);

    // Verify user still has sufficient balance
    let user_balance = get_balance(caller);
    if user_balance < pending_burn.icpi_amount {
        pending_burn.status = BurnStatus::Failed("Insufficient ICPI balance".to_string());
        update_pending_burn(&pending_burn);
        return Err("Insufficient ICPI balance".to_string());
    }

    ic_cdk::println!("ICPI tokens locked for burn {}", burn_id);

    // Step 3: Calculate redemption amounts
    pending_burn.status = BurnStatus::CalculatingAmounts;
    update_pending_burn(&pending_burn);

    let current_supply = total_supply();
    if current_supply == Nat::from(0u32) {
        pending_burn.status = BurnStatus::Failed("No supply".to_string());
        update_pending_burn(&pending_burn);
        return Err("No ICPI supply".to_string());
    }

    // Calculate proportional amounts for each tracked token + ckUSDT
    let tracked_tokens = vec![
        TrackedToken::ALEX,
        TrackedToken::ZERO,
        TrackedToken::KONG,
        TrackedToken::BOB,
    ];

    let mut tokens_to_receive = Vec::new();

    // CRITICAL FIX: First, calculate ckUSDT redemption
    let ckusdt_canister = Principal::from_text(crate::icrc_types::CKUSDT_CANISTER)
        .map_err(|e| format!("Invalid ckUSDT principal: {}", e))?;

    // Query ckUSDT balance of the ICPI canister
    let ckusdt_balance = crate::icrc_types::query_icrc1_balance(
        ckusdt_canister,
        ic_cdk::api::id()
    ).await.unwrap_or_else(|e| {
        ic_cdk::println!("Warning: Failed to get ckUSDT balance: {}", e);
        Nat::from(0u32)
    });

    if ckusdt_balance > Nat::from(0u32) {
        // Calculate proportional ckUSDT: (burn_amount / total_supply) * balance
        let ckusdt_amount = multiply_and_divide(
            &pending_burn.icpi_amount,
            &ckusdt_balance,
            &current_supply
        ).unwrap_or_else(|e| {
            ic_cdk::println!("Warning: ckUSDT calculation failed: {}", e);
            Nat::from(0u32)
        });

        // Skip dust amounts (less than 0.01 ckUSDT = 10000 in e6)
        if ckusdt_amount > Nat::from(10000u32) {
            tokens_to_receive.push(("ckUSDT".to_string(), ckusdt_amount));
        }
    }

    // Then calculate tracked token redemptions (existing logic)
    for token in tracked_tokens {
        // Get canister's balance of this token
        let balance = get_token_balance(&token).await
            .unwrap_or_else(|e| {
                ic_cdk::println!("Warning: Failed to get {} balance: {}", token.to_symbol(), e);
                Nat::from(0u32)
            });

        if balance > Nat::from(0u32) {
            // Calculate proportional amount: (burn_amount / total_supply) * balance
            let amount = multiply_and_divide(&pending_burn.icpi_amount, &balance, &current_supply)
                .unwrap_or_else(|e| {
                    ic_cdk::println!("Warning: Calculation failed for {}: {}", token.to_symbol(), e);
                    Nat::from(0u32)
                });

            // Skip dust amounts
            if amount > Nat::from(1000u32) {
                tokens_to_receive.push((token.to_symbol().to_string(), amount));
            }
        }
    }

    pending_burn.tokens_to_receive = tokens_to_receive.clone();
    update_pending_burn(&pending_burn);

    ic_cdk::println!("Calculated {} token transfers for burn {}", tokens_to_receive.len(), burn_id);

    // Step 4: Execute transfers sequentially
    pending_burn.status = BurnStatus::TransferringTokens;
    update_pending_burn(&pending_burn);

    let mut result = BurnResult {
        successful_transfers: Vec::new(),
        failed_transfers: Vec::new(),
        icpi_burned: pending_burn.icpi_amount.clone(),
    };

    for (token_symbol, amount) in tokens_to_receive.iter() {
        // Special handling for ckUSDT
        let token_canister = if token_symbol == "ckUSDT" {
            Principal::from_text(crate::icrc_types::CKUSDT_CANISTER)
                .map_err(|e| format!("Invalid ckUSDT canister: {}", e))
                .unwrap_or_else(|err| {
                    result.failed_transfers.push((
                        token_symbol.clone(),
                        amount.clone(),
                        err.clone()
                    ));
                    // Skip to next token by returning a dummy principal
                    Principal::from_text("aaaaa-aa").unwrap()
                })
        } else {
            // Existing token lookup logic
            let token = match token_symbol.as_str() {
                "ALEX" => TrackedToken::ALEX,
                "ZERO" => TrackedToken::ZERO,
                "KONG" => TrackedToken::KONG,
                "BOB" => TrackedToken::BOB,
                _ => {
                    result.failed_transfers.push((
                        token_symbol.clone(),
                        amount.clone(),
                        "Unknown token".to_string()
                    ));
                    continue;
                }
            };

            match token.get_canister_id() {
                Ok(c) => c,
                Err(e) => {
                    result.failed_transfers.push((
                        token_symbol.clone(),
                        amount.clone(),
                        format!("Invalid canister: {}", e)
                    ));
                    continue;
                }
            }
        };

        // Skip if we had an error getting canister
        if token_canister == Principal::from_text("aaaaa-aa").unwrap() {
            continue;
        }

        // Transfer token to user
        let transfer_result = transfer_to_user(
            token_canister,
            caller,
            amount.clone(),
            format!("ICPI burn {}", burn_id),
        ).await;

        match transfer_result {
            Ok(block_index) => {
                ic_cdk::println!("Transferred {} {} to user (block: {})", amount, token_symbol, block_index);
                result.successful_transfers.push((token_symbol.clone(), amount.clone()));
            }
            Err(e) => {
                ic_cdk::println!("Failed to transfer {} {}: {}", amount, token_symbol, e);
                result.failed_transfers.push((token_symbol.clone(), amount.clone(), e));
            }
        }
    }

    // Step 5: Burn ICPI tokens (always happens, even if some transfers failed)
    burn_tokens(caller, pending_burn.icpi_amount.clone())
        .map_err(|e| {
            pending_burn.status = BurnStatus::Failed(format!("Burn failed: {}", e));
            update_pending_burn(&pending_burn);
            format!("Burn failed: {}", e)
        })?;

    ic_cdk::println!("Burned {} ICPI from {}", pending_burn.icpi_amount, caller);

    // Step 6: Mark as complete
    pending_burn.status = BurnStatus::Complete(result.clone());
    update_pending_burn(&pending_burn);

    Ok(result)
}

// Check burn status
pub fn check_burn_status(burn_id: String) -> Result<BurnStatus, String> {
    PENDING_BURNS.with(|burns| {
        burns.borrow()
            .get(&burn_id)
            .map(|b| b.status.clone())
            .ok_or_else(|| "Burn not found".to_string())
    })
}

// Helper to update pending burn
fn update_pending_burn(pending_burn: &PendingBurn) {
    PENDING_BURNS.with(|burns| {
        let mut burns = burns.borrow_mut();
        burns.insert(pending_burn.id.clone(), pending_burn.clone());
    });
}

// Cleanup expired burns (called periodically)
pub fn cleanup_expired_burns() {
    let now = ic_cdk::api::time();

    PENDING_BURNS.with(|burns| {
        let mut burns_mut = burns.borrow_mut();
        let mut to_update = Vec::new();
        let mut to_remove = Vec::new();

        // Collect items to update/remove (can't modify while iterating)
        for (id, burn) in burns_mut.iter() {
            if now > burn.expires_at {
                match burn.status {
                    BurnStatus::Pending | BurnStatus::CollectingFee | BurnStatus::LockingTokens => {
                        // Mark as expired (tokens remain with user)
                        let mut expired_burn = burn.clone();
                        expired_burn.status = BurnStatus::Expired;
                        to_update.push((id.clone(), expired_burn));
                    }
                    BurnStatus::Complete(_) | BurnStatus::Failed(_) | BurnStatus::Expired => {
                        // Remove old completed/failed burns after 24 hours
                        if now > burn.expires_at + 86_400_000_000_000 {
                            to_remove.push(id.clone());
                        }
                    }
                    _ => {}
                }
            }
        }

        // Apply updates
        for (id, burn) in to_update {
            burns_mut.insert(id, burn);
        }

        // Apply removals
        for id in to_remove {
            burns_mut.remove(&id);
        }
    });
}

// Start cleanup timer
pub fn start_cleanup_timer() {
    ic_cdk_timers::set_timer_interval(
        std::time::Duration::from_secs(300), // Every 5 minutes
        || {
            cleanup_expired_burns();
        }
    );
}