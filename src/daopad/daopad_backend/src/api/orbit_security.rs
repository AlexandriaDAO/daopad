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
    RequestPoliciesDetails, RequestPolicyInfo, RequestSpecifier,
    ListNamedRulesResult, ListNamedRulesInput, NamedRule,
    Account, ListAccountsInput, ListAccountsResult,
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
pub struct RelatedPermission {
    pub resource_type: String,
    pub groups: Vec<String>,
    pub resource_id: Option<String>,
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
    pub related_permissions: Option<Vec<RelatedPermission>>,
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
    critical_controller_manipulation: f64,  // NEW
    critical_external_calls: f64,  // NEW
    critical_system_restore: f64,  // NEW
    high_proposal_bypass: f64,
    high_addressbook_injection: f64,  // NEW
    high_monitoring_drain: f64,  // NEW
    medium_external_canisters: f64,
    medium_system_config: f64,
    medium_snapshot_ops: f64,  // NEW
    medium_named_rules: f64,  // NEW
    medium_remove_ops: f64,  // NEW
    low_operational: f64,
}

impl Default for RiskWeights {
    fn default() -> Self {
        RiskWeights {
            critical_admin_control: 20.0,  // Reduced to make room
            critical_treasury: 18.0,
            critical_governance: 12.0,
            critical_controller_manipulation: 15.0,  // NEW - highest risk
            critical_external_calls: 10.0,  // NEW - direct bypass
            critical_system_restore: 10.0,  // NEW - time travel
            high_proposal_bypass: 5.0,
            high_addressbook_injection: 3.0,  // NEW
            high_monitoring_drain: 2.0,  // NEW
            medium_external_canisters: 2.0,
            medium_system_config: 1.0,
            medium_snapshot_ops: 1.0,  // NEW
            medium_named_rules: 1.0,  // NEW
            medium_remove_ops: 1.0,  // NEW
            low_operational: 0.5,
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

/// Check controller manipulation: NativeSettings controller changes
#[ic_cdk::update]
pub async fn check_controller_manipulation(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = fetch_permissions(station_id).await.map_err(|e| {
        format!("Failed to fetch permissions: {}", e)
    })?;

    Ok(check_controller_manipulation_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check external canister call permissions
#[ic_cdk::update]
pub async fn check_external_canister_calls(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = fetch_permissions(station_id).await.map_err(|e| {
        format!("Failed to fetch permissions: {}", e)
    })?;

    Ok(check_external_canister_calls_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check system restore permissions
#[ic_cdk::update]
pub async fn check_system_restore(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = fetch_permissions(station_id).await.map_err(|e| {
        format!("Failed to fetch permissions: {}", e)
    })?;

    Ok(check_system_restore_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check addressbook injection with allowlisted policies
#[ic_cdk::update]
pub async fn check_addressbook_injection(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = fetch_permissions(station_id).await?;
    let policies_data = fetch_policies(station_id).await?;

    Ok(check_addressbook_injection_impl(&perms_data.permissions, &policies_data, &perms_data.user_groups))
}

/// Check monitoring cycle drain
#[ic_cdk::update]
pub async fn check_monitoring_drain(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = fetch_permissions(station_id).await?;

    Ok(check_monitoring_drain_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check snapshot operations
#[ic_cdk::update]
pub async fn check_snapshot_operations(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = fetch_permissions(station_id).await?;

    Ok(check_snapshot_operations_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check named rule bypass
#[ic_cdk::update]
pub async fn check_named_rule_bypass(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = fetch_permissions(station_id).await?;
    let policies_data = fetch_policies(station_id).await?;

    Ok(check_named_rule_bypass_impl(&perms_data.permissions, &policies_data, &perms_data.user_groups))
}

/// Check remove operations
#[ic_cdk::update]
pub async fn check_remove_operations(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = fetch_permissions(station_id).await?;

    Ok(check_remove_operations_impl(&perms_data.permissions, &perms_data.user_groups))
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
        ListPermissionsResult::Ok {
            permissions,
            total: _,
            privileges: _,
            user_groups,
            users: _,
            next_offset: _,
        } => {
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
            related_permissions: None,
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
            related_permissions: None,
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
            related_permissions: None,
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
            related_permissions: None,
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
            related_permissions: None,
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
            related_permissions: None,
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
            related_permissions: None,
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
            related_permissions: None,
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
            related_permissions: None,
        });
    }

    // CORRECTED: AutoApproved is GOOD for DAOPad architecture
    if auto_approved_count > 0 {
        checks.push(SecurityCheck {
            category: "Request Policies".to_string(),
            name: "Auto-Approval Policies".to_string(),
            status: CheckStatus::Pass,
            message: format!("{} policies use AutoApproved (liquid democracy mode)", auto_approved_count),
            severity: Some(Severity::None),
            details: Some(
                "AutoApproved policies enable DAOPad's liquid democracy architecture. \
                 Community votes in DAOPad (50%+ threshold, 7-day period), then Orbit \
                 executes automatically. Backend cannot approve its own requests \
                 (separation of duties), so AutoApproved is required.".to_string()
            ),
            recommendation: None,
            related_permissions: None,
        });
    } else {
        // WARN if NOT using AutoApproved (unusual for DAOPad)
        checks.push(SecurityCheck {
            category: "Request Policies".to_string(),
            name: "Auto-Approval Policies".to_string(),
            status: CheckStatus::Warn,
            message: "No auto-approved policies detected".to_string(),
            severity: Some(Severity::Low),
            details: Some(
                "DAOPad typically uses AutoApproved policies for request operations. \
                 Without AutoApproved, requests may require redundant manual approval \
                 in Orbit UI.".to_string()
            ),
            recommendation: Some(
                "Check if AutoApproved is needed for your account transfer policies. \
                 See Security tab for account-specific status.".to_string()
            ),
            related_permissions: None,
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
                related_permissions: None,
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
                related_permissions: None,
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
        related_permissions: None,
    });

    checks
}

// ===== CHECK CATEGORY 9: CONTROLLER MANIPULATION =====

fn check_controller_manipulation_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<crate::types::orbit::UserGroup>
) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Check ExternalCanister.Change permission
    // This is CRITICAL because Change includes NativeSettings which can modify controllers
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Controller Manipulation",
        "External Canister Change Access (includes controller modification)",
        |resource| matches!(resource, Resource::ExternalCanister(ExternalCanisterAction::Change(_))),
        Severity::Critical,
        "Non-admin groups can change external canister settings INCLUDING CONTROLLERS - allows complete canister takeover",
        "Restrict ExternalCanister.Change to Admin group only, or explicitly check NativeSettings operations",
    ));

    // Check ExternalCanister.Configure permission (if we distinguish it)
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Controller Manipulation",
        "External Canister Configure Access",
        |resource| matches!(resource, Resource::ExternalCanister(ExternalCanisterAction::Configure(_))),
        Severity::Critical,
        "Non-admin groups can configure external canister native settings including controllers",
        "Restrict ExternalCanister.Configure to Admin group only",
    ));

    checks
}

// ===== CHECK CATEGORY 10: EXTERNAL CANISTER CALLS =====

fn check_external_canister_calls_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<crate::types::orbit::UserGroup>
) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Check CallExternalCanister permission - HIGH RISK
    // Users can call ANY method with ANY arguments on controlled canisters
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "External Canister Execution",
        "External Canister Call Access",
        |resource| matches!(resource, Resource::ExternalCanister(ExternalCanisterAction::Call(_))),
        Severity::Critical,
        "Non-admin groups can execute arbitrary methods on external canisters - can bypass treasury governance",
        "Restrict CallExternalCanister to Admin group, or use granular per-method permissions",
    ));

    checks
}

// ===== CHECK CATEGORY 11: SYSTEM RESTORE =====

fn check_system_restore_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<crate::types::orbit::UserGroup>
) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Check System.Restore permission - TIME TRAVEL ATTACK
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "System Restore",
        "System Restore Access",
        |resource| matches!(resource, Resource::System(SystemAction::Restore)),
        Severity::Critical,
        "Non-admin groups can restore Station to previous snapshot - allows reversing executed operations",
        "Restrict System.Restore to Admin group only",
    ));

    checks
}

