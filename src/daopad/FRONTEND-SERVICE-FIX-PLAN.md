# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-frontend-fixes/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-frontend-fixes/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Backend changes: (NONE - Frontend only fix)
   - Frontend changes:
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Fix]: Frontend service initialization errors after PR #76"
   git push -u origin fix/frontend-service-errors
   gh pr create --title "[Fix]: Frontend service initialization errors" --body "Fixes service initialization errors introduced in PR #76. Restores proper service factory pattern usage."
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

**Branch:** `fix/frontend-service-errors`
**Worktree:** `/home/theseus/alexandria/daopad-frontend-fixes/src/daopad`

---

# Implementation Plan

## Task Classification
**BUG FIX**: Restore broken service initialization patterns - minimal changes

## Current State Documentation

### Errors Found
1. **TokenDashboard.tsx:150** - `ReferenceError: daopadService is not defined`
   - Issue: Incorrect service usage, should be `proposalService`
   - Line 241: Creates `const daopadService = getProposalService(identity)`
   - Line 136: Creates `const proposalService = getProposalService(identity)`
   - Likely a typo or merge conflict remnant

2. **AddressBookPage.tsx:16** - `TypeError: ps.setIdentity is not a function`
   - Issue: Service no longer has setIdentity method after consolidation
   - New pattern: Services accept identity in constructor via factory function
   - Component incorrectly tries to call setIdentity on service instance

3. **CanistersTab.tsx:44** - `ReferenceError: identity is not defined`
   - Issue: Component uses `identity` but doesn't receive it as prop
   - Line 12: `function CanistersTab({ token, stationId })` - missing identity prop
   - Line 44: Uses `getOrbitCanisterService(identity)` with undefined identity

4. **DAOSettings.tsx:54** - `TypeError: getProposalService.getOrbitSystemInfo is not a function`
   - Issue: Treating factory function as service instance
   - Line 54: `await getProposalService.getOrbitSystemInfo()`
   - Should be: `await getProposalService(identity).getOrbitSystemInfo()`

### Root Cause
PR #76 consolidated services from singleton pattern to factory functions:
- Old: Services were singletons with setIdentity methods
- New: Services created via factory functions that accept identity: `getServiceName(identity)`
- Components not fully updated to new pattern

## Implementation Steps

### 1. Fix TokenDashboard.tsx
**File**: `/home/theseus/alexandria/daopad-frontend-fixes/src/daopad/daopad_frontend/src/components/TokenDashboard.tsx`

```javascript
// PSEUDOCODE - Fix line 241 variable name inconsistency
// Line 241 currently:
const daopadService = getProposalService(identity);

// Change to match line 136 usage:
const proposalService = getProposalService(identity);

// Line 245 currently uses daopadService, change to:
const result = await proposalService.proposeOrbitStationLink(tokenPrincipal, stationPrincipal);

// Line 272-273 already correct - uses proposalService
```

### 2. Fix AddressBookPage.tsx
**File**: `/home/theseus/alexandria/daopad-frontend-fixes/src/daopad/daopad_frontend/src/pages/AddressBookPage.tsx`

```javascript
// PSEUDOCODE - Remove setIdentity pattern, service already initialized with identity
// Lines 14-21 currently:
const [addressBookService, setAddressBookService] = useState(null);

useEffect(() => {
    if (identity) {
      const service = getOrbitAddressBookService(identity);
      setAddressBookService(service);
    }
}, [identity]);

// Keep as is - this is correct! The service is created with identity.
// No changes needed here.
// Error might be elsewhere - need to search for "ps.setIdentity"
```

**Search for actual error location:**
```bash
grep -n "setIdentity" AddressBookPage.tsx
# If found, remove the line calling ps.setIdentity
```

### 3. Fix CanistersTab.tsx
**File**: `/home/theseus/alexandria/daopad-frontend-fixes/src/daopad/daopad_frontend/src/components/canisters/CanistersTab.tsx`

```javascript
// PSEUDOCODE - Add identity prop and pass it through
// Line 12 currently:
export default function CanistersTab({ token, stationId }) {

// Change to:
export default function CanistersTab({ token, stationId, identity }) {

// Line 44 will now work with identity defined:
const result = await getOrbitCanisterService(identity).listCanisters(
```

**Find parent component and pass identity:**
```bash
grep -r "CanistersTab" --include="*.tsx" --include="*.jsx"
# Find where CanistersTab is used and add identity={identity} prop
```

### 4. Fix DAOSettings.tsx
**File**: `/home/theseus/alexandria/daopad-frontend-fixes/src/daopad/daopad_frontend/src/components/DAOSettings.tsx`

```javascript
// PSEUDOCODE - Create service instance before calling method
// Line 54 currently:
const result = await getProposalService.getOrbitSystemInfo(tokenCanisterId);

// Change to:
const proposalService = getProposalService(identity);
const result = await proposalService.getOrbitSystemInfo(tokenCanisterId);
```

### 5. Search for Similar Patterns
```bash
# Find all service factory function usages to verify correct pattern
grep -r "getProposalService\|getOrbitCanisterService\|getOrbitAddressBookService" \
  --include="*.tsx" --include="*.jsx" \
  daopad_frontend/src/ | grep -v "import"

# Check for any remaining setIdentity calls
grep -r "setIdentity" --include="*.tsx" --include="*.jsx" daopad_frontend/src/
```

## Testing Requirements

### Local Testing
```bash
# Build frontend
cd /home/theseus/alexandria/daopad-frontend-fixes/src/daopad
npm run build

# Check for TypeScript errors
npm run type-check || true

# Deploy to mainnet (no local testing environment)
./deploy.sh --network ic --frontend-only
```

### Manual Verification
1. Navigate to Treasury tab - should load without "daopadService is not defined" error
2. Navigate to Address Book - should work without "setIdentity is not a function" error
3. Navigate to Canisters tab - should load without "identity is not defined" error
4. Navigate to Settings tab - should load without "getOrbitSystemInfo is not a function" error

### Success Criteria
- All 4 tabs load without console errors
- Service methods execute successfully
- Data displays correctly in UI

## Rollback Plan
If issues persist after fixes:
```bash
git checkout master
git worktree remove ../daopad-frontend-fixes --force
# Revert to last working version
```

## Notes
- This is a MINIMAL fix to restore functionality
- No refactoring or improvements - just fix the broken service calls
- All changes are frontend-only, no backend modifications needed
- Services already support the new pattern, just need correct usage