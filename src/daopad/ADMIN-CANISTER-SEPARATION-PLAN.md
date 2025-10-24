# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-admin-separation/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-admin-separation/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Backend changes:
     ```bash
     cargo build --target wasm32-unknown-unknown --release -p daopad_backend
     candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
     cargo build --target wasm32-unknown-unknown --release -p admin
     candid-extractor target/wasm32-unknown-unknown/release/admin.wasm > admin/admin.did
     ./deploy.sh --network ic
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Architecture]: Separate backend into operator and admin canisters for Orbit separation of duties"
   git push -u origin feature/admin-canister-separation
   gh pr create --title "[Architecture]: Admin Canister Separation for Orbit Compliance" --body "Implements ADMIN-CANISTER-SEPARATION-PLAN.md"
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

**Branch:** `feature/admin-canister-separation`
**Worktree:** `/home/theseus/alexandria/daopad-admin-separation/src/daopad`

---

# Implementation Plan

## Architecture Problem

Orbit Station enforces **separation of duties**:
- Request CREATOR cannot approve their own requests
- Request APPROVER must not have created the request

Currently, `daopad_backend` violates this by both:
1. Creating Orbit requests (as admin)
2. Approving them via `vote_on_orbit_request` when voting threshold is reached

This means DAOPad can approve its own requests, bypassing Orbit's security model.

## Solution: Two-Canister Architecture

### Admin Canister (NEW: odkrm-viaaa-aaaap-qp2oq-cai)
**Role**: Orbit Station Admin - ONLY approves/rejects via liquid democracy
**Responsibilities**:
- Accept/reject Orbit requests via community voting
- Query Kong Locker for voting power
- Track votes and calculate thresholds
- Call `submit_request_approval` when threshold reached
- Store proposal and vote state

### DAOPad Backend (EXISTING: lwsav-iiaaa-aaaap-qp2qq-cai)
**Role**: Orbit Station Operator - ONLY creates requests
**Responsibilities**:
- Create Orbit requests (Transfer, EditUser, etc.)
- Maintain token registry
- Forward voting calls to admin canister
- Provide read-only queries for frontend

## Current State Documentation

### Files That Handle Voting (Move to Admin)
```
daopad_backend/src/
├── proposals/
│   ├── orbit_requests.rs       # vote_on_orbit_request, approve/reject logic
│   ├── treasury.rs             # vote_on_treasury_proposal
│   └── types.rs               # ProposalId, OrbitRequestProposal, VoteChoice
├── kong_locker/
│   └── voting.rs              # calculate_voting_power_for_token
└── storage/
    └── state.rs              # ORBIT_REQUEST_PROPOSALS, ORBIT_REQUEST_VOTES
```

### Files That Create Requests (Stay in Backend)
```
daopad_backend/src/
├── api/
│   ├── orbit_users.rs        # create_remove_admin_request
│   ├── orbit_transfers.rs    # create_treasury_transfer_request
│   └── orbit_requests.rs     # list_orbit_requests
└── storage/
    └── state.rs              # TOKEN_ORBIT_STATIONS (registry)
```

## Implementation Pseudocode

### Step 1: Create Admin Canister Structure
```
admin/
├── Cargo.toml                 # NEW
├── admin.did                  # Generated
└── src/
    ├── lib.rs                # Main module
    ├── proposals/
    │   ├── mod.rs           # Module exports
    │   ├── voting.rs        # Core voting logic
    │   └── types.rs         # Shared types
    ├── kong_locker/
    │   ├── mod.rs
    │   └── voting.rs        # Voting power queries
    └── storage/
        ├── mod.rs
        └── state.rs         # Proposal and vote storage
```

### Step 2: Admin Canister - lib.rs
```rust
// PSEUDOCODE
mod proposals;
mod kong_locker;
mod storage;

use candid::Principal;
use ic_cdk::{init, update, query};

#[init]
fn init() {
    // Initialize admin canister
    ic_cdk::println!("Admin canister initialized: {:?}", ic_cdk::id());
}

