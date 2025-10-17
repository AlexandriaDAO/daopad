# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-proposal-voting-ui/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-proposal-voting-ui/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes only:
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "Feature: Complete Proposal Voting UI for All 33 Orbit Operations"
   git push -u origin feature/proposal-voting-ui
   gh pr create --title "[Feature]: Complete Proposal Voting UI" --body "Implements PROPOSAL_VOTING_UI_IMPLEMENTATION.md"
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

**Branch:** `feature/proposal-voting-ui`
**Worktree:** `/home/theseus/alexandria/daopad-proposal-voting-ui/src/daopad`

---

# Implementation Plan: Complete Proposal Voting UI

## Executive Summary

**Problem:** The user sees "Voting UI for non-treasury proposals coming soon" when clicking on Orbit requests. The backend has COMPLETE voting infrastructure for all 33 Orbit operation types with risk-based thresholds (30%-90%), but the frontend is not connected.

**Solution:** Connect the existing backend voting system to the frontend by:
1. Adding backend service methods to DAOPadBackendService.js
2. Implementing voting UI in RequestDialog.jsx
3. Displaying proposal metadata (thresholds, vote counts, risk levels)
4. Removing the "coming soon" placeholder

**Scope:** Frontend-only changes. No backend modifications needed.

---

## Current State Analysis

### Backend Status: ✅ COMPLETE

All voting infrastructure exists and works:

**Files:**
- `daopad_backend/src/proposals/types.rs` - All 33 operation types defined
- `daopad_backend/src/proposals/orbit_requests.rs` - Voting logic implemented
- `daopad_backend/src/proposals/mod.rs` - Public exports configured

**Available Backend Methods:**
```rust
// Already exported and working
pub async fn vote_on_orbit_request(
    token_id: Principal,
    orbit_request_id: String,
    vote: bool
) -> Result<(), ProposalError>

pub fn get_orbit_request_proposal(
    token_id: Principal,
    orbit_request_id: String
) -> Option<OrbitRequestProposal>

pub fn list_orbit_request_proposals(token_id: Principal) -> Vec<OrbitRequestProposal>

pub async fn ensure_proposal_for_request(
    token_id: Principal,
    orbit_request_id: String,
    request_type: OrbitRequestType
) -> Result<ProposalId, ProposalError>
```

**Voting Thresholds (Risk-Based):**
| Operation Type | Threshold | Risk Level | Duration |
|---------------|-----------|------------|----------|
| System Operations | 90% | CRITICAL | 72h |
| Treasury Operations | 75% | HIGH | 48h |
| Governance Changes | 70% | HIGH | 24h |
| Canister Management | 60% | MEDIUM-HIGH | 24h |
| User/Group Management | 50% | MEDIUM | 24h |
| Asset Management | 40% | LOW | 24h |
| Address Book | 30% | LOW | 24h |

**Operation Type Mapping:** All 33 operations properly mapped in `infer_request_type()`:
- Transfer, AddAccount, EditAccount
- AddUser, EditUser, RemoveUser
- CreateExternalCanister, ConfigureExternalCanister, etc.
- SystemUpgrade, SystemRestore, SetDisasterRecovery, ManageSystemInfo
- EditPermission, AddRequestPolicy, etc.
- And 21 more...

### Frontend Status: ❌ INCOMPLETE

**Missing Pieces:**

1. **RequestDialog.jsx (Line 95-112):**
   ```javascript
   const handleVote = async (vote) => {
     // TODO: Implement voting via DAOPad backend
     // await daopadBackend.voteOnOrbitRequest(tokenId, requestId, vote);

     toast.error('Voting UI coming soon', {
       description: 'Liquid democracy voting will be implemented in the next update'
     });
   };
   ```
   **Problem:** Hardcoded "coming soon" message instead of real voting

2. **DAOPadBackendService.js:**
   **Problem:** Missing methods to call backend voting functions:
   - No `voteOnOrbitRequest()` method
   - No `getOrbitRequestProposal()` method
   - No `listOrbitRequestProposals()` method

3. **Proposal Data Display:**
   **Problem:** RequestDialog doesn't show:
   - Proposal vote counts (yes votes, no votes)
   - Voting threshold required
   - Time remaining
   - Operation risk level
   - Current voting progress

