use crate::api::orbit_requests::Error;
use crate::types::orbit::{
    CreateRequestResponse,
};
use candid::{CandidType, Deserialize, Nat, Principal};

// CreateRequestResult with CORRECT response type (CreateRequestResponse, not GetRequestResponse)
#[derive(CandidType, Deserialize)]
pub enum CreateRequestResult {
    Ok(CreateRequestResponse),
    Err(Error),
}

// RequestWithDetails and related types are now imported from orbit_requests.rs

// Simplified implementation - complex Orbit types will be added in future update
// Note: SubmitRequestApprovalResult and related types are now imported from orbit_requests.rs

// Note: Direct transfer functionality has been removed.
// All transfers now go through the proposal system via create_transfer_request in orbit.rs

// Return a simple message for now until we can properly decode Orbit's complex response
pub async fn get_transfer_requests_from_orbit(
    _station_id: Principal,
) -> Result<Vec<String>, String> {
    // For now, return a simple message since Orbit's Request type has complex IDLValue operations
    // that candid-extractor can't handle properly
    Ok(vec![
        "Transfer requests functionality is available".to_string(),
        "Complex request parsing will be implemented in a future update".to_string(),
        "Users can view requests directly in Orbit Station".to_string(),
    ])
}

// ❌ REMOVED: approve_orbit_request - replaced by liquid democracy voting
// All Orbit request approvals now go through vote_on_orbit_request in proposals/orbit_requests.rs
// The internal approval functions (approve_orbit_request_internal) remain in proposals/orbit_requests.rs
// for use after voting threshold is reached.

// =========== NEW ASSET QUERY METHODS ===========

use crate::api::orbit::get_orbit_station_for_token;
use crate::types::orbit::{Account, AccountBalance};
use crate::api::orbit_accounts::Asset;

// Type definitions for asset queries
#[derive(CandidType, Deserialize)]
pub struct AccountWithAssets {
    pub account: Account,
    pub assets: Vec<AssetWithBalance>,
}

#[derive(CandidType, Deserialize)]
pub struct AssetWithBalance {
    pub asset: Asset,
    pub balance: Option<AccountBalance>,
}

// Input types for Orbit API calls
#[derive(CandidType, Deserialize)]
pub struct GetAccountInput {
    pub account_id: String,
}

#[derive(CandidType, Deserialize)]
pub enum GetAccountResult {
    Ok { account: Account },
    Err(Error),
}

#[derive(CandidType, Deserialize)]
pub struct GetAssetInput {
    pub asset_id: String,
}

#[derive(CandidType, Deserialize)]
pub enum GetAssetResult {
    Ok { asset: Asset },
    Err(Error),
}

#[derive(CandidType, Deserialize)]
pub struct ListAssetsInput {
    pub paginate: Option<PaginateInput>,
}

#[derive(CandidType, Deserialize)]
pub struct PaginateInput {
    pub offset: Option<u64>,
    pub limit: Option<u16>,
}

#[derive(CandidType, Deserialize)]
pub enum ListAssetsResult {
    Ok {
        assets: Vec<Asset>,
        next_offset: Option<u64>,
        total: u64,
    },
    Err(Error),
}

// Get an account with enriched asset details
#[ic_cdk::update]
pub async fn get_account_with_assets(
    token_canister_id: Principal,
    account_id: String,
) -> Result<AccountWithAssets, String> {
    // Get station ID for this token
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or("No Orbit Station registered for this token")?;

    // Query account from Orbit
    let account_result: Result<(GetAccountResult,), _> = ic_cdk::call(
        station_id,
        "get_account",
        (GetAccountInput { account_id: account_id.clone() },)
    ).await;

    match account_result {
        Ok((GetAccountResult::Ok { account },)) => {
            // For each AccountAsset, fetch full Asset details
            let mut enriched_assets = vec![];

            for account_asset in &account.assets {
                // Query full asset details
                let asset_result: Result<(GetAssetResult,), _> = ic_cdk::call(
                    station_id,
                    "get_asset",
                    (GetAssetInput { asset_id: account_asset.asset_id.clone() },)
                ).await;

                if let Ok((GetAssetResult::Ok { asset },)) = asset_result {
                    enriched_assets.push(AssetWithBalance {
                        asset,
                        balance: account_asset.balance.clone(),
                    });
                }
            }

            Ok(AccountWithAssets {
                account,
                assets: enriched_assets,
            })
        }
        Ok((GetAccountResult::Err(e),)) => {
            Err(format!("Failed to get account: {:?}", e))
        }
        Err(e) => {
            Err(format!("Call failed: {:?}", e))
        }
    }
}

