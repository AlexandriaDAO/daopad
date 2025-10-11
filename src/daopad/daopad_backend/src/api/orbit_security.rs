use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::time;
use serde::Serialize;

use crate::types::orbit::{
    ListUsersInput, ListUsersResult, UserDTO,
    ListPermissionsInput, ListPermissionsResult, Resource, Permission,
    ListRequestPoliciesResult, RequestPolicyRule,
    ResourceAction, ExternalCanisterAction, SystemAction, UserAction,
    PermissionAction,
    SystemInfoResult,
    PaginationInput,
};

const ADMIN_GROUP_ID: &str = "00000000-0000-4000-8000-000000000000";
const OPERATOR_GROUP_ID: &str = "00000000-0000-4000-8000-000000000001";

// ===== RESPONSE TYPES =====

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum CheckStatus {
    Pass,
    Warn,
    Fail,
    Error,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum Severity {
    None,
    Low,
    Medium,
    High,
    Critical,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct SecurityCheck {
    pub category: String,
    pub name: String,
    pub status: CheckStatus,
    pub message: String,
    pub severity: Option<Severity>,
    pub details: Option<String>,
    pub recommendation: Option<String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct EnhancedSecurityDashboard {
    pub station_id: Principal,
    pub overall_status: String,
    pub decentralization_score: u8, // 0-100
    pub last_checked: u64,
    pub checks: Vec<SecurityCheck>,
    pub risk_summary: String,
    pub critical_issues: Vec<SecurityCheck>,
    pub recommended_actions: Vec<String>,
}

// Helper struct for risk analysis
struct RiskWeights {
    critical_admin_control: f64,
    critical_treasury: f64,
    critical_governance: f64,
    high_proposal_bypass: f64,
    medium_external_canisters: f64,
    medium_system_config: f64,
    low_operational: f64,
}

impl Default for RiskWeights {
    fn default() -> Self {
        RiskWeights {
            critical_admin_control: 30.0,
            critical_treasury: 25.0,
            critical_governance: 20.0,
            high_proposal_bypass: 15.0,
            medium_external_canisters: 5.0,
            medium_system_config: 3.0,
            low_operational: 2.0,
        }
    }
}

// ===== CATEGORY-BASED ENDPOINTS (8 separate lightweight endpoints) =====

/// Check admin control layer: admin count, backend admin status, operator group size
#[ic_cdk::update]
pub async fn check_admin_control(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let backend_principal = ic_cdk::id();

    let users_data = fetch_users(station_id).await.map_err(|e| {
        format!("Failed to fetch users: {}", e)
    })?;

    Ok(check_admin_control_layer(&users_data, backend_principal))
}

/// Check treasury control: account transfers, asset management, treasury permissions
#[ic_cdk::update]
pub async fn check_treasury_control(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = fetch_permissions(station_id).await.map_err(|e| {
        format!("Failed to fetch permissions: {}", e)
    })?;

    Ok(check_treasury_control_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check governance permissions: who can change permissions, policies, users, groups
#[ic_cdk::update]
pub async fn check_governance_permissions(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = fetch_permissions(station_id).await.map_err(|e| {
        format!("Failed to fetch permissions: {}", e)
    })?;

    Ok(check_governance_permissions_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check proposal policies: auto-approvals, bypasses, quorum settings
#[ic_cdk::update]
pub async fn check_proposal_policies(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let policies_data = fetch_policies(station_id).await.map_err(|e| {
        format!("Failed to fetch policies: {}", e)
    })?;

    Ok(check_proposal_policies_impl(&policies_data))
}

/// Check external canister control: create, change, fund permissions
#[ic_cdk::update]
pub async fn check_external_canisters(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = fetch_permissions(station_id).await.map_err(|e| {
        format!("Failed to fetch permissions: {}", e)
    })?;

    Ok(check_external_canister_control_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check asset management: asset create/update/delete permissions
#[ic_cdk::update]
pub async fn check_asset_management(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = fetch_permissions(station_id).await.map_err(|e| {
        format!("Failed to fetch permissions: {}", e)
    })?;

    Ok(check_asset_management_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check system configuration: upgrade access, disaster recovery, system info management
#[ic_cdk::update]
pub async fn check_system_configuration(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let system_data = fetch_system_info(station_id).await.map_err(|e| {
        format!("Failed to fetch system info: {}", e)
    })?;

    let perms_data = fetch_permissions(station_id).await.map_err(|e| {
        format!("Failed to fetch permissions: {}", e)
    })?;

    Ok(check_system_configuration_impl(&system_data, &perms_data.permissions, &perms_data.user_groups))
}

/// Check operational permissions: request visibility, notifications, etc.
#[ic_cdk::update]
pub async fn check_operational_permissions(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = fetch_permissions(station_id).await.map_err(|e| {
        format!("Failed to fetch permissions: {}", e)
    })?;

    Ok(check_operational_permissions_impl(&perms_data.permissions))
}

// ===== DATA FETCHING =====

struct PermissionsData {
    permissions: Vec<Permission>,
    user_groups: Vec<crate::types::orbit::UserGroup>,
}

async fn fetch_users(station_id: Principal) -> Result<Vec<UserDTO>, String> {
    let input = ListUsersInput {
        search_term: None,
        statuses: None,
        groups: None,
        paginate: None,
    };

    let result: (ListUsersResult,) = ic_cdk::call(station_id, "list_users", (input,))
        .await
        .map_err(|e| format!("Failed to list users: {:?}", e))?;

    match result.0 {
        ListUsersResult::Ok { users, .. } => Ok(users),
        ListUsersResult::Err(e) => Err(format!("Orbit returned error: {}", e)),
    }
}

async fn fetch_permissions(station_id: Principal) -> Result<PermissionsData, String> {
    let input = ListPermissionsInput {
        resources: None,
        paginate: None,
    };

    let result: (ListPermissionsResult,) = ic_cdk::call(station_id, "list_permissions", (input,))
        .await
        .map_err(|e| format!("Failed to list permissions: {:?}", e))?;

    match result.0 {
        ListPermissionsResult::Ok { permissions, user_groups, .. } => {
            Ok(PermissionsData { permissions, user_groups })
        }
        ListPermissionsResult::Err(e) => Err(format!("Orbit returned error: {}", e)),
    }
}

async fn fetch_policies(station_id: Principal) -> Result<Vec<crate::types::orbit::RequestPolicy>, String> {
    let input: PaginationInput = PaginationInput {
        limit: None,
        offset: None,
    };

    let result: (ListRequestPoliciesResult,) = ic_cdk::call(station_id, "list_request_policies", (input,))
        .await
        .map_err(|e| format!("Failed to list policies: {:?}", e))?;

    match result.0 {
        ListRequestPoliciesResult::Ok { policies, .. } => Ok(policies),
        ListRequestPoliciesResult::Err(e) => Err(format!("Orbit returned error: {}", e)),
    }
}

async fn fetch_system_info(station_id: Principal) -> Result<crate::types::orbit::SystemInfo, String> {
    let result: (SystemInfoResult,) = ic_cdk::call(station_id, "system_info", ())
        .await
        .map_err(|e| format!("Failed to get system info: {:?}", e))?;

    match result.0 {
        SystemInfoResult::Ok { system } => Ok(system),
        SystemInfoResult::Err(e) => Err(format!("Orbit returned error: {}", e)),
    }
}

// ===== CHECK CATEGORY 1: ADMIN CONTROL LAYER =====

fn check_admin_control_layer(users: &Vec<UserDTO>, backend_principal: Principal) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Get admin users
    let admin_users: Vec<&UserDTO> = users.iter()
        .filter(|u| u.groups.iter().any(|g| g.id == ADMIN_GROUP_ID))
        .collect();

    // Check 1: No admins at all
    if admin_users.is_empty() {
        checks.push(SecurityCheck {
            category: "Admin Control".to_string(),
            name: "Admin Users Present".to_string(),
            status: CheckStatus::Fail,
            message: "No admin user found in station".to_string(),
            severity: Some(Severity::Critical),
            details: None,
            recommendation: Some("Add DAOPad backend as admin user".to_string()),
        });
        return checks;
    }

    // Check 2: Backend is admin?
    let backend_is_admin = admin_users.iter()
        .any(|u| u.identities.contains(&backend_principal));

    if !backend_is_admin {
        checks.push(SecurityCheck {
            category: "Admin Control".to_string(),
            name: "Backend Admin Status".to_string(),
            status: CheckStatus::Fail,
            message: "DAOPad backend is not an admin".to_string(),
            severity: Some(Severity::Critical),
            details: Some(format!("Backend principal: {}", backend_principal)),
            recommendation: Some("Add DAOPad backend principal to Admin group in Orbit Station".to_string()),
        });
    } else {
        checks.push(SecurityCheck {
            category: "Admin Control".to_string(),
            name: "Backend Admin Status".to_string(),
            status: CheckStatus::Pass,
            message: "DAOPad backend has admin access".to_string(),
            severity: Some(Severity::None),
            details: None,
            recommendation: None,
        });
    }

    // Check 3: Multiple admins
    if admin_users.len() > 1 {
        let admin_names: Vec<String> = admin_users.iter().map(|u| u.name.clone()).collect();
        checks.push(SecurityCheck {
            category: "Admin Control".to_string(),
            name: "Admin User Count".to_string(),
            status: CheckStatus::Fail,
            message: format!("{} admin users found - allows individual bypass of community governance", admin_users.len()),
            severity: Some(Severity::Critical),
            details: Some(format!("Admin users: {}", admin_names.join(", "))),
            recommendation: Some("Remove non-backend admin users to ensure only community governance".to_string()),
        });
    } else {
        checks.push(SecurityCheck {
            category: "Admin Control".to_string(),
            name: "Admin User Count".to_string(),
            status: CheckStatus::Pass,
            message: "Single admin user (backend only)".to_string(),
            severity: Some(Severity::None),
            details: None,
            recommendation: None,
        });
    }

    // Check 4: Operator group size
    let operator_users: Vec<&UserDTO> = users.iter()
        .filter(|u| u.groups.iter().any(|g| g.id == OPERATOR_GROUP_ID))
        .collect();

    if operator_users.len() > 3 {
        checks.push(SecurityCheck {
            category: "Admin Control".to_string(),
            name: "Operator Group Size".to_string(),
            status: CheckStatus::Warn,
            message: format!("{} users in Operator group", operator_users.len()),
            severity: Some(Severity::Low),
            details: Some(format!("Operator users: {}", operator_users.iter().map(|u| u.name.as_str()).collect::<Vec<_>>().join(", "))),
            recommendation: Some("Consider if all operator users need elevated privileges".to_string()),
        });
    } else {
        checks.push(SecurityCheck {
            category: "Admin Control".to_string(),
            name: "Operator Group Size".to_string(),
            status: CheckStatus::Pass,
            message: format!("{} users in Operator group", operator_users.len()),
            severity: Some(Severity::None),
            details: None,
            recommendation: None,
        });
    }

    checks
}

// ===== CHECK CATEGORY 2: TREASURY CONTROL =====

fn check_treasury_control_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<crate::types::orbit::UserGroup>
) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Check Account.Transfer permissions
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Treasury Control",
        "Account Transfer Permissions",
        |resource| matches!(resource, Resource::Account(ResourceAction::Transfer(_))),
        Severity::Critical,
        "Non-admin groups can transfer treasury funds without community approval",
        "Remove Account.Transfer permission from non-admin groups",
    ));

    // Check Account.Create permissions
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Treasury Control",
        "Account Creation Permissions",
        |resource| matches!(resource, Resource::Account(ResourceAction::Create)),
        Severity::High,
        "Non-admin groups can create new treasury accounts",
        "Restrict Account.Create to Admin group only",
    ));

    // Check Account.Update permissions
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Treasury Control",
        "Account Modification Permissions",
        |resource| matches!(resource, Resource::Account(ResourceAction::Update(_))),
        Severity::High,
        "Non-admin groups can modify treasury account settings",
        "Restrict Account.Update to Admin group only",
    ));

    // Check Asset.Transfer permissions
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Treasury Control",
        "Asset Transfer Permissions",
        |resource| matches!(resource, Resource::Asset(ResourceAction::Transfer(_))),
        Severity::Critical,
        "Non-admin groups can transfer assets without community approval",
        "Remove Asset.Transfer permission from non-admin groups",
    ));

    checks
}

