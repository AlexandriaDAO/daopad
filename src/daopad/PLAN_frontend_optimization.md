# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-frontend-optimization/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-frontend-optimization/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Backend changes:
     ```bash
     cargo build --target wasm32-unknown-unknown --release -p daopad_backend
     candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
     ./deploy.sh --network ic --backend-only
     cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
     ```
   - Frontend changes:
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "fix: Optimize frontend performance - eliminate decode errors and duplicate calls"
   git push -u origin feature/frontend-optimization
   gh pr create --title "Fix: Frontend Performance Optimization" --body "Implements PLAN_frontend_optimization.md

## Changes
- Fixed ListPermissions candid decode errors
- Eliminated 13 duplicate AddressBook API calls
- Prevented wasteful canister status queries

## Testing
- Verified security dashboard loads without errors
- Confirmed AddressBook makes single API call on mount
- Checked canister cards skip unauthorized status queries"
   ```
5. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view --json comments`
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

**Branch:** `feature/frontend-optimization`
**Worktree:** `/home/theseus/alexandria/daopad-frontend-optimization/src/daopad`

---

# Implementation Plan: Frontend Performance Optimization

## Problem Summary

From production console logs, three critical frontend issues identified:

### P0 Issue #1: ListPermissions Candid Decode Failure
```
"failed to decode canister response as (daopad_backend::types::orbit::ListPermissionsResult,):
Fail to decode argument 0"
```
**Impact**: ALL permission checks fail (treasury_control, governance, asset_management, etc.)
**Frequency**: Every security dashboard load

### P0 Issue #2: Excessive AddressBook Calls
```
[AddressBook] Calling list_address_book_entries: {...}  // 13 identical calls
```
**Impact**: 13x wasted cycles, slow page loads, unnecessary backend load
**Root Cause**: Caching infrastructure exists but unused

### P1 Issue #3: Unauthorized Canister Status Queries
```
"Only the controllers of the canister l7rlj-6aaaa-aaaap-qp2ra-cai can control it"
```
**Impact**: Failed calls waste cycles, clutter logs
**Preventable**: Should check controller status before calling

---

## Current State Documentation

### Issue #1: ListPermissions Type Mismatch

**Location**: `daopad_backend/src/types/orbit.rs:563-573`
```rust
#[derive(CandidType, Deserialize, Serialize, Debug)]
pub enum ListPermissionsResult {
    Ok {
        permissions: Vec<Permission>,
        privileges: Vec<PermissionCallerPrivileges>,
        total: u64,
        user_groups: Vec<UserGroup>,
        users: Vec<UserDTO>,  // Line 569: This field exists
        next_offset: Option<u64>,
    },
    Err(Error),
}
```

**Problem**: `daopad_backend/src/api/orbit_security.rs:209`
```rust
match result.0 {
    ListPermissionsResult::Ok { permissions, user_groups, .. } => {
        // Using ".." ignores `users` field - causes decode if field order wrong
        Ok(PermissionsData { permissions, user_groups })
    }
    ListPermissionsResult::Err(e) => Err(format!("Orbit returned error: {}", e)),
}
```

**Root Cause**: Candid field hashing - Orbit Station returns fields in a different order or structure than our type expects, causing decode failure despite having all fields defined.

### Issue #2: AddressBook Duplicate Calls

**Location 1**: `daopad_frontend/src/services/OrbitServiceBase.js:10-11, 141-159`
```javascript
class OrbitServiceBase {
  constructor(actor, serviceName) {
    this.cache = new Map();  // Line 10: Cache exists
    this.cacheTimeout = 5000;  // Line 11: 5 second timeout
  }

  getCached(key) { /* Lines 141-148: Cache getter implemented */ }
  setCache(key, data) { /* Lines 150-155: Cache setter implemented */ }
}
```

**Location 2**: `daopad_frontend/src/services/OrbitServiceBase.js:34-61`
```javascript
async handleOrbitCall(methodName, params, decoder) {
  try {
    console.log(`[${this.serviceName}] Calling ${methodName}:`, params);
    const result = await this.actor[methodName](params);  // Line 37: NO CACHE CHECK
    // ... handles result ...
  } catch (error) {
    // ... error handling ...
  }
}
```

**Problem**: Cache infrastructure exists but `handleOrbitCall` never calls `getCached()` or `setCache()`.

