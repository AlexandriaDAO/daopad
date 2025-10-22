import { Page } from '@playwright/test';

/**
 * Handle Internet Identity authentication
 *
 * Auth is auto-loaded by playwright.config.ts storageState
 * This helper just navigates to /app and optionally verifies auth
 */
export async function authenticateForTests(page: Page) {
  // Auth already loaded by Playwright - just navigate
  await page.goto('/app', { waitUntil: 'networkidle' });

  // Optional: Verify auth was actually loaded
  const authPresent = await page.evaluate(() => {
    // Check for any IC-related localStorage keys
    const keys = Object.keys(localStorage);
    return keys.some(k => k.includes('identity') || k.includes('ic-') || k.includes('delegation'));
  });

  if (!authPresent) {
    console.warn('⚠️  Warning: No IC identity found in localStorage');
    // Don't throw - maybe auth works differently or page needs more time
  }

  // Wait a bit for any async auth initialization
  await page.waitForTimeout(2000);
}

/**
 * Setup authentication (run once manually)
 *
 * Usage:
 *   npm run test:e2e:setup
 *
 * This opens browser, lets you login with II, saves state
 */
export async function setupAuthentication(page: Page) {
  await page.goto('/');

  await page.click('text=Connect Wallet');

  console.log('Please login with Internet Identity...');
  await page.waitForSelector('[data-testid="user-menu"]', {
    timeout: 120000
  });

  await page.context().storageState({ path: '.auth/user.json' });
  console.log('Authentication saved to .auth/user.json');
}
