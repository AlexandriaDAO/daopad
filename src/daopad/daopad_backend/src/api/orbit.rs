use crate::client::OrbitClient;
use crate::kong_locker::{get_or_lookup_kong_locker, get_user_locked_tokens};
use crate::storage::state::TOKEN_ORBIT_STATIONS;
use crate::types::orbit::{
    AccountBalance, AccountMetadata, AddAccountOperationInput, Allow, AuthScope,
    FetchAccountBalancesInput, FetchAccountBalancesResult,
    // Minimal types (no Option<T>)
    SystemInfoResultMinimal, SystemInfoResponseMinimal, PaginationInputMinimal,
    ListAccountsInputMinimal, ListAccountsResultMinimal,
    // Original types still needed for some operations
    TreasuryManagementData, TreasuryAccountDetails,
    TreasuryAddressBookEntry, AssetBalanceInfo, ListAddressBookInput, ListAddressBookResult,
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

/// Async helper to get station ID, supporting both token-based and equity stations
/// For equity stations (LLCs), the station ID is the input itself
/// For token-based DAOs, we look up the linked station
pub async fn get_station_id_for_token_or_equity(token_canister_id: Principal) -> Result<Principal, String> {
    // Check if this is an equity station first
    let admin_canister = Principal::from_text("odkrm-viaaa-aaaap-qp2oq-cai")
        .expect("Invalid admin canister ID");

    let is_equity_result: Result<(bool,), _> = ic_cdk::call(
        admin_canister,
        "is_equity_station",
        (token_canister_id,)
    ).await;

    if let Ok((true,)) = is_equity_result {
        // This is an equity station - use it directly
        Ok(token_canister_id)
    } else {
        // This is a token - look up its station
        get_orbit_station_for_token(token_canister_id)
            .ok_or_else(|| "No Orbit Station linked to this token".to_string())
    }
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
    // Check if this is an equity station (LLCs don't have tokens)
    let admin_canister = Principal::from_text("odkrm-viaaa-aaaap-qp2oq-cai")
        .expect("Invalid admin canister ID");

    let is_equity_result: Result<(bool,), _> = ic_cdk::call(
        admin_canister,
        "is_equity_station",
        (token_canister_id,)
    ).await;

    let station_id = if let Ok((true,)) = is_equity_result {
        // This is an equity station - use it directly
        token_canister_id
    } else {
        // This is a token - look up its station
        get_orbit_station_for_token(token_canister_id)
            .ok_or_else(|| format!("No Orbit Station found for token {}", token_canister_id))?
    };

    // Call system_info on the station using MINIMAL types (no Option<T>)
    let system = OrbitClient::call::<_, SystemInfoResultMinimal, _>(
        station_id,
        "system_info",
        (),
    ).await?;

    Ok(SystemInfoResponseMinimal {
        station_id,
        system_info: system,
    })
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

    // Call the Orbit Station canister with minimal types using OrbitClient
    OrbitClient::call_raw(station_id, "list_accounts", input).await
}

#[update]
pub async fn fetch_orbit_account_balances(
    station_id: Principal,
    account_ids: Vec<String>,
) -> Result<Vec<Option<AccountBalance>>, String> {
    // Build the input for fetch_account_balances
    let input = FetchAccountBalancesInput { account_ids };

    // Call the Orbit Station canister using OrbitClient
    OrbitClient::fetch_account_balances(station_id, input).await
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

    // Call Orbit Station to create the request using OrbitClient
    let response = OrbitClient::create_request(station_id, request_input).await?;

    Ok(format!(
        "Successfully created treasury account request. Request ID: {}. Status: {:?}",
        response.request.id, response.request.status
    ))
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

    let (accounts, privileges) = OrbitClient::call::<_, ListAccountsResultMinimal, _>(
        station_id,
        "list_accounts",
        accounts_input,
    ).await?;

    // 3. Get all assets once for lookup
    use crate::api::orbit_transfers::{ListAssetsInput, ListAssetsResult};
    let assets_result: Result<(ListAssetsResult,), _> = ic_cdk::call(
        station_id,
        "list_assets",
        (ListAssetsInput { paginate: None },)
    ).await;

    let asset_map: HashMap<String, Asset> = match assets_result {
        Ok((ListAssetsResult::Ok { assets, .. },)) => {
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

    // 5. Get address book entries using OrbitClient
    let address_book_input = ListAddressBookInput {
        ids: None,
        addresses: None,
        paginate: None,
    };

    let address_book_entries = OrbitClient::call::<_, ListAddressBookResult, _>(
        station_id,
        "list_address_book_entries",
        address_book_input,
    ).await.unwrap_or_default();

    let address_book: Vec<TreasuryAddressBookEntry> = address_book_entries.iter().map(|entry| {
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
    }).collect();

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
