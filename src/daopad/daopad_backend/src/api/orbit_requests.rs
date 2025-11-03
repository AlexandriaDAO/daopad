use candid::{CandidType, Deserialize, Principal};
use candid::types::value::IDLValue;
use ic_cdk::update;

// UUID type alias matching Orbit (spec.did line 5)
type UUID = String;
type TimestampRFC3339 = String;

// ------------------------------------------------------------------------------
// TYPE DEFINITIONS (matches Orbit Station spec.did - generated with didc bind)
// ------------------------------------------------------------------------------

// Exact RequestStatusCode from spec.did
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

// Exact RequestStatus from spec.did
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

// DAOPad simplified response types (returned to frontend)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct OrbitApprovalSummary {
    pub approver_id: String,
    pub status: String,
    pub status_detail: Option<String>,
    pub decided_at: String,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct OrbitRequestSummary {
    pub id: String,
    pub title: String,
    pub summary: Option<String>,
    pub status: String,
    pub status_detail: Option<String>,
    pub requested_by: String,
    pub requester_name: Option<String>,
    pub created_at: String,
    pub expiration_dt: String,
    pub approvals: Vec<OrbitApprovalSummary>,
    pub operation: Option<String>,  // Operation type (Transfer, EditUser, etc.)
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ListOrbitRequestsResponse {
    pub requests: Vec<OrbitRequestSummary>,
    pub total: u64,
    pub next_offset: Option<u64>,
}

// Helper to deserialize operation as IDLValue to extract variant name
fn deserialize_operation<'de, D>(deserializer: D) -> Result<IDLValue, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::Error as SerdeError;
    IDLValue::deserialize(deserializer)
        .map_err(|e| D::Error::custom(format!("failed to decode Orbit operation: {e}")))
}

// ✅ FIXED: Field order MUST match Orbit's candid exactly (from didc bind output)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Request {
    pub id: UUID,
    pub status: RequestStatus,  // ✅ Status comes BEFORE title in Orbit's candid!
    pub title: String,
    pub execution_plan: RequestExecutionSchedule,
    pub expiration_dt: TimestampRFC3339,
    pub created_at: TimestampRFC3339,
    pub requested_by: UUID,
    pub summary: Option<String>,
    #[serde(deserialize_with = "deserialize_operation")]
    pub operation: IDLValue,  // Use IDLValue to handle any operation variant
    pub approvals: Vec<RequestApproval>,
}

// Exact ListRequestsInput from spec.did
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
    pub sort_by: Option<ListRequestsSortBy>,  // ✅ FIXED: Now Option<enum> as in spec
    pub only_approvable: bool,
    pub with_evaluation_results: bool,
    pub deduplication_keys: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
}

// PaginationInput from spec.did
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct PaginationInput {
    pub offset: Option<u64>,
    pub limit: Option<u16>,
}

// Sort options from spec.did
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

// Complete operation type enum from spec.did
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum ListRequestsOperationType {
    Transfer(Option<UUID>),
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
    SystemRestore,
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

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct DisplayUser {
    pub id: UUID,
    pub name: String,
}

// Helper to deserialize evaluation_result as IDLValue (we don't use this field)
fn deserialize_evaluation_result<'de, D>(deserializer: D) -> Result<Option<IDLValue>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::Error as SerdeError;
    Option::<IDLValue>::deserialize(deserializer)
        .map_err(|e| D::Error::custom(format!("failed to decode evaluation result: {e}")))
}

// RequestAdditionalInfo with evaluation_result as IDLValue (complex nested type we don't use)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct RequestAdditionalInfo {
    pub id: UUID,
    #[serde(deserialize_with = "deserialize_evaluation_result")]
    pub evaluation_result: Option<IDLValue>,
    pub requester_name: String,
    pub approvers: Vec<DisplayUser>,
}

// ✅ FIXED: Field order matches Orbit's candid exactly
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ListRequestsResultOk {
    pub total: u64,
    pub privileges: Vec<RequestCallerPrivileges>,
    pub requests: Vec<Request>,
    pub next_offset: Option<u64>,
    pub additional_info: Vec<RequestAdditionalInfo>,
}

