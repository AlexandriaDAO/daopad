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
2. **Implement fixes** - Follow plan sections below
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
   git commit -m "fix: Transfer proposal decode error and asset selection"
   git push -u origin feature/fix-transfer-decode-and-asset-selection
   gh pr create --title "Fix: Transfer Proposal Decode Error and Asset Selection" --body "Implements FIX_TRANSFER_DECODE_AND_ASSET_SELECTION.md"
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

# Fix Transfer Proposal Decode Error and Asset Selection

## Executive Summary

Two critical bugs prevent treasury transfers from working:

1. **Decode Error**: Backend's `ErrorInfo` type doesn't match Orbit's `Error` type
   - Orbit returns `message: opt text` and `details: opt vec record { text; text }`
   - Backend expects `message: String` (required) with no `details` field
   - When Orbit returns error with null message or includes details, decode fails

2. **Asset Selection Bug**: Frontend picks first asset without knowing which asset is displayed
   - Account may have multiple assets (ICP, DAO token, etc.)
   - Frontend uses `assets[0]` arbitrarily
   - Each asset has different decimals, symbol, and balance
   - Amount conversion uses wrong asset's decimals

## Current State Analysis

### File Tree
```
daopad_backend/src/
├── api/
│   ├── orbit_transfers.rs     # ❌ ErrorInfo type mismatch
│   └── mod.rs                  # Exports CreateRequestResult
├── proposals/
│   └── treasury.rs             # Uses CreateRequestResult
└── ...

daopad_frontend/src/
├── components/
│   ├── orbit/
│   │   └── TransferRequestDialog.jsx  # ✅ Has asset prop with decimals
│   └── tables/
│       └── AccountsTable.jsx   # ❌ Picks assets[0] arbitrarily
└── ...
```

### Existing Implementations

#### Backend: ErrorInfo Type (orbit_transfers.rs:18-21)
```rust
#[derive(CandidType, Deserialize)]
pub struct ErrorInfo {
    pub code: String,
    pub message: String,  // ❌ NOT optional, should be Option<String>
    // ❌ MISSING: details field
}
```

#### Orbit's Actual Error Type (from spec.did)
```candid
type Error = record {
  code : text;
  message : opt text;     // ✅ Optional
  details : opt vec record { text; text };  // ✅ Has details
};
```

#### Frontend: Asset Selection (AccountsTable.jsx:102)
```javascript
// Use first asset (could be enhanced to show asset picker)
const asset = assets[0];  // ❌ Arbitrary selection
```

#### Frontend: Asset Usage (AccountsTable.jsx:109-114)
```javascript
const normalizedAsset = {
  id: asset.id || asset.asset_id,
  symbol: asset.symbol || tokenSymbol || 'TOKEN',  // ✅ Uses asset symbol
  decimals: asset.decimals || 8,                    // ✅ Uses asset decimals
  balance: asset.balance
};
```

### Test Results

#### Successful create_request Call (via dfx)
```bash
$ dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai create_request '(...)'
# Returns:
variant {
  Ok = record {
    privileges = record { ... };
    request = record {
      id = "03b32e9e-b620-4a61-8ac6-d0779531555a";
      operation = variant {
        Transfer = record {
          from_asset = record {
            id = "7802cbab-221d-4e49-b764-a695ea6def1a";
            decimals = 8 : nat32;
            symbol = "ICP";
            ...
          };
          ...
        }
      };
      ...
    };
    additional_info = record { ... };
  }
}
```

#### Failed Frontend Call
```
Error: IcCallFailed {
  code: 5,
  message: "failed to decode canister response as (daopad_backend::api::orbit_transfers::CreateRequestResult,): Fail to decode argument 0"
}
```

### Dependencies and Constraints

1. **Type Safety**: ErrorInfo must exactly match Orbit's Error type
2. **Backwards Compatibility**: Existing error handling code must continue to work
3. **Asset Context**: Frontend needs to know which asset balance is being displayed
4. **Candid Interface**: .did file must be regenerated after Rust changes

## Implementation Plan

### Backend Changes

#### File: `daopad_backend/src/api/orbit_transfers.rs`

**MODIFY: Lines 17-21 - Update ErrorInfo to match Orbit's Error type**
```rust
// BEFORE:
#[derive(CandidType, Deserialize)]
pub struct ErrorInfo {
    pub code: String,
    pub message: String,
}

// AFTER:
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ErrorInfo {
    pub code: String,
    pub message: Option<String>,  // ✅ Now optional to match Orbit
    pub details: Option<Vec<(String, String)>>,  // ✅ Add details field
}
```

