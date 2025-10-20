# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-permission-groups/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-permission-groups/src/daopad`
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
   git commit -m "[Feature]: User Group Tracking in Permissions Tab"
   git push -u origin feature/permission-group-tracking
   gh pr create --title "[Feature]: User Group Tracking in Permissions Tab" --body "Implements PERMISSION_GROUP_TRACKING.md - Displays group names (Admin/Operator/Custom) instead of UUIDs in permissions"
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

**Branch:** `feature/permission-group-tracking`
**Worktree:** `/home/theseus/alexandria/daopad-permission-groups/src/daopad`

---

# Implementation Plan: User Group Tracking in Permissions Tab

## Problem Statement

The Permissions tab currently shows raw group UUIDs instead of human-readable group names. Users see:
- `00000000-0000-4000-8000-000000000000` instead of "Admin"
- `00000000-0000-4000-8000-000000000001` instead of "Operator"
- Custom group UUIDs with no indication of what they represent

This makes it impossible to understand which roles have access to which permissions.

## Research Findings

### Orbit Station's Group System

Orbit Station has a hierarchical group system:

1. **Default Groups** (created at station initialization):
   - **Admin Group**: UUID `00000000-0000-4000-8000-000000000000`
     - Full control over all resources
     - Can modify permissions, policies, users
     - Required for system upgrades and critical operations

   - **Operator Group**: UUID `00000000-0000-4000-8000-000000000001`
     - Operational access for non-sensitive tasks
     - Can manage accounts, transfers, address book
     - Cannot modify system-level settings

2. **Custom Groups**:
   - Created by admins for specific purposes
   - Named groups like "Finance Team", "Treasury Committee", etc.
   - Each has unique UUID and custom permissions

### Current Implementation Gaps

**What we have:**
- ✅ Backend fetches permissions from Orbit (`list_station_permissions`)
- ✅ Frontend displays permissions grouped by category
- ✅ Risk calculation filters non-admin groups
- ✅ Hard-coded ADMIN_GROUP_ID in frontend

**What's missing:**
- ❌ No API to fetch user group list from Orbit
- ❌ No UUID-to-name mapping for groups
- ❌ No display of actual group names
- ❌ No visibility into which specific groups have access
- ❌ No tracking of custom groups beyond admin

### Files to Modify

**Backend:**
- `daopad_backend/src/api/orbit_permissions.rs` - Add list_user_groups method
- `daopad_backend/src/types/orbit.rs` - Already has UserGroup type

**Frontend:**
- `daopad_frontend/src/components/permissions/PermissionsTable.tsx` - Display group names
- `daopad_frontend/src/utils/permissionRisk.ts` - Update to use group names
- `daopad_frontend/src/pages/PermissionsPage.tsx` - Fetch and pass group data

## Implementation Plan

### Step 1: Add Backend API for User Groups

**File:** `daopad_backend/src/api/orbit_permissions.rs`

**Add new method:**
```rust
// PSEUDOCODE
/// List all user groups in a station (admin proxy)
///
/// Fetches the complete list of user groups including Admin, Operator, and custom groups.
/// Frontend uses this to map UUIDs to human-readable names.
#[ic_cdk::update]
pub async fn list_station_user_groups(
    station_id: Principal
) -> Result<Vec<UserGroup>, String> {
    // Construct input for Orbit's list_user_groups API
    let input = ListUserGroupsInput {
        search_term: None,
        paginate: None,
    };

    // Call Orbit station's list_user_groups
    let result = ic_cdk::call(
        station_id,
        "list_user_groups",
        (input,)
    ).await;

    // Handle result and extract groups
    match result {
        Ok((ListUserGroupsResult::Ok { user_groups, .. },)) => {
            Ok(user_groups)
        }
        Ok((ListUserGroupsResult::Err(e),)) => {
            Err(format!("Orbit error: {}", e))
        }
        Err(e) => {
            Err(format!("Call failed: {:?}", e))
        }
    }
}
```

**Add to types if not present:**
```rust
// PSEUDOCODE in daopad_backend/src/types/orbit.rs
// (Already exists, just verify structure matches)

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct UserGroup {
    pub id: String, // UUID
    pub name: String,
}

#[derive(CandidType, Serialize)]
pub struct ListUserGroupsInput {
    pub search_term: Option<String>,
    pub paginate: Option<PaginationInput>,
}

#[derive(CandidType, Deserialize)]
pub enum ListUserGroupsResult {
    Ok {
        user_groups: Vec<UserGroup>,
        next_offset: Option<u64>,
        total: u64,
        privileges: Vec<UserGroupCallerPrivileges>,
    },
    Err(Error),
}

#[derive(CandidType, Deserialize)]
pub struct UserGroupCallerPrivileges {
    pub id: String,
    pub can_edit: bool,
    pub can_delete: bool,
}
```

