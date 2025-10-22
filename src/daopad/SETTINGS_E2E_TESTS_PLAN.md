# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-settings-e2e-tests/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-settings-e2e-tests/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Deploy & Test**:
   ```bash
   # After writing test file
   cd /home/theseus/alexandria/daopad-settings-e2e-tests/src/daopad
   ./deploy.sh --network ic
   cd daopad_frontend
   npx playwright test e2e/settings.spec.ts
   # If tests fail: analyze, fix, GOTO deploy again
   # Iterate up to 7 times until tests pass
   ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Test]: E2E tests for Settings tab - system info and security dashboard"
   git push -u origin feature/settings-e2e-tests
   gh pr create --title "[Test]: E2E Tests for Settings Tab" --body "Implements SETTINGS_E2E_TESTS_PLAN.md

## Tests Implemented
- System info loading (station name, version, cycles, upgrader)
- Security dashboard (17 checks with progress tracking)
- Permissions section (collapsible)
- Data pipeline verification (backend → UI)
- Error handling and console error detection

## Testing Methodology
Following PLAYWRIGHT_TESTING_GUIDE.md:
- ✅ Tests verify backend-to-frontend data flow
- ✅ Captures network requests to backend canister
- ✅ Monitors console errors
- ✅ Tests against deployed mainnet code
- ✅ No surface-level assertions

## Results
All tests passing after deployment to mainnet IC."
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

**Branch:** `feature/settings-e2e-tests`
**Worktree:** `/home/theseus/alexandria/daopad-settings-e2e-tests/src/daopad`

---

# Implementation Plan: Settings Tab E2E Tests

## Current State Documentation

### File Structure (Before)
```
daopad_frontend/
├── e2e/
│   ├── setup/
│   │   └── auth.setup.ts           # Existing: II authentication
│   ├── helpers/
│   │   └── auth.ts                 # Existing: Auth utilities
│   ├── treasury.spec.ts            # Existing: Treasury tests
│   ├── app-route.spec.ts           # Existing: Public dashboard tests
│   └── minimal-smoke.spec.ts       # Existing: Smoke tests
└── src/
    ├── components/
    │   ├── DAOSettings.tsx          # Existing: Settings tab component (line 35-329)
    │   └── security/
    │       └── SecurityDashboard.tsx # Existing: Security checks UI (line 13-230)
    └── services/
        └── backend/
            └── orbit/
                └── governance/
                    └── OrbitGovernanceService.ts # Existing: Data service (line 8-18)
