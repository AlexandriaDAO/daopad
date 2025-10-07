use crate::types::{RebalanceAction, TrackedToken, f64_to_decimal, decimal_to_f64};
use crate::index_state::{get_index_state, get_rebalancing_recommendation};
use crate::kongswap::execute_swap;
use candid::Nat;
use ic_cdk_timers::{set_timer_interval, clear_timer, TimerId};
use rust_decimal::Decimal;
use std::cell::RefCell;
use std::time::Duration;

// Store timer ID for management
thread_local! {
    static REBALANCE_TIMER: RefCell<Option<TimerId>> = RefCell::new(None);
    static LAST_REBALANCE: RefCell<Option<u64>> = RefCell::new(None);
    static REBALANCE_HISTORY: RefCell<Vec<RebalanceRecord>> = RefCell::new(Vec::new());
}

#[derive(candid::CandidType, candid::Deserialize, serde::Serialize, Debug, Clone)]
pub struct RebalanceRecord {
    pub timestamp: u64,
    pub action: RebalanceAction,
    pub success: bool,
    pub details: String,
}

// Start hourly rebalancing timer
pub fn start_rebalancing() {
    let interval = Duration::from_secs(3600); // 1 hour

    let timer_id = set_timer_interval(interval, || {
        ic_cdk::spawn(async {
            match perform_rebalance().await {
                Ok(msg) => ic_cdk::println!("Rebalance successful: {}", msg),
                Err(e) => ic_cdk::println!("Rebalance failed: {}", e),
            }
        });
    });

    REBALANCE_TIMER.with(|timer| {
        *timer.borrow_mut() = Some(timer_id);
    });

    ic_cdk::println!("Rebalancing timer started (1 hour interval)");
}

// Stop rebalancing timer
pub fn stop_rebalancing() {
    REBALANCE_TIMER.with(|timer| {
        if let Some(timer_id) = timer.borrow_mut().take() {
            clear_timer(timer_id);
            ic_cdk::println!("Rebalancing timer stopped");
        }
    });
}

// Perform a single rebalance
pub async fn perform_rebalance() -> Result<String, String> {
    // Check if enough time has passed since last rebalance
    let now = ic_cdk::api::time();
    let last_rebalance_time = get_last_rebalance_time();

    if let Some(last_time) = last_rebalance_time {
        let elapsed = (now - last_time) / 1_000_000_000; // Convert to seconds
        if elapsed < 3550 {
            // Allow slight time drift (50 seconds)
            return Err(format!("Too soon to rebalance. {} seconds since last rebalance", elapsed));
        }
    }

    // Get rebalancing recommendation
    let action = match get_rebalancing_recommendation().await? {
        Some(a) => a,
        None => {
            record_rebalance(RebalanceAction::None, true, "No rebalancing needed");
            return Ok("No rebalancing action needed".to_string());
        }
    };

    // Execute the rebalancing action
    let result = match &action {
        RebalanceAction::Buy { token, usdt_amount } => {
            execute_buy(token.clone(), *usdt_amount).await
        }
        RebalanceAction::Sell { token, usdt_value } => {
            execute_sell(token.clone(), *usdt_value).await
        }
        RebalanceAction::None => Ok("No action taken".to_string()),
    };

    // Record the rebalance attempt
    match &result {
        Ok(details) => {
            record_rebalance(action, true, details);
            update_last_rebalance_time(now);
            Ok(details.clone())
        }
        Err(e) => {
            record_rebalance(action, false, e);
            Err(e.clone())
        }
    }
}

// Execute buy action
async fn execute_buy(token: TrackedToken, usdt_amount: f64) -> Result<String, String> {
    // Convert USD amount to ckUSDT amount (6 decimals)
    let usdt_nat = Nat::from((usdt_amount * 1_000_000.0) as u128);

    ic_cdk::println!("Executing buy: {} ckUSDT for {:?}", usdt_nat, token);

    // Execute swap from ckUSDT to target token
    let swap_result = execute_swap(
        "ckUSDT".to_string(),
        usdt_nat.clone(),
        token.to_symbol().to_string(),
        Some(2.0), // Max 2% slippage
    ).await?;

    let details = format!(
        "Bought {} {:?} for {} ckUSDT (price: {})",
        swap_result.receive_amount,
        token,
        swap_result.pay_amount,
        swap_result.price
    );

    Ok(details)
}

