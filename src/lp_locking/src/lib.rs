use candid::{CandidType, Nat, Principal};
use ic_cdk::{update, query, id, caller};
use ic_stable_structures::{
    StableBTreeMap, storable::Bound, Storable, 
    memory_manager::{MemoryId, MemoryManager, VirtualMemory}, 
    DefaultMemoryImpl
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::borrow::Cow;
use std::cell::RefCell;

type Memory = VirtualMemory<DefaultMemoryImpl>;

const KONG_BACKEND: &str = "2ipq2-uqaaa-aaaar-qailq-cai";

// User registration and voting power tracking
#[derive(CandidType, Serialize, Deserialize, Clone)]
pub struct UserLPData {
    pub account_id: String,
    pub voting_power: Nat,
    pub last_sync: u64,
}

// KongSwap response types - simplified based on actual API
#[derive(CandidType, Deserialize)]
enum TokenBalance {
    IC(ICToken),
    LP(LPToken),
}

#[derive(CandidType, Deserialize)]
struct ICToken {
    symbol: String,
    balance: f64,
}

#[derive(CandidType, Deserialize)]
struct LPToken {
    symbol: String,
    balance: f64,
    lp_token_id: u64,
}

#[derive(CandidType, Deserialize)]
enum BalanceResult {
    Ok(Vec<TokenBalance>),
    Err(String),
}

// Storable implementation for stable storage
impl Storable for UserLPData {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap())
    }
    
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap()
    }
    
    const BOUND: Bound = Bound::Unbounded;
}

// Storable wrapper for Principal
#[derive(Clone, PartialEq, Eq, PartialOrd, Ord)]
struct StorablePrincipal(Principal);

impl Storable for StorablePrincipal {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.as_slice().to_vec())
    }
    
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        StorablePrincipal(Principal::from_slice(&bytes))
    }
    
    const BOUND: Bound = Bound::Bounded {
        max_size: 29,
        is_fixed_size: false,
    };
}

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(
        MemoryManager::init(DefaultMemoryImpl::default())
    );

    // Map user principal to their LP data (account ID and voting power)
    static USER_LP_DATA: RefCell<StableBTreeMap<StorablePrincipal, UserLPData, Memory>> = RefCell::new({
        MEMORY_MANAGER.with(|m| {
            StableBTreeMap::init(m.borrow().get(MemoryId::new(0)))
        })
    });
}

// Core function: Derive unique subaccount for each user
fn derive_user_subaccount(user_principal: Principal) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(b"DAOPad_LP_Lock_v1");
    hasher.update(user_principal.as_slice());
    hasher.finalize().into()
}

// Generate unique account ID for a user (ICP account identifier format)
fn get_user_account_id(user_principal: Principal) -> String {
    let canister_principal = id();
    let subaccount = derive_user_subaccount(user_principal);
    
    // Create account identifier following ICP standard
    let mut hasher = Sha256::new();
    hasher.update(b"\x0Aaccount-id");
    hasher.update(canister_principal.as_slice());
    hasher.update(&subaccount);
    let hash = hasher.finalize();
    
    // Calculate CRC32 checksum
    let mut crc32 = 0xffffffffu32;
    for byte in &hash[4..32] {
        crc32 ^= (*byte as u32) << 24;
        for _ in 0..8 {
            crc32 = if crc32 & 0x80000000 != 0 {
                (crc32 << 1) ^ 0x04c11db7
            } else {
                crc32 << 1
            };
        }
    }
    crc32 = !crc32;
    
    // Combine CRC32 and hash
    let mut account_id = vec![];
    account_id.extend_from_slice(&crc32.to_be_bytes());
    account_id.extend_from_slice(&hash[4..32]);
    
    hex::encode(account_id)
}

// Register user for LP locking and generate their unique address
#[update]
pub fn register_for_lp_locking() -> Result<String, String> {
    let user = caller();
    
    // Validate not anonymous
    if user == Principal::anonymous() {
        return Err("Anonymous users not allowed".to_string());
    }
    
    // Generate their unique account ID
    let account_id_string = get_user_account_id(user);
    
    // Store or update user registration
    USER_LP_DATA.with(|data| {
        let mut data = data.borrow_mut();
        let user_data = UserLPData {
            account_id: account_id_string.clone(),
            voting_power: Nat::from(0u64),
            last_sync: 0,
        };
        data.insert(StorablePrincipal(user), user_data);
    });
    
    Ok(account_id_string)
}

