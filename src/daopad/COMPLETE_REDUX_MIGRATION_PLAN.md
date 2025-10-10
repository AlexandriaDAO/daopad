# Complete Redux Migration: Re-enable 5 Disabled Components

**Branch:** `feature/complete-redux-migration`
**Worktree:** `/home/theseus/alexandria/daopad-complete-migration/src/daopad`
**Estimated Time:** 6-8 hours
**Complexity:** Medium-High
**Impact:** 🟡 **MODERATE** - Feature completeness

---

## 🚨 MANDATORY: ISOLATION CHECK AND EXECUTION PROMPT

### Context: Worktree Already Created

**This plan was created by the planning agent in an isolated worktree.**

**Location:** `/home/theseus/alexandria/daopad-complete-migration/src/daopad`
**Branch:** `feature/complete-redux-migration`
**Plan file:** `COMPLETE_REDUX_MIGRATION_PLAN.md` (in this worktree)

### Step 0: Verify Isolation (RUN THIS FIRST!)

```bash
# STOP! Verify you are in the correct worktree
REPO_ROOT=$(git rev-parse --show-toplevel)
CURRENT_BRANCH=$(git branch --show-current)

# Check you're NOT in main repo
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: You are in the MAIN repository"
    echo "❌ This plan was created in a worktree at:"
    echo "    /home/theseus/alexandria/daopad-complete-migration"
    echo ""
    echo "Navigate to the worktree:"
    echo "  cd /home/theseus/alexandria/daopad-complete-migration/src/daopad"
    echo "  cat COMPLETE_REDUX_MIGRATION_PLAN.md  # Plan is here"
    exit 1
fi

# Check you're on the right branch
if [ "$CURRENT_BRANCH" != "feature/complete-redux-migration" ]; then
    echo "❌ WARNING: You are on branch '$CURRENT_BRANCH'"
    echo "Expected: feature/complete-redux-migration"
    echo "Are you in the right worktree?"
    exit 1
fi

echo "✅ You are in the correct worktree: $REPO_ROOT"
echo "✅ On branch: $CURRENT_BRANCH"
echo "✅ Safe to proceed with implementation"
```

---

## 📋 Executive Summary

