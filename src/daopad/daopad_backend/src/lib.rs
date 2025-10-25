mod api;
mod kong_locker;
mod proposals;
mod storage;
mod types;

use candid::{Nat, Principal};
use ic_cdk::{init, post_upgrade};
use crate::types::{AccountMinimalWithBalances, AccountAssetWithBalance};

pub use api::*;
pub use api::orbit_overview::DaoOverviewStats;
pub use proposals::orbit_link::{OrbitLinkProposal, ProposalStatus};
pub use proposals::{
    // Unified voting system exports
    vote_on_proposal,                      // Single voting endpoint
    create_orbit_request_with_proposal,    // Single creation endpoint
    get_proposal,                          // Single query
    list_unified_proposals,                // Single list
    ensure_proposal_for_request,           // For backwards compatibility
    has_user_voted,
    get_user_vote,
    OrbitOperation,
    UnifiedProposal,

    // Types
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

#[post_upgrade]
fn post_upgrade() {
    ic_cdk::println!("DAOPad backend upgraded");
}

ic_cdk::export_candid!();