// List all available assets in a station
#[ic_cdk::update]
pub async fn list_station_assets(
    token_canister_id: Principal,
) -> Result<Vec<Asset>, String> {
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or("No Orbit Station registered for this token")?;

    let result: Result<(ListAssetsResult,), _> = ic_cdk::call(
        station_id,
        "list_assets",
        (ListAssetsInput { paginate: None },)
    ).await;

    match result {
        Ok((ListAssetsResult::Ok { assets, .. },)) => Ok(assets),
        Ok((ListAssetsResult::Err(e),)) => Err(format!("Failed to list assets: {:?}", e)),
        Err(e) => Err(format!("Call failed: {:?}", e))
    }
}

// ========== GET ACCOUNT ASSETS WITH FORMATTED BALANCES ==========

use serde::Serialize;
use std::collections::HashMap;

#[derive(CandidType, Deserialize, Serialize)]
pub struct AccountAssetInfo {
    pub account_id: String,
    pub account_name: String,
    pub assets: Vec<AssetBalanceInfo>,
}

#[derive(CandidType, Deserialize, Serialize)]
pub struct AssetBalanceInfo {
    pub asset_id: String,
    pub symbol: String,
    pub decimals: u32,
    pub balance: u64,
    pub balance_formatted: String,
}

#[ic_cdk::update]
pub async fn get_account_assets(
    token_canister_id: Principal,
    account_id: String,
) -> Result<AccountAssetInfo, String> {
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or("No Orbit Station registered for this token")?;

    // 1. Get account details
    let account_result: Result<(GetAccountResult,), _> = ic_cdk::call(
        station_id,
        "get_account",
        (GetAccountInput {
            account_id: account_id.clone(),
        },),
    )
    .await;

    let account = match account_result {
        Ok((GetAccountResult::Ok { account },)) => account,
        Ok((GetAccountResult::Err(e),)) => {
            return Err(format!("Failed to get account: {:?}", e))
        }
        Err(e) => return Err(format!("Call failed: {:?}", e)),
    };

    // 2. Get all assets to map IDs to symbols
    let assets_result: Result<(ListAssetsResult,), _> = ic_cdk::call(
        station_id,
        "list_assets",
        (ListAssetsInput { paginate: None },),
    )
    .await;

    let all_assets = match assets_result {
        Ok((ListAssetsResult::Ok { assets, .. },)) => assets,
        Ok((ListAssetsResult::Err(e),)) => {
            return Err(format!("Failed to list assets: {:?}", e))
        }
        Err(e) => return Err(format!("Call failed: {:?}", e)),
    };

    // 3. Create asset map
    let asset_map: HashMap<String, Asset> = all_assets
        .into_iter()
        .map(|a| (a.id.clone(), a))
        .collect();

    // 4. Build response with balances
    let mut asset_balances = Vec::new();
    for account_asset in account.assets {
        if let Some(asset_info) = asset_map.get(&account_asset.asset_id) {
            let balance_nat = account_asset
                .balance
                .as_ref()
                .map(|b| b.balance.clone())
                .unwrap_or(Nat::from(0u64));

            let balance_u64 = nat_to_u64(&balance_nat);
            let balance_formatted = format_balance(balance_u64, asset_info.decimals);

            asset_balances.push(AssetBalanceInfo {
                asset_id: account_asset.asset_id.clone(),
                symbol: asset_info.symbol.clone(),
                decimals: asset_info.decimals,
                balance: balance_u64,
                balance_formatted,
            });
        }
    }

    Ok(AccountAssetInfo {
        account_id: account.id,
        account_name: account.name,
        assets: asset_balances,
    })
}

fn nat_to_u64(nat: &Nat) -> u64 {
    // Convert Nat to u64, handling overflow
    // Try to convert to u64, use MAX if it doesn't fit
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

    // Format with proper decimal places
    format!("{}.{:0width$}", whole, frac, width = decimals as usize)
}
