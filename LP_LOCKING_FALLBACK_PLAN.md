# LP Locking Fallback Plan - Memo-Based Attribution

## Test Results
✅ **Confirmed**: KongSwap returns "User not found" for account ID queries
❌ **Subaccount approach**: Not viable - KongSwap only recognizes principal IDs

## Fallback Solution: Enhanced Claim System

Since KongSwap doesn't support account IDs, we'll implement an improved claim system that addresses the original UX problems.

### Option 1: Simplified Manual Claim (Recommended)
Users manually enter their LP token amounts with verification:

```rust
#[update]
pub fn claim_lp_tokens(amount: Nat, token_symbol: String) -> Result<String, String> {
    // User claims their LP tokens
    // Store claim with timestamp
    // Admin can verify through KongSwap if needed
}
```

### Option 2: Transaction Hash System
Users provide transaction details:

```rust
#[update]
pub fn claim_with_tx_hash(
    tx_hash: String,
    amount: Nat,
    token_symbol: String
) -> Result<String, String> {
    // User provides transaction hash from KongSwap
    // Store for verification
}
```

### Option 3: Trusted Oracle System
Designate trusted accounts to update balances:

```rust
#[update]
pub fn admin_update_balance(
    user: Principal,
    amount: Nat,
    token_symbol: String
) -> Result<String, String> {
    // Only callable by trusted admins
    // Directly update user's voting power
}
```

## Immediate Actions

### 1. Keep the Subaccount Infrastructure
The account ID generation still provides value:
- Unique identifier per user
- Can be used for future integrations
- Good for display/tracking purposes

### 2. Add Manual Claim Function
```rust
#[update]
pub fn claim_lp_balance(
    amount: Nat,
    token_pair: String,
    timestamp: u64
) -> Result<String, String> {
    let user = caller();
    
    // Store claim
    LP_CLAIMS.with(|claims| {
        claims.borrow_mut().insert(
            StorablePrincipal(user),
            LPClaim {
                amount,
                token_pair,
                timestamp,
                verified: false,
            }
        );
    });
    
    Ok("Claim submitted for review".to_string())
}
```

### 3. Add Verification System
```rust
#[update]
pub fn verify_claim(user: Principal) -> Result<String, String> {
    // Admin function to verify claims
    // Check against KongSwap data if possible
    // Mark as verified
}
```

## Frontend Updates Needed

### Update KongSwapRegistration Component
1. Keep the account ID display (for reference)
2. Add manual claim form
3. Show claim status
4. Display verified voting power

### New UI Flow
1. User sees their unique reference ID (account ID)
2. User enters LP token amount manually
3. Optional: User provides transaction proof
4. Admin verifies claims periodically
5. Voting power updates after verification

## Benefits of This Approach
- **Simple UX**: No complex request IDs
- **Transparent**: Users can see their claims
- **Verifiable**: Admins can cross-check with KongSwap
- **Flexible**: Can add automated verification later

## Migration Path
1. Deploy claim functions alongside existing code
2. Update frontend with claim UI
3. Test with small group
4. Add admin verification tools
5. Full rollout

## Alternative: Direct Principal Query
Since KongSwap recognizes principals, we could:
1. Have users send LP tokens to the canister's principal
2. Query KongSwap with the canister's principal
3. Use memo field or timing to attribute tokens

But this has the same attribution problem as before.

## Recommendation
Implement the **manual claim system** with admin verification:
- Quick to implement
- Solves the UX problem
- Can be enhanced later
- Transparent and auditable

The subaccount work wasn't wasted - it provides a unique identifier system and proved what's technically possible with KongSwap.