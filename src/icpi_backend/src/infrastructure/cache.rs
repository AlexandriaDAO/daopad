use std::cell::RefCell;
use std::collections::HashMap;
use ic_cdk::api::time;

thread_local! {
    static CACHE_STORE: RefCell<CacheManager> = RefCell::new(CacheManager::new());
}

#[derive(Clone, Debug)]
struct CacheEntry<T: Clone> {
    data: T,
    timestamp: u64,
    ttl_seconds: u64,
}

impl<T: Clone> CacheEntry<T> {
    fn is_valid(&self) -> bool {
        let now = time() / 1_000_000_000; // Convert to seconds
        now < self.timestamp + self.ttl_seconds
    }
}

pub struct CacheManager {
    entries: HashMap<String, Vec<u8>>,
}

impl CacheManager {
    fn new() -> Self {
        Self {
            entries: HashMap::new(),
        }
    }

    pub fn clear_all() {
        CACHE_STORE.with(|c| c.borrow_mut().entries.clear())
    }

    pub fn panic_if_cache_detected(operation: &str) {
        CACHE_STORE.with(|c| {
            if !c.borrow().entries.is_empty() {
                panic!("SECURITY VIOLATION: Cache detected in critical operation: {}", operation);
            }
        })
    }
}

pub enum CachePolicy {
    NoCache,           // Never cache (critical operations)
    Short,             // 30 seconds (portfolio data display)
    Medium,            // 5 minutes (informational queries)
    Long,              // 1 hour (external reference data)
}

impl CachePolicy {
    pub fn ttl_seconds(&self) -> u64 {
        match self {
            CachePolicy::NoCache => 0,
            CachePolicy::Short => 30,
            CachePolicy::Medium => 300,
            CachePolicy::Long => 3600,
        }
    }

    pub fn allows_caching(&self) -> bool {
        !matches!(self, CachePolicy::NoCache)
    }
}

// Generic cache functions
pub fn get_cached<T, F>(key: &str, policy: CachePolicy, fetch_fn: F) -> Result<T, String>
where
    T: Clone + serde::Serialize + for<'de> serde::Deserialize<'de>,
    F: FnOnce() -> Result<T, String>,
{
    // For NoCache policy, always fetch fresh
    if !policy.allows_caching() {
        return fetch_fn();
    }

    // Check cache
    let cache_key = key.to_string();
    let cached_value = CACHE_STORE.with(|c| {
        if let Some(bytes) = c.borrow().entries.get(&cache_key) {
            // Try to deserialize
            if let Ok(entry) = serde_cbor::from_slice::<CacheEntry<T>>(bytes) {
                if entry.is_valid() {
                    return Some(entry.data);
                }
            }
        }
        None
    });

    if let Some(value) = cached_value {
        ic_cdk::println!("CACHE HIT: {}", key);
        return Ok(value);
    }

    // Fetch fresh data
    ic_cdk::println!("CACHE MISS: {}", key);
    let fresh_data = fetch_fn()?;

    // Store in cache
    let entry = CacheEntry {
        data: fresh_data.clone(),
        timestamp: time() / 1_000_000_000,
        ttl_seconds: policy.ttl_seconds(),
    };

    if let Ok(bytes) = serde_cbor::to_vec(&entry) {
        CACHE_STORE.with(|c| {
            c.borrow_mut().entries.insert(cache_key, bytes);
        });
    }

    Ok(fresh_data)
}

pub fn invalidate_cache(pattern: &str) {
    CACHE_STORE.with(|c| {
        let mut cache = c.borrow_mut();
        let keys_to_remove: Vec<_> = cache.entries.keys()
            .filter(|k| k.contains(pattern))
            .cloned()
            .collect();

        for key in keys_to_remove {
            cache.entries.remove(&key);
            ic_cdk::println!("CACHE INVALIDATED: {}", key);
        }
    })
}

// Security assertion for critical operations
pub fn assert_no_cache_for_critical_op(operation: &str) {
    #[cfg(not(test))]
    CacheManager::panic_if_cache_detected(operation);
}