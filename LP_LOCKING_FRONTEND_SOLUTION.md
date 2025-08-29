# LP Locking Frontend Canister Solution

## Executive Summary

Deploy a blackholed frontend canister that users authenticate to directly. Each user gets a unique derived principal that can receive LP tokens but cannot send them, creating permanent locks with perfect attribution.

## Problem Context

### Background: What We're Building
DAOPad needs a way for users to lock LP (liquidity provider) tokens permanently to gain voting power in governance. The challenge: KongSwap (the DEX where these LP tokens exist) has specific technical limitations that broke multiple attempted solutions.

### The Attribution Challenge
- Multiple users need to lock LP tokens for voting power
- All tokens sent to a single canister address lose attribution (can't tell who sent what)
- KongSwap only recognizes principals, not account IDs
- KongSwap's frontend doesn't expose memo fields
- Need perfect attribution: know exactly who locked what amount

### Why Previous Solutions Failed (And Why This Context Matters)

1. **Subaccounts Approach** (SUBACCOUNT_LP_LOCKING_MVP.md)
   - **Idea**: Generate unique account IDs using subaccounts for each user
   - **Why it failed**: KongSwap's `user_balances` function only accepts principal strings, not account IDs
   - **Proof**: Test confirmed "User not found" when querying account IDs
   - **Lesson**: Must work within KongSwap's principal-only constraint

2. **Witness/Request ID System** (Original lib.rs implementation)
   - **Idea**: Users claim locks by providing KongSwap request IDs as proof
   - **Why it failed**: Users can't find their request IDs in KongSwap's UI
   - **Complexity**: 700+ lines of code with 8-step verification process
   - **Lesson**: Can't rely on data users don't have access to

3. **Memo-Based Attribution** (LP_LOCKING_FALLBACK_PLAN.md)
   - **Idea**: Users include their principal in transfer memo
   - **Why it failed**: KongSwap's frontend doesn't let users set custom memos
   - **Dead end**: No UI support means users literally can't do it
   - **Lesson**: Must work with KongSwap's existing UI limitations

4. **Burn Address Generation**
   - **Idea**: Generate valid but uncontrolled principals as permanent locks
   - **Why it failed**: Can't register principals we don't control with KongSwap
   - **Blocker**: Registration requires authenticated call FROM that principal
   - **Lesson**: Can only use principals we can act as

5. **Simple Announcement System**
   - **Idea**: Users announce deposits, send exact amounts, then claim
   - **Problem**: Race conditions and amount collisions
   - **Risk**: If two users send same amount, attribution breaks
   - **Lesson**: Need deterministic, unique addresses per user

### Why This Solution Is Different

The frontend canister approach is the ONLY solution that:
- Works with KongSwap's principal-only system ✓
- Doesn't need request IDs or memos ✓
- Creates unique addresses per user ✓
- Provides permanent, irreversible locks ✓
- Can be implemented and verified today ✓

## The Frontend Canister Solution

### Why This Is The Safest Approach

Before diving into implementation, understand why this is the most secure option:

1. **No Trust Required**: Code is blackholed and verifiable on-chain
2. **No Admin Keys**: No one can rug pull or modify the contract
3. **No Complex Logic**: ~50 lines of code total, easy to audit
4. **No External Dependencies**: Doesn't rely on oracles or external data
5. **No Time Pressure**: Users can lock tokens at their own pace

Compare this to DeFi protocols that have been hacked due to:
- Complex logic with edge cases
- Admin keys that got compromised  
- Upgradeable contracts that got exploited
- External dependencies that failed

Our approach: Make it so simple it can't fail, so locked it can't be exploited.

### Core Concept
Create a minimal frontend canister where:
1. Users authenticate directly to get a unique derived principal
2. That principal gets registered with KongSwap
3. Users send LP tokens to their derived principal
4. The canister has NO transfer functions (permanent lock)
5. Blackhole the canister immediately (immutable code)

### How Derived Principals Work (Critical to Understand)

**What happens when a user authenticates:**
1. User clicks "Login with Internet Identity" on our frontend
2. Internet Identity generates a UNIQUE principal for THIS specific canister
3. User gets something like `2vxsx-fae...` (their derived principal)
4. This principal is deterministic - same user always gets same principal for our canister
5. But it's different from their principal on any other app

**The key security property:**
- The user can act as this principal ONLY by calling our canister's functions
- The user does NOT get the private key for this principal
- They get a "session delegation" - permission to call our functions, nothing more
- If our canister has no transfer function, the principal can't transfer tokens, period

**Think of it like:**
- A hotel room key card that only opens one door
- You can enter the room (authenticate), but the room has no exit
- Even though it's "your" room, you can't leave if there's no door

## Implementation Architecture

### Frontend Canister (`lp_lock_frontend`)

```rust
use ic_cdk::{update, query, caller};
use candid::{CandidType, Deserialize, Nat, Principal};

// Minimal KongSwap integration
const KONG_BACKEND: Principal = Principal::from_text("2ipq2-uqaaa-aaaar-qailq-cai").unwrap();

#[derive(CandidType, Deserialize)]
struct SwapArgs {
    pay_token: String,
    pay_amount: Nat,
    receive_token: String,
    receive_amount: Nat,
    max_slippage: f64,
    referred_by: Option<String>,
}

#[update]
async fn register_with_kongswap() -> Result<String, String> {
    // Register the caller's derived principal with KongSwap
    let user_principal = caller();
    
    // Use the swap trick to register (KongSwap creates user on UPDATE calls)
    let result: Result<(), _> = ic_cdk::call(
        KONG_BACKEND,
        "swap",
        (SwapArgs {
            pay_token: "ICP".to_string(),
            pay_amount: Nat::from(1u64), // Minimal amount
            receive_token: "ckBTC".to_string(),
            receive_amount: Nat::from(0u64),
            max_slippage: 100.0,
            referred_by: None,
        },)
    ).await;
    
    match result {
        Ok(_) => Ok(format!("Registered principal: {}", user_principal)),
        Err((code, msg)) => {
            // User already exists is actually success
            if msg.contains("insufficient") || msg.contains("User already exists") {
                Ok(format!("Principal ready: {}", user_principal))
            } else {
                Err(format!("Registration failed: {} - {}", code, msg))
            }
        }
    }
}

#[query]
fn get_my_deposit_address() -> String {
    // Return the caller's derived principal (their LP deposit address)
    caller().to_text()
}

#[query]
async fn check_my_lp_balance() -> Result<Vec<String>, String> {
    // Query KongSwap for the caller's LP balances
    let user_principal = caller();
    
    let result: Result<(Vec<TokenBalance>,), _> = ic_cdk::call(
        KONG_BACKEND,
        "user_balances",
        (user_principal.to_text(),)
    ).await;
    
    match result {
        Ok((balances,)) => {
            let lp_balances: Vec<String> = balances.iter()
                .filter_map(|b| match b {
                    TokenBalance::LP(lp) => Some(format!("{}: {}", lp.symbol, lp.balance)),
                    _ => None
                })
                .collect();
            Ok(lp_balances)
        }
        Err((code, msg)) => Err(format!("Failed to get balance: {} - {}", code, msg))
    }
}

// CRITICAL: NO TRANSFER FUNCTIONS
// No way to send LP tokens back out
```

### Frontend HTML/JS

```html
<!DOCTYPE html>
<html>
<head>
    <title>DAOPad LP Token Lock</title>
</head>
<body>
    <h1>Permanently Lock LP Tokens for Voting Power</h1>
    
    <div id="not-authenticated">
        <button onclick="authenticate()">Connect Internet Identity</button>
    </div>
    
    <div id="authenticated" style="display:none">
        <p>Your LP Deposit Address: <span id="deposit-address"></span></p>
        
        <button onclick="registerWithKongSwap()">Step 1: Register with KongSwap</button>
        <div id="register-status"></div>
        
        <p>Step 2: Send LP tokens to your deposit address via KongSwap</p>
        
        <button onclick="checkBalance()">Step 3: Check LP Balance</button>
        <div id="balance-status"></div>
        
        <p>⚠️ WARNING: LP tokens sent here are permanently locked!</p>
    </div>
    
    <script>
        // Internet Identity authentication
        async function authenticate() {
            const authClient = await AuthClient.create();
            await authClient.login({
                identityProvider: "https://identity.ic0.app",
                onSuccess: () => {
                    document.getElementById('not-authenticated').style.display = 'none';
                    document.getElementById('authenticated').style.display = 'block';
                    getDepositAddress();
                }
            });
        }
        
        async function getDepositAddress() {
            const address = await actor.get_my_deposit_address();
            document.getElementById('deposit-address').textContent = address;
        }
        
        async function registerWithKongSwap() {
            try {
                const result = await actor.register_with_kongswap();
                document.getElementById('register-status').textContent = result;
            } catch (e) {
                document.getElementById('register-status').textContent = "Error: " + e;
            }
        }
        
        async function checkBalance() {
            try {
                const balances = await actor.check_my_lp_balance();
                document.getElementById('balance-status').textContent = 
                    balances.length > 0 ? balances.join(", ") : "No LP tokens found";
            } catch (e) {
                document.getElementById('balance-status').textContent = "Error: " + e;
            }
        }
    </script>
</body>
</html>
```

### Main LP Locking Canister Integration

The main `lp_locking` canister needs to track these derived principals:

```rust
#[update]
async fn register_user_lock(frontend_derived_principal: String) -> Result<(), String> {
    // Called by users after they've locked tokens
    // Verify the principal exists and has LP tokens
    let lp_balance = query_kongswap_balance(frontend_derived_principal).await?;
    
    if lp_balance > 0 {
        STATE.with(|s| {
            let mut state = s.borrow_mut();
            state.locked_principals.insert(
                caller(), // Original user principal
                frontend_derived_principal // Their derived principal with locked LP
            );
        });
        Ok(())
    } else {
        Err("No LP tokens found at that address".to_string())
    }
}

#[query]
async fn get_voting_power(user: Principal) -> u64 {
    STATE.with(|s| {
        if let Some(derived_principal) = s.borrow().locked_principals.get(&user) {
            // Query KongSwap for the derived principal's LP balance
            query_kongswap_balance(derived_principal).await.unwrap_or(0)
        } else {
            0
        }
    })
}
```

## Security Analysis

### Why Users Can't Extract Tokens

1. **No Private Keys**: Users authenticate via Internet Identity, which provides session delegations, not private keys
2. **Limited Functions**: Users can only call functions that exist in the canister
3. **No Transfer Functions**: The canister literally has no code to transfer LP tokens
4. **Blackholed**: Once blackholed, no one can add transfer functions

### Attack Vectors Considered

1. **Frontend Manipulation**: Even with browser dev tools, users can only call existing functions
2. **Direct IC Calls**: Without the private key, users can't make calls as the derived principal outside the canister
3. **Code Injection**: Impossible after blackholing
4. **Social Engineering**: The canister can't be updated even if someone tricks the owner

## Deployment Process

### Step 1: Prepare the Frontend Canister
```bash
# Create new canister project
dfx new lp_lock_frontend --type rust
cd lp_lock_frontend

# Add the minimal code (see above)
# Build the canister
dfx build
```

### Step 2: Deploy to Mainnet
```bash
# Deploy with yourself as temporary controller
dfx deploy --network ic --with-cycles 1000000000000

# Get the canister ID
dfx canister --network ic id lp_lock_frontend
```

### Step 3: Verify Functions
```bash
# Test registration works
dfx canister --network ic call lp_lock_frontend register_with_kongswap

# Verify no transfer functions exist
dfx canister --network ic call lp_lock_frontend __get_candid_interface_tmp_hack
```

### Step 4: Blackhole the Canister
```bash
# Remove all controllers (IRREVERSIBLE!)
dfx canister --network ic update-settings lp_lock_frontend --remove-controller YOUR_PRINCIPAL

# Verify it's blackholed
dfx canister --network ic info lp_lock_frontend
# Should show: Controllers: []
```

## Testing Protocol

### Before Blackholing (Use Testnet)
1. Deploy to testnet first
2. Authenticate as test user
3. Register with KongSwap
4. Send small amount of test LP tokens
5. Verify balance shows correctly
6. Confirm no way to extract tokens
7. Try all possible attack vectors

### After Mainnet Deployment
1. Have team members test with small amounts
2. Verify registration works
3. Confirm balances update
4. Document the process clearly
5. Create user guide with warnings

## User Flow

1. **Visit**: `https://[canister-id].icp0.io`
2. **Authenticate**: Connect with Internet Identity
3. **See Address**: Copy their unique deposit address
4. **Register**: Click to register with KongSwap
5. **Send LP**: Use KongSwap UI to send LP to their address
6. **Verify**: Check balance in the frontend
7. **Register Lock**: Call main canister to register their lock for voting power

## Advantages

- **Perfect Attribution**: Each user has a unique derived principal
- **Truly Permanent**: No code exists to unlock tokens
- **Verifiable**: Anyone can verify the canister is blackholed
- **Simple**: Minimal code surface, easy to audit
- **Secure**: Leverages IC's security model

## Limitations

- **Irreversible**: Once tokens are sent, they can never be recovered
- **Requires Frontend**: Users must use our frontend to get their derived principal
- **One-Time Setup**: Each user needs to register once
- **Gas Costs**: Requires cycles for the frontend canister

## Migration Considerations

If KongSwap later adds features (memo support, account IDs, etc.):
- Existing locks remain valid
- Can add new locking mechanisms
- No risk to already locked tokens
- Voting power calculation can aggregate multiple sources

## Conclusion

This solution leverages IC's derived principal system to create "receive-only" addresses that provide permanent LP token locking with perfect attribution. The security comes from the canister's limited functionality and immutability after blackholing.

## For Fresh Agents: Quick Decision Tree

1. **Can we use subaccounts?** → No, KongSwap doesn't support account IDs
2. **Can we use memos?** → No, KongSwap UI doesn't expose memo field
3. **Can we use request IDs?** → No, users can't find them
4. **Can we generate burn addresses?** → No, can't register without private key
5. **Can we use a frontend canister?** → YES! This is the only viable approach

**Why this is the best path forward:**
- It's the ONLY solution that works with ALL of KongSwap's constraints
- It's the SIMPLEST solution (least code = least risk)
- It's the SAFEST solution (blackholed = immutable)
- It's PROVEN technology (derived principals are how all IC apps work)
- It's USER-FRIENDLY (clear UI, no complex steps)

**Start here:** Implement the frontend canister as specified above. Don't overthink it - this is the way.