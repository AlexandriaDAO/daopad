# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-voting-system-fix/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-voting-system-fix/src/daopad`
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
   git commit -m "[Fix]: Voting System Persistence & Has-Voted Query"
   git push -u origin feature/fix-voting-persistence
   gh pr create --title "[Fix]: Voting System Persistence & Has-Voted Query" --body "Implements VOTING_PERSISTENCE_FIX_PLAN.md"
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

**Branch:** `feature/fix-voting-persistence`
**Worktree:** `/home/theseus/alexandria/daopad-voting-system-fix/src/daopad`

---

# Implementation Plan

## Current State Documentation

### The Problem
Users report that when voting on Orbit requests:
1. Vote shows "You have already voted" after voting
2. On page refresh, vote disappears and shows "0 votes"
3. No way to check if user has already voted

### Root Causes
1. **Missing Query Method**: No `has_user_voted_on_orbit_request` method in backend
2. **Vote Persistence Bug**: Votes aren't being saved properly in `ORBIT_REQUEST_PROPOSALS`
3. **Frontend State Loss**: `hasVoted` only exists in local React state
4. **No Debug Visibility**: Silent failures with no logging

### Current Implementation Files
- **Backend vote logic**: `daopad_backend/src/proposals/orbit_requests.rs:29-209`
- **Storage definitions**: `daopad_backend/src/storage/state.rs:75-80`
- **Frontend hook**: `daopad_frontend/src/hooks/useProposal.ts:70-175`
- **Vote UI**: `daopad_frontend/src/components/orbit/requests/VoteButtons.tsx`

## Implementation Steps

### 1. Add Has-Voted Query Method

**File**: `daopad_backend/src/proposals/orbit_requests.rs` (ADD after line 223)

```rust
// PSEUDOCODE
/// Check if a user has voted on an Orbit request proposal
#[query]
pub fn has_user_voted_on_orbit_request(
    user: Principal,
    token_id: Principal,
    orbit_request_id: String,
) -> bool {
    // 1. Get proposal to find its ID
    let proposal = ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        proposals.borrow().get(&(StorablePrincipal(token_id), orbit_request_id))
    });

    // 2. If no proposal, user hasn't voted
    if proposal.is_none() {
        return false;
    }

    // 3. Check if vote exists for this user
    let proposal_id = proposal.unwrap().id;
    ORBIT_REQUEST_VOTES.with(|votes| {
        votes.borrow().contains_key(&(proposal_id, StorablePrincipal(user)))
    })
}
```

### 2. Add Get User Vote Method (For Debugging)

**File**: `daopad_backend/src/proposals/orbit_requests.rs` (ADD after has_user_voted method)

```rust
// PSEUDOCODE
/// Get the user's vote on an Orbit request (for UI display)
#[query]
pub fn get_user_vote_on_orbit_request(
    user: Principal,
    token_id: Principal,
    orbit_request_id: String,
) -> Option<VoteChoice> {
    // 1. Get proposal ID
    let proposal = ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        proposals.borrow().get(&(StorablePrincipal(token_id), orbit_request_id))
    })?;

    // 2. Get user's vote
    ORBIT_REQUEST_VOTES.with(|votes| {
        votes.borrow().get(&(proposal.id, StorablePrincipal(user))).cloned()
    })
}
```

### 3. Fix Vote Persistence Bug

**File**: `daopad_backend/src/proposals/orbit_requests.rs` (MODIFY lines 114-206)

