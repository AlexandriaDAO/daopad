# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-admin-migration/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-admin-migration/src/daopad`
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
   git commit -m "Complete admin canister voting migration"
   git push -u origin feature/complete-admin-migration
   gh pr create --title "Complete Admin Canister Voting Migration" --body "Implements ADMIN_MIGRATION_PLAN.md"
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

**Branch:** `feature/complete-admin-migration`
**Worktree:** `/home/theseus/alexandria/daopad-admin-migration/src/daopad`

---

# Implementation Plan

## Current State Documentation

### Architecture Overview
- **Backend** (`lwsav-iiaaa-aaaap-qp2qq-cai`): Currently handles BOTH request creation AND voting (violates separation of duties)
- **Admin** (`odkrm-viaaa-aaaap-qp2oq-cai`): Deployed with voting capability but NOT integrated
- **Frontend**: Calls backend for ALL voting operations

### Files That Need Changes
1. `daopad_frontend/src/hooks/useVoting.ts:50` - Switch from ProposalService to AdminService
2. `daopad_frontend/src/services/backend/proposals/ProposalService.ts:183-209` - Proxy to admin
3. `daopad_frontend/src/components/orbit/requests/RequestDialog.tsx:159-204` - Update vote handler
4. `daopad_frontend/src/services/backend/index.ts` - Export AdminService

### Critical Migration Issues
1. **Duplicate Storage**: Both canisters have UNIFIED_PROPOSALS storage - need sync strategy
2. **Kong Locker Registration**: Admin needs explicit registration vs backend's direct query
3. **Declaration Sync Bug**: Frontend uses stale declarations after backend changes

## Implementation Steps

### Step 1: Backend Proxy Layer (daopad_backend/src/proposals/unified.rs)

**File**: `daopad_backend/src/proposals/unified.rs` (MODIFY)

```rust
// PSEUDOCODE - Add at top of file
use crate::orbit::ADMIN_CANISTER_ID;

// PSEUDOCODE - Modify vote_on_proposal (line 238)
#[update]
async fn vote_on_proposal(
    request_id: String,
    vote: VoteChoice,
) -> Result<VoteResult, String> {
    // Step 1: Get caller and voting power
    let caller = ic_cdk::caller();
    let voting_power = get_caller_voting_power(caller).await?;

    // Step 2: Ensure proposal exists in backend (for backwards compat)
    ensure_proposal_for_request(request_id.clone()).await?;

    // Step 3: Forward to admin canister
    let admin_id = Principal::from_text(ADMIN_CANISTER_ID)?;

    // Step 4: Register user with admin if needed
    let kong_lockers = get_user_kong_lockers(caller).await?;
    for locker in kong_lockers {
        let _: Result<(), _> = ic_cdk::call(
            admin_id,
            "register_kong_locker",
            (caller, locker)
        ).await;
    }

    // Step 5: Forward vote to admin
    let result: Result<(VoteResult,), _> = ic_cdk::call(
        admin_id,
        "vote_on_proposal",
        (request_id, vote)
    ).await;

    // Step 6: Return admin's result
    match result {
        Ok((vote_result,)) => Ok(vote_result),
        Err(err) => Err(format!("Admin voting failed: {:?}", err))
    }
}

// PSEUDOCODE - Modify create_orbit_request_with_proposal (line 467)
#[update]
async fn create_orbit_request_with_proposal(
    station_id: Principal,
    operation: OrbitOperationType,
    request: CreateRequestInput,
) -> Result<String, String> {
    // Step 1: Create request in Orbit Station
    let request_id = create_orbit_request(station_id, request).await?;

    // Step 2: Create proposal in admin canister
    let admin_id = Principal::from_text(ADMIN_CANISTER_ID)?;
    let _: Result<(), _> = ic_cdk::call(
        admin_id,
        "create_proposal",
        (request_id.clone(), operation)
    ).await;

    // Step 3: Create local proposal for backwards compat
    store_unified_proposal(request_id.clone(), operation);

    Ok(request_id)
}
```

### Step 2: Frontend Service Updates

**File**: `daopad_frontend/src/services/backend/index.ts` (MODIFY)

```javascript
// PSEUDOCODE
export { default as ProposalService } from './proposals/ProposalService';
export { default as AdminService } from '../admin/AdminService'; // ADD THIS LINE
export { default as OrbitService } from './orbit/OrbitService';
// ... other exports
```

