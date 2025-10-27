import { Page } from '@playwright/test';
import { existsSync } from 'node:fs';

/**
 * Handle Internet Identity authentication for E2E tests
 *
 * Auth is loaded from .auth/user.json via playwright.config.ts storageState
 * This just does any additional setup needed per test
 */
export async function authenticateForTests(page: Page) {
  // Check if real auth exists
  if (existsSync('.auth/user.json')) {
    console.log('✅ Authentication loaded from storageState');
    return;
  }

  // For CI/testing, skip actual auth
  console.log('⚠️  Using mock authentication for tests');
  // Tests will run without real II auth
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
