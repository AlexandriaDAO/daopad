//! Comprehensive error handling for ICPX backend
//! Security: MEDIUM - Proper error handling prevents information leakage

use candid::{CandidType, Deserialize};
use serde::Serialize;
use std::fmt;

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub enum IcpxError {
    // === Critical Operation Errors ===
    Mint(MintError),
    Burn(BurnError),
    Rebalance(RebalanceError),

    // === Data Layer Errors ===
    Query(QueryError),
    Validation(ValidationError),

    // === Trading Errors ===
    Trading(TradingError),

    // === System Errors ===
    System(SystemError),

    // === Generic ===
    Other(String),
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub enum MintError {
    AmountBelowMinimum { amount: String, minimum: String },
    MintTimeout { mint_id: String },
    FeeCollectionFailed { reason: String },
    DepositCollectionFailed { reason: String },
    SnapshotFailed { reason: String },
    CalculationError { reason: String },
    LedgerMintFailed { reason: String },
    RefundFailed { reason: String },
    InvalidMintId { id: String },
    MintNotPending { id: String, status: String },
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub enum BurnError {
    AmountBelowMinimum { amount: String, minimum: String },
    NoRedemptionsPossible { reason: String },
    TransferFailed { token: String, reason: String },
    CalculationError { reason: String },
    FeeCollectionFailed { reason: String },
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub enum RebalanceError {
    TooSoonSinceLastRebalance { last: u64, interval: u64 },
    NoRebalanceNeeded,
    TradeFailed { reason: String },
    InsufficientBalance { token: String, needed: String, available: String },
    SlippageExceeded { expected: String, max: String },
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub enum QueryError {
    CanisterUnreachable { canister: String },
    InvalidResponse { reason: String },
    Timeout,
    RateLimited,
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub enum ValidationError {
    PriceOutOfBounds { price: String, min: String, max: String },
    SupplyOutOfBounds { supply: String, max: String },
    RapidChangeDetected { field: String, change_ratio: String },
    InvalidSnapshot { reason: String },
    DataInconsistency { reason: String },
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub enum TradingError {
    InsufficientLiquidity,
    PairNotFound { token_a: String, token_b: String },
    ApprovalFailed { reason: String },
    SwapFailed { reason: String },
    SlippageTooHigh { actual: String, max: String },
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub enum SystemError {
    Unauthorized { principal: String },
    StorageFull,
    CyclesInsufficient,
    TimerFailed { reason: String },
    StateCorrupted { reason: String },
}

// === Display Implementations ===

impl fmt::Display for IcpxError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            IcpxError::Mint(e) => write!(f, "Mint error: {}", e),
            IcpxError::Burn(e) => write!(f, "Burn error: {}", e),
            IcpxError::Rebalance(e) => write!(f, "Rebalance error: {}", e),
            IcpxError::Query(e) => write!(f, "Query error: {}", e),
            IcpxError::Validation(e) => write!(f, "Validation error: {}", e),
            IcpxError::Trading(e) => write!(f, "Trading error: {}", e),
            IcpxError::System(e) => write!(f, "System error: {}", e),
            IcpxError::Other(s) => write!(f, "{}", s),
        }
    }
}

impl fmt::Display for MintError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            MintError::AmountBelowMinimum { amount, minimum } => {
                write!(f, "Amount {} below minimum {}", amount, minimum)
            }
            MintError::MintTimeout { mint_id } => {
                write!(f, "Mint {} timed out", mint_id)
            }
            MintError::FeeCollectionFailed { reason } => {
                write!(f, "Fee collection failed: {}", reason)
            }
            MintError::DepositCollectionFailed { reason } => {
                write!(f, "Deposit collection failed: {}", reason)
            }
            MintError::SnapshotFailed { reason } => {
                write!(f, "Snapshot failed: {}", reason)
            }
            MintError::CalculationError { reason } => {
                write!(f, "Calculation error: {}", reason)
            }
            MintError::LedgerMintFailed { reason } => {
                write!(f, "Ledger mint failed: {}", reason)
            }
            MintError::RefundFailed { reason } => {
                write!(f, "Refund failed: {}", reason)
            }
            MintError::InvalidMintId { id } => {
                write!(f, "Invalid mint ID: {}", id)
            }
            MintError::MintNotPending { id, status } => {
                write!(f, "Mint {} not pending, status: {}", id, status)
            }
        }
    }
}

impl fmt::Display for BurnError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            BurnError::AmountBelowMinimum { amount, minimum } => {
                write!(f, "Amount {} below minimum {}", amount, minimum)
            }
            BurnError::NoRedemptionsPossible { reason } => {
                write!(f, "No redemptions possible: {}", reason)
            }
            BurnError::TransferFailed { token, reason } => {
                write!(f, "Transfer of {} failed: {}", token, reason)
            }
            BurnError::CalculationError { reason } => {
                write!(f, "Calculation error: {}", reason)
            }
            BurnError::FeeCollectionFailed { reason } => {
                write!(f, "Fee collection failed: {}", reason)
            }
        }
    }
}

