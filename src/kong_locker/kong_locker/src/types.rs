use candid::{CandidType, Deserialize, Nat, Principal};
use serde::Serialize;

// ===== KongSwap Types (matching actual KongSwap implementation) =====

// UserBalancesReply - matches kong_backend/src/user_balances/user_balances_reply.rs
#[derive(CandidType, Clone, Debug, Serialize, Deserialize)]
pub enum UserBalancesReply {
    LP(LPReply),  // Only LP token balances
}

// LPReply - matches kong_backend/src/user_balances/lp_reply.rs
#[derive(CandidType, Clone, Debug, Serialize, Deserialize)]
pub struct LPReply {
    pub name: String,          // Full name of LP token
    pub symbol: String,        // LP token symbol (e.g., "ICP_ckUSDT")
    pub lp_token_id: u64,      // LP token ID
    pub balance: f64,          // LP token balance (human-readable)
    pub usd_balance: f64,      // Total USD value of LP position
    pub chain_0: String,       // Chain of first token
    pub symbol_0: String,      // First token symbol
    pub address_0: String,     // Address of first token
    pub amount_0: f64,         // Amount of first token
    pub usd_amount_0: f64,     // USD value of first token
    pub chain_1: String,       // Chain of second token
    pub symbol_1: String,      // Second token symbol
    pub address_1: String,     // Address of second token
    pub amount_1: f64,         // Amount of second token
    pub usd_amount_1: f64,     // USD value of second token
    pub ts: u64,              // Timestamp
}

/// Detailed canister status with cycles and controller info
#[derive(CandidType, Deserialize)]
pub struct DetailedCanisterStatus {
    pub canister_id: Principal,
    pub is_blackholed: bool,
    pub controller_count: u32,
    pub cycle_balance: Nat,
    pub memory_size: Nat,
    pub module_hash: Option<Vec<u8>>,
}