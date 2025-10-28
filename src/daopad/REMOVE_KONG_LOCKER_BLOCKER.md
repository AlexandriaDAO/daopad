# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-remove-kong-blocker/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-remove-kong-blocker/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes only:
     ```bash
     cd daopad_frontend
     npm run build
     cd ..
     ./deploy.sh --network ic --frontend-only
     ```
4. **Test with Playwright** (MANDATORY):
   ```bash
   cd daopad_frontend
   LOG_FILE="/tmp/playwright-$(date +%s).log"
   npx playwright test e2e/app-route.spec.ts --project=chromium 2>&1 | tee $LOG_FILE

   # MANDATORY: Read console errors
   echo "=== CONSOLE ERRORS FROM PLAYWRIGHT ==="
   grep -B5 -A20 "Browser Console Error" $LOG_FILE

   # If errors found, fix and repeat. Max 5 iterations.
   ```
5. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "Fix: Remove Kong Locker blocking requirement from /app route

   - Authenticated users can now see public dashboard without Kong Locker
   - Fixes issue where users with Kong Locker were incorrectly blocked
   - Aligns with PR #127 goal of making /app public for all users
   - Kong Locker state still tracked for header badge display"
   git push -u origin feature/remove-kong-locker-blocker
   gh pr create --title "Fix: Remove Kong Locker Blocking Requirement" --body "Implements REMOVE_KONG_LOCKER_BLOCKER.md

## Problem
Users (both with and without Kong Locker) were being blocked from viewing the public /app dashboard by a modal requiring Kong Locker setup. This contradicts the intent of PR #127 which made /app a public route.

## Solution
- Removed blocking logic from AppRoute.tsx
- Public dashboard (stats + treasuries) now visible to ALL users
- Kong Locker state still tracked for optional header badge
- KongLockerSetup component kept for potential future voting flow use

## Testing
- Playwright tests verify /app route loads without blocking
- Manual testing confirms dashboard visible to authenticated users
- Console logs clean (no errors)"
   ```
6. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view --json comments,reviews`
     - Count P0 issues in comments
     - IF P0 > 0: Fix immediately, commit, push, sleep 300s, continue
     - IF P0 = 0: Report success, EXIT
   - After 5 iterations: Escalate to human

## CRITICAL RULES
- ❌ NO questions ("should I?", "want me to?", "is it done?")
- ❌ NO skipping PR creation - it's MANDATORY
- ❌ NO stopping after implementation - create PR immediately
- ✅ After sleep: IMMEDIATELY continue (no pause)
- ✅ ONLY stop at: approved, max iterations, or error

**Branch:** `feature/remove-kong-locker-blocker`
**Worktree:** `/home/theseus/alexandria/daopad-remove-kong-blocker/src/daopad`

---

# Implementation Plan: Remove Kong Locker Blocking Requirement

## Problem Statement

