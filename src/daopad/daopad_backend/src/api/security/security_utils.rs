use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::time;
use serde::Serialize;
use crate::types::orbit::{
    Resource, ResourceAction, ExternalCanisterAction, SystemAction, UserAction,
    PermissionAction, RequestPolicyRule, RequestSpecifier, UserSpecifier,
};

// ===== TYPE DEFINITIONS =====

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
pub struct RiskWeights {
    pub critical_admin_control: f64,
    pub critical_treasury: f64,
    pub critical_governance: f64,
    pub critical_controller_manipulation: f64,
    pub critical_external_calls: f64,
    pub critical_system_restore: f64,
    pub high_proposal_bypass: f64,
    pub high_addressbook_injection: f64,
    pub high_monitoring_drain: f64,
    pub medium_external_canisters: f64,
    pub medium_system_config: f64,
    pub medium_snapshot_ops: f64,
    pub medium_named_rules: f64,
    pub medium_remove_ops: f64,
    pub low_operational: f64,
}

impl Default for RiskWeights {
    fn default() -> Self {
        RiskWeights {
            critical_admin_control: 20.0,
            critical_treasury: 18.0,
            critical_governance: 12.0,
            critical_controller_manipulation: 15.0,
            critical_external_calls: 10.0,
            critical_system_restore: 10.0,
            high_proposal_bypass: 5.0,
            high_addressbook_injection: 3.0,
            high_monitoring_drain: 2.0,
            medium_external_canisters: 2.0,
            medium_system_config: 1.0,
            medium_snapshot_ops: 1.0,
            medium_named_rules: 1.0,
            medium_remove_ops: 1.0,
            low_operational: 0.5,
        }
    }
}

// ===== FORMATTING UTILITIES =====

pub fn format_resource_for_reference(resource: &Resource) -> String {
    match resource {
        Resource::ExternalCanister(action) => format_external_canister_action(action),
        Resource::System(action) => format_system_action(action),
        Resource::User(action) => format_user_action(action),
        Resource::Permission(action) => format_permission_action(action),
        Resource::Account(action) => format_resource_action(action),
        Resource::AddressBook(_) => "AddressBook".to_string(),
        Resource::Asset(_) => "Asset".to_string(),
        Resource::Notification(_) => "Notification".to_string(),
        Resource::Request(_) => "Request".to_string(),
        Resource::RequestPolicy(_) => "RequestPolicy".to_string(),
        Resource::NamedRule(_) => "NamedRule".to_string(),
        Resource::UserGroup(_) => "UserGroup".to_string(),
    }
}

pub fn format_resource_action(action: &ResourceAction) -> String {
    match action {
        ResourceAction::List => "List".to_string(),
        ResourceAction::Create => "Create".to_string(),
        ResourceAction::Update(_) => "Update(*)".to_string(),
        ResourceAction::Read(_) => "Read(*)".to_string(),
        ResourceAction::Delete(_) => "Delete(*)".to_string(),
        ResourceAction::Transfer(_) => "Transfer(*)".to_string(),
        ResourceAction::Remove(_) => "Remove(*)".to_string(),
    }
}

pub fn format_external_canister_action(action: &ExternalCanisterAction) -> String {
    match action {
        ExternalCanisterAction::Create => "ExternalCanister.Create".to_string(),
        ExternalCanisterAction::Change(_) => "ExternalCanister.Change(*)".to_string(),
        ExternalCanisterAction::Configure(_) => "ExternalCanister.Configure(*)".to_string(),
        ExternalCanisterAction::Fund(_) => "ExternalCanister.Fund(*)".to_string(),
        ExternalCanisterAction::Call(_) => "ExternalCanister.Call(*)".to_string(),
        ExternalCanisterAction::Monitor(_) => "ExternalCanister.Monitor(*)".to_string(),
        ExternalCanisterAction::Snapshot(_) => "ExternalCanister.Snapshot(*)".to_string(),
        ExternalCanisterAction::Read(_) => "ExternalCanister.Read(*)".to_string(),
        ExternalCanisterAction::List => "ExternalCanister.List".to_string(),
    }
}

