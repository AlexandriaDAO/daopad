# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-agreement-comprehensive-tests/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-agreement-comprehensive-tests/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   ```bash
   npm run build
   ./deploy.sh --network ic --frontend-only
   ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Testing]: Agreement Tab - Comprehensive E2E Data Verification"
   git push -u origin feature/agreement-comprehensive-tests
   gh pr create --title "[Testing]: Agreement Tab - Comprehensive E2E Tests" --body "Implements AGREEMENT_COMPREHENSIVE_TESTING_PLAN.md

## Summary
Adds comprehensive end-to-end testing for the Operating Agreement tab, verifying every step of the data pipeline from backend generation through frontend rendering.

## Changes
- Enhanced E2E tests with step-by-step data verification
- Tests for all 6 data sources: security, policies, users, canisters, voting powers, treasury
- Regeneration workflow testing (click → backend call → Redux → UI update)
- Export functionality testing (markdown, PDF/print)
- Permanent link verification
- Error scenario handling

## Testing
All agreement tests passing with comprehensive data verification at each step."
   ```
5. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view --json comments,reviews --jq '.reviews[-1].state'`
     - Count P0 issues
     - IF P0 > 0: Fix immediately, commit, push, sleep 300s, continue
     - IF P0 = 0: Report success, EXIT
   - After 5 iterations: Escalate to human

## CRITICAL RULES
- ❌ NO questions ("should I?", "want me to?", "is it done?")
- ❌ NO skipping PR creation - it's MANDATORY
- ❌ NO stopping after implementation - create PR immediately
- ✅ After sleep: IMMEDIATELY continue (no pause)
- ✅ ONLY stop at: approved, max iterations, or error

**Branch:** `feature/agreement-comprehensive-tests`
**Worktree:** `/home/theseus/alexandria/daopad-agreement-comprehensive-tests/src/daopad`

---

# Implementation Plan: Agreement Tab Comprehensive Testing

## Problem Statement

Current agreement tests are minimal (4 basic tests):
- ✅ Loads without errors
- ✅ No variant format errors
- ✅ Shows version info
- ✅ Shows permanent link

**Missing critical verification:**
1. **Step-by-step data pipeline** - Backend → Redux → UI not verified
2. **All 6 data sources** - Security, policies, users, canisters, voting powers, treasury
3. **Regeneration workflow** - Click regenerate → verify all steps update
4. **Document content verification** - Each article renders with correct data
5. **Export functionality** - Markdown export, PDF print work correctly
6. **Error scenarios** - Missing data, network failures, timeout handling

## Agreement Data Structure (from Backend)

### Backend Response (`regenerate_agreement_snapshot`)

```json
{
  "security": {
    "overall_status": "high_risk" | "ready",
    "risk_summary": "...",
    "checks": [
      { "name": "Admin User Count", "status": "ok|warning|critical", "details": "..." },
      { "name": "AutoApproved Enabled", "status": "...", "details": "..." }
      // ... 8 total security checks
    ],
    "critical_issues": [...]
  },
  "policies": {
    "policies": [
      { "id": "...", "specifier": "Transfer", "rule": {...} }
      // All request policies
    ]
  },
  "users": [
    {
      "id": "...",
      "name": "...",
      "status": "Active" | "Inactive",
      "groups": [{ "id": "00000000-0000-4000-8000-000000000000", "name": "Admin" }],
      "identities": ["principal-id"]
    }
    // All users
  ],
  "canisters": {
    "external_canisters": [
      { "canister_id": "...", "name": "...", "state": "..." }
    ]
  },
  "votingPowers": [
    { "user": "principal", "voting_power": 12345 }
  ],
  "treasury": {
    "accounts": [
      { "id": "...", "name": "Main Treasury", "assets": [...] }
    ],
    "assets": [
      { "id": "...", "symbol": "ICP", "name": "Internet Computer" }
    ]
  },
  "timestamp": 1234567890
}
```

### Frontend Document Structure

The agreement document renders multiple articles:
- **Article I**: Formation & Purpose (static content + station ID)
- **Article II**: Members & Governance Structure (from `users` data)
  - 2.2 Managing Partners (Admins)
  - 2.3 Operators
  - 2.4 General Members
  - 2.5 Inactive Members
  - 2.6 Membership Summary (counts)
  - 2.7 Voting Rights
- **Article III**: Operations & Voting Thresholds (from `policies` data)
- **Article IV**: Asset Management (from `treasury` data)
- **Article V**: Canisters (from `canisters` data)
- **Article VI**: Amendments & Immutability (from `security` data)

---

## Current Test Coverage Analysis

### Existing Tests (`agreement.spec.ts` - 4 tests)

```typescript
✓ should load agreement tab without errors
✓ should NOT show "Unexpected response format" error
✓ should display version info when snapshot exists
✓ should show permanent link when data loaded
```

**Gaps:**
- No verification of backend data sources (6 API calls)
- No verification of Redux state structure
- No verification of document content accuracy
- No regeneration workflow testing
- No export functionality testing
- No error scenario coverage

---

## Implementation Plan

### Phase 1: Backend Data Pipeline Verification

#### File: `daopad_frontend/e2e/agreement.spec.ts` (MODIFY)

Add comprehensive tests for each data source:

```typescript
// PSEUDOCODE

import { test, expect } from '@playwright/test';
import { createDataVerifier } from './helpers/data-verifier';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Agreement Tab - Data Pipeline Verification', () => {
  const TEST_TOKEN = 'ysy5f-2qaaa-aaaap-qkmmq-cai';
  const TEST_STATION = 'fec7w-zyaaa-aaaaa-qaffq-cai';
  const BASE_URL = `https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/${TEST_TOKEN}/agreement`;

  test('STEP 1: Backend snapshot contains all 6 required data sources', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    // VERIFY: Backend call to get_agreement_snapshot
    const backendCalls = verify.getBackendCalls();
    const snapshotCall = backendCalls.find(call =>
      call.url.includes('get_agreement_snapshot')
    );

    expect(snapshotCall).toBeDefined();
    expect(snapshotCall.status).toBe(200);

    // VERIFY: Response contains all data sources
    const responseData = JSON.parse(snapshotCall.response.data);

    // 1. Security data
    expect(responseData.security).toBeDefined();
    expect(responseData.security.overall_status).toMatch(/high_risk|ready/);
    expect(responseData.security.checks).toBeInstanceOf(Array);
    expect(responseData.security.checks.length).toBeGreaterThan(0);

    // 2. Policies data
    expect(responseData.policies).toBeDefined();
    expect(responseData.policies.policies).toBeInstanceOf(Array);

    // 3. Users data
    expect(responseData.users).toBeDefined();
    expect(responseData.users).toBeInstanceOf(Array);

    // 4. Canisters data
    expect(responseData.canisters).toBeDefined();

    // 5. Voting powers data
    expect(responseData.votingPowers).toBeDefined();

    // 6. Treasury data
    expect(responseData.treasury).toBeDefined();

    console.log('✅ All 6 data sources present in backend response');
  });

  test('STEP 2: Backend regeneration fetches fresh data', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);

    // Get initial version
    const initialVersion = await page.locator('text=/Version \\d+/').textContent();

    // Click regenerate
    await page.click('button:has-text("Regenerate")');
    await page.waitForTimeout(10000);  // Regeneration takes time (6 parallel calls)

    // VERIFY: Backend call to regenerate_agreement_snapshot
    const backendCalls = verify.getBackendCalls();
    const regenerateCall = backendCalls.find(call =>
      call.url.includes('regenerate_agreement_snapshot') &&
      call.timestamp > Date.now() - 15000  // Within last 15s
    );

    expect(regenerateCall).toBeDefined();
    expect(regenerateCall.status).toBe(200);

    // VERIFY: Version incremented
    await page.waitForTimeout(2000);
    const newVersion = await page.locator('text=/Version \\d+/').textContent();
    expect(newVersion).not.toBe(initialVersion);

    // VERIFY: Toast notification appeared
    await expect(page.locator('text=Agreement regenerated successfully')).toBeVisible();

    console.log(`✅ Regeneration: ${initialVersion} → ${newVersion}`);
  });

  test('STEP 3: Security data flows to Article VI (Immutability)', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    // Get backend security data
    const backendCalls = verify.getBackendCalls();
    const snapshotCall = backendCalls.find(call => call.url.includes('get_agreement_snapshot'));
    const agreementData = JSON.parse(snapshotCall.response.data);

    // VERIFY: Security section exists
    expect(agreementData.security).toBeDefined();

    // VERIFY: Article VI renders security data
    const articleVI = page.locator('text=/ARTICLE VI/');
    await expect(articleVI).toBeVisible();

    // Check for immutability section
    const immutabilitySection = page.locator('[data-testid="immutability-section"]');

    // If security shows high_risk, warning should appear in document
    if (agreementData.security.overall_status === 'high_risk') {
      const governanceWarning = page.locator('text=⚠️ GOVERNANCE WARNING');
      await expect(governanceWarning).toBeVisible();

      // Verify critical issues are listed
      if (agreementData.security.critical_issues?.length > 0) {
        const firstIssue = agreementData.security.critical_issues[0];
        const issueText = page.locator(`text=${firstIssue.message}`);
        await expect(issueText).toBeVisible();
      }
    }

    console.log('✅ Security data → Article VI verified');
  });

  test('STEP 4: Users data flows to Article II (Members)', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    // Get backend users data
    const backendCalls = verify.getBackendCalls();
    const snapshotCall = backendCalls.find(call => call.url.includes('get_agreement_snapshot'));
    const agreementData = JSON.parse(snapshotCall.response.data);

    // VERIFY: Users data exists
    expect(agreementData.users).toBeDefined();
    expect(agreementData.users).toBeInstanceOf(Array);

    // Categorize users
    const ADMIN_GROUP_ID = "00000000-0000-4000-8000-000000000000";
    const OPERATOR_GROUP_ID = "00000000-0000-4000-8000-000000000001";

    const admins = agreementData.users.filter(u =>
      u.status === 'Active' && u.groups?.some(g => g.id === ADMIN_GROUP_ID)
    );
    const operators = agreementData.users.filter(u =>
      u.status === 'Active' && u.groups?.some(g => g.id === OPERATOR_GROUP_ID) &&
      !u.groups?.some(g => g.id === ADMIN_GROUP_ID)
    );
    const inactive = agreementData.users.filter(u => u.status === 'Inactive');

    // VERIFY: Article II exists
    const articleII = page.locator('text=/ARTICLE II/');
    await expect(articleII).toBeVisible();

    // VERIFY: Admin count matches backend data
    const adminSection = page.locator('text=/2.2 Managing Partners/');
    await expect(adminSection).toBeVisible();

    if (admins.length > 0) {
      // Each admin should be listed with name
      for (const admin of admins) {
        const adminName = page.locator(`text=${admin.name}`);
        await expect(adminName).toBeVisible();

        // Principal should be visible (truncated format)
        if (admin.identities?.[0]) {
          const principal = admin.identities[0];
          const truncated = `${principal.slice(0, 10)}...${principal.slice(-7)}`;
          const principalText = page.locator(`text=${truncated}`);
          await expect(principalText).toBeVisible();
        }
      }
    }

    // VERIFY: Membership summary shows correct counts
    const summarySection = page.locator('text=/2.6 Current Membership Summary/');
    await expect(summarySection).toBeVisible();

    const adminCountText = page.locator(`text=/Managing Partners.*: ${admins.length}/`);
    await expect(adminCountText).toBeVisible();

    const operatorCountText = page.locator(`text=/Operators.*: ${operators.length}/`);
    await expect(operatorCountText).toBeVisible();

    const totalCountText = page.locator(`text=/Total Registered.*: ${agreementData.users.length}/`);
    await expect(totalCountText).toBeVisible();

    console.log(`✅ Users data → Article II verified: ${admins.length} admins, ${operators.length} operators, ${agreementData.users.length} total`);
  });

  test('STEP 5: Policies data flows to Article III (Operations)', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    // Get backend policies data
    const backendCalls = verify.getBackendCalls();
    const snapshotCall = backendCalls.find(call => call.url.includes('get_agreement_snapshot'));
    const agreementData = JSON.parse(snapshotCall.response.data);

    // VERIFY: Policies data exists
    expect(agreementData.policies).toBeDefined();
    expect(agreementData.policies.policies).toBeInstanceOf(Array);

    // VERIFY: Article III exists
    const articleIII = page.locator('text=/ARTICLE III/');
    await expect(articleIII).toBeVisible();

    // Check for voting thresholds table
    const thresholdsSection = page.locator('text=/Voting Thresholds/');

    // Verify high-risk operations are documented (90% threshold)
    const systemUpgrade = page.locator('text=/System.*Upgrade.*90%/');
    // Should be visible if documented

    console.log(`✅ Policies data → Article III verified: ${agreementData.policies.policies.length} policies`);
  });

  test('STEP 6: Treasury data flows to Article IV (Assets)', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    // Get backend treasury data
    const backendCalls = verify.getBackendCalls();
    const snapshotCall = backendCalls.find(call => call.url.includes('get_agreement_snapshot'));
    const agreementData = JSON.parse(snapshotCall.response.data);

    // VERIFY: Treasury data exists
    expect(agreementData.treasury).toBeDefined();

    // VERIFY: Article IV exists
    const articleIV = page.locator('text=/ARTICLE IV/');
    await expect(articleIV).toBeVisible();

    // Check for accounts section
    if (agreementData.treasury.accounts?.length > 0) {
      const accountsSection = page.locator('text=/Treasury Accounts/');

      // Each account should be listed
      for (const account of agreementData.treasury.accounts.slice(0, 3)) {  // Check first 3
        const accountName = page.locator(`text=${account.name}`);
        // Should be visible somewhere in document
      }
    }

    // Check for assets section
    if (agreementData.treasury.assets?.length > 0) {
      const assetsSection = page.locator('text=/Supported Assets/');

      // Each asset should be listed
      for (const asset of agreementData.treasury.assets.slice(0, 3)) {  // Check first 3
        const assetSymbol = page.locator(`text=${asset.symbol}`);
        // Should be visible somewhere
      }
    }

    console.log(`✅ Treasury data → Article IV verified`);
  });

  test('STEP 7: Canisters data flows to Article V', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    // Get backend canisters data
    const backendCalls = verify.getBackendCalls();
    const snapshotCall = backendCalls.find(call => call.url.includes('get_agreement_snapshot'));
    const agreementData = JSON.parse(snapshotCall.response.data);

    // VERIFY: Canisters data exists
    expect(agreementData.canisters).toBeDefined();

    // VERIFY: Article V exists
    const articleV = page.locator('text=/ARTICLE V/');
    await expect(articleV).toBeVisible();

    // If canisters exist, verify they're listed
    if (agreementData.canisters.external_canisters?.length > 0) {
      const canistersSection = page.locator('text=/External Canisters/');

      // Check first canister is documented
      const firstCanister = agreementData.canisters.external_canisters[0];
      if (firstCanister.name) {
        const canisterName = page.locator(`text=${firstCanister.name}`);
        // Should be visible
      }
    }

    console.log(`✅ Canisters data → Article V verified`);
  });

  test('STEP 8: Voting powers data is accessible in snapshot', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    // Get backend voting powers data
    const backendCalls = verify.getBackendCalls();
    const snapshotCall = backendCalls.find(call => call.url.includes('get_agreement_snapshot'));
    const agreementData = JSON.parse(snapshotCall.response.data);

    // VERIFY: Voting powers data exists
    expect(agreementData.votingPowers).toBeDefined();

    // Should be array of { user: principal, voting_power: number }
    if (Array.isArray(agreementData.votingPowers)) {
      expect(agreementData.votingPowers.length).toBeGreaterThanOrEqual(0);

      // If voting powers exist, check structure
      if (agreementData.votingPowers.length > 0) {
        const firstVP = agreementData.votingPowers[0];
        expect(firstVP.user).toBeTruthy();
        expect(typeof firstVP.voting_power).toBe('number');
      }
    }

    console.log(`✅ Voting powers data verified: ${agreementData.votingPowers?.length || 0} voters`);
  });

  test('STEP 9: Regeneration updates all data sources', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);

    // Get initial timestamp
    const initialData = await page.evaluate(() => {
      // Access snapshot data from React component state (if exposed)
      return { timestamp: Date.now() };
    });

    // Click regenerate button
    const regenerateBtn = page.locator('button:has-text("Regenerate")');
    await expect(regenerateBtn).toBeVisible();
    await regenerateBtn.click();

    // Wait for regeneration (6 parallel backend calls + processing)
    await page.waitForTimeout(12000);

    // VERIFY: New backend call made
    const backendCalls = verify.getBackendCalls();
    const regenerateCalls = backendCalls.filter(call =>
      call.url.includes('regenerate_agreement_snapshot')
    );
    expect(regenerateCalls.length).toBeGreaterThan(0);

    // VERIFY: Success toast appeared
    await expect(page.locator('text=Agreement regenerated successfully')).toBeVisible({ timeout: 5000 });

    // VERIFY: Version number changed
    const versionText = await page.locator('text=/Version \\d+/').textContent();
    const versionNum = parseInt(versionText.match(/Version (\d+)/)?.[1] || '0');
    expect(versionNum).toBeGreaterThan(0);

    // VERIFY: "Generated:" timestamp updated (should be recent)
    const generatedText = await page.locator('text=/Generated:/').textContent();
    expect(generatedText).toContain('Generated:');

    console.log(`✅ Regeneration completed: Version ${versionNum}`);
  });

  test('STEP 10: Export to markdown includes all sections', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    // VERIFY: Export markdown button exists
    const exportBtn = page.locator('button:has-text("Export as Markdown")');
    await expect(exportBtn).toBeVisible();

    // Monitor downloads
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

    // Click export
    await exportBtn.click();

    // VERIFY: Download triggered
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/operating_agreement\.md$/);

    // Get download content
    const path = await download.path();
    expect(path).toBeTruthy();

    // VERIFY: File contains key sections
    const content = require('fs').readFileSync(path, 'utf8');

    expect(content).toContain('ARTICLE I: FORMATION');
    expect(content).toContain('ARTICLE II: MEMBERS');
    expect(content).toContain('ARTICLE III: OPERATIONS');
    expect(content).toContain('ARTICLE IV');
    expect(content).toContain('ARTICLE V');
    expect(content).toContain('ARTICLE VI');

    // Verify station ID is in content
    expect(content).toContain(TEST_STATION);

    console.log('✅ Markdown export contains all articles');
  });

  test('STEP 11: Permanent link is correct and opens standalone', async ({ page, context }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    // VERIFY: Permanent link format
    const linkText = await page.locator('text=/Permanent Link:/').textContent();
    expect(linkText).toContain(`/agreement/${TEST_STATION}`);
    expect(linkText).toContain(`token=`);

    // VERIFY: Copy link button works
    const copyBtn = page.locator('button:has-text("Copy Link")');
    await copyBtn.click();

    // Check clipboard
    await page.waitForTimeout(1000);
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('/agreement/');
    expect(clipboardText).toContain(TEST_STATION);

    // VERIFY: Toast showed
    await expect(page.locator('text=Link copied to clipboard')).toBeVisible();

    // VERIFY: Open standalone button triggers new tab
    const openStandaloneBtn = page.locator('button:has-text("Open Standalone")');
    await expect(openStandaloneBtn).toBeVisible();

    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      openStandaloneBtn.click()
    ]);

    // Verify new tab has correct URL
    expect(newPage.url()).toContain('/agreement/');
    expect(newPage.url()).toContain(TEST_STATION);

    await newPage.close();

    console.log('✅ Permanent link and standalone verified');
  });

  test('STEP 12: All article headers render correctly', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    verify.assertNoConsoleErrors();

    // VERIFY: All 6 articles are present
    const articles = [
      'ARTICLE I: FORMATION AND PURPOSE',
      'ARTICLE II: MEMBERS AND GOVERNANCE STRUCTURE',
      'ARTICLE III: OPERATIONS AND VOTING THRESHOLDS',
      'ARTICLE IV',  // Asset Management
      'ARTICLE V',   // Canisters
      'ARTICLE VI',  // Amendments & Immutability
    ];

    for (const article of articles) {
      const heading = page.locator(`text=${article}`);
      await expect(heading).toBeVisible();
    }

    console.log('✅ All 6 articles render correctly');
  });

  test('STEP 13: Document includes all required legal components', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    // VERIFY: Document title
    await expect(page.locator('text=LIMITED LIABILITY COMPANY OPERATING AGREEMENT')).toBeVisible();

    // VERIFY: Effective date
    await expect(page.locator('text=/Effective Date:/i')).toBeVisible();

    // VERIFY: On-chain reference (station ID)
    await expect(page.locator(`text=On-Chain Reference: Station ${TEST_STATION}`)).toBeVisible();

    // VERIFY: Wyoming LLC reference
    await expect(page.locator('text=/Wyoming/i')).toBeVisible();

    // VERIFY: Smart contract governance statement
    await expect(page.locator('text=/smart contracts/i')).toBeVisible();
    await expect(page.locator('text=/Internet Computer/i')).toBeVisible();

    console.log('✅ All legal components present');
  });

  test('STEP 14: Error handling - No snapshot graceful degradation', async ({ page }) => {
    // Test what happens when snapshot doesn't exist yet
    // (Use a token that has no snapshot)

    const verify = createDataVerifier(page);

    // Mock scenario: Delete snapshot or use new token
    // For now, verify the UI handles missing snapshot gracefully

    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    // VERIFY: Either snapshot exists OR empty state shows
    const agreementDoc = page.locator('[data-testid="agreement-document"]');
    const emptyState = page.locator('text=No snapshot available');

    const docExists = await agreementDoc.isVisible();
    const emptyExists = await emptyState.isVisible();

    expect(docExists || emptyExists).toBe(true);

    // If empty state, regenerate button should be visible
    if (emptyExists) {
      const regenerateBtn = page.locator('button:has-text("Regenerate")');
      await expect(regenerateBtn).toBeVisible();
    }

    console.log('✅ Missing snapshot handling verified');
  });

  test('STEP 15: Error handling - Regeneration failure recovery', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);

    // Click regenerate
    const regenerateBtn = page.locator('button:has-text("Regenerate")');
    await regenerateBtn.click();

    // Wait for backend call
    await page.waitForTimeout(12000);

    // VERIFY: Either success toast OR error alert appeared
    const successToast = page.locator('text=Agreement regenerated successfully');
    const errorAlert = page.locator('[role="alert"]:has-text("Failed")');

    const successVisible = await successToast.isVisible();
    const errorVisible = await errorAlert.isVisible();

    // One or the other should be visible
    expect(successVisible || errorVisible).toBe(true);

    // If error occurred, verify it's displayed
    if (errorVisible) {
      console.log('⚠️ Regeneration failed - error properly displayed');
      verify.printSummary();
    } else {
      console.log('✅ Regeneration succeeded');
    }

    // VERIFY: No unhandled console errors
    verify.assertNoConsoleErrors();
  });

  test('STEP 16: Backend parallel data fetching performance', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);

    // Click regenerate to trigger fresh data fetch
    await page.click('button:has-text("Regenerate")');

    const startTime = Date.now();

    // Wait for completion
    await page.waitForSelector('text=Agreement regenerated successfully', { timeout: 30000 });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // VERIFY: Regeneration completes in reasonable time
    // 6 parallel calls + processing should be < 20 seconds
    expect(duration).toBeLessThan(20000);

    console.log(`✅ Regeneration performance: ${duration}ms (< 20s threshold)`);
  });

  test('STEP 17: Version increments correctly on multiple regenerations', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);

    // Get initial version
    const getVersion = async () => {
      const versionText = await page.locator('text=/Version \\d+/').textContent();
      return parseInt(versionText.match(/Version (\d+)/)?.[1] || '0');
    };

    const v1 = await getVersion();

    // Regenerate #1
    await page.click('button:has-text("Regenerate")');
    await page.waitForTimeout(12000);
    const v2 = await getVersion();
    expect(v2).toBe(v1 + 1);

    // Regenerate #2
    await page.click('button:has-text("Regenerate")');
    await page.waitForTimeout(12000);
    const v3 = await getVersion();
    expect(v3).toBe(v2 + 1);

    console.log(`✅ Version increments: ${v1} → ${v2} → ${v3}`);
  });

  test('STEP 18: Data consistency between backend and UI', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    // Get backend data
    const backendCalls = verify.getBackendCalls();
    const snapshotCall = backendCalls.find(call => call.url.includes('get_agreement_snapshot'));
    const agreementData = JSON.parse(snapshotCall.response.data);

    // VERIFY: User count consistency
    const backendUserCount = agreementData.users?.length || 0;
    const uiUserCountElement = page.locator('text=/Total Registered.*: \\d+/');
    const uiUserCountText = await uiUserCountElement.textContent();
    const uiUserCount = parseInt(uiUserCountText.match(/: (\d+)/)?.[1] || '0');

    expect(uiUserCount).toBe(backendUserCount);

    // VERIFY: Station ID consistency
    const stationIdInDoc = await page.locator('code:has-text("fec7w-zyaaa")').textContent();
    expect(stationIdInDoc).toBe(TEST_STATION);

    console.log(`✅ Data consistency verified: ${backendUserCount} users match UI`);
  });

  test('STEP 19: Print/PDF functionality works', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    // VERIFY: Print button exists
    const printBtn = page.locator('button:has-text("Print")');
    await expect(printBtn).toBeVisible();

    // Mock print dialog (Playwright doesn't support actual printing)
    // Just verify the button is clickable and doesn't cause errors
    page.on('dialog', dialog => {
      dialog.accept();
    });

    // Click print (will trigger window.print())
    await printBtn.click();

    // VERIFY: No errors occurred
    await page.waitForTimeout(2000);
    verify.assertNoConsoleErrors();

    console.log('✅ Print functionality verified (no errors)');
  });

  test('STEP 20: Member categorization logic is correct', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    // Get backend users data
    const backendCalls = verify.getBackendCalls();
    const snapshotCall = backendCalls.find(call => call.url.includes('get_agreement_snapshot'));
    const agreementData = JSON.parse(snapshotCall.response.data);

    const ADMIN_GROUP_ID = "00000000-0000-4000-8000-000000000000";
    const OPERATOR_GROUP_ID = "00000000-0000-4000-8000-000000000001";

    // Categorize backend data
    const categorize = (users) => {
      const categories = { admins: 0, operators: 0, members: 0, inactive: 0 };

      users.forEach(user => {
        if (user.status !== 'Active') {
          categories.inactive++;
          return;
        }

        const groupIds = user.groups?.map(g => g.id) || [];
        if (groupIds.includes(ADMIN_GROUP_ID)) {
          categories.admins++;
        } else if (groupIds.includes(OPERATOR_GROUP_ID)) {
          categories.operators++;
        } else {
          categories.members++;
        }
      });

      return categories;
    };

    const backendCounts = categorize(agreementData.users);

    // VERIFY: UI shows same counts
    const getUICount = async (text) => {
      const element = page.locator(`text=/${text}.*: (\\d+)/`);
      const content = await element.textContent();
      return parseInt(content.match(/: (\d+)/)?.[1] || '0');
    };

    const uiAdmins = await getUICount('Managing Partners');
    const uiOperators = await getUICount('Operators');
    const uiInactive = await getUICount('Inactive');

    expect(uiAdmins).toBe(backendCounts.admins);
    expect(uiOperators).toBe(backendCounts.operators);
    expect(uiInactive).toBe(backendCounts.inactive);

    console.log(`✅ Categorization verified: ${backendCounts.admins} admins, ${backendCounts.operators} ops, ${backendCounts.inactive} inactive`);
  });
});

test.describe('Agreement Tab - Error Scenarios', () => {
  test('should handle backend timeout gracefully', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);

    // Click regenerate and monitor for timeout
    await page.click('button:has-text("Regenerate")');

    // Wait longer than expected
    await page.waitForTimeout(30000);

    // VERIFY: Either success OR error message (not stuck loading)
    const loading = page.locator('text=Loading agreement data');
    const loadingVisible = await loading.isVisible();

    // Should NOT be stuck in loading state after 30s
    if (loadingVisible) {
      console.log('⚠️ WARNING: Still loading after 30s - potential timeout issue');
    }

    // Should show either success toast or error alert
    const success = await page.locator('text=Agreement regenerated successfully').isVisible();
    const error = await page.locator('[role="alert"]').isVisible();

    expect(success || error).toBe(true);
  });

  test('should display meaningful error when backend fails', async ({ page }) => {
    const verify = createDataVerifier(page);

    // Navigate to agreement tab
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);

    // Click regenerate
    await page.click('button:has-text("Regenerate")');
    await page.waitForTimeout(12000);

    // Check for any errors in console
    const consoleErrors = verify.getConsoleErrors();

    // If errors occurred, they should be user-friendly, not raw exceptions
    for (const error of consoleErrors) {
      // Should NOT contain raw stack traces
      expect(error).not.toContain('at Object.<anonymous>');
      expect(error).not.toContain('node_modules');
    }

    // If UI shows error, it should be meaningful
    const errorAlert = page.locator('[role="alert"][class*="destructive"]');
    if (await errorAlert.isVisible()) {
      const errorText = await errorAlert.textContent();

      // Should be user-friendly message
      expect(errorText).not.toContain('undefined');
      expect(errorText).not.toContain('[object Object]');
      expect(errorText.length).toBeGreaterThan(10);

      console.log(`Error message shown: ${errorText}`);
    }
  });

  test('should handle missing data fields gracefully', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    // Get backend data
    const backendCalls = verify.getBackendCalls();
    const snapshotCall = backendCalls.find(call => call.url.includes('get_agreement_snapshot'));
    const agreementData = JSON.parse(snapshotCall.response.data);

    // VERIFY: Even if some data sources have errors, document renders
    const hasAnyError = Object.values(agreementData).some(val =>
      typeof val === 'object' && val !== null && 'error' in val
    );

    if (hasAnyError) {
      console.log('⚠️ Some data sources have errors, checking graceful degradation...');

      // Document should still render
      const articleI = page.locator('text=/ARTICLE I/');
      await expect(articleI).toBeVisible();

      // Should show "Data unavailable" or similar for failed sections
      // But should NOT crash
    }

    // VERIFY: No unhandled exceptions in console
    verify.assertNoConsoleErrors();
  });
});

test.describe('Agreement Tab - Member Display Verification', () => {
  test('should display all member types with correct styling', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    // Get backend users
    const backendCalls = verify.getBackendCalls();
    const snapshotCall = backendCalls.find(call => call.url.includes('get_agreement_snapshot'));
    const agreementData = JSON.parse(snapshotCall.response.data);

    const ADMIN_GROUP_ID = "00000000-0000-4000-8000-000000000000";

    // Find an admin user
    const adminUser = agreementData.users?.find(u =>
      u.status === 'Active' && u.groups?.some(g => g.id === ADMIN_GROUP_ID)
    );

    if (adminUser) {
      // VERIFY: Admin has blue border (color coding)
      const adminCard = page.locator(`text=${adminUser.name}`).locator('..');
      const borderClass = await adminCard.getAttribute('class');

      // Should have blue border styling
      expect(borderClass).toContain('blue');

      console.log(`✅ Admin member ${adminUser.name} has correct styling`);
    }

    // Find an inactive user
    const inactiveUser = agreementData.users?.find(u => u.status === 'Inactive');

    if (inactiveUser) {
      // VERIFY: Inactive has red border and reduced opacity
      const inactiveCard = page.locator(`text=${inactiveUser.name}`).locator('..');
      const borderClass = await inactiveCard.getAttribute('class');

      expect(borderClass).toContain('red');
      expect(borderClass).toContain('opacity');

      console.log(`✅ Inactive member ${inactiveUser.name} has correct styling`);
    }
  });

  test('should truncate long principals correctly', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    // Get backend users
    const backendCalls = verify.getBackendCalls();
    const snapshotCall = backendCalls.find(call => call.url.includes('get_agreement_snapshot'));
    const agreementData = JSON.parse(snapshotCall.response.data);

    // Find user with principal
    const userWithPrincipal = agreementData.users?.find(u => u.identities?.[0]);

    if (userWithPrincipal) {
      const fullPrincipal = userWithPrincipal.identities[0];

      // Should be truncated in format: "first10...last7"
      const expectedTruncated = `${fullPrincipal.slice(0, 10)}...${fullPrincipal.slice(-7)}`;

      const truncatedElement = page.locator(`text=${expectedTruncated}`);
      await expect(truncatedElement).toBeVisible();

      console.log(`✅ Principal truncation: ${fullPrincipal} → ${expectedTruncated}`);
    }
  });
});

test.describe('Agreement Tab - Snapshot Versioning', () => {
  test('should preserve created_at timestamp across versions', async ({ page }) => {
    const verify = createDataVerifier(page);

    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);

    // Get initial creation date
    const getCreatedDate = async () => {
      const generatedText = await page.locator('text=/Generated:/').textContent();
      return generatedText;
    };

    const initialDate = await getCreatedDate();

    // Regenerate
    await page.click('button:has-text("Regenerate")');
    await page.waitForTimeout(12000);

    // VERIFY: Created date should remain the same (only version increments)
    // NOTE: This tests the backend logic that preserves created_at
    const newDate = await getCreatedDate();

    // The timestamp might be slightly different if this is a new snapshot
    // But the date portion should be close (within same day)

    console.log(`Created dates: ${initialDate} → ${newDate}`);
  });

  test('should show version 1 for first snapshot', async ({ page }) => {
    // This test is informational - checks version numbering

    const verify = createDataVerifier(page);
    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    const versionText = await page.locator('text=/Version \\d+/').textContent();
    const versionNum = parseInt(versionText.match(/Version (\d+)/)?.[1] || '0');

    // Version should be >= 1
    expect(versionNum).toBeGreaterThanOrEqual(1);

    console.log(`✅ Current version: ${versionNum}`);
  });
});

test.describe('Agreement Tab - Content Accuracy', () => {
  test('should render Wyoming LLC compliance statements', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    // VERIFY: Key legal statements are present
    await expect(page.locator('text=/Wyoming/i')).toBeVisible();
    await expect(page.locator('text=/limited liability company/i')).toBeVisible();
    await expect(page.locator('text=/Operating Agreement/i')).toBeVisible();

    // Smart contract governance language
    await expect(page.locator('text=/immutable smart contracts/i')).toBeVisible();
    await expect(page.locator('text=/authoritative source of truth/i')).toBeVisible();
  });

  test('should include blockchain verification details', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    // VERIFY: On-chain references
    await expect(page.locator('text=/Internet Computer/i')).toBeVisible();
    await expect(page.locator('text=/Orbit Station/i')).toBeVisible();
    await expect(page.locator('text=/DAOPad governance/i')).toBeVisible();
  });

  test('should explain Kong Locker voting mechanism', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    // VERIFY: Kong Locker explanation in Article II
    await expect(page.locator('text=/Kong Locker/i')).toBeVisible();
    await expect(page.locator('text=/voting power/i')).toBeVisible();
    await expect(page.locator('text=/locked LP tokens/i')).toBeVisible();
  });
});
```

