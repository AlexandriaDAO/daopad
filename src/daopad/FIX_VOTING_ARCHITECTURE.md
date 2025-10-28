# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-fix-voting-architecture/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-fix-voting-architecture/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Backend changes:
     ```bash
     cargo build --target wasm32-unknown-unknown --release -p admin
     candid-extractor target/wasm32-unknown-unknown/release/admin.wasm > admin/admin.did
     ./deploy.sh --network ic --backend-only
     ```
   - Frontend changes:
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "Fix: Rearchitect voting system to remove Kong Locker registration requirement"
   git push -u origin feature/fix-voting-architecture
   gh pr create --title "Fix: Voting Architecture - Remove User Registration Requirement" --body "Implements FIX_VOTING_ARCHITECTURE.md"
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

**Branch:** `feature/fix-voting-architecture`
**Worktree:** `/home/theseus/alexandria/daopad-fix-voting-architecture/src/daopad`

---

# Voting Architecture Fix - Implementation Plan

## Problem Statement

**Current Broken Flow:**
1. User votes → Admin canister needs their Kong Locker canister ID
2. Admin stores user→Kong Locker mapping (KONG_LOCKER_PRINCIPALS)
3. Backend stores this mapping but NEVER tells admin canister
4. Result: Votes fail with "Must register Kong Locker canister first"

**Root Cause:**
The admin canister was designed to store user→Kong Locker mappings, but there's no mechanism to populate this storage. This creates an unnecessary registration requirement.

**Why It's Wrong:**
Kong Locker is ONE global canister (`eazgb-giaaa-aaaap-qqc2q-cai`) that tracks ALL users. The admin canister doesn't need to store per-user mappings - it can query Kong Locker directly with the user's principal!

## New Architecture

**Simplified Flow:**
1. User votes → Admin receives: `(token_id, orbit_request_id, vote)`
2. Admin queries Kong Locker DIRECTLY: `user_balances(caller.to_string())`
3. Admin calculates voting power from response
4. Admin queries backend for token→station mapping when threshold reached
5. Admin approves/rejects in Orbit Station

**Key Changes:**
- ❌ Remove KONG_LOCKER_PRINCIPALS storage (unused)
- ✅ Query Kong Locker directly with user principal
- ✅ Backend stores token→station, admin queries backend
- ✅ Proposals created on-demand when first vote cast

## Current State Documentation

### Admin Canister Files
```
admin/
├── src/
│   ├── lib.rs                           # Exports all modules
│   ├── kong_locker/
│   │   └── voting.rs                    # Lines 21-34: Uses KONG_LOCKER_PRINCIPALS (REMOVE)
│   ├── proposals/
│   │   ├── unified.rs                   # Lines 78-90: Voting power check (MODIFY)
│   │   │                                # Lines 112-124: Station lookup (MODIFY)
│   │   └── types.rs                     # Proposal types
│   └── storage/
│       └── state.rs                     # Line 8: KONG_LOCKER_PRINCIPALS (REMOVE)
└── admin.did                            # Lines 3-4: register_kong_locker (REMOVE)
```

### Backend Canister Files
```
daopad_backend/
├── src/
│   ├── api/
│   │   └── orbit.rs                     # get_orbit_station_for_token() - admin will query this
│   └── proposals/
│       └── orbit_link.rs                # Lines 213-226: Stores token→station (KEEP)
└── daopad_backend.did                   # Exposes get_orbit_station_for_token
```

### Frontend Files
```
daopad_frontend/
└── src/
    └── services/
        └── admin/
            └── AdminService.ts          # Lines 57-72: ProposalError types (KEEP)
                                         # Lines 90-95: register_kong_locker IDL (REMOVE)
```

## Implementation Plan

### Phase 1: Admin Canister - Remove Kong Locker Registration

**File: `admin/src/kong_locker/voting.rs`**

Current implementation (lines 21-34):
```rust
pub async fn get_user_voting_power_for_token(
    caller: Principal,
    token_canister_id: Principal,
) -> Result<u64, String> {
    let kong_locker_principal = KONG_LOCKER_PRINCIPALS.with(|principals| {
        principals
            .borrow()
            .get(&StorablePrincipal(caller))
            .map(|sp| sp.0)
            .ok_or("Must register Kong Locker canister first".to_string())
    })?;

    calculate_voting_power_for_token(kong_locker_principal, token_canister_id).await
}
```

