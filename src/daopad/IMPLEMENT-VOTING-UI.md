# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-voting-ui/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-voting-ui/src/daopad`
2. **Execute Phase 0: Research** - Verify backend APIs exist and work (30-60 min)
3. **Implement feature** - Follow plan sections below
4. **Build & Deploy**:
   - Frontend changes only:
     ```bash
     # Verify no backend changes needed
     git status daopad_backend/ | grep "nothing to commit" || \
       echo "⚠️ WARNING: Backend changes detected - should be frontend-only!"

     # Build frontend
     npm run build

     # Deploy frontend
     ./deploy.sh --network ic --frontend-only
     ```
5. **Verify Declaration Sync** (CRITICAL):
   ```bash
   # Check if backend declarations are in sync with frontend
   # If deploy.sh updated src/declarations/, sync to frontend:
   if [ -d "src/declarations/daopad_backend" ]; then
     cp -r src/declarations/daopad_backend/* \
       daopad_frontend/src/declarations/daopad_backend/
     echo "✅ Declarations synced"
   else
     echo "⚠️ No new declarations generated (OK if no backend changes)"
   fi
   ```
6. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "feat: Implement liquid democracy voting UI for all Orbit requests"
   git push -u origin feature/voting-ui
   gh pr create --title "Feature: Liquid Democracy Voting UI" --body "Implements IMPLEMENT-VOTING-UI.md - adds voting interface with 50% threshold for all Orbit requests"
   ```
7. **Iterate autonomously**:
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

**Branch:** `feature/voting-ui`
**Worktree:** `/home/theseus/alexandria/daopad-voting-ui/src/daopad`

---

# Implementation Plan: Liquid Democracy Voting UI

## 🎯 Objective

**Implement voting UI for ALL Orbit requests** using the existing liquid democracy backend. Users vote with their Kong Locker voting power, and proposals execute when they reach 50% threshold (simplified for now - risk-based thresholds in `OrbitRequestType` exist but we'll use 50% universally for this iteration).

## 📊 Current State Analysis

### ✅ Backend Infrastructure (Already Built)

The backend liquid democracy system is **complete and working**:

1. **Voting Engine** - `daopad_backend/src/proposals/orbit_requests.rs`
   - `vote_on_orbit_request(token_id, orbit_request_id, vote)` - Core voting function
   - `get_orbit_request_proposal(token_id, orbit_request_id)` - Get proposal details
   - `list_orbit_request_proposals(token_id)` - List all active proposals
   - `ensure_proposal_for_request(token_id, request_id, request_type)` - Auto-create proposals
   - Internal execution when threshold reached: `approve_orbit_request_internal()`

2. **Proposal Types** - `daopad_backend/src/proposals/types.rs`
   - `OrbitRequestProposal` struct with voting data
   - `OrbitRequestType` enum with 33 operation types
   - Risk-based voting thresholds (30-90%) per operation type
   - `ProposalStatus`: Active, Executed, Rejected, Expired

3. **Storage** - `daopad_backend/src/storage/state.rs`
   - `ORBIT_REQUEST_PROPOSALS`: Active proposal storage
   - `ORBIT_REQUEST_VOTES`: Vote tracking

4. **Kong Locker Integration** - `daopad_backend/src/kong_locker/voting.rs`
   - `get_user_voting_power_for_token()` - Get user's voting power
   - Voting power = USD value of locked LP tokens × 100

### ❌ Missing: Frontend UI (What We Need to Build)

**Current State**: Frontend has disabled approval handlers with toast messages
**Target State**: Full voting UI with:
- Vote Yes/No buttons (weighted by Kong Locker VP)
- Vote progress bars showing yes_votes/total_voting_power
- Real-time proposal status
- Auto-proposal creation when viewing requests

## 🗂️ File Tree (Before/After)

### BEFORE (Current)
```
daopad_frontend/src/
  components/
    orbit/
      UnifiedRequests.jsx           # ❌ Disabled approval handlers
      requests/
        RequestList.jsx             # Shows requests, no voting
        RequestCard.jsx             # (if exists) Basic request display
    ProposalCard.jsx                # ❌ Shows "Approve/Reject" (centralized)
    DaoProposals.jsx                # ❌ Calls approveRequest()
  services/
    daopadBackend.js                # ✅ Has voteOnOrbitRequest() method
    backend/
      proposals/
        ProposalService.js          # May need voting methods
