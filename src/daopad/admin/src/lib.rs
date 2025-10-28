// Admin canister - Handles governance and approval of Orbit requests
// Separated from backend to comply with Orbit Station separation of duties

mod api;
mod proposals;
mod kong_locker;
mod storage;
mod types;

use candid::{CandidType, Deserialize, Principal};
use ic_cdk::{init, update, query};
use proposals::types::{ProposalId, UnifiedProposal, VoteChoice, ProposalError};

#[init]
fn init() {
    ic_cdk::println!("🔐 Admin canister initialized: {:?}", ic_cdk::id());
    ic_cdk::println!("📜 This canister handles governance and approval of Orbit requests");
}

// ============================================================================
// Public API - Called by Frontend
// ============================================================================

// Ensure proposal exists (auto-creates if needed) - exported from unified.rs
pub use proposals::unified::ensure_proposal_for_request;

// vote_on_proposal is defined in proposals::unified and automatically exported via #[update]
pub use proposals::unified::vote_on_proposal;

// ============================================================================
// Query Methods - Re-exported from unified module
// ============================================================================

// Query methods are defined in proposals::unified and automatically exported via #[query]
pub use proposals::unified::{
    get_proposal,
    list_unified_proposals,
    has_user_voted,
    get_user_vote,
};

// ============================================================================
// Candid Export
// ============================================================================

ic_cdk::export_candid!();
