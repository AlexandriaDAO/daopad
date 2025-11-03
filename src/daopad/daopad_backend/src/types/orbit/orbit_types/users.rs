// User-related types for Orbit Station
// Domain: User management, user groups, and user privileges

use candid::{CandidType, Principal};
use serde::{Deserialize, Serialize};

use super::system::PaginationInput;
use super::system::Error;

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

// Enhanced ListUsersInput with all filters
#[derive(CandidType, Deserialize)]
pub struct ListUsersInput {
    pub search_term: Option<String>,
    pub statuses: Option<Vec<UserStatus>>,
    pub groups: Option<Vec<String>>,
    pub paginate: Option<PaginationInput>,
}

/// Full UserDTO with all user fields
///
/// Used by get_user and other endpoints that need complete user data including
/// group memberships, identities, and modification timestamps.
#[derive(CandidType, Deserialize, Serialize, Debug)]
pub struct UserDTO {
    pub id: String,
    pub name: String,
    pub status: UserStatus,
    pub groups: Vec<UserGroup>,
    pub identities: Vec<Principal>,
    pub last_modification_timestamp: String,
}

/// Minimal UserDTO used by list_permissions response
///
/// **Important**: This differs from full `UserDTO` - Orbit's `list_permissions` endpoint
/// returns only basic user info (id, status, name) without groups/identities/timestamps.
///
/// **CRITICAL**: Field order must match Orbit's exact response: id, status, name
///
/// Last verified: 2025-10-14
#[derive(CandidType, Deserialize, Serialize, Debug)]
pub struct UserDTOMinimal {
    pub id: String,
    pub status: UserStatus,
    pub name: String,
}

// List user groups with search
#[derive(CandidType, Deserialize)]
pub struct ListUserGroupsInput {
    pub search_term: Option<String>,
    pub paginate: Option<PaginationInput>,
}

// User specifier for permissions and policies
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum UserSpecifier {
    Any,
    Id(Vec<String>),     // User UUIDs
    Group(Vec<String>),  // Group UUIDs
}
