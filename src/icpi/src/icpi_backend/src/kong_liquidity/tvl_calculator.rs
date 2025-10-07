use crate::types::kongswap::{UserBalancesResult, UserBalancesReply, LPBalancesReply};
use crate::types::tokens::TrackedToken;
use crate::infrastructure::cache::{get_cached, CachePolicy};
use candid::Principal;
use std::collections::HashMap;

const KONGSWAP_BACKEND: &str = "2ipq2-uqaaa-aaaar-qailq-cai";

/// TVL data for a single token
#[derive(Clone, Debug)]
pub struct TokenTvlData {
    pub token: TrackedToken,
    pub total_locked_usd: f64,
    pub pool_count: usize,
}

/// Calculate TVL for all tracked tokens from locked liquidity
/// Cached for 1 hour as TVL doesn't change rapidly
pub async fn calculate_locked_tvl() -> Result<Vec<TokenTvlData>, String> {
    get_cached(
        "locked_tvl_data",
        CachePolicy::Long,
        || calculate_tvl_uncached()
    )
}

/// Calculate TVL without caching
async fn calculate_tvl_uncached() -> Result<Vec<TokenTvlData>, String> {
    let lock_canisters = super::get_all_lock_canisters().await?;
    let kongswap = Principal::from_text(KONGSWAP_BACKEND)
        .map_err(|e| format!("Invalid Kongswap principal: {}", e))?;

    let mut tvl_by_token: HashMap<TrackedToken, f64> = HashMap::new();
    let mut pools_by_token: HashMap<TrackedToken, usize> = HashMap::new();

    for canister_id in lock_canisters {
        // Query LP positions for each lock canister
        let result: Result<(UserBalancesResult,), _> = ic_cdk::call(
            kongswap.clone(),
            "user_balances",
            (canister_id.clone(),),
        ).await;

        if let Ok((UserBalancesResult::Ok(balances),)) = result {
            for balance in balances {
                if let UserBalancesReply::LP(lp) = balance {
                    process_lp_balance(&lp, &mut tvl_by_token, &mut pools_by_token);
                }
            }
        }
    }

    // Convert to result format
    let mut tvl_data = Vec::new();
    for token in TrackedToken::all() {
        tvl_data.push(TokenTvlData {
            token: token.clone(),
            total_locked_usd: *tvl_by_token.get(token).unwrap_or(&0.0),
            pool_count: *pools_by_token.get(token).unwrap_or(&0),
        });
    }

    // Sort by TVL descending
    tvl_data.sort_by(|a, b| b.total_locked_usd.partial_cmp(&a.total_locked_usd).unwrap());

    Ok(tvl_data)
}

/// Process a single LP balance and update TVL maps
fn process_lp_balance(
    lp: &LPBalancesReply,
    tvl_by_token: &mut HashMap<TrackedToken, f64>,
    pools_by_token: &mut HashMap<TrackedToken, usize>,
) {
    // Check if either token in the pair is tracked
    for (symbol, usd_amount) in [
        (&lp.symbol_0, lp.usd_amount_0),
        (&lp.symbol_1, lp.usd_amount_1),
    ] {
        if let Ok(token) = TrackedToken::from_symbol(symbol) {
            // Skip ckUSDT as it's the reserve currency
            if token == TrackedToken::ckUSDT {
                continue;
            }

            *tvl_by_token.entry(token.clone()).or_insert(0.0) += usd_amount;
            *pools_by_token.entry(token).or_insert(0) += 1;
        }
    }
}

/// Get total TVL across all tracked tokens
pub async fn get_total_tvl() -> Result<f64, String> {
    let tvl_data = calculate_locked_tvl().await?;
    Ok(tvl_data.iter().map(|t| t.total_locked_usd).sum())
}