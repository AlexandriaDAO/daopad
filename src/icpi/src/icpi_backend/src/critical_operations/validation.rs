use candid::{Nat, Principal};
use crate::types::tokens::TrackedToken;
use crate::infrastructure::cache::assert_no_cache_for_critical_op;

/// Validate principal is not anonymous
pub fn validate_principal(principal: &Principal) -> Result<(), String> {
    if *principal == Principal::anonymous() {
        return Err("Anonymous principal not allowed".to_string());
    }
    Ok(())
}

/// Validate amount is within reasonable bounds
pub fn validate_amount(amount: &Nat, min: u64, max: u64) -> Result<(), String> {
    let amount_u64 = amount.0.to_u64().ok_or("Amount too large")?;

    if amount_u64 < min {
        return Err(format!("Amount {} below minimum {}", amount_u64, min));
    }

    if amount_u64 > max {
        return Err(format!("Amount {} exceeds maximum {}", amount_u64, max));
    }

    Ok(())
}

/// Validate token is tracked
pub fn validate_tracked_token(symbol: &str) -> Result<TrackedToken, String> {
    TrackedToken::from_symbol(symbol)
}

/// Assert operation is atomic (no partial execution)
pub fn assert_atomic_operation(operation: &str) {
    assert_no_cache_for_critical_op(operation);
    ic_cdk::println!("ATOMIC_OP_START: {}", operation);
}

/// Complete atomic operation
pub fn complete_atomic_operation(operation: &str, success: bool) {
    ic_cdk::println!("ATOMIC_OP_END: {} | Success: {}", operation, success);
}

/// Rate limiting check (simple implementation)
thread_local! {
    static LAST_OPERATION: std::cell::RefCell<std::collections::HashMap<String, u64>> =
        std::cell::RefCell::new(std::collections::HashMap::new());
}

pub fn check_rate_limit(operation: &str, min_interval_nanos: u64) -> Result<(), String> {
    let now = ic_cdk::api::time();

    LAST_OPERATION.with(|ops| {
        let mut ops = ops.borrow_mut();

        if let Some(last_time) = ops.get(operation) {
            if now - last_time < min_interval_nanos {
                return Err(format!(
                    "Rate limit: Operation {} called too frequently",
                    operation
                ));
            }
        }

        ops.insert(operation.to_string(), now);
        Ok(())
    })
}