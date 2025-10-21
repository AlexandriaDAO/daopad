# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-backend-optimization/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-backend-optimization/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Backend changes:
     ```bash
     cargo build --target wasm32-unknown-unknown --release -p daopad_backend
     candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
     ./deploy.sh --network ic --backend-only
     cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Refactor]: Backend optimization - Remove unused code and fix Rust warnings"
   git push -u origin feature/backend-optimization
   gh pr create --title "[Refactor]: Backend Optimization - Clean Rust Warnings" --body "Implements BACKEND-OPTIMIZATION-PLAN.md"
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

**Branch:** `feature/backend-optimization`
**Worktree:** `/home/theseus/alexandria/daopad-backend-optimization/src/daopad`

---

# Implementation Plan

## 📊 Current State: Compiler Warnings Analysis

### Warning Summary (22 total warnings):
- **13 unused imports** across 5 files
- **3 unused variables** in function parameters
- **2 irrefutable let patterns** in kong_locker/tokens.rs
- **1 unreachable pattern** in orbit_security.rs
- **1 dead code function** in orbit_requests.rs
- **1 unused constant** in orbit_users.rs
- **1 duplicate import** (CandidType imported twice in orbit_users.rs)

### Files Requiring Changes:
1. `daopad_backend/src/api/orbit.rs`
2. `daopad_backend/src/api/orbit_canisters.rs`
3. `daopad_backend/src/api/orbit_transfers.rs`
4. `daopad_backend/src/api/orbit_users.rs`
5. `daopad_backend/src/api/orbit_accounts.rs`
6. `daopad_backend/src/api/orbit_security.rs`
7. `daopad_backend/src/api/orbit_requests.rs`
8. `daopad_backend/src/api/mod.rs`
9. `daopad_backend/src/kong_locker/tokens.rs`
10. `daopad_backend/src/proposals/mod.rs`

## 🔧 Implementation Tasks

### Task 1: Remove Unused Imports

**File: `daopad_backend/src/api/orbit.rs`**
```rust
// PSEUDOCODE
// Line 483: Remove unused import
// DELETE: use std::convert::TryInto;
// Note: TryInto is in Rust prelude since 2021 edition
```

**File: `daopad_backend/src/api/orbit_canisters.rs`**
```rust
// PSEUDOCODE
// Line 6: Remove Nat from imports
use candid::Principal;  // Keep only Principal

// Lines 12-17: Remove unused imports
// KEEP ONLY:
use crate::types::orbit::{
    CreateExternalCanisterOperationInput,
    ExternalCanisterCallerMethodCallInput,
    FundExternalCanisterOperationInput,
    GetExternalCanisterResult,
    ListExternalCanistersInput,
    ListExternalCanistersResult,
    MonitorExternalCanisterOperationInput,
    PruneExternalCanisterOperationInput,
    RestoreExternalCanisterOperationInput,
    SnapshotExternalCanisterOperationInput,
    SubmitRequestResult,
};
// DELETE: ExternalCanister, ExternalCanisterIdInput, GetExternalCanisterInput,
//         RequestOperation, SubmitRequestInput
```

**File: `daopad_backend/src/api/orbit_transfers.rs`**
```rust
// PSEUDOCODE
// Line 1: Remove GetRequestResponse
use crate::api::orbit_requests::Error;

// Lines 3-4: Remove unused orbit types
// DELETE: TransferOperationInput, TransferMetadata, NetworkInput,
//         RequestExecutionSchedule, RequestOperation

// Line 8: Remove CallResult import
// DELETE: use ic_cdk::api::call::CallResult;

// Line 46: Remove AccountAsset
use crate::types::orbit::{Account, AccountBalance};

// Line 47: Remove AssetMetadata
use crate::api::orbit_accounts::Asset;

// Line 281: Remove TryInto (in prelude)
// DELETE: use std::convert::TryInto;
```

**File: `daopad_backend/src/api/orbit_users.rs`**
```rust
// PSEUDOCODE
// Line 1: Remove duplicate CandidType and unused Deserialize
use candid::Principal;  // Keep only Principal

