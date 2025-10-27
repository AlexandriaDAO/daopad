# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-fix-activity-operation-names/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-fix-activity-operation-names/src/daopad`
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
   git commit -m "Fix Activity tab operation names - add missing Candid hash mappings"
   git push -u origin feature/fix-activity-operation-names
   gh pr create --title "Fix: Display all Orbit request types properly in Activity tab" --body "Implements FIX_ACTIVITY_OPERATION_NAMES.md"
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

**Branch:** `feature/fix-activity-operation-names`
**Worktree:** `/home/theseus/alexandria/daopad-fix-activity-operation-names/src/daopad`

---

# Implementation Plan: Fix Activity Tab Operation Names

## Problem Summary

The Activity tab **already shows all Orbit Station request types**, but many display as "Unknown_XXXXXX" because the backend's Candid hash-to-name mapping is incomplete.

**Observed issues from live data:**
- `Unknown_3021957963` should be **Transfer**
- `Unknown_2809532821` should be **EditUser**
- `Unknown_2261062350` should be **CreateExternalCanister** or **AddUser**
- `Unknown_526130198` should be **SnapshotExternalCanister**
- `Unknown_1463549164` should be **AddUser**

## Root Cause

In `daopad_backend/src/api/orbit_requests.rs:17-44`, the `label_name()` function maps Candid field hashes to human-readable operation names. It's missing mappings for:
1. **Transfer operations** (most common - appears in treasury transfers)
2. **User management operations** (AddUser, EditUser)
3. **External canister operations** (CreateExternalCanister, SnapshotExternalCanister)

## Current State

### Backend: `daopad_backend/src/api/orbit_requests.rs`

**Lines 17-44** - Incomplete hash mapping:
```rust
fn label_name(label: &Label) -> Option<String> {
    match label {
        Label::Named(name) => Some(name.clone()),
        Label::Id(id) => {
            Some(match *id {
                // Status values
                3736853960 => "Created".to_string(),
                4044063083 => "Completed".to_string(),
                1821510295 => "Approved".to_string(),
                2442362239 => "Rejected".to_string(),
                3456837432 => "Cancelled".to_string(),
                479410653 => "Failed".to_string(),
                1598796536 => "Scheduled".to_string(),
                1131829668 => "Processing".to_string(),
                // Operation types (INCOMPLETE)
                280265689 => "EditPermission".to_string(),
                3079972771 => "EditAccount".to_string(),
                _ => {
                    ic_cdk::println!("Unknown hash: {} (0x{:x})", id, id);
                    format!("Unknown_{}", id)  // ❌ Fallback creates ugly labels
                }
            })
        },
        Label::Unnamed(idx) => Some(idx.to_string()),
    }
}
```

**Lines 252-316** - Parse logic works correctly, just needs proper hash mappings:
```rust
fn parse_requests(
    value: &IDLValue,
    info_map: &HashMap<String, String>,
) -> Vec<OrbitRequestSummary> {
    // ... correctly extracts operation from variant
    let operation = field(fields, "operation")
        .and_then(|v| {
            if let IDLValue::Variant(variant) = v {
                label_name(&variant.0.id)  // ✅ Uses label_name - just needs more hashes
            } else {
                None
            }
        });
    // ...
}
```

### How to Find Missing Hashes

Use this Rust program to compute Candid hashes:
```rust
fn candid_hash(name: &str) -> u32 {
    let mut hash: u32 = 0;
    for byte in name.bytes() {
        hash = hash.wrapping_mul(223).wrapping_add(byte as u32);
    }
    hash
}

// Test:
println!("Transfer: {}", candid_hash("Transfer"));  // 3021957963
println!("AddUser: {}", candid_hash("AddUser"));    // 1463549164
println!("EditUser: {}", candid_hash("EditUser"));  // 2809532821
// etc.
```

## Implementation

### Step 1: Compute All Missing Hashes

Create a temporary Rust program in the worktree to compute hashes for ALL Orbit operation types from `orbit-reference/core/station/impl/src/models/request_operation_type.rs:12-47`:

```rust
// PSEUDOCODE - compute_hashes.rs
fn candid_hash(name: &str) -> u32 {
    let mut hash: u32 = 0;
    for byte in name.bytes() {
        hash = hash.wrapping_mul(223).wrapping_add(byte as u32);
    }
    hash
}

fn main() {
    // From RequestOperationType enum
    let operations = vec![
        "Transfer", "AddAccount", "EditAccount", "AddUser", "EditUser",
        "AddUserGroup", "EditUserGroup", "RemoveUserGroup", "SystemUpgrade",
        "EditPermission", "AddRequestPolicy", "EditRequestPolicy", "RemoveRequestPolicy",
        "AddAddressBookEntry", "EditAddressBookEntry", "RemoveAddressBookEntry",
        "ManageSystemInfo", "ChangeExternalCanister", "CreateExternalCanister",
        "CallExternalCanister", "SetDisasterRecovery", "ConfigureExternalCanister",
        "FundExternalCanister", "SnapshotExternalCanister", "RestoreExternalCanister",
        "PruneExternalCanister", "AddAsset", "EditAsset", "RemoveAsset",
        "MonitorExternalCanister", "AddNamedRule", "EditNamedRule", "RemoveNamedRule",
        "SystemRestore"
    ];

    for op in operations {
        println!("{} => \"{}\" (hash: {})", candid_hash(op), op, candid_hash(op));
    }
}
```

