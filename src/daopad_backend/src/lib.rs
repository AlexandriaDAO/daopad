mod orbit_integration;

use candid::{CandidType, Deserialize, Principal, Nat};
use serde::Serialize;
use std::cell::RefCell;
use std::collections::HashMap;

// Token info fetched from ICRC1 canister
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct TokenInfo {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub total_supply: Nat,
    pub logo_url: Option<String>,
    pub description: Option<String>,
}

// Proposal types
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Proposal {
    pub id: u64,
    pub proposer: Principal,
    pub pool_canister_id: String,  // Changed from dao_name to pool_canister_id
    pub status: ProposalStatus,
    pub created_at: u64,
    pub accepted_by: Option<Principal>,
    pub accepted_at: Option<u64>,
    pub station_id: Option<String>,
    pub token_info: Option<TokenInfo>,  // Token metadata from the pool
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum ProposalStatus {
    Pending,
    Accepted,
    Executed,
}

// Storage
thread_local! {
    static PROPOSALS: RefCell<HashMap<u64, Proposal>> = RefCell::new(HashMap::new());
    static NEXT_PROPOSAL_ID: RefCell<u64> = RefCell::new(1);
}

#[ic_cdk::init]
fn init(orbit_control_panel_id: Option<String>) {
    orbit_integration::init_control_panel(orbit_control_panel_id);
}

#[ic_cdk::query]
fn get_orbit_control_panel_id() -> String {
    orbit_integration::get_control_panel_id()
}

#[ic_cdk::update]
fn set_orbit_control_panel_id(canister_id: String) {
    orbit_integration::init_control_panel(Some(canister_id));
}

#[ic_cdk::update]
async fn register_with_orbit() -> Result<String, String> {
    orbit_integration::register_with_orbit().await
}

// Create a new proposal for a lbryfun pool
#[ic_cdk::update]
fn create_proposal(pool_canister_id: String) -> Result<u64, String> {
    let trimmed_id = pool_canister_id.trim();
    
    if trimmed_id.is_empty() {
        return Err("Pool canister ID cannot be empty".to_string());
    }

    // Validate that the provided string is a valid Principal
    Principal::from_text(trimmed_id)
        .map_err(|_| "Invalid canister ID format. Must be a valid Principal".to_string())?;

    let proposal_id = NEXT_PROPOSAL_ID.with(|id| {
        let current = *id.borrow();
        *id.borrow_mut() = current + 1;
        current
    });

    let proposal = Proposal {
        id: proposal_id,
        proposer: ic_cdk::caller(),
        pool_canister_id: trimmed_id.to_string(),
        status: ProposalStatus::Pending,
        created_at: ic_cdk::api::time(),
        accepted_by: None,
        accepted_at: None,
        station_id: None,
        token_info: None,
    };

    PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(proposal_id, proposal);
    });

    Ok(proposal_id)
}

// Accept a proposal for a lbryfun pool (requires staked ALEX)
#[ic_cdk::update]
async fn accept_proposal(proposal_id: u64, staked_alex_balance: String) -> Result<String, String> {
    // Parse the staked balance
    let balance: f64 = staked_alex_balance.parse()
        .map_err(|_| "Invalid staked balance format".to_string())?;
    
    if balance <= 0.0 {
        return Err("Must have staked ALEX to accept proposals".to_string());
    }

    // Get and validate the proposal
    let mut proposal = PROPOSALS.with(|proposals| {
        proposals.borrow().get(&proposal_id).cloned()
    }).ok_or("Proposal not found".to_string())?;

    if proposal.status != ProposalStatus::Pending {
        return Err("Proposal is no longer pending".to_string());
    }

    // Update proposal status
    proposal.status = ProposalStatus::Accepted;
    proposal.accepted_by = Some(ic_cdk::caller());
    proposal.accepted_at = Some(ic_cdk::api::time());

    // Parse the canister ID
    let canister_id = Principal::from_text(&proposal.pool_canister_id)
        .map_err(|_| "Invalid canister ID in proposal".to_string())?;

    // Fetch token info from the canister
    match fetch_token_info(canister_id).await {
        Ok(token_info) => {
            proposal.token_info = Some(token_info);
        },
        Err(e) => {
            // Log the error but don't fail the proposal acceptance
            ic_cdk::print(format!("Warning: Failed to fetch token info: {}", e));
        }
    }

    // Mark as executed
    proposal.status = ProposalStatus::Executed;

    // Save updated proposal
    PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(proposal_id, proposal.clone());
    });

    Ok(format!("Proposal accepted for pool: {}", proposal.pool_canister_id))
}

