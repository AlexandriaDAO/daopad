# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-candid-option-fix/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-candid-option-fix/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   ```bash
   cargo build --target wasm32-unknown-unknown --release -p daopad_backend
   candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
   ./deploy.sh --network ic --backend-only
   cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
   npm run build
   ./deploy.sh --network ic --frontend-only
   ```
4. **Manual Browser Verification** (MANDATORY BEFORE Playwright):
   ```bash
   # Open https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai
   # Test EACH tab: Dashboard, Activity, Treasury, Settings, Canisters
   # F12 console → Verify ZERO errors
   # If ANY errors: Fix immediately, redeploy, repeat
   ```
5. **Playwright Testing** (Only after console is clean):
   ```bash
   cd daopad_frontend
   LOG_FILE="/tmp/playwright-validation.log"
   npx playwright test 2>&1 | tee $LOG_FILE

   # Read ALL console errors
   grep -B5 -A20 "Browser Console Error" $LOG_FILE > /tmp/console-errors.txt
   cat /tmp/console-errors.txt

   # Verify clean
   ERROR_COUNT=$(grep -c "Browser Console Error" $LOG_FILE)
   if [ $ERROR_COUNT -gt 0 ]; then
       echo "❌ FAILURE: $ERROR_COUNT console errors"
       exit 1
   fi
   echo "✅ Success: Zero console errors, tests passing"
   ```
6. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Critical Fix]: Resolve all Candid Option<T> deserialization errors"
   git push -u origin feature/fix-candid-option-deserialization
   gh pr create --title "[Critical Fix]: Resolve all Candid Option<T> deserialization errors" --body "Implements FIX_CANDID_OPTION_DESERIALIZATION.md

## Problem
Candid 0.10.18 cannot deserialize Option<T> for ANY type (primitives, enums, structs, Vec<T>).

## Solution
- Remove all Option<T> fields from deserialized types
- Create minimal structs that match Orbit's actual responses
- Update all backend methods to use minimal types

## Testing
- Manual browser verification: ZERO console errors across all tabs
- Playwright: All 72 tests passing

## Exit Criteria
✅ Browser console clean
✅ All backend methods working
✅ Playwright tests passing"
   ```
7. **Iterate autonomously**:
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

**Branch:** `feature/fix-candid-option-deserialization`
**Worktree:** `/home/theseus/alexandria/daopad-candid-option-fix/src/daopad`

---

# Implementation Plan: Fix All Candid Option<T> Deserialization Errors

## Problem Statement

**Production Status**: BROKEN - All tabs failing with Candid errors

**Root Cause**: Candid 0.10.18 cannot serialize/deserialize `Option<T>` for ANY type:
- ❌ Option<primitive> (u64, u32, bool, etc.)
- ❌ Option<enum> (RequestStatusCode, ListRequestsSortBy, DisasterRecovery, etc.)
- ❌ Option<struct> (PaginationInput, QuorumPercentage, etc.)
- ❌ Option<Vec<T>> (Option<Vec<RequestStatusCode>>, etc.)

**Error Pattern**:
```
Panicked at 'Not a valid visitor: TypeId { id: X, name: "serde_core::de::impls::OptionVisitor<T>" }'
```

**Affected Tabs**:
- Activity: "Failed to fetch requests" (list_orbit_requests)
- Settings: "get_orbit_system_info failed" (system_info)
- Treasury: "Error loading accounts" (list_accounts)
- Canisters: "list_orbit_canisters failed" (list_external_canisters)

---

## PHASE 1: Complete Type Audit (Research - 60 min)

### Step 1: Identify ALL Affected Backend Methods

**CRITICAL**: You MUST test EVERY method with dfx to see exact response structure.

```bash
# Set test station
export TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"
export TOKEN_ID="ysy5f-2qaaa-aaaap-qkmmq-cai"
```

### Method Inventory

