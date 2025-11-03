# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-fix-candid-decoder/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-fix-candid-decoder/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Backend changes:
     ```bash
     cargo build --target wasm32-unknown-unknown --release -p daopad_backend
     candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
     ./deploy.sh --network ic --backend-only
     cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "Fix: Replace 773-line manual Candid decoder with proper typed deserialization"
   git push -u origin feature/fix-candid-decoder
   gh pr create --title "Fix: Replace manual Candid decoder with proper typed deserialization" --body "Replaces 773-line manual decoder with proper typed calls. Fixes #candid-decoder-issue"
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

**Branch:** `feature/fix-candid-decoder`
**Worktree:** `/home/theseus/alexandria/daopad-fix-candid-decoder/src/daopad`

---

# Implementation Plan: Fix Candid Decoder

## Problem Statement
DAOPad has a 773-line manual Candid decoder (`orbit_requests.rs`) with 40+ hardcoded hash mappings that will break silently when Orbit changes any field name. Despite having proper type definitions, they can't be used due to Candid field name hash optimization.

## Test Baseline (MUST PASS AFTER FIX)

### Working Commands to Verify:
```bash
# Test 1: Basic list requests (should return 179 total)
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_orbit_requests '(
  principal "ysy5f-2qaaa-aaaap-qkmmq-cai",
  record {
    statuses = opt vec { variant { Created }; variant { Approved }; variant { Completed } };
    paginate = opt record { limit = opt 3; offset = opt 0 };
    only_approvable = false;
    with_evaluation_results = false;
    sort_by = null;
    requester_ids = null;
    approver_ids = null;
    operation_types = null;
    expiration_from_dt = null;
    expiration_to_dt = null;
    created_from_dt = null;
    created_to_dt = null;
    deduplication_keys = null;
    tags = null
  }
)'

# Test 2: Filter by EditUser (should return 26 total)
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_orbit_requests '(
  principal "ysy5f-2qaaa-aaaap-qkmmq-cai",
  record {
    operation_types = opt vec { variant { EditUser } };
    paginate = opt record { limit = opt 5; offset = opt 0 };
    # ... rest same as above
  }
)'

