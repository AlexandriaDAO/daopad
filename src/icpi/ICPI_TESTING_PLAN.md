# ICPI Testing Plan

**Date:** 2025-10-02
**Network:** Internet Computer Mainnet
**Purpose:** Autonomous validation of ICPI minting and burning operations

---

## Testing Methodology

**DO NOT blindly execute commands.** For each test:

1. **Query current state** - Get supply, TVL, balances
2. **Calculate prediction** - Use formulas below to compute expected outcome
3. **Execute operation** - Run the dfx command
4. **Validate result** - Compare actual vs predicted (tolerance: <1% for rounding)
5. **Diagnose discrepancies** - If off by >1%, investigate and report

**Never assume success just because a command returns Ok.**

---

## Data Extraction from dfx Outputs

**All dfx commands return Candid format.** You must parse these outputs to extract values for calculations.

### Common Output Patterns

**Simple Nat (supply, balance):**
```
(500_000_000 : nat)
→ Extract: 500000000
```

**Result variant (success):**
```
variant { Ok = 1_000_000_000 : nat }
→ Extract: 1000000000 from Ok field
```

**Result variant (error):**
```
variant { Err = "Insufficient balance" }
→ This is a failure - report error message
```

**get_index_state output:**
```
variant {
  Ok = record {
    total_value = 33.3397042819486 : float64;
    current_positions = vec {
      record {
        token = variant { ALEX };
        balance = 13_255_494_290 : nat;
        usd_value = 16.454 : float64;
        ...
      };
      ...
    };
    ...
  }
}
```

**Extract:**
- TVL: `total_value` field (33.34)
- Token balances: `balance` field from each `current_positions` entry
- USD values: `usd_value` field for validation

**complete_burn output:**
```
variant {
  Ok = record {
    icpi_burned = 100_000_000:nat;
    successful_transfers = vec {
      record { "ckUSDT"; 11_256_752 : nat };
      record { "ALEX"; 8_836_996_193 : nat };
    };
    failed_transfers = vec {};
  }
}
```

**Extract:**
- Burned amount: `icpi_burned` field
- Redemptions: Parse `successful_transfers` array
- Failures: Check `failed_transfers` array

### Decimal Handling

**CRITICAL: Different tokens have different decimals:**
- ckUSDT: 6 decimals (e6) → 1,000,000 = 1 USDT
- ICPI: 8 decimals (e8) → 100,000,000 = 1 ICPI
- ALEX, ZERO, KONG, BOB: 8 decimals (e8)

**When calculating:**
- Always use raw units (no decimal conversion)
- Display to user with proper decimal places for readability
- Proportions are decimal-agnostic (percentage calculations work in raw units)

---

## Core Formulas

### Minting Formula
```
IF current_supply == 0:
    new_icpi = usdt_amount  (1:1 initial mint)
ELSE:
    new_icpi = (usdt_amount * current_supply) / current_tvl
```

Where:
- `usdt_amount`: ckUSDT deposited (e6 decimals)
- `current_supply`: Total ICPI in circulation (e8 decimals)
- `current_tvl`: Total USD value of backend holdings (query via `get_index_state`)

### Burning Formula
```
burn_percentage = icpi_to_burn / total_supply

For each token held by backend:
    user_receives = burn_percentage * backend_token_balance
```

### Net Asset Value (NAV)
```
NAV = current_tvl / current_supply
```

NAV should remain consistent before/after operations (within 1% for rounding/fees).

---

## Prerequisites

Before starting any tests:

```bash
# Get your principal
MY_PRINCIPAL=$(dfx identity get-principal)
echo "Testing with principal: $MY_PRINCIPAL"

# Check you have sufficient ckUSDT (minimum 10 USDT = 10_000_000 units)
dfx canister call --network ic cngnf-vqaaa-aaaar-qag4q-cai icrc1_balance_of \
  "(record { owner = principal \"$MY_PRINCIPAL\"; subaccount = null })"
```

