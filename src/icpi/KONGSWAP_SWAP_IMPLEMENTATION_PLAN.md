# Kongswap Swap Execution Implementation Plan

## Current State

The backend has rebalancing logic and can get price quotes from Kongswap, but **cannot execute actual swaps**. The `execute_swap()` function in `src/icpi_backend/src/kongswap.rs:131` has a TODO comment indicating it only returns quotes.

## Goal

Implement full Kongswap swap execution to enable the hourly rebalancing mechanism to buy/sell tokens as needed.

---

## Implementation Steps

### Step 1: Add Kongswap Type Definitions

**File**: `src/icpi_backend/src/types.rs`

Add the following type definitions based on kong-reference source:

```rust
// Kongswap swap types (from kong-reference/src/kong_backend/src/swap/)
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct SwapArgs {
    pub pay_token: String,
    pub pay_amount: Nat,
    pub pay_tx_id: Option<u64>,  // None for ICRC2 flow, Some(tx_id) for ICRC1 flow
    pub receive_token: String,
    pub receive_amount: Option<Nat>,
    pub receive_address: Option<String>,
    pub max_slippage: Option<f64>,
    pub referred_by: Option<String>,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct SwapTxReply {
    pub pool_symbol: String,
    pub pay_chain: String,
    pub pay_address: String,
    pub pay_symbol: String,
    pub pay_amount: Nat,
    pub receive_chain: String,
    pub receive_address: String,
    pub receive_symbol: String,
    pub receive_amount: Nat,
    pub price: f64,
    pub lp_fee: Nat,
    pub gas_fee: Nat,
    pub ts: u64,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct SwapReply {
    pub tx_id: u64,
    pub request_id: u64,
    pub status: String,
    pub pay_chain: String,
    pub pay_address: String,
    pub pay_symbol: String,
    pub pay_amount: Nat,
    pub receive_chain: String,
    pub receive_address: String,
    pub receive_symbol: String,
    pub receive_amount: Nat,
    pub mid_price: f64,
    pub price: f64,
    pub slippage: f64,
    pub txs: Vec<SwapTxReply>,
    pub transfer_ids: Vec<TransferIdReply>,
    pub claim_ids: Vec<u64>,
    pub ts: u64,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct TransferIdReply {
    pub transfer_id: u64,
    pub transfer_type: String,
    pub token: String,
    pub amount: Nat,
}
```

### Step 2: Implement ICRC2 Approve Helper

**File**: `src/icpi_backend/src/icrc_types.rs`

Add a helper function to approve Kongswap to spend tokens:

```rust
// ICRC2 Approve result types
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

/// Approve Kongswap to spend tokens on behalf of ICPI canister
pub async fn approve_kongswap_spending(
    token_canister: Principal,
    amount: Nat,
) -> Result<Nat, String> {
    let kongswap_backend = Principal::from_text("2ipq2-uqaaa-aaaar-qailq-cai")
        .map_err(|e| format!("Invalid Kongswap principal: {}", e))?;

    let args = ApproveArgs {
        from_subaccount: None,
        spender: Account {
            owner: kongswap_backend,
            subaccount: None,
        },
        amount: amount.clone(),
        expected_allowance: None,
        expires_at: None,
        fee: None,
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
```

### Step 3: Implement Actual Swap Execution

**File**: `src/icpi_backend/src/kongswap.rs`

Replace the `execute_swap()` function (lines 107-146):

