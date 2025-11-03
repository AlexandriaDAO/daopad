# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-orbit-client/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-orbit-client/src/daopad`
2. **Implement refactoring** - Follow plan sections below
3. **Build & Deploy**:
   ```bash
   cargo build --target wasm32-unknown-unknown --release -p daopad_backend
   candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
   ./deploy.sh --network ic --backend-only
   cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
   ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "refactor: Extract OrbitClient to centralize 47 ic_cdk::call patterns"
   git push -u origin feature/orbit-client-pattern
   gh pr create --title "Refactor: Create OrbitClient to centralize cross-canister calls" --body "Implements PHASE3_ORBIT_CLIENT.md"
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

**Branch:** `feature/orbit-client-pattern`
**Worktree:** `/home/theseus/alexandria/daopad-orbit-client/src/daopad`

---

# Implementation Plan: Create OrbitClient Pattern

## Current State

**Problem**: 47 scattered `ic_cdk::call` patterns across 17 API files
```rust
// This pattern repeated 47 times with slight variations:
let result: Result<(SomeResponse,), _> =
    ic_cdk::call(station_id, "method_name", (input,)).await;

match result {
    Ok((ResponseType::Ok { data },)) => Ok(data),
    Ok((ResponseType::Err(e),)) => Err(format!("Orbit error: {:?}", e)),
    Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg))
}
```

**Files with most duplication**:
- orbit.rs: 10 calls
- orbit_transfers.rs: 5 calls
- orbit_permissions.rs: 5 calls
- orbit_overview.rs: 4 calls
- kong_locker.rs: 4 calls

**Issues**:
- Code duplication (same error handling 47 times)
- Inconsistent error messages
- No centralized logging or retry logic
- Hard to add features (like caching, metrics)
- Testing requires mocking ic_cdk everywhere

## Target State

Create a centralized `OrbitClient` that:
1. Encapsulates all cross-canister calls
2. Provides consistent error handling
3. Enables future enhancements (retry, caching, logging)
4. Makes testing easier (mock one client instead of ic_cdk)

```
daopad_backend/src/
├── client/
│   ├── mod.rs          (5 lines)   - Module export
│   └── orbit_client.rs (250 lines) - OrbitClient implementation
├── api/
│   └── [all files updated to use OrbitClient]
```

**Net Change**: +255 lines for client, -200 lines removed from duplication = +55 lines total

## Implementation Steps

### Step 1: Create OrbitClient Module

File: `daopad_backend/src/client/mod.rs` (NEW - 5 lines)
```rust
// PSEUDOCODE
pub mod orbit_client;

pub use orbit_client::OrbitClient;
```

File: `daopad_backend/src/client/orbit_client.rs` (NEW - 250 lines)
```rust
// PSEUDOCODE
use candid::{CandidType, Principal};
use ic_cdk;
use serde::de::DeserializeOwned;
use std::fmt::Debug;

/// Centralized client for all Orbit Station cross-canister calls
pub struct OrbitClient;

impl OrbitClient {
    /// Generic method for any Orbit call with standard Ok/Err response pattern
    pub async fn call<Input, Response, Data>(
        station_id: Principal,
        method: &str,
        input: Input,
    ) -> Result<Data, String>
    where
        Input: CandidType,
        Response: CandidType + OrbitResponse<Data>,
        Data: CandidType,
    {
        let result: Result<(Response,), (i32, String)> =
            ic_cdk::call(station_id, method, (input,)).await;

        match result {
            Ok((response,)) => response.into_result(),
            Err((code, msg)) => {
                // Centralized error formatting
                Err(format!("Orbit call '{}' failed: code={}, msg={}", method, code, msg))
            }
        }
    }

    /// Specialized method for calls that return raw data (no Ok/Err wrapper)
    pub async fn call_raw<Input, Output>(
        station_id: Principal,
        method: &str,
        input: Input,
    ) -> Result<Output, String>
    where
        Input: CandidType,
        Output: CandidType + DeserializeOwned,
    {
        let result: Result<(Output,), (i32, String)> =
            ic_cdk::call(station_id, method, (input,)).await;

        match result {
            Ok((output,)) => Ok(output),
            Err((code, msg)) => {
                Err(format!("Orbit call '{}' failed: code={}, msg={}", method, code, msg))
            }
        }
    }
}