New implementation:
```rust
// PSEUDOCODE - Query Kong Locker directly
pub async fn get_user_voting_power_for_token(
    caller: Principal,
    token_canister_id: Principal,
) -> Result<u64, String> {
    // Query KongSwap directly with the USER's principal
    // KongSwap queries the user's individual lock canister internally
    let kongswap_id = Principal::from_text("2ipq2-uqaaa-aaaar-qailq-cai")
        .map_err(|e| format!("Invalid KongSwap ID: {}", e))?;

    // Call user_balances with the CALLER's principal (as string)
    let user_balances_result: Result<
        (Result<Vec<UserBalancesReply>, String>,),
        (ic_cdk::api::call::RejectionCode, String),
    > = ic_cdk::call(
        kongswap_id,
        "user_balances",
        (caller.to_string(),)  // Pass caller's principal directly!
    ).await;

    let user_balances = user_balances_result
        .map_err(|e| format!("Failed to get LP positions: {:?}", e))?
        .0
        .map_err(|e| format!("KongSwap returned error: {}", e))?;

    // Calculate voting power for this specific token
    let token_id_str = token_canister_id.to_string();
    let total_usd_value: f64 = user_balances
        .iter()
        .filter_map(|balance| {
            let UserBalancesReply::LP(lp_reply) = balance;
            if lp_reply.address_0 == token_id_str || lp_reply.address_1 == token_id_str {
                Some(lp_reply.usd_balance)
            } else {
                None
            }
        })
        .sum();

    Ok((total_usd_value * 100.0) as u64)
}

// Remove calculate_voting_power_for_token - no longer needed since we query directly
```

**File: `admin/src/storage/state.rs`**

Remove line 8:
```rust
// DELETE THIS:
pub static KONG_LOCKER_PRINCIPALS: RefCell<StableBTreeMap<StorablePrincipal, StorablePrincipal, Memory>> = ...
```

### Phase 2: Admin Canister - Query Backend for Token→Station Mapping

**File: `admin/src/proposals/unified.rs`**

Modify lines 116-124 (approve logic):
```rust
// PSEUDOCODE
if proposal.yes_votes > required_votes {
    // Query backend for station ID instead of local storage
    let backend_canister = Principal::from_text("lwsav-iiaaa-aaaap-qp2qq-cai")
        .map_err(|e| format!("Invalid backend ID: {}", e))?;

    let station_result: Result<
        (Option<Principal>,),
        (ic_cdk::api::call::RejectionCode, String),
    > = ic_cdk::call(
        backend_canister,
        "get_orbit_station_for_token",
        (token_id,)
    ).await;

    let station_id = station_result
        .map_err(|e| format!("Failed to query backend: {:?}", e))?
        .0
        .ok_or(ProposalError::NoStationLinked(token_id))?;

    // Approve in Orbit
    approve_orbit_request(station_id, &proposal.orbit_request_id).await?;
    // ... rest of execution logic
}
```

Modify lines 143-151 (reject logic) - same pattern.

Remove from `admin/src/storage/state.rs`:
```rust
// DELETE THIS:
pub static TOKEN_ORBIT_STATIONS: RefCell<StableBTreeMap<...>> = ...
```

### Phase 3: Admin Canister - Implement On-Demand Proposal Creation

**File: `admin/src/proposals/unified.rs`**

Add new function before `vote_on_proposal`:
```rust
// PSEUDOCODE
#[update]
pub async fn ensure_proposal_for_request(
    token_id: Principal,
    orbit_request_id: String,
) -> Result<ProposalId, ProposalError> {
    // Check if proposal already exists
    if let Some(proposal) = UNIFIED_PROPOSALS.with(|proposals| {
        proposals
            .borrow()
            .get(&(StorablePrincipal(token_id), orbit_request_id.clone()))
            .cloned()
    }) {
        return Ok(proposal.id);
    }

    // Create new proposal
    let proposal_id = generate_proposal_id();
    let now = time();
    let thirty_days_nanos = 2_592_000_000_000_000u64; // 30 days

    // Query backend for station to verify it exists
    let backend_canister = Principal::from_text("lwsav-iiaaa-aaaap-qp2qq-cai")
        .map_err(|e| format!("Invalid backend ID: {}", e))?;

    let station_result: Result<
        (Option<Principal>,),
        (ic_cdk::api::call::RejectionCode, String),
    > = ic_cdk::call(
        backend_canister,
        "get_orbit_station_for_token",
        (token_id,)
    ).await;

    let _station_id = station_result
        .map_err(|e| format!("Failed to query backend: {:?}", e))?
        .0
        .ok_or(ProposalError::NoStationLinked(token_id))?;

    // Get total voting power
    let total_vp = get_total_voting_power_for_token(token_id).await?;

    let proposal = UnifiedProposal {
        id: proposal_id,
        orbit_request_id: orbit_request_id.clone(),
        operation_type: OrbitOperationType::Generic, // Can refine later
        status: ProposalStatus::Active,
        created_at: now,
        expires_at: now + thirty_days_nanos,
        yes_votes: 0,
        no_votes: 0,
        voter_count: 0,
        total_voting_power: total_vp,
    };

    UNIFIED_PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(
            (StorablePrincipal(token_id), orbit_request_id),
            proposal.clone()
        );
    });

    Ok(proposal_id)
}
```

