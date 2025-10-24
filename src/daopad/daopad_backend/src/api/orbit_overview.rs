use candid::{Principal, CandidType, Deserialize};
use ic_cdk::update;
use crate::storage::state::{
    TOKEN_ORBIT_STATIONS, UNIFIED_PROPOSALS, ORBIT_PROPOSALS
};
use crate::types::StorablePrincipal;
use crate::types::orbit::{
    ListAccountsInput, AccountMinimal, ListAccountsResultMinimal,
    ListUsersInput, ListUsersResult,
    SystemInfoResult, SystemInfo,
    UserDTO,
};
use crate::proposals::types::ProposalStatus;
use crate::api::orbit_accounts::{Asset, ListAssetsInput, ListAssetsResult};

/// Aggregate overview stats for a DAO
/// Provides key metrics without requiring full treasury data
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct DaoOverviewStats {
    pub treasury_total_icp: u64,        // Total ICP in e8s across all accounts
    pub treasury_account_count: u64,    // Number of treasury accounts
    pub active_proposal_count: u64,     // All active proposals
    pub recent_proposal_count: u64,     // Proposals in last 30 days
    pub member_count: u64,              // Orbit Station members
    pub station_id: Option<Principal>,  // Station principal (if exists)
    pub station_name: Option<String>,   // From system_info
}

/// Get comprehensive DAO overview stats
/// Backend acts as admin proxy to query protected Orbit data
#[update]
pub async fn get_dao_overview(
    token_canister_id: Principal
) -> Result<DaoOverviewStats, String> {
    // 1. Get station ID (or return minimal stats if no station)
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
    });

    let Some(station_id) = station_id else {
        // DAO has no treasury yet - return minimal stats from proposals only
        let active_count = count_active_proposals(token_canister_id);
        let recent_count = count_recent_proposals(token_canister_id, 30);

        return Ok(DaoOverviewStats {
            treasury_total_icp: 0,
            treasury_account_count: 0,
            active_proposal_count: active_count,
            recent_proposal_count: recent_count,
            member_count: 0,
            station_id: None,
            station_name: None,
        });
    };

    // 2. Query Orbit Station sequentially (futures::join! causes "Call already trapped" error)
    let accounts_result = list_accounts_call(station_id).await;
    let users_result = list_users_call(station_id).await;
    let system_info_result = system_info_call(station_id).await;
    let assets_result = list_assets_call(station_id).await;

    // 3. Process Orbit results
    let (treasury_total, account_count) = calculate_treasury_total(&accounts_result, &assets_result);
    let member_count = users_result.as_ref()
        .map(|users| users.len() as u64)
        .unwrap_or(0);
    let station_name = system_info_result.ok()
        .map(|info| info.name);

    // 4. Count proposals from storage (synchronous, fast)
    let active_count = count_active_proposals(token_canister_id);
    let recent_count = count_recent_proposals(token_canister_id, 30);

    Ok(DaoOverviewStats {
        treasury_total_icp: treasury_total,
        treasury_account_count: account_count,
        active_proposal_count: active_count,
        recent_proposal_count: recent_count,
        member_count,
        station_id: Some(station_id),
        station_name,
    })
}

// ============================================================================
// Helper Functions: Proposal Counting
// ============================================================================

/// Count active proposals across all types
fn count_active_proposals(token_id: Principal) -> u64 {
    let mut count = 0u64;

    // Unified proposals (all types)
    UNIFIED_PROPOSALS.with(|proposals| {
        count += proposals.borrow()
            .iter()
            .filter(|((token, _), p)| token.0 == token_id && p.status == ProposalStatus::Active)
            .count() as u64;
    });

    // Orbit link proposals (one per token)
    ORBIT_PROPOSALS.with(|proposals| {
        if let Some(p) = proposals.borrow().get(&StorablePrincipal(token_id)) {
            if p.status == crate::proposals::orbit_link::ProposalStatus::Active {
                count += 1;
            }
        }
    });

    count
}

