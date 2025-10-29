# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-equity-stations/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-equity-stations/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Backend changes:
     ```bash
     cargo build --target wasm32-unknown-unknown --release -p daopad_backend
     cargo build --target wasm32-unknown-unknown --release -p admin
     candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
     candid-extractor target/wasm32-unknown-unknown/release/admin.wasm > admin/admin.did
     ./deploy.sh --network ic --backend-only
     cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
     cp -r src/declarations/admin/* daopad_frontend/src/declarations/admin/
     ```
4. **Test with dfx** (MANDATORY - See "Testing Strategy" section below):
   - Run ALL 6 test sequences from Success Criteria
   - Each test must pass before proceeding
   - Document any failures and fix immediately
5. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "feat: Equity-Based Station Backend Implementation (Part 1)

   Implements equity governance system for Orbit Stations as alternative to Kong Locker voting.

   Backend Changes:
   - Admin: Stable storage for equity tracking (4 StableBTreeMaps)
   - Admin: Equity transfer proposals with 75% approval threshold
   - Admin: Voting integration for equity holders on ALL Orbit proposals
   - Backend: Station initialization wrapper (create_equity_station)

   Testing: All dfx commands verified on mainnet test station
   Frontend: Deferred to Part 2 (separate PR after backend proven)

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>"
   git push -u origin feature/equity-stations
   gh pr create --title "feat: Equity-Based Station Backend (Part 1)" --body "$(cat <<'EOF'
## Summary
Implements the backend for equity-based governance stations (Part 1 of 2).

### What This Adds
- **Equity Tracking**: Stable storage for equity ownership (1-100%)
- **Transfer Proposals**: Equity holders can propose selling equity (75% approval required)
- **Voting Integration**: Equity holders vote on ALL Orbit operations (treasury, users, etc)
- **Simple Design**: Direct transfers (Seller -= X%, Buyer += X%), no dilution complexity

### Architecture
- **Admin Canister**: ALL equity logic (storage, proposals, voting)
- **Backend Canister**: Simple initialization wrapper
- **Storage**: 4 StableBTreeMaps using ic_stable_structures (survives upgrades)

### Testing
All dfx commands tested on mainnet test station (`fec7w-zyaaa-aaaaa-qaffq-cai`):
✅ Station initialization with 100% equity to creator
✅ Equity transfer proposal creation
✅ Voting on equity transfers (weighted by equity %)
✅ Execution of approved transfers
✅ Regular Orbit proposals with equity voting (CRITICAL - proves integration works)

### What's NOT in This PR
- Frontend UI (deferred to Part 2 - separate PR after backend proven in production)
- This prevents wasted UI work if backend needs iteration

### Risk Assessment
**Low Risk** - Backend-only changes with dfx testing:
- No frontend changes = no user-facing impact yet
- Stable storage = production-ready immediately
- Tested on live test station before PR
- Voting integration uses existing patterns (just adds equity path)

### Next Steps (Part 2)
After backend proven in production:
1. Add "Equity" tab to station detail pages
2. Show equity holders table
3. Transfer equity UI
4. Vote on equity transfer proposals UI

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
   ```
6. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view $(gh pr list --json number --jq '.[0].number') --json comments`
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

**Branch:** `feature/equity-stations`
**Worktree:** `/home/theseus/alexandria/daopad-equity-stations/src/daopad`

---

# Equity-Based Station Backend Implementation (Part 1)

## Executive Summary

Enable equity-based governance for Orbit Stations as an alternative to Kong Locker token voting. Station creators get 100% equity on initialization. Equity holders can transfer ownership through proposals requiring 75% approval. Equity holders vote on ALL Orbit Station operations (treasury, users, policies, etc) using their equity percentage directly.

**Part 1 (This PR)**: Backend implementation with dfx testing only
**Part 2 (Future PR)**: Frontend UI after backend proven in production

This split prevents wasted UI work if backend needs iteration.

## Current State Documentation

### File Structure (Before Changes)

```
daopad/
├── admin/
│   ├── src/
│   │   ├── api.rs                 # Orbit Station API types
│   │   ├── lib.rs                 # Main exports
│   │   ├── kong_locker/
│   │   │   ├── mod.rs
│   │   │   └── voting.rs          # Kong Locker VP queries
│   │   ├── proposals/
│   │   │   ├── mod.rs
│   │   │   ├── types.rs           # Proposal structs, enums
│   │   │   └── unified.rs         # vote_on_proposal logic
│   │   ├── storage/
│   │   │   ├── mod.rs
│   │   │   └── state.rs           # BTreeMap storage (NOT stable)
│   │   └── types/
│   │       ├── mod.rs
│   │       └── storage.rs         # StorablePrincipal wrapper
│   └── admin.did                  # 6 methods (voting, proposals)
│
└── daopad_backend/
    ├── src/
    │   ├── api/
    │   │   ├── mod.rs
    │   │   ├── orbit.rs           # Orbit request creation
    │   │   ├── stations.rs        # link_orbit_station
    │   │   └── ... (many API modules)
    │   └── lib.rs                 # Main exports
    └── daopad_backend.did         # Many methods (request creation)
```

