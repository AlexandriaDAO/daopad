# ICPI Security Fix Plan

**Priority: CRITICAL - Exploitable vulnerabilities present**

## Overview
Fix 5 security/correctness issues in ICPI burn mechanism without adding code complexity. Focus on atomic operations and proper verification order.

---

## 1. Fix verify_icpi_burn() - IMMEDIATE ⚠️

**Current Issue:** Always returns `Ok()` without checking anything
**Impact:** Complete fund drainage possible
**Location:** `src/icpi_backend/src/ledger_client.rs:38-48`

### Solution (Minimal Complexity)
Replace stub with actual balance check:

```rust
pub async fn verify_icpi_burn(from: Principal, expected_burn_amount: Nat) -> Result<(), String> {
    // Get user's balance BEFORE burn (should be expected_burn_amount)
    let balance_before = get_icpi_balance(from).await?;

    // Get backend's balance (burned tokens accumulate here)
    let backend_balance = get_icpi_balance(ic_cdk::id()).await?;

    // Verify user transferred at least expected_burn_amount to backend
    if backend_balance < expected_burn_amount {
        return Err(format!(
            "Burn verification failed: backend only has {}, expected {}",
            backend_balance, expected_burn_amount
        ));
    }

    Ok(())
}
```

**Alternative (Simpler):** Remove two-phase burn entirely, make it atomic (see issue #3).

---

## 2. Reorder Burn Flow - IMMEDIATE ⚠️

**Current Issue:** Tokens transferred to user BEFORE verification
**Impact:** If verification fails, user already received tokens
**Location:** `src/icpi_backend/src/burning.rs:255-346`

### Solution (Zero Complexity Added)
Move steps 4 and 5 order in `complete_burn()`:

```rust
// Step 4: Verify burn FIRST ✓
verify_icpi_burn(caller, burn.amount.clone()).await
    .map_err(|e| format!("Burn verification failed: {}", e))?;

// Step 5: Execute transfers AFTER verification ✓
for (token_symbol, amount) in tokens_to_receive.iter() {
    transfer_to_user(burn.user, token_symbol, amount.clone()).await?;
}
```

**Change:** Swap lines 322-333 with lines 335-346 in current code.

---

## 3. Fix Supply Race Condition - URGENT

**Current Issue:** Supply captured at `initiate_burn()`, used in `complete_burn()` - stale data
**Impact:** Unfair redemption ratios if supply changes between calls
**Location:** `src/icpi_backend/src/burning.rs:73-75` and `:285-295`

### Solution Option A: Make Burn Atomic (Recommended)
Merge `initiate_burn()` and `complete_burn()` into single `burn_icpi()` function:

```rust
pub async fn burn_icpi(amount: Nat) -> Result<Vec<(String, Nat)>, String> {
    let caller = ic_cdk::caller();

    // 1. Verify user transferred ICPI to backend
    let backend_balance = get_icpi_balance(ic_cdk::id()).await?;
    if backend_balance < amount {
        return Err("Transfer ICPI to backend first".to_string());
    }

    // 2. Get CURRENT supply (atomic with calculation)
    let supply = get_icpi_total_supply().await?;

    // 3. Calculate redemption
    let redemption_percentage = amount.clone() / supply;
    let tokens = calculate_redemption_tokens(redemption_percentage).await?;

    // 4. Execute transfers
    for (token, token_amount) in &tokens {
        transfer_to_user(caller, token, token_amount.clone()).await?;
    }

    // 5. Burn ICPI (transfer to backend = burn)
    burn_icpi_tokens(amount).await?;

    Ok(tokens)
}
```

**Benefits:**
- Eliminates race condition
- Simpler API (one call instead of two)
- No stored state needed
- Atomic operation

### Solution Option B: Add Staleness Check (If two-phase required)
Keep two-phase but verify supply hasn't changed:

```rust
// In complete_burn()
let current_supply = get_icpi_total_supply().await?;
let supply_drift = (current_supply.clone() - burn.supply_at_initiation.clone()).abs();
let drift_percentage = (supply_drift * 100u64) / burn.supply_at_initiation;

if drift_percentage > 5 {  // 5% tolerance
    return Err("Supply changed too much, please reinitiate burn".to_string());
}
```

**Recommendation:** Use Option A (atomic) - simpler and safer.

---

## 4. Clarify Fee Amount - HIGH

**Current Issue:** Code says 0.1 ckUSDT, docs may say 0.01 ckUSDT
**Impact:** 10x fee discrepancy, user confusion
**Location:** `src/icpi_backend/src/icrc_types.rs:89`

### Solution (Documentation Only)
Decision needed from product owner:

**If 0.1 ckUSDT is correct:**
- Update all docs to reflect 0.1 ckUSDT fee
- Add comment: `// 0.1 ckUSDT = 100_000 units (ckUSDT has 6 decimals)`

**If 0.01 ckUSDT is correct:**
- Change code to `pub const FEE_AMOUNT: u64 = 10_000;`
- Update comment: `// 0.01 ckUSDT = 10_000 units (ckUSDT has 6 decimals)`

**Action Required:** Confirm intended fee amount before implementing.

---

## 5. Update Dust Threshold Docs - MEDIUM

**Current Issue:** Docs say "<1000 units" but code requires ">11,000 units"
**Impact:** User confusion, unclear minimum burn amount
**Location:** `src/icpi_backend/src/burning.rs:243`

### Solution (Documentation Only)
Update docs to match code reality:

```markdown
Minimum burn amount: 11,000 ICPI units (0.00011 ICPI)
- Includes 10,000 transfer fee + 1,000 dust buffer
- Amounts below this threshold are not worth redeeming
```

**Code is correct** - the 11,000 threshold makes sense. Just update docs.

---

## Implementation Order

1. **Phase 1 (CRITICAL - Deploy Today):**
   - Fix #1: Implement actual burn verification
   - Fix #2: Reorder burn flow (verify before transfer)
   - Test with small amounts on mainnet

2. **Phase 2 (URGENT - Deploy Tomorrow):**
   - Fix #3: Implement atomic burn (Option A)
   - Remove `initiate_burn()`/`complete_burn()` from API
   - Update frontend to use new `burn_icpi()` endpoint

3. **Phase 3 (HIGH - This Week):**
   - Fix #4: Clarify and document fee amount
   - Fix #5: Update dust threshold documentation
   - Add comprehensive burn testing guide

---

## Testing Checklist

After each phase:

```bash
# Test burn verification
dfx canister call --network ic icpi_backend burn_icpi '(100_000_000: nat)'
# Should fail if no ICPI transferred to backend

# Transfer ICPI first, then burn
dfx canister call --network ic icpi icrc1_transfer \
  '(record { to = record { owner = principal "ev6xm-haaaa-aaaap-qqcza-cai" }; amount = 100_000_000: nat })'
dfx canister call --network ic icpi_backend burn_icpi '(100_000_000: nat)'
# Should succeed and return redemption tokens

# Verify supply consistency
dfx canister call --network ic icpi icrc1_total_supply '()'
# Check before/after burn - should decrease
```

---

## Complexity Assessment

| Fix | Lines Changed | Complexity Added |
|-----|---------------|------------------|
| #1 Burn verification | ~15 lines | Low (just balance checks) |
| #2 Reorder steps | 0 lines | None (just swap order) |
| #3 Atomic burn | -50 lines | Negative! (removes state) |
| #4 Fee docs | 1 line | None (clarification) |
| #5 Dust docs | 0 lines | None (docs only) |

**Net result:** Actually REDUCES complexity by eliminating two-phase burn state management.

---

## Risk Mitigation

- Deploy Phase 1 separately - isolates critical fixes
- Test each phase on mainnet with small amounts ($10-50)
- Keep old burn functions but mark deprecated during transition
- Add extensive logging to new burn flow for monitoring
- Consider burn pause function for emergency use

---

## Questions for Product Owner

1. **Fee Amount:** Confirm 0.1 ckUSDT or 0.01 ckUSDT is correct?
2. **Atomic Burn:** Okay to simplify API from two-phase to single call?
3. **Emergency Pause:** Should we add ability to pause burns during incident?