// Line 6: Remove UserStatus
use crate::types::orbit::{
    CreateRequestResult,
    // DELETE UserStatus
};
```

**File: `daopad_backend/src/api/mod.rs`**
```rust
// PSEUDOCODE
// Line 44: Remove AssetBalanceInfo from public exports
// DELETE the line with AssetBalanceInfo
```

**File: `daopad_backend/src/proposals/mod.rs`**
```rust
// PSEUDOCODE
// Lines 16-17: Keep only what's actually used
pub use orbit_requests::{
    ensure_proposal_for_request,
    // DELETE: ensure_proposals_for_requests, get_orbit_request_proposal,
    //         infer_request_type, list_orbit_request_proposals,
    //         vote_on_orbit_request
};
```

### Task 2: Fix Unused Variables

**File: `daopad_backend/src/api/orbit.rs`**
```rust
// PSEUDOCODE
// Lines 229-230: Prefix with underscore
pub async fn orbit_transfer(
    // ... other params ...
    _title: String,        // Add underscore prefix
    _description: String,  // Add underscore prefix
    // ... other params ...
) -> Result<String, String> {
    // Function body unchanged
}
```

**File: `daopad_backend/src/api/orbit_accounts.rs`**
```rust
// PSEUDOCODE
// Line 71: Prefix with underscore
pub async fn add_treasury_account(
    _token_id: Principal,  // Add underscore prefix
    // ... rest of function
) -> Result<AddAccountResult, String> {
    // Function body unchanged
}
```

### Task 3: Fix Irrefutable Let Patterns

**File: `daopad_backend/src/kong_locker/tokens.rs`**
```rust
// PSEUDOCODE
// Line 30: Replace if let with let
// BEFORE: if let UserBalancesReply::LP(lp_reply) = balance {
// AFTER:
let UserBalancesReply::LP(lp_reply) = balance;
// Remove the if and dedent the block

// Line 76: Same fix
// BEFORE: if let UserBalancesReply::LP(lp_reply) = balance {
// AFTER:
let UserBalancesReply::LP(lp_reply) = balance;
// Remove the if and dedent the block
```

### Task 4: Fix Unreachable Pattern

**File: `daopad_backend/src/api/orbit_security.rs`**
```rust
// PSEUDOCODE
// Lines 1872-1878: Remove unreachable wildcard
fn format_permission_action(action: &PermissionAction) -> String {
    match action {
        PermissionAction::Read => "Read".to_string(),
        PermissionAction::Update => "Update".to_string(),
        // DELETE the wildcard pattern - enum only has 2 variants
    }
}
```

### Task 5: Remove Dead Code

**File: `daopad_backend/src/api/orbit_requests.rs`**
```rust
// PSEUDOCODE
// Line 373: Delete entire unused function
// DELETE function parse_submit_response (lines 373-XXX)
```

**File: `daopad_backend/src/api/orbit_users.rs`**
```rust
// PSEUDOCODE
// Line 13: Remove unused constant
// DELETE: const ADMIN_GROUP_ID: &str = "00000000-0000-4000-8000-000000000000";
```

## 📋 Testing Requirements

```bash
# 1. Build to verify all warnings are resolved
cargo build --target wasm32-unknown-unknown --release -p daopad_backend 2>&1 | tee build.log

# 2. Check warning count (should be 0)
grep -c "warning:" build.log || echo "0 warnings"

# 3. Run cargo fix to catch any remaining issues
cargo fix --lib -p daopad_backend --allow-dirty

# 4. Extract candid and deploy
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
./deploy.sh --network ic --backend-only

# 5. Sync declarations
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# 6. Verify backend still works
dfx canister --network ic call daopad_backend get_cache_status
```

## 📊 Expected Outcome

### Before:
- 22 compiler warnings
- Unused imports cluttering the codebase
- Dead code function taking up space
- Confusing irrefutable patterns

### After:
- 0 compiler warnings
- Clean, minimal imports
- No dead code
- Clear, idiomatic Rust patterns
- **Negative LOC change** (more deletions than additions)

## 🎯 Success Criteria

1. ✅ Zero compiler warnings when building
2. ✅ All tests pass
3. ✅ Backend deploys successfully
4. ✅ Frontend still connects properly
5. ✅ Net negative lines of code (refactoring principle)

## 📝 Commit Message Template

```
[Refactor]: Backend optimization - Remove unused code and fix Rust warnings

- Remove 13 unused imports across multiple files
- Fix 3 unused variables with underscore prefix
- Replace 2 irrefutable if-let patterns with simple let
- Remove unreachable pattern in permission matching
- Delete dead code function and unused constant
- Net reduction of ~50 lines of code

Addresses all 22 compiler warnings for cleaner, more maintainable code.
```