mod api;
mod kong_locker;
mod proposals;
mod storage;
mod types;

use candid::{Nat, Principal};
use ic_cdk::init;

pub use api::*;
pub use proposals::orbit_link::{OrbitLinkProposal, ProposalStatus};
pub use proposals::{
    ProposalError, ProposalId, ProposalType, TransferDetails, TreasuryProposal, VoteChoice,
};
pub use types::orbit::{
    AccountBalance, ListAccountsResult,
    PaginationInput, Resource, SystemInfoResponse,
    // External canister types
    ChangeExternalCanisterOperationInput, ConfigureExternalCanisterOperationInput,
    CreateExternalCanisterOperationInput, ExternalCanister, ExternalCanisterCallerMethodCallInput,
    ExternalCanisterIdInput, FundExternalCanisterOperationInput, GetExternalCanisterInput,
    GetExternalCanisterResult, ListExternalCanistersInput, ListExternalCanistersResult,
    MonitorExternalCanisterOperationInput, PruneExternalCanisterOperationInput,
    RestoreExternalCanisterOperationInput, SnapshotExternalCanisterOperationInput,
    SubmitRequestInput, SubmitRequestResult,
    // Snapshot query types
    CanisterSnapshot, CanisterSnapshotsInput, CanisterSnapshotsResponse, CanisterSnapshotsResult,
    // Permission types
    Permission, AuthScope,
};
pub use types::{TokenInfo, VotingThresholds};

#[init]
fn init() {
    ic_cdk::println!("DAOPad backend initialized");
}

ic_cdk::export_candid!();
