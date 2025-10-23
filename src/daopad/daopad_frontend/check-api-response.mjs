#!/usr/bin/env node
import { chromium } from '@playwright/test';

async function checkAPIResponse() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let canisterAPIResponse = null;

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('lwsav-iiaaa-aaaap-qp2qq-cai') && response.request().method() === 'POST') {
      try {
        const body = await response.text();
        const requestPostData = response.request().postData();

        // Try to detect if this is the list_orbit_canisters call
        if (requestPostData && requestPostData.includes('list_orbit_canisters')) {
          console.log('\n🎯 FOUND list_orbit_canisters CALL');
          console.log('Status:', response.status());
          console.log('Response body (first 1000 chars):\n', body.substring(0, 1000));

          canisterAPIResponse = {
            status: response.status(),
            body: body
          };
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  });

  await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/canisters');
  await page.waitForTimeout(10000);

  if (!canisterAPIResponse) {
    console.log('\n❌ Could not capture list_orbit_canisters API response');
  }

  await browser.close();
}

checkAPIResponse().catch(err => {
  console.error('Check failed:', err);
  process.exit(1);
});
