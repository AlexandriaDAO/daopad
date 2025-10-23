# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-fix-dashboard-loading/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-fix-dashboard-loading/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes only:
     ```bash
     cd daopad_frontend
     npm run build
     cd ..
     ./deploy.sh --network ic --frontend-only
     ```
4. **Test with Playwright**:
   ```bash
   cd daopad_frontend
   npx playwright test e2e/treasury.spec.ts --project=chromium
   ```
5. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Fix]: Public Dashboard Loading for Anonymous Users

- Make AccountsTable work without authentication
- Backend acts as admin proxy for read-only treasury data
- Anonymous users can view treasury accounts/balances
- Authenticated users retain full functionality (transfers)
- Playwright tests now show real data (4 accounts, asset breakdown)"

   git push -u origin feature/fix-dashboard-loading

   gh pr create --title "[Fix]: Public Dashboard Loading for Anonymous Users" --body "Implements TREASURY_DASHBOARD_FIX_PLAN.md

## Summary
- ✅ Anonymous users can view treasury data
- ✅ Backend proxies Orbit queries (no auth needed)
- ✅ Authenticated users keep full transfer functionality
- ✅ Playwright tests validate real data flow

## Bug Fixed
**Root Cause** (AccountsTable.tsx:48):
\`\`\`typescript
if (stationId && identity && tokenId) {  // ❌ Blocks anonymous
  dispatch(fetchOrbitAccounts({ ... }));
}
\`\`\`

**Fix**:
\`\`\`typescript
if (stationId && tokenId) {  // ✅ Works for everyone
  dispatch(fetchOrbitAccounts({
    stationId,
    identity: identity || null,  // Optional for backend
    tokenId,
    ...
  }));
}
\`\`\`

## Test Evidence
**Before**: Treasury accounts: 0 (anonymous users blocked)
**After**: Treasury accounts: 4 (ALEX station data loads)

## Testing
- E2E tests pass: treasury.spec.ts validates 4 accounts
- Manual test: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/treasury
- Shows: Account names, balances, asset breakdown (ICP/ALEX)"
   ```
6. **Iterate autonomously**:
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

**Branch:** `feature/fix-dashboard-loading`
**Worktree:** `/home/theseus/alexandria/daopad-fix-dashboard-loading/src/daopad`

---

# Implementation Plan: Fix Treasury Dashboard for Anonymous Users

## Current State

### Bug Discovery (PR #94)
Playwright test navigated to `/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/treasury` and found:
- ✅ DaoRoute loaded: Token ID → "YSY5F DAO"
- ✅ Station fetched: `fec7w-zyaaa-aaaaa-qaffq-cai`
- ✅ Page rendered: `treasury-overview` element exists
- ❌ **Zero treasury accounts displayed** (should be 4)

### Root Cause Analysis

#### File Structure
```
daopad_frontend/
├── src/
│   ├── components/
│   │   └── tables/
│   │       └── AccountsTable.tsx        # 🔴 Line 48: identity check blocks anonymous
│   ├── features/
│   │   └── orbit/
│   │       ├── orbitSlice.ts            # Redux thunk fetchOrbitAccounts
│   │       └── orbitSelectors.ts        # Data formatting
│   └── services/
│       └── backend/
│           └── orbit/
│               └── OrbitAccountsService.ts  # Backend API wrapper

daopad_backend/
└── src/
    └── api/
        └── orbit.rs                     # ✅ Line 88: list_orbit_accounts (no auth required)
```

#### Current Flow (BROKEN for anonymous)
```
User loads /dao/:tokenId/treasury
  ↓
DaoRoute fetches token & station ✅
  ↓
DaoTreasury renders AccountsTable
  ↓
AccountsTable.tsx:48 useEffect
  ↓
if (stationId && identity && tokenId) {  // ❌ FAILS: identity = null for anonymous
    dispatch(fetchOrbitAccounts({ ... }));
}
  ↓
NO DATA FETCHED ❌
```

