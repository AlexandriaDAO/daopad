# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-transfer-fix/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-transfer-fix/src/daopad`
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
   git commit -m "Fix: Transfer decode error (delete 4 lines), currency detection, and address book infinite loop"
   git push -u origin bugfix/transfer-decode-error
   gh pr create --title "Fix: Transfer decode error, currency detection, and address book loop" --body "Implements FIX-TRANSFER-DECODE-CURRENCY-ADDRESSBOOK-LOOP.md - Minimal 3-bug fix"
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
- ❌ NO adding new features or infrastructure
- ✅ ONLY fix the three bugs, nothing more
- ✅ After sleep: IMMEDIATELY continue (no pause)
- ✅ ONLY stop at: approved, max iterations, or error

**Branch:** `bugfix/transfer-decode-error`
**Worktree:** `/home/theseus/alexandria/daopad-transfer-fix/src/daopad`

---

# Implementation Plan: Fix Transfer Decode Error, Currency Detection, and Address Book Loop

## Task Classification

**BUG FIX**: Restore broken transfer functionality → minimal targeted fixes (< 10 lines changed)

## Root Cause Analysis (Learned from PR #54)

### What PR #54 Did (And Didn't Fix)
PR #54 added **asset management** functionality:
- ✅ Added `orbit_assets.rs` (269 lines) - Add/edit/remove assets
- ✅ Added `get_account_assets()` - Query assets with balances
- ❌ Did NOT fix the transfer decode error
- ❌ Added hundreds of lines for different feature

**Key Discovery**: PR #54's `orbit_assets.rs` successfully uses `CreateRequestResult` from `types/orbit.rs`, but `orbit_transfers.rs` has a DUPLICATE LOCAL definition that's WRONG.

### The Actual Bugs (Empirically Verified)

#### Bug #1: Type Shadowing in orbit_transfers.rs

**Location**: `daopad_backend/src/api/orbit_transfers.rs` lines 9-13

**Current State (WRONG)**:
```rust
// Lines 1-2: Imports
use crate::api::orbit_requests::{GetRequestResponse, Error};
use crate::types::orbit::{...};

// Lines 9-13: LOCAL definition that SHADOWS correct import
#[derive(CandidType, Deserialize)]
pub enum CreateRequestResult {
    Ok(GetRequestResponse),    // ❌ WRONG TYPE
    Err(Error),
}
```

**Correct Type** (in `types/orbit.rs` lines 129-139):
```rust
#[derive(CandidType, Deserialize)]
pub struct CreateRequestResponse {  // Different from GetRequestResponse!
    pub request: RequestDTO,
    pub privileges: RequestCallerPrivilegesDTO,
    pub additional_info: RequestAdditionalInfoDTO,
}

#[derive(CandidType, Deserialize)]
pub enum CreateRequestResult {
    Ok(CreateRequestResponse),  // ✅ CORRECT TYPE
    Err(Error),
}
```

**Why It Fails**:
- Orbit returns `CreateRequestResponse` when you call `create_request`
- Local definition expects `GetRequestResponse`
- `GetRequestResponse` ≠ `CreateRequestResponse` → decode fails

**Proof**: PR #54's `orbit_assets.rs` works because it imports from `types/orbit::*` which has the CORRECT definition.

#### Bug #2: Currency Display (Frontend)
- Dialog shows "ALEX" when it should show "ICP"
- Need to investigate asset prop source

#### Bug #3: Address Book Loop (Frontend)
- `list_address_book_entries` called 70+ times
- Likely missing `useEffect` dependency array

## Implementation Plan

### Phase 1: Fix Backend Decode Error (DELETE 4 LINES)

**File**: `daopad_backend/src/api/orbit_transfers.rs`

**Change**: Delete lines 9-13 (local CreateRequestResult definition)

```rust
// BEFORE (Lines 1-15):
use crate::api::orbit_requests::{GetRequestResponse, Error};
use crate::types::orbit::{
    TransferOperationInput, TransferMetadata, NetworkInput,
    RequestExecutionSchedule, RequestOperation,
};
use candid::{CandidType, Deserialize, Nat, Principal};
use ic_cdk::api::call::CallResult;

#[derive(CandidType, Deserialize)]  // ❌ DELETE THIS
pub enum CreateRequestResult {       // ❌ DELETE THIS
    Ok(GetRequestResponse),           // ❌ DELETE THIS
    Err(Error),                       // ❌ DELETE THIS
}                                     // ❌ DELETE THIS

// RequestWithDetails and related types are now imported from orbit_requests.rs

// AFTER (Lines 1-10):
use crate::api::orbit_requests::{GetRequestResponse, Error};
use crate::types::orbit::{
    TransferOperationInput, TransferMetadata, NetworkInput,
    RequestExecutionSchedule, RequestOperation,
    CreateRequestResult,  // ✅ ADD THIS to import list
};
use candid::{CandidType, Deserialize, Nat, Principal};
use ic_cdk::api::call::CallResult;

// RequestWithDetails and related types are now imported from orbit_requests.rs
```

**That's it!** The correct `CreateRequestResult` will now be imported from `types/orbit.rs` via the wildcard import.

**No changes needed** in `treasury.rs` - it already imports via `use crate::api::CreateRequestResult;` which will now resolve to the correct type from `mod.rs` re-export.

### Phase 2: Fix Currency Detection (Frontend - Investigation First)

**Step 1: Find how asset is passed to TransferRequestDialog**

