# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-fix-admin-tests/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-fix-admin-tests/src/daopad`
2. **Implement fixes** - Follow fix sections below
3. **Build & Deploy**:
   ```bash
   cargo build --target wasm32-unknown-unknown --release -p daopad_backend
   candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
   ./deploy.sh --network ic
   ```
4. **Run Playwright tests**:
   ```bash
   cd daopad_frontend
   npx playwright test
   # Target: All 72 tests passing (currently 41 pass, 21 fail, 10 skip)
   ```
5. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Fix]: Restore all 72 Playwright tests after admin canister separation"
   git push -u origin feature/fix-admin-canister-tests
   gh pr create --title "[Fix]: Restore All Playwright Tests After Admin Separation" --body "Implements FIX-ADMIN-TESTS-PLAN.md"
   ```
6. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Run tests: `cd daopad_frontend && npx playwright test`
     - Count failures
     - IF failures > 0: Analyze logs, fix, deploy, commit, push, sleep 300s, continue
     - IF failures = 0: Report success, EXIT
   - After 5 iterations: Escalate to human

## CRITICAL RULES
- ❌ NO questions ("should I?", "want me to?", "is it done?")
- ❌ NO skipping PR creation - it's MANDATORY
- ❌ NO stopping after implementation - create PR immediately
- ✅ After sleep: IMMEDIATELY continue (no pause)
- ✅ ONLY stop at: all tests passing, max iterations, or fatal error

**Branch:** `feature/fix-admin-canister-tests`
**Worktree:** `/home/theseus/alexandria/daopad-fix-admin-tests/src/daopad`

---

# Fix All Playwright Tests After Admin Canister Separation

## Problem Summary

PR #115 (admin canister separation) broke **21 out of 72 Playwright tests**. The merge introduced two critical backend errors:

1. **`get_dao_overview` - "Call already trapped"** (ic-cdk-executor panic)
2. **`list_orbit_requests` - Candid deserialization error** with `ListRequestsSortBy`

## Current State

### Test Results (Before Fix)
```
✅ 41 passed
❌ 21 failed
⏭️ 10 skipped

Total: 72 tests
Success rate: 57%
```

### Failed Test Categories
1. **Settings tab** (7 failures) - all anonymous user access tests
2. **Treasury tests** (11 failures) - authenticated data pipeline tests
3. **Canisters tab** (1 failure) - anonymous user test
4. **Manual auth** (1 failure) - authentication setup
5. **Activity tab** (1 failure) - implicit via console errors

### Critical Backend Errors

#### Error 1: `get_dao_overview` - Re-entrant Call Panic
```
Error: Panicked at 'Call already trapped',
/home/theseus/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/ic-cdk-executor-0.1.0/src/lib.rs:95:13
```

**Location:** `daopad_backend/src/api/orbit_overview.rs:67`

**Root Cause:**
```rust
// ❌ BROKEN CODE - Uses futures::join! for parallel calls
let (accounts_result, users_result, system_info_result, assets_result) =
    futures::join!(accounts_future, users_future, system_info_future, assets_future);
