import { Page } from '@playwright/test';

/**
 * Handle Internet Identity authentication for E2E tests
 *
 * Auth is loaded from .auth/user.json via playwright.config.ts storageState
 * This just does any additional setup needed per test
 */
export async function authenticateForTests(page: Page) {
  // Auth already loaded from storageState - nothing needed here
  // Tests will navigate where they need to go
  console.log('✅ Authentication loaded from storageState');
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
