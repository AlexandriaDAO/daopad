//! ICPX Backend - Security-First Architecture
//! Main API router and canister entry point

use candid::{candid_method, CandidType, Deserialize, Nat, Principal};
use ic_cdk_macros::*;
use serde::Serialize;
use std::cell::RefCell;

// Module declarations with proper naming
#[path = "1_CRITICAL_OPERATIONS/mod.rs"]
mod critical_operations;

#[path = "2_CRITICAL_DATA/mod.rs"]
mod critical_data;

#[path = "3_KONG_LIQUIDITY/mod.rs"]
mod kong_liquidity;

#[path = "4_TRADING_EXECUTION/mod.rs"]
mod trading_execution;

#[path = "5_INFORMATIONAL/mod.rs"]
mod informational;

#[path = "6_INFRASTRUCTURE/mod.rs"]
mod infrastructure;

use infrastructure::types::*;
use infrastructure::error_types::Result;

// ===== Canister State =====

thread_local! {
    static STATE: RefCell<CanisterState> = RefCell::new(CanisterState::default());
}

#[derive(Default)]
struct CanisterState {
    initialized: bool,
    admin: Option<Principal>,
    paused: bool,
}

// ===== Initialization =====

#[init]
fn init() {
    STATE.with(|state| {
        let mut s = state.borrow_mut();
        s.initialized = true;
        s.admin = Some(ic_cdk::caller());
        s.paused = false;
    });

    // Start rebalancing timer
    start_rebalance_timer();
}

#[post_upgrade]
fn post_upgrade() {
    // Restore state and restart timers
    start_rebalance_timer();
}

// ===== Critical Operations - Minting =====

#[update]
#[candid_method(update)]
async fn initiate_mint(amount: Nat) -> Result<String> {
    check_not_paused()?;
    critical_operations::minting::initiate_mint(ic_cdk::caller(), amount).await
}

#[update]
#[candid_method(update)]
async fn complete_mint(mint_id: String) -> Result<Nat> {
    check_not_paused()?;
    critical_operations::minting::complete_mint(ic_cdk::caller(), mint_id).await
}

// ===== Critical Operations - Burning =====

#[update]
#[candid_method(update)]
async fn burn_icpx(burn_amount: Nat) -> Result<BurnResult> {
    check_not_paused()?;
    critical_operations::burning::burn_icpx(ic_cdk::caller(), burn_amount).await
}

// ===== Critical Operations - Rebalancing =====

#[update]
#[candid_method(update)]
async fn perform_rebalance() -> Result<String> {
    check_not_paused()?;
    critical_operations::rebalancing::perform_rebalance().await
}

// ===== Portfolio Queries =====

#[query]
#[candid_method(query)]
fn get_portfolio_display() -> PortfolioDisplay {
    informational::portfolio_display::get_portfolio_display()
}

#[update]
#[candid_method(update)]
async fn get_portfolio_value() -> Result<Nat> {
    critical_data::portfolio_value::calculate_portfolio_value_atomic().await
}

#[update]
#[candid_method(update)]
async fn get_portfolio_breakdown() -> Result<PortfolioBreakdown> {
    critical_data::portfolio_value::calculate_portfolio_value_breakdown().await
}

// ===== Supply Queries =====

#[update]
#[candid_method(update)]
async fn get_icpx_supply() -> Result<Nat> {
    critical_data::supply_tracker::get_validated_supply().await
}

#[query]
#[candid_method(query)]
async fn get_icpx_supply_cached() -> Result<Nat> {
    critical_data::supply_tracker::get_supply_cached().await
}

// ===== Target Allocations =====

#[update]
#[candid_method(update)]
async fn get_target_allocations() -> Result<Vec<(String, f64)>> {
    let targets = kong_liquidity::calculate_target_allocations().await?;

    // Convert to candid-friendly format
    let result: Vec<(String, f64)> = targets
        .into_iter()
        .map(|(token, pct)| (format!("{:?}", token), pct.to_string().parse().unwrap_or(0.0)))
        .collect();

    Ok(result)
}

// ===== Admin Functions =====

#[update]
#[candid_method(update)]
fn pause_canister() -> Result<()> {
    check_admin()?;
    STATE.with(|state| {
        state.borrow_mut().paused = true;
    });
    Ok(())
}

#[update]
#[candid_method(update)]
fn resume_canister() -> Result<()> {
    check_admin()?;
    STATE.with(|state| {
        state.borrow_mut().paused = false;
    });
    Ok(())
}

#[update]
#[candid_method(update)]
fn set_admin(new_admin: Principal) -> Result<()> {
    check_admin()?;
    STATE.with(|state| {
        state.borrow_mut().admin = Some(new_admin);
    });
    Ok(())
}

// ===== Health Check =====

#[query]
#[candid_method(query)]
fn health_check() -> HealthStatus {
    HealthStatus {
        canister_id: ic_cdk::id(),
        is_paused: STATE.with(|s| s.borrow().paused),
        cycles_balance: ic_cdk::api::canister_balance() as u128,
        memory_used: ic_cdk::api::stable::stable64_size() * 65536,
        timestamp: ic_cdk::api::time(),
    }
}

// ===== Helper Types =====

#[derive(CandidType, Deserialize, Serialize)]
struct HealthStatus {
    canister_id: Principal,
    is_paused: bool,
    cycles_balance: u128,
    memory_used: u64,
    timestamp: u64,
}

// ===== Helper Functions =====

fn check_not_paused() -> Result<()> {
    STATE.with(|state| {
        if state.borrow().paused {
            Err(infrastructure::error_types::IcpxError::System(
                infrastructure::error_types::SystemError::StateCorrupted {
                    reason: "Canister is paused".into()
                }
            ))
        } else {
            Ok(())
        }
    })
}

fn check_admin() -> Result<()> {
    let caller = ic_cdk::caller();
    STATE.with(|state| {
        match state.borrow().admin {
            Some(admin) if admin == caller => Ok(()),
            _ => Err(infrastructure::error_types::IcpxError::System(
                infrastructure::error_types::SystemError::Unauthorized {
                    principal: caller.to_string()
                }
            ))
        }
    })
}

fn start_rebalance_timer() {
    let interval = std::time::Duration::from_secs(3600); // 1 hour

    ic_cdk_timers::set_timer_interval(interval, || {
        ic_cdk::spawn(async {
            if let Err(e) = critical_operations::rebalancing::perform_rebalance().await {
                ic_cdk::println!("Rebalance error: {:?}", e);
            }
        });
    });
}

// ===== Candid Interface =====

ic_cdk::export_candid!();