# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-simplify-station-linking/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-simplify-station-linking/src/daopad`
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
   git commit -m "Simplify: Remove voting for station linking, make it direct"
   git push -u origin feature/simplify-station-linking
   gh pr create --title "Simplify: Remove Station Linking Proposals" --body "Implements SIMPLIFY_STATION_LINKING.md - Station linking is now immediate with VP check (10K min), not community vote."
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

**Branch:** `feature/simplify-station-linking`
**Worktree:** `/home/theseus/alexandria/daopad-simplify-station-linking/src/daopad`

---

# Implementation Plan: Simplify Station Linking

## Problem Statement

Station linking currently uses a complex voting proposal system with:
- 7-day voting periods
- 50% voting power threshold
- Proposal storage (`ORBIT_PROPOSALS`)
- Vote tracking per user

**This is unnecessary.** Station linking is administrative setup, not governance. Only **proposals within Orbit** (treasury transfers, user management) need community voting.

## Solution

**Make station linking a simple, immediate action:**
1. User with 10K+ VP clicks "Link Station"
2. Backend verifies permissions and station availability
3. Station is immediately linked (no vote)
4. User can start creating treasury proposals

**Voting happens INSIDE Orbit Station for actual operations.**

---

## Current State

### Backend Files Structure

**TO DELETE (396 lines removed):**
- `daopad_backend/src/proposals/orbit_link.rs` (357 lines)
- `daopad_backend/src/proposals/storage.rs` (52 lines)

**TO MODIFY:**
- `daopad_backend/src/storage/state.rs` - Remove `ORBIT_PROPOSALS` storage
- `daopad_backend/src/api/proposals.rs` - Replace proposal endpoints with simple link
- `daopad_backend/src/proposals/mod.rs` - Remove orbit_link/storage modules
- `daopad_backend/src/api/orbit_overview.rs` - Remove ORBIT_PROPOSALS counting
- `daopad_backend/src/lib.rs` - Remove OrbitLinkProposal export
- `daopad_backend/src/api/mod.rs` - Add new stations module

**TO CREATE:**
- `daopad_backend/src/api/stations.rs` - New simple link_orbit_station function

### Frontend Files

**TO MODIFY:**
- `daopad_frontend/src/services/backend/tokens/TokenService.ts` - Rename `proposeStationLink` → `linkStation`
- `daopad_frontend/src/services/backend/proposals/ProposalService.ts` - Remove `getActiveForToken`
- `daopad_frontend/src/routes/DaoRoute.tsx` - Update UI text (remove "proposal" language)

### Key Code Locations

**Backend - Station linking logic:**
- `daopad_backend/src/proposals/orbit_link.rs:31-120` - `propose_orbit_link` (will be simplified)
- `daopad_backend/src/proposals/orbit_link.rs:265-315` - `verify_backend_is_admin` (KEEP THIS)
- `daopad_backend/src/storage/state.rs:48` - `ORBIT_PROPOSALS` storage (DELETE)

**Frontend - User flow:**
- `daopad_frontend/src/routes/DaoRoute.tsx:185-233` - `handleLinkStation` function
- `daopad_frontend/src/routes/DaoRoute.tsx:254-288` - UI text about proposals

---

## Implementation Steps

### Step 1: Create New Simple Station Linking API

**File:** `daopad_backend/src/api/stations.rs` (NEW)

