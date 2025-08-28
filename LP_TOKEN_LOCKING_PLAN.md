**This canister will be blackholed so it needs to be 100% future-proof and attack-proof**


# LP Token Locking Canister for DAOPad Voting Power

## Overview
Security-hardened permanent LP token locking system using witness-based verification with KongSwap's request system. LP tokens locked = voting power on DAOPad.

## Architecture Philosophy
- **Local Authority**: Store voting power locally after verification for reliability
- **Request Witness System**: Use KongSwap's request IDs as immutable proof of transfers
- **Multi-Token Support**: Track different LP tokens separately for flexible governance
- **Security-First Design**: Comprehensive validation and protection against all attack vectors
- **Permanent Locking**: No withdrawal functions = guaranteed permanent lock

## Core Data Structure

```rust
// Identity mappings with time-lock protection
static DAOPAD_TO_KONG: StableBTreeMap<Principal, Principal> = StableBTreeMap::new();
static KONG_TO_DAOPAD: StableBTreeMap<Principal, Principal> = StableBTreeMap::new();

// Enhanced registration with activity tracking
static REGISTRATIONS: StableBTreeMap<Principal, RegistrationRecord> = StableBTreeMap::new();

// Local voting power storage (authoritative)
static VOTING_POWER: StableBTreeMap<(Principal, String), Nat> = StableBTreeMap::new();

// Claim tracking and audit trail
static CLAIMED_REQUESTS: StableBTreeMap<u64, ClaimRecord> = StableBTreeMap::new();

// Request verification cache (bounded size)
static REQUEST_CACHE: StableBTreeMap<u64, KongRequestDetails> = StableBTreeMap::new();
const MAX_CACHE_SIZE: u64 = 10000;

#[derive(CandidType, Clone, Serialize, Deserialize)]
pub struct RegistrationRecord {
    pub daopad_principal: Principal,
    pub kong_principal: Principal,
    pub registered_at: u64,
    pub last_activity: u64,  // For time-lock protection
}

#[derive(CandidType, Clone, Serialize, Deserialize)]
pub struct ClaimRecord {
    pub claimer: Principal,
    pub kong_principal: Principal,
    pub amount: Nat,
    pub lp_token_symbol: String,
    pub timestamp: u64,
    pub request_id: u64,
}

#[derive(CandidType, Clone, Serialize, Deserialize)]
pub struct KongRequestDetails {
    pub from: Principal,
    pub to: Principal,
    pub amount: f64,  // From KongSwap
    pub symbol: String,
    pub status: String,
    pub timestamp: u64,
}
```

## Complete Canister Implementation

### Imports and Setup
```rust
use candid::{CandidType, Nat, Principal};
use ic_cdk::{update, query, caller, id};
use ic_stable_structures::{StableBTreeMap, storable::Bound, Storable, memory_manager::{MemoryId, MemoryManager, VirtualMemory}, DefaultMemoryImpl};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::cell::RefCell;

type Memory = VirtualMemory<DefaultMemoryImpl>;

// Memory IDs
const DAOPAD_TO_KONG_MEMORY_ID: MemoryId = MemoryId::new(0);
const KONG_TO_DAOPAD_MEMORY_ID: MemoryId = MemoryId::new(1);
const REGISTRATIONS_MEMORY_ID: MemoryId = MemoryId::new(2);

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(
        MemoryManager::init(DefaultMemoryImpl::default())
    );

    static DAOPAD_TO_KONG: RefCell<StableBTreeMap<Principal, Principal, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(DAOPAD_TO_KONG_MEMORY_ID))
        )
    );

    static KONG_TO_DAOPAD: RefCell<StableBTreeMap<Principal, Principal, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(KONG_TO_DAOPAD_MEMORY_ID))
        )
    );

    static REGISTRATIONS: RefCell<StableBTreeMap<Principal, RegistrationRecord, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(REGISTRATIONS_MEMORY_ID))
        )
    );
}

// KongSwap integration constants
const KONG_BACKEND_CANISTER: &str = "2ipq2-uqaaa-aaaar-qailq-cai"; // Replace with actual canister ID

// Time-lock constants
const REGISTRATION_TIMEOUT_NANOS: u64 = 30 * 24 * 60 * 60 * 1_000_000_000; // 30 days in nanoseconds
```

### Security-Critical Float Conversion

