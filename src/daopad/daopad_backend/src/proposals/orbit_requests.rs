use crate::kong_locker::voting::{
    calculate_voting_power_for_token, get_user_voting_power_for_token,
};
use crate::proposals::types::*;
use crate::storage::state::{
    KONG_LOCKER_PRINCIPALS, TOKEN_ORBIT_STATIONS,
};
use crate::types::StorablePrincipal;
use candid::Principal;
use ic_cdk::api::time;
use ic_cdk::{query, update};

// Constants
const DEFAULT_VOTING_PERIOD_NANOS: u64 = 604_800_000_000_000; // 7 days
const DEFAULT_THRESHOLD_PERCENT: u32 = 50; // Simple majority

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

/// Vote on ANY Orbit request (not just treasury transfers)
/// NOTE: Voting is handled by admin canister, not backend
#[update]
pub async fn vote_on_orbit_request(
    _token_id: Principal,
    _orbit_request_id: String,
    _vote: bool,
) -> Result<(), ProposalError> {
    // Voting is handled by admin canister
    // Frontend should call admin canister's vote_on_proposal directly
    Err(ProposalError::Custom(
        "Voting is handled by admin canister. Frontend should call admin directly.".to_string()
    ))
}
#[query]
pub fn get_orbit_request_proposal(
    _token_id: Principal,
    _orbit_request_id: String,
) -> Option<OrbitRequestProposal> {
    // Proposals stored in Orbit Station, not backend
    // Frontend should query Orbit directly for request details
    None
}

/// Check if a user has voted on an Orbit request proposal
/// NOTE: Vote tracking happens in admin canister, not backend
#[query]
pub fn has_user_voted_on_orbit_request(
    _user: Principal,
    _token_id: Principal,
    _orbit_request_id: String,
) -> bool {
    // Vote tracking happens in admin canister
    // Frontend should query admin directly for vote status
    false
}

/// Get the user's vote on an Orbit request (for UI display)
/// NOTE: Vote tracking happens in admin canister, not backend
#[query]
pub fn get_user_vote_on_orbit_request(
    _user: Principal,
    _token_id: Principal,
    _orbit_request_id: String,
) -> Option<VoteChoice> {
    // Vote tracking happens in admin canister
    // Frontend should query admin directly for vote details
    None
}

/// List all active proposals for a token
/// NOTE: Proposals are stored in Orbit Station, not backend
#[query]
pub fn list_orbit_request_proposals(_token_id: Principal) -> Vec<OrbitRequestProposal> {
    // Proposals stored in Orbit Station, not backend
    // Frontend should query Orbit directly for active requests
    Vec::new()
}

/// Auto-create proposals for multiple requests (bulk operation)
/// Used by list_orbit_requests to ensure all requests have proposals
#[update]
pub async fn ensure_proposals_for_requests(
    token_id: Principal,
    requests: Vec<(String, String)>, // (request_id, operation_type)
) -> Vec<Result<ProposalId, String>> {
    let mut results = Vec::new();

    for (request_id, operation_type) in requests {
        let request_type = infer_request_type(&operation_type);
        match ensure_proposal_for_request(token_id, request_id, request_type).await {
            Ok(proposal_id) => results.push(Ok(proposal_id)),
            Err(e) => results.push(Err(format!("{:?}", e))),
        }
    }

    results
}

/// Ensure a proposal exists for an Orbit request
/// NOTE: This is a NO-OP - we don't store proposals, Orbit does!
/// The admin canister handles vote tracking when users vote
#[update]
pub async fn ensure_proposal_for_request(
    _token_id: Principal,
    _orbit_request_id: String,
    _request_type: OrbitRequestType,
) -> Result<ProposalId, ProposalError> {
    // Proposals are stored in Orbit Station, not here
    // Admin canister will handle vote tracking when users vote
    // Return a dummy ID to satisfy frontend expectations
    Ok(ProposalId(0))
}

// ============================================================================
// Internal helper functions
// ============================================================================

