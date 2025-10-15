# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to salvage PR #45 by fixing all issues identified in the code reviews and ensuring the transfer button works reliably.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "✅ Working in main repo (updating existing PR #45)"
else
    echo "❌ Wrong directory. Must be in main repo for PR updates."
    exit 1
fi

# Checkout the existing PR branch
git fetch origin
git checkout feature/fix-transfer-flow
echo "✅ On feature/fix-transfer-flow branch for PR #45"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify PR branch** - Must be on `feature/fix-transfer-flow`
2. **Fix critical bugs** - Follow plan sections below
3. **Build & test**:
   ```bash
   cd daopad_frontend
   npm install
   npm run build
   cd ..
   ./deploy.sh --network ic --frontend-only
   ```
4. **Update PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "fix: Address PR #45 review issues - remove fake IDs, secure Redux store, cleanup logging"
   git push origin feature/fix-transfer-flow
   gh pr comment 45 --body "Fixed all critical issues from code review:
   - Removed fake asset ID generation
   - Secured Redux store exposure
   - Made debug logging conditional
   - Extracted shared utilities
   - Fixed floating point precision
   "
   ```
5. **Test on mainnet**:
   - Visit https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/
   - Navigate to token treasury
   - Click transfer button
   - Verify no errors in console
   - IF errors: Fix, commit, push, continue
   - IF success: Report completion

## CRITICAL RULES
- ❌ NO questions ("should I?", "want me to?")
- ❌ NO new features - ONLY fix existing code
- ✅ Test every change on mainnet
- ✅ Update PR comments with progress

**Branch:** `feature/fix-transfer-flow`
**PR:** #45
**Mainnet URL:** https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/

---

# Implementation Plan

## 🚨 CRITICAL BUG #1: Remove Fake Asset ID Generation

### Current State (BROKEN)
`daopad_frontend/src/features/orbit/orbitSelectors.js:93-96`
```javascript
// DANGEROUS - Creates invalid UUIDs!
const assetId = balanceData.asset_id ||
               balanceData.metadata_id ||
               account.metadata?.asset_id ||
               `asset-${account.id}`; // ❌ FAKE ID - WILL FAIL UUID VALIDATION!
```

### Fix (PSEUDOCODE)
```javascript
// orbitSelectors.js:91-105
// Strategy: Only use REAL asset IDs, never generate fake ones
const assetId = balanceData.asset_id ||
               balanceData.metadata_id ||
               account.metadata?.asset_id;

if (!assetId) {
  // Log error but don't crash selector
  console.error('[orbitSelector] No valid asset ID for account:', account.id);
  // Return empty assets array - will trigger proper UI error
  assetsWithBalance = [];
} else {
  assetsWithBalance = [{
    id: assetId, // ONLY real UUIDs
    symbol: balanceData.symbol || tokenSymbol || 'TOKEN',
    decimals: balanceData.decimals || 8,
    balance: balanceData.balance,
    blockchain: balanceData.blockchain || 'InternetComputer'
  }];
}
```

## 🚨 CRITICAL BUG #2: Secure Redux Store Exposure

### Current State (INSECURE)
`daopad_frontend/src/main.jsx:14-17`
```javascript
// EXPOSES ENTIRE APP STATE TO ANY SCRIPT!
if (import.meta.env.VITE_DFX_NETWORK === 'ic') {
  window.__REDUX_STORE__ = store;
}
```

### Fix (PSEUDOCODE)
```javascript
// main.jsx:14-17
// Only expose in development or with explicit debug flag
if (import.meta.env.DEV || localStorage.getItem('DEBUG_MODE') === 'true') {
  // Make store read-only to prevent manipulation
  window.__DEBUG__ = {
    getState: () => store.getState(),
    testTransferFlow: () => import('./utils/mainnetTesting').then(m => m.testTransferFlow()),
    enableDebug: () => localStorage.setItem('DEBUG_MODE', 'true'),
    disableDebug: () => localStorage.removeItem('DEBUG_MODE')
  };
  console.log('🧪 Debug mode available. Use window.__DEBUG__.enableDebug() to activate.');
} else {
  // Production: No exposure at all
  console.log('Production mode. Debug tools disabled for security.');
}
```

## 🚨 CRITICAL BUG #3: Remove/Conditionalize Debug Logging

### Current State (PERFORMANCE ISSUE)
`daopad_frontend/src/features/orbit/orbitSelectors.js:56-62,116`
```javascript
// Debug logging - remove after fixing  <-- BUT IT'S STILL HERE!
console.log('[orbitSelector] Processing account:', {...});
console.log('[orbitSelector] Constructed assets:', assetsWithBalance);
```

### Fix (PSEUDOCODE)
```javascript
// orbitSelectors.js:56-62
// DELETE these lines entirely OR make conditional:
const DEBUG_SELECTORS = import.meta.env.DEV && localStorage.getItem('DEBUG_SELECTORS');

