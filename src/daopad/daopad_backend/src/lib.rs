use candid::{CandidType, Deserialize, Principal, Encode};
use ic_cdk::{init, query, update, call};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    DefaultMemoryImpl, StableBTreeMap, Storable,
    storable::Bound,
};
use std::borrow::Cow;
use std::cell::RefCell;
use serde::{Serialize};

type Memory = VirtualMemory<DefaultMemoryImpl>;

const KONG_LOCKER_PRINCIPALS_MEM_ID: MemoryId = MemoryId::new(0);
const ORBIT_STATIONS_MEM_ID: MemoryId = MemoryId::new(1);

const KONG_LOCKER_FACTORY: &str = "eazgb-giaaa-aaaap-qqc2q-cai";

// Orbit Station WASM modules (these would need to be embedded as bytes)
// For now, we'll include placeholders - in production, you'd include the actual WASM
const STATION_WASM: &[u8] = include_bytes!("../wasms/station.wasm.gz");
const UPGRADER_WASM: &[u8] = include_bytes!("../wasms/upgrader.wasm.gz");

// Orbit Station Types
#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct OrbitStationInfo {
    pub station_id: Principal,
    pub upgrader_id: Principal,
    pub name: String,
    pub owner: Principal,
    pub created_at: u64,
}

#[derive(CandidType, Deserialize)]
pub struct CreateOrbitStationRequest {
    pub name: String,
}

#[derive(CandidType, Deserialize)]
pub struct CreateTokenStationRequest {
    pub name: String,
    pub token_canister_id: Principal,
}

#[derive(CandidType, Deserialize)]
pub struct OrbitStationResponse {
    pub station_id: Principal,
    pub upgrader_id: Principal,
    pub name: String,
}

// System types for Orbit initialization
#[derive(CandidType, Deserialize)]
pub enum SystemUpgraderInput {
    Id(Principal),
    Deploy {
        wasm_module: Vec<u8>,
        initial_cycles: Option<u64>,
    },
}

#[derive(CandidType, Deserialize)]
pub enum UserStatus {
    Active,
    Inactive,
}

#[derive(CandidType, Deserialize)]
pub struct UserIdentityInput {
    pub identity: Principal,
}

#[derive(CandidType, Deserialize)]
pub struct InitUserInput {
    pub id: Option<String>,
    pub name: String,
    pub identities: Vec<UserIdentityInput>,
    pub groups: Option<Vec<String>>,
    pub status: UserStatus,
}

#[derive(CandidType, Deserialize)]
pub struct WithAllDefaults {
    pub users: Vec<InitUserInput>,
    pub admin_quorum: u16,
    pub operator_quorum: u16,
}

#[derive(CandidType, Deserialize)]
pub enum InitialConfig {
    WithAllDefaults(WithAllDefaults),
}

#[derive(CandidType, Deserialize)]
pub struct SystemInit {
    pub name: String,
    pub upgrader: SystemUpgraderInput,
    pub fallback_controller: Option<Principal>,
    pub initial_config: InitialConfig,
}

#[derive(CandidType, Deserialize)]
pub enum SystemInstall {
    Init(SystemInit),
}

#[derive(CandidType, Deserialize)]
pub struct UpgraderInitArg {
    pub target_canister: Principal,
}

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

#[derive(Clone, Debug)]
struct StorableOrbitStation(OrbitStationInfo);

impl Storable for StorableOrbitStation {
    fn to_bytes(&self) -> Cow<[u8]> {
        let json = serde_json::to_string(&self.0).unwrap();
        Cow::Owned(json.into_bytes())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let json = String::from_utf8(bytes.to_vec()).unwrap();
        let info: OrbitStationInfo = serde_json::from_str(&json).unwrap();
        Self(info)
    }

    const BOUND: Bound = Bound::Unbounded;
}

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static KONG_LOCKER_PRINCIPALS: RefCell<StableBTreeMap<StorablePrincipal, StorablePrincipal, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(KONG_LOCKER_PRINCIPALS_MEM_ID))
        )
    );

    static ORBIT_STATIONS: RefCell<StableBTreeMap<StorablePrincipal, StorableOrbitStation, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(ORBIT_STATIONS_MEM_ID))
        )
    );
}

#[init]
fn init() {
    ic_cdk::println!("DAOPad backend initialized with Orbit Station support");
}

// Orbit Station Management

