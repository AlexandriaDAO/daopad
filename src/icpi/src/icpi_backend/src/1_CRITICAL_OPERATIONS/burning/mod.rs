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
    // Acquire reentrancy guard - prevents concurrent burns by same user
    let _guard = crate::infrastructure::BurnGuard::acquire(caller)?;

    // Validate request
    burn_validator::validate_burn_request(&caller, &amount)?;

    // Get current supply atomically BEFORE collecting fee
    let current_supply = crate::_2_CRITICAL_DATA::supply_tracker::get_icpi_supply_uncached().await?;

    if current_supply == Nat::from(0u32) {
        return Err(IcpiError::Burn(crate::infrastructure::BurnError::NoSupply));
    }

    // NOW collect fee (after validation passed)
    let _ckusdt = Principal::from_text(crate::infrastructure::constants::CKUSDT_CANISTER_ID)
        .map_err(|e| IcpiError::Other(format!("Invalid ckUSDT principal: {}", e)))?;
    crate::_1_CRITICAL_OPERATIONS::minting::fee_handler::collect_mint_fee(caller).await?;

    ic_cdk::println!("Fee collected for burn from user {}", caller);

    ic_cdk::println!("Burning {} ICPI from supply of {}", amount, current_supply);

    // CRITICAL: Transfer ICPI from user to backend (which automatically burns it)
    let icpi_canister = Principal::from_text(crate::infrastructure::constants::ICPI_CANISTER_ID)
        .map_err(|e| IcpiError::Other(format!("Invalid ICPI principal: {}", e)))?;

    let transfer_args = crate::types::icrc::TransferArgs {
        from_subaccount: None,
        to: crate::types::icrc::Account {
            owner: ic_cdk::id(),
            subaccount: None,
        },
        amount: amount.clone(),
        fee: None,
        memo: Some(b"ICPI burn".to_vec()),
        created_at_time: None,
    };

    let transfer_result: std::result::Result<(crate::types::icrc::TransferResult,), _> = ic_cdk::call(
        icpi_canister,
        "icrc1_transfer",
        (transfer_args,)
    ).await;

    match transfer_result {
        Ok((crate::types::icrc::TransferResult::Ok(block),)) => {
            ic_cdk::println!("✅ ICPI transferred to burning account at block {}", block);
        }
        Ok((crate::types::icrc::TransferResult::Err(e),)) => {
            return Err(IcpiError::Burn(crate::infrastructure::BurnError::TokenTransferFailed {
                token: "ICPI".to_string(),
                amount: amount.to_string(),
                reason: format!("{:?}", e),
            }));
        }
        Err((code, msg)) => {
            return Err(IcpiError::Burn(crate::infrastructure::BurnError::TokenTransferFailed {
                token: "ICPI".to_string(),
                amount: amount.to_string(),
                reason: format!("Transfer failed: {:?} - {}", code, msg),
            }));
        }
    }

    // Calculate redemptions
    let redemptions = redemption_calculator::calculate_redemptions(&amount, &current_supply).await?;

    // Distribute tokens to user (passing actual burn amount)
    let result = token_distributor::distribute_tokens(caller, redemptions, amount.clone()).await?;

    Ok(result)
}
