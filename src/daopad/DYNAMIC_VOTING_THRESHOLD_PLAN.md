# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-dynamic-voting-threshold/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-dynamic-voting-threshold/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Backend changes:
     ```bash
     cargo build --target wasm32-unknown-unknown --release -p admin
     candid-extractor target/wasm32-unknown-unknown/release/admin.wasm > admin/admin.did
     ./deploy.sh --network ic --backend-only
     ```
   - Frontend (if needed - currently no frontend changes):
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "Fix: Calculate dynamic voting threshold from actual Kong Locker VP"
   git push -u origin feature/dynamic-voting-threshold
   gh pr create --title "Fix: Dynamic Voting Power Threshold Based on Actual VP" --body "Implements DYNAMIC_VOTING_THRESHOLD_PLAN.md

## Problem
Voting percentages displayed incorrect values:
- Required: 50,000,000 (50%) shown for threshold
- But only ~2-3 million VP exists in Kong Locker
- Hardcoded 100M total VP caused misleading percentages

## Solution
- Calculate actual total VP from Kong Locker
- Query all lock canisters via factory
- Sum voting power across all users
- Display accurate percentages

## Changes
- Added \`calculate_total_voting_power_for_token\` to admin canister
- Replaced hardcoded 100M VP with dynamic calculation
- Voting thresholds now reflect reality

## Testing
- Manual verification on mainnet
- Check Activity tab shows accurate percentages
"
   ```
5. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view --json comments`
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

**Branch:** `feature/dynamic-voting-threshold`
**Worktree:** `/home/theseus/alexandria/daopad-dynamic-voting-threshold/src/daopad`

---

# Implementation Plan

## Current State

### Problem Description
Voting power percentages are calculated against a hardcoded 100 million total VP, but Kong Locker only has ~2-3 million actual VP. This causes misleading percentage displays:

**Current Display:**
```
Yes: 1,126,843 (1.1%)
No: 0 (0.0%)
Required: 50,000,000 (50%)
```

**Expected Display (with ~2M total VP):**
```
Yes: 1,126,843 (56.3%)
No: 0 (0.0%)
Required: 1,000,000 (50%)
```

### Root Cause
**File:** `admin/src/proposals/unified.rs:289`
```rust
let total_voting_power = 100_000_000u64; // 100M VP = realistic threshold for large DAOs
```

This hardcoded value is used when creating proposals for Orbit requests. The frontend's VoteProgressBar component correctly calculates percentages from `total_voting_power`, but the input is wrong.

### Current Architecture

**Backend (daopad_backend):**
- Has `get_total_voting_power_for_token` in `proposals/orbit_link.rs:317-349`
- Relies on `KONG_LOCKER_PRINCIPALS` registration system
- Iterates registered users and sums their voting power

**Admin Canister:**
- Has `get_user_voting_power_for_token` in `kong_locker/voting.rs:21-80`
- Queries Kong Locker factory directly: `get_all_lock_canisters()`
- Does NOT have total VP calculation function
- Hardcodes 100M in `proposals/unified.rs:289`

**Frontend:**
- `VoteProgressBar.tsx:4-69` calculates percentages correctly:
  ```javascript
  const totalVP = Number(proposal.total_voting_power || 0);
  const requiredVotes = (totalVP * threshold) / 100;
  const yesPercent = totalVP > 0 ? (yesVotes / totalVP) * 100 : 0;
  ```
- No changes needed - it uses whatever `total_voting_power` the backend provides

### Kong Locker Integration Points

**Kong Locker Factory:** `eazgb-giaaa-aaaap-qqc2q-cai`
- Method: `get_all_lock_canisters() -> Vec<(Principal, Principal)>` (user, canister)

**KongSwap:** `2ipq2-uqaaa-aaaar-qailq-cai`
- Method: `user_balances(locker: Text) -> Result<Vec<UserBalancesReply>, String>`
- Returns LP positions with USD values
- Voting Power = USD value × 100

## Implementation

### 1. Add Total VP Calculation to Admin Canister

**File:** `admin/src/kong_locker/voting.rs` (MODIFY - add new function)

```rust
// PSEUDOCODE - Add after existing get_user_voting_power_for_token function

