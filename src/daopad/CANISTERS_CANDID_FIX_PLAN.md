# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-canisters-candid-fix/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-canisters-candid-fix/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes:
     ```bash
     cd daopad_frontend
     npm run build
     cd ..
     ./deploy.sh --network ic --frontend-only
     ```
4. **Test with Playwright** (MANDATORY):
   ```bash
   cd daopad_frontend
   npx playwright test e2e/canisters.spec.ts --project=chromium
     ```
5. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Fix]: Canisters Tab - Candid Decode Error

Fix Invalid record {paginate:opt record {...}} argument
Corrects Candid optional encoding for pagination parameter"
   git push -u origin feature/canisters-candid-decode-fix
   gh pr create --title "[Fix]: Canisters Tab - Candid Decode Error" --body "Implements CANISTERS_CANDID_FIX_PLAN.md

## Problem
Canisters tab broken with Candid decode error:
\`\`\`
Invalid record {paginate:opt record {...}} argument: {\"offset\":[],\"limit\":[20]}
\`\`\`

## Root Cause
Incorrect Candid encoding for optional types in CanistersTab.tsx line 22.

**Current (Wrong)**:
\`\`\`typescript
paginate: { offset: [], limit: [20] }  // Missing outer array for opt
\`\`\`

**Candid Type Structure**:
\`\`\`candid
type ListExternalCanistersInput = record {
  paginate : opt PaginationInput;  // opt = [] or [value]
};

type PaginationInput = record {
  offset : opt nat64;  // opt = [] or [number]
  limit : opt nat64;
};
\`\`\`

## Solution
\`\`\`typescript
paginate: [{ offset: [], limit: [20] }]  // Correct: outer array for opt record
\`\`\`

## Testing
✅ Playwright tests pass (with data verifier)
✅ API calls succeed (no Candid errors)
✅ Console errors checked
✅ Canisters load for anonymous users

## Related
- PR #101: Tests passed but missed this (led to testing guide update)
- Testing guide now enforces three-layer verification"
   ```
6. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view $(gh pr list --head feature/canisters-candid-decode-fix --json number -q '.[0].number') --json comments`
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

**Branch:** `feature/canisters-candid-decode-fix`
**Worktree:** `/home/theseus/alexandria/daopad-canisters-candid-fix/src/daopad`

---

# Implementation Plan: Canisters Tab Candid Decode Fix

## Task Classification
**BUG FIX**: Restore broken behavior → minimal changes (one line)

## Problem Statement

The Canisters tab is completely broken with a Candid decode error that prevents any canister data from loading:

```
Invalid record {paginate:opt record {offset:opt nat64; limit:opt nat64}}
argument: {"offset":[],"limit":[20]}
```

### User Impact:
- ❌ Canisters tab shows empty state for ALL users
- ❌ Anonymous users cannot view canister list
- ❌ Authenticated users cannot manage canisters
- ❌ API call fails silently (only visible in browser console)

### How It Was Missed:
PR #101 passed tests because:
1. Test only checked "empty state OR grid visible" ✅
2. Empty state WAS visible (API failed, so empty state showed)
3. Test didn't verify WHY empty state was showing
4. No console error checking in tests

**This failure led to the mandatory data verifier requirement in testing guide.**

## Root Cause Analysis

### The Bug (CanistersTab.tsx:22)

```typescript
// ❌ CURRENT (WRONG)
const [filters, setFilters] = useState({
  paginate: { offset: [], limit: [20] },  // Missing outer array for opt
  canister_ids: [],
  labels: [],
  states: [],
  sort_by: []
});
```

### Candid Type Structure (From Orbit Station spec.did)

```candid
type ListExternalCanistersInput = record {
  paginate : opt PaginationInput;  // ← opt = optional type
  canister_ids : opt vec principal;
  labels : opt vec text;
  states : opt vec ExternalCanisterState;
  sort_by : opt ListExternalCanistersSortInput;
};