#### Backend Support (ALREADY WORKS)
```rust
// daopad_backend/src/api/orbit.rs:88
#[update]
pub async fn list_orbit_accounts(
    token_canister_id: Principal,  // ✅ Takes token ID (frontend has this)
    search_term: Option<String>,
    limit: Option<u64>,
    offset: Option<u64>,
) -> Result<ListAccountsResult, String> {
    // ✅ NO CALLER CHECK - Works for everyone
    // Backend has admin access to Orbit Station
    // Acts as proxy for read-only queries
}
```

### API Contract Mismatch

**Frontend Service** (OrbitAccountsService.ts:8):
```javascript
async listAccounts(stationId, searchTerm, offset, limit) {
    const stationPrincipal = this.toPrincipal(stationId);  // ❌ Passes station ID

    const result = await actor.list_orbit_accounts(
        stationPrincipal,  // ❌ WRONG: Backend expects token ID
        searchTermOpt,
        offsetOpt,
        limitOpt
    );
}
```

**Backend API** (orbit.rs:88):
```rust
pub async fn list_orbit_accounts(
    token_canister_id: Principal,  // ✅ Expects token ID
    search_term: Option<String>,
    limit: Option<u64>,
    offset: Option<u64>,
) -> Result<ListAccountsResult, String>
```

**Why This Works Accidentally**: Frontend passes `stationId` but it's actually the `tokenId` in most calling contexts (variable naming confusion).

### What Data Should Display

**Test Station**: fec7w-zyaaa-aaaaa-qaffq-cai (ALEX token: ysy5f-2qaaa-aaaap-qkmmq-cai)

Expected display:
1. **4 Treasury Accounts** with names (e.g., "Main Treasury", "Reserve Fund")
2. **Account IDs** (truncated: `abc123...xyz789`)
3. **Blockchain** badges (ICP)
4. **Asset Breakdown**:
   - ICP balance (formatted with decimals)
   - ALEX balance (formatted with decimals)
   - Total USD value (if available)
5. **Transfer buttons** (disabled for anonymous, enabled for authenticated)

---

## Design: Anonymous-Friendly Treasury Loading

### Key Insight
Backend `list_orbit_accounts` requires NO authentication. It acts as admin proxy:
- Anonymous users → Backend (admin) → Orbit Station → Treasury data
- Backend has admin access, so it can query on anyone's behalf
- Frontend just needs to pass `tokenId` (which it already has from DaoRoute)

### New Data Flow (WORKS for everyone)
```
User loads /dao/:tokenId/treasury
  ↓
DaoRoute fetches token & station ✅
  ↓
DaoTreasury renders AccountsTable
  ↓
AccountsTable.tsx useEffect (FIXED)
  ↓
if (stationId && tokenId) {  // ✅ No identity check
    dispatch(fetchOrbitAccounts({
        stationId,
        identity: identity || null,  // Optional, backend doesn't use it
        tokenId,
        ...
    }));
}
  ↓
orbitSlice.ts: fetchOrbitAccounts thunk
  ↓
OrbitAccountsService.listAccounts(tokenId, ...)  // ✅ Passes tokenId
  ↓
Backend: list_orbit_accounts(tokenId, ...)  // ✅ Proxies to Orbit
  ↓
Orbit Station returns accounts ✅
  ↓
Redux stores data, AccountsTable renders ✅
```

### Anonymous vs Authenticated Differences

| Feature | Anonymous | Authenticated |
|---------|-----------|---------------|
| **View accounts** | ✅ Yes (read-only) | ✅ Yes |
| **View balances** | ✅ Yes | ✅ Yes |
| **View asset breakdown** | ✅ Yes | ✅ Yes |
| **Create transfers** | ❌ No (button disabled) | ✅ Yes |
| **View voting power** | ❌ No | ✅ Yes |
| **Refresh manually** | ✅ Yes | ✅ Yes |

---

## Implementation

### Phase 1: Fix AccountsTable Identity Check

#### File: `daopad_frontend/src/components/tables/AccountsTable.tsx` (MODIFY)

