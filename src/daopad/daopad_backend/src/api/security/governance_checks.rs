use super::security_utils::{
    SecurityCheck, CheckStatus, Severity, RelatedPermission,
    analyze_policy_rule, format_resource_for_reference,
};
use crate::types::orbit::{
    Permission, RequestPolicy, RequestPolicyRule,
    Resource, ResourceAction, UserAction, PermissionAction,
    UserGroup,
    ListPermissionsInput, ListPermissionsResult,
    PaginationInput, ListRequestPoliciesResult,
    ExternalCanisterAction,
};
use candid::Principal;

const ADMIN_GROUP_ID: &str = "00000000-0000-4000-8000-000000000000";

// ===== DATA STRUCTURES =====

pub struct PermissionsData {
    pub permissions: Vec<Permission>,
    pub user_groups: Vec<UserGroup>,
}

// ===== DATA FETCHING =====

pub async fn fetch_permissions(station_id: Principal) -> Result<PermissionsData, String> {
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

pub async fn fetch_policies(station_id: Principal) -> Result<Vec<RequestPolicy>, String> {
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

// ===== GOVERNANCE PERMISSION CHECKS =====

pub fn check_governance_permissions_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<UserGroup>
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

// ===== PROPOSAL POLICY CHECKS =====

pub fn check_proposal_policies_impl(policies: &Vec<RequestPolicy>) -> Vec<SecurityCheck> {
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

// ===== ADDRESSBOOK INJECTION CHECKS =====

pub fn check_addressbook_injection_impl(
    permissions: &Vec<Permission>,
    policies: &Vec<RequestPolicy>,
    user_groups: &Vec<UserGroup>
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

// ===== MONITORING CYCLE DRAIN CHECKS =====

pub fn check_monitoring_drain_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<UserGroup>
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

// ===== SNAPSHOT OPERATIONS CHECKS =====

pub fn check_snapshot_operations_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<UserGroup>
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

// ===== NAMED RULE BYPASS CHECKS =====

pub fn check_named_rule_bypass_impl(
    permissions: &Vec<Permission>,
    policies: &Vec<RequestPolicy>,
    user_groups: &Vec<UserGroup>
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

// ===== REMOVE OPERATIONS CHECKS =====

pub fn check_remove_operations_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<UserGroup>
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

// ===== HELPER FUNCTION =====

pub fn check_permission_by_resource<F>(
    permissions: &Vec<Permission>,
    user_groups: &Vec<UserGroup>,
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