use crate::types::rebalancing::RebalanceAction;
use crate::portfolio_data::get_index_state_uncached;
use crate::critical_operations::execute_swap;
use crate::types::tokens::TrackedToken;
use crate::market_data::usd_to_token_amount;
use ic_cdk_timers::TimerId;
use std::cell::RefCell;
use rust_decimal::Decimal;
use std::str::FromStr;

thread_local! {
    static TIMER_ID: RefCell<Option<TimerId>> = RefCell::new(None);
}

/// Start the hourly rebalancing timer
pub fn start_rebalancing_timer() {
    let timer_id = ic_cdk_timers::set_timer_interval(
        std::time::Duration::from_secs(3600), // 1 hour
        || {
            ic_cdk::spawn(async {
                if let Err(e) = execute_rebalance().await {
                    ic_cdk::println!("Rebalance failed: {}", e);
                }
            });
        }
    );

    TIMER_ID.with(|t| *t.borrow_mut() = Some(timer_id));
    ic_cdk::println!("Rebalancing timer started");
}

/// Stop the rebalancing timer
pub fn stop_rebalancing_timer() {
    TIMER_ID.with(|t| {
        if let Some(timer_id) = t.borrow_mut().take() {
            ic_cdk_timers::clear_timer(timer_id);
            ic_cdk::println!("Rebalancing timer stopped");
        }
    });
}

/// Execute a single rebalance operation
pub async fn execute_rebalance() -> Result<(), String> {
    ic_cdk::println!("Starting rebalance check");

    // Get current state (uncached for critical operation)
    let state = get_index_state_uncached().await?;

    // Determine rebalance action
    let action = determine_rebalance_action(&state)?;

    match action {
        RebalanceAction::Buy { token, usdt_amount } => {
            ic_cdk::println!("Rebalance: Buy {} worth ${:.2}", token.to_symbol(), usdt_amount);

            // Convert USD amount to token amount
            let amount_decimal = Decimal::from_str(&usdt_amount.to_string())
                .map_err(|e| format!("Failed to parse amount: {}", e))?;
            let token_amount = usd_to_token_amount(amount_decimal, &token).await?;

            // Execute swap from ckUSDT to target token
            execute_swap(&TrackedToken::ckUSDT, &token, token_amount).await?;
        }
        RebalanceAction::Sell { token, usdt_value } => {
            ic_cdk::println!("Rebalance: Sell {} for ${:.2}", token.to_symbol(), usdt_value);

            // Convert USD value to token amount
            let value_decimal = Decimal::from_str(&usdt_value.to_string())
                .map_err(|e| format!("Failed to parse value: {}", e))?;
            let token_amount = usd_to_token_amount(value_decimal, &token).await?;

            // Execute swap from token to ckUSDT
            execute_swap(&token, &TrackedToken::ckUSDT, token_amount).await?;
        }
        RebalanceAction::None => {
            ic_cdk::println!("Rebalance: No action needed");
        }
    }

    Ok(())
}

/// Determine what rebalancing action to take
fn determine_rebalance_action(state: &crate::types::portfolio::IndexState) -> Result<RebalanceAction, String> {
    // Minimum thresholds
    const MIN_USDT_FOR_BUY: u64 = 10_000_000; // $10 in ckUSDT (6 decimals)
    const MIN_DEVIATION_PCT: f64 = 5.0; // 5% minimum deviation

    // Check if we have enough ckUSDT for buying
    let usdt_balance = state.ckusdt_balance.0.to_u64().unwrap_or(0);

    if usdt_balance >= MIN_USDT_FOR_BUY {
        // Find token with largest positive deviation (most underweight)
        if let Some(deviation) = state.deviations.iter()
            .filter(|d| d.deviation_pct > MIN_DEVIATION_PCT)
            .max_by(|a, b| a.deviation_pct.partial_cmp(&b.deviation_pct).unwrap())
        {
            return Ok(RebalanceAction::Buy {
                token: deviation.token.clone(),
                usdt_amount: deviation.trade_size_usd.abs(),
            });
        }
    }

    // If no buying opportunity, check for selling
    if let Some(deviation) = state.deviations.iter()
        .filter(|d| d.deviation_pct < -MIN_DEVIATION_PCT)
        .min_by(|a, b| a.deviation_pct.partial_cmp(&b.deviation_pct).unwrap())
    {
        return Ok(RebalanceAction::Sell {
            token: deviation.token.clone(),
            usdt_value: deviation.trade_size_usd.abs(),
        });
    }

    Ok(RebalanceAction::None)
}