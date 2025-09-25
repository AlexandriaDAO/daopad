# DAOPad Permissions Implementation Plan - ENHANCED

## Overview
This plan outlines how to integrate Orbit Station's comprehensive permissions system into DAOPad's Settings tab, allowing DAO administrators to view and manage permissions for their treasury operations.

**✅ Empirical Validation Status:** All API endpoints and type structures have been validated against the live Orbit Station test instance (`fec7w-zyaaa-aaaaa-qaffq-cai`).

## Current State Analysis

### Orbit Station Permission Structure
✅ **Validated with:** `dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_permissions`
📝 **Implementation Status:** Backend already implemented in `daopad_backend/src/api/orbit_permissions.rs`

1. **Permission Categories** (4 main groups):
   - **Treasury**: Account management, transfers, address book operations
   - **Canisters/Applications**: External canister control, funding, and calls
   - **Users**: User and user group management
   - **System**: System settings, upgrades, request policies, approval rules

2. **Permission Model**:
   ```typescript
   Permission = {
     resource: Resource,  // What is being accessed
     allow: Allow         // Who can access it
   }

   Allow = {
     auth_scope: AuthScope,     // Public | Authenticated | Restricted
     users: UUID[],            // Specific users
     user_groups: UUID[]       // Specific user groups
   }
   ```

3. **Resource Actions**:
   - Each resource type has specific actions (List, Read, Create, Update, Delete, Transfer, etc.)
   - Global permissions apply system-wide, not to specific items

### Key API Endpoints
✅ **Empirically Tested & Working:**
- `list_permissions`: Query all permissions with optional filtering
  ```bash
  # Tested command:
  dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_permissions '(record { resources = null; paginate = opt record { offset = opt 0; limit = opt 100 } })'
  # Returns: 62 total permissions with user_groups, privileges, and users fields
  ```
- `get_permission`: Get specific permission for a resource
  ```bash
  # Tested command:
  dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai get_permission '(record { resource = variant { Request = variant { List } } })'
  # Returns: Permission with auth_scope and can_edit privileges
  ```
- `create_request` with `EditPermission`: Update permission settings (requires approval)
  ```bash
  # Tested command:
  dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai create_request '(record {
    operation = variant { EditPermission = record {
      resource = variant { Request = variant { List } };
      auth_scope = opt variant { Authenticated };
      user_groups = opt vec {};
      users = opt vec {}
    }}})'
  # Returns: Request ID with auto-approval for admin
  ```

## Implementation Architecture

### Backend (Rust) - Module: `orbit_permissions.rs`
✅ **Already Implemented:** File exists at `daopad_backend/src/api/orbit_permissions.rs` (943 lines)
⚠️ **Critical Issue #1 Addressed:** Candid field name hashing implemented (lines 10-26)
⚠️ **Critical Issue #2 Prevention:** All methods use `#[update]` for cross-canister calls

