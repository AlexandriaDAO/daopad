use candid::Principal;
use ic_cdk::{query, update};
use crate::types::{
    CreateOrbitStationRequest, CreateTokenStationRequest, OrbitStationResponse,
    OrbitStationInfo, TokenInfo
};
use crate::storage::state::ORBIT_STATIONS;
use crate::types::StorablePrincipal;
use crate::orbit::station::create_orbit_station_internal;
use crate::orbit::management::delete_canister;
use crate::kong_locker::{get_kong_locker_for_user, validate_token_in_lp_positions, get_user_locked_tokens};

#[update]
pub async fn create_token_orbit_station(request: CreateTokenStationRequest) -> Result<OrbitStationResponse, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    let kong_locker_principal = get_kong_locker_for_user(caller)
        .ok_or("Must register Kong Locker canister first")?;

    let existing_station = ORBIT_STATIONS.with(|stations| {
        stations.borrow().get(&StorablePrincipal(caller)).map(|s| s.0.clone())
    });

    if existing_station.is_some() {
        return Err("You already have an Orbit Station. Only one station per Kong Locker is allowed".to_string());
    }

    let token_exists = validate_token_in_lp_positions(kong_locker_principal, request.token_canister_id).await?;

    if !token_exists {
        return Err("Token canister not found in your locked LP positions".to_string());
    }

    create_orbit_station_internal(request.name, caller).await
}

#[update]
pub async fn create_orbit_station(request: CreateOrbitStationRequest) -> Result<OrbitStationResponse, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    create_orbit_station_internal(request.name, caller).await
}

#[update]
pub async fn get_my_locked_tokens() -> Result<Vec<TokenInfo>, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    let kong_locker_principal = get_kong_locker_for_user(caller)
        .ok_or("Must register Kong Locker canister first")?;

    get_user_locked_tokens(kong_locker_principal).await
}

#[query]
pub fn get_my_orbit_station() -> Option<OrbitStationInfo> {
    let caller = ic_cdk::caller();
    ORBIT_STATIONS.with(|stations| {
        stations.borrow().get(&StorablePrincipal(caller)).map(|s| s.0.clone())
    })
}

#[query]
pub fn list_all_orbit_stations() -> Vec<OrbitStationInfo> {
    ORBIT_STATIONS.with(|stations| {
        stations.borrow().iter()
            .map(|(_, station)| station.0.clone())
            .collect()
    })
}

#[update]
pub async fn delete_orbit_station() -> Result<String, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    let station_info = ORBIT_STATIONS.with(|stations| {
        stations.borrow().get(&StorablePrincipal(caller)).map(|s| s.0.clone())
    }).ok_or("No Orbit station found for your principal")?;

    delete_canister(station_info.station_id).await
        .map_err(|e| format!("Failed to delete station canister: {:?}", e))?;

    delete_canister(station_info.upgrader_id).await
        .map_err(|e| format!("Failed to delete upgrader canister: {:?}", e))?;

    ORBIT_STATIONS.with(|stations| {
        stations.borrow_mut().remove(&StorablePrincipal(caller));
    });

    Ok("Orbit station deleted successfully".to_string())
}