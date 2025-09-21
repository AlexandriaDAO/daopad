use candid::{types::value::IDLValue, types::Label, Principal};
use ic_cdk::update;
use std::collections::{HashMap, HashSet};

use crate::storage::state::TOKEN_ORBIT_STATIONS;
use crate::types::StorablePrincipal;

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub struct ListRequestsInput {
    pub requester_ids: Option<Vec<String>>,
    pub approver_ids: Option<Vec<String>>,
    pub statuses: Option<Vec<RequestStatusCode>>,
    pub operation_types: Option<Vec<ListRequestsOperationType>>,
    pub expiration_from_dt: Option<String>,
    pub expiration_to_dt: Option<String>,
    pub created_from_dt: Option<String>,
    pub created_to_dt: Option<String>,
    pub paginate: Option<crate::api::dao_transition::PaginationInput>,
    pub sort_by: Option<ListRequestsSortBy>,
    pub only_approvable: bool,
    pub with_evaluation_results: bool,
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub enum RequestStatusCode {
    Created,
    Approved,
    Rejected,
    Cancelled,
    Scheduled,
    Processing,
    Completed,
    Failed,
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub enum ListRequestsSortBy {
    CreatedAt(SortDirection),
    ExpirationDt(SortDirection),
    LastModificationDt(SortDirection),
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub enum SortDirection {
    Asc,
    Desc,
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub enum ListRequestsOperationType {
    Transfer(Option<String>),
    EditAccount,
    AddAccount,
    AddUser,
    EditUser,
    AddAddressBookEntry,
    EditAddressBookEntry,
    RemoveAddressBookEntry,
    AddUserGroup,
    EditUserGroup,
    RemoveUserGroup,
    SystemUpgrade,
    ChangeExternalCanister(Option<Principal>),
    ConfigureExternalCanister(Option<Principal>),
    CreateExternalCanister,
    CallExternalCanister(Option<Principal>),
    FundExternalCanister(Option<Principal>),
    MonitorExternalCanister(Option<Principal>),
    SnapshotExternalCanister(Option<Principal>),
    RestoreExternalCanister(Option<Principal>),
    PruneExternalCanister(Option<Principal>),
    EditPermission,
    AddRequestPolicy,
    EditRequestPolicy,
    RemoveRequestPolicy,
    ManageSystemInfo,
    SetDisasterRecovery,
    AddAsset,
    EditAsset,
    RemoveAsset,
    AddNamedRule,
    EditNamedRule,
    RemoveNamedRule,
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub enum RequestApprovalStatus {
    Approved,
    Rejected,
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub enum RequestStatus {
    Created,
    Approved,
    Rejected,
    Cancelled { reason: Option<String> },
    Scheduled { scheduled_at: String },
    Processing { started_at: String },
    Completed { completed_at: String },
    Failed { reason: Option<String> },
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub enum RequestExecutionSchedule {
    Immediate,
    Scheduled { execution_time: String },
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub struct RequestApproval {
    pub approver_id: String,
    pub status: RequestApprovalStatus,
    pub status_reason: Option<String>,
    pub decided_at: String,
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub struct Request {
    pub id: String,
    pub title: String,
    pub summary: Option<String>,
    pub operation: IDLValue, // Back to IDLValue - it works for non-completed requests
    pub requested_by: String,
    pub approvals: Vec<RequestApproval>,
    pub created_at: String,
    pub status: RequestStatus,
    pub expiration_dt: String,
    pub execution_plan: RequestExecutionSchedule,
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub struct RequestCallerPrivileges {
    pub id: String,
    pub can_approve: bool,
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub struct DisplayUser {
    pub id: String,
    pub name: String,
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub struct RequestAdditionalInfo {
    pub id: String,
    pub requester_name: String,
    pub approvers: Vec<DisplayUser>,
    pub evaluation_result: Option<IDLValue>, // Use IDLValue since we don't parse this field
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub struct ListRequestsResponse {
    pub requests: Vec<Request>,
    pub total: u64,
    pub next_offset: Option<u64>,
    pub privileges: Vec<RequestCallerPrivileges>,
    pub additional_info: Vec<RequestAdditionalInfo>,
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub enum ListRequestsResult {
    Ok(ListRequestsResponse),
    Err(crate::types::orbit::Error),
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub struct SubmitRequestApprovalInput {
    pub request_id: String,
    pub decision: RequestApprovalStatus,
    pub reason: Option<String>,
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub struct SubmitRequestApprovalResponse {
    pub request: Request,
    pub privileges: RequestCallerPrivileges,
    pub additional_info: RequestAdditionalInfo,
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub enum SubmitRequestApprovalResult {
    Ok(SubmitRequestApprovalResponse),
    Err(crate::types::orbit::Error),
}

#[derive(candid::CandidType, candid::Deserialize, Clone)]
pub struct SimplifiedRequest {
    pub id: String,
    pub title: String,
    pub summary: Option<String>,
    pub operation_type: String,
    pub status: String,
    pub requester_name: String,
    pub created_at: String,
    pub approval_count: u32,
    pub rejection_count: u32,
}

fn format_request_status(status: &RequestStatus) -> String {
    match status {
        RequestStatus::Created => "Created".to_string(),
        RequestStatus::Approved => "Approved".to_string(),
        RequestStatus::Rejected => "Rejected".to_string(),
        RequestStatus::Cancelled { .. } => "Cancelled".to_string(),
        RequestStatus::Scheduled { .. } => "Scheduled".to_string(),
        RequestStatus::Processing { .. } => "Processing".to_string(),
        RequestStatus::Completed { .. } => "Completed".to_string(),
        RequestStatus::Failed { .. } => "Failed".to_string(),
    }
}

fn derive_operation_label(request: &Request) -> String {
    if let IDLValue::Variant(variant) = &request.operation {
        let field = variant.0.as_ref();
        let label = match &field.id {
            Label::Named(name) => Some(name.clone()),
            Label::Id(id) => Some(format!("#{id}")),
            Label::Unnamed(idx) => Some(format!("variant_{idx}")),
        };

        if let Some(name) = label {
            if !name.is_empty() {
                return name;
            }
        }
    }

    let trimmed_title = request.title.trim();
    if !trimmed_title.is_empty() {
        return trimmed_title.to_string();
    }

    if let Some(summary) = &request.summary {
        let trimmed = summary.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }

    "Request".to_string()
}

fn requester_name_for(
    id: &str,
    info_map: &HashMap<String, RequestAdditionalInfo>,
    fallback: &str,
) -> String {
    info_map
        .get(id)
        .map(|info| info.requester_name.clone())
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| fallback.to_string())
}

fn approval_counts(approvals: &[RequestApproval]) -> (u32, u32) {
    approvals.iter().fold(
        (0u32, 0u32),
        |(approved, rejected), approval| match approval.status {
            RequestApprovalStatus::Approved => (approved + 1, rejected),
            RequestApprovalStatus::Rejected => (approved, rejected + 1),
        },
    )
}

/// List Orbit Station requests that are relevant to a token.
///
/// KNOWN ISSUE: When include_completed=true, the decoding fails for completed AddUser
/// operations because they contain nested UserGroup records with both 'id' and 'name'
/// fields, while our types expect simpler structures. For now, only use include_completed=false.
#[update]
pub async fn list_orbit_requests(
    token_canister_id: Principal,
    include_completed: bool,
) -> Result<Vec<SimplifiedRequest>, String> {
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or_else(|| "No Orbit Station linked to this token".to_string())
    })?;

    // Always include completed for permission requests since they auto-approve
    // But exclude other completed requests to avoid decode issues
    let statuses = if include_completed {
        None
    } else {
        Some(vec![
            RequestStatusCode::Created,
            RequestStatusCode::Processing,
            RequestStatusCode::Scheduled,
            RequestStatusCode::Approved,
        ])
    };

    // First get permission requests specifically (they may be completed)
    let perm_input = ListRequestsInput {
        requester_ids: None,
        approver_ids: None,
        statuses: None, // Get all statuses for permission requests
        operation_types: Some(vec![ListRequestsOperationType::EditPermission]),
        expiration_from_dt: None,
        expiration_to_dt: None,
        created_from_dt: None,
        created_to_dt: None,
        paginate: None,
        sort_by: Some(ListRequestsSortBy::CreatedAt(SortDirection::Desc)),
        only_approvable: false,
        with_evaluation_results: false,
    };

    // Get permission requests
    let perm_result: Result<(ListRequestsResult,), _> =
        ic_cdk::call(station_id, "list_requests", (perm_input,)).await;

    let mut all_requests = Vec::new();
    let mut all_info = Vec::new();

    // Process permission requests if successful
    if let Ok((ListRequestsResult::Ok(perm_response),)) = perm_result {
        all_requests.extend(perm_response.requests);
        all_info.extend(perm_response.additional_info);
    }

    // Now get other requests with status filter
    let list_input = ListRequestsInput {
        requester_ids: None,
        approver_ids: None,
        statuses,
        operation_types: None,
        expiration_from_dt: None,
        expiration_to_dt: None,
        created_from_dt: None,
        created_to_dt: None,
        paginate: None,
        sort_by: Some(ListRequestsSortBy::CreatedAt(SortDirection::Desc)),
        only_approvable: false,
        with_evaluation_results: false,
    };

    let result: Result<(ListRequestsResult,), _> =
        ic_cdk::call(station_id, "list_requests", (list_input,)).await;

    match result {
        Ok((ListRequestsResult::Ok(response),)) => {
            // Add non-permission requests to our collection
            all_requests.extend(response.requests);
            all_info.extend(response.additional_info);

            // Build info map from combined results
            let info_map: HashMap<String, RequestAdditionalInfo> = all_info
                .into_iter()
                .map(|info| (info.id.clone(), info))
                .collect();

            // Filter out EditPermission requests that aren't permission-related
            // to avoid duplicates
            let mut seen_ids = std::collections::HashSet::new();
            let simplified = all_requests
                .into_iter()
                .filter(|request| seen_ids.insert(request.id.clone()))
                .map(|request| {
                    let status_str = format_request_status(&request.status);
                    let (approved, rejected) = approval_counts(&request.approvals);
                    let requester_name =
                        requester_name_for(&request.id, &info_map, &request.requested_by);
                    let operation_type = derive_operation_label(&request);

                    SimplifiedRequest {
                        id: request.id,
                        title: request.title,
                        summary: request.summary,
                        operation_type,
                        status: status_str,
                        requester_name,
                        created_at: request.created_at,
                        approval_count: approved,
                        rejection_count: rejected,
                    }
                })
                .collect();

            Ok(simplified)
        }
        Ok((ListRequestsResult::Err(err),)) => Err(format!(
            "Failed to list requests: {}",
            err.message.unwrap_or_else(|| err.code)
        )),
        Err((code, msg)) => Err(format!(
            "Failed to call Orbit Station: {:?} - {}",
            code, msg
        )),
    }
}

/// Approve a specific Orbit Station request.
#[update]
pub async fn approve_orbit_request(
    token_canister_id: Principal,
    request_id: String,
    reason: Option<String>,
) -> Result<String, String> {
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or_else(|| "No Orbit Station linked to this token".to_string())
    })?;

    let approval_input = SubmitRequestApprovalInput {
        request_id: request_id.clone(),
        decision: RequestApprovalStatus::Approved,
        reason: reason.or_else(|| Some("Approved via DAOPad backend".to_string())),
    };

    let result: Result<(SubmitRequestApprovalResult,), _> =
        ic_cdk::call(station_id, "submit_request_approval", (approval_input,)).await;

    match result {
        Ok((SubmitRequestApprovalResult::Ok(response),)) => {
            let status = format_request_status(&response.request.status);
            Ok(format!(
                "Request {} approved. New status: {}",
                request_id, status
            ))
        }
        Ok((SubmitRequestApprovalResult::Err(err),)) => Err(format!(
            "Failed to approve request: {}",
            err.message.unwrap_or_else(|| err.code)
        )),
        Err((code, msg)) => Err(format!(
            "Failed to call Orbit Station: {:?} - {}",
            code, msg
        )),
    }
}

/// Reject a specific Orbit Station request.
#[update]
pub async fn reject_orbit_request(
    token_canister_id: Principal,
    request_id: String,
    reason: Option<String>,
) -> Result<String, String> {
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or_else(|| "No Orbit Station linked to this token".to_string())
    })?;

    let rejection_input = SubmitRequestApprovalInput {
        request_id: request_id.clone(),
        decision: RequestApprovalStatus::Rejected,
        reason: reason.or_else(|| Some("Rejected via DAOPad backend".to_string())),
    };

    let result: Result<(SubmitRequestApprovalResult,), _> =
        ic_cdk::call(station_id, "submit_request_approval", (rejection_input,)).await;

    match result {
        Ok((SubmitRequestApprovalResult::Ok(response),)) => {
            let status = format_request_status(&response.request.status);
            Ok(format!(
                "Request {} rejected. New status: {}",
                request_id, status
            ))
        }
        Ok((SubmitRequestApprovalResult::Err(err),)) => Err(format!(
            "Failed to reject request: {}",
            err.message.unwrap_or_else(|| err.code)
        )),
        Err((code, msg)) => Err(format!(
            "Failed to call Orbit Station: {:?} - {}",
            code, msg
        )),
    }
}

/// Batch approve multiple requests sequentially.
#[update]
pub async fn batch_approve_requests(
    token_canister_id: Principal,
    request_ids: Vec<String>,
) -> Result<Vec<String>, String> {
    let mut results = Vec::with_capacity(request_ids.len());

    for request_id in request_ids {
        match approve_orbit_request(token_canister_id, request_id.clone(), None).await {
            Ok(message) => results.push(format!("✓ {}: {}", request_id, message)),
            Err(error) => results.push(format!("✗ {}: {}", request_id, error)),
        }
    }

    Ok(results)
}
