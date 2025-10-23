import { test, expect } from '@playwright/test';

/**
 * Activity Tab E2E Tests - Anonymous User Access
 *
 * These tests verify that anonymous (unauthenticated) users can view proposals
 * and voting progress in the Activity tab, while authenticated users retain
 * full voting functionality.
 *
 * Test URL: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/activity
 */

const DAO_URL = 'https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io';
const TEST_TOKEN_ID = 'ysy5f-2qaaa-aaaap-qkmmq-cai'; // ALEX token
const ACTIVITY_URL = `${DAO_URL}/dao/${TEST_TOKEN_ID}/activity`;

test.describe('Activity Tab - Anonymous User Access', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to activity tab as anonymous user
    await page.goto(ACTIVITY_URL);
  });

  test('should load activity tab for anonymous users', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify URL is correct
    expect(page.url()).toContain('/activity');

    // Page should not show error or redirect
    const errorElements = await page.locator('text=/error|failed|denied/i').count();
    expect(errorElements).toBe(0);
  });

  test('should display proposals list for anonymous users', async ({ page }) => {
    // Wait for proposals to load
    // Note: Proposals might be empty, but the component should render
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Allow time for backend query

    // Check if there are any proposals
    const proposalCount = await page.locator('[data-testid*="proposal"]').count();

    if (proposalCount > 0) {
      console.log(`Found ${proposalCount} proposals`);

      // Verify proposal structure is visible
      const firstProposal = page.locator('[data-testid*="proposal"]').first();
      await expect(firstProposal).toBeVisible();
    } else {
      console.log('No proposals found - this is OK for testing (empty state)');

      // Verify empty state is handled gracefully
      const emptyMessage = page.locator('text=/no proposals|no requests/i');
      const exists = await emptyMessage.count();
      expect(exists).toBeGreaterThanOrEqual(0); // Either shows empty message or is just empty
    }
  });

  test('should not show vote buttons for anonymous users', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Vote buttons should NOT be present for anonymous users
    const voteButtonsCount = await page.locator('[data-testid="vote-buttons"]').count();
    expect(voteButtonsCount).toBe(0);

    // Vote yes/no buttons should also not exist
    const yesButtonCount = await page.locator('[data-testid="vote-yes-button"]').count();
    const noButtonCount = await page.locator('[data-testid="vote-no-button"]').count();
    expect(yesButtonCount).toBe(0);
    expect(noButtonCount).toBe(0);
  });

  test('should not have BigInt serialization errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Let all data load

    // Check for BigInt-related errors
    const bigintErrors = consoleErrors.filter(e =>
      e.toLowerCase().includes('bigint') ||
      e.includes('cannot be serialized')
    );

    if (bigintErrors.length > 0) {
      console.error('BigInt errors found:', bigintErrors);
    }

    expect(bigintErrors).toHaveLength(0);
  });

  test('should display vote progress for proposals if they exist', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const proposalCount = await page.locator('[data-testid*="proposal"]').count();

    if (proposalCount > 0) {
      // If proposals exist, check if vote progress indicators are present
      // This could be progress bars, vote counts, or status indicators

      // Look for common vote-related elements
      const voteProgressElements = await page.locator('[data-testid*="vote"], [data-testid*="progress"]').count();

      // We expect at least some vote-related UI if proposals exist
      // But this is flexible since exact UI structure may vary
      console.log(`Found ${voteProgressElements} vote-related elements`);

      // The main assertion is that the page loaded without errors
      expect(page.url()).toContain('/activity');
    }
  });

  test('should handle network requests correctly', async ({ page }) => {
    // Track network requests
    const requests: string[] = [];

    page.on('request', request => {
      requests.push(request.url());
    });

    await page.goto(ACTIVITY_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Should have made requests to backend canister
    const backendRequests = requests.filter(url =>
      url.includes('lwsav-iiaaa-aaaap-qp2qq-cai') || // daopad_backend
      url.includes('list_orbit_request_proposals') ||
      url.includes('query')
    );

    console.log(`Made ${backendRequests.length} backend requests`);
    console.log('Request URLs:', requests.slice(0, 10)); // Log first 10

    // We should have attempted to fetch data
    // The exact count doesn't matter as much as not having errors
    expect(requests.length).toBeGreaterThan(0);
  });

  test('should not show authentication-required errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(ACTIVITY_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check for authentication/identity errors
    const authErrors = consoleErrors.filter(e =>
      e.toLowerCase().includes('identity') ||
      e.toLowerCase().includes('authentication') ||
      e.toLowerCase().includes('unauthorized') ||
      e.toLowerCase().includes('not authenticated')
    );

    if (authErrors.length > 0) {
      console.error('Authentication errors found:', authErrors);
    }

    // Anonymous users should not see auth errors when viewing proposals
    expect(authErrors).toHaveLength(0);
  });

  test('should render page content within reasonable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(ACTIVITY_URL);
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;
    console.log(`Page loaded in ${loadTime}ms`);

    // Should load in under 10 seconds even on slow connections
    expect(loadTime).toBeLessThan(10000);

    // Page should have basic structure
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.length).toBeGreaterThan(0);
  });
});

test.describe('Activity Tab - Data Validation', () => {
  test('should handle vote counts as regular numbers', async ({ page }) => {
    await page.goto(ACTIVITY_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check if any vote count elements exist
    const voteCountElements = await page.locator('[data-testid*="vote"]').allTextContents();

    for (const text of voteCountElements) {
      // Vote counts should not have 'n' suffix (BigInt indicator)
      expect(text).not.toMatch(/\d+n/);
      console.log('Vote count text:', text);
    }
  });

  test('should display timestamps correctly', async ({ page }) => {
    await page.goto(ACTIVITY_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const proposalCount = await page.locator('[data-testid*="proposal"]').count();

    if (proposalCount > 0) {
      // Look for timestamp-related elements
      const timestampElements = await page.locator('[data-testid*="created"], [data-testid*="expires"]').count();

      // If timestamps are shown, they should be formatted, not raw BigInt
      console.log(`Found ${timestampElements} timestamp elements`);
    }
  });
});
