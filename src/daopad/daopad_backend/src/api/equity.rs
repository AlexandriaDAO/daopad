use candid::Principal;
use ic_cdk::update;

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
