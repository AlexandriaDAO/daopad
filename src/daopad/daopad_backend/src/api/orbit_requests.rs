use candid::{CandidType, Deserialize, Principal};
use ic_cdk::update;

// UUID type alias matching Orbit (spec.did line 5)
type UUID = String;
type TimestampRFC3339 = String;

// Exact RequestStatus from spec.did lines 280-300
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum RequestStatus {
    Created,
    Approved,
    Rejected,
    Cancelled { reason: Option<String> },
    Scheduled { scheduled_at: TimestampRFC3339 },
    Processing { started_at: TimestampRFC3339 },
    Completed { completed_at: TimestampRFC3339 },
    Failed { reason: Option<String> },
}

// Exact RequestStatusCode from spec.did lines 302-311
#[derive(CandidType, Deserialize, Clone, Debug)]
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

// Exact RequestExecutionSchedule from spec.did
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum RequestExecutionSchedule {
    Immediate,
    Scheduled { execution_time: TimestampRFC3339 },
}

// Exact RequestApproval structure
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct RequestApproval {
    pub approver_id: UUID,
    pub status: RequestApprovalStatus,
    pub status_reason: Option<String>,
    pub decided_at: TimestampRFC3339,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum RequestApprovalStatus {
    Approved,
    Rejected,
}

// Complete RequestOperation variant (spec.did lines 1030-1099)
// Using candid reserved type to avoid decode issues
use candid::Reserved;

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Request {
    pub id: UUID,
    pub title: String,
    pub summary: Option<String>,
    pub operation: Reserved,  // Use Reserved to accept any candid value
    pub requested_by: UUID,
    pub approvals: Vec<RequestApproval>,
    pub created_at: TimestampRFC3339,
    pub status: RequestStatus,
    pub expiration_dt: TimestampRFC3339,
    pub execution_plan: RequestExecutionSchedule,
    pub deduplication_key: Option<String>,
    pub tags: Vec<String>,
}

// Exact ListRequestsInput from spec.did lines 1442-1471
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ListRequestsInput {
    pub requester_ids: Option<Vec<UUID>>,
    pub approver_ids: Option<Vec<UUID>>,
    pub statuses: Option<Vec<RequestStatusCode>>,
    pub operation_types: Option<Vec<ListRequestsOperationType>>,
    pub expiration_from_dt: Option<TimestampRFC3339>,
    pub expiration_to_dt: Option<TimestampRFC3339>,
    pub created_from_dt: Option<TimestampRFC3339>,
    pub created_to_dt: Option<TimestampRFC3339>,
    pub paginate: Option<PaginationInput>,
    pub sort_by: Option<ListRequestsSortBy>,
    pub only_approvable: bool,
    pub with_evaluation_results: bool,
    pub deduplication_keys: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
}

// PaginationInput from spec.did lines 12-19
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct PaginationInput {
    pub offset: Option<u64>,
    pub limit: Option<u16>,
}

// Sort options from spec.did lines 1432-1439
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum ListRequestsSortBy {
    CreatedAt(SortByDirection),
    ExpirationDt(SortByDirection),
    LastModificationDt(SortByDirection),
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum SortByDirection {
    Asc,
    Desc,
}

// Complete operation type enum from spec.did lines 1352-1430
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum ListRequestsOperationType {
    Transfer(Option<UUID>),  // Optional account ID filter
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

// Additional types needed for responses
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct RequestCallerPrivileges {
    pub id: UUID,
    pub can_approve: bool,
}

// This matches Orbit's actual return type
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct DisplayUser {
    pub id: UUID,
    pub name: String,
    pub groups: Vec<UUID>, // Groups are UUIDs in actual response
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct RequestAdditionalInfo {
    pub id: UUID,
    pub requester_name: String,
    pub approvers: Vec<DisplayUser>,
    pub evaluation_result: Option<Reserved>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ListRequestsResponse {
    pub requests: Vec<Request>,
    pub total: u64,
    pub next_offset: Option<u64>,
    pub privileges: Vec<RequestCallerPrivileges>,
    pub additional_info: Vec<RequestAdditionalInfo>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum ListRequestsResult {
    Ok(ListRequestsResponse),
    Err(Error),
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Error {
    pub code: String,
    pub message: Option<String>,
    pub details: Option<Vec<(String, String)>>,
}

// Get request types
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct GetRequestInput {
    pub request_id: UUID,
    pub with_full_info: Option<bool>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct GetRequestResponse {
    pub request: Request,
    pub privileges: RequestCallerPrivileges,
    pub additional_info: RequestAdditionalInfo,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum GetRequestResult {
    Ok(GetRequestResponse),
    Err(Error),
}

// Submit approval types
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SubmitRequestApprovalInput {
    pub request_id: UUID,
    pub decision: RequestApprovalStatus,
    pub reason: Option<String>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SubmitRequestApprovalResponse {
    pub request: Request,
    pub privileges: RequestCallerPrivileges,
    pub additional_info: RequestAdditionalInfo,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum SubmitRequestApprovalResult {
    Ok(SubmitRequestApprovalResponse),
    Err(Error),
}

use crate::storage::state::TOKEN_ORBIT_STATIONS;
use crate::types::StorablePrincipal;

/// List all requests from Orbit Station with domain filtering
///
/// This method acts as an admin proxy, allowing DAOPad to query
/// all requests regardless of user permissions.
#[update]
pub async fn list_orbit_requests(
    token_canister_id: Principal,
    filters: ListRequestsInput,
) -> Result<ListRequestsResponse, String> {
    // Get station ID from storage
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or_else(|| format!(
                "No Orbit Station linked to token {}",
                token_canister_id.to_text()
            ))
    })?;

    // Make inter-canister call with exact Orbit types
    let result: (ListRequestsResult,) = ic_cdk::call(
        station_id,
        "list_requests",
        (filters,)
    ).await.map_err(|e| format!("IC call failed: {:?}", e))?;

    // Handle Orbit's tagged response enum
    match result.0 {
        ListRequestsResult::Ok(response) => Ok(response),
        ListRequestsResult::Err(err) => {
            let message = err
                .message
                .clone()
                .unwrap_or_else(|| err.code.clone());
            Err(format!(
                "Orbit Station error (code: {}): {}",
                err.code, message
            ))
        }
    }
}

/// Get a single request by ID
#[update]
pub async fn get_orbit_request(
    token_canister_id: Principal,
    request_id: String,
) -> Result<GetRequestResponse, String> {
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or_else(|| "No Orbit Station linked to this token".to_string())
    })?;

    let input = GetRequestInput {
        request_id,
        with_full_info: Some(true),
    };

    let result: (GetRequestResult,) = ic_cdk::call(
        station_id,
        "get_request",
        (input,)
    ).await.map_err(|e| format!("IC call failed: {:?}", e))?;

    match result.0 {
        GetRequestResult::Ok(response) => Ok(response),
        GetRequestResult::Err(err) => {
            let message = err
                .message
                .clone()
                .unwrap_or_else(|| err.code.clone());
            Err(format!("Failed to get request: {}", message))
        }
    }
}

/// Submit approval decision for a request
#[update]
pub async fn submit_request_approval(
    token_canister_id: Principal,
    request_id: String,
    decision: RequestApprovalStatus,
    reason: Option<String>,
) -> Result<SubmitRequestApprovalResponse, String> {
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or_else(|| "No Orbit Station linked to this token".to_string())
    })?;

    let input = SubmitRequestApprovalInput {
        request_id,
        decision,
        reason,
    };

    let result: (SubmitRequestApprovalResult,) = ic_cdk::call(
        station_id,
        "submit_request_approval",
        (input,)
    ).await.map_err(|e| format!("IC call failed: {:?}", e))?;

    match result.0 {
        SubmitRequestApprovalResult::Ok(response) => Ok(response),
        SubmitRequestApprovalResult::Err(err) => {
            let message = err
                .message
                .clone()
                .unwrap_or_else(|| err.code.clone());
            Err(format!("Failed to submit approval: {}", message))
        }
    }
}
