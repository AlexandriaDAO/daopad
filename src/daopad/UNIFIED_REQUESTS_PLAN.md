# Implementation Plan: Combine Transfers & Requests Tabs

## 🚨 MANDATORY: ISOLATION CHECK AND EXECUTION PROMPT

### Context: Worktree Already Created

**This plan was created by the planning agent in an isolated worktree.**

**Location:** `/home/theseus/alexandria/daopad-unified-requests/src/daopad`
**Branch:** `feature/unified-requests-tab`
**Plan file:** `UNIFIED_REQUESTS_PLAN.md` (in this worktree)

### Step 0: Verify Isolation (RUN THIS FIRST!)

```bash
# STOP! Verify you are in the correct worktree
REPO_ROOT=$(git rev-parse --show-toplevel)
CURRENT_BRANCH=$(git branch --show-current)

# Check you're NOT in main repo
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: You are in the MAIN repository"
    echo "❌ This plan was created in a worktree at:"
    echo "    /home/theseus/alexandria/daopad-unified-requests"
    echo ""
    echo "Navigate to the worktree:"
    echo "  cd /home/theseus/alexandria/daopad-unified-requests/src/daopad"
    echo "  cat UNIFIED_REQUESTS_PLAN.md  # Plan is here"
    exit 1
fi

# Check you're on the right branch
if [ "$CURRENT_BRANCH" != "feature/unified-requests-tab" ]; then
    echo "❌ WARNING: You are on branch '$CURRENT_BRANCH'"
    echo "Expected: feature/unified-requests-tab"
    echo "Are you in the right worktree?"
    exit 1
fi

echo "✅ You are in the correct worktree: $REPO_ROOT"
echo "✅ On branch: $CURRENT_BRANCH"
echo "✅ Safe to proceed with implementation"
```

### Your Execution Prompt

You are an autonomous PR orchestrator implementing the unified requests tab feature.

**NOTE:** The planning agent already created this worktree and this plan. You are continuing work in the same worktree.

EXECUTE THESE STEPS AUTONOMOUSLY (DO NOT ASK FOR PERMISSION):

**Step 0 - VERIFY ISOLATION (already in worktree):**
```bash
# Verify you're in the right place
pwd  # Should show ../daopad-unified-requests/src/daopad
git branch --show-current  # Should show feature/unified-requests-tab
ls UNIFIED_REQUESTS_PLAN.md  # This plan should be here
```

**Step 1 - Implement Feature:**
- Enhance UnifiedRequests component with batch approval from RequestsTable
- Add "Pending only" toggle, stats display, checkbox selection
- Update TokenDashboard to remove "Requests" tab, rename "Transfers" to "Activity"
- Remove RequestsTable component (deprecated)
- Update imports

**Step 2 - Deploy:**
```bash
# Only frontend changes - no backend modifications needed
./deploy.sh --network ic --frontend-only
```

**Step 3 - Commit and Push:**
```bash
git add -A
git commit -m "feat: Combine transfers and requests tabs into unified activity view"
git push -u origin feature/unified-requests-tab
```

**Step 4 - Create PR:**
```bash
gh pr create --title "Combine transfers and requests tabs into unified activity view" \
  --body "Merges redundant 'Transfers' and 'Requests' tabs into a single 'Activity' tab with best features from both components."
```

**YOUR CRITICAL RULES:**
- You MUST work in ../daopad-unified-requests/src/daopad (NOT main repo)
- Other agents ARE working in parallel - isolation is MANDATORY
- After sleep: IMMEDIATELY continue (no "should I check?" questions)
- ONLY STOP when: approved or critical error

START NOW with Step 0.

---

## Problem Statement

The TokenDashboard currently has two tabs showing essentially the same data:
- **"Transfers" tab**: Uses `UnifiedRequests` component - sophisticated filtering, domain selector
- **"Requests" tab**: Uses `RequestsTable` component - batch approval, table view, stats

### Analysis
Both tabs call the same backend method `list_orbit_requests` with similar parameters. They show ALL Orbit Station requests (transfers, member changes, canister ops, etc.), not just their namesake operations.

### Confusion
The "Transfers" tab name is misleading - it defaults to showing ALL requests, not just transfers. Users expect clarity on what each tab does.

---

## Current State

