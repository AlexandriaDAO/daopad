use candid::Principal;
use ic_cdk::update;
use crate::storage::state::{TOKEN_ORBIT_STATIONS, STATION_TO_TOKEN};
use crate::types::StorablePrincipal;
use crate::kong_locker::voting::get_user_voting_power_for_token;

/// Link an Orbit Station to a token (immediate action, no voting)
/// Requires: 10K+ VP, station admin access, station not already linked
#[update]
pub async fn link_orbit_station(
    token_canister_id: Principal,
    station_id: Principal,
) -> Result<(), String> {
    let caller = ic_cdk::caller();

    // 1. Authentication check
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    // 2. Minimum voting power check (10,000 VP)
    const MINIMUM_VP: u64 = 10_000;
    let caller_power = get_user_voting_power_for_token(caller, token_canister_id).await?;

    if caller_power < MINIMUM_VP {
        return Err(format!(
            "Insufficient voting power. You have {} VP but need {} VP to link a station",
            caller_power, MINIMUM_VP
        ));
    }

    // 3. Check no existing station for this token
    if TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow().contains_key(&StorablePrincipal(token_canister_id))
    }) {
        return Err("An Orbit Station is already linked to this token".to_string());
    }

    // 4. Check station not already linked to another token
    if let Some(existing_token) = STATION_TO_TOKEN.with(|stations| {
        stations.borrow()
            .get(&StorablePrincipal(station_id))
            .map(|t| t.0)
    }) {
        return Err(format!(
            "This Orbit Station is already linked to token {}. Each station can only manage one token.",
            existing_token
        ));
    }

    // 5. Verify DAOPad backend is admin of this station
    verify_backend_is_admin(station_id).await?;

    // 6. Link the station (insert into both mappings)
    TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow_mut().insert(
            StorablePrincipal(token_canister_id),
            StorablePrincipal(station_id),
        );
    });

    STATION_TO_TOKEN.with(|stations| {
        stations.borrow_mut().insert(
            StorablePrincipal(station_id),
            StorablePrincipal(token_canister_id),
        );
    });

    ic_cdk::println!(
        "Station {} linked to token {} by user {}",
        station_id, token_canister_id, caller
    );

    Ok(())
}

/// Verify DAOPad backend is admin of the Orbit Station
async fn verify_backend_is_admin(station_id: Principal) -> Result<bool, String> {
    use crate::types::orbit::{MeResult, UserPrivilege};

    let backend_id = ic_cdk::id();

    // Call Orbit Station's me() method to check our privileges
    let result: Result<(MeResult,), _> = ic_cdk::call(station_id, "me", ()).await;

    match result {
        Ok((MeResult::Ok { me, privileges },)) => {
            // Check if we have ManageSystemInfo privilege (indicates admin status)
            let is_admin = privileges.contains(&UserPrivilege::ManageSystemInfo);

            if is_admin {
                Ok(true)
            } else {
                Err(format!(
                    "DAOPad backend {} is not an admin of station {}. User: {}",
                    backend_id, station_id, me.name
                ))
            }
        }
        Ok((MeResult::Err(e),)) => {
            let error_msg = e.message.unwrap_or_else(|| e.code.clone());
            // Check if the error is because we're not a member
            if e.code.contains("USER_NOT_FOUND") || error_msg.contains("not exist as a user") {
                Err(format!(
                    "DAOPad backend is not a member of the Orbit Station. \
                    Please add principal {} as a member with Admin role to station {} first. \
                    Go to https://{}.icp0.io > Members > Add Member",
                    backend_id, station_id, station_id
                ))
            } else {
                Err(format!("Failed to verify admin status: {}", error_msg))
            }
        }
        Err((_code, msg)) if msg.contains("does not exist as a user") => {
            // The trap error we're seeing
            Err(format!(
                "DAOPad backend is not a member of the Orbit Station. \
                Please add principal {} as a member with Admin role to station {} first. \
                Go to https://{}.icp0.io > Members > Add Member",
                backend_id, station_id, station_id
            ))
        }
        Err((code, msg)) => Err(format!(
            "Failed to call Orbit Station: {:?} - {}",
            code, msg
        )),
    }
}