**Location 3**: `daopad_frontend/src/pages/AddressBookPage.jsx:46-97`
```javascript
const fetchList = useCallback(async () => {
  // ... fetches data ...
}, [searchTerm, pagination.offset, pagination.limit, canList]);  // Line 84: Many dependencies

// Auto-refresh every 30 seconds
useEffect(() => {
  if (!disableRefresh) {
    const interval = setInterval(fetchList, 30000);  // Line 89
    return () => clearInterval(interval);
  }
}, [fetchList, disableRefresh]);

// Initial load
useEffect(() => {
  fetchList();  // Line 96: Another trigger
}, [forceReload]);
```

**Problem**: Multiple useEffect hooks + frequent dependency changes + no deduplication = 13 calls on page load.

### Issue #3: Canister Status Authorization

**Location**: `daopad_frontend/src/components/canisters/CanisterCard.jsx:17-31`
```javascript
const fetchStatus = async () => {
  setLoading(true);
  try {
    const result = await canisterService.getCanisterStatus(
      canister.canister_id  // Line 22: No controller check first
    );
    if (!isCancelled) {
      if (result.success) {
        setStatus(result.data);
      } else {
        console.log(`IC status unavailable for ${canister.canister_id}:`, result.error);
        // Line 30: Logs error but call already made
      }
    }
  } catch (error) { /* ... */ }
};
```

**Problem**: Every CanisterCard mounts and immediately tries to fetch IC status, even for canisters the backend doesn't control.

---

## Implementation Plan

### Fix #1: ListPermissions Decode Error

**Test with dfx first** (MANDATORY):
```bash
export TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"

# Get exact response structure from Orbit
dfx canister --network ic call $TEST_STATION list_permissions '(record {
  resources = null;
  paginate = null;
})'

# Observe EXACT field order and structure in response
```

#### Backend: `daopad_backend/src/api/orbit_security.rs` (MODIFY)

**Lines 198-214 - Current:**
```rust
async fn fetch_permissions(station_id: Principal) -> Result<PermissionsData, String> {
    let input = ListPermissionsInput {
        resources: None,
        paginate: None,
    };

    let result: (ListPermissionsResult,) = ic_cdk::call(station_id, "list_permissions", (input,))
        .await
        .map_err(|e| format!("Failed to list permissions: {:?}", e))?;

    match result.0 {
        ListPermissionsResult::Ok { permissions, user_groups, .. } => {
            Ok(PermissionsData { permissions, user_groups })
        }
        ListPermissionsResult::Err(e) => Err(format!("Orbit returned error: {}", e)),
    }
}
```

**Fix - Explicit field destructuring:**
```rust
// PSEUDOCODE
async fn fetch_permissions(station_id: Principal) -> Result<PermissionsData, String> {
    let input = ListPermissionsInput {
        resources: None,
        paginate: None,
    };

    let result: (ListPermissionsResult,) = ic_cdk::call(station_id, "list_permissions", (input,))
        .await
        .map_err(|e| format!("Failed to list permissions: {:?}", e))?;

    match result.0 {
        // CRITICAL: Match ALL fields explicitly based on dfx test
        ListPermissionsResult::Ok {
            permissions,
            privileges: _,  // Explicitly ignore unused fields
            total: _,
            user_groups,
            users: _,  // Explicitly ignore users field
            next_offset: _,
        } => {
            Ok(PermissionsData { permissions, user_groups })
        }
        ListPermissionsResult::Err(e) => Err(format!("Orbit returned error: {}", e)),
    }
}
```

**Alternative approach if field order is the issue:**
```rust
// PSEUDOCODE
// If Orbit returns fields in different order, redefine type to match EXACT Orbit response
#[derive(CandidType, Deserialize, Serialize, Debug)]
pub enum ListPermissionsResult {
    Ok {
        // Match EXACT field order from dfx test output
        permissions: Vec<Permission>,
        user_groups: Vec<UserGroup>,  // Swap order if needed
        privileges: Vec<PermissionCallerPrivileges>,
        users: Vec<UserDTO>,
        total: u64,
        next_offset: Option<u64>,
    },
    Err(Error),
}
```

**Testing sequence:**
1. Run dfx test to see exact response structure
2. Update type definition to match EXACT field order
3. Update destructuring to explicitly handle all fields
4. Rebuild: `cargo build --target wasm32-unknown-unknown --release -p daopad_backend`
5. Extract candid: `candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did`
6. Deploy backend: `./deploy.sh --network ic --backend-only`
7. Test security dashboard loads without decode errors

### Fix #2: AddressBook Duplicate Calls

#### Frontend: `daopad_frontend/src/services/OrbitServiceBase.js` (MODIFY)

