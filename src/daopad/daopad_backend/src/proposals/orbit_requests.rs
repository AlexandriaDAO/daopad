use crate::kong_locker::voting::{
    calculate_voting_power_for_token, get_user_voting_power_for_token,
};
use crate::proposals::types::*;
use crate::storage::state::{
    KONG_LOCKER_PRINCIPALS, ORBIT_REQUEST_PROPOSALS, ORBIT_REQUEST_VOTES, TOKEN_ORBIT_STATIONS,
};
use crate::types::StorablePrincipal;
use candid::Principal;
use ic_cdk::api::time;
use ic_cdk::{query, update};

// Constants
const DEFAULT_VOTING_PERIOD_NANOS: u64 = 604_800_000_000_000; // 7 days
const DEFAULT_THRESHOLD_PERCENT: u32 = 50; // Simple majority

/// Vote on ANY Orbit request (not just treasury transfers)
/// When threshold is reached, executes immediately by approving the Orbit request.
#[update]
pub async fn vote_on_orbit_request(
    token_id: Principal,
    orbit_request_id: String,
    vote: bool,
) -> Result<(), ProposalError> {
    let voter = ic_cdk::caller();

    if voter == Principal::anonymous() {
        return Err(ProposalError::AuthRequired);
    }

    // 1. Load proposal (must exist before voting)
    let proposal = ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        proposals
            .borrow()
            .get(&(StorablePrincipal(token_id), orbit_request_id.clone()))
            .cloned()
    });

    // If no proposal exists, we can't vote (proposal must be created first)
    let mut proposal = match proposal {
        Some(p) => p,
        None => {
            return Err(ProposalError::NotFound(ProposalId(0))); // Use dummy ID for not found
        }
    };

    // 2. Guard: Active status
    if proposal.status != ProposalStatus::Active {
        return Err(ProposalError::NotActive);
    }

    // 3. Guard: Not expired
    let now = time();
    if now > proposal.expires_at {
        proposal.status = ProposalStatus::Expired;
        // Clean up expired proposal
        ORBIT_REQUEST_PROPOSALS.with(|proposals| {
            proposals
                .borrow_mut()
                .remove(&(StorablePrincipal(token_id), orbit_request_id.clone()));
        });
        return Err(ProposalError::Expired);
    }

    // 4. Guard: Haven't voted
    let has_voted = ORBIT_REQUEST_VOTES.with(|votes| {
        votes
            .borrow()
            .contains_key(&(proposal.id, StorablePrincipal(voter)))
    });

    if has_voted {
        return Err(ProposalError::AlreadyVoted(proposal.id));
    }

    // 5. Get voting power
    let voting_power = get_user_voting_power_for_token(voter, token_id)
        .await
        .map_err(|_| ProposalError::NoVotingPower)?;

    if voting_power == 0 {
        return Err(ProposalError::NoVotingPower);
    }

    // 6. Record vote
    if vote {
        proposal.yes_votes += voting_power;
    } else {
        proposal.no_votes += voting_power;
    }
    proposal.voter_count += 1;

    ORBIT_REQUEST_VOTES.with(|votes| {
        votes.borrow_mut().insert(
            (proposal.id, StorablePrincipal(voter)),
            if vote {
                VoteChoice::Yes
            } else {
                VoteChoice::No
            },
        );
    });

    // 7. Check threshold and execute atomically
    // SECURITY: Recalculate total VP on each vote to prevent stale VP vulnerability
    // Users depositing LP after proposal creation should be counted in threshold
    let current_total_vp = get_total_voting_power_for_token(token_id).await?;

    // CONSISTENCY: Match treasury.rs calculation exactly (multiplication before division)
    // This preserves precision: 12,345 * 50 / 100 = 6,172 (correct)
    // vs division first: 12,345 / 100 * 50 = 6,150 (loses 22 votes = 0.18% error)
    let required_votes = (current_total_vp * DEFAULT_THRESHOLD_PERCENT as u64) / 100;

    // POLICY: Strict majority (>) matches treasury.rs - requires MORE than 50%
    // 50/50 tie does NOT execute, remains active for more votes
    if proposal.yes_votes > required_votes {
        // Execute immediately - approve the Orbit request
        let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
            stations
                .borrow()
                .get(&StorablePrincipal(token_id))
                .map(|s| s.0)
                .ok_or(ProposalError::NoStationLinked(token_id))
        })?;

        approve_orbit_request_internal(station_id, &proposal.orbit_request_id).await?;

        proposal.status = ProposalStatus::Executed;

        // Remove from active proposals
        ORBIT_REQUEST_PROPOSALS.with(|proposals| {
            proposals
                .borrow_mut()
                .remove(&(StorablePrincipal(token_id), orbit_request_id));
        });

        ic_cdk::println!(
            "Orbit request {:?} executed! {} yes votes > {} required",
            proposal.id,
            proposal.yes_votes,
            required_votes
        );
    } else if proposal.no_votes >= (current_total_vp - required_votes) {
        // POLICY: Rejected when mathematically impossible to reach threshold
        // Matches treasury.rs:275 - uses >= for consistency
        // When no_votes >= (total - required), max possible yes = total - no_votes <= required
        let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
            stations
                .borrow()
                .get(&StorablePrincipal(token_id))
                .map(|s| s.0)
                .ok_or(ProposalError::NoStationLinked(token_id))
        })?;

        // Attempt to reject the Orbit request (log error but don't fail the vote)
        if let Err(e) = reject_orbit_request_internal(station_id, &proposal.orbit_request_id).await
        {
            ic_cdk::println!("Warning: Failed to reject Orbit request: {:?}", e);
        }

        proposal.status = ProposalStatus::Rejected;

        ORBIT_REQUEST_PROPOSALS.with(|proposals| {
            proposals
                .borrow_mut()
                .remove(&(StorablePrincipal(token_id), orbit_request_id));
        });

        ic_cdk::println!("Orbit request {:?} rejected and cleaned up", proposal.id);
    } else {
        // Still active - update vote counts and refresh total VP
        proposal.total_voting_power = current_total_vp;
        ORBIT_REQUEST_PROPOSALS.with(|proposals| {
            proposals
                .borrow_mut()
                .insert((StorablePrincipal(token_id), orbit_request_id), proposal.clone());
        });
    }

    Ok(())
}

