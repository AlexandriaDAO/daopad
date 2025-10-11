# Fix Canisters Tab - Complete Implementation Plan

## 🚨 MANDATORY: ISOLATION CHECK AND EXECUTION PROMPT

### Context: Worktree Already Created

**This plan was created by the planning agent in an isolated worktree.**

**Location:** `/home/theseus/alexandria/daopad-fix-canisters-tab/src/daopad`
**Branch:** `feature/fix-canisters-tab`
**Plan file:** `FIX_CANISTERS_TAB_PLAN.md` (in this worktree)

### Step 0: Verify Isolation (RUN THIS FIRST!)

```bash
# STOP! Verify you are in the correct worktree
REPO_ROOT=$(git rev-parse --show-toplevel)
CURRENT_BRANCH=$(git branch --show-current)

# Check you're NOT in main repo
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: You are in the MAIN repository"
    echo "❌ This plan was created in a worktree at:"
    echo "    /home/theseus/alexandria/daopad-fix-canisters-tab"
    echo ""
    echo "Navigate to the worktree:"
    echo "  cd /home/theseus/alexandria/daopad-fix-canisters-tab/src/daopad"
    echo "  cat FIX_CANISTERS_TAB_PLAN.md  # Plan is here"
    exit 1
fi

# Check you're on the right branch
if [ "$CURRENT_BRANCH" != "feature/fix-canisters-tab" ]; then
    echo "❌ WARNING: You are on branch '$CURRENT_BRANCH'"
    echo "Expected: feature/fix-canisters-tab"
    echo "Are you in the right worktree?"
    exit 1
fi

echo "✅ You are in the correct worktree: $REPO_ROOT"
echo "✅ On branch: $CURRENT_BRANCH"
echo "✅ Safe to proceed with implementation"
```

### Your Execution Prompt

You are an autonomous PR orchestrator implementing Canisters Tab fixes.

**NOTE:** The planning agent already created this worktree and this plan. You will navigate there and execute.

EXECUTE THESE STEPS AUTONOMOUSLY (DO NOT ASK FOR PERMISSION):

Step 0 - NAVIGATE TO WORKTREE (DO THIS FIRST):
  cd /home/theseus/alexandria/daopad-fix-canisters-tab/src/daopad

Step 1 - VERIFY ISOLATION:
  pwd  # Should show /home/theseus/alexandria/daopad-fix-canisters-tab/src/daopad
  git branch --show-current  # Should show feature/fix-canisters-tab
  ls FIX_CANISTERS_TAB_PLAN.md  # This plan should be here

Step 2 - Implement Fixes (see Implementation Plan below)

Step 3 - Build and Deploy:
  # Backend (if modified):
  cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
  candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
  ./deploy.sh --network ic --backend-only

  # CRITICAL: Sync declarations
  cp -r ../../.dfx/ic/canisters/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

  # Frontend:
  ./deploy.sh --network ic --frontend-only

Step 4 - Test on Mainnet:
  # Test via browser at https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
  # Navigate to Canisters tab, verify data displays correctly

Step 5 - Commit and Push:
  git add -A
  git commit -m "Fix Canisters tab: data parsing, timestamps, IC status"
  git push -u origin feature/fix-canisters-tab

Step 6 - Create PR:
  gh pr create --title "Fix Canisters Tab Data Display" --body "$(cat <<'EOF'
## Summary
- Fix canister data parsing from Orbit Station
- Fix timestamp formatting (epoch 0 bug)
- Fix IC status query and display
- Improve error handling and fallbacks

## Test Plan
- [x] Verify canisters list displays correctly
- [x] Verify canister details show proper data
- [x] Verify timestamps format correctly
- [x] Verify IC status displays when available
- [x] Verify graceful fallbacks when data unavailable

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"

YOUR CRITICAL RULES:
- You MUST work in /home/theseus/alexandria/daopad-fix-canisters-tab/src/daopad (NOT main repo)
- Other agents ARE working in parallel - isolation is MANDATORY
- After sleep: IMMEDIATELY continue (no "should I check?" questions)
- Deploy to mainnet after changes
- ONLY STOP when: PR approved or critical error

START NOW with Step 0.

---

## Current State Analysis

### Problem Description

User sees the following issues in the Canisters tab:

1. **Wrong/Strange Canister ID**: Shows `l7rlj-6aaaa-aaaap-qp2ra-cai`
   - Actual DAOPad frontend is `l7rlj-6aaaa-aaaaa-qaffq-cai`
   - This suggests either wrong data from Orbit or parsing issues

