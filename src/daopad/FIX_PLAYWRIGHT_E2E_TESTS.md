# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-playwright-e2e-fixes/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-playwright-e2e-fixes/src/daopad`
2. **Implement fixes** - Follow plan sections below systematically
3. **Build & Deploy**:
   ```bash
   # Deploy frontend with test fixes
   ./deploy.sh --network ic --frontend-only
   ```
4. **Test & Iterate** (MANDATORY - Max 5 iterations):
   ```bash
   cd daopad_frontend
   npx playwright test e2e/treasury-enhanced.spec.ts --timeout=120000

   # Capture results
   EXIT_CODE=$?

   # IF tests fail:
   #   - Analyze failure artifacts (screenshots, console logs, network requests)
   #   - Identify specific failing test and root cause
   #   - Make targeted fix
   #   - Deploy again
   #   - Re-run tests
   #   - Repeat until pass OR max 5 iterations

   # IF tests pass after <=5 iterations:
   #   - Proceed to create PR

   # IF tests still fail after 5 iterations:
   #   - Document failures in PR description
   #   - Create PR anyway for human review
   #   - Report: "Tests need human debugging after 5 iterations"
   ```
5. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Fix]: Playwright E2E Test Infrastructure - Comprehensive Improvements

Fixes all P0/P1/P2 issues identified in PR #87 review:
- Removed duplicate wait conditions
- Eliminated global mutable state
- Replaced hardcoded timeouts with event-based waits
- Added TypeScript interfaces for type safety
- Created reusable test helpers
- Improved test reliability and execution speed

Test Results: [X/10 tests passing]
Execution Time: [Before: X min → After: Y min]"

   git push -u origin feature/playwright-e2e-fixes
   gh pr create --title "[Fix]: Playwright E2E Test Infrastructure Improvements" --body "Implements FIX_PLAYWRIGHT_E2E_TESTS.md

## Summary
Comprehensive fixes to Playwright E2E test infrastructure addressing all issues identified in PR #87 review.

## Problems Fixed
### P0 (Critical)
- ✅ Duplicate wait conditions removed
- ✅ Tests no longer timeout on tab clicks

### P1 (High Priority)
- ✅ Global state pollution eliminated
- ✅ Type safety improved with TS interfaces
- ✅ Hardcoded timeouts replaced with smart waits

### P2 (Medium Priority)
- ✅ Test execution time reduced by 40%+
- ✅ Test helpers created for DRY code
- ✅ Flaky test patterns fixed

## Test Results
[Agent to fill in after running tests]

## Deployment
Deployed to: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/
Test command: \`npx playwright test e2e/treasury-enhanced.spec.ts\`"
   ```

## CRITICAL RULES
- ❌ NO questions ("should I?", "want me to?", "is it done?")
- ❌ NO skipping PR creation - it's MANDATORY
- ❌ NO stopping after implementation - deploy, test, iterate
- ✅ Test MUST pass or reach max iterations before creating PR
- ✅ After each deploy: IMMEDIATELY run tests (no pause)
- ✅ ONLY stop at: tests pass, max iterations, or error

**Branch:** `feature/playwright-e2e-fixes`
**Worktree:** `/home/theseus/alexandria/daopad-playwright-e2e-fixes/src/daopad`

---

# Implementation Plan: Fix Playwright E2E Test Infrastructure

## Context

**PR #87 Review Findings**: The treasury E2E tests merged with all 10 tests failing and multiple critical issues:

### P0 (Blocking - All Tests Fail)
1. **Duplicate wait conditions** - Same selector waited twice (lines 114, 117)
2. **Tests timeout clicking treasury tab** - Missing proper wait before interaction
3. **Network request timing** - Race conditions in response capture

### P1 (High Priority - Code Quality)
1. **Global mutable state** - Module-level variables cause cross-test contamination
2. **Type safety violations** - Excessive `any` usage defeats TypeScript
3. **Hardcoded timeouts** - `waitForTimeout(5000)` everywhere causes slow, flaky tests
4. **Code duplication** - `beforeEach` blocks duplicated across describe blocks

### P2 (Medium Priority - Performance/Reliability)
1. **Excessive execution time** - Tests take 3+ minutes (10 tests × ~5 second waits)
2. **Flaky test assumptions** - Assumes Redux always dispatches actions
3. **No test data isolation** - Hardcoded dependency on ALEX token production data

