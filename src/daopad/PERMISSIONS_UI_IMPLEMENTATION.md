# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-permissions/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-permissions/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Backend changes:
     ```bash
     cargo build --target wasm32-unknown-unknown --release -p daopad_backend
     candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
     ./deploy.sh --network ic --backend-only
     cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
     ```
   - Frontend changes:
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "feat: Reintegrate comprehensive Permissions UI with Orbit backend"
   git push -u origin feature/permissions-ui
   gh pr create --title "feat: Reintegrate Permissions UI with Orbit Station Integration" --body "Implements PERMISSIONS_UI_IMPLEMENTATION.md - Adds complete permissions management UI matching Orbit Station functionality"
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

**Branch:** `feature/permissions-ui`
**Worktree:** `/home/theseus/alexandria/daopad-permissions/src/daopad`

---

# Implementation Plan: Permissions UI Reintegration

## Context

The PermissionsPage component exists but is non-functional - it imports 6 components from a directory that doesn't exist (`/components/permissions/`). This feature was previously implemented and working, but was removed during refactoring. We need to rebuild it cleanly, integrating with the existing Orbit backend types and adding it as a new tab in TokenDashboard.

## Current State

### Existing Files
- `daopad_frontend/src/pages/PermissionsPage.jsx` - Broken page importing non-existent components
- `daopad_frontend/src/components/TokenDashboard.jsx:455-459` - Has 5 tabs (Treasury, Activity, Canisters, Security, Settings)
- `daopad_backend/src/types/orbit.rs:424-560` - Complete permission types already defined
- `daopad_backend/src/api/orbit_security.rs` - Security checks implemented

### Missing Components (Referenced in PermissionsPage)
1. `VotingTierDisplay` - Shows user's voting power tier
2. `VotingPowerSync` - Syncs VP from Kong Locker
3. `PermissionRequestHelper` - Tool for requesting permissions
4. `VotingAnalytics` - Analytics charts
5. `PermissionsTable` - Main permissions grid (Accounts, Canisters, Users, System)
6. `UserGroupsList` - User groups management

### Backend Types Already Available
```rust
// From daopad_backend/src/types/orbit.rs
- Permission { resource: Resource, allow: Allow }
- ListPermissionsInput { resources, paginate }
- Resource (Account, AddressBook, Asset, ExternalCanister, User, UserGroup, System, etc.)
- Allow { auth_scope, user_groups, users }
- AuthScope (Public, Authenticated, Restricted)
```

### Orbit Reference Structure
From `/home/theseus/alexandria/orbit/apps/wallet/src/configs/permissions.config.ts`:
- 4 categories: treasury, canisters, users, system
- ~24 total permissions across all categories

## Implementation Plan

### Phase 1: Backend API Endpoints

#### File: `daopad_backend/src/api/orbit_permissions.rs` (NEW)
```rust
// PSEUDOCODE
use candid::Principal;
use crate::types::orbit::{
    ListPermissionsInput, ListPermissionsResult, Permission,
    EditPermissionOperationInput, Resource
};

/// List all permissions for a station (admin proxy)
#[ic_cdk::update]
pub async fn list_station_permissions(
    station_id: Principal,
    resources: Option<Vec<Resource>>
) -> Result<Vec<Permission>, String> {
    // Validate caller has Kong Locker canister
    // Call station.list_permissions via inter-canister call
    // Return permissions list
}

/// Get specific permission details
#[ic_cdk::update]
pub async fn get_permission(
    station_id: Principal,
    resource: Resource
) -> Result<Permission, String> {
    // Call station.get_permission
    // Return single permission
}

/// Create edit permission request (creates request, doesn't auto-execute)
#[ic_cdk::update]
pub async fn create_edit_permission_request(
    station_id: Principal,
    resource: Resource,
    auth_scope: Option<AuthScope>,
    users: Option<Vec<String>>,
    user_groups: Option<Vec<String>>
) -> Result<String, String> {
    // Create EditPermission request via submit_request_approval
    // Return request_id
}
```

#### File: `daopad_backend/src/lib.rs` (MODIFY)
```rust
// PSEUDOCODE
// Add to existing exports
mod api {
    pub mod orbit_permissions; // NEW
    // ... existing modules
}

// Export new methods
pub use api::orbit_permissions::{
    list_station_permissions,
    get_permission,
    create_edit_permission_request,
};
```

### Phase 2: Frontend Permission Components