**If insufficient ckUSDT:** Report to user and request more funds.

---

## Known Issues to Fix

1. **⚠️ 60-second burn timeout too short:** `burning.rs:11` has `TIMEOUT_NANOS = 60_000_000_000`. Should be increased to 180s (180_000_000_000) to allow time for fee approval and transfer.

2. **Fee approval workflow:** Users must approve ckUSDT fees BEFORE starting burn flow, or they'll timeout. Either:
   - Fix: Auto-request fee approval in `initiate_burn`
   - Or: Increase timeout to 3 minutes

---

## Test Suite

### Test 1: Pre-Flight Checks

**Purpose:** Verify system state and balance requirements

```bash
# Check ICPI supply
dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc1_total_supply

# Check my ckUSDT balance
dfx canister call --network ic cngnf-vqaaa-aaaar-qag4q-cai icrc1_balance_of \
  "(record { owner = principal \"$MY_PRINCIPAL\"; subaccount = null })"

# Check my ICPI balance
dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc1_balance_of \
  "(record { owner = principal \"$MY_PRINCIPAL\"; subaccount = null })"

# Get current index state
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai get_index_state
```

**Expected:**
- ckUSDT balance >= 10 USDT (10,000,000 units with 6 decimals)
- Index state shows current holdings and TVL

---

### Test 2: Minting Flow

**Architecture Note:** Backend needs ICRC-2 approval to spend user's ckUSDT

#### Phase 1: Prediction

**Query current state:**
```bash
# Get current ICPI supply
SUPPLY=$(dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc1_total_supply)

# Get current TVL and holdings
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai get_index_state
# Extract total_value field (this is TVL in USD)
```

**Calculate expected ICPI to receive:**

Using the minting formula:
- If `SUPPLY == 0`: Expected ICPI = mint_amount (1:1 ratio)
- If `SUPPLY > 0`: Expected ICPI = (mint_amount * SUPPLY) / TVL

**Example calculation:**
```
Minting: 10 ckUSDT = 10_000_000 units (e6)
Current supply: 0
Current TVL: $28.34

Since supply == 0:
  Expected ICPI = 10 ICPI = 1_000_000_000 units (e8)

Alternative scenario:
  Supply = 5 ICPI, TVL = $33.34
  Expected ICPI = (10 * 5) / 33.34 = 1.499 ICPI = 149_900_000 units
```

**Record your prediction before executing.**

#### Phase 2: Execute

##### Step 1: Approve ckUSDT Spending

```bash
# Approve 10.12 ckUSDT (10 USDT + 0.1 backend fee + 0.02 transfer fees)
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

**Expected:** `variant { Ok = BLOCK_INDEX:nat }`

#### Step 2: Initiate Mint

```bash
# Mint 10 ckUSDT worth of ICPI
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai initiate_mint '(10_000_000:nat)'
```

**Expected:** `variant { Ok = "mint_XXX_TIMESTAMP" }`
**Save the mint_id for next step!**

#### Step 3: Complete Mint (Performance Test)

```bash
# Time the complete_mint call (should be 15-25 seconds with parallelized TVL)
time dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai complete_mint '("MINT_ID_FROM_STEP_2")'
```

**Expected:**
- If supply was 0: 10 ICPI minted (1:1 ratio) = 1,000,000,000 units (8 decimals)
- If supply > 0: `(10 * current_supply) / current_tvl` ICPI minted
- Execution time: 15-25 seconds (parallelized) or 60-90s (sequential - needs fix)

#### Phase 3: Validate

**Query actual results:**
```bash
# Check total supply
ACTUAL_SUPPLY=$(dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc1_total_supply)

# Check your ICPI balance
ACTUAL_BALANCE=$(dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc1_balance_of \
  "(record { owner = principal \"$MY_PRINCIPAL\"; subaccount = null })")

