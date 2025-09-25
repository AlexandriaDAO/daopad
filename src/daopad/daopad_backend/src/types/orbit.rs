use candid::{CandidType, Deserialize, Nat, Principal};
use serde::Serialize;
use std::fmt;

// Types needed for joining Orbit Station and permissions management

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum UserStatus {
    Active,
    Inactive,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct AddUserOperationInput {
    pub name: String,
    pub identities: Vec<Principal>,
    pub groups: Vec<String>, // UUIDs as strings
    pub status: UserStatus,
}

#[derive(CandidType, Deserialize, Debug)]
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

#[derive(CandidType, Deserialize, Debug)]
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

#[derive(CandidType, Deserialize, Debug)]
pub struct RequestCallerPrivilegesDTO {
    pub id: String,
    pub can_approve: bool,
}

#[derive(CandidType, Deserialize, Debug)]
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

// Transfer operation types (used by orbit_transfers module)
#[derive(CandidType, Deserialize, Debug)]
pub struct TransferOperationInput {
    pub from_account_id: String, // UUID from Orbit account
    pub from_asset_id: String,   // UUID from Orbit asset
    pub with_standard: String,   // "icp" or "icrc1"
    pub to: String,              // Destination address
    pub amount: Nat,             // Amount in smallest units
    pub fee: Option<Nat>,        // Optional fee
    pub metadata: Vec<TransferMetadata>,
    pub network: Option<NetworkInput>,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct TransferMetadata {
    pub key: String,
    pub value: String,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct NetworkInput {
    pub id: String,
    pub name: String,
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
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
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
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum UserSpecifier {
    Any,
    Id(Vec<String>),     // User UUIDs
    Group(Vec<String>),  // Group UUIDs
}

// Request policy rules for accounts
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct QuorumPercentage {
    pub approvers: UserSpecifier,  // The users that are required to approve
    pub min_approved: u16,         // nat16 in candid, not u32!
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct Quorum {
    pub approvers: UserSpecifier,  // The users that can approve
    pub min_approved: u16,         // nat16 in candid, not u32!
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
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
#[derive(CandidType, Deserialize, Debug)]
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
#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum ResourceSpecifier {
    Any,
    Id(UUID),
}

// Resource actions - validated from actual station
#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum ResourceAction {
    Create,
    Update(ResourceSpecifier),
    Delete(ResourceSpecifier),
    Read(ResourceSpecifier),
    Transfer(ResourceSpecifier), // For accounts only
    List,
}

// Specialized actions for certain resources
#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum ExternalCanisterAction {
    Create,
    Change(ExternalCanisterSpecifier),
    Fund(ExternalCanisterSpecifier),
    Read(ExternalCanisterSpecifier),
    List,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum ExternalCanisterSpecifier {
    Any,
    Id(String),
    Canister(Principal),  // Missing variant causing decode failures
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum PermissionAction {
    Read,
    Update,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum SystemAction {
    ManageSystemInfo,
    Upgrade,
    Capabilities,
    SystemInfo,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum RequestAction {
    Read(ResourceSpecifier),
    List,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum UserAction {
    Create,
    Update(ResourceSpecifier),
    Read(ResourceSpecifier),
    List,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum NotificationAction {
    Create,
    Update,
    Delete,
    Read,
    List,
    MarkRead,
}

// Complete Resource enum based on empirical testing
#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
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
    Ok {
        permissions: Vec<Permission>,
        privileges: Vec<PermissionCallerPrivileges>,
        total: u64,
        user_groups: Vec<UserGroup>,
        users: Vec<UserDTO>,  // Missing field causing decode failure
        next_offset: Option<u64>,
    },
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

// New types for get_user_group endpoint
#[derive(CandidType, Deserialize, Serialize, Debug)]
pub struct GetUserGroupInput {
    pub user_group_id: String,
}

#[derive(CandidType, Deserialize, Serialize, Debug)]
pub struct GetUserGroupResponse {
    pub user_group: UserGroupDetail,
    pub privileges: Option<UserGroupCallerPrivileges>,
}

#[derive(CandidType, Deserialize, Serialize, Debug)]
pub struct UserGroupDetail {
    pub id: String,
    pub name: String,
    pub users: Vec<String>, // User IDs
}

// TODO: Add user group operation types when available in Orbit Station

// ===== EXTERNAL CANISTER TYPES =====

// External canister management types
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct ExternalCanister {
    pub id: String, // UUID
    pub canister_id: Principal,
    pub name: String,
    pub description: Option<String>,
    pub labels: Vec<String>,
    pub metadata: Vec<(String, String)>,
    pub state: ExternalCanisterState,
    pub permissions: ExternalCanisterPermissions,
    pub request_policies: ExternalCanisterRequestPolicies,
    pub created_at: String,
    pub modified_at: Option<String>,
    pub monitoring: Option<MonitoringConfig>,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum ExternalCanisterState {
    Active,
    Archived,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct ExternalCanisterPermissions {
    pub read: Allow,
    pub change: Allow,
    pub calls: Vec<ExternalCanisterCallPermission>,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct ExternalCanisterCallPermission {
    pub allow: Allow,
    pub execution_method: String,
    pub validation_method: ExternalCanisterValidationMethodType,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum ExternalCanisterValidationMethodType {
    No,
    Quorum(ExternalCanisterQuorumValidationMethod),
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct ExternalCanisterQuorumValidationMethod {
    pub min_approvers: u16,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct ExternalCanisterRequestPolicies {
    pub change: Vec<RequestPolicyWithAccount>,
    pub calls: Vec<RequestPolicyWithAccount>,
}

// Using the existing RequestPolicyRule with a simpler wrapper for external canisters
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct RequestPolicyWithAccount {
    pub policy_id: Option<String>,
    pub rule: RequestPolicyRule,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct MonitoringConfig {
    pub strategy: MonitoringStrategy,
    pub funding_amount: Nat,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum MonitoringStrategy {
    Always,
    BelowThreshold { min_cycles: Nat },
    BelowEstimatedRuntime { runtime_seconds: u64 },
}

// List external canisters
#[derive(CandidType, Deserialize, Debug)]
pub struct ListExternalCanistersInput {
    pub canister_ids: Option<Vec<Principal>>,
    pub labels: Option<Vec<String>>,
    pub states: Option<Vec<ExternalCanisterState>>,
    pub paginate: Option<PaginationInput>,
    pub sort_by: Option<ListExternalCanistersSortInput>,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct ListExternalCanistersSortInput {
    pub field: String,  // "name", "created_at", etc.
    pub direction: SortDirection,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum SortDirection {
    Asc,
    Desc,
}

#[derive(CandidType, Deserialize, Serialize, Debug)]
pub struct ExternalCanisterCallerPrivileges {
    pub id: String,  // UUID
    pub canister_id: Principal,
    pub can_change: bool,
    pub can_fund: bool,
    pub can_call: Vec<String>,  // Method names that can be called
}

// The actual result is wrapped in Ok/Err variant
#[derive(CandidType, Deserialize, Serialize, Debug)]
pub enum ListExternalCanistersResult {
    Ok {
        canisters: Vec<ExternalCanister>,
        next_offset: Option<u64>,
        total: u64,
        privileges: Vec<ExternalCanisterCallerPrivileges>,
    },
    Err(Error),
}

// Get external canister
#[derive(CandidType, Deserialize, Debug)]
pub struct GetExternalCanisterInput {
    pub external_canister_id: String,  // UUID for most operations
}

// For get_external_canister which needs Principal
#[derive(CandidType, Deserialize, Debug)]
pub struct GetExternalCanisterByPrincipalInput {
    pub canister_id: Principal,  // The actual canister Principal
}

#[derive(CandidType, Deserialize, Serialize, Debug)]
pub struct GetExternalCanisterResult {
    pub canister: ExternalCanister,
}

// External canister ID for requests
#[derive(CandidType, Deserialize, Debug)]
pub struct ExternalCanisterIdInput {
    pub external_canister_id: String,
}

// Create external canister operation
#[derive(CandidType, Deserialize, Debug)]
pub struct CreateExternalCanisterOperationInput {
    pub kind: CreateExternalCanisterKind,
    pub name: String,
    pub description: Option<String>,
    pub labels: Vec<String>,
    pub metadata: Vec<(String, String)>,
    pub permissions: ExternalCanisterPermissions,
    pub request_policies: ExternalCanisterRequestPolicies,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum CreateExternalCanisterKind {
    CreateNew(CreateExternalCanisterOptions),
    AddExisting { canister_id: Principal },
}

#[derive(CandidType, Deserialize, Debug)]
pub struct CreateExternalCanisterOptions {
    pub subnet_selection: Option<SubnetSelection>,
    pub initial_cycles: Option<Nat>,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum SubnetSelection {
    Subnet { subnet_id: Principal },
}

// Change external canister operation
#[derive(CandidType, Deserialize, Debug)]
pub struct ChangeExternalCanisterOperationInput {
    pub external_canister_id: String,
    pub kind: ChangeExternalCanisterKind,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum ChangeExternalCanisterKind {
    Upgrade(UpgradeExternalCanisterInput),
    NativeSettings(NativeCanisterSettingsInput),
    Settings(ExternalCanisterSettingsInput),
    State(ExternalCanisterState),
}

#[derive(CandidType, Deserialize, Debug)]
pub struct UpgradeExternalCanisterInput {
    pub mode: CanisterInstallMode,
    pub wasm_module: Vec<u8>,
    pub arg: Option<Vec<u8>>,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum CanisterInstallMode {
    #[serde(rename = "install")]
    Install,
    #[serde(rename = "reinstall")]
    Reinstall,
    #[serde(rename = "upgrade")]
    Upgrade,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct NativeCanisterSettingsInput {
    pub controllers: Option<Vec<Principal>>,
    pub compute_allocation: Option<Nat>,
    pub memory_allocation: Option<Nat>,
    pub freezing_threshold: Option<Nat>,
    pub reserved_cycles_limit: Option<Nat>,
    pub log_visibility: Option<LogVisibility>,
    pub wasm_memory_limit: Option<Nat>,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum LogVisibility {
    #[serde(rename = "public")]
    Public,
    #[serde(rename = "controllers")]
    Controllers,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct ExternalCanisterSettingsInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub labels: Option<Vec<String>>,
    pub metadata: Option<Vec<(String, String)>>,
}

// Configure external canister operation
#[derive(CandidType, Deserialize, Debug)]
pub struct ConfigureExternalCanisterOperationInput {
    pub external_canister_id: String,
    pub kind: ConfigureExternalCanisterKind,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum ConfigureExternalCanisterKind {
    Permissions(ExternalCanisterPermissions),
    RequestPolicies(ExternalCanisterRequestPolicies),
    CallPermission(Vec<ExternalCanisterCallPermission>),
}

// Call external canister
#[derive(CandidType, Deserialize, Debug)]
pub struct ExternalCanisterCallerMethodCallInput {
    pub method_name: String,
    pub arg: Option<Vec<u8>>,
    pub cycles: Option<Nat>,
    pub validation_method: Option<ExternalCanisterValidationMethodInput>,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct ExternalCanisterValidationMethodInput {
    pub method_name: String,
    pub arg: Option<Vec<u8>>,
}

// Fund external canister
#[derive(CandidType, Deserialize, Debug)]
pub struct FundExternalCanisterOperationInput {
    pub external_canister_id: String,
    pub kind: FundExternalCanisterKind,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum FundExternalCanisterKind {
    Send(FundExternalCanisterSendCyclesInput),
}

#[derive(CandidType, Deserialize, Debug)]
pub struct FundExternalCanisterSendCyclesInput {
    pub cycles: Nat,
}

// Monitor external canister
#[derive(CandidType, Deserialize, Debug)]
pub struct MonitorExternalCanisterOperationInput {
    pub external_canister_id: String,
    pub kind: MonitorExternalCanisterKind,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum MonitorExternalCanisterKind {
    Start(MonitorExternalCanisterStartInput),
    Stop,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct MonitorExternalCanisterStartInput {
    pub strategy: MonitoringStrategy,
    pub funding_amount: Nat,
}

// Snapshot operations
#[derive(CandidType, Deserialize, Debug)]
pub struct SnapshotExternalCanisterOperationInput {
    pub external_canister_id: String,
    pub force: bool,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct RestoreExternalCanisterOperationInput {
    pub external_canister_id: String,
    pub snapshot_id: String,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct PruneExternalCanisterOperationInput {
    pub external_canister_id: String,
    pub snapshot_ids: Vec<String>,
}

// Enhanced RequestOperation enum with canister operations
#[derive(CandidType, Deserialize, Debug)]
pub enum RequestOperation {
    AddUser(AddUserOperationInput),
    EditUser(EditUserOperationInput),
    EditPermission(EditPermissionOperationInput),
    AddAccount(AddAccountOperationInput),
    Transfer(TransferOperationInput),
    CreateExternalCanister(CreateExternalCanisterOperationInput),
    ChangeExternalCanister(ChangeExternalCanisterOperationInput),
    ConfigureExternalCanister(ConfigureExternalCanisterOperationInput),
    CallExternalCanister(ExternalCanisterIdInput, ExternalCanisterCallerMethodCallInput),
    FundExternalCanister(FundExternalCanisterOperationInput),
    MonitorExternalCanister(MonitorExternalCanisterOperationInput),
    SnapshotExternalCanister(SnapshotExternalCanisterOperationInput),
    RestoreExternalCanister(RestoreExternalCanisterOperationInput),
    PruneExternalCanister(PruneExternalCanisterOperationInput),
}

// Submit request input with RequestOperation
#[derive(CandidType, Deserialize, Debug)]
pub struct SubmitRequestInput {
    pub operation: RequestOperation,
    pub title: Option<String>,
    pub summary: Option<String>,
    pub execution_plan: Option<RequestExecutionSchedule>,
}

// Submit request result
#[derive(CandidType, Deserialize, Debug)]
pub struct SubmitRequestResponse {
    pub request: RequestDTO,
    pub privileges: RequestCallerPrivilegesDTO,
    pub additional_info: RequestAdditionalInfoDTO,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum SubmitRequestResult {
    Ok(SubmitRequestResponse),
    Err(Error),
}

// Additional types for security checks

// Enhanced ListUsersInput with all filters
#[derive(CandidType, Deserialize)]
pub struct ListUsersInput {
    pub search_term: Option<String>,
    pub statuses: Option<Vec<UserStatus>>,
    pub groups: Option<Vec<String>>,
    pub paginate: Option<PaginationInput>,
}

// Updated UserDTO to match actual Orbit response
#[derive(CandidType, Deserialize, Serialize, Debug)]
pub struct UserDTO {
    pub id: String,
    pub name: String,
    pub status: UserStatus,
    pub groups: Vec<UserGroup>,
    pub identities: Vec<Principal>, // Not wrapped in tuples
    pub last_modification_timestamp: String,
}

// List user groups with search
#[derive(CandidType, Deserialize)]
pub struct ListUserGroupsInput {
    pub search_term: Option<String>,
    pub paginate: Option<PaginationInput>,
}

// Request policies
#[derive(CandidType, Deserialize)]
pub struct ListRequestPoliciesInput {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct RequestPolicy {
    pub id: String,
    pub specifier: RequestSpecifier,
    pub rule: RequestPolicyRule,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum IdListSpecifier {
    Ids(Vec<String>),
    Any,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum RequestSpecifier {
    AddUser,
    EditUser(ResourceSpecifier),
    RemoveUser,
    Transfer(IdListSpecifier),
    AddAccount,
    EditAccount(IdListSpecifier),
    RemoveAccount,
    AddAsset,
    EditAsset(ResourceSpecifier),
    RemoveAsset(ResourceSpecifier),
    ChangeCanister,
    SetDisasterRecovery,
    ChangeExternalCanister(ResourceSpecifier),
    CreateExternalCanister,
    CallExternalCanister(Principal),
    EditPermission(ResourceSpecifier),
    EditRequestPolicy(ResourceSpecifier),
    RemoveRequestPolicy(ResourceSpecifier),
    ManageSystemInfo,
    // Missing variants from actual Orbit responses:
    AddUserGroup,
    RemoveUserGroup(ResourceSpecifier),
    AddNamedRule,
    EditNamedRule(ResourceSpecifier),
    RemoveNamedRule(ResourceSpecifier),
    EditAddressBookEntry(ResourceSpecifier),
    RemoveAddressBookEntry(ResourceSpecifier),
    FundExternalCanister(ResourceSpecifier),
    SystemUpgrade,
    AddRequestPolicy,
    EditUserGroup(ResourceSpecifier),
    AddAddressBookEntry,
}


#[derive(CandidType, Deserialize)]
pub struct RequestPolicyCallerPrivileges {
    pub id: String,
    pub can_edit: bool,
    pub can_delete: bool,
}

#[derive(CandidType, Deserialize)]
pub enum ListRequestPoliciesResult {
    Ok {
        policies: Vec<RequestPolicy>,
        privileges: Vec<RequestPolicyCallerPrivileges>,
        total: u64,
        next_offset: Option<u64>,
    },
    Err(Error),
}
