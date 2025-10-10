use candid::{Nat, Principal};
use ic_cdk::{api::call::CallResult, call};

use crate::api::orbit::get_orbit_station_for_token;
use crate::types::orbit::{
    ChangeExternalCanisterOperationInput, ConfigureExternalCanisterOperationInput,
    CreateExternalCanisterOperationInput, ExternalCanister, ExternalCanisterCallerMethodCallInput,
    ExternalCanisterIdInput, FundExternalCanisterOperationInput, GetExternalCanisterInput,
    GetExternalCanisterResult, ListExternalCanistersInput, ListExternalCanistersResult,
    MonitorExternalCanisterOperationInput, PruneExternalCanisterOperationInput, RequestOperation,
    RestoreExternalCanisterOperationInput, SnapshotExternalCanisterOperationInput,
    SubmitRequestInput, SubmitRequestResult,
};

// ===== LIST CANISTERS =====

#[ic_cdk::update]
async fn list_orbit_canisters(
    token_canister_id: Principal,
    filters: ListExternalCanistersInput,
) -> Result<ListExternalCanistersResult, String> {
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| "No Orbit Station linked to this token".to_string())?;

    // All fields must be present for Orbit with correct names
    let request = ListExternalCanistersInput {
        canister_ids: filters.canister_ids,
        labels: filters.labels,
        states: filters.states,
        paginate: filters.paginate,
        sort_by: filters.sort_by,
    };

    let result: CallResult<(ListExternalCanistersResult,)> = call(
        station_id,
        "list_external_canisters",
        (request,),
    )
    .await;

    match result {
        Ok((res,)) => Ok(res),
        Err((code, msg)) => Err(format!("Failed to list canisters: {:?} - {}", code, msg)),
    }
}

// ===== GET CANISTER DETAILS =====

#[ic_cdk::update]
async fn get_orbit_canister(
    token_canister_id: Principal,
    canister_principal: Principal, // Changed to accept Principal instead of UUID
) -> Result<GetExternalCanisterResult, String> {
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| "No Orbit Station linked to this token".to_string())?;

    // Use the correct input type that Orbit expects
    use crate::types::orbit::GetExternalCanisterByPrincipalInput;

    let result: CallResult<(GetExternalCanisterResult,)> = call(
        station_id,
        "get_external_canister",
        (GetExternalCanisterByPrincipalInput { canister_id: canister_principal },),
    )
    .await;

    match result {
        Ok((res,)) => Ok(res),
        Err((code, msg)) => Err(format!("Failed to get canister: {:?} - {}", code, msg)),
    }
}

// ===== CREATE CANISTER =====

#[ic_cdk::update]
async fn create_orbit_canister_request(
    token_canister_id: Principal,
    config: CreateExternalCanisterOperationInput,
    title: String,
    summary: Option<String>,
) -> Result<SubmitRequestResult, String> {
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| "No Orbit Station linked to this token".to_string())?;

    let operation = RequestOperation::CreateExternalCanister(config);

    let request = SubmitRequestInput {
        operation,
        title: Some(title),
        summary,
        execution_plan: None,
    };

    let result: CallResult<(SubmitRequestResult,)> = call(
        station_id,
        "submit_request",
        (request,),
    )
    .await;

    match result {
        Ok((res,)) => Ok(res),
        Err((code, msg)) => Err(format!("Failed to create request: {:?} - {}", code, msg)),
    }
}

// ===== CHANGE CANISTER (Upgrade, Settings, etc.) =====

#[ic_cdk::update]
async fn change_orbit_canister_request(
    token_canister_id: Principal,
    config: ChangeExternalCanisterOperationInput,
    title: String,
    summary: Option<String>,
) -> Result<SubmitRequestResult, String> {
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| "No Orbit Station linked to this token".to_string())?;

    let operation = RequestOperation::ChangeExternalCanister(config);

    let request = SubmitRequestInput {
        operation,
        title: Some(title),
        summary,
        execution_plan: None,
    };

    let result: CallResult<(SubmitRequestResult,)> = call(
        station_id,
        "submit_request",
        (request,),
    )
    .await;

    match result {
        Ok((res,)) => Ok(res),
        Err((code, msg)) => Err(format!("Failed to change canister: {:?} - {}", code, msg)),
    }
}

// ===== CONFIGURE CANISTER (Permissions, Policies) =====

