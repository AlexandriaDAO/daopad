import { Page, expect } from '@playwright/test';

/**
 * Data Verifier - Enforces Three-Layer Verification for Playwright Tests
 *
 * MANDATORY: Use this helper in EVERY test to verify:
 * 1. Network Layer: Backend calls succeed
 * 2. Console Layer: No errors (Candid decode, auth, etc.)
 * 3. UI Layer: Elements reflect actual data
 *
 * See: PLAYWRIGHT_TESTING_GUIDE.md for full documentation
 */
export function createDataVerifier(page: Page) {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const networkCalls: Array<{
    url: string;
    ok: boolean;
    status: number;
    timestamp: number;
  }> = [];

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('[Browser Console Error]:', msg.text());
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(msg.text());
    }
  });

  // Capture backend network calls
  page.on('response', async (response) => {
    if (response.url().includes('lwsav-iiaaa-aaaap-qp2qq-cai') ||
        response.url().includes('icp0.io/api') ||
        response.url().includes('ic0.app/api')) {
      networkCalls.push({
        url: response.url(),
        ok: response.ok(),
        status: response.status(),
        timestamp: Date.now()
      });

      if (!response.ok()) {
        console.error('[Network Error]:', response.status(), response.url());
      }
    }
  });

  return {
    /**
     * Assert no critical console errors
     * MANDATORY: Call this in every test after page actions
     *
     * Catches:
     * - Candid decode errors ("Invalid record")
     * - Type errors (TypeError, ReferenceError, SyntaxError)
     * - Auth errors ("not authorized")
     */
    assertNoConsoleErrors() {
      const criticalErrors = consoleErrors.filter(e =>
        e.includes('Invalid record') ||
        e.includes('Candid') ||
        e.includes('decode') ||
        e.includes('not authorized') ||
        e.includes('TypeError') ||
        e.includes('ReferenceError') ||
        e.includes('SyntaxError')
      );

      if (criticalErrors.length > 0) {
        console.error('\n=== CRITICAL CONSOLE ERRORS ===');
        criticalErrors.forEach((err, i) => {
          console.error(`${i + 1}. ${err}`);
        });
      }

      expect(criticalErrors).toHaveLength(0);
    },

    /**
     * Assert backend calls succeeded
     * MANDATORY: Call this in every test after page actions
     *
     * Verifies:
     * - At least one backend call was made
     * - All backend calls returned 2xx status
     */
    assertBackendSuccess() {
      expect(networkCalls.length).toBeGreaterThan(0);

      const failedCalls = networkCalls.filter(c => !c.ok);
      if (failedCalls.length > 0) {
        console.error('\n=== FAILED BACKEND CALLS ===');
        failedCalls.forEach((call, i) => {
          console.error(`${i + 1}. ${call.status} ${call.url}`);
        });
      }

      expect(failedCalls).toHaveLength(0);
    },

    /**
     * Get all captured network calls
     */
    getNetworkCalls() {
      return networkCalls;
    },

    /**
     * Get all console errors
     */
    getConsoleErrors() {
      return consoleErrors;
    },

    /**
     * Get all console warnings
     */
    getConsoleWarnings() {
      return consoleWarnings;
    },

    /**
     * Print debug summary (useful for test development)
     */
    printSummary() {
      console.log('\n=== DATA VERIFICATION SUMMARY ===');
      console.log(`Network Calls: ${networkCalls.length}`);
      console.log(`  - Successful: ${networkCalls.filter(c => c.ok).length}`);
      console.log(`  - Failed: ${networkCalls.filter(c => !c.ok).length}`);
      console.log(`Console Errors: ${consoleErrors.length}`);
      if (consoleErrors.length > 0) {
        consoleErrors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
      }
      console.log(`Console Warnings: ${consoleWarnings.length}`);
    }
  };
}