// ===== CHECK CATEGORY 12: ADDRESSBOOK WHITELIST INJECTION =====

fn check_addressbook_injection_impl(
    permissions: &Vec<Permission>,
    policies: &Vec<crate::types::orbit::RequestPolicy>,
    user_groups: &Vec<crate::types::orbit::UserGroup>
) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // First, check if any policies use AllowListedByMetadata
    let has_allowlisted_policies = policies.iter().any(|policy| {
        policy_uses_allowlisted_metadata(&policy.rule)
    });

    if !has_allowlisted_policies {
        // No AllowListed policies, so this attack vector doesn't apply
        checks.push(SecurityCheck {
            category: "AddressBook Injection".to_string(),
            name: "Whitelist Policy Detection".to_string(),
            status: CheckStatus::Pass,
            message: "No AllowListed policies detected".to_string(),
            severity: Some(Severity::None),
            details: None,
            recommendation: None,
            related_permissions: None,
        });
        return checks;
    }

    // If AllowListed policies exist, check AddressBook.Create permission
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "AddressBook Injection",
        "AddressBook Creation with AllowListed Policies",
        |resource| matches!(resource, Resource::AddressBook(ResourceAction::Create)),
        Severity::High,
        "Non-admin groups can create address book entries that match AllowListed metadata - bypasses transfer approval",
        "Either: (1) Restrict AddressBook.Create to Admin, or (2) Remove AllowListedByMetadata policies",
    ));

    checks
}

