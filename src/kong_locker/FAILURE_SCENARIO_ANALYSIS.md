# Failure Scenario Analysis & Solutions

## Current Implementation Flow

```
1. User pays 5 ICP → Factory (CRITICAL - uses ?)
2. Create canister (CRITICAL - uses ?)
3. Install code (CRITICAL - uses ?)
4. Send 0.1 ICP to canister (WARNING - logged only)
5. Trigger registration (WARNING - logged only)
6. Blackhole canister (CRITICAL - uses ?)
7. Store user→canister mapping
8. Return canister ID
```

## Failure Scenarios

### Scenario 1: Blackholing Fails
**When it happens:** Line 132-134, after everything else succeeds
**Current behavior:** Returns error, mapping NOT stored
**User impact:** 
- Lost 5 ICP ✅ (paid)
- Has canister ✅ (created)
- Can't access it ❌ (no mapping)
- Factory controls it ⚠️ (not blackholed)

**Real world causes:**
- IC subnet temporary issues
- Cycle shortage for the operation
- Network timeout

**Real world outcome:** User loses $25 permanently. They contact support saying "I paid but got an error and can't see my canister." The factory admin could manually add the mapping and attempt blackholing again, but this requires trust that the admin won't steal funds first. Users would rightfully complain on social media about losing money with no automated recovery.

### Scenario 2: Canister Creation Fails
**When it happens:** Line 66-69, after payment
**Current behavior:** Returns error
**User impact:**
- Lost 5 ICP ✅ (paid)
- No canister ❌
- No recourse ❌

**Real world causes:**
- Factory out of cycles
- Subnet at capacity
- IC network issues

**Real world outcome:** User loses $25 with absolutely nothing to show for it. Factory has their ICP but provided no service. This would generate angry support tickets: "I paid $25 and got nothing!" The factory could manually create a canister later or refund, but there's no automated mechanism. This scenario damages the project's reputation severely.

### Scenario 3: Code Installation Fails
**When it happens:** Line 79-81, after canister created
**Current behavior:** Returns error
**User impact:**
- Lost 5 ICP ✅ (paid)
- Empty canister exists ⚠️ (orphaned)
- Factory controls it ⚠️
- User gets nothing ❌

**Real world causes:**
- WASM corrupted (unlikely with embedded bytes)
- Subnet issues
- Canister memory limits

**Real world outcome:** User loses $25 and an empty canister is orphaned on the IC. The factory technically owns a useless canister that costs cycles to maintain. User can't access it, can't use it, and lost their money. Factory admin would need to manually complete the installation or refund - requiring a support process that doesn't exist.

### Scenario 4: Registration Fails
**When it happens:** Line 107-116
**Current behavior:** Logs warning, continues
**User impact:**
- Has blackholed canister ✅
- 0.1 ICP not swapped ⚠️
- Can fix manually ✅

**Status:** ACCEPTABLE - User can recover

**Real world outcome:** User successfully gets their lock canister but it's not registered with KongSwap. They can still send LP tokens to it. They might be confused why it shows 0.1 ICP balance instead of ALEX tokens. User can manually call `register_if_funded()` themselves to complete registration. Minor inconvenience, no fund loss.

### Scenario 5: Funding Transfer Fails
**When it happens:** Line 94-103
**Current behavior:** Logs warning, continues
**User impact:**
- Has blackholed canister ✅
- No ICP in canister ⚠️
- Must fund manually ⚠️

**Status:** ACCEPTABLE - User can recover

**Real world outcome:** User gets their lock canister but it has no ICP for registration. They need to manually send 0.1+ ICP to their canister and then call `register_if_funded()`. This adds an extra step but doesn't lose funds - user just needs to provide the 0.1 ICP that the factory failed to send. Support ticket would be: "My canister was created but isn't registered" with a simple fix.

## Failure Impact Summary

**Catastrophic Failures (User loses $25 with no automated recovery):**
- **Scenario 1**: Blackholing fails - User paid, canister exists, but can't access it
- **Scenario 2**: Creation fails - User paid, gets nothing at all  
- **Scenario 3**: Installation fails - User paid, empty canister is orphaned

**Minor Inconveniences (User can recover manually):**
- **Scenario 4**: Registration fails - User has canister, can manually register
- **Scenario 5**: Funding fails - User has canister, needs to add 0.1 ICP manually

