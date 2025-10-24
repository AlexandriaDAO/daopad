use crate::types::orbit::*;
use crate::types::StorablePrincipal;
use crate::storage::state::TOKEN_ORBIT_STATIONS;
use candid::{CandidType, Deserialize, Principal};
use ic_cdk::{call, update};
use serde::Serialize;

// Create account configuration from frontend
#[derive(CandidType, Deserialize)]
pub struct CreateAccountConfig {
    pub name: String,
    pub asset_ids: Vec<String>,  // UUID array
    pub metadata: Vec<AccountMetadata>,
    pub read_permission: Allow,
    pub configs_permission: Allow,
    pub transfer_permission: Allow,
    pub configs_request_policy: Option<RequestPolicyRule>,
    pub transfer_request_policy: Option<RequestPolicyRule>,
}

// Response for account creation
#[derive(CandidType, Deserialize, Serialize)]
pub struct CreateAccountResponse {
    pub request_id: String,
    pub status: String,
    pub auto_approved: bool,
    pub error: Option<String>,
}

// Asset information for frontend
#[derive(CandidType, Deserialize, Serialize)]
pub struct AssetInfo {
    pub id: String,  // UUID
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
}

// Asset types from Orbit Station
#[derive(CandidType, Deserialize)]
pub struct Asset {
    pub id: String,  // UUID
    pub symbol: String,
    pub name: String,
    pub decimals: u32,
    pub metadata: Vec<AssetMetadata>,
    pub blockchain: String,
    pub standards: Vec<String>,  // Changed from single 'standard' to 'standards' (Vec) to match Orbit
}

#[derive(CandidType, Deserialize)]
pub struct AssetMetadata {
    pub key: String,
    pub value: String,
}

#[derive(CandidType, Deserialize)]
pub struct ListAssetsInput {
    // Empty for now
}

#[derive(CandidType, Deserialize)]
pub enum ListAssetsResult {
    Ok { assets: Vec<Asset> },
    Err(Error),
}

// Create treasury account through proposal system
#[update]
async fn create_treasury_account(
    _token_id: Principal,
    account_config: CreateAccountConfig
) -> Result<CreateAccountResponse, String> {
    // Note: Direct account creation has been removed to enforce proposal-based governance.
    // This function should now create a proposal for account creation instead.
    // For now, returning an error to prevent direct creation.

    Err(format!(
        "Direct account creation is disabled. Account creation must go through the proposal system. \
        Please create a governance proposal for adding account '{}'. \
        Required voting power: 10,000 VP minimum.",
        account_config.name
    ))

    // TODO: Implement account creation proposal type:
    // 1. Create AccountCreationProposal type
    // 2. Check user has 10,000+ VP
    // 3. Create proposal with account details
    // 4. Return proposal ID instead of request ID
}

// Get available assets from Orbit Station
#[update]
async fn get_available_assets(
    token_id: Principal
) -> ListAssetsResult {
    let station_id = match TOKEN_ORBIT_STATIONS.with(|s| {
        s.borrow()
            .get(&StorablePrincipal(token_id))
            .map(|s| s.0)
    }) {
        Some(id) => id,
        None => return ListAssetsResult::Err(Error {
            code: "NOT_FOUND".to_string(),
            message: Some("No Orbit Station found for token".to_string()),
            details: None,
        })
    };

    let result: Result<(ListAssetsResult,), _> =
        call(station_id, "list_assets", (ListAssetsInput {},)).await;

    match result {
        Ok((response,)) => response,
        Err((code, msg)) => ListAssetsResult::Err(Error {
            code: format!("{:?}", code),
            message: Some(msg),
            details: None,
        })
    }
}

// Validate account name
#[update]
async fn validate_account_name(
    token_id: Principal,
    name: String
) -> Result<bool, String> {
    // Check name length
    if name.is_empty() || name.len() > 64 {
        return Ok(false);
    }

    // Check for duplicate names
    let station_id = TOKEN_ORBIT_STATIONS.with(|s| {
        s.borrow()
            .get(&StorablePrincipal(token_id))
            .map(|s| s.0)
            .ok_or("No Orbit Station found for token".to_string())
    })?;

    let result: Result<(ListAccountsResult,), _> = call(
        station_id,
        "list_accounts",
        (ListAccountsInput {
            search_term: Some(name.clone()),
            paginate: None,
        },)
    ).await;

    match result {
        Ok((ListAccountsResult::Ok { accounts, .. },)) => {
            // Check if any account has exact name match (case-insensitive)
            let name_lower = name.to_lowercase();
            let exists = accounts.iter()
                .any(|a| a.name.to_lowercase() == name_lower);
            Ok(!exists)
        }
        _ => Ok(true) // If we can't check, assume valid
    }
}