fn policy_uses_allowlisted_metadata(rule: &RequestPolicyRule) -> bool {
    match rule {
        RequestPolicyRule::AllowListedByMetadata(_) => true,
        RequestPolicyRule::AnyOf(rules) | RequestPolicyRule::AllOf(rules) => {
            rules.iter().any(|r| policy_uses_allowlisted_metadata(r))
        }
        RequestPolicyRule::Not(inner) => policy_uses_allowlisted_metadata(inner),
        _ => false,
    }
}

// ===== CHECK CATEGORY 13: MONITORING CYCLE DRAIN =====

fn check_monitoring_drain_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<crate::types::orbit::UserGroup>
) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Check ExternalCanister.Monitor permission
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Monitoring Cycle Drain",
        "External Canister Monitoring Access",
        |resource| matches!(resource, Resource::ExternalCanister(ExternalCanisterAction::Monitor(_))),
        Severity::High,
        "Non-admin groups can set up automatic cycle funding - enables recurring unauthorized transfers",
        "Restrict ExternalCanister.Monitor to Admin group only",
    ));

    checks
}

// ===== CHECK CATEGORY 14: SNAPSHOT OPERATIONS =====

fn check_snapshot_operations_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<crate::types::orbit::UserGroup>
) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Check Snapshot permission
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Snapshot Operations",
        "External Canister Snapshot Access",
        |resource| matches!(resource, Resource::ExternalCanister(ExternalCanisterAction::Snapshot(_))),
        Severity::Medium,
        "Non-admin groups can snapshot/restore/prune external canisters - enables state manipulation",
        "Restrict snapshot operations to Admin group only",
    ));

    checks
}

// ===== CHECK CATEGORY 15: NAMED RULE BYPASS =====

fn check_named_rule_bypass_impl(
    permissions: &Vec<Permission>,
    policies: &Vec<crate::types::orbit::RequestPolicy>,
    user_groups: &Vec<crate::types::orbit::UserGroup>
) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Check if any policies reference NamedRules
    let has_named_rules = policies.iter().any(|policy| {
        policy_uses_named_rules(&policy.rule)
    });

    if !has_named_rules {
        checks.push(SecurityCheck {
            category: "Named Rule Bypass".to_string(),
            name: "Named Rule Usage Detection".to_string(),
            status: CheckStatus::Pass,
            message: "No policies reference named rules".to_string(),
            severity: Some(Severity::None),
            details: None,
            recommendation: None,
            related_permissions: None,
        });
        return checks;
    }

    // If named rules are used, check who can edit them
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Named Rule Bypass",
        "Named Rule Modification with Active Policies",
        |resource| matches!(resource, Resource::NamedRule(ResourceAction::Update(_))),
        Severity::Medium,
        "Non-admin groups can edit named rules used in policies - enables indirect governance bypass",
        "Restrict NamedRule.Update to Admin group only",
    ));

    checks
}

fn policy_uses_named_rules(rule: &RequestPolicyRule) -> bool {
    match rule {
        RequestPolicyRule::NamedRule(_) => true,
        RequestPolicyRule::AnyOf(rules) | RequestPolicyRule::AllOf(rules) => {
            rules.iter().any(|r| policy_uses_named_rules(r))
        }
        RequestPolicyRule::Not(inner) => policy_uses_named_rules(inner),
        _ => false,
    }
}

// ===== CHECK CATEGORY 16: REMOVE OPERATIONS =====

