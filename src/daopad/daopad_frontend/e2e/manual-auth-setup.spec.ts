import { test } from '@playwright/test';

/**
 * One-time manual authentication setup
 *
 * This test opens a browser, navigates to the app, and waits for you to:
 * 1. Click "Connect Wallet"
 * 2. Login with Internet Identity
 * 3. Wait for auth to complete
 *
 * Then it saves your auth state to .auth/user.json for use by other tests.
 */
test('manual auth setup', async ({ page, context }) => {
  test.setTimeout(300000); // 5 minutes for manual login
  console.log('🔐 Opening browser for manual authentication...');
  console.log('');
  console.log('Instructions:');
  console.log('1. Browser will open to the DAOPad app');
  console.log('2. Click "Connect Wallet"');
  console.log('3. Login with your Internet Identity');
  console.log('4. Wait for the dashboard to load');
  console.log('5. Auth will be saved automatically');
  console.log('');

  // Navigate to the app
  await page.goto('/app');

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  console.log('✅ Page loaded. Please login with Internet Identity...');
  console.log('   (Waiting up to 3 minutes for you to complete login)');

  // Wait for user to complete authentication (look for Logout button which appears when logged in)
  try {
    // Wait for EITHER the Logout button (already logged in) OR the Connect Wallet button
    await Promise.race([
      page.waitForSelector('text=Logout', { timeout: 180000 }),
      page.waitForSelector('text=Connect Wallet', { timeout: 180000 })
    ]);

    // Check if we see the Connect Wallet button (not logged in yet)
    const connectButton = await page.locator('text=Connect Wallet').isVisible();

    if (connectButton) {
      console.log('⚠️  Seeing Connect Wallet button. Please click it and login with Internet Identity.');
      console.log('   (Browser should remain open, waiting for you to complete login...)');

      // Wait for auth to complete (Logout button should appear)
      await page.waitForSelector('text=Logout', {
        timeout: 180000
      });
    }

    console.log('✅ Authentication detected!');
    console.log('   Now navigating to ALEX DAO page to complete auth setup...');

    // Navigate to a specific DAO page to ensure full auth state is established
    await page.goto('/app/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.waitForLoadState('networkidle');

    // Wait a bit for any async auth initialization
    await page.waitForTimeout(5000);

    console.log('✅ DAO page loaded. Saving auth state...');

    // Save authentication state (now includes full delegation state)
    await context.storageState({ path: '.auth/user.json' });

    console.log('');
    console.log('🎉 Authentication saved to .auth/user.json');
    console.log('');
    console.log('You can now run the E2E tests:');
    console.log('  npx playwright test');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Timeout waiting for authentication.');
    console.error('   Please try again and complete the login within 3 minutes.');
    console.error('');
    throw error;
  }
});
