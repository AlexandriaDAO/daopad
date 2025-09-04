use ic_cdk::{query, update};
use candid::{Principal, Nat, CandidType, Deserialize};

use crate::types::{UserBalancesResult, UserBalancesReply};
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

#[derive(CandidType, Deserialize)]
pub struct CanisterStatus {
    pub canister_id: Principal,
    pub has_code: bool,
    pub has_icp: bool,
    pub is_registered: bool,
    pub is_blackholed: bool,
}

/// Get the status of a user's lock canister
#[query]
pub fn get_my_canister_status() -> Option<CanisterStatus> {
    let user = ic_cdk::caller();
    
    USER_LOCK_CANISTERS.with(|c| 
        c.borrow().get(&StorablePrincipal(user)).map(|sp| {
            CanisterStatus {
                canister_id: sp.0,
                // In production, you'd want to check these async
                // For now, return the ID and let frontend check status
                has_code: true, // Would need async check
                has_icp: false, // Would need async check
                is_registered: false, // Would need async check
                is_blackholed: false, // Would need async check
            }
        })
    )
}