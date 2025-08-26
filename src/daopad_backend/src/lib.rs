use std::cell::RefCell;
use std::collections::HashMap;
use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;
use ic_cdk::{init, query, update};

// Import the types from alexandria_dao module
mod alexandria_dao;
use alexandria_dao::{get_alex_stake, create_user_in_orbit, check_user_exists_in_orbit};

// ========== STATE MANAGEMENT ==========

#[derive(CandidType, Deserialize, Clone)]
pub struct RegistrationInfo {
    pub request_id: String,
    pub timestamp: u64,
    pub staked_amount: u128,
    pub user_name: String,
}

thread_local! {
    // Track registered users to prevent duplicates
    static REGISTERED_USERS: RefCell<HashMap<Principal, RegistrationInfo>> = 
        RefCell::new(HashMap::new());
    
    // Store Alexandria Station ID for future integration
    static ALEXANDRIA_STATION_ID: RefCell<Option<String>> = RefCell::new(None);
    
    // Configuration - Updated to 10,000 ALEX (1_000_000_000_000 e8s)
    static MINIMUM_STAKE: RefCell<u128> = RefCell::new(1_000_000_000_000); // 10,000 ALEX in e8s
}

// ========== INITIALIZATION ==========

#[init]
fn init(alexandria_station_id: Option<String>) {
    // Initialize with Alexandria Station ID if provided
    if let Some(station_id) = alexandria_station_id {
        ALEXANDRIA_STATION_ID.with(|id| *id.borrow_mut() = Some(station_id));
    }
}

// ========== MAIN REGISTRATION FUNCTION ==========

#[update]
async fn register_as_orbit_operator() -> RegistrationResult {
    // Get caller's principal
    let caller = ic_cdk::caller();
    
    // Check if anonymous
    if caller == Principal::anonymous() {
        return RegistrationResult::Error {
            message: "Authentication required".to_string(),
        };
    }
    
    // Check if already registered
    let existing = REGISTERED_USERS.with(|users| {
        users.borrow().get(&caller).cloned()
    });
    
    if let Some(info) = existing {
        return RegistrationResult::AlreadyRegistered {
            request_id: info.request_id,
            registered_at: info.timestamp,
        };
    }
    
    // Check staking balance
    let stake_info = match get_alex_stake(caller).await {
        Ok(stake_opt) => stake_opt,
        Err(e) => {
            return RegistrationResult::Error {
                message: format!("Failed to check stake: {}", e),
            };
        }
    };
    
    let staked_amount = match stake_info {
        Some(stake) => {
            // Convert u64 to u128 directly (no string parsing needed)
            stake.amount as u128
        },
        None => 0u128,
    };
    
    // Check minimum stake requirement
    let min_stake = MINIMUM_STAKE.with(|s| *s.borrow());
    if staked_amount < min_stake {
        return RegistrationResult::InsufficientStake {
            current: staked_amount,
            required: min_stake,
        };
    }
    
    // Generate user name (first 5 and last 3 of principal)
    let principal_text = caller.to_text();
    let user_name = format!(
        "DAO Member {}...{}",
        &principal_text[..5.min(principal_text.len())],
        &principal_text[principal_text.len().saturating_sub(3)..]
    );
    
    // Create user in Orbit Station
    let request_id = match create_user_in_orbit(
        user_name.clone(),
        caller,
        false, // Not admin by default
    ).await {
        Ok(id) => id,
        Err(e) => {
            return RegistrationResult::Error {
                message: format!("Failed to create user in Orbit Station: {}", e),
            };
        }
    };
    
    // Record registration
    let registration_info = RegistrationInfo {
        request_id: request_id.clone(),
        timestamp: ic_cdk::api::time(),
        staked_amount,
        user_name,
    };
    
    REGISTERED_USERS.with(|users| {
        users.borrow_mut().insert(caller, registration_info);
    });
    
    RegistrationResult::Success {
        request_id,
        message: "Successfully registered as Orbit operator".to_string(),
    }
}

// ========== QUERY FUNCTIONS ==========

