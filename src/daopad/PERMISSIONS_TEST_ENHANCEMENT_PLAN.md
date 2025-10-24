# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-permissions-test-enhancement/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-permissions-test-enhancement/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Deploy & Test**:
   ```bash
   # Frontend changes only
   ./deploy.sh --network ic --frontend-only
   sleep 300  # Wait for deployment to complete

   # Manual browser verification FIRST (MANDATORY)
   # Open: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/settings
   # Check console (F12) for errors
   # Click "Run Security Checks" - verify no errors
   # Click "Show Request Policies" - verify behavior

   # Run Playwright tests
   cd daopad_frontend
   npx playwright test e2e/settings.spec.ts --project=chromium
   ```
4. **Create PR** (MANDATORY):
   ```bash
   cd /home/theseus/alexandria/daopad-permissions-test-enhancement/src/daopad
   git add .
   git commit -m "[Testing]: Settings Tab - Comprehensive Permissions E2E Tests"
   git push -u origin feature/permissions-test-enhancement
   gh pr create --title "[Testing]: Settings Tab - Comprehensive Permissions E2E Tests" --body "Implements PERMISSIONS_TEST_ENHANCEMENT_PLAN.md

## Summary
Enhances Settings tab E2E tests to follow data-driven testing methodology:
- Adds comprehensive permissions section testing (anonymous users)
- Uses createDataVerifier() helper for 3-layer verification
- Tests user interactions (button clicks, toggle behavior)
- Verifies console error absence and appropriate UX

## Testing Completed
- ✅ Manual browser verification (console clean, interactions work)
- ✅ Playwright tests pass (8/8)
- ✅ Data verification (Network → Console → UI)

## Scope
Anonymous user testing only. Authenticated features documented for manual testing per PLAYWRIGHT_TESTING_GUIDE.md.

## Files Changed
- \`daopad_frontend/e2e/settings.spec.ts\`: Enhanced with comprehensive permissions tests"
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

**Branch:** `feature/permissions-test-enhancement`
**Worktree:** `/home/theseus/alexandria/daopad-permissions-test-enhancement/src/daopad`

---

# Implementation Plan: Enhance Permissions System Testing

## Current State Documentation

### File: `daopad_frontend/e2e/settings.spec.ts` (EXISTING - 115 lines)

**Existing Test Coverage:**
- Lines 1-23: Anonymous user basic loading test
- Lines 25-38: Security dashboard test (partial data verification)
- Lines 40-58: Read-only mode test
- Lines 60-74: BigInt handling test
- Lines 76-89: **Permissions test (NEEDS ENHANCEMENT - surface-level only)**
- Lines 91-114: Console errors test

**Current Permissions Test (Lines 76-89):**
```typescript
test('should display request policies correctly', async ({ page }) => {
    // Click security checks to load the section
    await page.click('button:has-text("Run Security Checks")');
    await page.waitForSelector('text=Analyzing DAO security', { state: 'hidden', timeout: 60000 });

    // Check that "Show Request Policies" button is available
    const showPoliciesButton = page.locator('button:has-text("Show Request Policies")');
    if (await showPoliciesButton.isVisible()) {
        // Button exists - that's enough to verify the feature is available
        await expect(showPoliciesButton).toBeVisible();
    }
});
```

**Problems:**
1. ❌ Only checks button existence (surface-level)
2. ❌ Doesn't click button or verify behavior
3. ❌ No data verification (missing createDataVerifier())
4. ❌ No console error checking
5. ❌ Doesn't test user interaction flow
6. ❌ Violates Three-Layer Verification Rule

### Components Architecture

**RequestPoliciesView Component:**
- Location: `src/components/security/RequestPoliciesView.tsx`
- Lines 17-22: Checks for identity, returns early if anonymous
- Line 27: Calls `OrbitSecurityService.getRequestPoliciesDetails(stationId)`
- Anonymous flow: Shows "Loading..." → "No policies data available"
- Console log: "No identity available" (info, not error)

**SecurityDashboard Component:**
- Location: `src/components/security/SecurityDashboard.tsx`
- Lines 178-186: Renders "Show/Hide Request Policies" button
- Toggles `showPolicies` state
- Conditionally renders `RequestPoliciesView`

**Backend Service:**
- `OrbitSecurityService.getRequestPoliciesDetails(stationId)`
- Returns: `{policies[], total_count, auto_approved_count, bypass_count}`
- Requires authentication (anonymous users cannot call)

## Implementation

### MODIFY: `daopad_frontend/e2e/settings.spec.ts`

#### Step 1: Add Data Verifier Import

```typescript
// Add at top of file (after existing imports)
import { createDataVerifier } from './helpers/data-verifier';
```

#### Step 2: Replace Lines 76-89 with Enhanced Permissions Tests

```typescript
test('should show permissions policies view for anonymous user', async ({ page }) => {
    // STEP 1: Set up data verification (MANDATORY)
    const verify = createDataVerifier(page);

    // Track console logs (distinguish info from errors)
    const consoleLogs: string[] = [];
    page.on('console', msg => {
        if (msg.type() === 'log') {
            consoleLogs.push(msg.text());
        }
    });

    // STEP 2: Navigate to Settings tab
    await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/settings');
    await page.waitForLoadState('networkidle');

    // STEP 3: Wait for page to load
    await page.waitForSelector('text=Station Information', { timeout: 10000 });

    // STEP 4: Verify "Show Request Policies" button exists
    const showPoliciesButton = page.locator('button:has-text("Show Request Policies")');
    await expect(showPoliciesButton).toBeVisible();

    // STEP 5: Click button to show policies view
    await showPoliciesButton.click();

    // STEP 6: Wait for RequestPoliciesView component to render
    await page.waitForTimeout(3000); // Allow component to mount and check identity

    // STEP 7: Verify component rendering
    // Look for the card that contains "Request Approval Policies" or "No policies data available"
    const policiesCard = page.locator('text=Request Approval Policies, text=No policies data available').first();

    // Check for loading state first
    const loadingText = page.locator('text=Loading request policies');
    const isLoading = await loadingText.isVisible().catch(() => false);

    if (isLoading) {
        // Wait for loading to complete
        await page.waitForSelector('text=Loading request policies', { state: 'hidden', timeout: 5000 });
    }

    // STEP 8: Verify appropriate message for anonymous users
    // RequestPoliciesView shows "No policies data available" when no identity
    const noPoliciesMessage = page.locator('text=No policies data available');
    await expect(noPoliciesMessage).toBeVisible();

    // STEP 9: Verify console shows expected behavior (not an error)
    // Should see "No identity available" log from RequestPoliciesView.tsx:19
    const hasIdentityLog = consoleLogs.some(log => log.includes('No identity available'));
    expect(hasIdentityLog).toBe(true);

    // STEP 10: MANDATORY - Verify no critical errors
    // "No identity available" is expected info log, not an error
    verify.assertNoConsoleErrors(); // Should pass - no TypeError, decode errors, etc.

    // STEP 11: Verify button text changed to "Hide"
    const hideButton = page.locator('button:has-text("Hide Request Policies")');
    await expect(hideButton).toBeVisible();

    // STEP 12: Print summary for debugging
    verify.printSummary();
});

