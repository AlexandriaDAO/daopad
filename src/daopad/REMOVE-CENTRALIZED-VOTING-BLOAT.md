# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-remove-centralized-voting/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-remove-centralized-voting/src/daopad`
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
   git commit -m "refactor: Remove all centralized voting bloat - enforce liquid democracy only"
   git push -u origin feature/remove-centralized-voting
   gh pr create --title "Refactor: Remove Centralized Voting Bloat" --body "Implements REMOVE-CENTRALIZED-VOTING-BLOAT.md"
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

**Branch:** `feature/remove-centralized-voting`
**Worktree:** `/home/theseus/alexandria/daopad-remove-centralized-voting/src/daopad`

---

# Implementation Plan: Remove All Centralized Voting Bloat

## 🎯 Objective

**Remove ALL traces of centralized "vote as a user" logic** from the entire codebase. The system must ONLY support liquid democracy voting based on Kong Locker voting power. Any code that allows single-user approval/rejection without voting power calculation is bloat that confuses the architecture and must be eliminated.

## 📊 Current State Analysis

### ✅ Already Correct (Keep These)

These components properly implement liquid democracy voting:

1. **Backend Liquid Democracy Core** - `/daopad_backend/src/proposals/`
   - `orbit_requests.rs`: Vote on ANY Orbit request with voting power (lines 1-442)
   - `treasury.rs`: Treasury-specific voting implementation
   - `types.rs`: Proposal types, voting thresholds, OrbitRequestType enum
   - Internal functions `approve_orbit_request_internal()` and `reject_orbit_request_internal()` - these execute AFTER voting succeeds

2. **Kong Locker Integration** - `/daopad_backend/src/kong_locker/`
   - `voting.rs`: Calculate voting power from locked LP tokens
   - Proper voting power queries

3. **Backend Storage** - `/daopad_backend/src/storage/state.rs`
   - `ORBIT_REQUEST_PROPOSALS`: Tracks active proposals
   - `ORBIT_REQUEST_VOTES`: Tracks who voted
   - `KONG_LOCKER_PRINCIPALS`: Maps users to their Kong Locker canisters

### ❌ BLOAT TO REMOVE (Delete/Disable These)

#### Category 1: Direct Approval Services (Frontend)

**File: `/daopad_frontend/src/services/orbitStationService.js`**
- Lines 93-100: `submitRequestApproval()` method
- **Problem**: Allows direct Orbit Station approval bypassing voting
- **Action**: DELETE method entirely

**File: `/daopad_frontend/src/services/orbit/stationService.js`** (if exists)
- `approveRequest()` and `rejectRequest()` methods
- **Problem**: Direct approval interface
- **Action**: DELETE methods

**File: `/daopad_frontend/src/services/daopadBackend.js`**
- Search for: `approveRequest()`, `rejectRequest()`, `submitRequestApproval()`
- **Action**: DELETE any methods that submit approvals without voting

#### Category 2: Direct Approval UI Components (Frontend)

**File: `/daopad_frontend/src/components/orbit/UnifiedRequests.jsx`**
- Lines 165-168: `handleApprovalDecision()` - Currently disabled with toast
- Lines 171-174: `handleBatchApprove()` - Currently disabled with toast
- Lines 298-337: Batch approval UI controls
- **Action**: DELETE disabled handlers and batch UI entirely (not just disable)

**File: `/daopad_frontend/src/components/orbit/requests/RequestDialog.jsx`**
- Approval/rejection handlers calling `stationService.approveRequest()`
- **Action**: REPLACE with vote UI or DELETE component if only used for approval

**File: `/daopad_frontend/src/components/DaoProposals.jsx`**
- Lines calling `daopadService.approveRequest()` and `daopadService.rejectRequest()`
- **Action**: REPLACE with voting UI

#### Category 3: Orbit Direct API References (Frontend)

**File: `/daopad_frontend/src/services/backend/orbit/OrbitRequestsService.js`**
- Any methods wrapping `submit_request_approval`
- **Action**: DELETE if not used for internal voting execution

