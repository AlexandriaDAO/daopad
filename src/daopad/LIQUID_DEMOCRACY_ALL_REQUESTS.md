# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-liquid-democracy/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-liquid-democracy/src/daopad`
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
   git commit -m "feat: Implement liquid democracy voting for all Orbit requests"
   git push -u origin feature/liquid-democracy-all-requests
   gh pr create --title "feat: Liquid Democracy Voting for All Orbit Requests" --body "Implements LIQUID_DEMOCRACY_ALL_REQUESTS.md - replaces direct approval with weighted voting for all Orbit Station requests"
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

**Branch:** `feature/liquid-democracy-all-requests`
**Worktree:** `/home/theseus/alexandria/daopad-liquid-democracy/src/daopad`

---

# Implementation Plan: Liquid Democracy for ALL Orbit Requests

## Problem Statement

Currently, the codebase has **6 code paths** that directly approve Orbit Station requests using backend admin authority, bypassing the liquid democracy governance model. According to `CLAUDE.md`:

> **Orbit Station is the execution engine, NOT the governance layer.**
> Real voting happens in DAOPad using Kong Locker voting power.

### Architecture Goal

```
User creates request
    ↓
Users vote (weighted by Kong Locker VP)
    ↓
Threshold reached? (e.g., 50% of total VP)
    ↓ YES
Backend auto-approves in Orbit
    ↓
Orbit executes (AutoApproved policy)
```

---

## Current State: 6 Violations

### Violation #1: Frontend Direct Approval
**File:** `daopad_frontend/src/components/orbit/UnifiedRequests.jsx:159-182`
```javascript
const handleApprovalDecision = async (requestId, decision, reason) => {
  const result = await actor.submit_request_approval(
    Principal.fromText(tokenId),
    requestId,
    { [decision]: null },  // ❌ Direct approval without voting
    reason ? [reason] : []
  );
```

### Violation #2: Frontend Batch Approval
**File:** `daopad_frontend/src/components/orbit/UnifiedRequests.jsx:185-209`
```javascript
const handleBatchApprove = async () => {
  const result = await backend.batchApproveRequests(
    Principal.fromText(tokenId),
    selectedRequests  // ❌ Batch approval without voting
  );
```

### Violation #3: Backend Direct Approval API
**File:** `daopad_backend/src/api/orbit_requests.rs:700-729`
```rust
#[update]
pub async fn submit_request_approval(
    token_canister_id: Principal,
    request_id: String,
    decision: RequestApprovalStatus,  // ❌ Direct approval endpoint
    reason: Option<String>,
) -> Result<(), String>
```

### Violation #4: Legacy Approval Function
**File:** `daopad_backend/src/api/orbit_transfers.rs:60-83`
```rust
pub async fn approve_orbit_request(
    station_id: Principal,
    request_id: String,
    _caller: Principal,
) -> Result<(), String> {
    // ❌ Comment says "Orbit handles voting internally" - wrong model
```

### Violation #5: Frontend Service Batch Wrapper
**File:** `daopad_frontend/src/services/daopadBackend.js:400-426`
```javascript
async batchApproveRequests(tokenCanisterId, requestIds) {
  // ❌ Loops through requests approving each without voting
```

### Violation #6: Frontend Service Single Approval
**File:** `daopad_frontend/src/services/daopadBackend.js:362-379`
```javascript
async approveOrbitRequest(tokenCanisterId, requestId) {
  // ❌ Direct approval method wrapper
```

---

## Correct Implementation (Reference)

**Treasury proposals already do this correctly:**

**File:** `daopad_backend/src/proposals/treasury.rs:248-258`
```rust
// Check threshold and execute atomically
if proposal.yes_votes > required_votes {
    // Execute immediately - approve the Orbit request
    approve_orbit_request(station_id, &proposal.orbit_request_id).await?;
    // ✅ Only approves AFTER liquid democracy threshold reached
}
```

