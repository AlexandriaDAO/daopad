# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-ckusdt-refresh-button/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-ckusdt-refresh-button/src/daopad`
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
   git commit -m "Add refresh button to ckUSDT balance card

Matches ICP balance card UX. Both balances now have refresh buttons."
   git push -u origin feature/ckusdt-refresh-button
   gh pr create --title "Feature: Add Refresh Button to ckUSDT Balance" --body "Implements CKUSDT_REFRESH_BUTTON_PLAN.md

## Summary
- Adds refresh button to ckUSDT balance card
- Matches existing ICP balance card UX
- Uses same loadCanisterBalances function (already refreshes both)
- Consistent UI across balance cards

## Changes
- Modified InvoicesPage.tsx to add refresh button to ckUSDT card
- Button uses existing loading state and refresh handler

## Testing
- Deployed to mainnet (IC)
- Verified both balance cards have refresh buttons
- Confirmed clicking either button refreshes both balances"
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

**Branch:** `feature/ckusdt-refresh-button`
**Worktree:** `/home/theseus/alexandria/daopad-ckusdt-refresh-button/src/daopad`

---

# Implementation Plan: Add Refresh Button to ckUSDT Balance

## Current State Documentation

### Problem Statement
The ICP balance card has a refresh button, but the ckUSDT balance card does not. This creates an inconsistent UX where users can only manually refresh one of the two balances, even though clicking the ICP refresh button actually refreshes both (via `loadCanisterBalances` function).

### Existing Infrastructure

**File:** `daopad_frontend/src/pages/InvoicesPage.tsx`

**Line 29-61: `loadCanisterBalances` function**
- ✅ Already loads BOTH ICP and ckUSDT balances
- Used by ICP refresh button
- NOT exposed on ckUSDT card

**Line 113-135: ICP Balance Card**
```tsx
<CardTitle className="flex items-center justify-between text-executive-ivory text-lg">
  <div className="flex items-center gap-2">
    <Wallet className="h-5 w-5 text-executive-gold" />
    ICP Balance
  </div>
  <Button
    onClick={loadCanisterBalances}
    variant="ghost"
    size="sm"
    className="h-8 w-8 p-0 text-executive-lightGray hover:text-executive-ivory hover:bg-executive-mediumGray/30"
    disabled={isLoadingBalance}
  >
    <RefreshCw className={`h-4 w-4 ${isLoadingBalance ? 'animate-spin' : ''}`} />
  </Button>
</CardTitle>
```

**Line 137-148: ckUSDT Balance Card**
```tsx
<CardTitle className="flex items-center gap-2 text-executive-ivory text-lg">
  <Wallet className="h-5 w-5 text-executive-gold" />
  ckUSDT Balance
</CardTitle>
```
**❌ No refresh button!**

### File Tree

```
daopad_frontend/src/pages/
└── InvoicesPage.tsx  [MODIFY] Add refresh button to ckUSDT card
```

## Implementation

### Frontend: InvoicesPage.tsx (MODIFY)

**Location:** `daopad_frontend/src/pages/InvoicesPage.tsx:137-148`

**Replace the ckUSDT Balance Card header** (lines 138-143):

```tsx
// PSEUDOCODE
// OLD:
<CardTitle className="flex items-center gap-2 text-executive-ivory text-lg">
  <Wallet className="h-5 w-5 text-executive-gold" />
  ckUSDT Balance
</CardTitle>

// NEW: Match ICP card structure with refresh button
<CardTitle className="flex items-center justify-between text-executive-ivory text-lg">
  <div className="flex items-center gap-2">
    <Wallet className="h-5 w-5 text-executive-gold" />
    ckUSDT Balance
  </div>
  <Button
    onClick={loadCanisterBalances}
    variant="ghost"
    size="sm"
    className="h-8 w-8 p-0 text-executive-lightGray hover:text-executive-ivory hover:bg-executive-mediumGray/30"
    disabled={isLoadingBalance}
  >
    <RefreshCw className={`h-4 w-4 ${isLoadingBalance ? 'animate-spin' : ''}`} />
  </Button>
</CardTitle>
```

