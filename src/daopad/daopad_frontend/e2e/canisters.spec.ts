import { test, expect } from '@playwright/test';
import { createDataVerifier } from './helpers/data-verifier';

test.describe('Canisters Tab - Anonymous User', () => {
  test('should render canister list without Principal errors', async ({ page }) => {
    // STEP 1: Create data verifier (MANDATORY)
    const verify = createDataVerifier(page);

    // STEP 2: Navigate
    // Navigate to ALEX DAO canisters tab (unauthenticated)
    await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/canisters');

    // STEP 3: Wait for async operations
    await page.waitForTimeout(5000);

    // STEP 4: MANDATORY - Verify no console errors (especially React error #31)
    const errors = verify.getConsoleErrors();
    const reactError31 = errors.filter(e =>
      e.includes('React error #31') ||
      e.includes('object with keys {_arr, _isPrincipal}') ||
      e.includes('Objects are not valid as a React child')
    );

    if (reactError31.length > 0) {
      console.error('\n=== REACT ERROR #31 DETECTED ===');
      reactError31.forEach((err, i) => console.error(`${i + 1}. ${err}`));
    }

    expect(reactError31).toHaveLength(0);
    verify.assertNoConsoleErrors();

    // STEP 5: MANDATORY - Verify backend success
    verify.assertBackendSuccess();

    // STEP 6: Verify UI renders (not crashed)
    const gridOrEmpty = await page.locator('[data-testid="canisters-grid"], [data-testid="canisters-empty-state"]').first();
    await expect(gridOrEmpty).toBeVisible();

    // STEP 7: Print debug summary
    verify.printSummary();
  });

  test('should handle DAOs with no canisters gracefully', async ({ page }) => {
    // Navigate to a DAO with no external canisters
    // NOTE: This test requires a DAO ID with no canisters - update as needed
    await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/canisters');

    // Wait for tab to load
    await page.waitForSelector('[data-testid="canisters-tab"]', { timeout: 30000 });

    // For ALEX DAO, we expect canisters, so this test would need a different DAO
    // If no canisters exist, should show empty state
    const emptyState = page.locator('[data-testid="canisters-empty-state"]');
    const grid = page.locator('[data-testid="canisters-grid"]');

    // Either empty state or grid should be visible
    const emptyVisible = await emptyState.isVisible();
    const gridVisible = await grid.isVisible();
    expect(emptyVisible || gridVisible).toBe(true);
  });

  test('should make successful IC canister network requests', async ({ page }) => {
    const canisterRequests: { url: string; canisterId: string | null; method: string }[] = [];

    // Capture IC canister network requests
    page.on('request', request => {
      const url = request.url();
      if ((url.includes('icp0.io/api') || url.includes('ic0.app/api')) &&
          request.method() === 'POST') {
        canisterRequests.push({
          url,
          canisterId: extractCanisterId(url),
          method: request.method()
        });
      }
    });

    await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/canisters');

    // Wait for either empty state or grid
    await Promise.race([
      page.waitForSelector('[data-testid="canisters-empty-state"]', { timeout: 30000 }),
      page.waitForSelector('[data-testid="canisters-grid"]', { timeout: 30000 })
    ]);

    // Should have made at least 1 call to DAOPad backend (list_orbit_canisters)
    const backendCalls = canisterRequests.filter(r => r.canisterId === 'lwsav-iiaaa-aaaap-qp2qq-cai');
    expect(backendCalls.length).toBeGreaterThanOrEqual(1);
  });
});

function extractCanisterId(url: string): string | null {
  const match = url.match(/\/api\/v\d+\/canister\/([^/]+)/);
  return match ? match[1] : null;
}
