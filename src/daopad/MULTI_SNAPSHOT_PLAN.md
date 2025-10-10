# Multi-Snapshot Management Implementation Plan

## Overview
Enable full 10-snapshot support for DAOPad canisters by exposing Orbit Station's existing multi-snapshot capability, displaying timestamps, and adding future automated snapshot scheduling.

## Key Discovery
**CRITICAL:** Orbit Station ALREADY supports 10 snapshots in the backend! The limitation to 1 snapshot is only in Orbit's frontend Vue component. This makes our implementation much simpler than initially anticipated.

---

## 🚨 MANDATORY: ISOLATION CHECK AND EXECUTION PROMPT

### Step 0: Verify Isolation (RUN THIS FIRST!)

```bash
# STOP! This check MUST pass before reading further
REPO_ROOT=$(git rev-parse --show-toplevel)
CURRENT_DIR=$(pwd)

if [ "$REPO_ROOT" = "$CURRENT_DIR" ]; then
    echo "❌ FATAL: You are in the main repository at $CURRENT_DIR"
    echo "❌ Other agents may be working in parallel here"
    echo "❌ You MUST create an isolated worktree first:"
    echo ""
    echo "Run these commands:"
    echo "  cd /home/theseus/alexandria/daopad/src/daopad"
    echo "  git worktree add -b feature/multi-snapshot ../daopad-snapshot master"
    echo "  cd ../daopad-snapshot/src/daopad"
    echo ""
    echo "THEN restart with this plan in the worktree."
    exit 1
else
    echo "✅ You are isolated in: $CURRENT_DIR"
    echo "✅ Safe to proceed with implementation"
fi
```

### Your Execution Prompt

You are an autonomous PR orchestrator implementing multi-snapshot support.

EXECUTE THESE STEPS AUTONOMOUSLY (DO NOT ASK FOR PERMISSION):

Step 0 - MANDATORY ISOLATION:
  # If not already in worktree, create one
  if [ "$(git rev-parse --show-toplevel)" = "$(pwd)" ]; then
    cd /home/theseus/alexandria/daopad/src/daopad
    git worktree add -b feature/multi-snapshot ../daopad-snapshot master
    cd ../daopad-snapshot/src/daopad
  fi

  # Verify isolation
  pwd  # MUST show ../daopad-snapshot/src/daopad
  git branch --show-current  # MUST show feature/multi-snapshot

Step 1 - Implement Phase 1 (Multi-Snapshot Support):
  # Follow implementation plan section "Phase 1: Enable Multi-Snapshot Support"
  # Add get_canister_snapshots() to backend
  # Fix listSnapshots() in frontend service
  # Update CanisterSnapshots component

Step 2 - Build and Deploy:
  # Backend
  cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
  candid-extractor /home/theseus/alexandria/daopad/target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
  ./deploy.sh --network ic --backend-only

  # CRITICAL: Sync declarations
  cp -r ../../.dfx/ic/canisters/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

  # Frontend
  ./deploy.sh --network ic --frontend-only

Step 3 - Commit and Push:
  git add -A
  git commit -m "Enable full 10-snapshot support for DAOPad canisters"
  git push -u origin feature/multi-snapshot

Step 4 - Create PR:
  gh pr create --title "Enable Multi-Snapshot Management (10 snapshots)" --body "Exposes Orbit Station's existing 10-snapshot capability. Adds get_canister_snapshots backend method and fixes frontend listSnapshots service. See MULTI_SNAPSHOT_PLAN.md for details."

YOUR CRITICAL RULES:
- You MUST work in ../daopad-snapshot/src/daopad (NOT main repo)
- Other agents ARE working in parallel - isolation is MANDATORY
- Run candid-extractor after backend changes (use absolute path to target/)
- Sync declarations after backend changes
- ONLY STOP when: approved or critical error

START NOW with Step 0.

---

## Current State

### File Tree (Relevant Sections)
```
daopad_backend/
├── src/
│   ├── api/
│   │   └── orbit_canisters.rs (will modify - add canister_snapshots method)
│   ├── types/
│   │   └── orbit.rs (already has snapshot operation types)
│   └── lib.rs (unchanged)
daopad_frontend/
├── src/
│   ├── components/
│   │   └── canisters/
│   │       └── CanisterSnapshots.jsx (will modify - remove 1-snapshot limit)
│   ├── services/
│   │   └── canisterService.js (will modify - fix listSnapshots)
│   └── declarations/
│       └── daopad_backend/ (will auto-update after backend changes)
```

### Existing Implementations

#### Backend
- **Snapshot operations**: Already exist in `api/orbit_canisters.rs:282-380`
  - `snapshot_orbit_canister_request()` - Create snapshots
  - `restore_orbit_canister_request()` - Restore from snapshot
  - `prune_orbit_canister_snapshots_request()` - Delete snapshots