### Current Storage Pattern (`admin/src/storage/state.rs`)

**NON-STABLE** - Uses `thread_local! { RefCell<BTreeMap<...>> }`

```rust
thread_local! {
    // Unified proposals: (token_id, request_id) → UnifiedProposal
    pub static UNIFIED_PROPOSALS: RefCell<BTreeMap<
        (StorablePrincipal, String),
        UnifiedProposal
    >> = RefCell::new(BTreeMap::new());

    // Votes: (ProposalId, Voter) → VoteChoice
    pub static UNIFIED_PROPOSAL_VOTES: RefCell<BTreeMap<
        (ProposalId, StorablePrincipal),
        VoteChoice
    >> = RefCell::new(BTreeMap::new());

    // VP cache: token_id → VotingPowerCache
    pub static TOTAL_VP_CACHE: RefCell<BTreeMap<
        StorablePrincipal,
        VotingPowerCache
    >> = RefCell::new(BTreeMap::new());
}
```

**Issue**: Data lost on canister upgrade. Acceptable for proposals (short-lived), but NOT for equity ownership.

### Current Voting Flow (`admin/src/proposals/unified.rs:18`)

```rust
#[update]
pub async fn vote_on_proposal(
    token_id: Principal,
    orbit_request_id: String,
    vote: bool,
) -> Result<(), ProposalError> {
    // 1. Auto-create proposal if needed
    // 2. Check status, expiry, double-vote
    // 3. Get voting power from Kong Locker (ASYNC)
    let voting_power = get_user_voting_power_for_token(voter, token_id).await?;
    // 4. Record vote, check threshold
    // 5. If threshold reached: approve_orbit_request()
}
```

**Key**: Voting power comes from Kong Locker (async cross-canister call).

### Backend → Admin Interaction

Backend creates Orbit requests, Admin handles voting/approval:

```rust
// Backend creates request (returns request_id)
let request_id = create_orbit_request(...)?;

// Admin auto-creates proposal on first vote
// Users vote via Admin's vote_on_proposal()
// Admin approves in Orbit when threshold reached
```

## Implementation Plan (PSEUDOCODE)

### 1. Admin Types (`admin/src/proposals/types.rs`)

**ADD** new equity types (append to existing file):

```rust
// PSEUDOCODE - Do not copy literally

// ============================================================================
// EQUITY STATION TYPES
// ============================================================================

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct EquityStationConfig {
    pub station_id: Principal,
    pub creator: Principal,
    pub created_at: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct EquityTransferProposal {
    pub proposal_id: String,
    pub station_id: Principal,
    pub seller: Principal,
    pub buyer: Principal,
    pub percentage: u8,  // 1-100
    pub ckusdc_amount: u64,
    pub payment_destination: PaymentDestination,
    pub status: EquityProposalStatus,
    pub created_at: u64,
    pub expires_at: u64,
    pub yes_votes_pct: u8,  // Out of 100 total equity
    pub no_votes_pct: u8,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum PaymentDestination {
    SellerAccount(String),      // Account identifier
    StationTreasury(Principal),  // Station principal
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum EquityProposalStatus {
    Proposed,
    Approved,  // 75% reached
    Executed,  // Buyer executed
    Expired,
}

// VoteChoice already exists, reuse it
```

### 2. Admin Storage (`admin/src/storage/state.rs`)

**PREPEND** stable storage setup at top of file:

```rust
// PSEUDOCODE - Do not copy literally

use ic_stable_structures::{
    StableBTreeMap, DefaultMemoryImpl,
    memory_manager::{MemoryId, MemoryManager, VirtualMemory}
};
use std::cell::RefCell;

type Memory = VirtualMemory<DefaultMemoryImpl>;

thread_local! {
    // Initialize memory manager ONCE
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
}

// EQUITY STABLE STORAGE (append to existing thread_local! blocks)
thread_local! {
    // Marks station as equity-based: station_id → EquityStationConfig
    pub static EQUITY_STATIONS: RefCell<StableBTreeMap<Principal, EquityStationConfig, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(10)))
        ));

    // Equity ownership: (station_id, holder) → percentage (1-100)
    pub static EQUITY_HOLDERS: RefCell<StableBTreeMap<(Principal, Principal), u8, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(11)))
        ));

    // Active proposals: proposal_id → EquityTransferProposal
    pub static EQUITY_TRANSFER_PROPOSALS: RefCell<StableBTreeMap<String, EquityTransferProposal, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(12)))
        ));

    // Votes: (proposal_id, voter) → VoteChoice
    pub static EQUITY_TRANSFER_VOTES: RefCell<StableBTreeMap<(String, Principal), VoteChoice, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(13)))
        ));
}
```

