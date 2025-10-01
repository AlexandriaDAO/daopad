use candid::{CandidType, Deserialize, Principal, Nat};
use ic_cdk::api::call::CallResult;
use crate::types::{
    KONGSWAP_BACKEND_ID, validate_principal,
    LPBalancesReply, UserBalancesReply, UserBalancesResult,
    SwapAmountsReply, SwapAmountsResult, TrackedToken,
    SwapArgs, SwapReply, TxId
};
use rust_decimal::Decimal;
use std::str::FromStr;

// Query LP positions for a specific lock canister
pub async fn get_lp_positions(lock_canister: Principal) -> Result<Vec<LPBalancesReply>, String> {
    let kongswap = validate_principal(KONGSWAP_BACKEND_ID)?;

    // Convert Principal to text for the call
    let canister_text = lock_canister.to_text();

    let call_result: CallResult<(UserBalancesResult,)> =
        ic_cdk::call(kongswap, "user_balances", (canister_text,)).await;

    match call_result {
        Ok((UserBalancesResult::Ok(replies),)) => {
            // Extract LP positions only
            let lp_positions: Vec<LPBalancesReply> = replies.into_iter()
                .filter_map(|reply| match reply {
                    UserBalancesReply::LP(lp) => Some(lp),
                })
                .collect();

            ic_cdk::println!("Retrieved {} LP positions for canister {}",
                lp_positions.len(), lock_canister.to_text());

            Ok(lp_positions)
        },
        Ok((UserBalancesResult::Err(e),)) => {
            let error_msg = format!("Kongswap error: {}", e);
            ic_cdk::println!("{}", error_msg);
            Err(error_msg)
        },
        Err(e) => {
            let error_msg = format!("Call failed: {:?}", e);
            ic_cdk::println!("{}", error_msg);
            Err(error_msg)
        }
    }
}

// Get token price using swap_amounts
pub async fn get_token_price_in_usdt(token: &TrackedToken) -> Result<Decimal, String> {
    let kongswap = validate_principal(KONGSWAP_BACKEND_ID)?;
    let token_symbol = token.to_symbol();

    // Query price for 1 token (with proper decimals)
    let decimals = token.get_decimals();
    let amount = Nat::from(10u128.pow(decimals as u32));

    ic_cdk::println!("Querying price for {} (amount: {})", token_symbol, amount);

    let call_result: CallResult<(SwapAmountsResult,)> =
        ic_cdk::call(kongswap, "swap_amounts",
            (token_symbol.to_string(), amount.clone(), "ckUSDT".to_string())).await;

    match call_result {
        Ok((SwapAmountsResult::Ok(reply),)) => {
            // Convert price to Decimal for precision
            let price = Decimal::from_str(&reply.price.to_string())
                .map_err(|e| format!("Decimal conversion error: {}", e))?;

            ic_cdk::println!("Price for {}: {}", token_symbol, price);
            Ok(price)
        },
        Ok((SwapAmountsResult::Err(_),)) => {
            // Try reverse direction if direct pair doesn't exist
            ic_cdk::println!("Direct pair not found, trying reverse for {}", token_symbol);

            let reverse_result: CallResult<(SwapAmountsResult,)> =
                ic_cdk::call(kongswap, "swap_amounts",
                    ("ckUSDT".to_string(), Nat::from(1_000_000u128), token_symbol.to_string())).await;

            match reverse_result {
                Ok((SwapAmountsResult::Ok(reply),)) => {
                    // Calculate inverse price
                    let price_str = reply.price.to_string();
                    let price_decimal = Decimal::from_str(&price_str)
                        .map_err(|e| format!("Decimal conversion error: {}", e))?;

                    if price_decimal == Decimal::ZERO {
                        return Err(format!("Zero price for {}", token_symbol));
                    }

                    let inverse_price = Decimal::from(1) / price_decimal;
                    ic_cdk::println!("Inverse price for {}: {}", token_symbol, inverse_price);
                    Ok(inverse_price)
                },
                _ => Err(format!("No price available for {}", token_symbol))
            }
        },
        Err(e) => {
            let error_msg = format!("Price query failed for {}: {:?}", token_symbol, e);
            ic_cdk::println!("{}", error_msg);
            Err(error_msg)
        }
    }
}

