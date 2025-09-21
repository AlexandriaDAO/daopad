use crate::storage::state::TOKEN_ORBIT_STATIONS;
use crate::types::orbit::{
    AddUserOperationInput, CreateRequestInput, CreateRequestResult, EditUserOperationInput,
    RequestExecutionSchedule, RequestOperationInput, UserStatus,
};
use crate::types::StorablePrincipal;
use candid::Principal;
use ic_cdk::{query, update};

// Note: Group UUIDs are instance-specific and should be fetched dynamically
// These are common defaults but may differ between Orbit Station instances
// Use get_actual_group_ids() from dao_transition module for accurate IDs

#[update]
pub async fn add_user_to_orbit(
    token_canister_id: Principal,
    user_principal: Principal,
    user_name: String,
    groups: Vec<String>, // Group UUIDs
    status: UserStatus,
) -> Result<String, String> {
    // Get the Orbit Station ID for this token
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or("No Orbit Station linked to this token".to_string())
    })?;

    // Create the add user operation
    let add_user_operation = AddUserOperationInput {
        name: user_name.clone(),
        identities: vec![user_principal],
        groups, // Use provided groups
        status,
    };

    let request_input = CreateRequestInput {
        operation: RequestOperationInput::AddUser(add_user_operation),
        title: Some(format!("Add {} as member", user_name)),
        summary: Some(format!("Adding {} to the Orbit Station", user_name)),
        execution_plan: Some(RequestExecutionSchedule::Immediate),
        expiration_dt: None,
    };

    // Call Orbit Station to create the request
    let result: Result<(CreateRequestResult,), _> =
        ic_cdk::call(station_id, "create_request", (request_input,)).await;

    match result {
        Ok((CreateRequestResult::Ok(response),)) => {
            Ok(response.request.id)
        },
        Ok((CreateRequestResult::Err(e),)) => {
            Err(format!("Failed to create add user request: {}. Note: The backend may need 'User(Create)' permission in Orbit Station.", e))
        },
        Err((code, msg)) => {
            Err(format!("Failed to call Orbit Station: {:?} - {}. Note: Ensure the backend has 'User(Create)' permission in Orbit Station.", code, msg))
        }
    }
}

#[update]
pub async fn remove_user_from_orbit(
    token_canister_id: Principal,
    user_id: String, // UUID of the user in Orbit Station
) -> Result<String, String> {
    // Get the Orbit Station ID for this token
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or("No Orbit Station linked to this token".to_string())
    })?;

    // Create the edit user operation to set status to Inactive
    let edit_user_operation = EditUserOperationInput {
        id: user_id.clone(),
        name: None,
        identities: None,
        groups: None,
        status: Some(UserStatus::Inactive),
        cancel_pending_requests: Some(true),
    };

    let request_input = CreateRequestInput {
        operation: RequestOperationInput::EditUser(edit_user_operation),
        title: Some(format!("Remove user {}", user_id)),
        summary: Some("Setting user status to Inactive".to_string()),
        execution_plan: Some(RequestExecutionSchedule::Immediate),
        expiration_dt: None,
    };

    // Call Orbit Station to create the request
    let result: Result<(CreateRequestResult,), _> =
        ic_cdk::call(station_id, "create_request", (request_input,)).await;

    match result {
        Ok((CreateRequestResult::Ok(response),)) => {
            Ok(response.request.id)
        },
        Ok((CreateRequestResult::Err(e),)) => {
            Err(format!("Failed to create remove user request: {}. Note: Orbit Station requires explicit permissions to edit users. Even admins need the 'User(Update)' permission granted through the Orbit Station permissions settings.", e))
        },
        Err((code, msg)) => {
            Err(format!("Failed to call Orbit Station: {:?} - {}. Note: This usually means the backend doesn't have permission to edit users. You need to grant 'User(Update)' permission to the DAO Canister in Orbit Station's permission settings.", code, msg))
        }
    }
}

// Helper function to list user groups in an Orbit Station
#[update]
pub async fn list_orbit_user_groups(
    token_canister_id: Principal,
) -> Result<Vec<UserGroupInfo>, String> {
    // Get the Orbit Station ID for this token
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or("No Orbit Station linked to this token".to_string())
    })?;

    // Create input for listing user groups
    let list_input = ListUserGroupsInput {
        search_term: None,
        paginate: None,
    };

    // Call Orbit Station to list user groups
    let result: Result<(ListUserGroupsResult,), _> =
        ic_cdk::call(station_id, "list_user_groups", (list_input,)).await;

    match result {
        Ok((ListUserGroupsResult::Ok(response),)) => {
            let groups: Vec<UserGroupInfo> = response
                .groups
                .into_iter()
                .map(|g| UserGroupInfo {
                    id: g.id,
                    name: g.name,
                })
                .collect();
            Ok(groups)
        }
        Ok((ListUserGroupsResult::Err(e),)) => Err(format!("Failed to list user groups: {:?}", e)),
        Err((code, msg)) => Err(format!(
            "Failed to call Orbit Station: {:?} - {}",
            code, msg
        )),
    }
}