// ===== CHECK CATEGORY 3: GOVERNANCE PERMISSIONS =====

fn check_governance_permissions_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<crate::types::orbit::UserGroup>
) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Check Permission.Update - CRITICAL
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Governance Control",
        "Permission Management Access",
        |resource| matches!(resource, Resource::Permission(PermissionAction::Update)),
        Severity::Critical,
        "Non-admin groups can change permission rules",
        "Restrict Permission.Update to Admin group only",
    ));

    // Check RequestPolicy.Update - CRITICAL
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Governance Control",
        "Policy Management Access",
        |resource| matches!(resource, Resource::RequestPolicy(ResourceAction::Update(_))),
        Severity::Critical,
        "Non-admin groups can change voting rules",
        "Restrict RequestPolicy.Update to Admin group only",
    ));

    // Check User.Create
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Governance Control",
        "User Creation Access",
        |resource| matches!(resource, Resource::User(UserAction::Create)),
        Severity::High,
        "Non-admin groups can add new users/governors",
        "Restrict User.Create to Admin group only",
    ));

    // Check User.Update
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Governance Control",
        "User Modification Access",
        |resource| matches!(resource, Resource::User(UserAction::Update(_))),
        Severity::High,
        "Non-admin groups can modify user rights",
        "Restrict User.Update to Admin group only",
    ));

    // Check UserGroup.Create
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Governance Control",
        "User Group Creation Access",
        |resource| matches!(resource, Resource::UserGroup(ResourceAction::Create)),
        Severity::High,
        "Non-admin groups can create voting groups",
        "Restrict UserGroup.Create to Admin group only",
    ));

    // Check UserGroup.Update
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Governance Control",
        "User Group Modification Access",
        |resource| matches!(resource, Resource::UserGroup(ResourceAction::Update(_))),
        Severity::High,
        "Non-admin groups can modify group memberships",
        "Restrict UserGroup.Update to Admin group only",
    ));

    checks
}

