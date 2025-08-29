# Subaccount-Based LP Locking: Critical Analysis & Implementation Plan

## Current Implementation Analysis

The simplified canister has the right idea but **critical technical issues** that must be resolved:

### Issue 1: Type Mismatch with KongSwap ❌

**Current code assumes:**
```rust
enum BalanceResult {
    Ok(Vec<TokenBalance>),
    Err(String),
}
enum TokenBalance {
    IC(ICToken),
    LP(LPToken),
}
```

**KongSwap actually returns:**
```rust
Result<Vec<UserBalancesReply>, String>
where UserBalancesReply = enum { LP(LPReply) }
```

**Correct types needed:**
```rust
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

### Issue 2: Missing Subaccount Implementation ❌

**Current code only queries main canister:**
```rust
ic_cdk::call(kong, "user_balances", (id().to_string(),)).await
```

**Should query individual user subaccounts:**
```rust
// For each registered user:
let account_id = derive_account_id(user_principal, subaccount);
ic_cdk::call(kong, "user_balances", (account_id,)).await
```

### Issue 3: Registration Requirement Unknown ❓

**Critical question:** Does each account_id need separate KongSwap registration?

From KongSwap's `user_balances.rs` line 19-23:
```rust
let user_id = user_map::get_by_principal_id(&principal_id)
    .ok()
    .flatten()
    .ok_or("User not found")?
```

This suggests **every account_id must be registered separately** with KongSwap.

## The Real Architecture: How This Should Work

### User Flow with Subaccounts:
1. **User registers with DAOPad:** `register_for_lp_locking()`
   - Derives their unique subaccount
   - Registers that account_id with KongSwap  
   - Returns their LP locking address

2. **User sends LP tokens:** Via KongSwap to their unique address
   - Address: `canister_principal.derived_subaccount`
   - Perfect attribution - only they can send to their address

3. **Voting power updates:** `sync_all_voting_power()`
   - Canister queries each registered user's account_id
   - Updates voting power based on their LP balance
   - No claiming needed!

## Technical Implementation Requirements

### 1. Subaccount Derivation
```rust
fn derive_subaccount(user_principal: Principal) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(b"DAOPad_LP_Lock_v1");
    hasher.update(user_principal.as_slice());
    hasher.finalize().into()
}

fn account_id_from_principal_subaccount(principal: Principal, subaccount: [u8; 32]) -> String {
    // Need to determine KongSwap's exact format:
    // Option A: "principal.hex_subaccount"  
    // Option B: Some other encoding
    // Must verify with KongSwap's actual implementation
}
```

### 2. User Registration System
```rust
// Maps user principals to their account_ids
static USER_ACCOUNTS: StableBTreeMap<Principal, String> = ...;

#[update]
pub async fn register_for_lp_locking() -> Result<String, String> {
    let user = caller();
    let subaccount = derive_subaccount(user);
    let account_id = account_id_from_principal_subaccount(id(), subaccount);
    
    // Register this account_id with KongSwap
    register_account_with_kongswap(&account_id).await?;
    
    // Store the mapping
    USER_ACCOUNTS.with(|m| m.borrow_mut().insert(user, account_id.clone()));
    
    Ok(account_id)
}
```

### 3. Voting Power Sync
```rust
#[update]
pub async fn sync_voting_power() -> Result<Vec<(Principal, Nat)>, String> {
    let mut results = Vec::new();
    
    // For each registered user
    USER_ACCOUNTS.with(|accounts| {
        for (user_principal, account_id) in accounts.borrow().iter() {
            // Query their LP balance
            let balance = query_kongswap_balance(&account_id).await?;
            
            // Update their voting power
            VOTING_POWER.with(|vp| {
                vp.borrow_mut().insert(user_principal, balance.clone());
            });
            
            results.push((user_principal, balance));
        }
    });
    
    Ok(results)
}
```

## Critical Questions That Must Be Answered

### 1. Account ID Format ❓
**How does KongSwap represent principal+subaccount combinations?**
- Test: Try calling `user_balances` with different formats
- Principal only: `"7zv6y-5qaaa-aaaar-qbviq-cai"`
- With subaccount: `"7zv6y-5qaaa-aaaar-qbviq-cai.deadbeef00..."`
- ICRC format: `{"owner": "principal", "subaccount": [1,2,3...]}`

### 2. Registration Requirement ❓
**Does each account_id need separate KongSwap registration?**
- Test: Create a subaccount, try `user_balances` on it
- If "User not found": Each needs registration
- If it works: Main principal registration covers subaccounts

### 3. KongSwap Subaccount Support ❓
**Does KongSwap even support subaccounts in its user system?**
- Looking at the code, KongSwap uses `principal_id: String` 
- Need to verify if this supports subaccount notation

## Verification Protocol (MUST DO FIRST)

```bash
# Test 1: Verify type compatibility
dfx canister --network ic call 2ipq2-uqaaa-aaaar-qailq-cai user_balances '("7zv6y-5qaaa-aaaar-qbviq-cai")'
# Compare response structure to your types

# Test 2: Test subaccount format  
dfx canister --network ic call 2ipq2-uqaaa-aaaar-qailq-cai user_balances '("7zv6y-5qaaa-aaaar-qbviq-cai.0000000000000000000000000000000000000000000000000000000000000001")'
# See if KongSwap accepts subaccount notation

# Test 3: Test account registration
# Try registering a derived account_id with KongSwap
```

## Conclusion

The simplified approach is brilliant in concept but needs:
1. **Correct KongSwap types** - Match their actual response format
2. **Subaccount derivation logic** - Generate unique addresses per user  
3. **Registration strategy** - Handle account_id registration requirements
4. **Verification of KongSwap subaccount support** - Confirm this actually works

**DO NOT CODE until these questions are answered.** We cannot afford another round of false assumptions.