**RATIONALE**:
- Exact match with Orbit's `Error` type from spec.did
- Prevents decode failures when Orbit returns null message or includes details
- Clone + Debug for better error handling

### Frontend Changes

#### File: `daopad_frontend/src/components/tables/AccountsTable.jsx`

**CONTEXT**: Currently the frontend:
1. Fetches accounts with balances (line 47-56)
2. Displays formatted balance per account (line 233)
3. On Transfer click, picks `assets[0]` (line 102)
4. Passes that asset to TransferRequestDialog (line 287)

**PROBLEM**: The displayed balance might not be for `assets[0]`. Example:
- Account has [ICP asset with 9.7 ICP, ALEX asset with 0 ALEX]
- UI shows "9.7 ICP" (from ICP asset)
- Transfer button picks assets[0] which could be ALEX
- User thinks they're transferring ICP but dialog shows ALEX decimals/symbol

**SOLUTION**: Match the asset to the displayed balance

**MODIFY: Lines 86-134 - Match displayed asset with balance**
```javascript
// BEFORE:
const handleTransfer = (account) => {
  // ... validation ...

  const assets = account.assets || [];

  if (assets.length === 0) {
    // ... error ...
    return;
  }

  // Use first asset (could be enhanced to show asset picker)
  const asset = assets[0];  // ❌ WRONG: arbitrary

  // ... rest of function ...
};

// AFTER:
const handleTransfer = (account) => {
  debugLog('🔍 Transfer Button Clicked', () => {
    console.log('Account data:', safeStringify(account));
  });

  // Validate account structure
  if (!account.id) {
    console.error('❌ Account missing ID');
    toast.error('Invalid Account', {
      description: 'Account data is malformed. Please refresh the page.'
    });
    return;
  }

  // Get assets from account
  const assets = account.assets || [];

  debugLog('Asset Validation', () => {
    console.log(`Found ${assets.length} assets on account`);
  });

  if (assets.length === 0) {
    console.error('❌ No assets found on account');
    toast.error('No Assets Available', {
      description: 'This account has no assets to transfer. Please add assets first.'
    });
    return;
  }

  // ✅ NEW: Find the asset with a non-zero balance
  // Prefer non-zero balance, fallback to first asset
  const assetWithBalance = assets.find(a => {
    const balance = a.balance?.balance || a.balance || 0n;
    return balance > 0n;
  });

  const asset = assetWithBalance || assets[0];

  debugLog('Asset Selection', () => {
    console.log('Selected asset:', safeStringify(asset));
    console.log('Reason:', assetWithBalance ? 'Has balance' : 'First available');
  });

  // Normalize asset structure: Orbit returns asset_id, we need id
  const normalizedAsset = {
    id: asset.id || asset.asset_id,
    symbol: asset.symbol || tokenSymbol || 'TOKEN',
    decimals: asset.decimals || 8,
    balance: asset.balance
  };

  // Validate asset has required ID
  if (!normalizedAsset.id) {
    console.error('❌ Asset missing ID:', asset);
    toast.error('Invalid Asset Data', {
      description: 'Asset is missing required ID. Please refresh the account data.'
    });
    return;
  }

  debugLog('Transfer Dialog Opening', () => {
    console.log('✅ Normalized asset:', safeStringify(normalizedAsset));
    console.log('✅ Validation passed, opening transfer dialog');
  });

  setTransferDialog({
    open: true,
    account,
    asset: normalizedAsset
  });
};
```

**RATIONALE**:
- Picks asset with non-zero balance (most likely what user wants to transfer)
- Falls back to first asset if all have zero balance
- Maintains backwards compatibility with single-asset accounts
- Adds clear logging for debugging
- Future enhancement: could add asset picker UI for multi-asset accounts

#### Alternative Enhancement (Optional - Document Only)

If we want to be even more precise, we could:
1. Display asset symbol next to each account balance in the table
2. Add an asset picker dropdown in TransferRequestDialog
3. Store the displayed asset context in the table

For now, the "first asset with balance" heuristic is sufficient.

### Testing Requirements

#### Backend Testing

**Test 1: Verify ErrorInfo Structure**
```bash
# Check Candid interface after rebuild
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Should show:
# type ErrorInfo = record {
#   code : text;
#   message : opt text;
#   details : opt vec record { text; text };
# };
grep -A5 "type ErrorInfo" daopad_backend/daopad_backend.did
```