**Lines 34-61 - Current handleOrbitCall:**
```javascript
async handleOrbitCall(methodName, params, decoder) {
  try {
    console.log(`[${this.serviceName}] Calling ${methodName}:`, params);
    const result = await this.actor[methodName](params);
    // ... processes result ...
    return decoder ? decoder(result) : result;
  } catch (error) {
    console.error(`[${this.serviceName}] ${methodName} failed:`, error);
    throw error;
  }
}
```

**Fix - Add caching for idempotent read operations:**
```javascript
// PSEUDOCODE
async handleOrbitCall(methodName, params, decoder, options = {}) {
  const { bypassCache = false, cacheKey = null } = options;

  // Generate cache key from method + params
  const key = cacheKey || `${methodName}:${JSON.stringify(params)}`;

  // Check cache for read operations (list_, get_)
  if (!bypassCache && methodName.startsWith('list_') || methodName.startsWith('get_')) {
    const cached = this.getCached(key);
    if (cached) {
      return cached;
    }
  }

  try {
    console.log(`[${this.serviceName}] Calling ${methodName}:`, params);
    const result = await this.actor[methodName](params);

    // Process result
    if (result && typeof result === 'object') {
      if ('Ok' in result) {
        const innerResult = result.Ok;
        if (innerResult && typeof innerResult === 'object' && 'Ok' in innerResult) {
          const finalResult = decoder ? decoder(innerResult.Ok) : innerResult.Ok;
          this.setCache(key, finalResult);  // Cache successful result
          return finalResult;
        } else if (innerResult && typeof innerResult === 'object' && 'Err' in innerResult) {
          throw new Error(innerResult.Err.message || JSON.stringify(innerResult.Err));
        }
        const finalResult = decoder ? decoder(innerResult) : innerResult;
        this.setCache(key, finalResult);  // Cache successful result
        return finalResult;
      } else if ('Err' in result) {
        throw new Error(result.Err.message || JSON.stringify(result.Err));
      }
    }

    const finalResult = decoder ? decoder(result) : result;
    this.setCache(key, finalResult);  // Cache successful result
    return finalResult;
  } catch (error) {
    console.error(`[${this.serviceName}] ${methodName} failed:`, error);
    throw error;
  }
}
```

#### Frontend: `daopad_frontend/src/pages/AddressBookPage.jsx` (MODIFY)

**Lines 84-97 - Current:**
```javascript
}, [searchTerm, pagination.offset, pagination.limit, canList]);  // Many dependencies

// Auto-refresh every 30 seconds
useEffect(() => {
  if (!disableRefresh) {
    const interval = setInterval(fetchList, 30000);
    return () => clearInterval(interval);
  }
}, [fetchList, disableRefresh]);

// Initial load
useEffect(() => {
  fetchList();
}, [forceReload]);
```

**Fix - Consolidate effects and add stable reference:**
```javascript
// PSEUDOCODE

// Use ref to track if we've done initial load
const initialLoadRef = useRef(false);

// Memoize fetchList with stable dependencies
const fetchList = useCallback(async () => {
  if (!canList) return;

  setLoading(true);
  setError(null);
  try {
    const input = {
      search_term: searchTerm || undefined,
      paginate: {
        offset: pagination.offset,
        limit: pagination.limit
      }
    };

    const result = await addressBookService.listAddressBookEntries(input);
    // ... process result ...
  } catch (error) {
    console.error('Error loading address book:', error);
    setError(error.message || 'An unexpected error occurred');
  } finally {
    setLoading(false);
  }
}, [searchTerm, pagination.offset, pagination.limit, canList]);

// Single effect for initial load + auto-refresh
useEffect(() => {
  // Initial load
  if (!initialLoadRef.current) {
    initialLoadRef.current = true;
    fetchList();
  }

  // Auto-refresh (but not immediately after mount)
  if (!disableRefresh) {
    const interval = setInterval(fetchList, 30000);
    return () => clearInterval(interval);
  }
}, [fetchList, disableRefresh]);

// Manual reload trigger
useEffect(() => {
  if (forceReload > 0) {  // Only trigger if forceReload incremented
    fetchList();
  }
}, [forceReload, fetchList]);
```

**Expected result**: Reduce from 13 calls to 1-2 calls on page load.

### Fix #3: Canister Status Authorization Check

#### Frontend: `daopad_frontend/src/components/canisters/CanisterCard.jsx` (MODIFY)

**Lines 17-31 - Current:**
```javascript
const fetchStatus = async () => {
  setLoading(true);
  try {
    const result = await canisterService.getCanisterStatus(
      canister.canister_id
    );
    if (!isCancelled) {
      if (result.success) {
        setStatus(result.data);
      } else {
        console.log(`IC status unavailable for ${canister.canister_id}:`, result.error);
      }
    }
  } catch (error) {
    if (!isCancelled) {
      console.error(`Failed to fetch IC status for ${canister.canister_id}:`, error);
    }
  } finally {
    if (!isCancelled) {
      setLoading(false);
    }
  }
};
```

