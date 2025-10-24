# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-voting-power-display/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-voting-power-display/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes:
     ```bash
     cd daopad_frontend
     npm run build
     cd ..
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Feature]: Display voting power in treasury tab

- Fetch user voting power in DaoRoute
- Pass voting power through Outlet context to DaoTreasury
- Add visual indicators for transfer permission requirements
- Show VP status and requirements in AccountsTable

Fixes #[issue-number] (if applicable)"
   git push -u origin feature/voting-power-display
   gh pr create --title "[Feature]: Display Voting Power in Treasury Tab" --body "## Summary

This PR fixes the missing voting power display in the Treasury tab. Previously, voting power was hardcoded to 0, preventing users from:
- Seeing their governance rights
- Understanding why transfer buttons are disabled
- Knowing if they meet the 10,000 VP threshold for proposals

## Changes

### Backend (None)
No backend changes required - uses existing \`get_my_voting_power_for_token\` API.

### Frontend

**DaoRoute.tsx** - Fetch voting power on page load
- Added voting power fetching for authenticated users
- Included voting power in Outlet context
- Handles loading and error states

**DaoTreasury.tsx** - Display voting power
- Receives voting power from context
- Passes actual voting power to AccountsTable
- Added VP badge showing current power

**AccountsTable.tsx** - Show transfer requirements
- Enhanced transfer button tooltip
- Shows why button is disabled (not authenticated vs insufficient VP)
- Displays VP requirements (10,000 VP minimum)

## Testing

Deployed to mainnet: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io

### Manual Testing
1. ✅ Login with Internet Identity
2. ✅ Navigate to Treasury tab
3. ✅ VP badge displays correctly (e.g., \"25,000 VP\")
4. ✅ Transfer button enabled if VP >= 10,000
5. ✅ Tooltip explains requirements when disabled

### Anonymous Users
1. ✅ Transfer button disabled (no identity)
2. ✅ Tooltip says \"Login required\"

## Screenshots
[Will be added after deployment]

Implements VOTING_POWER_DISPLAY_PLAN.md"
   ```
5. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view --json comments,reviews`
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

**Branch:** `feature/voting-power-display`
**Worktree:** `/home/theseus/alexandria/daopad-voting-power-display/src/daopad`

---

# Implementation Plan: Display Voting Power in Treasury Tab & Header

## Problem Statement

**Current Issue:** Voting power is hardcoded to `0` in DaoTreasury.tsx:31, and not displayed in DaoLayout header, preventing users from:
1. Seeing their governance rights (voting power from locked LP tokens)
2. Understanding why transfer buttons are disabled
3. Knowing if they meet the 10,000 VP threshold required for proposals

**Root Cause:**
- DaoRoute doesn't use the existing `useVoting` hook
- DaoLayout header doesn't display voting power (should show in page header)
- DaoTreasury receives hardcoded `0` instead of context value

**Existing Infrastructure:** ✅ `useVoting` hook already exists and works (used in Activity tab)

## Current State

### File Tree
```
daopad_frontend/src/
├── routes/
│   ├── DaoRoute.tsx                    # MODIFY - Use useVoting hook
│   └── dao/
│       └── DaoTreasury.tsx             # MODIFY - Pass VP from context to AccountsTable
├── components/
│   ├── dao/
│   │   └── DaoLayout.tsx               # MODIFY - Display VP in header
│   └── tables/
│       └── AccountsTable.tsx           # MODIFY - Show VP requirements
└── hooks/
    └── useVoting.ts                    # EXISTING - Already fetches VP correctly!
```

### Existing Code Analysis

#### DaoRoute.tsx (lines 1-128)
```typescript
// LINE 11: Has identity from Redux
const { identity, isAuthenticated } = useSelector((state: any) => state.auth);

// LINE 124: Provides context to children via Outlet
<Outlet context={{ token, orbitStation, overviewStats, identity, isAuthenticated }} />
```
**Problem:** Voting power NOT fetched or included in context.

#### DaoTreasury.tsx (lines 1-42)
```typescript
// LINE 9: Receives context from DaoRoute
const { token, orbitStation, identity, isAuthenticated } = useOutletContext<any>();

// LINE 31: HARDCODED TO 0 (the bug!)
<AccountsTable
  stationId={orbitStation.station_id}
  identity={identity}
  tokenId={token.canister_id}
  tokenSymbol={token.symbol}
  votingPower={0}  // ❌ BUG: Should be actual voting power