**Test 2: Create Transfer Proposal (End-to-End)**
```bash
# After deploy
export ALEX_TOKEN="ysy5f-2qaaa-aaaap-qkmmq-cai"

# Use daopad identity (has VP)
dfx identity use daopad

# Call backend to create proposal
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai create_treasury_transfer_proposal \
'(
  principal "ysy5f-2qaaa-aaaap-qkmmq-cai",
  record {
    from_account_id = "3f601869-e48e-49a1-92cb-32f55b308a18";
    from_asset_id = "7802cbab-221d-4e49-b764-a695ea6def1a";
    to = "2ljyd-77i5g-ix222-szy7a-ru4cu-ns4j7-kxc2z-oazam-igx3u-uwee6-yqe";
    amount = 100000000 : nat;
    memo = null;
    title = "Test Transfer After Fix";
    description = "Testing decode fix with proper ErrorInfo type";
  }
)'

# Expected: (variant { Ok = 12345 : nat64 })
# NOT: IcCallFailed decode error
```

#### Frontend Testing

**Test 3: Verify Asset Selection**
```javascript
// In browser console after loading treasury page:

// 1. Check account data structure
const accounts = window.__REDUX_STATE__?.orbit?.accounts?.data;
console.log('Accounts:', accounts);

// 2. Find account with multiple assets
const multiAssetAccount = Object.values(accounts || {})
  .flatMap(station => station.accounts || [])
  .find(acc => acc.assets?.length > 1);

if (multiAssetAccount) {
  console.log('Multi-asset account:', multiAssetAccount);
  console.log('Assets:', multiAssetAccount.assets);

  // 3. Check which asset has balance
  multiAssetAccount.assets.forEach((asset, i) => {
    const balance = asset.balance?.balance || asset.balance || 0n;
    console.log(`Asset ${i}: ${asset.symbol}, balance: ${balance}`);
  });
}

// 4. Click Transfer button and verify:
// - Transfer dialog opens with correct asset symbol
// - Amount decimals match the asset
// - Max transferable amount is correct
```

**Test 4: Verify Error Display**
```javascript
// After implementation, test error handling:

// 1. Try to create proposal with insufficient VP
// - Should show readable error message
// - Error object should have optional message field

// 2. Try to create proposal with invalid account ID
// - Should show validation error
// - Should NOT get decode error
```

### Deployment Steps

```bash
# 1. Verify worktree
cd /home/theseus/alexandria/daopad-fix-transfer-decode/src/daopad
REPO_ROOT=$(git rev-parse --show-toplevel)
echo "Working in: $REPO_ROOT"

# 2. Backend changes
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
./deploy.sh --network ic --backend-only

# 3. Sync declarations (CRITICAL)
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# 4. Frontend changes
npm run build
./deploy.sh --network ic --frontend-only

# 5. Verify deployment
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai health_check

# 6. Run Test 2 (create transfer proposal)
# 7. Test frontend at https://daopad.org
```

### Success Criteria

- [ ] Backend build succeeds
- [ ] ErrorInfo type in .did file matches Orbit's Error type
- [ ] Test 2 (create transfer proposal) returns Ok variant, not decode error
- [ ] Frontend shows correct asset symbol in transfer dialog
- [ ] Amount decimals match the selected asset
- [ ] Transfer proposal creation succeeds in production
- [ ] Error messages display correctly (with optional fields)

## Risk Assessment

### Low Risk
- Backend ErrorInfo update: Additive change (adding optional fields)
- Frontend asset selection: Heuristic improvement, no breaking changes

### Medium Risk
- Existing error handling code expecting non-optional message
  - **Mitigation**: Option<String> is backwards compatible via `.unwrap_or_default()`

### High Risk
- None identified

## Rollback Plan

If issues occur:
```bash
# 1. Revert backend
git revert HEAD
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
./deploy.sh --network ic --backend-only

# 2. Revert frontend
git checkout HEAD~1 -- daopad_frontend/
npm run build
./deploy.sh --network ic --frontend-only
```

## Future Enhancements

1. **Asset Picker UI**: Add dropdown in TransferRequestDialog for multi-asset accounts
2. **Asset Display**: Show asset symbol next to balance in AccountsTable
3. **Error Details Display**: Show Orbit's error details in frontend toast messages
4. **Balance Refresh**: Auto-refresh balances after transfer proposal creation

---

## Plan Checklist

- [x] Worktree created first
- [x] Orchestrator header embedded at top
- [x] Current state documented with actual code snippets
- [x] Root causes identified with evidence
- [x] Implementation in clear before/after format
- [x] Testing strategy with specific commands
- [x] Deployment steps with verification
- [x] Success criteria defined