// ===== CHECK CATEGORY 4: PROPOSAL POLICIES =====

fn check_proposal_policies_impl(policies: &Vec<crate::types::orbit::RequestPolicy>) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();
    let mut auto_approved_count = 0;
    let mut bypass_count = 0;
    let mut bypass_details = Vec::new();

    for policy in policies {
        let analysis = analyze_policy_rule(&policy.rule);

        if analysis.is_auto_approved {
            auto_approved_count += 1;
        }

        if analysis.has_bypass {
            bypass_count += 1;
            if let Some(reason) = &analysis.bypass_reason {
                bypass_details.push(format!("{:?}: {}", policy.specifier, reason));
            }
        }
    }

    // Check for bypasses (critical)
    if bypass_count > 0 {
        checks.push(SecurityCheck {
            category: "Request Policies".to_string(),
            name: "Policy Bypass Detection".to_string(),
            status: CheckStatus::Fail,
            message: format!("{} policies allow bypassing admin approval", bypass_count),
            severity: Some(Severity::Critical),
            details: Some(bypass_details.join("; ")),
            recommendation: Some("Update policies to require Admin group approval only".to_string()),
        });
    } else {
        checks.push(SecurityCheck {
            category: "Request Policies".to_string(),
            name: "Policy Bypass Detection".to_string(),
            status: CheckStatus::Pass,
            message: "No policy bypasses detected".to_string(),
            severity: Some(Severity::None),
            details: None,
            recommendation: None,
        });
    }

    // Check for auto-approvals (warning for dev)
    if auto_approved_count > 0 {
        checks.push(SecurityCheck {
            category: "Request Policies".to_string(),
            name: "Auto-Approval Policies".to_string(),
            status: CheckStatus::Warn,
            message: format!("{} policies are auto-approved (development mode)", auto_approved_count),
            severity: Some(Severity::Low),
            details: Some(format!("Auto-approved policies skip all voting - OK for testing, but should be changed for production")),
            recommendation: Some("Before going live, change auto-approved policies to require Admin approval".to_string()),
        });
    } else {
        checks.push(SecurityCheck {
            category: "Request Policies".to_string(),
            name: "Auto-Approval Policies".to_string(),
            status: CheckStatus::Pass,
            message: "No auto-approved policies (production-ready)".to_string(),
            severity: Some(Severity::None),
            details: None,
            recommendation: None,
        });
    }

    checks
}

