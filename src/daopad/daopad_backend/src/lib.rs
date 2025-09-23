mod api;
mod kong_locker;
mod proposals;
mod storage;
mod types;

use candid::{Nat, Principal};
use ic_cdk::init;

pub use api::*;
pub use proposals::orbit_link::{OrbitLinkProposal, ProposalStatus};
pub use types::orbit::{AccountBalance, ListAccountsResult};
pub use types::{TokenInfo, UserStatus, VotingThresholds};

#[init]
fn init() {
    ic_cdk::println!("DAOPad backend initialized");
}

ic_cdk::export_candid!();
