# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-fix-transfer-flow/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-fix-transfer-flow/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Test on mainnet**:
   - Deploy backend: `./deploy.sh --network ic --backend-only`
   - Deploy frontend: `./deploy.sh --network ic --frontend-only`
   - Test transfer button at: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
   - Verify no console errors
   - Verify button actually creates proposal (check backend logs)
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "fix: Transfer button flow with mainnet testing framework"
   git push -u origin feature/fix-transfer-flow
   gh pr create --title "Fix: Transfer Button Flow with Mainnet Testing" --body "Implements FIX_TRANSFER_BUTTON_COMPREHENSIVE.md"
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
- ✅ Test on ACTUAL mainnet before creating PR

**Branch:** `feature/fix-transfer-flow`
**Worktree:** `/home/theseus/alexandria/daopad-fix-transfer-flow/src/daopad`

---

# Implementation Plan: Fix Transfer Button & Add Mainnet Testing

## Problem Analysis

### What PR #42 Actually Fixed
- ✅ Toast API migration from shadcn to sonner
- ✅ Stopped React errors on console

### What PR #42 Did NOT Fix
- ❌ The transfer button still breaks the app
- ❌ No way to test if it actually works before asking user
- ❌ Data flow issues between frontend/backend
- ❌ Missing proper error handling and logging

### Root Causes

#### 1. **Data Shape Mismatch**
```javascript
// AccountsTable.jsx:74-94
const asset = account.assets && account.assets.length > 0 ? account.assets[0] : null;
const assetToUse = asset || {
  id: account.assetId || '',  // ❌ Fallback to empty string
  symbol: tokenSymbol || 'TOKEN',
  decimals: account.decimals || 8
};
```

**Problem**: When `account.assets` is undefined/empty, `assetToUse.id` becomes `''` (empty string), but backend expects UUID format.

#### 2. **Silent Failures**
- No console logging in TransferRequestDialog
- Toast errors don't show backend's actual error message
- No way to debug what data is being sent to backend

#### 3. **No Testing Framework**
- Can't test transfer flow without manually clicking on mainnet
- No validation that account/asset data is correct before opening dialog
- No way to verify backend receives correct data

## Solution: Three-Phase Fix

### Phase 1: Add Comprehensive Logging & Error Handling
**Goal**: Understand exactly what's breaking

#### File: `daopad_frontend/src/components/tables/AccountsTable.jsx`
```javascript
// BEFORE (line 71-95)
const handleTransfer = (account) => {
  const asset = account.assets && account.assets.length > 0 ? account.assets[0] : null;
  const assetToUse = asset || { /* fallback */ };

  if (!assetToUse.id) {
    toast.error('Missing Asset Information', { /* ... */ });
    return;
  }

  setTransferDialog({ open: true, account, asset: assetToUse });
};

// AFTER - Add comprehensive logging and validation
const handleTransfer = (account) => {
  console.group('🔍 Transfer Button Clicked');
  console.log('Account data:', JSON.stringify(account, null, 2));

  // Validate account structure
  if (!account.id) {
    console.error('❌ Account missing ID');
    toast.error('Invalid Account', {
      description: 'Account data is malformed. Please refresh the page.'
    });
    console.groupEnd();
    return;
  }

  // Get assets from account
  const assets = account.assets || [];
  console.log(`Found ${assets.length} assets on account`);

  if (assets.length === 0) {
    console.error('❌ No assets found on account');
    toast.error('No Assets Available', {
      description: 'This account has no assets to transfer. Please add assets first.'
    });
    console.groupEnd();
    return;
  }

  // Use first asset (could be enhanced to show asset picker)
  const asset = assets[0];
  console.log('Selected asset:', JSON.stringify(asset, null, 2));

  // Validate asset has required fields
  if (!asset.id || !asset.symbol) {
    console.error('❌ Asset missing required fields (id or symbol)');
    toast.error('Invalid Asset Data', {
      description: `Asset is missing required information. ID: ${asset.id || 'missing'}, Symbol: ${asset.symbol || 'missing'}`
    });
    console.groupEnd();
    return;
  }

  console.log('✅ Validation passed, opening transfer dialog');
  console.groupEnd();

  setTransferDialog({
    open: true,
    account,
    asset
  });
};
```

