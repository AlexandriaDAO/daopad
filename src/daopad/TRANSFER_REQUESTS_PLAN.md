# Transfer Requests UI Implementation Plan

## 🚨 MANDATORY: ISOLATION CHECK AND EXECUTION PROMPT

### Context: Worktree Already Created

**This plan was created by the planning agent in an isolated worktree.**

**Location:** `/home/theseus/alexandria/daopad-transfer-requests/src/daopad`
**Branch:** `feature/transfer-requests`
**Plan file:** `TRANSFER_REQUESTS_PLAN.md` (in this worktree)

### Step 0: Verify Isolation (RUN THIS FIRST!)

```bash
# STOP! Verify you are in the correct worktree
REPO_ROOT=$(git rev-parse --show-toplevel)
CURRENT_BRANCH=$(git branch --show-current)

# Check you're NOT in main repo
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: You are in the MAIN repository"
    echo "❌ This plan was created in a worktree at:"
    echo "    /home/theseus/alexandria/daopad-transfer-requests"
    echo ""
    echo "Navigate to the worktree:"
    echo "  cd /home/theseus/alexandria/daopad-transfer-requests/src/daopad"
    echo "  cat TRANSFER_REQUESTS_PLAN.md  # Plan is here"
    exit 1
fi

# Check you're on the right branch
if [ "$CURRENT_BRANCH" != "feature/transfer-requests" ]; then
    echo "❌ WARNING: You are on branch '$CURRENT_BRANCH'"
    echo "Expected: feature/transfer-requests"
    echo "Are you in the right worktree?"
    exit 1
fi

echo "✅ You are in the correct worktree: $REPO_ROOT"
echo "✅ On branch: $CURRENT_BRANCH"
echo "✅ Safe to proceed with implementation"
```

### Your Execution Prompt

You are an autonomous PR orchestrator implementing Transfer Requests UI functionality.

**NOTE:** The planning agent already created this worktree and this plan. You will navigate there and execute.

EXECUTE THESE STEPS AUTONOMOUSLY (DO NOT ASK FOR PERMISSION):

Step 0 - NAVIGATE TO WORKTREE (DO THIS FIRST):
  cd /home/theseus/alexandria/daopad-transfer-requests/src/daopad

Step 1 - VERIFY ISOLATION:
  # Verify you're in the right place
  pwd  # Should show /home/theseus/alexandria/daopad-transfer-requests/src/daopad
  git branch --show-current  # Should show feature/transfer-requests
  ls TRANSFER_REQUESTS_PLAN.md  # This plan should be here

Step 2 - Implement Feature:
  Wire up TransferRequestDialog to AccountsTable
  Add transfer button to trigger dialog
  Connect backend treasury proposal API
  Update UnifiedRequests for treasury proposals
  Test end-to-end flow on mainnet

Step 3 - Build and Deploy:
  # Backend (if modified):
  cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
  candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
  ./deploy.sh --network ic --backend-only

  # CRITICAL: Sync declarations
  cp -r ../../.dfx/ic/canisters/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

  # Frontend (if modified):
  ./deploy.sh --network ic --frontend-only

Step 4 - Commit and Push:
  git add -A
  git commit -m "feat: Add transfer request UI functionality"
  git push -u origin feature/transfer-requests

Step 5 - Create PR:
  gh pr create --title "feat: Add transfer request UI functionality" --body "Complete implementation"

YOUR CRITICAL RULES:
- You MUST work in /home/theseus/alexandria/daopad-transfer-requests/src/daopad (NOT main repo)
- Other agents ARE working in parallel - isolation is MANDATORY
- After sleep: IMMEDIATELY continue
- Run candid-extractor after backend changes
- Sync declarations after backend changes
- ONLY STOP when: approved or critical error

START NOW with Step 0.

---

## 🎯 Task Type Recognition

**Task Type:** NEW FEATURE - Building transfer request UI functionality that partially exists but isn't connected

**Goal:** Enable users to create treasury transfer requests through the UI
**Approach:** Connect existing components and fill gaps
**Success:** Users can create transfer requests that appear in Activity tab

---

## Current State

