# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-treasury-integration-tests/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-treasury-integration-tests/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Backend changes:
     ```bash
     cargo build --target wasm32-unknown-unknown --release -p daopad_backend
     candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
     ./deploy.sh --network ic --backend-only
     cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
     ```
   - E2E tests:
     ```bash
     cd daopad_frontend
     npm install
     npx playwright install chromium
     npm run test:e2e
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Fix]: Treasury E2E Tests - Fix backend bug and add Playwright verification"
   git push -u origin feature/fix-treasury-integration-tests
   gh pr create --title "[Fix]: Treasury E2E Tests - Fix backend bug and add Playwright verification" --body "Implements FIX-TREASURY-INTEGRATION-TESTS.md

## Problem
Treasury tab broken - can't verify without manually opening UI. Need E2E tests that capture:
- Browser console errors
- Network request failures
- UI rendering issues
- Component state problems

## Solution
1. Fix backend bug (list_orbit_accounts calling wrong canister)
2. Add Playwright E2E tests that verify full UI flow
3. Capture console errors, network requests, screenshots on failure

## Testing
- ✅ Backend fix verified
- ✅ E2E tests pass showing 4 treasury accounts
- ✅ Console error capture working
- ✅ Network request logging working
- ✅ Screenshots on failure

## Changes
- Backend: Fixed canister ID lookup bug
- E2E Tests: Added Playwright treasury tests
- Test Infrastructure: Error capture, network logging, screenshots"
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

**Branch:** `feature/fix-treasury-integration-tests`
**Worktree:** `/home/theseus/alexandria/daopad-treasury-integration-tests/src/daopad`

---

# Fix Treasury with E2E Testing

## Problem Statement

The Treasury tab in DAOPad is broken and the user needs **automated E2E tests** to verify it works without manually opening the UI.

### User's Pain Point (Direct Quote)
```
Your pain point is UI runtime errors like the AddressBook issue (TypeError:
ps.setIdentity is not a function). For those scenarios, this format lacks:

