# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-agreement-tab-fix/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-agreement-tab-fix/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes:
     ```bash
     cd daopad_frontend
     npm run build
     cd ..
     ./deploy.sh --network ic --frontend-only
     ```
4. **Manual Testing** (MANDATORY BEFORE PLAYWRIGHT):
   ```bash
   # Test in browser (incognito for anonymous, logged in for regenerate)
   # 1. Open: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/agreement
   # 2. Open DevTools Console
   # 3. Verify:
   #    ✅ No "Unexpected response format" error
   #    ✅ No Candid decode errors
   #    ✅ Either snapshot loads OR shows "No snapshot available" (both OK)
   # 4. Click "Regenerate" (must be logged in)
   # 5. Verify:
   #    ✅ Success message appears
   #    ✅ Agreement document renders
   #    ✅ Console shows success logs
   ```
5. **Test with Playwright** (MANDATORY):
   ```bash
   cd daopad_frontend
   npx playwright test e2e/agreement.spec.ts --project=chromium
   ```
6. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Fix]: Agreement Tab - Candid Variant Case Mismatch

Fix 'ok'/'err' lowercase checks to 'Ok'/'Err' capital case
Resolves 'Unexpected response format' error on load and regenerate"
   git push -u origin feature/agreement-tab-snapshot-fix
   gh pr create --title "[Fix]: Agreement Tab - Candid Variant Case Mismatch" --body "Implements AGREEMENT_TAB_FIX_PLAN.md

## Problem
Agreement tab completely broken:
- Initial load: \"No snapshot available\" (even when snapshot exists)
- Regenerate: \"Failed to regenerate: Unexpected response format\"
- Console error: Always hits else block in variant handling

## Root Cause
**Candid Variant Case Mismatch** in OperatingAgreementTab.tsx:

\`\`\`typescript
// ❌ WRONG (Lines 31, 38, 66, 76)
if ('ok' in result) { ... }
else if ('err' in result) { ... }

// Backend returns (Candid spec):
type Result_12 = variant { Ok : AgreementSnapshot; Err : text };
//                         ^^                      ^^^
//                         Capital case!
\`\`\`

Frontend checks for lowercase \`ok\`/\`err\`, but Candid variants use capital case \`Ok\`/\`Err\`.

## Solution
\`\`\`typescript
// ✅ CORRECT
if ('Ok' in result) { ... }
else if ('Err' in result) { ... }
\`\`\`

## Testing
✅ Manual browser test (logged in user)
✅ Playwright tests with data verifier
✅ Console errors checked
✅ API responses verified
✅ Agreement loads and regenerates successfully

## Impact
- Fixes Agreement tab for ALL users
- Snapshot loading now works
- Regenerate button functional
- No more \"Unexpected response format\" errors"
   ```
7. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view $(gh pr list --head feature/agreement-tab-snapshot-fix --json number -q '.[0].number') --json comments`
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

**Branch:** `feature/agreement-tab-snapshot-fix`
**Worktree:** `/home/theseus/alexandria/daopad-agreement-tab-fix/src/daopad`

---

# Implementation Plan: Agreement Tab Candid Variant Case Fix

## Task Classification
**BUG FIX**: Restore broken behavior → minimal changes (4 lines)

## Problem Statement

The Agreement tab is completely broken with two failure modes:

### Issue 1: Initial Load Fails
**User sees**: "No snapshot available. Click regenerate to create one."
**Reality**: Snapshot EXISTS in backend, but frontend can't parse response

**Console output**:
```javascript
console.error('Unexpected result format:', result);
// result = { Ok: { data: "...", version: 4, ... } }
// But code checks: if ('ok' in result) ← FAILS (lowercase)
```

### Issue 2: Regenerate Fails
**User sees**: "Failed to regenerate: Unexpected response format"
**Reality**: Backend successfully creates snapshot, but frontend can't parse response

**Error flow**:
1. User clicks "Regenerate"
2. Backend returns: `{ Ok: AgreementSnapshot }` (capital O)
3. Frontend checks: `if ('ok' in result)` (lowercase o)
4. Check fails → Hits `else` block at line 84
5. Error: "Unexpected response format"

## Root Cause Analysis

### The Bug (OperatingAgreementTab.tsx)

**Lines 31, 38, 66, 76** - Lowercase variant checks:

```typescript
// LINE 31 ❌ WRONG
if ('ok' in result) {
  const data = JSON.parse(result.ok.data);
  // ...
}
// LINE 38 ❌ WRONG
else if ('err' in result) {
  console.log('No snapshot found:', result.err);
  // ...
}
// LINE 42 - Falls through to generic error
else {
  setError('No snapshot available. Click regenerate to create one.');
}

