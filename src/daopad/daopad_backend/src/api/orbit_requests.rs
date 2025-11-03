use candid::{CandidType, Deserialize, Principal, encode_args};
use candid::types::value::{IDLValue, IDLArgs};
use ic_cdk::{update, api::call::call_raw};
use serde::de::Error as SerdeError;

// UUID type alias matching Orbit (spec.did line 5)
type UUID = String;
type TimestampRFC3339 = String;

// ------------------------------------------------------------------------------
// TYPE DEFINITIONS (matches Orbit Station spec.did)
// ------------------------------------------------------------------------------

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

// Helper to deserialize operation but just extract variant name
fn deserialize_operation<'de, D>(deserializer: D) -> Result<IDLValue, D::Error>
where
    D: serde::Deserializer<'de>,
{
    IDLValue::deserialize(deserializer)
        .map_err(|e| D::Error::custom(format!("failed to decode Orbit operation: {e}")))
}

// Complete Request type matching Orbit's actual response (spec.did)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Request {
    pub id: UUID,
    pub title: String,
    pub summary: Option<String>,
    #[serde(deserialize_with = "deserialize_operation")]
    pub operation: IDLValue,  // ✅ Use IDLValue to handle any operation type
    pub requested_by: UUID,
    pub approvals: Vec<RequestApproval>,
    pub created_at: TimestampRFC3339,
    pub status: RequestStatus,
    pub expiration_dt: TimestampRFC3339,
    pub execution_plan: RequestExecutionSchedule,
    // NOTE: deduplication_key and tags are NOT in Orbit's response type, only in input type
}

// Complete operation type enum for OUTPUT (what Orbit returns)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum RequestOperationOutput {
    Transfer(TransferOperationOutput),
    AddAccount(AddAccountOperationOutput),
    EditAccount(EditAccountOperationOutput),
    AddUser(AddUserOperationOutput),
    EditUser(EditUserOperationOutput),
    AddAddressBookEntry(AddAddressBookEntryOperationOutput),
    EditAddressBookEntry(EditAddressBookEntryOperationOutput),
    RemoveAddressBookEntry(RemoveAddressBookEntryOperationOutput),
    AddUserGroup(AddUserGroupOperationOutput),
    EditUserGroup(EditUserGroupOperationOutput),
    RemoveUserGroup(RemoveUserGroupOperationOutput),
    SystemUpgrade(SystemUpgradeOperationOutput),
    SystemRestore(SystemRestoreOperationOutput),
    ChangeExternalCanister(ChangeExternalCanisterOperationOutput),
    ConfigureExternalCanister(ConfigureExternalCanisterOperationOutput),
    CreateExternalCanister(CreateExternalCanisterOperationOutput),
    CallExternalCanister(CallExternalCanisterOperationOutput),
    FundExternalCanister(FundExternalCanisterOperationOutput),
    MonitorExternalCanister(MonitorExternalCanisterOperationOutput),
    SnapshotExternalCanister(SnapshotExternalCanisterOperationOutput),
    RestoreExternalCanister(RestoreExternalCanisterOperationOutput),
    PruneExternalCanister(PruneExternalCanisterOperationOutput),
    EditPermission(EditPermissionOperationOutput),
    AddRequestPolicy(AddRequestPolicyOperationOutput),
    EditRequestPolicy(EditRequestPolicyOperationOutput),
    RemoveRequestPolicy(RemoveRequestPolicyOperationOutput),
    ManageSystemInfo(ManageSystemInfoOperationOutput),
    SetDisasterRecovery(SetDisasterRecoveryOperationOutput),
    AddAsset(AddAssetOperationOutput),
    EditAsset(EditAssetOperationOutput),
    RemoveAsset(RemoveAssetOperationOutput),
    AddNamedRule(AddNamedRuleOperationOutput),
    EditNamedRule(EditNamedRuleOperationOutput),
    RemoveNamedRule(RemoveNamedRuleOperationOutput),
}

// Operation output types (simplified - only what we need to extract operation type)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TransferOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AddAccountOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct EditAccountOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AddUserOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct EditUserOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AddAddressBookEntryOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct EditAddressBookEntryOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct RemoveAddressBookEntryOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AddUserGroupOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct EditUserGroupOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct RemoveUserGroupOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SystemUpgradeOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SystemRestoreOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ChangeExternalCanisterOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ConfigureExternalCanisterOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct CreateExternalCanisterOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct CallExternalCanisterOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct FundExternalCanisterOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct MonitorExternalCanisterOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SnapshotExternalCanisterOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct RestoreExternalCanisterOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct PruneExternalCanisterOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct EditPermissionOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AddRequestPolicyOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct EditRequestPolicyOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct RemoveRequestPolicyOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ManageSystemInfoOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SetDisasterRecoveryOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AddAssetOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct EditAssetOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct RemoveAssetOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AddNamedRuleOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct EditNamedRuleOperationOutput {}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct RemoveNamedRuleOperationOutput {}

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
    #[serde(default)]
    pub sort_by: (),  // Removed - Option<enum> causes OptionVisitor errors in Candid 0.10.18
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
    Transfer(Option<UUID>), // Optional account ID filter
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

