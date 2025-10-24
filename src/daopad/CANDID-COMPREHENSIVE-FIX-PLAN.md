# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-candid-comprehensive-fix/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - Must be in: `/home/theseus/alexandria/daopad-candid-comprehensive-fix/src/daopad`
2. **Read the COMPLETE PLAN below** - Understand ALL four fixes before starting
3. **Implement ALL fixes at once** - DO NOT test incrementally
4. **Build & Deploy**:
   ```bash
   cargo build --target wasm32-unknown-unknown --release -p daopad_backend
   candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
   echo "yes" | dfx deploy --network ic daopad_backend --argument '(opt "fec7w-zyaaa-aaaaa-qaffq-cai")'
   ```
5. **Browser Manual Testing** (CRITICAL - Do this BEFORE Playwright):
   - Open: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai
   - Test Dashboard tab → Check console for `getDaoOverview` errors
   - Test Activity tab → Check console for `list_orbit_requests` errors
   - Test Treasury tab → Check console for `get_treasury_accounts` errors
   - Test Settings tab → Check console for `get_orbit_system_info` errors
   - **IF ANY Candid errors**: STOP, revert ALL changes, report failure
   - **ONLY if console is clean**: Proceed to Playwright
6. **Run Playwright tests**:
   ```bash
   cd daopad_frontend
   npx playwright test
   # Expected: All 72 tests passing
   ```
7. **Create PR** (MANDATORY):
   ```bash
   cd ..
   git add .
   git commit -m "[Fix]: Comprehensive Candid Option<T> deserialization fix

- Replace futures::join! with sequential awaits in get_dao_overview
- Make ListRequestsSortBy required with default value
- Create minimal struct versions to avoid Option<enum> Candid bug
- Fix 4 backend methods: list_orbit_requests, get_orbit_system_info, get_treasury_accounts_with_balances, get_dao_overview

All 72 Playwright tests passing ✅"
   git push -u origin feature/candid-comprehensive-fix
   gh pr create --title "[Fix]: Comprehensive Candid Deserialization Fix" --body "## Summary

Fixes all Candid deserialization errors introduced by PR #115.

## Root Cause
Candid 0.10.18 cannot handle \`Option<T>\` where T is enum/struct/Vec<complex>.

## Fixes
1. **get_dao_overview**: Sequential awaits + AccountMinimal struct
2. **list_orbit_requests**: Make sort_by required + frontend update
3. **get_orbit_system_info**: SystemInfoMinimal struct
4. **get_treasury_accounts_with_balances**: Reuse AccountMinimal

## Test Results
- Browser console: Clean (no Candid errors)
- Playwright: 72/72 passing ✅

Implements: CANDID-COMPREHENSIVE-FIX-PLAN.md"
   ```
8. **Iterate autonomously** (IF tests fail):
   - FOR i=1 to 3:
     - Analyze Playwright output for failures
     - Check browser console for NEW Candid errors
     - IF new Candid errors: Revert, escalate (plan is wrong)
     - IF other errors: Fix, deploy, test browser console, continue
     - IF all pass: Report success, EXIT
   - After 3 iterations: Escalate to human

## CRITICAL RULES
- ❌ NO questions ("should I?", "want me to?")
- ❌ NO incremental fixes - ALL changes together
- ❌ NO skipping browser validation
- ❌ NO skipping PR creation
- ✅ Browser console MUST be clean before Playwright
- ✅ ONLY stop at: all tests passing, max iterations, or fatal error

**Branch:** `feature/candid-comprehensive-fix`
**Worktree:** `/home/theseus/alexandria/daopad-candid-comprehensive-fix/src/daopad`

---

# Comprehensive Candid Option<T> Deserialization Fix

## Problem Analysis

### Root Cause
Candid 0.10.18 cannot serialize/deserialize `Option<T>` where T is:
- An enum (e.g., `RequestStatusCode`, `ListRequestsSortBy`, `RequestPolicyRule`)
- A struct (e.g., `AccountBalance`, `DisasterRecovery`)
- A Vec of complex types (e.g., `Vec<RequestStatusCode>`)

### Why This Happened
PR #115 didn't change type definitions, but exposed latent bugs:
1. Types were defined with `Option<enum>` fields that Candid cannot handle
2. Previous deploys may have used different Candid versions
3. No integration tests validated Orbit Station responses

### Browser Console Errors (Production)
```
1. list_orbit_requests: Option<Vec<RequestStatusCode>>
   Location: daopad_backend/src/api/orbit_requests.rs

2. get_orbit_system_info: Option<DisasterRecovery>
   Location: daopad_backend/src/types/orbit.rs:479

3. get_treasury_accounts_with_balances: Option<RequestPolicyRule>
   Location: daopad_backend/src/types/orbit.rs:339-340

4. get_dao_overview: Option<AccountBalance> + Option<RequestPolicyRule>
   Location: daopad_backend/src/api/orbit_overview.rs
```

