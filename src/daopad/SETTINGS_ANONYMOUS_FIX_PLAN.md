# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-settings-anonymous-fix/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-settings-anonymous-fix/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes only:
     ```bash
     cd daopad_frontend
     npm run build
     cd ..
     ./deploy.sh --network ic --frontend-only
     ```
4. **Test** (MANDATORY):
   ```bash
   cd daopad_frontend
   npx playwright test e2e/settings.spec.ts
   ```
5. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Fix]: Settings Tab - Anonymous User Access"
   git push -u origin feature/settings-anonymous-fix
   gh pr create --title "[Fix]: Settings Tab - Anonymous User Access" --body "Implements SETTINGS_ANONYMOUS_FIX_PLAN.md"
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

**Branch:** `feature/settings-anonymous-fix`
**Worktree:** `/home/theseus/alexandria/daopad-settings-anonymous-fix/src/daopad`

---

# Implementation Plan: Settings Tab Anonymous Access

## Summary

Fix Settings tab to display security dashboard and AutoApproved policy configuration for anonymous users (read-only view).

## Problem Statement

The Settings tab is currently broken for anonymous users. It requires identity checks that block page load, preventing anonymous users from viewing:
- Security score (0-100%)
- Decentralization checklist
- Current policies (read-only)
- System information

## Root Cause Analysis

### Issue 1: DAOSettings.tsx Identity Checks
```typescript
// Line 44-48
useEffect(() => {
    const fetchSystemInfo = async () => {
        if (!tokenCanisterId) {  // ✅ Good
            setError('No token canister ID provided');
            setLoading(false);
            return;
        }
        // ❌ MISSING: No identity check, but...
```

### Issue 2: Parameter Mismatch Bug
```typescript
// Line 55 - WRONG PARAMETER
const result = await governanceService.getSystemInfo(stationId);
// Should be:
const result = await governanceService.getSystemInfo(tokenId);
```

Backend expects `token_canister_id`:
```rust
pub async fn get_orbit_system_info(token_canister_id: Principal)
```

### Issue 3: SecurityDashboard.tsx Identity Checks
```typescript
// Line 43 - BLOCKS ANONYMOUS
const fetchSecurityStatus = async () => {
    if (!stationId || !identity) return;  // ❌ Blocks anonymous

// Line 90 - ALSO BLOCKS ANONYMOUS
useEffect(() => {
    if (stationId && identity) {  // ❌ Blocks anonymous
        fetchSecurityStatus();
    }
}, [stationId, identity]);
```

### Issue 4: Write Operations Not Disabled

Settings page has mutation operations that should be disabled for anonymous users:
- AdminRemovalActions (line 195-199) - Should disable buttons for anonymous
- AutoApprovedSetupWizard (line 187-192) - Should hide/disable for anonymous

## Current File Structure

```
daopad_frontend/
├── src/
│   ├── components/
│   │   ├── DAOSettings.tsx                    # MODIFY - Remove identity checks, fix param
│   │   └── security/
│   │       ├── SecurityDashboard.tsx           # MODIFY - Remove identity checks
│   │       ├── AdminRemovalActions.tsx         # MODIFY - Disable for anonymous
│   │       └── AutoApprovedSetupWizard.tsx    # MODIFY - Disable for anonymous
│   ├── routes/dao/
│   │   └── DaoSettings.tsx                     # NO CHANGES - Just passes props
│   └── services/
│       └── backend/orbit/governance/
│           └── OrbitGovernanceService.ts       # NO CHANGES - Already correct
└── e2e/
    └── settings.spec.ts                        # NEW - E2E test for anonymous

Backend already supports anonymous:
- get_orbit_system_info(token_canister_id) - Public, no auth required
- perform_security_check(station_id) - Public, no auth required
- get_request_policies_details(station_id) - Public, no auth required
```

## Implementation Plan

### 1. Fix DAOSettings.tsx - Remove Identity Check + Fix Parameter Bug

**File:** `daopad_frontend/src/components/DAOSettings.tsx`

