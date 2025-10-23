import { test, expect } from '@playwright/test';

test('debug: what actually loads on /app', async ({ page }) => {
  console.log('🔍 Navigating to /app...');

  // Capture ALL console messages
  page.on('console', (msg) => {
    console.log(`[Browser ${msg.type()}]:`, msg.text());
  });

  // Capture ALL network requests
  page.on('response', async (response) => {
    console.log(`[Network] ${response.status()} ${response.url()}`);
  });

  await page.goto('/app', { waitUntil: 'networkidle', timeout: 60000 });

  // Wait a bit
  await page.waitForTimeout(5000);

  // Check what's actually on the page
  const html = await page.content();
  console.log('\n=== PAGE HTML (first 1000 chars) ===');
  console.log(html.substring(0, 1000));

  // Check for specific elements
  const hasHeader = await page.locator('h1:has-text("DAOPad")').count();
  const hasConnectButton = await page.locator('text=Connect').count();
  const hasTokenTabs = await page.locator('[data-testid="treasury-tab"]').count();
  const hasLogoutButton = await page.locator('text=Logout').count();

  console.log('\n=== ELEMENT CHECK ===');
  console.log(`DAOPad header: ${hasHeader}`);
  console.log(`Connect button: ${hasConnectButton}`);
  console.log(`Logout button: ${hasLogoutButton}`);
  console.log(`Treasury tab: ${hasTokenTabs}`);

  // Take screenshot
  await page.screenshot({ path: 'test-results/debug-page-load.png', fullPage: true });
  console.log('\n📸 Screenshot saved to test-results/debug-page-load.png');

  // This test always passes - it's just for debugging
  expect(hasHeader).toBeGreaterThanOrEqual(0);
});
