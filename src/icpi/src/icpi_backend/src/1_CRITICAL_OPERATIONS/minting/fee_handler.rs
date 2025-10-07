//! Fee handling for mint operations

use candid::{Nat, Principal};
use crate::infrastructure::{Result, IcpiError, MintError};
use crate::infrastructure::constants::{MINT_FEE_E6, CKUSDT_CANISTER_ID};
use crate::types::{Account, TransferArgs};

/// Collect minting fee from user
pub async fn collect_mint_fee(user: Principal) -> Result<Nat> {
    let fee_amount = Nat::from(MINT_FEE_E6);

    ic_cdk::println!("Collecting mint fee of {} from {}", fee_amount, user);

    let ckusdt = Principal::from_text(CKUSDT_CANISTER_ID)
        .map_err(|e| IcpiError::Mint(MintError::FeeCollectionFailed {
            user: user.to_text(),
            reason: format!("Invalid ckUSDT principal: {}", e),
        }))?;

    // Transfer from user to backend (as fee)
    let transfer_args = TransferArgs {
        to: Account {
            owner: ic_cdk::id(),
            subaccount: None,
        },
        amount: fee_amount.clone(),
        fee: None,
        memo: Some(b"ICPI mint fee".to_vec()),
        from_subaccount: None,
        created_at_time: None,
    };

    let result: Result<(crate::types::icrc::TransferResult,), _> = ic_cdk::call(
        ckusdt,
        "icrc1_transfer_from",
        (
            Account { owner: user, subaccount: None },
            Account { owner: ic_cdk::id(), subaccount: None },
            fee_amount.clone(),
            None::<Vec<u8>>,  // fee
            Some(b"ICPI mint fee".to_vec()),  // memo
            None::<u64>,  // created_at_time
        )
    ).await;

    match result {
        Ok((crate::types::icrc::TransferResult::Ok(block),)) => {
            ic_cdk::println!("Fee collected successfully: block {}", block);
            Ok(fee_amount)
        }
        Ok((crate::types::icrc::TransferResult::Err(e),)) => {
            Err(IcpiError::Mint(MintError::FeeCollectionFailed {
                user: user.to_text(),
                reason: format!("{:?}", e),
            }))
        }
        Err((code, msg)) => {
            Err(IcpiError::Mint(MintError::FeeCollectionFailed {
                user: user.to_text(),
                reason: format!("Call failed: {:?} - {}", code, msg),
            }))
        }
    }
}

/// Collect deposit from user for minting
pub async fn collect_deposit(
    user: Principal,
    amount: Nat,
    memo: String,
) -> Result<Nat> {
    ic_cdk::println!("Collecting deposit of {} from {} (memo: {})", amount, user, memo);

    let ckusdt = Principal::from_text(CKUSDT_CANISTER_ID)
        .map_err(|e| IcpiError::Mint(MintError::DepositCollectionFailed {
            user: user.to_text(),
            amount: amount.to_string(),
            reason: format!("Invalid ckUSDT principal: {}", e),
        }))?;

    let result: Result<(crate::types::icrc::TransferResult,), _> = ic_cdk::call(
        ckusdt,
        "icrc1_transfer_from",
        (
            Account { owner: user, subaccount: None },
            Account { owner: ic_cdk::id(), subaccount: None },
            amount.clone(),
            None::<Vec<u8>>,  // fee
            Some(memo.into_bytes()),  // memo
            None::<u64>,  // created_at_time
        )
    ).await;

    match result {
        Ok((crate::types::icrc::TransferResult::Ok(block),)) => {
            ic_cdk::println!("Deposit collected successfully: block {}", block);
            Ok(amount)
        }
        Ok((crate::types::icrc::TransferResult::Err(e),)) => {
            Err(IcpiError::Mint(MintError::DepositCollectionFailed {
                user: user.to_text(),
                amount: amount.to_string(),
                reason: format!("{:?}", e),
            }))
        }
        Err((code, msg)) => {
            Err(IcpiError::Mint(MintError::DepositCollectionFailed {
                user: user.to_text(),
                amount: amount.to_string(),
                reason: format!("Call failed: {:?} - {}", code, msg),
            }))
        }
    }
}