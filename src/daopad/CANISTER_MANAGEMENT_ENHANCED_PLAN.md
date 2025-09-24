# Enhanced Canister Management Implementation Plan

## 🚨 Primary Issue: BigInt Serialization Error

### The Problem
```
Failed to list canisters: Error: Invalid record {sort_by:opt vec text; paginate:opt record {offset:opt nat64; limit:opt nat64}; filter_by:opt vec record {key:text; value:vec text}} argument:
field paginate -> Invalid opt record {offset:opt nat64; limit:opt nat64} argument: {"offset":"BigInt(0)","limit":"BigInt(20)"}
```

**Root Cause:** BigInt values from React state are being JSON.stringify'd incorrectly, resulting in string representations like `"BigInt(0)"` instead of actual BigInt objects.

### ✅ Empirical Validation

**Testing what Orbit actually expects:**
```bash
# This works perfectly:
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_external_canisters '(record {
  paginate = opt record { offset = opt 0; limit = opt 20 };
  sort_by = null;
  labels = null;
  states = null;
  canister_ids = null
})'
```

**Actual Response Structure:**
- Returns: `Ok { canisters: [...], total: nat64, privileges: [...] }`
- Fields are NOT hashed (using direct names)
- All optional fields must be present (even if null)

## 🛠️ Issue #1: BigInt Serialization in Frontend

### The Fix

**📝 File:** `/home/theseus/alexandria/daopad/src/daopad/daopad_frontend/src/components/canisters/CanistersTab.jsx`
**Line:** 19-22

**Problem Code:**
```javascript
const [filters, setFilters] = useState({
  paginate: { offset: 0n, limit: 20n },  // BigInt literals
  sort_by: null,
  filter_by: null
});
```

**Solution:** Don't use BigInt literals in state. Convert to BigInt only when calling the service:

```javascript
const [filters, setFilters] = useState({
  paginate: { offset: 0, limit: 20 },  // Regular numbers
  sort_by: null,
  filter_by: null
});
```

**📝 File:** `/home/theseus/alexandria/daopad/src/daopad/daopad_frontend/src/services/canisterService.js`
**Line:** 63-79

**Enhanced listCanisters method:**
```javascript
listCanisters: async (tokenCanisterId, filters = {}) => {
  try {
    const actor = await getBackendActor();

    // Convert pagination numbers to BigInt if present
    let paginateOpt = [];
    if (filters.paginate) {
      paginateOpt = [{
        offset: filters.paginate.offset !== undefined ?
          [BigInt(filters.paginate.offset)] : [],
        limit: filters.paginate.limit !== undefined ?
          [BigInt(filters.paginate.limit)] : []
      }];
    }

    // Build request with proper optional encoding
    const request = {
      paginate: paginateOpt,
      sort_by: filters.sort_by || [],
      filter_by: filters.filter_by || []
    };

    console.log('Listing canisters with request:', request);

    const result = await actor.list_orbit_canisters(
      Principal.fromText(tokenCanisterId),
      request
    );

    if (result.Ok) {
      const canisters = result.Ok.canisters.map(parseCanisterFromCandid);
      return {
        success: true,
        data: canisters,
        total: Number(result.Ok.total) // Convert BigInt to number for UI
      };
    } else {
      return {
        success: false,
        error: result.Err
      };
    }
  } catch (error) {
    console.error('Failed to list canisters:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

**🧪 Test to Verify:**
```javascript
// Before fix (in browser console):
JSON.stringify({ offset: 0n, limit: 20n })
// Error: Do not know how to serialize a BigInt

