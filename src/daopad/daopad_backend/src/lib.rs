use candid::{CandidType, Decode, Deserialize, Encode, Principal};
use ic_cdk::{init, query, update};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    DefaultMemoryImpl, StableBTreeMap, Storable,
    storable::Bound,
};
use std::borrow::Cow;
use std::cell::RefCell;
use std::collections::HashSet;

mod orbit_integration;

type Memory = VirtualMemory<DefaultMemoryImpl>;

const TOKEN_STATIONS_MEM_ID: MemoryId = MemoryId::new(0);
const LP_PRINCIPALS_MEM_ID: MemoryId = MemoryId::new(1);
const DAO_REGISTRATIONS_MEM_ID: MemoryId = MemoryId::new(2);

const ICP_TOKEN: &str = "ryjl3-tyaaa-aaaaa-aaaba-cai";
const CKUSDT_TOKEN: &str = "cngnf-vqaaa-aaaar-qag4q-cai";
const LP_LOCKER_BACKEND: &str = "7zv6y-5qaaa-aaaar-qbviq-cai";

// Wrapper types for Storable implementation
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
struct StorablePrincipal(Principal);

impl Storable for StorablePrincipal {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.as_slice().to_vec())
    }
    
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Self(Principal::from_slice(bytes.as_ref()))
    }
    
    const BOUND: Bound = Bound::Bounded {
        max_size: 29,
        is_fixed_size: false,
    };
}

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
struct StorableString(String);

impl Storable for StorableString {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.as_bytes().to_vec())
    }
    
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Self(String::from_utf8(bytes.to_vec()).unwrap_or_default())
    }
    
    const BOUND: Bound = Bound::Bounded {
        max_size: 200,
        is_fixed_size: false,
    };
}

#[derive(CandidType, Deserialize, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct UserTokenKey {
    pub user: Principal,
    pub token: Principal,
}

impl Storable for UserTokenKey {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }
    
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
    
    const BOUND: Bound = Bound::Bounded {
        max_size: 100,
        is_fixed_size: false,
    };
}

#[derive(CandidType, Deserialize, Clone)]
pub struct RegistrationInfo {
    pub request_id: String,
    pub timestamp: u64,
    pub user_name: String,
    pub token_canister: Principal,
}

impl Storable for RegistrationInfo {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }
    
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
    
    const BOUND: Bound = Bound::Bounded {
        max_size: 500,
        is_fixed_size: false,
    };
}

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = 
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
    
    static TOKEN_STATIONS: RefCell<StableBTreeMap<StorablePrincipal, StorablePrincipal, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(TOKEN_STATIONS_MEM_ID))
        )
    );
    
    static LP_PRINCIPALS: RefCell<StableBTreeMap<StorablePrincipal, StorableString, Memory>> = 
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with(|m| m.borrow().get(LP_PRINCIPALS_MEM_ID))
            )
        );
    
    static DAO_REGISTRATIONS: RefCell<StableBTreeMap<UserTokenKey, RegistrationInfo, Memory>> = 
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with(|m| m.borrow().get(DAO_REGISTRATIONS_MEM_ID))
            )
        );
}

#[init]
fn init() {
    // Clean initialization - no defaults
}

// Token-to-Station Management

#[update]
fn link_token_to_station(token_canister: Principal, orbit_station: Principal) -> Result<String, String> {
    TOKEN_STATIONS.with(|stations| {
        let mut stations = stations.borrow_mut();
        if stations.contains_key(&StorablePrincipal(token_canister)) {
            return Err(format!("Token {} already has a station", token_canister));
        }
        stations.insert(StorablePrincipal(token_canister), StorablePrincipal(orbit_station));
        Ok(format!("Token {} linked to station {}", token_canister, orbit_station))
    })
}

#[query]
fn get_station_for_token(token_canister: Principal) -> Option<Principal> {
    TOKEN_STATIONS.with(|stations| {
        stations.borrow().get(&StorablePrincipal(token_canister)).map(|sp| sp.0)
    })
}

#[query]
fn list_token_stations() -> Vec<(Principal, Principal)> {
    TOKEN_STATIONS.with(|stations| {
        let stations = stations.borrow();
        let mut result = Vec::new();
        for (token, station) in stations.iter() {
            result.push((token.0, station.0));
        }
        result
    })
}

#[update]
fn unlink_token_from_station(token_canister: Principal) -> Result<String, String> {
    TOKEN_STATIONS.with(|stations| {
        if stations.borrow_mut().remove(&StorablePrincipal(token_canister)).is_some() {
            Ok(format!("Token {} unlinked from station", token_canister))
        } else {
            Err(format!("Token {} has no station linked", token_canister))
        }
    })
}

