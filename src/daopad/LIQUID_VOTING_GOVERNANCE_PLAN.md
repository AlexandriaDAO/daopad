# Liquid Voting Governance Implementation Plan

**Feature**: Remove Orbit user management bloat and implement pure liquid voting governance based on Kong Locker voting power

**Created**: 2025-10-11
**Worktree**: `/home/theseus/alexandria/daopad-liquid-voting/src/daopad`
**Branch**: `feature/liquid-voting-governance`

---

## 🚨 MANDATORY: ISOLATION CHECK AND EXECUTION PROMPT

### Context: Worktree Already Created

**This plan was created by the planning agent in an isolated worktree.**

**Location:** `/home/theseus/alexandria/daopad-liquid-voting/src/daopad`
**Branch:** `feature/liquid-voting-governance`
**Plan file:** `LIQUID_VOTING_GOVERNANCE_PLAN.md` (in this worktree)

### Step 0: Verify Isolation (RUN THIS FIRST!)

```bash
# STOP! Verify you are in the correct worktree
REPO_ROOT=$(git rev-parse --show-toplevel)
CURRENT_BRANCH=$(git branch --show-current)

# Check you're NOT in main repo
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: You are in the MAIN repository"
    echo "❌ This plan was created in a worktree at:"
    echo "    /home/theseus/alexandria/daopad-liquid-voting"
    echo ""
    echo "Navigate to the worktree:"
    echo "  cd /home/theseus/alexandria/daopad-liquid-voting/src/daopad"
    echo "  cat LIQUID_VOTING_GOVERNANCE_PLAN.md  # Plan is here"
    exit 1
fi

# Check you're on the right branch
if [ "$CURRENT_BRANCH" != "feature/liquid-voting-governance" ]; then
    echo "❌ WARNING: You are on branch '$CURRENT_BRANCH'"
    echo "Expected: feature/liquid-voting-governance"
    echo "Are you in the right worktree?"
    exit 1
fi

echo "✅ You are in the correct worktree: $REPO_ROOT"
echo "✅ On branch: $CURRENT_BRANCH"
echo "✅ Safe to proceed with implementation"
```

### Your Execution Prompt

You are an autonomous PR orchestrator implementing liquid voting governance.

**NOTE:** The planning agent already created this worktree and this plan. You will navigate there and execute.

EXECUTE THESE STEPS AUTONOMOUSLY (DO NOT ASK FOR PERMISSION):

**Step 0 - NAVIGATE TO WORKTREE (DO THIS FIRST):**
```bash
cd /home/theseus/alexandria/daopad-liquid-voting/src/daopad
```

**Step 1 - VERIFY ISOLATION:**
```bash
# Verify you're in the right place
pwd  # Should show /home/theseus/alexandria/daopad-liquid-voting/src/daopad
git branch --show-current  # Should show feature/liquid-voting-governance
ls LIQUID_VOTING_GOVERNANCE_PLAN.md  # This plan should be here
```

**Step 2 - Phase 1: Remove Backend Bloat (1,765 lines)**
- Delete `daopad_backend/src/api/orbit_users.rs`
- Delete `daopad_backend/src/api/voting_permissions.rs`
- Delete `daopad_backend/src/api/orbit_permissions.rs`
- Remove exports from `daopad_backend/src/api/mod.rs`
- Remove exports from `daopad_backend/src/lib.rs`

**Step 3 - Phase 2: Remove Frontend Bloat (3,840 lines)**
- Delete `daopad_frontend/src/components/JoinMemberButton.jsx`
- Delete `daopad_frontend/src/components/MembershipStatus.jsx`
- Delete `daopad_frontend/src/components/orbit/UsersPage.jsx`
- Delete `daopad_frontend/src/components/orbit/UserDialog.jsx`
- Delete entire `daopad_frontend/src/components/permissions/` directory
- Delete entire `daopad_frontend/src/components/canisters/PermissionsMatrix.jsx`
- Remove `fetchOrbitMembers` from `daopad_frontend/src/features/orbit/orbitSlice.js`
- Remove member-related routes from App.jsx

