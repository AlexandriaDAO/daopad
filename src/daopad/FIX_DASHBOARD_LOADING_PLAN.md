# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-fix-dashboard-loading/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-fix-dashboard-loading/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Deploy & Test** (CRITICAL - This is the verification loop):
   ```bash
   # Frontend changes only
   cd daopad_frontend
   npm run build
   cd ..
   ./deploy.sh --network ic --frontend-only

   # Run E2E tests to verify (MANDATORY)
   cd daopad_frontend
   npx playwright test e2e/app-route.spec.ts
   ```
4. **Analyze Test Results**:
   - IF tests PASS: Continue to step 5
   - IF tests FAIL: Analyze artifacts, form new hypothesis, fix, GOTO step 3
   - Maximum 7 iterations before escalating
5. **Create PR** (ONLY after tests pass):
   ```bash
   git add .
   git commit -m "[Fix]: Public dashboard loading - useEffect timing and dependencies"
   git push -u origin feature/fix-dashboard-loading
   gh pr create --title "[Fix]: Public Dashboard Loading on /app Route" --body "Implements FIX_DASHBOARD_LOADING_PLAN.md

## Problem
E2E tests show public dashboard never loads:
- 0 Redux actions dispatched
- 0 API calls to backend
- Stats show '0' instead of real data

## Root Cause
useEffect timing issue - fetchPublicDashboard dispatch depends on \`isAuthenticated\` but doesn't wait for auth initialization to complete.

## Solution
Add \`authInitialized\` to useEffect dependencies and ensure dispatch only happens after auth state is properly initialized.

## Verification
E2E tests now pass:
- ✅ Redux actions: pending → fulfilled
- ✅ API calls: 4 backend services called
- ✅ UI renders real data

## Test Output
\`\`\`
[Paste actual test output here]
\`\`\`
"
   ```
6. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view --json comments,reviews --jq '.'`
     - Count P0 issues
     - IF P0 > 0: Fix immediately, commit, push, sleep 300s, continue
     - IF P0 = 0: Report success, EXIT
   - After 5 iterations: Escalate to human

## CRITICAL RULES
- ❌ NO questions ("should I?", "want me to?", "is it done?")
- ❌ NO skipping test verification - MUST run E2E tests after EACH deploy
- ❌ NO declaring victory without tests passing - code deployed ≠ success
- ❌ NO stopping after first failure - iterate up to 7 times
- ✅ After deploy: IMMEDIATELY run tests and analyze results
- ✅ Tests passing = success. Nothing else counts.
- ✅ ONLY stop at: tests pass + PR created, max iterations, or error

**Branch:** `feature/fix-dashboard-loading`
**Worktree:** `/home/theseus/alexandria/daopad-fix-dashboard-loading/src/daopad`

---

# Implementation Plan: Fix Public Dashboard Loading

## Problem Statement

The `/app` route displays blank content for non-authenticated users despite PR #86 attempting a fix.

### Evidence from E2E Tests (e2e/app-route.spec.ts)
```
Test Results: 3 passed, 4 failed

Failed Tests:
✗ should load public dashboard data within 30 seconds
✗ should fetch data from all 4 backend services
✗ should update Redux state with dashboard data
✗ should poll every 30 seconds when logged out

Common Failure Pattern:
=== REDUX ACTIONS ===
(No publicDashboard actions found)

=== NETWORK REQUESTS ===
(0 requests captured)

