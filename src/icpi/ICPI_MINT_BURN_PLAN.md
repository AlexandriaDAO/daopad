# ICPI Minting and Burning Plan

## Overview
ICPI is an ICRC1 token that represents proportional ownership in a basket of tokens weighted by their locked liquidity. Users mint ICPI by depositing ckUSDT and burn ICPI to redeem their proportional share of underlying tokens.

## Minting Mechanism

### Formula
```
new_icpi_tokens = (ckusdt_deposit * current_icpi_supply) / current_total_value
```

### Process Flow
1. **User deposits ckUSDT**
   - Minimum deposit: 1 ckUSDT (to avoid dust)
   - Maximum deposit: No limit (market determines)

2. **Calculate mint amount**
   - Query current ICPI total supply
   - Calculate current TVL (sum of all token holdings valued in ckUSDT)
   - Apply formula to determine ICPI tokens to mint
   - Special case: If supply = 0, then 1 ckUSDT = 1 ICPI (initial mint)

3. **Execute mint**
   - Transfer ckUSDT from user to ICPI canister
   - Mint calculated ICPI tokens to user
   - Hold ckUSDT until next rebalancing cycle

### Implementation Requirements
```rust
pub async fn mint_icpi(amount: Nat) -> Result<Nat, String> {
    // 1. Verify ckUSDT allowance and balance
    // 2. Calculate current TVL from all token holdings
    // 3. Query ICPI total supply
    // 4. Calculate mint amount
    // 5. Transfer ckUSDT from caller
    // 6. Mint ICPI tokens to caller
    // 7. Return minted amount
}
```

### Example Scenarios
- **Initial mint**: User deposits 100 ckUSDT when supply = 0 → receives 100 ICPI
- **Proportional mint**:
  - Current supply: 1000 ICPI
  - Current TVL: $1100 (in ckUSDT)
  - User deposits: 110 ckUSDT
  - Receives: (110 * 1000) / 1100 = 100 ICPI
  - User now owns 100/1100 = 9.09% of the index

## Burning (Redemption) Mechanism

### Formula
```
tokens_to_receive[each_token] = (icpi_burn_amount / total_icpi_supply) * token_holdings[each_token]
```

### Process Flow
1. **User burns ICPI**
   - Minimum burn: 0.1 ICPI (to avoid dust)
   - Burns represent proportional ownership claim

2. **Calculate redemption amounts**
   - For each token in portfolio:
     - Calculate user's proportion of total supply
     - Apply proportion to each token holding
   - Include any unallocated ckUSDT in redemption

3. **Execute redemption**
   - Burn ICPI tokens from user
   - Transfer calculated amounts of each token to user
   - Handle transfer failures gracefully

### Implementation Requirements
```rust
pub async fn burn_icpi(amount: Nat) -> Result<Vec<(String, Nat)>, String> {
    // 1. Verify user has sufficient ICPI balance
    // 2. Calculate burn percentage (amount / total_supply)
    // 3. For each token holding:
    //    - Calculate proportional amount
    //    - Queue for transfer
    // 4. Burn ICPI tokens from caller
    // 5. Execute all token transfers
    // 6. Return list of (token_id, amount) transferred
}
```

### Example Scenarios
- **Full redemption**:
  - User burns 100 ICPI out of 1000 total (10%)
  - Portfolio holds: 500 ALEX, 300 KONG, 200 BOB, 100 ckUSDT
  - User receives: 50 ALEX, 30 KONG, 20 BOB, 10 ckUSDT

- **Partial redemption**:
  - User burns 1 ICPI out of 1000 total (0.1%)
  - Receives 0.1% of each token holding

## Special Considerations

### Fees
- **Minting fee**: 0.1% of deposited ckUSDT (optional, for treasury)
- **Burning fee**: 0.1% of redeemed value (optional, for treasury)
- **Transfer fees**: Account for ICRC1 transfer fees on each token

### Minimum Amounts
- **Mint minimum**: 1 ckUSDT (prevents dust attacks)
- **Burn minimum**: 0.1 ICPI (prevents dust redemptions)
- **Token dust threshold**: Don't transfer if amount < transfer fee

### Error Handling
1. **Mint failures**:
   - Insufficient ckUSDT balance
   - Transfer approval missing
   - Overflow in calculations

2. **Burn failures**:
   - Insufficient ICPI balance
   - Token transfer failures (continue with others)
   - No tokens to redeem (empty portfolio)

### State Management
- **No persistent storage** for user balances (query from ICRC1 ledger)
- **Portfolio composition** derived from actual token balances
- **TVL calculation** always fresh from current balances

## Integration Points

### With Rebalancer
- Newly minted ckUSDT available for next rebalancing cycle
- Burning reduces available liquidity for rebalancing

### With Balance Tracker
- Query current token holdings for redemption calculations
- Update internal tracking after mints/burns

### With TVL Calculator
- Required for accurate mint calculations
- Provides real-time portfolio valuation

## Testing Strategy

### Mainnet Testing Commands
```bash
# Test minting
dfx canister call icpi_backend mint_icpi '(1000000000)' --network ic

# Test burning
dfx canister call icpi_backend burn_icpi '(100000000)' --network ic

# Query user balance
dfx canister call icpi_backend icrc1_balance_of '(record { owner = principal "your-principal"; subaccount = null })' --network ic
```

### Test Scenarios
1. **Initial mint** - First user minting when supply = 0
2. **Proportional mint** - Subsequent mints maintain ownership ratios
3. **Small redemption** - Burn small amount, verify proportional returns
4. **Large redemption** - Burn significant portion, check slippage
5. **Edge cases** - Zero balances, minimum amounts, maximum amounts

## Security Considerations

1. **Reentrancy protection** - Use guards on mint/burn functions
2. **Integer overflow** - Use checked arithmetic for all calculations
3. **Access control** - No admin functions, fully permissionless
4. **Approval verification** - Always check ICRC2 approvals before transfers
5. **Atomic operations** - Ensure mint/burn and transfers are atomic

## Implementation Priority

1. **Phase 1: Basic Minting**
   - Implement mint_icpi function
   - ICRC1 token minting logic
   - ckUSDT transfer handling

2. **Phase 2: Basic Burning**
   - Implement burn_icpi function
   - Multi-token transfer logic
   - Proportional calculation

3. **Phase 3: Edge Cases**
   - Dust handling
   - Transfer failure recovery
   - Fee implementation (if needed)

4. **Phase 4: Optimization**
   - Batch transfer optimization
   - Gas efficiency improvements
   - Event logging for tracking