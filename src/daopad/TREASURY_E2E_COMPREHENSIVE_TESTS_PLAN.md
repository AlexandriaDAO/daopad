# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-treasury-e2e-plan/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-treasury-e2e-plan/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Deploy & Test Loop**:
   ```bash
   # Iterate until all tests pass
   while true; do
     # Deploy to mainnet (MANDATORY - tests run against deployed code)
     ./deploy.sh --network ic

     # Run E2E tests
     cd daopad_frontend
     npx playwright test e2e/treasury.spec.ts

     # Check results
     if [ $? -eq 0 ]; then
       echo "✅ All tests passed!"
       break
     else
       echo "❌ Tests failed - analyzing and fixing..."
       # Analyze screenshots, logs, network captures
       # Form hypothesis, make fix, loop again
     fi
   done
   ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Test]: Comprehensive E2E tests for Treasury tab - Data flow validation"
   git push -u origin feature/treasury-e2e-plan
   gh pr create --title "[Test]: Comprehensive Treasury E2E Tests - Backend-to-UI Data Flow" \
     --body "Implements comprehensive Playwright E2E tests for the Treasury tab following PLAYWRIGHT_TESTING_GUIDE.md principles.

## What This PR Does

Transforms existing surface-level treasury tests into comprehensive data-flow validation tests that verify:

### ✅ Three-Layer Verification
1. **Network Layer**: IC canister calls succeed with valid responses
2. **State Layer**: Redux actions dispatch correctly (pending → fulfilled)
3. **UI Layer**: Components render real data from Redux state

### Test Coverage
- Treasury tab data loading (backend → Redux → UI)
- Dashboard metrics calculation and display
- Account and asset listing with real balances
- Tab switching behavior and data persistence
- Error handling and graceful degradation
- Loading states and timeout behavior

### Following Best Practices
- Tests run against deployed mainnet code
- Captures network requests, Redux actions, console errors
- Verifies actual data consistency through pipeline
- Comprehensive failure artifacts (screenshots, logs)
- Deploy → Test → Iterate workflow

## Test Results
\`\`\`
[Paste test results here after implementation]
\`\`\`

Implements: TREASURY_E2E_COMPREHENSIVE_TESTS_PLAN.md"
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
- ✅ MUST deploy before testing - tests run against deployed code
- ✅ Iterate Deploy → Test loop until tests pass

**Branch:** `feature/treasury-e2e-plan`
**Worktree:** `/home/theseus/alexandria/daopad-treasury-e2e-plan/src/daopad`

---

# Implementation Plan: Comprehensive Treasury E2E Tests

## Overview

This plan transforms the existing surface-level treasury E2E tests into comprehensive data-flow validation tests that follow the principles outlined in `PLAYWRIGHT_TESTING_GUIDE.md`.

### Current State vs Target State

**Current Tests (`e2e/treasury.spec.ts`):**
- ❌ Surface-level element existence checks
- ❌ No Redux action verification
- ❌ No network request validation
- ❌ Hardcoded expectations (4 accounts)
- ❌ No data flow verification
- ❌ False confidence from passing tests

**Target Tests (This Plan):**
- ✅ Backend-to-frontend data flow validation
- ✅ Redux action tracking (pending → fulfilled)
- ✅ Network request capture and verification
- ✅ Dynamic expectations based on actual data
- ✅ Complete pipeline verification (IC → Redux → UI)
- ✅ Real confidence from meaningful assertions

## Current State Documentation

### File Structure
```
daopad_frontend/
├── e2e/
│   ├── helpers/
│   │   └── auth.ts                    # Auth utilities
│   ├── treasury.spec.ts               # CURRENT: Surface-level tests
│   └── app-route.spec.ts              # Reference: Public dashboard
├── src/
│   ├── pages/
│   │   └── DashboardPage.tsx          # Main dashboard with Treasury tab
│   ├── components/
│   │   └── orbit/
│   │       └── dashboard/
│   │           ├── TreasuryOverview.tsx   # Treasury UI component
│   │           ├── GovernanceMetrics.tsx
│   │           └── ActivityFeed.tsx
│   └── services/
│       └── backend/
│           └── orbit/
│               └── OrbitAccountsService.ts  # Backend service
└── PLAYWRIGHT_TESTING_GUIDE.md       # Testing principles (MUST READ)
```

### Backend API Methods (from `daopad_backend/src/api/`)
```rust
// orbit.rs:88
pub async fn list_orbit_accounts(
    token_canister_id: Principal,
    search_term: Option<String>,
    offset: Option<u16>,
    limit: Option<u16>,
) -> Result<ListAccountsResponse, String>