fn check_remove_operations_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<crate::types::orbit::UserGroup>
) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Check Asset.Remove
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Remove Operations",
        "Asset Removal Access",
        |resource| matches!(resource, Resource::Asset(ResourceAction::Remove(_))),
        Severity::Medium,
        "Non-admin groups can remove assets - may break dependent accounts",
        "Restrict Asset.Remove to Admin group only",
    ));

    // Check UserGroup.Remove
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Remove Operations",
        "User Group Removal Access",
        |resource| matches!(resource, Resource::UserGroup(ResourceAction::Remove(_))),
        Severity::Medium,
        "Non-admin groups can remove user groups - may orphan permissions",
        "Restrict UserGroup.Remove to Admin group only",
    ));

    // Check RequestPolicy.Remove
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Remove Operations",
        "Request Policy Removal Access",
        |resource| matches!(resource, Resource::RequestPolicy(ResourceAction::Remove(_))),
        Severity::High,
        "Non-admin groups can remove request policies - may leave operations unprotected",
        "Restrict RequestPolicy.Remove to Admin group only",
    ));

    // Check NamedRule.Remove
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Remove Operations",
        "Named Rule Removal Access",
        |resource| matches!(resource, Resource::NamedRule(ResourceAction::Remove(_))),
        Severity::Medium,
        "Non-admin groups can remove named rules - may break dependent policies",
        "Restrict NamedRule.Remove to Admin group only",
    ));

    checks
}

// ===== AGGREGATOR METHOD: ALL SECURITY CHECKS =====

/// Perform all security checks in one call
///
/// This is a convenience method that calls all 17 individual security check methods
/// and combines their results into a single response. This is useful for:
/// - Getting a complete security overview in one call
/// - Frontend components that need all checks at once
/// - Simplifying frontend code by providing a single endpoint
#[ic_cdk::update]
pub async fn perform_all_security_checks(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    // Call all 17 individual checks sequentially (8 existing + 8 bypass detection + 1 treasury setup)
    // Note: These are already async and make inter-canister calls

    // Existing 8 checks
    let admin_result = check_admin_control(station_id).await;
    let treasury_result = check_treasury_control(station_id).await;
    let governance_result = check_governance_permissions(station_id).await;
    let policies_result = check_proposal_policies(station_id).await;
    let canisters_result = check_external_canisters(station_id).await;
    let assets_result = check_asset_management(station_id).await;
    let system_result = check_system_configuration(station_id).await;
    let operational_result = check_operational_permissions(station_id).await;

    // NEW: 8 additional bypass detection checks
    let controller_result = check_controller_manipulation(station_id).await;
    let calls_result = check_external_canister_calls(station_id).await;
    let restore_result = check_system_restore(station_id).await;
    let addressbook_result = check_addressbook_injection(station_id).await;
    let monitoring_result = check_monitoring_drain(station_id).await;
    let snapshot_result = check_snapshot_operations(station_id).await;
    let namedrule_result = check_named_rule_bypass(station_id).await;
    let remove_result = check_remove_operations(station_id).await;

    // NEW: Treasury setup check (account AutoApproved status)
    let account_autoapproved_result = check_account_autoapproved_status(station_id).await;

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

    // Add new 8 categories with error handling
    match controller_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Controller Manipulation",
            "Controller Manipulation",
            Severity::Critical,
            e
        )),
    }

    match calls_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "External Canister Calls",
            "External Canister Calls",
            Severity::Critical,
            e
        )),
    }

    match restore_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "System Restore",
            "System Restore",
            Severity::Critical,
            e
        )),
    }

    match addressbook_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "AddressBook Injection",
            "AddressBook Injection",
            Severity::High,
            e
        )),
    }

    match monitoring_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Monitoring Cycle Drain",
            "Monitoring Cycle Drain",
            Severity::High,
            e
        )),
    }

    match snapshot_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Snapshot Operations",
            "Snapshot Operations",
            Severity::Medium,
            e
        )),
    }

    match namedrule_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Named Rule Bypass",
            "Named Rule Bypass",
            Severity::Medium,
            e
        )),
    }

    match remove_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Remove Operations",
            "Remove Operations",
            Severity::Medium,
            e
        )),
    }

    match account_autoapproved_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Treasury Setup",
            "Account AutoApproved Status",
            Severity::Critical,
            e
        )),
    }

    Ok(all_checks)
}

// ===== CHECK CATEGORY 17: TREASURY SETUP - ACCOUNT AUTOAPPROVED STATUS =====

/// Check if treasury accounts have AutoApproved transfer policies
/// This is CRITICAL for DAOPad liquid democracy to work
#[ic_cdk::update]
pub async fn check_account_autoapproved_status(
    station_id: Principal
) -> Result<Vec<SecurityCheck>, String> {
    // Fetch accounts from Orbit Station
    let accounts = fetch_accounts(station_id).await?;

    // Analyze AutoApproved status
    Ok(check_account_autoapproved_impl(&accounts))
}

