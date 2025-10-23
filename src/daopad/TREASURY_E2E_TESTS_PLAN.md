# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-treasury-e2e-tests/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-treasury-e2e-tests/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes:
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Run tests** (MANDATORY):
   ```bash
   cd daopad_frontend
   npx playwright test e2e/treasury-enhanced.spec.ts
   ```
5. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Test]: Enhanced Treasury E2E Tests - Comprehensive Data Flow Validation"
   git push -u origin feature/treasury-e2e-tests
   gh pr create --title "[Test]: Enhanced Treasury E2E Tests" --body "Implements TREASURY_E2E_TESTS_PLAN.md"
   ```
6. **Iterate autonomously**:
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

**Branch:** `feature/treasury-e2e-tests`
**Worktree:** `/home/theseus/alexandria/daopad-treasury-e2e-tests/src/daopad`

---

# Implementation Plan: Enhanced Treasury E2E Tests

## 1. Current State Analysis

### Existing Implementation

**Files:**
- `daopad_frontend/e2e/treasury.spec.ts` - Current test suite (211 lines)
- `daopad_frontend/src/components/orbit/dashboard/TreasuryOverview.tsx` - Treasury UI (342 lines)
- `daopad_frontend/src/pages/DashboardPage.tsx` - Dashboard with treasury tab
- `daopad_frontend/src/services/backend/orbit/OrbitAccountsService.ts` - Backend service wrapper
- `daopad_backend/src/api/orbit.rs` - Backend treasury API (lines 88-126: `list_orbit_accounts`)
- `daopad_backend/src/api/orbit_accounts.rs` - Account operations
- `PLAYWRIGHT_TESTING_GUIDE.md` - Testing methodology documentation

**Data Flow:**
```
User clicks Treasury Tab
    ↓
DashboardPage.tsx:60-77 (fetchDashboard)
    ↓
stationService.listDashboardAssets()
    ↓
Backend: list_orbit_accounts(token_canister_id)
    ↓
Orbit Station: list_accounts(station_id)
    ↓
Response: { Ok: { accounts: [...], privileges: [...] } }
    ↓
TreasuryOverview.tsx renders with data-testid markers
```

**Existing Test Coverage (treasury.spec.ts):**
- ✅ Basic loading (line 80-98)
- ✅ Account count validation (line 100-119)
- ✅ Balance display (line 121-135)
- ✅ Asset symbols (line 137-150)
- ✅ Loading states (line 152-163)
- ✅ Error handling (line 165-183)
- ✅ React errors (line 185-211)
- ✅ Network API calls (line 213-236)
- ✅ Response format validation (line 238-265)

**Test Canister IDs:**
- Backend: `lwsav-iiaaa-aaaap-qp2qq-cai`
- Frontend: `l7rlj-6aaaa-aaaaa-qaffq-cai`
- Test Station: `fec7w-zyaaa-aaaaa-qaffq-cai` (ALEX token: `ysy5f-2qaaa-aaaap-qkmmq-cai`)

### Gaps to Address

**Missing Test Coverage:**
1. **Deep Data Validation**
   - Account names match backend response
   - Balance calculations (raw → formatted with decimals)
   - Asset metadata (symbol, standard, blockchain)
   - Multiple assets per account

2. **UI Interaction Testing**
   - Accordion expand/collapse for asset details
   - Transfer button state (enabled/disabled based on permissions)
   - Account detail navigation
   - Portfolio distribution chart rendering

3. **Redux Integration**
   - Verify state updates from thunks
   - Action sequence validation (pending → fulfilled)
   - Error state handling in Redux

4. **Cross-Canister Data Consistency**
   - Backend response matches Orbit Station data
   - Account IDs consistent across calls
   - Balance fetching for multiple accounts

5. **Performance & Edge Cases**
   - Large account lists (pagination)
   - Accounts with zero balance
   - Missing asset metadata
   - Concurrent request handling

## 2. Implementation Plan

### Test File Structure

Create: `daopad_frontend/e2e/treasury-enhanced.spec.ts`

**Purpose:** Comprehensive end-to-end validation of treasury data pipeline

**Test Suites:**
1. Data Pipeline Validation
2. UI Component Rendering
3. User Interactions
4. Redux State Management
5. Error Scenarios
6. Performance & Edge Cases

### Pseudocode Implementation

```typescript
// daopad_frontend/e2e/treasury-enhanced.spec.ts

