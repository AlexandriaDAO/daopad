# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-settings-tab-fix/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-settings-tab-fix/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes:
     ```bash
     cd daopad_frontend
     npm run build
     cd ..
     ./deploy.sh --network ic --frontend-only
     ```
4. **Test with Playwright** (MANDATORY):
   ```bash
   cd daopad_frontend
   npx playwright test e2e/settings.spec.ts --project=chromium
   ```
5. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Fix]: Settings Tab Anonymous User Access"
   git push -u origin feature/settings-tab-anonymous-access
   gh pr create --title "[Fix]: Settings Tab - Anonymous User Access" --body "Implements SETTINGS_TAB_FIX_PLAN.md

## Problem
Settings tab tests failing:
- Timeout loading Settings tab for anonymous users (6s)
- Timeout loading security dashboard for anonymous users (2m)
- Test using incorrect token ID

## Solution
1. Fixed test to use correct ALEX token ID (ysy5f-2qaaa-aaaap-qkmmq-cai)
2. Ensured DAOSettings component handles anonymous users
3. All data fetching works without authentication

## Testing
✅ Playwright tests pass for Settings tab
✅ Anonymous users can view station information
✅ Security dashboard loads for anonymous users"
   ```
6. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view $(gh pr list --head feature/settings-tab-anonymous-access --json number -q '.[0].number') --json comments`
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

**Branch:** `feature/settings-tab-anonymous-access`
**Worktree:** `/home/theseus/alexandria/daopad-settings-tab-fix/src/daopad`

---

# Implementation Plan: Settings Tab Anonymous User Access

## Task Classification
**BUG FIX**: Restore broken behavior → minimal changes

## Problem Statement

The Settings tab (`/dao/:tokenId/settings`) is timing out for anonymous users:

### Failing Tests:
1. **settings.spec.ts:12** - "should load Settings tab for anonymous user" (6s timeout)
2. **settings.spec.ts:25** - "should load security dashboard for anonymous user" (2m timeout)

### Root Causes Identified:
1. **Incorrect Token ID in Tests**: Tests use `2ouva-viaaa-aaaaq-qaamq-cai` instead of the correct ALEX token `ysy5f-2qaaa-aaaap-qkmmq-cai`
2. **Component May Not Handle Anonymous**: Need to verify DAOSettings component works without authentication

## Current State

### File Structure:
```
daopad_frontend/src/
├── routes/dao/
│   └── DaoSettings.tsx              # Route wrapper (gets context from DaoRoute)
├── components/
│   └── DAOSettings.tsx               # Main Settings component
├── e2e/
│   └── settings.spec.ts              # Playwright tests
└── App.tsx                            # Route configuration (line 37: /dao/:tokenId/settings)
```

### Current Implementation:

**DaoSettings.tsx** (routes/dao/DaoSettings.tsx:1-17):
```typescript
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import DAOSettings from '../../components/DAOSettings';

export default function DaoSettings() {
  const { token, orbitStation, identity } = useOutletContext<any>();

  return (
    <DAOSettings
      tokenCanisterId={token.canister_id}
      identity={identity}
      stationId={orbitStation?.station_id || null}
      tokenSymbol={token.symbol}
      tokenId={token.canister_id}
    />
  );
}
```

**DAOSettings.tsx** (components/DAOSettings.tsx:47-85):
```typescript
const DAOSettings: React.FC<DAOSettingsProps> = ({ tokenCanisterId, identity, stationId, tokenSymbol, tokenId }) => {
    const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showPermissions, setShowPermissions] = useState<boolean>(false);
    const [showSecurity, setShowSecurity] = useState<boolean>(false);

    useEffect(() => {
        const fetchSystemInfo = async () => {
            if (!tokenCanisterId) {  // LINE 56 - Potential issue
                setError('No token canister ID provided');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const governanceService = getOrbitGovernanceService(identity || null);  // LINE 66
                const result = await governanceService.getSystemInfo(tokenCanisterId);

                // Handle service response
                if (result.success) {
                    setSystemInfo(result.data);
                } else {
                    setError(result.error || 'Failed to fetch system information');
                }
            } catch (err) {
                console.error('Failed to fetch system info:', err);
                const errorMessage = err instanceof Error ? err.message : 'Failed to fetch system information';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchSystemInfo();
    }, [tokenCanisterId]);  // Only depends on tokenCanisterId, not identity
```

