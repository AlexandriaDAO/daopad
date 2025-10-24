// Unified voting system for ALL Orbit operations
// Admin canister version - handles voting and approval only

use crate::kong_locker::voting::{
    calculate_voting_power_for_token, get_user_voting_power_for_token,
};
use crate::storage::state::{
    KONG_LOCKER_PRINCIPALS, TOKEN_ORBIT_STATIONS, UNIFIED_PROPOSALS, UNIFIED_PROPOSAL_VOTES,
};
use crate::types::StorablePrincipal;
use crate::proposals::types::{
    ProposalId, ProposalError, ProposalStatus, VoteChoice, UnifiedProposal, OrbitOperationType,
};
use candid::Principal;
use ic_cdk::api::time;
use ic_cdk::{query, update};

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

        // Clean up all votes for this expired proposal
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
                "You need to register with Kong Locker first.".to_string()
            ));
        },
        Err(_) => {
            return Err(ProposalError::Custom(
                "You need LP tokens to vote.".to_string()
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
            if vote { VoteChoice::Yes } else { VoteChoice::No },
        );
    });

    // 8. Check threshold
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

        // Approve in Orbit
        approve_orbit_request(station_id, &proposal.orbit_request_id).await?;
        proposal.status = ProposalStatus::Executed;
        let proposal_id = proposal.id;

        // Remove from active proposals
        UNIFIED_PROPOSALS.with(|proposals| {
            proposals
                .borrow_mut()
                .remove(&(StorablePrincipal(token_id), orbit_request_id.clone()));
        });

        // Clean up votes
        UNIFIED_PROPOSAL_VOTES.with(|votes| {
            let mut votes_map = votes.borrow_mut();
            votes_map.retain(|(pid, _), _| *pid != proposal_id);
        });
    } else if proposal.no_votes > (current_total_vp - required_votes) {
        // Rejected - impossible to reach threshold
        let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
            stations
                .borrow()
                .get(&StorablePrincipal(token_id))
                .map(|s| s.0)
                .ok_or(ProposalError::NoStationLinked(token_id))
        })?;

        // Reject in Orbit
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

        // Clean up votes
        UNIFIED_PROPOSAL_VOTES.with(|votes| {
            let mut votes_map = votes.borrow_mut();
            votes_map.retain(|(pid, _), _| *pid != proposal_id);
        });
    } else {
        // Still active - update vote counts
        proposal.total_voting_power = current_total_vp;

        UNIFIED_PROPOSALS.with(|proposals| {
            proposals.borrow_mut().insert(
                (StorablePrincipal(token_id), orbit_request_id.clone()),
                proposal.clone()
            );
        });
    }

    Ok(())
}

/// Get a specific proposal
#[query]
pub fn get_proposal(
    token_id: Principal,
    orbit_request_id: String,
) -> Option<UnifiedProposal> {
    UNIFIED_PROPOSALS.with(|proposals| {
        proposals
            .borrow()
            .get(&(StorablePrincipal(token_id), orbit_request_id))
            .cloned()
    })
}

/// List all active proposals for a token
#[query]
pub fn list_unified_proposals(token_id: Principal) -> Vec<UnifiedProposal> {
    UNIFIED_PROPOSALS.with(|proposals| {
        proposals
            .borrow()
            .iter()
            .filter(|((t, _), p)| t.0 == token_id && p.status == ProposalStatus::Active)
            .map(|(_, p)| p.clone())
            .collect()
    })
}

/// Check if a user has voted on a proposal
#[query]
pub fn has_user_voted(
    user: Principal,
    token_id: Principal,
    orbit_request_id: String,
) -> bool {
    let proposal = UNIFIED_PROPOSALS.with(|proposals| {
        proposals
            .borrow()
            .get(&(StorablePrincipal(token_id), orbit_request_id))
            .cloned()
    });

    if let Some(p) = proposal {
        UNIFIED_PROPOSAL_VOTES.with(|votes| {
            votes.borrow().contains_key(&(p.id, StorablePrincipal(user)))
        })
    } else {
        false
    }
}

/// Get the user's vote on a proposal
#[query]
pub fn get_user_vote(
    user: Principal,
    token_id: Principal,
    orbit_request_id: String,
) -> Option<VoteChoice> {
    let proposal = UNIFIED_PROPOSALS.with(|proposals| {
        proposals
            .borrow()
            .get(&(StorablePrincipal(token_id), orbit_request_id))
            .cloned()
    })?;

    UNIFIED_PROPOSAL_VOTES.with(|votes| {
        votes.borrow().get(&(proposal.id, StorablePrincipal(user))).cloned()
    })
}

/// Ensure a proposal exists for an Orbit request
#[update]
pub async fn ensure_proposal_for_request(
    token_id: Principal,
    orbit_request_id: String,
    request_type_str: String,
) -> Result<ProposalId, ProposalError> {
    let caller = ic_cdk::caller();
    let now = time();

    // Get total voting power BEFORE taking the borrow
    let total_voting_power = get_total_voting_power_for_token(token_id).await?;

    // ATOMIC: Check-and-insert within single borrow scope
    UNIFIED_PROPOSALS.with(|proposals| {
        let mut map = proposals.borrow_mut();
        let key = (StorablePrincipal(token_id), orbit_request_id.clone());

        // If exists, return existing ID
        if let Some(existing) = map.get(&key) {
            return Ok(existing.id);
        }

        // Otherwise create new proposal atomically
        let proposal_id = ProposalId::new();
        let operation_type = OrbitOperationType::from_string(&request_type_str);
        let duration_hours = operation_type.voting_duration_hours();
        let duration_nanos = duration_hours * 3600 * 1_000_000_000;

        let proposal = UnifiedProposal {
            id: proposal_id,
            token_canister_id: token_id,
            orbit_request_id: orbit_request_id.clone(),
            operation_type,
            proposer: caller,
            created_at: now,
            expires_at: now + duration_nanos,
            yes_votes: 0,
            no_votes: 0,
            total_voting_power,
            voter_count: 0,
            status: ProposalStatus::Active,
            transfer_details: None,
        };

        map.insert(key, proposal);
        Ok(proposal_id)
    })
}

// ============================================================================
// Internal helper functions
// ============================================================================

/// Approve a request in Orbit Station
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
            details: e.details.as_ref().map(|d| {
                d.iter()
                    .map(|(k, v)| format!("{}: {}", k, v))
                    .collect::<Vec<_>>()
                    .join(", ")
            }),
        }),
        Err((code, msg)) => Err(ProposalError::IcCallFailed {
            code: code as i32,
            message: msg,
        }),
    }
}

/// Reject a request in Orbit Station
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
            details: e.details.as_ref().map(|d| {
                d.iter()
                    .map(|(k, v)| format!("{}: {}", k, v))
                    .collect::<Vec<_>>()
                    .join(", ")
            }),
        }),
        Err((code, msg)) => Err(ProposalError::IcCallFailed {
            code: code as i32,
            message: msg,
        }),
    }
}

/// Get total voting power for all registered users for a given token
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