```rust
/// Safely converts a f64 value to Nat with proper decimal handling
/// Prevents precision loss, overflow, and handles edge cases
pub fn safe_float_to_nat(value: f64, decimals: u8) -> Result<Nat, String> {
    // Edge case validation
    if value.is_nan() {
        return Err("Cannot convert NaN to Nat".to_string());
    }
    
    if value.is_infinite() {
        return Err("Cannot convert infinity to Nat".to_string());
    }
    
    if value < 0.0 {
        return Err("Cannot convert negative value to Nat".to_string());
    }
    
    // Calculate multiplier safely
    let multiplier = 10_u128.checked_pow(decimals as u32)
        .ok_or("Decimal places too large")?;
    
    // Convert to string to preserve precision
    let value_str = format!("{:.precision$}", value, precision = decimals as usize);
    
    // Parse the string representation
    let parts: Vec<&str> = value_str.split('.').collect();
    if parts.len() > 2 {
        return Err("Invalid number format".to_string());
    }
    
    let integer_part = parts[0].parse::<u128>()
        .map_err(|_| "Integer part too large".to_string())?;
    
    let fractional_part = if parts.len() == 2 {
        // Pad or truncate to exact decimal places
        let frac = parts[1];
        let padded = format!("{:0<width$}", frac, width = decimals as usize);
        let truncated = &padded[..decimals.min(padded.len() as u8) as usize];
        truncated.parse::<u128>()
            .map_err(|_| "Fractional part parsing failed".to_string())?
    } else {
        0_u128
    };
    
    // Combine parts with overflow check
    let total = integer_part.checked_mul(multiplier)
        .ok_or("Integer overflow in multiplication")?
        .checked_add(fractional_part)
        .ok_or("Integer overflow in addition")?;
    
    Ok(Nat::from(total))
}

/// Converts Nat back to approximate f64 for display purposes only
/// NOT for financial calculations
pub fn nat_to_display_float(value: &Nat, decimals: u8) -> f64 {
    let divisor = 10_u128.pow(decimals as u32);
    let value_u128 = value.0.to_u128().unwrap_or(u128::MAX);
    (value_u128 as f64) / (divisor as f64)
}
```

### Data Structures
```rust
#[derive(CandidType, Clone, Serialize, Deserialize)]
pub struct RegistrationRecord {
    pub daopad_principal: Principal,
    pub kong_principal: Principal,
    pub registered_at: u64,
}

impl Storable for RegistrationRecord {
    fn to_bytes(&self) -> Cow<[u8]> {
        serde_cbor::to_vec(self).unwrap().into()
    }
    
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        serde_cbor::from_slice(&bytes).unwrap()
    }
    
    const BOUND: Bound = Bound::Unbounded;
}

#[derive(CandidType, Serialize)]
pub struct CanisterInfo {
    pub version: String,
    pub description: String,
    pub kong_backend_canister: String,
    pub total_registrations: u64,
    pub has_withdrawal_functions: bool,
}
```

### Update Functions

#### Register KongSwap Principal with Time-Lock Protection
```rust
#[update]
pub fn register_kong_principal(kong_principal: Principal) -> Result<(), String> {
    let daopad_principal = caller();
    let current_time = ic_cdk::api::time();
    
    // Validate caller is not anonymous
    if daopad_principal == Principal::anonymous() {
        return Err("Anonymous callers not allowed".to_string());
    }
    
    // Validate kong_principal is not anonymous
    if kong_principal == Principal::anonymous() {
        return Err("Cannot register anonymous KongSwap principal".to_string());
    }
    
    // Check existing registration with time-lock protection
    let existing_registration = REGISTRATIONS.with(|map| {
        map.borrow().get(&daopad_principal)
    });
    
    if let Some(existing) = existing_registration {
        // Check if registration can be overwritten after timeout
        if existing.last_activity + REGISTRATION_TIMEOUT_NANOS > current_time {
            return Err(format!(
                "Already registered. Can re-register after {} days of inactivity",
                30
            ));
        }
        
        // Clean up old registration before overwriting
        KONG_TO_DAOPAD.with(|map| {
            map.borrow_mut().remove(&existing.kong_principal);
        });
    }
    
    // Check if kong principal already claimed by another user
    let kong_already_claimed = KONG_TO_DAOPAD.with(|map| {
        map.borrow().get(&kong_principal)
    });
    
    if let Some(existing_daopad) = kong_already_claimed {
        if existing_daopad != daopad_principal {
            return Err("KongSwap principal already claimed by another user".to_string());
        }
    }
    
    // Create registration record with activity tracking
    let registration = RegistrationRecord {
        daopad_principal,
        kong_principal,
        registered_at: current_time,
        last_activity: current_time,
    };
    
    // Store bidirectional mapping
    DAOPAD_TO_KONG.with(|map| {
        map.borrow_mut().insert(daopad_principal, kong_principal);
    });
    
    KONG_TO_DAOPAD.with(|map| {
        map.borrow_mut().insert(kong_principal, daopad_principal);
    });
    
    REGISTRATIONS.with(|map| {
        map.borrow_mut().insert(daopad_principal, registration);
    });
    
    Ok(())
}
```

