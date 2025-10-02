# ICPI Fix Summary & Agent Testing Guide

**Date:** 2025-10-02
**Network:** Internet Computer Mainnet
**Backend Canister:** `ev6xm-haaaa-aaaap-qqcza-cai`
**ICPI Token Ledger:** `l6lep-niaaa-aaaap-qqeda-cai`

---

## Executive Summary

### Critical Issues Found (Pre-Fix)

1. **P0 - Token Ledger Not Integrated** 🔴
   - Backend maintained in-memory ICRC-1 implementation
   - Minting created "fake" tokens that only existed in backend state
   - Real ICPI ledger showed 0 supply while backend showed 10 ICPI
   - Tokens couldn't be transferred via standard wallets/tools

2. **P1 - Rebalancer Stopped Working** 🟡
   - Timer active but not executing trades
   - $19.31 ckUSDT available (>$10 threshold)
   - ALEX 61.9% underweight (huge deficit)
   - Last 7 cycles: "No rebalancing needed" (incorrect)
   - Root cause: Silent failure in decimal parsing

3. **P1 - Mint Operation Timeout** 🟡
   - `complete_mint()` hangs for 90+ seconds
   - TVL calculation doing sequential inter-canister calls
   - Operation completes but client times out

### Fixes Implemented

#### P0 - Token Ledger Integration ✅
- Created `ledger_client.rs` with real ICPI ledger calls
- Updated `minting.rs` to call `mint_icpi_tokens()` → real ledger
- Updated `burning.rs` to call `burn_icpi_tokens()` → real ledger
- Removed all in-memory storage (BALANCES, TOTAL_SUPPLY)
- Converted `icrc1_total_supply()` and `icrc1_balance_of()` to proxy queries

#### P1 - Rebalancer Fix ✅
- Added comprehensive logging to `get_rebalancing_action()`
- Added error handling for decimal parsing failures
- Created `debug_rebalancer()` endpoint for manual inspection
- Logs show: ckUSDT balance, deviations, underweight tokens, action decision

#### P1 - TVL Optimization ✅
- Parallelized token balance/price queries using `futures::join_all`
- Changed from sequential awaits to concurrent execution
- Expected improvement: 90s → 15-20s

---

## Testing Framework

### Important: Prediction-First Methodology

**BEFORE running each test command, you MUST:**
1. Understand the current system state
2. Predict what the output will be
3. Explain WHY you expect that output
4. THEN run the command
5. Compare actual vs predicted
6. If they don't match, diagnose the discrepancy

**DO NOT assume the result is correct just because it returned successfully.**

---

## Test Suite

### Test 1: Verify Token Ledger Integration

**Context:**
The backend used to maintain its own in-memory ledger. Now it should query the real ICPI token ledger (`l6lep-niaaa-aaaap-qqeda-cai`).

**Prediction Prompt:**
Before running these commands, predict:
- What should `icrc1_total_supply` return from the backend?
- What should `icrc1_total_supply` return from the real ledger?
- Should these values match?
- What does this tell you about ledger integration?

**Test Commands:**
```bash
# Query backend (should proxy to real ledger)
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai icrc1_total_supply

# Query real ICPI ledger directly
dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc1_total_supply

# Check deprecated in-memory balances (should be empty)
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai get_all_balances
```

**Expected Outcomes:**
- Both total supply calls should return the same value (ledger is source of truth)
- `get_all_balances()` should return empty vec `(vec {})`
- This confirms backend is now querying real ledger, not maintaining parallel state

**Interpretation:**
- ✅ If values match → Ledger integration working
- ❌ If values differ → Backend still using in-memory state (critical bug)
- ✅ If get_all_balances empty → Old state cleared

---

### Test 2: Understand Current Portfolio State

**Context:**
The index holds tokens and ckUSDT. Target allocation is based on locked liquidity in kong_locker.

**Prediction Prompt:**
Before querying, consider:
- The index should hold some ALEX and ckUSDT
- ALEX is likely underweight vs target (historically 61% underweight)
- What percentage of the portfolio do you expect to be ckUSDT?
- Should the rebalancer want to buy or sell?

**Test Commands:**
```bash
# Get current index state
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai get_index_state

# Get TVL summary (locked liquidity basis)
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai get_tvl_summary
```

**Expected Outcomes:**
- `current_positions`: Should show ALEX balance + ckUSDT balance with USD values
- `target_allocations`: ALEX should be ~95% (historically high due to locked liquidity)
- `deviations`: ALEX should show positive deviation (underweight) if ckUSDT > 0
- `ckusdt_balance`: Should match position in current_positions