test('should toggle policies view visibility', async ({ page }) => {
    const verify = createDataVerifier(page);

    // Navigate
    await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Station Information', { timeout: 10000 });

    // Show policies
    const showButton = page.locator('button:has-text("Show Request Policies")');
    await expect(showButton).toBeVisible();
    await showButton.click();
    await page.waitForTimeout(2000);

    // Verify visible - look for either the card title or the no data message
    const policiesVisible = page.locator('text=Request Approval Policies, text=No policies data available').first();
    await expect(policiesVisible).toBeVisible();

    // Hide policies
    const hideButton = page.locator('button:has-text("Hide Request Policies")');
    await expect(hideButton).toBeVisible();
    await hideButton.click();
    await page.waitForTimeout(1000);

    // Verify hidden - the policies content should not be visible
    const noPoliciesMessage = page.locator('text=No policies data available');
    await expect(noPoliciesMessage).not.toBeVisible();

    // Button should change back to "Show"
    await expect(showButton).toBeVisible();

    // No errors during toggle
    verify.assertNoConsoleErrors();
    verify.printSummary();
});
```

#### Step 3: Add File Header Documentation

```typescript
// Add at top of file (after imports, before test.describe)

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
```

#### Step 4: Enhance Existing Security Test (Optional Enhancement)

```typescript
// OPTIONAL: Enhance existing security dashboard test (lines 25-38)
// Add data verifier to existing test

