# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-canisters-tab-fix/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-canisters-tab-fix/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes only (no backend changes needed):
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Fix]: Canisters Tab Loading for Anonymous Users"
   git push -u origin feature/canisters-tab-anonymous-fix
   gh pr create --title "[Fix]: Canisters Tab Loading for Anonymous Users" --body "Implements CANISTERS_TAB_ANONYMOUS_FIX_PLAN.md

   Fixes Canisters tab to display DAO-controlled canisters for anonymous users (read-only).

   Follows PR #95 Treasury fix patterns:
   - Remove identity requirement from CanisterCard component
   - Handle BigInt for total canister count
   - Pass tokenId instead of stationId to backend
   - Add data-testid attributes for Playwright testing

   Anonymous users can now view:
   - List of canisters controlled by the DAO
   - Canister names, IDs, states, labels
   - Canister metadata (description, created date)

   Anonymous users cannot:
   - Create new canisters
   - Execute canister calls
   - Top up cycles
   - See cycle balances (requires controller access)

   Testing: E2E tests verify canister list loads for anonymous users."
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

**Branch:** `feature/canisters-tab-anonymous-fix`
**Worktree:** `/home/theseus/alexandria/daopad-canisters-tab-fix/src/daopad`

---

# Implementation Plan: Fix Canisters Tab for Anonymous Users

## Problem Statement

The Canisters tab is broken for anonymous (not logged in) users. It should display a read-only list of DAO-controlled canisters, but currently fails to load due to identity dependencies.

This is the **same issue** that was fixed for the Treasury tab in PR #95.

## Current State

### File Structure
```
daopad_frontend/src/
├── components/
│   └── canisters/
│       ├── CanistersTab.tsx          # Main tab component (requires identity)
│       ├── CanisterCard.tsx          # Card display (requires identity - BROKEN)
│       ├── CanisterDetails.tsx       # Detail view
│       ├── CanisterFilters.tsx       # Filter UI
│       ├── CanisterSettings.tsx      # Settings UI
│       └── CanisterSnapshots.tsx     # Snapshots UI
├── routes/dao/
│   └── DaoCanisters.tsx              # Route wrapper
└── services/backend/orbit/canisters/
    └── OrbitCanisterService.ts       # Backend service (misleading param names)

daopad_backend/src/api/
└── orbit_canisters.rs                # Backend methods (ALREADY CORRECT)
```

### Backend Analysis (orbit_canisters.rs)

**GOOD NEWS**: Backend is already correct!

```rust
// Line 22-50: list_orbit_canisters - CORRECT
#[ic_cdk::update]
async fn list_orbit_canisters(
    token_canister_id: Principal,  // ✅ Takes token ID (not station ID)
    filters: ListExternalCanistersInput,
) -> Result<ListExternalCanistersResult, String>

// Line 54-76: get_orbit_canister - CORRECT
#[ic_cdk::update]
async fn get_orbit_canister(
    token_canister_id: Principal,  // ✅ Takes token ID
    canister_principal: Principal,
) -> Result<GetExternalCanisterResult, String>

// Line 225-249: get_canister_status - IC management canister query
// NOTE: Requires controller access - won't work for anonymous users
// Returns String for cycles (already handles BigInt conversion)
#[ic_cdk::update]
async fn get_canister_status(
    canister_id: Principal,
) -> Result<CanisterStatusResponse, String>
```

### Frontend Issues

#### Issue 1: CanistersTab.tsx - Identity Dependency (Line 44)
```javascript
// Line 12: Receives identity prop
export default function CanistersTab({ token, stationId, identity }) {

// Line 44: Requires identity to create service
const result = await getOrbitCanisterService(identity).listCanisters(
  token.canister_id,  // ✅ Correct - passes token ID
  filters
);
```

**Problem**: `getOrbitCanisterService(identity)` requires identity, but anonymous users have `identity = null`.

**Solution**: Pass `identity || null` to service (BackendServiceBase supports null identity).

