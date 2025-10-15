# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-snapshot-governance/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-snapshot-governance/src/daopad`
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
   git commit -m "feat: Snapshot governance integration"
   git push -u origin feature/snapshot-governance
   gh pr create --title "feat: Snapshot Governance Integration" --body "Implements SNAPSHOT_GOVERNANCE_PLAN.md - Adds community voting for canister snapshot operations"
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

**Branch:** `feature/snapshot-governance`
**Worktree:** `/home/theseus/alexandria/daopad-snapshot-governance/src/daopad`

---

# Snapshot Governance Integration Plan

## Problem Statement

Frontend snapshot operations are failing with "Failed to decode canister response" errors. Root cause analysis reveals:

1. **Backend methods are intentionally disabled** (`orbit_canisters.rs:178-221`)
   - `snapshot_orbit_canister_request` returns error
   - `restore_orbit_canister_request` returns error
   - `prune_orbit_canister_snapshots_request` returns error
   - All disabled to enforce governance requirement

2. **Only read operations work**:
   - ✅ `get_canister_snapshots` (line 269) - works perfectly
   - ❌ All write operations - return governance violation errors

3. **Architecture mismatch**:
   - Universal Governance Requirement: ALL Orbit operations must go through DAOPad proposals
   - Snapshot operations exist but aren't governance-integrated
   - Violates CLAUDE.md principle: "Every backend function that modifies Orbit Station state MUST create a DAOPad proposal"

## Current State Documentation

### Backend Files

**`daopad_backend/src/api/orbit_canisters.rs`** (Lines 175-221):
```rust
// CURRENT STATE: Disabled methods that return errors

#[ic_cdk::update]
async fn snapshot_orbit_canister_request(...) -> Result<SubmitRequestResult, String> {
    Err("Direct canister snapshots are disabled. Canister operations must go through the proposal system...")
}

#[ic_cdk::update]
async fn restore_orbit_canister_request(...) -> Result<SubmitRequestResult, String> {
    Err("Direct canister restore is disabled...")
}

#[ic_cdk::update]
async fn prune_orbit_canister_snapshots_request(...) -> Result<SubmitRequestResult, String> {
    Err("Direct snapshot pruning is disabled...")
}
```

**`daopad_backend/src/api/orbit_users.rs`** (Lines 52-134):
```rust
// REFERENCE PATTERN: Admin removal with governance

#[update]
pub async fn create_remove_admin_request(...) -> Result<String, String> {
    // 1. Guard: Authentication
    // 2. Get station ID
    // 3. Build EditUser operation
    // 4. Create Orbit request
    // 5. Auto-create proposal via ensure_proposal_for_request()
    // 6. Return request_id or governance violation error
}
```

**`daopad_backend/src/proposals/orbit_requests.rs`** (Lines 241-284):
```rust
// GOVERNANCE HELPER: Auto-creates proposals for Orbit requests

#[update]
pub async fn ensure_proposal_for_request(
    token_id: Principal,
    orbit_request_id: String,
    request_type: OrbitRequestType,
) -> Result<ProposalId, ProposalError> {
    // Atomic check-and-insert to prevent duplicates
    // Creates OrbitRequestProposal with voting thresholds
}
```

**`daopad_backend/src/proposals/types.rs`** (Lines 99-101, 153-155):
```rust
// EXISTING TYPES: Already defined for snapshots

pub enum OrbitRequestType {
    SnapshotExternalCanister,    // 60% threshold
    RestoreExternalCanister,     // 60% threshold
    PruneExternalCanister,       // 60% threshold
}

impl OrbitRequestType {
    pub fn voting_threshold(&self) -> u8 {
        Self::SnapshotExternalCanister | Self::RestoreExternalCanister
        | Self::PruneExternalCanister => 60,
    }
}
```

### Frontend Files

**`daopad_frontend/src/services/canisterService.js`** (Lines 392-427, 671-698):
```javascript
// CURRENT STATE: Calls disabled backend methods

takeSnapshot: async (tokenCanisterId, externalCanisterId, force = false) => {
  const result = await actor.snapshot_orbit_canister_request(...);
  // Returns error from disabled backend method
}

restoreSnapshot: async (...) => {
  const result = await actor.restore_orbit_canister_request(...);
  // Returns error from disabled backend method
}

deleteSnapshot: async (...) => {
  const result = await actor.prune_orbit_canister_snapshots_request(...);
  // Returns error from disabled backend method
}

// READ-ONLY: Works perfectly
listSnapshots: async (tokenCanisterId, canisterPrincipal) => {
  const result = await actor.get_canister_snapshots(...);
  return { Ok: snapshots }; // ✅ Success
}
```

