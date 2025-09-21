use crate::storage::state::TOKEN_ORBIT_STATIONS;
use crate::types::orbit::{
    CreateRequestInput, CreateRequestResult, EditUserOperationInput, Error, MeResult,
    RequestExecutionSchedule, RequestOperationInput, UserPrivilege,
};
use crate::types::StorablePrincipal;
use candid::{CandidType, Deserialize, Principal};
use ic_cdk::update;

// Types for dynamic group ID resolution
#[derive(CandidType, Deserialize)]
pub struct OrbitListGroupsInput {
    pub search_term: Option<String>,
    pub paginate: Option<PaginationInput>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct PaginationInput {
    pub offset: Option<u64>,
    pub limit: Option<u16>,
}

#[derive(CandidType, Deserialize)]
pub struct OrbitGroupDTO {
    pub id: String,
    pub name: String,
}

#[derive(CandidType, Deserialize)]
pub struct OrbitGroupPrivilegesDTO {
    pub id: String,
    pub can_edit: bool,
    pub can_delete: bool,
}

#[derive(CandidType, Deserialize)]
pub struct OrbitListGroupsData {
    pub user_groups: Vec<OrbitGroupDTO>,
    pub total: u64,
    pub next_offset: Option<u64>,
    pub privileges: Vec<OrbitGroupPrivilegesDTO>,
}

#[derive(CandidType, Deserialize)]
pub enum OrbitListGroupsResponse {
    Ok(OrbitListGroupsData),
    Err(Error),
}

#[derive(CandidType, Deserialize, Clone)]
pub struct GroupIds {
    pub admin_group_id: String,
    pub operator_group_id: String,
}

// Helper function to get actual group IDs for this Orbit Station
#[update]
pub async fn get_actual_group_ids(token_canister_id: Principal) -> Result<GroupIds, String> {
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or("No Orbit Station linked to this token".to_string())
    })?;

    // Call the raw Orbit API to get groups
    let result: Result<(OrbitListGroupsResponse,), _> = ic_cdk::call(
        station_id,
        "list_user_groups",
        (OrbitListGroupsInput {
            search_term: None,
            paginate: None,
        },),
    )
    .await;

    match result {
        Ok((response,)) => match response {
            OrbitListGroupsResponse::Ok(data) => {
                let mut admin_id = None;
                let mut operator_id = None;

                for group in data.user_groups {
                    if group.name == "Admin" {
                        admin_id = Some(group.id.clone());
                    } else if group.name == "Operator" {
                        operator_id = Some(group.id.clone());
                    }
                }

                Ok(GroupIds {
                    admin_group_id: admin_id.ok_or("Admin group not found")?,
                    operator_group_id: operator_id.ok_or("Operator group not found")?,
                })
            }
            OrbitListGroupsResponse::Err(e) => Err(format!("Failed to list groups: {:?}", e)),
        },
        Err((code, msg)) => Err(format!(
            "Failed to call Orbit Station: {:?} - {}",
            code, msg
        )),
    }
}

// Phase 1: Permission Management Functions

#[update]
pub async fn grant_self_permissions(token_canister_id: Principal) -> Result<String, String> {
    let backend_principal = ic_cdk::api::id();

    // Get the Orbit Station ID for this token
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or("No Orbit Station linked to this token".to_string())
    })?;

    // Note: Permissions must be granted manually through Orbit Station UI
    // This function returns instructions for the admin
    Ok(format!(
        "To complete permission setup:\n\
        1. Log into Orbit Station at: https://{}.icp0.io\n\
        2. Navigate to Settings > Permissions\n\
        3. Grant the following permissions to principal: {}\n\
           - User(Update(Any)) - Edit any user's status/groups\n\
           - User(Create) - Add new users\n\
           - Permission(Update) - Modify permissions\n\
           - RequestPolicy(Update) - Adjust approval requirements\n\
           - System(ManageSystemInfo) - Update system settings\n\
        4. Approve the permission request\n\
        5. Call verify_permissions() to confirm",
        station_id, backend_principal
    ))
}