type PaginationInput = record {
  offset : opt nat64;  // ← opt = optional nat64
  limit : opt nat64;   // ← opt = optional nat64
};
```

### Candid Optional Type Encoding

In Candid, `opt T` means "optional value of type T":
- **None** → encoded as `[]` (empty array)
- **Some(value)** → encoded as `[value]` (array with one element)

Therefore:
```typescript
paginate : opt PaginationInput

// JavaScript encoding:
paginate: []  // None (no pagination)
// OR
paginate: [{ offset: [], limit: [20] }]  // Some(PaginationInput)
                                          //      ^           ^
                                          //      opt nat64   opt nat64
```

### Why Current Code Fails

```typescript
// ❌ WRONG
paginate: { offset: [], limit: [20] }

// Expected by Candid: opt record {...}
// Actual structure:   record {...}  (missing opt wrapper)
// Result: "Invalid record {paginate:opt record {...}} argument"
```

The code sends a raw object `{}` where Candid expects either `[]` (none) or `[{}]` (some).

## Current State

### File Structure:
```
daopad_frontend/src/
├── components/canisters/
│   ├── CanistersTab.tsx              # BUG HERE: Line 22
│   ├── CanisterCard.tsx              # No changes needed
│   └── CanisterFilters.tsx           # No changes needed
├── e2e/
│   ├── canisters.spec.ts             # Tests pass (false positive)
│   └── helpers/
│       └── data-verifier.ts          # NEW: Will catch this bug
└── services/backend/orbit/canisters/
    └── OrbitCanisterService.ts       # No changes needed (passes through)
```

### Affected Code (CanistersTab.tsx:21-27):

```typescript
const [filters, setFilters] = useState({
  paginate: { offset: [], limit: [20] },  // LINE 22: BUG
  canister_ids: [],
  labels: [],
  states: [],
  sort_by: []
});
```

## Implementation

### Fix: Update Candid Optional Encoding

**File**: `daopad_frontend/src/components/canisters/CanistersTab.tsx` (MODIFY)

**Change**: Line 22 only

```typescript
// BEFORE (Line 21-27)
const [filters, setFilters] = useState({
  paginate: { offset: [], limit: [20] },  // ❌ WRONG
  canister_ids: [],
  labels: [],
  states: [],
  sort_by: []
});

// AFTER (Line 21-27)
const [filters, setFilters] = useState({
  paginate: [{ offset: [], limit: [20] }],  // ✅ CORRECT: outer array for opt
  canister_ids: [],
  labels: [],
  states: [],
  sort_by: []
});
```

**Explanation of Fix**:
- Added outer `[ ]` wrapper around the pagination object
- This encodes the `opt PaginationInput` type correctly
- Inner `[]` arrays remain for `opt nat64` fields (offset/limit)

**That's it. One line change. One character added.**

## Testing Requirements

### Manual Testing (Before Playwright):
```bash
# 1. Deploy to mainnet
./deploy.sh --network ic --frontend-only

# 2. Test in browser (incognito mode)
open "https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/canisters"

# 3. Open DevTools Console

# Verify BEFORE fix:
# ❌ Error: "Invalid record {paginate:opt record {...}} argument..."
# ❌ Empty state shows (because API failed)

# Verify AFTER fix:
# ✅ No console errors
# ✅ API call succeeds: "=== LIST CANISTERS RESULT ==="
# ✅ Either canisters display OR intentional empty state
# ✅ Network tab shows successful call to lwsav-iiaaa-aaaap-qp2qq-cai
```

### Playwright Testing (Now Required With Data Verifier):

Update `e2e/canisters.spec.ts` to use new mandatory pattern:

```typescript
import { test, expect } from '@playwright/test';
import { createDataVerifier } from './helpers/data-verifier';