// Main voting endpoint - called by users
#[update]
pub async fn vote_on_orbit_request(
    token_id: Principal,
    orbit_request_id: String,
    vote: bool,
) -> Result<(), String> {
    // 1. Get caller and validate
    // 2. Check proposal exists
    // 3. Get voting power from Kong Locker
    // 4. Record vote
    // 5. Check threshold
    // 6. If passed: approve_orbit_request
    // 7. If failed: reject_orbit_request
}

// Called by backend when creating requests
#[update]
pub async fn register_orbit_request(
    token_id: Principal,
    orbit_request_id: String,
    request_type: String,
    station_id: Principal,
) -> Result<ProposalId, String> {
    // Create proposal for voting
    // Store station_id for later approval
}

// Internal: Approve request in Orbit
async fn approve_orbit_request(station_id: Principal, request_id: String) {
    // Call Orbit's submit_request_approval with Approved
}

// Internal: Reject request in Orbit
async fn reject_orbit_request(station_id: Principal, request_id: String) {
    // Call Orbit's submit_request_approval with Rejected
}
```

### Step 3: Backend Changes - Forward Voting
```rust
// PSEUDOCODE - daopad_backend/src/proposals/orbit_requests.rs
// REPLACE vote_on_orbit_request with forwarding function

#[update]
pub async fn vote_on_orbit_request(
    token_id: Principal,
    orbit_request_id: String,
    vote: bool,
) -> Result<(), String> {
    // Forward to admin canister
    let admin_canister = Principal::from_text("odkrm-viaaa-aaaap-qp2oq-cai")?;

    ic_cdk::call(
        admin_canister,
        "vote_on_orbit_request",
        (token_id, orbit_request_id, vote)
    ).await
    .map_err(|e| format!("Admin canister error: {:?}", e))?
}

// NEW: Register with admin after creating Orbit request
pub async fn register_with_admin(
    token_id: Principal,
    orbit_request_id: String,
    request_type: OrbitRequestType,
) -> Result<ProposalId, String> {
    let admin_canister = Principal::from_text("odkrm-viaaa-aaaap-qp2oq-cai")?;
    let station_id = get_station_for_token(token_id)?;

    ic_cdk::call(
        admin_canister,
        "register_orbit_request",
        (token_id, orbit_request_id, request_type.to_string(), station_id)
    ).await
    .map_err(|e| format!("Admin registration failed: {:?}", e))?
}
```

### Step 4: Update Request Creation
```rust
// PSEUDOCODE - daopad_backend/src/api/orbit_users.rs
// MODIFY create_remove_admin_request

match result.0 {
    CreateRequestResult::Ok(response) => {
        let request_id = response.request.id;

        // CHANGED: Register with admin canister instead of local proposal
        match register_with_admin(
            token_canister_id,
            request_id.clone(),
            OrbitRequestType::EditUser,
        ).await {
            Ok(proposal_id) => Ok(request_id),
            Err(e) => Err(format!("Governance registration failed: {}", e))
        }
    }
}
```

### Step 5: Configure Build System

#### dfx.json Changes
```json
{
  "canisters": {
    "admin": {
      "type": "rust",
      "package": "admin",
      "candid": "admin/admin.did"
    },
    "daopad_backend": {
      // existing config
    }
  }
}
```

#### canister_ids.json Changes
```json
{
  "admin": {
    "ic": "odkrm-viaaa-aaaap-qp2oq-cai"
  }
}
```

#### Cargo.toml Root Workspace
```toml
[workspace]
members = [
    "daopad_backend",
    "admin"  # ADD THIS
]
```

#### admin/Cargo.toml
```toml
[package]
name = "admin"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
ic-cdk = "0.16"
candid = "0.10"
serde = { version = "1.0", features = ["derive"] }
ic-stable-structures = "0.6"
thiserror = "1.0"

[dev-dependencies]
candid-extractor = "0.2"
```

### Step 6: Migration of Storage

Admin canister needs its own storage:
```rust
// PSEUDOCODE - admin/src/storage/state.rs
use ic_stable_structures::StableBTreeMap;

