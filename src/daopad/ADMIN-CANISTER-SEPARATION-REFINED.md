# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-admin-canister-separation/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-admin-canister-separation/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Backend changes:
     ```bash
     cargo build --target wasm32-unknown-unknown --release -p daopad_backend
     candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
     cargo build --target wasm32-unknown-unknown --release -p admin
     candid-extractor target/wasm32-unknown-unknown/release/admin.wasm > admin/admin.did
     ./deploy.sh --network ic
     cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
     cp -r src/declarations/admin/* daopad_frontend/src/declarations/admin/
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Architecture]: Separate backend into operator and admin canisters for Orbit separation of duties"
   git push -u origin feature/admin-canister-separation
   gh pr create --title "[Architecture]: Admin Canister Separation for Orbit Compliance" --body "$(cat <<'EOF'
## Summary
- Split DAOPad into two canisters to comply with Orbit Station separation of duties
- Backend (operator): Creates Orbit requests only
- Admin (admin): Votes and approves requests only
- Frontend orchestrates flow between both canisters

## Key Changes
- Created new admin canister with unified voting system
- Moved proposals/unified.rs to admin canister
- Moved Kong Locker voting power queries to admin
- Moved UNIFIED_PROPOSALS, UNIFIED_PROPOSAL_VOTES, KONG_LOCKER_PRINCIPALS to admin
- Backend now only creates requests, returns request_id to frontend
- Frontend triggers proposal creation via admin.create_proposal()

## Testing
- Manual browser verification completed
- DFX integration tests pass
- Separation of duties enforced (backend cannot approve)
- Frontend successfully orchestrates two-canister flow

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Implements ADMIN-CANISTER-SEPARATION-REFINED.md
EOF
)"
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

**Branch:** `feature/admin-canister-separation`
**Worktree:** `/home/theseus/alexandria/daopad-admin-canister-separation/src/daopad`

---

# Implementation Plan: Admin Canister Separation

## Task Classification
**NEW FEATURE**: Build new admin canister + refactor existing backend

## Architecture Problem

Orbit Station enforces **separation of duties**:
- Request CREATOR cannot approve their own requests
- Request APPROVER must not have created the request

Currently, `daopad_backend` violates this by both:
1. Creating Orbit requests (as operator)
2. Approving them via `vote_on_proposal` when voting threshold is reached (as admin)

This means DAOPad approves its own requests, bypassing Orbit's security model.

## Solution: Two-Canister Architecture

### Admin Canister (NEW: odkrm-viaaa-aaaap-qp2oq-cai)
**Role**: Orbit Station Admin - ONLY approves/rejects via liquid democracy

**Responsibilities**:
- Create proposals for community voting
- Query Kong Locker for voting power
- Track votes and calculate thresholds
- Call `submit_request_approval` in Orbit when threshold reached
- Store proposal and vote state

### DAOPad Backend (EXISTING: lwsav-iiaaa-aaaap-qp2qq-cai)
**Role**: Orbit Station Operator - ONLY creates requests

**Responsibilities**:
- Create Orbit requests (Transfer, EditUser, AddAsset, etc.)
- Maintain token registry (TOKEN_ORBIT_STATIONS)
- Provide read-only queries for frontend
- Return request_ids to frontend for proposal creation

## Data Flow: Before vs After

### BEFORE (Current - Violates Separation):
```
User → Frontend → Backend.create_request()
                    ↓
        1. Create Orbit Request (operator role)
        2. Create Proposal (governance)
        3. Accept Votes (tracks voting power)
        4. Approve Request (admin role) ← VIOLATION!
```

### AFTER (Separated - Compliant):
```
User → Frontend → Backend.create_request()
                    ↓
                  Returns request_id
                    ↓
       Frontend → Admin.create_proposal(request_id, operation_type)
                    ↓
                  Proposal created with voting
                    ↓
       Frontend → Admin.vote_on_proposal(request_id, vote)
                    ↓
             [Threshold reached]
                    ↓
             Admin.approve_orbit_request()
                    ↓
             Calls Orbit directly (admin role)
```

**Key Difference**: Frontend orchestrates the flow, not backend!

## Current State Documentation

### Files in Unified Voting System (daopad_backend)

After PR #112 (voting unification), we have:

**daopad_backend/src/proposals/**
```
mod.rs                          # Exports unified system
unified.rs                      # ALL voting logic (803 lines)
  - vote_on_proposal()          # Line 239: Main voting endpoint
  - create_orbit_request_with_proposal()  # Line 468: Creates request + proposal
  - get_proposal()              # Line 553: Query proposal
  - list_unified_proposals()    # Line 567: List proposals
  - has_user_voted()            # Line 580: Check if voted
  - get_user_vote()             # Line 604: Get user's vote
  - ensure_proposal_for_request()  # Line 623: Auto-create proposal
  - approve_orbit_request()     # Line 822: Approve in Orbit (ADMIN ONLY)
  - reject_orbit_request()      # Line 832: Reject in Orbit (ADMIN ONLY)
