use candid::{CandidType, Deserialize, Nat, Principal};

// ICRC1 Account type (validated from kong-reference)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<[u8; 32]>,
}

// ICRC2 TransferFromArgs for collecting deposits
#[derive(CandidType, Deserialize, Debug)]
pub struct TransferFromArgs {
    pub spender_subaccount: Option<[u8; 32]>,
    pub from: Account,
    pub to: Account,
    pub amount: Nat,
    pub fee: Option<Nat>,
    pub memo: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

// ICRC2 ApproveArgs
#[derive(CandidType, Deserialize, Debug)]
pub struct ApproveArgs {
    pub from_subaccount: Option<[u8; 32]>,
    pub spender: Account,
    pub amount: Nat,
    pub expected_allowance: Option<Nat>,
    pub expires_at: Option<u64>,
    pub fee: Option<Nat>,
    pub memo: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

// ICRC2 ApproveError
#[derive(CandidType, Deserialize, Debug)]
pub enum ApproveError {
    BadFee { expected_fee: Nat },
    InsufficientFunds { balance: Nat },
    AllowanceChanged { current_allowance: Nat },
    Expired { ledger_time: u64 },
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    Duplicate { duplicate_of: Nat },
    TemporarilyUnavailable,
    GenericError { error_code: Nat, message: String },
}

// ICRC1/ICRC2 Transfer errors
#[derive(CandidType, Deserialize, Debug)]
pub enum TransferFromError {
    BadFee { expected_fee: Nat },
    BadBurn { min_burn_amount: Nat },
    InsufficientFunds { balance: Nat },
    InsufficientAllowance { allowance: Nat },
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    Duplicate { duplicate_of: Nat },
    TemporarilyUnavailable,
    GenericError { error_code: Nat, message: String },
}

// ICRC1 Transfer args for sending tokens back to users
#[derive(CandidType, Deserialize, Debug)]
pub struct TransferArgs {
    pub from_subaccount: Option<[u8; 32]>,
    pub to: Account,
    pub amount: Nat,
    pub fee: Option<Nat>,
    pub memo: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

// ICRC1 Transfer error
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

// Constants
// Fee constants (ckUSDT uses 6 decimals, not 8 like ICP)
pub const FEE_AMOUNT: u64 = 1_000_000; // 1.0 ckUSDT = 1 * 10^6 (6 decimals)
pub const FEE_RECIPIENT: &str = "e454q-riaaa-aaaap-qqcyq-cai";
pub const CKUSDT_CANISTER: &str = "cngnf-vqaaa-aaaar-qag4q-cai";
pub const CKUSDT_DECIMALS: u8 = 6;     // ckUSDT has 6 decimal places
pub const ICPI_DECIMALS: u8 = 8;       // ICPI has 8 decimal places (like ICP)

// Helper to collect fee from user
pub async fn collect_fee(user: Principal) -> Result<Nat, String> {
    let ckusdt = Principal::from_text(CKUSDT_CANISTER)
        .map_err(|e| format!("Invalid CKUSDT principal: {}", e))?;

    let fee_recipient = Principal::from_text(FEE_RECIPIENT)
        .map_err(|e| format!("Invalid fee recipient principal: {}", e))?;

    let args = TransferFromArgs {
        spender_subaccount: None,
        from: Account {
            owner: user,
            subaccount: None,
        },
        to: Account {
            owner: fee_recipient,
            subaccount: None,
        },
        amount: Nat::from(FEE_AMOUNT),
        fee: None,
        memo: Some(b"ICPI operation fee".to_vec()),
        created_at_time: Some(ic_cdk::api::time()),
    };

    let result: Result<(Result<Nat, TransferFromError>,), _> =
        ic_cdk::call(ckusdt, "icrc2_transfer_from", (args,)).await;

    match result {
        Ok((Ok(block_index),)) => Ok(block_index),
        Ok((Err(e),)) => Err(format!("Fee transfer failed: {:?}", e)),
        Err((code, msg)) => Err(format!("Inter-canister call failed: {:?} - {}", code, msg)),
    }
}

// Helper to collect deposit from user
pub async fn collect_deposit(
    user: Principal,
    amount: Nat,
    memo: String,
) -> Result<Nat, String> {
    let ckusdt = Principal::from_text(CKUSDT_CANISTER)
        .map_err(|e| format!("Invalid CKUSDT principal: {}", e))?;

    let args = TransferFromArgs {
        spender_subaccount: None,
        from: Account {
            owner: user,
            subaccount: None,
        },
        to: Account {
            owner: ic_cdk::api::id(),
            subaccount: None,
        },
        amount: amount.clone(),
        fee: None,
        memo: Some(memo.as_bytes().to_vec()),
        created_at_time: Some(ic_cdk::api::time()),
    };

    let result: Result<(Result<Nat, TransferFromError>,), _> =
        ic_cdk::call(ckusdt, "icrc2_transfer_from", (args,)).await;

    match result {
        Ok((Ok(block_index),)) => Ok(block_index),
        Ok((Err(e),)) => Err(format!("Deposit transfer failed: {:?}", e)),
        Err((code, msg)) => Err(format!("Inter-canister call failed: {:?} - {}", code, msg)),
    }
}

// Helper to transfer tokens back to user (for refunds or redemptions)
pub async fn transfer_to_user(
    token_canister: Principal,
    user: Principal,
    amount: Nat,
    memo: String,
) -> Result<Nat, String> {
    let args = TransferArgs {
        from_subaccount: None,
        to: Account {
            owner: user,
            subaccount: None,
        },
        amount: amount.clone(),
        fee: None,
        memo: Some(memo.as_bytes().to_vec()),
        created_at_time: Some(ic_cdk::api::time()),
    };

    let result: Result<(Result<Nat, TransferError>,), _> =
        ic_cdk::call(token_canister, "icrc1_transfer", (args,)).await;

    match result {
        Ok((Ok(block_index),)) => Ok(block_index),
        Ok((Err(e),)) => Err(format!("Transfer failed: {:?}", e)),
        Err((code, msg)) => Err(format!("Inter-canister call failed: {:?} - {}", code, msg)),
    }
}

// Query ICRC1 balance
pub async fn query_icrc1_balance(
    token_canister: Principal,
    account_owner: Principal,
) -> Result<Nat, String> {
    let account = Account {
        owner: account_owner,
        subaccount: None,
    };

    let result: Result<(Nat,), _> =
        ic_cdk::call(token_canister, "icrc1_balance_of", (account,)).await;

    match result {
        Ok((balance,)) => Ok(balance),
        Err((code, msg)) => Err(format!("Balance query failed: {:?} - {}", code, msg)),
    }
}

/// Approve Kongswap to spend tokens on behalf of ICPI canister
/// Includes gas fee calculation for the approval itself
pub async fn approve_kongswap_spending(
    token_canister: Principal,
    amount: Nat,
) -> Result<Nat, String> {
    let kongswap_backend = Principal::from_text("2ipq2-uqaaa-aaaar-qailq-cai")
        .map_err(|e| format!("Invalid Kongswap principal: {}", e))?;

    // Get the fee for this token (usually 10000 for most ICRC tokens)
    let fee_result: Result<(Nat,), _> =
        ic_cdk::call(token_canister, "icrc1_fee", ()).await;

    let token_fee = fee_result
        .map(|(fee,)| fee)
        .unwrap_or_else(|_| Nat::from(10000u64));

    // Approval amount should include the fee
    let total_approval = amount + token_fee.clone();

    let args = ApproveArgs {
        from_subaccount: None,
        spender: Account {
            owner: kongswap_backend,
            subaccount: None,
        },
        amount: total_approval,
        expected_allowance: None,
        expires_at: None,
        fee: Some(token_fee),
        memo: Some(b"ICPI rebalance approval".to_vec()),
        created_at_time: Some(ic_cdk::api::time()),
    };

    let result: Result<(Result<Nat, ApproveError>,), _> =
        ic_cdk::call(token_canister, "icrc2_approve", (args,)).await;

    match result {
        Ok((Ok(block_index),)) => {
            ic_cdk::println!("Approval successful, block: {}", block_index);
            Ok(block_index)
        },
        Ok((Err(e),)) => Err(format!("Approval failed: {:?}", e)),
        Err((code, msg)) => Err(format!("Approval call failed: {:?} - {}", code, msg)),
    }
}