#[update]
async fn create_token_orbit_station(request: CreateTokenStationRequest) -> Result<OrbitStationResponse, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    // Check if user has a registered Kong Locker canister
    let kong_locker_principal = KONG_LOCKER_PRINCIPALS.with(|p| {
        p.borrow().get(&StorablePrincipal(caller)).map(|sp| sp.0)
    }).ok_or("Must register Kong Locker canister first")?;

    // Check if user already has an Orbit Station
    let existing_station = ORBIT_STATIONS.with(|stations| {
        stations.borrow().get(&StorablePrincipal(caller)).map(|s| s.0.clone())
    });

    if existing_station.is_some() {
        return Err("You already have an Orbit Station. Only one station per Kong Locker is allowed".to_string());
    }

    // Validate token canister by checking if it exists in the user's LP positions

    // Get LP positions from KongSwap for the user's lock canister
    let kongswap_id = Principal::from_text("2ipq2-uqaaa-aaaar-qailq-cai")
        .map_err(|e| format!("Invalid KongSwap ID: {}", e))?;

    let user_balances_result: Result<(ic_cdk::api::call::CallResult<(Result<Vec<UserBalancesReply>, String>,)>,), _> = call(
        kongswap_id,
        "user_balances",
        (kong_locker_principal.to_string(),)
    ).await;

    let user_balances = user_balances_result
        .map_err(|e| format!("Failed to get LP positions: {:?}", e))?
        .0
        .map_err(|e| format!("KongSwap call failed: {:?}", e))?
        .0
        .map_err(|e| format!("KongSwap returned error: {}", e))?;

    // Check if the requested token canister exists in user's LP positions
    let token_exists = user_balances.iter().any(|balance| {
        let UserBalancesReply::LP(lp_reply) = balance;
        lp_reply.address_0 == request.token_canister_id.to_string() ||
        lp_reply.address_1 == request.token_canister_id.to_string()
    });

    if !token_exists {
        return Err("Token canister not found in your locked LP positions".to_string());
    }

    // Create the Orbit Station
    create_orbit_station_internal(request.name, caller).await
}

#[derive(CandidType, Deserialize)]
pub enum UserBalancesReply {
    LP(LPReply),
}

#[derive(CandidType, Deserialize)]
pub struct LPReply {
    pub name: String,
    pub symbol: String,
    pub lp_token_id: u64,
    pub balance: f64,
    pub usd_balance: f64,
    pub chain_0: String,
    pub symbol_0: String,
    pub address_0: String,
    pub amount_0: f64,
    pub usd_amount_0: f64,
    pub chain_1: String,
    pub symbol_1: String,
    pub address_1: String,
    pub amount_1: f64,
    pub usd_amount_1: f64,
    pub ts: u64,
}

#[update]
async fn create_orbit_station(request: CreateOrbitStationRequest) -> Result<OrbitStationResponse, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    create_orbit_station_internal(request.name, caller).await
}

async fn create_orbit_station_internal(name: String, owner: Principal) -> Result<OrbitStationResponse, String> {
    // Create upgrader canister first
    let upgrader_id = create_canister().await
        .map_err(|e| format!("Failed to create upgrader canister: {:?}", e))?;

    // Create station canister
    let station_id = create_canister().await
        .map_err(|e| format!("Failed to create station canister: {:?}", e))?;

    // Install upgrader with target_canister pointing to station
    let upgrader_init_arg = UpgraderInitArg {
        target_canister: station_id,
    };

    install_canister(
        upgrader_id,
        UPGRADER_WASM.to_vec(),
        Encode!(&upgrader_init_arg).map_err(|e| format!("Failed to encode upgrader init: {:?}", e))?
    ).await
    .map_err(|e| format!("Failed to install upgrader: {:?}", e))?;

    // Prepare station initialization with daopad_backend as the admin
    let backend_principal = ic_cdk::id();
    let system_init = SystemInit {
        name: name.clone(),
        upgrader: SystemUpgraderInput::Id(upgrader_id),
        fallback_controller: Some(backend_principal), // DAOPad backend as fallback controller
        initial_config: InitialConfig::WithAllDefaults(WithAllDefaults {
            users: vec![InitUserInput {
                id: None,
                name: "DAOPad Admin".to_string(),
                identities: vec![UserIdentityInput { identity: backend_principal }],
                groups: None,
                status: UserStatus::Active,
            }],
            admin_quorum: 1,
            operator_quorum: 1,
        }),
    };

    let system_install = SystemInstall::Init(system_init);

    // Install station
    install_canister(
        station_id,
        STATION_WASM.to_vec(),
        Encode!(&Some(system_install)).map_err(|e| format!("Failed to encode station init: {:?}", e))?
    ).await
    .map_err(|e| format!("Failed to install station: {:?}", e))?;

    // Set up controllers properly
    // Add station as controller of upgrader
    let controllers = vec![backend_principal, station_id];
    update_canister_settings(upgrader_id, controllers.clone()).await
        .map_err(|e| format!("Failed to update upgrader controllers: {:?}", e))?;

    // Add upgrader as controller of station
    let station_controllers = vec![backend_principal, upgrader_id];
    update_canister_settings(station_id, station_controllers).await
        .map_err(|e| format!("Failed to update station controllers: {:?}", e))?;

    // Store station info
    let station_info = OrbitStationInfo {
        station_id,
        upgrader_id,
        name: name.clone(),
        owner: owner,
        created_at: ic_cdk::api::time(),
    };

    ORBIT_STATIONS.with(|stations| {
        stations.borrow_mut().insert(
            StorablePrincipal(owner),
            StorableOrbitStation(station_info)
        );
    });

    Ok(OrbitStationResponse {
        station_id,
        upgrader_id,
        name: name,
    })
}

