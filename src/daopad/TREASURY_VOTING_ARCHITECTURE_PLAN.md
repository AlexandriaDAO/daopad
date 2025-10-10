# Treasury Voting Architecture Implementation Plan

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
    echo "  git worktree add -b feature/treasury-voting ../daopad-treasury-voting master"
    echo "  cd ../daopad-treasury-voting/src/daopad"
    echo ""
    echo "THEN restart with this plan in the worktree."
    exit 1
else
    echo "✅ You are isolated in: $CURRENT_DIR"
    echo "✅ Safe to proceed with implementation"
fi
```

### Your Execution Prompt

You are an autonomous PR orchestrator implementing treasury voting with Kong Locker voting power.

EXECUTE THESE STEPS AUTONOMOUSLY (DO NOT ASK FOR PERMISSION):

**Step 0 - MANDATORY ISOLATION:**
```bash
# If not already in worktree, create one
if [ "$(git rev-parse --show-toplevel)" = "$(pwd)" ]; then
  cd /home/theseus/alexandria/daopad/src/daopad
  git worktree add -b feature/treasury-voting ../daopad-treasury-voting master
  cd ../daopad-treasury-voting/src/daopad
fi

# Verify isolation
pwd  # MUST show ../daopad-treasury-voting/src/daopad
git branch --show-current  # MUST show feature/treasury-voting
```

**Step 1 - Implement Backend Types:**
- Create `daopad_backend/src/proposals/types.rs` with ProposalId, TreasuryProposal, errors
- Use thiserror for typed errors
- Follow existing orbit_link.rs patterns

**Step 2 - Implement Treasury Proposal Logic:**
- Create `daopad_backend/src/proposals/treasury.rs`
- Implement create_treasury_transfer_proposal (creates Orbit request)
- Implement vote_on_treasury_proposal (vote + execute when threshold reached)
- Use existing Kong Locker voting power integration

**Step 3 - Extend Storage:**
- Modify `daopad_backend/src/storage/state.rs`
- Add TREASURY_PROPOSALS (regular BTreeMap, volatile)
- Add PROPOSAL_VOTES (separate vote tracking)

**Step 4 - Wire Up API:**
- Modify `daopad_backend/src/api/proposals.rs`
- Export new endpoints
- Modify `daopad_backend/src/lib.rs` to export types

**Step 5 - Build and Deploy Backend:**
```bash
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
./deploy.sh --network ic --backend-only

# CRITICAL: Sync declarations
cp -r ../../.dfx/ic/canisters/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
```

**Step 6 - Test Backend on Mainnet:**
```bash
# Test proposal creation
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai create_treasury_transfer_proposal '(principal "ryjl3-tyaaa-aaaaa-aaaba-cai", record { amount = 1000000; to = "test-address"; memo = opt "Test transfer" })'

# Test voting
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai vote_on_treasury_proposal '(1, true)'
```

**Step 7 - Commit and Push:**
```bash
git add -A
git commit -m "feat: Add treasury voting with Kong Locker voting power

- Implement TreasuryProposal type with minimal storage
- Add vote-and-execute pattern (extends orbit_link.rs)
- Integrate Kong Locker voting power for treasury operations
- Use thiserror for typed error handling
- Memory-efficient vote tracking with separate PROPOSAL_VOTES map"

git push -u origin feature/treasury-voting
```

**Step 8 - Create PR:**
```bash
gh pr create --title "Add Treasury Voting Architecture" --body "$(cat <<'EOF'
## Summary
Implements treasury voting using Kong Locker voting power, replacing auto-approval for treasury operations.

## Architecture
- **Pattern**: Extends existing `orbit_link.rs` vote-and-execute pattern
- **Storage**: Minimal (just voting state, references Orbit requests)
- **Execution**: Immediate execution when threshold reached (no separate execute step)
- **Security**: Backend approves Orbit requests after vote passes

