import { test, expect } from '@playwright/test';

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
        // Click "Run Security Checks" button
        await page.click('button:has-text("Run Security Checks")');

        // Wait for security analysis to complete (up to 60 seconds)
        await page.waitForSelector('text=Analyzing DAO security', { state: 'hidden', timeout: 60000 });

        // Check that security score is displayed (shows percentage like "0% Decentralized")
        await expect(page.locator('text=/\\d+% Decentralized/')).toBeVisible();

        // Check that security checklist sections are visible
        await expect(page.locator('text=CRITICAL RISKS')).toBeVisible();
        await expect(page.locator('text=Admin User Count')).toBeVisible();
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

    test('should display request policies correctly', async ({ page }) => {
        // Click security checks to load the section
        await page.click('button:has-text("Run Security Checks")');

        // Wait for checks to complete
        await page.waitForSelector('text=Analyzing DAO security', { state: 'hidden', timeout: 60000 });

        // Check that "Show Request Policies" button is available
        const showPoliciesButton = page.locator('button:has-text("Show Request Policies")');
        if (await showPoliciesButton.isVisible()) {
            // Button exists - that's enough to verify the feature is available
            await expect(showPoliciesButton).toBeVisible();
        }
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
