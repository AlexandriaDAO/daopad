use candid::{Nat, Principal};
use ic_cdk::api::call::CallResult;
use std::collections::HashMap;
use num_traits::ToPrimitive;

pub const DECIMALS: u8 = 8;
pub const SCALING_FACTOR: u128 = 100_000_000; // 10^8 for 8 decimals
pub const MIN_MINT_INCREMENT: u128 = 1000; // 0.01% in basis points (100% = 10000)

#[derive(Debug, Clone)]
pub struct TokenBalance {
    pub token_id: Principal,
    pub symbol: String,
    pub balance: Nat,
    pub decimals: u8,
}

#[derive(Debug, Clone)]
pub struct ICPIState {
    pub total_supply: Nat,
    pub token_holdings: Vec<TokenBalance>,
    pub total_value_locked_usd: Nat, // In USD with 8 decimals
}

#[derive(Debug)]
pub struct MintResult {
    pub icpi_minted: Nat,
    pub tokens_to_purchase: Vec<(Principal, Nat)>, // Token ID and amount to buy
}

#[derive(Debug)]
pub struct BurnResult {
    pub tokens_to_return: Vec<(Principal, Nat)>, // Token ID and amount to return
}

impl ICPIState {
    pub fn calculate_mint(
        &self,
        usdt_amount: Nat,
    ) -> Result<MintResult, String> {
        // Validate minimum mint increment (0.1% of total value)
        let min_mint_amount = self.total_value_locked_usd.clone() * MIN_MINT_INCREMENT / 1_000_000u128;
        if usdt_amount < min_mint_amount {
            return Err(format!(
                "Mint amount too small. Minimum: {} USDT",
                nat_to_decimal_string(&min_mint_amount, DECIMALS)
            ));
        }

        // Calculate ICPI to mint using precise integer arithmetic
        // Formula: new_icpi = (usdt_amount * current_supply) / current_tvl
        let icpi_to_mint = if self.total_supply == 0u128 {
            // Initial mint: 1 ICPI = 1 USDT
            usdt_amount.clone()
        } else {
            multiply_and_divide(
                &usdt_amount,
                &self.total_supply,
                &self.total_value_locked_usd,
            )?
        };

        // Calculate proportional token amounts to purchase
        let new_tvl = self.total_value_locked_usd.clone() + usdt_amount.clone();
        let mut tokens_to_purchase = Vec::new();

        for token in &self.token_holdings {
            // Calculate this token's target value in the portfolio
            let token_target_value = multiply_and_divide(
                &token.balance,
                &new_tvl,
                &self.total_value_locked_usd,
            )?;

            // The difference is what we need to purchase
            let purchase_amount = token_target_value - token.balance.clone();
            tokens_to_purchase.push((token.token_id, purchase_amount));
        }

        Ok(MintResult {
            icpi_minted: icpi_to_mint,
            tokens_to_purchase,
        })
    }

    pub fn calculate_burn(
        &self,
        icpi_amount: Nat,
    ) -> Result<BurnResult, String> {
        if icpi_amount > self.total_supply {
            return Err("Burn amount exceeds total supply".to_string());
        }

        // Calculate proportional token amounts to return
        let mut tokens_to_return = Vec::new();

        for token in &self.token_holdings {
            // Formula: token_amount = (icpi_amount * token_balance) / total_supply
            let return_amount = multiply_and_divide(
                &icpi_amount,
                &token.balance,
                &self.total_supply,
            )?;
            tokens_to_return.push((token.token_id, return_amount));
        }

        Ok(BurnResult { tokens_to_return })
    }

    pub fn apply_mint(&mut self, mint_result: &MintResult) {
        self.total_supply += mint_result.icpi_minted.clone();

        // Update token holdings after purchases
        for (token_id, amount) in &mint_result.tokens_to_purchase {
            if let Some(token) = self.token_holdings.iter_mut().find(|t| t.token_id == *token_id) {
                token.balance += amount.clone();
            }
        }
    }

    pub fn apply_burn(&mut self, icpi_amount: &Nat, burn_result: &BurnResult) {
        self.total_supply -= icpi_amount.clone();

        // Update token holdings after returns
        for (token_id, amount) in &burn_result.tokens_to_return {
            if let Some(token) = self.token_holdings.iter_mut().find(|t| t.token_id == *token_id) {
                token.balance -= amount.clone();
            }
        }
    }
}

