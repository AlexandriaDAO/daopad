# Kong Locker - Audit Context for Security Reviews

This document provides essential context for security auditors to understand the design decisions, trust model, and accepted trade-offs in the Kong Locker system. Read this BEFORE conducting a security audit to avoid false positives.

## System Purpose and Architecture

Kong Locker is a **liquidity commitment system** where users pay 2 ICP to receive a permanently blackholed canister that can receive (but never send) LP tokens from KongSwap. This creates an immutable proof of liquidity commitment.

### Key Design Philosophy
- **Permanent locking is the feature, not a bug** - There is NO unlock mechanism by design
- **One canister per principal forever** - Users get exactly one lock canister that lasts forever
- **Blackholing is permanent** - Once blackholed (no controllers), it can never be reversed
- **Simplicity over features** - The lock canister does almost nothing by design

## Trust Model - CRITICAL TO UNDERSTAND

### Trusted Components (Same Project)
1. **alex_revshare canister** (`e454q-riaaa-aaaap-qqcyq-cai`) - Revenue sharing service, part of Alexandria DAO
2. **Core swap canister** (`54fqz-5iaaa-aaaap-qkmqa-cai`) - LBRY swap service, same project
3. **Factory canister itself** - Has temporary control of user canisters before blackholing

### External Dependencies (Trusted Infrastructure)
1. **ICP Ledger** (`ryjl3-tyaaa-aaaaa-aaaba-cai`) - Won't migrate or change
2. **KongSwap Backend** (`2ipq2-uqaaa-aaaar-qailq-cai`) - External but stable service
3. **IC Management Canister** - Core IC infrastructure

### NOT Security Issues
- **Approvals without revocation** to trusted canisters - They're part of the same project
- **Hardcoded canister IDs** - These core services will never migrate
- **Factory holding funds temporarily** - Required for atomic operations

## Design Decisions and Rationales

### Why No Retry Function for Failed Payments?

**Original Design**: Had `retry_canister_creation_after_payment()` function  
**Problem**: Anyone could call it and get a free canister without paying  
**Current Design**: Removed this function entirely  
**Trade-off**: In the extremely rare case where payment succeeds but canister creation fails (requires IC subnet failure in ~1 second window), admin must manually refund  
**Why This is Acceptable**: Prevents the critical vulnerability of free canister creation

### Why Best-Effort Operations After Payment?

After payment and canister creation, these operations are best-effort:
1. Funding with 0.1 ICP
2. KongSwap registration  
3. Blackholing

**Rationale**: 
- Core service (canister creation) must succeed or payment is refunded
- These operations can all be retried via `complete_my_canister_setup()`
- Failing hard would leave users with partial setups more often
- The mapping is stored immediately after canister creation, preventing lockout

### Why Revenue Sharing Every 4 Hours?

**Design**: Automated timer sends excess ICP to alex_revshare every 4 hours  
**Why Not On-Demand?**: Simplicity, consistency, and removing human intervention  
**Why 4 Hours?**: Balance between efficiency and not checking too frequently (was 1 hour, changed to reduce cycles)  
**Why Trusted?**: alex_revshare is part of the same Alexandria DAO project

### Why Permanent Locking?

**Alternative Considered**: Time-locked positions with eventual unlock  
**Why Rejected**: 
- Opens gaming possibilities (lock before snapshot, unlock after)
- Adds complexity (unlock logic, time tracking)
- Reduces commitment signal strength
- Requires more code that could have bugs

**Current Design Benefits**:
- Dead simple - tokens go in, never come out
- Strongest possible commitment signal
- No gaming possible
- Minimal attack surface

## Common False Positives in Security Audits

### 1. "Cycle Drain Attack on Lock Canisters"
**Why It Looks Bad**: Attackers could drain cycles by calling `register_if_funded()` repeatedly  
**Why It's Not**: 
- Balance check happens first, preventing most spam
- If canister freezes, **it still locks tokens permanently** (the goal!)
- Frozen blackholed canisters actually strengthen the permanence guarantee

### 2. "Missing Approval Revocation"
**Why It Looks Bad**: Factory approves swap canister but never revokes approval  
**Why It's Not**:
- The swap canister is trusted (same project)
- It's a fixed-price swap, not an AMM (no slippage concerns)
- Approval is used immediately in the same transaction flow

### 3. "No Payment Verification in Recovery"
**Initial Concern**: The removed `retry_canister_creation_after_payment()` didn't verify payment  
**Resolution**: Function was completely removed to eliminate the vulnerability  
**Current State**: No way to get a canister without paying 2 ICP upfront