```

### AFTER (Target)
```
daopad_frontend/src/
  components/
    orbit/
      UnifiedRequests.jsx           # ✅ Voting UI integrated
      requests/
        RequestList.jsx             # ✅ Shows vote buttons
        VoteProgressBar.jsx         # ✅ NEW: Visual vote progress
        ProposalVoteCard.jsx        # ✅ NEW: Proposal display with voting
    ProposalCard.jsx                # ✅ Updated to show VP-weighted votes
    DaoProposals.jsx                # ✅ Uses voteOnOrbitRequest()
  services/
    daopadBackend.js                # ✅ Already has voting methods
    backend/
      proposals/
        ProposalService.js          # ✅ Wrapped voting methods
  hooks/
    useVoting.js                    # ✅ NEW: Voting logic hook
    useProposal.js                  # ✅ NEW: Proposal data hook
```

## 📝 Implementation Pseudocode

### Phase 0: Research & Verification (MANDATORY - 30-60 min)

**Follow plan-pursuit-methodology: Test before implementing**

#### Step 0.1: Verify Backend API Functions

```bash
# Verify voting functions exist in Candid interface
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai __get_candid | \
  grep -E "(vote_on_orbit_request|get_orbit_request_proposal|ensure_proposal)"

# Expected output:
# vote_on_orbit_request : (principal, text, bool) -> (Result_35)
# get_orbit_request_proposal : (principal, text) -> (opt OrbitRequestProposal)
# ensure_proposal_for_request : (principal, text, OrbitRequestType) -> (Result_33)
```

#### Step 0.2: Test Voting Engine with Real Data

```bash
# Use test station: ALEX token
export TEST_TOKEN="fec7w-zyaaa-aaaaa-qaffq-cai"

# First, list requests to get a real request ID
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_orbit_requests \
  "principal \"$TEST_TOKEN\"" \
  '(record { statuses = opt vec { variant { Created } }; ... })'

# Use actual request ID from list
export TEST_REQUEST="<copy-request-id-from-output>"

# Test voting (will fail with AlreadyVoted if you already voted - that's OK!)
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai vote_on_orbit_request \
  "(principal \"$TEST_TOKEN\", \"$TEST_REQUEST\", true)"

# Expected: variant { Ok } or variant { Err = variant { AlreadyVoted = ... } }
# Both prove the function works!
```

#### Step 0.3: Test Proposal Fetching

```bash
# Get proposal for the request we just voted on
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai get_orbit_request_proposal \
  "(principal \"$TEST_TOKEN\", \"$TEST_REQUEST\")"

# Expected: opt record {
#   id = <number>;
#   yes_votes = <number>;
#   no_votes = <number>;
#   total_voting_power = <number>;
#   ...
# }
```

#### Step 0.4: Verify Voting Power Query

```bash
# Check your voting power for ALEX token
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai get_my_voting_power_for_token \
  "(principal \"$TEST_TOKEN\")"

# Expected: variant { Ok = <number> }
# If Err: You need to register your Kong Locker first
```

#### Step 0.5: Read Current Frontend Code

```bash
# Identify exactly what to replace in UnifiedRequests
rg "handleApprovalDecision|handleBatchApprove" daopad_frontend/src/components/orbit/

# Check existing voting pattern in treasury
cat daopad_frontend/src/components/orbit/UnifiedRequests.jsx | sed -n '194,211p'

