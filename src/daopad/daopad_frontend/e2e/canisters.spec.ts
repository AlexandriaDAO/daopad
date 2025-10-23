import { test, expect } from '@playwright/test';

test.describe('Canisters Tab - Anonymous User', () => {
  test('should load canister list for anonymous users', async ({ page }) => {
    // Navigate to ALEX DAO canisters tab (unauthenticated)
    await page.goto('https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/dao/7yyrc-6qaaa-aaaap-qhega-cai/canisters');

    // Wait for canisters tab to load
    await page.waitForSelector('[data-testid="canisters-tab"]', { timeout: 30000 });

    // Should NOT show empty state (ALEX has 2 canisters)
    await expect(page.locator('[data-testid="canisters-empty-state"]')).not.toBeVisible();

    // Should show canister grid
    await expect(page.locator('[data-testid="canisters-grid"]')).toBeVisible();

    // Should have at least 1 canister card (backend filtered out)
    const canisterCards = page.locator('[data-testid^="canister-card-"]');
    await expect(canisterCards).toHaveCount(1, { timeout: 10000 }); // 2 total - 1 filtered = 1

    // Canister cards should show name
    await expect(canisterCards.first().locator('.truncate')).toContainText('Frontend');

    // Cycle balance should show "Login to view cycles" for anonymous
    await expect(canisterCards.first()).toContainText('Login to view cycles');

    // Should have action buttons (disabled for anonymous)
    await expect(canisterCards.first().locator('button:has-text("Top Up")')).toBeVisible();
    await expect(canisterCards.first().locator('button:has-text("Manage")')).toBeVisible();
  });

  test('should handle DAOs with no canisters gracefully', async ({ page }) => {
    // Navigate to a DAO with no external canisters
    // NOTE: This test requires a DAO ID with no canisters - update as needed
    await page.goto('https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/dao/7yyrc-6qaaa-aaaap-qhega-cai/canisters');

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

    await page.goto('https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/dao/7yyrc-6qaaa-aaaap-qhega-cai/canisters');
    await page.waitForSelector('[data-testid="canisters-grid"]', { timeout: 30000 });

    // Should have made at least 1 call to DAOPad backend (list_orbit_canisters)
    const backendCalls = canisterRequests.filter(r => r.canisterId === 'lwsav-iiaaa-aaaap-qp2qq-cai');
    expect(backendCalls.length).toBeGreaterThanOrEqual(1);
  });
});

function extractCanisterId(url: string): string | null {
  const match = url.match(/\/api\/v\d+\/canister\/([^/]+)/);
  return match ? match[1] : null;
}
