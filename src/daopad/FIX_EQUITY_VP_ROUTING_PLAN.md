# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-fix-equity-vp-routing/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-fix-equity-vp-routing/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Backend changes:
     ```bash
     cargo build --target wasm32-unknown-unknown --release -p admin --locked
     candid-extractor target/wasm32-unknown-unknown/release/admin.wasm > admin/admin.did
     cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
     candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
     ./deploy.sh --network ic --backend-only
     cp -r src/declarations/admin/* daopad_frontend/src/declarations/admin/
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
   git commit -m "Fix: Route VP display by station type (equity % vs Kong Locker)"
   git push -u origin feature/fix-equity-vp-routing
   gh pr create --title "Fix: Route VP Display Between Equity and Token Stations" --body "Implements FIX_EQUITY_VP_ROUTING_PLAN.md

   - Fresh admin reinstall (removes ALEX equity bug)
   - Re-initialize LLC with correct owner
   - Add unified VP query routing
   - Fix all frontend VP displays globally"
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

**Branch:** `feature/fix-equity-vp-routing`
**Worktree:** `/home/theseus/alexandria/daopad-fix-equity-vp-routing/src/daopad`

---

# Implementation Plan: Fix Equity VP Routing

## Task Classification
**BUG FIX**: Restore correct behavior
- ALEX showing equity tab (should be token-based with Kong Locker VP)
- LLCs showing 0 VP (should show equity % as VP globally)

## Root Cause
Admin canister has incorrect equity data from testing:
- ALEX treasury (fec7w-zyaaa-aaaaa-qaffq-cai) marked as equity station
- Should use Kong Locker VP, not equity percentages

## Solution Approach
**Fresh admin reinstall** (simplest, cleanest):
1. Reinstall admin canister (wipes all equity data)
2. Re-initialize only the LLC (6ulqe-qaaaa-aaaac-a4w3a-cai)
3. Add unified VP query that routes by station type
4. Fix all frontend VP displays to use unified query

---

## Current State Documentation

### Admin Canister Storage
**File**: `admin/src/storage/state.rs` (Lines 77-98)

Current stable storage (Memory IDs 10-13):
```rust
EQUITY_STATIONS: StableBTreeMap<Principal, EquityStationConfig>
  // Contains: fec7w... (ALEX - incorrect), 6ulqe... (LLC - correct)

EQUITY_HOLDERS: StableBTreeMap<(station_id, holder), u8>
  // Contains: ALEX with 80/20 split (incorrect), LLC with 100/0 (correct)

EQUITY_TRANSFER_PROPOSALS: StableBTreeMap<proposal_id, EquityTransferProposal>
  // Contains: Old test proposals

EQUITY_TRANSFER_VOTES: StableBTreeMap<(proposal_id, voter), VoteChoice>
  // Contains: Old test votes
```

### Voting Power Routing (CORRECT, NO CHANGES NEEDED)
**File**: `admin/src/proposals/unified.rs` (Lines 86-106)

Already routes correctly:
```rust
let voting_power = if is_equity_station(token_id) {
    get_user_equity(token_id, voter) as u64  // ✓ Correct
} else {
    get_user_voting_power_for_token(voter, token_id).await  // ✓ Correct
};
```

### Frontend VP Display Issues
**Files to investigate**: Need to find ALL VP displays:
- Activity tab: Shows "0 VP" for LLCs
- Proposal cards: May show incorrect VP
- User profile: May show VP
- Dashboard: May show VP

**Common pattern** (to be replaced):
```typescript
// WRONG: Direct Kong Locker query
const vp = await kongLocker.get_voting_power(user, token);

// CORRECT: Unified backend query (routes by station type)
const vp = await backend.get_voting_power_display(stationId, user);
```

---

## Implementation Steps

### STEP 1: Admin Canister - Add Unified VP Query

**File**: `admin/src/api/voting_power.rs` (NEW)
```rust
// PSEUDOCODE
use ic_cdk::api::call::call;
use candid::{CandidType, Principal};

#[derive(CandidType)]
pub struct VotingPowerResult {
    pub voting_power: u64,
    pub source: VotingPowerSource,
}

#[derive(CandidType)]
pub enum VotingPowerSource {
    Equity,      // From equity %
    KongLocker,  // From locked liquidity
}

