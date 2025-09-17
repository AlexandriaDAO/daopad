# DAOPad Orbit Station Refactoring Plan

## Executive Summary
Remove all Orbit Station creation code and replace with a proposal-based linking system where users create stations via Orbit's official tools, then propose linking them to tokens through a DAO voting mechanism.

## Why This Change?

### Current Problems:
1. **WASM Size Limits**: Combined Station + Upgrader WASM exceeds IC's 10MB install limit
   - We use compressed WASM (.gz) but IC expects uncompressed
   - Uncompressed: Station (8.8MB) + Upgrader (1.6MB) = 10.4MB > 10MB limit
   - Even with `ic-wasm shrink` optimization, still too large
2. **Cycle Drain**: Each failed attempt costs 6.5T cycles (~$10)
   - 1.5T for canister creation
   - 1T for upgrader deployment
   - 5T for station operations
3. **Initialization Failures**: Stations stuck in "Uninitialized" state
   - Retry loops don't actually delay (all 30 attempts happen instantly)
   - Station can't deploy upgrader due to insufficient cycles or WASM issues
4. **Against Orbit's Design**: Orbit uses Control Panel with `install_chunked_code`
   - Their Control Panel pays all cycles for users (free creation)
   - They split large WASM into chunks to bypass size limits
   - We don't have chunked installation capability

### New Approach Benefits:
- Users create stations free via Orbit's Control Panel
- No cycle costs for DAOPad
- Guaranteed working stations (Orbit handles complexity)
- Democratic approval via DAO voting
- Simpler, more maintainable code
- **CLEAN SLATE**: No backward compatibility needed, fresh start

## Files to Modify

### 1. Remove Station Creation Code

**File: `daopad_backend/src/orbit/station.rs`**
- DELETE entire file (handles station creation, WASM deployment, health checks)

**File: `daopad_backend/src/orbit/management.rs`**
- DELETE entire file (canister creation, cycle management)

**File: `daopad_backend/src/orbit/mod.rs`**
- DELETE entire file (just exports, nothing left after deletions)

**Directory: `daopad_backend/wasms/`**
- DELETE entire directory containing:
  - `station.wasm` / `station.wasm.gz`
  - `upgrader.wasm` / `upgrader.wasm.gz`

**File: `daopad_backend/src/api/orbit.rs`**
- DELETE functions:
  - `create_token_orbit_station()` (lines 11-40)
  - `test_create_orbit_station()` (lines 42-76)
- KEEP functions unchanged:
  - `get_orbit_station_for_token()` - Returns None until proposals approved
  - `list_all_orbit_stations()` - Returns empty until proposals approved
  - `join_orbit_station()` - Works as-is, checks TOKEN_ORBIT_STATIONS
  - `get_my_locked_tokens()` - Kong Locker integration unchanged

### 2. Add Proposal System

**New File: `daopad_backend/src/proposals/mod.rs`**
```rust
pub mod orbit_link;
pub mod voting;
pub mod storage;
```

**New File: `daopad_backend/src/proposals/orbit_link.rs`**
```rust
use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::time;
use std::collections::BTreeSet;

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct OrbitLinkProposal {
    pub id: u64,
    pub token_canister_id: Principal,
    pub station_id: Principal,
    pub proposer: Principal,
    pub created_at: u64,
    pub expires_at: u64,  // 7 days from creation
    pub yes_votes: u64,   // Weighted by voting power
    pub no_votes: u64,    // Weighted by voting power
    pub total_voting_power: u64,  // Total VP for this token
    pub voters: BTreeSet<Principal>,
    pub status: ProposalStatus,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum ProposalStatus {
    Active,
    Approved,
    Rejected,
    Expired,
}

// Key functions to implement:
pub async fn propose_orbit_link(
    token_canister_id: Principal,
    station_id: Principal,
) -> Result<u64, String> {
    // 1. Check no existing station for token in TOKEN_ORBIT_STATIONS
    // 2. Check no active proposal for token in ORBIT_PROPOSALS
    // 3. Verify DAOPad backend is admin of station (cross-canister call)
    // 4. Get total voting power for token from Kong Locker
    // 5. Create proposal with 7-day expiry
}

pub async fn vote_on_proposal(
    proposal_id: u64,
    vote: bool,
) -> Result<(), String> {
    // 1. Get proposal, verify Active status
    // 2. Check voter hasn't voted (in voters set)
    // 3. Get voter's power via kong_locker::get_user_voting_power_for_token()
    // 4. Add to yes_votes or no_votes
    // 5. If yes_votes > (total_voting_power / 2), approve immediately
    // 6. Store in TOKEN_ORBIT_STATIONS, reject other proposals for token
}
```

