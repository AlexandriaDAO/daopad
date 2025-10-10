# Capability-Based Canister Management UI Plan

## 🚨 MANDATORY: ISOLATION CHECK AND EXECUTION PROMPT

### Step 0: Verify Isolation (RUN THIS FIRST!)

```bash
# STOP! This check MUST pass before reading further
REPO_ROOT=$(git rev-parse --show-toplevel)
CURRENT_DIR=$(pwd)

if [ "$REPO_ROOT" = "$CURRENT_DIR" ]; then
    echo "❌ FATAL: You are in the main repository at $CURRENT_DIR"
    echo "❌ Other agents may be working in parallel here"
    echo "❌ You MUST create an isolated worktree first:"
    echo ""
    echo "Run these commands:"
    echo "  cd /home/theseus/alexandria/daopad/src/daopad"
    echo "  git worktree add -b feature/capability-ui ../daopad-capability-ui master"
    echo "  cd ../daopad-capability-ui/src/daopad"
    echo ""
    echo "THEN restart with this plan in the worktree."
    exit 1
else
    echo "✅ You are isolated in: $CURRENT_DIR"
    echo "✅ Safe to proceed with implementation"
fi
```

### Your Execution Prompt

You are an autonomous PR orchestrator implementing **Capability-Based Canister Management UI**.

**EXECUTE THESE STEPS AUTONOMOUSLY (DO NOT ASK FOR PERMISSION):**

**Step 0 - MANDATORY ISOLATION:**
```bash
# If not already in worktree, create one
if [ "$(git rev-parse --show-toplevel)" = "$(pwd)" ]; then
  cd /home/theseus/alexandria/daopad/src/daopad
  git worktree add -b feature/capability-ui ../daopad-capability-ui master
  cd ../daopad-capability-ui/src/daopad
fi

# Verify isolation
pwd  # MUST show ../daopad-capability-ui/src/daopad
git branch --show-current  # MUST show feature/capability-ui
```

**Step 1 - Implement Feature:**
- Phase 1: Pass privileges through service → CanisterDetails
- Phase 2: Create canisterCapabilities utility
- Phase 3: Update CanisterSnapshots, CanisterSettings, CanisterUpgrade with privilege checks
- Phase 4: Add permission badge to CanisterOverview
- Phase 5: Filter backend canister from CanisterList
- Phase 6: Make IC status optional in CanisterOverview

**Step 2 - Deploy and Test:**
```bash
# Frontend only (no backend changes)
./deploy.sh --network ic --frontend-only

# Test at https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
# - Frontend canister should show "Full Management"
# - Backend canister should NOT appear in list
# - Buttons properly disabled/enabled based on privileges
```

**Step 3 - Commit and Push:**
```bash
git add -A
git commit -m "feat: Capability-based canister management UI

- Pass privileges from backend through to all UI components
- Add permission badges (Full Management/Limited/Read Only)
- Disable management buttons when lacking can_change privilege
- Filter backend canister from management list
- Show clear warnings for read-only canisters
- Make IC status optional (graceful degradation)

🤖 Generated with Claude Code"
git push -u origin feature/capability-ui
```

**Step 4 - Create PR:**
```bash
gh pr create --title "Capability-based canister management UI" --body "$(cat <<'EOF'
## Summary
Implement intelligent permission-aware UI that shows/hides features based on Orbit Station privileges.

### Changes
- ✅ Privileges flow from backend → service → components
- ✅ Permission badges show access level clearly
- ✅ Management buttons disabled when lacking permissions
- ✅ Backend canister filtered from list
- ✅ Graceful degradation when IC status unavailable
- ✅ Clear user messaging for read-only mode

### Testing
- Frontend canister (l7rlj-...) shows "Full Management" ✅
- Backend canister hidden from list ✅
- Snapshot/upgrade buttons properly disabled for uncontrolled canisters ✅
- No more confusing "not a controller" errors ✅

🤖 Generated with Claude Code
EOF
)"
```