#[update]
pub async fn verify_permissions(token_canister_id: Principal) -> Result<PermissionStatus, String> {
    // Get the Orbit Station ID for this token
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or("No Orbit Station linked to this token".to_string())
    })?;

    // Call Orbit Station's me() function to get current user info and privileges
    let result: Result<(MeResult,), _> = ic_cdk::call(station_id, "me", ()).await;

    match result {
        Ok((MeResult::Ok { me, privileges },)) => {
            // Get actual group IDs for this Orbit Station
            let group_ids = get_actual_group_ids(token_canister_id)
                .await
                .unwrap_or_else(|_| {
                    // Fallback to common defaults if we can't fetch them
                    GroupIds {
                        admin_group_id: "00000000-0000-4000-8000-000000000000".to_string(),
                        operator_group_id: "00000000-0000-4000-8000-000000000001".to_string(),
                    }
                });

            // Check if we're in the admin group using the actual group ID
            let is_admin = me.groups.iter().any(|g| g.id == group_ids.admin_group_id);

            // Check for required privileges
            let has_user_management = privileges.contains(&UserPrivilege::AddUser);
            let has_system_management = privileges.contains(&UserPrivilege::ManageSystemInfo);

            Ok(PermissionStatus {
                is_admin,
                has_user_management,
                has_system_management,
                user_name: me.name,
                user_id: me.id,
                groups: me.groups.into_iter().map(|g| g.name).collect(),
                privileges: privileges.into_iter().map(|p| format!("{:?}", p)).collect(),
            })
        }
        Ok((MeResult::Err(e),)) => Err(format!("Failed to get user info: {:?}", e)),
        Err((code, msg)) => Err(format!(
            "Failed to call Orbit Station: {:?} - {}",
            code, msg
        )),
    }
}

// Phase 2: Admin Management Functions

#[update]
pub async fn list_all_admins(token_canister_id: Principal) -> Result<Vec<AdminInfo>, String> {
    // Get the Orbit Station ID for this token
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or("No Orbit Station linked to this token".to_string())
    })?;

    // Get actual group IDs for this Orbit Station
    let group_ids = get_actual_group_ids(token_canister_id)
        .await
        .unwrap_or_else(|_| {
            // Fallback to common defaults if we can't fetch them
            GroupIds {
                admin_group_id: "00000000-0000-4000-8000-000000000000".to_string(),
                operator_group_id: "00000000-0000-4000-8000-000000000001".to_string(),
            }
        });

    // Use the existing list_users functionality with actual admin group ID
    let list_input = crate::api::orbit_users::ListUsersInput {
        search_term: None,
        statuses: None,
        groups: Some(vec![group_ids.admin_group_id.clone()]), // Use actual admin group ID
        paginate: None,
    };

    let result: Result<(crate::api::orbit_users::ListUsersResult,), _> =
        ic_cdk::call(station_id, "list_users", (list_input,)).await;

    match result {
        Ok((crate::api::orbit_users::ListUsersResult::Ok(response),)) => {
            let admins: Vec<AdminInfo> = response
                .users
                .into_iter()
                .map(|u| {
                    let is_backend = u.identities.contains(&ic_cdk::api::id());
                    AdminInfo {
                        id: u.id,
                        name: u.name,
                        identities: u.identities,
                        status: format!("{:?}", u.status),
                        is_daopad_backend: is_backend,
                    }
                })
                .collect();
            Ok(admins)
        }
        Ok((crate::api::orbit_users::ListUsersResult::Err(e),)) => {
            Err(format!("Failed to list admins: {:?}", e))
        }
        Err((code, msg)) => Err(format!(
            "Failed to call Orbit Station: {:?} - {}",
            code, msg
        )),
    }
}

#[update]
pub async fn remove_admin_role(
    token_canister_id: Principal,
    user_id: String,
) -> Result<String, String> {
    // Get the Orbit Station ID for this token
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or("No Orbit Station linked to this token".to_string())
    })?;

    // Safety check: Don't remove ourselves
    let admins = list_all_admins(token_canister_id).await?;
    let target_admin = admins
        .iter()
        .find(|a| a.id == user_id)
        .ok_or("User not found in admin list")?;

    if target_admin.is_daopad_backend {
        return Err("Cannot remove DAOPad backend from admin role!".to_string());
    }

    // Create edit user operation to remove from admin group
    let edit_user_operation = EditUserOperationInput {
        id: user_id.clone(),
        name: None,
        identities: None,
        groups: Some(vec![]), // Remove from all groups (including admin)
        status: None,
        cancel_pending_requests: Some(true),
    };

    let request_input = CreateRequestInput {
        operation: RequestOperationInput::EditUser(edit_user_operation),
        title: Some(format!("Remove admin role from user {}", user_id)),
        summary: Some("DAO transition: Removing human admin".to_string()),
        execution_plan: Some(RequestExecutionSchedule::Immediate),
        expiration_dt: None,
    };

    // Call Orbit Station to create the request
    let result: Result<(CreateRequestResult,), _> =
        ic_cdk::call(station_id, "create_request", (request_input,)).await;

    match result {
        Ok((CreateRequestResult::Ok(response),)) => Ok(response.request.id),
        Ok((CreateRequestResult::Err(e),)) => {
            Err(format!("Failed to create remove admin request: {}", e))
        }
        Err((code, msg)) => Err(format!(
            "Failed to call Orbit Station: {:?} - {}",
            code, msg
        )),
    }
}