if (DEBUG_SELECTORS) {
  console.log('[orbitSelector] Processing account:', {
    accountId: account.id,
    hasBalanceData: !!balanceData
  });
}

// orbitSelectors.js:116
// DELETE this line or make conditional
if (DEBUG_SELECTORS) {
  console.log('[orbitSelector] Assets:', assetsWithBalance.length);
}
```

## 🔧 CODE QUALITY #1: Extract Shared Utilities

### Create New File
`daopad_frontend/src/utils/logging.js`
```javascript
/**
 * Safely stringify objects containing BigInt values
 * @param {any} obj - Object to stringify
 * @param {number} space - Indentation spacing
 * @returns {string} JSON string with BigInts converted to strings
 */
export const safeStringify = (obj, space = 2) => {
  return JSON.stringify(
    obj,
    (key, value) => typeof value === 'bigint' ? value.toString() + 'n' : value,
    space
  );
};

/**
 * Conditional debug logging
 * @param {string} group - Console group name
 * @param {Function} logFn - Function containing console.log statements
 */
export const debugLog = (group, logFn) => {
  if (import.meta.env.DEV || localStorage.getItem('DEBUG_MODE')) {
    console.group(group);
    logFn();
    console.groupEnd();
  }
};
```

### Update Files to Use Shared Utilities
`daopad_frontend/src/components/tables/AccountsTable.jsx`
```javascript
// Line 1: Add import
import { safeStringify, debugLog } from '@/utils/logging';

// Lines 71-80: Remove duplicate safeStringify, use debugLog
const handleTransfer = (account) => {
  debugLog('🔍 Transfer Button Clicked', () => {
    console.log('Account data:', safeStringify(account));
  });

  // Rest of validation logic...
};
```

`daopad_frontend/src/components/orbit/TransferRequestDialog.jsx`
```javascript
// Line 1: Add import
import { safeStringify, debugLog } from '@/utils/logging';

// Lines 82-95: Remove duplicate, use shared utility
const handleSubmit = async (data) => {
  debugLog('🚀 Transfer Proposal Submission', () => {
    console.log('Form data:', safeStringify(data));
    console.log('Account:', safeStringify(account));
    console.log('Asset:', safeStringify(asset));
    console.log('Token ID:', tokenId);
    console.log('User voting power:', votingPower);
  });

  // Rest of submission logic...
};
```

## 🔧 CODE QUALITY #2: Fix Floating Point Precision

### Current State (PRECISION LOSS)
`daopad_frontend/src/components/orbit/TransferRequestDialog.jsx:118-120`
```javascript
// Can lose precision with floating point math
const amountInSmallest = BigInt(
  Math.floor(parseFloat(data.amount) * Math.pow(10, asset.decimals))
);
```

### Fix (PSEUDOCODE)
```javascript
// TransferRequestDialog.jsx:118-130
// Use string-based decimal arithmetic to avoid floating point errors
const convertToBigInt = (amountStr, decimals) => {
  // Ensure decimals is valid
  const dec = decimals ?? 8;

  // Split on decimal point
  const [integer = '0', decimal = ''] = amountStr.split('.');

  // Pad or truncate decimal part
  const paddedDecimal = decimal.padEnd(dec, '0').slice(0, dec);

  // Combine and convert to BigInt
  return BigInt(integer + paddedDecimal);
};

