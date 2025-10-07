//! Rebalancing operations module
//! Security: CRITICAL - Moves portfolio funds

use crate::infrastructure::error_types::Result;
use crate::infrastructure::types::*;
use crate::infrastructure::constants::*;
use rust_decimal::Decimal;
use rust_decimal::prelude::FromStr;
use std::cell::RefCell;

thread_local! {
    static LAST_REBALANCE: RefCell<Option<u64>> = RefCell::new(None);
}

/// Perform portfolio rebalancing
pub async fn perform_rebalance() -> Result<String> {
    // Check timing
    if !can_rebalance_now() {
        return Ok("Too soon since last rebalance".to_string());
    }

    // Get current portfolio state
    let holdings = crate::critical_data::portfolio_value::calculate_holdings_by_token().await?;

    // Get target allocations from Kong liquidity
    let targets = crate::kong_liquidity::calculate_target_allocations().await?;

    // Calculate total value
    let total_value: Decimal = holdings.values().sum();

    if total_value == Decimal::ZERO {
        return Ok("No holdings to rebalance".to_string());
    }

    // Find largest deviation
    let mut max_deviation = Decimal::ZERO;
    let mut rebalance_token = None;
    let mut rebalance_action = None;

    for (token, target_pct) in targets.iter() {
        if let Some(holding_value) = holdings.get(token) {
            let current_pct = (*holding_value / total_value) * Decimal::from(100);
            let target_pct_decimal = Decimal::from_str(&target_pct.to_string()).unwrap_or_default();
            let deviation = (current_pct - target_pct_decimal).abs();

            if deviation > max_deviation && deviation > Decimal::from_str("1.0").unwrap() {
                max_deviation = deviation;
                rebalance_token = Some(*token);

                if current_pct > target_pct_decimal {
                    // Need to sell
                    let sell_amount = (deviation / Decimal::from(100)) * total_value * Decimal::from_str("0.1").unwrap();
                    rebalance_action = Some(RebalanceAction::Sell(*token, sell_amount.to_string().parse().unwrap_or(0.0)));
                } else {
                    // Need to buy
                    let buy_amount = (deviation / Decimal::from(100)) * total_value * Decimal::from_str("0.1").unwrap();
                    rebalance_action = Some(RebalanceAction::Buy(*token, buy_amount.to_string().parse().unwrap_or(0.0)));
                }
            }
        }
    }

    // Execute rebalance if needed
    let result = match rebalance_action {
        Some(action) => {
            update_last_rebalance();
            format!("Executed rebalance: {:?}", action)
        }
        None => "No rebalancing needed".to_string(),
    };

    Ok(result)
}

fn can_rebalance_now() -> bool {
    LAST_REBALANCE.with(|last| {
        if let Some(last_time) = *last.borrow() {
            let now = ic_cdk::api::time();
            let elapsed = now - last_time;
            elapsed >= (REBALANCE_INTERVAL_SECONDS * 1_000_000_000)
        } else {
            true
        }
    })
}

fn update_last_rebalance() {
    LAST_REBALANCE.with(|last| {
        *last.borrow_mut() = Some(ic_cdk::api::time());
    });
}