---

## Implementation Plan

### Phase 1: Backend Storage Layer

#### File: `daopad_backend/src/proposals/types.rs` (MODIFY)

```rust
// PSEUDOCODE

// Add new proposal type for generic Orbit requests
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum ProposalType {
    OrbitLink,
    Transfer,
    OrbitRequest(OrbitRequestType),  // NEW: Generic Orbit request
}

// Categorize different request types
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum OrbitRequestType {
    EditAccount,
    AddUser,
    RemoveUser,
    ChangeExternalCanister,
    ConfigureExternalCanister,
    EditPermission,
    AddRequestPolicy,
    Other(String),  // Catch-all for unknown types
}

// Extend TreasuryProposal to support any Orbit request
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct OrbitRequestProposal {
    pub id: ProposalId,
    pub token_canister_id: Principal,
    pub orbit_request_id: String,  // UUID from Orbit
    pub request_type: OrbitRequestType,
    pub proposer: Principal,
    pub created_at: u64,
    pub expires_at: u64,
    pub yes_votes: u64,
    pub no_votes: u64,
    pub total_voting_power: u64,
    pub voter_count: u64,
    pub status: ProposalStatus,
}
```

#### File: `daopad_backend/src/storage/state.rs` (MODIFY)

```rust
// PSEUDOCODE

// Add storage for generic Orbit request proposals
// Key: (token_id, orbit_request_id)
// Value: OrbitRequestProposal
thread_local! {
    pub static ORBIT_REQUEST_PROPOSALS: RefCell<
        StableBTreeMap<(StorablePrincipal, String), OrbitRequestProposal, Memory>
    > = // ... initialize

    // Track which users voted on which requests
    // Key: (proposal_id, voter_principal)
    // Value: VoteChoice
    pub static ORBIT_REQUEST_VOTES: RefCell<
        StableBTreeMap<(ProposalId, StorablePrincipal), VoteChoice, Memory>
    > = // ... initialize
}
```

### Phase 2: Backend Voting Logic

#### File: `daopad_backend/src/proposals/orbit_requests.rs` (NEW)