#### File: `daopad_frontend/src/components/permissions/index.js` (NEW)
```javascript
// PSEUDOCODE
export { default as VotingTierDisplay } from './VotingTierDisplay';
export { default as VotingPowerSync } from './VotingPowerSync';
export { default as PermissionRequestHelper } from './PermissionRequestHelper';
export { default as VotingAnalytics } from './VotingAnalytics';
export { default as PermissionsTable } from './PermissionsTable';
export { default as UserGroupsList } from './UserGroupsList';
```

#### File: `daopad_frontend/src/components/permissions/PermissionsTable.jsx` (NEW)
```javascript
// PSEUDOCODE
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';

export default function PermissionsTable({ tokenId, actor }) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('treasury');

  useEffect(() => {
    // Load permissions from backend
    loadPermissions();
  }, [tokenId, category]);

  async function loadPermissions() {
    // Call actor.list_station_permissions(stationId, filterByCategory)
    // Group by resource type
    // Set permissions state
  }

  return (
    <Card>
      <Tabs value={category} onValueChange={setCategory}>
        <TabsList>
          <TabsTrigger value="treasury">Treasury</TabsTrigger>
          <TabsTrigger value="canisters">Canisters</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="treasury">
          {/* View Accounts, Read Any Account, Create Account, etc. */}
          <PermissionRow
            name="View Accounts Page"
            resource={{ Account: { List: null } }}
            description="Allows access to accounts page"
          />
          {/* ... more treasury permissions */}
        </TabsContent>

        <TabsContent value="canisters">
          {/* View Canisters, Add Canisters, Fund Canisters, etc. */}
        </TabsContent>

        <TabsContent value="users">
          {/* View Users, Add Users, User Groups, etc. */}
        </TabsContent>

        <TabsContent value="system">
          {/* System Info, Upgrade, Request Policies, etc. */}
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function PermissionRow({ name, resource, description }) {
  // Display permission with auth scope (Public/Authenticated/Restricted)
  // Show which user groups have access
  // Edit button (creates edit_permission request)
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div>
        <h4>{name}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge>{authScope}</Badge>
        <Button variant="ghost" size="sm">Edit</Button>
      </div>
    </div>
  );
}
```

#### File: `daopad_frontend/src/components/permissions/VotingTierDisplay.jsx` (NEW)
```javascript
// PSEUDOCODE
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

export default function VotingTierDisplay({ tokenId, actor, identity }) {
  const [votingPower, setVotingPower] = useState(0);
  const [tier, setTier] = useState('None');

  useEffect(() => {
    // Load user's voting power for this token
    // Calculate tier based on VP thresholds
    loadVotingPower();
  }, [tokenId, identity]);

  function calculateTier(vp) {
    // 0: No voting power
    // 1-99: Observer
    // 100-999: Participant
    // 1000-9999: Contributor
    // 10000+: Governor
    return tier;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Voting Power</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-3xl font-bold">{votingPower.toLocaleString()} VP</div>
          <Badge variant={tierColor}>{tier}</Badge>
          <Progress value={progressToNextTier} />
          <p className="text-sm text-muted-foreground">
            {vpNeededForNextTier} VP until {nextTier}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### File: `daopad_frontend/src/components/permissions/VotingPowerSync.jsx` (NEW)
```javascript
// PSEUDOCODE
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';