**NOTE**: Existing storage (UNIFIED_PROPOSALS, etc) remains unchanged.

### 3. Admin Equity Module (`admin/src/equity/mod.rs` - NEW FILE)

Create new module with all equity logic:

```rust
// PSEUDOCODE - Do not copy literally

use crate::proposals::types::{
    EquityStationConfig, EquityTransferProposal, PaymentDestination,
    EquityProposalStatus, VoteChoice, ProposalError
};
use crate::storage::state::{
    EQUITY_STATIONS, EQUITY_HOLDERS, EQUITY_TRANSFER_PROPOSALS, EQUITY_TRANSFER_VOTES
};
use candid::Principal;
use ic_cdk::{query, update};

// ============================================================================
// INITIALIZATION
// ============================================================================

#[update]
fn initialize_equity_station(station_id: Principal, creator: Principal) -> Result<(), String> {
    // ONLY Backend can call this
    let caller = ic_cdk::caller();
    let backend = Principal::from_text("lwsav-iiaaa-aaaap-qp2qq-cai").unwrap();
    if caller != backend {
        return Err("Only Backend can initialize".to_string());
    }

    EQUITY_STATIONS.with(|stations| {
        // Check not already initialized
        if stations.borrow().contains_key(&station_id) {
            return Err("Already equity-enabled".to_string());
        }

        // Create config
        let config = EquityStationConfig {
            station_id,
            creator,
            created_at: ic_cdk::api::time(),
        };
        stations.borrow_mut().insert(station_id, config);

        // Creator gets 100% equity
        EQUITY_HOLDERS.with(|holders| {
            holders.borrow_mut().insert((station_id, creator), 100);
        });

        Ok(())
    })
}

// ============================================================================
// EQUITY TRANSFER PROPOSALS
// ============================================================================

#[update]
fn create_equity_transfer_proposal(
    station_id: Principal,
    buyer: Principal,
    percentage: u8,
    ckusdc_amount: u64,
    payment_destination: PaymentDestination,
) -> Result<String, String> {
    let seller = ic_cdk::caller();

    // Validate percentage 1-100
    if percentage < 1 || percentage > 100 {
        return Err("Percentage must be 1-100".to_string());
    }

    // Check seller has enough equity
    let seller_equity = EQUITY_HOLDERS.with(|holders| {
        holders.borrow().get(&(station_id, seller)).copied().unwrap_or(0)
    });

    if seller_equity < percentage {
        return Err(format!("Insufficient equity: have {}%, need {}%", seller_equity, percentage));
    }

    // NO per-seller proposal limit (execution check prevents over-selling)

    // Generate proposal ID
    let proposal_id = format!("{}-{}", ic_cdk::api::time(), seller.to_text());

    // Create proposal (does NOT lock seller's equity)
    let proposal = EquityTransferProposal {
        proposal_id: proposal_id.clone(),
        station_id,
        seller,
        buyer,
        percentage,
        ckusdc_amount,
        payment_destination,
        status: EquityProposalStatus::Proposed,
        created_at: ic_cdk::api::time(),
        expires_at: ic_cdk::api::time() + (7 * 24 * 60 * 60 * 1_000_000_000), // 7 days
        yes_votes_pct: 0,
        no_votes_pct: 0,
    };

    EQUITY_TRANSFER_PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(proposal_id.clone(), proposal);
    });

    Ok(proposal_id)
}

#[update]
fn vote_on_equity_transfer(proposal_id: String, approve: bool) -> Result<(), String> {
    let voter = ic_cdk::caller();

    // Get proposal
    let mut proposal = EQUITY_TRANSFER_PROPOSALS.with(|proposals| {
        proposals.borrow()
            .get(&proposal_id)
            .ok_or("Proposal not found".to_string())
    })?;

    // Check not expired
    if ic_cdk::api::time() > proposal.expires_at {
        proposal.status = EquityProposalStatus::Expired;
        EQUITY_TRANSFER_PROPOSALS.with(|proposals| {
            proposals.borrow_mut().insert(proposal_id.clone(), proposal);
        });
        return Err("Proposal expired".to_string());
    }

    // Get voter's equity (NOT locked - they can vote even with pending proposals)
    let voter_equity = EQUITY_HOLDERS.with(|holders| {
        holders.borrow().get(&(proposal.station_id, voter)).copied().unwrap_or(0)
    });

    if voter_equity == 0 {
        return Err("No equity in this station".to_string());
    }

    // Check not already voted
    let vote_key = (proposal_id.clone(), voter);
    EQUITY_TRANSFER_VOTES.with(|votes| {
        if votes.borrow().contains_key(&vote_key) {
            return Err("Already voted".to_string());
        }

        // Record vote
        votes.borrow_mut().insert(vote_key, if approve { VoteChoice::Yes } else { VoteChoice::No });
        Ok(())
    })?;

    // Update vote tallies with overflow protection
    if approve {
        proposal.yes_votes_pct = proposal.yes_votes_pct
            .checked_add(voter_equity)
            .expect("Vote tally overflow - invariant violated");
    } else {
        proposal.no_votes_pct = proposal.no_votes_pct
            .checked_add(voter_equity)
            .expect("Vote tally overflow - invariant violated");
    }

    // Check 75% threshold
    if proposal.yes_votes_pct >= 75 {
        proposal.status = EquityProposalStatus::Approved;
    }

    // Save
    EQUITY_TRANSFER_PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(proposal_id, proposal);
    });

    Ok(())
}

#[update]
fn execute_equity_transfer(proposal_id: String) -> Result<(), String> {
    let caller = ic_cdk::caller();

    // Get proposal
    let mut proposal = EQUITY_TRANSFER_PROPOSALS.with(|proposals| {
        proposals.borrow()
            .get(&proposal_id)
            .ok_or("Proposal not found".to_string())
    })?;

    // Only buyer can execute
    if caller != proposal.buyer {
        return Err("Only buyer can execute".to_string());
    }

    // Must be approved
    if proposal.status != EquityProposalStatus::Approved {
        return Err(format!("Not approved (status: {:?})", proposal.status));
    }

    // MVP: Trust-based payment (no verification)

    // Execute transfer
    EQUITY_HOLDERS.with(|holders| {
        let mut holders_map = holders.borrow_mut();

        // Get current equity at execution time
        let seller_equity = holders_map.get(&(proposal.station_id, proposal.seller))
            .copied().unwrap_or(0);
        let buyer_equity = holders_map.get(&(proposal.station_id, proposal.buyer))
            .copied().unwrap_or(0);

        // Sanity check: seller must STILL have enough
        if seller_equity < proposal.percentage {
            return Err(format!(
                "Seller no longer has enough equity (has {}%, needs {}%)",
                seller_equity,
                proposal.percentage
            ));
        }

        // Update: Seller -= X%, Buyer += X%
        let new_seller_equity = seller_equity - proposal.percentage;
        let new_buyer_equity = buyer_equity + proposal.percentage;

        holders_map.insert((proposal.station_id, proposal.seller), new_seller_equity);
        holders_map.insert((proposal.station_id, proposal.buyer), new_buyer_equity);

        // Invariant check: Total must = 100%
        let total: u8 = holders_map.iter()
            .filter(|((sid, _), _)| sid == &proposal.station_id)
            .map(|(_, pct)| pct)
            .sum();

        if total != 100 {
            panic!("CRITICAL: Equity invariant violated! Total = {}%", total);
        }

        Ok(())
    })?;

    // Mark executed
    proposal.status = EquityProposalStatus::Executed;
    EQUITY_TRANSFER_PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(proposal_id, proposal);
    });

    Ok(())
}

// ============================================================================
// QUERY METHODS
// ============================================================================

#[query]
fn get_user_equity(station_id: Principal, user: Principal) -> u8 {
    EQUITY_HOLDERS.with(|holders| {
        holders.borrow().get(&(station_id, user)).copied().unwrap_or(0)
    })
}

#[query]
fn get_equity_holders(station_id: Principal) -> Vec<(Principal, u8)> {
    EQUITY_HOLDERS.with(|holders| {
        holders.borrow()
            .iter()
            .filter(|((sid, _), _)| sid == &station_id)
            .map(|((_, holder), pct)| (*holder, *pct))
            .collect()
    })
}

#[query]
fn get_equity_transfer_proposals(station_id: Principal) -> Vec<EquityTransferProposal> {
    EQUITY_TRANSFER_PROPOSALS.with(|proposals| {
        proposals.borrow()
            .iter()
            .filter(|(_, p)| p.station_id == station_id)
            .map(|(_, p)| p.clone())
            .collect()
    })
}

#[query]
fn get_equity_transfer_proposal(proposal_id: String) -> Option<EquityTransferProposal> {
    EQUITY_TRANSFER_PROPOSALS.with(|proposals| {
        proposals.borrow().get(&proposal_id)
    })
}

#[query]
fn is_equity_station(station_id: Principal) -> bool {
    EQUITY_STATIONS.with(|stations| {
        stations.borrow().contains_key(&station_id)
    })
}
```