// Same pattern repeated at lines 66, 76 for regenerate
```

### Candid Variant Type Definition

From `daopad_backend.did`:
```candid
type Result_12 = variant { Ok : AgreementSnapshot; Err : text };
//                         ^^                      ^^^
//                         Capital case!

get_agreement_snapshot : (principal) -> (Result_12) query;
regenerate_agreement_snapshot : (principal, principal) -> (Result_12);
```

### How Candid Encodes Variants

Candid variant types use **capital case** in JavaScript:

```javascript
// Backend returns (Candid encoding):
{ Ok: { data: "...", version: 4, created_at: 123, ... } }
// OR
{ Err: "No snapshot found for token" }

// Frontend checks (WRONG):
if ('ok' in result) { ... }  // ❌ lowercase - never matches
else if ('err' in result) { ... }  // ❌ lowercase - never matches
else { ... }  // ✅ Always hits this - "Unexpected response format"
```

### Verification With DFX

```bash
# Test get_agreement_snapshot
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai \
  get_agreement_snapshot '(principal "ysy5f-2qaaa-aaaap-qkmmq-cai")'

# Output:
variant {
  Ok = record {  # ← Capital O
    data = "{...}"
    version = 4 : nat32;
    created_at = 1761133340949934910 : nat64;
    updated_at = 1761133340949934910 : nat64;
    token_id = principal "ysy5f-2qaaa-aaaap-qkmmq-cai";
    station_id = principal "fec7w-zyaaa-aaaaa-qaffq-cai";
  }
}
```

**Proof**: Candid uses `Ok` (capital O), not `ok` (lowercase).

## Current State

### File Structure:
```
daopad_frontend/src/
├── routes/dao/
│   └── DaoAgreement.tsx              # Route wrapper (passes props)
├── components/operating-agreement/
│   ├── OperatingAgreementTab.tsx     # BUG HERE: Lines 31, 38, 66, 76
│   └── AgreementDocument.tsx         # Renders agreement (no changes needed)
├── e2e/
│   ├── helpers/
│   │   └── data-verifier.ts          # NEW: Mandatory test helper
│   └── agreement.spec.ts             # TO BE CREATED
└── services/backend/
    └── base/BackendServiceBase.ts    # No changes needed
```

### Current Implementation (OperatingAgreementTab.tsx):

**Lines 27-43** - `fetchSnapshot()` method:
```typescript
const result = await actor.get_agreement_snapshot(
  Principal.fromText(tokenId)
);

if ('ok' in result) {  // ❌ LINE 31: BUG - lowercase
  const data = JSON.parse(result.ok.data);  // ❌ LINE 32: lowercase
  setData(data);
  setSnapshotInfo({
    created: new Date(Number(result.ok.created_at) / 1000000),
    version: result.ok.version
  });
} else if ('err' in result) {  // ❌ LINE 38: BUG - lowercase
  console.log('No snapshot found:', result.err);  // ❌ LINE 39: lowercase
  setError('No snapshot available. Click regenerate to create one.');
} else {
  // ✅ LINE 42: Always hits this due to case mismatch
  setError('No snapshot available. Click regenerate to create one.');
}
```

**Lines 61-86** - `regenerateAgreement()` method:
```typescript
const result = await actor.regenerate_agreement_snapshot(
  Principal.fromText(tokenId),
  Principal.fromText(stationId)
);

