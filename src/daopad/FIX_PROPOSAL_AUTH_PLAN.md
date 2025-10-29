# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-fix-proposal-auth/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-fix-proposal-auth/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes:
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "Fix: Proposal Auto-Creation Requires Authentication"
   git push -u origin feature/fix-proposal-authentication
   gh pr create --title "Fix: Proposal Auto-Creation Requires Authentication" --body "Implements FIX_PROPOSAL_AUTH_PLAN.md

Fixes the bug where the Activity tab shows 'Creating proposal for community vote...' indefinitely when users aren't authenticated.

**Problem**: RequestCard attempted to auto-create proposals even when no user was logged in, showing misleading UI state.

**Solution**:
- Check authentication state before attempting proposal creation
- Show 'Log in to vote' message for unauthenticated users
- Only auto-create proposals when user is authenticated

**Files Modified**:
- daopad_frontend/src/components/orbit/requests/RequestCard.tsx
- daopad_frontend/src/hooks/useProposal.ts

**Testing**: Manual browser testing to verify authenticated and unauthenticated states display correctly."
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

**Branch:** `feature/fix-proposal-authentication`
**Worktree:** `/home/theseus/alexandria/daopad-fix-proposal-auth/src/daopad`

---

# Fix: Proposal Auto-Creation Authentication Bug

## Problem Statement

**Bug**: Activity tab shows "Creating proposal for community vote..." indefinitely when users aren't authenticated.

**Root Cause**: `RequestCard` component attempts to auto-create proposals via `ensureProposal()` even when `identity` is null. The hook silently returns when no identity exists, causing the UI to remain in a perpetual "creating" state.

**User Impact**: Confusing UX - users see "Creating proposal..." forever without any indication they need to log in.

## Current State Analysis

### Console Logs from Bug Report
```javascript
[useProposal] Raw proposal data from admin canister: Array []  // No proposal exists
[RequestCard] Proposal check: { hasProposal: false, loading: false }
[RequestCard] Creating proposal for request: 8a563141-...
[useProposal] Missing required params for ensureProposal: { hasIdentity: false }  // ❌ No identity!
```

### File: `daopad_frontend/src/hooks/useProposal.ts`

**Lines 162-171**: `ensureProposal()` function
```typescript
const ensureProposal = useCallback(async () => {
    if (!identity || !tokenId || !orbitRequestId || !operationType) {
      console.log('[useProposal] Missing required params for ensureProposal:', {
        hasIdentity: !!identity,
        tokenId,
        orbitRequestId,
        operationType
      });
      return;  // ❌ Silent failure - no feedback to UI
    }
    // ... proposal creation logic
  }, [identity, tokenId, orbitRequestId, operationType, fetchProposal]);
```

**Problem**: Returns silently when `!identity`, providing no way for UI to know why proposal creation failed.

### File: `daopad_frontend/src/components/orbit/requests/RequestCard.tsx`

**Lines 68-87**: Auto-create proposal effect
```typescript
useEffect(() => {
    const statusValue = typeof request.status === 'object' && request.status !== null
      ? Object.keys(request.status)[0]
      : request.status;

    if (!proposal && !loading && (statusValue === 'Created' || statusValue === 'Scheduled')) {
      console.log('[RequestCard] Creating proposal for request:', request.id);
      ensureProposal();  // ❌ Called without checking if user is authenticated
    }
  }, [proposal, loading, request.status, ensureProposal]);
```

**Lines 137-141**: UI rendering for non-existent proposal
```tsx
{!loading && !proposal && (
  <div className="text-sm text-muted-foreground">
    Creating proposal for community vote...  {/* ❌ Shown forever if not authenticated */}
  </div>
)}
```

**Problem**:
1. Effect doesn't check authentication before calling `ensureProposal()`
2. UI shows "Creating proposal..." when `!loading && !proposal`, regardless of authentication state

### File: `daopad_frontend/src/providers/AuthProvider/IIProvider.tsx`

**Lines 8-30**: `useAuth()` hook structure
```typescript
export function useAuth() {
  const { identity, clear, error, status } = useIdentity();
  const { login } = useInternetIdentity();

  const isAuthenticated = status === "success" && !!identity;
  const isLoading = status === "initializing" || status === "authenticating";

  return {
    identity,
    login,
    logout: clear,
    isAuthenticated,  // ✅ Available but not used in RequestCard
    isLoading,
    // ...
  };
}
```

**Available but unused**: `isAuthenticated` flag exists but isn't passed to/used by RequestCard.

## Implementation Plan

### 1. Update `useProposal` Hook

**File**: `daopad_frontend/src/hooks/useProposal.ts`

**Changes**:
1. Import `useAuth` from providers
2. Expose `isAuthenticated` state
3. Update return value to include auth state

```typescript
// PSEUDOCODE - Add at top of file
import { useAuth } from '../providers/AuthProvider/IIProvider';

export function useProposal(tokenId, orbitRequestId, operationType) {
  const { identity, isAuthenticated } = useAuth();  // Get both identity and auth status
  // ... existing state declarations

  // Keep existing logic unchanged

  return {
    proposal,
    loading,
    hasVoted,
    userVote,
    error,
    isAuthenticated,  // NEW: Expose to components
    fetchProposal,
    ensureProposal,
    checkVoteStatus
  };
}
```