test('should load security dashboard for anonymous user', async ({ page }) => {
    // ADD THIS LINE at start
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

    // ADD THESE LINES at end
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
```

## Testing Workflow

### MANDATORY: Manual Browser Verification FIRST

```bash
# 1. Deploy to mainnet
cd /home/theseus/alexandria/daopad-permissions-test-enhancement/src/daopad
./deploy.sh --network ic --frontend-only

# 2. Wait for deployment
sleep 300

# 3. Open in incognito browser (anonymous user)
# URL: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/settings

# 4. Open DevTools Console (F12) - READ EVERY LINE

# 5. Test Security Checks:
#    - Click "Run Security Checks" button
#    - Wait for completion (~20-30 seconds)
#    - Verify: No TypeError, decode errors, or critical errors
#    - Verify: Security score displays (e.g., "0% Decentralized")
#    - Verify: Checklist sections visible (CRITICAL RISKS, Admin User Count)

# 6. Test Permissions Section:
#    - Click "Show Request Policies" button
#    - Verify: Button changes to "Hide Request Policies"
#    - Verify: RequestPoliciesView card renders
#    - Verify: Message shows "No policies data available"
#    - Verify: Console shows "No identity available" (info log, NOT error)
#    - Verify: NO TypeError or decode errors

# 7. Test Toggle:
#    - Click "Hide Request Policies" button
#    - Verify: Button changes back to "Show Request Policies"
#    - Verify: RequestPoliciesView card disappears
#    - Verify: No console errors

# 8. Document findings:
echo "✅ PASS: All manual checks passed, ready for Playwright"
# OR
echo "❌ FAIL: Found errors: [list them]"
```

### Playwright Test Execution

```bash
cd /home/theseus/alexandria/daopad-permissions-test-enhancement/src/daopad/daopad_frontend

# Run enhanced settings tests
npx playwright test e2e/settings.spec.ts --project=chromium

# Expected output:
# ✓ should load Settings tab for anonymous user
# ✓ should load security dashboard for anonymous user
# ✓ should show read-only mode for write operations
# ✓ should handle BigInt values correctly
# ✓ should show permissions policies view for anonymous user (NEW)
# ✓ should toggle policies view visibility (NEW)
# ✓ should not show authentication errors in console

# All tests passed (7+/7+) ✅
```

### Exit Criteria (When to Stop Iterating)

**SUCCESS - Stop when ALL are true:**
1. ✅ Manual browser: ZERO console errors (security checks + permissions)
2. ✅ Manual browser: Security checks complete and display results
3. ✅ Manual browser: "Show Request Policies" button works correctly
4. ✅ Manual browser: Toggle works (show/hide behavior)
5. ✅ Playwright: All tests pass
6. ✅ Playwright: `verify.assertNoConsoleErrors()` passes in all tests
7. ✅ Playwright: User interactions verified (clicks, toggles)

**FAILURE - Keep iterating when ANY are true:**
1. ❌ Console shows TypeError, decode errors, or critical errors
2. ❌ Playwright tests fail
3. ❌ Data verifier assertions fail
4. ❌ User interactions don't work as expected
5. ❌ Iteration count < 5

### Autonomous Iteration Loop

```
FOR iteration = 1 TO 5:

  // ALWAYS start with manual browser verification
  1. Deploy: ./deploy.sh --network ic --frontend-only
  2. Sleep: 300 seconds (deployment time)
  3. Open: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/settings
  4. Check console (F12) - read every line
  5. Test security checks - verify no errors
  6. Test permissions button - verify behavior
  7. Test toggle - verify show/hide works

  IF console has errors:
    - Copy exact error text
    - Identify error type:
      * "TypeError: X is not a function" → Missing method/property
      * "Cannot read property 'X' of undefined" → Missing data
      * "Invalid record..." → Candid mismatch
    - Fix in code
    - git add . && git commit -m "Fix: [error description]"
    - git push
    - GOTO step 1 (deploy and verify fix)

  IF console clean:
    - Run Playwright: cd daopad_frontend && npx playwright test e2e/settings.spec.ts
    - IF all tests pass: SUCCESS, create PR, exit loop
    - IF tests fail:
      * Read error messages carefully
      * Check if test assertion is wrong vs application bug
      * Fix accordingly
      * git commit, push, continue loop

  IF iteration = 5:
    - Comment on PR with findings
    - Request human help
    - EXIT

END FOR
```

**NO QUESTIONS ALLOWED**: Make best judgment, fix issues, iterate. Only ask after 5 iterations.

## Files Changed Summary

### MODIFY: `daopad_frontend/e2e/settings.spec.ts`

**Changes:**
1. Add import: `createDataVerifier` helper (1 line)
2. Add file header documentation (30 lines)
3. Replace permissions test (lines 76-89): Delete 14 lines, add ~70 lines for comprehensive test
4. Add new toggle test: ~30 lines
5. Optional: Enhance security test with data verifier: +10 lines

**Total:** ~140 new/changed lines (replacing 14 existing)

**Final Line Count:** ~245 lines (from 115 lines)

## Success Verification Checklist

Before declaring "PR ready", verify ALL of these:

```bash
# 1. Console verification
# Open: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/settings
# Check: ZERO errors in console ✅

# 2. Security checks work
# Action: Click "Run Security Checks"
# Check: Completes without errors, displays results ✅

# 3. Permissions button works
# Action: Click "Show Request Policies"
# Check: Button changes to "Hide", card renders, appropriate message ✅

# 4. Toggle works
# Action: Click "Hide Request Policies"
# Check: Card disappears, button changes back ✅

# 5. Playwright tests pass
cd /home/theseus/alexandria/daopad-permissions-test-enhancement/src/daopad/daopad_frontend
npx playwright test e2e/settings.spec.ts --project=chromium
# Output: All tests passed ✅

# 6. Data verification passes
# Check test output for:
# - "=== CRITICAL CONSOLE ERRORS ===" (should be empty)
# - "Network Calls: X" (should be > 0)
# - All assertions pass ✅
```

**If ANY checklist item fails**: You are NOT done. Continue iteration loop.

## Notes

- **Testing Scope**: Anonymous users only (per PLAYWRIGHT_TESTING_GUIDE.md)
- **Authenticated Testing**: Manual only (documented in test file header)
- **Testing Philosophy**: Three-Layer Verification (Console → Interaction → UX)
- **Data Verification**: Uses `createDataVerifier()` helper (mandatory)
- **Exit Criteria**: Clear and unambiguous success conditions

## Implementation Checklist

- [ ] Verify worktree isolation
- [ ] Modify test file with enhanced tests
- [ ] Add data verifier import
- [ ] Add file header documentation
- [ ] Replace old permissions test with comprehensive version
- [ ] Add toggle test
- [ ] Optionally enhance security test
- [ ] Deploy to mainnet: `./deploy.sh --network ic --frontend-only`
- [ ] Wait 300 seconds for deployment
- [ ] Manual browser verification (all checks pass)
- [ ] Run Playwright tests (all pass)
- [ ] Create PR with comprehensive description
- [ ] Iterate autonomously up to 5 times if needed
