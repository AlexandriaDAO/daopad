# 🤖 AUTONOMOUS PR ORCHESTRATOR - VOTING FIX REVISED PLAN

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and update PR #119.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-voting-setup-fix/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Context: What Happened Before

**PR #119 Status**: Currently has incorrect implementation that needs to be revised.

**Previous Attempt Issues**:
1. Agent misunderstood architecture - tried to delegate from backend to admin
2. This made admin the "proposer" in Orbit's view, violating separation of duties
3. The real issue is much simpler - we're storing data we don't need to store

**Key Architectural Insight** (from user):
> "Why do you have to store them at all? They're stored in the orbit station and we query them from the orbit station. We can store the vote count on each but that's it."

## The CORRECT Architecture

```
Backend Canister (lwsav-ii...cai)
├─ Role: OPERATOR in Orbit Station
├─ Creates Orbit requests via create_request()
├─ Queries Orbit for request lists via list_requests()
└─ CANNOT approve (separation of duties)

Admin Canister (odkrm-vi...cai)
├─ Role: ADMIN in Orbit Station
├─ Tracks votes (NOT proposals - just votes!)
├─ Uses Kong Locker for voting power
└─ Calls submit_request_approval() when threshold met

Frontend
├─ Shows Orbit requests (from backend → Orbit)
├─ Calls admin.vote_on_request() for voting
└─ Shows vote counts from admin
```

## Critical Understanding

**WE DON'T STORE PROPOSALS!** Orbit Station already stores requests. We only need:
1. Vote counts per request: `Map<(token_id, request_id), VoteData>`
2. Who voted (to prevent double voting): `Set<(request_id, voter)>`

## Implementation Steps

### Step 1: Revert Backend Changes (CRITICAL)

The backend currently has broken delegation logic. We need to restore it to NOT delegate to admin.

**File**: `daopad_backend/src/proposals/unified.rs`

**Line 622-650** - RESTORE this function (currently delegates to admin - WRONG):
```rust
/// Ensure a proposal exists for an Orbit request
/// NOTE: This is a NO-OP - we don't store proposals, Orbit does!
#[update]
pub async fn ensure_proposal_for_request(
    token_id: Principal,
    orbit_request_id: String,
    request_type_str: String,
) -> Result<ProposalId, ProposalError> {
    // Proposals are stored in Orbit, not here
    // Return a dummy ID to satisfy frontend expectations
    // Frontend will query Orbit directly for request details
    Ok(ProposalId(0))
}
```

**Lines 551-562** - RESTORE query functions as NO-OPs:
```rust
#[query]
pub fn get_proposal(
    _token_id: Principal,
    _orbit_request_id: String,
) -> Option<UnifiedProposal> {
    // Proposals stored in Orbit, not backend
    None
}
```

**Lines 564-572** - RESTORE:
```rust
#[query]
pub fn list_unified_proposals(_token_id: Principal) -> Vec<UnifiedProposal> {
    // Proposals stored in Orbit, not backend
    Vec::new()
}
```

**Lines 574-586** - RESTORE:
```rust
#[query]
pub fn has_user_voted(
    _user: Principal,
    _token_id: Principal,
    _orbit_request_id: String,
) -> bool {
    // Vote tracking happens in admin canister
    false
}
```

**Lines 588-600** - RESTORE:
```rust
#[query]
pub fn get_user_vote(
    _user: Principal,
    _token_id: Principal,
    _orbit_request_id: String,
) -> Option<VoteChoice> {
    // Vote tracking happens in admin canister
    None
}
```

### Step 2: Remove ADMIN_CANISTER_ID from Backend

**File**: `daopad_backend/src/storage/state.rs`

**Lines 80-86** - DELETE the ADMIN_CANISTER_ID storage (not needed):
```rust
// DELETE THESE LINES
/// Admin canister principal for proposal delegation
/// Backend creates Orbit requests but admin handles voting and approvals
pub static ADMIN_CANISTER_ID: RefCell<Option<Principal>> = RefCell::new(
    // Hard-coded admin canister ID (odkrm-viaaa-aaaap-qp2oq-cai)
    Some(Principal::from_text("odkrm-viaaa-aaaap-qp2oq-cai").unwrap())
);
```

**File**: `daopad_backend/src/lib.rs`

