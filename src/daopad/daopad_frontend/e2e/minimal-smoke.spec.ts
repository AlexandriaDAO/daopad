import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Verify Basics', () => {
  test('can load app homepage', async ({ page }) => {
    await page.goto('/app');
    await page.waitForLoadState('networkidle');

    // Screenshot for debugging
    await page.screenshot({ path: 'test-results/smoke-homepage.png', fullPage: true });

    // Basic checks
    const html = await page.content();
    const title = await page.title();

    console.log('Page loaded:', {
      htmlLength: html.length,
      title: title,
      url: page.url()
    });

    expect(html.length).toBeGreaterThan(100);
  });

  test('auth state is loaded', async ({ page, context }) => {
    // Check context has cookies/storage from auth file
    const cookies = await context.cookies();

    await page.goto('/app');
    const storage = await page.evaluate(() => ({
      localStorage: Object.keys(localStorage),
      sessionStorage: Object.keys(sessionStorage)
    }));

    console.log('Auth state:', {
      cookies: cookies.length,
      localStorageKeys: storage.localStorage.length
    });

    // Should have SOME auth data
    const hasAuth = cookies.length > 0 || storage.localStorage.length > 0;
    expect(hasAuth).toBe(true);
  });

  test('can navigate to DAO page', async ({ page }) => {
    await page.goto('/app/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/smoke-dao-page.png', fullPage: true });

    // Don't assert specific content - just verify page loads
    const html = await page.content();
    expect(html.length).toBeGreaterThan(100);

    // Log what we see for debugging
    const bodyText = await page.locator('body').textContent();
    console.log('DAO page text preview:', bodyText?.substring(0, 300));
  });
});