fn check_account_autoapproved_impl(accounts: &Vec<Account>) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Categorize accounts
    let mut autoapproved_accounts = Vec::new();
    let mut non_autoapproved_accounts = Vec::new();

    for account in accounts {
        match &account.transfer_request_policy {
            Some(RequestPolicyRule::AutoApproved) => {
                autoapproved_accounts.push(account.name.clone());
            },
            _ => {
                non_autoapproved_accounts.push(account.name.clone());
            }
        }
    }

    // Determine status
    if non_autoapproved_accounts.is_empty() {
        // ALL accounts configured - GOOD
        checks.push(SecurityCheck {
            category: "Treasury Setup".to_string(),
            name: "Account AutoApproved Status".to_string(),
            status: CheckStatus::Pass,
            message: format!(
                "All {} account(s) configured with AutoApproved policies",
                autoapproved_accounts.len()
            ),
            severity: Some(Severity::None),
            details: Some(
                "Treasury accounts are ready for liquid democracy. \
                 Community votes in DAOPad, backend executes approved operations. \
                 No manual Orbit approval needed.".to_string()
            ),
            recommendation: None,
            related_permissions: None,
        });
    } else {
        // SOME accounts NOT configured - CRITICAL
        checks.push(SecurityCheck {
            category: "Treasury Setup".to_string(),
            name: "Account AutoApproved Status".to_string(),
            status: CheckStatus::Fail,
            message: format!(
                "{} account(s) NOT configured - treasury operations will fail",
                non_autoapproved_accounts.len()
            ),
            severity: Some(Severity::Critical),
            details: Some(format!(
                "Accounts needing setup: {}\n\n\
                 WHY THIS MATTERS:\n\
                 - Backend creates transfer requests after community vote passes\n\
                 - Backend CANNOT approve its own requests (Orbit separation of duties)\n\
                 - Without AutoApproved, requests stuck 'Pending' forever\n\
                 - Users see failed transfers with no explanation\n\n\
                 SECURITY NOTE:\n\
                 This is NOT a security risk. Real governance happens in DAOPad \
                 (50%+ vote required). AutoApproved just tells Orbit to execute \
                 after the vote passes.",
                non_autoapproved_accounts.join(", ")
            )),
            recommendation: Some(
                "Use the setup wizard below to configure AutoApproved policies.".to_string()
            ),
            related_permissions: None,
        });
    }

    checks
}

// Helper: Fetch accounts from Orbit Station
async fn fetch_accounts(station_id: Principal) -> Result<Vec<Account>, String> {
    let input = ListAccountsInput {
        search_term: None,
        paginate: None,
    };

    let result: Result<(ListAccountsResult,), _> = ic_cdk::call(
        station_id,
        "list_accounts",
        (input,)
    ).await;

    match result {
        Ok((ListAccountsResult::Ok { accounts, .. },)) => Ok(accounts),
        Ok((ListAccountsResult::Err(e),)) => Err(format!("Orbit error: {:?}", e)),
        Err((code, msg)) => Err(format!("Failed to list accounts: {:?} - {}", code, msg)),
    }
}

// ===== PUBLIC DASHBOARD ENDPOINT =====

/// Perform comprehensive security analysis and return dashboard with score
///
/// This is the public-facing endpoint that frontend calls.
/// It combines perform_all_security_checks + build_dashboard to return
/// the full EnhancedSecurityDashboard with decentralization score.
#[ic_cdk::update]
pub async fn perform_security_check(station_id: Principal) -> Result<EnhancedSecurityDashboard, String> {
    // Execute all security checks
    let checks = perform_all_security_checks(station_id).await?;

    // Build dashboard with scoring and analysis
    build_dashboard(station_id, checks)
}

// ===== REQUEST POLICIES DETAILS ENDPOINT =====

/// Get detailed request policies information with resolved rule names
///
/// Returns all request policies with human-readable operation names and approval rules
#[ic_cdk::update]
pub async fn get_request_policies_details(station_id: Principal) -> Result<RequestPoliciesDetails, String> {
    // Fetch policies from Orbit
    let policies = fetch_policies(station_id).await?;

    // Fetch named rules to resolve names
    let named_rules = fetch_named_rules(station_id).await?;

    // Build response with resolved rule names
    let mut policies_with_names = Vec::new();
    let mut auto_approved_count = 0;
    let mut bypass_count = 0;

    for policy in &policies {
        let rule_description = format_policy_rule(&policy.rule, &named_rules);

        // Count auto-approved and bypass policies
        let analysis = analyze_policy_rule(&policy.rule);
        if analysis.is_auto_approved {
            auto_approved_count += 1;
        }
        if analysis.has_bypass {
            bypass_count += 1;
        }

        policies_with_names.push(RequestPolicyInfo {
            operation: format_specifier(&policy.specifier),
            approval_rule: rule_description,
            specifier: policy.specifier.clone(),
            rule: policy.rule.clone(),
        });
    }

    Ok(RequestPoliciesDetails {
        policies: policies_with_names,
        total_count: policies.len(),
        auto_approved_count,
        bypass_count,
    })
}

