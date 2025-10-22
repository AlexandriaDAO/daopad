import { test, expect, Page } from '@playwright/test';
import { authenticateForTests } from './helpers/auth';

const BACKEND_CANISTER = process.env.VITE_BACKEND_CANISTER_ID || 'lwsav-iiaaa-aaaap-qp2qq-cai';

// Test state capture
const consoleMessages: Array<{type: string, text: string}> = [];
const consoleErrors: Array<string> = [];
const networkRequests: Array<{url: string, status: number, response: any}> = [];
const canisterAPICalls: Array<{url: string, status: number, response: string}> = [];

test.describe('Canisters Tab - E2E Data Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Clear capture arrays
    consoleMessages.length = 0;
    consoleErrors.length = 0;
    networkRequests.length = 0;
    canisterAPICalls.length = 0;

    // Monitor console
    page.on('console', (msg) => {
      const entry = {
        type: msg.type(),
        text: msg.text()
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

      // Capture backend canister calls
      if (url.includes(BACKEND_CANISTER) ||
          url.includes('ic0.app/api') ||
          url.includes('icp0.io/api')) {
        try {
          const responseData = await response.text();
          networkRequests.push({
            url: url,
            status: response.status(),
            response: responseData
          });

          // Track list_orbit_canisters specifically
          if (url.includes('list_orbit_canisters') ||
              responseData.includes('list_orbit_canisters')) {
            canisterAPICalls.push({
              url: url,
              status: response.status(),
              response: responseData
            });
            console.log(`[Canister API] ${response.status()} list_orbit_canisters`);
          }

          if (!response.ok()) {
            console.error(`[Network Error] ${url}:`, responseData.substring(0, 500));
          }
        } catch (e) {
          // Binary response, skip
        }
      }
    });

    // Authenticate user
    await authenticateForTests(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      // Log console errors
      console.log('\n=== CONSOLE ERRORS ===');
      if (consoleErrors.length === 0) {
        console.log('No console errors found');
      } else {
        consoleErrors.forEach((err, i) => {
          console.log(`${i+1}. ${err}`);
        });
      }

      // Log canister API calls
      console.log('\n=== CANISTER API CALLS ===');
      if (canisterAPICalls.length === 0) {
        console.log('No canister API calls captured');
      } else {
        canisterAPICalls.forEach((call, i) => {
          console.log(`${i+1}. ${call.status} ${call.url}`);
          console.log(`   Response: ${call.response.substring(0, 300)}...`);
        });
      }

      // Take screenshot
      await page.screenshot({
        path: `test-results/canisters-failure-${Date.now()}.png`,
        fullPage: true
      });
    }

    // Clear arrays
    consoleMessages.length = 0;
    consoleErrors.length = 0;
    networkRequests.length = 0;
    canisterAPICalls.length = 0;
  });

  test('should load Canisters tab without console errors', async ({ page }) => {
    // Navigate to ALEX token page
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Alexandria")', { timeout: 10000 });

    // Click Canisters tab
    await page.click('[data-testid="canisters-tab"]');

    // Wait for canisters to load (either cards appear or empty state shows)
    await Promise.race([
      page.waitForSelector('[data-testid="canister-card"]', {
        timeout: 30000,
        state: 'visible'
      }),
      page.waitForSelector('text=No canisters yet', { timeout: 30000 })
    ]);

    // Verify no console errors
    expect(consoleErrors.length).toBe(0);

    if (consoleErrors.length > 0) {
      throw new Error(
        `Console errors found:\n${consoleErrors.join('\n')}`
      );
    }
  });

  test('should successfully call list_orbit_canisters backend method', async ({ page }) => {
    let canisterListResponse: any = null;

    page.on('response', async (response) => {
      if (response.url().includes('list_orbit_canisters')) {
        const text = await response.text();
        canisterListResponse = { status: response.status(), data: text };
      }
    });

    // Navigate and click tab
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.waitForSelector('h1:has-text("Alexandria")');
    await page.click('[data-testid="canisters-tab"]');

    // Wait for response
    await page.waitForTimeout(10000);

    // Verify backend was called
    expect(canisterListResponse).not.toBeNull();
    expect(canisterListResponse.status).toBe(200);

    // Verify response format
    try {
      const parsed = JSON.parse(canisterListResponse.data);
      expect(parsed.Ok).toBeDefined();

      // Orbit Station returns either { canisters: [], total: N } or just an array
      const hasData = parsed.Ok.canisters ||
                      parsed.Ok.data ||
                      Array.isArray(parsed.Ok);
      expect(hasData).toBeTruthy();

      console.log('Backend response format validated');
    } catch (e) {
      console.error('Failed to parse response:', e);
      throw e;
    }
  });

  test('should render canister cards with real data OR empty state', async ({ page }) => {
    // Navigate to ALEX token
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.waitForSelector('h1:has-text("Alexandria")');
    await page.click('[data-testid="canisters-tab"]');

    // Wait for either canister cards OR empty state
    await Promise.race([
      page.waitForSelector('[data-testid="canister-card"]', { timeout: 30000 }),
      page.waitForSelector('text=No canisters yet', { timeout: 30000 })
    ]);

    // Check what we got
    const canisterCards = await page.$$('[data-testid="canister-card"]');
    const hasEmptyState = await page.locator('text=No canisters yet').count() > 0;

    if (canisterCards.length > 0) {
      // Has canisters - verify they have real data
      console.log(`Found ${canisterCards.length} canisters displayed`);

      const firstCard = canisterCards[0];
      const cardText = await firstCard.textContent();

      // Should contain real data (not loading state)
      expect(cardText).not.toContain('Loading');
      expect(cardText).toBeTruthy();
    } else {
      // Empty state - verify it's intentional
      expect(hasEmptyState).toBe(true);
      console.log('Empty state displayed correctly');
    }

    // Should NOT be stuck loading
    const stillLoading = await page.locator('.animate-pulse').count() > 0;
    expect(stillLoading).toBe(false);
  });

  test('should handle empty canisters state gracefully', async ({ page }) => {
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.waitForSelector('h1:has-text("Alexandria")');
    await page.click('[data-testid="canisters-tab"]');

    // Wait for either canisters or empty state
    await Promise.race([
      page.waitForSelector('[data-testid="canister-card"]', { timeout: 30000 }),
      page.waitForSelector('text=No canisters yet', { timeout: 30000 })
    ]);

    const hasEmptyState = await page.locator('text=No canisters yet').count() > 0;
    const hasCanisterCards = (await page.$$('[data-testid="canister-card"]')).length > 0;

    // Should show either empty state OR canister cards (not stuck loading)
    expect(hasEmptyState || hasCanisterCards).toBe(true);

    // Should not show error
    const hasError = await page.locator('[role="alert"]').count() > 0;
    if (hasError) {
      const errorText = await page.locator('[role="alert"]').textContent();
      console.log('Error shown:', errorText);
    }
    expect(hasError).toBe(false);
  });

  test('should filter out backend canister from display', async ({ page }) => {
    // Navigate to ALEX token
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.waitForSelector('h1:has-text("Alexandria")');
    await page.click('[data-testid="canisters-tab"]');

    await page.waitForTimeout(5000);

    // Get all canister cards
    const canisterCards = await page.$$('[data-testid="canister-card"]');

    // Check that none of them contain the backend canister ID
    for (const card of canisterCards) {
      const text = await card.textContent();
      expect(text).not.toContain(BACKEND_CANISTER);
    }

    console.log(`✅ Backend canister (${BACKEND_CANISTER}) correctly filtered from display`);
  });

  test('should capture network layer data flow', async ({ page }) => {
    // Track the complete data flow
    const networkFlow: any[] = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('list_orbit_canisters') ||
          url.includes('ic0.app/api') ||
          url.includes('icp0.io/api')) {
        networkFlow.push({
          url: url,
          status: response.status(),
          timestamp: Date.now()
        });
      }
    });

    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.waitForSelector('h1:has-text("Alexandria")');
    await page.click('[data-testid="canisters-tab"]');
    await page.waitForTimeout(10000);

    // Should have made IC network calls
    expect(networkFlow.length).toBeGreaterThan(0);

    // All should succeed (200 range)
    const failed = networkFlow.filter(f => f.status >= 400);
    if (failed.length > 0) {
      console.error('Failed network calls:', failed);
    }
    expect(failed.length).toBe(0);

    console.log(`Network flow: ${networkFlow.length} calls, all successful`);
  });

  test('should not show loading spinner indefinitely', async ({ page }) => {
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.waitForSelector('h1:has-text("Alexandria")');
    await page.click('[data-testid="canisters-tab"]');

    // Wait for loading to complete - either skeleton disappears OR content appears
    await Promise.race([
      page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 30000 }),
      page.waitForSelector('[data-testid="canister-card"]', { timeout: 30000 }),
      page.waitForSelector('text=No canisters yet', { timeout: 30000 })
    ]);

    // Should not be stuck in loading state
    const stillLoading = await page.locator('.animate-pulse').count();
    expect(stillLoading).toBe(0);

    console.log('✅ Loading state completed successfully');
  });
});

