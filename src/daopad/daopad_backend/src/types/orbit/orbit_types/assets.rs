// Asset-related types for Orbit Station
// Domain: Asset management, asset metadata, and asset balances

use candid::CandidType;
use serde::{Deserialize, Serialize};

use super::accounts::AccountBalance;

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct AssetMetadata {
    pub key: String,
    pub value: String,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct AddAssetOperationInput {
    pub blockchain: String,
    pub standards: Vec<String>,
    pub symbol: String,
    pub name: String,
    pub metadata: Vec<AssetMetadata>,
    pub decimals: u32,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum ChangeMetadata {
    ReplaceAllBy(Vec<AssetMetadata>),
    OverrideSpecifiedBy(Vec<AssetMetadata>),
    RemoveKeys(Vec<String>),
}

#[derive(CandidType, Deserialize, Debug)]
pub struct EditAssetOperationInput {
    pub asset_id: String,
    pub name: Option<String>,
    pub blockchain: Option<String>,
    pub standards: Option<Vec<String>>,
    pub symbol: Option<String>,
    pub change_metadata: Option<ChangeMetadata>,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct RemoveAssetOperationInput {
    pub asset_id: String,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct AccountAsset {
    pub asset_id: String, // UUID
    pub balance: Option<AccountBalance>,
}

/// Minimal AccountAsset for deserialization - skips balance field
/// Balance is fetched separately via fetch_account_balances
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct AccountAssetMinimal {
    pub asset_id: String, // UUID
    // Skip balance - will be fetched separately
}

/// AccountAsset with balance data - used for returning to frontend
/// This is NOT deserialized from Orbit - it's constructed after merging balance data
#[derive(CandidType, Serialize, Debug, Clone)]
pub struct AccountAssetWithBalance {
    pub asset_id: String,
    pub asset_symbol: String,     // Asset symbol (e.g., "ICP", "ckUSDT")
    pub balance: AccountBalance,  // Non-optional - always populated
}

// Asset balance info used in treasury views
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct AssetBalanceInfo {
    pub symbol: String,
    pub decimals: u32,
    pub balance: String,
    pub balance_formatted: String,
}