test.describe('Canisters Tab', () => {
  test('should load without Candid errors', async ({ page }) => {
    // MANDATORY: Set up data verification
    const verify = createDataVerifier(page);

    await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/canisters');
    await page.waitForTimeout(5000);

    // MANDATORY: Verify no console errors (catches Candid issues)
    verify.assertNoConsoleErrors();  // ❌ WOULD FAIL BEFORE FIX

    // MANDATORY: Verify backend success
    verify.assertBackendSuccess();   // ❌ WOULD FAIL BEFORE FIX

    // NOW safe to check UI
    const emptyState = page.locator('[data-testid="canisters-empty-state"]');
    const grid = page.locator('[data-testid="canisters-grid"]');

    const emptyVisible = await emptyState.isVisible();
    const gridVisible = await grid.isVisible();

    expect(emptyVisible || gridVisible).toBe(true);
  });
});
```

### Expected Test Results:

**BEFORE Fix**:
```
❌ verify.assertNoConsoleErrors()
   Error: "Invalid record {paginate:opt record {...}} argument"

❌ verify.assertBackendSuccess()
   Error: No successful backend calls
```

**AFTER Fix**:
```
✅ verify.assertNoConsoleErrors()
   No critical errors

✅ verify.assertBackendSuccess()
   1+ successful calls to lwsav-iiaaa-aaaap-qp2qq-cai

✅ UI displays correctly
   Empty state OR grid visible (verified with data)
```

## Validation

### How To Verify Fix Works:

1. **Console Check** (Browser DevTools):
   ```javascript
   // BEFORE: Error logged
   "Invalid record {paginate:opt record {...}} argument: {\"offset\":[],\"limit\":[20]}"

   // AFTER: Success logged
   "=== FETCHING CANISTERS ==="
   "Token canister ID: ysy5f-2qaaa-aaaap-qkmmq-cai"
   "Filters: { \"paginate\": [{ \"offset\": [], \"limit\": [20] }] }"
   "=== LIST CANISTERS RESULT ==="
   "Success: true"
   ```

2. **Network Tab**:
   ```
   POST https://icp0.io/api/v2/canister/lwsav-iiaaa-aaaap-qp2qq-cai/query
   Status: 200 OK  ✅
   ```

3. **UI State**:
   ```
   BEFORE: Always empty state (API failed)
   AFTER: Canisters display OR empty state (API succeeded)
   ```

## Files Changed Summary

**Modified**:
1. `daopad_frontend/src/components/canisters/CanistersTab.tsx`
   - Line 22: Changed `paginate: { offset: [], limit: [20] }`
   - To: `paginate: [{ offset: [], limit: [20] }]`
   - Adds outer array for `opt record` Candid encoding

**Updated (Recommended)**:
2. `daopad_frontend/e2e/canisters.spec.ts`
   - Add `createDataVerifier()` usage
   - Add `verify.assertNoConsoleErrors()` call
   - Add `verify.assertBackendSuccess()` call
   - Follows new mandatory testing pattern

## Expected Outcome

### Before Fix:
- ❌ Canisters tab broken for all users
- ❌ Candid decode error in console
- ❌ Empty state shown (misleading - API failed)
- ❌ Zero successful API calls

### After Fix:
- ✅ Canisters tab works for all users
- ✅ No console errors
- ✅ Correct empty state OR canisters display
- ✅ API calls succeed (200 OK)

### Deployment Impact:
- **Risk**: Very low (one-line fix, well-understood)
- **Rollback**: Simple (revert one line)
- **Testing**: Playwright tests with data verifier will catch any regression

## Related Issues

### Why This Matters:
This bug demonstrates why the testing guide was updated to require three-layer verification:

1. **PR #101** merged broken code because tests only checked UI
2. **Empty state was visible** → Test passed ✅
3. **API actually failed** → Test didn't check ❌
4. **Result**: Broken feature in production

### Prevention:
New `createDataVerifier()` helper would have caught this:
- `assertNoConsoleErrors()` → Fails on Candid error
- `assertBackendSuccess()` → Fails on API failure
- Impossible to pass tests with broken API

### Lesson:
**Never trust UI state alone. Always verify the data pipeline.**