**Changes:**
```typescript
// PSEUDOCODE

// Line 42-73: Modify fetchSystemInfo useEffect
useEffect(() => {
    const fetchSystemInfo = async () => {
        // ✅ KEEP: Token check
        if (!tokenCanisterId) {
            setError('No token canister ID provided');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const governanceService = getOrbitGovernanceService(identity || null);

            // ✅ FIX: Pass tokenId instead of stationId
            const result = await governanceService.getSystemInfo(tokenId);

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

    // ✅ REMOVE: identity from dependency array (not needed)
}, [tokenCanisterId, tokenId]); // Changed from [tokenCanisterId]

// Line 80-84: Handle BigInt in formatCycles
const formatCycles = (cycles: bigint | number | null): string => {
    if (!cycles) return '0';
    // Convert BigInt to number if necessary
    const numCycles = typeof cycles === 'bigint' ? Number(cycles) : cycles;
    const tc = numCycles / 1e12;
    return `${tc.toFixed(3)} TC`;
};

// Line 103-106: Handle BigInt in formatDate
const formatDate = (timestamp: bigint | number | null): string => {
    if (!timestamp) return 'Never';
    // Convert BigInt to number if necessary
    const numTimestamp = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
    return new Date(numTimestamp).toLocaleString();
};
```

### 2. Fix SecurityDashboard.tsx - Remove Identity Checks

**File:** `daopad_frontend/src/components/security/SecurityDashboard.tsx`

**Changes:**
```typescript
// PSEUDOCODE

// Line 42-87: Modify fetchSecurityStatus function
const fetchSecurityStatus = async () => {
    // ✅ REMOVE: identity check - allow anonymous
    if (!stationId) return;  // Only check stationId

    setLoading(true);
    setError(null);
    setCompletedCount(0);
    setProgressData({
        admin_control: null,
        treasury_control: null,
        governance_permissions: null,
        proposal_policies: null,
        external_canisters: null,
        asset_management: null,
        system_configuration: null,
        operational_permissions: null,
        // NEW: 8 additional bypass detection checks
        controller_manipulation: null,
        external_canister_calls: null,
        system_restore: null,
        addressbook_injection: null,
        monitoring_drain: null,
        snapshot_operations: null,
        named_rule_bypass: null,
        remove_operations: null,
    });

    try {
        // ✅ PASS: identity as null for anonymous
        const securityService = new OrbitSecurityService(identity || null);

        const onProgress = (progress) => {
            setProgressData(prev => ({
                ...prev,
                [progress.category]: progress,
            }));
            setCompletedCount(prev => prev + 1);
        };

        const result = await securityService.performComprehensiveSecurityCheck(
            stationId,
            onProgress
        );

        if (result.success) {
            // ✅ Handle BigInt in decentralization_score
            const data = result.data;
            if (data.decentralization_score && typeof data.decentralization_score === 'bigint') {
                data.decentralization_score = Number(data.decentralization_score);
            }
            setSecurityData(data);
        } else {
            setError(result.error || 'Failed to verify security status');
        }
    } catch (err) {
        console.error('Security check failed:', err);
        setError('Failed to verify security status. Please try again.');
    } finally {
        setLoading(false);
    }
};

// Line 89-93: Modify useEffect to remove identity dependency
useEffect(() => {
    // ✅ REMOVE: identity check - allow anonymous
    if (stationId) {  // Only check stationId
        fetchSecurityStatus();
    }
}, [stationId]); // ✅ REMOVE: identity from dependencies
```

### 3. Disable Write Operations for Anonymous Users

**File:** `daopad_frontend/src/components/security/AdminRemovalActions.tsx`

