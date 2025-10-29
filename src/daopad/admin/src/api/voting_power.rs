use candid::{CandidType, Deserialize, Principal};
use ic_cdk::update;

/// Source of voting power for display purposes
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum VotingPowerSource {
    Equity,      // From equity percentage
    KongLocker,  // From locked liquidity
}

/// Result type for voting power display queries
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct VotingPowerResult {
    pub voting_power: u64,
    pub source: VotingPowerSource,
}

/// Unified voting power query that routes by station type
/// - Equity stations: Returns equity % as VP
/// - Token stations: Returns Kong Locker VP
/// Note: Must be update (not query) because Kong Locker path uses cross-canister calls
#[update]
pub async fn get_voting_power_display(
    station_id: Principal,
    user: Principal,
) -> Result<VotingPowerResult, String> {
    // Check if this is an equity station
    if crate::equity::is_equity_station(station_id) {
        // Equity station: return equity % as VP
        let equity_pct = crate::equity::get_user_equity(station_id, user);
        Ok(VotingPowerResult {
            voting_power: equity_pct as u64,
            source: VotingPowerSource::Equity,
        })
    } else {
        // Token station: query Kong Locker
        match crate::kong_locker::get_user_voting_power_for_token(user, station_id).await {
            Ok(vp) => Ok(VotingPowerResult {
                voting_power: vp,
                source: VotingPowerSource::KongLocker,
            }),
            Err(e) => Err(format!("Kong Locker query failed: {}", e)),
        }
    }
}
