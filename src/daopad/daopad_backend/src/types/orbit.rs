use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;
use std::fmt;

// Types needed for joining Orbit Station and permissions management

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
    EditPermission(EditPermissionOperationInput),
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

// Response type for join_orbit_station method
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct JoinMemberResponse {
    pub request_id: String,
    pub status: String,
    pub auto_approved: bool,
    pub failure_reason: Option<String>,
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
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct UserGroup {
    pub id: String, // UUID
    pub name: String,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct User {
    pub id: String, // UUID
    pub name: String,
    pub status: UserStatus,
    pub groups: Vec<UserGroup>,
    pub identities: Vec<Principal>,
    pub last_modification_timestamp: String, // RFC3339 timestamp
}

// List users types
#[derive(CandidType, Deserialize)]
pub struct ListUsersInput {
    pub paginate: Option<PaginationInput>,
}

#[derive(CandidType, Deserialize)]
pub struct UserDTO {
    pub id: String, // UUID
    pub name: String,
    pub status: UserStatus,
    pub groups: Vec<UserGroup>,
    pub identities: Vec<(Principal,)>, // Note: wrapped in tuple per Orbit API
    pub last_modification_timestamp: String,
}

#[derive(CandidType, Deserialize)]
pub struct UserCallerPrivileges {
    pub id: String,
    pub can_edit: bool,
}

#[derive(CandidType, Deserialize)]
pub enum ListUsersResult {
    Ok {
        users: Vec<UserDTO>,
        privileges: Vec<UserCallerPrivileges>,
        total: u64,
        next_offset: Option<u64>,
    },
    Err(Error),
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

// User specifier for approval rules
#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum UserSpecifier {
    Any,
    Id(Vec<String>),     // User UUIDs
    Group(Vec<String>),  // Group UUIDs
}

// Request policy rules for accounts
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct QuorumPercentage {
    pub approvers: UserSpecifier,  // The users that are required to approve
    pub min_approved: u16,         // nat16 in candid, not u32!
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct Quorum {
    pub approvers: UserSpecifier,  // The users that can approve
    pub min_approved: u16,         // nat16 in candid, not u32!
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
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum AuthScope {
    Public,
    Authenticated,
    Restricted,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
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

// System Info types for DAO Settings
#[derive(CandidType, Serialize, Deserialize, Debug)]
pub struct SystemInfo {
    pub name: String,
    pub version: String,
    pub upgrader_id: Principal,
    pub cycles: u64,
    pub upgrader_cycles: Option<u64>,
    pub last_upgrade_timestamp: String, // RFC3339 timestamp
    pub raw_rand_successful: bool,
    pub disaster_recovery: Option<DisasterRecovery>,
    pub cycle_obtain_strategy: CycleObtainStrategy,
}

#[derive(CandidType, Serialize, Deserialize, Debug)]
pub struct DisasterRecovery {
    pub committee: DisasterRecoveryCommittee,
    pub user_group_name: Option<String>,
}

#[derive(CandidType, Serialize, Deserialize, Debug)]
pub struct DisasterRecoveryCommittee {
    pub user_group_id: String, // UUID as string
    pub quorum: u16,
}

#[derive(CandidType, Serialize, Deserialize, Debug)]
pub enum CycleObtainStrategy {
    Disabled,
    MintFromNativeToken {
        account_id: String, // UUID as string
        account_name: Option<String>,
    },
    WithdrawFromCyclesLedger {
        account_id: String, // UUID as string
        account_name: Option<String>,
    },
}

#[derive(CandidType, Serialize, Deserialize, Debug)]
pub enum SystemInfoResult {
    Ok { system: SystemInfo },
    Err(Error),
}

#[derive(CandidType, Serialize, Deserialize, Debug)]
pub struct SystemInfoResponse {
    pub station_id: Principal,
    pub system_info: SystemInfo,
}

// Permission Management Types

// UUID type for user/group IDs (standard format)
pub type UUID = String; // Format: "00000000-0000-4000-8000-000000000000"

// Resource specifier for permissions
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum ResourceSpecifier {
    Any,
    Id(UUID),
}

// Resource actions - validated from actual station
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum ResourceAction {
    Create,
    Update(ResourceSpecifier),
    Delete(ResourceSpecifier),
    Read(ResourceSpecifier),
    Transfer(ResourceSpecifier), // For accounts only
    List,
}

// Specialized actions for certain resources
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum ExternalCanisterAction {
    Create,
    Change(ResourceSpecifier),
    Fund(ResourceSpecifier),
    Read(ResourceSpecifier),
    List,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum PermissionAction {
    Read,
    Update,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum SystemAction {
    ManageSystemInfo,
    Upgrade,
    Capabilities,
    SystemInfo,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum RequestAction {
    Read(ResourceSpecifier),
    List,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum UserAction {
    Create,
    Update(ResourceSpecifier),
    Read(ResourceSpecifier),
    List,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum NotificationAction {
    Create,
    Update,
    Delete,
    Read,
    List,
    MarkRead,
}

// Complete Resource enum based on empirical testing
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum Resource {
    Account(ResourceAction),
    AddressBook(ResourceAction),
    Asset(ResourceAction),
    ExternalCanister(ExternalCanisterAction),
    NamedRule(ResourceAction),
    Notification(NotificationAction),
    Permission(PermissionAction),
    Request(RequestAction),
    RequestPolicy(ResourceAction),
    System(SystemAction),
    User(UserAction),
    UserGroup(ResourceAction),
}

// Permission structure matching Orbit
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct Permission {
    pub resource: Resource,
    pub allow: Allow,
}

// Input types for API calls
#[derive(CandidType, Deserialize, Debug)]
pub struct ListPermissionsInput {
    pub resources: Option<Vec<Resource>>,
    pub paginate: Option<PaginationInput>,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct GetPermissionInput {
    pub resource: Resource,
}

// EditPermission operation input
#[derive(CandidType, Deserialize, Debug)]
pub struct EditPermissionOperationInput {
    pub resource: Resource,
    pub auth_scope: Option<AuthScope>,
    pub users: Option<Vec<UUID>>,
    pub user_groups: Option<Vec<UUID>>,
}

// Response types for permissions
#[derive(CandidType, Deserialize, Serialize, Debug)]
pub struct PermissionCallerPrivileges {
    pub resource: Resource,
    pub can_edit: bool,
}

#[derive(CandidType, Deserialize, Serialize, Debug)]
pub struct ListPermissionsResponse {
    pub permissions: Vec<Permission>,
    pub privileges: Vec<PermissionCallerPrivileges>,
    pub total: u64,
    pub user_groups: Vec<UserGroup>,
}

#[derive(CandidType, Deserialize, Serialize, Debug)]
pub enum ListPermissionsResult {
    Ok(ListPermissionsResponse),
    Err(Error),
}

#[derive(CandidType, Deserialize, Serialize, Debug)]
pub struct GetPermissionResponse {
    pub permission: Permission,
    pub privileges: PermissionCallerPrivileges,
}

#[derive(CandidType, Deserialize, Serialize, Debug)]
pub enum GetPermissionResult {
    Ok(GetPermissionResponse),
    Err(Error),
}

// List user groups
#[derive(CandidType, Deserialize, Debug)]
pub struct ListUserGroupsInput {
    pub paginate: Option<PaginationInput>,
}

#[derive(CandidType, Deserialize, Serialize, Debug)]
pub struct ListUserGroupsResponse {
    pub user_groups: Vec<UserGroup>,
    pub total: u64,
    pub privileges: Vec<UserGroupCallerPrivileges>,
}

#[derive(CandidType, Deserialize, Serialize, Debug)]
pub struct UserGroupCallerPrivileges {
    pub id: String,
    pub can_edit: bool,
    pub can_delete: bool,
}

#[derive(CandidType, Deserialize, Serialize, Debug)]
pub enum ListUserGroupsResult {
    Ok(ListUserGroupsResponse),
    Err(Error),
}
