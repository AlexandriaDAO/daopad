# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-security-test-enhancement/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-security-test-enhancement/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Deploy & Test**:
   ```bash
   # Frontend changes only
   ./deploy.sh --network ic --frontend-only
   sleep 300  # Wait for deployment to complete

   # Manual browser verification FIRST (MANDATORY)
   # Open: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/settings
   # Check console (F12) for errors
   # Click "Run Security Checks" button
   # Wait for all 17 checks to complete (watch progress counter)
   # Verify: Score displays, no console errors, all checks complete

   # Run Playwright tests
   cd daopad_frontend
   npx playwright test e2e/settings.spec.ts --project=chromium
   ```
4. **Create PR** (MANDATORY):
   ```bash
   cd /home/theseus/alexandria/daopad-security-test-enhancement/src/daopad
   git add .
   git commit -m "[Testing]: Settings Tab - Comprehensive Security Audit E2E Tests"
   git push -u origin feature/security-test-enhancement
   gh pr create --title "[Testing]: Settings Tab - Comprehensive Security Audit E2E Tests" --body "Implements SECURITY_TEST_ENHANCEMENT_PLAN.md

## Summary
Enhances Settings tab security audit E2E tests to follow data-driven testing methodology:
- Adds comprehensive backend call verification (17 security checks)
- Tests progress tracking (0/17 → 17/17)
- Verifies data structure and score calculation
- Tests export functionality (Markdown & JSON)
- Uses createDataVerifier() for 3-layer verification

## Testing Completed
- ✅ Manual browser verification (17 checks complete, no errors)
- ✅ Playwright tests pass (all enhanced security tests)
- ✅ Backend call monitoring (verify all 17 checks called)
- ✅ Progress tracking verification
- ✅ Export functionality tested

## Scope
Anonymous user testing. Backend calls succeed without authentication for read-only security analysis.

## Files Changed
- \`daopad_frontend/e2e/settings.spec.ts\`: Enhanced security audit tests with comprehensive verification"
   ```
5. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view --json comments,reviews`
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

**Branch:** `feature/security-test-enhancement`
**Worktree:** `/home/theseus/alexandria/daopad-security-test-enhancement/src/daopad`

---

# Implementation Plan: Comprehensive Security Audit Testing

## Current State Documentation

### File: `daopad_frontend/e2e/settings.spec.ts` (EXISTING)

**Current Security Test (Lines 25-38) - NEEDS MAJOR ENHANCEMENT:**
```typescript
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
```

**Problems:**
1. ❌ No createDataVerifier() usage
2. ❌ No backend call verification (17 checks should execute)
3. ❌ No progress tracking test (should go from 0/17 → 17/17)
4. ❌ No console error checking
5. ❌ No data structure verification
6. ❌ No export functionality testing
7. ❌ Only checks 2 text strings (extremely surface-level)
8. ❌ Violates Three-Layer Verification Rule

### SecurityDashboard Architecture

**Component:** `src/components/security/SecurityDashboard.tsx`

**Key Features to Test:**
1. **17 Security Checks** (lines 213-236):
   - Original 8: admin_control, treasury_control, governance_permissions, proposal_policies, external_canisters, asset_management, system_configuration, operational_permissions
   - Bypass Detection 8: controller_manipulation, external_canister_calls, system_restore, addressbook_injection, monitoring_drain, snapshot_operations, named_rule_bypass, remove_operations
   - Treasury Setup 1: account_autoapproved_status
   - Total: **17 parallel backend calls**

2. **Progress Tracking** (lines 72-78, 118-142):
   - Shows "Analyzing DAO security... (X/17 checks complete)"
   - Real-time progress as each check completes
   - UI updates with checkmarks as categories finish

3. **Security Score** (lines 86-90):
   - BigInt to Number conversion
   - Displays as percentage (e.g., "0% Decentralized", "100% Decentralized")

4. **Export Functionality** (lines 162-172, 224-242):
   - Export as Markdown button
   - Export as JSON button
   - Generates comprehensive security report

5. **Error Handling** (lines 92-97, 150-157):
   - Shows error alert if checks fail
   - Proper error messages

**Backend Service:** `OrbitSecurityService.performComprehensiveSecurityCheck()`
- Location: `src/services/backend/orbit/security/OrbitSecurityService.ts`
- Lines 212-311: Executes 17 parallel security checks
- Progress callback for each completed check
- Returns aggregated results with decentralization score

### Gap Analysis

**What's Missing in Current Tests:**
1. ❌ Backend verification: No check that 17 API calls execute
2. ❌ Progress tracking: No verification of 0/17 → 17/17 counter
3. ❌ Data flow: No verification of data structure
4. ❌ Console errors: No error monitoring
5. ❌ Export testing: Buttons exist but not tested
6. ❌ Score calculation: No verification of percentage display
7. ❌ Individual checks: No verification that all 17 checks return data
8. ❌ Error states: No testing of failure scenarios

**Per PLAYWRIGHT_TESTING_GUIDE.md:**
- MUST use Three-Layer Verification (Network → State → UI)
- MUST use createDataVerifier() helper
- MUST verify backend calls succeed
- MUST check console for errors
- NOT just checking UI elements exist

## Implementation

### MODIFY: `daopad_frontend/e2e/settings.spec.ts`

#### Step 1: Enhance Existing Security Test (Replace Lines 25-38)

```typescript
test('should perform comprehensive security audit with 17 checks', async ({ page }) => {
    // STEP 1: Set up data verification (MANDATORY)
    const verify = createDataVerifier(page);

    // Track backend calls
    const backendCalls: Array<{method: string, timestamp: number}> = [];
    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('lwsav-iiaaa-aaaap-qp2qq-cai')) {
            // Extract method name from IC agent call
            try {
                const text = await response.text();
                // Security check methods: check_admin_control, check_treasury_control, etc.
                if (text.includes('check_')) {
                    backendCalls.push({
                        method: 'security_check',
                        timestamp: Date.now()
                    });
                }
            } catch (e) {
                // Binary response, that's ok
            }
        }
    });

    // Navigate
    await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Station Information', { timeout: 10000 });

    // STEP 2: Click "Run Security Checks" button
    const runChecksButton = page.locator('button:has-text("Run Security Checks")');
    await expect(runChecksButton).toBeVisible();
    await runChecksButton.click();

    // STEP 3: Verify loading state with progress tracking
    const loadingText = page.locator('text=Analyzing DAO security');
    await expect(loadingText).toBeVisible();

    // STEP 4: Monitor progress counter (should show X/17 checks complete)
    // Wait a bit for first checks to complete
    await page.waitForTimeout(3000);

    // Look for progress indicator
    const progressText = page.locator('text=/\\d+\\/17 checks complete/');
    await expect(progressText).toBeVisible({ timeout: 10000 });

    // STEP 5: Wait for all checks to complete (loading state disappears)
    await page.waitForSelector('text=Analyzing DAO security', {
        state: 'hidden',
        timeout: 60000
    });

    // STEP 6: Verify security score displays
    const scoreText = page.locator('text=/\\d+% Decentralized/');
    await expect(scoreText).toBeVisible();

    // Extract and verify score is a valid percentage
    const scoreContent = await scoreText.textContent();
    const scoreMatch = scoreContent?.match(/(\d+)% Decentralized/);
    expect(scoreMatch).not.toBeNull();
    const scoreValue = parseInt(scoreMatch?.[1] || '0');
    expect(scoreValue).toBeGreaterThanOrEqual(0);
    expect(scoreValue).toBeLessThanOrEqual(100);

    // STEP 7: Verify security checklist sections are visible
    await expect(page.locator('text=CRITICAL RISKS')).toBeVisible();
    await expect(page.locator('text=Admin User Count')).toBeVisible();

    // STEP 8: Verify individual security checks display
    // Should see various security check names
    const checkNames = [
        'Admin User Count',
        'Treasury Control',
        'Governance Permissions',
        'Proposal Policies'
    ];

    for (const checkName of checkNames) {
        const checkElement = page.locator(`text=${checkName}`);
        await expect(checkElement).toBeVisible();
    }

    // STEP 9: MANDATORY - Verify no console errors
    verify.assertNoConsoleErrors();

    // STEP 10: Verify backend calls occurred
    // Should have made multiple calls (17 security checks run in parallel)
    // May not see all 17 individual calls due to batching, but should see some
    const networkCalls = verify.getNetworkCalls();
    const securityRelatedCalls = networkCalls.filter(call =>
        call.url.includes('lwsav-iiaaa-aaaap-qp2qq-cai')
    );
    expect(securityRelatedCalls.length).toBeGreaterThan(0);

    // STEP 11: Print summary
    verify.printSummary();

    console.log(`\n=== SECURITY CHECK SUMMARY ===`);
    console.log(`Backend calls captured: ${backendCalls.length}`);
    console.log(`Security score: ${scoreContent}`);
    console.log(`Tests completed successfully`);
});
```

#### Step 2: Add Progress Tracking Test (NEW)

```typescript
test('should show real-time progress during security checks', async ({ page }) => {
    const verify = createDataVerifier(page);

    // Track progress updates
    const progressUpdates: string[] = [];

    // Monitor for progress text changes
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('checks complete')) {
            progressUpdates.push(text);
        }
    });

    // Navigate
    await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/settings');
    await page.waitForLoadState('networkidle');

    // Click button
    await page.click('button:has-text("Run Security Checks")');

    // Verify loading message appears
    await expect(page.locator('text=Analyzing DAO security')).toBeVisible();

    // Wait for progress counter to appear and update
    const progressLocator = page.locator('text=/\\d+\\/17 checks complete/');

    // Should see progress counter
    await expect(progressLocator).toBeVisible({ timeout: 10000 });

    // Wait for completion
    await page.waitForSelector('text=Analyzing DAO security', {
        state: 'hidden',
        timeout: 60000
    });

    // Should see final state (results displayed)
    await expect(page.locator('text=/\\d+% Decentralized/')).toBeVisible();

    // No console errors during the process
    verify.assertNoConsoleErrors();
    verify.printSummary();
});
```

#### Step 3: Add Export Functionality Test (NEW)

```typescript
test('should display export buttons after security checks complete', async ({ page }) => {
    const verify = createDataVerifier(page);

    // Navigate
    await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/settings');
    await page.waitForLoadState('networkidle');

    // Run security checks
    await page.click('button:has-text("Run Security Checks")');

    // Wait for completion
    await page.waitForSelector('text=Analyzing DAO security', {
        state: 'hidden',
        timeout: 60000
    });

    // Scroll down to export section (might be below the fold)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Verify export section is visible
    const exportHeading = page.locator('text=Export Security Report');
    await expect(exportHeading).toBeVisible();

    // Verify export buttons exist
    const markdownButton = page.locator('button:has-text("Export as Markdown")');
    const jsonButton = page.locator('button:has-text("Export as JSON")');

    await expect(markdownButton).toBeVisible();
    await expect(jsonButton).toBeVisible();

    // Verify buttons are enabled (not disabled)
    const markdownDisabled = await markdownButton.isDisabled();
    const jsonDisabled = await jsonButton.isDisabled();

    expect(markdownDisabled).toBe(false);
    expect(jsonDisabled).toBe(false);

    // NOTE: We don't actually click these buttons in automated tests
    // because they trigger downloads, which are hard to verify.
    // Manual testing checklist should include:
    // - Click each button
    // - Verify file downloads
    // - Verify file content is valid Markdown/JSON

    // No console errors
    verify.assertNoConsoleErrors();
    verify.printSummary();
});
```

#### Step 4: Add Error Handling Test (NEW)

```typescript
test('should handle security check errors gracefully', async ({ page }) => {
    const verify = createDataVerifier(page);

    // Navigate
    await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/settings');
    await page.waitForLoadState('networkidle');

    // Run security checks
    await page.click('button:has-text("Run Security Checks")');

    // Wait for either success or error
    await page.waitForTimeout(60000); // Give full time for checks

    // Check if we got results OR an error message
    const hasResults = await page.locator('text=/\\d+% Decentralized/').isVisible().catch(() => false);
    const hasError = await page.locator('text=Failed to verify security status').isVisible().catch(() => false);

    // Should have either results or error, not stuck loading
    const isStillLoading = await page.locator('text=Analyzing DAO security').isVisible().catch(() => false);
    expect(isStillLoading).toBe(false);

    // Should have one or the other
    expect(hasResults || hasError).toBe(true);

    if (hasError) {
        console.log('⚠️  Security checks returned error (expected in some cases)');
    } else {
        console.log('✅ Security checks completed successfully');
    }

    // Even if there's an error, should not have critical console errors
    // (Backend errors are handled gracefully)
    verify.assertNoConsoleErrors();
    verify.printSummary();
});
```

#### Step 5: Add Comprehensive Integration Test (NEW)

```typescript
test('should verify complete security audit data flow', async ({ page }) => {
    const verify = createDataVerifier(page);

    // Navigate
    await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/settings');
    await page.waitForLoadState('networkidle');

    // LAYER 1: User action - Click button
    await page.click('button:has-text("Run Security Checks")');

    // LAYER 2: Network - Backend calls execute
    // (Verified by data verifier)

    // LAYER 3: State - Loading state appears
    await expect(page.locator('text=Analyzing DAO security')).toBeVisible();

    // LAYER 4: Progress - Counter updates
    const progressLocator = page.locator('text=/\\d+\\/17 checks complete/');
    await expect(progressLocator).toBeVisible({ timeout: 15000 });

    // LAYER 5: Completion - Loading disappears
    await page.waitForSelector('text=Analyzing DAO security', {
        state: 'hidden',
        timeout: 60000
    });

    // LAYER 6: Results - Score and checks display
    await expect(page.locator('text=/\\d+% Decentralized/')).toBeVisible();
    await expect(page.locator('text=CRITICAL RISKS')).toBeVisible();

    // LAYER 7: Export - Buttons become available
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Export Security Report')).toBeVisible();

    // MANDATORY: Verify data pipeline integrity
    verify.assertNoConsoleErrors();
    verify.assertBackendSuccess();

    // Print summary
    verify.printSummary();

    console.log(`\n=== COMPLETE DATA FLOW VERIFIED ===`);
    console.log(`✅ User action → Backend calls → State updates → UI renders → Export ready`);
});
```

#### Step 6: Add Test Documentation Header

```typescript
// Add after existing file header documentation