**That's it!** This is the only change needed.

### Why This Works

1. **Function Already Exists**: `loadCanisterBalances` refreshes both ICP and ckUSDT
2. **Loading State Shared**: `isLoadingBalance` state is already used by ICP button
3. **Icon Already Imported**: `RefreshCw` from lucide-react is imported at line 4
4. **Consistent UX**: Matches ICP card exactly

## Testing Strategy

### Manual Verification Workflow

**Prerequisites:**
```bash
# Ensure you're in worktree
cd /home/theseus/alexandria/daopad-ckusdt-refresh-button/src/daopad

# Deploy frontend
cd daopad_frontend
npm run build
cd ..
./deploy.sh --network ic --frontend-only
```

**Test Procedure:**

1. **Navigate to Invoices Tab**
   - Open: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
   - Click on any DAO
   - Go to Invoices tab

2. **Verify Initial State**
   - See three cards: Backend Canister, ICP Balance, ckUSDT Balance
   - ICP card has refresh button (top right)
   - ckUSDT card NOW has refresh button (top right)
   - Both buttons should look identical

3. **Test ICP Refresh Button**
   - Click ICP refresh button
   - Should see spinning animation on BOTH buttons
   - Both balances should update

4. **Test ckUSDT Refresh Button**
   - Click ckUSDT refresh button
   - Should see spinning animation on BOTH buttons
   - Both balances should update

5. **Verify Behavior**
   ```
   EXPECTED:
   - Both buttons trigger same function
   - Both buttons spin during loading
   - Both buttons disabled during loading
   - Both balances update together
   - UI consistent between cards

   UNACCEPTABLE:
   - Only one button works
   - Buttons don't look the same
   - Loading states don't sync
   - Console errors
   ```

### Exit Criteria

**Definition of Done:**
- ✅ ckUSDT card has refresh button
- ✅ Button looks identical to ICP button
- ✅ Clicking either button refreshes both balances
- ✅ Loading states sync between both buttons
- ✅ No console errors
- ✅ Deployed to mainnet successfully

**When to Stop Iterating:**
- All exit criteria met
- Visual inspection confirms UI consistency
- Both refresh buttons work
- PR created and pushed

## Implementation Notes

### Key Decisions

**Q: Why not create separate refresh functions for each balance?**
A: The backend service already fetches both in one call. Separating them would add unnecessary complexity and potentially cause race conditions.

**Q: Should the buttons be independent (not share loading state)?**
A: No - since they trigger the same function, sharing loading state is correct behavior. Both should spin when either is clicked.

**Q: Do I need to import anything new?**
A: No - all imports (`Button`, `RefreshCw`, etc.) are already present at the top of the file.

### Potential Issues & Solutions

| Issue | Solution |
|-------|----------|
| Buttons look different | Double-check className matches exactly |
| Only one button works | Verify both onClick={loadCanisterBalances} |
| Loading state doesn't sync | Confirm both disabled={isLoadingBalance} |
| Layout breaks | Check justify-between in CardTitle |

## Deployment Checklist

- [ ] Changes made in worktree (not main repo)
- [ ] Frontend built successfully (`npm run build`)
- [ ] Deployed to mainnet (`./deploy.sh --network ic --frontend-only`)
- [ ] Manual testing completed
- [ ] Both refresh buttons work
- [ ] Visual consistency verified
- [ ] PR created with proper description
- [ ] Branch pushed to origin

## Success Metrics

**Before:**
- ICP card has refresh button
- ckUSDT card has no refresh button
- Inconsistent UX

**After:**
- Both cards have refresh buttons
- Both buttons work identically
- Consistent, intuitive UX
- Users can refresh from either card
