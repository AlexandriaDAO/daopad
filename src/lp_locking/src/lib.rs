use ic_cdk::{query, update, caller};
use candid::{CandidType, Deserialize, Nat, Principal};
use std::cell::RefCell;
use std::collections::HashMap;

thread_local! {
    // Simple storage: principal -> voting power
    static VOTING_POWER: RefCell<HashMap<Principal, Nat>> = RefCell::new(HashMap::new());
    // Store complete LP position details
    static LP_POSITIONS: RefCell<HashMap<Principal, Vec<LPBalancesReply>>> = RefCell::new(HashMap::new());
}

// KongSwap types needed for decoding
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct LPBalancesReply {
    pub symbol: String,
    pub balance: f64,  // This is what we sum up
    pub lp_token_id: u64,
    pub name: String,
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

#[derive(CandidType, Deserialize, Debug)]
enum UserBalancesReply {
    LP(LPBalancesReply),
}

type UserBalancesResult = Result<Vec<UserBalancesReply>, String>;

// Sync voting power by querying KongSwap with the user's PRINCIPAL
#[update]
pub async fn sync_voting_power() -> Result<Nat, String> {
    let user_principal = caller();

    if user_principal == Principal::anonymous() {
        return Err("Anonymous users not allowed".to_string());
    }

    // Query KongSwap with the PRINCIPAL as text (NOT account ID!)
    let kong_backend = Principal::from_text("2ipq2-uqaaa-aaaar-qailq-cai").unwrap();

    let result: Result<(UserBalancesResult,), _> = ic_cdk::call(
        kong_backend,
        "user_balances",
        (user_principal.to_text(),)  // <-- PRINCIPAL AS TEXT, not account ID!
    ).await;

    match result {
        Ok((Ok(balances),)) => {
            // Store the detailed LP positions
            let mut lp_details = Vec::new();
            let mut total = 0u64;
            
            for balance in balances {
                let UserBalancesReply::LP(lp) = balance;
                lp_details.push(lp.clone());
                // Convert float to integer (multiply by 1e8 for precision)
                total += (lp.balance * 100_000_000.0) as u64;
            }
            
            // Store detailed positions
            LP_POSITIONS.with(|positions| {
                positions.borrow_mut().insert(user_principal, lp_details);
            });

            let total_nat = Nat::from(total);

            // Store voting power
            VOTING_POWER.with(|vp| {
                vp.borrow_mut().insert(user_principal, total_nat.clone());
            });

            Ok(total_nat)
        },
        Ok((Err(e),)) => {
            if e.contains("User not found") {
                Err("Not registered with KongSwap. Please register first.".to_string())
            } else {
                Err(format!("KongSwap error: {}", e))
            }
        },
        Err((code, msg)) => {
            Err(format!("Failed to query KongSwap: {:?} - {}", code, msg))
        }
    }
}

// Get caller's voting power
#[query]
pub fn get_voting_power() -> Nat {
    let user = caller();
    VOTING_POWER.with(|vp| {
        vp.borrow().get(&user).cloned().unwrap_or_else(|| Nat::from(0u64))
    })
}

// Get all voting powers for leaderboard
#[query]
pub fn get_all_voting_powers() -> Vec<(String, Nat)> {
    VOTING_POWER.with(|vp| {
        vp.borrow()
            .iter()
            .map(|(principal, power)| (principal.to_text(), power.clone()))
            .collect()
    })
}

// Get detailed LP positions for the caller
#[query]
pub fn get_lp_positions() -> Vec<LPBalancesReply> {
    let user = caller();
    LP_POSITIONS.with(|lp| {
        lp.borrow().get(&user).cloned().unwrap_or_else(Vec::new)
    })
}

// Get all users' LP positions (for applications that need global data)
#[query]
pub fn get_all_lp_positions() -> Vec<(String, Vec<LPBalancesReply>)> {
    LP_POSITIONS.with(|lp| {
        lp.borrow()
            .iter()
            .map(|(principal, positions)| (principal.to_text(), positions.clone()))
            .collect()
    })
}

// Registration happens on frontend - this just returns instructions
#[update]
pub async fn register_with_kongswap() -> Result<String, String> {
    Ok("Registration handled by frontend. Transfer ICP and call swap directly.".to_string())
}

ic_cdk::export_candid!();