// orbit_transfers.rs:157
pub async fn list_station_assets(
    token_canister_id: Principal,
) -> Result<Vec<AssetMetadata>, String>

// orbit_accounts.rs:94
async fn get_available_assets(
    token_canister_id: Principal,
) -> Result<AssetsResponse, String>
```

### Frontend Data Flow
```
User Action (Click Treasury Tab)
    ↓
DashboardPage.tsx (fetchDashboard)
    ↓
stationService.listDashboardAssets()
    ↓
OrbitAccountsService.listAccounts()
    ↓
Backend: list_orbit_accounts() [IC Canister Call]
    ↓
Orbit Station API [Cross-canister]
    ↓
Response flows back
    ↓
setState(dashboardData)
    ↓
TreasuryOverview component re-renders
    ↓
UI displays treasury data
```

### Existing Test Issues

**From `treasury.spec.ts` (lines 80-98):**
```typescript
// ❌ PROBLEM: Only checks no console errors, not data flow
test('should load Treasury tab without console errors', async () => {
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.click('[data-testid="treasury-tab"]');
    await page.waitForSelector('[data-testid="treasury-overview"]');
    expect(consoleErrors.length).toBe(0);
});

// ❌ PROBLEM: Hardcoded to exactly 4 accounts
test('should display 4 treasury accounts', async () => {
    const accounts = await page.$$('[data-testid="treasury-account"]');
    expect(accounts.length).toBe(4);  // Breaks if accounts change!
});
```

**Key Problems:**
1. No verification that `list_orbit_accounts` was actually called
2. No verification of Redux state updates
3. No data consistency checking (backend response vs UI display)
4. Hardcoded expectations break when data changes
5. False positives (tests pass even if data loading fails silently)

## Implementation Plan (PSEUDOCODE)

### Step 1: Enhance Test Infrastructure

**File: `daopad_frontend/e2e/treasury-enhanced.spec.ts` (NEW)**

```typescript
// PSEUDOCODE - Implementer will write actual TypeScript

import { test, expect, Page } from '@playwright/test';
import { authenticateForTests } from './helpers/auth';

// CRITICAL: Follow PLAYWRIGHT_TESTING_GUIDE.md patterns

// Test instrumentation arrays (captured during test execution)
let consoleErrors: string[] = [];
let networkRequests: Array<{
  url: string,
  method: string,
  status: number,
  response: any
}> = [];
let reduxActions: Array<{
  type: string,
  payload: any,
  timestamp: number
}> = [];