**New File: `daopad_backend/src/proposals/voting.rs`**
```rust
use crate::kong_locker::voting::get_user_voting_power_for_token;

pub async fn calculate_voting_result(proposal: &OrbitLinkProposal) -> bool {
    proposal.yes_votes > (proposal.total_voting_power / 2)
}

pub async fn get_total_voting_power_for_token(token: Principal) -> u64 {
    // Query Kong Locker for total VP across all users
    // This might need a new Kong Locker endpoint
}
```

### 3. Update Storage

**File: `daopad_backend/src/storage/state.rs`**
ADD:
```rust
thread_local! {
    // One active proposal per token (enforce at creation)
    pub static ORBIT_PROPOSALS: RefCell<BTreeMap<StorablePrincipal, OrbitLinkProposal>> = RefCell::new(BTreeMap::new());

    // Keep existing TOKEN_ORBIT_STATIONS for approved mappings
    // Will be empty initially (clean slate)
}
```

### 4. New API Endpoints

**File: `daopad_backend/src/api/proposals.rs`** (NEW)
```rust
use crate::proposals::orbit_link::{propose_orbit_link, vote_on_proposal};
use crate::storage::state::ORBIT_PROPOSALS;

#[update]
async fn propose_orbit_station_link(
    token_canister_id: Principal,
    station_id: Principal
) -> Result<u64, String> {
    let caller = ic_cdk::caller();

    // Implementation delegates to propose_orbit_link()
    propose_orbit_link(token_canister_id, station_id).await
}

#[update]
async fn vote_on_orbit_proposal(
    proposal_id: u64,
    vote: bool
) -> Result<(), String> {
    let caller = ic_cdk::caller();

    // Implementation delegates to vote_on_proposal()
    vote_on_proposal(proposal_id, vote).await
}

#[query]
fn get_active_proposal_for_token(token: Principal) -> Option<OrbitLinkProposal> {
    ORBIT_PROPOSALS.with(|p| {
        p.borrow().get(&StorablePrincipal(token)).cloned()
    })
}

#[update]
async fn cleanup_expired_proposals() -> Result<u32, String> {
    // Mark expired proposals, remove from storage
    // Return count of cleaned proposals
}
```

### 5. Update Main Library

**File: `daopad_backend/src/lib.rs`**
```rust
// Remove:
mod orbit;

// Add:
mod proposals;

// Update exports accordingly
```

### 6. Frontend Interface Updates

**File: `daopad_frontend/src/services/daopadBackend.js`**
- Remove IDL definitions for:
  - `CreateTokenStationRequest`
  - `OrbitStationResponse`
  - `create_token_orbit_station`
- Add IDL definitions for:
  - `OrbitLinkProposal`
  - `propose_orbit_station_link`
  - `vote_on_orbit_proposal`
  - `get_active_proposal_for_token`

### 7. Clean Up Types

**File: `daopad_backend/src/types/orbit.rs`**
- DELETE types:
  - `CreateTokenStationRequest`
  - `OrbitStationResponse`
  - `SystemInit`, `SystemInstall`, etc. (all Orbit init types)
  - `HealthStatus`
- KEEP types:
  - User/member related types for `join_orbit_station`

## Implementation Logic