// ===== CHECK CATEGORY 5: EXTERNAL CANISTER CONTROL =====

fn check_external_canister_control_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<crate::types::orbit::UserGroup>
) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Check ExternalCanister.Create
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "External Canister Control",
        "Canister Creation Access",
        |resource| matches!(resource, Resource::ExternalCanister(ExternalCanisterAction::Create)),
        Severity::Medium,
        "Non-admin groups can create external canisters",
        "Consider restricting ExternalCanister.Create to Admin group",
    ));

    // Check ExternalCanister.Change
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "External Canister Control",
        "Canister Modification Access",
        |resource| matches!(resource, Resource::ExternalCanister(ExternalCanisterAction::Change(_))),
        Severity::High,
        "Non-admin groups can modify external canisters",
        "Restrict ExternalCanister.Change to Admin group only",
    ));

    // Check ExternalCanister.Fund
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "External Canister Control",
        "Canister Funding Access",
        |resource| matches!(resource, Resource::ExternalCanister(ExternalCanisterAction::Fund(_))),
        Severity::Medium,
        "Non-admin groups can fund external canisters",
        "Consider restricting ExternalCanister.Fund to Admin group",
    ));

    checks
}

// ===== CHECK CATEGORY 6: ASSET MANAGEMENT =====

fn check_asset_management_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<crate::types::orbit::UserGroup>
) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Check Asset.Create
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Asset Management",
        "Asset Creation Access",
        |resource| matches!(resource, Resource::Asset(ResourceAction::Create)),
        Severity::Medium,
        "Non-admin groups can create new assets",
        "Consider restricting Asset.Create to Admin group",
    ));

    // Check Asset.Update
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Asset Management",
        "Asset Modification Access",
        |resource| matches!(resource, Resource::Asset(ResourceAction::Update(_))),
        Severity::Medium,
        "Non-admin groups can modify asset settings",
        "Consider restricting Asset.Update to Admin group",
    ));

    // Check Asset.Delete
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Asset Management",
        "Asset Deletion Access",
        |resource| matches!(resource, Resource::Asset(ResourceAction::Delete(_))),
        Severity::High,
        "Non-admin groups can delete assets",
        "Restrict Asset.Delete to Admin group only",
    ));

    checks
}

