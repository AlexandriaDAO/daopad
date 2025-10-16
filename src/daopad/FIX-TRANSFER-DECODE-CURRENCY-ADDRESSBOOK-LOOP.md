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
   git commit -m "Fix: Transfer decode error, currency detection, and address book infinite loop"
   git push -u origin bugfix/transfer-decode-error
   gh pr create --title "Fix: Transfer decode error, currency detection, and address book infinite loop" --body "Implements FIX-TRANSFER-DECODE-CURRENCY-ADDRESSBOOK-LOOP.md"
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

**Branch:** `bugfix/transfer-decode-error`
**Worktree:** `/home/theseus/alexandria/daopad-transfer-fix/src/daopad`

---

# Implementation Plan: Fix Transfer Decode Error, Currency Detection, and Address Book Loop

## Task Classification

**BUG FIX**: Restore broken transfer functionality → minimal targeted fixes

## Problem Statement

Three distinct issues preventing transfer proposals:

1. **Candid Decode Error**: Backend fails to decode Orbit's `create_request` response
   - Error: `"failed to decode canister response as (daopad_backend::api::orbit_transfers::CreateRequestResult,)"`
   - Root Cause: Type mismatch in `CreateRequestResult` definition

2. **Currency Detection Bug**: UI shows wrong asset symbol (ALEX instead of ICP)
   - Symptom: "Propose a transfer from Alexandria Reserves (ALEX)" when it should be ICP
   - Root Cause: Frontend not properly detecting/passing selected asset

3. **Address Book Infinite Loop**: `list_address_book_entries` called 70+ times on page load
   - Symptom: Console spam, performance degradation
   - Root Cause: Rendering loop or missing dependency array

## Current State Analysis

### Files Involved

**Backend (Rust)**:
```
daopad_backend/src/
├── api/
│   ├── orbit_transfers.rs       # Lines 9-13: CreateRequestResult definition
│   └── orbit_requests.rs        # Lines 631-635: GetRequestResponse struct
└── proposals/
    └── treasury.rs              # Lines 340-392: create_transfer_request_in_orbit()
```

**Frontend (JavaScript)**:
```
daopad_frontend/src/
├── components/orbit/
│   ├── TransferRequestDialog.jsx    # Transfer creation UI
│   └── dashboard/
│       └── TreasuryOverview.jsx     # Asset selection/display
└── services/
    └── addressBookService.js        # Address book queries
```

### Verified Information from Testing

**DFX Test Result** (lines from successful create_request call):
```candid
variant {
  Ok = record {
    privileges = record { id = "..."; can_approve = false; };
    request = record { id = "..."; status = variant { Created }; ... };
    additional_info = record { id = "..."; evaluation_result = opt record { ... }; ... };
  }
}
```

**Expected Type** (orbit_requests.rs:631):
```rust
pub struct GetRequestResponse {
    pub request: Request,
    pub privileges: RequestCallerPrivileges,
    pub additional_info: RequestAdditionalInfo,
}
```

**Type Match**: Structure is correct, but field ORDER may differ (Candid should handle this).

### Root Causes Identified

1. **Decode Error**: The `CreateRequestResult` in `orbit_transfers.rs` doesn't import from the right place
   - Line 10-13 defines a local enum instead of using the one from orbit_requests.rs
   - Should use `use crate::api::orbit_requests::CreateRequestResult;` if it exists there

2. **Currency Bug**: Frontend component receives wrong asset or doesn't filter by selected asset
   - Need to trace asset selection flow from TreasuryOverview → TransferRequestDialog

3. **Address Book Loop**: Likely missing dependency array in useEffect or render loop
   - Need to find component calling addressBookService.listAddressBookEntries

## Implementation Plan

### Phase 1: Fix Backend Candid Decode Error

**File: `daopad_backend/src/api/orbit_transfers.rs`**

Current (Lines 9-13):
```rust
#[derive(CandidType, Deserialize)]
pub enum CreateRequestResult {
    Ok(GetRequestResponse),
    Err(Error),
}
```

**Action**: Check if orbit_requests.rs already defines this type. If yes, remove duplicate and import it.

PSEUDOCODE:
```rust
// CHECK: Does orbit_requests.rs have CreateRequestResult?
// IF YES:
//   REMOVE lines 9-13 from orbit_transfers.rs
//   ADD at top: use crate::api::orbit_requests::CreateRequestResult;
// IF NO:
//   Keep definition but ensure GetRequestResponse and Error are imported correctly
//   Verify field names match Orbit's actual response
```