#[update]
async fn get_my_locked_tokens() -> Result<Vec<TokenInfo>, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    // Check if user has a registered Kong Locker canister
    let kong_locker_principal = KONG_LOCKER_PRINCIPALS.with(|p| {
        p.borrow().get(&StorablePrincipal(caller)).map(|sp| sp.0)
    }).ok_or("Must register Kong Locker canister first")?;

    // Get LP positions from KongSwap for the user's lock canister
    let kongswap_id = Principal::from_text("2ipq2-uqaaa-aaaar-qailq-cai")
        .map_err(|e| format!("Invalid KongSwap ID: {}", e))?;

    let user_balances_result: Result<(ic_cdk::api::call::CallResult<(Result<Vec<UserBalancesReply>, String>,)>,), _> = call(
        kongswap_id,
        "user_balances",
        (kong_locker_principal.to_string(),)
    ).await;

    let user_balances = user_balances_result
        .map_err(|e| format!("Failed to get LP positions: {:?}", e))?
        .0
        .map_err(|e| format!("KongSwap call failed: {:?}", e))?
        .0
        .map_err(|e| format!("KongSwap returned error: {}", e))?;

    // Extract unique tokens from LP positions
    let mut tokens = std::collections::HashSet::new();
    for balance in user_balances.iter() {
        let UserBalancesReply::LP(lp_reply) = balance;
        // Add token 0
        if !lp_reply.address_0.is_empty() {
            tokens.insert(TokenInfo {
                canister_id: lp_reply.address_0.clone(),
                symbol: lp_reply.symbol_0.clone(),
                chain: lp_reply.chain_0.clone(),
            });
        }
        // Add token 1
        if !lp_reply.address_1.is_empty() {
            tokens.insert(TokenInfo {
                canister_id: lp_reply.address_1.clone(),
                symbol: lp_reply.symbol_1.clone(),
                chain: lp_reply.chain_1.clone(),
            });
        }
    }

    Ok(tokens.into_iter().collect())
}

#[derive(Clone, Debug, CandidType, Deserialize, PartialEq, Eq, Hash)]
pub struct TokenInfo {
    pub canister_id: String,
    pub symbol: String,
    pub chain: String,
}

#[query]
fn get_my_orbit_station() -> Option<OrbitStationInfo> {
    let caller = ic_cdk::caller();
    ORBIT_STATIONS.with(|stations| {
        stations.borrow().get(&StorablePrincipal(caller)).map(|s| s.0.clone())
    })
}

#[query]
fn list_all_orbit_stations() -> Vec<OrbitStationInfo> {
    ORBIT_STATIONS.with(|stations| {
        stations.borrow().iter()
            .map(|(_, station)| station.0.clone())
            .collect()
    })
}

#[update]
async fn delete_orbit_station() -> Result<String, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    let station_info = ORBIT_STATIONS.with(|stations| {
        stations.borrow().get(&StorablePrincipal(caller)).map(|s| s.0.clone())
    }).ok_or("No Orbit station found for your principal")?;

    // Delete both canisters
    delete_canister(station_info.station_id).await
        .map_err(|e| format!("Failed to delete station canister: {:?}", e))?;

    delete_canister(station_info.upgrader_id).await
        .map_err(|e| format!("Failed to delete upgrader canister: {:?}", e))?;

    // Remove from storage
    ORBIT_STATIONS.with(|stations| {
        stations.borrow_mut().remove(&StorablePrincipal(caller));
    });

    Ok("Orbit station deleted successfully".to_string())
}

// Management canister interface functions
async fn create_canister() -> Result<Principal, String> {
    let create_args = ic_cdk::api::management_canister::main::CreateCanisterArgument {
        settings: None,
    };

    let result: Result<(ic_cdk::api::management_canister::main::CanisterIdRecord,), _> =
        call(Principal::management_canister(), "create_canister", (create_args,)).await;

    match result {
        Ok((canister_id,)) => Ok(canister_id.canister_id),
        Err((_, msg)) => Err(msg),
    }
}

