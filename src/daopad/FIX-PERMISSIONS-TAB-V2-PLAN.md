# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-fix-permissions-v2/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-fix-permissions-v2/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Test with dfx BEFORE deploying**:
   ```bash
   # Test backend method works
   dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_station_permissions \
     '(principal "fec7w-zyaaa-aaaaa-qaffq-cai", null)'
   # Should return Ok variant, not Err decode error
   ```
4. **Build & Deploy**:
   - Backend changes:
     ```bash
     cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
     candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
     ./deploy.sh --network ic --backend-only
     # VERIFY FIX:
     dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_station_permissions '(principal "fec7w-zyaaa-aaaaa-qaffq-cai", null)'
     ```
   - Frontend changes:
     ```bash
     cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
5. **Write Jest test** (MANDATORY):
   ```bash
   # Create test file in daopad_frontend/src/__tests__/PermissionsTab.test.js
   # Test MUST call actual mainnet canister and verify:
   # 1. Permissions tab loads without infinite spinner
   # 2. Data displays or shows proper error message
   # 3. All subtabs load correctly
   npm test -- PermissionsTab.test.js
   ```
6. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "Fix: Permissions tab infinite loading - backend type mismatch"
   git push -u origin feature/fix-permissions-tab-v2
   gh pr create --title "Fix: Permissions Tab Backend Type Decode Error" --body "Implements FIX-PERMISSIONS-TAB-V2-PLAN.md

## Root Cause
Backend \`ListPermissionsResult\` type fields were out of order, causing Candid decode errors.
Orbit returns: permissions, total, privileges, user_groups, users, next_offset
Our backend had: permissions, total, privileges, user_groups (missing users field)

## Changes
- Fixed \`ListPermissionsResult\` field order in orbit.rs
- Removed misleading voting tier badges (liquid democracy = direct VP, no roles)
- Added Jest integration test calling real mainnet canister
- Verified all subtabs load without infinite spinners

## Testing
\`\`\`bash
npm test -- PermissionsTab.test.js
\`\`\`
All tests pass, mainnet verified."
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
- ❌ NO deploying without dfx testing first
- ✅ After sleep: IMMEDIATELY continue (no pause)
- ✅ ONLY stop at: approved, max iterations, or error

**Branch:** `feature/fix-permissions-tab-v2`
**Worktree:** `/home/theseus/alexandria/daopad-fix-permissions-v2/src/daopad`

---

# Implementation Plan: Fix Permissions Tab V2

## Task Classification
**Type:** BUG FIX - Backend type mismatch causing decode errors

## Root Cause Analysis

### The Problem
```bash
# Direct Orbit call works:
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_permissions '(record { resources = null; paginate = null; })'
# Returns: Ok with permissions, total, privileges, user_groups, users, next_offset

# Backend proxy FAILS:
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_station_permissions '(principal "fec7w-zyaaa-aaaaa-qaffq-cai", null)'
# Returns: Err("failed to decode canister response")
```

**Root Cause:** `daopad_backend/src/types/orbit.rs:606-616`
```rust
pub enum ListPermissionsResult {
    Ok {
        permissions: Vec<Permission>,
        total: u64,
        privileges: Vec<PermissionCallerPrivileges>,
        user_groups: Vec<UserGroup>,
        // ❌ MISSING: users: Vec<UserDTO>,
        // ❌ MISSING: next_offset: Option<u64>,
    },
    Err(Error),
}
```

Orbit's ACTUAL response structure (from dfx call):
```
Ok {
    permissions: [...],
    total: 62,
    privileges: [...],
    user_groups: [...],
    users: [...],           // ❌ WE'RE MISSING THIS
    next_offset: null       // ❌ WE'RE MISSING THIS
}
```

### Secondary Issue: Misleading Voting Tiers

File: `daopad_frontend/src/components/permissions/VotingTierDisplay.jsx:30-34`
```jsx
<div><Badge variant="secondary">Observer</Badge> 1-99 VP: Can view proposals</div>
<div><Badge>Participant</Badge> 100-999 VP: Can vote and create proposals</div>
<div><Badge>Contributor</Badge> 1,000-9,999 VP: Active governance</div>
<div><Badge>Governor</Badge> 10,000+ VP: Major stakeholder</div>
```

**Problem:** This contradicts the liquid democracy architecture:
- System has NO roles except backend admin
- 1 VP = 1 vote weight (direct liquid democracy)
- All users vote with their exact VP, no tier thresholds
- Voting power steers the one admin (backend canister)

## Implementation

### Phase 1: Fix Backend Type (daopad_backend/src/types/orbit.rs:606-625)

```rust
// PSEUDOCODE: Add missing fields to ListPermissionsResult