| Backend Method | Orbit Method | Response Type | Known Problematic Fields |
|----------------|--------------|---------------|--------------------------|
| `list_orbit_requests` | `list_requests` | ListRequestsResult | `Option<Vec<RequestStatusCode>>`, `Option<ListRequestsSortBy>`, `Option<PaginationInput>`, `Option<Vec<String>>` (tags, deduplication_keys) |
| `get_orbit_system_info` | `system_info` | SystemInfoResult | `Option<DisasterRecovery>`, `Option<u64>` (upgrader_cycles), `Option<String>` (account_name in CycleObtainStrategy) |
| `list_orbit_accounts` | `list_accounts` | ListAccountsResult | `Option<PaginationInput>`, `Option<RequestPolicyRule>` (in Account) |
| `get_treasury_management_data` | `list_accounts`, `list_address_book_entries` | Multiple | Same as list_accounts + `Option<String>` in AddressBookEntry metadata |
| `list_orbit_users` | `list_users` | ListUsersResult | `Option<PaginationInput>` |
| `fetch_orbit_account_balances` | `fetch_account_balances` | FetchAccountBalancesResult | `Option<AccountBalance>` in response Vec |

### Step 2: DFX Validation Commands (RUN THESE!)

```bash
# 1. Test system_info (Settings tab)
dfx canister --network ic call $TEST_STATION system_info '()'
# RECORD: Does disaster_recovery exist? Is upgrader_cycles present?

# 2. Test list_accounts (Treasury tab)
dfx canister --network ic call $TEST_STATION list_accounts '(record {
  search_term = null;
  paginate = null
})'
# RECORD: Structure of accounts array, transfer_request_policy field

# 3. Test list_requests (Activity tab)
dfx canister --network ic call $TEST_STATION list_requests '(record {
  requester_ids = null;
  approver_ids = null;
  statuses = null;
  operation_types = null;
  expiration_from_dt = null;
  expiration_to_dt = null;
  created_from_dt = null;
  created_to_dt = null;
  paginate = null;
  sort_by = null;
  only_approvable = false;
  with_evaluation_results = false;
  deduplication_keys = vec {};
  tags = vec {}
})'
# RECORD: Which Option fields are actually returned? Which are null?

# 4. Test list_users
dfx canister --network ic call $TEST_STATION list_users '(record {
  search_term = null;
  paginate = null
})'

# 5. Test fetch_account_balances
dfx canister --network ic call $TEST_STATION fetch_account_balances '(record {
  account_ids = vec { "ACCOUNT_UUID_HERE" }
})'
```

### Step 3: Document Findings

**After running DFX commands, create this table**:

| Type | Field | Orbit Returns | Action |
|------|-------|---------------|--------|
| SystemInfo | disaster_recovery | `opt record {...}` or `null` | Remove Option wrapper |
| SystemInfo | upgrader_cycles | `opt nat64` or `null` | Remove Option wrapper |
| CycleObtainStrategy | account_name | `opt text` | Remove Option wrapper |
| ListRequestsInput | statuses | `opt vec { variant {...} }` | Remove Option wrapper |
| ListRequestsInput | sort_by | `opt variant {...}` | Remove Option wrapper |
| ListRequestsInput | paginate | `opt record {...}` | Remove Option wrapper |
| ListRequestsInput | deduplication_keys | `opt vec { text }` | Remove Option wrapper |
| ListRequestsInput | tags | `opt vec { text }` | Remove Option wrapper |
| Account | transfer_request_policy | `opt variant {...}` | Remove Option wrapper |
| Account | configs_request_policy | `opt variant {...}` | Remove Option wrapper |
| PaginationInput | offset | `opt nat64` | Remove Option wrapper |
| PaginationInput | limit | `opt nat16` | Remove Option wrapper |

**Exit Criteria for Research Phase**:
- ✅ You have tested EVERY method listed above with dfx
- ✅ You know EXACTLY which fields cause errors
- ✅ You have recorded actual response structures

---

## PHASE 2: Implementation (Comprehensive Fix - All at Once)

### CRITICAL: Implementation Order

**RULE**: Implement ALL fixes together in ONE commit, NOT incrementally.

**Why No Incremental Testing**:
- Testing after each fix wastes 5+ deployments
- Early fixes can introduce new errors
- Impossible to know if you found all issues without complete audit

