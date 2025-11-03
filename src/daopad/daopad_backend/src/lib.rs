mod api;
mod client;
mod kong_locker;
mod proposals;
mod storage;
mod types;

use candid::{Nat, Principal};
use ic_cdk::init;
use crate::types::AccountMinimalWithBalances;

pub use api::*;
pub use api::orbit_overview::DaoOverviewStats;
pub use proposals::{
    create_orbit_request_with_proposal,
    ensure_proposal_for_request,
    OrbitOperation,
    UnifiedProposal,
    OrbitRequestProposal, OrbitRequestType, ProposalError, ProposalId, ProposalType,
    TransferDetails, TreasuryProposal, VoteChoice,
};
pub use types::orbit::{
    Account, AccountBalance, AccountMinimal,  // Added AccountMinimal
    // Minimal types (no Option<T> for Candid 0.10.18 compatibility)
    SystemInfoResponseMinimal, ListAccountsResultMinimal,
    PaginationInputMinimal, ListExternalCanistersInputMinimal,  // Added ListExternalCanistersInputMinimal
    Resource,
    // User types
    UserDTO, UserGroup,
    // External canister types
    ChangeExternalCanisterOperationInput, ConfigureExternalCanisterOperationInput,
    CreateExternalCanisterOperationInput, ExternalCanister, ExternalCanisterCallerMethodCallInput,
    ExternalCanisterIdInput, ExternalCanisterState, FundExternalCanisterOperationInput, GetExternalCanisterInput,
    GetExternalCanisterResult, ListExternalCanistersResult,
    MonitorExternalCanisterOperationInput, PruneExternalCanisterOperationInput,
    RestoreExternalCanisterOperationInput, SnapshotExternalCanisterOperationInput,
    SubmitRequestInput, SubmitRequestResult,
    // Snapshot query types
    CanisterSnapshot, CanisterSnapshotsInput, CanisterSnapshotsResponse, CanisterSnapshotsResult,
    // Permission types
    Permission, AuthScope,
    // Request policies types
    RequestPoliciesDetails, RequestPolicyInfo,
    // Treasury management types
    TreasuryManagementData, TreasuryAccountDetails, TreasuryAddressBookEntry, AssetBalanceInfo,
};
pub use types::{AgreementSnapshot, TokenInfo, VotingThresholds};

#[init]
fn init() {
    ic_cdk::println!("DAOPad backend initialized");
}

ic_cdk::export_candid!();
