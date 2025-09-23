# Address Book Pagination Fix - BigInt Encoding Issue

## Problem
The address book was throwing an encoding error when trying to list entries:
```
Error: Invalid opt nat64 argument: 0
```

## Root Cause
The JavaScript candid encoder requires **nested optional wrapping** for optional fields within optional records. This is a pattern used throughout the Orbit Station frontend but was missed in our initial implementation.

### What We Were Doing (WRONG)
```javascript
paginate: [{
  offset: 0,      // Plain number
  limit: 100      // Plain number
}]
```

### What Orbit Does (CORRECT)
```javascript
paginate: [{
  offset: [0],    // opt nat64 - wrapped in array
  limit: [100]    // opt nat64 - wrapped in array
}]
```

## The Pattern
For Candid type: `opt record { offset: opt nat64; limit: opt nat64 }`

Each level of optionality requires its own array wrapping:
1. `paginate: opt PaginationInput` → wrapped as `[{...}]`
2. `offset: opt nat64` → wrapped as `[0]` for Some(0) or `[]` for None
3. `limit: opt nat64` → wrapped as `[100]` for Some(100) or `[]` for None

## Fix Applied

### File: `/home/theseus/alexandria/daopad/src/daopad/daopad_frontend/src/services/addressBookService.js`

**Lines 62-87:** Updated pagination encoding to use nested optional wrapping

```javascript
// Build pagination with proper nested optional encoding
let paginateInput = null;

if (input.paginate) {
  const limit = input.paginate.limit || DEFAULT_ENTRIES_LIMIT;
  if (limit > MAX_LIST_ENTRIES_LIMIT) {
    throw new Error(`Limit cannot exceed ${MAX_LIST_ENTRIES_LIMIT}`);
  }

  // Each field inside PaginationInput is also optional and needs array wrapping
  paginateInput = {
    offset: input.paginate.offset !== undefined ? [input.paginate.offset] : [],
    limit: [limit]
  };
} else {
  // Default pagination with proper optional encoding
  paginateInput = {
    offset: [0],                      // opt nat64 as [0]
    limit: [DEFAULT_ENTRIES_LIMIT]    // opt nat64 as [100]
  };
}
```

## Verification

### Test Script Created
```bash
node test_js_encoding.mjs
```

This script tests both encoding patterns and confirms:
- ✅ Nested wrapping `[0]`, `[100]` - WORKS
- ❌ Plain numbers `0`, `100` - FAILS with exact error user saw

### DFX Test
```bash
# This works - matches JavaScript encoding
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_address_book_entries '(record {
  paginate = opt record {
    offset = opt 0;
    limit = opt 100
  }
})'
```

## Reference Pattern
Found in: `orbit-reference/apps/wallet/src/services/station.service.ts`

All Orbit Station frontend calls use this pattern consistently:
```typescript
paginate: [
  {
    limit: limit !== undefined ? [limit] : [],
    offset: offset !== undefined ? [BigInt(offset)] : [],
  }
]
```

## Lesson Learned
When integrating with Orbit Station or any Candid interface in JavaScript:
1. **Always check the reference implementation** in Orbit's own frontend
2. **Each optional field needs array wrapping**, regardless of nesting level
3. **Test with raw Actor calls first** to verify encoding before UI integration

## Deployment Status
✅ Fix deployed to mainnet frontend: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/

The address book should now work correctly with proper pagination encoding.