// After fix:
const paginate = { offset: [BigInt(0)], limit: [BigInt(20)] };
// Works correctly - BigInt objects preserved
```

## 🛠️ Issue #2: Backend Type Mismatch

### The Problem
The backend is using incorrect field names for Orbit Station's `ListExternalCanistersInput`.

**What Orbit Expects:**
```candid
type ListExternalCanistersInput = record {
  canister_ids : opt vec principal;
  labels : opt vec text;
  states : opt vec ExternalCanisterState;
  paginate : opt PaginationInput;
  sort_by : opt ListExternalCanistersSortInput;
};
```

**What Backend Currently Has:**
```rust
pub struct ListExternalCanistersInput {
    pub paginate: Option<PaginationInput>,
    pub sort_by: Option<Vec<String>>,
    pub filter_by: Option<Vec<ExternalCanisterFilter>>, // ❌ Wrong!
}
```

### The Fix

**📝 File:** `/home/theseus/alexandria/daopad/src/daopad/daopad_backend/src/types/orbit.rs`
**Line:** ~1180 (approximately)

**Update ListExternalCanistersInput:**
```rust
#[derive(CandidType, Deserialize, Debug)]
pub struct ListExternalCanistersInput {
    pub canister_ids: Option<Vec<Principal>>,
    pub labels: Option<Vec<String>>,
    pub states: Option<Vec<ExternalCanisterState>>,
    pub paginate: Option<PaginationInput>,
    pub sort_by: Option<ListExternalCanistersSortInput>,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum ExternalCanisterState {
    Active,
    Archived,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct ListExternalCanistersSortInput {
    // Add based on Orbit spec
    pub field: String, // "name", "created_at", etc.
    pub direction: SortDirection,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum SortDirection {
    Asc,
    Desc,
}
```

**📝 File:** `/home/theseus/alexandria/daopad/src/daopad/daopad_backend/src/api/orbit_canisters.rs`
**Line:** 26-30

**Update to match new types:**
```rust
let request = ListExternalCanistersInput {
    canister_ids: filters.canister_ids,
    labels: filters.labels,
    states: filters.states,
    paginate: filters.paginate,
    sort_by: filters.sort_by,
};
```

**🧪 Test to Verify:**
```bash
# After backend update:
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_orbit_canisters '(
  principal "kqqlc-v6aaa-aaaak-bi7xq-cai",
  record {
    canister_ids = null;
    labels = null;
    states = null;
    paginate = opt record { offset = opt 0; limit = opt 20 };
    sort_by = null
  }
)'
```

## 🛠️ Issue #3: Frontend Filters Update

### Update CanisterFilters Component

**📝 File:** `/home/theseus/alexandria/daopad/src/daopad/daopad_frontend/src/components/canisters/CanisterFilters.jsx`

**Update to use correct field names:**
```javascript
const handleApplyFilters = () => {
  const newFilters = {
    canister_ids: searchTerm ? [Principal.fromText(searchTerm)] : null,
    labels: selectedLabels.length > 0 ? selectedLabels : null,
    states: selectedState ? [selectedState] : null,
    paginate: {
      offset: 0,
      limit: pageSize
    },
    sort_by: sortBy ? {
      field: sortBy,
      direction: sortDirection
    } : null
  };

  onFiltersChange(newFilters);
};
```

## 🛠️ Issue #4: Declaration Sync

### After Backend Changes

**⚠️ CRITICAL:** The frontend uses its own declarations directory that doesn't auto-sync!

```bash
# After making backend changes:
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did
./deploy.sh --network ic --backend-only

# MUST sync declarations manually:
cp -r src/declarations/daopad_backend/* src/daopad/daopad_frontend/src/declarations/daopad_backend/

# Then deploy frontend:
./deploy.sh --network ic --frontend-only
```

## 📋 Complete Fix Checklist

- [ ] Update CanistersTab.jsx to use regular numbers instead of BigInt in state
- [ ] Fix canisterService.js to properly convert numbers to BigInt when calling backend
- [ ] Update backend ListExternalCanistersInput to match Orbit's actual interface
- [ ] Add missing ExternalCanisterState and sort types to backend
- [ ] Update CanisterFilters.jsx to use correct field names
- [ ] Run candid-extractor after backend changes
- [ ] Sync declarations to frontend directory
- [ ] Deploy backend first, then frontend
- [ ] Test with dfx commands to verify

## 🧪 Verification Commands

### 1. Test Backend Directly
```bash
# Should return canisters without error:
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_orbit_canisters '(
  principal "kqqlc-v6aaa-aaaak-bi7xq-cai",
  record {
    canister_ids = null;
    labels = null;
    states = null;
    paginate = opt record { offset = opt 0; limit = opt 20 };
    sort_by = null
  }
)'
```

### 2. Test Frontend Service
```javascript
// In browser console:
import { canisterService } from './services/canisterService.js';
const result = await canisterService.listCanisters('kqqlc-v6aaa-aaaak-bi7xq-cai', {
  paginate: { offset: 0, limit: 20 }
});
console.log('Result:', result);
```

### 3. Verify BigInt Handling
```javascript
// Check that BigInt values are properly created:
const paginate = { offset: [BigInt(0)], limit: [BigInt(20)] };
console.log('Type of offset:', typeof paginate.offset[0]); // Should be "bigint"
```

## ⚠️ Common Pitfalls Addressed

1. **BigInt in JSON:** Never put BigInt values directly in React state that might be serialized
2. **Optional Field Encoding:** Always wrap optionals in arrays, even for nested records
3. **Field Name Matching:** Backend types must exactly match Orbit's Candid interface
4. **Declaration Sync:** Frontend declarations don't auto-update - manual sync required
5. **Type Conversions:** Convert BigInt results to numbers for UI display

## 🎯 Expected Outcome

After implementing these fixes:
1. Canister list loads without errors
2. Pagination works correctly
3. Filters apply properly
4. All canister management operations function as expected

## 🔍 Debug Pattern

If errors persist:
1. Check browser console for actual request payload
2. Compare with working dfx command structure
3. Verify field names match Orbit's spec.did exactly
4. Ensure BigInt values aren't being stringified
5. Confirm declarations are synced after backend changes

This plan addresses the root causes empirically validated through testing with the actual Orbit Station canister.