### Current State
- **File**: `daopad_frontend/e2e/treasury-enhanced.spec.ts` (555 lines)
- **Test count**: 10 test scenarios (2 describe blocks)
- **Pass rate**: 0/10 (all timeout)
- **Execution time**: ~3-5 minutes
- **Test data**: Hardcoded to ALEX token (`ysy5f-2qaaa-aaaap-qkmmq-cai`)

---

## Solution Architecture

### Key Principles (from PLAYWRIGHT_TESTING_GUIDE.md)
1. **Deploy → Test → Iterate** - Tests run against deployed IC code, not local
2. **Data-driven testing** - Verify backend → Redux → UI pipeline
3. **Event-based waits** - Never use `waitForTimeout` except as last resort
4. **Type safety** - Use TypeScript interfaces for all test data
5. **Isolation** - Each test must be independent and re-runnable

### Implementation Strategy
1. **Fix P0 issues first** - Get tests passing (even if slow)
2. **Refactor for P1** - Improve code quality
3. **Optimize for P2** - Speed up execution
4. **Iterate until tests pass** - Max 5 deploy→test cycles

---

## Phase 1: Fix P0 Issues (Get Tests Passing)

### 1.1 Remove Duplicate Wait Conditions

**Problem**: Lines 114-117 (and many more) wait for same selector twice
```typescript
await page.waitForSelector('h1:has-text("Alexandria")', { timeout: 10000 });
await page.waitForSelector('h1:has-text("Alexandria")', { timeout: 10000 }); // DUPLICATE
```

**Solution**: Remove duplicates, wait for actual element needed
```typescript
// PSEUDOCODE - daopad_frontend/e2e/treasury-enhanced.spec.ts

// FIND ALL instances of duplicate waitForSelector (appears ~10 times)
// REPLACE with single wait for the actual element we need:

// Instead of:
await page.goto(`/dao/${TEST_TOKEN_ID}`);
await page.waitForSelector('h1:has-text("Alexandria")', { timeout: 10000 });
await page.waitForSelector('h1:has-text("Alexandria")', { timeout: 10000 }); // remove this
await page.click('[data-testid="treasury-tab"]');

// Use:
await page.goto(`/dao/${TEST_TOKEN_ID}`);
await page.waitForLoadState('networkidle');
await page.waitForSelector('[data-testid="treasury-tab"]', { state: 'visible', timeout: 10000 });
await page.click('[data-testid="treasury-tab"]');
await page.waitForSelector('[data-testid="treasury-overview"]', { timeout: 30000 });
```

**Files to modify**:
- `e2e/treasury-enhanced.spec.ts` lines 114-117, 161-163, 204-206, 249-251, and all test methods

### 1.2 Fix Network Request Race Conditions

**Problem**: Tests check `orbitResponse` immediately but it's set asynchronously
```typescript
// Response handler sets orbitResponse async
page.on('response', async (response) => {
  const responseText = await response.text(); // ASYNC
  orbitResponse = parsed; // Set module variable later
});

// Test checks immediately (may be null)
await page.waitForTimeout(5000); // Brittle workaround
expect(orbitResponse).toBeDefined(); // Flaky!
```

**Solution**: Wait for actual network response event
```typescript
// PSEUDOCODE - e2e/treasury-enhanced.spec.ts

// REPLACE brittle timeout waits with explicit network waits:

// Instead of:
await page.click('[data-testid="treasury-tab"]');
await page.waitForTimeout(5000); // Hope response arrives

// Use:
await page.click('[data-testid="treasury-tab"]');
await page.waitForResponse(
  response => (
    response.url().includes('list_orbit_accounts') ||
    response.url().includes('listDashboardAssets')
  ) && response.status() === 200,
  { timeout: 30000 }
);
// orbitResponse now guaranteed to be set
```

### 1.3 Ensure Tab is Clickable Before Clicking

**Problem**: Tests click `[data-testid="treasury-tab"]` before it's ready
```typescript
await page.goto(`/dao/${TEST_TOKEN_ID}`);
await page.click('[data-testid="treasury-tab"]'); // Might not exist yet
```

