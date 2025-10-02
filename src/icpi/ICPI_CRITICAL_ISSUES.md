# ICPI Critical Issues - Testing Results

**Date:** 2025-10-02
**Tested on:** Mainnet (IC)
**Test:** Minting 10 ckUSDT worth of ICPI

---

## 🔴 CRITICAL: Token Ledger Not Integrated

### Problem
The backend has its own in-memory ICRC-1 token implementation instead of calling the separate ICPI token ledger canister.

### Evidence
```bash
# Backend thinks supply is 10 ICPI
$ dfx canister call --network ic icpi_backend icrc1_total_supply
(1_000_000_000 : nat)  # 10 ICPI with 8 decimals

# Actual token ledger has 0 supply
$ dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc1_total_supply
(0 : nat)

# Backend thinks user has 10 ICPI
$ dfx canister call --network ic icpi_backend get_all_balances
(vec { record { principal "67ktx..."; 1_000_000_000 : nat } })

# Actual token ledger shows 0 balance
$ dfx canister call --network ic l6lep-niaaa-aaaap-qqeda-cai icrc1_balance_of '(...)'
(0 : nat)
```

### Impact
**SEVERITY: CRITICAL**
- Users' ICPI tokens don't actually exist on the ledger
- Tokens cannot be transferred via standard ICRC-1 tools/wallets
- Complete disconnect between backend state and blockchain reality
- All minting operations are fake - just updating in-memory state

### Required Fix
Backend must call `l6lep-niaaa-aaaap-qqeda-cai` (ICPI token ledger) to actually mint tokens, not maintain its own parallel ledger.

---

## 🟡 ISSUE: Mint Operation Timeout

### Problem
`complete_mint()` times out after 2 minutes but operation completes successfully in background.

### Evidence
```bash
$ dfx canister call --network ic icpi_backend complete_mint '("mint_...")'
# Hangs for 2 minutes, then times out

$ dfx canister call --network ic icpi_backend check_mint_status '("mint_...")'
(variant { Ok = variant { Calculating } })  # Stuck here for 90+ seconds

# Later:
(variant { Ok = variant { Complete = 1_000_000_000 : nat } })
```

### Test Results
- Mint initiated: ✅
- Fee collected (0.01 ckUSDT): ✅
- Deposit collected (10 ckUSDT): ✅
- TVL calculation: ⏱️ **HANGS FOR 90+ SECONDS**
- Mint completion: ✅ (eventually)
- User notification: ❌ (timeout before response)

### Impact
**SEVERITY: MEDIUM**
- Poor UX - users think operation failed
- Frontend cannot rely on synchronous responses
- Actual operation completes successfully but client doesn't know

### Likely Cause
TVL calculation doing too many inter-canister calls:
1. Query kong_locker for all lock canisters
2. Query each lock canister's LP positions via kongswap
3. Price lookups for each token
4. Not parallelized or cached during mint

---

## 🟡 ISSUE: Rebalancer Stopped Working

### Problem
Hourly rebalancer stopped executing trades despite clear deficit and available ckUSDT.

### Evidence
```bash
$ dfx canister call --network ic icpi_backend get_index_state
# Current state:
# - ckUSDT: $19.31 (66.7% of portfolio)
# - ALEX: $9.66 (33.3% of portfolio)
# - Target ALEX: 95.2% (needs $17.92 more ALEX)
# - Deviation: 61.9% underweight

$ dfx canister call --network ic icpi_backend get_rebalancer_status
# Last trade: 10+ hours ago
# Last 7 cycles: "No rebalancing needed"
# Timer active: true
# next_rebalance timestamp: 1_759_379_994... (IN THE PAST!)
```

### Timeline
1. **Working Period:** 3 successful ALEX purchases (~$3.14 total)
2. **Stopped:** Last 10+ hours - no trades despite:
   - $19.31 ckUSDT available (>$10 threshold)
   - ALEX 61% underweight
   - Calculated trade size: $1.79 (>$0.50 minimum)

### Impact
**SEVERITY: HIGH**
- Core functionality broken - index not rebalancing
- Portfolio drifting from target allocation
- Timer appears stuck (next_rebalance in past)

### Possible Causes
1. Timer not firing (next_rebalance timestamp frozen)
2. Logic error in rebalancing conditions
3. Silent failure in trade execution that halts future attempts
4. Threshold misconfiguration

---

## 🟢 WORKING: Basic Minting Flow

### What Works
✅ `initiate_mint()` creates operation
✅ ICRC-2 approval mechanism works
✅ Fee collection (0.01 ckUSDT)
✅ Deposit collection (10 ckUSDT)
✅ TVL calculation (eventually completes)
✅ Proportional formula calculation
✅ Mint status tracking

### Formula Verification
Given:
- TVL before: $18.97
- Deposit: $10 ckUSDT
- Supply before: 0

Expected: First mint should use 1:1 bootstrap rate per CLAUDE.md
Actual: **Minted 10 ICPI** (correct!)

---

## 🟢 WORKING: TVL Calculation

### What Works
✅ Queries token balances correctly
✅ Calculates USD values via Kongswap prices
✅ Tracks [ALEX, ZERO, KONG, BOB, ckUSDT]
✅ Computes target allocations from locked liquidity
✅ Deviation calculations accurate

### Current State
```
Total Value: $28.97
- ALEX: $9.66 (33.3%) → Target: 95.2%
- ckUSDT: $19.31 (66.7%) → Should be 0%
- ZERO: $0 → Target: 4.5%
- KONG: $0 → Target: 0.27%
- BOB: $0 → Target: 0.008%
```

---

## Test Summary

| Component | Status | Notes |
|-----------|--------|-------|
| **Token Ledger Integration** | ❌ BROKEN | Critical - tokens don't exist |
| **Minting** | ⚠️ WORKS | But times out + wrong ledger |
| **Burning** | ❓ NOT TESTED | Likely same ledger issue |
| **Rebalancing** | ❌ BROKEN | Stopped executing trades |
| **TVL Calculation** | ✅ WORKS | But too slow (90s) |
| **Price Discovery** | ✅ WORKS | Kongswap integration ok |

---

## Priority Fixes

### P0 - Critical (Blocks Launch)
1. **Integrate actual ICPI token ledger** - Backend must call `l6lep-niaaa-aaaap-qqeda-cai` to mint/burn, not use internal ledger

### P1 - High (Core Functionality)
2. **Fix rebalancer** - Timer stuck, not executing trades
3. **Optimize TVL calculation** - 90s is too slow, parallelize calls

### P2 - Medium (UX)
4. **Fix mint timeout** - Either speed up or use async pattern
5. **Add proper error handling** - Mint hung in "Calculating" for 90s with no feedback

---

## Next Steps
1. Examine `src/icpi_backend/src/icpi_token.rs` - likely has in-memory ledger implementation
2. Add inter-canister calls to real ICPI ledger for mint/burn
3. Debug rebalancer timer logic - check why "No rebalancing needed" when ALEX 61% underweight
4. Add logging to TVL calculation to identify slow inter-canister calls
5. Test burn operation (likely has same ledger issue)