**Problem:** 5 components remain disabled from the Redux migration (PR #14), marked as `.disabled` files. They were originally React Query-based and need Redux implementation to complete the migration.

**Solution:** Migrate each component to use Redux patterns, following the successful AccountsTable implementation. Re-enable all 5 components.

**Why Now:** PR #14 addressed critical P0 bugs (tokenId, AccountsTable). These remaining components are feature gaps, not production-breaking bugs, but should be completed for full feature parity.

**Result:** Complete Redux migration, all components functional, no React Query dependencies remaining.

---

## 🔍 Current State Analysis

### Disabled Components (5 files, ~2,257 lines)

1. **`RequestDialog.jsx.disabled`** (469 lines) - **COMPLEX**
   - Shows full request details
   - Approve/reject actions with comments
   - Real-time status updates (5s polling)
   - Tabs for request details, operation details, approvals, execution details
   - Uses React Query: `useQuery` for request details, `useMutation` for approve/reject

2. **`OrbitRequestsList.jsx.disabled`** (226 lines) - **MEDIUM**
   - Table view of requests
   - Inline approve/reject buttons
   - Status badges and formatting
   - Uses React Query: `useQuery` for list, manual mutations

3. **`AssetsPage.jsx.disabled`** (326 lines) - **COMPLEX**
   - Full asset management page
   - Search, pagination, CRUD operations
   - AssetDialog for add/edit
   - Privilege checking
   - Uses React Query extensively

4. **`AccountSetupDialog.jsx.disabled`** (448 lines) - **COMPLEX**
   - Multi-step account creation wizard
   - Form validation
   - Address book integration
   - Uses React Query for mutations

5. **`ExternalCanistersPage.jsx.disabled`** (388 lines) - **COMPLEX**
   - Canister management
   - Permissions, health checks
   - CRUD operations
   - Uses React Query extensively

### Existing Redux Infrastructure (Ready to Use)

**From `orbitSlice.js` (already implemented in PR #14):**

```javascript
// Available thunks
export const fetchOrbitRequests      // ✅ Fetch requests list
export const createTransferRequest   // ✅ Create transfer
export const approveOrbitRequest     // ✅ Approve with tokenId
export const rejectOrbitRequest      // ✅ Reject with tokenId
export const fetchOrbitAccounts      // ✅ Fetch accounts
export const fetchOrbitMembers       // ✅ Fetch members

// Available selectors
selectOrbitRequests(state, stationId)
selectOrbitRequestsLoading(state, stationId)
selectOrbitRequestsError(state, stationId)
selectApproveRequestLoading(state)
selectRejectRequestLoading(state)
// ... and more
```

### File Tree (Relevant Sections)

```
daopad_frontend/
├── src/
│   ├── components/
│   │   ├── orbit/
│   │   │   ├── requests/
│   │   │   │   └── RequestDialog.jsx.disabled (469 lines) → RE-ENABLE
│   │   │   ├── OrbitRequestsList.jsx.disabled (226 lines) → RE-ENABLE
│   │   │   ├── AssetsPage.jsx.disabled (326 lines) → RE-ENABLE
│   │   │   ├── AccountSetupDialog.jsx.disabled (448 lines) → RE-ENABLE
│   │   │   └── ExternalCanistersPage.jsx.disabled (388 lines) → RE-ENABLE
│   │   └── tables/
│   │       └── AccountsTable.jsx (200 lines) ← SUCCESS MODEL
│   ├── features/
│   │   └── orbit/
│   │       └── orbitSlice.js (620 lines) ← USE THIS
│   └── services/
│       └── backend/ ← NEW unified services
```

---

## 🎯 Implementation Strategy

### Migration Pattern (Follow AccountsTable Success)

**AccountsTable.jsx serves as the perfect template:**

**Before (React Query):**
```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const { data, isLoading, error } = useQuery({
  queryKey: ['accounts', stationId],
  queryFn: () => service.listAccounts(stationId),
  refetchInterval: 5000
});

const mutation = useMutation({
  mutationFn: (params) => service.createAccount(params),
  onSuccess: () => {
    queryClient.invalidateQueries(['accounts']);
  }
});
```

**After (Redux):**
```javascript
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrbitAccounts, selectOrbitAccounts, selectOrbitAccountsLoading } from '@/features/orbit/orbitSlice';

const dispatch = useDispatch();
const { accounts, total } = useSelector(state => selectOrbitAccounts(state, stationId));
const isLoading = useSelector(state => selectOrbitAccountsLoading(state, stationId));

useEffect(() => {
  if (stationId && identity) {
    dispatch(fetchOrbitAccounts({ stationId, identity, searchQuery, pagination }));
  }
}, [dispatch, stationId, identity, searchQuery, pagination]);

// For polling, add interval
useEffect(() => {
  const interval = setInterval(() => {
    dispatch(fetchOrbitAccounts({ stationId, identity, searchQuery, pagination }));
  }, 5000);
  return () => clearInterval(interval);
}, [dispatch, stationId, identity]);
```

### New Thunks Needed in orbitSlice

While most functionality exists, we need to add:

1. **`fetchRequestDetails`** - For RequestDialog single request fetch
2. **`fetchAssets`** - For AssetsPage
3. **`createAsset`, `updateAsset`, `deleteAsset`** - Asset mutations
4. **`fetchExternalCanisters`** - For ExternalCanistersPage
5. **`createExternalCanister`, `updateExternalCanister`, `deleteExternalCanister`** - Canister mutations
6. **`createAccount`** - For AccountSetupDialog (accounts fetch already exists)

---

## 📁 Detailed File Changes

### PHASE 1: Add Missing Redux Thunks

#### MODIFY: `daopad_frontend/src/features/orbit/orbitSlice.js`

Add these thunks after existing ones:

```javascript
// Fetch single request details (for RequestDialog)
export const fetchRequestDetails = createAsyncThunk(
  'orbit/fetchRequestDetails',
  async ({ tokenId, stationId, requestId, identity }, { rejectWithValue }) => {
    try {
      const service = new DAOPadBackendService(identity);
      const stationPrincipal = Principal.fromText(stationId);

      const result = await service.getOrbitRequest(stationPrincipal, requestId);

      if (result.success) {
        return { stationId, requestId, data: result.data };
      }
      throw new Error(result.error || 'Failed to fetch request details');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch assets
export const fetchAssets = createAsyncThunk(
  'orbit/fetchAssets',
  async ({ stationId, identity, searchQuery, pagination }, { rejectWithValue }) => {
    try {
      const service = new DAOPadBackendService(identity);
      const stationPrincipal = Principal.fromText(stationId);

      const result = await service.listAssets(stationPrincipal, {
        offset: pagination.offset || 0,
        limit: pagination.limit || 20,
        search: searchQuery || undefined
      });

      if (result.success) {
        return { stationId, data: result.data };
      }
      throw new Error(result.error || 'Failed to fetch assets');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Create asset (mutation)
export const createAsset = createAsyncThunk(
  'orbit/createAsset',
  async ({ stationId, identity, assetData }, { rejectWithValue, dispatch }) => {
    try {
      const service = new DAOPadBackendService(identity);
      const stationPrincipal = Principal.fromText(stationId);

      const result = await service.createAsset(stationPrincipal, assetData);

      if (result.success) {
        // Trigger assets refetch
        dispatch(fetchAssets({ stationId, identity, searchQuery: '', pagination: {} }));
        return result.data;
      }
      throw new Error(result.error || 'Failed to create asset');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch external canisters
export const fetchExternalCanisters = createAsyncThunk(
  'orbit/fetchExternalCanisters',
  async ({ stationId, identity, pagination }, { rejectWithValue }) => {
    try {
      const service = new DAOPadBackendService(identity);
      const stationPrincipal = Principal.fromText(stationId);

      const result = await service.listExternalCanisters(stationPrincipal, {
        offset: pagination.offset || 0,
        limit: pagination.limit || 20
      });

      if (result.success) {
        return { stationId, data: result.data };
      }
      throw new Error(result.error || 'Failed to fetch external canisters');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Create account (mutation)
export const createAccount = createAsyncThunk(
  'orbit/createAccount',
  async ({ stationId, identity, accountData }, { rejectWithValue, dispatch }) => {
    try {
      const service = new DAOPadBackendService(identity);
      const stationPrincipal = Principal.fromText(stationId);

      const result = await service.createAccount(stationPrincipal, accountData);

      if (result.success) {
        // Trigger accounts refetch
        dispatch(fetchOrbitAccounts({
          stationId,
          identity,
          searchQuery: '',
          pagination: { limit: 20, offset: 0 }
        }));
        return result.data;
      }
      throw new Error(result.error || 'Failed to create account');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

**Update initialState** to include new resource keys:

```javascript
const initialState = {
  // ... existing state ...

  // Request details (keyed by requestId)
  requestDetails: {
    data: {},
    loading: {},
    error: {},
    lastFetch: {},
  },

  // Assets (keyed by stationId)
  assets: {
    data: {},
    loading: {},
    error: {},
    lastFetch: {},
  },

  // External Canisters (keyed by stationId)
  externalCanisters: {
    data: {},
    loading: {},
    error: {},
    lastFetch: {},
  },

  // Mutations state (extend existing)
  mutations: {
    // ... existing ...
    createAsset: {
      loading: false,
      error: null,
      lastSuccess: null,
    },
    createAccount: {
      loading: false,
      error: null,
      lastSuccess: null,
    },
  },
};
```

**Add extraReducers** for new thunks.

**Add selectors:**

```javascript
// Request details selectors
export const selectRequestDetails = (state, requestId) =>
  state.orbit.requestDetails.data[requestId];
export const selectRequestDetailsLoading = (state, requestId) =>
  state.orbit.requestDetails.loading[requestId] || false;

// Assets selectors
export const selectAssets = (state, stationId) =>
  state.orbit.assets.data[stationId] || { assets: [], total: 0 };
export const selectAssetsLoading = (state, stationId) =>
  state.orbit.assets.loading[stationId] || false;

// External canisters selectors
export const selectExternalCanisters = (state, stationId) =>
  state.orbit.externalCanisters.data[stationId] || { canisters: [], total: 0 };
export const selectExternalCanistersLoading = (state, stationId) =>
  state.orbit.externalCanisters.loading[stationId] || false;
```

---

### PHASE 2: Migrate Components (One at a Time)

#### Component 1: OrbitRequestsList (226 lines) - **START HERE (EASIEST)**

**File:** `daopad_frontend/src/components/orbit/OrbitRequestsList.jsx` (rename from .disabled)

**Changes:**

1. Remove React Query imports
2. Add Redux imports
3. Replace `useQuery` with `useSelector` + `useEffect`
4. Replace mutations with `dispatch(approveOrbitRequest)` and `dispatch(rejectOrbitRequest)`

**PSEUDOCODE:**

```javascript
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchOrbitRequests,
  approveOrbitRequest,
  rejectOrbitRequest,
  selectOrbitRequests,
  selectOrbitRequestsLoading,
  selectApproveRequestLoading,
  selectRejectRequestLoading,
} from '@/features/orbit/orbitSlice';

export default function OrbitRequestsList({ tokenId, stationId, identity }) {
  const dispatch = useDispatch();
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  // Select from Redux
  const { requests, total } = useSelector(state => selectOrbitRequests(state, stationId));
  const isLoading = useSelector(state => selectOrbitRequestsLoading(state, stationId));
  const approveLoading = useSelector(selectApproveRequestLoading);
  const rejectLoading = useSelector(selectRejectRequestLoading);

  // Fetch requests on mount
  useEffect(() => {
    if (tokenId && stationId && identity) {
      dispatch(fetchOrbitRequests({
        tokenId,
        stationId,
        identity,
        filters: {}
      }));
    }
  }, [dispatch, tokenId, stationId, identity]);

  // Polling every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (tokenId && stationId && identity) {
        dispatch(fetchOrbitRequests({
          tokenId,
          stationId,
          identity,
          filters: {}
        }));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [dispatch, tokenId, stationId, identity]);

  const handleApprove = async (requestId) => {
    setApprovingId(requestId);
    await dispatch(approveOrbitRequest({
      tokenId,
      stationId,
      identity,
      requestId
    }));
    setApprovingId(null);
    // Refetch happens automatically in thunk
  };

  const handleReject = async (requestId) => {
    setRejectingId(requestId);
    await dispatch(rejectOrbitRequest({
      tokenId,
      stationId,
      identity,
      requestId
    }));
    setRejectingId(null);
  };

  // Rest of component JSX stays mostly the same
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton />}
        {!isLoading && requests.length === 0 && <Alert>No requests</Alert>}
        {!isLoading && requests.length > 0 && (
          <Table>
            {/* Render requests */}
            {requests.map(req => (
              <TableRow key={req.id}>
                {/* ... columns ... */}
                <Button
                  onClick={() => handleApprove(req.id)}
                  disabled={approvingId === req.id || approveLoading}
                >
                  Approve
                </Button>
                <Button
                  onClick={() => handleReject(req.id)}
                  disabled={rejectingId === req.id || rejectLoading}
                >
                  Reject
                </Button>
              </TableRow>
            ))}
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
```

---

#### Component 2: RequestDialog (469 lines) - **MEDIUM COMPLEXITY**

**File:** `daopad_frontend/src/components/orbit/requests/RequestDialog.jsx`

**Needs:**
- `fetchRequestDetails` thunk (single request)
- Approve/reject already exist
- Polling for status updates

**PSEUDOCODE:**

```javascript
export function RequestDialog({ open, requestId, stationId, tokenId, identity, onClose, onApproved }) {
  const dispatch = useDispatch();

  // Select request details from Redux
  const request = useSelector(state => selectRequestDetails(state, requestId));
  const isLoading = useSelector(state => selectRequestDetailsLoading(state, requestId));
  const approveLoading = useSelector(selectApproveRequestLoading);
  const rejectLoading = useSelector(selectRejectRequestLoading);

  // Fetch request details when dialog opens
  useEffect(() => {
    if (open && requestId && stationId && tokenId && identity) {
      dispatch(fetchRequestDetails({ tokenId, stationId, requestId, identity }));
    }
  }, [dispatch, open, requestId, stationId, tokenId, identity]);

  // Poll for updates while dialog is open
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      if (requestId && stationId && tokenId && identity) {
        dispatch(fetchRequestDetails({ tokenId, stationId, requestId, identity }));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [dispatch, open, requestId, stationId, tokenId, identity]);

  const handleApprove = async () => {
    await dispatch(approveOrbitRequest({
      tokenId,
      stationId,
      identity,
      requestId
    }));
    if (onApproved) onApproved();
  };

  const handleReject = async () => {
    await dispatch(rejectOrbitRequest({
      tokenId,
      stationId,
      identity,
      requestId
    }));
    onClose();
  };

  // Rest of component with tabs, status badges, etc.
}
```

---

#### Component 3: AssetsPage (326 lines) - **HIGH COMPLEXITY**

**Needs:**
- `fetchAssets`, `createAsset`, `updateAsset`, `deleteAsset` thunks
- Search and pagination
- AssetDialog integration

**Migration pattern:** Follow AccountsTable closely (search, pagination, CRUD)

---

#### Component 4: AccountSetupDialog (448 lines) - **HIGH COMPLEXITY**

**Needs:**
- `createAccount` thunk
- Multi-step wizard state (local state is fine)
- Form validation

**Migration pattern:** Mutation-heavy, minimal query logic

---

#### Component 5: ExternalCanistersPage (388 lines) - **HIGH COMPLEXITY**

**Needs:**
- `fetchExternalCanisters`, `createExternalCanister`, etc.
- Permissions checking
- Health status checks

**Migration pattern:** Similar to AssetsPage

---

## 🧪 Testing Strategy

### Build and Deploy Process

```bash
# Frontend-only changes (no backend modifications needed)
cd /home/theseus/alexandria/daopad-complete-migration/src/daopad

# Test build after each component migration
cd daopad_frontend && npm run build

# Deploy to mainnet
cd .. && ./deploy.sh --network ic --frontend-only
```

### Testing Checklist (Per Component)

For **each component** after migration:

1. **Build succeeds** - No TypeScript/import errors
2. **Component renders** - No runtime errors
3. **Data loads** - Redux fetch works
4. **Actions work** - Mutations trigger and refetch
5. **Polling works** - Auto-refresh at intervals
6. **Error states** - Graceful error handling
7. **Loading states** - Skeleton/spinner displays

### Integration Testing (On Mainnet)

Test with real Orbit Station:
- Station: `fec7w-zyaaa-aaaaa-qaffq-cai` (ALEX token)
- Identity: `daopad` (has admin access)

**Test scenarios:**
1. Open RequestDialog → See request details
2. Approve a request → Should refetch automatically
3. Reject a request → Should update status
4. Open AssetsPage → List assets
5. Create new asset → Should appear in list
6. Open AccountSetupDialog → Create account
7. Check ExternalCanistersPage → List canisters

---

## 📊 Scope Estimate

### Files to Modify

**Phase 1: Redux Infrastructure**
- `daopad_frontend/src/features/orbit/orbitSlice.js` - Add ~300 lines (6 new thunks, state, selectors)

**Phase 2: Component Migration**
- `OrbitRequestsList.jsx` - 226 lines (rename from .disabled, refactor)
- `RequestDialog.jsx` - 469 lines (rename, refactor)
- `AssetsPage.jsx` - 326 lines (rename, refactor)
- `AccountSetupDialog.jsx` - 448 lines (rename, refactor)
- `ExternalCanistersPage.jsx` - 388 lines (rename, refactor)

**Total:** ~2,557 lines to modify/refactor

### Complexity Breakdown

| Component | Lines | Complexity | Time Est. |
|-----------|-------|------------|-----------|
| orbitSlice extensions | 300 | Medium | 1.5 hours |
| OrbitRequestsList | 226 | Low | 1 hour |
| RequestDialog | 469 | Medium | 1.5 hours |
| AssetsPage | 326 | High | 2 hours |
| AccountSetupDialog | 448 | High | 1.5 hours |
| ExternalCanistersPage | 388 | High | 1.5 hours |
| Testing & fixes | - | - | 1.5 hours |
| **Total** | **2,557** | **Mixed** | **10-12 hours** |

### Checkpoint Strategy

**Option 1: Single PR** (Recommended if time allows)
- Implement all 5 components
- Test comprehensively
- Create one PR with complete migration

**Option 2: Two Checkpoint PRs**
- PR #1: OrbitRequestsList + RequestDialog (simpler, use existing thunks)
- PR #2: AssetsPage + AccountSetupDialog + ExternalCanistersPage (need new thunks)

**Option 3: Conservative 3 PRs**
- PR #1: Redux infrastructure (orbitSlice extensions)
- PR #2: Easy components (OrbitRequestsList, RequestDialog)
- PR #3: Complex components (Assets, Account, Canisters)

---

## 🚨 CRITICAL: Your Execution Prompt

You are an autonomous PR orchestrator completing the Redux migration.

**NOTE:** The planning agent already created this worktree and this plan. You are continuing work in the same worktree.

**EXECUTE THESE STEPS AUTONOMOUSLY (DO NOT ASK FOR PERMISSION):**

### Step 0 - VERIFY ISOLATION (already in worktree):

```bash
pwd  # Should show ../daopad-complete-migration/src/daopad
git branch --show-current  # Should show feature/complete-redux-migration
ls COMPLETE_REDUX_MIGRATION_PLAN.md  # This plan should be here
```

### Step 1 - Extend orbitSlice:

Add 6 new thunks to `daopad_frontend/src/features/orbit/orbitSlice.js`:
- fetchRequestDetails
- fetchAssets
- createAsset
- fetchExternalCanisters
- createExternalCanister
- createAccount

Update initialState and add extraReducers and selectors.

### Step 2 - Migrate Components (One at a Time):

**Order (easiest to hardest):**

1. **OrbitRequestsList.jsx** (226 lines)
   - Rename from .disabled
   - Replace React Query → Redux
   - Test: Build + deploy + verify on mainnet

2. **RequestDialog.jsx** (469 lines)
   - Rename from .disabled
   - Use new fetchRequestDetails thunk
   - Test: Open dialog, see details, approve/reject

3. **AssetsPage.jsx** (326 lines)
   - Rename from .disabled
   - Use new fetchAssets/createAsset
   - Test: List assets, create new asset

4. **AccountSetupDialog.jsx** (448 lines)
   - Rename from .disabled
   - Use new createAccount thunk
   - Test: Create account wizard

5. **ExternalCanistersPage.jsx** (388 lines)
   - Rename from .disabled
   - Use new fetchExternalCanisters
   - Test: List canisters, manage permissions

**After EACH component:**
```bash
cd daopad_frontend && npm run build
cd .. && ./deploy.sh --network ic --frontend-only
# Test on https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
git add -A
git commit -m "feat: Re-enable [ComponentName] with Redux"
git push origin feature/complete-redux-migration
```

### Step 3 - Final Testing:

Test all 5 components end-to-end on mainnet:
- Request management flow
- Asset management flow
- Account creation flow
- External canister management

### Step 4 - Create PR:

```bash
gh pr create --title "feat: Complete Redux migration - Re-enable 5 disabled components" --body "$(cat <<'EOF'
## Summary
Completes the Redux migration started in PR #14 by re-enabling 5 disabled components.

## Components Re-enabled

1. **OrbitRequestsList** (226 lines)
   - Lists transfer requests with inline approve/reject
   - Redux-based with automatic refetch

2. **RequestDialog** (469 lines)
   - Full request details dialog
   - Tabs for operations, approvals, execution
   - Real-time polling

3. **AssetsPage** (326 lines)
   - Asset management with CRUD operations
   - Search and pagination
   - Privilege checking

4. **AccountSetupDialog** (448 lines)
   - Multi-step account creation wizard
   - Form validation and submission

5. **ExternalCanistersPage** (388 lines)
   - External canister management
   - Permissions and health checks

## Redux Extensions

Added 6 new thunks to orbitSlice:
- fetchRequestDetails
- fetchAssets + mutations
- fetchExternalCanisters + mutations
- createAccount

## Testing
- [x] All 5 components build successfully
- [x] All components render without errors
- [x] Data fetching works (Redux)
- [x] Mutations work and trigger refetch
- [x] Polling works for real-time updates
- [x] Tested on mainnet with ALEX station

## Pattern
Follows successful AccountsTable migration:
- useSelector for data
- useDispatch for actions
- useEffect for initial fetch
- Separate useEffect for polling

## Benefits
- ✅ Complete Redux migration (no React Query)
- ✅ All components functional
- ✅ Consistent state management patterns
- ✅ Feature parity with original implementation

🚀 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### YOUR CRITICAL RULES:

- You MUST work in ../daopad-complete-migration/src/daopad (NOT main repo)
- Other agents ARE working in parallel - isolation is MANDATORY
- After sleep: IMMEDIATELY continue (no "should I check?" questions)
- Deploy to mainnet after EVERY component (no local testing)
- Test each component before moving to next
- ONLY STOP when: PR created OR critical error

**START NOW with Step 0.**

---

## 📚 Critical Implementation Notes

### 1. Follow AccountsTable Pattern

**AccountsTable is your success model:**
- Simple Redux integration
- Clean useEffect hooks
- Proper polling with cleanup
- Loading and error states

**Don't reinvent patterns - copy and adapt.**

### 2. Polling Pattern

```javascript
// Ref-based to prevent interval stacking
const fetchRef = useRef(fetchData);
fetchRef.current = fetchData;

useEffect(() => {
  const interval = setInterval(() => fetchRef.current(), 5000);
  return () => clearInterval(interval);
}, []); // Empty deps - stable interval
```

### 3. Mutation Pattern

```javascript
const handleApprove = async (requestId) => {
  setLoading(true);
  try {
    await dispatch(approveOrbitRequest({ tokenId, stationId, identity, requestId }));
    // Refetch happens automatically in thunk
    toast({ title: 'Approved' });
  } catch (error) {
    toast({ title: 'Failed', description: error.message, variant: 'destructive' });
  } finally {
    setLoading(false);
  }
};
```

### 4. No Backend Changes Needed

All these components use existing backend methods. No Rust changes. Frontend-only migration.

### 5. Test on Mainnet

No local testing - deploy to mainnet after each component. Use test station `fec7w-zyaaa-aaaaa-qaffq-cai`.

---

## ✅ Success Criteria

### Functional Requirements
- [ ] All 5 components renamed from .disabled to .jsx
- [ ] All components use Redux (no React Query imports)
- [ ] All data fetching works via orbitSlice thunks
- [ ] All mutations work and trigger automatic refetch
- [ ] Polling works for real-time updates
- [ ] Error handling preserved
- [ ] Loading states display correctly

### Build Requirements
- [ ] Frontend builds without errors
- [ ] No TypeScript errors
- [ ] No import/dependency errors
- [ ] Bundle size reasonable (no unexpected bloat)

### Testing Requirements
- [ ] Tested RequestDialog: open, approve, reject
- [ ] Tested OrbitRequestsList: list, approve, reject
- [ ] Tested AssetsPage: list, search, create asset
- [ ] Tested AccountSetupDialog: wizard flow, create account
- [ ] Tested ExternalCanistersPage: list, manage canisters

---

## 🛑 PLANNING AGENT - YOUR JOB IS DONE

DO NOT IMPLEMENT THIS PLAN. The implementing agent will execute this in the worktree.

**The plan is now committed to the feature branch and ready for implementation.**
