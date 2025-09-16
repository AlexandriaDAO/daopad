use ic_stable_structures::StableBTreeMap;
use std::cell::RefCell;
use crate::storage::memory::{Memory, MEMORY_MANAGER, KONG_LOCKER_PRINCIPALS_MEM_ID, ORBIT_STATIONS_MEM_ID};
use crate::types::{StorablePrincipal, StorableOrbitStation};

thread_local! {
    pub static KONG_LOCKER_PRINCIPALS: RefCell<StableBTreeMap<StorablePrincipal, StorablePrincipal, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(KONG_LOCKER_PRINCIPALS_MEM_ID))
        )
    );

    pub static ORBIT_STATIONS: RefCell<StableBTreeMap<StorablePrincipal, StorableOrbitStation, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(ORBIT_STATIONS_MEM_ID))
        )
    );
}