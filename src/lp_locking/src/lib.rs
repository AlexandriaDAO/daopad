use candid::{CandidType, Nat, Principal};
use ic_cdk::{update, query, caller, id};
use ic_stable_structures::{
    StableBTreeMap, storable::Bound, Storable, 
    memory_manager::{MemoryId, MemoryManager, VirtualMemory}, 
    DefaultMemoryImpl
};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::cell::RefCell;
use num_traits::cast::ToPrimitive;

type Memory = VirtualMemory<DefaultMemoryImpl>;

// Memory IDs
const DAOPAD_TO_KONG_MEMORY_ID: MemoryId = MemoryId::new(0);
const KONG_TO_DAOPAD_MEMORY_ID: MemoryId = MemoryId::new(1);
const REGISTRATIONS_MEMORY_ID: MemoryId = MemoryId::new(2);
const VOTING_POWER_MEMORY_ID: MemoryId = MemoryId::new(3);
const CLAIMED_REQUESTS_MEMORY_ID: MemoryId = MemoryId::new(4);
const REQUEST_CACHE_MEMORY_ID: MemoryId = MemoryId::new(5);
const USER_LAST_CLAIM_MEMORY_ID: MemoryId = MemoryId::new(6);

// KongSwap integration constants
const KONG_BACKEND_CANISTER: &str = "2ipq2-uqaaa-aaaar-qailq-cai";

// Time-lock constants
const REGISTRATION_TIMEOUT_NANOS: u64 = 30 * 24 * 60 * 60 * 1_000_000_000; // 30 days
const CLAIM_COOLDOWN: u64 = 3_600_000_000_000; // 1 hour in nanoseconds
const MAX_CACHE_SIZE: u64 = 10000;

// Data structures
#[derive(CandidType, Clone, Debug, Serialize, Deserialize)]
pub struct RegistrationRecord {
    pub daopad_principal: Principal,
    pub kong_principal: Principal,
    pub registered_at: u64,
    pub last_activity: u64,
}

#[derive(CandidType, Clone, Debug, Serialize, Deserialize)]
pub struct ClaimRecord {
    pub claimer: Principal,
    pub kong_principal: Principal,
    pub amount: Nat,
    pub lp_token_symbol: String,
    pub timestamp: u64,
    pub request_id: u64,
}

#[derive(CandidType, Clone, Debug, Serialize, Deserialize)]
pub struct KongRequestDetails {
    pub from: Principal,
    pub to: Principal,
    pub amount: f64,
    pub symbol: String,
    pub status: String,
    pub timestamp: u64,
}

#[derive(CandidType, Serialize)]
pub struct CanisterInfo {
    pub version: String,
    pub description: String,
    pub kong_backend_canister: String,
    pub total_registrations: u64,
    pub has_withdrawal_functions: bool,
}

// KongSwap types
#[derive(CandidType, Clone, Debug, Deserialize, Serialize)]
pub struct KongRequest {
    pub id: u64,
    pub from: Principal,
    pub to: Principal,
    pub amount: f64,
    pub symbol: String,
    pub status: String,
    pub timestamp: u64,
}

#[derive(CandidType, Clone, Debug, Deserialize, Serialize)]
pub struct RequestsResult {
    pub requests: Vec<KongRequest>,
}

// Wrapper type for voting power key to implement Storable
#[derive(Clone, Debug, CandidType, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
struct VotingPowerKey {
    principal: Principal,
    token_symbol: String,
}

// Wrapper type for Nat to implement Storable
#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
struct NatWrapper(Nat);

// Storable implementations
impl Storable for RegistrationRecord {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap())
    }
    
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap()
    }
    
    const BOUND: Bound = Bound::Unbounded;
}

impl Storable for ClaimRecord {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap())
    }
    
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap()
    }
    
    const BOUND: Bound = Bound::Unbounded;
}

impl Storable for KongRequestDetails {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap())
    }
    
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap()
    }
    
    const BOUND: Bound = Bound::Unbounded;
}

impl Storable for VotingPowerKey {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap())
    }
    
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap()
    }
    
    const BOUND: Bound = Bound::Unbounded;
}

