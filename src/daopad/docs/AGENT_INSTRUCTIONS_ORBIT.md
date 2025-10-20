# AI Agent Instructions: Orbit Station Integration

## Critical Knowledge for AI Agents

**AUDIENCE**: This document is for AI coding agents (like Claude Code) working on DAOPad. It contains critical patterns, anti-patterns, and gotchas specific to Orbit Station integration.

**IMPORTANCE**: If you are implementing ANY feature that touches Orbit Station, you MUST read this document first. Skipping these instructions will result in requests getting stuck in "Pending" state forever.

---

## The Golden Rule: Governance is Mandatory

```rust
// ❌ WRONG - Direct Orbit operation without governance
#[update]
pub async fn remove_admin(token_id: Principal, user_id: String) -> Result<String, String> {
    let station_id = get_station_for_token(token_id)?;

    // Create Orbit request
    let result = create_orbit_remove_user_request(station_id, user_id).await?;

    Ok(result.request_id)  // ❌ GOVERNANCE VIOLATION!
}
```

```rust
// ✅ CORRECT - Governance enforced
#[update]
pub async fn remove_admin(token_id: Principal, user_id: String) -> Result<String, String> {
    let station_id = get_station_for_token(token_id)?;

    // Create Orbit request
    let result = create_orbit_remove_user_request(station_id, user_id).await?;
    let request_id = result.request_id;

    // CRITICAL: Auto-create proposal for governance
    use crate::proposals::{ensure_proposal_for_request, OrbitRequestType};

    ensure_proposal_for_request(
        token_id,
        request_id.clone(),
        OrbitRequestType::EditUser  // Maps to 50% threshold, 7-day vote
    ).await
    .map_err(|e| format!("Governance required: {:?}", e))?;

    Ok(request_id)  // ✅ Returns only after proposal created
}
```

**Why This Matters**:
- Every Orbit operation MUST create a DAOPad proposal
- Proposal tracks votes, enforces thresholds (50%-90% by risk), time-locks execution
- Without proposal, you violate the entire governance architecture
- User will be confused why operation works but never executes

---

## Architecture Pattern: The Two-Step Dance

All Orbit operations follow this mandatory pattern:

### Step 1: Create Orbit Request
- Call Orbit Station to create request (Transfer, EditUser, etc.)
- Orbit returns request ID
- Request stored in Orbit but NOT executed (pending approval)

### Step 2: Auto-Create DAOPad Proposal
- Call `ensure_proposal_for_request()` with request ID
- DAOPad creates proposal, enables community voting
- Proposal enforces threshold and time-lock
- When vote passes, backend approves in Orbit (AutoApproved executes immediately)

**Never skip Step 2. Ever. For any reason.**

---

## Implementation Checklist

When adding a new Orbit integration feature, follow this checklist:

### 1. Identify the Orbit Operation Type

Find the exact operation in Orbit's candid interface:
```bash
dfx canister --network ic call ORBIT_STATION_ID __get_candid
```

Match to `OrbitRequestType` enum in `daopad_backend/src/proposals/types.rs`:
```rust
pub enum OrbitRequestType {
    Transfer,           // 75% threshold
    EditUser,           // 50% threshold
    SystemUpgrade,      // 90% threshold
    // ... see full list in types.rs
}
```

If operation not in enum:
1. Add new variant to `OrbitRequestType`
2. Update `voting_threshold()` method with appropriate threshold
3. Update `infer_request_type()` in `orbit_requests.rs` to map operation string

### 2. Create Orbit Request Handler

Pattern for creating Orbit requests:
```rust
pub async fn create_orbit_OPERATION_request(
    station_id: Principal,
    // ... operation-specific params
) -> Result<OrbitRequestResponse, String> {
    // Build operation-specific input
    let input = RequestOperationInput::OPERATION(OperationInput {
        // ... field mapping from frontend/user input
    });

    // Create request in Orbit
    let result: Result<(CreateRequestResult,), _> = ic_cdk::call(
        station_id,
        "create_request",
        (CreateRequestInput {
            operation: input,
            title: Some("User-friendly title".to_string()),
            summary: Some("Operation description".to_string()),
            execution_plan: Some(ExecutionPlan::Immediate),
        },)
    ).await
    .map_err(|e| format!("Orbit call failed: {:?}", e))?;

    // Handle tagged enum response
    match result.0 {
        CreateRequestResult::Ok(response) => Ok(OrbitRequestResponse {
            request_id: response.request.id,
            // ... other response fields
        }),
        CreateRequestResult::Err(err) => Err(format!("Orbit error: {:?}", err))
    }
}
```

### 3. Create Public API Method