# Verify backend proxy matches real ledger
PROXY_SUPPLY=$(dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai icrc1_total_supply)
PROXY_BALANCE=$(dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai icrc1_balance_of \
  "(record { owner = principal \"$MY_PRINCIPAL\"; subaccount = null })")
```

**Validation checks:**

1. **Minted amount matches prediction:**
   - Compare `ACTUAL_BALANCE` vs your predicted ICPI amount
   - Tolerance: Within 1% (rounding acceptable)
   - ❌ If off by >1%: Report discrepancy with calculation details

2. **Ledger consistency:**
   - `ACTUAL_SUPPLY` == `PROXY_SUPPLY` (must match exactly)
   - `ACTUAL_BALANCE` == `PROXY_BALANCE` (must match exactly)
   - ❌ If mismatch: CRITICAL BUG - backend proxy out of sync with real ledger

3. **Performance:**
   - Complete_mint execution time: 15-25 seconds (parallelized) ✅
   - If >60 seconds: TVL calculation is sequential (needs optimization)
   - If timeout: Check canister logs for inter-canister call failures

**Success criteria:**
- ✅ Minted ICPI matches prediction (within 1%)
- ✅ All 4 balance queries return identical values
- ✅ Execution time within expected range
- ✅ NAV calculation makes sense given holdings

---

### Test 3: Burning Flow

**Architecture Note:** Backend IS the minting account. Tokens sent to it are automatically burned. No ICRC-2 needed - users transfer ICPI directly via `icrc1_transfer`.

**⚠️ CRITICAL TIMING:** The entire flow must complete within 60 seconds or burn expires:
1. Approve fee
2. Initiate burn
3. Transfer ICPI
4. Complete burn

#### Phase 1: Prediction

**Query current state:**
```bash
# Get current ICPI supply
SUPPLY=$(dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc1_total_supply)

# Get backend token holdings
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai get_index_state
# Record each token balance from current_positions array
```

**Calculate expected redemption:**

Using the burning formula:
```
burn_percentage = amount_to_burn / total_supply

For each token backend holds:
    expected_redemption = burn_percentage * backend_balance
```

**Example calculation:**
```
Burning: 1 ICPI = 100_000_000 units (e8)
Total supply: 10 ICPI = 1_000_000_000 units
Burn percentage: 100_000_000 / 1_000_000_000 = 10%

Backend holdings (from get_index_state):
  - ALEX: 88_369_961_930 units
  - ckUSDT: 11_256_752 units
  - ZERO: 0
  - KONG: 0
  - BOB: 0

Expected redemption:
  - ALEX: 10% × 88_369_961_930 = 8_836_996_193 units (88.37 ALEX)
  - ckUSDT: 10% × 11_256_752 = 1_125_675 units (1.126 ckUSDT)
  - ZERO: 0 (no holdings)
  - KONG: 0 (no holdings)
  - BOB: 0 (no holdings)
```

**Record your predictions before executing.**

**Dust check:** Amounts below threshold (1000 units for most tokens, 10000 for ckUSDT) will be skipped as "dust."

#### Phase 2: Execute

##### Step 0: Pre-approve Fee (DO THIS FIRST!)

```bash
# Approve backend fee (0.1 ckUSDT + buffer)
dfx canister call --network ic cngnf-vqaaa-aaaar-qag4q-cai icrc2_approve '(record {
  spender = record {
    owner = principal "ev6xm-haaaa-aaaap-qqcza-cai";
    subaccount = null
  };
  amount = 120_000:nat;
  fee = opt (10_000:nat);
  expires_at = null;
  memo = null;
  created_at_time = null;
})'
```

#### Step 2: Initiate Burn

```bash
# Burn 1 ICPI (100,000,000 units with 8 decimals)
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai initiate_burn '(100_000_000:nat)'
```

**Expected:** `variant { Ok = "burn_XXX_TIMESTAMP" }`
**Save the burn_id!**

#### Step 3: Transfer ICPI to Backend (This Burns It)

```bash
# Transfer ICPI to backend - this automatically burns it
dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc1_transfer '(record {
  to = record {
    owner = principal "ev6xm-haaaa-aaaap-qqcza-cai";
    subaccount = null
  };
  amount = 100_000_000:nat;
  fee = null;
  memo = null;
  created_at_time = null;
})'
```

**Expected:** `variant { Ok = BLOCK_INDEX:nat }`

#### Step 4: Complete Burn (Receive Redemption)

```bash
# Complete burn to receive proportional tokens
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai complete_burn '("BURN_ID_FROM_STEP_2")'
```

**Expected:**
```rust
variant {
  Ok = record {
    icpi_burned = 100_000_000:nat;
    successful_transfers = vec {
      record { "ckUSDT"; AMOUNT:nat };
      record { "ALEX"; AMOUNT:nat };
      // ... other tokens
    };
    failed_transfers = vec {};  // Should be empty
  }
}
```

#### Phase 3: Validate

**Query actual results:**
```bash
# Check supply decreased
NEW_SUPPLY=$(dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc1_total_supply)

