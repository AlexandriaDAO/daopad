use crate::kong_locker::voting::{
    calculate_voting_power_for_token, get_user_voting_power_for_token,
};
use crate::proposals::types::*;
use crate::storage::state::{
    KONG_LOCKER_PRINCIPALS, TOKEN_ORBIT_STATIONS,
    ORBIT_REQUEST_VOTES, ORBIT_REQUEST_VOTE_SUMMARIES, ORBIT_REQUEST_PROPOSALS,
};
use crate::types::StorablePrincipal;
use candid::Principal;
use ic_cdk::api::time;
use ic_cdk::{query, update};
use std::collections::HashMap;

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

/// Vote on ANY Orbit request
#[update]
pub async fn vote_on_orbit_request(
    token_id: Principal,
    orbit_request_id: String,
    vote: bool,
) -> Result<(), ProposalError> {
    let caller = ic_cdk::caller();

    // Get user's voting power for this token
    let voting_power = get_user_voting_power_for_token(caller, token_id).await
        .map_err(|e| ProposalError::Custom(format!("Failed to get voting power: {}", e)))?;

    if voting_power == 0 {
        return Err(ProposalError::NoVotingPower);
    }

    // Check if user has already voted
    let vote_key = (token_id, orbit_request_id.clone());
    let already_voted = ORBIT_REQUEST_VOTES.with(|votes| {
        votes.borrow()
            .get(&vote_key)
            .map(|vote_map| vote_map.contains_key(&caller))
            .unwrap_or(false)
    });

    if already_voted {
        return Err(ProposalError::Custom("Already voted on this request".to_string()));
    }

    // Record the vote
    let vote_choice = if vote { VoteChoice::Yes } else { VoteChoice::No };

    ORBIT_REQUEST_VOTES.with(|votes| {
        let mut votes_mut = votes.borrow_mut();
        let vote_map = votes_mut.entry(vote_key.clone()).or_insert_with(HashMap::new);
        vote_map.insert(caller, vote_choice.clone());
    });

    // Update vote summary
    ORBIT_REQUEST_VOTE_SUMMARIES.with(|summaries| {
        let mut summaries_mut = summaries.borrow_mut();
        let (yes_votes, no_votes, _total_power) = summaries_mut.entry(vote_key.clone()).or_insert((0, 0, 0));

        if vote {
            *yes_votes += voting_power;
        } else {
            *no_votes += voting_power;
        }
    });

    // Also update the proposal if it exists to keep vote counts in sync
    ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        let mut proposals_mut = proposals.borrow_mut();
        if let Some(proposal) = proposals_mut.get_mut(&vote_key) {
            if vote {
                proposal.yes_votes += voting_power;
            } else {
                proposal.no_votes += voting_power;
            }
            proposal.voter_count += 1;
        }
    });

    // TODO: Re-enable automatic execution once backend has proper permissions in Orbit
    // For now, just record the vote and let manual execution happen
    // check_and_execute_orbit_request(token_id, &orbit_request_id).await?;

    Ok(())
}
#[query]
pub fn get_orbit_request_proposal(
    token_id: Principal,
    orbit_request_id: String,
) -> Option<OrbitRequestProposal> {
    let key = (token_id, orbit_request_id.clone());

    // Get proposal metadata if it exists
    ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        proposals.borrow().get(&key).cloned()
    }).or_else(|| {
        // If no proposal exists yet, create a minimal one from vote summaries
        ORBIT_REQUEST_VOTE_SUMMARIES.with(|summaries| {
            summaries.borrow().get(&key).map(|(yes_votes, no_votes, total_voting_power)| {
                // Calculate voter count from actual votes
                let voter_count = ORBIT_REQUEST_VOTES.with(|votes| {
                    votes.borrow()
                        .get(&key)
                        .map(|vote_map| vote_map.len() as u32)
                        .unwrap_or(0)
                });

                OrbitRequestProposal {
                    id: ProposalId(0), // Dummy ID
                    token_canister_id: token_id,
                    orbit_request_id,
                    request_type: OrbitRequestType::Other("Unknown".to_string()),
                    proposer: Principal::anonymous(),
                    created_at: time(),
                    expires_at: time() + DEFAULT_VOTING_PERIOD_NANOS,
                    yes_votes: *yes_votes,
                    no_votes: *no_votes,
                    total_voting_power: *total_voting_power,
                    voter_count,
                    status: ProposalStatus::Active,
                }
            })
        })
    })
}

/// Check if a user has voted on an Orbit request proposal
#[query]
pub fn has_user_voted_on_orbit_request(
    user: Principal,
    token_id: Principal,
    orbit_request_id: String,
) -> bool {
    let key = (token_id, orbit_request_id);
    ORBIT_REQUEST_VOTES.with(|votes| {
        votes.borrow()
            .get(&key)
            .map(|vote_map| vote_map.contains_key(&user))
            .unwrap_or(false)
    })
}