### 4. Admin Voting Integration (`admin/src/proposals/unified.rs`)

**MODIFY** `vote_on_proposal` function (around line 18):

```rust
// PSEUDOCODE - Do not copy literally

#[update]
pub async fn vote_on_proposal(
    token_id: Principal,
    orbit_request_id: String,
    vote: bool,
) -> Result<(), ProposalError> {
    let voter = ic_cdk::caller();

    // ... existing checks (auth, proposal exists, status, expiry, double-vote) ...

    // 6. Get voting power - ROUTE BASED ON STATION TYPE
    let voting_power = if is_equity_station(token_id) {
        // EQUITY STATION: Use equity % directly (SYNC)
        get_user_equity(token_id, voter) as u64
    } else {
        // DAO STATION: Query Kong Locker (ASYNC - existing logic)
        match get_user_voting_power_for_token(voter, token_id).await {
            Ok(vp) => vp,
            Err(e) if e.contains("register") => {
                return Err(ProposalError::Custom(
                    "You need to register with Kong Locker first.".to_string()
                ));
            },
            Err(_) => {
                return Err(ProposalError::Custom(
                    "You need LP tokens to vote.".to_string()
                ));
            }
        }
    };

    if voting_power == 0 {
        return Err(ProposalError::NoVotingPower);
    }

    // ... rest of existing logic unchanged (record vote, check threshold, approve) ...
}
```

