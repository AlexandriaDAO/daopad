use crate::kong_locker::{get_kong_locker_for_user, get_user_locked_tokens};
use crate::storage::state::TOKEN_ORBIT_STATIONS;
use crate::types::orbit::{
    AccountBalance, AccountMetadata, AddAccountOperationInput, Allow, AuthScope,
    FetchAccountBalancesInput, FetchAccountBalancesResult, ListAccountsInput, ListAccountsResult,
};
use crate::types::StorablePrincipal;
use crate::types::TokenInfo;
use crate::{
    approve_transfer_orbit_request, create_transfer_request_in_orbit,
    get_transfer_requests_from_orbit,
};
use candid::{Nat, Principal};
use ic_cdk::{query, update};

#[update]
pub async fn get_my_locked_tokens() -> Result<Vec<TokenInfo>, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    let kong_locker_principal =
        get_kong_locker_for_user(caller).ok_or("Must register Kong Locker canister first")?;

    get_user_locked_tokens(kong_locker_principal).await
}

#[query]
pub fn get_orbit_station_for_token(token_canister_id: Principal) -> Option<Principal> {
    TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
    })
}

#[query]
pub fn list_all_orbit_stations() -> Vec<(Principal, Principal)> {
    TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .iter()
            .map(|(token, station)| (token.0, station.0))
            .collect()
    })
}

#[update]
pub async fn join_orbit_station(
    token_canister_id: Principal,
    display_name: String,
) -> Result<crate::types::JoinMemberResponse, String> {
    use crate::api::orbit_users::{ListUsersInput, ListUsersResult};
    use crate::kong_locker::voting::get_user_voting_power_for_token;
    use crate::types::{
        AddUserOperationInput, CreateRequestInput, CreateRequestResult, JoinMemberResponse,
        RequestExecutionSchedule, RequestOperationInput, RequestStatusDTO,
    };
    use ic_cdk::call;

    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    // Find the station for this token
    let station_id = TOKEN_ORBIT_STATIONS
        .with(|stations| {
            stations
                .borrow()
                .get(&StorablePrincipal(token_canister_id))
                .map(|s| s.0)
        })
        .ok_or("No Orbit station exists for this token")?;

    // Check if user has at least 100 voting power for this token
    const MINIMUM_VP_TO_JOIN: u64 = 100;
    let voting_power = get_user_voting_power_for_token(caller, token_canister_id).await?;

    if voting_power < MINIMUM_VP_TO_JOIN {
        return Err(format!(
            "Insufficient voting power. You have {} VP but need at least {} VP to join as a member",
            voting_power, MINIMUM_VP_TO_JOIN
        ));
    }

    // NEW: Check if user is already a member first
    let list_users_input = ListUsersInput {
        search_term: None,
        statuses: None,
        groups: None,
        paginate: None,
    };

    let users_result: Result<(ListUsersResult,), _> =
        call(station_id, "list_users", (list_users_input,)).await;

    if let Ok((ListUsersResult::Ok(users_response),)) = users_result {
        let is_already_member = users_response.users.iter().any(|user| {
            user.identities.contains(&caller)
        });

        if is_already_member {
            return Err("You are already a member of this treasury".to_string());
        }
    }

    // Create the AddUser request
    let add_user_input = CreateRequestInput {
        operation: RequestOperationInput::AddUser(AddUserOperationInput {
            name: display_name.clone(),
            identities: vec![caller],
            groups: vec![],
            status: crate::types::UserStatus::Active,
        }),
        title: Some(format!("Add {} as member", display_name)),
        summary: Some(format!(
            "Adding user with {} VP as a member to the station",
            voting_power
        )),
        execution_plan: Some(RequestExecutionSchedule::Immediate),
        expiration_dt: None,
    };

    // Call Orbit Station to create the request
    let result: Result<(CreateRequestResult,), _> =
        call(station_id, "create_request", (add_user_input,)).await;

    match result {
        Ok((CreateRequestResult::Ok(response),)) => {
            // Parse the actual status properly
            let (status_str, auto_approved, failure_reason) = match &response.request.status {
                RequestStatusDTO::Created => ("Created".to_string(), false, None),
                RequestStatusDTO::Approved => ("Approved".to_string(), true, None),
                RequestStatusDTO::Completed { .. } => ("Completed".to_string(), true, None),
                RequestStatusDTO::Failed { reason } => (
                    "Failed".to_string(),
                    false,
                    reason.clone()
                ),
                _ => ("Processing".to_string(), false, None),
            };

            Ok(JoinMemberResponse {
                request_id: response.request.id,
                status: status_str,
                auto_approved,
                failure_reason,
            })
        }
        Ok((CreateRequestResult::Err(e),)) => {
            Ok(JoinMemberResponse {
                request_id: "".to_string(),
                status: "Failed".to_string(),
                auto_approved: false,
                failure_reason: Some(format!("Failed to create member request: {}", e)),
            })
        }
        Err((code, msg)) => {
            Ok(JoinMemberResponse {
                request_id: "".to_string(),
                status: "Failed".to_string(),
                auto_approved: false,
                failure_reason: Some(format!(
                    "Failed to call Orbit Station: {:?} - {}",
                    code, msg
                )),
            })
        }
    }
}

