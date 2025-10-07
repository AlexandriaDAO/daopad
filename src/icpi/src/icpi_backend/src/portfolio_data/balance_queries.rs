use crate::types::tokens::TrackedToken;
use crate::types::icrc::Account;
use crate::infrastructure::cache::{get_cached, CachePolicy, assert_no_cache_for_critical_op};
use candid::{Nat, Principal};

/// Get token balance WITHOUT caching (for critical operations)
/// MUST be used for mint/burn calculations
pub async fn get_token_balance_uncached(token: &TrackedToken) -> Result<Nat, String> {
    // Assert no cache for critical operations
    assert_no_cache_for_critical_op("get_token_balance_uncached");

    let canister_id = token.get_canister_id()?;
    let backend_principal = ic_cdk::id();

    let account = Account {
        owner: backend_principal,
        subaccount: None,
    };

    let result: Result<(Nat,), _> = ic_cdk::call(
        canister_id,
        "icrc1_balance_of",
        (account,),
    ).await;

    match result {
        Ok((balance,)) => Ok(balance),
        Err(e) => Err(format!("Failed to query {} balance: {:?}", token.to_symbol(), e))
    }
}

/// Get token balance WITH caching (for display only)
/// Uses 30 second cache for performance
pub async fn get_token_balance_cached(token: &TrackedToken) -> Result<Nat, String> {
    let cache_key = format!("balance_{}", token.to_symbol());

    get_cached(
        &cache_key,
        CachePolicy::Short,
        || get_token_balance_uncached(token)
    )
}

/// Get all token balances (uncached for critical operations)
pub async fn get_all_balances_uncached() -> Result<Vec<(TrackedToken, Nat)>, String> {
    let mut balances = Vec::new();

    // Include ckUSDT for reserve tracking
    let mut all_tokens = TrackedToken::all_vec();
    all_tokens.push(TrackedToken::ckUSDT);

    for token in all_tokens {
        match get_token_balance_uncached(&token).await {
            Ok(balance) => balances.push((token, balance)),
            Err(e) => {
                ic_cdk::println!("Failed to get balance for {}: {}", token.to_symbol(), e);
                balances.push((token, Nat::from(0u64)));
            }
        }
    }

    Ok(balances)
}

/// Get all token balances (cached for display)
pub async fn get_all_balances_cached() -> Result<Vec<(TrackedToken, Nat)>, String> {
    let mut balances = Vec::new();

    // Include ckUSDT for display
    let mut all_tokens = TrackedToken::all_vec();
    all_tokens.push(TrackedToken::ckUSDT);

    for token in all_tokens {
        match get_token_balance_cached(&token).await {
            Ok(balance) => balances.push((token, balance)),
            Err(e) => {
                ic_cdk::println!("Failed to get cached balance for {}: {}", token.to_symbol(), e);
                balances.push((token, Nat::from(0u64)));
            }
        }
    }

    Ok(balances)
}

/// Get ICPI token supply
pub async fn get_icpi_supply() -> Result<Nat, String> {
    let icpi_canister = Principal::from_text(crate::types::tokens::ICPI_CANISTER_ID)
        .map_err(|e| format!("Invalid ICPI principal: {}", e))?;

    let result: Result<(Nat,), _> = ic_cdk::call(
        icpi_canister,
        "icrc1_total_supply",
        (),
    ).await;

    match result {
        Ok((supply,)) => Ok(supply),
        Err(e) => Err(format!("Failed to query ICPI supply: {:?}", e))
    }
}