# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-fix-public-dashboard/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-fix-public-dashboard/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes:
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Run Playwright Tests**:
   ```bash
   cd daopad_frontend
   npx playwright test e2e/app-route.spec.ts
   ```
5. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Fix]: Public dashboard data loading for anonymous users

Fixes issue where public components weren't rendered for logged-out users.

- Show PublicStatsStrip, PublicActivityFeed, TreasuryShowcase for anonymous users
- Keep TokenTabs for authenticated users only
- Ensures Playwright tests pass by rendering expected data-testid elements

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
   git push -u origin feature/fix-public-dashboard-loading
   gh pr create --title "[Fix]: Public Dashboard Loading for Anonymous Users" --body "Implements FIX_PUBLIC_DASHBOARD_LOADING.md"
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

**Branch:** `feature/fix-public-dashboard-loading`
**Worktree:** `/home/theseus/alexandria/daopad-fix-public-dashboard/src/daopad`

---

# Implementation Plan: Fix Public Dashboard Loading

## Problem Statement

Anonymous (logged-out) users see skeleton loaders indefinitely because public dashboard components are never rendered in the UI, even though:
1. `fetchPublicDashboard` Redux thunk executes successfully
2. Data is loaded into Redux state
3. Backend API calls complete without errors

## Root Cause Analysis

### Current File Tree
```
daopad_frontend/src/
├── routes/
│   └── AppRoute.tsx                    # Main route - IMPORTS but doesn't USE public components
├── components/
│   ├── PublicStatsStrip.tsx           # ✅ Ready to display stats
│   ├── PublicActivityFeed.tsx         # ✅ Ready to display proposals
│   ├── TreasuryShowcase.tsx           # ✅ Ready to display treasuries
│   └── TokenTabs.tsx                  # Only for authenticated users
└── features/dao/
    └── daoSlice.ts                     # ✅ Redux state correctly populated

e2e/
└── app-route.spec.ts                   # Playwright test expects stat-card elements
```

### Current Behavior (AppRoute.tsx:244-257)
```typescript
// Lines 244-257: Main content rendering
<main className="container mx-auto px-4 py-8">
  {isAuthenticated && shouldShowKongLockerSetup ? (
    <div className="max-w-2xl mx-auto">
      <KongLockerSetup
        identity={identity}
        onComplete={handleKongLockerComplete}
      />
    </div>
  ) : (
    <TokenTabs
      identity={identity}  // ⬅️ PROBLEM: Always renders TokenTabs
    />
  )}
</main>
```

### Why Tests Fail
1. Playwright expects `[data-testid="stat-card"]` elements (from PublicStatsStrip)
2. PublicStatsStrip is imported but never rendered
3. TokenTabs requires authentication and locked tokens
4. Anonymous users get stuck in loading state

### Evidence from Console Logs
```
DFX_NETWORK: undefined
Internet Identity URL: https://identity.internetcomputer.org
[No backend API calls visible] ⬅️ fetchPublicDashboard might not execute OR
                                   components not rendered to show the data
```

## Implementation Strategy

### Conditional Rendering Pattern
```
IF user is authenticated:
  IF has Kong Locker setup:
    Show TokenTabs (governance features)
  ELSE:
    Show KongLockerSetup prompt
ELSE (anonymous user):
  Show PublicStatsStrip     (system statistics)
  Show PublicActivityFeed   (active proposals)
  Show TreasuryShowcase     (treasury overview)
```

### Design Rationale
- **Separation of Concerns**: Authenticated features vs. public features
- **Progressive Enhancement**: Anonymous users see public data, authenticated users unlock governance
- **No Breaking Changes**: Existing authenticated flow unchanged
- **Test Alignment**: Matches Playwright test expectations

## File Changes

### 1. AppRoute.tsx (MODIFY) - src/routes/AppRoute.tsx

**Current imports (lines 18-20):**
```typescript
import PublicStatsStrip from '../components/PublicStatsStrip';
import PublicActivityFeed from '../components/PublicActivityFeed';
import TreasuryShowcase from '../components/TreasuryShowcase';
```
✅ Already imported, just need to use them

**PSEUDOCODE for main content section (replace lines 244-257):**
```typescript
// PSEUDOCODE
<main className="container mx-auto px-4 py-8">
  {isAuthenticated ? (
    // AUTHENTICATED USER PATH
    shouldShowKongLockerSetup ? (
      <div className="max-w-2xl mx-auto">
        <KongLockerSetup
          identity={identity}
          onComplete={handleKongLockerComplete}
        />
      </div>
    ) : (
      <TokenTabs identity={identity} />
    )
  ) : (
    // ANONYMOUS USER PATH - Show public dashboard
    <div className="space-y-8">
      {/* Stats overview */}
      <section>
        <PublicStatsStrip />
      </section>

      {/* Active proposals feed */}
      <section>
        <PublicActivityFeed />
      </section>

      {/* Treasury showcase */}
      <section>
        <TreasuryShowcase />
      </section>

      {/* CTA for anonymous users */}
      <section className="text-center py-8 border-t border-executive-gold/20">
        <h2 className="text-2xl font-display text-executive-ivory mb-4">
          Join the Governance
        </h2>
        <p className="text-executive-lightGray/70 mb-6">
          Connect your Internet Identity to participate in proposals and treasury management
        </p>
        <Button
          className="bg-executive-gold text-executive-charcoal hover:bg-executive-goldLight font-serif"
          onClick={handleLogin}
        >
          Connect with Internet Identity
        </Button>
      </section>
    </div>
  )}
</main>
```

