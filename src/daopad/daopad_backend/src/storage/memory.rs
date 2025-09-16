use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    DefaultMemoryImpl,
};
use std::cell::RefCell;

pub type Memory = VirtualMemory<DefaultMemoryImpl>;

pub const KONG_LOCKER_PRINCIPALS_MEM_ID: MemoryId = MemoryId::new(0);
pub const ORBIT_STATIONS_MEM_ID: MemoryId = MemoryId::new(1);

pub const KONG_LOCKER_FACTORY: &str = "eazgb-giaaa-aaaap-qqc2q-cai";

thread_local! {
    pub static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
}