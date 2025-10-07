//! Data validation at trust boundaries
//! Security: CRITICAL - Prevents manipulation attacks

use candid::Nat;
use rust_decimal::Decimal;

use crate::infrastructure::error_types::{Result, IcpxError, ValidationError};
use crate::infrastructure::types::*;
use crate::infrastructure::constants::*;
use crate::infrastructure::math_utils::*;

/// Validate external supply data
pub fn validate_external_supply(
    new_supply: &Nat,
    cached_supply: Option<&Nat>,
) -> Result<Nat> {
    // Check absolute bounds
    let supply_u128 = nat_to_u128(new_supply)?;

    if supply_u128 > MAX_POSSIBLE_SUPPLY {
        return Err(IcpxError::Validation(ValidationError::SupplyOutOfBounds {
            supply: new_supply.to_string(),
            max: MAX_POSSIBLE_SUPPLY.to_string(),
        }));
    }

    // Check relative change if we have cache
    if let Some(cached) = cached_supply {
        if cached > &Nat::from(0u64) {
            let cached_u128 = nat_to_u128(cached)?;
            let ratio = if supply_u128 > cached_u128 {
                supply_u128 as f64 / cached_u128 as f64
            } else {
                cached_u128 as f64 / supply_u128 as f64
            };

            if ratio > MAX_SUPPLY_CHANGE_RATIO {
                return Err(IcpxError::Validation(ValidationError::RapidChangeDetected {
                    field: "supply".into(),
                    change_ratio: format!("{:.2}", ratio),
                }));
            }
        }
    }

    Ok(new_supply.clone())
}

/// Validate token price is within reasonable bounds
pub fn validate_token_price(
    token: Token,
    price: Decimal,
    cached_price: Option<Decimal>,
) -> Result<Decimal> {
    use rust_decimal::prelude::ToPrimitive;

    // Absolute bounds check
    let price_f64 = price.to_f64().unwrap_or(0.0);

    if price_f64 < MIN_REASONABLE_PRICE_USD || price_f64 > MAX_REASONABLE_PRICE_USD {
        return Err(IcpxError::Validation(ValidationError::PriceOutOfBounds {
            price: price.to_string(),
            min: MIN_REASONABLE_PRICE_USD.to_string(),
            max: MAX_REASONABLE_PRICE_USD.to_string(),
        }));
    }

    // Relative change check
    if let Some(cached) = cached_price {
        let ratio = if price > cached {
            price / cached
        } else {
            cached / price
        };

        if ratio > Decimal::from_f64_retain(MAX_PRICE_CHANGE_RATIO).unwrap_or(Decimal::from(2)) {
            ic_cdk::println!(
                "Warning: Large price change for {:?}: ratio {}",
                token,
                ratio
            );
        }
    }

    Ok(price)
}

/// Validate portfolio value is reasonable
pub fn validate_portfolio_value(value: &Nat) -> Result<()> {
    let value_u128 = nat_to_u128(value)?;

    if value_u128 == 0 {
        ic_cdk::println!("Warning: Portfolio value is zero");
    }

    if value_u128 > MAX_REASONABLE_PORTFOLIO_VALUE_USD {
        return Err(IcpxError::Validation(ValidationError::DataInconsistency {
            reason: format!(
                "Portfolio value {} exceeds reasonable maximum {}",
                value_u128, MAX_REASONABLE_PORTFOLIO_VALUE_USD
            ),
        }));
    }

    Ok(())
}

/// Validate mint snapshot data
pub fn validate_mint_snapshot(snapshot: &MintSnapshot) -> Result<()> {
    // Supply and TVL relationship checks
    let supply_u128 = nat_to_u128(&snapshot.supply)?;
    let tvl_u128 = nat_to_u128(&snapshot.tvl)?;

    if supply_u128 > 0 && tvl_u128 == 0 {
        return Err(IcpxError::Validation(ValidationError::InvalidSnapshot {
            reason: "Invalid state: supply exists but no value".into(),
        }));
    }

    if supply_u128 == 0 && tvl_u128 > 0 {
        return Err(IcpxError::Validation(ValidationError::InvalidSnapshot {
            reason: "Invalid state: value exists but no supply".into(),
        }));
    }

    Ok(())
}