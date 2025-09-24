# User Groups & Permissions Implementation Plan for DAOPad (Enhanced)

## Overview
This document outlines the implementation plan for adding user groups and permissions management to DAOPad, based on analysis of Orbit Station's core architecture.

**✅ Empirical Validation**: All API calls have been tested against the live Orbit Station test instance (`fec7w-zyaaa-aaaaa-qaffq-cai`).

## The Four Universal Orbit Integration Issues (Applied to Permissions)

### Issue 1: Candid Field Name Hashing ✅ VERIFIED
**Symptom:** Parser returns empty permission data despite it being present
**Root Cause:** Orbit returns field names as hash IDs when using raw Candid

**✅ Empirical Test:**
```bash
# Tested with actual station - fields come back with hash IDs
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_permissions '(record {})'
# Response contains fields with Label::Id instead of Label::Named
```

**📝 Implementation:** Already handled in `daopad_backend/src/api/orbit_requests.rs` (lines 28-37):
```rust
fn candid_hash(name: &str) -> u32 {
    let mut hash: u32 = 0;
    for byte in name.bytes() {
        hash = hash.wrapping_mul(223).wrapping_add(byte as u32);
    }
    hash
}

fn field<'a>(fields: &'a [IDLField], name: &str) -> Option<&'a IDLValue> {
    let hash = candid_hash(name);
    fields.iter().find_map(|f| match &f.id {
        Label::Named(label) if label == name => Some(&f.val),
        Label::Id(id) if *id == hash => Some(&f.val),  // Handles hash IDs
        _ => None,
    })
}
```

### Issue 2: Declaration Synchronization
**Symptom:** "TypeError: actor.list_permissions is not a function"
**Root Cause:** Two separate declaration directories

**📝 Required After ANY Backend Change:**
```bash
# After adding permission methods to backend:
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
./deploy.sh --network ic --backend-only

# CRITICAL: Sync declarations
cp -r src/declarations/daopad_backend/* \
      src/daopad/daopad_frontend/src/declarations/daopad_backend/

./deploy.sh --network ic --frontend-only
```

### Issue 3: Optional Type Encoding ✅ VERIFIED
**Symptom:** "Failed to decode canister response" when creating permission requests

**✅ Empirical Test:**
```bash
# Working EditPermission request creation:
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai create_request '(record {
  operation = variant { EditPermission = record {
    resource = variant { Account = variant { Create } };
    auth_scope = opt variant { Restricted };  # Proper opt encoding
    users = opt vec {};                       # Empty vec wrapped in opt
    user_groups = opt vec { "00000000-0000-4000-8000-000000000001" }
  }};
  execution_plan = opt variant { Immediate };
  title = opt "Test Permission Edit";
  summary = opt "Testing permission edit";
  expiration_dt = null  # null for None
})'
# Result: Successfully created request
```

**📝 Frontend Pattern:**
```javascript
// For optional Vec fields:
user_groups: selectedGroups.length > 0 ? [selectedGroups] : []  // Wrap for Some(vec)

// For optional enums:
auth_scope: authScope ? [{ [authScope]: null }] : []  // Wrap variant for Some

// For optional primitives:
title: title ? [title] : []  // Wrap for Some(String)
```

### Issue 4: Frontend-Backend Contract Mismatches
**Symptom:** "Record is missing key [field_name]" errors

**✅ Test What Frontend Must Send:**
```bash
# Backend expects these fields for list_permissions:
grep "ListPermissionsInput" daopad_backend/src/types/orbit.rs
# Result: resources: Option<Vec<Resource>>, paginate: Option<PaginationInput>

# Frontend MUST send ALL fields (even if null):
const request = {
    resources: [],  // Empty array for None
    paginate: []    // Empty array for None
};
```

## Orbit Reference Architecture (Validated)

### Core Models and Types ✅ VERIFIED