**Solution**: Wait for element to be both visible AND enabled
```typescript
// PSEUDOCODE - e2e/treasury-enhanced.spec.ts

// REPLACE all navigation→click patterns:

async function navigateToTreasury(page: Page) {
  await page.goto(`/dao/${TEST_TOKEN_ID}`);
  await page.waitForLoadState('networkidle');

  // Wait for tab to be present and clickable
  await page.waitForSelector('[data-testid="treasury-tab"]', {
    state: 'visible',
    timeout: 10000
  });

  // Additional check: is it enabled?
  const isDisabled = await page.locator('[data-testid="treasury-tab"]').isDisabled();
  if (isDisabled) {
    throw new Error('Treasury tab exists but is disabled');
  }

  await page.click('[data-testid="treasury-tab"]');

  // Wait for treasury content to load
  await page.waitForSelector('[data-testid="treasury-overview"]', {
    timeout: 30000
  });
}

// USE in all tests:
test('should fetch treasury data through complete pipeline', async ({ page }) => {
  await navigateToTreasury(page);

  // Wait for network response (not timeout)
  await page.waitForResponse(
    r => r.url().includes('list_orbit_accounts') && r.status() === 200
  );

  // Now safe to assert
  expect(orbitResponse).toBeDefined();
  // ... rest of test
});
```

---

## Phase 2: Fix P1 Issues (Code Quality)

### 2.1 Eliminate Global Mutable State

**Problem**: Module-level variables shared across tests
```typescript
// Lines 8-10 - GLOBAL, MUTABLE, SHARED
let networkRequests: Array<...> = [];
let consoleErrors: Array<string> = [];
let orbitResponse: any = null;
```

**Solution**: Use test fixtures or page context
```typescript
// PSEUDOCODE - e2e/treasury-enhanced.spec.ts

// CREATE TypeScript interfaces first
interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  response: any;
  timestamp: number;
}

interface OrbitAccount {
  name: string;
  assets?: Array<{
    balance?: string | number;
    symbol?: string;
  }>;
}

interface OrbitResponse {
  Ok?: {
    accounts: OrbitAccount[];
    privileges?: any[];
  };
  accounts?: OrbitAccount[]; // Fallback if no Ok wrapper
}

interface TestState {
  networkRequests: NetworkRequest[];
  consoleErrors: string[];
  orbitResponse: OrbitResponse | null;
}

// REMOVE global variables (delete lines 8-10)

// CREATE per-test state in beforeEach
test.describe('Treasury Enhanced - Data Pipeline', () => {
  let testState: TestState;

  test.beforeEach(async ({ page }) => {
    // Initialize fresh state for each test
    testState = {
      networkRequests: [],
      consoleErrors: [],
      orbitResponse: null
    };

    // Attach to page for access in handlers
    await page.addInitScript((initialState) => {
      (window as any).__TEST_STATE__ = initialState;
    }, testState);

    // Network capture handler
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes(BACKEND_CANISTER) || url.includes('ic0.app/api')) {
        try {
          const responseText = await response.text();
          const parsed = tryParseJSON(responseText);

          const request: NetworkRequest = {
            url,
            method: extractMethod(url),
            status: response.status(),
            response: parsed,
            timestamp: Date.now()
          };

          testState.networkRequests.push(request);

          if (url.includes('list_orbit_accounts') || url.includes('listDashboardAssets')) {
            testState.orbitResponse = parsed as OrbitResponse;
          }
        } catch (e) {
          // Binary response
        }
      }
    });

    // Console error capture
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        testState.consoleErrors.push(msg.text());
      }
    });

    // ... rest of beforeEach
  });

  // Now tests access testState instead of globals
  test('should fetch data', async ({ page }) => {
    await navigateToTreasury(page);

    expect(testState.networkRequests.length).toBeGreaterThan(0);
    expect(testState.orbitResponse).toBeDefined();
    // ...
  });
});

// HELPER function
function tryParseJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.substring(0, 200) };
  }
}
```

### 2.2 Add Type Safety

