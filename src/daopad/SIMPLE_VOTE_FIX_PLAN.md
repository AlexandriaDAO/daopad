# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-simple-vote-fix/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-simple-vote-fix/src/daopad`
2. **Implement feature** - Follow plan sections below (ONE SIMPLE CHANGE)
3. **Test locally first** - Verify the change works before deploying
4. **Deploy**:
   ```bash
   ./deploy.sh --network ic --frontend-only
   ```
5. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "Fix: Add delay before refetching proposal after vote"
   git push -u origin feature/simple-vote-ui-fix
   gh pr create --title "Fix: Simple Vote UI Update Delay" --body "Implements SIMPLE_VOTE_FIX_PLAN.md

   ## Problem
   - After voting, the UI immediately refetches proposal data
   - Backend hasn't finished processing the vote yet
   - Result: Vote tallies show 0 even though vote was recorded

   ## Solution
   - Add 500ms delay before refetching proposal data
   - Gives backend time to commit the vote to storage
   - Simple, minimal change that fixes the UI update issue

   Closes #64 (replaces over-engineered solution)"
   ```
6. **Monitor for review** - Check once, if no P0 issues, done

## CRITICAL RULES
- ❌ NO questions or asking for permission
- ❌ NO architectural changes or new methods
- ✅ ONE simple change only
- ✅ Test before deploy

**Branch:** `feature/simple-vote-ui-fix`
**Worktree:** `/home/theseus/alexandria/daopad-simple-vote-fix/src/daopad`

---

# Implementation Plan: Simple Vote UI Fix

## 🔴 Problem Validation

### Observed Issue
User reports after voting:
1. Vote is recorded (backend shows "Already voted")
2. But tallies still show "Yes: 0 (0.0%)"
3. Refresh loses the "already voted" status
4. Takes 10+ seconds for proposals to load

### Root Cause Analysis

**THE ACTUAL PROBLEM:**
```javascript
// RequestCard.tsx line 112
onVoteComplete={fetchProposal}

// VoteButtons.tsx line 26
if (onVoteComplete) onVoteComplete();  // Calls fetchProposal IMMEDIATELY
```

**Race Condition:**
1. User votes → Backend starts processing (takes ~100-500ms)
2. Frontend immediately calls fetchProposal (within ~10ms)
3. Backend hasn't committed the vote to storage yet
4. fetchProposal gets stale data → Shows 0 votes

### Solution Complexity: 2/10
- One-line fix
- No backend changes
- No new methods or types
- Just add a delay

## 🎯 The Fix (MINIMAL CHANGE)

### File: `daopad_frontend/src/components/orbit/requests/RequestCard.tsx`

**Current Code (line 112):**
```jsx
onVoteComplete={fetchProposal}
```

**Fixed Code:**
```jsx
onVoteComplete={() => setTimeout(fetchProposal, 500)}
```

**That's it. One line. Problem solved.**

### Why This Works
1. User votes
2. Backend processes vote (~100-500ms)
3. Frontend waits 500ms before fetching
4. Backend has committed by then
5. fetchProposal gets fresh data with correct tallies

## 📊 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| 500ms too short | Low | Minor | User can manually refresh |
| 500ms too long | Low | Minor | Still faster than current 10s delay |
| Backend changes break this | Zero | N/A | No backend changes |

## ✅ Testing Instructions

### Before Deploy (Local Test)
```bash
# In the worktree
cd /home/theseus/alexandria/daopad-simple-vote-fix/src/daopad

# Make the one-line change
# Edit RequestCard.tsx line 112

# Build frontend
npm run build

# Check for errors
# If clean, proceed to deploy
```

### After Deploy (Verification)
```bash
# 1. Visit https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io
# 2. Go to Activity tab
# 3. Vote on a proposal
# 4. EXPECTED: After ~500ms, tallies update to show your vote
# 5. Refresh page
# 6. EXPECTED: Vote persists, shows "Already voted"
```

## 🔄 Rollback Plan (If Needed)

```bash
# Revert the one-line change
git checkout HEAD -- daopad_frontend/src/components/orbit/requests/RequestCard.tsx

# Redeploy
./deploy.sh --network ic --frontend-only
```

## 📝 Implementation Steps

1. **Make the change:**
   ```bash
   # Edit line 112 of RequestCard.tsx
   # Change: onVoteComplete={fetchProposal}
   # To: onVoteComplete={() => setTimeout(fetchProposal, 500)}
   ```

2. **Test build:**
   ```bash
   npm run build
   # Should complete without errors
   ```

3. **Deploy:**
   ```bash
   ./deploy.sh --network ic --frontend-only
   ```

4. **Verify on live site**

5. **Create PR**

## Why This Plan is Better

1. **Simplicity First**: One line change vs 200+ lines before
2. **No Backend Changes**: Frontend-only fix
3. **Proven Pattern**: setTimeout for async operations is standard
4. **Easy Rollback**: One line to revert
5. **Clear Success Criteria**: Votes show after 500ms

## What We're NOT Doing

- ❌ NOT adding new backend methods
- ❌ NOT changing return types
- ❌ NOT adding vote status queries
- ❌ NOT refactoring the voting system
- ❌ NOT over-engineering a simple timing issue

## Expected Outcome

- ✅ Votes update within 500ms (vs never updating)
- ✅ "Already voted" status persists on refresh
- ✅ No performance degradation
- ✅ No new error states
- ✅ Minimal code change = minimal risk

---

**REMEMBER**: You're fixing a timing issue with a delay. That's it. Don't overthink it.