### Step 2: Test Backend with dfx

**Before coding, verify Orbit API works:**
```bash
# Use test station with admin access
export STATION="fec7w-zyaaa-aaaaa-qaffq-cai"

# Test list_user_groups call
dfx canister --network ic call $STATION list_user_groups '(record {
  search_term = null;
  paginate = null;
})'

# Expected output: Admin and Operator groups at minimum
# Verify response structure matches our types
```

### Step 3: Update Frontend to Fetch Groups

**File:** `daopad_frontend/src/pages/PermissionsPage.tsx`

**Add group fetching:**
```javascript
// PSEUDOCODE

const [userGroups, setUserGroups] = useState([]);
const [loadingGroups, setLoadingGroups] = useState(true);

useEffect(() => {
  async function fetchUserGroups() {
    if (!actor || !stationId) return;

    setLoadingGroups(true);
    try {
      const stationPrincipal = typeof stationId === 'string'
        ? Principal.fromText(stationId)
        : stationId;

      const result = await actor.list_station_user_groups(stationPrincipal);

      if (result.Ok) {
        setUserGroups(result.Ok);
      } else if (result.Err) {
        console.error('Failed to fetch user groups:', result.Err);
        setUserGroups([]);
      }
    } catch (error) {
      console.error('Error fetching user groups:', error);
      setUserGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  }

  fetchUserGroups();
}, [actor, stationId]);

// Pass to PermissionsTable
return (
  <PermissionsTable
    stationId={stationId}
    actor={actor}
    userGroups={userGroups}
    loadingGroups={loadingGroups}
  />
);
```

### Step 4: Update PermissionsTable to Display Group Names

**File:** `daopad_frontend/src/components/permissions/PermissionsTable.tsx`

**Add props and create UUID→name mapping:**
```javascript
// PSEUDOCODE

export default function PermissionsTable({
  stationId,
  actor,
  userGroups = [],
  loadingGroups = false
}) {
  // Create lookup map for fast UUID→name conversion
  const groupNameMap = useMemo(() => {
    const map = new Map();
    userGroups.forEach(group => {
      map.set(group.id, group.name);
    });
    return map;
  }, [userGroups]);

  // Helper function to get group name from UUID
  const getGroupName = useCallback((uuid) => {
    return groupNameMap.get(uuid) || uuid; // Fallback to UUID if not found
  }, [groupNameMap]);

  // Pass to PermissionRow
  return (
    <div>
      {filteredPermissions.map(perm => (
        <PermissionRow
          key={key}
          permission={perm}
          getGroupName={getGroupName}
        />
      ))}
    </div>
  );
}
```

**Update PermissionRow to show group names:**
```javascript
// PSEUDOCODE

function PermissionRow({ permission, getGroupName }) {
  const groups = permission?.allow?.user_groups || [];
  const risk = permission._risk || { level: 'none', groups: [] };

  return (
    <div>
      <div className="text-sm text-muted-foreground">
        {risk.groups.length > 0 ? (
          <span className="text-orange-400">
            {/* Show actual group names instead of UUIDs */}
            {risk.groups.map(uuid => getGroupName(uuid)).join(', ')} have access
          </span>
        ) : (
          <span>Admin only</span>
        )}
      </div>

      {/* Optionally show all groups with access */}
      {groups.length > 0 && (
        <div className="text-xs text-muted-foreground mt-1">
          Groups: {groups.map(uuid => getGroupName(uuid)).join(', ')}
        </div>
      )}
    </div>
  );
}
```

### Step 5: Add Group Summary Section

**File:** `daopad_frontend/src/pages/PermissionsPage.tsx`

**Add group overview card:**
```javascript
// PSEUDOCODE

<div className="space-y-6">
  {/* User Groups Summary */}
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Users className="h-5 w-5" />
        User Groups ({userGroups.length})
      </CardTitle>
      <CardDescription>
        Roles and groups configured in this Orbit Station
      </CardDescription>
    </CardHeader>
    <CardContent>
      {loadingGroups ? (
        <p className="text-muted-foreground">Loading groups...</p>
      ) : userGroups.length === 0 ? (
        <p className="text-muted-foreground">No groups found</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {userGroups.map(group => (
            <div key={group.id} className="flex items-center gap-2 p-3 border rounded-lg">
              {/* Badge for default groups */}
              {group.id === '00000000-0000-4000-8000-000000000000' && (
                <Badge variant="destructive">Admin</Badge>
              )}
              {group.id === '00000000-0000-4000-8000-000000000001' && (
                <Badge className="bg-blue-600">Operator</Badge>
              )}
              {/* Group name */}
              <span className="font-medium">{group.name}</span>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>

  {/* Main permissions table */}
  <PermissionsTable
    stationId={stationId}
    actor={actor}
    userGroups={userGroups}
    loadingGroups={loadingGroups}
  />
</div>
```