#[query]
pub async fn get_voting_power_display(
    station_id: Principal,
    user: Principal
) -> Result<VotingPowerResult, String> {
    // Route by station type
    if crate::equity::is_equity_station(station_id) {
        // Equity station: return equity % as VP
        let equity_pct = crate::equity::get_user_equity(station_id, user);
        Ok(VotingPowerResult {
            voting_power: equity_pct as u64,
            source: VotingPowerSource::Equity,
        })
    } else {
        // Token station: query Kong Locker
        match crate::kong_locker::get_user_voting_power_for_token(user, station_id).await {
            Ok(vp) => Ok(VotingPowerResult {
                voting_power: vp,
                source: VotingPowerSource::KongLocker,
            }),
            Err(e) => Err(format!("Kong Locker query failed: {}", e)),
        }
    }
}
```

**File**: `admin/src/lib.rs`
```rust
// PSEUDOCODE - Add module
mod api;

// Export query
pub use api::voting_power::get_voting_power_display;
```

**File**: `admin/admin.did`
```candid
// PSEUDOCODE - Add to interface
type VotingPowerSource = variant {
  Equity;
  KongLocker;
};

type VotingPowerResult = record {
  voting_power: nat64;
  source: VotingPowerSource;
};

service : {
  // ... existing methods ...

  get_voting_power_display: (principal, principal) -> (variant { Ok: VotingPowerResult; Err: text }) query;
}
```

### STEP 2: Backend Canister - Wrapper Method

**File**: `daopad_backend/src/api/voting.rs` (NEW)
```rust
// PSEUDOCODE
use candid::Principal;
use ic_cdk::call;

#[update]
pub async fn get_voting_power_display(
    station_id: Principal,
    user: Principal
) -> Result<(u64, String), String> {
    let admin = Principal::from_text("odkrm-viaaa-aaaap-qp2oq-cai")
        .map_err(|e| format!("Invalid admin principal: {}", e))?;

    // Cross-canister call to admin
    let result: Result<(Result<VotingPowerResult, String>,), _> = call(
        admin,
        "get_voting_power_display",
        (station_id, user)
    ).await;

    match result {
        Ok((Ok(vp_result),)) => Ok((vp_result.voting_power, format!("{:?}", vp_result.source))),
        Ok((Err(e),)) => Err(e),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg))
    }
}
```

**File**: `daopad_backend/src/lib.rs`
```rust
// PSEUDOCODE - Add module
mod api;

// Export method
pub use api::voting::get_voting_power_display;
```

**File**: `daopad_backend/daopad_backend.did`
```candid
// PSEUDOCODE - Add to interface
service : {
  // ... existing methods ...

  get_voting_power_display: (principal, principal) -> (variant { Ok: record { nat64; text }; Err: text });
}
```

### STEP 3: Frontend - Replace ALL VP Queries

**Find all VP displays**:
```bash
cd daopad_frontend
rg "voting.power|votingPower|VP|get_voting_power" src/ --files-with-matches
```

**Common locations to check**:
- `src/routes/dao/DaoActivity.tsx`
- `src/components/orbit/UnifiedRequests.tsx`
- `src/components/dao/DaoLayout.tsx`
- Any proposal or voting components

**Pattern to replace** (PSEUDOCODE):
```typescript
// BEFORE (incorrect for equity stations)
const vp = await kongLockerService.get_voting_power(userPrincipal, tokenId);

// AFTER (routes correctly)
import { getBackendService } from '../services/backendService';

const backendService = getBackendService(identity);
const vpResult = await backendService.get_voting_power_display(stationId, userPrincipal);
const vp = vpResult.Ok[0];  // voting_power value
const source = vpResult.Ok[1];  // "Equity" or "KongLocker"
```

**Example fix for Activity tab** (find actual file first):
```typescript
// PSEUDOCODE for wherever "Your Voting Power: X VP" is rendered

function VotingPowerDisplay({ stationId, identity }) {
  const [votingPower, setVotingPower] = useState(0);
  const [source, setSource] = useState('');

  useEffect(() => {
    async function fetchVP() {
      const backendService = getBackendService(identity);
      const result = await backendService.get_voting_power_display(
        stationId,
        identity.getPrincipal()
      );

      if (result.Ok) {
        setVotingPower(result.Ok[0]);
        setSource(result.Ok[1]);
      }
    }
    fetchVP();
  }, [stationId, identity]);

  return (
    <div>
      Your Voting Power: {votingPower} VP
      {source === 'Equity' && <span>(from equity ownership)</span>}
      {source === 'KongLocker' && <span>(from locked liquidity)</span>}
    </div>
  );
}
```

### STEP 4: Build & Deploy Backend

```bash
cd /home/theseus/alexandria/daopad-fix-equity-vp-routing/src/daopad

