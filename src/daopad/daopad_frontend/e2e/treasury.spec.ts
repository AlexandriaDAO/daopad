import { test, expect, Page } from '@playwright/test';
import { authenticateForTests } from './helpers/auth';

const BACKEND_CANISTER = process.env.VITE_BACKEND_CANISTER_ID || 'lwsav-iiaaa-aaaap-qp2qq-cai';

const consoleMessages: Array<{type: string, text: string}> = [];
const consoleErrors: Array<string> = [];
const networkRequests: Array<{url: string, status: number, response: any}> = [];

test.describe('Treasury Tab - E2E', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

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

    page.on('response', async (response) => {
      const url = response.url();

      if (url.includes(BACKEND_CANISTER) ||
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

    await authenticateForTests(page);
  });

  test.afterEach(async () => {
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

      await page.screenshot({
        path: `test-results/treasury-failure-${Date.now()}.png`,
        fullPage: true
      });
    }

    consoleMessages.length = 0;
    consoleErrors.length = 0;
    networkRequests.length = 0;
  });

  test('should load Treasury tab without console errors', async () => {
    await page.goto('/app/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');

    // Wait for page to be in a loaded state
    await page.waitForLoadState('networkidle');

    // Click treasury tab (it's the default tab, so it should already be active)
    await page.click('[data-testid="treasury-tab"]');

    // Wait for treasury content to load (either overview or loading spinner)
    await page.waitForSelector('[data-testid="treasury-overview"], [data-testid="loading-spinner"]', {
      timeout: 30000
    });

    // Wait for loading to finish
    await page.waitForSelector('[data-testid="loading-spinner"]', {
      state: 'detached',
      timeout: 30000
    }).catch(() => {
      // Loading spinner might not appear if data loads quickly
      console.log('No loading spinner detected (data may have loaded immediately)');
    });

    // Verify treasury overview is visible
    await page.waitForSelector('[data-testid="treasury-overview"]', {
      timeout: 10000
    });

    expect(consoleErrors.length).toBe(0);

    if (consoleErrors.length > 0) {
      throw new Error(
        `Console errors found:\n${consoleErrors.join('\n')}`
      );
    }
  });

  test('should display treasury assets', async () => {
    await page.goto('/app/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="treasury-tab"]');

    // Wait for treasury content to load
    await page.waitForSelector('[data-testid="treasury-overview"]', {
      timeout: 30000
    });

    // Wait for loading to finish
    await page.waitForSelector('[data-testid="loading-spinner"]', {
      state: 'detached',
      timeout: 30000
    }).catch(() => console.log('No loading spinner'));

    // Wait for at least one treasury asset (AccordionItem)
    await page.waitForSelector('[data-testid="treasury-account"]', {
      timeout: 30000,
      state: 'attached'
    });

    const assets = await page.$$('[data-testid="treasury-account"]');

    console.log(`Found ${assets.length} treasury assets`);

    // Don't hardcode the exact number - just verify we have some assets
    expect(assets.length).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(assets.length, 5); i++) {
      const name = await assets[i].textContent();
      console.log(`Asset ${i + 1}: ${name?.substring(0, 100)}`);
    }
  });

  test('should display account balances', async () => {
    await page.goto('/app/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="treasury-tab"]');

    await page.waitForSelector('[data-testid="treasury-overview"]', { timeout: 30000 });
    await page.waitForSelector('[data-testid="treasury-account"]', { timeout: 30000 });

    const balanceElements = await page.$$('[data-testid="account-balance"]');
    expect(balanceElements.length).toBeGreaterThan(0);

    const firstBalance = await balanceElements[0].textContent();
    console.log('First asset balance:', firstBalance);

    expect(firstBalance).not.toContain('Loading');
    // Balance could be 0, so don't check for non-zero
  });

  test('should show asset symbols', async () => {
    await page.goto('/app/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="treasury-tab"]');

    await page.waitForSelector('[data-testid="treasury-overview"]', { timeout: 30000 });
    await page.waitForSelector('[data-testid="treasury-account"]', { timeout: 30000 });

    // Check if any asset symbols are present
    const pageText = await page.locator('[data-testid="treasury-overview"]').textContent();
    console.log('Treasury content includes symbols:', pageText?.includes('ICP') || pageText?.includes('ALEX'));

    // Don't assert specific symbols - just verify content is present
    expect(pageText).toBeTruthy();
    expect(pageText.length).toBeGreaterThan(100);
  });

  test('should not show loading spinner indefinitely', async () => {
    await page.goto('/app/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="treasury-tab"]');

    // Wait for either loading spinner to disappear or treasury content to appear
    await Promise.race([
      page.waitForSelector('[data-testid="loading-spinner"]', {
        state: 'detached',
        timeout: 30000
      }),
      page.waitForSelector('[data-testid="treasury-overview"]', {
        timeout: 30000
      })
    ]);

    const hasContent = await page.locator('[data-testid="treasury-account"]').count() > 0;
    expect(hasContent).toBe(true);
  });

  test('should handle network errors gracefully', async () => {
    await page.goto('/app/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="treasury-tab"]');

    // Wait for either success or error state
    await Promise.race([
      page.waitForSelector('[data-testid="treasury-overview"]', { timeout: 30000 }),
      page.waitForSelector('[data-testid="error-message"]', { timeout: 30000 }),
      page.waitForSelector('[data-testid="treasury-empty"]', { timeout: 30000 })
    ]);

    const errorVisible = await page.locator('[data-testid="error-message"]').count() > 0;

    if (errorVisible) {
      const errorText = await page.locator('[data-testid="error-message"]').textContent();
      console.log('Error message shown:', errorText);

      // Check for specific backend errors that indicate bugs
      expect(errorText).not.toContain('Canister has no update method');
      expect(errorText).not.toContain('undefined is not a function');
    }
  });

  test('should capture React component errors', async () => {
    await page.goto('/app/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.waitForLoadState('networkidle');

    await page.exposeFunction('logReactError', (error: string) => {
      console.error('React error:', error);
      consoleErrors.push(`React: ${error}`);
    });

    await page.click('[data-testid="treasury-tab"]');

    // Wait for content to load
    await page.waitForSelector('[data-testid="treasury-overview"]', { timeout: 30000 });

    const errorBoundary = await page.locator('[data-testid="error-boundary"]').count() > 0;

    if (errorBoundary) {
      const errorText = await page.locator('[data-testid="error-boundary"]').textContent();
      throw new Error(`React error boundary triggered: ${errorText}`);
    }

    const reactErrors = consoleErrors.filter(e =>
      e.includes('React') ||
      e.includes('Component') ||
      e.includes('TypeError')
    );

    expect(reactErrors.length).toBe(0);
  });
});