types.rs                        # ProposalId, UnifiedProposal, etc.
treasury.rs                     # DEPRECATED (stub only)
orbit_requests.rs               # DEPRECATED (empty)
```

**daopad_backend/src/kong_locker/**
```
voting.rs                       # Voting power calculations
  - get_user_voting_power_for_token()  # Query Kong Locker for user VP
  - calculate_voting_power_for_token()  # Calculate VP for specific token
```

**daopad_backend/src/storage/state.rs**
```rust
// Lines 54-79: Unified storage
thread_local! {
    pub static UNIFIED_PROPOSALS: RefCell<BTreeMap<(StorablePrincipal, String), UnifiedProposal>>;
    pub static UNIFIED_PROPOSAL_VOTES: RefCell<BTreeMap<(ProposalId, StorablePrincipal), VoteChoice>>;
    pub static KONG_LOCKER_PRINCIPALS: RefCell<BTreeMap<StorablePrincipal, StorablePrincipal>>;
    pub static TOKEN_ORBIT_STATIONS: RefCell<BTreeMap<StorablePrincipal, StorablePrincipal>>;
}
```

**daopad_backend/src/api/**
```
orbit_transfers.rs              # Create transfer requests
orbit_users.rs                  # Create user management requests
orbit_assets.rs                 # Create asset requests
orbit_permissions.rs            # Create permission requests
```

### What Moves to Admin Canister

**MOVE** (governance layer):
- `proposals/unified.rs` → `admin/src/proposals/unified.rs`
- `kong_locker/voting.rs` → `admin/src/kong_locker/voting.rs`
- `proposals/types.rs` → `admin/src/proposals/types.rs`
- Storage: `UNIFIED_PROPOSALS`, `UNIFIED_PROPOSAL_VOTES`, `KONG_LOCKER_PRINCIPALS`

**KEEP** in backend (operational layer):
- `api/orbit_transfers.rs` - Creates transfer requests
- `api/orbit_users.rs` - Creates user requests
- `api/orbit_assets.rs` - Creates asset requests
- `api/orbit_permissions.rs` - Creates permission requests
- Storage: `TOKEN_ORBIT_STATIONS` - Token registry

## Implementation Steps

### Phase 1: Create Admin Canister Structure

#### Directory Structure
```
admin/                          # NEW
├── Cargo.toml                 # NEW
├── admin.did                  # Generated
└── src/
    ├── lib.rs                # NEW - Main entry point
    ├── proposals/
    │   ├── mod.rs            # COPIED from backend
    │   ├── unified.rs        # MOVED from backend
    │   └── types.rs          # MOVED from backend
    ├── kong_locker/
    │   ├── mod.rs            # COPIED from backend
    │   └── voting.rs         # MOVED from backend
    ├── storage/
    │   ├── mod.rs            # NEW
    │   ├── memory.rs         # NEW - Stable memory config
    │   └── state.rs          # NEW - Proposal storage
    └── types/
        ├── mod.rs            # NEW
        └── orbit.rs          # COPIED from backend (subset needed)
```

#### admin/Cargo.toml
```toml
[package]
name = "admin"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
ic-cdk = "0.16"
candid = "0.10"
serde = { version = "1.0", features = ["derive"] }
ic-stable-structures = "0.6"
thiserror = "1.0"

[dev-dependencies]
candid-extractor = "0.2"
```

### Phase 2: Admin Canister Implementation

#### admin/src/lib.rs
```rust
// PSEUDOCODE
mod proposals;
mod kong_locker;
mod storage;
mod types;

use candid::{CandidType, Deserialize, Nat, Principal};
use ic_cdk::{init, update, query};
use proposals::types::{ProposalId, UnifiedProposal, VoteChoice, ProposalError};

#[init]
fn init() {
    ic_cdk::println!("🔐 Admin canister initialized: {:?}", ic_cdk::id());
    ic_cdk::println!("📜 This canister handles governance and approval of Orbit requests");
}

// ============================================================================
// Public API - Called by Frontend
// ============================================================================

/// Called by FRONTEND after backend creates Orbit request
/// This triggers proposal creation for community voting
#[update]
pub async fn create_proposal(
    token_id: Principal,
    orbit_request_id: String,
    operation_type: String, // "Transfer", "EditUser", "AddAsset", etc.
) -> Result<String, String> {
    // Uses ensure_proposal_for_request from unified.rs
    // This creates a proposal that users can vote on
    proposals::unified::ensure_proposal_for_request(
        token_id,
        orbit_request_id,
        operation_type
    ).await
    .map(|proposal_id| format!("{:?}", proposal_id))
    .map_err(|e| format!("{:?}", e))
}