// ===== CHECK CATEGORY 7: SYSTEM CONFIGURATION =====

fn check_system_configuration_impl(
    system: &crate::types::orbit::SystemInfo,
    permissions: &Vec<Permission>,
    user_groups: &Vec<crate::types::orbit::UserGroup>
) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Check System.Upgrade permission
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "System Configuration",
        "System Upgrade Access",
        |resource| matches!(resource, Resource::System(SystemAction::Upgrade)),
        Severity::Critical,
        "Non-admin groups can upgrade the Station",
        "Restrict System.Upgrade to Admin group only",
    ));

    // Check System.ManageSystemInfo permission
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "System Configuration",
        "System Info Management Access",
        |resource| matches!(resource, Resource::System(SystemAction::ManageSystemInfo)),
        Severity::Medium,
        "Non-admin groups can modify system information",
        "Consider restricting System.ManageSystemInfo to Admin group",
    ));

    // Check disaster recovery settings
    if let Some(dr) = &system.disaster_recovery {
        if dr.committee.user_group_id != ADMIN_GROUP_ID || dr.committee.quorum != 1 {
            checks.push(SecurityCheck {
                category: "System Configuration".to_string(),
                name: "Disaster Recovery Settings".to_string(),
                status: CheckStatus::Warn,
                message: "Disaster recovery not set to Admin group".to_string(),
                severity: Some(Severity::Low),
                details: Some(format!(
                    "Group: {}, Quorum: {}",
                    dr.user_group_name.as_ref().unwrap_or(&dr.committee.user_group_id),
                    dr.committee.quorum
                )),
                recommendation: Some("Set disaster recovery committee to Admin group with quorum 1".to_string()),
            });
        } else {
            checks.push(SecurityCheck {
                category: "System Configuration".to_string(),
                name: "Disaster Recovery Settings".to_string(),
                status: CheckStatus::Pass,
                message: "Disaster recovery properly configured".to_string(),
                severity: Some(Severity::None),
                details: None,
                recommendation: None,
            });
        }
    }

    checks
}

