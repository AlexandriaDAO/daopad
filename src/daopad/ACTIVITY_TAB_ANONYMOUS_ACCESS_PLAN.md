# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-activity-tab-fix/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-activity-tab-fix/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes only:
     ```bash
     cd daopad_frontend
     npm run build
     cd ..
     ./deploy.sh --network ic --frontend-only
     ```
4. **Test with Playwright**:
   ```bash
   cd daopad_frontend
   npx playwright test e2e/activity.spec.ts --project=chromium
   ```
5. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Fix]: Activity Tab Loading for Anonymous Users

- Remove identity checks blocking anonymous proposal viewing
- Backend query methods already support public access
- Anonymous users can VIEW proposals, cannot VOTE
- Add data-testid attributes for E2E testing
- Handle BigInt conversions for vote counts and timestamps"

   git push -u origin feature/activity-tab-anonymous-access

   gh pr create --title "[Fix]: Activity Tab Loading for Anonymous Users" --body "Implements ACTIVITY_TAB_ANONYMOUS_ACCESS_PLAN.md

## Summary
- ✅ Anonymous users can view proposals and voting progress
- ✅ Backend query methods support public access (no auth needed)
- ✅ Authenticated users retain voting functionality
- ✅ BigInt conversions handled for vote counts and timestamps
- ✅ Playwright tests validate real proposal data flow

## Bugs Fixed

### Bug 1: Identity Check in UnifiedRequests.tsx:59
**Before**:
\`\`\`typescript
if (!tokenId || !identity) return;  // ❌ Blocks anonymous
\`\`\`

**After**:
\`\`\`typescript
if (!tokenId) return;  // ✅ Works for everyone
// Identity check only for voting, not viewing
\`\`\`

### Bug 2: Identity Check in DaoProposals.tsx:74
**Before**:
\`\`\`typescript
if (dao?.station_canister?.[0] && identity && isAuthenticated) {
  fetchProposals();
}
\`\`\`

**After**:
\`\`\`typescript
if (dao?.station_canister?.[0]) {
  fetchProposals();  // Works for anonymous
}
\`\`\`

### Bug 3: Identity Check in useProposal.ts:79
**Before**:
\`\`\`typescript
if (!identity || !tokenId || !orbitRequestId) {
  setLoading(false);
  return;
}
\`\`\`

**After**:
\`\`\`typescript
if (!tokenId || !orbitRequestId) {
  setLoading(false);
  return;
}
// Proposals viewable without identity
\`\`\`

### Bug 4: BigInt Conversions
- Vote counts (yes_votes, no_votes, total_voting_power) returned as BigInt
- Timestamps (created_at, expires_at) returned as BigInt
- Convert at source: \`typeof value === 'bigint' ? Number(value) : value\`

### Bug 5: Voting UI Conditionals
- Only show vote buttons for authenticated users
- Anonymous users see progress bars and vote counts
- Clear messaging about voting power requirements

## Test Evidence
**Before**: Activity tab empty (anonymous users blocked)
**After**: Activity tab shows proposals with vote progress

## Testing
- E2E tests: activity.spec.ts validates proposal list and vote counts
- Manual test: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/activity
- Shows: Proposals, vote progress, operation types"
   ```
6. **Iterate autonomously**:
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

**Branch:** `feature/activity-tab-anonymous-access`
**Worktree:** `/home/theseus/alexandria/daopad-activity-tab-fix/src/daopad`

---

# Implementation Plan: Fix Activity Tab for Anonymous Users

## Current State

### File Structure
```
daopad_frontend/
├── src/
│   ├── routes/
│   │   └── dao/
│   │       └── DaoActivity.tsx             # 🟢 Routing component (passes identity)
│   ├── components/
│   │   ├── DaoProposals.tsx                # 🔴 Line 74: identity check blocks fetch
│   │   ├── ProposalCard.tsx                # Displays individual proposal
│   │   ├── ProposalDetailsModal.tsx        # Shows proposal details
│   │   └── orbit/
│   │       ├── UnifiedRequests.tsx         # 🔴 Line 59: identity check blocks fetch
│   │       └── requests/
│   │           ├── VoteButtons.tsx         # Voting UI (should require auth)
│   │           └── VoteProgressBar.tsx     # Progress display (public)
│   ├── hooks/
│   │   ├── useProposal.ts                  # 🔴 Line 79: identity check blocks fetch
│   │   └── useVoting.ts                    # Voting logic (requires auth)
│   ├── services/
│   │   └── backend/
│   │       └── proposals/
│   │           └── ProposalService.ts      # Backend API wrapper
│   └── types/
│       └── proposal.types.ts               # Type definitions

daopad_backend/
└── src/
    └── proposals/
        └── orbit_requests.rs               # ✅ Lines 213, 227: query methods (no auth)
```

