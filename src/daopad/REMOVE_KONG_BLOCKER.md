# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-remove-kong-blocker/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-remove-kong-blocker/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes only:
     ```bash
     cd daopad_frontend
     npm run build
     cd ..
     ./deploy.sh --network ic --frontend-only
     ```
4. **Test manually in browser**:
   - Open https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
   - Check console for errors (F12)
   - Verify dashboard loads immediately for authenticated users
   - Verify Kong Locker badge still shows when connected
   - Test both authenticated and anonymous views
5. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "Remove Kong Locker blocker - Allow dashboard access without lock requirement"
   git push -u origin feature/remove-kong-locker-blocker
   gh pr create --title "Remove: Kong Locker Connection Blocker" --body "$(cat <<'EOF'
## Summary

Removes the Kong Locker connection requirement that blocks users from viewing the dashboard. Users can now browse all DAOs and treasuries without locking LP tokens.

## Changes

**AppRoute.tsx:**
- ✅ Removed `shouldShowKongLockerSetup` blocking logic
- ✅ Always show TreasuryShowcase and PublicStatsStrip (authenticated or not)
- ✅ Kept Kong Locker badge (shows when connected, hidden when not)

**DaoOverview.tsx:**
- ✅ Removed "Connect your Kong Locker" blocker message
- ✅ Removed "Your Participation" card entirely (Kong Locker specific)

**KongLockerSetup.tsx:**
- ❌ File kept for future Settings page integration
- ℹ️ Component no longer blocks main dashboard

## Behavior Changes

**Before:**
- Authenticated users WITHOUT Kong Locker → Blocked with setup wizard
- Cannot view any treasuries or DAOs until lock created

**After:**
- All users (authenticated or not) → Immediate dashboard access
- Kong Locker only required for voting actions
- Setup wizard removed from blocking flow

## Testing

- ✅ Deployed to mainnet
- ✅ Anonymous users can browse all DAOs
- ✅ Authenticated users without locks can browse
- ✅ Authenticated users with locks see badge
- ✅ No console errors
- ✅ TreasuryShowcase loads correctly

## Benefits

- ✅ **Better UX** - No artificial barriers to exploration
- ✅ **Discovery first** - Users see value before committing locks
- ✅ **Kong Locker optional** - Only needed when voting
- ✅ **Cleaner code** - Removed conditional rendering complexity

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
   ```
6. **Iterate autonomously**:
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

**Branch:** `feature/remove-kong-locker-blocker`
**Worktree:** `/home/theseus/alexandria/daopad-remove-kong-blocker/src/daopad`

---

# Implementation Plan: Remove Kong Locker Connection Blocker

## Current State

### Problem
Users are blocked from viewing the DAOPad dashboard if they don't have a Kong Locker canister connected. This prevents:
- Anonymous users from browsing DAOs
- Authenticated users without locks from exploring
- Discovery and evaluation before commitment

### Blocking Logic Locations

**1. AppRoute.tsx (PRIMARY BLOCKER)**
```typescript
// Line 170: Blocking condition
const shouldShowKongLockerSetup = isAuthenticated && !kongLockerCanister && !isCheckingKongLocker;

// Lines 252-259: Conditional render
{isAuthenticated && shouldShowKongLockerSetup ? (
  // BLOCKS WITH SETUP WIZARD
  <KongLockerSetup identity={identity} onComplete={handleKongLockerComplete} />
) : (
  // NORMAL DASHBOARD
  <TreasuryShowcase onSelectStation={(stationId) => navigate(`/${stationId}`)} />
)}
```

**2. DaoOverview.tsx (SECONDARY BLOCKER)**
```typescript
// Lines 109-120: "Connect your Kong Locker" message
{isAuthenticated && (
  <Card>
    <CardHeader>
      <CardTitle>Your Participation</CardTitle>
    </CardHeader>
    <CardContent>
      <p>Connect your Kong Locker to see your voting power...</p>
    </CardContent>
  </Card>
)}
```

**3. AppRoute.tsx (DISPLAY LOGIC)**
```typescript
// Lines 224-228: Badge shows when connected
{kongLockerCanister && (
  <Badge title={`Kong Locker: ${kongLockerCanister}`}>
    🔒 Connected
  </Badge>
)}
```

### Files That Stay Unchanged
- `KongLockerSetup.tsx` - Keep for future Settings page
- `useVoting.ts` - Already handles voting without lock (shows error)
- Backend services - No backend changes needed

## Implementation

### File 1: `daopad_frontend/src/routes/AppRoute.tsx`

**REMOVE** the blocking logic entirely:

```typescript
// PSEUDOCODE - Around line 169-170
// DELETE THIS LINE:
const shouldShowKongLockerSetup = isAuthenticated && !kongLockerCanister && !isCheckingKongLocker;

// DELETE THIS FUNCTION (no longer needed):
const handleKongLockerComplete = () => {
  // Kong Locker setup completed, component will automatically refresh
};
```

**SIMPLIFY** the main render (lines 252-273):

```typescript
// PSEUDOCODE - Replace conditional with direct render
<main className="container mx-auto px-4 py-8">
  {/* DEFAULT VIEW - Same for everyone (logged in or not) */}
  <div className="space-y-8">
    {/* Stats overview */}
    <section>
      <PublicStatsStrip />
    </section>

    {/* Treasury showcase - shows ALL treasuries */}
    <section>
      <TreasuryShowcase onSelectStation={(stationId) => navigate(`/${stationId}`)} />
    </section>
  </div>