```

IC CDK **does not support concurrent inter-canister calls** within a single update context. The `futures::join!` macro attempts to poll multiple futures simultaneously, which triggers IC's re-entrant call protection, causing a trap.

**Impact:** Every page that calls `getDaoOverview()` shows this console error. Tests that verify console cleanliness fail.

#### Error 2: `list_orbit_requests` - Candid Deserialization Panic
```
Error: Panicked at 'Not a valid visitor: TypeId {
  id: 70,
  name: "serde_core::de::impls::OptionVisitor<daopad_backend::api::orbit_requests::ListRequestsSortBy>"
}', /home/theseus/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/candid-0.10.18/src/de.rs:599:17
```

**Location:** `daopad_backend/src/api/orbit_requests.rs:485`

**Root Cause:**
```rust
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ListRequestsInput {
    // ... other fields ...
    pub sort_by: Option<ListRequestsSortBy>,  // ❌ PROBLEMATIC FIELD
    pub only_approvable: bool,
    pub with_evaluation_results: bool,
    // ...
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum ListRequestsSortBy {
    CreatedAt(SortByDirection),
    ExpirationDt(SortByDirection),
    LastModificationDt(SortByDirection),
}
```

The Candid deserializer cannot handle `Option<ListRequestsSortBy>` when the frontend passes `null` or omits the field. This is a known Candid limitation with nested enums in Option types.

**Impact:** Activity tab completely broken - cannot fetch any proposals. All activity-related tests fail.

### Why These Errors Weren't Caught Before Merge

1. **No pre-deploy testing**: PR #115 was created and merged without deploying to IC mainnet first
2. **No Playwright CI**: Tests only run manually, not in PR workflow
3. **Silent failures**: Both errors occur in background data fetching, don't prevent page render
4. **Test resilience**: Some tests pass despite console errors because they have fallback logic

---

## Implementation Plan

### Fix 1: Replace `futures::join!` with Sequential Awaits

**File:** `daopad_backend/src/api/orbit_overview.rs`

**Line:** 59-67

**Change:**
```rust
// BEFORE (❌ BROKEN - Causes "Call already trapped")
let accounts_future = list_accounts_call(station_id);
let users_future = list_users_call(station_id);
let system_info_future = system_info_call(station_id);
let assets_future = list_assets_call(station_id);

let (accounts_result, users_result, system_info_result, assets_result) =
    futures::join!(accounts_future, users_future, system_info_future, assets_future);

// AFTER (✅ WORKS - Sequential calls)
let accounts_result = list_accounts_call(station_id).await;
let users_result = list_users_call(station_id).await;
let system_info_result = system_info_call(station_id).await;
let assets_result = list_assets_call(station_id).await;
```

**Rationale:**
- IC CDK only supports one inter-canister call at a time per update context
- Sequential calls are slower but guaranteed to work
- Performance impact: ~3-4 seconds instead of ~1 second (still acceptable for dashboard load)
- This is the standard pattern across all DAOPad backend code

**Side Effect:** Remove `futures` dependency from Cargo.toml if no longer used elsewhere.

### Fix 2: Make `sort_by` Non-Optional with Default Value

**File:** `daopad_backend/src/api/orbit_requests.rs`

**Line:** 475-490

**Option A: Make field required (RECOMMENDED)**
```rust
// BEFORE (❌ BROKEN)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ListRequestsInput {
    pub requester_ids: Option<Vec<UUID>>,
    pub approver_ids: Option<Vec<UUID>>,
    pub statuses: Option<Vec<RequestStatusCode>>,
    pub operation_types: Option<Vec<ListRequestsOperationType>>,
    pub expiration_from_dt: Option<TimestampRFC3339>,
    pub expiration_to_dt: Option<TimestampRFC3339>,
    pub created_from_dt: Option<TimestampRFC3339>,
    pub created_to_dt: Option<TimestampRFC3339>,
    pub paginate: Option<PaginationInput>,
    pub sort_by: Option<ListRequestsSortBy>,  // ❌ PROBLEMATIC
    pub only_approvable: bool,
    pub with_evaluation_results: bool,
    pub deduplication_keys: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
}

// AFTER (✅ WORKS - Required field with default)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ListRequestsInput {
    pub requester_ids: Option<Vec<UUID>>,
    pub approver_ids: Option<Vec<UUID>>,
    pub statuses: Option<Vec<RequestStatusCode>>,
    pub operation_types: Option<Vec<ListRequestsOperationType>>,
    pub expiration_from_dt: Option<TimestampRFC3339>,
    pub expiration_to_dt: Option<TimestampRFC3339>,
    pub created_from_dt: Option<TimestampRFC3339>,
    pub created_to_dt: Option<TimestampRFC3339>,
    pub paginate: Option<PaginationInput>,
    pub sort_by: ListRequestsSortBy,  // ✅ REQUIRED - Frontend must provide
    pub only_approvable: bool,
    pub with_evaluation_results: bool,
    pub deduplication_keys: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
}
```

**Option B: Remove field entirely (ALTERNATIVE)**
```rust
// If sort_by is not critical, remove it completely
pub struct ListRequestsInput {
    // ... other fields ...
    // ✅ REMOVED: sort_by field
    pub only_approvable: bool,
    pub with_evaluation_results: bool,
    // ...
}
```

**Recommended:** Option A - make it required. This forces the frontend to be explicit about sorting.

**Frontend Update Required:**
```typescript
// File: daopad_frontend/src/services/UnifiedProposalService.ts
// BEFORE
const filters = {
    statuses: showOnlyPending ? [...] : null,
    // sort_by is omitted (defaults to null)
};