// Check if DAOPad backend is a member of the Orbit Station
#[derive(CandidType, Deserialize, Serialize)]
pub struct BackendStatusCheck {
    pub is_member: bool,
    pub backend_principal: Principal,
    pub station_id: Principal,
    pub instructions: Option<Vec<String>>,
    pub error: Option<String>,
}

#[update]
async fn check_backend_status(token_id: Principal) -> Result<BackendStatusCheck, String> {
    // Get backend principal
    let backend_principal = ic_cdk::id();

    // Get station for token
    let station_id = TOKEN_ORBIT_STATIONS.with(|s| {
        s.borrow()
            .get(&StorablePrincipal(token_id))
            .map(|s| s.0)
            .ok_or("No Orbit Station found for token".to_string())
    })?;

    // First try a simple call to check if we can interact with the station at all
    // We'll use the 'me' call which should tell us if we're a member
    let me_result: Result<(MeResult,), _> = call(
        station_id,
        "me",
        ()
    ).await;

    match me_result {
        Ok((MeResult::Ok { me: _user, .. },)) => {
            // We successfully got user info - we ARE a member!
            Ok(BackendStatusCheck {
                is_member: true,
                backend_principal,
                station_id,
                instructions: None,
                error: None,
            })
        }
        Ok((MeResult::Err(e),)) if e.code.contains("USER_NOT_FOUND") || e.message.as_ref().map_or(false, |m| m.contains("not exist as a user")) => {
            // Specific error indicating we're not a member
            Ok(BackendStatusCheck {
                is_member: false,
                backend_principal,
                station_id,
                instructions: Some(vec![
                    "DAOPad backend is not a member of your Orbit Station.".to_string(),
                    format!("1. Go to your Orbit Station at: https://{}.icp0.io", station_id),
                    "2. Navigate to the 'Members' section".to_string(),
                    format!("3. Click 'Add Member' and enter this principal: {}", backend_principal),
                    "4. Give it 'Admin' or 'Operator' role for full functionality".to_string(),
                    "5. Approve the request if needed (may auto-approve if you're an admin)".to_string(),
                    "6. Once added, return here and try again".to_string(),
                ]),
                error: None,
            })
        }
        Ok((MeResult::Err(e),)) => {
            // Some other error from the me() call
            Ok(BackendStatusCheck {
                is_member: false,
                backend_principal,
                station_id,
                instructions: Some(vec![
                    format!("Cannot verify membership status: {}", e),
                    format!("1. Go to your Orbit Station at: https://{}.icp0.io", station_id),
                    "2. Check if DAOPad backend is in the Members list".to_string(),
                    format!("3. If not, add this principal: {}", backend_principal),
                    "4. Set role to 'Admin' or 'Operator'".to_string(),
                ]),
                error: Some(format!("{}", e)),
            })
        }
        Err((_code, msg)) if msg.contains("does not exist as a user") => {
            // The trap error we're seeing - definitely not a member
            Ok(BackendStatusCheck {
                is_member: false,
                backend_principal,
                station_id,
                instructions: Some(vec![
                    "DAOPad backend needs to be added as a member of your Orbit Station.".to_string(),
                    format!("1. Go to your Orbit Station at: https://{}.icp0.io", station_id),
                    "2. Navigate to the 'Members' section in the left sidebar".to_string(),
                    format!("3. Click 'Add Member' and paste this principal: {}", backend_principal),
                    "4. Set the role to 'Admin' or 'Operator'".to_string(),
                    "5. Submit the request (it may auto-approve if you're an admin)".to_string(),
                    "6. Return here and click 'Create Account' again".to_string(),
                ]),
                error: None,
            })
        }
        Err((code, msg)) => {
            // Generic cross-canister call failure
            Ok(BackendStatusCheck {
                is_member: false,
                backend_principal,
                station_id,
                instructions: Some(vec![
                    "Cannot connect to Orbit Station.".to_string(),
                    format!("Error: {:?} - {}", code, msg),
                    format!("Station ID: {}", station_id),
                    format!("Backend Principal: {}", backend_principal),
                    "Please ensure the station exists and try again.".to_string(),
                ]),
                error: Some(format!("{:?} - {}", code, msg)),
            })
        }
    }
}

// Get high VP members (placeholder for now)
#[update]
async fn get_high_vp_members(
    _token_id: Principal,
    _min_vp: u64  // Default 100
) -> Result<Vec<Principal>, String> {
    // Query Kong Locker for high VP holders
    // Then get their Orbit user IDs
    // Implementation depends on Kong Locker integration

    // For now, return empty until Kong integration is complete
    Ok(vec![])
}

