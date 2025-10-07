//! Global constants and configuration for ICPX backend
//! Security: MEDIUM - Constants must be carefully reviewed

use candid::Principal;

// ===== Canister IDs =====

// Token canisters (mainnet)
pub const ALEX_CANISTER: Principal = Principal::from_slice(b"rh2pm-ryaaa-aaaam-qcqfq-cai");
pub const ZERO_CANISTER: Principal = Principal::from_slice(b"uf2wh-taaaa-aaaaq-aabna-cai");
pub const KONG_CANISTER: Principal = Principal::from_slice(b"7sop3-3qaaa-aaaah-qbqbq-cai");
pub const BOB_CANISTER: Principal = Principal::from_slice(b"7pail-xaaaa-aaaas-aabmq-cai");
pub const CKUSDT_CANISTER: Principal = Principal::from_slice(b"cngnf-vqaaa-aaaag-qclaa-cai");

// ICPX token canister
pub const ICPX_CANISTER: Principal = Principal::from_slice(b""); // To be filled

// Kongswap DEX
pub const KONGSWAP_CANISTER: Principal = Principal::from_slice(b""); // To be filled
pub const KONG_LOCKER_CANISTER: Principal = Principal::from_slice(b""); // To be filled

// ===== Token Configuration =====

// Decimals for each token
pub const ALEX_DECIMALS: u8 = 8;
pub const ZERO_DECIMALS: u8 = 8;
pub const KONG_DECIMALS: u8 = 8;
pub const BOB_DECIMALS: u8 = 8;
pub const CKUSDT_DECIMALS: u8 = 6;
pub const ICPX_DECIMALS: u8 = 8;

// ===== Operation Limits =====

// Minting
pub const MIN_MINT_AMOUNT: u64 = 1_000_000; // 1 ckUSDT (with e6 decimals)
pub const MINT_TIMEOUT_SECONDS: u64 = 180;
pub const MINT_FEE_AMOUNT: u64 = 100_000; // 0.1 ckUSDT

// Burning
pub const MIN_BURN_AMOUNT: u64 = 11_000; // 0.00011 ICPX (with e8 decimals)
pub const TRANSFER_FEE_BUFFER: u64 = 10_000; // Per token transfer fee buffer
pub const BURN_FEE_AMOUNT: u64 = 100_000; // 0.1 ckUSDT

// Rebalancing
pub const REBALANCE_INTERVAL_SECONDS: u64 = 3600; // 1 hour
pub const MIN_DEVIATION_PERCENT: f64 = 1.0; // 1% threshold for rebalancing
pub const TRADE_SIZE_PERCENT: f64 = 0.1; // Trade 10% of deviation
pub const MAX_SLIPPAGE_PERCENT: f64 = 2.0; // 2% max slippage
pub const MIN_TRADE_SIZE_USD: f64 = 10.0; // Minimum $10 trade

// ===== Validation Bounds =====

// Supply validation
pub const MAX_SUPPLY_CHANGE_RATIO: f64 = 1.1; // 10% max change
pub const MAX_POSSIBLE_SUPPLY: u128 = 1_000_000_000_000_000_000; // 10 billion ICPX

// Price validation
pub const MAX_PRICE_CHANGE_RATIO: f64 = 2.0; // 100% max change
pub const MIN_REASONABLE_PRICE_USD: f64 = 0.0001; // $0.0001
pub const MAX_REASONABLE_PRICE_USD: f64 = 1_000_000.0; // $1M

// Portfolio validation
pub const MAX_REASONABLE_PORTFOLIO_VALUE_USD: u128 = 1_000_000_000; // $1B

// ===== Cache Configuration =====

// Cache TTLs (in seconds)
pub const PORTFOLIO_DISPLAY_CACHE_TTL: u64 = 300; // 5 minutes for display
pub const KONG_LIQUIDITY_CACHE_TTL: u64 = 3600; // 1 hour for external data
pub const PRICE_CACHE_TTL_DISPLAY: u64 = 60; // 1 minute for display prices

// ===== Batch Processing =====

pub const MAX_PARALLEL_QUERIES: usize = 10; // Max concurrent canister calls
pub const QUERY_BATCH_SIZE: usize = 10; // Batch size for parallel queries

// ===== Timing =====

pub const NANOSECONDS_PER_SECOND: u64 = 1_000_000_000;
pub const SECONDS_PER_HOUR: u64 = 3600;
pub const SECONDS_PER_DAY: u64 = 86400;

// ===== Memo Templates =====

pub const MINT_MEMO_PREFIX: &str = "ICPX_MINT:";
pub const BURN_MEMO_PREFIX: &str = "ICPX_BURN:";
pub const REBALANCE_MEMO_PREFIX: &str = "ICPX_REBAL:";
pub const FEE_COLLECTION_MEMO: &str = "ICPX_FEE";

// ===== Error Messages =====

pub const ERR_INSUFFICIENT_BALANCE: &str = "Insufficient balance for operation";
pub const ERR_INVALID_AMOUNT: &str = "Invalid amount specified";
pub const ERR_MINT_TIMEOUT: &str = "Mint operation timed out";
pub const ERR_BURN_TOO_SMALL: &str = "Burn amount too small for redemption";
pub const ERR_REBALANCE_TOO_SOON: &str = "Too soon since last rebalance";
pub const ERR_VALIDATION_FAILED: &str = "Validation failed";
pub const ERR_CANISTER_CALL_FAILED: &str = "Canister call failed";

// ===== Default Allocations =====

// Equal weight allocation when no external data available
pub const DEFAULT_ALLOCATION_PERCENT: f64 = 25.0; // 25% for each of 4 tokens