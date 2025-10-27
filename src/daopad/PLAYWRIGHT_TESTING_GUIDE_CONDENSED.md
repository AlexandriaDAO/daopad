# Playwright Testing Guide (Condensed)

## 🎯 Purpose: Autonomous Frontend Verification

**Why this exists**: So agents can see console errors from inter-canister calls, type conversion failures, and UI display bugs WITHOUT requiring you to manually check browser logs and copy/paste errors.

**Core workflow**: Agent makes changes → deploys → runs Playwright → reads console errors from logs → fixes autonomously → repeats until tab works.

---

## 🚨 CRITICAL: The #1 Agent Failure

**Problem**: Agents run Playwright tests but NEVER read the console errors captured in the output.

**Real Pattern** (happens in EVERY failed PR):
```bash
# Agent runs test
npx playwright test 2>&1 | tee /tmp/playwright-output.log

# Agent checks ONLY the summary
tail -100 /tmp/playwright-output.log | grep "passed\|failed"
# Output: "41 passed, 21 failed"

# Agent guesses what's broken, makes a fix, deploys again
# Same failures persist because agent never saw the actual errors

# User finally pastes error from browser console
# Agent: "Oh! I didn't know about that error!"
# THE ERROR WAS ALREADY IN THE LOG FILE!
```

**What you get by reading the logs**:
```
=== CONSOLE ERRORS ===
1. SyntaxError: invalid BigInt syntax (orbitSlice.ts:99)
2. TypeError: can't convert BigInt to number (AccountsTable.tsx:297)
3. Candid decode failed: Not a valid visitor for Option<Vec<T>>

=== WHICH METHODS FAILED ===
- list_orbit_requests (Option<Vec<RequestStatusCode>>)
- get_orbit_system_info (Option<DisasterRecovery>)
```

**Result**: See ALL bugs at once instead of one-per-iteration.

---

## 🔄 Mandatory Agent Workflow

### Step 1: Deploy Changes
```bash
./deploy.sh --network ic --frontend-only  # Or --backend-only or both
```

### Step 2: Run Playwright with Log Capture
```bash
cd daopad_frontend

# Create timestamped log file
LOG_FILE="/tmp/playwright-$(date +%s).log"

# Run tests for the specific tab you modified
npx playwright test e2e/[tab-name].spec.ts --project=chromium 2>&1 | tee $LOG_FILE

# WAIT FOR COMPLETION - Even if tests timeout (2+ minutes)
# Never kill early or you lose console errors!
```

### Step 3: MANDATORY - Read Console Errors (DO NOT SKIP)
```bash
# Extract ALL console errors
echo "=== CONSOLE ERRORS FROM PLAYWRIGHT ==="
grep -B5 -A20 "Browser Console Error" $LOG_FILE | tee /tmp/console-errors.txt

# Read what the errors say
cat /tmp/console-errors.txt

# Extract Candid deserialization errors
echo "=== CANDID ERRORS ==="
grep -A5 "Not a valid visitor" $LOG_FILE
grep -A5 "Invalid record" $LOG_FILE
grep -A5 "Candid" $LOG_FILE

# Find which backend methods failed
echo "=== FAILED BACKEND METHODS ==="
grep "Method:" $LOG_FILE | sed 's/.*Method: \([^ ]*\).*/\1/' | sort -u

# Find problematic types
echo "=== PROBLEMATIC TYPES ==="
grep "TypeId.*name:" $LOG_FILE | sed 's/.*name: "\([^"]*\)".*/\1/' | sort -u
```

**DO NOT proceed to Step 4 until you've READ the output from these commands!**

### Step 4: Manual Browser Verification (Redundant Check)
```bash
# Open the tab you modified in incognito browser
open "https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/[tab]"

# Open DevTools Console (F12)
# Verify the errors match what Playwright captured
# If Playwright missed errors, browser console is source of truth
```

### Step 5: Fix ALL Errors Found
```typescript
// Don't fix one error at a time!
// If you found 5 distinct errors in Step 3, fix ALL 5 together:

// Example from real PR that took 5 iterations (should have been 1):
// 1. Option<Vec<RequestStatusCode>> → candid::encode_one(&statuses)
// 2. Option<RequestPolicyRule> → candid::encode_one(&policy)
// 3. Option<DisasterRecovery> → candid::encode_one(&recovery)
// 4. Option<u64> → Some(value.clone()) not Some(*value)
// 5. Option<PaginationInput> → candid::encode_one(&pagination)
```

