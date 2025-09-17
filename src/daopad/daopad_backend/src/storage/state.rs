use ic_stable_structures::StableBTreeMap;
use std::cell::RefCell;
use std::collections::BTreeMap;
use crate::storage::memory::{Memory, MEMORY_MANAGER, KONG_LOCKER_PRINCIPALS_MEM_ID, ORBIT_STATIONS_MEM_ID};
use crate::types::StorablePrincipal;
use crate::proposals::orbit_link::OrbitLinkProposal;

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

    // One active proposal per token (enforce at creation)
    // IMPORTANT: Using regular BTreeMap (not stable memory) since proposals are temporary
    // Proposals have a 7-day expiry and don't need to survive canister upgrades
    // This is intentional - active proposals should be resolved before upgrades
    pub static ORBIT_PROPOSALS: RefCell<BTreeMap<StorablePrincipal, OrbitLinkProposal>> = RefCell::new(BTreeMap::new());
}