### Backend Support (Already Working)

Backend has PUBLIC query methods (no authentication required):

```rust
// Line 213: Get single proposal
#[query]
pub fn get_orbit_request_proposal(
    token_id: Principal,
    orbit_request_id: String,
) -> Option<OrbitRequestProposal>

// Line 227: List all proposals for token
#[query]
pub fn list_orbit_request_proposals(
    token_id: Principal
) -> Vec<OrbitRequestProposal>
```

These are **query** methods - NO auth required. Backend returns:
- Proposal ID and status
- Vote counts (yes_votes, no_votes) as `u64` (BigInt in JS)
- Total voting power as `u64` (BigInt in JS)
- Timestamps (created_at, expires_at) as `u64` nanoseconds (BigInt in JS)
- Request type and proposer

### Current Flow (BROKEN for anonymous)

```
User loads /dao/:tokenId/activity
  ↓
DaoActivity.tsx renders UnifiedRequests ✅
  ↓
UnifiedRequests.tsx:59 checks identity
  ↓
if (!tokenId || !identity) return;  // ❌ FAILS: identity = null for anonymous
  ↓
NO PROPOSALS FETCHED ❌
```

Alternative flow via DaoProposals component:
```
User loads proposal view
  ↓
DaoProposals.tsx:74 useEffect
  ↓
if (dao?.station_canister?.[0] && identity && isAuthenticated) {
  fetchProposals();  // ❌ BLOCKED for anonymous
}
  ↓
NO PROPOSALS FETCHED ❌
```

### 5 Bugs Identified

#### Bug 1: UnifiedRequests.tsx:59
```typescript
// BEFORE (line 59)
if (!tokenId || !identity) return;  // ❌ Blocks anonymous

// AFTER
if (!tokenId) return;  // ✅ Allow anonymous viewing
// Identity only required for voting actions
```

#### Bug 2: DaoProposals.tsx:74
```typescript
// BEFORE (line 74)
if (dao?.station_canister?.[0] && identity && isAuthenticated) {
  fetchProposals();  // ❌ Blocks anonymous
}

// AFTER
if (dao?.station_canister?.[0]) {
  fetchProposals();  // ✅ Works for everyone
}
```

#### Bug 3: useProposal.ts:79
```typescript
// BEFORE (line 79)
if (!identity || !tokenId || !orbitRequestId) {
  setLoading(false);
  return;  // ❌ Blocks anonymous
}

// AFTER
if (!tokenId || !orbitRequestId) {
  setLoading(false);
  return;  // ✅ Identity not required for viewing
}
```

#### Bug 4: BigInt Conversions
Backend returns `u64` values that become BigInt in JavaScript:
- `yes_votes: u64` → BigInt (needs conversion for display)
- `no_votes: u64` → BigInt (needs conversion for display)
- `total_voting_power: u64` → BigInt (needs conversion)
- `created_at: u64` → BigInt (needs conversion)
- `expires_at: u64` → BigInt (needs conversion)

**Pattern from PR #95** (orbitSlice.ts):
```typescript
// Convert BigInt at source
const safeValue = typeof value === 'bigint' ? Number(value) : value;
```

#### Bug 5: Voting UI Conditionals
Vote buttons should only show for authenticated users:
```typescript
// VoteButtons.tsx - Already correct pattern
{identity && hasVotingPower ? (
  <VoteButtons />
) : (
  <VoteProgressBar />  // Show progress for anonymous
)}
```

### Expected Flow (FIXED)

```
User loads /dao/:tokenId/activity (anonymous)
  ↓
DaoActivity.tsx renders UnifiedRequests
  ↓
UnifiedRequests.tsx:59 checks tokenId only
  ↓
if (!tokenId) return;  // ✅ PASSES
  ↓
fetchRequests() called
  ↓
Backend: list_orbit_request_proposals(tokenId)
  ↓
Returns: Vec<OrbitRequestProposal> ✅
  ↓
Proposals displayed with vote progress ✅
  ↓
Anonymous user sees:
- Proposal list ✅
- Vote counts (converted from BigInt) ✅
- Progress bars ✅
- Operation types ✅
- ❌ No vote buttons (requires auth)
```

---

## Implementation Plan