### Step 6: Update Risk Calculation

**File:** `daopad_frontend/src/utils/permissionRisk.ts`

**Update constants for both group IDs:**
```javascript
// PSEUDOCODE

const ADMIN_GROUP_ID = '00000000-0000-4000-8000-000000000000';
const OPERATOR_GROUP_ID = '00000000-0000-4000-8000-000000000001';

export function calculatePermissionRisk(permission) {
  const resourceType = getResourceType(permission.resource);

  // Filter out both admin AND operator for "admin only" detection
  const nonDefaultGroups = (permission.allow?.user_groups || [])
    .filter(g => g !== ADMIN_GROUP_ID && g !== OPERATOR_GROUP_ID);

  // If only admin/operator have access, it's lower risk
  if (nonDefaultGroups.length === 0) {
    return { level: 'none', groups: [] };
  }

  // Risk based on resource type AND which groups have access
  if (RISK_MATRIX.critical.includes(resourceType)) {
    return { level: 'critical', groups: nonDefaultGroups };
  }
  // ... rest of risk logic
}
```

## Testing Requirements

### 1. Backend Testing
```bash
# Build backend
cargo build --target wasm32-unknown-unknown --release -p daopad_backend

# Extract candid
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Verify new method exists
grep "list_station_user_groups" daopad_backend/daopad_backend.did

# Deploy backend
./deploy.sh --network ic --backend-only

# Sync declarations
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# Test via dfx
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_station_user_groups '(principal "fec7w-zyaaa-aaaaa-qaffq-cai")'

# Expected: List of groups including "Admin" and "Operator"
```

### 2. Frontend Testing
```bash
# Build frontend
npm run build

# Deploy frontend
./deploy.sh --network ic --frontend-only

# Manual testing in browser:
# 1. Navigate to Permissions tab
# 2. Verify "User Groups" section shows Admin and Operator
# 3. Verify permissions show "Admin", "Operator" instead of UUIDs
# 4. Check risk indicators still work correctly
# 5. Test with different tokens/stations
```

### 3. Integration Testing
- Create a custom group in Orbit Station test environment
- Assign permission to custom group
- Verify it appears with custom name in DAOPad
- Verify risk calculation handles custom groups correctly

## Expected Outcomes

**Before:**
```
Permission: Account.Transfer
Groups with access: 00000000-0000-4000-8000-000000000001
```

**After:**
```
Permission: Account.Transfer
Groups with access: Operator

User Groups (2):
- Admin (default)
- Operator (default)
```

**With Custom Groups:**
```
Permission: Account.Transfer
Groups with access: Finance Team, Operator

User Groups (3):
- Admin (default)
- Operator (default)
- Finance Team (custom)
```

## Architecture Notes

### Why This Approach?

1. **Minimal Backend Changes**: Single new API method, reuses existing types
2. **Real-time Accuracy**: Fetches groups on each page load, no stale data
3. **No Storage Overhead**: Groups fetched dynamically, not cached in backend
4. **Follows Existing Patterns**: Matches `list_station_permissions` pattern
5. **Backwards Compatible**: Falls back to UUID if group name unavailable

### Security Considerations

- Backend acts as admin proxy (already established pattern)
- Group list is read-only operation (no modification)
- Frontend doesn't need special permissions (backend handles it)
- No sensitive data exposed (group names are already visible to members)

### Performance Considerations

- Two API calls on permissions tab load:
  1. `list_station_permissions` (existing)
  2. `list_station_user_groups` (new)
- Both calls happen in parallel
- Groups list is typically small (< 10 groups)
- Frontend memoizes group name lookup map

## Rollout Plan

1. ✅ Create worktree and branch
2. Add backend API method
3. Test backend with dfx
4. Deploy backend to IC
5. Update frontend to fetch groups
6. Update frontend to display names
7. Test frontend on IC
8. Deploy frontend to IC
9. Create PR
10. Iterate on feedback

## Success Criteria

- [ ] Backend method `list_station_user_groups` works in dfx
- [ ] Backend method works when called from frontend
- [ ] Permissions tab shows "Admin" instead of admin UUID
- [ ] Permissions tab shows "Operator" instead of operator UUID
- [ ] Custom groups (if any) show custom names
- [ ] Group summary section displays all groups
- [ ] Risk calculation still works correctly
- [ ] No console errors in browser
- [ ] PR created and reviewable