impl Storable for NatWrapper {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(&self.0).unwrap())
    }
    
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        NatWrapper(candid::decode_one(&bytes).unwrap())
    }
    
    const BOUND: Bound = Bound::Unbounded;
}

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(
        MemoryManager::init(DefaultMemoryImpl::default())
    );

    static DAOPAD_TO_KONG: RefCell<StableBTreeMap<Principal, Principal, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(DAOPAD_TO_KONG_MEMORY_ID))
        )
    );

    static KONG_TO_DAOPAD: RefCell<StableBTreeMap<Principal, Principal, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(KONG_TO_DAOPAD_MEMORY_ID))
        )
    );

    static REGISTRATIONS: RefCell<StableBTreeMap<Principal, RegistrationRecord, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(REGISTRATIONS_MEMORY_ID))
        )
    );

    static VOTING_POWER: RefCell<StableBTreeMap<VotingPowerKey, NatWrapper, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(VOTING_POWER_MEMORY_ID))
        )
    );

    static CLAIMED_REQUESTS: RefCell<StableBTreeMap<u64, ClaimRecord, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(CLAIMED_REQUESTS_MEMORY_ID))
        )
    );

    static REQUEST_CACHE: RefCell<StableBTreeMap<u64, KongRequestDetails, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(REQUEST_CACHE_MEMORY_ID))
        )
    );

    static USER_LAST_CLAIM: RefCell<StableBTreeMap<Principal, u64, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(USER_LAST_CLAIM_MEMORY_ID))
        )
    );
}

// Safe float conversion functions
pub fn safe_float_to_nat(value: f64, decimals: u8) -> Result<Nat, String> {
    // Edge case validation
    if value.is_nan() {
        return Err("Cannot convert NaN to Nat".to_string());
    }
    
    if value.is_infinite() {
        return Err("Cannot convert infinity to Nat".to_string());
    }
    
    if value < 0.0 {
        return Err("Cannot convert negative value to Nat".to_string());
    }
    
    // Calculate multiplier safely
    let multiplier = 10_u128.checked_pow(decimals as u32)
        .ok_or("Decimal places too large")?;
    
    // Convert to string to preserve precision
    let value_str = format!("{:.precision$}", value, precision = decimals as usize);
    
    // Parse the string representation
    let parts: Vec<&str> = value_str.split('.').collect();
    if parts.len() > 2 {
        return Err("Invalid number format".to_string());
    }
    
    let integer_part = parts[0].parse::<u128>()
        .map_err(|_| "Integer part too large".to_string())?;
    
    let fractional_part = if parts.len() == 2 {
        // Pad or truncate to exact decimal places
        let frac = parts[1];
        let padded = format!("{:0<width$}", frac, width = decimals as usize);
        let truncated = &padded[..decimals.min(padded.len() as u8) as usize];
        truncated.parse::<u128>()
            .map_err(|_| "Fractional part parsing failed".to_string())?
    } else {
        0_u128
    };
    
    // Combine parts with overflow check
    let total = integer_part.checked_mul(multiplier)
        .ok_or("Integer overflow in multiplication")?
        .checked_add(fractional_part)
        .ok_or("Integer overflow in addition")?;
    
    Ok(Nat::from(total))
}

pub fn nat_to_display_float(value: &Nat, decimals: u8) -> f64 {
    let divisor = 10_u128.pow(decimals as u32);
    let value_u128 = value.0.to_u128().unwrap_or(u128::MAX);
    (value_u128 as f64) / (divisor as f64)
}

// Validation functions
fn is_valid_lp_token_symbol(symbol: &str) -> bool {
    // LP tokens typically have format like "ckBTC_ckUSDT"
    let parts: Vec<&str> = symbol.split('_').collect();
    
    if parts.len() != 2 {
        return false;
    }
    
    // Each part should be a valid token symbol (alphanumeric, 2-10 chars)
    for part in parts {
        if part.len() < 2 || part.len() > 10 {
            return false;
        }
        if !part.chars().all(|c| c.is_alphanumeric()) {
            return false;
        }
    }
    
    true
}

// Update functions