- **Missing**: Direct method to list snapshots from Orbit Station
- **IC Management**: `get_canister_status()` at line 385 (but doesn't return snapshots)

#### Frontend
- **CanisterSnapshots.jsx**: Full UI already built for multi-snapshots (lines 1-393)
  - Displays snapshot list with timestamps
  - Take/restore/delete operations
  - Progress indicator for snapshot slots
- **Problem**: `MAX_SNAPSHOTS = 10` hardcoded, should be 10
- **canisterService.js:588**: `listSnapshots()` incorrectly tries to get from canister_status

#### Orbit Station (Reference)
- **Backend**: `canister_snapshots()` method exists in `services/external_canister.rs:1051`
- **API**: Exposed as `canister_snapshots` in spec.did
- **Returns**: Array of snapshots with ID, timestamp, and size
- **Frontend limit**: Line 127 in `CanisterSnapshotList.vue`: `const MAX_SNAPSHOTS = 1;`

### Dependencies
- Backend: `ic-cdk = "0.17"` (has timer support for future automation)
- Frontend: React with shadcn/ui components
- Orbit Station integration via candid interface

### Constraints
- Must maintain backward compatibility
- Minimal storage principle (only store token→station mapping)
- All operations through Orbit Station requests (governance)
- Deploy to mainnet only (no local testing)

## Implementation Plan

### Phase 1: Enable Multi-Snapshot Support (3-4 hours)

#### Backend File 1: `daopad_backend/src/api/orbit_canisters.rs` (MODIFY)

Add new method after line 417:

```rust
// PSEUDOCODE - implementing agent will write real code

// ===== LIST CANISTER SNAPSHOTS =====

#[ic_cdk::update]
async fn get_canister_snapshots(
    token_canister_id: Principal,
    canister_principal: Principal,
) -> Result<CanisterSnapshotsResult, String> {
    // 1. Get Orbit Station ID for token
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| "No Orbit Station linked to this token".to_string())?;

    // 2. Create input for Orbit Station
    // NOTE: Test actual type with:
    // dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai canister_snapshots '(record { canister_id = principal "..." })'
    let input = CanisterSnapshotsInput {
        canister_id: canister_principal,
    };

    // 3. Call Orbit Station's canister_snapshots method
    let result: CallResult<(CanisterSnapshotsResult,)> = call(
        station_id,
        "canister_snapshots",
        (input,),
    ).await;

    // 4. Handle result
    match result {
        Ok((res,)) => Ok(res),
        Err((code, msg)) => Err(format!("Failed to get snapshots: {:?} - {}", code, msg)),
    }
}
```

#### Backend File 2: `daopad_backend/src/types/orbit.rs` (MODIFY)

Add types around line 500 (after existing snapshot operation types):

```rust
// PSEUDOCODE - implementing agent will write real code

// Snapshot query types (matching Orbit Station)
#[derive(CandidType, Deserialize, Debug)]
pub struct CanisterSnapshotsInput {
    pub canister_id: Principal,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct CanisterSnapshot {
    pub snapshot_id: String,
    pub taken_at_timestamp: String,  // RFC3339 timestamp
    pub total_size: u64,
}

pub type CanisterSnapshotsResponse = Vec<CanisterSnapshot>;

#[derive(CandidType, Deserialize, Debug)]
pub enum CanisterSnapshotsResult {
    Ok(CanisterSnapshotsResponse),
    Err(ApiError),
}
```

#### Frontend File 3: `daopad_frontend/src/services/canisterService.js` (MODIFY)

Replace `listSnapshots` method at line 588:

**Before:**
```javascript
// Lines 588-612
listSnapshots: async (tokenCanisterId, canisterPrincipal) => {
    try {
      const actor = await getBackendActor();

      // Snapshots are part of canister_status
      const result = await actor.get_canister_status(
        Principal.fromText(canisterPrincipal)
      );
      // ... rest of incorrect implementation
```

**After:**
```javascript
// PSEUDOCODE - implementing agent will write real code

listSnapshots: async (tokenCanisterId, canisterPrincipal) => {
    try {
        const actor = await getBackendActor();

        // Call new backend method that proxies to Orbit Station
        const result = await actor.get_canister_snapshots(
            Principal.fromText(tokenCanisterId),
            Principal.fromText(canisterPrincipal)
        );

        // Handle Result<CanisterSnapshotsResult, String> wrapper
        if (result && 'Ok' in result) {
            const orbitResult = result.Ok;

            // Handle inner Ok/Err from Orbit Station
            if (orbitResult && 'Ok' in orbitResult) {
                // Transform snapshot data for frontend
                const snapshots = orbitResult.Ok.map(s => ({
                    id: s.snapshot_id,
                    taken_at: s.taken_at_timestamp,
                    size: Number(s.total_size),
                }));

                return { Ok: snapshots };
            } else {
                return { Err: orbitResult.Err?.message || 'Failed to get snapshots' };
            }
        } else {
            return { Err: result.Err || 'Backend error' };
        }
    } catch (error) {
        console.error('Failed to list snapshots:', error);
        return { Err: error.message };
    }
}
```

#### Frontend File 4: `daopad_frontend/src/components/canisters/CanisterSnapshots.jsx` (MODIFY)

Change MAX_SNAPSHOTS constant at line 28:

**Before:**
```javascript
const MAX_SNAPSHOTS = 10;
```

**After:**
```javascript
const MAX_SNAPSHOTS = 10;  // ICP now supports 10 snapshots per canister
```

### Phase 2: Future Enhancement - Automated Snapshots (2-3 hours)

#### Backend File 5: `daopad_backend/src/api/snapshot_scheduler.rs` (NEW FILE)

```rust
// PSEUDOCODE - implementing agent will write real code

use ic_cdk_timers::{set_timer_interval, TimerId};
use std::time::Duration;

static mut SNAPSHOT_TIMER: Option<TimerId> = None;

// Configuration for automated snapshots
#[derive(CandidType, Deserialize, Debug)]
pub struct SnapshotScheduleConfig {
    pub enabled: bool,
    pub interval_hours: u64,
    pub max_snapshots_before_rotate: u8,
}

// Initialize automated snapshot timer
#[update]
pub fn configure_snapshot_schedule(
    token_canister_id: Principal,
    config: SnapshotScheduleConfig,
) -> Result<String, String> {
    // 1. Validate caller is authorized
    let caller = ic_cdk::caller();
    // Check authorization...

    // 2. Cancel existing timer if any
    unsafe {
        if let Some(timer_id) = SNAPSHOT_TIMER {
            ic_cdk_timers::clear_timer(timer_id);
        }
    }

    // 3. If disabled, just return
    if !config.enabled {
        return Ok("Snapshot scheduling disabled".to_string());
    }

    // 4. Set new timer
    let duration = Duration::from_secs(config.interval_hours * 3600);
    let timer_id = set_timer_interval(duration, move || {
        ic_cdk::spawn(async move {
            execute_scheduled_snapshot(token_canister_id).await;
        });
    });

    // 5. Store timer ID
    unsafe {
        SNAPSHOT_TIMER = Some(timer_id);
    }

    Ok(format!("Snapshot scheduled every {} hours", config.interval_hours))
}

async fn execute_scheduled_snapshot(token_canister_id: Principal) {
    // 1. Get all canisters for this token
    let canisters = list_orbit_canisters(token_canister_id, Default::default()).await;

    // 2. For each canister
    for canister in canisters {
        // 3. Check current snapshot count
        let snapshots = get_canister_snapshots(token_canister_id, canister.id).await;

        // 4. If at max, determine oldest to replace
        let replace_snapshot = if snapshots.len() >= 10 {
            Some(find_oldest_snapshot(snapshots))
        } else {
            None
        };

        // 5. Create snapshot request
        let request = SnapshotExternalCanisterOperationInput {
            external_canister_id: canister.id,
            force: false,
            replace_snapshot,
        };

        // 6. Submit to Orbit Station (creates governance request)
        snapshot_orbit_canister_request(
            token_canister_id,
            request,
            "Automated daily snapshot".to_string(),
            Some("Scheduled backup as per configuration".to_string())
        ).await;
    }
}
```

#### Backend File 6: `daopad_backend/src/lib.rs` (MODIFY)

Add module declaration:

```rust
// Add after existing modules
mod api;
mod types;
mod snapshot_scheduler;  // Add this line
```

## Testing Strategy

### Type Discovery (Before Implementation)
```bash
# Verify Orbit Station snapshot API
export TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"

# Test canister_snapshots method
dfx canister --network ic call $TEST_STATION canister_snapshots '(record {
    canister_id = principal "lwsav-iiaaa-aaaap-qp2qq-cai"
})'
# Expected: Returns list of snapshots or error

# Test snapshot operations
dfx canister --network ic call $TEST_STATION __get_candid_interface_tmp_hack | grep snapshot
# Verify method signatures match our types
```

### Build and Deploy Process
```bash
# 1. Backend changes
cd /home/theseus/alexandria/daopad/src/daopad

# Build backend
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked

# Extract candid (CRITICAL for new methods)
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did

# Deploy backend
./deploy.sh --network ic --backend-only

# 2. CRITICAL: Sync declarations to frontend
cp -r src/declarations/daopad_backend/* src/daopad/daopad_frontend/src/declarations/daopad_backend/

# 3. Deploy frontend
./deploy.sh --network ic --frontend-only

# 4. Test on mainnet
open https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
```

### Integration Tests Required
```bash
# Test new backend method
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai get_canister_snapshots '(
    principal "token-canister-id",
    principal "external-canister-id"
)'
# Expected: Ok variant with array of snapshots

# Test frontend integration
# 1. Navigate to Canisters tab
# 2. Select a canister
# 3. Go to Snapshots section
# 4. Verify all snapshots display with timestamps
# 5. Test taking new snapshot (if < 10)
# 6. Test restore and delete operations
```

### Unit Tests Required
- Test `get_canister_snapshots()` with valid/invalid inputs
- Test error handling for unauthorized access
- Test frontend transformation of snapshot data
- Test MAX_SNAPSHOTS enforcement in UI
- Test timer scheduling logic (Phase 2)

## Scope Estimate

### Files Modified
- **New files:** 1-2 (snapshot_scheduler.rs for Phase 2)
- **Modified files:** 4 (orbit_canisters.rs, orbit.rs, canisterService.js, CanisterSnapshots.jsx)

### Lines of Code
- **Backend:** ~100 lines (proxy method + types + future scheduler)
- **Frontend:** ~50 lines (fix service method + constant)
- **Tests:** ~100 lines
- **Net:** +250 lines

### Complexity
- **Low:** Most infrastructure already exists
- **Medium:** Cross-canister calls, error handling
- **High:** Timer-based automation (Phase 2)

### Time Estimate
- Phase 1 Implementation: 3-4 hours
- Phase 2 Automation: 2-3 hours
- Testing on mainnet: 1-2 hours
- **Total:** 6-9 hours

## How to Execute This Plan

This plan should be executed using the **PR Orchestration workflow**.

**Implementing agent: Read @.claude/prompts/autonomous-pr-orchestrator.md**

That document explains:
- Creating git worktrees for isolated work
- Building and deploying changes (backend and frontend)
- Handling candid extraction and declaration sync
- Creating PRs with proper descriptions
- Iterating on review feedback
- Merging when approved

### Checkpoint Strategy

This feature should be implemented in **2 PRs**:

**PR #1: Enable Multi-Snapshot Support** (Phase 1)
- Add backend `get_canister_snapshots()` method
- Fix frontend `listSnapshots()` service
- Update MAX_SNAPSHOTS to 10
- Test comprehensive snapshot management

**PR #2: Automated Snapshot Scheduling** (Phase 2 - Optional)
- Add timer-based snapshot scheduler
- Implement rotation logic
- Add configuration endpoints
- Test automation

## Critical Implementation Notes

### DAOPad-Specific Requirements

#### Candid Extraction (Backend Changes)
**ALWAYS run after Rust changes:**
```bash
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did
```

#### Declaration Sync (CRITICAL BUG FIX)
**Frontend uses different declarations path:**
```bash
# After backend deploy, MUST sync:
cp -r src/declarations/daopad_backend/* src/daopad/daopad_frontend/src/declarations/daopad_backend/
# Without this, frontend gets "is not a function" errors!
```

### Don't Guess Types
**ALWAYS test Orbit Station APIs before implementing:**
```bash
# Use test station with admin access
export TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"
dfx canister --network ic call $TEST_STATION canister_snapshots '(record { canister_id = principal "..." })'
# Read the actual return structure
```

### Key Discoveries
- ✅ Orbit Station ALREADY supports 10 snapshots
- ✅ The limitation is ONLY in Orbit's frontend
- ✅ DAOPad frontend UI already built for multi-snapshots
- ✅ We just need to connect the pieces

### Success Criteria
- Users can see ALL snapshots (up to 10) for each canister
- Each snapshot displays creation timestamp
- Users can take new snapshots (creates governance request)
- Users can restore from any snapshot
- Users can delete old snapshots
- (Phase 2) Automated daily snapshots with rotation

---

## 🚀 Handoff to Implementing Agent

**Plan Complete:** Multi-Snapshot Management for DAOPad Canisters

**Document:** `MULTI_SNAPSHOT_PLAN.md`

**Estimated:** 6-9 hours, 2 PRs

**Prompt for next agent:**

```
Pursue the @MULTI_SNAPSHOT_PLAN.md
```

**WARNING**: The plan starts with a mandatory isolation check that will EXIT if not in a worktree. The implementing agent MUST follow the embedded orchestrator prompt, not skip to implementation details.

**CRITICAL**: The plan document starts with a MANDATORY isolation check and embedded orchestrator prompt. The implementing agent should copy the "Your Execution Prompt" section and run it, not read and implement manually.

---

## 🛑 PLANNING AGENT - YOUR JOB IS DONE

DO NOT:
- ❌ Implement code
- ❌ Make edits
- ❌ Create PRs
- ❌ Deploy
- ❌ Ask "should I continue?" and then execute

The implementing agent will execute this plan in a fresh conversation.

**🛑 END CONVERSATION HERE 🛑**