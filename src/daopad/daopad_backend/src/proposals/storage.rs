use crate::proposals::orbit_link::{OrbitLinkProposal, ProposalStatus};
use crate::storage::state::ORBIT_PROPOSALS;
use crate::types::StorablePrincipal;
use candid::Principal;
use ic_cdk::api::time;

pub fn get_active_proposal_for_token(token: Principal) -> Option<OrbitLinkProposal> {
    ORBIT_PROPOSALS.with(|p| {
        p.borrow()
            .get(&StorablePrincipal(token))
            .filter(|proposal| proposal.status == ProposalStatus::Active)
            .cloned()
    })
}

pub fn cleanup_expired_proposals() -> u32 {
    let now = time();
    let mut cleaned_count = 0;

    ORBIT_PROPOSALS.with(|proposals| {
        let mut proposals_map = proposals.borrow_mut();
        let expired_tokens: Vec<StorablePrincipal> = proposals_map
            .iter()
            .filter(|(_, proposal)| {
                proposal.status == ProposalStatus::Active && proposal.expires_at < now
            })
            .map(|(token, _)| token.clone())
            .collect();

        for token in expired_tokens {
            if let Some(mut proposal) = proposals_map.remove(&token) {
                proposal.status = ProposalStatus::Expired;
                // Log the expiration
                ic_cdk::println!("Proposal {} for token {} has expired", proposal.id, token.0);
                cleaned_count += 1;
            }
        }
    });

    cleaned_count
}

pub fn get_all_active_proposals() -> Vec<OrbitLinkProposal> {
    ORBIT_PROPOSALS.with(|p| {
        p.borrow()
            .values()
            .filter(|proposal| proposal.status == ProposalStatus::Active)
            .cloned()
            .collect()
    })
}