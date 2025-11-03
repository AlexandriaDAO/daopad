use candid::Principal;
use ic_cdk;

// Import all submodules from parent directory
use super::security::{
    admin_checks, governance_checks, treasury_checks, system_checks, security_utils,
    SecurityCheck, EnhancedSecurityDashboard, create_error_check, Severity,
    build_dashboard,
};

// ===== API ENDPOINTS =====

/// Check admin control layer: admin count, backend admin status, operator group size
#[ic_cdk::update]
pub async fn check_admin_control(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let backend_principal = ic_cdk::id();
    admin_checks::check_admin_control(station_id, backend_principal).await
}

/// Check treasury control: account transfers, asset management, treasury permissions
#[ic_cdk::update]
pub async fn check_treasury_control(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = governance_checks::fetch_permissions(station_id).await?;
    Ok(treasury_checks::check_treasury_control_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check governance permissions: who can change permissions, policies, users, groups
#[ic_cdk::update]
pub async fn check_governance_permissions(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = governance_checks::fetch_permissions(station_id).await?;
    Ok(governance_checks::check_governance_permissions_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check proposal policies: auto-approvals, bypasses, quorum settings
#[ic_cdk::update]
pub async fn check_proposal_policies(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let policies_data = governance_checks::fetch_policies(station_id).await?;
    Ok(governance_checks::check_proposal_policies_impl(&policies_data))
}

/// Check external canister control: create, change, fund permissions
#[ic_cdk::update]
pub async fn check_external_canisters(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = governance_checks::fetch_permissions(station_id).await?;
    Ok(system_checks::check_external_canister_control_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check asset management: asset create/update/delete permissions
#[ic_cdk::update]
pub async fn check_asset_management(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = governance_checks::fetch_permissions(station_id).await?;
    Ok(treasury_checks::check_asset_management_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check system configuration: upgrade access, disaster recovery, system info management
#[ic_cdk::update]
pub async fn check_system_configuration(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let system_data = system_checks::fetch_system_info(station_id).await?;
    let perms_data = governance_checks::fetch_permissions(station_id).await?;
    Ok(system_checks::check_system_configuration_impl(&system_data, &perms_data.permissions, &perms_data.user_groups))
}

/// Check operational permissions: request visibility, notifications, etc.
#[ic_cdk::update]
pub async fn check_operational_permissions(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = governance_checks::fetch_permissions(station_id).await?;
    Ok(system_checks::check_operational_permissions_impl(&perms_data.permissions))
}

/// Check controller manipulation: NativeSettings controller changes
#[ic_cdk::update]
pub async fn check_controller_manipulation(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = governance_checks::fetch_permissions(station_id).await?;
    Ok(system_checks::check_controller_manipulation_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check external canister call permissions
#[ic_cdk::update]
pub async fn check_external_canister_calls(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = governance_checks::fetch_permissions(station_id).await?;
    Ok(system_checks::check_external_canister_calls_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check system restore permissions
#[ic_cdk::update]
pub async fn check_system_restore(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = governance_checks::fetch_permissions(station_id).await?;
    Ok(system_checks::check_system_restore_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check addressbook injection with allowlisted policies
#[ic_cdk::update]
pub async fn check_addressbook_injection(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = governance_checks::fetch_permissions(station_id).await?;
    let policies_data = governance_checks::fetch_policies(station_id).await?;
    Ok(governance_checks::check_addressbook_injection_impl(&perms_data.permissions, &policies_data, &perms_data.user_groups))
}

/// Check monitoring cycle drain
#[ic_cdk::update]
pub async fn check_monitoring_drain(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = governance_checks::fetch_permissions(station_id).await?;
    Ok(governance_checks::check_monitoring_drain_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check snapshot operations
#[ic_cdk::update]
pub async fn check_snapshot_operations(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = governance_checks::fetch_permissions(station_id).await?;
    Ok(governance_checks::check_snapshot_operations_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check named rule bypass
#[ic_cdk::update]
pub async fn check_named_rule_bypass(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = governance_checks::fetch_permissions(station_id).await?;
    let policies_data = governance_checks::fetch_policies(station_id).await?;
    Ok(governance_checks::check_named_rule_bypass_impl(&perms_data.permissions, &policies_data, &perms_data.user_groups))
}

/// Check remove operations
#[ic_cdk::update]
pub async fn check_remove_operations(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = governance_checks::fetch_permissions(station_id).await?;
    Ok(governance_checks::check_remove_operations_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check if treasury accounts have AutoApproved transfer policies
#[ic_cdk::update]
pub async fn check_account_autoapproved_status(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    treasury_checks::check_account_autoapproved_status(station_id).await
}

/// Comprehensive check: runs all individual security checks and returns a combined result
#[ic_cdk::update]
pub async fn perform_all_security_checks(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    // Call all 17 individual checks sequentially
    let mut all_checks = Vec::new();

    // Existing 8 checks
    match check_admin_control(station_id).await {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Admin Control", "Admin Control", Severity::Critical, e
        )),
    }

    match check_treasury_control(station_id).await {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Treasury Control", "Treasury Control", Severity::Critical, e
        )),
    }

    match check_governance_permissions(station_id).await {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Governance Control", "Governance Control", Severity::Critical, e
        )),
    }

    match check_proposal_policies(station_id).await {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Request Policies", "Request Policies", Severity::High, e
        )),
    }

    match check_external_canisters(station_id).await {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "External Canister Control", "External Canister Control", Severity::Medium, e
        )),
    }

    match check_asset_management(station_id).await {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Asset Management", "Asset Management", Severity::Medium, e
        )),
    }

    match check_system_configuration(station_id).await {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "System Configuration", "System Configuration", Severity::High, e
        )),
    }

    match check_operational_permissions(station_id).await {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Operational Access", "Operational Access", Severity::Low, e
        )),
    }

    // Additional 9 bypass detection checks
    match check_controller_manipulation(station_id).await {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Controller Manipulation", "Controller Manipulation", Severity::Critical, e
        )),
    }

    match check_external_canister_calls(station_id).await {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "External Canister Calls", "External Canister Calls", Severity::Critical, e
        )),
    }

    match check_system_restore(station_id).await {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "System Restore", "System Restore", Severity::Critical, e
        )),
    }

    match check_addressbook_injection(station_id).await {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "AddressBook Injection", "AddressBook Injection", Severity::High, e
        )),
    }

    match check_monitoring_drain(station_id).await {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Monitoring Cycle Drain", "Monitoring Cycle Drain", Severity::High, e
        )),
    }

    match check_snapshot_operations(station_id).await {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Snapshot Operations", "Snapshot Operations", Severity::Medium, e
        )),
    }

    match check_named_rule_bypass(station_id).await {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Named Rule Bypass", "Named Rule Bypass", Severity::Medium, e
        )),
    }

    match check_remove_operations(station_id).await {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Remove Operations", "Remove Operations", Severity::Medium, e
        )),
    }

    match check_account_autoapproved_status(station_id).await {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Treasury Setup", "Account AutoApproved Status", Severity::Critical, e
        )),
    }

    Ok(all_checks)
}