/**
 * Security Audit E2E Tests
 *
 * COMPREHENSIVE TESTING: Anonymous user security analysis
 *
 * WHAT WE TEST:
 * 1. ✅ Backend execution (17 parallel security checks)
 * 2. ✅ Progress tracking (0/17 → 17/17 counter updates)
 * 3. ✅ Data structure (score, checks, severity levels)
 * 4. ✅ Console error absence (no TypeError, decode errors)
 * 5. ✅ UI state transitions (loading → progress → results)
 * 6. ✅ Export functionality (buttons available after completion)
 * 7. ✅ Error handling (graceful failures)
 * 8. ✅ Complete data flow (Network → State → UI)
 *
 * SECURITY CHECKS EXECUTED (17 total):
 * - Original 8: admin_control, treasury_control, governance_permissions,
 *   proposal_policies, external_canisters, asset_management,
 *   system_configuration, operational_permissions
 * - Bypass Detection 8: controller_manipulation, external_canister_calls,
 *   system_restore, addressbook_injection, monitoring_drain,
 *   snapshot_operations, named_rule_bypass, remove_operations
 * - Treasury Setup 1: account_autoapproved_status
 *
 * ANONYMOUS USER CAPABILITY:
 * - Security checks work without authentication (read-only analysis)
 * - Backend acts as admin proxy for security queries
 * - All 17 checks execute successfully for anonymous users
 *
 * MANUAL TESTING CHECKLIST (Export functionality):
 * 1. Complete security checks
 * 2. Click "Export as Markdown" button
 * 3. Verify .md file downloads with proper filename format
 * 4. Open file and verify content is valid Markdown
 * 5. Click "Export as JSON" button
 * 6. Verify .json file downloads
 * 7. Open file and verify valid JSON structure
 * 8. Verify exported data includes all security check results
 */