```rust
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
        Err(e) => {
            return Err(format!("Swap quote call failed: {:?}", e));
        }
    };

    // Step 2: Check slippage
    if let Some(max_slip) = max_slippage {
        if quote.slippage > max_slip {
            return Err(format!("Slippage {} exceeds max {}", quote.slippage, max_slip));
        }
    }

    ic_cdk::println!("Quote OK: slippage={}, price={}", quote.slippage, quote.price);

    // Step 3: Get token canister ID for approval
    let pay_token = TrackedToken::from_symbol(&pay_symbol)?;
    let pay_token_canister = pay_token.get_canister_id()?;

    // Step 4: Approve Kongswap to spend tokens
    ic_cdk::println!("Approving Kongswap to spend {} {}", pay_amount, pay_symbol);
    crate::icrc_types::approve_kongswap_spending(pay_token_canister, pay_amount.clone()).await
        .map_err(|e| format!("Approval failed: {}", e))?;

    // Step 5: Execute the swap
    let swap_args = SwapArgs {
        pay_token: pay_symbol.clone(),
        pay_amount: pay_amount.clone(),
        pay_tx_id: None,  // Use ICRC2 flow (approve + transfer_from)
        receive_token: receive_symbol.clone(),
        receive_amount: None,  // Let Kongswap calculate
        receive_address: None,  // Send to caller (ICPI canister)
        max_slippage,
        referred_by: None,
    };

    ic_cdk::println!("Calling Kongswap swap method...");
    let swap_result: CallResult<(Result<SwapReply, String>,)> =
        ic_cdk::call(kongswap, "swap", (swap_args,)).await;

    match swap_result {
        Ok((Ok(reply),)) => {
            ic_cdk::println!("Swap successful!");
            ic_cdk::println!("  Paid: {} {}", reply.pay_amount, reply.pay_symbol);
            ic_cdk::println!("  Received: {} {}", reply.receive_amount, reply.receive_symbol);
            ic_cdk::println!("  Price: {}, Slippage: {}", reply.price, reply.slippage);
            Ok(reply)
        },
        Ok((Err(e),)) => {
            Err(format!("Swap failed: {}", e))
        },
        Err(e) => {
            Err(format!("Swap call failed: {:?}", e))
        }
    }
}
```

### Step 4: Add Token Symbol Parsing

**File**: `src/icpi_backend/src/types.rs`

Add a method to parse token symbols:

```rust
impl TrackedToken {
    pub fn from_symbol(symbol: &str) -> Result<Self, String> {
        match symbol {
            "ALEX" => Ok(TrackedToken::ALEX),
            "ZERO" => Ok(TrackedToken::ZERO),
            "KONG" => Ok(TrackedToken::KONG),
            "BOB" => Ok(TrackedToken::BOB),
            _ => Err(format!("Unknown token symbol: {}", symbol)),
        }
    }
}
```

### Step 5: Update Rebalancer to Use New Swap Function

The rebalancer already calls `execute_swap()` correctly at:
- Line 111 in `src/icpi_backend/src/rebalancer.rs` (for buys)
- Line 138 in `src/icpi_backend/src/rebalancer.rs` (for sells)

No changes needed - it will automatically use the new implementation.

---

## Testing Plan

### Test 1: Deploy to Mainnet
```bash
./deploy.sh --network ic
```

### Test 2: Verify Swap Types are Correct
```bash
dfx canister --network ic call icpi_backend test_kongswap_connection
```

### Test 3: Manual Rebalance (Small Amount)
```bash
# Trigger a manual rebalance to test the full flow
dfx canister --network ic call icpi_backend trigger_manual_rebalance
```

### Test 4: Check Rebalancer Status
```bash
dfx canister --network ic call icpi_backend get_rebalancer_status
```

### Test 5: Monitor Logs
Watch the replica logs for approval and swap execution messages.

---

## Risk Mitigation

1. **Start Small**: The rebalancing logic already uses 10% of deviation for trade size
2. **Slippage Protection**: Max 2% slippage is enforced in `execute_buy()` and `execute_sell()`
3. **Sequential Execution**: Only one trade per hour, aligns with CLAUDE.md guidelines
4. **Real Balances**: No persistent storage - always queries actual token balances
5. **Approval Per Swap**: Each swap requires a fresh approval, limiting exposure

---

## Success Criteria

- ✅ Backend deploys without errors
- ✅ Manual rebalance executes successfully
- ✅ Tokens are transferred correctly (verify with balance queries)
- ✅ Rebalancer status shows successful swap in history
- ✅ Hourly timer continues to run and executes trades when needed

---

## References

- Kongswap swap implementation: `kong-reference/src/kong_backend/src/swap/`
- ICRC2 approve standard: [ICRC-2 Specification](https://github.com/dfinity/ICRC-1/blob/main/standards/ICRC-2/README.md)
- Kongswap backend canister: `2ipq2-uqaaa-aaaar-qailq-cai`
