# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-vote-fix/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-vote-fix/src/daopad`
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
   git commit -m "Fix: Proposal voting persistence and real-time updates"
   git push -u origin feature/fix-proposal-voting-persistence
   gh pr create --title "Fix: Proposal Voting Persistence & Real-time Updates" --body "Implements VOTING_FIX_PLAN.md

   ## Problem
   - Votes are recorded but UI doesn't update
   - No way to check if user has already voted
   - Tallies show 0 even after voting
   - No memory of votes after page refresh

   ## Solution
   - Add backend query methods for vote status
   - Return updated proposal data from vote endpoint
   - Improve frontend state management
   - Add proper re-fetching after votes

   Fixes voting UX completely."
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

**Branch:** `feature/fix-proposal-voting-persistence`
**Worktree:** `/home/theseus/alexandria/daopad-vote-fix/src/daopad`

---

# Implementation Plan: Fix Proposal Voting Persistence

## Problem Analysis

### User Report
```
Treasury Transfer Proposal
Transfer
Pending
ID: 640e633d-2e4e-4caa-8192-6c75c6d3faa6
Community Vote
Yes: 0 (0.0%)
No: 0 (0.0%)
Required: 893,188 (50%)
0 voters participated

[After voting:]
✓ You have already voted (VP: 982,692)

[But tallies still show 0! And refresh loses memory]
```

### Root Causes (3 Issues Identified)

#### Issue 1: Missing Vote Status Queries
**File:** `daopad_backend/src/proposals/orbit_requests.rs`
- Backend checks `has_voted` internally (line 77-81) but doesn't expose it as a query
- Frontend can't check "have I voted?" except by attempting to vote again
- Comment in `useProposal.ts:92` says: "Note: hasVoted detection happens on vote attempt"
- This is inefficient and poor UX

#### Issue 2: Vote Response Doesn't Include Updated Data
**File:** `daopad_backend/src/proposals/orbit_requests.rs:31-192`
- `vote_on_orbit_request()` returns `Result<(), ProposalError>` (empty success)
- Frontend must re-query after voting to see updated tallies
- Potential race condition: vote commits but query runs before storage update persists

#### Issue 3: Frontend State Management
**Files:** `useProposal.ts`, `VoteButtons.tsx`, `RequestCard.tsx`
- `onVoteComplete` callback triggers `fetchProposal()` to refetch
- But there's no guarantee the backend has committed the update
- No optimistic UI updates
- `hasVoted` state lives in component, not the hook where proposal data lives

## Current Architecture

### Backend Storage (Working Correctly)
```rust
// daopad_backend/src/storage/state.rs
ORBIT_REQUEST_PROPOSALS: RefCell<HashMap<(StorablePrincipal, String), OrbitRequestProposal>>
ORBIT_REQUEST_VOTES: RefCell<HashMap<(ProposalId, StorablePrincipal), VoteChoice>>
```

### Backend Vote Flow (Lines 31-192)
```rust
1. Validate voter (not anonymous, proposal active, not expired)
2. Check has_voted in ORBIT_REQUEST_VOTES ✓ (line 77-81)
3. Get voting power from Kong Locker
4. Update proposal.yes_votes or proposal.no_votes ✓ (line 97-102)
5. Store vote in ORBIT_REQUEST_VOTES ✓ (line 104-113)
6. Check threshold:
   - If reached → execute, remove from storage
   - If rejected → reject, remove from storage
   - Else → UPDATE in storage ✓ (line 182-188)
7. Return Ok(()) ← PROBLEM: No data returned!
```

### Frontend Vote Flow
```typescript
// VoteButtons.tsx:19-38
1. User clicks vote button
2. Call onVote(orbitRequestId, vote)
3. Show toast on success
4. Call onVoteComplete() → fetchProposal()
5. fetchProposal() re-queries backend ← RACE CONDITION!
6. Update proposal state
```

## Solution Design

### 1. Add Backend Query Methods

#### New Method: `has_user_voted_on_request`
```rust
// PSEUDOCODE: daopad_backend/src/proposals/orbit_requests.rs

#[query]
pub fn has_user_voted_on_request(
    token_id: Principal,
    orbit_request_id: String,
) -> bool {
    let caller = ic_cdk::caller();

    // Get proposal to find ProposalId
    let proposal = ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        proposals
            .borrow()
            .get(&(StorablePrincipal(token_id), orbit_request_id))
            .cloned()
    });

    match proposal {
        Some(p) => {
            ORBIT_REQUEST_VOTES.with(|votes| {
                votes
                    .borrow()
                    .contains_key(&(p.id, StorablePrincipal(caller)))
            })
        }
        None => false,
    }
}
```

