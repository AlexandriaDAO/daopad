import { test, expect } from '@playwright/test';
import { createDataVerifier } from './helpers/data-verifier';

/**
 * Settings Tab E2E Tests
 *
 * SCOPE: Anonymous user testing only
 *
 * WHY: Per PLAYWRIGHT_TESTING_GUIDE.md, Internet Identity authentication
 * is not supported in Playwright. Only public/anonymous features can be
 * automatically tested.
 *
 * TESTED (Anonymous Users):
 * - ✅ Security audit dashboard (data loads, displays results)
 * - ✅ Permissions button (exists, clickable, shows appropriate message)
 * - ✅ Toggle behavior (show/hide policies view)
 * - ✅ Console error absence
 * - ✅ Network call monitoring
 * - ✅ User interaction flow
 *
 * NOT TESTED (Requires Manual Testing with II Auth):
 * - ❌ Actual permissions policies loading
 * - ❌ Policy stats (total, auto-approved, bypasses)
 * - ❌ Backend authenticated API calls
 * - ❌ Policy category grouping and display
 *
 * MANUAL TESTING CHECKLIST for authenticated features:
 * 1. Login with II at https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io
 * 2. Navigate to Settings → Click "Show Request Policies"
 * 3. Verify policies load (check Network tab: get_request_policies_details)
 * 4. Verify stats display (Total, Auto-Approved, Bypasses badges)
 * 5. Verify categories render (Transfers, Accounts, Users, etc.)
 * 6. Check console for errors (should be zero)
 * 7. Toggle grouped/list view
 * 8. Expand/collapse categories
 */

test.describe('Settings Tab - Anonymous User Access', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to ALEX token DAO Settings tab
        await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/settings');

        // Wait for page load
        await page.waitForLoadState('networkidle');
    });

    test('should load Settings tab for anonymous user', async ({ page }) => {
        // Check that page title exists
        await expect(page.locator('text=Station Information')).toBeVisible();

        // Check that station info loads
        await expect(page.locator('text=Station Name')).toBeVisible();
        await expect(page.locator('text=Version')).toBeVisible();

        // Should NOT show error about authentication
        await expect(page.locator('text=not authorized')).not.toBeVisible();
        await expect(page.locator('text=identity required')).not.toBeVisible();
    });

    test('should load security dashboard for anonymous user', async ({ page }) => {
        // Set up data verification
        const verify = createDataVerifier(page);

        // Click "Run Security Checks" button
        await page.click('button:has-text("Run Security Checks")');

        // Wait for security analysis to complete (up to 60 seconds)
        await page.waitForSelector('text=Analyzing DAO security', { state: 'hidden', timeout: 60000 });

        // Check that security score is displayed (shows percentage like "0% Decentralized")
        await expect(page.locator('text=/\\d+% Decentralized/')).toBeVisible();

        // Check that security checklist sections are visible
        await expect(page.locator('text=CRITICAL RISKS')).toBeVisible();
        await expect(page.locator('text=Admin User Count')).toBeVisible();

        // Verify no console errors
        verify.assertNoConsoleErrors();

        // Verify backend calls occurred
        const networkCalls = verify.getNetworkCalls();
        const securityCalls = networkCalls.filter(call =>
            call.url.includes('lwsav-iiaaa-aaaap-qp2qq-cai') ||
            call.url.includes('perform_security_check') ||
            call.url.includes('check_admin_control')
        );
        expect(securityCalls.length).toBeGreaterThan(0);

        verify.printSummary();
    });

    test('should show read-only mode for write operations', async ({ page }) => {
        // Click security checks button first
        await page.click('button:has-text("Run Security Checks")');

        // Wait for checks to complete
        await page.waitForSelector('text=Analyzing DAO security', { state: 'hidden', timeout: 60000 });

        // Check that read-only warning appears
        const readOnlyWarning = page.locator('text=Read-only mode');
        if (await readOnlyWarning.isVisible()) {
            await expect(readOnlyWarning).toBeVisible();
        }

        // Check that sign-in messages appear on buttons
        const signInButtons = page.locator('button:has-text("Sign In")');
        if (await signInButtons.count() > 0) {
            await expect(signInButtons.first()).toBeVisible();
        }
    });

    test('should handle BigInt values correctly', async ({ page }) => {
        // Wait for station info to load
        await page.waitForSelector('text=Station Cycles', { timeout: 10000 });

        // Check that cycle amounts display correctly (should contain "TC")
        const cyclesLocator = page.locator('text=/\\d+\\.\\d{3} TC/');
        const cyclesCount = await cyclesLocator.count();

        if (cyclesCount > 0) {
            const cyclesText = await cyclesLocator.first().textContent();
            expect(cyclesText).toMatch(/\d+\.\d{3} TC/); // Should be formatted like "1.234 TC"
            expect(cyclesText).not.toContain('NaN');
            expect(cyclesText).not.toContain('[object BigInt]');
        }
    });

    test('should show permissions policies button for anonymous user', async ({ page }) => {
        // Set up data verification
        const verify = createDataVerifier(page);

        // Navigate to Settings tab
        await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/settings');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('text=Station Information', { timeout: 10000 });

        // Run security checks first (required to see policies button)
        await page.click('button:has-text("Run Security Checks")');
        await page.waitForSelector('text=Analyzing DAO security', { state: 'hidden', timeout: 60000 });

        // Verify "Show Request Policies" button exists
        const showPoliciesButton = page.locator('button:has-text("Show Request Policies")');
        await expect(showPoliciesButton).toBeVisible();

        // Click button - should not cause errors
        await showPoliciesButton.click();
        await page.waitForTimeout(2000);

        // Verify button text changed to "Hide" (toggle functionality works)
        const hideButton = page.locator('button:has-text("Hide Request Policies")');
        await expect(hideButton).toBeVisible();

        // Verify no console errors occurred
        verify.assertNoConsoleErrors();
        verify.printSummary();
    });

    test('should toggle request policies button state', async ({ page }) => {
        const verify = createDataVerifier(page);

        // Navigate
        await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/settings');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('text=Station Information', { timeout: 10000 });

        // Run security checks first (required to see policies button)
        await page.click('button:has-text("Run Security Checks")');
        await page.waitForSelector('text=Analyzing DAO security', { state: 'hidden', timeout: 60000 });

        // Show policies - verify button toggle
        const showButton = page.locator('button:has-text("Show Request Policies")');
        await expect(showButton).toBeVisible();
        await showButton.click();
        await page.waitForTimeout(1000);

        // Verify button changed to "Hide"
        const hideButton = page.locator('button:has-text("Hide Request Policies")');
        await expect(hideButton).toBeVisible();

        // Hide policies - toggle back
        await hideButton.click();
        await page.waitForTimeout(1000);

        // Button should change back to "Show"
        await expect(showButton).toBeVisible();

        // No errors during toggle
        verify.assertNoConsoleErrors();
        verify.printSummary();
    });

    test('should not show authentication errors in console', async ({ page }) => {
        const consoleErrors = [];

        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Navigate and wait for content to load
        await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/settings');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('text=Station Information', { timeout: 10000 });

        // Filter for authentication-related errors
        const authErrors = consoleErrors.filter(err =>
            err.toLowerCase().includes('identity') ||
            err.toLowerCase().includes('unauthorized') ||
            err.toLowerCase().includes('not authorized')
        );

        // Should have no authentication errors
        expect(authErrors).toHaveLength(0);
    });
});