### File Tree (Relevant Sections)
```
daopad_frontend/
├── src/
│   ├── components/
│   │   ├── TokenDashboard.jsx (MODIFY - remove duplicate tab)
│   │   ├── orbit/
│   │   │   ├── UnifiedRequests.jsx (ENHANCE - add batch approval)
│   │   │   ├── RequestList.jsx (unchanged - presentation component)
│   │   │   ├── RequestDomainSelector.jsx (unchanged)
│   │   │   └── RequestFiltersCompact.jsx (unchanged)
│   │   └── tables/
│   │       └── RequestsTable.jsx (DEPRECATE - remove after merge)
│   ├── services/
│   │   └── daopadBackend.js (unchanged - already has all methods)
│   └── utils/
│       └── requestDomains.js (unchanged - domain filtering logic)
```

### Existing Implementations

#### UnifiedRequests.jsx (daopad_frontend/src/components/orbit/UnifiedRequests.jsx:1-250)
**Strengths:**
- Sophisticated domain filtering (All, Transfers, Users, Accounts, Canisters, System, Assets)
- Date range filters (created, expiration)
- Sort options
- Pagination with hasMore detection
- Card-based UI via RequestList (rich metadata display)
- 15-second auto-refresh polling
- Toast notifications

**Missing:**
- Batch approval
- Checkbox selection
- Stats display (total/pending counts)
- "Pending only" filter

**Backend calls:**
- `actor.list_orbit_requests(tokenId, ListRequestsInput)` - full filtering control
- `actor.submit_request_approval(tokenId, requestId, decision, reason)` - single approvals

#### RequestsTable.jsx (daopad_frontend/src/components/tables/RequestsTable.jsx:1-387)
**Strengths:**
- **Batch approval** - select multiple requests, approve all at once
- Checkbox selection UI with "select all"
- Stats display - total requests and pending count
- "Pending only" toggle checkbox
- Table UI (compact, scannable)
- Success/error alert messages