**File: `/daopad_frontend/src/features/orbit/orbitSlice.js`**
- Redux actions for approval/rejection
- **Action**: DELETE centralized approval actions, keep voting actions

#### Category 4: Backend API Exports (Backend)

**File: `/daopad_backend/src/api/mod.rs`**
- Lines 24-36: Exports `SubmitRequestApprovalInput`, `SubmitRequestApprovalResult`
- **Problem**: These types enable centralized approval
- **Action**: Keep types (needed internally) but ensure NO public endpoints expose them

**File: `/daopad_backend/src/api/orbit_requests.rs`**
- Line 700: Comment marking removed `submit_request_approval`
- **Action**: Keep comment as documentation of intentional removal

#### Category 5: Generated/Legacy Files (Reference Only)

**Files:**
- `/daopad_frontend/src/generated/station/station.did.js`
- `/daopad_frontend/src/services/orbitStation.did.js`
- `/daopad_frontend/src/services/orbitStation.js`

**Action**: DO NOT MODIFY - These are Orbit Station interfaces, not our code

## 🗂️ File Tree (Before/After)

### BEFORE (Current)
```
daopad_backend/src/
  api/
    mod.rs                        # Exports approval types ⚠️
    orbit_requests.rs             # Has removal comment ✅
  proposals/
    orbit_requests.rs             # ✅ Liquid democracy voting
    treasury.rs                   # ✅ Liquid democracy voting
    types.rs                      # ✅ Proposal types
  kong_locker/
    voting.rs                     # ✅ Voting power calculation

daopad_frontend/src/
  components/
    DaoProposals.jsx              # ❌ Direct approve/reject calls
    orbit/
      UnifiedRequests.jsx         # ❌ Disabled approval handlers (delete)
      requests/
        RequestDialog.jsx         # ❌ Direct approval UI
  services/
    orbitStationService.js        # ❌ submitRequestApproval() method
    orbit/
      stationService.js           # ❌ approve/reject methods
    backend/
      orbit/
        OrbitRequestsService.js   # ⚠️ Check for approval wrappers
    daopadBackend.js              # ⚠️ Check for approval methods
  features/
    orbit/
      orbitSlice.js               # ⚠️ Check for approval actions
```

### AFTER (Target)
```
daopad_backend/src/
  api/
    mod.rs                        # ✅ Approval types internal only
    orbit_requests.rs             # ✅ Removal comment remains
  proposals/
    orbit_requests.rs             # ✅ ONLY liquid democracy voting
    treasury.rs                   # ✅ ONLY liquid democracy voting
    types.rs                      # ✅ Proposal types
  kong_locker/
    voting.rs                     # ✅ Voting power calculation

daopad_frontend/src/
  components/
    DaoProposals.jsx              # ✅ Vote UI only (no direct approval)
    orbit/
      UnifiedRequests.jsx         # ✅ Approval handlers DELETED
      requests/
        RequestDialog.jsx         # ✅ Vote UI only or deleted
  services/
    orbitStationService.js        # ✅ submitRequestApproval() DELETED
    orbit/
      stationService.js           # ✅ approve/reject DELETED
    backend/
      orbit/
        OrbitRequestsService.js   # ✅ Only voting methods
    daopadBackend.js              # ✅ Only voting methods
  features/
    orbit/
      orbitSlice.js               # ✅ Only voting actions
```

## 📝 Implementation Pseudocode

### Step 1: Backend Cleanup (Ensure No Public Endpoints)

**File: `daopad_backend/src/api/mod.rs`**
```rust
// PSEUDOCODE - Verify no public approval endpoints

// ✅ KEEP: Internal types needed by voting execution
pub use orbit_transfers::{
    CreateRequestResult,
    ErrorInfo,
    RequestApprovalDecision,        // Internal use only
    SubmitRequestApprovalInput,     // Internal use only
    SubmitRequestApprovalResult,    // Internal use only
    // Asset methods...
};

// ❌ REMOVE: Any public approve/reject functions
// Search for: pub fn submit_request_approval, pub fn approve_request, etc.
// Ensure NONE exist
```

