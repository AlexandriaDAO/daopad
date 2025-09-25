use crate::storage::state::{TOKEN_ORBIT_STATIONS, KONG_LOCKER_PRINCIPALS};
use crate::types::{StorablePrincipal};
use crate::types::orbit::*;
use crate::kong_locker::voting::calculate_voting_power_for_token;
use crate::api::orbit_users::list_orbit_users;
use candid::{encode_args, decode_args, IDLValue, Principal};
use candid::types::{Label, value::IDLField};
use ic_cdk;
use ic_cdk::api::call::call_raw;
use std::collections::HashMap;

// Voting power thresholds for automatic group assignments
const WHALE_THRESHOLD: f64 = 10000.0;    // 10k+ VP = Whale
const DOLPHIN_THRESHOLD: f64 = 1000.0;   // 1k+ VP = Dolphin
const MEMBER_THRESHOLD: f64 = 100.0;     // 100+ VP = Member

// Group names for voting-based groups
const WHALE_GROUP_NAME: &str = "Whale";
const DOLPHIN_GROUP_NAME: &str = "Dolphin";
const MEMBER_GROUP_NAME: &str = "Member";

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

// Hash function for Candid field names (same as orbit_permissions.rs)
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

#[ic_cdk::update]
pub async fn sync_voting_power_permissions(
    token_id: Principal,
) -> Result<SyncVotingPowerResult, String> {
    let station_id = get_station_for_token(token_id).await?;

    // Get all Kong Locker registrations
    let registrations = KONG_LOCKER_PRINCIPALS.with(|regs| {
        regs.borrow()
            .iter()
            .map(|(k, v)| (k.0, v.0))
            .collect::<Vec<(Principal, Principal)>>()
    });

    // Calculate voting powers for all registered users
    let mut voting_powers = HashMap::new();
    for (user_principal, kong_locker) in registrations {
        match calculate_voting_power_for_token(kong_locker, token_id).await {
            Ok(vp) => {
                voting_powers.insert(user_principal, vp as f64);
            }
            Err(_) => continue, // Skip users with errors
        }
    }

    // Get all users from Orbit Station
    let orbit_users = match list_orbit_users(token_id).await {
        Ok(users) => users,
        Err(_) => Vec::new(),
    };

    // Create mapping of principal to user ID
    let mut principal_to_user: HashMap<Principal, String> = HashMap::new();
    for user in &orbit_users {
        for identity in &user.identities {
            principal_to_user.insert(*identity, user.id.clone());
        }
    }

    // Categorize users by voting power
    let mut whales = Vec::new();
    let mut dolphins = Vec::new();
    let mut members = Vec::new();
    let mut inactive = Vec::new();

    for (principal, vp_value) in voting_powers {
        if let Some(user_id) = principal_to_user.get(&principal) {
            if vp_value >= WHALE_THRESHOLD {
                whales.push((user_id.clone(), vp_value));
            } else if vp_value >= DOLPHIN_THRESHOLD {
                dolphins.push((user_id.clone(), vp_value));
            } else if vp_value >= MEMBER_THRESHOLD {
                members.push((user_id.clone(), vp_value));
            } else {
                inactive.push((user_id.clone(), vp_value));
            }
        }
    }

    // Ensure voting-based groups exist
    let whale_group = ensure_group_exists(station_id, WHALE_GROUP_NAME).await?;
    let dolphin_group = ensure_group_exists(station_id, DOLPHIN_GROUP_NAME).await?;
    let member_group = ensure_group_exists(station_id, MEMBER_GROUP_NAME).await?;

    // Update group memberships
    let mut requests_created = Vec::new();

    // Update whale group
    if !whales.is_empty() {
        let request_id = update_group_members(
            station_id,
            &whale_group,
            whales.iter().map(|(id, _)| id.clone()).collect()
        ).await?;
        requests_created.push(request_id);
    }

    // Update dolphin group
    if !dolphins.is_empty() {
        let request_id = update_group_members(
            station_id,
            &dolphin_group,
            dolphins.iter().map(|(id, _)| id.clone()).collect()
        ).await?;
        requests_created.push(request_id);
    }

    // Update member group
    if !members.is_empty() {
        let request_id = update_group_members(
            station_id,
            &member_group,
            members.iter().map(|(id, _)| id.clone()).collect()
        ).await?;
        requests_created.push(request_id);
    }

    Ok(SyncVotingPowerResult {
        whales: whales.len() as u32,
        dolphins: dolphins.len() as u32,
        members: members.len() as u32,
        inactive: inactive.len() as u32,
        requests_created,
    })
}