// Get all proposals
#[ic_cdk::query]
fn list_proposals() -> Vec<Proposal> {
    PROPOSALS.with(|proposals| {
        let mut proposal_list: Vec<Proposal> = proposals.borrow().values().cloned().collect();
        proposal_list.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        proposal_list
    })
}

// Get a specific proposal
#[ic_cdk::query]
fn get_proposal(proposal_id: u64) -> Option<Proposal> {
    PROPOSALS.with(|proposals| {
        proposals.borrow().get(&proposal_id).cloned()
    })
}

// Note: create_dao function removed since we're using lbryfun pools instead

#[ic_cdk::update]
async fn get_orbit_stations() -> Result<Vec<(String, String)>, String> {
    let stations = orbit_integration::query_stations().await?;
    Ok(stations.into_iter()
        .map(|(id, name)| (id.to_text(), name))
        .collect())
}

#[ic_cdk::update]
async fn add_me_to_station(
    station_id: String, 
    my_orbit_principal: String
) -> Result<String, String> {
    // Parse inputs
    let station = candid::Principal::from_text(&station_id)
        .map_err(|_| "Invalid station ID".to_string())?;
    
    let orbit_principal = candid::Principal::from_text(&my_orbit_principal)
        .map_err(|_| "Invalid Orbit principal".to_string())?;
    
    // Add the user as operator
    orbit_integration::add_operator_to_station(station, orbit_principal).await
}

// Metadata value type for ICRC1 tokens
#[derive(CandidType, Deserialize, Debug)]
pub enum MetadataValue {
    Nat(Nat),
    Int(i128),
    Text(String),
    Blob(Vec<u8>),
}

// Fetch token info from an ICRC1 canister
async fn fetch_token_info(canister_id: Principal) -> Result<TokenInfo, String> {
    // Fetch name
    let (name,): (String,) = ic_cdk::call(canister_id, "icrc1_name", ())
        .await
        .map_err(|(code, msg)| format!("Failed to fetch token name: {:?} - {}", code, msg))?;

    // Fetch symbol
    let (symbol,): (String,) = ic_cdk::call(canister_id, "icrc1_symbol", ())
        .await
        .map_err(|(code, msg)| format!("Failed to fetch token symbol: {:?} - {}", code, msg))?;

    // Fetch decimals
    let (decimals,): (u8,) = ic_cdk::call(canister_id, "icrc1_decimals", ())
        .await
        .map_err(|(code, msg)| format!("Failed to fetch token decimals: {:?} - {}", code, msg))?;

    // Fetch total supply
    let (total_supply,): (Nat,) = ic_cdk::call(canister_id, "icrc1_total_supply", ())
        .await
        .map_err(|(code, msg)| format!("Failed to fetch total supply: {:?} - {}", code, msg))?;

    // Fetch metadata to look for logo and description
    let (metadata,): (Vec<(String, MetadataValue)>,) = ic_cdk::call(canister_id, "icrc1_metadata", ())
        .await
        .map_err(|(code, msg)| format!("Failed to fetch metadata: {:?} - {}", code, msg))?;

    let mut logo_url = None;
    let mut description = None;

    // Parse metadata for logo and description
    for (key, value) in metadata {
        // Log metadata for debugging
        ic_cdk::print(format!("Metadata key: {}, value: {:?}", key, value));
        
        match key.as_str() {
            "icrc1:logo" | "logo" => {
                match value {
                    MetadataValue::Text(url) => {
                        logo_url = Some(url);
                    },
                    MetadataValue::Blob(data) => {
                        // If logo is stored as blob, try to convert to data URL
                        if data.len() > 0 {
                            // Simple check for common image formats
                            let data_url = if data.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
                                format!("data:image/png;base64,{}", base64::encode(&data))
                            } else if data.starts_with(&[0xFF, 0xD8, 0xFF]) {
                                format!("data:image/jpeg;base64,{}", base64::encode(&data))
                            } else if data.starts_with(&[0x47, 0x49, 0x46]) {
                                format!("data:image/gif;base64,{}", base64::encode(&data))
                            } else if data.starts_with(b"<svg") || data.starts_with(b"<?xml") {
                                // SVG data
                                format!("data:image/svg+xml;base64,{}", base64::encode(&data))
                            } else {
                                // Try as generic image
                                format!("data:image/png;base64,{}", base64::encode(&data))
                            };
                            logo_url = Some(data_url);
                        }
                    },
                    _ => {}
                }
            },
            "icrc1:description" | "description" => {
                if let MetadataValue::Text(desc) = value {
                    description = Some(desc);
                }
            },
            _ => {}
        }
    }

    Ok(TokenInfo {
        name,
        symbol,
        decimals,
        total_supply,
        logo_url,
        description,
    })
}