## Implementation Plan

### Fix 1: `get_dao_overview` - Use AccountMinimal

**Problem**: Account struct has `Option<RequestPolicyRule>` fields
**File**: `daopad_backend/src/api/orbit_overview.rs`
**Lines**: 17-30 (add new structs), 157-169 (update function)

**Step 1**: Add minimal structs (AFTER line 16)
```rust
// Minimal Account struct - avoids Option<enum> Candid bug
#[derive(CandidType, Deserialize, Debug, Clone)]
struct AccountMinimal {
    pub id: String,
    pub assets: Vec<AccountAssetMinimal>,  // Simplified asset type
    // REMOVED: addresses, name, metadata, transfer_request_policy, configs_request_policy, last_modification_timestamp
}

// Minimal AccountAsset - skips problematic Option<AccountBalance>
#[derive(CandidType, Deserialize, Debug, Clone)]
struct AccountAssetMinimal {
    pub asset_id: String,
    // REMOVED: balance (Option<AccountBalance>)
}

// Minimal ListAccountsResult
#[derive(CandidType, Deserialize, Debug)]
enum ListAccountsResultMinimal {
    Ok { accounts: Vec<AccountMinimal>, next_offset: Option<u64>, total: u64 },
    Err(String),
}
```

**Step 2**: Update `list_accounts_call` function (line ~157)
```rust
async fn list_accounts_call(station_id: Principal) -> Result<Vec<AccountMinimal>, String> {
    let input = ListAccountsInput {
        search_term: None,
        paginate: None,
    };

    let result: Result<(ListAccountsResultMinimal,), _> =
        ic_cdk::call(station_id, "list_accounts", (input,)).await;

    match result {
        Ok((ListAccountsResultMinimal::Ok { accounts, .. },)) => Ok(accounts),
        Ok((ListAccountsResultMinimal::Err(e),)) => {
            Err(format!("List accounts error: {:?}", e))
        }
        Err((code, msg)) => {
            Err(format!("IC call failed: ({:?}, {})", code, msg))
        }
    }
}
```

**Step 3**: Update `calculate_treasury_total` signature (line ~240)
```rust
fn calculate_treasury_total(
    accounts_result: &Result<Vec<AccountMinimal>, String>,  // Changed from Account
    assets_result: &Result<Vec<Asset>, String>
) -> (u64, u64) {
    let Ok(accounts) = accounts_result else {
        return (0, 0);
    };

    // Treasury balance calculation no longer uses account.assets.balance
    // Instead, use assets_result directly (which has balance data)
    let total_icp: u64 = assets_result
        .as_ref()
        .ok()
        .map(|assets| {
            assets.iter()
                .filter(|asset| asset.symbol == "ICP")
                .filter_map(|asset| {
                    asset.balance_e8s.parse::<u64>().ok()
                })
                .sum()
        })
        .unwrap_or(0);

    (total_icp, accounts.len() as u64)
}
```

**Step 4**: Replace futures::join! with sequential awaits (line ~59-67)
```rust
// BEFORE (❌ BROKEN - Causes "Call already trapped")
let accounts_future = list_accounts_call(station_id);
let users_future = list_users_call(station_id);
let system_info_future = system_info_call(station_id);
let assets_future = list_assets_call(station_id);

let (accounts_result, users_result, system_info_result, assets_result) =
    futures::join!(accounts_future, users_future, system_info_future, assets_future);

// AFTER (✅ WORKS - Sequential calls)
let accounts_result = list_accounts_call(station_id).await;
let users_result = list_users_call(station_id).await;
let system_info_result = system_info_call(station_id).await;
let assets_result = list_assets_call(station_id).await;
```

### Fix 2: `list_orbit_requests` - Make sort_by Required

**Problem**: `ListRequestsInput.sort_by: Option<ListRequestsSortBy>` causes Candid error
**Files**:
- `daopad_backend/src/api/orbit_requests.rs` (line 485)
- `daopad_frontend/src/services/backend/orbit/OrbitRequestsService.ts` (line 22)

**Backend Change**:
```rust
// BEFORE (❌ BROKEN)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ListRequestsInput {
    // ... other fields ...
    pub sort_by: Option<ListRequestsSortBy>,  // ❌ Option<enum>
    // ... other fields ...
}

// AFTER (✅ WORKS)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ListRequestsInput {
    // ... other fields ...
    pub sort_by: ListRequestsSortBy,  // ✅ Required field
    // ... other fields ...
}
```