# Test 3: Simple endpoint (should return 10 records)
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai get_orbit_requests_simple '()'
```

## Current State Analysis

### Files to Modify:
1. `daopad_backend/src/api/orbit_requests.rs` (773 lines) - REPLACE manual decoder
2. `daopad_backend/src/api/orbit.rs` - Update to use typed calls
3. `daopad_backend/src/types/orbit/orbit_types/requests.rs` - Ensure types match Orbit

### Current Implementation Problems:
```rust
// Line 17-76: Magic number mappings
fn label_name(label: &Label) -> Option<String> {
    match label {
        Label::Id(id) => Some(match *id {
            3736853960 => "Created".to_string(),  // MAGIC NUMBER!
            4044063083 => "Completed".to_string(), // MAGIC NUMBER!
            // ... 40+ more hardcoded hashes
```

```rust
// Line 707-711: Using call_raw instead of typed call
let raw_bytes = call_raw(station_id, "list_requests", args, 0)
    .await
    .map_err(|(code, msg)| format!("IC call failed: ({:?}, {})", code, msg))?;

parse_list_requests_response(raw_bytes)  // 400+ line manual parser!
```

## Implementation Steps

### Step 1: Generate Proper Orbit Types
```bash
# PSEUDOCODE - Generate types from Orbit's actual candid
dfx canister --network ic metadata fec7w-zyaaa-aaaaa-qaffq-cai candid:service > orbit_station.did
didc bind orbit_station.did -t rs > daopad_backend/src/types/orbit/generated_types.rs
```

### Step 2: Replace Manual Decoder in `orbit_requests.rs`

**File:** `daopad_backend/src/api/orbit_requests.rs` (MODIFY)

```rust
// PSEUDOCODE - Remove lines 1-407 (entire manual decoder section)
// DELETE: fn label_name(), field(), candid_hash(), idl_to_string(), etc.
// DELETE: parse_status(), parse_approvals(), parse_requests(), parse_list_requests_response()

// REPLACE WITH:
use crate::types::orbit::generated_types::{
    ListRequestsInput as OrbitListRequestsInput,
    ListRequestsResult as OrbitListRequestsResult,
    ListRequestsResponse as OrbitListRequestsResponse,
};

#[update]
pub async fn list_orbit_requests(
    token_canister_id: Principal,
    filters: ListRequestsInput,
) -> Result<ListOrbitRequestsResponse, String> {
    // Get station ID from storage
    let station_id = get_station_id(token_canister_id)?;

    // Use TYPED call instead of call_raw
    let result: Result<(OrbitListRequestsResult,), _> =
        ic_cdk::call(station_id, "list_requests", (filters,)).await;

    match result {
        Ok((OrbitListRequestsResult::Ok(response),)) => {
            // Transform Orbit response to DAOPad simplified format
            Ok(transform_orbit_response(response))
        }
        Ok((OrbitListRequestsResult::Err(e),)) => {
            Err(format!("Orbit error: {:?}", e))
        }
        Err(e) => Err(format!("Call failed: {:?}", e))
    }
}

// Transform function to maintain backward compatibility
fn transform_orbit_response(orbit: OrbitListRequestsResponse) -> ListOrbitRequestsResponse {
    ListOrbitRequestsResponse {
        requests: orbit.requests.into_iter().map(|r| {
            OrbitRequestSummary {
                id: r.id,
                title: r.title,
                summary: r.summary,
                status: format_status(&r.status),
                status_detail: extract_status_detail(&r.status),
                requested_by: r.requested_by,
                requester_name: find_requester_name(&r.id, &orbit.additional_info),
                created_at: r.created_at,
                expiration_dt: r.expiration_dt,
                approvals: transform_approvals(r.approvals),
                operation: extract_operation_type(&r.operation),
            }
        }).collect(),
        total: orbit.total,
        next_offset: orbit.next_offset,
    }
}
```

### Step 3: Update Simple Request Endpoint

**File:** `daopad_backend/src/api/orbit_requests.rs` (lines 726-773)

```rust
// PSEUDOCODE - Replace get_orbit_requests_simple
#[update]
pub async fn get_orbit_requests_simple() -> Result<Vec<SimpleRequest>, String> {
    let station_id = Principal::from_text("fec7w-zyaaa-aaaaa-qaffq-cai")?;

    let filters = OrbitListRequestsInput {
        statuses: None,
        paginate: Some(PaginationInput {
            offset: None,
            limit: Some(10),
        }),
        // ... other fields
    };

    // Use typed call
    let result: Result<(OrbitListRequestsResult,), _> =
        ic_cdk::call(station_id, "list_requests", (filters,)).await;

    match result {
        Ok((OrbitListRequestsResult::Ok(response),)) => {
            Ok(response.requests.into_iter().map(|r| SimpleRequest {
                id: r.id[..8].to_string(), // Keep first 8 chars for backward compat
                title: r.title,
                status: format_status(&r.status),
            }).collect())
        }
        // ... error handling
    }
}
```

### Step 4: Fix Type Definitions

**File:** `daopad_backend/src/types/orbit/orbit_types/requests.rs` (MODIFY)

```rust
// PSEUDOCODE - Ensure types have serde attributes for field name mapping
#[derive(CandidType, Deserialize)]
pub struct ListRequestsInput {
    #[serde(default)]
    pub requester_ids: Option<Vec<String>>,
    #[serde(default)]
    pub approver_ids: Option<Vec<String>>,
    #[serde(default)]
    pub statuses: Option<Vec<RequestStatusCode>>,
    // ... ensure all fields have proper defaults

    // Critical: sort_by must be unit type for Candid 0.10 compatibility
    #[serde(default)]
    pub sort_by: (),  // NOT Option<T> - causes OptionVisitor error
}
```

### Step 5: Update Other Files Using Manual Decoder

```bash
# Find all files importing from orbit_requests
rg "use.*orbit_requests::" daopad_backend/src/

# Update each to use new typed versions
```

## Testing Strategy

### Phase 1: Backend Testing
```bash
# 1. Build with new types
cargo build --target wasm32-unknown-unknown --release -p daopad_backend

# 2. Extract candid
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# 3. Deploy
./deploy.sh --network ic --backend-only

# 4. Test each baseline command
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_orbit_requests '(...)'
# Should return same results as baseline

# 5. Verify no "Unknown_" fields in response
```

### Phase 2: Sync Declarations
```bash
# CRITICAL: Sync declarations after backend changes
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# Deploy frontend
./deploy.sh --network ic --frontend-only
```

### Phase 3: Regression Testing
```bash
# Test all operations that use orbit_requests
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai get_orbit_requests_simple '()'
# Should return same 10 records

# Test create operations still work
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai create_transfer_request '(...)'
```

## Success Criteria

1. ✅ All baseline tests pass with same output
2. ✅ No magic numbers in code (delete lines 22-72)
3. ✅ Uses typed `ic_cdk::call` not `call_raw`
4. ✅ Compiles without warnings
5. ✅ Frontend still works after declaration sync
6. ✅ Can handle new Orbit fields without code changes

## Rollback Plan

If typed calls fail:
```bash
# Revert to manual decoder
git checkout HEAD -- daopad_backend/src/api/orbit_requests.rs
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
./deploy.sh --network ic --backend-only
```

## Risk Assessment

- **High Risk:** Breaking existing functionality
  - Mitigation: Comprehensive baseline tests
- **Medium Risk:** Type mismatches with Orbit
  - Mitigation: Generate types directly from Orbit candid
- **Low Risk:** Performance degradation
  - Mitigation: Typed calls are actually faster than manual parsing

## Estimated Time: 4-6 hours

1. Generate types: 30 min
2. Replace decoder: 2 hours
3. Fix compilation: 1 hour
4. Testing: 1-2 hours
5. PR creation: 30 min

---

**REMINDER TO IMPLEMENTER:**
- You MUST be in worktree: `/home/theseus/alexandria/daopad-fix-candid-decoder/src/daopad`
- You MUST create a PR after implementation
- You MUST run all baseline tests before committing
- You MUST sync declarations if backend changes