**The Right Approach**:
1. Complete type audit (Phase 1)
2. Create ALL minimal struct versions at once
3. Update ALL backend methods together
4. Update ALL frontend call sites together
5. Build, deploy ONCE
6. Verify browser console clean
7. Run Playwright once
8. If errors remain: You missed something in audit, revert and re-audit

---

### Implementation Checklist (Before Deploying)

Verify you've addressed:
- [ ] All Option<enum> fields removed from deserialized types
- [ ] All Option<struct> fields removed from deserialized types
- [ ] All Option<Vec<complex>> fields removed from deserialized types
- [ ] **All Option<primitive> fields removed** (yes, even u64!)
- [ ] All minimal structs created in types/orbit.rs
- [ ] All backend methods updated to use minimal types
- [ ] All frontend services updated if type signatures changed

---

### File 1: `daopad_backend/src/types/orbit.rs`

**Location**: Update existing file

```rust
// PSEUDOCODE - Replace existing type definitions

// ========== MINIMAL TYPES (No Option<T> anywhere!) ==========

// BEFORE (BROKEN):
#[derive(CandidType, Deserialize, Debug)]
pub struct SystemInfo {
    pub name: String,
    pub version: String,
    pub upgrader_id: Principal,
    pub cycles: u64,
    pub upgrader_cycles: Option<u64>,  // ❌ FAILS!
    pub last_upgrade_timestamp: String,
    pub raw_rand_successful: bool,
    pub disaster_recovery: Option<DisasterRecovery>,  // ❌ FAILS!
    pub cycle_obtain_strategy: CycleObtainStrategy,
}

// AFTER (WORKING):
#[derive(CandidType, Deserialize, Debug)]
pub struct SystemInfoMinimal {
    pub name: String,
    pub version: String,
    pub upgrader_id: Principal,
    pub cycles: u64,
    // Remove upgrader_cycles - derive from context if needed
    pub last_upgrade_timestamp: String,
    pub raw_rand_successful: bool,
    // Remove disaster_recovery - query separately if needed
    pub cycle_obtain_strategy: CycleObtainStrategyMinimal,
}

// BEFORE (BROKEN):
#[derive(CandidType, Deserialize, Debug)]
pub enum CycleObtainStrategy {
    Disabled,
    MintFromNativeToken {
        account_id: String,
        account_name: Option<String>,  // ❌ FAILS!
    },
    WithdrawFromCyclesLedger {
        account_id: String,
        account_name: Option<String>,  // ❌ FAILS!
    },
}

// AFTER (WORKING):
#[derive(CandidType, Deserialize, Debug)]
pub enum CycleObtainStrategyMinimal {
    Disabled,
    MintFromNativeToken {
        account_id: String,
        // Remove account_name - not critical for display
    },
    WithdrawFromCyclesLedger {
        account_id: String,
        // Remove account_name - not critical for display
    },
}

// BEFORE (BROKEN):
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ListRequestsInput {
    pub requester_ids: Option<Vec<String>>,  // ❌ FAILS!
    pub approver_ids: Option<Vec<String>>,  // ❌ FAILS!
    pub statuses: Option<Vec<RequestStatusCode>>,  // ❌ FAILS!
    pub operation_types: Option<Vec<ListRequestsOperationType>>,  // ❌ FAILS!
    pub expiration_from_dt: Option<String>,  // ❌ FAILS!
    pub expiration_to_dt: Option<String>,  // ❌ FAILS!
    pub created_from_dt: Option<String>,  // ❌ FAILS!
    pub created_to_dt: Option<String>,  // ❌ FAILS!
    pub paginate: Option<PaginationInput>,  // ❌ FAILS!
    pub sort_by: Option<ListRequestsSortBy>,  // ❌ FAILS!
    pub only_approvable: bool,
    pub with_evaluation_results: bool,
    pub deduplication_keys: Option<Vec<String>>,  // ❌ FAILS!
    pub tags: Option<Vec<String>>,  // ❌ FAILS!
}

// AFTER (WORKING):
#[derive(CandidType, Serialize, Clone, Debug)]
pub struct ListRequestsInputMinimal {
    // Use Vec instead of Option<Vec> - send empty vec if not filtering
    pub requester_ids: Vec<String>,
    pub approver_ids: Vec<String>,
    pub statuses: Vec<RequestStatusCode>,
    pub operation_types: Vec<ListRequestsOperationType>,

    // Remove all optional datetime fields - not using them anyway
    pub only_approvable: bool,
    pub with_evaluation_results: bool,

    // Empty vecs instead of Option
    pub deduplication_keys: Vec<String>,
    pub tags: Vec<String>,
}
// NOTE: Don't derive Deserialize - this is OUTPUT only!

// BEFORE (BROKEN):
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct PaginationInput {
    pub offset: Option<u64>,  // ❌ FAILS!
    pub limit: Option<u16>,   // ❌ FAILS!
}

// AFTER (WORKING):
#[derive(CandidType, Serialize, Clone, Debug)]
pub struct PaginationInputMinimal {
    pub offset: u64,  // Default to 0
    pub limit: u16,   // Default to 50
}
// NOTE: Don't derive Deserialize - this is OUTPUT only!

// BEFORE (BROKEN):
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct Account {
    pub id: String,
    pub assets: Vec<AccountAsset>,
    pub addresses: Vec<AccountAddress>,
    pub name: String,
    pub metadata: Vec<AccountMetadata>,
    pub transfer_request_policy: Option<RequestPolicyRule>,  // ❌ FAILS!
    pub configs_request_policy: Option<RequestPolicyRule>,   // ❌ FAILS!
    pub last_modification_timestamp: String,
}

// AFTER (WORKING):
// Keep the existing Account struct for DESERIALIZATION from Orbit
// But ignore the policy fields using serde(default)
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct Account {
    pub id: String,
    pub assets: Vec<AccountAsset>,
    pub addresses: Vec<AccountAddress>,
    pub name: String,
    pub metadata: Vec<AccountMetadata>,
    #[serde(default)]
    pub transfer_request_policy: (),  // Ignore this field
    #[serde(default)]
    pub configs_request_policy: (),   // Ignore this field
    pub last_modification_timestamp: String,
}

// ========== RESULT TYPES (Updated) ==========

#[derive(CandidType, Deserialize, Debug)]
pub enum SystemInfoResult {
    Ok { system: SystemInfoMinimal },
    Err(Error),
}

// Keep existing ListAccountsResult - Account struct updated above
// Keep existing ListRequestsResult - uses orbit_requests.rs types

```

