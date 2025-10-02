# ICPI Burn Function Testing & Fixing Plan

## Context
The mint function had several issues that were discovered through mainnet testing:
1. **Memo size limits** - ICRC1 tokens have varying memo size limits (ALEX: 32 bytes, ckUSDT: 80 bytes)
2. **Authorization checks** - Functions called internally from update methods see the user as caller, not the canister
3. **Initial state handling** - Special cases for zero supply caused incorrect behavior
4. **Result type handling** - Frontend needed to unwrap Ok/Err variants

The burn function likely has similar issues that need to be discovered and fixed through testing.

## Current Burn Function Status

### What We Know Works
- Two-phase burn process: `initiate_burn` → `complete_burn`
- Proportional calculation: `(icpi_burned / total_supply) * token_balance` for each token
- Fee collection (0.1 ckUSDT)
- ckUSDT transfers work

### What We Know Is Broken
- **ALEX transfers fail** - memo size is 80 bytes but ALEX limit is 32 bytes
- Unknown if other tokens have different memo limits
- Unknown if there are authorization issues like mint had

## Task: Get Burn Function Fully Working

### Step 1: Fix Memo Size Limits
**File:** `src/icpi_backend/src/icrc_types.rs`

**Current code:** Lines 172-207 in `transfer_to_user` function
```rust
// Truncate memo to max 80 bytes (ICRC1 limit)
let memo_bytes = memo.as_bytes();
let truncated_memo = if memo_bytes.len() > 80 {
    &memo_bytes[..80]
} else {
    memo_bytes
};
```

**Problem:** Different tokens have different memo limits:
- ALEX: 32 bytes (strictest)
- ckUSDT: 80 bytes
- ZERO, KONG, BOB: Unknown (assume 32 to be safe)

**Solution:** Change limit from 80 to 32 bytes in ALL transfer functions:
- `transfer_to_user` (line 172)
- `collect_deposit` (line 138) - already has 80 byte limit
- Any other transfer functions

**Action:**
1. Change all memo truncation from 80 bytes to 32 bytes
2. Test that 32 bytes works for all tokens (ALEX, ZERO, KONG, BOB, ckUSDT)

### Step 2: Test Burn Function on Mainnet

**Prerequisites:**
- Backend canister: `ev6xm-haaaa-aaaap-qqcza-cai`
- Current holdings: 10 ALEX (~$12.53), some ckUSDT
- Current supply: 1.444 ICPI (100M to eurew..., 44.4M to 67ktx...)
- Test identity: 67ktx-ln42b-uzmo5-bdiyn-gu62c-cd4h4-a5qt3-2w3rs-cixdl-iaso2-mqe (has 0.444 ICPI)

**Testing Commands:**
```bash
# 1. Approve fee (0.1 ckUSDT)
dfx canister call --network ic cngnf-vqaaa-aaaar-qag4q-cai icrc2_approve \
  "(record { amount = 5_000_000; spender = record { owner = principal \"ev6xm-haaaa-aaaap-qqcza-cai\"; subaccount = null } })"

# 2. Initiate burn
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai initiate_burn "(44_377_582 : nat)"
# Expected: Returns burn_id string

# 3. Complete burn
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai complete_burn "(\"<burn_id_from_step_2>\")"
# Expected: Returns BurnResult with successful_transfers and failed_transfers

# 4. Verify balances
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai icrc1_total_supply "()"
# Expected: Should be reduced by burned amount

dfx canister call --network ic ysy5f-2qaaa-aaaap-qkmmq-cai icrc1_balance_of \
  "(record { owner = principal \"67ktx-ln42b-uzmo5-bdiyn-gu62c-cd4h4-a5qt3-2w3rs-cixdl-iaso2-mqe\"; subaccount = null })"
# Expected: Should have received proportional ALEX

dfx canister call --network ic cngnf-vqaaa-aaaar-qag4q-cai icrc1_balance_of \
  "(record { owner = principal \"67ktx-ln42b-uzmo5-bdiyn-gu62c-cd4h4-a5qt3-2w3rs-cixdl-iaso2-mqe\"; subaccount = null })"
# Expected: Should have received proportional ckUSDT
```

### Step 3: Problems You'll Likely Encounter

#### Problem 1: Memo Size Limits (CONFIRMED)
**Symptom:** Transfer fails with "memo field size of X bytes is above the allowed limit of Y bytes"

**Current memo being sent:**
- Burn ID format: `burn_67ktx-ln42b-uzmo5-bdiyn-gu62c-cd4h4-a5qt3-2w3rs-cixdl-iaso2-mqe_1759356223847650086`
- This gets used in memo like: `"ICPI redemption: burn_67ktx..."`
- Total length: 80+ bytes

