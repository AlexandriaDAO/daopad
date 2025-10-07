use crate::infrastructure::cache::{get_cached, CachePolicy};
use crate::types::tokens::TrackedToken;
use crate::types::kongswap::{SwapAmountsResult, SwapAmountsReply};
use candid::{Nat, Principal};
use rust_decimal::Decimal;
use std::str::FromStr;

const KONGSWAP_BACKEND: &str = "2ipq2-uqaaa-aaaar-qailq-cai";

/// Price data structure
#[derive(Clone, Debug)]
pub struct PriceData {
    pub token: TrackedToken,
    pub price_usd: Decimal,
    pub timestamp: u64,
}

/// Get token price in USD with caching
/// Uses 30-second cache for market data
pub async fn get_token_price_cached(token: &TrackedToken) -> Result<Decimal, String> {
    let cache_key = format!("price_{}", token.to_symbol());

    get_cached(
        &cache_key,
        CachePolicy::Short,
        || get_token_price_uncached(token)
    )
}

/// Get token price without caching (for critical operations)
pub async fn get_token_price_uncached(token: &TrackedToken) -> Result<Decimal, String> {
    // Skip price query for ckUSDT as it's always $1
    if *token == TrackedToken::ckUSDT {
        return Ok(Decimal::ONE);
    }

    // Query Kongswap for price in terms of ckUSDT
    let kongswap = Principal::from_text(KONGSWAP_BACKEND)
        .map_err(|e| format!("Invalid Kongswap principal: {}", e))?;

    // We'll quote 1 token worth of the smallest unit
    let decimals = token.get_decimals();
    let one_token = 10u128.pow(decimals as u32);

    let args = (
        token.to_symbol().to_string(),
        Nat::from(one_token),
        "ckUSDT".to_string(),
    );

    let result: (SwapAmountsResult,) = ic_cdk::call(
        kongswap,
        "swap_amounts",
        args,
    ).await
        .map_err(|e| format!("Failed to query Kongswap price: {:?}", e))?;

    match result.0 {
        SwapAmountsResult::Ok(reply) => {
            // Convert the ckUSDT amount to decimal price
            let usdt_amount = parse_nat_to_decimal(&reply.receive_amount, 6)?; // ckUSDT has 6 decimals
            Ok(usdt_amount)
        }
        SwapAmountsResult::Err(e) => Err(format!("Kongswap price query failed: {}", e))
    }
}

/// Get all token prices in batch
pub async fn get_all_token_prices() -> Result<Vec<PriceData>, String> {
    let mut prices = Vec::new();
    let timestamp = ic_cdk::api::time();

    for token in TrackedToken::all() {
        match get_token_price_cached(token).await {
            Ok(price_usd) => {
                prices.push(PriceData {
                    token: token.clone(),
                    price_usd,
                    timestamp,
                });
            }
            Err(e) => {
                ic_cdk::println!("Failed to get price for {}: {}", token.to_symbol(), e);
                // Use fallback price of 0 for display purposes
                prices.push(PriceData {
                    token: token.clone(),
                    price_usd: Decimal::ZERO,
                    timestamp,
                });
            }
        }
    }

    Ok(prices)
}

/// Convert USD amount to token amount
pub async fn usd_to_token_amount(
    usd_amount: Decimal,
    token: &TrackedToken
) -> Result<Nat, String> {
    let price = get_token_price_cached(token).await?;

    if price == Decimal::ZERO {
        return Err("Token price is zero".to_string());
    }

    let token_amount = usd_amount / price;
    let decimals = token.get_decimals();
    let multiplier = Decimal::from_str(&format!("1e{}", decimals))
        .map_err(|e| format!("Failed to create multiplier: {}", e))?;

    let raw_amount = (token_amount * multiplier)
        .round()
        .to_u128()
        .ok_or_else(|| "Amount overflow".to_string())?;

    Ok(Nat::from(raw_amount))
}

/// Convert token amount to USD value
pub async fn token_amount_to_usd(
    amount: &Nat,
    token: &TrackedToken
) -> Result<Decimal, String> {
    let price = get_token_price_cached(token).await?;
    let decimals = token.get_decimals();
    let decimal_amount = parse_nat_to_decimal(amount, decimals)?;

    Ok(decimal_amount * price)
}

/// Helper to parse Nat to Decimal with proper decimal places
fn parse_nat_to_decimal(nat: &Nat, decimals: u8) -> Result<Decimal, String> {
    let amount_str = nat.to_string();
    let divisor = Decimal::from_str(&format!("1e{}", decimals))
        .map_err(|e| format!("Failed to create divisor: {}", e))?;

    let amount = Decimal::from_str(&amount_str)
        .map_err(|e| format!("Failed to parse amount: {}", e))?;

    Ok(amount / divisor)
}