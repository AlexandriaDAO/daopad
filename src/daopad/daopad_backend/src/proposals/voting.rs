use crate::proposals::orbit_link::OrbitLinkProposal;

pub async fn calculate_voting_result(proposal: &OrbitLinkProposal) -> bool {
    proposal.yes_votes > (proposal.total_voting_power / 2)
}