#[update]
pub fn register_kong_principal(kong_principal: Principal) -> Result<(), String> {
    let daopad_principal = caller();
    let current_time = ic_cdk::api::time();
    
    // Validate caller is not anonymous
    if daopad_principal == Principal::anonymous() {
        return Err("Anonymous callers not allowed".to_string());
    }
    
    // Validate kong_principal is not anonymous
    if kong_principal == Principal::anonymous() {
        return Err("Cannot register anonymous KongSwap principal".to_string());
    }
    
    // Check existing registration with time-lock protection
    let existing_registration = REGISTRATIONS.with(|map| {
        map.borrow().get(&daopad_principal)
    });
    
    if let Some(existing) = existing_registration {
        // Check if registration can be overwritten after timeout
        if existing.last_activity + REGISTRATION_TIMEOUT_NANOS > current_time {
            return Err(format!(
                "Already registered. Can re-register after {} days of inactivity",
                30
            ));
        }
        
        // Clean up old registration before overwriting
        KONG_TO_DAOPAD.with(|map| {
            map.borrow_mut().remove(&existing.kong_principal);
        });
    }
    
    // Check if kong principal already claimed by another user
    let kong_already_claimed = KONG_TO_DAOPAD.with(|map| {
        map.borrow().get(&kong_principal)
    });
    
    if let Some(existing_daopad) = kong_already_claimed {
        if existing_daopad != daopad_principal {
            return Err("KongSwap principal already claimed by another user".to_string());
        }
    }
    
    // Create registration record with activity tracking
    let registration = RegistrationRecord {
        daopad_principal,
        kong_principal,
        registered_at: current_time,
        last_activity: current_time,
    };
    
    // Store bidirectional mapping
    DAOPAD_TO_KONG.with(|map| {
        map.borrow_mut().insert(daopad_principal, kong_principal);
    });
    
    KONG_TO_DAOPAD.with(|map| {
        map.borrow_mut().insert(kong_principal, daopad_principal);
    });
    
    REGISTRATIONS.with(|map| {
        map.borrow_mut().insert(daopad_principal, registration);
    });
    
    Ok(())
}

#[update]
pub async fn claim_lp_lock(request_id: u64) -> Result<ClaimRecord, String> {
    let caller = caller();
    let current_time = ic_cdk::api::time();
    
    // Step 1: Rate limit protection against cycle drain attacks
    if let Some(last_claim) = USER_LAST_CLAIM.with(|m| m.borrow().get(&caller)) {
        if current_time - last_claim < CLAIM_COOLDOWN {
            return Err("Rate limited: wait 1 hour between claim attempts".to_string());
        }
    }
    
    // Update timestamp BEFORE expensive operation (prevents retry spam)
    USER_LAST_CLAIM.with(|m| m.borrow_mut().insert(caller, current_time));
    
    // Step 2: Verify registration exists
    let registration = REGISTRATIONS.with(|map| {
        map.borrow().get(&caller)
    }).ok_or("Must register KongSwap principal first")?;
    
    let kong_principal = registration.kong_principal;
    
    // Step 3: Check if request already claimed
    if CLAIMED_REQUESTS.with(|map| map.borrow().contains_key(&request_id)) {
        return Err("Request already claimed".to_string());
    }
    
    // Step 4: Get request details (with caching)
    let request_details = get_cached_request_details(request_id).await?;
    
    // Step 5: Comprehensive verification
    let claim_record = verify_and_process_claim(
        caller,
        kong_principal,
        request_id,
        request_details,
        current_time
    )?;
    
    // Step 6: Update local voting power
    update_voting_power(&claim_record)?;
    
    // Step 7: Update registration activity
    update_registration_activity(caller, current_time)?;
    
    // Step 8: Store claim record
    CLAIMED_REQUESTS.with(|map| {
        map.borrow_mut().insert(request_id, claim_record.clone());
    });
    
    Ok(claim_record)
}

// Helper functions

fn verify_and_process_claim(
    caller: Principal,
    kong_principal: Principal,
    request_id: u64,
    request: KongRequestDetails,
    timestamp: u64,
) -> Result<ClaimRecord, String> {
    // Verify sender matches registered Kong principal
    if request.from != kong_principal {
        return Err(format!(
            "Request sender {} does not match your registered Kong principal {}",
            request.from, kong_principal
        ));
    }
    
    // Verify recipient is locking canister
    if request.to != id() {
        return Err(format!(
            "Request recipient {} is not the locking canister {}",
            request.to, id()
        ));
    }
    
    // Verify request status is successful (case-insensitive check for various possible values)
    let status_lower = request.status.to_lowercase();
    if !matches!(status_lower.as_str(), 
        "success" | "successful" | "completed" | "complete" | "confirmed" | "executed" | "done") {
        return Err(format!(
            "Request status '{}' is not valid for claiming. Expected successful/completed status",
            request.status
        ));
    }
    
    // Verify LP token symbol is valid (prevent empty or malformed symbols)
    if request.symbol.is_empty() || !is_valid_lp_token_symbol(&request.symbol) {
        return Err(format!(
            "Invalid LP token symbol: '{}'",
            request.symbol
        ));
    }
    
    // Convert amount safely from float to Nat
    let amount = safe_float_to_nat(request.amount, 8)?;
    
    // Verify amount is non-zero
    if amount == Nat::from(0u64) {
        return Err("Cannot claim zero amount".to_string());
    }
    
    // Create claim record
    Ok(ClaimRecord {
        claimer: caller,
        kong_principal,
        amount,
        lp_token_symbol: request.symbol.clone(),
        timestamp,
        request_id,
    })
}

