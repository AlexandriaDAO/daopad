use std::cell::RefCell;

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