**IMPORT** equity functions at top:

```rust
use crate::equity::{is_equity_station, get_user_equity};
```

### 5. Admin lib.rs (`admin/src/lib.rs`)

**ADD** equity module and export functions:

```rust
// PSEUDOCODE - Do not copy literally

mod api;
mod kong_locker;
mod proposals;
mod storage;
mod types;
mod equity;  // ADD THIS

pub use equity::{
    initialize_equity_station,
    create_equity_transfer_proposal,
    vote_on_equity_transfer,
    execute_equity_transfer,
    get_user_equity,
    get_equity_holders,
    get_equity_transfer_proposals,
    get_equity_transfer_proposal,
    is_equity_station,
};

// ... existing exports ...
```

### 6. Backend Equity API (`daopad_backend/src/api/equity.rs` - NEW FILE)

Create simple wrapper that calls Admin:

```rust
// PSEUDOCODE - Do not copy literally

use candid::Principal;
use ic_cdk::update;

#[update]
async fn create_equity_station(station_id: Principal) -> Result<(), String> {
    let caller = ic_cdk::caller();
    let admin_canister = Principal::from_text("odkrm-viaaa-aaaap-qp2oq-cai").unwrap();

    // Admin will verify caller == Backend canister
    let result: Result<(Result<(), String>,), _> = ic_cdk::call(
        admin_canister,
        "initialize_equity_station",
        (station_id, caller)
    ).await;

    match result {
        Ok((Ok(()),)) => Ok(()),
        Ok((Err(e),)) => Err(e),
        Err((code, msg)) => Err(format!("Cross-canister call failed: {:?} - {}", code, msg))
    }
}
```

### 7. Backend mod.rs (`daopad_backend/src/api/mod.rs`)

**ADD** equity module:

```rust
// PSEUDOCODE - Do not copy literally

mod address_book;
// ... existing modules ...
mod equity;  // ADD THIS

pub use equity::*;  // ADD THIS
// ... existing exports ...
```

### 8. Backend lib.rs (`daopad_backend/src/lib.rs`)

**EXPORT** equity function:

```rust
// PSEUDOCODE - Do not copy literally

pub use api::create_equity_station;  // ADD THIS
// ... existing exports ...
```

### 9. Update Candid Interfaces

**Admin (`admin/admin.did`)** - ADD these methods:

