// Module declarations
pub mod types;
pub mod storage;
pub mod update;
pub mod query;
pub mod revshare;

// Re-export the main functions that should be exposed as canister methods
pub use update::{create_lock_canister, complete_my_canister_setup};
pub use query::{get_my_lock_canister, get_all_lock_canisters, get_voting_power, get_my_canister_status, CanisterStatus};
pub use revshare::{get_revshare_stats, RevshareStats};

// Required imports for export_candid macro
use candid::{Principal, Nat};
use ic_cdk::{init, post_upgrade};

// Initialize the canister and start revenue sharing timer
#[init]
fn init() {
    revshare::init_revshare_timer();
    ic_cdk::print("Kong Locker initialized with revenue sharing");
}

// Re-initialize timer after upgrade
#[post_upgrade]
fn post_upgrade() {
    revshare::init_revshare_timer();
    ic_cdk::print("Kong Locker upgraded - revenue sharing timer restarted");
}

// Export candid interface
ic_cdk::export_candid!();