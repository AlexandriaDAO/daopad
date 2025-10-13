use crate::api::orbit_requests::GetRequestResponse;
use crate::types::orbit::{
    TransferOperationInput, TransferMetadata, NetworkInput,
    RequestExecutionSchedule, RequestOperation,
};
use candid::{CandidType, Deserialize, Nat, Principal};
use ic_cdk::api::call::CallResult;

#[derive(CandidType, Deserialize)]
pub enum CreateRequestResult {
    Ok(GetRequestResponse),
    Err(ErrorInfo),
}

// RequestWithDetails and related types are now imported from orbit_requests.rs

#[derive(CandidType, Deserialize)]
pub struct ErrorInfo {
    pub code: String,
    pub message: String,
}

// Simplified implementation - complex Orbit types will be added in future update

#[derive(CandidType, Deserialize)]
pub struct SubmitRequestApprovalInput {
    pub request_id: String,
    pub decision: RequestApprovalDecision,
    pub reason: Option<String>,
}

#[derive(CandidType, Deserialize)]
pub enum RequestApprovalDecision {
    Approve,
    Reject,
}

#[derive(CandidType, Deserialize)]
pub enum SubmitRequestApprovalResult {
    Ok(()),
    Err(ErrorInfo),
}

// Note: Direct transfer functionality has been removed.
// All transfers now go through the proposal system via create_transfer_request in orbit.rs

// Return a simple message for now until we can properly decode Orbit's complex response
pub async fn get_transfer_requests_from_orbit(
    _station_id: Principal,
) -> Result<Vec<String>, String> {
    // For now, return a simple message since Orbit's Request type has complex IDLValue operations
    // that candid-extractor can't handle properly
    Ok(vec![
        "Transfer requests functionality is available".to_string(),
        "Complex request parsing will be implemented in a future update".to_string(),
        "Users can view requests directly in Orbit Station".to_string(),
    ])
}

// Approve an Orbit request (vote yes)
pub async fn approve_orbit_request(
    station_id: Principal,
    request_id: String,
    _caller: Principal,
) -> Result<(), String> {
    // Orbit handles voting internally based on caller's permissions
    let input = SubmitRequestApprovalInput {
        request_id: request_id.clone(),
        decision: RequestApprovalDecision::Approve,
        reason: None,
    };

    let result: CallResult<(SubmitRequestApprovalResult,)> =
        ic_cdk::call(station_id, "submit_request_approval", (input,)).await;

    match result {
        Ok((SubmitRequestApprovalResult::Ok(_),)) => Ok(()),
        Ok((SubmitRequestApprovalResult::Err(e),)) => {
            Err(format!("Cannot approve: {} - {}", e.code, e.message))
        }
        Err((code, msg)) => Err(format!("Failed to approve: {:?} - {}", code, msg)),
    }
}
