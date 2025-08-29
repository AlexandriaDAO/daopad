# Subaccount-Based LP Locking MVP: Live Experiment Plan

## Current Situation & Context

### What We Have Now:
- **Deployed LP locking canister:** `7zv6y-5qaaa-aaaar-qbviq-cai`
- **Successfully registered with KongSwap** - can receive LP tokens
- **Current balance:** 10.0 ALEX_ckUSDT LP tokens ($9.22 USD value)
- **Attribution problem:** Cannot determine which user sent the LP tokens

### What We've Learned:
1. **Complex claim system failed** - Users can't find KongSwap request IDs
2. **KongSwap frontend accepts both formats** - "Enter principal ID or account identifier"  
3. **Backend code contradictions** - send.rs only uses principal_id lookup, but frontend suggests account IDs work
4. **Need empirical testing** - Code inspection revealed contradictory information

### The Critical Question:
**Does KongSwap actually support account ID-based LP token transfers and balance queries?**

## The MVP Solution: Subaccount-Based Attribution

### Core Concept:
Instead of one shared canister address, generate unique account IDs per user:
- **User A:** `canister-principal + subaccount-A = account-id-A`
- **User B:** `canister-principal + subaccount-B = account-id-B`  
- **Perfect attribution:** Each user sends to their own unique address

### How This Solves Everything:
1. **Attribution:** If account-id-A has LP tokens, they belong to User A
2. **No claiming:** Direct balance queries replace complex request ID system
3. **Simple UX:** Users get one address to send to, that's it
4. **Automatic updates:** Query balance = voting power

## Technical Implementation

### Required Dependencies:
Add to `src/lp_locking/Cargo.toml`:
```toml
sha2 = "0.10"           # For subaccount derivation
hex = "0.4"             # For account ID encoding  
ic-ledger-types = "0.8" # For AccountIdentifier
```

### Core Functions Needed:

#### 1. Subaccount Derivation
```rust
use sha2::{Digest, Sha256};
use ic_ledger_types::{AccountIdentifier, Subaccount};

fn derive_user_subaccount(user_principal: Principal) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(b"DAOPad_LP_Lock_v1");
    hasher.update(user_principal.as_slice());
    hasher.finalize().into()
}

fn get_user_account_id(user_principal: Principal) -> AccountIdentifier {
    let canister_principal = id();
    let subaccount = Subaccount(derive_user_subaccount(user_principal));
    AccountIdentifier::new(&canister_principal, &subaccount)
}
```

#### 2. User Registration & Address Generation
```rust
#[update]
pub fn register_for_lp_locking() -> Result<String, String> {
    let user = caller();
    
    // Validate not anonymous
    if user == Principal::anonymous() {
        return Err("Anonymous users not allowed".to_string());
    }
    
    // Generate their unique account ID
    let account_id = get_user_account_id(user);
    
    // Store user registration (for tracking)
    USER_REGISTRATIONS.with(|reg| {
        reg.borrow_mut().insert(user, account_id.clone());
    });
    
    // Return their LP locking address
    Ok(account_id.to_string())
}

#[query]
pub fn get_my_lp_address() -> Result<String, String> {
    let user = caller();
    let account_id = get_user_account_id(user);
    Ok(account_id.to_string())
}
```

#### 3. Balance Querying & Voting Power
```rust
#[update]
pub async fn sync_my_voting_power() -> Result<Nat, String> {
    let user = caller();
    let account_id = get_user_account_id(user);
    
    // Query KongSwap for this account ID's balance
    let kong_backend = Principal::from_text(KONG_BACKEND)
        .map_err(|e| format!("Invalid Kong backend: {}", e))?;
    
    // THE CRITICAL TEST: Does this work?
    let result: Result<(Vec<UserBalancesReply>,), _> = ic_cdk::call(
        kong_backend,
        "user_balances", 
        (account_id.to_string(),)  // Account ID as string
    ).await;
    
    match result {
        Ok((balances,)) => {
            let total_lp_balance = calculate_total_lp_balance(balances)?;
            
            // Update stored voting power
            VOTING_POWER.with(|vp| {
                vp.borrow_mut().insert(user, total_lp_balance.clone());
            });
            
            Ok(total_lp_balance)
        },
        Err((_, msg)) if msg.contains("not found") => {
            // Account ID not registered with KongSwap
            Err("Account ID not registered with KongSwap - subaccount approach won't work".to_string())
        },
        Err((code, msg)) => Err(format!("Query failed [{:?}]: {}", code, msg))
    }
}
```