// This matches Orbit's actual return type
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct DisplayUser {
    pub id: UUID,
    pub name: String,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct RequestAdditionalInfo {
    pub id: UUID,
    pub requester_name: String,
    pub approvers: Vec<DisplayUser>,
    #[serde(default)]
    pub evaluation_result: Option<IDLValue>,  // Use IDLValue for flexible deserialization
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ListRequestsResponse {
    pub requests: Vec<Request>,
    pub next_offset: Option<u64>,
    pub total: u64,
    pub privileges: Vec<RequestCallerPrivileges>,
    pub additional_info: Vec<RequestAdditionalInfo>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum ListRequestsResult {
    Ok(ListRequestsResponse),
    Err(Error),
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ErrorDetail(pub String, pub String);

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Error {
    pub code: String,
    pub message: Option<String>,
    pub details: Option<Vec<ErrorDetail>>,
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
        // Extract variant name from label
        match &variant.0.id {
            Label::Named(name) => Some(name.clone()),
            Label::Id(_) => {
                // For hash-based labels, return None (shouldn't happen with proper deserialization)
                None
            }
            Label::Unnamed(_) => None,
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
fn transform_orbit_response(orbit: ListRequestsResponse) -> ListOrbitRequestsResponse {
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
// ENDPOINTS (using typed ic_cdk::call, no manual decoding!)
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
    // Get station ID from storage
    let station_id = get_station_id(token_canister_id)
        .map_err(|e| {
            ic_cdk::println!(
                "❌ Storage lookup failed for token {}: {}",
                token_canister_id,
                e
            );
            e
        })?;

    ic_cdk::println!(
        "🔍 list_orbit_requests: token={}, station={}, filters={:?}",
        token_canister_id,
        station_id,
        filters
    );

    // ✅ Use call_raw but decode with proper types (not manual parsing!)
    let args = encode_args((filters,))
        .map_err(|e| format!("Failed to encode request: {}", e))?;

    let raw_bytes = call_raw(station_id, "list_requests", args, 0)
        .await
        .map_err(|(code, msg)| format!("IC call failed: ({:?}, {})", code, msg))?;

    // ✅ Decode using Candid's proper deserializer (no manual parsing!)
    let args = IDLArgs::from_bytes(&raw_bytes)
        .map_err(|e| format!("Failed to parse Candid bytes: {}", e))?;

    // Deserialize using serde's Deserialize trait on IDLValue
    let idl_value = args.args.into_iter()
        .next()
        .ok_or_else(|| "Empty response from Orbit".to_string())?;

    let result: ListRequestsResult = serde::Deserialize::deserialize(idl_value)
        .map_err(|e: candid::Error| format!("Failed to deserialize response: {}", e))?;

    match result {
        ListRequestsResult::Ok(response) => {
            ic_cdk::println!(
                "✅ Orbit returned {} requests (total: {})",
                response.requests.len(),
                response.total
            );
            // Transform Orbit response to DAOPad simplified format
            Ok(transform_orbit_response(response))
        }
        ListRequestsResult::Err(e) => {
            let error_msg = format!(
                "Orbit error: {} - {}",
                e.code,
                e.message.unwrap_or_else(|| "No message".to_string())
            );
            ic_cdk::println!("❌ Orbit error: {}", error_msg);
            Err(error_msg)
        }
    }
}

/// EXPERIMENTAL: Ultra-simple request fetching - returns basic info only
#[update]
pub async fn get_orbit_requests_simple() -> Result<Vec<SimpleRequest>, String> {
    // Use the ALEX token station directly
    let station_id = Principal::from_text("fec7w-zyaaa-aaaaa-qaffq-cai")
        .map_err(|e| format!("Failed to parse station ID: {}", e))?;

    // Minimal filter - get all statuses for now
    let filters = ListRequestsInput {
        statuses: None,  // Get all statuses
        requester_ids: None,
        approver_ids: None,
        created_from_dt: None,
        created_to_dt: None,
        expiration_from_dt: None,
        expiration_to_dt: None,
        operation_types: None,
        paginate: Some(PaginationInput {
            offset: None,
            limit: Some(10),  // Get 10 requests
        }),
        sort_by: (),
        only_approvable: false,
        with_evaluation_results: false,
        deduplication_keys: None,
        tags: None,
    };

    // ✅ Use call_raw but decode with proper types
    let args = encode_args((filters,))
        .map_err(|e| format!("Failed to encode request: {}", e))?;

    let raw_bytes = call_raw(station_id, "list_requests", args, 0)
        .await
        .map_err(|(code, msg)| format!("IC call failed: ({:?}, {})", code, msg))?;

    // ✅ Decode using Candid's proper deserializer
    let args = IDLArgs::from_bytes(&raw_bytes)
        .map_err(|e| format!("Failed to parse Candid bytes: {}", e))?;

    // Deserialize using serde's Deserialize trait on IDLValue
    let idl_value = args.args.into_iter()
        .next()
        .ok_or_else(|| "Empty response from Orbit".to_string())?;

    let result: ListRequestsResult = serde::Deserialize::deserialize(idl_value)
        .map_err(|e: candid::Error| format!("Failed to deserialize response: {}", e))?;

    match result {
        ListRequestsResult::Ok(response) => {
            Ok(response.requests.into_iter().map(|r| SimpleRequest {
                id: r.id.chars().take(8).collect(),  // Keep first 8 chars for backward compat
                title: r.title,
                status: format_status(&r.status),
            }).collect())
        }
        ListRequestsResult::Err(e) => {
            Err(format!(
                "Orbit error: {} - {}",
                e.code,
                e.message.unwrap_or_else(|| "No message".to_string())
            ))
        }
    }
}