/// Calculate total voting power for a token across ALL Kong Locker users
/// Queries Kong Locker factory to get all lock canisters, then sums their voting power
pub async fn calculate_total_voting_power_for_token(
    token_canister_id: Principal
) -> Result<u64, String> {
    // Step 1: Query Kong Locker factory for ALL lock canisters
    let kong_locker_factory = Principal::from_text("eazgb-giaaa-aaaap-qqc2q-cai")
        .map_err(|e| format!("Invalid Kong Locker factory ID: {}", e))?;

    let all_lock_canisters: Result<(Vec<(Principal, Principal)>,), _> =
        call(kong_locker_factory, "get_all_lock_canisters", ()).await;

    let lock_canisters = all_lock_canisters
        .map_err(|e| format!("Failed to query Kong Locker factory: {:?}", e))?
        .0;

    // Step 2: Sum voting power across all lock canisters
    let mut total_power = 0u64;
    let kongswap_id = Principal::from_text("2ipq2-uqaaa-aaaar-qailq-cai")
        .map_err(|e| format!("Invalid KongSwap ID: {}", e))?;

    for (_user, lock_canister) in lock_canisters {
        // Query KongSwap for this lock canister's LP positions
        let user_balances_result: Result<
            (Result<Vec<UserBalancesReply>, String>,),
            (ic_cdk::api::call::RejectionCode, String),
        > = call(
            kongswap_id,
            "user_balances",
            (lock_canister.to_string(),),
        )
        .await;

        // If call fails or returns error, skip this user
        let user_balances = match user_balances_result {
            Ok((Ok(balances),)) => balances,
            _ => continue,
        };

        // Calculate voting power for this specific token
        let token_id_str = token_canister_id.to_string();
        let user_vp: f64 = user_balances
            .iter()
            .filter_map(|balance| {
                let UserBalancesReply::LP(lp_reply) = balance;
                if lp_reply.address_0 == token_id_str || lp_reply.address_1 == token_id_str {
                    Some(lp_reply.usd_balance)
                } else {
                    None
                }
            })
            .sum();

        total_power += (user_vp * 100.0) as u64;
    }

    // Return total even if zero - proposals with 0 VP will fail voting naturally
    Ok(total_power)
}
```

### 2. Use Dynamic Calculation in Proposal Creation

**File:** `admin/src/proposals/unified.rs` (MODIFY)

**Change at line 289:**
```rust
// BEFORE (line 286-289):
    // Use a realistic default total VP based on Kong Locker's scale
    // Kong Locker VP = USD value * 100, so 1M VP = $10k locked
    // Set high enough that single votes don't auto-execute
    let total_voting_power = 100_000_000u64; // 100M VP = realistic threshold for large DAOs

// AFTER:
    // Calculate actual total voting power from Kong Locker
    use crate::kong_locker::voting::calculate_total_voting_power_for_token;

    let total_voting_power = calculate_total_voting_power_for_token(token_id)
        .await
        .unwrap_or(1_000_000u64); // Fallback to 1M if calculation fails
```

**Add import at top of file (around line 4):**
```rust
// BEFORE:
use crate::kong_locker::voting::get_user_voting_power_for_token;

// AFTER:
use crate::kong_locker::voting::{get_user_voting_power_for_token, calculate_total_voting_power_for_token};
```

## Testing

### Manual Testing on Mainnet

**1. Test Kong Locker Query:**
```bash
# Query Kong Locker factory to see total lock canisters
dfx canister --network ic call eazgb-giaaa-aaaap-qqc2q-cai get_all_lock_canisters

