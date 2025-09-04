use candid::{CandidType, Deserialize, Nat, Principal};
use serde::Serialize;

// ===== ICRC-2 Types for Payment =====
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<Vec<u8>>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TransferFromArgs {
    pub spender_subaccount: Option<Vec<u8>>,
    pub from: Account,
    pub to: Account,
    pub amount: Nat,
    pub fee: Option<Nat>,
    pub memo: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum TransferFromError {
    BadFee { expected_fee: Nat },
    BadBurn { min_burn_amount: Nat },
    InsufficientFunds { balance: Nat },
    InsufficientAllowance { allowance: Nat },
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    Duplicate { duplicate_of: Nat },
    TemporarilyUnavailable,
    GenericError { error_code: Nat, message: String },
}

// ICRC-1 Transfer types
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TransferArgs {
    pub from_subaccount: Option<Vec<u8>>,
    pub to: Account,
    pub amount: Nat,
    pub fee: Option<Nat>,
    pub memo: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum TransferError {
    BadFee { expected_fee: Nat },
    BadBurn { min_burn_amount: Nat },
    InsufficientFunds { balance: Nat },
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    Duplicate { duplicate_of: Nat },
    TemporarilyUnavailable,
    GenericError { error_code: Nat, message: String },
}

// ===== KongSwap Types for Factory =====
#[derive(CandidType, Clone, Debug, Serialize, Deserialize)]
pub enum UserBalancesResult {
    Ok(Vec<UserBalancesReply>),
    Err(String),
}

#[derive(CandidType, Clone, Debug, Serialize, Deserialize)]
pub enum UserBalancesReply {
    LP(LPReply),  // Only LP token balances
}

#[derive(CandidType, Clone, Debug, Serialize, Deserialize)]
pub struct LPReply {
    pub symbol: String,        // LP token symbol (e.g., "ICP_ckUSDT")
    pub name: String,          // Full name of LP token
    pub balance: f64,          // LP token balance (human-readable)
    pub usd_balance: f64,      // Total USD value of LP position
    pub symbol_0: String,      // First token symbol
    pub amount_0: f64,         // Amount of first token
    pub usd_amount_0: f64,     // USD value of first token
    pub symbol_1: String,      // Second token symbol
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