```rust
// PSEUDOCODE
use candid::Principal;
use ic_cdk::update;
use crate::storage::state::{TOKEN_ORBIT_STATIONS, STATION_TO_TOKEN};
use crate::types::StorablePrincipal;
use crate::kong_locker::voting::get_user_voting_power_for_token;

/// Link an Orbit Station to a token (immediate action, no voting)
/// Requires: 10K+ VP, station admin access, station not already linked
#[update]
pub async fn link_orbit_station(
    token_canister_id: Principal,
    station_id: Principal,
) -> Result<(), String> {
    let caller = ic_cdk::caller();

    // 1. Authentication check
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    // 2. Minimum voting power check (10,000 VP)
    const MINIMUM_VP: u64 = 10_000;
    let caller_power = get_user_voting_power_for_token(caller, token_canister_id).await?;

    if caller_power < MINIMUM_VP {
        return Err(format!(
            "Insufficient voting power. You have {} VP but need {} VP to link a station",
            caller_power, MINIMUM_VP
        ));
    }

    // 3. Check no existing station for this token
    if TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow().contains_key(&StorablePrincipal(token_canister_id))
    }) {
        return Err("An Orbit Station is already linked to this token".to_string());
    }

    // 4. Check station not already linked to another token
    if let Some(existing_token) = STATION_TO_TOKEN.with(|stations| {
        stations.borrow()
            .get(&StorablePrincipal(station_id))
            .map(|t| t.0)
    }) {
        return Err(format!(
            "This Orbit Station is already linked to token {}. Each station can only manage one token.",
            existing_token
        ));
    }

    // 5. Verify DAOPad backend is admin of this station
    verify_backend_is_admin(station_id).await?;

    // 6. Link the station (insert into both mappings)
    TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow_mut().insert(
            StorablePrincipal(token_canister_id),
            StorablePrincipal(station_id),
        );
    });

    STATION_TO_TOKEN.with(|stations| {
        stations.borrow_mut().insert(
            StorablePrincipal(station_id),
            StorablePrincipal(token_canister_id),
        );
    });

    ic_cdk::println!(
        "Station {} linked to token {} by user {}",
        station_id, token_canister_id, caller
    );

    Ok(())
}

/// Verify DAOPad backend is admin of the Orbit Station
/// (Copied from orbit_link.rs - this function is still needed)
async fn verify_backend_is_admin(station_id: Principal) -> Result<bool, String> {
    use crate::types::orbit::{MeResult, UserPrivilege};

    let backend_id = ic_cdk::id();

    // Call Orbit Station's me() method to check our privileges
    let result: Result<(MeResult,), _> = ic_cdk::call(station_id, "me", ()).await;

    match result {
        Ok((MeResult::Ok { me, privileges },)) => {
            let is_admin = privileges.contains(&UserPrivilege::ManageSystemInfo);

            if is_admin {
                Ok(true)
            } else {
                Err(format!(
                    "DAOPad backend {} is not an admin of station {}. User: {}",
                    backend_id, station_id, me.name
                ))
            }
        }
        Ok((MeResult::Err(e),)) => {
            let error_msg = e.message.unwrap_or_else(|| e.code.clone());
            if e.code.contains("USER_NOT_FOUND") || error_msg.contains("not exist as a user") {
                Err(format!(
                    "DAOPad backend is not a member of the Orbit Station. \
                    Please add principal {} as a member with Admin role to station {} first. \
                    Go to https://{}.icp0.io > Members > Add Member",
                    backend_id, station_id, station_id
                ))
            } else {
                Err(format!("Failed to verify admin status: {}", error_msg))
            }
        }
        Err((_code, msg)) if msg.contains("does not exist as a user") => {
            Err(format!(
                "DAOPad backend is not a member of the Orbit Station. \
                Please add principal {} as a member with Admin role to station {} first. \
                Go to https://{}.icp0.io > Members > Add Member",
                backend_id, station_id, station_id
            ))
        }
        Err((code, msg)) => Err(format!(
            "Failed to call Orbit Station: {:?} - {}",
            code, msg
        )),
    }
}
```

### Step 2: Update API Module to Export New Endpoint

**File:** `daopad_backend/src/api/mod.rs`

```rust
// PSEUDOCODE - Add to existing file
pub mod stations;  // NEW MODULE

// Export the link function
pub use stations::link_orbit_station;
```

### Step 3: Delete Proposal-Specific Endpoints

**File:** `daopad_backend/src/api/proposals.rs`

```rust
// PSEUDOCODE - DELETE these endpoints:
// - propose_orbit_station_link
// - vote_on_orbit_proposal
// - get_active_proposal_for_token (orbit link specific)
// - list_active_proposals (orbit link specific)
// - cleanup_expired_proposals

// KEEP: Other proposal functions for unified Orbit operations (if any)
```

**ACTUAL CHANGE:** Delete lines 1-35 (entire file if only orbit link functions)

### Step 4: Remove Proposal Storage

**File:** `daopad_backend/src/storage/state.rs`

```rust
// PSEUDOCODE - DELETE these lines:
use crate::proposals::orbit_link::OrbitLinkProposal;  // Line 1

pub static ORBIT_PROPOSALS: RefCell<BTreeMap<...>> = ...;  // Line 48
```

**ACTUAL CHANGE:**
- Delete line 1: `use crate::proposals::orbit_link::OrbitLinkProposal;`
- Delete lines 44-48 (ORBIT_PROPOSALS storage and comment)

### Step 5: Update Proposals Module

**File:** `daopad_backend/src/proposals/mod.rs`