**Test File** (e2e/settings.spec.ts:6):
```typescript
test.beforeEach(async ({ page }) => {
    // ❌ WRONG TOKEN ID
    await page.goto('https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/dao/2ouva-viaaa-aaaaq-qaamq-cai/settings');

    await page.waitForLoadState('networkidle');
});
```

## Implementation

### Fix 1: Update Test to Use Correct Token ID

**File**: `daopad_frontend/e2e/settings.spec.ts` (MODIFY)

```typescript
// PSEUDOCODE
test.describe('Settings Tab - Anonymous User Access', () => {
    test.beforeEach(async ({ page }) => {
        // FIX: Use correct ALEX token ID (matches working Activity/Overview tests)
        await page.goto('https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/settings');

        // Wait for page load
        await page.waitForLoadState('networkidle');
    });

    // Keep all existing test cases unchanged
    // Just fixing the token ID in beforeEach
});
```

### Fix 2: Verify DAOSettings Component Works for Anonymous Users

**File**: `daopad_frontend/src/components/DAOSettings.tsx` (VERIFY/MODIFY IF NEEDED)

The component already:
✅ Accepts `identity` as optional (`Identity | null`)
✅ Passes `identity || null` to governanceService
✅ Does NOT require authentication to fetch systemInfo

**Potential Issue to Check**: Line 66 passes `identity || null` - verify backend service handles null identity correctly.

**If backend service doesn't handle null identity**:
```typescript
// PSEUDOCODE - Only implement if backend fails with null identity
const governanceService = getOrbitGovernanceService(identity || null);

// Add error handling for anonymous queries
const result = await governanceService.getSystemInfo(tokenCanisterId)
    .catch(err => {
        if (err.message?.includes('identity required')) {
            // Return anonymous-friendly error
            return {
                success: false,
                error: 'Sign in to view full settings'
            };
        }
        throw err;
    });
```

**Most likely**: Component is already fine, just needed correct token ID in tests.

## Testing Requirements

### Manual Testing (Before Playwright):
```bash
# 1. Deploy to mainnet
./deploy.sh --network ic --frontend-only

# 2. Test in browser (incognito mode)
open "https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/settings"

# Verify:
# ✓ Page loads without timeout
# ✓ "Station Information" card visible
# ✓ Station Name, Version, Station ID all display
# ✓ No authentication errors in console
# ✓ "Run Security Checks" button clickable
# ✓ Security dashboard loads (may take up to 60s)
```

### Playwright Testing:
```bash
cd daopad_frontend

# Run only Settings tests
npx playwright test e2e/settings.spec.ts --project=chromium

# Expected Results:
# ✅ should load Settings tab for anonymous user (< 10s)
# ✅ should load security dashboard for anonymous user (< 60s)
# ✅ should show read-only mode for write operations
# ✅ should handle BigInt values correctly
# ✅ should display request policies correctly
# ✅ should not show authentication errors in console
```

### Success Criteria:
- ✅ All 6 Settings tab tests pass
- ✅ No timeout errors
- ✅ Anonymous users can view station info
- ✅ Security dashboard loads successfully
- ✅ No console errors about authentication

## Files Changed Summary

1. **daopad_frontend/e2e/settings.spec.ts**
   - Update token ID from `2ouva-viaaa-aaaaq-qaamq-cai` to `ysy5f-2qaaa-aaaap-qkmmq-cai`

2. **daopad_frontend/src/components/DAOSettings.tsx** (IF NEEDED)
   - Add better error handling for anonymous identity
   - Ensure backend service can handle null identity

## Expected Outcome

After implementation:
- ✅ Settings tab loads in < 10s for anonymous users
- ✅ Security dashboard loads in < 60s
- ✅ All Playwright tests pass
- ✅ Tab matches performance of working Activity/Overview tabs
