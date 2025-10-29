use candid::{CandidType, Deserialize, Principal};
use thiserror::Error;

/// Newtype wrapper for proposal IDs (type safety)
#[derive(CandidType, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct ProposalId(pub u64);

impl ProposalId {
    pub fn new() -> Self {
        // Generate unique ID from timestamp + random component
        let now = ic_cdk::api::time();
        // Use caller bytes for additional entropy
        let caller = ic_cdk::caller();
        let caller_bytes = caller.as_slice();
        let random = if caller_bytes.len() >= 8 {
            u64::from_le_bytes([
                caller_bytes[0],
                caller_bytes[1],
                caller_bytes[2],
                caller_bytes[3],
                caller_bytes[4],
                caller_bytes[5],
                caller_bytes[6],
                caller_bytes[7],
            ]) % 1000
        } else {
            0
        };
        ProposalId(now / 1_000_000 + random)
    }
}

/// Minimal proposal storage (references Orbit request, doesn't duplicate data)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TreasuryProposal {
    pub id: ProposalId,
    pub token_canister_id: Principal,
    pub orbit_request_id: String, // Reference to Orbit's request
    pub proposal_type: ProposalType,
    pub proposer: Principal,
    pub created_at: u64,
    pub expires_at: u64,
    pub yes_votes: u64,
    pub no_votes: u64,
    pub total_voting_power: u64,
    pub voter_count: u32, // Just count, not full set (memory efficient)
    pub status: ProposalStatus,
}