**Fix - Check canister metadata for controller status first:**
```javascript
// PSEUDOCODE
const fetchStatus = async () => {
  // Check if Orbit metadata indicates we control this canister
  // Orbit stores canisters with state, permissions, etc.
  // If we don't have "change" permission, we won't be a controller

  setLoading(true);
  try {
    // Option 1: Check from canister.permissions if available
    if (canister.permissions && !canister.permissions.change) {
      console.log(`Skipping IC status for ${canister.canister_id} - not a controller`);
      setStatus({ unavailable: true, reason: 'Not a controller' });
      return;
    }

    // Option 2: Try-catch and don't log error (it's expected)
    const result = await canisterService.getCanisterStatus(canister.canister_id);
    if (!isCancelled) {
      if (result.success) {
        setStatus(result.data);
      } else {
        // Expected failure for non-controlled canisters - don't log
        setStatus({ unavailable: true, reason: 'Authorization required' });
      }
    }
  } catch (error) {
    if (!isCancelled) {
      // Only log unexpected errors
      if (!error.message?.includes('controllers')) {
        console.error(`Unexpected error fetching IC status:`, error);
      }
      setStatus({ unavailable: true, reason: 'Cannot fetch' });
    }
  } finally {
    if (!isCancelled) {
      setLoading(false);
    }
  }
};
```

**UI handling:**
```javascript
// PSEUDOCODE
// In render section, handle unavailable status gracefully
{status?.unavailable ? (
  <Badge variant="secondary">Status: {status.reason}</Badge>
) : (
  // ... normal status display ...
)}
```

---

## Testing Requirements

### Test #1: ListPermissions Decode Fix
```bash
# 1. Test Orbit response structure
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_permissions '(record {
  resources = null;
  paginate = null;
})'

# 2. After backend fix, rebuild
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# 3. Deploy backend
./deploy.sh --network ic --backend-only

# 4. Sync declarations
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# 5. Test security dashboard
# Navigate to https://daopad.org and check console for:
# ✅ No "failed to decode canister response" errors
# ✅ Security checks load successfully
```

### Test #2: AddressBook Duplicate Calls Fix
```bash
# 1. Deploy frontend
npm run build
./deploy.sh --network ic --frontend-only

# 2. Test in browser
# Navigate to https://daopad.org/address-book
# Open console and count "[AddressBook] Calling list_address_book_entries" logs
# ✅ Should see 1-2 calls maximum on page load (not 13)
# ✅ Cache messages: "Using cached data for list_address_book_entries"

# 3. Test auto-refresh
# Wait 30 seconds
# ✅ Should see 1 additional call after 30s interval

# 4. Test search
# Type in search box
# ✅ Should use cached data while typing, only refresh after typing stops
```

### Test #3: Canister Status Fix
```bash
# 1. Deploy frontend
npm run build
./deploy.sh --network ic --frontend-only

# 2. Test in browser
# Navigate to https://daopad.org/canisters
# Open console and check for canister status errors
# ✅ No "Only the controllers of the canister" errors in console
# ✅ Canister cards show appropriate "Status: Not a controller" badge
# ✅ No wasted API calls to IC management canister
```

---

## Success Criteria

### P0 Fixes (Must Complete)
- [ ] Security dashboard loads without ListPermissions decode errors
- [ ] AddressBook page makes ≤2 API calls on initial load (down from 13)
- [ ] Canister cards don't attempt unauthorized status queries

### Performance Metrics
- [ ] Console logs show cache hits for AddressBook queries
- [ ] No candid decode errors in production logs
- [ ] Reduced cycle consumption from eliminated wasteful calls

### Code Quality
- [ ] Explicit field destructuring in ListPermissionsResult handling
- [ ] Caching implemented in OrbitServiceBase.handleOrbitCall
- [ ] Graceful handling of unavailable canister status
- [ ] All changes tested on mainnet (no local testing)

---

## Rollback Plan

If issues arise:
```bash
# Revert backend
dfx canister --network ic install lwsav-iiaaa-aaaap-qp2qq-cai --mode upgrade --wasm <previous_wasm>

# Revert frontend
dfx canister --network ic install l7rlj-6aaaa-aaaap-qp2ra-cai --mode upgrade --wasm <previous_wasm>
```

**Important**: All WAM files are stored in `target/wasm32-unknown-unknown/release/` - keep previous versions for rollback.