#### Issue 2: OrbitCanisterService.ts - Misleading Parameter Names (Line 10)
```javascript
// Line 10-14: Parameter named "stationId" but actually means "tokenId"
async listCanisters(stationId, filters = {}) {  // ❌ Misleading name
  const actor = await this.getActor();
  const stationPrincipal = this.toPrincipal(stationId);  // ❌ Misleading name
  const result = await actor.list_orbit_canisters(stationPrincipal, filters);
  // Backend expects token_canister_id, which is what stationId actually is
```

**Problem**: Parameter names suggest `stationId` but backend expects `token_canister_id`. This works but is confusing.

**Solution**: Rename parameters to `tokenId` for clarity (matches PR #95 pattern).

#### Issue 3: CanisterCard.tsx - Undefined Identity (Line 29)
```javascript
// Line 8: Component signature - NO identity prop
const CanisterCard = memo(function CanisterCard({ canister, onTopUp, onConfigure }) {

// Line 29: Uses undefined `identity` variable
const result = await getOrbitCanisterService(identity).getCanisterStatus(
  canister.canister_id
);
```

**Problem**: `identity` variable doesn't exist in component scope - causes ReferenceError.

**Solution**:
1. Accept `identity` as prop: `function CanisterCard({ canister, onTopUp, onConfigure, identity })`
2. Pass `identity || null` to service
3. Gracefully handle cycle balance unavailability (expected for anonymous users)

#### Issue 4: BigInt Conversion (Potential)
```javascript
// CanistersTab line 52-53: Backend returns total as nat64
console.log('Total canisters:', result.total);  // Could be BigInt
setCanisters(filteredCanisters);
```

**Problem**: Similar to PR #95 Treasury fix, if `result.total` is BigInt, it needs conversion.

**Solution**: Add safe BigInt conversion like in PR #95:
```javascript
const total = typeof result.total === 'bigint' ? Number(result.total) : result.total;
```

### DFX Testing Results

```bash
# Test with Orbit Station fec7w-zyaaa-aaaaa-qaffq-cai (ALEX token)
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_external_canisters '(record {
  canister_ids = null;
  labels = null;
  states = null;
  paginate = opt record { offset = opt (0:nat64); limit = opt (20:nat16) };
  sort_by = null;
})'

# Result: ✅ SUCCESS
# - Returns 2 canisters
# - read.auth_scope = variant { Public } ← Anonymous access allowed!
# - total = 2 : nat64 ← BigInt handling needed
# - Returns name, canister_id, state, labels, description, etc.
```

**Key Findings**:
1. ✅ Orbit Station allows anonymous queries (Public auth scope)
2. ✅ Backend already passes token_canister_id correctly
3. ❌ Cycle balances require controller access (won't work for anonymous)
4. ✅ All other canister metadata is public

### What Anonymous Users Should See

**CAN VIEW (Read-Only)**:
- ✅ List of canisters controlled by DAO
- ✅ Canister names, IDs, states (Active/Archived)
- ✅ Canister labels (tags)
- ✅ Canister descriptions
- ✅ Created/modified dates
- ✅ Monitoring status (auto-funding enabled)

**CANNOT VIEW**:
- ❌ Cycle balances (requires controller access)
- ❌ Memory usage (requires controller access)
- ❌ Module hash (requires controller access)

**CANNOT DO**:
- ❌ Create canisters (backend returns error - already disabled)
- ❌ Top up cycles (requires authentication)
- ❌ Execute canister calls (requires authentication)
- ❌ Change canister settings (requires authentication)

## Implementation Plan

### Frontend Changes

#### 1. Fix CanistersTab.tsx (Remove Identity Requirement)

**File**: `daopad_frontend/src/components/canisters/CanistersTab.tsx`

```javascript
// PSEUDOCODE

// Line 44: Remove identity dependency from service call
const fetchCanisters = async () => {
  setLoading(true);
  setError(null);

  try {
    console.log('=== FETCHING CANISTERS ===');
    console.log('Token canister ID:', token.canister_id);

    // FIX: Pass identity || null (anonymous users have null identity)
    const result = await getOrbitCanisterService(identity || null).listCanisters(
      token.canister_id,  // Correct - backend expects token_canister_id
      filters
    );

    if (result.success) {
      // FIX: Handle BigInt conversion for total
      const total = typeof result.total === 'bigint' ? Number(result.total) : result.total;
      console.log('Total canisters:', total);

      // Filter out backend canister from display
      const filteredCanisters = (result.data || []).filter(
        c => c.canister_id !== BACKEND_CANISTER
      );
      setCanisters(filteredCanisters);
    } else {
      setError(result.error);
    }
  } catch (err) {
    console.error('Failed to fetch canisters:', err);
    setError('Failed to load canisters');
  } finally {
    setLoading(false);
  }
};

// Add data-testid for Playwright (similar to PR #95 Treasury fix)
return (
  <div className="space-y-6" data-testid="canisters-tab">
    {/* ... existing UI ... */}

    {canisters.length === 0 ? (
      <div className="text-center py-12" data-testid="canisters-empty-state">
        {/* ... empty state ... */}
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="canisters-grid">
        {canisters.map(canister => (
          <CanisterCard
            key={canister.id}
            canister={canister}
            identity={identity || null}  // FIX: Pass identity prop
            onTopUp={() => handleTopUp(canister.canister_id)}
            onConfigure={() => handleConfigure(canister.canister_id)}
          />
        ))}
      </div>
    )}
  </div>
);
```

**Changes**:
1. Line 44: Pass `identity || null` to service (anonymous support)
2. After line 50: Convert BigInt total to Number
3. Line 163: Pass `identity` prop to CanisterCard
4. Add `data-testid` attributes for E2E testing

#### 2. Fix CanisterCard.tsx (Add Identity Prop)

**File**: `daopad_frontend/src/components/canisters/CanisterCard.tsx`

```javascript
// PSEUDOCODE

// Line 8: Accept identity as prop
const CanisterCard = memo(function CanisterCard({
  canister,
  onTopUp,
  onConfigure,
  identity  // NEW: Add identity prop
}) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!canister?.canister_id) return;

    let isCancelled = false;

    const fetchStatus = async () => {
      // Check if we have permission to view canister status
      if (canister.permissions && canister.permissions.change === false) {
        setStatus({ unavailable: true, reason: 'Not a controller' });
        return;
      }

      setLoading(true);
      try {
        // FIX: Use identity || null (anonymous users have null)
        const result = await getOrbitCanisterService(identity || null).getCanisterStatus(
          canister.canister_id
        );

        if (!isCancelled) {
          if (result.success) {
            setStatus(result.data);
          } else {
            // Expected failure for anonymous users (not controllers)
            setStatus({
              unavailable: true,
              reason: identity ? 'Authorization required' : 'Login to view cycles'
            });
          }
        }
      } catch (error) {
        if (!isCancelled) {
          // Don't log expected authorization errors
          if (!error.message?.includes('controllers') && !error.message?.includes('Only the')) {
            console.error(`Unexpected error fetching IC status:`, error);
          }
          setStatus({
            unavailable: true,
            reason: identity ? 'Cannot fetch' : 'Login to view cycles'
          });
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchStatus();

    return () => {
      isCancelled = true;
    };
  }, [canister?.canister_id, identity]);  // FIX: Add identity to deps

  // Cycles display now handles unavailable state gracefully
  // Lines 111-137: Already has fallback UI for unavailable cycles

  return (
    <Card className="hover:shadow-lg transition-shadow" data-testid={`canister-card-${canister.id}`}>
      {/* ... existing card UI ... */}
      {/* Cycles section already handles status?.unavailable gracefully */}
      {/* Shows "Not a controller" or "Login to view cycles" badge */}
    </Card>
  );
}, (prevProps, nextProps) => {
  // FIX: Add identity to memoization comparison
  return (
    prevProps.canister.id === nextProps.canister.id &&
    prevProps.canister.canister_id === nextProps.canister.canister_id &&
    prevProps.canister.name === nextProps.canister.name &&
    prevProps.identity === nextProps.identity &&  // NEW
    // ... other comparisons ...
  );
});
```

**Changes**:
1. Line 8: Accept `identity` prop
2. Line 29: Use `identity || null` in service call
3. Line 38/48: Better error messages for anonymous users ("Login to view cycles")
4. Line 62: Add `identity` to useEffect deps
5. Line 85: Add `data-testid` attribute
6. Line 213: Add `identity` to memoization comparison

#### 3. Clarify OrbitCanisterService.ts Parameter Names (Optional but Recommended)

**File**: `daopad_frontend/src/services/backend/orbit/canisters/OrbitCanisterService.ts`

```javascript
// PSEUDOCODE

export class OrbitCanisterService extends BackendServiceBase {
  /**
   * List canisters managed by Orbit Station
   * @param {string|Principal} tokenId - Token canister ID (backend looks up station)
   * @param {Object} filters - Optional filters
   */
  async listCanisters(tokenId, filters = {}) {  // FIX: Rename stationId → tokenId
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);  // FIX: Rename variable
      const result = await actor.list_orbit_canisters(tokenPrincipal, filters);
      // Backend: list_orbit_canisters(token_canister_id, filters)
      // Now naming matches!

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: formatOrbitError(result.Err) };
      }
    } catch (error) {
      console.error('Failed to list canisters:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get specific canister details
   * @param {string|Principal} tokenId - Token canister ID
   * @param {string|Principal} canisterId - Canister ID
   */
  async getCanister(tokenId, canisterId) {  // FIX: Rename stationId → tokenId
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);  // FIX: Rename variable
      const canisterPrincipal = this.toPrincipal(canisterId);
      const result = await actor.get_orbit_canister(tokenPrincipal, canisterPrincipal);

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: formatOrbitError(result.Err) };
      }
    } catch (error) {
      console.error('Failed to get canister:', error);
      return { success: false, error: error.message };
    }
  }

  // ... other methods: rename stationId → tokenId in signatures ...
  // Lines 63, 95, 127, 191, 223, 255, 287, 352: All use stationId parameter
  // FIX: Rename all to tokenId for consistency with backend
}
```

**Changes**:
1. Rename all `stationId` parameters to `tokenId` (lines 10, 35, 63, 95, 127, 191, 223, 255, 287, 320, 352)
2. Rename `stationPrincipal` variables to `tokenPrincipal`
3. Update JSDoc comments to clarify "Token canister ID (backend looks up station)"

**Why**: Matches backend method signatures and reduces confusion. The backend receives `token_canister_id` and internally looks up the station.

### Backend Changes

**NONE REQUIRED** ✅

Backend is already correct:
- `list_orbit_canisters` takes `token_canister_id` ✅
- `get_orbit_canister` takes `token_canister_id` ✅
- `get_canister_status` already returns String for cycles ✅
- All modification methods already disabled (return errors) ✅

### Testing Requirements

#### Manual Testing Checklist

1. **Anonymous User - Canister List**:
   ```bash
   # Deploy frontend changes
   ./deploy.sh --network ic --frontend-only

   # Open incognito browser
   # Navigate to https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/dao/7yyrc-6qaaa-aaaap-qhega-cai/canisters
   # Expected: See 2 canisters (frontend + backend test canister)
   # Expected: Cycle balances show "Login to view cycles" badge
   # Expected: All other metadata visible (names, IDs, states, labels)
   ```

2. **Anonymous User - Empty State**:
   ```bash
   # Navigate to a DAO with no canisters
   # Expected: See empty state message
   # Expected: No errors in console
   ```

3. **Authenticated User - Full Access**:
   ```bash
   # Log in with Internet Identity
   # Navigate to canisters tab
   # Expected: See canister list
   # Expected: Can attempt to view cycle balances
   # Expected: Can click "Top Up" and "Manage" buttons
   ```

#### Playwright E2E Test

**File**: `daopad_frontend/e2e/canisters.spec.ts` (NEW)

```javascript
// PSEUDOCODE for E2E test

import { test, expect } from '@playwright/test';

test.describe('Canisters Tab - Anonymous User', () => {
  test('should load canister list for anonymous users', async ({ page }) => {
    // Navigate to ALEX DAO canisters tab (unauthenticated)
    await page.goto('https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/dao/7yyrc-6qaaa-aaaap-qhega-cai/canisters');

    // Wait for canisters tab to load
    await page.waitForSelector('[data-testid="canisters-tab"]', { timeout: 30000 });

    // Should NOT show empty state (ALEX has 2 canisters)
    await expect(page.locator('[data-testid="canisters-empty-state"]')).not.toBeVisible();

    // Should show canister grid
    await expect(page.locator('[data-testid="canisters-grid"]')).toBeVisible();

    // Should have at least 1 canister card (backend filtered out)
    const canisterCards = page.locator('[data-testid^="canister-card-"]');
    await expect(canisterCards).toHaveCount(1, { timeout: 10000 }); // 2 total - 1 filtered = 1

    // Canister cards should show name
    await expect(canisterCards.first().locator('.truncate')).toContainText('Frontend');

    // Cycle balance should show "Login to view cycles" for anonymous
    await expect(canisterCards.first()).toContainText('Login to view cycles');

    // Should have action buttons (disabled for anonymous)
    await expect(canisterCards.first().locator('button:has-text("Top Up")')).toBeVisible();
    await expect(canisterCards.first().locator('button:has-text("Manage")')).toBeVisible();
  });

  test('should handle DAOs with no canisters gracefully', async ({ page }) => {
    // Navigate to a DAO with no external canisters
    await page.goto('https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/dao/OTHER_DAO_ID/canisters');

    // Wait for tab to load
    await page.waitForSelector('[data-testid="canisters-tab"]', { timeout: 30000 });

    // Should show empty state
    await expect(page.locator('[data-testid="canisters-empty-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="canisters-empty-state"]')).toContainText('No canisters yet');
  });

  test('should make successful IC canister network requests', async ({ page }) => {
    const canisterRequests = [];

    // Capture IC canister network requests
    page.on('request', request => {
      const url = request.url();
      if ((url.includes('icp0.io/api') || url.includes('ic0.app/api')) &&
          request.method() === 'POST') {
        canisterRequests.push({
          url,
          canisterId: extractCanisterId(url),
          method: request.method()
        });
      }
    });

    await page.goto('https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/dao/7yyrc-6qaaa-aaaap-qhega-cai/canisters');
    await page.waitForSelector('[data-testid="canisters-grid"]', { timeout: 30000 });

    // Should have made at least 1 call to DAOPad backend (list_orbit_canisters)
    const backendCalls = canisterRequests.filter(r => r.canisterId === 'lwsav-iiaaa-aaaap-qp2qq-cai');
    expect(backendCalls.length).toBeGreaterThanOrEqual(1);
  });
});

function extractCanisterId(url) {
  const match = url.match(/\/api\/v\d+\/canister\/([^/]+)/);
  return match ? match[1] : null;
}
```

**Test Coverage**:
1. ✅ Canister list loads for anonymous users
2. ✅ Canister metadata displays correctly
3. ✅ Cycle balances show "Login to view cycles" message
4. ✅ Empty state handles DAOs with no canisters
5. ✅ Network requests succeed (IC API calls work)

#### Running Tests

```bash
# In daopad_frontend directory
cd daopad_frontend

# Run E2E tests
npx playwright test e2e/canisters.spec.ts

# Run with UI (debug mode)
npx playwright test e2e/canisters.spec.ts --ui

# View test report
npx playwright show-report
```

## Implementation Checklist

- [ ] CanistersTab.tsx: Remove identity requirement (line 44)
- [ ] CanistersTab.tsx: Handle BigInt conversion for total
- [ ] CanistersTab.tsx: Pass identity prop to CanisterCard
- [ ] CanistersTab.tsx: Add data-testid attributes
- [ ] CanisterCard.tsx: Accept identity prop
- [ ] CanisterCard.tsx: Use identity || null in service call
- [ ] CanisterCard.tsx: Update error messages for anonymous users
- [ ] CanisterCard.tsx: Add identity to useEffect deps and memo comparison
- [ ] CanisterCard.tsx: Add data-testid attribute
- [ ] OrbitCanisterService.ts: Rename stationId → tokenId (all methods)
- [ ] Create e2e/canisters.spec.ts test file
- [ ] Run Playwright tests (verify 100% pass)
- [ ] Deploy to mainnet: `./deploy.sh --network ic --frontend-only`
- [ ] Manual test: Anonymous user can view canisters
- [ ] Manual test: Cycle balances show appropriate message
- [ ] Create PR with comprehensive description

## Expected Results

**Before Fix**:
- ❌ Canisters tab: ReferenceError (identity undefined)
- ❌ Anonymous users: Cannot view any canisters
- ❌ Console errors about missing identity

**After Fix**:
- ✅ Canisters tab: Loads successfully for anonymous users
- ✅ Anonymous users: Can view canister list (read-only)
- ✅ Cycle balances: Shows "Login to view cycles" message
- ✅ All metadata: Names, IDs, states, labels visible
- ✅ Action buttons: Visible but disabled/require login
- ✅ E2E tests: 100% pass rate
- ✅ No console errors

## Success Metrics

1. **Playwright E2E Tests**: 100% pass rate (3/3 tests)
2. **Anonymous User Experience**: Can view canister list without login
3. **Error Handling**: Graceful fallbacks for unavailable data (cycles)
4. **Network Requests**: IC API calls succeed for anonymous users
5. **UI/UX**: Matches Treasury tab patterns from PR #95

## References

- **PR #95**: Treasury Dashboard Loading fix (same identity issue)
- **CLAUDE.md**: "Query Method Restriction" section
- **Orbit Station Test**: `fec7w-zyaaa-aaaaa-qaffq-cai` (ALEX token)
- **Backend Methods**: `daopad_backend/src/api/orbit_canisters.rs`
- **Service Base**: `BackendServiceBase` supports null identity

## Risk Assessment

**Risk Level**: ⚠️ LOW

**Rationale**:
- Frontend-only changes (no backend modifications)
- Follows proven PR #95 patterns
- Backend already supports anonymous queries
- Worst case: Canisters tab continues to be broken (no regression risk)
- No breaking changes to existing authenticated user flow

**Rollback Plan**:
```bash
git revert <commit-hash>
./deploy.sh --network ic --frontend-only
```

## Notes for Implementer

1. **Backend is already correct** - Don't modify Rust files
2. **PR #95 is your blueprint** - Follow the same patterns exactly
3. **BigInt handling** - Same as Treasury fix (convert to Number)
4. **Identity || null** - BackendServiceBase supports this
5. **Cycle balances** - Expected to fail for anonymous (not a bug)
6. **Test station available** - Use fec7w-zyaaa-aaaaa-qaffq-cai for dfx testing
7. **Deploy before testing** - E2E tests run against deployed mainnet code
8. **No questions** - Everything is documented, just implement

---

## Deployment & Verification Commands

```bash
# 1. Verify isolation
REPO_ROOT=$(git rev-parse --show-toplevel)
echo "Working in: $REPO_ROOT"

# 2. Build frontend
cd daopad_frontend
npm run build

# 3. Deploy (frontend only)
cd ..
./deploy.sh --network ic --frontend-only

# 4. Run E2E tests
cd daopad_frontend
npx playwright test e2e/canisters.spec.ts

# 5. Manual verification
echo "Open: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/dao/7yyrc-6qaaa-aaaap-qhega-cai/canisters"
echo "Expected: See 1 canister (DAOPad Frontend) with 'Login to view cycles' message"
```

---

**END OF PLAN**