```rust
// PSEUDOCODE

use crate::kong_locker::voting::get_user_voting_power_for_token;
use crate::proposals::types::*;
use crate::storage::state::*;

const DEFAULT_VOTING_PERIOD_NANOS: u64 = 604_800_000_000_000; // 7 days
const DEFAULT_THRESHOLD_PERCENT: u32 = 50;

/// Vote on ANY Orbit request (not just treasury transfers)
#[update]
pub async fn vote_on_orbit_request(
    token_id: Principal,
    orbit_request_id: String,
    vote: bool,  // true = Yes, false = No
) -> Result<(), ProposalError> {
    let voter = ic_cdk::caller();

    // 1. Load or create proposal
    let mut proposal = ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        proposals
            .borrow()
            .get(&(StorablePrincipal(token_id), orbit_request_id.clone()))
            .ok_or(ProposalError::NotFound(orbit_request_id))
    })?;

    // 2. Validate: Active, not expired, haven't voted
    if proposal.status != ProposalStatus::Active {
        return Err(ProposalError::NotActive);
    }

    let now = time();
    if now > proposal.expires_at {
        proposal.status = ProposalStatus::Expired;
        // Clean up expired proposal
        return Err(ProposalError::Expired);
    }

    let has_voted = ORBIT_REQUEST_VOTES.with(|votes| {
        votes.borrow().contains_key(&(proposal.id, StorablePrincipal(voter)))
    });

    if has_voted {
        return Err(ProposalError::AlreadyVoted(proposal.id));
    }

    // 3. Get voting power from Kong Locker
    let voting_power = get_user_voting_power_for_token(voter, token_id).await?;

    if voting_power == 0 {
        return Err(ProposalError::NoVotingPower);
    }

    // 4. Record vote
    if vote {
        proposal.yes_votes += voting_power;
    } else {
        proposal.no_votes += voting_power;
    }
    proposal.voter_count += 1;

    ORBIT_REQUEST_VOTES.with(|votes| {
        votes.borrow_mut().insert(
            (proposal.id, StorablePrincipal(voter)),
            if vote { VoteChoice::Yes } else { VoteChoice::No }
        );
    });

    // 5. Check threshold and execute atomically
    let required_votes = (proposal.total_voting_power * DEFAULT_THRESHOLD_PERCENT as u64) / 100;

    if proposal.yes_votes > required_votes {
        // ✅ Execute: Approve in Orbit Station
        let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
            stations.borrow().get(&StorablePrincipal(token_id)).map(|s| s.0)
        })?;

        // Use existing approve_orbit_request function
        approve_orbit_request_internal(station_id, &proposal.orbit_request_id).await?;

        proposal.status = ProposalStatus::Executed;

        // Clean up from active proposals
        ORBIT_REQUEST_PROPOSALS.with(|proposals| {
            proposals.borrow_mut().remove(&(StorablePrincipal(token_id), orbit_request_id));
        });

    } else if proposal.no_votes >= (proposal.total_voting_power - required_votes) {
        // Mathematically impossible to pass - reject
        let station_id = TOKEN_ORBIT_STATIONS.with(/*...*/)?;

        // Attempt to reject in Orbit (log error but don't fail)
        if let Err(e) = reject_orbit_request_internal(station_id, &proposal.orbit_request_id).await {
            ic_cdk::println!("Warning: Failed to reject Orbit request: {:?}", e);
        }

        proposal.status = ProposalStatus::Rejected;

        ORBIT_REQUEST_PROPOSALS.with(|proposals| {
            proposals.borrow_mut().remove(&(/*...*/));
        });

    } else {
        // Still active - update vote counts
        ORBIT_REQUEST_PROPOSALS.with(|proposals| {
            proposals.borrow_mut().insert(/*...*/, proposal);
        });
    }

    Ok(())
}

/// Get proposal for a specific Orbit request
#[query]
pub fn get_orbit_request_proposal(
    token_id: Principal,
    orbit_request_id: String,
) -> Option<OrbitRequestProposal> {
    ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        proposals
            .borrow()
            .get(&(StorablePrincipal(token_id), orbit_request_id))
            .cloned()
    })
}

/// List all active proposals for a token
#[query]
pub fn list_orbit_request_proposals(token_id: Principal) -> Vec<OrbitRequestProposal> {
    ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        proposals
            .borrow()
            .iter()
            .filter(|((t, _), p)| t.0 == token_id && p.status == ProposalStatus::Active)
            .map(|(_, p)| p.clone())
            .collect()
    })
}

// Internal helper functions

async fn approve_orbit_request_internal(
    station_id: Principal,
    request_id: &str,
) -> Result<(), ProposalError> {
    use crate::api::{RequestApprovalDecision, SubmitRequestApprovalInput, SubmitRequestApprovalResult};

    let input = SubmitRequestApprovalInput {
        request_id: request_id.to_string(),
        decision: RequestApprovalDecision::Approve,
        reason: Some("DAOPad proposal approved by community vote".to_string()),
    };

    let result: Result<(SubmitRequestApprovalResult,), _> =
        ic_cdk::call(station_id, "submit_request_approval", (input,)).await;

    match result {
        Ok((SubmitRequestApprovalResult::Ok(_),)) => Ok(()),
        Ok((SubmitRequestApprovalResult::Err(e),)) => Err(ProposalError::OrbitError {
            code: e.code,
            message: e.message,
        }),
        Err((code, msg)) => Err(ProposalError::IcCallFailed {
            code: code as i32,
            message: msg,
        }),
    }
}

async fn reject_orbit_request_internal(
    station_id: Principal,
    request_id: &str,
) -> Result<(), ProposalError> {
    // Similar to approve but with Reject decision
    // ...
}
```

