use candid::{Principal, Nat, CandidType, Deserialize};
use ic_cdk::query;
use ic_cdk_timers::set_timer_interval;
use std::cell::RefCell;
use std::time::Duration;
use crate::types::{Account, TransferFromArgs, TransferFromError, TransferArgs, TransferError};

// Constants
const MIN_ICP_BALANCE: u64 = 200_000_000;  // 2 ICP threshold (1 ICP to keep + 1 ICP to swap)
const ICP_RESERVE: u64 = 100_000_000;      // 1 ICP permanent reserve for canister operations
const FEE_RESERVE: u64 = 10_000_000;       // 0.1 ICP for transaction fees
const CHECK_INTERVAL: u64 = 14400;         // Check every 4 hours
const CORE_ICP_SWAP_CANISTER: &str = "54fqz-5iaaa-aaaap-qkmqa-cai"; // Core LBRY swap
const LBRY_CANISTER_ID: &str = "y33wz-myaaa-aaaap-qkmna-cai";
const LBRY_BURN_PRINCIPAL: &str = "54fqz-5iaaa-aaaap-qkmqa-cai"; // Same as core swap (minting account)

// Main state
thread_local! {
    static TOTAL_BURNED: RefCell<u64> = RefCell::new(0);
    static LAST_SWAP_TIME: RefCell<u64> = RefCell::new(0);
    static LAST_SWAP_AMOUNT: RefCell<u64> = RefCell::new(0);
    static TOTAL_ICP_SWAPPED: RefCell<u64> = RefCell::new(0);
}

// Initialize revenue sharing timer
pub fn init_revshare_timer() {
    set_timer_interval(
        Duration::from_secs(CHECK_INTERVAL), 
        || {
            ic_cdk::spawn(async {
                let _ = check_and_swap_revshare().await;
            });
        }
    );
    ic_cdk::print("Revenue sharing timer initialized - checking every 4 hours");
}

// Check balance and execute swap if conditions are met
async fn check_and_swap_revshare() -> Result<String, String> {
    ic_cdk::println!("REVSHARE: Checking balance for revenue sharing...");
    
    // Check ICP balance
    let icp_ledger = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
    let canister_id = ic_cdk::api::id();
    
    let balance_result: Result<(Nat,), _> = ic_cdk::call(
        icp_ledger,
        "icrc1_balance_of",
        (Account { 
            owner: canister_id, 
            subaccount: None 
        },)
    ).await;
    
    let icp_balance = match balance_result {
        Ok((balance,)) => {
            // Convert Nat to u64
            let balance_str = balance.to_string();
            balance_str.parse::<u64>().unwrap_or(0)
        }
        Err(e) => {
            ic_cdk::println!("REVSHARE: Failed to check balance: {:?}", e);
            return Ok("Could not check balance".to_string());
        }
    };
    
    ic_cdk::println!("REVSHARE: Balance check - {} e8s ({}+ ICP)", icp_balance, icp_balance / 100_000_000);
    
    // Only proceed if we have more than 2 ICP (1 to keep, 1 to swap)
    if icp_balance < MIN_ICP_BALANCE {
        ic_cdk::println!("REVSHARE: Balance {} below threshold {} (need 2+ ICP)", icp_balance, MIN_ICP_BALANCE);
        return Ok(format!("Balance {} below threshold (need 2+ ICP)", icp_balance));
    }
    
    ic_cdk::println!("REVSHARE: Proceeding with swap, balance {} exceeds minimum", icp_balance);
    
    // Execute swap and burn
    execute_swap_and_burn_revshare().await
}

