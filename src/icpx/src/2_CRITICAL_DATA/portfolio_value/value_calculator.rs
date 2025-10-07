//! Portfolio value calculator for mint ratio (NO CACHE)
//! Security: CRITICAL - Directly affects token issuance
//! Testing: Property tests + concurrent query tests

use candid::Nat;
use futures::future::join_all;
use ic_cdk::api::time;
use rust_decimal::Decimal;
use std::collections::HashMap;

use crate::critical_data::token_queries;
use crate::critical_data::validation::validate_portfolio_value;
use crate::infrastructure::constants::*;
use crate::infrastructure::math_utils::*;
use crate::infrastructure::types::*;
use crate::infrastructure::error_types::{IcpxError, QueryError, Result};

/// Calculate portfolio value atomically for mint operations
/// CRITICAL: This value determines mint ratios
/// Must be calculated BEFORE collecting deposits
/// NEVER cache values used in minting
pub async fn calculate_portfolio_value_atomic() -> Result<Nat> {
    // Build parallel queries for all tokens
    let mut query_futures = Vec::new();

    // ckUSDT balance (already in USD units)
    query_futures.push(get_token_value(Token::CkUSDT));

    // All tracked tokens
    for token in Token::all_tracked() {
        query_futures.push(get_token_value(token));
    }

    // Execute all queries in parallel for speed and consistency
    let results = join_all(query_futures).await;

    // Calculate total value
    let mut total_value_usd = Decimal::ZERO;

    for result in results {
        match result {
            Ok(value_usd) => {
                total_value_usd += value_usd;
            }
            Err(e) => {
                // CRITICAL: Never guess or use defaults
                return Err(IcpxError::Query(QueryError::InvalidResponse {
                    reason: format!("Failed to query token value: {:?}", e),
                }));
            }
        }
    }

    // Convert to ckUSDT units (e6)
    let total_value_ckusdt = usd_to_ckusdt_units(total_value_usd)?;

    // Sanity validation
    validate_portfolio_value(&total_value_ckusdt)?;

    Ok(total_value_ckusdt)
}

/// Calculate portfolio value with detailed breakdown
/// Used for display, can be cached
pub async fn calculate_portfolio_value_breakdown() -> Result<PortfolioBreakdown> {
    let mut token_values = HashMap::new();
    let mut total_value_ckusdt = Nat::from(0u64);

    // Query all tokens including ckUSDT
    for token in Token::all_including_ckusdt() {
        let (balance, price_usd) = get_token_balance_and_price(token).await?;

        let value_usd = calculate_token_value(&balance, price_usd, token.decimals() as u32)?;
        let value_ckusdt = usd_to_ckusdt_units(value_usd)?;

        token_values.insert(
            token,
            TokenValue {
                balance: balance.clone(),
                price_usd: price_usd.to_string().parse().unwrap_or(0.0),
                value_ckusdt: value_ckusdt.clone(),
            },
        );

        total_value_ckusdt = safe_add(&total_value_ckusdt, &value_ckusdt)?;
    }

    Ok(PortfolioBreakdown {
        total_value_ckusdt,
        token_values,
        timestamp: time(),
    })
}

/// Get value of a single token in USD
async fn get_token_value(token: Token) -> Result<Decimal> {
    if token == Token::CkUSDT {
        // ckUSDT is pegged 1:1 with USD
        let balance = token_queries::get_token_balance(token).await?;
        ckusdt_units_to_usd(&balance)
    } else {
        let (balance, price) = get_token_balance_and_price(token).await?;
        calculate_token_value(&balance, price, token.decimals() as u32)
    }
}

/// Get both balance and price for a token
async fn get_token_balance_and_price(token: Token) -> Result<(Nat, Decimal)> {
    // Execute balance and price queries in parallel
    let balance_future = token_queries::get_token_balance(token);
    let price_future = token_queries::get_validated_price(token);

    let (balance_result, price_result) = futures::join!(balance_future, price_future);

    let balance = balance_result?;
    let price = price_result?;

    Ok((balance, price))
}

/// Calculate holdings value by token for rebalancing
pub async fn calculate_holdings_by_token() -> Result<HashMap<Token, Decimal>> {
    let mut holdings = HashMap::new();

    for token in Token::all_tracked() {
        let value_usd = get_token_value(token).await?;
        holdings.insert(token, value_usd);
    }

    // Include ckUSDT
    let ckusdt_value = get_token_value(Token::CkUSDT).await?;
    holdings.insert(Token::CkUSDT, ckusdt_value);

    Ok(holdings)
}

/// Get total portfolio value in USD (for display)
pub async fn get_total_value_usd() -> Result<Decimal> {
    let ckusdt_value = calculate_portfolio_value_atomic().await?;
    ckusdt_units_to_usd(&ckusdt_value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_portfolio_value_calculation() {
        // This would need mocking of token_queries in a real implementation
        // For now, just testing the math functions

        let balance = Nat::from(1_000_000_000u64); // 10 tokens with 8 decimals
        let price = Decimal::from_str("5.50").unwrap();
        let value = calculate_token_value(&balance, price, 8).unwrap();

        assert_eq!(value, Decimal::from_str("55.0").unwrap());
    }

    #[test]
    fn test_usd_ckusdt_conversion() {
        let usd = Decimal::from_str("100.50").unwrap();
        let ckusdt = usd_to_ckusdt_units(usd).unwrap();
        assert_eq!(ckusdt, Nat::from(100_500_000u64));

        let usd_back = ckusdt_units_to_usd(&ckusdt).unwrap();
        assert_eq!(usd_back, usd);
    }
}