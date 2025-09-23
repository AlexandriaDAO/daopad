use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;
use std::fmt;

// Types needed for joining Orbit Station

#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum UserStatus {
    Active,
    Inactive,
}

#[derive(CandidType, Deserialize)]
pub struct AddUserOperationInput {
    pub name: String,
    pub identities: Vec<Principal>,
    pub groups: Vec<String>, // UUIDs as strings
    pub status: UserStatus,
}

#[derive(CandidType, Deserialize)]
pub struct EditUserOperationInput {
    pub id: String, // UUID
    pub name: Option<String>,
    pub identities: Option<Vec<Principal>>,
    pub groups: Option<Vec<String>>, // UUIDs as strings
    pub status: Option<UserStatus>,
    pub cancel_pending_requests: Option<bool>,
}

#[derive(CandidType, Deserialize)]
pub enum RequestOperationInput {
    AddUser(AddUserOperationInput),
    EditUser(EditUserOperationInput),
    // EditPermission(EditPermissionOperationInput), // TODO: Define this type
    AddAccount(AddAccountOperationInput),
}

#[derive(CandidType, Deserialize)]
pub enum RequestExecutionSchedule {
    Immediate,
}

#[derive(CandidType, Deserialize)]
pub struct CreateRequestInput {
    pub operation: RequestOperationInput,
    pub title: Option<String>,
    pub summary: Option<String>,
    pub execution_plan: Option<RequestExecutionSchedule>,
    pub expiration_dt: Option<String>, // RFC3339 timestamp
}

// Response types for Orbit Station
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct RequestDTO {
    pub id: String,
    pub title: String,
    pub status: RequestStatusDTO,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum RequestStatusDTO {
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
pub struct RequestCallerPrivilegesDTO {
    pub id: String,
    pub can_approve: bool,
}

#[derive(CandidType, Deserialize)]
pub struct RequestAdditionalInfoDTO {
    pub id: String,
    pub requester_name: String,
}

#[derive(CandidType, Deserialize)]
pub struct CreateRequestResponse {
    pub request: RequestDTO,
    pub privileges: RequestCallerPrivilegesDTO,
    pub additional_info: RequestAdditionalInfoDTO,
}

#[derive(CandidType, Deserialize)]
pub enum CreateRequestResult {
    Ok(CreateRequestResponse),
    Err(Error),
}

// Types for verifying admin status
#[derive(CandidType, Deserialize, Debug, Clone, Serialize)]
pub struct Error {
    pub code: String,
    pub message: Option<String>,
    pub details: Option<Vec<(String, String)>>,
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match &self.message {
            Some(message) if !message.is_empty() => {
                write!(f, "{} ({})", message, self.code)
            }
            _ => write!(f, "{}", self.code),
        }
    }
}

// User type for the me() call
#[derive(CandidType, Deserialize)]
pub struct UserGroup {
    pub id: String, // UUID
    pub name: String,
}

#[derive(CandidType, Deserialize)]
pub struct User {
    pub id: String, // UUID
    pub name: String,
    pub status: UserStatus,
    pub groups: Vec<UserGroup>,
    pub identities: Vec<Principal>,
    pub last_modification_timestamp: String, // RFC3339 timestamp
}

// Admin privileges enum - must match Orbit Station candid exactly
#[derive(CandidType, Deserialize, Debug, PartialEq)]
pub enum UserPrivilege {
    Capabilities,
    SystemInfo,
    ManageSystemInfo,
    ListAccounts,
    AddAccount,
    ListUsers,
    AddUser,
    ListUserGroups,
    AddUserGroup,
    ListPermissions,
    ListRequestPolicies,
    AddRequestPolicy,
    ListAddressBookEntries,
    AddAddressBookEntry,
    SystemUpgrade,
    ListRequests,
    CreateExternalCanister,
    ListExternalCanisters,
    CallAnyExternalCanister,
    ListAssets,
    AddAsset,
    ListNamedRules,
    AddNamedRule,
}

// MeResult in candid has an anonymous record in the Ok variant
// We need to match this structure exactly
#[derive(CandidType, Deserialize)]
pub enum MeResult {
    Ok {
        me: User,
        privileges: Vec<UserPrivilege>,
    },
    Err(Error),
}

// Account related types for treasury management
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct AccountMetadata {
    pub key: String,
    pub value: String,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct AccountAddress {
    pub address: String,
    pub format: String,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct AccountBalance {
    pub account_id: String, // UUID
    pub asset_id: String,   // UUID
    pub balance: candid::Nat,
    pub decimals: u32,
    pub last_update_timestamp: String, // RFC3339 timestamp
    pub query_state: String,           // "fresh", "stale", or "stale_refreshing"
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct AccountAsset {
    pub asset_id: String, // UUID
    pub balance: Option<AccountBalance>,
}

// Request policy rules for accounts
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct QuorumPercentage {
    pub min_approved: u32,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct Quorum {
    pub min_approved: u32,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum RequestPolicyRule {
    AutoApproved,
    QuorumPercentage(QuorumPercentage),
    Quorum(Quorum),
    AllowListedByMetadata(AccountMetadata),
    AllowListed,
    AnyOf(Vec<RequestPolicyRule>),
    AllOf(Vec<RequestPolicyRule>),
    Not(Box<RequestPolicyRule>),
    NamedRule(String), // UUID
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct Account {
    pub id: String, // UUID
    pub assets: Vec<AccountAsset>,
    pub addresses: Vec<AccountAddress>,
    pub name: String,
    pub metadata: Vec<AccountMetadata>,
    pub transfer_request_policy: Option<RequestPolicyRule>,
    pub configs_request_policy: Option<RequestPolicyRule>,
    pub last_modification_timestamp: String, // RFC3339 timestamp
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct AccountCallerPrivileges {
    pub id: String, // UUID
    pub can_edit: bool,
    pub can_transfer: bool,
}

// List accounts input/output
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct PaginationInput {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

#[derive(CandidType, Deserialize)]
pub struct ListAccountsInput {
    pub search_term: Option<String>,
    pub paginate: Option<PaginationInput>,
}

#[derive(CandidType, Deserialize)]
pub enum ListAccountsResult {
    Ok {
        accounts: Vec<Account>,
        privileges: Vec<AccountCallerPrivileges>,
        total: u64,
        next_offset: Option<u64>,
    },
    Err(Error),
}

// Fetch account balances types
#[derive(CandidType, Deserialize)]
pub struct FetchAccountBalancesInput {
    pub account_ids: Vec<String>, // UUID array
}

#[derive(CandidType, Deserialize)]
pub enum FetchAccountBalancesResult {
    Ok {
        balances: Vec<Option<AccountBalance>>,
    },
    Err(Error),
}

// Authorization types for account permissions
#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum AuthScope {
    Public,
    Authenticated,
    Restricted,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct Allow {
    pub auth_scope: AuthScope,
    pub users: Vec<String>,       // UUIDs
    pub user_groups: Vec<String>, // UUIDs
}

// Add account operation types
#[derive(CandidType, Deserialize)]
pub struct AddAccountOperationInput {
    pub name: String,
    pub assets: Vec<String>, // Asset UUIDs
    pub metadata: Vec<AccountMetadata>,
    pub read_permission: Allow,
    pub configs_permission: Allow,
    pub transfer_permission: Allow,
    pub configs_request_policy: Option<RequestPolicyRule>,
    pub transfer_request_policy: Option<RequestPolicyRule>,
}
