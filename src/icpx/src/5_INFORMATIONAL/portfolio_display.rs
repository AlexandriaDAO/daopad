//! Portfolio display with caching
//! Security: INFORMATIONAL - Never used in calculations

use candid::Nat;
use std::cell::RefCell;
use std::collections::HashMap;

use crate::infrastructure::types::*;

thread_local! {
    static CACHED_PORTFOLIO: RefCell<Option<CachedData<PortfolioDisplay>>> = RefCell::new(None);
}

/// Get portfolio display data (cached)
pub fn get_portfolio_display() -> PortfolioDisplay {
    CACHED_PORTFOLIO.with(|cache| {
        if let Some(cached) = &*cache.borrow() {
            if !cached.is_expired() {
                return cached.data.clone();
            }
        }

        // Cache miss or expired - return default for now
        // In production, would trigger async recalculation
        PortfolioDisplay {
            total_value_usd: 0.0,
            positions: Vec::new(),
            targets: HashMap::new(),
            deviations: HashMap::new(),
            supply: Nat::from(0u64),
            last_rebalance: None,
            timestamp: ic_cdk::api::time(),
        }
    })
}