#### New Method: `get_user_vote_on_request`
```rust
// PSEUDOCODE: daopad_backend/src/proposals/orbit_requests.rs

#[derive(CandidType, Deserialize)]
pub struct UserVoteInfo {
    pub has_voted: bool,
    pub vote_choice: Option<VoteChoice>, // Some(Yes/No) or None
    pub voting_power_used: Option<u64>,
}

#[query]
pub fn get_user_vote_on_request(
    token_id: Principal,
    orbit_request_id: String,
) -> UserVoteInfo {
    let caller = ic_cdk::caller();

    let proposal = ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        proposals
            .borrow()
            .get(&(StorablePrincipal(token_id), orbit_request_id))
            .cloned()
    });

    match proposal {
        Some(p) => {
            let vote = ORBIT_REQUEST_VOTES.with(|votes| {
                votes
                    .borrow()
                    .get(&(p.id, StorablePrincipal(caller)))
                    .cloned()
            });

            UserVoteInfo {
                has_voted: vote.is_some(),
                vote_choice: vote,
                voting_power_used: None, // Could query Kong Locker if needed
            }
        }
        None => UserVoteInfo {
            has_voted: false,
            vote_choice: None,
            voting_power_used: None,
        },
    }
}
```

### 2. Return Updated Proposal from Vote Endpoint

#### Modify: `vote_on_orbit_request`
```rust
// PSEUDOCODE: Change return type

// OLD:
#[update]
pub async fn vote_on_orbit_request(
    token_id: Principal,
    orbit_request_id: String,
    vote: bool,
) -> Result<(), ProposalError>

// NEW:
#[update]
pub async fn vote_on_orbit_request(
    token_id: Principal,
    orbit_request_id: String,
    vote: bool,
) -> Result<Option<OrbitRequestProposal>, ProposalError>
//           ^^^^^^^^^^^^^^^^^^^^^^^^^ Return updated proposal or None if executed

// At end of function (line 189):
// BEFORE:
} else {
    // Still active - update vote counts
    proposal.total_voting_power = current_total_vp;
    ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        proposals
            .borrow_mut()
            .insert((StorablePrincipal(token_id), orbit_request_id), proposal.clone());
    });
}
Ok(())

// AFTER:
} else {
    // Still active - update vote counts
    proposal.total_voting_power = current_total_vp;
    ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        proposals
            .borrow_mut()
            .insert((StorablePrincipal(token_id), orbit_request_id.clone()), proposal.clone());
    });

    // Return updated proposal so frontend doesn't need to refetch
    Ok(Some(proposal))
}

// For executed/rejected (return None since proposal is removed):
if proposal.yes_votes > required_votes {
    // ... execute logic ...
    proposal.status = ProposalStatus::Executed;
    // Remove from storage (line 142-146)
    Ok(None) // Executed, no longer in storage
}
```

### 3. Frontend Service Updates

#### Update: `daopadBackend.ts`
```typescript
// PSEUDOCODE: daopad_frontend/src/services/daopadBackend.ts

// Add new method (around line 433):
async getUserVoteStatus(tokenCanisterId, requestId) {
  try {
    const actor = await this.getActor();
    const result = await actor.get_user_vote_on_request(
      tokenCanisterId,
      requestId
    );
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to get user vote status:', error);
    return { success: false, error: error.message };
  }
}

// Modify existing method to handle new return type:
async voteOnOrbitRequest(
  tokenCanisterId: Principal | string,
  requestId: string,
  vote: boolean
): Promise<ServiceResponse<OrbitRequestProposal | null>> {
  try {
    this.ensureAuthenticated();
    const actor = await this.getActor();
    const result = await actor.vote_on_orbit_request(
      tokenCanisterId,
      requestId,
      vote
    );
    if ('Ok' in result) {
      // result.Ok is now Option<OrbitRequestProposal>
      return { success: true, data: result.Ok };
    } else {
      return { success: false, error: result.Err };
    }
  } catch (error) {
    console.error('Failed to vote on orbit request:', error);
    return { success: false, error: error.message };
  }
}
```

### 4. Frontend Hook Updates