# Verify DAOPadBackendService has voting methods
rg "voteOnOrbitRequest" daopad_frontend/src/services/daopadBackend.js -A 10
```

**Verification Checklist:**
- [ ] All backend functions exist and return expected types
- [ ] Can vote on real request (or get AlreadyVoted error)
- [ ] Can fetch proposal data with vote counts
- [ ] Can query voting power
- [ ] Understand current frontend approval code to be replaced

---

### Phase 1: Create Reusable Voting Components

#### Step 1.1: Vote Progress Bar Component

**File: `daopad_frontend/src/components/orbit/requests/VoteProgressBar.jsx` (NEW)**
```javascript
// PSEUDOCODE

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export function VoteProgressBar({ proposal, threshold = 50 }) {
  // Calculate percentages
  const totalVP = proposal.total_voting_power;
  const yesVotes = proposal.yes_votes;
  const noVotes = proposal.no_votes;
  const requiredVotes = (totalVP * threshold) / 100;

  const yesPercent = totalVP > 0 ? (yesVotes / totalVP) * 100 : 0;
  const noPercent = totalVP > 0 ? (noVotes / totalVP) * 100 : 0;

  // Execution status
  const willExecute = yesVotes > requiredVotes;
  const willReject = noVotes >= (totalVP - requiredVotes);

  return (
    <div className="space-y-2">
      {/* Vote counts */}
      <div className="flex justify-between text-sm">
        <div className="flex gap-4">
          <span className="text-green-600">
            Yes: {yesVotes.toLocaleString()} ({yesPercent.toFixed(1)}%)
          </span>
          <span className="text-red-600">
            No: {noVotes.toLocaleString()} ({noPercent.toFixed(1)}%)
          </span>
        </div>
        <span className="text-muted-foreground">
          Required: {requiredVotes.toLocaleString()} ({threshold}%)
        </span>
      </div>

      {/* Dual progress bars (yes and no) */}
      <div className="space-y-1">
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-green-500 transition-all"
            style={{ width: `${yesPercent}%` }}
          />
        </div>
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-red-500 transition-all"
            style={{ width: `${noPercent}%` }}
          />
        </div>
      </div>

      {/* Execution prediction */}
      {willExecute && (
        <Badge variant="success" className="text-xs">
          ✓ Will execute automatically
        </Badge>
      )}
      {willReject && (
        <Badge variant="destructive" className="text-xs">
          ✗ Will be rejected
        </Badge>
      )}

      {/* Voter participation */}
      <div className="text-xs text-muted-foreground">
        {proposal.voter_count} voters participated
      </div>
    </div>
  );
}
```

#### Step 1.2: Voting Buttons Component

**File: `daopad_frontend/src/components/orbit/requests/VoteButtons.jsx` (NEW)**
```javascript
// PSEUDOCODE

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function VoteButtons({
  proposalId,
  orbitRequestId,
  tokenId,
  onVote,
  disabled,
  userVotingPower,
  hasVoted,
  onVoteComplete  // Callback to refresh proposal data
}) {
  const [voting, setVoting] = useState(null); // 'yes' | 'no' | null
  const [localHasVoted, setLocalHasVoted] = useState(hasVoted);
  const { toast } = useToast();

  const handleVote = async (vote) => {
    setVoting(vote ? 'yes' : 'no');

    try {
      await onVote(orbitRequestId, vote);
      toast({
        title: vote ? "Voted Yes" : "Voted No",
        description: `Your voting power: ${userVotingPower.toLocaleString()}`
      });
      setLocalHasVoted(true);
      if (onVoteComplete) onVoteComplete();
    } catch (error) {
      // Handle AlreadyVoted error gracefully
      if (error.message?.includes('AlreadyVoted') || error.message?.includes('already voted')) {
        toast({
          title: "Already Voted",
          description: "You have already cast your vote on this proposal",
          variant: "default"
        });
        setLocalHasVoted(true);
      } else {
        toast({
          title: "Vote Failed",
          description: error.message,
          variant: "destructive"
        });
      }
    } finally {
      setVoting(null);
    }
  };

  if (hasVoted || localHasVoted) {
    return (
      <div className="text-sm text-muted-foreground">
        ✓ You have already voted (VP: {userVotingPower.toLocaleString()})
      </div>
    );
  }

  if (userVotingPower === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No voting power - lock LP tokens to participate
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="default"
        size="sm"
        className="flex-1 bg-green-600 hover:bg-green-700"
        onClick={() => handleVote(true)}
        disabled={disabled || voting !== null}
      >
        {voting === 'yes' ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Voting...</>
        ) : (
          <><ThumbsUp className="mr-2 h-4 w-4" /> Vote Yes ({userVotingPower.toLocaleString()} VP)</>
        )}
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
        onClick={() => handleVote(false)}
        disabled={disabled || voting !== null}
      >
        {voting === 'no' ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Voting...</>
        ) : (
          <><ThumbsDown className="mr-2 h-4 w-4" /> Vote No</>
        )}
      </Button>
    </div>
  );
}
```

### Phase 2: Custom Hooks for Voting Logic

#### Step 2.1: useVoting Hook

**File: `daopad_frontend/src/hooks/useVoting.js` (NEW)**
```javascript
// PSEUDOCODE

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DAOPadBackendService } from '@/services/daopadBackend';

