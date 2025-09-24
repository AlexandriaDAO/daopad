use crate::storage::state::TOKEN_ORBIT_STATIONS;
use crate::types::{StorablePrincipal};
use crate::types::orbit::*;
use candid::{encode_args, decode_args, IDLValue, Principal};
use candid::types::{Label, value::IDLField};
use ic_cdk;
use ic_cdk::api::call::call_raw;

// Hash function for Candid field names (matching orbit_requests.rs)
fn candid_hash(name: &str) -> u32 {
    let mut hash: u32 = 0;
    for byte in name.bytes() {
        hash = hash.wrapping_mul(223).wrapping_add(byte as u32);
    }
    hash
}

// Helper to find field by name or hash
fn field<'a>(fields: &'a [IDLField], name: &str) -> Option<&'a IDLValue> {
    let hash = candid_hash(name);
    fields.iter().find_map(|f| match &f.id {
        Label::Named(label) if label == name => Some(&f.val),
        Label::Id(id) if *id == hash => Some(&f.val),
        _ => None,
    })
}

// Helper to get label name from field
fn label_name(field_id: &Label) -> Option<String> {
    match field_id {
        Label::Named(name) => Some(name.clone()),
        Label::Id(id) => {
            // Check for common variants
            if *id == candid_hash("Ok") {
                Some("Ok".to_string())
            } else if *id == candid_hash("Err") {
                Some("Err".to_string())
            } else {
                None
            }
        },
        _ => None,
    }
}

// Helper function to get station for token
async fn get_station_for_token(token_id: Principal) -> Result<Principal, String> {
    TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_id))
            .map(|s| s.0)
            .ok_or_else(|| format!("No Orbit Station found for token {}", token_id))
    })
}

#[ic_cdk::update] // Must be update for cross-canister calls
pub async fn list_permissions(
    token_id: Principal,
    resources: Option<Vec<Resource>>,
) -> Result<ListPermissionsResponse, String> {
    let station_id = get_station_for_token(token_id).await?;

    // Prepare input with proper optional encoding
    let input = ListPermissionsInput {
        resources,
        paginate: None, // Start without pagination
    };

    // Encode the arguments
    let args = encode_args((input,))
        .map_err(|e| format!("Failed to encode arguments: {:?}", e))?;

    // Call Orbit Station
    let result = call_raw(
        station_id,
        "list_permissions",
        &args,
        0
    ).await
    .map_err(|e| format!("Failed to call list_permissions: {:?}", e))?;

    // Decode the response
    let decoded: (IDLValue,) = decode_args(&result)
        .map_err(|e| format!("Failed to decode response: {:?}", e))?;

    parse_list_permissions_response(&decoded.0)
}

// Parse response handling hash IDs
fn parse_list_permissions_response(value: &IDLValue) -> Result<ListPermissionsResponse, String> {
    // Handle variant { Ok = record { ... } }
    if let IDLValue::Variant(variant) = value {
        if let Some(label) = label_name(&variant.0.id) {
            if label == "Ok" {
                if let IDLValue::Record(fields) = &variant.0.val {
                    let permissions = field(fields, "permissions")
                        .and_then(parse_permissions_vec)
                        .unwrap_or_default();

                    let total = field(fields, "total")
                        .and_then(idl_to_nat64)
                        .unwrap_or(0);

                    let user_groups = field(fields, "user_groups")
                        .and_then(parse_user_groups_vec)
                        .unwrap_or_default();

                    let privileges = field(fields, "privileges")
                        .and_then(parse_permission_privileges_vec)
                        .unwrap_or_default();

                    return Ok(ListPermissionsResponse {
                        permissions,
                        privileges,
                        total,
                        user_groups,
                    });
                }
            } else if label == "Err" {
                return Err(parse_error_message(&variant.0.val));
            }
        }
    }

    Err("Invalid response format".to_string())
}

fn parse_permissions_vec(value: &IDLValue) -> Option<Vec<Permission>> {
    if let IDLValue::Vec(items) = value {
        return Some(items.iter().filter_map(parse_permission).collect());
    }
    None
}

fn parse_permission(value: &IDLValue) -> Option<Permission> {
    if let IDLValue::Record(fields) = value {
        let resource = field(fields, "resource").and_then(parse_resource)?;
        let allow = field(fields, "allow").and_then(parse_allow)?;

        return Some(Permission { resource, allow });
    }
    None
}