### File 2: `daopad_backend/src/api/orbit_requests.rs`

**Location**: Update existing file

```rust
// PSEUDOCODE - Update ListRequestsInput construction

// BEFORE (BROKEN):
#[update]
pub async fn list_orbit_requests(
    token_canister_id: Principal,
    filters: ListRequestsInput,  // ❌ Contains Option<T>
) -> Result<ListOrbitRequestsResponse, String> {
    // ... existing code
}

// AFTER (WORKING):
use crate::types::orbit::ListRequestsInputMinimal;

#[update]
pub async fn list_orbit_requests(
    token_canister_id: Principal,
    // Accept individual filters, build minimal struct internally
    statuses: Vec<RequestStatusCode>,
    operation_types: Vec<ListRequestsOperationType>,
    limit: u16,
    offset: u64,
) -> Result<ListOrbitRequestsResponse, String> {
    // Get station ID
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations
            .borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
    }).ok_or_else(|| format!("No station for token {}", token_canister_id))?;

    // Build minimal input (NO Option<T>!)
    let input = ListRequestsInputMinimal {
        requester_ids: vec![],  // Empty vec, not None
        approver_ids: vec![],
        statuses,  // Pass directly
        operation_types,
        only_approvable: false,
        with_evaluation_results: false,
        deduplication_keys: vec![],  // Empty vec, not None
        tags: vec![],
    };

    // Encode and call
    let args = encode_args((input,))
        .map_err(|e| format!("Failed to encode: {e}"))?;

    let raw_bytes = call_raw(station_id, "list_requests", args, 0)
        .await
        .map_err(|(code, msg)| format!("IC call failed: ({:?}, {})", code, msg))?;

    parse_list_requests_response(raw_bytes)
}
```

### File 3: `daopad_backend/src/api/orbit.rs`

**Location**: Update existing file

