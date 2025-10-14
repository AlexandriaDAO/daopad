# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-permissions-fix-v3/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-permissions-fix-v3/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Test in browser FIRST** - Open https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/ and verify BEFORE deploying
4. **Build & Deploy**:
   - Frontend changes:
     ```bash
     cd daopad_frontend
     npm run build
     cd ..
     ./deploy.sh --network ic --frontend-only
     ```
5. **Browser verification**:
   ```bash
   # After deploy, MUST verify in actual browser:
   # 1. Open https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/
   # 2. Navigate to any token
   # 3. Click Permissions tab
   # 4. Verify permissions load within 5 seconds
   # 5. Check browser console for errors
   ```
6. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "Fix: Permissions tab infinite loading + consolidate UI"
   git push -u origin feature/permissions-tab-fix-v3
   gh pr create --title "Fix: Permissions Tab Infinite Loading" --body "Implements PERMISSIONS-TAB-FINAL-FIX.md

   ## Root Cause
   - Actor/stationId not properly initialized before component mount
   - JavaScript [] not properly encoding to Candid opt vec
   - No browser console logs to debug
   - Overly complex 4-tab UI

   ## Changes
   - Add detailed console logging for debugging
   - Fix actor initialization timing
   - Consolidate 4 tabs into single clean view
   - Remove wordy liquid democracy section
   - Test in actual browser before deploying

   ## Verified
   - [x] Permissions load in browser within 5 seconds
   - [x] Console shows helpful debug logs
   - [x] Single tab view, not 4 subtabs
   - [x] No infinite loading spinner"
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
- ❌ NO deploying without browser testing first
- ✅ MUST test in actual browser before considering done
- ✅ After sleep: IMMEDIATELY continue (no pause)
- ✅ ONLY stop at: approved, max iterations, or error

**Branch:** `feature/permissions-tab-fix-v3`
**Worktree:** `/home/theseus/alexandria/daopad-permissions-fix-v3/src/daopad`

---

# Implementation Plan: Fix Permissions Tab Once and For All

## Task Classification
**Type:** BUG FIX - Restore working permissions display with minimal changes

## Current Broken State

### Evidence of Failure
1. **Infinite Loading**: Browser shows "Loading permissions..." indefinitely
2. **No Console Logs**: User reports "no logs to tell me why" - debugging impossible
3. **Overcomplicated UI**: 4 separate tabs when should be 1 unified view
4. **Wordy Content**: Liquid democracy section is "excessively wordy" with no real info

### Current File Structure
```
daopad_frontend/src/
├── pages/
│   └── PermissionsPage.jsx          # 4 tabs: Overview, Permissions, Groups, Tools
├── components/permissions/
│   ├── PermissionsTable.jsx         # Stuck at "Loading permissions..."
│   ├── VotingTierDisplay.jsx        # Wordy liquid democracy text
│   ├── UserGroupsList.jsx           # Hardcoded system groups
│   └── PermissionRequestHelper.jsx  # Placeholder tools
```

### What's Broken (Line-by-Line Evidence)

**File:** `daopad_frontend/src/components/permissions/PermissionsTable.jsx`

**Problem 1: No Debug Logging**
```javascript
// Line 20-59: loadPermissions() function
// ❌ Only console.error on catch, no success logging
// ❌ No log when actor is null
// ❌ No log when stationId is undefined
// ❌ No log of actual API response
// Result: User sees infinite spinner, no way to debug
```

**Problem 2: Actor Initialization Timing**
```javascript
// Line 14-18: useEffect dependency
useEffect(() => {
  if (stationId && actor) {
    loadPermissions();
  }
}, [stationId, actor]);

// ❌ Race condition: actor might be null on first render
// ❌ No loading state while waiting for actor
// ❌ Silent failure if actor never initializes
```

**Problem 3: Candid Encoding Uncertainty**
```javascript
// Line 33: Pass [] for empty resources
const result = await actor.list_station_permissions(stationId, []);

// ❌ JavaScript [] might not encode to Candid opt (vec {})
// ❌ No validation that encoding worked
// ❌ No fallback if encoding fails
```

**File:** `daopad_frontend/src/pages/PermissionsPage.jsx`