### Phase 3: Remove Direct Approval Methods

#### File: `daopad_backend/src/api/orbit_requests.rs` (MODIFY)

```rust
// PSEUDOCODE

// ❌ DELETE: submit_request_approval (lines 700-729)
// This was the direct approval endpoint - no longer needed

// Keep list_orbit_requests (it's read-only, safe)
```

#### File: `daopad_backend/src/api/orbit_transfers.rs` (MODIFY)

```rust
// PSEUDOCODE

// ❌ DELETE: approve_orbit_request (lines 60-83)
// This was the legacy approval function

// The internal approval logic moves to proposals/orbit_requests.rs
```

### Phase 4: Frontend - Replace Approve/Reject with Voting UI

#### File: `daopad_frontend/src/components/orbit/UnifiedRequests.jsx` (MODIFY)

```javascript
// PSEUDOCODE

// ❌ DELETE: handleApprovalDecision (lines 159-182)
// ❌ DELETE: handleBatchApprove (lines 185-209)

// ✅ ADD: Vote handler
const handleVote = async (requestId, vote, request) => {
  if (!identity) return;

  try {
    const backend = new DAOPadBackendService(identity);
    const result = await backend.voteOnOrbitRequest(
      Principal.fromText(tokenId),
      requestId,
      vote  // true = Yes, false = No
    );

    if (result.success) {
      toast.success(`Vote ${vote ? 'Yes' : 'No'} recorded`);
      await fetchRequests();  // Refresh to show updated vote counts
    } else {
      throw new Error(result.error || 'Failed to vote');
    }
  } catch (err) {
    toast.error(err.message || 'Failed to vote');
  }
};

// ✅ MODIFY: Request list to show voting interface
<RequestList
  requests={requests}
  loading={loading}
  error={error}
  onVoteYes={(id, request) => handleVote(id, true, request)}
  onVoteNo={(id, request) => handleVote(id, false, request)}
  onRetry={fetchRequests}
/>
```

#### File: `daopad_frontend/src/components/orbit/RequestList.jsx` (MODIFY)

```javascript
// PSEUDOCODE

const RequestList = ({
  requests,
  loading,
  error,
  onVoteYes,   // NEW: Vote Yes handler
  onVoteNo,    // NEW: Vote No handler
  onRetry
}) => {
  // ❌ DELETE: Approve/Reject dialog state
  // ❌ DELETE: handleReject, confirmReject

  // ✅ ADD: Vote dialog for confirmation
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [votingOnId, setVotingOnId] = useState(null);
  const [voteChoice, setVoteChoice] = useState(null);

  const handleVoteClick = (requestId, vote) => {
    setVotingOnId(requestId);
    setVoteChoice(vote);
    setVoteDialogOpen(true);
  };

  const confirmVote = () => {
    if (votingOnId && voteChoice !== null) {
      if (voteChoice) {
        onVoteYes(votingOnId);
      } else {
        onVoteNo(votingOnId);
      }
    }
    setVoteDialogOpen(false);
    setVotingOnId(null);
    setVoteChoice(null);
  };

  return (
    <>
      {requests.map((request) => {
        // ✅ ADD: Show vote counts and progress
        const proposal = request.proposal_data;  // Fetched from backend
        const yesVotes = proposal?.yes_votes || 0;
        const noVotes = proposal?.no_votes || 0;
        const totalVP = proposal?.total_voting_power || 1;
        const yesPercent = (yesVotes / totalVP) * 100;
        const noPercent = (noVotes / totalVP) * 100;
        const threshold = 50; // 50% threshold

        return (
          <Card key={request.id}>
            <CardHeader>
              {/* ... title, status ... */}
            </CardHeader>

            <CardContent>
              {/* ✅ ADD: Voting progress display */}
              {proposal && (
                <div className="voting-progress">
                  <div className="flex justify-between mb-2">
                    <span>Yes: {yesPercent.toFixed(1)}%</span>
                    <span>No: {noPercent.toFixed(1)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-yes"
                      style={{ width: `${yesPercent}%` }}
                    />
                    <div
                      className="progress-no"
                      style={{ width: `${noPercent}%` }}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Threshold: {threshold}% | {proposal.voter_count} votes
                  </div>
                </div>
              )}
            </CardContent>

            {/* ❌ REPLACE: Approve/Reject buttons */}
            {/* ✅ WITH: Vote Yes/No buttons */}
            {canVote && (
              <CardFooter className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVoteClick(request.id, false)}
                >
                  <ThumbsDown className="h-4 w-4 mr-1" />
                  Vote No
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleVoteClick(request.id, true)}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Vote Yes
                </Button>
              </CardFooter>
            )}
          </Card>
        );
      })}

      {/* ✅ ADD: Vote confirmation dialog */}
      <Dialog open={voteDialogOpen} onOpenChange={setVoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {voteChoice ? 'Vote Yes' : 'Vote No'}
            </DialogTitle>
            <DialogDescription>
              Your vote will be weighted by your Kong Locker voting power.
              {voteChoice
                ? ' Voting Yes will help this request reach the approval threshold.'
                : ' Voting No will make it harder for this request to be approved.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={voteChoice ? 'default' : 'destructive'}
              onClick={confirmVote}
            >
              {voteChoice ? 'Confirm Vote Yes' : 'Confirm Vote No'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
```