export default function VotingPowerSync({ tokenId, actor, stationId }) {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  async function handleSync() {
    // Trigger backend sync of Kong Locker VP to Orbit Station
    // This would call a backend method that:
    // 1. Gets all Kong Locker voting powers
    // 2. Adds users with 100+ VP to Orbit Station
    // 3. Removes users below 100 VP
    // 4. Updates user groups based on VP tiers
    setSyncing(true);
    try {
      // await actor.sync_voting_power_to_station(stationId);
      setLastSync(new Date());
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voting Power Synchronization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Sync Kong Locker voting power to Orbit Station user management
          </AlertDescription>
        </Alert>

        {lastSync && (
          <p className="text-sm text-muted-foreground">
            Last synced: {lastSync.toLocaleString()}
          </p>
        )}

        <Button onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

#### File: `daopad_frontend/src/components/permissions/PermissionRequestHelper.jsx` (NEW)
```javascript
// PSEUDOCODE
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export default function PermissionRequestHelper({ tokenId, actor, stationId }) {
  const [resource, setResource] = useState(null);
  const [authScope, setAuthScope] = useState('Authenticated');

  async function handleRequestPermission() {
    // Create edit_permission request
    // await actor.create_edit_permission_request(stationId, resource, authScope);
    // Show success message
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Permission Change</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={resource} onValueChange={setResource}>
          <SelectTrigger>
            <SelectValue placeholder="Select permission" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="account_read">View Accounts</SelectItem>
            <SelectItem value="account_create">Create Account</SelectItem>
            {/* ... more permissions */}
          </SelectContent>
        </Select>

        <Select value={authScope} onValueChange={setAuthScope}>
          <SelectTrigger>
            <SelectValue placeholder="Access level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Public">Public</SelectItem>
            <SelectItem value="Authenticated">Authenticated</SelectItem>
            <SelectItem value="Restricted">Restricted</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={handleRequestPermission}>
          Create Request
        </Button>
      </CardContent>
    </Card>
  );
}
```

#### File: `daopad_frontend/src/components/permissions/VotingAnalytics.jsx` (NEW)
```javascript
// PSEUDOCODE
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export default function VotingAnalytics({ tokenId, actor }) {
  const [stats, setStats] = useState({
    totalHolders: 0,
    totalVotingPower: 0,
    tierDistribution: {}
  });

  useEffect(() => {
    // Load analytics data
    // Could query Kong Locker for all VP holders for this token
    // Calculate distribution across tiers
    loadAnalytics();
  }, [tokenId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voting Power Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Total VP Holders</div>
            <div className="text-2xl font-bold">{stats.totalHolders}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total Voting Power</div>
            <div className="text-2xl font-bold">{stats.totalVotingPower.toLocaleString()}</div>
          </div>

          {/* Tier distribution chart/bars */}
          <div className="col-span-2">
            <h4 className="font-semibold mb-2">Distribution by Tier</h4>
            {/* Simple bar chart showing Observer, Participant, Contributor, Governor counts */}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### File: `daopad_frontend/src/components/permissions/UserGroupsList.jsx` (NEW)
```javascript
// PSEUDOCODE
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

export default function UserGroupsList({ tokenId, actor }) {
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    // Load user groups from Orbit Station
    // Show: Admin, Operator, VP-based groups
    loadUserGroups();
  }, [tokenId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Groups</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {groups.map(group => (
            <div key={group.id} className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">{group.name}</div>
                <div className="text-sm text-muted-foreground">
                  {group.userCount} members
                </div>
              </div>
              <Badge>{group.type}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Phase 3: Integration into TokenDashboard

#### File: `daopad_frontend/src/components/TokenDashboard.jsx` (MODIFY)
```javascript
// PSEUDOCODE - Line 8-9
import AddressBookPage from '../pages/AddressBookPage';
import PermissionsPage from '../pages/PermissionsPage'; // ADD THIS
import DAOSettings from './DAOSettings';

// PSEUDOCODE - Line 454
<TabsList className="grid w-full grid-cols-6"> {/* Change from grid-cols-5 to grid-cols-6 */}
  <TabsTrigger value="accounts">Treasury</TabsTrigger>
  <TabsTrigger value="activity">Activity</TabsTrigger>
  <TabsTrigger value="canisters">Canisters</TabsTrigger>
  <TabsTrigger value="security">Security</TabsTrigger>
  <TabsTrigger value="permissions">Permissions</TabsTrigger> {/* NEW */}
  <TabsTrigger value="settings">Settings</TabsTrigger>
</TabsList>

// PSEUDOCODE - After line 504 (after security tab)
<TabsContent value="permissions" className="mt-4">
  {activeTab === 'permissions' && (
    <PermissionsPage
      tokenId={token.canister_id}
      stationId={orbitStation?.station_id}
      identity={identity}
    />
  )}
</TabsContent>
```

### Phase 4: Backend Type Validation

#### Test Orbit Permissions API
```bash
# Test with daopad identity and test station
dfx identity use daopad
export TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"

# List permissions
dfx canister --network ic call $TEST_STATION list_permissions '(record {
  resources = null;
  paginate = null;
})'

# Get specific permission
dfx canister --network ic call $TEST_STATION get_permission '(record {
  resource = variant { Account = variant { List = null } };
})'
```

## Testing Strategy

### Backend Testing
1. **Type Discovery**: Verify Orbit API matches our types
   ```bash
   dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai __get_candid
   ```

2. **Build**: Compile Rust changes
   ```bash
   cargo build --target wasm32-unknown-unknown --release -p daopad_backend
   candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
   ```

3. **Deploy Backend**:
   ```bash
   ./deploy.sh --network ic --backend-only
   ```

4. **Sync Declarations** (CRITICAL):
   ```bash
   cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
   ```

### Frontend Testing
1. **Build**: Compile React changes
   ```bash
   cd daopad_frontend
   npm run build
   ```

2. **Deploy Frontend**:
   ```bash
   ./deploy.sh --network ic --frontend-only
   ```

3. **Manual Testing**:
   - Login with Internet Identity
   - Navigate to token dashboard
   - Click "Permissions" tab
   - Verify all 6 sub-components render
   - Test permission editing (creates request)
   - Check VP sync functionality

## File Structure (Before/After)

### Before
```
daopad_frontend/src/
├── pages/
│   └── PermissionsPage.jsx (broken - imports non-existent components)
├── components/
│   ├── TokenDashboard.jsx (5 tabs)
│   └── security/
│       └── SecurityDashboard.jsx
```

### After
```
daopad_frontend/src/
├── pages/
│   └── PermissionsPage.jsx (functional - imports real components)
├── components/
│   ├── TokenDashboard.jsx (6 tabs - added Permissions)
│   ├── security/
│   │   └── SecurityDashboard.jsx
│   └── permissions/                    # NEW DIRECTORY
│       ├── index.js                    # NEW
│       ├── PermissionsTable.jsx        # NEW
│       ├── VotingTierDisplay.jsx       # NEW
│       ├── VotingPowerSync.jsx         # NEW
│       ├── PermissionRequestHelper.jsx # NEW
│       ├── VotingAnalytics.jsx         # NEW
│       └── UserGroupsList.jsx          # NEW

daopad_backend/src/
├── api/
│   ├── orbit_security.rs
│   └── orbit_permissions.rs            # NEW
└── lib.rs (exports new methods)
```

## Dependencies

### Frontend
- All UI components already exist in `daopad_frontend/src/components/ui/`
- No new npm packages needed
- Uses existing OrbitServiceBase.js patterns

### Backend
- No new crates needed
- Uses existing candid types from `types/orbit.rs`
- Follows existing cross-canister call patterns

## Success Criteria

1. ✅ All 6 permission components render without errors
2. ✅ Permissions tab appears in TokenDashboard (6 tabs total)
3. ✅ Can view permissions grouped by category (Treasury, Canisters, Users, System)
4. ✅ Voting power tier displays correctly
5. ✅ Backend successfully proxies Orbit permission queries
6. ✅ No console errors or type mismatches
7. ✅ Declaration sync works (no "is not a function" errors)

## Risks & Mitigations

**Risk 1**: Orbit permission types don't match our backend types
- **Mitigation**: Test with dfx first (Step 4), adjust types if needed

**Risk 2**: Declaration sync failure causes "is not a function" errors
- **Mitigation**: Mandatory sync step in deployment script, verify manually

**Risk 3**: Cross-canister query limits (permissions list could be large)
- **Mitigation**: Use pagination in list_permissions, load incrementally

**Risk 4**: User groups don't exist in Orbit Station yet
- **Mitigation**: UserGroupsList gracefully handles empty state, shows creation instructions

## Notes

- This is a **NEW FEATURE** (additive approach) - we're building new components, not refactoring
- Backend types already exist - just need API methods
- Frontend follows existing patterns (SecurityDashboard, DAOSettings structure)
- Aligns with "minimal storage" principle - all data queried from Orbit, nothing cached in DAOPad backend
- Test station `fec7w-zyaaa-aaaaa-qaffq-cai` has admin access for testing

## Checklist

- [x] Worktree created at `/home/theseus/alexandria/daopad-permissions`
- [x] Orchestrator header embedded at top of plan
- [x] Current state documented (broken components listed)
- [x] Implementation in pseudocode (all files shown)
- [x] Testing strategy defined (dfx testing, build, deploy, sync)
- [ ] Plan committed to feature branch
- [ ] Handoff command provided

---

## Handoff Instructions

After implementing this plan:

1. Build backend (if Rust changes made)
2. Deploy backend
3. **CRITICAL**: Sync declarations to frontend
4. Build frontend
5. Deploy frontend
6. Test manually on IC mainnet
7. Create PR with this plan referenced

The implementing agent will create the PR automatically - no human intervention needed.
