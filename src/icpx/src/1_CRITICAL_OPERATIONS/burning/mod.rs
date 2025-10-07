//! Burning operations module
//! Security: CRITICAL - Returns user funds

use candid::{Nat, Principal};
use crate::infrastructure::error_types::Result;
use crate::infrastructure::types::*;
use crate::infrastructure::constants::*;
use crate::infrastructure::math_utils::*;

use std::collections::HashMap;

/// Execute burn and redemption
pub async fn burn_icpx(caller: Principal, burn_amount: Nat) -> Result<BurnResult> {
    // Validation
    if burn_amount < Nat::from(MIN_BURN_AMOUNT) {
        return Err(crate::infrastructure::error_types::IcpxError::Burn(
            crate::infrastructure::error_types::BurnError::AmountBelowMinimum {
                amount: burn_amount.to_string(),
                minimum: MIN_BURN_AMOUNT.to_string(),
            }
        ));
    }

    // Get current state snapshot
    let (supply_after_burn, balances) = futures::join!(
        crate::critical_data::supply_tracker::get_validated_supply(),
        crate::critical_data::portfolio_value::balance_aggregator::get_all_token_balances()
    );

    let supply_after_burn = supply_after_burn?;
    let balances = balances?;

    // Calculate redemptions
    let redemptions = calculate_proportional_redemption(
        &burn_amount,
        &supply_after_burn,
        &balances,
    )?;

    // Execute redemptions (simplified - in production would actually transfer)
    let mut successful_transfers = Vec::new();
    let failed_transfers = Vec::new();

    for redemption in redemptions {
        successful_transfers.push(TransferRecord {
            token: redemption.token,
            amount: redemption.amount,
            block: Nat::from(0u64), // Placeholder
        });
    }

    Ok(BurnResult {
        icpx_burned: burn_amount,
        successful_transfers,
        failed_transfers,
        timestamp: ic_cdk::api::time(),
    })
}

/// Calculate proportional redemption for each token
fn calculate_proportional_redemption(
    burn_amount: &Nat,
    supply_after_burn: &Nat,
    token_balances: &HashMap<Token, Nat>,
) -> Result<Vec<TokenRedemption>> {
    let mut redemptions = Vec::new();

    // Special case: Burning all remaining supply
    if supply_after_burn == &Nat::from(0u64) {
        for (token, balance) in token_balances {
            if balance > &Nat::from(TRANSFER_FEE_BUFFER) {
                let amount = safe_subtract(balance, &Nat::from(TRANSFER_FEE_BUFFER))?;
                redemptions.push(TokenRedemption {
                    token: *token,
                    amount,
                });
            }
        }
        return Ok(redemptions);
    }

    // Normal case: Proportional redemption
    for (token, balance) in token_balances {
        if balance == &Nat::from(0u64) {
            continue;
        }

        let gross_amount = multiply_and_divide(burn_amount, balance, supply_after_burn)?;

        if gross_amount > Nat::from(TRANSFER_FEE_BUFFER) {
            let net_amount = safe_subtract(&gross_amount, &Nat::from(TRANSFER_FEE_BUFFER))?;
            redemptions.push(TokenRedemption {
                token: *token,
                amount: net_amount,
            });
        }
    }

    if redemptions.is_empty() {
        return Err(crate::infrastructure::error_types::IcpxError::Burn(
            crate::infrastructure::error_types::BurnError::NoRedemptionsPossible {
                reason: "Burn amount too small for any redemption".into()
            }
        ));
    }

    Ok(redemptions)
}