Screenshot Evidence:
- Page loads successfully (header visible, login button present)
- Main content area blank
- Stats show "0" instead of loading skeletons or real data
```

### What We Know
1. ✅ Page loads (HTTP 200)
2. ✅ Components render (PublicStatsStrip, PublicActivityFeed, TreasuryShowcase)
3. ✅ No console errors
4. ❌ Redux `fetchPublicDashboard` never dispatches
5. ❌ No API calls to backend canisters
6. ❌ UI shows default/empty state ("0" for all stats)

## Current State Analysis

### File: `daopad_frontend/src/routes/AppRoute.tsx`

**Auth State** (lines 34-38):
```typescript
const { principal, isAuthenticated } = useSelector(state => state.auth);
const publicStats = useSelector(state => state.dao.publicDashboard.stats);
const { login, identity } = useIdentity();
```

**First useEffect** (lines 42-55) - Auth Initialization:
```typescript
useEffect(() => {
  if (identity) {
    dispatch(setAuthSuccess(principalText));
    dispatch(fetchBalances(identity));
    checkKongLockerCanister();
  } else {
    dispatch(clearAuth());        // Sets isAuthenticated = false
    dispatch(clearBalances());
    dispatch(clearDaoState());
  }
  dispatch(setAuthInitialized(true));  // Signals auth check complete
}, [identity, dispatch]);
```

**Second useEffect** (lines 58-108) - Public Dashboard Fetching:
```typescript
useEffect(() => {
  const startPolling = () => {
    if (!isAuthenticated) {
      // Always dispatch on initial load for anonymous users
      dispatch(fetchPublicDashboard());

      // Only start polling interval if document is visible
      if (!document.hidden) {
        intervalRef.current = setInterval(() => {
          if (!document.hidden) {
            dispatch(fetchPublicDashboard());
          }
        }, 30000);
      }
    }
  };

  // ... visibility handlers ...

  if (!isAuthenticated) {
    startPolling();
  } else {
    stopPolling();
  }

  // ... cleanup ...
}, [isAuthenticated, dispatch]);  // ← Dependencies
```

### Root Cause Hypothesis

**Timing Race Condition:**

The second useEffect depends on `[isAuthenticated, dispatch]` but doesn't wait for auth initialization to complete. Here's what happens:

1. **Component mounts**
   - Redux initial state: `isAuthenticated: false`, `isInitialized: false`
2. **First useEffect runs**
   - Dispatches `clearAuth()` (sets `isAuthenticated: false`)
   - Dispatches `setAuthInitialized(true)`
3. **Second useEffect runs**
   - Checks `if (!isAuthenticated)` → true (from initial state)
   - **BUT**: React batch updates, and the Redux state might not have settled yet
   - The dispatch call might be getting swallowed or not executing in the right context

**Alternative Hypothesis:**

The `isAuthenticated` selector might be pulling from a stale Redux state due to React's batching behavior. The useEffect runs with the initial state value before Redux updates propagate.

**Evidence Supporting This:**
- E2E tests show 0 Redux actions (the dispatch call itself isn't happening)
- If the dispatch WAS happening but failing, we'd see `pending` and `rejected` actions
- The complete absence of actions suggests the `if (!isAuthenticated)` condition is evaluating to `false`

## Implementation Plan

### Hypothesis to Test

**Primary Fix:** Add `authInitialized` to useEffect dependencies and only dispatch after auth initialization completes.

**Why This Should Work:**
- Ensures auth state has settled before checking `isAuthenticated`
- Provides explicit signal that auth check is complete
- Prevents race condition between the two useEffects

### Changes Required

#### File: `daopad_frontend/src/routes/AppRoute.tsx` (MODIFY)

**Line 34** - Add authInitialized to selectors:
```typescript
// PSEUDOCODE
const { principal, isAuthenticated } = useSelector(state => state.auth);
const authInitialized = useSelector(state => state.auth.isInitialized);  // NEW
const publicStats = useSelector(state => state.dao.publicDashboard.stats);
```

**Lines 58-108** - Update second useEffect:
```typescript
// PSEUDOCODE
useEffect(() => {
  // Only proceed if auth initialization is complete
  if (!authInitialized) {
    console.log('[AppRoute] Waiting for auth initialization...');
    return;
  }

  console.log('[AppRoute] Auth initialized, checking authentication state', {
    isAuthenticated,
    authInitialized,
    timestamp: Date.now()
  });

  const startPolling = () => {
    if (!isAuthenticated) {
      console.log('[AppRoute] Dispatching fetchPublicDashboard (anonymous user)');
      dispatch(fetchPublicDashboard());

      // Only start polling interval if document is visible
      if (!document.hidden) {
        intervalRef.current = setInterval(() => {
          if (!document.hidden) {
            console.log('[AppRoute] Polling fetchPublicDashboard');
            dispatch(fetchPublicDashboard());
          }
        }, 30000);
      }
    } else {
      console.log('[AppRoute] User authenticated, skipping public dashboard');
    }
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      stopPolling();
    } else if (!isAuthenticated) {
      stopPolling();
      startPolling();
    }
  };

  if (!isAuthenticated) {
    startPolling();
  } else {
    stopPolling();
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    stopPolling();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, [isAuthenticated, authInitialized, dispatch]);  // UPDATED DEPENDENCIES
```

**Key Changes:**
1. Added `authInitialized` to useSelector (line 36)
2. Added early return if `!authInitialized` (lines 60-63)
3. Added comprehensive console logging for debugging
4. Updated dependency array to include `authInitialized`

### Alternative Fix (If Primary Fails)

If adding `authInitialized` doesn't solve the issue, the problem might be React's batching. In that case:

**Use `useEffect` with `setTimeout` to defer dispatch:**
```typescript
// PSEUDOCODE
useEffect(() => {
  if (!authInitialized) return;

  // Defer dispatch to next tick to ensure Redux state has settled
  const timer = setTimeout(() => {
    if (!isAuthenticated) {
      dispatch(fetchPublicDashboard());
      // ... polling setup
    }
  }, 0);

  return () => clearTimeout(timer);
}, [isAuthenticated, authInitialized, dispatch]);
```

**Why This Works:**
- `setTimeout(fn, 0)` defers execution to the next event loop tick
- Ensures all synchronous Redux updates from first useEffect have completed
- Gives React time to propagate state changes to all subscribers

### Testing Strategy

#### 1. Local Build & Deploy
```bash
cd daopad_frontend
npm run build

cd ..
./deploy.sh --network ic --frontend-only
```

#### 2. Run E2E Tests (CRITICAL)
```bash
cd daopad_frontend
npx playwright test e2e/app-route.spec.ts --timeout=120000
```

#### 3. Analyze Test Results

**Success Criteria** (all must pass):
```
✓ should load public dashboard data within 30 seconds
✓ should fetch data from all 4 backend services
✓ should update Redux state with dashboard data
✓ should render PublicActivityFeed with proposals
✓ should render TreasuryShowcase with treasuries
✓ should handle network failures gracefully
✓ should poll every 30 seconds when logged out

7 tests passed
```

**Success Artifacts:**
```
=== REDUX ACTIONS ===
1. dao/fetchPublicDashboard/pending
2. dao/fetchPublicDashboard/fulfilled

=== NETWORK REQUESTS ===
1. 200 https://ic0.app/api/v2/canister/.../call (getSystemStats)
2. 200 https://ic0.app/api/v2/canister/.../call (listActive)
3. 200 https://ic0.app/api/v2/canister/.../call (listAllStations)
4. 200 https://ic0.app/api/v2/canister/.../call (listAllRegistrations)
```

**If Tests Still Fail:**

1. **Check Console Logs** (from our added logging):
   ```
   [AppRoute] Auth initialized, checking authentication state { isAuthenticated: false, authInitialized: true }
   [AppRoute] Dispatching fetchPublicDashboard (anonymous user)
   ```

   If you DON'T see these logs:
   - The useEffect isn't running
   - Dependencies might still be wrong
   - React might be batching in an unexpected way

2. **Check Screenshots**:
   - Still blank? → useEffect not running
   - Shows loading skeletons? → dispatch happening but thunk failing
   - Shows "0" stats? → dispatch happening, thunk succeeding with empty data

3. **Form New Hypothesis**:
   - Based on logs, determine if it's:
     - A. useEffect not running (wrong dependencies)
     - B. Dispatch happening but silently failing (service initialization)
     - C. Redux state update issue (reducer not updating correctly)

4. **Implement Targeted Fix**:
   - For A: Try alternative fix with setTimeout
   - For B: Check service initialization (getProposalService, etc.)
   - For C: Verify daoSlice reducer handles fulfilled action

5. **Deploy Again and Re-Test** (GOTO step 1)

#### 4. Iteration Guidelines

**Maximum 7 Attempts:**
- Attempt 1: Primary fix (authInitialized dependency)
- Attempt 2: Add setTimeout if primary fails
- Attempt 3: Investigate service initialization
- Attempt 4: Check Redux reducer logic
- Attempt 5: Try combining useEffects into one
- Attempt 6: Debug React batching with useLayoutEffect
- Attempt 7: Nuclear option - force re-render with useState

**After Each Attempt:**
1. Deploy to IC mainnet
2. Run E2E tests
3. Analyze ALL artifacts:
   - Console logs (our debug statements)
   - Redux actions (captured in test)
   - Network requests (captured in test)
   - Screenshots (test-results/*.png)
4. Document findings
5. Form specific hypothesis for next attempt
6. DO NOT GIVE UP until 7 attempts or tests pass

## Success Criteria

### ✅ Tests Must Pass
```bash
cd daopad_frontend
npx playwright test e2e/app-route.spec.ts

# Expected output:
# Running 7 tests using 1 worker
# ✓ should load public dashboard data within 30 seconds
# ✓ should fetch data from all 4 backend services
# ✓ should update Redux state with dashboard data
# ✓ should render PublicActivityFeed with proposals
# ✓ should render TreasuryShowcase with treasuries
# ✓ should handle network failures gracefully
# ✓ should poll every 30 seconds when logged out
#
# 7 passed (2m)
```

### ✅ Data Pipeline Verified

**Network Layer:**
- 4 API calls to backend canisters
- All return 200 OK
- Responses contain valid data

**State Layer:**
- Redux actions dispatched: `pending` → `fulfilled`
- No `rejected` actions
- Store populated with data

**UI Layer:**
- Stats cards show real numbers (not "0")
- PublicActivityFeed renders proposals
- TreasuryShowcase renders treasuries

### ✅ Manual Verification

**Open deployed site:**
```
https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/app
```

**Expected:**
- Page loads immediately (no blank content)
- Stats strip shows real numbers within 5 seconds
- Activity feed shows recent proposals
- Treasury showcase shows token treasuries
- No console errors in browser DevTools

## Debugging Checklist

Use this when tests fail to systematically analyze the problem:

- [ ] **Deploy completed successfully** - Check build output for errors
- [ ] **IC canister updated** - Verify asset hash changed
- [ ] **Test ran against new deploy** - Clear browser cache between tests
- [ ] **Screenshots captured** - Check test-results/*.png
- [ ] **Console logs present** - Our debug statements visible in test output
- [ ] **Redux actions logged** - Check if ANY actions dispatched
- [ ] **Network requests logged** - Check if ANY IC calls made
- [ ] **Auth state correct** - isAuthenticated should be false, isInitialized true
- [ ] **useEffect running** - Console.log should show execution
- [ ] **Dispatch called** - Log should show "Dispatching fetchPublicDashboard"
- [ ] **Thunk executed** - Redux pending action should appear
- [ ] **Services initialized** - Check if getProposalService(null) works
- [ ] **Promise.all resolved** - Check if all 4 backend calls succeeded

## Files Modified

**MODIFIED:**
- `daopad_frontend/src/routes/AppRoute.tsx` (lines 34-108)
  - Add authInitialized selector
  - Add early return if !authInitialized
  - Add comprehensive logging
  - Update useEffect dependency array

**UNCHANGED:**
- `daopad_frontend/src/features/auth/authSlice.ts` (already has isInitialized)
- `daopad_frontend/src/features/dao/daoSlice.ts` (fetchPublicDashboard already correct)
- `daopad_frontend/e2e/app-route.spec.ts` (tests already exist)

## Reference Materials

### Playwright Testing Guide
See `PLAYWRIGHT_TESTING_GUIDE.md` for:
- Common failure patterns
- How to analyze test artifacts
- What to capture (network, Redux, console)
- Debugging workflow
- Real-world examples

### Related PRs
- **PR #85**: Treasury E2E tests (SUCCESS) - Shows proper test-driven debugging
- **PR #86**: App route tests (INCOMPLETE) - Where the first agent gave up

**Key Lesson from PR #86:**
The first agent:
1. Identified bug (document.hidden)
2. Deployed fix
3. Tests still failed
4. Said "I'm stuck" and stopped

**What THIS agent must do:**
1. Identify bug (authInitialized timing)
2. Deploy fix
3. Run tests
4. If tests fail: analyze artifacts, form new hypothesis, fix
5. Repeat step 4 up to 7 times
6. Only stop when tests pass ✅

## Commands Reference

### Build & Deploy
```bash
# From /home/theseus/alexandria/daopad-fix-dashboard-loading/src/daopad/

# Frontend only
cd daopad_frontend
npm run build
cd ..
./deploy.sh --network ic --frontend-only
```

### Test Execution
```bash
# Run all app route tests
cd daopad_frontend
npx playwright test e2e/app-route.spec.ts

# Run single test (debugging)
npx playwright test e2e/app-route.spec.ts -g "should load public dashboard"

# Run with headed browser (watch execution)
npx playwright test e2e/app-route.spec.ts --headed

# Run with debug mode (step through)
npx playwright test e2e/app-route.spec.ts --debug
```

### Test Analysis
```bash
# View screenshots
ls -lht daopad_frontend/test-results/*.png | head -5

# Check latest screenshot
open daopad_frontend/test-results/app-route-failure-*.png

# View HTML report
npx playwright show-report
```

### Git Operations
```bash
# Stage changes
git add daopad_frontend/src/routes/AppRoute.tsx

# Commit
git commit -m "[Fix]: Add authInitialized dependency to public dashboard useEffect"

# Push
git push -u origin feature/fix-dashboard-loading

# Create PR (ONLY after tests pass!)
gh pr create --title "[Fix]: Public Dashboard Loading" --body "..."
```

## Post-Implementation

### When Tests Pass

1. **Document Test Results in PR**:
   - Paste full test output
   - Include screenshots showing loaded data
   - Show Redux action sequence
   - Show network request logs

2. **Manual Smoke Test**:
   - Open incognito window
   - Navigate to /app
   - Verify data loads within 5 seconds
   - Check browser DevTools for errors

3. **Notify User**:
   ```
   ✅ Public dashboard loading fixed!

   - E2E tests: 7/7 passing
   - Data flow verified: Backend → Redux → UI
   - PR created: https://github.com/AlexandriaDAO/daopad/pull/XXX

   The root cause was: [explain what you found]
   The fix was: [explain what you changed]
   ```

### If Max Iterations Reached

After 7 attempts without success:

1. **Document All Attempts**:
   ```
   Attempted 7 different fixes:
   1. Added authInitialized dependency - Tests still fail
   2. Added setTimeout(0) - Tests still fail
   3. Checked service initialization - Services work
   4. Verified Redux reducer - Reducer correct
   5. Combined useEffects - Tests still fail
   6. Tried useLayoutEffect - Tests still fail
   7. Forced re-render - Tests still fail

   Common failure pattern across all attempts:
   - [Describe what you consistently observed]
   ```

2. **Provide Evidence**:
   - Screenshots from all 7 attempts
   - Console logs showing what DID happen
   - Network captures (or lack thereof)
   - Redux action logs (or lack thereof)

3. **Request Human Intervention**:
   ```
   Escalating to human: After 7 systematic attempts with full E2E testing,
   the issue persists. All attempts documented in commit history.

   Current hypothesis: [Your best guess at this point]
   Recommended next step: [What you think should be tried next]
   ```

## Final Reminder

**Success = Tests Passing**

Nothing else matters:
- ❌ Code looks good → Not success
- ❌ Deployed successfully → Not success
- ❌ Manual testing works → Not success
- ✅ E2E tests pass → SUCCESS!

**Iterate Until Victory**

The first agent gave up after 1 failure. You have 7 attempts. Use them all if needed. Each failure teaches us something. Analyze, hypothesize, fix, test, repeat.

**Read the Playwright Guide**

Before starting, read `PLAYWRIGHT_TESTING_GUIDE.md` sections:
- "Common Failure Patterns" (avoid past mistakes)
- "Debugging Workflow" (systematic analysis)
- "What to Capture" (comprehensive instrumentation)

Now go fix it! 🚀
