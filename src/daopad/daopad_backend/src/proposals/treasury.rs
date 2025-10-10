use crate::kong_locker::voting::{
    calculate_voting_power_for_token, get_user_voting_power_for_token,
};
use crate::proposals::types::*;
use crate::storage::state::{
    KONG_LOCKER_PRINCIPALS, PROPOSAL_VOTES, TOKEN_ORBIT_STATIONS, TREASURY_PROPOSALS,
};
use crate::types::StorablePrincipal;
use candid::{CandidType, Deserialize, Nat, Principal};
use ic_cdk::api::time;
use ic_cdk::{query, update};

// Constants
const MINIMUM_VP_FOR_PROPOSAL: u64 = 10_000; // Same as orbit link proposals
const DEFAULT_VOTING_PERIOD_NANOS: u64 = 604_800_000_000_000; // 7 days
const DEFAULT_THRESHOLD_PERCENT: u32 = 50; // Simple majority

/// Details for a transfer request
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TransferDetails {
    pub from_account_id: String, // UUID from Orbit account
    pub from_asset_id: String,   // UUID from Orbit asset
    pub to: String,              // Destination address
    pub amount: Nat,             // Amount in smallest units
    pub memo: Option<String>,
}

/// Create a treasury transfer proposal
///
/// This creates:
/// 1. An Orbit request (in pending state)
/// 2. A DAOPad proposal for voting
///
/// Users vote on the DAOPad proposal, and when threshold is reached,
/// the backend approves the Orbit request.
#[update]
pub async fn create_treasury_transfer_proposal(
    token_canister_id: Principal,
    transfer_details: TransferDetails,
) -> Result<ProposalId, ProposalError> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err(ProposalError::AuthRequired);
    }

    // 1. Check minimum voting power requirement
    let proposer_power = get_user_voting_power_for_token(caller, token_canister_id)
        .await
        .map_err(|_| ProposalError::NoVotingPower)?;

    if proposer_power < MINIMUM_VP_FOR_PROPOSAL {
        return Err(ProposalError::InsufficientVotingPowerToPropose {
            current: proposer_power,
            required: MINIMUM_VP_FOR_PROPOSAL,
        });
    }

    // 2. Get station ID
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or(ProposalError::NoStationLinked(token_canister_id))
    })?;

    // 3. Create transfer request in Orbit (status: pending approval)
    let orbit_request_id = create_transfer_request_in_orbit(station_id, transfer_details).await?;

    // 4. Get total voting power
    let total_voting_power = get_total_voting_power_for_token(token_canister_id).await?;

    // 5. Create DAOPad proposal
    let proposal_id = ProposalId::new();
    let now = time();

    let proposal = TreasuryProposal {
        id: proposal_id,
        token_canister_id,
        orbit_request_id,
        proposal_type: ProposalType::Transfer,
        proposer: caller,
        created_at: now,
        expires_at: now + DEFAULT_VOTING_PERIOD_NANOS,
        yes_votes: 0,
        no_votes: 0,
        total_voting_power,
        voter_count: 0,
        status: ProposalStatus::Active,
    };

    // 6. Store proposal
    TREASURY_PROPOSALS.with(|proposals| {
        proposals
            .borrow_mut()
            .insert(StorablePrincipal(token_canister_id), proposal);
    });

    Ok(proposal_id)
}