#### Update: `useProposal.ts`
```typescript
// PSEUDOCODE: daopad_frontend/src/hooks/useProposal.ts

export function useProposal(tokenId, orbitRequestId, operationType) {
  const { identity } = useAuth();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState(null); // NEW: 'Yes' | 'No' | null
  const [error, setError] = useState(null);

  // NEW: Fetch user's vote status
  const fetchVoteStatus = useCallback(async () => {
    if (!identity || !tokenId || !orbitRequestId) return;

    try {
      const backend = new DAOPadBackendService(identity);
      const result = await backend.getUserVoteStatus(
        Principal.fromText(tokenId),
        orbitRequestId
      );

      if (result.success) {
        setHasVoted(result.data.has_voted);
        setUserVote(result.data.vote_choice?.[0] || null);
      }
    } catch (err) {
      console.error('Failed to fetch vote status:', err);
    }
  }, [identity, tokenId, orbitRequestId]);

  // Modified: Fetch proposal data
  const fetchProposal = useCallback(async () => {
    if (!identity || !tokenId || !orbitRequestId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const backend = new DAOPadBackendService(identity);

      // Fetch both proposal and vote status in parallel
      const [proposalResult, voteResult] = await Promise.all([
        backend.getOrbitRequestProposal(
          Principal.fromText(tokenId),
          orbitRequestId
        ),
        backend.getUserVoteStatus(
          Principal.fromText(tokenId),
          orbitRequestId
        )
      ]);

      if (proposalResult.success) {
        setProposal(proposalResult.data);
      } else {
        setProposal(null);
      }

      if (voteResult.success) {
        setHasVoted(voteResult.data.has_voted);
        setUserVote(voteResult.data.vote_choice?.[0] || null);
      }
    } catch (err) {
      console.error('Failed to fetch proposal:', err);
      setError(err.message);
      setProposal(null);
    } finally {
      setLoading(false);
    }
  }, [identity, tokenId, orbitRequestId]);

  // Initial fetch
  useEffect(() => {
    fetchProposal();
  }, [fetchProposal]);

  return {
    proposal,
    loading,
    hasVoted,
    userVote, // NEW: expose what they voted
    error,
    fetchProposal,
    ensureProposal
  };
}
```

### 5. Frontend Component Updates

#### Update: `VoteButtons.tsx`
```typescript
// PSEUDOCODE: daopad_frontend/src/components/orbit/requests/VoteButtons.tsx

export function VoteButtons({
  proposalId,
  orbitRequestId,
  tokenId,
  onVote,
  disabled,
  userVotingPower,
  hasVoted,
  onVoteComplete
}) {
  const [voting, setVoting] = useState(null);
  const [localHasVoted, setLocalHasVoted] = useState(hasVoted);
  const [updatedProposal, setUpdatedProposal] = useState(null); // NEW

  const handleVote = async (vote) => {
    setVoting(vote ? 'yes' : 'no');

    try {
      // Call onVote which now returns updated proposal
      const result = await onVote(orbitRequestId, vote);

      // Show success with actual vote counts
      toast.success(
        `${vote ? "Voted Yes" : "Voted No"} - VP: ${userVotingPower.toLocaleString()}`
      );

      setLocalHasVoted(true);

      // If proposal data returned, use it for optimistic update
      if (result?.data) {
        setUpdatedProposal(result.data);
      }

      // Still call onVoteComplete to trigger full refresh
      if (onVoteComplete) {
        onVoteComplete(result?.data); // Pass updated data
      }
    } catch (error) {
      if (error.message?.includes('AlreadyVoted')) {
        toast.info("You have already voted on this proposal");
        setLocalHasVoted(true);
      } else {
        toast.error(error.message || "Failed to vote");
      }
    } finally {
      setVoting(null);
    }
  };

  // ... rest of component
}
```