/// Create EditAccount requests to set AutoApproved for all accounts
///
/// IMPORTANT: Backend cannot approve these requests (separation of duties).
/// After calling this, manually approve requests in Orbit UI.
///
/// Workflow:
/// 1. Call this function to create EditAccount requests
/// 2. Open Orbit Station UI → Requests tab
/// 3. Approve each "Enable AutoApproved" request
/// 4. Verify accounts show AutoApproved policies
///
/// This is a one-time bootstrap process to enable autonomous DAOPad operations.
#[update]
pub async fn create_autoapprove_all_accounts(
    token_canister_id: Principal,
) -> Result<Vec<String>, String> {
    // 1. Get station ID from token mapping
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or_else(|| "No Orbit Station linked to this token".to_string())
    })?;

    // 2. List all accounts in Orbit Station
    let list_input = ListAccountsInput {
        search_term: None,
        paginate: None,
    };

    let accounts_result: (ListAccountsResult,) =
        call(station_id, "list_accounts", (list_input,))
        .await
        .map_err(|e| format!("Failed to list accounts: {:?}", e))?;

    let accounts = match accounts_result.0 {
        ListAccountsResult::Ok { accounts, .. } => accounts,
        ListAccountsResult::Err(e) => return Err(format!("Orbit error: {}", e)),
    };

    // 3. Create EditAccount request for each account
    let mut request_ids = Vec::new();
    let mut errors = Vec::new();

    for account in accounts {
        // Check if already AutoApproved
        let already_autoapproved = match &account.transfer_request_policy {
            Some(RequestPolicyRule::AutoApproved) => true,
            _ => false,
        };

        if already_autoapproved {
            ic_cdk::println!("Account '{}' already has AutoApproved policy, skipping", account.name);
            continue;
        }

        // Create EditAccount operation
        let edit_input = EditAccountOperationInput {
            account_id: account.id.clone(),
            name: None,
            change_assets: None,
            read_permission: None,
            configs_permission: None,
            transfer_permission: None,
            configs_request_policy: None,
            transfer_request_policy: Some(RequestPolicyRule::AutoApproved),
        };

        let request_input = CreateRequestInput {
            operation: RequestOperationInput::EditAccount(edit_input),
            title: Some(format!("Enable AutoApproved for account: {}", account.name)),
            summary: Some(format!(
                "Bootstrap step: Change transfer policy to AutoApproved for account '{}'. \
                 This allows DAOPad backend to execute community-approved treasury operations without redundant approval step. \
                 \n\n\
                 Security: Real governance happens in DAOPad (50%+ voting power, 7-day period), Orbit just executes. \
                 \n\n\
                 After approval, backend can create transfer requests that auto-execute after community vote passes.",
                account.name
            )),
            execution_plan: Some(RequestExecutionSchedule::Immediate),
            expiration_dt: None,
        };

        // Create request in Orbit
        let result: Result<(CreateRequestResult,), _> =
            call(station_id, "create_request", (request_input,))
            .await;

        match result {
            Ok((CreateRequestResult::Ok(response),)) => {
                ic_cdk::println!("Created AutoApproved request for account '{}': {}", account.name, response.request.id);
                request_ids.push(response.request.id);
            },
            Ok((CreateRequestResult::Err(e),)) => {
                let error_msg = format!("Failed for account '{}': {}", account.name, e.code);
                ic_cdk::println!("{}", error_msg);
                errors.push(error_msg);
            },
            Err((code, msg)) => {
                let error_msg = format!("IC error for account '{}': {:?} - {}", account.name, code, msg);
                ic_cdk::println!("{}", error_msg);
                errors.push(error_msg);
            }
        }
    }

    // 4. Return results
    if !errors.is_empty() {
        return Err(format!(
            "Created {} request(s) successfully, but encountered {} error(s): {}",
            request_ids.len(),
            errors.len(),
            errors.join("; ")
        ));
    }

    Ok(request_ids)
}

// ===== MULTI-ASSET TREASURY METHODS =====