**Problem 4: Overcomplicated Tab Structure**
```javascript
// Lines 60-125: 4 separate tabs
<TabsList className="grid w-full grid-cols-4">
  <TabsTrigger value="overview">Overview</TabsTrigger>      // Wordy, no data
  <TabsTrigger value="permissions">Permissions</TabsTrigger> // The actual data
  <TabsTrigger value="groups">User Groups</TabsTrigger>     // Hardcoded, static
  <TabsTrigger value="tools">Tools</TabsTrigger>            // Placeholder
</TabsList>

// ❌ User has to click between tabs to see data
// ❌ "Overview" tab has wordy text, no actual overview
// ❌ "Groups" tab just shows 2 hardcoded system groups
// ❌ "Tools" tab is placeholder UI
```

**Problem 5: Wordy Liquid Democracy Section**
```javascript
// Lines 70-102: VotingTierDisplay in Overview
// ❌ 3 paragraphs of text
// ❌ Bullet lists explaining system architecture
// ❌ dfx command snippet for terminal
// ❌ Takes up half the screen, provides no user-specific data
```

## Minimal Fix Plan (Pseudocode Only)

### Phase 1: Fix Loading & Add Debugging

**File:** `daopad_frontend/src/components/permissions/PermissionsTable.jsx`

```javascript
// PSEUDOCODE: Add comprehensive console logging

async function loadPermissions() {
  console.log('[PermissionsTable] Starting load...', {
    hasActor: !!actor,
    hasStationId: !!stationId,
    stationId: stationId?.toString()
  });

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

    // Try explicit Candid opt encoding
    const result = await actor.list_station_permissions(stationId, []);

    console.log('[PermissionsTable] Raw result:', result);
    console.log('[PermissionsTable] Result type:', typeof result, Array.isArray(result));

    if (result.Ok !== undefined) {
      console.log('[PermissionsTable] Success! Loaded', result.Ok.length, 'permissions');
      setPermissions(result.Ok);
    } else if (result.Err !== undefined) {
      console.error('[PermissionsTable] Backend error:', result.Err);
      setError(result.Err);
    } else {
      console.error('[PermissionsTable] Unexpected result format:', result);
      setError('Unexpected response format from backend');
    }
  } catch (err) {
    console.error('[PermissionsTable] Exception caught:', err);
    console.error('[PermissionsTable] Error name:', err.name);
    console.error('[PermissionsTable] Error message:', err.message);
    console.error('[PermissionsTable] Error stack:', err.stack);
    setError(`Failed to load: ${err.message}`);
  } finally {
    setLoading(false);
    console.log('[PermissionsTable] Load complete');
  }
}

// PSEUDOCODE: Show helpful error states

if (!actor) {
  return (
    <Card>
      <CardContent className="p-6">
        <Alert>
          <AlertDescription>
            Connect your wallet to view permissions.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

if (!stationId) {
  return (
    <Card>
      <CardContent className="p-6">
        <Alert>
          <AlertDescription>
            Select a token to view its permissions.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
```

### Phase 2: Consolidate UI Into Single View

**File:** `daopad_frontend/src/pages/PermissionsPage.jsx`

```javascript
// PSEUDOCODE: Remove 4-tab structure, create single unified view

export default function PermissionsPage({ tokenId, stationId, identity }) {
  // Remove tabs entirely
  // Create single page with clean sections

  return (
    <div className="space-y-6">
      {/* Header */}
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
        <CollapsibleTrigger>
          <Info className="h-4 w-4" />
          System Information
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="text-sm text-muted-foreground p-4">
            <p>Backend manages this treasury as the sole Orbit Station admin.</p>
            <p>Proposals are voted on using Kong Locker voting power (1 VP = $1 locked LP).</p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
```

**File:** `daopad_frontend/src/components/permissions/PermissionsTable.jsx`