/>
```

#### AccountsTable.tsx (lines 22, 418, 523)
```typescript
// LINE 22: Receives votingPower prop
export default function AccountsTable({ stationId, identity, tokenId, tokenSymbol, votingPower }) {

// LINE 418: Transfer button disabled without identity
disabled={!identity}

// LINE 523: Passes votingPower to TransferRequestDialog
<TransferRequestDialog
  // ...
  votingPower={votingPower}
/>
```

#### useVoting.ts (lines 1-144) - EXISTING HOOK
```typescript
// EXISTING HOOK - Already fetches VP correctly!
export function useVoting(tokenId) {
  const { identity } = useAuth();
  const [userVotingPower, setUserVotingPower] = useState(0);

  const fetchVotingPower = useCallback(async () => {
    if (!identity || !tokenId) return;
    const kongService = getKongLockerService(identity);
    const result = await kongService.getVotingPower(tokenId);
    if (result.success) {
      setUserVotingPower(Number(result.data));
    }
  }, [identity, tokenId]);

  useEffect(() => {
    fetchVotingPower();
  }, [fetchVotingPower]);

  return { vote, voting, userVotingPower, fetchVotingPower, loadingVP };
}
```
**Status:** ✅ Working correctly in Activity tab - just need to use it in DaoRoute!

## Implementation Plan

### 1. DaoRoute.tsx - Use Existing useVoting Hook

**Location:** `daopad_frontend/src/routes/DaoRoute.tsx`

**Changes:**
```typescript
// PSEUDOCODE

// ADD import at top (line ~5)
import { useVoting } from '../hooks/useVoting';

// ADD useVoting hook after other hooks (line ~11)
// Use the EXISTING hook instead of duplicating fetch logic
const { userVotingPower, loadingVP } = useVoting(tokenId);

// MODIFY Outlet context to include votingPower (line 124)
<Outlet context={{
  token,
  orbitStation,
  overviewStats,
  identity,
  isAuthenticated,
  votingPower: userVotingPower,     // ADD - from useVoting hook
  loadingVotingPower: loadingVP     // ADD - from useVoting hook
}} />
```

**Expected Result:**
- Voting power automatically fetched via existing hook
- No duplicated fetching logic
- Available in context for all child routes

### 2. DaoLayout.tsx - Display Voting Power in Header

**Location:** `daopad_frontend/src/components/dao/DaoLayout.tsx`

**Changes:**
```typescript
// PSEUDOCODE

// MODIFY component signature to accept votingPower (line 5-9)
interface DaoLayoutProps {
  token: any;
  orbitStation: any;
  votingPower?: number;        // ADD
  loadingVotingPower?: boolean; // ADD
  children: React.ReactNode;
}

export default function DaoLayout({
  token,
  orbitStation,
  votingPower = 0,              // ADD with default
  loadingVotingPower = false,   // ADD with default
  children
}: DaoLayoutProps) {

// ADD VP display in header (after line 44, before closing </div>)
{orbitStation && (
  <>
    <p className="text-xs text-green-600 mt-1">
      ✓ Treasury Station: {orbitStation.station_id}
    </p>
    {/* ADD: Voting Power Badge */}
    {votingPower > 0 && (
      <div className="mt-2">
        <Badge variant={votingPower >= 10000 ? "default" : "secondary"}>
          {loadingVotingPower ? (
            "Loading VP..."
          ) : (
            `${votingPower.toLocaleString()} VP${votingPower >= 10000 ? " ✓" : ""}`
          )}
        </Badge>
      </div>
    )}
  </>
)}
```

**Expected Result:**
- VP badge visible in page header across all tabs
- Consistent display of voting power throughout DAO pages

### 3. DaoRoute.tsx - Pass VP to DaoLayout

**Location:** `daopad_frontend/src/routes/DaoRoute.tsx`

**Changes:**
```typescript
// PSEUDOCODE

// MODIFY DaoLayout call to pass votingPower (line 123)
<DaoLayout
  token={token}
  orbitStation={orbitStation}
  votingPower={userVotingPower}     // ADD
  loadingVotingPower={loadingVP}    // ADD
>
  <Outlet context={{ token, orbitStation, overviewStats, identity, isAuthenticated, votingPower: userVotingPower, loadingVotingPower: loadingVP }} />
</DaoLayout>
```

**Expected Result:**
- VP displayed in header on all DAO pages (not just Treasury)

### 4. DaoTreasury.tsx - Use VP from Context

**Location:** `daopad_frontend/src/routes/dao/DaoTreasury.tsx`

**Changes:**
```typescript
// PSEUDOCODE

// MODIFY useOutletContext to include votingPower (line 9)
const {
  token,
  orbitStation,
  identity,
  isAuthenticated,
  votingPower = 0,           // ADD with default
  loadingVotingPower = false  // ADD with default
} = useOutletContext<any>();

// MODIFY AccountsTable to pass actual votingPower (line 26-32)
<AccountsTable
  stationId={orbitStation.station_id}
  identity={identity}
  tokenId={token.canister_id}
  tokenSymbol={token.symbol}
  votingPower={votingPower}  // CHANGE from 0 to votingPower
/>
```

**Expected Result:**
- Actual voting power passed to AccountsTable
- Transfer button logic uses real VP

### 5. AccountsTable.tsx - Enhanced Transfer Button Feedback

**Location:** `daopad_frontend/src/components/tables/AccountsTable.tsx`

**Changes:**
```typescript
// PSEUDOCODE

// MODIFY transfer button (lines 411-423) to add tooltip
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// In the render (around line 410)
<TableCell className="text-right">
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleTransfer(account);
          }}
          disabled={!identity}
        >
          <ArrowUpRight className="w-4 h-4 mr-2" />
          Transfer
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {!identity ? (
          <p>Login with Internet Identity to create transfer proposals</p>
        ) : votingPower < 10000 ? (
          <p>
            Need {(10000 - votingPower).toLocaleString()} more VP to propose transfers
            <br />
            <span className="text-xs text-muted-foreground">
              Current: {votingPower.toLocaleString()} VP / Required: 10,000 VP
            </span>
          </p>
        ) : (
          <p>Create a transfer proposal (requires community vote)</p>
        )}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</TableCell>