**Token-specific limits discovered:**
- ALEX: 32 bytes (CONFIRMED via test)
- ckUSDT: 80 bytes (works)
- ZERO: Unknown
- KONG: Unknown
- BOB: Unknown

**Solution:** Use 32 byte limit universally (safest):
```rust
let truncated_memo = if memo_bytes.len() > 32 {
    &memo_bytes[..32]
} else {
    memo_bytes
};
```

Or even simpler memos like "ICPI burn" instead of including the burn_id.

#### Problem 2: Authorization Checks
**Check:** Does `burn_tokens` function have the same authorization issue as `mint_tokens` had?

**What to look for:** In `src/icpi_backend/src/icpi_token.rs` around line 126, check if `burn_tokens` validates `ic_cdk::caller() == ic_cdk::api::id()`

**If yes:** Remove the check (already fixed in current code - line 124-151 shows it was already removed)

#### Problem 3: Insufficient Allowance
**Symptom:** "InsufficientAllowance" error during fee collection or token transfers

**Cause:** Each operation consumes allowance:
- Fee collection: 0.1 ckUSDT + token fee
- Each token transfer: token-specific fee

**Solution:** Approve larger amount upfront (5-10 ckUSDT to cover multiple operations)

#### Problem 4: Token Transfer Fees
**Issue:** When burning, the canister transfers tokens to the user. Each token has its own transfer fee that gets deducted.

**Example:**
- User should get 3.46 ALEX
- ALEX transfer fee: 0.0001 ALEX
- User actually receives: 3.4599 ALEX (slightly less)

**This is expected behavior** - just document it for users.

#### Problem 5: Zero Balance Tokens
**Current behavior:** Burn code checks if `balance > 0` before attempting transfer

**Potential issue:** If canister has 0 of a token, it gets skipped (correct behavior)

**Edge case:** What if ALL tokens are 0? User pays fee but gets nothing back?

**Solution:** Already handled - code iterates through all tokens and only transfers non-zero amounts

### Step 4: Expected vs Actual Results

#### Expected Behavior (Burn 0.444 ICPI out of 1.444 total)

**Calculation:**
- Burn percentage: `44,377,582 / 144,377,582 = 30.74%`
- ALEX holdings: 10 ALEX (1,000,000,000 with 8 decimals)
- ckUSDT holdings: ~1 ckUSDT (1,000,000 with 6 decimals, minus fee paid)
- Proportional ALEX: `1,000,000,000 * 0.3074 = 307,400,000` (~3.074 ALEX)
- Proportional ckUSDT: `1,000,000 * 0.3074 = 307,400` (~0.307 ckUSDT)

**Expected transfers:**
- ✅ ckUSDT: ~0.307 ckUSDT (should succeed)
- ❌ ALEX: ~3.074 ALEX (will fail with 80-byte memo)

#### Actual Results from Test

**Observed:**
```
Ok = record {
  icpi_burned = 44_377_582 : nat;
  successful_transfers = vec { record { "ckUSDT"; 307_371 : nat } };
  failed_transfers = vec {
    record {
      "ALEX";
      307_371_694 : nat;
      "Error from Canister ysy5f-2qaaa-aaaap-qkmmq-cai: Canister called `ic0.trap` with message:
       'the memo field size of 80 bytes is above the allowed limit of 32 bytes'.";
    };
  };
}
```

**Analysis:**
- ✅ ckUSDT transfer: Succeeded with 307,371 (0.307371 ckUSDT) - MATCHES EXPECTED
- ❌ ALEX transfer: Failed with memo size error - CONFIRMS PROBLEM
- ✅ Proportional calculation: 307,371,694 ALEX (~3.07 ALEX) - MATCHES EXPECTED
- ✅ Burn mechanism: ICPI was burned (supply reduced)
- ⚠️ User lost value: Paid fee, burned ICPI, got only partial redemption (ckUSDT but not ALEX)

### Step 5: Fix and Retest

**Fix 1: Reduce memo size to 32 bytes**

Edit `src/icpi_backend/src/icrc_types.rs`:

Line 179-184 (in `transfer_to_user`):
```rust
// Truncate memo to max 32 bytes (strictest token limit - ALEX)
let memo_bytes = memo.as_bytes();
let truncated_memo = if memo_bytes.len() > 32 {
    &memo_bytes[..32]
} else {
    memo_bytes
};
```

**Fix 2: Simplify memo strings**

In `src/icpi_backend/src/burning.rs`, the memo is constructed around line 260-280. Consider shortening to just "ICPI burn" instead of including burn_id.

