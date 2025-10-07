use crate::types::kongswap::{SwapAmountsResult, SwapAmountsReply};
use crate::types::tokens::TrackedToken;
use candid::{Nat, Principal};

const KONGSWAP_BACKEND: &str = "2ipq2-uqaaa-aaaar-qailq-cai";

/// Query swap amounts from Kongswap
pub async fn query_swap_amounts(
    pay_token: &str,
    pay_amount: Nat,
    receive_token: &str
) -> Result<SwapAmountsReply, String> {
    let kongswap = Principal::from_text(KONGSWAP_BACKEND)
        .map_err(|e| format!("Invalid Kongswap principal: {}", e))?;

    let args = (
        pay_token.to_string(),
        pay_amount,
        receive_token.to_string(),
    );

    let result: (SwapAmountsResult,) = ic_cdk::call(
        kongswap,
        "swap_amounts",
        args,
    ).await
        .map_err(|e| format!("Failed to query swap amounts: {:?}", e))?;

    match result.0 {
        SwapAmountsResult::Ok(reply) => Ok(reply),
        SwapAmountsResult::Err(e) => Err(format!("Swap amounts query failed: {}", e))
    }
}

/// Get best swap path for a given trade
pub async fn get_best_swap_path(
    from_token: &TrackedToken,
    to_token: &TrackedToken,
    amount: Nat
) -> Result<SwapAmountsReply, String> {
    // For now, always route through ckUSDT for non-direct pairs
    // This ensures we always have liquidity
    if from_token == &TrackedToken::ckUSDT || to_token == &TrackedToken::ckUSDT {
        // Direct swap
        query_swap_amounts(
            from_token.to_symbol(),
            amount,
            to_token.to_symbol()
        ).await
    } else {
        // For token-to-token swaps, we'd need to do two-hop through ckUSDT
        // This module will just return the direct quote for now
        query_swap_amounts(
            from_token.to_symbol(),
            amount,
            to_token.to_symbol()
        ).await
    }
}

/// Check if a trading pair exists on Kongswap
pub async fn pair_exists(token_a: &TrackedToken, token_b: &TrackedToken) -> bool {
    // Try a small amount swap quote
    let test_amount = Nat::from(1000u64); // Small test amount

    match query_swap_amounts(
        token_a.to_symbol(),
        test_amount,
        token_b.to_symbol()
    ).await {
        Ok(_) => true,
        Err(_) => false,
    }
}