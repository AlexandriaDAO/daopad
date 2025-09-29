// Module declarations
mod types;
mod kong_locker;
mod kongswap;
mod tvl_calculator;
mod balance_tracker;
mod index_state;
mod rebalancer;
mod icpi_math;

use types::{IndexState, HealthStatus, RebalanceAction};
use rebalancer::{RebalancerStatus, start_rebalancing};
use candid::Principal;

// Initialize the canister
#[ic_cdk::init]
fn init() {
    ic_cdk::println!("ICPI Backend initialized");
    // Start the hourly rebalancing timer
    start_rebalancing();
}

// Post-upgrade hook
#[ic_cdk::post_upgrade]
fn post_upgrade() {
    ic_cdk::println!("ICPI Backend upgraded");
    // Restart the hourly rebalancing timer
    start_rebalancing();
}

// ===== Public Query Endpoints =====

// Get complete index state
#[ic_cdk::update]  // Must be update for inter-canister calls
async fn get_index_state() -> Result<IndexState, String> {
    ic_cdk::println!("Getting index state...");
    index_state::get_index_state().await
}

// Get rebalancing recommendation
#[ic_cdk::update]
async fn get_rebalancing_recommendation() -> Result<Option<RebalanceAction>, String> {
    ic_cdk::println!("Getting rebalancing recommendation...");
    index_state::get_rebalancing_recommendation().await
}

// Get TVL summary
#[ic_cdk::update]
async fn get_tvl_summary() -> Result<tvl_calculator::TVLSummary, String> {
    ic_cdk::println!("Getting TVL summary...");
    tvl_calculator::get_tvl_summary().await
}

// Get balance summary
#[ic_cdk::update]
async fn get_balance_summary() -> Result<balance_tracker::BalanceSummary, String> {
    ic_cdk::println!("Getting balance summary...");
    balance_tracker::get_balance_summary().await
}

// Get locked TVL by token
#[ic_cdk::update]
async fn get_locked_tvl_by_token() -> Result<Vec<(String, f64)>, String> {
    ic_cdk::println!("Getting locked TVL by token...");
    let tvl = tvl_calculator::calculate_locked_tvl().await?;

    let mut result = Vec::new();
    for (token, value) in tvl {
        result.push((
            token.to_symbol().to_string(),
            types::decimal_to_f64(value)
        ));
    }

    Ok(result)
}

// Get current positions
#[ic_cdk::update]
async fn get_current_positions() -> Result<Vec<types::CurrentPosition>, String> {
    ic_cdk::println!("Getting current positions...");
    balance_tracker::get_current_positions().await
}

// ===== Rebalancer Controls =====

// Manual rebalance trigger (for testing)
#[ic_cdk::update]
async fn trigger_manual_rebalance() -> Result<String, String> {
    ic_cdk::println!("Manual rebalance triggered");
    rebalancer::trigger_manual_rebalance().await
}

// Get rebalancer status
#[ic_cdk::query]
fn get_rebalancer_status() -> RebalancerStatus {
    rebalancer::get_rebalancer_status()
}

// Stop rebalancing
#[ic_cdk::update]
fn stop_rebalancing() -> String {
    rebalancer::stop_rebalancing();
    "Rebalancing stopped".to_string()
}

// Start rebalancing
#[ic_cdk::update]
fn start_rebalancing_timer() -> String {
    rebalancer::start_rebalancing();
    "Rebalancing started".to_string()
}

// ===== Health and Status =====

// Health check endpoint
#[ic_cdk::query]
fn get_health_status() -> HealthStatus {
    HealthStatus {
        version: "1.0.0".to_string(),
        tracked_tokens: vec!["ALEX".to_string(), "ZERO".to_string(), "KONG".to_string(), "BOB".to_string()],
        last_rebalance: rebalancer::get_last_rebalance_time(),
        cycles_balance: ic_cdk::api::canister_balance128(),
    }
}

// ===== Test Endpoints =====

// Test kong_locker connection
#[ic_cdk::update]
async fn test_kong_locker_connection() -> Result<String, String> {
    ic_cdk::println!("Testing kong_locker connection...");
    let canisters = kong_locker::get_all_lock_canisters().await?;
    Ok(format!("Successfully retrieved {} lock canisters", canisters.len()))
}

// Test Kongswap connection
#[ic_cdk::update]
async fn test_kongswap_connection() -> Result<String, String> {
    ic_cdk::println!("Testing Kongswap connection...");
    use types::TrackedToken;
    let price = kongswap::get_token_price_in_usdt(&TrackedToken::ALEX).await?;
    Ok(format!("ALEX price: {} USDT", price))
}

// Test ICRC1 balance query
#[ic_cdk::update]
async fn test_balance_query() -> Result<String, String> {
    ic_cdk::println!("Testing balance query...");
    use types::TrackedToken;
    let balance = balance_tracker::get_token_balance(&TrackedToken::ALEX).await?;
    Ok(format!("ALEX balance: {}", balance))
}

// Clear caches (for testing)
#[ic_cdk::update]
fn clear_all_caches() -> String {
    kong_locker::clear_lock_canisters_cache();
    "All caches cleared".to_string()
}

// Get cache statistics
#[ic_cdk::query]
fn get_cache_stats() -> String {
    let (cached, last_updated, count) = kong_locker::get_cache_stats();
    format!(
        "Lock canisters cache: cached={}, last_updated={:?}, count={:?}",
        cached, last_updated, count
    )
}

// ===== Utility Functions =====

// Get canister ID
#[ic_cdk::query]
fn get_canister_id() -> Principal {
    ic_cdk::id()
}

// Get cycles balance
#[ic_cdk::query]
fn get_cycles_balance() -> u128 {
    ic_cdk::api::canister_balance128()
}

// Legacy greet function (for compatibility)
#[ic_cdk::query]
fn greet(name: String) -> String {
    format!("Hello, {}! Welcome to ICPI.", name)
}