```rust
// PSEUDOCODE - Update all Orbit method calls

// BEFORE (BROKEN):
#[update]
pub async fn get_orbit_system_info(
    token_canister_id: Principal
) -> Result<SystemInfoResponse, String> {
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| format!("No station for token {}", token_canister_id))?;

    let result: Result<(SystemInfoResult,), _> = ic_cdk::call(
        station_id,
        "system_info",
        ()
    ).await;

    match result {
        Ok((SystemInfoResult::Ok { system },)) => {
            Ok(SystemInfoResponse {
                station_id,
                system_info: system,  // ❌ Contains Option<DisasterRecovery>
            })
        },
        // ... error handling
    }
}

// AFTER (WORKING):
use crate::types::orbit::SystemInfoMinimal;

#[update]
pub async fn get_orbit_system_info(
    token_canister_id: Principal
) -> Result<SystemInfoResponseMinimal, String> {
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| format!("No station for token {}", token_canister_id))?;

    // Call with minimal type expectation
    let result: Result<(SystemInfoResultMinimal,), _> = ic_cdk::call(
        station_id,
        "system_info",
        ()
    ).await;

    match result {
        Ok((SystemInfoResultMinimal::Ok { system },)) => {
            Ok(SystemInfoResponseMinimal {
                station_id,
                system_info: system,  // ✅ No Option<T> fields
            })
        },
        Ok((SystemInfoResultMinimal::Err(e),)) => {
            Err(format!("Orbit error: {:?}", e))
        },
        Err((code, msg)) => {
            Err(format!("Failed to call system_info: {:?} - {}", code, msg))
        }
    }
}

// BEFORE (BROKEN):
#[update]
pub async fn list_orbit_accounts(
    token_canister_id: Principal,
    search_term: Option<String>,
    limit: Option<u64>,
    offset: Option<u64>,
) -> Result<ListAccountsResult, String> {
    // ... get station_id

    let input = ListAccountsInput {
        search_term,  // ❌ Option<String> fails
        paginate: if limit.is_some() || offset.is_some() {
            Some(PaginationInput { limit, offset })  // ❌ Option<PaginationInput> fails
        } else {
            None
        },
    };

    // ... call and return
}

// AFTER (WORKING):
use crate::types::orbit::PaginationInputMinimal;

#[update]
pub async fn list_orbit_accounts(
    token_canister_id: Principal,
    search_term: String,  // Empty string instead of None
    limit: u16,
    offset: u64,
) -> Result<ListAccountsResult, String> {
    // ... get station_id

    // Build input with NO Option<T>
    let input = ListAccountsInputMinimal {
        search_term: if search_term.is_empty() {
            String::new()  // Empty string, not None
        } else {
            search_term
        },
        // Always include pagination (empty = all results)
        paginate: PaginationInputMinimal {
            offset,
            limit,
        },
    };

    let result: Result<(ListAccountsResult,), _> =
        ic_cdk::call(station_id, "list_accounts", (input,)).await;

    // Account struct already updated to ignore policy fields
    match result {
        Ok((response,)) => Ok(response),
        Err((code, msg)) => Err(format!(
            "Failed to call list_accounts: {:?} - {}",
            code, msg
        )),
    }
}
```

### File 4: `daopad_backend/src/api/orbit_users.rs`

**Location**: Update existing file (if it calls list_users)

```rust
// PSEUDOCODE - Update list_users call

// BEFORE (BROKEN):
let input = ListUsersInput {
    search_term: None,  // ❌ FAILS
    paginate: None,      // ❌ FAILS
};

// AFTER (WORKING):
let input = ListUsersInputMinimal {
    search_term: String::new(),  // Empty string
    paginate: PaginationInputMinimal {
        offset: 0,
        limit: 50,
    },
};
```

### File 5: Frontend Service Updates (If Method Signatures Changed)

**Location**: `daopad_frontend/src/services/daopad_backend.ts`