fn parse_resource(value: &IDLValue) -> Option<Resource> {
    if let IDLValue::Variant(variant) = value {
        let resource_type = label_name(&variant.0.id)?;
        let action_value = &variant.0.val;

        match resource_type.as_str() {
            "Account" => {
                let action = parse_resource_action(action_value)?;
                Some(Resource::Account(action))
            },
            "AddressBook" => {
                let action = parse_resource_action(action_value)?;
                Some(Resource::AddressBook(action))
            },
            "Asset" => {
                let action = parse_resource_action(action_value)?;
                Some(Resource::Asset(action))
            },
            "ExternalCanister" => {
                let action = parse_external_canister_action(action_value)?;
                Some(Resource::ExternalCanister(action))
            },
            "NamedRule" => {
                let action = parse_resource_action(action_value)?;
                Some(Resource::NamedRule(action))
            },
            "Notification" => {
                let action = parse_notification_action(action_value)?;
                Some(Resource::Notification(action))
            },
            "Permission" => {
                let action = parse_permission_action(action_value)?;
                Some(Resource::Permission(action))
            },
            "Request" => {
                let action = parse_request_action(action_value)?;
                Some(Resource::Request(action))
            },
            "RequestPolicy" => {
                let action = parse_resource_action(action_value)?;
                Some(Resource::RequestPolicy(action))
            },
            "System" => {
                let action = parse_system_action(action_value)?;
                Some(Resource::System(action))
            },
            "User" => {
                let action = parse_user_action(action_value)?;
                Some(Resource::User(action))
            },
            "UserGroup" => {
                let action = parse_resource_action(action_value)?;
                Some(Resource::UserGroup(action))
            },
            _ => None
        }
    } else {
        None
    }
}

fn parse_resource_action(value: &IDLValue) -> Option<ResourceAction> {
    if let IDLValue::Variant(variant) = value {
        let action_name = label_name(&variant.0.id)?;
        match action_name.as_str() {
            "Create" => Some(ResourceAction::Create),
            "List" => Some(ResourceAction::List),
            "Update" => {
                let spec = parse_resource_specifier(&variant.0.val)?;
                Some(ResourceAction::Update(spec))
            },
            "Delete" => {
                let spec = parse_resource_specifier(&variant.0.val)?;
                Some(ResourceAction::Delete(spec))
            },
            "Read" => {
                let spec = parse_resource_specifier(&variant.0.val)?;
                Some(ResourceAction::Read(spec))
            },
            "Transfer" => {
                let spec = parse_resource_specifier(&variant.0.val)?;
                Some(ResourceAction::Transfer(spec))
            },
            _ => None
        }
    } else {
        None
    }
}

fn parse_external_canister_action(value: &IDLValue) -> Option<ExternalCanisterAction> {
    if let IDLValue::Variant(variant) = value {
        let action_name = label_name(&variant.0.id)?;
        match action_name.as_str() {
            "Create" => Some(ExternalCanisterAction::Create),
            "List" => Some(ExternalCanisterAction::List),
            "Change" => {
                let spec = parse_resource_specifier(&variant.0.val)?;
                Some(ExternalCanisterAction::Change(spec))
            },
            "Fund" => {
                let spec = parse_resource_specifier(&variant.0.val)?;
                Some(ExternalCanisterAction::Fund(spec))
            },
            "Read" => {
                let spec = parse_resource_specifier(&variant.0.val)?;
                Some(ExternalCanisterAction::Read(spec))
            },
            _ => None
        }
    } else {
        None
    }
}

fn parse_permission_action(value: &IDLValue) -> Option<PermissionAction> {
    if let IDLValue::Variant(variant) = value {
        let action_name = label_name(&variant.0.id)?;
        match action_name.as_str() {
            "Read" => Some(PermissionAction::Read),
            "Update" => Some(PermissionAction::Update),
            _ => None
        }
    } else {
        None
    }
}

fn parse_system_action(value: &IDLValue) -> Option<SystemAction> {
    if let IDLValue::Variant(variant) = value {
        let action_name = label_name(&variant.0.id)?;
        match action_name.as_str() {
            "ManageSystemInfo" => Some(SystemAction::ManageSystemInfo),
            "Upgrade" => Some(SystemAction::Upgrade),
            "Capabilities" => Some(SystemAction::Capabilities),
            "SystemInfo" => Some(SystemAction::SystemInfo),
            _ => None
        }
    } else {
        None
    }
}