### File Tree (Relevant Sections)
```
daopad_backend/
├── src/
│   ├── api/
│   │   ├── mod.rs (exports transfer functions)
│   │   ├── orbit.rs (has create_transfer_request wrapper)
│   │   └── orbit_transfers.rs (core transfer logic)
│   ├── proposals/
│   │   └── treasury.rs (NEW - treasury proposal system)
│   └── types/
│       └── orbit.rs (transfer types defined)

daopad_frontend/
├── src/
│   ├── components/
│   │   ├── tables/
│   │   │   └── AccountsTable.jsx (shows accounts, NO transfer button)
│   │   ├── orbit/
│   │   │   ├── TransferDialog.jsx (EXISTS but not imported)
│   │   │   ├── TransferRequestDialog.jsx (EXISTS but not imported)
│   │   │   ├── UnifiedRequests.jsx (shows requests)
│   │   │   └── dashboard/
│   │   │       └── TreasuryOverview.jsx (has onTransfer callback)
│   │   └── TokenDashboard.jsx (main dashboard, Treasury tab)
│   └── services/
│       └── daopadBackend.js (has createTransferRequest method)
```

### Existing Implementations

#### Backend
1. **Treasury Proposal System** (`proposals/treasury.rs:81-162`)
   - `create_treasury_transfer_proposal()` - Creates proposal + Orbit request
   - Requires minimum 10,000 VP to propose
   - Creates Orbit request in pending state
   - Community votes on DAOPad proposal
   - Auto-approves Orbit request when threshold reached

2. **Direct Transfer Request** (`api/orbit.rs:222-256`)
   - `create_transfer_request()` - Direct Orbit request (bypasses proposal)
   - Currently wired to frontend but should use proposal system

#### Frontend
1. **TransferDialog.jsx** - Complete dialog for transfers
   - Form with amount, recipient, memo fields
   - Calls `station.createTransfer()` (wrong - should use backend)
   - NOT imported anywhere

2. **TransferRequestDialog.jsx** - Alternative dialog
   - Similar to TransferDialog
   - Calls `backend.createTransferRequest()` (correct approach)
   - NOT imported anywhere

3. **AccountsTable.jsx** - Shows treasury accounts
   - NO transfer button currently
   - Just displays account data

4. **UnifiedRequests.jsx** - Shows and manages requests
   - Currently shows Orbit requests
   - Needs to also show treasury proposals

### Dependencies
- Backend uses `ic_cdk` for canister calls
- Frontend uses React hooks and shadcn/ui components
- Orbit Station integration via candid interface
- Backend is admin for all Orbit Stations

### Constraints
- Must use treasury proposal system (not direct requests)
- Minimum 10,000 VP required to create proposals
- Cannot change Orbit Station APIs
- Must maintain backward compatibility
- Always deploy to mainnet (no local testing)

---

## Implementation Plan

### Frontend File 1: `daopad_frontend/src/components/tables/AccountsTable.jsx` (MODIFY)

**Current State:** No transfer functionality

**After:** Add transfer button and dialog

```javascript
// PSEUDOCODE - implementing agent will write real code

// Add imports at top
import TransferRequestDialog from '../orbit/TransferRequestDialog';
import { Button } from '../ui/button';
import { ArrowUpRight } from 'lucide-react';

// Add state
const [transferDialog, setTransferDialog] = useState({
  open: false,
  account: null,
  asset: null
});

// Add transfer handler
const handleTransfer = (account, asset) => {
  setTransferDialog({
    open: true,
    account,
    asset
  });
};

// In the table rows, add Transfer button
<TableCell>
  <Button
    variant="outline"
    size="sm"
    onClick={() => handleTransfer(account, getAssetForAccount(account))}
  >
    <ArrowUpRight className="w-4 h-4 mr-2" />
    Transfer
  </Button>
</TableCell>

// At component end, render dialog
{transferDialog.open && (
  <TransferRequestDialog
    open={transferDialog.open}
    onOpenChange={(open) => setTransferDialog(prev => ({ ...prev, open }))}
    account={transferDialog.account}
    asset={transferDialog.asset}
    stationId={stationId}
    tokenId={tokenId}
    votingPower={votingPower}
    identity={identity}
    onTransferComplete={handleRefresh}
  />
)}
```

### Frontend File 2: `daopad_frontend/src/components/orbit/TransferRequestDialog.jsx` (MODIFY)

**Current State:** Uses direct transfer request

**After:** Use treasury proposal system

