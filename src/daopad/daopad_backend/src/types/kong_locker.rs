use candid::{CandidType, Deserialize};

#[derive(CandidType, Deserialize)]
pub enum UserBalancesReply {
    LP(LPReply),
}

#[derive(CandidType, Deserialize)]
pub struct LPReply {
    pub name: String,
    pub symbol: String,
    pub lp_token_id: u64,
    pub balance: f64,
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

#[derive(Clone, Debug, CandidType, Deserialize, PartialEq, Eq, Hash)]
pub struct TokenInfo {
    pub canister_id: String,
    pub symbol: String,
    pub chain: String,
}
