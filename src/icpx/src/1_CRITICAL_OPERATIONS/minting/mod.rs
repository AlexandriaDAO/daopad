//! Minting operations module
//! Security: CRITICAL - Creates new ICPX tokens

use candid::{Nat, Principal};
use crate::infrastructure::error_types::Result;
use crate::infrastructure::types::*;
use crate::infrastructure::constants::*;
use crate::infrastructure::math_utils::*;

use std::collections::HashMap;
use std::cell::RefCell;

thread_local! {
    static PENDING_MINTS: RefCell<HashMap<String, PendingMint>> = RefCell::new(HashMap::new());
}

/// Initiate a new mint request
pub async fn initiate_mint(caller: Principal, amount: Nat) -> Result<String> {
    // Validation
    if amount < Nat::from(MIN_MINT_AMOUNT) {
        return Err(crate::infrastructure::error_types::IcpxError::Mint(
            crate::infrastructure::error_types::MintError::AmountBelowMinimum {
                amount: amount.to_string(),
                minimum: MIN_MINT_AMOUNT.to_string(),
            }
        ));
    }

    // Create pending mint record
    let mint_id = format!("mint_{}", ic_cdk::api::time());
    let pending_mint = PendingMint {
        id: mint_id.clone(),
        user: caller,
        amount,
        status: MintStatus::Pending,
        created_at: ic_cdk::api::time(),
        last_updated: ic_cdk::api::time(),
        snapshot: None,
    };

    // Store pending mint
    PENDING_MINTS.with(|mints| {
        mints.borrow_mut().insert(mint_id.clone(), pending_mint);
    });

    Ok(mint_id)
}

/// Complete a pending mint
pub async fn complete_mint(caller: Principal, mint_id: String) -> Result<Nat> {
    // Get pending mint
    let mint = PENDING_MINTS.with(|mints| {
        mints.borrow().get(&mint_id).cloned()
    }).ok_or_else(|| {
        crate::infrastructure::error_types::IcpxError::Mint(
            crate::infrastructure::error_types::MintError::InvalidMintId { id: mint_id.clone() }
        )
    })?;

    // Validate caller
    if mint.user != caller {
        return Err(crate::infrastructure::error_types::IcpxError::System(
            crate::infrastructure::error_types::SystemError::Unauthorized {
                principal: caller.to_string()
            }
        ));
    }

    // Check status
    if !matches!(mint.status, MintStatus::Pending) {
        return Err(crate::infrastructure::error_types::IcpxError::Mint(
            crate::infrastructure::error_types::MintError::MintNotPending {
                id: mint_id,
                status: format!("{:?}", mint.status),
            }
        ));
    }

    // Get snapshot of current state
    let (supply, tvl) = futures::join!(
        crate::critical_data::supply_tracker::get_validated_supply(),
        crate::critical_data::portfolio_value::calculate_portfolio_value_atomic()
    );

    let supply = supply?;
    let tvl = tvl?;

    // Calculate mint amount
    let icpx_amount = calculate_mint_amount(&mint.amount, &supply, &tvl)?;

    // Update status to complete
    PENDING_MINTS.with(|mints| {
        if let Some(mint) = mints.borrow_mut().get_mut(&mint_id) {
            mint.status = MintStatus::Complete(icpx_amount.clone());
            mint.last_updated = ic_cdk::api::time();
        }
    });

    Ok(icpx_amount)
}

/// Calculate mint amount based on current supply and TVL
fn calculate_mint_amount(
    deposit_amount: &Nat,
    current_supply: &Nat,
    current_tvl: &Nat,
) -> Result<Nat> {
    // Initial mint case: 1:1 ratio
    if current_supply == &Nat::from(0u64) || current_tvl == &Nat::from(0u64) {
        return convert_decimals(deposit_amount, 6, 8); // ckUSDT to ICPX
    }

    // Subsequent mints: Proportional ownership
    multiply_and_divide(deposit_amount, current_supply, current_tvl)
}