// Candid Result is represented as an enum variant, not Rust Result type
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum ListRequestsResult {
    Ok(ListRequestsResultOk),
    Err(Error),
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Error {
    pub code: String,
    pub message: Option<String>,
    pub details: Option<Vec<(String, String)>>,
}

// Simple types for experimental endpoint
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SimpleRequest {
    pub id: String,
    pub title: String,
    pub status: String,
}

// ------------------------------------------------------------------------------
// HELPER FUNCTIONS (pure transformations, no manual decoding)
// ------------------------------------------------------------------------------

/// Extract operation type name from IDLValue variant
fn extract_operation_type(op: &IDLValue) -> Option<String> {
    use candid::types::Label;

    if let IDLValue::Variant(variant) = op {
        match &variant.0.id {
            Label::Named(name) => Some(name.clone()),
            _ => None,
        }
    } else {
        None
    }
}

/// Format status enum to string
fn format_status(status: &RequestStatus) -> String {
    match status {
        RequestStatus::Created => "Created",
        RequestStatus::Approved => "Approved",
        RequestStatus::Rejected => "Rejected",
        RequestStatus::Cancelled { .. } => "Cancelled",
        RequestStatus::Scheduled { .. } => "Scheduled",
        RequestStatus::Processing { .. } => "Processing",
        RequestStatus::Completed { .. } => "Completed",
        RequestStatus::Failed { .. } => "Failed",
    }.to_string()
}

/// Extract status detail (reason, timestamp, etc.)
fn extract_status_detail(status: &RequestStatus) -> Option<String> {
    match status {
        RequestStatus::Cancelled { reason } => reason.clone(),
        RequestStatus::Scheduled { scheduled_at } => Some(scheduled_at.clone()),
        RequestStatus::Processing { started_at } => Some(started_at.clone()),
        RequestStatus::Completed { completed_at } => Some(completed_at.clone()),
        RequestStatus::Failed { reason } => reason.clone(),
        _ => None,
    }
}

/// Transform approvals to simplified format
fn transform_approvals(approvals: Vec<RequestApproval>) -> Vec<OrbitApprovalSummary> {
    approvals.into_iter().map(|a| {
        let status = match a.status {
            RequestApprovalStatus::Approved => "Approved",
            RequestApprovalStatus::Rejected => "Rejected",
        }.to_string();

        OrbitApprovalSummary {
            approver_id: a.approver_id,
            status,
            status_detail: a.status_reason,
            decided_at: a.decided_at,
        }
    }).collect()
}

/// Find requester name from additional info
fn find_requester_name(request_id: &str, additional_info: &[RequestAdditionalInfo]) -> Option<String> {
    additional_info
        .iter()
        .find(|info| info.id == request_id)
        .map(|info| info.requester_name.clone())
}

/// Transform Orbit response to DAOPad simplified format
fn transform_orbit_response(orbit: ListRequestsResultOk) -> ListOrbitRequestsResponse {
    ListOrbitRequestsResponse {
        requests: orbit.requests.into_iter().map(|r| {
            OrbitRequestSummary {
                id: r.id.clone(),
                title: r.title,
                summary: r.summary,
                status: format_status(&r.status),
                status_detail: extract_status_detail(&r.status),
                requested_by: r.requested_by.clone(),
                requester_name: find_requester_name(&r.id, &orbit.additional_info),
                created_at: r.created_at,
                expiration_dt: r.expiration_dt,
                approvals: transform_approvals(r.approvals),
                operation: extract_operation_type(&r.operation),
            }
        }).collect(),
        total: orbit.total,
        next_offset: orbit.next_offset,
    }
}

// ------------------------------------------------------------------------------
// ENDPOINTS (using typed ic_cdk::call with proper types!)
// ------------------------------------------------------------------------------

/// Get station ID from storage for a given token canister
fn get_station_id(token_canister_id: Principal) -> Result<Principal, String> {
    crate::api::orbit::get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| format!(
            "No station found for token canister {}. Has the station been initialized?",
            token_canister_id
        ))
}

/// List orbit requests with proper typed deserialization
#[update]
pub async fn list_orbit_requests(
    token_canister_id: Principal,
    filters: ListRequestsInput,
) -> Result<ListOrbitRequestsResponse, String> {
    let station_id = get_station_id(token_canister_id)
        .map_err(|e| {
            ic_cdk::println!("❌ Storage lookup failed for token {}: {}", token_canister_id, e);
            e
        })?;

    ic_cdk::println!(
        "🔍 list_orbit_requests: token={}, station={}, filters={:?}",
        token_canister_id,
        station_id,
        filters
    );

    // ✅ Use TYPED ic_cdk::call now that we have correct types!
    let result: Result<(ListRequestsResult,), _> =
        ic_cdk::call(station_id, "list_requests", (filters,)).await;

    match result {
        Ok((ListRequestsResult::Ok(response),)) => {
            ic_cdk::println!(
                "✅ Orbit returned {} requests (total: {})",
                response.requests.len(),
                response.total
            );
            Ok(transform_orbit_response(response))
        }
        Ok((ListRequestsResult::Err(e),)) => {
            let error_msg = format!(
                "Orbit error: {} - {}",
                e.code,
                e.message.unwrap_or_else(|| "No message".to_string())
            );
            ic_cdk::println!("❌ Orbit error: {}", error_msg);
            Err(error_msg)
        }
        Err((code, msg)) => {
            let error_msg = format!("IC call failed: ({:?}, {})", code, msg);
            ic_cdk::println!("❌ IC call failed: {}", error_msg);
            Err(error_msg)
        }
    }
}

/// EXPERIMENTAL: Ultra-simple request fetching - returns basic info only
/// ✅ FIXED: Removed hardcoded principal, now uses token canister lookup
#[update]
pub async fn get_orbit_requests_simple(token_canister_id: Principal) -> Result<Vec<SimpleRequest>, String> {
    let station_id = get_station_id(token_canister_id)?;

    let filters = ListRequestsInput {
        statuses: None,
        requester_ids: None,
        approver_ids: None,
        created_from_dt: None,
        created_to_dt: None,
        expiration_from_dt: None,
        expiration_to_dt: None,
        operation_types: None,
        paginate: Some(PaginationInput {
            offset: None,
            limit: Some(10),
        }),
        sort_by: None,
        only_approvable: false,
        with_evaluation_results: false,
        deduplication_keys: None,
        tags: None,
    };

    // ✅ Use typed ic_cdk::call
    let result: Result<(ListRequestsResult,), _> =
        ic_cdk::call(station_id, "list_requests", (filters,)).await;

    match result {
        Ok((ListRequestsResult::Ok(response),)) => {
            Ok(response.requests.into_iter().map(|r| SimpleRequest {
                id: r.id,  // ✅ FIXED: Preserve full UUID, no truncation
                title: r.title,
                status: format_status(&r.status),
            }).collect())
        }
        Ok((ListRequestsResult::Err(e),)) => {
            Err(format!(
                "Orbit error: {} - {}",
                e.code,
                e.message.unwrap_or_else(|| "No message".to_string())
            ))
        }
        Err((code, msg)) => {
            Err(format!("IC call failed: ({:?}, {})", code, msg))
        }
    }
}
