use candid::{CandidType, Deserialize, Nat, Principal};
use crate::icrc_types::Account;
use crate::ledger_client::{get_icpi_balance, get_icpi_total_supply};

// ICRC1 metadata
const TOKEN_NAME: &str = "Internet Computer Portfolio Index";
const TOKEN_SYMBOL: &str = "ICPI";
const ICPI_DECIMALS: u8 = 8;

// ===== ICRC1 Standard Methods (Proxied to Real Ledger) =====
// NOTE: These methods are kept for backwards compatibility with the Candid interface.
// They proxy queries to the actual ICPI ledger canister (l6lep-niaaa-aaaap-qqeda-cai).

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

// NOTE: This is an update method (not query) because it needs to make an inter-canister call
#[ic_cdk::update]
pub async fn icrc1_total_supply() -> Nat {
    get_icpi_total_supply()
        .await
        .unwrap_or_else(|e| {
            ic_cdk::println!("ERROR: Failed to query ICPI total supply: {}", e);
            Nat::from(0u32)
        })
}

// NOTE: This is an update method (not query) because it needs to make an inter-canister call
#[ic_cdk::update]
pub async fn icrc1_balance_of(account: Account) -> Nat {
    get_icpi_balance(account.owner)
        .await
        .unwrap_or_else(|e| {
            ic_cdk::println!("ERROR: Failed to query ICPI balance for {}: {}", account.owner, e);
            Nat::from(0u32)
        })
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

// ===== Helper Methods for Backwards Compatibility =====

// Get all balances (for debugging) - DEPRECATED
// This method is no longer accurate as balances are stored on the ICPI ledger canister
#[ic_cdk::query]
pub fn get_all_balances() -> Vec<(Principal, Nat)> {
    ic_cdk::println!("WARNING: get_all_balances is deprecated. Query the ICPI ledger directly at l6lep-niaaa-aaaap-qqeda-cai");
    vec![]
}
