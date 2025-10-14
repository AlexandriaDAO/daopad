use candid::types::Label;
use candid::{
    encode_args,
    types::value::{IDLArgs, IDLField, IDLValue},
    CandidType, Deserialize, Principal,
};
use ic_cdk::{api::call::call_raw, update};
use serde::de::Error as SerdeError;
use std::collections::HashMap;

// UUID type alias matching Orbit (spec.did line 5)
type UUID = String;
type TimestampRFC3339 = String;

// Helper utilities for decoding Orbit responses ---------------------------------

fn label_name(label: &Label) -> Option<String> {
    match label {
        Label::Named(name) => Some(name.clone()),
        Label::Id(id) => {
            // Map common Candid hash IDs to their string names
            Some(match *id {
                3736853960 => "Created".to_string(),
                4044063083 => "Completed".to_string(),
                1821510295 => "Approved".to_string(),
                2442362239 => "Rejected".to_string(),
                3456837432 => "Cancelled".to_string(),
                479410653 => "Failed".to_string(),
                1598796536 => "Scheduled".to_string(),
                1131829668 => "Processing".to_string(),
                _ => {
                    // Log unknown hashes for future mapping
                    ic_cdk::println!("Unknown status hash: {} (0x{:x})", id, id);
                    format!("Unknown_{}", id) // More visible fallback
                }
            })
        },
        Label::Unnamed(idx) => Some(idx.to_string()),
    }
}

fn field<'a>(fields: &'a [IDLField], name: &str) -> Option<&'a IDLValue> {
    // Calculate Candid hash for the field name
    let hash = candid_hash(name);

    fields.iter().find_map(|f| match &f.id {
        Label::Named(label) if label == name => Some(&f.val),
        Label::Id(id) if *id == hash => Some(&f.val),
        _ => None,
    })
}

// Helper function to compute Candid hash for field names
fn candid_hash(name: &str) -> u32 {
    let mut hash: u32 = 0;
    for byte in name.bytes() {
        hash = hash.wrapping_mul(223).wrapping_add(byte as u32);
    }
    hash
}

fn idl_to_string(value: &IDLValue) -> Option<String> {
    match value {
        IDLValue::Text(s) => Some(s.clone()),
        IDLValue::Number(n) => Some(n.clone()),
        IDLValue::Float64(n) => Some(n.to_string()),
        IDLValue::Float32(n) => Some(n.to_string()),
        IDLValue::Int(i) => Some(i.to_string()),
        IDLValue::Int64(i) => Some(i.to_string()),
        IDLValue::Int32(i) => Some(i.to_string()),
        IDLValue::Int16(i) => Some(i.to_string()),
        IDLValue::Int8(i) => Some(i.to_string()),
        IDLValue::Nat(n) => Some(n.to_string()),
        IDLValue::Nat64(n) => Some(n.to_string()),
        IDLValue::Nat32(n) => Some(n.to_string()),
        IDLValue::Nat16(n) => Some(n.to_string()),
        IDLValue::Nat8(n) => Some(n.to_string()),
        IDLValue::Principal(p) | IDLValue::Service(p) => Some(p.to_text()),
        IDLValue::Opt(inner) => idl_to_string(inner),
        IDLValue::Null | IDLValue::None | IDLValue::Reserved => None,
        _ => None,
    }
}

fn ignore_operation<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let _ = IDLValue::deserialize(deserializer)
        .map_err(|e| D::Error::custom(format!("failed to decode Orbit operation: {e}")))?;
    Ok(None)
}

fn ignore_evaluation_result<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let _ = IDLValue::deserialize(deserializer)
        .map_err(|e| D::Error::custom(format!("failed to decode evaluation result: {e}")))?;
    Ok(None)
}

fn idl_opt_text(value: &IDLValue) -> Option<String> {
    match value {
        IDLValue::Null | IDLValue::None | IDLValue::Reserved => None,
        IDLValue::Opt(inner) => idl_opt_text(inner),
        _ => idl_to_string(value),
    }
}

fn idl_to_u64(value: &IDLValue) -> Option<u64> {
    idl_to_string(value)?.parse().ok()
}

fn parse_status(value: &IDLValue) -> (String, Option<String>) {
    if let IDLValue::Variant(variant) = value {
        if let Some(label) = label_name(&variant.0.id) {
            let detail = match &variant.0.val {
                IDLValue::Record(fields) => {
                    if label == "Cancelled" {
                        field(fields, "reason").and_then(idl_opt_text)
                    } else if label == "Scheduled" {
                        field(fields, "scheduled_at").and_then(idl_to_string)
                    } else if label == "Processing" {
                        field(fields, "started_at").and_then(idl_to_string)
                    } else if label == "Completed" {
                        field(fields, "completed_at").and_then(idl_to_string)
                    } else if label == "Failed" {
                        field(fields, "reason").and_then(idl_opt_text)
                    } else {
                        None
                    }
                }
                IDLValue::Text(s) => Some(s.clone()),
                _ => None,
            };
            return (label, detail);
        }
    }
    ("Unknown".to_string(), None)
}

