use crate::infrastructure::cache::{get_cached, CachePolicy};
use crate::types::portfolio::{IndexState, TvlSummary};
use crate::types::rebalancing::RebalanceStatus;
use crate::types::tokens::TrackedToken;
use candid::Nat;
use ic_cdk::api::time;

/// Get cached index state for display purposes only
/// Uses 5-minute cache to reduce inter-canister calls
pub async fn get_index_state_cached() -> Result<IndexState, String> {
    get_cached(
        "index_state_display",
        CachePolicy::Medium,
        || {
            // In refactored version, this will call portfolio_data module
            // For now, return placeholder
            Ok(IndexState {
                total_value: 0.0,
                current_positions: vec![],
                target_allocations: vec![],
                deviations: vec![],
                timestamp: time(),
                ckusdt_balance: Nat::from(0u64),
            })
        }
    )
}

/// Get TVL summary for frontend display
/// Cached for 5 minutes as this is expensive to calculate
pub async fn get_tvl_summary() -> Result<TvlSummary, String> {
    get_cached(
        "tvl_summary",
        CachePolicy::Medium,
        || {
            // In refactored version, this will aggregate from kong_liquidity module
            Ok(TvlSummary {
                total_tvl_usd: 0.0,
                token_tvls: vec![],
                timestamp: time(),
            })
        }
    )
}

/// Get rebalancer status for monitoring
pub async fn get_rebalancer_status() -> Result<RebalanceStatus, String> {
    // This doesn't need caching as it's lightweight
    Ok(RebalanceStatus {
        last_rebalance: None,
        next_rebalance: time() + 3600_000_000_000, // 1 hour from now
        is_timer_active: false,
        pending_action: None,
    })
}

/// Get token list for frontend
pub fn get_tracked_tokens() -> Vec<String> {
    TrackedToken::all()
        .iter()
        .map(|t| t.to_symbol().to_string())
        .collect()
}

/// Get formatted portfolio breakdown for display
pub async fn get_portfolio_breakdown() -> Result<String, String> {
    let state = get_index_state_cached().await?;

    let mut result = format!("Portfolio Value: ${:.2}\n", state.total_value);
    result.push_str("Token Distribution:\n");

    for position in &state.current_positions {
        result.push_str(&format!(
            "  {} - ${:.2} ({:.1}%)\n",
            position.token.to_symbol(),
            position.usd_value,
            position.percentage
        ));
    }

    if state.ckusdt_balance > 0u64 {
        result.push_str(&format!(
            "\nReserve: {} ckUSDT\n",
            state.ckusdt_balance
        ));
    }

    Ok(result)
}