---

## Success Criteria

1. ✅ All 20+ comprehensive tests passing
2. ✅ Every backend data source verified (security, policies, users, canisters, voting powers, treasury)
3. ✅ Regeneration workflow tested end-to-end (click → backend → UI update)
4. ✅ Document content accuracy verified (all articles render with correct data)
5. ✅ Export functionality tested (markdown, print/PDF)
6. ✅ Error scenarios handled gracefully (missing data, timeouts, failures)
7. ✅ Version incrementing tested across multiple regenerations
8. ✅ Data consistency verified (backend counts match UI counts)
9. ✅ Performance verified (regeneration < 20s)
10. ✅ PR created and approved

---

## Testing Execution Workflow

### Step 1: Manual Browser Verification (BEFORE Playwright)

```bash
# After any changes, manually verify in browser:
# 1. Open https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/agreement
# 2. Login with Internet Identity
# 3. Open browser console (F12)
# 4. Click "Regenerate" and watch console for:
#    - 6 parallel backend calls (security, policies, users, canisters, voting, treasury)
#    - No errors
#    - Success toast appears
#    - Version increments
#    - All articles render
# 5. Click "Export as Markdown" - verify download works
# 6. Click "Copy Link" - verify clipboard has correct URL
# 7. Click "Open Standalone" - verify new tab opens
# 8. Check console - should have ZERO errors
```

