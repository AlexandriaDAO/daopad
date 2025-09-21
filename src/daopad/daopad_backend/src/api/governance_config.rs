use crate::storage::state::{TOKEN_ORBIT_STATIONS, VOTING_THRESHOLDS};
use crate::types::{StorablePrincipal, VotingThresholds};
use candid::{CandidType, Deserialize, Principal};
use ic_cdk::{query, update};

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum ProposalType {
    TransferFunds,
    AddMember,
    RemoveMember,
    ChangePermissions,
    SystemUpgrade,
    GeneralOperation,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct ProposalConfig {
    pub proposal_type: ProposalType,
    pub required_threshold: u32,
    pub voting_period_seconds: u64,
    pub execution_delay_seconds: u64,
}

// Phase 3: Governance Configuration Functions

#[update]
pub fn set_voting_thresholds(
    token_canister_id: Principal,
    thresholds: VotingThresholds,
) -> Result<String, String> {
    // Verify the token has an associated Orbit Station
    TOKEN_ORBIT_STATIONS.with(|stations| {
        if !stations
            .borrow()
            .contains_key(&StorablePrincipal(token_canister_id))
        {
            return Err("No Orbit Station linked to this token".to_string());
        }
        Ok(())
    })?;

    // Validate thresholds (must be between 1 and 100)
    if thresholds.transfer_funds > 100 || thresholds.transfer_funds == 0 {
        return Err("Transfer funds threshold must be between 1 and 100".to_string());
    }
    if thresholds.add_members > 100 || thresholds.add_members == 0 {
        return Err("Add members threshold must be between 1 and 100".to_string());
    }
    if thresholds.remove_members > 100 || thresholds.remove_members == 0 {
        return Err("Remove members threshold must be between 1 and 100".to_string());
    }
    if thresholds.change_permissions > 100 || thresholds.change_permissions == 0 {
        return Err("Change permissions threshold must be between 1 and 100".to_string());
    }
    if thresholds.system_upgrades > 100 || thresholds.system_upgrades == 0 {
        return Err("System upgrades threshold must be between 1 and 100".to_string());
    }

    // Store the thresholds
    VOTING_THRESHOLDS.with(|thresholds_map| {
        thresholds_map
            .borrow_mut()
            .insert(StorablePrincipal(token_canister_id), thresholds.clone());
    });

    Ok(format!(
        "Voting thresholds updated for token {}",
        token_canister_id
    ))
}

#[query]
pub fn get_voting_thresholds(token_canister_id: Principal) -> Result<VotingThresholds, String> {
    VOTING_THRESHOLDS.with(|thresholds_map| {
        thresholds_map
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .cloned()
            .ok_or_else(|| "No voting thresholds configured for this token".to_string())
    })
}

#[query]
pub fn get_default_voting_thresholds() -> VotingThresholds {
    VotingThresholds::default()
}

#[update]
pub fn initialize_default_thresholds(token_canister_id: Principal) -> Result<String, String> {
    // Verify the token has an associated Orbit Station
    TOKEN_ORBIT_STATIONS.with(|stations| {
        if !stations
            .borrow()
            .contains_key(&StorablePrincipal(token_canister_id))
        {
            return Err("No Orbit Station linked to this token".to_string());
        }
        Ok(())
    })?;

    // Check if thresholds already exist
    let exists = VOTING_THRESHOLDS.with(|thresholds_map| {
        thresholds_map
            .borrow()
            .contains_key(&StorablePrincipal(token_canister_id))
    });

    if exists {
        return Err("Voting thresholds already configured for this token".to_string());
    }

    // Set default thresholds
    VOTING_THRESHOLDS.with(|thresholds_map| {
        thresholds_map.borrow_mut().insert(
            StorablePrincipal(token_canister_id),
            VotingThresholds::default(),
        );
    });

    Ok("Default voting thresholds initialized".to_string())
}

#[query]
pub fn get_proposal_config(
    token_canister_id: Principal,
    proposal_type: ProposalType,
) -> Result<ProposalConfig, String> {
    // Get the voting thresholds for this token
    let thresholds =
        get_voting_thresholds(token_canister_id).unwrap_or_else(|_| VotingThresholds::default());

    // Determine the threshold based on proposal type
    let required_threshold = match proposal_type {
        ProposalType::TransferFunds => thresholds.transfer_funds,
        ProposalType::AddMember => thresholds.add_members,
        ProposalType::RemoveMember => thresholds.remove_members,
        ProposalType::ChangePermissions => thresholds.change_permissions,
        ProposalType::SystemUpgrade => thresholds.system_upgrades,
        ProposalType::GeneralOperation => 50, // Default for general operations
    };

    // Default voting period (7 days) and execution delay (2 days)
    Ok(ProposalConfig {
        proposal_type,
        required_threshold,
        voting_period_seconds: 7 * 24 * 60 * 60,   // 7 days
        execution_delay_seconds: 2 * 24 * 60 * 60, // 2 days
    })
}

// Helper function to check if a proposal has passed based on voting results
#[query]
pub fn has_proposal_passed(
    token_canister_id: Principal,
    proposal_type: ProposalType,
    yes_votes: u64,
    no_votes: u64,
    total_voting_power: u64,
) -> Result<bool, String> {
    let config = get_proposal_config(token_canister_id, proposal_type)?;

    // Calculate the percentage of yes votes from total voting power
    let total_votes = yes_votes + no_votes;

    if total_votes == 0 {
        return Ok(false); // No votes cast
    }

    // Check if yes votes meet the required threshold
    let yes_percentage = (yes_votes * 100) / total_voting_power;

    Ok(yes_percentage >= config.required_threshold as u64)
}

// Governance analytics
#[derive(CandidType, Deserialize)]
pub struct GovernanceStats {
    pub total_proposals: u64,
    pub active_proposals: u64,
    pub approved_proposals: u64,
    pub rejected_proposals: u64,
    pub average_participation: u32, // Percentage
    pub configured_thresholds: Option<VotingThresholds>,
}

#[query]
pub fn get_governance_stats(token_canister_id: Principal) -> Result<GovernanceStats, String> {
    // Get configured thresholds if any
    let configured_thresholds = VOTING_THRESHOLDS.with(|thresholds_map| {
        thresholds_map
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .cloned()
    });

    // TODO: Integrate with actual proposal data
    // For now, return placeholder stats
    Ok(GovernanceStats {
        total_proposals: 0,
        active_proposals: 0,
        approved_proposals: 0,
        rejected_proposals: 0,
        average_participation: 0,
        configured_thresholds,
    })
}
