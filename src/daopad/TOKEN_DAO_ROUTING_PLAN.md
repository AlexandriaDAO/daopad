# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-routing-refactor/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-routing-refactor/src/daopad`
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
   git commit -m "[Feature]: Token DAO Routing - Direct Access to DAOs and Tabs"
   git push -u origin feature/token-dao-routing
   gh pr create --title "[Feature]: Token DAO Routing - Direct Access to DAOs and Tabs" --body "Implements TOKEN_DAO_ROUTING_PLAN.md

## Summary
- Each token DAO accessible via /dao/:tokenId
- Each tab accessible via /dao/:tokenId/:tab
- Default view shows basic DAO overview
- Playwright tests can now directly access any DAO/tab

## Testing
- E2E tests updated to use new routes
- All existing functionality preserved
- Better URL structure for sharing/bookmarking"
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

**Branch:** `feature/token-dao-routing`
**Worktree:** `/home/theseus/alexandria/daopad-routing-refactor/src/daopad`

---

# Implementation Plan: Token DAO Routing

## Current State

### File Structure
```
daopad_frontend/
├── src/
│   ├── App.tsx                      # Router configuration (3 routes)
│   ├── routes/
│   │   ├── Homepage.tsx             # Landing page (/)
│   │   ├── AppRoute.tsx             # Main app (/app) - auth + token selection
│   │   └── OperatingAgreement.tsx   # Agreement (/agreement/:stationId)
│   └── components/
│       ├── TokenTabs.tsx            # Token selection + data loading
│       └── TokenDashboard.tsx       # Tab UI (Agreement/Treasury/Activity/Canisters/Settings)
```

### Current Routing Architecture
```javascript
// App.tsx:16-19
<Routes>
  <Route path="/" element={<Homepage />} />
  <Route path="/app" element={<AppRoute />} />
  <Route path="/agreement/:stationId" element={<OperatingAgreement />} />
</Routes>
```

### Current Component Hierarchy
```
AppRoute (auth check + token selection)
  └── TokenTabs (multi-token management)
        └── TokenDashboard (tabs: Agreement, Treasury, Activity, Canisters, Settings)
              └── Tab components (state-based rendering: activeTab === 'accounts')
```

### Current Tab Implementation
```javascript
// TokenDashboard.tsx:425-502
<Tabs defaultValue="agreement" onValueChange={(value) => setActiveTab(value)}>
  <TabsList>
    <TabsTrigger value="agreement">Agreement</TabsTrigger>
    <TabsTrigger value="accounts">Treasury</TabsTrigger>
    <TabsTrigger value="activity">Activity</TabsTrigger>
    <TabsTrigger value="canisters">Canisters</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>

  <TabsContent value="accounts">
    {activeTab === 'accounts' && <AccountsTable ... />}
  </TabsContent>
  <!-- Other tabs -->
</Tabs>
```

### Anonymous User Behavior
```javascript
// AppRoute.tsx:261-297
// Anonymous users see public dashboard with selectedTokenId state
{selectedTokenId ? (
  <TokenDashboard tokenId={selectedTokenId} isReadOnly={true} />
) : (
  <PublicStatsStrip />
  <PublicActivityFeed />
  <TreasuryShowcase onSelectToken={setSelectedTokenId} />
)}
```

### Problems
1. **No direct DAO access**: Can't share/bookmark specific DAO (e.g., /dao/alex-token)
2. **No direct tab access**: Playwright tests can't navigate directly to Treasury tab
3. **State-based routing**: URL doesn't reflect current view (/app for everything)
4. **Anonymous user friction**: Clicking token updates local state, not URL

## Design: New Routing Architecture

### New URL Structure
```
/                              # Homepage (unchanged)
/app                           # Main dashboard (auth + token list)
/dao/:tokenId                  # DAO overview (default view: basic info + tabs)
/dao/:tokenId/agreement        # Agreement tab
/dao/:tokenId/treasury         # Treasury tab (accounts + address book)
/dao/:tokenId/activity         # Activity tab (unified requests)
/dao/:tokenId/canisters        # Canisters tab
/dao/:tokenId/settings         # Settings tab
/agreement/:stationId          # Standalone agreement (deprecated but keep for compatibility)
```

