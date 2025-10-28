# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-fix-routing/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-fix-routing/src/daopad`
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
   git commit -m "Fix: Routing Architecture - Prevent Tab Redirect Loops"
   git push -u origin feature/fix-routing-architecture
   gh pr create --title "Fix: Routing Architecture - Prevent Tab Redirect Loops" --body "Implements ROUTING_FIX_PLAN.md

## Problem
Users clicking on project tabs (settings, activity, etc.) get redirected to /app page instead of staying on the tab.

## Root Causes
1. Ambiguous URL parameter - /:stationId used for both station IDs AND token IDs
2. Fragile tab link generation depending on orbitStation state
3. DaoRoute useEffect re-triggering on navigation causing data refetches
4. Overly aggressive error handling redirecting to /app

## Solution
- Use token ID as primary URL parameter (/:tokenId)
- Store station ID separately in route state/context
- Prevent unnecessary re-fetches when navigating tabs
- Add defensive checks for undefined stationId in tab links
- Improve error handling granularity

## Testing
- Manual browser testing on mainnet
- Verify tab navigation works for linked stations
- Verify tab navigation works for unlinked tokens
- Check console for errors during navigation
"
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

**Branch:** `feature/fix-routing-architecture`
**Worktree:** `/home/theseus/alexandria/daopad-fix-routing/src/daopad`

---

# Implementation Plan: Fix Routing Architecture

## Problem Statement

Users visiting a project page (e.g., `https://...icp0.io/ryjl3-tyaaa-aaaaa-aaaba-cai`) can view the overview tab, but clicking on other tabs like "Settings" or "Activity" causes an unwanted redirect to `/app` instead of navigating to the tab content.

## Current State

### File Structure
```
daopad_frontend/src/
├── App.tsx                           # Route definitions
├── routes/
│   ├── AppRoute.tsx                  # /app dashboard route
│   ├── DaoRoute.tsx                  # /:stationId parent route
│   └── dao/
│       ├── DaoOverview.tsx           # /:stationId (index)
│       ├── DaoSettings.tsx           # /:stationId/settings
│       ├── DaoActivity.tsx           # /:stationId/activity
│       ├── DaoTreasury.tsx           # /:stationId/treasury
│       ├── DaoCanisters.tsx          # /:stationId/canisters
│       └── DaoAgreement.tsx          # /:stationId/agreement
└── components/
    └── dao/
        └── DaoLayout.tsx             # Layout with tab navigation
```

### Current Route Structure (App.tsx:25-38)
```tsx
<Routes>
  <Route path="/" element={<Homepage />} />
  <Route path="/app" element={<AppRoute />} />
  <Route path="/agreement/:stationId" element={<OperatingAgreement />} />

  {/* Station routes - using station ID as primary identifier */}
  <Route path="/:stationId" element={<DaoRoute />}>
    <Route index element={<DaoOverview />} />
    <Route path="agreement" element={<DaoAgreement />} />
    <Route path="treasury" element={<DaoTreasury />} />
    <Route path="activity" element={<DaoActivity />} />
    <Route path="canisters" element={<DaoCanisters />} />
    <Route path="settings" element={<DaoSettings />} />
  </Route>
</Routes>
```

### Current DaoRoute Logic (DaoRoute.tsx:35-183)

**Key Issues:**
1. **Ambiguous URL parameter**: `/:stationId` param is used for BOTH:
   - Orbit Station IDs (when token is linked)
   - Token IDs (when token has no station)

2. **Complex lookup logic** (lines 56-78):
   - Tries reverse lookup: station ID → token ID
   - If fails, assumes it's a token ID
   - Checks if token has station → redirects with `window.location.href`
   - This logic re-runs on EVERY navigation

3. **useEffect dependency** (line 183):
   ```tsx
   useEffect(() => { loadStation(); }, [stationId, identity, isAuthenticated]);
   ```
   - Triggers on stationId change
   - But stationId comes from URL params
   - When navigating `/ryjl3.../settings` → `/ryjl3.../activity`, stationId STAYS THE SAME
   - So why is it re-fetching?