/// Trait for Orbit responses that follow Ok/Err pattern
pub trait OrbitResponse<T> {
    fn into_result(self) -> Result<T, String>;
}

// Implement for common Orbit response types
use crate::types::orbit_types::users::ListUsersResult;
impl OrbitResponse<Vec<UserDTO>> for ListUsersResult {
    fn into_result(self) -> Result<Vec<UserDTO>, String> {
        match self {
            ListUsersResult::Ok { users, .. } => Ok(users),
            ListUsersResult::Err(e) => Err(format!("Orbit error: {}", e)),
        }
    }
}

use crate::types::orbit_types::accounts::{ListAccountsResult, FetchAccountBalancesResult};
impl OrbitResponse<Vec<AccountMinimal>> for ListAccountsResult {
    fn into_result(self) -> Result<Vec<AccountMinimal>, String> {
        match self {
            ListAccountsResult::Ok { accounts, .. } => Ok(accounts),
            ListAccountsResult::Err(e) => Err(format!("Orbit error: {}", e)),
        }
    }
}

// ... Implement for all 20+ response types ...

// Helper methods for specific common operations
impl OrbitClient {
    /// List users with consistent error handling
    pub async fn list_users(
        station_id: Principal,
        input: ListUsersInput,
    ) -> Result<Vec<UserDTO>, String> {
        Self::call::<_, ListUsersResult, _>(station_id, "list_users", input).await
    }

    /// List accounts with consistent error handling
    pub async fn list_accounts(
        station_id: Principal,
        input: ListAccountsInput,
    ) -> Result<Vec<AccountMinimal>, String> {
        Self::call::<_, ListAccountsResult, _>(station_id, "list_accounts", input).await
    }

    /// Get system info
    pub async fn get_system_info(
        station_id: Principal,
    ) -> Result<SystemInfo, String> {
        Self::call::<_, SystemInfoResult, _>(station_id, "system_info", ()).await
    }

    // ... Add more convenience methods as needed ...
}
```

### Step 2: Update lib.rs to Include Client Module

File: `daopad_backend/src/lib.rs` (MODIFY)
```rust
// PSEUDOCODE
// Add after existing mod declarations
mod client;
```

### Step 3: Refactor High-Usage Files First

#### Example: Refactor orbit_overview.rs (4 calls → 1 client)

File: `daopad_backend/src/api/orbit_overview.rs` (MODIFY)
```rust
// PSEUDOCODE
use crate::client::OrbitClient;

// BEFORE (lines 140-156):
async fn list_accounts_call(station_id: Principal) -> Result<Vec<AccountMinimal>, String> {
    let input = ListAccountsInputMinimal {
        paginate: Some(PaginationInputMinimal {
            offset: 0,
            limit: 100,
        }),
    };

    let result: Result<(ListAccountsResultMinimal,), _> =
        ic_cdk::call(station_id, "list_accounts", (input,)).await;

    match result {
        Ok((ListAccountsResultMinimal::Ok { accounts, .. },)) => Ok(accounts),
        Ok((ListAccountsResultMinimal::Err(e),)) => Err(format!("List accounts error: {}", e)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg))
    }
}

// AFTER:
async fn list_accounts_call(station_id: Principal) -> Result<Vec<AccountMinimal>, String> {
    let input = ListAccountsInputMinimal {
        paginate: Some(PaginationInputMinimal {
            offset: 0,
            limit: 100,
        }),
    };

    OrbitClient::list_accounts(station_id, input).await
}

// Similar simplification for other 3 calls in this file
```

#### Example: Refactor orbit.rs (10 calls → 1 client)

File: `daopad_backend/src/api/orbit.rs` (MODIFY)
```rust
// PSEUDOCODE
use crate::client::OrbitClient;

// BEFORE (example from create_request):
let result: Result<(CreateRequestResult,), _> = ic_cdk::call(
    station_id,
    "create_request",
    (create_request_input,),
).await;

