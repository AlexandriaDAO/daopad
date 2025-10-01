# ICPI Minting and Burning Plan

## Overview
ICPI is an ICRC1 token that represents proportional ownership in a basket of tokens weighted by their locked liquidity. Users mint ICPI by depositing ckUSDT and burn ICPI to redeem their proportional share of underlying tokens.

## Critical Security Considerations

### Atomicity Challenge
**THE CORE PROBLEM**: IC doesn't support atomic multi-canister operations. Every mint/burn involves multiple inter-canister calls that can partially fail.

### Solution: Two-Phase Commit Pattern
We implement a **secure two-phase commit** pattern with timeout protection:

1. **Phase 1: Lock & Verify**
   - User initiates mint/burn request
   - System creates a pending operation with unique ID
   - Collects required tokens/approvals
   - Sets timeout (60 seconds)

2. **Phase 2: Commit or Rollback**
   - If all transfers succeed → commit and mint/burn ICPI
   - If any transfer fails → rollback and return tokens
   - If timeout → automatic rollback

### Kongswap Query Reliability
Based on codebase analysis, Kongswap queries are reliable but have **race condition vulnerabilities**:
- Query data becomes stale immediately after reading
- Large trades between query and execution can change pool state
- No atomic read-execute pattern in Kongswap

**Mitigation**:
- Treat all TVL queries as estimates
- Add 1% slippage tolerance in calculations
- Verify actual received amounts match expectations (±1%)

## Minting Mechanism

### Formula
```
new_icpi_tokens = (ckusdt_deposit_after_fee * current_icpi_supply) / current_total_value
```
**Note**: Canister always has initial seed TVL, so division by zero is impossible.

### Token Precision
- **ICPI decimals**: 8 (same as ICP/ckUSDT standard)
- **Minimum mintable**: 0.00000001 ICPI
- **Calculation precision**: Use Nat arithmetic with 10^12 intermediate precision
- **Rounding**: Always round down to protect existing holders

### Process Flow
1. **User initiates mint with ckUSDT amount**
   - No minimum (except 1 ckUSDT fee)
   - User approves: deposit_amount + 1_00000000 (fee in e8s)

2. **Create pending mint operation**
   ```rust
   PendingMint {
       id: unique_nonce(),
       user: caller,
       ckusdt_amount: amount,
       icpi_to_mint: None, // calculated later
       status: Pending,
       created_at: time(),
       expires_at: time() + 60_000_000_000, // 60 seconds
   }
   ```

3. **Collect fee first** (atomic with ICRC2)
   - Transfer 1 ckUSDT to fee canister (e454q-riaaa-aaaap-qqcyq-cai)
   - If fails → abort immediately, no rollback needed

4. **Collect deposit** (atomic with ICRC2)
   - Transfer deposit amount from user to ICPI canister
   - If fails → abort (fee already collected, user aware)

5. **Calculate mint amount**
   - Query current ICPI total supply
   - Calculate current TVL with verification:
     - Query all token balances
     - Get Kongswap prices for each token
     - If any query fails → rollback and refund deposit (keep fee)
   - Apply formula with precision handling

6. **Commit mint**
   - Mint calculated ICPI tokens to user
   - Mark operation complete
   - Return success with minted amount

### Implementation Requirements
```rust
pub async fn initiate_mint(amount: Nat) -> Result<MintTicket, String> {
    // 1. Create pending operation with timeout
    // 2. Collect 1 ckUSDT fee (no rollback if fails)
    // 3. Collect deposit via icrc2_transfer_from
    // 4. Return ticket ID for status checking
}

pub async fn complete_mint(ticket: MintTicket) -> Result<Nat, String> {
    // 1. Verify ticket valid and not expired
    // 2. Calculate TVL with fallback on query failure
    // 3. Calculate ICPI to mint (with 10^12 precision)
    // 4. Mint tokens to user
    // 5. Clean up pending operation
}

pub async fn check_mint_status(ticket: MintTicket) -> MintStatus {
    // Returns: Pending | Complete(amount) | Failed(reason) | Expired
}
```

### Example Calculation (with precision)
```
Current supply: 1000_00000000 ICPI (1000 * 10^8)
Current TVL: 1100_00000000 ckUSDT (1100 * 10^8)
User deposits: 110_00000000 ckUSDT (after 1 ckUSDT fee)

Calculation with 10^12 precision:
ratio = (110_00000000 * 10^12) / 1100_00000000 = 100000000000 (0.1 * 10^12)
new_tokens = (1000_00000000 * 100000000000) / 10^12 = 100_00000000

User receives: 100 ICPI (exactly 9.09% of new total supply)
```

