# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-fix-station-linking-auth/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-fix-station-linking-auth/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes only:
     ```bash
     cd daopad_frontend
     npm run build
     cd ..
     ./deploy.sh --network ic --frontend-only
     ```
4. **Manual Verification** (MANDATORY - See Testing section)
5. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "Fix: Station linking auth uses context instead of stale Redux state"
   git push -u origin feature/fix-station-linking-auth
   gh pr create --title "Fix: Station Linking Auth Recognition" --body "Implements PLAN_FIX_STATION_LINKING_AUTH.md"
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

**Branch:** `feature/fix-station-linking-auth`
**Worktree:** `/home/theseus/alexandria/daopad-fix-station-linking-auth/src/daopad`

---

# Implementation Plan: Fix Station Linking Authentication Recognition

## Problem Statement

The station linking section in DaoRoute shows "Login to Link Station" button for authenticated users, even though their voting power is correctly displayed (proving they're authenticated).

**Root Cause:** DaoRoute reads authentication state from Redux (`useSelector(state => state.auth)`), but the actual authentication is managed by IIProvider Context. Redux state is never updated when users log in via IIProvider, causing a mismatch.

## Current State

### Authentication Architecture

The app has TWO authentication state sources:

1. **IIProvider (Context)** - Source of truth
   - Location: `daopad_frontend/src/providers/AuthProvider/IIProvider.tsx:28-115`
   - Manages actual authentication via AuthClient
   - Provides: `authClient`, `identity`, `isAuthenticated`, `isLoading`, `login`, `logout`
   - Used by: All hooks (`useVoting`, `useProposal`, etc.)

2. **Redux authSlice** - Stale/Unused
   - Location: `daopad_frontend/src/features/auth/authSlice.ts:1-63`
   - Provides: `principal`, `isAuthenticated`, `isLoading`, `error`, `isInitialized`
   - Used by: AppRoute (with manual sync), DaoRoute (WITHOUT sync)

### The Sync Problem

**AppRoute** (the main landing page) manually syncs Context → Redux:
```tsx
// AppRoute.tsx:42-55
useEffect(() => {
  if (identity) {
    const principalText = identity.getPrincipal().toString();
    dispatch(setAuthSuccess(principalText));  // Updates Redux
  } else {
    dispatch(clearAuth());
  }
}, [identity, dispatch]);
```

**DaoRoute** (DAO detail page) expects Redux to be synced but doesn't sync it:
```tsx
// DaoRoute.tsx:18-19 (PROBLEMATIC)
const { identity, isAuthenticated } = useSelector((state: any) => state.auth);  // ❌ Reads stale Redux
const { login } = useAuth();  // ✓ Gets login from Context
```

**Result:** When navigating directly to a DAO route (e.g., via URL or bookmark), Redux is not synced, so `isAuthenticated` is false even though the user is logged in.

### Files Involved

```
daopad_frontend/src/
├── routes/
│   ├── DaoRoute.tsx                          # NEEDS FIX (line 18-19)
│   └── AppRoute.tsx                          # Reference (shows manual sync pattern)
├── providers/AuthProvider/
│   └── IIProvider.tsx                        # Source of truth for auth
├── features/auth/
│   └── authSlice.ts                          # Redux state (can be deprecated)
└── hooks/
    ├── useIdentity.tsx                       # Thin wrapper around useAuth()
    ├── useVoting.ts                          # Already uses useAuth() correctly
    └── useProposal.ts                        # Already uses useAuth() correctly
```

### Bug Reproduction

1. User authenticates via Internet Identity
2. IIProvider context has `isAuthenticated = true`, `identity = <user's identity>`
3. User navigates to DAO route (e.g., `/ryjl3-tyaaa-aaaaa-aaaba-cai`)
4. DaoRoute loads, reads from Redux: `isAuthenticated = false` (never synced)
5. Voting power hook uses Context (correct), fetches VP: "35,124 VP" ✓
6. Button logic: `isAuthenticated ? 'Link Orbit Station' : 'Login to Link Station'`
7. Result: Button shows "Login to Link Station" ❌ (incorrect)

## Implementation

### Change: DaoRoute.tsx (Line 18-19)

**Location:** `daopad_frontend/src/routes/DaoRoute.tsx:18-19`

**Current (Problematic):**
```tsx
// Line 18-19
const { identity, isAuthenticated } = useSelector((state: any) => state.auth);
const { login } = useAuth();
```

**Fixed:**
```tsx
// PSEUDOCODE - Read everything from Context
const { identity, isAuthenticated, login } = useAuth();
```

**Explanation:**
- Remove Redux selector - it's stale and unreliable
- Get ALL auth state from Context (source of truth)
- This matches the pattern used by all hooks (`useVoting`, `useProposal`, etc.)
- No need to sync Redux - just read from Context directly

### Why This Works

1. **Consistency:** All hooks already use `useAuth()` from Context
2. **Direct source:** No sync lag or mismatch possible
3. **Simpler:** Removes dependency on Redux sync mechanism
4. **Future-proof:** If we deprecate Redux auth (we should), DaoRoute already ready

### Alternative Considered (Not Recommended)

We could add sync logic to DaoRoute like AppRoute does:
```tsx
// NOT RECOMMENDED
useEffect(() => {
  if (identity) {
    dispatch(setAuthSuccess(identity.getPrincipal().toString()));
  }
}, [identity]);
```

**Why NOT do this:**
- Adds complexity (two sources of truth)
- Sync can still be delayed (race conditions)
- Redux auth state serves no purpose for DaoRoute
- Better to read from Context directly (single source of truth)

## Testing

### Manual Verification Workflow (MANDATORY - Run First)

**Objective:** Verify authenticated users see "Link Orbit Station" button, not "Login to Link Station"

**Prerequisites:**
- Deployed frontend to mainnet IC (`./deploy.sh --network ic --frontend-only`)
- Authenticated with Internet Identity (have session)
- Have at least 10,000 VP in Kong Locker for some token

**Test Steps:**
1. Navigate to DAOPad home: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/app
2. Verify you're logged in (principal shown in header)
3. Find a token with no linked station (or use `ryjl3-tyaaa-aaaaa-aaaba-cai` if testing)
4. Navigate to DAO route: `https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/ryjl3-tyaaa-aaaaa-aaaba-cai`
5. Wait for voting power to load
6. **VERIFY:** Button shows "Link Orbit Station" (NOT "Login to Link Station")
7. Click button - should open dialog immediately (no re-auth prompt)
8. **VERIFY:** Dialog shows "Link Orbit Station" title and station ID input
9. Cancel dialog and verify page still works normally

**Expected Results:**
- ✅ Button text: "Link Orbit Station" (authenticated flow)
- ✅ Voting power displays: "35,124 VP" or similar
- ✅ Button click: Opens dialog immediately
- ✅ No authentication redirects or popups

**Failure Indicators:**
- ❌ Button shows "Login to Link Station"
- ❌ Button click triggers authentication popup
- ❌ Console errors related to identity or authentication
- ❌ Voting power not loading

**Console Inspection (Critical):**
```bash
# Open browser console and check for errors
# Look for these patterns (all are bad):
- "identity is null"
- "not authenticated"
- "Cannot read property 'getPrincipal' of null"
- Any Redux-related auth errors
```

### Exit Criteria (When to Stop Iterating)

**SUCCESS** - Create PR when ALL met:
1. ✅ Manual test passes (button shows correct text)
2. ✅ No console errors during navigation
3. ✅ Dialog opens without re-authentication
4. ✅ Frontend build succeeds
5. ✅ Deployment to IC completes

**ITERATE** - Fix and redeploy if ANY:
1. ❌ Button shows wrong text
2. ❌ Console errors appear
3. ❌ Authentication popup triggered unexpectedly
4. ❌ Build or deployment fails

**ESCALATE** - After 3 failed iterations:
- Document specific error messages
- Report to human for architectural review
- Do NOT create PR if tests failing

### Playwright Testing (Not Applicable)

**Note:** Playwright tests are NOT used for this fix because:
- Authentication flows require Internet Identity (incompatible with Playwright)
- Manual verification is sufficient for UI text changes
- No complex interactions to automate

## Deployment Notes

**No backend changes** - Frontend-only fix:
```bash
cd daopad_frontend
npm run build
cd ..
./deploy.sh --network ic --frontend-only
```

**Verification after deploy:**
- Clear browser cache/storage (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
- Re-authenticate with Internet Identity
- Navigate to DAO route and verify button text

## Success Metrics

1. **User Experience:** Authenticated users see correct button text immediately
2. **Code Quality:** Single source of truth for auth (Context, not Redux)
3. **Maintainability:** Matches pattern used by all hooks
4. **Bug Rate:** Eliminates class of sync-related auth bugs

## Future Cleanup (Not in This PR)

The Redux `authSlice` is now largely unused and could be deprecated:
- AppRoute still syncs Context → Redux (for balance display)
- Consider refactoring balance to use Context too
- Then remove Redux auth entirely

This plan does NOT include that cleanup - focus on minimal fix for station linking only.