4. **Tab link generation** (DaoLayout.tsx:27, 99):
   ```tsx
   const stationId = orbitStation?.station_id;
   // ...
   <TabButton to={`/${stationId}/settings`} active={...}>
   ```
   - If `orbitStation` is null/undefined, `stationId` becomes `undefined`
   - Tab links become `/${undefined}/settings` → INVALID ROUTE
   - React Router treats as 404 → potential redirect

5. **Aggressive error handling** (DaoRoute.tsx:394):
   ```tsx
   if (error || !token) {
     return <Navigate to="/app" replace />;
   }
   ```
   - ANY error redirects to `/app`
   - No granularity in error handling
   - Unclear what triggers `error` state during tab navigation

### Root Cause Analysis

**Primary Issue: Race Condition in Tab Navigation**

When user clicks a tab:
1. React Router updates URL: `/ryjl3.../` → `/ryjl3.../settings`
2. DaoRoute component doesn't remount (same parent route)
3. BUT the nested route changes, causing re-render
4. DaoLayout reads `orbitStation?.station_id` to build tab links
5. If `orbitStation` is temporarily undefined during re-render → `stationId` is undefined
6. Tab links become broken: `/${undefined}/settings`
7. React Router can't match route → treats as error
8. DaoRoute error handling kicks in → redirects to `/app`

**Secondary Issues:**
- **Unnecessary data fetching**: useEffect runs even when data is already loaded
- **window.location.href usage**: Forces full page reload instead of client-side navigation
- **Ambiguous URL scheme**: Mixing station IDs and token IDs in same param causes confusion

## Implementation Plan

### Phase 1: Stabilize Tab Link Generation

**File: `daopad_frontend/src/components/dao/DaoLayout.tsx`**

**Current code (lines 24-30):**
```tsx
const location = useLocation();
const pathParts = location.pathname.split('/');
const currentTab = pathParts[pathParts.length - 1];
const stationId = orbitStation?.station_id;  // ❌ Can be undefined

// Determine if we're on the overview (base station route)
const isOverview = pathParts.length === 2 || currentTab === stationId;
```

**Fix: Use URL param as source of truth**
```tsx
// PSEUDOCODE
const location = useLocation();
const pathParts = location.pathname.split('/');
const currentTab = pathParts[pathParts.length - 1];

// Get the base route param from URL (source of truth)
const baseRouteId = pathParts[1];  // The /:stationId param from URL

// Determine if we're on the overview
const isOverview = pathParts.length === 2 || currentTab === baseRouteId;

// Build tab links using the URL param, not derived state
const tabLinks = {
  overview: `/${baseRouteId}`,
  agreement: `/${baseRouteId}/agreement`,
  treasury: `/${baseRouteId}/treasury`,
  activity: `/${baseRouteId}/activity`,
  canisters: `/${baseRouteId}/canisters`,
  settings: `/${baseRouteId}/settings`
};
```

**Updated TabButton usage (lines 99-116):**
```tsx
// PSEUDOCODE - Replace hardcoded string interpolation with computed links
<TabButton to={tabLinks.overview} active={isOverview}>
  Overview
</TabButton>
<TabButton to={tabLinks.agreement} active={currentTab === 'agreement'}>
  Agreement
</TabButton>
<TabButton to={tabLinks.treasury} active={currentTab === 'treasury'}>
  Treasury
</TabButton>
<TabButton to={tabLinks.activity} active={currentTab === 'activity'}>
  Activity
</TabButton>
<TabButton to={tabLinks.canisters} active={currentTab === 'canisters'}>
  Canisters
</TabButton>
<TabButton to={tabLinks.settings} active={currentTab === 'settings'}>
  Settings
</TabButton>
```