#### Update: `RequestCard.tsx`
```typescript
// PSEUDOCODE: daopad_frontend/src/components/orbit/requests/RequestCard.tsx

export function RequestCard({ request, tokenId, userVotingPower, onVote }) {
  const operationType = getOperationType(request);
  const { proposal, loading, hasVoted, userVote, ensureProposal, fetchProposal } = useProposal(
    tokenId,
    request.id,
    operationType
  );

  // Auto-create proposal when card is viewed
  useEffect(() => {
    if (!proposal && !loading && request.status === 'Created') {
      ensureProposal();
    }
  }, [proposal, loading, request.status, ensureProposal]);

  // NEW: Handle vote completion with updated data
  const handleVoteComplete = useCallback((updatedProposalData) => {
    // If backend returned updated proposal, no need to refetch
    if (updatedProposalData) {
      // Data already fresh from vote response
      return;
    }
    // Otherwise refetch
    fetchProposal();
  }, [fetchProposal]);

  return (
    <Card>
      {/* ... existing UI ... */}

      {proposal && (
        <>
          <VoteProgressBar proposal={proposal} threshold={50} />
          <VoteButtons
            proposalId={Number(proposal.id)}
            orbitRequestId={request.id}
            tokenId={tokenId}
            onVote={onVote}
            userVotingPower={userVotingPower}
            hasVoted={hasVoted}
            disabled={proposal.status && Object.keys(proposal.status)[0] !== 'Active'}
            onVoteComplete={handleVoteComplete}
          />

          {/* NEW: Show user's vote choice */}
          {hasVoted && userVote && (
            <div className="text-xs text-muted-foreground mt-2">
              Your vote: {Object.keys(userVote)[0]} ({userVotingPower.toLocaleString()} VP)
            </div>
          )}
        </>
      )}
    </Card>
  );
}
```

## File Changes Summary

### Backend Changes
1. **`daopad_backend/src/proposals/orbit_requests.rs`**
   - Add `UserVoteInfo` struct
   - Add `has_user_voted_on_request()` query method
   - Add `get_user_vote_on_request()` query method
   - Change `vote_on_orbit_request()` return type to `Result<Option<OrbitRequestProposal>, ProposalError>`
   - Return `Some(proposal)` when still active, `None` when executed/rejected

2. **`daopad_backend/src/proposals/types.rs`**
   - Add `UserVoteInfo` to exports (if not in orbit_requests.rs)

### Frontend Changes
1. **`daopad_frontend/src/services/daopadBackend.ts`**
   - Add `getUserVoteStatus()` method
   - Update `voteOnOrbitRequest()` to handle new return type

2. **`daopad_frontend/src/hooks/useProposal.ts`**
   - Add `userVote` state
   - Add `fetchVoteStatus()` method
   - Update `fetchProposal()` to fetch vote status in parallel
   - Export `userVote` from hook

3. **`daopad_frontend/src/components/orbit/requests/VoteButtons.tsx`**
   - Update `handleVote()` to receive and use updated proposal data
   - Pass updated data to `onVoteComplete` callback

4. **`daopad_frontend/src/components/orbit/requests/RequestCard.tsx`**
   - Destructure `userVote` from `useProposal` hook
   - Add `handleVoteComplete` callback that accepts updated data
   - Display user's vote choice in UI

## Testing Strategy

### 1. Backend Type Discovery
```bash
# After Rust changes, regenerate candid
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Verify new methods in candid
grep -A 5 "has_user_voted_on_request\|get_user_vote_on_request" daopad_backend/daopad_backend.did
```

### 2. Backend Deployment
```bash
./deploy.sh --network ic --backend-only

# Test with dfx (use your identity)
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai get_user_vote_on_request '(
  principal "4f3re-...",  # token ID
  "640e633d-2e4e-4caa-8192-6c75c6d3faa6"  # request ID
)'
```

### 3. Declaration Sync (CRITICAL!)
```bash
# Copy declarations to frontend
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# Verify methods exist in frontend declarations
grep "get_user_vote_on_request\|has_user_voted_on_request" \
  daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js
```

### 4. Frontend Deployment
```bash
npm run build
./deploy.sh --network ic --frontend-only
```

### 5. E2E Test Scenario
```
1. Navigate to token dashboard
2. Find a "Created" request
3. Vote Yes
4. ✓ Verify tally updates immediately (no refresh needed)
5. ✓ Verify "You have already voted" shows
6. ✓ Verify your vote choice is displayed
7. Refresh page
8. ✓ Verify vote status persists
9. Try to vote again
10. ✓ Verify graceful "already voted" message
```

## Success Criteria

- ✅ Vote tallies update immediately after voting (no manual refresh)
- ✅ "You have already voted" status persists across page refreshes
- ✅ User's vote choice (Yes/No) is displayed
- ✅ Voting power is shown correctly
- ✅ Voter count increments properly
- ✅ No race conditions between vote and refetch
- ✅ Optimistic UI updates when vote succeeds
- ✅ Graceful error handling for duplicate votes

## Rollback Plan

If issues occur:
1. Frontend changes are safe (backward compatible - methods are new)
2. Backend changes are safe (new methods, existing method compatible)
3. Worst case: Revert to previous deployment with `./deploy.sh --network ic`
4. Proposals in progress will continue working (storage unchanged)