impl fmt::Display for RebalanceError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            RebalanceError::TooSoonSinceLastRebalance { last, interval } => {
                write!(f, "Too soon since last rebalance at {}, interval: {}s", last, interval)
            }
            RebalanceError::NoRebalanceNeeded => {
                write!(f, "No rebalancing needed")
            }
            RebalanceError::TradeFailed { reason } => {
                write!(f, "Trade failed: {}", reason)
            }
            RebalanceError::InsufficientBalance { token, needed, available } => {
                write!(f, "Insufficient {} balance: need {}, have {}", token, needed, available)
            }
            RebalanceError::SlippageExceeded { expected, max } => {
                write!(f, "Slippage {} exceeded max {}", expected, max)
            }
        }
    }
}

impl fmt::Display for QueryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            QueryError::CanisterUnreachable { canister } => {
                write!(f, "Canister {} unreachable", canister)
            }
            QueryError::InvalidResponse { reason } => {
                write!(f, "Invalid response: {}", reason)
            }
            QueryError::Timeout => write!(f, "Query timeout"),
            QueryError::RateLimited => write!(f, "Rate limited"),
        }
    }
}

impl fmt::Display for ValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ValidationError::PriceOutOfBounds { price, min, max } => {
                write!(f, "Price {} out of bounds [{}, {}]", price, min, max)
            }
            ValidationError::SupplyOutOfBounds { supply, max } => {
                write!(f, "Supply {} exceeds max {}", supply, max)
            }
            ValidationError::RapidChangeDetected { field, change_ratio } => {
                write!(f, "Rapid change in {}: ratio {}", field, change_ratio)
            }
            ValidationError::InvalidSnapshot { reason } => {
                write!(f, "Invalid snapshot: {}", reason)
            }
            ValidationError::DataInconsistency { reason } => {
                write!(f, "Data inconsistency: {}", reason)
            }
        }
    }
}

impl fmt::Display for TradingError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TradingError::InsufficientLiquidity => {
                write!(f, "Insufficient liquidity")
            }
            TradingError::PairNotFound { token_a, token_b } => {
                write!(f, "Pair {}/{} not found", token_a, token_b)
            }
            TradingError::ApprovalFailed { reason } => {
                write!(f, "Approval failed: {}", reason)
            }
            TradingError::SwapFailed { reason } => {
                write!(f, "Swap failed: {}", reason)
            }
            TradingError::SlippageTooHigh { actual, max } => {
                write!(f, "Slippage {} exceeds max {}", actual, max)
            }
        }
    }
}

impl fmt::Display for SystemError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SystemError::Unauthorized { principal } => {
                write!(f, "Unauthorized: {}", principal)
            }
            SystemError::StorageFull => write!(f, "Storage full"),
            SystemError::CyclesInsufficient => write!(f, "Insufficient cycles"),
            SystemError::TimerFailed { reason } => {
                write!(f, "Timer failed: {}", reason)
            }
            SystemError::StateCorrupted { reason } => {
                write!(f, "State corrupted: {}", reason)
            }
        }
    }
}

// === Conversion Helpers ===

impl From<String> for IcpxError {
    fn from(s: String) -> Self {
        IcpxError::Other(s)
    }
}

impl From<&str> for IcpxError {
    fn from(s: &str) -> Self {
        IcpxError::Other(s.to_string())
    }
}

// === Result Type ===

pub type Result<T> = std::result::Result<T, IcpxError>;