**File: `daopad_backend/src/api/orbit.rs`, `orbit_transfers.rs`, etc.**
```rust
// PSEUDOCODE - Audit all API files

// Search for:
grep -r "#\[update\].*pub.*fn.*approv" daopad_backend/src/api/

// Verify ZERO matches (except internal helpers in proposals/)
```

### Step 2: Frontend Service Layer - Remove Direct Approval

**File: `daopad_frontend/src/services/orbitStationService.js`**
```javascript
// PSEUDOCODE

export class OrbitStationService {
  // ... existing methods ...

  // ❌ DELETE THIS METHOD
  async submitRequestApproval(input) {
    // DELETE ENTIRE METHOD
  }

  // ✅ KEEP: Read-only methods
  async listRequests({ ... }) { /* keep */ }
  async createRequest(input) { /* keep */ }
}
```

**File: `daopad_frontend/src/services/orbit/stationService.js`**
```javascript
// PSEUDOCODE

export class OrbitStationService {
  // ❌ DELETE THESE METHODS
  async approveRequest({ request_id, comment }) {
    // DELETE ENTIRE METHOD
  }

  async rejectRequest({ request_id, reason }) {
    // DELETE ENTIRE METHOD
  }
}
```

**File: `daopad_frontend/src/services/daopadBackend.js`**
```javascript
// PSEUDOCODE

export class DAOPadBackendService {
  // ❌ DELETE IF EXISTS
  async approveRequest(tokenId, proposalId, reason) {
    // DELETE ENTIRE METHOD
  }

  async rejectRequest(tokenId, proposalId, reason) {
    // DELETE ENTIRE METHOD
  }

  // ✅ KEEP: Voting methods
  async voteOnOrbitRequest(tokenId, orbitRequestId, vote) { /* keep */ }
  async voteOnTreasuryProposal(proposalId, vote) { /* keep */ }
  async getOrbitRequestProposal(tokenId, orbitRequestId) { /* keep */ }
}
```

### Step 3: Frontend Components - Replace Approval with Voting

**File: `daopad_frontend/src/components/orbit/UnifiedRequests.jsx`**
```javascript
// PSEUDOCODE

const UnifiedRequests = ({ tokenId, identity }) => {
  // ❌ DELETE: Approval state
  const [batchApproving, setBatchApproving] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState([]);

  // ❌ DELETE: Disabled approval handlers (lines 165-174)
  const handleApprovalDecision = async (requestId, decision, reason) => {
    // DELETE ENTIRE FUNCTION
  };

  const handleBatchApprove = async () => {
    // DELETE ENTIRE FUNCTION
  };

  // ❌ DELETE: Batch selection functions (lines 176-191)
  const toggleRequestSelection = (requestId) => { /* DELETE */ };
  const selectAllPending = () => { /* DELETE */ };
  const clearSelection = () => { /* DELETE */ };

  // ✅ KEEP: Treasury voting handler (lines 194-211)
  const handleTreasuryVote = async (proposalId, vote) => {
    // Keep this - it uses voting power
  };

  return (
    <Card>
      {/* ❌ DELETE: Batch actions bar (lines 298-337) */}
      <div className="flex gap-2">
        {/* DELETE ALL batch selection/approval UI */}
      </div>

      {/* ✅ KEEP: Request list with vote buttons */}
      <RequestList
        requests={requests}
        onApprove={(id, request) => {
          // Only treasury voting, or link to proposal voting
          if (request?.is_treasury_proposal) {
            handleTreasuryVote(request.proposal_id, true);
          } else {
            // TODO: Navigate to proposal voting page
            console.warn("Non-treasury voting not yet implemented in UI");
          }
        }}
        onReject={(id, reason, request) => {
          // Same as above
          if (request?.is_treasury_proposal) {
            handleTreasuryVote(request.proposal_id, false);
          } else {
            console.warn("Non-treasury voting not yet implemented in UI");
          }
        }}
      />
    </Card>
  );
};
```

