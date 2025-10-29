# Equity-Based Station Implementation Plan (One-Shot Ready)

## Executive Summary
Enable equity-based governance for any station as an alternative to Kong Locker token voting. Equity stations have a dedicated UI tab showing ownership percentages (1-100%), with voting power directly mapped from equity holdings. Simple, direct transfers with 75% approval threshold.

**Key Design**: Station creator gets 100% equity on initialization. Members transfer equity through proposals that require 75% approval from current equity holders (weighted by their %). No complex dilution - simple direct transfers: Seller -= X%, Buyer += X%.

**Implementation Approach**: Two-part delivery
- **Part 1**: Backend implementation with dfx testing (this document)
- **Part 2**: Frontend UI after backend proven in production (separate PR)

This prevents wasted UI work if backend needs iteration and allows implementation to focus purely on Rust/Candid without context-switching to React/TypeScript.

## Simplifications Applied

Based on one-shot implementation analysis, the following simplifications have been made to reduce complexity:

- ✅ **Kept**: Voting integration for regular Orbit proposals (CORE REQUIREMENT - equity holders must govern their stations)
- ✅ **Kept**: Stable storage from day 1 (production-ready immediately, no migration needed)
- ❌ **Removed**: Backend admin verification (`verify_backend_is_station_admin`) - Admin just trusts Backend's principal
- ❌ **Removed**: One-proposal-per-seller validation - Execution-time check prevents over-selling, no need to iterate all proposals
- 🔒 **Safety**: Vote tallies use `checked_add()` to panic on overflow (u8 type, should never exceed 100%)
- 📦 **Split**: Backend (Part 1 - this PR) and Frontend (Part 2 - after backend proven)

## Architecture

### Single Source of Truth: Admin Canister
All equity tracking happens in Admin (not Backend). Backend only calls Admin to initialize equity stations.

- **Backend**: Initiates station creation → calls Admin to enable equity
- **Admin**: Stores ALL equity data + voting logic + proposals
- **Orbit Station**: Treasury + execution (unchanged)
- **Frontend**: New "Equity" tab for equity stations (shows holders, transfer UI, proposals)

## Storage Structures (Admin Canister Only)

### Stable Storage Setup
```rust
use ic_stable_structures::{
    StableBTreeMap, DefaultMemoryImpl, memory_manager::{MemoryId, MemoryManager, VirtualMemory}
};
use std::cell::RefCell;

type Memory = VirtualMemory<DefaultMemoryImpl>;

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    // Marks a station as equity-based: station_id → EquityStationConfig
    pub static EQUITY_STATIONS: RefCell<StableBTreeMap<Principal, EquityStationConfig, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(10)))
        ));

    // Current equity holdings: (station_id, holder) → percentage (1-100)
    pub static EQUITY_HOLDERS: RefCell<StableBTreeMap<(Principal, Principal), u8, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(11)))
        ));

    // Active equity transfer proposals: proposal_id → EquityTransferProposal
    pub static EQUITY_TRANSFER_PROPOSALS: RefCell<StableBTreeMap<String, EquityTransferProposal, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(12)))
        ));

    // Votes on equity transfers: (proposal_id, voter) → VoteChoice
    pub static EQUITY_TRANSFER_VOTES: RefCell<StableBTreeMap<(String, Principal), VoteChoice, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(13)))
        ));
}
```

### Data Structures
```rust
#[derive(CandidType, Deserialize, Clone)]
struct EquityStationConfig {
    station_id: Principal,
    creator: Principal,
    created_at: u64,
}

#[derive(CandidType, Deserialize, Clone)]
struct EquityTransferProposal {
    proposal_id: String,
    station_id: Principal,
    seller: Principal,
    buyer: Principal,
    percentage: u8,  // 1-100 whole numbers only
    ckusdc_amount: u64,
    payment_destination: PaymentDestination,
    status: EquityProposalStatus,
    created_at: u64,
    expires_at: u64,
    yes_votes_pct: u8,  // Sum of equity % voting yes (out of 100 total)
    no_votes_pct: u8,
}

#[derive(CandidType, Deserialize, Clone)]
enum PaymentDestination {
    SellerAccount(String),      // Account identifier string
    StationTreasury(Principal),  // Station treasury principal
}

#[derive(CandidType, Deserialize, Clone, PartialEq)]
enum EquityProposalStatus {
    Proposed,
    Approved,  // 75% threshold reached
    Executed,  // Buyer executed transfer
    Expired,
}

#[derive(CandidType, Deserialize, Clone)]
enum VoteChoice {
    Yes,
    No,
}
```

