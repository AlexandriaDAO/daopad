use crate::proposals::types::{
    EquityStationConfig, EquityTransferProposal, PaymentDestination,
    EquityProposalStatus, VoteChoice
};
use crate::storage::state::{
    EQUITY_STATIONS, EQUITY_HOLDERS, EQUITY_TRANSFER_PROPOSALS, EQUITY_TRANSFER_VOTES
};
use crate::types::{StorablePrincipal, StorableCandid, PrincipalPair, StorableString, StringPrincipalPair};
use candid::Principal;
use ic_cdk::{query, update};

// ============================================================================
// INITIALIZATION
// ============================================================================

#[update]
pub fn initialize_equity_station(station_id: Principal, creator: Principal) -> Result<(), String> {
    // ONLY Backend can call this
    let caller = ic_cdk::caller();
    let backend = Principal::from_text("lwsav-iiaaa-aaaap-qp2qq-cai")
        .map_err(|e| format!("Invalid backend principal: {}", e))?;

    if caller != backend {
        return Err("Only Backend can initialize".to_string());
    }

    EQUITY_STATIONS.with(|stations| {
        let mut stations_map = stations.borrow_mut();

        // Check not already initialized
        if stations_map.contains_key(&StorablePrincipal(station_id)) {
            return Err("Already equity-enabled".to_string());
        }

        // Create config
        let config = EquityStationConfig {
            station_id,
            creator,
            created_at: ic_cdk::api::time(),
        };
        stations_map.insert(StorablePrincipal(station_id), StorableCandid(config));

        // Creator gets 100% equity
        EQUITY_HOLDERS.with(|holders| {
            holders.borrow_mut().insert(PrincipalPair(station_id, creator), 100);
        });

        Ok(())
    })
}

// ============================================================================
// EQUITY TRANSFER PROPOSALS
// ============================================================================

#[update]
pub fn create_equity_transfer_proposal(
    station_id: Principal,
    buyer: Principal,
    percentage: u8,
    ckusdc_amount: u64,
    payment_destination: PaymentDestination,
) -> Result<String, String> {
    let seller = ic_cdk::caller();

    // Validate percentage 1-100
    if percentage < 1 || percentage > 100 {
        return Err("Percentage must be 1-100".to_string());
    }

    // Check seller has enough equity
    let seller_equity = EQUITY_HOLDERS.with(|holders| {
        holders.borrow()
            .get(&PrincipalPair(station_id, seller))
            .unwrap_or(0)
    });

    if seller_equity < percentage {
        return Err(format!("Insufficient equity: have {}%, need {}%", seller_equity, percentage));
    }

    // Generate proposal ID
    let proposal_id = format!("{}-{}", ic_cdk::api::time(), seller.to_text());

    // Create proposal (does NOT lock seller's equity)
    let proposal = EquityTransferProposal {
        proposal_id: proposal_id.clone(),
        station_id,
        seller,
        buyer,
        percentage,
        ckusdc_amount,
        payment_destination,
        status: EquityProposalStatus::Proposed,
        created_at: ic_cdk::api::time(),
        expires_at: ic_cdk::api::time() + (7 * 24 * 60 * 60 * 1_000_000_000), // 7 days
        yes_votes_pct: 0,
        no_votes_pct: 0,
    };

    EQUITY_TRANSFER_PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(
            StorableString(proposal_id.clone()),
            StorableCandid(proposal)
        );
    });

    Ok(proposal_id)
}

#[update]
pub fn vote_on_equity_transfer(proposal_id: String, approve: bool) -> Result<(), String> {
    let voter = ic_cdk::caller();

    // Get proposal
    let mut proposal = EQUITY_TRANSFER_PROPOSALS.with(|proposals| {
        proposals.borrow()
            .get(&StorableString(proposal_id.clone()))
            .map(|p| p.0.clone())
            .ok_or("Proposal not found".to_string())
    })?;

    // Check not expired
    if ic_cdk::api::time() > proposal.expires_at {
        proposal.status = EquityProposalStatus::Expired;
        EQUITY_TRANSFER_PROPOSALS.with(|proposals| {
            proposals.borrow_mut().insert(
                StorableString(proposal_id.clone()),
                StorableCandid(proposal)
            );
        });
        return Err("Proposal expired".to_string());
    }

    // Get voter's equity (NOT locked - they can vote even with pending proposals)
    let voter_equity = EQUITY_HOLDERS.with(|holders| {
        holders.borrow()
            .get(&PrincipalPair(proposal.station_id, voter))
            .unwrap_or(0)
    });

    if voter_equity == 0 {
        return Err("No equity in this station".to_string());
    }

    // Check not already voted
    let vote_key = StringPrincipalPair(proposal_id.clone(), voter);
    EQUITY_TRANSFER_VOTES.with(|votes| {
        if votes.borrow().contains_key(&vote_key) {
            return Err("Already voted".to_string());
        }

        // Record vote
        votes.borrow_mut().insert(
            vote_key,
            StorableCandid(if approve { VoteChoice::Yes } else { VoteChoice::No })
        );
        Ok(())
    })?;

    // Update vote tallies with overflow protection
    if approve {
        proposal.yes_votes_pct = proposal.yes_votes_pct
            .checked_add(voter_equity)
            .expect("Vote tally overflow - invariant violated");
    } else {
        proposal.no_votes_pct = proposal.no_votes_pct
            .checked_add(voter_equity)
            .expect("Vote tally overflow - invariant violated");
    }

    // Check 75% threshold
    if proposal.yes_votes_pct >= 75 {
        proposal.status = EquityProposalStatus::Approved;
    }

    // Save
    EQUITY_TRANSFER_PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(
            StorableString(proposal_id),
            StorableCandid(proposal)
        );
    });

    Ok(())
}

