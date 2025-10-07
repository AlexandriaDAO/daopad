use candid::Principal;
use ic_cdk::api::time;

pub struct AuditLogger;

impl AuditLogger {
    pub fn log_mint(
        user: Principal,
        usdt_amount: u64,
        icpi_minted: u64,
        tvl_before: u64,
        tvl_after: u64,
    ) {
        let timestamp = time();
        ic_cdk::println!(
            "MINT_AUDIT | time:{} | user:{} | usdt:{} | icpi:{} | tvl_before:{} | tvl_after:{}",
            timestamp,
            user,
            usdt_amount,
            icpi_minted,
            tvl_before,
            tvl_after
        );
    }

    pub fn log_burn(
        user: Principal,
        icpi_burned: u64,
        tokens_returned: Vec<(String, u64)>,
        tvl_before: u64,
        tvl_after: u64,
    ) {
        let timestamp = time();
        ic_cdk::println!(
            "BURN_AUDIT | time:{} | user:{} | icpi:{} | tokens:{:?} | tvl_before:{} | tvl_after:{}",
            timestamp,
            user,
            icpi_burned,
            tokens_returned,
            tvl_before,
            tvl_after
        );
    }

    pub fn log_swap(
        token_in: &str,
        amount_in: u64,
        token_out: &str,
        amount_out: u64,
        pool: &str,
    ) {
        let timestamp = time();
        ic_cdk::println!(
            "SWAP_AUDIT | time:{} | in:{}:{} | out:{}:{} | pool:{}",
            timestamp,
            token_in,
            amount_in,
            token_out,
            amount_out,
            pool
        );
    }

    pub fn log_critical_error(operation: &str, error: &str, context: &str) {
        let timestamp = time();
        ic_cdk::println!(
            "CRITICAL_ERROR | time:{} | op:{} | error:{} | context:{}",
            timestamp,
            operation,
            error,
            context
        );
    }

    pub fn log_security_event(event: &str, details: &str) {
        let timestamp = time();
        ic_cdk::println!(
            "SECURITY_EVENT | time:{} | event:{} | details:{}",
            timestamp,
            event,
            details
        );
    }
}