**After fixing:**
1. Deploy to mainnet: `./deploy.sh --network ic`
2. Approve ckUSDT: `dfx canister call --network ic cngnf-vqaaa-aaaar-qag4q-cai icrc2_approve ...`
3. Test full burn flow again
4. Verify ALL token transfers succeed
5. Check user received correct proportions

### Step 6: Additional Testing Scenarios

**Test Case 1: Burn with multiple tokens**
- Seed canister with ALEX, ZERO, KONG, BOB, ckUSDT
- Burn small amount (10% of supply)
- Verify all 5 transfers succeed
- Verify proportions are correct

**Test Case 2: Burn with zero holdings**
- Ensure canister has 0 of some tokens
- Verify burn skips zero-balance tokens gracefully
- User should still get non-zero tokens

**Test Case 3: Partial burn**
- Burn only fraction of holdings (e.g., 0.1 ICPI out of 1.4)
- Verify supply decreases correctly
- Verify canister retains remaining tokens

**Test Case 4: Burn entire supply**
- One user burns all their ICPI
- Verify supply goes down but not to zero (others still have ICPI)
- Verify canister still has proportional tokens left

### Step 7: Frontend Integration

After backend is working, update frontend hook in `src/icpi_frontend/src/hooks/useICPI.ts`:

**Already fixed** (lines 246-278) - uses two-phase burn with proper Result unwrapping:
```typescript
const initResult = await actor.initiate_burn(amountRaw)
if ('Err' in initResult) throw new Error(initResult.Err)
const burnId = initResult.Ok

const completeResult = await actor.complete_burn(burnId)
if ('Err' in completeResult) throw new Error(completeResult.Err)
return completeResult.Ok
```

**Test in UI:** Click "REDEEM ICPI" button and verify it works end-to-end

## Summary of Known Issues & Fixes

| Issue | Status | Fix |
|-------|--------|-----|
| Memo size limit (80 bytes) | ❌ BROKEN | Change to 32 bytes in all transfer functions |
| Authorization check | ✅ FIXED | Removed from burn_tokens function |
| Result type unwrapping | ✅ FIXED | Frontend handles Ok/Err properly |
| Proportional calculation | ✅ WORKS | Math is correct (verified via test) |
| Fee collection | ✅ WORKS | 0.1 ckUSDT collected successfully |
| Multi-token transfers | ⚠️ PARTIAL | ckUSDT works, ALEX fails, others unknown |

## Key Takeaways for Testing

1. **Always test on mainnet** - local testing doesn't catch inter-canister issues
2. **Test each token individually** - they all have different limits and quirks
3. **Check actual balances** - don't trust calculations, verify on-chain
4. **Read error messages carefully** - they tell you exactly what's wrong (memo size, allowance, etc.)
5. **Never delete canisters** - use `--mode reinstall` to keep the same canister ID and preserve token holdings

## Current Canister State (as of last test)

- **Backend:** ev6xm-haaaa-aaaap-qqcza-cai
- **Token (ICPI):** es7ry-kyaaa-aaaap-qqczq-cai (not used, token logic in backend)
- **Frontend:** qhlmp-5aaaa-aaaam-qd4jq-cai
- **Supply:** 100,000,000 ICPI (1 ICPI - seed to eurew... was not consumed by burn test yet, burn was from second mint)
- **Holdings:** ~6.93 ALEX, ~0.69 ckUSDT (after partial burn returned 0.307 ckUSDT but failed to return 3.07 ALEX)
- **Test identity:** 67ktx-ln42b-uzmo5-bdiyn-gu62c-cd4h4-a5qt3-2w3rs-cixdl-iaso2-mqe
- **Test identity balance:** 0 ICPI (burned all), ~0.307 ckUSDT received, 0 ALEX received (failed transfer)

## Next Steps

1. Fix memo size to 32 bytes in `icrc_types.rs` (both `transfer_to_user` and `collect_deposit`)
2. Deploy: `./deploy.sh --network ic`
3. Approve ckUSDT for new test
4. Mint some ICPI to test identity again (need holdings to burn)
5. Test burn again and verify ALEX transfer succeeds
6. Test with ZERO, KONG, BOB tokens if available
7. Verify frontend "REDEEM ICPI" button works

## Important Notes

- **Never use `dfx canister delete`** - it releases the canister ID and loses all tokens
- **Use `dfx deploy --mode reinstall`** instead to reset state while keeping canister ID
- **Memo limits vary by token** - always use the strictest limit (32 bytes) to be safe
- **Approve extra allowance** - operations consume more than you expect (fees add up)
- **Test with small amounts first** - we're working with real money on mainnet