### 2. PublicActivityFeed.tsx (VERIFY) - src/components/PublicActivityFeed.tsx

**Purpose**: Display active proposals for anonymous users

**Expected data-testid attributes** (for Playwright):
- `[data-testid="proposal-item"]` - Individual proposal cards
- `[data-testid="proposal-title"]` - Proposal title
- `[data-testid="proposal-status"]` - Active/Pending status

**PSEUDOCODE (expected structure):**
```typescript
// PSEUDOCODE
const PublicActivityFeed: React.FC = () => {
  const proposals = useSelector((state: RootState) => state.dao.publicDashboard.proposals);
  const isLoading = useSelector((state: RootState) => state.dao.publicDashboard.isLoading);

  if (isLoading && proposals.length === 0) {
    return <Skeleton />; // Loading state
  }

  if (proposals.length === 0) {
    return <EmptyState message="No active proposals" />;
  }

  return (
    <div>
      <h2>Active Proposals</h2>
      {proposals.map(proposal => (
        <Card key={proposal.id} data-testid="proposal-item">
          <h3 data-testid="proposal-title">{proposal.title}</h3>
          <Badge data-testid="proposal-status">{proposal.status}</Badge>
        </Card>
      ))}
    </div>
  );
};
```

**Action**: READ the file, ADD data-testid attributes if missing

### 3. TreasuryShowcase.tsx (VERIFY) - src/components/TreasuryShowcase.tsx

**Purpose**: Display linked token treasuries for anonymous users

**Expected data-testid attributes** (for Playwright):
- `[data-testid="treasury-item"]` - Individual treasury cards
- `[data-testid="treasury-token"]` - Token symbol/name

**PSEUDOCODE (expected structure):**
```typescript
// PSEUDOCODE
const TreasuryShowcase: React.FC = () => {
  const treasuries = useSelector((state: RootState) => state.dao.publicDashboard.treasuries);
  const isLoading = useSelector((state: RootState) => state.dao.publicDashboard.isLoading);

  if (isLoading && treasuries.length === 0) {
    return <Skeleton />;
  }

  if (treasuries.length === 0) {
    return <EmptyState message="No treasuries found" />;
  }

  return (
    <div>
      <h2>Token Treasuries</h2>
      {treasuries.map(treasury => (
        <Card key={treasury.tokenId} data-testid="treasury-item">
          <h3 data-testid="treasury-token">{treasury.tokenId}</h3>
          <p>Station: {treasury.stationId}</p>
        </Card>
      ))}
    </div>
  );
};
```

**Action**: READ the file, ADD data-testid attributes if missing

### 4. PublicStatsStrip.tsx (VERIFY) - src/components/PublicStatsStrip.tsx

**Status**: ✅ Already has correct data-testid attributes
- Line 30: `data-testid="stat-card"`
- Line 35: `data-testid="stats-loading"`
- Line 37: `data-testid="stat-value"`

**Action**: NO CHANGES NEEDED (already correct)

## Testing Requirements

### Pre-Deploy Checklist
- [ ] Verify isolation: `git rev-parse --show-toplevel` != `/home/theseus/alexandria/daopad`
- [ ] Frontend builds: `npm run build` succeeds
- [ ] No TypeScript errors: `npm run type-check` (if available)

### Deploy → Test → Iterate Cycle

#### Step 1: Deploy to IC Mainnet
```bash
cd /home/theseus/alexandria/daopad-fix-public-dashboard/src/daopad
./deploy.sh --network ic --frontend-only
```

**Why**: Playwright tests hit deployed code, not local changes

#### Step 2: Run Playwright Tests
```bash
cd daopad_frontend
npx playwright test e2e/app-route.spec.ts
```

**Expected Results**:
- ✅ Test: "should load public dashboard data within 30 seconds" - PASS
- ✅ Test: "should fetch data from all 4 backend services" - PASS
- ✅ Test: "should update Redux state with dashboard data" - PASS
- ✅ Test: "should render PublicActivityFeed with proposals" - PASS
- ✅ Test: "should render TreasuryShowcase with treasuries" - PASS

#### Step 3: Analyze Results

**If tests FAIL:**
1. Check screenshot: `test-results/app-route-failure-*.png`
2. Review console errors in test output
3. Verify Redux actions: `dao/fetchPublicDashboard/fulfilled` present?
4. Check network requests: Backend calls succeeding?
5. Form hypothesis → Fix → GOTO Step 1 (max 5 iterations)