// Helper to fetch named rules
async fn fetch_named_rules(station_id: Principal) -> Result<Vec<NamedRule>, String> {
    let input = ListNamedRulesInput { paginate: None };

    let result: Result<(ListNamedRulesResult,), _> = ic_cdk::call(station_id, "list_named_rules", (input,))
        .await
        .map_err(|e| format!("Failed to list named rules: {:?}", e));

    match result {
        Ok((response,)) => match response {
            ListNamedRulesResult::Ok {
                named_rules,
                ..
            } => Ok(named_rules),
            ListNamedRulesResult::Err(err) => {
                Err(format!("Orbit returned error: {:?}", err))
            }
        },
        Err(e) => Err(e),
    }
}

// Helper to format specifier for display
fn format_specifier(spec: &RequestSpecifier) -> String {
    match spec {
        RequestSpecifier::Transfer(resource_spec) => {
            format!("Transfer - {:?}", resource_spec)
        },
        RequestSpecifier::EditAccount(resource_spec) => {
            format!("Edit Account - {:?}", resource_spec)
        },
        RequestSpecifier::AddUser => "Add User".to_string(),
        RequestSpecifier::EditUser(resource_spec) => {
            format!("Edit User - {:?}", resource_spec)
        },
        RequestSpecifier::RemoveUser => "Remove User".to_string(),
        RequestSpecifier::AddAccount => "Add Account".to_string(),
        RequestSpecifier::RemoveAccount => {
            "Remove Account".to_string()
        },
        RequestSpecifier::AddAsset => "Add Asset".to_string(),
        RequestSpecifier::EditAsset(resource_spec) => {
            format!("Edit Asset - {:?}", resource_spec)
        },
        RequestSpecifier::RemoveAsset(resource_spec) => {
            format!("Remove Asset - {:?}", resource_spec)
        },
        RequestSpecifier::ChangeExternalCanister(canister_id) => {
            format!("Change External Canister - {:?}", canister_id)
        },
        RequestSpecifier::CreateExternalCanister => "Create External Canister".to_string(),
        RequestSpecifier::CallExternalCanister(canister_id) => {
            format!("Call External Canister - {:?}", canister_id)
        },
        RequestSpecifier::EditPermission(resource_spec) => {
            format!("Edit Permission - {:?}", resource_spec)
        },
        RequestSpecifier::EditRequestPolicy(resource_spec) => {
            format!("Edit Request Policy - {:?}", resource_spec)
        },
        RequestSpecifier::RemoveRequestPolicy(resource_spec) => {
            format!("Remove Request Policy - {:?}", resource_spec)
        },
        RequestSpecifier::ManageSystemInfo => "Manage System Info".to_string(),
        RequestSpecifier::AddUserGroup => "Add User Group".to_string(),
        RequestSpecifier::RemoveUserGroup(resource_spec) => {
            format!("Remove User Group - {:?}", resource_spec)
        },
        RequestSpecifier::AddNamedRule => "Add Named Rule".to_string(),
        RequestSpecifier::EditNamedRule(resource_spec) => {
            format!("Edit Named Rule - {:?}", resource_spec)
        },
        RequestSpecifier::RemoveNamedRule(resource_spec) => {
            format!("Remove Named Rule - {:?}", resource_spec)
        },
        RequestSpecifier::EditAddressBookEntry(resource_spec) => {
            format!("Edit Address Book Entry - {:?}", resource_spec)
        },
        RequestSpecifier::RemoveAddressBookEntry(resource_spec) => {
            format!("Remove Address Book Entry - {:?}", resource_spec)
        },
        RequestSpecifier::FundExternalCanister(resource_spec) => {
            format!("Fund External Canister - {:?}", resource_spec)
        },
        RequestSpecifier::SystemUpgrade => "System Upgrade".to_string(),
        RequestSpecifier::AddRequestPolicy => "Add Request Policy".to_string(),
        RequestSpecifier::EditUserGroup(resource_spec) => {
            format!("Edit User Group - {:?}", resource_spec)
        },
        RequestSpecifier::AddAddressBookEntry => "Add Address Book Entry".to_string(),
        RequestSpecifier::ChangeCanister => "Change Canister".to_string(),
        RequestSpecifier::SetDisasterRecovery => "Set Disaster Recovery".to_string(),
    }
}

