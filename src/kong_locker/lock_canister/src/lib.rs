// src/kong_locker/lock_canister/src/lib.rs
use ic_cdk::{update, query};
use candid::{CandidType, Deserialize, Principal, Nat};
use serde::Serialize;

// Define transfer types directly to avoid version conflicts
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<Vec<u8>>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct IcpTransferArgs {
    pub to: Account,
    pub amount: Nat,
    pub fee: Option<Nat>,
    pub memo: Option<Vec<u8>>,
    pub from_subaccount: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

// ===== KongSwap Types (from official repo) =====
#[derive(CandidType, Debug, Clone, Serialize, Deserialize)]
pub enum TxId {
    BlockIndex(Nat),           // For ICP and SNS tokens
    TransactionHash(String),    // For ICRC tokens
}

#[derive(CandidType, Debug, Clone, Serialize, Deserialize)]
pub struct SwapArgs {
    pub pay_token: String,              // Token to pay (e.g., "ICP")
    pub pay_amount: Nat,                // Amount in base units
    pub pay_tx_id: Option<TxId>,       // Transfer tx ID
    pub receive_token: String,          // Token to receive (e.g., "ALEX")
    pub receive_amount: Option<Nat>,    // Min amount (slippage protection)
    pub receive_address: Option<String>, // Optional different address
    pub max_slippage: Option<f64>,      // Max slippage % (e.g., 100.0)
    pub referred_by: Option<String>,    // Referral code
}

#[derive(CandidType, Debug, Clone, Serialize, Deserialize)]
pub struct SwapReply {
    pub tx_id: u64,                 // Internal KongSwap transaction ID
    pub request_id: u64,            // Request tracking ID
    pub status: String,             // "Success" or error message
    pub pay_chain: String,          // Chain of pay token
    pub pay_symbol: String,         // Pay token symbol
    pub pay_amount: Nat,            // Amount paid
    pub receive_symbol: String,     // Receive token symbol
    pub receive_amount: Nat,        // Amount received
    pub price: f64,                 // Execution price
    pub slippage: f64,              // Actual slippage
    pub ts: u64,                    // Timestamp
}

/// Register with KongSwap if ICP is available
/// Anyone can call this - ICP requirement prevents spam
#[update]
async fn register_if_funded() -> Result<String, String> {
    // CRITICAL: Check balance FIRST to prevent cycle drain from spam calls
    // This check is cheap and fails fast without using cycles
    let self_principal = ic_cdk::id();
    let icp_ledger = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
    
    // Get balance - this is the ONLY inter-canister call if not funded
    let balance_result: Result<(Nat,), _> = ic_cdk::call(
        icp_ledger,
        "icrc1_balance_of",
        (Account { 
            owner: self_principal, 
            subaccount: None 
        },)
    ).await;
    
    let balance = match balance_result {
        Ok((bal,)) => bal,
        Err(_) => return Err("Failed to check balance".to_string()),
    };
    
    // Need at least 0.1 ICP (10_000_000 e8s) + fees (10_000 e8s) for KongSwap registration
    if balance < Nat::from(10_010_000u64) {
        return Err("Insufficient ICP. Send at least 0.1 ICP".to_string());
    }
    
    // Transfer ALL ICP to KongSwap (minus fee) to avoid idle funds
    let kong_backend = Principal::from_text("2ipq2-uqaaa-aaaar-qailq-cai").unwrap();
    let transfer_amount = balance - Nat::from(10_000u64); // Keep fee back
    
    let transfer_result: Result<(Result<Nat, String>,), _> = ic_cdk::call(
        icp_ledger,
        "icrc1_transfer",
        (IcpTransferArgs {
            to: Account { owner: kong_backend, subaccount: None },
            amount: transfer_amount.clone(), // Send ALL available ICP
            fee: Some(Nat::from(10_000u64)),
            memo: None,
            from_subaccount: None,
            created_at_time: None,
        },)
    ).await;
    
    let block_index = match transfer_result {
        Ok((Ok(block),)) => block,
        _ => return Err("Transfer to KongSwap failed".to_string()),
    };
    
    // Swap ALL transferred ICP for ALEX to register
    let swap_result: Result<(Result<SwapReply, String>,), _> = ic_cdk::call(
        kong_backend,
        "swap",
        (SwapArgs {
            pay_token: "ICP".to_string(),
            pay_amount: transfer_amount,
            pay_tx_id: Some(TxId::BlockIndex(block_index)),
            receive_token: "ALEX".to_string(),
            receive_amount: None,
            receive_address: None,
            max_slippage: Some(100.0),
            referred_by: None,
        },)
    ).await;
    
    match swap_result {
        Ok((Ok(_),)) => Ok("Successfully registered with KongSwap".to_string()),
        _ => Ok("Registration attempted - may already be registered".to_string()),
    }
}

/// Get the canister's principal (for sending LP tokens to)
#[query]
fn get_principal() -> Principal {
    ic_cdk::id()
}

// THAT'S IT! No transfer functions, no owner tracking, no complexity
// This canister can receive LP tokens but can NEVER send them

ic_cdk::export_candid!();