```javascript
// PSEUDOCODE: Make table primary view (no nested tabs)

export default function PermissionsTable({ stationId, actor }) {
  // ... loading logic with console.logs ...

  return (
    <Card>
      <CardHeader>
        <CardTitle>Treasury Permissions ({permissions.length})</CardTitle>
        <CardDescription>
          Access controls for this Orbit Station treasury
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Simple filter buttons instead of tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={category === 'all' ? 'default' : 'outline'}
            onClick={() => setCategory('all')}
          >
            All ({permissions.length})
          </Button>
          <Button
            variant={category === 'treasury' ? 'default' : 'outline'}
            onClick={() => setCategory('treasury')}
          >
            Treasury ({countByCategory('treasury')})
          </Button>
          <Button
            variant={category === 'canisters' ? 'default' : 'outline'}
            onClick={() => setCategory('canisters')}
          >
            Canisters ({countByCategory('canisters')})
          </Button>
          <Button
            variant={category === 'users' ? 'default' : 'outline'}
            onClick={() => setCategory('users')}
          >
            Users ({countByCategory('users')})
          </Button>
          <Button
            variant={category === 'system' ? 'default' : 'outline'}
            onClick={() => setCategory('system')}
          >
            System ({countByCategory('system')})
          </Button>
        </div>

        {/* Permissions list */}
        <div className="space-y-2">
          {filteredPermissions.map((perm, index) => (
            <PermissionRow key={index} permission={perm} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Phase 3: Remove Wordy Content

**Delete these files entirely:**
- `daopad_frontend/src/components/permissions/VotingTierDisplay.jsx`
- `daopad_frontend/src/components/permissions/UserGroupsList.jsx`
- `daopad_frontend/src/components/permissions/PermissionRequestHelper.jsx`

**Update:** `daopad_frontend/src/components/permissions/index.js`
```javascript
// PSEUDOCODE: Only export what's needed
export { default as PermissionsTable } from './PermissionsTable';
```

## Testing Strategy (Browser-First!)

### Step 1: Local Testing (BEFORE deploying)
```bash
cd daopad_frontend
npm run dev
```

Open http://localhost:3000 and verify:
1. Navigate to `/app`
2. Click on any token
3. Click "Permissions" tab
4. **Check browser console** - should see:
   ```
   [PermissionsTable] Starting load... {hasActor: true, hasStationId: true, stationId: "..."}
   [PermissionsTable] Calling list_station_permissions...
   [PermissionsTable] Raw result: {Ok: Array(62)}
   [PermissionsTable] Success! Loaded 62 permissions
   [PermissionsTable] Load complete
   ```
5. Permissions table should show within 5 seconds
6. Filter buttons should work (All, Treasury, Canisters, Users, System)

### Step 2: Mainnet Testing (AFTER deploying)
```bash
# Deploy frontend
./deploy.sh --network ic --frontend-only

# Then test in browser
```

Open https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/ and verify:
1. Same checks as local testing
2. Console logs appear
3. Permissions load successfully
4. No infinite spinner

### Step 3: Failure Mode Testing
Verify error states work:
1. **No wallet connected**: Should show "Connect wallet" message
2. **No token selected**: Should show "Select a token" message
3. **Backend error**: Should show error with "Retry" button
4. **Network timeout**: Should show error after timeout

## Success Criteria

✅ **Browser loads permissions within 5 seconds** (not infinite)
✅ **Console shows helpful debug logs** (can debug issues)
✅ **Single unified view** (not 4 separate tabs)
✅ **No wordy content** (removed liquid democracy essay)
✅ **Helpful error states** (tells user what's wrong)

## Files Modified

**Changed:**
- `daopad_frontend/src/pages/PermissionsPage.jsx` - Remove tabs, single view
- `daopad_frontend/src/components/permissions/PermissionsTable.jsx` - Add logging, fix loading
- `daopad_frontend/src/components/permissions/index.js` - Remove unused exports

**Deleted:**
- `daopad_frontend/src/components/permissions/VotingTierDisplay.jsx`
- `daopad_frontend/src/components/permissions/UserGroupsList.jsx`
- `daopad_frontend/src/components/permissions/PermissionRequestHelper.jsx`

## Why This Will Work

1. **Console logging** - Finally able to debug actual issue
2. **Early returns** - Catch null actor/stationId before API call
3. **Simplified UI** - One view, no tab confusion
4. **Browser testing** - Verify BEFORE deploying
5. **Minimal changes** - Fix root cause, don't rebuild

## Deployment Checklist

- [ ] Implement changes in worktree
- [ ] Test locally with `npm run dev`
- [ ] Verify console logs appear
- [ ] Verify permissions load
- [ ] Deploy to mainnet
- [ ] Test on mainnet URL
- [ ] Create PR with evidence
- [ ] Include console log screenshots in PR
