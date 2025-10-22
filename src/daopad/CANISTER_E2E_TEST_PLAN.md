# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-canister-e2e-test/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-canister-e2e-test/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Deploy & Test**:
   ```bash
   # Deploy to IC mainnet (MANDATORY before testing)
   ./deploy.sh --network ic --frontend-only

   # Run E2E tests
   cd daopad_frontend
   npx playwright test e2e/canisters.spec.ts
   ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Test]: Playwright E2E tests for Canisters tab data flow"
   git push -u origin feature/canister-e2e-test
   gh pr create --title "[Test]: E2E tests for Canisters tab" --body "Implements CANISTER_E2E_TEST_PLAN.md

## Test Coverage
- ✅ Verifies list_orbit_canisters backend call
- ✅ Validates network response format
- ✅ Checks UI renders canister cards with real data
- ✅ Captures console errors and network failures
- ✅ Follows Deploy → Test → Iterate workflow

## Verification
Tests run against deployed IC mainnet code and verify:
1. Backend IC canister calls succeed
2. Data flows from Orbit Station → DAOPad backend → Frontend
3. UI components render real canister data

Follows PLAYWRIGHT_TESTING_GUIDE.md patterns from treasury.spec.ts and app-route.spec.ts."
   ```
5. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view [NUM] --json comments`
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

**Branch:** `feature/canister-e2e-test`
**Worktree:** `/home/theseus/alexandria/daopad-canister-e2e-test/src/daopad`

---

# Implementation Plan: Playwright E2E Tests for Canisters Tab

## Task Classification
**Type**: NEW FEATURE (additive)
**Scope**: E2E test coverage for Canisters tab data flow verification

## Current State Documentation

### File Structure
```
daopad_frontend/
├── e2e/
│   ├── helpers/
│   │   └── auth.ts                    # Auth utilities (EXISTING)
│   ├── treasury.spec.ts               # Treasury E2E tests (EXISTING PATTERN)
│   ├── app-route.spec.ts              # Public dashboard E2E (EXISTING PATTERN)
│   └── canisters.spec.ts              # ← TO BE CREATED
├── src/
│   ├── components/
│   │   ├── canisters/
│   │   │   ├── CanistersTab.tsx       # Main canisters component (EXISTING)
│   │   │   └── CanisterCard.tsx       # Canister display card (EXISTING)
│   │   ├── TokenDashboard.tsx         # Renders CanistersTab (EXISTING)
│   │   └── TokenTabs.tsx              # Token selection (EXISTING)
│   └── services/backend/orbit/canisters/
│       └── OrbitCanisterService.ts    # Backend service (EXISTING)
└── playwright.config.ts               # Playwright config (EXISTING)
```

### Existing Implementation Analysis

#### Data Flow (Backend → Frontend)
```
User clicks "Canisters" tab
  ↓
CanistersTab.tsx:44 calls OrbitCanisterService.listCanisters()
  ↓
Backend: list_orbit_canisters(token_canister_id, filters)
  ↓
Backend calls Orbit Station: list_external_canisters(station_id, filters)
  ↓
Orbit Station returns: ListExternalCanistersResult
  ↓
Frontend receives: { success: true, data: [...canisters], total: N, privileges: [...] }
  ↓
CanistersTab filters out backend canister (lwsav-iiaaa-aaaap-qp2qq-cai)
  ↓