# Check received tokens (compare against balances BEFORE burning)
NEW_CKUSDT=$(dfx canister call --network ic cngnf-vqaaa-aaaar-qag4q-cai icrc1_balance_of \
  "(record { owner = principal \"$MY_PRINCIPAL\"; subaccount = null })")

NEW_ALEX=$(dfx canister call --network ic jwcfb-hyaaa-aaaaq-aadgq-cai icrc1_balance_of \
  "(record { owner = principal \"$MY_PRINCIPAL\"; subaccount = null })")

# Check other tokens as needed based on holdings
```

**Validation checks:**

1. **Supply decreased correctly:**
   - `NEW_SUPPLY == OLD_SUPPLY - burned_amount`
   - ❌ If mismatch: Tokens not actually burned or calculation error

2. **Redemption matches prediction:**
   - For each token in `successful_transfers`:
     - Compare actual received vs predicted amount
     - Tolerance: Within 1% (rounding acceptable)
   - ❌ If off by >1%: Report discrepancy with full calculation

3. **Check failed_transfers:**
   - Should be empty `vec {}`
   - ⚠️ If not empty: Examine reasons (usually dust or insufficient gas)
   - Tokens listed in failed_transfers were NOT received

4. **Proportionality check:**
   - Burn percentage should match redemption percentage for all tokens
   - All redemptions should be exact same percentage of holdings
   - ❌ If disproportionate: Math error in backend calculation

**Success criteria:**
- ✅ Total supply decreased by exact burn amount
- ✅ All redemption amounts match predictions (within 1%)
- ✅ No failed transfers (or only dust amounts)
- ✅ NAV remains consistent (TVL/Supply unchanged within 1%)

---

### Test 4: End-to-End Value Conservation

**Purpose:** Verify no value is lost or gained improperly through mint → burn cycle

```bash
# Record starting balances
INITIAL_CKUSDT=$(dfx canister call --network ic cngnf-vqaaa-aaaar-qag4q-cai icrc1_balance_of \
  "(record { owner = principal \"$MY_PRINCIPAL\"; subaccount = null })")

# Mint X ckUSDT (follow Test 2)
# Burn all ICPI received (follow Test 3)

# Check final balances
FINAL_CKUSDT=$(dfx canister call --network ic cngnf-vqaaa-aaaar-qag4q-cai icrc1_balance_of \
  "(record { owner = principal \"$MY_PRINCIPAL\"; subaccount = null })")