// Execute sell action
async fn execute_sell(token: TrackedToken, usdt_value: f64) -> Result<String, String> {
    // Need to calculate token amount based on current price
    // This is approximated - actual implementation would query exact amount
    let token_amount = calculate_token_amount_for_usd(token.clone(), usdt_value).await?;

    ic_cdk::println!("Executing sell: {} {:?} for ~${}", token_amount, token, usdt_value);

    // Execute swap from token to ckUSDT
    let swap_result = execute_swap(
        token.to_symbol().to_string(),
        token_amount,
        "ckUSDT".to_string(),
        Some(2.0), // Max 2% slippage
    ).await?;

    let details = format!(
        "Sold {} {:?} for {} ckUSDT (price: {})",
        swap_result.pay_amount,
        token,
        swap_result.receive_amount,
        swap_result.price
    );

    Ok(details)
}

// Calculate token amount needed for USD value
async fn calculate_token_amount_for_usd(
    token: TrackedToken,
    usd_value: f64
) -> Result<Nat, String> {
    use crate::kongswap::get_token_price_in_usdt;

    let price = get_token_price_in_usdt(&token).await?;
    if price == Decimal::ZERO {
        return Err("Cannot calculate amount with zero price".to_string());
    }

    let usd_decimal = f64_to_decimal(usd_value)?;
    let token_amount_decimal = usd_decimal / price;

    // Convert to token units with proper decimals
    let decimals = token.get_decimals();
    let multiplier = Decimal::from(10u128.pow(decimals as u32));
    let token_units = token_amount_decimal * multiplier;

    // Convert to Nat
    let units_str = token_units.round().to_string();
    let units_u128: u128 = units_str.parse()
        .map_err(|_| "Failed to parse token units".to_string())?;

    Ok(Nat::from(units_u128))
}

// Record rebalance in history
fn record_rebalance(action: RebalanceAction, success: bool, details: &str) {
    let record = RebalanceRecord {
        timestamp: ic_cdk::api::time(),
        action,
        success,
        details: details.to_string(),
    };

    REBALANCE_HISTORY.with(|history| {
        let mut hist = history.borrow_mut();
        hist.push(record);

        // Keep only last 100 records
        if hist.len() > 100 {
            let drain_count = hist.len() - 100;
            hist.drain(0..drain_count);
        }
    });
}

// Get last rebalance time
pub fn get_last_rebalance_time() -> Option<u64> {
    LAST_REBALANCE.with(|last| *last.borrow())
}

// Update last rebalance time
fn update_last_rebalance_time(time: u64) {
    LAST_REBALANCE.with(|last| {
        *last.borrow_mut() = Some(time);
    });
}

// Get rebalance history
pub fn get_rebalance_history(limit: usize) -> Vec<RebalanceRecord> {
    REBALANCE_HISTORY.with(|history| {
        let hist = history.borrow();
        let start = if hist.len() > limit {
            hist.len() - limit
        } else {
            0
        };
        hist[start..].to_vec()
    })
}

// Manual trigger for testing
pub async fn trigger_manual_rebalance() -> Result<String, String> {
    ic_cdk::println!("Manual rebalance triggered");

    // Clear last rebalance time to bypass time check
    LAST_REBALANCE.with(|last| {
        *last.borrow_mut() = None;
    });

    perform_rebalance().await
}

// Get rebalancer status
pub fn get_rebalancer_status() -> RebalancerStatus {
    let timer_active = REBALANCE_TIMER.with(|timer| timer.borrow().is_some());
    let last_rebalance = get_last_rebalance_time();
    let history = get_rebalance_history(10);

    RebalancerStatus {
        timer_active,
        last_rebalance,
        recent_history: history,
        next_rebalance: last_rebalance.map(|t| t + 3_600_000_000_000), // Add 1 hour in nanoseconds
    }
}

#[derive(candid::CandidType, candid::Deserialize, serde::Serialize, Debug)]
pub struct RebalancerStatus {
    pub timer_active: bool,
    pub last_rebalance: Option<u64>,
    pub next_rebalance: Option<u64>,
    pub recent_history: Vec<RebalanceRecord>,
}