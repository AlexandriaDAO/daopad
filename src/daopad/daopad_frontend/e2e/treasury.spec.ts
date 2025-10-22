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
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');

    await page.waitForSelector('h1:has-text("Alexandria")', { timeout: 10000 });

    await page.click('[data-testid="treasury-tab"]');

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
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.click('[data-testid="treasury-tab"]');

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
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.click('[data-testid="treasury-tab"]');

    await page.waitForSelector('[data-testid="treasury-account"]');

    const balanceElements = await page.$$('[data-testid="account-balance"]');
    expect(balanceElements.length).toBeGreaterThan(0);

    const firstBalance = await balanceElements[0].textContent();
    console.log('First account balance:', firstBalance);

    expect(firstBalance).not.toContain('Loading');
    expect(firstBalance).not.toBe('0');
  });

  test('should show asset breakdown (ICP/ALEX)', async () => {
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.click('[data-testid="treasury-tab"]');

    await page.waitForSelector('[data-testid="treasury-account"]');

    const icpMentioned = await page.locator('text=ICP').count() > 0;
    expect(icpMentioned).toBe(true);

    const alexMentioned = await page.locator('text=ALEX').count() > 0;
    expect(alexMentioned).toBe(true);

    console.log('Asset symbols found: ICP, ALEX');
  });

  test('should not show loading spinner indefinitely', async () => {
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.click('[data-testid="treasury-tab"]');

    await page.waitForSelector('[data-testid="loading-spinner"]', {
      state: 'detached',
      timeout: 30000
    });

    const hasContent = await page.locator('[data-testid="treasury-account"]').count() > 0;
    expect(hasContent).toBe(true);
  });

  test('should handle network errors gracefully', async () => {
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.click('[data-testid="treasury-tab"]');

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
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');

    await page.exposeFunction('logReactError', (error: string) => {
      console.error('React error:', error);
      consoleErrors.push(`React: ${error}`);
    });

    await page.click('[data-testid="treasury-tab"]');
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

    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.click('[data-testid="treasury-tab"]');
    await page.waitForTimeout(5000);

    expect(accountsData).not.toBeNull();

    expect(accountsData.Ok).toBeDefined();
    expect(accountsData.Ok.accounts).toBeDefined();
    expect(Array.isArray(accountsData.Ok.accounts)).toBe(true);

    console.log('Received accounts:', accountsData.Ok.accounts.length);
  });
});
