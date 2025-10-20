use candid::Principal;
use ic_cdk::{api, caller};
use std::cell::RefCell;

// Thread-local storage for test mode state
thread_local! {
    static TEST_MODE: RefCell<bool> = RefCell::new(false);
}

/// Enable or disable test mode for voting
/// Only allowed in non-mainnet environments or by authorized admins
#[ic_cdk::update]
pub fn set_test_mode(enabled: bool) -> Result<String, String> {
    let caller = caller();

    // Check if we're on mainnet and if caller is authorized
    if is_mainnet() && !is_admin(caller) {
        return Err("Test mode not allowed on mainnet for non-admin users".to_string());
    }

    TEST_MODE.with(|mode| {
        *mode.borrow_mut() = enabled;
    });

    ic_cdk::println!(
        "[Test Mode] {} by {}",
        if enabled { "ENABLED" } else { "DISABLED" },
        caller
    );

    Ok(format!(
        "Test mode {} successfully",
        if enabled { "enabled" } else { "disabled" }
    ))
}

/// Check if test mode is currently enabled
#[ic_cdk::query]
pub fn is_test_mode() -> bool {
    TEST_MODE.with(|mode| *mode.borrow())
}

/// Check if we're running on mainnet
fn is_mainnet() -> bool {
    // Check canister ID to determine network
    // Mainnet canisters have specific patterns
    let self_id = api::id();
    let id_str = self_id.to_string();

    // Local and testnet canisters often have specific patterns
    // Mainnet canisters typically don't contain "test" or start with local prefixes
    !id_str.contains("test") && !id_str.starts_with("be2us") && !id_str.starts_with("rdmx6")
}

/// Check if caller is an admin
fn is_admin(caller: Principal) -> bool {
    // DAOPad backend principals that should have admin access
    let admin_principals = vec![
        // Add known admin principals here
        "daopad", // Known admin identity
        "admin",  // Admin test identity
    ];

    let caller_str = caller.to_string();
    admin_principals.iter().any(|admin| caller_str.contains(admin))
}

/// Get current test mode status with details
#[ic_cdk::query]
pub fn get_test_mode_status() -> String {
    let is_enabled = is_test_mode();
    let network = if is_mainnet() { "mainnet" } else { "testnet/local" };

    format!(
        "Test Mode: {} | Network: {} | Canister: {}",
        if is_enabled { "ENABLED" } else { "DISABLED" },
        network,
        api::id()
    )
}