match result {
    Ok((CreateRequestResult::Ok(response),)) => Ok(response.request.id),
    Ok((CreateRequestResult::Err(e),)) => Err(format!("Failed to create request: {}", e)),
    Err((code, msg)) => Err(format!("IC call failed: {:?} - {}", code, msg)),
}

// AFTER:
let response = OrbitClient::call::<_, CreateRequestResult, _>(
    station_id,
    "create_request",
    create_request_input,
).await?;
Ok(response.request.id)
```

### Step 4: Systematic Refactoring of All 17 Files

**Files to update** (in order of call count):
1. `orbit.rs` - 10 calls
2. `orbit_transfers.rs` - 5 calls
3. `orbit_permissions.rs` - 5 calls
4. `orbit_overview.rs` - 4 calls
5. `kong_locker.rs` - 4 calls
6. `orbit_users.rs` - 3 calls
7. `equity.rs` - 3 calls
8. `stations.rs` - 2 calls
9. `security/governance_checks.rs` - 2 calls
10. `agreement_snapshot.rs` - 2 calls
11. `security/treasury_checks.rs` - 1 call
12. `security/system_checks.rs` - 1 call
13. `security/admin_checks.rs` - 1 call
14. `orbit_security.rs` - 1 call (delegates to modules now)
15. `orbit_canisters.rs` - 1 call
16. `orbit_assets.rs` - 1 call
17. `orbit_accounts.rs` - 1 call

**For each file**:
1. Add `use crate::client::OrbitClient;`
2. Replace ic_cdk::call pattern with OrbitClient::call
3. Remove local error handling boilerplate
4. Test that functionality remains identical

## Testing Strategy

```bash
# Build and verify no compilation errors
cargo build --target wasm32-unknown-unknown --release -p daopad_backend

# Extract candid
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Deploy
./deploy.sh --network ic --backend-only

# Test critical operations still work
dfx canister --network ic call daopad_backend list_station_users '(principal "fec7w-zyaaa-aaaaa-qaffq-cai")'
dfx canister --network ic call daopad_backend get_station_overview '(principal "fec7w-zyaaa-aaaaa-qaffq-cai")'
dfx canister --network ic call daopad_backend create_add_asset_request '(principal "fec7w-zyaaa-aaaaa-qaffq-cai", ...)'
```

## Exit Criteria

- ✅ All 47 ic_cdk::call patterns replaced with OrbitClient
- ✅ Consistent error handling across all Orbit calls
- ✅ Code compiles without errors
- ✅ Backend deploys successfully
- ✅ All API endpoints still work identically
- ✅ Net reduction in duplicated code (~200 lines saved)

## Risk Mitigation

- **Breaking Changes**: OrbitClient is internal only, API surface unchanged
- **Missing Response Types**: Add trait implementations as needed
- **Complex Calls**: Some calls may need special handling, keep fallback to call_raw
- **Testing**: Test each file's changes incrementally

## Expected Outcome

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| ic_cdk::call sites | 47 | 0 | 100% centralized |
| Error handling locations | 47 | 1 | 98% reduction |
| Duplicated code | ~400 lines | ~50 lines | 87% reduction |
| Files touched | 17 | 18 (17 + client) | Minimal new files |
| Testability | Mock ic_cdk 47 times | Mock 1 client | 98% easier |
| Future changes | Edit 47 locations | Edit 1 location | 98% easier |

## Why This Is Important

1. **Foundation for Future**: Enables adding retry logic, caching, metrics in ONE place
2. **Consistency**: All Orbit errors handled identically
3. **Maintainability**: Change error format once, not 47 times
4. **Testing**: Can now mock OrbitClient for unit tests
5. **Performance**: Future optimization (like connection pooling) in one place

## Next Steps After This PR

This refactoring enables:
1. Add retry logic for transient failures
2. Add response caching for read operations
3. Add metrics/logging for all Orbit calls
4. Create MockOrbitClient for unit testing
5. Eventually: Add circuit breaker pattern for resilience