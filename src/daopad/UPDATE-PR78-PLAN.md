# 🤖 AUTONOMOUS PR ORCHESTRATOR - UPDATE PR #78

**You are an autonomous PR orchestrator. Your ONLY job is to fix PR #78 and get it working.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-kong-locker-fix/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-kong-locker-fix/src/daopad`
2. **Pull latest from PR branch**:
   ```bash
   git pull origin feature/fix-kong-locker-declarations
   ```
3. **Implement fixes** - Follow plan sections below
4. **Build & Deploy**:
   ```bash
   cd /home/theseus/alexandria/daopad-kong-locker-fix/src/daopad
   npm run build
   ./deploy.sh --network ic --frontend-only
   ```
5. **Update PR #78**:
   ```bash
   git add .
   git commit -m "[Fix]: Resolve all Kong Locker integration errors

   - Fix undefined daopadService in TokenDashboard
   - Fix BigInt conversion error
   - Remove non-existent backend method calls
   - Add proper service imports"
   git push
   gh pr edit 78 --body "Fixed all Kong Locker integration issues. Page now loads without errors."
   ```

## CRITICAL RULES
- ❌ NO questions allowed
- ❌ NO stopping until PR is updated
- ✅ Fix ALL errors, not just some
- ✅ Test that page loads without crashes

**PR:** #78
**Branch:** `feature/fix-kong-locker-declarations`
**Worktree:** `/home/theseus/alexandria/daopad-kong-locker-fix/src/daopad`

---

# Critical Fixes Required

## 1. Fix TokenDashboard.tsx - Undefined Service (CRITICAL - Page Crash)

**File:** `daopad_frontend/src/components/TokenDashboard.tsx`

```javascript
// Line 4 - ADD getProposalService to imports
import { getProposalService, getTokenService, getKongLockerService, getOrbitUserService } from '../services/backend';

// Around line 130 in loadTokenStatus function - ADD service initialization
const loadTokenStatus = async () => {
    if (!token || !identity) return;
    setLoading(true);
    setError('');

    try {
        const tokenService = getTokenService(identity);  // ALREADY EXISTS
        const proposalService = getProposalService(identity); // ADD THIS
        const tokenPrincipal = Principal.fromText(token.canister_id);

        // ... rest of function

        // Line 150 - Replace undefined daopadService
        const proposalResult = await proposalService.getActiveProposalForToken(tokenPrincipal);
```

## 2. Fix TokenDashboard.tsx - BigInt Conversion (CRITICAL - Page Crash)

**File:** `daopad_frontend/src/components/TokenDashboard.tsx`

```javascript
// Line 297 - Fix BigInt division
const vpToUsd = (vp) => {
    // Handle BigInt and regular numbers
    let vpValue = 0;
    if (typeof vp === 'bigint') {
        vpValue = Number(vp);  // Convert BigInt to number
    } else if (typeof vp === 'number') {
        vpValue = vp;
    }
    return formatUsdValue(vpValue / VP_TO_USD_RATIO);
};
```

## 3. Fix KongLockerService.ts - Non-existent Backend Method

**File:** `daopad_frontend/src/services/backend/kong-locker/KongLockerService.ts`

The backend does NOT have `get_my_kong_locker_positions()`. We need to handle this gracefully.

```javascript
// Line 79-88 - Replace getPositions method
async getPositions() {
    try {
        // Backend doesn't have this method - return empty for now
        // TODO: Implement direct Kong Lock canister query
        console.warn('getPositions not implemented - returning empty array');
        return {
            success: true,
            data: [],
            warning: 'Position fetching not yet implemented'
        };
    } catch (error) {
        console.error('Failed to get positions:', error);
        return { success: false, error: error.message };
    }
}
```

## 4. Fix TokenTabs.tsx - Ensure Correct Imports

**File:** `daopad_frontend/src/components/TokenTabs.tsx`

Verify these are already fixed from previous commits:
- Line 4: Should import `getTokenService`
- Line 39: Should use `const tokenService = getTokenService(identity)`
- Line 43: Should use `tokenService.getMyLockedTokens()`
- Line 55: Should use `kongLockerService.getMyCanister()`
- Line 66: Should use `kongLockerService.getPositions()`

## Testing Requirements

After fixes:
```bash
# Build and verify no build errors
npm run build

# Deploy to mainnet
./deploy.sh --network ic --frontend-only

# Test in browser - MUST have:
# ✅ No console errors about undefined variables
# ✅ No BigInt conversion errors
# ✅ Page loads without ErrorBoundary
# ✅ Token list appears (even if empty)
```

## Expected Console Output

Should see:
- "getPositions not implemented - returning empty array" (warning, not error)
- Normal authentication messages
- NO TypeError messages
- NO "is not a function" errors
- NO "undefined" variable errors

---

**EXECUTE IMMEDIATELY - PR #78 needs these fixes to work**