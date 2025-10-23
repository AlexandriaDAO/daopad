# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and complete PR #102.**

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
2. **Implement fix** - Convert Principal objects to strings before React rendering
3. **Build & Deploy**:
   ```bash
   cd daopad_frontend
   rm -rf dist
   npm run build
   cd ..
   ./deploy.sh --network ic --frontend-only
   ```
4. **Test per PLAYWRIGHT_TESTING_GUIDE.md Section "Mandatory Plan Template"**:
   - Manual browser verification FIRST
   - Check console for errors
   - Create data verifier test
5. **Update PR #102**:
   ```bash
   git add .
   git commit -m "[Fix]: Convert Principal objects to strings for React rendering"
   git push
   gh pr comment 102 --body "## ✅ Principal Rendering Fix Complete [details]"
   ```
6. **Iterate autonomously (5 iterations max)**:
   - Check PR feedback: `gh pr view 102 --json comments,reviews`
   - Count P0 issues
   - IF P0 > 0: Fix immediately, commit, push, sleep 300s, continue
   - IF P0 = 0: Report success, EXIT

## CRITICAL RULES
- ❌ NO questions ("should I?", "want me to?", "is it done?")
- ❌ NO stopping after implementation - complete the PR
- ✅ After sleep: IMMEDIATELY continue (no pause)
- ✅ ONLY stop at: approved, max iterations, or error

**Branch:** `feature/canisters-candid-decode-fix`
**Worktree:** `/home/theseus/alexandria/daopad-canisters-candid-fix/src/daopad`
**PR:** #102

---

# Implementation Plan

## Current State Documentation

### The Problem
React error #31: "Objects are not valid as a React child (found: object with keys {_arr, _isPrincipal})"

**Console evidence:**
```
Error: Minified React error #31; visit https://reactjs.org/docs/error-decoder.html?invariant=31&args[]=object%20with%20keys%20%7B_arr%2C%20_isPrincipal%7D
```

**Root cause:** Principal objects from @dfinity/principal are being passed directly to React components for rendering. React cannot render objects as children.

### Previous Fix Attempts
1. ✅ Fixed Candid encoding: `paginate: [{ offset: [], limit: [20] }]`
2. ✅ Fixed response structure: Handle `result.data.Ok` variant
3. ❌ But Principal objects still crash React rendering

### Files Affected
```
daopad_frontend/src/components/canisters/
├── CanistersTab.tsx       # Lines 67-70, 174-179
├── CanisterCard.tsx       # Lines 96-99, principal display
└── CanisterFilters.tsx   # May have principal rendering
```

## Implementation (PSEUDOCODE)

### Fix 1: Update CanistersTab.tsx
```javascript
// PSEUDOCODE - Line 67-70 (filter canisters)
const filteredCanisters = canisters.filter(c => {
  // Convert Principal to string for comparison
  const canisterIdString = typeof c.canister_id === 'object' && c.canister_id._isPrincipal
    ? c.canister_id.toText()
    : c.canister_id;
  return canisterIdString !== BACKEND_CANISTER;
});

// PSEUDOCODE - Line 172-179 (map canisters for rendering)
{canisters.map(canister => {
  // Convert all Principal fields to strings
  const normalizedCanister = {
    ...canister,
    id: canister.id?._isPrincipal ? canister.id.toText() : canister.id,
    canister_id: canister.canister_id?._isPrincipal
      ? canister.canister_id.toText()
      : canister.canister_id
  };

  return (
    <CanisterCard
      key={normalizedCanister.id || normalizedCanister.canister_id}
      canister={normalizedCanister}
      identity={identity || null}
      onTopUp={() => handleTopUp(normalizedCanister.canister_id)}
      onConfigure={() => handleConfigure(normalizedCanister.canister_id)}
    />
  );
})}
```

### Fix 2: Update CanisterCard.tsx
```javascript
// PSEUDOCODE - Line 96-99 (display canister name and ID)
<CardTitle className="text-lg font-semibold truncate">
  {canister.name || 'Unnamed Canister'}
</CardTitle>
<p className="text-xs text-gray-500 font-mono mt-1">
  ID: {
    // Safely convert Principal to string
    typeof canister.id === 'object' && canister.id._isPrincipal
      ? canister.id.toText().substring(0, 8)
      : String(canister.id || canister.canister_id || '').substring(0, 8)
  }...
</p>
```

### Fix 3: Add Principal Utility Helper
```javascript
// PSEUDOCODE - New file: daopad_frontend/src/utils/principal.ts
export function principalToString(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._isPrincipal) {
    return value.toText();
  }
  if (typeof value === 'object' && value.toText) {
    return value.toText();
  }
  return String(value);
}

// Use in components:
import { principalToString } from '../../utils/principal';
// Then: principalToString(canister.id)
```