// Helper to format policy rule with resolved named rules
fn format_policy_rule(rule: &RequestPolicyRule, named_rules: &Vec<NamedRule>) -> String {
    match rule {
        RequestPolicyRule::AutoApproved => "No approval required (Auto-approved)".to_string(),
        RequestPolicyRule::NamedRule(id) => {
            // Find matching named rule
            named_rules.iter()
                .find(|r| &r.id == id)
                .map(|r| r.name.clone())
                .unwrap_or_else(|| format!("Named Rule ({})", id))
        },
        RequestPolicyRule::Quorum(quorum) => {
            format!("{} approval(s) from {}",
                quorum.min_approved,
                format_user_specifier(&quorum.approvers))
        },
        RequestPolicyRule::QuorumPercentage(quorum) => {
            format!("{}% approval from {}",
                quorum.min_approved,
                format_user_specifier(&quorum.approvers))
        },
        RequestPolicyRule::AllowListed => "Allowed for whitelisted addresses".to_string(),
        RequestPolicyRule::AllowListedByMetadata(_metadata) => {
            "Allowed by metadata whitelist".to_string()
        },
        RequestPolicyRule::AnyOf(rules) => {
            let sub_rules: Vec<String> = rules.iter()
                .map(|r| format_policy_rule(r, named_rules))
                .collect();
            format!("Any of: [{}]", sub_rules.join(", "))
        },
        RequestPolicyRule::AllOf(rules) => {
            let sub_rules: Vec<String> = rules.iter()
                .map(|r| format_policy_rule(r, named_rules))
                .collect();
            format!("All of: [{}]", sub_rules.join(", "))
        },
        RequestPolicyRule::Not(inner_rule) => {
            format!("Not ({})", format_policy_rule(inner_rule, named_rules))
        },
    }
}