**Changes:**
```typescript
// PSEUDOCODE

// Add prop to track anonymous state
const AdminRemovalActions = ({ tokenId, stationId, identity }) => {
    const isAnonymous = !identity;

    // Existing state and logic...

    return (
        <Card>
            <CardHeader>
                <CardTitle>Admin User Management</CardTitle>
                <CardDescription>
                    Remove non-backend admin users to complete DAO setup
                    {isAnonymous && (
                        <div className="mt-2 text-sm text-yellow-600">
                            ⚠️ Read-only mode: Sign in to manage admin users
                        </div>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Existing content */}

                {/* ✅ DISABLE: Remove button for anonymous */}
                <Button
                    onClick={() => handleRemoveAdmin(admin.id)}
                    disabled={isAnonymous || isLoading}  // Disable for anonymous
                >
                    {isAnonymous ? '🔒 Sign In to Remove' : 'Remove Admin'}
                </Button>
            </CardContent>
        </Card>
    );
};
```

**File:** `daopad_frontend/src/components/security/AutoApprovedSetupWizard.tsx`

**Changes:**
```typescript
// PSEUDOCODE

// Add anonymous check at render time
const AutoApprovedSetupWizard = ({ tokenId, stationId, onComplete, identity }) => {
    const isAnonymous = !identity;

    // ✅ HIDE: Don't show wizard for anonymous users
    if (isAnonymous) {
        return (
            <Alert>
                <AlertDescription>
                    🔒 Sign in to configure AutoApproved policies for this treasury
                </AlertDescription>
            </Alert>
        );
    }

    // Existing wizard UI for authenticated users...
};
```

### 4. Update SecurityDashboard.tsx - Pass Identity to Child Components

**File:** `daopad_frontend/src/components/security/SecurityDashboard.tsx`

**Changes:**
```typescript
// PSEUDOCODE

// Line 187-192: Pass identity to AutoApprovedSetupWizard
{securityData && securityData.checks.some(check =>
    check.category === 'Treasury Setup' &&
    check.name === 'Account AutoApproved Status' &&
    check.status === 'Fail'
) && (
    <AutoApprovedSetupWizard
        tokenId={tokenId}
        stationId={stationId}
        identity={identity}  // ✅ ADD: Pass identity
        onComplete={fetchSecurityStatus}
    />
)}
```

### 5. Create E2E Test for Settings Tab Anonymous Access

**File:** `daopad_frontend/e2e/settings.spec.ts` (NEW)

**Content:**
```typescript
// PSEUDOCODE

import { test, expect } from '@playwright/test';

test.describe('Settings Tab - Anonymous User Access', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to ALEX token DAO Settings tab
        await page.goto('https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/dao/2ouva-viaaa-aaaaq-qaamq-cai/settings');

        // Wait for page load
        await page.waitForLoadState('networkidle');
    });

    test('should load Settings tab for anonymous user', async ({ page }) => {
        // Check that page title exists
        await expect(page.locator('text=Station Information')).toBeVisible();

        // Check that station info loads
        await expect(page.locator('text=Station Name')).toBeVisible();
        await expect(page.locator('text=Version')).toBeVisible();

        // Should NOT show error about authentication
        await expect(page.locator('text=not authorized')).not.toBeVisible();
        await expect(page.locator('text=identity required')).not.toBeVisible();
    });

    test('should load security dashboard for anonymous user', async ({ page }) => {
        // Click "Run Security Checks" button
        await page.click('button:has-text("Run Security Checks")');

        // Wait for security analysis to complete
        await page.waitForSelector('text=Analyzing DAO security', { state: 'hidden', timeout: 60000 });

        // Check that security score is displayed
        await expect(page.locator('text=Decentralization Score')).toBeVisible();

        // Check that checklist items are visible
        await expect(page.locator('text=Admin Control')).toBeVisible();
        await expect(page.locator('text=Treasury Control')).toBeVisible();
    });

    test('should show read-only mode for write operations', async ({ page }) => {
        // Check that admin removal shows read-only warning
        await expect(page.locator('text=Read-only mode: Sign in to manage')).toBeVisible();

        // Check that remove buttons are disabled
        const removeButtons = page.locator('button:has-text("Remove")');
        const count = await removeButtons.count();
        for (let i = 0; i < count; i++) {
            await expect(removeButtons.nth(i)).toBeDisabled();
        }
    });

    test('should handle BigInt values correctly', async ({ page }) => {
        // Check that cycle amounts display correctly (not NaN or [object BigInt])
        const cyclesText = await page.locator('text=TC').first().textContent();
        expect(cyclesText).toMatch(/\d+\.\d{3} TC/); // Should be formatted like "1.234 TC"

        // Check that dates display correctly (not NaN)
        const dateText = await page.locator('text=Last Upgrade').locator('..').locator('div').nth(1).textContent();
        expect(dateText).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Should be a valid date
    });

    test('should display request policies correctly', async ({ page }) => {
        // Click "Show Request Policies" button
        await page.click('button:has-text("Show Request Policies")');

        // Wait for policies to load
        await page.waitForSelector('text=Request Policy');

        // Check that policies are displayed
        await expect(page.locator('text=AutoApproved')).toBeVisible();
        await expect(page.locator('text=Transfer')).toBeVisible();
    });
});
```

