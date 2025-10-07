use candid::{Nat, Principal};
use ic_cdk::api::call::CallResult;
use crate::types::{
    Account, TrackedToken, CurrentPosition, CKUSDT_CANISTER_ID,
    validate_principal, decimal_to_f64
};
use crate::kongswap::get_token_price_in_usdt;
use rust_decimal::Decimal;
use std::str::FromStr;
use futures::future;

// Query token balance using ICRC1 standard
pub async fn get_token_balance(token: &TrackedToken) -> Result<Nat, String> {
    let token_canister = token.get_canister_id()?;
    let icpi_canister = ic_cdk::id();

    let account = Account {
        owner: icpi_canister,
        subaccount: None,
    };

    ic_cdk::println!("Querying balance for {:?} from canister {}", token, token_canister);

    let call_result: CallResult<(Nat,)> =
        ic_cdk::call(token_canister, "icrc1_balance_of", (account,)).await;

    match call_result {
        Ok((balance,)) => {
            ic_cdk::println!("{:?} balance: {}", token, balance);
            Ok(balance)
        }
        Err(e) => {
            let error_msg = format!("Failed to get balance for {:?}: {:?}", token, e);
            ic_cdk::println!("{}", error_msg);
            Err(error_msg)
        }
    }
}

// Get ckUSDT balance for rebalancing
pub async fn get_ckusdt_balance() -> Result<Nat, String> {
    let ckusdt_canister = validate_principal(CKUSDT_CANISTER_ID)?;
    let icpi_canister = ic_cdk::id();

    let account = Account {
        owner: icpi_canister,
        subaccount: None,
    };

    let call_result: CallResult<(Nat,)> =
        ic_cdk::call(ckusdt_canister, "icrc1_balance_of", (account,)).await;

    match call_result {
        Ok((balance,)) => {
            ic_cdk::println!("ckUSDT balance: {}", balance);
            Ok(balance)
        }
        Err(e) => {
            let error_msg = format!("Failed to get ckUSDT balance: {:?}", e);
            ic_cdk::println!("{}", error_msg);
            Err(error_msg)
        }
    }
}

// Get all current balances with USD values
pub async fn get_current_positions() -> Result<Vec<CurrentPosition>, String> {
    let tokens = TrackedToken::all();

    // Launch all balance and price queries in parallel
    let balance_futures: Vec<_> = tokens.iter()
        .map(|token| get_token_balance(token))
        .collect();

    let price_futures: Vec<_> = tokens.iter()
        .map(|token| get_token_price_in_usdt(token))
        .collect();

    // Await all balance queries in parallel
    let balances = futures::future::join_all(balance_futures).await;

    // Await all price queries in parallel
    let prices = futures::future::join_all(price_futures).await;

    // Process results
    let mut positions = Vec::new();
    let mut total_value = Decimal::ZERO;

    for (i, token) in tokens.iter().enumerate() {
        let balance = match &balances[i] {
            Ok(bal) => bal.clone(),
            Err(e) => {
                ic_cdk::println!("Error getting balance for {:?}: {}", token, e);
                Nat::from(0u64)
            }
        };

        let price = match &prices[i] {
            Ok(p) => *p,
            Err(e) => {
                ic_cdk::println!("Error getting price for {:?}: {}", token, e);
                Decimal::ZERO
            }
        };

        // Calculate USD value (balance * price / 10^decimals)
        let balance_decimal = Decimal::from_str(&balance.to_string())
            .map_err(|e| format!("Decimal conversion error: {}", e))?;
        let decimals_factor = Decimal::from(10u128.pow(token.get_decimals() as u32));
        let usd_value = if decimals_factor > Decimal::ZERO {
            (balance_decimal * price) / decimals_factor
        } else {
            Decimal::ZERO
        };

        total_value += usd_value;

        positions.push(CurrentPosition {
            token: token.clone(),
            balance: balance.clone(),
            usd_value: decimal_to_f64(usd_value),
            percentage: 0.0, // Calculate after total
        });
    }

    // CRITICAL: Also include ckUSDT balance in positions
    let ckusdt_balance = get_ckusdt_balance().await.unwrap_or_else(|e| {
        ic_cdk::println!("Error getting ckUSDT balance: {}", e);
        Nat::from(0u64)
    });

    if ckusdt_balance > Nat::from(0u64) {
        // ckUSDT has 6 decimals, price is always 1.0 USD
        let ckusdt_balance_decimal = Decimal::from_str(&ckusdt_balance.to_string())
            .unwrap_or(Decimal::ZERO);
        let ckusdt_value = ckusdt_balance_decimal / Decimal::from(1_000_000); // e6 to USD

        total_value += ckusdt_value;

        // Add ckUSDT as a position
        positions.push(CurrentPosition {
            token: TrackedToken::ckUSDT,
            balance: ckusdt_balance.clone(),
            usd_value: decimal_to_f64(ckusdt_value),
            percentage: 0.0, // Calculate after total
        });

        ic_cdk::println!("ckUSDT balance: {} (${:.2})", ckusdt_balance, decimal_to_f64(ckusdt_value));
    }

    // Calculate percentages
    let total_value_f64 = decimal_to_f64(total_value);
    for position in positions.iter_mut() {
        if total_value_f64 > 0.0 {
            position.percentage = (position.usd_value / total_value_f64) * 100.0;
        }
    }

    ic_cdk::println!("Total portfolio value: ${}", total_value_f64);

    Ok(positions)
}