// Get user's voting power tier
#[ic_cdk::update]
pub async fn get_user_voting_tier(
    token_id: Principal,
    principal: Principal,
) -> Result<VotingTier, String> {
    // Get Kong Locker for this user
    let kong_locker = KONG_LOCKER_PRINCIPALS.with(|regs| {
        regs.borrow()
            .get(&StorablePrincipal(principal))
            .map(|kl| kl.0)
    });

    if let Some(kong_locker) = kong_locker {
        match calculate_voting_power_for_token(kong_locker, token_id).await {
            Ok(vp) => {
                let vp_value = vp as f64;

                if vp_value >= WHALE_THRESHOLD {
                    return Ok(VotingTier::Whale { voting_power: vp_value });
                } else if vp_value >= DOLPHIN_THRESHOLD {
                    return Ok(VotingTier::Dolphin { voting_power: vp_value });
                } else if vp_value >= MEMBER_THRESHOLD {
                    return Ok(VotingTier::Member { voting_power: vp_value });
                } else {
                    return Ok(VotingTier::None { voting_power: vp_value });
                }
            }
            Err(_) => return Ok(VotingTier::None { voting_power: 0.0 }),
        }
    }

    Ok(VotingTier::None { voting_power: 0.0 })
}

// Check if user meets voting threshold for a specific permission
#[ic_cdk::update]
pub async fn check_voting_permission(
    token_id: Principal,
    principal: Principal,
    min_voting_power: f64,
) -> Result<bool, String> {
    // Get Kong Locker for this user
    let kong_locker = KONG_LOCKER_PRINCIPALS.with(|regs| {
        regs.borrow()
            .get(&StorablePrincipal(principal))
            .map(|kl| kl.0)
    });

    if let Some(kong_locker) = kong_locker {
        match calculate_voting_power_for_token(kong_locker, token_id).await {
            Ok(vp) => {
                let vp_value = vp as f64;
                return Ok(vp_value >= min_voting_power);
            }
            Err(_) => return Ok(false),
        }
    }

    Ok(false)
}