/// Vote on a treasury proposal
///
/// When threshold is reached, executes immediately by approving the Orbit request.
/// Follows the same pattern as orbit_link.rs vote_on_proposal.
#[update]
pub async fn vote_on_treasury_proposal(
    proposal_id: ProposalId,
    vote: bool,
) -> Result<(), ProposalError> {
    let voter = ic_cdk::caller();

    if voter == Principal::anonymous() {
        return Err(ProposalError::AuthRequired);
    }

    // 1. Load proposal
    let (token_id, mut proposal) = TREASURY_PROPOSALS.with(|proposals| {
        proposals
            .borrow()
            .iter()
            .find(|(_, p)| p.id == proposal_id)
            .map(|(k, v)| (k.0, v.clone()))
            .ok_or(ProposalError::NotFound(proposal_id))
    })?;

    // 2. Guard: Active status
    if proposal.status != ProposalStatus::Active {
        return Err(ProposalError::NotActive);
    }

    // 3. Guard: Not expired
    let now = time();
    if now > proposal.expires_at {
        proposal.status = ProposalStatus::Expired;
        TREASURY_PROPOSALS.with(|proposals| {
            proposals
                .borrow_mut()
                .remove(&StorablePrincipal(token_id));
        });
        return Err(ProposalError::Expired);
    }

    // 4. Guard: Haven't voted
    let has_voted = PROPOSAL_VOTES.with(|votes| {
        votes
            .borrow()
            .contains_key(&(proposal_id, StorablePrincipal(voter)))
    });

    if has_voted {
        return Err(ProposalError::AlreadyVoted(proposal_id));
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

    PROPOSAL_VOTES.with(|votes| {
        votes.borrow_mut().insert(
            (proposal_id, StorablePrincipal(voter)),
            if vote {
                VoteChoice::Yes
            } else {
                VoteChoice::No
            },
        );
    });

    // 7. Check threshold and execute atomically
    let required_votes = (proposal.total_voting_power * DEFAULT_THRESHOLD_PERCENT as u64) / 100;

    if proposal.yes_votes > required_votes {
        // Execute immediately - approve the Orbit request
        let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
            stations
                .borrow()
                .get(&StorablePrincipal(token_id))
                .map(|s| s.0)
                .ok_or(ProposalError::NoStationLinked(token_id))
        })?;

        approve_orbit_request(station_id, &proposal.orbit_request_id).await?;

        proposal.status = ProposalStatus::Executed;

        // Remove from active proposals
        TREASURY_PROPOSALS.with(|proposals| {
            proposals
                .borrow_mut()
                .remove(&StorablePrincipal(token_id));
        });

        ic_cdk::println!(
            "Proposal {:?} executed! {} yes votes > {} required",
            proposal_id,
            proposal.yes_votes,
            required_votes
        );
    } else if proposal.no_votes >= (proposal.total_voting_power - required_votes) {
        // Rejected - impossible to reach threshold even if all remaining votes are YES
        // When no_votes >= (total - required), max possible yes = total - no_votes <= required
        proposal.status = ProposalStatus::Rejected;

        TREASURY_PROPOSALS.with(|proposals| {
            proposals
                .borrow_mut()
                .remove(&StorablePrincipal(token_id));
        });

        ic_cdk::println!("Proposal {:?} rejected", proposal_id);
    } else {
        // Still active - update vote counts
        TREASURY_PROPOSALS.with(|proposals| {
            proposals
                .borrow_mut()
                .insert(StorablePrincipal(token_id), proposal);
        });
    }

    Ok(())
}

/// Get active proposal for a token (if any)
#[query]
pub fn get_treasury_proposal(token_id: Principal) -> Option<TreasuryProposal> {
    TREASURY_PROPOSALS.with(|proposals| {
        proposals
            .borrow()
            .get(&StorablePrincipal(token_id))
            .cloned()
    })
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

    // Create the transfer operation input
    let transfer_op = TransferOperationInput {
        from_account_id: details.from_account_id,
        from_asset_id: details.from_asset_id,
        with_standard: "icrc1".to_string(), // Default to icrc1
        to: details.to,
        amount: details.amount,
        fee: None, // Let Orbit calculate the fee
        metadata: if let Some(m) = details.memo {
            vec![TransferMetadata {
                key: "memo".to_string(),
                value: m,
            }]
        } else {
            vec![]
        },
        network: None, // Use default network
    };

    // Create the request input using SubmitRequestInput
    let request_input = SubmitRequestInput {
        operation: RequestOperation::Transfer(transfer_op),
        title: Some("DAOPad Treasury Transfer".to_string()),
        summary: Some("Community-voted treasury transfer".to_string()),
        execution_plan: None, // Let Orbit handle execution scheduling based on policies
    };

    // Call Orbit Station to create the request
    let result: Result<(CreateRequestResult,), _> =
        ic_cdk::call(station_id, "create_request", (request_input,)).await;

    match result {
        Ok((CreateRequestResult::Ok(response),)) => Ok(response.request.id),
        Ok((CreateRequestResult::Err(e),)) => Err(ProposalError::OrbitError {
            code: e.code,
            message: e.message,
        }),
        Err((code, msg)) => Err(ProposalError::IcCallFailed {
            code: code as i32,
            message: msg,
        }),
    }
}

async fn approve_orbit_request(
    station_id: Principal,
    request_id: &str,
) -> Result<(), ProposalError> {
    use crate::api::{
        RequestApprovalDecision, SubmitRequestApprovalInput, SubmitRequestApprovalResult,
    };

    let input = SubmitRequestApprovalInput {
        request_id: request_id.to_string(),
        decision: RequestApprovalDecision::Approve,
        reason: Some("DAOPad treasury proposal approved by community vote".to_string()),
    };

    let result: Result<(SubmitRequestApprovalResult,), _> =
        ic_cdk::call(station_id, "submit_request_approval", (input,)).await;

    match result {
        Ok((SubmitRequestApprovalResult::Ok(_),)) => Ok(()),
        Ok((SubmitRequestApprovalResult::Err(e),)) => Err(ProposalError::OrbitError {
            code: e.code,
            message: e.message,
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
        return Err(ProposalError::NoVotingPower);
    }

    Ok(total_power)
}