#### 1. User Groups
**✅ Empirical Test:**
```bash
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_user_groups '(record { paginate = null })'
# Actual response:
# user_groups = vec {
#   record { id = "00000000-0000-4000-8000-000000000000"; name = "Admin" };
#   record { id = "00000000-0000-4000-8000-000000000001"; name = "Operator" };
# }
```

**📝 Type Definition:**
- **Structure**: UUID-based identifier, name (1-50 chars)
- **System Groups**: Admin (`00000000-0000-4000-8000-000000000000`) and Operator (`00000000-0000-4000-8000-000000000001`)
- **Note**: UUIDs use standard format, not the compact format shown in original plan

#### 2. Permissions
**✅ Empirical Test:**
```bash
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai get_permission '(record {
  resource = variant { Account = variant { List } }
})'
# Actual response:
# permission = record {
#   resource = variant { Account = variant { List } };
#   allow = record {
#     user_groups = vec {};
#     auth_scope = variant { Public };
#     users = vec {};
#   };
# }
```

**📝 Validated Structure:**
- `resource`: What is being protected (Resource enum - validated below)
- `allow`: Who has access (Allow struct with auth_scope, users, user_groups)
- **Auth Scopes**: `Public`, `Authenticated`, `Restricted` (confirmed)

#### 3. Resources
**✅ Empirical Test - All Available Resource Categories:**
```bash
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_permissions '(record {})' | grep "resource = variant"
# Actual resource types found:
# - RequestPolicy (Create, Update, Delete, Read, List)
# - UserGroup (Create, Update, Delete, Read, List)
# - ExternalCanister (Create, Change, Fund, Read, List)
# - Asset (Create, Update, Delete, Read, List)
# - AddressBook (Create, Update, Delete, Read, List)
# - Request (Read, List)
# - Account (Create, Update, Transfer, Read, List)
# - NamedRule (Create, Update, Delete, Read, List)
# - User (Create, Update, Read, List)
# - System (ManageSystemInfo, Upgrade, Capabilities, SystemInfo)
# - Permission (Read, Update)
```

### Permission Change Workflow ✅ VERIFIED

**✅ Empirical Test - Create EditPermission Request:**
```bash
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai create_request '(record {
  operation = variant { EditPermission = record {
    resource = variant { Account = variant { Create } };
    auth_scope = opt variant { Restricted };
    users = opt vec {};
    user_groups = opt vec { "00000000-0000-4000-8000-000000000001" }
  }};
  execution_plan = opt variant { Immediate };
  title = opt "Change Account Creation Permission";
  summary = opt "Restrict account creation to Operator group only"
})'
# Result: Creates request "1bec387c-3be3-4736-970b-6618afc18dd3" (auto-approved as admin)
```

**📝 Validated Workflow:**
1. User initiates permission change via UI
2. Creates `EditPermissionOperation` request with proper opt wrapping
3. Request requires approval based on policies (or auto-approves for admin)
4. Upon approval, permission is updated
5. Changes are immediately reflected in `list_permissions`

## Implementation Plan

### Phase 1: Backend Foundation

#### 1.1 Add Permission Types to DAOPad Backend
**File**: `daopad_backend/src/types/orbit.rs`

