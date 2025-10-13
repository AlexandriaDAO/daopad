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
    pub standard: String,
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
    token_id: Principal,
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