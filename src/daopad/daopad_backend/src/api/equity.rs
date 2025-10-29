use candid::{CandidType, Deserialize, Principal};
use ic_cdk::update;

// Mirror the types from admin canister for voting power
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum VotingPowerSource {
    Equity,
    KongLocker,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct VotingPowerResult {
    pub voting_power: u64,
    pub source: VotingPowerSource,
}

#[update]
pub async fn create_equity_station(station_id: Principal) -> Result<(), String> {
    let caller = ic_cdk::caller();
    let admin_canister = Principal::from_text("odkrm-viaaa-aaaap-qp2oq-cai")
        .map_err(|e| format!("Invalid admin principal: {}", e))?;

    // Admin will verify caller == Backend canister
    let result: Result<(Result<(), String>,), _> = ic_cdk::call(
        admin_canister,
        "initialize_equity_station",
        (station_id, caller)
    ).await;

    match result {
        Ok((Ok(()),)) => Ok(()),
        Ok((Err(e),)) => Err(e),
        Err((code, msg)) => Err(format!("Cross-canister call failed: {:?} - {}", code, msg))
    }
}

/// Unified voting power query that routes by station type
/// Wrapper around admin canister's get_voting_power_display
#[update]
pub async fn get_voting_power_display(
    station_id: Principal,
    user: Principal,
) -> Result<VotingPowerResult, String> {
    let admin_canister = Principal::from_text("odkrm-viaaa-aaaap-qp2oq-cai")
        .map_err(|e| format!("Invalid admin principal: {}", e))?;

    // Call admin canister
    let result: Result<(Result<VotingPowerResult, String>,), _> = ic_cdk::call(
        admin_canister,
        "get_voting_power_display",
        (station_id, user)
    ).await;

    match result {
        Ok((Ok(vp_result),)) => Ok(vp_result),
        Ok((Err(e),)) => Err(e),
        Err((code, msg)) => Err(format!("Cross-canister call failed: {:?} - {}", code, msg))
    }
}