### New Component Hierarchy
```
App.tsx (router)
├── Homepage (/)
├── AppRoute (/app)
│     └── TokenList (shows all tokens, links to /dao/:tokenId)
├── DaoRoute (/dao/:tokenId)
│     ├── DaoOverview (default: /dao/:tokenId)
│     ├── DaoAgreement (/dao/:tokenId/agreement)
│     ├── DaoTreasury (/dao/:tokenId/treasury)
│     ├── DaoActivity (/dao/:tokenId/activity)
│     ├── DaoCanisters (/dao/:tokenId/canisters)
│     └── DaoSettings (/dao/:tokenId/settings)
└── OperatingAgreement (/agreement/:stationId) [deprecated]
```

### Benefits
1. **Direct access**: `https://daopad.icp0.io/dao/alex-token/treasury` goes straight to treasury
2. **Shareable**: Users can share specific DAO views
3. **Bookmarkable**: Browser history shows actual pages visited
4. **Playwright-friendly**: Tests can navigate directly: `page.goto('/dao/test-token/treasury')`
5. **SEO-friendly**: Each DAO/tab has unique URL
6. **Works for anonymous users**: URL-based routing instead of local state

## Implementation

### Phase 1: New Route Components

#### File: `daopad_frontend/src/routes/DaoRoute.tsx` (NEW)
```javascript
// PSEUDOCODE
import { useParams, Outlet, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { getTokenService } from '../services/backend';
import DaoLayout from '../components/dao/DaoLayout';

export default function DaoRoute() {
  const { tokenId } = useParams(); // Extract tokenId from URL
  const { identity, isAuthenticated } = useSelector(state => state.auth);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orbitStation, setOrbitStation] = useState(null);

  useEffect(() => {
    // Load token data (works for both authenticated and anonymous)
    async function loadToken() {
      const tokenService = getTokenService(identity);
      const principal = Principal.fromText(tokenId);

      // Fetch station info
      const stationResult = await tokenService.getStationForToken(principal);
      if (stationResult.success && stationResult.data) {
        setOrbitStation({
          station_id: stationResult.data.toString(),
          name: `${tokenId} Treasury`
        });
      }

      // Fetch token metadata if authenticated
      if (isAuthenticated) {
        const metadataResult = await tokenService.getTokenMetadata(principal);
        setToken(metadataResult.data);
      } else {
        // Anonymous users get basic token object
        setToken({
          canister_id: tokenId,
          symbol: tokenId.slice(0, 5).toUpperCase(),
          name: 'Token'
        });
      }

      setLoading(false);
    }

    loadToken();
  }, [tokenId, identity]);

  if (loading) return <LoadingSpinner />;
  if (!token) return <Navigate to="/app" />;

  // Render layout with token data (shared across all tab routes)
  return (
    <DaoLayout token={token} orbitStation={orbitStation}>
      <Outlet context={{ token, orbitStation, identity, isAuthenticated }} />
    </DaoLayout>
  );
}
```

#### File: `daopad_frontend/src/components/dao/DaoLayout.tsx` (NEW)
```javascript
// PSEUDOCODE
import { Link, useLocation } from 'react-router-dom';
import TokenHeader from '../token/TokenHeader';

export default function DaoLayout({ token, orbitStation, children }) {
  const location = useLocation();
  const currentTab = location.pathname.split('/').pop(); // Extract tab from URL

  return (
    <div className="min-h-screen">
      {/* Header with token info */}
      <TokenHeader token={token} orbitStation={orbitStation} />

      {/* Tab navigation (Links instead of Tabs component) */}
      <nav className="flex gap-2 border-b">
        <TabLink to={`/dao/${token.canister_id}`} active={!currentTab || currentTab === token.canister_id}>
          Overview
        </TabLink>
        <TabLink to={`/dao/${token.canister_id}/agreement`} active={currentTab === 'agreement'}>
          Agreement
        </TabLink>
        <TabLink to={`/dao/${token.canister_id}/treasury`} active={currentTab === 'treasury'}>
          Treasury
        </TabLink>
        <TabLink to={`/dao/${token.canister_id}/activity`} active={currentTab === 'activity'}>
          Activity
        </TabLink>
        <TabLink to={`/dao/${token.canister_id}/canisters`} active={currentTab === 'canisters'}>
          Canisters
        </TabLink>
        <TabLink to={`/dao/${token.canister_id}/settings`} active={currentTab === 'settings'}>
          Settings
        </TabLink>
      </nav>

      {/* Tab content (rendered by nested routes) */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

function TabLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={active ? 'tab-active' : 'tab-inactive'}
    >
      {children}
    </Link>
  );
}
```