// Helper to format user specifier
fn format_user_specifier(spec: &crate::types::orbit::UserSpecifier) -> String {
    match spec {
        crate::types::orbit::UserSpecifier::Any => "any user".to_string(),
        crate::types::orbit::UserSpecifier::Id(user_ids) => {
            if user_ids.len() == 1 {
                "specific user".to_string()
            } else {
                format!("{} specific users", user_ids.len())
            }
        },
        crate::types::orbit::UserSpecifier::Group(group_ids) => {
            let group_names: Vec<String> = group_ids.iter().map(|id| {
                if id == ADMIN_GROUP_ID {
                    "Admin".to_string()
                } else if id == OPERATOR_GROUP_ID {
                    "Operator".to_string()
                } else {
                    format!("Group {}", &id[..8])
                }
            }).collect();
            group_names.join(", ")
        },
    }
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
    let mut related_permissions: Vec<RelatedPermission> = Vec::new();

    for perm in &matching_perms {
        for group_id in &perm.allow.user_groups {
            if group_id != ADMIN_GROUP_ID {
                let group_name = user_groups.iter()
                    .find(|g| &g.id == group_id)
                    .map(|g| g.name.clone())
                    .unwrap_or_else(|| group_id.clone());
                if !non_admin_groups.contains(&group_name) {
                    non_admin_groups.push(group_name.clone());
                }

                // Track specific permission details for cross-referencing
                let resource_type = format_resource_for_reference(&perm.resource);
                related_permissions.push(RelatedPermission {
                    resource_type,
                    groups: vec![group_name],
                    resource_id: None,
                });
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
            related_permissions: Some(related_permissions),
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
            related_permissions: None,
        }
    }
}

// Helper function to format resource for display in cross-references
fn format_resource_for_reference(resource: &Resource) -> String {
    match resource {
        Resource::Account(action) => format!("Account.{}", format_resource_action(action)),
        Resource::Asset(action) => format!("Asset.{}", format_resource_action(action)),
        Resource::User(action) => format!("User.{}", format_user_action(action)),
        Resource::System(action) => format!("System.{}", format_system_action(action)),
        Resource::ExternalCanister(action) => format!("ExternalCanister.{}", format_external_canister_action(action)),
        Resource::Permission(action) => format!("Permission.{}", format_permission_action(action)),
        Resource::RequestPolicy(action) => format!("RequestPolicy.{}", format_resource_action(action)),
        Resource::UserGroup(action) => format!("UserGroup.{}", format_resource_action(action)),
        Resource::AddressBook(action) => format!("AddressBook.{}", format_resource_action(action)),
        Resource::NamedRule(action) => format!("NamedRule.{}", format_resource_action(action)),
        _ => "Unknown".to_string(),
    }
}

fn format_resource_action(action: &ResourceAction) -> String {
    match action {
        ResourceAction::Create => "Create".to_string(),
        ResourceAction::Read(_) => "Read".to_string(),
        ResourceAction::Update(_) => "Update".to_string(),
        ResourceAction::Delete(_) => "Delete".to_string(),
        ResourceAction::Transfer(_) => "Transfer".to_string(),
        ResourceAction::Remove(_) => "Remove".to_string(),
        _ => "Unknown".to_string(),
    }
}

fn format_user_action(action: &UserAction) -> String {
    match action {
        UserAction::Create => "Create".to_string(),
        UserAction::Update(_) => "Update".to_string(),
        UserAction::Read(_) => "Read".to_string(),
        UserAction::List => "List".to_string(),
    }
}

fn format_system_action(action: &SystemAction) -> String {
    match action {
        SystemAction::Upgrade => "Upgrade".to_string(),
        SystemAction::ManageSystemInfo => "ManageSystemInfo".to_string(),
        SystemAction::Restore => "Restore".to_string(),
        _ => "Unknown".to_string(),
    }
}

fn format_external_canister_action(action: &ExternalCanisterAction) -> String {
    match action {
        ExternalCanisterAction::Create => "Create".to_string(),
        ExternalCanisterAction::Read(_) => "Read".to_string(),
        ExternalCanisterAction::Change(_) => "Change".to_string(),
        ExternalCanisterAction::Fund(_) => "Fund".to_string(),
        ExternalCanisterAction::Call(_) => "Call".to_string(),
        ExternalCanisterAction::Monitor(_) => "Monitor".to_string(),
        ExternalCanisterAction::Snapshot(_) => "Snapshot".to_string(),
        _ => "Unknown".to_string(),
    }
}

fn format_permission_action(action: &PermissionAction) -> String {
    match action {
        PermissionAction::Read => "Read".to_string(),
        PermissionAction::Update => "Update".to_string(),
        _ => "Unknown".to_string(),
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
        related_permissions: None,
    }
}

// ===== RISK SCORING & DASHBOARD BUILDING =====

fn calculate_risk_score(checks: &Vec<SecurityCheck>) -> (u8, String, Vec<SecurityCheck>, Vec<String>) {
    let weights = RiskWeights::default();
    let mut score = 100.0;
    let mut critical_issues = Vec::new();
    let mut recommended_actions = Vec::new();

    for check in checks {
        // Match check category + severity to apply correct weight
        let deduction = match (check.category.as_str(), &check.status, &check.severity) {
            // Critical checks
            ("Admin Control", CheckStatus::Fail, Some(Severity::Critical)) => weights.critical_admin_control,
            ("Treasury Control", CheckStatus::Fail, Some(Severity::Critical)) => weights.critical_treasury,
            ("Governance Control", CheckStatus::Fail, Some(Severity::Critical)) => weights.critical_governance,
            ("Controller Manipulation", CheckStatus::Fail, Some(Severity::Critical)) => weights.critical_controller_manipulation,
            ("External Canister Execution", CheckStatus::Fail, Some(Severity::Critical)) => weights.critical_external_calls,
            ("System Restore", CheckStatus::Fail, Some(Severity::Critical)) => weights.critical_system_restore,

            // High checks - categorize by check name for specific weights
            (_, CheckStatus::Fail, Some(Severity::High)) => {
                if check.category.contains("AddressBook") {
                    weights.high_addressbook_injection
                } else if check.category.contains("Monitoring") {
                    weights.high_monitoring_drain
                } else {
                    weights.high_proposal_bypass
                }
            }

            // Medium checks - categorize by check name
            (_, CheckStatus::Fail, Some(Severity::Medium)) => {
                if check.category.contains("Snapshot") {
                    weights.medium_snapshot_ops
                } else if check.category.contains("Named Rule") {
                    weights.medium_named_rules
                } else if check.category.contains("Remove") {
                    weights.medium_remove_ops
                } else {
                    weights.medium_external_canisters
                }
            }

            // Warnings
            (_, CheckStatus::Warn, Some(Severity::Low)) => weights.low_operational * 0.5,
            (_, CheckStatus::Warn, _) => weights.medium_system_config * 0.3,

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