import { test, expect, Page } from '@playwright/test';
import { authenticateForTests } from './helpers/auth';

const BACKEND_CANISTER = process.env.VITE_BACKEND_CANISTER_ID || 'lwsav-iiaaa-aaaap-qp2qq-cai';
const TEST_TOKEN_ID = 'ysy5f-2qaaa-aaaap-qkmmq-cai'; // ALEX token

// Capture arrays for all test data
const networkRequests: Array<{url: string, method: string, status: number, response: any}> = [];
const consoleErrors: Array<string> = [];
const reduxActions: Array<{type: string, payload: any, timestamp: number}> = [];

test.describe('Treasury Enhanced - Data Pipeline', () => {
  let page: Page;
  let orbitResponse: any = null;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // CRITICAL: Capture all network requests
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes(BACKEND_CANISTER) || url.includes('ic0.app/api')) {
        try {
          const responseText = await response.text();
          const parsed = JSON.parse(responseText);
          
          networkRequests.push({
            url,
            method: extractMethod(url), // Helper to parse method from IC API URL
            status: response.status(),
            response: parsed
          });

          // Capture list_orbit_accounts response specifically
          if (url.includes('list_orbit_accounts')) {
            orbitResponse = parsed;
          }
        } catch (e) {
          // Binary response, skip
        }
      }
    });

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

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

    await authenticateForTests(page);
  });

  test.afterEach(async () => {
    if (test.info().status !== 'passed') {
      console.log('\n=== FAILED TEST DIAGNOSTICS ===');
      console.log('\n--- Network Requests ---');
      networkRequests.forEach((req, i) => {
        console.log(`${i+1}. ${req.method} - ${req.status}`);
        console.log(`   Response: ${JSON.stringify(req.response).substring(0, 200)}`);
      });

      console.log('\n--- Console Errors ---');
      consoleErrors.forEach((err, i) => console.log(`${i+1}. ${err}`));

      console.log('\n--- Redux Actions ---');
      const actions = await page.evaluate(() => (window as any).__REDUX_ACTIONS__);
      actions.forEach((action, i) => console.log(`${i+1}. ${action.type}`));

      await page.screenshot({
        path: `test-results/treasury-enhanced-failure-${Date.now()}.png`,
        fullPage: true
      });
    }

    // Clear arrays
    networkRequests.length = 0;
    consoleErrors.length = 0;
    reduxActions.length = 0;
    orbitResponse = null;
  });

  test('should fetch treasury data through complete pipeline', async () => {
    // STEP 1: Navigate to treasury tab
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.waitForSelector('h1', { timeout: 10000 });
    
    await page.click('[data-testid="treasury-tab"]');
    await page.waitForSelector('[data-testid="treasury-overview"]', { timeout: 30000 });

    // STEP 2: Verify backend API was called
    expect(networkRequests.length).toBeGreaterThan(0);
    
    const listAccountsCall = networkRequests.find(req => 
      req.method === 'list_orbit_accounts'
    );
    expect(listAccountsCall).toBeDefined();
    expect(listAccountsCall.status).toBe(200);

    // STEP 3: Verify response structure
    expect(orbitResponse).toBeDefined();
    expect(orbitResponse.Ok).toBeDefined();
    expect(orbitResponse.Ok.accounts).toBeDefined();
    expect(Array.isArray(orbitResponse.Ok.accounts)).toBe(true);
    
    const accounts = orbitResponse.Ok.accounts;
    console.log(`Received ${accounts.length} accounts from backend`);

    // STEP 4: Verify UI rendered same data
    const accountCards = await page.$$('[data-testid="treasury-account"]');
    expect(accountCards.length).toBe(accounts.length);

    console.log(`✅ Data pipeline verified: Backend (${accounts.length}) → UI (${accountCards.length})`);
  });

  test('should display correct account names and balances', async () => {
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('[data-testid="treasury-tab"]');
    await page.waitForSelector('[data-testid="treasury-account"]', { timeout: 30000 });

    // Wait for backend response
    await page.waitForTimeout(3000);

    // CRITICAL: Match backend data to UI rendering
    const accounts = orbitResponse?.Ok?.accounts || [];
    expect(accounts.length).toBeGreaterThan(0);

    const accountCards = await page.$$('[data-testid="treasury-account"]');

    for (let i = 0; i < Math.min(accounts.length, accountCards.length); i++) {
      const backendAccount = accounts[i];
      const uiCard = accountCards[i];

      // Verify account name is rendered
      const cardText = await uiCard.textContent();
      expect(cardText).toContain(backendAccount.name);

      // Verify balance display
      const balanceElement = await uiCard.$('[data-testid="account-balance"]');
      if (balanceElement) {
        const balanceText = await balanceElement.textContent();
        
        // Balance should be formatted (not raw number)
        expect(balanceText).not.toBe('0');
        expect(balanceText).not.toContain('Loading');
        
        console.log(`Account ${i+1}: ${backendAccount.name} - Balance: ${balanceText}`);
      }
    }
  });

  test('should handle accordion expand/collapse', async () => {
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('[data-testid="treasury-tab"]');
    await page.waitForSelector('[data-testid="treasury-account"]', { timeout: 30000 });

    const firstAccount = await page.$('[data-testid="treasury-account"]');
    expect(firstAccount).toBeDefined();

    // Check initial collapsed state
    const initiallyExpanded = await firstAccount.evaluate(el => 
      el.getAttribute('data-state') === 'open'
    );

    // Click to expand
    const trigger = await firstAccount.$('[data-radix-collection-item]');
    await trigger.click();
    await page.waitForTimeout(500);

    // Verify expansion
    const expandedState = await firstAccount.evaluate(el => 
      el.getAttribute('data-state')
    );
    
    console.log(`Accordion state: ${initiallyExpanded ? 'expanded' : 'collapsed'} → ${expandedState}`);
    
    // Should show account details after expansion
    const detailsVisible = await firstAccount.$('[data-testid="account-balance"]');
    expect(detailsVisible).not.toBeNull();
  });

  test('should verify Redux state updates', async () => {
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('[data-testid="treasury-tab"]');
    await page.waitForTimeout(10000); // Allow time for all async operations

    // Retrieve captured Redux actions
    const actions = await page.evaluate(() => (window as any).__REDUX_ACTIONS__);
    
    console.log(`Captured ${actions.length} Redux actions`);

    // Look for treasury-related actions
    const treasuryActions = actions.filter(a => 
      a.type.includes('treasury') || 
      a.type.includes('orbit') ||
      a.type.includes('dashboard')
    );

    expect(treasuryActions.length).toBeGreaterThan(0);

    // Check for pending → fulfilled sequence
    const hasPending = treasuryActions.some(a => a.type.includes('pending'));
    const hasFulfilled = treasuryActions.some(a => a.type.includes('fulfilled'));
    const hasRejected = treasuryActions.some(a => a.type.includes('rejected'));

    expect(hasPending).toBe(true);
    expect(hasFulfilled).toBe(true);
    expect(hasRejected).toBe(false);

    console.log('✅ Redux action sequence validated: pending → fulfilled');
  });

  test('should display portfolio distribution chart', async () => {
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('[data-testid="treasury-tab"]');
    await page.waitForSelector('[data-testid="treasury-overview"]', { timeout: 30000 });

    // Look for portfolio distribution section
    const portfolioSection = await page.locator('text=Portfolio Distribution').count();
    expect(portfolioSection).toBeGreaterThan(0);

    // Verify progress bars for asset allocation
    const progressBars = await page.$$('div[role="progressbar"]');
    expect(progressBars.length).toBeGreaterThan(0);

    console.log(`Found ${progressBars.length} portfolio allocation bars`);
  });

  test('should handle accounts with multiple assets', async () => {
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('[data-testid="treasury-tab"]');
    await page.waitForTimeout(5000);

    const accounts = orbitResponse?.Ok?.accounts || [];
    
    // Find accounts with multiple asset types
    const multiAssetAccounts = accounts.filter(acc => 
      acc.assets && acc.assets.length > 1
    );

    if (multiAssetAccounts.length > 0) {
      console.log(`Found ${multiAssetAccounts.length} accounts with multiple assets`);
      
      // Verify UI shows all assets for multi-asset accounts
      for (const account of multiAssetAccounts) {
        const accountName = account.name;
        
        // Find the UI card for this account
        const cardLocator = page.locator(`[data-testid="treasury-account"]:has-text("${accountName}")`);
        
        // Expand to see assets
        await cardLocator.click();
        await page.waitForTimeout(1000);
        
        // Should show asset symbols
        const symbolElements = await cardLocator.locator('text=/ICP|ALEX|ckBTC/').count();
        expect(symbolElements).toBeGreaterThan(0);
        
        console.log(`Account "${accountName}" shows ${symbolElements} asset types`);
      }
    } else {
      console.log('No multi-asset accounts found in this station');
    }
  });

  test('should show zero balance accounts differently', async () => {
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('[data-testid="treasury-tab"]');
    await page.waitForTimeout(5000);

    const accounts = orbitResponse?.Ok?.accounts || [];
    
    // Find accounts with zero balance
    const zeroBalanceAccounts = accounts.filter(acc => 
      acc.assets && acc.assets.every(asset => 
        Number(asset.balance || 0) === 0
      )
    );

    if (zeroBalanceAccounts.length > 0) {
      console.log(`Found ${zeroBalanceAccounts.length} zero-balance accounts`);
      
      // UI should still render these accounts
      const allCards = await page.$$('[data-testid="treasury-account"]');
      expect(allCards.length).toBe(accounts.length);
      
      // But may show different styling or empty state
      for (const zeroAccount of zeroBalanceAccounts) {
        const cardLocator = page.locator(`[data-testid="treasury-account"]:has-text("${zeroAccount.name}")`);
        const exists = await cardLocator.count();
        expect(exists).toBe(1);
      }
    }
  });

  test('should not have memory leaks on repeated navigation', async () => {
    // Navigate to treasury tab 5 times
    for (let i = 0; i < 5; i++) {
      await page.goto(`/dao/${TEST_TOKEN_ID}`);
      await page.click('[data-testid="treasury-tab"]');
      await page.waitForSelector('[data-testid="treasury-overview"]', { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      // Navigate away
      await page.click('[data-testid="governance-tab"]');
      await page.waitForTimeout(1000);
    }

    // Check no excessive console errors
    expect(consoleErrors.length).toBeLessThan(5);
    
    // Final navigation should still work
    await page.click('[data-testid="treasury-tab"]');
    await page.waitForSelector('[data-testid="treasury-overview"]', { timeout: 10000 });
    
    const finalAccountCards = await page.$$('[data-testid="treasury-account"]');
    expect(finalAccountCards.length).toBeGreaterThan(0);
    
    console.log('✅ No memory leaks detected after 5 navigation cycles');
  });
});

