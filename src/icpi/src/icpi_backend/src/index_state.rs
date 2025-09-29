use crate::types::{
    IndexState, CurrentPosition, TargetAllocation, AllocationDeviation,
    TrackedToken, RebalanceAction, decimal_to_f64, f64_to_decimal
};
use crate::balance_tracker::{get_current_positions, get_ckusdt_balance};
use crate::tvl_calculator::{get_cached_or_calculate_tvl, calculate_tvl_percentages};
use rust_decimal::Decimal;
use std::str::FromStr;
use candid::Nat;

// Calculate target allocations based on locked TVL
pub async fn calculate_target_allocations(
    icpi_total_value: f64
) -> Result<Vec<TargetAllocation>, String> {
    let locked_tvl = get_cached_or_calculate_tvl().await?;
    let percentages = calculate_tvl_percentages(&locked_tvl)?;

    let icpi_value_decimal = f64_to_decimal(icpi_total_value)?;

    let mut allocations = Vec::new();
    for (token, percentage) in percentages.iter() {
        let target_usd_value = (percentage / Decimal::from(100)) * icpi_value_decimal;

        allocations.push(TargetAllocation {
            token: token.clone(),
            target_percentage: decimal_to_f64(*percentage),
            target_usd_value: decimal_to_f64(target_usd_value),
        });
    }

    // Sort by percentage for consistent ordering
    allocations.sort_by(|a, b| b.target_percentage.partial_cmp(&a.target_percentage).unwrap());

    // Normalize percentages to ensure they sum to exactly 100%
    normalize_percentages(&mut allocations);

    Ok(allocations)
}

// Helper to ensure percentages sum to exactly 100%
fn normalize_percentages(allocations: &mut Vec<TargetAllocation>) {
    let total: f64 = allocations.iter()
        .map(|a| a.target_percentage)
        .sum();

    if total > 0.0 && (total - 100.0).abs() > 0.01 {
        // Distribute rounding difference to largest holding
        let adjustment = 100.0 - total;
        if let Some(first) = allocations.first_mut() {
            first.target_percentage += adjustment;
        }
    }
}

// Calculate deviations between current and target allocations
pub fn calculate_deviations(
    current: &[CurrentPosition],
    target: &[TargetAllocation],
    _total_value: f64,
) -> Vec<AllocationDeviation> {
    let mut deviations = Vec::new();

    for target_alloc in target.iter() {
        // Find matching current position
        let current_pos = current.iter()
            .find(|p| p.token == target_alloc.token);

        let current_pct = current_pos
            .map(|p| p.percentage)
            .unwrap_or(0.0);

        let current_usd = current_pos
            .map(|p| p.usd_value)
            .unwrap_or(0.0);

        let deviation_pct = target_alloc.target_percentage - current_pct;
        let usd_difference = target_alloc.target_usd_value - current_usd;

        // Calculate 10% of deviation for hourly trade size
        let trade_size_usd = usd_difference.abs() * 0.1;

        deviations.push(AllocationDeviation {
            token: target_alloc.token.clone(),
            current_pct,
            target_pct: target_alloc.target_percentage,
            deviation_pct,
            usd_difference,
            trade_size_usd,
        });
    }

    // Sort by absolute deviation (largest first for rebalancing priority)
    deviations.sort_by(|a, b|
        b.deviation_pct.abs().partial_cmp(&a.deviation_pct.abs()).unwrap()
    );

    deviations
}

// Get complete index state
pub async fn get_index_state() -> Result<IndexState, String> {
    // Get current positions (requires inter-canister calls)
    let current_positions = get_current_positions().await?;

    // Calculate total value
    let total_value = current_positions.iter()
        .fold(0.0, |acc, p| acc + p.usd_value);

    // Get target allocations based on locked TVL
    let target_allocations = if total_value > 0.0 {
        calculate_target_allocations(total_value).await?
    } else {
        // If no holdings, use equal allocation for initial state
        vec![
            TargetAllocation {
                token: TrackedToken::ALEX,
                target_percentage: 25.0,
                target_usd_value: 0.0,
            },
            TargetAllocation {
                token: TrackedToken::ZERO,
                target_percentage: 25.0,
                target_usd_value: 0.0,
            },
            TargetAllocation {
                token: TrackedToken::KONG,
                target_percentage: 25.0,
                target_usd_value: 0.0,
            },
            TargetAllocation {
                token: TrackedToken::BOB,
                target_percentage: 25.0,
                target_usd_value: 0.0,
            },
        ]
    };

    // Calculate deviations
    let deviations = calculate_deviations(
        &current_positions,
        &target_allocations,
        total_value
    );

    // Get ckUSDT balance for rebalancing info
    let ckusdt_balance = get_ckusdt_balance().await.unwrap_or_else(|e| {
        ic_cdk::println!("Error getting ckUSDT balance: {}", e);
        Nat::from(0u64)
    });

    Ok(IndexState {
        total_value,
        current_positions,
        target_allocations,
        deviations,
        timestamp: ic_cdk::api::time(),
        ckusdt_balance,
    })
}