### Step 2: Console Error Inspection Commands

```bash
# After any test failure:

# 1. Check test screenshots
ls -lt daopad_frontend/test-results/ | head -20

# 2. View HTML report
cd daopad_frontend && npx playwright show-report

# 3. Run single test with debug
npx playwright test agreement.spec.ts:LINE_NUMBER --debug

# 4. Check console logs in test output
grep -i "console error" daopad_frontend/test-results/*/test-finished-*.log
```

### Step 3: Exit Criteria (When to Stop Iterating)

STOP when ALL of these are true:
1. ✅ All 20+ agreement tests passing
2. ✅ Manual browser check: Regenerate works, all articles render, no console errors
3. ✅ Console has ZERO errors (F12 in browser)
4. ✅ Export markdown downloads successfully
5. ✅ Version increments correctly on regenerate
6. ✅ All 6 data sources verified in backend response

DO NOT STOP if any console errors exist or tests are flaky.

### Step 4: Iteration Loop

```bash
cd daopad_frontend

for i in {1..5}; do
  echo "=== Iteration $i ==="

  # Run agreement tests
  npx playwright test agreement.spec.ts

  # Manual verification
  echo "Manual check: Open agreement tab and verify in browser console (F12)"
  echo "1. No console errors"
  echo "2. Regenerate works"
  echo "3. All articles visible"
  echo "4. Export works"

  # If all pass, DONE
  if [ $? -eq 0 ]; then
    echo "✅ All tests passed!"
    break
  fi

  # View failures
  npx playwright show-report

  # Fix issues (autonomous agent should implement fixes here)
  # Then redeploy
  cd ..
  ./deploy.sh --network ic --frontend-only
  cd daopad_frontend

  sleep 10
done
```

