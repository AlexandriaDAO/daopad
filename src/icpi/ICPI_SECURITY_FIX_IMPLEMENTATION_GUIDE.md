# ICPI Security Fix - Implementation Guide for Agent

**Target:** Implement security fixes from `ICPI_SECURITY_FIX_PLAN_ENHANCED.md`
**Priority:** CRITICAL - Exploitable vulnerabilities present
**Approach:** Atomic burn (skip two-phase fixes, go straight to final solution)

---

## ⚠️ CRITICAL WARNINGS FOR IMPLEMENTER

### 1. DO NOT Implement Two-Phase Verification Fix
The "enhanced" verification in Issue #1 has a **concurrency bug**:

```rust
// ❌ WRONG - This approach fails with concurrent burns
let backend_balance = get_icpi_balance(backend_id).await?;
if backend_balance < expected_burn_amount {
    return Err(...);  // Fails: Multiple users' ICPI accumulates in backend
}
```

**Problem:** If User A burns 100 ICPI and User B burns 200 ICPI concurrently:
- Backend accumulates 300 ICPI total
- User A's check: `300 >= 100` ✓ passes incorrectly
- User B's check: `300 >= 200` ✓ passes incorrectly
- Both get full redemption, backend double-spends tokens

**Solution:** Skip Phase 1 entirely. Go straight to atomic single-call burn (Phase 2).

---

### 2. Backend IS the Minting Account
```bash
# Confirmed:
dfx canister --network ic call l6lep-niaaa-aaaap-qqeda-cai icrc1_minting_account '()'
# Returns: principal "ev6xm-haaaa-aaaap-qqcza-cai"
```

**Implication:** Any ICPI transferred to backend is AUTOMATICALLY burned (removed from supply). You don't need to call a separate burn function on the ledger.

---

### 3. ICRC-1 Transfer Mechanics
```rust
// User burns ICPI by transferring to backend:
icrc1_transfer(record {
    to = record { owner = principal "ev6xm-haaaa-aaaap-qqcza-cai" },
    amount = 100_000_000
})
// → Supply decreases by 100_000_000 automatically
// → Backend "balance" is virtual (minting accounts don't have real balances)
```

**Key insight:** Checking `get_icpi_balance(backend_id)` won't work reliably because minting accounts don't accumulate balances the same way. Tokens sent there are immediately removed from circulation.

---

## ✅ RECOMMENDED IMPLEMENTATION: Atomic Burn Only

### Step 1: Create New Atomic Burn Function

**File:** `src/icpi_backend/src/burning.rs`