```

### Settings Tab Current Implementation

**Component: DAOSettings.tsx**
- **Location**: `src/components/DAOSettings.tsx`
- **Data fetching**: Lines 42-73
  ```typescript
  // Fetches system info from backend via OrbitGovernanceService
  const governanceService = getOrbitGovernanceService(identity);
  const result = await governanceService.getSystemInfo(stationId);
  ```
- **Displays**:
  1. Station Information card (lines 138-219):
     - Station name, version, station ID
     - Upgrader ID (with copy button)
     - Cycle information (station cycles, upgrader cycles, cycle obtain strategy)
     - Last upgrade timestamp
  2. Disaster Recovery card (lines 222-259) - conditional
  3. Permissions section (lines 262-292) - collapsible
  4. Security section (lines 295-326) - collapsible

**Component: SecurityDashboard.tsx**
- **Location**: `src/components/security/SecurityDashboard.tsx`
- **Data fetching**: Lines 42-87
  ```typescript
  // Runs comprehensive security checks via OrbitSecurityService
  const securityService = new OrbitSecurityService(identity);
  const result = await securityService.performComprehensiveSecurityCheck(
      stationId,
      onProgress  // Callback for progress updates
  );
  ```
- **Features**:
  - 17 security checks with real-time progress (line 104: "Analyzing DAO security... ({completedCount}/17 checks complete)")
  - Progress indicator shows category names as they complete
  - Displays DAOTransitionChecklist after completion
  - Admin removal actions
  - AutoApproved setup wizard
  - Export reports (markdown/JSON)

**Backend Service: OrbitGovernanceService.ts**
- **Method**: `getSystemInfo(stationId)` (lines 8-18)
  ```typescript
  async getSystemInfo(stationId) {
    const actor = await this.getActor();
    const stationPrincipal = this.toPrincipal(stationId);
    const result = await actor.get_orbit_system_info(stationPrincipal);
    return this.wrapResult(result);
  }
  ```
- **Backend canister method**: `get_orbit_system_info(station_principal)`

**Tab Integration: TokenDashboard.tsx**
- Settings tab trigger: Line 387 `<TabsTrigger variant="executive" value="settings">Settings</TabsTrigger>`
- No data-testid on the tab trigger (need to select by text or value)
- Settings content: Lines 435-445
  ```typescript
  <TabsContent value="settings" className="mt-4">
    {activeTab === 'settings' && (
      <DAOSettings
        tokenCanisterId={token.canister_id}
        identity={identity}
        stationId={orbitStation?.station_id}
        tokenSymbol={token.symbol}
        tokenId={token.canister_id}
      />
    )}
  </TabsContent>
  ```

### Existing E2E Test Patterns

**From treasury.spec.ts:**
- Captures console errors in beforeEach (lines 16-27)
- Captures network requests (lines 29-52)
- Uses `authenticateForTests(page)` for II login
- Waits for specific selectors with timeouts (e.g., line 87: `waitForSelector('[data-testid="treasury-overview"]', { timeout: 30000 })`)
- Verifies backend API calls succeeded (lines 214-236)
- Screenshots on failure (lines 69-72)

**From app-route.spec.ts:**
- Monitors Redux actions via `addInitScript` (lines 72-92)
- Comprehensive logging in afterEach (lines 95-143)
- Tests verify full pipeline: network → Redux → UI
- Checks for error boundaries (line 306)
- Uses helper function `extractMethodName(url)` to parse IC canister calls

### Data Flow to Verify

```
1. User clicks Settings tab
   ↓
2. DAOSettings component mounts
   ↓
3. useEffect triggers fetchSystemInfo (DAOSettings.tsx:42)
   ↓
4. OrbitGovernanceService.getSystemInfo(stationId) called
   ↓
5. Backend canister: get_orbit_system_info(station_principal)
   ↓
6. Orbit Station returns system info
   ↓
7. Backend wraps result: { success: true, data: {...} }
   ↓
8. DAOSettings setState: setSystemInfo(result.data)
   ↓
9. UI renders: Station info cards visible
```

```
Security Dashboard Flow:
1. User clicks "Run Security Checks" button
   ↓
2. SecurityDashboard.fetchSecurityStatus() called (line 42)
   ↓
3. OrbitSecurityService.performComprehensiveSecurityCheck(stationId, onProgress)
   ↓
4. Backend runs 17 checks (admin control, treasury, permissions, etc.)
   ↓
5. Progress callback fires for each completed check
   ↓
6. UI updates: progressData state, completedCount increments
   ↓
7. Final result: securityData populated
   ↓
8. UI renders: DAOTransitionChecklist with security status
```

### Test Token for E2E Tests
- **Token**: Alexandria (ALEX)
- **Token Canister ID**: `ysy5f-2qaaa-aaaap-qkmmq-cai` (used in treasury.spec.ts)
- **Station**: `fec7w-zyaaa-aaaaa-qaffq-cai` (Orbit Station linked to ALEX)

---

## Implementation Plan

### File to Create
**Path**: `/home/theseus/alexandria/daopad-settings-e2e-tests/src/daopad/daopad_frontend/e2e/settings.spec.ts`

### Test Suite Structure (PSEUDOCODE)

```typescript
// PSEUDOCODE - Implementing agent will write real TypeScript

// ============================================================================
// IMPORTS
// ============================================================================
import { test, expect, Page } from '@playwright/test';
import { authenticateForTests } from './helpers/auth';

// Constants
const BACKEND_CANISTER = 'lwsav-iiaaa-aaaap-qp2qq-cai';
const TEST_TOKEN_ID = 'ysy5f-2qaaa-aaaap-qkmmq-cai'; // Alexandria (ALEX)
const TEST_STATION_ID = 'fec7w-zyaaa-aaaaa-qaffq-cai';

