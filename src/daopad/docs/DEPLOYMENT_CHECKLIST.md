# DAOPad Deployment Checklist

## Overview

This checklist ensures your DAOPad + Orbit Station deployment is production-ready. Complete ALL items before launching with real assets.

**Audience**: DevOps, deployment engineers, DAO operators
**Time Required**: 2-4 hours for initial deployment, 1 hour for verification

---

## Pre-Deployment Verification

### 1. Infrastructure Prerequisites

- [ ] **IC Network Access**
  - [ ] dfx installed (version 0.15.0+)
  - [ ] Internet Computer mainnet access configured
  - [ ] Sufficient cycles for deployment (~5T for initial deploy)

- [ ] **Principals & Keys**
  - [ ] Backend canister principal known: `lwsav-iiaaa-aaaap-qp2qq-cai`
  - [ ] Frontend canister principal known: `l7rlj-6aaaa-aaaaa-qaffq-cai`
  - [ ] Deployment identity configured (dfx identity)
  - [ ] Controller principal documented

- [ ] **External Dependencies**
  - [ ] Orbit Station deployed and accessible
  - [ ] Orbit Station canister ID recorded
  - [ ] Kong Locker deployed (voting power source)
  - [ ] Kong Locker canister ID: `eazgb-giaaa-aaaap-qqc2q-cai`

### 2. Orbit Station Configuration

⚠️ **CRITICAL**: This is the most common deployment blocker. Verify thoroughly.

- [ ] **Backend Authorization**
  - [ ] Backend principal added to Orbit users
  - [ ] Backend in admin group: `00000000-0000-4000-8000-000000000000`
  - [ ] Backend NOT in operator group (optional, but clarify)

  **Verify**:
  ```bash
  dfx canister --network ic call ORBIT_STATION_ID list_users '(record {})'
  # Should show lwsav-iiaaa-aaaap-qp2qq-cai in admin group
  ```

- [ ] **AutoApproved Policies** (MANDATORY)
  - [ ] All accounts have `AutoApproved` transfer policy
  - [ ] No accounts with Quorum or QuorumPercentage policies
  - [ ] Policy change requests approved and executed

  **Verify**:
  ```bash
  dfx canister --network ic call ORBIT_STATION_ID list_accounts '(record {})'
  # ALL accounts should show: transfer_request_policy = variant { AutoApproved }
  ```

  **If not AutoApproved**: See `ORBIT_MIGRATION_STATUS.md` for setup guide.

- [ ] **Account Setup**
  - [ ] ICP treasury account created
  - [ ] Token-specific accounts created (ckBTC, etc.)
  - [ ] Account names follow convention: `[TOKEN_SYMBOL] Treasury`
  - [ ] Account blockchain types correct (ICP, Bitcoin, etc.)

### 3. Code Verification

- [ ] **Backend**
  - [ ] Latest code pulled from main branch
  - [ ] Cargo build succeeds: `cargo build --target wasm32-unknown-unknown --release -p daopad_backend`
  - [ ] Candid interface generated: `candid-extractor target/.../daopad_backend.wasm`
  - [ ] Governance enforcement confirmed (all Orbit calls use `ensure_proposal_for_request()`)

- [ ] **Frontend**
  - [ ] Latest code pulled from main branch
  - [ ] npm install succeeds
  - [ ] npm run build succeeds
  - [ ] Declaration sync verified (see "Declaration Sync" section below)

- [ ] **Tests**
  - [ ] Backend tests pass: `cargo test`
  - [ ] Frontend tests pass: `npm test`
  - [ ] Integration tests run successfully

### 4. Declaration Sync (Critical!)

⚠️ **COMMON BUG**: Frontend uses stale declarations → "method is not a function" errors

- [ ] **Backend → dfx declarations**
  ```bash
  cargo build --target wasm32-unknown-unknown --release -p daopad_backend
  candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did
  dfx generate daopad_backend
  ```

- [ ] **dfx declarations → Frontend**
  ```bash
  cp -r src/declarations/daopad_backend/* src/daopad/daopad_frontend/src/declarations/daopad_backend/
  ```

- [ ] **Verification**
  - [ ] Method exists in backend.did: `grep "method_name" src/daopad/daopad_backend/daopad_backend.did`
  - [ ] Method in dfx declarations: `grep "method_name" src/declarations/daopad_backend/daopad_backend.did.js`
  - [ ] Method in frontend declarations: `grep "method_name" src/daopad/daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js`
  - [ ] All three match exactly

