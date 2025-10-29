use crate::storage::memory::KONG_LOCKER_FACTORY;
use crate::storage::state::KONG_LOCKER_PRINCIPALS;
use crate::types::StorablePrincipal;
use candid::Principal;
use ic_cdk::call;

pub async fn register_with_kong_locker_internal(
    caller: Principal,
    kong_locker_principal: Principal,
) -> Result<String, String> {
    let kong_locker_factory = Principal::from_text(KONG_LOCKER_FACTORY)
        .map_err(|e| format!("Invalid Kong Locker factory ID: {}", e))?;

    let all_lock_canisters: Result<(Vec<(Principal, Principal)>,), _> =
        call(kong_locker_factory, "get_all_lock_canisters", ()).await;

    let lock_canisters = all_lock_canisters
        .map_err(|e| format!("Failed to verify lock canister: {:?}", e))?
        .0;

    let owner = lock_canisters
        .iter()
        .find(|(_user, canister)| *canister == kong_locker_principal)
        .map(|(user, _)| *user)
        .ok_or("Lock canister not found in Kong Locker registry")?;

    if owner != caller {
        return Err("You don't own this Kong Locker canister".to_string());
    }

    KONG_LOCKER_PRINCIPALS.with(|principals| {
        principals.borrow_mut().insert(
            StorablePrincipal(caller),
            StorablePrincipal(kong_locker_principal),
        );
    });

    Ok(format!(
        "Successfully registered Kong Locker canister: {}",
        kong_locker_principal
    ))
}

pub fn get_kong_locker_for_user(user: Principal) -> Option<Principal> {
    KONG_LOCKER_PRINCIPALS.with(|p| p.borrow().get(&StorablePrincipal(user)).map(|sp| sp.0))
}

/// Auto-lookup and optionally cache a user's Kong Locker canister from the factory
pub async fn get_or_lookup_kong_locker(user: Principal) -> Result<Principal, String> {
    // First check local cache
    if let Some(canister) = get_kong_locker_for_user(user) {
        return Ok(canister);
    }

    // Not in cache - query the Kong Locker factory
    let kong_locker_factory = Principal::from_text(KONG_LOCKER_FACTORY)
        .map_err(|e| format!("Invalid Kong Locker factory ID: {}", e))?;

    let all_lock_canisters: Result<(Vec<(Principal, Principal)>,), _> =
        call(kong_locker_factory, "get_all_lock_canisters", ()).await;

    let lock_canisters = all_lock_canisters
        .map_err(|e| format!("Failed to query Kong Locker factory: {:?}", e))?
        .0;

    // Find user's lock canister
    let kong_locker_canister = lock_canisters
        .iter()
        .find(|(owner, _canister)| *owner == user)
        .map(|(_owner, canister)| *canister)
        .ok_or("No Kong Locker canister found for this user")?;

    // Cache it for future use
    KONG_LOCKER_PRINCIPALS.with(|principals| {
        principals.borrow_mut().insert(
            StorablePrincipal(user),
            StorablePrincipal(kong_locker_canister),
        );
    });

    Ok(kong_locker_canister)
}