4. **Integration Missing:**
   **Problem:** No connection between UnifiedRequests and proposal data
   - Requests are fetched from Orbit
   - But proposal metadata is not fetched or displayed

---

## Implementation Plan

### Phase 1: Add Backend Service Methods

**File:** `daopad_frontend/src/services/daopadBackend.js`

**Location:** After line 100 (after getActor method)

```javascript
// PSEUDOCODE

// METHOD 1: Vote on any Orbit request
async voteOnOrbitRequest(tokenId, orbitRequestId, vote) {
  try {
    const actor = await this.getActor();

    // Convert tokenId string to Principal if needed
    const tokenPrincipal = typeof tokenId === 'string'
      ? Principal.fromText(tokenId)
      : tokenId;

    // Call backend method (it returns Result<(), ProposalError>)
    const result = await actor.vote_on_orbit_request(
      tokenPrincipal,
      orbitRequestId,  // String
      vote             // boolean
    );

    // Handle Result enum
    if ('Ok' in result) {
      return { success: true };
    } else if ('Err' in result) {
      // Extract error from ProposalError variant
      const error = formatProposalError(result.Err);
      return { success: false, error };
    }
  } catch (err) {
    console.error('Vote error:', err);
    return { success: false, error: err.message };
  }
}

// METHOD 2: Get proposal for a specific request
async getOrbitRequestProposal(tokenId, orbitRequestId) {
  try {
    const actor = await this.getActor();

    const tokenPrincipal = typeof tokenId === 'string'
      ? Principal.fromText(tokenId)
      : tokenId;

    // Returns Option<OrbitRequestProposal>
    const result = await actor.get_orbit_request_proposal(
      tokenPrincipal,
      orbitRequestId
    );

    // Candid Option is represented as array: [] = None, [value] = Some
    if (Array.isArray(result) && result.length > 0) {
      const proposal = result[0];
      return { success: true, data: proposal };
    } else {
      return { success: true, data: null };
    }
  } catch (err) {
    console.error('Get proposal error:', err);
    return { success: false, error: err.message };
  }
}

// METHOD 3: List all proposals for a token
async listOrbitRequestProposals(tokenId) {
  try {
    const actor = await this.getActor();

    const tokenPrincipal = typeof tokenId === 'string'
      ? Principal.fromText(tokenId)
      : tokenId;

    // Returns Vec<OrbitRequestProposal>
    const proposals = await actor.list_orbit_request_proposals(tokenPrincipal);

    return { success: true, data: proposals || [] };
  } catch (err) {
    console.error('List proposals error:', err);
    return { success: false, error: err.message, data: [] };
  }
}

// HELPER: Format ProposalError enum to user-friendly message
function formatProposalError(error) {
  // Backend ProposalError is a variant enum
  if ('NotFound' in error) {
    return `Proposal not found`;
  } else if ('Expired' in error) {
    return 'This proposal has expired';
  } else if ('NotActive' in error) {
    return 'This proposal is no longer active';
  } else if ('AlreadyVoted' in error) {
    return 'You have already voted on this proposal';
  } else if ('NoVotingPower' in error) {
    return 'You do not have voting power for this token';
  } else if ('InsufficientVotingPowerToPropose' in error) {
    return `Insufficient voting power to propose: need ${error.InsufficientVotingPowerToPropose.required}`;
  } else if ('AuthRequired' in error) {
    return 'Authentication required';
  } else if ('ActiveProposalExists' in error) {
    return 'An active proposal already exists for this token';
  } else if ('NoStationLinked' in error) {
    return 'No Orbit Station linked to this token';
  } else if ('OrbitError' in error) {
    const { code, message, details } = error.OrbitError;
    return `Orbit error: ${message}${details ? ' - ' + details : ''}`;
  } else if ('IcCallFailed' in error) {
    return `IC call failed: ${error.IcCallFailed.message}`;
  } else if ('ZeroVotingPower' in error) {
    return 'No voting power available - no votes possible';
  }
  return 'Unknown error occurred';
}
```

### Phase 2: Update RequestDialog Component

**File:** `daopad_frontend/src/components/orbit/requests/RequestDialog.jsx`

**Changes:**

#### 2.1: Add State for Proposal Data

**Location:** After line 46 (after existing state declarations)