#### File: `daopad_frontend/src/services/daopadBackend.js` (MODIFY)

```javascript
// PSEUDOCODE

// ❌ DELETE: batchApproveRequests (lines 400-426)
// ❌ DELETE: approveOrbitRequest (lines 362-379)
// ❌ DELETE: rejectOrbitRequest (lines 381-398)

// ✅ ADD: Vote on Orbit request method
async voteOnOrbitRequest(tokenCanisterId, requestId, vote) {
  try {
    const actor = await this.getActor();
    const result = await actor.vote_on_orbit_request(
      Principal.fromText(tokenCanisterId),
      requestId,
      vote  // boolean: true = Yes, false = No
    );

    if ('Ok' in result) {
      return { success: true };
    } else {
      return { success: false, error: result.Err };
    }
  } catch (error) {
    console.error('Failed to vote on orbit request:', error);
    return { success: false, error: error.message };
  }
}

// ✅ ADD: Get proposal for a specific request
async getOrbitRequestProposal(tokenCanisterId, requestId) {
  try {
    const actor = await this.getActor();
    const result = await actor.get_orbit_request_proposal(
      Principal.fromText(tokenCanisterId),
      requestId
    );

    // Returns Option<OrbitRequestProposal>
    return { success: true, data: result[0] || null };
  } catch (error) {
    console.error('Failed to get orbit request proposal:', error);
    return { success: false, error: error.message };
  }
}

// ✅ ADD: List all proposals for a token
async listOrbitRequestProposals(tokenCanisterId) {
  try {
    const actor = await this.getActor();
    const result = await actor.list_orbit_request_proposals(
      Principal.fromText(tokenCanisterId)
    );

    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to list orbit request proposals:', error);
    return { success: false, error: error.message };
  }
}
```

### Phase 5: Frontend - Fetch Proposal Data with Requests

#### File: `daopad_frontend/src/components/orbit/UnifiedRequests.jsx` (MODIFY)

