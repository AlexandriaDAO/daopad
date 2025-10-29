use crate::kong_locker::registration::get_or_lookup_kong_locker;
use crate::types::UserBalancesReply;
use candid::Principal;
use ic_cdk::call;

// Note: Minimum VP checks are now handled directly in the proposal system

pub async fn get_user_voting_power_for_token(
    caller: Principal,
    token_canister_id: Principal,
) -> Result<u64, String> {
    // Auto-lookup user's Kong Locker canister from factory if not cached
    let kong_locker_principal = get_or_lookup_kong_locker(caller).await?;

    calculate_voting_power_for_token(kong_locker_principal, token_canister_id).await
}

pub async fn calculate_voting_power_for_token(
    kong_locker_principal: Principal,
    token_canister_id: Principal,
) -> Result<u64, String> {
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

    // Calculate TOTAL USD value for positions containing this specific token
    // Important: Use the full usd_balance of the LP position (both sides combined)
    let token_id_str = token_canister_id.to_string();
    let total_usd_value: f64 = user_balances
        .iter()
        .filter_map(|balance| {
            let UserBalancesReply::LP(lp_reply) = balance;
            // Count the FULL position value if this token is in the pair
            if lp_reply.address_0 == token_id_str || lp_reply.address_1 == token_id_str {
                // Use total USD balance of the entire LP position
                Some(lp_reply.usd_balance)
            } else {
                None
            }
        })
        .sum();

    // Multiply by 100 to get voting power (preserving 2 decimal places as integer)
    Ok((total_usd_value * 100.0) as u64)
}