## Burning (Redemption) Mechanism

### Formula
```
tokens_to_receive[each_token] = (icpi_burn_amount / total_icpi_supply) * token_holdings[each_token]
```

### Process Flow
1. **User initiates burn with ICPI amount**
   - No minimum (except 1 ckUSDT fee requirement)
   - User must have 1 ckUSDT for fee payment

2. **Create pending burn operation**
   ```rust
   PendingBurn {
       id: unique_nonce(),
       user: caller,
       icpi_amount: amount,
       tokens_to_receive: Vec::new(), // calculated later
       status: Pending,
       created_at: time(),
       expires_at: time() + 60_000_000_000, // 60 seconds
   }
   ```

3. **Collect fee first** (atomic with ICRC2)
   - Transfer 1 ckUSDT from user to fee canister (e454q-riaaa-aaaap-qqcyq-cai)
   - If fails → abort immediately

4. **Lock ICPI tokens** (internal operation)
   - Move ICPI from user balance to pending_burns map
   - This prevents double-spending during redemption

5. **Calculate redemption amounts**
   ```rust
   let burn_ratio = icpi_amount * 10^12 / total_supply;
   for each token in portfolio:
       amount = (token_balance * burn_ratio) / 10^12;
       if amount > transfer_fee:
           tokens_to_receive.push((token_id, amount));
   ```

6. **Execute transfers sequentially**
   - For each token in tokens_to_receive:
     - Attempt transfer to user
     - If transfer fails:
       - Log failure but continue with other tokens
       - Failed tokens remain in canister (increases value for holders)
   - Track successful and failed transfers

7. **Commit or partial commit**
   - If all transfers succeed → burn ICPI, mark complete
   - If some transfers fail → burn ICPI anyway, log failures
   - Return list of successful transfers and failures

### Implementation Requirements
```rust
pub async fn initiate_burn(amount: Nat) -> Result<BurnTicket, String> {
    // 1. Verify user has ICPI balance
    // 2. Collect 1 ckUSDT fee (no rollback if fails)
    // 3. Lock ICPI tokens in pending_burns
    // 4. Return ticket ID
}

pub async fn complete_burn(ticket: BurnTicket) -> Result<BurnResult, String> {
    // 1. Verify ticket valid and not expired
    // 2. Calculate proportional amounts for each token
    // 3. Execute transfers (continue on failures)
    // 4. Burn ICPI tokens
    // 5. Return results with successful/failed transfers
}

pub struct BurnResult {
    successful_transfers: Vec<(String, Nat)>,
    failed_transfers: Vec<(String, Nat, String)>, // token, amount, reason
    icpi_burned: Nat,
}
```

### Example Calculation
```
User burns: 100_00000000 ICPI
Total supply: 1000_00000000 ICPI (before burn)
Burn ratio: 100_00000000 * 10^12 / 1000_00000000 = 100000000000 (0.1 * 10^12)

Portfolio:
- 500_00000000 ALEX → user gets 50_00000000 ALEX
- 300_00000000 KONG → user gets 30_00000000 KONG
- 200_00000000 BOB → user gets 20_00000000 BOB
- 100_00000000 ckUSDT → user gets 10_00000000 ckUSDT

If BOB transfer fails:
- User still receives ALEX, KONG, ckUSDT
- 20 BOB remains in canister (benefits remaining holders)
- ICPI is still burned
```

## Fee Structure

### Simple Flat Fee Model
- **Every operation** (mint or burn) requires **exactly 1 ckUSDT fee**
- **Fee recipient**: e454q-riaaa-aaaap-qqcyq-cai (parent project staking canister)
- **Fee collection**: Always happens first, before any other transfers
- **No fee waivers**: Even for large amounts, fee is always 1 ckUSDT
- **Fee on failure**: If operation fails after fee collection, fee is NOT refunded

### Implementation
```rust
const FEE_AMOUNT: Nat = Nat::from(100000000u64); // 1 ckUSDT in e8s
const FEE_RECIPIENT: Principal = Principal::from_text("e454q-riaaa-aaaap-qqcyq-cai");

async fn collect_fee(user: Principal) -> Result<(), String> {
    let result = icrc2_transfer_from(
        ckusdt_canister,
        user,
        FEE_RECIPIENT,
        FEE_AMOUNT
    ).await?;
    Ok(())
}
```