**Missing:**
- Domain filtering (can't filter by type)
- Advanced filters (dates, sort)
- Pagination
- Auto-refresh polling

**Backend calls:**
- `daopadService.listOrbitRequests(tokenId, includeCompleted)` - simple boolean filter
- `daopadService.batchApproveRequests(tokenId, requestIds[])` - **batch approval**
- `daopadService.approveOrbitRequest(tokenId, requestId)` - single approval
- `daopadService.rejectOrbitRequest(tokenId, requestId)` - single rejection

#### RequestList.jsx (daopad_frontend/src/components/orbit/RequestList.jsx:1-318)
**Purpose:** Presentation component - displays requests as cards
**Features:**
- Expiration warnings (urgent if <24 hours)
- Rich metadata (requester, created date, expiration)
- Approval counts display
- Individual approve/reject buttons
- Reject dialog with reason input

**Used by:** UnifiedRequests component

#### TokenDashboard.jsx Integration (daopad_frontend/src/components/TokenDashboard.jsx:410-459)
```javascript
<TabsList className="grid w-full grid-cols-7">
  <TabsTrigger value="accounts">Treasury</TabsTrigger>
  <TabsTrigger value="transfers">Transfers</TabsTrigger>  // ← UnifiedRequests
  <TabsTrigger value="members">Members</TabsTrigger>
  <TabsTrigger value="requests">Requests</TabsTrigger>    // ← RequestsTable (DUPLICATE!)
  <TabsTrigger value="canisters">Canisters</TabsTrigger>
  <TabsTrigger value="security">Security</TabsTrigger>
  <TabsTrigger value="settings">Settings</TabsTrigger>
</TabsList>

<TabsContent value="transfers" className="mt-4">
  {activeTab === 'transfers' && (
    <UnifiedRequests tokenId={token.canister_id} identity={identity} />
  )}
</TabsContent>

<TabsContent value="requests" className="mt-4">
  {activeTab === 'requests' && (
    <RequestsTable tokenId={token.canister_id} identity={identity} />
  )}
</TabsContent>
```

### Backend Service Methods (daopadBackend.js:444-548)

All required methods already exist:

1. **list_orbit_requests(tokenId, input)** - UnifiedRequests already uses this
2. **submit_request_approval(tokenId, requestId, decision, reason)** - Already uses this
3. **batchApproveRequests(tokenId, requestIds[])** - RequestsTable uses this, need to add to UnifiedRequests

```javascript
async batchApproveRequests(tokenCanisterId, requestIds) {
  // Loops through requestIds, calls submit_request_approval for each
  // Returns { success: true, data: outcomes[] } with ✓/✗ for each
}
```

---

## Implementation Plan

### Phase 1: Enhance UnifiedRequests Component

#### File: `daopad_frontend/src/components/orbit/UnifiedRequests.jsx` (MODIFY)

**Add state for batch operations:**
```javascript
// PSEUDOCODE - implementing agent will write real code

// Add to existing state (line ~17-38)
const [selectedRequests, setSelectedRequests] = useState([]);
const [batchApproving, setBatchApproving] = useState(false);
const [showOnlyPending, setShowOnlyPending] = useState(false);  // New toggle
```

**Add batch approval handler:**
```javascript
// Add after handleApprovalDecision (line ~113-136)

const handleBatchApprove = async () => {
  if (selectedRequests.length === 0) return;

  setBatchApproving(true);
  try {
    const backend = new DAOPadBackendService(identity);
    const result = await backend.batchApproveRequests(
      Principal.fromText(tokenId),
      selectedRequests
    );

    if (result.success) {
      const successCount = result.data.filter(r => r.includes('✓')).length;
      const failCount = result.data.filter(r => r.includes('✗')).length;
      toast.success(`Batch approval: ${successCount} succeeded, ${failCount} failed`);
      setSelectedRequests([]);
      await fetchRequests();
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    toast.error(`Batch approval failed: ${err.message}`);
  } finally {
    setBatchApproving(false);
  }
};

const toggleRequestSelection = (requestId) => {
  setSelectedRequests(prev =>
    prev.includes(requestId)
      ? prev.filter(id => id !== requestId)
      : [...prev, requestId]
  );
};

const selectAllPending = () => {
  const pendingRequests = requests.filter(r =>
    r.status === 'Created' || r.status === 'Scheduled'
  );
  setSelectedRequests(pendingRequests.map(r => r.id));
};

const clearSelection = () => setSelectedRequests([]);
```

**Update filters to respect "Pending only" toggle:**
```javascript
// Modify fetchRequests to include showOnlyPending filter (line ~46-110)
// When showOnlyPending is true, add to statuses filter:
//   statuses: showOnlyPending
//     ? [{ Created: null }, { Scheduled: null }]
//     : filters.statuses

// OR use the existing filters.statuses but provide UI to toggle it
```

**Add batch approval UI (before RequestList):**
```javascript
// Add between domain selector and RequestList (line ~179-194)

{/* Stats and batch actions bar */}
<div className="flex justify-between items-center py-2 border-y">
  <div className="flex gap-4">
    {/* Stats */}
    <div className="text-sm">
      <span className="font-semibold">{pagination.total}</span>
      <span className="text-muted-foreground"> total</span>
    </div>
    <div className="text-sm">
      <span className="font-semibold text-yellow-600">
        {requests.filter(r => r.status === 'Created' || r.status === 'Scheduled').length}
      </span>
      <span className="text-muted-foreground"> pending</span>
    </div>

    {/* Pending only toggle */}
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={showOnlyPending}
        onChange={(e) => {
          setShowOnlyPending(e.target.checked);
          // Update filters to only show Created/Scheduled statuses
        }}
      />
      <span className="text-sm">Pending only</span>
    </label>
  </div>

  {/* Batch actions */}
  <div className="flex gap-2">
    {selectedRequests.length > 0 && (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={clearSelection}
        >
          Clear ({selectedRequests.length})
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleBatchApprove}
          disabled={batchApproving}
        >
          {batchApproving ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Approving...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Approve {selectedRequests.length}
            </>
          )}
        </Button>
      </>
    )}
  </div>
</div>
```

**Pass selection state to RequestList:**
```javascript
// Modify RequestList props (line ~197-204)
<RequestList
  requests={requests}
  loading={loading}
  error={error}
  selectedRequests={selectedRequests}              // NEW
  onToggleSelection={toggleRequestSelection}       // NEW
  onSelectAll={selectAllPending}                   // NEW
  onApprove={(id) => handleApprovalDecision(id, 'Approved', null)}
  onReject={(id, reason) => handleApprovalDecision(id, 'Rejected', reason)}
  onRetry={fetchRequests}
/>
```

**Add imports:**
```javascript
// Add to imports (line ~1-15)
import { Zap, Clock } from 'lucide-react';
```

### Phase 2: Update RequestList Component (Optional Enhancement)

#### File: `daopad_frontend/src/components/orbit/RequestList.jsx` (OPTIONAL MODIFY)

**If you want checkbox selection in card view:**
```javascript
// PSEUDOCODE - implementing agent decides if needed

// Add checkbox to each Card (line ~177)
<Card key={request.id} className="hover:shadow-lg transition-shadow">
  <CardHeader>
    <div className="flex gap-3 items-start">
      {/* Checkbox for selectable requests */}
      {onToggleSelection && canApprove && (
        <input
          type="checkbox"
          checked={selectedRequests?.includes(request.id)}
          onChange={() => onToggleSelection(request.id)}
          className="mt-1"
        />
      )}
      <div className="flex-1">
        {/* ... existing card content ... */}
      </div>
    </div>
  </CardHeader>
  {/* ... rest of card ... */}
</Card>
```

**OR keep RequestList unchanged** - batch selection happens in UnifiedRequests header only. User can select by request ID if needed. Card view is for browsing, batch approval is power-user feature.

**Recommendation:** Keep RequestList unchanged. Batch approval via domain filter + "select all pending" is sufficient.

### Phase 3: Update TokenDashboard

#### File: `daopad_frontend/src/components/TokenDashboard.jsx` (MODIFY)

**Change 1: Rename tab and remove duplicate (line ~412-420)**
```javascript
// BEFORE:
<TabsList className="grid w-full grid-cols-7">
  <TabsTrigger value="accounts">Treasury</TabsTrigger>
  <TabsTrigger value="transfers">Transfers</TabsTrigger>
  <TabsTrigger value="members">Members</TabsTrigger>
  <TabsTrigger value="requests">Requests</TabsTrigger>  // ← REMOVE
  <TabsTrigger value="canisters">Canisters</TabsTrigger>
  <TabsTrigger value="security">Security</TabsTrigger>
  <TabsTrigger value="settings">Settings</TabsTrigger>
</TabsList>

// AFTER:
<TabsList className="grid w-full grid-cols-6">  // ← 6 not 7
  <TabsTrigger value="accounts">Treasury</TabsTrigger>
  <TabsTrigger value="activity">Activity</TabsTrigger>  // ← Renamed from "Transfers"
  <TabsTrigger value="members">Members</TabsTrigger>
  <TabsTrigger value="canisters">Canisters</TabsTrigger>
  <TabsTrigger value="security">Security</TabsTrigger>
  <TabsTrigger value="settings">Settings</TabsTrigger>
</TabsList>
```

**Change 2: Update tab content (line ~443-459)**
```javascript
// BEFORE:
<TabsContent value="transfers" className="mt-4">
  {activeTab === 'transfers' && (
    <UnifiedRequests tokenId={token.canister_id} identity={identity} />
  )}
</TabsContent>

<TabsContent value="requests" className="mt-4">
  {activeTab === 'requests' && (
    <RequestsTable tokenId={token.canister_id} identity={identity} />
  )}
</TabsContent>

// AFTER:
<TabsContent value="activity" className="mt-4">
  {activeTab === 'activity' && (
    <UnifiedRequests tokenId={token.canister_id} identity={identity} />
  )}
</TabsContent>

// ← Remove "requests" TabsContent entirely
```

**Change 3: Remove RequestsTable import (line ~8)**
```javascript
// BEFORE:
import RequestsTable from './tables/RequestsTable';

// AFTER:
// ← Remove this import
```

### Phase 4: Deprecate RequestsTable

#### File: `daopad_frontend/src/components/tables/RequestsTable.jsx` (DELETE)

After confirming UnifiedRequests works with all features:
```bash
# Move to deprecated folder (don't delete immediately in case rollback needed)
mkdir -p daopad_frontend/src/components/deprecated
git mv daopad_frontend/src/components/tables/RequestsTable.jsx \
  daopad_frontend/src/components/deprecated/

# OR just delete if confident
rm daopad_frontend/src/components/tables/RequestsTable.jsx
```

---

## Testing Strategy

### Build and Deploy Process

```bash
# Frontend-only changes (no backend modifications)
./deploy.sh --network ic --frontend-only
```

### Manual Testing Checklist

**Test on mainnet:** https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io

#### Activity Tab (formerly "Transfers")
- [ ] Tab renamed to "Activity" in header
- [ ] UnifiedRequests component loads
- [ ] Domain selector works (All, Transfers, Users, Accounts, etc.)
- [ ] Date filters work (created, expiration)
- [ ] Sort options work
- [ ] Pagination works (Previous/Next)
- [ ] Auto-refresh every 15 seconds
- [ ] Stats bar shows total and pending counts
- [ ] "Pending only" toggle filters to Created/Scheduled
- [ ] Request cards display with rich metadata
- [ ] Individual approve/reject buttons work
- [ ] Reject dialog with reason works

#### Batch Approval Features (NEW)
- [ ] Select individual requests (checkbox or ID-based)
- [ ] Batch approve button appears when selections made
- [ ] "Approve N" button shows count
- [ ] Batch approval succeeds for all selected
- [ ] Toast shows success/fail counts
- [ ] Selection clears after batch approval
- [ ] "Clear" button deselects all
- [ ] Batch approval works with domain filters

#### Requests Tab (REMOVED)
- [ ] "Requests" tab no longer appears in header
- [ ] Tab count is 6 (not 7)
- [ ] No console errors about missing RequestsTable

#### Edge Cases
- [ ] Empty state when no requests
- [ ] Loading skeleton during fetch
- [ ] Error handling when backend fails
- [ ] Selecting 0 requests - batch button hidden
- [ ] Selecting all pending requests
- [ ] Mix of pending/completed - only pending selectable

### Backend Testing (No changes needed)

Backend already has all required methods:
- `list_orbit_requests` - ✅ Already tested
- `submit_request_approval` - ✅ Already tested
- `batchApproveRequests` - ✅ Used by RequestsTable (verified working)

No new backend deployment or testing required.

---

## Scope Estimate

### Files Modified
- **Modified files:** 2
  - `daopad_frontend/src/components/orbit/UnifiedRequests.jsx` (enhance)
  - `daopad_frontend/src/components/TokenDashboard.jsx` (remove duplicate tab)
- **Deleted files:** 1
  - `daopad_frontend/src/components/tables/RequestsTable.jsx` (deprecated)

### Lines of Code
- **UnifiedRequests.jsx:** +80 lines (batch approval UI, state, handlers)
- **TokenDashboard.jsx:** -15 lines (remove duplicate tab and import)
- **RequestsTable.jsx:** -387 lines (deleted)
- **Net:** -322 lines (code reduction!)

### Complexity
- **Low:** UI state management, checkbox selection
- **Medium:** Batch approval integration with existing backend service
- **Low:** Tab renaming and cleanup

### Time Estimate
- Implementation: 1 hour (mostly UI work, backend already done)
- Testing on mainnet: 30 minutes
- Review iteration: 15 minutes
- **Total:** ~2 hours

---

## Success Criteria

### Definition of Done

**Feature completeness:**
- [ ] Single "Activity" tab replaces both "Transfers" and "Requests"
- [ ] All features from UnifiedRequests preserved (domain filtering, dates, pagination, auto-refresh)
- [ ] All features from RequestsTable integrated (batch approval, stats, "pending only")
- [ ] No duplicate functionality
- [ ] Code reduction (net -322 lines)

**User experience:**
- [ ] Tab name clarifies it shows all activity types (not just transfers)
- [ ] Stats visible at a glance (total/pending)
- [ ] Quick "pending only" toggle for triage workflow
- [ ] Batch approval for power users
- [ ] Rich metadata in card view for detailed review

**Technical quality:**
- [ ] No console errors
- [ ] No TypeScript/PropTypes warnings
- [ ] Clean imports (no unused)
- [ ] Follows existing patterns
- [ ] Deploys successfully to mainnet
- [ ] All manual tests pass

---

## Critical Implementation Notes

### 🚨 ISOLATION IS MANDATORY
**The implementing agent MUST work in an isolated worktree because:**
- Other agents are working in parallel in the main repo
- File changes from other agents will corrupt your work
- Git operations by other agents will change your files
- The orchestrator prompt above ENFORCES this with exit checks

### DAOPad-Specific Requirements

#### Frontend-Only Deployment
**No backend changes, so skip backend build:**
```bash
./deploy.sh --network ic --frontend-only
```

#### No Candid Extraction Needed
This is a pure frontend refactor. No Rust changes = no candid extraction required.

### Don't Guess Behavior
**Test existing components before modifying:**
- Load mainnet app and test RequestsTable batch approval
- Verify batchApproveRequests backend method behavior
- Confirm toast notifications work as expected
- Check that domain filters work correctly

**If unsure about a component's behavior:**
```bash
# Read the component first
cat daopad_frontend/src/components/orbit/UnifiedRequests.jsx

# Test on mainnet
# Visit: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
# Click through existing UI
```

### Don't Break Existing Features
**Preserve these working features:**
- Domain filtering (All, Transfers, Users, etc.)
- Date range filters
- Sort options
- Pagination with hasMore
- 15-second auto-refresh
- Individual approve/reject
- Rejection reason dialog
- Card-based rich metadata display

### Do Follow Existing Patterns

**State management pattern:**
```javascript
// UnifiedRequests already uses this pattern
const [selectedRequests, setSelectedRequests] = useState([]);
const [batchApproving, setBatchApproving] = useState(false);
```

**Backend service pattern:**
```javascript
// RequestsTable already does this
const daopadService = new DAOPadBackendService(identity);
const result = await daopadService.batchApproveRequests(tokenPrincipal, selectedRequests);
```

**Toast notification pattern:**
```javascript
// UnifiedRequests already uses this
toast.success('Operation successful');
toast.error('Operation failed');
```

**UI component imports:**
```javascript
// Already imported in UnifiedRequests
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
```

---

## Checkpoint Strategy

**Single PR Implementation:**
This feature is cohesive and small - implement in one PR:
1. Enhance UnifiedRequests with batch approval
2. Update TokenDashboard (remove duplicate tab)
3. Delete RequestsTable
4. Test comprehensively on mainnet
5. Create PR with all changes

**No checkpoint PRs needed** - feature is ~2 hours of work, low risk.

---

## Risk Assessment

### Low Risk Factors
- ✅ No backend changes (no candid sync issues)
- ✅ Backend methods already tested (used by RequestsTable)
- ✅ Frontend-only deployment (fast rollback)
- ✅ No database migrations
- ✅ Code reduction (removing complexity)
- ✅ Existing component tested in production

### Potential Issues

**Issue 1: Breaking existing UnifiedRequests users**
- **Mitigation:** Preserve all existing features, only add new ones
- **Test:** Domain filtering, date filters, pagination, auto-refresh

**Issue 2: Batch approval performance (if many requests)**
- **Mitigation:** Backend already handles this (used by RequestsTable)
- **Test:** Select 10+ requests, batch approve, verify success

**Issue 3: UI state conflicts (selection vs filters)**
- **Mitigation:** Clear selection when domain changes
- **Pattern:** RequestsTable already handles this

**Issue 4: Toast notification spam (batch approval)**
- **Mitigation:** Single toast with counts (N succeeded, M failed)
- **Pattern:** RequestsTable already does this

### Rollback Plan

If issues discovered after deployment:
```bash
# Revert the PR
git revert <commit-hash>

# Redeploy frontend
./deploy.sh --network ic --frontend-only

# Or restore RequestsTable temporarily
git checkout HEAD~1 -- daopad_frontend/src/components/tables/RequestsTable.jsx
git checkout HEAD~1 -- daopad_frontend/src/components/TokenDashboard.jsx
./deploy.sh --network ic --frontend-only
```

---

## 🚀 Ready to Implement

This plan is complete and ready for the implementing agent to execute autonomously.

**Estimated effort:** 2 hours
**Risk level:** Low
**Deployment:** Frontend-only (fast, reversible)

**The implementing agent should:**
1. Verify isolation (run Step 0 bash script)
2. Implement all changes in UnifiedRequests.jsx
3. Update TokenDashboard.jsx
4. Delete RequestsTable.jsx
5. Deploy to mainnet
6. Test all features manually
7. Create PR with clear description

---

## 🛑 PLANNING AGENT - YOUR JOB IS DONE

DO NOT:
- ❌ Implement code
- ❌ Make additional edits beyond the plan
- ❌ Create PRs (that's implementing agent's job)
- ❌ Deploy
- ❌ Ask "should I continue?" and then execute
- ❌ Use ExitPlanMode and then implement

The implementing agent will:
1. Navigate to the worktree
2. Read this plan
3. Execute the plan
4. Create PR with both plan + implementation

**🛑 END PLANNING SESSION 🛑**