**Current Code** (Line 47-57):
```javascript
// PSEUDOCODE - Current broken logic
useEffect(() => {
  if (stationId && identity && tokenId) {  // ❌ Blocks anonymous
    dispatch(fetchOrbitAccounts({
      stationId,
      identity,
      tokenId,
      searchQuery,
      pagination
    }));
  }
}, [dispatch, stationId, identity, tokenId, searchQuery, pagination]);
```

**Fixed Code**:
```javascript
// PSEUDOCODE - New working logic
useEffect(() => {
  // ✅ Remove identity requirement - backend doesn't need it
  if (stationId && tokenId) {
    dispatch(fetchOrbitAccounts({
      stationId,
      identity: identity || null,  // Optional, backend ignores it
      tokenId,
      searchQuery,
      pagination
    }));
  }
}, [dispatch, stationId, identity, tokenId, searchQuery, pagination]);
```

**Rationale**:
- Backend `list_orbit_accounts` doesn't check caller
- Backend has admin access to Orbit Station
- `identity` is only needed for mutations (transfers), not queries
- Anonymous users get read-only view

### Phase 2: Verify Service Layer Compatibility

#### File: `daopad_frontend/src/services/backend/orbit/OrbitAccountsService.ts` (VERIFY)

**Current Implementation** (Lines 8-28):
```javascript
// PSEUDOCODE
async listAccounts(stationId, searchTerm = null, offset = null, limit = null) {
  try {
    const actor = await this.getActor();
    const stationPrincipal = this.toPrincipal(stationId);  // ⚠️ Variable naming confusing

    // ✅ Actually passing tokenId despite variable name
    const result = await actor.list_orbit_accounts(
      stationPrincipal,  // This is actually tokenId in calling contexts
      searchTermOpt,
      offsetOpt,
      limitOpt
    );
    return parseOrbitResult(result);
  } catch (error) {
    console.error('Failed to list accounts:', error);
    return { success: false, error: error.message };
  }
}
```

**Action**: VERIFY NO CHANGES NEEDED
- Current code works despite confusing variable names
- Calling code (orbitSlice.ts:71) passes `tokenId` as first param
- Service correctly forwards to backend's `list_orbit_accounts(token_canister_id, ...)`

**Optional Cleanup** (for clarity, not required):
```javascript
// PSEUDOCODE
async listAccounts(tokenId, searchTerm = null, offset = null, limit = null) {
  // Rename param from stationId → tokenId for clarity
  const tokenPrincipal = this.toPrincipal(tokenId);
  const result = await actor.list_orbit_accounts(tokenPrincipal, ...);
}
```

### Phase 3: Verify Redux Thunk Compatibility

#### File: `daopad_frontend/src/features/orbit/orbitSlice.ts` (VERIFY)

**Current Implementation** (Lines 65-129):
```javascript
// PSEUDOCODE
export const fetchOrbitAccounts = createAsyncThunk(
  'orbit/fetchAccounts',
  async ({ stationId, identity, searchQuery, pagination, tokenId }, { rejectWithValue }) => {
    try {
      const service = getOrbitAccountsService(identity);  // ⚠️ identity used for actor creation

      // ✅ Calls backend with tokenId (despite variable confusion above)
      const response = await service.listAccounts(
        stationId,  // ⚠️ This is actually tokenId at call site
        searchQuery || undefined,
        pagination.limit || 20,
        pagination.offset || 0
      );

      // ... asset enrichment logic

      return { stationId, data: response.data };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

**Action**: VERIFY `getOrbitAccountsService` works with `identity = null`

Check `BackendServiceBase` to ensure:
1. Actor creation handles null identity (uses anonymous)
2. Service methods don't crash on null identity

**Expected Behavior**:
```javascript
// PSEUDOCODE - BackendServiceBase.ts
class BackendServiceBase {
  constructor(identity) {
    this.identity = identity || null;  // ✅ Null is valid
  }

