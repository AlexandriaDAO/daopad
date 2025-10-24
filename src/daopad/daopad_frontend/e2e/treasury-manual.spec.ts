import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';

/**
 * Manual treasury test - run in --headed mode
 * You login manually, then test runs
 */
test.describe('Treasury Manual Test (Login Required)', () => {
  test('complete treasury flow with manual login', async ({ page }) => {
    test.setTimeout(600000); // 10 minutes

    // Check if we have auth or should skip
    const hasAuth = existsSync('.auth/user.json');
    if (!hasAuth && !process.env.CI) {
      test.skip();
      return;
    }

    console.log('');
    console.log('==========================================');
    console.log('🔐 MANUAL LOGIN REQUIRED');
    console.log('==========================================');
    console.log('');
    console.log('Browser will open. Please:');
    console.log('1. Click "Connect with Internet Identity"');
    console.log('2. Complete II login');
    console.log('3. Wait for ALEX token to load');
    console.log('4. Test will automatically continue');
    console.log('');
    console.log('Browser will stay open during entire test.');
    console.log('==========================================');
    console.log('');

    // Enable debug mode via localStorage before page loads
    await page.addInitScript(() => {
      localStorage.setItem('DEBUG_MODE', 'true');
    });

    // Capture all console
    page.on('console', (msg) => {
      console.log(`[Browser ${msg.type()}]:`, msg.text());
    });

    // Capture network
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('lwsav-iiaaa-aaaap-qp2qq-cai') || url.includes('list_orbit_accounts')) {
        console.log(`[Network] ${response.status()} ${url}`);
      }
    });

    // Navigate to app
    await page.goto('/app');
    console.log('✅ Page loaded. Please login now...');

    // Wait for EITHER connect button or logout button
    await Promise.race([
      page.waitForSelector('text=Logout', { timeout: 300000 }),
      page.waitForSelector('text=Connect', { timeout: 5000 }).catch(() => null)
    ]);

    const isLoggedIn = await page.locator('text=Logout').isVisible();

    if (!isLoggedIn) {
      console.log('⚠️  Not logged in. Waiting for you to click Connect and login...');

      // Wait for logout button (appears after successful login)
      await page.waitForSelector('text=Logout', { timeout: 300000 });
    }

    console.log('✅ Logged in! Waiting for DAO to load...');

    // Wait for page to settle
    await page.waitForTimeout(5000);

    // Check for treasury tab
    console.log('🔍 Looking for treasury tab...');
    const tabVisible = await page.locator('[data-testid="treasury-tab"]').isVisible({ timeout: 30000 }).catch(() => false);

    if (!tabVisible) {
      console.log('❌ Treasury tab not found! Taking screenshot...');
      await page.screenshot({ path: 'test-results/treasury-manual-notab.png', fullPage: true });

      // Show what's actually on the page
      const html = await page.content();
      console.log('Page content (first 500 chars):', html.substring(0, 500));

      throw new Error('Treasury tab not found after login');
    }

    console.log('✅ Treasury tab found! Clicking it...');
    await page.click('[data-testid="treasury-tab"]');

    console.log('⏳ Waiting for treasury data to load...');
    await page.waitForTimeout(10000);

    // Check for accounts
    const accounts = await page.$$('[data-testid="treasury-account"]');
    console.log(`✅ Found ${accounts.length} treasury accounts`);

    expect(accounts.length).toBeGreaterThan(0);

    console.log('');
    console.log('==========================================');
    console.log('✅ TEST PASSED!');
    console.log(`   Treasury loaded with ${accounts.length} accounts`);
    console.log('==========================================');
    console.log('');

    // Take success screenshot
    await page.screenshot({ path: 'test-results/treasury-manual-success.png', fullPage: true });
  });
});
