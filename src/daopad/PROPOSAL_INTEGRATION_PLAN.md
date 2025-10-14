# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-proposal-integration/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-proposal-integration/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Backend changes:
     ```bash
     cargo build --target wasm32-unknown-unknown --release -p daopad_backend
     candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
     ./deploy.sh --network ic --backend-only
     cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
     ```
   - Frontend changes (if toast message updated):
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "fix: Auto-create DAOPad proposals for admin removal requests

Fixes critical bug where admin removal requests were created in Orbit Station
but never appeared in the Governance tab for voting. Now backend automatically
creates DAOPad proposals when admin removal requests are created.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
   git push -u origin feature/proposal-integration
   gh pr create --title "fix: Auto-Create Proposals for Admin Removal" --body "Fixes P2 issue from #46: Admin removal requests now appear in Governance tab for voting.

## Problem
Admin removal requests were created in Orbit Station but never created DAOPad proposals, so users couldn't vote.

## Solution
Backend automatically calls \`ensure_proposal_for_request\` after creating admin removal requests.

## Testing
- Created admin removal request
- Verified proposal appears in Governance tab
- Voted on proposal
- Confirmed execution when threshold reached"
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

**Branch:** `feature/proposal-integration`
**Worktree:** `/home/theseus/alexandria/daopad-proposal-integration/src/daopad`

---

# Implementation Plan: Auto-Create Proposals for Admin Removal

## Problem Statement

Admin removal requests are created in Orbit Station (PR #46) but **never appear in the Governance tab for voting**. The critical missing step is calling `ensure_proposal_for_request()` to create a DAOPad proposal linked to the Orbit request.

### Current Flow (Broken):
```
User clicks "Remove Admin"
  ↓
create_remove_admin_request() creates Orbit request
  ↓
Returns request_id to frontend
  ↓
❌ STOPS - no proposal created
  ↓
Request sits in Orbit with no voting mechanism
```

### Fixed Flow:
```
User clicks "Remove Admin"
  ↓
create_remove_admin_request() creates Orbit request
  ↓
✅ Backend calls ensure_proposal_for_request(token_id, request_id, EditUser)
  ↓
DAOPad proposal created
  ↓
Proposal appears in Governance tab
  ↓
Users vote with Kong Locker voting power
  ↓
When threshold reached → backend approves Orbit request
```

## Current State

### File: `daopad_backend/src/api/orbit_users.rs` (lines 95-109)
```rust
// 4. Create request in Orbit (backend is admin, so can create)
let result: (CreateRequestResult,) =
    ic_cdk::call(station_id, "create_request", (request_input,))
    .await
    .map_err(|e| format!("Failed to create request: {:?}", e))?;

// 5. Return request ID or error
match result.0 {
    CreateRequestResult::Ok(response) => {
        // NOTE: ensure_proposal_for_request will be called by frontend
        // ❌ BUG: Frontend never calls this - proposals don't appear
        Ok(response.request.id)
    },
    CreateRequestResult::Err(e) => Err(format!("Orbit error: {}", e.code)),
}
```

### File: `daopad_backend/src/proposals/types.rs` (lines 76-85)
```rust
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum OrbitRequestType {
    EditAccount,
    AddUser,
    RemoveUser,
    ChangeExternalCanister,
    ConfigureExternalCanister,
    EditPermission,
    AddRequestPolicy,
    Other(String),  // ← EditUser will map to Other("EditUser")
}
```

### File: `daopad_backend/src/proposals/orbit_requests.rs` (lines 240-284)
```rust
#[update]
pub async fn ensure_proposal_for_request(
    token_id: Principal,
    orbit_request_id: String,
    request_type: OrbitRequestType,
) -> Result<ProposalId, ProposalError> {
    // Already exported in proposals/mod.rs line 16
    // Creates DAOPad proposal atomically
    // Returns existing proposal ID if already created (idempotent)
}
```

## Implementation

### 1. Add EditUser Variant to OrbitRequestType

**File:** `daopad_backend/src/proposals/types.rs` (MODIFY line 76)

```rust
// PSEUDOCODE
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum OrbitRequestType {
    EditAccount,
    AddUser,
    EditUser,        // ← ADD THIS (for admin removal)
    RemoveUser,
    ChangeExternalCanister,
    ConfigureExternalCanister,
    EditPermission,
    AddRequestPolicy,
    Other(String),
}
```

### 2. Update infer_request_type Mapping

**File:** `daopad_backend/src/proposals/orbit_requests.rs` (MODIFY line 291)

```rust
// PSEUDOCODE
pub fn infer_request_type(operation_type: &str) -> OrbitRequestType {
    match operation_type {
        "EditAccount" => OrbitRequestType::EditAccount,
        "AddUser" => OrbitRequestType::AddUser,
        "EditUser" => OrbitRequestType::EditUser,  // ← ADD THIS
        "RemoveUser" => OrbitRequestType::RemoveUser,
        "ChangeExternalCanister" => OrbitRequestType::ChangeExternalCanister,
        "ConfigureExternalCanister" => OrbitRequestType::ConfigureExternalCanister,
        "EditPermission" => OrbitRequestType::EditPermission,
        "AddRequestPolicy" => OrbitRequestType::AddRequestPolicy,
        _ => OrbitRequestType::Other(operation_type.to_string()),
    }
}
```

### 3. Auto-Create Proposal in Backend

**File:** `daopad_backend/src/api/orbit_users.rs` (MODIFY lines 95-109)

```rust
// PSEUDOCODE

