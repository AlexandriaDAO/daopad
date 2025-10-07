//! Supply sanity checks and validation
//! Security: CRITICAL - Prevents supply manipulation attacks

use candid::Nat;
use ic_cdk::api::time;

use crate::infrastructure::constants::*;
use crate::infrastructure::math_utils::*;
use crate::infrastructure::types::*;
use crate::infrastructure::error_types::{IcpxError, Result, ValidationError};

/// Supply change tracking for anomaly detection
#[derive(Debug, Clone)]
pub struct SupplySnapshot {
    pub supply: Nat,
    pub timestamp: u64,
}

static mut SUPPLY_HISTORY: Vec<SupplySnapshot> = Vec::new();
const MAX_HISTORY_SIZE: usize = 100;

/// Validate supply change is within reasonable bounds
pub fn validate_supply_change(
    new_supply: &Nat,
    previous_supply: Option<&Nat>,
) -> Result<()> {
    if let Some(prev) = previous_supply {
        if prev == &Nat::from(0u64) {
            // Initial supply, any value is valid
            return Ok(());
        }

        let prev_u128 = nat_to_u128(prev)?;
        let new_u128 = nat_to_u128(new_supply)?;

        // Calculate change ratio
        let ratio = if new_u128 > prev_u128 {
            new_u128 as f64 / prev_u128 as f64
        } else {
            prev_u128 as f64 / new_u128 as f64
        };

        // Check if change is too rapid
        if ratio > MAX_SUPPLY_CHANGE_RATIO {
            return Err(IcpxError::Validation(ValidationError::RapidChangeDetected {
                field: "supply".into(),
                change_ratio: format!("{:.2}", ratio),
            }));
        }
    }

    // Check absolute bounds
    validate_supply_absolute_bounds(new_supply)?;

    Ok(())
}

/// Validate supply is within absolute bounds
pub fn validate_supply_absolute_bounds(supply: &Nat) -> Result<()> {
    let supply_u128 = nat_to_u128(supply)?;

    // Check maximum possible supply
    if supply_u128 > MAX_POSSIBLE_SUPPLY {
        return Err(IcpxError::Validation(ValidationError::SupplyOutOfBounds {
            supply: supply.to_string(),
            max: MAX_POSSIBLE_SUPPLY.to_string(),
        }));
    }

    // Supply should never be negative (Nat prevents this, but double-check)
    if supply_u128 == 0 {
        // Zero supply is valid for new canister
        ic_cdk::println!("Warning: Supply is zero");
    }

    Ok(())
}

/// Track supply changes for anomaly detection
pub fn track_supply_change(supply: Nat) {
    let snapshot = SupplySnapshot {
        supply,
        timestamp: time(),
    };

    unsafe {
        SUPPLY_HISTORY.push(snapshot);

        // Keep only recent history
        if SUPPLY_HISTORY.len() > MAX_HISTORY_SIZE {
            SUPPLY_HISTORY.remove(0);
        }
    }
}

/// Detect anomalous supply patterns
pub fn detect_supply_anomalies() -> Option<String> {
    unsafe {
        if SUPPLY_HISTORY.len() < 3 {
            return None; // Not enough data
        }

        // Check for rapid oscillations
        let recent = &SUPPLY_HISTORY[SUPPLY_HISTORY.len() - 3..];

        if let (Ok(s1), Ok(s2), Ok(s3)) = (
            nat_to_u128(&recent[0].supply),
            nat_to_u128(&recent[1].supply),
            nat_to_u128(&recent[2].supply),
        ) {
            // Detect zigzag pattern (potential attack)
            if (s1 > s2 && s2 < s3) || (s1 < s2 && s2 > s3) {
                let variance = ((s1 as f64 - s3 as f64).abs() / s2 as f64) * 100.0;
                if variance > 5.0 {
                    return Some(format!("Supply oscillation detected: {:.2}% variance", variance));
                }
            }

            // Detect sudden spike
            let avg = (s1 + s2) / 2;
            if s3 > avg {
                let spike_ratio = s3 as f64 / avg as f64;
                if spike_ratio > 1.5 {
                    return Some(format!("Supply spike detected: {:.2}x increase", spike_ratio));
                }
            }
        }

        None
    }
}

/// Validate supply consistency with minted/burned amounts
pub fn validate_supply_consistency(
    supply_before: &Nat,
    supply_after: &Nat,
    minted: Option<&Nat>,
    burned: Option<&Nat>,
) -> Result<()> {
    let mut expected_supply = supply_before.clone();

    // Add minted amount
    if let Some(mint_amount) = minted {
        expected_supply = safe_add(&expected_supply, mint_amount)?;
    }

    // Subtract burned amount
    if let Some(burn_amount) = burned {
        expected_supply = safe_subtract(&expected_supply, burn_amount)?;
    }

    // Check if actual matches expected
    if &expected_supply != supply_after {
        return Err(IcpxError::Validation(ValidationError::DataInconsistency {
            reason: format!(
                "Supply mismatch: expected {}, got {}",
                expected_supply, supply_after
            ),
        }));
    }

    Ok(())
}

/// Get supply change rate over time period
pub fn get_supply_change_rate(period_seconds: u64) -> Result<f64> {
    unsafe {
        if SUPPLY_HISTORY.len() < 2 {
            return Ok(0.0); // No change data available
        }

        let now = time();
        let cutoff = now.saturating_sub(period_seconds * NANOSECONDS_PER_SECOND);

        // Find snapshots within period
        let relevant: Vec<_> = SUPPLY_HISTORY
            .iter()
            .filter(|s| s.timestamp >= cutoff)
            .collect();

        if relevant.len() < 2 {
            return Ok(0.0); // Not enough data in period
        }

        // Calculate change rate
        let first = nat_to_u128(&relevant[0].supply)?;
        let last = nat_to_u128(&relevant[relevant.len() - 1].supply)?;
        let time_diff = (relevant[relevant.len() - 1].timestamp - relevant[0].timestamp) as f64
            / NANOSECONDS_PER_SECOND as f64;

        if time_diff > 0.0 {
            Ok(((last as f64 - first as f64) / first as f64) / time_diff * 100.0)
        } else {
            Ok(0.0)
        }
    }
}

/// Clear supply history (for testing)
#[cfg(test)]
pub fn clear_supply_history() {
    unsafe {
        SUPPLY_HISTORY.clear();
    }
}