### 5. Configuration Review

- [ ] **Environment Variables**
  - [ ] Production canister IDs in .env files
  - [ ] No testnet/localhost references
  - [ ] API endpoints point to mainnet

- [ ] **Governance Parameters**
  - [ ] Voting thresholds configured (50%-90% by operation type)
  - [ ] Voting period set (7 days / 168 hours)
  - [ ] Operation type mappings verified (`OrbitRequestType` enum)

- [ ] **Security Settings**
  - [ ] CORS configured correctly
  - [ ] Rate limiting enabled (if applicable)
  - [ ] Input validation in place

---

## Deployment Steps

### 1. Backend Deployment

```bash
cd src/daopad

# Build backend
cargo build --target wasm32-unknown-unknown --release -p daopad_backend

# Generate candid
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Deploy backend only
./deploy.sh --network ic --backend-only
```

**Verify**:
- [ ] Deployment succeeds without errors
- [ ] Backend canister ID unchanged (or recorded if changed)
- [ ] Canister status shows "Running"

**Check**:
```bash
dfx canister --network ic status daopad_backend
# Should show: Status: Running, Memory: <some value>, Cycles: <sufficient>
```

### 2. Frontend Deployment

```bash
# Sync declarations (CRITICAL!)
cp -r src/declarations/daopad_backend/* src/daopad/daopad_frontend/src/declarations/daopad_backend/

# Deploy frontend only
./deploy.sh --network ic --frontend-only
```

**Verify**:
- [ ] Deployment succeeds without errors
- [ ] Frontend canister ID unchanged
- [ ] Assets uploaded successfully

**Check**:
```bash
dfx canister --network ic status daopad_frontend
# Should show: Status: Running, Asset count: <number>
```

### 3. Full Deployment (Alternative)

```bash
# Deploy both backend and frontend
./deploy.sh --network ic
```

**When to use**:
- Initial deployment
- Breaking changes requiring both updates
- After major refactors

**When NOT to use**:
- Small frontend-only changes (use --frontend-only)
- Small backend-only changes (use --backend-only)
- Reduces deployment time and risk

### 4. Token Station Mapping

For each token you want to manage:

```bash
# Register token → Orbit Station mapping
dfx canister --network ic call daopad_backend register_token_station '(
  record {
    token_canister_id = principal "TOKEN_CANISTER_ID";
    station_id = principal "ORBIT_STATION_ID";
  }
)'
```

**Verify**:
```bash
# List all registered tokens
dfx canister --network ic call daopad_backend list_tokens
```

- [ ] All intended tokens registered
- [ ] Station IDs correct
- [ ] No duplicate registrations

---

## Post-Deployment Testing

### 1. Smoke Tests

**Backend Health**:
```bash
# Test basic backend call
dfx canister --network ic call daopad_backend list_tokens

# Should return list of registered tokens (or empty if none yet)
```

**Frontend Access**:
- [ ] Open frontend URL: `https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io`
- [ ] Page loads without errors
- [ ] No console errors (check browser DevTools)
- [ ] UI renders correctly

**Orbit Integration**:
```bash
# Test Orbit query via backend
dfx canister --network ic call daopad_backend get_orbit_users '(principal "TOKEN_CANISTER_ID")'

# Should return user list (at minimum, backend principal)
```

### 2. Governance Workflow Test

**Create Test Proposal**:
```bash
# Example: Create address book entry (low-risk, 30% threshold)
dfx canister --network ic call daopad_backend create_address_book_entry '(
  principal "TOKEN_CANISTER_ID",
  record {
    address = "test-address";
    blockchain = variant { InternetComputer };
    labels = vec { "test" };
    metadata = vec {};
  }
)'
```

**Verify Proposal Created**:
```bash
dfx canister --network ic call daopad_backend list_proposals '(
  record {
    token_canister_id = principal "TOKEN_CANISTER_ID"
  }
)'
```

**Expected**:
- [ ] Proposal appears in list
- [ ] Correct operation type (AddAddressBookEntry)
- [ ] Correct threshold (30%)
- [ ] Status = "Pending"
- [ ] Vote count = 0

**Verify Orbit Request Created**:
```bash
dfx canister --network ic call ORBIT_STATION_ID list_requests '(
  record {
    statuses = opt vec { variant { Created }; variant { Pending } };
  }
)'
```

**Expected**:
- [ ] Request appears in Orbit
- [ ] Matches proposal request ID
- [ ] Status = "Created" or "Pending"