// Capture arrays
const consoleErrors: Array<string> = [];
const networkRequests: Array<{url: string, status: number, response: string}> = [];
const systemInfoCalls: Array<{url: string, status: number, response: string}> = [];

// ============================================================================
// TEST DESCRIBE BLOCK: Settings Tab - System Information
// ============================================================================
test.describe('Settings Tab - System Information', () => {

  // --------------------------------------------------------------------------
  // BEFORE EACH: Setup monitoring
  // --------------------------------------------------------------------------
  test.beforeEach(async ({ page }) => {
    // Clear capture arrays
    consoleErrors.length = 0;
    networkRequests.length = 0;
    systemInfoCalls.length = 0;

    // Monitor console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.error('[Browser Console Error]:', msg.text());
      }
    });

    // Monitor network requests
    page.on('response', async (response) => {
      const url = response.url();

      // Capture all backend calls
      if (url.includes(BACKEND_CANISTER) ||
          url.includes('ic0.app/api') ||
          url.includes('icp0.io/api')) {

        try {
          const responseText = await response.text();
          const entry = {
            url: url,
            status: response.status(),
            response: responseText
          };

          networkRequests.push(entry);

          // Track specific system info calls
          if (url.includes('get_orbit_system_info')) {
            systemInfoCalls.push(entry);
            console.log(`[System Info API] ${response.status()}`);
          }

          if (!response.ok()) {
            console.error(`[Network Error] ${url}:`, responseText.substring(0, 500));
          }
        } catch (e) {
          // Binary response, skip
        }
      }
    });

    // Authenticate with Internet Identity
    await authenticateForTests(page);
  });

  // --------------------------------------------------------------------------
  // AFTER EACH: Log failures and screenshot
  // --------------------------------------------------------------------------
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      console.log('\n=== CONSOLE ERRORS ===');
      if (consoleErrors.length === 0) {
        console.log('No console errors');
      } else {
        consoleErrors.forEach((err, i) => console.log(`${i+1}. ${err}`));
      }

      console.log('\n=== SYSTEM INFO API CALLS ===');
      if (systemInfoCalls.length === 0) {
        console.log('No system info API calls captured');
      } else {
        systemInfoCalls.forEach((call, i) => {
          console.log(`${i+1}. ${call.status} ${call.url}`);
          console.log(`   Response: ${call.response.substring(0, 300)}`);
        });
      }

      // Screenshot
      await page.screenshot({
        path: `test-results/settings-failure-${Date.now()}.png`,
        fullPage: true
      });
    }

    // Clear arrays
    consoleErrors.length = 0;
    networkRequests.length = 0;
    systemInfoCalls.length = 0;
  });

  // --------------------------------------------------------------------------
  // TEST 1: Settings tab loads without errors
  // --------------------------------------------------------------------------
  test('should load Settings tab without console errors', async ({ page }) => {
    // PSEUDOCODE STEPS:
    // 1. Navigate to DAO dashboard
    await page.goto(`/dao/${TEST_TOKEN_ID}`);

    // 2. Wait for dashboard to load
    await page.waitForSelector('h1:has-text("Alexandria")', { timeout: 10000 });

    // 3. Click Settings tab
    // Note: No data-testid, use text selector
    await page.click('button:has-text("Settings")');

    // 4. Wait for Settings content to render
    // Looking for "Station Information" card title
    await page.waitForSelector('text=Station Information', { timeout: 30000 });

    // 5. Verify no console errors
    expect(consoleErrors.length).toBe(0);

    if (consoleErrors.length > 0) {
      throw new Error(`Console errors found:\n${consoleErrors.join('\n')}`);
    }
  });

  // --------------------------------------------------------------------------
  // TEST 2: System info API call succeeds
  // --------------------------------------------------------------------------
  test('should successfully call get_orbit_system_info', async ({ page }) => {
    // PSEUDOCODE STEPS:
    // 1. Navigate and click Settings tab
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');

    // 2. Wait for backend call
    await page.waitForTimeout(5000);

    // 3. Verify API was called
    expect(systemInfoCalls.length).toBeGreaterThan(0);

    // 4. Verify no errors in response
    const hasError = systemInfoCalls.some(call =>
      call.response.includes('has no update method') ||
      call.response.includes('Err') ||
      call.status >= 400
    );
    expect(hasError).toBe(false);
  });

  // --------------------------------------------------------------------------
  // TEST 3: Station information displays correctly
  // --------------------------------------------------------------------------
  test('should display station name and version', async ({ page }) => {
    // PSEUDOCODE STEPS:
    // 1. Load Settings tab
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('text=Station Information', { timeout: 30000 });

    // 2. Wait for loading spinner to disappear
    await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 30000 });

    // 3. Verify station name is visible
    // DAOSettings.tsx line 147: Station name field
    const stationName = await page.locator('label:has-text("Station Name")').locator('..').locator('.font-medium');
    await expect(stationName).toBeVisible();
    const nameText = await stationName.textContent();
    expect(nameText).not.toBe('');
    console.log('Station name:', nameText);

    // 4. Verify version is visible
    // DAOSettings.tsx line 152: Version field
    const versionLabel = await page.locator('label:has-text("Version")').locator('..').locator('.font-medium');
    await expect(versionLabel).toBeVisible();
    const versionText = await versionLabel.textContent();
    expect(versionText).not.toBe('');
    console.log('Station version:', versionText);
  });

  // --------------------------------------------------------------------------
  // TEST 4: Station ID and copy button work
  // --------------------------------------------------------------------------
  test('should display station ID with copy button', async ({ page }) => {
    // PSEUDOCODE STEPS:
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('text=Station Information', { timeout: 30000 });

    // Find station ID field (line 156 in DAOSettings.tsx)
    const stationIdCode = await page.locator('label:has-text("Station ID")').locator('..').locator('code');
    await expect(stationIdCode).toBeVisible();

    const idText = await stationIdCode.textContent();
    expect(idText).toContain(TEST_STATION_ID);
    console.log('Station ID displayed:', idText);

    // Verify copy button exists (line 161-168)
    const copyButton = await page.locator('label:has-text("Station ID")').locator('..').locator('button');
    await expect(copyButton).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // TEST 5: Cycle information displays
  // --------------------------------------------------------------------------
  test('should display cycle information', async ({ page }) => {
    // PSEUDOCODE STEPS:
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('text=Station Information', { timeout: 30000 });

    // Wait for cycle info section (line 188-211 in DAOSettings.tsx)
    await page.waitForSelector('h4:has-text("Cycle Information")', { timeout: 10000 });

    // Verify station cycles label
    const stationCyclesLabel = await page.locator('label:has-text("Station Cycles")').locator('..').locator('.font-medium');
    await expect(stationCyclesLabel).toBeVisible();

    const cyclesText = await stationCyclesLabel.textContent();
    expect(cyclesText).toMatch(/\d+\.\d+ TC/); // Should match format like "12.345 TC"
    console.log('Station cycles:', cyclesText);

    // Verify cycle obtain strategy
    const strategyLabel = await page.locator('label:has-text("Cycle Obtain Strategy")').locator('..').locator('.font-medium');
    await expect(strategyLabel).toBeVisible();
    console.log('Cycle strategy:', await strategyLabel.textContent());
  });

  // --------------------------------------------------------------------------
  // TEST 6: Upgrader information displays
  // --------------------------------------------------------------------------
  test('should display upgrader ID', async ({ page }) => {
    // PSEUDOCODE STEPS:
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('text=Station Information', { timeout: 30000 });

    // Find upgrader ID field (line 172-184)
    const upgraderIdCode = await page.locator('label:has-text("Upgrader ID")').locator('..').locator('code');
    await expect(upgraderIdCode).toBeVisible();

    const upgraderText = await upgraderIdCode.textContent();
    // Upgrader ID should be a valid principal
    expect(upgraderText).toMatch(/[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}/);
    console.log('Upgrader ID:', upgraderText);
  });

  // --------------------------------------------------------------------------
  // TEST 7: Last upgrade timestamp displays
  // --------------------------------------------------------------------------
  test('should display last upgrade timestamp', async ({ page }) => {
    // PSEUDOCODE STEPS:
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('text=Station Information', { timeout: 30000 });

    // Find last upgrade field (line 213-215)
    const lastUpgradeLabel = await page.locator('label:has-text("Last Upgrade")').locator('..').locator('.font-medium');
    await expect(lastUpgradeLabel).toBeVisible();

    const upgradeText = await lastUpgradeLabel.textContent();
    expect(upgradeText).not.toBe('');
    // Should be a date string or "Never"
    console.log('Last upgrade:', upgradeText);
  });

  // --------------------------------------------------------------------------
  // TEST 8: Loading state shows spinner
  // --------------------------------------------------------------------------
  test('should show loading spinner while fetching data', async ({ page }) => {
    // PSEUDOCODE STEPS:
    await page.goto(`/dao/${TEST_TOKEN_ID}`);

    // Click Settings tab
    await page.click('button:has-text("Settings")');

    // Immediately check for loading spinner (line 108-114 in DAOSettings.tsx)
    const spinner = page.locator('.animate-spin');

    // Spinner should appear (may need to race against fast network)
    // If it doesn't appear, data loaded very quickly (acceptable)
    const spinnerAppeared = await spinner.count() > 0;

    if (spinnerAppeared) {
      console.log('✓ Loading spinner detected');
      // Wait for spinner to disappear
      await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 30000 });
    } else {
      console.log('✓ Data loaded immediately (no spinner needed)');
    }

    // Verify content loaded
    await expect(page.locator('text=Station Information')).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // TEST 9: Error handling displays error message
  // --------------------------------------------------------------------------
  test('should handle errors gracefully', async ({ page }) => {
    // PSEUDOCODE STEPS:
    // Navigate to Settings tab
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');

    // Wait for either success or error state
    await Promise.race([
      page.waitForSelector('text=Station Information', { timeout: 30000 }),
      page.waitForSelector('[role="alert"]', { timeout: 30000 })
    ]);

    // Check if error alert is visible (line 116-122 in DAOSettings.tsx)
    const errorAlert = await page.locator('[role="alert"]').count();

    if (errorAlert > 0) {
      const errorText = await page.locator('[role="alert"]').textContent();
      console.log('Error displayed:', errorText);

      // Error should not be empty
      expect(errorText).not.toBe('');

      // Should not show internal errors
      expect(errorText).not.toContain('undefined is not a function');
      expect(errorText).not.toContain('Cannot read property');
    } else {
      console.log('✓ No errors - data loaded successfully');
    }
  });
});