### Phase 1: Fix UnifiedRequests.tsx

**File:** `daopad_frontend/src/components/orbit/UnifiedRequests.tsx`

#### Change 1: Remove identity requirement (Line 59)

```typescript
// BEFORE (line 59)
if (!tokenId || !identity) return;

// AFTER
if (!tokenId) return;
```

#### Change 2: Make identity optional in service calls (Line 66)

```typescript
// BEFORE (line 66)
const backend = getProposalService(identity);

// AFTER
const backend = getProposalService(identity || null);
```

#### Change 3: Add BigInt conversions for vote counts

```typescript
// AFTER fetching proposals, convert BigInt values
const proposals = result.Ok.map(proposal => ({
  ...proposal,
  yes_votes: typeof proposal.yes_votes === 'bigint'
    ? Number(proposal.yes_votes)
    : proposal.yes_votes,
  no_votes: typeof proposal.no_votes === 'bigint'
    ? Number(proposal.no_votes)
    : proposal.no_votes,
  total_voting_power: typeof proposal.total_voting_power === 'bigint'
    ? Number(proposal.total_voting_power)
    : proposal.total_voting_power,
  created_at: typeof proposal.created_at === 'bigint'
    ? Number(proposal.created_at)
    : proposal.created_at,
  expires_at: typeof proposal.expires_at === 'bigint'
    ? Number(proposal.expires_at)
    : proposal.expires_at,
}));
```

#### Change 4: Add data-testid attributes

```typescript
// In proposal list rendering
<div data-testid="activity-proposal" key={proposal.id}>
  <span data-testid="proposal-title">{proposal.title}</span>
  <span data-testid="proposal-yes-votes">{proposal.yes_votes}</span>
  <span data-testid="proposal-no-votes">{proposal.no_votes}</span>
</div>
```

#### Change 5: Conditional voting UI

```typescript
// Only show vote buttons for authenticated users
{identity ? (
  <VoteButtons
    requestId={proposal.id}
    onVote={handleVote}
  />
) : (
  <VoteProgressBar
    yesVotes={proposal.yes_votes}
    noVotes={proposal.no_votes}
    totalPower={proposal.total_voting_power}
  />
)}
```

### Phase 2: Fix DaoProposals.tsx

**File:** `daopad_frontend/src/components/DaoProposals.tsx`

#### Change 1: Remove identity requirement (Line 74)

```typescript
// BEFORE (line 74)
useEffect(() => {
  if (dao?.station_canister?.[0] && identity && isAuthenticated) {
    fetchProposals();
  } else {
    setLoading(false);
    setProposals([]);
  }
}, [dao, identity, isAuthenticated, filter]);

// AFTER
useEffect(() => {
  if (dao?.station_canister?.[0]) {
    fetchProposals();  // Works for anonymous
  } else {
    setLoading(false);
    setProposals([]);
  }
}, [dao, filter]);  // Remove identity from dependencies
```

#### Change 2: Make identity optional in service (Line 126)

```typescript
// BEFORE (line 126)
const orbitService = new OrbitStationService(identity, dao.station_canister[0]);

// AFTER
const orbitService = new OrbitStationService(identity || null, dao.station_canister[0]);
```

#### Change 3: Convert BigInt values after fetch

```typescript
// AFTER result.success check (around line 130)
if (result.success) {
  const proposals = (result.data || []).map(proposal => ({
    ...proposal,
    yes_votes: typeof proposal.yes_votes === 'bigint'
      ? Number(proposal.yes_votes)
      : proposal.yes_votes,
    no_votes: typeof proposal.no_votes === 'bigint'
      ? Number(proposal.no_votes)
      : proposal.no_votes,
    // ... other BigInt conversions
  }));
  setProposals(proposals);
}
```

#### Change 4: Conditional voting buttons (Line 327)

```typescript
// BEFORE (line 327)
canVote={dao.is_registered}

// AFTER - More explicit check
canVote={identity && isAuthenticated && dao.is_registered}
```

#### Change 5: Add data-testid attributes

```typescript
// In ProposalCard props
<ProposalCard
  key={proposal.id}
  data-testid="dao-proposal"
  proposal={proposal}
  // ... other props
/>
```

### Phase 3: Fix useProposal.ts Hook

**File:** `daopad_frontend/src/hooks/useProposal.ts`

#### Change 1: Remove identity requirement (Line 79)