**Interpretation:**
- Compare `current_positions` percentages to `target_allocations`
- Tokens with positive `deviation_pct` are underweight (need to buy)
- Tokens with negative `deviation_pct` are overweight (need to sell)
- `trade_size_usd` is 10% of the deficit (hourly trade amount)

---

### Test 3: Debug Rebalancer Logic

**Context:**
The rebalancer was returning "No rebalancing needed" despite clear imbalances. New logging should reveal the decision process.

**Prediction Prompt:**
Based on the index state from Test 2:
- Is ckUSDT balance >= $10? If yes, should it buy underweight token?
- Which token has the largest positive deviation?
- What trade size should the rebalancer recommend?
- Will the action be Buy, Sell, or None?

**Test Commands:**
```bash
# Run debug rebalancer (shows action + directs to logs)
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai debug_rebalancer

# Check detailed logs
dfx canister logs --network ic ev6xm-haaaa-aaaap-qqcza-cai | tail -50
```

**Expected Outcomes:**
- `debug_rebalancer` returns summary with action
- Logs show:
  - `🔄 Rebalancing check: ckUSDT balance = $X.XX`
  - `📊 Deviations (4 tokens)` with current/target/deviation for each
  - `✅ ckUSDT balance sufficient` if >= $10
  - `🔍 Found N underweight tokens` if deviation > 1%
  - `✅ REBALANCE ACTION: Buy $X.XX of TOKEN` or similar

**Interpretation:**
- ✅ If action matches predicted → Rebalancer logic correct
- ❌ If "No rebalancing needed" but clear imbalance → Logic bug
- Check logs for error messages like "❌ ERROR: Failed to parse ckUSDT balance"
- Verify deviation filtering (only tokens > 1% deviation trigger trades)

---

### Test 4: Check Rebalancer Status & History

**Context:**
Rebalancer runs hourly via timer. History shows past actions.

**Prediction Prompt:**
Consider:
- When was the last deployment? (History clears on upgrade)
- Has enough time passed since last rebalance? (1 hour minimum)
- Should there be recent history entries?

**Test Commands:**
```bash
# Get rebalancer status
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai get_rebalancer_status
```

**Expected Outcomes:**
- `timer_active`: Should be `true`
- `last_rebalance`: May be `null` if just deployed, or timestamp of last trade
- `next_rebalance`: Should be `last_rebalance + 1 hour` or `null`
- `recent_history`: Array of last 10 rebalance attempts

**Interpretation:**
- Empty history after deployment is normal (state cleared)
- `next_rebalance` in the past means timer is ready to run
- Check history for failed trades (success: false)
- "No rebalancing needed" entries indicate action determination returned None

---

### Test 5: Manual Rebalance (Trigger Trade)

**Context:**
You can manually trigger rebalancing to test trade execution without waiting for hourly timer.

**Prediction Prompt:**
Based on debug_rebalancer output:
- Should the trade be a Buy or Sell?
- What token should be traded?
- What amount in USD?
- Will the trade succeed or fail?

**Test Commands:**
```bash
# Manually trigger rebalance
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai trigger_manual_rebalance

# Check updated state
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai get_index_state

# Check rebalancer history
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai get_rebalancer_status
```

**Expected Outcomes:**
- Manual rebalance returns success/error message
- If successful:
  - `recent_history` shows new entry with trade details
  - `get_index_state` shows adjusted token balances
  - ckUSDT balance decreased (if buy) or increased (if sell)
  - Token balance changed accordingly

**Interpretation:**
- ✅ If history shows success + balances changed → Trade executed
- ❌ If "No rebalancing needed" but imbalance exists → Logic still broken
- ❌ If trade fails → Check error in history details (slippage, liquidity, etc.)
- Verify deviation reduced after trade (not necessarily to 0)

---

### Test 6: Test Minting Flow & Performance

**Context:**
Minting was timing out due to slow TVL calculation. Now parallelized.

**Prediction Prompt:**
Before minting:
- What is current ICPI total supply?
- What is current canister TVL in USD?
- If you deposit 10 ckUSDT, how much ICPI should you receive?
- Formula: `new_icpi = (deposit * current_supply) / current_tvl`
- If supply is 0: Initial mint is 1:1 (10 ckUSDT = 10 ICPI with decimal adjustment)
- How long should `complete_mint` take? (Previously 90s, now ~15-20s)