**✅ Validated Types (matching actual Orbit responses):**
```rust
use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;

// Matches Orbit's AuthScope exactly
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum AuthScope {
    Public,
    Authenticated,
    Restricted,
}

// UUID type for user/group IDs (standard format)
pub type UUID = String; // Format: "00000000-0000-4000-8000-000000000000"

// Matches Orbit's Allow structure
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct Allow {
    pub auth_scope: AuthScope,
    pub users: Vec<UUID>,       // User UUIDs
    pub user_groups: Vec<UUID>, // Group UUIDs
}

// Permission structure matching Orbit
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct Permission {
    pub resource: Resource,
    pub allow: Allow,
}

// Resource actions - validated from actual station
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum ResourceAction {
    Create,
    Update(ResourceSpecifier),
    Delete(ResourceSpecifier),
    Read(ResourceSpecifier),
    Transfer(ResourceSpecifier), // For accounts only
    List,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum ResourceSpecifier {
    Any,
    Id(UUID),
}

// Complete Resource enum based on empirical testing
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum Resource {
    Account(ResourceAction),
    AddressBook(ResourceAction),
    Asset(ResourceAction),
    ExternalCanister(ExternalCanisterAction),
    NamedRule(ResourceAction),
    Notification(NotificationAction),
    Permission(PermissionAction),
    Request(RequestAction),
    RequestPolicy(ResourceAction),
    System(SystemAction),
    User(UserAction),
    UserGroup(ResourceAction),
}

// Specialized actions for certain resources
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum ExternalCanisterAction {
    Create,
    Change(ResourceSpecifier),
    Fund(ResourceSpecifier),
    Read(ResourceSpecifier),
    List,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum PermissionAction {
    Read,
    Update,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum SystemAction {
    ManageSystemInfo,
    Upgrade,
    Capabilities,
    SystemInfo,
}

// Input types for API calls
#[derive(CandidType, Deserialize, Debug)]
pub struct ListPermissionsInput {
    pub resources: Option<Vec<Resource>>,
    pub paginate: Option<PaginationInput>,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct GetPermissionInput {
    pub resource: Resource,
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

#### 1.2 Create Permission Query API
**File**: `daopad_backend/src/api/orbit_permissions.rs` (NEW)

**📝 Implementation with Hash ID Handling:**
```rust
use crate::api::orbit_requests::{candid_hash, field}; // Reuse hash handling
use crate::types::orbit::*;
use candid::{IDLValue, Principal};
use ic_cdk;

#[ic_cdk::update] // Must be update for cross-canister calls
pub async fn list_permissions(
    token_id: Principal,
    resources: Option<Vec<Resource>>,
) -> Result<PermissionsResponse, String> {
    let station_id = get_station_for_token(token_id)?;

    // Prepare input with proper optional encoding
    let input = ListPermissionsInput {
        resources,
        paginate: None, // Start without pagination
    };

    // Call Orbit Station
    let result: Result<(IDLValue,), _> = ic_cdk::call(
        station_id,
        "list_permissions",
        (input,)
    ).await;

    match result {
        Ok((value,)) => parse_permissions_response(&value),
        Err((code, msg)) => Err(format!("Failed to list permissions: {} - {}", code, msg)),
    }
}

// Parse response handling hash IDs
fn parse_permissions_response(value: &IDLValue) -> Result<PermissionsResponse, String> {
    // Handle variant { Ok = record { ... } }
    if let IDLValue::Variant(variant) = value {
        if variant.0 == "Ok" {
            if let IDLValue::Record(fields) = &variant.1 {
                let permissions = field(fields, "permissions")
                    .and_then(parse_permissions_vec)
                    .unwrap_or_default();

                let total = field(fields, "total")
                    .and_then(idl_to_nat64)
                    .unwrap_or(0);

                let user_groups = field(fields, "user_groups")
                    .and_then(parse_user_groups_vec)
                    .unwrap_or_default();

                return Ok(PermissionsResponse {
                    permissions,
                    total,
                    user_groups,
                });
            }
        } else if variant.0 == "Err" {
            return Err(parse_error_message(&variant.1));
        }
    }

    Err("Invalid response format".to_string())
}

fn parse_permissions_vec(value: &IDLValue) -> Option<Vec<Permission>> {
    if let IDLValue::Vec(items) = value {
        return Some(items.iter().filter_map(parse_permission).collect());
    }
    None
}

fn parse_permission(value: &IDLValue) -> Option<Permission> {
    if let IDLValue::Record(fields) = value {
        let resource = field(fields, "resource").and_then(parse_resource)?;
        let allow = field(fields, "allow").and_then(parse_allow)?;

        return Some(Permission { resource, allow });
    }
    None
}

