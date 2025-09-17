use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::time;
use std::collections::BTreeSet;
use crate::storage::state::{TOKEN_ORBIT_STATIONS, ORBIT_PROPOSALS};
use crate::types::StorablePrincipal;
use crate::kong_locker::voting::get_user_voting_power_for_token;

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct OrbitLinkProposal {
    pub id: u64,
    pub token_canister_id: Principal,
    pub station_id: Principal,
    pub proposer: Principal,
    pub created_at: u64,
    pub expires_at: u64,  // 7 days from creation
    pub yes_votes: u64,   // Weighted by voting power
    pub no_votes: u64,    // Weighted by voting power
    pub total_voting_power: u64,  // Total VP for this token
    pub voters: BTreeSet<Principal>,
    pub status: ProposalStatus,
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum ProposalStatus {
    Active,
    Approved,
    Rejected,
    Expired,
}

pub async fn propose_orbit_link(
    token_canister_id: Principal,
    station_id: Principal,
) -> Result<u64, String> {
    let proposer = ic_cdk::caller();

    if proposer == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    // 1. Check minimum voting power requirement for proposal creation
    const MINIMUM_VP_FOR_PROPOSAL: u64 = 10_000; // Same as station creation threshold
    let proposer_power = get_user_voting_power_for_token(proposer, token_canister_id).await?;

    if proposer_power < MINIMUM_VP_FOR_PROPOSAL {
        return Err(format!(
            "Insufficient voting power to create proposal. You have {} VP but need at least {} VP",
            proposer_power,
            MINIMUM_VP_FOR_PROPOSAL
        ));
    }

    // 2. Check no existing station for token in TOKEN_ORBIT_STATIONS
    if TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow().contains_key(&StorablePrincipal(token_canister_id))
    }) {
        return Err("An Orbit Station is already linked to this token".to_string());
    }

    // 3. Check no active proposal for token in ORBIT_PROPOSALS
    if ORBIT_PROPOSALS.with(|proposals| {
        proposals.borrow().contains_key(&StorablePrincipal(token_canister_id))
    }) {
        return Err("An active proposal already exists for this token".to_string());
    }

    // 4. Verify DAOPad backend is admin of station (cross-canister call)
    verify_backend_is_admin(station_id).await?;

    // 5. Get total voting power for token from Kong Locker
    let total_voting_power = get_total_voting_power_for_token(token_canister_id).await?;

    if total_voting_power == 0 {
        return Err("No voting power exists for this token".to_string());
    }

    // 6. Create proposal with 7-day expiry
    let proposal_id = generate_proposal_id();
    let now = time();
    let seven_days_in_nanos = 604_800_000_000_000u64; // 7 days in nanoseconds

    let proposal = OrbitLinkProposal {
        id: proposal_id,
        token_canister_id,
        station_id,
        proposer,
        created_at: now,
        expires_at: now + seven_days_in_nanos,
        yes_votes: 0,
        no_votes: 0,
        total_voting_power,
        voters: BTreeSet::new(),
        status: ProposalStatus::Active,
    };

    // Store the proposal
    ORBIT_PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(
            StorablePrincipal(token_canister_id),
            proposal
        );
    });

    Ok(proposal_id)
}