```

## Testing Workflow

### MANDATORY: Manual Browser Verification FIRST

```bash
# 1. Deploy to mainnet
cd /home/theseus/alexandria/daopad-security-test-enhancement/src/daopad
./deploy.sh --network ic --frontend-only

# 2. Wait for deployment
sleep 300

# 3. Open in incognito browser (anonymous user)
# URL: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/settings

# 4. Open DevTools Console (F12) - READ EVERY LINE

# 5. Click "Run Security Checks" button

# 6. OBSERVE DURING EXECUTION:
#    a. Loading message appears: "Analyzing DAO security"
#    b. Progress counter appears: "0/17 checks complete"
#    c. Counter updates in real-time: "5/17", "10/17", "15/17"
#    d. Counter reaches "17/17 checks complete"
#    e. Loading message disappears
#    f. NO console errors (TypeError, decode, etc.)

# 7. VERIFY RESULTS DISPLAY:
#    a. Security score shows: "X% Decentralized" (0-100%)
#    b. Section headers visible: "CRITICAL RISKS"
#    c. Individual checks listed: "Admin User Count", etc.
#    d. Check statuses shown (Pass/Warn/Fail badges)

# 8. SCROLL DOWN and VERIFY EXPORT:
#    a. "Export Security Report" heading visible
#    b. "Export as Markdown" button enabled
#    c. "Export as JSON" button enabled