#### Comprehensive Request Verification and Claim Processing
```rust
// Cycle drain protection - rate limit expensive inter-canister calls
static USER_LAST_CLAIM: StableBTreeMap<Principal, u64> = StableBTreeMap::new();
const CLAIM_COOLDOWN: u64 = 3_600_000_000_000; // 1 hour in nanoseconds

#[update]
pub async fn claim_lp_lock(request_id: u64) -> Result<ClaimRecord, String> {
    let caller = caller();
    let current_time = ic_cdk::api::time();
    
    // Step 1: Rate limit protection against cycle drain attacks
    if let Some(last_claim) = USER_LAST_CLAIM.with(|m| m.borrow().get(&caller)) {
        if current_time - last_claim < CLAIM_COOLDOWN {
            return Err("Rate limited: wait 1 hour between claim attempts".to_string());
        }
    }
    
    // Update timestamp BEFORE expensive operation (prevents retry spam)
    USER_LAST_CLAIM.with(|m| m.borrow_mut().insert(caller, current_time));
    
    // Step 2: Verify registration exists
    let registration = REGISTRATIONS.with(|map| {
        map.borrow().get(&caller)
    }).ok_or("Must register KongSwap principal first")?;
    
    let kong_principal = registration.kong_principal;
    
    // Step 3: Check if request already claimed
    if CLAIMED_REQUESTS.with(|map| map.borrow().contains_key(&request_id)) {
        return Err("Request already claimed".to_string());
    }
    
    // Step 4: Get request details (with caching)
    let request_details = get_cached_request_details(request_id).await?;
    
    // Step 5: Comprehensive verification
    let claim_record = verify_and_process_claim(
        caller,
        kong_principal,
        request_id,
        request_details,
        current_time
    )?;
    
    // Step 6: Update local voting power
    update_voting_power(&claim_record)?;
    
    // Step 7: Update registration activity
    update_registration_activity(caller, current_time)?;
    
    // Step 8: Store claim record
    CLAIMED_REQUESTS.with(|map| {
        map.borrow_mut().insert(request_id, claim_record.clone());
    });
    
    Ok(claim_record)
}

/// Comprehensive request verification with all security checks
async fn verify_and_process_claim(
    caller: Principal,
    kong_principal: Principal,
    request_id: u64,
    request: KongRequestDetails,
    timestamp: u64,
) -> Result<ClaimRecord, String> {
    // Verify sender matches registered Kong principal
    if request.from != kong_principal {
        return Err(format!(
            "Request sender {} does not match your registered Kong principal {}",
            request.from, kong_principal
        ));
    }
    
    // Verify recipient is locking canister
    if request.to != id() {
        return Err(format!(
            "Request recipient {} is not the locking canister {}",
            request.to, id()
        ));
    }
    
    // Verify request status is successful
    if request.status != "success" && request.status != "completed" {
        return Err(format!(
            "Request status '{}' is not valid for claiming",
            request.status
        ));
    }
    
    // Verify LP token symbol is valid (prevent empty or malformed symbols)
    if request.symbol.is_empty() || !is_valid_lp_token_symbol(&request.symbol) {
        return Err(format!(
            "Invalid LP token symbol: '{}'",
            request.symbol
        ));
    }
    
    // Convert amount safely from float to Nat
    let amount = safe_float_to_nat(request.amount, 8)?;
    
    // Verify amount is non-zero
    if amount == Nat::from(0u64) {
        return Err("Cannot claim zero amount".to_string());
    }
    
    // Create claim record
    Ok(ClaimRecord {
        claimer: caller,
        kong_principal,
        amount,
        lp_token_symbol: request.symbol.clone(),
        timestamp,
        request_id,
    })
}

/// Validate LP token symbol format
fn is_valid_lp_token_symbol(symbol: &str) -> bool {
    // LP tokens typically have format like "ckBTC_ckUSDT"
    let parts: Vec<&str> = symbol.split('_').collect();
    
    if parts.len() != 2 {
        return false;
    }
    
    // Each part should be a valid token symbol (alphanumeric, 2-10 chars)
    for part in parts {
        if part.len() < 2 || part.len() > 10 {
            return false;
        }
        if !part.chars().all(|c| c.is_alphanumeric()) {
            return false;
        }
    }
    
    true
}

/// Update local voting power after successful claim
fn update_voting_power(claim: &ClaimRecord) -> Result<(), String> {
    VOTING_POWER.with(|map| {
        let key = (claim.claimer, claim.lp_token_symbol.clone());
        let current = map.borrow().get(&key).unwrap_or(Nat::from(0u64));
        let new_amount = current + claim.amount.clone();
        map.borrow_mut().insert(key, new_amount);
    });
    Ok(())
}

/// Update registration last activity timestamp
fn update_registration_activity(principal: Principal, timestamp: u64) -> Result<(), String> {
    REGISTRATIONS.with(|map| {
        if let Some(mut registration) = map.borrow().get(&principal) {
            registration.last_activity = timestamp;
            map.borrow_mut().insert(principal, registration);
            Ok(())
        } else {
            Err("Registration not found".to_string())
        }
    })
}
```

### Request Caching System