const amountInSmallest = convertToBigInt(data.amount, asset.decimals);
console.log('💰 Converting:', data.amount, '→', amountInSmallest.toString());
```

## 🔧 CODE QUALITY #3: Add UUID Validation Utility

### Create New File
`daopad_frontend/src/utils/validation.js`
```javascript
/**
 * UUID v4 validation regex
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate if string is a valid UUID v4
 * @param {string} str - String to validate
 * @returns {boolean} True if valid UUID
 */
export const isValidUUID = (str) => {
  return typeof str === 'string' && UUID_REGEX.test(str);
};

/**
 * Validate multiple UUIDs and throw descriptive error
 * @param {Object} uuids - Object with field names as keys and UUIDs as values
 * @throws {Error} If any UUID is invalid
 */
export const validateUUIDs = (uuids) => {
  const invalid = [];

  for (const [field, uuid] of Object.entries(uuids)) {
    if (!isValidUUID(uuid)) {
      invalid.push(`${field}: '${uuid}'`);
    }
  }

  if (invalid.length > 0) {
    throw new Error(`Invalid UUID format for: ${invalid.join(', ')}`);
  }
};
```

### Update TransferRequestDialog
`daopad_frontend/src/components/orbit/TransferRequestDialog.jsx`
```javascript
// Line 1: Add import
import { validateUUIDs } from '@/utils/validation';

// Lines 138-146: Replace inline validation
// Validate UUIDs before sending
try {
  validateUUIDs({
    'account ID': transferDetails.from_account_id,
    'asset ID': transferDetails.from_asset_id
  });
  console.log('✅ UUID validation passed');
} catch (error) {
  throw new Error(error.message);
}
```

## 🧪 Testing Requirements

### Manual Testing on Mainnet
1. **Test Transfer Button Click**
   ```bash
   # Open browser console
   # Navigate to token treasury
   # Click transfer button on account
   # EXPECTED: Dialog opens, no errors in console
   # NO fake asset IDs like "asset-abc123..."
   ```

2. **Test Redux Store Security**
   ```javascript
   // In browser console
   window.__REDUX_STORE__  // Should be undefined in production
   window.__DEBUG__        // Should show debug tools only if enabled
   ```

3. **Test Amount Conversion**
   ```javascript
   // Test decimal precision
   // Enter: 0.1 tokens with 8 decimals
   // Expected: 10000000 (not 9999999)
   ```

### Backend Verification
```bash
# Verify backend still accepts our requests
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_orbit_stations

# Test a real transfer proposal creation
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai create_treasury_transfer_proposal '(
  principal "ysy5f-2qaaa-aaaap-qkmmq-cai",
  record {
    from_account_id = "547c35cf-0ee9-413d-a425-478ef5e71559";
    from_asset_id = "43e1f1c3-c75e-4f67-86fb-acb3e695a24d";
    to = "rnzod-rcvnl-tqjya-nw3wi-2xszd-3v5hn-xzfkp-q7dc4-ramno-gslqt-cqe";
    amount = 100000000;
    title = "Test Transfer";
    summary = "Testing transfer flow";
    description = "Automated test";
  }
)'
```

## 📋 Validation Checklist

- [ ] No fake asset IDs generated (no `asset-${account.id}` pattern)
- [ ] Redux store not exposed in production
- [ ] Debug logging only in development
- [ ] Shared utilities extracted (no duplication)
- [ ] Floating point precision fixed
- [ ] UUID validation working
- [ ] Transfer button opens dialog
- [ ] Transfer submission succeeds
- [ ] No console errors on mainnet
- [ ] PR updated with fixes

## Success Criteria

The PR is ready when:
1. ✅ All fake ID generation removed
2. ✅ Redux store secured
3. ✅ Debug logging conditional
4. ✅ Code duplication eliminated
5. ✅ Mainnet testing passes
6. ✅ PR comment posted with fix summary

## Final Response Template

```
✅ PR #45 Successfully Salvaged

Fixed all critical issues from code review:
- Removed fake asset ID generation that would fail UUID validation
- Secured Redux store exposure (now debug-only with read-only access)
- Made selector debug logging conditional
- Extracted shared utilities (safeStringify, debugLog, UUID validation)
- Fixed floating point precision in amount conversion
- Tested on mainnet: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/

Transfer button now works reliably without generating invalid data.
Ready for re-review and merge.
```

Then STOP. Do not implement.