/// Infer request type from Orbit operation type string
/// Maps all 33 Orbit operation types to typed enum variants
pub fn infer_request_type(operation_type: &str) -> OrbitRequestType {
    match operation_type {
        // Treasury
        "Transfer" => OrbitRequestType::Transfer,
        "AddAccount" => OrbitRequestType::AddAccount,
        "EditAccount" => OrbitRequestType::EditAccount,

        // Users
        "AddUser" => OrbitRequestType::AddUser,
        "EditUser" => OrbitRequestType::EditUser,
        "RemoveUser" => OrbitRequestType::RemoveUser,

        // Groups
        "AddUserGroup" => OrbitRequestType::AddUserGroup,
        "EditUserGroup" => OrbitRequestType::EditUserGroup,
        "RemoveUserGroup" => OrbitRequestType::RemoveUserGroup,

        // Canisters
        "CreateExternalCanister" => OrbitRequestType::CreateExternalCanister,
        "ConfigureExternalCanister" => OrbitRequestType::ConfigureExternalCanister,
        "ChangeExternalCanister" => OrbitRequestType::ChangeExternalCanister,
        "CallExternalCanister" => OrbitRequestType::CallExternalCanister,
        "FundExternalCanister" => OrbitRequestType::FundExternalCanister,
        "MonitorExternalCanister" => OrbitRequestType::MonitorExternalCanister,
        "SnapshotExternalCanister" => OrbitRequestType::SnapshotExternalCanister,
        "RestoreExternalCanister" => OrbitRequestType::RestoreExternalCanister,
        "PruneExternalCanister" => OrbitRequestType::PruneExternalCanister,

        // System
        "SystemUpgrade" => OrbitRequestType::SystemUpgrade,
        "SystemRestore" => OrbitRequestType::SystemRestore,
        "SetDisasterRecovery" => OrbitRequestType::SetDisasterRecovery,
        "ManageSystemInfo" => OrbitRequestType::ManageSystemInfo,

        // Governance
        "EditPermission" => OrbitRequestType::EditPermission,
        "AddRequestPolicy" => OrbitRequestType::AddRequestPolicy,
        "EditRequestPolicy" => OrbitRequestType::EditRequestPolicy,
        "RemoveRequestPolicy" => OrbitRequestType::RemoveRequestPolicy,

        // Assets
        "AddAsset" => OrbitRequestType::AddAsset,
        "EditAsset" => OrbitRequestType::EditAsset,
        "RemoveAsset" => OrbitRequestType::RemoveAsset,

        // Rules
        "AddNamedRule" => OrbitRequestType::AddNamedRule,
        "EditNamedRule" => OrbitRequestType::EditNamedRule,
        "RemoveNamedRule" => OrbitRequestType::RemoveNamedRule,

        // Address Book
        "AddAddressBookEntry" => OrbitRequestType::AddAddressBookEntry,
        "EditAddressBookEntry" => OrbitRequestType::EditAddressBookEntry,
        "RemoveAddressBookEntry" => OrbitRequestType::RemoveAddressBookEntry,

        // Unknown
        _ => OrbitRequestType::Other(operation_type.to_string()),
    }
}

/// Consolidated helper for submitting Orbit request approval decisions
async fn submit_orbit_request_decision(
    station_id: Principal,
    request_id: &str,
    decision: crate::api::RequestApprovalStatus,
    reason: String,
) -> Result<(), ProposalError> {
    use crate::api::{SubmitRequestApprovalInput, SubmitRequestApprovalResult};

    let input = SubmitRequestApprovalInput {
        request_id: request_id.to_string(),
        decision,
        reason: Some(reason),
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

async fn approve_orbit_request_internal(
    station_id: Principal,
    request_id: &str,
) -> Result<(), ProposalError> {
    submit_orbit_request_decision(
        station_id,
        request_id,
        crate::api::RequestApprovalStatus::Approved,
        "DAOPad proposal approved by community vote".to_string(),
    )
    .await
}

async fn reject_orbit_request_internal(
    station_id: Principal,
    request_id: &str,
) -> Result<(), ProposalError> {
    submit_orbit_request_decision(
        station_id,
        request_id,
        crate::api::RequestApprovalStatus::Rejected,
        "DAOPad proposal rejected by community vote".to_string(),
    )
    .await
}

async fn get_total_voting_power_for_token(token: Principal) -> Result<u64, ProposalError> {
    // Get all registered Kong Locker principals
    let all_kong_lockers = KONG_LOCKER_PRINCIPALS.with(|principals| {
        principals
            .borrow()
            .iter()
            .map(|(_, locker)| locker.0)
            .collect::<Vec<Principal>>()
    });

    // Calculate total voting power across all registered users
    let mut total_power = 0u64;

    for kong_locker in all_kong_lockers {
        // Get voting power for this specific token
        match calculate_voting_power_for_token(kong_locker, token).await {
            Ok(power) => total_power += power,
            Err(_) => {
                // Skip users with errors (e.g., no LP positions)
                continue;
            }
        }
    }

    if total_power == 0 {
        return Err(ProposalError::ZeroVotingPower);
    }

    Ok(total_power)
}
