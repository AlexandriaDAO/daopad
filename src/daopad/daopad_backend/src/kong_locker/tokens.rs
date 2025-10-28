use crate::types::{TokenInfo, UserBalancesReply};
use crate::storage::state::KONG_LOCKER_PRINCIPALS;
use crate::types::StorablePrincipal;
use candid::Principal;
use ic_cdk::call;
use std::collections::HashSet;

/// Get ALL unique tokens that have locked liquidity across ALL lock canisters
/// This is used for the public dashboard to show all DAOs
pub async fn get_all_locked_tokens() -> Result<Vec<TokenInfo>, String> {
    // Get all lock canister principals
    let lock_canisters: Vec<Principal> = KONG_LOCKER_PRINCIPALS.with(|p| {
        p.borrow()
            .iter()
            .map(|(_, canister)| canister.0)
            .collect()
    });

    if lock_canisters.is_empty() {
        return Ok(Vec::new());
    }

    let mut all_tokens = HashSet::new();

    // Query each lock canister for its tokens
    // Note: This is expensive - in production we'd cache this
    for lock_canister in lock_canisters.iter() {
        match get_user_locked_tokens(*lock_canister).await {
            Ok(tokens) => {
                for token in tokens {
                    all_tokens.insert(token);
                }
            }
            Err(e) => {
                // Log error but continue with other canisters
                ic_cdk::println!("Failed to get tokens for {}: {}", lock_canister, e);
            }
        }
    }

    Ok(all_tokens.into_iter().collect())
}

pub async fn get_user_locked_tokens(
    kong_locker_principal: Principal,
) -> Result<Vec<TokenInfo>, String> {
    let kongswap_id = Principal::from_text("2ipq2-uqaaa-aaaar-qailq-cai")
        .map_err(|e| format!("Invalid KongSwap ID: {}", e))?;

    let user_balances_result: Result<
        (Result<Vec<UserBalancesReply>, String>,),
        (ic_cdk::api::call::RejectionCode, String),
    > = call(
        kongswap_id,
        "user_balances",
        (kong_locker_principal.to_string(),),
    )
    .await;

    let user_balances = user_balances_result
        .map_err(|e| format!("Failed to get LP positions: {:?}", e))?
        .0
        .map_err(|e| format!("KongSwap returned error: {}", e))?;

    let mut tokens = HashSet::new();
    for balance in user_balances.iter() {
        // Pattern match - UserBalancesReply is always LP variant
        let UserBalancesReply::LP(lp_reply) = balance;
        if !lp_reply.address_0.is_empty() {
            tokens.insert(TokenInfo {
                canister_id: lp_reply.address_0.clone(),
                symbol: lp_reply.symbol_0.clone(),
                chain: lp_reply.chain_0.clone(),
            });
        }
        if !lp_reply.address_1.is_empty() {
            tokens.insert(TokenInfo {
                canister_id: lp_reply.address_1.clone(),
                symbol: lp_reply.symbol_1.clone(),
                chain: lp_reply.chain_1.clone(),
            });
        }
    }

    Ok(tokens.into_iter().collect())
}

#[allow(dead_code)]
pub async fn validate_token_in_lp_positions(
    kong_locker_principal: Principal,
    token_canister_id: Principal,
) -> Result<bool, String> {
    let kongswap_id = Principal::from_text("2ipq2-uqaaa-aaaar-qailq-cai")
        .map_err(|e| format!("Invalid KongSwap ID: {}", e))?;

    let user_balances_result: Result<
        (Result<Vec<UserBalancesReply>, String>,),
        (ic_cdk::api::call::RejectionCode, String),
    > = call(
        kongswap_id,
        "user_balances",
        (kong_locker_principal.to_string(),),
    )
    .await;

    let user_balances = user_balances_result
        .map_err(|e| format!("Failed to get LP positions: {:?}", e))?
        .0
        .map_err(|e| format!("KongSwap returned error: {}", e))?;

    let token_exists = user_balances.iter().any(|balance| {
        // Pattern match - UserBalancesReply is always LP variant
        let UserBalancesReply::LP(lp_reply) = balance;
        lp_reply.address_0 == token_canister_id.to_string()
            || lp_reply.address_1 == token_canister_id.to_string()
    });

    Ok(token_exists)
}
