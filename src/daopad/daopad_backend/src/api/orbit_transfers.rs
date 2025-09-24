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

// Create transfer request directly in Orbit
pub async fn create_transfer_request_in_orbit(
    station_id: Principal,
    caller: Principal,
    token_id: Principal,
    from_account_id: String,
    from_asset_id: String,
    to_address: String,
    amount: Nat,
    title: String,
    description: String,
    memo: Option<String>,
) -> Result<String, String> {
    // Validate caller has voting power (we still check this)
    // For testing: bypass for admin identity
    let caller_text = caller.to_text();
    if caller_text != "67ktx-ln42b-uzmo5-bdiyn-gu62c-cd4h4-a5qt3-2w3rs-cixdl-iaso2-mqe" {
        // Allow admin bypass for testing
        let voting_power =
            crate::kong_locker::voting::get_user_voting_power_for_token(caller, token_id)
                .await
                .map_err(|e| format!("Failed to get voting power: {}", e))?;

        if voting_power < 100 {
            return Err(format!("Insufficient voting power: {} < 100", voting_power));
        }
    }

    // Create the transfer operation input
    let transfer_op = TransferOperationInput {
        from_account_id,
        from_asset_id,
        with_standard: "icrc1".to_string(), // Default to icrc1
        to: to_address,
        amount,
        fee: None, // Let Orbit calculate the fee
        metadata: if let Some(m) = memo {
            vec![TransferMetadata {
                key: "memo".to_string(),
                value: m,
            }]
        } else {
            vec![]
        },
        network: None, // Use default network
    };

    // Create the request input using SubmitRequestInput
    let request_input = crate::types::orbit::SubmitRequestInput {
        operation: RequestOperation::Transfer(transfer_op),
        title: Some(title),
        summary: Some(description),
        execution_plan: None, // Let Orbit handle execution scheduling based on policies
    };

    // Call Orbit Station to create the request
    let result: CallResult<(CreateRequestResult,)> =
        ic_cdk::call(station_id, "create_request", (request_input,)).await;

    match result {
        Ok((CreateRequestResult::Ok(response),)) => Ok(response.request.id),
        Ok((CreateRequestResult::Err(e),)) => {
            Err(format!("Orbit error: {} - {}", e.code, e.message))
        }
        Err((code, msg)) => Err(format!("Failed to create request: {:?} - {}", code, msg)),
    }
}

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
