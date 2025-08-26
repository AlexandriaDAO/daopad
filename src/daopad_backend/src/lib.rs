use std::cell::RefCell;
use candid::{CandidType, Deserialize};
use serde::Serialize;

mod alexandria_dao;

thread_local! {
    // Store Alexandria Station ID for future integration
    static ALEXANDRIA_STATION_ID: RefCell<Option<String>> = RefCell::new(None);
}

#[ic_cdk::init]
fn init(alexandria_station_id: Option<String>) {
    // Initialize with Alexandria Station ID if provided
    if let Some(station_id) = alexandria_station_id {
        ALEXANDRIA_STATION_ID.with(|id| *id.borrow_mut() = Some(station_id));
    }
}

#[ic_cdk::query]
fn get_alexandria_station_id() -> Option<String> {
    ALEXANDRIA_STATION_ID.with(|id| id.borrow().clone())
}

#[ic_cdk::update]
fn set_alexandria_station_id(station_id: String) {
    ALEXANDRIA_STATION_ID.with(|id| *id.borrow_mut() = Some(station_id));
}

// Keep a simple health check
#[ic_cdk::query]
fn health_check() -> String {
    "Backend is running".to_string()
}

// Get the backend canister's principal (useful for debugging/setup)
#[ic_cdk::query]
fn get_backend_principal() -> String {
    ic_cdk::id().to_text()
}

// Alexandria DAO Integration Methods
#[ic_cdk::update]
async fn register_backend_with_alexandria() -> Result<String, String> {
    alexandria_dao::register_with_alexandria_station().await
}

// Returns configuration for frontend to connect directly to Alexandria Orbit Station
#[derive(CandidType, Deserialize, Serialize)]
struct AlexandriaConfig {
    station_id: String,
    requires_authentication: bool,
    integration_status: String,
}

#[ic_cdk::query]
fn get_alexandria_config() -> AlexandriaConfig {
    AlexandriaConfig {
        station_id: ALEXANDRIA_STATION_ID.with(|id| id.borrow().clone()).unwrap_or_else(|| "fec7w-zyaaa-aaaaa-qaffq-cai".to_string()),
        requires_authentication: true,
        integration_status: "Frontend must call Orbit Station directly due to IC query limitations".to_string(),
    }
}

#[ic_cdk::update]
fn refresh_alexandria_cache() -> Result<String, String> {
    alexandria_dao::refresh_cache()
}

#[derive(CandidType, Deserialize)]
struct CacheStatus {
    last_updated: Option<String>,
    proposal_count: u32,
}

#[ic_cdk::query]
fn get_cache_status() -> CacheStatus {
    let (last_updated, proposal_count) = alexandria_dao::get_cache_status();
    CacheStatus {
        last_updated,
        proposal_count,
    }
}

// Export candid interface
ic_cdk::export_candid!();