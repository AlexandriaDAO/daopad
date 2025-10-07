//! ICPX supply queries (NO CACHE for critical operations)
//! Security: CRITICAL - Used in mint/burn calculations
//! Testing: Integration tests with ledger canister

use candid::{Nat, Principal};
use ic_cdk::call;

use crate::critical_data::validation::validate_external_supply;
use crate::infrastructure::constants::*;
use crate::infrastructure::types::*;
use crate::infrastructure::error_types::{IcpxError, QueryError, Result, ValidationError};

/// Cached supply for non-critical operations
static mut CACHED_SUPPLY: Option<CachedData<Nat>> = None;

/// Get validated ICPX supply for critical operations
/// NEVER cache this for minting/burning
pub async fn get_validated_supply() -> Result<Nat> {
    let supply = query_icpx_total_supply().await?;

    // Get cached value for validation comparison
    let cached = unsafe { CACHED_SUPPLY.as_ref().map(|c| c.data.clone()) };

    // Validate against cached value if available
    let validated = validate_external_supply(&supply, cached.as_ref())?;

    // Update cache for next validation
    unsafe {
        CACHED_SUPPLY = Some(CachedData::new(validated.clone(), 60)); // 1 minute cache
    }

    Ok(validated)
}

/// Get ICPX supply with caching (for display only)
pub async fn get_supply_cached() -> Result<Nat> {
    unsafe {
        if let Some(cached) = &CACHED_SUPPLY {
            if !cached.is_expired() {
                return Ok(cached.data.clone());
            }
        }
    }

    // Cache miss or expired
    get_validated_supply().await
}

/// Query ICPX total supply from ledger
async fn query_icpx_total_supply() -> Result<Nat> {
    // ICRC-1 standard total supply query
    let result: std::result::Result<(Nat,), _> = call(
        ICPX_CANISTER,
        "icrc1_total_supply",
        (),
    ).await;

    match result {
        Ok((supply,)) => Ok(supply),
        Err((code, msg)) => {
            Err(IcpxError::Query(QueryError::CanisterUnreachable {
                canister: format!("ICPX ledger: {} - {}", code as u8, msg),
            }))
        }
    }
}

/// Get circulating supply (total - backend holdings)
pub async fn get_circulating_supply() -> Result<Nat> {
    let total_supply = get_validated_supply().await?;
    let backend_balance = get_backend_icpx_balance().await?;

    // Circulating = Total - Backend holdings
    if backend_balance > total_supply {
        return Err(IcpxError::Validation(ValidationError::DataInconsistency {
            reason: "Backend balance exceeds total supply".into(),
        }));
    }

    Ok(total_supply - backend_balance)
}

/// Get backend's ICPX balance
async fn get_backend_icpx_balance() -> Result<Nat> {
    let backend_principal = ic_cdk::id();

    // ICRC-1 standard balance query
    let result: std::result::Result<(Nat,), _> = call(
        ICPX_CANISTER,
        "icrc1_balance_of",
        (backend_principal,),
    ).await;

    match result {
        Ok((balance,)) => Ok(balance),
        Err((code, msg)) => {
            Err(IcpxError::Query(QueryError::CanisterUnreachable {
                canister: format!("ICPX balance query: {} - {}", code as u8, msg),
            }))
        }
    }
}

/// Check if supply is within reasonable bounds
pub fn validate_supply_bounds(supply: &Nat) -> Result<()> {
    use crate::infrastructure::math_utils::nat_to_u128;

    let supply_u128 = nat_to_u128(supply)?;

    if supply_u128 > MAX_POSSIBLE_SUPPLY {
        return Err(IcpxError::Validation(ValidationError::SupplyOutOfBounds {
            supply: supply.to_string(),
            max: MAX_POSSIBLE_SUPPLY.to_string(),
        }));
    }

    Ok(())
}

/// Get supply with retry logic for reliability
pub async fn get_supply_with_retry(max_retries: u32) -> Result<Nat> {
    let mut last_error = None;

    for attempt in 0..max_retries {
        match get_validated_supply().await {
            Ok(supply) => return Ok(supply),
            Err(e) => {
                last_error = Some(e);
                // In production, would add delay between retries
            }
        }
    }

    Err(last_error.unwrap_or_else(|| {
        IcpxError::Query(QueryError::Timeout)
    }))
}