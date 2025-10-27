use candid::Principal;
use crate::types::orbit::{
    ListPermissionsInput, ListPermissionsResult,
    GetPermissionInput,
    Permission, Resource, AuthScope, UUID,
    EditPermissionOperationInput,
    RequestOperationInput,
    CreateRequestInput, CreateRequestResult,
    ListUserGroupsInput, ListUserGroupsResult,
    UserGroup,
};
use crate::storage::state::TOKEN_ORBIT_STATIONS;
use crate::types::StorablePrincipal;

/// List all permissions for a station (admin proxy)
///
/// Since Orbit restricts permission queries to admin users only, this backend method
/// acts as an admin proxy to fetch permissions on behalf of frontend users.
#[ic_cdk::update]
pub async fn list_station_permissions(
    station_id: Principal,
    resources: Option<Vec<Resource>>
) -> Result<Vec<Permission>, String> {
    // Construct input
    let input = ListPermissionsInput {
        resources,
        paginate: None,
    };

    // Call Orbit station's list_permissions
    let result: (ListPermissionsResult,) = ic_cdk::call(station_id, "list_permissions", (input,))
        .await
        .map_err(|e| format!("Failed to list permissions: {:?}", e))?;

    // Handle result
    match result.0 {
        ListPermissionsResult::Ok { permissions, .. } => Ok(permissions),
        ListPermissionsResult::Err(e) => Err(format!("Orbit returned error: {}", e)),
    }
}

/// Get specific permission details
///
/// Fetches a single permission by resource type from Orbit Station.
#[ic_cdk::update]
pub async fn get_station_permission(
    station_id: Principal,
    resource: Resource
) -> Result<Permission, String> {
    // Construct input
    let input = GetPermissionInput { resource };

    // Call Orbit station's get_permission
    let result: (Result<Permission, String>,) = ic_cdk::call(station_id, "get_permission", (input,))
        .await
        .map_err(|e| format!("Failed to get permission: {:?}", e))?;

    // Return permission or error
    result.0.map_err(|e| format!("Orbit returned error: {}", e))
}

/// Create edit permission request
///
/// Creates a request in Orbit Station to modify a permission's access control.
/// Note: This creates a REQUEST, not an immediate change. The request must be
/// approved according to the station's request policies.
///
/// Returns the request ID if successful.
#[ic_cdk::update]
pub async fn create_edit_permission_request(
    station_id: Principal,
    resource: Resource,
    auth_scope: Option<AuthScope>,
    users: Option<Vec<UUID>>,
    user_groups: Option<Vec<UUID>>
) -> Result<String, String> {
    // Construct the EditPermission operation
    let edit_perm_input = EditPermissionOperationInput {
        resource,
        auth_scope,
        users,
        user_groups,
    };

    // Construct the create request input
    let create_input = CreateRequestInput {
        operation: RequestOperationInput::EditPermission(edit_perm_input),
        title: Some("Edit Permission Request".to_string()),
        summary: None,
        execution_plan: None,
        expiration_dt: None,
    };

    // Submit the request to Orbit Station
    let result: (CreateRequestResult,) = ic_cdk::call(
        station_id,
        "create_request",
        (create_input,)
    )
    .await
    .map_err(|e| format!("Failed to create permission edit request: {:?}", e))?;

    // Extract request ID from result
    match result.0 {
        CreateRequestResult::Ok(response) => {
            let request_id = response.request.id;

            // CRITICAL: Auto-create proposal for governance
            // Note: For permission edits, we need to determine which token this station belongs to
            // Since we're called with station_id, we need to find the corresponding token
            use crate::storage::state::STATION_TO_TOKEN;

            let token_canister_id = STATION_TO_TOKEN.with(|s2t| {
                s2t.borrow()
                    .get(&StorablePrincipal(station_id))
                    .map(|sp| sp.0)
            }).ok_or("Station not linked to any token")?;

            use crate::proposals::ensure_proposal_for_request;

            match ensure_proposal_for_request(
                token_canister_id,
                request_id.clone(),
                "EditPermission".to_string(),  // 70% threshold
            ).await {
                Ok(_proposal_id) => Ok(request_id),
                Err(e) => Err(format!("GOVERNANCE VIOLATION: Created Orbit request but failed to create proposal: {:?}", e))
            }
        }
        CreateRequestResult::Err(e) => {
            Err(format!("Orbit returned error: {:?}", e))
        }
    }
}