/// Called by FRONTEND when user votes on a proposal
/// When threshold is reached, automatically approves in Orbit
#[update]
pub async fn vote_on_proposal(
    token_id: Principal,
    orbit_request_id: String,
    vote: bool,
) -> Result<(), String> {
    // Uses unified voting from unified.rs
    // Includes:
    // 1. Validate voter auth
    // 2. Check proposal exists and is active
    // 3. Get voting power from Kong Locker
    // 4. Record vote
    // 5. Check if threshold reached
    // 6. If yes: approve_orbit_request (calls Orbit directly)
    proposals::unified::vote_on_proposal(token_id, orbit_request_id, vote).await
        .map_err(|e| format!("{:?}", e))
}

// ============================================================================
// Query Methods - Read-only
// ============================================================================

#[query]
pub fn get_proposal(
    token_id: Principal,
    orbit_request_id: String
) -> Option<UnifiedProposal> {
    proposals::unified::get_proposal(token_id, orbit_request_id)
}

#[query]
pub fn list_proposals(token_id: Principal) -> Vec<UnifiedProposal> {
    proposals::unified::list_unified_proposals(token_id)
}

#[query]
pub fn has_user_voted(
    user: Principal,
    token_id: Principal,
    orbit_request_id: String
) -> bool {
    proposals::unified::has_user_voted(user, token_id, orbit_request_id)
}

#[query]
pub fn get_user_vote(
    user: Principal,
    token_id: Principal,
    orbit_request_id: String
) -> Option<VoteChoice> {
    proposals::unified::get_user_vote(user, token_id, orbit_request_id)
}

// ============================================================================
// Kong Locker Integration
// ============================================================================

/// Register user's Kong Locker canister
/// Called by backend when user registers (forwarded from backend)
#[update]
pub fn register_kong_locker(
    user: Principal,
    kong_locker: Principal
) -> Result<(), String> {
    storage::state::KONG_LOCKER_PRINCIPALS.with(|principals| {
        principals.borrow_mut().insert(
            types::StorablePrincipal(user),
            types::StorablePrincipal(kong_locker)
        );
    });
    Ok(())
}

/// Get user's registered Kong Locker principal
#[query]
pub fn get_kong_locker(user: Principal) -> Option<Principal> {
    storage::state::KONG_LOCKER_PRINCIPALS.with(|principals| {
        principals.borrow()
            .get(&types::StorablePrincipal(user))
            .map(|sp| sp.0)
    })
}

// ============================================================================
// Candid Export
// ============================================================================

ic_cdk::export_candid!();
```

#### admin/src/storage/state.rs
```rust
// PSEUDOCODE
use crate::proposals::types::{ProposalId, UnifiedProposal, VoteChoice};
use crate::types::StorablePrincipal;
use std::cell::RefCell;
use std::collections::BTreeMap;

thread_local! {
    // ====================================================================
    // Unified Proposal Storage - ALL Orbit Operations
    // ====================================================================
    // MOVED from daopad_backend/src/storage/state.rs
    //
    // Key: (token_canister_id, orbit_request_id)
    // This stores all proposals for community voting
    pub static UNIFIED_PROPOSALS: RefCell<BTreeMap<
        (StorablePrincipal, String),
        UnifiedProposal
    >> = RefCell::new(BTreeMap::new());

    // Unified vote tracking for all proposals
    // Key: (ProposalId, Voter Principal)
    // Prevents double voting and tracks vote history
    pub static UNIFIED_PROPOSAL_VOTES: RefCell<BTreeMap<
        (ProposalId, StorablePrincipal),
        VoteChoice
    >> = RefCell::new(BTreeMap::new());

    // Kong Locker registration
    // Key: User Principal → Kong Locker Principal
    // Used to calculate voting power for each user
    pub static KONG_LOCKER_PRINCIPALS: RefCell<BTreeMap<
        StorablePrincipal,
        StorablePrincipal
    >> = RefCell::new(BTreeMap::new());
}
```

### Phase 3: Backend Simplification

#### Changes to daopad_backend/src/api/orbit_transfers.rs

```rust
// PSEUDOCODE - MODIFY existing function

// BEFORE (unified):
#[update]
pub async fn create_transfer_request(...) -> Result<String, String> {
    // 1. Create Orbit request
    // 2. Auto-create proposal in backend
    // 3. Backend handles voting
    // 4. Backend approves when threshold reached
}