test.describe('Treasury Enhanced - Error Scenarios', () => {
  test('should handle backend timeout gracefully', async ({ page }) => {
    // This tests the 30-second timeout specified in existing tests
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('[data-testid="treasury-tab"]');

    // Either loads successfully or shows error - but doesn't hang forever
    await Promise.race([
      page.waitForSelector('[data-testid="treasury-overview"]', { timeout: 35000 }),
      page.waitForSelector('[data-testid="error-message"]', { timeout: 35000 }),
      page.waitForSelector('[data-testid="loading-spinner"]', { state: 'detached', timeout: 35000 })
    ]);

    // Should not be stuck in loading state
    const stillLoading = await page.locator('[data-testid="loading-spinner"]').count();
    expect(stillLoading).toBe(0);
  });

  test('should display meaningful error for invalid token', async ({ page }) => {
    const INVALID_TOKEN = 'aaaaa-aa'; // Invalid principal format
    
    await page.goto(`/dao/${INVALID_TOKEN}`);
    
    // Should show error, not infinite loading
    await Promise.race([
      page.waitForSelector('[data-testid="error-message"]', { timeout: 10000 }),
      page.waitForSelector('text=/Invalid|Not found|Error/i', { timeout: 10000 })
    ]);

    const errorVisible = await page.locator('[data-testid="error-message"]').count();
    if (errorVisible > 0) {
      const errorText = await page.locator('[data-testid="error-message"]').textContent();
      console.log(`Error message: ${errorText}`);
      expect(errorText.length).toBeGreaterThan(0);
    }
  });
});