/// Perform comprehensive security analysis and return dashboard with score
/// This is the main public-facing endpoint that frontend calls.
#[ic_cdk::update]
pub async fn perform_security_check(station_id: Principal) -> Result<EnhancedSecurityDashboard, String> {
    // Execute all security checks
    let checks = perform_all_security_checks(station_id).await?;

    // Build dashboard with scoring and analysis
    build_dashboard(station_id, checks)
}

// ===== REQUEST POLICIES DETAILS ENDPOINT =====

use crate::types::orbit::{
    PaginationInput, ListRequestPoliciesResult,
    RequestPoliciesDetails, RequestPolicyInfo,
};

/// Get detailed request policies information with resolved rule names
#[ic_cdk::update]
pub async fn get_request_policies_details(
    station_id: Principal
) -> Result<RequestPoliciesDetails, String> {
    let input: PaginationInput = PaginationInput {
        limit: None,
        offset: None,
    };

    let result: (ListRequestPoliciesResult,) = ic_cdk::call(station_id, "list_request_policies", (input,))
        .await
        .map_err(|e| format!("Failed to list policies: {:?}", e))?;

    match result.0 {
        ListRequestPoliciesResult::Ok { policies, .. } => {
            // Convert to simplified format and count types
            let mut auto_approved_count = 0;
            let mut bypass_count = 0;

            let policy_infos: Vec<RequestPolicyInfo> = policies.into_iter()
                .map(|p| {
                    let analysis = security_utils::analyze_policy_rule(&p.rule);
                    if analysis.is_auto_approved {
                        auto_approved_count += 1;
                    }
                    if analysis.has_bypass {
                        bypass_count += 1;
                    }

                    RequestPolicyInfo {
                        operation: security_utils::format_request_specifier(&p.specifier),
                        approval_rule: format!("{:?}", p.rule),
                        specifier: p.specifier,
                        rule: p.rule,
                    }
                })
                .collect();

            Ok(RequestPoliciesDetails {
                policies: policy_infos.clone(),
                total_count: policy_infos.len(),
                auto_approved_count,
                bypass_count,
            })
        }
        ListRequestPoliciesResult::Err(e) => Err(format!("Orbit error: {}", e)),
    }
}