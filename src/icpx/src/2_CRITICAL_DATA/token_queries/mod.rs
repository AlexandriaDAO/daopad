//! Token balance and price queries
//! Security: CRITICAL - Used in financial calculations

use candid::{Nat, Principal};
use rust_decimal::Decimal;
use rust_decimal::prelude::FromStr;
use ic_cdk::call;

use crate::infrastructure::error_types::Result;
use crate::infrastructure::types::*;

/// Get token balance for backend canister
pub async fn get_token_balance(token: Token) -> Result<Nat> {
    let canister_id = token.canister_id();
    let backend_principal = ic_cdk::id();

    // ICRC-1 standard balance query
    let result: std::result::Result<(Nat,), _> = call(
        canister_id,
        "icrc1_balance_of",
        (backend_principal,),
    ).await;

    match result {
        Ok((balance,)) => Ok(balance),
        Err((code, msg)) => {
            Err(crate::infrastructure::error_types::IcpxError::Query(
                crate::infrastructure::error_types::QueryError::CanisterUnreachable {
                    canister: format!("{:?}: {} - {}", token, code as u8, msg),
                }
            ))
        }
    }
}

/// Get validated token price from DEX
pub async fn get_validated_price(token: Token) -> Result<Decimal> {
    // For ckUSDT, price is always 1.0 USD
    if token == Token::CkUSDT {
        return Ok(Decimal::from(1));
    }

    // In production, this would query Kongswap or other DEX
    // For now, return placeholder prices
    let price = match token {
        Token::ALEX => Decimal::from_str("5.50").unwrap(),
        Token::ZERO => Decimal::from_str("3.25").unwrap(),
        Token::KONG => Decimal::from_str("0.85").unwrap(),
        Token::BOB => Decimal::from_str("12.00").unwrap(),
        Token::CkUSDT => Decimal::from(1),
    };

    // Validate price bounds
    crate::critical_data::validation::validate_token_price(token, price, None)?;

    Ok(price)
}

/// Get current ckUSDT balance
pub async fn get_ckusdt_balance() -> Result<Nat> {
    get_token_balance(Token::CkUSDT).await
}

/// Get all token positions
pub async fn get_current_positions() -> Result<Vec<Position>> {
    let mut positions = Vec::new();

    for token in Token::all_including_ckusdt() {
        let balance = get_token_balance(token).await?;
        let price = get_validated_price(token).await?;

        let value_usd = crate::infrastructure::math_utils::calculate_token_value(
            &balance,
            price,
            token.decimals(),
        )?;

        positions.push(Position {
            token,
            balance,
            value_usd: value_usd.to_string().parse().unwrap_or(0.0),
            price_usd: price.to_string().parse().unwrap_or(0.0),
        });
    }

    Ok(positions)
}