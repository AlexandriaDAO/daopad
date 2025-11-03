use candid::{CandidType, Deserialize, Principal, Reserved};
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

// ✅ FIXED: Field order MUST match Orbit's candid exactly (from didc bind output)
// Using Reserved for operation field since we don't need to parse its complex structure
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
    pub operation: Reserved,  // Use Reserved - can deserialize any Candid type
    pub approvals: Vec<RequestApproval>,
}

// Exact ListRequestsInput from spec.did
// CRITICAL: Field order MUST match Candid exactly (from didc bind)!
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ListRequestsInput {
    pub sort_by: Option<ListRequestsSortBy>,           // 1st
    pub with_evaluation_results: bool,                 // 2nd
    pub expiration_from_dt: Option<TimestampRFC3339>,  // 3rd
    pub created_to_dt: Option<TimestampRFC3339>,       // 4th
    pub statuses: Option<Vec<RequestStatusCode>>,      // 5th
    pub approver_ids: Option<Vec<UUID>>,               // 6th
    pub expiration_to_dt: Option<TimestampRFC3339>,    // 7th
    pub paginate: Option<PaginationInput>,             // 8th
    pub requester_ids: Option<Vec<UUID>>,              // 9th
    pub operation_types: Option<Vec<ListRequestsOperationType>>, // 10th
    pub only_approvable: bool,                         // 11th
    pub created_from_dt: Option<TimestampRFC3339>,     // 12th
    // NOTE: tags and deduplication_keys not in didc bind output
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

// RequestAdditionalInfo with evaluation_result as Reserved (complex nested type we don't use)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct RequestAdditionalInfo {
    pub id: UUID,
    pub evaluation_result: Option<Reserved>,  // Use Reserved for complex type we don't need
    pub requester_name: String,
    pub approvers: Vec<DisplayUser>,
}

// ✅ CRITICAL FIX: Field order MUST match DID file EXACTLY (not didc bind output!)
// From orbit_station.did: requests, total, next_offset, privileges, additional_info
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ListRequestsResultOk {
    pub requests: Vec<Request>,          // 1st in DID
    pub total: u64,                       // 2nd in DID
    pub next_offset: Option<u64>,         // 3rd in DID
    pub privileges: Vec<RequestCallerPrivileges>,  // 4th in DID
    pub additional_info: Vec<RequestAdditionalInfo>,  // 5th in DID
}

// ✅ CRITICAL FIX: Candid Result type is std::result::Result, not a custom enum!
// This is the actual type returned by Orbit's list_requests endpoint
pub type ListRequestsResult = std::result::Result<ListRequestsResultOk, Error>;

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

/// Extract operation type name - Reserved doesn't store data, so we can't extract it
/// Returns None since we're using Reserved type for operation
///
/// TODO(P1): Implement two-pass hybrid approach to extract operation types:
/// 1. Use call_raw to get raw Candid bytes
/// 2. Parse with IDLArgs to extract operation variant names into HashMap<request_id, operation_type>
/// 3. Also do typed deserialization with Reserved (which works reliably)
/// 4. Inject operation types back into Request structs before transforming
///
/// BLOCKER DISCOVERED: Candid API issue when accessing VariantValue fields
/// - variant_value.1 returns type error "cannot deref type u64" instead of Box<IDLValue>
/// - Suggests VariantValue struct definition may have changed in current candid version
/// - Need to investigate candid crate version and VariantValue API
/// - May need to use alternative API (methods instead of field access)
///
/// This is needed because frontend useProposal hook maps "Unknown" → Transfer,
/// which could cause incorrect proposal creation for non-Transfer operations.
/// See PR #146 review comments and GitHub issue for details.
fn extract_operation_type(_op: &Reserved) -> Option<String> {
    // Reserved type doesn't store the actual data, so we can't extract the variant name
    // Trade-off: P0 (deserialization works) vs P1 (operation type info)
    None
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
        Ok((Ok(response),)) => {
            ic_cdk::println!(
                "✅ Orbit returned {} requests (total: {})",
                response.requests.len(),
                response.total
            );
            Ok(transform_orbit_response(response))
        }
        Ok((Err(e),)) => {
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
        sort_by: None,
        with_evaluation_results: false,
        expiration_from_dt: None,
        created_to_dt: None,
        statuses: None,
        approver_ids: None,
        expiration_to_dt: None,
        paginate: Some(PaginationInput {
            offset: None,
            limit: Some(10),
        }),
        requester_ids: None,
        operation_types: None,
        only_approvable: false,
        created_from_dt: None,
    };

    // ✅ Use typed ic_cdk::call
    let result: Result<(ListRequestsResult,), _> =
        ic_cdk::call(station_id, "list_requests", (filters,)).await;

    match result {
        Ok((Ok(response),)) => {
            Ok(response.requests.into_iter().map(|r| SimpleRequest {
                id: r.id,  // ✅ FIXED: Preserve full UUID, no truncation
                title: r.title,
                status: format_status(&r.status),
            }).collect())
        }
        Ok((Err(e),)) => {
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