CanisterCard components render with real canister data
```

#### Backend Implementation (daopad_backend/src/api/orbit_canisters.rs)
**Function**: `list_orbit_canisters` (line 23-50)
- **Input**: `token_canister_id: Principal`, `filters: ListExternalCanistersInput`
- **Output**: `Result<ListExternalCanistersResult, String>`
- **Candid method**: `list_external_canisters` on Orbit Station
- **Note**: This is a query method wrapped in an update call (IC limitation)

#### Frontend Service (src/services/backend/orbit/canisters/OrbitCanisterService.ts)
**Method**: `listCanisters` (line 10-28)
- **Input**: `stationId` (string|Principal), `filters` (object)
- **Output**: `{ success: boolean, data?: array, error?: string }`
- **Backend call**: `actor.list_orbit_canisters(stationPrincipal, filters)`

#### Component Implementation (src/components/canisters/CanistersTab.tsx)
**Key behaviors** (line 29-71):
- Fetches canisters on mount and filter change
- Filters out backend canister from display (line 57-59)
- Shows loading skeleton during fetch (line 136-141)
- Shows empty state if no canisters (line 142-159)
- Renders CanisterCard grid if data loaded (line 161-171)
- Logs extensively to console for debugging (line 40-54, 62-63)

#### Test Token Setup
**ALEX Token**:
- Token ID: `ysy5f-2qaaa-aaaap-qkmmq-cai`
- Orbit Station: `fec7w-zyaaa-aaaaa-qaffq-cai`
- Route: `/dao/ysy5f-2qaaa-aaaap-qkmmq-cai`
- Has registered canisters in Orbit Station (expected)

### Existing E2E Test Patterns

#### Pattern 1: treasury.spec.ts (Network + UI verification)
**Key patterns**:
- Captures console errors in `beforeEach` (line 16-27)
- Monitors network responses for backend calls (line 29-51)
- Dumps captured data on test failure in `afterEach` (line 56-78)
- Verifies backend method calls succeed (line 214-236)
- Checks response data format (line 238-264)
- Validates UI renders real data (line 100-119, 121-135)

#### Pattern 2: app-route.spec.ts (Redux monitoring)
**Key patterns**:
- Injects Redux dispatch spy (line 72-92)
- Captures Redux action log on failure (line 117-129)
- Verifies Redux action sequence (pending → fulfilled) (line 209-238)
- Checks for rejected actions (line 227-230)
- Tests polling behavior (line 312-335)

#### Common Anti-Patterns to Avoid (from PLAYWRIGHT_TESTING_GUIDE.md)
❌ Testing local code without deploying
❌ Surface-level assertions (element exists without data verification)
❌ Stopping at first failure without iteration
❌ Insufficient test instrumentation

## Implementation Plan (Pseudocode)

### File: `daopad_frontend/e2e/canisters.spec.ts` (NEW)

```typescript
// PSEUDOCODE - Implementer writes real TypeScript

import { test, expect, Page } from '@playwright/test';
import { authenticateForTests } from './helpers/auth';

// Test state capture
const consoleMessages: Array<{type: string, text: string}> = [];
const consoleErrors: Array<string> = [];
const networkRequests: Array<{url: string, status: number, response: string}> = [];
const canisterAPICalls: Array<{url: string, status: number, response: string}> = [];

test.describe('Canisters Tab - E2E Data Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Clear capture arrays
    // Set up console monitoring
    // Set up network response capture
    //   - Capture calls to list_orbit_canisters
    //   - Capture calls to ic0.app/api (IC network calls)
    //   - Log backend canister calls specifically
    // Authenticate user
    await authenticateForTests(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    // If test failed:
    //   - Log console errors
    //   - Log canister API calls with responses
    //   - Take screenshot
    // Clear arrays
  });

  test('should load Canisters tab without console errors', async ({ page }) => {
    // Navigate to ALEX token page
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Alexandria")');

    // Click Canisters tab
    await page.click('[data-testid="canisters-tab"]');

    // Wait for canisters to load (skeleton disappears or cards appear)
    await page.waitForSelector('[data-testid="canister-card"]', {
      timeout: 30000,
      state: 'visible'
    });

    // Verify no console errors
    expect(consoleErrors.length).toBe(0);
  });

  test('should successfully call list_orbit_canisters backend method', async ({ page }) => {
    // Set up specific capture for list_orbit_canisters
    let canisterListResponse: any = null;

    page.on('response', async (response) => {
      if (response.url().includes('list_orbit_canisters')) {
        const text = await response.text();
        canisterListResponse = { status: response.status(), data: text };
      }
    });

    // Navigate and click tab
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.click('[data-testid="canisters-tab"]');

    // Wait for response
    await page.waitForTimeout(10000);

    // Verify backend was called
    expect(canisterListResponse).not.toBeNull();
    expect(canisterListResponse.status).toBe(200);

    // Verify response format
    const parsed = JSON.parse(canisterListResponse.data);
    expect(parsed.Ok).toBeDefined();
    expect(Array.isArray(parsed.Ok.canisters || parsed.Ok.data)).toBe(true);
  });

  test('should render canister cards with real data', async ({ page }) => {
    // Navigate to ALEX token
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.click('[data-testid="canisters-tab"]');

    // Wait for canister cards to appear
    await page.waitForSelector('[data-testid="canister-card"]', {
      timeout: 30000
    });

    // Get all canister cards
    const canisterCards = await page.$$('[data-testid="canister-card"]');

    // Should have at least 1 canister (assuming ALEX Orbit has registered canisters)
    expect(canisterCards.length).toBeGreaterThan(0);

    // Verify first card has real data (not loading/empty state)
    const firstCard = canisterCards[0];
    const cardText = await firstCard.textContent();

    // Should contain canister ID or name
    expect(cardText).not.toContain('Loading');
    expect(cardText).toBeTruthy();

    console.log(`Found ${canisterCards.length} canisters displayed`);
  });

  test('should handle empty canisters state gracefully', async ({ page }) => {
    // Navigate to a token that might not have canisters
    // OR test the empty state message appears correctly
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.click('[data-testid="canisters-tab"]');

    // Wait for either canisters or empty state
    await Promise.race([
      page.waitForSelector('[data-testid="canister-card"]', { timeout: 30000 }),
      page.waitForSelector('text=No canisters yet', { timeout: 30000 })
    ]);

    // If empty state shown, verify it's intentional
    const hasEmptyState = await page.locator('text=No canisters yet').count() > 0;
    const hasCanisterCards = await page.$$('[data-testid="canister-card"]').length > 0;

    // Should show either empty state OR canister cards (not stuck loading)
    expect(hasEmptyState || hasCanisterCards).toBe(true);

    // Should not show error
    const hasError = await page.locator('[role="alert"]').count() > 0;
    expect(hasError).toBe(false);
  });

  test('should filter out backend canister from display', async ({ page }) => {
    // Navigate to ALEX token
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.click('[data-testid="canisters-tab"]');

    await page.waitForTimeout(5000);

    // Get all canister cards
    const canisterCards = await page.$$('[data-testid="canister-card"]');

    // Check that none of them contain the backend canister ID
    const BACKEND_CANISTER = 'lwsav-iiaaa-aaaap-qp2qq-cai';

    for (const card of canisterCards) {
      const text = await card.textContent();
      expect(text).not.toContain(BACKEND_CANISTER);
    }

    console.log('✅ Backend canister correctly filtered from display');
  });

  test('should capture network layer data flow', async ({ page }) => {
    // Track the complete data flow
    const networkFlow: any[] = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('list_orbit_canisters') ||
          url.includes('ic0.app/api')) {
        networkFlow.push({
          url: url,
          status: response.status(),
          timestamp: Date.now()
        });
      }
    });

    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.click('[data-testid="canisters-tab"]');
    await page.waitForTimeout(10000);

    // Should have made IC network calls
    expect(networkFlow.length).toBeGreaterThan(0);

    // All should succeed
    const failed = networkFlow.filter(f => f.status >= 400);
    expect(failed.length).toBe(0);

    console.log(`Network flow: ${networkFlow.length} calls, all successful`);
  });

  test('should not show loading spinner indefinitely', async ({ page }) => {
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.click('[data-testid="canisters-tab"]');

    // Wait for loading to complete
    // Either skeleton disappears OR content appears
    await Promise.race([
      page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 30000 }),
      page.waitForSelector('[data-testid="canister-card"]', { timeout: 30000 }),
      page.waitForSelector('text=No canisters yet', { timeout: 30000 })
    ]);

    // Should not be stuck in loading state
    const stillLoading = await page.locator('.animate-pulse').count() > 0;
    expect(stillLoading).toBe(false);
  });
});