### Proposal Creation Flow:
```
1. User calls propose_orbit_station_link(token_id, station_id)
2. System verifies:
   - No existing station for token (TOKEN_ORBIT_STATIONS empty for token)
   - No active proposal for token (only one proposal per token allowed)
   - DAOPad is admin of station (cross-canister call to station)
   - Caller has minimum voting power (reuse Kong Locker logic)
3. Create proposal with:
   - 7-day expiry (604800 seconds from now)
   - Total voting power for token (query Kong Locker)
   - Status: Active
4. Store in ORBIT_PROPOSALS by token_canister_id
```

### Voting Flow:
```
1. User calls vote_on_orbit_proposal(proposal_id, yes/no)
2. System:
   - Gets proposal from ORBIT_PROPOSALS
   - Verifies still Active and not expired
   - Gets user's voting power via get_user_voting_power_for_token()
   - Adds power to yes_votes or no_votes
   - Adds user to voters set
3. If yes_votes > 50% of total_voting_power:
   - Store station_id in TOKEN_ORBIT_STATIONS[token_id]
   - Mark proposal as Approved
   - Remove from ORBIT_PROPOSALS (or mark completed)
```

### Admin Verification:
```rust
async fn verify_backend_is_admin(station_id: Principal) -> Result<bool, String> {
    let backend_id = ic_cdk::id();

    // Call Orbit Station to check admin status
    let result: Result<(SystemInfo,), _> = ic_cdk::call(
        station_id,
        "system_info",
        ()
    ).await;

    // Parse result to check if backend_id is in admin list
    // Return true if admin, false otherwise
}
```

## Kong Locker Integration (UNCHANGED)

The proposal system reuses ALL existing Kong Locker logic:
- `get_user_voting_power_for_token()` - For weighted voting
- `check_minimum_voting_power_for_token()` - For proposal creation
- `get_kong_locker_for_user()` - For user verification
- All files in `daopad_backend/src/kong_locker/` remain unchanged

## Security Considerations

1. **One Proposal Per Token**: Enforce in `propose_orbit_link()`
2. **No Double Voting**: Track in `voters: BTreeSet<Principal>`
3. **Admin Verification**: Must verify before proposal creation
4. **Expiry Enforcement**: Check timestamp in vote function
5. **50% Threshold**: Strict majority of total voting power

## Clean Slate Approach

- **NO DATA MIGRATION**: Start completely fresh
- **NO BACKWARD COMPATIBILITY**: Delete all old station mappings
- TOKEN_ORBIT_STATIONS starts empty
- ORBIT_PROPOSALS starts empty
- All existing stations (if any) are abandoned

## Testing Strategy

1. Local deployment with clean state
2. Create station via Orbit Control Panel
3. Add DAOPad backend as admin to station
4. Test proposal creation
5. Test voting with different VP amounts
6. Test auto-approval at >50%
7. Test expiry after 7 days

## After Refactor: Candid Generation

```bash
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did
```

## Benefits Summary

- **Cost**: Zero cycles for DAOPad (users create via Orbit)
- **Reliability**: Stations always work (Orbit handles it)
- **Simplicity**: ~500 lines vs ~1500 lines of code
- **Democratic**: Community decides which stations to adopt
- **No WASM handling**: No size limits, no compression issues
- **No retry loops**: No initialization failures

## Files Summary

**DELETE (Complete removal):**
- `orbit/` entire directory
- `wasms/` entire directory
- Station creation functions in `api/orbit.rs`
- Orbit init types in `types/orbit.rs`

**ADD (New files):**
- `proposals/` module (3 files)
- `api/proposals.rs` (4 endpoints)

**MODIFY (Minor changes):**
- `lib.rs` - Update module imports
- `storage/state.rs` - Add ORBIT_PROPOSALS storage
- `types/` - Add proposal types

**UNCHANGED (Keep as-is):**
- All Kong Locker code
- `join_orbit_station()` function
- Query functions for stations
- Frontend will be updated separately

Total estimated: ~1000 lines removed, ~500 lines added = 50% code reduction