**File: `daopad_frontend/src/components/orbit/requests/RequestDialog.jsx`**
```javascript
// PSEUDOCODE

// ❌ DELETE: Direct approval handlers
const handleApprove = async () => {
  // DELETE - This calls stationService.approveRequest()
};

const handleReject = async () => {
  // DELETE - This calls stationService.rejectRequest()
};

// ✅ REPLACE WITH: Vote handlers
const handleVote = async (vote) => {
  // Call backend.voteOnOrbitRequest(tokenId, requestId, vote)
  const backend = new DAOPadBackendService(identity);
  await backend.voteOnOrbitRequest(tokenId, request.id, vote);
  // Show success, refresh proposal data
};

return (
  <Dialog>
    {/* ❌ DELETE: Approve/Reject buttons */}
    <Button onClick={handleApprove}>Approve</Button>
    <Button onClick={handleReject}>Reject</Button>

    {/* ✅ REPLACE WITH: Vote Yes/No buttons */}
    <Button onClick={() => handleVote(true)}>Vote Yes</Button>
    <Button onClick={() => handleVote(false)}>Vote No</Button>

    {/* ✅ ADD: Vote progress display */}
    <div>
      Yes: {proposal.yes_votes} / {proposal.total_voting_power}
      Required: {(proposal.total_voting_power * threshold) / 100}
    </div>
  </Dialog>
);
```

**File: `daopad_frontend/src/components/DaoProposals.jsx`**
```javascript
// PSEUDOCODE

// ❌ DELETE: Direct approval handlers
const handleApprove = async (proposalId) => {
  // DELETE - This calls daopadService.approveRequest()
};

const handleReject = async (proposalId, reason) => {
  // DELETE - This calls daopadService.rejectRequest()
};

// ✅ REPLACE WITH: Vote handlers
const handleVote = async (proposalId, vote) => {
  const daopadService = new DAOPadBackendService(identity);
  // Assuming this is for Orbit requests:
  await daopadService.voteOnOrbitRequest(
    dao.token_canister,
    proposalId,
    vote
  );
  // Refresh proposal list
};

return (
  <>
    {proposals.map(proposal => (
      <Card key={proposal.id}>
        {/* ❌ DELETE: Approve/Reject buttons */}
        <Button onClick={() => handleApprove(proposal.id)}>Approve</Button>
        <Button onClick={() => handleReject(proposal.id)}>Reject</Button>

        {/* ✅ REPLACE WITH: Vote buttons */}
        <Button onClick={() => handleVote(proposal.id, true)}>
          Vote Yes (Your power: {userVotingPower})
        </Button>
        <Button onClick={() => handleVote(proposal.id, false)}>
          Vote No
        </Button>

        {/* ✅ ADD: Vote progress */}
        <VoteProgressBar
          yesVotes={proposal.yes_votes}
          noVotes={proposal.no_votes}
          totalPower={proposal.total_voting_power}
          threshold={proposal.request_type.voting_threshold()}
        />
      </Card>
    ))}
  </>
);
```

### Step 4: Redux State Cleanup

**File: `daopad_frontend/src/features/orbit/orbitSlice.js`**
```javascript
// PSEUDOCODE

// ❌ DELETE: Approval actions
const approveRequest = createAsyncThunk(
  'orbit/approveRequest',
  async ({ requestId, reason }) => {
    // DELETE ENTIRE THUNK
  }
);

const rejectRequest = createAsyncThunk(
  'orbit/rejectRequest',
  async ({ requestId, reason }) => {
    // DELETE ENTIRE THUNK
  }
);

// In slice reducers:
const orbitSlice = createSlice({
  name: 'orbit',
  initialState,
  reducers: {
    // ✅ KEEP: Read-only actions
    setRequests: (state, action) => { /* keep */ },

    // ❌ DELETE: Approval state mutations
    setApprovingRequest: (state, action) => { /* DELETE */ },
    setRejectingRequest: (state, action) => { /* DELETE */ },
  },
  extraReducers: (builder) => {
    // ❌ DELETE: Approval thunk handlers
    builder.addCase(approveRequest.pending, ...) // DELETE
    builder.addCase(approveRequest.fulfilled, ...) // DELETE
    builder.addCase(rejectRequest.pending, ...) // DELETE
    builder.addCase(rejectRequest.fulfilled, ...) // DELETE
  }
});
```