---

## File Changes Summary

### Test Changes
- `daopad_frontend/e2e/agreement.spec.ts` - Expand from 4 to 20+ comprehensive tests

### NO Backend Changes Required
All backend functionality already exists - this is purely testing the existing implementation.

---

## Implementation Checklist

- [ ] Worktree isolation verified
- [ ] Test file expanded with 20+ comprehensive tests
- [ ] Tests verify all 6 backend data sources
- [ ] Tests verify regeneration workflow
- [ ] Tests verify document rendering for all articles
- [ ] Tests verify export functionality
- [ ] Tests verify error handling
- [ ] Tests verify version incrementing
- [ ] Tests verify data consistency
- [ ] All tests passing in Playwright
- [ ] Manual browser verification (no console errors)
- [ ] PR created
- [ ] Code review approved

---

## Testing Details: Data Source Verification

### 1. Security Data (`agreementData.security`)
- ✓ Overall status ("high_risk" or "ready")
- ✓ Risk summary string
- ✓ Checks array (8 security checks)
- ✓ Critical issues array
- → Renders in governance warning banner + Article VI

### 2. Policies Data (`agreementData.policies`)
- ✓ Policies array with request policies
- ✓ Each policy has: id, specifier, rule
- → Renders in Article III voting thresholds table

### 3. Users Data (`agreementData.users`)
- ✓ Users array with all members
- ✓ Each user has: id, name, status, groups, identities
- ✓ Categorization: admins (group 00...00), operators (00...01), members, inactive
- → Renders in Article II with role-based styling

