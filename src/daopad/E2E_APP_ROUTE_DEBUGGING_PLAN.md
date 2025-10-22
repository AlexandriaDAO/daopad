# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-e2e-testing/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-e2e-testing/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Test**:
   ```bash
   cd daopad_frontend
   npm install
   npx playwright install chromium
   npx playwright test e2e/app-route.spec.ts --headed
   ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Test]: End-to-end test for /app route data loading"
   git push -u origin feature/e2e-testing-setup
   gh pr create --title "[Test]: E2E Test for App Route Public Dashboard" --body "Implements E2E_APP_ROUTE_DEBUGGING_PLAN.md

## What This PR Does
- Adds comprehensive Playwright test for /app route data loading
- Captures network requests, console logs, and screenshots
- Provides iterative debugging workflow for skeleton loading issue

## Test Coverage
- Public dashboard data fetching
- Component skeleton loading states
- Network request verification
- Error boundary handling
- Console error detection

## How to Use
\`\`\`bash
cd daopad_frontend
npx playwright test e2e/app-route.spec.ts --headed
\`\`\`

View test results in \`playwright-report/\` or \`test-results/\`"
   ```
5. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view --json comments`
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

**Branch:** `feature/e2e-testing-setup`
**Worktree:** `/home/theseus/alexandria/daopad-e2e-testing/src/daopad`

---

# Implementation Plan: E2E Test for /app Route Data Loading

## Problem Statement

The `/app` route displays skeleton loaders indefinitely for non-authenticated users. The public dashboard data should load via the `fetchPublicDashboard` Redux thunk, but something is preventing data from arriving.

## Current State Analysis

### File Structure
```
daopad_frontend/
├── e2e/
│   ├── treasury.spec.ts              # Existing treasury tests
│   ├── setup/auth.setup.ts            # Auth helper
│   └── helpers/auth.ts                # Auth utilities
├── playwright.config.ts               # Existing config
├── src/
│   ├── routes/
│   │   └── AppRoute.tsx               # Main route component (lines 1-343)
│   ├── components/
│   │   ├── PublicStatsStrip.tsx       # Shows stats with skeletons (lines 1-78)
│   │   ├── PublicActivityFeed.tsx     # Shows proposals (lines 1-122)
│   │   └── TreasuryShowcase.tsx       # Shows treasuries (lines 1-92)
│   └── features/dao/
│       └── daoSlice.ts                # Redux slice with fetchPublicDashboard (lines 1-247)
```

### Data Flow (As Designed)
```
AppRoute.tsx (line 58-101)
    ↓
useEffect → dispatch(fetchPublicDashboard())
    ↓
daoSlice.ts (line 5-70): createAsyncThunk
    ↓
Parallel Promise.all():
  - kongService.getSystemStats()        # Total lock canisters
  - proposalService.listActive()        # Active proposals
  - tokenService.listAllStations()      # Token→Station mappings
  - kongService.listAllRegistrations()  # Registered voters
    ↓
Redux state updated (lines 192-209)
    ↓
Components render data from state.dao.publicDashboard
```

### Identified Issues (Hypotheses)
1. **Network requests failing** - Backend canister calls timing out or erroring
2. **CORS/Service Worker issues** - IC network boundary problems
3. **Redux state not updating** - Thunk completing but state not changing
4. **Component not subscribing** - useSelector not triggering re-render
5. **Anonymous identity failing** - Services initialized with `null` identity failing

### Existing Test Infrastructure
- Playwright already configured (playwright.config.ts:1-36)
- Base URL: `https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io`
- Existing treasury tests show network monitoring pattern (treasury.spec.ts:6-265)
- Auth helpers available but NOT needed for public route

## Implementation Plan

### Phase 1: Create E2E Test File

**File:** `daopad_frontend/e2e/app-route.spec.ts` (NEW)

```typescript
// PSEUDOCODE - Implementer writes real code
import { test, expect, Page } from '@playwright/test';

// Test state capture
const consoleMessages = [];
const consoleErrors = [];
const networkRequests = [];
const publicDashboardCalls = [];