**File**: `daopad_frontend/src/hooks/useVoting.ts` (MODIFY)

```javascript
// PSEUDOCODE - Line 1-10
import { ProposalService, AdminService } from '@/services/backend';

// PSEUDOCODE - Line 50 (inside handleVote function)
const handleVote = async (vote: 'Yes' | 'No') => {
    try {
        setIsVoting(true);

        // OLD: await ProposalService.voteOnOrbitRequest(requestId, vote);
        // NEW: Try admin first, fallback to backend
        try {
            await AdminService.voteOnProposal(requestId, vote);
        } catch (adminError) {
            console.warn('Admin vote failed, trying backend:', adminError);
            await ProposalService.voteOnOrbitRequest(requestId, vote);
        }

        toast.success(`Vote cast successfully: ${vote}`);
        await refetch();
    } catch (error) {
        toast.error(`Failed to cast vote: ${error.message}`);
    } finally {
        setIsVoting(false);
    }
};
```

**File**: `daopad_frontend/src/services/backend/proposals/ProposalService.ts` (MODIFY)

```javascript
// PSEUDOCODE - Line 183-209
async voteOnOrbitRequest(requestId: string, vote: 'Yes' | 'No'): Promise<void> {
    try {
        // Try admin canister first (migration path)
        const adminActor = await AdminService.getActor();
        const voteChoice = vote === 'Yes' ? { Yes: null } : { No: null };
        await adminActor.vote_on_proposal(requestId, voteChoice);
    } catch (adminError) {
        // Fallback to backend (backwards compatibility)
        console.warn('Admin vote failed, using backend fallback:', adminError);
        const actor = await this.getActor();
        const voteChoice = vote === 'Yes' ? { Yes: null } : { No: null };
        await actor.vote_on_proposal(requestId, voteChoice);
    }
}

// PSEUDOCODE - Add new method for proposal queries
async getProposalFromAdmin(requestId: string): Promise<UnifiedProposal | null> {
    try {
        const adminActor = await AdminService.getActor();
        const result = await adminActor.get_proposal(requestId);
        return result[0] || null;
    } catch (error) {
        // Fallback to backend
        return this.getProposal(requestId);
    }
}
```

### Step 3: Admin Service Integration

**File**: `daopad_frontend/src/services/admin/AdminService.ts` (VERIFY/MODIFY)

```javascript
// PSEUDOCODE - Ensure these methods exist
class AdminService {
    private actor: any = null;

    async getActor() {
        if (!this.actor) {
            const identity = await AuthService.getIdentity();
            const agent = new HttpAgent({ identity, host: IC_HOST });
            this.actor = Actor.createActor(adminIdlFactory, {
                agent,
                canisterId: ADMIN_CANISTER_ID
            });
        }
        return this.actor;
    }

    async voteOnProposal(requestId: string, vote: 'Yes' | 'No') {
        const actor = await this.getActor();
        const voteChoice = vote === 'Yes' ? { Yes: null } : { No: null };
        const result = await actor.vote_on_proposal(requestId, voteChoice);

        // Handle admin's error format
        if (result && result.Err) {
            throw new Error(result.Err);
        }
        return result;
    }

    async getProposal(requestId: string) {
        const actor = await this.getActor();
        const result = await actor.get_proposal(requestId);
        return result[0] || null;
    }

    async listProposals(filters?: ProposalFilters) {
        const actor = await this.getActor();
        return actor.list_unified_proposals(filters);
    }
}

export default new AdminService();
```

### Step 4: Request Dialog Update

**File**: `daopad_frontend/src/components/orbit/requests/RequestDialog.tsx` (MODIFY)

```javascript
// PSEUDOCODE - Line 159-204
const handleVote = async (vote: 'Yes' | 'No') => {
    try {
        setIsVoting(true);

        // Use admin service with backend fallback
        try {
            await AdminService.voteOnProposal(request.id, vote);
            toast.success(`Vote cast successfully: ${vote}`);
        } catch (adminError) {
            console.warn('Admin voting failed, trying backend:', adminError);
            await ProposalService.voteOnOrbitRequest(request.id, vote);
            toast.success(`Vote cast via backend: ${vote}`);
        }

        // Refresh proposal data
        await refetchProposal();
        onVoteSuccess?.();
    } catch (error) {
        console.error('Vote failed:', error);
        toast.error(`Failed to cast vote: ${error.message}`);
    } finally {
        setIsVoting(false);
    }
};
```