pub async fn vote_on_proposal(
    proposal_id: u64,
    vote: bool,
) -> Result<(), String> {
    let voter = ic_cdk::caller();

    if voter == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    // Find the proposal by ID
    let (token_canister_id, mut proposal) = ORBIT_PROPOSALS.with(|proposals| {
        proposals.borrow()
            .iter()
            .find(|(_, p)| p.id == proposal_id)
            .map(|(k, v)| (k.0, v.clone()))
            .ok_or("Proposal not found".to_string())
    })?;

    // 1. Verify Active status
    if proposal.status != ProposalStatus::Active {
        return Err("Proposal is no longer active".to_string());
    }

    // Check if expired
    let now = time();
    if now > proposal.expires_at {
        // Mark as expired
        proposal.status = ProposalStatus::Expired;
        ORBIT_PROPOSALS.with(|proposals| {
            proposals.borrow_mut().insert(
                StorablePrincipal(token_canister_id),
                proposal.clone()
            );
        });
        return Err("Proposal has expired".to_string());
    }

    // 2. Check voter hasn't voted (in voters set)
    if proposal.voters.contains(&voter) {
        return Err("You have already voted on this proposal".to_string());
    }

    // 3. Get voter's power via get_user_voting_power_for_token()
    let voting_power = get_user_voting_power_for_token(voter, token_canister_id).await?;

    if voting_power == 0 {
        return Err("You have no voting power for this token".to_string());
    }

    // 4. Add to yes_votes or no_votes
    if vote {
        proposal.yes_votes += voting_power;
    } else {
        proposal.no_votes += voting_power;
    }

    proposal.voters.insert(voter);

    // 5. If yes_votes > (total_voting_power / 2), approve immediately
    if proposal.yes_votes > (proposal.total_voting_power / 2) {
        proposal.status = ProposalStatus::Approved;

        // Store station_id in TOKEN_ORBIT_STATIONS
        TOKEN_ORBIT_STATIONS.with(|stations| {
            stations.borrow_mut().insert(
                StorablePrincipal(token_canister_id),
                StorablePrincipal(proposal.station_id)
            );
        });

        // Remove from ORBIT_PROPOSALS (proposal completed)
        ORBIT_PROPOSALS.with(|proposals| {
            proposals.borrow_mut().remove(&StorablePrincipal(token_canister_id));
        });

        ic_cdk::println!("Proposal {} approved! Station {} linked to token {}",
            proposal_id, proposal.station_id, token_canister_id);
    } else if proposal.no_votes > (proposal.total_voting_power / 2) {
        // If no_votes exceed 50%, reject the proposal
        proposal.status = ProposalStatus::Rejected;

        // Remove from ORBIT_PROPOSALS
        ORBIT_PROPOSALS.with(|proposals| {
            proposals.borrow_mut().remove(&StorablePrincipal(token_canister_id));
        });

        ic_cdk::println!("Proposal {} rejected", proposal_id);
    } else {
        // Still active, update the proposal
        ORBIT_PROPOSALS.with(|proposals| {
            proposals.borrow_mut().insert(
                StorablePrincipal(token_canister_id),
                proposal
            );
        });
    }

    Ok(())
}

async fn verify_backend_is_admin(station_id: Principal) -> Result<bool, String> {
    use crate::types::{SystemInfo, GetResult};

    let backend_id = ic_cdk::id();

    // Call Orbit Station to check admin status
    let result: Result<(GetResult<SystemInfo>,), _> = ic_cdk::call(
        station_id,
        "system_info",
        ()
    ).await;

    match result {
        Ok((GetResult::Ok(system_info),)) => {
            // Check if backend_id is in the admins list
            let is_admin = system_info.admins.iter().any(|admin| admin.id == backend_id);

            if is_admin {
                Ok(true)
            } else {
                Err(format!("DAOPad backend {} is not an admin of station {}", backend_id, station_id))
            }
        },
        Ok((GetResult::Err(e),)) => {
            Err(format!("Failed to get system info from station: {}", e))
        },
        Err((code, msg)) => {
            Err(format!("Failed to call Orbit Station: {:?} - {}", code, msg))
        }
    }
}

async fn get_total_voting_power_for_token(token: Principal) -> Result<u64, String> {
    use crate::storage::state::KONG_LOCKER_PRINCIPALS;
    use crate::kong_locker::voting::calculate_voting_power_for_token;

    // Get all registered Kong Locker principals
    let all_kong_lockers = KONG_LOCKER_PRINCIPALS.with(|principals| {
        principals.borrow()
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
        return Err("No voting power exists for this token across all users".to_string());
    }

    Ok(total_power)
}

fn generate_proposal_id() -> u64 {
    // Simple incrementing ID based on time and randomness
    let now = time();
    let random_component = (ic_cdk::api::call::arg_data_raw().len() as u64) % 1000;
    now / 1_000_000 + random_component // Convert nanos to millis and add randomness
}