2. **All Metadata Blank or Wrong**:
   - Status: Shows "Stopped" (should be "Active")
   - Created At: Shows "12/31/1969 7:00:00 PM" (epoch 0 - timestamp bug)
   - Description: Blank
   - Internal ID: Looks suspicious

3. **IC Status Unavailable**: Console shows "IC status unavailable: undefined"

4. **Console Errors**:
   ```
   Fetching canisters with filters: { paginate: {…}, canister_ids: null, ... }
   Listing canisters with request: { canister_ids: Array [], labels: Array [], ... }
   IC status unavailable: undefined
   ```

### File Structure

```
daopad_frontend/src/
├── components/
│   └── canisters/
│       ├── CanistersTab.jsx           # Main canisters list view
│       ├── CanisterCard.jsx           # Individual canister card
│       ├── CanisterDetails.jsx        # Detail view for one canister
│       ├── CanisterOverview.jsx       # Overview tab (shows metrics)
│       └── [other canister components]
└── services/
    ├── canisterService.js             # Frontend service for canister operations
    └── daopadBackend.js               # Backend actor wrapper

daopad_backend/src/
└── api/
    └── orbit_canisters.rs             # Backend proxy to Orbit Station
```

### Current Flow

1. **CanistersTab.jsx** → calls `canisterService.listCanisters(token.canister_id, filters)`
2. **canisterService.js** → calls `actor.list_orbit_canisters(stationId, request)`
3. **Backend** `list_orbit_canisters` → calls Orbit Station's `list_external_canisters`
4. **Backend** returns `Result<ListExternalCanistersResult, String>`
5. **Frontend** parses nested Result: `result.Ok.Ok.canisters`
6. **CanisterCard** fetches IC status via `get_canister_status(canister_id)`

### Root Causes

#### Issue 1: Timestamp Formatting Bug
```javascript
// CanisterOverview.jsx:formatDate()
const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  // Problem: Assumes timestamp is string (RFC3339) or nanoseconds
  // But Orbit Station returns bigint in different format
  const date = typeof timestamp === 'string'
    ? new Date(timestamp)
    : new Date(Number(timestamp) / 1e6); // Assumes nanoseconds
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};
```

Orbit Station returns timestamps as `nat64` (nanoseconds since epoch), but the parsing assumes milliseconds or wrong scale.

#### Issue 2: IC Status Query Failures
```javascript
// CanisterCard.jsx and CanisterOverview.jsx
const result = await canisterService.getCanisterStatus(canister.canister_id);
if (result.success) {
  setStatus(result.data);
} else {
  // Falls back silently - shows "unavailable"
}
```

The `get_canister_status` backend method requires **controller access** to the canister. If DAOPad backend is not a controller, this call will always fail.

#### Issue 3: Data Parsing Issues
```javascript
// canisterService.js:parseCanisterFromCandid()
function parseCanisterFromCandid(canister) {
  // Handles Candid record with hashed fields
  if (canister.Record?.fields) {
    const fields = canister.Record.fields;
    return {
      id: getField(fields, 'id'),
      canister_id: principalToString(getField(fields, 'canister_id')),
      name: getField(fields, 'name'),
      // ... other fields
    };
  }
  // Fallback to direct properties
  return { ...canister, canister_id: principalToString(canister.canister_id) };
}
```

This suggests that Orbit returns Candid with potentially hashed field names. If the hash function or field extraction fails, we get undefined/null values.

#### Issue 4: Wrong Canister Being Shown
The canister ID `l7rlj-6aaaa-aaaap-qp2ra-cai` doesn't match any known canister. Possible causes:
- Test data in Orbit Station
- Parsing error returning wrong field
- User looking at wrong token's canisters

---

## Implementation Plan

### Fix 1: Verify and Test Orbit Station Data

**Goal**: Understand what data is actually in the Orbit Station

**Steps**:
1. Query test Orbit Station directly via dfx to see raw data
2. Check if frontend canister is actually registered in Orbit
3. Verify the exact field structure returned by `list_external_canisters`

**Commands**:
```bash
# Get Orbit Station candid interface
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai __get_candid_interface_tmp_hack

# Try to list canisters (need to fix the query format)
# Based on errors, sort_by and states need proper types

# Check if specific canister exists
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai get_external_canister \
  '(record { canister_id = principal "l7rlj-6aaaa-aaaaa-qaffq-cai" })'
```