thread_local! {
    // Proposals by (token_id, orbit_request_id)
    pub static ORBIT_REQUEST_PROPOSALS: RefCell<BTreeMap<(Principal, String), Proposal>>

    // Votes by (proposal_id, voter)
    pub static ORBIT_REQUEST_VOTES: RefCell<BTreeMap<(ProposalId, Principal), VoteChoice>>

    // Station mappings (received from backend during registration)
    pub static REQUEST_STATIONS: RefCell<BTreeMap<String, Principal>>
}
```

## Testing Requirements

### 1. Type Discovery
```bash
# Verify admin canister interface
dfx canister --network ic call odkrm-viaaa-aaaap-qp2oq-cai __get_candid

# Test voting endpoint
dfx canister --network ic call odkrm-viaaa-aaaap-qp2oq-cai vote_on_orbit_request '(
  principal "fec7w-zyaaa-aaaaa-qaffq-cai",
  "request-id-123",
  true
)'
```

### 2. Integration Testing
```bash
# Create request via backend (operator role)
dfx canister --network ic call daopad_backend create_remove_admin_request '(...)'

# Vote via admin canister
dfx canister --network ic call admin vote_on_orbit_request '(...)'

# Verify separation: backend CANNOT approve
dfx canister --network ic call daopad_backend submit_request_approval # Should fail
```

### 3. Build & Deploy
```bash
# Build both canisters
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
cargo build --target wasm32-unknown-unknown --release -p admin

# Extract candid
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
candid-extractor target/wasm32-unknown-unknown/release/admin.wasm > admin/admin.did

# Deploy both
./deploy.sh --network ic

# Sync declarations
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
cp -r src/declarations/admin/* daopad_frontend/src/declarations/admin/
```

### 4. Orbit Configuration
```markdown
## Post-Deploy: Configure Orbit Station Roles

1. **Backend as Operator**:
   - Remove backend from Admin group
   - Keep in Operator group only
   - Can create requests but NOT approve

2. **Admin Canister as Admin**:
   - Add admin canister principal to Admin group
   - Give AutoApproved policy
   - Can approve/reject but NOT create

3. **Verify Separation**:
   - Backend creates request → Status: Pending
   - Users vote via admin canister
   - Threshold reached → Admin approves → Status: Executed
```

## Playwright Testing

### Mandatory Browser Verification (BEFORE Playwright)
```bash
# 1. Open browser to frontend
npm run dev

# 2. Test voting flow manually
# - Create proposal via UI
# - Vote on proposal
# - Verify admin canister approves
# - Check Orbit request status changes

# 3. Inspect console for errors
# F12 → Console → Check for red errors

# 4. Only write Playwright tests after manual verification passes
```

### Test Template
```javascript
// PSEUDOCODE - e2e/admin-separation.spec.ts
test('admin canister separation', async ({ page }) => {
  // 1. Create request via backend
  // 2. Vote via admin canister
  // 3. Verify Orbit approval happens
  // 4. Check separation is enforced
});
```

## Migration Checklist

- [ ] Create admin canister structure
- [ ] Move voting logic to admin canister
- [ ] Move Kong Locker queries to admin
- [ ] Move proposal storage to admin
- [ ] Update backend to forward votes
- [ ] Update request creation to register with admin
- [ ] Configure dfx.json and canister_ids.json
- [ ] Build both canisters
- [ ] Deploy to IC
- [ ] Configure Orbit Station roles
- [ ] Test separation of duties
- [ ] Update frontend declarations
- [ ] Run Playwright tests

## Critical Reminders

- **Admin canister ID**: odkrm-viaaa-aaaap-qp2oq-cai
- **Separation principle**: Backend creates, Admin approves
- **No direct approval**: Backend must NEVER call submit_request_approval
- **Atomic migration**: Both canisters must deploy together
- **Test on mainnet**: No local testing - deploy to IC directly

## Error Handling

Common issues and solutions:
1. **"Not authorized"**: Admin canister not in Orbit Admin group
2. **"Cannot approve own request"**: Backend still has admin role
3. **"Vote failed"**: Admin canister can't reach Kong Locker
4. **"Registration failed"**: Network issues between canisters

## Rollback Plan

If separation causes issues:
1. Keep backend with both roles temporarily
2. Admin canister becomes optional voting layer
3. Gradually migrate permissions
4. Monitor for 48 hours before full cutover