#[update]
pub async fn list_orbit_accounts(
    station_id: Principal,
    search_term: Option<String>,
    limit: Option<u64>,
    offset: Option<u64>,
) -> Result<ListAccountsResult, String> {
    // Build the input for list_accounts
    let input = ListAccountsInput {
        search_term,
        paginate: if limit.is_some() || offset.is_some() {
            Some(crate::types::orbit::PaginationInput { limit, offset })
        } else {
            None
        },
    };

    // Call the Orbit Station canister
    let result: Result<(ListAccountsResult,), _> =
        ic_cdk::call(station_id, "list_accounts", (input,)).await;

    match result {
        Ok((response,)) => Ok(response),
        Err((code, msg)) => Err(format!(
            "Failed to call Orbit Station list_accounts: {:?} - {}",
            code, msg
        )),
    }
}

#[update]
pub async fn fetch_orbit_account_balances(
    station_id: Principal,
    account_ids: Vec<String>,
) -> Result<Vec<Option<AccountBalance>>, String> {
    // Build the input for fetch_account_balances
    let input = FetchAccountBalancesInput { account_ids };

    // Call the Orbit Station canister
    let result: Result<(FetchAccountBalancesResult,), _> =
        ic_cdk::call(station_id, "fetch_account_balances", (input,)).await;

    match result {
        Ok((FetchAccountBalancesResult::Ok { balances },)) => Ok(balances),
        Ok((FetchAccountBalancesResult::Err(e),)) => {
            Err(format!("Failed to fetch account balances: {}", e))
        }
        Err((code, msg)) => Err(format!(
            "Failed to call Orbit Station fetch_account_balances: {:?} - {}",
            code, msg
        )),
    }
}

#[update]
pub async fn create_orbit_treasury_account(
    station_id: Principal,
    account_name: String,
    account_type: Option<String>, // e.g., "reserves", "operations", etc.
) -> Result<String, String> {
    use crate::types::{
        CreateRequestInput, CreateRequestResult, RequestExecutionSchedule, RequestOperationInput,
    };

    // ICP asset UUID - this is constant in Orbit Station
    const ICP_ASSET_ID: &str = "7802cbab-221d-4e49-b764-a695ea6def1a";

    // Build metadata if account type is specified
    let mut metadata = Vec::new();
    if let Some(acc_type) = account_type.clone() {
        metadata.push(AccountMetadata {
            key: "type".to_string(),
            value: acc_type,
        });
    }

    // Create permissions - all restricted (only admins/operators can access)
    let restricted_permission = Allow {
        auth_scope: AuthScope::Restricted,
        users: vec![],
        user_groups: vec![],
    };

    // Read permission can be more open (all authenticated users)
    let read_permission = Allow {
        auth_scope: AuthScope::Authenticated,
        users: vec![],
        user_groups: vec![],
    };

    // Build the AddAccount operation input
    let add_account_input = AddAccountOperationInput {
        name: account_name.clone(),
        assets: vec![ICP_ASSET_ID.to_string()],
        metadata,
        read_permission,
        configs_permission: restricted_permission.clone(),
        transfer_permission: restricted_permission,
        configs_request_policy: None,
        transfer_request_policy: None,
    };

    // Create the request input
    let request_input = CreateRequestInput {
        operation: RequestOperationInput::AddAccount(add_account_input),
        title: Some(format!("Create {} treasury account", account_name)),
        summary: Some(format!(
            "Creating a new treasury account: {} {}",
            account_name,
            account_type.map_or(String::new(), |t| format!("({})", t))
        )),
        execution_plan: Some(RequestExecutionSchedule::Immediate),
        expiration_dt: None,
    };

    // Call Orbit Station to create the request
    let result: Result<(CreateRequestResult,), _> =
        ic_cdk::call(station_id, "create_request", (request_input,)).await;

    match result {
        Ok((CreateRequestResult::Ok(response),)) => Ok(format!(
            "Successfully created treasury account request. Request ID: {}. Status: {:?}",
            response.request.id, response.request.status
        )),
        Ok((CreateRequestResult::Err(e),)) => {
            Err(format!("Failed to create treasury account request: {}", e))
        }
        Err((code, msg)) => Err(format!(
            "Failed to call Orbit Station: {:?} - {}",
            code, msg
        )),
    }
}