**`daopad_frontend/src/components/canisters/CanisterSnapshots.jsx`** (Lines 64-97):
```javascript
// CURRENT UI: Expects immediate execution

const handleTakeSnapshot = async () => {
  const result = await canisterService.takeSnapshot(...);
  if (result.Ok) {
    setSuccess('Snapshot request created successfully');
  }
}
```

### Orbit Station Types

From testing with `fec7w-zyaaa-aaaaa-qaffq-cai`:

```rust
// Orbit's CreateRequest input structure
pub struct CreateRequestInput {
    operation: RequestOperationInput,
    title: Option<String>,
    summary: Option<String>,
    execution_plan: Option<RequestExecutionSchedule>,
    expiration_dt: Option<u64>,
}

// Snapshot operations
pub enum RequestOperationInput {
    SnapshotExternalCanister(SnapshotExternalCanisterOperationInput),
    RestoreExternalCanister(RestoreExternalCanisterOperationInput),
    PruneExternalCanister(PruneExternalCanisterOperationInput),
}

pub struct SnapshotExternalCanisterOperationInput {
    external_canister_id: String, // UUID, not Principal
    force: bool,
}

pub struct RestoreExternalCanisterOperationInput {
    external_canister_id: String,
    snapshot_id: String,
}

pub struct PruneExternalCanisterOperationInput {
    external_canister_id: String,
    snapshot_ids: Vec<String>,
}
```

## Implementation Plan

### Phase 1: Backend Governance Integration

#### File: `daopad_backend/src/api/orbit_canisters.rs`

**REPLACE lines 175-189** (snapshot_orbit_canister_request):
```rust
// PSEUDOCODE

/// Create a canister snapshot proposal
///
/// This creates:
/// 1. An Orbit request (in pending state)
/// 2. A DAOPad proposal for community voting (60% threshold)
#[ic_cdk::update]
async fn create_snapshot_proposal(
    token_canister_id: Principal,
    external_canister_id: String,  // UUID from Orbit
    force: bool,
) -> Result<String, String> {
    let caller = ic_cdk::caller();

    // 1. Guard: Authentication
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    // 2. Get station ID from token mapping
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| "No Orbit Station linked to this token".to_string())?;

    // 3. Build SnapshotExternalCanister operation
    let snapshot_input = SnapshotExternalCanisterOperationInput {
        external_canister_id: external_canister_id.clone(),
        force,
    };

    let request_input = CreateRequestInput {
        operation: RequestOperationInput::SnapshotExternalCanister(snapshot_input),
        title: Some("Take Canister Snapshot".to_string()),
        summary: Some(format!(
            "Community proposal to create a snapshot of canister {}. \
             Snapshots capture complete canister state including memory and stable storage. \
             This action requires 60% voting power approval.",
            external_canister_id
        )),
        execution_plan: Some(RequestExecutionSchedule::Immediate),
        expiration_dt: None, // Use Orbit's default (30 days)
    };

    // 4. Create request in Orbit (backend is admin, so can create)
    let result: (CreateRequestResult,) = ic_cdk::call(
        station_id,
        "create_request",
        (request_input,)
    )
    .await
    .map_err(|e| format!("Failed to create Orbit request: {:?}", e))?;

    // 5. Handle result and auto-create proposal for governance
    match result.0 {
        CreateRequestResult::Ok(response) => {
            let request_id = response.request.id;

            // CRITICAL: Auto-create DAOPad proposal for community voting
            use crate::proposals::{ensure_proposal_for_request, OrbitRequestType};

            match ensure_proposal_for_request(
                token_canister_id,
                request_id.clone(),
                OrbitRequestType::SnapshotExternalCanister,
            ).await {
                Ok(proposal_id) => {
                    ic_cdk::println!(
                        "Snapshot governance: Orbit request {} → DAOPad proposal {:?}",
                        request_id, proposal_id
                    );
                    Ok(request_id)
                },
                Err(e) => {
                    Err(format!(
                        "GOVERNANCE VIOLATION: Orbit request {} created but proposal failed: {:?}. \
                         Request exists in Orbit Station but cannot be voted on.",
                        request_id, e
                    ))
                }
            }
        },
        CreateRequestResult::Err(e) => Err(format!("Orbit error: {}", e.code)),
    }
}
```

