use crate::api::orbit_security::{perform_security_check, get_request_policies_details};
use crate::api::orbit_users::list_orbit_users;
use crate::api::governance_config::get_all_voting_powers_for_token;
use crate::api::orbit::get_treasury_management_data;
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
    // Authorization: Only users with voting power can regenerate
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err("Authentication required to regenerate agreement".to_string());
    }

    // Verify caller has voting power for this token (any amount)
    use crate::kong_locker::get_user_voting_power_for_token;

    let voting_power = get_user_voting_power_for_token(caller, token_id)
        .await
        .map_err(|e| format!("Failed to verify voting power: {}", e))?;

    if voting_power == 0 {
        return Err("Must hold voting power for this token to regenerate agreement".to_string());
    }

    ic_cdk::println!("Agreement regeneration requested by {} with {} VP", caller, voting_power);

    // 1. Call all methods in parallel for better performance
    let canisters_input = ListExternalCanistersInput {
        canister_ids: None,
        labels: None,
        states: None,
        paginate: None,
        sort_by: None,
    };

    // Run all calls in parallel using futures::join!
    let (security_result, policies_result, users_result, canisters_result, voting_powers_result, treasury_result) =
        futures::join!(
            perform_security_check(station_id),
            get_request_policies_details(token_id),
            list_orbit_users(token_id),
            ic_cdk::call::<_, (crate::types::orbit::ListExternalCanistersResult,)>(
                station_id,
                "list_external_canisters",
                (canisters_input,)
            ),
            get_all_voting_powers_for_token(token_id),
            get_treasury_management_data(station_id)
        );

    // Convert results to JSON with error logging
    let security_json = match security_result {
        Ok(data) => json!(data),
        Err(e) => {
            ic_cdk::println!("Failed to fetch security check: {}", e);
            json!({ "error": e })
        }
    };

    let policies_json = match policies_result {
        Ok(data) => json!(data),
        Err(e) => {
            ic_cdk::println!("Failed to fetch request policies: {}", e);
            json!({ "error": e })
        }
    };

    let users_json = match users_result {
        Ok(data) => json!(data),
        Err(e) => {
            ic_cdk::println!("Failed to list users: {}", e);
            json!({ "error": e })
        }
    };

    let canisters_json = match canisters_result {
        Ok((data,)) => json!(data),
        Err((code, msg)) => {
            let error_msg = format!("Failed to list canisters: {:?} - {}", code, msg);
            ic_cdk::println!("{}", error_msg);
            json!({ "error": error_msg })
        }
    };

    let voting_powers_json = match voting_powers_result {
        Ok(data) => json!(data),
        Err(e) => {
            ic_cdk::println!("Failed to fetch voting powers: {}", e);
            json!({ "error": e })
        }
    };

    let treasury_json = match treasury_result {
        Ok(data) => json!(data),
        Err(e) => {
            ic_cdk::println!("Failed to fetch treasury data: {}", e);
            json!({ "error": e })
        }
    };

    // 2. Combine all data into JSON string
    let agreement_data = json!({
        "security": security_json,
        "policies": policies_json,
        "users": users_json,
        "canisters": canisters_json,
        "votingPowers": voting_powers_json,
        "treasury": treasury_json,
        "timestamp": ic_cdk::api::time(),
    })
    .to_string();

    // 3. Validate size before storage (5MB limit, use 4.9MB to be safe)
    const MAX_SAFE_SIZE: usize = 4_900_000; // 4.9MB
    if agreement_data.len() > MAX_SAFE_SIZE {
        ic_cdk::println!(
            "Agreement data too large: {} bytes (max: {} bytes)",
            agreement_data.len(),
            MAX_SAFE_SIZE
        );
        return Err(format!(
            "Agreement data exceeds size limit: {} bytes (max: 4.9MB)",
            agreement_data.len()
        ));
    }

    // 4. Get existing snapshot info (preserve created_at, increment version)
    let key = StorablePrincipal(token_id);
    let (created_at, version) = AGREEMENT_SNAPSHOTS.with(|snapshots| {
        snapshots
            .borrow()
            .get(&key)
            .map(|snapshot| (snapshot.created_at, snapshot.version + 1))
            .unwrap_or((ic_cdk::api::time(), 1))
    });

    // 5. Create/update snapshot
    let snapshot = AgreementSnapshot {
        token_id,
        station_id,
        data: agreement_data,
        created_at, // Preserve original creation timestamp
        updated_at: ic_cdk::api::time(),
        version,
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