// ===== CHECK CATEGORY 8: OPERATIONAL PERMISSIONS =====

fn check_operational_permissions_impl(permissions: &Vec<Permission>) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Check Request.Read permissions (visibility)
    let request_read_perms: Vec<&Permission> = permissions.iter()
        .filter(|p| matches!(p.resource, Resource::Request(_)))
        .collect();

    checks.push(SecurityCheck {
        category: "Operational Access".to_string(),
        name: "Request Visibility".to_string(),
        status: CheckStatus::Pass,
        message: if request_read_perms.is_empty() {
            "Request access properly configured".to_string()
        } else {
            format!("{} request visibility permissions configured", request_read_perms.len())
        },
        severity: Some(Severity::None),
        details: None,
        recommendation: None,
    });

    checks
}

// ===== AGGREGATOR METHOD: ALL SECURITY CHECKS =====

/// Perform all security checks in one call
///
/// This is a convenience method that calls all 8 individual security check methods
/// and combines their results into a single response. This is useful for:
/// - Getting a complete security overview in one call
/// - Frontend components that need all checks at once
/// - Simplifying frontend code by providing a single endpoint
#[ic_cdk::update]
pub async fn perform_all_security_checks(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    // Call all 8 individual checks sequentially
    // Note: These are already async and make inter-canister calls
    let admin_result = check_admin_control(station_id).await;
    let treasury_result = check_treasury_control(station_id).await;
    let governance_result = check_governance_permissions(station_id).await;
    let policies_result = check_proposal_policies(station_id).await;
    let canisters_result = check_external_canisters(station_id).await;
    let assets_result = check_asset_management(station_id).await;
    let system_result = check_system_configuration(station_id).await;
    let operational_result = check_operational_permissions(station_id).await;

    // Combine all checks into a single vector
    let mut all_checks = Vec::new();

    // Add results from each check, handling errors gracefully
    match admin_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Admin Control",
            "Admin Control",
            Severity::Critical,
            e
        )),
    }

    match treasury_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Treasury Control",
            "Treasury Control",
            Severity::Critical,
            e
        )),
    }

    match governance_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Governance Control",
            "Governance Control",
            Severity::Critical,
            e
        )),
    }

    match policies_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Request Policies",
            "Request Policies",
            Severity::High,
            e
        )),
    }

    match canisters_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "External Canister Control",
            "External Canister Control",
            Severity::Medium,
            e
        )),
    }

    match assets_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Asset Management",
            "Asset Management",
            Severity::Medium,
            e
        )),
    }

    match system_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "System Configuration",
            "System Configuration",
            Severity::High,
            e
        )),
    }

    match operational_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Operational Access",
            "Operational Access",
            Severity::Low,
            e
        )),
    }

    Ok(all_checks)
}

// ===== HELPER FUNCTIONS =====

