# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-treasury-simplification/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-treasury-simplification/src/daopad`
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
   git commit -m "refactor: Simplify treasury transfers to single proposal-based flow"
   git push -u origin feature/treasury-simplification
   gh pr create --title "Refactor: Remove Direct Transfer Path for Treasury Operations" --body "Implements TREASURY_SIMPLIFICATION_PLAN.md"
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

**Branch:** `feature/treasury-simplification`
**Worktree:** `/home/theseus/alexandria/daopad-treasury-simplification/src/daopad`

---

# Implementation Plan

## Task Classification
**REFACTORING**: Simplify existing dual-path treasury transfer system to single proposal-based flow

## Current State Documentation

### Existing Architecture (BEFORE)
```
User Request → Two Paths:
1. Direct Transfer (orbit_transfers.rs:45-110)
   - Admin bypass (hardcoded principal)
   - 100 VP minimum
   - Immediate Orbit request

2. Treasury Proposal (treasury.rs:79-147)
   - 10,000 VP minimum
   - Creates DAOPad proposal + Orbit request
   - Community voting with auto-approval
```

### Files to Modify
1. **daopad_backend/src/api/orbit_transfers.rs** - Remove public direct transfer
2. **daopad_backend/src/api/orbit.rs** - Replace wrapper with proposal creation
3. **daopad_backend/src/api/mod.rs** - Clean up exports
4. **daopad_backend/src/proposals/treasury.rs** - Remove admin bypass
5. **daopad_frontend/src/services/daopadBackend.js** - Update to use proposal endpoint

### Dead Code to Remove
- `create_transfer_request_in_orbit()` public function (lines 45-110 in orbit_transfers.rs)
- Admin bypass check (lines 59-70 in orbit_transfers.rs)
- Admin bypass in treasury.rs (lines 58-70 if present)
- Export of direct transfer in mod.rs

## Implementation (PSEUDOCODE)

### Backend: `daopad_backend/src/api/orbit_transfers.rs` (MODIFY)
```rust
// PSEUDOCODE - DELETE lines 45-110
// REMOVE the entire public function create_transfer_request_in_orbit
// KEEP only these functions:
// - approve_orbit_request (lines 126-148)
// - get_transfer_requests_from_orbit (lines 113-123)
// - Keep types (lines 9-42)
```

### Backend: `daopad_backend/src/api/orbit.rs` (MODIFY)
```rust
// PSEUDOCODE - REPLACE create_transfer_request function (around line 282-312)
#[update]
pub async fn create_transfer_request(
    from_account_id: String,
    from_asset_id: String,
    to_address: String,
    amount: Nat,
    title: String,
    description: String,
    memo: Option<String>,
    token_id: Principal,
) -> Result<String, String> {
    // REMOVE direct call to create_transfer_request_in_orbit
    // INSTEAD: Create treasury proposal

    use crate::proposals::treasury::{TransferDetails, create_treasury_transfer_proposal};

    let transfer_details = TransferDetails {
        from_account_id,
        from_asset_id,
        to: to_address,
        amount,
        memo,
    };

    // Call the proposal creation (it handles VP checks, Orbit request, etc.)
    match create_treasury_transfer_proposal(token_id, transfer_details).await {
        Ok(proposal_id) => Ok(format!("Proposal created: {:?}", proposal_id)),
        Err(e) => Err(format!("Failed to create proposal: {:?}", e))
    }
}
```

### Backend: `daopad_backend/src/api/mod.rs` (MODIFY)
```rust
// PSEUDOCODE - REMOVE these exports (around lines 21-30)
// DELETE:
// pub use orbit_transfers::{
//     create_transfer_request_in_orbit,  // REMOVE THIS LINE
//     ...keep other exports...
// };

// KEEP only:
pub use orbit_transfers::{
    approve_orbit_request as approve_transfer_orbit_request,
    get_transfer_requests_from_orbit,
    CreateRequestResult,
    ErrorInfo,
    RequestApprovalDecision,
    SubmitRequestApprovalInput,
    SubmitRequestApprovalResult,
};
```

### Backend: `daopad_backend/src/proposals/treasury.rs` (MODIFY)
```rust
// PSEUDOCODE - IF admin bypass exists around lines 58-70
// FIND code like:
// if caller_text == "67ktx-ln42b-uzmo5-..." {
//     // Allow admin bypass
// }
// DELETE that entire if block

// ALSO check create_transfer_request_in_orbit internal helper (lines 299-350)
// This should remain PRIVATE (not pub) and internal-only
// Ensure it starts with: async fn create_transfer_request_in_orbit (NO pub keyword)
```

### Frontend: `daopad_frontend/src/services/daopadBackend.js` (NO CHANGES NEEDED)
```javascript
// PSEUDOCODE - The frontend already calls create_transfer_request
// which will now route to proposal creation automatically
// NO CHANGES NEEDED - the backend redirect handles it
```

## Testing Requirements

### Build & Test Sequence
```bash
# 1. Build backend with changes
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked

# 2. Extract candid interface
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# 3. Verify create_transfer_request still exists in .did file
grep "create_transfer_request" daopad_backend/daopad_backend.did

# 4. Deploy backend
./deploy.sh --network ic --backend-only

# 5. Sync declarations (CRITICAL)
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# 6. Build frontend
npm run build

# 7. Deploy frontend
./deploy.sh --network ic --frontend-only

# 8. Test with dfx
dfx canister --network ic call daopad_backend create_transfer_request '(
  "account-uuid",
  "asset-uuid",
  "destination-address",
  1000000,
  "Test Transfer",
  "Testing proposal creation",
  null,
  principal "token-canister-id"
)'
# Should return: "Proposal created: ..." instead of request ID
```

## Success Criteria
1. ✅ No more direct transfer path - everything goes through proposals
2. ✅ Single entry point: `create_transfer_request` → creates proposal
3. ✅ 10,000 VP requirement for all users (no admin bypass)
4. ✅ Frontend continues working without changes
5. ✅ Cleaner codebase with ~100 lines removed

## Risk Mitigation
- **Frontend compatibility**: Backend maintains same function signature, just changes behavior
- **Existing transfers**: Only affects new transfers, existing proposals unaffected
- **VP requirement**: Users with <10,000 VP can no longer create transfers (intended)

## File Diff Summary
```
Modified Files:
- daopad_backend/src/api/orbit_transfers.rs    (-65 lines)
- daopad_backend/src/api/orbit.rs              (~20 lines modified)
- daopad_backend/src/api/mod.rs                (-1 line)
- daopad_backend/src/proposals/treasury.rs     (-13 lines if admin bypass present)
- daopad_backend/daopad_backend.did            (regenerated)

Total: ~100 lines removed, cleaner single-path architecture
```

## Commit Message
```
refactor: Simplify treasury transfers to single proposal-based flow

- Remove direct transfer path from orbit_transfers.rs
- Route all transfers through treasury proposal system
- Remove admin bypass logic
- Maintain frontend compatibility with same API signature
- Enforce consistent 10,000 VP requirement for all users

This simplifies the codebase and ensures all treasury operations
follow the same governance path through community voting.
```

---

**END OF PLAN**

The plan is ready. The implementing agent MUST:
1. Read the orchestrator header (embedded at top)
2. Verify worktree isolation
3. Implement according to pseudocode
4. Create PR (mandatory)
5. Iterate autonomously until approved