### 3. Voting Test

**Get Voting Power**:
```bash
dfx canister --network ic call kong_locker get_all_voting_powers
```

**Cast Test Vote** (via frontend or backend):
```bash
dfx canister --network ic call daopad_backend vote_on_proposal '(
  principal "TOKEN_CANISTER_ID",
  "PROPOSAL_ID",
  variant { For }
)'
```

**Verify Vote Recorded**:
```bash
dfx canister --network ic call daopad_backend get_proposal '("PROPOSAL_ID")'
```

**Expected**:
- [ ] Vote count increased
- [ ] Voter principal in votes list
- [ ] Vote weight matches Kong Locker voting power

### 4. AutoApproved Execution Test

**Important**: If voting threshold met, request should auto-execute when backend approves.

**Check Request Status**:
```bash
dfx canister --network ic call ORBIT_STATION_ID get_request '("REQUEST_ID")'
```

**If vote passed threshold**:
- [ ] Request status = "Completed" or "Processing"
- [ ] Treasury/account state changed as expected
- [ ] No errors in Orbit logs

**If AutoApproved NOT working**:
- Review `ORBIT_MIGRATION_STATUS.md`
- Check account has AutoApproved policy
- Verify backend in admin group
- Check for Orbit errors

### 5. Edge Cases & Error Handling

**Test Error Scenarios**:

- [ ] **Invalid token ID**:
  ```bash
  dfx canister --network ic call daopad_backend create_address_book_entry '(principal "aaaaa-aa", ...)'
  # Should error: "No Orbit Station for this token"
  ```

- [ ] **Unauthorized user** (non-voter):
  ```bash
  # Use identity with 0 voting power
  dfx canister --network ic call daopad_backend vote_on_proposal '(...)'
  # Should error: "Insufficient voting power" or similar
  ```

- [ ] **Duplicate vote**:
  ```bash
  # Vote twice with same identity
  dfx canister --network ic call daopad_backend vote_on_proposal '(...)'
  # Should error: "Already voted" or update existing vote
  ```

- [ ] **Frontend method not found**:
  - Open browser DevTools → Console
  - Try calling a backend method via frontend
  - Should NOT see "method is not a function" error
  - If you do: Declaration sync failed (see "Declaration Sync" section)

---

## Monitoring

### 1. Canister Health

**Set up monitoring for**:
- [ ] Canister cycle balance (alert below 1T cycles)
- [ ] Canister memory usage (alert above 80% stable memory)
- [ ] Canister status (alert if not "Running")

**Check commands**:
```bash
# Backend health
dfx canister --network ic status daopad_backend

# Frontend health
dfx canister --network ic status daopad_frontend

# Orbit health
dfx canister --network ic status ORBIT_STATION_ID
```

### 2. Governance Activity

**Monitor**:
- [ ] Number of active proposals
- [ ] Vote participation rate
- [ ] Proposal pass/fail rate
- [ ] Time to threshold (should be < 7 days for most)

**Audit commands**:
```bash
# List all proposals
dfx canister --network ic call daopad_backend list_proposals '(record { token_canister_id = principal "..." })'

# Get proposal details
dfx canister --network ic call daopad_backend get_proposal '("PROPOSAL_ID")'
```

### 3. Orbit Operations

**Monitor**:
- [ ] Pending requests (should auto-execute if AutoApproved)
- [ ] Failed requests (investigate causes)
- [ ] Request execution time

**Audit commands**:
```bash
# Pending requests
dfx canister --network ic call ORBIT_STATION_ID list_requests '(record {
  statuses = opt vec { variant { Created }; variant { Pending } };
})'

# Completed requests
dfx canister --network ic call ORBIT_STATION_ID list_requests '(record {
  statuses = opt vec { variant { Completed } };
})'
```

### 4. Treasury Balances

**Monitor**:
- [ ] ICP balance
- [ ] Token balances (ckBTC, custom tokens)
- [ ] Large transfers (set threshold, e.g., >100 ICP)

**Check commands**:
```bash
# Get account balances via Orbit
dfx canister --network ic call ORBIT_STATION_ID list_accounts '(record {})'

# Via backend (if implemented)
dfx canister --network ic call daopad_backend get_treasury_balance '(principal "TOKEN_CANISTER_ID")'
```

---

## Rollback Procedures

### Backend Rollback

If backend deployment causes issues:

```bash
# Option 1: Redeploy previous version
# (Requires previous .wasm saved)
dfx canister --network ic install daopad_backend --mode upgrade --wasm previous_version.wasm

# Option 2: Redeploy from previous commit
git checkout PREVIOUS_COMMIT
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
./deploy.sh --network ic --backend-only
```

**Verify**:
- [ ] Rollback succeeds
- [ ] Previous functionality restored
- [ ] No data loss (stable storage preserved)

### Frontend Rollback

```bash
# Checkout previous version
git checkout PREVIOUS_COMMIT

# Rebuild and redeploy
./deploy.sh --network ic --frontend-only
```

**Verify**:
- [ ] Frontend loads correctly
- [ ] Previous UI restored
- [ ] Backend integration still works

### Data Recovery

⚠️ **IMPORTANT**: DAOPad uses minimal storage (only token→station mapping).

**What CAN'T be lost**:
- Orbit requests (stored in Orbit Station)
- Voting power (stored in Kong Locker)
- Proposals (stored in DAOPad backend stable storage)

**What CAN be lost** (rare):
- Token station mappings (if stable storage corrupted)

**Recovery**:
```bash
# Re-register token mappings
dfx canister --network ic call daopad_backend register_token_station '(...)'
```

**Backup Strategy**:
- [ ] Export token mappings regularly
- [ ] Document all registered tokens
- [ ] Keep list of Orbit Station IDs
- [ ] Store deployment configs in version control

---

## Production Readiness Checklist

### Infrastructure
- [ ] All canisters deployed successfully
- [ ] Canister IDs documented and backed up
- [ ] Sufficient cycles allocated (>5T per canister)
- [ ] Monitoring and alerting configured

### Orbit Station
- [ ] Backend authorized in Orbit (admin group)
- [ ] ALL accounts have AutoApproved policies
- [ ] No pending policy change requests
- [ ] Test operations execute successfully

### Governance
- [ ] Voting thresholds configured correctly
- [ ] Voting periods set (7 days)
- [ ] Test proposals created and voted on
- [ ] Vote tallies match Kong Locker voting power

### Code Quality
- [ ] Backend and frontend tests pass
- [ ] Declaration sync verified
- [ ] No console errors in frontend
- [ ] Error handling tested (edge cases)

### Security
- [ ] Governance enforcement verified (all Orbit ops create proposals)
- [ ] AutoApproved security architecture understood (see SECURITY_AUTOAPPROVED.md)
- [ ] No private keys stored in canisters
- [ ] CORS and rate limiting configured

### Documentation
- [ ] Deployment notes documented
- [ ] Token station mappings recorded
- [ ] Runbook for common issues created
- [ ] Team trained on governance workflow

### Testing
- [ ] Smoke tests pass
- [ ] Governance workflow tested end-to-end
- [ ] Voting and execution verified
- [ ] Edge cases and error scenarios tested

### Monitoring
- [ ] Canister health monitoring active
- [ ] Governance activity tracked
- [ ] Treasury balances monitored
- [ ] Alerting configured for critical issues

---

## Post-Launch

### Week 1
- [ ] Monitor all proposals and votes daily
- [ ] Verify AutoApproved execution working
- [ ] Check canister cycle balances
- [ ] Address any user-reported issues

### Month 1
- [ ] Review governance participation rates
- [ ] Analyze proposal pass/fail patterns
- [ ] Optimize voting thresholds if needed
- [ ] Plan feature enhancements

### Ongoing
- [ ] Regular security audits
- [ ] Code reviews for all changes
- [ ] Community feedback integration
- [ ] Performance optimization

---

## Emergency Contacts

**Team Roles**:
- [ ] Backend developer: [Name/Contact]
- [ ] Frontend developer: [Name/Contact]
- [ ] DevOps engineer: [Name/Contact]
- [ ] DAO administrator: [Name/Contact]

**External Resources**:
- Orbit Station support: [Link/Contact]
- IC support: https://forum.dfinity.org
- DAOPad repo: https://github.com/[your-repo]

---

## Conclusion

Deployment is complete when ALL items in "Production Readiness Checklist" are checked.

**Remember**: The most critical item is Orbit AutoApproved configuration. Without it, ALL treasury operations will be stuck in pending state.

See:
- `ORBIT_MIGRATION_STATUS.md` - AutoApproved setup guide
- `SECURITY_AUTOAPPROVED.md` - Security architecture
- `AGENT_INSTRUCTIONS_ORBIT.md` - Developer guidelines
- `CLAUDE.md` - General development docs