pub fn format_system_action(action: &SystemAction) -> String {
    match action {
        SystemAction::ManageSystemInfo => "System.ManageSystemInfo".to_string(),
        SystemAction::Upgrade => "System.Upgrade".to_string(),
        SystemAction::Restore => "System.Restore".to_string(),
        SystemAction::Capabilities => "System.Capabilities".to_string(),
        SystemAction::SystemInfo => "System.SystemInfo".to_string(),
    }
}

pub fn format_user_action(action: &UserAction) -> String {
    match action {
        UserAction::Create => "User.Create".to_string(),
        UserAction::List => "User.List".to_string(),
        UserAction::Read(_) => "User.Read(*)".to_string(),
        UserAction::Update(_) => "User.Update(*)".to_string(),
    }
}

pub fn format_permission_action(action: &PermissionAction) -> String {
    match action {
        PermissionAction::Read => "Permission.Read".to_string(),
        PermissionAction::Update => "Permission.Update".to_string(),
    }
}

pub fn format_request_specifier(spec: &RequestSpecifier) -> String {
    match spec {
        RequestSpecifier::AddUser => "AddUser".to_string(),
        RequestSpecifier::EditUser(_) => "EditUser".to_string(),
        RequestSpecifier::RemoveUser => "RemoveUser".to_string(),
        RequestSpecifier::Transfer(_) => "Transfer".to_string(),
        RequestSpecifier::AddAccount => "AddAccount".to_string(),
        RequestSpecifier::EditAccount(_) => "EditAccount".to_string(),
        RequestSpecifier::RemoveAccount => "RemoveAccount".to_string(),
        RequestSpecifier::AddAsset => "AddAsset".to_string(),
        RequestSpecifier::EditAsset(_) => "EditAsset".to_string(),
        RequestSpecifier::RemoveAsset(_) => "RemoveAsset".to_string(),
        RequestSpecifier::ChangeCanister => "ChangeCanister".to_string(),
        RequestSpecifier::SetDisasterRecovery => "SetDisasterRecovery".to_string(),
        RequestSpecifier::ChangeExternalCanister(_) => "ChangeExternalCanister".to_string(),
        RequestSpecifier::CreateExternalCanister => "CreateExternalCanister".to_string(),
        RequestSpecifier::CallExternalCanister(_) => "CallExternalCanister".to_string(),
        RequestSpecifier::EditPermission(_) => "EditPermission".to_string(),
        RequestSpecifier::EditRequestPolicy(_) => "EditRequestPolicy".to_string(),
        RequestSpecifier::RemoveRequestPolicy(_) => "RemoveRequestPolicy".to_string(),
        RequestSpecifier::ManageSystemInfo => "ManageSystemInfo".to_string(),
        RequestSpecifier::AddUserGroup => "AddUserGroup".to_string(),
        RequestSpecifier::RemoveUserGroup(_) => "RemoveUserGroup".to_string(),
        RequestSpecifier::AddNamedRule => "AddNamedRule".to_string(),
        RequestSpecifier::EditNamedRule(_) => "EditNamedRule".to_string(),
        RequestSpecifier::RemoveNamedRule(_) => "RemoveNamedRule".to_string(),
        RequestSpecifier::EditAddressBookEntry(_) => "EditAddressBookEntry".to_string(),
        RequestSpecifier::RemoveAddressBookEntry(_) => "RemoveAddressBookEntry".to_string(),
        RequestSpecifier::FundExternalCanister(_) => "FundExternalCanister".to_string(),
        RequestSpecifier::SystemUpgrade => "SystemUpgrade".to_string(),
        RequestSpecifier::AddRequestPolicy => "AddRequestPolicy".to_string(),
        RequestSpecifier::EditUserGroup(_) => "EditUserGroup".to_string(),
        RequestSpecifier::AddAddressBookEntry => "AddAddressBookEntry".to_string(),
    }
}

// ===== POLICY ANALYSIS =====

