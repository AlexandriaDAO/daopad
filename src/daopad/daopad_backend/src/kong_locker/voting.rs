use crate::kong_locker::registration::get_kong_locker_for_user;
use crate::types::UserBalancesReply;
use crate::utils::is_test_mode;
use candid::Principal;
use ic_cdk::call;

// Note: Minimum VP checks are now handled directly in the proposal system

pub async fn get_user_voting_power_for_token(
    caller: Principal,
    token_canister_id: Principal,
) -> Result<u64, String> {
    // Check test mode first for development
    if is_test_mode() {
        return Ok(get_test_voting_power(caller));
    }

    let kong_locker_principal =
        get_kong_locker_for_user(caller).ok_or("Must register Kong Locker canister first")?;

    calculate_voting_power_for_token(kong_locker_principal, token_canister_id).await
}

// Provide test voting power for development and testing
fn get_test_voting_power(user: Principal) -> u64 {
    let user_str = user.to_string();

    // Give different test users different VP for testing various scenarios
    if user_str.contains("daopad") {
        1_000_000  // 1M VP for daopad identity
    } else if user_str.contains("test") {
        500_000    // 500k VP for test users
    } else if user_str.contains("admin") {
        750_000    // 750k VP for admin users
    } else {
        100_000    // 100k VP for everyone else in test mode
    }
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