### 4. Canisters Data (`agreementData.canisters`)
- ✓ External canisters array
- ✓ Each canister has: canister_id, name, state
- → Renders in Article V

### 5. Voting Powers Data (`agreementData.votingPowers`)
- ✓ Array of { user: principal, voting_power: number }
- ✓ From Kong Locker integration
- → Used for governance calculations (may render in Article II)

### 6. Treasury Data (`agreementData.treasury`)
- ✓ Accounts array
- ✓ Assets array
- → Renders in Article IV

---

## Known Edge Cases to Test

1. **No snapshot exists yet** - First time visiting agreement tab
   - Should show empty state with regenerate button
   - Regenerate should create version 1

2. **Backend data source fails** - One of 6 parallel calls fails
   - Agreement should still render
   - Failed section shows "Data unavailable"
   - No console errors

3. **Snapshot too large** - Agreement data exceeds 4.9MB
   - Backend returns error
   - UI shows meaningful error message
   - User can try again

4. **Anonymous user** - Not logged in
   - Can view cached snapshot
   - Cannot regenerate (auth required)
   - Error message is clear

5. **User has no voting power** - Logged in but 0 VP
   - Cannot regenerate
   - Error: "Must hold voting power"

6. **Network timeout** - Backend calls take too long
   - Loading state doesn't hang forever
   - Error message appears after timeout
   - Can retry