```candid
// PSEUDOCODE - Actual types will be generated by candid-extractor

type EquityStationConfig = record {
  station_id : principal;
  creator : principal;
  created_at : nat64;
};

type EquityTransferProposal = record {
  proposal_id : text;
  station_id : principal;
  seller : principal;
  buyer : principal;
  percentage : nat8;
  ckusdc_amount : nat64;
  payment_destination : PaymentDestination;
  status : EquityProposalStatus;
  created_at : nat64;
  expires_at : nat64;
  yes_votes_pct : nat8;
  no_votes_pct : nat8;
};

type PaymentDestination = variant {
  SellerAccount : text;
  StationTreasury : principal;
};

type EquityProposalStatus = variant {
  Proposed;
  Approved;
  Executed;
  Expired;
};

service : {
  // Existing methods...

  // NEW: Equity methods
  initialize_equity_station : (principal, principal) -> (variant { Ok; Err : text });
  create_equity_transfer_proposal : (principal, principal, nat8, nat64, PaymentDestination) -> (variant { Ok : text; Err : text });
  vote_on_equity_transfer : (text, bool) -> (variant { Ok; Err : text });
  execute_equity_transfer : (text) -> (variant { Ok; Err : text });
  get_user_equity : (principal, principal) -> (nat8) query;
  get_equity_holders : (principal) -> (vec record { principal; nat8 }) query;
  get_equity_transfer_proposals : (principal) -> (vec EquityTransferProposal) query;
  get_equity_transfer_proposal : (text) -> (opt EquityTransferProposal) query;
  is_equity_station : (principal) -> (bool) query;
}
```

**Backend (`daopad_backend/daopad_backend.did`)** - ADD this method:

```candid
service : {
  // Existing methods...

  // NEW: Equity station initialization
  create_equity_station : (principal) -> (variant { Ok; Err : text });
}
```

**NOTE**: Use `candid-extractor` to generate actual Candid after Rust implementation (see Build & Deploy section).

## Testing Strategy

### Prerequisites

```bash
# Environment variables
export TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"  # Our test station with admin access
export ADMIN="odkrm-viaaa-aaaap-qp2oq-cai"
export BACKEND="lwsav-iiaaa-aaaap-qp2qq-cai"

# Use daopad identity (has admin/operator access)
dfx identity use daopad
export CREATOR=$(dfx identity get-principal)

# Create second identity for buyer
dfx identity new buyer --storage-mode=plaintext || true
dfx identity use buyer
export BUYER=$(dfx identity get-principal)
dfx identity use daopad
```

### Test Sequence 1: Initialize Equity Station

```bash
# Call Backend to initialize (Backend calls Admin internally)
dfx canister --network ic call $BACKEND create_equity_station "(principal \"$TEST_STATION\")"
# Expected: (variant { Ok })

# Verify station is marked as equity
dfx canister --network ic call $ADMIN is_equity_station "(principal \"$TEST_STATION\")"
# Expected: (true)

# Verify creator has 100% equity
dfx canister --network ic call $ADMIN get_equity_holders "(principal \"$TEST_STATION\")"
# Expected: (vec { record { principal "<creator>"; 100 : nat8 } })

# Verify creator's equity directly
dfx canister --network ic call $ADMIN get_user_equity "(principal \"$TEST_STATION\", principal \"$CREATOR\")"
# Expected: (100 : nat8)
```

**Success Criteria**: All commands return expected values without errors.

### Test Sequence 2: Create Equity Transfer Proposal

```bash
# Seller (creator with 100%) creates proposal to sell 20% for 1000 ckUSDC to treasury
dfx canister --network ic call $ADMIN create_equity_transfer_proposal "(
  principal \"$TEST_STATION\",
  principal \"$BUYER\",
  20 : nat8,
  1000 : nat64,
  variant { StationTreasury = principal \"$TEST_STATION\" }
)"
# Returns: (variant { Ok = "proposal_id_string" })
# Save the proposal ID:
export PROPOSAL_ID="<returned_proposal_id>"

# Verify proposal created
dfx canister --network ic call $ADMIN get_equity_transfer_proposal "(\"$PROPOSAL_ID\")"
# Expected: Shows proposal with status Proposed, yes_votes_pct = 0, no_votes_pct = 0
```

**Success Criteria**: Proposal created with correct details, status = Proposed.

### Test Sequence 3: Vote on Equity Transfer

```bash
# Seller votes yes (has 100% equity)
dfx identity use daopad
dfx canister --network ic call $ADMIN vote_on_equity_transfer "(\"$PROPOSAL_ID\", true)"
# Expected: (variant { Ok })

# Verify proposal now approved (100% > 75% threshold)
dfx canister --network ic call $ADMIN get_equity_transfer_proposal "(\"$PROPOSAL_ID\")"
# Expected: status = Approved, yes_votes_pct = 100
```

**Success Criteria**: Vote recorded, proposal auto-approved since 100% > 75%.

### Test Sequence 4: Execute Equity Transfer