**REPLACE lines 193-205** (restore_orbit_canister_request):
```rust
// PSEUDOCODE

/// Create a canister restore proposal
#[ic_cdk::update]
async fn create_restore_snapshot_proposal(
    token_canister_id: Principal,
    external_canister_id: String,
    snapshot_id: String,
) -> Result<String, String> {
    let caller = ic_cdk::caller();

    // 1. Guard: Authentication
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    // 2. Get station ID
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| "No Orbit Station linked to this token".to_string())?;

    // 3. Build RestoreExternalCanister operation
    let restore_input = RestoreExternalCanisterOperationInput {
        external_canister_id: external_canister_id.clone(),
        snapshot_id: snapshot_id.clone(),
    };

    let request_input = CreateRequestInput {
        operation: RequestOperationInput::RestoreExternalCanister(restore_input),
        title: Some("Restore Canister from Snapshot".to_string()),
        summary: Some(format!(
            "Community proposal to restore canister {} from snapshot {}. \
             WARNING: This will overwrite the current canister state. \
             This action requires 60% voting power approval.",
            external_canister_id, snapshot_id
        )),
        execution_plan: Some(RequestExecutionSchedule::Immediate),
        expiration_dt: None,
    };

    // 4. Create request in Orbit
    let result: (CreateRequestResult,) = ic_cdk::call(
        station_id,
        "create_request",
        (request_input,)
    )
    .await
    .map_err(|e| format!("Failed to create Orbit request: {:?}", e))?;

    // 5. Auto-create proposal
    match result.0 {
        CreateRequestResult::Ok(response) => {
            let request_id = response.request.id;

            use crate::proposals::{ensure_proposal_for_request, OrbitRequestType};

            match ensure_proposal_for_request(
                token_canister_id,
                request_id.clone(),
                OrbitRequestType::RestoreExternalCanister,
            ).await {
                Ok(proposal_id) => {
                    ic_cdk::println!(
                        "Restore governance: Orbit request {} → DAOPad proposal {:?}",
                        request_id, proposal_id
                    );
                    Ok(request_id)
                },
                Err(e) => {
                    Err(format!(
                        "GOVERNANCE VIOLATION: Orbit request {} created but proposal failed: {:?}",
                        request_id, e
                    ))
                }
            }
        },
        CreateRequestResult::Err(e) => Err(format!("Orbit error: {}", e.code)),
    }
}
```

**REPLACE lines 209-221** (prune_orbit_canister_snapshots_request):
```rust
// PSEUDOCODE

/// Create a snapshot deletion proposal
#[ic_cdk::update]
async fn create_delete_snapshot_proposal(
    token_canister_id: Principal,
    external_canister_id: String,
    snapshot_id: String,
) -> Result<String, String> {
    let caller = ic_cdk::caller();

    // 1. Guard: Authentication
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    // 2. Get station ID
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| "No Orbit Station linked to this token".to_string())?;

    // 3. Build PruneExternalCanister operation
    let prune_input = PruneExternalCanisterOperationInput {
        external_canister_id: external_canister_id.clone(),
        snapshot_ids: vec![snapshot_id.clone()],
    };

    let request_input = CreateRequestInput {
        operation: RequestOperationInput::PruneExternalCanister(prune_input),
        title: Some("Delete Canister Snapshot".to_string()),
        summary: Some(format!(
            "Community proposal to delete snapshot {} from canister {}. \
             WARNING: Deleted snapshots cannot be recovered. \
             This action requires 60% voting power approval.",
            snapshot_id, external_canister_id
        )),
        execution_plan: Some(RequestExecutionSchedule::Immediate),
        expiration_dt: None,
    };

    // 4. Create request in Orbit
    let result: (CreateRequestResult,) = ic_cdk::call(
        station_id,
        "create_request",
        (request_input,)
    )
    .await
    .map_err(|e| format!("Failed to create Orbit request: {:?}", e))?;

    // 5. Auto-create proposal
    match result.0 {
        CreateRequestResult::Ok(response) => {
            let request_id = response.request.id;

            use crate::proposals::{ensure_proposal_for_request, OrbitRequestType};

            match ensure_proposal_for_request(
                token_canister_id,
                request_id.clone(),
                OrbitRequestType::PruneExternalCanister,
            ).await {
                Ok(proposal_id) => {
                    ic_cdk::println!(
                        "Delete governance: Orbit request {} → DAOPad proposal {:?}",
                        request_id, proposal_id
                    );
                    Ok(request_id)
                },
                Err(e) => {
                    Err(format!(
                        "GOVERNANCE VIOLATION: Orbit request {} created but proposal failed: {:?}",
                        request_id, e
                    ))
                }
            }
        },
        CreateRequestResult::Err(e) => Err(format!("Orbit error: {}", e.code)),
    }
}
```

