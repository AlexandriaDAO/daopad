// Admin canister - Handles governance and approval of Orbit requests
// Separated from backend to comply with Orbit Station separation of duties

mod api;
mod proposals;
mod kong_locker;
mod storage;
mod types;

use candid::{CandidType, Deserialize, Principal};
use ic_cdk::{init, update, query};
use proposals::types::{ProposalId, UnifiedProposal, VoteChoice, ProposalError};

#[init]
fn init() {
    ic_cdk::println!("🔐 Admin canister initialized: {:?}", ic_cdk::id());
    ic_cdk::println!("📜 This canister handles governance and approval of Orbit requests");
}

// ============================================================================
// Public API - Called by Frontend
// ============================================================================

/// Called by FRONTEND after backend creates Orbit request
/// This triggers proposal creation for community voting
#[update]
pub async fn create_proposal(
    token_id: Principal,
    orbit_request_id: String,
    operation_type: String, // "Transfer", "EditUser", "AddAsset", etc.
) -> Result<String, String> {
    // Uses ensure_proposal_for_request from unified.rs
    proposals::unified::ensure_proposal_for_request(
        token_id,
        orbit_request_id,
        operation_type
    ).await
    .map(|proposal_id| format!("{:?}", proposal_id))
    .map_err(|e| format!("{:?}", e))
}

// vote_on_proposal is defined in proposals::unified and automatically exported via #[update]
pub use proposals::unified::vote_on_proposal;

// ============================================================================
// Query Methods - Re-exported from unified module
// ============================================================================

// Query methods are defined in proposals::unified and automatically exported via #[query]
pub use proposals::unified::{
    get_proposal,
    list_unified_proposals as list_proposals,
    has_user_voted,
    get_user_vote,
};

// ============================================================================
// Kong Locker Integration
// ============================================================================

/// Register user's Kong Locker canister
/// Called by backend when user registers (forwarded from backend)
#[update]
pub fn register_kong_locker(
    user: Principal,
    kong_locker: Principal
) -> Result<(), String> {
    storage::state::KONG_LOCKER_PRINCIPALS.with(|principals| {
        principals.borrow_mut().insert(
            types::StorablePrincipal(user),
            types::StorablePrincipal(kong_locker)
        );
    });
    Ok(())
}

/// Get user's registered Kong Locker principal
#[query]
pub fn get_kong_locker(user: Principal) -> Option<Principal> {
    storage::state::KONG_LOCKER_PRINCIPALS.with(|principals| {
        principals.borrow()
            .get(&types::StorablePrincipal(user))
            .map(|sp| sp.0)
    })
}

/// Register Orbit Station for a token
/// Called by backend when linking a token to an Orbit Station
#[update]
pub fn register_orbit_station(
    token_id: Principal,
    station_id: Principal
) -> Result<(), String> {
    storage::state::TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow_mut().insert(
            types::StorablePrincipal(token_id),
            types::StorablePrincipal(station_id)
        );
    });
    Ok(())
}

/// Get Orbit Station for a token
#[query]
pub fn get_orbit_station(token_id: Principal) -> Option<Principal> {
    storage::state::TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow()
            .get(&types::StorablePrincipal(token_id))
            .map(|sp| sp.0)
    })
}

// ============================================================================
// Candid Export
// ============================================================================

ic_cdk::export_candid!();