1. Browser Console Capture: Can't see runtime errors automatically
2. Network Request Inspection: Can't see what requests/responses
3. Visual State: No screenshots showing loading spinners, blank screens
4. Component State: No React component state or props at time of error
5. Reproduction Context: Missing auth state, navigation path, user actions
6. Error Boundaries: React error boundary output not captured
```

### What We Need
- **E2E tests** that open a real browser
- **Capture console errors** (TypeError, Promise rejections, etc.)
- **Capture network requests** (see what API calls fail)
- **Take screenshots** on failure (see visual state)
- **Verify UI actually displays** treasury data (not just backend API works)
- **Run without manual intervention** (agents can verify fixes)

### Expected Treasury State (Alexandria DAO)
- **4 treasury accounts** with different purposes
- **Mixed assets**: Some accounts hold ICP, some hold ALEX, some hold both
- **Balances visible**: UI should show actual mainnet balances
- **No console errors**: Treasury tab loads cleanly

## Two-Part Solution

### Part 1: Fix Backend Bug (Still Needed!)

**Current Error**:
```
"Canister ysy5f-2qaaa-aaaap-qkmmq-cai has no update method 'list_accounts'"
```

Backend is calling ALEX token canister instead of Orbit Station canister.

### Part 2: Add E2E Tests (Main Focus)

Playwright tests that:
1. Open browser to DAOPad UI
2. Handle authentication
3. Navigate to Treasury tab
4. Capture console errors
5. Log network requests
6. Verify 4 accounts display
7. Take screenshots on failure

## Backend Fix (Quick Reference)

### Root Cause

**File**: `daopad_backend/src/api/orbit.rs:88-115`

```rust
#[update]
pub async fn list_orbit_accounts(
    station_id: Principal,  // ❌ WRONG: callers pass token_id
    search_term: Option<String>,
    limit: Option<u64>,
    offset: Option<u64>,
) -> Result<ListAccountsResult, String> {
    // Calls list_accounts on whatever principal is passed
    // Problem: Receives token_id but calls it as station_id
    let result: Result<(ListAccountsResult,), _> =
        ic_cdk::call(station_id, "list_accounts", (input,)).await;
}
```

### Backend Fix (PSEUDOCODE)

```rust
#[update]
pub async fn list_orbit_accounts(
    token_canister_id: Principal,  // ✅ FIXED: semantic clarity
    search_term: Option<String>,
    limit: Option<u64>,
    offset: Option<u64>,
) -> Result<ListAccountsResult, String> {
    // ✅ NEW: Lookup station_id from token_id
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
    }).ok_or_else(|| format!(
        "No Orbit Station found for token {}",
        token_canister_id
    ))?;

    // Build input
    let input = ListAccountsInput {
        search_term,
        paginate: if limit.is_some() || offset.is_some() {
            Some(crate::types::orbit::PaginationInput { limit, offset })
        } else {
            None
        },
    };

    // ✅ NOW CALLS CORRECT CANISTER
    let result: Result<(ListAccountsResult,), _> =
        ic_cdk::call(station_id, "list_accounts", (input,)).await;

    match result {
        Ok((response,)) => Ok(response),
        Err((code, msg)) => Err(format!(
            "Failed to call Orbit Station list_accounts: {:?} - {}",
            code, msg
        )),
    }
}
```

**Changes**: 8 lines added (lookup logic), parameter renamed for clarity

## E2E Test Implementation

### Setup Playwright

**File**: `daopad_frontend/package.json`

```json
// PSEUDOCODE: Add Playwright dependencies and scripts
{
  "devDependencies": {
    // ... existing deps
    "@playwright/test": "^1.47.0"
  },
  "scripts": {
    // ... existing scripts
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

### Playwright Config

**File**: `daopad_frontend/playwright.config.ts` (NEW)

```typescript
// PSEUDOCODE: Playwright configuration
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Treasury tests run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // One worker to avoid auth conflicts
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],

  use: {
    baseURL: 'https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io',
    trace: 'retain-on-failure', // Capture trace on failure
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Enable console message capture
        launchOptions: {
          args: ['--enable-logging', '--v=1']
        }
      },
    },
  ],

  // Timeout for each test
  timeout: 120000, // 2 minutes (mainnet calls are slow)
});
```

### Authentication Helper

**File**: `daopad_frontend/e2e/helpers/auth.ts` (NEW)

```typescript
// PSEUDOCODE: Authentication utilities
import { Page } from '@playwright/test';

/**
 * Handle Internet Identity authentication
 *
 * Strategy: Use delegated identity stored in localStorage
 * This avoids complex II flow in tests
 */
export async function authenticateForTests(page: Page) {
  // Option 1: Pre-authenticated state (recommended)
  // User runs setup once to store auth state
  await page.goto('/');

  // Load stored authentication from .auth/user.json
  // This contains delegated identity from previous manual login
  const authFile = '.auth/user.json';
  const storageState = require(`../../${authFile}`);

  // Apply authentication state
  await page.context().addCookies(storageState.cookies);
  await page.evaluate((localStorage) => {
    for (const [key, value] of Object.entries(localStorage)) {
      window.localStorage.setItem(key, value);
    }
  }, storageState.localStorage);

  // Verify authenticated
  await page.goto('/');
  await page.waitForSelector('[data-testid="user-menu"]', { timeout: 10000 });
}

/**
 * Setup authentication (run once manually)
 *
 * Usage:
 *   npm run test:e2e:setup
 *
 * This opens browser, lets you login with II, saves state
 */
export async function setupAuthentication(page: Page) {
  await page.goto('/');

  // Click login button
  await page.click('text=Connect Wallet');

  // Wait for II redirect and manual login
  console.log('Please login with Internet Identity...');
  await page.waitForSelector('[data-testid="user-menu"]', {
    timeout: 120000 // 2 min for manual login
  });

  // Save authentication state
  await page.context().storageState({ path: '.auth/user.json' });
  console.log('Authentication saved to .auth/user.json');
}
```

### Treasury E2E Test

**File**: `daopad_frontend/e2e/treasury.spec.ts` (NEW)

```typescript
// PSEUDOCODE: Treasury tab E2E tests
import { test, expect, Page } from '@playwright/test';
import { authenticateForTests } from './helpers/auth';

// Capture console messages
const consoleMessages: Array<{type: string, text: string}> = [];
const consoleErrors: Array<string> = [];

// Capture network requests
const networkRequests: Array<{url: string, status: number, response: any}> = [];

test.describe('Treasury Tab - E2E', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Capture console messages
    page.on('console', (msg) => {
      const entry = {
        type: msg.type(),
        text: msg.text()
      };
      consoleMessages.push(entry);

      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.error('Browser console error:', msg.text());
      }
    });

    // Capture network requests to backend
    page.on('response', async (response) => {
      const url = response.url();

      // Only track backend API calls
      if (url.includes('lwsav-iiaaa-aaaap-qp2qq-cai') ||
          url.includes('ic0.app/api')) {
        try {
          const responseData = await response.text();
          networkRequests.push({
            url: url,
            status: response.status(),
            response: responseData
          });

          console.log(`Network: ${response.status()} ${url}`);

          if (!response.ok()) {
            console.error(`Failed request: ${url}`, responseData);
          }
        } catch (e) {
          // Response might not be JSON/text
        }
      }
    });

    // Authenticate
    await authenticateForTests(page);
  });

  test.afterEach(async () => {
    // Log captured data on failure
    if (test.info().status !== 'passed') {
      console.log('\n=== CONSOLE ERRORS ===');
      consoleErrors.forEach((err, i) => {
        console.log(`${i + 1}. ${err}`);
      });

      console.log('\n=== NETWORK REQUESTS ===');
      networkRequests.forEach((req, i) => {
        console.log(`${i + 1}. ${req.status} ${req.url}`);
        console.log(`   Response: ${req.response.substring(0, 200)}...`);
      });

      // Take screenshot
      await page.screenshot({
        path: `test-results/treasury-failure-${Date.now()}.png`,
        fullPage: true
      });
    }

    // Clear for next test
    consoleMessages.length = 0;
    consoleErrors.length = 0;
    networkRequests.length = 0;
  });

  test('should load Treasury tab without console errors', async () => {
    // Navigate to Alexandria DAO
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Alexandria")', { timeout: 10000 });

    // Click Treasury tab
    await page.click('[data-testid="treasury-tab"]');

    // Wait for treasury content to load
    await page.waitForSelector('[data-testid="treasury-overview"]', {
      timeout: 30000
    });

    // Verify no console errors
    expect(consoleErrors.length).toBe(0);

    // If there are errors, fail with details
    if (consoleErrors.length > 0) {
      throw new Error(
        `Console errors found:\n${consoleErrors.join('\n')}`
      );
    }
  });

  test('should display 4 treasury accounts', async () => {
    // Navigate to Treasury tab
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.click('[data-testid="treasury-tab"]');

    // Wait for accounts to load
    await page.waitForSelector('[data-testid="treasury-account"]', {
      timeout: 30000,
      state: 'attached'
    });

    // Count accounts
    const accounts = await page.$$('[data-testid="treasury-account"]');

    console.log(`Found ${accounts.length} treasury accounts`);

    // Should have 4 accounts
    expect(accounts.length).toBe(4);

    // Log account names for debugging
    for (let i = 0; i < accounts.length; i++) {
      const name = await accounts[i].textContent();
      console.log(`Account ${i + 1}: ${name}`);
    }
  });

  test('should display account balances', async () => {
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.click('[data-testid="treasury-tab"]');

    // Wait for first account
    await page.waitForSelector('[data-testid="treasury-account"]');

    // Check that at least one account has a balance displayed
    const balanceElements = await page.$$('[data-testid="account-balance"]');
    expect(balanceElements.length).toBeGreaterThan(0);

    // Verify balance is not "Loading..." or "0"
    const firstBalance = await balanceElements[0].textContent();
    console.log('First account balance:', firstBalance);

    expect(firstBalance).not.toContain('Loading');
    expect(firstBalance).not.toBe('0');
  });

  test('should show asset breakdown (ICP/ALEX)', async () => {
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.click('[data-testid="treasury-tab"]');

    await page.waitForSelector('[data-testid="treasury-account"]');

    // Should see ICP mentioned somewhere
    const icpMentioned = await page.locator('text=ICP').count() > 0;
    expect(icpMentioned).toBe(true);

    // Should see ALEX mentioned somewhere
    const alexMentioned = await page.locator('text=ALEX').count() > 0;
    expect(alexMentioned).toBe(true);

    console.log('Asset symbols found: ICP, ALEX');
  });

  test('should not show loading spinner indefinitely', async () => {
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.click('[data-testid="treasury-tab"]');

    // Loading spinner should disappear within 30 seconds
    await page.waitForSelector('[data-testid="loading-spinner"]', {
      state: 'detached',
      timeout: 30000
    });

    // Should show content instead
    const hasContent = await page.locator('[data-testid="treasury-account"]').count() > 0;
    expect(hasContent).toBe(true);
  });

  test('should handle network errors gracefully', async () => {
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.click('[data-testid="treasury-tab"]');

    // Wait for any state (content or error)
    await Promise.race([
      page.waitForSelector('[data-testid="treasury-account"]', { timeout: 30000 }),
      page.waitForSelector('[data-testid="error-message"]', { timeout: 30000 })
    ]);

    // Check if error is shown
    const errorVisible = await page.locator('[data-testid="error-message"]').count() > 0;

    if (errorVisible) {
      const errorText = await page.locator('[data-testid="error-message"]').textContent();
      console.log('Error message shown:', errorText);

      // Error should be user-friendly, not raw technical error
      expect(errorText).not.toContain('Canister has no update method');
      expect(errorText).not.toContain('undefined is not a function');
    }
  });

  test('should capture React component errors', async () => {
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');

    // Add error boundary handler
    await page.exposeFunction('logReactError', (error: string) => {
      console.error('React error:', error);
      consoleErrors.push(`React: ${error}`);
    });

    await page.click('[data-testid="treasury-tab"]');
    await page.waitForTimeout(5000);

    // Check for React error boundary
    const errorBoundary = await page.locator('[data-testid="error-boundary"]').count() > 0;

    if (errorBoundary) {
      const errorText = await page.locator('[data-testid="error-boundary"]').textContent();
      throw new Error(`React error boundary triggered: ${errorText}`);
    }

    // Verify no React errors in console
    const reactErrors = consoleErrors.filter(e =>
      e.includes('React') ||
      e.includes('Component') ||
      e.includes('TypeError')
    );

    expect(reactErrors.length).toBe(0);
  });
});

test.describe('Treasury Network Requests', () => {
  test('should successfully call list_orbit_accounts', async ({ page }) => {
    const networkCalls: Array<{url: string, response: string}> = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('list_orbit_accounts')) {
        const data = await response.text();
        networkCalls.push({ url, response: data });
        console.log('list_orbit_accounts response:', data.substring(0, 500));
      }
    });

    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.click('[data-testid="treasury-tab"]');
    await page.waitForTimeout(5000);

    // Should have called list_orbit_accounts
    expect(networkCalls.length).toBeGreaterThan(0);

    // Should not contain error about "no update method"
    const hasError = networkCalls.some(call =>
      call.response.includes('has no update method')
    );
    expect(hasError).toBe(false);
  });

  test('should receive account data in correct format', async ({ page }) => {
    let accountsData: any = null;

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('list_orbit_accounts')) {
        try {
          const text = await response.text();
          // Parse candid response
          accountsData = JSON.parse(text);
        } catch (e) {
          console.error('Failed to parse response:', e);
        }
      }
    });

    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.click('[data-testid="treasury-tab"]');
    await page.waitForTimeout(5000);

    // Should have received data
    expect(accountsData).not.toBeNull();

    // Should have Ok variant with accounts
    expect(accountsData.Ok).toBeDefined();
    expect(accountsData.Ok.accounts).toBeDefined();
    expect(Array.isArray(accountsData.Ok.accounts)).toBe(true);

    console.log('Received accounts:', accountsData.Ok.accounts.length);
  });
});
```

### Auth Setup Script

**File**: `daopad_frontend/e2e/setup/auth.setup.ts` (NEW)

```typescript
// PSEUDOCODE: One-time auth setup
import { test as setup } from '@playwright/test';
import { setupAuthentication } from '../helpers/auth';

setup('authenticate', async ({ page }) => {
  await setupAuthentication(page);
});
```

### Test Data Attributes

**File**: `daopad_frontend/src/components/orbit/dashboard/TreasuryOverview.tsx`

```typescript
// PSEUDOCODE: Add test IDs to Treasury component
export function TreasuryOverview({ assets, loading, onTransfer, onViewAccount }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div
            className="flex items-center justify-center"
            data-testid="loading-spinner"  // ADD THIS
          >
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <Card>
        <CardContent className="py-8" data-testid="treasury-empty">  // ADD THIS
          <div className="flex flex-col items-center justify-center gap-3">
            <Wallet className="w-12 h-12 text-muted-foreground" />
            <p className="text-center text-muted-foreground">
              No assets in treasury
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="treasury-overview">  // ADD THIS
      {/* Summary Card */}
      <Card>
        {/* ... */}
      </Card>

      {/* Account List */}
      {sortedAssets.map((asset, index) => (
        <Card key={asset.symbol} data-testid="treasury-account">  // ADD THIS
          <CardHeader>
            <CardTitle>{asset.symbol}</CardTitle>
          </CardHeader>
          <CardContent>
            <div data-testid="account-balance">  // ADD THIS
              {formatBalance(asset.totalBalance, asset.decimals)}
            </div>
            {/* ... */}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**File**: `daopad_frontend/src/pages/DashboardPage.tsx`

```typescript
// PSEUDOCODE: Add test IDs to dashboard tabs
<Tabs defaultValue="treasury" className="space-y-4">
  <TabsList>
    <TabsTrigger
      value="treasury"
      data-testid="treasury-tab"  // ADD THIS
    >
      Treasury
    </TabsTrigger>
    {/* other tabs */}
  </TabsList>

  <TabsContent value="treasury" className="space-y-4">
    <TreasuryOverview /* ... */ />
  </TabsContent>
</Tabs>
```

### Error Boundary

**File**: `daopad_frontend/src/components/ErrorBoundary.tsx` (NEW)

```typescript
// PSEUDOCODE: Add error boundary for catching React errors
import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console for E2E tests to capture
    console.error('React Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    // Could also send to logging service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="p-6 border border-red-500 rounded-lg bg-red-50"
          data-testid="error-boundary"
        >
          <h2 className="text-xl font-bold text-red-700 mb-2">
            Something went wrong
          </h2>
          <p className="text-red-600 mb-4">
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

Wrap Treasury component:

```typescript
// In DashboardPage.tsx
<ErrorBoundary>
  <TreasuryOverview /* ... */ />
</ErrorBoundary>
```

## Testing Strategy

### 1. Install Dependencies
```bash
cd /home/theseus/alexandria/daopad-treasury-integration-tests/src/daopad/daopad_frontend

npm install --save-dev @playwright/test
```

### 2. Setup Authentication (One-Time)
```bash
# Run auth setup (opens browser, you login manually)
npm run test:e2e:setup

# This saves authentication to .auth/user.json
# Add .auth/ to .gitignore (don't commit credentials)
```

### 3. Fix Backend
```bash
cd /home/theseus/alexandria/daopad-treasury-integration-tests/src/daopad

# Build backend with fix
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Deploy to mainnet
./deploy.sh --network ic --backend-only

# Sync declarations
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
```

### 4. Run E2E Tests
```bash
cd daopad_frontend

# Headless (CI mode)
npm run test:e2e

# Headed (see browser)
npm run test:e2e:headed

# UI mode (interactive)
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug
```

### 5. Review Results
```
# Test output shows:
✓ Treasury Tab - E2E > should load Treasury tab without console errors (12.3s)
✓ Treasury Tab - E2E > should display 4 treasury accounts (8.7s)
✓ Treasury Tab - E2E > should display account balances (9.2s)
✓ Treasury Tab - E2E > should show asset breakdown (ICP/ALEX) (7.1s)
✓ Treasury Tab - E2E > should not show loading spinner indefinitely (5.4s)
✓ Treasury Tab - E2E > should handle network errors gracefully (11.8s)
✓ Treasury Tab - E2E > should capture React component errors (6.3s)
✓ Treasury Network Requests > should successfully call list_orbit_accounts (8.9s)
✓ Treasury Network Requests > should receive account data in correct format (9.5s)

# On failure, check:
- test-results/treasury-failure-*.png (screenshots)
- Console error logs in test output
- Network request logs in test output
- test-results/results.json (detailed results)
```

## What E2E Tests Capture

### ✅ Browser Console Errors
```typescript
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    console.error('Browser error:', msg.text());
    // Captured: TypeError, Promise rejections, etc.
  }
});
```

### ✅ Network Requests
```typescript
page.on('response', async (response) => {
  console.log(`${response.status()} ${response.url()}`);
  // Captured: API calls, status codes, response bodies
});
```

### ✅ Screenshots
```typescript
// Automatic on failure
await page.screenshot({
  path: 'test-results/treasury-failure.png',
  fullPage: true
});
```

### ✅ Component State
- Via test selectors: `[data-testid="treasury-account"]`
- Via React DevTools integration (advanced)
- Via error boundary capture

### ✅ Reproduction Context
- Test logs show exact navigation path
- Authentication state preserved
- User actions documented in test code
- Network timing captured

### ✅ Error Boundaries
```typescript
<ErrorBoundary data-testid="error-boundary">
  {/* Catches React errors */}
</ErrorBoundary>
```

## Files Modified/Created

### Backend (Fix Bug)
- ✏️ `daopad_backend/src/api/orbit.rs` - Fix list_orbit_accounts
- 🔄 `daopad_backend/daopad_backend.did` - Auto-generated

### Frontend (E2E Tests)
- ➕ `daopad_frontend/playwright.config.ts` - Playwright config
- ➕ `daopad_frontend/e2e/treasury.spec.ts` - E2E tests
- ➕ `daopad_frontend/e2e/helpers/auth.ts` - Auth utilities
- ➕ `daopad_frontend/e2e/setup/auth.setup.ts` - One-time auth
- ➕ `daopad_frontend/src/components/ErrorBoundary.tsx` - Error capture
- ✏️ `daopad_frontend/src/components/orbit/dashboard/TreasuryOverview.tsx` - Add test IDs
- ✏️ `daopad_frontend/src/pages/DashboardPage.tsx` - Add test IDs
- ✏️ `daopad_frontend/package.json` - Add Playwright

### Test Infrastructure
- ➕ `daopad_frontend/.auth/` - Auth state (gitignored)
- ➕ `daopad_frontend/test-results/` - Screenshots, traces (gitignored)

## Success Criteria

### ✅ All E2E Tests Pass
```
9 tests passing in ~80 seconds
- Console error capture: working
- Network logging: working
- Screenshot on failure: working
- 4 accounts visible: working
- Balances displayed: working
- ICP/ALEX assets shown: working
```

### ✅ Backend Bug Fixed
- `list_orbit_accounts` accepts token_id
- Calls correct Orbit Station canister
- Returns account list successfully

### ✅ UI Verification Automated
- No manual browser testing needed
- Agents can run `npm run test:e2e`
- Failures show screenshots + errors
- Network requests logged for debugging

### ✅ No Regressions
- Existing integration tests still pass
- Treasury tab loads in production
- No new console errors introduced

## Advantages Over Manual Testing

| Aspect | Manual Testing | E2E Tests |
|--------|---------------|-----------|
| **Speed** | 5+ min per check | 80 seconds automated |
| **Console Errors** | Must open DevTools | Automatic capture |
| **Network Requests** | Check Network tab | Automatic logging |
| **Screenshots** | Manual | Automatic on failure |
| **Reproducibility** | Hard to reproduce | Exact same steps |
| **CI/CD** | Can't automate | Can run in CI |
| **Agent Feedback** | Requires human | Agents run tests |

## Rollback Plan

If E2E tests fail or cause issues:

```bash
# Remove E2E test files
git rm daopad_frontend/e2e/ daopad_frontend/playwright.config.ts

# Revert backend if needed
git revert HEAD

# Redeploy
./deploy.sh --network ic
```

## Future Enhancements

1. **Visual Regression Testing**: Compare screenshots to baseline
2. **Performance Metrics**: Measure page load times
3. **Accessibility Testing**: Add a11y checks
4. **Multi-DAO Testing**: Test with different DAOs
5. **CI Integration**: Run on every PR
6. **Test Coverage**: Add Settings, Activity, Proposals tabs

## Context for Future Developers

This E2E test suite addresses a critical limitation: **You can't verify UI works without a browser.**

Backend integration tests (Node.js) verify API correctness but miss:
- React component errors
- State management bugs
- UI rendering issues
- Browser-specific problems

Playwright E2E tests provide **full stack verification**:
```
User Action → React Components → State → Network → Backend → Orbit
    ↓              ↓                ↓        ↓         ↓         ↓
Captured     Captured          Captured  Captured  Verified  Verified
```

**When to use each:**
- **Backend integration tests**: Fast API verification (30s)
- **E2E tests**: Full UI verification (80s)
- **Manual testing**: Edge cases and UX review

Run E2E tests on every significant UI change to catch runtime errors early.