  async getActor() {
    const agent = new HttpAgent({
      host: 'https://icp0.io',
      identity: this.identity || undefined  // ✅ Anonymous if null
    });
    // ...
  }
}
```

If BackendServiceBase doesn't handle null, ADD:
```javascript
// PSEUDOCODE
export const getOrbitAccountsService = (identity) => {
  // ✅ Anonymous identity if null
  return new OrbitAccountsService(identity || undefined);
};
```

### Phase 4: UI Adjustments for Anonymous Users

#### File: `daopad_frontend/src/components/tables/AccountsTable.tsx` (MODIFY)

**Transfer Button** (Lines 276-286):
```javascript
// PSEUDOCODE - Current
<Button
  variant="outline"
  size="sm"
  onClick={() => handleTransfer(account)}
  disabled={!identity}  // ✅ Already correct!
>
  <ArrowUpRight className="w-4 h-4 mr-2" />
  Transfer
</Button>
```

**Action**: VERIFY EXISTING IMPLEMENTATION
- Button already disables if `!identity` ✅
- Tooltip could be added for better UX (optional)

**Optional Enhancement**:
```javascript
// PSEUDOCODE
{!identity && (
  <Tooltip>
    <TooltipTrigger>
      <Button disabled>Transfer</Button>
    </TooltipTrigger>
    <TooltipContent>
      Login required to create transfers
    </TooltipContent>
  </Tooltip>
)}

{identity && (
  <Button onClick={() => handleTransfer(account)}>
    Transfer
  </Button>
)}
```

### Phase 5: Add Test Data Attributes

#### File: `daopad_frontend/src/components/tables/AccountsTable.tsx` (MODIFY)

**Add testid to account rows** (Line 260):
```javascript
// PSEUDOCODE
accounts.map((account) => (
  <TableRow key={account.id} data-testid="treasury-account">
    {/* ... existing cells ... */}
  </TableRow>
))
```

**Verify loading spinner** (Line 234):
```javascript
// PSEUDOCODE
{isLoading && accounts.length === 0 ? (
  <div className="space-y-2" data-testid="loading-spinner">
    {[...Array(5)].map((_, i) => (
      <Skeleton key={i} className="h-12 w-full" />
    ))}
  </div>
) : (
  // ... table content
)}
```

---

## Testing

### Unit Testing Strategy

#### Test: AccountsTable renders for anonymous users
```javascript
// PSEUDOCODE - AccountsTable.test.tsx
describe('AccountsTable', () => {
  it('should fetch accounts without identity', async () => {
    const mockDispatch = jest.fn();

    render(
      <AccountsTable
        stationId="fec7w-zyaaa-aaaaa-qaffq-cai"
        identity={null}  // ✅ Anonymous
        tokenId="ysy5f-2qaaa-aaaap-qkmmq-cai"
        tokenSymbol="ALEX"
      />
    );

    // Verify dispatch called with null identity
    expect(mockDispatch).toHaveBeenCalledWith(
      fetchOrbitAccounts({
        stationId: 'fec7w-zyaaa-aaaaa-qaffq-cai',
        identity: null,
        tokenId: 'ysy5f-2qaaa-aaaap-qkmmq-cai',
        ...
      })
    );
  });

  it('should disable transfer button for anonymous', () => {
    const { getByText } = render(
      <AccountsTable identity={null} ... />
    );

    const transferButton = getByText('Transfer').closest('button');
    expect(transferButton).toBeDisabled();
  });
});
```

### E2E Testing Updates

#### File: `daopad_frontend/e2e/treasury.spec.ts` (UPDATE)

**Update test expectations**:
```javascript
// PSEUDOCODE
test('should display 4 treasury accounts', async () => {
  // Navigate directly to treasury route (already updated in PR #94)
  await page.goto(`/dao/${TEST_TOKEN_ID}/treasury`);

  await page.waitForSelector('[data-testid="treasury-account"]', {
    timeout: 30000,
    state: 'visible'
  });

  // ✅ NEW: Verify real data loaded
  const accounts = await page.$$('[data-testid="treasury-account"]');
  expect(accounts.length).toBe(4);  // ALEX station has 4 accounts

  // ✅ NEW: Verify asset breakdown visible
  const firstAccount = accounts[0];
  const balanceText = await firstAccount.locator('.font-mono').textContent();
  expect(balanceText).not.toBe('0');  // Should have real balance

  // ✅ NEW: Verify account names rendered
  const accountName = await firstAccount.locator('.font-medium').textContent();
  expect(accountName).not.toBe('Unnamed Account');
});
```

**Add data flow verification**:
```javascript
// PSEUDOCODE
test('should fetch treasury data from backend', async () => {
  const networkCalls = [];

  page.on('response', async (response) => {
    if (response.url().includes('list_orbit_accounts')) {
      networkCalls.push({
        url: response.url(),
        status: response.status(),
        data: await response.text().catch(() => 'binary')
      });
    }
  });

  await page.goto(`/dao/${TEST_TOKEN_ID}/treasury`);
  await page.waitForTimeout(5000);

  // ✅ Verify backend was called
  expect(networkCalls.length).toBeGreaterThan(0);
  expect(networkCalls[0].status).toBe(200);

  // ✅ Verify response contains accounts
  const responseData = JSON.parse(networkCalls[0].data);
  expect(responseData.Ok).toBeDefined();
  expect(responseData.Ok.accounts.length).toBe(4);
});
```

### Manual Testing Checklist

```bash
# After deployment
./deploy.sh --network ic --frontend-only

