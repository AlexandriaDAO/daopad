// Unified voting system for ALL Orbit operations
// Replaces both treasury.rs and orbit_requests.rs

use crate::kong_locker::voting::{
    calculate_voting_power_for_token, get_user_voting_power_for_token,
};
use crate::storage::state::{
    KONG_LOCKER_PRINCIPALS, TOKEN_ORBIT_STATIONS, UNIFIED_PROPOSALS, UNIFIED_PROPOSAL_VOTES,
};
use crate::types::StorablePrincipal;
use candid::{CandidType, Deserialize, Nat, Principal};
use ic_cdk::api::time;
use ic_cdk::{query, update};

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

use crate::proposals::types::{ProposalError, ProposalId, ProposalStatus, VoteChoice};

/// Single voting endpoint for ALL Orbit operations
#[update]
pub async fn vote_on_proposal(
    token_id: Principal,
    orbit_request_id: String,
    vote: bool,
) -> Result<(), ProposalError> {
    let voter = ic_cdk::caller();

    // 1. Check auth
    if voter == Principal::anonymous() {
        return Err(ProposalError::AuthRequired);
    }

    // 2. Get proposal
    let mut proposal = UNIFIED_PROPOSALS.with(|proposals| {
        proposals
            .borrow()
            .get(&(StorablePrincipal(token_id), orbit_request_id.clone()))
            .cloned()
            .ok_or(ProposalError::NotFound(ProposalId(0)))
    })?;

    // 3. Check status
    if proposal.status != ProposalStatus::Active {
        return Err(ProposalError::NotActive);
    }

    // 4. Check expiry
    let now = time();
    if now > proposal.expires_at {
        proposal.status = ProposalStatus::Expired;
        let proposal_id = proposal.id;
        UNIFIED_PROPOSALS.with(|proposals| {
            proposals
                .borrow_mut()
                .remove(&(StorablePrincipal(token_id), orbit_request_id.clone()));
        });

        // Clean up all votes for this expired proposal to prevent memory leak
        UNIFIED_PROPOSAL_VOTES.with(|votes| {
            let mut votes_map = votes.borrow_mut();
            votes_map.retain(|(pid, _), _| *pid != proposal_id);
        });

        return Err(ProposalError::Expired);
    }

    // 5. Check double-vote
    let has_voted = UNIFIED_PROPOSAL_VOTES.with(|votes| {
        votes
            .borrow()
            .contains_key(&(proposal.id, StorablePrincipal(voter)))
    });

    if has_voted {
        return Err(ProposalError::AlreadyVoted(proposal.id));
    }

    // 6. Get voting power
    let voting_power = match get_user_voting_power_for_token(voter, token_id).await {
        Ok(vp) => vp,
        Err(e) if e.contains("register") => {
            return Err(ProposalError::Custom(
                "You need to register with Kong Locker first. Visit Settings > Kong Locker to register.".to_string()
            ));
        },
        Err(_) => {
            return Err(ProposalError::Custom(
                "You need LP tokens to vote. Lock liquidity at kong.land to get voting power.".to_string()
            ));
        }
    };

    if voting_power == 0 {
        return Err(ProposalError::NoVotingPower);
    }

    // 7. Record vote
    if vote {
        proposal.yes_votes += voting_power;
    } else {
        proposal.no_votes += voting_power;
    }
    proposal.voter_count += 1;

    UNIFIED_PROPOSAL_VOTES.with(|votes| {
        votes.borrow_mut().insert(
            (proposal.id, StorablePrincipal(voter)),
            if vote {
                VoteChoice::Yes
            } else {
                VoteChoice::No
            },
        );
    });

    ic_cdk::println!(
        "Vote recorded: proposal_id={:?}, voter={}, vote={}, new_yes={}, new_no={}",
        proposal.id, voter, if vote { "YES" } else { "NO" },
        proposal.yes_votes, proposal.no_votes
    );

    // 8. Check threshold (varies by operation type)
    // Recalculate total VP on each vote for security
    let current_total_vp = get_total_voting_power_for_token(token_id).await?;
    let threshold = proposal.operation_type.voting_threshold();
    let required_votes = (current_total_vp * threshold as u64) / 100;

    if proposal.yes_votes > required_votes {
        // Get station ID
        let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
            stations
                .borrow()
                .get(&StorablePrincipal(token_id))
                .map(|s| s.0)
                .ok_or(ProposalError::NoStationLinked(token_id))
        })?;

        // Single approval function
        approve_orbit_request(station_id, &proposal.orbit_request_id).await?;
        proposal.status = ProposalStatus::Executed;
        let proposal_id = proposal.id;

        // Remove from active proposals
        UNIFIED_PROPOSALS.with(|proposals| {
            proposals
                .borrow_mut()
                .remove(&(StorablePrincipal(token_id), orbit_request_id.clone()));
        });

        // Clean up all votes for this executed proposal to prevent memory leak
        UNIFIED_PROPOSAL_VOTES.with(|votes| {
            let mut votes_map = votes.borrow_mut();
            votes_map.retain(|(pid, _), _| *pid != proposal_id);
        });

        ic_cdk::println!(
            "Proposal {:?} executed! {} yes votes > {} required",
            proposal.id,
            proposal.yes_votes,
            required_votes
        );
    } else if proposal.no_votes > (current_total_vp - required_votes) {
        // Rejected - impossible to reach threshold
        let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
            stations
                .borrow()
                .get(&StorablePrincipal(token_id))
                .map(|s| s.0)
                .ok_or(ProposalError::NoStationLinked(token_id))
        })?;

        // Attempt to reject the Orbit request
        if let Err(e) = reject_orbit_request(station_id, &proposal.orbit_request_id).await {
            ic_cdk::println!("Warning: Failed to reject Orbit request: {:?}", e);
        }

        proposal.status = ProposalStatus::Rejected;
        let proposal_id = proposal.id;

        UNIFIED_PROPOSALS.with(|proposals| {
            proposals
                .borrow_mut()
                .remove(&(StorablePrincipal(token_id), orbit_request_id));
        });

        // Clean up all votes for this rejected proposal to prevent memory leak
        UNIFIED_PROPOSAL_VOTES.with(|votes| {
            let mut votes_map = votes.borrow_mut();
            votes_map.retain(|(pid, _), _| *pid != proposal_id);
        });

        ic_cdk::println!("Proposal {:?} rejected and cleaned up", proposal_id);
    } else {
        // Still active - update vote counts and refresh total VP
        proposal.total_voting_power = current_total_vp;

        UNIFIED_PROPOSALS.with(|proposals| {
            proposals.borrow_mut().insert(
                (StorablePrincipal(token_id), orbit_request_id.clone()),
                proposal.clone()
            );
        });

        ic_cdk::println!(
            "Proposal updated: id={:?}, yes={}, no={}",
            proposal.id, proposal.yes_votes, proposal.no_votes
        );
    }

    Ok(())
}

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

    // 4. Get total voting power
    let total_voting_power = get_total_voting_power_for_token(token_id).await?;

    // 5. Create unified proposal
    let operation_type = operation.to_type();
    let duration_hours = operation_type.voting_duration_hours();
    let duration_nanos = duration_hours * 3600 * 1_000_000_000;

    let proposal = UnifiedProposal {
        id: ProposalId::new(),
        token_canister_id: token_id,
        orbit_request_id: orbit_request_id.clone(),
        operation_type,
        proposer: caller,
        created_at: time(),
        expires_at: time() + duration_nanos,
        yes_votes: 0,
        no_votes: 0,
        total_voting_power,
        voter_count: 0,
        status: ProposalStatus::Active,
        transfer_details: operation.transfer_details(),
    };

    // 6. Store proposal
    UNIFIED_PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(
            (StorablePrincipal(token_id), orbit_request_id.clone()),
            proposal
        );
    });

    Ok(orbit_request_id)
}

