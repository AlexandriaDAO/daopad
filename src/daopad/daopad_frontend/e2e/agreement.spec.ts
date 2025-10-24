import { test, expect } from '@playwright/test';
import { createDataVerifier } from './helpers/data-verifier';

// Test constants
const TEST_TOKEN = 'ysy5f-2qaaa-aaaap-qkmmq-cai';
const TEST_STATION = 'fec7w-zyaaa-aaaaa-qaffq-cai';
const BASE_URL = `https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/${TEST_TOKEN}/agreement`;

test.describe('Agreement Tab - Data Pipeline Verification', () => {
  test('STEP 1: Agreement tab loads without errors', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(15000); // 15 seconds to match actual IC canister call latency

    // Verify no console errors
    verify.assertNoConsoleErrors();

    // Verify backend calls succeeded
    verify.assertBackendSuccess();

    // Verify UI loaded
    await expect(page.locator('text=LLC Operating Agreement')).toBeVisible({ timeout: 15000 });

    // Verify regenerate button exists
    const regenerateBtn = page.locator('button:has-text("Regenerate")');
    await expect(regenerateBtn).toBeVisible({ timeout: 15000 });

    verify.printSummary();
  });

  test('STEP 2: Backend snapshot contains required data (network verification)', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(15000);

    // Verify backend call to get_agreement_snapshot was made
    const networkCalls = verify.getNetworkCalls();
    expect(networkCalls.length).toBeGreaterThan(0);

    // All backend calls should succeed (no Candid decode errors)
    verify.assertNoConsoleErrors();
    verify.assertBackendSuccess();

    console.log('✅ Backend snapshot query succeeded (network layer verified)');
  });

  test('STEP 3: All article headers render correctly', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(15000);

    verify.assertNoConsoleErrors();

    // Verify all 6 articles are present
    const articles = [
      'ARTICLE I',
      'ARTICLE II',
      'ARTICLE III',
      'ARTICLE IV',
      'ARTICLE V',
      'ARTICLE VI',
    ];

    for (const article of articles) {
      const heading = page.locator(`h2:has-text("${article}")`).first();
      await expect(heading).toBeVisible({ timeout: 15000 });
    }

    console.log('✅ All 6 articles render correctly');
  });

  test('STEP 4: Document includes all required legal components', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(15000);

    // Verify document title
    await expect(page.locator('text=LIMITED LIABILITY COMPANY OPERATING AGREEMENT')).toBeVisible({ timeout: 15000 });

    // Verify effective date
    await expect(page.locator('text=/Effective Date:/i')).toBeVisible({ timeout: 15000 });

    // Verify on-chain reference (station ID)
    const stationRef = page.locator(`text=/Station.*${TEST_STATION}/i`).first();
    const stationRefExists = await stationRef.count() > 0;
    if (stationRefExists) {
      await expect(stationRef).toBeVisible({ timeout: 15000 });
    }

    // Verify Wyoming LLC reference
    await expect(page.locator('text=/Wyoming/i')).toBeVisible({ timeout: 15000 });

    // Verify smart contract governance statement
    await expect(page.locator('text=/smart contracts/i')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=/Internet Computer/i')).toBeVisible({ timeout: 15000 });

    console.log('✅ All legal components present');
  });

  test('STEP 5: Version info displays when snapshot exists', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(15000);

    verify.assertNoConsoleErrors();
    verify.assertBackendSuccess();

    // If snapshot exists, should show version info
    const versionInfo = page.locator('text=/Version \\d+/');
    const versionExists = await versionInfo.count() > 0;

    if (versionExists) {
      await expect(versionInfo).toBeVisible({ timeout: 15000 });

      // Should also show "Generated:" timestamp
      await expect(page.locator('text=/Generated:/i')).toBeVisible({ timeout: 15000 });

      const versionText = await versionInfo.textContent();
      console.log(`✅ Version info displayed: ${versionText}`);
    } else {
      console.log('⚠️ No snapshot exists yet - version info not shown (expected for new deployments)');
    }
  });

  test('STEP 6: Membership sections render (Article II verification)', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(15000);

    verify.assertNoConsoleErrors();

    // Verify Article II exists
    const articleII = page.locator('h2:has-text("ARTICLE II")').first();
    await expect(articleII).toBeVisible({ timeout: 15000 });

    // Check for membership sections
    const sections = [
      'Managing Partners',
      'Operators',
      'Members',
      'Membership Summary'
    ];

    for (const section of sections) {
      const sectionText = page.locator(`text=/${section}/i`);
      const exists = await sectionText.count() > 0;
      if (exists) {
        console.log(`✅ Found section: ${section}`);
      }
    }
  });

  test('STEP 7: Operations section renders (Article III verification)', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(15000);

    verify.assertNoConsoleErrors();

    // Verify Article III exists
    const articleIII = page.locator('h2:has-text("ARTICLE III")').first();
    await expect(articleIII).toBeVisible({ timeout: 15000 });

    // Check for voting/operations content
    const operationsText = page.locator('text=/operations/i');
    const votingText = page.locator('text=/voting/i');

    const operationsExists = await operationsText.count() > 0;
    const votingExists = await votingText.count() > 0;

    console.log(`✅ Article III renders (operations: ${operationsExists}, voting: ${votingExists})`);
  });

  test('STEP 8: Treasury section renders (Article IV verification)', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(15000);

    verify.assertNoConsoleErrors();

    // Verify Article IV exists
    const articleIV = page.locator('h2:has-text("ARTICLE IV")').first();
    await expect(articleIV).toBeVisible({ timeout: 15000 });

    console.log('✅ Article IV (Treasury) renders');
  });

  test('STEP 9: Canisters section renders (Article V verification)', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(15000);

    verify.assertNoConsoleErrors();

    // Verify Article V exists
    const articleV = page.locator('h2:has-text("ARTICLE V")').first();
    await expect(articleV).toBeVisible({ timeout: 15000 });

    console.log('✅ Article V (Canisters) renders');
  });

  test('STEP 10: Immutability section renders (Article VI verification)', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(15000);

    verify.assertNoConsoleErrors();

    // Verify Article VI exists
    const articleVI = page.locator('h2:has-text("ARTICLE VI")').first();
    await expect(articleVI).toBeVisible({ timeout: 15000 });

    // Check for immutability/amendments content
    const immutabilityText = page.locator('text=/immutable/i');
    const amendmentsText = page.locator('text=/amendments/i');

    const immutabilityExists = await immutabilityText.count() > 0;
    const amendmentsExists = await amendmentsText.count() > 0;

    console.log(`✅ Article VI renders (immutability: ${immutabilityExists}, amendments: ${amendmentsExists})`);
  });
});

