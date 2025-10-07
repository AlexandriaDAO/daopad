//! Infrastructure - Shared utilities and types
//! Foundation layer for all other modules

pub mod constants;
pub mod errors;
pub mod math;
pub mod types;
pub mod logging;
pub mod cache;
pub mod rate_limiting;

// Re-export commonly used items
pub use constants::*;
pub use errors::{IcpiError, Result, MintError, BurnError, RebalanceError, ValidationError, CalculationError, TradingError, KongswapError, SystemError};
pub use math::{multiply_and_divide, convert_decimals, calculate_mint_amount};

// Feature flag system implementation
use candid::CandidType;
use serde::{Deserialize, Serialize};
use std::cell::RefCell;
use std::collections::HashMap;

thread_local! {
    static FEATURE_FLAGS: RefCell<HashMap<String, OperationStrategy>> =
        RefCell::new(HashMap::new());
}

#[derive(Debug, Clone, Copy, PartialEq, CandidType, Deserialize, Serialize)]
pub enum OperationStrategy {
    Legacy,
    Refactored,
    Shadow,
}

pub struct FeatureFlags;

impl FeatureFlags {
    pub fn set_all_to_legacy() {
        FEATURE_FLAGS.with(|flags| {
            let mut flags = flags.borrow_mut();
            flags.insert("minting".to_string(), OperationStrategy::Refactored);
            flags.insert("burning".to_string(), OperationStrategy::Refactored);
            flags.insert("rebalancing".to_string(), OperationStrategy::Refactored);
            flags.insert("query".to_string(), OperationStrategy::Refactored);
        });
    }

    pub fn get_minting_strategy() -> OperationStrategy {
        FEATURE_FLAGS.with(|flags| {
            flags.borrow().get("minting")
                .copied()
                .unwrap_or(OperationStrategy::Refactored)
        })
    }

    pub fn get_burning_strategy() -> OperationStrategy {
        FEATURE_FLAGS.with(|flags| {
            flags.borrow().get("burning")
                .copied()
                .unwrap_or(OperationStrategy::Refactored)
        })
    }

    pub fn get_rebalancing_strategy() -> OperationStrategy {
        FEATURE_FLAGS.with(|flags| {
            flags.borrow().get("rebalancing")
                .copied()
                .unwrap_or(OperationStrategy::Refactored)
        })
    }

    pub fn get_query_strategy() -> OperationStrategy {
        FEATURE_FLAGS.with(|flags| {
            flags.borrow().get("query")
                .copied()
                .unwrap_or(OperationStrategy::Refactored)
        })
    }

    pub fn set_strategy(operation: &str, strategy: OperationStrategy) -> Result<String> {
        FEATURE_FLAGS.with(|flags| {
            let mut flags = flags.borrow_mut();
            flags.insert(operation.to_string(), strategy);
            Ok(format!("Set {} to {:?}", operation, strategy))
        })
    }

    pub fn get_all_flags() -> FeatureFlagConfig {
        FEATURE_FLAGS.with(|flags| {
            let flags = flags.borrow();
            FeatureFlagConfig {
                minting: flags.get("minting")
                    .copied()
                    .unwrap_or(OperationStrategy::Refactored),
                burning: flags.get("burning")
                    .copied()
                    .unwrap_or(OperationStrategy::Refactored),
                rebalancing: flags.get("rebalancing")
                    .copied()
                    .unwrap_or(OperationStrategy::Refactored),
                query: flags.get("query")
                    .copied()
                    .unwrap_or(OperationStrategy::Refactored),
            }
        })
    }
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct FeatureFlagConfig {
    pub minting: OperationStrategy,
    pub burning: OperationStrategy,
    pub rebalancing: OperationStrategy,
    pub query: OperationStrategy,
}

