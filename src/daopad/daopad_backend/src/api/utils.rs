use crate::storage::memory::KONG_LOCKER_FACTORY;
use candid::Principal;
use ic_cdk::query;

#[query]
pub fn get_backend_principal() -> Principal {
    ic_cdk::id()
}

#[query]
pub fn get_kong_locker_factory_principal() -> Principal {
    Principal::from_text(KONG_LOCKER_FACTORY).unwrap()
}

#[query]
pub fn health_check() -> String {
    format!("DAOPad with Orbit Station Support - Healthy")
}