Pattern for API methods:
```rust
#[update]  // Must be update, not query (cross-canister call)
pub async fn OPERATION_NAME(
    token_canister_id: Principal,
    // ... operation-specific params
) -> Result<String, String> {
    // Get Orbit Station for this token
    let station_id = STATE.with(|state| {
        state.borrow()
            .token_stations
            .get(&token_canister_id)
            .ok_or_else(|| "No Orbit Station for this token".to_string())
    })?;

    // Step 1: Create Orbit request
    let result = create_orbit_OPERATION_request(station_id, /* params */).await?;
    let request_id = result.request_id;

    // Step 2: Auto-create proposal (MANDATORY)
    use crate::proposals::{ensure_proposal_for_request, OrbitRequestType};

    ensure_proposal_for_request(
        token_canister_id,
        request_id.clone(),
        OrbitRequestType::OPERATION  // Choose correct type
    ).await
    .map_err(|e| format!("Governance required: {:?}", e))?;

    // Step 3: Return request ID (proposal created successfully)
    Ok(request_id)
}
```

### 4. Update Frontend Integration

Frontend must handle the two-phase nature:

```javascript
// Phase 1: Create operation (creates Orbit request + DAOPad proposal)
const requestId = await backendActor.OPERATION_NAME(tokenId, ...params);

// Phase 2: Wait for community vote (7 days), then execution
// - Show user: "Proposal created, awaiting community vote"
// - Link to proposal page for voting
// - Do NOT show "operation complete" - it's pending vote!
```

### 5. Add Tests

Required tests:
- ✅ Operation creates Orbit request successfully
- ✅ Proposal auto-created with correct type
- ✅ Proposal has correct threshold (check `voting_threshold()`)
- ✅ Error if token has no Orbit Station
- ✅ Error if Orbit request fails
- ✅ Error if proposal creation fails

---

## Red Flags: Violations to Detect

As an AI agent reviewing code, watch for these patterns:

### 🚨 Red Flag #1: Orbit Call Without Governance

```rust
// ❌ VIOLATION
let result = ic_cdk::call(station_id, "create_request", ...).await?;
Ok(result.request_id)  // Returned without ensure_proposal_for_request()
```

**Fix**: Add `ensure_proposal_for_request()` before returning.

### 🚨 Red Flag #2: Wrong Operation Type

```rust
// ❌ WRONG THRESHOLD
ensure_proposal_for_request(
    token_id,
    request_id,
    OrbitRequestType::Transfer  // 75% threshold
).await?;

// But actual operation is EditUser (should be 50%)
```

**Fix**: Match `OrbitRequestType` to actual Orbit operation. See types.rs for mapping.

### 🚨 Red Flag #3: Query Method for Cross-Canister

```rust
// ❌ WILL FAIL - Query can't call other canisters
#[query]
pub async fn get_orbit_data(station_id: Principal) -> Result<Data, String> {
    ic_cdk::call(station_id, "list_requests", ...).await  // FAILS!
}
```

**Fix**: Use `#[update]` for any method that calls other canisters.

### 🚨 Red Flag #4: Missing AutoApproved Check

When writing documentation or setup guides:

```markdown
❌ "Configure Orbit Station with Quorum policy"
❌ "Add multiple approvers to Orbit"
❌ "Set up admin group with 3 users"
```

**Fix**: All documentation must emphasize AutoApproved requirement. DAOPad ONLY works with AutoApproved policies.

### 🚨 Red Flag #5: Assuming Immediate Execution

```rust
// ❌ WRONG ASSUMPTION
pub async fn transfer_and_log(amount: u64) -> Result<(), String> {
    let request_id = create_transfer(amount).await?;
    ensure_proposal_for_request(...).await?;

    // ❌ Transfer NOT executed yet - vote needed!
    log_transfer_complete(amount);  // WRONG
    Ok(())
}
```

**Fix**: Proposal creation ≠ execution. Operations execute after vote passes (7+ days).

---

## Common Mistakes & Solutions

### Mistake: "I added a new Orbit operation but it's stuck in Pending"

**Diagnosis**: You forgot `ensure_proposal_for_request()` or used wrong `OrbitRequestType`.

**Solution**:
1. Check if proposal was created:
   ```bash
   dfx canister --network ic call daopad_backend list_proposals '(record { token_canister_id = principal "..." })'
   ```
2. If no proposal: Add `ensure_proposal_for_request()` to your API method
3. If wrong type: Update to correct `OrbitRequestType` (check threshold in types.rs)

### Mistake: "Frontend shows operation complete but nothing happened"

**Diagnosis**: Frontend not handling two-phase nature (request created ≠ executed).

**Solution**: Update frontend to show:
- "Proposal created, awaiting vote"
- Link to proposal for voting
- Estimated execution (7+ days, after vote passes)
- Do NOT show "Transfer complete" or similar

### Mistake: "decode error" when calling Orbit

**Diagnosis**: Type mismatch between your Rust types and Orbit's actual candid.

**Solution**:
1. Test with dfx first (ALWAYS):
   ```bash
   dfx canister --network ic call ORBIT_STATION_ID operation_name '(record { ... })'
   ```
2. Copy EXACT types from dfx success
3. Match field names, types, nested structures exactly
4. See CLAUDE.md "Orbit Station Integration Workflow" for deterministic 4-step process

### Mistake: "Backend not authorized to create requests"

**Diagnosis**: Backend not in Orbit admin group.