# Expected: Vec of (user_principal, lock_canister_principal) tuples
# Should return 2-3 entries currently
```

**2. Test KongSwap Balance Query:**
```bash
# Pick a lock canister from above and query its balances
dfx canister --network ic call 2ipq2-uqaaa-aaaar-qailq-cai user_balances '("<lock_canister_principal>")'

# Expected: LP positions with usd_balance values
# Voting power = sum of usd_balance * 100 for positions containing ALEX token
```

**3. Deploy Admin Canister:**
```bash
cd /home/theseus/alexandria/daopad-dynamic-voting-threshold/src/daopad
cargo build --target wasm32-unknown-unknown --release -p admin
candid-extractor target/wasm32-unknown-unknown/release/admin.wasm > admin/admin.did
./deploy.sh --network ic --backend-only
```

**4. Test Total VP Calculation (if exposed as query method):**
```bash
# If calculate_total_voting_power_for_token is made public for testing:
dfx canister --network ic call odkrm-viaaa-aaaap-qp2oq-cai calculate_total_voting_power_for_token '(principal "l7rlj-6aaaa-aaaaa-qaffq-cai")'

# Expected: Nat64 value around 2-3 million
```

**5. Create Test Proposal and Verify Percentages:**
```bash
# Navigate to Activity tab at https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
# Create a new proposal (or wait for existing one)
# Check that:
# - Total voting power shown reflects actual Kong Locker VP
# - Percentages are meaningful (not tiny 1.1% for majority votes)
# - Required threshold is 50% of ACTUAL total, not 50% of 100M
```

### Expected Results

**Before Fix:**
- Total VP: 100,000,000 (hardcoded)
- 1M yes votes = 1%
- Required: 50,000,000 (50%)
- Misleading - appears to need 49M more votes

**After Fix (assuming ~2M total VP exists):**
- Total VP: ~2,000,000 (calculated)
- 1M yes votes = 50%
- Required: 1,000,000 (50%)
- Accurate - proposal passes at threshold

### Frontend Verification

No frontend changes needed, but verify display after backend deploy:

**Component:** `daopad_frontend/src/components/orbit/requests/VoteProgressBar.tsx`
- Should automatically show correct percentages
- `proposal.total_voting_power` will have new value from backend

**Check console for errors:**
```javascript
// In browser console on Activity tab
console.log('Proposals:', proposals);
// Verify total_voting_power field has realistic values (2-3M, not 100M)
```

## Rollout Plan

1. **Build & Deploy Admin Canister** (backend-only, no frontend changes)
2. **Monitor existing proposals** - percentages should update on next fetch
3. **Create test proposal** - verify accurate voting thresholds
4. **If calculation fails** - fallback to 1M (still better than 100M)
5. **Success criteria**: Voting percentages reflect reality

## Risk Assessment

**Low Risk:**
- Only changes admin canister voting power calculation
- Frontend unchanged - just receives different data
- Fallback value (1M) ensures proposals don't break
- Kong Locker query is read-only, no state changes

**Edge Cases Handled:**
- Kong Locker query fails → fallback to 1M VP
- User has no LP positions → skip, continue summing
- Zero total VP → returns 0, proposal voting continues (just needs any vote to pass)

## Success Criteria

- [ ] Admin canister builds successfully
- [ ] Deployment succeeds on IC mainnet
- [ ] Activity tab loads without errors
- [ ] Voting percentages show meaningful values (>1% for active voters)
- [ ] Required threshold matches 50% of actual total VP
- [ ] No console errors in frontend

## Plan Checklist

- [x] Worktree created first
- [x] Orchestrator header EMBEDDED at top of plan
- [x] Current state documented with file paths and line numbers
- [x] Implementation in pseudocode
- [x] Testing strategy defined (manual mainnet testing)
- [ ] Plan committed to feature branch
- [ ] Handoff command provided with PR creation reminder
