use crate::types::portfolio::IndexState;
use crate::types::rebalancing::{AllocationDeviation, TargetAllocation};
use crate::infrastructure::cache::assert_no_cache_for_critical_op;
use crate::kong_liquidity::calculate_target_allocations;
use ic_cdk::api::time;

/// Get current index state (UNCACHED for critical operations)
pub async fn get_index_state_uncached() -> Result<IndexState, String> {
    // Assert no cache for critical operations
    assert_no_cache_for_critical_op("get_index_state_uncached");

    // Get current balances
    let balances = super::get_all_balances_uncached().await?;

    // Calculate current positions
    let current_positions = super::calculate_current_positions(balances.clone()).await?;

    // Get target allocations
    let target_allocations = calculate_target_allocations().await?;

    // Calculate total portfolio value
    let total_value = super::calculate_portfolio_value(&current_positions);

    // Calculate deviations
    let deviations = calculate_deviations(
        &current_positions,
        &target_allocations,
        total_value
    );

    // Get ckUSDT reserve balance
    let ckusdt_balance = super::get_reserve_balance(&balances);

    Ok(IndexState {
        total_value,
        current_positions,
        target_allocations,
        deviations,
        timestamp: time(),
        ckusdt_balance,
    })
}

/// Calculate allocation deviations
fn calculate_deviations(
    current_positions: &[super::CurrentPosition],
    target_allocations: &[TargetAllocation],
    total_value: f64
) -> Vec<AllocationDeviation> {
    let mut deviations = Vec::new();

    for target in target_allocations {
        // Find current position for this token
        let current = current_positions.iter()
            .find(|p| p.token == target.token)
            .map(|p| p.percentage)
            .unwrap_or(0.0);

        let deviation_pct = target.target_percentage - current;
        let usd_difference = (deviation_pct / 100.0) * total_value;

        // 10% of difference for gradual rebalancing
        let trade_size_usd = usd_difference * 0.1;

        deviations.push(AllocationDeviation {
            token: target.token.clone(),
            current_pct: current,
            target_pct: target.target_percentage,
            deviation_pct,
            usd_difference,
            trade_size_usd,
        });
    }

    // Sort by absolute deviation descending
    deviations.sort_by(|a, b| {
        b.deviation_pct.abs().partial_cmp(&a.deviation_pct.abs()).unwrap()
    });

    deviations
}