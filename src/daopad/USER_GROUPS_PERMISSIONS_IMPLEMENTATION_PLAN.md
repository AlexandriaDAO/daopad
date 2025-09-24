# User Groups & Permissions Implementation Plan for DAOPad

## Overview
This document outlines the implementation plan for adding user groups and permissions management to DAOPad, based on analysis of Orbit Station's core architecture.

## Orbit Reference Architecture

### Core Models and Types

#### 1. User Groups (`orbit-reference/core/station/impl/src/models/user_group.rs`)
- **Structure**: UUID-based identifier, name (1-50 chars), last_modification_timestamp
- **System Groups**: Admin (`302240678275694148452352`) and Operator (`302240678275694148452353`)
- **Validation**: Name uniqueness, length constraints

#### 2. Permissions (`orbit-reference/core/station/impl/src/models/permission.rs`)
- **Permission Model**:
  - `resource`: What is being protected (Resource enum)
  - `allow`: Who has access (Allow struct with auth_scope, users, user_groups)
- **Auth Scopes**:
  - `Public`: Anyone can access
  - `Authenticated`: Any logged-in user
  - `Restricted`: Specific users/groups only

#### 3. Resources (`orbit-reference/core/station/impl/src/models/resource.rs`)
- **Resource Categories**:
  - Treasury: Account operations (list, read, create, update, transfer)
  - Canisters: External canister management
  - Users: User and group management
  - System: System-level operations, permission updates
  - AddressBook, Asset, NamedRule, RequestPolicy operations

### Permission Change Workflow

#### Request-Based System (`orbit-reference/core/station/impl/src/factories/requests/edit_permission.rs`)
1. User initiates permission change via UI
2. Creates `EditPermissionOperation` request
3. Request requires approval based on policies
4. Upon approval, `PermissionService::edit_permission()` executes
5. Changes are persisted to `PERMISSION_REPOSITORY`

## Implementation Plan

### Phase 1: Backend Foundation

#### 1.1 Add Permission Types to DAOPad Backend
**File**: `daopad_backend/src/types/orbit.rs`
```rust
// Add permission-related types matching Orbit's structure
pub enum AuthScope {
    Public,
    Authenticated,
    Restricted,
}

pub struct Allow {
    pub auth_scope: AuthScope,
    pub users: Vec<Principal>,
    pub user_groups: Vec<String>, // UUID strings
}

pub struct Permission {
    pub resource: Resource,
    pub allow: Allow,
}

// Define resources relevant to DAOPad
pub enum Resource {
    Treasury(TreasuryAction),
    Governance(GovernanceAction),
    Members(MemberAction),
    System(SystemAction),
}
```

#### 1.2 Create Permission Query API
**File**: `daopad_backend/src/api/orbit_permissions.rs`
```rust
#[update] // Must be update for cross-canister calls
pub async fn list_permissions(token_id: Principal) -> Result<PermissionsResponse> {
    let station_id = get_station_for_token(token_id)?;

    // Query Orbit Station for permissions
    let result = orbit_station.list_permissions({
        resources: None, // Get all permissions
        paginate: None,
    }).await?;

    Ok(transform_permissions_response(result))
}

#[update]
pub async fn get_permission(token_id: Principal, resource: Resource) -> Result<Permission> {
    let station_id = get_station_for_token(token_id)?;

    let result = orbit_station.get_permission({
        resource: resource.into(),
    }).await?;

    Ok(transform_permission(result))
}
```

#### 1.3 Create Permission Management API
**File**: `daopad_backend/src/api/orbit_permissions.rs`
```rust
#[update]
pub async fn request_permission_change(
    token_id: Principal,
    resource: Resource,
    auth_scope: Option<AuthScope>,
    users: Option<Vec<Principal>>,
    user_groups: Option<Vec<String>>,
) -> Result<RequestId> {
    let station_id = get_station_for_token(token_id)?;

    // Create EditPermission request in Orbit Station
    let result = orbit_station.create_request({
        operation: RequestOperation::EditPermission({
            resource: resource.into(),
            auth_scope: auth_scope.map(|s| s.into()),
            users: users.map(|u| u.into_iter().map(|p| p.to_string()).collect()),
            user_groups,
        }),
        execution_plan: vec![ExecutionPlan::Immediate],
        // ... other request params
    }).await?;

    Ok(result.request.id)
}
```

