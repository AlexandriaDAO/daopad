use crate::storage::{
    find_invoice_by_payment_id, get_all_invoices, get_invoices_for_principal,
};
use crate::swap::Account;
use crate::types::Invoice;
use candid::{Nat, Principal};
use ic_cdk::id;
use ic_cdk::{api::call::call, caller, query};
use std::collections::HashMap;

#[query]
fn health() -> String {
    "OK".to_string()
}

#[query]
pub fn whoami() -> String {
    caller().to_text()
}

// Invoice query functions
#[query]
fn get_my_invoices() -> Vec<Invoice> {
    let caller = caller();
    get_invoices_for_principal(caller)
}

#[query]
fn get_invoice_by_payment_id(payment_id: String) -> Option<(Principal, Invoice)> {
    find_invoice_by_payment_id(&payment_id)
}

#[query]
fn get_invoices_for_principal_query(principal: Principal) -> Vec<Invoice> {
    get_invoices_for_principal(principal)
}

#[query]
fn list_all_invoices() -> HashMap<Principal, Vec<Invoice>> {
    get_all_invoices()
}

// Query function to get ckUSDT balance for any principal
#[ic_cdk::update]
async fn get_ckusdt_balance(principal: Principal) -> Result<Nat, String> {
    const CKUSDT_TOKEN_CANISTER_ID: &str = "cngnf-vqaaa-aaaar-qag4q-cai";

    let account = Account {
        owner: principal,
        subaccount: None,
    };

    let ckusdt_principal = Principal::from_text(CKUSDT_TOKEN_CANISTER_ID)
        .map_err(|e| format!("Invalid ckUSDT token principal: {}", e))?;

    let call_result: (Nat,) = call(ckusdt_principal, "icrc1_balance_of", (account,))
        .await
        .map_err(|err| format!("Failed to call ckUSDT canister: {:?}", err))?;

    let balance: Nat = call_result.0;

    Ok(balance)
}

// Get this canister's ckUSDT balance
#[ic_cdk::update]
async fn get_canister_ckusdt_balance() -> Result<Nat, String> {
    get_ckusdt_balance(id()).await
}

// Query function to get ICP balance for any principal
#[ic_cdk::update]
async fn get_icp_balance(principal: Principal) -> Result<Nat, String> {
    const ICP_LEDGER_CANISTER_ID: &str = "ryjl3-tyaaa-aaaaa-aaaba-cai";

    let account = Account {
        owner: principal,
        subaccount: None,
    };

    let icp_principal = Principal::from_text(ICP_LEDGER_CANISTER_ID)
        .map_err(|e| format!("Invalid ICP ledger principal: {}", e))?;

    let call_result: (Nat,) = call(icp_principal, "icrc1_balance_of", (account,))
        .await
        .map_err(|err| format!("Failed to call ICP ledger: {:?}", err))?;

    let balance: Nat = call_result.0;

    Ok(balance)
}

// Get this canister's ICP balance
#[ic_cdk::update]
async fn get_canister_icp_balance() -> Result<Nat, String> {
    get_icp_balance(id()).await
}