fn parse_request_action(value: &IDLValue) -> Option<RequestAction> {
    if let IDLValue::Variant(variant) = value {
        let action_name = label_name(&variant.0.id)?;
        match action_name.as_str() {
            "List" => Some(RequestAction::List),
            "Read" => {
                let spec = parse_resource_specifier(&variant.0.val)?;
                Some(RequestAction::Read(spec))
            },
            _ => None
        }
    } else {
        None
    }
}

fn parse_user_action(value: &IDLValue) -> Option<UserAction> {
    if let IDLValue::Variant(variant) = value {
        let action_name = label_name(&variant.0.id)?;
        match action_name.as_str() {
            "Create" => Some(UserAction::Create),
            "List" => Some(UserAction::List),
            "Update" => {
                let spec = parse_resource_specifier(&variant.0.val)?;
                Some(UserAction::Update(spec))
            },
            "Read" => {
                let spec = parse_resource_specifier(&variant.0.val)?;
                Some(UserAction::Read(spec))
            },
            _ => None
        }
    } else {
        None
    }
}

fn parse_notification_action(value: &IDLValue) -> Option<NotificationAction> {
    if let IDLValue::Variant(variant) = value {
        let action_name = label_name(&variant.0.id)?;
        match action_name.as_str() {
            "Create" => Some(NotificationAction::Create),
            "Update" => Some(NotificationAction::Update),
            "Delete" => Some(NotificationAction::Delete),
            "Read" => Some(NotificationAction::Read),
            "List" => Some(NotificationAction::List),
            "MarkRead" => Some(NotificationAction::MarkRead),
            _ => None
        }
    } else {
        None
    }
}

fn parse_resource_specifier(value: &IDLValue) -> Option<ResourceSpecifier> {
    if let IDLValue::Variant(variant) = value {
        let spec_type = label_name(&variant.0.id)?;
        match spec_type.as_str() {
            "Any" => Some(ResourceSpecifier::Any),
            "Id" => {
                if let IDLValue::Text(id) = &variant.0.val {
                    Some(ResourceSpecifier::Id(id.clone()))
                } else {
                    None
                }
            },
            _ => None
        }
    } else {
        None
    }
}

fn parse_allow(value: &IDLValue) -> Option<Allow> {
    if let IDLValue::Record(fields) = value {
        let auth_scope = field(fields, "auth_scope")
            .and_then(parse_auth_scope)
            .unwrap_or(AuthScope::Public);

        let users = field(fields, "users")
            .and_then(parse_string_vec)
            .unwrap_or_default();

        let user_groups = field(fields, "user_groups")
            .and_then(parse_string_vec)
            .unwrap_or_default();

        return Some(Allow {
            auth_scope,
            users,
            user_groups,
        });
    }
    None
}

fn parse_auth_scope(value: &IDLValue) -> Option<AuthScope> {
    if let IDLValue::Variant(variant) = value {
        let scope_type = label_name(&variant.0.id)?;
        match scope_type.as_str() {
            "Public" => Some(AuthScope::Public),
            "Authenticated" => Some(AuthScope::Authenticated),
            "Restricted" => Some(AuthScope::Restricted),
            _ => None
        }
    } else {
        None
    }
}

fn parse_user_groups_vec(value: &IDLValue) -> Option<Vec<UserGroup>> {
    if let IDLValue::Vec(items) = value {
        return Some(items.iter().filter_map(parse_user_group).collect());
    }
    None
}

fn parse_user_group(value: &IDLValue) -> Option<UserGroup> {
    if let IDLValue::Record(fields) = value {
        let id = field(fields, "id").and_then(idl_to_string)?;
        let name = field(fields, "name").and_then(idl_to_string)?;

        return Some(UserGroup { id, name });
    }
    None
}

fn parse_permission_privileges_vec(value: &IDLValue) -> Option<Vec<PermissionCallerPrivileges>> {
    if let IDLValue::Vec(items) = value {
        return Some(items.iter().filter_map(parse_permission_privilege).collect());
    }
    None
}

