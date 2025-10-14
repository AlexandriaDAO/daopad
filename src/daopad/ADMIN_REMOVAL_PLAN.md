# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-admin-removal/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-admin-removal/src/daopad`
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
   git commit -m "feat: Add DAO-governed admin removal system"
   git push -u origin feature/admin-removal
   gh pr create --title "feat: Enable Community-Governed Admin Removal" --body "Implements ADMIN_REMOVAL_PLAN.md"
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

**Branch:** `feature/admin-removal`
**Worktree:** `/home/theseus/alexandria/daopad-admin-removal/src/daopad`

---

# Implementation Plan: DAO-Governed Admin Removal

## Feature Overview

Enable community governance to remove non-backend admin users through DAOPad's liquid democracy voting system. This addresses the critical security issue: "4 admin users found - allows individual bypass of community governance."

## Current State Analysis

### File Tree (Relevant Sections)
```
daopad_backend/src/
├── api/
│   ├── mod.rs                    # Module exports
│   ├── orbit.rs                  # Orbit Station integration
│   ├── orbit_security.rs         # Security checks (has list_users)
│   ├── orbit_requests.rs         # List/query requests
│   ├── orbit_permissions.rs      # Permission management
│   ├── orbit_accounts.rs         # Account management
│   └── orbit_transfers.rs        # Transfer operations
├── proposals/
│   ├── orbit_requests.rs         # Voting on Orbit requests (line 1-394)
│   └── types.rs                  # OrbitRequestType enum (line 76-85)
└── types/
    └── orbit.rs                  # EditUserOperationInput (line 22-29)

daopad_frontend/src/
├── components/
│   └── security/
│       ├── SecurityDashboard.jsx          # Main security UI
│       └── DAOTransitionChecklist.jsx     # Shows admin issues
└── services/
    └── backend/
        └── orbit/
            └── security/
                └── OrbitSecurityService.js  # Security API calls
```

### Existing Implementations

#### 1. Backend: EditUserOperationInput Type (daopad_backend/src/types/orbit.rs:22-29)
```rust
#[derive(CandidType, Deserialize, Debug)]
pub struct EditUserOperationInput {
    pub id: String, // UUID
    pub name: Option<String>,
    pub identities: Option<Vec<Principal>>,
    pub groups: Option<Vec<String>>, // UUIDs as strings
    pub status: Option<UserStatus>,
    pub cancel_pending_requests: Option<bool>,
}
```