test.describe('Treasury Tab - Comprehensive Data Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Reset capture arrays
    consoleErrors = [];
    networkRequests = [];
    reduxActions = [];

    // 1. Monitor console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.error('[Browser Console]:', msg.text());
      }
    });

    // 2. Monitor network requests (IC canister calls)
    page.on('response', async (response) => {
      const url = response.url();

      // Capture backend canister calls
      if (url.includes('lwsav-iiaaa-aaaap-qp2qq-cai') ||
          url.includes('ic0.app/api')) {

        try {
          const responseText = await response.text();
          const method = extractMethodFromUrl(url);  // Helper function

          networkRequests.push({
            url,
            method,
            status: response.status(),
            response: responseText
          });

          console.log(`[Network] ${response.status()} ${method}`);

          if (!response.ok()) {
            console.error(`[Network Error] ${response.status()} ${url}`);
            console.error('Response:', responseText.substring(0, 500));
          }
        } catch (e) {
          // Binary response or parse error
          console.log(`[Network] ${url} (binary/unparseable)`);
        }
      }
    });

    // 3. Inject Redux spy (CRITICAL for data flow verification)
    await page.addInitScript(() => {
      (window as any).__REDUX_ACTIONS__ = [];
      (window as any).__REDUX_STATE__ = null;

      // Poll for store availability
      const pollInterval = setInterval(() => {
        const store = (window as any).store;

        if (store?.dispatch) {
          const originalDispatch = store.dispatch;

          // Intercept all Redux actions
          store.dispatch = function(action: any) {
            (window as any).__REDUX_ACTIONS__.push({
              type: action.type,
              payload: action.payload,
              timestamp: Date.now()
            });

            // Also capture state snapshots for key actions
            if (action.type.includes('dashboard') ||
                action.type.includes('treasury')) {
              (window as any).__REDUX_STATE__ = store.getState();
            }

            return originalDispatch.apply(this, arguments);
          };

          clearInterval(pollInterval);
          console.log('[Redux Spy] Installed successfully');
        }
      }, 100);
    });

    // 4. Authenticate
    await authenticateForTests(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      // Dump all captured data for debugging
      console.log('\n=== TEST FAILURE ANALYSIS ===');

      console.log('\n--- Console Errors ---');
      consoleErrors.forEach((err, i) => {
        console.log(`${i + 1}. ${err}`);
      });

      console.log('\n--- Network Requests ---');
      networkRequests.forEach((req, i) => {
        console.log(`${i + 1}. [${req.status}] ${req.method}`);
        if (req.response) {
          console.log(`   Response: ${req.response.substring(0, 200)}...`);
        }
      });

      console.log('\n--- Redux Actions ---');
      const actions = await page.evaluate(() =>
        (window as any).__REDUX_ACTIONS__
      );
      actions?.forEach((action, i) => {
        console.log(`${i + 1}. ${action.type}`);
      });

      // Take screenshot
      await page.screenshot({
        path: `test-results/treasury-failure-${Date.now()}.png`,
        fullPage: true
      });
    }

    // Reset
    consoleErrors = [];
    networkRequests = [];
    reduxActions = [];
  });

  // TEST 1: Complete data flow validation
  test('should load treasury data from IC → Redux → UI', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for page to be interactive
    await page.waitForSelector('[data-testid="treasury-tab"]', {
      timeout: 10000
    });

    // Click treasury tab
    await page.click('[data-testid="treasury-tab"]');

    // Wait for network requests to complete
    await page.waitForTimeout(5000);

    // LAYER 1: Verify backend was called
    const backendCalls = networkRequests.filter(req =>
      req.method.includes('list_orbit_accounts') ||
      req.method.includes('list_station_assets') ||
      req.method.includes('get_available_assets')
    );

    expect(backendCalls.length).toBeGreaterThan(0);
    console.log(`✅ Backend called: ${backendCalls.length} treasury APIs`);

    // Verify successful responses
    const failedCalls = backendCalls.filter(req => req.status >= 400);
    expect(failedCalls.length).toBe(0);

    // LAYER 2: Verify Redux state was updated
    const reduxActions = await page.evaluate(() =>
      (window as any).__REDUX_ACTIONS__
    );

    // Look for dashboard fetch actions
    const pendingAction = reduxActions.find(a =>
      a.type.includes('dashboard') && a.type.includes('pending')
    );
    const fulfilledAction = reduxActions.find(a =>
      a.type.includes('dashboard') && a.type.includes('fulfilled')
    );
    const rejectedAction = reduxActions.find(a =>
      a.type.includes('dashboard') && a.type.includes('rejected')
    );

    expect(pendingAction).toBeDefined();
    expect(fulfilledAction).toBeDefined();
    expect(rejectedAction).toBeUndefined();
    console.log('✅ Redux: pending → fulfilled (no rejection)');

    // LAYER 3: Verify UI rendered the data
    await page.waitForSelector('[data-testid="treasury-overview"]', {
      timeout: 10000
    });

    // Check that treasury overview is visible and has content
    const treasuryCards = await page.$$('[data-testid="treasury-account"]');
    expect(treasuryCards.length).toBeGreaterThan(0);
    console.log(`✅ UI rendered ${treasuryCards.length} treasury accounts`);

    // CONSISTENCY CHECK: Verify data matches through pipeline
    // Parse backend response
    const backendResponse = backendCalls.find(req =>
      req.method.includes('list_orbit_accounts')
    );

    if (backendResponse && backendResponse.response) {
      try {
        const parsed = JSON.parse(backendResponse.response);
        if (parsed.Ok && parsed.Ok.accounts) {
          const backendAccountCount = parsed.Ok.accounts.length;

          // Compare with UI count
          expect(treasuryCards.length).toBe(backendAccountCount);
          console.log(`✅ Data consistency: Backend (${backendAccountCount}) matches UI (${treasuryCards.length})`);
        }
      } catch (e) {
        console.log('⚠️  Could not parse backend response for consistency check');
      }
    }

    // Verify no console errors
    expect(consoleErrors.length).toBe(0);
  });

  // TEST 2: Dashboard metrics calculation
  test('should calculate and display treasury metrics correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('[data-testid="treasury-tab"]');
    await page.waitForTimeout(5000);

    // Capture backend response with account/asset data
    const backendCall = networkRequests.find(req =>
      req.method.includes('list_orbit_accounts')
    );

    expect(backendCall).toBeDefined();

    // Verify metric cards are populated
    const metricCards = await page.$$('[data-role="metric-card"]');
    expect(metricCards.length).toBeGreaterThan(0);

    // Check specific metrics
    const totalValueCard = await page.$('[data-testid="metric-total-value"]');
    const activeAssetsCard = await page.$('[data-testid="metric-active-assets"]');

    if (totalValueCard) {
      const value = await totalValueCard.textContent();
      expect(value).not.toContain('Loading');
      expect(value).not.toBe('$0');
      console.log('Total treasury value:', value);
    }

    if (activeAssetsCard) {
      const count = await activeAssetsCard.textContent();
      expect(count).not.toContain('Loading');
      console.log('Active assets:', count);
    }
  });

  // TEST 3: Tab switching and data persistence
  test('should maintain data when switching tabs', async ({ page }) => {
    await page.goto('/dashboard');

    // Load treasury tab
    await page.click('[data-testid="treasury-tab"]');
    await page.waitForTimeout(5000);

    const treasuryAccountsCount = (
      await page.$$('[data-testid="treasury-account"]')
    ).length;
    expect(treasuryAccountsCount).toBeGreaterThan(0);

    // Switch to governance tab
    await page.click('[data-testid="governance-tab"]');
    await page.waitForTimeout(2000);

    // Switch back to treasury
    await page.click('[data-testid="treasury-tab"]');
    await page.waitForTimeout(1000);

    // Verify data still present (should be cached)
    const treasuryAccountsAfter = (
      await page.$$('[data-testid="treasury-account"]')
    ).length;
    expect(treasuryAccountsAfter).toBe(treasuryAccountsCount);
    console.log('✅ Data persisted through tab switch');
  });

  // TEST 4: Error handling and graceful degradation
  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto('/dashboard');

    // Monitor for error states
    await page.click('[data-testid="treasury-tab"]');

    // Wait for either success or error state
    await Promise.race([
      page.waitForSelector('[data-testid="treasury-overview"]', {
        timeout: 30000
      }),
      page.waitForSelector('[data-testid="error-message"]', {
        timeout: 30000
      }),
      page.waitForSelector('[data-testid="treasury-empty"]', {
        timeout: 30000
      })
    ]);

    // Check what we got
    const hasError = await page.locator('[data-testid="error-message"]').count() > 0;
    const hasData = await page.locator('[data-testid="treasury-overview"]').count() > 0;
    const isEmpty = await page.locator('[data-testid="treasury-empty"]').count() > 0;

    // One of these should be true
    expect(hasError || hasData || isEmpty).toBe(true);

    // If error, verify it's user-friendly
    if (hasError) {
      const errorText = await page.locator('[data-testid="error-message"]').textContent();
      expect(errorText).not.toContain('undefined');
      expect(errorText).not.toContain('Cannot read property');
      expect(errorText).not.toContain('null is not an object');
      console.log('Error message:', errorText);
    }

    // Verify no React crashes
    const errorBoundary = await page.locator('[data-testid="error-boundary"]').count();
    expect(errorBoundary).toBe(0);
  });

  // TEST 5: Loading states
  test('should show loading state before data arrives', async ({ page }) => {
    await page.goto('/dashboard');

    // Click tab and immediately check for loading spinner
    await page.click('[data-testid="treasury-tab"]');

    // Loading spinner should appear briefly
    const hasLoadingSpinner = await page.locator('[data-testid="loading-spinner"]')
      .isVisible()
      .catch(() => false);

    // Wait for data to load
    await page.waitForSelector('[data-testid="treasury-overview"]', {
      timeout: 30000
    });

    // Loading spinner should disappear
    const spinnerGone = await page.locator('[data-testid="loading-spinner"]')
      .count();
    expect(spinnerGone).toBe(0);

    console.log(hasLoadingSpinner ?
      '✅ Loading state shown briefly' :
      '⚠️  Data loaded too fast to see spinner'
    );
  });

  // TEST 6: Account details and balance display
  test('should display account balances with correct formatting', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('[data-testid="treasury-tab"]');
    await page.waitForTimeout(5000);

    // Find all account cards
    const accountCards = await page.$$('[data-testid="treasury-account"]');
    expect(accountCards.length).toBeGreaterThan(0);

    // Check first account for expected structure
    if (accountCards.length > 0) {
      const firstCard = accountCards[0];

      // Click to expand (AccordionItem)
      await firstCard.click();
      await page.waitForTimeout(1000);

      // Look for balance display
      const balanceElement = await firstCard.$('[data-testid="account-balance"]');

      if (balanceElement) {
        const balanceText = await balanceElement.textContent();

        // Should not show loading or error states
        expect(balanceText).not.toContain('Loading');
        expect(balanceText).not.toContain('Error');
        expect(balanceText).not.toBe('');

        // Should include asset symbol
        expect(balanceText).toMatch(/ICP|ALEX|BTC|ETH/);

        console.log('Account balance:', balanceText);
      }
    }
  });

  // TEST 7: Asset breakdown verification
  test('should display assets with correct metadata', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('[data-testid="treasury-tab"]');
    await page.waitForTimeout(5000);

    // Capture backend asset data
    const assetCall = networkRequests.find(req =>
      req.method.includes('list_station_assets') ||
      req.method.includes('get_available_assets')
    );

    if (assetCall && assetCall.response) {
      try {
        const parsed = JSON.parse(assetCall.response);

        // Verify assets are shown in UI
        const assetElements = await page.$$('[data-testid="asset-symbol"]');
        expect(assetElements.length).toBeGreaterThan(0);

        // Check each asset has symbol and name
        for (const element of assetElements) {
          const text = await element.textContent();
          expect(text).toBeTruthy();
          expect(text?.length).toBeGreaterThan(0);
        }

        console.log(`✅ ${assetElements.length} assets displayed with metadata`);
      } catch (e) {
        console.log('⚠️  Could not parse asset response');
      }
    }
  });
});