export function useVoting(tokenId) {
  const { identity } = useAuth();
  const [voting, setVoting] = useState(false);
  const [userVotingPower, setUserVotingPower] = useState(0);

  // Fetch user's voting power for this token
  const fetchVotingPower = useCallback(async () => {
    if (!identity || !tokenId) return;

    try {
      const backend = new DAOPadBackendService(identity);
      const actor = await backend.getActor();
      const power = await actor.get_user_voting_power(tokenId);
      setUserVotingPower(Number(power));
    } catch (err) {
      console.error('Failed to fetch voting power:', err);
      setUserVotingPower(0);
    }
  }, [identity, tokenId]);

  // Vote on an Orbit request
  const vote = useCallback(async (orbitRequestId, voteChoice) => {
    if (!identity) throw new Error('Not authenticated');

    setVoting(true);
    try {
      const backend = new DAOPadBackendService(identity);
      const actor = await backend.getActor();

      // Call backend voting method
      await actor.vote_on_orbit_request(
        Principal.fromText(tokenId),
        orbitRequestId,
        voteChoice
      );

      return { success: true };
    } catch (error) {
      throw new Error(error.message || 'Failed to submit vote');
    } finally {
      setVoting(false);
    }
  }, [identity, tokenId]);

  return {
    vote,
    voting,
    userVotingPower,
    fetchVotingPower
  };
}
```

#### Step 2.2: useProposal Hook

**File: `daopad_frontend/src/hooks/useProposal.js` (NEW)**
```javascript
// PSEUDOCODE

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DAOPadBackendService } from '@/services/daopadBackend';
import { Principal } from '@dfinity/principal';

export function useProposal(tokenId, orbitRequestId) {
  const { identity } = useAuth();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);

  // Fetch proposal for this Orbit request
  const fetchProposal = useCallback(async () => {
    if (!identity || !tokenId || !orbitRequestId) return;

    setLoading(true);
    try {
      const backend = new DAOPadBackendService(identity);
      const actor = await backend.getActor();

      // Get existing proposal
      const proposalOpt = await actor.get_orbit_request_proposal(
        Principal.fromText(tokenId),
        orbitRequestId
      );

      if (proposalOpt.length > 0) {
        setProposal(proposalOpt[0]);
        // Note: hasVoted detection happens on vote attempt (backend returns AlreadyVoted error)
        // We don't have a query endpoint for this, so we detect it during voting
      } else {
        setProposal(null);
        setHasVoted(false);
      }
    } catch (err) {
      console.error('Failed to fetch proposal:', err);
      setProposal(null);
    } finally {
      setLoading(false);
    }
  }, [identity, tokenId, orbitRequestId]);

  // Auto-create proposal if it doesn't exist
  const ensureProposal = useCallback(async (operationType) => {
    if (!identity || !tokenId || !orbitRequestId) return;

    try {
      const backend = new DAOPadBackendService(identity);
      const actor = await backend.getActor();

      // Infer request type from operation string
      const requestType = inferRequestType(operationType);

      await actor.ensure_proposal_for_request(
        Principal.fromText(tokenId),
        orbitRequestId,
        requestType
      );

      // Refresh proposal data
      await fetchProposal();
    } catch (err) {
      console.error('Failed to create proposal:', err);
    }
  }, [identity, tokenId, orbitRequestId, fetchProposal]);

  useEffect(() => {
    fetchProposal();
  }, [fetchProposal]);

  return {
    proposal,
    loading,
    hasVoted,
    fetchProposal,
    ensureProposal
  };
}