```rust
// PSEUDOCODE - Fix the vote recording logic
// MODIFY vote_on_orbit_request function around lines 114-206

// After recording vote (line 130), add explicit logging:
ic_cdk::println!(
    "Vote recorded: proposal_id={:?}, voter={}, vote={}, new_yes={}, new_no={}",
    proposal.id, voter, if vote { "YES" } else { "NO" },
    proposal.yes_votes, proposal.no_votes
);

// CRITICAL FIX at line 199-206:
// The issue is that we update the cloned proposal but might not save it correctly
// Replace the else block with:
} else {
    // Still active - update vote counts and refresh total VP
    proposal.total_voting_power = current_total_vp;

    // CRITICAL: Save the updated proposal IMMEDIATELY
    let save_result = ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        let mut map = proposals.borrow_mut();
        map.insert(
            (StorablePrincipal(token_id), orbit_request_id.clone()),
            proposal.clone()
        );
        // Return true to confirm save
        true
    });

    // Add verification logging
    ic_cdk::println!(
        "Proposal updated: id={:?}, yes={}, no={}, saved={}",
        proposal.id, proposal.yes_votes, proposal.no_votes, save_result
    );

    // VERIFICATION: Read back to ensure it saved
    let verification = ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        proposals.borrow()
            .get(&(StorablePrincipal(token_id), orbit_request_id.clone()))
            .map(|p| (p.yes_votes, p.no_votes))
    });

    ic_cdk::println!(
        "Verification read: votes={:?}",
        verification
    );
}
```

### 4. Update Frontend Hook to Check Vote Status

**File**: `daopad_frontend/src/hooks/useProposal.ts` (MODIFY lines 70-175)

```javascript
// PSEUDOCODE
export function useProposal(tokenId, orbitRequestId, operationType) {
    const { identity } = useAuth();
    const [proposal, setProposal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hasVoted, setHasVoted] = useState(false);
    const [userVote, setUserVote] = useState(null); // NEW: Track actual vote
    const [error, setError] = useState(null);

    // NEW: Check if user has voted
    const checkVoteStatus = useCallback(async () => {
        if (!identity || !tokenId || !orbitRequestId) return;

        try {
            const proposalService = getProposalService(identity);
            const actor = await proposalService.getActor();

            // Call new backend method
            const voted = await actor.has_user_voted_on_orbit_request(
                identity.getPrincipal(),
                Principal.fromText(tokenId),
                orbitRequestId
            );

            setHasVoted(voted);

            // Get actual vote if voted
            if (voted) {
                const vote = await actor.get_user_vote_on_orbit_request(
                    identity.getPrincipal(),
                    Principal.fromText(tokenId),
                    orbitRequestId
                );
                setUserVote(vote); // Will be { Yes: null } or { No: null }
            }
        } catch (err) {
            console.error('Failed to check vote status:', err);
        }
    }, [identity, tokenId, orbitRequestId]);

    // Fetch proposal (existing code with modification)
    const fetchProposal = useCallback(async () => {
        // ... existing code ...

        // After successfully fetching proposal, check vote status
        if (result.success && result.data) {
            // ... existing proposal conversion ...
            setProposal(proposal);

            // NEW: Check if user has voted
            await checkVoteStatus();
        }
    }, [identity, tokenId, orbitRequestId, checkVoteStatus]);

    // Return updated state
    return {
        proposal,
        loading,
        hasVoted, // Now properly tracked from backend
        userVote, // NEW: Actual vote choice
        error,
        fetchProposal,
        ensureProposal,
        checkVoteStatus // NEW: Expose for manual refresh
    };
}
```

### 5. Update VoteButtons Component

**File**: `daopad_frontend/src/components/orbit/requests/VoteButtons.tsx` (MODIFY)

```javascript
// PSEUDOCODE
export function VoteButtons({
    proposalId,
    orbitRequestId,
    tokenId,
    onVote,
    disabled,
    userVotingPower,
    hasVoted, // Now comes from backend, not local state
    userVote, // NEW: Show what they voted for
    onVoteComplete
}) {
    const [voting, setVoting] = useState(null);
    // Remove localHasVoted - use prop from backend
    const [voteError, setVoteError] = useState(null);

    const handleVote = async (vote) => {
        // ... existing voting logic ...

        // After successful vote, trigger refresh
        if (onVoteComplete) {
            setTimeout(onVoteComplete, 500);
        }
    };

    // Show vote status from backend
    if (hasVoted) {
        const voteText = userVote && Object.keys(userVote)[0] === 'Yes' ? 'YES' : 'NO';
        return (
            <div className="text-sm text-muted-foreground" data-testid="vote-already-voted">
                ✓ You voted {voteText} (VP: {userVotingPower.toLocaleString()})
            </div>
        );
    }

    // ... rest of component unchanged
}
```