# Build admin canister
cargo build --target wasm32-unknown-unknown --release -p admin --locked
candid-extractor target/wasm32-unknown-unknown/release/admin.wasm > admin/admin.did

# Build backend canister
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Deploy backend only (FRESH INSTALL for admin)
./deploy.sh --network ic --backend-only

# CRITICAL: Sync declarations
cp -r src/declarations/admin/* daopad_frontend/src/declarations/admin/
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
```

### STEP 5: Re-Initialize LLC with DFX

```bash
export LLC_STATION="6ulqe-qaaaa-aaaac-a4w3a-cai"
export LLC_OWNER="2ljyd-77i5g-ix222-szy7a-ru4cu-ns4j7-kxc2z-oazam-igx3u-uwee6-yqe"
export BACKEND="lwsav-iiaaa-aaaap-qp2qq-cai"
export ADMIN="odkrm-viaaa-aaaap-qp2oq-cai"

# Use daopad identity (has backend permissions)
dfx identity use daopad

# Step 1: Initialize with daopad as creator (gets 100% equity)
export DAOPAD_PRINCIPAL=$(dfx identity get-principal)

dfx canister --network ic call $BACKEND create_equity_station "(principal \"$LLC_STATION\")"
# Expected: (variant { Ok }) - daopad now has 100% equity

# Verify initialization
dfx canister --network ic call $ADMIN is_equity_station "(principal \"$LLC_STATION\")"
# Expected: (true)

dfx canister --network ic call $ADMIN get_equity_holders "(principal \"$LLC_STATION\")"
# Expected: (vec { record { principal "<daopad>"; 100 : nat8 } })

# Step 2: Create transfer proposal (100% to current owner for 0 ckUSDC)
dfx canister --network ic call $ADMIN create_equity_transfer_proposal "(
  principal \"$LLC_STATION\",
  principal \"$LLC_OWNER\",
  100 : nat8,
  0 : nat64,
  variant { StationTreasury = principal \"$LLC_STATION\" }
)"
# Returns: (variant { Ok = "proposal_id" })
# SAVE the proposal_id output!

export PROPOSAL_ID="<paste_proposal_id_here>"

# Step 3: Vote yes (daopad has 100% equity = instant approval at 75% threshold)
dfx canister --network ic call $ADMIN vote_on_equity_transfer "(
  \"$PROPOSAL_ID\",
  true
)"
# Expected: (variant { Ok }) - proposal status changes to Approved

# Step 4: Verify proposal is approved
dfx canister --network ic call $ADMIN get_equity_transfer_proposal "(\"$PROPOSAL_ID\")"
# Expected: status = Approved

# Step 5: IMPORTANT - Provide execution command to LLC owner
echo "================================================================"
echo "LLC EQUITY TRANSFER PROPOSAL CREATED & APPROVED"
echo "================================================================"
echo "Proposal ID: $PROPOSAL_ID"
echo ""
echo "The proposal to transfer 100% equity to the current owner is APPROVED."
echo "The LLC owner must execute this command to complete the transfer:"
echo ""
echo "dfx canister --network ic call $ADMIN execute_equity_transfer '(\"$PROPOSAL_ID\")'"
echo ""
echo "After execution, verify with:"
echo "dfx canister --network ic call $ADMIN get_equity_holders '(principal \"$LLC_STATION\")'"
echo "================================================================"

# Verify ALEX is NOT equity
dfx canister --network ic call $ADMIN is_equity_station "(principal \"fec7w-zyaaa-aaaaa-qaffq-cai\")"
# Expected: (false)
```

### STEP 6: Build & Deploy Frontend

```bash
cd daopad_frontend
npm run build

cd ..
./deploy.sh --network ic --frontend-only
```

---

## Testing & Verification

### Backend Testing (DFX)

**Test 1: Verify ALEX is token-based (not equity)**
```bash
export ALEX_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"
export ADMIN="odkrm-viaaa-aaaap-qp2oq-cai"

dfx canister --network ic call $ADMIN is_equity_station "(principal \"$ALEX_STATION\")"
# Expected: (false)

dfx canister --network ic call $ADMIN get_equity_holders "(principal \"$ALEX_STATION\")"
# Expected: (vec {}) - no equity holders
```

**Test 2: Verify LLC is equity-based**
```bash
export LLC_STATION="6ulqe-qaaaa-aaaac-a4w3a-cai"

dfx canister --network ic call $ADMIN is_equity_station "(principal \"$LLC_STATION\")"
# Expected: (true)

dfx canister --network ic call $ADMIN get_equity_holders "(principal \"$LLC_STATION\")"
# Expected: (vec { record { principal "2ljyd-77i5g..."; 100 : nat8 } })
# Note: Will show daopad with 100% initially, then LLC owner after transfer execution
```

**Test 3: Unified VP query routing**
```bash
export BACKEND="lwsav-iiaaa-aaaap-qp2qq-cai"
export TEST_USER="<some-principal>"

# LLC should return equity % as VP
dfx canister --network ic call $BACKEND get_voting_power_display "(
  principal \"$LLC_STATION\",
  principal \"$TEST_USER\"
)"
# Expected: (variant { Ok = record { 100 : nat64; "Equity" } }) if user has 100% equity

# ALEX should return Kong Locker VP
dfx canister --network ic call $BACKEND get_voting_power_display "(
  principal \"$ALEX_STATION\",
  principal \"$TEST_USER\"
)"
# Expected: (variant { Ok = record { <kong_vp> : nat64; "KongLocker" } })
```

### Browser Testing

**Test 4: ALEX Station (ysy5f-2qaaa-aaaap-qkmmq-cai)**
1. Navigate to: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai
2. ✓ NO "Equity" tab should appear
3. ✓ Only shows: Overview, Agreement, Treasury, Activity, Canisters, Invoices, Settings
4. Click "Activity" tab
5. ✓ "Your Voting Power: X VP" shows Kong Locker VP (not 0, not equity %)
6. ✓ Proposals show Kong Locker weighted votes

**Test 5: LLC Station (6ulqe-qaaaa-aaaac-a4w3a-cai)**
1. Navigate to: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/dao/6ulqe-qaaaa-aaaac-a4w3a-cai
2. ✓ "Equity" tab appears
3. Click "Equity" tab
4. ✓ Shows "Current ownership distribution" table
5. ✓ Shows pending transfer proposal (100% to current owner, Approved status)
6. Click "Activity" tab
7. ✓ "Your Voting Power: 100 VP (from equity ownership)" if logged in as owner
8. ✓ Proposals show equity % weighted votes

**Test 6: Check browser console for errors**
```bash
# After loading each station, check console
# Look for: "method not found", "undefined", "TypeError"
```

**Exit Criteria**:
- ✓ ALEX shows no Equity tab
- ✓ ALEX Activity tab shows Kong Locker VP
- ✓ LLC shows Equity tab with correct data
- ✓ LLC Activity tab shows equity % as VP
- ✓ No console errors
- ✓ All dfx tests pass

---

## Files Changed

| File | Type | Purpose |
|------|------|---------|
| `admin/src/api/voting_power.rs` | NEW | Unified VP query routing |
| `admin/src/lib.rs` | MODIFY | Export voting_power module |
| `admin/admin.did` | MODIFY | Add get_voting_power_display |
| `daopad_backend/src/api/voting.rs` | NEW | VP query wrapper |
| `daopad_backend/src/lib.rs` | MODIFY | Export voting module |
| `daopad_backend/daopad_backend.did` | MODIFY | Add get_voting_power_display |
| Frontend components (TBD) | MODIFY | Replace VP queries with unified method |

---

## Post-Implementation Notes

**LLC Ownership Transfer**:
After deployment, the LLC equity transfer proposal will be in "Approved" status. The current owner (2ljyd-77i5g-ix222-szy7a-ru4cu-ns4j7-kxc2z-oazam-igx3u-uwee6-yqe) needs to execute it:

```bash
dfx canister --network ic call odkrm-viaaa-aaaap-qp2oq-cai execute_equity_transfer '("<proposal_id>")'
```

Provide this command to the LLC owner after deployment.

---

## Success Criteria

- [ ] Admin canister reinstalled fresh (no ALEX equity data)
- [ ] LLC re-initialized with equity transfer proposal to current owner
- [ ] Unified VP query added to admin + backend
- [ ] All frontend VP displays use unified query
- [ ] ALEX shows no Equity tab, uses Kong Locker VP
- [ ] LLC shows Equity tab, Activity tab shows equity % as VP
- [ ] All dfx tests pass
- [ ] Browser testing shows correct behavior
- [ ] No console errors
- [ ] PR created and pushed
