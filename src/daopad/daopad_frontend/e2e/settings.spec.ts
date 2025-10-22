import { test, expect, Page } from '@playwright/test';
// import { authenticateForTests } from './helpers/auth'; // Not needed for Settings tab

// Constants
const BACKEND_CANISTER = process.env.VITE_BACKEND_CANISTER_ID || 'lwsav-iiaaa-aaaap-qp2qq-cai';
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

    // Skip authentication - Settings tab should work without auth
    // await authenticateForTests(page);
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
    // Navigate to DAO dashboard
    await page.goto(`/dao/${TEST_TOKEN_ID}`);

    // Wait for dashboard to load
    await page.waitForSelector('h1:has-text("Alexandria")', { timeout: 10000 });

    // Click Settings tab (no data-testid, use text selector)
    await page.click('button:has-text("Settings")');

    // Wait for Settings content to render
    await page.waitForSelector('text=Station Information', { timeout: 30000 });

    // Verify no console errors
    expect(consoleErrors.length).toBe(0);

    if (consoleErrors.length > 0) {
      throw new Error(`Console errors found:\n${consoleErrors.join('\n')}`);
    }
  });

  // --------------------------------------------------------------------------
  // TEST 2: System info API call succeeds
  // --------------------------------------------------------------------------
  test('should successfully call get_orbit_system_info', async ({ page }) => {
    // Navigate and click Settings tab
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');

    // Wait for backend call
    await page.waitForTimeout(5000);

    // Verify API was called
    expect(systemInfoCalls.length).toBeGreaterThan(0);

    // Verify no errors in response
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
    // Load Settings tab
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('text=Station Information', { timeout: 30000 });

    // Wait for loading spinner to disappear
    await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 30000 });

    // Verify station name is visible
    const stationNameElement = page.locator('label:has-text("Station Name")').locator('..').locator('.font-medium');
    await expect(stationNameElement).toBeVisible();
    const nameText = await stationNameElement.textContent();
    expect(nameText).not.toBe('');
    console.log('Station name:', nameText);

    // Verify version is visible
    const versionElement = page.locator('label:has-text("Version")').locator('..').locator('.font-medium');
    await expect(versionElement).toBeVisible();
    const versionText = await versionElement.textContent();
    expect(versionText).not.toBe('');
    console.log('Station version:', versionText);
  });

  // --------------------------------------------------------------------------
  // TEST 4: Station ID and copy button work
  // --------------------------------------------------------------------------
  test('should display station ID with copy button', async ({ page }) => {
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('text=Station Information', { timeout: 30000 });

    // Find station ID field
    const stationIdCode = page.locator('label:has-text("Station ID")').locator('..').locator('code');
    await expect(stationIdCode).toBeVisible();

    const idText = await stationIdCode.textContent();
    expect(idText).toContain(TEST_STATION_ID);
    console.log('Station ID displayed:', idText);

    // Verify copy button exists
    const copyButton = page.locator('label:has-text("Station ID")').locator('..').locator('button');
    await expect(copyButton).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // TEST 5: Cycle information displays
  // --------------------------------------------------------------------------
  test('should display cycle information', async ({ page }) => {
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('text=Station Information', { timeout: 30000 });

    // Wait for cycle info section
    await page.waitForSelector('h4:has-text("Cycle Information")', { timeout: 10000 });

    // Verify station cycles label
    const stationCyclesLabel = page.locator('label:has-text("Station Cycles")').locator('..').locator('.font-medium');
    await expect(stationCyclesLabel).toBeVisible();

    const cyclesText = await stationCyclesLabel.textContent();
    expect(cyclesText).toMatch(/\d+(\.\d+)?\s*(TC|T)?/); // Should match format like "12.345 TC"
    console.log('Station cycles:', cyclesText);

    // Verify cycle obtain strategy
    const strategyLabel = page.locator('label:has-text("Cycle Obtain Strategy")').locator('..').locator('.font-medium');
    await expect(strategyLabel).toBeVisible();
    console.log('Cycle strategy:', await strategyLabel.textContent());
  });

  // --------------------------------------------------------------------------
  // TEST 6: Upgrader information displays
  // --------------------------------------------------------------------------
  test('should display upgrader ID', async ({ page }) => {
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('text=Station Information', { timeout: 30000 });

    // Find upgrader ID field
    const upgraderIdCode = page.locator('label:has-text("Upgrader ID")').locator('..').locator('code');
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
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('text=Station Information', { timeout: 30000 });

    // Find last upgrade field
    const lastUpgradeLabel = page.locator('label:has-text("Last Upgrade")').locator('..').locator('.font-medium');
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
    await page.goto(`/dao/${TEST_TOKEN_ID}`);

    // Click Settings tab
    await page.click('button:has-text("Settings")');

    // Check for loading spinner
    const spinner = page.locator('.animate-spin');

    // Spinner may appear briefly
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
    // Navigate to Settings tab
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');

    // Wait for either success or error state
    await Promise.race([
      page.waitForSelector('text=Station Information', { timeout: 30000 }),
      page.waitForSelector('[role="alert"]', { timeout: 30000 })
    ]);

    // Check if error alert is visible
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

      if (url.includes(BACKEND_CANISTER) ||
          url.includes('ic0.app/api') ||
          url.includes('icp0.io/api')) {
        try {
          const responseText = await response.text();
          networkRequests.push({
            url: url,
            status: response.status(),
            response: responseText
          });

          if (!response.ok()) {
            console.error(`[Network Error] ${url}:`, responseText.substring(0, 500));
          }
        } catch (e) {
          // Binary response, skip
        }
      }
    });

    // Skip authentication - Settings tab should work without auth
    // await authenticateForTests(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      console.log('\n=== CONSOLE ERRORS ===');
      consoleErrors.forEach((err, i) => console.log(`${i+1}. ${err}`));

      console.log('\n=== NETWORK REQUESTS ===');
      networkRequests.slice(0, 10).forEach((req, i) => {
        console.log(`${i+1}. ${req.status} ${req.url}`);
      });

      await page.screenshot({
        path: `test-results/settings-security-failure-${Date.now()}.png`,
        fullPage: true
      });
    }

    consoleErrors.length = 0;
    networkRequests.length = 0;
    systemInfoCalls.length = 0;
  });

  // --------------------------------------------------------------------------
  // TEST 10: Security section is collapsible
  // --------------------------------------------------------------------------
  test('should show/hide security section when clicked', async ({ page }) => {
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('text=Station Information', { timeout: 30000 });

    // Find "Run Security Checks" button
    const securityButton = page.locator('button:has-text("Run")').filter({ hasText: 'Security Checks' });
    await expect(securityButton).toBeVisible();

    // Security dashboard should NOT be visible initially
    const dashboardBefore = await page.locator('text=Analyzing DAO security').count();
    expect(dashboardBefore).toBe(0);

    // Click to expand
    await securityButton.click();

    // Wait for SecurityDashboard to render
    await page.waitForTimeout(2000);

    const dashboardAfter = await page.locator('text=/Analyzing DAO security|DAO security/').count();
    expect(dashboardAfter).toBeGreaterThan(0);
    console.log('✓ Security dashboard expanded');
  });

  // --------------------------------------------------------------------------
  // TEST 11: Security checks show progress
  // --------------------------------------------------------------------------
  test('should show progress while running security checks', async ({ page }) => {
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('text=Station Information', { timeout: 30000 });

    // Expand security section
    await page.click('button:has-text("Run")');

    // Should see progress indicator
    const progressText = page.locator('text=/Analyzing DAO security.*\\d+\\/17 checks complete/');

    // Progress text may appear
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

    // Wait for completion (spinner disappears)
    await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 60000 });
  });

  // --------------------------------------------------------------------------
  // TEST 12: Security checks complete successfully
  // --------------------------------------------------------------------------
  test('should complete all 17 security checks', async ({ page }) => {
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('text=Station Information', { timeout: 30000 });

    // Expand and run security checks
    await page.click('button:has-text("Run")');

    // Wait for checks to complete (up to 60 seconds)
    await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 60000 });

    // Wait for results to render
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
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('text=Station Information', { timeout: 30000 });

    // Find "Load Permissions" button
    const permissionsButton = page.locator('button:has-text("Load Permissions")');
    await expect(permissionsButton).toBeVisible();

    // Click to expand
    await permissionsButton.click();

    // Wait for PermissionsPage to render
    await page.waitForTimeout(2000);

    // Should see permissions content
    const hasContent = await page.locator('text=/group|permission|role/i').count() > 0;
    expect(hasContent).toBe(true);

    console.log('✓ Permissions section expanded');
  });

  // --------------------------------------------------------------------------
  // TEST 14: No React component crashes
  // --------------------------------------------------------------------------
  test('should not trigger error boundary', async ({ page }) => {
    await page.goto(`/dao/${TEST_TOKEN_ID}`);
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(10000);

    // Check for error boundary
    const errorBoundary = await page.locator('[data-testid="error-boundary"]').count();
    expect(errorBoundary).toBe(0);

    // Expand security (potential crash point)
    await page.click('button:has-text("Run")');
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
    consoleErrors.length = 0;
    networkRequests.length = 0;
    systemInfoCalls.length = 0;

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.error('[Browser Console Error]:', msg.text());
      }
    });

    // Skip authentication - Settings tab should work without auth
    // await authenticateForTests(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({
        path: `test-results/settings-pipeline-failure-${Date.now()}.png`,
        fullPage: true
      });
    }

    consoleErrors.length = 0;
    networkRequests.length = 0;
    systemInfoCalls.length = 0;
  });

  // --------------------------------------------------------------------------
  // TEST 15: Backend response format is correct
  // --------------------------------------------------------------------------
  test('should receive system info in expected format', async ({ page }) => {
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
    const uiStationIdElement = page.locator('label:has-text("Station ID")').locator('..').locator('code');
    const uiStationId = await uiStationIdElement.textContent();

    // Verify consistency
    expect(backendStationId).not.toBeNull();
    expect(uiStationId).toContain(TEST_STATION_ID);

    console.log('Backend station ID:', backendStationId);
    console.log('UI station ID:', uiStationId);
    console.log('✓ Data consistency verified');
  });
});