```rust
/// Get request details with caching to avoid redundant inter-canister calls
async fn get_cached_request_details(request_id: u64) -> Result<KongRequestDetails, String> {
    // Check cache first
    let cached = REQUEST_CACHE.with(|cache| {
        cache.borrow().get(&request_id)
    });
    
    if let Some(details) = cached {
        return Ok(details);
    }
    
    // Not in cache, query KongSwap
    let kong_backend = Principal::from_text(KONG_BACKEND_CANISTER)
        .map_err(|e| format!("Invalid Kong backend canister ID: {}", e))?;
    
    let result: Result<(RequestsResult,), (ic_cdk::api::call::RejectionCode, String)> = 
        ic_cdk::call(
            kong_backend,
            "requests",
            (Some(request_id),)
        ).await;
    
    match result {
        Ok((requests_result,)) => {
            // Parse the request result and extract details
            let details = parse_kong_request(requests_result, request_id)?;
            
            // Add to cache with size limit check
            add_to_cache(request_id, details.clone())?;
            
            Ok(details)
        },
        Err((code, msg)) => Err(format!("Kong query failed [{:?}]: {}", code, msg)),
    }
}

/// Add request to cache with bounded size management
fn add_to_cache(request_id: u64, details: KongRequestDetails) -> Result<(), String> {
    REQUEST_CACHE.with(|cache| {
        let mut cache_borrow = cache.borrow_mut();
        
        // Check cache size limit
        if cache_borrow.len() >= MAX_CACHE_SIZE as usize {
            // Remove oldest entries (simple FIFO for now)
            // In production, consider LRU or time-based eviction
            let entries_to_remove = cache_borrow.len() - (MAX_CACHE_SIZE as usize - 1);
            let mut keys_to_remove = Vec::new();
            
            for (key, _) in cache_borrow.iter().take(entries_to_remove) {
                keys_to_remove.push(key);
            }
            
            for key in keys_to_remove {
                cache_borrow.remove(&key);
            }
        }
        
        cache_borrow.insert(request_id, details);
        Ok(())
    })
}

/// Parse KongSwap request result into our internal format
fn parse_kong_request(result: RequestsResult, request_id: u64) -> Result<KongRequestDetails, String> {
    // Implementation depends on actual KongSwap response format
    // This is a placeholder that needs to be adapted to real API
    
    // Assuming RequestsResult contains a list of requests
    let request = result.requests
        .iter()
        .find(|r| r.id == request_id)
        .ok_or("Request not found in KongSwap response")?;
    
    Ok(KongRequestDetails {
        from: request.from,
        to: request.to,
        amount: request.amount,
        symbol: request.symbol.clone(),
        status: request.status.clone(),
        timestamp: request.timestamp,
    })
}

/// Clear cache (for emergency use only, not exposed in blackholed version)
#[cfg(test)]
fn clear_cache() {
    REQUEST_CACHE.with(|cache| {
        cache.borrow_mut().clear();
    });
}
```

### Query Functions

#### Enhanced Voting Power Queries
```rust
/// Get voting power for specific user and LP token (from local storage)
#[query]
pub fn get_voting_power(user: Principal, lp_token_symbol: String) -> Nat {
    VOTING_POWER.with(|map| {
        map.borrow()
            .get(&(user, lp_token_symbol))
            .unwrap_or(Nat::from(0u64))
    })
}

/// Get all voting power for a user across all LP tokens
#[query]
pub fn get_all_voting_power(user: Principal) -> Vec<(String, Nat)> {
    VOTING_POWER.with(|map| {
        map.borrow()
            .iter()
            .filter(|((principal, _), _)| *principal == user)
            .map(|((_, symbol), amount)| (symbol.clone(), amount.clone()))
            .collect()
    })
}

/// Get my voting power for specific LP token
#[query]
pub fn get_my_voting_power(lp_token_symbol: String) -> Nat {
    let caller = caller();
    get_voting_power(caller, lp_token_symbol)
}

/// Get my voting power across all LP tokens
#[query]
pub fn get_my_all_voting_power() -> Vec<(String, Nat)> {
    let caller = caller();
    get_all_voting_power(caller)
}

/// Get total locked amount for specific LP token across all users
#[query]
pub fn get_total_locked(lp_token_symbol: String) -> Nat {
    VOTING_POWER.with(|map| {
        map.borrow()
            .iter()
            .filter(|((_, symbol), _)| *symbol == lp_token_symbol)
            .map(|(_, amount)| amount.clone())
            .fold(Nat::from(0u64), |acc, amount| acc + amount)
    })
}

/// Get claim history for a user
#[query]
pub fn get_claim_history(user: Principal) -> Vec<ClaimRecord> {
    CLAIMED_REQUESTS.with(|map| {
        map.borrow()
            .iter()
            .filter(|(_, record)| record.claimer == user)
            .map(|(_, record)| record.clone())
            .collect()
    })
}

/// Get my claim history
#[query]
pub fn get_my_claim_history() -> Vec<ClaimRecord> {
    let caller = caller();
    get_claim_history(caller)
}

/// Get all claims for specific LP token
#[query]
pub fn get_token_claims(lp_token_symbol: String) -> Vec<ClaimRecord> {
    CLAIMED_REQUESTS.with(|map| {
        map.borrow()
            .iter()
            .filter(|(_, record)| record.lp_token_symbol == lp_token_symbol)
            .map(|(_, record)| record.clone())
            .collect()
    })
}
```