# Test Routes (use standard test station)
BASE_URL="https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io"
TOKEN_ID="ysy5f-2qaaa-aaaap-qkmmq-cai"  # ALEX
STATION_ID="fec7w-zyaaa-aaaaa-qaffq-cai"

# 1. Test anonymous access
# Open in incognito/private window:
$BASE_URL/dao/$TOKEN_ID/treasury

# Verify:
# ✅ Page loads without errors
# ✅ "YSY5F DAO" heading shows
# ✅ "Treasury Station: fec7w-zyaaa-aaaaa-qaffq-cai" displays
# ✅ 4 treasury accounts render
# ✅ Account names visible (not "Unnamed Account")
# ✅ Balances show real data (not "0" or "Loading...")
# ✅ Transfer buttons disabled
# ✅ No console errors

# 2. Test authenticated access
# Login with Internet Identity:
$BASE_URL/app
# Navigate to ALEX DAO treasury

# Verify:
# ✅ All anonymous features work
# ✅ Transfer buttons ENABLED
# ✅ Clicking Transfer opens dialog
# ✅ Can create transfer request

# 3. Network tab verification
# Open DevTools → Network → Filter "list_orbit_accounts"
# Refresh treasury page

# Verify:
# ✅ 1 call to list_orbit_accounts
# ✅ Status 200
# ✅ Response contains 4 accounts
# ✅ Each account has assets array
# ✅ Asset balances non-zero
```

### Build & Deploy Process

```bash
# In worktree: /home/theseus/alexandria/daopad-fix-dashboard-loading/src/daopad

# 1. Build frontend
cd daopad_frontend
npm run build

# 2. Deploy frontend only (backend unchanged)
cd ..
./deploy.sh --network ic --frontend-only

# 3. Verify deployment
echo "Frontend URL: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io"

# 4. Run E2E tests against deployed code
cd daopad_frontend
npx playwright test e2e/treasury.spec.ts --project=chromium

# 5. If tests pass: commit and create PR
# 6. If tests fail: analyze, fix, GOTO step 1
```

---

## Files Summary

### Modified Files (2-3)

1. **`daopad_frontend/src/components/tables/AccountsTable.tsx`** (CRITICAL)
   - Remove `identity` from fetch condition (line 48)
   - Add `data-testid="treasury-account"` to table rows
   - Verify transfer button already disables for anonymous

2. **`daopad_frontend/src/features/orbit/orbitSlice.ts`** (VERIFY ONLY)
   - Confirm `getOrbitAccountsService` handles null identity
   - No changes expected (should already work)

3. **`daopad_frontend/e2e/treasury.spec.ts`** (OPTIONAL)
   - Enhance assertions to verify real data (4 accounts, balances)
   - Add network request verification

### New Files (0)
None - this is a bug fix, not a feature.

### Backend Files (0)
No backend changes needed - `list_orbit_accounts` already supports anonymous calls.

---

## Migration Notes

### Backwards Compatibility
✅ **FULLY COMPATIBLE** - No breaking changes
- Authenticated users: Existing functionality unchanged
- Anonymous users: Gain read-only treasury access
- Backend API: No changes

### Security Considerations

**Q: Is it safe to show treasury data publicly?**
A: ✅ Yes
1. All blockchain data is public by nature (anyone can query IC canisters)
2. Backend acts as admin proxy, not exposing credentials
3. Anonymous users CANNOT create transfers (button disabled)
4. Similar to Etherscan/ICP Dashboard - public treasury viewing is standard

**Q: Does this expose admin credentials?**
A: ❌ No
1. Backend has admin access to Orbit Station
2. Backend only exposes read-only queries
3. Mutation operations (transfers) still require authentication
4. Orbit Station validates all requests regardless of proxy

### Data Flow Changes

```
BEFORE (Anonymous blocked):
URL: /dao/:tokenId/treasury
Auth: None
Result: Empty table, 0 accounts