// Execute the swap and burn operation
async fn execute_swap_and_burn_revshare() -> Result<String, String> {
    ic_cdk::println!("REVSHARE: Starting revenue share swap and burn...");
    
    // Step 1: Check ICP balance again
    let icp_ledger = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
    let canister_id = ic_cdk::api::id();
    
    let balance_result: Result<(Nat,), _> = ic_cdk::call(
        icp_ledger,
        "icrc1_balance_of",
        (Account { 
            owner: canister_id, 
            subaccount: None 
        },)
    ).await;
    
    let icp_balance = match balance_result {
        Ok((balance,)) => {
            let balance_str = balance.to_string();
            balance_str.parse::<u64>().unwrap_or(0)
        }
        Err(e) => return Err(format!("Failed to get ICP balance: {:?}", e)),
    };
    
    // Only proceed if balance is above minimum threshold
    if icp_balance < MIN_ICP_BALANCE {
        return Ok(format!("ICP balance {} below minimum {} (need 2+ ICP)", icp_balance, MIN_ICP_BALANCE));
    }
    
    // Calculate swap amount (keep 1 ICP + 0.1 for fees, need 20_000 for approve and transfer fees)
    let swap_amount = icp_balance.saturating_sub(ICP_RESERVE + FEE_RESERVE + 20_000);
    
    ic_cdk::println!("REVSHARE: Attempting to swap {} e8s ({} ICP), keeping {} ICP reserve", 
        swap_amount, swap_amount / 100_000_000, ICP_RESERVE / 100_000_000);
    
    // Get the core swap canister principal
    let core_swap_canister = Principal::from_text(CORE_ICP_SWAP_CANISTER)
        .map_err(|e| format!("Invalid core ICP swap canister ID: {}", e))?;
    
    // First approve the core swap canister to spend our ICP
    let approve_args = TransferFromArgs {
        spender_subaccount: None,
        from: Account { owner: canister_id, subaccount: None },
        to: Account { owner: core_swap_canister, subaccount: None },
        amount: Nat::from(swap_amount + 10_000), // Amount plus transfer fee
        fee: Some(Nat::from(10_000u64)),
        memo: None,
        created_at_time: None,
    };
    
    // Using icrc2_approve
    let approve_result: Result<(Result<Nat, TransferFromError>,), _> = ic_cdk::call(
        icp_ledger,
        "icrc2_approve",
        (approve_args,)
    ).await;
    
    match approve_result {
        Ok((Ok(block_index),)) => {
            ic_cdk::println!("REVSHARE: Approved core swap to spend {} ICP, block: {}", 
                swap_amount / 100_000_000, block_index);
        }
        Ok((Err(e),)) => {
            return Err(format!("Approval failed: {:?}", e));
        }
        Err(e) => {
            return Err(format!("Approval call failed: {:?}", e));
        }
    }
    
    // Now call the swap function on the core project's ICP_SWAP canister
    let swap_result: Result<(String,), _> = ic_cdk::call(
        core_swap_canister,
        "swap",
        (swap_amount, None::<[u8; 32]>),
    ).await;
    
    match swap_result {
        Ok((success_msg,)) => {
            ic_cdk::println!("REVSHARE: Successfully swapped {} ICP: {}", 
                swap_amount / 100_000_000, success_msg);
            
            // Track total ICP swapped
            TOTAL_ICP_SWAPPED.with(|total| {
                *total.borrow_mut() = total.borrow().saturating_add(swap_amount);
            });
        }
        Err(e) => {
            return Err(format!("Swap call failed: {:?}", e));
        }
    }
    
    // Check actual LBRY balance and burn all of it
    let lbry_principal = Principal::from_text(LBRY_CANISTER_ID)
        .map_err(|e| format!("Invalid LBRY canister ID: {}", e))?;
    
    let lbry_account = Account {
        owner: canister_id,
        subaccount: None,
    };
    
    // Check LBRY balance
    let balance_result: Result<(Nat,), _> = ic_cdk::call(
        lbry_principal,
        "icrc1_balance_of",
        (lbry_account,)
    ).await;
    
    let lbry_balance = match balance_result {
        Ok((balance,)) => {
            let balance_str = balance.to_string();
            balance_str.parse::<u64>().unwrap_or(0)
        }
        Err(e) => {
            // Non-fatal: LBRY may not have arrived yet
            return Ok(format!("Swap completed but couldn't check LBRY balance: {:?}", e));
        }
    };
    
    if lbry_balance == 0 {
        return Ok("Swap completed but no LBRY balance to burn".to_string());
    }
    
    // Burn ALL LBRY tokens by sending to burn address
    let burn_principal = Principal::from_text(LBRY_BURN_PRINCIPAL)
        .map_err(|e| format!("Invalid burn principal: {}", e))?;
    
    let burn_args = TransferArgs {
        from_subaccount: None,
        to: Account {
            owner: burn_principal,
            subaccount: None,
        },
        amount: Nat::from(lbry_balance),
        fee: None,
        memo: None,
        created_at_time: None,
    };
    
    // Execute burn transfer
    let burn_result: Result<(Result<Nat, TransferError>,), _> = ic_cdk::call(
        lbry_principal,
        "icrc1_transfer",
        (burn_args,)
    ).await;
    
    match burn_result {
        Ok((Ok(_block_index),)) => {
            // Update total burned tracking
            TOTAL_BURNED.with(|total| {
                *total.borrow_mut() = total.borrow().saturating_add(lbry_balance);
            });
            
            LAST_SWAP_TIME.with(|t| *t.borrow_mut() = ic_cdk::api::time());
            LAST_SWAP_AMOUNT.with(|a| *a.borrow_mut() = swap_amount);
            
            Ok(format!(
                "REVSHARE: Successfully swapped {} ICP and burned {} LBRY. Total burned: {} LBRY, Total ICP swapped: {} ICP",
                swap_amount / 100_000_000,
                lbry_balance,
                TOTAL_BURNED.with(|t| *t.borrow()),
                TOTAL_ICP_SWAPPED.with(|t| *t.borrow()) / 100_000_000
            ))
        }
        Ok((Err(e),)) => {
            // Non-fatal: LBRY will be burned in next cycle
            Ok(format!("Swap succeeded, burn will retry next cycle: {:?}", e))
        }
        Err(e) => {
            // Non-fatal: LBRY will be burned in next cycle
            Ok(format!("Swap succeeded, burn will retry next cycle: {:?}", e))
        }
    }
}

// Query functions for monitoring
#[query]
pub fn get_revshare_stats() -> RevshareStats {
    RevshareStats {
        total_lbry_burned: TOTAL_BURNED.with(|t| *t.borrow()),
        total_icp_swapped: TOTAL_ICP_SWAPPED.with(|t| *t.borrow()),
        last_swap_time: LAST_SWAP_TIME.with(|t| *t.borrow()),
        last_swap_amount_icp: LAST_SWAP_AMOUNT.with(|a| *a.borrow()),
    }
}

#[derive(CandidType, Deserialize)]
pub struct RevshareStats {
    pub total_lbry_burned: u64,
    pub total_icp_swapped: u64,
    pub last_swap_time: u64,
    pub last_swap_amount_icp: u64,
}