**Solution**: Replace all `any` types with proper interfaces
```typescript
// PSEUDOCODE - e2e/treasury-enhanced.spec.ts

// ADD to top of file after imports
interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  response: unknown; // or specific type if known
  timestamp: number;
}

interface OrbitAccount {
  name: string;
  blockchain: string;
  balance?: {
    value: string;
    decimals: number;
  };
  assets?: OrbitAsset[];
}

interface OrbitAsset {
  symbol: string;
  balance: string;
  decimals: number;
  metadata?: Record<string, any>;
}

interface OrbitResponse {
  Ok?: OrbitListAccountsResponse;
  Err?: string;
}

interface OrbitListAccountsResponse {
  accounts: OrbitAccount[];
  privileges: unknown[]; // Define if used
  next_offset?: number;
}

interface ReduxAction {
  type: string;
  payload?: unknown;
  timestamp: number;
}

// UPDATE all function signatures
function extractMethod(url: string): string {
  // ...
}

function tryParseJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.substring(0, 200) };
  }
}

// UPDATE test assertions with type guards
test('should verify response structure', async ({ page }) => {
  await navigateToTreasury(page);

  expect(testState.orbitResponse).toBeDefined();

  const response = testState.orbitResponse!;

  // Type guard
  const responseData: OrbitListAccountsResponse = response.Ok || response as any;

  expect(responseData).toBeDefined();
  expect(Array.isArray(responseData.accounts)).toBe(true);

  if (responseData.accounts.length > 0) {
    const firstAccount = responseData.accounts[0];
    expect(typeof firstAccount.name).toBe('string');
    // Type-safe access now
  }
});
```

### 2.3 Extract Common Setup to Shared Helper

**Problem**: `beforeEach` duplicated in both describe blocks (lines 13-80 and 447-485)

**Solution**: Create reusable test setup helper
```typescript
// PSEUDOCODE - NEW FILE: e2e/helpers/treasury-test-setup.ts

import { Page } from '@playwright/test';

export interface TreasuryTestState {
  networkRequests: NetworkRequest[];
  consoleErrors: string[];
  orbitResponse: OrbitResponse | null;
}

export interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  response: unknown;
  timestamp: number;
}

export interface OrbitResponse {
  Ok?: {
    accounts: any[];
    privileges?: any[];
  };
  accounts?: any[];
}

export const BACKEND_CANISTER = process.env.VITE_BACKEND_CANISTER_ID || 'lwsav-iiaaa-aaaap-qp2qq-cai';
export const TEST_TOKEN_ID = 'ysy5f-2qaaa-aaaap-qkmmq-cai'; // ALEX token

/**
 * Setup comprehensive test instrumentation
 * Captures: network requests, console errors, Redux actions
 */
export async function setupTreasuryTestMonitoring(
  page: Page,
  testState: TreasuryTestState
): Promise<void> {
  // Network request capture
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes(BACKEND_CANISTER) || url.includes('ic0.app/api') || url.includes('icp0.io')) {
      try {
        const responseText = await response.text();
        const parsed = tryParseJSON(responseText);

        testState.networkRequests.push({
          url,
          method: extractMethod(url),
          status: response.status(),
          response: parsed,
          timestamp: Date.now()
        });

        if (url.includes('list_orbit_accounts') || url.includes('listDashboardAssets')) {
          testState.orbitResponse = parsed as OrbitResponse;
          console.log('[Test] Captured Orbit response');
        }
      } catch (e) {
        // Binary response
      }
    }
  });

  // Console error capture
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const errorText = msg.text();
      testState.consoleErrors.push(errorText);
      console.error('[Browser Console Error]:', errorText);
    }
  });

  // Redux action spy
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
}

/**
 * Navigate to treasury tab and wait for it to load
 * Replaces repetitive navigation boilerplate
 */
export async function navigateToTreasury(page: Page, tokenId: string = TEST_TOKEN_ID): Promise<void> {
  await page.goto(`/dao/${tokenId}`);
  await page.waitForLoadState('networkidle');

  // Wait for tab to be clickable
  await page.waitForSelector('[data-testid="treasury-tab"]', {
    state: 'visible',
    timeout: 10000
  });

  await page.click('[data-testid="treasury-tab"]');

  // Wait for treasury overview to appear
  await page.waitForSelector('[data-testid="treasury-overview"]', {
    timeout: 30000
  });
}

/**
 * Wait for Orbit API response with timeout
 */
export async function waitForOrbitResponse(
  page: Page,
  timeout: number = 30000
): Promise<void> {
  await page.waitForResponse(
    response => (
      (response.url().includes('list_orbit_accounts') ||
       response.url().includes('listDashboardAssets')) &&
      response.status() === 200
    ),
    { timeout }
  );
}

export function extractMethod(url: string): string {
  if (url.includes('list_orbit_accounts')) return 'list_orbit_accounts';
  if (url.includes('listDashboardAssets')) return 'listDashboardAssets';
  if (url.includes('query')) return 'query';
  if (url.includes('call')) return 'call';
  return 'unknown';
}

function tryParseJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.substring(0, 200) };
  }
}
```

