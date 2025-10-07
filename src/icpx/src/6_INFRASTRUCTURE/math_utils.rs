//! Safe arithmetic utilities for ICPX backend
//! Security: CRITICAL - Used in financial calculations

use candid::Nat;
use rust_decimal::prelude::*;
use std::str::FromStr;

use crate::infrastructure::error_types::{IcpxError, Result};

/// Safe multiplication and division: (a * b) / c
/// Prevents overflow by performing multiplication in higher precision
pub fn multiply_and_divide(a: &Nat, b: &Nat, c: &Nat) -> Result<Nat> {
    if c == &Nat::from(0u64) {
        return Err(IcpxError::Other("Division by zero".into()));
    }

    // Convert to u128 for calculation
    let a_u128 = nat_to_u128(a)?;
    let b_u128 = nat_to_u128(b)?;
    let c_u128 = nat_to_u128(c)?;

    // Use checked arithmetic to prevent overflow
    let product = a_u128
        .checked_mul(b_u128)
        .ok_or_else(|| IcpxError::Other("Multiplication overflow".into()))?;

    let result = product
        .checked_div(c_u128)
        .ok_or_else(|| IcpxError::Other("Division error".into()))?;

    Ok(Nat::from(result))
}

/// Convert decimals between different precision levels
/// e.g., from ckUSDT (e6) to ICPX (e8)
pub fn convert_decimals(amount: &Nat, from_decimals: u32, to_decimals: u32) -> Result<Nat> {
    let amount_u128 = nat_to_u128(amount)?;

    let result = if from_decimals < to_decimals {
        // Scale up
        let scale = 10u128
            .checked_pow(to_decimals - from_decimals)
            .ok_or_else(|| IcpxError::Other("Decimal scaling overflow".into()))?;
        amount_u128
            .checked_mul(scale)
            .ok_or_else(|| IcpxError::Other("Decimal conversion overflow".into()))?
    } else if from_decimals > to_decimals {
        // Scale down
        let scale = 10u128
            .checked_pow(from_decimals - to_decimals)
            .ok_or_else(|| IcpxError::Other("Decimal scaling overflow".into()))?;
        amount_u128
            .checked_div(scale)
            .ok_or_else(|| IcpxError::Other("Decimal conversion error".into()))?
    } else {
        // Same decimals
        amount_u128
    };

    Ok(Nat::from(result))
}

/// Calculate percentage of a value
pub fn calculate_percentage(value: &Nat, percentage: Decimal) -> Result<Nat> {
    if percentage < Decimal::ZERO || percentage > Decimal::from(100) {
        return Err(IcpxError::Other(
            "Percentage must be between 0 and 100".into(),
        ));
    }

    let value_decimal = nat_to_decimal(value)?;
    let result = value_decimal * percentage / Decimal::from(100);

    decimal_to_nat(result)
}

/// Add two Nat values with overflow check
pub fn safe_add(a: &Nat, b: &Nat) -> Result<Nat> {
    let a_u128 = nat_to_u128(a)?;
    let b_u128 = nat_to_u128(b)?;

    let result = a_u128
        .checked_add(b_u128)
        .ok_or_else(|| IcpxError::Other("Addition overflow".into()))?;

    Ok(Nat::from(result))
}

/// Subtract two Nat values with underflow check
pub fn safe_subtract(a: &Nat, b: &Nat) -> Result<Nat> {
    let a_u128 = nat_to_u128(a)?;
    let b_u128 = nat_to_u128(b)?;

    if b_u128 > a_u128 {
        return Err(IcpxError::Other(
            "Subtraction would underflow".into(),
        ));
    }

    let result = a_u128 - b_u128;
    Ok(Nat::from(result))
}

/// Calculate the value of tokens in USD
pub fn calculate_token_value(
    balance: &Nat,
    price_usd: Decimal,
    decimals: u32,
) -> Result<Decimal> {
    let balance_decimal = nat_to_decimal_with_decimals(balance, decimals)?;
    Ok(balance_decimal * price_usd)
}

/// Calculate token amount needed for a USD value
pub fn calculate_token_amount_for_usd(
    usd_value: Decimal,
    price_usd: Decimal,
    decimals: u32,
) -> Result<Nat> {
    if price_usd <= Decimal::ZERO {
        return Err(IcpxError::Other("Price must be positive".into()));
    }

    let token_amount = usd_value / price_usd;
    let token_amount_scaled = token_amount * Decimal::from(10u64.pow(decimals));

    decimal_to_nat(token_amount_scaled)
}

/// Calculate deviation percentage between actual and target
pub fn calculate_deviation(actual: Decimal, target: Decimal) -> Decimal {
    if target == Decimal::ZERO {
        return Decimal::ZERO;
    }

    ((actual - target) / target) * Decimal::from(100)
}

