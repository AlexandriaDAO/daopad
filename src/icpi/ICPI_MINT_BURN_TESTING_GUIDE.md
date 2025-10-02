# ICPI Minting & Burning Testing Guide

**Date:** 2025-10-02
**Network:** Internet Computer Mainnet
**Backend Canister:** `ev6xm-haaaa-aaaap-qqcza-cai`
**ICPI Token Ledger:** `l6lep-niaaa-aaaap-qqeda-cai`
**ckUSDT Ledger:** `cngnf-vqaaa-aaaar-qag4q-cai`

---

## Overview

This guide walks through testing ICPI's minting and burning operations using the **prediction-first methodology**. Before executing any command, you must:

1. **Understand** the current system state
2. **Predict** what will happen
3. **Explain** why you expect that outcome
4. **Execute** the command
5. **Compare** actual vs predicted results
6. **Diagnose** any discrepancies

**DO NOT assume success just because a command returns without error.**

---

## Prerequisites

### Required Tokens

To test minting and burning, you need:

- **For Minting**: ckUSDT tokens in your wallet (minimum 10 ckUSDT recommended)
- **For Burning**: ICPI tokens in your wallet (obtained from minting)

### Get Your Principal

```bash
dfx identity get-principal
```

Save this principal - you'll need it for balance queries.

---

## Understanding ICPI Economics

### Minting Formula

```
IF supply == 0 (Initial mint):
    new_icpi = usdt_amount (1:1 ratio)
ELSE (Subsequent mints):
    new_icpi = (usdt_amount * current_supply) / current_tvl
```

**Key Points:**
- First mint is always 1:1 (10 ckUSDT = 10 ICPI)
- Subsequent mints are proportional (you buy into existing NAV)
- NAV = Net Asset Value = TVL / Supply

### Burning Formula

```
burn_percentage = icpi_to_burn / total_supply
user_receives = burn_percentage * each_token_holding
```

**Key Points:**
- Burning is proportional redemption
- Burn 10% of supply → receive 10% of each token
- Includes ALEX, ZERO, KONG, BOB, and ckUSDT holdings

---

## Test 1: Pre-Mint State Check

### Context

Before minting, understand the current index state to predict your minting outcome.

### Prediction Prompt

Before querying:
- What is the current ICPI supply?
- What is the current canister TVL?
- Is this the first mint (supply == 0)?
- If not first mint, what is the current NAV (TVL/Supply)?
- How much ICPI should you receive for X ckUSDT?

### Test Commands

```bash
# Get current ICPI supply
dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc1_total_supply

# Get current index TVL and holdings
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai get_index_state

# Check your ckUSDT balance
dfx canister call --network ic cngnf-vqaaa-aaaar-qag4q-cai icrc1_balance_of "(record { owner = principal \"YOUR_PRINCIPAL\"; subaccount = null })"
```

### Expected Outcomes