pub struct PolicyAnalysis {
    pub has_bypass: bool,
    pub is_auto_approved: bool,
    pub bypass_reason: Option<String>,
}

pub fn analyze_policy_rule(rule: &RequestPolicyRule) -> PolicyAnalysis {
    match rule {
        RequestPolicyRule::AutoApproved => PolicyAnalysis {
            has_bypass: true,
            is_auto_approved: true,
            bypass_reason: Some("Auto-approved request".to_string()),
        },
        RequestPolicyRule::QuorumPercentage(quorum) =>
            analyze_quorum_percentage(quorum.min_approved, &quorum.approvers),
        RequestPolicyRule::Quorum(quorum) =>
            analyze_quorum(quorum.min_approved, &quorum.approvers),
        RequestPolicyRule::AllowListed => PolicyAnalysis {
            has_bypass: false,
            is_auto_approved: false,
            bypass_reason: None,
        },
        RequestPolicyRule::AllOf(rules) | RequestPolicyRule::AnyOf(rules) => {
            let mut has_bypass = false;
            let mut is_auto = false;
            let mut reasons = Vec::new();

            for rule in rules {
                let analysis = analyze_policy_rule(rule);
                if analysis.has_bypass {
                    has_bypass = true;
                    if let Some(reason) = analysis.bypass_reason {
                        reasons.push(reason);
                    }
                }
                if analysis.is_auto_approved {
                    is_auto = true;
                }
            }

            PolicyAnalysis {
                has_bypass,
                is_auto_approved: is_auto,
                bypass_reason: if reasons.is_empty() { None } else { Some(reasons.join("; ")) },
            }
        }
        _ => PolicyAnalysis {
            has_bypass: false,
            is_auto_approved: false,
            bypass_reason: None,
        }
    }
}

fn analyze_quorum_percentage(min_approved: u16, approvers: &UserSpecifier) -> PolicyAnalysis {
    const ADMIN_GROUP_ID: &str = "00000000-0000-4000-8000-000000000000";

    if min_approved == 0 {
        PolicyAnalysis {
            has_bypass: true,
            is_auto_approved: true,
            bypass_reason: Some("0% approval threshold equals auto-approval".to_string()),
        }
    } else {
        match approvers {
            UserSpecifier::Group(groups) => {
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
            UserSpecifier::Id(_) => PolicyAnalysis {
                has_bypass: true,
                is_auto_approved: false,
                bypass_reason: Some("User-specific approval bypasses admin group".to_string()),
            },
            UserSpecifier::Any => PolicyAnalysis {
                has_bypass: true,
                is_auto_approved: false,
                bypass_reason: Some("Any user can approve".to_string()),
            },
        }
    }
}

fn analyze_quorum(min_approved: u16, approvers: &UserSpecifier) -> PolicyAnalysis {
    const ADMIN_GROUP_ID: &str = "00000000-0000-4000-8000-000000000000";

    if min_approved == 0 {
        PolicyAnalysis {
            has_bypass: true,
            is_auto_approved: true,
            bypass_reason: Some("0 approval threshold equals auto-approval".to_string()),
        }
    } else {
        match approvers {
            UserSpecifier::Group(groups) => {
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
            UserSpecifier::Id(_) => PolicyAnalysis {
                has_bypass: true,
                is_auto_approved: false,
                bypass_reason: Some("User-specific approval bypasses admin group".to_string()),
            },
            UserSpecifier::Any => PolicyAnalysis {
                has_bypass: true,
                is_auto_approved: false,
                bypass_reason: Some("Any user can approve".to_string()),
            },
        }
    }
}

// ===== HELPER FUNCTIONS =====

pub fn create_error_check(name: &str, category: &str, severity: Severity, error: &str) -> SecurityCheck {
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

pub fn calculate_risk_score(checks: &Vec<SecurityCheck>) -> (u8, String, Vec<SecurityCheck>, Vec<String>) {
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

pub fn build_dashboard(station_id: Principal, checks: Vec<SecurityCheck>) -> Result<EnhancedSecurityDashboard, String> {
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