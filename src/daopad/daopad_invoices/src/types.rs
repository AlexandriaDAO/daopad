use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;

#[derive(CandidType, Deserialize)]
pub struct HttpRequest {
    pub method: String,
    pub url: String,
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

#[derive(CandidType)]
pub struct HttpResponse {
    pub status_code: u16,
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
    pub upgrade: Option<bool>,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct Invoice {
    pub id: String,                          // Stripe payment link ID
    pub url: String,                         // Stripe payment link URL for sharing
    pub fiat: u64,                           // Fiat amount in cents (USD)
    pub crypto: u64,                         // Equivalent crypto amount in token's smallest unit
    pub collateral: Collateral,              // Token to transfer to receiver upon payment
    pub description: String,                 // Invoice description (empty string if not provided)
    pub created_at: u64,                     // Timestamp
    pub status: InvoiceStatus,               // paid, unpaid, expired
    // Orbit treasury account fields (replaces simple receiver principal)
    pub orbit_account_id: String,            // UUID of Orbit account
    pub treasury_owner: Principal,            // Principal from ICRC1 address
    pub treasury_subaccount: Option<Vec<u8>>, // 32-byte subaccount or None
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum InvoiceStatus {
    Paid,
    Unpaid,
    Inactive,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum Collateral {
    ICP,
    ckUSDT,
}