**YOUR CRITICAL RULES:**
- You MUST work in ../daopad-capability-ui/src/daopad (NOT main repo)
- Other agents ARE working in parallel - isolation is MANDATORY
- After sleep: IMMEDIATELY continue (no "should I check?" questions)
- NO BACKEND CHANGES (frontend only)
- ONLY STOP when: PR created or critical error

**START NOW with Step 0.**

---

## Overview
Implement intelligent permission-aware UI that shows/hides features based on what the caller can actually do with each canister. This prevents confusing errors when users try operations they don't have permission for.

## Critical Discovery: The Controller Requirement

**FUNDAMENTAL TRUTH**: You MUST be a controller of a canister to:
- ✅ Take snapshots
- ✅ Upgrade/reinstall code
- ✅ Change settings (memory, cycles, etc.)
- ✅ Delete snapshots
- ✅ Restore from snapshots
- ✅ Basically any meaningful management operation

**What this means**: If Orbit Station isn't a controller of a canister, none of the management features will work, even if the canister is registered in Orbit's tracking system.

## Current State

### File Tree (Relevant Sections)
```
daopad_frontend/
├── src/
│   ├── components/
│   │   └── canisters/
│   │       ├── CanisterDetails.jsx      (MODIFY - add privileges state)
│   │       ├── CanisterSnapshots.jsx    (MODIFY - add privilege checks)
│   │       ├── CanisterSettings.jsx     (MODIFY - disable when !can_change)
│   │       ├── CanisterUpgrade.jsx      (MODIFY - disable when !can_change)
│   │       ├── CanisterOverview.jsx     (MODIFY - add permission badge)
│   │       └── CanisterList.jsx         (MODIFY - filter backend)
│   ├── services/
│   │   └── canisterService.js           (MODIFY - return privileges)
│   └── utils/
│       └── canisterCapabilities.js      (NEW FILE - privilege helpers)
```

### What's Already Working ✅
1. **Backend Fix**: `GetExternalCanisterResult` properly returns both `canister` and `privileges`
2. **Frontend Service**: `getCanisterDetails()` receives privileges but doesn't return them yet
3. **Snapshots**: Work perfectly for canisters where Orbit IS a controller (like the frontend)
4. **Display Issues**: Fixed state (Active/Archived) and date parsing bugs

