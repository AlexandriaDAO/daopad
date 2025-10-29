# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-invoice-tab-fix/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-invoice-tab-fix/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Test**:
   ```bash
   cd daopad_frontend
   npm run build
   ```
4. **Deploy**:
   ```bash
   cd /home/theseus/alexandria/daopad-invoice-tab-fix/src/daopad
   ./deploy.sh --network ic
   ```
5. **Manual verification** (MANDATORY):
   - Navigate to https://daopad.org/fec7w-zyaaa-aaaaa-qaffq-cai/invoices
   - Verify page loads without white screen
   - Verify no console errors
   - Verify "Invoices Tab" heading displays
6. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "Fix: Add missing Invoices route to App.tsx

- Register DaoInvoices route in App.tsx router config
- Fixes white screen of death when clicking Invoices tab
- Route was defined in DaoLayout.tsx but missing from App.tsx
- Resolves 'No routes matched location' error

Fixes the invoice tab integration issue."
   git push -u origin feature/invoice-tab-fix
   gh pr create --title "Fix: Register Missing Invoices Route" --body "$(cat <<'EOF'
## Summary
- Adds missing Invoices route to App.tsx
- Fixes white screen when clicking Invoices tab
- Route exists in DaoLayout but wasn't registered in router

## Root Cause
The Invoices tab link was added to DaoLayout.tsx (line 141-143) but the corresponding route was never registered in App.tsx. When users clicked the tab, React Router couldn't match the URL path `/[stationId]/invoices`, resulting in "No routes matched location" error.

## Changes
- **App.tsx**: Import DaoInvoices component and add route under `/:stationId` path

## Test Plan
- [x] Build frontend successfully
- [x] Deploy to mainnet
- [x] Navigate to https://daopad.org/fec7w-zyaaa-aaaaa-qaffq-cai/invoices
- [x] Verify page loads without errors
- [x] Verify no console errors in browser
- [x] Verify tab navigation works properly

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
   ```
7. **Iterate autonomously**:
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

**Branch:** `feature/invoice-tab-fix`
**Worktree:** `/home/theseus/alexandria/daopad-invoice-tab-fix/src/daopad`

---

# Implementation Plan: Fix Missing Invoices Route

## Task Classification
**BUG FIX**: Restore broken behavior with minimal changes

## Current State Documentation

### Problem Description
The Invoices tab causes white screen of death with these errors:
```
No routes matched location "/fec7w-zyaaa-aaaaa-qaffq-cai/invoices"
TypeError: can't access property "then", a.default.detectStore(...) is undefined (h1-check.js)
```

### Root Cause Analysis
1. **DaoLayout.tsx:49** - Invoices tab link is defined:
   ```typescript
   invoices: `/${baseRouteId}/invoices`
   ```

2. **DaoLayout.tsx:141-143** - Tab button is rendered:
   ```typescript
   <TabButton to={tabLinks.invoices} active={currentTab === 'invoices'}>
     Invoices
   </TabButton>
   ```

3. **routes/dao/DaoInvoices.tsx** - Component exists with placeholder content

4. **App.tsx:31-38** - BUT no route registered for "invoices" path:
   ```typescript
   <Route path="/:stationId" element={<DaoRoute />}>
     <Route index element={<DaoOverview />} />
     <Route path="agreement" element={<DaoAgreement />} />
     <Route path="treasury" element={<DaoTreasury />} />
     <Route path="activity" element={<DaoActivity />} />
     <Route path="canisters" element={<DaoCanisters />} />
     {/* ❌ MISSING: invoices route */}
     <Route path="settings" element={<DaoSettings />} />
   </Route>
   ```

### File Tree (Before)
```
daopad_frontend/src/
├── App.tsx                        [MODIFY - Add invoices route]
├── routes/
│   ├── dao/
│   │   ├── DaoActivity.tsx        [✓ Has route]
│   │   ├── DaoAgreement.tsx       [✓ Has route]
│   │   ├── DaoCanisters.tsx       [✓ Has route]
│   │   ├── DaoInvoices.tsx        [✓ Component exists, ❌ NO ROUTE]
│   │   ├── DaoOverview.tsx        [✓ Has route]
│   │   ├── DaoSettings.tsx        [✓ Has route]
│   │   └── DaoTreasury.tsx        [✓ Has route]
│   └── DaoRoute.tsx               [No changes needed]
└── components/dao/
    └── DaoLayout.tsx              [No changes needed - tab already exists]
```

### File Tree (After)
```
daopad_frontend/src/
├── App.tsx                        [✓ MODIFIED - Invoices route registered]
├── routes/
│   ├── dao/
│   │   └── DaoInvoices.tsx        [✓ Component + Route = WORKING]
```

## Implementation Steps

### Step 1: Add DaoInvoices Import to App.tsx

**File:** `daopad_frontend/src/App.tsx` (MODIFY)

```typescript
// PSEUDOCODE
// Add after line 18 (after DaoSettings import)

import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { FallbackLoader } from './components/ui/fallback-loader';
import LazyLoadErrorBoundary from './components/errors/LazyLoadErrorBoundary';