```bash
# Buyer executes transfer (after manually sending ckUSDC off-chain)
dfx identity use buyer
dfx canister --network ic call $ADMIN execute_equity_transfer "(\"$PROPOSAL_ID\")"
# Expected: (variant { Ok })

# Verify equity balances changed
dfx canister --network ic call $ADMIN get_equity_holders "(principal \"$TEST_STATION\")"
# Expected:
# vec {
#   record { principal "<seller>"; 80 : nat8 };  # 100 - 20
#   record { principal "<buyer>"; 20 : nat8 }    # 0 + 20
# }

# Verify individual equity
dfx canister --network ic call $ADMIN get_user_equity "(principal \"$TEST_STATION\", principal \"$CREATOR\")"
# Expected: (80 : nat8)

dfx canister --network ic call $ADMIN get_user_equity "(principal \"$TEST_STATION\", principal \"$BUYER\")"
# Expected: (20 : nat8)
```

**Success Criteria**: Equity transferred correctly, total = 100%, invariant maintained.

### Test Sequence 5: Multiple Equity Holders Vote

Create a second proposal to test weighted voting:

```bash
# Seller (now 80%) proposes selling 10% more
dfx identity use daopad
dfx canister --network ic call $ADMIN create_equity_transfer_proposal "(
  principal \"$TEST_STATION\",
  principal \"$BUYER\",
  10 : nat8,
  500 : nat64,
  variant { StationTreasury = principal \"$TEST_STATION\" }
)"
# Returns new proposal ID
export PROPOSAL_ID_2="<returned_proposal_id>"

# Seller votes yes (80% equity)
dfx canister --network ic call $ADMIN vote_on_equity_transfer "(\"$PROPOSAL_ID_2\", true)"
# Expected: (variant { Ok })

# Check status (80% > 75%, should be approved)
dfx canister --network ic call $ADMIN get_equity_transfer_proposal "(\"$PROPOSAL_ID_2\")"
# Expected: status = Approved, yes_votes_pct = 80

# Buyer can vote too (has 20% equity now)
dfx identity use buyer
dfx canister --network ic call $ADMIN vote_on_equity_transfer "(\"$PROPOSAL_ID_2\", true)"
# Expected: (variant { Ok })

# Check updated votes
dfx canister --network ic call $ADMIN get_equity_transfer_proposal "(\"$PROPOSAL_ID_2\")"
# Expected: yes_votes_pct = 100 (80 + 20)
```

**Success Criteria**: Weighted voting works, both holders can vote independently.

### Test Sequence 6: Regular Orbit Proposal with Equity Voting (CRITICAL)

**This test proves equity voting integration works for ALL Orbit operations, not just equity transfers.**

```bash
# Backend creates a regular Orbit request (e.g., treasury transfer, user management)
# For this test, we'll create a simple EditUser request to remove admin access

dfx identity use daopad

# Create EditUser request in Orbit Station
dfx canister --network ic call $TEST_STATION create_request '(record {
  operation = variant {
    EditUser = record {
      id = "some-user-uuid";
      name = null;
      identities = null;
      groups = opt vec { "operator-group-uuid" };
      status = null;
      cancel_pending_requests = null;
    }
  };
  title = opt "Test: Regular Orbit Request with Equity Voting";
  summary = opt "Testing equity voting integration for non-equity operations";
  execution_plan = opt variant { Immediate };
})'
# Returns: request_id

export ORBIT_REQUEST_ID="<returned_request_id>"

# Admin creates proposal for this request
dfx canister --network ic call $ADMIN ensure_proposal_for_request "(
  principal \"$TEST_STATION\",
  \"$ORBIT_REQUEST_ID\",
  \"EditUser\"
)"
# Returns: ProposalId

# Vote on this proposal (Admin will route to equity voting)
dfx identity use daopad  # Has 70% equity after previous transfers
dfx canister --network ic call $ADMIN vote_on_proposal "(
  principal \"$TEST_STATION\",
  \"$ORBIT_REQUEST_ID\",
  true
)"
# Expected: (variant { Ok })
# Since 70% > 50% threshold for EditUser, should auto-approve in Orbit

# Verify proposal executed
dfx canister --network ic call $ADMIN get_proposal "(
  principal \"$TEST_STATION\",
  \"$ORBIT_REQUEST_ID\"
)"
# Expected: status = Executed

# Verify in Orbit Station that request was approved
dfx canister --network ic call $TEST_STATION get_request "(\"$ORBIT_REQUEST_ID\")"
# Expected: request status shows Approved
```

**Success Criteria**:
- Equity holders can vote on regular Orbit requests
- Voting weight comes from equity percentage (not Kong Locker)
- Threshold check works correctly
- Auto-approval in Orbit happens when threshold reached
- **This proves the voting integration is COMPLETE and works for all operations**

