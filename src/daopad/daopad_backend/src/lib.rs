mod types;
mod storage;
mod proposals;
mod kong_locker;
mod api;

use ic_cdk::init;
use candid::Principal;

pub use api::*;
pub use types::{TokenInfo, UserStatus, VotingThresholds};
pub use proposals::orbit_link::{OrbitLinkProposal, ProposalStatus};

#[init]
fn init() {
    ic_cdk::println!("DAOPad backend initialized");
}

ic_cdk::export_candid!();