## Testing Strategy

### Manual Testing Checklist

**Before Deploy:**
1. [ ] Build frontend: `cd daopad_frontend && npm run build`
2. [ ] Check for TypeScript errors
3. [ ] Check for console warnings

**After Deploy:**
1. [ ] Open https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/dao/2ouva-viaaa-aaaaq-qaamq-cai/settings as anonymous
2. [ ] Verify Station Information loads
3. [ ] Verify Cycle amounts display correctly (not NaN)
4. [ ] Verify Dates display correctly (not Invalid Date)
5. [ ] Click "Run Security Checks"
6. [ ] Verify security score displays (0-100%)
7. [ ] Verify checklist items appear
8. [ ] Verify write operations show "Sign in" messages
9. [ ] Click "Show Request Policies"
10. [ ] Verify policies display correctly

### E2E Testing

```bash
cd daopad_frontend
npx playwright test e2e/settings.spec.ts
```

Expected: All tests pass (5/5)

## Backend Verification

These backend methods already support anonymous access (no changes needed):

```rust
// orbit.rs line 55
#[update]
pub async fn get_orbit_system_info(token_canister_id: Principal)
    -> Result<SystemInfoResponse, String>

// orbit_security.rs line 1525
#[update]
pub async fn perform_security_check(station_id: Principal)
    -> Result<EnhancedSecurityDashboard, String>

// orbit_security.rs line 1539
#[update]
pub async fn get_request_policies_details(station_id: Principal)
    -> Result<RequestPoliciesDetails, String>
```

All methods:
- Use `#[update]` (support cross-canister calls)
- Take only Principal parameters (no identity required)
- Backend acts as admin proxy to Orbit Station

## Success Criteria

- [ ] Anonymous users can view Settings tab
- [ ] System information loads without errors
- [ ] Security dashboard loads and displays score
- [ ] All BigInt values display correctly (no NaN)
- [ ] Write operations show "Sign in" messages
- [ ] E2E tests pass (5/5)
- [ ] No console errors about authentication
- [ ] PR created and tests pass in CI

## References

- PR #95: Treasury Dashboard Loading Fix
- `PLAYWRIGHT_TESTING_GUIDE.md`: E2E testing patterns
- `CLAUDE.md`: Deployment and testing guidelines
- Plan-Pursuit Methodology: `plan-pursuit-methodology-condensed.md`

## Common Pitfalls to Avoid

1. **Don't forget BigInt conversions** - Backend returns `nat64` as BigInt
2. **Pass tokenId not stationId** to `getSystemInfo()` - Backend expects `token_canister_id`
3. **Remove identity from useEffect deps** - Causes unnecessary re-renders
4. **Disable buttons, don't hide UI** - Anonymous users should see what they're missing
5. **Test with deployed code** - Local changes don't reflect real IC behavior

## Deployment Sequence

```bash
# 1. Build frontend
cd daopad_frontend
npm run build
cd ..

# 2. Deploy frontend only (no backend changes)
./deploy.sh --network ic --frontend-only

# 3. Wait for deployment (2-3 minutes)
# Deployment URL: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io

# 4. Run E2E tests
cd daopad_frontend
npx playwright test e2e/settings.spec.ts

# 5. If tests pass → Create PR
# 6. If tests fail → Check console, fix, GOTO step 1
```
