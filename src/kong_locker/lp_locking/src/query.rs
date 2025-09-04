use ic_cdk::{query, update};
use candid::{Principal, Nat};
use ic_cdk::api::management_canister::main::{canister_status, CanisterIdRecord};

use crate::types::{UserBalancesResult, UserBalancesReply, DetailedCanisterStatus};
use crate::storage::{StorablePrincipal, USER_LOCK_CANISTERS};

/// Get user's lock canister
#[query]
pub fn get_my_lock_canister() -> Option<Principal> {
    let user = ic_cdk::caller();
    USER_LOCK_CANISTERS.with(|c| 
        c.borrow().get(&StorablePrincipal(user)).map(|sp| sp.0)
    )
}

/// Get all lock canisters
#[query]
pub fn get_all_lock_canisters() -> Vec<(Principal, Principal)> {
    USER_LOCK_CANISTERS.with(|c| {
        c.borrow().iter()
            .map(|(user, canister)| (user.0, canister.0))
            .collect()
    })
}

/// Get voting power by querying KongSwap
/// Note: This is marked as #[update] because it makes an inter-canister call,
/// but logically it's a read-only query operation
#[update]
pub async fn get_voting_power(user: Principal) -> Result<Nat, String> {
    let lock_canister = USER_LOCK_CANISTERS.with(|c| 
        c.borrow().get(&StorablePrincipal(user)).map(|sp| sp.0)
    ).ok_or("No lock canister found")?;
    
    // Query KongSwap for LP balance at lock canister principal
    let kong_backend = Principal::from_text("2ipq2-uqaaa-aaaar-qailq-cai").unwrap();
    
    let result: Result<(UserBalancesResult,), _> = ic_cdk::call(
        kong_backend,
        "user_balances",
        (lock_canister.to_text(),)
    ).await;
    
    match result {
        Ok((UserBalancesResult::Ok(balances),)) => {
            // Sum LP balances USD value for voting power
            let total_usd: f64 = balances.iter()
                .map(|balance| match balance {
                    UserBalancesReply::LP(lp) => lp.usd_balance,
                })
                .sum();
            
            // Convert USD to Nat (multiply by 100 to preserve 2 decimal places)
            Ok(Nat::from((total_usd * 100.0) as u64))
        },
        Ok((UserBalancesResult::Err(msg),)) if msg.contains("User not found") => {
            // Not registered yet
            Ok(Nat::from(0u64))
        },
        _ => Ok(Nat::from(0u64))
    }
}

/// Get detailed status including cycles and blackhole verification
/// Note: This is an update call because it queries the management canister
#[update]
pub async fn get_detailed_canister_status() -> Result<DetailedCanisterStatus, String> {
    let user = ic_cdk::caller();
    
    // Get user's lock canister
    let canister_id = USER_LOCK_CANISTERS.with(|c| 
        c.borrow().get(&StorablePrincipal(user)).map(|sp| sp.0)
    ).ok_or("No lock canister found")?;
    
    // Query canister status from management canister
    let status_result = canister_status(CanisterIdRecord { canister_id }).await
        .map_err(|e| format!("Failed to get canister status: {:?}", e))?;
    
    let status = status_result.0;
    
    // Check if blackholed (no controllers)
    let is_blackholed = status.settings.controllers.is_empty();
    let controller_count = status.settings.controllers.len() as u32;
    
    Ok(DetailedCanisterStatus {
        canister_id,
        is_blackholed,
        controller_count,
        cycle_balance: status.cycles,
        memory_size: status.memory_size,
        module_hash: status.module_hash,
    })
}