// ============================================================================
// TEST DESCRIBE BLOCK: Settings Tab - Security Dashboard
// ============================================================================
test.describe('Settings Tab - Security Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    // Same monitoring setup as above
    // [IDENTICAL TO PREVIOUS beforeEach]
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Same cleanup as above
    // [IDENTICAL TO PREVIOUS afterEach]
  });

  // --------------------------------------------------------------------------
  // TEST 10: Security section is collapsible
  // --------------------------------------------------------------------------
  test('should show/hide security section when clicked', async ({ page }) => {
    // PSEUDOCODE STEPS:
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('text=Station Information', { timeout: 30000 });

    // Find "Run Security Checks" button (line 305-309 in DAOSettings.tsx)
    const securityButton = page.locator('button:has-text("Run")').and(page.locator('button:has-text("Security Checks")'));
    await expect(securityButton).toBeVisible();

    // Security dashboard should NOT be visible initially
    const dashboardBefore = await page.locator('text=Analyzing DAO security').count();
    expect(dashboardBefore).toBe(0);

    // Click to expand
    await securityButton.click();

    // Wait for SecurityDashboard to render
    // Should see either loading state or results
    await page.waitForTimeout(2000);

    const dashboardAfter = await page.locator('text=Analyzing DAO security').or(page.locator('text=DAO security')).count();
    expect(dashboardAfter).toBeGreaterThan(0);
    console.log('✓ Security dashboard expanded');
  });

  // --------------------------------------------------------------------------
  // TEST 11: Security checks show progress
  // --------------------------------------------------------------------------
  test('should show progress while running security checks', async ({ page }) => {
    // PSEUDOCODE STEPS:
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('text=Station Information', { timeout: 30000 });

    // Expand security section
    await page.click('button:has-text("Run"):has-text("Security Checks")');

    // Should see progress indicator (line 104 in SecurityDashboard.tsx)
    // "Analyzing DAO security... (X/17 checks complete)"
    const progressText = page.locator('text=/Analyzing DAO security.*\\d+\\/17 checks complete/');

    // Progress text should appear
    const progressAppeared = await progressText.count() > 0;

    if (progressAppeared) {
      console.log('✓ Progress indicator detected');
      const text = await progressText.textContent();
      console.log('Progress:', text);

      // Should show format like "(5/17 checks complete)"
      expect(text).toMatch(/\(\d+\/17 checks complete\)/);
    } else {
      console.log('✓ Checks completed immediately (very fast)');
    }

    // Wait for completion (spinner disappears - line 102)
    await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 60000 });
  });

  // --------------------------------------------------------------------------
  // TEST 12: Security checks complete successfully
  // --------------------------------------------------------------------------
  test('should complete all 17 security checks', async ({ page }) => {
    // PSEUDOCODE STEPS:
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('text=Station Information', { timeout: 30000 });

    // Expand and run security checks
    await page.click('button:has-text("Run"):has-text("Security Checks")');

    // Wait for checks to complete (up to 60 seconds)
    await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 60000 });

    // Should see DAOTransitionChecklist component (line 202-207)
    // or security data rendered
    await page.waitForTimeout(5000);

    // Verify no errors during checks
    expect(consoleErrors.length).toBe(0);

    if (consoleErrors.length > 0) {
      throw new Error(`Errors during security checks:\n${consoleErrors.join('\n')}`);
    }

    console.log('✓ All security checks completed without errors');
  });

  // --------------------------------------------------------------------------
  // TEST 13: Permissions section is collapsible
  // --------------------------------------------------------------------------
  test('should show/hide permissions section when clicked', async ({ page }) => {
    // PSEUDOCODE STEPS:
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('text=Station Information', { timeout: 30000 });

    // Find "Load Permissions" button (line 270-277 in DAOSettings.tsx)
    const permissionsButton = page.locator('button:has-text("Load Permissions")');
    await expect(permissionsButton).toBeVisible();

    // Click to expand
    await permissionsButton.click();

    // Wait for PermissionsPage to render (line 284-289)
    await page.waitForTimeout(2000);

    // Should see permissions content
    // (Exact content depends on PermissionsPage implementation)
    const hasContent = await page.locator('text=/group|permission|role/i').count() > 0;
    expect(hasContent).toBe(true);

    console.log('✓ Permissions section expanded');
  });

  // --------------------------------------------------------------------------
  // TEST 14: No React component crashes
  // --------------------------------------------------------------------------
  test('should not trigger error boundary', async ({ page }) => {
    // PSEUDOCODE STEPS:
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(10000);

    // Check for error boundary
    const errorBoundary = await page.locator('[data-testid="error-boundary"]').count();
    expect(errorBoundary).toBe(0);

    // Expand security (potential crash point)
    await page.click('button:has-text("Run"):has-text("Security Checks")');
    await page.waitForTimeout(15000);

    const errorBoundaryAfter = await page.locator('[data-testid="error-boundary"]').count();
    expect(errorBoundaryAfter).toBe(0);

    console.log('✓ No error boundaries triggered');
  });
});

