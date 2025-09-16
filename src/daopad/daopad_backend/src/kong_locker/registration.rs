use candid::Principal;
use ic_cdk::call;
use crate::storage::state::KONG_LOCKER_PRINCIPALS;
use crate::storage::memory::KONG_LOCKER_FACTORY;
use crate::types::StorablePrincipal;

pub async fn register_with_kong_locker_internal(caller: Principal, kong_locker_principal: Principal) -> Result<String, String> {
    let kong_locker_factory = Principal::from_text(KONG_LOCKER_FACTORY)
        .map_err(|e| format!("Invalid Kong Locker factory ID: {}", e))?;

    let all_lock_canisters: Result<(Vec<(Principal, Principal)>,), _> = call(
        kong_locker_factory,
        "get_all_lock_canisters",
        ()
    ).await;

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
            StorablePrincipal(kong_locker_principal)
        );
    });

    Ok(format!("Successfully registered Kong Locker canister: {}", kong_locker_principal))
}

pub fn get_kong_locker_for_user(user: Principal) -> Option<Principal> {
    KONG_LOCKER_PRINCIPALS.with(|p| {
        p.borrow().get(&StorablePrincipal(user)).map(|sp| sp.0)
    })
}