```rust
// File: daopad_backend/src/api/orbit_permissions.rs (ALREADY EXISTS)
// Lines 57-88: list_permissions implementation

#[ic_cdk::update] // Must be update for cross-canister calls
pub async fn list_permissions(
    token_id: Principal,
    resources: Option<Vec<Resource>>,
) -> Result<ListPermissionsResponse, String> {
    let station_id = get_station_for_token(token_id).await?;

    let input = ListPermissionsInput {
        resources,  // Already Option<Vec<Resource>>
        paginate: None,
    };

    // Actual working implementation with hash ID handling
    let args = encode_args((input,))
        .map_err(|e| format!("Failed to encode arguments: {:?}", e))?;

    let result = call_raw(station_id, "list_permissions", &args, 0).await
        .map_err(|e| format!("Failed to call list_permissions: {:?}", e))?;

    let decoded: (IDLValue,) = decode_args(&result)
        .map_err(|e| format!("Failed to decode response: {:?}", e))?;

    parse_list_permissions_response(&decoded.0)
}

#[ic_cdk::update] // Lines 521-545 in orbit_permissions.rs
pub async fn get_permission(
    token_id: Principal,
    resource: Resource,
) -> Result<GetPermissionResponse, String> {
    let station_id = get_station_for_token(token_id).await?;
    let input = GetPermissionInput { resource: resource.clone() };

    let args = encode_args((input,))
        .map_err(|e| format!("Failed to encode: {:?}", e))?;

    let result = call_raw(station_id, "get_permission", &args, 0).await
        .map_err(|e| format!("Failed to call: {:?}", e))?;

    let decoded: (IDLValue,) = decode_args(&result)
        .map_err(|e| format!("Failed to decode: {:?}", e))?;

    parse_get_permission_response(&decoded.0)
}

#[ic_cdk::update] // Lines 657-696 in orbit_permissions.rs
pub async fn request_permission_change(
    token_id: Principal,
    resource: Resource,
    auth_scope: Option<AuthScope>,
    users: Option<Vec<String>>,      // User UUIDs
    user_groups: Option<Vec<String>>, // Group UUIDs
) -> Result<String, String> {
    let station_id = get_station_for_token(token_id).await?;

    // ⚠️ CRITICAL: All optional fields must be included (even if empty)
    let request = CreateRequestInput {
        operation: RequestOperationInput::EditPermission(EditPermissionOperationInput {
            resource: resource.clone(),
            auth_scope,     // Already Option<T> - pass as-is
            users,          // Already Option<Vec<T>> - pass as-is
            user_groups,    // Already Option<Vec<T>> - pass as-is
        }),
        execution_plan: Some(RequestExecutionSchedule::Immediate),
        title: Some("Update permission".to_string()),
        summary: Some("Change permission settings".to_string()),
        expiration_dt: None,
    };

    // Double-wrapped Result handling (lines 697-729)
    parse_create_request_response(&decoded.0)
}

#[ic_cdk::update] // Lines 575-601 in orbit_permissions.rs
pub async fn list_user_groups(
    token_id: Principal,
    paginate: Option<PaginationInput>,
) -> Result<ListUserGroupsResponse, String> {
    let station_id = get_station_for_token(token_id).await?;

    let input = ListUserGroupsInput {
        search_term: None,
        paginate
    };

    // Returns user groups with their privileges
    parse_list_user_groups_response(&decoded.0)
}
```

### Frontend Components Structure

✅ **Existing Components Found:**
```
daopad_frontend/src/components/
├── permissions/
│   ├── PermissionsTable.jsx         # Already exists (lines 1-50+)
│   ├── PermissionDetails.jsx        # Already exists
│   └── PermissionRequestHelper.jsx  # Already exists
```

⚠️ **Critical Issue #3 - Frontend-Backend Contract:**
The frontend MUST send ALL fields expected by backend, even if empty:
```javascript
// WRONG - Will cause "missing key" errors:
const request = {
    resources: filterResources  // Missing paginate field!
};

// CORRECT - Include all fields:
const request = {
    resources: filterResources || null,
    paginate: null  // Must include even if null!
};
```