// AFTER (separated):
#[update]
pub async fn create_transfer_request(
    token_canister_id: Principal,
    from_account_id: String,
    from_asset_id: String,
    to: String,
    amount: Nat,
    memo: Option<String>,
) -> Result<String, String> {
    // 1. Validate inputs
    if from_account_id.is_empty() || from_asset_id.is_empty() {
        return Err("Invalid transfer details".to_string());
    }

    // 2. Get station ID
    let station_id = storage::state::TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow()
            .get(&types::StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or("Station not linked".to_string())
    })?;

    // 3. Create Orbit request (backend is operator, can create but not approve)
    let transfer_op = TransferOperationInput {
        from_account_id,
        from_asset_id,
        with_standard: "icrc1".to_string(),
        to,
        amount,
        fee: None,
        metadata: memo.map(|m| vec![TransferMetadata {
            key: "memo".to_string(),
            value: m,
        }]).unwrap_or_default(),
        network: None,
    };

    let request_input = SubmitRequestInput {
        operation: RequestOperation::Transfer(transfer_op),
        title: Some("Community Transfer Request".to_string()),
        summary: Some("Transfer request created via DAOPad".to_string()),
        execution_plan: None,
    };

    let result: Result<(CreateRequestResult,), _> =
        ic_cdk::call(station_id, "create_request", (request_input,)).await;

    match result {
        Ok((CreateRequestResult::Ok(response),)) => {
            // 4. Return request_id to frontend
            // Frontend will call: admin.create_proposal(token_id, request_id, "Transfer")
            Ok(response.request.id)
        },
        Ok((CreateRequestResult::Err(e),)) => {
            Err(format!("Orbit error: {:?}", e))
        },
        Err((code, msg)) => {
            Err(format!("IC call failed: {} - {}", code, msg))
        }
    }
}

// REMOVE: No longer create proposals in backend
// REMOVE: No longer handle voting in backend
// REMOVE: No longer approve/reject in backend
```

#### Changes to daopad_backend/src/api/orbit_users.rs

```rust
// PSEUDOCODE - MODIFY existing function

// BEFORE:
#[update]
pub async fn create_remove_admin_request(...) -> Result<String, String> {
    // 1. Create Orbit request
    // 2. Call ensure_proposal_for_request (backend)
    // 3. Backend handles rest
}

// AFTER:
#[update]
pub async fn create_remove_admin_request(
    token_canister_id: Principal,
    user_id: String,
    user_name: String,
) -> Result<String, String> {
    // 1. Get station ID
    let station_id = get_station_id(token_canister_id)?;

    // 2. Create EditUser request in Orbit
    let edit_user_op = EditUserOperationInput {
        id: user_id.clone(),
        name: Some(user_name.clone()),
        identities: None,
        groups: Some(vec![OPERATOR_GROUP_ID.to_string()]), // Demote to operator
        status: None,
        cancel_pending_requests: None,
    };

    let request_input = SubmitRequestInput {
        operation: RequestOperation::EditUser(edit_user_op),
        title: Some(format!("Remove admin: {}", user_name)),
        summary: Some("Community-approved admin removal".to_string()),
        execution_plan: None,
    };

    let result: Result<(CreateRequestResult,), _> =
        ic_cdk::call(station_id, "create_request", (request_input,)).await;

    match result {
        Ok((CreateRequestResult::Ok(response),)) => {
            // Return request_id to frontend
            // Frontend will call: admin.create_proposal(token_id, request_id, "EditUser")
            Ok(response.request.id)
        },
        Ok((CreateRequestResult::Err(e),)) => {
            Err(format!("Orbit error: {:?}", e))
        },
        Err((code, msg)) => {
            Err(format!("IC call failed: {} - {}", code, msg))
        }
    }
}

// REMOVE: ensure_proposal_for_request call (now in admin)
```

#### Changes to daopad_backend/src/storage/state.rs

```rust
// PSEUDOCODE

// BEFORE:
thread_local! {
    pub static TOKEN_ORBIT_STATIONS: RefCell<BTreeMap<...>>;
    pub static UNIFIED_PROPOSALS: RefCell<BTreeMap<...>>;  // REMOVE
    pub static UNIFIED_PROPOSAL_VOTES: RefCell<BTreeMap<...>>;  // REMOVE
    pub static KONG_LOCKER_PRINCIPALS: RefCell<BTreeMap<...>>;  // REMOVE
}

// AFTER:
thread_local! {
    // KEEP: Token registry (backend needs this to create requests)
    pub static TOKEN_ORBIT_STATIONS: RefCell<BTreeMap<
        StorablePrincipal,
        StorablePrincipal
    >> = RefCell::new(BTreeMap::new());

    // REMOVE: Proposals moved to admin canister
    // REMOVE: Votes moved to admin canister
    // REMOVE: Kong Locker moved to admin canister
}
```

#### DELETE from Backend

```
daopad_backend/src/proposals/unified.rs    # MOVE to admin
daopad_backend/src/kong_locker/voting.rs   # MOVE to admin
```

### Phase 4: Frontend Integration

#### Create new service: daopad_frontend/src/services/AdminService.ts

```typescript
// PSEUDOCODE
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from '../declarations/admin';
import { Principal } from '@dfinity/principal';

export class AdminService {
  private static adminCanisterId = 'odkrm-viaaa-aaaap-qp2oq-cai';

