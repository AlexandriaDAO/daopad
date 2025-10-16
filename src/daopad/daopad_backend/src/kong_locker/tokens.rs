use crate::types::{TokenInfo, UserBalancesReply};
use candid::Principal;
use ic_cdk::call;
use std::collections::HashSet;

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
        // Safe pattern match - only process LP variants, skip others
        if let UserBalancesReply::LP(lp_reply) = balance {
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
        // Safe pattern match - only check LP variants
        if let UserBalancesReply::LP(lp_reply) = balance {
            lp_reply.address_0 == token_canister_id.to_string()
                || lp_reply.address_1 == token_canister_id.to_string()
        } else {
            false
        }
    });

    Ok(token_exists)
}
