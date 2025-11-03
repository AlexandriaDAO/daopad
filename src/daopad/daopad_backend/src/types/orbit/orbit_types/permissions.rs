// Permission-related types for Orbit Station
// Domain: Resource permissions, access control, and authorization

use candid::{CandidType, Principal};
use serde::{Deserialize, Serialize};

use super::system::{PaginationInput, Error, UUID, Allow, AuthScope};
use super::users::{UserGroup, UserDTOMinimal};

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
    Remove(ResourceSpecifier), // Distinguish from Delete for policies/rules
    List,
}

// Specialized actions for certain resources
#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum ExternalCanisterAction {
    Create,
    Change(ExternalCanisterSpecifier),
    Configure(ExternalCanisterSpecifier), // For NativeSettings controller modification
    Fund(ExternalCanisterSpecifier),
    Call(ExternalCanisterSpecifier), // For arbitrary method calls
    Monitor(ExternalCanisterSpecifier), // For automatic cycle funding
    Snapshot(ExternalCanisterSpecifier), // For snapshot/restore/prune operations
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
    Restore, // For system restore time-travel attacks
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
        // CRITICAL: Field order must match Orbit Station's exact response
        // Verified with: dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_permissions '(record { resources = null; paginate = null; })'
        // Orbit returns: permissions, total, privileges, user_groups, users, next_offset
        // Last verified: 2025-10-14
        permissions: Vec<Permission>,
        total: u64,
        privileges: Vec<PermissionCallerPrivileges>,
        user_groups: Vec<UserGroup>,
        users: Vec<UserDTOMinimal>,
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
