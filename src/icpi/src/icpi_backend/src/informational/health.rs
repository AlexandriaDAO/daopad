use crate::types::common::HealthStatus;
use crate::types::tokens::TrackedToken;
use ic_cdk::api::{canister_balance128, time};

/// Get system health status
pub fn get_health_status() -> HealthStatus {
    HealthStatus {
        version: "2.0.0-refactored".to_string(),
        tracked_tokens: TrackedToken::all()
            .iter()
            .map(|t| t.to_symbol().to_string())
            .collect(),
        last_rebalance: None, // Will be populated from rebalancer module
        cycles_balance: canister_balance128(),
    }
}

/// Check if system is healthy
pub fn is_system_healthy() -> bool {
    let cycles = canister_balance128();
    // Require at least 1T cycles for healthy operation
    cycles > 1_000_000_000_000
}

/// Get system metrics for monitoring
pub fn get_system_metrics() -> Result<String, String> {
    let health = get_health_status();

    let mut metrics = format!("ICPI Backend v{}\n", health.version);
    metrics.push_str(&format!("Cycles: {:.2}T\n", health.cycles_balance as f64 / 1e12));
    metrics.push_str(&format!("Tracked tokens: {}\n", health.tracked_tokens.join(", ")));

    if let Some(last_rebalance) = health.last_rebalance {
        let ago_secs = (time() - last_rebalance) / 1_000_000_000;
        metrics.push_str(&format!("Last rebalance: {} seconds ago\n", ago_secs));
    } else {
        metrics.push_str("Last rebalance: Never\n");
    }

    if !is_system_healthy() {
        metrics.push_str("⚠️ WARNING: Low cycles balance!\n");
    }

    Ok(metrics)
}

/// Log system event for monitoring
pub fn log_event(event: &str, details: &str) {
    ic_cdk::println!("EVENT | {} | {} | {}", time(), event, details);
}