// 4. Create request in Orbit
let result: (CreateRequestResult,) =
    ic_cdk::call(station_id, "create_request", (request_input,))
    .await
    .map_err(|e| format!("Failed to create request: {:?}", e))?;

// 5. Handle result and auto-create proposal
match result.0 {
    CreateRequestResult::Ok(response) => {
        let request_id = response.request.id;

        // ✅ NEW: Auto-create DAOPad proposal for voting
        use crate::proposals::{ensure_proposal_for_request, OrbitRequestType};

        match ensure_proposal_for_request(
            token_canister_id,
            request_id.clone(),
            OrbitRequestType::EditUser,
        ).await {
            Ok(_proposal_id) => {
                // Success - proposal created, voting enabled
                Ok(request_id)
            },
            Err(e) => {
                // Proposal creation failed
                // Note: Orbit request was created but no voting mechanism
                Err(format!(
                    "Orbit request {} created but proposal creation failed: {:?}",
                    request_id, e
                ))
            }
        }
    },
    CreateRequestResult::Err(e) => Err(format!("Orbit error: {}", e.code)),
}
```

### 4. Optional: Update Toast Message (Frontend)

**File:** `daopad_frontend/src/components/security/AdminRemovalActions.jsx` (MODIFY line 61)

```javascript
// PSEUDOCODE
if (result.success) {
    toast.success('Proposal Created', {
        description: `Admin removal request created for ${user.name}. Request ID: ${result.requestId}. Vote in the Governance tab.`
        //                                                                             ↑ Change from "Community voting has begun"
    });

    await loadUsers();
}
```

## Testing Requirements

### 1. Build Backend
```bash
cd /home/theseus/alexandria/daopad-proposal-integration/src/daopad
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
# Expected: Build succeeds
```

### 2. Extract Candid
```bash
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
# Expected: No errors
```

### 3. Deploy Backend
```bash
./deploy.sh --network ic --backend-only
# Expected: Deployment succeeds
```

### 4. Sync Declarations
```bash
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
ls daopad_frontend/src/declarations/daopad_backend/
# Expected: Files synced
```

### 5. Test Admin Removal Request Creation
```bash
# Create admin removal request
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai create_remove_admin_request '(
  principal "ysy5f-2qaaa-aaaap-qkmmq-cai",
  "83c52252-4112-4119-a643-5eedddcc53ff",
  "DAOPad DFX ID"
)'
# Expected: Returns Ok(request_id)
```

### 6. Verify Proposal Created
```bash
# List proposals for ALEX token
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_orbit_request_proposals '(
  principal "ysy5f-2qaaa-aaaap-qkmmq-cai"
)'
# Expected: Shows proposal with:
# - orbit_request_id matching the request_id from step 5
# - request_type: EditUser
# - status: Active
# - total_voting_power: from Kong Locker
```

### 7. Test Voting Flow
```bash
# Vote on the proposal
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai vote_on_orbit_request '(
  principal "ysy5f-2qaaa-aaaap-qkmmq-cai",
  "REQUEST_ID_FROM_STEP_5",
  true
)'
# Expected: Vote recorded, if threshold reached → auto-approved
```

### 8. Deploy Frontend (Optional - if toast message updated)
```bash
npm run build
./deploy.sh --network ic --frontend-only
# Expected: Frontend deployed
```

### 9. End-to-End UI Test
1. Navigate to https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/
2. Go to ALEX token → Security tab
3. Click "Remove Admin" on a user
4. Expected: Toast shows "Vote in the Governance tab"
5. Go to Governance tab
6. Expected: Proposal appears with:
   - Title: "Remove [User Name] from Admin group"
   - Request ID displayed
   - Vote Yes/No buttons
   - Voting power display
7. Vote Yes
8. Expected: When threshold reached, backend auto-approves, user removed

## Error Handling

### Scenario 1: Orbit request succeeds, proposal creation fails
**Current behavior**: Request created, no voting mechanism
**New behavior**: Returns error message with request ID
**User impact**: Clear error, can manually investigate

### Scenario 2: Duplicate proposal creation attempt
**Current behavior**: `ensure_proposal_for_request` is idempotent, returns existing proposal ID
**New behavior**: Same - no action needed

### Scenario 3: Invalid request type
**Current behavior**: Maps to Other("EditUser")
**New behavior**: Maps to EditUser (explicit variant)

## Success Criteria

- ✅ Build succeeds without errors
- ✅ Candid interface updated
- ✅ Backend deployed to IC
- ✅ Admin removal request creates both:
  - Orbit Station request
  - DAOPad proposal
- ✅ Proposal appears in Governance tab immediately
- ✅ Users can vote with Kong Locker voting power
- ✅ When threshold reached, backend auto-approves
- ✅ User removed from Admin group in Orbit Station

## Rollback Plan

If deployment fails:
1. Revert to previous backend version
2. User can manually create proposals via backend call

If proposal creation breaks:
1. Requests still created in Orbit
2. No voting mechanism (same as before)
3. Can be fixed in follow-up PR

## Related Issues

- **PR #46**: Introduced admin removal feature (merged)
- **P2 Issue**: Admin removal requests don't appear in Governance tab
- **Root cause**: Missing `ensure_proposal_for_request` call

---

**END OF PLAN**