// Network verification describe block
test.describe('Canisters Network Requests', () => {

  test('should receive canister data in correct format', async ({ page }) => {
    let canisterResponse: any = null;

    page.on('response', async (response) => {
      if (response.url().includes('list_orbit_canisters')) {
        try {
          const text = await response.text();
          canisterResponse = JSON.parse(text);
        } catch (e) {
          console.error('Failed to parse response:', e);
        }
      }
    });

    await authenticateForTests(page);
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai');
    await page.click('[data-testid="canisters-tab"]');
    await page.waitForTimeout(10000);

    // Verify response structure
    expect(canisterResponse).not.toBeNull();
    expect(canisterResponse.Ok).toBeDefined();

    // Check for expected fields in Orbit Station response
    // Format: { Ok: { canisters: [...], total: N, privileges: [...] } }
    // OR: { Ok: [...] } (array directly)
    const hasData = canisterResponse.Ok.canisters ||
                    canisterResponse.Ok.data ||
                    Array.isArray(canisterResponse.Ok);
    expect(hasData).toBeTruthy();

    console.log('Response format validated:', JSON.stringify(canisterResponse).substring(0, 300));
  });
});
```

### Required Component Updates

#### File: `daopad_frontend/src/components/canisters/CanistersTab.tsx`
**Add test IDs** (non-breaking changes):

```typescript
// Line 113-119 (Header section)
<div>
  <h2
    className="..."
    data-testid="canisters-header"  // ADD
  >
    <Server className="h-6 w-6" />
    External Canisters
  </h2>
  ...
</div>

// Line 162-169 (Canister cards)
{canisters.map(canister => (
  <div key={canister.id} data-testid="canister-card">  // WRAP or ADD
    <CanisterCard
      canister={canister}
      onTopUp={() => handleTopUp(canister.canister_id)}
      onConfigure={() => handleConfigure(canister.canister_id)}
    />
  </div>
))}
```

#### File: `daopad_frontend/src/components/TokenDashboard.tsx`
**Add test ID for tab** (line ~386):

```typescript
<TabsTrigger
  variant="executive"
  value="canisters"
  data-testid="canisters-tab"  // ADD
