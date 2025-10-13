# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-deprecation-cleanup/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-deprecation-cleanup/src/daopad`
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
   git commit -m "refactor: Remove deprecated backwards-compatibility code"
   git push -u origin feature/remove-deprecated-backwards-compat
   gh pr create --title "Refactor: Remove Deprecated Backwards-Compatibility Code" --body "Implements PLAN-remove-deprecated-backwards-compat.md"
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

**Branch:** `feature/remove-deprecated-backwards-compat`
**Worktree:** `/home/theseus/alexandria/daopad-deprecation-cleanup/src/daopad`

---

# Implementation Plan: Remove Deprecated Backwards-Compatibility Code

## Task Type
**REFACTORING** - Removing dead code and backwards-compatibility cruft

## Context
Per CLAUDE.md design principles:
- "Don't worry about Backwards Compatibility" - Since we only store token_canister_id:orbit_station_id mapping
- "The goal is not to preserve anything, but constantly be removing all bloat and tech debt"
- Product is not live, so we can be aggressive with removals

## Current State Documentation

### Backend Deprecated Functions (Rust)

#### 1. `get_orbit_request()` - daopad_backend/src/api/orbit_requests.rs:701-708
```rust
/// Get a single request by ID (deprecated - kept for compatibility)
#[update]
pub async fn get_orbit_request(
    _token_canister_id: Principal,
    _request_id: String,
) -> Result<String, String> {
    Err("This method is deprecated. Use list_orbit_requests instead.".to_string())
}
```
- **Status**: Already non-functional (returns error)
- **Exposed in**: daopad_backend.did:815-816
- **Replacement**: `list_orbit_requests()`

#### 2. `approve_transfer_request()` - daopad_backend/src/api/orbit.rs:273-286
```rust
// DEPRECATED: Direct transfer approval has been removed to enforce proposal-based governance.
// This function is kept for backwards compatibility but returns an error.
#[update]
pub async fn approve_transfer_request(
    _request_id: String,
    _token_id: Principal,
) -> Result<(), String> {
    Err(
        "DEPRECATED: Direct transfer approval has been removed for security reasons. \
        All transfer approvals must now go through the proposal voting system. \
        To approve a transfer, vote YES on the corresponding proposal. \
        Required voting power: 10,000 VP minimum.".to_string()
    )
}
```
- **Status**: Already non-functional (returns error)
- **Exposed in**: daopad_backend.did:746
- **Replacement**: Proposal voting system via `vote_on_treasury_proposal()`

#### 3. Old hash mapping - daopad_backend/src/api/orbit_requests.rs:29
```rust
479410653 => "Failed".to_string(), // CORRECTED: This is the actual Failed hash
1569634545 => "Failed".to_string(), // Keep old mapping for compatibility
```
- **Status**: Redundant hash mapping for "Failed" status
- **Reason**: Line 29 kept "for compatibility" with old incorrect hash

### Frontend Deprecated Code (JavaScript)

#### 4. UnifiedBackendService - daopad_frontend/src/services/backend/UnifiedBackendService.js
- **File size**: 450 lines
- **Purpose**: "Compatibility Layer" - Provides unified interface matching old API
- **Status**: NOT USED anywhere in components
- **Evidence**: Only referenced in:
  - UnifiedBackendService.js (itself)
  - index.js (export)
- **Components use**: Direct domain-driven services (e.g., `OrbitSecurityService`)

#### 5. Export statement - daopad_frontend/src/services/backend/index.js:26-27
```javascript
// Unified service for backward compatibility
export { UnifiedBackendService } from './UnifiedBackendService';
```

### .did File References
- Line 746: `approve_transfer_request`
- Line 815-816: `get_orbit_request` with deprecation comment

## Implementation Plan (Pseudocode)

### Step 1: Remove Backend Deprecated Functions

#### File: `daopad_backend/src/api/orbit_requests.rs`
```rust
// ACTION: DELETE lines 701-708 (get_orbit_request function)
// ACTION: DELETE line 29 (old hash mapping for compatibility)

// BEFORE (line 28-30):
479410653 => "Failed".to_string(), // CORRECTED: This is the actual Failed hash
1569634545 => "Failed".to_string(), // Keep old mapping for compatibility
1598796536 => "Scheduled".to_string(),

// AFTER:
479410653 => "Failed".to_string(),
1598796536 => "Scheduled".to_string(),
```