// Helper: Map operation type string to enum variant
// MUST match backend's infer_request_type() at orbit_requests.rs:303-361
function inferRequestType(operationType) {
  const typeMap = {
    // Treasury (3)
    'Transfer': { Transfer: null },
    'AddAccount': { AddAccount: null },
    'EditAccount': { EditAccount: null },

    // Users (3)
    'AddUser': { AddUser: null },
    'EditUser': { EditUser: null },
    'RemoveUser': { RemoveUser: null },

    // Groups (3)
    'AddUserGroup': { AddUserGroup: null },
    'EditUserGroup': { EditUserGroup: null },
    'RemoveUserGroup': { RemoveUserGroup: null },

    // Canisters (9)
    'CreateExternalCanister': { CreateExternalCanister: null },
    'ConfigureExternalCanister': { ConfigureExternalCanister: null },
    'ChangeExternalCanister': { ChangeExternalCanister: null },
    'CallExternalCanister': { CallExternalCanister: null },
    'FundExternalCanister': { FundExternalCanister: null },
    'MonitorExternalCanister': { MonitorExternalCanister: null },
    'SnapshotExternalCanister': { SnapshotExternalCanister: null },
    'RestoreExternalCanister': { RestoreExternalCanister: null },
    'PruneExternalCanister': { PruneExternalCanister: null },

    // System (4)
    'SystemUpgrade': { SystemUpgrade: null },
    'SystemRestore': { SystemRestore: null },
    'SetDisasterRecovery': { SetDisasterRecovery: null },
    'ManageSystemInfo': { ManageSystemInfo: null },

    // Governance (4)
    'EditPermission': { EditPermission: null },
    'AddRequestPolicy': { AddRequestPolicy: null },
    'EditRequestPolicy': { EditRequestPolicy: null },
    'RemoveRequestPolicy': { RemoveRequestPolicy: null },

    // Assets (3)
    'AddAsset': { AddAsset: null },
    'EditAsset': { EditAsset: null },
    'RemoveAsset': { RemoveAsset: null },

    // Rules (3)
    'AddNamedRule': { AddNamedRule: null },
    'EditNamedRule': { EditNamedRule: null },
    'RemoveNamedRule': { RemoveNamedRule: null },

    // Address Book (3)
    'AddAddressBookEntry': { AddAddressBookEntry: null },
    'EditAddressBookEntry': { EditAddressBookEntry: null },
    'RemoveAddressBookEntry': { RemoveAddressBookEntry: null },
  };

  return typeMap[operationType] || { Other: operationType };
}
```

### Phase 3: Update Existing Components

#### Step 3.1: UnifiedRequests - Integrate Voting

**File: `daopad_frontend/src/components/orbit/UnifiedRequests.jsx`**
```javascript
// PSEUDOCODE

import { useVoting } from '@/hooks/useVoting';
import VoteProgressBar from './requests/VoteProgressBar';
import VoteButtons from './requests/VoteButtons';

const UnifiedRequests = ({ tokenId, identity }) => {
  const { vote, userVotingPower, fetchVotingPower } = useVoting(tokenId);

  // Fetch voting power on mount
  useEffect(() => {
    fetchVotingPower();
  }, [fetchVotingPower]);

  // ✅ REPLACE: Disabled approval handlers → Active voting
  const handleVote = async (orbitRequestId, voteChoice) => {
    await vote(orbitRequestId, voteChoice);
    // Refresh requests to show updated vote counts
    await fetchRequests();
  };

  // ❌ DELETE: handleApprovalDecision, handleBatchApprove, batch selection

  return (
    <Card>
      {/* ❌ DELETE: Batch approval UI (lines 298-337) */}

      {/* ✅ UPDATE: Request list with voting */}
      <RequestList
        requests={requests}
        userVotingPower={userVotingPower}
        onVote={handleVote}
        tokenId={tokenId}
      />
    </Card>
  );
};
```

#### Step 3.2: RequestList - Show Voting UI

**File: `daopad_frontend/src/components/orbit/requests/RequestList.jsx`**
```javascript
// PSEUDOCODE

import { useProposal } from '@/hooks/useProposal';
import VoteProgressBar from './VoteProgressBar';
import VoteButtons from './VoteButtons';