**Why this fixes the issue:**
- Tab links no longer depend on `orbitStation` state
- Uses URL param (always defined) as source of truth
- Eliminates race condition between state updates and link generation

### Phase 2: Optimize DaoRoute Data Fetching

**File: `daopad_frontend/src/routes/DaoRoute.tsx`**

**Current problem (lines 35-183):**
```tsx
useEffect(() => {
  async function loadStation() {
    // ... complex logic that runs on every render
  }
  loadStation();
}, [stationId, identity, isAuthenticated]);  // ❌ Re-runs unnecessarily
```

**Fix: Add loading guard and memoization**
```tsx
// PSEUDOCODE

// Add ref to track if data is already loaded for this stationId
const loadedStationRef = useRef<string | null>(null);
const isMountedRef = useRef(false);

useEffect(() => {
  // Prevent double-fetch on mount (React 18 StrictMode)
  if (!isMountedRef.current) {
    isMountedRef.current = true;
    return;
  }

  async function loadStation() {
    if (!stationId) {
      setError('No station ID provided');
      setLoading(false);
      return;
    }

    // Skip if we already loaded this station
    if (loadedStationRef.current === stationId && token) {
      console.log('[DaoRoute] Data already loaded for:', stationId);
      return;
    }

    // Mark as loading
    setLoading(true);
    loadedStationRef.current = stationId;

    try {
      // ... existing fetch logic

      // Success - keep loaded reference
      console.log('[DaoRoute] Successfully loaded:', stationId);
    } catch (e) {
      // Clear loaded reference on error
      loadedStationRef.current = null;
      console.error('[DaoRoute] Error loading station:', e);
      setError('Failed to load station data');
    } finally {
      setLoading(false);
    }
  }

  loadStation();
}, [stationId, identity, isAuthenticated]);
```

**Why this helps:**
- Prevents redundant API calls when navigating tabs
- Reduces chance of race conditions
- Improves performance

### Phase 3: Improve Error Handling

**File: `daopad_frontend/src/routes/DaoRoute.tsx`**

**Current code (line 394):**
```tsx
if (error || !token) {
  return <Navigate to="/app" replace />;
}
```

**Fix: More granular error handling**
```tsx
// PSEUDOCODE

// At the end of DaoRoute, before rendering DaoLayout:

// Special case: station has no token linked (expected state)
if (error === 'no-station' && token) {
  // Render the link station UI (already handled)
  return <DaoLayout ...>{ /* link UI */ }</DaoLayout>;
}

// Critical error: no token found or invalid station ID
if (!token) {
  console.error('[DaoRoute] No token found for station:', stationId);
  return <Navigate to="/app" replace />;
}

// Network/API error but we have cached token data
if (error && token) {
  console.warn('[DaoRoute] Error loading station, showing cached data:', error);
  // Render with cached data and error banner
  return (
    <DaoLayout token={token} orbitStation={orbitStation} ...>
      <div className="bg-red-500/10 border border-red-500/30 rounded p-4 mb-4">
        <p className="text-red-500">Error loading latest data. Showing cached information.</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
      <Outlet context={{...}} />
    </DaoLayout>
  );
}

// Default: render normally
return (
  <DaoLayout token={token} orbitStation={orbitStation} ...>
    <Outlet context={{...}} />
  </DaoLayout>
);
```

**Why this helps:**
- Distinguishes between fatal errors and transient issues
- Provides user feedback instead of silent redirect
- Maintains user context when possible

### Phase 4: Replace window.location.href with React Router

**File: `daopad_frontend/src/routes/DaoRoute.tsx`**

**Current issues (lines 76, 223, 311):**
```tsx
window.location.href = `/${foundStationId}`;  // ❌ Full page reload
window.location.href = `/${linkStationId.trim()}`;  // ❌ Full page reload
window.location.href = '/app';  // ❌ Full page reload
```