**File: `daopad_backend/src/proposals/treasury.rs`**

Current (Lines 377-391) uses CreateRequestResult:
```rust
let result: Result<(CreateRequestResult,), _> =
    ic_cdk::call(station_id, "create_request", (request_input,)).await;

match result {
    Ok((CreateRequestResult::Ok(response),)) => Ok(response.request.id),
    Ok((CreateRequestResult::Err(e),)) => Err(ProposalError::OrbitError { ... }),
    Err((code, msg)) => Err(ProposalError::IcCallFailed { ... }),
}
```

**Action**: Ensure this import path is correct after consolidating CreateRequestResult.

PSEUDOCODE:
```rust
// After fixing orbit_transfers.rs imports:
// VERIFY: `use crate::api::CreateRequestResult;` at top of treasury.rs
// TEST: cargo build to ensure types match
// IF BUILD FAILS:
//   CHECK: Field access response.request.id is correct
//   VERIFY: GetRequestResponse struct has `request` field
```

### Phase 2: Fix Currency Detection

**Investigation Required**:
1. Find how TreasuryOverview passes asset to TransferRequestDialog
2. Ensure selected asset (not default) is passed
3. Verify asset.symbol comes from Orbit asset list, not hardcoded

**File: `daopad_frontend/src/components/orbit/dashboard/TreasuryOverview.jsx`**

PSEUDOCODE:
```javascript
// FIND: Where TransferRequestDialog is opened
// CHECK: What props are passed - specifically `asset` prop
// VERIFY: asset comes from selected account's asset list, not global default

// Example fix pattern:
const handleOpenTransferDialog = (account, asset) => {
  // BEFORE: May be passing wrong asset or default
  // AFTER: Pass the SPECIFIC asset user clicked on
  setTransferDialog({
    open: true,
    account: account,
    asset: asset,  // Must be from account.assets[selectedAssetIndex]
    tokenId: tokenCanisterId
  });
};
```

**File: `daopad_frontend/src/components/orbit/TransferRequestDialog.jsx`**

Current (Line 202):
```jsx
Propose a transfer from {account.name} ({asset.symbol}). Community will vote on this proposal.
```

**Action**: This is correct - it displays whatever asset is passed. Fix is in parent component.

PSEUDOCODE:
```javascript
// IN PARENT (TreasuryOverview):
// ENSURE: When opening transfer dialog, pass correct asset
// PATTERN:
//   1. User clicks "Transfer" on ICP row
//   2. Find ICP asset from account.assets
//   3. Pass that specific asset to dialog
//   4. Dialog shows asset.symbol (ICP not ALEX)

// IF asset selection UI exists:
//   ADD: Asset dropdown/selector if multiple assets in account
//   BIND: Selected asset to transfer dialog prop
```

### Phase 3: Fix Address Book Infinite Loop

**Investigation Required**:
1. Find component(s) calling `list_address_book_entries`
2. Check for useEffect without dependency array
3. Check for render loops (calling service in render)

**Search Pattern**:
```bash
# Find all usages
grep -r "list_address_book_entries" daopad_frontend/src/components --include="*.jsx"
# Look for useEffect patterns
grep -B5 -A10 "useEffect" <file_with_address_book_call>
```

**Common Patterns to Fix**:

PSEUDOCODE:
```javascript
// ANTI-PATTERN (causes loop):
function AddressBookComponent() {
  const [entries, setEntries] = useState([]);

  // BAD: No dependency array - runs on every render
  useEffect(() => {
    addressBookService.listAddressBookEntries().then(setEntries);
  });  // Missing dependency array!

  return <div>{entries.map(...)}</div>;
}

// FIX:
function AddressBookComponent() {
  const [entries, setEntries] = useState([]);

  // GOOD: Empty array means run once on mount
  useEffect(() => {
    addressBookService.listAddressBookEntries().then(result => {
      if (result.Ok) setEntries(result.Ok.address_book_entries);
    });
  }, []);  // Empty dependency array

  return <div>{entries.map(...)}</div>;
}

// OR if it needs to refetch based on changes:
  useEffect(() => {
    addressBookService.listAddressBookEntries().then(result => {
      if (result.Ok) setEntries(result.Ok.address_book_entries);
    });
  }, [tokenId, account]);  // Only refetch when these change
```

