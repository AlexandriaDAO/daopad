//! Burning module - Handles ICPI token burning and redemptions
//! Critical operation that reduces token supply

pub mod burn_validator;
pub mod redemption_calculator;
pub mod token_distributor;

use candid::{CandidType, Deserialize, Nat, Principal};
use crate::infrastructure::{Result, IcpiError};

// Burn result structure
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct BurnResult {
    pub successful_transfers: Vec<(String, Nat)>,    // (token_symbol, amount)
    pub failed_transfers: Vec<(String, Nat, String)>, // (token_symbol, amount, error)
    pub icpi_burned: Nat,
    pub timestamp: u64,
}

// Main burn orchestration function
pub async fn burn_icpi(caller: Principal, amount: Nat) -> Result<BurnResult> {
    // Validate request
    burn_validator::validate_burn_request(&caller, &amount)?;

    // Collect fee from user
    let _ckusdt = Principal::from_text(crate::infrastructure::constants::CKUSDT_CANISTER_ID)
        .map_err(|e| IcpiError::Other(format!("Invalid ckUSDT principal: {}", e)))?;
    crate::_1_CRITICAL_OPERATIONS::minting::fee_handler::collect_mint_fee(caller).await?;

    ic_cdk::println!("Fee collected for burn from user {}", caller);

    // Get current supply atomically
    let current_supply = crate::_2_CRITICAL_DATA::supply_tracker::get_icpi_supply_uncached().await?;

    if current_supply == Nat::from(0u32) {
        return Err(IcpiError::Burn(crate::infrastructure::BurnError::NoSupply));
    }

    ic_cdk::println!("Burning {} ICPI from supply of {}", amount, current_supply);

    // Calculate redemptions
    let redemptions = redemption_calculator::calculate_redemptions(&amount, &current_supply).await?;

    // Distribute tokens to user
    let result = token_distributor::distribute_tokens(caller, redemptions).await?;

    Ok(result)
}
