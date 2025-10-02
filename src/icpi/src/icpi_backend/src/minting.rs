use candid::{CandidType, Deserialize, Nat, Principal};
use std::cell::RefCell;
use std::collections::HashMap;

use crate::icrc_types::{collect_fee, collect_deposit, CKUSDT_CANISTER, CKUSDT_DECIMALS, ICPI_DECIMALS};
use crate::precision::{multiply_and_divide, convert_decimals};
use crate::tvl_calculator::calculate_tvl_in_ckusdt;
use crate::icpi_token::{mint_tokens, total_supply};

const TIMEOUT_NANOS: u64 = 60_000_000_000; // 60 seconds

// Helper to refund deposit on failure (keeps fee as intended)
async fn refund_deposit(
    user: Principal,
    amount: Nat,
    reason: String,
) -> Result<(), String> {
    ic_cdk::println!("Refunding {} ckUSDT to {} (reason: {})", amount, user, reason);

    let ckusdt_canister = Principal::from_text(CKUSDT_CANISTER)
        .map_err(|e| format!("Invalid ckUSDT principal: {}", e))?;

    // Use the existing transfer_to_user helper from icrc_types
    crate::icrc_types::transfer_to_user(
        ckusdt_canister,
        user,
        amount,
        format!("ICPI mint refund: {}", reason),
    ).await.map(|_| ())
}

// Pending mint operation status (exported for lib.rs)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum MintStatus {
    Pending,
    CollectingFee,
    CollectingDeposit,
    Calculating,
    Refunding,              // Refund in progress
    Minting,
    Complete(Nat),          // ICPI amount minted
    Failed(String),         // Generic failure (legacy)
    FailedRefunded(String), // Failed but deposit refunded
    FailedNoRefund(String), // Failed and refund also failed
    Expired,
}

// Pending mint operation
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct PendingMint {
    pub id: String,
    pub user: Principal,
    pub ckusdt_amount: Nat,
    pub icpi_to_mint: Option<Nat>,
    pub status: MintStatus,
    pub created_at: u64,
    pub expires_at: u64,
}

// Thread-local storage for pending mints (in-memory for safety)
thread_local! {
    static PENDING_MINTS: RefCell<HashMap<String, PendingMint>> = RefCell::new(HashMap::new());
}

// Generate unique mint ID
fn generate_mint_id(user: Principal) -> String {
    format!("mint_{}_{}", user.to_text(), ic_cdk::api::time())
}

// Initiate mint - Phase 1
pub async fn initiate_mint(ckusdt_amount: Nat) -> Result<String, String> {
    let caller = ic_cdk::caller();

    // Validate amount
    if ckusdt_amount < Nat::from(1_000_000u32) {
        return Err("Minimum deposit is 1 ckUSDT".to_string());
    }

    let mint_id = generate_mint_id(caller);
    let now = ic_cdk::api::time();

    // Create pending mint
    let pending_mint = PendingMint {
        id: mint_id.clone(),
        user: caller,
        ckusdt_amount: ckusdt_amount.clone(),
        icpi_to_mint: None,
        status: MintStatus::Pending,
        created_at: now,
        expires_at: now + TIMEOUT_NANOS,
    };

    // Store pending mint
    PENDING_MINTS.with(|mints| {
        let mut mints = mints.borrow_mut();
        mints.insert(mint_id.clone(), pending_mint);
    });

    ic_cdk::println!("Mint initiated: {} for user {}", mint_id, caller);

    Ok(mint_id)
}

