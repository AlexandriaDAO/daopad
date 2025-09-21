use crate::proposals::orbit_link::{propose_orbit_link, vote_on_proposal, OrbitLinkProposal};
use crate::proposals::storage::{
    cleanup_expired_proposals as cleanup_proposals,
    get_active_proposal_for_token as get_proposal_for_token, get_all_active_proposals,
};
use candid::Principal;
use ic_cdk::{query, update};

#[update]
pub async fn propose_orbit_station_link(
    token_canister_id: Principal,
    station_id: Principal,
) -> Result<u64, String> {
    propose_orbit_link(token_canister_id, station_id).await
}

#[update]
pub async fn vote_on_orbit_proposal(proposal_id: u64, vote: bool) -> Result<(), String> {
    vote_on_proposal(proposal_id, vote).await
}

#[query]
pub fn get_active_proposal_for_token(token: Principal) -> Option<OrbitLinkProposal> {
    get_proposal_for_token(token)
}

#[query]
pub fn list_active_proposals() -> Vec<OrbitLinkProposal> {
    get_all_active_proposals()
}

#[update]
pub fn cleanup_expired_proposals() -> Result<u32, String> {
    Ok(cleanup_proposals())
}