#[update]
async fn check_registration_status() -> RegistrationStatus {
    let caller = ic_cdk::caller();
    
    // First check local cache
    let local_registration = REGISTERED_USERS.with(|users| {
        users.borrow().get(&caller).cloned()
    });
    
    let min_stake = MINIMUM_STAKE.with(|s| *s.borrow());
    
    // If found locally, return that
    if let Some(info) = local_registration {
        return RegistrationStatus {
            is_registered: true,
            request_id: Some(info.request_id),
            staked_amount: info.staked_amount,
            required_stake: min_stake,
            user_name: Some(info.user_name),
        };
    }
    
    // Not in local cache, check Orbit Station directly
    match check_user_exists_in_orbit(caller).await {
        Ok(exists) => {
            if exists {
                // User exists in Orbit but not in our cache
                // Get their stake info
                let stake_amount = match get_alex_stake(caller).await {
                    Ok(Some(stake)) => stake.amount as u128,
                    _ => 0u128,
                };
                
                // Generate user name for display
                let principal_text = caller.to_text();
                let user_name = format!(
                    "DAO Member {}...{}",
                    &principal_text[..5.min(principal_text.len())],
                    &principal_text[principal_text.len().saturating_sub(3)..]
                );
                
                // Add to cache for future queries
                let registration_info = RegistrationInfo {
                    request_id: "existing-user".to_string(),
                    timestamp: ic_cdk::api::time(),
                    staked_amount: stake_amount,
                    user_name: user_name.clone(),
                };
                
                REGISTERED_USERS.with(|users| {
                    users.borrow_mut().insert(caller, registration_info);
                });
                
                RegistrationStatus {
                    is_registered: true,
                    request_id: Some("existing-user".to_string()),
                    staked_amount: stake_amount,
                    required_stake: min_stake,
                    user_name: Some(user_name),
                }
            } else {
                RegistrationStatus {
                    is_registered: false,
                    request_id: None,
                    staked_amount: 0,
                    required_stake: min_stake,
                    user_name: None,
                }
            }
        },
        Err(_) => {
            // If we can't check Orbit, fall back to local cache only
            RegistrationStatus {
                is_registered: false,
                request_id: None,
                staked_amount: 0,
                required_stake: min_stake,
                user_name: None,
            }
        }
    }
}

#[query]
fn get_required_stake_amount() -> u128 {
    MINIMUM_STAKE.with(|s| *s.borrow())
}

#[query]
fn list_registered_users() -> Vec<(String, RegistrationInfo)> {
    REGISTERED_USERS.with(|users| {
        users.borrow()
            .iter()
            .map(|(principal, info)| (principal.to_text(), info.clone()))
            .collect()
    })
}

// ========== ADMIN FUNCTIONS ==========

#[update]
fn set_minimum_stake(amount: u128) -> Result<String, String> {
    // Only allow canister controllers to change this
    let caller = ic_cdk::caller();
    
    // In production, add proper authorization check here
    // For now, we'll allow any non-anonymous principal
    if caller == Principal::anonymous() {
        return Err("Unauthorized".to_string());
    }
    
    MINIMUM_STAKE.with(|s| *s.borrow_mut() = amount);
    Ok(format!("Minimum stake updated to {} e8s", amount))
}

// ========== EXISTING ALEXANDRIA DAO INTEGRATION ==========

// Alexandria DAO Integration Methods
#[update]
async fn register_backend_with_alexandria() -> Result<String, String> {
    alexandria_dao::register_with_alexandria_station().await
}

// Returns configuration for frontend to connect directly to Alexandria Orbit Station
#[derive(CandidType, Deserialize, Serialize)]
struct AlexandriaConfig {
    station_canister_id: String,
    backend_principal: String,
    frontend_url: String,
}

#[query]
fn get_alexandria_config() -> AlexandriaConfig {
    AlexandriaConfig {
        station_canister_id: ALEXANDRIA_STATION_ID.with(|id| id.borrow().clone()).unwrap_or_else(|| "fec7w-zyaaa-aaaaa-qaffq-cai".to_string()),
        backend_principal: ic_cdk::id().to_text(),
        frontend_url: "https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io".to_string(),
    }
}

#[query]
fn get_alexandria_station_id() -> Option<String> {
    ALEXANDRIA_STATION_ID.with(|id| id.borrow().clone())
}

#[update]
fn set_alexandria_station_id(station_id: String) {
    ALEXANDRIA_STATION_ID.with(|id| *id.borrow_mut() = Some(station_id));
}

// Keep a simple health check
#[query]
fn health_check() -> String {
    "Backend is running".to_string()
}

// Get the backend canister's principal (useful for debugging/setup)
#[query]
fn get_backend_principal() -> String {
    ic_cdk::id().to_text()
}

#[update]
fn refresh_cache() -> Result<String, String> {
    alexandria_dao::refresh_cache()
}

#[query]
fn get_alexandria_proposals() -> Result<Vec<alexandria_dao::ProposalSummary>, String> {
    // This is a placeholder - actual implementation would need to handle the async nature
    Err("Use frontend direct connection to Orbit Station due to IC query limitations".to_string())
}

#[query]
fn get_cache_status() -> (Option<String>, u32) {
    alexandria_dao::get_cache_status()
}

// ========== TYPE DEFINITIONS ==========

#[derive(CandidType, Deserialize)]
pub enum RegistrationResult {
    Success {
        request_id: String,
        message: String,
    },
    AlreadyRegistered {
        request_id: String,
        registered_at: u64,
    },
    InsufficientStake {
        current: u128,
        required: u128,
    },
    Error {
        message: String,
    },
}

#[derive(CandidType, Deserialize)]
pub struct RegistrationStatus {
    pub is_registered: bool,
    pub request_id: Option<String>,
    pub staked_amount: u128,
    pub required_stake: u128,
    pub user_name: Option<String>,
}

// Export candid interface
ic_cdk::export_candid!();