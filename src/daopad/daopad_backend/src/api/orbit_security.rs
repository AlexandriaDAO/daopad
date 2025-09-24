use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::time;
use serde::Serialize;

use crate::types::orbit::{
    ListUsersInput, ListUsersResult, UserDTO,
    ListUserGroupsInput, ListUserGroupsResult,
    ListPermissionsInput, ListPermissionsResult, Resource,
    ListRequestPoliciesInput, ListRequestPoliciesResult, RequestPolicyRule,
    RequestSpecifier,
    SystemInfoResult,
    PaginationInput,
};

const ADMIN_GROUP_ID: &str = "00000000-0000-4000-8000-000000000000";
const OPERATOR_GROUP_ID: &str = "00000000-0000-4000-8000-000000000001";

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
pub struct SecurityDashboard {
    pub station_id: Principal,
    pub overall_status: String, // "secure", "warnings", "critical", "error"
    pub last_checked: u64,
    pub checks: Vec<SecurityCheck>,
}

struct RuleAnalysis {
    has_bypass: bool,
    is_auto_approved: bool,
    bypass_reason: Option<String>,
}

impl Default for RuleAnalysis {
    fn default() -> Self {
        RuleAnalysis {
            has_bypass: false,
            is_auto_approved: false,
            bypass_reason: None,
        }
    }
}

// Main orchestrator function that runs all security checks
#[ic_cdk::update]
pub async fn perform_security_check(station_id: Principal) -> Result<SecurityDashboard, String> {
    let mut checks = Vec::new();

    // Run all security checks

    // 1. Admin control check
    match verify_admin_only_control(station_id).await {
        Ok(check) => checks.push(check),
        Err(e) => checks.push(SecurityCheck {
            category: "User Management".to_string(),
            name: "Admin Control".to_string(),
            status: CheckStatus::Error,
            message: format!("Failed to verify: {}", e),
            severity: Some(Severity::Critical),
            details: None,
            recommendation: Some("Check Orbit Station connectivity".to_string()),
        }),
    }

    // 2. Non-admin permissions check
    match verify_no_non_admin_permissions(station_id).await {
        Ok(check) => checks.push(check),
        Err(e) => checks.push(SecurityCheck {
            category: "Permissions".to_string(),
            name: "Group Permissions".to_string(),
            status: CheckStatus::Error,
            message: format!("Failed to verify: {}", e),
            severity: Some(Severity::High),
            details: None,
            recommendation: None,
        }),
    }

    // 3. Request policies check
    match verify_request_policies(station_id).await {
        Ok(check) => checks.push(check),
        Err(e) => checks.push(SecurityCheck {
            category: "Policies".to_string(),
            name: "Request Approval Policies".to_string(),
            status: CheckStatus::Error,
            message: format!("Failed to verify: {}", e),
            severity: Some(Severity::Critical),
            details: None,
            recommendation: None,
        }),
    }

    // 4. System settings check
    match verify_system_settings(station_id).await {
        Ok(check) => checks.push(check),
        Err(e) => checks.push(SecurityCheck {
            category: "Configuration".to_string(),
            name: "System Settings".to_string(),
            status: CheckStatus::Error,
            message: format!("Failed to verify: {}", e),
            severity: Some(Severity::Medium),
            details: None,
            recommendation: None,
        }),
    }

    // Determine overall status
    let has_critical = checks.iter().any(|c| matches!(c.status, CheckStatus::Fail) &&
        matches!(c.severity, Some(Severity::Critical)));
    let has_error = checks.iter().any(|c| matches!(c.status, CheckStatus::Error));
    let has_warning = checks.iter().any(|c| matches!(c.status, CheckStatus::Warn));

    let overall_status = if has_error {
        "error".to_string()
    } else if has_critical {
        "critical".to_string()
    } else if has_warning {
        "warnings".to_string()
    } else {
        "secure".to_string()
    };

    Ok(SecurityDashboard {
        station_id,
        overall_status,
        last_checked: time(),
        checks,
    })
}

