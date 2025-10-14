1. **Deployment**: Use `./deploy.sh` from THIS directory (`src/daopad/`), NOT the root

### Workflow Summary:
```bash
./deploy.sh --network ic  # Deploy everything. Use this every time.
```

**⚠️ CRITICAL: Always deploy to mainnet using `./deploy.sh --network ic` after making ANY changes. There is no local testing environment - all testing happens on mainnet. This ensures both frontend and backend stay in sync.**


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
        ├── daopad_backend/
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

## 🏗️ Design Principles

### Minimal Storage Principle
**Decision**: The ONLY thing we store is the "token_canister_id":"orbit_station_id" mapping. Everything else is dynamically queried and mdoified through Orbit's Core logic. In this way we can freely upgrade and modify on mainnet with breaking changes without fear of data loss. The only data we need to keep is in the daopad_backend is what tokens map to what orbit stations.

#### Why Minimal Storage:
1. **Upgrade Safety**: Once data is in stable storage, removing it requires complex migrations
2. **IC Best Practice**: Cross-canister queries in update calls work fine
3. **Maintenance**: Less code, less bugs, less to maintain
4. **Flexibility**: Can change what we display without backend changes

Don't optimize for speed in the frontend. It's perfectly fine if the frontend is slow because it uses inter-canister calls. For now we just want to ensure modular functionality and maximum robustness.

#### Implementation Pattern:
```javascript
// Frontend handles minimal data gracefully
if (result.success && result.data) {
    setOrbitStation({
        station_id: result.data,  // Only what we got
        name: `${token.symbol} Treasury`  // Derive what we can
    });
}
```

### Don't worry about Backwards Compatability

Since we're not storing anything, we can't break anything. Also this product isn't live so be liberal about edits. The goal is not to preserve anything, but constantly be removing all bloat and tech debt. Never worry about backwards compatability at the expense of optimization.

### 🗳️ Governance Architecture: Liquid Voting, Not Role-Based

**Core Principle**: Orbit Station is the **execution engine**, NOT the governance layer. Real voting happens in DAOPad using Kong Locker voting power.

#### The Problem We're Solving:
- ❌ Orbit's built-in voting: Static user roles (Quorum of 3 admins, 50% of group, etc.)
- ❌ Traditional DAOs: Growing role bloat, human admins creating roles "for show"
- ❌ Fake decentralization: Vote count, not voting weight

#### Our Solution:
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
1. **Orbit Station Setup**: Set policy to `AutoApproved` or `Quorum(backend_only, 1)`
   - Backend is the ONLY admin/user in Orbit
   - No user roles, no permission complexity
   - Orbit is just a secure treasury execution engine

2. **DAOPad Governance Layer**:
   - Store proposals in DAOPad backend
   - Track votes weighted by Kong Locker voting power (locked LP value)
   - Simple threshold: `sum(votes_for) >= (total_voting_power × threshold_percentage)`
   - When threshold reached, backend submits approval to Orbit

3. **What We DON'T Build**:
   - ❌ No Orbit user management
   - ❌ No role/permission systems
   - ❌ No complex policy evaluation
   - ❌ No mirroring Orbit's request state

**Result**: Liquid democracy based on locked liquidity, not infinite static user roles. Voting power changes with LP token value - real skin in the game.

### Orbit Station Query Strategy

#### The Challenge:
Orbit Station restricts many queries to admin/member roles only. Public users cannot query:
- Treasury balance
- Pending proposals
- Member list
- Transaction history
- Most operational data

#### Our Approach:

**Backend as Admin Proxy**
Since DAOPad backend is the Orbit Station admin, it can query protected data on behalf of users.

```rust
// Backend (admin) can query protected Orbit data
#[update]  // Must be update, not query
async fn get_treasury_balance(token_id: Principal) -> Result<Balance> {
    let station_id = get_station_for_token(token_id)?;
    // Backend has admin rights to query
    orbit_station.get_balance(station_id).await
}
```

**Design Considerations:**

1. **Query vs Update Trade-off**
   - Orbit queries must happen in update calls (not query methods)
   - Slightly slower but enables admin-level access
   - Users get data they couldn't access directly

2. **No Caching Policy**
   - No caching at this stage - keeping it clean and simple
   - Fresh data on every request
   - Code simplicity > user experience optimization
   - Can always add caching later if truly needed

3. **Frontend Fallbacks**
   - If backend query fails, show minimal UI
   - Link to Orbit Station for users to check directly
   - Progressive enhancement as data becomes available

4. **Future Options**
   - Could make users members automatically (100+ VP)
   - Then they could query Orbit directly
   - But adds complexity to member management

## ⚠️ Critical Limitations

### Query Method Restriction (IC Platform Limitation)
```rust
// ❌ DOESN'T WORK - Query methods can't call other queries
#[query]
async fn get_orbit_data() -> Result<Data> {
    orbit_station.list_requests().await // FAILS!
}

// ✅ WORKS - Update methods can call anything
#[update]
async fn execute_orbit_action() -> Result<()> {
    orbit_station.execute_request().await // Works!
}
```

## 📦 Canister IDs

| Component | Canister ID | URL |
|-----------|-------------|-----|
| DAOPad Backend | `lwsav-iiaaa-aaaap-qp2qq-cai` | - |
| DAOPad Frontend | `l7rlj-6aaaa-aaaaa-qaffq-cai` | https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io |
| Orbit Station | `fec7w-zyaaa-aaaaa-qaffq-cai` | External |
| Kong Locker | `eazgb-giaaa-aaaap-qqc2q-cai` | Reference only |

## 🔴 Common Issues

| Issue | Solution |
|-------|----------|
| "Backend not authorized" | Register backend principal in Orbit Station |
| "Invalid candid decode" | Run candid-extractor after Rust changes |
| "Query calling query" | Use update method or direct frontend call |
| Need Kong Locker data | Read `../../kong-locker-reference/CLAUDE.md` for API info |
| Wrong deploy script | Use `./deploy.sh` from THIS directory |
| **"is not a function" error** | **CRITICAL: See Declaration Sync Bug section below** |
| "Invalid principal argument" | Frontend must convert strings to Principal using `Principal.fromText()` before passing to backend |
| Actor is null/undefined | DAOPadBackendService requires `await service.getActor()`, not `service.actor` |

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