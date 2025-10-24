pub mod orbit_link;
pub mod orbit_requests;  // Keep temporarily for migration
pub mod storage;
pub mod treasury;  // Keep temporarily for migration
pub mod types;
pub mod unified;  // NEW: Unified voting system
pub mod voting;

// Re-export unified functions (single voting system)
pub use unified::{
    vote_on_proposal,                      // Single voting endpoint
    create_orbit_request_with_proposal,    // Single creation endpoint
    get_proposal,                          // Single query
    list_unified_proposals,                // Single list
    ensure_proposal_for_request,           // For backwards compatibility
    has_user_voted,
    get_user_vote,
    TransferDetails,
    OrbitOperation,
    UnifiedProposal,
};

// Keep temporarily for migration (DEPRECATED - will be removed)
pub use treasury::{
    create_treasury_transfer_proposal, get_treasury_proposal, vote_on_treasury_proposal,
};

// Re-export types
pub use types::{
    OrbitRequestProposal, OrbitRequestType, ProposalError, ProposalId, ProposalType,
    TreasuryProposal, VoteChoice,
};