/// Get a specific proposal
/// Note: Proposals now live in admin canister - frontend should query admin directly
/// This method returns None to indicate proposals are in admin, not backend
#[query]
pub fn get_proposal(
    _token_id: Principal,
    _orbit_request_id: String,
) -> Option<UnifiedProposal> {
    // Proposals stored in admin canister, not backend
    // Frontend should query admin canister directly for proposal data
    None
}

/// List all active proposals for a token
/// Note: Proposals now live in admin canister - frontend should query admin directly
/// This method returns empty to indicate proposals are in admin, not backend
#[query]
pub fn list_unified_proposals(_token_id: Principal) -> Vec<UnifiedProposal> {
    // Proposals stored in admin canister, not backend
    // Frontend should query admin canister directly for proposal data
    Vec::new()
}

/// Check if a user has voted on a proposal
/// Note: Proposals now live in admin canister - frontend should query admin directly
/// This method returns false to indicate data is in admin, not backend
#[query]
pub fn has_user_voted(
    _user: Principal,
    _token_id: Principal,
    _orbit_request_id: String,
) -> bool {
    // Vote data stored in admin canister, not backend
    // Frontend should query admin canister directly
    false
}

/// Get the user's vote on a proposal
/// Note: Proposals now live in admin canister - frontend should query admin directly
/// This method returns None to indicate data is in admin, not backend
#[query]
pub fn get_user_vote(
    _user: Principal,
    _token_id: Principal,
    _orbit_request_id: String,
) -> Option<VoteChoice> {
    // Vote data stored in admin canister, not backend
    // Frontend should query admin canister directly
    None
}