fn check_permission_by_resource<F>(
    permissions: &Vec<Permission>,
    user_groups: &Vec<crate::types::orbit::UserGroup>,
    category: &str,
    check_name: &str,
    resource_matcher: F,
    severity: Severity,
    fail_message: &str,
    recommendation: &str,
) -> SecurityCheck
where
    F: Fn(&Resource) -> bool,
{
    let matching_perms: Vec<&Permission> = permissions.iter()
        .filter(|p| resource_matcher(&p.resource))
        .collect();

    let mut non_admin_groups: Vec<String> = Vec::new();

    for perm in &matching_perms {
        for group_id in &perm.allow.user_groups {
            if group_id != ADMIN_GROUP_ID {
                let group_name = user_groups.iter()
                    .find(|g| &g.id == group_id)
                    .map(|g| g.name.clone())
                    .unwrap_or_else(|| group_id.clone());
                if !non_admin_groups.contains(&group_name) {
                    non_admin_groups.push(group_name);
                }
            }
        }
    }

    if !non_admin_groups.is_empty() {
        SecurityCheck {
            category: category.to_string(),
            name: check_name.to_string(),
            status: CheckStatus::Fail,
            message: fail_message.to_string(),
            severity: Some(severity),
            details: Some(format!("Groups with access: {}", non_admin_groups.join(", "))),
            recommendation: Some(recommendation.to_string()),
        }
    } else {
        SecurityCheck {
            category: category.to_string(),
            name: check_name.to_string(),
            status: CheckStatus::Pass,
            message: "Properly restricted to Admin group".to_string(),
            severity: Some(Severity::None),
            details: Some(format!("{} permission(s) found, all restricted to Admin", matching_perms.len())),
            recommendation: None,
        }
    }
}

struct PolicyAnalysis {
    has_bypass: bool,
    is_auto_approved: bool,
    bypass_reason: Option<String>,
}

fn analyze_policy_rule(rule: &RequestPolicyRule) -> PolicyAnalysis {
    match rule {
        RequestPolicyRule::AutoApproved => PolicyAnalysis {
            has_bypass: false,
            is_auto_approved: true,
            bypass_reason: None,
        },
        RequestPolicyRule::QuorumPercentage(quorum) => {
            analyze_quorum_approvers(&quorum.approvers)
        }
        RequestPolicyRule::Quorum(quorum) => {
            analyze_quorum_approvers(&quorum.approvers)
        }
        RequestPolicyRule::AllowListed => PolicyAnalysis {
            has_bypass: true,
            is_auto_approved: false,
            bypass_reason: Some("AllowListed bypasses admin approval".to_string()),
        },
        RequestPolicyRule::AllowListedByMetadata(_) => PolicyAnalysis {
            has_bypass: true,
            is_auto_approved: false,
            bypass_reason: Some("AllowListed by metadata bypasses approval".to_string()),
        },
        RequestPolicyRule::NamedRule(_) => PolicyAnalysis {
            has_bypass: false, // Can't determine without resolving
            is_auto_approved: false,
            bypass_reason: None,
        },
        RequestPolicyRule::AnyOf(rules) => {
            for subrule in rules {
                let analysis = analyze_policy_rule(subrule);
                if analysis.has_bypass || analysis.is_auto_approved {
                    return PolicyAnalysis {
                        has_bypass: true,
                        is_auto_approved: false,
                        bypass_reason: Some("AnyOf contains bypass path".to_string()),
                    };
                }
            }
            PolicyAnalysis {
                has_bypass: false,
                is_auto_approved: false,
                bypass_reason: None,
            }
        }
        RequestPolicyRule::AllOf(rules) => {
            for subrule in rules {
                let analysis = analyze_policy_rule(subrule);
                if analysis.has_bypass {
                    return analysis;
                }
            }
            PolicyAnalysis {
                has_bypass: false,
                is_auto_approved: false,
                bypass_reason: None,
            }
        }
        RequestPolicyRule::Not(subrule) => {
            let sub_analysis = analyze_policy_rule(subrule);
            PolicyAnalysis {
                has_bypass: !sub_analysis.has_bypass,
                is_auto_approved: false,
                bypass_reason: if !sub_analysis.has_bypass {
                    Some("Not rule may bypass admin".to_string())
                } else {
                    None
                },
            }
        }
    }
}