## Method Implementations

### Backend Methods (Minimal - Just Initialization)

#### create_equity_station
**Simplified**: No admin verification - Admin canister will verify caller is Backend.

```rust
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

### Admin Methods (Core Logic)

#### 1. Initialize Equity Station
```rust
#[update]
fn initialize_equity_station(station_id: Principal, creator: Principal) -> Result<(), String> {
    // Only Backend can call this
    let caller = ic_cdk::caller();
    let backend = Principal::from_text("lwsav-iiaaa-aaaap-qp2qq-cai").unwrap();
    if caller != backend {
        return Err("Only Backend can initialize equity stations".to_string());
    }

    EQUITY_STATIONS.with(|stations| {
        if stations.borrow().contains_key(&station_id) {
            return Err("Station already equity-enabled".to_string());
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
```

#### 2. Create Equity Transfer Proposal
```rust
#[update]
fn create_equity_transfer_proposal(
    station_id: Principal,
    buyer: Principal,
    percentage: u8,
    ckusdc_amount: u64,
    payment_destination: PaymentDestination,
) -> Result<String, String> {
    let seller = ic_cdk::caller();

    // Validation: percentage 1-100
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

    // No per-seller proposal limit - execution-time check prevents over-selling
    // Seller can create multiple proposals; only execution transfers equity

    // Generate proposal ID
    let proposal_id = format!("{}-{}", ic_cdk::api::time(), seller.to_text());

    // Create proposal (does NOT lock seller's equity - they can still vote with full %)
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
```

#### 3. Vote on Equity Transfer
```rust
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

    // Get voter's current equity (NOT locked - they can vote even if they have a pending proposal)
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
            return Err("Already voted on this proposal".to_string());
        }

        // Record vote
        votes.borrow_mut().insert(vote_key, if approve { VoteChoice::Yes } else { VoteChoice::No });
        Ok(())
    })?;

    // Update vote tallies with overflow protection
    // Use checked_add to panic if total exceeds u8::MAX (should never happen with correct logic)
    if approve {
        proposal.yes_votes_pct = proposal.yes_votes_pct
            .checked_add(voter_equity)
            .expect("Vote tally overflow - invariant violated");
    } else {
        proposal.no_votes_pct = proposal.no_votes_pct
            .checked_add(voter_equity)
            .expect("Vote tally overflow - invariant violated");
    }

    // Check 75% threshold (out of 100 total equity)
    if proposal.yes_votes_pct >= 75 {
        proposal.status = EquityProposalStatus::Approved;
    }

    // Save updated proposal
    EQUITY_TRANSFER_PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(proposal_id, proposal);
    });

    Ok(())
}
```

#### 4. Execute Equity Transfer
```rust
#[update]
fn execute_equity_transfer(proposal_id: String) -> Result<(), String> {
    let caller = ic_cdk::caller();

    // Get proposal
    let mut proposal = EQUITY_TRANSFER_PROPOSALS.with(|proposals| {
        proposals.borrow()
            .get(&proposal_id)
            .ok_or("Proposal not found".to_string())
    })?;

    // Validation: only buyer can execute
    if caller != proposal.buyer {
        return Err("Only buyer can execute approved transfer".to_string());
    }

    // Validation: must be approved
    if proposal.status != EquityProposalStatus::Approved {
        return Err(format!("Proposal not approved (status: {:?})", proposal.status));
    }

    // MVP: Manual payment verification (trust-based)
    // Buyer is expected to have sent ckusdc_amount to payment_destination before calling this
    // Future enhancement: Verify treasury balance increased by ckusdc_amount

    // Execute transfer: Simple math, no dilution
    EQUITY_HOLDERS.with(|holders| {
        let mut holders_map = holders.borrow_mut();

        // Get current equity at execution time (seller might have changed since proposal)
        let seller_equity = holders_map.get(&(proposal.station_id, proposal.seller))
            .copied().unwrap_or(0);
        let buyer_equity = holders_map.get(&(proposal.station_id, proposal.buyer))
            .copied().unwrap_or(0);

        // Sanity check: seller must STILL have enough equity
        if seller_equity < proposal.percentage {
            return Err(format!(
                "Seller no longer has enough equity (has {}%, needs {}%)",
                seller_equity,
                proposal.percentage
            ));
        }

        // Update equity: Seller -= X%, Buyer += X%
        let new_seller_equity = seller_equity - proposal.percentage;
        let new_buyer_equity = buyer_equity + proposal.percentage;

        holders_map.insert((proposal.station_id, proposal.seller), new_seller_equity);
        holders_map.insert((proposal.station_id, proposal.buyer), new_buyer_equity);

        // Invariant check: Total equity must always = 100%
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
```

#### 5. Query Methods
```rust
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

#### 6. Voting Power Integration (REQUIRED FOR MVP)

**CRITICAL**: Equity holders MUST be able to vote on regular Orbit Station proposals (treasury transfers, user management, etc). This is core functionality, not optional.

**Implementation**: Modify Admin's existing `vote_on_proposal()` function to route voting power based on station type. This allows equity stations to participate in all station governance, not just equity transfers.

```rust
#[update]
async fn vote_on_proposal(
    station_id: Principal,
    request_id: String,
    vote: VoteChoice
) -> Result<(), String> {
    let voter = ic_cdk::caller();

    // Route voting power check based on station type
    let voting_weight = if is_equity_station(station_id) {
        // Equity station: use equity percentage directly (1-100)
        // This is SYNC and simple - no cross-canister calls
        get_user_equity(station_id, voter) as u64
    } else {
        // DAO station: query Kong Locker (returns VP in dollars × 100)
        // This is ASYNC - uses existing Kong Locker integration
        get_kong_locker_vp(station_id, voter).await?
    };

    if voting_weight == 0 {
        return Err("No voting power in this station".to_string());
    }

    // Rest of voting logic (same for both types)...
    // Tally votes, check thresholds, approve in Orbit if passed, etc.
}
```

**Key Points:**
- Equity voting is **sync** (simple HashMap lookup of equity %)
- DAO voting is **async** (cross-canister Kong Locker call)
- Same voting logic handles both after getting weight
- **No changes to DAO voting** - just adding equity path
- Equity holders govern treasury, users, policies - everything

---

# PART 2: FRONTEND REQUIREMENTS (SEPARATE PR)

**⚠️ DO NOT IMPLEMENT UNTIL PART 1 BACKEND IS PROVEN IN PRODUCTION**

The following frontend requirements are for a separate PR after backend testing is complete. This prevents wasted UI work if backend needs iteration.

## New "Equity" Tab
Add a new tab to station detail pages for equity stations only (check `is_equity_station()` first).

**Tab Contents**:

1. **Equity Holders Table**
   - Columns: Principal, Equity %
   - Query: `get_equity_holders(station_id)`
   - Shows all current equity holders

2. **"Transfer Equity" Button** (conditional)
   - Only shows if current user has equity > 0
   - Opens modal with fields:
     - Buyer Principal (text input)
     - Percentage to transfer (1-100, number input)
     - ckUSDC Amount (number input)
     - Payment Destination (radio: "Seller Account" or "Station Treasury")
   - Calls: `create_equity_transfer_proposal()`

3. **Active Equity Transfer Proposals**
   - Query: `get_equity_transfer_proposals(station_id)`
   - Display cards showing:
     - Seller → Buyer
     - Percentage being transferred
     - ckUSDC amount
     - Status (Proposed/Approved/Executed/Expired)
     - Vote tally: `{yes_votes_pct}% Yes, {no_votes_pct}% No`
     - "Vote Yes" / "Vote No" buttons (if user has equity and hasn't voted)
     - "Execute Transfer" button (if status=Approved AND caller=buyer)

**Tab Visibility Logic**:
```typescript
const isEquityStation = await admin.is_equity_station(stationId);

// If equity station: show Equity tab
// If DAO station: no Equity tab (use existing tabs only)
```

## Key Flows

### 1. Create Equity Station
```
User → Backend.create_equity_station(station_id)
  ↓
Backend → verify_backend_is_station_admin(station_id)
  ↓
Backend → calls Admin.initialize_equity_station(station_id, user)
  ↓
Admin → validates caller is Backend
  ↓
Admin → creates EquityStationConfig in EQUITY_STATIONS
  ↓
Admin → allocates 100% equity to creator in EQUITY_HOLDERS
  ↓
Success ✓ (Creator can now see Equity tab with 100% ownership)
```

### 2. Equity Transfer Lifecycle (No Equity Locking)
```
Seller (30% equity) → Admin.create_equity_transfer_proposal(buyer, 10%, 1000 ckUSDC, treasury)
  ↓
Admin → validates seller has 30% ≥ 10% ✓
  ↓
Admin → checks seller has no other active proposal ✓
  ↓
Admin → creates proposal (status=Proposed, expires in 7 days)
  ↓
NOTE: Seller STILL has 30% voting power (equity not locked)
  ↓
Equity Holders → vote_on_equity_transfer(proposal_id, yes/no)
  ↓
Admin → weights votes by current equity % (seller can vote too!)
  ↓
Admin → tallies: yes_votes_pct += voter_equity
  ↓
75% threshold reached → status = Approved
  ↓
Buyer → manually sends 1000 ckUSDC to payment destination (trust-based)
  ↓
Buyer → execute_equity_transfer(proposal_id)
  ↓
Admin → re-checks seller STILL has ≥ 10% at execution time
  ↓
Admin → Seller: 30% - 10% = 20%
Admin → Buyer: 0% + 10% = 10%
  ↓
Admin → verifies total = 100% ✓
  ↓
Success ✓ (Equity transferred, now seller has 20%, buyer has 10%)
```

### 3. Regular Operations (Treasury/User Mgmt) with Equity Voting
```
Equity Holder → create_orbit_request_with_proposal(station_id, transfer_operation)
  ↓
Backend → creates Orbit request (same as DAO logic)
  ↓
Backend → calls Admin.create_unified_proposal()
  ↓
Admin → creates proposal (same structure as DAO proposals)
  ↓
Members → vote_on_proposal(station_id, request_id, vote)
  ↓
Admin → checks is_equity_station(station_id) → true
  ↓ (TRANSPARENT ROUTING)
Admin → gets voting_weight = get_user_equity(station_id, voter) → 30%
  ↓
Admin → tallies votes with equity percentages (no VP conversion)
  ↓
75% threshold reached → admin.submit_request_approval(Approved)
  ↓
Orbit Station executes treasury operation ✓
```

## Validation & Edge Cases

### Station Creation
- ✅ Only station admin (Backend) can enable equity
- ✅ Creator automatically gets 100%
- ✅ Can't initialize same station twice
- ✅ Stable storage survives canister upgrades

### Equity Transfers
- ✅ Percentage 1-100 only (whole numbers, simple accounting)
- ✅ Seller must have ≥ percentage being sold (checked at execution time)
- ✅ No per-seller proposal limit (execution check prevents over-selling)
- ✅ Proposals don't lock equity (seller can vote with full % during proposal)
- ✅ 75% approval threshold (out of 100 total equity)
- ✅ Vote tallies use `checked_add()` to panic on overflow (safety check)
- ✅ 7-day expiry (no cancellation - wait for expiry)
- ✅ Only buyer can execute
- ✅ Manual payment (trust-based MVP)
- ✅ After transfer: verify total = 100% (invariant check)

### Voting Power
- ✅ Equity stations: Use equity % directly (1-100, no scaling)
- ✅ DAO stations: Use Kong Locker VP (existing logic unchanged)
- ✅ Transparent routing via `is_equity_station()` check

## Testing Commands

### Setup Test Station
```bash
export TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"
export ADMIN="odkrm-viaaa-aaaap-qp2oq-cai"
export BACKEND="lwsav-iiaaa-aaaap-qp2qq-cai"

# Switch to daopad identity (has admin access to test station)
dfx identity use daopad
```

### Initialize Equity Station
```bash
# Call Backend to initialize (Backend verifies it's admin, then calls Admin)
dfx canister --network ic call $BACKEND create_equity_station "(principal \"$TEST_STATION\")"

# Verify initialization
dfx canister --network ic call $ADMIN is_equity_station "(principal \"$TEST_STATION\")"
# Expected: (true)

dfx canister --network ic call $ADMIN get_equity_holders "(principal \"$TEST_STATION\")"
# Expected: (vec { record { principal "..."; 100 : nat8 } })
```

### Create Equity Transfer Proposal
```bash
# Get second identity for buyer
dfx identity use buyer
export BUYER=$(dfx identity get-principal)

# Switch back to seller (creator with 100%)
dfx identity use daopad
export SELLER=$(dfx identity get-principal)

# Create proposal: Sell 20% for 1000 ckUSDC to treasury
dfx canister --network ic call $ADMIN create_equity_transfer_proposal "(
  principal \"$TEST_STATION\",
  principal \"$BUYER\",
  20 : nat8,
  1000 : nat64,
  variant { StationTreasury = principal \"$TEST_STATION\" }
)"
# Returns: (variant { Ok = "1234567890-abc..." })
export PROPOSAL_ID="<returned_id>"
```

### Vote on Equity Transfer
```bash
# Seller votes yes on their own proposal (has 100% equity)
dfx identity use daopad
dfx canister --network ic call $ADMIN vote_on_equity_transfer "(
  \"$PROPOSAL_ID\",
  true
)"
# Expected: (variant { Ok })

# Check proposal status
dfx canister --network ic call $ADMIN get_equity_transfer_proposal "(\"$PROPOSAL_ID\")"
# Expected: status = Approved (since seller has 100% > 75% threshold)
```

### Execute Transfer
```bash
# Buyer executes (after manually sending ckUSDC off-chain)
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
```

### Test Regular Proposal with Equity Voting
```bash
# Create a treasury transfer proposal (uses equity voting)
dfx canister --network ic call $BACKEND create_orbit_request_with_proposal "(
  principal \"$TEST_STATION\",
  variant { Transfer = record { ... } }
)"

# Vote on it (Admin will use get_user_equity internally)
dfx canister --network ic call $ADMIN vote_on_proposal "(
  principal \"$TEST_STATION\",
  \"<request_id>\",
  variant { Yes }
)"
# Voting weight = caller's equity % (80% for seller, 20% for buyer)
```

## Success Criteria (Backend MVP Complete)

The backend implementation is considered complete and production-ready when ALL of these dfx commands work correctly:

### 1. Initialize Equity Station
```bash
export TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"
export BACKEND="lwsav-iiaaa-aaaap-qp2qq-cai"
export ADMIN="odkrm-viaaa-aaaap-qp2oq-cai"

dfx identity use daopad
dfx canister --network ic call $BACKEND create_equity_station "(principal \"$TEST_STATION\")"
# Expected: (variant { Ok })
```

### 2. Verify Creator Has 100% Equity
```bash
dfx canister --network ic call $ADMIN get_equity_holders "(principal \"$TEST_STATION\")"
# Expected: (vec { record { principal "<creator>"; 100 : nat8 } })

dfx canister --network ic call $ADMIN is_equity_station "(principal \"$TEST_STATION\")"
# Expected: (true)
```

### 3. Create Equity Transfer Proposal
```bash
dfx identity use buyer
export BUYER=$(dfx identity get-principal)

dfx identity use daopad  # Seller with 100% equity
dfx canister --network ic call $ADMIN create_equity_transfer_proposal "(
  principal \"$TEST_STATION\",
  principal \"$BUYER\",
  20 : nat8,
  1000 : nat64,
  variant { StationTreasury = principal \"$TEST_STATION\" }
)"
# Expected: (variant { Ok = "proposal_id_string" })
```

### 4. Vote on Equity Transfer
```bash
export PROPOSAL_ID="<id_from_step_3>"

dfx canister --network ic call $ADMIN vote_on_equity_transfer "(\"$PROPOSAL_ID\", true)"
# Expected: (variant { Ok })

dfx canister --network ic call $ADMIN get_equity_transfer_proposal "(\"$PROPOSAL_ID\")"
# Expected: status = Approved (since seller has 100% > 75% threshold)
```

### 5. Execute Equity Transfer
```bash
dfx identity use buyer
dfx canister --network ic call $ADMIN execute_equity_transfer "(\"$PROPOSAL_ID\")"
# Expected: (variant { Ok })

# Verify equity balances changed correctly
dfx canister --network ic call $ADMIN get_equity_holders "(principal \"$TEST_STATION\")"
# Expected:
# vec {
#   record { principal "<seller>"; 80 : nat8 };  # 100 - 20
#   record { principal "<buyer>"; 20 : nat8 }    # 0 + 20
# }
```

### 6. Vote on Regular Orbit Proposal (CRITICAL - Tests Voting Integration)
```bash
# Create a regular Orbit Station proposal (treasury transfer, user management, etc)
dfx canister --network ic call $BACKEND create_orbit_request_with_proposal "(
  principal \"$TEST_STATION\",
  variant { Transfer = record { ... } }
)"
# Returns: request_id

# Vote using equity percentage (tests is_equity_station routing)
dfx identity use daopad  # Has 80% equity
dfx canister --network ic call $ADMIN vote_on_proposal "(
  principal \"$TEST_STATION\",
  \"<request_id>\",
  variant { Yes }
)"
# Expected: Vote recorded with weight = 80
# This proves equity voting integration works for ALL proposals, not just equity transfers
```

**✅ If all 6 test sequences pass, backend is production-ready and frontend can start.**

## Implementation Order

### PART 1: BACKEND IMPLEMENTATION (THIS PR)

**Goal**: Complete backend with dfx testing. Frontend comes after backend proven in production.

1. **Admin types** (`admin/src/proposals/types.rs`)
   - Add equity structs: `EquityStationConfig`, `EquityTransferProposal`, etc.
   - Use `u8` for vote tallies (will use `checked_add()`)
   - Add to candid exports

2. **Admin storage** (`admin/src/storage/state.rs`)
   - Set up stable memory manager
   - Initialize 4 StableBTreeMaps (stations, holders, proposals, votes)
   - Use MemoryIds 10-13 (avoid conflicts)

3. **Admin equity methods** (`admin/src/equity/mod.rs` - NEW FILE)
   - Implement all equity methods from plan
   - `initialize_equity_station` (only callable by Backend)
   - `create_equity_transfer_proposal` (NO one-proposal-per-seller check)
   - `vote_on_equity_transfer` (use `checked_add()` for vote tallies)
   - `execute_equity_transfer` (with invariant check: total must = 100%)
   - All query methods (`get_equity_holders`, `is_equity_station`, etc)

4. **Backend initialization** (`daopad_backend/src/api/equity.rs` - NEW FILE)
   - Implement `create_equity_station()` - simple wrapper
   - NO admin verification - Admin will verify caller == Backend
   - Proper cross-canister error handling

5. **Admin voting integration** (`admin/src/proposals/voting.rs`) **← CRITICAL**
   - Modify `vote_on_proposal()` to check `is_equity_station()`
   - Route to `get_user_equity()` (sync) OR `get_kong_locker_vp()` (async)
   - This allows equity holders to vote on ALL proposals (treasury, users, etc)

6. **Candid interfaces**
   - `admin/admin.did` - add all equity methods
   - `daopad_backend/daopad_backend.did` - add `create_equity_station`
   - Regenerate with candid-extractor

7. **Deploy backend** (generates new declarations)
   ```bash
   ./deploy.sh --network ic --backend-only
   ```

8. **Sync declarations** (CRITICAL - prevents "method not found" errors)
   ```bash
   cp -r src/declarations/admin/* src/daopad/daopad_frontend/src/declarations/admin/
   cp -r src/declarations/daopad_backend/* src/daopad/daopad_frontend/src/declarations/daopad_backend/
   ```

9. **Test with dfx** (see "Success Criteria" section above)
   - Run all 6 test sequences
   - Verify equity transfers work
   - Verify regular Orbit voting works with equity routing
   - All tests must pass before proceeding to Part 2

**✅ Part 1 Complete When**: All dfx tests in Success Criteria pass

---

### PART 2: FRONTEND IMPLEMENTATION (SEPARATE PR)

**⚠️ DO NOT START UNTIL PART 1 BACKEND PROVEN IN PRODUCTION**

The following frontend work should be done as a separate PR after backend testing is complete:

10. **Frontend Equity tab** (`daopad_frontend/src/components/EquityTab.tsx` - NEW FILE)
    - Check `is_equity_station()` on station page load
    - Add tab conditionally if true
    - Implement equity holders table
    - Implement transfer proposal UI
    - Implement voting UI
    - See "Frontend Requirements" section below for details

11. **Deploy frontend**
    ```bash
    ./deploy.sh --network ic --frontend-only
    ```

12. **Browser testing**
    - Test equity tab appears for equity stations
    - Test transfer proposal creation
    - Test voting on equity transfers
    - Test equity holders can vote on regular proposals

## Design Decisions (Finalized)

### 1. Separate UI (Not Zero Distinction)
- Equity stations have dedicated "Equity" tab
- Shows ownership percentages (1-100%)
- Transfer equity UI only visible to equity holders
- Regular proposal voting UI works for both types (transparent routing)

### 2. Direct Transfers (No Dilution, No Locking)
- Simple math: Seller -= X%, Buyer += X%
- Proposals don't lock equity (seller can vote during proposal)
- No per-seller proposal limit (execution check prevents over-selling)
- Easy to verify: total always = 100%

### 3. 100 Shares System
- Percentages 1-100 (whole numbers only)
- No fractional equity (keep it simple)
- Clear, simple accounting
- 3-way equal split = 33%, 33%, 34% (acceptable)

### 4. Manual Payment (MVP)
- Buyer sends ckUSDC manually before executing
- Trust-based (no automated verification)
- Documented in UI ("You must send payment before executing")
- Future: Check treasury balance deltas

### 5. Stable Storage from Day 1
- Use `ic_stable_structures::StableBTreeMap`
- Data survives canister upgrades
- No migration needed later
- MemoryIds 10-13 for equity data

### 6. 75% Approval Threshold
- Same as critical DAO operations
- Ensures broad consensus for equity changes
- High bar for ownership transfers (protects minority holders)

### 7. 7-Day Proposal Expiry
- Consistent with treasury proposals
- No cancellation mechanism (wait for expiry)
- If proposal needs changes, create new one after expiry
- Keeps proposals time-bound

### 8. No VP Scaling for Equity
- Equity stations: Use raw percentages (1-100)
- DAO stations: Use Kong Locker VP (dollars × 100)
- Both work with same voting logic (just different weight sources)

### 9. Separation of Concerns
- Backend: Simple initialization wrapper (no admin verification)
- Admin: ALL equity logic (storage, proposals, voting) + verifies Backend caller
- Orbit Station: Treasury + execution (unchanged)
- Frontend: Equity tab for equity stations only (Part 2)