test.describe('App Route - Public Dashboard Loading', () => {

  test.beforeEach(async ({ page }) => {
    // Clear capture arrays

    // Monitor console
    page.on('console', (msg) => {
      // Push to consoleMessages array
      // If error, push to consoleErrors and log
    });

    // Monitor network requests
    page.on('response', async (response) => {
      const url = response.url();

      // Capture all IC canister calls
      if (url.includes('lwsav-iiaaa-aaaap-qp2qq-cai') ||  // DAOPad backend
          url.includes('ic0.app/api') ||
          url.includes('icp0.io/api')) {

        try {
          const responseText = await response.text();
          const entry = {
            url: url,
            status: response.status(),
            timestamp: Date.now(),
            response: responseText
          };

          networkRequests.push(entry);

          // Track specific public dashboard methods
          if (url.includes('get_system_stats') ||
              url.includes('list_active') ||
              url.includes('list_all_stations') ||
              url.includes('list_all_registrations')) {
            publicDashboardCalls.push(entry);
          }

          console.log(`[Network] ${response.status()} ${extractMethodName(url)}`);

          if (!response.ok()) {
            console.error(`[Network Error] ${url}:`, responseText.substring(0, 500));
          }
        } catch (e) {
          // Binary response, skip
        }
      }
    });

    // Monitor Redux state changes (inject debug script)
    await page.addInitScript(() => {
      // Override Redux dispatch to log actions
      window.__REDUX_DISPATCH_LOG__ = [];
      const originalDispatch = window.store?.dispatch;
      if (originalDispatch) {
        window.store.dispatch = function(action) {
          window.__REDUX_DISPATCH_LOG__.push({
            type: action.type,
            payload: action.payload,
            timestamp: Date.now()
          });
          return originalDispatch.apply(this, arguments);
        };
      }
    });
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      // Log all captured data for debugging

      console.log('\n=== CONSOLE ERRORS ===');
      consoleErrors.forEach((err, i) => {
        console.log(`${i+1}. ${err}`);
      });

      console.log('\n=== PUBLIC DASHBOARD API CALLS ===');
      publicDashboardCalls.forEach((call, i) => {
        console.log(`${i+1}. ${call.status} ${extractMethodName(call.url)}`);
        console.log(`   Response: ${call.response.substring(0, 300)}...`);
      });

      console.log('\n=== REDUX ACTIONS ===');
      const reduxLog = await page.evaluate(() => window.__REDUX_DISPATCH_LOG__);
      reduxLog.filter(a => a.type.includes('publicDashboard')).forEach((action, i) => {
        console.log(`${i+1}. ${action.type}`);
      });

      // Screenshot
      await page.screenshot({
        path: `test-results/app-route-failure-${Date.now()}.png`,
        fullPage: true
      });
    }

    // Clear arrays
  });

  test('should load public dashboard data within 30 seconds', async ({ page }) => {
    // Navigate to /app
    await page.goto('/app');

    // Wait for page structure
    await page.waitForSelector('header h1:has-text("DAOPad")', { timeout: 10000 });

    // Verify we're NOT logged in (should see "Connect with Internet Identity" button)
    const loginButton = page.locator('button:has-text("Connect with Internet Identity")');
    await expect(loginButton).toBeVisible({ timeout: 5000 });

    // Wait for public dashboard data to load
    // Method 1: Check if skeletons disappear
    const statsSkeleton = page.locator('[data-testid="stats-loading"]').first();
    await expect(statsSkeleton).not.toBeVisible({ timeout: 30000 });

    // Method 2: Check if actual numbers appear
    const participantsCount = page.locator('text=/Participants/i').locator('xpath=following-sibling::p');
    await expect(participantsCount).not.toHaveText('0', { timeout: 30000 });

    // Verify all 4 stats loaded
    const statCards = page.locator('[data-testid="stat-card"]');
    await expect(statCards).toHaveCount(4, { timeout: 5000 });

    // Verify no console errors
    expect(consoleErrors.length).toBe(0);
    if (consoleErrors.length > 0) {
      throw new Error(`Console errors found: ${consoleErrors.join('\n')}`);
    }

    // Verify public dashboard API calls succeeded
    expect(publicDashboardCalls.length).toBeGreaterThan(0);
    const failedCalls = publicDashboardCalls.filter(c => c.status >= 400);
    expect(failedCalls.length).toBe(0);
  });

  test('should fetch data from all 4 backend services', async ({ page }) => {
    await page.goto('/app');

    // Wait 10 seconds for all requests to complete
    await page.waitForTimeout(10000);

    // Check for specific method calls
    const methodCalls = publicDashboardCalls.map(c => extractMethodName(c.url));

    expect(methodCalls).toContain('get_system_stats');       // Kong Locker
    expect(methodCalls).toContain('list_active');            // Proposals
    expect(methodCalls).toContain('list_all_stations');      // Tokens
    expect(methodCalls).toContain('list_all_registrations'); // Kong Locker

    // All should return 200
    publicDashboardCalls.forEach(call => {
      expect(call.status).toBe(200);
    });
  });

  test('should update Redux state with dashboard data', async ({ page }) => {
    await page.goto('/app');

    // Wait for fetchPublicDashboard actions
    await page.waitForTimeout(15000);

    // Check Redux actions
    const reduxLog = await page.evaluate(() => window.__REDUX_DISPATCH_LOG__ || []);

    const pendingAction = reduxLog.find(a => a.type === 'dao/fetchPublicDashboard/pending');
    const fulfilledAction = reduxLog.find(a => a.type === 'dao/fetchPublicDashboard/fulfilled');
    const rejectedAction = reduxLog.find(a => a.type === 'dao/fetchPublicDashboard/rejected');

    expect(pendingAction).toBeDefined();
    expect(fulfilledAction).toBeDefined();
    expect(rejectedAction).toBeUndefined();

    // Check payload has data
    if (fulfilledAction) {
      expect(fulfilledAction.payload).toBeDefined();
      expect(fulfilledAction.payload.stats).toBeDefined();
      console.log('Redux payload stats:', fulfilledAction.payload.stats);
    }
  });

  test('should render PublicActivityFeed with proposals', async ({ page }) => {
    await page.goto('/app');

    // Wait for activity feed
    const activityCard = page.locator('text=/Active Proposals|Governance Activity/i').locator('..');
    await expect(activityCard).toBeVisible({ timeout: 30000 });

    // Check if proposals loaded OR empty state shown
    const hasProposals = await page.locator('[data-testid="proposal-item"]').count() > 0;
    const hasEmptyState = await page.locator('text=/No active proposals/i').count() > 0;

    expect(hasProposals || hasEmptyState).toBe(true);
  });

  test('should render TreasuryShowcase with treasuries', async ({ page }) => {
    await page.goto('/app');

    // Wait for treasury showcase
    const treasuryCard = page.locator('text=/Token Treasuries/i').locator('..');
    await expect(treasuryCard).toBeVisible({ timeout: 30000 });

    // Check for treasury items or empty state
    const hasTreasuries = await page.locator('[data-testid="treasury-item"]').count() > 0;
    const hasEmptyState = await page.locator('text=/No treasuries/i').count() > 0;

    expect(hasTreasuries || hasEmptyState).toBe(true);
  });

  test('should handle network failures gracefully', async ({ page }) => {
    // Simulate offline
    await page.context().setOffline(true);

    await page.goto('/app');

    // Should show error state or keep loading
    await page.waitForTimeout(10000);

    // Should NOT crash
    const errorBoundary = await page.locator('[data-testid="error-boundary"]').count();
    expect(errorBoundary).toBe(0);

    // Re-enable network
    await page.context().setOffline(false);
  });

  test('should poll every 30 seconds when logged out', async ({ page }) => {
    await page.goto('/app');

    // Wait for first fetch
    await page.waitForTimeout(5000);
    const initialCallCount = publicDashboardCalls.length;

    // Wait 35 seconds (should trigger 1 more poll)
    await page.waitForTimeout(35000);

    // Should have made another set of calls
    expect(publicDashboardCalls.length).toBeGreaterThan(initialCallCount);

    console.log(`Polling verified: ${initialCallCount} → ${publicDashboardCalls.length} calls`);
  });
});