if ('ok' in result) {  // ❌ LINE 66: BUG - lowercase
  const data = JSON.parse(result.ok.data);  // ❌ LINE 67: lowercase
  setData(data);
  setSnapshotInfo({
    created: new Date(Number(result.ok.created_at) / 1000000),
    version: result.ok.version
  });
  toast.success('Agreement regenerated successfully', {
    description: `Version ${result.ok.version} has been created.`
  });
} else if ('err' in result) {  // ❌ LINE 76: BUG - lowercase
  const errorMsg = result.err || 'Unknown error occurred';  // ❌ LINE 77: lowercase
  console.error('Backend error:', errorMsg);
  setError('Failed to regenerate: ' + errorMsg);
  toast.error('Failed to regenerate', {
    description: errorMsg
  });
} else {
  // ✅ LINE 84: Always hits this due to case mismatch
  console.error('Unexpected result format:', result);
  setError('Failed to regenerate: Unexpected response format');
}
```

## Implementation

### Fix: Update Candid Variant Case Checks

**File**: `daopad_frontend/src/components/operating-agreement/OperatingAgreementTab.tsx` (MODIFY)

**Change 1**: Lines 31-43 (fetchSnapshot method)

```typescript
// BEFORE (Lines 31-42)
if ('ok' in result) {  // ❌
  const data = JSON.parse(result.ok.data);  // ❌
  setData(data);
  setSnapshotInfo({
    created: new Date(Number(result.ok.created_at) / 1000000),  // ❌
    version: result.ok.version  // ❌
  });
} else if ('err' in result) {  // ❌
  console.log('No snapshot found:', result.err);  // ❌
  setError('No snapshot available. Click regenerate to create one.');
} else {
  setError('No snapshot available. Click regenerate to create one.');
}

// AFTER (Lines 31-42)
if ('Ok' in result) {  // ✅ Capital O
  const data = JSON.parse(result.Ok.data);  // ✅ Capital O
  setData(data);
  setSnapshotInfo({
    created: new Date(Number(result.Ok.created_at) / 1000000),  // ✅ Capital O
    version: result.Ok.version  // ✅ Capital O
  });
} else if ('Err' in result) {  // ✅ Capital E
  console.log('No snapshot found:', result.Err);  // ✅ Capital E
  setError('No snapshot available. Click regenerate to create one.');
} else {
  setError('No snapshot available. Click regenerate to create one.');
}
```

**Change 2**: Lines 66-86 (regenerateAgreement method)

```typescript
// BEFORE (Lines 66-86)
if ('ok' in result) {  // ❌
  const data = JSON.parse(result.ok.data);  // ❌
  setData(data);
  setSnapshotInfo({
    created: new Date(Number(result.ok.created_at) / 1000000),  // ❌
    version: result.ok.version  // ❌
  });
  toast.success('Agreement regenerated successfully', {
    description: `Version ${result.ok.version} has been created.`  // ❌
  });
} else if ('err' in result) {  // ❌
  const errorMsg = result.err || 'Unknown error occurred';  // ❌
  console.error('Backend error:', errorMsg);
  setError('Failed to regenerate: ' + errorMsg);
  toast.error('Failed to regenerate', {
    description: errorMsg
  });
} else {
  console.error('Unexpected result format:', result);
  setError('Failed to regenerate: Unexpected response format');
}

// AFTER (Lines 66-86)
if ('Ok' in result) {  // ✅ Capital O
  const data = JSON.parse(result.Ok.data);  // ✅ Capital O
  setData(data);
  setSnapshotInfo({
    created: new Date(Number(result.Ok.created_at) / 1000000),  // ✅ Capital O
    version: result.Ok.version  // ✅ Capital O
  });
  toast.success('Agreement regenerated successfully', {
    description: `Version ${result.Ok.version} has been created.`  // ✅ Capital O
  });
} else if ('Err' in result) {  // ✅ Capital E
  const errorMsg = result.Err || 'Unknown error occurred';  // ✅ Capital E
  console.error('Backend error:', errorMsg);
  setError('Failed to regenerate: ' + errorMsg);
  toast.error('Failed to regenerate', {
    description: errorMsg
  });
} else {
  console.error('Unexpected result format:', result);
  setError('Failed to regenerate: Unexpected response format');
}
```

**Summary of Changes**:
- Line 31: `'ok'` → `'Ok'`
- Line 32, 35, 36: `result.ok` → `result.Ok` (3 occurrences)
- Line 38: `'err'` → `'Err'`
- Line 39: `result.err` → `result.Err`
- Line 66: `'ok'` → `'Ok'`
- Line 67, 70, 71, 74: `result.ok` → `result.Ok` (4 occurrences)
- Line 76: `'err'` → `'Err'`
- Line 77: `result.err` → `result.Err`

**Total**: 13 replacements across 2 methods

## Testing Requirements

### Test 1: Verify Backend Returns Capital Case (DFX)

```bash
# Test get_agreement_snapshot (anonymous call OK for query)
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai \
  get_agreement_snapshot '(principal "ysy5f-2qaaa-aaaap-qkmmq-cai")'

