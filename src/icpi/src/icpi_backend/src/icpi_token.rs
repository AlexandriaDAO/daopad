use candid::{CandidType, Deserialize, Nat, Principal};
use std::cell::RefCell;
use std::collections::HashMap;

use crate::icrc_types::{Account, ICPI_DECIMALS};

// ICRC1 metadata
const TOKEN_NAME: &str = "Internet Computer Portfolio Index";
const TOKEN_SYMBOL: &str = "ICPI";

// Thread-local storage for token state (in-memory for safety)
thread_local! {
    // Token balances
    static BALANCES: RefCell<HashMap<Principal, Nat>> = RefCell::new(HashMap::new());

    // Total supply
    static TOTAL_SUPPLY: RefCell<Nat> = RefCell::new(Nat::from(0u32));
}

// ===== ICRC1 Standard Methods =====

#[ic_cdk::query]
pub fn icrc1_name() -> String {
    TOKEN_NAME.to_string()
}

#[ic_cdk::query]
pub fn icrc1_symbol() -> String {
    TOKEN_SYMBOL.to_string()
}

#[ic_cdk::query]
pub fn icrc1_decimals() -> u8 {
    ICPI_DECIMALS
}

#[ic_cdk::query]
pub fn icrc1_total_supply() -> Nat {
    total_supply()
}

#[ic_cdk::query]
pub fn icrc1_balance_of(account: Account) -> Nat {
    get_balance(account.owner)
}

#[ic_cdk::query]
pub fn icrc1_fee() -> Nat {
    Nat::from(0u32) // No transfer fee for ICPI
}

#[derive(CandidType, Deserialize)]
pub enum MetadataValue {
    Nat(Nat),
    Text(String),
}

#[ic_cdk::query]
pub fn icrc1_metadata() -> Vec<(String, MetadataValue)> {
    vec![
        ("icrc1:name".to_string(), MetadataValue::Text(TOKEN_NAME.to_string())),
        ("icrc1:symbol".to_string(), MetadataValue::Text(TOKEN_SYMBOL.to_string())),
        ("icrc1:decimals".to_string(), MetadataValue::Nat(Nat::from(ICPI_DECIMALS))),
        ("icrc1:fee".to_string(), MetadataValue::Nat(Nat::from(0u32))),
    ]
}

#[ic_cdk::query]
pub fn icrc1_supported_standards() -> Vec<StandardRecord> {
    vec![
        StandardRecord {
            name: "ICRC-1".to_string(),
            url: "https://github.com/dfinity/ICRC-1".to_string(),
        },
    ]
}

#[derive(CandidType, Deserialize)]
pub struct StandardRecord {
    pub name: String,
    pub url: String,
}

// ===== Internal Token Operations =====

// Get balance (internal)
pub fn get_balance(owner: Principal) -> Nat {
    BALANCES.with(|balances| {
        balances.borrow()
            .get(&owner)
            .cloned()
            .unwrap_or_else(|| Nat::from(0u32))
    })
}

// Get total supply (internal)
pub fn total_supply() -> Nat {
    TOTAL_SUPPLY.with(|supply| supply.borrow().clone())
}

// Mint tokens (internal - only callable by canister)
pub fn mint_tokens(to: Principal, amount: Nat) -> Result<(), String> {
    // Verify caller is the canister itself
    if ic_cdk::caller() != ic_cdk::api::id() {
        return Err("Unauthorized: only canister can mint".to_string());
    }

    // Update balance
    BALANCES.with(|balances| {
        let mut balances = balances.borrow_mut();
        let current_balance = balances.get(&to).cloned().unwrap_or_else(|| Nat::from(0u32));
        let new_balance = current_balance + amount.clone();
        balances.insert(to, new_balance);
    });

    // Update total supply
    TOTAL_SUPPLY.with(|supply| {
        let mut supply = supply.borrow_mut();
        *supply = supply.clone() + amount;
    });

    Ok(())
}

// Burn tokens (internal - only callable by canister)
pub fn burn_tokens(from: Principal, amount: Nat) -> Result<(), String> {
    // Verify caller is the canister itself
    if ic_cdk::caller() != ic_cdk::api::id() {
        return Err("Unauthorized: only canister can burn".to_string());
    }

    // Check balance
    let current_balance = get_balance(from);
    if current_balance < amount {
        return Err(format!("Insufficient balance. Have: {}, Need: {}", current_balance, amount));
    }

    // Update balance
    BALANCES.with(|balances| {
        let mut balances = balances.borrow_mut();
        let new_balance = current_balance - amount.clone();
        if new_balance == Nat::from(0u32) {
            balances.remove(&from);
        } else {
            balances.insert(from, new_balance);
        }
    });

    // Update total supply
    TOTAL_SUPPLY.with(|supply| {
        let mut supply = supply.borrow_mut();
        *supply = supply.clone() - amount;
    });

    Ok(())
}

// Transfer tokens (for future ICRC1 compliance)
pub fn transfer_tokens(from: Principal, to: Principal, amount: Nat) -> Result<(), String> {
    // Verify caller is the from principal or the canister itself
    let caller = ic_cdk::caller();
    if caller != from && caller != ic_cdk::api::id() {
        return Err("Unauthorized: caller must be sender".to_string());
    }

    // Check balance
    let current_balance = get_balance(from);
    if current_balance < amount {
        return Err(format!("Insufficient balance. Have: {}, Need: {}", current_balance, amount));
    }

    // Update sender balance
    BALANCES.with(|balances| {
        let mut balances = balances.borrow_mut();
        let new_balance = current_balance - amount.clone();
        if new_balance == Nat::from(0u32) {
            balances.remove(&from);
        } else {
            balances.insert(from, new_balance);
        }
    });

    // Update recipient balance
    BALANCES.with(|balances| {
        let mut balances = balances.borrow_mut();
        let recipient_balance = balances.get(&to).cloned().unwrap_or_else(|| Nat::from(0u32));
        let new_balance = recipient_balance + amount;
        balances.insert(to, new_balance);
    });

    Ok(())
}

// Get all balances (for debugging)
#[ic_cdk::query]
pub fn get_all_balances() -> Vec<(Principal, Nat)> {
    BALANCES.with(|balances| {
        balances.borrow()
            .iter()
            .map(|(k, v)| (*k, v.clone()))
            .collect()
    })
}

// Initialize with seed supply (only callable once during init)
pub fn initialize_seed_supply(amount: Nat) -> Result<(), String> {
    let current_supply = total_supply();
    if current_supply > Nat::from(0u32) {
        return Err("Supply already initialized".to_string());
    }

    // Mint seed supply to canister itself
    TOTAL_SUPPLY.with(|supply| {
        let mut supply = supply.borrow_mut();
        *supply = amount.clone();
    });

    BALANCES.with(|balances| {
        let mut balances = balances.borrow_mut();
        balances.insert(ic_cdk::api::id(), amount);
    });

    Ok(())
}