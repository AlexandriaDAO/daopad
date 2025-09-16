mod types;
mod storage;
mod orbit;
mod kong_locker;
mod api;

use ic_cdk::init;
use candid::Principal;

pub use types::*;
pub use storage::*;
pub use orbit::*;
pub use kong_locker::*;
pub use api::*;

#[init]
fn init() {
    ic_cdk::println!("DAOPad backend initialized with Orbit Station support");
}

ic_cdk::export_candid!();