### 6. Pass userVote to VoteButtons

**File**: `daopad_frontend/src/components/orbit/requests/RequestCard.tsx` (MODIFY line 143-152)

```javascript
// PSEUDOCODE
<VoteButtons
    proposalId={Number(proposal.id)}
    orbitRequestId={request.id}
    tokenId={tokenId}
    onVote={onVote}
    userVotingPower={userVotingPower}
    hasVoted={hasVoted} // From backend now
    userVote={userVote} // NEW: Pass actual vote
    disabled={proposal.status && Object.keys(proposal.status)[0] !== 'Active'}
    onVoteComplete={fetchProposal}
/>
```

## Testing Requirements

### Backend Testing
```bash
# 1. Build and extract candid
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# 2. Deploy backend
./deploy.sh --network ic --backend-only

# 3. Sync declarations (CRITICAL)
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# 4. Test new methods
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai has_user_voted_on_orbit_request '(
  principal "YOUR_PRINCIPAL",
  principal "TOKEN_ID",
  "ORBIT_REQUEST_ID"
)'
```

### Frontend Testing

**Manual Verification Workflow**:
1. Open browser to deployed frontend
2. Navigate to Token Dashboard > Requests tab
3. Find a pending request
4. Vote YES or NO
5. Verify "You voted YES/NO" appears
6. Refresh the page (F5)
7. Verify:
   - Vote persists showing "You voted YES/NO"
   - Vote counts are correct (not 0)
   - Can't vote again

**Browser Console Checks**:
```javascript
// Check for errors
console.error // Should be empty

// Verify backend calls
localStorage.debug = '*'
// Look for has_user_voted_on_orbit_request calls
```

### Playwright E2E Test

**File**: `daopad_frontend/e2e/voting-persistence.spec.ts` (NEW)

```typescript
// PSEUDOCODE
import { test, expect } from '@playwright/test';
import { createDataVerifier } from './utils/data-verifier';

test.describe('Voting Persistence', () => {
    test('votes persist after page refresh', async ({ page }) => {
        // 1. Navigate to requests
        await page.goto('/token/ALEX/requests');

        // 2. Find pending request with vote buttons
        const voteButtons = page.locator('[data-testid="vote-buttons"]').first();
        await expect(voteButtons).toBeVisible();

        // 3. Get initial vote counts
        const initialYes = await page.locator('.vote-yes-count').textContent();

        // 4. Vote YES
        await page.locator('[data-testid="vote-yes-button"]').first().click();

        // 5. Wait for vote confirmation
        await expect(page.locator('[data-testid="vote-already-voted"]'))
            .toContainText('You voted YES');

        // 6. Reload page
        await page.reload();

        // 7. Verify vote persisted
        await expect(page.locator('[data-testid="vote-already-voted"]'))
            .toContainText('You voted YES');

        // 8. Verify vote count increased
        const newYes = await page.locator('.vote-yes-count').textContent();
        expect(parseInt(newYes)).toBeGreaterThan(parseInt(initialYes));
    });
});
```

## Success Criteria
✅ `has_user_voted_on_orbit_request` query method exists and works
✅ Votes persist after page refresh
✅ Vote counts don't reset to 0
✅ "You voted YES/NO" message persists
✅ Users can't double-vote
✅ Console logs show vote saving confirmation

## Rollback Plan
If issues arise:
```bash
# Revert to previous version
./deploy.sh --network ic --canister lwsav-iiaaa-aaaap-qp2qq-cai --mode reinstall
```

## Risk Assessment
- **Low Risk**: Adding query methods doesn't affect existing functionality
- **Medium Risk**: Modifying vote save logic (mitigated by logging)
- **Mitigation**: Extensive logging allows debugging without breaking votes