</main>
```

**REMOVE** import for KongLockerSetup:

```typescript
// PSEUDOCODE - Around line 17
// DELETE THIS LINE:
import KongLockerSetup from '../components/KongLockerSetup';
```

### File 2: `daopad_frontend/src/routes/dao/DaoOverview.tsx`

**REMOVE** the "Your Participation" card entirely:

```typescript
// PSEUDOCODE - Delete lines 108-120
// DELETE THIS ENTIRE BLOCK:
{isAuthenticated && (
  <Card className="bg-executive-darkGray border-executive-mediumGray">
    <CardHeader>
      <CardTitle className="text-executive-ivory">Your Participation</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-executive-lightGray/70">
        Connect your Kong Locker to see your voting power and participation metrics.
      </p>
    </CardContent>
  </Card>
)}
```

## Expected Results

### Before Implementation
```
User authenticates → Checks Kong Locker → NOT FOUND → Shows KongLockerSetup wizard → BLOCKED
```

### After Implementation
```
User authenticates → Sees dashboard immediately → Can browse all DAOs → Voting requires lock (handled at vote button)
```

### Badge Behavior (Unchanged)
- Kong Locker connected → Badge shows "🔒 Connected"
- Kong Locker NOT connected → No badge (clean header)

### Error Handling (Unchanged)
- User tries to vote without lock → Error: "Please register with Kong Locker in Settings first"
- Handled in `useVoting.ts` (no changes needed)

## Testing Strategy

### Manual Browser Testing (MANDATORY FIRST)

**Test Case 1: Anonymous User**
```bash
# 1. Open browser in incognito mode
# 2. Navigate to: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
# 3. Verify:
#    - Dashboard loads immediately
#    - TreasuryShowcase displays treasuries
#    - PublicStatsStrip shows stats
#    - No "Connect" prompts or blockers
#    - No console errors (F12)

# Check console:
# Open DevTools (F12) → Console tab
# Verify: No red errors, no "Kong Locker" blocking messages
```

**Test Case 2: Authenticated User WITHOUT Kong Locker**
```bash
# 1. Login with Internet Identity
# 2. Verify:
#    - Dashboard loads immediately (NOT blocked)
#    - Header shows principal + ICP balance
#    - NO Kong Locker badge visible
#    - TreasuryShowcase displays
#    - Can navigate to any DAO

# Check console:
# Verify: No errors about "shouldShowKongLockerSetup"
```

**Test Case 3: Authenticated User WITH Kong Locker**
```bash
# 1. Login with account that has Kong Locker
# 2. Verify:
#    - Dashboard loads immediately
#    - Badge shows "🔒 Connected"
#    - All functionality works
#    - Can vote on proposals

# Badge verification:
# Hover over badge → Should show full canister ID
```

**Test Case 4: Voting Without Lock**
```bash
# 1. Login WITHOUT Kong Locker
# 2. Navigate to any DAO
# 3. Try to vote on a proposal
# 4. Verify:
#    - Error displays: "Please register with Kong Locker in Settings first"
#    - Button to navigate to Settings appears
#    - User NOT blocked from viewing (only from voting)
```

### Exit Criteria

**SUCCESS** if all 4 test cases pass:
- ✅ Anonymous users see dashboard
- ✅ Authenticated users (without lock) see dashboard
- ✅ Authenticated users (with lock) see badge + full functionality
- ✅ Voting without lock shows clear error (not blocker)
- ✅ ZERO console errors

**ITERATE** if:
- ❌ Any blocker remains visible
- ❌ Console errors appear
- ❌ Badge doesn't show for users with locks
- ❌ TreasuryShowcase doesn't load

### Console Error Inspection

After each deploy, check for errors:

```bash
# In browser DevTools (F12) → Console tab
# Look for:
# ❌ RED errors with "Kong" or "shouldShowKongLockerSetup"
# ❌ Uncaught TypeErrors
# ❌ Failed API calls

# Common errors to fix:
# 1. "Cannot read property of undefined" → Check conditional logic
# 2. "X is not a function" → Check import paths
# 3. "Failed to fetch" → Network issue (retry)
```

### Iteration Loop

```typescript
// PSEUDOCODE for iteration

while (iterations < 5) {
  // 1. Deploy changes
  npm run build
  ./deploy.sh --network ic --frontend-only

  // 2. Test in browser (all 4 test cases)
  // 3. Open DevTools → Console

  if (console.errors.length > 0) {
    // Fix errors
    // Read stack trace
    // Update code
    // GOTO step 1
  }

  if (all_test_cases_pass && console.errors.length === 0) {
    console.log("✅ SUCCESS - Create PR")
    break
  }

  iterations++
}
```

## Post-Implementation

### KongLockerSetup.tsx Future
- Component still exists (not deleted)
- Can be integrated into Settings page later
- No longer blocks main dashboard flow

### User Flow Improvements
1. **Discovery Phase**: Users browse DAOs freely
2. **Engagement Phase**: User decides to participate
3. **Commitment Phase**: User creates Kong Locker lock
4. **Voting Phase**: User votes with voting power

### Backwards Compatibility
- ✅ Existing Kong Locker users: No changes (badge still works)
- ✅ Voting logic: Unchanged (still requires lock)
- ✅ Registration flow: Available in Settings (not blocking)

## Success Metrics

- Dashboard loads in <2s for all users
- Zero blocking UX for browsing
- Kong Locker optional until voting action
- Clear error messages when voting without lock

---

**Remember: This plan removes BLOCKERS, not Kong Locker functionality. Voting still requires a lock - we just don't force it upfront.**