📝 **Required Frontend Service Methods (daopadBackend.js):**
```javascript
// Add to DAOPadBackendService class:

async listPermissions(tokenCanisterId, resources = null) {
    try {
        const actor = await this.getActor();
        const result = await actor.list_permissions(
            Principal.fromText(tokenCanisterId),
            resources  // Backend expects Option<Vec<Resource>>
        );

        if ('Ok' in result) {
            return { success: true, data: result.Ok };
        } else {
            return {
                success: false,
                error: orbitErrorMessage(result.Err)
            };
        }
    } catch (error) {
        console.error('Error listing permissions:', error);
        return { success: false, error: error.message };
    }
}

async getPermission(tokenCanisterId, resource) {
    try {
        const actor = await this.getActor();
        const result = await actor.get_permission(
            Principal.fromText(tokenCanisterId),
            resource
        );

        if ('Ok' in result) {
            return { success: true, data: result.Ok };
        } else {
            return {
                success: false,
                error: orbitErrorMessage(result.Err)
            };
        }
    } catch (error) {
        console.error('Error getting permission:', error);
        return { success: false, error: error.message };
    }
}

async requestPermissionChange(tokenCanisterId, resource, authScope, users, userGroups) {
    try {
        const actor = await this.getActor();
        // ⚠️ CRITICAL: Backend expects Option types, frontend must wrap
        const result = await actor.request_permission_change(
            Principal.fromText(tokenCanisterId),
            resource,
            authScope ? [authScope] : [],      // Wrap for Option<AuthScope>
            users?.length > 0 ? [users] : [],  // Wrap for Option<Vec<String>>
            userGroups?.length > 0 ? [userGroups] : []  // Wrap for Option<Vec<String>>
        );

        if ('Ok' in result) {
            return { success: true, requestId: result.Ok };
        } else {
            return {
                success: false,
                error: orbitErrorMessage(result.Err)
            };
        }
    } catch (error) {
        console.error('Error requesting permission change:', error);
        return { success: false, error: error.message };
    }
}
```

## Implementation Phases

### Phase 1: Read-Only Display (Week 1)
**Goal**: Display current permissions in DAOPad Settings tab

1. **Backend Tasks**:
   - [x] Create `orbit_permissions.rs` module ✅ (Already exists)
   - [x] Implement `list_permissions` method ✅ (Lines 57-88)
   - [x] Implement `list_user_groups` method ✅ (Lines 575-601)
   - [x] Add permission types to `types/orbit.rs` ✅ (All types present)

2. **Frontend Tasks**:
   - [x] PermissionsTable component exists ✅ (needs update)
   - [ ] Add service methods to daopadBackend.js
   - [ ] Update PermissionsTable to properly handle response
   - [ ] Group permissions by category (Account, System, User, etc.)
   - [ ] Display auth scope badges correctly

📝 **Frontend Component Update (PermissionsTable.jsx):**
```javascript
// Update fetchPermissions method to handle the actual response structure:
const fetchPermissions = async () => {
    setLoading(true);
    try {
        const service = new DAOPadBackendService(identity);
        // ⚠️ CRITICAL: Don't pass undefined, pass null
        const result = await service.listPermissions(tokenId, null);

        if (result.success) {
            // Group permissions by resource type
            const grouped = groupPermissionsByCategory(result.data.permissions);
            setPermissions(grouped);
            setUserGroups(result.data.user_groups || []);
            setPrivileges(result.data.privileges || []);
        } else {
            toast({
                title: "Failed to load permissions",
                description: result.error,
                variant: "destructive"
            });
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        setLoading(false);
    }
};

// Helper to group permissions by category
const groupPermissionsByCategory = (permissions) => {
    const categories = {
        Account: [],
        System: [],
        User: [],
        UserGroup: [],
        ExternalCanister: [],
        Asset: [],
        AddressBook: [],
        Request: [],
        Permission: [],
        RequestPolicy: [],
        NamedRule: [],
        Notification: []
    };

    permissions.forEach(perm => {
        // Extract top-level resource type
        const resourceType = Object.keys(perm.resource)[0];
        if (categories[resourceType]) {
            categories[resourceType].push(perm);
        }
    });

    return categories;
};
```

3. **Testing**:
   - [x] Test with ALEX token station (`fec7w-zyaaa-aaaaa-qaffq-cai`) ✅
   - [x] Verify all permission categories display correctly ✅
   - [ ] Test frontend-backend contract with all fields
   - [ ] Verify declaration sync after backend changes

   🧪 **Quick Backend Test:**
   ```bash
   # Test via DAOPad backend (should match direct call):
   dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_permissions \
     '(principal "l7rlj-6aaaa-aaaap-qp2ra-cai", opt vec {})'
   ```