/// Generic Orbit request proposal (for ALL non-treasury Orbit operations)
/// Used for governance over: AddUser, EditAccount, ChangeCanister, etc.
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct OrbitRequestProposal {
    pub id: ProposalId,
    pub token_canister_id: Principal,
    pub orbit_request_id: String,
    pub request_type: OrbitRequestType,
    pub proposer: Principal,
    pub created_at: u64,
    pub expires_at: u64,
    pub yes_votes: u64,
    pub no_votes: u64,
    pub total_voting_power: u64,
    pub voter_count: u32,
    pub status: ProposalStatus,
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum ProposalType {
    Transfer,
    OrbitRequest(OrbitRequestType),
}

/// Categorize all 33 Orbit request types with risk-based thresholds
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum OrbitRequestType {
    // Treasury Operations (75% threshold - HIGH RISK)
    Transfer,
    AddAccount,
    EditAccount,

    // User Management (50% threshold - MEDIUM RISK)
    AddUser,
    EditUser,
    RemoveUser,

    // Group Management (50% threshold - MEDIUM RISK)
    AddUserGroup,
    EditUserGroup,
    RemoveUserGroup,

    // Canister Management (60% threshold - MEDIUM-HIGH RISK)
    CreateExternalCanister,
    ConfigureExternalCanister,
    ChangeExternalCanister,
    CallExternalCanister,
    FundExternalCanister,
    MonitorExternalCanister,
    SnapshotExternalCanister,
    RestoreExternalCanister,
    PruneExternalCanister,

    // System Operations (90% threshold - CRITICAL)
    SystemUpgrade,
    SystemRestore,
    SetDisasterRecovery,
    ManageSystemInfo,

    // Governance Configuration (70% threshold - HIGH RISK)
    EditPermission,
    AddRequestPolicy,
    EditRequestPolicy,
    RemoveRequestPolicy,

    // Asset Management (40% threshold - LOW RISK)
    AddAsset,
    EditAsset,
    RemoveAsset,

    // Automation Rules (60% threshold - MEDIUM-HIGH RISK)
    AddNamedRule,
    EditNamedRule,
    RemoveNamedRule,

    // Address Book (30% threshold - LOW RISK)
    AddAddressBookEntry,
    EditAddressBookEntry,
    RemoveAddressBookEntry,

    // Fallback for future operations
    Other(String),
}

impl OrbitRequestType {
    /// Get voting threshold percentage for this operation type
    pub fn voting_threshold(&self) -> u8 {
        match self {
            // Critical operations
            Self::SystemUpgrade | Self::SystemRestore
            | Self::SetDisasterRecovery | Self::ManageSystemInfo => 90,

            // Treasury operations
            Self::Transfer | Self::AddAccount | Self::EditAccount => 50,

            // Governance changes
            Self::EditPermission | Self::AddRequestPolicy
            | Self::EditRequestPolicy | Self::RemoveRequestPolicy => 70,

            // Canister and automation
            Self::CreateExternalCanister | Self::ConfigureExternalCanister
            | Self::ChangeExternalCanister | Self::CallExternalCanister
            | Self::FundExternalCanister | Self::MonitorExternalCanister
            | Self::SnapshotExternalCanister | Self::RestoreExternalCanister
            | Self::PruneExternalCanister | Self::AddNamedRule
            | Self::EditNamedRule | Self::RemoveNamedRule => 60,

            // User and group management
            Self::AddUser | Self::EditUser | Self::RemoveUser
            | Self::AddUserGroup | Self::EditUserGroup | Self::RemoveUserGroup => 50,

            // Asset management
            Self::AddAsset | Self::EditAsset | Self::RemoveAsset => 40,

            // Address book
            Self::AddAddressBookEntry | Self::EditAddressBookEntry
            | Self::RemoveAddressBookEntry => 30,

            // Unknown operations default to high threshold for safety
            Self::Other(_) => 75,
        }
    }

    /// Get voting duration in hours for this operation type
    pub fn voting_duration_hours(&self) -> u64 {
        match self {
            // Critical operations need more deliberation
            Self::SystemUpgrade | Self::SystemRestore => 72, // 3 days

            // Financial operations
            Self::Transfer | Self::AddAccount | Self::EditAccount => 48, // 2 days

            // Most operations
            _ => 24, // 1 day default
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum ProposalStatus {
    Active,
    Executed,  // Passed and executed in Orbit
    Rejected,
    Expired,
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum VoteChoice {
    Yes,
    No,
}

/// Typed errors (better than String)
#[derive(Error, Debug, CandidType, Deserialize, Clone)]
pub enum ProposalError {
    #[error("Proposal not found: {0:?}")]
    NotFound(ProposalId),

    #[error("Proposal has expired")]
    Expired,

    #[error("Proposal is not active")]
    NotActive,

    #[error("Already voted on proposal {0:?}")]
    AlreadyVoted(ProposalId),

    #[error("No voting power for this token")]
    NoVotingPower,

    #[error("Insufficient voting power to create proposal: {current} < {required}")]
    InsufficientVotingPowerToPropose { current: u64, required: u64 },

    #[error("Authentication required")]
    AuthRequired,

    #[error("{0}")]
    Custom(String),

    #[error("An active proposal already exists for this token. Please wait for it to complete before creating a new one.")]
    ActiveProposalExists,

    #[error("No Orbit Station linked to token {0}")]
    NoStationLinked(Principal),

    #[error("Orbit error: {code} - {message}{}", details.as_ref().map(|d| format!(" [{}]", d)).unwrap_or_default())]
    OrbitError {
        code: String,
        message: String,
        details: Option<String>,
    },

    #[error("IC call failed: {message}")]
    IcCallFailed { code: i32, message: String },

    #[error("Invalid transfer details: {0}")]
    InvalidTransferDetails(String),

    #[error("Total voting power is zero - no votes possible")]
    ZeroVotingPower,
}

// ============================================================================
// Unified Proposal System Types
// ============================================================================

use candid::Nat;

/// Details for a transfer request
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TransferDetails {
    pub from_account_id: String, // UUID from Orbit account
    pub from_asset_id: String,   // UUID from Orbit asset
    pub to: String,              // Destination address
    pub amount: Nat,             // Amount in smallest units
    pub memo: Option<String>,
    pub title: String,           // Transfer title for proposal
    pub description: String,     // Transfer description for proposal
}

/// Unified proposal type for all Orbit operations
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct UnifiedProposal {
    pub id: ProposalId,
    pub token_canister_id: Principal,
    pub orbit_request_id: String,
    pub operation_type: OrbitOperationType,
    pub proposer: Principal,
    pub created_at: u64,
    pub expires_at: u64,
    pub yes_votes: u64,
    pub no_votes: u64,
    pub total_voting_power: u64,
    pub voter_count: u32,
    pub status: ProposalStatus,
    // Optional fields for specific operations
    pub transfer_details: Option<TransferDetails>,
}

/// All possible Orbit operations in one enum
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum OrbitOperationType {
    // Treasury
    Transfer,
    AddAccount,
    EditAccount,

    // User Management
    AddUser,
    EditUser,
    RemoveUser,

    // Group Management
    AddUserGroup,
    EditUserGroup,
    RemoveUserGroup,

    // Canister Management
    CreateExternalCanister,
    ConfigureExternalCanister,
    ChangeExternalCanister,
    CallExternalCanister,
    FundExternalCanister,
    MonitorExternalCanister,
    SnapshotExternalCanister,
    RestoreExternalCanister,
    PruneExternalCanister,

    // System Operations
    SystemUpgrade,
    SystemRestore,
    SetDisasterRecovery,
    ManageSystemInfo,

    // Governance Configuration
    EditPermission,
    AddRequestPolicy,
    EditRequestPolicy,
    RemoveRequestPolicy,

    // Asset Management
    AddAsset,
    EditAsset,
    RemoveAsset,

    // Automation Rules
    AddNamedRule,
    EditNamedRule,
    RemoveNamedRule,

    // Address Book
    AddAddressBookEntry,
    EditAddressBookEntry,
    RemoveAddressBookEntry,

    // Fallback for future operations
    Other(String),
}

impl OrbitOperationType {
    /// Get voting threshold percentage for this operation type
    pub fn voting_threshold(&self) -> u8 {
        match self {
            // Critical operations
            Self::SystemUpgrade | Self::SystemRestore
            | Self::SetDisasterRecovery | Self::ManageSystemInfo => 90,

            // Treasury operations
            Self::Transfer | Self::AddAccount | Self::EditAccount => 50,

            // Governance changes
            Self::EditPermission | Self::AddRequestPolicy
            | Self::EditRequestPolicy | Self::RemoveRequestPolicy => 70,

            // Canister and automation
            Self::CreateExternalCanister | Self::ConfigureExternalCanister
            | Self::ChangeExternalCanister | Self::CallExternalCanister
            | Self::FundExternalCanister | Self::MonitorExternalCanister
            | Self::SnapshotExternalCanister | Self::RestoreExternalCanister
            | Self::PruneExternalCanister | Self::AddNamedRule
            | Self::EditNamedRule | Self::RemoveNamedRule => 60,

            // User and group management
            Self::AddUser | Self::EditUser | Self::RemoveUser
            | Self::AddUserGroup | Self::EditUserGroup | Self::RemoveUserGroup => 50,

            // Asset management
            Self::AddAsset | Self::EditAsset | Self::RemoveAsset => 40,

            // Address book
            Self::AddAddressBookEntry | Self::EditAddressBookEntry
            | Self::RemoveAddressBookEntry => 30,

            // Unknown operations default to high threshold for safety
            Self::Other(_) => 75,
        }
    }

    /// Get voting duration in hours for this operation type
    pub fn voting_duration_hours(&self) -> u64 {
        match self {
            // Critical operations need more deliberation
            Self::SystemUpgrade | Self::SystemRestore => 72, // 3 days

            // Financial operations
            Self::Transfer | Self::AddAccount | Self::EditAccount => 48, // 2 days

            // Most operations
            _ => 24, // 1 day default
        }
    }

    /// Convert from operation string
    pub fn from_string(operation_type: &str) -> Self {
        match operation_type {
            // Treasury
            "Transfer" => Self::Transfer,
            "AddAccount" => Self::AddAccount,
            "EditAccount" => Self::EditAccount,

            // Users
            "AddUser" => Self::AddUser,
            "EditUser" => Self::EditUser,
            "RemoveUser" => Self::RemoveUser,

            // Groups
            "AddUserGroup" => Self::AddUserGroup,
            "EditUserGroup" => Self::EditUserGroup,
            "RemoveUserGroup" => Self::RemoveUserGroup,

            // Canisters
            "CreateExternalCanister" => Self::CreateExternalCanister,
            "ConfigureExternalCanister" => Self::ConfigureExternalCanister,
            "ChangeExternalCanister" => Self::ChangeExternalCanister,
            "CallExternalCanister" => Self::CallExternalCanister,
            "FundExternalCanister" => Self::FundExternalCanister,
            "MonitorExternalCanister" => Self::MonitorExternalCanister,
            "SnapshotExternalCanister" => Self::SnapshotExternalCanister,
            "RestoreExternalCanister" => Self::RestoreExternalCanister,
            "PruneExternalCanister" => Self::PruneExternalCanister,

            // System
            "SystemUpgrade" => Self::SystemUpgrade,
            "SystemRestore" => Self::SystemRestore,
            "SetDisasterRecovery" => Self::SetDisasterRecovery,
            "ManageSystemInfo" => Self::ManageSystemInfo,

            // Governance
            "EditPermission" => Self::EditPermission,
            "AddRequestPolicy" => Self::AddRequestPolicy,
            "EditRequestPolicy" => Self::EditRequestPolicy,
            "RemoveRequestPolicy" => Self::RemoveRequestPolicy,

            // Assets
            "AddAsset" => Self::AddAsset,
            "EditAsset" => Self::EditAsset,
            "RemoveAsset" => Self::RemoveAsset,

            // Rules
            "AddNamedRule" => Self::AddNamedRule,
            "EditNamedRule" => Self::EditNamedRule,
            "RemoveNamedRule" => Self::RemoveNamedRule,

            // Address Book
            "AddAddressBookEntry" => Self::AddAddressBookEntry,
            "EditAddressBookEntry" => Self::EditAddressBookEntry,
            "RemoveAddressBookEntry" => Self::RemoveAddressBookEntry,

            // Unknown
            _ => Self::Other(operation_type.to_string()),
        }
    }
}