// Helper functions
function extractMethodName(url: string): string {
  // Parse IC canister call URL to extract method name
  // Example: https://ic0.app/api/v2/canister/xxx/call -> extract from body
  // For now, return simplified version

  if (url.includes('get_system_stats')) return 'get_system_stats';
  if (url.includes('list_active')) return 'list_active';
  if (url.includes('list_all_stations')) return 'list_all_stations';
  if (url.includes('list_all_registrations')) return 'list_all_registrations';

  return new URL(url).pathname.split('/').pop() || 'unknown';
}
```

### Phase 2: Add Data Test IDs to Components

**File:** `daopad_frontend/src/components/PublicStatsStrip.tsx` (MODIFY)

```tsx
// PSEUDOCODE - Add test IDs for Playwright selectors

const StatCard: React.FC<StatCardProps> = ({ label, value, loading }) => (
  <Card className="..." data-testid="stat-card">
    <p className="...">
      {label}
    </p>
    {loading ? (
      <Skeleton className="..." data-testid="stats-loading" />
    ) : (
      <p className="..." data-testid="stat-value">
        {value.toLocaleString()}
      </p>
    )}
  </Card>
);
```

**File:** `daopad_frontend/src/components/PublicActivityFeed.tsx` (MODIFY)

```tsx
// PSEUDOCODE - Add test IDs