// Check 1: Verify admin-only control
async fn verify_admin_only_control(station_id: Principal) -> Result<SecurityCheck, String> {
    let backend_principal = ic_cdk::id();

    // Call Orbit Station with exact types from spec.did
    let input = ListUsersInput {
        search_term: None,
        statuses: None,
        groups: None,
        paginate: None,
    };

    let result: (ListUsersResult,) = ic_cdk::call(
        station_id,
        "list_users",
        (input,)
    ).await.map_err(|e| format!("Failed to list users: {:?}", e))?;

    match result.0 {
        ListUsersResult::Ok { users, .. } => {
            // Filter for admin users
            let admin_users: Vec<&UserDTO> = users.iter()
                .filter(|u| u.groups.iter().any(|g| g.id == ADMIN_GROUP_ID))
                .collect();

            if admin_users.is_empty() {
                return Ok(SecurityCheck {
                    category: "User Management".to_string(),
                    name: "Admin Control".to_string(),
                    status: CheckStatus::Fail,
                    message: "No admin user found".to_string(),
                    severity: Some(Severity::Critical),
                    details: None,
                    recommendation: Some("Add DAOPad backend as admin".to_string()),
                });
            }

            // Check if only backend is admin
            let backend_is_admin = admin_users.iter()
                .any(|u| u.identities.contains(&backend_principal));

            if admin_users.len() == 1 && backend_is_admin {
                return Ok(SecurityCheck {
                    category: "User Management".to_string(),
                    name: "Admin Control".to_string(),
                    status: CheckStatus::Pass,
                    message: "Backend is sole admin".to_string(),
                    severity: Some(Severity::None),
                    details: None,
                    recommendation: None,
                });
            }

            // Multiple admins or backend not admin
            let admin_names: Vec<String> = admin_users.iter().map(|u| u.name.clone()).collect();

            Ok(SecurityCheck {
                category: "User Management".to_string(),
                name: "Admin Control".to_string(),
                status: CheckStatus::Fail,
                message: format!("Multiple admins found: {}", admin_users.len()),
                severity: Some(Severity::Critical),
                details: Some(format!("Admins: {:?}, Backend is admin: {}", admin_names, backend_is_admin)),
                recommendation: Some("Remove non-backend admin users for full DAO control".to_string()),
            })
        }
        ListUsersResult::Err(e) => {
            Err(format!("Orbit returned error: {:?}", e))
        }
    }
}

// Check 2: Verify no non-admin groups have dangerous permissions
async fn verify_no_non_admin_permissions(station_id: Principal) -> Result<SecurityCheck, String> {
    // Get all groups
    let groups_input = ListUserGroupsInput {
        search_term: None,
        paginate: None,
    };

    let groups_result: (ListUserGroupsResult,) = ic_cdk::call(
        station_id,
        "list_user_groups",
        (groups_input,)
    ).await.map_err(|e| format!("Failed to list groups: {:?}", e))?;

    // Get all permissions
    let perms_input = ListPermissionsInput {
        resources: None,
        paginate: None,
    };

    let perms_result: (ListPermissionsResult,) = ic_cdk::call(
        station_id,
        "list_permissions",
        (perms_input,)
    ).await.map_err(|e| format!("Failed to list permissions: {:?}", e))?;

    match (groups_result.0, perms_result.0) {
        (ListUserGroupsResult::Ok(groups_resp), ListPermissionsResult::Ok(perms_resp)) => {
            let mut violations = Vec::new();

            // Check write permissions for non-admin groups
            for perm in &perms_resp.permissions {
                if is_write_permission(&perm.resource) {
                    for group_id in &perm.allow.user_groups {
                        if group_id != ADMIN_GROUP_ID {
                            let group_name = groups_resp.user_groups.iter()
                                .find(|g| &g.id == group_id)
                                .map(|g| g.name.clone())
                                .unwrap_or_else(|| group_id.clone());

                            violations.push(format!("Group '{}' has write access to {:?}",
                                group_name, perm.resource));
                        }
                    }
                }
            }

            if violations.is_empty() {
                Ok(SecurityCheck {
                    category: "Permissions".to_string(),
                    name: "Group Permissions".to_string(),
                    status: CheckStatus::Pass,
                    message: "Non-admin groups have no dangerous permissions".to_string(),
                    severity: Some(Severity::None),
                    details: None,
                    recommendation: None,
                })
            } else {
                Ok(SecurityCheck {
                    category: "Permissions".to_string(),
                    name: "Group Permissions".to_string(),
                    status: CheckStatus::Fail,
                    message: format!("{} non-admin write permissions found", violations.len()),
                    severity: Some(Severity::High),
                    details: Some(violations.join("; ")),
                    recommendation: Some("Remove write permissions from non-admin groups".to_string()),
                })
            }
        }
        _ => Err("Failed to get groups or permissions".to_string())
    }
}