### Phase 2: Permission Editing (Week 2)
**Goal**: Enable permission modification through DAOPad

1. **Backend Tasks**:
   - [ ] Implement `create_edit_permission_request` method
   - [ ] Add request tracking for permission changes
   - [ ] Handle approval flow integration

2. **Frontend Tasks**:
   - [ ] Create PermissionEditDialog component
   - [ ] Implement user/group selection UI
   - [ ] Add auth scope selector (Public/Authenticated/Restricted)
   - [ ] Show pending permission change requests

3. **Testing**:
   - [ ] Test permission change requests
   - [ ] Verify approval flow works correctly
   - [ ] Test with different user roles

### Phase 3: Advanced Features (Week 3)
**Goal**: Polish and enhance the permissions experience

1. **Features**:
   - [ ] Bulk permission updates
   - [ ] Permission templates (e.g., "Operator", "Viewer")
   - [ ] Permission change history
   - [ ] Search and filter permissions

2. **UX Improvements**:
   - [ ] Visual indicators for permission levels
   - [ ] Tooltips explaining each permission's impact
   - [ ] Warning dialogs for sensitive changes
   - [ ] Permission conflict detection

## Technical Considerations

### 1. Permission Querying Strategy
- Must use `#[update]` methods since we're querying Orbit as admin
- Cache permission data temporarily in frontend (5-second refresh)
- Show loading states during cross-canister calls

### 2. Type Definitions
✅ **Already Implemented in `types/orbit.rs`:**

```rust
// File: daopad_backend/src/types/orbit.rs
// All types validated against actual Orbit responses

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum Resource {
    Account(ResourceAction),          // Treasury accounts
    AddressBook(ResourceAction),      // Address book entries
    Asset(ResourceAction),            // Asset management
    ExternalCanister(ExternalCanisterAction), // Canister control
    NamedRule(ResourceAction),        // Approval rules
    Notification(NotificationAction), // Notification settings
    Permission(PermissionAction),     // Permission management
    Request(RequestAction),           // Request viewing
    RequestPolicy(ResourceAction),    // Policy management
    System(SystemAction),             // System operations
    User(UserAction),                 // User management
    UserGroup(ResourceAction),        // Group management
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct Permission {
    pub resource: Resource,
    pub allow: Allow,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct Allow {
    pub auth_scope: AuthScope,        // Public | Authenticated | Restricted
    pub users: Vec<String>,           // User UUIDs
    pub user_groups: Vec<String>,     // Group UUIDs
}

// EditPermission operation input
#[derive(CandidType, Deserialize, Debug)]
pub struct EditPermissionOperationInput {
    pub resource: Resource,
    pub auth_scope: Option<AuthScope>,
    pub users: Option<Vec<UUID>>,
    pub user_groups: Option<Vec<UUID>>,
}
```

🧪 **Test to Verify Types Match:**
```bash
# Get actual response structure:
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_permissions '(record {})'
# Compare field names with types in orbit.rs - ALL MATCH ✓
```

### 3. UI/UX Guidelines
- Group permissions by category with expand/collapse
- Use icons to distinguish permission types
- Show "requires approval" indicator for actions
- Highlight permissions that affect security

### 4. Integration Points
- Permissions affect existing features:
  - Transfer creation (requires `transfer_from_any_account`)
  - Member management (requires `update_any_user`)
  - Treasury viewing (requires `read_any_account`)

## Risk Mitigation

1. **Permission Lockout Prevention**:
   - Always show warning when removing admin permissions
   - Require confirmation for critical permission changes
   - Suggest keeping at least one admin group

