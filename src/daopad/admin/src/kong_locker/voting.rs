use candid::{CandidType, Deserialize, Principal};
use ic_cdk::call;

// UserBalancesReply type (copied from backend for Kong Locker queries)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum UserBalancesReply {
    LP(LPBalanceReply),
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct LPBalanceReply {
    pub address_0: String,
    pub address_1: String,
    pub usd_balance: f64,
}

// Note: Minimum VP checks are now handled directly in the proposal system

/// Query Kong Locker to find user's lock canister, then get voting power
/// No registration needed - queries Kong Locker factory directly
pub async fn get_user_voting_power_for_token(
    caller: Principal,
    token_canister_id: Principal,
) -> Result<u64, String> {
    // Step 1: Query Kong Locker factory to find user's lock canister
    let kong_locker_factory = Principal::from_text("eazgb-giaaa-aaaap-qqc2q-cai")
        .map_err(|e| format!("Invalid Kong Locker factory ID: {}", e))?;

    let all_lock_canisters: Result<(Vec<(Principal, Principal)>,), _> =
        call(kong_locker_factory, "get_all_lock_canisters", ()).await;

    let lock_canisters = all_lock_canisters
        .map_err(|e| format!("Failed to query Kong Locker factory: {:?}", e))?
        .0;

    // Find the user's lock canister
    let kong_locker_principal = lock_canisters
        .iter()
        .find(|(user, _canister)| *user == caller)
        .map(|(_user, canister)| *canister)
        .ok_or("No Kong Locker found for user. Please create one at kong.land")?;

    // Step 2: Query KongSwap with the user's lock canister ID
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

    // Step 3: Calculate voting power for this specific token
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