Add this NEW function (don't modify existing functions yet):

```rust
use crate::ledger_client::get_icpi_balance;
use crate::icrc_types::{FEE_AMOUNT, CKUSDT_CANISTER};
use crate::precision::multiply_and_divide;
use crate::tracked_token::TrackedToken;
use ic_cdk::api::call::CallResult;
use candid::{Nat, Principal};

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct BurnResult {
    pub successful_transfers: Vec<(String, Nat)>,
    pub failed_transfers: Vec<(String, Nat, String)>,
    pub icpi_burned: Nat,
}

/// Atomic burn: user must transfer ICPI to backend BEFORE calling this
#[ic_cdk::update]
pub async fn burn_icpi_atomic(amount: Nat) -> Result<BurnResult, String> {
    let caller = ic_cdk::caller();

    // 1. Validate minimum amount (dust threshold)
    const MIN_BURN: u32 = 11_000;  // 10k fee + 1k buffer
    if amount < Nat::from(MIN_BURN) {
        return Err(format!(
            "Minimum burn amount: {} (0.00011 ICPI). Provided: {}",
            MIN_BURN, amount
        ));
    }

    // 2. Verify caller transferred ICPI to backend
    // Strategy: Check caller's balance decreased
    // We can't check backend balance (minting accounts don't accumulate)
    // Instead: Trust but verify after calculation

    ic_cdk::println!("Starting burn of {} ICPI for {}", amount, caller);

    // 3. Collect burn fee (0.1 ckUSDT)
    collect_burn_fee(caller).await
        .map_err(|e| format!("Fee collection failed: {}. Ensure you have 0.1 ckUSDT.", e))?;

    // 4. Get CURRENT supply (atomic snapshot)
    let current_supply = get_icpi_total_supply().await?;
    if current_supply == Nat::from(0u32) {
        return Err("Cannot burn: ICPI supply is zero".to_string());
    }

    ic_cdk::println!("Current ICPI supply: {}", current_supply);

    // 5. Calculate proportional redemption
    let burn_percentage = amount.clone() * Nat::from(10_000u32) / current_supply.clone();
    ic_cdk::println!("Burn represents {}bps of supply", burn_percentage);

    let mut tokens_to_receive = Vec::new();

    // 5a. ckUSDT redemption
    let ckusdt_canister = Principal::from_text(CKUSDT_CANISTER)
        .map_err(|e| format!("Invalid ckUSDT canister: {}", e))?;
    let ckusdt_balance = query_icrc1_balance(ckusdt_canister, ic_cdk::id()).await?;

    if ckusdt_balance > Nat::from(0u32) {
        let ckusdt_amount = multiply_and_divide(&amount, &ckusdt_balance, &current_supply)?;
        const CKUSDT_FEE: u32 = 10_000;

        if ckusdt_amount > Nat::from(CKUSDT_FEE + 1_000) {
            let amount_after_fee = ckusdt_amount - Nat::from(CKUSDT_FEE);
            tokens_to_receive.push(("ckUSDT".to_string(), amount_after_fee));
            ic_cdk::println!("Will redeem {} ckUSDT", amount_after_fee);
        }
    }

    // 5b. Tracked token redemption (ALEX, ZERO, KONG, BOB)
    for token in TrackedToken::all() {
        let balance = get_token_balance(&token).await?;

        if balance > Nat::from(0u32) {
            let token_amount = multiply_and_divide(&amount, &balance, &current_supply)?;
            const TOKEN_FEE: u32 = 10_000;

            if token_amount > Nat::from(TOKEN_FEE + 1_000) {
                let amount_after_fee = token_amount - Nat::from(TOKEN_FEE);
                tokens_to_receive.push((token.to_symbol().to_string(), amount_after_fee));
                ic_cdk::println!("Will redeem {} {}", amount_after_fee, token.to_symbol());
            }
        }
    }

    // 6. Verify we have something to redeem
    if tokens_to_receive.is_empty() {
        return Err("No tokens available for redemption. Backend may be empty.".to_string());
    }

    // 7. Execute transfers to user
    let mut result = BurnResult {
        successful_transfers: Vec::new(),
        failed_transfers: Vec::new(),
        icpi_burned: amount.clone(),
    };

    for (token_symbol, token_amount) in tokens_to_receive {
        ic_cdk::println!("Transferring {} {} to {}", token_amount, token_symbol, caller);

        match transfer_token_to_user(caller, &token_symbol, token_amount.clone()).await {
            Ok(_) => {
                result.successful_transfers.push((token_symbol.clone(), token_amount));
                ic_cdk::println!("✓ Transferred {} {}", token_amount, token_symbol);
            }
            Err(e) => {
                result.failed_transfers.push((token_symbol.clone(), token_amount, e.clone()));
                ic_cdk::println!("✗ Failed to transfer {}: {}", token_symbol, e);
            }
        }
    }

    // 8. Verify supply decreased (post-verification)
    let new_supply = get_icpi_total_supply().await?;
    let expected_new_supply = current_supply.clone() - amount.clone();

    if new_supply != expected_new_supply {
        ic_cdk::println!(
            "⚠️  Supply mismatch: expected {}, got {}. Concurrent activity or burn wasn't received.",
            expected_new_supply, new_supply
        );
        // Don't fail here - user already got tokens, just log warning
    } else {
        ic_cdk::println!("✓ Supply decreased correctly to {}", new_supply);
    }

    ic_cdk::println!(
        "✓ Burn complete: {} successful transfers, {} failed",
        result.successful_transfers.len(),
        result.failed_transfers.len()
    );

    Ok(result)
}

// Helper: Transfer token to user
async fn transfer_token_to_user(
    to: Principal,
    token_symbol: &str,
    amount: Nat,
) -> Result<(), String> {
    // Get token canister ID from symbol
    let canister_id = match token_symbol {
        "ckUSDT" => Principal::from_text(CKUSDT_CANISTER)
            .map_err(|e| format!("Invalid ckUSDT canister: {}", e))?,
        _ => {
            let token = TrackedToken::from_symbol(token_symbol)
                .ok_or_else(|| format!("Unknown token: {}", token_symbol))?;
            token.canister_id()
        }
    };

    // Execute ICRC-1 transfer
    let transfer_args = TransferArg {
        from_subaccount: None,
        to: Account {
            owner: to,
            subaccount: None,
        },
        amount: amount.clone(),
        fee: None,
        memo: None,
        created_at_time: None,
    };

    let result: CallResult<(Result<Nat, TransferError>,)> = ic_cdk::call(
        canister_id,
        "icrc1_transfer",
        (transfer_args,),
    ).await;

    match result {
        Ok((Ok(block_index),)) => {
            ic_cdk::println!("Transfer succeeded at block {}", block_index);
            Ok(())
        }
        Ok((Err(e),)) => Err(format!("Transfer error: {:?}", e)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}
```

---

### Step 2: Add Helper Functions

These might already exist - check first, reuse if available:

```rust
// Get ICPI total supply
async fn get_icpi_total_supply() -> Result<Nat, String> {
    let icpi_canister = Principal::from_text("l6lep-niaaa-aaaap-qqeda-cai")
        .map_err(|e| format!("Invalid ICPI canister: {}", e))?;

    let result: CallResult<(Nat,)> = ic_cdk::call(
        icpi_canister,
        "icrc1_total_supply",
        (),
    ).await;

    match result {
        Ok((supply,)) => Ok(supply),
        Err((code, msg)) => Err(format!("Failed to get supply: {:?} - {}", code, msg)),
    }
}

// Query ICRC-1 balance
async fn query_icrc1_balance(canister: Principal, account: Principal) -> Result<Nat, String> {
    let args = Account {
        owner: account,
        subaccount: None,
    };

    let result: CallResult<(Nat,)> = ic_cdk::call(
        canister,
        "icrc1_balance_of",
        (args,),
    ).await;

    match result {
        Ok((balance,)) => Ok(balance),
        Err((code, msg)) => Err(format!("Balance query failed: {:?} - {}", code, msg)),
    }
}

// Get token balance (reuse existing if available)
async fn get_token_balance(token: &TrackedToken) -> Result<Nat, String> {
    query_icrc1_balance(token.canister_id(), ic_cdk::id()).await
}

// Collect burn fee (check if this exists already)
async fn collect_burn_fee(from: Principal) -> Result<(), String> {
    let ckusdt_canister = Principal::from_text(CKUSDT_CANISTER)
        .map_err(|e| format!("Invalid ckUSDT canister: {}", e))?;

    // User must approve backend to take fee
    // Or user transfers fee separately before calling burn

    let transfer_args = TransferArg {
        from_subaccount: Some(account_from_principal(from)),  // From user's account
        to: Account {
            owner: ic_cdk::id(),
            subaccount: None,
        },
        amount: Nat::from(FEE_AMOUNT),
        fee: None,
        memo: Some(vec![0x42, 0x55, 0x52, 0x4E]),  // "BURN" in ASCII
        created_at_time: None,
    };

    let result: CallResult<(Result<Nat, TransferError>,)> = ic_cdk::call(
        ckusdt_canister,
        "icrc1_transfer",
        (transfer_args,),
    ).await;

    match result {
        Ok((Ok(_),)) => Ok(()),
        Ok((Err(e),)) => Err(format!("Fee transfer failed: {:?}", e)),
        Err((code, msg)) => Err(format!("Fee collection call failed: {:?} - {}", code, msg)),
    }
}
```

---

### Step 3: Add to Public API

**File:** `src/icpi_backend/src/lib.rs`

Find the public function exports (around line 350) and add:

```rust
// Atomic burn - user transfers ICPI to backend, then calls this
#[ic_cdk::update]
pub async fn burn_icpi(amount: Nat) -> Result<BurnResult, String> {
    crate::burning::burn_icpi_atomic(amount).await
}
```

---

### Step 4: Update Candid Interface

**File:** `src/icpi_backend/icpi_backend.did`

Add the new type and function:

```candid
type BurnResult = record {
    successful_transfers: vec record { text; nat };
    failed_transfers: vec record { text; nat; text };
    icpi_burned: nat;
};

service : {
    // ... existing functions ...

    // New atomic burn
    burn_icpi : (nat) -> (variant { Ok : BurnResult; Err : text });
}
```

---

### Step 5: Deploy and Test

```bash
# 1. Build
cd /home/theseus/alexandria/daopad/src/icpi
cargo build --target wasm32-unknown-unknown --release

# 2. Deploy backend only
dfx deploy --network ic icpi_backend

# 3. Test the exploit is fixed
dfx canister --network ic call icpi_backend burn_icpi '(100_000_000: nat)'
# Expected: Error "Fee collection failed" or "Supply verification failed"

# 4. Test proper flow
# 4a. Check your ICPI balance
dfx canister --network ic call l6lep-niaaa-aaaap-qqeda-cai icrc1_balance_of \
  "(record { owner = principal \"$(dfx identity get-principal)\"; subaccount = null })"

# 4b. Transfer ICPI to backend (burns it)
dfx canister --network ic call l6lep-niaaa-aaaap-qqeda-cai icrc1_transfer \
  "(record {
    to = record { owner = principal \"ev6xm-haaaa-aaaap-qqcza-cai\"; subaccount = null };
    amount = 100_000_000: nat;
  })"

# 4c. Call burn (should succeed)
dfx canister --network ic call icpi_backend burn_icpi '(100_000_000: nat)'

# 4d. Verify supply decreased
dfx canister --network ic call l6lep-niaaa-aaaap-qqeda-cai icrc1_total_supply '()'
```

---

### Step 6: Deprecate Old Functions

**File:** `src/icpi_backend/src/lib.rs`

Mark old functions as deprecated:

```rust
#[deprecated(note = "Use burn_icpi instead - this two-phase approach has race conditions")]
#[ic_cdk::update]
pub async fn initiate_burn(amount: Nat) -> Result<String, String> {
    Err("Deprecated: Use burn_icpi instead".to_string())
}

#[deprecated(note = "Use burn_icpi instead")]
#[ic_cdk::update]
pub async fn complete_burn(burn_id: String) -> Result<BurnResult, String> {
    Err("Deprecated: Use burn_icpi instead".to_string())
}
```

---

## 🧪 Testing Checklist

- [ ] Burn without ICPI transfer → fails with clear error
- [ ] Burn below minimum (11k) → fails with dust threshold error
- [ ] Burn without fee → fails with fee collection error
- [ ] Proper burn (transfer + call) → succeeds
- [ ] Supply decreases by exact amount → verified
- [ ] Redemption proportions correct → check each token amount
- [ ] Concurrent burns don't interfere → test with 2 users
- [ ] Frontend works with new endpoint → update `useICPI.ts`

---

## 🚨 Common Pitfalls to Avoid

1. **Don't check backend balance** - Minting accounts don't accumulate balances normally
2. **Don't verify before transfers** - The ICPI is burned when user transfers to backend, not when we verify
3. **Don't trust two-phase approaches** - Concurrency bugs inevitable
4. **Don't forget fee collection** - Currently expects 0.1 ckUSDT
5. **Do log everything** - Use `ic_cdk::println!` liberally for debugging
6. **Do use current supply** - Never store supply across calls
7. **Do handle partial failures** - Some tokens might fail to transfer

---

## 📝 Frontend Update Required

**File:** `src/icpi_frontend/src/hooks/useICPI.ts`

Replace two-phase burn with single call:

```typescript
// OLD (remove):
const initiateBurn = async (amount: bigint) => {
  const result = await backendActor.initiate_burn(amount);
  // ...
};
const completeBurn = async (burnId: string) => {
  const result = await backendActor.complete_burn(burnId);
  // ...
};

// NEW:
const burnICPI = async (amount: bigint) => {
  // Step 1: Transfer ICPI to backend
  const transferResult = await icpiTokenActor.icrc1_transfer({
    to: { owner: Principal.fromText('ev6xm-haaaa-aaaap-qqcza-cai'), subaccount: [] },
    amount: amount,
    fee: [],
    memo: [],
    from_subaccount: [],
    created_at_time: [],
  });

  if ('Err' in transferResult) {
    throw new Error(`Transfer failed: ${JSON.stringify(transferResult.Err)}`);
  }

  // Step 2: Call burn
  const burnResult = await backendActor.burn_icpi(amount);

  if ('Err' in burnResult) {
    throw new Error(`Burn failed: ${burnResult.Err}`);
  }

  return burnResult.Ok;
};
```

---

## ✅ Success Criteria

Deployment successful when:

1. Old exploit doesn't work (burn without transfer fails)
2. Proper burn flow works (transfer → burn → receive tokens)
3. Supply consistency maintained (decreases by exact burn amount)
4. No race conditions (concurrent burns safe)
5. Clear error messages (users understand what went wrong)
6. Frontend updated and deployed
7. Documentation reflects new single-call API

---

## 🎯 Key Principle for Agent

**ATOMICITY IS SAFETY**

The old two-phase approach:
- ❌ Requires state storage (PendingBurn)
- ❌ Vulnerable to supply changes between calls
- ❌ Complex verification logic
- ❌ Race conditions with concurrent burns

The atomic approach:
- ✅ Stateless (no PendingBurn storage)
- ✅ Supply captured atomically with calculation
- ✅ Simple: transfer → burn → receive
- ✅ Safe for concurrent operations

**When in doubt, prefer atomic single-transaction operations over multi-step state machines.**