#[update]
pub async fn downgrade_to_operator(
    token_canister_id: Principal,
    user_id: String,
) -> Result<String, String> {
    // Get the Orbit Station ID for this token
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or("No Orbit Station linked to this token".to_string())
    })?;

    // Get actual group IDs for this Orbit Station
    let group_ids = get_actual_group_ids(token_canister_id)
        .await
        .unwrap_or_else(|_| {
            // Fallback to common defaults if we can't fetch them
            GroupIds {
                admin_group_id: "00000000-0000-4000-8000-000000000000".to_string(),
                operator_group_id: "00000000-0000-4000-8000-000000000001".to_string(),
            }
        });

    // Create edit user operation to set as operator only
    let edit_user_operation = EditUserOperationInput {
        id: user_id.clone(),
        name: None,
        identities: None,
        groups: Some(vec![group_ids.operator_group_id]), // Use actual operator group ID
        status: None,
        cancel_pending_requests: None,
    };

    let request_input = CreateRequestInput {
        operation: RequestOperationInput::EditUser(edit_user_operation),
        title: Some(format!("Downgrade user {} to operator", user_id)),
        summary: Some("DAO transition: Converting admin to operator".to_string()),
        execution_plan: Some(RequestExecutionSchedule::Immediate),
        expiration_dt: None,
    };

    // Call Orbit Station to create the request
    let result: Result<(CreateRequestResult,), _> =
        ic_cdk::call(station_id, "create_request", (request_input,)).await;

    match result {
        Ok((CreateRequestResult::Ok(response),)) => Ok(response.request.id),
        Ok((CreateRequestResult::Err(e),)) => {
            Err(format!("Failed to create downgrade request: {}", e))
        }
        Err((code, msg)) => Err(format!(
            "Failed to call Orbit Station: {:?} - {}",
            code, msg
        )),
    }
}

// Phase 3: Verification Functions

#[update]
pub async fn verify_sole_admin(token_canister_id: Principal) -> Result<bool, String> {
    let admins = list_all_admins(token_canister_id).await?;

    // Check if DAOPad backend is the only admin
    let daopad_admin_count = admins.iter().filter(|a| a.is_daopad_backend).count();
    let total_admin_count = admins.len();

    if daopad_admin_count == 0 {
        return Err("DAOPad backend is not an admin!".to_string());
    }

    Ok(total_admin_count == 1 && daopad_admin_count == 1)
}

#[update]
pub async fn get_admin_count(token_canister_id: Principal) -> Result<AdminCount, String> {
    let admins = list_all_admins(token_canister_id).await?;

    let daopad_admins = admins.iter().filter(|a| a.is_daopad_backend).count() as u32;
    let human_admins = admins.iter().filter(|a| !a.is_daopad_backend).count() as u32;

    Ok(AdminCount {
        total: admins.len() as u32,
        daopad_backend: daopad_admins,
        human_admins,
        admin_list: admins,
    })
}

// Helper Types

#[derive(candid::CandidType, candid::Deserialize, Clone)]
pub struct PermissionStatus {
    pub is_admin: bool,
    pub has_user_management: bool,
    pub has_system_management: bool,
    pub user_name: String,
    pub user_id: String,
    pub groups: Vec<String>,
    pub privileges: Vec<String>,
}

#[derive(candid::CandidType, candid::Deserialize, Clone)]
pub struct AdminInfo {
    pub id: String,
    pub name: String,
    pub identities: Vec<Principal>,
    pub status: String,
    pub is_daopad_backend: bool,
}

#[derive(candid::CandidType, candid::Deserialize)]
pub struct AdminCount {
    pub total: u32,
    pub daopad_backend: u32,
    pub human_admins: u32,
    pub admin_list: Vec<AdminInfo>,
}
