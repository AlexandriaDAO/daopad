use candid::Principal;
use crate::types::orbit::{
    ListPermissionsInput, ListPermissionsResult,
    GetPermissionInput,
    Permission, Resource, AuthScope, UUID,
    EditPermissionOperationInput,
    RequestOperationInput,
    CreateRequestInput, CreateRequestResult,
};

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
            Ok(response.request.id)
        }
        CreateRequestResult::Err(e) => {
            Err(format!("Orbit returned error: {:?}", e))
        }
    }
}
