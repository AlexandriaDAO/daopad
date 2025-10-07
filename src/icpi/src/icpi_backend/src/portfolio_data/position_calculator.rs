use crate::types::portfolio::CurrentPosition;
use crate::types::tokens::TrackedToken;
use crate::market_data::token_amount_to_usd;
use candid::Nat;
use rust_decimal::Decimal;
use std::str::FromStr;

/// Calculate current positions from token balances
pub async fn calculate_current_positions(
    balances: Vec<(TrackedToken, Nat)>
) -> Result<Vec<CurrentPosition>, String> {
    let mut positions = Vec::new();
    let mut total_value = Decimal::ZERO;

    // First pass: calculate USD values
    for (token, balance) in &balances {
        // Skip ckUSDT from portfolio positions (it's reserve)
        if *token == TrackedToken::ckUSDT {
            continue;
        }

        let usd_value = token_amount_to_usd(balance, token).await?;
        total_value += usd_value;

        positions.push(CurrentPosition {
            token: token.clone(),
            balance: balance.clone(),
            usd_value: usd_value.to_f64().unwrap_or(0.0),
            percentage: 0.0, // Will calculate in second pass
        });
    }

    // Second pass: calculate percentages
    if total_value > Decimal::ZERO {
        for position in &mut positions {
            let position_value = Decimal::from_str(&position.usd_value.to_string())
                .unwrap_or(Decimal::ZERO);
            let percentage = (position_value / total_value) * Decimal::from(100);
            position.percentage = percentage.to_f64().unwrap_or(0.0);
        }
    }

    // Sort by value descending
    positions.sort_by(|a, b| b.usd_value.partial_cmp(&a.usd_value).unwrap());

    Ok(positions)
}

/// Calculate portfolio value from positions
pub fn calculate_portfolio_value(positions: &[CurrentPosition]) -> f64 {
    positions.iter().map(|p| p.usd_value).sum()
}

/// Get reserve (ckUSDT) balance from full balance list
pub fn get_reserve_balance(
    balances: &[(TrackedToken, Nat)]
) -> Nat {
    balances.iter()
        .find(|(token, _)| *token == TrackedToken::ckUSDT)
        .map(|(_, balance)| balance.clone())
        .unwrap_or(Nat::from(0u64))
}