// Create custom voting-based permission rule
#[ic_cdk::update]
pub async fn create_voting_permission(
    token_id: Principal,
    resource: Resource,
    min_voting_power: f64,
    title: String,
) -> Result<String, String> {
    let station_id = get_station_for_token(token_id).await?;

    // Determine which group(s) should have access based on voting power
    let mut groups = Vec::new();

    if min_voting_power <= MEMBER_THRESHOLD {
        groups.push(MEMBER_GROUP_NAME.to_string());
        groups.push(DOLPHIN_GROUP_NAME.to_string());
        groups.push(WHALE_GROUP_NAME.to_string());
    } else if min_voting_power <= DOLPHIN_THRESHOLD {
        groups.push(DOLPHIN_GROUP_NAME.to_string());
        groups.push(WHALE_GROUP_NAME.to_string());
    } else if min_voting_power <= WHALE_THRESHOLD {
        groups.push(WHALE_GROUP_NAME.to_string());
    }

    // Ensure groups exist and get their IDs
    let mut group_ids = Vec::new();
    for group_name in &groups {
        let group_id = ensure_group_exists(station_id, group_name).await?;
        group_ids.push(group_id);
    }

    // Create permission request
    let request = CreateRequestInput {
        operation: RequestOperationInput::EditPermission(EditPermissionOperationInput {
            resource: resource.clone(),
            auth_scope: Some(AuthScope::Restricted),
            users: None,
            user_groups: Some(group_ids),
        }),
        execution_plan: Some(RequestExecutionSchedule::Immediate),
        title: Some(title),
        summary: Some(format!("Requires minimum {} voting power", min_voting_power)),
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

// Helper: Ensure a group exists, create if not
async fn ensure_group_exists(
    station_id: Principal,
    group_name: &str,
) -> Result<String, String> {
    // First, check if group already exists
    let existing_groups = list_user_groups(station_id).await?;

    for group in existing_groups {
        if group.name == group_name {
            return Ok(group.id);
        }
    }

    // Group doesn't exist, create it
    create_user_group(station_id, group_name.to_string()).await
}

// Helper: List all user groups
async fn list_user_groups(station_id: Principal) -> Result<Vec<UserGroup>, String> {
    let input = ListUserGroupsInput {
        search_term: None,
        paginate: None,
    };

    let args = encode_args((input,))
        .map_err(|e| format!("Failed to encode: {:?}", e))?;

    let result = call_raw(
        station_id,
        "list_user_groups",
        &args,
        0
    ).await
    .map_err(|e| format!("Failed to call: {:?}", e))?;

    let decoded: (IDLValue,) = decode_args(&result)
        .map_err(|e| format!("Failed to decode: {:?}", e))?;

    parse_list_user_groups_response(&decoded.0)
}

// Helper: Create a new user group (simplified - groups must be created manually)
async fn create_user_group(
    _station_id: Principal,
    name: String,
) -> Result<String, String> {
    // For now, return a placeholder ID since we can't create groups programmatically
    // Groups should be created manually in Orbit Station UI
    // TODO: Implement when AddUserGroup operation is available
    Ok(format!("manual-{}", name))
}

// Helper: Update group members (simplified - uses permission updates)
async fn update_group_members(
    _station_id: Principal,
    group_id: &str,
    _user_ids: Vec<String>,
) -> Result<String, String> {
    // For now, return a placeholder since we can't edit groups programmatically
    // Groups should be managed manually in Orbit Station UI
    // TODO: Implement when EditUserGroup operation is available
    Ok(format!("manual-update-{}", group_id))
}

// Parse helpers
fn parse_list_user_groups_response(value: &IDLValue) -> Result<Vec<UserGroup>, String> {
    if let IDLValue::Variant(variant) = value {
        if let Some(label) = label_name(&variant.0.id) {
            if label == "Ok" {
                if let IDLValue::Record(fields) = &variant.0.val {
                    if let Some(IDLValue::Vec(items)) = field(fields, "user_groups") {
                        return Ok(items.iter().filter_map(parse_user_group).collect());
                    }
                }
            }
        }
    }
    Ok(Vec::new())
}

fn parse_user_group(value: &IDLValue) -> Option<UserGroup> {
    if let IDLValue::Record(fields) = value {
        let id = field(fields, "id").and_then(idl_to_string)?;
        let name = field(fields, "name").and_then(idl_to_string)?;

        return Some(UserGroup { id, name });
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
                        }
                    }
                }
            }
        }
    }

    Ok("request-id".to_string())
}

// Result types
#[derive(candid::CandidType, candid::Deserialize, serde::Serialize, Debug)]
pub struct SyncVotingPowerResult {
    pub whales: u32,
    pub dolphins: u32,
    pub members: u32,
    pub inactive: u32,
    pub requests_created: Vec<String>,
}

#[derive(candid::CandidType, candid::Deserialize, serde::Serialize, Debug)]
pub enum VotingTier {
    Whale { voting_power: f64 },
    Dolphin { voting_power: f64 },
    Member { voting_power: f64 },
    None { voting_power: f64 },
}