The first three scenarios would generate angry users and damage reputation. The recommended Solution B (making blackholing non-critical) would eliminate Scenario 1, turning the most likely catastrophic failure into a recoverable situation.

## Proposed Solutions

### Solution A: Move Mapping Before Blackholing
```rust
// After successful install...
USER_LOCK_CANISTERS.insert(user → canister_id);  // Store FIRST

// Try operations (all non-critical now)
try_fund_canister();     // Log if fails
try_register();          // Log if fails
try_blackhole();         // Log if fails

return Ok(canister_id);
```

**Pros:**
- User always gets canister if creation succeeds
- Can manually blackhole later if needed
- Simple change

**Cons:**
- Factory remains controller if blackholing fails
- Theoretical security risk (factory could steal)

### Solution B: Make Everything After Creation Non-Critical
```rust
// Critical operations (must succeed or user keeps ICP)
take_payment()?;
create_canister()?;
install_code()?;

// Store mapping immediately
USER_LOCK_CANISTERS.insert(user → canister_id);

// Best-effort operations (log failures)
try_fund_canister();
try_register();
try_blackhole();

return Ok(canister_id);
```

**Pros:**
- User gets working canister if core operations succeed
- Can recover from any post-creation failure
- Minimizes fund loss scenarios

**Cons:**
- Some canisters might not be blackholed
- Manual intervention needed for failures

### Solution C: Add Refund Mechanism
```rust
// Track payment before operations
PENDING_PAYMENTS.insert(user, payment_block);

match create_and_setup_canister().await {
    Ok(canister_id) => {
        PENDING_PAYMENTS.remove(user);
        USER_LOCK_CANISTERS.insert(user → canister_id);
        Ok(canister_id)
    },
    Err(e) => {
        // Payment stays in PENDING for manual refund
        Err(format!("Failed: {}. Contact admin for refund.", e))
    }
}
```

**Pros:**
- Can refund users if creation fails
- Clear audit trail

**Cons:**
- Adds state complexity
- Requires admin intervention

### Solution D: Two-Phase Commit
```rust
// Phase 1: Create but don't blackhole
create_canister()?;
install_code()?;
fund_canister()?;
register()?;
USER_LOCK_CANISTERS.insert(user → canister_id);

// Phase 2: User explicitly calls finalize_blackhole()
#[update]
fn finalize_blackhole(canister_id: Principal) -> Result<(), String> {
    // Verify ownership
    // Blackhole the canister
}
```

**Pros:**
- User has full control
- Can verify everything works before blackholing
- No loss scenarios

**Cons:**
- Two-step process (worse UX)
- Canisters might never get blackholed

## Risk Assessment Matrix

| Failure Point | Frequency | User Impact | Current Handling | Risk Level |
|--------------|-----------|-------------|------------------|------------|
| Payment | Rare | None (keeps ICP) | Returns error | ✅ Low |
| Creation | Very Rare | Loses 5 ICP | Returns error | 🔴 HIGH |
| Install | Very Rare | Loses 5 ICP | Returns error | 🔴 HIGH |
| Funding | Occasional | Manual fix needed | Logs warning | 🟡 Medium |
| Registration | Occasional | Manual fix needed | Logs warning | 🟡 Medium |
| Blackholing | Very Rare | No access | Returns error | 🔴 HIGH |

## Recommended Solution

**Use Solution B: Make Everything After Creation Non-Critical**

This is the best balance because:
1. **Minimizes fund loss** - Only creation/install failures lose money (very rare)
2. **Simple implementation** - Just change error handling, no new state
3. **User empowerment** - User gets their canister and can fix issues
4. **Acceptable trade-off** - Non-blackholed canisters are rare and could be handled manually

### Implementation Changes Needed:
```rust
// Lines to change in update.rs:

// Line 100-103: Keep as-is (already non-critical)
// Line 113-116: Keep as-is (already non-critical)

// Line 132-134: Change from:
update_settings(blackhole_args).await
    .map_err(|e| format!("Failed to blackhole: {:?}", e))?;

// To:
match update_settings(blackhole_args).await {
    Ok(_) => {},
    Err(e) => ic_cdk::print(format!("WARNING: Blackhole failed: {:?}", e))
}

// Line 137-139: Move BEFORE line 118 (before blackhole attempt)
```

This ensures:
- User always gets their canister if creation succeeds
- Blackholing failures don't orphan canisters
- Factory can manually blackhole failed canisters later if needed
- User fund loss only in extremely rare IC infrastructure failures