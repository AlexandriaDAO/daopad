import { test, expect } from '@playwright/test';

const BASE_URL = 'https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io';
const ALEX_TOKEN_ID = 'ysy5f-2qaaa-aaaap-qkmmq-cai';

test.describe('DAO Header & Navigation', () => {

  test('should display real token name instead of canister ID prefix', async ({ page }) => {
    // Navigate to ALEX DAO page
    await page.goto(`${BASE_URL}/dao/${ALEX_TOKEN_ID}`);

    // Wait for header to load
    const heading = page.locator('h1');
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Get heading text and verify it shows real token name
    const headingText = await heading.textContent();

    // Should NOT contain the old "YSY5F" prefix behavior
    expect(headingText).not.toContain('YSY5F');

    // Should contain actual token name (ALEX or Alexandria)
    expect(headingText).toMatch(/ALEX|Alexandria/i);

    // Canister ID should still be visible somewhere (but not as title)
    await expect(page.getByText(ALEX_TOKEN_ID)).toBeVisible();
  });

  test('should show all navigation tabs', async ({ page }) => {
    // Navigate to DAO page
    await page.goto(`${BASE_URL}/dao/${ALEX_TOKEN_ID}`);

    // Verify core navigation tabs are visible (Settings merged into Overview)
    await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Agreement' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Treasury' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Activity' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Canisters' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Invoices' })).toBeVisible();
  });

  test('should highlight active tab', async ({ page }) => {
    // Navigate to Treasury tab
    await page.goto(`${BASE_URL}/dao/${ALEX_TOKEN_ID}/treasury`);

    // Treasury tab should have active styling (gold border)
    const treasuryTab = page.getByRole('link', { name: 'Treasury' });
    await expect(treasuryTab).toHaveClass(/border-executive-gold/);

    // Navigate to Activity tab
    await page.goto(`${BASE_URL}/dao/${ALEX_TOKEN_ID}/activity`);

    // Activity tab should have active styling
    const activityTab = page.getByRole('link', { name: 'Activity' });
    await expect(activityTab).toHaveClass(/border-executive-gold/);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/dao/${ALEX_TOKEN_ID}`);

    // Verify Overview tab is visible (first tab, always visible)
    const overviewTab = page.getByRole('link', { name: 'Overview' });
    await expect(overviewTab).toBeVisible();

    // Check if we can scroll to last tab (Invoices)
    const invoicesTab = page.getByRole('link', { name: 'Invoices' });
    await invoicesTab.scrollIntoViewIfNeeded();
    await expect(invoicesTab).toBeVisible();
  });
});