**KEEP UNCHANGED**: `get_canister_snapshots` (lines 269-306) - works perfectly

### Phase 2: Update Candid Interface

#### File: `daopad_backend/daopad_backend.did`

**ACTION**: After Rust changes, regenerate Candid:
```bash
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
```

**EXPECTED CHANGES**:
```candid
// Old (disabled methods - will be removed)
snapshot_orbit_canister_request : (...) -> (Result);
restore_orbit_canister_request : (...) -> (Result);
prune_orbit_canister_snapshots_request : (...) -> (Result);

// New (governance-enabled methods)
create_snapshot_proposal : (principal, text, bool) -> (Result);
create_restore_snapshot_proposal : (principal, text, text) -> (Result);
create_delete_snapshot_proposal : (principal, text, text) -> (Result);
```

### Phase 3: Frontend Service Layer

#### File: `daopad_frontend/src/services/canisterService.js`

**REPLACE lines 392-427** (takeSnapshot):
```javascript
// PSEUDOCODE

// Create a snapshot proposal (governance-controlled)
createSnapshotProposal: async (tokenCanisterId, externalCanisterId, force = false) => {
  try {
    const actor = await getBackendActor();

    // Call new governance-enabled backend method
    const result = await actor.create_snapshot_proposal(
      Principal.fromText(tokenCanisterId),
      externalCanisterId,  // UUID string, not Principal
      force
    );

    // Result is now request_id, not immediate execution
    if (result.Ok) {
      return {
        success: true,
        data: {
          request_id: result.Ok,
          message: 'Snapshot proposal created successfully'
        }
      };
    } else {
      return {
        success: false,
        error: result.Err
      };
    }
  } catch (error) {
    console.error('Failed to create snapshot proposal:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

**REPLACE lines 429-464** (restoreSnapshot):
```javascript
// PSEUDOCODE