/// Get proposal for a specific Orbit request
#[query]
pub fn get_orbit_request_proposal(
    token_id: Principal,
    orbit_request_id: String,
) -> Option<OrbitRequestProposal> {
    ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        proposals
            .borrow()
            .get(&(StorablePrincipal(token_id), orbit_request_id))
            .cloned()
    })
}

/// List all active proposals for a token
#[query]
pub fn list_orbit_request_proposals(token_id: Principal) -> Vec<OrbitRequestProposal> {
    ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        proposals
            .borrow()
            .iter()
            .filter(|((t, _), p)| t.0 == token_id && p.status == ProposalStatus::Active)
            .map(|(_, p)| p.clone())
            .collect()
    })
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

/// Auto-create proposal when a new Orbit request is detected
/// Call this whenever list_orbit_requests finds a new request without a proposal
///
/// INTEGRATION NOTE: This should be called by:
/// 1. Frontend after fetching requests (call ensure_proposals_for_requests)
/// 2. Backend hooks when requests are created (future enhancement)
/// 3. Periodic cleanup job (future enhancement)
///
/// RACE CONDITION FIX: Performs atomic check-and-insert to prevent
/// concurrent calls from creating duplicate proposals
#[update]
pub async fn ensure_proposal_for_request(
    token_id: Principal,
    orbit_request_id: String,
    request_type: OrbitRequestType,
) -> Result<ProposalId, ProposalError> {
    let caller = ic_cdk::caller();
    let now = time();

    // Get total voting power BEFORE taking the borrow
    // This avoids holding the borrow during async call
    let total_voting_power = get_total_voting_power_for_token(token_id).await?;

    // ATOMIC: Check-and-insert within single borrow scope
    // Prevents race condition where two calls both see "doesn't exist"
    ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        let mut map = proposals.borrow_mut();
        let key = (StorablePrincipal(token_id), orbit_request_id.clone());

        // If exists, return existing ID
        if let Some(existing) = map.get(&key) {
            return Ok(existing.id);
        }

        // Otherwise create new proposal atomically
        let proposal_id = ProposalId::new();
        let proposal = OrbitRequestProposal {
            id: proposal_id,
            token_canister_id: token_id,
            orbit_request_id: orbit_request_id.clone(),
            request_type,
            proposer: caller,
            created_at: now,
            expires_at: now + DEFAULT_VOTING_PERIOD_NANOS,
            yes_votes: 0,
            no_votes: 0,
            total_voting_power,
            voter_count: 0,
            status: ProposalStatus::Active,
        };

        map.insert(key, proposal);
        Ok(proposal_id)
    })
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

async fn approve_orbit_request_internal(
    station_id: Principal,
    request_id: &str,
) -> Result<(), ProposalError> {
    use crate::api::{
        RequestApprovalDecision, SubmitRequestApprovalInput, SubmitRequestApprovalResult,
    };

    let input = SubmitRequestApprovalInput {
        request_id: request_id.to_string(),
        decision: RequestApprovalDecision::Approve,
        reason: Some("DAOPad proposal approved by community vote".to_string()),
    };

    let result: Result<(SubmitRequestApprovalResult,), _> =
        ic_cdk::call(station_id, "submit_request_approval", (input,)).await;

    match result {
        Ok((SubmitRequestApprovalResult::Ok(_),)) => Ok(()),
        Ok((SubmitRequestApprovalResult::Err(e),)) => Err(ProposalError::OrbitError {
            code: e.code,
            message: e.message.unwrap_or_else(|| "No message provided".to_string()),
        }),
        Err((code, msg)) => Err(ProposalError::IcCallFailed {
            code: code as i32,
            message: msg,
        }),
    }
}

async fn reject_orbit_request_internal(
    station_id: Principal,
    request_id: &str,
) -> Result<(), ProposalError> {
    use crate::api::{
        RequestApprovalDecision, SubmitRequestApprovalInput, SubmitRequestApprovalResult,
    };

    let input = SubmitRequestApprovalInput {
        request_id: request_id.to_string(),
        decision: RequestApprovalDecision::Reject,
        reason: Some("DAOPad proposal rejected by community vote".to_string()),
    };

    let result: Result<(SubmitRequestApprovalResult,), _> =
        ic_cdk::call(station_id, "submit_request_approval", (input,)).await;

    match result {
        Ok((SubmitRequestApprovalResult::Ok(_),)) => Ok(()),
        Ok((SubmitRequestApprovalResult::Err(e),)) => Err(ProposalError::OrbitError {
            code: e.code,
            message: e.message.unwrap_or_else(|| "No message provided".to_string()),
        }),
        Err((code, msg)) => Err(ProposalError::IcCallFailed {
            code: code as i32,
            message: msg,
        }),
    }
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
