use ic_cdk::{update, query};
use ic_cdk::api::management_canister::main::{
    create_canister, install_code, update_settings,
    CanisterSettings, CreateCanisterArgument, InstallCodeArgument, 
    UpdateSettingsArgument, CanisterInstallMode,
};
use ic_stable_structures::{
    DefaultMemoryImpl, 
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    StableBTreeMap, Storable,
};
use candid::{CandidType, Deserialize, Principal, Nat};
use serde::Serialize;
use std::cell::RefCell;
use std::borrow::Cow;

type Memory = VirtualMemory<DefaultMemoryImpl>;

// Wrapper for Principal to implement Storable
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
struct StorablePrincipal(Principal);

// ===== KongSwap Types for Factory =====
#[derive(CandidType, Clone, Debug, Serialize, Deserialize)]
pub enum UserBalancesResult {
    Ok(Vec<UserBalancesReply>),
    Err(String),
}

#[derive(CandidType, Clone, Debug, Serialize, Deserialize)]
pub enum UserBalancesReply {
    LP(LPReply),  // Only LP token balances
}

#[derive(CandidType, Clone, Debug, Serialize, Deserialize)]
pub struct LPReply {
    pub symbol: String,        // LP token symbol (e.g., "ICP_ckUSDT")
    pub name: String,          // Full name of LP token
    pub balance: f64,          // LP token balance (human-readable)
    pub usd_balance: f64,      // Total USD value of LP position
    pub symbol_0: String,      // First token symbol
    pub amount_0: f64,         // Amount of first token
    pub usd_amount_0: f64,     // USD value of first token
    pub symbol_1: String,      // Second token symbol
    pub amount_1: f64,         // Amount of second token
    pub usd_amount_1: f64,     // USD value of second token
    pub ts: u64,              // Timestamp
}

// ===== Storage Implementation =====
// Make StorablePrincipal storable for stable structures
impl Storable for StorablePrincipal {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.as_slice().to_vec())
    }
    
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        StorablePrincipal(Principal::from_slice(&bytes))
    }
    
    const BOUND: ic_stable_structures::storable::Bound = 
        ic_stable_structures::storable::Bound::Bounded {
            max_size: 29,
            is_fixed_size: false,
        };
}

// Embed the lock canister WASM at compile time
// This requires building lock_canister FIRST, then building factory
const LOCK_CANISTER_WASM: &[u8] = include_bytes!("../../../../target/wasm32-unknown-unknown/release/lock_canister.wasm");

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = 
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
    
    // Permanent user → lock canister mapping  
    static USER_LOCK_CANISTERS: RefCell<StableBTreeMap<StorablePrincipal, StorablePrincipal, Memory>> = 
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))
        ));
}

/// Create and immediately blackhole a lock canister
#[update]
async fn create_lock_canister() -> Result<Principal, String> {
    let user = ic_cdk::caller();
    
    // Check if user already has one
    if USER_LOCK_CANISTERS.with(|c| c.borrow().contains_key(&StorablePrincipal(user))) {
        return Err("You already have a lock canister".to_string());
    }
    
    // Use the embedded WASM (compiled at build time)
    let wasm = LOCK_CANISTER_WASM.to_vec();
    
    // Create canister with minimal cycles (10B = $0.012)
    let create_args = CreateCanisterArgument {
        settings: Some(CanisterSettings {
            controllers: Some(vec![ic_cdk::id()]), // Factory as temporary controller
            compute_allocation: None,
            memory_allocation: None,
            freezing_threshold: None,
            reserved_cycles_limit: None,
            log_visibility: None,
            wasm_memory_limit: None,
        }),
    };
    
    let canister_id_record = create_canister(create_args, 10_000_000_000u128)
        .await
        .map_err(|e| format!("Failed to create canister: {:?}", e))?;
    let canister_id = canister_id_record.0.canister_id;
    
    // Install the minimal lock canister code
    let install_args = InstallCodeArgument {
        mode: CanisterInstallMode::Install,
        canister_id: canister_id.clone(),
        wasm_module: wasm,
        arg: vec![], // No init args needed
    };
    
    install_code(install_args)
        .await
        .map_err(|e| format!("Failed to install code: {:?}", e))?;
    
    // IMMEDIATELY BLACKHOLE - remove all controllers
    let blackhole_args = UpdateSettingsArgument {
        canister_id: canister_id.clone(),
        settings: CanisterSettings {
            controllers: Some(vec![]), // Empty = blackholed forever!
            compute_allocation: None,
            memory_allocation: None,
            freezing_threshold: None,
            reserved_cycles_limit: None,
            log_visibility: None,
            wasm_memory_limit: None,
        },
    };
    
    update_settings(blackhole_args)
        .await
        .map_err(|e| format!("Failed to blackhole: {:?}", e))?;
    
    // Store the mapping
    USER_LOCK_CANISTERS.with(|c| {
        c.borrow_mut().insert(StorablePrincipal(user), StorablePrincipal(canister_id));
    });
    
    Ok(canister_id)
}

/// Get user's lock canister
#[query]
fn get_my_lock_canister() -> Option<Principal> {
    let user = ic_cdk::caller();
    USER_LOCK_CANISTERS.with(|c| 
        c.borrow().get(&StorablePrincipal(user)).map(|sp| sp.0)
    )
}

/// Get all lock canisters
#[query]
fn get_all_lock_canisters() -> Vec<(Principal, Principal)> {
    USER_LOCK_CANISTERS.with(|c| {
        c.borrow().iter()
            .map(|(user, canister)| (user.0, canister.0))
            .collect()
    })
}


/// Get voting power by querying KongSwap
#[update]
async fn get_voting_power(user: Principal) -> Result<Nat, String> {
    let lock_canister = USER_LOCK_CANISTERS.with(|c| 
        c.borrow().get(&StorablePrincipal(user)).map(|sp| sp.0)
    ).ok_or("No lock canister found")?;
    
    // Query KongSwap for LP balance at lock canister principal
    let kong_backend = Principal::from_text("2ipq2-uqaaa-aaaar-qailq-cai").unwrap();
    
    let result: Result<(UserBalancesResult,), _> = ic_cdk::call(
        kong_backend,
        "user_balances",
        (lock_canister.to_text(),)
    ).await;
    
    match result {
        Ok((UserBalancesResult::Ok(balances),)) => {
            // Sum LP balances USD value for voting power
            let total_usd: f64 = balances.iter()
                .map(|balance| match balance {
                    UserBalancesReply::LP(lp) => lp.usd_balance,
                })
                .sum();
            
            // Convert USD to Nat (multiply by 100 to preserve 2 decimal places)
            Ok(Nat::from((total_usd * 100.0) as u64))
        },
        Ok((UserBalancesResult::Err(msg),)) if msg.contains("User not found") => {
            // Not registered yet
            Ok(Nat::from(0u64))
        },
        _ => Ok(Nat::from(0u64))
    }
}

ic_cdk::export_candid!();