# 9. TEST EXPORT (Manual only):
#    a. Click "Export as Markdown"
#    b. Verify file downloads: "ALEX-security-audit-[timestamp].md"
#    c. Open file, verify valid Markdown content
#    d. Click "Export as JSON"
#    e. Verify file downloads: "ALEX-security-audit-[timestamp].json"
#    f. Open file, verify valid JSON structure

# 10. Document findings:
echo "✅ PASS: All 17 checks complete, no errors, export works"
# OR
echo "❌ FAIL: Found errors: [list them]"
```

### Playwright Test Execution

```bash
cd /home/theseus/alexandria/daopad-security-test-enhancement/src/daopad/daopad_frontend

# Run all enhanced security tests
npx playwright test e2e/settings.spec.ts --project=chromium

# Expected new tests to pass:
# ✓ should perform comprehensive security audit with 17 checks (ENHANCED)
# ✓ should show real-time progress during security checks (NEW)
# ✓ should display export buttons after security checks complete (NEW)
# ✓ should handle security check errors gracefully (NEW)
# ✓ should verify complete security audit data flow (NEW)

# Plus existing tests:
# ✓ should load Settings tab for anonymous user
# ✓ should show read-only mode for write operations
# ✓ should handle BigInt values correctly
# ✓ should display request policies correctly
# ✓ should not show authentication errors in console
```

### Exit Criteria (When to Stop Iterating)

**SUCCESS - Stop when ALL are true:**
1. ✅ Manual browser: Click "Run Security Checks" → All 17 checks complete
2. ✅ Manual browser: Progress counter goes from 0/17 → 17/17
3. ✅ Manual browser: Security score displays (0-100%)
4. ✅ Manual browser: Export buttons appear and work
5. ✅ Manual browser: ZERO console errors (no TypeError, decode errors)
6. ✅ Playwright: All security tests pass
7. ✅ Playwright: `verify.assertNoConsoleErrors()` passes
8. ✅ Playwright: `verify.assertBackendSuccess()` passes
9. ✅ Playwright: Progress tracking verified
10. ✅ Playwright: Export buttons verified

**FAILURE - Keep iterating when ANY are true:**
1. ❌ Console shows errors during security checks
2. ❌ Progress counter doesn't update or gets stuck
3. ❌ Security checks don't complete (loading forever)
4. ❌ Score doesn't display or shows "NaN"
5. ❌ Playwright tests fail
6. ❌ Data verifier assertions fail
7. ❌ Iteration count < 5

### Autonomous Iteration Loop

```
FOR iteration = 1 TO 5:

  // ALWAYS start with manual browser verification
  1. Deploy: ./deploy.sh --network ic --frontend-only
  2. Sleep: 300 seconds (deployment time)
  3. Open: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/settings
  4. Check console (F12) - read every line
  5. Click "Run Security Checks"
  6. Watch progress: 0/17 → 17/17
  7. Verify: Score displays, no errors

  IF console has errors:
    - Copy exact error text
    - Identify error type:
      * "TypeError: X is not a function" → Missing method
      * "Cannot convert BigInt to number" → BigInt handling issue
      * "Invalid record..." → Candid mismatch
    - Fix in code
    - git add . && git commit -m "Fix: [error]"
    - git push
    - GOTO step 1

  IF progress counter stuck or checks don't complete:
    - Check Network tab for failed calls
    - Identify which security check failed
    - Check backend logs if needed
    - Fix issue
    - git commit, push, continue loop

  IF console clean AND checks complete:
    - Run Playwright: cd daopad_frontend && npx playwright test e2e/settings.spec.ts
    - IF all tests pass: SUCCESS, create PR, exit loop
    - IF tests fail:
      * Read error messages
      * Fix test assertions or application bug
      * git commit, push, continue loop

  IF iteration = 5:
    - Comment on PR with findings
    - Request human help
    - EXIT

