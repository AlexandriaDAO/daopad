//! Health monitoring module

use crate::types::common::HealthStatus;
use crate::types::TrackedToken;

/// Get system health status
pub fn get_health_status() -> HealthStatus {
    HealthStatus {
        is_healthy: true,
        last_rebalance: 0,
        pending_mints: 0,
        cycles_balance: ic_cdk::api::canister_balance128(),
        memory_used: ic_cdk::api::stable_size() as u128 * 65536,
        timestamp: ic_cdk::api::time(),
    }
}

/// Get list of tracked tokens
pub fn get_tracked_tokens() -> Vec<String> {
    TrackedToken::all()
        .into_iter()
        .map(|t| t.to_symbol().to_string())
        .collect()
}