**Why**: Component needs to know authentication state to decide UI rendering.

### 2. Update `RequestCard` Component

**File**: `daopad_frontend/src/components/orbit/requests/RequestCard.tsx`

**Changes**:
1. Destructure `isAuthenticated` from `useProposal`
2. Import `useAuth` for login function
3. Update auto-create effect to check authentication
4. Update UI to show appropriate message based on auth state

```typescript
// PSEUDOCODE

import { useAuth } from '@/providers/AuthProvider/IIProvider';

export function RequestCard({ request, tokenId, userVotingPower, onVote }) {
  const operationType = getOperationType(request);
  const { login } = useAuth();  // Get login function

  const {
    proposal,
    loading,
    hasVoted,
    userVote,
    isAuthenticated,  // NEW: Get auth state from hook
    ensureProposal,
    fetchProposal
  } = useProposal(tokenId, request.id, operationType);

  // MODIFY: Auto-create proposal effect (lines 68-87)
  useEffect(() => {
    const statusValue = typeof request.status === 'object' && request.status !== null
      ? Object.keys(request.status)[0]
      : request.status;

    // Only auto-create if:
    // 1. No proposal exists
    // 2. Not currently loading
    // 3. Status is Created or Scheduled
    // 4. USER IS AUTHENTICATED  // ✅ NEW CHECK
    if (!proposal &&
        !loading &&
        (statusValue === 'Created' || statusValue === 'Scheduled') &&
        isAuthenticated) {  // ✅ Add authentication check
      console.log('[RequestCard] Creating proposal for authenticated user:', request.id);
      ensureProposal();
    }
  }, [proposal, loading, request.status, isAuthenticated, ensureProposal]);  // Add isAuthenticated to deps

  // ... existing code until voting section

  // MODIFY: Voting section UI (lines 127-141)
  {(statusValue === 'Created' || statusValue === 'Scheduled') && (
    <div className="mt-4 space-y-3 border-t pt-4">
      <h4 className="font-medium text-sm">Community Vote</h4>

      {loading && (
        <div className="text-sm text-muted-foreground">
          Loading proposal...
        </div>
      )}

      {/* NEW: Show login prompt if not authenticated */}
      {!loading && !isAuthenticated && (
        <div className="text-sm space-y-2">
          <p className="text-muted-foreground">
            Log in to vote on this request
          </p>
          <button
            onClick={login}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
          >
            Log In to Vote
          </button>
        </div>
      )}

      {/* MODIFY: Only show "creating" if authenticated */}
      {!loading && !proposal && isAuthenticated && (
        <div className="text-sm text-muted-foreground">
          Creating proposal for community vote...
        </div>
      )}

      {/* Existing proposal display - unchanged */}
      {proposal && (
        <>
          <VoteProgressBar proposal={proposal} threshold={50} />
          <VoteButtons
            proposalId={Number(proposal.id)}
            orbitRequestId={request.id}
            tokenId={tokenId}
            onVote={onVote}
            userVotingPower={userVotingPower}
            hasVoted={hasVoted}
            userVote={userVote}
            disabled={proposal.status && Object.keys(proposal.status)[0] !== 'Active'}
            onVoteComplete={fetchProposal}
          />
        </>
      )}
    </div>
  )}
}
```

**Key Changes**:
1. **Line 62**: Destructure `isAuthenticated` from `useProposal`
2. **Line 83**: Add `isAuthenticated` check to auto-create condition
3. **Lines 137-149**: NEW UI state for unauthenticated users
4. **Lines 151-155**: MODIFY "creating" message to only show when authenticated

## State Flow Diagram

### Before Fix (Broken)
```
User visits Activity tab (not logged in)
  ↓
RequestCard mounts
  ↓
useProposal checks for proposal → None found
  ↓
useEffect triggers: !proposal && !loading → calls ensureProposal()
  ↓
ensureProposal checks: !identity → silent return
  ↓
UI renders: "Creating proposal for community vote..." (forever)
```

### After Fix (Correct)
```
User visits Activity tab (not logged in)
  ↓
RequestCard mounts
  ↓
useProposal checks for proposal → None found
  ↓
useEffect checks: !proposal && !loading && !isAuthenticated → NO ACTION
  ↓
UI renders: "Log in to vote on this request" + [Log In to Vote] button
  ↓
User clicks "Log In to Vote"
  ↓
After authentication: isAuthenticated = true
  ↓
useEffect triggers: !proposal && !loading && isAuthenticated → calls ensureProposal()
  ↓
ensureProposal creates proposal successfully
  ↓
UI updates to show voting interface
```

## Testing Plan

### Manual Testing Workflow

