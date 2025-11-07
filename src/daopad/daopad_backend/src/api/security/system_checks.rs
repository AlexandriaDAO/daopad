use super::security_utils::{SecurityCheck, CheckStatus, Severity};
use super::governance_checks::check_permission_by_resource;
use crate::types::orbit::{
    Permission, Resource, SystemAction, ExternalCanisterAction, UserGroup,
    SystemInfoMinimal, SystemInfoResultMinimal,
};
use candid::Principal;

// ===== DATA FETCHING =====

pub async fn fetch_system_info(station_id: Principal) -> Result<SystemInfoMinimal, String> {
    let result: (SystemInfoResultMinimal,) = ic_cdk::call(station_id, "system_info", ())
        .await
        .map_err(|e| format!("Failed to get system info: {:?}", e))?;

    match result.0 {
        SystemInfoResultMinimal::Ok { system } => Ok(system),
        SystemInfoResultMinimal::Err(e) => Err(format!("Orbit returned error: {}", e)),
    }
}

// ===== SYSTEM CONFIGURATION CHECKS =====

pub fn check_system_configuration_impl(
    _system: &SystemInfoMinimal,
    permissions: &Vec<Permission>,
    user_groups: &Vec<UserGroup>
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

    // SKIPPED: Disaster recovery check - field removed from SystemInfoMinimal
    // due to Candid 0.10.18 Option<DisasterRecovery> deserialization errors
    // TODO: Re-enable when Candid is upgraded or query separately
    checks.push(SecurityCheck {
        category: "System Configuration".to_string(),
        name: "Disaster Recovery Settings".to_string(),
        status: CheckStatus::Warn,
        message: "Disaster recovery check unavailable (Candid limitation)".to_string(),
        severity: Some(Severity::Low),
        details: Some("Unable to verify disaster recovery due to Candid Option<T> limitation".to_string()),
        recommendation: Some("Verify disaster recovery manually in Orbit UI".to_string()),
        related_permissions: None,
    });

    checks
}

// ===== EXTERNAL CANISTER CONTROL CHECKS =====

pub fn check_external_canister_control_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<UserGroup>
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
        "Non-admin groups can change external canister settings",
        "Restrict ExternalCanister.Change to Admin group only",
    ));

    // Check ExternalCanister.Fund
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "External Canister Control",
        "Canister Funding Access",
        |resource| matches!(resource, Resource::ExternalCanister(ExternalCanisterAction::Fund(_))),
        Severity::High,
        "Non-admin groups can fund external canisters from treasury",
        "Restrict ExternalCanister.Fund to Admin group only",
    ));

    checks
}

// ===== OPERATIONAL PERMISSIONS CHECKS =====

pub fn check_operational_permissions_impl(permissions: &Vec<Permission>) -> Vec<SecurityCheck> {
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

// ===== CONTROLLER MANIPULATION CHECKS =====

pub fn check_controller_manipulation_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<UserGroup>
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

// ===== EXTERNAL CANISTER CALL CHECKS =====

pub fn check_external_canister_calls_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<UserGroup>
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

// ===== SYSTEM RESTORE CHECKS =====

pub fn check_system_restore_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<UserGroup>
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