**Step 3 - Build and Deploy:**
```bash
# Backend (Rust changes):
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
./deploy.sh --network ic --backend-only

# CRITICAL: Sync declarations
cp -r ../../.dfx/ic/canisters/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# Frontend (React changes):
./deploy.sh --network ic --frontend-only
```

**Step 4 - Commit and Push:**
```bash
git add -A
git commit -m "feat: Remove Orbit user management bloat, pure liquid voting

- Delete 1,765 lines of backend user management
- Delete 3,840 lines of frontend permissions/user UI
- Keep liquid voting system (Kong Locker based)
- Backend is sole Orbit admin (AutoApproved policy)
- Total: Remove 5,605 lines of unnecessary code"

git push -u origin feature/liquid-voting-governance
```

**Step 5 - Create PR:**
```bash
gh pr create --title "Remove Orbit user management bloat - Pure liquid voting" --body "$(cat <<'EOF'
## Summary

Removes all unnecessary Orbit Station user/role management code. Implements pure liquid voting governance based on Kong Locker voting power.

### The Problem
- Orbit's built-in voting uses static user roles (3 admins, 50% of group)
- Traditional DAOs have growing role bloat
- Fake decentralization: vote count, not voting weight

### Our Solution
- Backend is the ONLY Orbit admin
- Governance happens in DAOPad using Kong Locker voting power
- Voting power = locked LP token USD value × 100
- Simple threshold: sum(votes_for) >= (total_voting_power × threshold%)

### Code Removed
- **Backend**: 1,765 lines (orbit_users.rs, voting_permissions.rs, orbit_permissions.rs)
- **Frontend**: 3,840 lines (user management UI, permissions UI)
- **Total**: 5,605 lines deleted

### What Remains
- Treasury proposals (already working)
- Kong Locker voting integration (already working)
- Orbit Station as execution engine only

### Testing
1. Deploy to mainnet (already tested in plan)
2. Verify backend builds successfully
3. Verify frontend builds successfully
4. Test treasury proposal creation
5. Test voting on proposals
6. Verify Orbit executes when threshold reached

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**YOUR CRITICAL RULES:**
- You MUST work in `/home/theseus/alexandria/daopad-liquid-voting/src/daopad` (NOT main repo)
- Other agents ARE working in parallel - isolation is MANDATORY
- After sleep: IMMEDIATELY continue (no "should I check?" questions)
- Run candid-extractor after backend changes
- Sync declarations after backend changes
- ONLY STOP when: PR created or critical error

**START NOW with Step 0.**

---

## 📊 Current State Analysis

### File Tree (Before)

```
daopad_backend/src/
├── api/
│   ├── orbit_users.rs           ❌ DELETE (308 lines) - User management
│   ├── voting_permissions.rs    ❌ DELETE (443 lines) - Role-based permissions
│   ├── orbit_permissions.rs     ❌ DELETE (1,014 lines) - Permission complexity
│   ├── proposals.rs              ✅ KEEP - Treasury proposals
│   ├── orbit_requests.rs         ✅ KEEP - Request queries
│   ├── orbit_transfers.rs        ✅ KEEP - Treasury operations
│   └── kong_locker.rs            ✅ KEEP - Voting power source
├── proposals/
│   ├── treasury.rs               ✅ KEEP - Already implements liquid voting!
│   ├── orbit_link.rs             ✅ KEEP - Station linking proposals
│   └── types.rs                  ✅ KEEP - Proposal types
└── kong_locker/
    └── voting.rs                 ✅ KEEP - Voting power calculation

daopad_frontend/src/
├── components/
│   ├── JoinMemberButton.jsx      ❌ DELETE (125 lines)
│   ├── MembershipStatus.jsx      ❌ DELETE (198 lines)
│   ├── orbit/
│   │   ├── UsersPage.jsx         ❌ DELETE (486 lines)
│   │   └── UserDialog.jsx        ❌ DELETE (312 lines)
│   ├── permissions/              ❌ DELETE ENTIRE DIR (2,719 lines)
│   │   ├── PermissionsTable.jsx
│   │   ├── PermissionEditDialog.jsx
│   │   ├── PermissionDetails.jsx
│   │   └── PermissionRequestHelper.jsx
│   └── canisters/
│       └── PermissionsMatrix.jsx ❌ DELETE (entire file)
└── features/
    └── orbit/
        └── orbitSlice.js         ⚠️  MODIFY - Remove fetchOrbitMembers thunk
