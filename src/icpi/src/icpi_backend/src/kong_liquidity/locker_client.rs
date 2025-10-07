use crate::infrastructure::cache::{get_cached, CachePolicy};
use candid::Principal;

const KONG_LOCKER_BACKEND: &str = "eazgb-giaaa-aaaap-qqc2q-cai";

/// Query all lock canisters from Kong Locker
/// Cached for 1 hour as lock canisters don't change frequently
pub async fn get_all_lock_canisters() -> Result<Vec<String>, String> {
    get_cached(
        "kong_lock_canisters",
        CachePolicy::Long,
        || fetch_lock_canisters()
    )
}

/// Fetch lock canisters from Kong Locker (uncached)
async fn fetch_lock_canisters() -> Result<Vec<String>, String> {
    let kong_locker = Principal::from_text(KONG_LOCKER_BACKEND)
        .map_err(|e| format!("Invalid Kong Locker principal: {}", e))?;

    let result: Result<(Vec<String>,), _> = ic_cdk::call(
        kong_locker,
        "get_all_lock_canisters",
        (),
    ).await;

    match result {
        Ok((canisters,)) => {
            ic_cdk::println!("Found {} lock canisters", canisters.len());
            Ok(canisters)
        }
        Err(e) => Err(format!("Failed to query lock canisters: {:?}", e))
    }
}

/// Check if a canister is a valid lock canister
pub async fn is_lock_canister(canister_id: &str) -> bool {
    match get_all_lock_canisters().await {
        Ok(canisters) => canisters.contains(&canister_id.to_string()),
        Err(_) => false,
    }
}