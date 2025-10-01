use candid::Nat;
use num_bigint::BigUint;

// Precision factor for intermediate calculations (10^12)
pub const PRECISION_FACTOR: u128 = 1_000_000_000_000;

// Safe multiplication and division with Nat to prevent overflow
pub fn multiply_and_divide(a: &Nat, b: &Nat, c: &Nat) -> Result<Nat, String> {
    if c == &Nat::from(0u32) {
        return Err("Division by zero".to_string());
    }

    // Convert to BigUint for safe arithmetic
    let a_big = nat_to_biguint(a);
    let b_big = nat_to_biguint(b);
    let c_big = nat_to_biguint(c);

    // Perform (a * b) / c with arbitrary precision
    let result = (&a_big * &b_big) / &c_big;

    Ok(biguint_to_nat(&result))
}

// Calculate proportional amount: (amount * numerator) / denominator
pub fn calculate_proportional_amount(
    amount: &Nat,
    numerator: &Nat,
    denominator: &Nat,
) -> Result<Nat, String> {
    // Using intermediate precision to avoid overflow
    let precision = Nat::from(PRECISION_FACTOR);
    let ratio = multiply_and_divide(numerator, &precision, denominator)?;
    multiply_and_divide(amount, &ratio, &precision)
}

// Convert between token decimals (e.g., ckUSDT e6 to ICPI e8)
pub fn convert_decimals(amount: &Nat, from_decimals: u8, to_decimals: u8) -> Nat {
    if from_decimals == to_decimals {
        return amount.clone();
    }

    let amount_big = nat_to_biguint(amount);

    if from_decimals < to_decimals {
        let factor = 10_u128.pow((to_decimals - from_decimals) as u32);
        biguint_to_nat(&(amount_big * factor))
    } else {
        let factor = 10_u128.pow((from_decimals - to_decimals) as u32);
        biguint_to_nat(&(amount_big / factor))
    }
}

// Helper: Convert Nat to BigUint
fn nat_to_biguint(n: &Nat) -> BigUint {
    BigUint::from_bytes_be(&n.0.to_bytes_be())
}

// Helper: Convert BigUint to Nat
fn biguint_to_nat(b: &BigUint) -> Nat {
    Nat::from(b.clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_multiply_and_divide() {
        let a = Nat::from(100u32);
        let b = Nat::from(50u32);
        let c = Nat::from(10u32);

        let result = multiply_and_divide(&a, &b, &c).unwrap();
        assert_eq!(result, Nat::from(500u32));
    }

    #[test]
    fn test_division_by_zero() {
        let a = Nat::from(100u32);
        let b = Nat::from(50u32);
        let c = Nat::from(0u32);

        let result = multiply_and_divide(&a, &b, &c);
        assert!(result.is_err());
    }

    #[test]
    fn test_convert_decimals_up() {
        // Convert 1 ckUSDT (e6) to ICPI (e8)
        let amount = Nat::from(1_000_000u32); // 1 USDT in e6
        let result = convert_decimals(&amount, 6, 8);
        assert_eq!(result, Nat::from(100_000_000u32)); // 1 ICPI in e8
    }

    #[test]
    fn test_convert_decimals_down() {
        // Convert 1 ICPI (e8) to ckUSDT (e6)
        let amount = Nat::from(100_000_000u32); // 1 ICPI in e8
        let result = convert_decimals(&amount, 8, 6);
        assert_eq!(result, Nat::from(1_000_000u32)); // 1 USDT in e6
    }

    #[test]
    fn test_proportional_amount() {
        // Calculate 10% of 1000
        let amount = Nat::from(1000u32);
        let numerator = Nat::from(10u32);
        let denominator = Nat::from(100u32);

        let result = calculate_proportional_amount(&amount, &numerator, &denominator).unwrap();
        assert_eq!(result, Nat::from(100u32));
    }
}