```javascript
// PSEUDOCODE

// Add new state for proposal data
const [proposal, setProposal] = useState(null);
const [loadingProposal, setLoadingProposal] = useState(false);
const [proposalError, setProposalError] = useState(null);

// State for user's voting status
const [hasVoted, setHasVoted] = useState(false);
const [userVotingPower, setUserVotingPower] = useState(null);
```

#### 2.2: Add Props

**Location:** Line 36 - update function signature

```javascript
// PSEUDOCODE

export function RequestDialog({
  open,
  requestId,
  tokenId,        // ADD THIS - needed for voting
  onClose,
  onApproved
}) {
```

#### 2.3: Fetch Proposal Data

**Location:** After line 76 (after fetchRequest function)

```javascript
// PSEUDOCODE

// Fetch proposal data for this request
const fetchProposal = useCallback(async () => {
  if (!requestId || !tokenId || !open) {
    setProposal(null);
    return;
  }

  setLoadingProposal(true);
  setProposalError(null);

  try {
    // Import DAOPadBackendService at top of file
    const daopadBackend = new DAOPadBackendService(identity);

    // Check if proposal exists for this request
    const result = await daopadBackend.getOrbitRequestProposal(tokenId, requestId);

    if (result.success && result.data) {
      setProposal(result.data);

      // Check if current user has voted
      // Backend tracks votes internally, can add query method if needed
      // For now, we'll let them try to vote and handle AlreadyVoted error
    } else if (result.success && !result.data) {
      // No proposal exists yet - create one
      await ensureProposalExists();
    } else {
      setProposalError(result.error || 'Failed to fetch proposal');
    }
  } catch (err) {
    console.error('Failed to fetch proposal:', err);
    setProposalError(err.message);
  } finally {
    setLoadingProposal(false);
  }
}, [requestId, tokenId, open]);

// Ensure proposal exists for this request (auto-create if needed)
const ensureProposalExists = async () => {
  // The backend auto-creates proposals when requests are detected
  // We can manually trigger it here if needed
  // For now, just log that no proposal exists yet
  console.log('No proposal found for request:', requestId);
};

// Fetch proposal when dialog opens
useEffect(() => {
  fetchProposal();
}, [fetchProposal]);

// Fetch user's voting power
const fetchUserVotingPower = async () => {
  try {
    const daopadBackend = new DAOPadBackendService(identity);
    const result = await daopadBackend.getMyVotingPowerForToken(
      Principal.fromText(tokenId)
    );
    if (result.success) {
      setUserVotingPower(result.data);
    }
  } catch (err) {
    console.error('Failed to fetch voting power:', err);
  }
};

useEffect(() => {
  if (open && tokenId) {
    fetchUserVotingPower();
  }
}, [open, tokenId]);
```

#### 2.4: Implement Real Voting

**Location:** Replace lines 90-113 (handleVote function)

```javascript
// PSEUDOCODE

const handleVote = async (vote) => {
  const setLoading = vote ? setIsApproving : setIsRejecting;
  setLoading(true);

  try {
    const daopadBackend = new DAOPadBackendService(identity);

    // Call backend voting method
    const result = await daopadBackend.voteOnOrbitRequest(
      tokenId,
      requestId,
      vote
    );

    if (result.success) {
      toast.success(`Vote ${vote ? 'Yes' : 'No'} recorded`, {
        description: 'Your vote has been counted. Refreshing proposal data...'
      });

      // Refresh both request and proposal data
      await Promise.all([
        fetchRequest(),
        fetchProposal()
      ]);

      // Notify parent component
      if (onApproved) onApproved();
    } else {
      throw new Error(result.error || 'Failed to vote');
    }
  } catch (error) {
    console.error('Vote error:', error);

    // Show specific error message
    toast.error('Vote failed', {
      description: error.message || 'Failed to submit vote'
    });
  } finally {
    setLoading(false);
  }
};
```

#### 2.5: Add Proposal Voting UI

**Location:** After line 222 (inside the "Approval Progress" section)