# Expected output:
variant {
  Ok = record {  # ← Verify capital O
    data = "{...}"
    version = 4 : nat32;
    ...
  }
}

# OR (if no snapshot exists):
variant {
  Err = "No snapshot found for token"  # ← Verify capital E
}
```

### Test 2: Manual Browser Testing (BEFORE Playwright)

**Step-by-step verification**:

```bash
# 1. Deploy to mainnet
./deploy.sh --network ic --frontend-only

# 2. Test anonymous load
open "https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/agreement"
# Open DevTools Console

# Verify BEFORE fix:
# ❌ Console: "Unexpected result format: { Ok: {...} }"
# ❌ UI: "No snapshot available" (even though snapshot exists)

# Verify AFTER fix:
# ✅ Console: "No errors" OR normal logs
# ✅ UI: Agreement document renders OR "No snapshot available" (if truly none)

# 3. Test regenerate (requires login)
# Click "Connect Wallet" → Login with II
# Click "Regenerate" button
# Wait 10-30 seconds (fetches data from Orbit)

# Verify BEFORE fix:
# ❌ Console: "Unexpected result format: { Ok: {...} }"
# ❌ UI: "Failed to regenerate: Unexpected response format"

# Verify AFTER fix:
# ✅ Console: "Agreement regeneration requested by ..."
# ✅ UI: "Agreement regenerated successfully"
# ✅ Document renders with version number

# 4. Check browser console for any errors
# Should see ZERO errors related to:
# - "Unexpected response format"
# - "Candid decode"
# - "Invalid record"
```

### Test 3: Create Playwright E2E Test

**File**: `daopad_frontend/e2e/agreement.spec.ts` (CREATE NEW)

```typescript
import { test, expect } from '@playwright/test';
import { createDataVerifier } from './helpers/data-verifier';

test.describe('Agreement Tab - Anonymous User Access', () => {
  test('should load agreement tab without errors', async ({ page }) => {
    // MANDATORY: Set up data verification
    const verify = createDataVerifier(page);

    // Navigate to Agreement tab
    await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/agreement');

    // Wait for page load and API calls
    await page.waitForTimeout(5000);

    // MANDATORY: Verify no console errors
    verify.assertNoConsoleErrors();

    // MANDATORY: Verify backend calls succeeded
    verify.assertBackendSuccess();

    // Verify UI loaded
    await expect(page.locator('text=LLC Operating Agreement')).toBeVisible();

    // Check for either snapshot OR empty state (both valid)
    const agreementDoc = page.locator('[data-testid="agreement-document"]');
    const emptyState = page.locator('text=No snapshot available');
    const regenerateBtn = page.locator('button:has-text("Regenerate")');

    // Regenerate button should always be visible
    await expect(regenerateBtn).toBeVisible();

    const docVisible = await agreementDoc.isVisible();
    const emptyVisible = await emptyState.isVisible();

    // One of them should be visible
    expect(docVisible || emptyVisible).toBe(true);

    // Print summary
    verify.printSummary();
  });

  test('should NOT show "Unexpected response format" error', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/agreement');
    await page.waitForTimeout(5000);

    // Should NOT see the variant case mismatch error
    await expect(page.locator('text=Unexpected response format')).not.toBeVisible();

    // Should NOT see in console
    const errors = verify.getConsoleErrors();
    const unexpectedFormat = errors.filter(e => e.includes('Unexpected result format'));
    expect(unexpectedFormat).toHaveLength(0);
  });

  test('should display version info when snapshot exists', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/agreement');
    await page.waitForTimeout(5000);

    verify.assertNoConsoleErrors();
    verify.assertBackendSuccess();

    // If snapshot exists, should show version info
    const versionInfo = page.locator('text=/Version \\d+/');
    const versionExists = await versionInfo.count() > 0;

    if (versionExists) {
      await expect(versionInfo).toBeVisible();
      // Should also show "Generated:" timestamp
      await expect(page.locator('text=/Generated:/i')).toBeVisible();
    }
  });

  test('should show permanent link when data loaded', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/agreement');
    await page.waitForTimeout(5000);

    verify.assertNoConsoleErrors();

    // Should show "Copy Link" button
    await expect(page.locator('button:has-text("Copy Link")')).toBeVisible();

    // Should show "Open Standalone" button
    await expect(page.locator('button:has-text("Open Standalone")')).toBeVisible();
  });
});
```

### Test 4: Run Playwright Tests

```bash
cd daopad_frontend
npx playwright test e2e/agreement.spec.ts --project=chromium