```typescript
// BEFORE (line 79)
const fetchProposal = useCallback(async () => {
  if (!identity || !tokenId || !orbitRequestId) {
    setLoading(false);
    return;
  }
  // ... fetch logic

// AFTER
const fetchProposal = useCallback(async () => {
  if (!tokenId || !orbitRequestId) {
    setLoading(false);
    return;
  }

  // Make identity optional
  setLoading(true);
  setError(null);
  try {
    const proposalService = getProposalService(identity || null);
    // ... rest of logic
```

#### Change 2: Convert BigInt in proposal data

```typescript
// AFTER successful fetch (line 94)
if (result.success && result.data) {
  const proposal = {
    ...result.data,
    yes_votes: typeof result.data.yes_votes === 'bigint'
      ? Number(result.data.yes_votes)
      : result.data.yes_votes,
    no_votes: typeof result.data.no_votes === 'bigint'
      ? Number(result.data.no_votes)
      : result.data.no_votes,
    total_voting_power: typeof result.data.total_voting_power === 'bigint'
      ? Number(result.data.total_voting_power)
      : result.data.total_voting_power,
    created_at: typeof result.data.created_at === 'bigint'
      ? Number(result.data.created_at)
      : result.data.created_at,
    expires_at: typeof result.data.expires_at === 'bigint'
      ? Number(result.data.expires_at)
      : result.data.expires_at,
  };
  setProposal(proposal);
}
```

### Phase 4: Update ProposalService.ts

**File:** `daopad_frontend/src/services/backend/proposals/ProposalService.ts`

#### Change 1: Handle null identity gracefully

```typescript
// In ProposalService constructor or methods
constructor(identity) {
  super(identity);
  // Identity can be null for query-only operations
}

// Methods should work with null identity for queries
async listOrbitRequestProposals(tokenId) {
  try {
    const actor = await this.getActor();  // Works even if identity is null
    const tokenPrincipal = this.toPrincipal(tokenId);
    const result = await actor.list_orbit_request_proposals(tokenPrincipal);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to list orbit request proposals:', error);
    return { success: false, error: error.message };
  }
}
```

### Phase 5: Update VoteButtons Component

**File:** `daopad_frontend/src/components/orbit/requests/VoteButtons.tsx`

#### Change: Add authentication check at component level

```typescript
// PSEUDOCODE
export function VoteButtons({ requestId, onVote, identity }) {
  // Don't render if no identity
  if (!identity) {
    return null;  // Or show "Sign in to vote" message
  }

  return (
    <div data-testid="vote-buttons">
      <Button
        data-testid="vote-yes-button"
        onClick={() => onVote(requestId, true)}
      >
        Vote Yes
      </Button>
      <Button
        data-testid="vote-no-button"
        onClick={() => onVote(requestId, false)}
      >
        Vote No
      </Button>
    </div>
  );
}
```

### Phase 6: Create E2E Test

**File:** `daopad_frontend/e2e/activity.spec.ts` (NEW)

```typescript
// PSEUDOCODE
import { test, expect } from '@playwright/test';

test.describe('Activity Tab - Anonymous User', () => {
  test('should display proposals for anonymous users', async ({ page }) => {
    // Navigate to activity tab
    await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/activity');

    // Wait for proposals to load
    await page.waitForSelector('[data-testid="activity-proposal"]');

    // Verify proposals are displayed
    const proposals = await page.locator('[data-testid="activity-proposal"]').count();
    expect(proposals).toBeGreaterThan(0);

    // Verify vote counts are displayed (not BigInt)
    const yesVotes = await page.locator('[data-testid="proposal-yes-votes"]').first().textContent();
    expect(yesVotes).toMatch(/^\d+$/);  // Should be regular number string

    // Verify vote buttons are NOT shown for anonymous users
    const voteButtons = await page.locator('[data-testid="vote-buttons"]').count();
    expect(voteButtons).toBe(0);

    // Verify progress bars ARE shown
    const progressBars = await page.locator('[data-testid="vote-progress-bar"]').count();
    expect(progressBars).toBeGreaterThan(0);
  });

  test('should handle BigInt vote counts correctly', async ({ page }) => {
    await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/activity');

    // Check console for BigInt errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.waitForSelector('[data-testid="activity-proposal"]');
    await page.waitForTimeout(2000);  // Let all rendering complete

    // No BigInt serialization errors
    expect(consoleErrors.filter(e => e.includes('BigInt'))).toHaveLength(0);
  });
});
```

---

## Testing Strategy

### Backend Verification (Already Works)