```javascript
// PSEUDOCODE - implementing agent will write real code

// Update the submit handler
const onSubmit = async (data) => {
  setIsSubmitting(true);
  try {
    const backend = new DAOPadBackendService(identity);

    // Check voting power requirement
    if (votingPower < 10000) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Voting Power',
        description: `You need at least 10,000 VP to create transfer proposals. Current: ${votingPower.toLocaleString()} VP`
      });
      return;
    }

    // Create transfer details for treasury proposal
    const transferDetails = {
      from_account_id: account.id,     // UUID
      from_asset_id: asset.id,         // UUID
      to: data.to_address,
      amount: parseAmount(data.amount, asset.decimals),
      memo: data.memo || null,
      title: data.title || `Transfer ${data.amount} ${asset.symbol}`,
      description: data.description || `Transfer to ${data.to_address}`
    };

    // Call the treasury proposal endpoint
    const result = await backend.createTreasuryTransferProposal(
      Principal.fromText(tokenId),
      transferDetails
    );

    if (result.success) {
      toast({
        title: 'Transfer Proposal Created',
        description: 'Community can now vote on this transfer request'
      });
      onTransferComplete?.();
      onOpenChange(false);
    } else {
      throw new Error(result.error || 'Failed to create proposal');
    }
  } catch (error) {
    toast({
      variant: 'destructive',
      title: 'Failed to create transfer',
      description: error.message
    });
  } finally {
    setIsSubmitting(false);
  }
};

// Add VP check UI
{votingPower < 10000 && (
  <Alert variant="warning">
    <AlertDescription>
      You need at least 10,000 VP to create transfer proposals.
      Current: {votingPower.toLocaleString()} VP
    </AlertDescription>
  </Alert>
)}
```

### Frontend File 3: `daopad_frontend/src/services/daopadBackend.js` (MODIFY)

**Current State:** Has createTransferRequest for direct transfers

**After:** Add treasury proposal method

```javascript
// PSEUDOCODE - implementing agent will write real code

// Add new method for treasury proposals
async createTreasuryTransferProposal(tokenId, transferDetails) {
    try {
        const actor = await this.getActor();

        // Convert to candid format
        const details = {
            from_account_id: transferDetails.from_account_id,
            from_asset_id: transferDetails.from_asset_id,
            to: transferDetails.to,
            amount: transferDetails.amount,
            memo: transferDetails.memo ? [transferDetails.memo] : [],
            title: transferDetails.title,
            description: transferDetails.description
        };

        const result = await actor.create_treasury_transfer_proposal(
            tokenId,
            details
        );

        if ('Ok' in result) {
            return { success: true, data: result.Ok };
        } else {
            return { success: false, error: result.Err };
        }
    } catch (error) {
        console.error('Error creating treasury transfer proposal:', error);
        return {
            success: false,
            error: error.message || 'Failed to create transfer proposal'
        };
    }
}

// Add method to get treasury proposal
async getTreasuryProposal(tokenId) {
    try {
        const actor = await this.getActor();
        const result = await actor.get_treasury_proposal(tokenId);

        if (result && result.length > 0) {
            return { success: true, data: result[0] };
        } else {
            return { success: true, data: null };
        }
    } catch (error) {
        console.error('Error getting treasury proposal:', error);
        return { success: false, error: error.message };
    }
}

// Add vote on treasury proposal
async voteOnTreasuryProposal(proposalId, vote) {
    try {
        const actor = await this.getActor();
        const result = await actor.vote_on_treasury_proposal(proposalId, vote);

        if ('Ok' in result) {
            return { success: true };
        } else {
            return { success: false, error: result.Err };
        }
    } catch (error) {
        console.error('Error voting on treasury proposal:', error);
        return { success: false, error: error.message };
    }
}
```

### Frontend File 4: `daopad_frontend/src/components/orbit/UnifiedRequests.jsx` (MODIFY)

**Current State:** Shows Orbit requests only

**After:** Also show treasury proposals

```javascript
// PSEUDOCODE - implementing agent will write real code

// Add state for treasury proposal
const [treasuryProposal, setTreasuryProposal] = useState(null);

// Fetch both Orbit requests and treasury proposals
const fetchRequests = useCallback(async () => {
  // ... existing Orbit request fetch ...

  // Also fetch treasury proposal
  const treasuryResult = await backend.getTreasuryProposal(Principal.fromText(tokenId));
  if (treasuryResult.success && treasuryResult.data) {
    // Convert proposal to request-like format for display
    const proposalAsRequest = {
      id: treasuryResult.data.id,
      title: `Treasury Transfer Proposal #${treasuryResult.data.id}`,
      status: treasuryResult.data.status === 'Active' ? 'Created' : treasuryResult.data.status,
      operation: 'Transfer',
      created_at: treasuryResult.data.created_at,
      expires_at: treasuryResult.data.expires_at,
      yes_votes: treasuryResult.data.yes_votes,
      no_votes: treasuryResult.data.no_votes,
      total_voting_power: treasuryResult.data.total_voting_power,
      is_treasury_proposal: true
    };

    // Prepend to requests list
    setRequests(prev => [proposalAsRequest, ...prev]);
    setTreasuryProposal(treasuryResult.data);
  }
}, [tokenId, identity, /* other deps */]);

