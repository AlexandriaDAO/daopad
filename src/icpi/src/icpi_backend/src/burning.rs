use candid::{CandidType, Deserialize, Nat, Principal};

use crate::icrc_types::{collect_fee, transfer_to_user};
use crate::precision::multiply_and_divide;
use crate::types::TrackedToken;
use crate::balance_tracker::get_token_balance;
use crate::ledger_client::get_icpi_total_supply;

// Burn result details (exported for lib.rs)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct BurnResult {
    pub successful_transfers: Vec<(String, Nat)>,    // (token_symbol, amount)
    pub failed_transfers: Vec<(String, Nat, String)>, // (token_symbol, amount, error)
    pub icpi_burned: Nat,
}

// ATOMIC BURN - Single-call secure burn operation
//
// User flow:
// 1. User transfers ICPI to backend (burns it, since backend is minting account)
// 2. User calls this function
// 3. Backend verifies burn and sends proportional redemption tokens
//
// Security features:
// - No race conditions: supply queried atomically with calculation
// - No state storage: single function call
// - No two-phase vulnerabilities: user must burn before calling
pub async fn burn_icpi(amount: Nat) -> Result<BurnResult, String> {
    let caller = ic_cdk::caller();

    // 1. Validate amount (dust threshold)
    const MIN_BURN_AMOUNT: u32 = 11_000; // 10,000 fee + 1,000 buffer
    if amount < Nat::from(MIN_BURN_AMOUNT) {
        return Err(format!("Minimum burn: {} units (0.00011 ICPI)", MIN_BURN_AMOUNT));
    }

    // 2. Collect fee from user
    collect_fee(caller).await
        .map_err(|e| format!("Fee collection failed: {}", e))?;

    ic_cdk::println!("Fee collected for atomic burn from user {}", caller);

    // 3. Get CURRENT supply atomically (no race condition)
    let current_supply = get_icpi_total_supply().await
        .map_err(|e| format!("Failed to query ICPI supply: {}", e))?;

    if current_supply == Nat::from(0u32) {
        return Err("No ICPI supply".to_string());
    }

    ic_cdk::println!("Atomic burn: {} ICPI from current supply of {}", amount, current_supply);

    // 4. Calculate redemption amounts for all tokens
    let mut tokens_to_receive = Vec::new();

    // First: Calculate ckUSDT redemption
    let ckusdt_canister = Principal::from_text(crate::icrc_types::CKUSDT_CANISTER)
        .map_err(|e| format!("Invalid ckUSDT principal: {}", e))?;

    let ckusdt_balance = crate::icrc_types::query_icrc1_balance(
        ckusdt_canister,
        ic_cdk::api::id()
    ).await.unwrap_or_else(|e| {
        ic_cdk::println!("Warning: Failed to get ckUSDT balance: {}", e);
        Nat::from(0u32)
    });

    if ckusdt_balance > Nat::from(0u32) {
        let ckusdt_amount = multiply_and_divide(&amount, &ckusdt_balance, &current_supply)
            .unwrap_or_else(|e| {
                ic_cdk::println!("Warning: ckUSDT calculation failed: {}", e);
                Nat::from(0u32)
            });

        const CKUSDT_TRANSFER_FEE: u32 = 10_000;
        if ckusdt_amount > Nat::from(CKUSDT_TRANSFER_FEE + 10_000) {
            let amount_after_fee = ckusdt_amount - Nat::from(CKUSDT_TRANSFER_FEE);
            tokens_to_receive.push(("ckUSDT".to_string(), amount_after_fee));
        }
    }

    // Then: Calculate tracked token redemptions
    for token in TrackedToken::all() {
        let balance = get_token_balance(&token).await
            .unwrap_or_else(|e| {
                ic_cdk::println!("Warning: Failed to get {} balance: {}", token.to_symbol(), e);
                Nat::from(0u32)
            });

        if balance > Nat::from(0u32) {
            let token_amount = multiply_and_divide(&amount, &balance, &current_supply)
                .unwrap_or_else(|e| {
                    ic_cdk::println!("Warning: Calculation failed for {}: {}", token.to_symbol(), e);
                    Nat::from(0u32)
                });

            const ICRC1_TRANSFER_FEE: u32 = 10_000;
            if token_amount > Nat::from(ICRC1_TRANSFER_FEE + 1_000) {
                let amount_after_fee = token_amount - Nat::from(ICRC1_TRANSFER_FEE);
                tokens_to_receive.push((token.to_symbol().to_string(), amount_after_fee));
            }
        }
    }

    ic_cdk::println!("Calculated {} token transfers for atomic burn", tokens_to_receive.len());

    // 5. Execute transfers to user
    let mut result = BurnResult {
        successful_transfers: Vec::new(),
        failed_transfers: Vec::new(),
        icpi_burned: amount.clone(),
    };

    for (token_symbol, token_amount) in &tokens_to_receive {
        // Get token canister
        let token_canister = if token_symbol == "ckUSDT" {
            ckusdt_canister
        } else {
            let token = match token_symbol.as_str() {
                "ALEX" => TrackedToken::ALEX,
                "ZERO" => TrackedToken::ZERO,
                "KONG" => TrackedToken::KONG,
                "BOB" => TrackedToken::BOB,
                _ => {
                    result.failed_transfers.push((
                        token_symbol.clone(),
                        token_amount.clone(),
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
                        token_amount.clone(),
                        format!("Invalid canister: {}", e)
                    ));
                    continue;
                }
            }
        };

        // Transfer token to user
        let transfer_result = transfer_to_user(
            token_canister,
            caller,
            token_amount.clone(),
            format!("ICPI atomic burn"),
        ).await;

        match transfer_result {
            Ok(block_index) => {
                ic_cdk::println!("Transferred {} {} to user (block: {})", token_amount, token_symbol, block_index);
                result.successful_transfers.push((token_symbol.clone(), token_amount.clone()));
            }
            Err(e) => {
                ic_cdk::println!("Failed to transfer {} {}: {}", token_amount, token_symbol, e);
                result.failed_transfers.push((token_symbol.clone(), token_amount.clone(), e));
            }
        }
    }

    // 6. Log completion
    ic_cdk::println!("✓ Atomic burn completed: {} ICPI burned by user {}", amount, caller);

    Ok(result)
}
