//! Comprehensive error types for ICPI backend
//! Replaces all Result<T, String> with Result<T, IcpiError>

use candid::{CandidType, Deserialize};
use serde::Serialize;
use std::fmt;

/// Main error type for all ICPI operations
#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub enum IcpiError {
    // Critical Operation Errors
    Mint(MintError),
    Burn(BurnError),
    Rebalance(RebalanceError),

    // Data Layer Errors
    Query(QueryError),
    Validation(ValidationError),
    Calculation(CalculationError),

    // Trading Errors
    Trading(TradingError),
    Approval(ApprovalError),

    // Kong Integration Errors
    KongLocker(KongLockerError),
    Kongswap(KongswapError),

    // System Errors
    System(SystemError),

    // Generic fallback
    Other(String),
}

/// Minting-specific errors
#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub enum MintError {
    AmountBelowMinimum { amount: String, minimum: String },
    AmountAboveMaximum { amount: String, maximum: String },
    InsufficientAllowance { required: String, available: String },
    FeeCollectionFailed { reason: String },
    DepositCollectionFailed { reason: String },
    SupplyQueryFailed { reason: String },
    TvlCalculationFailed { reason: String },
    ProportionalCalculationError { reason: String },
    LedgerMintFailed { reason: String },
    RefundFailed { user: String, amount: String, reason: String },
    MintTimeout { elapsed: u64, timeout: u64 },
    InvalidMintId { id: String },
    MintNotPending { id: String, status: String },
    Other(String),
}

/// Burning-specific errors
#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub enum BurnError {
    AmountBelowMinimum { amount: String, minimum: String },
    InsufficientBalance { required: String, available: String },
    NoRedemptionsPossible { reason: String },
    BurnTransferFailed { reason: String },
    RedemptionCalculationError { reason: String },
    TokenTransferFailed { token: String, amount: String, reason: String },
    PartialRedemption { successful: Vec<String>, failed: Vec<String> },
    Other(String),
}

/// Rebalancing-specific errors
#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub enum RebalanceError {
    TooSoonSinceLastRebalance { last: u64, interval: u64 },
    NoRebalanceNeeded { reason: String },
    InsufficientLiquidity { token: String, required: String, available: String },
    TradeFailed { from: String, to: String, amount: String, reason: String },
    SlippageExceeded { expected: String, actual: String, max: String },
    AllocationCalculationError { reason: String },
    PriceQueryFailed { token: String, reason: String },
    Other(String),
}

/// Query and data fetching errors
#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub enum QueryError {
    CanisterUnreachable { canister: String, reason: String },
    InvalidResponse { expected: String, received: String },
    Timeout { operation: String, timeout: u64 },
    RateLimited { operation: String },
    DeserializationFailed { type_name: String, reason: String },
}

/// Validation errors
#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub enum ValidationError {
    InvalidPrincipal { principal: String },
    InvalidAmount { amount: String, reason: String },
    PriceOutOfBounds { price: String, min: String, max: String },
    SupplyOutOfBounds { supply: String, max: String },
    RapidChangeDetected { field: String, old_value: String, new_value: String, max_change: String },
    DataInconsistency { reason: String },
    StaleData { data_age: u64, max_age: u64 },
}

/// Calculation errors
#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub enum CalculationError {
    Overflow { operation: String, values: String },
    Underflow { operation: String, values: String },
    DivisionByZero { operation: String },
    PrecisionLoss { operation: String, original: String, result: String },
    InvalidConversion { from_type: String, to_type: String, value: String },
}

/// Trading execution errors
#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub enum TradingError {
    InsufficientLiquidity { pair: String, required: String, available: String },
    PairNotFound { token_a: String, token_b: String },
    InvalidQuote { reason: String },
    SwapFailed { reason: String },
    DeadlineExceeded { deadline: u64 },
}

/// Approval-related errors
#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub enum ApprovalError {
    InsufficientAllowance { spender: String, required: String, current: String },
    ApprovalFailed { token: String, spender: String, reason: String },
    ApprovalExpired { token: String, spender: String },
}

/// Kong Locker integration errors
#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub enum KongLockerError {
    CanisterListQueryFailed { reason: String },
    InvalidLockCanister { canister: String },
    BalanceQueryFailed { canister: String, reason: String },
    NoLockedLiquidity { token: String },
}

