# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-transfer-fix/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-transfer-fix/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes only:
     ```bash
     cd daopad_frontend
     npm run build
     cd ..
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "fix: Correct toast API usage across all components

Replace shadcn/ui toast syntax with sonner toast API.
Fixes React error #31 when opening transfer requests.

All toast({variant, title, description}) → toast.error(title, {description})
"
   git push -u origin feature/fix-transfer-request-error
   gh pr create --title "fix: Correct Toast API Usage (Fixes Transfer Request Error)" --body "Implements FIX_TOAST_ERRORS.md - fixes React error #31 when opening transfer requests by correcting toast API usage from shadcn/ui syntax to sonner syntax across 11 components."
   ```
5. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view --json comments`
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

**Branch:** `feature/fix-transfer-request-error`
**Worktree:** `/home/theseus/alexandria/daopad-transfer-fix/src/daopad`

---

# Fix Toast API Usage - Transfer Request Error

## Problem Statement

**Runtime Error:**
```
Error: Minified React error #31; visit https://reactjs.org/docs/error-decoder.html?invariant=31&args[]=object%20with%20keys%20%7Bvariant%2C%20title%2C%20description%7D
```

**Root Cause:**
The codebase uses **sonner** toast library (imported via `use-toast` hook), but 11 components are using **shadcn/ui** toast syntax which is incompatible.

**Location:** `AccountsTable.jsx:84` and 10 other components

**Impact:** Users cannot open transfer requests - the app crashes with React error

---

## Current State

### Toast Hook Implementation
**File:** `src/hooks/use-toast.js`
```javascript
// Current (correct)
import { toast as sonnerToast } from 'sonner';

export function useToast() {
  return {
    toast: sonnerToast,
  };
}
```

### Incorrect Usage Pattern (11 files)
```javascript
// ❌ WRONG - shadcn/ui syntax (not compatible with sonner)
toast({
  variant: 'destructive',
  title: 'Error Title',
  description: 'Error description'
});
```

### Correct Usage Pattern (working in other files)
```javascript
// ✅ CORRECT - sonner syntax
toast.error('Error Title', {
  description: 'Error description'
});

toast.success('Success message');
toast.warning('Warning message');
```

---

## Files Requiring Fix

All in `daopad_frontend/src/`:

1. `components/tables/AccountsTable.jsx` - **BLOCKING TRANSFER REQUESTS**
2. `pages/RequestsPage.jsx`
3. `components/orbit/AssetDialog.jsx`
4. `components/orbit/ExternalCanisterDialog.jsx`
5. `components/orbit/TransferDialog.jsx`
6. `components/orbit/ExternalCanistersPage.jsx`
7. `components/orbit/TransferRequestDialog.jsx`
8. `components/orbit/OrbitRequestsList.jsx`
9. `components/orbit/AssetsPage.jsx`
10. `components/orbit/AccountSetupDialog.jsx`
11. `components/orbit/requests/RequestDialog.jsx`

---

## Implementation Plan

### Step 1: Fix Each File

For EACH file listed above, find all instances of:

```javascript
toast({
  variant: 'destructive',  // or 'default'
  title: 'TITLE_TEXT',
  description: 'DESCRIPTION_TEXT'
});
```

And replace with sonner API based on variant:

#### Variant: 'destructive' → toast.error()
```javascript
// BEFORE
toast({
  variant: 'destructive',
  title: 'Error Title',
  description: 'Error details'
});

// AFTER
toast.error('Error Title', {
  description: 'Error details'
});
```

#### Variant: 'default' or no variant → toast.success() or toast.info()
```javascript
// BEFORE
toast({
  variant: 'default',
  title: 'Success',
  description: 'Operation completed'
});

// AFTER
toast.success('Success', {
  description: 'Operation completed'
});
```

#### No description → Simple message
```javascript
// BEFORE
toast({
  variant: 'destructive',
  title: 'Error occurred'
});

// AFTER
toast.error('Error occurred');
```

### Step 2: Specific File Fixes

#### 1. AccountsTable.jsx (CRITICAL - Blocks Transfers)

**File:** `components/tables/AccountsTable.jsx:84-88`

```javascript
// BEFORE
if (!assetToUse.id) {
  toast({
    variant: 'destructive',
    title: 'Missing Asset Information',
    description: 'Cannot create transfer request without asset details. Please try refreshing the account data.'
  });
  return;
}

// AFTER
if (!assetToUse.id) {
  toast.error('Missing Asset Information', {
    description: 'Cannot create transfer request without asset details. Please try refreshing the account data.'
  });
  return;
}
```

#### 2-11. Remaining Files

Use same pattern:
- Find all `toast({` calls
- Check `variant` value
- Replace with appropriate `toast.error()`, `toast.success()`, `toast.warning()`, or `toast.info()`
- Move `title` to first argument
- Keep `description` as option object (if present)

---

## Conversion Reference

| shadcn/ui (OLD) | sonner (NEW) |
|-----------------|--------------|
| `toast({ variant: 'destructive', title: 'X', description: 'Y' })` | `toast.error('X', { description: 'Y' })` |
| `toast({ variant: 'default', title: 'X', description: 'Y' })` | `toast.success('X', { description: 'Y' })` |
| `toast({ title: 'X', description: 'Y' })` | `toast.info('X', { description: 'Y' })` |
| `toast({ title: 'X' })` | `toast.info('X')` |
| `toast({ variant: 'destructive', title: 'X' })` | `toast.error('X')` |

---

## Testing Strategy

### 1. Build Test
```bash
cd daopad_frontend
npm run build
# Should complete without errors
```

### 2. Manual Test on Mainnet
1. Navigate to: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io
2. Connect with Internet Identity
3. Go to Treasury tab
4. Click on an account
5. Click "Transfer" button
6. **Expected:** Transfer dialog opens successfully
7. **Before fix:** React error #31 crash

### 3. Toast Appearance Test
- Error toasts should show with red/error styling
- Success toasts should show with green/success styling
- All toasts should dismiss automatically after ~4 seconds
- Toasts should stack if multiple triggered

---

## Deployment

```bash
# Build frontend
cd daopad_frontend
npm run build

# Deploy
cd ..
./deploy.sh --network ic --frontend-only
```

**Target:** https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io

---

## Success Criteria

- [ ] All 11 files converted from shadcn/ui to sonner toast syntax
- [ ] Frontend builds without errors
- [ ] Transfer request dialog opens successfully
- [ ] Error toasts display with proper styling
- [ ] No React error #31 in browser console
- [ ] Deployed to mainnet successfully

---

## Notes

- **No backend changes required** - this is purely a frontend bug fix
- **No declaration sync needed** - no candid changes
- **Low risk** - only changing toast display, not business logic
- **High impact** - unblocks critical transfer request functionality

---

## Expected Changes

- **Files modified:** 11
- **Lines changed:** ~30-50 (small replacements)
- **Risk level:** LOW (cosmetic/UX fix)
- **User impact:** HIGH (fixes blocking bug)

---

**Implementation Time:** 15-20 minutes
**Testing Time:** 5 minutes
**Deployment Time:** 3 minutes
**Total:** ~30 minutes