**Lines 57-69** - REMOVE admin initialization:
```rust
#[init]
fn init() {
    // REMOVE: storage::state::initialize_admin_canister_id();
    ic_cdk::println!("DAOPad backend initialized");
}

// DELETE the entire post_upgrade function
```

### Step 3: Simplify Admin Canister Voting

The admin canister is ALREADY CORRECT! It has the right structure in `admin/src/proposals/unified.rs`:
- Line 19: `vote_on_proposal()` - handles voting
- Line 127: Calls `approve_orbit_request()` when threshold met
- Line 257: `ensure_proposal_for_request()` - creates vote tracking

**NO CHANGES NEEDED** to admin canister - it's already correct!

### Step 4: Fix Frontend to Call Admin Directly

**File**: `daopad_frontend/src/services/admin/AdminService.ts` (CREATE NEW)

```javascript
import { ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getAuthClient } from '@/services/authClient';

// Admin canister ID
const ADMIN_CANISTER_ID = 'odkrm-viaaa-aaaap-qp2oq-cai';

export class AdminService {
  private actor: ActorSubclass<any> | null = null;

  async getActor() {
    if (!this.actor) {
      const authClient = await getAuthClient();
      const identity = authClient.getIdentity();

      // Create actor for admin canister
      const agent = new HttpAgent({ identity, host: 'https://ic0.app' });

      // Import the admin candid interface
      const idlFactory = await import('../declarations/admin/admin.did.js');

      this.actor = Actor.createActor(idlFactory.idlFactory, {
        agent,
        canisterId: Principal.fromText(ADMIN_CANISTER_ID),
      });
    }
    return this.actor;
  }

  async voteOnRequest(tokenId: string, requestId: string, vote: boolean) {
    const actor = await this.getActor();
    const tokenPrincipal = Principal.fromText(tokenId);

    // Call admin's vote_on_proposal (which handles Orbit request voting)
    const result = await actor.vote_on_proposal(
      tokenPrincipal,
      requestId,
      vote
    );

    if ('Err' in result) {
      throw new Error(result.Err);
    }
    return result.Ok;
  }

  async getVoteStatus(tokenId: string, requestId: string) {
    const actor = await this.getActor();
    const tokenPrincipal = Principal.fromText(tokenId);

    // Get proposal from admin (which tracks votes)
    const proposal = await actor.get_proposal(tokenPrincipal, requestId);

    if (proposal && proposal.length > 0) {
      return {
        yes_votes: Number(proposal[0].yes_votes),
        no_votes: Number(proposal[0].no_votes),
        total_voting_power: Number(proposal[0].total_voting_power),
        status: proposal[0].status
      };
    }

    return null;
  }

  async hasUserVoted(userId: string, tokenId: string, requestId: string) {
    const actor = await this.getActor();
    const userPrincipal = Principal.fromText(userId);
    const tokenPrincipal = Principal.fromText(tokenId);

    return actor.has_user_voted(userPrincipal, tokenPrincipal, requestId);
  }

  async ensureProposal(tokenId: string, requestId: string, operationType: string) {
    const actor = await this.getActor();
    const tokenPrincipal = Principal.fromText(tokenId);

    // Admin creates vote tracking for this request
    const result = await actor.ensure_proposal_for_request(
      tokenPrincipal,
      requestId,
      operationType  // Pass as string, not variant
    );

    if ('Err' in result) {
      throw new Error(result.Err);
    }
    return result.Ok;
  }
}

export const getAdminService = (identity) => {
  return new AdminService(identity);
};
```

**File**: `daopad_frontend/src/hooks/useProposal.ts`

**REPLACE** the service import and logic to use AdminService:

```javascript
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider/IIProvider';
import { getAdminService } from '../services/admin/AdminService';  // CHANGED
import { Principal } from '@dfinity/principal';

export function useProposal(tokenId, orbitRequestId, operationType) {
  const { identity } = useAuth();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState(null);
  const [error, setError] = useState(null);

  // Check if user has voted
  const checkVoteStatus = useCallback(async () => {
    if (!identity || !tokenId || !orbitRequestId) return;

    try {
      const adminService = getAdminService(identity);  // CHANGED
      const voted = await adminService.hasUserVoted(
        identity.getPrincipal().toText(),
        tokenId,
        orbitRequestId
      );
      setHasVoted(voted);
    } catch (err) {
      console.error('Failed to check vote status:', err);
    }
  }, [identity, tokenId, orbitRequestId]);

  // Fetch proposal (vote data) from admin
  const fetchProposal = useCallback(async () => {
    if (!tokenId || !orbitRequestId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const adminService = getAdminService(identity || null);  // CHANGED
      const voteStatus = await adminService.getVoteStatus(tokenId, orbitRequestId);

      if (voteStatus) {
        setProposal(voteStatus);
        await checkVoteStatus();
      } else {
        setProposal(null);
        setHasVoted(false);
      }
    } catch (err) {
      console.error('Failed to fetch proposal:', err);
      setError(err.message);
      setProposal(null);
    } finally {
      setLoading(false);
    }
  }, [identity, tokenId, orbitRequestId, checkVoteStatus]);

  // Ensure vote tracking exists in admin
  const ensureProposal = useCallback(async () => {
    if (!identity || !tokenId || !orbitRequestId || !operationType) {
      console.log('[useProposal] Missing required params');
      return;
    }

    try {
      console.log('[useProposal] Ensuring vote tracking for:', {
        tokenId,
        orbitRequestId,
        operationType
      });

      const adminService = getAdminService(identity);  // CHANGED
      await adminService.ensureProposal(tokenId, orbitRequestId, operationType);

      // Refresh proposal data
      await fetchProposal();
    } catch (err) {
      console.error('[useProposal] Failed to ensure proposal:', err);
      setError(err.message || 'Failed to create proposal');
    }
  }, [identity, tokenId, orbitRequestId, operationType, fetchProposal]);

  // Initial fetch
  useEffect(() => {
    fetchProposal();
  }, [fetchProposal]);

  return {
    proposal,
    loading,
    hasVoted,
    userVote,
    error,
    fetchProposal,
    ensureProposal,
    checkVoteStatus
  };
}
```

### Step 5: Build and Deploy

```bash
# Backend
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
./deploy.sh --network ic --backend-only

# Frontend (after backend)
npm run build
./deploy.sh --network ic --frontend-only
```

### Step 6: Update PR

```bash
git add -A
git commit -m "[Fix]: Simplify voting architecture - no proposal storage needed

- Backend: Remove delegation to admin, return NO-OPs for proposal queries
- Frontend: Call admin directly for voting (not through backend proxy)
- Admin: Already correct - tracks votes and approves when threshold met
- Key insight: Orbit stores requests, we only track votes"

git push
```

## Testing

1. Navigate to https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
2. Sign in and go to ALEX token dashboard
3. View the two pending requests:
   - `a40c0891-9987-484c-b352-ca6c2b334aec`
   - `c8f79913-cec1-4fd8-bb6e-0c3c56b54480`
4. **Success criteria**:
   - Vote UI appears (not "Creating proposal...")
   - Vote buttons work
   - Vote counts update
   - No console errors

## Critical Notes for Implementing Agent

1. **Current PR #119** has the WRONG implementation - backend delegates to admin (bad!)
2. **Admin canister is ALREADY CORRECT** - don't change it!
3. **The fix is to SIMPLIFY** - remove delegation, make frontend call admin directly
4. **Orbit stores requests** - we only track votes, not full proposals
5. **Test with the existing requests** mentioned above

## Architecture Summary

```
BEFORE (broken):
Frontend → Backend → Admin → Orbit
         (delegates)  (stores)

AFTER (correct):
Frontend → Backend → Orbit (for request data)
Frontend → Admin (for voting)
         ↘ Admin → Orbit (for approval when threshold met)
```

## Files Changed Summary

| File | Action | Why |
|------|--------|-----|
| `backend/src/proposals/unified.rs` | Restore NO-OP functions | Remove delegation |
| `backend/src/storage/state.rs` | Remove ADMIN_CANISTER_ID | Not needed |
| `backend/src/lib.rs` | Remove admin init | Not needed |
| `frontend/src/services/admin/AdminService.ts` | CREATE | Direct admin calls |
| `frontend/src/hooks/useProposal.ts` | Update to use AdminService | Call admin directly |

Total: ~100 lines changed (mostly deletions)