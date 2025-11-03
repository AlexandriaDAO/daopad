// Account-related types for Orbit Station
// Domain: Treasury accounts, account balances, and account permissions

use candid::{CandidType, Nat};
use serde::{Deserialize, Serialize};

use super::system::{PaginationInput, Error, Allow, AuthScope};
use super::requests::RequestPolicyRule;
use super::assets::AccountAsset;

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct AccountMetadata {
    pub key: String,
    pub value: String,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct AccountAddress {
    pub address: String,
    pub format: String,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct AccountBalance {
    pub account_id: String, // UUID
    pub asset_id: String,   // UUID
    pub balance: Nat,
    pub decimals: u32,
    pub last_update_timestamp: String, // RFC3339 timestamp
    pub query_state: String,           // "fresh", "stale", or "stale_refreshing"
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct Account {
    pub id: String, // UUID
    pub assets: Vec<AccountAsset>,
    pub addresses: Vec<AccountAddress>,
    pub name: String,
    pub metadata: Vec<AccountMetadata>,
    pub transfer_request_policy: Option<RequestPolicyRule>,
    pub configs_request_policy: Option<RequestPolicyRule>,
    pub last_modification_timestamp: String, // RFC3339 timestamp
}

/// AccountCallerPrivileges - CRITICAL: Field order must match Orbit response
/// Order: id, can_transfer, can_edit
/// Last verified: 2025-10-25 via dfx test
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct AccountCallerPrivileges {
    pub id: String, // UUID
    pub can_transfer: bool,
    pub can_edit: bool,
}

// List accounts input/output
#[derive(CandidType, Deserialize)]
pub struct ListAccountsInput {
    pub search_term: Option<String>,
    pub paginate: Option<PaginationInput>,
}

#[derive(CandidType, Deserialize)]
pub enum ListAccountsResult {
    Ok {
        accounts: Vec<Account>,
        privileges: Vec<AccountCallerPrivileges>,
        total: u64,
        next_offset: Option<u64>,
    },
    Err(Error),
}

// Fetch account balances types
#[derive(CandidType, Deserialize)]
pub struct FetchAccountBalancesInput {
    pub account_ids: Vec<String>, // UUID array
}

#[derive(CandidType, Deserialize)]
pub enum FetchAccountBalancesResult {
    Ok {
        balances: Vec<Option<AccountBalance>>,
    },
    Err(Error),
}

// Add account operation types
#[derive(CandidType, Deserialize, Debug)]
pub struct AddAccountOperationInput {
    pub name: String,
    pub assets: Vec<String>, // Asset UUIDs
    pub metadata: Vec<AccountMetadata>,
    pub read_permission: Allow,
    pub configs_permission: Allow,
    pub transfer_permission: Allow,
    pub configs_request_policy: Option<RequestPolicyRule>,
    pub transfer_request_policy: Option<RequestPolicyRule>,
}

// Change assets enum for EditAccount operation
#[derive(CandidType, Deserialize, Debug)]
pub enum ChangeAssets {
    ReplaceWith { assets: Vec<String> }, // Asset UUIDs
    Change { add_assets: Vec<String>, remove_assets: Vec<String> },
}

// Edit account operation types
#[derive(CandidType, Deserialize, Debug)]
pub struct EditAccountOperationInput {
    pub account_id: String, // UUID
    pub name: Option<String>,
    pub change_assets: Option<ChangeAssets>,
    pub read_permission: Option<Allow>,
    pub configs_permission: Option<Allow>,
    pub transfer_permission: Option<Allow>,
    pub configs_request_policy: Option<RequestPolicyRule>,
    pub transfer_request_policy: Option<RequestPolicyRule>,
}

// Treasury account details for operating agreement
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct TreasuryAccountDetails {
    pub account_id: String,
    pub account_name: String,
    pub assets: Vec<super::assets::AssetBalanceInfo>,
    pub transfer_policy: String,
    pub config_policy: String,
    pub can_transfer: bool,
    pub can_edit: bool,
    pub addresses: Vec<AccountAddress>,
}

// Address book entry for treasury management
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct TreasuryAddressBookEntry {
    pub id: String,
    pub name: String,
    pub address: String,
    pub blockchain: String,
    pub purpose: Option<String>,
}

// Complete treasury management data
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct TreasuryManagementData {
    pub accounts: Vec<TreasuryAccountDetails>,
    pub address_book: Vec<TreasuryAddressBookEntry>,
    pub backend_privileges_summary: String,
}

/// Minimal ListAccountsInput for INPUT (sending to Orbit)
/// Uses empty String and concrete PaginationInputMinimal
#[derive(CandidType, Serialize)]
pub struct ListAccountsInputMinimal {
    pub search_term: String,  // Empty string instead of None
    pub paginate: super::system::PaginationInputMinimal,  // Always include pagination
}

/// Account for deserializing list_accounts response with balance data
/// Uses AccountAsset which has Option<AccountBalance> - this works fine
/// The problem was with Vec<Option<T>> in fetch_account_balances, not Option<T> itself
/// Candid ignores extra policy fields in responses, so we only define what we need
/// Last verified: 2025-10-25 via dfx test
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct AccountMinimal {
    pub id: String,
    // Skip configs_request_policy - Candid will ignore it
    pub metadata: Vec<AccountMetadata>,
    pub name: String,
    pub assets: Vec<AccountAsset>,  // Use AccountAsset with Option<AccountBalance>
    pub addresses: Vec<AccountAddress>,
    // Skip transfer_request_policy - Candid will ignore it
    pub last_modification_timestamp: String,
}

/// Account with balance data - used for returning to frontend
/// This is NOT deserialized from Orbit - it's constructed after merging balance data
/// With Candid 0.11+, Option<T> should work properly
#[derive(CandidType, Serialize, Debug, Clone)]
pub struct AccountMinimalWithBalances {
    pub id: String,
    pub configs_request_policy: Option<RequestPolicyRule>,  // Include for frontend compatibility
    pub metadata: Vec<AccountMetadata>,
    pub name: String,
    pub assets: Vec<super::assets::AccountAssetWithBalance>,  // All assets have balances
    pub addresses: Vec<AccountAddress>,
    pub transfer_request_policy: Option<RequestPolicyRule>,  // Include for frontend compatibility
    pub last_modification_timestamp: String,
}

/// Minimal ListAccountsResult using minimal Account type
/// CRITICAL: Field order must match Orbit's exact response: total, privileges, accounts
/// Skipping next_offset field - Candid will ignore it
/// Last verified: 2025-10-25 via dfx test
#[derive(CandidType, Deserialize)]
pub enum ListAccountsResultMinimal {
    Ok {
        total: u64,
        privileges: Vec<AccountCallerPrivileges>,
        accounts: Vec<AccountMinimal>,
        // Skip next_offset - Candid ignores extra fields in responses
    },
    Err(Error),
}
