import { test, expect } from '@playwright/test';
import { createDataVerifier } from './helpers/data-verifier';

test.describe('Agreement Tab - Anonymous User Access', () => {
  test('should load agreement tab without errors', async ({ page }) => {
    // MANDATORY: Set up data verification
    const verify = createDataVerifier(page);

    // Navigate to Agreement tab
    await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/agreement');

    // Wait for page load and API calls
    await page.waitForTimeout(5000);

    // MANDATORY: Verify no console errors
    verify.assertNoConsoleErrors();

    // MANDATORY: Verify backend calls succeeded
    verify.assertBackendSuccess();

    // Verify UI loaded
    await expect(page.locator('text=LLC Operating Agreement')).toBeVisible();

    // Check for either snapshot OR empty state (both valid)
    const agreementDoc = page.locator('[data-testid="agreement-document"]');
    const emptyState = page.locator('text=No snapshot available');
    const regenerateBtn = page.locator('button:has-text("Regenerate")');

    // Regenerate button should always be visible
    await expect(regenerateBtn).toBeVisible();

    const docVisible = await agreementDoc.isVisible();
    const emptyVisible = await emptyState.isVisible();

    // One of them should be visible
    expect(docVisible || emptyVisible).toBe(true);

    // Print summary
    verify.printSummary();
  });

  test('should NOT show "Unexpected response format" error', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/agreement');
    await page.waitForTimeout(5000);

    // Should NOT see the variant case mismatch error
    await expect(page.locator('text=Unexpected response format')).not.toBeVisible();

    // Should NOT see in console
    const errors = verify.getConsoleErrors();
    const unexpectedFormat = errors.filter(e => e.includes('Unexpected result format'));
    expect(unexpectedFormat).toHaveLength(0);
  });

  test('should display version info when snapshot exists', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/agreement');
    await page.waitForTimeout(5000);

    verify.assertNoConsoleErrors();
    verify.assertBackendSuccess();

    // If snapshot exists, should show version info
    const versionInfo = page.locator('text=/Version \\d+/');
    const versionExists = await versionInfo.count() > 0;

    if (versionExists) {
      await expect(versionInfo).toBeVisible();
      // Should also show "Generated:" timestamp
      await expect(page.locator('text=/Generated:/i')).toBeVisible();
    }
  });

  test('should show permanent link when data loaded', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/agreement');
    await page.waitForTimeout(5000);

    verify.assertNoConsoleErrors();

    // Should show "Copy Link" button
    await expect(page.locator('button:has-text("Copy Link")')).toBeVisible();

    // Should show "Open Standalone" button
    await expect(page.locator('button:has-text("Open Standalone")')).toBeVisible();
  });
});