// Helper function to extract method name from IC canister URL
function extractMethodFromUrl(url: string): string {
  // PSEUDOCODE - Parse candid method from URL
  // IC URLs contain method name in query params or path
  // Example: https://ic0.app/api/v2/canister/xxx/call
  // Need to parse the actual method from request body or headers

  if (url.includes('list_orbit_accounts')) return 'list_orbit_accounts';
  if (url.includes('list_station_assets')) return 'list_station_assets';
  if (url.includes('get_available_assets')) return 'get_available_assets';

  return 'unknown_method';
}
```

### Step 2: Update Playwright Configuration

**File: `daopad_frontend/playwright.config.ts` (MODIFY)**

```typescript
// PSEUDOCODE - Add configuration for comprehensive testing

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,  // Increase timeout for mainnet calls
  fullyParallel: false,  // Run tests sequentially to avoid interference
  retries: 2,  // Retry failed tests (mainnet can be flaky)

  use: {
    baseURL: 'https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io',  // VERIFY canister ID!
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
});
```

### Step 3: Add Test Utilities

**File: `daopad_frontend/e2e/helpers/testUtils.ts` (NEW)**

```typescript
// PSEUDOCODE - Utility functions for tests

/**
 * Extract canister method from IC request URL
 */
export function parseIcMethod(url: string): string {
  // Parse IC canister call to get method name
  // Implement based on IC URL structure
}