```javascript
// PSEUDOCODE

// Add this section AFTER the approval progress display
// This shows the DAOPad community voting information

{proposal && (
  <>
    <Separator />

    <div>
      <Label className="text-xs text-muted-foreground mb-2 block">
        Community Voting (DAOPad Governance)
      </Label>

      {/* Voting Threshold Info */}
      <div className="space-y-2 p-3 bg-muted/50 rounded-md">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Operation Type:</span>
          <Badge variant="outline">
            {getOperationTypeName(proposal.request_type)}
          </Badge>
        </div>

        <div className="flex justify-between text-sm">
          <span className="font-medium">Required Threshold:</span>
          <span className="font-mono">
            {getThresholdPercentage(proposal.request_type)}%
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="font-medium">Risk Level:</span>
          <Badge className={getRiskLevelColor(proposal.request_type)}>
            {getRiskLevel(proposal.request_type)}
          </Badge>
        </div>

        {/* Vote Counts */}
        <Separator className="my-2" />

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="font-bold text-green-700">
              {Number(proposal.yes_votes).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Yes Votes</div>
          </div>

          <div className="text-center p-2 bg-red-50 rounded">
            <div className="font-bold text-red-700">
              {Number(proposal.no_votes).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">No Votes</div>
          </div>
        </div>

        {/* Voting Progress Bar */}
        <div className="space-y-1">
          <Progress
            value={getVotingProgress(proposal)}
            className="h-2"
          />
          <p className="text-xs text-muted-foreground text-center">
            {getVotingProgressText(proposal)}
          </p>
        </div>

        {/* Time Remaining */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Expires:</span>
          <span>{formatDateTime(proposal.expires_at)}</span>
        </div>
      </div>

      {/* Show voting buttons if proposal is active */}
      {proposal.status === 'Active' && userVotingPower && userVotingPower > 0 && (
        <div className="mt-3 space-y-2">
          <div className="text-xs text-center text-muted-foreground">
            Your voting power: <strong>{Number(userVotingPower).toLocaleString()} VP</strong>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleVote(true)}
              disabled={isApproving || isRejecting}
              variant="default"
              size="sm"
            >
              {isApproving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              <ThumbsUp className="mr-2 h-3 w-3" />
              Vote Yes
            </Button>

            <Button
              onClick={() => handleVote(false)}
              disabled={isApproving || isRejecting}
              variant="destructive"
              size="sm"
            >
              {isRejecting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              <ThumbsDown className="mr-2 h-3 w-3" />
              Vote No
            </Button>
          </div>
        </div>
      )}

      {/* Show if user has no voting power */}
      {proposal.status === 'Active' && (!userVotingPower || userVotingPower === 0) && (
        <Alert variant="default" className="mt-3">
          <AlertDescription className="text-xs">
            You need voting power to vote. Lock LP tokens in Kong Locker to participate.
          </AlertDescription>
        </Alert>
      )}
    </div>
  </>
)}
```

#### 2.6: Add Helper Functions

**Location:** After the component definition (before export)

