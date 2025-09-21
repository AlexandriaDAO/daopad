use candid::{CandidType, Deserialize};

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct VotingThresholds {
    pub transfer_funds: u32,     // Percentage required to transfer funds
    pub add_members: u32,        // Percentage required to add new members
    pub remove_members: u32,     // Percentage required to remove members
    pub change_permissions: u32, // Percentage required to change permissions
    pub system_upgrades: u32,    // Percentage required for system upgrades
}

impl Default for VotingThresholds {
    fn default() -> Self {
        // Default thresholds as specified in DAO transition plan
        VotingThresholds {
            transfer_funds: 50,
            add_members: 30,
            remove_members: 60,
            change_permissions: 70,
            system_upgrades: 80,
        }
    }
}