fn parse_error_message(value: &IDLValue) -> String {
    if let IDLValue::Record(fields) = value {
        let code = field(fields, "code")
            .and_then(idl_to_string)
            .unwrap_or_else(|| "unknown".to_string());
        let message = field(fields, "message")
            .and_then(idl_opt_text)
            .unwrap_or_else(|| "".to_string());
        let details = field(fields, "details").and_then(|d| {
            if let IDLValue::Vec(entries) = d {
                let rendered: Vec<String> = entries
                    .iter()
                    .filter_map(|entry| {
                        if let IDLValue::Record(fields) = entry {
                            if fields.len() == 2 {
                                let key = fields
                                    .iter()
                                    .find(|f| matches!(f.id, Label::Unnamed(0)))
                                    .and_then(|f| idl_to_string(&f.val))
                                    .unwrap_or_default();
                                let value = fields
                                    .iter()
                                    .find(|f| matches!(f.id, Label::Unnamed(1)))
                                    .and_then(|f| idl_to_string(&f.val))
                                    .unwrap_or_default();
                                if !key.is_empty() || !value.is_empty() {
                                    return Some(format!("{}: {}", key, value));
                                }
                            }
                        }
                        None
                    })
                    .collect();
                if rendered.is_empty() {
                    None
                } else {
                    Some(rendered.join("; "))
                }
            } else {
                None
            }
        });

        return if let Some(details) = details {
            let base = if message.is_empty() {
                code.clone()
            } else {
                message.clone()
            };
            format!("{} ({})", base, details)
        } else if message.is_empty() {
            code
        } else {
            message
        };
    }
    "Orbit Station error".to_string()
}

fn parse_additional_info(value: &IDLValue) -> HashMap<String, String> {
    let mut map = HashMap::new();
    if let IDLValue::Vec(items) = value {
        for item in items {
            if let IDLValue::Record(fields) = item {
                if let Some(id) = field(fields, "id").and_then(idl_to_string) {
                    let name = field(fields, "requester_name")
                        .and_then(idl_to_string)
                        .unwrap_or_default();
                    map.insert(id, name);
                }
            }
        }
    }
    map
}

fn parse_approvals(value: &IDLValue) -> Vec<OrbitApprovalSummary> {
    if let IDLValue::Vec(items) = value {
        items
            .iter()
            .filter_map(|item| {
                if let IDLValue::Record(fields) = item {
                    let approver = field(fields, "approver_id").and_then(idl_to_string)?;
                    let (status, detail) = field(fields, "status")
                        .map(parse_status)
                        .unwrap_or_default();
                    let decided_at = field(fields, "decided_at")
                        .and_then(idl_to_string)
                        .unwrap_or_default();
                    Some(OrbitApprovalSummary {
                        approver_id: approver,
                        status,
                        status_detail: detail,
                        decided_at,
                    })
                } else {
                    None
                }
            })
            .collect()
    } else {
        Vec::new()
    }
}

fn parse_requests(
    value: &IDLValue,
    info_map: &HashMap<String, String>,
) -> Vec<OrbitRequestSummary> {
    if let IDLValue::Vec(items) = value {
        items
            .iter()
            .filter_map(|item| {
                if let IDLValue::Record(fields) = item {
                    let id = field(fields, "id").and_then(idl_to_string)?;
                    let title = field(fields, "title")
                        .and_then(idl_to_string)
                        .unwrap_or_else(|| "Untitled request".to_string());
                    let summary = field(fields, "summary").and_then(idl_opt_text);
                    let requested_by = field(fields, "requested_by")
                        .and_then(idl_to_string)
                        .unwrap_or_default();
                    let created_at = field(fields, "created_at")
                        .and_then(idl_to_string)
                        .unwrap_or_default();
                    let expiration_dt = field(fields, "expiration_dt")
                        .and_then(idl_to_string)
                        .unwrap_or_default();
                    let (status, status_detail) = field(fields, "status")
                        .map(parse_status)
                        .unwrap_or_default();
                    let approvals = field(fields, "approvals")
                        .map(|v| parse_approvals(v))
                        .unwrap_or_default();

                    let requester_name = info_map.get(&id).cloned();

                    Some(OrbitRequestSummary {
                        id,
                        title,
                        summary,
                        status,
                        status_detail,
                        requested_by,
                        requester_name,
                        created_at,
                        expiration_dt,
                        approvals,
                    })
                } else {
                    None
                }
            })
            .collect()
    } else {
        Vec::new()
    }
}

