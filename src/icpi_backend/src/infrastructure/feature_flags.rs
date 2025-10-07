use std::cell::RefCell;
use candid::CandidType;
use serde::{Deserialize, Serialize};

thread_local! {
    static FEATURE_FLAGS: RefCell<FeatureFlagConfig> = RefCell::new(FeatureFlagConfig::default());
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum OperationStrategy {
    Legacy,      // Old code path
    Refactored,  // New code path
    Shadow,      // Run both, compare results
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct FeatureFlagConfig {
    pub minting_strategy: OperationStrategy,
    pub burning_strategy: OperationStrategy,
    pub rebalancing_strategy: OperationStrategy,
    pub query_strategy: OperationStrategy,
}

impl Default for FeatureFlagConfig {
    fn default() -> Self {
        Self {
            minting_strategy: OperationStrategy::Legacy,
            burning_strategy: OperationStrategy::Legacy,
            rebalancing_strategy: OperationStrategy::Legacy,
            query_strategy: OperationStrategy::Legacy,
        }
    }
}

pub struct FeatureFlags;

impl FeatureFlags {
    pub fn get_minting_strategy() -> OperationStrategy {
        FEATURE_FLAGS.with(|f| f.borrow().minting_strategy.clone())
    }

    pub fn get_burning_strategy() -> OperationStrategy {
        FEATURE_FLAGS.with(|f| f.borrow().burning_strategy.clone())
    }

    pub fn get_rebalancing_strategy() -> OperationStrategy {
        FEATURE_FLAGS.with(|f| f.borrow().rebalancing_strategy.clone())
    }

    pub fn get_query_strategy() -> OperationStrategy {
        FEATURE_FLAGS.with(|f| f.borrow().query_strategy.clone())
    }

    pub fn set_strategy(operation: &str, strategy: OperationStrategy) -> Result<String, String> {
        FEATURE_FLAGS.with(|f| {
            let mut flags = f.borrow_mut();
            match operation {
                "minting" => {
                    let old = flags.minting_strategy.clone();
                    flags.minting_strategy = strategy.clone();
                    Ok(format!("Minting strategy changed from {:?} to {:?}", old, strategy))
                }
                "burning" => {
                    let old = flags.burning_strategy.clone();
                    flags.burning_strategy = strategy.clone();
                    Ok(format!("Burning strategy changed from {:?} to {:?}", old, strategy))
                }
                "rebalancing" => {
                    let old = flags.rebalancing_strategy.clone();
                    flags.rebalancing_strategy = strategy.clone();
                    Ok(format!("Rebalancing strategy changed from {:?} to {:?}", old, strategy))
                }
                "query" => {
                    let old = flags.query_strategy.clone();
                    flags.query_strategy = strategy.clone();
                    Ok(format!("Query strategy changed from {:?} to {:?}", old, strategy))
                }
                _ => Err(format!("Unknown operation: {}", operation))
            }
        })
    }

    pub fn get_all_flags() -> FeatureFlagConfig {
        FEATURE_FLAGS.with(|f| f.borrow().clone())
    }

    pub fn set_all_to_legacy() -> String {
        FEATURE_FLAGS.with(|f| {
            *f.borrow_mut() = FeatureFlagConfig::default();
        });
        "All strategies set to Legacy mode".to_string()
    }

    pub fn set_all_to_shadow() -> String {
        FEATURE_FLAGS.with(|f| {
            let mut flags = f.borrow_mut();
            flags.minting_strategy = OperationStrategy::Shadow;
            flags.burning_strategy = OperationStrategy::Shadow;
            flags.rebalancing_strategy = OperationStrategy::Shadow;
            flags.query_strategy = OperationStrategy::Shadow;
        });
        "All strategies set to Shadow mode for testing".to_string()
    }

    pub fn set_all_to_refactored() -> String {
        FEATURE_FLAGS.with(|f| {
            let mut flags = f.borrow_mut();
            flags.minting_strategy = OperationStrategy::Refactored;
            flags.burning_strategy = OperationStrategy::Refactored;
            flags.rebalancing_strategy = OperationStrategy::Refactored;
            flags.query_strategy = OperationStrategy::Refactored;
        });
        "All strategies set to Refactored mode".to_string()
    }
}

// Shadow mode comparison logging
pub fn log_shadow_comparison<T: std::fmt::Debug + PartialEq>(
    operation: &str,
    legacy_result: &Result<T, String>,
    refactored_result: &Result<T, String>
) {
    match (legacy_result, refactored_result) {
        (Ok(legacy), Ok(refactored)) if legacy == refactored => {
            ic_cdk::println!("✓ SHADOW MATCH [{}]: Results identical", operation);
        }
        (Ok(legacy), Ok(refactored)) => {
            ic_cdk::println!("⚠️ SHADOW MISMATCH [{}]:", operation);
            ic_cdk::println!("  Legacy: {:?}", legacy);
            ic_cdk::println!("  Refactored: {:?}", refactored);
        }
        (Err(legacy_err), Err(refactored_err)) if legacy_err == refactored_err => {
            ic_cdk::println!("✓ SHADOW MATCH [{}]: Both failed with same error", operation);
        }
        (Err(legacy_err), Err(refactored_err)) => {
            ic_cdk::println!("⚠️ SHADOW ERROR MISMATCH [{}]:", operation);
            ic_cdk::println!("  Legacy error: {}", legacy_err);
            ic_cdk::println!("  Refactored error: {}", refactored_err);
        }
        (Ok(_), Err(refactored_err)) => {
            ic_cdk::println!("❌ SHADOW FAILURE [{}]: Refactored failed but legacy succeeded", operation);
            ic_cdk::println!("  Refactored error: {}", refactored_err);
        }
        (Err(legacy_err), Ok(_)) => {
            ic_cdk::println!("❌ SHADOW FAILURE [{}]: Legacy failed but refactored succeeded", operation);
            ic_cdk::println!("  Legacy error: {}", legacy_err);
        }
    }
}