// LP Principal Management

#[update]
fn set_lp_principal(lp_principal: String) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }
    
    if lp_principal.is_empty() {
        return Err("LP principal cannot be empty".to_string());
    }
    
    LP_PRINCIPALS.with(|principals| {
        principals.borrow_mut().insert(StorablePrincipal(caller), StorableString(lp_principal));
    });
    
    Ok("LP principal set successfully".to_string())
}

#[query]
fn get_my_lp_principal() -> Option<String> {
    let caller = ic_cdk::caller();
    LP_PRINCIPALS.with(|p| p.borrow().get(&StorablePrincipal(caller)).map(|s| s.0))
}

// LP Position Types - matches LP Locker's LPBalancesReply

#[derive(CandidType, Deserialize)]
pub struct LPBalancesReply {
    pub ts: u64,
    pub usd_balance: f64,
    pub balance: f64,
    pub name: String,
    pub amount_0: f64,
    pub amount_1: f64,
    pub address_0: String,  // Token 0 principal as string
    pub address_1: String,  // Token 1 principal as string
    pub symbol_0: String,
    pub symbol_1: String,
    pub usd_amount_0: f64,
    pub usd_amount_1: f64,
    pub chain_0: String,
    pub chain_1: String,
    pub symbol: String,
    pub lp_token_id: u64,
}

// Query LP Locker for user's positions
async fn query_lp_locker_positions(lp_principal: String) -> Result<Vec<LPBalancesReply>, String> {
    let lp_locker = Principal::from_text(LP_LOCKER_BACKEND)
        .map_err(|e| format!("Invalid LP Locker ID: {}", e))?;
    
    // Call get_all_lp_positions and filter for our user
    let result: Result<(Vec<(String, Vec<LPBalancesReply>)>,), _> = ic_cdk::call(
        lp_locker,
        "get_all_lp_positions",
        ()
    ).await;
    
    match result {
        Ok((all_positions,)) => {
            // Find positions for the given LP principal
            for (user_principal, positions) in all_positions {
                if user_principal == lp_principal {
                    return Ok(positions);
                }
            }
            // No positions found for this principal
            Ok(vec![])
        },
        Err((code, msg)) => Err(format!("Failed to query LP positions: {:?} - {}", code, msg))
    }
}

fn extract_unique_tokens(positions: Vec<LPBalancesReply>) -> HashSet<Principal> {
    let icp = Principal::from_text(ICP_TOKEN).unwrap();
    let ckusdt = Principal::from_text(CKUSDT_TOKEN).unwrap();
    
    let mut tokens = HashSet::new();
    for pos in positions {
        // Parse token principals from address strings
        if let Ok(token_0) = Principal::from_text(&pos.address_0) {
            if token_0 != icp && token_0 != ckusdt {
                tokens.insert(token_0);
            }
        }
        if let Ok(token_1) = Principal::from_text(&pos.address_1) {
            if token_1 != icp && token_1 != ckusdt {
                tokens.insert(token_1);
            }
        }
    }
    tokens
}

// DAO Detection and Registration

#[derive(CandidType, Deserialize)]
pub struct TokenDAOStatus {
    pub token_canister: Principal,
    pub station_canister: Option<Principal>,
    pub is_registered: bool,
}

#[update]
async fn detect_available_daos() -> Result<Vec<TokenDAOStatus>, String> {
    let caller = ic_cdk::caller();
    
    let lp_principal = LP_PRINCIPALS.with(|p| p.borrow().get(&StorablePrincipal(caller)).map(|s| s.0))
        .ok_or("Please set your LP principal first".to_string())?;
    
    let positions = query_lp_locker_positions(lp_principal).await?;
    let unique_tokens = extract_unique_tokens(positions);
    
    let mut available = vec![];
    for token in unique_tokens {
        let station = TOKEN_STATIONS.with(|s| s.borrow().get(&StorablePrincipal(token)).map(|sp| sp.0));
        let already_registered = DAO_REGISTRATIONS.with(|r| 
            r.borrow().contains_key(&UserTokenKey { user: caller, token })
        );
        
        available.push(TokenDAOStatus {
            token_canister: token,
            station_canister: station,
            is_registered: already_registered,
        });
    }
    
    Ok(available)
}