// Create a restore proposal (governance-controlled)
createRestoreProposal: async (tokenCanisterId, externalCanisterId, snapshotId) => {
  try {
    const actor = await getBackendActor();

    const result = await actor.create_restore_snapshot_proposal(
      Principal.fromText(tokenCanisterId),
      externalCanisterId,
      snapshotId
    );

    if (result.Ok) {
      return {
        success: true,
        data: {
          request_id: result.Ok,
          message: 'Restore proposal created successfully'
        }
      };
    } else {
      return {
        success: false,
        error: result.Err
      };
    }
  } catch (error) {
    console.error('Failed to create restore proposal:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

**REPLACE lines 671-698** (deleteSnapshot):
```javascript
// PSEUDOCODE

// Create a delete proposal (governance-controlled)
createDeleteProposal: async (tokenCanisterId, externalCanisterId, snapshotId) => {
  try {
    const actor = await getBackendActor();

    const result = await actor.create_delete_snapshot_proposal(
      Principal.fromText(tokenCanisterId),
      externalCanisterId,
      snapshotId
    );

    if (result.Ok) {
      return {
        success: true,
        data: {
          request_id: result.Ok,
          message: 'Delete proposal created successfully'
        }
      };
    } else {
      return {
        success: false,
        error: result.Err
      };
    }
  } catch (error) {
    console.error('Failed to create delete proposal:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

**KEEP UNCHANGED**: `listSnapshots` (lines 633-668) - works perfectly

### Phase 4: Frontend UI Updates

#### File: `daopad_frontend/src/components/canisters/CanisterSnapshots.jsx`

**UPDATE lines 64-97** (handleTakeSnapshot):
```javascript
// PSEUDOCODE

const handleTakeSnapshot = async () => {
  if (!canManage) {
    setError('You do not have permission to propose snapshots.');
    return;
  }

  if (snapshots.length >= MAX_SNAPSHOTS) {
    setError(`Maximum number of snapshots (${MAX_SNAPSHOTS}) reached. Please delete old snapshots first.`);
    return;
  }

  setTakingSnapshot(true);
  setError(null);
  setSuccess(null);

  try {
    // Call NEW governance method
    const result = await canisterService.createSnapshotProposal(
      orbitStationId,
      canister.id,
      false  // force parameter
    );

    if (result.success) {
      // Update success message for governance flow
      setSuccess(
        'Snapshot proposal created successfully! ' +
        'Community voting required (60% threshold). ' +
        'Check the Governance tab to vote or view proposal status.'
      );

      // Optional: Link to governance page
      // Could add: <Link to={`/governance/${result.data.request_id}`}>View Proposal</Link>

      // Don't refresh snapshots yet - snapshot only created after vote passes
    } else {
      setError(result.error || 'Failed to create snapshot proposal');
    }
  } catch (err) {
    console.error('Snapshot proposal error:', err);
    setError('Failed to create snapshot proposal');
  } finally {
    setTakingSnapshot(false);
  }
}
```

**UPDATE lines 99-127** (handleRestoreSnapshot):
```javascript
// PSEUDOCODE

const handleRestoreSnapshot = async (snapshot) => {
  if (!confirm(
    `Are you sure you want to PROPOSE restoring from snapshot taken on ${formatDate(snapshot.taken_at)}? ` +
    `This proposal requires 60% community approval. If approved, it will replace the current canister state.`
  )) {
    return;
  }

  setRestoringSnapshot(snapshot.id);
  setError(null);
  setSuccess(null);

  try {
    const result = await canisterService.createRestoreProposal(
      orbitStationId,
      canister.id,
      snapshot.id
    );

    if (result.success) {
      setSuccess(
        'Restore proposal created successfully! ' +
        'Community voting required (60% threshold). ' +
        'Check the Governance tab to vote.'
      );
    } else {
      setError(result.error || 'Failed to create restore proposal');
    }
  } catch (err) {
    console.error('Restore proposal error:', err);
    setError('Failed to create restore proposal');
  } finally {
    setRestoringSnapshot(null);
  }
}
```

**UPDATE lines 129-157** (handleDeleteSnapshot):
```javascript
// PSEUDOCODE

const handleDeleteSnapshot = async (snapshot) => {
  if (!confirm(
    `Propose deleting snapshot from ${formatDate(snapshot.taken_at)}? ` +
    `This proposal requires 60% community approval. Deleted snapshots cannot be recovered.`
  )) {
    return;
  }

  setDeletingSnapshot(snapshot.id);
  setError(null);
  setSuccess(null);

  try {
    const result = await canisterService.createDeleteProposal(
      orbitStationId,
      canister.id,
      snapshot.id
    );

    if (result.success) {
      setSuccess(
        'Delete proposal created successfully! ' +
        'Community voting required (60% threshold). ' +
        'Check the Governance tab to vote.'
      );
    } else {
      setError(result.error || 'Failed to create delete proposal');
    }
  } catch (err) {
    console.error('Delete proposal error:', err);
    setError('Failed to create delete proposal');
  } finally {
    setDeletingSnapshot(null);
  }
}
```

**UPDATE line 244** (button text):
```javascript
// OLD:
{takingSnapshot ? 'Taking Snapshot...' : 'Take Snapshot'}

// NEW:
{takingSnapshot ? 'Creating Proposal...' : 'Propose Snapshot'}
```

**UPDATE lines 367-389** (info section):
```javascript
// PSEUDOCODE

// ADD new info item at top:
<p className="flex items-start">
  <Info className="h-4 w-4 mr-2 mt-0.5 text-blue-500 flex-shrink-0" />
  All snapshot operations require community approval via governance proposals (60% voting power threshold)
</p>

// Keep existing info items
<p className="flex items-start">
  <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
  Snapshots capture the complete canister state including memory and stable storage
</p>
// ... rest unchanged
```

## Testing Requirements

### Pre-deployment Testing

1. **Type Discovery via dfx** (Use test station: `fec7w-zyaaa-aaaaa-qaffq-cai`):
```bash
# Test snapshot request creation
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai create_request '(record {
  operation = variant {
    SnapshotExternalCanister = record {
      external_canister_id = "63b71c53-4345-48ac-9c14-8cfdfc35cea1";
      force = false
    }
  };
  title = opt "Test Snapshot";
  summary = opt "Testing snapshot request format";
  execution_plan = opt variant { Immediate };
})'

# Verify request was created
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_requests '(record {
  statuses = opt vec { variant { Created }; variant { Approved } };
  paginate = opt record { offset = 0; limit = 10 };
})'
```

2. **Backend Build**:
```bash
cd /home/theseus/alexandria/daopad-snapshot-governance/src/daopad