const ProposalItem: React.FC<{ proposal: ProposalData }> = ({ proposal }) => {
  return (
    <div className="..." data-testid="proposal-item">
      {/* existing content */}
    </div>
  );
};
```

**File:** `daopad_frontend/src/components/TreasuryShowcase.tsx` (MODIFY)

```tsx
// PSEUDOCODE - Add test IDs

<div
  key={tokenId}
  className="..."
  data-testid="treasury-item"
>
  {/* existing content */}
</div>
```

### Phase 3: Expose Redux Store for Testing

**File:** `daopad_frontend/src/main.tsx` (MODIFY)

```tsx
// PSEUDOCODE - Expose store to window for debugging

import { store } from './app/store';

// For Playwright testing
if (import.meta.env.DEV || window.location.hostname.includes('icp0.io')) {
  window.store = store;
}

// Existing ReactDOM.createRoot...
```

### Phase 4: Update Playwright Config (If Needed)

**File:** `daopad_frontend/playwright.config.ts` (MODIFY if needed)

```typescript
// PSEUDOCODE - Ensure test artifacts are saved

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,

  use: {
    baseURL: process.env.TEST_BASE_URL || 'https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/app-route-results.json' }]
  ],

  timeout: 120000,
});
```

## Testing Strategy

### Local Development Workflow
```bash
# 1. Install dependencies
cd daopad_frontend
npm install

# 2. Install Playwright browsers
npx playwright install chromium

# 3. Run test in headed mode (see browser)
npx playwright test e2e/app-route.spec.ts --headed

# 4. Run test in debug mode (step through)
npx playwright test e2e/app-route.spec.ts --debug

# 5. View HTML report
npx playwright show-report

# 6. View specific test results
cat test-results/app-route-results.json | jq '.suites[0].specs'
```

### Debugging Workflow (Iterative)

```bash
# Run 1: Capture baseline
npx playwright test e2e/app-route.spec.ts --headed > test-run-1.log 2>&1

# Analyze logs
cat test-run-1.log | grep "Network Error"  # Check failed requests
cat test-run-1.log | grep "Console error"  # Check frontend errors
cat test-run-1.log | grep "Redux"          # Check state updates

# Add logging to backend/frontend based on findings
# Example: Add console.log in daoSlice.ts fetchPublicDashboard