#### File: `daopad_frontend/src/components/orbit/TransferRequestDialog.jsx`
```javascript
// BEFORE (line 82-139)
const handleSubmit = async (data) => {
  setError('');

  if (votingPower < MIN_VOTING_POWER_FOR_PROPOSALS) {
    toast.error(/* ... */);
    return;
  }

  setIsSubmitting(true);

  try {
    const backend = new DAOPadBackendService(identity);
    const amountInSmallest = BigInt(/*...*/);
    const transferDetails = { /* ... */ };
    const result = await backend.createTreasuryTransferProposal(/*...*/);

    if (result.success) {
      toast.success(/* ... */);
      onOpenChange(false);
      if (onSuccess) onSuccess();
      form.reset();
    } else {
      throw new Error(result.error || 'Failed to create proposal');
    }
  } catch (err) {
    console.error('Error creating transfer proposal:', err);
    setError(err.message || 'An unexpected error occurred');
  } finally {
    setIsSubmitting(false);
  }
};

// AFTER - Add detailed logging at every step
const handleSubmit = async (data) => {
  console.group('🚀 Transfer Proposal Submission');
  console.log('Form data:', JSON.stringify(data, null, 2));
  console.log('Account:', JSON.stringify(account, null, 2));
  console.log('Asset:', JSON.stringify(asset, null, 2));
  console.log('Token ID:', tokenId);
  console.log('User voting power:', votingPower);

  setError('');

  // Voting power check
  if (votingPower < MIN_VOTING_POWER_FOR_PROPOSALS) {
    console.error(`❌ Insufficient VP: ${votingPower} < ${MIN_VOTING_POWER_FOR_PROPOSALS}`);
    toast.error('Insufficient Voting Power', {
      description: `You need at least ${MIN_VOTING_POWER_FOR_PROPOSALS.toLocaleString()} VP to create transfer proposals. Current: ${votingPower.toLocaleString()} VP`
    });
    console.groupEnd();
    return;
  }

  setIsSubmitting(true);

  try {
    console.log('📡 Creating backend service...');
    const backend = new DAOPadBackendService(identity);

    // Convert amount
    console.log('💰 Converting amount:', data.amount, 'with decimals:', asset.decimals);
    const amountInSmallest = BigInt(
      Math.floor(parseFloat(data.amount) * Math.pow(10, asset.decimals))
    );
    console.log('Amount in smallest units:', amountInSmallest.toString());

    // Build transfer details
    const transferDetails = {
      from_account_id: account.id,
      from_asset_id: asset.id,
      to: data.to_address,
      amount: amountInSmallest,
      memo: data.memo || null,
      title: data.title,
      description: data.description
    };

    console.log('📦 Transfer details:', JSON.stringify({
      ...transferDetails,
      amount: amountInSmallest.toString() // BigInt can't stringify
    }, null, 2));

    // Validate UUIDs before sending
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(transferDetails.from_account_id)) {
      throw new Error(`Invalid account ID format: ${transferDetails.from_account_id}`);
    }
    if (!uuidRegex.test(transferDetails.from_asset_id)) {
      throw new Error(`Invalid asset ID format: ${transferDetails.from_asset_id}`);
    }
    console.log('✅ UUID validation passed');

    // Make backend call
    console.log('🌐 Calling backend.createTreasuryTransferProposal...');
    const result = await backend.createTreasuryTransferProposal(
      Principal.fromText(tokenId),
      transferDetails
    );

    console.log('📥 Backend response:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ Proposal created successfully');
      toast.success('Transfer Proposal Created', {
        description: 'Community can now vote on this transfer request'
      });
      onOpenChange(false);
      if (onSuccess) onSuccess();
      form.reset();
    } else {
      throw new Error(result.error || 'Failed to create proposal');
    }
  } catch (err) {
    console.error('❌ Error creating transfer proposal:', err);
    console.error('Error stack:', err.stack);

    // Extract meaningful error message
    let errorMessage = 'An unexpected error occurred';
    if (err.message) {
      errorMessage = err.message;
    }

    setError(errorMessage);
    toast.error('Transfer Proposal Failed', {
      description: errorMessage
    });
  } finally {
    setIsSubmitting(false);
    console.groupEnd();
  }
};
```

