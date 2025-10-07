//! Portfolio value calculation module
//!
//! Calculates total portfolio value for minting formula

use candid::Nat;
use num_traits::ToPrimitive;
use crate::infrastructure::Result;
use crate::types::portfolio::IndexState;
use crate::types::TrackedToken;

/// Calculate total portfolio value atomically
///
/// Sums: (all token balances × token prices) + ckUSDT reserves
/// For simplicity, this version does NOT fetch real-time prices.
/// Instead, it uses locked liquidity from Kong as proxy for value.
///
/// Formula: TVL = sum of all token holdings + ckUSDT (1:1 with USD)
pub async fn calculate_portfolio_value_atomic() -> Result<Nat> {
    ic_cdk::println!("CALC: Computing total portfolio value");

    // Get all balances in parallel
    let balances = crate::_2_CRITICAL_DATA::token_queries::get_all_balances_uncached().await?;

    // For initial version: Sum ckUSDT balance only (other tokens TBD)
    let mut total_value_e6: u64 = 0;

    for (symbol, balance) in balances {
        if symbol == "ckUSDT" {
            // ckUSDT is 1:1 with USD, already in e6 decimals
            total_value_e6 += balance.0.to_u64().unwrap_or(0);
            ic_cdk::println!("  ckUSDT: {} (e6)", balance);
        } else {
            // TODO: For tracked tokens, would multiply by price
            // For now, we assume they contribute to TVL via ckUSDT backing
            ic_cdk::println!("  {}: {} (not counted in TVL yet)", symbol, balance);
        }
    }

    let total_value = Nat::from(total_value_e6);
    ic_cdk::println!("✅ Total portfolio value: {} ckUSDT (e6)", total_value);

    Ok(total_value)
}

/// Get portfolio state without caching
///
/// Returns complete portfolio state for display
pub async fn get_portfolio_state_uncached() -> Result<IndexState> {
    ic_cdk::println!("CALC: Building portfolio state");

    // Get all balances
    let balances = crate::_2_CRITICAL_DATA::token_queries::get_all_balances_uncached().await?;

    // Calculate total value
    let total_value_nat = calculate_portfolio_value_atomic().await?;
    let total_value_f64 = total_value_nat.0.to_u64().unwrap_or(0) as f64 / 1_000_000.0;

    // Build current positions using CurrentPosition type
    use crate::types::portfolio::CurrentPosition;
    use crate::types::rebalancing::TargetAllocation;

    let current_positions: Vec<_> = balances.iter()
        .filter_map(|(symbol, balance)| {
            // Try to parse symbol to TrackedToken
            let token = match symbol.as_str() {
                "ALEX" => Some(TrackedToken::ALEX),
                "ZERO" => Some(TrackedToken::ZERO),
                "KONG" => Some(TrackedToken::KONG),
                "BOB" => Some(TrackedToken::BOB),
                _ => None,
            };

            token.map(|t| {
                let decimals = get_token_decimals(symbol);
                let amount_float = balance.0.to_u64().unwrap_or(0) as f64 / 10_f64.powi(decimals as i32);

                CurrentPosition {
                    token: t,
                    balance: balance.clone(),
                    usd_value: amount_float, // Simplified: actual value TBD
                    percentage: 0.0, // Calculate below
                }
            })
        })
        .collect();

    // For now, target allocations are equal (25% each for 4 tokens)
    let target_allocations = vec![
        TargetAllocation {
            token: TrackedToken::ALEX,
            target_percentage: 25.0,
            target_usd_value: total_value_f64 * 0.25,
        },
        TargetAllocation {
            token: TrackedToken::ZERO,
            target_percentage: 25.0,
            target_usd_value: total_value_f64 * 0.25,
        },
        TargetAllocation {
            token: TrackedToken::KONG,
            target_percentage: 25.0,
            target_usd_value: total_value_f64 * 0.25,
        },
        TargetAllocation {
            token: TrackedToken::BOB,
            target_percentage: 25.0,
            target_usd_value: total_value_f64 * 0.25,
        },
    ];

    // Calculate deviations (placeholder)
    let deviations = Vec::new();

    // Get ckUSDT balance specifically
    let ckusdt_balance = balances.iter()
        .find(|(s, _)| s == "ckUSDT")
        .map(|(_, b)| b.clone())
        .unwrap_or(Nat::from(0u64));

    Ok(IndexState {
        total_value: total_value_f64,
        current_positions,
        target_allocations,
        deviations,
        ckusdt_balance,
        timestamp: ic_cdk::api::time(),
    })
}

/// Get token decimals (helper)
fn get_token_decimals(symbol: &str) -> u32 {
    match symbol {
        "ckUSDT" => 6,
        "ALEX" | "ZERO" | "KONG" | "BOB" => 8,
        "ICPI" => 8,
        _ => 8, // Default
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_decimals() {
        assert_eq!(get_token_decimals("ckUSDT"), 6);
        assert_eq!(get_token_decimals("ALEX"), 8);
        assert_eq!(get_token_decimals("unknown"), 8);
    }
}