**Expected Output**: Raw canister data showing actual field structure

### Fix 2: Fix Timestamp Formatting

**File**: `daopad_frontend/src/components/canisters/CanisterOverview.jsx`

**Problem**: Timestamps showing "12/31/1969" (epoch 0)

**Current Code** (lines 63-70):
```javascript
const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  // Handle both RFC3339 strings and nanosecond timestamps
  const date = typeof timestamp === 'string'
    ? new Date(timestamp)
    : new Date(Number(timestamp) / 1e6); // Convert from nanoseconds if number
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};
```

**Fix**:
```javascript
const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';

  try {
    let date;

    if (typeof timestamp === 'string') {
      // RFC3339 string
      date = new Date(timestamp);
    } else if (typeof timestamp === 'bigint' || typeof timestamp === 'number') {
      // Orbit returns nat64 in nanoseconds (1e9 per second)
      // Convert to milliseconds for JS Date (1e3 per second)
      const ms = Number(timestamp) / 1e6; // nano to milli: divide by 1,000,000
      date = new Date(ms);
    } else {
      return 'Invalid date format';
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  } catch (err) {
    console.error('Failed to format date:', timestamp, err);
    return 'N/A';
  }
};
```

**Apply to**:
- `CanisterOverview.jsx:63-70` (formatDate function)
- Same pattern applies anywhere timestamps are displayed

### Fix 3: Fix IC Status Query

**Problem**: `get_canister_status` requires controller access, which DAOPad backend may not have.

**Option A: Graceful Degradation (RECOMMENDED)**

Keep current behavior but improve UI messaging:

**File**: `daopad_frontend/src/components/canisters/CanisterCard.jsx` (lines 15-45)

**Current Code**: Already has fallback, but improve error message

**Fix**: Add better logging to understand WHY status fails:

```javascript
const fetchStatus = async () => {
  setLoading(true);
  try {
    const result = await canisterService.getCanisterStatus(canister.canister_id);

    if (!isCancelled) {
      if (result.success) {
        setStatus(result.data);
      } else {
        // Log specific error for debugging
        console.log(`IC status unavailable for ${canister.canister_id}:`, result.error);
      }
    }
  } catch (error) {
    if (!isCancelled) {
      console.error('Failed to fetch IC status:', error);
    }
  } finally {
    if (!isCancelled) {
      setLoading(false);
    }
  }
};
```

**File**: `daopad_frontend/src/components/canisters/CanisterOverview.jsx` (lines 31-49)

Same pattern - improve logging.

**Option B: Request Controller Access**

If we want full IC status, add Orbit Station as controller to the frontend canister:

```bash
dfx canister --network ic update-settings l7rlj-6aaaa-aaaaa-qaffq-cai \
  --add-controller fec7w-zyaaa-aaaaa-qaffq-cai
```

**Recommendation**: Use Option A (graceful degradation) for now. Status is nice-to-have, not required.

### Fix 4: Fix Canister Data Parsing

**Problem**: `parseCanisterFromCandid` may be failing to extract fields correctly

**File**: `daopad_frontend/src/services/canisterService.js` (lines 29-73)

**Current Code**:
```javascript
function parseCanisterFromCandid(canister) {
  if (!canister) return null;

  // Helper to convert Principal objects to strings
  const principalToString = (value) => {
    if (value && typeof value === 'object' && value._isPrincipal) {
      return value.toText();
    }
    return value;
  };

  // If it's already a proper object, ensure Principal is string
  if (canister.id && canister.canister_id) {
    return {
      ...canister,
      canister_id: principalToString(canister.canister_id)
    };
  }

  // Handle Candid record with potentially hashed fields
  if (canister.Record?.fields) {
    const fields = canister.Record.fields;
    return {
      id: getField(fields, 'id'),
      canister_id: principalToString(getField(fields, 'canister_id')),
      name: getField(fields, 'name'),
      description: getField(fields, 'description'),
      labels: getField(fields, 'labels') || [],
      metadata: getField(fields, 'metadata') || [],
      state: getField(fields, 'state'),
      permissions: getField(fields, 'permissions'),
      request_policies: getField(fields, 'request_policies'),
      created_at: getField(fields, 'created_at'),
      modified_at: getField(fields, 'modified_at'),
      monitoring: getField(fields, 'monitoring'),
    };
  }

  // Fallback to direct properties with Principal conversion
  return {
    ...canister,
    canister_id: principalToString(canister.canister_id)
  };
}
```