### Phase 2: Fix Data Flow Issues
**Goal**: Ensure correct data reaches the backend

#### File: `daopad_frontend/src/features/orbit/orbitSelectors.js`
Verify `selectFormattedAccounts` correctly populates assets:

```javascript
// Check if assets array is properly populated with id, symbol, decimals
// If not, fix the selector to ensure assets[0] has these fields
```

#### File: Backend validation (optional)
The backend already has strong validation in `treasury.rs:31-71`. We just need frontend to respect it.

### Phase 3: Create Mainnet Testing Framework
**Goal**: Test before PR, not after

#### File: `daopad_frontend/src/utils/mainnetTesting.js` (NEW)
```javascript
/**
 * Mainnet testing utilities
 *
 * Usage in browser console:
 * ```javascript
 * window.testTransferFlow()
 * ```
 */

export const testTransferFlow = async () => {
  console.log('🧪 Starting Transfer Flow Test');

  // Check if user is authenticated
  const identity = window.__IDENTITY__;
  if (!identity) {
    console.error('❌ Not authenticated');
    return { success: false, error: 'Not authenticated' };
  }

  console.log('✅ User authenticated');

  // Get current token from Redux store
  const state = window.__REDUX_STORE__?.getState();
  const currentToken = state?.tokens?.currentToken;

  if (!currentToken) {
    console.error('❌ No token selected');
    return { success: false, error: 'No token selected' };
  }

  console.log('✅ Token:', currentToken);

  // Get accounts from Redux
  const accounts = state?.orbit?.accounts?.data?.[currentToken?.stationId];

  if (!accounts || accounts.length === 0) {
    console.error('❌ No accounts found');
    return { success: false, error: 'No accounts found' };
  }

  console.log(`✅ Found ${accounts.length} accounts`);

  // Check first account has assets
  const firstAccount = accounts[0];
  console.log('First account:', firstAccount);

  if (!firstAccount.assets || firstAccount.assets.length === 0) {
    console.error('❌ First account has no assets');
    return { success: false, error: 'First account has no assets' };
  }

  console.log(`✅ First account has ${firstAccount.assets.length} assets`);

  // Validate asset structure
  const firstAsset = firstAccount.assets[0];
  const requiredFields = ['id', 'symbol', 'decimals'];
  const missingFields = requiredFields.filter(field => !firstAsset[field]);

  if (missingFields.length > 0) {
    console.error('❌ Asset missing fields:', missingFields);
    return { success: false, error: `Asset missing: ${missingFields.join(', ')}` };
  }

  console.log('✅ Asset has all required fields');

  // Check voting power
  const votingPower = state?.user?.votingPower?.[currentToken.id] || 0;
  console.log('User voting power:', votingPower);

  if (votingPower < 10000) {
    console.warn('⚠️ Low voting power:', votingPower, '(need 10,000 to create proposals)');
  } else {
    console.log('✅ Sufficient voting power');
  }

  return {
    success: true,
    data: {
      token: currentToken,
      accounts: accounts.length,
      firstAccount: {
        id: firstAccount.id,
        name: firstAccount.name,
        assets: firstAccount.assets.length
      },
      firstAsset: {
        id: firstAsset.id,
        symbol: firstAsset.symbol,
        decimals: firstAsset.decimals
      },
      votingPower
    }
  };
};

// Expose to window for console testing
if (typeof window !== 'undefined') {
  window.testTransferFlow = testTransferFlow;
}
```

#### File: `daopad_frontend/src/App.jsx` (or wherever Redux store is created)
```javascript
// Add these lines to expose store for testing
if (import.meta.env.VITE_DFX_NETWORK === 'ic') {
  window.__REDUX_STORE__ = store;
  console.log('🧪 Testing utilities available: window.testTransferFlow()');
}
```

## Testing Protocol

### Before Creating PR:

1. **Deploy backend**:
   ```bash
   cd /home/theseus/alexandria/daopad-fix-transfer-flow/src/daopad
   cargo build --target wasm32-unknown-unknown --release -p daopad_backend
   candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
   ./deploy.sh --network ic --backend-only
   cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
   ```

2. **Deploy frontend**:
   ```bash
   npm run build
   ./deploy.sh --network ic --frontend-only
   ```