// Query function to get user's LP address
#[query]
pub fn get_my_lp_address() -> Result<String, String> {
    let user = caller();
    
    if user == Principal::anonymous() {
        return Err("Anonymous users not allowed".to_string());
    }
    
    let account_id = get_user_account_id(user);
    Ok(account_id)
}

// Sync user's voting power by querying KongSwap
#[update]
pub async fn sync_my_voting_power() -> Result<Nat, String> {
    let user = caller();
    
    if user == Principal::anonymous() {
        return Err("Anonymous users not allowed".to_string());
    }
    
    let account_id_string = get_user_account_id(user);
    
    // Query KongSwap for this account ID's balance
    let kong_backend = Principal::from_text(KONG_BACKEND)
        .map_err(|e| format!("Invalid Kong backend: {}", e))?;
    
    // THE CRITICAL TEST: Does KongSwap accept account ID queries?
    let result: Result<(BalanceResult,), _> = ic_cdk::call(
        kong_backend,
        "user_balances",
        (account_id_string.clone(),)
    ).await;
    
    match result {
        Ok((BalanceResult::Ok(balances),)) => {
            // Calculate total LP balance from all LP tokens
            let mut total_balance = Nat::from(0u64);
            
            for balance in balances {
                if let TokenBalance::LP(lp) = balance {
                    // Convert float balance to Nat (assuming 8 decimals)
                    let scaled_balance = (lp.balance * 100_000_000.0) as u128;
                    total_balance = total_balance + Nat::from(scaled_balance);
                }
            }
            
            // Update stored voting power
            USER_LP_DATA.with(|data| {
                let mut data = data.borrow_mut();
                let user_data = UserLPData {
                    account_id: account_id_string,
                    voting_power: total_balance.clone(),
                    last_sync: ic_cdk::api::time(),
                };
                data.insert(StorablePrincipal(user), user_data);
            });
            
            Ok(total_balance)
        },
        Ok((BalanceResult::Err(e),)) => {
            // Check if error indicates account ID not supported
            if e.contains("not found") || e.contains("invalid") {
                Err(format!("Account ID not recognized by KongSwap - subaccount approach may not work: {}", e))
            } else {
                Err(format!("KongSwap error: {}", e))
            }
        },
        Err((code, msg)) => {
            Err(format!("Query failed [{:?}]: {}", code, msg))
        }
    }
}

// Get user's current voting power
#[query]
pub fn get_my_voting_power() -> Nat {
    let user = caller();
    
    if user == Principal::anonymous() {
        return Nat::from(0u64);
    }
    
    USER_LP_DATA.with(|data| {
        data.borrow()
            .get(&StorablePrincipal(user))
            .map(|user_data| user_data.voting_power.clone())
            .unwrap_or(Nat::from(0u64))
    })
}

// Get all registered users and their voting powers (for admin/display)
#[query]
pub fn get_all_voting_powers() -> Vec<(Principal, Nat, String)> {
    USER_LP_DATA.with(|data| {
        data.borrow()
            .iter()
            .map(|(StorablePrincipal(principal), user_data)| {
                (principal, user_data.voting_power.clone(), user_data.account_id.clone())
            })
            .collect()
    })
}

// Legacy compatibility - return canister's main address
#[query]
pub fn get_address() -> String {
    id().to_string()
}

// Admin function to manually register with KongSwap (if needed)
#[update]
pub async fn register_with_kongswap() -> Result<String, String> {
    let kong_backend = Principal::from_text(KONG_BACKEND)
        .map_err(|e| format!("Invalid Kong backend: {}", e))?;
    
    let result: Result<(String,), _> = ic_cdk::call(
        kong_backend,
        "add_liquidity_pool_user",
        (id().to_string(),)
    ).await;
    
    match result {
        Ok((response,)) => Ok(format!("Registered with KongSwap: {}", response)),
        Err((code, msg)) => Err(format!("Registration failed [{:?}]: {}", code, msg))
    }
}

ic_cdk::export_candid!();