#[ic_cdk::update]
async fn configure_orbit_canister_request(
    token_canister_id: Principal,
    config: ConfigureExternalCanisterOperationInput,
    title: String,
    summary: Option<String>,
) -> Result<SubmitRequestResult, String> {
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| "No Orbit Station linked to this token".to_string())?;

    let operation = RequestOperation::ConfigureExternalCanister(config);

    let request = SubmitRequestInput {
        operation,
        title: Some(title),
        summary,
        execution_plan: None,
    };

    let result: CallResult<(SubmitRequestResult,)> = call(
        station_id,
        "submit_request",
        (request,),
    )
    .await;

    match result {
        Ok((res,)) => Ok(res),
        Err((code, msg)) => Err(format!("Failed to configure canister: {:?} - {}", code, msg)),
    }
}

// ===== CALL CANISTER METHOD =====

#[ic_cdk::update]
async fn call_orbit_canister_method_request(
    token_canister_id: Principal,
    external_canister_id: String,
    method_call: ExternalCanisterCallerMethodCallInput,
    title: String,
    summary: Option<String>,
) -> Result<SubmitRequestResult, String> {
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| "No Orbit Station linked to this token".to_string())?;

    let operation = RequestOperation::CallExternalCanister(
        ExternalCanisterIdInput { external_canister_id },
        method_call,
    );

    let request = SubmitRequestInput {
        operation,
        title: Some(title),
        summary,
        execution_plan: None,
    };

    let result: CallResult<(SubmitRequestResult,)> = call(
        station_id,
        "submit_request",
        (request,),
    )
    .await;

    match result {
        Ok((res,)) => Ok(res),
        Err((code, msg)) => Err(format!("Failed to call method: {:?} - {}", code, msg)),
    }
}

// ===== FUND CANISTER (Add Cycles) =====

#[ic_cdk::update]
async fn fund_orbit_canister_request(
    token_canister_id: Principal,
    config: FundExternalCanisterOperationInput,
    title: String,
    summary: Option<String>,
) -> Result<SubmitRequestResult, String> {
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| "No Orbit Station linked to this token".to_string())?;

    let operation = RequestOperation::FundExternalCanister(config);

    let request = SubmitRequestInput {
        operation,
        title: Some(title),
        summary,
        execution_plan: None,
    };

    let result: CallResult<(SubmitRequestResult,)> = call(
        station_id,
        "submit_request",
        (request,),
    )
    .await;

    match result {
        Ok((res,)) => Ok(res),
        Err((code, msg)) => Err(format!("Failed to fund canister: {:?} - {}", code, msg)),
    }
}

// ===== MONITOR CANISTER (Auto-funding) =====

#[ic_cdk::update]
async fn monitor_orbit_canister_request(
    token_canister_id: Principal,
    config: MonitorExternalCanisterOperationInput,
    title: String,
    summary: Option<String>,
) -> Result<SubmitRequestResult, String> {
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| "No Orbit Station linked to this token".to_string())?;

    let operation = RequestOperation::MonitorExternalCanister(config);

    let request = SubmitRequestInput {
        operation,
        title: Some(title),
        summary,
        execution_plan: None,
    };

    let result: CallResult<(SubmitRequestResult,)> = call(
        station_id,
        "submit_request",
        (request,),
    )
    .await;

    match result {
        Ok((res,)) => Ok(res),
        Err((code, msg)) => Err(format!("Failed to configure monitoring: {:?} - {}", code, msg)),
    }
}

// ===== SNAPSHOT CANISTER =====

#[ic_cdk::update]
async fn snapshot_orbit_canister_request(
    token_canister_id: Principal,
    config: SnapshotExternalCanisterOperationInput,
    title: String,
    summary: Option<String>,
) -> Result<SubmitRequestResult, String> {
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| "No Orbit Station linked to this token".to_string())?;

    let operation = RequestOperation::SnapshotExternalCanister(config);

    let request = SubmitRequestInput {
        operation,
        title: Some(title),
        summary,
        execution_plan: None,
    };

    let result: CallResult<(SubmitRequestResult,)> = call(
        station_id,
        "submit_request",
        (request,),
    )
    .await;

    match result {
        Ok((res,)) => Ok(res),
        Err((code, msg)) => Err(format!("Failed to take snapshot: {:?} - {}", code, msg)),
    }
}

// ===== RESTORE FROM SNAPSHOT =====