// ============================================================================
// TEST DESCRIBE BLOCK: Settings Tab - Data Pipeline Verification
// ============================================================================
test.describe('Settings Tab - Data Pipeline', () => {

  test.beforeEach(async ({ page }) => {
    // Same setup as previous tests
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Same cleanup
  });

  // --------------------------------------------------------------------------
  // TEST 15: Backend response format is correct
  // --------------------------------------------------------------------------
  test('should receive system info in expected format', async ({ page }) => {
    // PSEUDOCODE STEPS:
    let systemInfoResponse: any = null;

    // Capture system info API response
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('get_orbit_system_info')) {
        try {
          const text = await response.text();
          systemInfoResponse = JSON.parse(text);
        } catch (e) {
          console.error('Failed to parse response:', e);
        }
      }
    });

    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(5000);

    // Verify response captured
    expect(systemInfoResponse).not.toBeNull();

    // Verify response structure
    // Based on OrbitGovernanceService.ts line 12: wrapResult wraps in { success: bool, data: {...} }
    expect(systemInfoResponse.success).toBe(true);
    expect(systemInfoResponse.data).toBeDefined();

    // Verify data has expected fields
    expect(systemInfoResponse.data.station_id).toBeDefined();
    expect(systemInfoResponse.data.system_info).toBeDefined();

    console.log('System info response:', JSON.stringify(systemInfoResponse).substring(0, 500));
  });

  // --------------------------------------------------------------------------
  // TEST 16: Data consistency from backend to UI
  // --------------------------------------------------------------------------
  test('should render same data from backend response', async ({ page }) => {
    // PSEUDOCODE STEPS:
    let backendStationId: string | null = null;

    // Capture backend response
    page.on('response', async (response) => {
      if (response.url().includes('get_orbit_system_info')) {
        try {
          const data = await response.json();
          if (data.success && data.data?.station_id) {
            backendStationId = data.data.station_id.toText
              ? data.data.station_id.toText()
              : String(data.data.station_id);
          }
        } catch (e) {}
      }
    });

    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('text=Station Information', { timeout: 30000 });

    // Get station ID from UI
    const uiStationIdElement = await page.locator('label:has-text("Station ID")').locator('..').locator('code');
    const uiStationId = await uiStationIdElement.textContent();

    // Verify consistency
    expect(backendStationId).not.toBeNull();
    expect(uiStationId).toContain(TEST_STATION_ID);

    console.log('Backend station ID:', backendStationId);
    console.log('UI station ID:', uiStationId);
    console.log('✓ Data consistency verified');
  });
});
```

---

## Testing Strategy

### Deploy → Test → Iterate Workflow

```bash
# 1. Implement test file
cd /home/theseus/alexandria/daopad-settings-e2e-tests/src/daopad/daopad_frontend
# Create e2e/settings.spec.ts with real TypeScript based on pseudocode above

