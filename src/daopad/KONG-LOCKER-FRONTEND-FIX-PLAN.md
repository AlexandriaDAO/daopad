# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-kong-locker-fix/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-kong-locker-fix/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes only:
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Fix]: Kong Locker frontend integration method naming"
   git push -u origin feature/fix-kong-locker-declarations
   gh pr create --title "[Fix]: Kong Locker Frontend Integration" --body "Implements KONG-LOCKER-FRONTEND-FIX-PLAN.md

Fixes method naming mismatches in Kong Locker service calls that were causing 'is not a function' errors on page load."
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

**Branch:** `feature/fix-kong-locker-declarations`
**Worktree:** `/home/theseus/alexandria/daopad-kong-locker-fix/src/daopad`

---

# Implementation Plan: Fix Kong Locker Frontend Integration

## Problem Statement

The DAOPad frontend is experiencing runtime errors when loading the Kong Locker integration:

```
Error checking for lock canister: TypeError: (new (intermediate value)(...)).getMyLockCanister is not a function
Error loading tokens and powers: TypeError: j.getMyLockedTokens is not a function
```

**Root Cause**: Frontend code is calling methods with incorrect names that don't exist in the service classes. This is NOT a declaration sync bug - it's a method naming mismatch bug.

## Current State

### Service Architecture (daopad_frontend/src/services/backend/)

**KongLockerService.ts** (methods that exist):
- `getMyCanister()` - Get user's Kong Locker canister
- `register(principal)` - Register Kong Locker
- `unregister()` - Unregister
- `getVotingPower(tokenId)` - Get voting power
- `getPositions()` - Get LP positions (NO PARAMETERS)
- `getFactoryPrincipal()` - Get factory

**TokenService.ts** (methods that exist):
- `getStationForToken(tokenId)` - Get Orbit station
- `listAllStations()` - List all stations
- `getMyLockedTokens()` - Get locked tokens from Kong Locker ✅
- `proposeStationLink(tokenId, stationId)` - Propose link
- `getKongLockerFactory()` - Get factory

**ProposalService.ts** (methods that exist):
- `createProposal()`, `vote()`, `getProposal()`, `listActive()`, etc.
- ❌ Does NOT have `getMyLockedTokens()`
- ❌ Does NOT have `getMyKongLockerCanister()`

### Files With Bugs

#### Bug #1: KongLockerSetup.tsx:39
```typescript
// CURRENT (WRONG):
const kongLockerService = new KongLockerService(identity);
const result = await kongLockerService.getMyLockCanister();  // ❌ Wrong method name

// CORRECT:
const result = await kongLockerService.getMyCanister();  // ✅ Exists
```

#### Bug #2: TokenTabs.tsx:38-42
```typescript
// CURRENT (WRONG):
const daopadService = getProposalService(identity);  // ❌ Wrong service
const tokensResult = await daopadService.getMyLockedTokens();  // ❌ Doesn't exist

// CORRECT:
import { getTokenService } from '../services/backend';
const tokenService = getTokenService(identity);  // ✅ Correct service
const tokensResult = await tokenService.getMyLockedTokens();  // ✅ Exists
```

#### Bug #3: TokenTabs.tsx:57-60
```typescript
// CURRENT (WRONG):
const canisterResult = await daopadService.getMyKongLockerCanister();  // ❌ Wrong service

// CORRECT:
const kongLockerService = new KongLockerService(identity);
const canisterResult = await kongLockerService.getMyCanister();  // ✅ Exists
```

#### Bug #4: TokenTabs.tsx:66
```typescript
// CURRENT (WRONG):
const positionsResult = await kongLockerService.getLPPositions(lockCanisterPrincipal);  // ❌ Wrong method name + params

// CORRECT:
const positionsResult = await kongLockerService.getPositions();  // ✅ Exists (no params)
```

**NOTE**: The backend `get_my_kong_locker_positions` queries Kong Locker using the stored canister principal from registration. The frontend doesn't need to pass it.

## Implementation

### Step 1: Fix KongLockerSetup.tsx

**File**: `daopad_frontend/src/components/KongLockerSetup.tsx`

```typescript
// CHANGE line 39:
// FROM:
const result = await kongLockerService.getMyLockCanister();

// TO:
const result = await kongLockerService.getMyCanister();
```

### Step 2: Fix TokenTabs.tsx Service Imports

**File**: `daopad_frontend/src/components/TokenTabs.tsx`

```typescript
// CHANGE line 4 (imports):
// FROM:
import { getProposalService } from '../services/backend';

// TO:
import { getProposalService, getTokenService } from '../services/backend';
```

### Step 3: Fix TokenTabs.tsx loadTokensAndPowers()

**File**: `daopad_frontend/src/components/TokenTabs.tsx`