// Treasury Transfer Methods

#[update]
pub async fn create_transfer_request(
    from_account_id: String,
    from_asset_id: String,
    to_address: String,
    amount: Nat,
    title: String,
    description: String,
    memo: Option<String>,
    token_id: Principal,
) -> Result<String, String> {
    let caller = ic_cdk::caller();

    // Get station for this token
    let station_id = TOKEN_ORBIT_STATIONS
        .with(|stations| {
            stations
                .borrow()
                .get(&StorablePrincipal(token_id))
                .map(|s| s.0)
        })
        .ok_or("No treasury for this token")?;

    create_transfer_request_in_orbit(
        station_id,
        caller,
        token_id,
        from_account_id,
        from_asset_id,
        to_address,
        amount,
        title,
        description,
        memo,
    )
    .await
}

#[update]
pub async fn get_transfer_requests(token_id: Principal) -> Result<Vec<String>, String> {
    let station_id = TOKEN_ORBIT_STATIONS
        .with(|stations| {
            stations
                .borrow()
                .get(&StorablePrincipal(token_id))
                .map(|s| s.0)
        })
        .ok_or("No treasury for this token")?;

    get_transfer_requests_from_orbit(station_id).await
}

#[update]
pub async fn approve_transfer_request(
    request_id: String,
    token_id: Principal,
) -> Result<(), String> {
    let caller = ic_cdk::caller();
    let station_id = TOKEN_ORBIT_STATIONS
        .with(|stations| {
            stations
                .borrow()
                .get(&StorablePrincipal(token_id))
                .map(|s| s.0)
        })
        .ok_or("No treasury for this token")?;

    approve_transfer_orbit_request(station_id, request_id, caller).await
}

#[update] // MUST be update, not query (Universal Issue: can't call queries from queries)
pub async fn get_user_pending_requests(
    token_canister_id: Principal,
    _user_principal: Principal // TODO: Use this to filter for specific user's requests
) -> Result<Vec<crate::api::orbit_requests::OrbitRequestSummary>, String> {
    use crate::api::orbit_requests::{ListRequestsInput, ListRequestsOperationType, PaginationInput, RequestStatusCode};

    // Get all pending AddUser requests
    let filters = ListRequestsInput {
        requester_ids: None,
        approver_ids: None,
        statuses: Some(vec![
            RequestStatusCode::Created,
            RequestStatusCode::Approved,
            RequestStatusCode::Scheduled,
            RequestStatusCode::Processing,
        ]),
        operation_types: Some(vec![ListRequestsOperationType::AddUser]),
        expiration_from_dt: None,
        expiration_to_dt: None,
        created_from_dt: None,
        created_to_dt: None,
        paginate: Some(PaginationInput {
            offset: None,
            limit: Some(50),
        }),
        sort_by: None,
        only_approvable: false,
        with_evaluation_results: false,
        deduplication_keys: Some(vec![]), // CRITICAL: Include ALL fields!
        tags: Some(vec![]),               // Even if empty!
    };

    // Call list_orbit_requests to get all AddUser requests
    let response = crate::api::orbit_requests::list_orbit_requests(token_canister_id, filters).await?;

    // Filter for requests containing this user's principal
    // Note: This is a simple implementation - in production we'd parse operation details
    let user_requests = response.requests.into_iter()
        .filter(|_request| {
            // For now, just return all AddUser requests since we filtered by operation type
            // A more sophisticated implementation would parse the operation to check the identities
            true
        })
        .collect();

    Ok(user_requests)
}