**Fix: Use React Router navigation**
```tsx
// PSEUDOCODE

// Add at top of component
import { useNavigate } from 'react-router-dom';

// Inside component
const navigate = useNavigate();

// Replace window.location.href usages:

// Line 76 - Token has station, redirect to it
if (stationForTokenResult.success && stationForTokenResult.data) {
  const foundStationId = stationForTokenResult.data.toString();
  console.log('[DaoRoute] Found station for token, redirecting:', foundStationId);
  navigate(`/${foundStationId}`, { replace: true });
  return;
}

// Line 223 - Station link successful
if (result.success) {
  setShowLinkDialog(false);
  setLinkStationId('');
  setLinkError('');
  navigate(`/${linkStationId.trim()}`, { replace: true });
}

// Line 311 - Return to dashboard button
<button
  onClick={() => navigate('/app')}
  className="text-executive-lightGray/60 hover:text-executive-gold underline text-sm"
>
  Return to Dashboard
</button>
```

**Why this helps:**
- Client-side navigation (faster)
- Preserves React state
- Better user experience (no flash/reload)

### Phase 5: Add Defensive Checks

**File: `daopad_frontend/src/components/dao/DaoLayout.tsx`**

**Add validation before rendering:**
```tsx
// PSEUDOCODE

export default function DaoLayout({ token, orbitStation, ... }) {
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);

  // Defensive check: ensure we have a base route ID
  if (pathParts.length === 0) {
    console.error('[DaoLayout] Invalid path:', location.pathname);
    return <Navigate to="/app" replace />;
  }

  const baseRouteId = pathParts[0];
  const currentTab = pathParts.length > 1 ? pathParts[pathParts.length - 1] : baseRouteId;
  const isOverview = pathParts.length === 1;

  // Build stable tab links
  const tabLinks = {
    overview: `/${baseRouteId}`,
    agreement: `/${baseRouteId}/agreement`,
    // ... etc
  };

  // Continue with render...
}
```

**Why this helps:**
- Catches edge cases early
- Provides clear error messages for debugging
- Fails gracefully instead of rendering broken UI

## Testing Plan

### Manual Testing Workflow (MANDATORY BEFORE PLAYWRIGHT)

Since this is a routing fix with navigation logic, manual browser testing is required first.

#### Test Environment
- **URL**: `https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io`
- **Test Stations**:
  - Linked station: `ryjl3-tyaaa-aaaaa-aaaba-cai` (or any available linked station)
  - Unlinked token: (use any token without station)

#### Test Cases

**1. Linked Station - Tab Navigation**
```bash
# Open browser console (F12)
# Navigate to station page
https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/ryjl3-tyaaa-aaaaa-aaaba-cai

# Test each tab:
1. Click "Settings" tab → Should stay on /ryjl3.../settings
2. Click "Activity" tab → Should stay on /ryjl3.../activity
3. Click "Treasury" tab → Should stay on /ryjl3.../treasury
4. Click "Canisters" tab → Should stay on /ryjl3.../canisters
5. Click "Agreement" tab → Should stay on /ryjl3.../agreement
6. Click "Overview" tab → Should return to /ryjl3.../ (index)

# Expected: NO redirects to /app, NO console errors
# Check console: Should see "[DaoRoute] Data already loaded for: ryjl3..."
```

**2. Console Error Inspection**
```bash
# During tab navigation, check console for:
# ❌ Errors: "Cannot read property 'station_id' of undefined"
# ❌ Warnings: "Failed to load station data"
# ❌ Network errors: Failed fetch requests
# ❌ React errors: "Cannot update component while rendering"
# ✅ Should see: "[DaoRoute] Data already loaded for: ..."
```

**3. Unlinked Token - Navigation**
```bash
# Navigate to unlinked token page
https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/[TOKEN_ID]

# Should show: "No Orbit Station Linked" UI
# Tabs should still work (though limited)
# Check console for errors
```