fn parse_permission_privilege(value: &IDLValue) -> Option<PermissionCallerPrivileges> {
    if let IDLValue::Record(fields) = value {
        let resource = field(fields, "resource").and_then(parse_resource)?;
        let can_edit = field(fields, "can_edit")
            .and_then(idl_to_bool)
            .unwrap_or(false);

        return Some(PermissionCallerPrivileges { resource, can_edit });
    }
    None
}

fn parse_string_vec(value: &IDLValue) -> Option<Vec<String>> {
    if let IDLValue::Vec(items) = value {
        return Some(items.iter().filter_map(idl_to_string).collect());
    }
    None
}

fn idl_to_string(value: &IDLValue) -> Option<String> {
    if let IDLValue::Text(s) = value {
        Some(s.clone())
    } else {
        None
    }
}

fn idl_to_bool(value: &IDLValue) -> Option<bool> {
    if let IDLValue::Bool(b) = value {
        Some(*b)
    } else {
        None
    }
}

fn idl_to_nat64(value: &IDLValue) -> Option<u64> {
    match value {
        IDLValue::Nat64(n) => Some(*n),
        IDLValue::Nat(n) => {
            // Try to convert to string then parse
            n.0.to_string().parse().ok()
        },
        _ => None
    }
}

fn parse_error_message(value: &IDLValue) -> String {
    if let IDLValue::Record(fields) = value {
        if let Some(message) = field(fields, "message").and_then(idl_to_opt_string) {
            return message.unwrap_or_else(|| "Unknown error".to_string());
        }
        if let Some(code) = field(fields, "code").and_then(idl_to_string) {
            return code;
        }
    }
    "Failed to parse error message".to_string()
}

fn idl_to_opt_string(value: &IDLValue) -> Option<Option<String>> {
    match value {
        IDLValue::Opt(inner) => {
            // Opt contains a Box<IDLValue>
            match inner.as_ref() {
                IDLValue::Null | IDLValue::None => Some(None),
                val => idl_to_string(val).map(Some)
            }
        },
        IDLValue::Null | IDLValue::None => Some(None),
        _ => None
    }
}

#[ic_cdk::update]
pub async fn get_permission(
    token_id: Principal,
    resource: Resource,
) -> Result<GetPermissionResponse, String> {
    let station_id = get_station_for_token(token_id).await?;

    let input = GetPermissionInput { resource: resource.clone() };

    let args = encode_args((input,))
        .map_err(|e| format!("Failed to encode arguments: {:?}", e))?;

    let result = call_raw(
        station_id,
        "get_permission",
        &args,
        0
    ).await
    .map_err(|e| format!("Failed to call get_permission: {:?}", e))?;

    let decoded: (IDLValue,) = decode_args(&result)
        .map_err(|e| format!("Failed to decode response: {:?}", e))?;

    parse_get_permission_response(&decoded.0)
}

fn parse_get_permission_response(value: &IDLValue) -> Result<GetPermissionResponse, String> {
    if let IDLValue::Variant(variant) = value {
        if let Some(label) = label_name(&variant.0.id) {
            if label == "Ok" {
                if let IDLValue::Record(fields) = &variant.0.val {
                    let permission = field(fields, "permission")
                        .and_then(parse_permission)
                        .ok_or("Failed to parse permission")?;

                    let privileges = field(fields, "privileges")
                        .and_then(parse_permission_privilege)
                        .ok_or("Failed to parse privileges")?;

                    return Ok(GetPermissionResponse {
                        permission,
                        privileges,
                    });
                }
            } else if label == "Err" {
                return Err(parse_error_message(&variant.0.val));
            }
        }
    }

    Err("Invalid response format".to_string())
}

#[ic_cdk::update]
pub async fn list_user_groups(
    token_id: Principal,
    paginate: Option<PaginationInput>,
) -> Result<ListUserGroupsResponse, String> {
    let station_id = get_station_for_token(token_id).await?;

    let input = ListUserGroupsInput { paginate };

    let args = encode_args((input,))
        .map_err(|e| format!("Failed to encode arguments: {:?}", e))?;

    let result = call_raw(
        station_id,
        "list_user_groups",
        &args,
        0
    ).await
    .map_err(|e| format!("Failed to call list_user_groups: {:?}", e))?;

    let decoded: (IDLValue,) = decode_args(&result)
        .map_err(|e| format!("Failed to decode response: {:?}", e))?;

    parse_list_user_groups_response(&decoded.0)
}

