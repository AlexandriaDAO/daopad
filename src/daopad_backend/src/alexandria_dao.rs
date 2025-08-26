use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::call::CallResult;
use serde::Serialize;
use std::cell::RefCell;

// Alexandria Orbit Station Canister ID
const ALEXANDRIA_STATION_ID: &str = "fec7w-zyaaa-aaaaa-qaffq-cai";

// Cache for proposals
thread_local! {
    static PROPOSAL_CACHE: RefCell<ProposalCache> = RefCell::new(ProposalCache::new());
}

#[derive(CandidType, Deserialize, Clone)]
struct ProposalCache {
    proposals: Vec<ProposalSummary>,
    last_updated: Option<u64>,
    ttl_seconds: u64,
}

impl ProposalCache {
    fn new() -> Self {
        Self {
            proposals: Vec::new(),
            last_updated: None,
            ttl_seconds: 300, // 5 minutes
        }
    }

    fn is_valid(&self) -> bool {
        if let Some(last_updated) = self.last_updated {
            let now = ic_cdk::api::time() / 1_000_000_000; // Convert to seconds
            (now - last_updated) < self.ttl_seconds
        } else {
            false
        }
    }

    fn update(&mut self, proposals: Vec<ProposalSummary>) {
        self.proposals = proposals;
        self.last_updated = Some(ic_cdk::api::time() / 1_000_000_000);
    }
}