Modify `vote_on_proposal` (line 32-39):
```rust
// PSEUDOCODE
// 2. Get or create proposal
let mut proposal = match UNIFIED_PROPOSALS.with(|proposals| {
    proposals
        .borrow()
        .get(&(StorablePrincipal(token_id), orbit_request_id.clone()))
        .cloned()
}) {
    Some(p) => p,
    None => {
        // Auto-create proposal on first vote
        let proposal_id = ensure_proposal_for_request(token_id, orbit_request_id.clone()).await?;
        UNIFIED_PROPOSALS.with(|proposals| {
            proposals
                .borrow()
                .get(&(StorablePrincipal(token_id), orbit_request_id.clone()))
                .cloned()
                .ok_or(ProposalError::NotFound(proposal_id))
        })?
    }
};
```

### Phase 4: Admin Canister - Update Candid Interface

**File: `admin/admin.did`**

Remove:
```candid
// DELETE THESE LINES:
register_kong_locker : (principal, principal) -> (Result);
get_kong_locker : (principal) -> (opt principal) query;
```

Add:
```candid
// ADD THIS:
ensure_proposal_for_request : (principal, text) -> (Result_ProposalId);
```

Define Result_ProposalId:
```candid
type Result_ProposalId = variant {
  Ok : nat64;
  Err : ProposalError;
};
```

### Phase 5: Frontend - Update AdminService

**File: `daopad_frontend/src/services/admin/AdminService.ts`**

Remove register_kong_locker from IDL (lines 90-95):
```typescript
// DELETE THESE LINES:
'register_kong_locker': IDL.Func([IDL.Principal, IDL.Principal], [Result], []),
'get_kong_locker': IDL.Func([IDL.Principal], [IDL.Opt(IDL.Principal)], ['query']),
```

Add ensure_proposal_for_request:
```typescript
// PSEUDOCODE
const Result_ProposalId = IDL.Variant({
  'Ok': IDL.Nat64,
  'Err': ProposalError,
});

// In IDL.Service:
'ensure_proposal_for_request': IDL.Func([IDL.Principal, IDL.Text], [Result_ProposalId], []),
```

Update interface:
```typescript
// PSEUDOCODE
interface AdminActor {
  vote_on_proposal: (token_id: Principal, orbit_request_id: string, vote: boolean) => Promise<VoteResult>;
  has_user_voted: (user: Principal, token_id: Principal, orbit_request_id: string) => Promise<boolean>;
  get_user_vote: (user: Principal, token_id: Principal, orbit_request_id: string) => Promise<{ Yes: null } | { No: null } | null>;
  get_proposal: (token_id: Principal, orbit_request_id: string) => Promise<any | null>;
  ensure_proposal_for_request: (token_id: Principal, orbit_request_id: string) => Promise<{ Ok: bigint } | { Err: any }>;
}
```

### Phase 6: Frontend - Call ensure_proposal_for_request Before Fetching

**File: `daopad_frontend/src/hooks/useProposal.ts`**

Modify fetchProposal to ensure proposal exists:
```typescript
// PSEUDOCODE
const fetchProposal = useCallback(async () => {
  if (!tokenId || !orbitRequestId) return;

  try {
    setLoading(true);
    const adminService = getAdminService();

    // FIRST: Ensure proposal exists (creates if needed)
    const ensureResult = await adminService.ensureProposalForRequest(tokenId, orbitRequestId);

    if ('Err' in ensureResult) {
      console.error('Failed to ensure proposal:', ensureResult.Err);
      setError('Failed to initialize proposal');
      setHasProposal(false);
      return;
    }

    // THEN: Fetch proposal data
    const proposal = await adminService.getProposal(tokenId, orbitRequestId);

    if (proposal) {
      setProposalData(proposal);
      setHasProposal(true);
    } else {
      setHasProposal(false);
    }
  } catch (err) {
    console.error('Failed to fetch proposal:', err);
    setError(err.message);
    setHasProposal(false);
  } finally {
    setLoading(false);
  }
}, [tokenId, orbitRequestId]);
```