#[update]
async fn register_with_token_dao(token_canister: Principal) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }
    
    let _lp_principal = LP_PRINCIPALS.with(|p| p.borrow().get(&StorablePrincipal(caller)).map(|s| s.0))
        .ok_or("Please set your LP principal first".to_string())?;
    
    let orbit_station = TOKEN_STATIONS.with(|s| s.borrow().get(&StorablePrincipal(token_canister)).map(|sp| sp.0))
        .ok_or(format!("Token {} has no DAO/station yet", token_canister))?;
    
    let existing = DAO_REGISTRATIONS.with(|regs| {
        regs.borrow().get(&UserTokenKey { user: caller, token: token_canister })
    });
    
    if existing.is_some() {
        return Err(format!("Already registered with token {}'s DAO", token_canister));
    }
    
    let caller_text = caller.to_text();
    let user_name = format!(
        "LP Holder {}...{}",
        &caller_text[..5.min(caller_text.len())],
        &caller_text[caller_text.len().saturating_sub(3)..]
    );
    
    let request_id = orbit_integration::create_user_in_orbit(
        user_name.clone(),
        caller,
        false,
        orbit_station,
    ).await?;
    
    let registration = RegistrationInfo {
        request_id,
        timestamp: ic_cdk::api::time(),
        user_name,
        token_canister,
    };
    
    DAO_REGISTRATIONS.with(|regs| {
        regs.borrow_mut().insert(
            UserTokenKey { user: caller, token: token_canister },
            registration
        );
    });
    
    Ok(format!("Registered with token {}'s DAO successfully", token_canister))
}

#[query]
fn get_my_dao_registrations() -> Vec<(Principal, RegistrationInfo)> {
    let caller = ic_cdk::caller();
    DAO_REGISTRATIONS.with(|regs| {
        let regs = regs.borrow();
        let mut result = Vec::new();
        for (key, info) in regs.iter() {
            if key.user == caller {
                result.push((key.token, info.clone()));
            }
        }
        result
    })
}

#[query]
fn check_registration_for_token(token_canister: Principal) -> Option<RegistrationInfo> {
    let caller = ic_cdk::caller();
    DAO_REGISTRATIONS.with(|regs| {
        regs.borrow().get(&UserTokenKey { user: caller, token: token_canister })
    })
}

#[query]
fn list_all_registrations() -> Vec<(String, RegistrationInfo)> {
    DAO_REGISTRATIONS.with(|regs| {
        let regs = regs.borrow();
        let mut result = Vec::new();
        for (key, info) in regs.iter() {
            result.push((key.user.to_text(), info.clone()));
        }
        result
    })
}

// LP Positions Query
#[update]
async fn get_my_lp_positions() -> Result<Vec<LPBalancesReply>, String> {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }
    
    let lp_principal = LP_PRINCIPALS.with(|p| p.borrow().get(&StorablePrincipal(caller)).map(|s| s.0))
        .ok_or("Please set your LP principal first".to_string())?;
    
    query_lp_locker_positions(lp_principal).await
}

// DAO Admin Functions for Orbit Station

#[update]
async fn dao_approve_request(token_canister: Principal, request_id: String, reason: Option<String>) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }
    
    // Check if user is registered with this DAO
    let is_registered = DAO_REGISTRATIONS.with(|r| 
        r.borrow().contains_key(&UserTokenKey { user: caller, token: token_canister })
    );
    
    if !is_registered {
        return Err(format!("Not registered with token {}'s DAO", token_canister));
    }
    
    // Get the station for this token
    let orbit_station = TOKEN_STATIONS.with(|s| s.borrow().get(&StorablePrincipal(token_canister)).map(|sp| sp.0))
        .ok_or(format!("Token {} has no DAO/station", token_canister))?;
    
    // Execute approval via Orbit Station
    orbit_integration::approve_request_in_orbit(request_id, reason, orbit_station).await
}

#[update]
async fn dao_reject_request(token_canister: Principal, request_id: String, reason: Option<String>) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }
    
    // Check if user is registered with this DAO
    let is_registered = DAO_REGISTRATIONS.with(|r| 
        r.borrow().contains_key(&UserTokenKey { user: caller, token: token_canister })
    );
    
    if !is_registered {
        return Err(format!("Not registered with token {}'s DAO", token_canister));
    }
    
    // Get the station for this token
    let orbit_station = TOKEN_STATIONS.with(|s| s.borrow().get(&StorablePrincipal(token_canister)).map(|sp| sp.0))
        .ok_or(format!("Token {} has no DAO/station", token_canister))?;
    
    // Execute rejection via Orbit Station
    orbit_integration::reject_request_in_orbit(request_id, reason, orbit_station).await
}

// Health check
#[query]
fn health_check() -> String {
    format!("DAOPad Multi-DAO Backend - Healthy")
}

// Export candid interface
ic_cdk::export_candid!();