async fn install_canister(canister_id: Principal, wasm: Vec<u8>, arg: Vec<u8>) -> Result<(), String> {
    let install_args = ic_cdk::api::management_canister::main::InstallCodeArgument {
        mode: ic_cdk::api::management_canister::main::CanisterInstallMode::Install,
        canister_id,
        wasm_module: wasm,
        arg,
    };

    let result: Result<(), _> = call(Principal::management_canister(), "install_code", (install_args,)).await;
    match result {
        Ok(()) => Ok(()),
        Err((_, msg)) => Err(msg),
    }
}

async fn update_canister_settings(canister_id: Principal, controllers: Vec<Principal>) -> Result<(), String> {
    let settings = ic_cdk::api::management_canister::main::CanisterSettings {
        controllers: Some(controllers),
        compute_allocation: None,
        memory_allocation: None,
        freezing_threshold: None,
        reserved_cycles_limit: None,
        log_visibility: None,
        wasm_memory_limit: None,
    };

    let update_args = ic_cdk::api::management_canister::main::UpdateSettingsArgument {
        canister_id,
        settings,
    };

    let result: Result<(), _> = call(Principal::management_canister(), "update_settings", (update_args,)).await;
    match result {
        Ok(()) => Ok(()),
        Err((_, msg)) => Err(msg),
    }
}

async fn delete_canister(canister_id: Principal) -> Result<(), String> {
    let delete_args = ic_cdk::api::management_canister::main::CanisterIdRecord {
        canister_id,
    };

    let result: Result<(), _> = call(Principal::management_canister(), "delete_canister", (delete_args,)).await;
    match result {
        Ok(()) => Ok(()),
        Err((_, msg)) => Err(msg),
    }
}

// Kong Locker Integration (existing code)

#[update]
async fn register_with_kong_locker(kong_locker_principal: Principal) -> Result<String, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    // Verify this is a valid Kong Locker canister by checking if it exists in the factory
    let kong_locker_factory = Principal::from_text(KONG_LOCKER_FACTORY)
        .map_err(|e| format!("Invalid Kong Locker factory ID: {}", e))?;

    // Get all lock canisters from Kong Locker factory
    let all_lock_canisters: Result<(Vec<(Principal, Principal)>,), _> = call(
        kong_locker_factory,
        "get_all_lock_canisters",
        ()
    ).await;

    let lock_canisters = all_lock_canisters
        .map_err(|e| format!("Failed to verify lock canister: {:?}", e))?
        .0;

    // Find the lock canister and verify caller owns it
    let owner = lock_canisters
        .iter()
        .find(|(_user, canister)| *canister == kong_locker_principal)
        .map(|(user, _)| *user)
        .ok_or("Lock canister not found in Kong Locker registry")?;

    if owner != caller {
        return Err("You don't own this Kong Locker canister".to_string());
    }

    // Store the relationship
    KONG_LOCKER_PRINCIPALS.with(|principals| {
        principals.borrow_mut().insert(
            StorablePrincipal(caller),
            StorablePrincipal(kong_locker_principal)
        );
    });

    Ok(format!("Successfully registered Kong Locker canister: {}", kong_locker_principal))
}

#[query]
fn get_my_kong_locker_canister() -> Option<Principal> {
    let caller = ic_cdk::caller();
    KONG_LOCKER_PRINCIPALS.with(|p| p.borrow().get(&StorablePrincipal(caller)).map(|sp| sp.0))
}

#[query]
fn list_all_kong_locker_registrations() -> Vec<(Principal, Principal)> {
    KONG_LOCKER_PRINCIPALS.with(|p| {
        p.borrow().iter()
            .map(|(user, canister)| (user.0, canister.0))
            .collect()
    })
}

#[update]
fn unregister_kong_locker() -> Result<String, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    KONG_LOCKER_PRINCIPALS.with(|principals| {
        if principals.borrow_mut().remove(&StorablePrincipal(caller)).is_some() {
            Ok("Kong Locker canister unregistered successfully".to_string())
        } else {
            Err("No Kong Locker canister registered for your principal".to_string())
        }
    })
}

// Backend utility functions

#[query]
fn get_backend_principal() -> Principal {
    ic_cdk::id()
}

#[query]
fn get_kong_locker_factory_principal() -> Principal {
    Principal::from_text(KONG_LOCKER_FACTORY).unwrap()
}

// Health check
#[query]
fn health_check() -> String {
    format!("DAOPad with Orbit Station Support - Healthy")
}

// Export candid interface
ic_cdk::export_candid!();