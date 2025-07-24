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

// Pool info from lbryfun
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct LbryfunPoolInfo {
    pub id: u64,
    pub primary_token_name: String,
    pub primary_token_symbol: String,
    pub secondary_token_name: String,
    pub secondary_token_symbol: String,
    pub pool_creation_failed: bool,
    pub primary_token_id: Principal,
    pub secondary_token_id: Principal,
    pub icp_swap_canister_id: Principal,
    pub tokenomics_canister_id: Principal,
    pub primary_token_max_supply: u64,
    pub halving_step: u64,
    pub created_time: u64,
    pub pool_created_at: u64,
}

// Proposal types
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Proposal {
    pub id: u64,
    pub proposer: Principal,
    pub lbryfun_pool_id: u64,  // Changed to lbryfun pool ID
    pub status: ProposalStatus,
    pub created_at: u64,
    pub accepted_by: Option<Principal>,
    pub accepted_at: Option<u64>,
    pub station_id: Option<String>,
    pub pool_info: Option<LbryfunPoolInfo>,  // Pool data from lbryfun
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
    static LBRYFUN_CANISTER_ID: RefCell<Option<Principal>> = RefCell::new(None);
}

#[ic_cdk::init]
fn init(orbit_control_panel_id: Option<String>, lbryfun_canister_id: Option<String>) {
    orbit_integration::init_control_panel(orbit_control_panel_id);
    
    // Set lbryfun canister ID if provided, otherwise use default local ID
    let lbryfun_id = lbryfun_canister_id
        .unwrap_or_else(|| "oni4e-oyaaa-aaaap-qp2pq-cai".to_string());
    
    if let Ok(principal) = Principal::from_text(&lbryfun_id) {
        LBRYFUN_CANISTER_ID.with(|id| *id.borrow_mut() = Some(principal));
    }
}

#[ic_cdk::query]
fn get_orbit_control_panel_id() -> String {
    orbit_integration::get_control_panel_id()
}

#[ic_cdk::query]
fn get_lbryfun_canister_id() -> Option<String> {
    LBRYFUN_CANISTER_ID.with(|id| {
        id.borrow().as_ref().map(|p| p.to_text())
    })
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
fn create_proposal(lbryfun_pool_id: u64) -> Result<u64, String> {
    let proposal_id = NEXT_PROPOSAL_ID.with(|id| {
        let current = *id.borrow();
        *id.borrow_mut() = current + 1;
        current
    });

    let proposal = Proposal {
        id: proposal_id,
        proposer: ic_cdk::caller(),
        lbryfun_pool_id,
        status: ProposalStatus::Pending,
        created_at: ic_cdk::api::time(),
        accepted_by: None,
        accepted_at: None,
        station_id: None,
        pool_info: None,
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

    // Fetch pool info from lbryfun
    match fetch_lbryfun_pool_info(proposal.lbryfun_pool_id).await {
        Ok(pool_info) => {
            proposal.pool_info = Some(pool_info.clone());
            
            // Create an Orbit station for this DAO
            let station_name = format!("{} DAO", pool_info.primary_token_symbol);
            match orbit_integration::open_station(station_name).await {
                Ok(station_id) => {
                    proposal.station_id = Some(station_id.to_text());
                    ic_cdk::print(format!("Created Orbit station: {}", station_id));
                },
                Err(e) => {
                    ic_cdk::print(format!("Warning: Failed to create Orbit station: {}", e));
                }
            }
        },
        Err(e) => {
            // Log the error but don't fail the proposal acceptance
            ic_cdk::print(format!("Warning: Failed to fetch pool info: {}", e));
        }
    }

    // Mark as executed
    proposal.status = ProposalStatus::Executed;

    // Save updated proposal
    PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(proposal_id, proposal.clone());
    });

    Ok(format!("Proposal accepted for pool ID: {}", proposal.lbryfun_pool_id))
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

// TokenRecord type from lbryfun
#[derive(CandidType, Deserialize)]
struct TokenRecord {
    id: u64,
    secondary_token_symbol: String,
    secondary_token_id: Principal,
    primary_token_name: String,
    tokenomics_canister_id: Principal,
    secondary_token_name: String,
    primary_token_symbol: String,
    launch_delay_seconds: u64,
    icp_swap_canister_id: Principal,
    halving_step: u64,
    primary_token_max_supply: u64,
    pool_creation_failed: bool,
    initial_reward_per_burn_unit: u64,
    initial_primary_mint: u64,
    threshold_multiplier: f64,
    primary_token_id: Principal,
    caller: Principal,
    pool_created_at: u64,
    distribution_interval_seconds: u64,
    created_time: u64,
    initial_secondary_burn: u64,
    logs_canister_id: Principal,
}

// Fetch pool info from lbryfun canister
async fn fetch_lbryfun_pool_info(pool_id: u64) -> Result<LbryfunPoolInfo, String> {
    let lbryfun_canister = LBRYFUN_CANISTER_ID.with(|id| id.borrow().clone())
        .ok_or("Lbryfun canister ID not set".to_string())?;
    
    // Call get_all_token_record to get all pools
    let (all_records,): (Vec<(u64, TokenRecord)>,) = ic_cdk::call(lbryfun_canister, "get_all_token_record", ())
        .await
        .map_err(|(code, msg)| format!("Failed to fetch pool records: {:?} - {}", code, msg))?;
    
    // Find the pool with matching ID
    let (_, record) = all_records.into_iter()
        .find(|(id, _)| *id == pool_id)
        .ok_or_else(|| format!("Pool with ID {} not found", pool_id))?;
    
    Ok(LbryfunPoolInfo {
        id: pool_id,
        primary_token_name: record.primary_token_name,
        primary_token_symbol: record.primary_token_symbol,
        secondary_token_name: record.secondary_token_name,
        secondary_token_symbol: record.secondary_token_symbol,
        pool_creation_failed: record.pool_creation_failed,
        primary_token_id: record.primary_token_id,
        secondary_token_id: record.secondary_token_id,
        icp_swap_canister_id: record.icp_swap_canister_id,
        tokenomics_canister_id: record.tokenomics_canister_id,
        primary_token_max_supply: record.primary_token_max_supply,
        halving_step: record.halving_step,
        created_time: record.created_time,
        pool_created_at: record.pool_created_at,
    })
}