**Fix**: Add extensive logging to debug what we're actually receiving:

```javascript
function parseCanisterFromCandid(canister) {
  if (!canister) {
    console.warn('parseCanisterFromCandid: received null/undefined canister');
    return null;
  }

  console.log('Parsing canister:', JSON.stringify(canister, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));

  const principalToString = (value) => {
    if (value && typeof value === 'object' && value._isPrincipal) {
      return value.toText();
    }
    return value;
  };

  // Try direct properties first (most common case)
  if (canister.id && canister.canister_id) {
    const parsed = {
      ...canister,
      canister_id: principalToString(canister.canister_id)
    };
    console.log('Parsed canister (direct):', parsed.id, parsed.canister_id);
    return parsed;
  }

  // Handle Candid record with hashed fields (fallback)
  if (canister.Record?.fields) {
    console.log('Parsing hashed Candid record with', canister.Record.fields.length, 'fields');
    const fields = canister.Record.fields;
    const parsed = {
      id: getField(fields, 'id'),
      canister_id: principalToString(getField(fields, 'canister_id')),
      name: getField(fields, 'name'),
      description: getField(fields, 'description') || '',
      labels: getField(fields, 'labels') || [],
      metadata: getField(fields, 'metadata') || [],
      state: getField(fields, 'state'),
      permissions: getField(fields, 'permissions'),
      request_policies: getField(fields, 'request_policies'),
      created_at: getField(fields, 'created_at'),
      modified_at: getField(fields, 'modified_at'),
      monitoring: getField(fields, 'monitoring'),
    };
    console.log('Parsed canister (hashed):', parsed.id, parsed.canister_id);
    return parsed;
  }

  // Last resort: return as-is with Principal conversion
  console.warn('Canister format unexpected, using fallback:', canister);
  return {
    ...canister,
    canister_id: principalToString(canister.canister_id)
  };
}
```

### Fix 5: Add Debug Mode for Canisters Tab

**File**: `daopad_frontend/src/components/canisters/CanistersTab.jsx`

**Add** before line 35 (in `fetchCanisters`):

```javascript
const fetchCanisters = async () => {
  setLoading(true);
  setError(null);

  try {
    console.log('=== FETCHING CANISTERS ===');
    console.log('Token canister ID:', token.canister_id);
    console.log('Filters:', JSON.stringify(filters, null, 2));

    const result = await canisterService.listCanisters(
      token.canister_id,
      filters
    );

    console.log('=== LIST CANISTERS RESULT ===');
    console.log('Success:', result.success);
    if (result.success) {
      console.log('Total canisters:', result.total);
      console.log('Raw canisters:', result.data);
      console.log('Privileges:', result.privileges);
    } else {
      console.error('Error:', result.error);
    }

    // ... rest of the function
```

### Fix 6: Improve Error Handling

**File**: `daopad_frontend/src/services/canisterService.js` (lines 75-139)

**Current Code** (listCanisters):
```javascript
if (result.Ok) {
  const orbitResult = result.Ok;
  if (orbitResult.Ok) {
    const canisters = orbitResult.Ok.canisters.map(parseCanisterFromCandid);
    return {
      success: true,
      data: canisters,
      total: Number(orbitResult.Ok.total),
      privileges: orbitResult.Ok.privileges
    };
  } else {
    return {
      success: false,
      error: orbitResult.Err?.message || 'Failed to list canisters'
    };
  }
} else {
  return {
    success: false,
    error: result.Err
  };
}
```

**Fix**: Add null checks and better error messages:

```javascript
if (result.Ok) {
  const orbitResult = result.Ok;
  if (orbitResult.Ok) {
    // Validate response structure
    if (!orbitResult.Ok.canisters) {
      console.error('Orbit returned Ok but no canisters array:', orbitResult.Ok);
      return {
        success: false,
        error: 'Invalid response from Orbit Station: missing canisters array'
      };
    }

    const canisters = orbitResult.Ok.canisters
      .map(parseCanisterFromCandid)
      .filter(c => c !== null); // Remove any failed parses

    console.log(`Successfully parsed ${canisters.length} canisters from Orbit`);

    return {
      success: true,
      data: canisters,
      total: orbitResult.Ok.total ? Number(orbitResult.Ok.total) : canisters.length,
      privileges: orbitResult.Ok.privileges
    };
  } else {
    // Extract detailed error message
    const errorMsg = orbitResult.Err?.message
      || orbitResult.Err?.code
      || JSON.stringify(orbitResult.Err)
      || 'Failed to list canisters';

    console.error('Orbit Station returned Err:', orbitResult.Err);

    return {
      success: false,
      error: `Orbit Station error: ${errorMsg}`
    };
  }
} else {
  console.error('Backend returned Err:', result.Err);
  return {
    success: false,
    error: `Backend error: ${result.Err || 'Unknown error'}`
  };
}
```