### What's Broken ❌
1. **No Permission Checks**: UI shows snapshot/upgrade buttons even when they won't work
2. **Confusing Errors**: Users get "not a controller" errors after trying operations
3. **Backend in List**: Backend canister appears in management UI (shouldn't be there)
4. **IC Status Calls**: Trying to get canister_status without controller permission fails

### Dependencies
- **Frontend**: React, shadcn/ui components, daopad_backend actor
- **Backend**: Already provides privileges via `get_canister_details()` (no changes needed)
- **Orbit Station**: Provides `ExternalCanisterCallerPrivileges` with each canister

## Architecture Understanding

```
User's DAOPad Frontend
    ↓ (calls)
DAOPad Backend (lwsav-iiaaa-aaaap-qp2qq-cai)
    ↓ (admin of)
Orbit Station (fec7w-zyaaa-aaaaa-qaffq-cai)
    ↓ (controller of some canisters, not others)
Managed Canisters
    ├─ Frontend (l7rlj-...) ✅ Orbit IS controller → full management works
    ├─ Backend (lwsav-...) ❌ Orbit NOT controller → management fails
    └─ Other canisters (varies)
```

### Controllers Check Example

```bash
# Frontend canister - Orbit IS a controller
dfx canister --network ic info l7rlj-6aaaa-aaaap-qp2ra-cai
# Returns: Controllers: ... fec7w-zyaaa-aaaaa-qaffq-cai ... ✅

# Backend canister - Orbit NOT a controller
dfx canister --network ic info lwsav-iiaaa-aaaap-qp2qq-cai
# Returns: Controllers: ... (no fec7w-...) ❌
```

## The Solution: Privileges-Based UI

Orbit Station already provides `ExternalCanisterCallerPrivileges` with every canister:

```rust
pub struct ExternalCanisterCallerPrivileges {
    pub id: String,
    pub canister_id: Principal,
    pub can_change: bool,      // 👈 Can take snapshots, upgrade, change settings
    pub can_fund: bool,         // 👈 Can add cycles
    pub can_call: Vec<String>,  // 👈 Methods allowed to call
}
```

**The privileges tell us exactly what we can do!**

## Implementation Plan

**Note**: Code snippets below show exact changes needed. Implementing agent should follow these patterns precisely.

### Phase 1: Pass Privileges Through the Chain

#### File 1: `daopad_frontend/src/services/canisterService.js` (MODIFY)

**Location**: Line 160, `getCanisterDetails()` method

**Current Code**:
```javascript
if (orbitResult.Ok) {
  return {
    success: true,
    data: parseCanisterFromCandid(orbitResult.Ok.canister)
  };
}
```

**New Code**:
```javascript
if (orbitResult.Ok) {
  return {
    success: true,
    data: parseCanisterFromCandid(orbitResult.Ok.canister),
    privileges: orbitResult.Ok.privileges // Include privileges
  };
}
```

#### File 2: `daopad_frontend/src/components/canisters/CanisterDetails.jsx` (MODIFY)

**Update state to track privileges**:

```javascript
// Around line 14-17
const [canister, setCanister] = useState(null);
const [privileges, setPrivileges] = useState(null); // Add this

// In fetchCanisterDetails() around line 30
const result = await canisterService.getCanisterDetails(
  tokenCanisterId,
  canisterId
);

if (result.success) {
  setCanister(result.data);
  setPrivileges(result.privileges); // Store privileges
  setStatus(result.status);
} else {
  setError(result.error);
}
```

**Pass privileges to child components**:

```javascript
// Around line 160+
<TabsContent value="snapshots">
  <CanisterSnapshots
    canister={canister}
    privileges={privileges} // Pass privileges down
    orbitStationId={orbitStationId}
    onRefresh={fetchCanisterDetails}
  />
</TabsContent>

<TabsContent value="settings">
  <CanisterSettings
    canister={canister}
    privileges={privileges} // Pass privileges down
    orbitStationId={orbitStationId}
    onRefresh={fetchCanisterDetails}
  />
</TabsContent>
```

### Phase 2: Create Capabilities Helper

#### File 3: `daopad_frontend/src/utils/canisterCapabilities.js` (NEW FILE)

```javascript
/**
 * Utility functions to check canister operation capabilities
 * based on Orbit Station privileges
 */

export const canisterCapabilities = {
  /**
   * Check if we can perform management operations (snapshots, upgrades, settings)
   */
  canManage: (privileges) => {
    return privileges?.can_change === true;
  },

  /**
   * Check if we can add cycles to the canister
   */
  canFund: (privileges) => {
    return privileges?.can_fund === true;
  },

  /**
   * Check if we can call a specific method
   */
  canCallMethod: (privileges, methodName) => {
    if (!privileges?.can_call) return false;
    return privileges.can_call.some(m => m.method_name === methodName);
  },

  /**
   * Get permission level description for UI
   */
  getPermissionLevel: (privileges) => {
    if (!privileges) return { level: 'none', label: 'No Access', color: 'gray' };

    const canManage = privileges.can_change === true;
    const canFund = privileges.can_fund === true;
    const canCall = (privileges.can_call?.length || 0) > 0;

    if (canManage) {
      return { level: 'full', label: 'Full Management', color: 'green' };
    } else if (canFund || canCall) {
      return { level: 'limited', label: 'Limited Access', color: 'yellow' };
    } else {
      return { level: 'readonly', label: 'Read Only', color: 'blue' };
    }
  }
};
```

### Phase 3: Update Components to Respect Privileges

#### File 4: `daopad_frontend/src/components/canisters/CanisterSnapshots.jsx` (MODIFY)

**Add privileges prop and checks**:

```javascript
// Update component signature (line 20)
export default function CanisterSnapshots({
  canister,
  privileges,  // Add this
  orbitStationId,
  onRefresh
}) {
  const canManage = privileges?.can_change === true;

  // Disable operations if no permission
  const handleTakeSnapshot = async () => {
    if (!canManage) {
      setError('You do not have permission to take snapshots of this canister.');
      return;
    }
    // ... existing code
  };

  // Update UI to show/disable based on permissions
  return (
    <div>
      {!canManage && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have read-only access to this canister.
            To take snapshots or restore, Orbit Station must be a controller.
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleTakeSnapshot}
        disabled={takingSnapshot || snapshots.length >= MAX_SNAPSHOTS || !canManage}
      >
        <Camera className="h-4 w-4 mr-2" />
        Take Snapshot
      </Button>

      {/* Show snapshots but disable actions if no permission */}
      {snapshots.map(snapshot => (
        <div key={snapshot.id}>
          <Button
            onClick={() => handleRestore(snapshot.id)}
            disabled={restoring || !canManage}
          >
            Restore
          </Button>
          <Button
            onClick={() => handleDelete(snapshot.id)}
            disabled={deleting || !canManage}
          >
            Delete
          </Button>
        </div>
      ))}
    </div>
  );
}
```

#### File 5: `daopad_frontend/src/components/canisters/CanisterSettings.jsx` (MODIFY)

**Add privileges prop and disable features**:

```javascript
export default function CanisterSettings({
  canister,
  privileges,  // Add this
  orbitStationId,
  onRefresh
}) {
  const canManage = privileges?.can_change === true;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Canister Settings</CardTitle>
        <CardDescription>
          {canManage
            ? 'Manage canister configuration and policies'
            : 'View canister configuration (read-only)'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!canManage && (
          <Alert className="mb-4">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              This canister is in read-only mode. Management operations require
              Orbit Station to be a controller.
            </AlertDescription>
          </Alert>
        )}

        {/* Disable all input fields and buttons when !canManage */}
        <Input
          disabled={!canManage || saving}
          // ... other props
        />

        <Button
          onClick={handleSaveMetadata}
          disabled={!canManage || saving}
        >
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
```

#### File 6: `daopad_frontend/src/components/canisters/CanisterUpgrade.jsx` (MODIFY)

Similar pattern - add privileges prop and disable upload/upgrade when `!privileges?.can_change`.

### Phase 4: Add Permission Badge to Overview

#### File 7: `daopad_frontend/src/components/canisters/CanisterOverview.jsx` (MODIFY)

**Show permission level prominently**:

```javascript
import { canisterCapabilities } from '../../utils/canisterCapabilities';

export default function CanisterOverview({
  canister,
  privileges,  // Add this
  status
}) {
  const permissionInfo = canisterCapabilities.getPermissionLevel(privileges);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Canister Overview</CardTitle>

          {/* Permission Badge */}
          <Badge
            variant={permissionInfo.color === 'green' ? 'default' : 'secondary'}
            className={`
              ${permissionInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : ''}
              ${permissionInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' : ''}
            `}
          >
            <Shield className="h-3 w-3 mr-1" />
            {permissionInfo.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* If limited access, explain what's missing */}
        {permissionInfo.level !== 'full' && (
          <Alert className="mb-4">
            <AlertDescription>
              <strong>Limited Management:</strong> Some operations are unavailable.
              To enable full management (snapshots, upgrades, settings),
              add Orbit Station (fec7w-zyaaa-aaaaa-qaffq-cai) as a controller.
            </AlertDescription>
          </Alert>
        )}

        {/* Rest of overview */}
      </CardContent>
    </Card>
  );
}
```

### Phase 5: Filter Backend from Canister List

#### File 8: `daopad_frontend/src/components/canisters/CanisterList.jsx` (MODIFY)

**Don't show the backend canister itself**:

```javascript
// Around where canisters are filtered/displayed
const BACKEND_CANISTER = 'lwsav-iiaaa-aaaap-qp2qq-cai';

// Filter out backend from display
const displayCanisters = canisters.filter(c =>
  c.canister_id !== BACKEND_CANISTER
);

return (
  <div>
    {displayCanisters.map(canister => (
      <CanisterCard key={canister.id} canister={canister} />
    ))}
  </div>
);
```

### Phase 6: Remove IC Management Status (Optional)

The `canister_status` calls from IC Management will fail unless you're a controller. Two options:

**Option A: Remove IC Management Status Entirely**
- Don't show cycles, memory, compute allocation
- Only show Orbit Station metadata (name, description, labels, state)

**Option B: Make IC Management Status Optional**
- Try to get status, but don't fail if it doesn't work
- Show "N/A" or hide the section if status unavailable

**Recommended**: Option B with graceful degradation.

#### File 9: `daopad_frontend/src/components/canisters/CanisterOverview.jsx` (MODIFY)

```javascript
// Make status optional in display
{status ? (
  <div className="grid grid-cols-2 gap-4">
    <div>
      <span className="text-sm text-gray-600">Cycles Balance</span>
      <span className="text-lg font-semibold">{formatCycles(status.cycles)}</span>
    </div>
    <div>
      <span className="text-sm text-gray-600">Memory Usage</span>
      <span className="text-lg font-semibold">{formatBytes(status.memory_size)}</span>
    </div>
  </div>
) : (
  <Alert>
    <AlertDescription>
      Detailed metrics unavailable (requires controller access)
    </AlertDescription>
  </Alert>
)}
```

## Testing Strategy

### Test Cases

1. **Fully Controlled Canister** (Frontend: `l7rlj-6aaaa-aaaap-qp2ra-cai`)
   - ✅ Should show "Full Management" badge
   - ✅ All buttons enabled (snapshot, upgrade, settings)
   - ✅ Operations should succeed
   - ✅ IC status should load

2. **Uncontrolled Canister** (Backend: `lwsav-iiaaa-aaaap-qp2qq-cai`)
   - ✅ Should NOT appear in list at all (filtered out)
   - ✅ If accessed directly, show "Read Only" badge
   - ✅ All management buttons disabled
   - ✅ Clear message explaining why

3. **Partially Controlled Canister** (if any exist)
   - ✅ Show "Limited Access" badge
   - ✅ Enable only operations where can_call has methods
   - ✅ Disable snapshot/upgrade/settings

### Manual Testing

```bash
# Test with actual Orbit Station
export TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"

# Check privileges for frontend (should have full access)
dfx canister --network ic call $TEST_STATION get_external_canister '(record {
  canister_id = principal "l7rlj-6aaaa-aaaap-qp2ra-cai"
})'
# Look for: can_change = true; can_fund = true;

# Try snapshot on frontend (should work)
# Navigate to frontend canister → Snapshots → Take Snapshot

# Try snapshot on backend (should be filtered out or disabled)
# Backend shouldn't appear in list
```

## Scope Estimate

### Files Modified
- **New files:** 1 (canisterCapabilities.js utility)
- **Modified files:** 7 (CanisterDetails, CanisterSnapshots, CanisterSettings, CanisterUpgrade, CanisterOverview, CanisterList, canisterService)
- **Backend changes:** 0 (backend already provides privileges)

### Lines of Code
- **New utility:** ~50 lines (canisterCapabilities.js)
- **Component modifications:** ~150 lines (privilege checks, disabled states, alerts)
- **Service modification:** ~5 lines (return privileges)
- **Net:** +205 lines

### Complexity
- **Low:** Simple prop passing, boolean checks
- **Medium:** UI state management, conditional rendering
- **High:** None (no complex logic or async operations)

### Time Estimate
- Implementation: 2-3 hours
- Testing on mainnet: 30-60 minutes
- Review iteration: 15-30 minutes
- **Total:** 3-4 hours (single PR)

## Deployment Process

```bash
cd /home/theseus/alexandria/daopad/src/daopad

# Frontend only (backend unchanged)
./deploy.sh --network ic --frontend-only

# Test on mainnet
open https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
```

## Critical Implementation Notes

### 🚨 Frontend-Only Changes
**NO BACKEND MODIFICATIONS required** - backend already returns privileges correctly.
- Don't modify Rust code
- Don't run candid-extractor
- Don't sync declarations
- Just deploy frontend: `./deploy.sh --network ic --frontend-only`

### DAOPad-Specific Requirements

#### No Declaration Sync Needed (Frontend-Only)
Since we're NOT changing the backend, we don't need to:
- ❌ Run candid-extractor
- ❌ Sync declarations
- ❌ Deploy backend

**Just deploy frontend:**
```bash
./deploy.sh --network ic --frontend-only
```

#### Don't Skip Testing
Every change MUST be:
1. Deployed: `./deploy.sh --network ic --frontend-only`
2. Verified on frontend: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
3. Tested with both controlled and uncontrolled canisters

### Do Follow Existing Patterns
- Use existing Alert, Badge, Button components from shadcn/ui
- Follow existing error handling patterns
- Match existing component prop patterns
- Maintain consistent code style

## Success Criteria

- ✅ Users see clear permission badges on each canister
- ✅ Disabled buttons have tooltips explaining why
- ✅ No confusing "not a controller" errors
- ✅ Backend canister doesn't appear in management UI
- ✅ Snapshots work on fully-controlled canisters
- ✅ Read-only mode works gracefully for limited canisters
- ✅ Users understand what they can/can't do before trying

## Future Enhancements

### Phase 2 Improvements
1. **Add Controller Management**
   - UI to add Orbit Station as controller
   - Warning: "This canister isn't fully managed yet. Add Orbit as controller?"

2. **Privilege Explanations**
   - Detailed tooltips on what each privilege means
   - Links to documentation

3. **Bulk Operations**
   - "Add Orbit as controller to all canisters"
   - "Check management status across all canisters"

4. **Permission Requests**
   - Create governance proposal to add Orbit as controller
   - Track controller change requests

## Key Insights from Implementation

### Why This Matters
- **User Experience**: No more confusing errors
- **Transparency**: Clear about what's possible
- **Safety**: Can't accidentally try operations that will fail
- **Governance**: Respects Orbit's permission model

### Common Pitfalls to Avoid
1. ❌ Don't assume all canisters in Orbit have same permissions
2. ❌ Don't try to bypass controller checks (they're IC-level)
3. ❌ Don't show backend canister in management UI
4. ❌ Don't fail loudly when IC status unavailable

### Architecture Principle
**Registry ≠ Control**: Just because a canister is registered in Orbit doesn't mean Orbit controls it. Always check privileges!

---

## 🚀 Handoff to Implementing Agent

✅ **Plan Complete:** Capability-Based Canister Management UI

**Document:** `CAPABILITY_BASED_UI_PLAN.md`

**Estimated:** 3-4 hours, 1 PR (frontend-only)

**Prerequisites:**
- Backend already returns privileges ✅
- Decode errors fixed ✅
- State/date display fixed ✅

**Handoff prompt for fresh agent:**

```
Pursue @CAPABILITY_BASED_UI_PLAN.md
```

---

## 🚨 **IMPORTANT INSTRUCTIONS FOR IMPLEMENTING AGENT**

**DO NOT skip the isolation check at the top of this plan!**

The plan document starts with a **MANDATORY isolation check** and **embedded orchestrator prompt**. The implementing agent should:

1. **Run the isolation check first** (Step 0 at top of document)
2. **Follow the embedded execution prompt** (autonomous steps listed at top)
3. **Do not ask for permission** - execute autonomously per the orchestrator workflow
4. **Work in isolated worktree** - NOT the main repository

**Why this matters:**
- Other agents ARE working in parallel in main repo
- Isolation prevents file conflicts
- Plan includes complete autonomous execution steps
- No context pollution from this planning session

---

## 🛑 PLANNING AGENT - YOUR JOB IS DONE

This plan implements intelligent permission-aware UI that prevents user confusion and respects the IC's controller model.

**DO NOT:**
- ❌ Implement code
- ❌ Make edits
- ❌ Create PRs
- ❌ Deploy
- ❌ Ask "should I continue?" and then execute
- ❌ Use ExitPlanMode and then implement

**The implementing agent will execute this plan in a fresh conversation using the embedded orchestrator prompt at the top.**

**🛑 END CONVERSATION HERE 🛑**