// Transfer tokens (for rebalancing)
pub async fn transfer_token(
    token: &TrackedToken,
    to: Principal,
    amount: Nat,
) -> Result<Nat, String> {
    let token_canister = token.get_canister_id()?;

    let transfer_args = TransferArg {
        to: Account {
            owner: to,
            subaccount: None,
        },
        amount: amount.clone(),
        fee: None,
        memo: None,
        from_subaccount: None,
        created_at_time: None,
    };

    ic_cdk::println!("Transferring {} {:?} to {}", amount, token, to);

    let call_result: CallResult<(TransferResult,)> =
        ic_cdk::call(token_canister, "icrc1_transfer", (transfer_args,)).await;

    match call_result {
        Ok((TransferResult::Ok(block_index),)) => {
            ic_cdk::println!("Transfer successful. Block index: {}", block_index);
            Ok(block_index)
        }
        Ok((TransferResult::Err(e),)) => {
            Err(format!("Transfer failed: {:?}", e))
        }
        Err(e) => {
            Err(format!("Transfer call failed: {:?}", e))
        }
    }
}

// Helper types for ICRC1 transfers
#[derive(candid::CandidType, candid::Deserialize)]
struct TransferArg {
    to: Account,
    amount: Nat,
    fee: Option<Nat>,
    memo: Option<Vec<u8>>,
    from_subaccount: Option<[u8; 32]>,
    created_at_time: Option<u64>,
}

#[derive(candid::CandidType, candid::Deserialize, Debug)]
enum TransferResult {
    Ok(Nat),
    Err(TransferError),
}

#[derive(candid::CandidType, candid::Deserialize, Debug)]
enum TransferError {
    BadFee { expected_fee: Nat },
    BadBurn { min_burn_amount: Nat },
    InsufficientFunds { balance: Nat },
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    TemporarilyUnavailable,
    Duplicate { duplicate_of: Nat },
    GenericError { error_code: Nat, message: String },
}

// Get balance summary for all tracked tokens
pub async fn get_balance_summary() -> Result<BalanceSummary, String> {
    let positions = get_current_positions().await?;
    let ckusdt_balance = get_ckusdt_balance().await?;

    let total_value = positions.iter()
        .fold(0.0, |acc, p| acc + p.usd_value);

    Ok(BalanceSummary {
        total_value_usd: total_value,
        positions,
        ckusdt_balance,
        timestamp: ic_cdk::api::time(),
    })
}

#[derive(candid::CandidType, candid::Deserialize, serde::Serialize, Debug)]
pub struct BalanceSummary {
    pub total_value_usd: f64,
    pub positions: Vec<CurrentPosition>,
    pub ckusdt_balance: Nat,
    pub timestamp: u64,
}

// Safe token balance query with fallback
pub async fn get_token_balance_safe(token: &TrackedToken) -> Nat {
    match get_token_balance(token).await {
        Ok(balance) => balance,
        Err(e) => {
            ic_cdk::println!("Balance query failed for {:?}: {}, returning 0", token, e);
            Nat::from(0u64)
        }
    }
}

// Batch query all balances
pub async fn get_all_balances() -> Vec<(TrackedToken, Nat)> {
    let tokens = vec![
        TrackedToken::ALEX,
        TrackedToken::ZERO,
        TrackedToken::KONG,
        TrackedToken::BOB,
    ];

    let mut balances = Vec::new();

    for token in tokens {
        let balance = get_token_balance_safe(&token).await;
        balances.push((token, balance));
    }

    balances
}