### Step 6: Commit, Push, Deploy, Test (Repeat)
```bash
git add .
git commit -m "Fix: [describe ALL errors fixed]"
git push

./deploy.sh --network ic --frontend-only

# Go back to Step 2 (run tests again)
# Maximum 5 iterations - if still failing after 5, escalate
```

---

## 🎯 When Tests Pass: Success Criteria

**Agent should declare success when**:
1. ✅ Playwright test for the tab passes (X/X passed)
2. ✅ Manual browser check shows data loading (not stuck, not empty when shouldn't be)
3. ✅ Console (both Playwright logs and browser DevTools) shows ZERO errors

**Use common sense** - If the basic tab functionality works (data loads, displays, no errors), that's sufficient.

---

## ⚠️ Critical Rules

### NEVER Kill Tests Early
```bash
# ❌ BAD - Kills test when it starts timing out
npx playwright test
# Test times out... press Ctrl+C
# Result: No console errors captured, no failure details

# ✅ GOOD - Wait for completion
npx playwright test
# Even if it takes 2+ minutes, LET IT FINISH
# Wait for: "X passed, Y failed" summary
# Console errors appear AFTER test completes
```

### ALWAYS Read Error Logs Before Fixing
```bash
# ❌ BAD workflow
Run test → See "21 failed" → Guess what's wrong → Fix → Deploy → Repeat

# ✅ GOOD workflow
Run test → grep console errors → Read ALL errors → Fix all together → Deploy → Test passes
```

### Backend Changes ALWAYS Run Playwright
Even if you only changed backend code:
- Candid interface changes break frontend
- Type mismatches cause deserialization errors
- Option<T> encoding changes silently fail

**Rule**: After ANY backend deploy, run Playwright tests to verify frontend still works.

### Focus on Your Tab Only
If you're fixing the Treasury tab:
```bash
# Run only treasury tests
npx playwright test e2e/treasury.spec.ts --project=chromium

# Don't worry about other tabs unless your changes affect them
```

---

## 📋 Test File Requirements

Every test MUST verify data flow, not just UI existence:

```typescript
import { test, expect } from '@playwright/test';
import { createDataVerifier } from './helpers/data-verifier';

test('treasury tab loads data', async ({ page }) => {
  // STEP 1: Create data verifier (MANDATORY)
  const verify = createDataVerifier(page);

  // STEP 2: Navigate to tab
  await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/treasury');

  // STEP 3: Wait for async operations
  await page.waitForTimeout(5000);

  // STEP 4: Verify no console errors (MANDATORY)
  verify.assertNoConsoleErrors();

  // STEP 5: Verify backend success (MANDATORY)
  verify.assertBackendSuccess();

  // STEP 6: Verify UI displays data
  await expect(page.locator('[data-testid="content"]')).toBeVisible();
});
```

**If test lacks `verify.assertNoConsoleErrors()` and `verify.assertBackendSuccess()`, it's invalid** - it gives false confidence.

---

## 🐛 Common Error Patterns & Fixes

### 1. Candid Option<T> Deserialization
**Error**: `Not a valid visitor: TypeId { name: "OptionVisitor<Vec<T>>" }`

**Fix**: Encode Optional fields properly in backend:
```rust
// ❌ WRONG
statuses: Some(vec![...])  // Frontend can't deserialize

// ✅ CORRECT
statuses: candid::encode_one(&Some(vec![...])).ok()
```

### 2. BigInt Conversion Errors
**Error**: `TypeError: can't convert BigInt to number`

**Fix**: Convert at source in Redux slice:
```typescript
// ❌ WRONG
const amount = account.balance;  // BigInt from backend

// ✅ CORRECT
const amount = typeof account.balance === 'bigint'
  ? Number(account.balance)
  : account.balance;
```

### 3. Method Not Found
**Error**: `TypeError: actor.method_name is not a function`

**Fix**: Sync declarations after backend changes:
```bash
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
./deploy.sh --network ic --backend-only

# CRITICAL: Manual sync
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

./deploy.sh --network ic --frontend-only
```

### 4. Wrong Token ID in Tests
**Error**: Tests timeout (30s+) even though code is correct

**Fix**: Always use ALEX token for all tests:
```typescript
// ✅ CORRECT token/frontend/station IDs
const BASE_URL = 'https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io';  // Frontend
const TOKEN_ID = 'ysy5f-2qaaa-aaaap-qkmmq-cai';  // ALEX token
const STATION_ID = 'fec7w-zyaaa-aaaaa-qaffq-cai';  // Orbit Station

await page.goto(`${BASE_URL}/dao/${TOKEN_ID}/treasury`);
```

---

## 🔁 Autonomous Iteration Loop

```
FOR iteration = 1 TO 5:

  1. Deploy changes
     ./deploy.sh --network ic --frontend-only

  2. Run Playwright with logging
     LOG_FILE="/tmp/playwright-$(date +%s).log"
     npx playwright test e2e/[tab].spec.ts 2>&1 | tee $LOG_FILE

  3. MANDATORY: Read console errors (DO NOT SKIP)
     grep -A20 "Browser Console Error" $LOG_FILE

  4. IF zero console errors AND tests pass:
       - Manual browser verification (open URL, check DevTools)
       - IF browser also clean: SUCCESS, exit loop

  5. IF console errors found:
       - Extract ALL distinct errors
       - Fix ALL errors together (not one at a time)
       - git add . && git commit -m "Fix: [errors]" && git push
       - Continue to next iteration

  6. IF iteration = 5 AND still failing:
       - Comment on PR with findings
       - Request human help
       - EXIT

END FOR
```

**NO QUESTIONS ALLOWED**: Make best judgment, fix, iterate. Only escalate after 5 iterations.

---

## 📊 What Success Looks Like

**Bad Outcome** (agent failed):
- User has to paste console errors to agent
- Agent says "I didn't know about that error"
- Multiple iterations fixing one error at a time
- 5+ deployments for issues that should have been caught in one test run

**Good Outcome** (agent succeeded):
- Agent runs tests, reads logs, finds all errors autonomously
- Agent presents: "Found 5 distinct Candid errors affecting these methods..."
- Agent makes one comprehensive fix addressing all errors
- One deployment, all errors resolved, tab works

---

## 🎓 Key Principles

1. **Tests run against deployed code** - Local changes don't affect IC canisters
2. **Always deploy before testing** - Playwright hits live URLs, not local files
3. **Never kill tests early** - Console errors appear AFTER test completes
4. **Read logs before fixing** - Don't guess, see actual errors
5. **Fix all errors together** - One iteration, not five
6. **Backend changes need frontend tests** - Candid changes break silently
7. **Manual browser is source of truth** - If Playwright capture fails, browser console wins

---

## 📁 Test Organization

```
daopad_frontend/
├── e2e/
│   ├── helpers/
│   │   └── data-verifier.ts       # Mandatory helper
│   ├── treasury.spec.ts            # Treasury tab tests
│   ├── settings.spec.ts            # Settings tab tests
│   ├── canisters.spec.ts           # Canisters tab tests
│   └── activity.spec.ts            # Activity tab tests
└── playwright.config.ts
```

**Focus on the tab you're modifying** - Don't worry about other tabs unless your changes affect shared components.

---

## 🚨 Anti-Patterns (What NOT To Do)

❌ **Running tests without reading output**
```bash
npx playwright test
# See "21 failed"
# Immediately start guessing what's wrong
```

❌ **Fixing one error per iteration**
```bash
Iteration 1: Fix Option<Vec<T>> → Deploy → Test
Iteration 2: Fix Option<DisasterRecovery> → Deploy → Test
Iteration 3: Fix Option<u64> → Deploy → Test
# Should have been ONE iteration fixing all three!
```

❌ **Trusting test pass without verification**
```bash
# Tests pass ✅
# But you never checked browser console
# Might have errors Playwright didn't capture
```

❌ **Skipping Playwright after backend changes**
```bash
# "I only changed Rust code, frontend should be fine"
# Deploys backend
# Doesn't test frontend
# Candid decode errors now breaking every API call
```

---

## 🎯 Summary: Your Job As Agent

1. **Make changes** to fix/implement feature
2. **Deploy** to IC mainnet (`./deploy.sh --network ic`)
3. **Run Playwright** with log capture for your tab
4. **Read console errors** using grep commands (MANDATORY)
5. **Also check browser** manually (redundant verification)
6. **Fix ALL errors** found (not one at a time)
7. **Commit, push, deploy, test** again
8. **Repeat** until tests pass AND browser clean (max 5 iterations)
9. **Only then** declare success

**The goal**: Autonomous error detection and fixing WITHOUT requiring human to check browser logs and copy/paste errors.

**The metric**: User should NEVER have to paste console errors to you. You should find them yourself in Playwright logs.