**Environment**: Production mainnet (https://daopad.org)

#### Test Case 1: Unauthenticated User
```bash
# 1. Deploy changes
cd /home/theseus/alexandria/daopad-fix-proposal-auth/src/daopad
./deploy.sh --network ic --frontend-only

# 2. Open browser (incognito mode to ensure not logged in)
# Navigate to: https://daopad.org/fec7w-zyaaa-aaaaa-qaffq-cai/activity

# Expected behavior:
# - Request card displays
# - Shows: "Log in to vote on this request"
# - Shows: [Log In to Vote] button
# - Does NOT show: "Creating proposal for community vote..."

# 3. Check console (F12)
# Expected logs:
# - [useProposal] Raw proposal data: []
# - [RequestCard] Proposal check: { hasProposal: false, loading: false }
# - NO log: "[RequestCard] Creating proposal for request..."
# - NO log: "[useProposal] Missing required params..."
```

#### Test Case 2: Authenticated User (No Proposal)
```bash
# 1. Click "Log In to Vote" button
# 2. Complete Internet Identity authentication

# Expected behavior:
# - After login redirect back to Activity tab
# - Briefly shows: "Creating proposal for community vote..."
# - Then shows: Voting interface with progress bar and Yes/No buttons

# 3. Check console (F12)
# Expected logs:
# - [RequestCard] Creating proposal for authenticated user: <request-id>
# - [useProposal] Creating proposal for: { tokenId, orbitRequestId, operationType }
# - [useProposal] Proposal created: <result>
# - [useProposal] Raw proposal data: [{ id: ..., yes_votes: 0, ... }]
```

#### Test Case 3: Authenticated User (Proposal Exists)
```bash
# 1. Navigate to Activity tab while already logged in with existing proposal

# Expected behavior:
# - No loading delay
# - Immediately shows voting interface
# - No "Creating proposal..." message

# 2. Check console (F12)
# Expected logs:
# - [useProposal] Raw proposal data: [{ id: ..., ... }]
# - NO log: "[RequestCard] Creating proposal..."
```

### Exit Criteria

✅ **Pass**: All three test cases behave as expected
✅ **Pass**: No console errors related to proposal creation
✅ **Pass**: Login flow works seamlessly from Activity tab
❌ **Fail**: If "Creating proposal..." shows when not authenticated
❌ **Fail**: If authenticated users don't see voting interface
❌ **Fail**: If login button doesn't appear for unauthenticated users

### Iteration Protocol

If tests fail:
1. Check browser console for specific errors
2. Verify authentication state with: `console.log('[Test] isAuthenticated:', isAuthenticated)`
3. Check proposal data with: `console.log('[Test] proposal:', proposal)`
4. Fix identified issue
5. Redeploy: `./deploy.sh --network ic --frontend-only`
6. Retest from step 1

**Maximum iterations**: 3
**If still failing after 3 iterations**: Escalate with detailed error logs

## Files Modified

### Primary Changes
- `daopad_frontend/src/hooks/useProposal.ts` (lines 1, 70, 206-215)
- `daopad_frontend/src/components/orbit/requests/RequestCard.tsx` (lines 1, 62, 83, 131-165)

### No Backend Changes Required
This is purely a frontend UX fix - no Rust or Candid changes needed.

## Deployment Commands

```bash
# From worktree: /home/theseus/alexandria/daopad-fix-proposal-auth/src/daopad

# Build frontend
npm run build

# Deploy frontend only (no backend changes)
./deploy.sh --network ic --frontend-only

# Verify deployment
# Visit: https://daopad.org/fec7w-zyaaa-aaaaa-qaffq-cai/activity
```

## Success Metrics

1. **Zero console errors** related to proposal creation
2. **Clear UX for unauthenticated users**: "Log in to vote" message + button
3. **Seamless flow for authenticated users**: Auto-create proposal → show voting
4. **No infinite "Creating proposal..."** state
5. **Login button redirects correctly** back to Activity tab after auth

## Risk Assessment

**Risk**: Low - Frontend-only change, no data model or backend impact

**Rollback**: If issues arise, revert commit and redeploy frontend

**Side Effects**: None - only affects RequestCard rendering logic

## Related Code References

- Authentication provider: `daopad_frontend/src/providers/AuthProvider/IIProvider.tsx:8-30`
- Proposal service: `daopad_frontend/src/services/backend.ts` (getProposalService)
- Admin canister interface: `daopad_frontend/src/declarations/admin/` (auto-generated)

---

## Implementation Checklist

- [ ] Verify in worktree: `/home/theseus/alexandria/daopad-fix-proposal-auth/src/daopad`
- [ ] Update `useProposal.ts`: Import useAuth, expose isAuthenticated
- [ ] Update `RequestCard.tsx`: Import login, destructure isAuthenticated
- [ ] Update auto-create effect: Add isAuthenticated check
- [ ] Update UI rendering: Add login prompt, conditionally show "creating"
- [ ] Build frontend: `npm run build`
- [ ] Deploy to mainnet: `./deploy.sh --network ic --frontend-only`
- [ ] Test Case 1: Verify unauthenticated UI
- [ ] Test Case 2: Verify authenticated auto-creation
- [ ] Test Case 3: Verify existing proposals load
- [ ] Commit changes with descriptive message
- [ ] Push to feature branch
- [ ] Create PR with full description
- [ ] Monitor PR for review feedback