// Execute a swap on Kongswap
pub async fn execute_swap(
    pay_symbol: String,
    pay_amount: Nat,
    receive_symbol: String,
    max_slippage: Option<f64>,
) -> Result<SwapReply, String> {
    let kongswap = validate_principal(KONGSWAP_BACKEND_ID)?;

    ic_cdk::println!("Executing swap: {} {} -> {}", pay_amount, pay_symbol, receive_symbol);

    // Step 1: Get quote to verify swap is viable
    let quote_result: CallResult<(SwapAmountsResult,)> =
        ic_cdk::call(kongswap, "swap_amounts",
            (pay_symbol.clone(), pay_amount.clone(), receive_symbol.clone())).await;

    let quote = match quote_result {
        Ok((SwapAmountsResult::Ok(q),)) => q,
        Ok((SwapAmountsResult::Err(e),)) => {
            return Err(format!("Swap quote error: {}", e));
        },
        Err((code, msg)) => {
            return Err(format!("Swap quote call failed: {:?} - {}", code, msg));
        }
    };

    // Step 2: Check slippage
    let actual_slippage = quote.slippage;
    let max_slip = max_slippage.unwrap_or(2.0); // Default 2% max slippage

    if actual_slippage > max_slip {
        return Err(format!("Slippage {:.2}% exceeds max {:.2}%",
            actual_slippage, max_slip));
    }

    ic_cdk::println!("Quote OK: slippage={:.2}%, price={}",
        actual_slippage, quote.price);

    // Step 3: Determine if we need approval (for non-ICP tokens)
    let needs_approval = pay_symbol != "ICP";

    if needs_approval {
        // Get token canister ID for approval
        let pay_token = TrackedToken::from_symbol(&pay_symbol)?;
        let pay_token_canister = pay_token.get_canister_id()?;

        // Step 4: Approve Kongswap to spend tokens
        ic_cdk::println!("Approving Kongswap to spend {} {}", pay_amount, pay_symbol);

        // Include gas fee in the approval amount
        let gas_fee = Nat::from(10000u64); // Standard gas fee
        let total_amount = pay_amount.clone() + gas_fee;

        crate::icrc_types::approve_kongswap_spending(pay_token_canister, total_amount).await
            .map_err(|e| format!("Approval failed: {}", e))?;
    }

    // Step 5: Execute the swap
    let swap_args = SwapArgs {
        pay_token: pay_symbol.clone(),
        pay_amount: pay_amount.clone(),
        pay_tx_id: None,  // Use ICRC2 flow (approve + transfer_from)
        receive_token: receive_symbol.clone(),
        receive_amount: None,  // Let Kongswap calculate based on current price
        receive_address: None,  // Send to caller (ICPI canister)
        max_slippage: Some(max_slip),
        referred_by: None,
    };

    ic_cdk::println!("Calling Kongswap swap method...");
    let swap_result: CallResult<(Result<SwapReply, String>,)> =
        ic_cdk::call(kongswap, "swap", (swap_args,)).await;

    match swap_result {
        Ok((Ok(reply),)) => {
            ic_cdk::println!("Swap successful!");
            ic_cdk::println!("  TX ID: {}", reply.tx_id);
            ic_cdk::println!("  Paid: {} {}", reply.pay_amount, reply.pay_symbol);
            ic_cdk::println!("  Received: {} {}", reply.receive_amount, reply.receive_symbol);
            ic_cdk::println!("  Price: {}, Slippage: {:.2}%", reply.price, reply.slippage);
            ic_cdk::println!("  Status: {}", reply.status);

            // Verify the swap completed
            if reply.status != "SUCCESS" && reply.status != "PENDING" {
                return Err(format!("Swap status not successful: {}", reply.status));
            }

            Ok(reply)
        },
        Ok((Err(e),)) => {
            Err(format!("Swap failed: {}", e))
        },
        Err((code, msg)) => {
            Err(format!("Swap call failed: {:?} - {}", code, msg))
        }
    }
}

// Batch query LP positions for multiple canisters
pub async fn batch_query_lp_positions(
    lock_canisters: Vec<Principal>,
    batch_size: usize,
) -> Vec<Result<Vec<LPBalancesReply>, String>> {
    let mut results = Vec::new();

    for chunk in lock_canisters.chunks(batch_size) {
        // Process batch sequentially to avoid overwhelming Kongswap
        for canister in chunk {
            let result = get_lp_positions(*canister).await;
            results.push(result);
        }
    }

    results
}

// Get prices for all tracked tokens
pub async fn get_all_token_prices() -> Vec<(TrackedToken, Result<Decimal, String>)> {
    let tokens = vec![
        TrackedToken::ALEX,
        TrackedToken::ZERO,
        TrackedToken::KONG,
        TrackedToken::BOB,
    ];

    let mut prices = Vec::new();

    // Query prices sequentially (Principle 2: Sequential execution)
    for token in tokens {
        let price_result = get_token_price_in_usdt(&token).await;
        prices.push((token, price_result));
    }

    prices
}