#[update]
pub fn execute_equity_transfer(proposal_id: String) -> Result<(), String> {
    let caller = ic_cdk::caller();

    // Get proposal
    let mut proposal = EQUITY_TRANSFER_PROPOSALS.with(|proposals| {
        proposals.borrow()
            .get(&StorableString(proposal_id.clone()))
            .map(|p| p.0.clone())
            .ok_or("Proposal not found".to_string())
    })?;

    // Only buyer can execute
    if caller != proposal.buyer {
        return Err("Only buyer can execute".to_string());
    }

    // Must be approved
    if proposal.status != EquityProposalStatus::Approved {
        return Err(format!("Not approved (status: {:?})", proposal.status));
    }

    // MVP: Trust-based payment (no verification)

    // Execute transfer
    EQUITY_HOLDERS.with(|holders| {
        let mut holders_map = holders.borrow_mut();

        // Get current equity at execution time
        let seller_equity = holders_map
            .get(&PrincipalPair(proposal.station_id, proposal.seller))
            .unwrap_or(0);
        let buyer_equity = holders_map
            .get(&PrincipalPair(proposal.station_id, proposal.buyer))
            .unwrap_or(0);

        // Sanity check: seller must STILL have enough
        if seller_equity < proposal.percentage {
            return Err(format!(
                "Seller no longer has enough equity (has {}%, needs {}%)",
                seller_equity,
                proposal.percentage
            ));
        }

        // Update: Seller -= X%, Buyer += X%
        let new_seller_equity = seller_equity - proposal.percentage;
        let new_buyer_equity = buyer_equity + proposal.percentage;

        holders_map.insert(PrincipalPair(proposal.station_id, proposal.seller), new_seller_equity);
        holders_map.insert(PrincipalPair(proposal.station_id, proposal.buyer), new_buyer_equity);

        // Invariant check: Total must = 100%
        let total: u32 = holders_map.iter()
            .filter(|(k, _)| k.0 == proposal.station_id)
            .map(|(_, pct)| pct as u32)
            .sum();

        if total != 100 {
            panic!("CRITICAL: Equity invariant violated! Total = {}%", total);
        }

        Ok(())
    })?;

    // Mark executed
    proposal.status = EquityProposalStatus::Executed;
    EQUITY_TRANSFER_PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(
            StorableString(proposal_id),
            StorableCandid(proposal)
        );
    });

    Ok(())
}

// ============================================================================
// QUERY METHODS
// ============================================================================

#[query]
pub fn get_user_equity(station_id: Principal, user: Principal) -> u8 {
    EQUITY_HOLDERS.with(|holders| {
        holders.borrow()
            .get(&PrincipalPair(station_id, user))
            .unwrap_or(0)
    })
}

#[query]
pub fn get_equity_holders(station_id: Principal) -> Vec<(Principal, u8)> {
    EQUITY_HOLDERS.with(|holders| {
        holders.borrow()
            .iter()
            .filter(|(k, _)| k.0 == station_id)
            .map(|(k, pct)| (k.1, pct))
            .collect()
    })
}

#[query]
pub fn get_equity_transfer_proposals(station_id: Principal) -> Vec<EquityTransferProposal> {
    EQUITY_TRANSFER_PROPOSALS.with(|proposals| {
        proposals.borrow()
            .iter()
            .map(|(_, p)| p.0.clone())
            .filter(|p| p.station_id == station_id)
            .collect()
    })
}

#[query]
pub fn get_equity_transfer_proposal(proposal_id: String) -> Option<EquityTransferProposal> {
    EQUITY_TRANSFER_PROPOSALS.with(|proposals| {
        proposals.borrow()
            .get(&StorableString(proposal_id))
            .map(|p| p.0.clone())
    })
}

#[query]
pub fn is_equity_station(station_id: Principal) -> bool {
    EQUITY_STATIONS.with(|stations| {
        stations.borrow().contains_key(&StorablePrincipal(station_id))
    })
}