# Run 2: Test fix
npx playwright test e2e/app-route.spec.ts --headed > test-run-2.log 2>&1

# Compare
diff test-run-1.log test-run-2.log

# Repeat until test passes
```

### Expected Test Outputs

**Success Case:**
```
✓ should load public dashboard data within 30 seconds
  [Network] 200 get_system_stats
  [Network] 200 list_active
  [Network] 200 list_all_stations
  [Network] 200 list_all_registrations
  Redux payload stats: { participants: 45, activeProposals: 3, ... }

✓ should fetch data from all 4 backend services
✓ should update Redux state with dashboard data
```

**Failure Case (Example):**
```
✗ should load public dashboard data within 30 seconds

  === CONSOLE ERRORS ===
  1. TypeError: Cannot read property 'toText' of undefined
  2. Uncaught (in promise) Error: Canister has no update method 'list_active'

  === PUBLIC DASHBOARD API CALLS ===
  1. 500 get_system_stats
     Response: {"Err":"Canister rejected the call"}

  === REDUX ACTIONS ===
  1. dao/fetchPublicDashboard/pending
  2. dao/fetchPublicDashboard/rejected

  Screenshot: test-results/app-route-failure-1698765432.png
```

## Success Criteria

- [ ] Test file created: `e2e/app-route.spec.ts`
- [ ] All 7 test cases implemented
- [ ] Data test IDs added to all 3 components
- [ ] Redux store exposed for debugging
- [ ] Test can run in headed mode: `npx playwright test e2e/app-route.spec.ts --headed`
- [ ] Test captures network requests, console logs, and screenshots
- [ ] Test report shows EXACTLY why skeletons persist
- [ ] Documentation includes iterative debugging workflow

## Files Modified

**NEW:**
- `daopad_frontend/e2e/app-route.spec.ts` (~400 lines)

**MODIFIED:**
- `daopad_frontend/src/components/PublicStatsStrip.tsx` (add 3 data-testid attributes)
- `daopad_frontend/src/components/PublicActivityFeed.tsx` (add 1 data-testid attribute)
- `daopad_frontend/src/components/TreasuryShowcase.tsx` (add 1 data-testid attribute)
- `daopad_frontend/src/main.tsx` (expose store to window for testing)

**UNCHANGED:**
- `daopad_frontend/playwright.config.ts` (already configured correctly)

## Post-Implementation: Using the Test

Once the test is implemented, use it to debug the skeleton loading issue:

```bash
# 1. Run test to capture failure
cd /home/theseus/alexandria/daopad-e2e-testing/src/daopad/daopad_frontend
npx playwright test e2e/app-route.spec.ts --headed

# 2. Review artifacts
cat test-results/app-route-results.json | jq '.'
open playwright-report/index.html

# 3. Identify root cause from logs
# Common issues:
# - Network: 500 errors → Backend canister issue
# - Network: Timeout → Service initialization problem
# - Redux: rejected action → Frontend error handling
# - Console: TypeError → Data transformation bug

# 4. Add targeted logging
# Example: If network calls succeed but Redux shows rejected:
echo "console.log('Kong service response:', result)" >> src/features/dao/daoSlice.ts

# 5. Re-run test
npx playwright test e2e/app-route.spec.ts --headed

# 6. Compare outputs
diff test-run-1.log test-run-2.log

# 7. Fix identified issue in code

# 8. Verify fix
npx playwright test e2e/app-route.spec.ts

# 9. Deploy to mainnet
cd ../
./deploy.sh --network ic
```

## Notes

- **Playwright MCP Server**: Can be used to interactively navigate and refine test
- **No Authentication Needed**: Public dashboard is anonymous-accessible
- **Real Network**: Tests hit live mainnet canister (lwsav-iiaaa-aaaap-qp2qq-cai)
- **30-Second Polling**: Test verifies automatic refresh for logged-out users
- **Comprehensive Capture**: Network, console, Redux, screenshots all logged
- **Iterative**: Designed for repeated run → analyze → fix → run cycles