```typescript
// PSEUDOCODE - UPDATE: e2e/treasury-enhanced.spec.ts

import { test, expect } from '@playwright/test';
import { authenticateForTests } from './helpers/auth';
import {
  setupTreasuryTestMonitoring,
  navigateToTreasury,
  waitForOrbitResponse,
  TreasuryTestState,
  TEST_TOKEN_ID
} from './helpers/treasury-test-setup';

test.describe('Treasury Enhanced - Data Pipeline', () => {
  let testState: TreasuryTestState;

  test.beforeEach(async ({ page }) => {
    // Initialize state
    testState = {
      networkRequests: [],
      consoleErrors: [],
      orbitResponse: null
    };

    // Setup monitoring (no duplication!)
    await setupTreasuryTestMonitoring(page, testState);

    // Authenticate
    await authenticateForTests(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      console.log('\n=== FAILED TEST DIAGNOSTICS ===');
      console.log(`Test: ${testInfo.title}`);

      console.log(`\nNetwork Requests: ${testState.networkRequests.length}`);
      testState.networkRequests.slice(0, 5).forEach((req, i) => {
        console.log(`${i+1}. ${req.method} - ${req.status}`);
      });

      console.log(`\nConsole Errors: ${testState.consoleErrors.length}`);
      testState.consoleErrors.slice(0, 5).forEach((err, i) => {
        console.log(`${i+1}. ${err.substring(0, 100)}`);
      });

      await page.screenshot({
        path: `test-results/treasury-${testInfo.title.replace(/\s+/g, '-')}.png`,
        fullPage: true
      });
    }
  });

  test('should fetch treasury data through complete pipeline', async ({ page }) => {
    // Use helper instead of inline navigation
    await navigateToTreasury(page);

    // Smart wait for network (not timeout)
    await waitForOrbitResponse(page);

    // Assertions
    expect(testState.networkRequests.length).toBeGreaterThan(0);
    expect(testState.orbitResponse).toBeDefined();

    const responseData = testState.orbitResponse!.Ok || testState.orbitResponse;
    const accounts = responseData.accounts || [];

    console.log(`Received ${accounts.length} accounts from backend`);
    expect(Array.isArray(accounts)).toBe(true);

    // Verify UI
    const accountCards = await page.$$('[data-testid="treasury-account"]');
    console.log(`Found ${accountCards.length} account cards in UI`);

    if (accounts.length > 0) {
      expect(accountCards.length).toBe(accounts.length);
    }
  });

  // ... other tests use same pattern
});
```

---

## Phase 3: Fix P2 Issues (Performance & Reliability)

### 3.1 Replace All Hardcoded Timeouts

**Problem**: `waitForTimeout(5000)` appears 20+ times

**Solution**: Replace with event-based waits
```typescript
// PSEUDOCODE - e2e/treasury-enhanced.spec.ts

// FIND all instances of waitForTimeout
// REPLACE based on context:

// Waiting for network response:
// REMOVE: await page.waitForTimeout(5000);
// USE: await waitForOrbitResponse(page);

// Waiting for UI update after click:
// REMOVE: await trigger.click(); await page.waitForTimeout(500);
// USE: await trigger.click();
//      await page.waitForFunction(() =>
//        document.querySelector('[data-state]')?.getAttribute('data-state') !== initialState
//      );

// Waiting for Redux action:
// REMOVE: await page.waitForTimeout(5000);
// USE: await page.waitForFunction(() =>
//        (window as any).__REDUX_ACTIONS__?.some(a => a.type.includes('treasury'))
//      , { timeout: 10000 });

// Waiting for element to appear:
// REMOVE: await page.waitForTimeout(3000);
// USE: await page.waitForSelector('[data-testid="treasury-account"]', {
//        state: 'visible',
//        timeout: 10000
//      });
```

### 3.2 Make Tests More Resilient

**Problem**: Tests assume exact Redux behavior (flaky)
```typescript
test('should verify Redux state updates', async ({ page }) => {
  // ...
  const treasuryActions = actions.filter((a: any) => a.type.includes('treasury'));
  expect(treasuryActions.length).toBeGreaterThan(0); // FLAKY - might be cached
});
```

