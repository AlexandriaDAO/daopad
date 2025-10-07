// Module declarations
mod types;
mod infrastructure;
mod informational;
mod market_data;
mod kong_liquidity;
mod portfolio_data;
mod critical_operations;
mod orchestration;

// Legacy modules (will be phased out)
mod legacy {
    pub mod balance_tracker;
    pub mod burning;
    pub mod icpi_math;
    pub mod icpi_token;
    pub mod icrc_types;
    pub mod index_state;
    pub mod kong_locker;
    pub mod kongswap;
    pub mod ledger_client;
    pub mod minting;
    pub mod precision;
    pub mod rebalancer;
    pub mod tvl_calculator;
    pub mod types;
}

use candid::{candid_method, Nat, Principal};
use ic_cdk_macros::{init, post_upgrade, query, update};
use infrastructure::{FeatureFlags, OperationStrategy, log_shadow_comparison};

// =============================================================================
// INITIALIZATION & UPGRADES
// =============================================================================

#[init]
fn init() {
    ic_cdk::println!("ICPI Backend initialized with refactored architecture");
    ic_cdk::println!("Starting in LEGACY mode for safety");
    FeatureFlags::set_all_to_legacy();

    // Start rebalancing timer based on feature flag
    match FeatureFlags::get_rebalancing_strategy() {
        OperationStrategy::Legacy => legacy::rebalancer::start_rebalancing_timer(),
        OperationStrategy::Refactored => orchestration::start_rebalancing_timer(),
        OperationStrategy::Shadow => {
            legacy::rebalancer::start_rebalancing_timer();
            orchestration::start_rebalancing_timer();
        }
    }
}

#[post_upgrade]
fn post_upgrade() {
    ic_cdk::println!("ICPI Backend upgraded with refactored architecture");
    ic_cdk::println!("Maintaining existing feature flag configuration");

    // Restart rebalancing timer based on feature flag
    match FeatureFlags::get_rebalancing_strategy() {
        OperationStrategy::Legacy => legacy::rebalancer::start_rebalancing_timer(),
        OperationStrategy::Refactored => orchestration::start_rebalancing_timer(),
        OperationStrategy::Shadow => {
            legacy::rebalancer::start_rebalancing_timer();
            orchestration::start_rebalancing_timer();
        }
    }
}

// =============================================================================
// FEATURE FLAG MANAGEMENT (Admin only)
// =============================================================================

#[update]
#[candid_method(update)]
async fn set_feature_flag(operation: String, strategy: String) -> Result<String, String> {
    // TODO: Add admin authorization check
    let strat = match strategy.as_str() {
        "legacy" => OperationStrategy::Legacy,
        "refactored" => OperationStrategy::Refactored,
        "shadow" => OperationStrategy::Shadow,
        _ => return Err("Invalid strategy. Use: legacy, refactored, or shadow".to_string()),
    };

    FeatureFlags::set_strategy(&operation, strat)
}

#[query]
#[candid_method(query)]
fn get_feature_flags() -> infrastructure::FeatureFlagConfig {
    FeatureFlags::get_all_flags()
}

// =============================================================================
// CRITICAL OPERATIONS (Minting/Burning/Trading)
// =============================================================================

#[update]
#[candid_method(update)]
async fn mint_with_usdt(usdt_amount: Nat) -> Result<Nat, String> {
    let caller = ic_cdk::caller();

    match FeatureFlags::get_minting_strategy() {
        OperationStrategy::Legacy => {
            legacy::minting::mint_with_usdt(caller, usdt_amount).await
        }
        OperationStrategy::Refactored => {
            orchestration::orchestrate_mint(caller, usdt_amount).await
        }
        OperationStrategy::Shadow => {
            // Run both and compare
            let legacy_result = legacy::minting::mint_with_usdt(caller.clone(), usdt_amount.clone()).await;
            let refactored_result = orchestration::orchestrate_mint(caller, usdt_amount).await;

            log_shadow_comparison("mint_with_usdt", &legacy_result, &refactored_result);

            // Return legacy result as source of truth
            legacy_result
        }
    }
}

#[update]
#[candid_method(update)]
async fn burn_icpi(icpi_amount: Nat) -> Result<Vec<(String, Nat)>, String> {
    let caller = ic_cdk::caller();

    match FeatureFlags::get_burning_strategy() {
        OperationStrategy::Legacy => {
            legacy::burning::burn_icpi(caller, icpi_amount).await
        }
        OperationStrategy::Refactored => {
            orchestration::orchestrate_burn(caller, icpi_amount).await
        }
        OperationStrategy::Shadow => {
            // Run both and compare
            let legacy_result = legacy::burning::burn_icpi(caller.clone(), icpi_amount.clone()).await;
            let refactored_result = orchestration::orchestrate_burn(caller, icpi_amount).await;

            log_shadow_comparison("burn_icpi", &legacy_result, &refactored_result);

            // Return legacy result as source of truth
            legacy_result
        }
    }
}

// =============================================================================
// QUERY OPERATIONS (Read-only)
// =============================================================================

#[query]
#[candid_method(query)]
async fn get_index_state() -> Result<types::portfolio::IndexState, String> {
    match FeatureFlags::get_query_strategy() {
        OperationStrategy::Legacy => {
            legacy::index_state::get_index_state().await
        }
        OperationStrategy::Refactored => {
            informational::get_index_state_cached().await
        }
        OperationStrategy::Shadow => {
            // Run both for comparison but don't log (too noisy for queries)
            let legacy_result = legacy::index_state::get_index_state().await;
            let _refactored_result = informational::get_index_state_cached().await;
            legacy_result
        }
    }
}

#[query]
#[candid_method(query)]
fn get_health_status() -> types::common::HealthStatus {
    match FeatureFlags::get_query_strategy() {
        OperationStrategy::Legacy => {
            legacy::lib::health_status()
        }
        OperationStrategy::Refactored | OperationStrategy::Shadow => {
            informational::get_health_status()
        }
    }
}

#[query]
#[candid_method(query)]
fn get_tracked_tokens() -> Vec<String> {
    informational::get_tracked_tokens()
}

// =============================================================================
// ADMIN OPERATIONS
// =============================================================================

#[update]
#[candid_method(update)]
async fn trigger_rebalance() -> Result<String, String> {
    // TODO: Add admin authorization check

    match FeatureFlags::get_rebalancing_strategy() {
        OperationStrategy::Legacy => {
            legacy::rebalancer::execute_rebalance().await
        }
        OperationStrategy::Refactored => {
            orchestration::execute_rebalance().await
                .map(|_| "Rebalance executed successfully".to_string())
        }
        OperationStrategy::Shadow => {
            // Run both and compare
            let legacy_result = legacy::rebalancer::execute_rebalance().await;
            let refactored_result = orchestration::execute_rebalance().await
                .map(|_| "Rebalance executed successfully".to_string());

            log_shadow_comparison("trigger_rebalance", &legacy_result, &refactored_result);

            legacy_result
        }
    }
}

// =============================================================================
// CANDID INTERFACE
// =============================================================================

ic_cdk::export_candid!();