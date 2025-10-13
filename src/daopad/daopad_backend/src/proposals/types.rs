use candid::{CandidType, Deserialize, Principal};
use thiserror::Error;

/// Newtype wrapper for proposal IDs (type safety)
#[derive(CandidType, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct ProposalId(pub u64);

impl ProposalId {
    pub fn new() -> Self {
        // Generate unique ID from timestamp + random component
        let now = ic_cdk::api::time();
        // Use caller bytes for additional entropy
        let caller = ic_cdk::caller();
        let caller_bytes = caller.as_slice();
        let random = if caller_bytes.len() >= 8 {
            u64::from_le_bytes([
                caller_bytes[0],
                caller_bytes[1],
                caller_bytes[2],
                caller_bytes[3],
                caller_bytes[4],
                caller_bytes[5],
                caller_bytes[6],
                caller_bytes[7],
            ]) % 1000
        } else {
            0
        };
        ProposalId(now / 1_000_000 + random)
    }
}

/// Minimal proposal storage (references Orbit request, doesn't duplicate data)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TreasuryProposal {
    pub id: ProposalId,
    pub token_canister_id: Principal,
    pub orbit_request_id: String, // Reference to Orbit's request
    pub proposal_type: ProposalType,
    pub proposer: Principal,
    pub created_at: u64,
    pub expires_at: u64,
    pub yes_votes: u64,
    pub no_votes: u64,
    pub total_voting_power: u64,
    pub voter_count: u32, // Just count, not full set (memory efficient)
    pub status: ProposalStatus,
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum ProposalType {
    Transfer,
    // Future: AddMember, RemoveMember, etc.
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum ProposalStatus {
    Active,
    Executed,  // Passed and executed in Orbit
    Rejected,
    Expired,
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum VoteChoice {
    Yes,
    No,
}

/// Typed errors (better than String)
#[derive(Error, Debug, CandidType, Deserialize, Clone)]
pub enum ProposalError {
    #[error("Proposal not found: {0:?}")]
    NotFound(ProposalId),

    #[error("Proposal has expired")]
    Expired,

    #[error("Proposal is not active")]
    NotActive,

    #[error("Already voted on proposal {0:?}")]
    AlreadyVoted(ProposalId),

    #[error("No voting power for this token")]
    NoVotingPower,

    #[error("Insufficient voting power to create proposal: {current} < {required}")]
    InsufficientVotingPowerToPropose { current: u64, required: u64 },

    #[error("Authentication required")]
    AuthRequired,

    #[error("An active proposal already exists for this token. Please wait for it to complete before creating a new one.")]
    ActiveProposalExists,

    #[error("No Orbit Station linked to token {0}")]
    NoStationLinked(Principal),

    #[error("Orbit error: {code} - {message}")]
    OrbitError { code: String, message: String },

    #[error("IC call failed: {message}")]
    IcCallFailed { code: i32, message: String },

    #[error("Invalid transfer details: {0}")]
    InvalidTransferDetails(String),

    #[error("Total voting power is zero - no votes possible")]
    ZeroVotingPower,
}
