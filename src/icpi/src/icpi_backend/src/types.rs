use candid::{CandidType, Deserialize, Nat, Principal};
use rust_decimal::Decimal;
use serde::Serialize;
use std::str::FromStr;
use std::hash::Hash;

// Token identifiers - use symbols as strings (Kongswap pattern)
#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq, Eq, Hash)]
pub enum TrackedToken {
    ALEX,
    ZERO,
    KONG,
    BOB,
}

impl TrackedToken {
    pub fn to_symbol(&self) -> &str {
        match self {
            TrackedToken::ALEX => "ALEX",
            TrackedToken::ZERO => "ZERO",
            TrackedToken::KONG => "KONG",
            TrackedToken::BOB => "BOB",
        }
    }

    pub fn get_canister_id(&self) -> Result<Principal, String> {
        match self {
            TrackedToken::ALEX => Principal::from_text("ysy5f-2qaaa-aaaap-qkmmq-cai")
                .map_err(|e| format!("Invalid principal: {}", e)),
            TrackedToken::ZERO => Principal::from_text("onuey-xaaaa-aaaah-qcqbq-cai")
                .map_err(|e| format!("Invalid principal: {}", e)),
            TrackedToken::KONG => Principal::from_text("xnjld-hqaaa-aaaar-qah4q-cai")
                .map_err(|e| format!("Invalid principal: {}", e)),
            TrackedToken::BOB => Principal::from_text("7pail-xaaaa-aaaas-aabmq-cai")
                .map_err(|e| format!("Invalid principal: {}", e)),
        }
    }

    pub fn get_decimals(&self) -> u8 {
        match self {
            TrackedToken::ALEX => 8,
            TrackedToken::ZERO => 12,
            TrackedToken::KONG => 8,
            TrackedToken::BOB => 8,
        }
    }
}

// ICRC1 Account type
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<[u8; 32]>,
}

// Match Kongswap's LPBalancesReply structure EXACTLY
#[derive(CandidType, Deserialize, Debug)]
pub struct LPBalancesReply {
    pub name: String,
    pub symbol: String,
    pub lp_token_id: u64,
    pub balance: f64,
    pub usd_balance: f64,
    pub chain_0: String,
    pub symbol_0: String,
    pub address_0: String,
    pub amount_0: f64,
    pub usd_amount_0: f64,
    pub chain_1: String,
    pub symbol_1: String,
    pub address_1: String,
    pub amount_1: f64,
    pub usd_amount_1: f64,
    pub ts: u64,
}

// Kongswap user_balances response types
#[derive(CandidType, Deserialize, Debug)]
pub enum UserBalancesReply {
    LP(LPBalancesReply),
}

#[derive(CandidType, Deserialize, Debug)]
pub enum UserBalancesResult {
    Ok(Vec<UserBalancesReply>),
    Err(String),
}

// SwapAmounts types for price queries
#[derive(CandidType, Deserialize, Debug)]
pub struct SwapAmountsReply {
    pub pay_symbol: String,
    pub receive_symbol: String,
    pub pay_amount: Nat,
    pub receive_amount: Nat,
    pub mid_price: f64,
    pub price: f64,
    pub slippage: f64,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum SwapAmountsResult {
    Ok(SwapAmountsReply),
    Err(String),
}

// Current holdings with precision handling
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct CurrentPosition {
    pub token: TrackedToken,
    pub balance: Nat,           // Raw token balance with proper decimals
    pub usd_value: f64,         // USD value (using f64 for Candid compatibility)
    pub percentage: f64,        // Percentage of portfolio
}

// Target allocation from locked liquidity
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct TargetAllocation {
    pub token: TrackedToken,
    pub target_percentage: f64,
    pub target_usd_value: f64,
}

// Allocation deviation
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct AllocationDeviation {
    pub token: TrackedToken,
    pub current_pct: f64,
    pub target_pct: f64,
    pub deviation_pct: f64,     // target - current (can be negative)
    pub usd_difference: f64,    // Amount to buy (positive) or sell (negative)
    pub trade_size_usd: f64,    // 10% of difference for hourly rebalance
}

// Combined state for rebalancing decisions
#[derive(CandidType, Deserialize, Serialize, Debug)]
pub struct IndexState {
    pub total_value: f64,
    pub current_positions: Vec<CurrentPosition>,
    pub target_allocations: Vec<TargetAllocation>,
    pub deviations: Vec<AllocationDeviation>,
    pub timestamp: u64,
    pub ckusdt_balance: Nat,  // Track available ckUSDT for rebalancing
}

// Rebalancing action
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum RebalanceAction {
    Buy { token: TrackedToken, usdt_amount: f64 },
    Sell { token: TrackedToken, usdt_value: f64 },
    None,
}

// Health status
#[derive(CandidType, Deserialize, Serialize, Debug)]
pub struct HealthStatus {
    pub version: String,
    pub tracked_tokens: Vec<String>,
    pub last_rebalance: Option<u64>,
    pub cycles_balance: u128,
}

// Error recovery types
#[derive(Debug)]
pub enum PriceResult {
    Available(Decimal),
    Cached(Decimal),
    Unavailable,
}

// Cached data structures
#[derive(CandidType, Deserialize, Default)]
pub struct CachedLockCanisters {
    pub canisters: Vec<(Principal, Principal)>,
    pub last_updated: u64,
    pub ttl_seconds: u64,
}

// Constants
pub const KONG_LOCKER_ID: &str = "eazgb-giaaa-aaaap-qqc2q-cai";
pub const KONGSWAP_BACKEND_ID: &str = "2ipq2-uqaaa-aaaar-qailq-cai";
pub const CKUSDT_CANISTER_ID: &str = "cngnf-vqaaa-aaaar-qag4q-cai";
pub const ICP_CANISTER_ID: &str = "ryjl3-tyaaa-aaaaa-aaaba-cai";

// Whitelisted canisters for security
pub const ALLOWED_CANISTERS: &[&str] = &[
    "eazgb-giaaa-aaaap-qqc2q-cai",  // kong_locker
    "2ipq2-uqaaa-aaaar-qailq-cai",  // kongswap
    "ysy5f-2qaaa-aaaap-qkmmq-cai",  // ALEX
    "onuey-xaaaa-aaaah-qcqbq-cai",  // ZERO
    "xnjld-hqaaa-aaaar-qah4q-cai",  // KONG
    "7pail-xaaaa-aaaas-aabmq-cai",  // BOB
    "cngnf-vqaaa-aaaar-qag4q-cai",  // ckUSDT
    "ryjl3-tyaaa-aaaaa-aaaba-cai",  // ICP
];

// Helper functions
pub fn validate_principal(p: &str) -> Result<Principal, String> {
    Principal::from_text(p)
        .map_err(|e| format!("Invalid principal: {}", e))
        .and_then(|principal| {
            if ALLOWED_CANISTERS.contains(&p) {
                Ok(principal)
            } else {
                Err(format!("Unauthorized canister: {}", p))
            }
        })
}

pub fn decimal_to_f64(d: Decimal) -> f64 {
    d.to_string().parse::<f64>().unwrap_or(0.0)
}

pub fn f64_to_decimal(f: f64) -> Result<Decimal, String> {
    Decimal::from_str(&f.to_string())
        .map_err(|e| format!("Decimal conversion error: {}", e))
}