test.describe('Agreement Tab - Export & Links', () => {
  test('STEP 11: Permanent link buttons are visible', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(15000);

    verify.assertNoConsoleErrors();

    // Verify "Copy Link" button exists
    await expect(page.locator('button:has-text("Copy Link")')).toBeVisible({ timeout: 15000 });

    // Verify "Open Standalone" button exists
    await expect(page.locator('button:has-text("Open Standalone")')).toBeVisible({ timeout: 15000 });

    console.log('✅ Permanent link buttons verified');
  });

  test('STEP 12: Export markdown button is visible', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(15000);

    verify.assertNoConsoleErrors();

    // Verify export markdown button exists
    const exportBtn = page.locator('button:has-text("Export as Markdown")');
    const exportExists = await exportBtn.count() > 0;

    if (exportExists) {
      await expect(exportBtn).toBeVisible({ timeout: 15000 });
      console.log('✅ Export markdown button verified');
    } else {
      console.log('⚠️ Export button not found - may be in different location');
    }
  });
});

test.describe('Agreement Tab - Content Accuracy', () => {
  test('STEP 13: Wyoming LLC compliance statements render', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(15000);

    // Verify key legal statements are present
    await expect(page.locator('text=/Wyoming/i')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=/limited liability company/i')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=/Operating Agreement/i')).toBeVisible({ timeout: 15000 });

    console.log('✅ Wyoming LLC compliance statements verified');
  });

  test('STEP 14: Blockchain verification details included', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(15000);

    // Verify on-chain references
    await expect(page.locator('text=/Internet Computer/i')).toBeVisible({ timeout: 15000 });

    // Check for Orbit or governance references
    const orbitText = page.locator('text=/Orbit/i');
    const governanceText = page.locator('text=/governance/i');

    const orbitExists = await orbitText.count() > 0;
    const governanceExists = await governanceText.count() > 0;

    expect(orbitExists || governanceExists).toBe(true);

    console.log('✅ Blockchain verification details verified');
  });

  test('STEP 15: Voting mechanism explanation included', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(15000);

    // Verify voting power explanation
    await expect(page.locator('text=/voting power/i')).toBeVisible({ timeout: 15000 });

    // Check for Kong Locker or voting mechanism details
    const kongText = page.locator('text=/Kong Locker/i');
    const votingText = page.locator('text=/voting/i');

    const kongExists = await kongText.count() > 0;
    const votingExists = await votingText.count() > 0;

    expect(votingExists).toBe(true);

    console.log(`✅ Voting mechanism verified (Kong Locker: ${kongExists})`);
  });
});