```bash
# Find where TransferRequestDialog is opened
cd daopad_frontend/src
grep -rn "TransferRequestDialog" components/orbit --include="*.jsx" -A 10 -B 5
```

**Step 2: Verify asset prop comes from selected asset, not default**

Look for patterns like:
```javascript
// ❌ WRONG: Using first asset or hardcoded default
<TransferRequestDialog asset={account.assets[0]} ... />

// ✅ CORRECT: Using user-selected asset
<TransferRequestDialog asset={selectedAsset} ... />
```

**Step 3: Minimal Fix**

If asset selection is wrong, fix ONLY the prop passing:
```javascript
// Change from wrong source to correct source
// NO new components, NO new state, just fix the variable
```

### Phase 3: Fix Address Book Loop (Frontend - Investigation First)

**Step 1: Find where list_address_book_entries is called**

```bash
cd daopad_frontend/src
grep -rn "list_address_book_entries" components --include="*.jsx" -B 10 -A 5
```

**Step 2: Check for missing useEffect dependency**

Look for:
```javascript
// ❌ WRONG: No dependency array
useEffect(() => {
  addressBookService.listAddressBookEntries()...
});

// ✅ CORRECT: Add empty array
useEffect(() => {
  addressBookService.listAddressBookEntries()...
}, []);  // Add this
```

**Step 3: Minimal Fix**

Add missing dependency array. That's it. < 1 line change.

## Testing Requirements

### Backend Testing (Bug #1: Decode Error)

```bash
cd /home/theseus/alexandria/daopad-transfer-fix/src/daopad

# 1. Compile - should succeed
cargo build --target wasm32-unknown-unknown --release -p daopad_backend

# 2. Test the exact call that was failing
dfx identity use daopad
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai create_treasury_transfer_proposal '(
  principal "ryjl3-tyaaa-aaaaa-aaaba-cai",
  record {
    from_account_id = "3f601869-e48e-49a1-92cb-32f55b308a18";
    from_asset_id = "7802cbab-221d-4e49-b764-a695ea6def1a";
    to = "2ljyd-77i5g-ix222-szy7a-ru4cu-ns4j7-kxc2z-oazam-igx3u-uwee6-yqe";
    amount = 10000000:nat;
    memo = null;
    title = "Test transfer 0.1 ICP";
    description = "Testing decode fix"
  }
)'

# EXPECTED: Returns proposal ID (e.g., Ok(variant { ... }))
# BEFORE FIX: "failed to decode canister response..."
```

### Frontend Testing (Bugs #2 & #3)

```bash
# Deploy frontend changes
cd /home/theseus/alexandria/daopad-transfer-fix/src/daopad
npm run build
./deploy.sh --network ic --frontend-only

# Manual Testing Checklist:
# 1. Open https://daopad.org
# 2. Open browser console (F12)
# 3. Navigate to ICP token dashboard → Treasury tab
# 4. CHECK: Console shows < 5 calls to list_address_book_entries (not 70+)
# 5. CHECK: Balance display shows "ICP" symbol (not "ALEX")
# 6. Click "Transfer" button on ICP row
# 7. CHECK: Dialog title shows "...from Alexandria Reserves (ICP)" not ALEX
# 8. Fill form and submit
# 9. CHECK: Success toast, no errors in console
```

### Acceptance Criteria (All Three Bugs)

✅ **Bug #1 Fixed**: `create_treasury_transfer_proposal` returns success, no decode error
✅ **Bug #2 Fixed**: Transfer dialog shows correct asset symbol (ICP, not ALEX)
✅ **Bug #3 Fixed**: Address book service called < 5 times on page load (not 70+)
✅ **E2E Works**: Can create transfer proposal from UI

## Expected Code Changes

### Backend (1 file, -4 +1 lines = net -3 lines)
```
daopad_backend/src/api/orbit_transfers.rs
  - Delete lines 9-13 (local CreateRequestResult definition)
  + Add CreateRequestResult to import from types/orbit
```

### Frontend (1-2 files, < 5 lines total)
```
Component with address book call:
  + Add dependency array to useEffect

Component that opens TransferRequestDialog:
  + Pass correct asset prop (if wrong)
```

**Total Changes**: < 10 lines across 2-3 files

## Why This is Minimal (vs PR #54)

| Aspect | PR #54 | This Fix |
|--------|--------|----------|
| Lines Added | +600+ | < 5 |
| Files Created | 1 new | 0 new |
| Purpose | New feature (asset mgmt) | Bug fix only |
| Fixed Transfer Bug? | No | Yes |

## Rollback Plan

```bash
# If deployed changes cause issues
cd /home/theseus/alexandria/daopad
git checkout master
./deploy.sh --network ic

# Or rollback specific canister
dfx canister --network ic install lwsav-iiaaa-aaaap-qp2qq-cai --mode reinstall
```

---

## Implementation Checklist

- [ ] Run isolation check (must be in worktree)
- [ ] Delete 4 lines from orbit_transfers.rs + add import
- [ ] Find and fix address book useEffect dependency
- [ ] Find and fix asset prop in TransferRequestDialog parent
- [ ] Compile backend (must succeed)
- [ ] Deploy backend to mainnet
- [ ] Sync declarations
- [ ] Build and deploy frontend
- [ ] Test: dfx call create_treasury_transfer_proposal (must work)
- [ ] Test: UI transfer flow (check console for address book spam)
- [ ] Test: UI shows correct currency symbol
- [ ] Create PR (mandatory)
- [ ] Iterate on review feedback autonomously
