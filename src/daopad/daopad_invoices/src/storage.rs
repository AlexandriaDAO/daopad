use crate::types::{Invoice, InvoiceStatus};
use candid::Principal;
use ic_cdk::storage::{stable_restore, stable_save};
use ic_cdk::{caller, init, post_upgrade, pre_upgrade, println, update};
use std::cell::RefCell;
use std::collections::HashMap;

const ADMIN_PRINCIPAL: &str = "mgxur-7e22f-jfivc-k7fnr-mcjv3-5o2xz-mmmu5-l5lpq-g5aob-dgs7a-oae";
// const ADMIN_PRINCIPAL: Principal = Principal::anonymous();

thread_local! {
    static STRIPE_API_SECRET: RefCell<String> = RefCell::new(String::new());
    static STRIPE_WEBHOOK_SECRET: RefCell<String> = RefCell::new(String::new());
    static INVOICES: RefCell<HashMap<Principal, Vec<Invoice>>> = RefCell::new(HashMap::new());
}

#[init]
fn init() {
    println!("Stripe backend canister initialized");
}

#[pre_upgrade]
fn pre_upgrade() {
    let stripe_api_secret = STRIPE_API_SECRET.with(|s| s.borrow().clone());
    let stripe_webhook_secret = STRIPE_WEBHOOK_SECRET.with(|s| s.borrow().clone());
    let invoices = INVOICES.with(|i| i.borrow().clone());
    stable_save((
        stripe_api_secret,
        stripe_webhook_secret,
        invoices,
    ))
    .expect("Failed to save state to stable memory");
    println!("Pre-upgrade: Saved state to stable memory");
}

#[post_upgrade]
fn post_upgrade() {
    let (stripe_api_secret, stripe_webhook_secret, invoices): (
        String,
        String,
        HashMap<Principal, Vec<Invoice>>,
    ) = stable_restore().unwrap_or((String::new(), String::new(), HashMap::new()));

    STRIPE_API_SECRET.with(|s| {
        *s.borrow_mut() = stripe_api_secret;
    });

    STRIPE_WEBHOOK_SECRET.with(|s| {
        *s.borrow_mut() = stripe_webhook_secret;
    });

    INVOICES.with(|i| {
        *i.borrow_mut() = invoices;
    });

    println!("Post-upgrade: Restored state from stable memory");
}

pub fn get_stripe_api_secret() -> String {
    STRIPE_API_SECRET.with(|secret| secret.borrow().clone())
}

#[ic_cdk::query]
pub fn get_stripe_api_secret_info() -> String {
    let secret = get_stripe_api_secret();
    if secret.is_empty() {
        "API secret is not configured (empty)".to_string()
    } else {
        format!(
            "API secret is configured (length: {} characters, starts with: {})",
            secret.len(),
            secret.chars().take(8).collect::<String>()
        )
    }
}

#[update]
pub fn update_stripe_api_secret(new_secret: String) -> Result<String, String> {
    if caller().to_text() != ADMIN_PRINCIPAL {
        return Err("Unauthorized: Only admin can update Stripe API secret".to_string());
    }

    STRIPE_API_SECRET.with(|secret| {
        *secret.borrow_mut() = new_secret;
    });

    Ok("Stripe API secret updated successfully".to_string())
}

pub fn get_stripe_webhook_secret() -> String {
    STRIPE_WEBHOOK_SECRET.with(|secret| secret.borrow().clone())
}

#[ic_cdk::query]
pub fn get_stripe_webhook_secret_info() -> String {
    let secret = get_stripe_webhook_secret();
    if secret.is_empty() {
        "Stripe webhook secret is not configured (empty)".to_string()
    } else {
        format!(
            "Stripe webhook secret is configured (length: {} characters, starts with: {})",
            secret.len(),
            secret.chars().take(8).collect::<String>()
        )
    }
}

#[update]
pub fn update_stripe_webhook_secret(new_secret: String) -> Result<String, String> {
    if caller().to_text() != ADMIN_PRINCIPAL {
        return Err("Unauthorized: Only admin can update Stripe webhook secret".to_string());
    }

    STRIPE_WEBHOOK_SECRET.with(|secret| {
        *secret.borrow_mut() = new_secret;
    });

    Ok("Stripe webhook secret updated successfully".to_string())
}


// Invoice storage functions
pub fn add_invoice_for_principal(principal: Principal, invoice: Invoice) {
    INVOICES.with(|invoices| {
        invoices
            .borrow_mut()
            .entry(principal)
            .or_insert_with(Vec::new)
            .push(invoice);
    });
}

pub fn get_invoices_for_principal(principal: Principal) -> Vec<Invoice> {
    INVOICES.with(|invoices| {
        invoices
            .borrow()
            .get(&principal)
            .cloned()
            .unwrap_or_default()
    })
}

pub fn find_invoice_by_payment_id(payment_id: &str) -> Option<(Principal, Invoice)> {
    INVOICES.with(|invoices| {
        for (principal, invoice_list) in invoices.borrow().iter() {
            for invoice in invoice_list {
                if invoice.id == payment_id {
                    return Some((*principal, invoice.clone()));
                }
            }
        }
        None
    })
}

pub fn update_invoice_status_by_payment_id(payment_id: &str, status: InvoiceStatus) -> bool {
    INVOICES.with(|invoices| {
        for (_, invoice_list) in invoices.borrow_mut().iter_mut() {
            for invoice in invoice_list.iter_mut() {
                if invoice.id == payment_id {
                    invoice.status = status;
                    return true;
                }
            }
        }
        false
    })
}

pub fn update_invoice_crypto_amount_by_payment_id(payment_id: &str, crypto_amount: u64) -> bool {
    INVOICES.with(|invoices| {
        for (_, invoice_list) in invoices.borrow_mut().iter_mut() {
            for invoice in invoice_list.iter_mut() {
                if invoice.id == payment_id {
                    invoice.crypto = crypto_amount;
                    return true;
                }
            }
        }
        false
    })
}

pub fn get_all_invoices() -> HashMap<Principal, Vec<Invoice>> {
    INVOICES.with(|invoices| invoices.borrow().clone())
}