### Test Sequence 7: Edge Cases

```bash
# Test 1: Seller tries to sell more than they have
dfx identity use daopad
dfx canister --network ic call $ADMIN create_equity_transfer_proposal "(
  principal \"$TEST_STATION\",
  principal \"$BUYER\",
  90 : nat8,  # Seller only has 70%
  1000 : nat64,
  variant { StationTreasury = principal \"$TEST_STATION\" }
)"
# Expected: (variant { Err = "Insufficient equity: have 70%, need 90%" })

# Test 2: Non-equity holder tries to vote
dfx identity new non_holder --storage-mode=plaintext || true
dfx identity use non_holder
dfx canister --network ic call $ADMIN vote_on_equity_transfer "(\"$PROPOSAL_ID\", true)"
# Expected: (variant { Err = "No equity in this station" })

# Test 3: Buyer tries to execute before approval
dfx identity use buyer
# Create proposal that won't reach threshold
dfx identity use daopad
dfx canister --network ic call $ADMIN create_equity_transfer_proposal "(
  principal \"$TEST_STATION\",
  principal \"$BUYER\",
  5 : nat8,
  100 : nat64,
  variant { StationTreasury = principal \"$TEST_STATION\" }
)"
export PROPOSAL_ID_3="<returned_id>"

# Try to execute without voting (status still Proposed)
dfx identity use buyer
dfx canister --network ic call $ADMIN execute_equity_transfer "(\"$PROPOSAL_ID_3\")"
# Expected: (variant { Err = "Not approved (status: Proposed)" })

# Test 4: Non-buyer tries to execute approved proposal
dfx identity use non_holder
dfx canister --network ic call $ADMIN execute_equity_transfer "(\"$PROPOSAL_ID_2\")"  # From earlier test
# Expected: (variant { Err = "Only buyer can execute" })
```

**Success Criteria**: All error cases handled correctly with clear error messages.

### Exit Criteria (ALL MUST PASS)

✅ **Test 1**: Station initialization with 100% equity to creator
✅ **Test 2**: Equity transfer proposal creation
✅ **Test 3**: Voting on equity transfers (weighted by equity %)
✅ **Test 4**: Execution of approved transfers
✅ **Test 5**: Multiple holders voting independently
✅ **Test 6**: Regular Orbit proposals with equity voting (PROVES INTEGRATION)
✅ **Test 7**: Edge cases handled correctly

**DO NOT CREATE PR UNTIL ALL TESTS PASS**

## Success Criteria Summary

Backend MVP is complete when:

1. All Rust code compiles without errors
2. Candid interfaces generated successfully
3. Deployment to mainnet succeeds
4. ALL 7 test sequences pass on mainnet test station
5. No panics or traps in canister logs
6. Equity invariant maintained (total always = 100%)

## Files Changed

**New Files:**
- `admin/src/equity/mod.rs` (equity logic)
- `daopad_backend/src/api/equity.rs` (initialization wrapper)

**Modified Files:**
- `admin/src/proposals/types.rs` (add equity types)
- `admin/src/storage/state.rs` (add stable storage)
- `admin/src/proposals/unified.rs` (modify vote_on_proposal for routing)
- `admin/src/lib.rs` (export equity functions)
- `daopad_backend/src/api/mod.rs` (add equity module)
- `daopad_backend/src/lib.rs` (export create_equity_station)
- `admin/admin.did` (add equity methods - auto-generated)
- `daopad_backend/daopad_backend.did` (add create_equity_station - auto-generated)

**Generated Files** (via candid-extractor):
- `admin/admin.did` (updated)
- `daopad_backend/daopad_backend.did` (updated)
- `src/declarations/admin/*` (updated)
- `src/declarations/daopad_backend/*` (updated)

## Risk Assessment

**Low Risk:**
- Backend-only changes, no frontend impact yet
- Stable storage = production-ready immediately
- Tested extensively with dfx before PR
- Voting integration uses existing patterns (just adds equity path)
- No changes to existing DAO voting logic

**Mitigation:**
- All tests run on mainnet test station (not local)
- Exit criteria requires ALL tests to pass
- Equity invariant enforced with panic (fail-safe)
- Part 2 (frontend) deferred until backend proven

## Next Steps (Part 2 - Future PR)

After backend proven in production:

1. Add "Equity" tab to station detail pages
2. Show equity holders table (query get_equity_holders)
3. Transfer equity UI (calls create_equity_transfer_proposal)
4. Vote on equity transfer proposals UI
5. Execute transfer button (for buyers on approved proposals)

**Do NOT implement Part 2 until Part 1 backend is verified in production.**