#### File: `daopad_frontend/src/routes/dao/DaoOverview.tsx` (NEW)
```javascript
// PSEUDOCODE
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import OrbitStationPlaceholder from '../../components/orbit/OrbitStationPlaceholder';

export default function DaoOverview() {
  const { token, orbitStation, identity, isAuthenticated } = useOutletContext();

  return (
    <div className="space-y-6">
      {/* Basic DAO information */}
      <Card>
        <CardContent>
          <h2 className="text-2xl font-bold">{token.symbol} DAO</h2>
          <p className="text-muted-foreground">Token: {token.canister_id}</p>

          {orbitStation ? (
            <div className="mt-4">
              <p>Treasury Station: {orbitStation.station_id}</p>
              <p className="text-sm text-green-600">✓ DAO is operational</p>
            </div>
          ) : (
            <OrbitStationPlaceholder tokenSymbol={token.symbol} />
          )}
        </CardContent>
      </Card>

      {/* Quick stats (if authenticated) */}
      {isAuthenticated && (
        <Card>
          <CardContent>
            <h3>Your Participation</h3>
            {/* Show voting power, proposals created, etc */}
          </CardContent>
        </Card>
      )}

      {/* Navigation cards to tabs */}
      <div className="grid md:grid-cols-3 gap-4">
        <NavCard
          to={`/dao/${token.canister_id}/treasury`}
          title="Treasury"
          description="View accounts and balances"
        />
        <NavCard
          to={`/dao/${token.canister_id}/activity`}
          title="Activity"
          description="Recent proposals and requests"
        />
        <NavCard
          to={`/dao/${token.canister_id}/settings`}
          title="Settings"
          description="Manage DAO configuration"
        />
      </div>
    </div>
  );
}
```

#### Files: Tab Route Components (NEW)
```javascript
// daopad_frontend/src/routes/dao/DaoAgreement.tsx
// PSEUDOCODE
import { useOutletContext } from 'react-router-dom';
import OperatingAgreementTab from '../../components/operating-agreement/OperatingAgreementTab';

export default function DaoAgreement() {
  const { token, orbitStation, identity } = useOutletContext();

  return (
    <OperatingAgreementTab
      tokenId={token.canister_id}
      stationId={orbitStation?.station_id}
      tokenSymbol={token.symbol}
      identity={identity}
    />
  );
}

// daopad_frontend/src/routes/dao/DaoTreasury.tsx
// PSEUDOCODE
import { useOutletContext } from 'react-router-dom';
import AccountsTable from '../../components/tables/AccountsTable';
import AddressBookPage from '../../pages/AddressBookPage';

export default function DaoTreasury() {
  const { token, orbitStation, identity } = useOutletContext();

  if (!orbitStation) {
    return <NoStationMessage tokenSymbol={token.symbol} />;
  }

  return (
    <div className="space-y-6">
      <AccountsTable
        stationId={orbitStation.station_id}
        identity={identity}
        tokenId={token.canister_id}
        tokenSymbol={token.symbol}
      />
      <div className="space-y-4">
        <h3>Saved Addresses</h3>
        <AddressBookPage identity={identity} />
      </div>
    </div>
  );
}

// daopad_frontend/src/routes/dao/DaoActivity.tsx
// PSEUDOCODE
import { useOutletContext } from 'react-router-dom';
import UnifiedRequests from '../../components/orbit/UnifiedRequests';

export default function DaoActivity() {
  const { token, identity } = useOutletContext();

  return <UnifiedRequests tokenId={token.canister_id} identity={identity} />;
}

// daopad_frontend/src/routes/dao/DaoCanisters.tsx
// PSEUDOCODE
import { useOutletContext } from 'react-router-dom';
import CanistersTab from '../../components/canisters/CanistersTab';

export default function DaoCanisters() {
  const { token, orbitStation, identity } = useOutletContext();

  return (
    <CanistersTab
      token={token}
      stationId={orbitStation?.station_id}
      identity={identity}
    />
  );
}

// daopad_frontend/src/routes/dao/DaoSettings.tsx
// PSEUDOCODE
import { useOutletContext } from 'react-router-dom';
import DAOSettings from '../../components/DAOSettings';

export default function DaoSettings() {
  const { token, orbitStation, identity } = useOutletContext();

  return (
    <DAOSettings
      tokenCanisterId={token.canister_id}
      identity={identity}
      stationId={orbitStation?.station_id}
      tokenSymbol={token.symbol}
      tokenId={token.canister_id}
    />
  );
}
```

### Phase 2: Update Router Configuration