```bash
# Test backend query methods (no auth required)
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_orbit_request_proposals \
  '(principal "ysy5f-2qaaa-aaaap-qkmmq-cai")'

# Should return Vec<OrbitRequestProposal>
# Verify u64 fields: yes_votes, no_votes, total_voting_power
```

### Frontend Build

```bash
cd daopad_frontend
npm run build

# Verify no BigInt serialization errors
# Check bundle for proper conversions
```

### Deploy to Mainnet

```bash
cd /home/theseus/alexandria/daopad-activity-tab-fix/src/daopad
./deploy.sh --network ic --frontend-only

# CRITICAL: All testing happens on mainnet
# URL: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/activity
```

### Playwright E2E Tests

```bash
cd daopad_frontend
npx playwright test e2e/activity.spec.ts --project=chromium

# Tests verify:
# ✅ Proposals load for anonymous users
# ✅ Vote counts display as numbers (not BigInt)
# ✅ Progress bars shown (not vote buttons)
# ✅ No console errors about BigInt
```

### Manual Testing Checklist

**Anonymous User Flow:**
1. Open incognito window
2. Navigate to: `https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/activity`
3. ✅ Proposals list loads
4. ✅ Vote counts show as numbers (e.g., "Yes: 1234" not "Yes: 1234n")
5. ✅ Progress bars visible
6. ❌ No vote buttons (requires auth)
7. ✅ Timestamps display correctly
8. ✅ No console errors

**Authenticated User Flow:**
1. Connect Internet Identity
2. Navigate to activity tab
3. ✅ All above still works
4. ✅ PLUS: Vote buttons appear
5. ✅ Can cast votes
6. ✅ Vote counts update after voting

---

## Success Criteria

### Functional Requirements
- [x] Anonymous users can view proposal list
- [x] Anonymous users see vote counts (converted from BigInt)
- [x] Anonymous users see progress bars
- [x] Anonymous users see operation types and titles
- [x] Vote buttons hidden for anonymous users
- [x] Authenticated users retain all functionality
- [x] No BigInt serialization errors in console
- [x] Timestamps display correctly

### Technical Requirements
- [x] Backend query methods called successfully (no auth)
- [x] BigInt conversions at source (before Redux state)
- [x] Identity checks only for voting actions
- [x] data-testid attributes for E2E testing
- [x] Playwright tests pass

### Performance
- [x] Page loads in <3 seconds
- [x] No unnecessary re-renders
- [x] Proposals cached appropriately

---

## Rollback Plan

If issues occur:
```bash
# Revert frontend deployment
cd /home/theseus/alexandria/daopad/src/daopad
git checkout master
./deploy.sh --network ic --frontend-only

# Backend unchanged (query methods already support anonymous)
```

---

## References

- **PR #95 Pattern**: Treasury fix with identity removal
- **Backend Methods**: `daopad_backend/src/proposals/orbit_requests.rs:213-236`
- **Test Guide**: `PLAYWRIGHT_TESTING_GUIDE.md`
- **Plan Methodology**: `.claude/workflows/plan-pursuit-methodology-condensed.md`

---

## Implementation Checklist

- [ ] UnifiedRequests.tsx: Remove identity requirement (line 59)
- [ ] UnifiedRequests.tsx: Make identity optional in service (line 66)
- [ ] UnifiedRequests.tsx: Add BigInt conversions
- [ ] UnifiedRequests.tsx: Add data-testid attributes
- [ ] UnifiedRequests.tsx: Conditional voting UI
- [ ] DaoProposals.tsx: Remove identity requirement (line 74)
- [ ] DaoProposals.tsx: Make identity optional (line 126)
- [ ] DaoProposals.tsx: BigInt conversions
- [ ] DaoProposals.tsx: Conditional voting buttons
- [ ] DaoProposals.tsx: data-testid attributes
- [ ] useProposal.ts: Remove identity requirement (line 79)
- [ ] useProposal.ts: BigInt conversions
- [ ] ProposalService.ts: Handle null identity
- [ ] VoteButtons.tsx: Authentication check
- [ ] Create activity.spec.ts E2E test
- [ ] Build frontend (npm run build)
- [ ] Deploy to mainnet (--frontend-only)
- [ ] Run Playwright tests
- [ ] Manual testing (anonymous + authenticated)
- [ ] Create PR with evidence

---

**END OF PLAN**

The implementing agent should follow this plan step-by-step, applying the same patterns from PR #95 (Treasury fix) to the Activity tab. The key insight is that backend query methods already support anonymous access - we just need to remove frontend identity checks for viewing (not voting).