/**
 * Parse and validate IC canister response
 */
export function parseIcResponse(responseText: string): any {
  try {
    const parsed = JSON.parse(responseText);
    return parsed;
  } catch (e) {
    return null;
  }
}

/**
 * Wait for Redux action to be dispatched
 */
export async function waitForReduxAction(
  page: Page,
  actionType: string,
  timeout: number = 10000
): Promise<any> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const actions = await page.evaluate(() =>
      (window as any).__REDUX_ACTIONS__
    );

    const found = actions?.find(a => a.type.includes(actionType));
    if (found) return found;

    await page.waitForTimeout(100);
  }

  throw new Error(`Redux action ${actionType} not found within ${timeout}ms`);
}

/**
 * Get current Redux state
 */
export async function getReduxState(page: Page): Promise<any> {
  return await page.evaluate(() => {
    const store = (window as any).store;
    return store?.getState();
  });
}
```

## Testing Requirements

### Success Criteria

All tests MUST pass after deployment to mainnet:

```bash
./deploy.sh --network ic
cd daopad_frontend
npx playwright test e2e/treasury-enhanced.spec.ts

# Expected output:
# ✓ should load treasury data from IC → Redux → UI
# ✓ should calculate and display treasury metrics correctly
# ✓ should maintain data when switching tabs
# ✓ should handle network errors gracefully
# ✓ should show loading state before data arrives
# ✓ should display account balances with correct formatting
# ✓ should display assets with correct metadata
#
# All tests passed (7/7)
```

### Verification Checklist

- [ ] Tests run against deployed mainnet code
- [ ] Network layer verified (IC canister calls succeed)
- [ ] State layer verified (Redux actions dispatch correctly)
- [ ] UI layer verified (components render actual data)
- [ ] Data consistency verified (backend → Redux → UI match)
- [ ] Error handling verified (graceful degradation)
- [ ] Loading states verified (spinners appear/disappear)
- [ ] No console errors during test execution
- [ ] Screenshots captured on failure
- [ ] Test artifacts provide actionable debugging info

## Deploy → Test → Iterate Workflow

### Mandatory Testing Loop

```bash
# 1. Make changes to test file
vim daopad_frontend/e2e/treasury-enhanced.spec.ts