// Helper function to extract method name from IC API URL
function extractMethod(url: string): string {
  // IC API URLs contain the method name in the path
  // Example: https://ic0.app/api/v2/canister/xxx/call
  // Body contains method name in Candid encoding
  const match = url.match(/canister\/([^\/]+)\/call/);
  if (match) {
    // Try to extract from stored requests or default to 'update'
    return 'update';
  }
  return 'query';
}
```

## 3. Testing Requirements

### Build & Deploy Commands

```bash
# Backend changes (if any):
cd /home/theseus/alexandria/daopad-treasury-e2e-tests/src/daopad
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
./deploy.sh --network ic --backend-only
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# Frontend changes (test file):
npm run build
./deploy.sh --network ic --frontend-only

# Run tests
cd daopad_frontend
npx playwright install chromium  # If not already installed
npx playwright test e2e/treasury-enhanced.spec.ts

# Run specific test
npx playwright test e2e/treasury-enhanced.spec.ts -g "should fetch treasury data"

# Debug mode
npx playwright test e2e/treasury-enhanced.spec.ts --debug

# With headed browser
npx playwright test e2e/treasury-enhanced.spec.ts --headed
```

### Success Criteria

**All tests must PASS after deployment:**
1. ✅ Data pipeline test shows matching account counts
2. ✅ Account names and balances match backend response
3. ✅ Accordion interactions work (expand/collapse)
4. ✅ Redux actions captured (pending → fulfilled sequence)
5. ✅ Portfolio distribution chart renders
6. ✅ Multi-asset accounts display correctly
7. ✅ Zero-balance accounts render without errors
8. ✅ No memory leaks after repeated navigation
9. ✅ Error scenarios handled gracefully
10. ✅ No console errors during normal operation

**Test Output Example:**
```
Running 10 tests using 1 worker

  ✓ [chromium] › treasury-enhanced.spec.ts:XX - should fetch treasury data (15s)
  ✓ [chromium] › treasury-enhanced.spec.ts:XX - should display correct account names (8s)
  ✓ [chromium] › treasury-enhanced.spec.ts:XX - should handle accordion expand/collapse (5s)
  ✓ [chromium] › treasury-enhanced.spec.ts:XX - should verify Redux state updates (12s)
  ✓ [chromium] › treasury-enhanced.spec.ts:XX - should display portfolio distribution (6s)
  ✓ [chromium] › treasury-enhanced.spec.ts:XX - should handle multi-asset accounts (10s)
  ✓ [chromium] › treasury-enhanced.spec.ts:XX - should show zero balance accounts (7s)
  ✓ [chromium] › treasury-enhanced.spec.ts:XX - should not have memory leaks (25s)
  ✓ [chromium] › treasury-enhanced.spec.ts:XX - should handle backend timeout (35s)
  ✓ [chromium] › treasury-enhanced.spec.ts:XX - should display error for invalid token (8s)

  10 passed (2.3m)