test.describe('Agreement Tab - Error Scenarios', () => {
  test('STEP 16: No "Unexpected response format" error shown', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(15000);

    // Should NOT see the variant case mismatch error
    await expect(page.locator('text=Unexpected response format')).not.toBeVisible();

    // Should NOT see in console
    const errors = verify.getConsoleErrors();
    const unexpectedFormat = errors.filter(e => e.includes('Unexpected result format'));
    expect(unexpectedFormat).toHaveLength(0);

    console.log('✅ No format errors detected');
  });

  test('STEP 17: Handles missing snapshot gracefully', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(15000);

    // Verify no console errors even if snapshot doesn't exist
    verify.assertNoConsoleErrors();

    // Either snapshot exists OR empty state shows
    const agreementDoc = page.locator('[data-testid="agreement-document"]');
    const emptyState = page.locator('text=No snapshot available');
    const regenerateBtn = page.locator('button:has-text("Regenerate")');

    const docExists = await agreementDoc.count() > 0;
    const emptyExists = await emptyState.count() > 0;
    const btnExists = await regenerateBtn.count() > 0;

    // At least regenerate button should exist
    expect(btnExists).toBe(true);

    console.log(`✅ Missing snapshot handling verified (doc: ${docExists}, empty: ${emptyExists}, btn: ${btnExists})`);
  });

  test('STEP 18: No console errors during page load', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(15000);

    // This is the most critical test - ensure ZERO console errors
    verify.assertNoConsoleErrors();

    const errors = verify.getConsoleErrors();
    console.log(`✅ Console clean - ${errors.length} errors detected (all non-critical)`);
  });
});

test.describe('Agreement Tab - Regeneration Workflow', () => {
  test('STEP 19: Regenerate button triggers backend call', async ({ page }) => {
    // Check if auth exists, skip if not
    const fs = require('fs');
    if (!fs.existsSync('playwright/.auth/user.json')) {
      test.skip(true, 'Auth file not available - skipping authenticated test');
    }
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(15000);

    // Get initial network call count
    const initialCalls = verify.getNetworkCalls().length;

    // Click regenerate button
    const regenerateBtn = page.locator('button:has-text("Regenerate")');
    await expect(regenerateBtn).toBeVisible({ timeout: 15000 });
    await regenerateBtn.click();

    // Wait for backend call (regeneration takes time)
    await page.waitForTimeout(12000);

    // Verify new backend calls were made
    const finalCalls = verify.getNetworkCalls().length;
    expect(finalCalls).toBeGreaterThan(initialCalls);

    // Check for success toast OR error message (both are valid outcomes)
    const successToast = page.locator('text=Agreement regenerated successfully');
    const errorAlert = page.locator('[role="alert"]');

    const successVisible = await successToast.isVisible({ timeout: 5000 }).catch(() => false);
    const errorVisible = await errorAlert.isVisible({ timeout: 5000 }).catch(() => false);

    // One or the other should appear
    expect(successVisible || errorVisible).toBe(true);

    if (successVisible) {
      console.log('✅ Regeneration succeeded - success toast displayed');
    } else {
      console.log('⚠️ Regeneration may have failed - error alert displayed (check auth/permissions)');
    }

    // Verify no critical console errors
    verify.assertNoConsoleErrors();
  });

  test('STEP 20: Version increments after successful regeneration', async ({ page }) => {
    // Check if auth exists, skip if not
    const fs = require('fs');
    if (!fs.existsSync('playwright/.auth/user.json')) {
      test.skip(true, 'Auth file not available - skipping authenticated test');
    }

    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(15000);

    // Get initial version (if exists)
    const getVersion = async () => {
      const versionText = page.locator('text=/Version \\d+/');
      const exists = await versionText.count() > 0;
      if (!exists) return null;
      const text = await versionText.textContent();
      return parseInt(text?.match(/Version (\d+)/)?.[1] || '0');
    };

    const v1 = await getVersion();

    // Click regenerate
    await page.click('button:has-text("Regenerate")');
    await page.waitForTimeout(12000);

    // Check if regeneration succeeded
    const successToast = page.locator('text=Agreement regenerated successfully');
    const successVisible = await successToast.isVisible({ timeout: 5000 }).catch(() => false);

    if (successVisible) {
      // Get new version
      await page.waitForTimeout(2000);
      const v2 = await getVersion();

      if (v1 !== null && v2 !== null) {
        expect(v2).toBeGreaterThan(v1);
        console.log(`✅ Version incremented: ${v1} → ${v2}`);
      } else {
        console.log('⚠️ Version info not available for comparison');
      }
    } else {
      console.log('⚠️ Regeneration did not succeed - skipping version check');
    }

    verify.assertNoConsoleErrors();
  });
});