/// Normalize allocations to sum to 100%
pub fn normalize_allocations(allocations: &mut Vec<(String, Decimal)>) {
    let total: Decimal = allocations.iter().map(|(_, v)| *v).sum();

    if total > Decimal::ZERO {
        for (_, value) in allocations.iter_mut() {
            *value = (*value / total) * Decimal::from(100);
        }
    }
}

// ===== Conversion Helpers =====

/// Convert Nat to u128 with bounds check
pub fn nat_to_u128(n: &Nat) -> Result<u128> {
    n.0.to_u128()
        .ok_or_else(|| IcpxError::Other("Value too large for u128".into()))
}

/// Convert Nat to Decimal
pub fn nat_to_decimal(n: &Nat) -> Result<Decimal> {
    let u128_val = nat_to_u128(n)?;
    Decimal::from_u128(u128_val)
        .ok_or_else(|| IcpxError::Other("Value too large for Decimal".into()))
}

/// Convert Nat to Decimal with decimal point adjustment
pub fn nat_to_decimal_with_decimals(n: &Nat, decimals: u32) -> Result<Decimal> {
    let decimal_val = nat_to_decimal(n)?;
    let divisor = Decimal::from(10u64.pow(decimals));
    Ok(decimal_val / divisor)
}

/// Convert Decimal to Nat (truncates decimal places)
pub fn decimal_to_nat(d: Decimal) -> Result<Nat> {
    if d < Decimal::ZERO {
        return Err(IcpxError::Other("Cannot convert negative value".into()));
    }

    let truncated = d.trunc();
    let string_val = truncated.to_string();

    // Parse the string to u128
    let u128_val = u128::from_str(&string_val)
        .map_err(|_| IcpxError::Other("Cannot convert decimal to nat".into()))?;

    Ok(Nat::from(u128_val))
}

/// Convert USD value to ckUSDT units (e6)
pub fn usd_to_ckusdt_units(usd: Decimal) -> Result<Nat> {
    let ckusdt_units = usd * Decimal::from(1_000_000u64);
    decimal_to_nat(ckusdt_units)
}

/// Convert ckUSDT units (e6) to USD value
pub fn ckusdt_units_to_usd(units: &Nat) -> Result<Decimal> {
    nat_to_decimal_with_decimals(units, 6)
}

// ===== Validation Helpers =====

/// Check if a value is within reasonable bounds
pub fn validate_amount_bounds(amount: &Nat, min: u64, max: u128) -> Result<()> {
    let amount_u128 = nat_to_u128(amount)?;

    if amount_u128 < min as u128 {
        return Err(IcpxError::Other(
            format!("Amount {} below minimum {}", amount_u128, min),
        ));
    }

    if amount_u128 > max {
        return Err(IcpxError::Other(
            format!("Amount {} above maximum {}", amount_u128, max),
        ));
    }

    Ok(())
}

/// Calculate slippage between expected and actual
pub fn calculate_slippage(expected: &Nat, actual: &Nat) -> Result<Decimal> {
    let expected_dec = nat_to_decimal(expected)?;
    let actual_dec = nat_to_decimal(actual)?;

    if expected_dec == Decimal::ZERO {
        return Ok(Decimal::ZERO);
    }

    let slippage = ((expected_dec - actual_dec).abs() / expected_dec) * Decimal::from(100);
    Ok(slippage)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_multiply_and_divide() {
        let a = Nat::from(100u64);
        let b = Nat::from(50u64);
        let c = Nat::from(25u64);

        let result = multiply_and_divide(&a, &b, &c).unwrap();
        assert_eq!(result, Nat::from(200u64)); // (100 * 50) / 25 = 200
    }

    #[test]
    fn test_convert_decimals() {
        // Convert 1 ckUSDT (e6) to e8
        let amount = Nat::from(1_000_000u64);
        let result = convert_decimals(&amount, 6, 8).unwrap();
        assert_eq!(result, Nat::from(100_000_000u64));

        // Convert 1 ICPX (e8) to e6
        let amount = Nat::from(100_000_000u64);
        let result = convert_decimals(&amount, 8, 6).unwrap();
        assert_eq!(result, Nat::from(1_000_000u64));
    }

    #[test]
    fn test_safe_arithmetic() {
        let a = Nat::from(100u64);
        let b = Nat::from(50u64);

        let sum = safe_add(&a, &b).unwrap();
        assert_eq!(sum, Nat::from(150u64));

        let diff = safe_subtract(&a, &b).unwrap();
        assert_eq!(diff, Nat::from(50u64));

        // Test underflow protection
        assert!(safe_subtract(&b, &a).is_err());
    }

    #[test]
    fn test_deviation_calculation() {
        let actual = Decimal::from(110);
        let target = Decimal::from(100);

        let deviation = calculate_deviation(actual, target);
        assert_eq!(deviation, Decimal::from(10)); // 10% above target
    }
}