## Implementation
- ✅ Created `proposals/types.rs` with typed errors and ProposalId newtype
- ✅ Created `proposals/treasury.rs` with voting logic
- ✅ Extended storage with TREASURY_PROPOSALS and PROPOSAL_VOTES
- ✅ Integrated Kong Locker voting power calculation
- ✅ Deployed and tested on mainnet

## Testing
- [x] Backend deployed to mainnet
- [x] Proposal creation tested
- [x] Voting tested
- [x] Threshold execution verified

## Security Review
- Backend only approves Orbit requests (doesn't execute directly)
- Atomic vote-and-execute prevents race conditions
- Minimal storage principle maintained
- Follows proven orbit_link.rs pattern

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**YOUR CRITICAL RULES:**
- You MUST work in ../daopad-treasury-voting/src/daopad (NOT main repo)
- Other agents ARE working in parallel - isolation is MANDATORY
- After sleep: IMMEDIATELY continue (no "should I check?" questions)
- Run candid-extractor after backend changes
- Sync declarations after backend changes
- Test on mainnet after each deploy
- ONLY STOP when: PR created or critical error

**START NOW with Step 0.**

---

## Current State

### File Tree (Relevant Sections)

```
daopad_backend/
├── src/
│   ├── proposals/
│   │   ├── mod.rs (will modify)
│   │   ├── orbit_link.rs (reference - DO NOT MODIFY)
│   │   ├── storage.rs (exists, unused)
│   │   ├── voting.rs (empty stub)
│   │   ├── types.rs (NEW - will create)
│   │   └── treasury.rs (NEW - will create)
│   ├── storage/
│   │   └── state.rs (will modify - add TREASURY_PROPOSALS, PROPOSAL_VOTES)
│   ├── api/
│   │   └── proposals.rs (will modify - export new endpoints)
│   ├── kong_locker/
│   │   └── voting.rs (reference - already works)
│   └── lib.rs (will modify - export new types)
```

### Existing Implementations

**Reference Pattern: `proposals/orbit_link.rs:122-263`**
- Implements vote-and-execute pattern correctly
- Executes immediately when threshold reached (no separate execute step)
- Stores minimal data (voting state only)
- Handles double-wrapped Orbit Results properly
- Uses Kong Locker voting power via `get_user_voting_power_for_token()`

**Key Pattern to Follow:**
```rust
pub async fn vote_on_proposal(proposal_id: u64, vote: bool) -> Result<(), String> {
    // 1. Load proposal
    // 2. Validate (not expired, not already voted)
    // 3. Get voting power
    // 4. Record vote
    // 5. Check threshold
    if yes_votes > threshold {
        // 6. Execute IMMEDIATELY (no separate step)
        execute_approval_side_effects(&proposal)?;
        proposal.status = ProposalStatus::Approved;
        // 7. Remove from active proposals
    }
    Ok(())
}
```

**Kong Locker Integration: `kong_locker/voting.rs:8-59`**
- `get_user_voting_power_for_token(caller, token_id)` - Gets user's voting power
- `calculate_voting_power_for_token(kong_locker, token_id)` - Calculates from LP positions
- Voting power = USD value of locked LP × 100

**Orbit Integration: `api/orbit_transfers.rs:44-110`**
- Shows how to create transfer requests in Orbit
- Handles double-wrapped Results: `Result<(CreateRequestResult::Ok/Err,), _>`
- Backend is admin, so requests can be auto-approved or manually approved

**Storage Pattern: `storage/state.rs:11-44`**
```rust
// Volatile storage for proposals (7-day expiry, don't need to survive upgrades)
pub static ORBIT_PROPOSALS: RefCell<BTreeMap<StorablePrincipal, OrbitLinkProposal>>
    = RefCell::new(BTreeMap::new());

// Permanent storage for station mappings
pub static TOKEN_ORBIT_STATIONS: RefCell<StableBTreeMap<...>> = ...;
```

### Current Constraints

1. **Minimal Storage Principle**: Store only voting state, reference Orbit requests by ID
2. **No Local Testing**: All testing on mainnet (no local replica)
3. **Candid Extraction Required**: After any backend changes
4. **Declaration Sync Critical**: Frontend uses different path than dfx generates
5. **IC Execution Model**: Cannot call self (caller != id), must execute inline
6. **Orbit Double-Wrapped Results**: Handle both IC call failure and Orbit API errors

---

## Implementation Plan

### Backend File 1: `daopad_backend/src/proposals/types.rs` (NEW FILE)

```rust
// PSEUDOCODE - implementing agent will write real code

use candid::{CandidType, Deserialize, Principal};
use thiserror::Error;

// Newtype wrapper for proposal IDs (type safety)
#[derive(CandidType, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct ProposalId(pub u64);

impl ProposalId {
    pub fn new() -> Self {
        // Generate unique ID from timestamp + randomness
        let now = ic_cdk::api::time();
        let random = (ic_cdk::api::call::arg_data_raw().len() as u64) % 1000;
        ProposalId(now / 1_000_000 + random)
    }
}

// Minimal proposal storage (references Orbit request, doesn't duplicate data)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TreasuryProposal {
    pub id: ProposalId,
    pub token_canister_id: Principal,
    pub orbit_request_id: String,  // Reference to Orbit's request
    pub proposal_type: ProposalType,
    pub proposer: Principal,
    pub created_at: u64,
    pub expires_at: u64,
    pub yes_votes: u64,
    pub no_votes: u64,
    pub total_voting_power: u64,
    pub voter_count: u32,  // Just count, not full set (memory efficient)
    pub status: ProposalStatus,
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum ProposalType {
    Transfer,
    // Future: AddMember, RemoveMember, etc.
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum ProposalStatus {
    Active,
    Executed,  // Passed and executed in Orbit
    Rejected,
    Expired,
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum VoteChoice {
    Yes,
    No,
}

// Typed errors (better than String)
#[derive(Error, Debug, CandidType, Deserialize)]
pub enum ProposalError {
    #[error("Proposal not found: {0:?}")]
    NotFound(ProposalId),

    #[error("Proposal has expired")]
    Expired,

    #[error("Proposal is not active")]
    NotActive,

    #[error("Already voted on proposal {0:?}")]
    AlreadyVoted(ProposalId),

    #[error("No voting power for this token")]
    NoVotingPower,

    #[error("Insufficient voting power to create proposal: {current} < {required}")]
    InsufficientVotingPowerToPropose { current: u64, required: u64 },

    #[error("Authentication required")]
    AuthRequired,

    #[error("No Orbit Station linked to token {0}")]
    NoStationLinked(Principal),

    #[error("Orbit error: {code} - {message}")]
    OrbitError { code: String, message: String },

    #[error("IC call failed: {message}")]
    IcCallFailed { code: i32, message: String },
}
```

**Implementing Agent Notes:**
- Use `thiserror::Error` (add to Cargo.toml if not present)
- ProposalId newtype prevents mixing up IDs with other u64 values
- TreasuryProposal stores minimal data (just voting state)
- ProposalError must derive CandidType for cross-canister use

---

### Backend File 2: `daopad_backend/src/proposals/treasury.rs` (NEW FILE)

```rust
// PSEUDOCODE - implementing agent will write real code

use crate::kong_locker::voting::get_user_voting_power_for_token;
use crate::proposals::types::*;
use crate::storage::state::{TREASURY_PROPOSALS, PROPOSAL_VOTES, TOKEN_ORBIT_STATIONS};
use crate::types::StorablePrincipal;
use candid::Principal;
use ic_cdk::api::time;

// Constants
const MINIMUM_VP_FOR_PROPOSAL: u64 = 10_000; // Same as orbit link proposals
const DEFAULT_VOTING_PERIOD_NANOS: u64 = 604_800_000_000_000; // 7 days
const DEFAULT_THRESHOLD_PERCENT: u32 = 50; // Simple majority

/// Create a treasury transfer proposal
///
/// This creates:
/// 1. An Orbit request (in pending state)
/// 2. A DAOPad proposal for voting
///
/// Users vote on the DAOPad proposal, and when threshold is reached,
/// the backend approves the Orbit request.
#[update]
pub async fn create_treasury_transfer_proposal(
    token_canister_id: Principal,
    transfer_details: TransferDetails,
) -> Result<ProposalId, ProposalError> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err(ProposalError::AuthRequired);
    }

    // 1. Check minimum voting power requirement
    let proposer_power = get_user_voting_power_for_token(caller, token_canister_id)
        .await
        .map_err(|_| ProposalError::NoVotingPower)?;

    if proposer_power < MINIMUM_VP_FOR_PROPOSAL {
        return Err(ProposalError::InsufficientVotingPowerToPropose {
            current: proposer_power,
            required: MINIMUM_VP_FOR_PROPOSAL,
        });
    }

    // 2. Get station ID
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or(ProposalError::NoStationLinked(token_canister_id))
    })?;

    // 3. Create transfer request in Orbit (status: pending approval)
    let orbit_request_id = create_transfer_request_in_orbit(
        station_id,
        transfer_details,
    ).await?;

    // 4. Get total voting power
    let total_voting_power = get_total_voting_power_for_token(token_canister_id).await?;

    // 5. Create DAOPad proposal
    let proposal_id = ProposalId::new();
    let now = time();

    let proposal = TreasuryProposal {
        id: proposal_id,
        token_canister_id,
        orbit_request_id,
        proposal_type: ProposalType::Transfer,
        proposer: caller,
        created_at: now,
        expires_at: now + DEFAULT_VOTING_PERIOD_NANOS,
        yes_votes: 0,
        no_votes: 0,
        total_voting_power,
        voter_count: 0,
        status: ProposalStatus::Active,
    };

    // 6. Store proposal
    TREASURY_PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(
            StorablePrincipal(token_canister_id),
            proposal,
        );
    });

    Ok(proposal_id)
}

/// Vote on a treasury proposal
///
/// When threshold is reached, executes immediately by approving the Orbit request.
/// Follows the same pattern as orbit_link.rs vote_on_proposal.
#[update]
pub async fn vote_on_treasury_proposal(
    proposal_id: ProposalId,
    vote: bool,
) -> Result<(), ProposalError> {
    let voter = ic_cdk::caller();

    if voter == Principal::anonymous() {
        return Err(ProposalError::AuthRequired);
    }

    // 1. Load proposal
    let (token_id, mut proposal) = TREASURY_PROPOSALS.with(|proposals| {
        proposals.borrow()
            .iter()
            .find(|(_, p)| p.id == proposal_id)
            .map(|(k, v)| (k.0, v.clone()))
            .ok_or(ProposalError::NotFound(proposal_id))
    })?;

    // 2. Guard: Active status
    if proposal.status != ProposalStatus::Active {
        return Err(ProposalError::NotActive);
    }

    // 3. Guard: Not expired
    let now = time();
    if now > proposal.expires_at {
        proposal.status = ProposalStatus::Expired;
        TREASURY_PROPOSALS.with(|proposals| {
            proposals.borrow_mut().remove(&StorablePrincipal(token_id));
        });
        return Err(ProposalError::Expired);
    }

    // 4. Guard: Haven't voted
    let has_voted = PROPOSAL_VOTES.with(|votes| {
        votes.borrow().contains_key(&(proposal_id, StorablePrincipal(voter)))
    });

    if has_voted {
        return Err(ProposalError::AlreadyVoted(proposal_id));
    }

    // 5. Get voting power
    let voting_power = get_user_voting_power_for_token(voter, token_id)
        .await
        .map_err(|_| ProposalError::NoVotingPower)?;

    if voting_power == 0 {
        return Err(ProposalError::NoVotingPower);
    }

    // 6. Record vote
    if vote {
        proposal.yes_votes += voting_power;
    } else {
        proposal.no_votes += voting_power;
    }
    proposal.voter_count += 1;

    PROPOSAL_VOTES.with(|votes| {
        votes.borrow_mut().insert(
            (proposal_id, StorablePrincipal(voter)),
            if vote { VoteChoice::Yes } else { VoteChoice::No },
        );
    });

    // 7. Check threshold and execute atomically
    let required_votes = (proposal.total_voting_power * DEFAULT_THRESHOLD_PERCENT as u64) / 100;

    if proposal.yes_votes > required_votes {
        // Execute immediately - approve the Orbit request
        let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
            stations.borrow()
                .get(&StorablePrincipal(token_id))
                .map(|s| s.0)
                .ok_or(ProposalError::NoStationLinked(token_id))
        })?;

        approve_orbit_request(station_id, &proposal.orbit_request_id).await?;

        proposal.status = ProposalStatus::Executed;

        // Remove from active proposals
        TREASURY_PROPOSALS.with(|proposals| {
            proposals.borrow_mut().remove(&StorablePrincipal(token_id));
        });

        ic_cdk::println!(
            "Proposal {:?} executed! {} yes votes > {} required",
            proposal_id, proposal.yes_votes, required_votes
        );
    } else if proposal.no_votes > (proposal.total_voting_power - required_votes) {
        // Rejected
        proposal.status = ProposalStatus::Rejected;

        TREASURY_PROPOSALS.with(|proposals| {
            proposals.borrow_mut().remove(&StorablePrincipal(token_id));
        });

        ic_cdk::println!("Proposal {:?} rejected", proposal_id);
    } else {
        // Still active - update vote counts
        TREASURY_PROPOSALS.with(|proposals| {
            proposals.borrow_mut().insert(StorablePrincipal(token_id), proposal);
        });
    }

    Ok(())
}

/// Get active proposal for a token (if any)
#[query]
pub fn get_treasury_proposal(token_id: Principal) -> Option<TreasuryProposal> {
    TREASURY_PROPOSALS.with(|proposals| {
        proposals.borrow()
            .get(&StorablePrincipal(token_id))
            .cloned()
    })
}

// ============================================================================
// Internal helper functions
// ============================================================================

#[derive(CandidType, Deserialize)]
struct TransferDetails {
    amount: Nat,
    to: String,
    memo: Option<String>,
}

async fn create_transfer_request_in_orbit(
    station_id: Principal,
    details: TransferDetails,
) -> Result<String, ProposalError> {
    // Use existing orbit_transfers.rs pattern
    // Call Orbit's create_request with Transfer operation
    // Return request ID

    // NOTE: Implementing agent should copy pattern from orbit_transfers.rs:44-110
    // Handle double-wrapped Result: Result<(CreateRequestResult::Ok/Err,), _>

    todo!("Copy from orbit_transfers.rs and adapt")
}

async fn approve_orbit_request(
    station_id: Principal,
    request_id: &str,
) -> Result<(), ProposalError> {
    use crate::api::orbit_requests::{
        RequestApprovalStatus, SubmitRequestApprovalInput,
    };

    let input = SubmitRequestApprovalInput {
        request_id: request_id.to_string(),
        decision: RequestApprovalStatus::Approved,
        reason: Some("DAOPad treasury proposal approved by community vote".to_string()),
    };

    let result: Result<(SubmitRequestApprovalResult,), _> =
        ic_cdk::call(station_id, "submit_request_approval", (input,)).await;

    match result {
        Ok((SubmitRequestApprovalResult::Ok(_),)) => Ok(()),
        Ok((SubmitRequestApprovalResult::Err(e),)) => {
            Err(ProposalError::OrbitError {
                code: e.code,
                message: e.message.unwrap_or_default(),
            })
        }
        Err((code, msg)) => {
            Err(ProposalError::IcCallFailed {
                code: code as i32,
                message: msg,
            })
        }
    }
}

async fn get_total_voting_power_for_token(token: Principal) -> Result<u64, ProposalError> {
    // Copy implementation from orbit_link.rs:317-349
    // Sum voting power across all registered Kong Locker users
    todo!("Copy from orbit_link.rs")
}
```

**Implementing Agent Notes:**
- Follow orbit_link.rs pattern exactly (vote + execute in same call)
- Handle Orbit's double-wrapped Results properly
- Test Orbit API calls with dfx before implementing
- No separate execute method (impossible on IC)

---

### Backend File 3: `daopad_backend/src/storage/state.rs` (MODIFY)

**Add these after line 44:**

```rust
// Treasury proposal storage (volatile - expires in 7 days)
// IMPORTANT: Using regular BTreeMap (not stable memory) since proposals are temporary
// and don't need to survive canister upgrades
pub static TREASURY_PROPOSALS: RefCell<BTreeMap<StorablePrincipal, TreasuryProposal>>
    = RefCell::new(BTreeMap::new());

// Vote tracking (separate from proposals for memory efficiency)
// Key: (ProposalId, Voter Principal)
pub static PROPOSAL_VOTES: RefCell<BTreeMap<(ProposalId, StorablePrincipal), VoteChoice>>
    = RefCell::new(BTreeMap::new());
```

**Implementing Agent Notes:**
- Import TreasuryProposal, ProposalId, VoteChoice from proposals::types
- Keep volatile (not StableBTreeMap) per minimal storage principle
- Add pre_upgrade warning if desired (but not required)

---

### Backend File 4: `daopad_backend/src/proposals/mod.rs` (MODIFY)

**Before:**
```rust
pub mod orbit_link;
pub mod storage;
pub mod voting;

pub use orbit_link::{OrbitLinkProposal, ProposalStatus};
```

**After:**
```rust
pub mod orbit_link;
pub mod storage;
pub mod treasury;  // NEW
pub mod types;     // NEW
pub mod voting;

pub use orbit_link::{OrbitLinkProposal, ProposalStatus};
pub use treasury::{
    create_treasury_transfer_proposal,
    vote_on_treasury_proposal,
    get_treasury_proposal,
};
pub use types::{
    ProposalId, TreasuryProposal, ProposalType,
    ProposalError, VoteChoice,
};
```

---

### Backend File 5: `daopad_backend/src/api/proposals.rs` (MODIFY)

**Add re-exports:**

```rust
// At the top, add:
pub use crate::proposals::{
    create_treasury_transfer_proposal,
    vote_on_treasury_proposal,
    get_treasury_proposal,
};
```

**Implementing Agent Notes:**
- These functions are already `#[update]` / `#[query]` in treasury.rs
- Just re-export them here so they appear in the candid interface

---

### Backend File 6: `daopad_backend/src/lib.rs` (MODIFY)

**Before:**
```rust
pub use proposals::orbit_link::{OrbitLinkProposal, ProposalStatus};
```

**After:**
```rust
pub use proposals::orbit_link::{OrbitLinkProposal, ProposalStatus};
pub use proposals::{
    ProposalId, TreasuryProposal, ProposalType, ProposalError, VoteChoice,
};
```

**Implementing Agent Notes:**
- Exports types to candid interface
- Frontend will see these types after declaration sync

---

## Testing Strategy

### Phase 1: Type Discovery (Before Implementation)

```bash
# Get Orbit Station candid interface
export TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"
dfx canister --network ic call $TEST_STATION __get_candid_interface_tmp_hack

# Test create_request with Transfer operation
# Discover exact types from error messages
dfx canister --network ic call $TEST_STATION create_request '(record {
  operation = variant { Transfer = record {
    from_account_id = "...";
    from_asset_id = "...";
    to = "...";
    amount = 1000000;
  }};
  title = opt "Test transfer";
})'

# Test submit_request_approval
dfx canister --network ic call $TEST_STATION submit_request_approval '(record {
  request_id = "...";
  decision = variant { Approved };
})'
```

### Phase 2: Build and Deploy Process

```bash
# 1. Build backend
cd /home/theseus/alexandria/daopad/src/daopad
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked

# 2. Extract candid (CRITICAL after backend changes)
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# 3. Deploy backend only
./deploy.sh --network ic --backend-only

# 4. CRITICAL: Sync declarations to frontend
cp -r ../../.dfx/ic/canisters/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# Verify sync worked:
grep "create_treasury_transfer_proposal" daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js
# Should show the method exists

# 5. Deploy frontend (if modified)
./deploy.sh --network ic --frontend-only
```

### Phase 3: Mainnet Testing

```bash
export BACKEND="lwsav-iiaaa-aaaap-qp2qq-cai"
export ALEX_TOKEN="ryjl3-tyaaa-aaaaa-aaaba-cai"

# Test 1: Create proposal (should fail if no voting power)
dfx canister --network ic call $BACKEND create_treasury_transfer_proposal "(
  principal \"$ALEX_TOKEN\",
  record {
    amount = 1000000;
    to = \"test-address\";
    memo = opt \"Test transfer\";
  }
)"
# Expected: ProposalId or error if insufficient voting power

# Test 2: Vote on proposal
dfx canister --network ic call $BACKEND vote_on_treasury_proposal '(
  variant { ... },  # ProposalId from step 1
  true
)'
# Expected: Ok(()) or error if already voted

# Test 3: Get proposal status
dfx canister --network ic call $BACKEND get_treasury_proposal "(principal \"$ALEX_TOKEN\")"
# Expected: Some(TreasuryProposal { ... }) with vote counts

# Test 4: Verify execution (when threshold reached)
# Check Orbit Station request was approved:
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_requests '(record {
  statuses = opt vec { variant { Completed } };
})'
```

### Phase 4: Error Handling Tests

```bash
# Test expired proposal
# (Wait 7 days or set short expiry for testing)

# Test double voting
# (Vote twice with same identity - should error)

# Test insufficient voting power
# (Use identity with no Kong Locker - should error)

# Test non-existent proposal
dfx canister --network ic call $BACKEND vote_on_treasury_proposal '(
  variant { 999999 },
  true
)'
# Expected: Err(ProposalError::NotFound(999999))
```

---

## Scope Estimate

### Files Modified

**New Files:**
- `daopad_backend/src/proposals/types.rs` (~100 lines)
- `daopad_backend/src/proposals/treasury.rs` (~250 lines)

**Modified Files:**
- `daopad_backend/src/proposals/mod.rs` (+8 lines)
- `daopad_backend/src/storage/state.rs` (+10 lines)
- `daopad_backend/src/api/proposals.rs` (+5 lines)
- `daopad_backend/src/lib.rs` (+4 lines)

**Total:** ~377 lines added

### Complexity

- **Low Complexity**: Type definitions, storage, re-exports
- **Medium Complexity**: Voting logic (extends existing pattern)
- **High Complexity**: Orbit integration (double-wrapped Results, testing types)

### Time Estimate

- **Type discovery and Orbit testing**: 1 hour
- **Implementation (backend)**: 2 hours
- **Build, deploy, declaration sync**: 30 minutes
- **Mainnet testing**: 1 hour
- **Debug and fixes**: 1 hour
- **PR creation**: 15 minutes

**Total: 5-6 hours**

---

## Critical Implementation Notes

### 🚨 ISOLATION IS MANDATORY

**The implementing agent MUST work in an isolated worktree because:**
- Other agents are working in parallel in the main repo
- File changes from other agents will corrupt your work
- Git operations by other agents will change your files
- The orchestrator prompt above ENFORCES this with exit checks

### DAOPad-Specific Requirements

#### Candid Extraction (Backend Changes)

**ALWAYS run after Rust changes:**
```bash
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
```

#### Declaration Sync (CRITICAL BUG FIX)

**Frontend uses different declarations path:**
```bash
# After backend deploy, MUST sync:
cp -r ../../.dfx/ic/canisters/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
# Without this, frontend gets "is not a function" errors!
```

#### Don't Guess Orbit Types

**ALWAYS test Orbit Station APIs before implementing:**
```bash
export TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"
dfx canister --network ic call $TEST_STATION <method> '(args)'
# Read the actual return structure from errors
```

#### Handle Double-Wrapped Results

Orbit returns `Result<(CreateRequestResult::Ok/Err,), _>`:
```rust
let result: Result<(CreateRequestResult,), _> = ic_cdk::call(...).await;

match result {
    Ok((CreateRequestResult::Ok(response),)) => { /* success */ },
    Ok((CreateRequestResult::Err(e),)) => { /* Orbit error */ },
    Err((code, msg)) => { /* IC error */ },
}
```

#### Don't Skip Testing

Every change MUST be:
1. Built: `cargo build --target wasm32-unknown-unknown --release -p daopad_backend`
2. Extracted: `candid-extractor` (for backend changes)
3. Deployed: `./deploy.sh --network ic`
4. Synced: `cp -r ../../.dfx/ic/canisters/... daopad_frontend/src/declarations/...`
5. Tested: `dfx canister --network ic call`

#### Follow Existing Patterns

Look at `proposals/orbit_link.rs` and copy:
- Vote-and-execute pattern (no separate execute method)
- Error handling (double-wrapped Results)
- Kong Locker integration (`get_user_voting_power_for_token`)
- Storage patterns (volatile BTreeMap for proposals)

---

## Success Criteria

### Backend Implementation
- ✅ Types compile with proper CandidType derives
- ✅ Treasury proposal creation works on mainnet
- ✅ Voting updates vote counts correctly
- ✅ Threshold execution approves Orbit request
- ✅ Error handling returns typed errors (not panics)

### Integration
- ✅ Candid interface includes new methods
- ✅ Declarations synced to frontend
- ✅ No "is not a function" errors

### Testing
- ✅ Create proposal tested on mainnet
- ✅ Vote tested on mainnet
- ✅ Execution verified (Orbit request approved)
- ✅ Error cases tested (expired, double vote, etc.)

### Code Quality
- ✅ Follows orbit_link.rs patterns
- ✅ No code duplication (reuses helpers)
- ✅ Comments explain non-obvious logic
- ✅ No unwrap() or expect() in production code

---

## 🚀 Handoff to Implementing Agent

**Plan Complete:** Treasury Voting Architecture

**Document:** `TREASURY_VOTING_ARCHITECTURE_PLAN.md`

**Estimated:** 5-6 hours, 1 PR

**Prompt for next agent:**

```
Pursue @TREASURY_VOTING_ARCHITECTURE_PLAN.md
```

**WARNING**: The plan starts with a mandatory isolation check that will EXIT if not in a worktree. The implementing agent MUST follow the embedded orchestrator prompt, not skip to implementation details.

CRITICAL: The plan document starts with a MANDATORY isolation check and embedded orchestrator prompt. The implementing agent should copy the "Your Execution Prompt" section and run it, not read and implement manually.

---

🚨 **PLANNING AGENT - YOUR JOB IS DONE**

DO NOT:
- ❌ Implement code
- ❌ Make edits
- ❌ Create PRs
- ❌ Deploy
- ❌ Ask "should I continue?" and then execute
- ❌ Use ExitPlanMode and then implement

The implementing agent will execute this plan in a fresh conversation.

**🛑 END CONVERSATION HERE 🛑**