# Calculate net change
# Expected: initial - final ≈ fees (0.1 mint + 0.1 burn + transfer fees ≈ 0.25 ckUSDT)
```

**Expected:**
- Value approximately conserved (accounting for fees)
- NAV (TVL/Supply) remains consistent
- No silent failures in logs

---

## Quick Reference: Canister IDs

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

## Common Issues & Solutions

### Issue: Burn expired (timeout)

**Cause:** 60-second timeout too short for manual testing

**Solution:**
1. Pre-approve fee BEFORE initiating burn (Step 0)
2. Execute steps 2-4 within 60 seconds
3. Or increase `TIMEOUT_NANOS` in `burning.rs:11` to 180s

### Issue: Minted ICPI doesn't match prediction

**Cause:** TVL or supply calculation error

**Debug:**
```bash
# Check TVL calculation
dfx canister call --network ic ev6xm-haaaa-aaaap-qqcza-cai get_index_state

# Verify formula: new_icpi = (usdt_amount * supply) / tvl
# First mint: new_icpi = usdt_amount (1:1)
```

### Issue: Complete mint/burn fails

**Cause:** Often approval-related or inter-canister call failure

**Debug:**
```bash
# Check canister logs
dfx canister logs --network ic ev6xm-haaaa-aaaap-qqcza-cai

# Verify approvals
dfx canister call --network ic cngnf-vqaaa-aaaar-qag4q-cai icrc2_allowance '(record {
  account = record { owner = principal "YOUR_PRINCIPAL"; subaccount = null };
  spender = record { owner = principal "ev6xm-haaaa-aaaap-qqcza-cai"; subaccount = null }
})'
```

---

## Success Criteria

- [ ] Minting completes in 15-25 seconds
- [ ] Minted ICPI matches prediction formula
- [ ] Real ledger and backend proxy show same values
- [ ] Burning returns proportional tokens
- [ ] No failed transfers in burn result
- [ ] Total supply updates correctly
- [ ] Value conserved through mint → burn cycle
- [ ] No timeouts or silent failures

---

## Agent Execution Protocol

### State Tracking Requirements

**You MUST track and record:**
1. **All predictions** - Before executing, calculate and record expected outcome
2. **All actual results** - After executing, record actual values returned
3. **All discrepancies** - Any difference >1% between predicted and actual
4. **Intermediate values** - mint_id, burn_id, balances at each step
5. **Timing data** - Execution time for complete_mint and complete_burn

### Autonomous Testing Flow

```
For each test:
  1. Query state → Calculate prediction → Record prediction
  2. Execute operation → Record actual result
  3. Compare actual vs predicted:
     - If match (within 1%): ✅ PASS - Continue to next test
     - If mismatch (>1%): ❌ FAIL - Report discrepancy with full details
  4. Validate system invariants (NAV consistency, ledger sync, etc.)
```

### Reporting Requirements

**For each test, report:**
- ✅/❌ Pass/Fail status
- Predicted outcome (with calculation shown)
- Actual outcome
- Percentage difference (if any)
- Performance metrics (execution time)
- Any anomalies or warnings

**Example report format:**
```
Test 2: Minting Flow
Status: ✅ PASS

Prediction:
  - Supply before: 0
  - TVL: $28.34
  - Minting: 10 ckUSDT
  - Expected ICPI: 10.0 (1:1 initial mint)

Actual:
  - ICPI received: 10.0 (1,000,000,000 units)
  - Match: 100%

Performance:
  - complete_mint: 19.98s ✅ (within 15-25s target)

Validation:
  - Ledger consistency: ✅ All 4 queries match
  - NAV: $2.834/ICPI (reasonable given holdings)
```

### Failure Handling

**If any test fails:**
1. **Do NOT continue to next test** - Stop and report
2. **Include diagnostic data:**
   - Full calculation showing expected vs actual
   - Relevant system state (supply, TVL, holdings)
   - Any error messages from dfx commands
3. **Suggest probable cause** if identifiable
4. **Request user intervention** before proceeding

### Timeout Recovery

**If burn times out (60s expired):**
1. Record failure: "Burn expired due to 60s timeout"
2. Note: ICPI was burned but redemption not completed
3. Report: "Lost X ICPI to timeout - this is a known issue"
4. Recommend: "Increase TIMEOUT_NANOS to 180s in burning.rs:11"
5. **Do NOT retry** - tokens are already burned