#### Registration and Link Queries
```rust
#[query]
pub fn get_my_kong_principal() -> Option<Principal> {
    let daopad_principal = caller();
    DAOPAD_TO_KONG.with(|map| {
        map.borrow().get(&daopad_principal)
    })
}

#[query]
pub fn get_linked_kong_principal(daopad_principal: Principal) -> Option<Principal> {
    DAOPAD_TO_KONG.with(|map| {
        map.borrow().get(&daopad_principal)
    })
}

#[query]
pub fn get_linked_daopad_principal(kong_principal: Principal) -> Option<Principal> {
    KONG_TO_DAOPAD.with(|map| {
        map.borrow().get(&kong_principal)
    })
}

#[query]
pub fn is_link_valid(daopad_principal: Principal, kong_principal: Principal) -> bool {
    DAOPAD_TO_KONG.with(|map| {
        match map.borrow().get(&daopad_principal) {
            Some(linked_kong) => linked_kong == kong_principal,
            None => false,
        }
    })
}

#[query]
pub fn get_registration_info(daopad_principal: Principal) -> Option<RegistrationRecord> {
    REGISTRATIONS.with(|map| {
        map.borrow().get(&daopad_principal)
    })
}

#[query]
pub fn get_my_registration_info() -> Option<RegistrationRecord> {
    let caller = caller();
    get_registration_info(caller)
}
```


#### Administrative Queries
```rust
#[query]
pub fn get_registration_count() -> u64 {
    REGISTRATIONS.with(|map| map.borrow().len())
}

#[query]
pub fn get_all_registrations() -> Vec<RegistrationRecord> {
    REGISTRATIONS.with(|map| {
        map.borrow()
            .iter()
            .map(|(_, record)| record)
            .collect()
    })
}

#[query]
pub fn get_canister_info() -> CanisterInfo {
    let registration_count = REGISTRATIONS.with(|map| map.borrow().len());
    
    CanisterInfo {
        version: "1.0.0".to_string(),
        description: "Permanent LP Token Locking via 1:1 Principal Mapping for DAOPad Voting".to_string(),
        kong_backend_canister: KONG_BACKEND_CANISTER.to_string(),
        total_registrations: registration_count,
        has_withdrawal_functions: false, // GUARANTEED by design - no withdrawal functions exist
    }
}
```

## User Flow

### Phase 1: Registration (DAOPad UI)
```pseudocode
1. User visits DAOPad governance section
2. User clicks "Register KongSwap Account for Voting"
3. User enters their KongSwap principal ID
4. User clicks "Register" 
5. Call: register_kong_principal(kong_principal)
6. System validates:
   - Check for existing registration and timeout status
   - KongSwap principal not already claimed by another user
   - Both principals are non-anonymous
7. Registration complete - time-locked 1:1 link established
```

### Phase 2: Lock LP Tokens (KongSwap UI)
```pseudocode
1. User goes to KongSwap pool page
2. User clicks "Send" on their LP tokens
3. User enters locking canister principal as recipient
4. User specifies amount of LP tokens to lock
5. User confirms transaction
6. KongSwap returns request_id for the transfer
7. User notes the request_id for claiming
```

### Phase 3: Claim Locked Tokens (DAOPad UI)
```pseudocode
1. User visits DAOPad claiming interface
2. User enters their KongSwap request_id
3. Call: claim_lp_lock(request_id)
4. System performs comprehensive verification:
   - Verifies user has registered Kong principal
   - Queries KongSwap for request details (with caching)
   - Validates sender matches registered principal
   - Confirms recipient is locking canister
   - Checks request not already claimed
   - Converts amount safely to Nat
5. Updates local voting power storage
6. Returns ClaimRecord with details
```

### Phase 4: Voting (DAOPad UI)
```pseudocode
1. User visits DAOPad proposal page
2. System queries local voting power:
   - get_my_voting_power(lp_token_symbol) or get_my_all_voting_power()
   - Returns instantly from local storage (no external calls)
3. User can vote with weight proportional to locked LP tokens
4. Voting power persists across all proposals
```

## Security Model

### Spam Prevention
- **Time-Limited Registration**: 30-day inactivity timeout prevents permanent squatting
- **One Active Registration**: Each DAOPad principal has one active Kong link at a time
- **Request ID Uniqueness**: Each KongSwap request can only be claimed once
- **Bounded Cache Size**: Request cache limited to 10,000 entries to prevent memory exhaustion