#[derive(CandidType, Deserialize, Serialize, Debug)]
pub enum ListPermissionsResult {
    Ok {
        // CRITICAL: Field order must match Orbit Station's exact response
        // Verified with: dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_permissions
        // Orbit returns: permissions, total, privileges, user_groups, users, next_offset
        // Last verified: 2025-10-14
        permissions: Vec<Permission>,
        total: u64,
        privileges: Vec<PermissionCallerPrivileges>,
        user_groups: Vec<UserGroup>,
        users: Vec<UserDTO>,           // ADD THIS
        next_offset: Option<u64>,      // ADD THIS
    },
    Err(Error),
}
```

### Phase 2: Fix VotingTierDisplay (daopad_frontend/src/components/permissions/VotingTierDisplay.jsx)

```javascript
// PSEUDOCODE: Remove role-based tiers, emphasize liquid democracy

export default function VotingTierDisplay({ tokenId, identity }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Liquid Democracy Voting</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Direct Voting Power:</strong> Your vote weight equals your locked LP value.
            <br /><br />
            This is a liquid democracy system:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>1 VP = 1 vote weight (no role thresholds)</li>
              <li>Lock LP tokens in Kong Locker to gain voting power</li>
              <li>Voting Power = USD value of locked LP × 100</li>
              <li>All votes steer the backend admin (no human roles)</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="pt-4 border-t">
          <h4 className="font-semibold text-sm mb-2">How It Works</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>• You lock LP tokens permanently in Kong Locker</div>
            <div>• Your VP = locked liquidity value × 100</div>
            <div>• Vote on proposals with your exact VP weight</div>
            <div>• When threshold met (e.g. 50% total VP), backend executes</div>
            <div>• Backend is the ONLY admin in Orbit Station</div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Check your voting power:
            <code className="block mt-2 p-2 bg-gray-100 rounded text-xs">
              dfx canister --network ic call eazgb-giaaa-aaaap-qqc2q-cai get_all_voting_powers
            </code>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Phase 3: Create Jest Integration Test

**File:** `daopad_frontend/src/__tests__/PermissionsTab.test.js` (NEW)

```javascript
// PSEUDOCODE: Integration test calling real mainnet canister

import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory as backend_idl } from '../declarations/daopad_backend';

describe('Permissions Tab Integration Test', () => {
  const MAINNET_HOST = 'https://icp0.io';
  const BACKEND_CANISTER_ID = 'lwsav-iiaaa-aaaap-qp2qq-cai';
  const TEST_STATION_ID = 'fec7w-zyaaa-aaaaa-qaffq-cai';

  let actor;

  beforeAll(async () => {
    // Create actor for mainnet backend
    const agent = new HttpAgent({ host: MAINNET_HOST });
    actor = Actor.createActor(backend_idl, {
      agent,
      canisterId: BACKEND_CANISTER_ID,
    });
  });

  test('list_station_permissions should return data without decode error', async () => {
    // Call actual backend on mainnet
    const result = await actor.list_station_permissions(TEST_STATION_ID, null);

    // Should return Ok variant, not Err
    expect(result).toHaveProperty('Ok');
    expect(result.Ok).toBeInstanceOf(Array);
    expect(result.Ok.length).toBeGreaterThan(0);

    // Verify permission structure
    const firstPerm = result.Ok[0];
    expect(firstPerm).toHaveProperty('resource');
    expect(firstPerm).toHaveProperty('allow');
  }, 30000); // 30s timeout for mainnet call

  test('permissions should have proper structure', async () => {
    const result = await actor.list_station_permissions(TEST_STATION_ID, null);

    result.Ok.forEach(perm => {
      expect(perm.allow).toHaveProperty('auth_scope');
      expect(perm.allow).toHaveProperty('user_groups');
      expect(perm.allow).toHaveProperty('users');
    });
  });

  test('backend should handle null resources parameter', async () => {
    // Test with null (all resources)
    const resultAll = await actor.list_station_permissions(TEST_STATION_ID, null);
    expect(resultAll.Ok).toBeInstanceOf(Array);

    // Verify we get multiple permission types
    const resourceTypes = new Set(
      resultAll.Ok.map(p => Object.keys(p.resource)[0])
    );
    expect(resourceTypes.size).toBeGreaterThan(1);
  }, 30000);
});
```

**File:** `daopad_frontend/package.json` (MODIFY - add test config)

```json
// PSEUDOCODE: Add jest configuration

{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/__tests__/**/*.test.js"],
    "transform": {},
    "moduleNameMapper": {
      "^@/(.*)$": "<rootDir>/src/$1"
    }
  }
}
```

## Testing Strategy

### Step 1: Test Backend Type Fix with DFX
```bash
# After fixing orbit.rs types, rebuild and deploy backend
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
./deploy.sh --network ic --backend-only

# CRITICAL: Verify the fix BEFORE touching frontend
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_station_permissions \
  '(principal "fec7w-zyaaa-aaaaa-qaffq-cai", null)'

# Expected: Ok variant with permissions array
# NOT: Err("failed to decode")
```

### Step 2: Run Jest Integration Test
```bash
cd daopad_frontend
npm install --save-dev jest
npm test -- PermissionsTab.test.js
```

### Step 3: Manual Browser Test
1. Navigate to: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/
2. Connect wallet and go to any token
3. Click "Permissions" tab
4. Verify:
   - [ ] Overview tab loads without infinite spinner
   - [ ] Voting display shows liquid democracy explanation (no tier badges)
   - [ ] Permissions subtab loads and displays data
   - [ ] User Groups subtab shows system groups
   - [ ] Analytics tab loads
   - [ ] Tools tab loads

## Files Modified

### Backend Changes:
- `daopad_backend/src/types/orbit.rs` - Add `users` and `next_offset` fields to `ListPermissionsResult`

### Frontend Changes:
- `daopad_frontend/src/components/permissions/VotingTierDisplay.jsx` - Replace tier badges with liquid democracy explanation
- `daopad_frontend/src/__tests__/PermissionsTab.test.js` - NEW: Integration test
- `daopad_frontend/package.json` - Add jest configuration

## Success Criteria

1. ✅ Backend dfx test returns `Ok` variant (not decode error)
2. ✅ Jest integration test passes (all 3 tests)
3. ✅ Permissions tab loads without infinite spinner
4. ✅ No role-based tier badges (liquid democracy explanation instead)
5. ✅ All subtabs load correctly
6. ✅ Browser console shows no errors

## Why This Will Work

1. **Type Mismatch Fixed**: Adding `users` and `next_offset` fields makes our Rust type match Orbit's exact response structure
2. **Empirically Verified**: We can see the exact field order from direct dfx calls to Orbit
3. **No Guessing**: We're copying the structure that works (direct Orbit call) into our proxy layer
4. **Testable**: Jest integration test will catch regressions by calling real mainnet canister
5. **Architecture Aligned**: Removing tier badges correctly represents liquid democracy system