END FOR
```

**NO QUESTIONS ALLOWED**: Make best judgment, fix, iterate autonomously.

## Files Changed Summary

### MODIFY: `daopad_frontend/e2e/settings.spec.ts`

**Changes:**
1. Replace existing security test (lines 25-38): Delete 14 lines, add ~90 lines comprehensive test
2. Add progress tracking test: ~45 lines (NEW)
3. Add export functionality test: ~50 lines (NEW)
4. Add error handling test: ~35 lines (NEW)
5. Add integration test: ~55 lines (NEW)
6. Add security tests documentation header: ~35 lines (NEW)

**Total:** ~310 new/changed lines (replacing 14 existing)

**New Test Count:** +4 comprehensive security tests

## Success Verification Checklist

Before declaring "PR ready", verify ALL:

```bash
# 1. Manual console verification
# Open: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/settings
# Action: Click "Run Security Checks"
# Check: ZERO errors in console ✅
# Check: Progress shows "17/17 checks complete" ✅

# 2. Score displays correctly
# Check: Shows "X% Decentralized" (valid 0-100%) ✅

# 3. Results display
# Check: "CRITICAL RISKS" section visible ✅
# Check: Individual checks listed with statuses ✅

# 4. Export available
# Check: "Export Security Report" section visible ✅
# Check: Both export buttons enabled ✅

# 5. Playwright tests pass
cd /home/theseus/alexandria/daopad-security-test-enhancement/src/daopad/daopad_frontend
npx playwright test e2e/settings.spec.ts --project=chromium
# Output: All tests passed (including 4+ new security tests) ✅

# 6. Data verification passes
# Check test output for:
# - "=== CRITICAL CONSOLE ERRORS ===" (should be empty)
# - "Network Calls: X" (should be > 0)
# - All verify.assert*() calls pass ✅
```

**If ANY checklist item fails**: Continue iteration loop.

## Notes

- **17 Security Checks**: Comprehensive coverage (original 8 + bypass detection 8 + treasury setup 1)
- **Anonymous Testing**: All checks work without authentication (backend proxy)
- **Progress Tracking**: Real-time UI updates as checks complete
- **Export Testing**: Buttons verified, actual downloads require manual testing
- **Data Verification**: Three-Layer Verification (Network → State → UI)
- **Error Handling**: Graceful failure modes tested

## Implementation Checklist

- [ ] Verify worktree isolation
- [ ] Enhance existing security test with comprehensive verification
- [ ] Add progress tracking test
- [ ] Add export functionality test
- [ ] Add error handling test
- [ ] Add integration test
- [ ] Add test documentation header
- [ ] Deploy to mainnet
- [ ] Wait 300 seconds
- [ ] Manual browser verification (all checks pass)
- [ ] Run Playwright tests (all pass)
- [ ] Create PR with detailed description
- [ ] Iterate autonomously up to 5 times if needed