#### File: `daopad_backend/src/api/orbit.rs`
```rust
// ACTION: DELETE lines 273-286 (approve_transfer_request function)
```

### Step 2: Remove Frontend Backwards-Compatibility Layer

#### File: `daopad_frontend/src/services/backend/UnifiedBackendService.js`
```javascript
// ACTION: DELETE entire file (450 lines)
```

#### File: `daopad_frontend/src/services/backend/index.js`
```javascript
// ACTION: DELETE lines 26-27
// BEFORE:
// Unified service for backward compatibility
export { UnifiedBackendService } from './UnifiedBackendService';

// AFTER: (nothing - just remove these 2 lines)
```

### Step 3: Regenerate Candid Interface

```bash
# After removing Rust functions, regenerate .did file
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# This will automatically remove:
# - approve_transfer_request : (text, principal) -> (Result_1);
# - get_orbit_request : (principal, text) -> (Result);
# And their associated comments
```

### Step 4: Verify No Usage (Safety Check)

```bash
# Verify no components import UnifiedBackendService
grep -r "UnifiedBackendService" daopad_frontend/src/components --include="*.jsx" --include="*.js"
# Expected: No results

# Verify no frontend calls to deprecated backend methods
grep -r "approve_transfer_request\|get_orbit_request" daopad_frontend/src --include="*.jsx" --include="*.js"
# Expected: No results
```

### Step 5: Test Build

```bash
# Backend
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
# Expected: Success

# Frontend
cd daopad_frontend && npm run build
# Expected: Success
```

## Expected Results

### Files Modified
1. `daopad_backend/src/api/orbit_requests.rs` - DELETE 9 lines (701-708 + line 29)
2. `daopad_backend/src/api/orbit.rs` - DELETE 14 lines (273-286)
3. `daopad_frontend/src/services/backend/UnifiedBackendService.js` - DELETE entire file
4. `daopad_frontend/src/services/backend/index.js` - DELETE 2 lines (26-27)
5. `daopad_backend/daopad_backend.did` - Auto-regenerated (removes 2 method signatures)

### Total Lines Removed
- Backend: ~23 lines
- Frontend: ~452 lines
- **Total: ~475 lines of dead code removed**

### Build Verification
- ✅ Backend compiles without errors
- ✅ Candid file regenerates cleanly
- ✅ Frontend builds without errors
- ✅ No broken imports

## Testing Strategy

### Pre-deployment Checks
```bash
# 1. Verify Rust compilation
cd /home/theseus/alexandria/daopad-deprecation-cleanup/src/daopad
cargo build --target wasm32-unknown-unknown --release -p daopad_backend

# 2. Verify Candid extraction
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# 3. Verify frontend build
cd daopad_frontend
npm run build
```

### Post-deployment Verification (on mainnet)
```bash
# 1. Verify backend deployed
dfx canister --network ic call daopad_backend health_check

# 2. Verify deprecated methods are gone
dfx canister --network ic call daopad_backend get_orbit_request '(principal "...", "test")'
# Expected: Method not found error (not our error message)

dfx canister --network ic call daopad_backend approve_transfer_request '("test", principal "...")'
# Expected: Method not found error (not our error message)

# 3. Verify working methods still work
dfx canister --network ic call daopad_backend list_orbit_requests '(...)'
# Expected: Success
```

## Risk Assessment

### Low Risk ✅
- Functions already return errors (non-functional)
- UnifiedBackendService not used in any components
- No data stored in these functions
- Product not live yet

### Safety Nets
1. All changes in isolated worktree
2. Build verification before deploy
3. Mainnet testing after deploy
4. Can revert via git if needed

## Success Criteria

- [ ] All deprecated functions removed from backend
- [ ] UnifiedBackendService.js deleted
- [ ] Candid file regenerated without deprecated methods
- [ ] Backend builds and deploys successfully
- [ ] Frontend builds and deploys successfully
- [ ] No broken imports or references
- [ ] Health check passes on mainnet
- [ ] PR created and approved