### Fix 7: Backend - Ensure Proper Optional Handling

**File**: `daopad_backend/src/api/orbit_canisters.rs` (lines 17-45)

**Current Code** looks correct, but verify the types match Orbit exactly:

```rust
#[ic_cdk::update]
async fn list_orbit_canisters(
    token_canister_id: Principal,
    filters: ListExternalCanistersInput,
) -> Result<ListExternalCanistersResult, String> {
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| "No Orbit Station linked to this token".to_string())?;

    // Ensure all fields are passed correctly
    let request = ListExternalCanistersInput {
        canister_ids: filters.canister_ids,
        labels: filters.labels,
        states: filters.states,
        paginate: filters.paginate,
        sort_by: filters.sort_by,
    };

    // Log for debugging (remove in production)
    ic_cdk::println!("Calling list_external_canisters on station {} with filters: {:?}",
        station_id, request);

    let result: CallResult<(ListExternalCanistersResult,)> = call(
        station_id,
        "list_external_canisters",
        (request,),
    )
    .await;

    match result {
        Ok((res,)) => {
            ic_cdk::println!("Successfully received response from Orbit");
            Ok(res)
        },
        Err((code, msg)) => {
            ic_cdk::println!("Orbit call failed: {:?} - {}", code, msg);
            Err(format!("Failed to list canisters: {:?} - {}", code, msg))
        },
    }
}
```

**Check Types File**: `daopad_backend/src/types/orbit.rs`

Ensure `ListExternalCanistersInput` matches Orbit Station's exact structure:

```rust
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct ListExternalCanistersInput {
    pub canister_ids: Vec<String>,  // Vec of UUID strings, not Principals
    pub labels: Vec<String>,
    pub states: Vec<ExternalCanisterState>,
    pub paginate: Option<PaginationInput>,
    pub sort_by: Option<ListExternalCanistersSortInput>,
}
```

---

## Testing Strategy

### Step 1: Test Orbit Station Direct Query

Before implementing fixes, verify we can query Orbit Station directly:

```bash
# Get candid interface to understand types
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai __get_candid_interface_tmp_hack \
  > /tmp/orbit_station.did

# Look for list_external_canisters signature
grep -A 10 "list_external_canisters" /tmp/orbit_station.did

# Try minimal query
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_external_canisters \
  '(record { canister_ids = vec {}; labels = vec {}; states = vec {}; paginate = opt record { offset = opt (0 : nat64); limit = opt (20 : nat64) } })'
```

**Expected**: Either canister data or clear error about what's wrong with the query.

### Step 2: Test via DAOPad Backend

```bash
# Call our backend method
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_orbit_canisters \
  '(principal "ysy5f-2qaaa-aaaap-qkmmq-cai", record { canister_ids = vec {}; labels = vec {}; states = vec {}; paginate = vec { record { offset = opt (0 : nat64); limit = opt (20 : nat64) } }; sort_by = vec {} })'
```

**Expected**: Same data as direct Orbit query, wrapped in our Result type.

### Step 3: Test Frontend After Fixes

1. Deploy frontend changes
2. Open browser console at https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
3. Navigate to token dashboard → Canisters tab
4. Check console for detailed logs from our debug additions
5. Verify:
   - Canister cards display correctly
   - Timestamps show real dates (not epoch 0)
   - Status shows correctly (or graceful "unavailable")
   - Clicking "Manage" shows canister details

### Step 4: Integration Test

**Test Scenarios**:

1. **Empty Canisters List**
   - If no canisters registered, should show "No canisters yet" message
   - Should offer "Add Your First Canister" button

2. **One Canister (Frontend)**
   - Should display the frontend canister
   - Should show correct ID, name, timestamps
   - IC status may be unavailable (OK if graceful)
   - Clicking "Manage" should show details page

3. **Multiple Canisters** (if any)
   - All should render without errors
   - Each should have correct metadata

