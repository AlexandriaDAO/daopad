use crate::proposals::orbit_link::OrbitLinkProposal;
use crate::storage::memory::{
    Memory, KONG_LOCKER_PRINCIPALS_MEM_ID, MEMORY_MANAGER, ORBIT_STATIONS_MEM_ID,
    STATION_TO_TOKEN_MEM_ID,
};
use crate::types::{StorablePrincipal, VotingThresholds};
use ic_stable_structures::StableBTreeMap;
use std::cell::RefCell;
use std::collections::BTreeMap;

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

    // One active proposal per token (enforce at creation)
    // IMPORTANT: Using regular BTreeMap (not stable memory) since proposals are temporary
    // Proposals have a 7-day expiry and don't need to survive canister upgrades
    // This is intentional - active proposals should be resolved before upgrades
    pub static ORBIT_PROPOSALS: RefCell<BTreeMap<StorablePrincipal, OrbitLinkProposal>> = RefCell::new(BTreeMap::new());

    // Voting thresholds for each token's governance
    // IMPORTANT: Using regular BTreeMap since these can be reconfigured
    // and we want flexibility during the DAO transition phase
    pub static VOTING_THRESHOLDS: RefCell<BTreeMap<StorablePrincipal, VotingThresholds>> = RefCell::new(BTreeMap::new());
}