// Complete mint - Phase 2
pub async fn complete_mint(mint_id: String) -> Result<Nat, String> {
    let caller = ic_cdk::caller();
    let now = ic_cdk::api::time();

    // Get pending mint
    let mut pending_mint = PENDING_MINTS.with(|mints| {
        mints.borrow().get(&mint_id).cloned()
    }).ok_or_else(|| "Mint not found".to_string())?;

    // Verify ownership
    if pending_mint.user != caller {
        return Err("Unauthorized".to_string());
    }

    // Check expiration
    if now > pending_mint.expires_at {
        pending_mint.status = MintStatus::Expired;
        update_pending_mint(&pending_mint);
        return Err("Mint expired".to_string());
    }

    // Step 1: Collect fee
    pending_mint.status = MintStatus::CollectingFee;
    update_pending_mint(&pending_mint);

    let fee_result = collect_fee(caller).await;
    if let Err(e) = fee_result {
        pending_mint.status = MintStatus::Failed(format!("Fee collection failed: {}", e));
        update_pending_mint(&pending_mint);
        return Err(format!("Fee collection failed: {}", e));
    }

    ic_cdk::println!("Fee collected for mint {}", mint_id);

    // Step 2: Collect deposit
    pending_mint.status = MintStatus::CollectingDeposit;
    update_pending_mint(&pending_mint);

    let deposit_result = collect_deposit(
        caller,
        pending_mint.ckusdt_amount.clone(),
        format!("ICPI mint {}", mint_id),
    ).await;

    if let Err(e) = deposit_result {
        pending_mint.status = MintStatus::Failed(format!("Deposit collection failed: {}", e));
        update_pending_mint(&pending_mint);
        // Note: Fee is NOT refunded on failure (as per plan)
        return Err(format!("Deposit collection failed: {}", e));
    }

    ic_cdk::println!("Deposit collected for mint {}", mint_id);

    // Step 3: Calculate ICPI to mint with refund on failure
    pending_mint.status = MintStatus::Calculating;
    update_pending_mint(&pending_mint);

    let current_supply = total_supply();

    // Calculate TVL of canister holdings (includes all tokens + ckUSDT)
    let current_tvl = match calculate_tvl_in_ckusdt().await {
        Ok(tvl) => tvl,
        Err(e) => {
            // Update status to show we're refunding
            pending_mint.status = MintStatus::Refunding;
            update_pending_mint(&pending_mint);

            // Attempt to refund deposit (best effort)
            match refund_deposit(
                caller,
                pending_mint.ckusdt_amount.clone(),
                format!("TVL calculation failed: {}", e)
            ).await {
                Ok(_) => {
                    ic_cdk::println!("Successfully refunded {} to {}", pending_mint.ckusdt_amount, caller);
                    pending_mint.status = MintStatus::FailedRefunded(
                        format!("TVL calc failed, deposit refunded: {}", e)
                    );
                }
                Err(refund_err) => {
                    ic_cdk::println!("ERROR: Failed to refund deposit: {}", refund_err);
                    pending_mint.status = MintStatus::FailedNoRefund(format!(
                        "TVL failed: {}. Refund failed: {}. Amount: {}. Contact support.",
                        e, refund_err, pending_mint.ckusdt_amount
                    ));
                }
            }
            update_pending_mint(&pending_mint);
            return Err(format!("Mint failed: {:?}", pending_mint.status));
        }
    };

    // Validate TVL is not zero
    if current_tvl == Nat::from(0u32) {
        // Refund on zero TVL
        pending_mint.status = MintStatus::Refunding;
        update_pending_mint(&pending_mint);

        let _ = refund_deposit(
            caller,
            pending_mint.ckusdt_amount.clone(),
            "TVL is zero - canister has no holdings".to_string()
        ).await;

        pending_mint.status = MintStatus::FailedRefunded("TVL is zero - deposit refunded".to_string());
        update_pending_mint(&pending_mint);
        return Err("TVL is zero - canister has no token holdings".to_string());
    }

    // Formula: new_icpi = (deposit * current_supply) / current_tvl
    // Special case: Initial mint when supply is 0 - mint 1:1 with deposit
    let icpi_to_mint = if current_supply == Nat::from(0u32) {
        // Initial mint: 1 ICPI = 1 ckUSDT (both have different decimals but we match amounts)
        // ckUSDT has 6 decimals, ICPI has 8 decimals
        // 1 ckUSDT = 1_000_000, we want 1 ICPI = 100_000_000
        // So multiply by 100
        pending_mint.ckusdt_amount.clone() * Nat::from(100u32)
    } else {
        match multiply_and_divide(&pending_mint.ckusdt_amount, &current_supply, &current_tvl) {
            Ok(amount) => amount,
            Err(e) => {
            // Also refund on calculation error
            pending_mint.status = MintStatus::Refunding;
            update_pending_mint(&pending_mint);

            match refund_deposit(
                caller,
                pending_mint.ckusdt_amount.clone(),
                format!("Math calculation failed: {}", e)
            ).await {
                Ok(_) => {
                    pending_mint.status = MintStatus::FailedRefunded(
                        format!("Calculation failed, deposit refunded: {}", e)
                    );
                }
                Err(refund_err) => {
                    pending_mint.status = MintStatus::FailedNoRefund(
                        format!("Calc failed: {}. Refund failed: {}", e, refund_err)
                    );
                }
            }
            update_pending_mint(&pending_mint);
            return Err(format!("Calculation failed: {}", e));
            }
        }
    };

    pending_mint.icpi_to_mint = Some(icpi_to_mint.clone());
    ic_cdk::println!("Calculated ICPI to mint: {}", icpi_to_mint);

    // Step 4: Mint ICPI tokens
    pending_mint.status = MintStatus::Minting;
    update_pending_mint(&pending_mint);

    mint_tokens(caller, icpi_to_mint.clone())
        .map_err(|e| {
            pending_mint.status = MintStatus::Failed(format!("Minting failed: {}", e));
            update_pending_mint(&pending_mint);
            format!("Minting failed: {}", e)
        })?;

    ic_cdk::println!("Minted {} ICPI to {}", icpi_to_mint, caller);

    // Step 5: Mark as complete
    pending_mint.status = MintStatus::Complete(icpi_to_mint.clone());
    update_pending_mint(&pending_mint);

    Ok(icpi_to_mint)
}

