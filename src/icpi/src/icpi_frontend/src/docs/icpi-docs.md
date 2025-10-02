# ICPI Protocol Documentation

*Technical reference for the Internet Computer Portfolio Index*

---

## What is ICPI?

ICPI (Internet Computer Portfolio Index) is an ICRC-1 token that represents a proportional ownership stake in a basket of Internet Computer tokens. It's an index fund that automatically tracks and rebalances to match the dollar value distribution of locked liquidity in Kongswap pools.

**Tracked tokens:** ALEX, ZERO, KONG, and BOB
**Decimals:** 8
**Initial supply:** 1 ICPI seeded to deployer
**Transfer fee:** 0

## How is the Mint Price Calculated?

### Proportional Formula

The mint price uses a **proportional formula** that ensures exact fair pricing:

```
new_icpi = (usdt_deposit × current_supply) / current_tvl
```

This ensures depositors get exact proportional ownership - contribute 9.09% of value, get 9.09% of tokens.

### Minting Process (minting.rs)

1. User initiates mint with ckUSDT amount (minimum 1 ckUSDT)
2. Fee collected (0.01 ckUSDT)
3. Deposit collected from user
4. **TVL calculated:** Sum of all canister holdings (ckUSDT balance + value of ALEX, ZERO, KONG, BOB tokens)
5. Formula applied to determine ICPI amount
6. ICPI minted to user

### Example Calculation

**Given:**
- Current TVL: $1,000
- Current Supply: 100 ICPI
- User Deposits: $100 ckUSDT

**Calculation:**
```
new_icpi = (100 × 100) / 1,000
new_icpi = 10 ICPI
```

**Result:** User receives 10 ICPI (9.09% of new supply)
Represents exactly 9.09% ownership of all index holdings

### Refund Policy

If TVL calculation fails or TVL is zero, deposit is refunded (fee kept).

**Refund Scenarios:**
- TVL calculation failure → Deposit refunded
- Zero TVL (no holdings) → Deposit refunded
- Math calculation error → Deposit refunded

## How is the Burn Price Calculated?

### Inverse Proportional Formula

Burning uses the **inverse proportional formula**:

```
token_redemption = (burn_amount / total_supply) × token_balance
```

Burning 1% of ICPI supply returns exactly 1% of each token holding.

### Redemption Process (burning.rs)

1. User initiates burn with ICPI amount
2. Fee collected (0.01 ckUSDT)
3. For each token (ALEX, ZERO, KONG, BOB, ckUSDT):
   - Calculate proportional share
   - Transfer tokens to user (skips dust amounts <1000 units)
4. ICPI burned from user balance
5. Returns list of successful/failed token transfers

### Example: Burning 10% of Supply

**Given:**
- Total Supply: 100 ICPI
- User Burns: 10 ICPI (10%)
- Index Holdings:
  - 1,000 ALEX
  - 500 ZERO
  - 200 KONG
  - 50 BOB

**User Receives (10% of each):**
- 100 ALEX
- 50 ZERO
- 20 KONG
- 5 BOB

## How Does Rebalancing Work?

### Hourly Automated Rebalancing (rebalancer.rs)

**Hourly automated rebalancing** via ic-cdk-timers (one trade per hour):

- **If ckUSDT available (>$10):** Buy token with largest deficit, trade size = 10% of deficit
- **Else if tokens over-allocated:** Sell most overweight token to ckUSDT, trade size = 10% of excess
- All trades go through ckUSDT as intermediary
- Sequential execution only (no batching) - required by Kongswap design

### Target Allocation Calculation (tvl_calculator.rs)

```
target% = token_locked_liquidity / total_locked_liquidity
```

1. Query kong_locker_backend for all lock canisters
2. Query each lock canister via kongswap_backend user_balances for LP positions
3. For each LP position: 50/50 pools attribute half of USD value to each token
4. Only count [ALEX, ZERO, KONG, BOB] tokens
5. Calculate percentages: Each token's TVL / Total TVL × 100%
6. Cache for 5 minutes to reduce inter-canister calls

### Example Distribution

**From project docs (example locked TVL):**
- ALEX: 48.57% ($22.5K locked)
- ZERO: 1.38% ($640)
- KONG: 0.11% ($48.71)
- BOB: 0.00% ($2.05)

## How is Index Weighting Determined?

**Dynamic weighting based on locked liquidity:**

Index weights are determined by the dollar value of locked liquidity in Kongswap pools. The system queries kong_locker to find all lock canisters, then queries each for their LP positions.

For each 50/50 liquidity pool, half the USD value is attributed to each token. Only [ALEX, ZERO, KONG, BOB] tokens are tracked.

Percentages are calculated as: Each token's TVL / Total TVL × 100%

This data is cached for 5 minutes to optimize performance.

## Key Features & Design Principles

### Safety-First Design

- No persistent storage for balances - queries actual token canisters
- In-memory caching with 5-minute TTL
- Refunds on calculation failures
- Two-phase mint/burn (initiate → complete)

### Gas Efficiency

- Parallel inter-canister calls (futures::join_all)
- 60-second timeout on operations
- Cleanup timers for expired operations

### Price Discovery

- All prices queried from Kongswap swap_amounts endpoint in real-time
- Portfolio value: Current canister holdings (not locked liquidity) determine mint/burn calculations

---

**Disclaimer:** This documentation describes the technical implementation of the ICPI protocol. It is not financial advice. Digital assets carry risk.

*Protocol Version: 1.0.0 | Last Updated: 2025-10-01*
