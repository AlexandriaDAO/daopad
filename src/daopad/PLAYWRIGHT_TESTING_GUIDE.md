# Playwright Testing Guide for DAOPad

## 🚨 CRITICAL: Never Kill Tests Early!

**The #1 mistake**: Killing Playwright tests when they start failing/timing out.

### What Happens When You Kill Tests Early

```bash
# ❌ BAD - You lose critical error information
npx playwright test
# Test starts timing out...
# You press Ctrl+C or kill the process
# Result: No console errors, no failure details, no clues
```

**Real Example from PR #95**:
- Saw tests timing out → Killed process
- Lost console errors showing "invalid BigInt syntax"
- Deployed 5 times fixing bugs one-by-one
- **Should have**: Let tests complete, seen ALL errors in one run

### ✅ ALWAYS Let Tests Complete

```bash
npx playwright test e2e/treasury.spec.ts --project=chromium
# Even if tests timeout (2 minutes+), LET THEM FINISH
# Wait for: "X passed, Y failed" summary
```

**Why**:
1. Console errors appear in `afterEach` hooks (after test completes)
2. Screenshots saved on failure (need test to finish)
3. Network capture logged at end (not during timeout)
4. Multiple issues visible in single test run

### What You Get By Waiting

```
=== CONSOLE ERRORS ===
1. SyntaxError: invalid BigInt syntax (orbitSlice.ts:99)
2. TypeError: can't convert BigInt to number (AccountsTable.tsx:297)

=== REDUX ACTIONS ===
1. orbit/fetchAccounts/pending
2. orbit/fetchAccounts/fulfilled  ← Shows data DID load!

=== SCREENSHOTS ===
test-results/treasury-failure-1234.png  ← Visual proof of issue
```

**Result**: See ALL bugs at once instead of one-per-deployment iteration.

---

## ⚠️ CRITICAL LIMITATION: Internet Identity Authentication

**Playwright CANNOT automate Internet Identity authentication in this project.**

### Why Authenticated Tests Don't Work