/// Get single account with all assets and fresh balances
///
/// Fetches account details from Orbit Station and ensures all asset balances are fresh.
/// If any balances are null or stale, calls fetch_account_balances to refresh them.
#[update]
pub async fn get_treasury_account_details(
    token_canister_id: Principal,
    account_id: String,
) -> Result<Account, String> {
    // 1. Get station ID from token mapping
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or_else(|| "No Orbit Station linked to this token".to_string())
    })?;

    // 2. Call Orbit's get_account to get full account with assets
    #[derive(CandidType, Deserialize)]
    struct GetAccountInput {
        account_id: String,
    }

    #[derive(CandidType, Deserialize)]
    enum GetAccountResult {
        Ok { account: Account },
        Err(Error),
    }

    let result: Result<(GetAccountResult,), _> = call(
        station_id,
        "get_account",
        (GetAccountInput { account_id: account_id.clone() },)
    ).await;

    match result {
        Ok((GetAccountResult::Ok { account },)) => {
            // 3. Check if we need to fetch fresh balances
            let needs_refresh = account.assets.iter().any(|a| {
                a.balance.is_none() ||
                a.balance.as_ref().map_or(false, |b| b.query_state != "fresh")
            });

            if needs_refresh {
                // Fetch fresh balances
                let balance_result: Result<(FetchAccountBalancesResult,), _> = call(
                    station_id,
                    "fetch_account_balances",
                    (FetchAccountBalancesInput {
                        account_ids: vec![account_id.clone()]
                    },)
                ).await;

                match balance_result {
                    Ok((FetchAccountBalancesResult::Ok { balances },)) => {
                        // Merge balances into account assets
                        let mut updated_account = account.clone();
                        for (idx, asset) in updated_account.assets.iter_mut().enumerate() {
                            if idx < balances.len() {
                                if let Some(balance) = &balances[idx] {
                                    asset.balance = Some(balance.clone());
                                }
                            }
                        }
                        Ok(updated_account)
                    }
                    Ok((FetchAccountBalancesResult::Err(e),)) => {
                        // Return account even if balance fetch fails (balances may be null)
                        ic_cdk::println!("Warning: Failed to fetch balances: {}", e);
                        Ok(account)
                    }
                    Err((code, msg)) => {
                        ic_cdk::println!("Warning: Balance fetch call failed: {:?} - {}", code, msg);
                        Ok(account)
                    }
                }
            } else {
                // All balances are fresh
                Ok(account)
            }
        }
        Ok((GetAccountResult::Err(err),)) => Err(format!("Orbit error: {}", err)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}

/// List all treasury accounts with complete asset and balance data
///
/// Returns all accounts in the station with their assets and fresh balances.
/// This is the primary method for the Treasury Tab to fetch multi-asset data.
#[update]
pub async fn get_treasury_accounts_with_balances(
    token_canister_id: Principal,
) -> Result<Vec<Account>, String> {
    // 1. Get station ID
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or_else(|| "No Orbit Station linked to this token".to_string())
    })?;

    // 2. List all accounts
    let list_input = ListAccountsInput {
        search_term: None,
        paginate: None,
    };

    let accounts_result: Result<(ListAccountsResult,), _> = call(
        station_id,
        "list_accounts",
        (list_input,)
    ).await;

    let accounts = match accounts_result {
        Ok((ListAccountsResult::Ok { accounts, .. },)) => accounts,
        Ok((ListAccountsResult::Err(e),)) => return Err(format!("Orbit error: {}", e)),
        Err((code, msg)) => return Err(format!("Failed to list accounts: {:?} - {}", code, msg)),
    };

    // 3. Collect all account IDs for batch balance fetch
    let account_ids: Vec<String> = accounts.iter().map(|a| a.id.clone()).collect();

    if account_ids.is_empty() {
        return Ok(vec![]);
    }

    // 4. Fetch balances for all accounts in one call
    let balance_result: Result<(FetchAccountBalancesResult,), _> = call(
        station_id,
        "fetch_account_balances",
        (FetchAccountBalancesInput {
            account_ids: account_ids.clone()
        },)
    ).await;

    match balance_result {
        Ok((FetchAccountBalancesResult::Ok { balances },)) => {
            // 5. Merge balances into accounts
            let mut updated_accounts = accounts;

            // Balances are returned as a flat list for all accounts
            // We need to match them back to the correct assets
            let mut balance_idx = 0;

            for account in updated_accounts.iter_mut() {
                for asset in account.assets.iter_mut() {
                    if balance_idx < balances.len() {
                        if let Some(balance) = &balances[balance_idx] {
                            // Verify this balance matches our asset
                            if balance.account_id == account.id && balance.asset_id == asset.asset_id {
                                asset.balance = Some(balance.clone());
                            }
                        }
                        balance_idx += 1;
                    }
                }
            }

            Ok(updated_accounts)
        }
        Ok((FetchAccountBalancesResult::Err(e),)) => {
            // Return accounts without updated balances
            ic_cdk::println!("Warning: Failed to fetch balances: {}", e);
            Ok(accounts)
        }
        Err((code, msg)) => {
            // Return accounts without updated balances
            ic_cdk::println!("Warning: Balance fetch failed: {:?} - {}", code, msg);
            Ok(accounts)
        }
    }
}