# Kong Locker Pool Validation Plan

## Problem Statement

**Critical Vulnerability**: The current kong_locker system calculates voting power based on the USD value of locked LP tokens, using only the pool's symbol (e.g., "ICP_ckUSDT") to identify pools. This creates a major attack vector:

1. Attacker creates a fake token with the same symbol as a legitimate token (e.g., fake "ckUSDT")
2. Attacker creates a liquidity pool with the fake token (e.g., "ICP_FakeUSDT")
3. Pool appears identical by symbol name ("ICP_ckUSDT") but contains worthless tokens
4. Attacker manipulates the pool's USD value by controlling liquidity
5. Attacker gains disproportionate voting power with worthless assets

## KongSwap Data Structures

From our analysis of KongSwap, we learned:

```rust
// Each LP position returned by user_balances contains:
struct LPReply {
    // Identifiers
    pub lp_token_id: u64,      // Unique ID for this specific pool
    pub symbol: String,        // e.g., "ICP_ckUSDT" - NOT UNIQUE!
    
    // Token Details (THE KEY DATA)
    pub address_0: String,     // Canister ID of first token
    pub symbol_0: String,      // Symbol of first token
    pub address_1: String,     // Canister ID of second token  
    pub symbol_1: String,      // Symbol of second token
    
    // Values
    pub balance: f64,          // LP token balance
    pub usd_balance: f64,      // Total USD value (can be manipulated)
}
```

**Key Insights:**
- `symbol` alone is NOT unique - multiple pools can have same symbol
- `address_0` and `address_1` are the actual canister IDs (Principals) - these ARE unique
- `lp_token_id` uniquely identifies each pool
- KongSwap has NO token verification - anyone can create pools with any tokens
- USD values are calculated from AMM ratios and can be manipulated in low-liquidity pools

## Proposed Solution: Store Pool Metadata, Defer Valuation

### The Simplest Approach

Instead of trying to validate pools in kong_locker, we should:

1. **Store complete pool metadata** when LP tokens are locked:
   - Pool ID (`lp_token_id`)
   - Token canister IDs (`address_0`, `address_1`)
   - Token symbols (for display only)
   - Lock timestamp

2. **Let governance (DAOPad) handle valuation** by:
   - Querying stored metadata to see WHICH pools are locked
   - Applying its own validation rules (which can evolve over time)
   - Calculating voting power based on current criteria

### Implementation Details

```rust
// In kong_locker storage, store detailed lock info:
#[derive(CandidType, Deserialize, Storable)]
struct LockInfo {
    pub user: Principal,
    pub lock_canister: Principal,
    pub pools: Vec<LockedPool>,
    pub created_at: u64,
}

#[derive(CandidType, Deserialize, Storable)]
struct LockedPool {
    pub lp_token_id: u64,        // KongSwap's unique pool ID
    pub token_0_canister: String, // address_0 from KongSwap
    pub token_1_canister: String, // address_1 from KongSwap
    pub symbol: String,           // For display purposes
    pub locked_at: u64,           // When this pool was locked
}
```

### Voting Power Calculation

Instead of kong_locker calculating voting power, it should return raw pool data:

```rust
#[update]
pub async fn get_lock_details(user: Principal) -> Result<LockDetails, String> {
    // Query KongSwap for current balances
    let balances = query_kongswap(lock_canister).await?;
    
    // Return FULL details including canister IDs
    Ok(LockDetails {
        pools: balances.into_iter().map(|lp| {
            DetailedPool {
                lp_token_id: lp.lp_token_id,
                symbol: lp.symbol,
                token_0_canister: lp.address_0,
                token_1_canister: lp.address_1,
                balance: lp.balance,
                usd_value: lp.usd_balance, // Raw value from KongSwap
            }
        }).collect()
    })
}
```

### DAOPad Integration

DAOPad can then implement flexible validation:

```rust
// In DAOPad, implement smart validation
fn calculate_voting_power(lock_details: LockDetails) -> u64 {
    let mut total_power = 0;
    
    for pool in lock_details.pools {
        // Option 1: Only count pools with specific tokens
        if is_governance_token(pool.token_0_canister) || 
           is_governance_token(pool.token_1_canister) {
            total_power += pool.usd_value;
        }
        
        // Option 2: Weight by pool age (older = more trusted)
        // Option 3: Weight by liquidity depth
        // Option 4: Community-voted pool whitelist
        // etc - can evolve without changing kong_locker
    }
    
    total_power
}
```

## Why This Is The Simplest Solution

1. **No Manual Whitelisting in Kong Locker**: Anyone can lock any LP tokens
2. **Separation of Concerns**: Locking mechanism stays simple, validation logic stays flexible
3. **Future-Proof**: Governance rules can evolve without updating kong_locker
4. **Transparent**: Users can see exactly which pools count for governance
5. **No Breaking Changes**: Existing locked positions remain valid
6. **Minimal Code Changes**: Just store and return more metadata

## Alternative Approaches (More Complex)

### ❌ Approach 1: Hardcoded Whitelist
- Requires constant updates as new tokens launch
- Too restrictive for a permissionless system
- Central point of failure

### ❌ Approach 2: Minimum Liquidity Threshold
- Can be gamed by flash liquidity
- Penalizes legitimate small pools
- Still vulnerable if attacker has capital

### ❌ Approach 3: Oracle Integration
- Adds external dependencies
- Complex to implement
- Can be manipulated or fail

### ❌ Approach 4: Pool Age Requirements
- Delays legitimate new pools
- Doesn't prevent long-term attacks
- Adds time complexity

## Implementation Steps

1. **Update Types** (kong_locker/src/types.rs)
   - Add `LockedPool` and `LockDetails` structures
   - Keep existing types for backward compatibility

2. **Update Storage** (kong_locker/src/storage.rs)
   - Add new map: `LOCK_METADATA: StableBTreeMap<Principal, LockInfo>`
   - Populate on lock creation

3. **Update Query Methods** (kong_locker/src/query.rs)
   - Add `get_lock_details()` that returns full metadata
   - Keep existing `get_voting_power()` but mark as deprecated
   - Add `get_all_lock_details()` for governance queries

4. **Update DAOPad** (separate task)
   - Implement validation logic
   - Define initial governance token list
   - Add community voting for pool approval

## Security Benefits

1. **Transparency**: Everyone can see which pools are counted and why
2. **Flexibility**: Validation rules can be updated through governance
3. **Resilience**: No single point of failure in validation
4. **Auditability**: All pool metadata is stored on-chain

## Migration Path

1. **Phase 1**: Deploy updated kong_locker with metadata storage
2. **Phase 2**: New locks store full metadata
3. **Phase 3**: Backfill metadata for existing locks (if possible)
4. **Phase 4**: DAOPad implements new validation
5. **Phase 5**: Deprecate old voting power calculation

## Conclusion

By storing complete pool metadata and deferring validation to the governance layer, we:
- Fix the security vulnerability
- Keep the system permissionless
- Maintain simplicity in kong_locker
- Enable flexible governance rules
- Provide transparency to users

This approach follows the principle of "mechanism, not policy" - kong_locker provides the locking mechanism, while DAOPad implements the governance policy.