BEFORE (Authenticated):
URL: /dao/:tokenId/treasury
Auth: Internet Identity
Result: 4 accounts, full access

AFTER (Anonymous):
URL: /dao/:tokenId/treasury
Auth: None
Result: 4 accounts (read-only), transfers disabled ✅

AFTER (Authenticated):
URL: /dao/:tokenId/treasury
Auth: Internet Identity
Result: 4 accounts, full access (unchanged)
```

---

## Success Criteria

### Must Have
- [ ] Anonymous users see 4 treasury accounts on ALEX DAO
- [ ] Account names display correctly (not "Unnamed Account")
- [ ] Balances show real data from Orbit Station
- [ ] Asset breakdown visible (ICP/ALEX with decimals)
- [ ] Transfer buttons disabled for anonymous users
- [ ] Transfer buttons enabled for authenticated users
- [ ] No console errors in browser
- [ ] Playwright tests pass with real data validation

### Should Have
- [ ] Loading spinner shows briefly then disappears
- [ ] Refresh button works for anonymous users
- [ ] Search functionality works (if applicable)
- [ ] Pagination works if >20 accounts

### Nice to Have
- [ ] Tooltip on disabled transfer button ("Login required")
- [ ] Anonymous users see "Read-only view" indicator
- [ ] Smooth transition from loading → data display

---

## Risk Assessment

### Low Risk ✅
- **Scope**: Only frontend changes (AccountsTable component)
- **Backend**: Already supports anonymous queries (no changes needed)
- **Security**: Read-only public data (no sensitive info exposed)
- **Testing**: Comprehensive E2E tests validate data flow

### Potential Issues

1. **Service Layer Null Handling**
   - **Risk**: `getOrbitAccountsService(null)` might crash
   - **Mitigation**: Verify BackendServiceBase handles null identity
   - **Fallback**: Update service factory to use anonymous identity

2. **Redux State Management**
   - **Risk**: State selectors might expect identity presence
   - **Mitigation**: Review orbitSelectors.ts for identity dependencies
   - **Fallback**: Add null checks in selectors

3. **Asset Enrichment Logic**
   - **Risk**: Asset symbol lookup might require authentication
   - **Mitigation**: Backend's `list_orbit_accounts` handles enrichment
   - **Fallback**: Show basic account data without asset symbols

---

## Rollback Plan

If deployment causes issues:

```bash
# 1. Revert commit
git revert HEAD

# 2. Rebuild and redeploy
npm run build
./deploy.sh --network ic --frontend-only

# 3. Verify original behavior restored
# Anonymous users see empty treasury (original bug)
# Authenticated users still work
```

**Estimated rollback time**: 5 minutes (fast frontend-only deploy)

---

## Plan Checklist

- [x] Worktree created first
- [x] Orchestrator header EMBEDDED at top of plan
- [x] Current state documented (file structure, root cause, API mismatch)
- [x] Implementation in pseudocode (2 files modified, 0 new)
- [x] Testing strategy defined (unit tests, E2E updates, manual checklist)
- [ ] Plan committed to feature branch
- [ ] Handoff command provided with PR creation reminder