// AFTER
const filters = {
    statuses: showOnlyPending ? [...] : null,
    sort_by: { CreatedAt: { Desc: null } },  // ✅ Always provide default
};
```

### Fix 3: Update Frontend Service (If Using Option A)

**File:** `daopad_frontend/src/services/UnifiedProposalService.ts`

**Approximate location:** Where `list_orbit_requests` is called

**Change:**
```typescript
// PSEUDOCODE - Find the actual service call and add sort_by

// BEFORE
async listOrbitRequests(tokenId: Principal, showOnlyPending: boolean) {
    const filters = {
        statuses: showOnlyPending ? [
            { Created: null },
            { Processing: null }
        ] : null,
        requester_ids: null,
        approver_ids: null,
        operation_types: null,
        expiration_from_dt: null,
        expiration_to_dt: null,
        created_from_dt: null,
        created_to_dt: null,
        paginate: null,
        // ❌ sort_by is omitted - causes Candid error
        only_approvable: false,
        with_evaluation_results: false,
        deduplication_keys: null,
        tags: null,
    };

    return await backend.list_orbit_requests(tokenId, filters);
}

// AFTER
async listOrbitRequests(tokenId: Principal, showOnlyPending: boolean) {
    const filters = {
        statuses: showOnlyPending ? [
            { Created: null },
            { Processing: null }
        ] : null,
        requester_ids: null,
        approver_ids: null,
        operation_types: null,
        expiration_from_dt: null,
        expiration_to_dt: null,
        created_from_dt: null,
        created_to_dt: null,
        paginate: null,
        sort_by: { CreatedAt: { Desc: null } },  // ✅ ADDED - Default sorting
        only_approvable: false,
        with_evaluation_results: false,
        deduplication_keys: null,
        tags: null,
    };

    return await backend.list_orbit_requests(tokenId, filters);
}
```

**Search strategy:**
```bash
# Find the file that calls list_orbit_requests
cd daopad_frontend
grep -r "list_orbit_requests" src/
```

---

## Testing Strategy

### Step 1: Build and Deploy Backend
```bash
cd /home/theseus/alexandria/daopad-fix-admin-tests/src/daopad

# Build backend with fixes
cargo build --target wasm32-unknown-unknown --release -p daopad_backend

# Extract candid (for declaration sync)
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Deploy to IC mainnet (CRITICAL - tests run against deployed code)
./deploy.sh --network ic
```

### Step 2: Run Full Playwright Suite
```bash
cd daopad_frontend

# Run all tests
npx playwright test

# Expected result: All 72 tests passing
```

### Step 3: Manual Verification (Before PR Creation)

1. **Test `get_dao_overview` fix:**
   ```bash
   # Navigate to: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai
   # Open browser console
   # Verify: NO "[TokenService] getDaoOverview error" messages
   # Verify: Dashboard loads treasury stats correctly
   ```

2. **Test `list_orbit_requests` fix:**
   ```bash
   # Navigate to: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/activity
   # Open browser console
   # Verify: NO "Failed to fetch requests" error
   # Verify: Activity tab shows proposals (or "No proposals" message)
   ```

### Step 4: Iteration Loop (If Tests Fail)

```bash
# FOR i=1 to 5:
  # Run tests
  cd daopad_frontend && npx playwright test

  # If failures > 0:
    # Check test-results/ directory for screenshots
    # Read error-context.md files
    # Analyze console errors in browser logs
    # Form hypothesis
    # Make targeted fix
    # cargo build && deploy && commit && push
    # sleep 300  # Wait for IC deployment
    # continue

  # If failures = 0:
    # Report success
    # EXIT
# END FOR
```

### Exit Criteria

✅ **Success Conditions:**
- All 72 Playwright tests passing
- No console errors related to `get_dao_overview`
- No console errors related to `list_orbit_requests`
- Activity tab loads proposals successfully
- Dashboard loads treasury stats successfully

❌ **Failure Conditions (Escalate):**
- More than 5 iterations required
- New test failures introduced
- Cannot deploy to IC mainnet
- Candid extraction fails

---

## Post-Fix Verification

### Expected Console Logs (Success)
```
# ✅ SHOULD SEE:
[DaoRoute] Parallel fetch results:
  Object { station: {...}, metadata: {...}, overview: {...} }