// Check 3: Verify request policies require admin approval
async fn verify_request_policies(station_id: Principal) -> Result<SecurityCheck, String> {
    let input = PaginationInput {
        limit: None,
        offset: None,
    };

    let result: (ListRequestPoliciesResult,) = ic_cdk::call(
        station_id,
        "list_request_policies",
        (input,)
    ).await.map_err(|e| format!("Failed to list policies: {:?}", e))?;

    match result.0 {
        ListRequestPoliciesResult::Ok { policies, .. } => {
            let mut issues = Vec::new();
            let mut warnings = Vec::new();

            for policy in &policies {
                let analysis = analyze_rule(&policy.rule, &policy.specifier);

                if analysis.has_bypass {
                    issues.push(format!("{:?}: {}",
                        policy.specifier,
                        analysis.bypass_reason.unwrap_or_else(|| "Unknown bypass".to_string())));
                }

                if analysis.is_auto_approved {
                    warnings.push(format!("{:?}: Auto-approved (OK for development)",
                        policy.specifier));
                }
            }

            if !issues.is_empty() {
                Ok(SecurityCheck {
                    category: "Policies".to_string(),
                    name: "Request Approval Policies".to_string(),
                    status: CheckStatus::Fail,
                    message: format!("Found {} policy bypasses", issues.len()),
                    severity: Some(Severity::Critical),
                    details: Some(issues.join("; ")),
                    recommendation: Some("Update policies to require admin approval".to_string()),
                })
            } else if !warnings.is_empty() {
                Ok(SecurityCheck {
                    category: "Policies".to_string(),
                    name: "Request Approval Policies".to_string(),
                    status: CheckStatus::Warn,
                    message: "Development auto-approvals in use".to_string(),
                    severity: Some(Severity::Low),
                    details: Some(warnings.join("; ")),
                    recommendation: Some("Consider requiring approvals for production".to_string()),
                })
            } else {
                Ok(SecurityCheck {
                    category: "Policies".to_string(),
                    name: "Request Approval Policies".to_string(),
                    status: CheckStatus::Pass,
                    message: "All policies require admin approval".to_string(),
                    severity: Some(Severity::None),
                    details: None,
                    recommendation: None,
                })
            }
        }
        ListRequestPoliciesResult::Err(e) => {
            Err(format!("Orbit returned error: {:?}", e))
        }
    }
}

// Check 4: Verify system settings
async fn verify_system_settings(station_id: Principal) -> Result<SecurityCheck, String> {
    let result: (SystemInfoResult,) = ic_cdk::call(
        station_id,
        "system_info",
        ()
    ).await.map_err(|e| format!("Failed to get system info: {:?}", e))?;

    match result.0 {
        SystemInfoResult::Ok { system, .. } => {
            let mut warnings = Vec::new();

            // Check disaster recovery
            if let Some(dr) = &system.disaster_recovery {
                if dr.committee.user_group_id != ADMIN_GROUP_ID || dr.committee.quorum != 1 {
                    warnings.push(format!("Disaster Recovery: Group {}, Quorum {}",
                        dr.user_group_name.as_ref().unwrap_or(&dr.committee.user_group_id),
                        dr.committee.quorum
                    ));
                }
            }

            if warnings.is_empty() {
                Ok(SecurityCheck {
                    category: "Configuration".to_string(),
                    name: "System Settings".to_string(),
                    status: CheckStatus::Pass,
                    message: "System settings secure".to_string(),
                    severity: Some(Severity::None),
                    details: None,
                    recommendation: None,
                })
            } else {
                Ok(SecurityCheck {
                    category: "Configuration".to_string(),
                    name: "System Settings".to_string(),
                    status: CheckStatus::Warn,
                    message: format!("{} system settings need review", warnings.len()),
                    severity: Some(Severity::Medium),
                    details: Some(warnings.join("; ")),
                    recommendation: Some("Review disaster recovery settings".to_string()),
                })
            }
        }
        SystemInfoResult::Err(e) => {
            Err(format!("Orbit returned error: {:?}", e))
        }
    }
}

