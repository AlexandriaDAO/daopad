//! Token balance queries module

use candid::Nat;
use std::collections::HashMap;
use crate::infrastructure::Result;
use crate::types::TrackedToken;

/// Get all token balances without caching
pub async fn get_all_balances_uncached() -> Result<Vec<(String, Nat)>> {
    // TODO: Full implementation - query all token balances
    let mut balances = Vec::new();

    // Add ckUSDT balance
    balances.push(("ckUSDT".to_string(), Nat::from(0u64)));

    // Add tracked token balances
    for token in TrackedToken::all() {
        balances.push((token.to_symbol().to_string(), Nat::from(0u64)));
    }

    Ok(balances)
}

/// Get single token balance without caching
pub async fn get_token_balance_uncached(token: &TrackedToken) -> Result<Nat> {
    // TODO: Full implementation
    Ok(Nat::from(0u64))
}
