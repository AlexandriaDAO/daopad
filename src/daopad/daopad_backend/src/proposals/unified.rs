use crate::kong_locker::voting::get_user_voting_power_for_token;
use crate::storage::state::TOKEN_ORBIT_STATIONS;
use crate::types::StorablePrincipal;
use candid::{CandidType, Deserialize, Nat, Principal};
use ic_cdk::update;

const ADMIN_CANISTER_ID: &str = "odkrm-viaaa-aaaap-qp2oq-cai";

// Constants
const MINIMUM_VP_FOR_PROPOSAL: u64 = 10_000; // Same as orbit link proposals

/// Helper function to format Orbit Error with details
fn format_orbit_error_details(error: &crate::api::orbit_requests::Error) -> Option<String> {
    error.details.as_ref().map(|details| {
        details
            .iter()
            .map(|d| format!("{}: {}", d.0, d.1))
            .collect::<Vec<_>>()
            .join(", ")
    })
}

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
            Self::Transfer | Self::AddAccount | Self::EditAccount => 75,

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

use crate::proposals::types::{ProposalError, ProposalId, ProposalStatus};

/// Enum for all possible Orbit operations
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum OrbitOperation {
    Transfer(TransferDetails),
    EditUser { user_id: String, groups: Vec<String>, name: Option<String> },
    AddAsset { asset: AssetDetails },
    RemoveAdmin { user_id: String, user_name: String },
    // Add more operation types as needed
}

impl OrbitOperation {
    pub fn to_type(&self) -> OrbitOperationType {
        match self {
            OrbitOperation::Transfer(_) => OrbitOperationType::Transfer,
            OrbitOperation::EditUser { .. } => OrbitOperationType::EditUser,
            OrbitOperation::AddAsset { .. } => OrbitOperationType::AddAsset,
            OrbitOperation::RemoveAdmin { .. } => OrbitOperationType::EditUser,
        }
    }

    pub fn transfer_details(&self) -> Option<TransferDetails> {
        match self {
            OrbitOperation::Transfer(details) => Some(details.clone()),
            _ => None,
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AssetDetails {
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
}

/// Create any Orbit request with auto-proposal
#[update]
pub async fn create_orbit_request_with_proposal(
    token_id: Principal,
    operation: OrbitOperation,
) -> Result<String, ProposalError> {
    // 1. Validate caller has minimum VP
    let caller = ic_cdk::caller();
    let voting_power = get_user_voting_power_for_token(caller, token_id)
        .await
        .map_err(|_| ProposalError::NoVotingPower)?;

    if voting_power < MINIMUM_VP_FOR_PROPOSAL {
        return Err(ProposalError::InsufficientVotingPowerToPropose {
            current: voting_power,
            required: MINIMUM_VP_FOR_PROPOSAL,
        });
    }

    // 2. Get station
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_id))
            .map(|s| s.0)
            .ok_or(ProposalError::NoStationLinked(token_id))
    })?;

    // 3. Create appropriate Orbit request based on operation type
    let orbit_request_id = match &operation {
        OrbitOperation::Transfer(details) => {
            create_transfer_request_in_orbit(station_id, details.clone()).await?
        },
        OrbitOperation::EditUser { user_id, groups, name } => {
            create_edit_user_request_in_orbit(station_id, user_id.clone(), groups.clone(), name.clone()).await?
        },
        OrbitOperation::RemoveAdmin { user_id, user_name } => {
            // Remove admin is just EditUser with operator group only
            create_edit_user_request_in_orbit(
                station_id,
                user_id.clone(),
                vec!["00000000-0000-4000-8000-000000000001".to_string()], // Operator group
                Some(user_name.clone())
            ).await?
        },
        OrbitOperation::AddAsset { asset } => {
            create_add_asset_request_in_orbit(station_id, asset.clone()).await?
        },
    };

    // 4. Create proposal in admin canister
    let operation_type_str = match &operation {
        OrbitOperation::Transfer(_) => "Transfer",
        OrbitOperation::EditUser { .. } => "EditUser",
        OrbitOperation::AddAsset { .. } => "AddAsset",
        OrbitOperation::RemoveAdmin { .. } => "EditUser",
    }.to_string();

    let admin_principal = Principal::from_text(ADMIN_CANISTER_ID)
        .map_err(|e| ProposalError::Custom(format!("Invalid admin canister ID: {}", e)))?;

    let result: Result<(Result<String, String>,), _> = ic_cdk::call(
        admin_principal,
        "create_proposal",
        (token_id, orbit_request_id.clone(), operation_type_str)
    ).await;

    match result {
        Ok((Ok(_),)) => Ok(orbit_request_id),
        Ok((Err(e),)) => Err(ProposalError::Custom(format!("Admin proposal creation failed: {}", e))),
        Err((code, msg)) => Err(ProposalError::Custom(format!("Admin call failed: {:?} - {}", code, msg))),
    }
}