# ❌ SHOULD NOT SEE:
[TokenService] getDaoOverview error: AgentError: Call failed...
Failed to fetch requests: AgentError: Call failed...
```

### Expected Test Results (Success)
```
Running 72 tests using 4 workers

  ✓ All activity.spec.ts tests (9 tests)
  ✓ All agreement.spec.ts tests (20 tests)
  ✓ All app-route.spec.ts tests (9 tests)
  ✓ All settings.spec.ts tests (7 tests)
  ✓ All treasury.spec.ts tests (11 tests)
  ✓ All treasury-enhanced.spec.ts tests (11 tests)
  ✓ All canisters.spec.ts tests (1 test)
  ✓ All manual-auth-setup.spec.ts tests (1 test)
  ✓ All remaining tests (3 tests)

72 passed (7.0m)
```

---

## Plan Checklist

- [x] Worktree created: `/home/theseus/alexandria/daopad-fix-admin-tests`
- [x] Orchestrator header embedded at top
- [x] Current state documented (test failures, error logs)
- [x] Root causes identified (futures::join!, Candid Option<enum>)
- [x] Fixes specified in pseudocode (sequential awaits, required field)
- [x] Testing strategy defined (build → deploy → test → iterate)
- [x] Exit criteria specified (72/72 tests passing)
- [ ] Plan committed to feature branch
- [ ] Handoff command provided

---

## Implementation Notes

### Why This Approach

1. **Sequential awaits:** Standard IC pattern, guaranteed to work, minimal code change
2. **Required sort_by:** Eliminates Candid edge case, forces explicit frontend behavior
3. **Deploy-first testing:** Playwright tests run against deployed code, ensures real-world behavior
4. **Autonomous iteration:** Self-healing via test → fix → deploy → retest loop

### Risks

- **Performance:** Sequential calls add ~2-3s latency to dashboard load (acceptable)
- **Frontend update:** Must sync `sort_by` field addition across all call sites
- **Breaking change:** If other frontends call `list_orbit_requests`, they'll break (unlikely - only DAOPad frontend exists)

### Alternative Approaches Rejected

1. **Fix Candid deserializer:** Too complex, requires upstream candid-rs changes
2. **Keep `futures::join!`:** Cannot work with IC CDK's execution model
3. **Remove both methods:** Would break critical dashboard/activity functionality

---

## Deployment Steps (Final Checklist)

```bash
# 1. Verify isolation
cd /home/theseus/alexandria/daopad-fix-admin-tests/src/daopad

# 2. Make fixes (as described above)
# - orbit_overview.rs: Replace futures::join! with sequential awaits
# - orbit_requests.rs: Change sort_by to required field
# - UnifiedProposalService.ts: Add sort_by to filter object

# 3. Build
cargo build --target wasm32-unknown-unknown --release -p daopad_backend

# 4. Extract Candid
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# 5. Deploy (CRITICAL - tests run against deployed code)
./deploy.sh --network ic

# 6. Run tests
cd daopad_frontend
npx playwright test

# 7. If all pass → Create PR
cd ..
git add .
git commit -m "[Fix]: Restore all 72 Playwright tests after admin canister separation

- Fix get_dao_overview: Replace futures::join! with sequential awaits
- Fix list_orbit_requests: Make sort_by field required with default
- Update frontend to provide sort_by in all requests

Test results: 72/72 passing ✅"

git push -u origin feature/fix-admin-canister-tests

gh pr create \
  --title "[Fix]: Restore All Playwright Tests After Admin Separation" \
  --body "## Summary
Fixes 21 failing Playwright tests introduced by PR #115 (admin canister separation).

## Root Causes
1. \`get_dao_overview\`: Used \`futures::join!\` for parallel calls (not supported by IC CDK)
2. \`list_orbit_requests\`: Candid couldn't deserialize \`Option<ListRequestsSortBy>\`

## Fixes
1. Replaced \`futures::join!\` with sequential \`.await\` calls (orbit_overview.rs:59-67)
2. Made \`sort_by\` field required in \`ListRequestsInput\` (orbit_requests.rs:485)
3. Updated frontend to always provide \`sort_by\` value (UnifiedProposalService.ts)

## Test Results
- Before: 41 passing, 21 failing, 10 skipped
- After: **72 passing** ✅

## Manual Verification
✅ Dashboard loads without console errors
✅ Activity tab fetches proposals successfully
✅ All treasury/settings tabs functional

Implements: \`FIX-ADMIN-TESTS-PLAN.md\`"
```

---

**REMEMBER:** This is a BUG FIX, not a feature. The goal is to restore functionality broken by PR #115, not add new capabilities. Minimize changes - only fix what's broken.
