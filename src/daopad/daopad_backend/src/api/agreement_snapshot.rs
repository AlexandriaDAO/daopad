use crate::api::orbit_security::{perform_security_check, get_request_policies_details};
use crate::api::orbit_users::list_orbit_users;
use crate::api::governance_config::get_all_voting_powers_for_token;
use crate::api::orbit::{get_treasury_management_data, get_orbit_station_for_token};
use crate::types::orbit::ListExternalCanistersInput;
use crate::storage::state::{AGREEMENT_SNAPSHOTS, STATION_TO_TOKEN};
use crate::types::{AgreementSnapshot, StorablePrincipal};
use candid::Principal;
use ic_cdk::{query, update};
use serde_json::json;

#[query]
pub fn get_agreement_snapshot(token_id: Principal) -> Result<AgreementSnapshot, String> {
    let key = StorablePrincipal(token_id);
    AGREEMENT_SNAPSHOTS.with(|snapshots| {
        snapshots
            .borrow()
            .get(&key)
            .ok_or_else(|| "No snapshot found for token".to_string())
    })
}

#[update]
pub async fn regenerate_agreement_snapshot(
    token_id: Principal,
    station_id: Principal,
) -> Result<AgreementSnapshot, String> {
    // 1. Call all the existing methods to gather data
    let security_result = match perform_security_check(station_id).await {
        Ok(data) => json!(data),
        Err(e) => json!({ "error": e }),
    };

    let policies_result = match get_request_policies_details(token_id).await {
        Ok(data) => json!(data),
        Err(e) => json!({ "error": e }),
    };

    let users_result = match list_orbit_users(token_id).await {
        Ok(data) => json!(data),
        Err(e) => json!({ "error": e }),
    };

    // Call Orbit Station directly for canister list
    let canisters_input = ListExternalCanistersInput {
        canister_ids: None,
        labels: None,
        states: None,
        paginate: None,
        sort_by: None,
    };

    let canisters_result = match ic_cdk::call::<_, (crate::types::orbit::ListExternalCanistersResult,)>(
        station_id,
        "list_external_canisters",
        (canisters_input,),
    )
    .await {
        Ok((data,)) => json!(data),
        Err((code, msg)) => json!({ "error": format!("Failed to list canisters: {:?} - {}", code, msg) }),
    };

    let voting_powers_result = match get_all_voting_powers_for_token(token_id).await {
        Ok(data) => json!(data),
        Err(e) => json!({ "error": e }),
    };

    let treasury_result = match get_treasury_management_data(station_id).await {
        Ok(data) => json!(data),
        Err(e) => json!({ "error": e }),
    };

    // 2. Combine all data into JSON string
    let agreement_data = json!({
        "security": security_result,
        "policies": policies_result,
        "users": users_result,
        "canisters": canisters_result,
        "votingPowers": voting_powers_result,
        "treasury": treasury_result,
        "timestamp": ic_cdk::api::time(),
    })
    .to_string();

    // 3. Get existing version if any
    let key = StorablePrincipal(token_id);
    let existing_version = AGREEMENT_SNAPSHOTS.with(|snapshots| {
        snapshots
            .borrow()
            .get(&key)
            .map(|snapshot| snapshot.version)
            .unwrap_or(0)
    });

    // 4. Create/update snapshot
    let snapshot = AgreementSnapshot {
        token_id,
        station_id,
        data: agreement_data,
        created_at: ic_cdk::api::time(),
        updated_at: ic_cdk::api::time(),
        version: existing_version + 1,
    };

    // 5. Store in stable memory
    AGREEMENT_SNAPSHOTS.with(|snapshots| {
        snapshots.borrow_mut().insert(key, snapshot.clone());
    });

    Ok(snapshot)
}

#[query]
pub fn get_agreement_by_station(station_id: Principal) -> Result<AgreementSnapshot, String> {
    // Look up token_id from STATION_TO_TOKEN mapping
    let station_key = StorablePrincipal(station_id);

    let token_id = STATION_TO_TOKEN.with(|mapping| {
        mapping
            .borrow()
            .get(&station_key)
            .map(|token| token.0)
            .ok_or_else(|| "No token found for station".to_string())
    })?;

    // Return the agreement snapshot for that token
    get_agreement_snapshot(token_id)
}