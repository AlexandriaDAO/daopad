// Module declarations
pub mod types;
pub mod storage;
pub mod update;
pub mod query;

// Re-export the main functions that should be exposed as canister methods
pub use update::{create_lock_canister, complete_my_canister_setup};
pub use query::{get_my_lock_canister, get_all_lock_canisters, get_voting_power, get_my_canister_status, CanisterStatus};

// Required imports for export_candid macro
use candid::{Principal, Nat};

// Export candid interface
ic_cdk::export_candid!();