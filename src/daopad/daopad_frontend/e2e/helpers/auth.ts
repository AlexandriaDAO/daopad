import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Handle Internet Identity authentication
 *
 * Auth is auto-loaded by playwright.config.ts storageState
 * This helper just navigates to /app and optionally verifies auth
 */
export async function authenticateForTests(page: Page) {
  // Check if .auth/user.json exists before navigating
  const authFilePath = path.join(__dirname, '../..', '.auth/user.json');

  if (!fs.existsSync(authFilePath)) {
    throw new Error(
      '\n❌ Authentication not configured!\n\n' +
      'Please run the authentication setup first:\n' +
      '  npx playwright test e2e/manual-auth-setup.spec.ts --headed\n\n' +
      'Or use the convenience script:\n' +
      '  ./setup-auth.sh\n\n' +
      'See PLAYWRIGHT_AUTH_SETUP.md for details.'
    );
  }

  // Auth already loaded by Playwright - just navigate
  await page.goto('/app', { waitUntil: 'networkidle' });

  // Verify auth was actually loaded
  const authPresent = await page.evaluate(() => {
    // Check for any IC-related localStorage keys
    const keys = Object.keys(localStorage);
    return keys.some(k => k.includes('identity') || k.includes('ic-') || k.includes('delegation'));
  });

  if (!authPresent) {
    console.warn('⚠️  Warning: No IC identity found in localStorage');
    console.warn('    Session may have expired. Try re-running setup:');
    console.warn('    npx playwright test e2e/manual-auth-setup.spec.ts --headed');
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
