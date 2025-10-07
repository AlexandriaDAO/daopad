//! Parallel balance query aggregator
//! Security: CRITICAL - Used in financial calculations
//! Testing: Concurrent query tests

use candid::Nat;
use futures::future::join_all;
use std::collections::HashMap;

use crate::critical_data::token_queries;
use crate::infrastructure::constants::*;
use crate::infrastructure::types::*;
use crate::infrastructure::error_types::{IcpxError, Result, ValidationError};

/// Aggregate all token balances in parallel
pub async fn get_all_token_balances() -> Result<HashMap<Token, Nat>> {
    let mut balance_futures: Vec<_> = Vec::new();

    // Query all tokens including ckUSDT
    for token in Token::all_including_ckusdt() {
        balance_futures.push(async move {
            let balance = token_queries::get_token_balance(token).await?;
            Ok((token, balance))
        });
    }

    // Execute all queries in parallel
    let results: Vec<Result<(Token, Nat)>> = join_all(balance_futures).await;

    // Collect results
    let mut balances = HashMap::new();
    for result in results {
        let (token, balance) = result?;
        balances.insert(token, balance);
    }

    Ok(balances)
}

/// Get balances for tracked tokens only (excluding ckUSDT)
pub async fn get_tracked_token_balances() -> Result<HashMap<Token, Nat>> {
    let mut balance_futures: Vec<_> = Vec::new();

    for token in Token::all_tracked() {
        balance_futures.push(async move {
            let balance = token_queries::get_token_balance(token).await?;
            Ok((token, balance))
        });
    }

    let results: Vec<Result<(Token, Nat)>> = join_all(balance_futures).await;

    let mut balances = HashMap::new();
    for result in results {
        let (token, balance) = result?;
        balances.insert(token, balance);
    }

    Ok(balances)
}

/// Get balances in batches to avoid overwhelming canisters
pub async fn get_balances_batched(
    tokens: Vec<Token>,
    batch_size: usize,
) -> Result<HashMap<Token, Nat>> {
    let mut all_balances = HashMap::new();

    for batch in tokens.chunks(batch_size) {
        let mut batch_futures: Vec<_> = Vec::new();

        for &token in batch {
            batch_futures.push(async move {
                let balance = token_queries::get_token_balance(token).await?;
                Ok((token, balance))
            });
        }

        let batch_results: Vec<Result<(Token, Nat)>> = join_all(batch_futures).await;

        for result in batch_results {
            let (token, balance) = result?;
            all_balances.insert(token, balance);
        }
    }

    Ok(all_balances)
}

/// Get non-zero balances only
pub async fn get_non_zero_balances() -> Result<HashMap<Token, Nat>> {
    let all_balances = get_all_token_balances().await?;

    let non_zero: HashMap<Token, Nat> = all_balances
        .into_iter()
        .filter(|(_, balance)| balance > &Nat::from(0u64))
        .collect();

    Ok(non_zero)
}

/// Validate that all expected tokens have been queried
pub fn validate_balance_completeness(
    balances: &HashMap<Token, Nat>,
    expected_tokens: &[Token],
) -> Result<()> {
    for token in expected_tokens {
        if !balances.contains_key(token) {
            return Err(IcpxError::Validation(
                crate::infrastructure::error_types::ValidationError::DataInconsistency {
                    reason: format!("Missing balance for token {:?}", token),
                }
            ));
        }
    }
    Ok(())
}