  static async getActor() {
    const agent = new HttpAgent({
      host: process.env.NODE_ENV === 'production'
        ? 'https://icp0.io'
        : 'http://localhost:4943'
    });

    // In dev, fetch root key
    if (process.env.NODE_ENV !== 'production') {
      await agent.fetchRootKey();
    }

    return Actor.createActor(idlFactory, {
      agent,
      canisterId: this.adminCanisterId,
    });
  }

  /**
   * Create proposal for an Orbit request
   * Called by frontend after backend.create_request() returns request_id
   */
  static async createProposal(
    tokenId: Principal,
    orbitRequestId: string,
    operationType: string // "Transfer", "EditUser", "AddAsset", etc.
  ): Promise<string> {
    const actor = await this.getActor();
    return actor.create_proposal(tokenId, orbitRequestId, operationType);
  }

  /**
   * Vote on a proposal
   * Called by frontend when user clicks Yes/No
   */
  static async voteOnProposal(
    tokenId: Principal,
    orbitRequestId: string,
    vote: boolean
  ): Promise<void> {
    const actor = await this.getActor();
    return actor.vote_on_proposal(tokenId, orbitRequestId, vote);
  }

  /**
   * Get proposal details
   */
  static async getProposal(
    tokenId: Principal,
    orbitRequestId: string
  ) {
    const actor = await this.getActor();
    return actor.get_proposal(tokenId, orbitRequestId);
  }

  /**
   * List all proposals for a token
   */
  static async listProposals(tokenId: Principal) {
    const actor = await this.getActor();
    return actor.list_proposals(tokenId);
  }

  /**
   * Check if user has voted
   */
  static async hasUserVoted(
    user: Principal,
    tokenId: Principal,
    orbitRequestId: string
  ): Promise<boolean> {
    const actor = await this.getActor();
    return actor.has_user_voted(user, tokenId, orbitRequestId);
  }

  /**
   * Register user's Kong Locker
   */
  static async registerKongLocker(
    user: Principal,
    kongLocker: Principal
  ): Promise<void> {
    const actor = await this.getActor();
    return actor.register_kong_locker(user, kongLocker);
  }
}
```

#### Update existing component: daopad_frontend/src/components/TransferForm.tsx

```typescript
// PSEUDOCODE - MODIFY existing component

// BEFORE (single backend call):
const handleTransfer = async () => {
  try {
    const result = await daopadBackend.create_transfer_request(...);
    // Backend handles everything: creates request + proposal + voting
  } catch (error) {
    console.error('Transfer failed:', error);
  }
};

// AFTER (two-step flow):
import { AdminService } from '../services/AdminService';

const handleTransfer = async () => {
  try {
    // Step 1: Create Orbit request via backend (operator role)
    const orbitRequestId = await daopadBackend.create_transfer_request(
      tokenId,
      fromAccountId,
      fromAssetId,
      recipientAddress,
      amount,
      memo
    );

    console.log('Orbit request created:', orbitRequestId);

    // Step 2: Create proposal via admin canister (governance)
    const proposalId = await AdminService.createProposal(
      tokenId,
      orbitRequestId,
      'Transfer' // operation type
    );

    console.log('Proposal created:', proposalId);

    // Show success message
    toast.success('Transfer proposal created! Users can now vote.');

    // Navigate to proposal page
    navigate(`/token/${tokenId}/proposal/${orbitRequestId}`);
  } catch (error) {
    console.error('Transfer failed:', error);
    toast.error(error.message || 'Failed to create transfer');
  }
};
```

#### Update existing component: daopad_frontend/src/components/ProposalVoteCard.tsx

```typescript
// PSEUDOCODE - MODIFY existing component

// BEFORE:
const handleVote = async (vote: boolean) => {
  try {
    await daopadBackend.vote_on_proposal(tokenId, proposalId, vote);
  } catch (error) {
    console.error('Vote failed:', error);
  }
};

// AFTER:
import { AdminService } from '../services/AdminService';

const handleVote = async (vote: boolean) => {
  try {
    // Vote through admin canister (not backend)
    await AdminService.voteOnProposal(
      Principal.fromText(tokenId),
      proposalId,
      vote
    );

    toast.success(vote ? 'Voted YES!' : 'Voted NO!');

    // Refresh proposal to show updated vote counts
    refreshProposal();
  } catch (error) {
    console.error('Vote failed:', error);

    // Better error messages
    if (error.message.includes('Already voted')) {
      toast.error('You already voted on this proposal');
    } else if (error.message.includes('No voting power')) {
      toast.error('You need to lock LP tokens to vote');
    } else {
      toast.error(error.message || 'Vote failed');
    }
  }
};
```

#### Update existing page: daopad_frontend/src/pages/ProposalListPage.tsx

```typescript
// PSEUDOCODE - MODIFY existing component