**Scenario A: First Mint (Supply = 0)**
- ICPI supply: `0`
- TVL: Any amount (doesn't matter for calculation)
- Formula: `10 ckUSDT = 10 ICPI` (1:1 ratio)
- With 8 decimals: `10_00000000` ICPI tokens

**Scenario B: Subsequent Mint (Supply > 0)**
- ICPI supply: `S` tokens
- TVL: `T` USD
- NAV: `T / S` per ICPI
- Formula: `new_icpi = (usdt_amount * S) / T`
- Example: If NAV = $1.20, then 10 ckUSDT = 8.33 ICPI

### Interpretation

- ✅ If supply = 0 → Expect 1:1 minting
- ✅ If supply > 0 → Calculate expected ICPI using formula
- ⚠️ If TVL = 0 but supply > 0 → System error (should not happen)
- Record your calculation for verification after minting

---

## Test 2: ICRC-2 Approval (Required Before Minting)

### Context

ICPI backend needs permission to spend your ckUSDT. This uses the ICRC-2 approval standard.

### Prediction Prompt

Before approving:
- How much ckUSDT do you want to mint with?
- What is the backend fee? (0.1 ckUSDT = 100,000 units)
- What is the ckUSDT transfer fee? (0.01 ckUSDT = 10,000 units)
- Total approval needed: `mint_amount + backend_fee + (2 * transfer_fee)`
- Why 2x transfer fee? (Fee collection transfer + deposit transfer)

### Test Commands

```bash
# Calculate approval amount
# Example: Minting 10 ckUSDT
# mint_amount = 10_000_000 (10 ckUSDT with 6 decimals)
# backend_fee = 100_000 (0.1 ckUSDT)
# transfer_fee = 10_000 (0.01 ckUSDT)
# buffer = 20_000 (2x transfer fee)
# total = 10_120_000

# Approve ICPI backend to spend ckUSDT
dfx canister call --network ic cngnf-vqaaa-aaaar-qag4q-cai icrc2_approve '(record {
  spender = record {
    owner = principal "ev6xm-haaaa-aaaap-qqcza-cai";
    subaccount = null
  };
  amount = 10_120_000:nat;
  fee = opt (10_000:nat);
  expires_at = null;
  memo = null;
  created_at_time = null;
})'
```

### Expected Outcomes

- Returns: `variant { Ok = BLOCK_INDEX:nat }`
- Block index is the ledger transaction ID
- No errors about insufficient funds

### Interpretation

- ✅ If `Ok` variant returned → Approval succeeded
- ❌ If `InsufficientFunds` → Your ckUSDT balance too low
- ❌ If `BadFee` → Wrong fee amount (should be 10,000)
- Check approval before proceeding to mint

**Verify Approval:**

```bash
dfx canister call --network ic cngnf-vqaaa-aaaar-qag4q-cai icrc2_allowance '(record {
  account = record { owner = principal "YOUR_PRINCIPAL"; subaccount = null };
  spender = record { owner = principal "ev6xm-haaaa-aaaap-qqcza-cai"; subaccount = null }
})'
```

Expected: `allowance >= 10_120_000`

---

## Test 3: Initiate Mint

### Context

Minting is a 2-phase operation:
1. **Initiate**: Reserves your mint and collects ckUSDT
2. **Complete**: Calculates TVL and mints ICPI

### Prediction Prompt

Before initiating:
- How much ckUSDT are you minting? (in raw units with 6 decimals)
- Do you have sufficient approval?
- What mint_id format do you expect? (e.g., `mint_67ktx_1234567890`)

### Test Commands

```bash
# Initiate mint with 10 ckUSDT
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai initiate_mint '(10_000_000:nat)'
```

### Expected Outcomes

```rust
variant { Ok = "mint_67ktx_1234567890" }
```

- Returns mint_id string
- Format: `mint_{canister_id_short}_{timestamp}`
- This ID is required for completing the mint

### Interpretation

- ✅ If `Ok` with mint_id → Phase 1 succeeded, ckUSDT transferred
- ❌ If `Err: Insufficient allowance` → Approval missing or too low
- ❌ If `Err: Insufficient balance` → Not enough ckUSDT in wallet
- ❌ If `Err: Already pending` → You have an incomplete mint

**IMPORTANT:** Save the mint_id - you need it for the next step!

**Verify ckUSDT Transfer:**

```bash
# Check your ckUSDT balance decreased
dfx canister call --network ic cngnf-vqaaa-aaaar-qag4q-cai icrc1_balance_of "(record { owner = principal \"YOUR_PRINCIPAL\"; subaccount = null })"

# Check backend received ckUSDT
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai get_index_state
# Look for increased ckusdt_balance
```

---

## Test 4: Complete Mint (Performance Test)

### Context

This phase calculates TVL (requires inter-canister calls) and mints ICPI tokens on the real ledger.

**Performance expectation:** 15-25 seconds (optimized with parallelization)

### Prediction Prompt

Before completing:
- What is the current ICPI supply?
- What is the current TVL?
- Using the minting formula, how much ICPI should you receive?
- How long should this take? (Pre-fix: 90s, Post-fix: 15-25s)

### Test Commands

```bash
# Time the complete_mint call
time dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai complete_mint '("mint_67ktx_1234567890")'
```

### Expected Outcomes

```rust
variant {
  Ok = record {
    icpi_minted = 1_000_000_000:nat;  // 10 ICPI with 8 decimals
    user_principal = principal "YOUR_PRINCIPAL";
    timestamp = 1234567890:nat64;
  }
}
```

**Timing:**
```
real    0m17.234s
user    0m0.043s
sys     0m0.010s
```

### Interpretation

**Correctness:**
- ✅ If minted amount matches prediction → Formula working correctly
- ❌ If minted amount differs → Check TVL/supply calculation
- ✅ If ICPI appears on real ledger → Ledger integration working

**Performance:**
- ✅ If 15-25 seconds → TVL parallelization working
- ❌ If 60-90+ seconds → Still sequential (optimization not applied)
- ⚠️ If timeout → Check canister logs for errors

**Verify Minted Tokens:**

```bash
# Check ICPI total supply increased
dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc1_total_supply

# Check your ICPI balance
dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc1_balance_of "(record { owner = principal \"YOUR_PRINCIPAL\"; subaccount = null })"

# Backend proxy should match real ledger
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai icrc1_total_supply
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai icrc1_balance_of "(record { owner = principal \"YOUR_PRINCIPAL\"; subaccount = null })"
```

All four calls should show consistent values!

---

## Test 5: Check Mint Status (Optional)

### Context

You can check the status of pending or completed mints.

### Test Commands

```bash
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai check_mint_status '("mint_67ktx_1234567890")'
```

### Expected Outcomes

```rust
variant {
  Completed = record {
    icpi_minted = 1_000_000_000:nat;
    completed_at = 1234567890:nat64;
  }
}
```

Or for pending:

```rust
variant {
  Pending = record {
    initiated_at = 1234567890:nat64;
    usdt_amount = 10_000_000:nat;
  }
}
```

---

## Test 6: Pre-Burn State Check

### Context

Before burning, understand what tokens you'll receive back.

### Prediction Prompt

Before querying:
- How much ICPI do you want to burn?
- What percentage of total supply is that? (`burn_amount / total_supply`)
- What does the index currently hold? (ALEX, ZERO, KONG, BOB, ckUSDT)
- For each token: `you_receive = burn_percentage * canister_holding`

### Test Commands

```bash
# Get current ICPI supply
dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc1_total_supply

# Get current index holdings
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai get_index_state

# Check your ICPI balance
dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc1_balance_of "(record { owner = principal \"YOUR_PRINCIPAL\"; subaccount = null })"
```

### Expected Outcomes

**Example Calculation:**

```
Total ICPI supply: 100 ICPI
Your burn amount: 10 ICPI
Burn percentage: 10 / 100 = 10%

Current holdings:
- ALEX: 100 tokens → You receive: 10 ALEX
- ZERO: 50 tokens → You receive: 5 ZERO
- KONG: 20 tokens → You receive: 2 KONG
- BOB: 10 tokens → You receive: 1 BOB
- ckUSDT: $5 → You receive: $0.50 ckUSDT
```

### Interpretation

- ✅ Record these predictions for verification after burning
- ⚠️ Small amounts (dust) may be skipped if below transfer minimum
- 📊 Your proportional share equals your burn percentage

---

## Test 7: ICRC-2 Approval for Burning (Required)

### Context

Backend needs permission to burn your ICPI tokens. Unlike minting (where backend spends ckUSDT), here backend burns ICPI from your account.

### Prediction Prompt

Before approving:
- How much ICPI do you want to burn? (in raw units with 8 decimals)
- What is the ICPI transfer fee? (typically 1_000 units = 0.00001 ICPI)
- Approval amount: `burn_amount + transfer_fee`

### Test Commands

```bash
# Approve backend to burn 10 ICPI
# burn_amount = 1_000_000_000 (10 ICPI with 8 decimals)
# fee = 1_000 (0.00001 ICPI)
# total = 1_000_001_000

dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc2_approve '(record {
  spender = record {
    owner = principal "ev6xm-haaaa-aaaap-qqcza-cai";
    subaccount = null
  };
  amount = 1_000_001_000:nat;
  fee = opt (1_000:nat);
  expires_at = null;
  memo = null;
  created_at_time = null;
})'
```

### Expected Outcomes

- Returns: `variant { Ok = BLOCK_INDEX:nat }`
- No errors about insufficient funds

### Interpretation

- ✅ If `Ok` variant → Approval succeeded
- ❌ If `InsufficientFunds` → Not enough ICPI balance
- ❌ If `BadFee` → Wrong fee amount

**Verify Approval:**

```bash
dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc2_allowance '(record {
  account = record { owner = principal "YOUR_PRINCIPAL"; subaccount = null };
  spender = record { owner = principal "ev6xm-haaaa-aaaap-qqcza-cai"; subaccount = null }
})'
```

Expected: `allowance >= 1_000_001_000`

---

## Test 8: Initiate Burn

### Context

Burning is also 2-phase:
1. **Initiate**: Burns ICPI from your account
2. **Complete**: Transfers proportional tokens to you

### Prediction Prompt

Before initiating:
- How much ICPI are you burning? (in raw units with 8 decimals)
- Do you have sufficient approval?
- What burn_id format do you expect? (e.g., `burn_67ktx_1234567890`)

### Test Commands

```bash
# Initiate burn with 10 ICPI
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai initiate_burn '(1_000_000_000:nat)'
```

### Expected Outcomes

```rust
variant { Ok = "burn_67ktx_1234567890" }
```

- Returns burn_id string
- Format: `burn_{canister_id_short}_{timestamp}`

### Interpretation

- ✅ If `Ok` with burn_id → Phase 1 succeeded, ICPI burned
- ❌ If `Err: Insufficient allowance` → Approval missing
- ❌ If `Err: Insufficient balance` → Not enough ICPI
- ❌ If `Err: Already pending` → Incomplete burn exists

**Verify ICPI Burned:**

```bash
# Check your ICPI balance decreased
dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc1_balance_of "(record { owner = principal \"YOUR_PRINCIPAL\"; subaccount = null })"

# Check total supply decreased
dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc1_total_supply
```

---

## Test 9: Complete Burn

### Context

This phase transfers the proportional token redemption to your wallet.

### Prediction Prompt

Before completing:
- Based on Test 6 calculations, what tokens should you receive?
- Will any tokens be skipped due to dust amounts?

### Test Commands

```bash
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai complete_burn '("burn_67ktx_1234567890")'
```

### Expected Outcomes

```rust
variant {
  Ok = record {
    successful_transfers = vec {
      record { variant { ALEX }; 10_000_000_000:nat };
      record { variant { ZERO }; 5_000_000_000:nat };
      record { variant { KONG }; 2_000_000_000:nat };
      record { variant { BOB }; 1_000_000_000:nat };
      record { variant { ckUSDT }; 500_000:nat };
    };
    failed_transfers = vec {};
    icpi_burned = 1_000_000_000:nat;
  }
}
```

### Interpretation

- ✅ If transfers match predictions → Proportional burn working correctly
- ⚠️ If `failed_transfers` has entries → Check error messages (likely dust/gas)
- ✅ If no failed transfers → All redemptions succeeded

**Verify Received Tokens:**

```bash
# Check ALEX balance
dfx canister call --network ic jwcfb-hyaaa-aaaaq-aadgq-cai icrc1_balance_of "(record { owner = principal \"YOUR_PRINCIPAL\"; subaccount = null })"

# Check ZERO balance
dfx canister call --network ic rffwt-piaaa-aaaaq-aabqq-cai icrc1_balance_of "(record { owner = principal \"YOUR_PRINCIPAL\"; subaccount = null })"

# Check KONG balance
dfx canister call --network ic 73626-uqaaa-aaaaq-aaduq-cai icrc1_balance_of "(record { owner = principal \"YOUR_PRINCIPAL\"; subaccount = null })"

# Check BOB balance
dfx canister call --network ic 7pail-xaaaa-aaaas-aabmq-cai icrc1_balance_of "(record { owner = principal \"YOUR_PRINCIPAL\"; subaccount = null })"

# Check ckUSDT balance
dfx canister call --network ic cngnf-vqaaa-aaaar-qag4q-cai icrc1_balance_of "(record { owner = principal \"YOUR_PRINCIPAL\"; subaccount = null })"
```

Compare balances before and after burning - increases should match `successful_transfers`.

---

## Test 10: End-to-End Validation

### Context

Verify the complete mint → burn cycle maintains conservation of value.

### Prediction Prompt

Trace the complete flow:
1. Starting state: X ckUSDT, 0 ICPI
2. After mint: Y ICPI, (X - mint_amount) ckUSDT
3. What is NAV at this point?
4. After burn: Received tokens worth ~mint_amount USD
5. Did value conserve?

### Test Commands

```bash
# 1. Record starting balances
dfx canister call --network ic cngnf-vqaaa-aaaar-qag4q-cai icrc1_balance_of "(record { owner = principal \"YOUR_PRINCIPAL\"; subaccount = null })"

# 2. Mint 10 ckUSDT (follow Tests 2-4)

# 3. Check ICPI received and new NAV
dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc1_balance_of "(record { owner = principal \"YOUR_PRINCIPAL\"; subaccount = null })"
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai get_index_state

# 4. Burn all ICPI (follow Tests 7-9)

# 5. Check received tokens value
# Sum USD value of all received tokens
```

### Expected Outcomes

**Value Conservation:**
```
Mint: Deposit 10 ckUSDT
Burn: Receive tokens worth ~10 USD (minus fees)

Fees consumed:
- Mint: 0.1 ckUSDT backend fee + 2x 0.01 ckUSDT transfer fees = ~$0.12
- Burn: Small ICPI fee + per-token transfer fees = ~$0.05
- Total fees: ~$0.17

Net value: 10 - 0.17 = $9.83 ≈ received tokens value
```

### Interpretation

- ✅ If received value ≈ deposited value (minus fees) → System working correctly
- ✅ If NAV consistent before/after → No value leakage
- ❌ If value significantly differs → Check for calculation errors
- ⚠️ Small discrepancies acceptable due to price fluctuations and rounding

---

## Common Issues & Solutions

### Issue: Mint fails with "Insufficient allowance"

**Diagnosis:**
1. Check approval amount: `icrc2_allowance`
2. Verify you approved backend principal: `ev6xm-haaaa-aaaap-qqcza-cai`
3. Check approval hasn't expired

**Solution:**
Re-run Test 2 with correct approval amount.

---

### Issue: Mint times out after 2 minutes

**Diagnosis:**
1. Time the `complete_mint` call
2. If > 60s, TVL calculation is slow
3. Check canister logs for errors

**Solution:**
- If post-fix: Should be 15-25s (issue with deployment)
- Check `dfx canister logs --network ic ev6xm-haaaa-aaaap-qqcza-cai`

---

### Issue: Minted ICPI doesn't appear in wallet

**Diagnosis:**
1. Check real ledger: `icrc1_balance_of` on ICPI ledger
2. Check total supply increased
3. Verify you're querying the right principal

**Solution:**
- If on real ledger but wallet doesn't show: Wallet UI issue (check wallet settings)
- If not on real ledger: Critical bug (check complete_mint returned Ok)

---

### Issue: Burn fails with "Insufficient allowance"

**Diagnosis:**
1. Check ICPI approval on ICPI ledger (not ckUSDT!)
2. Verify amount approved >= burn amount

**Solution:**
Re-run Test 7 with ICPI token approval.

---

### Issue: Burn returns empty successful_transfers

**Diagnosis:**
1. Check burn percentage: Too small?
2. Check index holdings: Are they all zero?
3. Review failed_transfers for reasons

**Solution:**
- If holdings near zero: Expected (nothing to redeem)
- If failed_transfers shows dust: Amounts too small for transfer minimums
- Burn larger amount to get meaningful redemptions

---

### Issue: Received tokens don't match predictions

**Diagnosis:**
1. Calculate exact burn percentage: `burn_amount / total_supply`
2. Check index holdings at burn time (use timestamp)
3. Account for rounding (small discrepancies normal)

**Solution:**
- If off by <1%: Rounding or price changes (acceptable)
- If off by >5%: Check calculation or system bug

---

## Canister IDs Reference

```
ICPI Backend:     ev6xm-haaaa-aaaap-qqcza-cai
ICPI Token:       l6lep-niaaa-aaaap-qqeda-cai
ckUSDT:           cngnf-vqaaa-aaaar-qag4q-cai
ALEX:             jwcfb-hyaaa-aaaaq-aadgq-cai
ZERO:             rffwt-piaaa-aaaaq-aabqq-cai
KONG:             73626-uqaaa-aaaaq-aaduq-cai
BOB:              7pail-xaaaa-aaaas-aabmq-cai
```

---

## Testing Checklist

Before concluding testing is complete, verify:

### Minting
- [ ] Pre-mint predictions calculated correctly
- [ ] ICRC-2 approval for ckUSDT succeeded
- [ ] Mint initiated successfully (got mint_id)
- [ ] Mint completed in 15-25 seconds
- [ ] Minted ICPI matches prediction
- [ ] ICPI appears on real ledger (not just backend)
- [ ] ckUSDT balance decreased by expected amount

### Burning
- [ ] Pre-burn predictions calculated correctly
- [ ] ICRC-2 approval for ICPI succeeded
- [ ] Burn initiated successfully (got burn_id)
- [ ] Burn completed successfully
- [ ] Received tokens match prediction
- [ ] All expected transfers succeeded (check failed_transfers)
- [ ] Token balances increased correctly
- [ ] ICPI supply decreased by burn amount

### System Health
- [ ] Backend and real ledger show matching supplies
- [ ] NAV calculations consistent
- [ ] Value conserved through mint → burn cycle
- [ ] All inter-canister calls completed
- [ ] No silent failures in logs

---

## Conclusion

This guide enables comprehensive testing of ICPI's core functionality:

1. **Minting**: Deposit ckUSDT, receive proportional ICPI tokens
2. **Burning**: Redeem ICPI, receive proportional basket of assets
3. **Value Conservation**: System maintains economic integrity

Use the prediction-first methodology to catch bugs before they manifest, ensuring the ICPI system operates correctly on mainnet.

**Next Steps After Testing:**
- Document any discrepancies found
- Verify edge cases (dust amounts, zero holdings, etc.)
- Test with various mint/burn amounts
- Monitor gas fees and performance over time