### Step 5: Verify on Mainnet

```bash
# After deployment, test end-to-end
# 1. Go to https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
# 2. Connect wallet
# 3. Select ALEX token
# 4. Go to Canisters tab
# 5. Verify display is correct

# Check backend logs
dfx canister --network ic logs lwsav-iiaaa-aaaap-qp2qq-cai | tail -50
```

---

## Scope Estimate

### Files Modified

**Frontend**:
1. `daopad_frontend/src/services/canisterService.js` - Improve parsing and error handling
2. `daopad_frontend/src/components/canisters/CanistersTab.jsx` - Add debug logging
3. `daopad_frontend/src/components/canisters/CanisterCard.jsx` - Improve status query logging
4. `daopad_frontend/src/components/canisters/CanisterOverview.jsx` - Fix timestamp formatting

**Backend** (possibly):
5. `daopad_backend/src/api/orbit_canisters.rs` - Add logging for debugging

### Lines of Code
- **Frontend**: ~150 lines changed (mostly logging + timestamp fix)
- **Backend**: ~20 lines (just logging)
- **Total**: ~170 lines changed

### Complexity
- **Low**: Timestamp formatting fix, logging additions
- **Medium**: Error handling improvements, data parsing validation
- **Debugging**: Most time will be spent verifying what Orbit actually returns

### Time Estimate
- Investigation + dfx testing: 1 hour
- Implementation: 1-2 hours
- Testing on mainnet: 1 hour
- **Total**: 3-4 hours

---

## Critical Implementation Notes

### 🚨 MANDATORY CHECKS

1. **Always verify Orbit Station data FIRST** before implementing
   - Don't assume the data structure - test it with dfx
   - Compare raw Orbit response vs what we receive in frontend

2. **Deploy to mainnet after EVERY change**
   - No local testing - mainnet only
   - Use `./deploy.sh --network ic`

3. **Check console logs extensively**
   - Add logs at every step
   - Log raw data structures, not just success/fail
   - Leave debug logs in for now (can remove later)

4. **Handle bigint carefully**
   - Timestamps are nat64 (bigint in JS)
   - Use `Number()` for conversion, check for overflow
   - Format for JSON with replacer function

5. **Graceful degradation is OK**
   - IC status unavailable? Show message, don't error
   - Some fields missing? Show "N/A", don't crash
   - Orbit query fails? Show clear error message

### Orbit Station API Quirks

1. **Timestamp Format**: `nat64` nanoseconds since epoch
   - Divide by 1e6 to get milliseconds for JS Date
   - Check for 0 or very small values (epoch bug)

2. **Optional Fields**: Orbit uses Vec for optional in some places
   - Empty vec `[]` means None
   - One-element vec `[value]` means Some(value)

3. **Field Hashing**: Candid may hash field names to IDs
   - Use `candid_hash()` function to compute
   - getField() helper already handles this

4. **Controller Access**: Many operations require controller rights
   - `get_canister_status` needs controller access
   - Gracefully degrade if unavailable

---

## Success Criteria

✅ **Fix is successful when:**

1. Canisters tab loads without errors
2. Canister cards show real data (not blanks)
3. Timestamps display correctly (not "12/31/1969")
4. Canister IDs match reality
5. IC status either displays correctly OR shows graceful "unavailable" message
6. Console has helpful debug logs showing data flow
7. Clicking "Manage" on a canister shows detail view correctly
8. No JavaScript errors in console

✅ **Nice to have (not required):**
- IC status displays (requires controller access)
- Cycles monitoring shows real numbers
- All metadata fields populated

---

## Handoff for Implementing Agent

```bash
# Navigate to the worktree where the plan lives
cd /home/theseus/alexandria/daopad-fix-canisters-tab/src/daopad

# Read the plan
cat FIX_CANISTERS_TAB_PLAN.md

# Then pursue it
# (The plan contains the full orchestrator prompt)
```

**Or use this prompt:**

```
cd /home/theseus/alexandria/daopad-fix-canisters-tab/src/daopad && pursue FIX_CANISTERS_TAB_PLAN.md
```

**CRITICAL**:
- Plan is IN the worktree (not main repo)
- Plan is already committed to feature branch
- Implementing agent works in SAME worktree
- Plan and implementation stay together on feature branch

---

**Planning Complete**
**Estimated**: 3-4 hours, 1 PR
**Next**: Implementing agent executes in this worktree