#[ic_cdk::update]
async fn restore_orbit_canister_request(
    token_canister_id: Principal,
    config: RestoreExternalCanisterOperationInput,
    title: String,
    summary: Option<String>,
) -> Result<SubmitRequestResult, String> {
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| "No Orbit Station linked to this token".to_string())?;

    let operation = RequestOperation::RestoreExternalCanister(config);

    let request = SubmitRequestInput {
        operation,
        title: Some(title),
        summary,
        execution_plan: None,
    };

    let result: CallResult<(SubmitRequestResult,)> = call(
        station_id,
        "submit_request",
        (request,),
    )
    .await;

    match result {
        Ok((res,)) => Ok(res),
        Err((code, msg)) => Err(format!("Failed to restore snapshot: {:?} - {}", code, msg)),
    }
}

// ===== PRUNE SNAPSHOTS =====

#[ic_cdk::update]
async fn prune_orbit_canister_snapshots_request(
    token_canister_id: Principal,
    config: PruneExternalCanisterOperationInput,
    title: String,
    summary: Option<String>,
) -> Result<SubmitRequestResult, String> {
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| "No Orbit Station linked to this token".to_string())?;

    let operation = RequestOperation::PruneExternalCanister(config);

    let request = SubmitRequestInput {
        operation,
        title: Some(title),
        summary,
        execution_plan: None,
    };

    let result: CallResult<(SubmitRequestResult,)> = call(
        station_id,
        "submit_request",
        (request,),
    )
    .await;

    match result {
        Ok((res,)) => Ok(res),
        Err((code, msg)) => Err(format!("Failed to prune snapshots: {:?} - {}", code, msg)),
    }
}

// ===== GET CANISTER STATUS (from IC management canister) =====

#[ic_cdk::update]
async fn get_canister_status(
    canister_id: Principal,
) -> Result<CanisterStatusResponse, String> {
    use ic_cdk::api::management_canister::main::{canister_status, CanisterIdRecord};

    let request = CanisterIdRecord { canister_id };

    match canister_status(request).await {
        Ok((response,)) => Ok(CanisterStatusResponse {
            cycles: response.cycles.0.to_string(),
            memory_size: response.memory_size.0.to_string(),
            module_hash: response.module_hash.map(|h| {
                // Convert byte array to hex string
                h.iter().map(|b| format!("{:02x}", b)).collect::<String>()
            }),
            status: match response.status {
                ic_cdk::api::management_canister::main::CanisterStatusType::Running => "running",
                ic_cdk::api::management_canister::main::CanisterStatusType::Stopping => "stopping",
                ic_cdk::api::management_canister::main::CanisterStatusType::Stopped => "stopped",
            }.to_string(),
        }),
        Err((code, msg)) => Err(format!("Failed to get canister status: {:?} - {}", code, msg)),
    }
}

#[derive(candid::CandidType, candid::Deserialize, serde::Serialize)]
pub struct CanisterStatusResponse {
    pub cycles: String,
    pub memory_size: String,
    pub module_hash: Option<String>,
    pub status: String,
}

// ===== LIST CANISTER SNAPSHOTS =====

/// Get snapshots for a canister managed by Orbit Station
///
/// This method proxies to Orbit Station's canister_snapshots API,
/// which returns up to 10 snapshots per canister.
///
/// Security: Validates principals and that the token is registered before
/// making inter-canister calls.
#[ic_cdk::update]
async fn get_canister_snapshots(
    token_canister_id: Principal,
    canister_principal: Principal,
) -> Result<crate::types::orbit::CanisterSnapshotsResult, String> {
    use crate::api::orbit::get_orbit_station_for_token;
    use crate::types::orbit::{CanisterSnapshotsInput, CanisterSnapshotsResult};

    // Validate principals are not anonymous
    if token_canister_id == Principal::anonymous() || canister_principal == Principal::anonymous() {
        return Err("Invalid principal provided".to_string());
    }

    // Get Orbit Station ID for this token
    // Note: get_orbit_station_for_token already validates the token is registered
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| "Token not registered with any Orbit Station".to_string())?;

    // Create input for Orbit Station
    let input = CanisterSnapshotsInput {
        canister_id: canister_principal,
    };

    // Call Orbit Station's canister_snapshots method
    let result: Result<(CanisterSnapshotsResult,), _> = ic_cdk::call(
        station_id,
        "canister_snapshots",
        (input,),
    ).await;

    // Handle result - log detailed errors internally, return generic message to user
    match result {
        Ok((res,)) => Ok(res),
        Err((code, msg)) => {
            ic_cdk::println!("Snapshot query failed for canister {}: {:?} - {}", canister_principal, code, msg);
            Err("Failed to retrieve snapshots. Please try again or contact support.".to_string())
        }
    }
}