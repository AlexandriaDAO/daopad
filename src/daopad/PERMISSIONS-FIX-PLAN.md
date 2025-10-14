# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-permissions-debug/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-permissions-debug/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes:
     ```bash
     cd /home/theseus/alexandria/daopad-permissions-debug/src/daopad/daopad_frontend
     npm run build
     cd /home/theseus/alexandria/daopad-permissions-debug/src/daopad
     ./deploy.sh --network ic --frontend-only
     ```
4. **Browser verification**:
   - Open https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/app in incognito
   - Login, select token, click Permissions tab
   - Verify console shows `[PermissionsTable]` logs
   - Verify permissions load within 5 seconds
5. **Create PR** (MANDATORY):
   ```bash
   cd /home/theseus/alexandria/daopad-permissions-debug/src/daopad
   git add .
   git commit -m "Fix: Permissions tab infinite loading with debug logging"
   git push -u origin feature/permissions-debug
   gh pr create --title "Fix: Permissions Tab Infinite Loading" --body "Implements PERMISSIONS-FIX-PLAN.md

   ## Root Cause
   - useEffect never fires if actor/stationId missing (infinite loading)
   - No console logs to debug issues
   - Overly complex 4-tab UI

   ## Changes
   - Add comprehensive console.log() at every step
   - Fix useEffect to handle missing actor/stationId
   - Remove 4-tab structure, use single view with filter buttons
   - Delete unused components (VotingTierDisplay, UserGroupsList, PermissionRequestHelper)

   ## Verified
   - [x] Console shows debug logs
   - [x] Permissions load within 5 seconds
   - [x] Single clean view (no 4 subtabs)
   - [x] Net decrease in LOC"
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
- ✅ Use ABSOLUTE PATHS: `/home/theseus/alexandria/daopad-permissions-debug/src/daopad`
- ✅ After sleep: IMMEDIATELY continue (no pause)
- ✅ ONLY stop at: approved, max iterations, or error

**Branch:** `feature/permissions-debug`
**Worktree:** `/home/theseus/alexandria/daopad-permissions-debug/src/daopad`

---

# Implementation Plan: Fix Permissions Tab Infinite Loading

## Task Classification
**Type:** BUG FIX - Restore working permissions display

## Current Broken State

**File:** `daopad_frontend/src/components/permissions/PermissionsTable.jsx` (247 lines)

**Problem 1: Infinite Loading Loop**
```javascript
// Lines 13-17
useEffect(() => {
  if (stationId && actor) {
    loadPermissions();
  }
}, [stationId, actor]);

// ❌ If actor or stationId is undefined, useEffect never runs
// ❌ Loading stays true forever (set on line 9)
// ❌ User sees "Loading permissions..." infinitely
```

**Problem 2: Zero Debug Logging**
```javascript
// Lines 19-59: loadPermissions() function
// ❌ NO console.log at start
// ❌ NO console.log before API call
// ❌ NO console.log of result
// ❌ Only console.error on exception (lines 51, 53)
// Result: Impossible to debug why it's not working
```

**File:** `daopad_frontend/src/pages/PermissionsPage.jsx` (130 lines)

**Problem 3: Overcomplicated 4-Tab UI**
```javascript
// Lines 59-125: Tabs structure
<TabsList className="grid w-full grid-cols-4">
  <TabsTrigger value="overview">Overview</TabsTrigger>
  <TabsTrigger value="permissions">Permissions</TabsTrigger>
  <TabsTrigger value="groups">User Groups</TabsTrigger>
  <TabsTrigger value="tools">Tools</TabsTrigger>
</TabsList>

// ❌ User must click through tabs to find data
// ❌ Overview tab has wordy VotingTierDisplay
// ❌ Groups tab shows hardcoded UserGroupsList
// ❌ Tools tab has placeholder PermissionRequestHelper
```

## Implementation (PSEUDOCODE ONLY)

### 1. Fix PermissionsTable with Debug Logging

**File:** `daopad_frontend/src/components/permissions/PermissionsTable.jsx`

```javascript
// PSEUDOCODE
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2 } from 'lucide-react';

