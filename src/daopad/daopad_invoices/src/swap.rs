use candid::{CandidType, Deserialize, Nat, Principal};
use ic_cdk::{api::call::call, println};
use crate::storage::update_invoice_crypto_amount_by_payment_id;
use crate::types::{Invoice, Collateral};
use crate::exchange_rate::get_icp_usd_rate;

#[derive(Debug)]
pub struct PaymentResult {
    pub block_index: Nat,
    pub crypto_amount: u64,
}

// ckUSDT canister ID
const CKUSDT_TOKEN_CANISTER_ID: &str = "cngnf-vqaaa-aaaar-qag4q-cai";

// ICP Ledger canister ID
const ICP_LEDGER_CANISTER_ID: &str = "ryjl3-tyaaa-aaaaa-aaaba-cai";

// Test recipient principal
const TEST_RECIPIENT: &str = "hjx3h-2xchk-gzduk-p64pi-lc63o-wiq3n-ys6pg-eo4k3-37x4z-6at5b-eqe";

// Helper function: Send ckUSDT tokens to recipient
pub async fn transfer_ckusdt(recipient: Principal, ckusdt_amount: u64) -> Result<Nat, String> {
    let to_account = Account {
        owner: recipient,
        subaccount: None,
    };

    let transfer_arg = TransferArg {
        to: to_account,
        fee: None,
        memo: None,
        from_subaccount: None,
        created_at_time: None,
        amount: Nat::from(ckusdt_amount),
    };

    let ckusdt_principal = Principal::from_text(CKUSDT_TOKEN_CANISTER_ID)
        .map_err(|e| format!("Invalid ckUSDT token principal: {}", e))?;

    let call_result: (Result<Nat, TransferError>,) = call(ckusdt_principal, "icrc1_transfer", (transfer_arg,))
        .await
        .map_err(|err| format!("Failed to transfer ckUSDT: {:?}", err))?;

    let result: Result<Nat, TransferError> = call_result.0;

    match result {
        Ok(block_index) => Ok(block_index),
        Err(error) => Err(format!("ckUSDT transfer failed: {:?}", error)),
    }
}

// Helper function: Send ICP tokens to recipient
pub async fn transfer_icp(recipient: Principal, icp_amount_e8s: u64) -> Result<Nat, String> {
    let to_account = Account {
        owner: recipient,
        subaccount: None,
    };

    let transfer_arg = TransferArg {
        to: to_account,
        fee: None,
        memo: None,
        from_subaccount: None,
        created_at_time: None,
        amount: Nat::from(icp_amount_e8s),
    };

    let ledger_principal = Principal::from_text(ICP_LEDGER_CANISTER_ID)
        .map_err(|e| format!("Invalid ICP ledger principal: {}", e))?;

    let call_result: (Result<Nat, TransferError>,) = call(ledger_principal, "icrc1_transfer", (transfer_arg,))
        .await
        .map_err(|err| format!("Failed to transfer ICP: {:?}", err))?;

    let result: Result<Nat, TransferError> = call_result.0;

    match result {
        Ok(block_index) => Ok(block_index),
        Err(error) => Err(format!("ICP transfer failed: {:?}", error)),
    }
}

#[derive(CandidType, Deserialize)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<Vec<u8>>,
}