fn update_voting_power(claim: &ClaimRecord) -> Result<(), String> {
    VOTING_POWER.with(|map| {
        let key = VotingPowerKey {
            principal: claim.claimer,
            token_symbol: claim.lp_token_symbol.clone(),
        };
        let current = map.borrow().get(&key)
            .map(|w| w.0.clone())
            .unwrap_or(Nat::from(0u64));
        let new_amount = current + claim.amount.clone();
        map.borrow_mut().insert(key, NatWrapper(new_amount));
    });
    Ok(())
}

fn update_registration_activity(principal: Principal, timestamp: u64) -> Result<(), String> {
    REGISTRATIONS.with(|map| {
        if let Some(mut registration) = map.borrow().get(&principal) {
            registration.last_activity = timestamp;
            map.borrow_mut().insert(principal, registration);
            Ok(())
        } else {
            Err("Registration not found".to_string())
        }
    })
}

async fn get_cached_request_details(request_id: u64) -> Result<KongRequestDetails, String> {
    // Check cache first
    let cached = REQUEST_CACHE.with(|cache| {
        cache.borrow().get(&request_id)
    });
    
    if let Some(details) = cached {
        return Ok(details);
    }
    
    // Not in cache, query KongSwap
    let kong_backend = Principal::from_text(KONG_BACKEND_CANISTER)
        .map_err(|e| format!("Invalid Kong backend canister ID: {}", e))?;
    
    // Try with Option wrapper first, then without if it fails
    // This handles both possible KongSwap API signatures
    let result = ic_cdk::call::<(Option<u64>,), (RequestsResult,)>(
        kong_backend,
        "requests",
        (Some(request_id),)
    ).await;
    
    let requests_result = match result {
        Ok((result,)) => result,
        Err(_) => {
            // Try without Option wrapper
            let result2: Result<(RequestsResult,), (ic_cdk::api::call::RejectionCode, String)> = 
                ic_cdk::call(
                    kong_backend,
                    "requests",
                    (request_id,)
                ).await;
            
            match result2 {
                Ok((result,)) => result,
                Err((code, msg)) => return Err(format!("Kong query failed [{:?}]: {}", code, msg)),
            }
        }
    };
    
    // Parse the request result and extract details
    let details = parse_kong_request(requests_result, request_id)?;
    
    // Add to cache with size limit check
    add_to_cache(request_id, details.clone())?;
    
    Ok(details)
}

fn add_to_cache(request_id: u64, details: KongRequestDetails) -> Result<(), String> {
    REQUEST_CACHE.with(|cache| {
        let mut cache_borrow = cache.borrow_mut();
        
        // Check cache size limit
        if cache_borrow.len() as u64 >= MAX_CACHE_SIZE {
            // Remove oldest entries (simple FIFO for now)
            let entries_to_remove = (cache_borrow.len() as u64 - (MAX_CACHE_SIZE - 1)) as usize;
            let mut keys_to_remove = Vec::new();
            
            for (key, _) in cache_borrow.iter().take(entries_to_remove) {
                keys_to_remove.push(key);
            }
            
            for key in keys_to_remove {
                cache_borrow.remove(&key);
            }
        }
        
        cache_borrow.insert(request_id, details);
        Ok(())
    })
}

fn parse_kong_request(result: RequestsResult, request_id: u64) -> Result<KongRequestDetails, String> {
    // Find the specific request in the results
    let request = result.requests
        .iter()
        .find(|r| r.id == request_id)
        .ok_or("Request not found in KongSwap response")?;
    
    Ok(KongRequestDetails {
        from: request.from,
        to: request.to,
        amount: request.amount,
        symbol: request.symbol.clone(),
        status: request.status.clone(),
        timestamp: request.timestamp,
    })
}

// Query functions - Voting Power

#[query]
pub fn get_voting_power(user: Principal, lp_token_symbol: String) -> Nat {
    VOTING_POWER.with(|map| {
        let key = VotingPowerKey {
            principal: user,
            token_symbol: lp_token_symbol,
        };
        map.borrow()
            .get(&key)
            .map(|w| w.0.clone())
            .unwrap_or(Nat::from(0u64))
    })
}