```javascript
// PSEUDOCODE

// Helper functions for proposal display

function getOperationTypeName(requestType) {
  // Convert enum variant to display name
  if (typeof requestType === 'string') return requestType;
  if (typeof requestType === 'object') {
    const key = Object.keys(requestType)[0];
    return key;
  }
  return 'Unknown';
}

function getThresholdPercentage(requestType) {
  // Map request types to thresholds (from backend logic)
  const typeName = getOperationTypeName(requestType);

  const thresholds = {
    // Critical - 90%
    'SystemUpgrade': 90,
    'SystemRestore': 90,
    'SetDisasterRecovery': 90,
    'ManageSystemInfo': 90,

    // Treasury - 75%
    'Transfer': 75,
    'AddAccount': 75,
    'EditAccount': 75,

    // Governance - 70%
    'EditPermission': 70,
    'AddRequestPolicy': 70,
    'EditRequestPolicy': 70,
    'RemoveRequestPolicy': 70,

    // Canister & Rules - 60%
    'CreateExternalCanister': 60,
    'ConfigureExternalCanister': 60,
    'ChangeExternalCanister': 60,
    'CallExternalCanister': 60,
    'FundExternalCanister': 60,
    'MonitorExternalCanister': 60,
    'SnapshotExternalCanister': 60,
    'RestoreExternalCanister': 60,
    'PruneExternalCanister': 60,
    'AddNamedRule': 60,
    'EditNamedRule': 60,
    'RemoveNamedRule': 60,

    // User/Group - 50%
    'AddUser': 50,
    'EditUser': 50,
    'RemoveUser': 50,
    'AddUserGroup': 50,
    'EditUserGroup': 50,
    'RemoveUserGroup': 50,

    // Assets - 40%
    'AddAsset': 40,
    'EditAsset': 40,
    'RemoveAsset': 40,

    // Address Book - 30%
    'AddAddressBookEntry': 30,
    'EditAddressBookEntry': 30,
    'RemoveAddressBookEntry': 30,
  };

  return thresholds[typeName] || 75; // Default to 75% for unknown
}

function getRiskLevel(requestType) {
  const threshold = getThresholdPercentage(requestType);
  if (threshold >= 90) return 'CRITICAL';
  if (threshold >= 70) return 'HIGH';
  if (threshold >= 60) return 'MEDIUM-HIGH';
  if (threshold >= 50) return 'MEDIUM';
  if (threshold >= 40) return 'LOW';
  return 'VERY LOW';
}

function getRiskLevelColor(requestType) {
  const level = getRiskLevel(requestType);
  const colors = {
    'CRITICAL': 'bg-red-100 text-red-800',
    'HIGH': 'bg-orange-100 text-orange-800',
    'MEDIUM-HIGH': 'bg-yellow-100 text-yellow-800',
    'MEDIUM': 'bg-blue-100 text-blue-800',
    'LOW': 'bg-green-100 text-green-800',
    'VERY LOW': 'bg-gray-100 text-gray-800',
  };
  return colors[level] || colors['MEDIUM'];
}

function getVotingProgress(proposal) {
  // Calculate what percentage of the threshold has been reached
  const totalVP = Number(proposal.total_voting_power);
  const yesVotes = Number(proposal.yes_votes);
  const threshold = getThresholdPercentage(proposal.request_type);

  if (totalVP === 0) return 0;

  const requiredVotes = (totalVP * threshold) / 100;
  const progress = (yesVotes / requiredVotes) * 100;

  return Math.min(100, progress);
}

function getVotingProgressText(proposal) {
  const totalVP = Number(proposal.total_voting_power);
  const yesVotes = Number(proposal.yes_votes);
  const threshold = getThresholdPercentage(proposal.request_type);
  const requiredVotes = Math.ceil((totalVP * threshold) / 100);

  const remaining = Math.max(0, requiredVotes - yesVotes);

  if (remaining === 0) {
    return '✓ Threshold reached! Awaiting execution.';
  }

  return `${remaining.toLocaleString()} more votes needed to reach ${threshold}% threshold`;
}
```

### Phase 3: Update UnifiedRequests to Pass tokenId

**File:** `daopad_frontend/src/components/orbit/UnifiedRequests.jsx`

**Location:** Find where RequestDialog is used (search for `<RequestDialog`)

```javascript
// PSEUDOCODE

// Update RequestDialog usage to pass tokenId prop

<RequestDialog
  open={dialogOpen}
  requestId={selectedRequestId}
  tokenId={tokenId}  // ADD THIS LINE
  onClose={() => setDialogOpen(false)}
  onApproved={fetchRequests}
/>
```

### Phase 4: Update RequestList Component

**File:** `daopad_frontend/src/components/orbit/requests/RequestList.jsx`

**Changes needed:** Pass tokenId through to RequestDialog when it's used

```javascript
// PSEUDOCODE

// If RequestList opens RequestDialog, ensure it passes tokenId
// Check the component and update accordingly

// Example pattern:
<RequestDialog
  open={isOpen}
  requestId={request.id}
  tokenId={tokenId}  // Ensure this is passed down
  onClose={handleClose}
/>
```

---

## Testing Strategy

### Manual Testing Checklist

1. **Verify Backend Connection:**
   ```bash
   # Test vote method exists in candid
   cd /home/theseus/alexandria/daopad-proposal-voting-ui/src/daopad
   grep "vote_on_orbit_request" daopad_backend/daopad_backend.did
   ```

2. **Frontend Build:**
   ```bash
   cd daopad_frontend
   npm run build
   # Should compile without errors
   ```

3. **Test in Browser:**
   - Navigate to token dashboard
   - Click Activity tab
   - Click on any pending request
   - Verify:
     - ✓ Proposal voting section appears
     - ✓ Shows operation type, threshold, risk level
     - ✓ Shows yes/no vote counts
     - ✓ Shows progress bar
     - ✓ Vote buttons appear (if user has VP)
     - ✓ Clicking vote submits successfully
     - ✓ Vote counts update after voting
     - ✓ "Coming soon" message is gone