const Homepage = lazy(() => import('./routes/Homepage'));
const AppRoute = lazy(() => import('./routes/AppRoute'));
const OperatingAgreement = lazy(() => import('./routes/OperatingAgreement'));

// New DAO routes
const DaoRoute = lazy(() => import('./routes/DaoRoute'));
const DaoOverview = lazy(() => import('./routes/dao/DaoOverview'));
const DaoAgreement = lazy(() => import('./routes/dao/DaoAgreement'));
const DaoTreasury = lazy(() => import('./routes/dao/DaoTreasury'));
const DaoActivity = lazy(() => import('./routes/dao/DaoActivity'));
const DaoCanisters = lazy(() => import('./routes/dao/DaoCanisters'));
const DaoSettings = lazy(() => import('./routes/dao/DaoSettings'));
const DaoInvoices = lazy(() => import('./routes/dao/DaoInvoices'));  // ADD THIS LINE

function App() {
  // ... rest of component
}
```

**Action:** Add lazy import for DaoInvoices after line 18

### Step 2: Register Invoices Route

**File:** `daopad_frontend/src/App.tsx` (MODIFY)

```typescript
// PSEUDOCODE
// Add route after line 37 (after canisters route, before settings route)

function App() {
  return (
    <Router>
      <LazyLoadErrorBoundary>
        <Suspense fallback={<FallbackLoader />}>
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
              <Route path="invoices" element={<DaoInvoices />} />  {/* ADD THIS LINE */}
              <Route path="settings" element={<DaoSettings />} />
            </Route>
          </Routes>
        </Suspense>
      </LazyLoadErrorBoundary>
    </Router>
  );
}
```

**Action:** Add route registration between canisters and settings routes

## Testing Strategy

### Build Verification
```bash
cd daopad_frontend
npm run build
```

**Expected:** Clean build with no errors

### Deploy to Mainnet
```bash
cd /home/theseus/alexandria/daopad-invoice-tab-fix/src/daopad
./deploy.sh --network ic
```

**Expected:** Frontend deploys successfully

### Manual Browser Testing (MANDATORY)

**Test 1: Direct Navigation**
1. Open browser to https://daopad.org/fec7w-zyaaa-aaaaa-qaffq-cai/invoices
2. ✅ Page loads (no white screen)
3. ✅ Shows "Invoices Tab" heading
4. ✅ No console errors

**Test 2: Tab Navigation**
1. Navigate to https://daopad.org/fec7w-zyaaa-aaaaa-qaffq-cai
2. Click "Invoices" tab
3. ✅ URL changes to `/invoices` subroute
4. ✅ Page renders without errors
5. ✅ Tab is highlighted as active

**Test 3: Tab Switching**
1. Navigate to Invoices tab
2. Click Treasury tab
3. Click back to Invoices tab
4. ✅ All navigation works smoothly
5. ✅ No console errors

### Console Error Check (MANDATORY)
After each test:
```bash
# In browser DevTools Console
# Check for any errors - there should be NONE
```

**Expected:**
- ❌ No "No routes matched location" errors
- ❌ No "h1-check.js" errors
- ❌ No React routing errors

### Exit Criteria
- ✅ Build succeeds
- ✅ Deploy succeeds
- ✅ Direct navigation to /invoices works
- ✅ Tab clicking works
- ✅ No console errors
- ✅ Tab highlighting works correctly

## Files Changed Summary

| File | Lines Changed | Description |
|------|---------------|-------------|
| `daopad_frontend/src/App.tsx` | +2 lines | Add DaoInvoices import and route |

**Total Changes:** 2 lines added, 0 files deleted

## Why This Fix Works

1. **React Router Match:** Adding the route tells React Router how to handle `/[stationId]/invoices` URLs
2. **Component Already Exists:** DaoInvoices.tsx is ready and follows the same pattern as other tabs
3. **DaoLayout Integration:** The tab link in DaoLayout already points to the correct URL - we're just connecting it
4. **Minimal Change:** Only touches App.tsx routing config, no architectural changes
5. **Follows Pattern:** Matches the exact pattern of treasury, activity, canisters, settings tabs

## Why h1-check.js Error Will Disappear

The h1-check.js error is likely a side effect of:
1. React Router failing to match the route
2. Error boundary catching the routing error
3. Some dependency trying to access Redux store during error state

Once the route is registered, React Router will successfully match the URL and render DaoInvoices, preventing the error cascade that triggers h1-check.js issues.

## Verification Commands

```bash
# Check route is registered
grep -n "DaoInvoices" daopad_frontend/src/App.tsx

# Verify component exists
ls -la daopad_frontend/src/routes/dao/DaoInvoices.tsx

# Check build artifacts
cd daopad_frontend && npm run build
```

## Risk Assessment
**Risk Level:** ⭐ MINIMAL (Single route registration)

- ✅ No breaking changes
- ✅ No data model changes
- ✅ No API changes
- ✅ No authentication changes
- ✅ Follows established pattern
- ✅ Component already tested (exists in codebase)

## Rollback Plan
If issues occur:
```bash
# Revert the commit
git revert HEAD
git push

# Or manually remove the two lines added to App.tsx
```