**Test Commands:**
```bash
# Step 1: Check current supply and TVL
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai icrc1_total_supply
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai get_index_state

# Step 2: Calculate expected ICPI amount
# expected_icpi = (10 * supply) / tvl_usd

# Step 3: Initiate mint (requires ckUSDT approval first)
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai initiate_mint '(1_000_000:nat)'

# Step 4: Note the mint_id, then complete
time dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai complete_mint '("mint_XXXXX")'

# Step 5: Verify tokens minted on real ledger
dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc1_total_supply
dfx canister call --network ic l6lep-niaaa-aaaap-qqcza-cai icrc1_balance_of '(record { owner = principal "YOUR_PRINCIPAL"; subaccount = null })'
```

**Expected Outcomes:**
- `initiate_mint` returns mint_id like `"mint_67ktx_1234567890"`
- `complete_mint` timing: Should complete in 15-25 seconds (not 90s)
- ICPI minted should match calculated amount
- Real ledger supply should increase by minted amount
- User balance on real ledger should show new ICPI

**Interpretation:**
- ✅ If completes in ~15-20s → TVL optimization working
- ❌ If still ~90s → Parallelization not working
- ✅ If ledger balance increases → Tokens actually minted on real ledger (not fake)
- ❌ If backend shows balance but ledger doesn't → Critical ledger integration bug
- Check mint status: `check_mint_status '("mint_id")'` for failures

---

### Test 7: Test Burning Flow (ICRC-2 Approval Required)

**Context:**
Burning requires ICRC-2 approval for backend to pull tokens from user.

**Prediction Prompt:**
Before burning:
- What is current ICPI supply?
- What is current canister holdings (ALEX, ckUSDT, etc.)?
- If you burn 1 ICPI (10% of 10 ICPI supply), what tokens should you receive?
- Formula: Proportional to holdings (burn 10% = receive 10% of each token)
- Will burn succeed without approval?

**Test Commands:**
```bash
# Step 1: Check current holdings
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai get_index_state

# Step 2: Calculate expected redemption
# If burning 1 ICPI out of 10 ICPI total (10%):
# - Should receive 10% of each token holding

# Step 3: Approve backend to spend ICPI (ICRC-2)
dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc2_approve '(record {
  spender = record { owner = principal "ev6xm-haaaa-aaaap-qqcza-cai"; subaccount = null };
  amount = 100_000_000:nat;
  expires_at = null;
  fee = null;
  memo = null;
  created_at_time = null;
})'

# Step 4: Initiate burn
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai initiate_burn '(100_000_000:nat)'

# Step 5: Complete burn
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai complete_burn '("burn_XXXXX")'

# Step 6: Verify tokens received and ICPI burned
dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc1_total_supply
```

**Expected Outcomes:**
- Without approval: Burn fails with "Ledger burn failed: Insufficient allowance"
- With approval: Burn succeeds
- `complete_burn` returns BurnResult with:
  - `successful_transfers`: List of (token, amount) sent to user
  - `failed_transfers`: Any tokens that failed (usually empty)
  - `icpi_burned`: Amount of ICPI burned
- ICPI total supply decreases by burned amount
- User receives proportional tokens (check wallet balances)

**Interpretation:**
- ✅ Approval check working if fails without approval
- ✅ If BurnResult shows transfers → Redemption calculated correctly
- ✅ If supply decreases → Tokens actually burned on real ledger
- ❌ If backend balance changes but ledger doesn't → Ledger integration bug
- Check failed_transfers for issues (dust amounts may be skipped)

---

### Test 8: Verify TVL Calculation Performance

**Context:**
TVL calculation queries multiple canisters and was slow. Now parallelized.

**Prediction Prompt:**
- How many lock canisters exist? (Check recent logs)
- How many tokens are tracked? (4: ALEX, ZERO, KONG, BOB)
- Sequential: 2 calls per token × 4 tokens = 8 calls (8-10s each = 80s+)
- Parallel: All calls concurrent (max call time = ~10s)
- Expected improvement?

**Test Commands:**
```bash
# Time the TVL calculation (embedded in get_index_state)
time dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai get_index_state

# Check logs for TVL calculation details
dfx canister logs --network ic ev6xm-haaaa-aaaap-qqcza-cai | grep -A 20 "Total canister TVL"
```

**Expected Outcomes:**
- `get_index_state` completes in 15-25 seconds (was 90+ seconds)
- Logs show parallel execution:
  ```
  Querying price for ALEX
  Querying price for ZERO
  Querying price for KONG
  Querying price for BOB
  (All happen simultaneously, not sequentially)
  ```

**Interpretation:**
- ✅ If ~15-20s → Parallelization working
- ❌ If ~90s → Still sequential (futures not awaited correctly)
- Check logs for "Warning: Token query failed" (indicates errors)

---

### Test 9: End-to-End Validation

**Context:**
Full system test combining all components.