4. **Test Edge Cases:**
   - User with no voting power: Should show message
   - Already voted: Should show error when trying to vote again
   - Expired proposal: Should show as expired
   - Different operation types: Verify correct thresholds display

5. **Deploy to IC:**
   ```bash
   ./deploy.sh --network ic --frontend-only
   # Verify deployment success
   ```

6. **Production Verification:**
   - Visit https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
   - Test all voting scenarios
   - Verify no console errors

---

## File Structure Summary

### Files to Modify:

1. **`daopad_frontend/src/services/daopadBackend.js`**
   - Add 3 new methods
   - Add 1 helper function
   - ~80 lines added

2. **`daopad_frontend/src/components/orbit/requests/RequestDialog.jsx`**
   - Add proposal state (4 lines)
   - Add tokenId prop (1 line)
   - Add fetchProposal function (~40 lines)
   - Replace handleVote (~30 lines)
   - Add proposal UI section (~100 lines)
   - Add 6 helper functions (~80 lines)
   - Total: ~255 lines modified/added

3. **`daopad_frontend/src/components/orbit/UnifiedRequests.jsx`**
   - Update RequestDialog usage (1 line)

4. **`daopad_frontend/src/components/orbit/requests/RequestList.jsx`** (if needed)
   - Ensure tokenId is passed through (check and update)

### Files NOT Modified:

- No backend changes (everything exists)
- No type definitions needed (already in backend)
- No new components needed (use existing UI)

---

## Success Criteria

### Must Have:
- ✅ "Voting UI coming soon" message removed
- ✅ Real voting works for all 33 operation types
- ✅ Proposal data displays correctly
- ✅ Vote counts update in real-time
- ✅ Correct thresholds shown for each operation type
- ✅ Risk levels displayed with proper colors

### Nice to Have:
- Auto-refresh proposal data every 5 seconds
- Confetti animation when threshold reached
- Vote history display

### Success Metrics:
- Users can vote on any pending Orbit request
- Vote submission succeeds without errors
- UI updates immediately after voting
- All 33 operation types show correct thresholds

---

## Rollback Plan

If issues occur:
1. Revert frontend deploy:
   ```bash
   git revert HEAD
   ./deploy.sh --network ic --frontend-only
   ```

2. The backend is unchanged, so no backend rollback needed

3. Users will see old "coming soon" message but no data loss

---

## Post-Implementation

### Documentation Updates:
- Update CLAUDE.md to remove "coming soon" notes
- Add voting UI to feature list
- Document new backend service methods

### Future Enhancements:
1. Add vote history page
2. Add email notifications when threshold reached
3. Add proposal creation UI (currently auto-created)
4. Add delegation/proxy voting
5. Add vote changing (within time window)

---

## Notes

- This is a **frontend-only** change
- Backend voting infrastructure is **100% complete**
- No database migrations needed
- No canister upgrades needed (backend unchanged)
- Low risk: Voting logic already tested in backend
- High impact: Enables governance for all 33 operation types

---

## References

**Backend Files (READ-ONLY - for reference):**
- `/home/theseus/alexandria/daopad/src/daopad/daopad_backend/src/proposals/types.rs`
- `/home/theseus/alexandria/daopad/src/daopad/daopad_backend/src/proposals/orbit_requests.rs`
- `/home/theseus/alexandria/daopad/src/daopad/daopad_backend/src/proposals/mod.rs`

**Frontend Files (TO MODIFY):**
- `/home/theseus/alexandria/daopad-proposal-voting-ui/src/daopad/daopad_frontend/src/services/daopadBackend.js`
- `/home/theseus/alexandria/daopad-proposal-voting-ui/src/daopad/daopad_frontend/src/components/orbit/requests/RequestDialog.jsx`
- `/home/theseus/alexandria/daopad-proposal-voting-ui/src/daopad/daopad_frontend/src/components/orbit/UnifiedRequests.jsx`

**Operating Agreement (for reference):**
- Shows all 33 operation types with thresholds
- Generated dynamically from on-chain data
- Source of truth for threshold percentages

---

**END OF PLAN**