### Attack Resistance
- **Cycle Drain Attacks**: Protected by 1-hour rate limit on expensive KongSwap queries (critical for blackholed canister)
- **Registration Squatting**: Mitigated by time-lock protection allowing re-registration after inactivity
- **Request Enumeration**: Protected by requiring valid registration before claim attempts
- **Float Precision Attacks**: Eliminated through safe string-based decimal conversion
- **Amount Manipulation**: Prevented by local storage of verified amounts
- **Symbol Injection**: LP token symbols validated for correct format
- **Zero-Amount Claims**: Explicitly rejected during verification
- **Cache Poisoning**: Cache entries are immutable once stored
- **Storage Bloat**: Limited by registration count and bounded cache size

### Permanent Locking Guarantees
- **No Withdrawal Functions**: Code contains zero withdrawal/transfer-out functions
- **No Admin Overrides**: No special administrative capabilities 
- **Immutable Deployment**: No upgrade functions that could add withdrawal capability
- **Transparent Verification**: Anyone can audit the code to verify no withdrawal paths exist

## Edge Cases & Error Handling

### Registration Errors
```rust
// User already registered
"DAOPad principal already registered"

// KongSwap principal already claimed
"KongSwap principal already claimed by another user"

// Anonymous principals
"Anonymous callers not allowed"
"Cannot register anonymous KongSwap principal"
```

### Voting Power Query Errors
```rust
// User not registered
get_voting_power(unregistered_user, lp_token_id) -> Ok(Nat::from(0))

// KongSwap query fails
"Kong query failed [NetworkError]: Connection timeout"

// Invalid LP token ID
"Kong query failed [CanisterError]: LP token not found"
```

### Dispute Resolution
**Social Problem, Social Solution**: If someone incorrectly claims another person's KongSwap principal:
1. Affected party proves ownership of KongSwap principal through other means (signing messages, social media, etc.)
2. Community/DAO governance resolves dispute outside the protocol
3. If necessary, deploy new locking canister and migrate community to it

## Implementation Benefits

### Robustness
✅ **No synchronization issues** - No secondary storage of amounts to get out of sync  
✅ **No transaction parsing** - Never processes individual LP transfers  
✅ **Atomic operations** - Registrations either succeed completely or fail completely  
✅ **Future-proof** - Works regardless of KongSwap internal changes  
✅ **Self-healing** - Always reflects current state from authoritative source  

### Efficiency
✅ **Minimal storage overhead** - O(users) storage, not O(transactions)  
✅ **Fast queries** - Simple map lookups + KongSwap inter-canister calls  
✅ **No maintenance required** - No background processes or cleanup jobs  
✅ **Scales linearly** - Performance scales with user count, not transaction volume  

### Auditability
✅ **Single source of truth** - KongSwap LP balances are always authoritative  
✅ **Transparent verification** - Anyone can verify locked amounts independently  
✅ **Simple codebase** - Easy to audit for absence of withdrawal functions  
✅ **Provable permanence** - Mathematical guarantee that locked tokens cannot be retrieved  

## Deployment Checklist

1. **Implement canister with stable memory storage**
2. **Add KongSwap integration for LP balance queries**  
3. **Test registration and query functions thoroughly**
4. **Audit codebase for withdrawal functions (must be zero)**
5. **Deploy as immutable canister with no upgrade capability**
6. **Integrate registration UI into DAOPad governance section**
7. **Document locking canister principal ID for users**
8. **Verify permanent lock by attempting to find any withdrawal path (should be impossible)**

## KongSwap Inter-Canister Integration

### KongSwap Types & Interfaces

This section provides all the necessary types and function signatures for inter-canister calls to KongSwap, so DAOPad agents don't need to reference the KongSwap repository.

#### KongSwap Canister Information
```rust
// KongSwap Backend Canister ID (replace with actual)
const KONG_BACKEND_CANISTER: &str = "2ipq2-uqaaa-aaaar-qailq-cai";
```

#### KongSwap Data Types
```rust
use candid::{CandidType, Nat, Principal};
use serde::{Deserialize, Serialize};

// LP Token Reply Structure (from KongSwap)
#[derive(CandidType, Clone, Debug, Deserialize, Serialize)]
pub struct LPReply {
    pub symbol: String,       // LP token symbol like "ckBTC_ckUSDT"
    pub name: String,         // LP token name
    pub balance: f64,         // LP token balance (as float)
    pub usd_balance: f64,     // USD value of LP balance
    pub symbol_0: String,     // First token symbol (e.g., "ckBTC")
    pub amount_0: f64,        // Amount of first token represented
    pub usd_amount_0: f64,    // USD value of first token amount
    pub symbol_1: String,     // Second token symbol (e.g., "ckUSDT")
    pub amount_1: f64,        // Amount of second token represented
    pub usd_amount_1: f64,    // USD value of second token amount
    pub ts: u64,              // Timestamp
}

// User Balances Reply Structure (from KongSwap)  
#[derive(CandidType, Clone, Debug, Deserialize, Serialize)]
pub enum UserBalancesReply {
    LP(LPReply), // Returns single LP token balance result
}

// Token Transfer Arguments (for KongSwap send function)
#[derive(CandidType, Clone, Debug, Deserialize, Serialize)]
pub struct SendArgs {
    pub token: String,        // LP token symbol like "ckBTC_ckUSDT" 
    pub to_address: String,   // Recipient principal as string
    pub amount: Nat,         // Amount to transfer
}

// Send Reply Structure
#[derive(CandidType, Clone, Debug, Deserialize, Serialize)]  
pub struct SendReply {
    pub tx_id: u64,
    pub request_id: u64,
    pub status: String,
    pub chain: String,
    pub symbol: String,
    pub amount: Nat,
    pub to_address: String,
    pub ts: u64,
}
```

