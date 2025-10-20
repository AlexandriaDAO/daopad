# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-tab-consolidation/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-tab-consolidation/src/daopad`
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
   git commit -m "[Feature]: Consolidate Permissions & Security into Settings Tab"
   git push -u origin feature/tab-consolidation
   gh pr create --title "[Feature]: Consolidate Permissions & Security into Settings Tab" --body "Implements TAB-CONSOLIDATION-PLAN.md"
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

**Branch:** `feature/tab-consolidation`
**Worktree:** `/home/theseus/alexandria/daopad-tab-consolidation/src/daopad`

---

# Implementation Plan: Tab Consolidation

## Problem
The dashboard has 7 tabs, and two of them (Permissions and Security) perform expensive operations on load:
- **Permissions Tab**: Loads user groups, permissions table (Orbit queries)
- **Security Tab**: Runs 16 security checks sequentially (slow)

This causes:
1. Slow initial page load
2. Tab switching delays
3. Poor UX when users just want to check settings

## Solution
Consolidate Permissions and Security tabs into the Settings tab as **collapsible, on-demand sections**:
- Settings tab remains lightweight by default (station info, cycles)
- Add "Load Permissions" and "Load Security" buttons
- Data loads only when user explicitly requests it
- Preserve all existing functionality

## Current State

### File Structure
```
daopad_frontend/
├── src/
│   ├── components/
│   │   ├── TokenDashboard.tsx          # Main dashboard (7 tabs)
│   │   ├── DAOSettings.tsx             # Settings tab content
│   │   ├── security/
│   │   │   └── SecurityDashboard.tsx   # Security checks (16 checks)
│   │   └── permissions/
│   │       └── PermissionsTable.tsx    # Permissions display
│   └── pages/
│       └── PermissionsPage.tsx         # Permissions tab wrapper
```

### Current Tab Structure (TokenDashboard.tsx:358-452)
```javascript
<Tabs defaultValue="agreement">
  <TabsList>
    <TabsTrigger value="agreement">Agreement</TabsTrigger>
    <TabsTrigger value="accounts">Treasury</TabsTrigger>
    <TabsTrigger value="activity">Activity</TabsTrigger>
    <TabsTrigger value="canisters">Canisters</TabsTrigger>
    <TabsTrigger value="security">Security</TabsTrigger>      // REMOVE
    <TabsTrigger value="permissions">Permissions</TabsTrigger> // REMOVE
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>

  {/* Security loads immediately when tab active */}
  <TabsContent value="security">
    {activeTab === 'security' && (
      <SecurityDashboard stationId={...} />
    )}
  </TabsContent>

  {/* Permissions loads immediately when tab active */}
  <TabsContent value="permissions">
    {activeTab === 'permissions' && (
      <PermissionsPage tokenId={...} />
    )}
  </TabsContent>

  {/* Settings is lightweight */}
  <TabsContent value="settings">
    {activeTab === 'settings' && (
      <DAOSettings tokenCanisterId={...} />
    )}
  </TabsContent>
</Tabs>
```

### Current Components

**DAOSettings.tsx** (lightweight, fast):
- Shows station info (name, ID, version)
- Shows cycles info
- Shows disaster recovery settings
- **No expensive operations**

**PermissionsPage.tsx** (heavy):
- Calls `list_station_user_groups()` on mount
- Renders `<PermissionsTable />` which loads all permissions
- **Expensive Orbit queries**

**SecurityDashboard.tsx** (very heavy):
- Runs 16 security checks on mount via `performComprehensiveSecurityCheck()`
- Shows progress UI during checks
- Renders `<DAOTransitionChecklist />` and `<AdminRemovalActions />`
- **Very expensive, sequential Orbit queries**

## Implementation Plan

### 1. Update TokenDashboard.tsx

**File**: `/home/theseus/alexandria/daopad-tab-consolidation/src/daopad/daopad_frontend/src/components/TokenDashboard.tsx`

**Changes**:
```javascript
// PSEUDOCODE

// Line 358-368: Remove security and permissions tabs from TabsList
<TabsList variant="executive" className="flex-1 grid grid-cols-5">  // Change from grid-cols-7 to grid-cols-5
  <TabsTrigger variant="executive" value="agreement">Agreement</TabsTrigger>
  <TabsTrigger variant="executive" value="accounts">Treasury</TabsTrigger>
  <TabsTrigger variant="executive" value="activity">Activity</TabsTrigger>
  <TabsTrigger variant="executive" value="canisters">Canisters</TabsTrigger>
  {/* REMOVE: <TabsTrigger value="security">Security</TabsTrigger> */}
  {/* REMOVE: <TabsTrigger value="permissions">Permissions</TabsTrigger> */}
  <TabsTrigger variant="executive" value="settings">Settings</TabsTrigger>
</TabsList>

// Line 415-434: Remove security and permissions TabsContent blocks
/* DELETE LINES 415-424: Security TabsContent */
/* DELETE LINES 426-434: Permissions TabsContent */

// Line 436-440: Update settings TabsContent to pass new props
<TabsContent value="settings" className="mt-4">
  {activeTab === 'settings' && (
    <DAOSettings
      tokenCanisterId={token.canister_id}
      identity={identity}
      // NEW PROPS for consolidated sections:
      stationId={orbitStation?.station_id}
      tokenSymbol={token.symbol}
      tokenId={token.canister_id}
    />
  )}
</TabsContent>
```