/// Get the user's vote on an Orbit request (for UI display)
#[query]
pub fn get_user_vote_on_orbit_request(
    user: Principal,
    token_id: Principal,
    orbit_request_id: String,
) -> Option<VoteChoice> {
    let key = (token_id, orbit_request_id);
    ORBIT_REQUEST_VOTES.with(|votes| {
        votes.borrow()
            .get(&key)
            .and_then(|vote_map| vote_map.get(&user).cloned())
    })
}

#[query]
pub fn list_orbit_request_proposals(_token_id: Principal) -> Vec<OrbitRequestProposal> {
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
#[update]
pub async fn ensure_proposal_for_request(
    token_id: Principal,
    orbit_request_id: String,
    request_type: OrbitRequestType,
) -> Result<ProposalId, ProposalError> {
    let key = (token_id, orbit_request_id.clone());

    // Check if proposal already exists
    let exists = ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        proposals.borrow().contains_key(&key)
    });

    if exists {
        // Return existing proposal ID
        return ORBIT_REQUEST_PROPOSALS.with(|proposals| {
            proposals.borrow().get(&key).map(|p| p.id).ok_or(ProposalError::Custom("Proposal exists but couldn't retrieve ID".to_string()))
        });
    }

    // Get total voting power for this token
    let total_voting_power = get_total_voting_power_for_token(token_id).await
        .unwrap_or(0); // Default to 0 if we can't calculate

    // Create new proposal
    let proposal = OrbitRequestProposal {
        id: ProposalId::new(),
        token_canister_id: token_id,
        orbit_request_id: orbit_request_id.clone(),
        request_type,
        proposer: ic_cdk::caller(),
        created_at: time(),
        expires_at: time() + DEFAULT_VOTING_PERIOD_NANOS,
        yes_votes: 0,
        no_votes: 0,
        total_voting_power,
        voter_count: 0,
        status: ProposalStatus::Active,
    };

    let proposal_id = proposal.id;

    // Store the proposal
    ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(key.clone(), proposal);
    });

    // Initialize vote summary
    ORBIT_REQUEST_VOTE_SUMMARIES.with(|summaries| {
        summaries.borrow_mut().insert(key, (0, 0, total_voting_power));
    });

    Ok(proposal_id)
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

/// Check if voting threshold is reached and execute the Orbit request
async fn check_and_execute_orbit_request(
    token_id: Principal,
    orbit_request_id: &str,
) -> Result<(), ProposalError> {
    let key = (token_id, orbit_request_id.to_string());

    // Get vote summary
    let (yes_votes, no_votes, total_voting_power) = ORBIT_REQUEST_VOTE_SUMMARIES.with(|summaries| {
        summaries.borrow().get(&key).cloned().unwrap_or((0, 0, 0))
    });

    // If no total voting power set, calculate it
    let total_voting_power = if total_voting_power == 0 {
        get_total_voting_power_for_token(token_id).await?
    } else {
        total_voting_power
    };

    // Update total voting power in summary
    ORBIT_REQUEST_VOTE_SUMMARIES.with(|summaries| {
        let mut summaries_mut = summaries.borrow_mut();
        if let Some(summary) = summaries_mut.get_mut(&key) {
            summary.2 = total_voting_power;
        }
    });

    // Check if threshold is reached (50% default)
    let threshold_percentage = DEFAULT_THRESHOLD_PERCENT;
    let required_votes = (total_voting_power * threshold_percentage as u64) / 100;

    if yes_votes >= required_votes {
        // Get Orbit station for this token
        let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
            stations.borrow()
                .get(&StorablePrincipal(token_id))
                .map(|sp| sp.0)
        }).ok_or(ProposalError::NoStationLinked(token_id))?;

        // Approve the request in Orbit
        approve_orbit_request_internal(station_id, orbit_request_id).await?;

        // Mark proposal as executed
        ORBIT_REQUEST_PROPOSALS.with(|proposals| {
            let mut proposals_mut = proposals.borrow_mut();
            if let Some(proposal) = proposals_mut.get_mut(&key) {
                proposal.status = ProposalStatus::Executed;
            }
        });
    } else if no_votes > (total_voting_power - required_votes) {
        // If it's impossible for yes votes to win, reject
        let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
            stations.borrow()
                .get(&StorablePrincipal(token_id))
                .map(|sp| sp.0)
        }).ok_or(ProposalError::NoStationLinked(token_id))?;

        // Reject the request in Orbit
        reject_orbit_request_internal(station_id, orbit_request_id).await?;

        // Mark proposal as rejected
        ORBIT_REQUEST_PROPOSALS.with(|proposals| {
            let mut proposals_mut = proposals.borrow_mut();
            if let Some(proposal) = proposals_mut.get_mut(&key) {
                proposal.status = ProposalStatus::Rejected;
            }
        });
    }

    Ok(())
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
