// ⚠️ IMPORTANT: Direct canister operations have been disabled to enforce proposal-based governance.
// All canister management operations (create, change, configure, fund, etc.) must now go through
// the proposal voting system to prevent admin bypass of community governance.
// Required voting power: 25,000 VP minimum for canister operations (higher due to risk).

use candid::Principal;
use ic_cdk::{api::call::CallResult, call};

use crate::api::orbit::get_orbit_station_for_token;
use crate::types::orbit::{
    ChangeExternalCanisterOperationInput, ConfigureExternalCanisterOperationInput,
    CreateExternalCanisterOperationInput, ExternalCanisterCallerMethodCallInput,
    FundExternalCanisterOperationInput, GetExternalCanisterResult,
    ListExternalCanistersResult,
    // Minimal types (no Option<T>)
    ListExternalCanistersInputMinimal, PaginationInputMinimal, ExternalCanisterState,
    MonitorExternalCanisterOperationInput, PruneExternalCanisterOperationInput,
    RestoreExternalCanisterOperationInput, SnapshotExternalCanisterOperationInput,
    SubmitRequestResult,
};

// ===== LIST CANISTERS =====

#[ic_cdk::update]
async fn list_orbit_canisters(
    token_canister_id: Principal,
    filters: ListExternalCanistersInputMinimal,  // Single struct param (matches frontend)
) -> Result<ListExternalCanistersResult, String> {
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| "No Orbit Station linked to this token".to_string())?;

    // Use filters directly (already in correct format)
    let result: CallResult<(ListExternalCanistersResult,)> = call(
        station_id,
        "list_external_canisters",
        (filters,),
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
    _token_canister_id: Principal,
    _config: CreateExternalCanisterOperationInput,
    _title: String,
    _summary: Option<String>,
) -> Result<SubmitRequestResult, String> {
    Err(
        "Direct canister creation is disabled. Canister operations must go through the proposal system. \
        Please create a governance proposal for canister creation. \
        Required voting power: 25,000 VP minimum.".to_string()
    )
}

// ===== CHANGE CANISTER (Upgrade, Settings, etc.) =====

#[ic_cdk::update]
async fn change_orbit_canister_request(
    _token_canister_id: Principal,
    _config: ChangeExternalCanisterOperationInput,
    _title: String,
    _summary: Option<String>,
) -> Result<SubmitRequestResult, String> {
    Err(
        "Direct canister changes are disabled. Canister operations must go through the proposal system. \
        Please create a governance proposal for canister changes. \
        Required voting power: 25,000 VP minimum.".to_string()
    )
}

// ===== CONFIGURE CANISTER (Permissions, Policies) =====

#[ic_cdk::update]
async fn configure_orbit_canister_request(
    _token_canister_id: Principal,
    _config: ConfigureExternalCanisterOperationInput,
    _title: String,
    _summary: Option<String>,
) -> Result<SubmitRequestResult, String> {
    Err(
        "Direct canister configuration is disabled. Canister operations must go through the proposal system. \
        Please create a governance proposal for canister configuration. \
        Required voting power: 25,000 VP minimum.".to_string()
    )
}

// ===== CALL CANISTER METHOD =====

#[ic_cdk::update]
async fn call_orbit_canister_method_request(
    _token_canister_id: Principal,
    _external_canister_id: String,
    _method_call: ExternalCanisterCallerMethodCallInput,
    _title: String,
    _summary: Option<String>,
) -> Result<SubmitRequestResult, String> {
    Err(
        "Direct canister method calls are disabled. Canister operations must go through the proposal system. \
        Please create a governance proposal for canister method calls. \
        Required voting power: 25,000 VP minimum.".to_string()
    )
}

// ===== FUND CANISTER (Add Cycles) =====

#[ic_cdk::update]
async fn fund_orbit_canister_request(
    _token_canister_id: Principal,
    _config: FundExternalCanisterOperationInput,
    _title: String,
    _summary: Option<String>,
) -> Result<SubmitRequestResult, String> {
    Err(
        "Direct canister funding is disabled. Canister operations must go through the proposal system. \
        Please create a governance proposal for canister funding. \
        Required voting power: 25,000 VP minimum.".to_string()
    )
}

// ===== MONITOR CANISTER (Auto-funding) =====

#[ic_cdk::update]
async fn monitor_orbit_canister_request(
    _token_canister_id: Principal,
    _config: MonitorExternalCanisterOperationInput,
    _title: String,
    _summary: Option<String>,
) -> Result<SubmitRequestResult, String> {
    Err(
        "Direct canister monitoring setup is disabled. Canister operations must go through the proposal system. \
        Please create a governance proposal for monitoring setup. \
        Required voting power: 25,000 VP minimum.".to_string()
    )
}

// ===== SNAPSHOT CANISTER =====

#[ic_cdk::update]
async fn snapshot_orbit_canister_request(
    _token_canister_id: Principal,
    _config: SnapshotExternalCanisterOperationInput,
    _title: String,
    _summary: Option<String>,
) -> Result<SubmitRequestResult, String> {
    Err(
        "Direct canister snapshots are disabled. Canister operations must go through the proposal system. \
        Please create a governance proposal for taking snapshots. \
        Required voting power: 25,000 VP minimum.".to_string()
    )
}

// ===== RESTORE FROM SNAPSHOT =====

#[ic_cdk::update]
async fn restore_orbit_canister_request(
    _token_canister_id: Principal,
    _config: RestoreExternalCanisterOperationInput,
    _title: String,
    _summary: Option<String>,
) -> Result<SubmitRequestResult, String> {
    Err(
        "Direct canister restore is disabled. Canister operations must go through the proposal system. \
        Please create a governance proposal for restoring from snapshots. \
        Required voting power: 25,000 VP minimum.".to_string()
    )
}

// ===== PRUNE SNAPSHOTS =====

#[ic_cdk::update]
async fn prune_orbit_canister_snapshots_request(
    _token_canister_id: Principal,
    _config: PruneExternalCanisterOperationInput,
    _title: String,
    _summary: Option<String>,
) -> Result<SubmitRequestResult, String> {
    Err(
        "Direct snapshot pruning is disabled. Canister operations must go through the proposal system. \
        Please create a governance proposal for pruning snapshots. \
        Required voting power: 25,000 VP minimum.".to_string()
    )
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