### Phase 2: Frontend UI Components

#### 2.1 User Groups Display Component
**File**: `daopad_frontend/src/components/orbit/UserGroupsDisplay.jsx`
```jsx
// Display user groups with their members
// Reference: orbit-reference/apps/wallet/src/pages/UserGroupsPage.vue
export function UserGroupsDisplay({ orbitStationId }) {
    const { data: groups } = useQuery({
        queryKey: ['userGroups', orbitStationId],
        queryFn: () => daopadBackend.list_user_groups(orbitStationId)
    });

    return (
        <div>
            {groups?.map(group => (
                <Card key={group.id}>
                    <CardHeader>{group.name}</CardHeader>
                    <CardContent>
                        Members: {group.members.length}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
```

#### 2.2 Permissions Grid Component
**File**: `daopad_frontend/src/components/orbit/PermissionsGrid.jsx`
```jsx
// Display permissions in categorized grid like Orbit
// Reference: orbit-reference/apps/wallet/src/pages/PermissionsPage.vue
// Reference: orbit-reference/apps/wallet/src/configs/permissions.config.ts
export function PermissionsGrid({ orbitStationId }) {
    const categories = {
        treasury: {
            icon: <WalletIcon />,
            permissions: [
                'list_accounts',
                'create_account',
                'transfer_from_any_account',
                // ... from GLOBAL_PERMISSIONS.treasury
            ]
        },
        governance: {
            icon: <VoteIcon />,
            permissions: [
                'create_proposal',
                'vote_on_proposal',
                'execute_proposal'
            ]
        },
        // ... other categories
    };

    return (
        <Accordion>
            {Object.entries(categories).map(([key, category]) => (
                <AccordionItem key={key}>
                    <AccordionTrigger>
                        {category.icon} {key}
                    </AccordionTrigger>
                    <AccordionContent>
                        <PermissionsTable
                            permissions={category.permissions}
                            onEdit={handleEditPermission}
                        />
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}
```

#### 2.3 Permission Edit Dialog
**File**: `daopad_frontend/src/components/orbit/EditPermissionDialog.jsx`
```jsx
// Edit permission dialog with auth scope and user/group selection
// Reference: orbit-reference/apps/wallet/src/components/permissions/PermissionItemForm.vue
export function EditPermissionDialog({ permission, onSubmit }) {
    const [authScope, setAuthScope] = useState(permission.allow.auth_scope);
    const [selectedUsers, setSelectedUsers] = useState(permission.allow.users);
    const [selectedGroups, setSelectedGroups] = useState(permission.allow.user_groups);

    return (
        <Dialog>
            <DialogContent>
                <h3>Edit Permission: {permission.resource}</h3>

                <RadioGroup value={authScope} onValueChange={setAuthScope}>
                    <RadioItem value="Public">Public - Anyone can access</RadioItem>
                    <RadioItem value="Authenticated">Authenticated - Any member</RadioItem>
                    <RadioItem value="Restricted">Restricted - Specific users/groups</RadioItem>
                </RadioGroup>

                {authScope === 'Restricted' && (
                    <>
                        <UserSelector
                            selected={selectedUsers}
                            onChange={setSelectedUsers}
                        />
                        <GroupSelector
                            selected={selectedGroups}
                            onChange={setSelectedGroups}
                        />
                    </>
                )}

                <Button onClick={() => onSubmit({
                    resource: permission.resource,
                    auth_scope: authScope,
                    users: selectedUsers,
                    user_groups: selectedGroups
                })}>
                    Request Change
                </Button>
            </DialogContent>
        </Dialog>
    );
}
```

### Phase 3: Integration with DAOPad Dashboard

#### 3.1 Add Permissions Tab to Token Dashboard
**File**: `daopad_frontend/src/components/TokenDashboard.jsx`
```jsx
// Add new tab for permissions management
const tabs = [
    // ... existing tabs
    {
        value: 'permissions',
        label: 'Permissions',
        icon: <ShieldIcon />,
        component: <PermissionsManagement tokenId={selectedToken.canister_id} />
    }
];
```