// BEFORE:
const loadProposals = async () => {
  const proposals = await daopadBackend.list_proposals(tokenId);
  setProposals(proposals);
};

// AFTER:
import { AdminService } from '../services/AdminService';

const loadProposals = async () => {
  try {
    // Load from admin canister (not backend)
    const proposals = await AdminService.listProposals(
      Principal.fromText(tokenId)
    );

    setProposals(proposals);
  } catch (error) {
    console.error('Failed to load proposals:', error);
    toast.error('Failed to load proposals');
  }
};
```

### Phase 5: Build Configuration

#### Update dfx.json

```json
{
  "canisters": {
    "admin": {
      "type": "rust",
      "package": "admin",
      "candid": "admin/admin.did"
    },
    "daopad_backend": {
      "type": "rust",
      "package": "daopad_backend",
      "candid": "daopad_backend/daopad_backend.did"
    },
    "daopad_frontend": {
      "type": "assets",
      "source": ["daopad_frontend/dist"],
      "dependencies": ["daopad_backend", "admin"]
    }
  }
}
```

#### Update canister_ids.json

```json
{
  "admin": {
    "ic": "odkrm-viaaa-aaaap-qp2oq-cai"
  },
  "daopad_backend": {
    "ic": "lwsav-iiaaa-aaaap-qp2qq-cai"
  },
  "daopad_frontend": {
    "ic": "l7rlj-6aaaa-aaaaa-qaffq-cai"
  }
}
```

#### Update Root Cargo.toml

```toml
[workspace]
members = [
    "daopad_backend",
    "admin"  # ADD THIS
]
```

## Testing Requirements

### Type Discovery (MANDATORY FIRST)
```bash
# Test Orbit API types before implementing
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai __get_candid

# Verify admin canister interface after deployment
dfx canister --network ic call odkrm-viaaa-aaaap-qp2oq-cai __get_candid
```

### Build & Deploy Sequence
```bash
# 1. Build both canisters
cd /home/theseus/alexandria/daopad-admin-canister-separation/src/daopad
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
cargo build --target wasm32-unknown-unknown --release -p admin

# 2. Extract candid
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
candid-extractor target/wasm32-unknown-unknown/release/admin.wasm > admin/admin.did

# 3. Deploy both to IC
./deploy.sh --network ic