**Solution**: Test outcomes, not implementation details
```typescript
// PSEUDOCODE - e2e/treasury-enhanced.spec.ts

test('should verify Redux state updates', async ({ page }) => {
  await navigateToTreasury(page);
  await waitForOrbitResponse(page);

  const actions = await page.evaluate(() => (window as any).__REDUX_ACTIONS__ || []);
  const treasuryActions = actions.filter((a: any) =>
    a.type && typeof a.type === 'string' && a.type.includes('treasury')
  );

  // Get UI state as fallback
  const accountCards = await page.$$('[data-testid="treasury-account"]');
  const hasUIData = accountCards.length > 0;

  // EITHER Redux dispatched OR UI shows data (both valid)
  const dataLoaded = treasuryActions.length > 0 || hasUIData;

  expect(dataLoaded).toBe(true);
  console.log(`Data verification: Redux actions=${treasuryActions.length}, UI cards=${accountCards.length}`);

  // If we got Redux actions, verify they completed successfully
  if (treasuryActions.length > 0) {
    const fulfilled = treasuryActions.some((a: any) => a.type.includes('fulfilled'));
    const rejected = treasuryActions.some((a: any) => a.type.includes('rejected'));

    expect(rejected).toBe(false);
    if (!fulfilled && !hasUIData) {
      throw new Error('Redux actions fired but none fulfilled and no UI data');
    }
  }
});
```

### 3.3 Optimize Test Execution Time

**Target**: Reduce from ~3 minutes to <90 seconds

**Strategy**:
1. Remove all hardcoded timeouts (saves ~50 seconds)
2. Use `waitForLoadState('networkidle')` instead of multiple waits
3. Run tests in parallel where possible (Playwright config)
4. Cache authentication state (already done)

```typescript
// PSEUDOCODE - playwright.config.ts

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Keep false for treasury tests (shared backend state)
  workers: 1, // Keep 1 for treasury (avoid race conditions)

  // But we CAN parallelize different test files:
  // workers: process.env.CI ? 2 : 1,

  timeout: 60000, // Reduce from 120000 since we removed timeouts

  use: {
    baseURL: process.env.TEST_BASE_URL || 'https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Add: Speed up page loads
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
});
```

---

## Phase 4: Testing Strategy

### Test Execution Workflow

```bash
# 1. Deploy changes
cd /home/theseus/alexandria/daopad-playwright-e2e-fixes/src/daopad
./deploy.sh --network ic --frontend-only

# 2. Run tests
cd daopad_frontend
npx playwright test e2e/treasury-enhanced.spec.ts --timeout=120000

# 3. Analyze results
# IF ALL PASS → Create PR
# IF SOME FAIL → Check which phase failed:
#   - Phase 1 failures (navigation/clicking) → Fix wait conditions
#   - Phase 2 failures (assertions) → Fix type handling
#   - Phase 3 failures (timeouts) → Increase event wait timeouts

# 4. Iterate (max 5 times)
# Make targeted fix → Deploy → Re-test
```

### Success Criteria

**Minimum Acceptable** (after Phase 1):
- ✅ 7/10 tests passing
- ✅ No timeout errors on navigation
- ✅ Network requests captured successfully

**Target** (after Phase 2):
- ✅ 9/10 tests passing
- ✅ No global state issues
- ✅ Type-safe code

**Ideal** (after Phase 3):
- ✅ 10/10 tests passing
- ✅ Execution time <90 seconds
- ✅ No flaky tests (3 consecutive runs all pass)

### Failure Debugging

If tests still fail after 5 iterations:

1. **Capture comprehensive diagnostics**:
   ```bash
   npx playwright test e2e/treasury-enhanced.spec.ts --reporter=html
   npx playwright show-report
   ```

2. **Document in PR**:
   - Which specific tests fail
   - Error messages
   - Screenshots from test-results/
   - Hypothesis about root cause

3. **Mark PR as draft** for human review

---

## File Modifications Summary

### New Files
1. `daopad_frontend/e2e/helpers/treasury-test-setup.ts` (~200 lines)
   - Shared test setup functions
   - TypeScript interfaces
   - Navigation helpers
   - Wait utilities

### Modified Files
1. `daopad_frontend/e2e/treasury-enhanced.spec.ts`
   - Remove global variables (delete lines 8-10)
   - Import shared helpers
   - Replace all navigation boilerplate with `navigateToTreasury()`
   - Replace `waitForTimeout` with event waits
   - Add type annotations
   - Simplify beforeEach (use `setupTreasuryTestMonitoring`)
   - ~555 lines → ~400 lines (30% reduction)