// Update RequestCard to include voting
const RequestCard = ({ request, tokenId, userVotingPower, onVote }) => {
  const { proposal, loading, hasVoted, ensureProposal } = useProposal(
    tokenId,
    request.id
  );

  // Auto-create proposal when card is viewed
  useEffect(() => {
    if (!proposal && !loading && request.status === 'Created') {
      ensureProposal(request.operation);
    }
  }, [proposal, loading, request]);

  return (
    <Card>
      {/* Existing request info */}
      <CardHeader>
        <CardTitle>{request.title}</CardTitle>
        <Badge>{request.operation}</Badge>
      </CardHeader>

      <CardContent>
        {/* ✅ ADD: Proposal voting section */}
        {proposal && request.status === 'Created' && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <h4 className="font-medium">Community Vote</h4>

            {/* Vote progress */}
            <VoteProgressBar
              proposal={proposal}
              threshold={50} // Simplified: 50% for all
            />

            {/* Vote buttons */}
            <VoteButtons
              proposalId={proposal.id}
              orbitRequestId={request.id}
              tokenId={tokenId}
              onVote={onVote}
              userVotingPower={userVotingPower}
              hasVoted={hasVoted}
              disabled={proposal.status !== 'Active'}
            />
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Loading proposal...
          </div>
        )}

        {/* No proposal yet */}
        {!proposal && !loading && request.status === 'Created' && (
          <div className="mt-4 text-sm text-muted-foreground">
            Creating proposal for community vote...
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const RequestList = ({ requests, tokenId, userVotingPower, onVote }) => {
  return (
    <div className="space-y-3">
      {requests.map(request => (
        <RequestCard
          key={request.id}
          request={request}
          tokenId={tokenId}
          userVotingPower={userVotingPower}
          onVote={onVote}
        />
      ))}
    </div>
  );
};
```

#### Step 3.3: ProposalCard - Update for Voting Power

**File: `daopad_frontend/src/components/ProposalCard.jsx`**
```javascript
// PSEUDOCODE

import VoteProgressBar from './orbit/requests/VoteProgressBar';
import VoteButtons from './orbit/requests/VoteButtons';

const ProposalCard = ({ proposal, tokenId, onVote, userVotingPower }) => {
  // ❌ DELETE: onApprove, onReject props
  // ✅ ADD: onVote prop

  return (
    <Card>
      <CardHeader>
        <CardTitle>{proposal.title}</CardTitle>
        <Badge>{getStatusText(proposal.status)}</Badge>
      </CardHeader>

      <CardContent>
        {/* ❌ DELETE: Approval count display */}

        {/* ✅ ADD: Vote progress */}
        {proposal.status === 'Active' && (
          <div className="space-y-3">
            <VoteProgressBar
              proposal={proposal}
              threshold={50}
            />

            <VoteButtons
              proposalId={proposal.id}
              orbitRequestId={proposal.orbit_request_id}
              tokenId={tokenId}
              onVote={onVote}
              userVotingPower={userVotingPower}
              hasVoted={false} // TODO: Check if user voted
            />
          </div>
        )}

        {/* ❌ DELETE: Approve/Reject buttons (lines 97-126) */}
      </CardContent>
    </Card>
  );
};
```

#### Step 3.4: DaoProposals - Use Voting

**File: `daopad_frontend/src/components/DaoProposals.jsx`**
```javascript
// PSEUDOCODE

import { useVoting } from '@/hooks/useVoting';
import ProposalCard from './ProposalCard';

const DaoProposals = ({ dao }) => {
  const { vote, userVotingPower, fetchVotingPower } = useVoting(dao.token_canister);

  useEffect(() => {
    fetchVotingPower();
  }, [fetchVotingPower]);

  // ❌ DELETE: handleApprove, handleReject

  // ✅ ADD: handleVote
  const handleVote = async (orbitRequestId, voteChoice) => {
    await vote(orbitRequestId, voteChoice);
    // Refresh proposals
    await fetchProposals();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2>Active Proposals</h2>
        <div className="text-sm text-muted-foreground">
          Your voting power: {userVotingPower.toLocaleString()}
        </div>
      </div>

      {proposals.map(proposal => (
        <ProposalCard
          key={proposal.id}
          proposal={proposal}
          tokenId={dao.token_canister}
          onVote={handleVote}
          userVotingPower={userVotingPower}
        />
      ))}
    </div>
  );
};
```

### Phase 4: Backend Service Layer

#### Step 4.1: Ensure Voting Methods in DAOPadBackendService

**File: `daopad_frontend/src/services/daopadBackend.js`**
```javascript
// PSEUDOCODE

export class DAOPadBackendService {
  // ✅ VERIFY: These methods should already exist

  async voteOnOrbitRequest(tokenId, orbitRequestId, vote) {
    const actor = await this.getActor();
    const result = await actor.vote_on_orbit_request(
      Principal.fromText(tokenId),
      orbitRequestId,
      vote
    );

    if ('Err' in result) {
      throw new Error(this.formatProposalError(result.Err));
    }

    return { success: true };
  }

  async getOrbitRequestProposal(tokenId, orbitRequestId) {
    const actor = await this.getActor();
    return await actor.get_orbit_request_proposal(
      Principal.fromText(tokenId),
      orbitRequestId
    );
  }

  async getUserVotingPower(tokenId) {
    const actor = await this.getActor();
    const caller = this.identity.getPrincipal();
    return await actor.get_user_voting_power_for_token(caller, tokenId);
  }

  formatProposalError(error) {
    // Handle typed ProposalError variants
    if ('AlreadyVoted' in error) return 'You have already voted on this proposal';
    if ('NoVotingPower' in error) return 'No voting power - lock LP tokens to vote';
    if ('Expired' in error) return 'Proposal has expired';
    if ('NotActive' in error) return 'Proposal is not active';
    // ... handle all error types
    return 'Failed to vote';
  }
}
```

## 🧪 Testing Strategy

### Manual Testing Checklist

1. **Vote Yes on Orbit Request**
   ```
   - View Orbit request in UnifiedRequests
   - Verify proposal auto-created
   - See voting power displayed
   - Click "Vote Yes"
   - Verify vote counted
   - See progress bar update
   ```

2. **Vote No on Orbit Request**
   ```
   - Same as above but click "Vote No"
   - Verify no_votes increments
   ```

3. **Threshold Execution**
   ```
   - Create test request with low VP threshold
   - Vote with 51%+ of total VP
   - Verify request auto-executes in Orbit
   - Verify proposal status → Executed
   ```

4. **Edge Cases**
   ```
   - Try to vote twice (should fail)
   - Vote with 0 VP (should show message)
   - Vote on expired proposal (should fail)
   - View executed proposal (should show results)
   ```

### Test with Real Orbit Station

```bash
# Use test station: fec7w-zyaaa-aaaaa-qaffq-cai (ALEX token)
# Use daopad identity (has admin access)

# 1. Deploy frontend
./deploy.sh --network ic --frontend-only

# 2. Visit DAOPad
https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io

# 3. View ALEX treasury requests
# 4. Vote on a test request
# 5. Verify execution at 50% threshold
```

## 📋 Acceptance Criteria

### ✅ Success Conditions

- [ ] All Orbit requests show voting UI (not approve/reject)
- [ ] Vote progress bars display yes/no vote counts
- [ ] User voting power displayed correctly
- [ ] Can vote Yes or No on any request
- [ ] Cannot vote twice on same proposal
- [ ] Proposals auto-create when viewing requests
- [ ] Request executes when 50% threshold reached
- [ ] "Already voted" message shows after voting
- [ ] Zero VP users see "lock LP tokens" message
- [ ] Vote counts update in real-time

### 🎨 UI/UX Requirements

- [ ] Green vote bar for Yes votes
- [ ] Red vote bar for No votes
- [ ] Threshold line shown on progress bar
- [ ] "Will execute" badge when threshold reached
- [ ] "Will reject" badge when rejection certain
- [ ] Voting power shown next to buttons
- [ ] Loading states during vote submission
- [ ] Success/error toasts after voting

## 🔧 Implementation Notes

### Simplified Threshold (For Now)

This implementation uses **50% universally** for simplicity:
```javascript
const threshold = 50; // Simple majority for all operations
```

The backend already supports risk-based thresholds (30-90%) via `OrbitRequestType.voting_threshold()`. Future iteration can add:
```javascript
const threshold = proposal.request_type.voting_threshold(); // 30-90% based on risk
```

### Proposal Auto-Creation

Frontend automatically creates proposals when viewing requests:
```javascript
if (!proposal && request.status === 'Created') {
  ensureProposal(request.operation);
}
```

Backend's `ensure_proposal_for_request()` is idempotent - safe to call multiple times.

### Vote Persistence

Votes stored in backend:
- `ORBIT_REQUEST_VOTES: (ProposalId, Principal) → VoteChoice`
- Check if user voted: Backend query `get_user_vote(proposal_id, caller)`
- Frontend caches `hasVoted` state per proposal

## 🚀 Deployment Order

1. **No backend changes needed** - Backend already complete
2. **Deploy frontend only**:
   ```bash
   npm run build
   ./deploy.sh --network ic --frontend-only
   ```
3. **Verify**:
   - Visit DAOPad
   - View Orbit requests
   - Test voting flow

## 📚 References

- Backend voting: `daopad_backend/src/proposals/orbit_requests.rs`
- Proposal types: `daopad_backend/src/proposals/types.rs`
- Kong Locker VP: `daopad_backend/src/kong_locker/voting.rs`
- Existing UI patterns: `daopad_frontend/src/components/ProposalCard.jsx`

---

## Post-Implementation Checklist

After implementation:
- [ ] Build succeeds without errors
- [ ] Deploy to mainnet
- [ ] Test voting on real Orbit request
- [ ] Verify threshold execution
- [ ] Check vote persistence
- [ ] Confirm no centralized approval possible
- [ ] Create PR with screenshots