#[query]
pub fn get_all_voting_power(user: Principal) -> Vec<(String, Nat)> {
    VOTING_POWER.with(|map| {
        map.borrow()
            .iter()
            .filter(|(key, _)| key.principal == user)
            .map(|(key, wrapper)| (key.token_symbol.clone(), wrapper.0.clone()))
            .collect()
    })
}

#[query]
pub fn get_my_voting_power(lp_token_symbol: String) -> Nat {
    let caller = caller();
    get_voting_power(caller, lp_token_symbol)
}

#[query]
pub fn get_my_all_voting_power() -> Vec<(String, Nat)> {
    let caller = caller();
    get_all_voting_power(caller)
}

#[query]
pub fn get_total_locked(lp_token_symbol: String) -> Nat {
    VOTING_POWER.with(|map| {
        map.borrow()
            .iter()
            .filter(|(key, _)| key.token_symbol == lp_token_symbol)
            .map(|(_, wrapper)| wrapper.0.clone())
            .fold(Nat::from(0u64), |acc, amount| acc + amount)
    })
}

// Query functions - Claims & History

#[query]
pub fn get_claim_history(user: Principal) -> Vec<ClaimRecord> {
    CLAIMED_REQUESTS.with(|map| {
        map.borrow()
            .iter()
            .filter(|(_, record)| record.claimer == user)
            .map(|(_, record)| record.clone())
            .collect()
    })
}

#[query]
pub fn get_my_claim_history() -> Vec<ClaimRecord> {
    let caller = caller();
    get_claim_history(caller)
}

#[query]
pub fn get_token_claims(lp_token_symbol: String) -> Vec<ClaimRecord> {
    CLAIMED_REQUESTS.with(|map| {
        map.borrow()
            .iter()
            .filter(|(_, record)| record.lp_token_symbol == lp_token_symbol)
            .map(|(_, record)| record.clone())
            .collect()
    })
}

// Query functions - Registration

#[query]
pub fn get_my_kong_principal() -> Option<Principal> {
    let daopad_principal = caller();
    DAOPAD_TO_KONG.with(|map| {
        map.borrow().get(&daopad_principal)
    })
}

#[query]
pub fn get_linked_kong_principal(daopad_principal: Principal) -> Option<Principal> {
    DAOPAD_TO_KONG.with(|map| {
        map.borrow().get(&daopad_principal)
    })
}

#[query]
pub fn get_linked_daopad_principal(kong_principal: Principal) -> Option<Principal> {
    KONG_TO_DAOPAD.with(|map| {
        map.borrow().get(&kong_principal)
    })
}

#[query]
pub fn is_link_valid(daopad_principal: Principal, kong_principal: Principal) -> bool {
    DAOPAD_TO_KONG.with(|map| {
        match map.borrow().get(&daopad_principal) {
            Some(linked_kong) => linked_kong == kong_principal,
            None => false,
        }
    })
}

#[query]
pub fn get_registration_info(daopad_principal: Principal) -> Option<RegistrationRecord> {
    REGISTRATIONS.with(|map| {
        map.borrow().get(&daopad_principal)
    })
}

#[query]
pub fn get_my_registration_info() -> Option<RegistrationRecord> {
    let caller = caller();
    get_registration_info(caller)
}

// Query functions - Administrative

#[query]
pub fn get_registration_count() -> u64 {
    REGISTRATIONS.with(|map| map.borrow().len())
}

#[query]
pub fn get_all_registrations() -> Vec<RegistrationRecord> {
    REGISTRATIONS.with(|map| {
        map.borrow()
            .iter()
            .map(|(_, record)| record)
            .collect()
    })
}

#[query]
pub fn get_canister_info() -> CanisterInfo {
    let registration_count = REGISTRATIONS.with(|map| map.borrow().len());
    
    CanisterInfo {
        version: "1.0.0".to_string(),
        description: "Permanent LP Token Locking via 1:1 Principal Mapping for DAOPad Voting".to_string(),
        kong_backend_canister: KONG_BACKEND_CANISTER.to_string(),
        total_registrations: registration_count,
        has_withdrawal_functions: false, // GUARANTEED by design - no withdrawal functions exist
    }
}

// Canister initialization
#[ic_cdk::init]
fn init() {
    ic_cdk::println!("LP Locking Canister initialized");
}

// Canister upgrade hooks (minimal - preserves state)
#[ic_cdk::pre_upgrade]
fn pre_upgrade() {
    // Stable memory is automatically preserved
}

#[ic_cdk::post_upgrade]
fn post_upgrade() {
    ic_cdk::println!("LP Locking Canister upgraded");
}

// Export candid
ic_cdk::export_candid!();