**If tests PASS:**
1. Verify manually in browser: `https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/app`
2. Confirm skeletons disappear and real data shows
3. SUCCESS ✅ - Proceed to PR creation

### Manual Verification

**Anonymous User Flow:**
1. Open incognito browser
2. Navigate to `https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/app`
3. Verify:
   - [ ] 4 stat cards visible (participants, proposals, treasuries, voters)
   - [ ] Active proposals section shows (or "No active proposals")
   - [ ] Treasury showcase shows (or "No treasuries")
   - [ ] "Connect with Internet Identity" CTA visible
   - [ ] NO skeletons stuck loading

**Authenticated User Flow:**
1. Login with Internet Identity
2. Verify:
   - [ ] TokenTabs renders (existing behavior unchanged)
   - [ ] Public components NOT shown for authenticated users
   - [ ] Kong Locker setup prompt if needed

## Debugging Common Issues

### Issue 1: Skeletons still visible after 30s
**Diagnosis:**
```bash
# Check if fetchPublicDashboard is dispatched
# Look for Redux actions in test output:
# Should see: dao/fetchPublicDashboard/pending → fulfilled
```
**Fix**: Verify AppRoute.tsx useEffect (lines 58-108) logic

### Issue 2: "No stat cards found" in Playwright
**Diagnosis:**
- PublicStatsStrip not rendered → Check conditional in AppRoute.tsx
- Wrong data-testid → Verify PublicStatsStrip.tsx line 30
**Fix**: Ensure `!isAuthenticated` branch renders PublicStatsStrip

### Issue 3: Backend API calls not captured
**Diagnosis:**
```bash
# In test output, look for:
# === PUBLIC DASHBOARD API CALLS ===
# Should see: get_system_stats, list_active, list_all_stations, etc.
```
**Fix**: Check if fetchPublicDashboard thunk executes (daoSlice.ts)

### Issue 4: Redux actions missing
**Diagnosis:**
- `isAuthenticated` might be incorrectly `true` for anonymous users
- Check authSlice.ts initial state (should be `false`)
**Fix**: Verify auth initialization in AppRoute.tsx (lines 42-55)

## Success Criteria

### ✅ Playwright Tests Pass
All 8 tests in `e2e/app-route.spec.ts` pass after deployment:
1. should load public dashboard data within 30 seconds
2. should fetch data from all 4 backend services
3. should update Redux state with dashboard data
4. should render PublicActivityFeed with proposals
5. should render TreasuryShowcase with treasuries
6. should handle network failures gracefully
7. should poll every 30 seconds when logged out
8. (Manual test not included in spec, but verify manually)

### ✅ Three-Layer Verification
1. **Network Layer**: Backend canister calls succeed (200 status)
2. **State Layer**: Redux actions dispatch (pending → fulfilled)
3. **UI Layer**: Components render with real data (no skeletons)

### ✅ No Regressions
- Authenticated user flow unchanged
- TokenTabs still works for logged-in users
- Kong Locker setup prompt still appears when needed
- No console errors in browser

## Deployment Commands

```bash
# From worktree root
cd /home/theseus/alexandria/daopad-fix-public-dashboard/src/daopad

# Build frontend
cd daopad_frontend
npm run build
cd ..

# Deploy to IC mainnet
./deploy.sh --network ic --frontend-only

# Run Playwright tests
cd daopad_frontend
npx playwright test e2e/app-route.spec.ts --reporter=line

# If tests pass, commit and create PR (see orchestrator section above)
```

## Expected Timeline

- Research & Planning: ✅ COMPLETE
- Implementation: 30 minutes (1 file change, 2 file verifications)
- Deploy & Test: 15 minutes per iteration
- Total: 1-2 hours (assuming 2-3 deploy cycles)

## Risk Assessment

**Low Risk** - This is a UI rendering change only:
- No backend changes (Rust, Candid)
- No Redux state structure changes
- No breaking changes to existing authenticated flow
- All components already exist and work
- Just connecting existing pieces

**Rollback Plan**:
If deployed code breaks authenticated users:
1. Revert commit
2. Deploy main branch
3. Diagnose issue in worktree

## Notes for Implementer

1. **Read files first**: Don't assume component structure matches pseudocode
2. **Test incrementally**: Deploy after each change, don't batch
3. **Trust the tests**: If Playwright passes, the feature works
4. **Use artifacts**: Screenshots and logs tell you exactly what's wrong
5. **Maximum 5 iterations**: If still failing after 5 deploys, escalate to human

## References

- Playwright Testing Guide: `/home/theseus/alexandria/daopad/src/daopad/PLAYWRIGHT_TESTING_GUIDE.md`
- Test File: `daopad_frontend/e2e/app-route.spec.ts`
- Redux Slice: `daopad_frontend/src/features/dao/daoSlice.ts`
- Auth Slice: `daopad_frontend/src/features/auth/authSlice.ts`