// Helper function to get predefined group IDs
// Note: This returns common defaults, use list_orbit_user_groups for actual IDs
#[query]
pub fn get_predefined_groups() -> Vec<UserGroupInfo> {
    vec![
        UserGroupInfo {
            id: "00000000-0000-4000-8000-000000000000".to_string(),
            name: "Admin".to_string(),
        },
        UserGroupInfo {
            id: "00000000-0000-4000-8000-000000000001".to_string(),
            name: "Operator".to_string(),
        },
    ]
}

// Helper function to list users in an Orbit Station
#[update]
pub async fn list_orbit_users(token_canister_id: Principal) -> Result<Vec<UserInfo>, String> {
    // Get the Orbit Station ID for this token
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or("No Orbit Station linked to this token".to_string())
    })?;

    // Create input for listing users
    let list_input = ListUsersInput {
        search_term: None,
        statuses: None,
        groups: None,
        paginate: None,
    };

    // Call Orbit Station to list users
    let result: Result<(ListUsersResult,), _> =
        ic_cdk::call(station_id, "list_users", (list_input,)).await;

    match result {
        Ok((ListUsersResult::Ok(response),)) => {
            let users: Vec<UserInfo> = response
                .users
                .into_iter()
                .map(|u| UserInfo {
                    id: u.id,
                    name: u.name,
                    identities: u.identities,
                    status: format!("{:?}", u.status),
                    groups: u.groups.into_iter().map(|g| g.name).collect(),
                })
                .collect();
            Ok(users)
        }
        Ok((ListUsersResult::Err(e),)) => Err(format!("Failed to list users: {:?}", e)),
        Err((code, msg)) => Err(format!(
            "Failed to call Orbit Station: {:?} - {}",
            code, msg
        )),
    }
}

// Simple user info structure for returning data
#[derive(candid::CandidType, candid::Deserialize, Clone)]
pub struct UserInfo {
    pub id: String,
    pub name: String,
    pub identities: Vec<Principal>,
    pub status: String,
    pub groups: Vec<String>,
}

// User group info structure
#[derive(candid::CandidType, candid::Deserialize, Clone)]
pub struct UserGroupInfo {
    pub id: String,
    pub name: String,
}

// Input/Output types for list_users
#[derive(candid::CandidType, candid::Deserialize)]
pub struct ListUsersInput {
    pub search_term: Option<String>,
    pub statuses: Option<Vec<UserStatus>>,
    pub groups: Option<Vec<String>>,
    pub paginate: Option<crate::api::dao_transition::PaginationInput>,
}

#[derive(candid::CandidType, candid::Deserialize)]
pub struct UserDTO {
    pub id: String,
    pub name: String,
    pub identities: Vec<Principal>,
    pub groups: Vec<UserGroupDTO>,
    pub status: UserStatus,
    pub last_modification_timestamp: String,
}

#[derive(candid::CandidType, candid::Deserialize)]
pub struct UserGroupDTO {
    pub id: String,
    pub name: String,
}

#[derive(candid::CandidType, candid::Deserialize)]
pub struct ListUsersResponse {
    pub users: Vec<UserDTO>,
    pub next_offset: Option<u64>,
    pub total: u64,
    pub privileges: Vec<UserCallerPrivilegesDTO>,
}

#[derive(candid::CandidType, candid::Deserialize)]
pub struct UserCallerPrivilegesDTO {
    pub id: String,
    pub can_edit: bool,
}

#[derive(candid::CandidType, candid::Deserialize)]
pub enum ListUsersResult {
    Ok(ListUsersResponse),
    Err(crate::types::orbit::Error),
}

// Input/Output types for list_user_groups
#[derive(candid::CandidType, candid::Deserialize)]
pub struct ListUserGroupsInput {
    pub search_term: Option<String>,
    pub paginate: Option<crate::api::dao_transition::PaginationInput>,
}

#[derive(candid::CandidType, candid::Deserialize)]
pub struct ListUserGroupsResponse {
    pub groups: Vec<UserGroupDTO>,
    pub next_offset: Option<u64>,
    pub total: u64,
    pub privileges: Vec<UserGroupCallerPrivilegesDTO>,
}

#[derive(candid::CandidType, candid::Deserialize)]
pub struct UserGroupCallerPrivilegesDTO {
    pub id: String,
    pub can_edit: bool,
    pub can_delete: bool,
}

#[derive(candid::CandidType, candid::Deserialize)]
pub enum ListUserGroupsResult {
    Ok(ListUserGroupsResponse),
    Err(crate::types::orbit::Error),
}