### Required KongSwap Types:
```rust
// Based on actual KongSwap response structure
#[derive(CandidType, Deserialize)]
pub enum UserBalancesReply {
    LP(LPReply),
}

#[derive(CandidType, Deserialize)]  
pub struct LPReply {
    pub symbol: String,
    pub name: String,
    pub lp_token_id: u64,
    pub balance: f64,
    pub usd_balance: f64,
    pub chain_0: String,
    pub symbol_0: String,
    pub address_0: String,
    pub amount_0: f64,
    pub usd_amount_0: f64,
    pub chain_1: String,
    pub symbol_1: String,
    pub address_1: String,
    pub amount_1: f64,
    pub usd_amount_1: f64,
    pub ts: u64,
}
```

## Frontend Integration

### Add to DAOPad UI:

#### 1. Registration Flow
```typescript
// In user's voting power section
async function registerForLpLocking() {
    try {
        const result = await lpLockingActor.register_for_lp_locking();
        setUserLpAddress(result.Ok);
        showSuccess("Your LP locking address: " + result.Ok);
    } catch (error) {
        showError("Registration failed: " + error.message);
    }
}
```

#### 2. Display User's LP Address
```svelte
<!-- Show user their unique LP locking address -->
<div class="lp-address-section">
    <h3>Your LP Locking Address</h3>
    <code>{userLpAddress}</code>
    <button on:click={copyToClipboard}>Copy</button>
    <p>Send your LP tokens from KongSwap to this address to gain voting power</p>
</div>
```

#### 3. Voting Power Sync
```typescript
async function syncVotingPower() {
    try {
        const newBalance = await lpLockingActor.sync_my_voting_power();
        setVotingPower(newBalance.Ok);
        showSuccess("Voting power updated: " + newBalance.Ok);
    } catch (error) {
        showError("Sync failed: " + error.message);
    }
}
```

## Testing Protocol

### Phase 1: Verify Subaccount Support
```bash
# 1. Deploy updated canister
dfx deploy lp_locking

# 2. Register a test user
dfx canister call lp_locking register_for_lp_locking
# Should return an account ID like: "abc123...def789"

# 3. Test if KongSwap recognizes account IDs
# In KongSwap frontend, try sending LP tokens to the returned account ID
# This is the critical test that determines if the approach works
```

### Phase 2: Live Experiment
1. **Add registration UI** to DAOPad  
2. **Have real users register** and get their account IDs
3. **Users send LP tokens** to their account IDs via KongSwap
4. **Test sync_my_voting_power()** to see if balances are queryable
5. **Document results** - works or fails?

### Phase 3: Results Analysis
- **If successful:** Roll out to all users, remove old claim system
- **If failed:** Document why, implement fallback approach

## Fallback Strategies

### If Account IDs Don't Work:
1. **Honor system:** Users self-report LP amounts with timestamp verification
2. **Memo-based:** Users include their DAOPad principal in transfer memo
3. **Accept complexity:** Fix the existing claim system with better UX
4. **Manual tracking:** Admin manually tracks large LP contributors

## Implementation Checklist for Fresh Agent

### Backend Tasks:
- [ ] Add required dependencies (sha2, hex, ic-ledger-types)
- [ ] Implement subaccount derivation functions
- [ ] Add user registration function
- [ ] Add balance sync function  
- [ ] Add correct KongSwap response types
- [ ] Remove old claim system code (if successful)

### Frontend Tasks:
- [ ] Add LP address registration UI
- [ ] Display user's unique LP address
- [ ] Add voting power sync button
- [ ] Update voting power display
- [ ] Add copy-to-clipboard for addresses

### Testing Tasks:
- [ ] Deploy to mainnet (already done: `7zv6y-5qaaa-aaaar-qbviq-cai`)
- [ ] Test account ID registration with real users
- [ ] Verify LP token transfers to account IDs work
- [ ] Confirm balance queries return correct data
- [ ] Document empirical results

## Current Known Issues to Address

### Type Compatibility:
The current simplified canister uses incorrect types for KongSwap responses. Must use the verified `UserBalancesReply` and `LPReply` structures.

### Registration Requirement:
Each derived account ID might need separate KongSwap registration. The current `register_with_kongswap` function only registered the main canister principal.

### Unknown Compatibility:
We don't know if KongSwap's LP system actually supports account ID queries. This is the fundamental assumption that needs testing.

## Success Criteria

**The subaccount approach succeeds if:**
1. Users can generate unique account IDs
2. KongSwap accepts LP token transfers to these account IDs  
3. KongSwap's `user_balances` can query account ID balances
4. Voting power updates automatically without claiming

**If any step fails, we implement a fallback approach.**

## Why This Approach

This MVP tests the core assumption (account ID compatibility) with minimal code changes. It's designed as a live experiment to gather empirical data about what actually works, rather than building complex systems based on untested assumptions.

**The goal:** Determine once and for all whether subaccount-based LP locking is technically feasible with KongSwap's current implementation.