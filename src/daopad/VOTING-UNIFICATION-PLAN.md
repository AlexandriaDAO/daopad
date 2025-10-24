# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-admin-separation/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-admin-separation/src/daopad`
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
   git commit -m "[Refactor]: Unify all Orbit voting systems into single clean architecture"
   git push -u origin feature/admin-canister-separation
   gh pr create --title "[Refactor]: Unify Voting Systems for Clean Architecture" --body "Implements VOTING-UNIFICATION-PLAN.md"
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
**Worktree:** `/home/theseus/alexandria/daopad-admin-separation/src/daopad`

---

# Implementation Plan

## Current Architecture (Messy)

We have **THREE separate voting systems** that all do the same thing:

1. **treasury.rs**:
   - `create_treasury_transfer_proposal()` - Creates Orbit request AND proposal
   - `vote_on_treasury_proposal()` - Voting logic
   - TREASURY_PROPOSALS storage
   - Own approve/reject functions

2. **orbit_requests.rs**:
   - `vote_on_orbit_request()` - Different voting logic
   - `ensure_proposal_for_request()` - Creates proposal AFTER request
   - ORBIT_REQUEST_PROPOSALS storage
   - Duplicate approve/reject functions

3. **orbit_link.rs**:
   - Special case for linking stations (keep separate)
   - One-time bootstrap operation

**Problems**:
- Duplicate `submit_orbit_request_decision` in both treasury.rs and orbit_requests.rs
- Two voting endpoints confuse frontend
- Two storages mean complex state management
- Future admin separation would need to move TWO systems

## New Unified Architecture

### Single Voting System
```
create_orbit_request_with_proposal()
    ↓
Creates Orbit Request
    ↓
Auto-creates Proposal
    ↓
vote_on_proposal() [SINGLE METHOD]
    ↓
Threshold reached?
    ↓
approve_orbit_request() [SINGLE IMPL]
```

### File Structure After Unification
```
proposals/
├── mod.rs              # Clean exports
├── unified.rs          # NEW: All voting logic
├── types.rs           # Unified types
├── orbit_link.rs      # Keep separate (bootstrap only)
└── storage/           # Consolidated storage
```

## Implementation Steps

### Step 1: Create Unified Proposal Type
```rust
// PSEUDOCODE - proposals/types.rs
// REPLACE TreasuryProposal and OrbitRequestProposal with:

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct UnifiedProposal {
    pub id: ProposalId,
    pub token_canister_id: Principal,
    pub orbit_request_id: String,
    pub operation_type: OrbitOperationType, // Replaces both ProposalType and OrbitRequestType
    pub proposer: Principal,
    pub created_at: u64,
    pub expires_at: u64,
    pub yes_votes: u64,
    pub no_votes: u64,
    pub total_voting_power: u64,
    pub voter_count: u32,
    pub status: ProposalStatus,
    // Optional fields for specific operations
    pub transfer_details: Option<TransferDetails>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum OrbitOperationType {
    // Treasury
    Transfer,

    // Account Management
    AddAccount,
    EditAccount,

    // User Management
    AddUser,
    EditUser,
    RemoveUser,

    // All 33 Orbit operations...
    // (copy from existing OrbitRequestType enum)
}
```