/// Count recent proposals (within specified days)
fn count_recent_proposals(token_id: Principal, days: u64) -> u64 {
    let now = ic_cdk::api::time();
    let threshold = now.saturating_sub(days * 24 * 60 * 60 * 1_000_000_000);

    let mut count = 0u64;

    // Unified proposals (all types)
    UNIFIED_PROPOSALS.with(|proposals| {
        count += proposals.borrow()
            .iter()
            .filter(|((token, _), p)| token.0 == token_id && p.created_at >= threshold)
            .count() as u64;
    });

    // Note: OrbitLinkProposal doesn't have created_at field currently
    // If needed, this can be added to the struct

    count
}

// ============================================================================
// Helper Functions: Orbit Station Queries
// ============================================================================

/// List all accounts in Orbit Station (admin-level access)
async fn list_accounts_call(station_id: Principal) -> Result<Vec<AccountMinimal>, String> {
    let input = ListAccountsInput {
        search_term: None,
        paginate: None,
    };

    let result: Result<(ListAccountsResultMinimal,), _> =
        ic_cdk::call(station_id, "list_accounts", (input,)).await;

    match result {
        Ok((ListAccountsResultMinimal::Ok { accounts, .. },)) => Ok(accounts),
        Ok((ListAccountsResultMinimal::Err(e),)) => {
            Err(format!("List accounts error: {:?}", e))
        }
        Err((code, msg)) => {
            Err(format!("Call failed: {:?} - {}", code, msg))
        }
    }
}

/// List all users in Orbit Station (admin-level access)
async fn list_users_call(station_id: Principal) -> Result<Vec<UserDTO>, String> {
    let input = ListUsersInput {
        search_term: None,
        statuses: None,
        groups: None,
        paginate: None,
    };

    let result: Result<(ListUsersResult,), _> =
        ic_cdk::call(station_id, "list_users", (input,)).await;

    match result {
        Ok((ListUsersResult::Ok { users, .. },)) => Ok(users),
        Ok((ListUsersResult::Err(e),)) => {
            Err(format!("List users error: {:?}", e))
        }
        Err((code, msg)) => {
            Err(format!("Call failed: {:?} - {}", code, msg))
        }
    }
}

/// Get system info from Orbit Station
async fn system_info_call(station_id: Principal) -> Result<SystemInfo, String> {
    let result: Result<(SystemInfoResult,), _> =
        ic_cdk::call(station_id, "system_info", ()).await;

    match result {
        Ok((SystemInfoResult::Ok { system },)) => Ok(system),
        Ok((SystemInfoResult::Err(e),)) => {
            Err(format!("System info error: {:?}", e))
        }
        Err((code, msg)) => {
            Err(format!("Call failed: {:?} - {}", code, msg))
        }
    }
}

/// List all assets in Orbit Station (for symbol lookup)
async fn list_assets_call(station_id: Principal) -> Result<Vec<Asset>, String> {
    let input = ListAssetsInput {};

    let result: Result<(ListAssetsResult,), _> =
        ic_cdk::call(station_id, "list_assets", (input,)).await;

    match result {
        Ok((ListAssetsResult::Ok { assets },)) => Ok(assets),
        Ok((ListAssetsResult::Err(e),)) => {
            Err(format!("List assets error: {:?}", e))
        }
        Err((code, msg)) => {
            Err(format!("Call failed: {:?} - {}", code, msg))
        }
    }
}

// ============================================================================
// Helper Functions: Treasury Calculation
// ============================================================================

/// Calculate total ICP balance and account count
/// AccountMinimal doesn't include balance data (removed to avoid Candid Option<AccountBalance> bug)
/// Returns 0 for balance as a workaround - balance calculation would require full Account type
fn calculate_treasury_total(
    accounts_result: &Result<Vec<AccountMinimal>, String>,
    _assets_result: &Result<Vec<Asset>, String>
) -> (u64, u64) {
    let Ok(accounts) = accounts_result else {
        return (0, 0);
    };

    let account_count = accounts.len() as u64;

    // TODO: Balance calculation requires AccountAsset.balance field which we removed
    // to avoid Option<AccountBalance> Candid deserialization bug.
    // For now, return 0. Frontend should use get_treasury_accounts_with_balances for actual balances.
    let total_icp: u64 = 0;

    (total_icp, account_count)
}
