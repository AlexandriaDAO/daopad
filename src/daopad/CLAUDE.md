# DAOPad - CLAUDE.md

**Context**: You are working on DAOPad, a DAO governance framework that transforms Orbit Station into a decentralized treasury management system.

## 🎯 Project Mission

Transform Orbit Station from a centralized multi-sig wallet into a DAO-governed treasury where Alexandria's $ALEX token holders vote on all administrative decisions.

## 🏛️ Architecture

### Core Components

```
daopad/
├── daopad_backend/       # Rust canister - governance logic & Orbit integration
│   ├── src/
│   │   ├── lib.rs       # Main canister entry point
│   │   ├── alexandria_dao.rs  # Orbit Station integration module
│   │   └── types.rs     # Type definitions
│   └── daopad_backend.did  # Candid interface (auto-generated)
│
├── daopad_frontend/      # React app - voting interface
│   ├── src/
│   │   ├── App.jsx      # Main application component
│   │   └── components/  # UI components
│   └── dist/            # Build output (DO NOT EDIT)
│
└── orbit_station/        # Orbit Station candid definitions
    └── orbit_station.did # Interface for cross-canister calls
```

## 🔑 Key Concepts

### What is Orbit Station?
- A trustless multi-custody canister for managing digital assets
- Currently uses human admins (centralized problem)
- Our solution: DAOPad backend becomes THE admin

### Governance Flow
1. User registers with LP Locker principal (proof of locked liquidity)
2. Registration grants voting power based on locked amount
3. Proposals created in Orbit Station
4. Users vote through DAOPad frontend
5. DAOPad backend executes approved proposals on Orbit Station

### Alexandria DAO Integration
- **Token**: $ALEX (governance token)
- **Station ID**: `fec7w-zyaaa-aaaaa-qaffq-cai`
- **Current Phase**: Testing on mainnet with test Orbit Station

## ⚠️ Critical Limitations

### Query Method Restriction
```rust
// ❌ THIS DOESN'T WORK - Queries can't call queries
#[query]
async fn get_orbit_data() -> Result<Data> {
    orbit_station.list_requests().await // FAILS!
}

// ✅ THIS WORKS - Update methods can call anything
#[update]
async fn execute_orbit_action() -> Result<()> {
    orbit_station.execute_request().await // Works!
}
```

**Impact**: Frontend must call Orbit Station directly for read operations.

### Known Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `ic0_call_new` error | Query calling query | Use update method or direct frontend call |
| Decoding errors | Orbit uses inline records | Match exact candid types from orbit_station.did |
| Principal mismatch | Backend not registered | Register backend principal in Orbit Station |

## 🛠️ Development Workflow

### Backend Changes
```bash
# 1. Make Rust changes
vim src/lib.rs

# 2. Build
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked

# 3. CRITICAL: Regenerate candid
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend.did

# 4. Ask user to deploy
echo "Please run: ./deploy.sh --network ic --backend-only"
```

### Frontend Changes
```bash
# 1. Development server (talks to mainnet)
cd daopad_frontend
npm install
npm run dev  # Opens at localhost:3000

# 2. After changes, ask user to deploy
echo "Please run: ./deploy.sh --network ic --frontend-only"
```

## 📝 Entry Points

### Backend Methods
```rust
// Registration & Voting
register_with_lp_principal(principal: Principal) -> Result<()>
cast_vote(proposal_id: u64, vote: Vote) -> Result<()>
get_voting_power(user: Principal) -> Result<u64>

// Orbit Integration (admin operations)
execute_approved_proposal(proposal_id: u64) -> Result<()>
get_alexandria_config() -> Result<Config>

// Cache management
get_cache_status() -> Result<CacheStatus>
refresh_cache() -> Result<()>
```

### Frontend Routes
- `/` - Dashboard with proposals list
- `/register` - LP principal registration
- `/proposal/:id` - Individual proposal voting
- `/governance` - Voting statistics

## 🔗 Integration Points

### With Kong Locker
```rust
// Users provide their Kong Locker principal as proof
register_with_lp_principal(kong_locker_principal: Principal) {
    // Verify principal owns locked LP tokens
    // Grant voting power based on locked amount
}
```

### With Orbit Station
```rust
// DAOPad backend acts as Orbit admin
impl OrbitAdmin for DaoPadBackend {
    // Execute treasury operations after DAO approval
    async fn execute_request(request_id: u64) -> Result<()>
}
```

## 🚨 Testing Checklist

When modifying DAOPad:
- [ ] Verify registration with LP principal works
- [ ] Test voting mechanism
- [ ] Ensure Orbit integration doesn't use query-to-query calls
- [ ] Check frontend correctly displays Orbit proposals
- [ ] Validate vote tallying logic
- [ ] Test proposal execution threshold

## 📊 State Management

### Backend State
```rust
struct DaoPadState {
    registered_users: HashMap<Principal, VotingPower>,
    proposals: HashMap<u64, Proposal>,
    votes: HashMap<(Principal, u64), Vote>,
    orbit_station_id: Principal,
    governance_config: GovernanceConfig,
}
```

### Frontend State (React)
```javascript
const AppState = {
    user: { principal, votingPower, isRegistered },
    proposals: [...],
    votes: { [proposalId]: userVote },
    orbitConnection: { status, lastSync }
}
```

## 🔴 Common Issues

1. **"Backend not authorized"**: Backend principal needs registration in Orbit Station
2. **"Invalid candid decode"**: Regenerate candid after ANY Rust changes
3. **"Proposal not found"**: Cache might be stale, call refresh_cache()
4. **Frontend shows old data**: Browser cache issue, hard refresh (Ctrl+Shift+R)

## 📚 Resources

- [Orbit Documentation](https://docs.orbitchain.io)
- [Alexandria DAO Specs](internal)
- [IC Query Limitations](https://forum.dfinity.org/t/query-calls/1234)

## For Claude Code

When working on DAOPad:
1. **Focus on governance logic** - This is a DAO tool, not a wallet
2. **Respect query limitations** - Never attempt query-to-query calls
3. **Maintain separation** - Kong Locker handles LP tokens, DAOPad handles governance
4. **Test on mainnet** - No local testing, deploy directly to IC
5. **Update candid** - ALWAYS after Rust changes