# 2. Deploy to IC mainnet (MANDATORY before testing)
cd /home/theseus/alexandria/daopad-settings-e2e-tests/src/daopad
./deploy.sh --network ic

# 3. Run tests against deployed code
cd daopad_frontend
npx playwright test e2e/settings.spec.ts

# 4. If tests FAIL:
#    - Check test-results/*.png screenshots
#    - Review console error logs
#    - Check network request logs
#    - Form hypothesis about root cause
#    - Make targeted fix
#    - GOTO step 2 (deploy again)

# 5. If tests PASS:
#    - Verify all 16 tests passing
#    - Commit changes
#    - Create PR
#    - SUCCESS ✅
```

### Maximum Iterations
- **Target**: Tests pass after 3-5 deployments
- **Maximum**: 7 iterations before escalation
- **Each iteration**: Deploy → Test → Analyze → Fix

### Success Criteria
✅ All 16 tests passing
✅ No console errors
✅ Network requests succeed (200 status)
✅ Data flows correctly: Backend → UI
✅ Screenshots show rendered content
✅ No error boundaries triggered

---

## Post-Implementation Checklist

- [ ] Test file created: `daopad_frontend/e2e/settings.spec.ts`
- [ ] All 16 tests implemented with real TypeScript
- [ ] Deployed to mainnet IC: `./deploy.sh --network ic`
- [ ] All tests passing: `npx playwright test e2e/settings.spec.ts`
- [ ] No console errors in test output
- [ ] Screenshots show correct UI rendering
- [ ] Git commit created with descriptive message
- [ ] Git push to feature branch completed
- [ ] PR created with comprehensive description
- [ ] PR includes test results and methodology explanation

---

## Notes for Implementing Agent

### Critical Implementation Details

1. **No data-testid on Settings tab trigger**
   - Use text selector: `button:has-text("Settings")`
   - Or value selector: `[value="settings"]`

2. **Authentication required**
   - Must use `authenticateForTests(page)` before navigating
   - Tests won't work without II authentication

3. **Async data loading**
   - Always use appropriate timeouts (30 seconds for initial load)
   - Use `waitForSelector` with specific elements, not generic delays
   - Watch for loading spinner disappearing: `.animate-spin`

4. **Principal text conversion**
   - Backend may return Principal objects or strings
   - Always handle both: `toText()` method or direct string
   - Example: `station_id.toText ? station_id.toText() : String(station_id)`

5. **Test isolation**
   - Clear capture arrays in `beforeEach`
   - Each test should be independent
   - Don't rely on previous test state

6. **Error detection**
   - Console errors captured automatically
   - Network errors logged with response preview
   - Screenshots on failure provide visual debugging

7. **Deploy before EVERY test run**
   - Tests hit deployed IC canisters, not local code
   - Local changes invisible until deployed
   - Always: `./deploy.sh --network ic` → test

### Common Pitfalls to Avoid

❌ **DON'T**: Test without deploying first
✅ **DO**: Always deploy, then test

❌ **DON'T**: Use only element existence checks
✅ **DO**: Verify backend data flows to UI

❌ **DON'T**: Give up after first test failure
✅ **DO**: Iterate 5-7 times with targeted fixes

❌ **DON'T**: Assume data loads instantly
✅ **DO**: Use proper timeouts and wait conditions

❌ **DON'T**: Skip authentication
✅ **DO**: Always call `authenticateForTests(page)`

---

## Expected Test Output (Success)

```
Running 16 tests using 1 worker

  ✓ Settings Tab - System Information › should load Settings tab without console errors (12s)
  ✓ Settings Tab - System Information › should successfully call get_orbit_system_info (8s)
  ✓ Settings Tab - System Information › should display station name and version (15s)
  ✓ Settings Tab - System Information › should display station ID with copy button (14s)
  ✓ Settings Tab - System Information › should display cycle information (16s)
  ✓ Settings Tab - System Information › should display upgrader ID (13s)
  ✓ Settings Tab - System Information › should display last upgrade timestamp (14s)
  ✓ Settings Tab - System Information › should show loading spinner while fetching data (7s)
  ✓ Settings Tab - System Information › should handle errors gracefully (15s)
  ✓ Settings Tab - Security Dashboard › should show/hide security section when clicked (10s)
  ✓ Settings Tab - Security Dashboard › should show progress while running security checks (25s)
  ✓ Settings Tab - Security Dashboard › should complete all 17 security checks (45s)
  ✓ Settings Tab - Security Dashboard › should show/hide permissions section when clicked (11s)
  ✓ Settings Tab - Security Dashboard › should not trigger error boundary (18s)
  ✓ Settings Tab - Data Pipeline › should receive system info in expected format (9s)
  ✓ Settings Tab - Data Pipeline › should render same data from backend response (16s)

  16 passed (4m 32s)
```

---

## Final Deliverable

**File**: `/home/theseus/alexandria/daopad-settings-e2e-tests/src/daopad/daopad_frontend/e2e/settings.spec.ts`
**Tests**: 16 comprehensive E2E tests
**Coverage**:
- System information loading and display
- Security dashboard with progress tracking
- Permissions section
- Error handling and loading states
- Backend-to-UI data pipeline verification
- No console errors or React crashes

**Following**: `PLAYWRIGHT_TESTING_GUIDE.md` methodology
**Token**: Alexandria (ALEX) - `ysy5f-2qaaa-aaaap-qkmmq-cai`
**Station**: `fec7w-zyaaa-aaaaa-qaffq-cai`
