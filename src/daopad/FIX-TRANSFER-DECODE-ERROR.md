# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-fix-transfer-decode/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-fix-transfer-decode/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Backend changes:
     ```bash
     cargo build --target wasm32-unknown-unknown --release -p daopad_backend
     candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
     ./deploy.sh --network ic --backend-only
     cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
     ```
   - Frontend changes:
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "Fix: Transfer Proposal Candid Decode Error"
   git push -u origin feature/fix-transfer-decode-and-asset-selection
   gh pr create --title "Fix: Transfer Proposal Candid Decode Error" --body "Implements FIX-TRANSFER-DECODE-ERROR.md"
   ```
5. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view [NUM] --json comments`
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

**Branch:** `feature/fix-transfer-decode-and-asset-selection`
**Worktree:** `/home/theseus/alexandria/daopad-fix-transfer-decode/src/daopad`

---

# Fix Transfer Proposal Candid Decode Error

## Problem Statement

**Error:**
```
"failed to decode canister response as (daopad_backend::api::orbit_transfers::CreateRequestResult,): Fail to decode argument 0"
```

**Root Cause:**
The backend's `create_treasury_transfer_proposal` function calls Orbit Station's `create_request` method internally. Our Rust type definition for `CreateRequestResult` doesn't match what Orbit Station actually returns, causing a candid decode failure.

**Flow:**
1. Frontend calls `create_treasury_transfer_proposal(tokenId, transferDetails)`
2. Backend function in `proposals/treasury.rs:82`
3. Calls internal helper `create_transfer_request_in_orbit()` at line 133
4. Helper makes inter-canister call to Orbit Station at line 366-367:
   ```rust
   let result: Result<(CreateRequestResult,), _> =
       ic_cdk::call(station_id, "create_request", (request_input,)).await;
   ```
5. **FAILURE HERE**: Response from Orbit doesn't match our `CreateRequestResult` type

## Current State

### File: `daopad_backend/src/api/orbit_transfers.rs`

**Current Type Definitions (Lines 9-13):**
```rust
#[derive(CandidType, Deserialize)]
pub enum CreateRequestResult {
    Ok(GetRequestResponse),
    Err(ErrorInfo),
}
```

**Current ErrorInfo (Lines 19-24):**
```rust
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ErrorInfo {
    pub code: String,
    pub message: Option<String>,  // Now optional to match Orbit's Error type
    pub details: Option<Vec<(String, String)>>,  // Add details field to match Orbit
}
```

**Usage in treasury.rs (Lines 366-379):**
```rust
let result: Result<(CreateRequestResult,), _> =
    ic_cdk::call(station_id, "create_request", (request_input,)).await;

match result {
    Ok((CreateRequestResult::Ok(response),)) => Ok(response.request.id),
    Ok((CreateRequestResult::Err(e),)) => Err(ProposalError::OrbitError {
        code: e.code,
        message: e.message.unwrap_or_else(|| "No message provided".to_string()),
    }),
    Err((code, msg)) => Err(ProposalError::IcCallFailed {
        code: code as i32,
        message: msg,
    }),
}
```

### File: `daopad_backend/src/api/orbit_requests.rs`

This file already has type definitions that might be more accurate:
- Line 1: `use crate::api::orbit_transfers::CreateRequestResult;`
- Contains `GetRequestResponse` definition (imported and used)

## Implementation Plan

### Step 1: Test with DFX (CRITICAL - Empirical Type Discovery)

**Test Station:** `fec7w-zyaaa-aaaaa-qaffq-cai` (ALEX token Orbit Station)
**Identity:** `daopad` (has admin access)

```bash
# Switch to daopad identity
dfx identity use daopad

# Get exact Candid interface from Orbit Station
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai __get_candid | head -200

# Test create_request with minimal transfer operation
# Use existing account/asset IDs from the station
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai create_request '(record {
  operation = variant {
    Transfer = record {
      from_account_id = "3f601869-e48e-49a1-92cb-32f55b308a18";
      from_asset_id = "7802cbab-221d-4e49-b764-a695ea6def1a";
      to = "2ljyd-77i5g-ix222-szy7a-ru4cu-ns4j7-kxc2z-oazam-igx3u-uwee6-yqe";
      amount = 100_000_000;
      metadata = vec {};
      network = null;
      fee = null;
      with_standard = "icrc1";
    }
  };
  title = opt "Test Transfer";
  summary = opt "Testing type structure";
  execution_plan = null;
})'
```

**Expected Output Analysis:**
- Capture the EXACT structure of the Ok variant
- Note all field names and types in the response
- Check if `GetRequestResponse` structure is correct
- Verify `ErrorInfo` structure matches Orbit's Error type

### Step 2: Check Orbit Reference Implementation

```bash
# Search for CreateRequest types in Orbit source
grep -r "create_request" ../../orbit-reference/core/station/api/ -A10

# Find Request and RequestWithDetails types
grep -r "type Request" ../../orbit-reference/core/station/api/spec.did -A20

# Find Error type definition
grep -r "type Error" ../../orbit-reference/core/station/api/spec.did -A10
```

### Step 3: Update Type Definitions

Based on dfx testing and orbit-reference, update types in `daopad_backend/src/api/orbit_transfers.rs`:

**PSEUDOCODE (actual types will come from Step 1 testing):**
```rust
// Update CreateRequestResult to match EXACT Orbit response
#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum CreateRequestResult {
    Ok(CreateRequestResultOk),  // Match exact Ok variant structure
    Err(ErrorInfo),
}

// Define the Ok variant structure based on dfx output
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct CreateRequestResultOk {
    pub request: RequestWithDetails,  // Or whatever the actual field name is
    // Add other fields found in dfx output
}

// Update ErrorInfo to match Orbit's Error type exactly
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ErrorInfo {
    pub code: String,
    pub message: Option<String>,
    pub details: Option<Vec<(String, String)>>,
    // Add any missing fields discovered in testing
}

// Ensure RequestWithDetails matches Orbit's structure
// (Already imported from orbit_requests.rs - verify it's correct)
```

### Step 4: Update Usage in treasury.rs

Update `daopad_backend/src/proposals/treasury.rs` line 366-379 to use corrected types:

**PSEUDOCODE:**
```rust
// Update the match statement to use the correct field access
match result {
    Ok((CreateRequestResult::Ok(create_response),)) => {
        // Access request ID using correct field path from dfx testing
        Ok(create_response.request.id)
    }
    Ok((CreateRequestResult::Err(e),)) => Err(ProposalError::OrbitError {
        code: e.code,
        message: e.message.unwrap_or_else(|| "No message provided".to_string()),
    }),
    Err((code, msg)) => Err(ProposalError::IcCallFailed {
        code: code as i32,
        message: msg,
    }),
}
```

### Step 5: Build and Test

```bash
# Build backend
cargo build --target wasm32-unknown-unknown --release -p daopad_backend

# Extract candid
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Verify the did file updated correctly
grep -A5 "create_treasury_transfer_proposal" daopad_backend/daopad_backend.did

# Deploy backend only
./deploy.sh --network ic --backend-only

# CRITICAL: Sync declarations
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# Test with actual transfer creation
# Should succeed without decode errors
```

### Step 6: Frontend Testing

```bash
# Rebuild frontend with updated declarations
npm run build

# Deploy frontend
./deploy.sh --network ic --frontend-only

# Manual test:
# 1. Navigate to https://daopad.org
# 2. Go to ALEX token treasury
# 3. Try creating a transfer proposal
# 4. Should succeed without "failed to decode" error
```

### Step 7: Verification Commands

```bash
# Verify backend can create requests directly
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai create_treasury_transfer_proposal '(
  principal "aaaaa-aa",
  record {
    from_account_id = "3f601869-e48e-49a1-92cb-32f55b308a18";
    from_asset_id = "7802cbab-221d-4e49-b764-a695ea6def1a";
    to = "2ljyd-77i5g-ix222-szy7a-ru4cu-ns4j7-kxc2z-oazam-igx3u-uwee6-yqe";
    amount = 100_000_000;
    memo = null;
    title = "Test Transfer";
    description = "Testing decode fix";
  }
)'

# Should return: (variant { Ok = <proposal_id> })
# NOT: failed to decode error
```

## Testing Requirements

### Phase 1: Type Discovery (30 min)
- [ ] Test `create_request` with dfx against test station
- [ ] Capture exact response structure
- [ ] Compare with orbit-reference types
- [ ] Document all field names and types

### Phase 2: Implementation (15 min)
- [ ] Update `CreateRequestResult` type
- [ ] Update `ErrorInfo` type if needed
- [ ] Update usage in `treasury.rs`
- [ ] Build without errors

### Phase 3: Deployment (10 min)
- [ ] Extract candid
- [ ] Deploy backend
- [ ] Sync declarations to frontend
- [ ] Deploy frontend

### Phase 4: Validation (15 min)
- [ ] Test backend call with dfx - should succeed
- [ ] Test frontend UI - transfer proposal should work
- [ ] Verify no decode errors in logs
- [ ] Check proposal is created in Orbit Station

## Success Criteria

1. ✅ `dfx canister call` to `create_treasury_transfer_proposal` succeeds
2. ✅ Frontend transfer dialog creates proposals without errors
3. ✅ No "failed to decode" errors in browser console
4. ✅ Proposals visible in Orbit Station
5. ✅ Types match Orbit's actual implementation (verified with dfx)

## Files Modified

- `daopad_backend/src/api/orbit_transfers.rs` - Type definitions
- `daopad_backend/src/proposals/treasury.rs` - Usage update (if needed)
- `daopad_backend/daopad_backend.did` - Auto-generated
- `daopad_frontend/src/declarations/daopad_backend/*` - Auto-synced

## Rollback Plan

If this fix doesn't work:
1. The error message will change (different decode error or different failure)
2. Revert the type changes
3. Run dfx testing again with more detailed output
4. Check Orbit Station logs if possible
5. Compare with working Orbit Station frontend code

## Notes

- This follows the CLAUDE.md "Orbit Station Integration Workflow" exactly
- Test with dfx FIRST - never guess types
- The test station (`fec7w-zyaaa-aaaaa-qaffq-cai`) has admin access for `daopad` identity
- Account ID `3f601869-e48e-49a1-92cb-32f55b308a18` is valid in test station
- Asset ID `7802cbab-221d-4e49-b764-a695ea6def1a` is valid in test station
- All testing on mainnet (no local replica available)