```rust
// PSEUDOCODE - DELETE these modules:
pub mod orbit_link;  // DELETE
pub mod storage;     // DELETE

// KEEP: unified, types, voting (for actual Orbit operation proposals)
```

**ACTUAL CHANGE:** Delete lines 1-2

### Step 6: Remove Proposal Counting from Overview

**File:** `daopad_backend/src/api/orbit_overview.rs`

```rust
// PSEUDOCODE - Remove ORBIT_PROPOSALS usage

// Line 5: DELETE import
use crate::storage::state::{TOKEN_ORBIT_STATIONS};  // Remove ORBIT_PROPOSALS

// Lines 101-107: DELETE proposal counting in count_active_proposals
fn count_active_proposals(token_id: Principal) -> u64 {
    // Just return 0 since no orbit link proposals exist anymore
    // Other proposal types counted elsewhere
    0
}
```

**ACTUAL CHANGE:**
- Line 5: Remove `, ORBIT_PROPOSALS` from import
- Lines 100-109: Replace with `0` (no link proposals to count)

### Step 7: Remove Public Exports

**File:** `daopad_backend/src/lib.rs`

```rust
// PSEUDOCODE - DELETE these exports:
pub use proposals::orbit_link::{OrbitLinkProposal, ProposalStatus};

// KEEP: Other proposal exports (unified, types)
```

**ACTUAL CHANGE:** Delete the line that exports OrbitLinkProposal and ProposalStatus

### Step 8: Delete Old Files

**Files to DELETE entirely:**
1. `daopad_backend/src/proposals/orbit_link.rs` (357 lines)
2. `daopad_backend/src/proposals/storage.rs` (52 lines)

```bash
rm daopad_backend/src/proposals/orbit_link.rs
rm daopad_backend/src/proposals/storage.rs
```

### Step 9: Update Frontend Service

**File:** `daopad_frontend/src/services/backend/tokens/TokenService.ts`

```javascript
// PSEUDOCODE - Rename and simplify method

// OLD (lines 84-97):
async proposeStationLink(tokenId, stationId) {
    const result = await actor.propose_orbit_station_link(tokenPrincipal, stationPrincipal);
    return this.wrapResult(result);
}

// NEW:
async linkStation(tokenId, stationId) {
    const actor = await this.getActor();
    const tokenPrincipal = this.toPrincipal(tokenId);
    const stationPrincipal = this.toPrincipal(stationId);
    const result = await actor.link_orbit_station(tokenPrincipal, stationPrincipal);
    return this.wrapResult(result);
}
```

**ACTUAL CHANGE:** Lines 86-96 - Rename function and update actor call

### Step 10: Remove Proposal Service Method

**File:** `daopad_frontend/src/services/backend/proposals/ProposalService.ts`

```javascript
// PSEUDOCODE - DELETE getActiveForToken method (lines 76-87)
// This was only for orbit link proposals

// KEEP: Other proposal methods for unified Orbit operations
```

**ACTUAL CHANGE:** Delete lines 74-87 (`getActiveForToken` method and comment)

### Step 11: Update Frontend UI

**File:** `daopad_frontend/src/routes/DaoRoute.tsx`

```javascript
// PSEUDOCODE - Update handleLinkStation function

// Line 214: Change from proposeStationLink to linkStation
const result = await tokenService.linkStation(tokenPrincipal, stationPrincipal);

// Lines 216-223: Update success message
if (result.success) {
    // Success - station is now linked (no voting needed)
    setShowLinkDialog(false);
    setLinkStationId('');
    setLinkError('');

    // Redirect to station route
    window.location.href = `/${linkStationId.trim()}`;
}

// Lines 325-327: Update dialog description
<DialogDescription className="text-executive-lightGray">
    Link an Orbit Station to {token.symbol}.
    Requires 10,000+ voting power.
</DialogDescription>

// Line 279-281: Update UI text (remove "proposal" language)
<p className="text-executive-lightGray/80">
    You have sufficient voting power to link this token to an Orbit Station.
</p>

// Line 284: Update button text
{isAuthenticated ? 'Link Orbit Station' : 'Login to Link Station'}

// Line 384: Update button text in dialog
{linking ? 'Linking Station...' : 'Link Station'}
```

