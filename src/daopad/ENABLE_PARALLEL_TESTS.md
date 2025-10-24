# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-enable-parallel-tests/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-enable-parallel-tests/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Test iteratively until ALL tests pass**:
   ```bash
   cd daopad_frontend
   npx playwright test --reporter=list
   ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Performance]: Enable Parallel Playwright Test Execution"
   git push -u origin feat/enable-parallel-playwright-tests
   gh pr create --title "[Performance]: Enable Parallel Playwright Test Execution - 75% Faster" --body "Implements ENABLE_PARALLEL_TESTS.md"
   ```
5. **Iterate autonomously**:
   - FOR i=1 to 10:
     - Run tests: `npx playwright test`
     - Count failures
     - IF failures > 0:
       - Check if failure is due to parallelization (shared state, race conditions)
       - Fix OR ask user if test expectation should change
       - Commit, continue
     - IF failures = 0: Report success, create PR, EXIT
   - After 10 iterations: Ask user for guidance

## CRITICAL RULES
- ❌ NO questions like "should I?", "want me to?" - just do it
- ❌ NO skipping PR creation - it's MANDATORY
- ❌ NO stopping after implementation - run tests until they ALL pass
- ✅ Fix test flakiness caused by parallelization
- ✅ Ask user ONLY if test criterion seems wrong, not for permission to fix
- ✅ Keep iterating until 0 failures or max iterations

**Branch:** `feat/enable-parallel-playwright-tests`
**Worktree:** `/home/theseus/alexandria/daopad-enable-parallel-tests/src/daopad`

---

# Implementation Plan: Enable Parallel Playwright Test Execution

## Problem Statement

**Current Performance**: 72 tests × 15s each = **~18 minutes** (serial execution)

**Root Cause**:
- `playwright.config.ts:9` - `fullyParallel: false` forces serial execution
- `playwright.config.ts:12` - `workers: 1` runs only 1 test at a time
- Each test includes 15-second waits for IC canister calls to complete

**Expected Improvement**: With 4 parallel workers → **~4-5 minutes** (75% faster)

---

## Current State

### File: `daopad_frontend/playwright.config.ts`

Current configuration (BEFORE):
```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,      // ❌ Serial execution
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,                // ❌ Only 1 worker
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  // ... rest of config
  timeout: 120000,
});
```

### Test Suite Stats
- Total tests: 72
- Average test duration: 15-17 seconds
- Test categories:
  - activity.spec.ts (10 tests)
  - agreement.spec.ts (20 tests)
  - app-route.spec.ts (7 tests)
  - canisters.spec.ts (3 tests)
  - debug-page-load.spec.ts (1 test)
  - manual-auth-setup.spec.ts (1 test)
  - minimal-smoke.spec.ts (3 tests)
  - settings.spec.ts (6 tests)
  - treasury-enhanced.spec.ts (13 tests)
  - treasury.spec.ts (8 tests)

---

## Implementation

### Step 1: Update Playwright Configuration

**File: `daopad_frontend/playwright.config.ts`**

```typescript
// PSEUDOCODE - Replace lines 9-12

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,  // ✅ Enable parallel test execution
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,  // ✅ 4 workers locally, 2 in CI to avoid rate limits
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  // ... rest unchanged
});
```

**Key Changes**:
1. `fullyParallel: true` - Tests in different files run in parallel
2. `workers: 4` locally - 4 concurrent browser instances
3. `workers: 2` in CI - Avoid overwhelming IC boundary nodes

---

## Testing Strategy

### Phase 1: Verify No Shared State Issues

Run tests in parallel and check for:
- ❌ Race conditions (tests modifying same backend state)
- ❌ Authentication conflicts (multiple workers accessing same auth file)
- ❌ IC rate limiting (too many requests to same canister)

```bash
cd daopad_frontend
npx playwright test --workers=2  # Start with 2 workers
npx playwright test --workers=4  # Increase to 4 if stable
```

### Phase 2: Fix Any Flakiness

If tests fail with parallel execution:

**A. Shared Authentication**:
```typescript
// IF auth file conflicts occur:
// PSEUDOCODE in playwright.config.ts
use: {
  storageState: process.env.STORAGE_STATE || undefined,
  // Each worker gets isolated storage
}
```

**B. IC Rate Limiting**:
```typescript
// IF IC rejects requests:
// PSEUDOCODE - reduce workers
workers: process.env.CI ? 1 : 2,  // Conservative
```

**C. Test Isolation**:
```typescript
// IF tests affect each other:
// PSEUDOCODE - ensure each test uses unique data
// Example: Use unique token IDs per test
const TEST_TOKEN = `test-token-${Date.now()}`;
```

### Phase 3: Verify All 72 Tests Pass

```bash
# Run full suite with parallel execution
npx playwright test

# Check results:
# - 0 failures expected (or ask user about test expectations)
# - Execution time < 6 minutes (75% improvement)
# - No flaky tests (run twice to verify)
```

---

## Success Criteria

1. ✅ `fullyParallel: true` in playwright.config.ts
2. ✅ `workers: 4` (or optimal number based on testing)
3. ✅ All 72 tests pass consistently
4. ✅ Test execution time < 6 minutes (down from 18 minutes)
5. ✅ No flaky tests (same results on multiple runs)

---

## Iteration Loop (MANDATORY)

```bash
# PSEUDOCODE for autonomous agent

FOR iteration = 1 to 10:
  1. Run: npx playwright test
  2. Count failures
  3. IF failures > 0:
     - Analyze failure logs
     - Check if parallelization-related (race condition, shared state)
     - Fix issue OR ask user: "Test expects X but code does Y - should I change test expectation?"
     - Commit fix
     - Continue to next iteration
  4. IF failures = 0:
     - Verify execution time < 6 minutes
     - Run tests again to confirm stability
     - IF stable: Create PR, report success, EXIT
  5. IF iteration = 10:
     - Ask user for guidance on remaining issues
     - EXIT

# Never ask "should I create PR?" - it's MANDATORY
# Never ask "is this done?" - check test results autonomously
```

---

## Known Risks & Mitigations

### Risk 1: IC Canister Rate Limiting
**Symptom**: Tests fail with 429 errors or timeouts
**Mitigation**: Reduce workers to 2 or add request throttling

### Risk 2: Authentication State Conflicts
**Symptom**: Tests fail with "not authenticated" errors
**Mitigation**: Ensure each worker has isolated storage or skip auth tests in parallel

### Risk 3: Shared Backend State
**Symptom**: Tests interfere with each other (wrong data, inconsistent results)
**Mitigation**: Tests should be read-only or use unique test data

---

## Exit Conditions

**SUCCESS**:
- All tests pass with parallel execution
- Execution time < 6 minutes
- PR created

**BLOCKED**:
- Tests consistently fail due to shared state (ask user)
- IC rate limits prevent parallelization (report findings)
- Test expectations conflict with parallel execution (consult user)

---

## Agent Instructions

**You MUST**:
1. Verify you're in the worktree (run isolation check)
2. Update playwright.config.ts
3. Run tests and iterate until ALL pass
4. Create PR when done
5. Do NOT ask for permission - fix issues autonomously
6. Only ask user if test criterion seems incorrect

**You MUST NOT**:
- Work in main repo
- Skip test verification
- Create PR with failing tests
- Ask "should I continue?" - keep going until done