#### File: `daopad_frontend/src/App.tsx` (MODIFY)
```javascript
// PSEUDOCODE
import { lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Existing lazy imports
const Homepage = lazy(() => import('./routes/Homepage'));
const AppRoute = lazy(() => import('./routes/AppRoute'));
const OperatingAgreement = lazy(() => import('./routes/OperatingAgreement'));

// NEW lazy imports
const DaoRoute = lazy(() => import('./routes/DaoRoute'));
const DaoOverview = lazy(() => import('./routes/dao/DaoOverview'));
const DaoAgreement = lazy(() => import('./routes/dao/DaoAgreement'));
const DaoTreasury = lazy(() => import('./routes/dao/DaoTreasury'));
const DaoActivity = lazy(() => import('./routes/dao/DaoActivity'));
const DaoCanisters = lazy(() => import('./routes/dao/DaoCanisters'));
const DaoSettings = lazy(() => import('./routes/dao/DaoSettings'));

function App() {
  return (
    <Router>
      <LazyLoadErrorBoundary>
        <Suspense fallback={<FallbackLoader />}>
          <Routes>
            {/* Existing routes */}
            <Route path="/" element={<Homepage />} />
            <Route path="/app" element={<AppRoute />} />
            <Route path="/agreement/:stationId" element={<OperatingAgreement />} />

            {/* NEW: Nested DAO routes */}
            <Route path="/dao/:tokenId" element={<DaoRoute />}>
              <Route index element={<DaoOverview />} />
              <Route path="agreement" element={<DaoAgreement />} />
              <Route path="treasury" element={<DaoTreasury />} />
              <Route path="activity" element={<DaoActivity />} />
              <Route path="canisters" element={<DaoCanisters />} />
              <Route path="settings" element={<DaoSettings />} />
            </Route>
          </Routes>
        </Suspense>
      </LazyLoadErrorBoundary>
    </Router>
  );
}

export default App;
```

### Phase 3: Update AppRoute for Token Selection

#### File: `daopad_frontend/src/routes/AppRoute.tsx` (MODIFY)
```javascript
// PSEUDOCODE
import { useNavigate } from 'react-router-dom';

// Remove selectedTokenId state - use navigation instead
// Replace: const [selectedTokenId, setSelectedTokenId] = useState(null);

function AppRoute() {
  const navigate = useNavigate();

  // When user clicks token, navigate to DAO route instead of updating state
  const handleSelectToken = (tokenId) => {
    navigate(`/dao/${tokenId}`);
  };

  return (
    <div>
      {isAuthenticated ? (
        <TokenTabs identity={identity} />
      ) : (
        <div className="space-y-8">
          <PublicStatsStrip />
          <PublicActivityFeed />
          <TreasuryShowcase onSelectToken={handleSelectToken} />
        </div>
      )}
    </div>
  );
}
```

### Phase 4: Update TokenTabs for Navigation

#### File: `daopad_frontend/src/components/TokenTabs.tsx` (MODIFY)
```javascript
// PSEUDOCODE
import { Link } from 'react-router-dom';

function TokenTabs({ identity }) {
  const [tokens, setTokens] = useState([]);

  // Load tokens...

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Your DAOs</h2>

      {/* Grid of token cards linking to DAO routes */}
      <div className="grid md:grid-cols-3 gap-4">
        {tokens.map(token => (
          <Link
            key={token.canister_id}
            to={`/dao/${token.canister_id}`}
            className="card hover:shadow-lg transition"
          >
            <h3>{token.symbol}</h3>
            <p>{token.name}</p>
            <p className="text-sm">VP: {tokenVotingPowers[token.canister_id]}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

### Phase 5: Update Existing Components

#### File: `daopad_frontend/src/components/TreasuryShowcase.tsx` (MODIFY)
```javascript
// PSEUDOCODE
// Change from onClick to Link navigation

// OLD:
<div onClick={() => onSelectToken(token.canister_id)}>

// NEW:
import { Link } from 'react-router-dom';
<Link to={`/dao/${token.canister_id}`}>
```

#### File: `daopad_frontend/src/components/PublicActivityFeed.tsx` (MODIFY)
```javascript
// PSEUDOCODE
// Add links to proposals' DAOs

import { Link } from 'react-router-dom';

function ProposalCard({ proposal }) {
  return (
    <Card>
      <Link to={`/dao/${proposal.token_id}/activity`}>
        View in {proposal.token_symbol} DAO →
      </Link>
    </Card>
  );
}
```

## Testing

### E2E Test Updates

#### File: `daopad_frontend/e2e/app-route.spec.ts` (MODIFY)
```javascript
// PSEUDOCODE
test('anonymous user can navigate to specific DAO', async ({ page }) => {
  // Navigate directly to DAO
  await page.goto('/dao/alex-token');

  // Verify DAO overview loads
  await expect(page.locator('h2:has-text("ALEX DAO")')).toBeVisible();
});