### 4. "Factory Can Steal User Funds"
**Why It Looks Bad**: Factory receives 2 ICP before creating canister  
**Why It's Acceptable**:
- Required for atomic payment collection
- Admin can refund in catastrophic failure cases
- No other way to ensure payment before resource allocation

### 5. "Hardcoded Principal IDs"
**Why It Looks Bad**: Can't adapt if services migrate  
**Why It's Not**:
- ICP ledger will never change (core IC infrastructure)
- KongSwap backend is stable and established
- alex_revshare is our own service under our control

### 6. "No Maximum Swap Limits"
**Why It Looks Bad**: Could swap huge amounts with poor execution  
**Why It's Not**:
- It's a fixed-price swap to our own service, not market trading
- No slippage or front-running possible
- We want to convert ALL excess ICP to LBRY

## State Implications to Understand

### What Happens If Payment Succeeds but Canister Creation Fails?

1. **Frequency**: Extremely rare (requires IC subnet failure in tiny time window)
2. **User State**: User has no canister in mapping, can't call `complete_my_canister_setup()`
3. **Recovery**: Admin verifies payment on-chain and manually refunds
4. **No State Corruption**: User can call `create_lock_canister()` again after refund
5. **No Permanent Lockout**: User principal isn't marked as having a canister

### What Happens with Partial Setup?

If any step after canister creation fails:
1. **User State**: Has canister in mapping
2. **Recovery**: Call `complete_my_canister_setup()` which:
   - Checks if code is installed (installs if not)
   - Checks if funded (funds if not)
   - Checks if registered (registers if not)  
   - Checks if blackholed (blackholes if not)
3. **Always Recoverable**: No partial state is unrecoverable

## Critical Security Properties Maintained

### 1. No Double Spending
- Check for existing canister before allowing creation
- One canister per principal enforced at storage level

### 2. No Token Extraction
- Lock canisters have NO transfer functions
- Cannot be added even with upgrades (blackholed)

### 3. No Payment Bypass
- Payment happens atomically before any resource allocation
- No retry function that could be exploited

### 4. No State Corruption
- User→canister mapping stored immediately after creation
- Stable storage persists across upgrades
- No way to lose track of user canisters

## Acceptance Criteria for Risks

We accept these risks because:

1. **Manual intervention for catastrophic failures** - Acceptable for extremely rare IC infrastructure failures
2. **No automatic refunds** - Prevents refund mechanism exploitation
3. **Best-effort operations** - Better user experience with recovery path than failing hard
4. **Frozen canisters can't receive more LP** - Still achieves permanent lock goal
5. **4-hour revenue sharing** - Reasonable automation vs resource usage balance

## What Would Be Actual Security Issues?

For context, these WOULD be critical issues if found:

1. **Any way to extract LP tokens from lock canisters** - Would break core promise
2. **Payment bypass allowing free canisters** - Would drain resources (previously existed, now fixed)
3. **State corruption preventing canister access** - Would lock users out permanently
4. **Multiple canisters per principal** - Would break the economic model
5. **Ability to un-blackhole canisters** - Would break permanence guarantee

## Architectural Decisions

### Why Factory + Individual Canisters?

**Alternative**: Single canister tracking all positions  
**Why Current Design**:
- Each user gets their own principal (useful for external integrations)
- Blackholing provides strongest possible guarantee
- Scales better (each canister is independent)
- Clear ownership model

### Why Embedded WASM?

**Design**: Lock canister WASM embedded at compile time  
**Benefits**:
- Ensures all lock canisters run identical code
- No external dependencies during canister creation
- Simplifies deployment

### Why StableBTreeMap?

**Design**: Using IC's stable structures for user mappings  
**Benefits**:
- Persists across upgrades automatically
- No manual serialization needed
- Battle-tested by many IC projects

## Testing Recommendations

When auditing, verify these security properties:

1. **Payment is atomic** - No canister without payment
2. **Mapping stored immediately** - Before risky operations
3. **No token extraction** - Lock canister has no transfer functions
4. **Recovery works** - `complete_my_canister_setup()` handles all cases
5. **One per principal** - Second attempt correctly rejected

## Summary for Auditors

This is a simple system that does one thing well: permanently lock LP tokens. Most "issues" you might find are intentional design decisions optimizing for:

1. **Simplicity** over features
2. **Permanence** over flexibility  
3. **Security** over convenience
4. **Automation** over manual control (where safe)

The removal of the payment retry function shows the project's commitment to security over user convenience. The comprehensive recovery function (`complete_my_canister_setup()`) handles all non-catastrophic failures.

When in doubt, ask: "Does this actually allow fund extraction, payment bypass, or permanent user lockout?" If not, it's likely an accepted trade-off, not a vulnerability.