**Frontend Change** (`OrbitRequestsService.ts`):
```typescript
// BEFORE (❌ BROKEN - sends null)
const orbitFilters = {
    // ... other fields ...
    sort_by: filters.sortBy || null,  // ❌ Sends null
    // ... other fields ...
};

// AFTER (✅ WORKS - always provides default)
const orbitFilters = {
    // ... other fields ...
    sort_by: filters.sortBy || { CreatedAt: { Desc: null } },  // ✅ Default sort
    // ... other fields ...
};
```

**ALSO UPDATE** all call sites in `daopad_backend/src/api/`:
- `orbit.rs` line ~305: `sort_by: ListRequestsSortBy::CreatedAt(SortByDirection::Desc),`
- `orbit_requests.rs` line ~709: `sort_by: ListRequestsSortBy::CreatedAt(SortByDirection::Desc),`

### Fix 3: `get_orbit_system_info` - Use SystemInfoMinimal

**Problem**: `SystemInfo.disaster_recovery: Option<DisasterRecovery>` causes Candid error
**File**: `daopad_backend/src/api/orbit_security.rs`
**Line**: ~339 (system_info_call function)

**Step 1**: Add minimal struct (top of file, after imports)
```rust
// Minimal SystemInfo - avoids Option<struct> Candid bug
#[derive(CandidType, Deserialize, Debug)]
struct SystemInfoMinimal {
    pub name: String,
    pub version: String,
    pub upgrader_id: Principal,
    pub cycles: u64,
    pub upgrader_cycles: Option<u64>,  // ✅ Option<primitive> is OK
    pub last_upgrade_timestamp: String,
    pub raw_rand_successful: bool,
    // REMOVED: disaster_recovery (Option<DisasterRecovery>)
    pub cycle_obtain_strategy: CycleObtainStrategy,
}

// Minimal SystemInfoResult
#[derive(CandidType, Deserialize, Debug)]
enum SystemInfoResultMinimal {
    Ok(SystemInfoMinimal),
    Err(String),
}
```

**Step 2**: Update `get_orbit_system_info` (line ~326)
```rust
#[update]
pub async fn get_orbit_system_info(
    token_canister_id: Principal
) -> Result<SystemInfoMinimal, String> {  // Return minimal version
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or_else(|| format!("No Orbit Station linked to token {}", token_canister_id.to_text()))
    })?;

    let result: (SystemInfoResultMinimal,) = ic_cdk::call(station_id, "system_info", ())
        .await
        .map_err(|(code, msg)| {
            format!("IC call to system_info failed: ({:?}, {})", code, msg)
        })?;

    match result.0 {
        SystemInfoResultMinimal::Ok(info) => Ok(info),
        SystemInfoResultMinimal::Err(e) => Err(format!("Orbit system_info error: {:?}", e)),
    }
}
```

### Fix 4: `get_treasury_accounts_with_balances` - Reuse AccountMinimal

**Problem**: Same as Fix 1 - Account has `Option<RequestPolicyRule>`
**File**: `daopad_backend/src/api/orbit_accounts.rs`
**Lines**: ~117 (list_accounts call), ~155 (fetch_balances call)

**Step 1**: Import AccountMinimal from orbit_overview.rs
```rust
// At top of file (after existing imports)
use crate::api::orbit_overview::{AccountMinimal, ListAccountsResultMinimal};
```

**WAIT** - This won't work because AccountMinimal is private. Better approach:

**Step 1**: Move AccountMinimal to `types/orbit.rs` (make it public)

In `daopad_backend/src/types/orbit.rs`, add AFTER line 342 (after Account struct):
```rust
// Minimal Account for methods that don't need policy fields
// Avoids Option<RequestPolicyRule> Candid deserialization bug
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct AccountMinimal {
    pub id: String,
    pub name: String,
    pub assets: Vec<AccountAssetMinimal>,
    pub metadata: Vec<AccountMetadata>,
    // REMOVED: transfer_request_policy, configs_request_policy (Option<RequestPolicyRule>)
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct AccountAssetMinimal {
    pub asset_id: String,
    // REMOVED: balance (Option<AccountBalance>)
}

#[derive(CandidType, Deserialize)]
pub enum ListAccountsResultMinimal {
    Ok {
        accounts: Vec<AccountMinimal>,
        total: u64,
        next_offset: Option<u64>,
    },
    Err(Error),
}
```

**Step 2**: Update orbit_overview.rs to use public types
```rust
// In orbit_overview.rs, REMOVE the private AccountMinimal definitions
// IMPORT from types instead:
use crate::types::orbit::{AccountMinimal, ListAccountsResultMinimal, AccountAssetMinimal};
```