```

**Expected Result:**
- Tooltip explains why button is disabled
- Shows exact VP deficit if insufficient
- Provides clear next steps for users

## Testing Requirements

### Build & Deploy
```bash
# In worktree: /home/theseus/alexandria/daopad-voting-power-display/src/daopad

# Build frontend
cd daopad_frontend
npm run build
cd ..

# Deploy to mainnet (MANDATORY - no local testing)
./deploy.sh --network ic --frontend-only

# Frontend URL: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
```

### Manual Verification Workflow

**CRITICAL:** Test on deployed mainnet code. Follow this exact sequence:

#### Test 1: Anonymous User (No VP)
```bash
# 1. Open browser to https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
# 2. Navigate to any DAO Treasury tab (e.g., /dao/[token-id]/treasury)
# 3. Verify:
#    - No VP badge visible (not authenticated)
#    - Transfer button disabled
#    - Hover tooltip says "Login with Internet Identity to create transfer proposals"
```

#### Test 2: Authenticated User with Insufficient VP (<10,000)
```bash
# 1. Login with Internet Identity
# 2. Navigate to Treasury tab
# 3. Verify:
#    - VP badge visible showing actual VP (e.g., "2,500 VP ⚠️ Need 10,000 VP to propose")
#    - Transfer button disabled
#    - Hover tooltip shows deficit: "Need 7,500 more VP to propose transfers"
```

#### Test 3: Authenticated User with Sufficient VP (>=10,000)
```bash
# 1. Login with Internet Identity (account with >=10,000 VP)
# 2. Navigate to Treasury tab
# 3. Verify:
#    - VP badge shows "25,000 VP ✓ Can propose transfers" (or actual amount)
#    - Transfer button ENABLED
#    - Hover tooltip says "Create a transfer proposal (requires community vote)"
#    - Clicking button opens TransferRequestDialog
```

### Console Error Inspection
```bash
# In browser DevTools Console, check for:

# Expected logs (success):
[DaoRoute] Voting power loaded: 25000

# Check for errors (should be none):
grep "Failed to fetch voting power" console.log  # Should be empty
grep "get_my_voting_power_for_token" console.log  # Should show successful calls
```

### Exit Criteria
**When to stop iterating:**
1. ✅ VP badge displays correctly for authenticated users
2. ✅ Transfer button enable/disable logic works based on identity + VP
3. ✅ Tooltips show correct messages for all 3 scenarios
4. ✅ No console errors related to voting power fetching
5. ✅ VP updates when user switches between tokens (if applicable)

## Edge Cases

### 1. Voting Power Fetch Fails
```typescript
// If tokenService.getMyVotingPowerForToken() fails:
// - Set votingPower to 0 (safe default)
// - Log error to console
// - Badge shows "0 VP ⚠️ Need 10,000 VP to propose"
// - User sees clear feedback about insufficient VP
```

### 2. User Switches Tokens
```typescript
// DaoRoute useEffect dependencies include tokenId
// - Voting power automatically refetches when tokenId changes
// - VP badge updates to show new token's voting power
```

### 3. BigInt Conversion
```typescript
// Backend returns nat64 as BigInt
// - Convert to number: typeof data === 'bigint' ? Number(data) : data
// - Safe for voting power values (won't exceed Number.MAX_SAFE_INTEGER)
```

## Files Modified Summary

1. **DaoRoute.tsx** (~5 lines added)
   - Import and use existing `useVoting` hook
   - Pass VP to DaoLayout props
   - Include in Outlet context

2. **DaoLayout.tsx** (~12 lines added)
   - Add votingPower props
   - Display VP badge in header

3. **DaoTreasury.tsx** (~3 lines changed)
   - Receive votingPower from context
   - Pass actual VP to AccountsTable (change from 0)

4. **AccountsTable.tsx** (~20 lines added)
   - Import Tooltip component
   - Wrap transfer button with tooltip
   - Show VP-specific messages

**Total LOC:** ~40 lines added (all frontend)
**Backend Changes:** None (uses existing useVoting hook)
**Key Optimization:** No duplicate VP fetching logic - reuses existing hook!

## Success Metrics

- ✅ Users can see their voting power in Treasury tab
- ✅ Transfer button behavior is transparent and documented
- ✅ Clear path to obtain required VP (lock LP tokens)
- ✅ No breaking changes to existing functionality
- ✅ Zero backend changes required

## Rollback Plan

If issues arise:
1. Revert to `master` branch (voting power just shows as 0 again)
2. No data corruption risk (read-only operation)
3. No backend dependency changes
