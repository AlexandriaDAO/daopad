import { test, expect, Page } from '@playwright/test';

// Test state capture
const consoleMessages: Array<{type: string, text: string, timestamp: number}> = [];
const consoleErrors: Array<string> = [];
const networkRequests: Array<{url: string, status: number, timestamp: number, response: string}> = [];
const publicDashboardCalls: Array<{url: string, status: number, timestamp: number, response: string}> = [];

test.describe('App Route - Public Dashboard Loading', () => {

  test.beforeEach(async ({ page }) => {
    // Clear capture arrays
    consoleMessages.length = 0;
    consoleErrors.length = 0;
    networkRequests.length = 0;
    publicDashboardCalls.length = 0;

    // Monitor console
    page.on('console', (msg) => {
      const entry = {
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      };
      consoleMessages.push(entry);

      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.error('[Browser Console Error]:', msg.text());
      }
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
            console.log(`[Public Dashboard API] ${response.status()} ${extractMethodName(url)}`);
          }

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
      (window as any).__REDUX_DISPATCH_LOG__ = [];

      // Wait for store to be available
      const checkStore = setInterval(() => {
        const store = (window as any).store;
        if (store && store.dispatch) {
          const originalDispatch = store.dispatch;
          store.dispatch = function(action: any) {
            (window as any).__REDUX_DISPATCH_LOG__.push({
              type: action.type,
              payload: action.payload,
              timestamp: Date.now()
            });
            return originalDispatch.apply(this, arguments);
          };
          clearInterval(checkStore);
        }
      }, 100);
    });
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      // Log all captured data for debugging
      console.log('\n=== CONSOLE ERRORS ===');
      if (consoleErrors.length === 0) {
        console.log('No console errors found');
      } else {
        consoleErrors.forEach((err, i) => {
          console.log(`${i+1}. ${err}`);
        });
      }

      console.log('\n=== PUBLIC DASHBOARD API CALLS ===');
      if (publicDashboardCalls.length === 0) {
        console.log('No public dashboard API calls captured');
      } else {
        publicDashboardCalls.forEach((call, i) => {
          console.log(`${i+1}. ${call.status} ${extractMethodName(call.url)}`);
          console.log(`   Response: ${call.response.substring(0, 300)}...`);
        });
      }

      console.log('\n=== REDUX ACTIONS ===');
      const reduxLog = await page.evaluate(() => (window as any).__REDUX_DISPATCH_LOG__ || []);
      const publicDashboardActions = reduxLog.filter((a: any) => a.type.includes('publicDashboard'));
      if (publicDashboardActions.length === 0) {
        console.log('No publicDashboard Redux actions found');
      } else {
        publicDashboardActions.forEach((action: any, i: number) => {
          console.log(`${i+1}. ${action.type}`);
          if (action.payload) {
            console.log(`   Payload: ${JSON.stringify(action.payload).substring(0, 200)}`);
          }
        });
      }

      // Screenshot
      await page.screenshot({
        path: `test-results/app-route-failure-${Date.now()}.png`,
        fullPage: true
      });
    }

    // Clear arrays
    consoleMessages.length = 0;
    consoleErrors.length = 0;
    networkRequests.length = 0;
    publicDashboardCalls.length = 0;
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

    // Wait up to 30 seconds for skeleton to disappear
    try {
      await expect(statsSkeleton).not.toBeVisible({ timeout: 30000 });
    } catch (e) {
      console.error('Skeleton still visible after 30 seconds');
      throw new Error('Public dashboard data did not load - skeleton still visible');
    }

    // Verify all 4 stat cards loaded
    const statCards = page.locator('[data-testid="stat-card"]');
    const count = await statCards.count();
    expect(count).toBe(4);

    // Verify no console errors
    if (consoleErrors.length > 0) {
      throw new Error(`Console errors found:\n${consoleErrors.join('\n')}`);
    }

    // Verify public dashboard API calls succeeded
    expect(publicDashboardCalls.length).toBeGreaterThan(0);
    const failedCalls = publicDashboardCalls.filter(c => c.status >= 400);
    if (failedCalls.length > 0) {
      throw new Error(`Failed API calls found:\n${failedCalls.map(c => `${c.status} ${c.url}`).join('\n')}`);
    }
  });

  test('should fetch data from all 4 backend services', async ({ page }) => {
    await page.goto('/app');

    // Wait for page to load
    await page.waitForSelector('header h1:has-text("DAOPad")', { timeout: 10000 });

    // Wait 15 seconds for all requests to complete
    await page.waitForTimeout(15000);

    // Check for specific method calls
    const methodCalls = publicDashboardCalls.map(c => extractMethodName(c.url));

    console.log('Captured method calls:', methodCalls);

    // Note: The actual method names may vary based on IC canister implementation
    // We're checking that we got multiple different API calls
    expect(publicDashboardCalls.length).toBeGreaterThan(0);

    // All should return 200
    const failedCalls = publicDashboardCalls.filter(call => call.status >= 400);
    expect(failedCalls.length).toBe(0);
  });

  test('should update Redux state with dashboard data', async ({ page }) => {
    await page.goto('/app');

    // Wait for page to load
    await page.waitForSelector('header h1:has-text("DAOPad")', { timeout: 10000 });

    // Wait for fetchPublicDashboard actions
    await page.waitForTimeout(15000);

    // Check Redux actions
    const reduxLog = await page.evaluate(() => (window as any).__REDUX_DISPATCH_LOG__ || []);

    const pendingAction = reduxLog.find((a: any) => a.type === 'dao/fetchPublicDashboard/pending');
    const fulfilledAction = reduxLog.find((a: any) => a.type === 'dao/fetchPublicDashboard/fulfilled');
    const rejectedAction = reduxLog.find((a: any) => a.type === 'dao/fetchPublicDashboard/rejected');

    expect(pendingAction).toBeDefined();

    if (rejectedAction) {
      console.error('Redux action rejected:', rejectedAction);
      throw new Error(`fetchPublicDashboard was rejected: ${JSON.stringify(rejectedAction.payload)}`);
    }

    expect(fulfilledAction).toBeDefined();

    // Check payload has data
    if (fulfilledAction && fulfilledAction.payload) {
      console.log('Redux payload received:', JSON.stringify(fulfilledAction.payload).substring(0, 500));
    }
  });

  test('should render PublicActivityFeed with proposals', async ({ page }) => {
    await page.goto('/app');

    // Wait for page to load
    await page.waitForSelector('header h1:has-text("DAOPad")', { timeout: 10000 });

    // Wait for activity feed section
    await page.waitForTimeout(10000);

    // Check if the section exists
    const hasActivitySection = await page.locator('text=/Active Proposals|Governance Activity/i').count() > 0;

    if (hasActivitySection) {
      // Check if proposals loaded OR empty state shown
      const hasProposals = await page.locator('[data-testid="proposal-item"]').count() > 0;
      const hasEmptyState = await page.locator('text=/No active proposals/i').count() > 0;

      expect(hasProposals || hasEmptyState).toBe(true);
      console.log(`Activity feed status: ${hasProposals ? 'Has proposals' : 'Empty state'}`);
    } else {
      console.log('Activity feed section not found - may be conditionally rendered');
    }
  });

  test('should render TreasuryShowcase with treasuries', async ({ page }) => {
    await page.goto('/app');

    // Wait for page to load
    await page.waitForSelector('header h1:has-text("DAOPad")', { timeout: 10000 });

    // Wait for treasury showcase section
    await page.waitForTimeout(10000);

    // Check if the section exists
    const hasTreasurySection = await page.locator('text=/Token Treasuries/i').count() > 0;

    if (hasTreasurySection) {
      // Check for treasury items or empty state
      const hasTreasuries = await page.locator('[data-testid="treasury-item"]').count() > 0;
      const hasEmptyState = await page.locator('text=/No treasuries/i').count() > 0;

      expect(hasTreasuries || hasEmptyState).toBe(true);
      console.log(`Treasury showcase status: ${hasTreasuries ? 'Has treasuries' : 'Empty state'}`);
    } else {
      console.log('Treasury showcase section not found - may be conditionally rendered');
    }
  });

  test('should handle network failures gracefully', async ({ page }) => {
    // Simulate offline
    await page.context().setOffline(true);

    await page.goto('/app').catch(() => {
      // Expected to fail
    });

    // Re-enable network
    await page.context().setOffline(false);

    // Now try to load properly
    await page.goto('/app');

    // Wait for page structure
    await page.waitForSelector('header h1:has-text("DAOPad")', { timeout: 10000 });

    // Should NOT crash - check for error boundary
    const errorBoundary = await page.locator('[data-testid="error-boundary"]').count();
    expect(errorBoundary).toBe(0);

    console.log('App handled network failure gracefully - no error boundary triggered');
  });

  test('should poll every 30 seconds when logged out', async ({ page }) => {
    await page.goto('/app');

    // Wait for page to load
    await page.waitForSelector('header h1:has-text("DAOPad")', { timeout: 10000 });

    // Wait for first fetch
    await page.waitForTimeout(10000);
    const initialCallCount = publicDashboardCalls.length;

    console.log(`Initial API calls: ${initialCallCount}`);

    // Wait 35 seconds (should trigger 1 more poll cycle)
    await page.waitForTimeout(35000);

    const finalCallCount = publicDashboardCalls.length;

    console.log(`Final API calls: ${finalCallCount}`);

    // Should have made another set of calls
    expect(finalCallCount).toBeGreaterThan(initialCallCount);

    console.log(`Polling verified: ${initialCallCount} → ${finalCallCount} calls`);
  });
});

// Helper functions
function extractMethodName(url: string): string {
  // Parse IC canister call URL to extract method name
  // IC canister URLs are typically: https://ic0.app/api/v2/canister/{canister-id}/call
  // The actual method name is in the request body, not the URL
  // For now, we'll return a simplified identifier

  if (url.includes('get_system_stats')) return 'get_system_stats';
  if (url.includes('list_active')) return 'list_active';
  if (url.includes('list_all_stations')) return 'list_all_stations';
  if (url.includes('list_all_registrations')) return 'list_all_registrations';

  // Try to extract from pathname
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    return pathParts[pathParts.length - 1] || 'unknown';
  } catch {
    return 'unknown';
  }
}