3. **Test on mainnet**:
   - Open: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
   - Open browser console
   - Run: `window.testTransferFlow()`
   - Expected output:
     ```javascript
     {
       success: true,
       data: {
         token: { /* ... */ },
         accounts: 2,
         firstAccount: { id: "uuid", name: "...", assets: 1 },
         firstAsset: { id: "uuid", symbol: "ICP", decimals: 8 },
         votingPower: 15000
       }
     }
     ```

4. **Click transfer button**:
   - Watch console for `🔍 Transfer Button Clicked` log group
   - Should see validation pass
   - Dialog should open

5. **Fill out form and submit**:
   - Watch console for `🚀 Transfer Proposal Submission` log group
   - Should see all data validated
   - Should see backend call succeed

6. **Verify proposal created**:
   - Check backend canister logs
   - Check if proposal appears in UI

### If Test Fails:
- Read console logs carefully
- Identify which validation step failed
- Fix the issue
- Redeploy and test again
- **DO NOT CREATE PR UNTIL ALL TESTS PASS**

## Expected File Changes

### Modified Files:
1. `daopad_frontend/src/components/tables/AccountsTable.jsx` - Add logging & validation
2. `daopad_frontend/src/components/orbit/TransferRequestDialog.jsx` - Add comprehensive logging
3. `daopad_frontend/src/App.jsx` - Expose store for testing
4. `daopad_frontend/src/features/orbit/orbitSelectors.js` - Fix asset data if needed

### New Files:
1. `daopad_frontend/src/utils/mainnetTesting.js` - Testing utilities

### Deployment Files:
1. `daopad_backend/daopad_backend.did` - May update if backend changes
2. `daopad_frontend/src/declarations/` - Sync after backend changes

## Success Criteria

- [x] Console logs show exact data flow through transfer button click
- [x] Transfer dialog validates all data before opening
- [x] Transfer proposal submission logs every step
- [x] `window.testTransferFlow()` runs successfully on mainnet
- [x] Clicking transfer button shows no console errors
- [x] Submitting transfer form creates proposal successfully
- [x] All tests pass on ACTUAL mainnet (not localhost)
- [x] PR created with test evidence

## Rollback Plan

If this breaks mainnet:
1. Revert PR immediately
2. Frontend changes are safe (just logging)
3. Backend changes are minimal (none expected)
4. Worst case: extra console logs (harmless)

## Implementation Notes

- **Do NOT remove any existing functionality**
- **Do NOT change backend logic** (it's correct)
- **DO add logging everywhere**
- **DO validate data before operations**
- **DO test on mainnet before PR**
- **DO capture test evidence in PR description**

## PR Description Template

```markdown
## Summary
Fixes transfer button by adding comprehensive logging, validation, and mainnet testing framework.

## Problem
- Transfer button broke the app with silent failures
- No way to debug data flow issues
- No testing framework for mainnet

## Solution
- Added comprehensive logging at every step
- Added data validation before operations
- Created `window.testTransferFlow()` for mainnet testing
- All changes tested on actual mainnet before PR

## Testing Evidence

### Pre-deployment test:
```
✅ window.testTransferFlow() passed
✅ All accounts have valid assets
✅ Asset IDs are valid UUIDs
```

### Transfer button click:
```
🔍 Transfer Button Clicked
  Account data: { id: "uuid", name: "Treasury #1", ... }
  Found 1 assets on account
  Selected asset: { id: "uuid", symbol: "ICP", decimals: 8 }
  ✅ Validation passed, opening transfer dialog
```

### Transfer submission:
```
🚀 Transfer Proposal Submission
  Form data: { title: "Test", amount: "1.0", ... }
  ✅ UUID validation passed
  🌐 Calling backend...
  ✅ Proposal created successfully
```

## Files Changed
- Added logging: `AccountsTable.jsx`, `TransferRequestDialog.jsx`
- New testing utils: `mainnetTesting.js`
- Exposed store: `App.jsx`

## Backward Compatibility
- All changes are additive (logging only)
- No breaking changes to existing functionality
- Safe to merge and deploy

## Follow-up Work
- [ ] Consider adding asset picker (currently uses first asset)
- [ ] Add integration tests for transfer flow
- [ ] Document testing utilities in README
```
