use candid::Principal;
use ic_cdk::{query, update};
use crate::types::{
    CreateTokenStationRequest, OrbitStationResponse, TokenInfo
};
use crate::storage::state::TOKEN_ORBIT_STATIONS;
use crate::types::StorablePrincipal;
use crate::orbit::station::create_orbit_station_internal;
use crate::kong_locker::{get_user_locked_tokens, check_minimum_voting_power_for_token, get_kong_locker_for_user};

#[update]
pub async fn create_token_orbit_station(request: CreateTokenStationRequest) -> Result<OrbitStationResponse, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    // Check if station already exists for this token
    if TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow().contains_key(&StorablePrincipal(request.token_canister_id))
    }) {
        return Err("An Orbit Station already exists for this token".to_string());
    }

    // Check minimum voting power requirement for this specific token
    check_minimum_voting_power_for_token(caller, request.token_canister_id).await?;

    let response = create_orbit_station_internal(request.name, request.token_canister_id).await?;

    // Store the station indexed by token
    TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow_mut().insert(
            StorablePrincipal(request.token_canister_id),
            StorablePrincipal(response.station_id)
        );
    });

    Ok(response)
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
pub fn get_orbit_station_for_token(token_canister_id: Principal) -> Option<Principal> {
    TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
    })
}

#[query]
pub fn list_all_orbit_stations() -> Vec<(Principal, Principal)> {
    TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow().iter()
            .map(|(token, station)| (token.0, station.0))
            .collect()
    })
}

#[update]
pub async fn join_orbit_station(token_canister_id: Principal, display_name: String) -> Result<String, String> {
    use crate::types::{CreateRequestInput, RequestOperationInput, AddUserOperationInput, RequestExecutionSchedule, CreateRequestResult};
    use crate::kong_locker::voting::get_user_voting_power_for_token;
    use ic_cdk::call;

    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    // Find the station for this token
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
    }).ok_or("No Orbit station exists for this token")?;

    // Check if user has at least 100 voting power for this token
    const MINIMUM_VP_TO_JOIN: u64 = 100;
    let voting_power = get_user_voting_power_for_token(caller, token_canister_id).await?;

    if voting_power < MINIMUM_VP_TO_JOIN {
        return Err(format!(
            "Insufficient voting power. You have {} VP but need at least {} VP to join as a member",
            voting_power,
            MINIMUM_VP_TO_JOIN
        ));
    }

    // Create the AddUser request
    let add_user_input = CreateRequestInput {
        operation: RequestOperationInput::AddUser(AddUserOperationInput {
            name: display_name.clone(),
            identities: vec![caller],
            groups: vec![],
            status: crate::types::UserStatus::Active,
        }),
        title: Some(format!("Add {} as member", display_name)),
        summary: Some(format!("Adding user with {} VP as a member to the station", voting_power)),
        execution_plan: Some(RequestExecutionSchedule::Immediate),
        expiration_dt: None,
    };

    // Call Orbit Station to create the request
    let result: Result<(CreateRequestResult,), _> = call(
        station_id,
        "create_request",
        (add_user_input,)
    ).await;

    match result {
        Ok((CreateRequestResult::Ok(response),)) => {
            Ok(format!(
                "Successfully created member request. Request ID: {}. Status: {:?}",
                response.request.id,
                response.request.status
            ))
        },
        Ok((CreateRequestResult::Err(e),)) => {
            Err(format!("Failed to create member request: {}", e))
        },
        Err((code, msg)) => {
            Err(format!("Failed to call Orbit Station: {:?} - {}", code, msg))
        }
    }
}