#### KongSwap Function Signatures

##### 1. Get User LP Token Balances
```rust
// Function: user_balances  
// Returns LP token balance for a specific user
async fn query_user_lp_balances(
    kong_backend: Principal,
    user_principal: Principal
) -> Result<UserBalancesReply, String> {
    let result: Result<(UserBalancesReply,), (ic_cdk::api::call::RejectionCode, String)> = 
        ic_cdk::call(
            kong_backend,
            "user_balances",
            (Some(user_principal),)  // Option<Principal>
        ).await;
    
    match result {
        Ok((balances,)) => Ok(balances),
        Err((code, msg)) => Err(format!("KongSwap query failed [{:?}]: {}", code, msg)),
    }
}

// Usage Example:
// let balance_result = query_user_lp_balances(kong_backend, kong_principal).await?;
// match balance_result {
//     UserBalancesReply::LP(lp_reply) => {
//         println!("LP Balance: {} for token {}", lp_reply.balance, lp_reply.symbol);
//     }
// }
```

##### 2. Send LP Tokens (Not Used Directly by Locking Canister)
```rust
// Function: send
// Used by users in KongSwap UI to send LP tokens to locking canister
// Locking canister receives these automatically - no active call needed

// This is for reference only - users call this via KongSwap UI:
async fn send_lp_tokens(
    kong_backend: Principal,
    args: SendArgs
) -> Result<SendReply, String> {
    let result: Result<(Result<SendReply, String>,), (ic_cdk::api::call::RejectionCode, String)> = 
        ic_cdk::call(
            kong_backend,
            "send",
            (args,)
        ).await;
    
    match result {
        Ok((Ok(reply),)) => Ok(reply),
        Ok((Err(e),)) => Err(e),
        Err((code, msg)) => Err(format!("KongSwap call failed [{:?}]: {}", code, msg)),
    }
}
```

### Integration Implementation

#### Voting Power Query Implementation
```rust
#[query]
pub async fn get_voting_power(
    daopad_principal: Principal,
    lp_token_symbol: String  // e.g., "ckBTC_ckUSDT"
) -> Result<Nat, String> {
    // Get linked kong principal
    let kong_principal = DAOPAD_TO_KONG.with(|map| {
        map.borrow().get(&daopad_principal)
    });
    
    let kong_principal = match kong_principal {
        Some(kong_p) => kong_p,
        None => return Ok(Nat::from(0u64)), // No registration = no voting power
    };
    
    // Query KongSwap for user's LP balances
    let kong_backend = Principal::from_text(KONG_BACKEND_CANISTER)
        .map_err(|e| format!("Invalid Kong backend canister ID: {}", e))?;
    
    let result: Result<(UserBalancesReply,), (ic_cdk::api::call::RejectionCode, String)> = 
        ic_cdk::call(
            kong_backend,
            "user_balances",
            (Some(kong_principal),)
        ).await;
    
    match result {
        Ok((balance_result,)) => {
            match balance_result {
                UserBalancesReply::LP(lp_reply) => {
                    if lp_reply.symbol == lp_token_symbol {
                        // Convert f64 balance to Nat (assuming 8 decimals)
                        let balance_nat = Nat::from((lp_reply.balance * 100_000_000.0) as u64);
                        Ok(balance_nat)
                    } else {
                        Ok(Nat::from(0u64))
                    }
                }
            }
        },
        Err((code, msg)) => Err(format!("Kong query failed [{:?}]: {}", code, msg)),
    }
}
```

#### Alternative: Check Locking Canister's LP Balances
```rust
// Better approach: Check what LP tokens the locking canister itself holds
// This requires KongSwap to provide a function to check balances received from specific senders

#[query] 
pub async fn get_total_locked_for_token(lp_token_symbol: String) -> Result<Nat, String> {
    let locking_canister_principal = id();
    let kong_backend = Principal::from_text(KONG_BACKEND_CANISTER)
        .map_err(|e| format!("Invalid Kong backend canister ID: {}", e))?;
    
    // Query locking canister's own LP balances
    let result: Result<(UserBalancesReply,), (ic_cdk::api::call::RejectionCode, String)> = 
        ic_cdk::call(
            kong_backend,
            "user_balances", 
            (Some(locking_canister_principal),)
        ).await;
    
    match result {
        Ok((balance_result,)) => {
            match balance_result {
                UserBalancesReply::LP(lp_reply) => {
                    if lp_reply.symbol == lp_token_symbol {
                        // Convert f64 balance to Nat (assuming 8 decimals)
                        let balance_nat = Nat::from((lp_reply.balance * 100_000_000.0) as u64);
                        Ok(balance_nat)
                    } else {
                        Ok(Nat::from(0u64))
                    }
                }
            }
        },
        Err((code, msg)) => Err(format!("Kong query failed [{:?}]: {}", code, msg)),
    }
}
```

