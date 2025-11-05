use super::security_utils::{SecurityCheck, CheckStatus, Severity};
use super::governance_checks::check_permission_by_resource;
use crate::types::orbit::{
    Permission, Resource, ResourceAction, UserGroup,
    AccountMinimal, ListAccountsInputMinimal, ListAccountsResultMinimal,
    PaginationInputMinimal,
};
use candid::Principal;

// ===== DATA FETCHING =====

pub async fn fetch_accounts(station_id: Principal) -> Result<Vec<AccountMinimal>, String> {
    let input = ListAccountsInputMinimal {
        search_term: String::new(),
        paginate: PaginationInputMinimal {
            offset: 0,
            limit: 50,
        },
    };

    let result: Result<(ListAccountsResultMinimal,), _> = ic_cdk::call(
        station_id,
        "list_accounts",
        (input,)
    ).await;

    match result {
        Ok((ListAccountsResultMinimal::Ok { accounts, .. },)) => Ok(accounts),
        Ok((ListAccountsResultMinimal::Err(e),)) => Err(format!("Orbit error: {:?}", e)),
        Err((code, msg)) => Err(format!("Failed to list accounts: {:?} - {}", code, msg)),
    }
}

// ===== TREASURY CONTROL CHECKS =====

pub fn check_treasury_control_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<UserGroup>
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

    // Check Account.Delete permissions
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Treasury Control",
        "Account Deletion Permissions",
        |resource| matches!(resource, Resource::Account(ResourceAction::Delete(_))),
        Severity::Critical,
        "Non-admin groups can delete treasury accounts",
        "Restrict Account.Delete to Admin group only",
    ));

    checks
}

// ===== ASSET MANAGEMENT CHECKS =====

pub fn check_asset_management_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<UserGroup>
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

// ===== ACCOUNT AUTOAPPROVED STATUS CHECKS =====

pub fn check_account_autoapproved_impl(accounts: &Vec<AccountMinimal>) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // SKIPPED: AutoApproved policy check - field removed from AccountMinimal
    // due to Candid 0.10.18 Option<RequestPolicyRule> deserialization errors
    // Policy checking must be done via Orbit UI until Candid is upgraded

    if accounts.is_empty() {
        checks.push(SecurityCheck {
            category: "Treasury Setup".to_string(),
            name: "Account AutoApproved Status".to_string(),
            status: CheckStatus::Warn,
            message: "No treasury accounts found".to_string(),
            severity: Some(Severity::Low),
            details: Some(
                "Orbit Station has no accounts configured yet. \
                 Create treasury accounts first.".to_string()
            ),
            recommendation: Some(
                "Create at least one treasury account in Orbit Station.".to_string()
            ),
            related_permissions: None,
        });
    } else {
        // Accounts exist but can't verify policies due to Candid limitation
        checks.push(SecurityCheck {
            category: "Treasury Setup".to_string(),
            name: "Account AutoApproved Status".to_string(),
            status: CheckStatus::Warn,
            message: format!(
                "Policy verification unavailable ({} account(s) found)",
                accounts.len()
            ),
            severity: Some(Severity::Low),
            details: Some(
                "Cannot verify AutoApproved policies due to Candid 0.10.18 Option<RequestPolicyRule> limitation. \
                 Please verify manually in Orbit Station UI.".to_string()
            ),
            recommendation: Some(
                "Verify AutoApproved policies manually via Orbit Station UI".to_string()
            ),
            related_permissions: None,
        });
    }

    checks
}

// ===== PUBLIC ORCHESTRATION =====

/// Check if treasury accounts have AutoApproved transfer policies
/// This is CRITICAL for DAOPad liquid democracy to work
pub async fn check_account_autoapproved_status(
    station_id: Principal
) -> Result<Vec<SecurityCheck>, String> {
    // Fetch accounts from Orbit Station
    let accounts = fetch_accounts(station_id).await?;

    // Analyze AutoApproved status
    Ok(check_account_autoapproved_impl(&accounts))
}