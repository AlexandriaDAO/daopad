use crate::proposals::types::{ProposalId, UnifiedProposal, VoteChoice};
use crate::types::StorablePrincipal;
use std::cell::RefCell;
use std::collections::BTreeMap;

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
}