After extensive testing (PR #91), we discovered:

1. **II stores auth in IndexedDB** - Playwright's `storageState` only captures localStorage/cookies
2. **Persistent contexts not supported** - `launchPersistentContext` incompatible with test runner
3. **Every workaround fails** - No way to persist II delegation between test runs

### What This Means

✅ **Public/Anonymous Features** - Playwright works perfectly (see `app-route.spec.ts`)
❌ **Authenticated Features** - Require manual browser testing (treasury, proposals, etc.)

**Recommendation**: Use Playwright ONLY for public features. Test authenticated features manually in browser.

### Standard Test Station (Use This For All Tests)

**Token**: ALEX (ysy5f-2qaaa-aaaap-qkmmq-cai)
**Station**: fec7w-zyaaa-aaaaa-qaffq-cai
**URL Pattern**: `https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/treasury`

Always use this station for testing - it's the reference implementation. Ignore other stations until core functionality is stable.

### ⚠️ CRITICAL: Token ID Consistency in Tests

**The #2 mistake**: Using different token IDs across test files, causing failures.

**Problem Example**:
```typescript
// ❌ settings.spec.ts uses WRONG token ID
await page.goto('https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/dao/2ouva-viaaa-aaaaq-qaamq-cai/settings');

// ❌ canisters.spec.ts uses DIFFERENT wrong token ID
await page.goto('https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/dao/7yyrc-6qaaa-aaaap-qhega-cai/canisters');

// ✅ app-route.spec.ts uses CORRECT ALEX token ID
await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/overview');
```

**Why This Matters**:
- Wrong token IDs cause 30s+ timeouts
- Tests fail even though code is correct
- Wastes deployment cycles debugging imaginary bugs
- Frontend canister ID is also wrong in bad examples (qaffq vs qp2ra)

**Fix**: Always use ALEX token for ALL tab tests:
- ✅ Token ID: `ysy5f-2qaaa-aaaap-qkmmq-cai`
- ✅ Frontend: `l7rlj-6aaaa-aaaap-qp2ra-cai` (note: qp2ra, not qaffq)
- ✅ Station: `fec7w-zyaaa-aaaaa-qaffq-cai`

---

## Current Test Status (as of PR #99)

| Tab | Status | Tests Passing | Notes |
|-----|--------|---------------|-------|
| **Overview** | ✅ Working | 7/7 (100%) | Fully functional for anonymous users |
| **Activity** | ✅ Working | 9/10 (90%) | One perf timeout, but functionally correct |
| **Treasury** | ✅ Working | Unknown | Fixed in PR #95, likely passing |
| **Canisters** | ❌ Broken | 0/3 (0%) | Wrong token ID in tests |
| **Settings** | ❌ Broken | 0/2 (0%) | Wrong token ID in tests |
| **Agreement** | ⚠️ Untested | - | No E2E tests yet |

**Performance Expectations**:
- ✅ **10-13s load time**: Acceptable (IC queries + Redux + rendering)
- ⚠️ **30s+ timeout**: Likely wrong token ID or broken data loading
- ❌ **2m timeout**: Critical failure (security dashboard is exception - takes 60s)

**Next Steps**:
1. Fix Canisters tab (update token ID in tests)
2. Fix Settings tab (update token ID in tests)
3. Add Agreement tab tests
4. Consider performance optimizations after all tabs work

---

## Real Bug Found: Treasury Data Not Loading for Anonymous Users (PR #94)

**Bug Discovery**: Playwright test navigated to `/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/treasury` and found:
- ✅ DaoRoute loaded: Token ID → "YSY5F DAO"
- ✅ Station fetched: `fec7w-zyaaa-aaaaa-qaffq-cai`
- ✅ Page rendered: `treasury-overview` element exists
- ❌ **Zero treasury accounts displayed**

**Root Cause** (AccountsTable.tsx:48):
```typescript
if (stationId && identity && tokenId) {
  dispatch(fetchOrbitAccounts({ ... }));
}
```

Anonymous users have `identity = null`, so treasury data never fetches even though:
1. Backend supports anonymous queries (acts as admin proxy)
2. Station ID successfully loaded
3. UI components all rendered

**Test Evidence**:
```
Station info: ✓ Treasury Station: fec7w-zyaaa-aaaaa-qaffq-cai
Treasury accounts found: 0  ← Should be 4!
Network requests: 0 list_orbit_accounts calls ← Never triggered
```

**Fix Required**: AccountsTable should fetch data when `stationId && tokenId` (make identity optional for read-only view).

**Lesson**: Tests correctly identified that new routing works BUT exposed existing bug in data loading logic. This is exactly what integration tests should catch!

---

## Core Philosophy: Data-Driven Integration Testing

**When applicable** (public features only), Playwright tests verify **backend-to-frontend data flow**, NOT superficial UI element existence.

### What We Test (Public Features Only)
✅ **Backend canister responses** - IC canister calls succeed with valid data
✅ **Redux state updates** - Thunks execute and populate store correctly
✅ **Data transformation** - Backend responses correctly map to UI state
✅ **Error handling** - Network failures and invalid data handled gracefully
✅ **Public dashboards** - Anonymous user data loading

### What We DON'T Test
❌ **Element existence** - "Does button exist?" (false confidence)
❌ **Static content** - "Does text say 'Dashboard'?" (meaningless)
❌ **CSS properties** - "Is button blue?" (not our concern)
❌ **Superficial interactions** - "Click works?" without verifying backend impact
❌ **Authenticated features** - II auth incompatible with Playwright automation

---

## Required Testing Workflow: Deploy → Test → Iterate

### ⚠️ CRITICAL RULE: Tests Run Against Deployed Code

**Problem**: Local code changes don't affect deployed IC canisters.

**Reality Check**:
```typescript
// ❌ WRONG MENTAL MODEL
Edit AppRoute.tsx locally → Run npx playwright test → See results

// ✅ CORRECT WORKFLOW
Edit AppRoute.tsx locally → Deploy to IC mainnet → Run tests → See results
```

**Why**: Playwright tests hit `https://canister-id.icp0.io/` (live deployed code), NOT your local filesystem.

### The Deploy → Test → Iterate Loop

```bash
# 1. Make code changes
vim src/daopad/daopad_frontend/src/routes/AppRoute.tsx

# 2. Deploy to mainnet (MANDATORY before testing)
cd src/daopad
./deploy.sh --network ic

# 3. Run tests against deployed code
cd daopad_frontend
npx playwright test e2e/treasury.spec.ts

# 4. If tests FAIL:
#    - Analyze failure artifacts (screenshots, logs, network captures)
#    - Form hypothesis about root cause
#    - Make targeted fix
#    - GOTO step 2 (deploy again)

# 5. If tests PASS:
#    - Commit changes
#    - Create/update PR
#    - SUCCESS ✅
```

### ❌ ANTI-PATTERN: Declaring Victory Without Evidence

**Bad Agent Behavior** (from PR #86):
```
Agent: "The fix is solid! Here's the commit."
[Deploys code]
Agent: "✅ Success! The bug is fixed."
[Never runs tests]
User: "Did you verify it works?"
Agent: "Um... let me test..."
[Tests fail]
Agent: "I'm stuck."
```

**Good Agent Behavior**:
```
Agent: "I believe the fix is in line 71. Let me deploy and verify."
[Deploys code]
[Runs tests]
Agent: "Tests show 0 Redux actions dispatched. My hypothesis was wrong."
Agent: "New hypothesis: isAuthenticated initialization timing."
[Makes new fix]
[Deploys again]
[Runs tests]
Agent: "Tests pass! Verified: 4 API calls, Redux fulfilled, UI renders data."
```

**Rule**: Tests passing = success. Code deployed ≠ success.

---

## Common Failure Patterns (Lessons Learned)

### 1️⃣ Testing Local Code Against Deployed Canister

**Symptom**: Added console.log() for debugging, but logs never appear in test output.

**Root Cause**: Tests hit deployed canister, not local code with your debug logs.

**Fix**:
```bash
# Add logging
vim src/routes/AppRoute.tsx
# Add: console.log('[DEBUG] useEffect triggered', { isAuthenticated });

# Deploy changes (this is the step that was missed!)
cd src/daopad
./deploy.sh --network ic --frontend-only

# NOW your logs will appear
npx playwright test e2e/app-route.spec.ts
```

### 2️⃣ Wrong Canister ID in Config

**Real Bug** (PR #86, commit 5538a46):
```typescript
// ❌ WRONG (returned HTTP 400)
baseURL: 'https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io'

// ✅ CORRECT
baseURL: 'https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io'
//                            ^^^^^ - one character wrong!
```

**Detection**:
- Screenshot shows "Error 400: Canister ID Not Resolved"
- All tests fail immediately
- Network tab shows no requests to IC

**Prevention**: Always verify canister ID matches `canister_ids.json`:
```bash
cat canister_ids.json | jq '.daopad_frontend.ic'
# "l7rlj-6aaaa-aaaap-qp2ra-cai" ← use this!
```

### 3️⃣ Surface-Level Assertions (False Confidence)

**Bad Test** (marketing, not validation):
```typescript
test('treasury tab works', async ({ page }) => {
  await page.goto('/dao/token-id');
  await page.click('[data-testid="treasury-tab"]');

  // ❌ Only checks UI rendered, not data
  const tab = page.locator('[data-testid="treasury-tab"]');
  await expect(tab).toBeVisible();
});
```

**Good Test** (verifies data flow):
```typescript
test('treasury tab loads real account data', async ({ page }) => {
  const accountsData: any = { captured: false };

  // Capture backend response
  page.on('response', async (response) => {
    if (response.url().includes('list_orbit_accounts')) {
      const data = await response.json();
      accountsData.captured = true;
      accountsData.payload = data;
    }
  });

  await page.goto('/dao/token-id');
  await page.click('[data-testid="treasury-tab"]');

  // Wait for data to load
  await page.waitForTimeout(5000);

  // ✅ Verify backend was called
  expect(accountsData.captured).toBe(true);

  // ✅ Verify response format
  expect(accountsData.payload.Ok).toBeDefined();
  expect(accountsData.payload.Ok.accounts).toBeDefined();
  expect(Array.isArray(accountsData.payload.Ok.accounts)).toBe(true);

  // ✅ Verify UI shows the data
  const accountCards = await page.$$('[data-testid="treasury-account"]');
  expect(accountCards.length).toBeGreaterThan(0);
  expect(accountCards.length).toBe(accountsData.payload.Ok.accounts.length);
});
```

### 4️⃣ Stopping at First Failure (Not Iterating)

**Bad**:
```
Test fails → Analyze → Make guess → Deploy → Test fails again → "I'm stuck"
```

**Good**:
```
Test fails → Analyze → Form hypothesis → Deploy → Test fails → New hypothesis → Deploy → Test fails → Add targeted logging → Deploy → Test fails → See evidence in logs → Make precise fix → Deploy → Tests pass ✅
```

**Maximum iterations**: 5-7 attempts is reasonable for complex bugs.

### 4️⃣b The "One Bug Per Deploy" Anti-Pattern (PR #95)

**Problem**: Fixing one bug per deployment when multiple bugs exist.

**Real Example - What Happened**:
```
Deploy 1: Fix identity check → Still broken (missing routes)
Deploy 2: Merge master routes → Still broken (wrong parameter)
Deploy 3: Fix stationId→tokenId → Still broken (BigInt syntax)
Deploy 4: Fix BigInt conversion → Still broken (BigInt in Math.min)
Deploy 5: Fix Math.min BigInt → WORKS! ✅
```

**5 deployments to fix 5 bugs that could have been caught in ONE test run!**

**What Should Have Happened**:
```
Deploy 1: All code changes
Run Playwright: Let it complete fully
See in console capture:
  - "No routes matched location" (routing issue)
  - "invalid BigInt syntax" (orbitSlice.ts:99)
  - "can't convert BigInt to number" (AccountsTable.tsx:297)
Fix ALL THREE bugs
Deploy 2: Works! ✅
```

**Prevention**:
1. **NEVER kill Playwright tests early** - Wait for full completion
2. **Read ALL console errors** - Not just the first one
3. **Check for patterns** - Multiple BigInt errors = systemic issue
4. **Fix all discovered issues together** - One deployment, not five

### 5️⃣ Console Error Capture Not Working

**Problem**: Tests show `=== CONSOLE ERRORS ===` section but it's empty, even though browser console shows errors.

**Root Cause**: Console event listener might not be set up correctly or errors logged after test teardown.

**Verification**:
```typescript
// Add test to verify console capture works
test('console error capture test', async ({ page }) => {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log('[CAPTURED ERROR]:', msg.text());
    }
  });

  await page.evaluate(() => {
    console.error('TEST: This should be captured');
  });

  await page.waitForTimeout(1000);
  expect(errors.length).toBeGreaterThan(0); // ← Verifies capture works
});
```

**Solution**: If capture isn't working, fall back to manual browser testing and trust those console logs as the source of truth.

### 6️⃣ Manual Browser Logs vs Playwright Output

**When to trust manual browser testing**:
- Playwright shows empty console errors
- Tests timeout with no diagnostic info
- You see errors in browser DevTools that tests don't capture

**Process**:
1. Open browser (incognito): `https://canister-id.icp0.io/route`
2. Open DevTools → Console
3. Copy ALL errors exactly as shown
4. Fix errors based on browser console (it's more reliable than broken test capture)
5. Deploy
6. Verify in browser again
7. THEN run Playwright to confirm

**Real Example (PR #95)**:
```
Browser Console:
  - "SyntaxError: invalid BigInt syntax (orbitSlice.ts:99)"
  - "TypeError: can't convert BigInt to number (AccountsTable.tsx:297)"

Playwright Output:
  - "=== CONSOLE ERRORS ===" (empty)

Decision: Trust browser console, fix both issues, deploy, verify
```

### 7️⃣ Insufficient Test Instrumentation

**Problem**: Test fails but you have no idea why.

**Solution**: Comprehensive capture in `beforeEach`:

```typescript
test.beforeEach(async ({ page }) => {
  // 1. Monitor console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('[Browser Console]:', msg.text());
    }
  });

  // 2. Monitor network requests
  page.on('response', async (response) => {
    if (response.url().includes('ic0.app/api') ||
        response.url().includes('lwsav-iiaaa-aaaap-qp2qq-cai')) {
      const data = await response.text().catch(() => 'binary');
      networkRequests.push({
        url: response.url(),
        status: response.status(),
        response: data
      });

      if (!response.ok()) {
        console.error(`[Network Error] ${response.status()} ${response.url()}`);
      }
    }
  });

  // 3. Monitor Redux actions (inject debug script)
  await page.addInitScript(() => {
    (window as any).__REDUX_LOG__ = [];

    const interval = setInterval(() => {
      const store = (window as any).store;
      if (store?.dispatch) {
        const original = store.dispatch;
        store.dispatch = function(action: any) {
          (window as any).__REDUX_LOG__.push({
            type: action.type,
            timestamp: Date.now()
          });
          return original.apply(this, arguments);
        };
        clearInterval(interval);
      }
    }, 100);
  });
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== 'passed') {
    // 4. Log all captured data
    console.log('\n=== CONSOLE ERRORS ===');
    consoleErrors.forEach((err, i) => console.log(`${i+1}. ${err}`));

    console.log('\n=== NETWORK REQUESTS ===');
    networkRequests.forEach((req, i) => {
      console.log(`${i+1}. ${req.status} ${req.url}`);
      console.log(`   Response: ${req.response.substring(0, 200)}`);
    });

    console.log('\n=== REDUX ACTIONS ===');
    const reduxLog = await page.evaluate(() => (window as any).__REDUX_LOG__);
    reduxLog.forEach((action, i) => console.log(`${i+1}. ${action.type}`));

    // 5. Screenshot
    await page.screenshot({
      path: `test-results/failure-${testInfo.title}-${Date.now()}.png`,
      fullPage: true
    });
  }
});
```

---

## What to Capture in Tests

### Network Layer: IC Canister Calls

**Purpose**: Verify backend APIs are called and return valid data.

```typescript
const backendCalls: Array<{ method: string, status: number, response: any }> = [];

page.on('response', async (response) => {
  const url = response.url();

  // Capture DAOPad backend calls
  if (url.includes('lwsav-iiaaa-aaaap-qp2qq-cai') ||
      url.includes('ic0.app/api')) {

    const method = extractMethodFromUrl(url); // Custom parser
    const data = await response.text();

    backendCalls.push({
      method: method,
      status: response.status(),
      response: data
    });
  }
});

// In test assertions:
expect(backendCalls.some(c => c.method === 'list_orbit_accounts')).toBe(true);
expect(backendCalls.filter(c => c.status >= 400).length).toBe(0);
```

### State Layer: Redux Actions

**Purpose**: Verify Redux thunks execute and update store correctly.

```typescript
// Inject Redux spy
await page.addInitScript(() => {
  (window as any).__REDUX_ACTIONS__ = [];

  const pollForStore = setInterval(() => {
    const store = (window as any).store;
    if (store?.dispatch) {
      const originalDispatch = store.dispatch;
      store.dispatch = function(action: any) {
        (window as any).__REDUX_ACTIONS__.push({
          type: action.type,
          payload: action.payload,
          timestamp: Date.now()
        });
        return originalDispatch.apply(this, arguments);
      };
      clearInterval(pollForStore);
    }
  }, 50);
});

// In test:
await page.waitForTimeout(10000); // Allow time for async thunks

const actions = await page.evaluate(() => (window as any).__REDUX_ACTIONS__);

// Verify action sequence
const pending = actions.find(a => a.type === 'dao/fetchPublicDashboard/pending');
const fulfilled = actions.find(a => a.type === 'dao/fetchPublicDashboard/fulfilled');
const rejected = actions.find(a => a.type === 'dao/fetchPublicDashboard/rejected');

expect(pending).toBeDefined();
expect(fulfilled).toBeDefined();
expect(rejected).toBeUndefined();

// Verify payload structure
if (fulfilled?.payload) {
  expect(fulfilled.payload.stats).toBeDefined();
  expect(fulfilled.payload.treasuries).toBeDefined();
}
```

### UI Layer: Component Rendering

**Purpose**: Verify components render data from Redux state (not just that they exist).

```typescript
// ❌ BAD: Only checks element exists
await expect(page.locator('[data-testid="stat-card"]')).toBeVisible();

// ✅ GOOD: Checks data is rendered
const statCards = await page.$$('[data-testid="stat-card"]');
expect(statCards.length).toBe(4); // Specific number expected

const firstStat = statCards[0];
const value = await firstStat.locator('[data-testid="stat-value"]').textContent();
expect(value).not.toBe('0'); // Should have real data
expect(value).not.toContain('Loading'); // Should not be stuck loading
```

### Error Layer: Console and Boundaries

**Purpose**: Catch React errors, network failures, and unexpected exceptions.

```typescript
const consoleErrors: string[] = [];

page.on('console', (msg) => {
  if (msg.type() === 'error') {
    consoleErrors.push(msg.text());
  }
});

// After test actions:
expect(consoleErrors.length).toBe(0);

if (consoleErrors.length > 0) {
  throw new Error(`Console errors found:\n${consoleErrors.join('\n')}`);
}

// Check for error boundaries
const errorBoundary = await page.locator('[data-testid="error-boundary"]').count();
expect(errorBoundary).toBe(0);
```

---

## Success Criteria: When to Consider a Test "Done"

### ✅ Test Passes After Deployment

```bash
./deploy.sh --network ic
npx playwright test e2e/feature.spec.ts

# Output:
# ✓ should load data within 30 seconds
# ✓ should render 4 stat cards
# ✓ should fetch from backend successfully
# All tests passed (3/3)

# ← THIS is success
```

### ✅ All Three Layers Verified

1. **Network**: Backend canister called, returned 200, valid payload
2. **State**: Redux actions dispatched (pending → fulfilled), store updated
3. **UI**: Components rendered with data from store

### ✅ Real Data Flows Through Pipeline

```typescript
// Full pipeline verification example:
test('treasury data flows from Orbit Station to UI', async ({ page }) => {
  let orbitResponse: any = null;
  let reduxPayload: any = null;

  // 1. Capture network response
  page.on('response', async (response) => {
    if (response.url().includes('list_orbit_accounts')) {
      orbitResponse = await response.json();
    }
  });

  // 2. Capture Redux action
  await page.addInitScript(() => {
    (window as any).__CAPTURE__ = null;
    const poll = setInterval(() => {
      const store = (window as any).store;
      if (store) {
        const original = store.dispatch;
        store.dispatch = function(action: any) {
          if (action.type.includes('orbit')) {
            (window as any).__CAPTURE__ = action.payload;
          }
          return original.apply(this, arguments);
        };
        clearInterval(poll);
      }
    }, 50);
  });

  await page.goto('/dao/token-id');
  await page.click('[data-testid="treasury-tab"]');
  await page.waitForTimeout(5000);

  reduxPayload = await page.evaluate(() => (window as any).__CAPTURE__);

  // 3. Verify data consistency through pipeline
  expect(orbitResponse.Ok.accounts.length).toBeGreaterThan(0);
  expect(reduxPayload.accounts.length).toBe(orbitResponse.Ok.accounts.length);

  // 4. Verify UI renders the same data
  const accountCards = await page.$$('[data-testid="treasury-account"]');
  expect(accountCards.length).toBe(orbitResponse.Ok.accounts.length);
});
```

### ❌ NOT Success: Partial Verification

```typescript
// ❌ Test passes but doesn't verify data
test('page loads', async ({ page }) => {
  await page.goto('/dao/token-id');
  await expect(page.locator('h1')).toBeVisible();
  // ← Meaningless! No backend, no Redux, no data verified
});
```

---

## Debugging Workflow: When Tests Fail

### Step 1: Analyze Test Artifacts

```bash
# Run test
npx playwright test e2e/feature.spec.ts

# Check screenshots
ls -lht test-results/*.png | head -5

# View latest failure
open test-results/feature-failure-timestamp.png
```

**What to Look For**:
- **Blank page**: Wrong canister ID or deployment failure
- **Error 400**: Canister ID not resolved (check playwright.config.ts)
- **Loading spinners**: Data not loading (network/Redux issue)
- **Empty states**: Backend returns no data (check if data exists in production)
- **Error boundaries**: React crash (check console errors)

### Step 2: Review Console Errors

```
[Browser Console Error]: TypeError: Cannot read property 'toText' of undefined
```

**Interpretation**: Frontend trying to access data that doesn't exist. Either:
- Backend response format changed (breaking contract)
- Redux state not populated (thunk failed)
- Component not handling null/undefined properly

### Step 3: Check Network Requests

```
[Network Error] 500 https://ic0.app/api/v2/canister/xxx/call
Response: {"Err":"Canister rejected the call"}
```

**Interpretation**: Backend canister has a runtime error. Probably:
- Invalid candid decode (backend signature changed)
- Backend panic/trap (logic error)
- Permission denied (caller not authorized)

### Step 4: Examine Redux Actions

```
=== REDUX ACTIONS ===
1. dao/fetchPublicDashboard/pending
2. dao/fetchPublicDashboard/rejected

No fulfilled action!
```

**Interpretation**: Redux thunk executed but failed. Check:
- Network requests (did backend calls fail?)
- Error payload in rejected action
- Whether service initialization succeeded

### Step 5: Form Hypothesis

**Good Hypothesis** (specific, testable):
```
"The useEffect at AppRoute.tsx:58 isn't dispatching because
isAuthenticated is incorrectly true on initial page load,
preventing the !isAuthenticated condition from being met."
```

**Bad Hypothesis** (vague, not actionable):
```
"Something is wrong with the Redux state."
```

### Step 6: Add Targeted Logging

```typescript
// AppRoute.tsx
useEffect(() => {
  console.log('[DEBUG] Auth state:', {
    isAuthenticated,
    identity: identity?.getPrincipal().toString(),
    timestamp: Date.now()
  });

  if (!isAuthenticated) {
    console.log('[DEBUG] Dispatching fetchPublicDashboard');
    dispatch(fetchPublicDashboard());
  } else {
    console.log('[DEBUG] NOT dispatching - user authenticated');
  }
}, [isAuthenticated, dispatch]);
```

### Step 7: Deploy and Re-Test

```bash
cd src/daopad
./deploy.sh --network ic --frontend-only
cd daopad_frontend
npx playwright test e2e/feature.spec.ts

# Check logs for your debug output
```

### Step 8: Iterate Until Tests Pass

**Maximum 5-7 iterations** is reasonable. If still failing after 7 attempts:
1. Review your hypotheses - are you testing the right thing?
2. Simplify - can you isolate the problem to one component/function?
3. Ask for help - describe what you've tried and what evidence you've gathered

---

## Real-World Example: PR #85 (Success) vs PR #86 (Incomplete)

### PR #85: Treasury E2E Tests ✅

**Bug Found**: Backend function signature mismatch
```rust
// ❌ BEFORE: Frontend can't call this (no station_id)
pub async fn list_orbit_accounts(
    station_id: Principal,  // Frontend doesn't have this!
    ...
)

// ✅ AFTER: Frontend provides token_id, backend looks up station
pub async fn list_orbit_accounts(
    token_canister_id: Principal,
    ...
) {
    let station_id = TOKEN_ORBIT_STATIONS.with(...)?;
    // Now works!
}
```

**How Test Found It**:
```typescript
test('should successfully call list_orbit_accounts', async ({ page }) => {
  const networkCalls: Array<{url: string, response: string}> = [];

  page.on('response', async (response) => {
    if (url.includes('list_orbit_accounts')) {
      const data = await response.text();
      networkCalls.push({ url, response: data });
    }
  });

  await page.goto('/dao/token-id');
  await page.click('[data-testid="treasury-tab"]');
  await page.waitForTimeout(5000);

  // ✅ This caught the bug:
  expect(networkCalls.length).toBeGreaterThan(0);
  const hasError = networkCalls.some(call =>
    call.response.includes('has no update method')
  );
  expect(hasError).toBe(false); // ← FAILED before fix, PASSED after
});
```

**Result**: Bug fixed, tests pass, real value delivered.

### PR #86: App Route Tests ⚠️ (Incomplete)

**Bug Suspected**: `document.hidden` blocking dispatch

**Fix Deployed**:
```typescript
// Removed document.hidden check from initial dispatch
if (!isAuthenticated) {
  dispatch(fetchPublicDashboard()); // ← Should always fire now
}
```

**Test Result**:
```
✗ should load public dashboard data within 30 seconds

=== REDUX ACTIONS ===
(No publicDashboard actions found)

=== NETWORK REQUESTS ===
(0 requests captured)
```

**Agent Response**: "I'm stuck."

**What Should Have Happened**:
1. See tests fail after deploy
2. Form new hypothesis: "Maybe isAuthenticated is incorrectly true?"
3. Add logging to verify isAuthenticated value
4. Deploy again
5. Check logs: "isAuthenticated: false, but still no dispatch?"
6. New hypothesis: "Maybe useEffect deps are wrong?"
7. Check dependency array: `[isAuthenticated, dispatch]`
8. New hypothesis: "Maybe dispatch identity changes on each render?"
9. Add `useCallback` to stabilize dispatch
10. Deploy and test
11. Keep iterating until tests pass

**Lesson**: Tests correctly identified the fix didn't work. The failure was in the debugging process, not the tests.

---

## Integration with DAOPad Workflow

### When to Write Playwright Tests

✅ **Write tests for PUBLIC features**:
- Public dashboards and statistics
- Anonymous user data loading
- Homepage and marketing pages
- Features that DON'T require authentication

❌ **Don't write Playwright tests for**:
- **Authenticated features** (treasury, proposals, voting) - **II auth incompatible**
- Static pages (About, FAQ) - not worth testing
- Simple UI components without backend dependencies
- One-off debugging (use browser DevTools instead)

### For Authenticated Features

Since Playwright can't handle II authentication:

**Manual Testing Checklist** (do this in browser):
1. Login with II
2. Navigate to feature (treasury, proposals, etc.)
3. Verify backend calls in Network tab
4. Check Redux state in Redux DevTools
5. Verify UI renders correct data
6. Test error scenarios manually

**Document Test Cases** (for future reference):
- Write test scenarios in comments/docs
- List what should be verified
- Keep for when/if auth solution is found

### Test File Organization

```
daopad_frontend/
├── e2e/
│   ├── setup/
│   │   └── auth.setup.ts          # One-time II login
│   ├── helpers/
│   │   └── auth.ts                # Auth utilities
│   ├── treasury.spec.ts           # Treasury tab integration
│   ├── proposals.spec.ts          # Proposal CRUD + voting
│   ├── app-route.spec.ts          # Public dashboard
│   └── voting.spec.ts             # Kong Locker integration
└── playwright.config.ts
```

### Running Tests in CI/CD

**After every mainnet deployment**:
```bash
# In .github/workflows/deploy.yml
- name: Deploy to IC
  run: |
    cd src/daopad
    ./deploy.sh --network ic

- name: Run E2E Tests
  run: |
    cd src/daopad/daopad_frontend
    npx playwright install chromium
    npx playwright test

- name: Upload Test Results
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: daopad_frontend/playwright-report/
```

---

## Checklist: Before Submitting PR with Playwright Tests

- [ ] Tests run against **deployed IC canister** (not local code)
- [ ] All tests **pass** after final deployment
- [ ] Tests capture **network requests** (IC canister calls)
- [ ] Tests verify **Redux actions** (pending → fulfilled, not rejected)
- [ ] Tests check **UI renders real data** (not just element existence)
- [ ] Tests handle **both success and error states**
- [ ] Screenshots show **actual rendered page** on failure
- [ ] Test file includes **comprehensive beforeEach/afterEach logging**
- [ ] PR description shows **test results** (not just "tests added")
- [ ] If tests fail: **Iterate 5-7 times** before asking for help

---

## Summary: The Playwright Testing Mindset

**Old Way** (surface-level):
```typescript
test('button exists', async ({ page }) => {
  await page.goto('/page');
  await expect(page.locator('button')).toBeVisible();
}); // ← Meaningless! False confidence.
```

**New Way** (data-driven):
```typescript
test('button triggers backend call and updates UI', async ({ page }) => {
  let apiCalled = false;
  let reduxUpdated = false;

  page.on('response', async (response) => {
    if (response.url().includes('create_proposal')) {
      apiCalled = true;
    }
  });

  await page.addInitScript(() => {
    const poll = setInterval(() => {
      const store = (window as any).store;
      if (store) {
        const original = store.dispatch;
        store.dispatch = function(action: any) {
          if (action.type === 'proposals/create/fulfilled') {
            (window as any).__PROPOSAL_CREATED__ = true;
          }
          return original.apply(this, arguments);
        };
        clearInterval(poll);
      }
    }, 50);
  });

  await page.goto('/proposals/new');
  await page.fill('[name="title"]', 'Test Proposal');
  await page.click('button:has-text("Create")');

  await page.waitForTimeout(5000);

  expect(apiCalled).toBe(true);

  reduxUpdated = await page.evaluate(() =>
    (window as any).__PROPOSAL_CREATED__
  );
  expect(reduxUpdated).toBe(true);

  await expect(page.locator('text=Proposal created')).toBeVisible();
}); // ← This verifies the ENTIRE pipeline!
```

**Remember**: Tests that pass without verifying backend data are worse than no tests - they give false confidence.

---

## Questions to Ask Yourself

Before declaring a test "done":

1. **Did I deploy to mainnet before testing?** (If no → deploy first)
2. **Does the test verify backend responses?** (If no → add network capture)
3. **Does the test verify Redux state changes?** (If no → add Redux spy)
4. **Do tests pass after deployment?** (If no → iterate)
5. **If tests fail, did I analyze artifacts?** (Screenshots, logs, network)
6. **Did I iterate at least 3 times?** (If stuck after 1 try → keep going)
7. **Can I explain WHY tests pass now?** (If no → you got lucky, keep debugging)

If you can answer YES to all 7, you have a solid test! ✅