```typescript
// CHANGE lines 38-66:
const loadTokensAndPowers = async (): Promise<void> => {
  if (!identity) return;

  setLoading(true);
  setError('');

  try {
    // Use TokenService for token operations
    const tokenService = getTokenService(identity);
    const kongLockerService = new KongLockerService(identity);

    // Get user's locked tokens (FROM TokenService)
    const tokensResult = await tokenService.getMyLockedTokens();
    if (!tokensResult.success) {
      setError(tokensResult.error || 'Failed to load tokens');
      return;
    }

    const lockedTokens = tokensResult.data || [];
    if (lockedTokens.length === 0) {
      setError('No locked tokens found. Please lock some LP tokens in Kong Locker first.');
      return;
    }

    // Get user's Kong Locker canister (FROM KongLockerService)
    const canisterResult = await kongLockerService.getMyCanister();
    if (!canisterResult.success || !canisterResult.data) {
      setError('Kong Locker canister not found');
      return;
    }

    const lockCanisterPrincipal = canisterResult.data.toString();

    // Get LP positions (FROM KongLockerService, no params)
    const positionsResult = await kongLockerService.getPositions();
    if (positionsResult.success) {
      const positions = positionsResult.data || [];
      setUserLPPositions(positions);

      // Calculate voting power per token
      const votingPowers: Record<string, VotingPower[]> = {};
      lockedTokens.forEach((token: Token) => {
        const tokenPositions = positions.filter(pos =>
          pos.address_0 === token.canister_id || pos.address_1 === token.canister_id
        );

        const totalUsdValue = tokenPositions.reduce((sum, pos) => {
          return sum + (pos.usd_balance || 0);
        }, 0);

        votingPowers[token.canister_id] = Math.floor(totalUsdValue * 100);
      });

      setTokenVotingPowers(votingPowers);

      // Sort tokens by voting power
      const sortedTokens = [...lockedTokens].sort((a, b) => {
        const powerA = votingPowers[a.canister_id] || 0;
        const powerB = votingPowers[b.canister_id] || 0;
        return powerB - powerA;
      });

      setTokens(sortedTokens);
    } else {
      // If couldn't get voting powers, just set tokens as is
      setTokens(lockedTokens);
    }

  } catch (err) {
    console.error('Error loading tokens and powers:', err);
    setError('Failed to load token information');
  } finally {
    setLoading(false);
  }
};
```

### Step 4: Fix KongLockerService.ts Import in TokenTabs.tsx

**File**: `daopad_frontend/src/components/TokenTabs.tsx`

```typescript
// VERIFY line 5 has this import (should already exist):
import { KongLockerService } from '../services/backend';
```

## Testing Requirements

### Pre-Deploy Testing
```bash
# 1. Build frontend
cd /home/theseus/alexandria/daopad-kong-locker-fix/src/daopad
npm run build

# 2. Check for TypeScript errors
# Build will fail if method calls are still wrong
```

### Post-Deploy Testing
```bash
# 1. Deploy frontend
./deploy.sh --network ic --frontend-only

# 2. Test in browser at https://daopad.org
# - Login with Internet Identity
# - Check browser console - should see no "is not a function" errors
# - Verify Kong Locker detection works
# - Verify token list loads correctly
```

### Expected Console Output (Success)
```
Production mode. Debug tools disabled for security.
DFX_NETWORK: undefined
Internet Identity URL: https://identity.internetcomputer.org
Creating balance service with host: https://icp0.io isLocal: false
Fetching ICP balance for principal: [user-principal]
ICP balance received: [amount]
```

### Error Indicators (If Still Broken)
```
❌ TypeError: ...is not a function
❌ Error checking for lock canister
❌ Error loading tokens and powers
```

## Files Changed

1. `daopad_frontend/src/components/KongLockerSetup.tsx` - Fix method name
2. `daopad_frontend/src/components/TokenTabs.tsx` - Fix service usage and method names

## Validation Checklist

- [ ] KongLockerSetup.tsx calls `getMyCanister()` not `getMyLockCanister()`
- [ ] TokenTabs.tsx uses `getTokenService()` for token operations
- [ ] TokenTabs.tsx uses `KongLockerService` for Kong Locker operations
- [ ] TokenTabs.tsx calls `getPositions()` without parameters
- [ ] Frontend builds without errors
- [ ] Browser console shows no "is not a function" errors
- [ ] Kong Locker detection works on page load
- [ ] Token list loads correctly

## Why This Happened

The frontend code was written before the service layer was finalized. Method names were changed during refactoring but the component code wasn't updated to match. This is a simple naming mismatch, not a declaration sync issue.

**Prevention**: Add TypeScript strict checking to catch these at build time, not runtime.