fn parse_list_user_groups_response(value: &IDLValue) -> Result<ListUserGroupsResponse, String> {
    if let IDLValue::Variant(variant) = value {
        if let Some(label) = label_name(&variant.0.id) {
            if label == "Ok" {
                if let IDLValue::Record(fields) = &variant.0.val {
                    let user_groups = field(fields, "user_groups")
                        .and_then(parse_user_groups_vec)
                        .unwrap_or_default();

                    let total = field(fields, "total")
                        .and_then(idl_to_nat64)
                        .unwrap_or(0);

                    let privileges = field(fields, "privileges")
                        .and_then(parse_user_group_privileges_vec)
                        .unwrap_or_default();

                    return Ok(ListUserGroupsResponse {
                        user_groups,
                        total,
                        privileges,
                    });
                }
            } else if label == "Err" {
                return Err(parse_error_message(&variant.0.val));
            }
        }
    }

    Err("Invalid response format".to_string())
}

fn parse_user_group_privileges_vec(value: &IDLValue) -> Option<Vec<UserGroupCallerPrivileges>> {
    if let IDLValue::Vec(items) = value {
        return Some(items.iter().filter_map(parse_user_group_privilege).collect());
    }
    None
}

fn parse_user_group_privilege(value: &IDLValue) -> Option<UserGroupCallerPrivileges> {
    if let IDLValue::Record(fields) = value {
        let id = field(fields, "id").and_then(idl_to_string)?;
        let can_edit = field(fields, "can_edit")
            .and_then(idl_to_bool)
            .unwrap_or(false);
        let can_delete = field(fields, "can_delete")
            .and_then(idl_to_bool)
            .unwrap_or(false);

        return Some(UserGroupCallerPrivileges { id, can_edit, can_delete });
    }
    None
}

#[ic_cdk::update]
pub async fn request_permission_change(
    token_id: Principal,
    resource: Resource,
    auth_scope: Option<AuthScope>,
    users: Option<Vec<String>>, // User UUIDs
    user_groups: Option<Vec<String>>, // Group UUIDs
) -> Result<String, String> {
    let station_id = get_station_for_token(token_id).await?;

    // Create request with proper optional wrapping
    let request = CreateRequestInput {
        operation: RequestOperationInput::EditPermission(EditPermissionOperationInput {
            resource: resource.clone(),
            auth_scope,    // Already Option<T>
            users,         // Already Option<Vec<T>>
            user_groups,   // Already Option<Vec<T>>
        }),
        execution_plan: Some(RequestExecutionSchedule::Immediate),
        title: Some(format!("Update permission")),
        summary: Some(format!("Change permission settings")),
        expiration_dt: None,
    };

    let args = encode_args((request,))
        .map_err(|e| format!("Failed to encode arguments: {:?}", e))?;

    let result = call_raw(
        station_id,
        "create_request",
        &args,
        0
    ).await
    .map_err(|e| format!("Failed to call create_request: {:?}", e))?;

    let decoded: (IDLValue,) = decode_args(&result)
        .map_err(|e| format!("Failed to decode response: {:?}", e))?;

    parse_create_request_response(&decoded.0)
}

fn parse_create_request_response(value: &IDLValue) -> Result<String, String> {
    // Handle the double-wrapped Result
    if let IDLValue::Variant(outer_variant) = value {
        if let Some(outer_label) = label_name(&outer_variant.0.id) {
            if outer_label == "Ok" {
                // Inner variant
                if let IDLValue::Variant(inner_variant) = &outer_variant.0.val {
                    if let Some(inner_label) = label_name(&inner_variant.0.id) {
                        if inner_label == "Ok" {
                            // Parse CreateRequestResponse
                            if let IDLValue::Record(fields) = &inner_variant.0.val {
                                // Get the request field
                                if let Some(request_val) = field(fields, "request") {
                                    if let IDLValue::Record(request_fields) = request_val {
                                        if let Some(id) = field(request_fields, "id").and_then(idl_to_string) {
                                            return Ok(id);
                                        }
                                    }
                                }
                            }
                        } else if inner_label == "Err" {
                            return Err(parse_error_message(&inner_variant.0.val));
                        }
                    }
                }
            } else if outer_label == "Err" {
                return Err(parse_error_message(&outer_variant.0.val));
            }
        }
    }

    Err("Failed to parse create request response".to_string())
}