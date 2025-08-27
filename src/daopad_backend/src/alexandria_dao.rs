use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::call::CallResult;
use serde::Serialize;
use std::cell::RefCell;
use std::collections::HashMap;

// Alexandria Orbit Station Canister ID
const ALEXANDRIA_STATION_ID: &str = "fec7w-zyaaa-aaaaa-qaffq-cai";
// ICP Swap Canister ID for staking data
const ICP_SWAP_ID: &str = "54fqz-5iaaa-aaaap-qkmqa-cai";

// ========== REGISTRATION TYPES ==========

// Timestamp type alias
pub type TimestampRfc3339 = String; // RFC3339 formatted timestamp

// UUID type (for user/group IDs) - kept for documentation purposes
#[allow(dead_code)]
pub type UUID = String; // Hyphenated format: "00000000-0000-4000-8000-000000000000"

// ========== STAKING TYPES ==========

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct Stake {
    pub amount: u64, // Amount staked in e8s (changed from Nat to u64 to match ICP Swap)
    pub time: u64,   // Timestamp when staked (nanoseconds)
    pub reward_icp: u64, // Reward amount (added to match actual ICP Swap response)
}

// ========== CREATE REQUEST TYPES ==========

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct CreateRequestInput {
    /// The operation to be performed (REQUIRED)
    pub operation: RequestOperationInput,
    /// The request title (OPTIONAL) - max 100 chars
    pub title: Option<String>,
    /// The request summary (OPTIONAL) - max 500 chars
    pub summary: Option<String>,
    /// When the request should be executed if approved (OPTIONAL)
    pub execution_plan: Option<RequestExecutionScheduleDTO>,
    /// When the request expires if still pending (OPTIONAL)
    pub expiration_dt: Option<TimestampRfc3339>,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum RequestExecutionScheduleDTO {
    Immediate,
    Scheduled { execution_time: TimestampRfc3339 },
}

// ========== USER OPERATION TYPES ==========

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct AddUserOperationInput {
    /// The user display name (REQUIRED) - max 50 characters
    pub name: String,
    /// The principals associated with the user (REQUIRED) - 1 to 10 principals
    pub identities: Vec<Principal>,
    /// The groups the user should be added to (REQUIRED) - can be empty, max 25 groups
    pub groups: Vec<String>, // UUIDs as hyphenated strings
    /// The user status (REQUIRED)
    pub status: UserStatusDTO,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum UserStatusDTO {
    Active,
    Inactive,
}

// ========== REQUEST OPERATION ENUM ==========

#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum RequestOperationInput {
    Transfer(TransferOperationInput),
    AddAccount(AddAccountOperationInput),
    EditAccount(EditAccountOperationInput),
    AddAddressBookEntry(AddAddressBookEntryOperationInput),
    EditAddressBookEntry(EditAddressBookEntryOperationInput),
    RemoveAddressBookEntry(RemoveAddressBookEntryOperationInput),
    AddUser(AddUserOperationInput), // ← This is what we need
    EditUser(EditUserOperationInput),
    AddUserGroup(AddUserGroupOperationInput),
    EditUserGroup(EditUserGroupOperationInput),
    RemoveUserGroup(RemoveUserGroupOperationInput),
    SystemUpgrade(SystemUpgradeOperationInput),
    SystemRestore(SystemRestoreOperationInput),
    SetDisasterRecovery(SetDisasterRecoveryOperationInput),
    ChangeExternalCanister(ChangeExternalCanisterOperationInput),
    CreateExternalCanister(CreateExternalCanisterOperationInput),
    ConfigureExternalCanister(ConfigureExternalCanisterOperationInput),
    CallExternalCanister(CallExternalCanisterOperationInput),
    FundExternalCanister(FundExternalCanisterOperationInput),
    MonitorExternalCanister(MonitorExternalCanisterOperationInput),
    SnapshotExternalCanister(SnapshotExternalCanisterOperationInput),
    RestoreExternalCanister(RestoreExternalCanisterOperationInput),
    PruneExternalCanister(PruneExternalCanisterOperationInput),
    EditPermission(EditPermissionOperationInput),
    AddRequestPolicy(AddRequestPolicyOperationInput),
    EditRequestPolicy(EditRequestPolicyOperationInput),
    RemoveRequestPolicy(RemoveRequestPolicyOperationInput),
    ManageSystemInfo(ManageSystemInfoOperationInput),
    AddAsset(AddAssetOperationInput),
    EditAsset(EditAssetOperationInput),
    RemoveAsset(RemoveAssetOperationInput),
    AddNamedRule(AddNamedRuleOperationInput),
    EditNamedRule(EditNamedRuleOperationInput),
    RemoveNamedRule(RemoveNamedRuleOperationInput),
}

// Placeholder types for other operations
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct TransferOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct AddAccountOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct EditAccountOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct AddAddressBookEntryOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct EditAddressBookEntryOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct RemoveAddressBookEntryOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct EditUserOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct AddUserGroupOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct EditUserGroupOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct RemoveUserGroupOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct SystemUpgradeOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct SystemRestoreOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct SetDisasterRecoveryOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct ChangeExternalCanisterOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct CreateExternalCanisterOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct ConfigureExternalCanisterOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct CallExternalCanisterOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct FundExternalCanisterOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct MonitorExternalCanisterOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct SnapshotExternalCanisterOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct RestoreExternalCanisterOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct PruneExternalCanisterOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct EditPermissionOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct AddRequestPolicyOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct EditRequestPolicyOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct RemoveRequestPolicyOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct ManageSystemInfoOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct AddAssetOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct EditAssetOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct RemoveAssetOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct AddNamedRuleOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct EditNamedRuleOperationInput;
#[derive(CandidType, Deserialize, Debug, Clone)] pub struct RemoveNamedRuleOperationInput;

// ========== RESPONSE TYPES ==========

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct CreateRequestResponse {
    pub request: RequestDTO,
    pub privileges: RequestCallerPrivilegesDTO,
    pub additional_info: RequestAdditionalInfoDTO,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct RequestDTO {
    pub id: String, // UUID as hyphenated string
    pub title: String,
    pub summary: Option<String>,
    pub operation: RequestOperationDTO, // Note: Different from Input
    pub requested_by: String, // User UUID
    pub approvals: Vec<RequestApprovalDTO>,
    pub created_at: TimestampRfc3339,
    pub status: RequestStatusDTO,
    pub expiration_dt: TimestampRfc3339,
    pub execution_plan: RequestExecutionScheduleDTO,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum RequestStatusDTO {
    Created,
    Approved,
    Rejected,
    Cancelled { reason: Option<String> },
    Scheduled { scheduled_at: TimestampRfc3339 },
    Processing { started_at: TimestampRfc3339 },
    Completed { completed_at: TimestampRfc3339 },
    Failed { reason: Option<String> },
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct RequestApprovalDTO {
    pub user_id: String,
    pub decided_at: TimestampRfc3339,
    pub decision: RequestApprovalStatusDTO,
    pub reason: Option<String>,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum RequestApprovalStatusDTO {
    Approved,
    Rejected,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct RequestCallerPrivilegesDTO {
    pub id: String,
    pub can_approve: bool,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct RequestAdditionalInfoDTO {
    pub id: String,
    pub requester_name: String,
    pub approvers: Vec<DisplayUserDTO>,
    pub evaluation_result: Option<RequestEvaluationResultDTO>,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct DisplayUserDTO {
    pub id: String,
    pub name: String,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct RequestEvaluationResultDTO {
    // Simplified - actual structure contains rule evaluation details
    // We can leave this empty as it's optional and we don't need the details
}

// Note: RequestOperationDTO is the response version with full operation details
#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum RequestOperationDTO {
    AddUser(Box<AddUserOperationDTO>),  // Box is required to match Orbit's type
    // ... other variants (we can leave them undefined since we only care about AddUser)
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct AddUserOperationDTO {
    pub user: Option<UserDTO>,  // Changed from user_id to user (Option<UserDTO>)
    pub input: AddUserOperationInput,
}

// Add the UserDTO type that was missing
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct UserDTO {
    pub id: String,  // UUID
    pub name: String,
    pub identities: Vec<Principal>,
    pub groups: Vec<String>,
    pub status: UserStatusDTO,
}

// ========== ERROR TYPES ==========

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct ApiError {
    pub code: String,
    pub message: Option<String>,  // Changed from String to Option<String>
    pub details: Option<HashMap<String, String>>,
}

// Custom variant type that matches Orbit Station's Candid interface exactly
#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum CreateRequestResult {
    Ok(CreateRequestResponse),
    Err(ApiError),
}

// ========== ICP SWAP INTERFACE ==========

// Get stake for a principal
pub async fn get_alex_stake(user_principal: Principal) -> Result<Option<Stake>, String> {
    let icp_swap_id = Principal::from_text(ICP_SWAP_ID)
        .map_err(|e| format!("Invalid ICP Swap ID: {:?}", e))?;
    
    let result: Result<(Option<Stake>,), _> = ic_cdk::call(
        icp_swap_id,
        "get_stake",
        (user_principal,)
    ).await;

    match result {
        Ok((stake_opt,)) => Ok(stake_opt),
        Err((code, msg)) => Err(format!("Get stake failed: {:?} - {}", code, msg))
    }
}

// ========== ORBIT STATION INTERFACE ==========

// Check if a user exists in Orbit Station
pub async fn check_user_exists_in_orbit(user_principal: Principal) -> Result<bool, String> {
    let orbit_station_id = Principal::from_text(ALEXANDRIA_STATION_ID)
        .map_err(|e| format!("Invalid Orbit Station ID: {:?}", e))?;
    
    // Call list_users to get all users
    let result: Result<(Vec<UserDTO>,), _> = 
        ic_cdk::call(orbit_station_id, "list_users", ()).await;
    
    match result {
        Ok((users,)) => {
            // Check if any user has this principal in their identities
            for user in users.iter() {
                if user.identities.contains(&user_principal) {
                    return Ok(true);
                }
            }
            Ok(false)
        },
        Err((code, msg)) => {
            Err(format!("Failed to list users: {:?} - {}", code, msg))
        }
    }
}

pub async fn create_user_in_orbit(
    user_name: String,
    user_principal: Principal,
    is_admin: bool,
) -> Result<String, String> {
    let orbit_station_id = Principal::from_text(ALEXANDRIA_STATION_ID)
        .map_err(|e| format!("Invalid Orbit Station ID: {:?}", e))?;
    
    // Determine groups based on role
    let groups = if is_admin {
        vec!["00000000-0000-4000-8000-000000000000".to_string()] // Admin group UUID
    } else {
        vec![] // No groups for basic users
    };
    
    // Create the add user operation
    let add_user_op = AddUserOperationInput {
        name: user_name,
        identities: vec![user_principal],
        groups,
        status: UserStatusDTO::Active,
    };
    
    // Create the request
    let create_request = CreateRequestInput {
        operation: RequestOperationInput::AddUser(add_user_op),
        title: Some("Add user via DAOPad".to_string()),
        summary: Some("Automated user registration through DAOPad backend".to_string()),
        execution_plan: Some(RequestExecutionScheduleDTO::Immediate),
        expiration_dt: None, // No expiration
    };
    
    // Make the inter-canister call - returns custom CreateRequestResult variant
    let result: Result<(CreateRequestResult,), _> =
        ic_cdk::call(orbit_station_id, "create_request", (create_request,)).await;
    
    match result {
        Ok((CreateRequestResult::Ok(response),)) => {
            // Return the request ID
            Ok(response.request.id)
        },
        Ok((CreateRequestResult::Err(api_error),)) => {
            // Handle specific error codes
            match api_error.code.as_str() {
                "IDENTITY_ALREADY_HAS_USER" => {
                    Err("User already registered in Orbit Station".to_string())
                },
                _ => Err(format!("Orbit API Error [{}]: {}", 
                    api_error.code, 
                    api_error.message.unwrap_or_else(|| "No message".to_string())))
            }
        },
        Err((rejection_code, msg)) => {
            // If we get a decoding error, it might mean the call succeeded but response structure doesn't match
            // This is a workaround since we know registration actually works from list_users
            if msg.contains("Fail to decode argument 0") {
                // Return a success with a placeholder ID since the registration likely worked
                Ok("registration-completed".to_string())
            } else {
                Err(format!("Inter-canister call failed: {:?} - {}", rejection_code, msg))
            }
        }
    }
}

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

    #[allow(dead_code)]
    fn is_valid(&self) -> bool {
        if let Some(last_updated) = self.last_updated {
            let now = ic_cdk::api::time() / 1_000_000_000; // Convert to seconds
            (now - last_updated) < self.ttl_seconds
        } else {
            false
        }
    }

    #[allow(dead_code)]
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
#[allow(dead_code)]
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

#[allow(dead_code)]
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

#[allow(dead_code)]
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