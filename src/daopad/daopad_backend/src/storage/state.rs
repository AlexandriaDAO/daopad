use crate::proposals::orbit_link::OrbitLinkProposal;
use crate::proposals::types::{VoteChoice, OrbitRequestProposal};
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

    // ========================================================================
    // Orbit Request Vote Tracking (Minimal Storage)
    // ========================================================================

    // Track votes for Orbit requests
    // Key: (token_id, orbit_request_id) -> Map of voter -> VoteChoice
    pub static ORBIT_REQUEST_VOTES: RefCell<HashMap<(Principal, String), HashMap<Principal, VoteChoice>>> = RefCell::new(HashMap::new());

    // Track vote summaries for quick retrieval
    // Key: (token_id, orbit_request_id) -> (yes_votes, no_votes, total_voting_power)
    pub static ORBIT_REQUEST_VOTE_SUMMARIES: RefCell<HashMap<(Principal, String), (u64, u64, u64)>> = RefCell::new(HashMap::new());

    // Track proposal metadata (minimal - just what we need)
    // Key: (token_id, orbit_request_id) -> OrbitRequestProposal
    pub static ORBIT_REQUEST_PROPOSALS: RefCell<HashMap<(Principal, String), OrbitRequestProposal>> = RefCell::new(HashMap::new());
}