/// Kongswap integration errors
#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub enum KongswapError {
    SwapAmountCalculationFailed { reason: String },
    LiquidityPoolNotFound { token_a: String, token_b: String },
    InvalidSwapPath { path: Vec<String> },
    BackendUnreachable { reason: String },
}

/// System-level errors
#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub enum SystemError {
    Unauthorized { principal: String, required_role: String },
    StorageFull { used: u64, capacity: u64 },
    CyclesInsufficient { required: u64, available: u64 },
    TimerFailed { timer_id: String, reason: String },
    StateCorrupted { reason: String },
    UpgradeFailed { reason: String },
}

// ===== Display Implementations =====

impl fmt::Display for IcpiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            IcpiError::Mint(e) => write!(f, "Mint error: {}", e),
            IcpiError::Burn(e) => write!(f, "Burn error: {}", e),
            IcpiError::Rebalance(e) => write!(f, "Rebalance error: {}", e),
            IcpiError::Query(e) => write!(f, "Query error: {}", e),
            IcpiError::Validation(e) => write!(f, "Validation error: {}", e),
            IcpiError::Calculation(e) => write!(f, "Calculation error: {}", e),
            IcpiError::Trading(e) => write!(f, "Trading error: {}", e),
            IcpiError::Approval(e) => write!(f, "Approval error: {}", e),
            IcpiError::KongLocker(e) => write!(f, "Kong Locker error: {}", e),
            IcpiError::Kongswap(e) => write!(f, "Kongswap error: {}", e),
            IcpiError::System(e) => write!(f, "System error: {}", e),
            IcpiError::Other(s) => write!(f, "{}", s),
        }
    }
}

impl fmt::Display for MintError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            MintError::AmountBelowMinimum { amount, minimum } => {
                write!(f, "Amount {} is below minimum {}", amount, minimum)
            }
            MintError::AmountAboveMaximum { amount, maximum } => {
                write!(f, "Amount {} exceeds maximum {}", amount, maximum)
            }
            MintError::InsufficientAllowance { required, available } => {
                write!(f, "Insufficient allowance: required {}, available {}", required, available)
            }
            MintError::FeeCollectionFailed { reason } => {
                write!(f, "Fee collection failed: {}", reason)
            }
            MintError::DepositCollectionFailed { reason } => {
                write!(f, "Deposit collection failed: {}", reason)
            }
            MintError::SupplyQueryFailed { reason } => {
                write!(f, "Supply query failed: {}", reason)
            }
            MintError::TvlCalculationFailed { reason } => {
                write!(f, "TVL calculation failed: {}", reason)
            }
            MintError::ProportionalCalculationError { reason } => {
                write!(f, "Proportional calculation error: {}", reason)
            }
            MintError::LedgerMintFailed { reason } => {
                write!(f, "Ledger mint failed: {}", reason)
            }
            MintError::RefundFailed { user, amount, reason } => {
                write!(f, "Refund of {} to {} failed: {}", amount, user, reason)
            }
            MintError::MintTimeout { elapsed, timeout } => {
                write!(f, "Mint timeout: {}s elapsed, {}s timeout", elapsed, timeout)
            }
            MintError::InvalidMintId { id } => {
                write!(f, "Invalid mint ID: {}", id)
            }
            MintError::MintNotPending { id, status } => {
                write!(f, "Mint {} not pending, status: {}", id, status)
            }
            MintError::Other(s) => write!(f, "{}", s),
        }
    }
}

// Implement Display for other error types (abbreviated for brevity)
impl fmt::Display for BurnError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            BurnError::Other(s) => write!(f, "{}", s),
            _ => write!(f, "{:?}", self),
        }
    }
}

impl fmt::Display for RebalanceError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            RebalanceError::Other(s) => write!(f, "{}", s),
            _ => write!(f, "{:?}", self),
        }
    }
}

impl fmt::Display for QueryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl fmt::Display for ValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl fmt::Display for CalculationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl fmt::Display for TradingError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl fmt::Display for ApprovalError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl fmt::Display for KongLockerError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl fmt::Display for KongswapError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl fmt::Display for SystemError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

// ===== Conversion Helpers =====

impl From<String> for IcpiError {
    fn from(s: String) -> Self {
        IcpiError::Other(s)
    }
}

impl From<&str> for IcpiError {
    fn from(s: &str) -> Self {
        IcpiError::Other(s.to_string())
    }
}

// ===== Result Type Alias =====

/// Standard Result type for ICPI operations
pub type Result<T> = std::result::Result<T, IcpiError>;