## Special Considerations

### Precision and Rounding
- **All calculations**: Use 10^12 intermediate precision
- **Rounding direction**: Always round down (protects existing holders)
- **Dust amounts**: Skip transfers below token transfer fees
- **Display precision**: Show up to 8 decimals (e8s standard)

### Error Handling
1. **Mint failures**:
   - Insufficient ckUSDT for fee or deposit → abort
   - TVL query fails → refund deposit (keep fee)
   - Timeout expires → automatic refund

2. **Burn failures**:
   - Insufficient ckUSDT for fee → abort
   - Insufficient ICPI balance → abort
   - Token transfer fails → continue with others, log failures

3. **Timeout Protection**:
   - All pending operations expire after 60 seconds
   - Expired mints → refund deposit (keep fee)
   - Expired burns → unlock ICPI tokens

### State Management
- **NO persistent storage** for user balances (query from ICRC1 ledger)
- **Temporary state only** for pending operations (with timeout)
- **Portfolio composition** derived from actual token balances
- **TVL calculation** always fresh from current balances

## Integration Points

### With Rebalancer
- Newly deposited ckUSDT available for next hourly rebalancing
- Burning reduces liquidity but maintains proportions

### With Balance Tracker
- Query current holdings for redemption calculations
- No persistent tracking needed

### With TVL Calculator
- Critical for mint calculations
- Must handle query failures gracefully

## Testing Strategy

### Mainnet Testing Commands
```bash
# Test minting - Phase 1: Initiate
dfx canister call icpi_backend initiate_mint '(10000000000)' --network ic
# Returns: variant { ok = "ticket_12345" }

# Test minting - Phase 2: Complete
dfx canister call icpi_backend complete_mint '("ticket_12345")' --network ic
# Returns: variant { ok = 9090909090 } (ICPI minted)

# Check mint status
dfx canister call icpi_backend check_mint_status '("ticket_12345")' --network ic

# Test burning - Phase 1: Initiate
dfx canister call icpi_backend initiate_burn '(100000000)' --network ic
# Returns: variant { ok = "burn_ticket_67890" }

# Test burning - Phase 2: Complete
dfx canister call icpi_backend complete_burn '("burn_ticket_67890")' --network ic
# Returns: detailed transfer results

# Query ICPI balance
dfx canister call icpi_backend icrc1_balance_of '(record { owner = principal "your-principal"; subaccount = null })' --network ic
```

### Critical Test Scenarios
1. **Race condition test** - Start mint while TVL changing rapidly
2. **Timeout test** - Let pending operation expire, verify refund
3. **Partial failure** - Burn when some token transfers fail
4. **Fee collection** - Verify fee always collected first
5. **Precision test** - Mint/burn tiny amounts, verify rounding

## Security Audit Checklist

### Two-Phase Commit Security
- [ ] Pending operations have unique IDs (no collision)
- [ ] Timeout enforcement is reliable (60 seconds)
- [ ] Refund mechanism cannot be exploited
- [ ] Double-spend prevention on ICPI burns
- [ ] Fee collection is atomic and irreversible

### Arithmetic Security
- [ ] No division by zero (seed TVL prevents this)
- [ ] Overflow protection in multiplication
- [ ] Precision loss minimized (10^12 intermediate)
- [ ] Rounding always favors existing holders

### Query Security
- [ ] TVL queries have fallback mechanism
- [ ] Stale data detected via slippage checks
- [ ] Kongswap failures handled gracefully
- [ ] No trust in single query result

### Transfer Security
- [ ] ICRC2 approval checks before transfers
- [ ] Transfer failures don't break entire operation
- [ ] Partial success handling is correct
- [ ] No tokens can be permanently locked

## Implementation Priority

1. **Phase 1: Core Security Infrastructure**
   - Two-phase commit pattern
   - Timeout mechanism
   - Pending operation storage

2. **Phase 2: Minting with Security**
   - Fee collection
   - TVL calculation with fallbacks
   - Refund mechanism

3. **Phase 3: Burning with Resilience**
   - Multi-token transfer handling
   - Partial failure recovery
   - Result reporting

4. **Phase 4: Production Hardening**
   - Monitoring and alerts
   - Performance optimization
   - Comprehensive error messages