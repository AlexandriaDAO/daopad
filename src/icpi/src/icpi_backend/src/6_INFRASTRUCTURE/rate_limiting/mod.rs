//! Rate limiting module

use crate::infrastructure::Result;
use std::cell::RefCell;
use std::collections::HashMap;

thread_local! {
    static RATE_LIMITS: RefCell<HashMap<String, u64>> = RefCell::new(HashMap::new());
}

/// Check rate limit for an operation
pub fn check_rate_limit(key: &str, limit_nanos: u64) -> Result<()> {
    let now = ic_cdk::api::time();

    RATE_LIMITS.with(|limits| {
        let mut limits = limits.borrow_mut();

        if let Some(last_time) = limits.get(key) {
            if now - last_time < limit_nanos {
                return Err(crate::infrastructure::IcpiError::Other(
                    format!("Rate limit exceeded. Please wait {} seconds",
                        (limit_nanos - (now - last_time)) / 1_000_000_000)
                ));
            }
        }

        limits.insert(key.to_string(), now);
        Ok(())
    })
}