```

### Existing Implementation (KEEP - Already Works!)

**Backend: `daopad_backend/src/proposals/treasury.rs`**
- Lines 79-147: `create_treasury_transfer_proposal()` - Already uses Kong Locker VP!
- Lines 149-282: `vote_on_treasury_proposal()` - Already implements liquid voting!
- Lines 352-380: `approve_orbit_request()` - Backend exercises admin authority!

**What it does:**
1. Creates Orbit request (pending state)
2. Stores DAOPad proposal with vote tracking
3. Users vote (weighted by Kong Locker voting power)
4. When threshold reached → Backend approves Orbit request → Orbit executes

**This is EXACTLY what we want! Just need to remove the bloat around it.**

### Dependencies

**Backend:**
- `ic_cdk` - Canister calls (KEEP)
- Kong Locker integration - Voting power queries (KEEP)
- Orbit Station integration - Treasury execution (KEEP)

**Frontend:**
- React + shadcn/ui components (KEEP)
- Redux (KEEP, simplify)
- DAOPadBackendService (KEEP, remove user management methods)

---

## 🎯 Implementation Plan

### Phase 1: Backend Cleanup (Remove 1,765 lines)

#### File 1: `daopad_backend/src/api/mod.rs` (MODIFY)

**Before:**
```rust
pub mod orbit_users;
pub mod voting_permissions;
pub mod orbit_permissions;

pub use orbit_users::*;
pub use voting_permissions::*;
pub use orbit_permissions::*;
```

**After:**
```rust
// Removed: orbit_users, voting_permissions, orbit_permissions
// Backend is sole Orbit admin - no user management needed
```

#### File 2: `daopad_backend/src/lib.rs` (MODIFY)

**Before:**
```rust
pub use types::orbit::{
    // ... many permission/user types ...
    GetPermissionResponse,
    ListPermissionsResponse,
    Permission,
    // ... etc ...
};
```

**After:**
```rust
// Remove all user/permission type exports
// Keep only treasury/request types needed for proposals
```

#### Files 3-5: DELETE ENTIRELY
- `daopad_backend/src/api/orbit_users.rs` (308 lines)
- `daopad_backend/src/api/voting_permissions.rs` (443 lines)
- `daopad_backend/src/api/orbit_permissions.rs` (1,014 lines)

### Phase 2: Frontend Cleanup (Remove 3,840 lines)

#### File 6: `daopad_frontend/src/features/orbit/orbitSlice.js` (MODIFY)

**Remove fetchOrbitMembers thunk** (lines 60-77):
```javascript
// DELETE THIS ENTIRE THUNK
export const fetchOrbitMembers = createAsyncThunk(
  'orbit/fetchMembers',
  async ({ stationId, identity }, { rejectWithValue }) => {
    // ... implementation ...
  }
);
```

**Remove from initial state**:
```javascript
// DELETE members-related state
members: {
  data: null,
  loading: false,
  error: null,
},
```

**Remove from reducers**:
```javascript
// DELETE all fetchOrbitMembers reducer cases
[fetchOrbitMembers.pending]: (state) => { ... },
[fetchOrbitMembers.fulfilled]: (state, action) => { ... },
[fetchOrbitMembers.rejected]: (state, action) => { ... },
```

#### File 7: `daopad_frontend/src/services/daopadBackend.js` (MODIFY)

**Remove user management methods**:
```javascript
// DELETE these methods
async addUserToOrbit(tokenCanisterId, userPrincipal, userName, groups, status) { ... }
async removeUserFromOrbit(tokenCanisterId, userId) { ... }
async listOrbitMembers(tokenCanisterId) { ... }
async listOrbitUserGroups(tokenCanisterId) { ... }
```

#### Files 8-14: DELETE ENTIRELY
- `daopad_frontend/src/components/JoinMemberButton.jsx` (125 lines)
- `daopad_frontend/src/components/MembershipStatus.jsx` (198 lines)
- `daopad_frontend/src/components/orbit/UsersPage.jsx` (486 lines)
- `daopad_frontend/src/components/orbit/UserDialog.jsx` (312 lines)
- `daopad_frontend/src/components/permissions/PermissionsTable.jsx`
- `daopad_frontend/src/components/permissions/PermissionEditDialog.jsx`
- `daopad_frontend/src/components/permissions/PermissionDetails.jsx`
- `daopad_frontend/src/components/permissions/PermissionRequestHelper.jsx`
- `daopad_frontend/src/components/canisters/PermissionsMatrix.jsx`

**Total: 3,840 lines deleted**

#### File 15: `daopad_frontend/src/App.jsx` (MODIFY)

**Remove user/permission routes**:
```javascript
// DELETE these routes
<Route path="/users" element={<UsersPage />} />
<Route path="/permissions" element={<PermissionsPage />} />
<Route path="/members" element={<MembersPage />} />
```

---

## 🧪 Testing Strategy

### Type Discovery (Already Known - Treasury Works!)

The treasury proposal system already works! We just need to verify it still works after cleanup:

```bash
export TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"
export DAOPAD_BACKEND="lwsav-iiaaa-aaaap-qp2qq-cai"