// Handle voting on treasury proposals
const handleTreasuryVote = async (proposalId, vote) => {
  const result = await backend.voteOnTreasuryProposal(proposalId, vote);
  if (result.success) {
    toast.success(`Vote ${vote ? 'Yes' : 'No'} recorded`);
    await fetchRequests();
  } else {
    toast.error(result.error || 'Failed to vote');
  }
};

// In the request list rendering, handle treasury proposals specially
{request.is_treasury_proposal ? (
  <div className="flex gap-2">
    <Button
      onClick={() => handleTreasuryVote(request.id, true)}
      variant="default"
      size="sm"
    >
      Vote Yes ({request.yes_votes} / {request.total_voting_power})
    </Button>
    <Button
      onClick={() => handleTreasuryVote(request.id, false)}
      variant="outline"
      size="sm"
    >
      Vote No ({request.no_votes})
    </Button>
  </div>
) : (
  // Existing Orbit request approval UI
)}
```

### Backend File 5: `daopad_backend/src/lib.rs` (MODIFY)

**Current State:** Doesn't export treasury proposal functions

**After:** Export treasury functions

```rust
// PSEUDOCODE - implementing agent will write real code

// In candid_method section, add:
#[ic_cdk_macros::update]
#[candid_method(update)]
async fn create_treasury_transfer_proposal(
    token_canister_id: Principal,
    transfer_details: TransferDetails,
) -> Result<ProposalId, ProposalError> {
    proposals::treasury::create_treasury_transfer_proposal(token_canister_id, transfer_details).await
}

#[ic_cdk_macros::update]
#[candid_method(update)]
async fn vote_on_treasury_proposal(
    proposal_id: ProposalId,
    vote: bool,
) -> Result<(), ProposalError> {
    proposals::treasury::vote_on_treasury_proposal(proposal_id, vote).await
}

#[ic_cdk_macros::query]
#[candid_method(query)]
fn get_treasury_proposal(token_id: Principal) -> Option<TreasuryProposal> {
    proposals::treasury::get_treasury_proposal(token_id)
}
```

---

## Testing Strategy

### Type Discovery (Before Implementation)
```bash
# Test treasury proposal creation
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai create_treasury_transfer_proposal '(
  principal "ysy5f-2qaaa-aaaap-qkmmq-cai",
  record {
    from_account_id = "550e8400-e29b-41d4-a716-446655440000";
    from_asset_id = "650e8400-e29b-41d4-a716-446655440000";
    to = "recipient-address";
    amount = 1000:nat;
    memo = opt "test transfer";
    title = "Test Transfer";
    description = "Testing treasury transfer";
  }
)'
```

### Build and Deploy Process
```bash
# Backend changes require candid extraction
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did

# Deploy backend
./deploy.sh --network ic --backend-only