**ACTUAL CHANGES:**
- Line 214: `tokenService.proposeStationLink` → `tokenService.linkStation`
- Lines 279-281: Remove "enable DAO governance" (it's just linking)
- Line 284: Keep same (already correct)
- Lines 325-327: Remove "community approval via weighted voting" text
- Line 384: "Create Proposal" → "Link Station"

---

## Testing Strategy

### Backend Testing

**1. Build and extract Candid:**
```bash
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
```

**2. Verify new endpoint exists:**
```bash
grep "link_orbit_station" daopad_backend/daopad_backend.did
# Expected: link_orbit_station : (principal, principal) -> (variant { Ok : null; Err : text });
```

**3. Verify old endpoints removed:**
```bash
grep "propose_orbit_station_link" daopad_backend/daopad_backend.did
grep "vote_on_orbit_proposal" daopad_backend/daopad_backend.did
# Expected: No matches
```

**4. Deploy backend:**
```bash
./deploy.sh --network ic --backend-only
```

**5. Test linking with test station:**
```bash
# Use test identity with 10K+ VP
dfx --identity daopad canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai link_orbit_station '(
    principal "ryjl3-tyaaa-aaaaa-aaaba-cai",  # ICP token
    principal "fec7w-zyaaa-aaaaa-qaffq-cai"   # Test station
)'

# Expected: (variant { Ok })
# Or: Err with clear message if station already linked, insufficient VP, or not admin
```

### Frontend Testing

**1. Sync declarations:**
```bash
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
```

**2. Build frontend:**
```bash
cd daopad_frontend
npm run build
cd ..
```

**3. Deploy frontend:**
```bash
./deploy.sh --network ic --frontend-only
```

**4. Manual browser testing:**
```bash
# Open: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/ryjl3-tyaaa-aaaaa-aaaba-cai
# (ICP token page - assuming no station linked yet)

# Expected UI:
# - "Link Orbit Station" button (not "Create Proposal")
# - Dialog says "Link an Orbit Station" (not "Create a governance proposal")
# - Button says "Link Station" (not "Create Proposal")
# - After clicking: Immediate redirect or error (no "proposal created" message)
```

**5. Console error check:**
```javascript
// Open browser console
// Expected: No errors like "actor.propose_orbit_station_link is not a function"
// Expected: linkStation calls work correctly
```

### Exit Criteria

**STOP when ALL are true:**
1. ✅ Backend builds without errors
2. ✅ Candid shows `link_orbit_station` endpoint
3. ✅ Candid does NOT show proposal endpoints
4. ✅ Frontend builds without TypeScript errors
5. ✅ UI text updated (no "proposal" language)
6. ✅ Linking works in browser (or shows clear error)
7. ✅ No console errors about missing functions

**If any test fails:**
1. Read error message carefully
2. Check if declarations synced
3. Verify both backend and frontend deployed
4. Try reloading page with cache clear (Ctrl+Shift+R)
5. Check browser console for detailed errors

---

## Migration Notes

### Data Migration

**NO DATA MIGRATION NEEDED:**
- `ORBIT_PROPOSALS` storage is transient (regular BTreeMap, not stable memory)
- Proposals don't survive upgrades anyway
- Any pending proposals will be lost, but that's acceptable (they can re-link)

### Backward Compatibility

**BREAKING CHANGES (acceptable):**
- Old frontend versions will fail to link stations (actor method changed)
- Solution: Deploy frontend immediately after backend

**USER IMPACT:**
- Any pending station link proposals are abandoned
- Users must re-initiate linking (now instant!)
- Better UX: No waiting 7 days for votes

---

## Rollback Plan

**If something breaks:**

1. **Revert backend:**
   ```bash
   cd /home/theseus/alexandria/daopad
   git checkout master
   cd src/daopad
   cargo build --target wasm32-unknown-unknown --release -p daopad_backend
   ./deploy.sh --network ic --backend-only
   ```

2. **Revert frontend:**
   ```bash
   ./deploy.sh --network ic --frontend-only
   ```

**WARNING:** After reverting, station linking will require voting again. Don't revert unless absolutely necessary.

---

## Summary

**Lines removed:** ~400+ lines of proposal infrastructure
**Lines added:** ~100 lines of simple linking logic
**Net reduction:** ~300 lines (25% code reduction in proposals module)

**Benefits:**
- ✅ Station linking is instant (no 7-day wait)
- ✅ Simpler UX (one click, not "create proposal → wait → vote")
- ✅ Less code to maintain
- ✅ Voting happens where it should (inside Orbit for actual operations)
- ✅ Clear separation: DAOPad links stations, Orbit handles governance

**Testing:** Deploy to mainnet, test with ICP token + test station