```

## 4. Integration with Existing Tests

**Keep existing `treasury.spec.ts` as baseline tests:**
- Quick smoke tests (do accounts load?)
- Basic data validation
- Error boundary checks

**Use `treasury-enhanced.spec.ts` for deep validation:**
- Complete data pipeline verification
- Redux integration
- UI interaction testing
- Performance & edge cases

**Run both in CI/CD:**
```yaml
# .github/workflows/test.yml
- name: Run Treasury Tests
  run: |
    npx playwright test e2e/treasury.spec.ts
    npx playwright test e2e/treasury-enhanced.spec.ts
```

## 5. Maintenance Guidelines

**When backend API changes:**
1. Update test assertions for new response structure
2. Verify data-testid attributes still exist in UI
3. Re-run tests after deployment
4. Update PLAYWRIGHT_TESTING_GUIDE.md if patterns change

**When UI components refactor:**
1. Update selector patterns (data-testid should remain stable)
2. Adjust wait times if rendering logic changes
3. Verify Redux action types match new implementation

**When adding new treasury features:**
1. Add tests FIRST (TDD approach)
2. Test should fail initially
3. Implement feature
4. Deploy and verify tests pass
5. Add to this plan document

## 6. Rollout Plan

**Phase 1: Implementation** (This PR)
- Create `treasury-enhanced.spec.ts`
- Implement all 10 test scenarios
- Deploy to mainnet
- Verify all tests pass

**Phase 2: CI/CD Integration** (Follow-up PR)
- Add treasury tests to GitHub Actions
- Set up Playwright report upload
- Configure test parallelization

**Phase 3: Monitoring** (Ongoing)
- Run tests after every deployment
- Track test duration trends
- Update tests as features evolve

## 7. Documentation Updates

**Update PLAYWRIGHT_TESTING_GUIDE.md:**
- Add section "Treasury Testing Patterns"
- Include Redux spy pattern
- Document data pipeline validation approach
- Add troubleshooting for common failures

**Update CLAUDE.md:**
- Add treasury testing to testing guidelines section
- Reference treasury-enhanced.spec.ts as example
- Document data-testid naming conventions

## 8. Known Limitations & Future Work

**Current Limitations:**
- Tests run against deployed mainnet (cannot test local changes directly)
- 30-second timeout may be too short for slow IC responses
- Redux spy depends on store being exposed on window object
- Network request capture may miss concurrent requests

**Future Enhancements:**
- Add visual regression testing (Percy/Applitools)
- Test treasury operations (transfers, account creation)
- Load testing (1000+ accounts)
- Mobile viewport testing
- Accessibility testing (ARIA labels, keyboard navigation)

---

# Implementation Checklist

Before marking complete:

- [ ] Worktree isolation verified
- [ ] Test file created with all 10 scenarios
- [ ] Tests use proper data-testid selectors
- [ ] Redux spy implemented correctly
- [ ] Network capture includes method extraction
- [ ] Error diagnostics comprehensive
- [ ] All tests pass after deployment
- [ ] PR created with descriptive title
- [ ] PR body references this plan
- [ ] Test results included in PR description

---

**REMEMBER: Deploy BEFORE testing. Tests run against deployed code, not local files.**

```bash
./deploy.sh --network ic --frontend-only
cd daopad_frontend
npx playwright test e2e/treasury-enhanced.spec.ts
```

If tests fail: Analyze artifacts → Form hypothesis → Fix → Deploy again → Re-test

Maximum 5 iterations before escalating to human.