### Step 5: Verification & Testing

**After Implementation:**
```bash
# 1. Grep for forbidden patterns
cd daopad_frontend/src
rg "submitRequestApproval|approveRequest|rejectRequest" --type js
# Should return ZERO matches (or only in comments/deleted code)

cd ../../daopad_backend/src
rg "#\[update\].*pub.*fn.*(submit.*approval|approve.*request)" --type rust
# Should return ZERO matches in api/ folder

# 2. Test voting flow on mainnet
./deploy.sh --network ic

# 3. Manually verify:
# - Can vote on Orbit requests with voting power
# - Cannot approve/reject without voting
# - Vote progress bars show correctly
# - Proposals execute when threshold reached
```

## 🧪 Testing Strategy

### Unit Tests (Future)
```rust
// daopad_backend/src/proposals/orbit_requests_test.rs

#[test]
fn test_cannot_approve_without_voting() {
    // Verify no public endpoint allows direct approval
    // Only vote_on_orbit_request should exist
}

#[test]
fn test_voting_power_required() {
    // Verify voting requires Kong Locker VP > 0
    // Verify votes are weighted by VP
}
```

### Integration Tests (Mainnet)
1. **Create test Orbit request** in test station `fec7w-zyaaa-aaaaa-qaffq-cai`
2. **Vote with test identity** that has Kong Locker VP
3. **Verify**: Request does NOT execute until threshold reached
4. **Verify**: UI shows vote progress, not approve/reject buttons
5. **Verify**: No way to bypass voting in UI or API

## 📋 Acceptance Criteria

### ✅ Success Conditions
- [ ] Zero instances of `submitRequestApproval()` in frontend services
- [ ] Zero instances of `approveRequest()` / `rejectRequest()` in frontend
- [ ] No public `#[update]` approval endpoints in backend API
- [ ] All UI shows vote buttons with VP weighting
- [ ] Batch approval UI completely removed
- [ ] Toast warning "Direct approval is disabled" removed (functionality deleted)
- [ ] Grep searches return zero forbidden patterns
- [ ] All requests flow through `vote_on_orbit_request()` only

### ⚠️ Keep These (Not Bloat)
- Internal `approve_orbit_request_internal()` in proposals/orbit_requests.rs
- Internal `reject_orbit_request_internal()` in proposals/orbit_requests.rs
- Types: `SubmitRequestApprovalInput`, `RequestApprovalDecision` (internal use)
- Comments marking intentional removal (e.g., orbit_requests.rs:700)

## 🚨 Migration Notes

**Breaking Changes:**
- Any external code calling `approveRequest()` will break
- UI that depends on batch approval will break
- This is INTENTIONAL - we want failures to surface violations

**Communication:**
- Update README: "All Orbit operations require liquid democracy voting"
- Update CLAUDE.md: Add section on voting-only architecture
- Add migration guide: "If you need to approve a request, vote on it instead"

## 📚 References

- Current voting implementation: `daopad_backend/src/proposals/orbit_requests.rs`
- Kong Locker voting power: `daopad_backend/src/kong_locker/voting.rs`
- Proposal types: `daopad_backend/src/proposals/types.rs`
- CLAUDE.md section: "Universal Governance Requirement"

---

## Post-Implementation Checklist

After implementation:
- [ ] Run grep verification commands
- [ ] Deploy to mainnet with `./deploy.sh --network ic`
- [ ] Test voting flow manually
- [ ] Verify no approval bypass exists
- [ ] Update documentation
- [ ] Create PR with detailed description