### 2. Enhance DAOSettings.tsx

**File**: `/home/theseus/alexandria/daopad-tab-consolidation/src/daopad/daopad_frontend/src/components/DAOSettings.tsx`

**Changes**:
```javascript
// PSEUDOCODE

// Update imports (add at top)
import PermissionsPage from '../pages/PermissionsPage';
import SecurityDashboard from './security/SecurityDashboard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ChevronDown, Shield, Lock } from 'lucide-react';

// Update interface (line 11-14)
interface DAOSettingsProps {
  tokenCanisterId: Principal | string;
  identity: Identity | null;
  // NEW PROPS:
  stationId?: string;
  tokenSymbol?: string;
  tokenId?: string;
}

// Add state for collapsible sections (after line 33)
const [showPermissions, setShowPermissions] = useState(false);
const [showSecurity, setShowSecurity] = useState(false);

// After existing return statement (after line 252, before closing </div>):
return (
  <div className="space-y-6">
    {/* EXISTING: Station Information Card */}
    <Card>...</Card>

    {/* EXISTING: Disaster Recovery Card */}
    {info.disaster_recovery && ...}

    {/* NEW: Permissions Section (Collapsible) */}
    {stationId && (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Permissions</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPermissions(!showPermissions)}
            >
              {showPermissions ? 'Hide' : 'Load'} Permissions
            </Button>
          </div>
          <CardDescription>
            User groups, roles, and access control settings
          </CardDescription>
        </CardHeader>
        {showPermissions && (
          <CardContent>
            <PermissionsPage
              tokenId={tokenId}
              stationId={stationId}
              identity={identity}
            />
          </CardContent>
        )}
      </Card>
    )}

    {/* NEW: Security Section (Collapsible) */}
    {stationId && (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              <CardTitle>Security Audit</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSecurity(!showSecurity)}
            >
              {showSecurity ? 'Hide' : 'Run'} Security Checks
            </Button>
          </div>
          <CardDescription>
            Comprehensive DAO security analysis and admin controls
          </CardDescription>
        </CardHeader>
        {showSecurity && (
          <CardContent>
            <SecurityDashboard
              stationId={stationId}
              tokenSymbol={tokenSymbol}
              identity={identity}
              tokenId={tokenId}
            />
          </CardContent>
        )}
      </Card>
    )}
  </div>
);
```

## Testing Requirements

### Manual Testing
1. **Settings Tab Default State**:
   - Navigate to Settings tab
   - Verify only Station Info and Disaster Recovery cards show
   - Verify page loads quickly (no delays)
   - Verify Permissions and Security cards show but are collapsed

2. **Load Permissions**:
   - Click "Load Permissions" button
   - Verify PermissionsPage renders inside Settings tab
   - Verify user groups load correctly
   - Verify PermissionsTable displays
   - Click "Hide Permissions" - verify it collapses

3. **Load Security**:
   - Click "Run Security Checks" button
   - Verify SecurityDashboard renders inside Settings tab
   - Verify 16 security checks run with progress
   - Verify DAOTransitionChecklist shows
   - Verify AdminRemovalActions shows
   - Click "Hide Security Checks" - verify it collapses

4. **Other Tabs Unaffected**:
   - Verify Agreement, Treasury, Activity, Canisters tabs work normally
   - Verify no Security or Permissions tabs in top-level navigation
   - Verify tab count reduced from 7 to 5

### Build Test
```bash
# In worktree
cd /home/theseus/alexandria/daopad-tab-consolidation/src/daopad
npm run build
```
Verify no TypeScript errors.

### Deploy Test
```bash
./deploy.sh --network ic --frontend-only
```
Verify deployment succeeds.

## Files Modified
1. `daopad_frontend/src/components/TokenDashboard.tsx` - Remove 2 tabs, update settings props
2. `daopad_frontend/src/components/DAOSettings.tsx` - Add collapsible sections for permissions/security

## Files NOT Modified
- `PermissionsPage.tsx` - Used as-is
- `SecurityDashboard.tsx` - Used as-is
- Backend files - No changes needed

## Benefits
1. **Faster Load Times**: Settings tab loads instantly, heavy operations on-demand
2. **Cleaner UI**: 5 tabs instead of 7, less visual clutter
3. **Better UX**: User controls when expensive operations run
4. **Preserved Functionality**: All features still accessible, same components
5. **No Breaking Changes**: Existing components work identically

## Migration Notes
- **No data migration needed**: Pure UI refactor
- **No backend changes**: All backend APIs unchanged
- **No breaking changes**: All functionality preserved
- **Backwards compatible**: Old component APIs unchanged

## Success Criteria
- [ ] Settings tab loads in <1s (station info only)
- [ ] Permissions load on-demand when clicked
- [ ] Security checks run on-demand when clicked
- [ ] All 5 remaining tabs work correctly
- [ ] No TypeScript errors
- [ ] Frontend builds successfully
- [ ] Deploys to mainnet successfully
