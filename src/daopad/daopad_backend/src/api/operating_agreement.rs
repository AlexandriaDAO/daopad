use candid::{CandidType, Deserialize, Principal};
use ic_cdk::update;
use serde::Serialize;

use crate::storage::state::TOKEN_ORBIT_STATIONS;
use crate::types::StorablePrincipal;
use crate::types::orbit::{
    ListUsersInput, ListUsersResult, UserDTO,
    ListUserGroupsInput, ListUserGroupsResult, UserGroup,
    ListRequestPoliciesResult, RequestPolicy,
    ListAccountsInput, ListAccountsResult, Account,
    ListExternalCanistersResult, ExternalCanister,
};
use crate::proposals::types::OrbitRequestType;
use crate::api::orbit_security::EnhancedSecurityDashboard;

/// Complete operating agreement data aggregated from Orbit Station
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct OperatingAgreementData {
    // Metadata
    pub generated_at: u64,
    pub station_id: String,
    pub token_symbol: String,
    pub daopad_version: String,

    // Organization Info
    pub llc_name: Option<String>,
    pub jurisdiction: Option<String>,

    // Members & Control
    pub users: Vec<UserWithRoles>,
    pub user_groups: Vec<UserGroupDetail>,
    pub admins: Vec<MemberIdentity>,
    pub total_members: u32,

    // Governance Rules
    pub request_policies: Vec<RequestPolicyDetail>,
    pub voting_thresholds: Vec<OperationThreshold>,

    // Security Posture
    pub security_score: u8,
    pub security_status: String,
    pub critical_issues: Vec<String>,
    pub is_truly_decentralized: bool,

    // Treasury Configuration
    pub accounts: Vec<AccountSummary>,
    pub total_asset_types: u32,
    pub external_canisters: Vec<CanisterSummary>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct UserWithRoles {
    pub id: String,
    pub name: String,
    pub identities: Vec<String>,
    pub groups: Vec<String>,
    pub status: String,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct UserGroupDetail {
    pub id: String,
    pub name: String,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct MemberIdentity {
    pub name: String,
    pub identities: Vec<String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct RequestPolicyDetail {
    pub operation: String,
    pub description: String,
    pub approval_rule: String,
    pub risk_level: String,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct OperationThreshold {
    pub operation: String,
    pub threshold_percentage: u8,
    pub voting_duration_hours: u64,
    pub rationale: String,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct AccountSummary {
    pub name: String,
    pub id: String,
    pub blockchain: String,
    pub standard: String,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct CanisterSummary {
    pub name: String,
    pub canister_id: String,
}

/// Main endpoint: Get all data needed for operating agreement
#[update]
pub async fn get_operating_agreement_data(
    token_canister_id: Principal,
) -> Result<OperatingAgreementData, String> {
    // 1. Get station ID from token mapping
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or_else(|| "No Orbit Station linked to this token".to_string())
    })?;

    // 2. Query Orbit Station for all required data
    // Note: All calls must be in separate awaits (can't use tokio::join! in IC)

    // Get users
    let users_result = list_users_for_agreement(station_id).await?;

    // Get user groups
    let groups_result = list_user_groups(station_id).await?;

    // Get request policies
    let policies_result = list_request_policies(station_id).await?;

    // Get security data
    let security_result = get_security_data(token_canister_id).await?;

    // Get accounts
    let accounts_result = list_accounts(station_id).await?;

    // Get external canisters
    let canisters_result = list_external_canisters(station_id).await?;

    // 3. Process users and identify admins
    const ADMIN_GROUP_ID: &str = "00000000-0000-4000-8000-000000000000";

    let users_with_roles: Vec<UserWithRoles> = users_result
        .iter()
        .map(|u| UserWithRoles {
            id: u.id.clone(),
            name: u.name.clone(),
            identities: u.identities.iter().map(|p| p.to_text()).collect(),
            groups: u.groups.iter().map(|g| g.name.clone()).collect(),
            status: format!("{:?}", u.status),
        })
        .collect();

    let admins: Vec<MemberIdentity> = users_result
        .iter()
        .filter(|u| u.groups.iter().any(|g| g.id == ADMIN_GROUP_ID))
        .map(|u| MemberIdentity {
            name: u.name.clone(),
            identities: u.identities.iter().map(|p| p.to_text()).collect(),
        })
        .collect();

    // 4. Format user groups
    let user_groups: Vec<UserGroupDetail> = groups_result
        .iter()
        .map(|g| UserGroupDetail {
            id: g.id.clone(),
            name: g.name.clone(),
        })
        .collect();

    // 5. Build operation thresholds (all 33 operations)
    let voting_thresholds = build_operation_thresholds();

    // 6. Format request policies
    let request_policies = format_request_policies(policies_result);

    // 7. Summarize accounts
    // Summarize accounts (Account doesn't have blockchain/standard fields directly)
    let accounts: Vec<AccountSummary> = accounts_result
        .iter()
        .map(|a| AccountSummary {
            name: a.name.clone(),
            id: a.id.clone(),
            blockchain: "ICP".to_string(), // Default - can be derived from addresses if needed
            standard: "Native".to_string(), // Default - can be derived from assets if needed
        })
        .collect();

    // 8. Summarize external canisters
    let external_canisters: Vec<CanisterSummary> = canisters_result
        .iter()
        .map(|c| CanisterSummary {
            name: c.name.clone(),
            canister_id: c.canister_id.to_text(),
        })
        .collect();

    // 9. Check if truly decentralized (backend-only admin)
    let backend_principal = ic_cdk::id();
    let is_truly_decentralized = admins.len() == 1
        && admins[0].identities.len() == 1
        && admins[0].identities[0] == backend_principal.to_text();

    // 10. Assemble complete data
    Ok(OperatingAgreementData {
        generated_at: ic_cdk::api::time(),
        station_id: station_id.to_text(),
        token_symbol: "TOKEN".to_string(), // Will be passed from frontend
        daopad_version: env!("CARGO_PKG_VERSION").to_string(),

        llc_name: None, // Can be customized
        jurisdiction: Some("Wyoming".to_string()),

        users: users_with_roles,
        user_groups,
        admins,
        total_members: users_result.len() as u32,

        request_policies,
        voting_thresholds,

        security_score: security_result.decentralization_score,
        security_status: security_result.overall_status,
        critical_issues: security_result
            .critical_issues
            .iter()
            .map(|c| c.message.clone())
            .collect(),
        is_truly_decentralized,

        accounts,
        total_asset_types: accounts_result.len() as u32,
        external_canisters,
    })
}

/// Helper: List users from Orbit Station
async fn list_users_for_agreement(station_id: Principal) -> Result<Vec<UserDTO>, String> {
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
        ListUsersResult::Err(e) => Err(format!("Orbit error listing users: {}", e)),
    }
}

/// Helper: List user groups from Orbit Station
async fn list_user_groups(station_id: Principal) -> Result<Vec<UserGroup>, String> {
    let input = ListUserGroupsInput {
        search_term: None,
        paginate: None,
    };

    let result: (ListUserGroupsResult,) = ic_cdk::call(station_id, "list_user_groups", (input,))
        .await
        .map_err(|e| format!("Failed to list user groups: {:?}", e))?;

    match result.0 {
        ListUserGroupsResult::Ok(response) => Ok(response.user_groups),
        ListUserGroupsResult::Err(e) => Err(format!("Orbit error listing groups: {}", e)),
    }
}

/// Helper: List request policies from Orbit Station
async fn list_request_policies(station_id: Principal) -> Result<Vec<RequestPolicy>, String> {
    let result: (ListRequestPoliciesResult,) = ic_cdk::call(station_id, "list_request_policies", ())
        .await
        .map_err(|e| format!("Failed to list policies: {:?}", e))?;

    match result.0 {
        ListRequestPoliciesResult::Ok { policies, .. } => Ok(policies),
        ListRequestPoliciesResult::Err(e) => Err(format!("Orbit error listing policies: {}", e)),
    }
}

/// Helper: Get security dashboard data
async fn get_security_data(
    token_canister_id: Principal,
) -> Result<EnhancedSecurityDashboard, String> {
    // Get station ID first
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or_else(|| "No Orbit Station linked".to_string())
    })?;

    // Call our own security check endpoint
    crate::api::orbit_security::perform_security_check(station_id).await
}

/// Helper: List treasury accounts from Orbit Station
async fn list_accounts(station_id: Principal) -> Result<Vec<Account>, String> {
    let input = ListAccountsInput {
        search_term: None,
        paginate: None,
    };

    let result: (ListAccountsResult,) = ic_cdk::call(station_id, "list_accounts", (input,))
        .await
        .map_err(|e| format!("Failed to list accounts: {:?}", e))?;

    match result.0 {
        ListAccountsResult::Ok { accounts, .. } => Ok(accounts),
        ListAccountsResult::Err(e) => Err(format!("Orbit error listing accounts: {}", e)),
    }
}

/// Helper: List external canisters from Orbit Station
async fn list_external_canisters(
    station_id: Principal,
) -> Result<Vec<ExternalCanister>, String> {
    let result: (ListExternalCanistersResult,) =
        ic_cdk::call(station_id, "list_external_canisters", ())
            .await
            .map_err(|e| format!("Failed to list canisters: {:?}", e))?;

    match result.0 {
        ListExternalCanistersResult::Ok { canisters, .. } => Ok(canisters),
        ListExternalCanistersResult::Err(e) => Err(format!("Orbit error listing canisters: {}", e)),
    }
}

/// Helper: Build all 33 operation thresholds
fn build_operation_thresholds() -> Vec<OperationThreshold> {
    vec![
        // System Operations (90%)
        OperationThreshold {
            operation: "System Upgrade".to_string(),
            threshold_percentage: OrbitRequestType::SystemUpgrade.voting_threshold(),
            voting_duration_hours: OrbitRequestType::SystemUpgrade.voting_duration_hours(),
            rationale: "Critical operation requiring supermajority consensus".to_string(),
        },
        OperationThreshold {
            operation: "System Restore".to_string(),
            threshold_percentage: OrbitRequestType::SystemRestore.voting_threshold(),
            voting_duration_hours: OrbitRequestType::SystemRestore.voting_duration_hours(),
            rationale: "Emergency recovery requiring supermajority approval".to_string(),
        },
        OperationThreshold {
            operation: "Set Disaster Recovery".to_string(),
            threshold_percentage: OrbitRequestType::SetDisasterRecovery.voting_threshold(),
            voting_duration_hours: OrbitRequestType::SetDisasterRecovery.voting_duration_hours(),
            rationale: "Critical security configuration requiring supermajority".to_string(),
        },
        OperationThreshold {
            operation: "Manage System Info".to_string(),
            threshold_percentage: OrbitRequestType::ManageSystemInfo.voting_threshold(),
            voting_duration_hours: OrbitRequestType::ManageSystemInfo.voting_duration_hours(),
            rationale: "System-level changes requiring high approval".to_string(),
        },
        // Treasury Operations (75%)
        OperationThreshold {
            operation: "Transfer".to_string(),
            threshold_percentage: OrbitRequestType::Transfer.voting_threshold(),
            voting_duration_hours: OrbitRequestType::Transfer.voting_duration_hours(),
            rationale: "High-risk financial operation requiring strong majority".to_string(),
        },
        OperationThreshold {
            operation: "Add Account".to_string(),
            threshold_percentage: OrbitRequestType::AddAccount.voting_threshold(),
            voting_duration_hours: OrbitRequestType::AddAccount.voting_duration_hours(),
            rationale: "Treasury expansion requiring strong approval".to_string(),
        },
        OperationThreshold {
            operation: "Edit Account".to_string(),
            threshold_percentage: OrbitRequestType::EditAccount.voting_threshold(),
            voting_duration_hours: OrbitRequestType::EditAccount.voting_duration_hours(),
            rationale: "Account modification requiring high threshold".to_string(),
        },
        // Governance (70%)
        OperationThreshold {
            operation: "Edit Permission".to_string(),
            threshold_percentage: OrbitRequestType::EditPermission.voting_threshold(),
            voting_duration_hours: OrbitRequestType::EditPermission.voting_duration_hours(),
            rationale: "Governance changes affecting access control".to_string(),
        },
        OperationThreshold {
            operation: "Add Request Policy".to_string(),
            threshold_percentage: OrbitRequestType::AddRequestPolicy.voting_threshold(),
            voting_duration_hours: OrbitRequestType::AddRequestPolicy.voting_duration_hours(),
            rationale: "New governance rules require high consensus".to_string(),
        },
        OperationThreshold {
            operation: "Edit Request Policy".to_string(),
            threshold_percentage: OrbitRequestType::EditRequestPolicy.voting_threshold(),
            voting_duration_hours: OrbitRequestType::EditRequestPolicy.voting_duration_hours(),
            rationale: "Modifying approval rules affects governance".to_string(),
        },
        OperationThreshold {
            operation: "Remove Request Policy".to_string(),
            threshold_percentage: OrbitRequestType::RemoveRequestPolicy.voting_threshold(),
            voting_duration_hours: OrbitRequestType::RemoveRequestPolicy.voting_duration_hours(),
            rationale: "Removing safeguards requires approval".to_string(),
        },
        // Canister Management (60%)
        OperationThreshold {
            operation: "Create External Canister".to_string(),
            threshold_percentage: OrbitRequestType::CreateExternalCanister.voting_threshold(),
            voting_duration_hours: OrbitRequestType::CreateExternalCanister.voting_duration_hours(),
            rationale: "Deploying new infrastructure".to_string(),
        },
        OperationThreshold {
            operation: "Configure External Canister".to_string(),
            threshold_percentage: OrbitRequestType::ConfigureExternalCanister.voting_threshold(),
            voting_duration_hours: OrbitRequestType::ConfigureExternalCanister.voting_duration_hours(),
            rationale: "Canister configuration changes".to_string(),
        },
        OperationThreshold {
            operation: "Change External Canister".to_string(),
            threshold_percentage: OrbitRequestType::ChangeExternalCanister.voting_threshold(),
            voting_duration_hours: OrbitRequestType::ChangeExternalCanister.voting_duration_hours(),
            rationale: "Modifying canister settings".to_string(),
        },
        OperationThreshold {
            operation: "Call External Canister".to_string(),
            threshold_percentage: OrbitRequestType::CallExternalCanister.voting_threshold(),
            voting_duration_hours: OrbitRequestType::CallExternalCanister.voting_duration_hours(),
            rationale: "Executing canister methods".to_string(),
        },
        OperationThreshold {
            operation: "Fund External Canister".to_string(),
            threshold_percentage: OrbitRequestType::FundExternalCanister.voting_threshold(),
            voting_duration_hours: OrbitRequestType::FundExternalCanister.voting_duration_hours(),
            rationale: "Transferring cycles to canisters".to_string(),
        },
        OperationThreshold {
            operation: "Monitor External Canister".to_string(),
            threshold_percentage: OrbitRequestType::MonitorExternalCanister.voting_threshold(),
            voting_duration_hours: OrbitRequestType::MonitorExternalCanister.voting_duration_hours(),
            rationale: "Setting up canister monitoring".to_string(),
        },
        OperationThreshold {
            operation: "Snapshot External Canister".to_string(),
            threshold_percentage: OrbitRequestType::SnapshotExternalCanister.voting_threshold(),
            voting_duration_hours: OrbitRequestType::SnapshotExternalCanister.voting_duration_hours(),
            rationale: "Creating canister backups".to_string(),
        },
        OperationThreshold {
            operation: "Restore External Canister".to_string(),
            threshold_percentage: OrbitRequestType::RestoreExternalCanister.voting_threshold(),
            voting_duration_hours: OrbitRequestType::RestoreExternalCanister.voting_duration_hours(),
            rationale: "Restoring from snapshots".to_string(),
        },
        OperationThreshold {
            operation: "Prune External Canister".to_string(),
            threshold_percentage: OrbitRequestType::PruneExternalCanister.voting_threshold(),
            voting_duration_hours: OrbitRequestType::PruneExternalCanister.voting_duration_hours(),
            rationale: "Removing old canister data".to_string(),
        },
        // User Management (50%)
        OperationThreshold {
            operation: "Add User".to_string(),
            threshold_percentage: OrbitRequestType::AddUser.voting_threshold(),
            voting_duration_hours: OrbitRequestType::AddUser.voting_duration_hours(),
            rationale: "Adding new members to the DAO".to_string(),
        },
        OperationThreshold {
            operation: "Edit User".to_string(),
            threshold_percentage: OrbitRequestType::EditUser.voting_threshold(),
            voting_duration_hours: OrbitRequestType::EditUser.voting_duration_hours(),
            rationale: "Modifying user roles and permissions".to_string(),
        },
        OperationThreshold {
            operation: "Remove User".to_string(),
            threshold_percentage: OrbitRequestType::RemoveUser.voting_threshold(),
            voting_duration_hours: OrbitRequestType::RemoveUser.voting_duration_hours(),
            rationale: "Revoking DAO membership".to_string(),
        },
        OperationThreshold {
            operation: "Add User Group".to_string(),
            threshold_percentage: OrbitRequestType::AddUserGroup.voting_threshold(),
            voting_duration_hours: OrbitRequestType::AddUserGroup.voting_duration_hours(),
            rationale: "Creating new permission groups".to_string(),
        },
        OperationThreshold {
            operation: "Edit User Group".to_string(),
            threshold_percentage: OrbitRequestType::EditUserGroup.voting_threshold(),
            voting_duration_hours: OrbitRequestType::EditUserGroup.voting_duration_hours(),
            rationale: "Modifying group memberships".to_string(),
        },
        OperationThreshold {
            operation: "Remove User Group".to_string(),
            threshold_percentage: OrbitRequestType::RemoveUserGroup.voting_threshold(),
            voting_duration_hours: OrbitRequestType::RemoveUserGroup.voting_duration_hours(),
            rationale: "Deleting permission groups".to_string(),
        },
        // Automation (60%)
        OperationThreshold {
            operation: "Add Named Rule".to_string(),
            threshold_percentage: OrbitRequestType::AddNamedRule.voting_threshold(),
            voting_duration_hours: OrbitRequestType::AddNamedRule.voting_duration_hours(),
            rationale: "Creating automated rules".to_string(),
        },
        OperationThreshold {
            operation: "Edit Named Rule".to_string(),
            threshold_percentage: OrbitRequestType::EditNamedRule.voting_threshold(),
            voting_duration_hours: OrbitRequestType::EditNamedRule.voting_duration_hours(),
            rationale: "Modifying automation logic".to_string(),
        },
        OperationThreshold {
            operation: "Remove Named Rule".to_string(),
            threshold_percentage: OrbitRequestType::RemoveNamedRule.voting_threshold(),
            voting_duration_hours: OrbitRequestType::RemoveNamedRule.voting_duration_hours(),
            rationale: "Deleting automated rules".to_string(),
        },
        // Assets (40%)
        OperationThreshold {
            operation: "Add Asset".to_string(),
            threshold_percentage: OrbitRequestType::AddAsset.voting_threshold(),
            voting_duration_hours: OrbitRequestType::AddAsset.voting_duration_hours(),
            rationale: "Registering new token types".to_string(),
        },
        OperationThreshold {
            operation: "Edit Asset".to_string(),
            threshold_percentage: OrbitRequestType::EditAsset.voting_threshold(),
            voting_duration_hours: OrbitRequestType::EditAsset.voting_duration_hours(),
            rationale: "Updating asset metadata".to_string(),
        },
        OperationThreshold {
            operation: "Remove Asset".to_string(),
            threshold_percentage: OrbitRequestType::RemoveAsset.voting_threshold(),
            voting_duration_hours: OrbitRequestType::RemoveAsset.voting_duration_hours(),
            rationale: "Removing tracked assets".to_string(),
        },
        // Address Book (30%)
        OperationThreshold {
            operation: "Add Address Book Entry".to_string(),
            threshold_percentage: OrbitRequestType::AddAddressBookEntry.voting_threshold(),
            voting_duration_hours: OrbitRequestType::AddAddressBookEntry.voting_duration_hours(),
            rationale: "Adding trusted addresses".to_string(),
        },
        OperationThreshold {
            operation: "Edit Address Book Entry".to_string(),
            threshold_percentage: OrbitRequestType::EditAddressBookEntry.voting_threshold(),
            voting_duration_hours: OrbitRequestType::EditAddressBookEntry.voting_duration_hours(),
            rationale: "Updating address metadata".to_string(),
        },
        OperationThreshold {
            operation: "Remove Address Book Entry".to_string(),
            threshold_percentage: OrbitRequestType::RemoveAddressBookEntry.voting_threshold(),
            voting_duration_hours: OrbitRequestType::RemoveAddressBookEntry.voting_duration_hours(),
            rationale: "Removing addresses from book".to_string(),
        },
    ]
}

/// Helper: Format request policies into human-readable descriptions
fn format_request_policies(policies: Vec<RequestPolicy>) -> Vec<RequestPolicyDetail> {

    policies
        .iter()
        .map(|p| {
            let operation = format_specifier(&p.specifier);
            let (description, risk_level) = describe_policy_rule(&p.rule);
            let approval_rule = format_rule(&p.rule);

            RequestPolicyDetail {
                operation,
                description,
                approval_rule,
                risk_level,
            }
        })
        .collect()
}

/// Format request specifier into readable operation name
fn format_specifier(specifier: &crate::types::orbit::RequestSpecifier) -> String {
    #[allow(unused_imports)]
    use crate::types::orbit::RequestSpecifier;

    match specifier {
        RequestSpecifier::Transfer(_) => "Transfer".to_string(),
        RequestSpecifier::AddAccount => "Add Account".to_string(),
        RequestSpecifier::EditAccount(_) => "Edit Account".to_string(),
        RequestSpecifier::RemoveAccount => "Remove Account".to_string(),
        RequestSpecifier::AddUser => "Add User".to_string(),
        RequestSpecifier::EditUser(_) => "Edit User".to_string(),
        RequestSpecifier::RemoveUser => "Remove User".to_string(),
        RequestSpecifier::AddUserGroup => "Add User Group".to_string(),
        RequestSpecifier::EditUserGroup(_) => "Edit User Group".to_string(),
        RequestSpecifier::RemoveUserGroup(_) => "Remove User Group".to_string(),
        RequestSpecifier::CreateExternalCanister => "Create External Canister".to_string(),
        RequestSpecifier::ChangeExternalCanister(_) => "Change External Canister".to_string(),
        RequestSpecifier::CallExternalCanister(_) => "Call External Canister".to_string(),
        RequestSpecifier::FundExternalCanister(_) => "Fund External Canister".to_string(),
        RequestSpecifier::SystemUpgrade => "System Upgrade".to_string(),
        RequestSpecifier::EditPermission(_) => "Edit Permission".to_string(),
        RequestSpecifier::AddRequestPolicy => "Add Request Policy".to_string(),
        RequestSpecifier::EditRequestPolicy(_) => "Edit Request Policy".to_string(),
        RequestSpecifier::RemoveRequestPolicy(_) => "Remove Request Policy".to_string(),
        RequestSpecifier::AddAsset => "Add Asset".to_string(),
        RequestSpecifier::EditAsset(_) => "Edit Asset".to_string(),
        RequestSpecifier::RemoveAsset(_) => "Remove Asset".to_string(),
        RequestSpecifier::AddNamedRule => "Add Named Rule".to_string(),
        RequestSpecifier::EditNamedRule(_) => "Edit Named Rule".to_string(),
        RequestSpecifier::RemoveNamedRule(_) => "Remove Named Rule".to_string(),
        RequestSpecifier::AddAddressBookEntry => "Add Address Book Entry".to_string(),
        RequestSpecifier::EditAddressBookEntry(_) => "Edit Address Book Entry".to_string(),
        RequestSpecifier::RemoveAddressBookEntry(_) => "Remove Address Book Entry".to_string(),
        RequestSpecifier::ChangeCanister => "Change Canister".to_string(),
        RequestSpecifier::SetDisasterRecovery => "Set Disaster Recovery".to_string(),
        RequestSpecifier::ManageSystemInfo => "Manage System Info".to_string(),
    }
}

/// Describe policy rule and assign risk level
fn describe_policy_rule(rule: &crate::types::orbit::RequestPolicyRule) -> (String, String) {
    use crate::types::orbit::RequestPolicyRule;

    match rule {
        RequestPolicyRule::AutoApproved => (
            "Automatically approved without review".to_string(),
            "High".to_string(),
        ),
        RequestPolicyRule::Quorum(q) => {
            let description = format!(
                "Requires approval from {} approvers",
                q.min_approved
            );
            ("Medium".to_string(), description)
        }
        RequestPolicyRule::QuorumPercentage(qp) => {
            let description = format!(
                "Requires {}% approval from eligible approvers",
                qp.min_approved
            );
            ("Medium".to_string(), description)
        }
        RequestPolicyRule::AllowListed => (
            "Restricted to pre-approved addresses only".to_string(),
            "Low".to_string(),
        ),
        RequestPolicyRule::AllowListedByMetadata(_) => (
            "Allowed based on metadata criteria".to_string(),
            "Low".to_string(),
        ),
        RequestPolicyRule::Not(inner) => {
            let (desc, risk) = describe_policy_rule(inner);
            (format!("NOT ({})", desc), risk)
        }
        RequestPolicyRule::AllOf(rules) => {
            let desc = format!("ALL of {} conditions must be met", rules.len());
            ("Medium".to_string(), desc)
        }
        RequestPolicyRule::AnyOf(rules) => {
            let desc = format!("ANY of {} conditions must be met", rules.len());
            ("Medium".to_string(), desc)
        }
        RequestPolicyRule::NamedRule(name) => (
            format!("Uses named rule: {}", name),
            "Medium".to_string(),
        )
    }
}

/// Format rule into concise string
fn format_rule(rule: &crate::types::orbit::RequestPolicyRule) -> String {
    use crate::types::orbit::RequestPolicyRule;

    match rule {
        RequestPolicyRule::AutoApproved => "AutoApproved".to_string(),
        RequestPolicyRule::Quorum(q) => format!("Quorum({} approvers)", q.min_approved),
        RequestPolicyRule::QuorumPercentage(qp) => format!("Quorum({}%)", qp.min_approved),
        RequestPolicyRule::AllowListed => "AllowListed".to_string(),
        RequestPolicyRule::AllowListedByMetadata(_) => "AllowListedByMetadata".to_string(),
        RequestPolicyRule::Not(_) => "NOT(...)".to_string(),
        RequestPolicyRule::AllOf(rules) => format!("AND({} rules)", rules.len()),
        RequestPolicyRule::AnyOf(rules) => format!("OR({} rules)", rules.len()),
        RequestPolicyRule::NamedRule(name) => format!("NamedRule({})", name),
    }
}
