mod orbit_integration;

use candid::{CandidType, Deserialize, Principal, Nat};
use serde::Serialize;
use std::cell::RefCell;
use std::collections::BTreeMap;

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

// Pool voting status
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct PoolStatus {
    pub current_votes: f64,
    pub has_user_voted: bool,
    pub dao_created: bool,
    pub station_id: Option<String>,
}

// Vote result
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum VoteResult {
    Voted { new_total: f64 },
    DaoCreated { station_id: String, total_votes: f64 },
}

// Storage
thread_local! {
    // Maps pool_id to total votes
    static VOTES: RefCell<BTreeMap<u64, f64>> = RefCell::new(BTreeMap::new());
    // Maps (pool_id, voter) to vote amount
    static VOTERS: RefCell<BTreeMap<(u64, Principal), f64>> = RefCell::new(BTreeMap::new());
    // Set of pool_ids that have DAOs created
    static CREATED_DAOS: RefCell<BTreeMap<u64, String>> = RefCell::new(BTreeMap::new());
    static LBRYFUN_CANISTER_ID: RefCell<Option<Principal>> = RefCell::new(None);
}

const VOTE_THRESHOLD: f64 = 20.0;

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

// Vote for a pool to create a DAO
#[ic_cdk::update]
async fn vote(pool_id: u64, staked_alex_balance: String) -> Result<VoteResult, String> {
    let caller = ic_cdk::caller();
    
    // Parse the staked balance
    let balance: f64 = staked_alex_balance.parse()
        .map_err(|_| "Invalid staked balance format".to_string())?;
    
    if balance <= 0.0 {
        return Err("Must have staked ALEX to vote".to_string());
    }

    // Check if DAO already exists
    let dao_exists = CREATED_DAOS.with(|daos| daos.borrow().contains_key(&pool_id));
    if dao_exists {
        return Err("DAO already created for this pool".to_string());
    }

    // Check if user already voted
    let already_voted = VOTERS.with(|voters| {
        voters.borrow().contains_key(&(pool_id, caller))
    });
    if already_voted {
        return Err("You have already voted for this pool".to_string());
    }

    // Record the vote
    VOTERS.with(|voters| {
        voters.borrow_mut().insert((pool_id, caller), balance);
    });

    // Update total votes
    let new_total = VOTES.with(|votes| {
        let mut votes_mut = votes.borrow_mut();
        let current = votes_mut.get(&pool_id).copied().unwrap_or(0.0);
        let new_total = current + balance;
        votes_mut.insert(pool_id, new_total);
        new_total
    });

    // Check if threshold is met
    if new_total >= VOTE_THRESHOLD {
        // Fetch pool info and create DAO
        match fetch_lbryfun_pool_info(pool_id).await {
            Ok(pool_info) => {
                let station_name = format!("{} DAO", pool_info.primary_token_symbol);
                match orbit_integration::open_station(station_name).await {
                    Ok(station_id) => {
                        let station_id_text = station_id.to_text();
                        ic_cdk::print(format!("Created Orbit station: {}", station_id_text));
                        
                        // Record DAO creation
                        CREATED_DAOS.with(|daos| {
                            daos.borrow_mut().insert(pool_id, station_id_text.clone());
                        });
                        
                        // Clean up votes data to save storage
                        VOTES.with(|votes| votes.borrow_mut().remove(&pool_id));
                        VOTERS.with(|voters| {
                            let mut voters_mut = voters.borrow_mut();
                            voters_mut.retain(|(pid, _), _| *pid != pool_id);
                        });
                        
                        Ok(VoteResult::DaoCreated { 
                            station_id: station_id_text, 
                            total_votes: new_total 
                        })
                    },
                    Err(e) => {
                        Err(format!("Failed to create Orbit station: {}", e))
                    }
                }
            },
            Err(e) => {
                Err(format!("Failed to fetch pool info: {}", e))
            }
        }
    } else {
        Ok(VoteResult::Voted { new_total })
    }
}

// Get voting status for a pool
#[ic_cdk::query]
fn get_pool_status(pool_id: u64) -> PoolStatus {
    let caller = ic_cdk::caller();
    
    let current_votes = VOTES.with(|votes| {
        votes.borrow().get(&pool_id).copied().unwrap_or(0.0)
    });
    
    let has_user_voted = VOTERS.with(|voters| {
        voters.borrow().contains_key(&(pool_id, caller))
    });
    
    let (dao_created, station_id) = CREATED_DAOS.with(|daos| {
        match daos.borrow().get(&pool_id) {
            Some(station) => (true, Some(station.clone())),
            None => (false, None)
        }
    });
    
    PoolStatus {
        current_votes,
        has_user_voted,
        dao_created,
        station_id,
    }
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