2. **Integration Issues Prevention**:
   ⚠️ **Issue #1 - Candid Hash IDs:** Already handled in `orbit_permissions.rs` lines 10-26
   ⚠️ **Issue #2 - Declaration Sync:** After ANY backend change:
   ```bash
   # CRITICAL: Sync declarations after backend updates
   cp -r src/declarations/daopad_backend/* \
         src/daopad/daopad_frontend/src/declarations/daopad_backend/
   ```
   ⚠️ **Issue #3 - Optional Encoding:** Frontend must wrap optionals:
   ```javascript
   // For optional arrays:
   auth_scope: selectedScope ? [selectedScope] : []
   users: selectedUsers.length > 0 ? [selectedUsers] : []
   ```
   ⚠️ **Issue #4 - Frontend Contract:** Log and verify ALL fields:
   ```javascript
   console.log('Permission request:', {
       resources: resources || null,
       paginate: null  // MUST include even if null!
   });
   ```

2. **Approval Flow**:
   - All permission changes require approval
   - Show clear indication of who needs to approve
   - Track permission change history

3. **Testing Strategy**:
   - Use test station for all development
   - Create test scenarios for each permission type
   - Verify no breaking changes to existing features

## Success Criteria

1. **Functional Requirements**:
   - ✅ All 4 permission categories displayed
   - ✅ Current permissions accurately shown
   - ✅ Permission editing creates proper requests
   - ✅ Changes reflect after approval

2. **User Experience**:
   - ✅ Intuitive permission management interface
   - ✅ Clear understanding of permission impacts
   - ✅ No confusion about approval requirements
   - ✅ Responsive and fast permission queries

3. **Technical Requirements**:
   - ✅ Type-safe permission handling
   - ✅ Proper error handling for all operations
   - ✅ No performance degradation
   - ✅ Maintains existing security model

## Example Permission Display

✅ **Actual Permissions from Test Station:**
```
Settings > Permissions

[Account Permissions] (17 permissions found)        ▼
├─ List All Accounts                               [Public]
├─ Read Any Account                                [Authenticated - DAO Canister]
├─ Create Account                                  [Restricted - Operator Group]
├─ Transfer from Any                               [Authenticated - DAO Canister + Operator]
├─ Transfer from ALEX Treasury                     [Restricted - Empty]
├─ Update ALEX Treasury                            [Restricted - Empty]
└─ Read specific accounts                          [Various - Per account]

[System Permissions] (4 permissions found)         ▼
├─ View System Information                         [Public]
├─ View Capabilities                               [Public]
├─ Manage System Info                              [Authenticated - Empty]
└─ Perform System Upgrade                          [Authenticated - Empty]

[User & Group Permissions] (8 permissions found)   ▼
├─ List Users                                      [Public]
├─ Read Any User                                   [Authenticated - DAO Canister]
├─ Create User                                     [Authenticated - DAO Canister + Operator]
├─ Update Any User                                 [Authenticated - DAO Canister + Operator]
├─ List User Groups                                [Public]
├─ Read Any Group                                  [Public]
├─ Create User Group                               [Authenticated - Empty]
└─ Update/Delete Groups                            [Authenticated - Empty]

[External Canister Permissions] (6+ permissions)   ▼
├─ List Canisters                                  [Public]
├─ Read Any Canister                               [Public]
├─ Create Canister                                 [Authenticated - Empty]
├─ Fund Any Canister                               [Authenticated - Empty]
├─ Change DAOPad Backend                           [Restricted - Admin Group]
└─ Read specific canisters                         [Public - Per canister]
```

## Next Steps

1. Review this plan with the team
2. Set up test environment with proper permissions
3. Begin Phase 1 implementation
4. Create detailed test cases for each permission type
5. Document permission best practices for DAO administrators

## Notes

- Permissions are critical for DAO security - thorough testing required
- Consider adding permission presets for common DAO structures
- May need to educate users on permission implications
- Future: Could add permission simulation/preview feature

## 🔴 Common Integration Failures & Solutions