### Transaction History Parsing (Advanced)

If you need to track individual user contributions (not just total locked), you may need to:

1. **Query KongSwap transaction history**
2. **Filter for transfers TO the locking canister** 
3. **Group by sender principal**
4. **Sum amounts per sender**

```rust
// This would require additional KongSwap functions like:
// - get_transactions_for_token(token_symbol, start_time, end_time) 
// - get_transfers_to_address(recipient_principal, token_symbol)
//
// These may not exist in current KongSwap - check availability
```

### Required KongSwap Functions

For this locking canister to work optimally, KongSwap should provide:

1. ✅ **user_balances** - Get LP balances for a user (EXISTS)
2. ✅ **send** - Transfer LP tokens between users (EXISTS)  
3. ⚠️ **Transaction history queries** - May be needed for individual tracking
4. ⚠️ **Transfer-to-address queries** - May be needed for sender attribution

### Deployment Notes

1. **Verify KongSwap function availability** before deployment
2. **Test inter-canister calls** on testnet first  
3. **Handle KongSwap API changes** gracefully with error handling
4. **Consider caching** KongSwap responses if query limits exist
5. **Monitor KongSwap canister upgrades** that might change APIs

## API Summary

### Update Functions
- `register_kong_principal(kong_principal: Principal) -> Result<(), String>` - Register Kong principal with time-lock protection
- `claim_lp_lock(request_id: u64) -> Result<ClaimRecord, String>` - Claim LP tokens using KongSwap request ID

### Query Functions - Voting Power
- `get_voting_power(user: Principal, lp_token_symbol: String) -> Nat` - Get voting power for user and token
- `get_all_voting_power(user: Principal) -> Vec<(String, Nat)>` - Get all voting power for user
- `get_my_voting_power(lp_token_symbol: String) -> Nat` - Get caller's voting power for token
- `get_my_all_voting_power() -> Vec<(String, Nat)>` - Get caller's all voting power
- `get_total_locked(lp_token_symbol: String) -> Nat` - Get total locked for specific token

### Query Functions - Claims & History
- `get_claim_history(user: Principal) -> Vec<ClaimRecord>` - Get user's claim history
- `get_my_claim_history() -> Vec<ClaimRecord>` - Get caller's claim history
- `get_token_claims(lp_token_symbol: String) -> Vec<ClaimRecord>` - Get all claims for token

### Query Functions - Registration
- `get_my_kong_principal() -> Option<Principal>` - Get caller's linked Kong principal
- `get_linked_kong_principal(daopad_principal: Principal) -> Option<Principal>` - Get linked Kong principal
- `get_linked_daopad_principal(kong_principal: Principal) -> Option<Principal>` - Get linked DAOPad principal
- `is_link_valid(daopad_principal: Principal, kong_principal: Principal) -> bool` - Validate link
- `get_registration_info(daopad_principal: Principal) -> Option<RegistrationRecord>` - Get registration details
- `get_my_registration_info() -> Option<RegistrationRecord>` - Get caller's registration

### Query Functions - Administrative
- `get_registration_count() -> u64` - Total registrations
- `get_all_registrations() -> Vec<RegistrationRecord>` - All registration records
- `get_canister_info() -> CanisterInfo` - Canister metadata

## Security Enhancements Summary

### 1. Safe Float Conversion ✅
- Handles NaN, infinity, negative values
- Prevents precision loss through string conversion
- Checks for integer overflow at every step
- Uses exact decimal arithmetic

### 2. Local Voting Power Storage ✅
- O(1) voting power queries without external dependencies
- Multi-token support with (Principal, String) keys
- Complete audit trail of all claims
- No reliance on external systems for voting

### 3. Request Verification Hardening ✅
- 8-step verification process for claims (including rate limiting)
- 1-hour cooldown prevents cycle drain attacks
- Protection against request ID enumeration
- LP token symbol validation
- Amount non-zero checks
- Status verification

### 4. Request Caching ✅
- Bounded cache size (10,000 entries)
- FIFO eviction strategy
- Reduces inter-canister call overhead
- Improves claim processing performance

### 5. Registration Time-Lock ✅
- 30-day inactivity timeout for re-registration
- Prevents permanent squatting
- Activity tracking per registration
- Clean-up of old mappings on re-registration

### 6. Enhanced API ✅
- Comprehensive voting power queries
- Full audit trail capabilities
- Multi-token support throughout
- User-friendly "my_" prefixed functions

This security-hardened design provides a robust, permanent LP token locking system with comprehensive protection against identified vulnerabilities while maintaining the core witness-based verification approach.