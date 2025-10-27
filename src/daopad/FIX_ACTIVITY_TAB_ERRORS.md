# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-activity-tab-fix/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-activity-tab-fix/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes only (no backend changes needed):
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Test in Browser**:
   - Visit: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/fec7w-zyaaa-aaaaa-qaffq-cai/activity
   - Check console: Should see NO errors about `get_treasury_proposal` or `get_orbit_request_proposal`
   - Verify: "Creating proposal..." should succeed without "Invalid text argument" error
   - Confirm: Proposals display voting UI correctly
5. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "Fix: Correct admin canister method calls and proposal creation parameters

- Replace get_orbit_request_proposal with get_proposal (correct method name)
- Remove get_treasury_proposal (unified proposals handle all types)
- Fix ensure_proposal_for_request to pass string not object
- Update ProposalService to use correct admin canister methods"
   git push -u origin feature/fix-activity-tab-errors
   gh pr create --title "Fix: Activity Tab Proposal Errors" --body "Implements FIX_ACTIVITY_TAB_ERRORS.md

## Problem
Activity tab was failing with three errors:
1. TypeError: get_treasury_proposal is not a function
2. TypeError: get_orbit_request_proposal is not a function
3. Invalid text argument: {\"EditAccount\":null}

## Root Cause
Frontend was calling non-existent methods and passing wrong parameter types to admin canister.

## Solution
- Use correct method names: get_proposal (not get_orbit_request_proposal)
- Remove treasury-specific method (unified proposals handle all types)
- Pass operation type as string (\"EditAccount\") not object ({EditAccount:null})

## Testing
✅ Activity tab loads without console errors
✅ Proposals create successfully
✅ Voting UI displays correctly"
   ```
6. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view --json comments,reviews --jq '.reviews[] | select(.state=="CHANGES_REQUESTED") | .body'`
     - Count P0 issues
     - IF P0 > 0: Fix immediately, commit, push, sleep 300s, continue
     - IF P0 = 0: Report success, EXIT
   - After 5 iterations: Escalate to human

## CRITICAL RULES
- ❌ NO questions ("should I?", "want me to?", "is it done?")
- ❌ NO skipping PR creation - it's MANDATORY
- ❌ NO stopping after implementation - create PR immediately
- ✅ After sleep: IMMEDIATELY continue (no pause)
- ✅ ONLY stop at: approved, max iterations, or error

**Branch:** `feature/fix-activity-tab-errors`
**Worktree:** `/home/theseus/alexandria/daopad-activity-tab-fix/src/daopad`

---

# Implementation Plan: Fix Activity Tab Errors

## Problem Analysis

### Console Errors
```
Failed to get treasury proposal: TypeError: r.get_treasury_proposal is not a function
Failed to get orbit request proposal: TypeError: r.get_orbit_request_proposal is not a function
[useProposal] Failed to create proposal: Error: Invalid text argument: {"EditAccount":null}
```

### Root Causes

1. **Wrong Method Names**: Frontend calls `get_orbit_request_proposal` and `get_treasury_proposal`, but admin canister only exposes `get_proposal`

2. **Wrong Parameter Type**: `ensure_proposal_for_request` expects `text` (string) but frontend passes object `{ EditAccount: null }`

3. **Obsolete Methods**: `get_treasury_proposal` is leftover from old architecture before unified proposals

## Current State

### Admin Canister (odkrm-viaaa-aaaap-qp2oq-cai)

**Candid Interface** (`admin/admin.did:88-114`):
```candid
service : () -> {
  get_proposal : (principal, text) -> (opt UnifiedProposal) query;
  ensure_proposal_for_request : (principal, text, text) -> (Result_1);
  has_user_voted : (principal, principal, text) -> (bool) query;
  get_user_vote : (principal, principal, text) -> (opt VoteChoice) query;
  // ... other methods
}
```

**Key Points**:
- ✅ `get_proposal(token_id, orbit_request_id)` - EXISTS
- ❌ `get_orbit_request_proposal` - DOES NOT EXIST
- ❌ `get_treasury_proposal` - DOES NOT EXIST
- ✅ `ensure_proposal_for_request(token_id, request_id, request_type_str: String)` - EXISTS, expects STRING

### Frontend Service Layer

**ProposalService.ts** (`daopad_frontend/src/services/backend/proposals/ProposalService.ts:136-178`):
```typescript
// ❌ WRONG - Method doesn't exist
async getOrbitRequestProposal(tokenId, requestId) {
  const result = await actor.get_orbit_request_proposal(tokenPrincipal, requestId);
  return this.wrapOption(result);
}

// ❌ WRONG - Method doesn't exist
async getTreasuryProposal(tokenId) {
  const result = await actor.get_treasury_proposal(tokenPrincipal);
  return this.wrapOption(result);
}
```

### Frontend Hook

**useProposal.ts** (`daopad_frontend/src/hooks/useProposal.ts:176-182`):
```typescript
// ❌ WRONG - Passing object instead of string
const requestType = inferRequestType(operationType); // Returns { EditAccount: null }
const result = await actor.ensure_proposal_for_request(
  Principal.fromText(tokenId),
  orbitRequestId,
  requestType  // Should be "EditAccount" (string), not { EditAccount: null }
);
```

**inferRequestType Function** (`daopad_frontend/src/hooks/useProposal.ts:8-68`):
```typescript
// Returns object like { EditAccount: null } - WRONG for ensure_proposal_for_request
function inferRequestType(operationType) {
  const typeMap = {
    'EditAccount': { EditAccount: null },  // ❌ Object
    'Transfer': { Transfer: null },         // ❌ Object
    // ... etc
  };
  return typeMap[operationType] || { Other: operationType };
}
```

### Usage Sites

1. **UnifiedRequests.tsx** (`daopad_frontend/src/components/orbit/UnifiedRequests.tsx:118`):
   - Calls `backend.getTreasuryProposal()` - REMOVE

2. **RequestDialog.tsx** (`daopad_frontend/src/components/orbit/requests/RequestDialog.tsx`):
   - Calls `proposalService.getOrbitRequestProposal()` - FIX

3. **useProposal.ts** (`daopad_frontend/src/hooks/useProposal.ts:121,179`):
   - Calls `getOrbitRequestProposal()` - FIX
   - Calls `ensure_proposal_for_request()` with object - FIX

## Implementation

### 1. Fix ProposalService Method Names

**File**: `daopad_frontend/src/services/backend/proposals/ProposalService.ts`

**Current** (lines 136-178):
```typescript
/**
 * Get Orbit request proposal
 */
async getOrbitRequestProposal(tokenId, requestId) {
  try {
    const actor = await this.getActor();
    const tokenPrincipal = this.toPrincipal(tokenId);
    const result = await actor.get_orbit_request_proposal(tokenPrincipal, requestId);
    return this.wrapOption(result);
  } catch (error) {
    console.error('Failed to get orbit request proposal:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get treasury transfer proposal for a token
 */
async getTreasuryProposal(tokenId) {
  try {
    const actor = await this.getActor();
    const tokenPrincipal = this.toPrincipal(tokenId);
    const result = await actor.get_treasury_proposal(tokenPrincipal);
    return this.wrapOption(result);
  } catch (error) {
    console.error('Failed to get treasury proposal:', error);
    return { success: false, error: error.message };
  }
}
```

**Replace With** (PSEUDOCODE):
```typescript
/**
 * Get proposal for an Orbit request
 * Uses unified proposal system - works for ALL operation types
 */
async getOrbitRequestProposal(tokenId, requestId) {
  try {
    const actor = await this.getActor();
    const tokenPrincipal = this.toPrincipal(tokenId);

    // ✅ CORRECT: Use get_proposal (matches admin.did)
    const result = await actor.get_proposal(tokenPrincipal, requestId);

    return this.wrapOption(result);
  } catch (error) {
    console.error('Failed to get orbit request proposal:', error);
    return { success: false, error: error.message };
  }
}

// ✅ REMOVE getTreasuryProposal - unified proposals handle all types
// No separate method needed - getOrbitRequestProposal works for treasury too
```

### 2. Remove getTreasuryProposal Call

**File**: `daopad_frontend/src/components/orbit/UnifiedRequests.tsx`

**Find and Remove** (search for `getTreasuryProposal`):
```typescript
// PSEUDOCODE - Find this block and DELETE it
const treasuryResult = await backend.getTreasuryProposal(Principal.fromText(tokenId));
```

**Context**: This call is trying to fetch treasury-specific proposals separately, but unified proposals already handle this. Simply remove the call - the unified request list already shows treasury operations.

### 3. Fix ensure_proposal_for_request Parameter Type

**File**: `daopad_frontend/src/hooks/useProposal.ts`

**Current** (lines 175-183):
```typescript
// Infer request type from operation string
const requestType = inferRequestType(operationType);
console.log('[useProposal] Request type:', requestType);

const result = await actor.ensure_proposal_for_request(
  Principal.fromText(tokenId),
  orbitRequestId,
  requestType  // ❌ This is { EditAccount: null }, should be "EditAccount"
);
```

**Replace With** (PSEUDOCODE):
```typescript
// Pass operation type as STRING, not object
console.log('[useProposal] Creating proposal for operation:', operationType);

const result = await actor.ensure_proposal_for_request(
  Principal.fromText(tokenId),
  orbitRequestId,
  operationType  // ✅ Pass string directly: "EditAccount", "Transfer", etc.
);
```

### 4. Update inferRequestType Documentation

**File**: `daopad_frontend/src/hooks/useProposal.ts`

**Current** (lines 6-8):
```typescript
// Helper: Map operation type string to enum variant
// MUST match backend's infer_request_type() at orbit_requests.rs:303-361
function inferRequestType(operationType) {
```

**Replace With** (PSEUDOCODE):
```typescript
// Helper: Map operation type string to enum variant
// Used for vote_on_proposal calls (not for ensure_proposal_for_request)
// MUST match backend's infer_request_type() at orbit_requests.rs:303-361
function inferRequestType(operationType) {
  // ... keep existing implementation ...
}
```

**Note**: Keep `inferRequestType` function as-is since it may be used elsewhere for different purposes. Just don't use it for `ensure_proposal_for_request`.

### 5. Verify Other Usage Sites

**Search and Verify**:
```bash
# Check all files using ProposalService methods
grep -r "getOrbitRequestProposal\|getTreasuryProposal" daopad_frontend/src/

# Expected: Only ProposalService.ts, useProposal.ts, RequestDialog.tsx
# All should work correctly after fixes above
```

## Testing Strategy

### 1. Build and Deploy
```bash
cd /home/theseus/alexandria/daopad-activity-tab-fix/src/daopad

# Build frontend
npm run build

# Deploy to mainnet
./deploy.sh --network ic --frontend-only
```

### 2. Browser Testing

**Navigate to**: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/fec7w-zyaaa-aaaaa-qaffq-cai/activity

**Test Checklist**:

1. ✅ **No Console Errors**
   - Should NOT see: `TypeError: r.get_treasury_proposal is not a function`
   - Should NOT see: `TypeError: r.get_orbit_request_proposal is not a function`

2. ✅ **Proposal Creation Works**
   - Click on any "Created" request
   - Should see "Creating proposal for community vote..."
   - Should NOT see: `Invalid text argument: {"EditAccount":null}`
   - Should transition to showing voting UI

3. ✅ **Existing Proposals Display**
   - Requests with existing proposals should show voting stats immediately
   - Vote counts, percentages, and expiry time should display correctly

4. ✅ **All Request Types Handled**
   - Test different operation types: EditAccount, Transfer, AddUser, etc.
   - All should create proposals successfully

### 3. Console Commands for Verification

**Before fix (Expected Errors)**:
```javascript
// Open browser console on activity page
// You should see these errors:
Failed to get treasury proposal: TypeError: r.get_treasury_proposal is not a function
Failed to get orbit request proposal: TypeError: r.get_orbit_request_proposal is not a function
Invalid text argument: {"EditAccount":null}
```

**After fix (Expected Success)**:
```javascript
// Open browser console on activity page
// You should see:
[UnifiedRequests] Initial mount - fetching requests
[RequestCard] Proposal check: { requestId: "...", status: "Created", hasProposal: false, loading: false }
[useProposal] Creating proposal for operation: EditAccount
[useProposal] Proposal created: { Ok: 12345 }
```

## File Changes Summary

| File | Change Type | Lines |
|------|-------------|-------|
| `ProposalService.ts` | MODIFY | 136-178 |
| `UnifiedRequests.tsx` | DELETE | ~118 |
| `useProposal.ts` | MODIFY | 175-183 |
| `useProposal.ts` | UPDATE COMMENT | 6-8 |

**Total Changes**: 3 files modified, ~50 lines changed

## Success Criteria

- [ ] Activity tab loads without console errors
- [ ] Proposals create successfully for all operation types
- [ ] Voting UI displays correctly
- [ ] Browser console shows successful proposal creation
- [ ] No "Invalid text argument" errors
- [ ] No "is not a function" errors

## Rollback Plan

If issues occur:
```bash
cd /home/theseus/alexandria/daopad
git worktree remove ../daopad-activity-tab-fix --force
# Main repo remains unchanged - no rollback needed
```

## Architecture Notes

### Why Unified Proposals Work for All Types

The admin canister uses a unified proposal system that handles ALL Orbit operations:

```rust
// admin/src/proposals/unified.rs:256-304
pub async fn ensure_proposal_for_request(
    token_id: Principal,
    orbit_request_id: String,
    request_type_str: String,  // ✅ Accepts "EditAccount", "Transfer", etc.
) -> Result<ProposalId, ProposalError> {
    // Converts string to OrbitOperationType enum
    let operation_type = OrbitOperationType::from_string(&request_type_str);

    // Creates proposal with correct voting duration and threshold
    let proposal = UnifiedProposal {
        operation_type,
        // ... voting logic applies to all types
    };
}
```

**Key Insight**: There's no need for separate "treasury" vs "request" proposal methods. The unified system determines voting rules based on operation type automatically.

## Related Documentation

- Admin Canister: `/home/theseus/alexandria/daopad/src/daopad/admin/src/lib.rs`
- Unified Proposals: `/home/theseus/alexandria/daopad/src/daopad/admin/src/proposals/unified.rs`
- Candid Interface: `/home/theseus/alexandria/daopad/src/daopad/admin/admin.did`
- Frontend Service: `/home/theseus/alexandria/daopad/src/daopad/daopad_frontend/src/services/backend/proposals/ProposalService.ts`