// Check mint status
pub fn check_mint_status(mint_id: String) -> Result<MintStatus, String> {
    PENDING_MINTS.with(|mints| {
        mints.borrow()
            .get(&mint_id)
            .map(|m| m.status.clone())
            .ok_or_else(|| "Mint not found".to_string())
    })
}

// Helper to update pending mint
fn update_pending_mint(pending_mint: &PendingMint) {
    PENDING_MINTS.with(|mints| {
        let mut mints = mints.borrow_mut();
        mints.insert(pending_mint.id.clone(), pending_mint.clone());
    });
}

// Cleanup expired mints (called periodically)
pub fn cleanup_expired_mints() {
    let now = ic_cdk::api::time();

    PENDING_MINTS.with(|mints| {
        let mut mints_mut = mints.borrow_mut();
        let mut to_update = Vec::new();
        let mut to_remove = Vec::new();

        // Collect items to update/remove (can't modify while iterating)
        for (id, mint) in mints_mut.iter() {
            if now > mint.expires_at {
                match mint.status {
                    MintStatus::Pending | MintStatus::CollectingFee | MintStatus::CollectingDeposit => {
                        // Mark as expired
                        let mut expired_mint = mint.clone();
                        expired_mint.status = MintStatus::Expired;
                        to_update.push((id.clone(), expired_mint));
                    }
                    MintStatus::Complete(_) | MintStatus::Failed(_) | MintStatus::FailedRefunded(_) | MintStatus::FailedNoRefund(_) | MintStatus::Expired => {
                        // Remove old completed/failed mints after 24 hours
                        if now > mint.expires_at + 86_400_000_000_000 {
                            to_remove.push(id.clone());
                        }
                    }
                    _ => {}
                }
            }
        }

        // Apply updates
        for (id, mint) in to_update {
            mints_mut.insert(id, mint);
        }

        // Apply removals
        for id in to_remove {
            mints_mut.remove(&id);
        }
    });
}

// Start cleanup timer
pub fn start_cleanup_timer() {
    ic_cdk_timers::set_timer_interval(
        std::time::Duration::from_secs(300), // Every 5 minutes
        || {
            cleanup_expired_mints();
        }
    );
}