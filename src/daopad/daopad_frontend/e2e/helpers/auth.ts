import { Page } from '@playwright/test';

/**
 * Handle Internet Identity authentication
 *
 * Strategy: Use delegated identity stored in localStorage
 * This avoids complex II flow in tests
 */
export async function authenticateForTests(page: Page) {
  await page.goto('/');

  const authFile = '.auth/user.json';
  let storageState;

  try {
    storageState = require(`../../${authFile}`);
  } catch (error) {
    throw new Error(
      `Authentication file not found at ${authFile}. ` +
      `Please run 'npm run test:e2e:setup' to create it first.`
    );
  }

  await page.context().addCookies(storageState.cookies);
  await page.evaluate((localStorage) => {
    for (const [key, value] of Object.entries(localStorage)) {
      window.localStorage.setItem(key, value);
    }
  }, storageState.localStorage);

  await page.goto('/');
  await page.waitForSelector('[data-testid="user-menu"]', { timeout: 10000 });
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