/// Create proposal in admin canister for an Orbit request
#[update]
pub async fn ensure_proposal_for_request(
    token_id: Principal,
    orbit_request_id: String,
    request_type_str: String,
) -> Result<String, ProposalError> {
    let admin_principal = Principal::from_text(ADMIN_CANISTER_ID)
        .map_err(|e| ProposalError::Custom(format!("Invalid admin canister ID: {}", e)))?;

    let result: Result<(Result<String, String>,), _> = ic_cdk::call(
        admin_principal,
        "create_proposal",
        (token_id, orbit_request_id, request_type_str)
    ).await;

    match result {
        Ok((Ok(proposal_id),)) => Ok(proposal_id),
        Ok((Err(e),)) => Err(ProposalError::Custom(e)),
        Err((code, msg)) => Err(ProposalError::Custom(format!("Admin call failed: {:?} - {}", code, msg))),
    }
}

// ============================================================================
// Internal helper functions
// ============================================================================

async fn create_transfer_request_in_orbit(
    station_id: Principal,
    details: TransferDetails,
) -> Result<String, ProposalError> {
    use crate::api::CreateRequestResult;
    use crate::types::orbit::{
        RequestOperation, SubmitRequestInput, TransferMetadata, TransferOperationInput,
    };

    let transfer_op = TransferOperationInput {
        from_account_id: details.from_account_id,
        from_asset_id: details.from_asset_id,
        with_standard: "icrc1".to_string(),
        to: details.to,
        amount: details.amount,
        fee: None,
        metadata: if let Some(m) = details.memo {
            vec![TransferMetadata {
                key: "memo".to_string(),
                value: m,
            }]
        } else {
            vec![]
        },
        network: None,
    };

    let request_input = SubmitRequestInput {
        operation: RequestOperation::Transfer(transfer_op),
        title: Some(details.title.clone()),
        summary: Some(details.description.clone()),
        execution_plan: None,
    };

    let result: Result<(CreateRequestResult,), _> =
        ic_cdk::call(station_id, "create_request", (request_input,)).await;

    match result {
        Ok((CreateRequestResult::Ok(response),)) => Ok(response.request.id),
        Ok((CreateRequestResult::Err(e),)) => Err(ProposalError::OrbitError {
            code: e.code.clone(),
            message: e.message.clone().unwrap_or_else(|| "No message provided".to_string()),
            details: format_orbit_error_details(&e),
        }),
        Err((code, msg)) => Err(ProposalError::IcCallFailed {
            code: code as i32,
            message: msg,
        }),
    }
}

async fn create_edit_user_request_in_orbit(
    station_id: Principal,
    user_id: String,
    groups: Vec<String>,
    name: Option<String>,
) -> Result<String, ProposalError> {
    use crate::api::CreateRequestResult;
    use crate::types::orbit::{
        RequestOperation, SubmitRequestInput, EditUserOperationInput,
    };

    // Create the EditUser operation input
    let edit_user_op = EditUserOperationInput {
        id: user_id.clone(),
        name,
        identities: None,  // Not changing identities
        groups: Some(groups),
        status: None,  // Not changing status
        cancel_pending_requests: None,
    };

    let request_input = SubmitRequestInput {
        operation: RequestOperation::EditUser(edit_user_op),
        title: Some(format!("Edit user {}", user_id)),
        summary: Some("Community-approved user modification".to_string()),
        execution_plan: None,
    };

    let result: Result<(CreateRequestResult,), _> =
        ic_cdk::call(station_id, "create_request", (request_input,)).await;

    match result {
        Ok((CreateRequestResult::Ok(response),)) => Ok(response.request.id),
        Ok((CreateRequestResult::Err(e),)) => Err(ProposalError::OrbitError {
            code: e.code.clone(),
            message: e.message.clone().unwrap_or_else(|| "No message provided".to_string()),
            details: format_orbit_error_details(&e),
        }),
        Err((code, msg)) => Err(ProposalError::IcCallFailed {
            code: code as i32,
            message: msg,
        }),
    }
}

async fn create_add_asset_request_in_orbit(
    _station_id: Principal,
    _asset: AssetDetails,
) -> Result<String, ProposalError> {
    // NOTE: AddAsset operation is not yet supported in RequestOperation enum
    // The types exist in RequestOperationInput but not in RequestOperation
    // This requires updating the Orbit type definitions
    // For now, return an error indicating this operation is not yet supported

    Err(ProposalError::Custom(
        "AddAsset operation is not yet implemented in Orbit integration. \
         The type definitions need to be updated to support asset management operations.".to_string()
    ))
}