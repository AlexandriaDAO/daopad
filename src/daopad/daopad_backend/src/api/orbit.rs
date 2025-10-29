use crate::kong_locker::{get_or_lookup_kong_locker, get_user_locked_tokens};
use crate::storage::state::TOKEN_ORBIT_STATIONS;
use crate::types::orbit::{
    AccountBalance, AccountMetadata, AddAccountOperationInput, Allow, AuthScope,
    FetchAccountBalancesInput, FetchAccountBalancesResult,
    // Minimal types (no Option<T>)
    SystemInfoResultMinimal, SystemInfoResponseMinimal, PaginationInputMinimal,
    ListAccountsInputMinimal, ListAccountsResultMinimal, AccountMinimal,
    // Original types still needed for some operations
    TreasuryManagementData, TreasuryAccountDetails,
    TreasuryAddressBookEntry, AssetBalanceInfo, ListAddressBookInput, ListAddressBookResult,
    RequestPolicyRule,
};
use crate::types::StorablePrincipal;
use crate::types::TokenInfo;
use crate::{
    // ❌ REMOVED: approve_transfer_orbit_request - replaced by liquid democracy voting
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

    // Auto-lookup user's Kong Locker canister from factory if not cached
    let kong_locker_principal = get_or_lookup_kong_locker(caller).await?;

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

/// Get token ID for a given station ID (reverse lookup)
#[query]
pub fn get_token_for_station(station_id: Principal) -> Option<Principal> {
    use crate::storage::state::STATION_TO_TOKEN;
    STATION_TO_TOKEN.with(|mapping| {
        mapping
            .borrow()
            .get(&StorablePrincipal(station_id))
            .map(|t| t.0)
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

#[update] // MUST be update, not query for cross-canister calls
pub async fn get_orbit_system_info(token_canister_id: Principal) -> Result<SystemInfoResponseMinimal, String> {
    // Get station ID for token
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| format!("No Orbit Station found for token {}", token_canister_id))?;

    // Call system_info on the station using MINIMAL types (no Option<T>)
    let result: Result<(SystemInfoResultMinimal,), _> = ic_cdk::call(
        station_id,
        "system_info",
        ()
    ).await;

    match result {
        Ok((system_info_result,)) => {
            match system_info_result {
                SystemInfoResultMinimal::Ok { system } => {
                    Ok(SystemInfoResponseMinimal {
                        station_id,
                        system_info: system,
                    })
                },
                SystemInfoResultMinimal::Err(e) => {
                    Err(format!("Orbit Station error: {:?}", e))
                }
            }
        },
        Err((code, msg)) => {
            Err(format!("Failed to call system_info: {:?} - {}", code, msg))
        }
    }
}

#[update]
pub async fn list_orbit_accounts(
    token_canister_id: Principal,
    search_term: String,  // Empty string instead of None
    limit: u16,           // Concrete value, default 50
    offset: u64,          // Concrete value, default 0
) -> Result<ListAccountsResultMinimal, String> {
    // Lookup station_id from token_id
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
    }).ok_or_else(|| format!(
        "No Orbit Station found for token {}",
        token_canister_id
    ))?;

    // Build MINIMAL input (no Option<T>!)
    let input = ListAccountsInputMinimal {
        search_term,  // Empty string if not searching
        paginate: PaginationInputMinimal {
            offset,
            limit,
        },
    };

    // Call the Orbit Station canister with minimal types
    let result: Result<(ListAccountsResultMinimal,), _> =
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
    _title: String,
    _description: String,
    memo: Option<String>,
    token_id: Principal,
) -> Result<String, String> {
    use crate::proposals::unified::{TransferDetails, OrbitOperation};

    let transfer_details = TransferDetails {
        from_account_id,
        from_asset_id,
        to: to_address,
        amount,
        memo,
        title: "Transfer request".to_string(),
        description: "Transfer requested via DAOPad".to_string(),
    };

    match crate::proposals::unified::create_orbit_request_with_proposal(
        token_id,
        OrbitOperation::Transfer(transfer_details)
    ).await {
        Ok(request_id) => Ok(request_id),
        Err(e) => Err(format!("Failed to create transfer request: {:?}", e))
    }
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
        sort_by: (),
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

// ========== TREASURY MANAGEMENT FOR OPERATING AGREEMENT ==========

use crate::api::orbit_accounts::Asset;
use std::collections::HashMap;

/// Get comprehensive treasury management data for Operating Agreement Article V
///
/// This method aggregates:
/// - All treasury accounts with balances and policies
/// - Address book entries (authorized recipients)
/// - Backend privilege summary
#[update]
pub async fn get_treasury_management_data(
    station_id: Principal,
) -> Result<TreasuryManagementData, String> {

    // 2. List all accounts using MINIMAL input (no Option<T>)
    let accounts_input = ListAccountsInputMinimal {
        search_term: String::new(),  // Empty = no filter
        paginate: PaginationInputMinimal {
            offset: 0,
            limit: 50,
        },
    };

    let accounts_result: Result<(ListAccountsResultMinimal,), _> = ic_cdk::call(
        station_id,
        "list_accounts",
        (accounts_input,)
    ).await;

    let (accounts, privileges) = match accounts_result {
        Ok((ListAccountsResultMinimal::Ok { accounts, privileges, .. },)) => (accounts, privileges),
        Ok((ListAccountsResultMinimal::Err(e),)) => {
            return Err(format!("Failed to list accounts: {:?}", e));
        }
        Err((code, msg)) => {
            return Err(format!("Failed to call list_accounts: {:?} - {}", code, msg));
        }
    };

    // 3. Get all assets once for lookup
    let assets_result: Result<(crate::api::orbit_transfers::ListAssetsResult,), _> = ic_cdk::call(
        station_id,
        "list_assets",
        (crate::api::orbit_transfers::ListAssetsInput { paginate: None },)
    ).await;

    let asset_map: HashMap<String, Asset> = match assets_result {
        Ok((crate::api::orbit_transfers::ListAssetsResult::Ok { assets, .. },)) => {
            assets.into_iter().map(|a| (a.id.clone(), a)).collect()
        }
        _ => HashMap::new(),
    };

    // 4. Build treasury account details
    let mut treasury_accounts = Vec::new();
    for account in accounts {
        // Get privileges for this account
        let priv_info = privileges.iter().find(|p| p.id == account.id);
        let can_transfer = priv_info.map_or(false, |p| p.can_transfer);
        let can_edit = priv_info.map_or(false, |p| p.can_edit);

        // Format assets with balances
        // NOTE: Balance data is now included in AccountAsset.balance (Option<AccountBalance>)
        // list_accounts returns balance data embedded in each asset
        let mut asset_balances = Vec::new();
        for account_asset in &account.assets {
            if let Some(asset_info) = asset_map.get(&account_asset.asset_id) {
                // Extract balance from Option<AccountBalance>
                let balance_u64 = account_asset.balance
                    .as_ref()
                    .map(|b| nat_to_u64(&b.balance))
                    .unwrap_or(0);

                let balance_formatted = format_balance(balance_u64, asset_info.decimals);

                asset_balances.push(AssetBalanceInfo {
                    symbol: asset_info.symbol.clone(),
                    decimals: asset_info.decimals,
                    balance: balance_u64.to_string(),
                    balance_formatted,
                });
            }
        }

        treasury_accounts.push(TreasuryAccountDetails {
            account_id: account.id.clone(),
            account_name: account.name.clone(),
            assets: asset_balances,
            // Policy fields removed from AccountMinimal to avoid Option<T> deserialization errors
            transfer_policy: "Policy data unavailable (Candid limitation)".to_string(),
            config_policy: "Policy data unavailable (Candid limitation)".to_string(),
            can_transfer,
            can_edit,
            addresses: account.addresses.clone(),
        });
    }

    // 5. Get address book entries
    let address_book_input = ListAddressBookInput {
        ids: None,
        addresses: None,
        paginate: None,
    };

    let address_book_result: Result<(ListAddressBookResult,), _> = ic_cdk::call(
        station_id,
        "list_address_book_entries",
        (address_book_input,)
    ).await;

    let address_book = match address_book_result {
        Ok((ListAddressBookResult::Ok { address_book_entries, .. },)) => {
            address_book_entries.iter().map(|entry| {
                // Extract name from metadata if present
                let name = entry.metadata.iter()
                    .find(|m| m.key == "name")
                    .map(|m| m.value.clone())
                    .unwrap_or_else(|| entry.address_owner.clone());

                let purpose = entry.metadata.iter()
                    .find(|m| m.key == "purpose")
                    .map(|m| m.value.clone());

                TreasuryAddressBookEntry {
                    id: entry.id.clone(),
                    name,
                    address: entry.address.clone(),
                    blockchain: entry.blockchain.clone(),
                    purpose,
                }
            }).collect()
        }
        _ => vec![],
    };

    // 6. Generate summary of backend's privileges
    let transfer_count = treasury_accounts.iter().filter(|a| a.can_transfer).count();
    let edit_count = treasury_accounts.iter().filter(|a| a.can_edit).count();
    let backend_summary = format!(
        "DAOPad backend can initiate transfers from {} account(s) and edit {} account(s)",
        transfer_count, edit_count
    );

    Ok(TreasuryManagementData {
        accounts: treasury_accounts,
        address_book,
        backend_privileges_summary: backend_summary,
    })
}

// Helper: Format policy for human reading
fn format_policy(policy: &Option<RequestPolicyRule>) -> String {
    match policy {
        None => "No policy configured".to_string(),
        Some(RequestPolicyRule::AutoApproved) => "Auto-Approved".to_string(),
        Some(RequestPolicyRule::Quorum(q)) => {
            format!("Requires {} approver(s)", q.min_approved)
        }
        Some(RequestPolicyRule::QuorumPercentage(qp)) => {
            format!("Requires {}% approval", qp.min_approved)
        }
        Some(RequestPolicyRule::AllowListed) => "Allow-listed".to_string(),
        Some(RequestPolicyRule::AllowListedByMetadata(_)) => "Allow-listed by metadata".to_string(),
        Some(RequestPolicyRule::AnyOf(_)) => "Any-of rule".to_string(),
        Some(RequestPolicyRule::AllOf(_)) => "All-of rule".to_string(),
        Some(RequestPolicyRule::Not(_)) => "Negation rule".to_string(),
        Some(RequestPolicyRule::NamedRule(id)) => format!("Named rule: {}", id),
    }
}

fn nat_to_u64(nat: &candid::Nat) -> u64 {
    let bytes = nat.0.to_bytes_le();
    if bytes.len() <= 8 {
        let mut array = [0u8; 8];
        array[..bytes.len()].copy_from_slice(&bytes);
        u64::from_le_bytes(array)
    } else {
        u64::MAX
    }
}

fn format_balance(amount: u64, decimals: u32) -> String {
    if decimals == 0 {
        return amount.to_string();
    }

    let divisor = 10u64.pow(decimals);
    let whole = amount / divisor;
    let frac = amount % divisor;

    // Format with proper decimal places, trim trailing zeros
    let formatted = format!("{}.{:0width$}", whole, frac, width = decimals as usize);
    formatted.trim_end_matches('0').trim_end_matches('.').to_string()
}