test.describe('Canisters Network Requests', () => {

  test('should receive canister data in correct format', async ({ page }) => {
    let canisterResponse: any = null;

    page.on('response', async (response) => {
      if (response.url().includes('list_orbit_canisters')) {
        try {
          const text = await response.text();
          canisterResponse = JSON.parse(text);
        } catch (e) {
          console.error('Failed to parse response:', e);
        }
      }
    });

    await authenticateForTests(page);
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.waitForSelector('h1:has-text("Alexandria")');
    await page.click('[data-testid="canisters-tab"]');
    await page.waitForTimeout(10000);

    // Verify response structure
    expect(canisterResponse).not.toBeNull();
    expect(canisterResponse.Ok).toBeDefined();

    // Check for expected fields in Orbit Station response
    // Format: { Ok: { canisters: [...], total: N, privileges: [...] } }
    // OR: { Ok: [...] } (array directly)
    const hasData = canisterResponse.Ok.canisters ||
                    canisterResponse.Ok.data ||
                    Array.isArray(canisterResponse.Ok);
    expect(hasData).toBeTruthy();

    console.log('Response format validated:', JSON.stringify(canisterResponse).substring(0, 300));
  });

  test('should handle backend errors gracefully', async ({ page }) => {
    const errors: string[] = [];

    page.on('response', async (response) => {
      if (!response.ok() && response.url().includes('list_orbit_canisters')) {
        const text = await response.text();
        errors.push(`${response.status()}: ${text}`);
      }
    });

    await authenticateForTests(page);
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.waitForSelector('h1:has-text("Alexandria")');
    await page.click('[data-testid="canisters-tab"]');
    await page.waitForTimeout(5000);

    // Should not have backend errors
    if (errors.length > 0) {
      console.error('Backend errors found:', errors);
      throw new Error(`Backend returned errors: ${errors.join(', ')}`);
    }

    expect(errors.length).toBe(0);
    console.log('✅ No backend errors encountered');
  });
});
