//! Core type definitions for ICPX backend
//! Security: MEDIUM - Type definitions used throughout the system

use candid::{CandidType, Deserialize, Nat, Principal};
// Note: Decimal is not used in Candid types directly, only internally
use serde::Serialize;
use std::collections::HashMap;

// ===== Token Types =====

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, CandidType, Deserialize, Serialize)]
pub enum Token {
    ALEX,
    ZERO,
    KONG,
    BOB,
    CkUSDT,
}

impl Token {
    pub fn all_tracked() -> Vec<Token> {
        vec![Token::ALEX, Token::ZERO, Token::KONG, Token::BOB]
    }

    pub fn all_including_ckusdt() -> Vec<Token> {
        vec![Token::ALEX, Token::ZERO, Token::KONG, Token::BOB, Token::CkUSDT]
    }

    pub fn decimals(&self) -> u32 {
        match self {
            Token::ALEX => 8,
            Token::ZERO => 8,
            Token::KONG => 8,
            Token::BOB => 8,
            Token::CkUSDT => 6,
        }
    }

    pub fn canister_id(&self) -> Principal {
        use crate::infrastructure::constants::*;
        match self {
            Token::ALEX => ALEX_CANISTER,
            Token::ZERO => ZERO_CANISTER,
            Token::KONG => KONG_CANISTER,
            Token::BOB => BOB_CANISTER,
            Token::CkUSDT => CKUSDT_CANISTER,
        }
    }
}

// ===== Mint Types =====

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub enum MintStatus {
    Pending,
    CollectingFee,
    Snapshotting,
    CollectingDeposit,
    Calculating,
    Minting,
    Complete(Nat), // Block index
    FailedFeeCollection,
    FailedDepositCollection,
    FailedWithRefund,
    FailedNoRefund,
    RefundingDeposit,
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct PendingMint {
    pub id: String,
    pub user: Principal,
    pub amount: Nat,
    pub status: MintStatus,
    pub created_at: u64,
    pub last_updated: u64,
    pub snapshot: Option<MintSnapshot>,
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct MintSnapshot {
    pub supply: Nat,
    pub tvl: Nat,
    pub timestamp: u64,
}

// ===== Burn Types =====

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct BurnResult {
    pub icpx_burned: Nat,
    pub successful_transfers: Vec<TransferRecord>,
    pub failed_transfers: Vec<FailedTransfer>,
    pub timestamp: u64,
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct TransferRecord {
    pub token: Token,
    pub amount: Nat,
    pub block: Nat,
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct FailedTransfer {
    pub token: Token,
    pub amount: Nat,
    pub error: String,
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct TokenRedemption {
    pub token: Token,
    pub amount: Nat,
}

// ===== Rebalancing Types =====

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub enum RebalanceAction {
    Buy(Token, f64),  // Token and USD amount
    Sell(Token, f64), // Token and USD amount
    None,
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct RebalanceState {
    pub positions: HashMap<Token, Position>,
    pub targets: HashMap<Token, f64>,
    pub ckusdt_balance: Nat,
    pub timestamp: u64,
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct RebalanceRecord {
    pub action: RebalanceAction,
    pub result: String,
    pub timestamp: u64,
}

// ===== Portfolio Types =====

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct Position {
    pub token: Token,
    pub balance: Nat,
    pub value_usd: f64,
    pub price_usd: f64,
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct PortfolioDisplay {
    pub total_value_usd: f64,
    pub positions: Vec<Position>,
    pub targets: HashMap<Token, f64>,
    pub deviations: HashMap<Token, f64>,
    pub supply: Nat,
    pub last_rebalance: Option<u64>,
    pub timestamp: u64,
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct PortfolioBreakdown {
    pub total_value_ckusdt: Nat,
    pub token_values: HashMap<Token, TokenValue>,
    pub timestamp: u64,
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct TokenValue {
    pub balance: Nat,
    pub price_usd: f64,
    pub value_ckusdt: Nat,
}

// ===== Kong Liquidity Types =====

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct LockCanister {
    pub canister_id: Principal,
    pub pool_id: String,
    pub tokens: (Token, Token),
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct LpPosition {
    pub pool_id: String,
    pub tokens: (Token, Token),
    pub usd_value: f64,
    pub lock_time: u64,
}

// ===== Trading Types =====

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct SwapRequest {
    pub pay_token: Token,
    pub pay_amount: Nat,
    pub receive_token: Token,
    pub max_slippage: f64,
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct SwapResult {
    pub amount_paid: Nat,
    pub amount_received: Nat,
    pub actual_slippage: f64,
    pub block_index: Option<Nat>,
}

// ===== Cache Types =====

#[derive(Debug, Clone)]
pub struct CachedData<T> {
    pub data: T,
    pub timestamp: u64,
    pub ttl_seconds: u64,
}

impl<T> CachedData<T> {
    pub fn new(data: T, ttl_seconds: u64) -> Self {
        Self {
            data,
            timestamp: ic_cdk::api::time(),
            ttl_seconds,
        }
    }

    pub fn is_expired(&self) -> bool {
        let now = ic_cdk::api::time();
        now > self.timestamp + (self.ttl_seconds * 1_000_000_000)
    }
}

// Error types are defined in error_types.rs

// ===== Utility Types =====

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TimerId(pub u64);

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct OperationFee {
    pub amount: Nat,
    pub token: Token,
}

impl Default for OperationFee {
    fn default() -> Self {
        Self {
            amount: Nat::from(100_000u64), // 0.1 ckUSDT
            token: Token::CkUSDT,
        }
    }
}