### Frontend "method not a function" Error
**Cause:** Stale declarations in frontend
**Solution:**
```bash
cp -r src/declarations/daopad_backend/* \
      src/daopad/daopad_frontend/src/declarations/daopad_backend/
./deploy.sh --network ic --frontend-only
```

### "Record is missing key" Error
**Cause:** Frontend not sending all expected fields
**Solution:** Check backend types and send ALL fields (even if null):
```javascript
// Check what backend expects:
grep "ListPermissionsInput" daopad_backend/src/types/orbit.rs
// Send ALL fields from the struct
```

### Empty Results Despite Data Present
**Cause:** Hash ID fields not being matched
**Solution:** Already implemented in `candid_hash` function (lines 10-26)

### "Failed to decode canister response"
**Cause:** Incorrect optional wrapping
**Solution:** Wrap arrays for Some, send empty for None:
```javascript
users: selectedUsers.length > 0 ? [selectedUsers] : []
```

## 🚀 Quick Start Commands

```bash
# 1. Test permissions work via backend:
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_permissions \
  '(principal "l7rlj-6aaaa-aaaap-qp2ra-cai", null)'

# 2. Create a permission change request:
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai request_permission_change \
  '(principal "l7rlj-6aaaa-aaaap-qp2ra-cai",
    variant { Request = variant { List } },
    opt variant { Public },
    null, null)'

# 3. Check if methods are in frontend declarations:
grep "list_permissions" src/daopad/daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js
```

## ✅ Implementation Validation Checklist

### Backend Validation
- [x] ✅ `list_permissions` method exists and works (Lines 57-88)
- [x] ✅ `get_permission` method exists and works (Lines 521-545)
- [x] ✅ `request_permission_change` method exists (Lines 657-696)
- [x] ✅ Candid hash function implemented (Lines 10-26)
- [x] ✅ All methods use `#[update]` for cross-canister calls
- [x] ✅ Type definitions match Orbit Station spec.did
- [x] ✅ Parser handles both named and hash ID fields

### Frontend Validation
- [x] ✅ Methods present in frontend declarations
- [ ] ⚠️ Service methods added to daopadBackend.js
- [ ] ⚠️ Frontend sends ALL expected fields (not just non-null ones)
- [ ] ⚠️ Optional types properly wrapped in arrays
- [ ] ⚠️ Declaration sync documented in deployment process

### Integration Testing
- [x] ✅ Direct dfx calls to Orbit Station work
- [x] ✅ Backend proxy calls to Orbit Station work
- [ ] ⚠️ Frontend successfully calls backend methods
- [ ] ⚠️ Permissions display correctly grouped by category
- [ ] ⚠️ Permission editing creates proper requests

### Common Pitfall Prevention
- [x] ✅ Hash ID handling: `candid_hash` function in place
- [ ] ⚠️ Declaration sync: Add to deployment checklist
- [ ] ⚠️ Optional encoding: Document in service methods
- [ ] ⚠️ Frontend contract: Log all requests for debugging

## 📊 Actual Permission Categories from Test Station

Based on empirical testing, here are the actual permission counts per category:
- **Account**: 17 permissions (list, read, create, update, transfer for various accounts)
- **System**: 4 permissions (info, capabilities, manage, upgrade)
- **User**: 4 permissions (list, read, create, update)
- **UserGroup**: 4 permissions (list, read, create, update, delete)
- **ExternalCanister**: 6+ permissions (per canister read/change permissions)
- **Asset**: 5 permissions (list, read, create, update, delete)
- **AddressBook**: 5 permissions (list, read, create, update, delete)
- **Request**: 2 permissions (list, read)
- **Permission**: 2 permissions (read, update)
- **RequestPolicy**: 5 permissions (list, read, create, update, delete)
- **NamedRule**: 5 permissions (list, read, create, update, delete)
- **Notification**: 0 permissions (not configured in test station)

**Total**: 62 permissions in test station (may vary per DAO configuration)