fn analyze_quorum_approvers(approvers: &crate::types::orbit::UserSpecifier) -> PolicyAnalysis {
    match approvers {
        crate::types::orbit::UserSpecifier::Group(groups) => {
            if groups.iter().any(|g| g != ADMIN_GROUP_ID) {
                PolicyAnalysis {
                    has_bypass: true,
                    is_auto_approved: false,
                    bypass_reason: Some("Non-admin group can approve".to_string()),
                }
            } else {
                PolicyAnalysis {
                    has_bypass: false,
                    is_auto_approved: false,
                    bypass_reason: None,
                }
            }
        }
        crate::types::orbit::UserSpecifier::Id(_) => PolicyAnalysis {
            has_bypass: true,
            is_auto_approved: false,
            bypass_reason: Some("User-specific approval bypasses admin group".to_string()),
        },
        crate::types::orbit::UserSpecifier::Any => PolicyAnalysis {
            has_bypass: true,
            is_auto_approved: false,
            bypass_reason: Some("Any user can approve".to_string()),
        },
    }
}

fn create_error_check(name: &str, category: &str, severity: Severity, error: &str) -> SecurityCheck {
    SecurityCheck {
        category: category.to_string(),
        name: name.to_string(),
        status: CheckStatus::Error,
        message: format!("Failed to verify: {}", error),
        severity: Some(severity),
        details: None,
        recommendation: Some("Check Orbit Station connectivity and permissions".to_string()),
    }
}

// ===== RISK SCORING & DASHBOARD BUILDING =====

fn calculate_risk_score(checks: &Vec<SecurityCheck>) -> (u8, String, Vec<SecurityCheck>, Vec<String>) {
    let weights = RiskWeights::default();
    let mut score = 100.0;
    let mut critical_issues = Vec::new();
    let mut recommended_actions = Vec::new();

    for check in checks {
        let deduction = match (&check.status, &check.severity) {
            (CheckStatus::Fail, Some(Severity::Critical)) => weights.critical_admin_control,
            (CheckStatus::Fail, Some(Severity::High)) => weights.critical_governance,
            (CheckStatus::Fail, Some(Severity::Medium)) => weights.medium_external_canisters,
            (CheckStatus::Warn, Some(Severity::Low)) => weights.low_operational * 0.5,
            (CheckStatus::Warn, _) => weights.medium_system_config * 0.3,
            _ => 0.0,
        };

        score -= deduction;

        // Collect critical issues
        if matches!(check.status, CheckStatus::Fail) &&
           matches!(check.severity, Some(Severity::Critical) | Some(Severity::High)) {
            critical_issues.push(check.clone());
            if let Some(rec) = &check.recommendation {
                if !recommended_actions.contains(rec) {
                    recommended_actions.push(rec.clone());
                }
            }
        }
    }

    score = score.max(0.0).min(100.0);
    let score_u8 = score as u8;

    let summary = if score < 30.0 {
        format!("NOT A DAO - {} critical issues prevent community governance", critical_issues.len())
    } else if score < 60.0 {
        format!("PARTIAL DAO - {} issues allow admin bypass of community", critical_issues.len())
    } else if score < 85.0 {
        "MOSTLY DECENTRALIZED - Minor issues remain".to_string()
    } else {
        "TRUE DAO - Full community governance".to_string()
    };

    (score_u8, summary, critical_issues, recommended_actions)
}

fn build_dashboard(station_id: Principal, checks: Vec<SecurityCheck>) -> Result<EnhancedSecurityDashboard, String> {
    let (score, summary, critical_issues, recommended_actions) = calculate_risk_score(&checks);

    let overall_status = if checks.iter().any(|c| matches!(c.status, CheckStatus::Error)) {
        "error"
    } else if score < 30 {
        "critical"
    } else if score < 60 {
        "high_risk"
    } else if score < 85 {
        "medium_risk"
    } else {
        "secure"
    };

    Ok(EnhancedSecurityDashboard {
        station_id,
        overall_status: overall_status.to_string(),
        decentralization_score: score,
        last_checked: time(),
        checks,
        risk_summary: summary,
        critical_issues,
        recommended_actions,
    })
}
