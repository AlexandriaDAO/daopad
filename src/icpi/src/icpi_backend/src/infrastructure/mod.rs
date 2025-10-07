//! Infrastructure module - Core utilities and types
//! Phase 2 complete: Error types implemented

use candid::CandidType;
use serde::{Deserialize, Serialize};

// Export error types
pub mod errors;
pub use errors::{IcpiError, Result, MintError, BurnError, RebalanceError};

// Feature flag system (stub for now)
pub struct FeatureFlags;

#[derive(Debug, Clone, Copy, PartialEq, CandidType, Deserialize, Serialize)]
pub enum OperationStrategy {
    Legacy,
    Refactored,
    Shadow,
}

impl FeatureFlags {
    pub fn set_all_to_legacy() {
        // Stub - always use legacy for safety
    }

    pub fn get_minting_strategy() -> OperationStrategy {
        OperationStrategy::Legacy
    }

    pub fn get_burning_strategy() -> OperationStrategy {
        OperationStrategy::Legacy
    }

    pub fn get_rebalancing_strategy() -> OperationStrategy {
        OperationStrategy::Legacy
    }

    pub fn get_query_strategy() -> OperationStrategy {
        OperationStrategy::Legacy
    }

    pub fn set_strategy(_operation: &str, _strategy: OperationStrategy) -> Result<String, String> {
        Ok("Feature flags not yet implemented - using legacy".to_string())
    }

    pub fn get_all_flags() -> FeatureFlagConfig {
        FeatureFlagConfig {
            minting: OperationStrategy::Legacy,
            burning: OperationStrategy::Legacy,
            rebalancing: OperationStrategy::Legacy,
            query: OperationStrategy::Legacy,
        }
    }
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct FeatureFlagConfig {
    pub minting: OperationStrategy,
    pub burning: OperationStrategy,
    pub rebalancing: OperationStrategy,
    pub query: OperationStrategy,
}

pub fn log_shadow_comparison<T>(_operation: &str, _legacy: &T, _refactored: &T) {
    // Stub - will implement logging later
}

// Cache module stubs (referenced by portfolio_data)
pub mod cache {
    pub enum CachePolicy {
        Short,
        Medium,
        Long,
    }

    pub fn get_cached<T, F>(_key: &str, _policy: CachePolicy, f: F) -> T
    where
        F: FnOnce() -> T,
    {
        // No caching for now, just execute function
        f()
    }

    pub fn assert_no_cache_for_critical_op(_op: &str) {
        // Stub - no caching implemented yet
    }
}

// Logging module stubs (referenced by critical_operations)
pub mod logging {
    use candid::Principal;

    pub struct AuditLogger;

    impl AuditLogger {
        pub fn log_mint(_user: Principal, _usdt: u64, _icpi: u64, _tvl_before: u64, _tvl_after: u64) {
            // Stub - will implement audit logging later
        }
    }
}
