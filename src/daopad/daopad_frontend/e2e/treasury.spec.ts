/**
 * AUTHENTICATION LIMITATION:
 * These tests are skipped because Treasury features require ICP Internet Identity
 * authentication, which Playwright cannot automate (see CLAUDE.md).
 *
 * These features must be tested manually:
 * 1. Navigate to Treasury tab while authenticated
 * 2. Verify account list loads
 * 3. Verify balances display correctly
 * 4. Test accordion expand/collapse
 *
 * TODO: Consider creating mock authenticated state for E2E testing
 */

import { test, expect, Page } from '@playwright/test';
import { authenticateForTests } from './helpers/auth';
import { TEST_TOKEN_ID } from './helpers/treasury-test-setup';
import { existsSync } from 'node:fs';

const BACKEND_CANISTER = process.env.VITE_BACKEND_CANISTER_ID || 'lwsav-iiaaa-aaaap-qp2qq-cai';

const consoleMessages: Array<{type: string, text: string}> = [];
const consoleErrors: Array<string> = [];
const networkRequests: Array<{url: string, status: number, response: any}> = [];

test.describe.skip('Treasury Tab - E2E', () => {
  // SKIPPED: Requires ICP authentication which Playwright cannot handle
  // See CLAUDE.md: "Playwright's not compatible with ICP Auth"
  // Manual testing required for authenticated features
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Check if we have auth or should skip
    const hasAuth = existsSync('.auth/user.json');
    if (!hasAuth && !process.env.CI) {
      test.skip();
      return;
    }

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
    // Navigate directly to treasury route
    await page.goto(`/dao/${TEST_TOKEN_ID}/treasury`);

    await page.waitForSelector('[data-testid="treasury-overview"]', {
      timeout: 30000
    });

    expect(consoleErrors.length).toBe(0);

    if (consoleErrors.length > 0) {
      throw new Error(
        `Console errors found:\n${consoleErrors.join('\n')}`
      );
    }
  });

  test('should display 4 treasury accounts', async () => {
    // Navigate directly to treasury route
    await page.goto(`/dao/${TEST_TOKEN_ID}/treasury`);

    await page.waitForSelector('[data-testid="treasury-account"]', {
      timeout: 30000,
      state: 'attached'
    });

    const accounts = await page.$$('[data-testid="treasury-account"]');

    console.log(`Found ${accounts.length} treasury accounts`);

    expect(accounts.length).toBe(4);

    for (let i = 0; i < accounts.length; i++) {
      const name = await accounts[i].textContent();
      console.log(`Account ${i + 1}: ${name}`);
    }
  });

  test('should display account balances', async () => {
    // Navigate directly to treasury route
    await page.goto(`/dao/${TEST_TOKEN_ID}/treasury`);

    await page.waitForSelector('[data-testid="treasury-account"]');

    const balanceElements = await page.$$('[data-testid="account-balance"]');
    expect(balanceElements.length).toBeGreaterThan(0);

    const firstBalance = await balanceElements[0].textContent();
    console.log('First account balance:', firstBalance);

    expect(firstBalance).not.toContain('Loading');
    expect(firstBalance).not.toBe('0');
  });

  test('should show asset breakdown (ICP/ALEX)', async () => {
    // Navigate directly to treasury route
    await page.goto(`/dao/${TEST_TOKEN_ID}/treasury`);

    await page.waitForSelector('[data-testid="treasury-account"]');

    const icpMentioned = await page.locator('text=ICP').count() > 0;
    expect(icpMentioned).toBe(true);

    const alexMentioned = await page.locator('text=ALEX').count() > 0;
    expect(alexMentioned).toBe(true);

    console.log('Asset symbols found: ICP, ALEX');
  });

  test('should not show loading spinner indefinitely', async () => {
    // Navigate directly to treasury route
    await page.goto(`/dao/${TEST_TOKEN_ID}/treasury`);

    await page.waitForSelector('[data-testid="loading-spinner"]', {
      state: 'detached',
      timeout: 30000
    });

    const hasContent = await page.locator('[data-testid="treasury-account"]').count() > 0;
    expect(hasContent).toBe(true);
  });

  test('should handle network errors gracefully', async () => {
    // Navigate directly to treasury route
    await page.goto(`/dao/${TEST_TOKEN_ID}/treasury`);

    await Promise.race([
      page.waitForSelector('[data-testid="treasury-account"]', { timeout: 30000 }),
      page.waitForSelector('[data-testid="error-message"]', { timeout: 30000 })
    ]);

    const errorVisible = await page.locator('[data-testid="error-message"]').count() > 0;

    if (errorVisible) {
      const errorText = await page.locator('[data-testid="error-message"]').textContent();
      console.log('Error message shown:', errorText);

      expect(errorText).not.toContain('Canister has no update method');
      expect(errorText).not.toContain('undefined is not a function');
    }
  });

  test('should capture React component errors', async () => {
    await page.exposeFunction('logReactError', (error: string) => {
      console.error('React error:', error);
      consoleErrors.push(`React: ${error}`);
    });

    // Navigate directly to treasury route
    await page.goto(`/dao/${TEST_TOKEN_ID}/treasury`);
    await page.waitForTimeout(5000);

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

test.describe.skip('Treasury Network Requests', () => {
  // SKIPPED: Authentication required
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

    // Navigate directly to treasury route
    await page.goto(`/dao/${TEST_TOKEN_ID}/treasury`);
    await page.waitForTimeout(5000);

    expect(networkCalls.length).toBeGreaterThan(0);

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
          accountsData = JSON.parse(text);
        } catch (e) {
          console.error('Failed to parse response:', e);
        }
      }
    });

    // Navigate directly to treasury route
    await page.goto(`/dao/${TEST_TOKEN_ID}/treasury`);
    await page.waitForTimeout(5000);

    expect(accountsData).not.toBeNull();

    expect(accountsData.Ok).toBeDefined();
    expect(accountsData.Ok.accounts).toBeDefined();
    expect(Array.isArray(accountsData.Ok.accounts)).toBe(true);

    console.log('Received accounts:', accountsData.Ok.accounts.length);
  });
});