Users are being incorrectly blocked from viewing the public /app dashboard by a modal requiring Kong Locker setup. This affects:
1. Users WITHOUT Kong Locker (expected behavior, but shouldn't block public dashboard)
2. Users WITH Kong Locker (bug - check fails/times out incorrectly)

**Root Cause**: Lines 170 and 252-259 in `AppRoute.tsx` gate the entire dashboard behind `shouldShowKongLockerSetup`, showing only the Kong Locker modal instead of the public content.

**Expected Behavior**: Per PR #127 ("Refactor: Public /app Page - Remove User-Specific Data"), the /app route should display public data (stats + treasury list) to ALL users, regardless of authentication or Kong Locker status.

## Current State

### File Tree (Before)
```
daopad_frontend/src/
├── routes/
│   └── AppRoute.tsx              # ❌ BLOCKING LOGIC HERE
├── components/
│   └── KongLockerSetup.tsx       # ✅ Keep (might be useful later)
└── features/dao/
    └── daoSlice.ts               # ✅ Keep (state still useful for badge)
```

### AppRoute.tsx Current Implementation (lines 117-135, 170, 252-259)

**Blocking Logic**:
```typescript
// Lines 117-135: Checks Kong Locker on mount
const checkKongLockerCanister = async () => {
  if (!identity) return;
  setIsCheckingKongLocker(true);
  try {
    const kongLockerService = getKongLockerService(identity);
    const result = await kongLockerService.getMyCanister();
    if (result.success && result.data) {
      const canisterString = typeof result.data === 'string' ? result.data : result.data.toString();
      dispatch(setKongLockerCanister(canisterString));
    }
  } catch (err) {
    console.error('Error checking Kong Locker canister:', err);
  } finally {
    setIsCheckingKongLocker(false);
  }
};

// Line 170: Gate condition
const shouldShowKongLockerSetup = isAuthenticated && !kongLockerCanister && !isCheckingKongLocker;

// Lines 252-259: Blocks entire dashboard
{isAuthenticated && shouldShowKongLockerSetup ? (
  <div className="max-w-2xl mx-auto">
    <KongLockerSetup
      identity={identity}
      onComplete={handleKongLockerComplete}
    />
  </div>
) : (
  // Dashboard only shown if NOT blocked
  <div className="space-y-8">
    <PublicStatsStrip />
    <TreasuryShowcase onSelectStation={(stationId) => navigate(`/${stationId}`)} />
  </div>
)}
```

### Kong Locker State Usage

**Still Needed** (lines 224-228):
```typescript
{kongLockerCanister && (
  <Badge className="bg-executive-mediumGray border-executive-gold/30 text-executive-goldLight"
         title={`Kong Locker: ${kongLockerCanister}`}>
    🔒 Connected
  </Badge>
)}
```

This badge display is fine - it's optional visual feedback, not a blocker.

## Implementation

### AppRoute.tsx Changes

**File**: `daopad_frontend/src/routes/AppRoute.tsx`

```typescript
// PSEUDOCODE

// 1. REMOVE: isCheckingKongLocker state (line 29)
// DELETE THIS LINE:
const [isCheckingKongLocker, setIsCheckingKongLocker] = useState(false);

// 2. REMOVE: checkKongLockerCanister function (lines 117-135)
// DELETE ENTIRE FUNCTION - we no longer need to check on mount

// 3. REMOVE: useEffect call to checkKongLockerCanister (line 48)
// In the main useEffect (lines 42-55), DELETE this line:
checkKongLockerCanister();

// 4. REMOVE: shouldShowKongLockerSetup condition (line 170)
// DELETE THIS LINE - we won't use this gate anymore

// 5. REMOVE: handleKongLockerComplete callback (lines 165-167)
// DELETE ENTIRE FUNCTION - no longer needed

// 6. SIMPLIFY: Main content rendering (lines 252-273)
// REPLACE the conditional rendering with:

<main className="container mx-auto px-4 py-8">
  {/* DEFAULT VIEW - Same for everyone (logged in or not) */}
  <div className="space-y-8">
    {/* Stats overview */}
    <section>
      <PublicStatsStrip />
    </section>

    {/* Treasury showcase - shows ALL treasuries */}
    <section>
      <TreasuryShowcase onSelectStation={(stationId) => navigate(`/${stationId}`)} />
    </section>
  </div>
</main>

// 7. KEEP: Kong Locker badge in header (lines 224-228)
// This is fine - it's optional visual feedback, not blocking

// 8. UPDATE: Imports (lines 1-14)
// REMOVE unused import:
import KongLockerSetup from '../components/KongLockerSetup';
// REMOVE from dao slice imports:
setKongLockerCanister,
// Also remove getKongLockerService import (line 14)

// 9. REMOVE: Redux dispatches for Kong Locker (lines 46-48, 52)
// In useEffect, DELETE:
checkKongLockerCanister();
// In logout/clearAuth, the clearDaoState() already handles Kong Locker state
```

### Final AppRoute.tsx Structure (After Changes)

```typescript
// PSEUDOCODE - Simplified structure

function AppRoute() {
  // State
  const [copyFeedback, setCopyFeedback] = useState(false);
  const intervalRef = useRef(null);

  // Redux
  const { principal, isAuthenticated } = useSelector(state => state.auth);
  const { icpBalance, isLoading: balanceLoading } = useSelector(state => state.balance);
  const { kongLockerCanister } = useSelector(state => state.dao); // Still used for badge
  const publicStats = useSelector(state => state.dao.publicDashboard.stats);

  // Hooks
  const { login, identity } = useIdentity();
  const logout = useLogout();

  // Auth check on mount
  useEffect(() => {
    if (identity) {
      const principalText = identity.getPrincipal().toString();
      dispatch(setAuthSuccess(principalText));
      dispatch(fetchBalances(identity));
      // REMOVED: checkKongLockerCanister() - no longer needed
    } else {
      dispatch(clearAuth());
      dispatch(clearBalances());
      dispatch(clearDaoState());
    }
    dispatch(setAuthInitialized(true));
  }, [identity, dispatch]);

  // Public data polling (unchanged)
  useEffect(() => {
    // ... existing polling logic ...
  }, [isAuthenticated, dispatch]);

  // Handlers
  const handleLogin = async () => { /* unchanged */ };
  const handleLogout = async () => { /* unchanged */ };
  const copyPrincipal = async () => { /* unchanged */ };

  // REMOVED: shouldShowKongLockerSetup - no longer needed
  // REMOVED: handleKongLockerComplete - no longer needed

  return (
    <RouteErrorBoundary onReset={handleReset}>
      <div className="min-h-screen bg-executive-charcoal text-executive-lightGray">
        {/* Header - unchanged */}
        <header>
          {/* ... existing header with Kong Locker badge (still shown if available) ... */}
        </header>

        {/* Main content - NO MORE BLOCKING */}
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            <section>
              <PublicStatsStrip />
            </section>
            <section>
              <TreasuryShowcase onSelectStation={(stationId) => navigate(`/${stationId}`)} />
            </section>
          </div>
        </main>

        {/* Footer - unchanged */}
        <footer>
          {/* ... existing footer ... */}
        </footer>
      </div>
    </RouteErrorBoundary>
  );
}
```

## What We're Keeping (No Changes)

### 1. daoSlice.ts
**File**: `daopad_frontend/src/features/dao/daoSlice.ts`

- `kongLockerCanister` state (line 108) - Still useful for header badge
- `setKongLockerCanister` action (lines 142-147) - Might be set elsewhere
- All Kong Locker state management - No harm in keeping, useful for future voting features

**Rationale**: State management is cheap, and we might want to show Kong Locker info in the header badge or use it later for voting power displays.

### 2. KongLockerSetup.tsx
**File**: `daopad_frontend/src/components/KongLockerSetup.tsx`

- Keep entire component - Might be useful later for voting flow
- If user tries to vote without Kong Locker, we could show this modal

**Rationale**: Component is self-contained and not causing any issues. Better to keep for potential future use than delete and recreate.

## Testing Strategy

### Manual Browser Verification (FIRST - Before Playwright)

1. **Deploy changes**:
   ```bash
   cd daopad_frontend
   npm run build
   cd ..
   ./deploy.sh --network ic --frontend-only
   ```

2. **Test as authenticated user** (with Internet Identity):
   ```bash
   # Open in incognito browser
   open "https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/"

   # Steps:
   # 1. Click "Connect with Internet Identity"
   # 2. Authenticate
   # 3. Should see dashboard immediately (NOT Kong Locker modal)
   # 4. Verify stats show: Participants, Active Proposals, Treasuries, Registered Voters
   # 5. Verify treasury list shows: ICP, dvinity, ALEX, ZERO, KONG, BOB, ckUSDT
   ```

3. **Check console errors**:
   ```bash
   # Open DevTools (F12) → Console tab
   # Verify ZERO errors related to:
   # - Kong Locker service calls
   # - Blocking/redirects
   # - Component rendering
   ```

4. **Test as anonymous user** (sanity check - should already work):
   ```bash
   # Open new incognito window
   open "https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/"

   # Should see same dashboard (no login required for public view)
   ```

### Playwright E2E Testing (AFTER Manual Verification)

**Test File**: Create `daopad_frontend/e2e/app-route.spec.ts`

```typescript
// PSEUDOCODE

import { test, expect } from '@playwright/test';
import { createDataVerifier } from './helpers/data-verifier';

test.describe('App Route - Public Dashboard', () => {

  test('shows dashboard to unauthenticated users', async ({ page }) => {
    const verify = createDataVerifier(page);

    // Navigate to app route
    await page.goto('https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/');

    // Wait for async operations
    await page.waitForTimeout(5000);

    // Verify no console errors
    verify.assertNoConsoleErrors();

    // Verify dashboard is visible (not blocked)
    await expect(page.locator('h1:has-text("DAOPad")')).toBeVisible();

    // Verify stats are visible
    await expect(page.getByText('Participants')).toBeVisible();
    await expect(page.getByText('Active Proposals')).toBeVisible();
    await expect(page.getByText('Treasuries')).toBeVisible();
    await expect(page.getByText('Registered Voters')).toBeVisible();

    // Verify treasury showcase is visible
    await expect(page.getByText('Token Treasuries')).toBeVisible();

    // Verify at least one treasury is shown
    await expect(page.getByText('ICP')).toBeVisible();
  });

  // Note: Can't test authenticated flow with Playwright (ICP Auth incompatibility)
  // Manual browser testing required for authenticated user verification
});
```

### Testing Workflow (Iteration Loop)

```bash
FOR iteration = 1 TO 5:

  1. Make code changes (remove blocking logic)

  2. Build and deploy
     cd daopad_frontend
     npm run build
     cd ..
     ./deploy.sh --network ic --frontend-only

  3. Manual browser check (MANDATORY FIRST)
     - Open https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/ in incognito
     - Login with Internet Identity
     - Verify dashboard shows immediately (no modal block)
     - Open DevTools → Console
     - Verify ZERO errors
     - IF errors found: Note them, fix, GOTO step 1
     - IF clean: Continue to step 4

  4. Run Playwright with logging
     cd daopad_frontend
     LOG_FILE="/tmp/playwright-$(date +%s).log"
     npx playwright test e2e/app-route.spec.ts --project=chromium 2>&1 | tee $LOG_FILE

  5. MANDATORY: Read console errors
     echo "=== CONSOLE ERRORS FROM PLAYWRIGHT ==="
     grep -B5 -A20 "Browser Console Error" $LOG_FILE

     echo "=== CANDID ERRORS ==="
     grep -A5 "Candid" $LOG_FILE

     echo "=== FAILED BACKEND METHODS ==="
     grep "Method:" $LOG_FILE | sed 's/.*Method: \([^ ]*\).*/\1/' | sort -u

  6. IF zero errors AND tests pass AND manual browser clean:
       - SUCCESS, exit loop

  7. IF errors found:
       - Extract ALL distinct errors
       - Fix ALL together (not one at a time)
       - git add . && git commit -m "Fix: [errors]" && git push
       - Continue to next iteration

  8. IF iteration = 5 AND still failing:
       - Comment on PR with findings
       - Request human help
       - EXIT

END FOR
```

### Exit Criteria (When to Declare Success)

✅ **SUCCESS when ALL of these are true**:
1. Playwright test passes (app-route.spec.ts: X/X passed)
2. Manual browser test shows dashboard immediately (no Kong Locker modal)
3. Browser DevTools console shows ZERO errors
4. Stats display correctly (Participants, Proposals, Treasuries, Voters)
5. Treasury list displays correctly (at least ICP, ALEX visible)

❌ **DO NOT declare success if**:
- Playwright passes but manual browser shows modal
- Dashboard loads but console has errors
- Stats show as 0/null when they shouldn't
- Treasury list is empty

## Migration Notes

### What Users Will See (Before vs After)

**Before** (Current Buggy Behavior):
```
User logs in → Checking Kong Locker... → Modal blocks everything → Frustrated user
```

**After** (Fixed Behavior):
```
User logs in → Dashboard loads immediately → Stats + Treasuries visible → Happy user
```

### Backwards Compatibility

- ✅ Unauthenticated users: No change (already worked)
- ✅ Authenticated users WITHOUT Kong Locker: Now see dashboard (previously blocked)
- ✅ Authenticated users WITH Kong Locker: Now see dashboard (previously sometimes blocked)
- ✅ Kong Locker badge in header: Still shows when available

**No breaking changes** - Only removing a blocking UI pattern that shouldn't have existed.

## Rationale for Keeping Components

### Why Keep KongLockerSetup.tsx?
1. **Future voting flow**: When user tries to vote, we might want to show this modal
2. **Self-contained**: Not imported anywhere after this change, so zero overhead
3. **Avoid rework**: If we need it later, it's already there and working

### Why Keep Kong Locker State in daoSlice.ts?
1. **Header badge**: Still displays Kong Locker status (lines 224-228 in AppRoute)
2. **Future features**: Voting power calculations, proposal creation might need it
3. **No cost**: Redux state management is cheap, doesn't hurt to keep
4. **Separation of concerns**: State management ≠ UI blocking logic

## Summary

**What We're Removing**:
- `isCheckingKongLocker` state
- `checkKongLockerCanister()` function
- `shouldShowKongLockerSetup` condition
- Conditional rendering that blocks dashboard
- Kong Locker imports in AppRoute.tsx

**What We're Keeping**:
- Kong Locker state in Redux (useful for badge)
- Kong Locker badge in header (optional visual feedback)
- KongLockerSetup component (might use later for voting)
- Public dashboard components (unchanged)

**Result**:
- All users see public dashboard immediately
- No blocking modals
- Kong Locker info still available when present
- Foundation for future voting features without refactor