**4. Browser Back/Forward**
```bash
# Navigate through tabs: Overview → Settings → Activity
# Press browser back button
# Expected: Should navigate back to Settings (not /app)
# Press browser forward button
# Expected: Should navigate forward to Activity
```

**5. Direct URL Access**
```bash
# Close browser tab
# Open new tab with direct URL:
https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/ryjl3-tyaaa-aaaaa-aaaba-cai/settings

# Expected: Should load Settings tab directly (not redirect to overview or /app)
# Check console: Should see data fetch for station
```

### Exit Criteria

**STOP iterating when ALL of these are true:**
1. ✅ All 5 test cases pass without redirects to `/app`
2. ✅ Console has NO errors during tab navigation
3. ✅ Browser back/forward works correctly
4. ✅ Direct URL access to tabs works
5. ✅ No "Data already loaded" message repeats unnecessarily

**If ANY test fails:**
1. Note which test failed and the specific error
2. Check browser console for error messages
3. Add console.log in DaoRoute and DaoLayout to trace execution
4. Form hypothesis about root cause
5. Make targeted fix
6. Deploy: `./deploy.sh --network ic --frontend-only`
7. Wait 60s for deployment
8. Re-run ALL tests from start

### Playwright E2E Tests (OPTIONAL)

Since this involves navigation and auth, Playwright tests would be limited. If needed:

```typescript
// PSEUDOCODE - daopad_frontend/e2e/tab-navigation.spec.ts

import { test, expect } from '@playwright/test';

test.describe('DAO Tab Navigation', () => {
  test('should navigate between tabs without redirecting', async ({ page }) => {
    // Navigate to station page
    await page.goto('/ryjl3-tyaaa-aaaaa-aaaba-cai');

    // Wait for page load
    await expect(page.locator('h1')).toContainText('Treasury');

    // Click Settings tab
    await page.click('text=Settings');
    await expect(page).toHaveURL(/\/ryjl3.*\/settings/);
    await expect(page).not.toHaveURL('/app');

    // Click Activity tab
    await page.click('text=Activity');
    await expect(page).toHaveURL(/\/ryjl3.*\/activity/);
    await expect(page).not.toHaveURL('/app');

    // Click Treasury tab
    await page.click('text=Treasury');
    await expect(page).toHaveURL(/\/ryjl3.*\/treasury/);
    await expect(page).not.toHaveURL('/app');
  });

  test('should support direct URL access to tabs', async ({ page }) => {
    // Direct navigation to settings tab
    await page.goto('/ryjl3-tyaaa-aaaaa-aaaba-cai/settings');

    // Should load settings, not redirect
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page).not.toHaveURL('/app');
  });
});
```

## Implementation Checklist

- [ ] Phase 1: Stabilize tab link generation (DaoLayout.tsx)
- [ ] Phase 2: Optimize data fetching (DaoRoute.tsx)
- [ ] Phase 3: Improve error handling (DaoRoute.tsx)
- [ ] Phase 4: Replace window.location.href (DaoRoute.tsx)
- [ ] Phase 5: Add defensive checks (DaoLayout.tsx)
- [ ] Deploy to mainnet: `./deploy.sh --network ic --frontend-only`
- [ ] Manual browser testing (all 5 test cases)
- [ ] Console error inspection
- [ ] Browser back/forward testing
- [ ] Direct URL access testing
- [ ] (Optional) Playwright tests

## Success Criteria

1. Users can navigate between all tabs without unexpected redirects
2. Tab links remain stable during component re-renders
3. Data fetching only occurs when necessary (not on every tab click)
4. Error handling provides feedback without losing user context
5. Browser navigation (back/forward) works correctly
6. Console is free of errors during normal navigation

## Notes

- This is a **REFACTORING task** focused on fixing existing behavior
- Goal is **negative LOC**: simplifying complex logic
- Do NOT add new features or infrastructure
- Focus on stability and predictability
- Test thoroughly before creating PR
