use crate::proposals::types::{
    ProposalId, UnifiedProposal, VoteChoice,
    EquityStationConfig, EquityTransferProposal
};
use crate::types::{
    StorablePrincipal, StorableCandid, PrincipalPair,
    StorableString, StringPrincipalPair
};
use candid::{CandidType, Deserialize, Principal};
use std::cell::RefCell;
use std::collections::BTreeMap;
use ic_stable_structures::{
    StableBTreeMap, DefaultMemoryImpl,
    memory_manager::{MemoryId, MemoryManager, VirtualMemory}
};

type Memory = VirtualMemory<DefaultMemoryImpl>;

thread_local! {
    // Initialize memory manager ONCE
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
}

// Cache entry for total voting power with timestamp
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct VotingPowerCache {
    pub total_vp: u64,
    pub timestamp: u64,
}

thread_local! {
    // ====================================================================
    // Unified Proposal Storage - ALL Orbit Operations
    // ====================================================================
    // MOVED from daopad_backend/src/storage/state.rs
    //
    // Key: (token_canister_id, orbit_request_id)
    // This stores all proposals for community voting
    pub static UNIFIED_PROPOSALS: RefCell<BTreeMap<
        (StorablePrincipal, String),
        UnifiedProposal
    >> = RefCell::new(BTreeMap::new());

    // Unified vote tracking for all proposals
    // Key: (ProposalId, Voter Principal)
    // Prevents double voting and tracks vote history
    pub static UNIFIED_PROPOSAL_VOTES: RefCell<BTreeMap<
        (ProposalId, StorablePrincipal),
        VoteChoice
    >> = RefCell::new(BTreeMap::new());

    // Total voting power cache with TTL (1 hour = 3,600,000,000,000 nanoseconds)
    // Key: token_canister_id
    // Reduces expensive inter-canister calls by caching total VP
    pub static TOTAL_VP_CACHE: RefCell<BTreeMap<
        StorablePrincipal,
        VotingPowerCache
    >> = RefCell::new(BTreeMap::new());
}

thread_local! {
    // ====================================================================
    // EQUITY STATION STABLE STORAGE
    // ====================================================================
    // Survives canister upgrades (unlike BTreeMap above)

    // Marks station as equity-based: station_id → EquityStationConfig
    pub static EQUITY_STATIONS: RefCell<StableBTreeMap<StorablePrincipal, StorableCandid<EquityStationConfig>, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(10)))
        ));

    // Equity ownership: (station_id, holder) → percentage (1-100)
    pub static EQUITY_HOLDERS: RefCell<StableBTreeMap<PrincipalPair, u8, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(11)))
        ));

    // Active proposals: proposal_id → EquityTransferProposal
    pub static EQUITY_TRANSFER_PROPOSALS: RefCell<StableBTreeMap<StorableString, StorableCandid<EquityTransferProposal>, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(12)))
        ));

    // Votes: (proposal_id, voter) → VoteChoice
    pub static EQUITY_TRANSFER_VOTES: RefCell<StableBTreeMap<StringPrincipalPair, StorableCandid<VoteChoice>, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(13)))
        ));
}