>
  Canisters
</TabsTrigger>
```

## Testing Strategy

### Phase 1: Deploy & Initial Test
```bash
# In worktree: /home/theseus/alexandria/daopad-canister-e2e-test/src/daopad

# Deploy to IC mainnet
./deploy.sh --network ic --frontend-only

# Run new E2E test
cd daopad_frontend
npx playwright test e2e/canisters.spec.ts

# Expected: May fail initially - capture artifacts
```

### Phase 2: Iterate on Failures
**If tests fail**:
1. Check screenshot in `test-results/` for visual state
2. Review console errors in test output
3. Verify network requests captured correct backend calls
4. Form hypothesis about failure cause
5. Add targeted logging to components if needed
6. Deploy again and re-test
7. Repeat until tests pass (max 5-7 iterations)

### Phase 3: Validation Checklist
After tests pass, verify:
- [ ] Tests run against deployed IC mainnet code
- [ ] Backend `list_orbit_canisters` method called successfully
- [ ] Network responses have correct format (Ok/Err variants)
- [ ] UI renders real canister data from backend
- [ ] Console errors = 0 during test run
- [ ] Screenshots show properly rendered canister cards
- [ ] Empty state handled gracefully if no canisters
- [ ] Backend canister filtered from display

## Dependencies & Constraints

### IC Platform Limitations
- **Query method restriction**: `list_orbit_canisters` must be `#[update]` because it calls another canister's query method
- **CORS**: Tests must hit deployed canister URL, not local dev server
- **Authentication**: Tests use real Internet Identity via `authenticateForTests()`

### Data Dependencies
- **ALEX token** must have Orbit Station registered
- **Orbit Station** must have at least 0-N external canisters registered
- Tests handle both "has canisters" and "no canisters" states

### Test Isolation
- Tests DO NOT modify data (read-only verification)
- Multiple test runs should produce same results
- Tests against live mainnet data (not mocked)

## Success Criteria

### ✅ Tests Pass After Deployment
```bash
./deploy.sh --network ic --frontend-only
cd daopad_frontend
npx playwright test e2e/canisters.spec.ts

# Output:
# ✓ should load Canisters tab without console errors
# ✓ should successfully call list_orbit_canisters backend method
# ✓ should render canister cards with real data
# ✓ should handle empty canisters state gracefully
# ✓ should filter out backend canister from display
# ✓ should capture network layer data flow
# ✓ should not show loading spinner indefinitely
# ✓ should receive canister data in correct format
# All tests passed (8/8)
```

### ✅ Three-Layer Verification
1. **Network**: Backend canister called, 200 response, valid Orbit Station data
2. **Component**: React component fetches, filters, and displays data correctly
3. **UI**: User sees real canister cards with data from Orbit Station

### ✅ Test Quality Metrics
- Console error count: 0
- Network request failures: 0
- Data format validation: Pass
- UI rendering verification: Pass
- Test artifacts captured on failure: Yes
- Deploy → Test → Iterate workflow followed: Yes

## Verification Commands

### Check if ALEX Orbit has canisters (optional debugging)
```bash
# From main repo (NOT worktree)
export STATION="fec7w-zyaaa-aaaaa-qaffq-cai"

dfx canister --network ic call $STATION list_external_canisters '(record {
  canister_ids = opt vec {};
  labels = opt vec {};
  states = opt vec {};
  paginate = opt record { offset = 0:nat64; limit = 20:nat64 };
  sort_by = opt vec {};
})'
```

### Run tests locally (after deploy)
```bash
cd /home/theseus/alexandria/daopad-canister-e2e-test/src/daopad/daopad_frontend
npx playwright test e2e/canisters.spec.ts --headed  # See browser
npx playwright test e2e/canisters.spec.ts --debug   # Step through
```

## Rollback Plan

If tests reveal breaking issues:
1. Tests themselves don't modify code - safe to run
2. Only added test IDs (`data-testid`) to existing components
3. Can remove test file and test IDs without affecting functionality
4. No backend changes required (only testing existing endpoints)

## Post-Implementation

After PR is merged:
1. Add canisters.spec.ts to CI/CD pipeline
2. Run tests after every mainnet deployment
3. Use test failures to catch regressions early
4. Extend tests for future canister management features (create, configure, fund)

## Notes

- **Pattern source**: treasury.spec.ts and app-route.spec.ts
- **Guide reference**: PLAYWRIGHT_TESTING_GUIDE.md
- **Deploy first**: Always `./deploy.sh --network ic` before testing
- **Iterate**: 5-7 deploy→test cycles is normal for new tests
- **Evidence-based**: Tests verify actual data flow, not surface elements
