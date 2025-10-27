1. **Deployment**: Use `./deploy.sh` from THIS directory (`src/daopad/`), NOT the root

### Workflow Summary:
```bash
./deploy.sh --network ic  # Deploy everything. Use this every time.
```

**⚠️ CRITICAL: Always deploy to mainnet using `./deploy.sh --network ic` after making ANY changes. There is no local testing environment - all testing happens on mainnet. This ensures both frontend and backend stay in sync.**


## 🏛️ Two-Canister Architecture

**Critical Design** (PR #115): DAOPad uses TWO canisters to comply with Orbit Station's separation of duties requirement that proposal creators cannot approve their own requests. **Backend** (operator role) creates Orbit requests and returns `request_id` to frontend, while **Admin** (admin role) handles community voting via Kong Locker voting power and approves requests after vote thresholds pass. This clean separation ensures the security-intensive operations (approvals, treasury transfers, permission changes) live in the simpler Admin canister, while Backend remains a stateless operator that never approves anything. Frontend orchestrates the flow: user action → backend.create_request() → admin.create_proposal() → community votes → admin approves when threshold reached.

## 📁 Repository Structure

```
project_root/
├── deploy.sh            # LEGACY - Archived, DO NOT USE
├── orbit-reference/     # READ-ONLY - Dfinity Orbit source (reference only)
│   ├── apps/station/    # Station frontend code (for reference)
│   ├── core/station/    # Station backend code (for reference)
│   └── ...              # Full Orbit codebase (DO NOT MODIFY)
├── kong-locker-reference/  # READ-ONLY - Reference only
│   ├── CLAUDE.md        # Kong Locker details (for reference)
│   ├── deploy.sh        # Kong Locker deploy (rarely used)
│   ├── kong_locker/
│   └── kong_locker_frontend/
└── src/
    └── daopad/          # YOU ARE HERE - Primary development
        ├── CLAUDE.md    # This file - Main documentation
        ├── deploy.sh    # USE THIS for deployments
        ├── admin/       # Admin canister (voting + approval)
        ├── daopad_backend/  # Backend canister (request creation only)
        ├── daopad_frontend/
        └── orbit_station/
```

### When You Need Reference Information:
- **Kong Locker voting power**: Read `../../kong-locker-reference/CLAUDE.md`
- **Orbit Station architecture**: Read `../../orbit-reference/` files
- **Treasury management patterns**: See `../../orbit-reference/apps/station/`
- **Station backend logic**: See `../../orbit-reference/core/station/`
- **But remember**: NEVER modify reference code - it's READ-ONLY

### Kong Locker Key Concepts (Reference Only):
- Users lock LP tokens permanently in individual canisters
- Each user gets one lock canister (blackholed, immutable)
- Voting power = USD value of locked LP tokens × 100
- Query with: `dfx canister --network ic call kong_locker get_all_voting_powers`

## 🧪 Testing Guidelines

### Playwright E2E Testing

Use `PLAYWRIGHT_TESTING_GUIDE_CONDENSED.md` before writing or modifying E2E tests.

Note: Playwrite tests only work in areas that don't require authentication. Don't even try because Playwrite's not compatable with ICP Auth.

**Workflow:**
```bash
# 1. Make code changes
vim daopad_frontend/src/routes/AppRoute.tsx

# 2. Deploy to mainnet (MANDATORY before testing)
./deploy.sh --network ic

# 3. Run tests against deployed code
cd daopad_frontend
npx playwright test e2e/feature.spec.ts

# 4. If tests fail: analyze artifacts, form hypothesis, fix, GOTO step 2
# 5. If tests pass: commit, create PR, SUCCESS ✅
```

### Don't worry about Backwards Compatability

Since Orbit handles the heavy storage and upadate tasks, we can't break anything. Also this product isn't live so be liberal about edits. The goal is not to preserve anything, but constantly be removing all bloat and tech debt. Never worry about backwards compatability at the expense of optimization.

### 🗳️ Governance Architecture: Liquid Voting, Not Role-Based

```
Proposal Created
    ↓
Users Vote (weighted by Kong Locker voting power)
    ↓
Vote Threshold Reached? (e.g., 50% of total voting power)
    ↓ YES
DAOPad Backend Exercises Admin Authority
    ↓
Orbit Station Executes (AutoApproved policy)
```

#### Implementation:
1. **Orbit Station Setup**: 
   - 'Admin' canister is the made an admin by existing station members in order to unlock all our features.
   - 'daopad_backend' canister needs to have sufficient rights to create proposals, which are generally covered by an operator role.
   - No user roles needed. It's less permission complexity.

2. **DAOPad Governance Layer**:
   - Admin canister tracks votes weighted by Kong Locker voting power (locked LP value)
   - Simple threshold: `sum(votes_for) >= (total_voting_power × threshold_percentage)`
   - When threshold reached, admin canister approves the proposal on Orbit

**Result**: Liquid democracy based on locked liquidity, not infinite static user roles. Voting power changes with LP token value - real skin in the game.

## 📦 Canister IDs

| Component | Canister ID | URL |
|-----------|-------------|-----|
| admin |
`odkrm-viaaa-aaaap-qp2oq-cai` | - |
| daopad_backend | `lwsav-iiaaa-aaaap-qp2qq-cai` | - |
| daopad_frontend | `l7rlj-6aaaa-aaaaa-qaffq-cai` | https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io |
| Orbit Station | `fec7w-zyaaa-aaaaa-qaffq-cai` | External |
| Kong Locker | `eazgb-giaaa-aaaap-qqc2q-cai` | Reference only |

### Governance Rules

1. Admin canister can approve or reject any requests in accordance with it's quorum voting rules for a given proposal, but cannot create any requests.
2. daopad_backend canister can create requests in orbit, but never approve or reject them.

### Why This Architecture

- **True decentralization**: Voting power from locked LP tokens (Kong Locker)
- **No role bloat**: One admin (backend) instead of complex permission matrix
- **Liquid democracy**: Voting power changes with token value
- **Complete coverage**: Every Orbit operation requires community approval
- **Type safety**: Enum ensures all operations have defined thresholds

## 🚨 CRITICAL: Declaration Sync Bug

**Error**: `TypeError: actor.method_name is not a function` (works in dfx but not frontend)

**Root Cause**: Frontend uses `/src/daopad/daopad_frontend/src/declarations/` but dfx generates to `/src/declarations/`. They don't auto-sync!

**Quick Fix After Backend Changes**:
```bash
# After any backend method addition:
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did
./deploy.sh --network ic --backend-only

# CRITICAL: Sync declarations manually
cp -r src/declarations/daopad_backend/* src/daopad/daopad_frontend/src/declarations/daopad_backend/

./deploy.sh --network ic --frontend-only
```

**Verify The Bug**: Check if method exists in all 3 places:
```bash
grep "method_name" src/daopad/daopad_backend/daopad_backend.did  # ✓ Backend candid
grep "method_name" src/declarations/daopad_backend/daopad_backend.did.js  # ✓ Generated
grep "method_name" src/daopad/daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js  # ✗ Frontend (stale!)
```

**Why It's Insidious**: DFX works perfectly, deploy succeeds, but frontend silently uses stale types. The error message misleads you into debugging runtime issues when it's actually a build-time declaration mismatch.


## ⚠️ Orbit Station Integration Workflow

### 🔑 Test Station Setup
**Use our admin-enabled test station to verify EVERYTHING before coding:**
- **Station**: `fec7w-zyaaa-aaaaa-qaffq-cai` (ALEX token)
- **Identity**: `daopad` (has admin/operator access)
- **Rule**: NEVER GUESS TYPES - Test with dfx first!

### The Deterministic 4-Step Process

#### 1️⃣ Research in ../../orbit-reference/
```bash
# Find exact types in Orbit source
grep -r "OperationName" ../../orbit-reference/core/station/ --include="*.rs" --include="*.did"
# Check: api/spec.did, impl/src/models/, impl/src/mappers/
```

#### 2️⃣ Test with DFX (CRITICAL - Never Skip!)
```bash
export TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"

# Get candid interface
dfx canister --network ic call $TEST_STATION __get_candid

# Test the EXACT operation
dfx canister --network ic call $TEST_STATION operation_name '(record { ... })'

# If it works in dfx, it WILL work in code with matching types
```

#### 3️⃣ Implement with Exact Types
```rust
// Copy EXACTLY what worked in dfx - field names, types, structure
#[update]  // Must be update for cross-canister calls
async fn orbit_operation(station_id: Principal) -> Result<Response, String> {
    let result: Result<(ExactTypeFromDfx,), _> = ic_cdk::call(
        station_id,
        "method_name",
        (exact_params_from_dfx,)
    ).await;
    // Handle tagged enums: Ok/Err variants inside Result
}
```

#### 4️⃣ Verify Backend Matches Direct Call
```bash
# Your backend method
dfx canister --network ic call daopad_backend orbit_operation '(...)'

# Should match direct Orbit call
dfx canister --network ic call $TEST_STATION method_name '(...)'
```

### Key Patterns
- **Group UUIDs**: `"00000000-e400-0000-4d8f-480000000000"` (admin), `"...-480000000001"` (operator)
- **Most operations**: Create requests, not direct calls (need approval)
- **Result handling**: Orbit returns `Result::Ok(CreateRequestResult::Ok/Err)` - double wrapped!

### Common Failures & Fixes
| Issue | Fix |
|-------|-----|
| Type mismatch | Copy EXACT types from dfx test, not documentation |
| Decode error | Remove extra fields, match Orbit's actual response |
| Permission denied | Use `daopad` identity with test station |
| Query fails | Use `#[update]` not `#[query]` for cross-canister |

### Example: Real Debug Session
```bash
# Problem: list_requests decode error
dfx canister --network ic call $TEST_STATION list_requests '(record {
  statuses = null;  # ❌ Caused decode error with completed requests
})'

# Fix: Filter for non-completed only
statuses = opt vec { variant { Created }; variant { Processing } }  # ✓ Works
```

**Why This Works**: Test station + admin access + exact type matching = deterministic success. If dfx works, code works.

#### Orbit Reference (../../orbit-reference/):
- **🚨 CRITICAL**: This is Dfinity's official Orbit repository - READ-ONLY
- Use for understanding Station architecture: `../../orbit-reference/core/station/`
- Study frontend patterns: `../../orbit-reference/apps/station/`
- Reference treasury management: `../../orbit-reference/core/station/src/services/`
- Check API interfaces: `../../orbit-reference/core/station/api/`
- **🚨 NEVER MODIFY - This is not our code, it's reference material only**

Remember: DAOPad is where we build. References are where we learn. Never modify reference code.