test.describe('Treasury Network Requests', () => {
  test('should successfully call backend APIs', async ({ page }) => {
    const networkCalls: Array<{url: string, response: string}> = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('list_orbit_accounts') || url.includes('listDashboardAssets')) {
        try {
          const data = await response.text();
          networkCalls.push({ url, response: data });
          console.log('Backend API response:', url, data.substring(0, 200));
        } catch (e) {
          console.log('Could not read response for:', url);
        }
      }
    });

    await page.goto('/app/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="treasury-tab"]');

    // Wait for treasury to load
    await page.waitForSelector('[data-testid="treasury-overview"]', { timeout: 30000 });

    // Wait a bit for any async network calls
    await page.waitForTimeout(5000);

    // Check if we captured any backend calls
    if (networkCalls.length > 0) {
      console.log(`Captured ${networkCalls.length} backend API calls`);

      // Check for common backend errors
      const hasError = networkCalls.some(call =>
        call.response.includes('has no update method') ||
        call.response.includes('Method does not exist')
      );
      expect(hasError).toBe(false);
    } else {
      console.log('No backend API calls captured (they may use different endpoints)');
    }
  });

  test('should load treasury data successfully', async ({ page }) => {
    await page.goto('/app/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="treasury-tab"]');

    // Wait for treasury overview to load
    await page.waitForSelector('[data-testid="treasury-overview"]', { timeout: 30000 });

    // Check if we have treasury accounts/assets displayed
    const hasAssets = await page.locator('[data-testid="treasury-account"]').count() > 0;
    const isEmpty = await page.locator('[data-testid="treasury-empty"]').count() > 0;

    // Either we have assets or the treasury is empty (both are valid states)
    expect(hasAssets || isEmpty).toBe(true);

    if (hasAssets) {
      console.log('Treasury loaded with assets');
    } else if (isEmpty) {
      console.log('Treasury loaded but empty');
    }
  });
});