**Alternative Fix** (if called in AddressInput component):
```javascript
// IF AddressInput is rendered 70 times (e.g., in a loop):
// OPTIMIZE: Move address book fetch to parent component
// PASS: entries as prop instead of fetching in each instance

// PARENT:
function ParentComponent() {
  const [addressBookEntries, setAddressBookEntries] = useState([]);

  useEffect(() => {
    // Fetch once
    addressBookService.listAddressBookEntries().then(result => {
      if (result.Ok) setAddressBookEntries(result.Ok.address_book_entries);
    });
  }, []);

  return (
    <form>
      {/* Pass entries down instead of each input fetching */}
      <AddressInput addressBookEntries={addressBookEntries} />
    </form>
  );
}
```

## Testing Requirements

### Backend Testing

```bash
# After backend changes
cd /home/theseus/alexandria/daopad-transfer-fix/src/daopad

# 1. Build and check for type errors
cargo build --target wasm32-unknown-unknown --release -p daopad_backend

# 2. Extract Candid interface
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# 3. Deploy backend
./deploy.sh --network ic --backend-only

# 4. Sync declarations
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# 5. Test create_treasury_transfer_proposal directly
dfx identity use daopad
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai create_treasury_transfer_proposal '(
  principal "ryjl3-tyaaa-aaaaa-aaaba-cai",
  record {
    from_account_id = "3f601869-e48e-49a1-92cb-32f55b308a18";
    from_asset_id = "7802cbab-221d-4e49-b764-a695ea6def1a";
    to = "test-recipient-address";
    amount = 100000:nat;
    memo = null;
    title = "Test transfer after fix";
    description = "Testing decode fix"
  }
)'

# Expected: Success with proposal ID, NOT decode error
```

### Frontend Testing

```bash
# After frontend changes
cd /home/theseus/alexandria/daopad-transfer-fix/src/daopad

# 1. Build frontend
npm run build

# 2. Deploy frontend
./deploy.sh --network ic --frontend-only

# 3. Manual UI Testing
# - Open https://daopad.org
# - Navigate to token dashboard (ICP token)
# - Go to Treasury tab
# - Verify: Balance shows ICP not ALEX
# - Click "Transfer" on ICP asset row
# - Verify: Dialog shows "Propose a transfer from Alexandria Reserves (ICP)"
# - Check console: NO spam of address book calls (should be < 5 calls total)
# - Fill form and submit
# - Verify: Proposal created successfully, no decode error
```

### Acceptance Criteria

✅ Backend decode error resolved - transfer proposals create successfully
✅ Currency display correct - shows actual asset symbol (ICP) not default (ALEX)
✅ Address book calls < 5 on page load - no infinite loop
✅ End-to-end transfer proposal works: create → vote → execute

## Files to Modify

### Backend (Minimal Changes)
1. `daopad_backend/src/api/orbit_transfers.rs` - Fix CreateRequestResult import
2. `daopad_backend/src/proposals/treasury.rs` - Verify import path (may not need change)

### Frontend (Targeted Fixes)
1. `daopad_frontend/src/components/orbit/dashboard/TreasuryOverview.jsx` - Fix asset passing
2. Component with address book loop (TBD after grep search) - Add useEffect dependency array

## Migration Notes

**No breaking changes** - All fixes are internal bug fixes, no API changes.

## Rollback Plan

If issues occur:
```bash
# Revert to previous deployment
cd /home/theseus/alexandria/daopad
git checkout master
./deploy.sh --network ic
```

## Post-Deployment Verification

1. Check error logs: `dfx canister --network ic logs lwsav-iiaaa-aaaap-qp2qq-cai`
2. Test transfer creation via UI
3. Monitor console for address book calls (should be minimal)
4. Verify currency symbols display correctly across all tokens

---

## Implementation Checklist

- [ ] Verify worktree isolation
- [ ] Fix CreateRequestResult type (backend)
- [ ] Fix currency detection (frontend)
- [ ] Fix address book infinite loop (frontend)
- [ ] Build and deploy backend
- [ ] Sync declarations
- [ ] Build and deploy frontend
- [ ] Test via dfx
- [ ] Test via UI
- [ ] Create PR
- [ ] Iterate on review feedback
