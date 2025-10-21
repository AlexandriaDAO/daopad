use candid::Principal;
use ic_cdk::update;
use crate::types::orbit::{
    CreateRequestInput, RequestOperationInput,
    EditUserOperationInput, RequestExecutionSchedule,
    CreateRequestResult,
    ListUsersInput, ListUsersResult, UserDTO
};
use crate::storage::state::TOKEN_ORBIT_STATIONS;
use crate::types::StorablePrincipal;

// Group UUIDs from Orbit Station spec
const OPERATOR_GROUP_ID: &str = "00000000-0000-4000-8000-000000000001";

/// List all users in Orbit Station with their groups
/// Backend acts as admin proxy to query protected data
#[update]
pub async fn list_orbit_users(
    token_canister_id: Principal,
) -> Result<Vec<UserDTO>, String> {
    // 1. Get station ID from token mapping
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or_else(|| format!("No Orbit Station linked to token {}", token_canister_id))
    })?;

    // 2. Call Orbit's list_users (admin-only method)
    let input = ListUsersInput {
        search_term: None,
        statuses: None,
        groups: None,
        paginate: None,
    };

    let result: (ListUsersResult,) = ic_cdk::call(station_id, "list_users", (input,))
        .await
        .map_err(|e| format!("Failed to list users: {:?}", e))?;

    // 3. Return users or error
    match result.0 {
        ListUsersResult::Ok { users, .. } => Ok(users),
        ListUsersResult::Err(e) => Err(format!("Orbit error: {}", e)),
    }
}

/// Create EditUser request to remove user from admin group
/// Request goes through DAO voting system before execution
#[update]
pub async fn create_remove_admin_request(
    token_canister_id: Principal,
    user_id: String,
    user_name: String,
) -> Result<String, String> {
    let caller = ic_cdk::caller();

    // 1. Guard: Must be authenticated
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    // 2. Get station ID
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or_else(|| format!("No Orbit Station linked"))
    })?;

    // 3. Build EditUser operation (remove from admin, keep operator)
    let edit_user_input = EditUserOperationInput {
        id: user_id.clone(),
        name: None,
        identities: None,
        groups: Some(vec![OPERATOR_GROUP_ID.to_string()]), // Replace with operator only
        status: None,
        cancel_pending_requests: None,
    };

    let request_input = CreateRequestInput {
        operation: RequestOperationInput::EditUser(edit_user_input),
        title: Some(format!("Remove {} from Admin group", user_name)),
        summary: Some(format!(
            "Community proposal to remove user {} (ID: {}) from Admin group. \
             User will retain Operator privileges. This action requires 50% voting power approval.",
            user_name, user_id
        )),
        execution_plan: Some(RequestExecutionSchedule::Immediate),
        expiration_dt: None, // Use Orbit's default (30 days)
    };

    // 4. Create request in Orbit (backend is admin, so can create)
    let result: (CreateRequestResult,) =
        ic_cdk::call(station_id, "create_request", (request_input,))
        .await
        .map_err(|e| format!("Failed to create request: {:?}", e))?;

    // 5. Handle result and auto-create proposal for governance
    match result.0 {
        CreateRequestResult::Ok(response) => {
            let request_id = response.request.id;

            // CRITICAL: Auto-create DAOPad proposal for community voting
            // This ensures ALL admin removal requests go through governance
            use crate::proposals::{ensure_proposal_for_request, OrbitRequestType};

            match ensure_proposal_for_request(
                token_canister_id,
                request_id.clone(),
                OrbitRequestType::EditUser,
            ).await {
                Ok(proposal_id) => {
                    ic_cdk::println!(
                        "Admin removal governance: Orbit request {} → DAOPad proposal {:?}",
                        request_id, proposal_id
                    );
                    Ok(request_id)
                },
                Err(e) => {
                    // Proposal creation failed but Orbit request exists
                    // This violates governance requirements
                    Err(format!(
                        "GOVERNANCE VIOLATION: Orbit request {} created but proposal failed: {:?}. \
                         Request exists in Orbit Station but cannot be voted on.",
                        request_id, e
                    ))
                }
            }
        },
        CreateRequestResult::Err(e) => Err(format!("Orbit error: {}", e.code)),
    }
}

/// Convenience method: Remove admin from multiple users in one call
#[update]
pub async fn create_remove_multiple_admins_request(
    token_canister_id: Principal,
    user_ids: Vec<(String, String)>, // (user_id, user_name) pairs
) -> Vec<Result<String, String>> {
    let mut results = Vec::new();

    for (user_id, user_name) in user_ids {
        let result = create_remove_admin_request(
            token_canister_id,
            user_id,
            user_name
        ).await;
        results.push(result);
    }

    results
}