**Solution**:
1. Add backend principal to admin group in Orbit UI
2. Backend principal: `lwsav-iiaaa-aaaap-qp2qq-cai`
3. Admin group UUID: `00000000-0000-4000-8000-000000000000`
4. See ORBIT_MIGRATION_STATUS.md for details

### Mistake: "AutoApproved but request still pending"

**Diagnosis**: Wrong account, wrong operation type, or Orbit bug.

**Solution**:
1. Verify which account request is for
2. Check that SPECIFIC account has AutoApproved policy
3. Some operations may not support AutoApproved (rare)
4. Check Orbit logs for errors
5. May need manual approval as temporary workaround

---

## Testing Patterns

### Unit Tests (Mock Orbit)

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_operation_creates_proposal() {
        // Arrange: Set up mock Orbit response
        let mock_request_id = "test-request-123".to_string();

        // Act: Call your API method
        let result = OPERATION_NAME(token_id, params).await;

        // Assert: Proposal created with correct type
        assert!(result.is_ok());
        let proposals = list_proposals(token_id).await;
        assert_eq!(proposals.len(), 1);
        assert_eq!(proposals[0].orbit_request_type, OrbitRequestType::OPERATION);
    }
}
```

### Integration Tests (Real Orbit)

```bash
# Use test Orbit Station: fec7w-zyaaa-aaaaa-qaffq-cai
export TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"
export BACKEND="lwsav-iiaaa-aaaap-qp2qq-cai"

# Test operation via backend
dfx canister --network ic call $BACKEND OPERATION_NAME '(principal "TOKEN_ID", ...)'

# Verify proposal created
dfx canister --network ic call $BACKEND list_proposals '(record { token_canister_id = principal "TOKEN_ID" })'

# Verify Orbit request created
dfx canister --network ic call $TEST_STATION list_requests '(record { statuses = opt vec { variant { Created } } })'
```

### Manual QA Checklist

Before merging Orbit-related PRs:

- [ ] Tested with real Orbit Station (not just mocks)
- [ ] Verified proposal auto-creates
- [ ] Checked correct `OrbitRequestType` and threshold
- [ ] Confirmed request appears in Orbit pending list
- [ ] Frontend shows "Awaiting vote" not "Complete"
- [ ] Error handling for missing token/station
- [ ] Error handling for Orbit call failures
- [ ] Error handling for proposal creation failures
- [ ] Documentation updated (if new operation type)
- [ ] Tests pass (unit + integration)

---

## Reference Files

When implementing Orbit features, consult these files:

### Core Implementation
- `daopad_backend/src/proposals/types.rs` - All operation types, thresholds
- `daopad_backend/src/proposals/orbit_requests.rs` - Proposal creation logic
- `daopad_backend/src/api/orbit_*.rs` - API methods for each operation category

### Examples
- `daopad_backend/src/api/orbit_users.rs:remove_user_from_admin_group()` - Complete example of two-step pattern
- `daopad_backend/src/api/orbit_address_book.rs:create_address_book_entry()` - Simple operation example

### Documentation
- `CLAUDE.md` - General development guidelines, deployment
- `docs/ORBIT_MIGRATION_STATUS.md` - Setup, troubleshooting
- `docs/SECURITY_AUTOAPPROVED.md` - Security architecture
- `docs/DEPLOYMENT_CHECKLIST.md` - Production verification

### Orbit Reference
- `../../orbit-reference/core/station/api/spec.did` - Official Orbit candid
- `../../orbit-reference/core/station/impl/src/models/` - Orbit data structures
- `../../orbit-reference/apps/station/` - Orbit UI patterns (for frontend)

---

## Quick Reference Card

Print this and keep it visible while coding:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ORBIT INTEGRATION QUICK REFERENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ MUST DO:
  1. Create Orbit request
  2. Call ensure_proposal_for_request()
  3. Return request ID (not "success")

❌ NEVER DO:
  - Return without creating proposal
  - Use #[query] for cross-canister calls
  - Assume immediate execution
  - Skip AutoApproved requirement docs

🔍 DEBUG CHECKLIST:
  - Proposal created? (list_proposals)
  - Correct OrbitRequestType?
  - AutoApproved policy set?
  - Backend in admin group?
  - Tested with dfx first?

📊 THRESHOLDS:
  90% - System Upgrade/Restore
  75% - Treasury Transfer
  70% - Edit Permissions
  60% - Canister Calls
  50% - User Management
  40% - Asset Management
  30% - Address Book

🔗 KEY FILES:
  proposals/types.rs - Operation types
  proposals/orbit_requests.rs - Proposal logic
  api/orbit_users.rs - Example pattern

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Final Reminder

**As an AI agent, your PRIMARY responsibility when touching Orbit code is to enforce governance.**

Every Orbit operation MUST create a proposal. No exceptions. If you're unsure, ask the user or err on the side of creating a proposal.

The entire DAOPad architecture depends on this. Breaking it defeats the purpose of decentralized governance.

**When in doubt, follow the pattern in `orbit_users.rs:remove_user_from_admin_group()` - it's the canonical example.**