```javascript
// PSEUDOCODE

// ✅ MODIFY: fetchRequests to also fetch proposal data
const fetchRequests = useCallback(async () => {
  if (!tokenId || !identity) return;

  try {
    setLoading(true);
    setError(null);

    const backend = new DAOPadBackendService(identity);
    const actor = await backend.getActor();

    // Get requests from Orbit
    const result = await actor.list_orbit_requests(
      Principal.fromText(tokenId),
      listRequestsInput
    );

    if ('Ok' in result) {
      const response = result.Ok;
      let allRequests = response.requests || [];

      // ✅ NEW: Fetch proposal data for each request
      const proposalsResult = await backend.listOrbitRequestProposals(
        Principal.fromText(tokenId)
      );

      const proposalsMap = {};
      if (proposalsResult.success && proposalsResult.data) {
        for (const proposal of proposalsResult.data) {
          proposalsMap[proposal.orbit_request_id] = proposal;
        }
      }

      // Attach proposal data to each request
      allRequests = allRequests.map(req => ({
        ...req,
        proposal_data: proposalsMap[req.id] || null
      }));

      setRequests(allRequests);
      // ... rest of fetchRequests
    }
  } catch (err) {
    // ... error handling
  } finally {
    setLoading(false);
  }
}, [tokenId, identity, selectedDomain, filters, showOnlyPending, toast]);
```

### Phase 6: Backend - Auto-Create Proposals for New Requests

#### File: `daopad_backend/src/proposals/orbit_requests.rs` (ADD TO)

```rust
// PSEUDOCODE

/// Auto-create proposal when a new Orbit request is detected
/// Call this whenever list_orbit_requests finds a new request without a proposal
#[update]
pub async fn ensure_proposal_for_request(
    token_id: Principal,
    orbit_request_id: String,
    request_type: OrbitRequestType,
) -> Result<ProposalId, ProposalError> {
    // Check if proposal already exists
    let existing = ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        proposals
            .borrow()
            .get(&(StorablePrincipal(token_id), orbit_request_id.clone()))
    });

    if let Some(proposal) = existing {
        return Ok(proposal.id);
    }

    // Create new proposal
    let proposal_id = ProposalId::new();
    let now = time();

    // Get total voting power
    let total_voting_power = get_total_voting_power_for_token(token_id).await?;

    let proposal = OrbitRequestProposal {
        id: proposal_id,
        token_canister_id: token_id,
        orbit_request_id: orbit_request_id.clone(),
        request_type,
        proposer: ic_cdk::caller(),
        created_at: now,
        expires_at: now + DEFAULT_VOTING_PERIOD_NANOS,
        yes_votes: 0,
        no_votes: 0,
        total_voting_power,
        voter_count: 0,
        status: ProposalStatus::Active,
    };

    ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(
            (StorablePrincipal(token_id), orbit_request_id),
            proposal
        );
    });

    Ok(proposal_id)
}

async fn get_total_voting_power_for_token(token: Principal) -> Result<u64, ProposalError> {
    use crate::kong_locker::voting::calculate_voting_power_for_token;
    use crate::storage::state::KONG_LOCKER_PRINCIPALS;

    let all_kong_lockers = KONG_LOCKER_PRINCIPALS.with(|principals| {
        principals.borrow().iter().map(|(_, locker)| locker.0).collect::<Vec<Principal>>()
    });

    let mut total_power = 0u64;

    for kong_locker in all_kong_lockers {
        match calculate_voting_power_for_token(kong_locker, token).await {
            Ok(power) => total_power += power,
            Err(_) => continue,
        }
    }

    if total_power == 0 {
        return Err(ProposalError::ZeroVotingPower);
    }

    Ok(total_power)
}
```

### Phase 7: Update Module Exports

#### File: `daopad_backend/src/proposals/mod.rs` (MODIFY)

```rust
// PSEUDOCODE

pub mod orbit_link;
pub mod orbit_requests;  // NEW module
pub mod storage;
pub mod treasury;
pub mod types;
pub mod voting;

// Re-export new types
pub use orbit_requests::{
    ensure_proposal_for_request,
    get_orbit_request_proposal,
    list_orbit_request_proposals,
    vote_on_orbit_request,
};
pub use types::{OrbitRequestProposal, OrbitRequestType};
```