### Step 2: Create Unified Voting Module
```rust
// PSEUDOCODE - proposals/unified.rs
// REPLACES both treasury.rs and orbit_requests.rs

use super::types::*;
use crate::storage::state::UNIFIED_PROPOSALS;

/// Single voting endpoint for ALL Orbit operations
#[update]
pub async fn vote_on_proposal(
    token_id: Principal,
    orbit_request_id: String,
    vote: bool,
) -> Result<(), ProposalError> {
    let voter = ic_cdk::caller();

    // 1. Check auth
    if voter == Principal::anonymous() {
        return Err(ProposalError::AuthRequired);
    }

    // 2. Get proposal
    let mut proposal = UNIFIED_PROPOSALS.with(|proposals| {
        proposals.borrow()
            .get(&(StorablePrincipal(token_id), orbit_request_id.clone()))
            .cloned()
            .ok_or(ProposalError::NotFound)
    })?;

    // 3. Check status, expiry, double-vote
    // (same logic as before)

    // 4. Get voting power
    let voting_power = get_user_voting_power_for_token(voter, token_id).await?;

    // 5. Record vote
    if vote {
        proposal.yes_votes += voting_power;
    } else {
        proposal.no_votes += voting_power;
    }

    // 6. Check threshold (varies by operation type)
    let threshold = proposal.operation_type.voting_threshold();
    let required_votes = (total_vp * threshold as u64) / 100;

    if proposal.yes_votes > required_votes {
        // Single approval function
        approve_orbit_request(station_id, &proposal.orbit_request_id).await?;
        proposal.status = ProposalStatus::Executed;
    }

    // 7. Save updated proposal
    UNIFIED_PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(key, proposal);
    });

    Ok(())
}

/// Single approval function (no duplication)
async fn approve_orbit_request(station_id: Principal, request_id: &str) -> Result<(), ProposalError> {
    // ONE implementation of submit_request_approval
    let input = SubmitRequestApprovalInput {
        request_id: request_id.to_string(),
        decision: RequestApprovalStatus::Approved,
        reason: Some("Community vote passed".to_string()),
    };

    ic_cdk::call(station_id, "submit_request_approval", (input,)).await
}

/// Create any Orbit request with auto-proposal
#[update]
pub async fn create_orbit_request_with_proposal(
    token_id: Principal,
    operation: OrbitOperation, // Enum of all possible operations
) -> Result<String, ProposalError> {
    // 1. Validate caller has minimum VP
    let caller = ic_cdk::caller();
    let voting_power = get_user_voting_power_for_token(caller, token_id).await?;

    if voting_power < MINIMUM_VP_FOR_PROPOSAL {
        return Err(ProposalError::InsufficientVotingPower);
    }

    // 2. Get station
    let station_id = get_station_for_token(token_id)?;

    // 3. Create appropriate Orbit request based on operation type
    let orbit_request_id = match operation {
        OrbitOperation::Transfer(details) => {
            create_transfer_request_in_orbit(station_id, details).await?
        },
        OrbitOperation::EditUser(user_id, groups) => {
            create_edit_user_request_in_orbit(station_id, user_id, groups).await?
        },
        OrbitOperation::AddAsset(asset) => {
            create_add_asset_request_in_orbit(station_id, asset).await?
        },
        // ... handle all operation types
    };

    // 4. Create unified proposal
    let proposal = UnifiedProposal {
        id: ProposalId::new(),
        token_canister_id: token_id,
        orbit_request_id: orbit_request_id.clone(),
        operation_type: operation.to_type(),
        proposer: caller,
        created_at: time(),
        expires_at: time() + VOTING_PERIOD,
        yes_votes: 0,
        no_votes: 0,
        total_voting_power: get_total_voting_power(token_id).await?,
        voter_count: 0,
        status: ProposalStatus::Active,
        transfer_details: operation.transfer_details(), // If applicable
    };

    // 5. Store proposal
    UNIFIED_PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(
            (StorablePrincipal(token_id), orbit_request_id.clone()),
            proposal
        );
    });

    Ok(orbit_request_id)
}
```

### Step 3: Update Storage
```rust
// PSEUDOCODE - storage/state.rs
// REPLACE both TREASURY_PROPOSALS and ORBIT_REQUEST_PROPOSALS with:

thread_local! {
    // Single unified proposal storage
    pub static UNIFIED_PROPOSALS: RefCell<BTreeMap<(StorablePrincipal, String), UnifiedProposal>> = RefCell::new(BTreeMap::new());

    // Single vote tracking
    pub static PROPOSAL_VOTES: RefCell<BTreeMap<(ProposalId, StorablePrincipal), VoteChoice>> = RefCell::new(BTreeMap::new());

    // Keep orbit_link separate (bootstrap operation)
    pub static ORBIT_PROPOSALS: RefCell<BTreeMap<StorablePrincipal, OrbitLinkProposal>> = RefCell::new(BTreeMap::new());
}
```

### Step 4: Update API Layer
```rust
// PSEUDOCODE - api/orbit_transfers.rs
// REMOVE create_treasury_transfer_proposal, REPLACE with:

#[update]
pub async fn create_transfer_request(
    token_id: Principal,
    from_account_id: String,
    from_asset_id: String,
    to: String,
    amount: Nat,
) -> Result<String, String> {
    let operation = OrbitOperation::Transfer(TransferDetails {
        from_account_id,
        from_asset_id,
        to,
        amount,
        // ...
    });

    create_orbit_request_with_proposal(token_id, operation).await
        .map_err(|e| format!("{:?}", e))
}
```