// Helper function to check if a resource requires write permissions
fn is_write_permission(resource: &Resource) -> bool {
    match resource {
        Resource::Account(action) => match action {
            crate::types::orbit::ResourceAction::Create
            | crate::types::orbit::ResourceAction::Update(_)
            | crate::types::orbit::ResourceAction::Delete(_)
            | crate::types::orbit::ResourceAction::Transfer(_) => true,
            _ => false,
        },
        Resource::Permission(_) => true,
        Resource::UserGroup(_) => true,
        Resource::System(_) => true,
        Resource::User(action) => match action {
            crate::types::orbit::UserAction::Create
            | crate::types::orbit::UserAction::Update(_) => true,
            _ => false,
        },
        Resource::ExternalCanister(action) => match action {
            crate::types::orbit::ExternalCanisterAction::Create
            | crate::types::orbit::ExternalCanisterAction::Change(_)
            | crate::types::orbit::ExternalCanisterAction::Fund(_) => true,
            _ => false,
        },
        Resource::RequestPolicy(_) => true,
        _ => false,
    }
}

// Analyze a request policy rule for security issues
fn analyze_rule(
    rule: &RequestPolicyRule,
    _specifier: &RequestSpecifier,
) -> RuleAnalysis {
    match rule {
        RequestPolicyRule::AutoApproved => RuleAnalysis {
            has_bypass: false, // OK for development
            is_auto_approved: true,
            bypass_reason: None,
        },
        RequestPolicyRule::QuorumPercentage(quorum) => {
            analyze_quorum(&quorum.approvers)
        }
        RequestPolicyRule::Quorum(quorum) => {
            analyze_quorum(&quorum.approvers)
        }
        RequestPolicyRule::AllowListed => {
            RuleAnalysis {
                has_bypass: true,
                is_auto_approved: false,
                bypass_reason: Some("AllowListed bypasses admin approval".to_string()),
            }
        }
        RequestPolicyRule::AllowListedByMetadata(_) => {
            RuleAnalysis {
                has_bypass: true,
                is_auto_approved: false,
                bypass_reason: Some("AllowListed by metadata bypasses admin approval".to_string()),
            }
        }
        RequestPolicyRule::NamedRule(_) => {
            // Named rules would need to be resolved - for now mark as potential bypass
            RuleAnalysis {
                has_bypass: true,
                is_auto_approved: false,
                bypass_reason: Some("Named rule may contain bypass".to_string()),
            }
        }
        RequestPolicyRule::AnyOf(rules) => {
            // Any path that bypasses admin is a problem
            for subrule in rules {
                let sub_analysis = analyze_rule(subrule, _specifier);
                if sub_analysis.has_bypass || sub_analysis.is_auto_approved {
                    return RuleAnalysis {
                        has_bypass: true,
                        is_auto_approved: false,
                        bypass_reason: Some("AnyOf contains bypass path".to_string()),
                    };
                }
            }
            RuleAnalysis::default()
        }
        RequestPolicyRule::AllOf(rules) => {
            // All must pass, so check each
            for subrule in rules {
                let sub_analysis = analyze_rule(subrule, _specifier);
                if sub_analysis.has_bypass {
                    return sub_analysis;
                }
            }
            RuleAnalysis::default()
        }
        RequestPolicyRule::Not(subrule) => {
            // Invert the logic
            let sub_analysis = analyze_rule(subrule, _specifier);
            RuleAnalysis {
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

fn analyze_quorum(approvers: &crate::types::orbit::UserSpecifier) -> RuleAnalysis {
    match approvers {
        crate::types::orbit::UserSpecifier::Group(groups) => {
            if groups.iter().any(|g| g != ADMIN_GROUP_ID) {
                RuleAnalysis {
                    has_bypass: true,
                    is_auto_approved: false,
                    bypass_reason: Some("Non-admin group can approve".to_string()),
                }
            } else {
                RuleAnalysis::default()
            }
        }
        crate::types::orbit::UserSpecifier::Id(_user_ids) => {
            // User-specific approval bypasses admin group requirement
            RuleAnalysis {
                has_bypass: true,
                is_auto_approved: false,
                bypass_reason: Some("User-specific approval bypasses admin group".to_string()),
            }
        }
        crate::types::orbit::UserSpecifier::Any => {
            RuleAnalysis {
                has_bypass: true,
                is_auto_approved: false,
                bypass_reason: Some("Any user can approve".to_string()),
            }
        }
    }
}