**Step 3**: Update orbit_accounts.rs to use AccountMinimal
```rust
// At top of file
use crate::types::orbit::{AccountMinimal, ListAccountsResultMinimal};

// Update get_treasury_accounts_with_balances (line ~97)
#[update]
pub async fn get_treasury_accounts_with_balances(
    token_canister_id: Principal,
) -> Result<Vec<TreasuryAccount>, String> {  // Return simplified type
    // ... get station_id ...

    // Call list_accounts with minimal types
    let result: Result<(ListAccountsResultMinimal,), _> =
        ic_cdk::call(station_id, "list_accounts", (ListAccountsInput {
            search_term: None,
            paginate: None,
        },))
        .await;

    match result {
        Ok((ListAccountsResultMinimal::Ok { accounts, .. },)) => {
            // Get balances from list_assets instead
            let assets = list_assets_call(station_id).await?;

            // Build TreasuryAccount from AccountMinimal + Asset data
            let treasury_accounts: Vec<TreasuryAccount> = accounts
                .into_iter()
                .map(|acc| {
                    let account_assets: Vec<TreasuryAsset> = acc.assets
                        .into_iter()
                        .filter_map(|asset| {
                            // Find matching asset from list_assets to get balance
                            assets.iter()
                                .find(|a| a.id == asset.asset_id)
                                .map(|full_asset| TreasuryAsset {
                                    asset_id: asset.asset_id.clone(),
                                    symbol: full_asset.symbol.clone(),
                                    name: full_asset.name.clone(),
                                    balance: full_asset.balance_e8s.clone(),
                                    decimals: full_asset.decimals,
                                })
                        })
                        .collect();

                    TreasuryAccount {
                        id: acc.id,
                        name: acc.name,
                        assets: account_assets,
                    }
                })
                .collect();

            Ok(treasury_accounts)
        }
        Ok((ListAccountsResultMinimal::Err(e),)) => {
            Err(format!("Orbit list_accounts error: {:?}", e))
        }
        Err((code, msg)) => {
            Err(format!("IC call failed: ({:?}, {})", code, msg))
        }
    }
}
```

## Testing Strategy

### Phase 1: Build & Deploy (No Testing Yet)
```bash
cd /home/theseus/alexandria/daopad-candid-comprehensive-fix/src/daopad

# Build
cargo build --target wasm32-unknown-unknown --release -p daopad_backend

# Extract Candid
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Deploy backend
echo "yes" | dfx deploy --network ic daopad_backend --argument '(opt "fec7w-zyaaa-aaaaa-qaffq-cai")'
```

### Phase 2: Browser Manual Testing (CRITICAL)

Open https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai in browser with console open (F12).

**Test Dashboard Tab**:
- Should load treasury stats
- Console: NO errors containing "getDaoOverview", "RequestPolicyRule", or "AccountBalance"

**Test Activity Tab**:
- Should load proposal list (or show "No proposals")
- Console: NO errors containing "list_orbit_requests", "RequestStatusCode", or "ListRequestsSortBy"

**Test Treasury Tab**:
- Should load accounts with balances
- Console: NO errors containing "get_treasury_accounts", "RequestPolicyRule"

**Test Settings Tab**:
- Should load system info
- Console: NO errors containing "get_orbit_system_info", "DisasterRecovery"

**Success Criteria**: ZERO Candid deserialization errors in console

**Failure Action**: If ANY Candid errors appear, STOP immediately. Revert all changes. Report which method still has errors.

### Phase 3: Playwright Tests (Only if Phase 2 passes)
```bash
cd daopad_frontend
npx playwright test

# Expected: All 72 tests passing
```

## Exit Criteria

✅ **Success**:
- All 72 Playwright tests passing
- Zero Candid errors in browser console
- All four tabs (Dashboard, Activity, Treasury, Settings) functional

❌ **Failure** (Escalate to human):
- New Candid errors appear after fixes
- More than 3 iterations needed
- Cannot build or deploy
- Playwright tests don't improve (still 21 failing)

## Implementation Checklist

Before starting:
- [ ] Read COMPLETE plan (all 4 fixes)
- [ ] Verify in worktree
- [ ] Understand the Candid bug (Option<enum>)

During implementation:
- [ ] Fix 1: AccountMinimal + sequential awaits
- [ ] Fix 2: sort_by required + frontend update
- [ ] Fix 3: SystemInfoMinimal
- [ ] Fix 4: Reuse AccountMinimal in orbit_accounts.rs
- [ ] Build succeeds
- [ ] Deploy succeeds

After deploy:
- [ ] Browser console clean (no Candid errors)
- [ ] Playwright 72/72 passing
- [ ] PR created

---

**REMEMBER**: This is a BUG FIX. Goal = restore functionality, not add features. Minimize changes.