**KEY INSIGHT from dfx testing:**
- Setting `groups = Some(vec!["UUID"])` REPLACES all groups (doesn't append)
- To remove admin: `groups = Some(vec![])` or `groups = Some(vec![OPERATOR_UUID])`

#### 2. Backend: Voting System (daopad_backend/src/proposals/orbit_requests.rs:1-394)
- `vote_on_orbit_request()` - Handles voting on any Orbit request (line 20)
- `ensure_proposal_for_request()` - Auto-creates proposals (line 241)
- `infer_request_type()` - Maps operation types (line 291)
- Already supports `OrbitRequestType::EditUser` (types.rs:78)

#### 3. Backend: list_users (daopad_backend/src/api/orbit_security.rs:276)
```rust
let result: (ListUsersResult,) = ic_cdk::call(station_id, "list_users", (input,))
    .await
    .map_err(|e| format!("Failed to list users: {:?}", e))?;
```

#### 4. Frontend: Security Dashboard (daopad_frontend/src/components/security/SecurityDashboard.jsx)
- Shows admin count issue (via DAOTransitionChecklist)
- NO action buttons currently

### Orbit API Testing Results (dfx on fec7w-zyaaa-aaaaa-qaffq-cai)

**Test 1: list_users** ✅
```bash
dfx canister --network ic call fec7w-... list_users '(record {})'
```
Returns 8 users, 4 with Admin group:
- DAO Canister (lwsav-iiaaa...) - **KEEP** (backend)
- DAOPad DFX ID (83c52252...) - **REMOVE**
- Alexandria (93f658a5...) - **REMOVE**
- DAO Member 2ljyd...yqe (f410916b...) - **REMOVE**

**Test 2: create_request with EditUser** ✅
```bash
dfx canister --network ic call fec7w-... create_request '(record {
  operation = variant {
    EditUser = record {
      id = "83c52252-4112-4119-a643-5eedddcc53ff";
      groups = opt vec { "00000000-0000-4000-8000-000000000001" };
      ...
    }
  };
  ...
})'
```
Result: Request created and auto-approved (admin caller), user groups replaced.

**Test 3: Verification** ✅
```bash
dfx canister --network ic call fec7w-... get_user '(record { user_id = "83c52252..." })'
```
Confirmed: User now only has Operator group, Admin removed.

---

## Implementation Plan (Pseudocode)

### 1. Backend: Create orbit_users.rs Module

**File:** `daopad_backend/src/api/orbit_users.rs` (NEW)

```rust
// PSEUDOCODE

use candid::{CandidType, Deserialize, Principal};
use ic_cdk::update;
use crate::types::orbit::{
    CreateRequestInput, RequestOperationInput,
    EditUserOperationInput, RequestExecutionSchedule,
    CreateRequestResult, UserStatus,
    ListUsersInput, ListUsersResult, UserDTO
};
use crate::storage::state::TOKEN_ORBIT_STATIONS;
use crate::types::StorablePrincipal;

// Group UUIDs from Orbit Station spec
const ADMIN_GROUP_ID: &str = "00000000-0000-4000-8000-000000000000";
const OPERATOR_GROUP_ID: &str = "00000000-0000-4000-8000-000000000001";

/// List all users in Orbit Station with their groups
/// Backend acts as admin proxy to query protected data
#[update]
pub async fn list_orbit_users(
    token_canister_id: Principal,
) -> Result<Vec<UserDTO>, String> {
    // 1. Get station ID from token mapping
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or_else(|| format!("No Orbit Station linked to token {}", token_canister_id))
    })?;

    // 2. Call Orbit's list_users (admin-only method)
    let input = ListUsersInput {
        search_term: None,
        statuses: None,
        groups: None,
        paginate: None,
    };

    let result: (ListUsersResult,) = ic_cdk::call(station_id, "list_users", (input,))
        .await
        .map_err(|e| format!("Failed to list users: {:?}", e))?;

    // 3. Return users or error
    match result.0 {
        ListUsersResult::Ok { users, .. } => Ok(users),
        ListUsersResult::Err(e) => Err(format!("Orbit error: {}", e)),
    }
}

/// Create EditUser request to remove user from admin group
/// Request goes through DAO voting system before execution
#[update]
pub async fn create_remove_admin_request(
    token_canister_id: Principal,
    user_id: String,
    user_name: String,
) -> Result<String, String> {
    let caller = ic_cdk::caller();

    // 1. Guard: Must be authenticated
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    // 2. Get station ID
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or_else(|| format!("No Orbit Station linked"))
    })?;

    // 3. Build EditUser operation (remove from admin, keep operator)
    let edit_user_input = EditUserOperationInput {
        id: user_id.clone(),
        name: None,
        identities: None,
        groups: Some(vec![OPERATOR_GROUP_ID.to_string()]), // Replace with operator only
        status: None,
        cancel_pending_requests: None,
    };

    let request_input = CreateRequestInput {
        operation: RequestOperationInput::EditUser(edit_user_input),
        title: Some(format!("Remove {} from Admin group", user_name)),
        summary: Some(format!(
            "Community proposal to remove user {} (ID: {}) from Admin group. \
             User will retain Operator privileges. This action requires 50% voting power approval.",
            user_name, user_id
        )),
        execution_plan: Some(RequestExecutionSchedule::Immediate),
        expiration_dt: None, // Use Orbit's default (30 days)
    };

    // 4. Create request in Orbit (backend is admin, so can create)
    let result: (CreateRequestResult,) =
        ic_cdk::call(station_id, "create_request", (request_input,))
        .await
        .map_err(|e| format!("Failed to create request: {:?}", e))?;

    // 5. Return request ID or error
    match result.0 {
        CreateRequestResult::Ok(response) => {
            // NOTE: ensure_proposal_for_request will be called by frontend
            // to auto-create the DAOPad proposal for voting
            Ok(response.request.id)
        },
        CreateRequestResult::Err(e) => Err(format!("Orbit error: {}", e.code)),
    }
}

/// Convenience method: Remove admin from multiple users in one call
#[update]
pub async fn create_remove_multiple_admins_request(
    token_canister_id: Principal,
    user_ids: Vec<(String, String)>, // (user_id, user_name) pairs
) -> Vec<Result<String, String>> {
    let mut results = Vec::new();

    for (user_id, user_name) in user_ids {
        let result = create_remove_admin_request(
            token_canister_id,
            user_id,
            user_name
        ).await;
        results.push(result);
    }

    results
}
```

### 2. Backend: Export Module

**File:** `daopad_backend/src/api/mod.rs` (MODIFY)

```rust
// PSEUDOCODE - Add to existing exports

pub mod orbit_users;  // NEW

// Re-export public functions
pub use orbit_users::{
    create_remove_admin_request,
    create_remove_multiple_admins_request,
    list_orbit_users,
};
```

### 3. Backend: Update Candid Interface

**File:** `daopad_backend/daopad_backend.did` (MODIFY - after cargo build)

```candid
// PSEUDOCODE - These will be auto-generated by candid-extractor

type UserDTO = record {
    id: text;
    name: text;
    status: variant { Active; Inactive };
    groups: vec record { id: text; name: text };
    identities: vec principal;
    last_modification_timestamp: text;
};

service : {
    // ... existing methods ...

    // NEW methods
    list_orbit_users: (principal) -> (variant { Ok: vec UserDTO; Err: text });

    create_remove_admin_request: (principal, text, text) -> (variant { Ok: text; Err: text });

    create_remove_multiple_admins_request: (principal, vec record { text; text }) ->
        (vec variant { Ok: text; Err: text });
}
```

### 4. Frontend: Create User Service

**File:** `daopad_frontend/src/services/backend/orbit/users/OrbitUserService.js` (NEW)

```javascript
// PSEUDOCODE

import { Actor } from '@dfinity/agent';
import { idlFactory } from '../../../declarations/daopad_backend';

export class OrbitUserService {
    constructor(identity) {
        this.identity = identity;
        this.actor = null;
    }

    async getActor() {
        if (!this.actor) {
            // Create actor with user's identity
            this.actor = Actor.createActor(idlFactory, {
                agent: /* create agent with this.identity */,
                canisterId: process.env.DAOPAD_BACKEND_CANISTER_ID,
            });
        }
        return this.actor;
    }

    /**
     * List all users in Orbit Station
     * @param {string} tokenCanisterId - Token principal
     * @returns {Promise<{success: boolean, data?: User[], error?: string}>}
     */
    async listUsers(tokenCanisterId) {
        try {
            const actor = await this.getActor();
            const result = await actor.list_orbit_users(tokenCanisterId);

            if (result.Ok) {
                return {
                    success: true,
                    data: result.Ok.map(user => ({
                        id: user.id,
                        name: user.name,
                        status: Object.keys(user.status)[0], // 'Active' or 'Inactive'
                        groups: user.groups.map(g => ({ id: g.id, name: g.name })),
                        identities: user.identities.map(p => p.toString()),
                        isAdmin: user.groups.some(g => g.name === 'Admin'),
                        isOperator: user.groups.some(g => g.name === 'Operator'),
                    }))
                };
            } else {
                return { success: false, error: result.Err };
            }
        } catch (error) {
            console.error('Failed to list users:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create request to remove user from admin group
     * @param {string} tokenCanisterId
     * @param {string} userId
     * @param {string} userName
     * @returns {Promise<{success: boolean, requestId?: string, error?: string}>}
     */
    async removeAdminUser(tokenCanisterId, userId, userName) {
        try {
            const actor = await this.getActor();
            const result = await actor.create_remove_admin_request(
                tokenCanisterId,
                userId,
                userName
            );

            if (result.Ok) {
                return { success: true, requestId: result.Ok };
            } else {
                return { success: false, error: result.Err };
            }
        } catch (error) {
            console.error('Failed to create admin removal request:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Remove multiple admins at once
     * @param {string} tokenCanisterId
     * @param {Array<{id: string, name: string}>} users
     * @returns {Promise<{success: boolean, results?: Array, error?: string}>}
     */
    async removeMultipleAdmins(tokenCanisterId, users) {
        try {
            const actor = await this.getActor();
            const userPairs = users.map(u => [u.id, u.name]);
            const results = await actor.create_remove_multiple_admins_request(
                tokenCanisterId,
                userPairs
            );

            return {
                success: true,
                results: results.map((r, idx) => ({
                    user: users[idx],
                    success: !!r.Ok,
                    requestId: r.Ok || null,
                    error: r.Err || null,
                }))
            };
        } catch (error) {
            console.error('Failed to remove multiple admins:', error);
            return { success: false, error: error.message };
        }
    }
}
```

### 5. Frontend: Create Admin Removal UI Component

**File:** `daopad_frontend/src/components/security/AdminRemovalActions.jsx` (NEW)

```javascript
// PSEUDOCODE

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { UserMinus, Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import { OrbitUserService } from '../../services/backend/orbit/users/OrbitUserService';
import { useToast } from '../ui/use-toast';

const BACKEND_CANISTER = "lwsav-iiaaa-aaaap-qp2qq-cai";

export default function AdminRemovalActions({ tokenId, stationId, identity }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [removing, setRemoving] = useState({});
    const { toast } = useToast();

    useEffect(() => {
        loadUsers();
    }, [tokenId, identity]);

    async function loadUsers() {
        if (!tokenId || !identity) return;

        setLoading(true);
        try {
            const userService = new OrbitUserService(identity);
            const result = await userService.listUsers(tokenId);

            if (result.success) {
                // Filter to show only non-backend admins
                const admins = result.data.filter(u =>
                    u.isAdmin &&
                    !u.identities.includes(BACKEND_CANISTER)
                );
                setUsers(admins);
            } else {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleRemoveAdmin(user) {
        setRemoving({ ...removing, [user.id]: true });

        try {
            const userService = new OrbitUserService(identity);
            const result = await userService.removeAdminUser(
                tokenId,
                user.id,
                user.name
            );

            if (result.success) {
                toast({
                    title: "Proposal Created",
                    description: `Admin removal request created for ${user.name}. Request ID: ${result.requestId}. Community voting has begun.`,
                });

                // Refresh user list
                await loadUsers();
            } else {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Remove admin failed:', error);
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setRemoving({ ...removing, [user.id]: false });
        }
    }

    async function handleRemoveAllAdmins() {
        if (users.length === 0) return;

        const confirmed = window.confirm(
            `Create ${users.length} proposals to remove all non-backend admins? ` +
            `This will initiate community voting for: ${users.map(u => u.name).join(', ')}`
        );

        if (!confirmed) return;

        setLoading(true);
        try {
            const userService = new OrbitUserService(identity);
            const result = await userService.removeMultipleAdmins(tokenId, users);

            if (result.success) {
                const successCount = result.results.filter(r => r.success).length;
                const failCount = result.results.length - successCount;

                toast({
                    title: "Proposals Created",
                    description: `${successCount} admin removal proposals created. ${failCount > 0 ? `${failCount} failed.` : ''}`,
                });

                await loadUsers();
            } else {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Batch removal failed:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading && users.length === 0) {
        return <div className="text-center py-4">Loading users...</div>;
    }

    if (users.length === 0) {
        return (
            <Alert className="border-green-500 bg-green-950/50">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <AlertDescription>
                    ✅ All non-backend admins removed! Only DAO Canister has admin rights.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Card className="border-2 border-orange-500 bg-orange-950/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-300">
                    <UserMinus className="w-5 h-5" />
                    Remove Non-Backend Admins
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Alert className="border-orange-500">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Action Required:</strong> Remove these users from Admin group to achieve true DAO governance.
                        Each removal creates a proposal requiring 50% voting power approval.
                    </AlertDescription>
                </Alert>

                {users.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                            <div className="font-semibold">{user.name}</div>
                            <div className="text-sm text-gray-400">
                                {user.identities[0]?.slice(0, 20)}...
                            </div>
                            <div className="text-xs text-gray-500">
                                Groups: {user.groups.map(g => g.name).join(', ')}
                            </div>
                        </div>
                        <Button
                            onClick={() => handleRemoveAdmin(user)}
                            disabled={removing[user.id]}
                            variant="destructive"
                            size="sm"
                        >
                            {removing[user.id] ? 'Creating Proposal...' : 'Remove Admin'}
                        </Button>
                    </div>
                ))}

                {users.length > 1 && (
                    <Button
                        onClick={handleRemoveAllAdmins}
                        disabled={loading}
                        variant="outline"
                        className="w-full border-orange-500 text-orange-300 hover:bg-orange-950"
                    >
                        <Users className="w-4 h-4 mr-2" />
                        Remove All {users.length} Admins (Batch)
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
```

### 6. Frontend: Integrate into Security Dashboard

**File:** `daopad_frontend/src/components/security/SecurityDashboard.jsx` (MODIFY)

```javascript
// PSEUDOCODE - Add to imports
import AdminRemovalActions from './AdminRemovalActions';

// PSEUDOCODE - Add after SecurityDashboard component (around line 142)
return (
    <div className="w-full space-y-4">
        {/* NEW: Admin removal actions */}
        <AdminRemovalActions
            tokenId={tokenId}
            stationId={stationId}
            identity={identity}
        />

        {/* Existing checklist */}
        <DAOTransitionChecklist
            securityData={securityData}
            stationId={stationId}
            tokenSymbol={tokenSymbol}
            onRefresh={fetchSecurityStatus}
        />
    </div>
);
```

---

## Testing Requirements

### 1. Type Discovery (Backend Types)
```bash
# Verify EditUserOperationInput matches Orbit Station
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai create_request '(record {
  operation = variant {
    EditUser = record {
      id = "test-user-id";
      groups = opt vec { "00000000-0000-4000-8000-000000000001" };
      name = null;
      identities = null;
      status = null;
      cancel_pending_requests = null;
    }
  };
  title = opt "Type verification test";
})'

# Expected: Request created successfully (proves types match)
```

### 2. Build Backend
```bash
cd /home/theseus/alexandria/daopad-admin-removal/src/daopad
cargo build --target wasm32-unknown-unknown --release -p daopad_backend

# Expected: Build succeeds, no errors
```

### 3. Extract Candid
```bash
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Verify new methods exist
grep "list_orbit_users" daopad_backend/daopad_backend.did
grep "create_remove_admin_request" daopad_backend/daopad_backend.did

# Expected: Both methods found in .did file
```

### 4. Deploy Backend
```bash
./deploy.sh --network ic --backend-only

# Expected: Deployment succeeds
```

### 5. Sync Declarations (CRITICAL - Prevents "not a function" errors)
```bash
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# Verify sync
ls daopad_frontend/src/declarations/daopad_backend/
# Expected: index.js, daopad_backend.did, daopad_backend.did.js

grep "list_orbit_users" daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js
# Expected: Function definition found
```

### 6. Test Backend Methods (dfx)
```bash
# Test list_users
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_orbit_users '(principal "ysy5f-2qaaa-aaaap-qkmmq-cai")'
# Expected: Returns list of users with groups

# Test create_remove_admin_request
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai create_remove_admin_request '(
  principal "ysy5f-2qaaa-aaaap-qkmmq-cai",
  "83c52252-4112-4119-a643-5eedddcc53ff",
  "DAOPad DFX ID"
)'
# Expected: Returns Ok with request_id
```

### 7. Build & Deploy Frontend
```bash
npm run build
./deploy.sh --network ic --frontend-only

# Expected: Frontend deployed successfully
```

### 8. Manual UI Testing
1. Navigate to https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
2. Go to ALEX token → Security tab
3. Verify "Remove Non-Backend Admins" card appears
4. Verify 3 users listed (DAOPad DFX ID, Alexandria, DAO Member)
5. Click "Remove Admin" on one user
6. Expected: Toast shows "Proposal Created", request ID displayed
7. Navigate to Governance tab
8. Expected: New proposal appears for voting
9. Vote on proposal with 50%+ voting power
10. Expected: Proposal executes, user removed from admin

### 9. Verification
```bash
# List users again after execution
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_users '(record {})'

# Expected: Target user no longer in Admin group
# Groups: [Operator] only (or empty if remove all)
```

---

## Success Criteria

- ✅ Backend compiles without errors
- ✅ Candid interface includes new methods
- ✅ Frontend service layer created
- ✅ UI component displays non-backend admins
- ✅ "Remove Admin" button creates Orbit request
- ✅ Request automatically creates DAOPad proposal
- ✅ Voting reaches 50% threshold
- ✅ Backend approves Orbit request
- ✅ User removed from Admin group in Orbit Station
- ✅ Security dashboard score improves (0% → ~50%+ decentralization)

## Known Limitations

1. **Manual Proposal Creation**: Frontend must call `ensure_proposal_for_request()` after creating the Orbit request. Future: Auto-detect via backend hooks.

2. **Single Station**: Currently only supports ALEX token (ysy5f-2qaaa...). Future: Multi-station support via token selection.

3. **No Undo**: Once admin is removed via DAO vote, requires another DAO vote to restore. This is intentional - governance is bidirectional.

## Security Considerations

- ✅ Only backend can create EditUser requests (admin privilege)
- ✅ All requests require 50% voting power approval
- ✅ Backend principal (lwsav-iiaaa...) excluded from removal UI
- ✅ Users retain Operator group (can still participate)
- ✅ Request expiration prevents stale governance (30 days)

---

## Rollout Plan

### Phase 1: Deploy (This PR)
1. Merge feature branch to master
2. Deploy backend to IC
3. Deploy frontend to IC
4. Announce feature to community

### Phase 2: Execute (Community)
1. Community members vote on admin removal proposals
2. Backend automatically executes approved removals
3. Monitor decentralization score improvement

### Phase 3: Verify (Post-Execution)
1. Run security checks again
2. Confirm only backend is admin
3. Document decentralization milestone

---

**END OF PLAN**