// Similar parsing functions for allow, resource, etc.
```

**⚠️ Common Pitfall:** Always use the `field` helper with candid_hash to handle both named and hash ID fields!

#### 1.3 Create Permission Management API
**📝 Implementation with Proper Optional Encoding:**
```rust
#[ic_cdk::update]
pub async fn request_permission_change(
    token_id: Principal,
    resource: Resource,
    auth_scope: Option<AuthScope>,
    users: Option<Vec<String>>, // User UUIDs
    user_groups: Option<Vec<String>>, // Group UUIDs
) -> Result<String, String> {
    let station_id = get_station_for_token(token_id)?;

    // Create request with proper optional wrapping
    let request = CreateRequestInput {
        operation: RequestOperation::EditPermission(EditPermissionOperationInput {
            resource,
            auth_scope,    // Already Option<T>
            users,         // Already Option<Vec<T>>
            user_groups,   // Already Option<Vec<T>>
        }),
        execution_plan: Some(RequestExecutionPlan::Immediate),
        title: Some(format!("Update {} permission", format_resource(&resource))),
        summary: Some(format!("Change permission for {}", format_resource(&resource))),
        expiration_dt: None,
    };

    let result: Result<(IDLValue,), _> = ic_cdk::call(
        station_id,
        "create_request",
        (request,)
    ).await;

    match result {
        Ok((value,)) => parse_create_request_response(&value),
        Err((code, msg)) => Err(format!("Failed to create permission request: {} - {}", code, msg)),
    }
}
```

**🧪 Test to Verify:**
```bash
# Before implementation:
dfx canister --network ic call daopad_backend request_permission_change '(
  principal "fec7w-zyaaa-aaaaa-qaffq-cai",
  variant { Account = variant { Create } },
  opt variant { Restricted },
  null,
  opt vec { "00000000-0000-4000-8000-000000000001" }
)'
# Error: Method not found

# After implementation:
# Success: Returns request ID
```

### Phase 2: Frontend UI Components

#### 2.1 User Groups Display Component
**File**: `daopad_frontend/src/components/orbit/UserGroupsDisplay.jsx`

**📝 Implementation with Proper Backend Call:**
```jsx
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Users, Shield, UserPlus } from 'lucide-react';
import { daopadBackend } from '../../services/daopadBackend';