export default function PermissionsTable({ stationId, actor }) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('treasury');
  const [error, setError] = useState(null);

  useEffect(() => {
    // FIX: Always call loadPermissions, let it handle missing actor/stationId
    loadPermissions();
  }, [stationId, actor]);

  async function loadPermissions() {
    // ADD: Comprehensive console logging
    console.log('[PermissionsTable] Starting load...', {
      hasActor: !!actor,
      hasStationId: !!stationId,
      stationId: stationId?.toString()
    });

    // FIX: Check and set error state instead of silent failure
    if (!actor) {
      console.error('[PermissionsTable] No actor - cannot load');
      setError('Wallet not connected or backend unavailable');
      setLoading(false);
      return;
    }

    if (!stationId) {
      console.error('[PermissionsTable] No stationId provided');
      setError('No station ID - select a token first');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[PermissionsTable] Calling list_station_permissions...');

      const result = await actor.list_station_permissions(stationId, []);

      console.log('[PermissionsTable] Raw result:', result);
      console.log('[PermissionsTable] Result type:', typeof result, Array.isArray(result));

      if (result.Ok !== undefined) {
        console.log('[PermissionsTable] Success! Loaded', result.Ok.length, 'permissions');
        setPermissions(result.Ok);
      } else if (result.Err !== undefined) {
        console.error('[PermissionsTable] Backend error:', result.Err);
        setError(result.Err);
        setPermissions([]);
      } else {
        console.error('[PermissionsTable] Unexpected result format:', result);
        setError('Unexpected response format from backend');
        setPermissions([]);
      }
    } catch (err) {
      console.error('[PermissionsTable] Exception caught:', err);
      console.error('[PermissionsTable] Error message:', err.message);
      console.error('[PermissionsTable] Error stack:', err.stack);
      setError(`Failed to load: ${err.message}`);
      setPermissions([]);
    } finally {
      setLoading(false);
      console.log('[PermissionsTable] Load complete');
    }
  }

  function filterPermissionsByCategory(category) {
    return permissions.filter(perm => {
      const resource = perm.resource;
      if (!resource) return false;

      switch (category) {
        case 'treasury':
          return resource.Account || resource.Asset;
        case 'canisters':
          return resource.ExternalCanister;
        case 'users':
          return resource.User || resource.UserGroup;
        case 'system':
          return resource.System || resource.RequestPolicy || resource.Permission;
        default:
          return false;
      }
    });
  }

  const filteredPermissions = filterPermissionsByCategory(category);
  const countByCategory = (cat) => filterPermissionsByCategory(cat).length;

  // Show loading spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading permissions...</span>
      </div>
    );
  }

  // Show error with retry button
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={loadPermissions} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  // CHANGE: Replace internal tabs with filter buttons
  return (
    <Card>
      <CardHeader>
        <CardTitle>Treasury Permissions ({permissions.length})</CardTitle>
        <CardDescription>
          Access controls for this Orbit Station treasury
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filter buttons instead of tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <Button
            variant={category === 'treasury' ? 'default' : 'outline'}
            onClick={() => setCategory('treasury')}
            size="sm"
          >
            Treasury ({countByCategory('treasury')})
          </Button>
          <Button
            variant={category === 'canisters' ? 'default' : 'outline'}
            onClick={() => setCategory('canisters')}
            size="sm"
          >
            Canisters ({countByCategory('canisters')})
          </Button>
          <Button
            variant={category === 'users' ? 'default' : 'outline'}
            onClick={() => setCategory('users')}
            size="sm"
          >
            Users ({countByCategory('users')})
          </Button>
          <Button
            variant={category === 'system' ? 'default' : 'outline'}
            onClick={() => setCategory('system')}
            size="sm"
          >
            System ({countByCategory('system')})
          </Button>
        </div>

        {/* Permissions list */}
        {filteredPermissions.length === 0 ? (
          <div className="text-center text-muted-foreground p-8">
            No {category} permissions found
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPermissions.map((perm, index) => (
              <PermissionRow key={index} permission={perm} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Keep PermissionRow component as-is
function PermissionRow({ permission }) {
  const resourceName = getResourceName(permission.resource);
  const authScope = getAuthScope(permission.allow);
  const groups = permission.allow.user_groups || [];

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
      <div className="flex-1">
        <div className="font-medium">{resourceName}</div>
        <div className="text-sm text-muted-foreground">
          {groups.length > 0 ? `${groups.length} group(s) have access` : 'Admin only'}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={authScope === 'Public' ? 'default' : 'secondary'}>
          {authScope}
        </Badge>
        <Button variant="ghost" size="sm" disabled>
          View
        </Button>
      </div>
    </div>
  );
}

// Keep helper functions as-is
function getResourceName(resource) {
  if (!resource) return 'Unknown';
  const keys = Object.keys(resource);
  if (keys.length === 0) return 'Unknown';
  const resourceType = keys[0];
  const action = resource[resourceType];
  return `${resourceType}: ${formatAction(action)}`;
}

function formatAction(action) {
  if (!action) return 'Unknown';
  if (typeof action === 'string') return action;
  if (typeof action === 'object') {
    const keys = Object.keys(action);
    if (keys.length > 0) return keys[0];
  }
  return 'Unknown';
}

function getAuthScope(allow) {
  if (!allow || !allow.auth_scope) return 'Restricted';
  const scope = allow.auth_scope;
  if (typeof scope === 'string') return scope;
  if (typeof scope === 'object') {
    const keys = Object.keys(scope);
    if (keys.length > 0) return keys[0];
  }
  return 'Restricted';
}
```

**Changes:**
- Line 18: Remove `if (stationId && actor)` condition - always call loadPermissions
- Lines 22-43: Add comprehensive console.log statements
- Lines 27-39: Set error state instead of silent failure
- Line 108: Remove internal tabs, use filter buttons
- Import Alert component for better error display

### 2. Simplify PermissionsPage to Single View

**File:** `daopad_frontend/src/pages/PermissionsPage.jsx`

```javascript
// PSEUDOCODE
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Shield, Info } from 'lucide-react';
import { PermissionsTable } from '../components/permissions';
import { DAOPadBackendService } from '../services/daopadBackend';

const PermissionsPage = ({ tokenId, stationId, identity }) => {
  const isAuthenticated = !!identity;
  const [actor, setActor] = useState(null);

  React.useEffect(() => {
    if (identity) {
      const daopadService = new DAOPadBackendService(identity);
      setActor(daopadService.actor);
    }
  }, [identity]);

  if (!isAuthenticated) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissions
          </CardTitle>
          <CardDescription>
            Connect your wallet to view and manage permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Please connect your wallet to access permission management features.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="h-8 w-8" />
          Permissions
        </h1>
        <p className="text-gray-600 mt-2">
          View and manage treasury access controls
        </p>
      </div>

      {/* Main permissions table - no tabs */}
      <PermissionsTable stationId={stationId} actor={actor} />

      {/* Compact system info - collapsible */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Info className="h-4 w-4" />
          System Information
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="text-sm text-muted-foreground p-4 space-y-2">
              <p>Backend manages this treasury as the sole Orbit Station admin.</p>
              <p>Proposals are voted on using Kong Locker voting power (1 VP = $1 locked LP).</p>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default PermissionsPage;
```

**Changes:**
- Remove 4-tab structure (lines 59-125 deleted)
- Remove imports for VotingTierDisplay, PermissionRequestHelper, UserGroupsList
- Single clean view with PermissionsTable as main content
- Optional collapsible system info at bottom

### 3. Delete Unused Components

**Delete these files:**
- `daopad_frontend/src/components/permissions/VotingTierDisplay.jsx`
- `daopad_frontend/src/components/permissions/UserGroupsList.jsx`
- `daopad_frontend/src/components/permissions/PermissionRequestHelper.jsx`
- `daopad_frontend/src/components/permissions/VotingAnalytics.jsx` (if exists)

### 4. Update Permissions Index

**File:** `daopad_frontend/src/components/permissions/index.js`

```javascript
// PSEUDOCODE
export { default as PermissionsTable } from './PermissionsTable';
```

**Changes:**
- Remove all exports except PermissionsTable

## Testing Strategy

### Build & Deploy
```bash
cd /home/theseus/alexandria/daopad-permissions-debug/src/daopad/daopad_frontend
npm run build
cd /home/theseus/alexandria/daopad-permissions-debug/src/daopad
./deploy.sh --network ic --frontend-only
```

### Browser Verification
1. Open https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/app in **incognito window**
2. Login with wallet
3. Click on any token
4. Click "Permissions" tab (6th main tab)
5. Open browser DevTools console
6. **Expected console logs:**
   ```
   [PermissionsTable] Starting load... {hasActor: true, hasStationId: true, stationId: "..."}
   [PermissionsTable] Calling list_station_permissions...
   [PermissionsTable] Raw result: {Ok: Array(62)}
   [PermissionsTable] Success! Loaded 62 permissions
   [PermissionsTable] Load complete
   ```
7. **Expected UI:**
   - No 4 subtabs (Overview, Permissions, Groups, Tools)
   - Single view with filter buttons (Treasury, Canisters, Users, System)
   - Permissions load within 5 seconds
   - Filter buttons show counts

### Failure Cases to Test
1. **No wallet connected**: Should show helpful message
2. **No token selected**: loadPermissions handles gracefully
3. **Backend error**: Shows error with Retry button
4. **Network timeout**: Logs full error details

## Success Criteria

✅ **Console shows debug logs** - Can diagnose issues
✅ **Permissions load within 5 seconds** - No infinite spinner
✅ **Single clean view** - No 4 subtabs
✅ **Net decrease in LOC** - Deleted unused components

## Files Modified

**Changed:**
- `daopad_frontend/src/components/permissions/PermissionsTable.jsx` - Add logging, fix useEffect
- `daopad_frontend/src/pages/PermissionsPage.jsx` - Remove 4 tabs, single view
- `daopad_frontend/src/components/permissions/index.js` - Remove unused exports

**Deleted:**
- `daopad_frontend/src/components/permissions/VotingTierDisplay.jsx`
- `daopad_frontend/src/components/permissions/UserGroupsList.jsx`
- `daopad_frontend/src/components/permissions/PermissionRequestHelper.jsx`

## Why This Will Work

1. **Console logging** - Debug exactly where it fails
2. **Fixed useEffect** - Always runs, handles missing data gracefully
3. **Simplified UI** - One clean view, no tab complexity
4. **Browser testing** - Verify BEFORE declaring success
5. **Absolute paths** - No shell reset issues