Add ensureProposalForRequest method to AdminService:
```typescript
// PSEUDOCODE
async ensureProposalForRequest(tokenId: string, orbitRequestId: string): Promise<{ Ok: bigint } | { Err: any }> {
  const actor = await this.getActor();
  return await actor.ensure_proposal_for_request(Principal.fromText(tokenId), orbitRequestId);
}
```

## Testing Strategy

### Manual Testing Steps (Mainnet - Token: ysy5f-2qaaa-aaaap-qkmmq-cai)

1. **Deploy admin canister**:
   ```bash
   cd /home/theseus/alexandria/daopad-fix-voting-architecture/src/daopad
   cargo build --target wasm32-unknown-unknown --release -p admin
   candid-extractor target/wasm32-unknown-unknown/release/admin.wasm > admin/admin.did
   ./deploy.sh --network ic --backend-only
   ```

2. **Verify Kong Locker direct query works**:
   ```bash
   # Test with dfx identity
   dfx canister --network ic call odkrm-viaaa-aaaap-qp2oq-cai ensure_proposal_for_request \
     '(principal "ysy5f-2qaaa-aaaap-qkmmq-cai", "df3ea615-507c-4c3b-adf2-25b7dc268aef")'

   # Should return: (variant { Ok = 1234 : nat64 })
   ```

3. **Deploy frontend**:
   ```bash
   npm run build
   ./deploy.sh --network ic --frontend-only
   ```

4. **Test voting flow in browser**:
   - Navigate to: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/fec7w-zyaaa-aaaaa-qaffq-cai/activity
   - Login with Internet Identity
   - Click vote on request: df3ea615-507c-4c3b-adf2-25b7dc268aef
   - Verify:
     - ✅ No "Must register Kong Locker" error
     - ✅ Vote counts update (yes_votes/no_votes increment)
     - ✅ Your vote is recorded ("You voted YES/NO")
     - ✅ Proposal shows correct voting power

5. **Verify vote was recorded**:
   ```bash
   dfx canister --network ic call odkrm-viaaa-aaaap-qp2oq-cai get_proposal \
     '(principal "ysy5f-2qaaa-aaaap-qkmmq-cai", "df3ea615-507c-4c3b-adf2-25b7dc268aef")'

   # Should show: yes_votes or no_votes > 0
   ```

6. **Test threshold approval**:
   - Get another user to vote (or vote with enough VP to exceed 50%)
   - Verify proposal auto-executes in Orbit Station
   - Check Orbit request status changes to "Approved"

### Exit Criteria

- ✅ No Kong Locker registration errors
- ✅ Votes record properly (counts increment)
- ✅ Vote persistence works (refresh shows your vote)
- ✅ Threshold approval works (>50% yes → auto-approve in Orbit)
- ✅ Threshold rejection works (>50% no → auto-reject in Orbit)
- ✅ All console errors resolved
- ✅ PR created and approved

## Summary of Changes

### Admin Canister (Rust)
1. **Remove**: KONG_LOCKER_PRINCIPALS storage
2. **Remove**: register_kong_locker() and get_kong_locker() methods
3. **Modify**: get_user_voting_power_for_token() to query Kong Locker directly
4. **Modify**: vote_on_proposal() to query backend for station ID
5. **Add**: ensure_proposal_for_request() for on-demand creation
6. **Update**: admin.did Candid interface

### Backend Canister (Rust)
- **No changes needed** - Already exposes get_orbit_station_for_token()

### Frontend (TypeScript)
1. **Remove**: register_kong_locker IDL definitions from AdminService
2. **Add**: ensure_proposal_for_request() method to AdminService
3. **Modify**: useProposal.ts to call ensure_proposal_for_request() before fetching
4. **Keep**: All vote error handling (already correct)

## Architecture Benefits

### Before (Broken)
- ❌ Required user→Kong Locker registration (never happened)
- ❌ Admin stored duplicate mappings
- ❌ Backend and admin out of sync
- ❌ Votes silently failed

### After (Clean)
- ✅ Zero user registration needed
- ✅ Single source of truth (backend for station, Kong Locker for VP)
- ✅ Admin queries backend/Kong Locker as needed
- ✅ Proposals auto-created on first vote
- ✅ Clear error messages

## Risk Assessment

### Low Risk
- Kong Locker direct query (already works in backend)
- Backend station lookup (method already exposed)
- On-demand proposal creation (straightforward logic)

### Medium Risk
- Removing TOKEN_ORBIT_STATIONS from admin (ensure no other code uses it)
- Candid interface changes (must regenerate declarations)

### Mitigation
- Test with existing token/station on mainnet
- Verify all error paths work
- Check console for any new errors
- Rollback plan: Redeploy previous admin canister version