// Precise multiplication and division for Nat values
// Computes: (a * b) / c with minimal precision loss
fn multiply_and_divide(a: &Nat, b: &Nat, c: &Nat) -> Result<Nat, String> {
    if *c == 0u128 {
        return Err("Division by zero".to_string());
    }

    // Use u128 for intermediate calculations if possible
    if let (Some(a_u128), Some(b_u128), Some(c_u128)) =
        (to_u128(a), to_u128(b), to_u128(c)) {

        // Check for overflow in multiplication
        if let Some(product) = a_u128.checked_mul(b_u128) {
            let result = product / c_u128;
            return Ok(Nat::from(result));
        }
    }

    // Fallback to BigInt-style arithmetic for large numbers
    // This would require the num-bigint crate or similar
    // For now, we'll use a scaling approach

    // Scale down if needed to prevent overflow
    let scale = 1_000_000u128;
    let a_scaled = a.clone() / scale;
    let _b_scaled = b.clone() / scale;
    let c_scaled = c.clone() / scale;

    if c_scaled == 0u128 {
        // Try without scaling
        Ok((a.clone() * b.clone()) / c.clone())
    } else {
        // Compute with scaling
        let result = (a_scaled * b.clone()) / c_scaled;
        Ok(result)
    }
}

fn to_u128(nat: &Nat) -> Option<u128> {
    // Convert Nat to u128 if it fits
    // This depends on the actual Nat implementation
    // For candid::Nat, you might need to use to_string() and parse
    nat.0.to_u128()
}

fn nat_to_decimal_string(amount: &Nat, decimals: u8) -> String {
    let amount_str = amount.to_string();
    let len = amount_str.len();
    let decimal_pos = decimals as usize;

    if len <= decimal_pos {
        let zeros = decimal_pos - len;
        format!("0.{}{}", "0".repeat(zeros), amount_str)
    } else {
        let (integer, fraction) = amount_str.split_at(len - decimal_pos);
        format!("{}.{}", integer, fraction)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_mint() {
        let state = ICPIState {
            total_supply: Nat::from(0u128),
            token_holdings: vec![],
            total_value_locked_usd: Nat::from(0u128),
        };

        let usdt_amount = Nat::from(1000 * SCALING_FACTOR); // 1000 USDT
        let result = state.calculate_mint(usdt_amount.clone()).unwrap();

        assert_eq!(result.icpi_minted, usdt_amount);
    }

    #[test]
    fn test_proportional_mint() {
        let state = ICPIState {
            total_supply: Nat::from(100 * SCALING_FACTOR), // 100 ICPI
            token_holdings: vec![
                TokenBalance {
                    token_id: Principal::anonymous(),
                    symbol: "ALEX".to_string(),
                    balance: Nat::from(50 * SCALING_FACTOR),
                    decimals: 8,
                }
            ],
            total_value_locked_usd: Nat::from(1000 * SCALING_FACTOR), // $1000 TVL
        };

        let usdt_amount = Nat::from(100 * SCALING_FACTOR); // 100 USDT (10% of TVL)
        let result = state.calculate_mint(usdt_amount).unwrap();

        // Should mint 10 ICPI (10% of current supply)
        assert_eq!(result.icpi_minted, Nat::from(10 * SCALING_FACTOR));
    }

    #[test]
    fn test_burn_calculation() {
        let alex_principal = Principal::anonymous();
        let state = ICPIState {
            total_supply: Nat::from(100 * SCALING_FACTOR), // 100 ICPI
            token_holdings: vec![
                TokenBalance {
                    token_id: alex_principal,
                    symbol: "ALEX".to_string(),
                    balance: Nat::from(500 * SCALING_FACTOR), // 500 ALEX tokens
                    decimals: 8,
                }
            ],
            total_value_locked_usd: Nat::from(1000 * SCALING_FACTOR),
        };

        let burn_amount = Nat::from(10 * SCALING_FACTOR); // Burn 10 ICPI (10% of supply)
        let result = state.calculate_burn(burn_amount).unwrap();

        // Should return 10% of holdings = 50 ALEX
        assert_eq!(
            result.tokens_to_return[0],
            (alex_principal, Nat::from(50 * SCALING_FACTOR))
        );
    }
}