use crate::storage::state::TOKEN_ORBIT_STATIONS;
use crate::types::orbit::*;
use crate::types::StorablePrincipal;
use candid::{CandidType, Deserialize, Principal};
use ic_cdk::{call, update};
use serde::Serialize;

// Add asset input from frontend (uses shared AssetMetadata from orbit.rs)
#[derive(CandidType, Deserialize, Debug)]
pub struct AddAssetInput {
    pub blockchain: String,
    pub standards: Vec<String>,
    pub symbol: String,
    pub name: String,
    pub metadata: Vec<AssetMetadata>,
    pub decimals: u32,
}

// Add asset operation with governance
#[update]
pub async fn add_treasury_asset(
    token_canister_id: Principal,
    asset_input: AddAssetInput,
) -> Result<String, String> {
    // 1. Get station ID for token
    let station_id = TOKEN_ORBIT_STATIONS
        .with(|s| {
            s.borrow()
                .get(&StorablePrincipal(token_canister_id))
                .map(|s| s.0)
        })
        .ok_or_else(|| "No Orbit Station found for token".to_string())?;

    // 2. Build operation
    let operation = RequestOperationInput::AddAsset(AddAssetOperationInput {
        blockchain: asset_input.blockchain.clone(),
        standards: asset_input.standards.clone(),
        symbol: asset_input.symbol.clone(),
        name: asset_input.name.clone(),
        metadata: asset_input.metadata,
        decimals: asset_input.decimals,
    });

    // Create request input
    let request_input = CreateRequestInput {
        operation,
        title: Some(format!("Add {} Asset", asset_input.symbol)),
        summary: Some(format!(
            "Add support for {} ({}) token on {} blockchain",
            asset_input.name, asset_input.symbol, asset_input.blockchain
        )),
        execution_plan: Some(RequestExecutionSchedule::Immediate),
        expiration_dt: None,
    };

    // 3. Call Orbit Station to create request
    let result: Result<(CreateRequestResult,), _> =
        call(station_id, "create_request", (request_input,)).await;

    match result {
        Ok((CreateRequestResult::Ok(response),)) => {
            let request_id = response.request.id.clone();

            // 4. CRITICAL: Auto-create proposal for governance
            use crate::proposals::ensure_proposal_for_request;

            match ensure_proposal_for_request(
                token_canister_id,
                request_id.clone(),
                "AddAsset".to_string(), // 40% threshold
            )
            .await
            {
                Ok(_proposal_id) => Ok(request_id),
                Err(e) => Err(format!(
                    "GOVERNANCE VIOLATION: Failed to create proposal for asset addition: {:?}",
                    e
                )),
            }
        }
        Ok((CreateRequestResult::Err(err),)) => Err(format!("Orbit error: {}", err)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}

// Edit asset operation with governance
#[update]
pub async fn edit_treasury_asset(
    token_canister_id: Principal,
    asset_id: String,
    name: Option<String>,
    metadata: Option<Vec<AssetMetadata>>,
) -> Result<String, String> {
    let station_id = TOKEN_ORBIT_STATIONS
        .with(|s| {
            s.borrow()
                .get(&StorablePrincipal(token_canister_id))
                .map(|s| s.0)
        })
        .ok_or_else(|| "No Orbit Station found for token".to_string())?;

    let change_metadata = metadata.map(|m| ChangeMetadata::ReplaceAllBy(m));

    let operation = RequestOperationInput::EditAsset(EditAssetOperationInput {
        asset_id: asset_id.clone(),
        name: name.clone(),
        blockchain: None,
        standards: None,
        symbol: None,
        change_metadata,
    });

    let request_input = CreateRequestInput {
        operation,
        title: Some(format!("Edit Asset {}", asset_id)),
        summary: Some("Update asset metadata".to_string()),
        execution_plan: Some(RequestExecutionSchedule::Immediate),
        expiration_dt: None,
    };

    let result: Result<(CreateRequestResult,), _> =
        call(station_id, "create_request", (request_input,)).await;

    match result {
        Ok((CreateRequestResult::Ok(response),)) => {
            let request_id = response.request.id.clone();

            use crate::proposals::ensure_proposal_for_request;

            match ensure_proposal_for_request(
                token_canister_id,
                request_id.clone(),
                "EditAsset".to_string(),
            )
            .await
            {
                Ok(_) => Ok(request_id),
                Err(e) => Err(format!("GOVERNANCE VIOLATION: {:?}", e)),
            }
        }
        Ok((CreateRequestResult::Err(err),)) => Err(format!("Orbit error: {}", err)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}

// Remove asset operation with governance
#[update]
pub async fn remove_treasury_asset(
    token_canister_id: Principal,
    asset_id: String,
) -> Result<String, String> {
    let station_id = TOKEN_ORBIT_STATIONS
        .with(|s| {
            s.borrow()
                .get(&StorablePrincipal(token_canister_id))
                .map(|s| s.0)
        })
        .ok_or_else(|| "No Orbit Station found for token".to_string())?;

    let operation = RequestOperationInput::RemoveAsset(RemoveAssetOperationInput {
        asset_id: asset_id.clone(),
    });

    let request_input = CreateRequestInput {
        operation,
        title: Some(format!("Remove Asset {}", asset_id)),
        summary: Some("Remove asset from treasury".to_string()),
        execution_plan: Some(RequestExecutionSchedule::Immediate),
        expiration_dt: None,
    };

    let result: Result<(CreateRequestResult,), _> =
        call(station_id, "create_request", (request_input,)).await;

    match result {
        Ok((CreateRequestResult::Ok(response),)) => {
            let request_id = response.request.id.clone();

            use crate::proposals::ensure_proposal_for_request;

            match ensure_proposal_for_request(
                token_canister_id,
                request_id.clone(),
                "RemoveAsset".to_string(),
            )
            .await
            {
                Ok(_) => Ok(request_id),
                Err(e) => Err(format!("GOVERNANCE VIOLATION: {:?}", e)),
            }
        }
        Ok((CreateRequestResult::Err(err),)) => Err(format!("Orbit error: {}", err)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}

// List all treasury assets (query through backend as admin proxy)
#[derive(CandidType, Deserialize)]
pub struct ListAssetsInput {
    pub paginate: Option<PaginationInput>,
}

#[derive(CandidType, Deserialize, Serialize)]
pub struct AssetResponse {
    pub id: String,
    pub symbol: String,
    pub name: String,
    pub blockchain: String,
    pub standards: Vec<String>,
    pub decimals: u32,
    pub metadata: Vec<AssetMetadata>,
}

#[derive(CandidType, Deserialize)]
pub struct OrbitAsset {
    pub id: String,
    pub symbol: String,
    pub name: String,
    pub blockchain: String,
    pub standards: Vec<String>,
    pub decimals: u32,
    pub metadata: Vec<AssetMetadata>,
}

#[derive(CandidType, Deserialize)]
pub enum ListAssetsResult {
    Ok { assets: Vec<OrbitAsset> },
    Err(Error),
}

#[update]
pub async fn list_treasury_assets(
    token_canister_id: Principal,
) -> Result<Vec<AssetResponse>, String> {
    // Check if equity station first (LLCs don't have tokens)
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
        TOKEN_ORBIT_STATIONS
            .with(|s| {
                s.borrow()
                    .get(&StorablePrincipal(token_canister_id))
                    .map(|s| s.0)
            })
            .ok_or_else(|| "No Orbit Station found for token".to_string())?
    };

    let result: Result<(ListAssetsResult,), _> = call(
        station_id,
        "list_assets",
        (ListAssetsInput { paginate: None },),
    )
    .await;

    match result {
        Ok((ListAssetsResult::Ok { assets },)) => {
            let response: Vec<AssetResponse> = assets
                .into_iter()
                .map(|a| AssetResponse {
                    id: a.id,
                    symbol: a.symbol,
                    name: a.name,
                    blockchain: a.blockchain,
                    standards: a.standards,
                    decimals: a.decimals,
                    metadata: a.metadata,
                })
                .collect();
            Ok(response)
        }
        Ok((ListAssetsResult::Err(err),)) => Err(format!("Orbit error: {}", err)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}