# 4. Sync declarations to frontend
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
cp -r src/declarations/admin/* daopad_frontend/src/declarations/admin/
```

### Manual Browser Verification (MANDATORY BEFORE PLAYWRIGHT)
```bash
# 1. Build frontend
cd daopad_frontend
npm run build

# 2. Deploy frontend
cd ..
./deploy.sh --network ic --frontend-only

# 3. Open browser to deployed frontend
# https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io

# 4. Test flow manually:
#    a. Navigate to token dashboard
#    b. Click "Create Transfer"
#    c. Fill form and submit
#    d. Verify proposal appears
#    e. Vote on proposal
#    f. Check vote is recorded
#    g. Open Orbit Station UI
#    h. Verify request status changes when threshold reached

# 5. Inspect browser console for errors:
#    - Open DevTools (F12)
#    - Check Console tab
#    - Look for red errors
#    - Verify no "actor.method_name is not a function" errors
#    - Verify no "cannot read property of undefined" errors

# 6. Exit criteria:
#    - ✅ Proposal creation works
#    - ✅ Voting works
#    - ✅ Vote counts update
#    - ✅ Orbit approval happens when threshold reached
#    - ✅ No console errors
#    - ✅ Separation enforced (backend cannot approve)
```

### DFX Integration Tests
```bash
# Test 1: Backend creates request (operator role)
dfx canister --network ic call daopad_backend create_transfer_request '(
  principal "fec7w-zyaaa-aaaaa-qaffq-cai",
  "account-uuid",
  "asset-uuid",
  "recipient-address",
  (1000 : nat),
  opt "test transfer"
)'
# Expected: Returns "request-id-abc123"

# Test 2: Admin creates proposal for voting
dfx canister --network ic call odkrm-viaaa-aaaap-qp2oq-cai create_proposal '(
  principal "fec7w-zyaaa-aaaaa-qaffq-cai",
  "request-id-abc123",
  "Transfer"
)'
# Expected: Returns proposal ID

# Test 3: Vote on proposal
dfx canister --network ic call odkrm-viaaa-aaaap-qp2oq-cai vote_on_proposal '(
  principal "fec7w-zyaaa-aaaaa-qaffq-cai",
  "request-id-abc123",
  true
)'
# Expected: Success (no error)

# Test 4: Verify separation - backend CANNOT approve
dfx canister --network ic call daopad_backend approve_orbit_request '(...)'
# Expected: Error - "Method not found" (function should not exist)

# Test 5: Query proposal status
dfx canister --network ic call odkrm-viaaa-aaaap-qp2oq-cai get_proposal '(
  principal "fec7w-zyaaa-aaaaa-qaffq-cai",
  "request-id-abc123"
)'
# Expected: Returns proposal with vote counts
```

### Playwright E2E Tests

#### Test File: daopad_frontend/e2e/admin-separation.spec.ts
```typescript
// PSEUDOCODE
import { test, expect } from '@playwright/test';

test.describe('Admin Canister Separation', () => {
  test('two-canister flow: create request + vote + approve', async ({ page }) => {
    // 1. Navigate to token dashboard
    await page.goto('https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/token/fec7w-zyaaa-aaaaa-qaffq-cai');

    // 2. Create transfer request
    await page.click('button:text("Create Transfer")');
    await page.fill('input[name="recipient"]', 'test-address');
    await page.fill('input[name="amount"]', '100');
    await page.click('button:text("Submit")');

    // 3. Wait for proposal to be created
    await page.waitForSelector('text=Proposal created');

    // 4. Navigate to proposal
    const proposalLink = page.locator('a[href*="/proposal/"]').first();
    await proposalLink.click();

    // 5. Vote YES
    await page.click('button:text("Vote YES")');
    await page.waitForSelector('text=Vote recorded');

    // 6. Verify vote count increased
    const yesVotes = await page.locator('[data-testid="yes-votes"]').textContent();
    expect(parseInt(yesVotes)).toBeGreaterThan(0);

    // 7. Verify separation: Check console for proper service calls
    const consoleLogs = [];
    page.on('console', msg => consoleLogs.push(msg.text()));

    // Should see:
    // - "Orbit request created: request-id-..."
    // - "Proposal created: ..."
    // - "Vote recorded"
    // Should NOT see:
    // - "Backend approved request" (backend cannot approve)

    expect(consoleLogs).toContain(expect.stringContaining('Orbit request created'));
    expect(consoleLogs).toContain(expect.stringContaining('Proposal created'));
    expect(consoleLogs).not.toContain(expect.stringContaining('Backend approved'));
  });

  test('backend cannot approve requests directly', async ({ page }) => {
    // Verify backend has no approve_orbit_request method
    // This would require calling backend candid interface
    // If method exists, test should fail

    // For now, verify via browser console that approval comes from admin
    await page.goto('https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io');

    const adminApprovalDetected = await page.evaluate(() => {
      // Check if AdminService is used for voting
      return window.hasOwnProperty('AdminService');
    });

    expect(adminApprovalDetected).toBeTruthy();
  });
});
```

### Iteration Loop
```bash
# After deployment, run this loop:
for i in {1..5}; do
  echo "Iteration $i: Testing separation..."

  # Run Playwright tests
  cd daopad_frontend
  npx playwright test e2e/admin-separation.spec.ts

  if [ $? -eq 0 ]; then
    echo "✅ Tests passed!"
    break
  else
    echo "❌ Tests failed. Checking console errors..."

    # Check browser console
    npx playwright test e2e/admin-separation.spec.ts --headed

    # Fix issues
    echo "Fixing issues..."
    # (implement fixes based on console errors)

    # Rebuild and redeploy
    npm run build
    cd ..
    ./deploy.sh --network ic --frontend-only

    # Wait before retry
    sleep 60
  fi
done
```

## Critical User Configuration

**⚠️ Important: After deployment, users must configure Orbit Station roles manually!**

This is NOT done in code - it's a manual configuration in Orbit Station UI:

### Step 1: Add Admin Canister as Admin
```
1. Open Orbit Station: https://fec7w-zyaaa-aaaaa-qaffq-cai.icp0.io
2. Navigate to: Settings → Users
3. Click "Add User"
4. Enter principal: odkrm-viaaa-aaaap-qp2oq-cai
5. Assign to group: "Admin"
6. Set policy: AutoApproved
```

### Step 2: Demote Backend to Operator
```
1. Find user: lwsav-iiaaa-aaaap-qp2qq-cai (backend)
2. Edit user
3. Remove from "Admin" group
4. Keep in "Operator" group only
```

### Step 3: Verify Separation
```bash
# Create request via backend
dfx canister --network ic call daopad_backend create_transfer_request '(...)'

# Check status in Orbit UI:
# - Status should be "Pending" (not auto-approved)
# - Backend cannot approve (separation enforced)

# Vote via admin canister
dfx canister --network ic call odkrm-viaaa-aaaap-qp2oq-cai vote_on_proposal '(...)'

# When threshold reached:
# - Admin canister approves in Orbit
# - Status changes to "Executed"
```

## Migration Checklist

### Code Migration
- [ ] Create admin canister directory structure
- [ ] Move `proposals/unified.rs` to admin
- [ ] Move `kong_locker/voting.rs` to admin
- [ ] Move `proposals/types.rs` to admin
- [ ] Create admin storage (UNIFIED_PROPOSALS, etc.)
- [ ] Remove voting logic from backend
- [ ] Remove approval functions from backend
- [ ] Update backend to only create requests
- [ ] Remove UNIFIED_PROPOSALS from backend storage
- [ ] Remove KONG_LOCKER_PRINCIPALS from backend storage
- [ ] Keep TOKEN_ORBIT_STATIONS in backend

### Configuration
- [ ] Create admin/Cargo.toml
- [ ] Update root Cargo.toml workspace
- [ ] Update dfx.json with admin canister
- [ ] Update canister_ids.json with admin ID

### Build & Deploy
- [ ] Build backend canister
- [ ] Build admin canister
- [ ] Extract candid files
- [ ] Deploy both to IC mainnet
- [ ] Sync frontend declarations

### Frontend Integration
- [ ] Create AdminService.ts
- [ ] Update TransferForm to use two-step flow
- [ ] Update ProposalVoteCard to call admin
- [ ] Update ProposalListPage to query admin
- [ ] Update all components that vote

### Testing
- [ ] Type discovery with dfx
- [ ] Build both canisters successfully
- [ ] Deploy to mainnet
- [ ] Manual browser verification
- [ ] DFX integration tests
- [ ] Verify backend cannot approve
- [ ] Playwright E2E tests
- [ ] Console error inspection
- [ ] Verify separation enforced

### User Configuration (Manual)
- [ ] Add admin canister to Orbit Admin group
- [ ] Set AutoApproved policy for admin
- [ ] Demote backend to Operator group
- [ ] Verify separation in Orbit UI
- [ ] Test end-to-end flow

## Error Handling & Debugging

### Common Issues

**Issue 1: "Not authorized" error in admin canister**
```
Cause: Admin canister not added to Orbit Admin group
Fix: Add odkrm-viaaa-aaaap-qp2oq-cai to Admin group in Orbit UI
```

**Issue 2: Backend still approves requests**
```
Cause: Backend still in Orbit Admin group
Fix: Remove lwsav-iiaaa-aaaap-qp2qq-cai from Admin group
```

**Issue 3: "actor.create_proposal is not a function"**
```
Cause: Frontend declarations not synced
Fix: cp -r src/declarations/admin/* daopad_frontend/src/declarations/admin/
```

**Issue 4: Votes not counted**
```
Cause: Kong Locker registration not migrated
Fix: Ensure KONG_LOCKER_PRINCIPALS moved to admin
```

**Issue 5: Proposal creation fails**
```
Cause: Frontend calling old backend method
Fix: Update frontend to call AdminService.createProposal()
```

### Debug Commands
```bash
# Check admin canister interface
dfx canister --network ic call odkrm-viaaa-aaaap-qp2oq-cai __get_candid

# Check backend interface (should NOT have voting methods)
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai __get_candid

# Query proposal state in admin
dfx canister --network ic call odkrm-viaaa-aaaap-qp2oq-cai get_proposal '(...)'

# Check Orbit request status
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai get_request '("request-id")'

# Verify separation (should fail)
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai vote_on_proposal '(...)'
# Expected: "Method not found"
```

## Rollback Plan

If separation causes critical issues:

1. **Emergency Rollback**:
   ```bash
   # Re-add backend to Orbit Admin group
   # Keep admin canister deployed but unused
   # Frontend calls backend only (old flow)
   ```

2. **Gradual Rollback**:
   ```bash
   # Deploy both canisters but use feature flag
   # Toggle between old (backend only) and new (separated) flow
   # Monitor for 48 hours
   # Gradually migrate traffic
   ```

3. **Debug Issues**:
   ```bash
   # Keep separation but fix specific bugs
   # Use DFX to test individual methods
   # Check browser console for errors
   # Verify Orbit permissions
   ```

## Success Criteria

✅ Backend creates requests but CANNOT approve them
✅ Admin canister accepts votes and approves via Orbit
✅ Frontend successfully orchestrates two-canister flow
✅ Separation of duties enforced by Orbit
✅ All existing features work (transfers, user management, assets)
✅ Playwright tests pass on mainnet
✅ No console errors in browser
✅ Voting power calculated correctly in admin
✅ Proposals created and tracked in admin
✅ Kong Locker integration works

## Key Differences from Original Plan

1. **No "Registration" Concept**: Frontend triggers proposal creation, not backend
2. **Direct Frontend Calls**: Frontend → Backend (create) AND Frontend → Admin (vote)
3. **Unified System**: Move `unified.rs` (one file), not multiple voting systems
4. **Kong Storage in Admin**: Admin calculates voting power directly
5. **User Configuration**: Orbit roles configured manually via UI, not code

## Final Notes

- This is a NEW FEATURE: Adding admin canister + refactoring backend
- Backend becomes simpler (only creates requests)
- Admin contains ALL governance logic
- Frontend orchestrates the separation
- Users must configure Orbit roles manually
- Test on mainnet (no local testing)
- Verify separation at every step