# CRITICAL: Sync declarations to frontend
cp -r src/declarations/daopad_backend/* src/daopad/daopad_frontend/src/declarations/daopad_backend/

# Deploy frontend
./deploy.sh --network ic --frontend-only
```

### Manual Testing Required
1. Navigate to token dashboard with sufficient VP (>10,000)
2. Go to Treasury tab
3. Click Transfer button on an account
4. Fill transfer form
5. Submit and verify proposal created
6. Check Activity tab for new proposal
7. Vote on proposal
8. Verify execution when threshold reached

### Integration Tests Required
- Test with <10,000 VP (should show warning)
- Test with >10,000 VP (should allow creation)
- Test proposal voting
- Test automatic Orbit approval at threshold
- Test automatic Orbit rejection when rejected
- Verify proposal appears in UnifiedRequests

---

## Scope Estimate

### Files Modified
- **Modified files**: 6
  - AccountsTable.jsx
  - TransferRequestDialog.jsx
  - daopadBackend.js
  - UnifiedRequests.jsx
  - lib.rs
  - (treasury.rs already modified)
- **Created files**: 0 (all components exist)
- **Deleted files**: 0

### Lines of Code
- **Lines ADDED**: ~400
  - AccountsTable: +50 lines
  - TransferRequestDialog: +80 lines
  - daopadBackend.js: +60 lines
  - UnifiedRequests: +100 lines
  - lib.rs: +30 lines
  - Testing/debugging: +80 lines
- **Net LOC**: +400

### Complexity Change
- **Before**: Disconnected components, no clear flow
- **After**: Complete transfer request flow through treasury proposals
- **Patterns added**: Treasury proposal pattern for community governance

### Time Estimate
- Implementation: 3 hours
- Testing: 2 hours
- Debugging/iteration: 2 hours
- **Total**: 7 hours (one PR)

---

## Critical Implementation Notes

### 🚨 ISOLATION IS MANDATORY
**The implementing agent MUST work in an isolated worktree because:**
- Other agents are working in parallel in the main repo
- File changes from other agents will corrupt your work
- The orchestrator prompt above ENFORCES this with exit checks

### 🎯 KEY DIFFERENCE: Treasury Proposals vs Direct Transfers
The backend now has TWO paths:
1. **Direct Transfer** (old): `create_transfer_request()` - bypasses voting
2. **Treasury Proposal** (NEW): `create_treasury_transfer_proposal()` - requires voting

**We MUST use the treasury proposal system** because:
- Enforces community governance (50% threshold)
- Requires minimum 10,000 VP to propose
- Auto-approves Orbit request when passed
- Maintains decentralization

### DAOPad-Specific Requirements

#### Candid Extraction (Backend Changes)
**ALWAYS run after Rust changes:**
```bash
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did
```

#### Declaration Sync (CRITICAL BUG FIX)
**Frontend uses different declarations path:**
```bash
# After backend deploy, MUST sync:
cp -r src/declarations/daopad_backend/* src/daopad/daopad_frontend/src/declarations/daopad_backend/
# Without this, frontend gets "is not a function" errors!
```

### Don't Guess Types
**Test with actual canisters:**
```bash
# Use ALEX token for testing (has station linked)
export TOKEN_ID="ysy5f-2qaaa-aaaap-qkmmq-cai"
export BACKEND_ID="lwsav-iiaaa-aaaap-qp2qq-cai"

# Test treasury proposal creation
dfx canister --network ic call $BACKEND_ID get_treasury_proposal "(principal \"$TOKEN_ID\")"
```

### Don't Skip Testing
Every change MUST be:
1. Built: `cargo build --target wasm32-unknown-unknown --release -p daopad_backend`
2. Extracted: `candid-extractor` (for backend changes)
3. Deployed: `./deploy.sh --network ic`
4. Synced: Copy declarations to frontend
5. Tested: On mainnet at https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io

### Success Criteria
✅ Transfer button appears in AccountsTable
✅ TransferRequestDialog opens and shows form
✅ Form submission creates treasury proposal (not direct request)
✅ Proposal appears in Activity tab
✅ Users can vote on proposal
✅ Proposal auto-executes at 50% threshold
✅ Orbit request is created and approved automatically
✅ Transfer executes in Orbit Station

---

## Checkpoint Strategy

This feature can be implemented in **1 PR**:
- Wire up existing components
- Add treasury proposal integration
- Test comprehensively on mainnet
- Create one PR with complete feature

The feature is cohesive and all parts depend on each other, so a single PR makes sense.

---

## 🚀 Handoff to Implementing Agent

**Plan Complete:** Transfer Requests UI Implementation

**Location:** `/home/theseus/alexandria/daopad-transfer-requests/src/daopad`
**Branch:** `feature/transfer-requests`
**Document:** `TRANSFER_REQUESTS_PLAN.md` (committed to feature branch)

**Estimated:** 7 hours, 1 PR

**Handoff instructions for implementing agent:**

```bash
# Navigate to the worktree where the plan lives
cd /home/theseus/alexandria/daopad-transfer-requests/src/daopad

# Read the plan
cat TRANSFER_REQUESTS_PLAN.md

# Then pursue it
# (The plan contains the full orchestrator prompt)
```

**Or use this prompt:**

```
cd /home/theseus/alexandria/daopad-transfer-requests/src/daopad && pursue TRANSFER_REQUESTS_PLAN.md
```

**CRITICAL**:
- Plan is IN the worktree (not main repo)
- Plan is already committed to feature branch
- Implementing agent works in SAME worktree
- Plan and implementation stay together on feature branch