cargo build --target wasm32-unknown-unknown --release -p daopad_backend
# Should compile without errors

candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
# Check new methods appear in .did file
grep "create_snapshot_proposal" daopad_backend/daopad_backend.did
```

3. **Frontend Build**:
```bash
npm run build
# Should complete without errors
```

### Post-deployment Testing

1. **Backend Deployment**:
```bash
./deploy.sh --network ic --backend-only
# Verify success
dfx canister --network ic info lwsav-iiaaa-aaaap-qp2qq-cai
```

2. **Declaration Sync**:
```bash
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
# Verify new methods exist
grep "create_snapshot_proposal" daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js
```

3. **Frontend Deployment**:
```bash
./deploy.sh --network ic --frontend-only
# Test in browser at https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
```

4. **End-to-End Testing**:
```bash
# In browser console:
# 1. Navigate to Canisters → DAOPad Frontend → Snapshots tab
# 2. Click "Propose Snapshot"
# 3. Verify success message mentions "Community voting required"
# 4. Navigate to Governance tab
# 5. Verify proposal appears with 60% threshold
# 6. Vote with sufficient VP
# 7. Verify snapshot appears in list after approval
```

### Validation Checklist

- [ ] Backend compiles without errors
- [ ] Candid file regenerated with new methods
- [ ] Frontend builds without errors
- [ ] Backend deploys successfully
- [ ] Frontend declarations synced
- [ ] Frontend deploys successfully
- [ ] "Propose Snapshot" button appears in UI
- [ ] Creating proposal returns request_id
- [ ] Success message mentions governance
- [ ] Proposal appears in Governance tab with 60% threshold
- [ ] Voting flow works end-to-end
- [ ] Snapshot executes after vote passes

## Implementation Notes

### Key Architectural Decisions

1. **Governance First**: All snapshot operations create proposals BEFORE Orbit requests
   - Prevents orphaned requests without proposals
   - Ensures 100% governance coverage

2. **Atomic Proposal Creation**: Uses `ensure_proposal_for_request()`
   - Prevents race conditions
   - Reuses battle-tested pattern from admin removal

3. **60% Threshold**: Matches other canister operations
   - Defined in `OrbitRequestType::voting_threshold()`
   - Consistent risk-based governance

4. **UUID vs Principal**: External canister ID is UUID string, not Principal
   - Orbit uses UUIDs internally for tracking
   - Principal is stored within the UUID record

5. **No Backward Compatibility**: Rip and replace
   - Old disabled methods are removed
   - New governance methods replace them
   - Aligns with CLAUDE.md: "Don't worry about backwards compatibility"

### Error Handling Patterns

1. **Authentication Guard**: All methods check `caller != anonymous`
2. **Station Lookup**: Return error if token not registered
3. **Orbit Call Failures**: Propagate with detailed error messages
4. **Governance Violations**: Explicit error if proposal creation fails
5. **Frontend Errors**: User-friendly messages + console logging

### Future Enhancements (Not in This PR)

1. Link directly to proposal from success message
2. Show proposal status in Snapshots tab
3. Batch operations (multiple snapshots at once)
4. Automatic proposals for pre-upgrade snapshots
5. Snapshot size/cost estimation before proposal

## Summary

This plan transforms snapshot operations from direct execution to governance-controlled proposals. The implementation follows the established admin removal pattern, ensuring:

- ✅ **Universal governance coverage** - All Orbit modifications require voting
- ✅ **Consistent architecture** - Reuses `ensure_proposal_for_request()` helper
- ✅ **Type-safe thresholds** - 60% for canister operations
- ✅ **User experience** - Clear messaging about governance requirement
- ✅ **Battle-tested pattern** - Follows proven implementation from orbit_users.rs

**Files Modified**: 4 (backend + frontend service + frontend component + auto-generated candid)
**Lines Added**: ~300 (mostly pseudocode above, actual implementation)
**Lines Removed**: ~47 (disabled error-returning methods)
**Net Effect**: Enables snapshot functionality through proper governance channels