#### 3.2 Create Permissions Management Page
**File**: `daopad_frontend/src/pages/PermissionsManagementPage.jsx`
```jsx
export function PermissionsManagementPage({ tokenId }) {
    const { orbitStationId } = useOrbitStation(tokenId);

    return (
        <div className="space-y-6">
            <section>
                <h2>User Groups</h2>
                <UserGroupsDisplay orbitStationId={orbitStationId} />
            </section>

            <section>
                <h2>Global Permissions</h2>
                <p>Configure who can perform actions in your DAO</p>
                <PermissionsGrid orbitStationId={orbitStationId} />
            </section>

            <section>
                <h2>Recent Permission Changes</h2>
                <RequestsList
                    types={['EditPermission']}
                    orbitStationId={orbitStationId}
                />
            </section>
        </div>
    );
}
```

### Phase 4: Permission Categories for DAOPad

Based on Orbit's permission structure (`orbit-reference/apps/wallet/src/configs/permissions.config.ts`), define DAOPad-specific permissions:

#### Treasury Permissions
- `list_accounts`: View all treasury accounts
- `create_account`: Create new treasury accounts
- `transfer_from_any_account`: Initiate transfers from any account
- `read_any_account`: View details of any account
- `update_any_account`: Modify account settings

#### Governance Permissions
- `create_proposal`: Create new governance proposals
- `vote_on_proposal`: Vote on active proposals
- `execute_proposal`: Execute approved proposals
- `cancel_proposal`: Cancel pending proposals

#### Member Management Permissions
- `list_users`: View all DAO members
- `create_user`: Add new members
- `update_any_user`: Modify member details
- `manage_user_groups`: Create/edit/delete user groups

#### System Permissions
- `manage_permissions`: Change permission settings
- `system_upgrade`: Upgrade DAO contracts
- `manage_system_info`: Modify DAO settings

## Testing Strategy

### 1. Test with Orbit Test Station
```bash
export TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"

# Test listing permissions
dfx canister --network ic call $TEST_STATION list_permissions '(record {
    resources = null;
    paginate = null
})'

# Test getting specific permission
dfx canister --network ic call $TEST_STATION get_permission '(record {
    resource = variant { User = variant { List = null } }
})'
```

### 2. Verify Permission Changes
```bash
# Create permission change request
dfx canister --network ic call $TEST_STATION create_request '(record {
    operation = variant { EditPermission = record {
        resource = variant { Account = variant { Create = null } };
        auth_scope = opt variant { Restricted };
        user_groups = opt vec { "admin-group-uuid" };
        users = null
    }};
    execution_plan = vec { variant { Immediate = null } }
})'
```

## Implementation Order

1. **Week 1**: Backend APIs for querying permissions from Orbit Station
2. **Week 2**: Frontend components for displaying permissions and user groups
3. **Week 3**: Permission editing UI with request creation
4. **Week 4**: Integration with TokenDashboard and testing

## Key Considerations

### 1. Permission Inheritance
- Orbit uses a hierarchical permission system
- Admin group has all permissions by default
- Consider implementing role-based access control (RBAC)

### 2. Request Approval Flow
- All permission changes require approval
- Integrate with existing UnifiedRequests component
- Show pending permission changes in requests list

### 3. Caching Strategy
- Permissions don't change frequently
- Consider caching permission queries for performance
- Invalidate cache when permission change requests are approved

### 4. Error Handling
- Handle cases where user lacks permission to view permissions
- Graceful degradation if Orbit Station is unavailable
- Clear error messages for permission denials

## References

All implementation details are based on the official Orbit Station codebase:

- **Permission Models**: `orbit-reference/core/station/impl/src/models/permission.rs`
- **User Group Models**: `orbit-reference/core/station/impl/src/models/user_group.rs`
- **Resource Types**: `orbit-reference/core/station/impl/src/models/resource.rs`
- **Permission Service**: `orbit-reference/core/station/impl/src/services/permission.rs`
- **Edit Permission Factory**: `orbit-reference/core/station/impl/src/factories/requests/edit_permission.rs`
- **Frontend Permissions Page**: `orbit-reference/apps/wallet/src/pages/PermissionsPage.vue`
- **Permission Configuration**: `orbit-reference/apps/wallet/src/configs/permissions.config.ts`
- **Permission Components**: `orbit-reference/apps/wallet/src/components/permissions/`
- **API Definitions**: `orbit-reference/core/station/api/src/permission.rs`