Run it:
```bash
rustc compute_hashes.rs && ./compute_hashes > hashes.txt
cat hashes.txt
```

### Step 2: Update Backend Hash Mapping

**File:** `daopad_backend/src/api/orbit_requests.rs`

**Modify lines 17-44** - Add ALL missing operation type hashes:

```rust
fn label_name(label: &Label) -> Option<String> {
    match label {
        Label::Named(name) => Some(name.clone()),
        Label::Id(id) => {
            Some(match *id {
                // Status values (keep existing)
                3736853960 => "Created".to_string(),
                4044063083 => "Completed".to_string(),
                1821510295 => "Approved".to_string(),
                2442362239 => "Rejected".to_string(),
                3456837432 => "Cancelled".to_string(),
                479410653 => "Failed".to_string(),
                1598796536 => "Scheduled".to_string(),
                1131829668 => "Processing".to_string(),

                // Operation types - COMPLETE LIST from compute_hashes.rs output
                3021957963 => "Transfer".to_string(),
                // ... ADD ALL 36 OPERATIONS HERE using output from Step 1
                280265689 => "EditPermission".to_string(),  // existing
                3079972771 => "EditAccount".to_string(),     // existing

                _ => {
                    // Keep logging for truly unknown hashes
                    ic_cdk::println!("Unknown hash: {} (0x{:x})", id, id);
                    format!("Unknown_{}", id)
                }
            })
        },
        Label::Unnamed(idx) => Some(idx.to_string()),
    }
}
```

**Critical:** Add entries for EVERY operation type from the Orbit enum, not just the ones we've seen in test data. This future-proofs against new request types.

### Step 3: Build and Test Backend

```bash
# Build
cargo build --target wasm32-unknown-unknown --release -p daopad_backend

# Verify no compilation errors
echo "✅ Backend builds successfully"

# Extract Candid (no changes expected, but required for deploy)
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Deploy backend only
./deploy.sh --network ic --backend-only

# Sync declarations
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
```

### Step 4: Test Live Data

```bash
# Query test station with backend proxy
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_orbit_requests \
  '(principal "ysy5f-2qaaa-aaaap-qkmmq-cai", record {
    statuses = null;
    operation_types = null;
    paginate = opt record { limit = opt 5; offset = null };
    ...
  })' | grep "operation ="

# Expected: No more "Unknown_XXXXXX" - all should show proper names like:
# operation = opt "Transfer"
# operation = opt "EditUser"
# operation = opt "CreateExternalCanister"
# etc.
```

### Step 5: Verify in Frontend

No frontend code changes needed - it already displays the `operation` field from backend.

**Manual verification:**
1. Navigate to https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
2. Click "Activity" tab
3. Verify all request cards show proper operation badges:
   - ✅ "Transfer" instead of "Unknown_3021957963"
   - ✅ "EditUser" instead of "Unknown_2809532821"
   - ✅ "CreateExternalCanister" instead of "Unknown_2261062350"
   - ✅ "AddUser" instead of "Unknown_1463549164"
   - ✅ "SnapshotExternalCanister" instead of "Unknown_526130198"

## Testing Checklist

### Backend Tests
- [ ] Compute all Candid hashes for 36+ operation types
- [ ] Add all hash mappings to `label_name()` function
- [ ] Backend compiles without errors
- [ ] Backend deploys successfully to mainnet
- [ ] `list_orbit_requests` returns proper operation names (no "Unknown_")

### Frontend Tests
- [ ] No code changes needed (verify this assumption)
- [ ] Activity tab loads without errors
- [ ] All request types display human-readable operation names
- [ ] RequestCard badges show proper operation types
- [ ] RequestDomainSelector filters work for all operations

### Integration Tests
- [ ] Filter by "Transfers" domain shows Transfer operations
- [ ] Filter by "Users" domain shows AddUser/EditUser operations
- [ ] Filter by "Canisters" domain shows canister operations
- [ ] Filter by "Assets" domain shows asset operations
- [ ] "All" filter shows all request types properly labeled

## Success Criteria

1. **Zero "Unknown_XXXXXX" labels** in Activity tab
2. **All 36+ Orbit operation types** properly mapped
3. **No frontend changes required** (backend-only fix)
4. **Backward compatible** - existing operation names still work
5. **Future-proof** - handles all Orbit operations, not just observed ones

## File Changes

- `daopad_backend/src/api/orbit_requests.rs` - Update `label_name()` hash mappings (lines 17-44)
- `compute_hashes.rs` (temporary) - Compute Candid hashes
- `hashes.txt` (temporary) - Reference for hash values

## Deployment

Backend-only deployment:
```bash
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
./deploy.sh --network ic --backend-only
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
```

No frontend deployment needed unless declarations change.

## Notes

- The Activity tab infrastructure is complete and correct
- All request types are already being fetched from Orbit Station
- The ONLY issue is cosmetic - hash-to-name mapping
- This is a data display bug, not an architectural issue
- Fix is localized to one function in backend
