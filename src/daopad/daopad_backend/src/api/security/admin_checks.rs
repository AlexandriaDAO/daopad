use super::security_utils::{SecurityCheck, CheckStatus, Severity};
use crate::types::orbit::{UserDTO, ListUsersInput, ListUsersResult};
use candid::Principal;

const ADMIN_GROUP_ID: &str = "00000000-0000-4000-8000-000000000000";
const OPERATOR_GROUP_ID: &str = "00000000-0000-4000-8000-000000000001";

// ===== DATA FETCHING =====

pub async fn fetch_users(station_id: Principal) -> Result<Vec<UserDTO>, String> {
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

// ===== ADMIN CONTROL CHECKS =====

pub fn check_admin_control_layer(users: &Vec<UserDTO>, backend_principal: Principal) -> Vec<SecurityCheck> {
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

// ===== PUBLIC ORCHESTRATION =====

pub async fn check_admin_control(station_id: Principal, backend_principal: Principal) -> Result<Vec<SecurityCheck>, String> {
    let users = fetch_users(station_id).await.map_err(|e| {
        format!("Failed to fetch users: {}", e)
    })?;

    Ok(check_admin_control_layer(&users, backend_principal))
}

// ===== BACKEND STATUS CHECK =====

pub async fn check_backend_status(station_id: Principal, backend_principal: Principal) -> Result<Vec<SecurityCheck>, String> {
    let users = fetch_users(station_id).await.map_err(|e| {
        format!("Failed to fetch users: {}", e)
    })?;

    // Get admin users
    let admin_users: Vec<&UserDTO> = users.iter()
        .filter(|u| u.groups.iter().any(|g| g.id == ADMIN_GROUP_ID))
        .collect();

    let mut checks = Vec::new();

    // Check if backend is admin
    let backend_is_admin = admin_users.iter()
        .any(|u| u.identities.contains(&backend_principal));

    if backend_is_admin {
        checks.push(SecurityCheck {
            category: "Backend Status".to_string(),
            name: "Backend Admin Rights".to_string(),
            status: CheckStatus::Pass,
            message: "DAOPad backend has required admin permissions".to_string(),
            severity: Some(Severity::None),
            details: None,
            recommendation: None,
            related_permissions: None,
        });
    } else {
        checks.push(SecurityCheck {
            category: "Backend Status".to_string(),
            name: "Backend Admin Rights".to_string(),
            status: CheckStatus::Fail,
            message: "DAOPad backend lacks admin permissions".to_string(),
            severity: Some(Severity::Critical),
            details: Some(format!("Backend principal {} not found in admin group", backend_principal)),
            recommendation: Some("Add DAOPad backend to Admin group in Orbit Station".to_string()),
            related_permissions: None,
        });
    }

    Ok(checks)
}