#### File: `daopad_backend/src/lib.rs` (MODIFY)

```rust
// PSEUDOCODE

pub use proposals::{
    // ... existing exports
    OrbitRequestProposal,
    OrbitRequestType,
};
```

---

## Testing Strategy

### 1. Type Discovery (Before Implementation)

```bash
# Test Orbit Station's list_requests to understand response structure
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_requests '(record {
  statuses = opt vec { variant { Created } };
  requester_ids = null;
  approver_ids = null;
  created_from_dt = null;
  created_to_dt = null;
  expiration_from_dt = null;
  expiration_to_dt = null;
  operation_types = null;
  paginate = opt record { offset = null; limit = opt 5 };
  sort_by = null;
  only_approvable = false;
  with_evaluation_results = false;
  deduplication_keys = null;
  tags = null;
})'

# Verify submit_request_approval structure
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai __get_candid
```

### 2. Backend Build & Validation

```bash
cd /home/theseus/alexandria/daopad-liquid-democracy/src/daopad

# Build backend
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked

# Generate candid
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Verify new methods are in candid
grep "vote_on_orbit_request" daopad_backend/daopad_backend.did
grep "get_orbit_request_proposal" daopad_backend/daopad_backend.did
grep "list_orbit_request_proposals" daopad_backend/daopad_backend.did
```

### 3. Backend Deployment

```bash
./deploy.sh --network ic --backend-only

# Verify deployment
dfx canister --network ic status lwsav-iiaaa-aaaap-qp2qq-cai
```

### 4. Sync Declarations (CRITICAL)

```bash
# Copy generated declarations to frontend
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# Verify sync
grep "vote_on_orbit_request" daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js
```

### 5. Frontend Build & Deployment

```bash
cd daopad_frontend
npm run build

cd ..
./deploy.sh --network ic --frontend-only

# Verify frontend deployment
curl -I https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
```

### 6. End-to-End Testing

```bash
# Test voting flow:
# 1. Navigate to https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
# 2. Connect with Internet Identity
# 3. Navigate to Activity tab
# 4. Find a pending request
# 5. Click "Vote Yes" - should show vote confirmation dialog
# 6. Confirm vote - should record vote and update UI
# 7. Check vote counts increase
# 8. Have multiple users vote to reach threshold
# 9. Verify request auto-approves in Orbit when threshold reached
```

### 7. Verification Commands

```bash
# Check if proposal exists for a request
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai get_orbit_request_proposal '(
  principal "ALEX_TOKEN_ID",
  "REQUEST_UUID"
)'

# List all active proposals for a token
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_orbit_request_proposals '(
  principal "ALEX_TOKEN_ID"
)'

# Vote on a request
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai vote_on_orbit_request '(
  principal "ALEX_TOKEN_ID",
  "REQUEST_UUID",
  true
)'
```

---

## Migration Considerations

### Handling Existing Requests

Existing Orbit requests created before this implementation won't have proposals. Two options:

**Option A: Auto-create proposals on first fetch**
- When `list_orbit_requests` runs, check each request against `ORBIT_REQUEST_PROPOSALS`
- If no proposal exists, call `ensure_proposal_for_request`
- Pros: Seamless migration
- Cons: Extra call overhead

**Option B: Manual migration script**
- Admin runs one-time script to create proposals for all pending requests
- Pros: Clean separation
- Cons: Requires admin action

**Recommendation:** Option A for seamless UX.

### Backward Compatibility

- Old frontend code calling `submit_request_approval` will fail with "method not found"
- This is INTENTIONAL - forces migration to voting system
- No backward compatibility needed since this is mainnet-only and we control all deployments

---

## Success Criteria

### Backend
- [ ] `vote_on_orbit_request` method works and records weighted votes
- [ ] Threshold calculation matches treasury proposal logic
- [ ] Auto-approval in Orbit executes when threshold reached
- [ ] Proposals are cleaned up after execution/rejection/expiration
- [ ] Direct approval endpoints removed from API