```typescript
// PSEUDOCODE - Update method signatures

// BEFORE (BROKEN):
async listOrbitRequests(
  tokenId: Principal,
  filters: {
    statuses?: RequestStatusCode[];
    operationTypes?: OperationType[];
    // ... other optional fields
  }
): Promise<RequestsResponse> {
  const actor = await this.getActor();
  return actor.list_orbit_requests(tokenId, filters);
}

// AFTER (WORKING):
async listOrbitRequests(
  tokenId: Principal,
  statuses: RequestStatusCode[],  // Required, use [] for "all"
  operationTypes: OperationType[],
  limit: number = 50,
  offset: number = 0
): Promise<RequestsResponse> {
  const actor = await this.getActor();
  return actor.list_orbit_requests(
    tokenId,
    statuses,
    operationTypes,
    limit,
    offset
  );
}

// Update all call sites in components:
// - ActivityTable.tsx: Pass [] for statuses/operationTypes if not filtering
// - SettingsPage.tsx: Updated system_info response handling
// - TreasuryOverview.tsx: Pass empty string + 0/50 for list_accounts
```

---

## PHASE 3: Testing Requirements (Per PLAYWRIGHT_TESTING_GUIDE.md)

### CRITICAL: Exit Criteria (When To Stop Iterating)

**SUCCESS - Stop iterating when ALL are true**:
1. ✅ Manual browser: ZERO console errors
2. ✅ Manual browser: ALL backend calls 200 OK
3. ✅ Manual browser: UI displays data (not stuck loading)
4. ✅ Playwright: `verify.assertNoConsoleErrors()` passes
5. ✅ Playwright: `verify.assertBackendSuccess()` passes
6. ✅ Playwright: UI assertions pass

**FAILURE - Keep iterating when ANY are true**:
1. ❌ Console shows errors (Candid, TypeError, decode, etc.)
2. ❌ Network tab shows failed calls (500, 400, etc.)
3. ❌ UI stuck loading or showing error state
4. ❌ Playwright data verifier assertions fail
5. ❌ Iteration count < 5

