use crate::proposals::types::{ProposalId, UnifiedProposal, VoteChoice};
use crate::types::StorablePrincipal;
use std::cell::RefCell;
use std::collections::BTreeMap;

// Cache entry for total voting power with timestamp
#[derive(Clone, Debug)]
pub struct VotingPowerCache {
    pub total_vp: u64,
    pub timestamp: u64,
}

thread_local! {
    // ====================================================================
    // Unified Proposal Storage - ALL Orbit Operations
    // ====================================================================
    // MOVED from daopad_backend/src/storage/state.rs
    //
    // Key: (token_canister_id, orbit_request_id)
    // This stores all proposals for community voting
    pub static UNIFIED_PROPOSALS: RefCell<BTreeMap<
        (StorablePrincipal, String),
        UnifiedProposal
    >> = RefCell::new(BTreeMap::new());

    // Unified vote tracking for all proposals
    // Key: (ProposalId, Voter Principal)
    // Prevents double voting and tracks vote history
    pub static UNIFIED_PROPOSAL_VOTES: RefCell<BTreeMap<
        (ProposalId, StorablePrincipal),
        VoteChoice
    >> = RefCell::new(BTreeMap::new());

    // Total voting power cache with TTL (1 hour = 3,600,000,000,000 nanoseconds)
    // Key: token_canister_id
    // Reduces expensive inter-canister calls by caching total VP
    pub static TOTAL_VP_CACHE: RefCell<BTreeMap<
        StorablePrincipal,
        VotingPowerCache
    >> = RefCell::new(BTreeMap::new());
}
