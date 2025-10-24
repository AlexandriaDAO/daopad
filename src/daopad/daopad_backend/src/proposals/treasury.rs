// DEPRECATED: This file is kept temporarily for migration
// All functionality has been moved to unified.rs

use crate::kong_locker::voting::{
    calculate_voting_power_for_token, get_user_voting_power_for_token,
};
use crate::proposals::types::*;
use crate::storage::state::{
    KONG_LOCKER_PRINCIPALS, PROPOSAL_VOTES, TOKEN_ORBIT_STATIONS,
};
use crate::types::StorablePrincipal;
use candid::{CandidType, Deserialize, Nat, Principal};
use ic_cdk::api::time;
use ic_cdk::{query, update};

// Re-export TransferDetails for compatibility
pub use crate::proposals::unified::TransferDetails;

/// DEPRECATED: Use create_orbit_request_with_proposal from unified.rs
#[update]
pub async fn create_treasury_transfer_proposal(
    _token_canister_id: Principal,
    _transfer_details: TransferDetails,
) -> Result<ProposalId, ProposalError> {
    Err(ProposalError::Custom(
        "DEPRECATED: Use create_orbit_request_with_proposal instead".to_string()
    ))
}

/// DEPRECATED: Use vote_on_proposal from unified.rs
#[update]
pub async fn vote_on_treasury_proposal(
    _proposal_id: ProposalId,
    _vote: bool,
) -> Result<(), ProposalError> {
    Err(ProposalError::Custom(
        "DEPRECATED: Use vote_on_proposal instead".to_string()
    ))
}

/// DEPRECATED: Use get_proposal from unified.rs
#[query]
pub fn get_treasury_proposal(_token_id: Principal) -> Option<TreasuryProposal> {
    None
}