# Test creating a treasury proposal
dfx canister --network ic call $DAOPAD_BACKEND create_treasury_transfer_proposal '(
  principal "token_canister_id",
  record {
    from_account_id = "account-uuid";
    from_asset_id = "asset-uuid";
    to = "destination-address";
    amount = 1000000 : nat;
    memo = opt "Test transfer";
  }
)'

# Test voting on proposal
dfx canister --network ic call $DAOPAD_BACKEND vote_on_treasury_proposal '(
  1234 : nat64,  # proposal_id
  true  # vote yes
)'
```

### Build and Deploy Process

```bash
# Backend changes
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did

# Deploy backend
./deploy.sh --network ic --backend-only

# CRITICAL: Sync declarations to frontend
cp -r src/declarations/daopad_backend/* src/daopad/daopad_frontend/src/declarations/daopad_backend/

# Deploy frontend
./deploy.sh --network ic --frontend-only
```

### Integration Tests Required

1. **Backend builds successfully** after deleting 1,765 lines
2. **Frontend builds successfully** after deleting 3,840 lines
3. **Treasury proposal creation** still works
4. **Voting on proposals** still works
5. **Orbit execution** still happens when threshold reached
6. **No broken imports** or references to deleted code

### Manual Testing on Mainnet

```bash
# 1. Verify backend deployed
dfx canister --network ic call $DAOPAD_BACKEND get_treasury_proposal '(principal "token_id")'

# 2. Test frontend at https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
# - Navigate to treasury proposals
# - Verify no user management UI
# - Verify no permissions UI
# - Verify proposals show correctly
# - Test creating a proposal (if you have voting power)
# - Test voting on a proposal
```

---

## 📈 Scope Estimate

### Files Modified
- **Deleted files:** 12 (orbit_users.rs, voting_permissions.rs, orbit_permissions.rs, 9 frontend components)
- **Modified files:** 4 (api/mod.rs, lib.rs, orbitSlice.js, App.jsx)

### Lines of Code
- **Backend deleted:** 1,765 lines
- **Frontend deleted:** 3,840 lines
- **Backend modified:** ~20 lines (removals from mod.rs, lib.rs)
- **Frontend modified:** ~50 lines (removals from orbitSlice.js, App.jsx)
- **Net:** **-5,605 lines** 🎉

### Complexity
- **Low:** Deletions are straightforward - remove files and imports
- **Medium:** Verify no broken references to deleted code
- **High:** None - treasury proposal system already works!

### Time Estimate
- **Backend cleanup:** 30 minutes (delete files, remove imports, rebuild)
- **Frontend cleanup:** 45 minutes (delete components, remove routes, remove Redux thunk)
- **Testing on mainnet:** 30 minutes (verify builds, test proposals)
- **PR creation:** 15 minutes
- **Total:** **2 hours**

---

## 🔑 Critical Implementation Notes

### ⚠️ ISOLATION IS MANDATORY

**The implementing agent MUST work in an isolated worktree because:**
- Other agents are working in parallel in the main repo
- File changes from other agents will corrupt your work
- Git operations by other agents will change your files
- The orchestrator prompt above ENFORCES this with exit checks

### DAOPad-Specific Requirements

#### Candid Extraction (Backend Changes)
**ALWAYS run after Rust changes:**
```bash
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did
```

#### Declaration Sync (CRITICAL BUG FIX)
**Frontend uses different declarations path:**
```bash
# After backend deploy, MUST sync:
cp -r src/declarations/daopad_backend/* src/daopad/daopad_frontend/src/declarations/daopad_backend/
# Without this, frontend gets "is not a function" errors!
```

### What We're NOT Changing

**Keep these (already work):**
- `daopad_backend/src/proposals/treasury.rs` - Liquid voting implementation
- `daopad_backend/src/proposals/orbit_link.rs` - Station linking
- `daopad_backend/src/kong_locker/voting.rs` - Voting power calculation
- `daopad_backend/src/api/orbit_requests.rs` - Request queries
- `daopad_backend/src/api/orbit_transfers.rs` - Transfer queries
- Frontend proposal components - Treasury proposal UI

### Verification Checklist

Before marking complete:
- [ ] Backend builds without errors
- [ ] Frontend builds without errors
- [ ] No broken imports for deleted user management
- [ ] No broken imports for deleted permissions
- [ ] Treasury proposals still visible in frontend
- [ ] Can create new treasury proposal (if you have VP)
- [ ] Can vote on treasury proposal
- [ ] Orbit request gets approved when threshold reached

---

## ✅ Success Criteria

**Definition of Done:**
1. **Backend:** 1,765 lines deleted, builds successfully
2. **Frontend:** 3,840 lines deleted, builds successfully
3. **Treasury proposals:** Still work exactly as before
4. **Voting system:** Still uses Kong Locker voting power
5. **Orbit execution:** Still happens when threshold reached
6. **No user management:** All UI and backend endpoints removed
7. **No permissions:** All UI and backend endpoints removed
8. **PR created:** With detailed summary of changes

**Result:** Pure liquid voting governance based on locked liquidity, not fake role-based decentralization.

---

## 🎯 Checkpoint Strategy

**Single PR Approach** (recommended):
1. Delete all bloat in one commit
2. Test comprehensively on mainnet
3. Create PR with before/after comparison
4. 5,605 lines deleted is impressive for review

**Why Single PR:**
- Changes are all deletions (low risk)
- Treasury system already works (no new code)
- Easier to review "removed everything at once"
- Clear before/after comparison

---

## 📝 Implementation Order

1. **Backend cleanup first** (verify it builds)
2. **Frontend cleanup second** (verify it builds)
3. **Deploy both** (verify on mainnet)
4. **Test treasury proposals** (verify they still work)
5. **Create PR** (celebrate removing 5,605 lines!)

---

## 🔄 Rollback Strategy

If something breaks:
1. **Git revert** the commit
2. **Redeploy** previous version
3. **Debug** what dependency was missed
4. **Fix and retry**

But unlikely to break because:
- Treasury proposal system is self-contained
- We're only removing unused code
- No changes to working logic

---

## 📚 References

- **CLAUDE.md**: Governance Architecture section explains the philosophy
- **Treasury proposals**: `daopad_backend/src/proposals/treasury.rs` already implements liquid voting
- **Kong Locker**: `../../kong-locker-reference/CLAUDE.md` for voting power details
- **Orbit Station**: We keep it as execution engine only, not governance

---

## 🚀 Final Notes

**This is a DELETION task, not a BUILD task.**

We're removing complexity, not adding it. The liquid voting system already exists and works perfectly. We're just cleaning up the unnecessary user management bloat around it.

**Before:**
- 5,605 lines of role-based user management
- Fake decentralization with static roles
- Complex permission systems

**After:**
- Pure liquid voting (Kong Locker voting power)
- Backend is sole Orbit admin
- Simple threshold-based governance
- Real skin in the game (locked liquidity)

**Let's remove the garbage and bloat!** 🎉
