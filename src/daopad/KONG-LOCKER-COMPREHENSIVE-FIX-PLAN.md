# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-kong-comprehensive/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-kong-comprehensive/src/daopad`
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
   git commit -m "[Fix]: Comprehensive Kong Locker integration fixes"
   git push -u origin feature/fix-kong-comprehensive
   gh pr create --title "[Fix]: Comprehensive Kong Locker Integration" --body "Implements KONG-LOCKER-COMPREHENSIVE-FIX-PLAN.md"
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

**Branch:** `feature/fix-kong-comprehensive`
**Worktree:** `/home/theseus/alexandria/daopad-kong-comprehensive/src/daopad`

---

# Implementation Plan

## Current State Documentation

### Critical Errors Found:
1. **KongLockerService.ts:82** - Calls `get_my_kong_locker_positions()` which doesn't exist in backend
2. **TokenDashboard.tsx:150** - Uses undefined `daopadService` variable
3. **TokenDashboard.tsx:297** - BigInt to number conversion error
4. **TokenTabs.tsx** - Still uses wrong service methods

### Backend Available Methods (from daopad_backend.did):
- `get_my_kong_locker_canister : () -> (opt principal) query;`
- `get_my_locked_tokens : () -> (Result_17);`
- `get_my_voting_power_for_token : (principal) -> (Result_18);`
- NO position-related methods exist

## Implementation Steps

### 1. Fix KongLockerService.ts

**File:** `daopad_frontend/src/services/backend/kong-locker/KongLockerService.ts`

The `getPositions()` method is calling a non-existent backend method. We need to remove this or replace with actual Kong Locker canister calls.

```javascript
// PSEUDOCODE - Line 79-88
async getPositions() {
    try {
        // REMOVE the backend call - it doesn't exist
        // Instead, query Kong Locker canister directly
        const myCanister = await this.getMyCanister();
        if (!myCanister.success || !myCanister.data) {
            return { success: false, error: 'No lock canister' };
        }

        // Query the user's Kong Locker canister for positions
        const lockCanisterActor = await createKongLockActor(myCanister.data);
        const positions = await lockCanisterActor.get_lp_positions();
        return this.wrapResult(positions);
    } catch (error) {
        console.error('Failed to get positions:', error);
        return { success: false, error: error.message };
    }
}
```

### 2. Fix TokenDashboard.tsx - Undefined Service

**File:** `daopad_frontend/src/components/TokenDashboard.tsx`

Line 150 uses undefined `daopadService`. Need to define it or use correct service.

```javascript
// PSEUDOCODE - Add at top with other imports
import { getProposalService, getTokenService } from '../services/backend';

// Line 130-135 in loadTokenStatus function
const tokenService = getTokenService(identity);  // ADD THIS
const proposalService = getProposalService(identity); // ADD THIS

// Line 150 - Replace daopadService with proposalService
const proposalResult = await proposalService.getActiveProposalForToken(tokenPrincipal);
```

### 3. Fix TokenDashboard.tsx - BigInt Conversion

**File:** `daopad_frontend/src/components/TokenDashboard.tsx`

Line 297 tries to divide BigInt by number. Need to handle BigInt properly.

```javascript
// PSEUDOCODE - Line 297
const vpToUsd = (vp) => {
    // Handle BigInt voting power values
    const vpValue = typeof vp === 'bigint' ? Number(vp) : (vp || 0);
    return formatUsdValue(vpValue / VP_TO_USD_RATIO);
};
```

### 4. Fix Declaration Sync Issue

After any backend changes, MUST sync declarations:

```bash
# CRITICAL after backend changes
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
```

### 5. Create Kong Lock Actor Helper

**NEW FILE:** `daopad_frontend/src/services/backend/kong-locker/kongLockActor.ts`

```javascript
// PSEUDOCODE
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// Kong Lock canister interface
const idlFactory = ({ IDL }) => {
    const LPPosition = IDL.Record({
        address_0: IDL.Text,
        address_1: IDL.Text,
        usd_balance: IDL.Float64,
        // other fields
    });

    return IDL.Service({
        get_lp_positions: IDL.Func([], [IDL.Vec(LPPosition)], ['query']),
    });
};

export async function createKongLockActor(canisterId) {
    const agent = new HttpAgent({ host: 'https://icp0.io' });
    return Actor.createActor(idlFactory, { agent, canisterId });
}
```

## Testing Requirements

```bash
# Test backend methods exist
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai get_my_kong_locker_canister '()'
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai get_my_locked_tokens '()'

# Build and deploy
cd /home/theseus/alexandria/daopad-kong-comprehensive/src/daopad
npm run build
./deploy.sh --network ic --frontend-only

# Test frontend loads without errors
# - No "is not a function" errors
# - No undefined variable errors
# - No BigInt conversion errors
```

## Expected Results

When complete:
1. ✅ No console errors about missing functions
2. ✅ TokenDashboard loads without crashing
3. ✅ Kong Locker positions load (if user has lock canister)
4. ✅ Voting power displays correctly
5. ✅ Page renders without ErrorBoundary catching crashes

## Rollback Strategy

If deployment fails:
```bash
cd /home/theseus/alexandria/daopad
git checkout master
./deploy.sh --network ic --frontend-only
```

---

**REMEMBER**: You are autonomous. Implement this plan completely, create the PR, and iterate on feedback. NO questions allowed.