# Expected results:
# ✅ should load agreement tab without errors
# ✅ should NOT show "Unexpected response format" error
# ✅ should display version info when snapshot exists
# ✅ should show permanent link when data loaded
```

### Success Criteria:

**Before Fix**:
- ❌ Console: "Unexpected result format: { Ok: {...} }"
- ❌ UI: "No snapshot available" (false - snapshot exists)
- ❌ Regenerate: "Failed to regenerate: Unexpected response format"
- ❌ Playwright: Tests fail on console error check

**After Fix**:
- ✅ Console: Clean (no variant errors)
- ✅ UI: Agreement document renders OR true empty state
- ✅ Regenerate: Success message + document renders
- ✅ Playwright: All tests pass with data verifier

## Files Changed Summary

### Modified:
1. **daopad_frontend/src/components/operating-agreement/OperatingAgreementTab.tsx**
   - Line 31: `'ok'` → `'Ok'`
   - Line 32, 35, 36: `result.ok` → `result.Ok`
   - Line 38: `'err'` → `'Err'`
   - Line 39: `result.err` → `result.Err`
   - Line 66: `'ok'` → `'Ok'`
   - Line 67, 70, 71, 74: `result.ok` → `result.Ok`
   - Line 76: `'err'` → `'Err'`
   - Line 77: `result.err` → `result.Err`

### Created:
2. **daopad_frontend/e2e/agreement.spec.ts**
   - 4 comprehensive tests
   - Uses mandatory `createDataVerifier()` helper
   - Verifies console errors and backend success
   - Tests both snapshot loaded and empty states

## Expected Outcome

### User Experience:
- ✅ Agreement tab loads instantly (no more "Unexpected response format")
- ✅ Existing snapshots display correctly
- ✅ Regenerate button works (creates/updates snapshot)
- ✅ Version tracking functional
- ✅ Export and permanent link features work

### Data Pipeline:
- ✅ Backend → Frontend: Candid variants decode correctly
- ✅ Error handling: True errors (Err variant) caught properly
- ✅ Success handling: Data (Ok variant) parsed correctly
- ✅ Console: No variant case mismatch errors

### Test Coverage:
- ✅ Anonymous users can view agreement
- ✅ Backend API calls succeed
- ✅ Console errors verified absent
- ✅ UI reflects actual backend state

## Common Candid Pattern (Prevent Future Bugs)

This is a **very common IC development bug**. For all Candid Result types:

```candid
type Result = variant { Ok : T; Err : E };
```

JavaScript encoding is:
```javascript
{ Ok: value }   // ← Capital O
{ Err: error }  // ← Capital E
```

**Search codebase for other instances**:
```bash
cd daopad_frontend/src
grep -r "'ok' in result\|'err' in result" . --include="*.tsx" --include="*.ts"
```

If found, create follow-up PR to fix those too.

## Related Issues

### Why Testing Guide Was Updated:
The canisters tab (PR #101) passed tests but had broken API calls. This led to enforcing:
- ✅ `verify.assertNoConsoleErrors()` - Would catch variant mismatches
- ✅ `verify.assertBackendSuccess()` - Would catch API decode failures

This fix would have been caught immediately with the new testing pattern.

### Deployment Impact:
- **Risk**: Very low (standard case fix, well-understood)
- **Rollback**: Simple (revert to lowercase)
- **Testing**: Playwright with data verifier prevents regression
