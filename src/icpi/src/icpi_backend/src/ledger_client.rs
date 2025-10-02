use candid::{Nat, Principal};
use crate::icrc_types::{Account, TransferArgs, TransferError};

// ICPI Token Ledger Canister ID
const ICPI_LEDGER_CANISTER: &str = "l6lep-niaaa-aaaap-qqeda-cai";

// Mint ICPI tokens by transferring from the ledger's minting account to user
// Backend canister must be the minting authority for the ICPI ledger
pub async fn mint_icpi_tokens(to: Principal, amount: Nat) -> Result<Nat, String> {
    let ledger = Principal::from_text(ICPI_LEDGER_CANISTER)
        .map_err(|e| format!("Invalid ICPI ledger principal: {}", e))?;

    // As the minting authority, we transfer from the minting account (represented by our canister) to the user
    let transfer_args = TransferArgs {
        from_subaccount: None,
        to: Account {
            owner: to,
            subaccount: None
        },
        fee: None,
        created_at_time: None,
        memo: None,
        amount: amount.clone(),
    };

    let (result,): (Result<Nat, TransferError>,) = ic_cdk::call(
        ledger,
        "icrc1_transfer",
        (transfer_args,)
    ).await.map_err(|e| format!("ICPI ledger call failed: {:?}", e))?;

    result.map_err(|e| format!("ICPI transfer failed: {:?}", e))
}

// Query ICPI balance from ledger
pub async fn get_icpi_balance(owner: Principal) -> Result<Nat, String> {
    let ledger = Principal::from_text(ICPI_LEDGER_CANISTER)
        .map_err(|e| format!("Invalid ICPI ledger principal: {}", e))?;

    let account = Account {
        owner,
        subaccount: None,
    };

    let (balance,): (Nat,) = ic_cdk::call(
        ledger,
        "icrc1_balance_of",
        (account,)
    ).await.map_err(|e| format!("ICPI balance query failed: {:?}", e))?;

    Ok(balance)
}

// Query total ICPI supply from ledger
pub async fn get_icpi_total_supply() -> Result<Nat, String> {
    let ledger = Principal::from_text(ICPI_LEDGER_CANISTER)
        .map_err(|e| format!("Invalid ICPI ledger principal: {}", e))?;

    let (supply,): (Nat,) = ic_cdk::call(
        ledger,
        "icrc1_total_supply",
        ()
    ).await.map_err(|e| format!("ICPI supply query failed: {:?}", e))?;

    Ok(supply)
}
