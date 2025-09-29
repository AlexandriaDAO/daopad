use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::call::CallResult;
use crate::types::{KONG_LOCKER_ID, validate_principal};
use std::cell::RefCell;

// Cache for lock canisters
thread_local! {
    static LOCK_CANISTERS_CACHE: RefCell<Option<CachedLockCanisters>> = RefCell::new(None);
}

#[derive(CandidType, Deserialize, Default)]
struct CachedLockCanisters {
    canisters: Vec<(Principal, Principal)>,
    last_updated: u64,
    ttl_seconds: u64,
}

// Get all lock canisters from kong_locker
pub async fn get_all_lock_canisters() -> Result<Vec<(Principal, Principal)>, String> {
    // Check cache first
    let now = ic_cdk::api::time() / 1_000_000_000; // Convert to seconds

    let cached = LOCK_CANISTERS_CACHE.with(|cache| {
        cache.borrow().as_ref().and_then(|c| {
            if now - c.last_updated < c.ttl_seconds {
                Some(c.canisters.clone())
            } else {
                None
            }
        })
    });

    if let Some(canisters) = cached {
        ic_cdk::println!("Using cached lock canisters (count: {})", canisters.len());
        return Ok(canisters);
    }

    // Query kong_locker
    let kong_locker = validate_principal(KONG_LOCKER_ID)?;

    let call_result: CallResult<(Vec<(Principal, Principal)>,)> =
        ic_cdk::call(kong_locker, "get_all_lock_canisters", ()).await;

    match call_result {
        Ok((canisters,)) => {
            ic_cdk::println!("Retrieved {} lock canisters from kong_locker", canisters.len());

            // Update cache
            LOCK_CANISTERS_CACHE.with(|cache| {
                *cache.borrow_mut() = Some(CachedLockCanisters {
                    canisters: canisters.clone(),
                    last_updated: now,
                    ttl_seconds: 3600, // 1 hour TTL
                });
            });

            Ok(canisters)
        }
        Err(e) => {
            let error_msg = format!("Failed to get lock canisters: {:?}", e);
            ic_cdk::println!("{}", error_msg);
            Err(error_msg)
        }
    }
}

// Get lock canisters with retry logic
pub async fn get_lock_canisters_with_retry(max_retries: u32) -> Result<Vec<(Principal, Principal)>, String> {
    let mut attempts = 0;

    loop {
        attempts += 1;

        match get_all_lock_canisters().await {
            Ok(result) => return Ok(result),
            Err(e) if attempts < max_retries => {
                ic_cdk::println!("Kong locker query failed (attempt {}): {}", attempts, e);
                // Exponential backoff
                let wait_ms = 100 * (2_u64.pow(attempts));
                ic_cdk::println!("Waiting {}ms before retry...", wait_ms);
                // Note: In a real implementation, you'd use ic-cdk-timers
                // For now we'll just try again immediately
            }
            Err(e) => {
                return Err(format!("Kong locker query failed after {} attempts: {}", attempts, e));
            }
        }
    }
}

// Clear the cache (useful for testing or force refresh)
pub fn clear_lock_canisters_cache() {
    LOCK_CANISTERS_CACHE.with(|cache| {
        *cache.borrow_mut() = None;
    });
    ic_cdk::println!("Lock canisters cache cleared");
}

// Get cache statistics
pub fn get_cache_stats() -> (bool, Option<u64>, Option<usize>) {
    LOCK_CANISTERS_CACHE.with(|cache| {
        if let Some(c) = cache.borrow().as_ref() {
            (true, Some(c.last_updated), Some(c.canisters.len()))
        } else {
            (false, None, None)
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_initialization() {
        let stats = get_cache_stats();
        assert_eq!(stats.0, false);
        assert_eq!(stats.1, None);
        assert_eq!(stats.2, None);
    }
}