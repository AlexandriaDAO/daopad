#!/usr/bin/env node
import { chromium } from '@playwright/test';

async function manualVerification() {
  console.log('=== MANUAL BROWSER VERIFICATION ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
    console.log(`[Browser Console ${msg.type().toUpperCase()}]:`, msg.text());
  });

  // Capture network requests
  const networkRequests = [];
  page.on('response', async response => {
    const url = response.url();

    if (url.includes('lwsav-iiaaa-aaaap-qp2qq-cai') ||
        url.includes('icp0.io/api') ||
        url.includes('ic0.app/api')) {

      let responseBody = null;
      try {
        responseBody = await response.text();
      } catch (e) {
        responseBody = '[Binary or unavailable]';
      }

      const req = {
        url: url,
        status: response.status(),
        ok: response.ok(),
        method: response.request().method(),
        responsePreview: responseBody.substring(0, 500)
      };

      networkRequests.push(req);

      console.log(`\n[Network] ${req.method} ${req.status} ${url}`);
      if (!req.ok) {
        console.log(`  ❌ FAILED: ${responseBody.substring(0, 200)}`);
      }
    }
  });

  // Navigate to canisters page
  console.log('\n📍 Navigating to: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/canisters\n');

  await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/canisters');

  // Wait for page to settle
  console.log('\n⏳ Waiting 8 seconds for API calls to complete...\n');
  await page.waitForTimeout(8000);

  // Check what's visible
  const emptyState = await page.locator('[data-testid="canisters-empty-state"]').isVisible();
  const grid = await page.locator('[data-testid="canisters-grid"]').isVisible();
  const loading = await page.locator('.animate-pulse').count();

  console.log('\n=== UI STATE ===');
  console.log(`Empty state visible: ${emptyState}`);
  console.log(`Grid visible: ${grid}`);
  console.log(`Loading indicators: ${loading}`);

  // Analyze console errors
  console.log('\n=== CONSOLE ERRORS ANALYSIS ===');
  const errors = consoleMessages.filter(m => m.type === 'error');
  const candidErrors = errors.filter(e =>
    e.text.includes('Invalid record') ||
    e.text.includes('Candid') ||
    e.text.includes('decode')
  );

  if (candidErrors.length > 0) {
    console.log('❌ CANDID DECODE ERRORS FOUND:');
    candidErrors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.text}`);
    });
  } else {
    console.log('✅ No Candid decode errors');
  }

  if (errors.length > 0 && candidErrors.length === 0) {
    console.log('\n⚠️ OTHER CONSOLE ERRORS:');
    errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.text}`);
    });
  }

  // Analyze network calls
  console.log('\n=== NETWORK CALLS ANALYSIS ===');
  const backendCalls = networkRequests.filter(r => r.url.includes('lwsav-iiaaa-aaaap-qp2qq-cai'));

  if (backendCalls.length === 0) {
    console.log('❌ NO backend calls made');
  } else {
    console.log(`✅ ${backendCalls.length} backend call(s) made`);

    const successful = backendCalls.filter(r => r.ok);
    const failed = backendCalls.filter(r => !r.ok);

    console.log(`  - Successful (200 OK): ${successful.length}`);
    console.log(`  - Failed: ${failed.length}`);

    if (failed.length > 0) {
      console.log('\n❌ FAILED REQUESTS:');
      failed.forEach((req, i) => {
        console.log(`  ${i + 1}. ${req.method} ${req.status} ${req.url}`);
        console.log(`     Response: ${req.responsePreview}`);
      });
    }
  }

  // Final verdict
  console.log('\n=== VERDICT ===');

  if (candidErrors.length > 0) {
    console.log('❌ FIX FAILED: Candid decode errors still present');
  } else if (backendCalls.length === 0) {
    console.log('❌ FIX INCOMPLETE: No backend calls made');
  } else if (backendCalls.some(r => !r.ok)) {
    console.log('❌ FIX INCOMPLETE: Backend calls failing');
  } else if (!emptyState && !grid) {
    console.log('⚠️ UNCERTAIN: Backend succeeds but UI stuck loading');
  } else {
    console.log('✅ FIX APPEARS SUCCESSFUL: No Candid errors, backend calls succeed, UI renders');
  }

  await browser.close();
}

manualVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