2. `daopad_frontend/playwright.config.ts` (optional)
   - Reduce global timeout from 120s to 60s
   - Add `actionTimeout` and `navigationTimeout`

---

## Implementation Checklist

### Phase 1 (P0 - Get Tests Passing)
- [ ] Remove all duplicate `waitForSelector` calls
- [ ] Replace `waitForTimeout` before assertions with `waitForResponse`
- [ ] Add proper wait for treasury tab visibility before clicking
- [ ] Create `navigateToTreasury()` helper function
- [ ] Test: Deploy and verify at least 7/10 tests pass

### Phase 2 (P1 - Code Quality)
- [ ] Create `e2e/helpers/treasury-test-setup.ts` with TypeScript interfaces
- [ ] Remove global variables, use per-test `testState`
- [ ] Add type annotations to all functions and variables
- [ ] Extract `setupTreasuryTestMonitoring()` helper
- [ ] Update all tests to use shared helpers
- [ ] Test: Deploy and verify 9/10 tests pass

### Phase 3 (P2 - Performance)
- [ ] Replace remaining `waitForTimeout` with event-based waits
- [ ] Add resilient Redux assertions (check UI state as fallback)
- [ ] Verify test execution time reduced to <90 seconds
- [ ] Test: Deploy and verify 10/10 tests pass in <90s

### Phase 4 (Verification)
- [ ] Run tests 3 consecutive times - all should pass
- [ ] Verify no flaky failures
- [ ] Check test-results/ for any warnings
- [ ] Create PR with test results

---

## Deployment Commands

```bash
# From worktree root
cd /home/theseus/alexandria/daopad-playwright-e2e-fixes/src/daopad

# Deploy frontend (tests live in frontend)
./deploy.sh --network ic --frontend-only

# Run specific test file
cd daopad_frontend
npx playwright test e2e/treasury-enhanced.spec.ts --timeout=120000

# Run with debugging (if issues)
npx playwright test e2e/treasury-enhanced.spec.ts --timeout=120000 --debug

# Run and generate HTML report
npx playwright test e2e/treasury-enhanced.spec.ts --reporter=html
npx playwright show-report
```

---

## Expected Outcomes

### Before (Current State)
- Tests: 0/10 passing
- Execution time: ~180-300 seconds (3-5 minutes)
- Flakiness: High (race conditions, timeouts)
- Code quality: Global state, poor types, duplication

### After Phase 1
- Tests: 7-8/10 passing
- Execution time: ~150 seconds
- Flakiness: Medium (still has timeouts)
- Code quality: Same

### After Phase 2
- Tests: 9-10/10 passing
- Execution time: ~120 seconds
- Flakiness: Low (event-based waits)
- Code quality: Good (types, no globals, DRY)

### After Phase 3
- Tests: 10/10 passing
- Execution time: <90 seconds (50% reduction)
- Flakiness: Very low
- Code quality: Excellent

---

## Risk Mitigation

### Risk: Tests still fail after fixes
**Mitigation**: Deploy → Test → Iterate pattern with max 5 attempts
**Fallback**: Document failures in PR for human review

### Risk: Breaking existing working tests
**Mitigation**: Run ALL e2e tests, not just treasury-enhanced
```bash
npx playwright test e2e/ --timeout=120000
```

### Risk: Test data dependency (ALEX token changes)
**Mitigation**: Tests should handle empty state gracefully
**Long-term**: Create dedicated test fixtures

### Risk: Deployment issues
**Mitigation**: Always verify deployment succeeded before testing
```bash
./deploy.sh --network ic --frontend-only | grep "deployed successfully"
```

---

## Notes for Future Maintainers

1. **Always deploy before testing** - Tests hit live IC canisters, not local code
2. **Use event-based waits** - Never add `waitForTimeout` unless absolutely necessary
3. **Keep tests isolated** - Each test should be runnable independently
4. **Test the data flow** - Backend → Redux → UI, not just UI elements
5. **When tests fail** - Check screenshots + network logs + console errors in test-results/

---

## References

- PLAYWRIGHT_TESTING_GUIDE.md - Core testing philosophy
- e2e/app-route.spec.ts - Example of working IC canister network capture
- e2e/helpers/auth.ts - Authentication helper pattern
- PR #87 review comments - Original issue list
