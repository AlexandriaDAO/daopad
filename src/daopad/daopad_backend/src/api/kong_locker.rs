use candid::Principal;
use ic_cdk::{query, update};
use crate::storage::state::KONG_LOCKER_PRINCIPALS;
use crate::types::StorablePrincipal;
use crate::kong_locker::registration::register_with_kong_locker_internal;

#[update]
pub async fn register_with_kong_locker(kong_locker_principal: Principal) -> Result<String, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    register_with_kong_locker_internal(caller, kong_locker_principal).await
}

#[query]
pub fn get_my_kong_locker_canister() -> Option<Principal> {
    let caller = ic_cdk::caller();
    KONG_LOCKER_PRINCIPALS.with(|p| p.borrow().get(&StorablePrincipal(caller)).map(|sp| sp.0))
}

#[query]
pub fn list_all_kong_locker_registrations() -> Vec<(Principal, Principal)> {
    KONG_LOCKER_PRINCIPALS.with(|p| {
        p.borrow().iter()
            .map(|(user, canister)| (user.0, canister.0))
            .collect()
    })
}

#[update]
pub fn unregister_kong_locker() -> Result<String, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    KONG_LOCKER_PRINCIPALS.with(|principals| {
        if principals.borrow_mut().remove(&StorablePrincipal(caller)).is_some() {
            Ok("Kong Locker canister unregistered successfully".to_string())
        } else {
            Err("No Kong Locker canister registered for your principal".to_string())
        }
    })
}