test('anonymous user can access treasury tab directly', async ({ page }) => {
  // Navigate directly to treasury tab
  await page.goto('/dao/alex-token/treasury');

  // Verify treasury loads
  await expect(page.locator('[data-testid="treasury-overview"]')).toBeVisible();
});
```

#### File: `daopad_frontend/e2e/treasury.spec.ts` (MODIFY)
```javascript
// PSEUDOCODE
test.beforeEach(async ({ page }) => {
  // OLD: Navigate to /app and click through
  // await page.goto('/app');
  // await page.click('text=ALEX Token');
  // await page.click('[data-testid="treasury-tab"]');

  // NEW: Navigate directly to treasury route
  await page.goto('/dao/test-token/treasury');
});
```

### Manual Testing Checklist
```bash
# After deployment:
./deploy.sh --network ic

# Test all routes:
1. Visit https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/
2. Visit https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/app
3. Visit https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/dao/test-token
4. Visit https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/dao/test-token/treasury
5. Visit https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/dao/test-token/agreement
6. Verify tab navigation updates URL
7. Verify browser back/forward works
8. Verify anonymous users can access public DAOs
9. Verify authenticated users see full functionality
```

### Build & Deploy Process
```bash
# In worktree: /home/theseus/alexandria/daopad-routing-refactor/src/daopad

# 1. Install dependencies (if needed)
npm install

# 2. Build frontend
npm run build

# 3. Deploy to mainnet
./deploy.sh --network ic --frontend-only

# 4. Run E2E tests against deployed code
cd daopad_frontend
npx playwright test

# 5. If tests fail: analyze, fix, GOTO step 2
# 6. If tests pass: commit and create PR
```

## Migration Notes

### Backwards Compatibility
- Keep `/app` route functional - shows token list
- Keep `/agreement/:stationId` route for existing links
- Add redirects in components if needed:
  ```javascript
  // In TokenDashboard.tsx if still mounted at /app
  useEffect(() => {
    if (location.pathname === '/app' && selectedTokenId) {
      navigate(`/dao/${selectedTokenId}`);
    }
  }, [selectedTokenId]);
  ```

### Breaking Changes
- **NONE** for users - all existing functionality preserved
- Internal component structure changes (state → props from router)

### Data Flow Changes
```
BEFORE:
URL: /app (always)
State: selectedTokenId (local state)
Navigation: setState() updates

AFTER:
URL: /dao/:tokenId/:tab (varies)
State: URL params (router state)
Navigation: navigate() updates URL
```

## Files Summary

### New Files (7)
1. `daopad_frontend/src/routes/DaoRoute.tsx` - Parent route for DAO pages
2. `daopad_frontend/src/components/dao/DaoLayout.tsx` - Shared layout with tabs
3. `daopad_frontend/src/routes/dao/DaoOverview.tsx` - Default DAO view
4. `daopad_frontend/src/routes/dao/DaoAgreement.tsx` - Agreement tab route
5. `daopad_frontend/src/routes/dao/DaoTreasury.tsx` - Treasury tab route
6. `daopad_frontend/src/routes/dao/DaoActivity.tsx` - Activity tab route
7. `daopad_frontend/src/routes/dao/DaoCanisters.tsx` - Canisters tab route
8. `daopad_frontend/src/routes/dao/DaoSettings.tsx` - Settings tab route

### Modified Files (5)
1. `daopad_frontend/src/App.tsx` - Add nested DAO routes
2. `daopad_frontend/src/routes/AppRoute.tsx` - Replace state with navigation
3. `daopad_frontend/src/components/TokenTabs.tsx` - Use Links instead of state
4. `daopad_frontend/src/components/TreasuryShowcase.tsx` - Navigate to /dao/:tokenId
5. `daopad_frontend/e2e/treasury.spec.ts` - Update to use direct routes

### Deprecated/Removed Files (1)
- `daopad_frontend/src/components/TokenDashboard.tsx` - Logic split into tab routes
  - Keep for backwards compatibility initially
  - Remove after confirming new routing works

## Plan Checklist

- [x] Worktree created first
- [x] Orchestrator header EMBEDDED at top of plan
- [x] Current state documented (file structure, routes, components)
- [x] Implementation in pseudocode (8 new files, 5 modified)
- [x] Testing strategy defined (E2E updates, manual checklist)
- [ ] Plan committed to feature branch
- [ ] Handoff command provided with PR creation reminder