**Prediction Prompt:**
Trace the complete flow:
1. What is current state? (supply, holdings, allocations)
2. Mint 10 ckUSDT - what ICPI will you get?
3. What will new state be? (supply, TVL, allocations)
4. Should rebalancer trigger? (ckUSDT increased, so yes)
5. What trade will execute? (Most underweight token)
6. Burn 50% of your ICPI - what tokens will you get back?

**Test Commands:**
```bash
# 1. Baseline state
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai get_index_state

# 2. Mint ICPI (requires ckUSDT approval)
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai initiate_mint '(10_000_000:nat)'
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai complete_mint '("mint_id")'

# 3. Check state after mint
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai get_index_state

# 4. Trigger rebalance
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai debug_rebalancer
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai trigger_manual_rebalance

# 5. Check state after rebalance
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai get_index_state

# 6. Burn half your ICPI (requires approval)
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai initiate_burn '(HALF_YOUR_ICPI:nat)'
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai complete_burn '("burn_id")'

# 7. Final state
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai get_index_state
dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc1_total_supply
```

**Expected Outcomes:**
- Mint increases supply and TVL proportionally
- Rebalancer detects increased ckUSDT and executes buy
- After rebalance, ckUSDT decreases, underweight token increases
- Burn decreases supply and returns proportional tokens
- All changes reflected on real ICPI ledger (not just backend state)

**Interpretation:**
- ✅ Full flow working → All systems integrated correctly
- ❌ Any step fails → Isolate issue using individual tests above
- Verify ledger state matches backend state at each step

---

## Common Issues & Diagnostics

### Issue: "No rebalancing needed" despite clear imbalance

**Diagnosis:**
1. Run `debug_rebalancer` and check logs
2. Look for: "❌ ERROR: Failed to parse ckUSDT balance"
3. Check if ckUSDT balance < $10 (minimum threshold)
4. Verify deviation > 1.0% (filter threshold)

**Fix:** Should be resolved with P1 logging improvements

---

### Issue: Mint times out after 2 minutes

**Diagnosis:**
1. Time the `complete_mint` call
2. If > 60s, TVL calculation is slow
3. Check logs: Are token queries sequential or parallel?

**Fix:** Should be resolved with P1 parallelization

---

### Issue: Backend shows balance but real ledger doesn't

**Diagnosis:**
1. Compare: `get_all_balances()` vs ledger `icrc1_balance_of`
2. If `get_all_balances()` not empty → Using old in-memory state
3. Check: `icrc1_total_supply` backend vs ledger

**Fix:** Should be resolved with P0 ledger integration

---

### Issue: Burn fails with "Insufficient allowance"

**Diagnosis:**
1. Check if user approved backend: `icrc2_allowance` on ICPI ledger
2. Verify spender is backend principal: `ev6xm-haaaa-aaaap-qqcza-cai`

**Fix:** User must call `icrc2_approve` before burning

---

## Key Canister IDs

```
ICPI Backend:     ev6xm-haaaa-aaaap-qqcza-cai
ICPI Token:       l6lep-niaaa-aaaap-qqeda-cai
Kong Locker:      eazgb-giaaa-aaaap-qqc2q-cai
Kongswap:         2ipq2-uqaaa-aaaar-qailq-cai
ckUSDT:           cngnf-vqaaa-aaaar-qag4q-cai
ALEX:             jwcfb-hyaaa-aaaaq-aadgq-cai
ZERO:             rffwt-piaaa-aaaaq-aabqq-cai
KONG:             73626-uqaaa-aaaaq-aaduq-cai
BOB:              7pail-xaaaa-aaaas-aabmq-cai
```

---

## Testing Checklist

Before concluding testing is complete, verify:

- [ ] Backend and real ledger show same ICPI supply
- [ ] `get_all_balances()` returns empty (no in-memory state)
- [ ] `debug_rebalancer` logs show detailed decision process
- [ ] Rebalancer executes trades when imbalanced
- [ ] Mint completes in 15-25 seconds (not 90s)
- [ ] Minted ICPI appears on real ledger
- [ ] Burn requires approval and returns proportional tokens
- [ ] Burned ICPI removed from real ledger supply
- [ ] All inter-canister calls complete successfully
- [ ] No silent failures in logs

---

## Conclusion

The ICPI system has been fixed to:
1. Use the real ICPI token ledger (no more fake in-memory tokens)
2. Properly execute rebalancing trades with detailed logging
3. Complete minting operations quickly via parallelized TVL calculations

Follow this testing guide with prediction-first methodology to validate all fixes are working correctly on mainnet.