# 2. Deploy to mainnet (CRITICAL - tests run against deployed code)
cd /home/theseus/alexandria/daopad-treasury-e2e-plan/src/daopad
./deploy.sh --network ic

# 3. Run tests
cd daopad_frontend
npx playwright test e2e/treasury-enhanced.spec.ts

# 4. Analyze results
if [ $? -ne 0 ]; then
  # Tests failed - analyze artifacts
  ls -lht test-results/*.png
  cat test-results/results.json

  # Form hypothesis, make fix, GOTO step 2
fi

# 5. Tests pass - commit and create PR
```

### Expected Iterations

- **Iteration 1**: Implement basic structure, expect some failures
- **Iteration 2**: Fix network request capture issues
- **Iteration 3**: Fix Redux action tracking
- **Iteration 4**: Fix data consistency checks
- **Iteration 5**: All tests pass ✅

Maximum 7 iterations is reasonable for this complexity.

## File Changes Summary

### New Files
- `daopad_frontend/e2e/treasury-enhanced.spec.ts` - Comprehensive data flow tests
- `daopad_frontend/e2e/helpers/testUtils.ts` - Test utility functions

### Modified Files
- `daopad_frontend/playwright.config.ts` - Enhanced configuration
- `daopad_frontend/e2e/treasury.spec.ts` - Keep for reference, mark as legacy

### Files to Review (No Changes)
- `PLAYWRIGHT_TESTING_GUIDE.md` - Reference for testing principles
- `daopad_frontend/src/pages/DashboardPage.tsx` - Understanding data flow
- `daopad_frontend/src/components/orbit/dashboard/TreasuryOverview.tsx` - UI structure

## Key Implementation Notes

### 1. MUST Deploy Before Testing
```bash
# ❌ WRONG - Tests will fail against stale deployed code
vim test.spec.ts
npx playwright test

# ✅ CORRECT - Deploy first, then test
vim test.spec.ts
./deploy.sh --network ic
npx playwright test
```

### 2. Redux Spy is Critical
The Redux spy injected via `page.addInitScript()` is THE key to verifying state management. Without it, you cannot verify data flow.

### 3. Network Request Capture
Monitor the `response` event, not `request`. You need to capture actual responses to verify data.

### 4. Data Consistency Checks
Don't just verify elements exist - verify the DATA is consistent:
```typescript
// ❌ BAD
expect(accountCards.length).toBeGreaterThan(0);

// ✅ GOOD
const backendCount = parseResponse(backendCall).Ok.accounts.length;
const uiCount = accountCards.length;
expect(uiCount).toBe(backendCount);
```

### 5. Timeout Handling
Mainnet calls can be slow. Use generous timeouts (30s+) and explicit waits.

## References

- **Testing Guide**: `PLAYWRIGHT_TESTING_GUIDE.md` (READ THIS FIRST)
- **Reference Test**: `e2e/app-route.spec.ts` (public dashboard example)
- **Treasury UI**: `src/components/orbit/dashboard/TreasuryOverview.tsx`
- **Backend Service**: `src/services/backend/orbit/OrbitAccountsService.ts`
- **Canister IDs**: `CLAUDE.md` - DAOPad Frontend: `l7rlj-6aaaa-aaaap-qp2ra-cai`

## Final Notes

This plan follows the "data-driven integration testing" philosophy from the Playwright Testing Guide. The goal is NOT to test that buttons exist, but to verify that:

1. Backend IC canisters return valid data
2. Redux state updates correctly
3. UI renders the actual data
4. The entire pipeline is consistent

When tests pass, you have REAL confidence that the treasury tab works end-to-end.