// Types for Alexandria DAO integration
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct ProposalSummary {
    pub id: String,
    pub title: String,
    pub operation_type: String,
    pub status: String,
    pub created_at: String,
    pub approval_count: u32,
    pub required_approvals: u32,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct ProposalDetails {
    pub id: String,
    pub title: String,
    pub summary: Option<String>,
    pub operation_type: String,
    pub status: String,
    pub created_at: String,
    pub expiration_dt: Option<String>,
    pub requester: String,
    pub approvals: Vec<ApprovalRecord>,
    pub rejections: Vec<ApprovalRecord>,
    pub operation_details: String, // JSON string of operation-specific data
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct ApprovalRecord {
    pub user_id: String,
    pub decided_at: String,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ProposalFilter {
    pub status: Option<String>,
    pub operation_type: Option<String>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
}

// Orbit Station types (matching the actual interface)
#[derive(CandidType, Deserialize)]
struct ListRequestsInput {
    requester_ids: Option<Vec<String>>,
    approver_ids: Option<Vec<String>>,
    statuses: Option<Vec<RequestStatusCode>>,
    operation_types: Option<Vec<ListRequestsOperationType>>,
    expiration_from_dt: Option<String>,
    expiration_to_dt: Option<String>,
    created_from_dt: Option<String>,
    created_to_dt: Option<String>,
    paginate: Option<PaginationInput>,
    sort_by: Option<ListRequestsSortBy>,
    only_approvable: bool,
    with_evaluation_results: bool,
}

#[derive(CandidType, Deserialize)]
enum RequestStatusCode {
    Created,
    Approved,
    Rejected,
    Cancelled,
    Scheduled,
    Processing,
    Completed,
    Failed,
}

#[derive(CandidType, Deserialize)]
enum ListRequestsOperationType {
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
    EditPermission,
    AddRequestPolicy,
    EditRequestPolicy,
    RemoveRequestPolicy,
    SetDisasterRecovery,
    ManageSystemInfo,
    ChangeAsset,
    AddAsset,
    RemoveAsset,
    NamedRule,
    AddNamedRule,
    RemoveNamedRule,
    EditAsset,
    EditNamedRule,
}

#[derive(CandidType, Deserialize)]
enum ListRequestsSortBy {
    CreationDt(SortByDirection),
    ExpirationDt(SortByDirection),
    LastModificationDt(SortByDirection),
}

#[derive(CandidType, Deserialize)]
enum SortByDirection {
    Asc,
    Desc,
}

#[derive(CandidType, Deserialize)]
struct PaginationInput {
    offset: Option<u64>,
    limit: Option<u16>,
}

#[derive(CandidType, Deserialize)]
struct Request {
    id: String,
    title: String,
    summary: Option<String>,
    operation: RequestOperation,
    requested_by: String,
    approvals: Vec<RequestApproval>,
    created_at: String,
    status: RequestStatus,
    expiration_dt: String,
    execution_plan: RequestExecutionSchedule,
}

#[derive(CandidType, Deserialize)]
enum RequestExecutionSchedule {
    Immediate,
    Scheduled { scheduled_at: String },
}

#[derive(CandidType, Deserialize)]
enum RequestOperation {
    Transfer(TransferOperation),
    EditAccount(EditAccountOperation),
    AddAccount(AddAccountOperation),
    AddUser(AddUserOperation),
    EditUser(EditUserOperation),
    AddAddressBookEntry(AddAddressBookEntryOperation),
    EditAddressBookEntry(EditAddressBookEntryOperation),
    RemoveAddressBookEntry(RemoveAddressBookEntryOperation),
    AddUserGroup(AddUserGroupOperation),
    EditUserGroup(EditUserGroupOperation),
    RemoveUserGroup(RemoveUserGroupOperation),
    SystemUpgrade(SystemUpgradeOperation),
    SetDisasterRecovery(SetDisasterRecoveryOperation),
    ChangeExternalCanister(ChangeExternalCanisterOperation),
    CreateExternalCanister(CreateExternalCanisterOperation),
    CallExternalCanister(CallExternalCanisterOperation),
    ConfigureExternalCanister(ConfigureExternalCanisterOperation),
    FundExternalCanister(FundExternalCanisterOperation),
    EditPermission(EditPermissionOperation),
    AddRequestPolicy(AddRequestPolicyOperation),
    EditRequestPolicy(EditRequestPolicyOperation),
    RemoveRequestPolicy(RemoveRequestPolicyOperation),
    ManageSystemInfo(ManageSystemInfoOperation),
    ChangeAsset(ChangeAssetOperation),
    AddAsset(AddAssetOperation),
    RemoveAsset(RemoveAssetOperation),
    NamedRule(NamedRuleOperation),
    AddNamedRule(AddNamedRuleOperation),
    RemoveNamedRule(RemoveNamedRuleOperation),
    EditAsset(EditAssetOperation),
    EditNamedRule(EditNamedRuleOperation),
}

// Define minimal operation types (we'll only fully define what we need)
#[derive(CandidType, Deserialize)]
struct ManageSystemInfoOperation {}
#[derive(CandidType, Deserialize)]
struct TransferOperation {}
#[derive(CandidType, Deserialize)]
struct EditAccountOperation {}
#[derive(CandidType, Deserialize)]
struct AddAccountOperation {}
#[derive(CandidType, Deserialize)]
struct AddUserOperation {}
#[derive(CandidType, Deserialize)]
struct EditUserOperation {}
#[derive(CandidType, Deserialize)]
struct AddAddressBookEntryOperation {}
#[derive(CandidType, Deserialize)]
struct EditAddressBookEntryOperation {}
#[derive(CandidType, Deserialize)]
struct RemoveAddressBookEntryOperation {}
#[derive(CandidType, Deserialize)]
struct AddUserGroupOperation {}
#[derive(CandidType, Deserialize)]
struct EditUserGroupOperation {}
#[derive(CandidType, Deserialize)]
struct RemoveUserGroupOperation {}
#[derive(CandidType, Deserialize)]
struct SystemUpgradeOperation {}
#[derive(CandidType, Deserialize)]
struct SetDisasterRecoveryOperation {}
#[derive(CandidType, Deserialize)]
struct ChangeExternalCanisterOperation {}
#[derive(CandidType, Deserialize)]
struct CreateExternalCanisterOperation {}
#[derive(CandidType, Deserialize)]
struct CallExternalCanisterOperation {}
#[derive(CandidType, Deserialize)]
struct ConfigureExternalCanisterOperation {}
#[derive(CandidType, Deserialize)]
struct FundExternalCanisterOperation {}
#[derive(CandidType, Deserialize)]
struct EditPermissionOperation {}
#[derive(CandidType, Deserialize)]
struct AddRequestPolicyOperation {}
#[derive(CandidType, Deserialize)]
struct EditRequestPolicyOperation {}
#[derive(CandidType, Deserialize)]
struct RemoveRequestPolicyOperation {}
#[derive(CandidType, Deserialize)]
struct ChangeAssetOperation {}
#[derive(CandidType, Deserialize)]
struct AddAssetOperation {}
#[derive(CandidType, Deserialize)]
struct RemoveAssetOperation {}
#[derive(CandidType, Deserialize)]
struct NamedRuleOperation {}
#[derive(CandidType, Deserialize)]
struct AddNamedRuleOperation {}
#[derive(CandidType, Deserialize)]
struct RemoveNamedRuleOperation {}
#[derive(CandidType, Deserialize)]
struct EditAssetOperation {}
#[derive(CandidType, Deserialize)]
struct EditNamedRuleOperation {}

#[derive(CandidType, Deserialize)]
enum RequestApprovalStatus {
    Approved,
    Rejected,
}

#[derive(CandidType, Deserialize)]
struct RequestApproval {
    user_id: String,
    decided_at: String,
    decision: RequestApprovalStatus,
    reason: Option<String>,
}

#[derive(CandidType, Deserialize)]
enum RequestStatus {
    Created,
    Approved,
    Rejected,
    Cancelled { reason: Option<String> },
    Scheduled { scheduled_at: String },
    Processing { started_at: String },
    Completed { completed_at: String },
    Failed { reason: Option<String> },
}

#[derive(CandidType, Deserialize)]
enum ListRequestsResult {
    Ok {
        requests: Vec<Request>,
        total: u64,
        next_offset: Option<u64>,
        privileges: Vec<RequestCallerPrivileges>,
        additional_info: Vec<RequestAdditionalInfo>,
    },
    Err(Error),
}

#[derive(CandidType, Deserialize, Debug)]
struct Error {
    code: String,
    message: Option<String>,
    details: Option<Vec<(String, String)>>,
}

#[derive(CandidType, Deserialize)]
struct RequestCallerPrivileges {
    id: String,
    can_approve: bool,
}

#[derive(CandidType, Deserialize)]
struct RequestAdditionalInfo {
    id: String,
    requester_name: String,
    approvers: Vec<DisplayUser>,
    evaluation_result: Option<RequestEvaluationResult>,
}

#[derive(CandidType, Deserialize)]
struct DisplayUser {
    id: String,
    name: String,
}

#[derive(CandidType, Deserialize)]
struct RequestEvaluationResult {
    // We don't need the full details for now
}

// Simplified placeholder types - we don't actually use these
#[derive(CandidType, Deserialize)]
struct RequestPolicyRuleResult {}

#[derive(CandidType, Deserialize)]
struct EvaluationSummaryReason {}

// Public functions

// Query version - can call other query methods but cannot update cache
pub async fn fetch_proposals_no_cache(filter: Option<ProposalFilter>) -> Result<Vec<ProposalSummary>, String> {
    let station_id = Principal::from_text(ALEXANDRIA_STATION_ID)
        .map_err(|e| format!("Invalid station ID: {}", e))?;

    let input = ListRequestsInput {
        requester_ids: None,
        approver_ids: None,
        statuses: filter.as_ref().and_then(|f| {
            f.status.as_ref().map(|s| {
                match s.as_str() {
                    "Created" => vec![RequestStatusCode::Created],
                    "Approved" => vec![RequestStatusCode::Approved],
                    "Rejected" => vec![RequestStatusCode::Rejected],
                    "Cancelled" => vec![RequestStatusCode::Cancelled],
                    "Scheduled" => vec![RequestStatusCode::Scheduled],
                    "Processing" => vec![RequestStatusCode::Processing],
                    "Completed" => vec![RequestStatusCode::Completed],
                    "Failed" => vec![RequestStatusCode::Failed],
                    _ => vec![],
                }
            })
        }),
        operation_types: Some(vec![ListRequestsOperationType::ManageSystemInfo]),
        expiration_from_dt: None,
        expiration_to_dt: None,
        created_from_dt: filter.as_ref().and_then(|f| f.from_date.clone()),
        created_to_dt: filter.as_ref().and_then(|f| f.to_date.clone()),
        paginate: Some(PaginationInput {
            offset: Some(0),
            limit: Some(100),
        }),
        sort_by: Some(ListRequestsSortBy::CreationDt(SortByDirection::Desc)),
        only_approvable: false,
        with_evaluation_results: false,
    };

    let result: CallResult<(ListRequestsResult,)> = 
        ic_cdk::call(station_id, "list_requests", (input,)).await;

    match result {
        Ok((ListRequestsResult::Ok { requests, .. },)) => {
            let proposals: Vec<ProposalSummary> = requests.into_iter().map(|req| {
                let approval_count = req.approvals.iter()
                    .filter(|a| matches!(a.decision, RequestApprovalStatus::Approved))
                    .count() as u32;
                
                let status_str = match req.status {
                    RequestStatus::Created => "Created",
                    RequestStatus::Approved => "Approved",
                    RequestStatus::Rejected => "Rejected",
                    RequestStatus::Cancelled { .. } => "Cancelled",
                    RequestStatus::Scheduled { .. } => "Scheduled",
                    RequestStatus::Processing { .. } => "Processing",
                    RequestStatus::Completed { .. } => "Completed",
                    RequestStatus::Failed { .. } => "Failed",
                }.to_string();

                ProposalSummary {
                    id: req.id,
                    title: req.title,
                    operation_type: "ManageSystemInfo".to_string(),
                    status: status_str,
                    created_at: req.created_at,
                    approval_count,
                    required_approvals: 1,
                }
            }).collect();

            Ok(proposals)
        }
        Ok((ListRequestsResult::Err(e),)) => Err(format!("Alexandria Station error: {:?}", e)),
        Err((code, msg)) => Err(format!("Inter-canister call failed: {:?} - {}", code, msg)),
    }
}

pub async fn register_with_alexandria_station() -> Result<String, String> {
    // Registration would typically involve calling an add_viewer or similar method
    // For now, we'll assume the backend principal needs to be added manually
    let backend_principal = ic_cdk::id();
    Ok(format!(
        "Backend principal {} ready to be registered with Alexandria Station",
        backend_principal.to_text()
    ))
}

pub async fn fetch_proposals(filter: Option<ProposalFilter>) -> Result<Vec<ProposalSummary>, String> {
    // Check cache first
    let cached = PROPOSAL_CACHE.with(|cache| {
        let cache = cache.borrow();
        if cache.is_valid() {
            Some(cache.proposals.clone())
        } else {
            None
        }
    });

    if let Some(proposals) = cached {
        return Ok(proposals);
    }

    // Fetch from Alexandria Station
    let station_id = Principal::from_text(ALEXANDRIA_STATION_ID)
        .map_err(|e| format!("Invalid station ID: {}", e))?;

    let input = ListRequestsInput {
        requester_ids: None,
        approver_ids: None,
        statuses: filter.as_ref().and_then(|f| {
            f.status.as_ref().map(|s| {
                // Convert string status to enum
                match s.as_str() {
                    "Created" => vec![RequestStatusCode::Created],
                    "Approved" => vec![RequestStatusCode::Approved],
                    "Rejected" => vec![RequestStatusCode::Rejected],
                    "Cancelled" => vec![RequestStatusCode::Cancelled],
                    "Scheduled" => vec![RequestStatusCode::Scheduled],
                    "Processing" => vec![RequestStatusCode::Processing],
                    "Completed" => vec![RequestStatusCode::Completed],
                    "Failed" => vec![RequestStatusCode::Failed],
                    _ => vec![],
                }
            })
        }),
        operation_types: Some(vec![ListRequestsOperationType::ManageSystemInfo]),
        expiration_from_dt: None,
        expiration_to_dt: None,
        created_from_dt: filter.as_ref().and_then(|f| f.from_date.clone()),
        created_to_dt: filter.as_ref().and_then(|f| f.to_date.clone()),
        paginate: Some(PaginationInput {
            offset: Some(0),
            limit: Some(100),
        }),
        sort_by: Some(ListRequestsSortBy::CreationDt(SortByDirection::Desc)),
        only_approvable: false,
        with_evaluation_results: false,
    };

    let result: CallResult<(ListRequestsResult,)> = 
        ic_cdk::call(station_id, "list_requests", (input,)).await;

    match result {
        Ok((ListRequestsResult::Ok { requests, .. },)) => {
            let proposals: Vec<ProposalSummary> = requests.into_iter().map(|req| {
                let approval_count = req.approvals.iter()
                    .filter(|a| matches!(a.decision, RequestApprovalStatus::Approved))
                    .count() as u32;
                
                let status_str = match req.status {
                    RequestStatus::Created => "Created",
                    RequestStatus::Approved => "Approved",
                    RequestStatus::Rejected => "Rejected",
                    RequestStatus::Cancelled { .. } => "Cancelled",
                    RequestStatus::Scheduled { .. } => "Scheduled",
                    RequestStatus::Processing { .. } => "Processing",
                    RequestStatus::Completed { .. } => "Completed",
                    RequestStatus::Failed { .. } => "Failed",
                }.to_string();

                ProposalSummary {
                    id: req.id,
                    title: req.title,
                    operation_type: "ManageSystemInfo".to_string(),
                    status: status_str,
                    created_at: req.created_at,
                    approval_count,
                    required_approvals: 1, // This would need to be fetched from policy
                }
            }).collect();

            // Update cache
            PROPOSAL_CACHE.with(|cache| {
                cache.borrow_mut().update(proposals.clone());
            });

            Ok(proposals)
        }
        Ok((ListRequestsResult::Err(e),)) => Err(format!("Alexandria Station error: {:?}", e)),
        Err((code, msg)) => Err(format!("Inter-canister call failed: {:?} - {}", code, msg)),
    }
}

pub async fn get_proposal_details(proposal_id: String) -> Result<ProposalDetails, String> {
    let station_id = Principal::from_text(ALEXANDRIA_STATION_ID)
        .map_err(|e| format!("Invalid station ID: {}", e))?;

    // For now, we'll use list_requests with a filter
    // In the future, we might use a get_request method if available
    let input = ListRequestsInput {
        requester_ids: None,
        approver_ids: None,
        statuses: None,
        operation_types: Some(vec![ListRequestsOperationType::ManageSystemInfo]),
        expiration_from_dt: None,
        expiration_to_dt: None,
        created_from_dt: None,
        created_to_dt: None,
        paginate: Some(PaginationInput {
            offset: Some(0),
            limit: Some(100),
        }),
        sort_by: Some(ListRequestsSortBy::CreationDt(SortByDirection::Desc)),
        only_approvable: false,
        with_evaluation_results: false,
    };

    let result: CallResult<(ListRequestsResult,)> = 
        ic_cdk::call(station_id, "list_requests", (input,)).await;

    match result {
        Ok((ListRequestsResult::Ok { requests, .. },)) => {
            let request = requests.into_iter()
                .find(|r| r.id == proposal_id)
                .ok_or_else(|| format!("Proposal {} not found", proposal_id))?;

            let approvals: Vec<ApprovalRecord> = request.approvals.iter()
                .filter(|a| matches!(a.decision, RequestApprovalStatus::Approved))
                .map(|a| ApprovalRecord {
                    user_id: a.user_id.clone(),
                    decided_at: a.decided_at.clone(),
                })
                .collect();

            let rejections: Vec<ApprovalRecord> = request.approvals.iter()
                .filter(|a| matches!(a.decision, RequestApprovalStatus::Rejected))
                .map(|a| ApprovalRecord {
                    user_id: a.user_id.clone(),
                    decided_at: a.decided_at.clone(),
                })
                .collect();

            let status_str = match request.status {
                RequestStatus::Created => "Created",
                RequestStatus::Approved => "Approved",
                RequestStatus::Rejected => "Rejected",
                RequestStatus::Cancelled { .. } => "Cancelled",
                RequestStatus::Scheduled { .. } => "Scheduled",
                RequestStatus::Processing { .. } => "Processing",
                RequestStatus::Completed { .. } => "Completed",
                RequestStatus::Failed { .. } => "Failed",
            }.to_string();

            Ok(ProposalDetails {
                id: request.id,
                title: request.title,
                summary: request.summary,
                operation_type: "ManageSystemInfo".to_string(),
                status: status_str,
                created_at: request.created_at,
                expiration_dt: Some(request.expiration_dt),
                requester: request.requested_by,
                approvals,
                rejections,
                operation_details: "{}".to_string(), // Placeholder for operation details
            })
        }
        Ok((ListRequestsResult::Err(e),)) => Err(format!("Alexandria Station error: {:?}", e)),
        Err((code, msg)) => Err(format!("Inter-canister call failed: {:?} - {}", code, msg)),
    }
}

pub fn refresh_cache() -> Result<String, String> {
    PROPOSAL_CACHE.with(|cache| {
        cache.borrow_mut().last_updated = None;
    });
    Ok("Cache cleared, will refresh on next request".to_string())
}

pub fn get_cache_status() -> (Option<String>, u32) {
    PROPOSAL_CACHE.with(|cache| {
        let cache = cache.borrow();
        let last_updated = cache.last_updated.map(|t| {
            format!("{}", t)
        });
        let count = cache.proposals.len() as u32;
        (last_updated, count)
    })
}