/// Remove dangerous permission from Operator group
///
/// This specialized function removes the Operator group (UUID: 00000000-0000-4000-8000-000000000001)
/// from a specific permission. It automatically creates a governance proposal for the change.
///
/// Returns the request ID if successful.
#[ic_cdk::update]
pub async fn remove_permission_from_operator_group(
    token_canister_id: Principal,
    resource: Resource
) -> Result<String, String> {
    // Get station ID for token
    let station_id = TOKEN_ORBIT_STATIONS.with(|s| {
        s.borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|sp| sp.0)
    }).ok_or("Token not linked to any Orbit station")?;

    // Get current permission configuration
    let current = get_station_permission(station_id, resource.clone()).await?;

    // Filter out Operator group UUID (00000000-0000-4000-8000-000000000001)
    const OPERATOR_GROUP_UUID: &str = "00000000-0000-4000-8000-000000000001";
    let filtered_groups: Vec<UUID> = current.allow.user_groups
        .into_iter()
        .filter(|id| id != OPERATOR_GROUP_UUID)
        .collect();

    // Create edit request with filtered groups (keep auth_scope and users unchanged)
    let edit_perm_input = EditPermissionOperationInput {
        resource,
        auth_scope: Some(current.allow.auth_scope),
        users: Some(current.allow.users),
        user_groups: Some(filtered_groups),
    };

    // Construct the create request input
    let create_input = CreateRequestInput {
        operation: RequestOperationInput::EditPermission(edit_perm_input),
        title: Some(format!("Remove dangerous permissions from Operator group")),
        summary: Some(format!("Security fix: Removing Operator group from permission to prevent unauthorized treasury operations")),
        execution_plan: None,
        expiration_dt: None,
    };

    // Submit the request to Orbit Station
    let result: (CreateRequestResult,) = ic_cdk::call(
        station_id,
        "create_request",
        (create_input,)
    )
    .await
    .map_err(|e| format!("Failed to create permission removal request: {:?}", e))?;

    // Extract request ID from result and create proposal
    match result.0 {
        CreateRequestResult::Ok(response) => {
            let request_id = response.request.id;

            // CRITICAL: Auto-create proposal for governance
            use crate::proposals::ensure_proposal_for_request;

            match ensure_proposal_for_request(
                token_canister_id,
                request_id.clone(),
                "EditPermission".to_string(),  // 70% threshold
            ).await {
                Ok(_proposal_id) => Ok(request_id),
                Err(e) => Err(format!("GOVERNANCE VIOLATION: Created Orbit request but failed to create proposal: {:?}", e))
            }
        }
        CreateRequestResult::Err(e) => {
            Err(format!("Orbit returned error: {:?}", e))
        }
    }
}

/// List all user groups in a station (admin proxy)
///
/// Fetches the complete list of user groups including Admin, Operator, and custom groups.
/// Frontend uses this to map UUIDs to human-readable names in permissions display.
///
/// Since Orbit restricts user group queries to admin users only, this backend method
/// acts as an admin proxy to fetch user groups on behalf of frontend users.
#[ic_cdk::update]
pub async fn list_station_user_groups(
    station_id: Principal
) -> Result<Vec<UserGroup>, String> {
    // Construct input for Orbit's list_user_groups API
    let input = ListUserGroupsInput {
        search_term: None,
        paginate: None,
    };

    // Call Orbit station's list_user_groups
    let result: (ListUserGroupsResult,) = ic_cdk::call(
        station_id,
        "list_user_groups",
        (input,)
    )
    .await
    .map_err(|e| format!("Failed to list user groups: {:?}", e))?;

    // Handle result and extract groups
    match result.0 {
        ListUserGroupsResult::Ok(response) => {
            Ok(response.user_groups)
        }
        ListUserGroupsResult::Err(e) => {
            Err(format!("Orbit returned error: {}", e))
        }
    }
}