fn parse_list_requests_response(raw_bytes: Vec<u8>) -> Result<ListOrbitRequestsResponse, String> {
    let args = IDLArgs::from_bytes(&raw_bytes)
        .map_err(|e| format!("Failed to parse Orbit response: {e}"))?;
    let value = args
        .args
        .into_iter()
        .next()
        .ok_or_else(|| "Orbit response was empty".to_string())?;

    let variant = match value {
        IDLValue::Variant(variant) => variant,
        _ => return Err("Unexpected Orbit response type".to_string()),
    };

    // Check if it's Ok variant (either by name or by hash)
    // 17724 is the hash of "Ok" in Candid
    let is_ok = match &variant.0.id {
        Label::Named(name) => name == "Ok",
        Label::Id(id) => *id == 17724,  // Candid hash of "Ok"
        _ => false,
    };

    let is_err = match &variant.0.id {
        Label::Named(name) => name == "Err",
        Label::Id(id) => *id == 3456837,  // Candid hash of "Err"
        _ => false,
    };

    if is_ok {
        let record = match &variant.0.val {
            IDLValue::Record(fields) => fields,
            _ => return Err("Orbit returned an unexpected record".to_string()),
        };

        let info_map = field(record, "additional_info")
            .map(|v| parse_additional_info(v))
            .unwrap_or_default();

        let requests = field(record, "requests")
            .map(|v| parse_requests(v, &info_map))
            .unwrap_or_default();

        let total = field(record, "total").and_then(idl_to_u64).unwrap_or(0);

        let next_offset = field(record, "next_offset").and_then(idl_to_u64);

        Ok(ListOrbitRequestsResponse {
            requests,
            total,
            next_offset,
        })
    } else if is_err {
        Err(parse_error_message(&variant.0.val))
    } else {
        let label = label_name(&variant.0.id).unwrap_or_else(|| "Unknown".to_string());
        Err(format!("Orbit returned unexpected variant: {label}"))
    }
}

fn parse_submit_response(raw_bytes: Vec<u8>) -> Result<(), String> {
    let args = IDLArgs::from_bytes(&raw_bytes)
        .map_err(|e| format!("Failed to parse Orbit approval response: {e}"))?;
    let value = args
        .args
        .into_iter()
        .next()
        .ok_or_else(|| "Orbit response was empty".to_string())?;

    if let IDLValue::Variant(variant) = value {
        // Check if it's Ok variant (either by name or by hash)
        let is_ok = match &variant.0.id {
            Label::Named(name) => name == "Ok",
            Label::Id(id) => *id == 17724,  // Candid hash of "Ok"
            _ => false,
        };

        let is_err = match &variant.0.id {
            Label::Named(name) => name == "Err",
            Label::Id(id) => *id == 3456837,  // Candid hash of "Err"
            _ => false,
        };

        if is_ok {
            Ok(())
        } else if is_err {
            Err(parse_error_message(&variant.0.val))
        } else {
            let label = label_name(&variant.0.id).unwrap_or_else(|| "Unknown".to_string());
            Err(format!("Orbit returned unexpected variant: {label}"))
        }
    } else {
        Err("Unexpected Orbit response type".to_string())
    }
}

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
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ListOrbitRequestsResponse {
    pub requests: Vec<OrbitRequestSummary>,
    pub total: u64,
    pub next_offset: Option<u64>,
}

// Complete RequestOperation variant (spec.did lines 1030-1099)
// Use IDLValue so we can accept any variant Orbit returns

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Request {
    pub id: UUID,
    pub title: String,
    pub summary: Option<String>,
    #[serde(default, deserialize_with = "ignore_operation")]
    pub operation: Option<String>,
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
    #[serde(default, deserialize_with = "ignore_evaluation_result")]
    pub evaluation_result: Option<String>,
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
) -> Result<ListOrbitRequestsResponse, String> {
    // Get station ID from storage
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or_else(|| {
                format!(
                    "No Orbit Station linked to token {}",
                    token_canister_id.to_text()
                )
            })
    })?;

    let args =
        encode_args((filters,)).map_err(|e| format!("Failed to encode Orbit request: {e}"))?;

    let raw_bytes = call_raw(station_id, "list_requests", args, 0)
        .await
        .map_err(|(code, msg)| format!("IC call failed: ({:?}, {})", code, msg))?;

    parse_list_requests_response(raw_bytes)
}

// ❌ REMOVED: submit_request_approval - replaced by liquid democracy voting
// All Orbit requests now go through vote_on_orbit_request in proposals/orbit_requests.rs

// Simple types for experimental endpoint
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SimpleRequest {
    pub id: String,
    pub title: String,
    pub status: String,
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
        sort_by: None,
        only_approvable: false,
        with_evaluation_results: false,
        deduplication_keys: None,
        tags: None,
    };

    let args = encode_args((filters,))
        .map_err(|e| format!("Failed to encode request: {}", e))?;

    let raw_bytes = call_raw(station_id, "list_requests", args, 0)
        .await
        .map_err(|(code, msg)| format!("Call failed: ({:?}, {})", code, msg))?;

    // Use our existing parser which now handles hash IDs
    let response = parse_list_requests_response(raw_bytes)?;

    // Convert to simple format
    let simple_requests = response.requests.into_iter().map(|r| {
        SimpleRequest {
            id: r.id.chars().take(8).collect(),  // Shorten ID for display
            title: r.title,
            status: r.status,
        }
    }).collect();

    Ok(simple_requests)
}