#[derive(CandidType)]
pub struct TransferArg {
    pub to: Account,
    pub fee: Option<Nat>,
    pub memo: Option<Vec<u8>>,
    pub from_subaccount: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
    pub amount: Nat,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum TransferError {
    BadFee { expected_fee: Nat },
    BadBurn { min_burn_amount: Nat },
    InsufficientFunds { balance: Nat },
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    Duplicate { duplicate_of: Nat },
    TemporarilyUnavailable,
    GenericError { error_code: Nat, message: String },
}

// Test function: Send 5 ckUSDT tokens (equivalent to $5) to test recipient
#[ic_cdk::update]
pub async fn test_send_ckusdt() -> Result<String, String> {
    println!("Sending 5 ckUSDT tokens to test recipient");

    let recipient = Principal::from_text(TEST_RECIPIENT)
        .map_err(|e| format!("Invalid recipient principal: {}", e))?;

    let ckusdt_tokens = 5_000_000u64; // 5 ckUSDT tokens (5 * 10^6 because ckUSDT has 6 decimals)

    let block_index = transfer_ckusdt(recipient, ckusdt_tokens).await?;

    println!(
        "ckUSDT transfer successful, block index: {}",
        block_index
    );
    Ok(format!(
        "Successfully sent 5 ckUSDT tokens ($5.00), block index: {}",
        block_index
    ))
}

// Main webhook processing function: Handle payment based on invoice collateral type
pub async fn process_payment(invoice: Invoice, amount_cents: u64) -> Result<PaymentResult, String> {
    println!(
        "Processing payment of {} cents for invoice {} with collateral: {:?}",
        amount_cents,
        invoice.id,
        invoice.collateral
    );

    match invoice.collateral {
        Collateral::ckUSDT => {
            process_ckusdt_payment(&invoice, amount_cents).await
        }
        Collateral::ICP => {
            process_icp_payment(&invoice, amount_cents).await
        }
    }
}

// Process ckUSDT payment to receiver
async fn process_ckusdt_payment(invoice: &Invoice, amount_cents: u64) -> Result<PaymentResult, String> {
    println!("Processing ckUSDT payment - calculating crypto amount");

    // ckUSDT uses 6 decimals, so 1 USD = 1,000,000 ckUSDT tokens
    // amount_cents * 10,000 converts cents to ckUSDT tokens with proper decimals
    let crypto_amount = amount_cents * 10_000;

    println!("Calculated ckUSDT amount: {} for invoice {}", crypto_amount, invoice.id);

    // Update invoice crypto amount before transfer
    if update_invoice_crypto_amount_by_payment_id(&invoice.id, crypto_amount) {
        println!("Updated invoice crypto amount to {} for invoice {}", crypto_amount, invoice.id);
    } else {
        return Err(format!("Failed to update invoice crypto amount for invoice {}", invoice.id));
    }

    println!(
        "Sending {} ckUSDT tokens to receiver {}",
        crypto_amount, invoice.receiver.to_text()
    );

    // Send ckUSDT tokens directly to the receiver
    let block_index = transfer_ckusdt(invoice.receiver, crypto_amount).await?;

    println!(
        "Sent {} ckUSDT tokens to receiver {}, block: {}",
        crypto_amount, invoice.receiver.to_text(), block_index
    );

    Ok(PaymentResult {
        block_index,
        crypto_amount,
    })
}

// Process ICP payment - uses real exchange rate and ICP ledger transfer
async fn process_icp_payment(invoice: &Invoice, amount_cents: u64) -> Result<PaymentResult, String> {
    println!("Processing ICP payment - calculating crypto amount");

    // Get real ICP/USD exchange rate from XRC
    let icp_rate = get_icp_usd_rate().await?;
    println!("Current ICP/USD rate: ${}", icp_rate);

    let usd_amount = amount_cents as f64 / 100.0; // Convert cents to USD
    let icp_amount = usd_amount / icp_rate; // USD / (USD per ICP) = ICP
    // ICP uses 8 decimals
    let crypto_amount = (icp_amount * 100_000_000.0) as u64;

    println!("Calculated ICP amount: {} tokens ({} ICP) for invoice {}", crypto_amount, icp_amount, invoice.id);

    // Update invoice crypto amount before transfer
    if update_invoice_crypto_amount_by_payment_id(&invoice.id, crypto_amount) {
        println!("Updated invoice crypto amount to {} for invoice {}", crypto_amount, invoice.id);
    } else {
        return Err(format!("Failed to update invoice crypto amount for invoice {}", invoice.id));
    }

    println!(
        "Sending {} ICP tokens to receiver {}",
        crypto_amount, invoice.receiver.to_text()
    );

    // Send ICP tokens to the receiver using ICP ledger
    let block_index = transfer_icp(invoice.receiver, crypto_amount).await?;

    println!(
        "Sent {} ICP tokens to receiver {}, block: {}",
        crypto_amount, invoice.receiver.to_text(), block_index
    );

    Ok(PaymentResult {
        block_index,
        crypto_amount,
    })
}