### Frontend
- [ ] Activity tab shows vote progress bars with percentages
- [ ] Vote Yes/No buttons replace Approve/Reject
- [ ] Vote confirmation dialog explains voting power weighting
- [ ] UI updates after voting to show new vote counts
- [ ] Batch approval buttons removed entirely

### Integration
- [ ] Voting works across all request types (EditAccount, AddUser, ChangeCanister, etc.)
- [ ] Kong Locker voting power correctly fetched and applied
- [ ] Multiple users can vote on same request
- [ ] Threshold reached → auto-approval → Orbit execution pipeline works
- [ ] No code path allows direct approval without voting

---

## Deployment Checklist

1. [ ] Backend deployed with new voting methods
2. [ ] Candid interface updated and synced to frontend
3. [ ] Frontend deployed with voting UI
4. [ ] Verified old approval methods return errors
5. [ ] Created test requests and voted to threshold
6. [ ] Confirmed auto-approval in Orbit Station
7. [ ] Checked all 6 violation files - no direct approval code remains

---

## File Change Summary

### Files to DELETE
- None (removing functions, not entire files)

### Files to MODIFY
- `daopad_backend/src/proposals/types.rs` - Add OrbitRequestProposal type
- `daopad_backend/src/storage/state.rs` - Add ORBIT_REQUEST_PROPOSALS storage
- `daopad_backend/src/api/orbit_requests.rs` - Remove submit_request_approval
- `daopad_backend/src/api/orbit_transfers.rs` - Remove approve_orbit_request
- `daopad_backend/src/proposals/mod.rs` - Export new module
- `daopad_backend/src/lib.rs` - Export new types
- `daopad_frontend/src/components/orbit/UnifiedRequests.jsx` - Replace approve with vote
- `daopad_frontend/src/components/orbit/RequestList.jsx` - Vote UI
- `daopad_frontend/src/services/daopadBackend.js` - Remove approve, add vote methods

### Files to CREATE
- `daopad_backend/src/proposals/orbit_requests.rs` - Complete voting logic

---

## Expected LOC Changes

- Backend: +400 lines (new voting module), -150 lines (removed approval methods) = **+250 net**
- Frontend: +150 lines (voting UI), -100 lines (removed approval UI) = **+50 net**
- Total: **+300 lines** (adds complete governance layer for all requests)

---

## Risk Mitigation

### Risk: Breaking existing in-flight requests
**Mitigation:**
- Proposals auto-created for all pending requests on first fetch
- Old requests continue to work through voting system

### Risk: Users confused by voting vs direct approval
**Mitigation:**
- Vote dialog explains voting power weighting
- Progress bars show visual feedback
- Threshold percentage clearly displayed

### Risk: Threshold never reached due to low participation
**Mitigation:**
- 7-day expiry ensures requests don't hang forever
- Can adjust threshold percentage if needed (currently 50%)
- High VP users can propose and vote immediately

### Risk: Performance with many proposals
**Mitigation:**
- Proposals cleaned up after execution/rejection/expiration
- Only active proposals stored in main map
- Archive support can be added later if needed

---

## Future Enhancements (Out of Scope)

- [ ] Configurable threshold percentages per token
- [ ] Vote delegation (vote on behalf of others)
- [ ] Vote time-locking (commit vote before revealing)
- [ ] Proposal discussion threads
- [ ] Email/push notifications when threshold approaching
- [ ] Analytics dashboard for voting patterns

---

**Implementation Notes:**
- Follow treasury.rs patterns exactly - it's the proven reference
- Test each phase before moving to next
- Deploy backend first, then frontend (avoid type mismatches)
- Use test station (fec7w-zyaaa-aaaaa-qaffq-cai) for dfx testing
- Always sync declarations after backend changes