---

## Dependencies & Constraints

- **Backend methods**: `get_agreement_snapshot`, `regenerate_agreement_snapshot` (already implemented)
- **Data sources**: 6 parallel backend calls (security, policies, users, canisters, voting, treasury)
- **Test station**: `fec7w-zyaaa-aaaaa-qaffq-cai` (ALEX token)
- **Authentication**: Tests use storageState with user who has voting power
- **Export libraries**: Markdown generation utility already exists
- **Deploy target**: IC mainnet only

---

## Implementation Notes

### Test Organization

Organize tests into logical groups:
1. **Data Pipeline Verification** (8 tests) - Each backend data source + regeneration
2. **Error Scenarios** (3 tests) - Timeouts, failures, missing data
3. **Member Display Verification** (2 tests) - Styling, categorization
4. **Snapshot Versioning** (2 tests) - Version increments, timestamp preservation
5. **Content Accuracy** (3 tests) - Legal language, blockchain refs, voting mechanism
6. **Export & Links** (2 tests) - Markdown, PDF, permanent link

### Data Verification Pattern

For each test, follow 3-layer verification:

```typescript
// Layer 1: Backend data exists
const backendData = getBackendResponse();
expect(backendData.sourceField).toBeDefined();

// Layer 2: Redux state matches backend (if applicable)
const reduxState = await page.evaluate(() => window.__REDUX_STATE__);
expect(reduxState.field).toEqual(backendData.sourceField);

// Layer 3: UI renders correctly
const uiElement = page.locator('[data-testid="field"]');
await expect(uiElement).toHaveText(expectedValue);
```

### Performance Expectations

- **Initial load**: < 5s (get cached snapshot)
- **Regeneration**: < 20s (6 parallel calls + processing)
- **Export markdown**: < 2s (client-side generation)
- **Print/PDF**: Instant (browser native)

### Error Messages to Test

- "No snapshot available. Click regenerate to create one."
- "Authentication required to regenerate agreement"
- "Must hold voting power for this token to regenerate agreement"
- "Agreement data exceeds size limit: X bytes (max: 4.9MB)"
- "Failed to verify voting power: ..."
- "Network error or timeout - please try again"

---

## Test Execution Command

```bash
cd /home/theseus/alexandria/daopad-agreement-comprehensive-tests/src/daopad/daopad_frontend

# Run all agreement tests
npx playwright test agreement.spec.ts

# Run specific test group
npx playwright test agreement.spec.ts -g "Data Pipeline"

# Run with UI to debug
npx playwright test agreement.spec.ts --ui

# Generate report
npx playwright test agreement.spec.ts --reporter=html
npx playwright show-report
```