**PROHIBITED - Never declare victory based on**:
- ❌ "Tests passed" (without verifying what they checked)
- ❌ "Deployment succeeded" (deployment ≠ feature works)
- ❌ "No obvious errors" (if console wasn't inspected)

---

### Step 1: Manual Browser Verification (BEFORE Playwright)

**YOU MUST DO THIS FIRST**:

```bash
# 1. Deploy to mainnet
cd /home/theseus/alexandria/daopad-candid-option-fix/src/daopad
./deploy.sh --network ic

# 2. Open in incognito browser (anonymous user test)
open "https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/overview"

# 3. Open DevTools Console (F12) - READ EVERY LINE

# 4. Check for errors (MANDATORY):
#    Search console output for these patterns:
#    - "Invalid record" → Candid type mismatch
#    - "TypeError" → Wrong property access (e.g., .filter is not a function)
#    - "Cannot read property" → Missing/undefined data
#    - "not authorized" → Auth issue
#    - "decode" / "Candid" → Candid decode failure
#    - "SyntaxError" → JSON parse error
#    - "Not a valid visitor" → Option<T> deserialization failure (THIS ONE!)

# 5. Check Network tab:
#    Filter for: lwsav-iiaaa-aaaap-qp2qq-cai
#    Verify: ALL calls return 200 OK (not 500/400)
#    If any failures: Click request, read response, fix backend issue

# 6. Verify UI state:
#    ✅ Data displays = Good
#    ❌ Empty state when should have data = Check why
#    ❌ Stuck loading (spinner forever) = API not completing
#    ❌ Error message shown = Read error, fix root cause

# 7. Test ALL tabs:
echo "Testing Dashboard..."
# Navigate to /overview, check console

echo "Testing Activity..."
# Navigate to /activity, check console

echo "Testing Treasury..."
# Navigate to /treasury, check console

echo "Testing Settings..."
# Navigate to /settings, check console

echo "Testing Canisters..."
# Navigate to /canisters, check console

# 8. Document findings:
gh pr comment [NUM] --body "## Manual Verification Results

**Console Errors**: [NONE / List them]
**Backend Calls**: [X calls, all 200 OK / Y failed]
**UI State**: [Data loaded / Stuck loading / Error shown]

**Next**: [Proceeding to Playwright / Fixing error: ...]"
```

**If console has ANY errors**: Fix immediately, redeploy, repeat Step 1.

**DO NOT proceed to Playwright until**:
- ✅ ZERO console errors
- ✅ ALL backend calls 200 OK
- ✅ UI shows data OR intentional empty state

---

### Step 2: Playwright Verification

**Only proceed if Step 1 shows zero console errors.**

```bash
cd daopad_frontend

# Run tests with full capture
LOG_FILE="/tmp/playwright-validation-$(date +%s).log"
npx playwright test 2>&1 | tee $LOG_FILE

# MANDATORY: Read captured errors (DO NOT SKIP THIS!)
echo "=== READING CONSOLE ERRORS FROM PLAYWRIGHT ==="
grep -B5 -A20 "Browser Console Error" $LOG_FILE > /tmp/console-errors.txt
cat /tmp/console-errors.txt

# Extract error patterns
echo "=== CANDID DESERIALIZATION ERRORS ==="
grep -A5 "Not a valid visitor" $LOG_FILE

echo "=== WHICH BACKEND METHODS FAILED ==="
grep "Method:" $LOG_FILE | sed 's/.*Method: \([^ ]*\).*/\1/' | sort -u

echo "=== WHICH TYPES ARE PROBLEMATIC ==="
grep "TypeId.*name:" $LOG_FILE | sed 's/.*name: "\([^"]*\)".*/\1/' | sort -u

# Verify zero errors
ERROR_COUNT=$(grep -c "Browser Console Error" $LOG_FILE || echo "0")
if [ $ERROR_COUNT -gt 0 ]; then
    echo "❌ FAILURE: $ERROR_COUNT console errors still present"
    echo "This means you missed some Option<T> fields in the audit!"
    echo "Go back to Phase 1, find the missing types, implement fixes"
    exit 1
fi

echo "✅ SUCCESS: Zero console errors detected"
echo "✅ All Candid deserialization errors resolved"
```

---

### Step 3: Iteration Loop (If Errors Found)

```
FOR iteration = 1 TO 5:

  # ALWAYS start with manual browser verification
  1. Open https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/.../overview
  2. Read console (F12) - every line
  3. Check Network tab - every call status

  IF console has errors:
    - Copy exact error text
    - Identify error type:
      * "Not a valid visitor: ...OptionVisitor<X>" → Option<X> field missed
      * "Invalid record {field...}" → Candid type encoding wrong
      * "TypeError: X is not a function" → Property/method doesn't exist
      * "Cannot read property 'X' of undefined" → Missing data
    - Find the type definition causing the error
    - Remove the Option<T> wrapper or use #[serde(default)]
    - git add . && git commit -m "Fix: [error]" && git push
    - ./deploy.sh --network ic
    - sleep 300s
    - GOTO step 1 (verify fix)

  IF console clean BUT UI broken:
    - Check Network tab response bodies
    - Compare to code expectations (property names, structure)
    - Fix mismatch
    - Deploy, push, sleep, verify

  IF console clean AND UI works:
    - Run Playwright: npx playwright test
    - IF data verifier passes AND UI passes: SUCCESS, exit loop
    - IF data verifier fails: Read error, fix, continue loop
    - IF UI fails but data passes: UI bug, fix, continue loop

  IF iteration = 5:
    - Comment on PR with findings
    - Request human help
    - EXIT

END FOR
```

---

## Exit Criteria

### ✅ SUCCESS (All must be true)
1. Browser console shows ZERO errors when visiting all tabs
2. `grep "Browser Console Error" $LOG_FILE` returns nothing
3. `grep "Not a valid visitor" $LOG_FILE` returns nothing
4. `grep "OptionVisitor" $LOG_FILE` returns nothing
5. Playwright tests: 72/72 passing (or at least same pass rate as before)
6. All backend methods from type audit table now work:
   - list_orbit_requests ✅
   - get_orbit_system_info ✅
   - list_orbit_accounts ✅
   - get_treasury_management_data ✅
   - list_orbit_users ✅
   - fetch_orbit_account_balances ✅

### ❌ FAILURE (Escalate if any are true)
1. Browser console shows ANY Candid errors after deploy
2. Playwright output contains "Browser Console Error" after fixes
3. Any tab shows error state or stuck loading after fixes
4. More than 3 deploy iterations needed (means incomplete audit)
5. New errors appear that weren't in original problem statement

### 🔴 CRITICAL FAILURE (Revert immediately if)
1. Methods that previously worked now break
2. Cannot explain why a fix didn't work (type mismatch in audit)
3. Errors persist after removing ALL Option<T> wrappers
4. DFX test succeeds but deployed canister fails (declaration sync bug)

---

## Implementation Notes

### Pattern: Remove Option<T> Wrappers

**Three strategies**:

1. **For INPUT structs** (sent TO Orbit):
   - Remove Option wrappers
   - Use empty values (vec![], String::new(), 0) instead of None
   - Only derive Serialize, NOT Deserialize

2. **For OUTPUT structs** (received FROM Orbit):
   - If field is critical: Keep field, remove Option wrapper
   - If field is optional: Use #[serde(default)] to ignore it
   - If field breaks deserialization: Replace with unit type ()

3. **For bidirectional types** (rarely used):
   - Create separate Input and Output types
   - Input: No Option<T>, only Serialize
   - Output: No Option<T>, only Deserialize

### Pattern: Frontend API Changes

If backend method signatures change:

```typescript
// BEFORE:
service.listAccounts(tokenId, { limit: 10 })

// AFTER:
service.listAccounts(tokenId, "", 10, 0)
//                             ^^  ^^  ^^
//                             search, limit, offset (all required)
```

Update these files:
- `daopad_frontend/src/services/daopad_backend.ts` (service methods)
- `daopad_frontend/src/features/*/slices/*.ts` (Redux thunks)
- Component call sites (pass empty values for "no filter")

### Pattern: Testing New Types

```bash
# After creating minimal types, test with dfx BEFORE deploying:

# 1. Build backend
cargo build --target wasm32-unknown-unknown --release -p daopad_backend

# 2. Extract candid
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > test.did

# 3. Compare method signatures
diff daopad_backend/daopad_backend.did test.did

# 4. If method signatures changed, update frontend
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# 5. NOW deploy
./deploy.sh --network ic
```

---

## Common Pitfalls

### ❌ MISTAKE: Incremental Testing

**Wrong**:
```bash
# Fix SystemInfo
deploy
test
# Fix ListRequestsInput
deploy
test
# Fix Account
deploy
test
```

**Right**:
```bash
# Fix ALL types at once
deploy ONCE
test ONCE
```

### ❌ MISTAKE: Assuming Option<primitive> Works

**Wrong**:
```rust
pub struct SystemInfo {
    pub upgrader_cycles: Option<u64>,  // ❌ "It's just a u64!"
}
```

**Right**:
```rust
pub struct SystemInfoMinimal {
    // Remove field entirely or make non-optional
    pub upgrader_cycles: u64,  // ✅ Default to 0
}
```

### ❌ MISTAKE: Not Testing ALL Tabs

**Wrong**:
```
"Overview works, tests passing, ship it!"
```

**Right**:
```
Overview ✅
Activity ✅
Treasury ✅
Settings ✅
Canisters ✅
Agreement ✅
ALL tabs verified in browser console before declaring success
```

### ❌ MISTAKE: Trusting Test Pass Without Console Verification

**Wrong**:
```bash
npx playwright test
# 72 passed
echo "SUCCESS!"  # ❌ Tests might not be checking console errors!
```

**Right**:
```bash
npx playwright test 2>&1 | tee $LOG_FILE
grep "Browser Console Error" $LOG_FILE
# If ANY found: NOT success, keep iterating
```

---

## Summary

**This is a comprehensive, all-at-once fix**:
1. Complete type audit with DFX validation
2. Remove ALL Option<T> wrappers across ALL types
3. Update ALL backend methods together
4. Deploy ONCE
5. Verify browser console clean (MANDATORY before Playwright)
6. Run Playwright to confirm
7. Create PR (MANDATORY)

**Success = Zero console errors + Zero Playwright errors + All tabs working**

Do not proceed incrementally. Do not skip browser console verification. Do not declare victory without running Playwright. This plan ensures all Candid Option<T> errors are fixed in one comprehensive deployment.