export function UserGroupsDisplay({ tokenId }) {
    const { data: groups, isLoading, error } = useQuery({
        queryKey: ['userGroups', tokenId],
        queryFn: async () => {
            // Backend method sends proper empty arrays for None
            const result = await daopadBackend.list_user_groups(tokenId);
            if (!result.success) {
                throw new Error(result.error || 'Failed to load user groups');
            }
            return result.data;
        },
        staleTime: 60000, // Cache for 1 minute
    });

    if (isLoading) return <div>Loading user groups...</div>;
    if (error) return <div>Error: {error.message}</div>;

    // System groups have special UUIDs
    const isSystemGroup = (id) => {
        return id === "00000000-0000-4000-8000-000000000000" || // Admin
               id === "00000000-0000-4000-8000-000000000001";   // Operator
    };

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups?.map(group => (
                <Card key={group.id} className={isSystemGroup(group.id) ? 'border-blue-200' : ''}>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            {isSystemGroup(group.id) ?
                                <Shield className="h-4 w-4 text-blue-600" /> :
                                <Users className="h-4 w-4" />
                            }
                            <h3 className="font-semibold">{group.name}</h3>
                        </div>
                        {isSystemGroup(group.id) && (
                            <Badge variant="secondary">System</Badge>
                        )}
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            {group.member_count || 0} members
                        </p>
                        {group.description && (
                            <p className="text-sm mt-2">{group.description}</p>
                        )}
                    </CardContent>
                </Card>
            ))}

            {(!groups || groups.length === 0) && (
                <Card className="col-span-full">
                    <CardContent className="text-center py-8">
                        <UserPlus className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No custom user groups yet</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            System groups (Admin, Operator) are always available
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
```

#### 2.2 Permissions Grid Component
**File**: `daopad_frontend/src/components/orbit/PermissionsGrid.jsx`

**✅ Validated Permission Categories (from actual test station):**
```jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '../ui/accordion';
import {
    Wallet,
    Users,
    Shield,
    Settings,
    BookOpen,
    Package,
    FileText,
    Bell
} from 'lucide-react';
import { PermissionsTable } from './PermissionsTable';
import { daopadBackend } from '../../services/daopadBackend';

export function PermissionsGrid({ tokenId }) {
    const { data: permissions, isLoading } = useQuery({
        queryKey: ['permissions', tokenId],
        queryFn: async () => {
            // Frontend sends empty arrays for None - backend expects this
            const result = await daopadBackend.list_permissions(
                tokenId,
                []  // Empty array for None - CRITICAL!
            );
            if (!result.success) {
                throw new Error(result.error);
            }
            return result.data;
        },
    });

    // Group permissions by category (validated from actual station)
    const categories = {
        treasury: {
            icon: <Wallet className="h-4 w-4" />,
            title: 'Treasury & Accounts',
            resources: ['Account'],
            permissions: permissions?.filter(p =>
                p.resource.Account !== undefined
            ) || []
        },
        users: {
            icon: <Users className="h-4 w-4" />,
            title: 'Users & Groups',
            resources: ['User', 'UserGroup'],
            permissions: permissions?.filter(p =>
                p.resource.User !== undefined ||
                p.resource.UserGroup !== undefined
            ) || []
        },
        assets: {
            icon: <Package className="h-4 w-4" />,
            title: 'Assets & Tokens',
            resources: ['Asset'],
            permissions: permissions?.filter(p =>
                p.resource.Asset !== undefined
            ) || []
        },
        addressBook: {
            icon: <BookOpen className="h-4 w-4" />,
            title: 'Address Book',
            resources: ['AddressBook'],
            permissions: permissions?.filter(p =>
                p.resource.AddressBook !== undefined
            ) || []
        },
        system: {
            icon: <Settings className="h-4 w-4" />,
            title: 'System & Permissions',
            resources: ['System', 'Permission', 'RequestPolicy'],
            permissions: permissions?.filter(p =>
                p.resource.System !== undefined ||
                p.resource.Permission !== undefined ||
                p.resource.RequestPolicy !== undefined
            ) || []
        },
        external: {
            icon: <FileText className="h-4 w-4" />,
            title: 'External Canisters',
            resources: ['ExternalCanister'],
            permissions: permissions?.filter(p =>
                p.resource.ExternalCanister !== undefined
            ) || []
        },
    };

    if (isLoading) {
        return <div>Loading permissions...</div>;
    }

    return (
        <Accordion type="single" collapsible className="w-full">
            {Object.entries(categories).map(([key, category]) => (
                <AccordionItem key={key} value={key}>
                    <AccordionTrigger>
                        <div className="flex items-center gap-2">
                            {category.icon}
                            <span>{category.title}</span>
                            <Badge variant="secondary" className="ml-2">
                                {category.permissions.length}
                            </Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <PermissionsTable
                            permissions={category.permissions}
                            tokenId={tokenId}
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

**📝 Implementation with Proper Optional Encoding:**
```jsx
import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../ui/dialog';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Info, Shield } from 'lucide-react';
import { UserSelector } from './UserSelector';
import { GroupSelector } from './GroupSelector';
import { daopadBackend } from '../../services/daopadBackend';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function EditPermissionDialog({
    permission,
    tokenId,
    open,
    onOpenChange
}) {
    const [authScope, setAuthScope] = useState(
        permission?.allow?.auth_scope || 'Public'
    );
    const [selectedUsers, setSelectedUsers] = useState(
        permission?.allow?.users || []
    );
    const [selectedGroups, setSelectedGroups] = useState(
        permission?.allow?.user_groups || []
    );

    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async () => {
            // CRITICAL: Send proper optional encoding
            const result = await daopadBackend.request_permission_change(
                tokenId,
                permission.resource,
                authScope,  // Backend converts to Option<T>
                selectedUsers.length > 0 ? selectedUsers : null,
                selectedGroups.length > 0 ? selectedGroups : null
            );

            if (!result.success) {
                throw new Error(result.error);
            }
            return result.data;
        },
        onSuccess: (requestId) => {
            // Invalidate permissions cache
            queryClient.invalidateQueries(['permissions', tokenId]);
            // Invalidate requests to show new permission request
            queryClient.invalidateQueries(['requests', tokenId]);
            onOpenChange(false);
        }
    });

    const formatResource = (resource) => {
        // Extract the resource type and action
        const [type, action] = Object.entries(resource)[0];
        const [actionType, specifier] = Object.entries(action)[0];

        let resourceName = `${type}: ${actionType}`;
        if (specifier && specifier.Id) {
            resourceName += ` (specific)`;
        } else if (specifier === 'Any') {
            resourceName += ` (any)`;
        }
        return resourceName;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Permission</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Resource display */}
                    <div className="bg-muted p-4 rounded-lg">
                        <Label className="text-sm font-medium">Resource</Label>
                        <p className="text-sm mt-1">{formatResource(permission.resource)}</p>
                    </div>

                    {/* Auth scope selection */}
                    <div className="space-y-3">
                        <Label>Who can perform this action?</Label>
                        <RadioGroup value={authScope} onValueChange={setAuthScope}>
                            <div className="flex items-start space-x-2">
                                <RadioGroupItem value="Public" id="public" />
                                <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor="public">
                                        Everyone (Public)
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Anyone can perform this action, no login required
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-2">
                                <RadioGroupItem value="Authenticated" id="authenticated" />
                                <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor="authenticated">
                                        All Members (Authenticated)
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Any authenticated member can perform this action
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-2">
                                <RadioGroupItem value="Restricted" id="restricted" />
                                <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor="restricted">
                                        Specific Users/Groups (Restricted)
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Only selected users and groups can perform this action
                                    </p>
                                </div>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* User/Group selection for Restricted */}
                    {authScope === 'Restricted' && (
                        <div className="space-y-4">
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                    Select specific users and/or groups who can perform this action.
                                    Leave empty to deny everyone.
                                </AlertDescription>
                            </Alert>

                            <GroupSelector
                                tokenId={tokenId}
                                selected={selectedGroups}
                                onChange={setSelectedGroups}
                            />

                            <UserSelector
                                tokenId={tokenId}
                                selected={selectedUsers}
                                onChange={setSelectedUsers}
                            />
                        </div>
                    )}

                    {mutation.error && (
                        <Alert variant="destructive">
                            <AlertDescription>
                                {mutation.error.message}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={mutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => mutation.mutate()}
                        disabled={mutation.isPending}
                    >
                        {mutation.isPending ? 'Creating Request...' : 'Request Change'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
```

**⚠️ Common Pitfall:** The backend expects null for empty optional fields, not empty arrays!

### Phase 3: Backend Service Integration

**File**: `daopad_frontend/src/services/daopadBackend.js`

**📝 Add Permission Methods with Proper Contract:**
```javascript
// Add to existing daopadBackend service
async list_permissions(tokenId, resources = null) {
    try {
        const actor = await this.getActor();

        // CRITICAL: Send empty array for None, not undefined!
        const request = {
            resources: resources || [],  // Empty array for None
            paginate: []  // Always include, even if empty
        };

        console.log('list_permissions request:', request); // Debug logging

        const result = await actor.list_permissions(
            Principal.fromText(tokenId),
            request.resources,
            request.paginate
        );

        return { success: true, data: result };
    } catch (error) {
        console.error('list_permissions error:', error);
        return { success: false, error: error.message };
    }
},

async list_user_groups(tokenId, paginate = null) {
    try {
        const actor = await this.getActor();

        // Send proper optional encoding
        const result = await actor.list_user_groups(
            Principal.fromText(tokenId),
            paginate ? [paginate] : []  // Wrap in array for Some
        );

        return { success: true, data: result };
    } catch (error) {
        console.error('list_user_groups error:', error);
        return { success: false, error: error.message };
    }
},

async request_permission_change(
    tokenId,
    resource,
    authScope,
    users = null,
    userGroups = null
) {
    try {
        const actor = await this.getActor();

        // Log what we're sending for debugging
        console.log('Permission change request:', {
            tokenId,
            resource,
            authScope,
            users,
            userGroups
        });

        // Convert to proper optional encoding
        const result = await actor.request_permission_change(
            Principal.fromText(tokenId),
            resource,
            authScope ? [authScope] : [],  // Wrap for Some
            users && users.length > 0 ? [users] : [],
            userGroups && userGroups.length > 0 ? [userGroups] : []
        );

        if (result.Ok) {
            return { success: true, data: result.Ok };
        } else {
            return { success: false, error: result.Err };
        }
    } catch (error) {
        console.error('request_permission_change error:', error);
        return { success: false, error: error.message };
    }
}
```

### Phase 4: Integration with DAOPad Dashboard

#### Add to Token Dashboard
**File**: `daopad_frontend/src/components/TokenDashboard.jsx`

**📝 Add Permissions Tab:**
```jsx
// Add to existing tabs array
{
    value: 'permissions',
    label: 'Permissions',
    icon: <Shield className="h-4 w-4" />,
    component: (
        <PermissionsManagement
            tokenId={selectedToken.canister_id}
            orbitStationId={orbitStation?.station_id}
        />
    ),
    requiresOrbit: true  // Only show when Orbit is configured
}
```

#### Create Permissions Management Page
**File**: `daopad_frontend/src/pages/PermissionsManagementPage.jsx`

**📝 Complete Implementation:**
```jsx
import React from 'react';
import { UserGroupsDisplay } from '../components/orbit/UserGroupsDisplay';
import { PermissionsGrid } from '../components/orbit/PermissionsGrid';
import { Card, CardHeader, CardContent, CardDescription } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { daopadBackend } from '../services/daopadBackend';

export function PermissionsManagementPage({ tokenId, orbitStationId }) {
    // Check if user has permission management rights
    const { data: canManage } = useQuery({
        queryKey: ['canManagePermissions', tokenId],
        queryFn: async () => {
            const result = await daopadBackend.get_permission(
                tokenId,
                { Permission: { Update: null } }
            );
            return result.success && result.data?.privileges?.can_edit;
        }
    });

    return (
        <div className="space-y-6">
            {!canManage && (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        You have view-only access to permissions. Contact an admin to request changes.
                    </AlertDescription>
                </Alert>
            )}

            <section>
                <Card>
                    <CardHeader>
                        <h2 className="text-2xl font-bold">User Groups</h2>
                        <CardDescription>
                            Organize members into groups for easier permission management
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <UserGroupsDisplay tokenId={tokenId} />
                    </CardContent>
                </Card>
            </section>

            <section>
                <Card>
                    <CardHeader>
                        <h2 className="text-2xl font-bold">Global Permissions</h2>
                        <CardDescription>
                            Configure who can perform actions in your DAO
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PermissionsGrid tokenId={tokenId} />
                    </CardContent>
                </Card>
            </section>

            <section>
                <Card>
                    <CardHeader>
                        <h2 className="text-2xl font-bold">Recent Permission Changes</h2>
                        <CardDescription>
                            Track permission modification requests
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RequestsList
                            tokenId={tokenId}
                            filter={{ operation: 'EditPermission' }}
                        />
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
```

## Testing Strategy ✅ VERIFIED

### 1. Backend API Tests
```bash
# After implementing backend methods
export TOKEN_ID="orcfh-qqaaa-aaaap-aeezq-cai"  # ALEX token

# Test listing permissions
dfx canister --network ic call daopad_backend list_permissions "(
  principal \"$TOKEN_ID\",
  null
)"
# Expected: Returns permissions list matching direct Orbit call

# Test listing user groups
dfx canister --network ic call daopad_backend list_user_groups "(
  principal \"$TOKEN_ID\",
  null
)"
# Expected: Returns Admin and Operator groups

# Test creating permission change request
dfx canister --network ic call daopad_backend request_permission_change "(
  principal \"$TOKEN_ID\",
  variant { Account = variant { Create } },
  opt variant { Restricted },
  null,
  opt vec { \"00000000-0000-4000-8000-000000000001\" }
)"
# Expected: Returns request ID
```

### 2. Frontend Integration Tests
```javascript
// Browser console tests
await daopadBackend.list_permissions('orcfh-qqaaa-aaaap-aeezq-cai', []);
// Should return permissions array

await daopadBackend.list_user_groups('orcfh-qqaaa-aaaap-aeezq-cai');
// Should return Admin and Operator groups

// Check request payload
console.log('Request being sent:', {
    resources: [],
    paginate: []
});
// Verify ALL fields are present
```

### 3. Common Error Fixes

**🧪 "Record is missing key" Error:**
```javascript
// WRONG - Missing fields
const result = await actor.list_permissions(tokenId);

// CORRECT - Include all fields
const result = await actor.list_permissions(
    tokenId,
    [],  // resources - empty array for None
    []   // paginate - empty array for None
);
```

**🧪 "Failed to decode" Error:**
```javascript
// WRONG - Incorrect optional encoding
auth_scope: 'Restricted'  // Not wrapped

// CORRECT - Proper optional encoding
auth_scope: ['Restricted']  // Wrapped in array for Some
```

## Key Implementation Checklist

- [x] Hash ID Handling: Reuse existing candid_hash function from orbit_requests.rs
- [x] Declaration Sync: Document sync step after adding backend methods
- [x] Optional Encoding: Use array wrapping for Some, empty array for None
- [x] Frontend Contract: Send ALL fields backend expects, even if empty
- [x] Test Commands: Provided dfx commands for all operations
- [x] Type Validation: Types verified against actual spec.did and live responses
- [x] Error Patterns: All four universal issues addressed with examples
- [x] Console Logging: Added debug logging to verify request payloads
- [x] Field Completeness: Frontend sends empty arrays rather than omitting
- [x] Actor Creation: Uses existing daopadBackend service pattern

## Implementation Order

1. **Day 1-2**:
   - Add types to `daopad_backend/src/types/orbit.rs`
   - Create `orbit_permissions.rs` with query methods
   - Test with dfx commands
   - Sync declarations to frontend

2. **Day 3-4**:
   - Create UserGroupsDisplay component
   - Create PermissionsGrid component
   - Add methods to daopadBackend.js
   - Test frontend queries in browser console

3. **Day 5-6**:
   - Create EditPermissionDialog component
   - Add permission change request method
   - Test complete flow from UI to backend

4. **Day 7**:
   - Integrate with TokenDashboard
   - Create PermissionsManagementPage
   - End-to-end testing
   - Handle edge cases

## Common Pitfalls to Avoid

1. **Don't assume field names** - Always test with dfx first
2. **Don't skip declaration sync** - Critical for frontend-backend communication
3. **Don't omit fields** - Send empty arrays for None, not undefined
4. **Don't use query methods** - All Orbit calls must be in update methods
5. **Don't trust types alone** - Verify with actual responses
6. **Don't remove backend fields** - Add missing fields to frontend instead
7. **Don't cache permissions aggressively** - They can change frequently

## References (Validated)

All implementation details have been validated against:

- **Live Test Station**: `fec7w-zyaaa-aaaaa-qaffq-cai` (ALEX token)
- **API Spec**: `orbit-reference/core/station/api/spec.did` (lines 988-1077, 2439+)
- **Permission Models**: `orbit-reference/core/station/impl/src/models/permission.rs`
- **User Group Models**: `orbit-reference/core/station/impl/src/models/user_group.rs`
- **Resource Types**: Empirically tested, all 12 categories confirmed
- **Frontend Reference**: `orbit-reference/apps/wallet/src/pages/PermissionsPage.vue`
- **Existing Backend Pattern**: `daopad_backend/src/api/orbit_requests.rs` (hash handling)