/// Forward proposal creation to admin canister (where voting actually happens)
/// Backend creates Orbit requests, but admin handles all voting and approvals
#[update]
pub async fn ensure_proposal_for_request(
    token_id: Principal,
    orbit_request_id: String,
    request_type_str: String,
) -> Result<ProposalId, ProposalError> {
    use crate::storage::state::ADMIN_CANISTER_ID;

    let admin_principal = ADMIN_CANISTER_ID.with(|id| {
        id.borrow()
            .ok_or(ProposalError::Custom("Admin canister not configured".to_string()))
    })?;

    let result: Result<(Result<ProposalId, ProposalError>,), _> = ic_cdk::call(
        admin_principal,
        "ensure_proposal_for_request",
        (token_id, orbit_request_id, request_type_str)
    ).await;

    match result {
        Ok((Ok(proposal_id),)) => Ok(proposal_id),
        Ok((Err(e),)) => Err(e),
        Err((code, msg)) => Err(ProposalError::IcCallFailed {
            code: code as i32,
            message: msg,
        }),
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

/// Single approval function (no duplication)
async fn approve_orbit_request(station_id: Principal, request_id: &str) -> Result<(), ProposalError> {
    use crate::api::{SubmitRequestApprovalInput, SubmitRequestApprovalResult, RequestApprovalStatus};

    let input = SubmitRequestApprovalInput {
        request_id: request_id.to_string(),
        decision: RequestApprovalStatus::Approved,
        reason: Some("Community vote passed".to_string()),
    };

    let result: Result<(SubmitRequestApprovalResult,), _> =
        ic_cdk::call(station_id, "submit_request_approval", (input,)).await;

    match result {
        Ok((SubmitRequestApprovalResult::Ok(_),)) => Ok(()),
        Ok((SubmitRequestApprovalResult::Err(e),)) => Err(ProposalError::OrbitError {
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

async fn reject_orbit_request(
    station_id: Principal,
    request_id: &str,
) -> Result<(), ProposalError> {
    use crate::api::{SubmitRequestApprovalInput, SubmitRequestApprovalResult, RequestApprovalStatus};

    let input = SubmitRequestApprovalInput {
        request_id: request_id.to_string(),
        decision: RequestApprovalStatus::Rejected,
        reason: Some("Community vote rejected".to_string()),
    };

    let result: Result<(SubmitRequestApprovalResult,), _> =
        ic_cdk::call(station_id, "submit_request_approval", (input,)).await;

    match result {
        Ok((SubmitRequestApprovalResult::Ok(_),)) => Ok(()),
        Ok((SubmitRequestApprovalResult::Err(e),)) => Err(ProposalError::OrbitError {
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

async fn get_total_voting_power_for_token(token: Principal) -> Result<u64, ProposalError> {
    let all_kong_lockers = KONG_LOCKER_PRINCIPALS.with(|principals| {
        principals
            .borrow()
            .iter()
            .map(|(_, locker)| locker.0)
            .collect::<Vec<Principal>>()
    });

    let mut total_power = 0u64;

    for kong_locker in all_kong_lockers {
        match calculate_voting_power_for_token(kong_locker, token).await {
            Ok(power) => total_power += power,
            Err(_) => continue,
        }
    }

    if total_power == 0 {
        return Err(ProposalError::ZeroVotingPower);
    }

    Ok(total_power)
}