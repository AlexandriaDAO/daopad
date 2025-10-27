use crate::proposals::orbit_link::OrbitLinkProposal;
use crate::proposals::types::{ProposalId, VoteChoice};
use crate::storage::memory::{
    Memory, AGREEMENT_SNAPSHOTS_MEM_ID, KONG_LOCKER_PRINCIPALS_MEM_ID, MEMORY_MANAGER,
    ORBIT_STATIONS_MEM_ID, STATION_TO_TOKEN_MEM_ID,
};
use crate::types::{AgreementSnapshot, StorablePrincipal, VotingThresholds};
use ic_stable_structures::StableBTreeMap;
use std::cell::RefCell;
use std::collections::{BTreeMap, HashMap, HashSet};
use candid::Principal;

thread_local! {
    pub static KONG_LOCKER_PRINCIPALS: RefCell<StableBTreeMap<StorablePrincipal, StorablePrincipal, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(KONG_LOCKER_PRINCIPALS_MEM_ID))
        )
    );

    // Simple mapping: token_principal -> orbit_station_principal
    pub static TOKEN_ORBIT_STATIONS: RefCell<StableBTreeMap<StorablePrincipal, StorablePrincipal, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(ORBIT_STATIONS_MEM_ID))
        )
    );

    // Reverse mapping: orbit_station_principal -> token_principal
    // CRITICAL: Prevents the same Orbit Station from being linked to multiple tokens
    // Security: Stops malicious tokens from hijacking another token's treasury
    pub static STATION_TO_TOKEN: RefCell<StableBTreeMap<StorablePrincipal, StorablePrincipal, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(STATION_TO_TOKEN_MEM_ID))
        )
    );

    // Agreement snapshot storage
    // Store agreement snapshots by token_id for persistent legal documentation
    pub static AGREEMENT_SNAPSHOTS: RefCell<StableBTreeMap<StorablePrincipal, AgreementSnapshot, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(AGREEMENT_SNAPSHOTS_MEM_ID))
        )
    );

    // One active proposal per token (enforce at creation)
    // IMPORTANT: Using regular BTreeMap (not stable memory) since proposals are temporary
    // Proposals have a 7-day expiry and don't need to survive canister upgrades
    // This is intentional - active proposals should be resolved before upgrades
    pub static ORBIT_PROPOSALS: RefCell<BTreeMap<StorablePrincipal, OrbitLinkProposal>> = RefCell::new(BTreeMap::new());

    // Voting thresholds for each token's governance
    // IMPORTANT: Using regular BTreeMap since these can be reconfigured
    // and we want flexibility during the DAO transition phase
    pub static VOTING_THRESHOLDS: RefCell<BTreeMap<StorablePrincipal, VotingThresholds>> = RefCell::new(BTreeMap::new());

    // ============================================================================
    // Unified Proposal Storage - ALL Orbit Operations
    // ============================================================================
    // IMPORTANT: Using regular BTreeMap (not stable memory) since proposals are temporary
    // and expire in 7 days. They don't need to survive canister upgrades.
    //
    // DESIGN: Single storage for ALL proposal types (treasury, user management, etc.)
    // Key: (token_canister_id, orbit_request_id) for unique identification
    // This replaces both TREASURY_PROPOSALS and ORBIT_REQUEST_PROPOSALS
    //
    // Benefits:
    // - ONE voting system instead of three
    // - ONE storage system to maintain
    // - Consistent behavior across all operations
    // - Easier to add new Orbit operations
    pub static UNIFIED_PROPOSALS: RefCell<BTreeMap<(StorablePrincipal, String), crate::proposals::unified::UnifiedProposal>> = RefCell::new(BTreeMap::new());

    // Unified vote tracking for all proposals
    // Key: (ProposalId, Voter Principal)
    // Allows efficient double-vote prevention without storing full voter sets in proposals
    pub static UNIFIED_PROPOSAL_VOTES: RefCell<BTreeMap<(ProposalId, StorablePrincipal), VoteChoice>> = RefCell::new(BTreeMap::new());

    // Legacy vote tracking (kept for orbit_link.rs compatibility)
    // TODO: Migrate orbit_link.rs to use UNIFIED_PROPOSAL_VOTES
    pub static PROPOSAL_VOTES: RefCell<BTreeMap<(ProposalId, StorablePrincipal), VoteChoice>> = RefCell::new(BTreeMap::new());
}