// Determine rebalancing action for hourly execution
pub fn get_rebalancing_action(
    deviations: &[AllocationDeviation],
    ckusdt_balance: &Nat,
) -> Option<RebalanceAction> {
    // Convert ckUSDT balance to USD (6 decimals)
    let ckusdt_str = ckusdt_balance.to_string();
    let ckusdt_decimal = Decimal::from_str(&ckusdt_str).ok()?;
    let ckusdt_balance_usd = decimal_to_f64(ckusdt_decimal / Decimal::from(1_000_000));

    // Minimum ckUSDT balance to trigger buy ($10)
    if ckusdt_balance_usd >= 10.0 {
        // Buy most underweight token if deviation > 1%
        let most_underweight = deviations.iter()
            .filter(|d| d.deviation_pct > 1.0)
            .max_by(|a, b| a.deviation_pct.partial_cmp(&b.deviation_pct).unwrap());

        if let Some(underweight) = most_underweight {
            let buy_amount = underweight.trade_size_usd.min(ckusdt_balance_usd);

            return Some(RebalanceAction::Buy {
                token: underweight.token.clone(),
                usdt_amount: buy_amount,
            });
        }
    }

    // Otherwise, sell most overweight token if deviation > 1%
    let most_overweight = deviations.iter()
        .filter(|d| d.deviation_pct < -1.0)
        .min_by(|a, b| a.deviation_pct.partial_cmp(&b.deviation_pct).unwrap());

    if let Some(overweight) = most_overweight {
        return Some(RebalanceAction::Sell {
            token: overweight.token.clone(),
            usdt_value: overweight.trade_size_usd,
        });
    }

    None
}

// Get rebalancing recommendation
pub async fn get_rebalancing_recommendation() -> Result<Option<RebalanceAction>, String> {
    let state = get_index_state().await?;
    let action = get_rebalancing_action(&state.deviations, &state.ckusdt_balance);
    Ok(action)
}

// Validate index state consistency
pub fn validate_index_state(state: &IndexState) -> Result<(), String> {
    // Check that current percentages sum to ~100%
    let current_total: f64 = state.current_positions.iter()
        .map(|p| p.percentage)
        .sum();

    if state.current_positions.len() > 0 && (current_total - 100.0).abs() > 1.0 {
        return Err(format!("Current percentages sum to {:.2}%, not 100%", current_total));
    }

    // Check that target percentages sum to ~100%
    let target_total: f64 = state.target_allocations.iter()
        .map(|t| t.target_percentage)
        .sum();

    if (target_total - 100.0).abs() > 1.0 {
        return Err(format!("Target percentages sum to {:.2}%, not 100%", target_total));
    }

    // Verify all tracked tokens are present
    let required_tokens = vec![
        TrackedToken::ALEX,
        TrackedToken::ZERO,
        TrackedToken::KONG,
        TrackedToken::BOB,
    ];

    for token in required_tokens {
        if !state.target_allocations.iter().any(|t| t.token == token) {
            return Err(format!("Missing target allocation for {:?}", token));
        }
    }

    Ok(())
}

// Format index state for display
pub fn format_index_state(state: &IndexState) -> String {
    let mut output = String::new();

    let timestamp_seconds = (state.timestamp / 1_000_000_000) as u64;
    output.push_str(&format!("Index State (timestamp: {})\n", timestamp_seconds));
    output.push_str(&format!("Total Value: ${:.2}\n", state.total_value));
    output.push_str(&format!("ckUSDT Balance: {}\n\n", state.ckusdt_balance));

    output.push_str("Current Positions:\n");
    for pos in &state.current_positions {
        output.push_str(&format!("  {:?}: ${:.2} ({:.2}%)\n",
            pos.token, pos.usd_value, pos.percentage));
    }

    output.push_str("\nTarget Allocations:\n");
    for target in &state.target_allocations {
        output.push_str(&format!("  {:?}: {:.2}% (${:.2})\n",
            target.token, target.target_percentage, target.target_usd_value));
    }

    output.push_str("\nDeviations:\n");
    for dev in &state.deviations {
        output.push_str(&format!("  {:?}: {:.2}% deviation (Trade size: ${:.2})\n",
            dev.token, dev.deviation_pct, dev.trade_size_usd));
    }

    output
}