## Testing Requirements

### Backend Testing
```bash
# Test proxy voting works
dfx canister --network ic call daopad_backend vote_on_proposal '("request-id", variant { Yes })'

# Test proposal creation with admin sync
dfx canister --network ic call daopad_backend create_orbit_request_with_proposal '(...)'

# Verify admin received the proposal
dfx canister --network ic call odkrm-viaaa-aaaap-qp2oq-cai get_proposal '("request-id")'
```

### Frontend Testing (MANDATORY)

**See**: `PLAYWRIGHT_TESTING_GUIDE_CONDENSED.md` section "For Plan Writers"

#### Manual Browser Verification Workflow (BEFORE Playwright)
```bash
# 1. Deploy changes
cd /home/theseus/alexandria/daopad-admin-migration/src/daopad
./deploy.sh --network ic

# 2. Open browser console
# Navigate to: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
# Open DevTools Console (F12)

# 3. Test voting flow manually
# - Create a proposal
# - Cast a vote
# - Check console for errors
# - Verify vote registered in admin canister

# 4. Console error inspection
# Look for:
# - "Admin vote failed" warnings (expected during migration)
# - "TypeError: actor.vote_on_proposal is not a function" (declaration sync issue)
# - Network errors or timeouts
```

#### Exit Criteria
- No console errors after voting
- Vote appears in admin canister query
- Proposal status updates correctly
- No duplicate votes in backend/admin

#### Test File Template
```javascript
// e2e/admin-migration.spec.ts
import { test, expect } from '@playwright/test';
import { createDataVerifier } from './utils';

test.describe('Admin Voting Migration', () => {
    const verifier = createDataVerifier();

    test('should vote via admin canister', async ({ page }) => {
        // Navigate to proposals
        await page.goto('/proposals');

        // Find and click vote button
        await page.click('[data-testid="vote-yes"]');

        // Verify no console errors
        const errors = await verifier.getConsoleErrors(page);
        expect(errors).toHaveLength(0);

        // Verify vote registered
        await expect(page.locator('.vote-confirmation')).toBeVisible();
    });
});
```

#### Iteration Loop
```bash
for i in {1..5}; do
    # Run test
    npx playwright test e2e/admin-migration.spec.ts

    # Check for console errors
    if grep -q "TypeError.*is not a function" test-results/; then
        echo "Declaration sync needed"
        cp -r src/declarations/* daopad_frontend/src/declarations/
        ./deploy.sh --network ic --frontend-only
    fi

    # If tests pass, exit
    if [ $? -eq 0 ]; then
        echo "✅ Tests passed"
        break
    fi

    sleep 60
done
```

## Deployment Checklist

- [ ] Backend proxy layer implemented
- [ ] Frontend services updated to use admin
- [ ] RequestDialog vote handler updated
- [ ] Manual browser testing completed
- [ ] No console errors during voting
- [ ] Votes appear in admin canister
- [ ] Backend fallback works
- [ ] Declarations synced properly
- [ ] E2E tests passing

## Post-Deployment Verification

```bash
# 1. Check admin has votes
dfx canister --network ic call odkrm-viaaa-aaaap-qp2oq-cai list_unified_proposals '(null)'

# 2. Check backend still works (backwards compat)
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_unified_proposals '(null)'

# 3. Verify frontend uses admin
# Check browser DevTools Network tab for calls to admin canister

# 4. Test vote threshold crossing
# Cast enough votes to exceed threshold
# Verify Orbit Station request gets approved
```

## Rollback Plan

If migration fails:
1. Frontend automatically falls back to backend voting
2. No data loss - both canisters maintain state
3. Can revert frontend changes: `git revert HEAD && ./deploy.sh --network ic --frontend-only`

## Success Criteria

- ✅ All votes go through admin canister (check network tab)
- ✅ No console errors during voting
- ✅ Orbit requests get approved when threshold met
- ✅ Backwards compatibility maintained (backend fallback works)
- ✅ PR approved and merged