## Testing Requirements

### Playwright Testing (MANDATORY - From PLAYWRIGHT_TESTING_GUIDE.md)

```markdown
## Step 1: Manual Browser Verification (BEFORE Playwright)

```bash
# 1. Deploy to mainnet
./deploy.sh --network ic --frontend-only

# 2. Open in incognito browser
open "https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/canisters"

# 3. Open DevTools Console (F12) - READ EVERY LINE

# 4. Check for errors (MANDATORY):
#    - NO "React error #31"
#    - NO "object with keys {_arr, _isPrincipal}"
#    - NO "Objects are not valid as a React child"

# 5. Check Network tab:
#    Filter for: lwsav-iiaaa-aaaap-qp2qq-cai
#    Verify: ALL calls return 200 OK

# 6. Verify UI state:
#    ✅ Canisters grid displays OR empty state shows
#    ❌ Page crash = Principal still not converted
```

## Step 2: Update Test File (MANDATORY)

```typescript
// e2e/canisters.spec.ts
import { test, expect } from '@playwright/test';
import { createDataVerifier } from './helpers/data-verifier';

test.describe('Canisters Tab - Principal Fix', () => {
  test('should render canister list without Principal errors', async ({ page }) => {
    // STEP 1: Create data verifier (MANDATORY)
    const verify = createDataVerifier(page);

    // STEP 2: Navigate
    await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/canisters');

    // STEP 3: Wait for async operations
    await page.waitForTimeout(5000);

    // STEP 4: MANDATORY - Verify no console errors
    verify.assertNoConsoleErrors();

    // STEP 5: MANDATORY - Verify backend success
    verify.assertBackendSuccess();

    // STEP 6: Verify UI renders (not crashed)
    const gridOrEmpty = await page.locator('[data-testid="canisters-grid"], [data-testid="canisters-empty-state"]').first();
    await expect(gridOrEmpty).toBeVisible();

    // STEP 7: Print debug summary
    verify.printSummary();
  });
});
```

## Step 3: Autonomous Iteration Loop

```
FOR iteration = 1 TO 5:

  1. Open https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/canisters
  2. Read console (F12) - every line
  3. Check Network tab - every call status

  IF console has "React error #31":
    - Find component rendering Principal
    - Add principalToString() conversion
    - git add . && git commit -m "Fix: Principal rendering in [component]"
    - git push
    - ./deploy.sh --network ic --frontend-only
    - sleep 300s
    - GOTO step 1

  IF console clean AND UI renders:
    - Run Playwright: npx playwright test e2e/canisters.spec.ts
    - IF data verifier passes: SUCCESS, update PR, exit
    - IF data verifier fails: Continue to next iteration

  IF iteration = 5:
    - Comment on PR with findings
    - EXIT

END FOR
```

## Step 4: Success Verification Checklist

```bash
# 1. Console verification
open "https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/canisters"
# Check: ZERO React errors ✅

# 2. Network verification
# Check: All calls to lwsav-iiaaa-aaaap-qp2qq-cai return 200 ✅

# 3. UI verification
# Check: Either grid OR empty state displays ✅

# 4. Playwright verification
cd daopad_frontend && npx playwright test e2e/canisters.spec.ts --project=chromium
# Output: verify.assertNoConsoleErrors() passed ✅
# Output: verify.assertBackendSuccess() passed ✅
```

## Expected Results

| Before Fix | After Fix |
|------------|-----------|
| React error #31 | No React errors |
| Page crashes | Page renders normally |
| {_arr, _isPrincipal} in console | Clean console |
| White screen of death | Grid or empty state visible |

## Anti-Patterns to Avoid

❌ Declaring "it works" without manual browser verification
❌ Skipping console error checking
❌ Not using createDataVerifier() in tests
❌ Stopping at first error without iterating

## Success Criteria

1. ✅ Manual browser shows NO React error #31
2. ✅ Console has ZERO Principal-related errors
3. ✅ UI renders canisters grid OR empty state
4. ✅ Playwright test with data verifier passes
5. ✅ PR #102 updated with verification results

---

## Notes for Implementing Agent

This is iteration 5 of fixing the Canisters tab. Previous iterations fixed:
1. Candid encoding structure
2. Response variant handling
3. Double-wrapped Ok variant

This final iteration fixes Principal object rendering which causes React to crash.

The fix is straightforward: Convert all Principal objects to strings before React attempts to render them. The Principal type from @dfinity/principal has a `.toText()` method that returns the string representation.

Key locations to check:
- Anywhere using `canister.id` or `canister.canister_id`
- Array keys in React maps
- Display values in JSX

Remember: Tests passing != feature working. Manual browser verification is MANDATORY.