```rust
// PSEUDOCODE - api/orbit_users.rs
// UPDATE create_remove_admin_request:

#[update]
pub async fn create_remove_admin_request(
    token_id: Principal,
    user_id: String,
    user_name: String,
) -> Result<String, String> {
    let operation = OrbitOperation::EditUser {
        user_id,
        groups: vec![OPERATOR_GROUP_ID.to_string()],
        name: Some(user_name),
    };

    create_orbit_request_with_proposal(token_id, operation).await
        .map_err(|e| format!("{:?}", e))
}
```

### Step 5: Update Frontend Exports
```rust
// PSEUDOCODE - lib.rs
// CLEAN exports - only ONE voting function

pub use proposals::unified::{
    vote_on_proposal,           // Single voting endpoint
    create_orbit_request_with_proposal, // Single creation endpoint
    get_proposal,               // Single query
    list_active_proposals,      // Single list
};

// Remove old exports:
// - vote_on_treasury_proposal
// - vote_on_orbit_request
// - create_treasury_transfer_proposal
// - ensure_proposal_for_request
```

### Step 6: Migration of Existing Code

**Files to DELETE**:
- `proposals/treasury.rs` - Merged into unified.rs
- `proposals/orbit_requests.rs` - Merged into unified.rs

**Files to UPDATE**:
- `api/orbit_transfers.rs` - Use unified creation
- `api/orbit_users.rs` - Use unified creation
- `api/orbit_assets.rs` - Use unified creation
- `api/orbit_permissions.rs` - Use unified creation
- `api/governance_config.rs` - Remove duplicate threshold logic

**Files to KEEP**:
- `proposals/orbit_link.rs` - Special bootstrap case

## Testing Requirements

### 1. Test Unified Voting
```bash
# Create transfer request
dfx canister --network ic call daopad_backend create_transfer_request '(...)'

# Vote using SINGLE endpoint
dfx canister --network ic call daopad_backend vote_on_proposal '(
  principal "token-id",
  "orbit-request-id",
  true
)'

# Verify works for all operation types
```

### 2. Test Migration
```bash
# Ensure old endpoints removed
dfx canister --network ic call daopad_backend vote_on_treasury_proposal # Should fail
dfx canister --network ic call daopad_backend vote_on_orbit_request # Should fail

# New endpoint handles both
dfx canister --network ic call daopad_backend vote_on_proposal # Should work
```

### 3. Frontend Testing
```javascript
// PSEUDOCODE - Frontend should use single service
const proposal = await daopadService.create_orbit_request_with_proposal(
    tokenId,
    { Transfer: transferDetails }
);

const vote = await daopadService.vote_on_proposal(
    tokenId,
    proposalId,
    true
);
```

## Benefits of Unification

1. **Clean Architecture**:
   - ONE voting system instead of three
   - ONE approval path instead of duplicates
   - ONE storage system

2. **Easier Admin Separation**:
   - Future admin canister only needs ONE voting system
   - Clear separation: backend creates, admin approves
   - No duplicate logic to maintain

3. **Better Frontend UX**:
   - Single `vote_on_proposal()` method
   - Single `create_orbit_request_with_proposal()` method
   - Consistent behavior across all operations

4. **Maintainability**:
   - No duplicate code
   - Single source of truth for voting logic
   - Easier to add new Orbit operations

## Migration Checklist

- [ ] Create unified proposal type
- [ ] Create unified voting module
- [ ] Merge treasury.rs logic into unified.rs
- [ ] Merge orbit_requests.rs logic into unified.rs
- [ ] Update all API endpoints to use unified system
- [ ] Update storage to single proposal map
- [ ] Remove duplicate approve/reject functions
- [ ] Update frontend declarations
- [ ] Test all operation types
- [ ] Delete old modules
- [ ] Update lib.rs exports

## Rollback Plan

If issues arise:
1. Keep old modules but mark deprecated
2. Add forwarding functions temporarily
3. Gradually migrate frontend calls
4. Remove old modules in next release

## Next Steps After This PR

Once voting is unified, the admin canister separation becomes trivial:
1. Move `unified.rs` to admin canister
2. Backend forwards votes to admin
3. Clean separation achieved

---

**This refactoring is essential BEFORE separating into admin/operator canisters.**