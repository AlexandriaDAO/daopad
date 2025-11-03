# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-types-refactor/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-types-refactor/src/daopad`
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
   git commit -m "refactor: Break up types/orbit.rs (1508 lines) into domain-focused modules"
   git push -u origin feature/refactor-orbit-types
   gh pr create --title "Refactor: Break up types/orbit.rs god object into domain modules" --body "Implements PHASE2_REFACTOR_TYPES.md"
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

**Branch:** `feature/refactor-orbit-types`
**Worktree:** `/home/theseus/alexandria/daopad-types-refactor/src/daopad`

---

# Implementation Plan: Break Up types/orbit.rs

## Current State

**File**: `daopad_backend/src/types/orbit.rs`
- **Lines**: 1,508 (SECOND LARGEST FILE IN CODEBASE)
- **Types**: 112 structs, 58 enums, 2 type aliases
- **Dependents**: 17 files import this god object
- **Mixed Concerns**:
  - User management types (lines 8-219, 232-267)
  - Account/Treasury types (lines 269-490)
  - Asset management types (lines 31-82, 293-308)
  - Permissions types (lines 540-690, 680-791)
  - Request/Operation types (lines 39-175, 337-349)
  - System/Settings types (lines 489-539)
  - External canister types (lines 792-1219)
  - Security bypass types (lines 641-679)
  - Helper/utility types (lines 1312-1507)

**Major Problems**:
- Everything imports everything (`use crate::types::orbit::*`)
- Can't understand domain boundaries
- Circular dependency risk
- Massive compile-time impact (every change recompiles everything)

## Target State

Break into 7 domain-focused modules in a NEW `orbit_types/` directory:
```
daopad_backend/src/types/
├── orbit.rs                    (50 lines)  - Re-exports for compatibility
├── orbit_types/
│   ├── mod.rs                  (30 lines)  - Module organization
│   ├── users.rs                (250 lines) - User & group management
│   ├── accounts.rs             (280 lines) - Treasury accounts & balances
│   ├── assets.rs               (200 lines) - Asset definitions & operations
│   ├── permissions.rs          (250 lines) - Permissions & resources
│   ├── requests.rs             (300 lines) - Requests & operations
│   ├── system.rs               (150 lines) - System info & settings
│   └── external_canisters.rs   (250 lines) - External canister management
```

**Net Change**: 1,508 → 1,760 lines (+252 lines, 16% increase for better structure)

## Implementation Steps

### Step 1: Create Module Structure

Create directory and mod.rs:
```rust
// daopad_backend/src/types/orbit_types/mod.rs
// PSEUDOCODE
pub mod users;
pub mod accounts;
pub mod assets;
pub mod permissions;
pub mod requests;
pub mod system;
pub mod external_canisters;

// Re-export all types at module level for easy migration
pub use users::*;
pub use accounts::*;
pub use assets::*;
pub use permissions::*;
pub use requests::*;
pub use system::*;
pub use external_canisters::*;
```

### Step 2: Extract User Management Types

File: `daopad_backend/src/types/orbit_types/users.rs` (NEW - 250 lines)
```rust
// PSEUDOCODE
use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;

// Move user status and basic types
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum UserStatus {
    Active,
    Inactive,
}

// Move user operations
pub struct AddUserOperationInput { /* lines 14-19 */ }
pub struct EditUserOperationInput { /* lines 22-29 */ }

// Move user DTOs and responses
pub struct UserDTO { /* lines 788-790 */ }
pub struct UserCallerPrivileges { /* lines 214-218 */ }
pub struct UserGroup { /* lines 197-201 */ }
pub struct User { /* lines 203-212 */ }

// Move user results
pub enum ListUsersResult { /* lines 220-230 */ }
pub enum MeResult { /* lines 261-269 */ }
pub enum UserPrivilege { /* lines 232-259 */ }

// Move user specifier (used in policies)
pub enum UserSpecifier {
    Any,
    Group(Vec<String>),
    Id(Vec<String>),
}
```

### Step 3: Extract Account/Treasury Types

File: `daopad_backend/src/types/orbit_types/accounts.rs` (NEW - 280 lines)
```rust
// PSEUDOCODE
use super::assets::AccountAsset;
use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;

// Move account metadata
pub struct AccountMetadata { /* lines 271-275 */ }
pub struct AccountAddress { /* lines 277-281 */ }
pub struct AccountBalance { /* lines 283-291 */ }

// Move account types
pub struct Account { /* lines 350-359 */ }
pub struct AccountCallerPrivileges { /* lines 365-371 */ }

// Move account operations
pub struct AddAccountOperationInput { /* lines 458-469 */ }
pub struct EditAccountOperationInput { /* lines 478-488 */ }
pub enum ChangeAssets { /* lines 471-476 */ }

// Move account results
pub enum ListAccountsResult { /* lines 417-427 */ }
pub enum FetchAccountBalancesResult { /* lines 434-441 */ }

// Move account input types
pub struct ListAccountsInput { /* lines 411-415 */ }
pub struct FetchAccountBalancesInput { /* lines 429-432 */ }

// Keep minimal versions here (they're account-specific)
pub struct AccountMinimal { /* lines 1379-1386 */ }
pub struct AccountMinimalWithBalances { /* lines 1451-1466 */ }
pub struct AccountWithBalance { /* lines 1468-1482 */ }
```

### Step 4: Extract Asset Types

File: `daopad_backend/src/types/orbit_types/assets.rs` (NEW - 200 lines)
```rust
// PSEUDOCODE
use candid::{CandidType, Deserialize, Nat};
use serde::Serialize;

// Move asset metadata
pub struct AssetMetadata { /* lines 33-36 */ }

// Move asset operations
pub struct AddAssetOperationInput { /* lines 52-59 */ }
pub struct EditAssetOperationInput { /* lines 69-76 */ }
pub struct RemoveAssetOperationInput { /* lines 79-81 */ }
pub enum ChangeMetadata { /* lines 62-66 */ }

// Move asset account types
pub struct AccountAsset { /* lines 293-299 */ }
pub struct AccountAssetMinimal { /* lines 301-304 */ }
pub struct AccountAssetWithBalance { /* lines 309-314 */ }

// Move asset helper types
pub struct AssetBalanceInfo { /* lines 1315-1340 */ }
pub struct TokenBalance { /* lines 1342-1349 */ }
pub struct AssetSymbol { /* lines 1351-1355 */ }
```

### Step 5: Extract Permission Types

File: `daopad_backend/src/types/orbit_types/permissions.rs` (NEW - 250 lines)
```rust
// PSEUDOCODE
use super::users::UserSpecifier;
use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;

// Move resource types
pub enum ResourceSpecifier { /* lines 547-552 */ }
pub enum ResourceAction { /* lines 554-564 */ }
pub enum Resource { /* lines 626-639 */ }

// Move action types
pub enum ExternalCanisterAction { /* lines 566-577 */ }
pub enum PermissionAction { /* lines 586-590 */ }
pub enum SystemAction { /* lines 592-599 */ }
pub enum RequestAction { /* lines 601-605 */ }
pub enum UserAction { /* lines 607-613 */ }
pub enum NotificationAction { /* lines 615-624 */ }

// Move permission structure
pub struct Permission { /* lines 680-685 */ }
pub struct ListPermissionsInput { /* lines 687-691 */ }
pub struct GetPermissionInput { /* lines 693-695 */ }

// Move permission operations
pub struct EditPermissionOperationInput { /* lines 752-758 */ }
pub struct AddPermissionOperationInput { /* lines 760-765 */ }
pub struct RemovePermissionOperationInput { /* lines 767-769 */ }

// Move permission results
pub enum ListPermissionsResult { /* lines 697-707 */ }
pub enum GetPermissionResult { /* lines 709-714 */ }
```

### Step 6: Extract Request Types

File: `daopad_backend/src/types/orbit_types/requests.rs` (NEW - 300 lines)
```rust
// PSEUDOCODE
use super::users::{AddUserOperationInput, EditUserOperationInput};
use super::accounts::{AddAccountOperationInput, EditAccountOperationInput};
use super::assets::{AddAssetOperationInput, EditAssetOperationInput, RemoveAssetOperationInput};
use super::permissions::EditPermissionOperationInput;
use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;

// Move request operations enum
pub enum RequestOperationInput {
    AddUser(AddUserOperationInput),
    EditUser(EditUserOperationInput),
    EditPermission(EditPermissionOperationInput),
    AddAccount(AddAccountOperationInput),
    EditAccount(EditAccountOperationInput),
    AddAsset(AddAssetOperationInput),
    EditAsset(EditAssetOperationInput),
    RemoveAsset(RemoveAssetOperationInput),
}

// Move request types
pub struct CreateRequestInput { /* lines 89-96 */ }
pub struct RequestDTO { /* lines 99-104 */ }
pub enum RequestStatusDTO { /* lines 106-116 */ }
pub struct RequestCallerPrivilegesDTO { /* lines 118-122 */ }
pub struct RequestAdditionalInfoDTO { /* lines 124-128 */ }

// Move request response types
pub struct CreateRequestResponse { /* lines 130-135 */ }
pub enum CreateRequestResult { /* lines 137-142 */ }
pub enum RequestExecutionSchedule { /* lines 84-86 */ }

// Move transfer types (they're request-related)
pub struct TransferOperationInput { /* lines 144-154 */ }
pub struct TransferMetadata { /* lines 156-160 */ }

// Move request policy types
pub enum RequestPolicyRule { /* lines 337-348 */ }
pub struct RequestPolicy { /* lines 1221-1226 */ }
pub struct RequestPolicyInfo { /* lines 1307-1310 */ }

// Move quorum types
pub struct QuorumPercentage { /* lines 325-329 */ }
pub struct Quorum { /* lines 331-335 */ }
```

### Step 7: Extract System Types

File: `daopad_backend/src/types/orbit_types/system.rs` (NEW - 150 lines)
```rust
// PSEUDOCODE
use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;

// Move system info types
pub struct SystemInfo { /* lines 491-502 */ }
pub struct SystemInfoMinimal { /* lines 1271-1281 */ }
pub struct DisasterRecovery { /* lines 504-508 */ }
pub struct DisasterRecoveryCommittee { /* lines 510-514 */ }
pub enum CycleObtainStrategy { /* lines 516-527 */ }

// Move system results
pub enum SystemInfoResult { /* lines 529-533 */ }
pub struct SystemInfoResponse { /* lines 535-540 */ }

// Move UUID type alias
pub type UUID = String; // Format: "00000000-0000-4000-8000-000000000000"

// Move auth scope
pub enum AuthScope { /* lines 443-448 */ }
pub struct Allow { /* lines 450-456 */ }

// Move network types
pub struct NetworkInput { /* lines 162-167 */ }
pub struct JoinMemberResponse { /* lines 169-176 */ }

// Move error type
pub struct Error { /* lines 178-194 */ }
```

### Step 8: Extract External Canister Types

File: `daopad_backend/src/types/orbit_types/external_canisters.rs` (NEW - 250 lines)
```rust
// PSEUDOCODE
use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;

// Move external canister types
pub struct ExternalCanister { /* lines 793-804 */ }
pub struct DefiniteCanisterSettings { /* lines 806-813 */ }
pub struct LogVisibility { /* lines 815-819 */ }
pub enum ExternalCanisterState { /* lines 821-826 */ }
pub struct ExternalCanisterCallerPrivileges { /* lines 828-832 */ }

// Move external canister operations
pub struct CreateExternalCanisterOperationInput { /* lines 834-854 */ }
pub struct ChangeExternalCanisterOperationInput { /* lines 916-928 */ }
pub struct ConfigureExternalCanisterOperationInput { /* lines 930-936 */ }

// Move external canister call types
pub struct CallExternalCanisterOperationInput { /* lines 856-866 */ }
pub enum CanisterInstallMode { /* lines 868-872 */ }
pub enum WasmModuleExtraChunks { /* lines 874-878 */ }

// Move external canister results
pub enum CreateExternalCanisterResult { /* lines 880-885 */ }
pub enum ListExternalCanistersResult { /* lines 1134-1144 */ }

// Move validation response types
pub enum ValidationMethodResourceTarget { /* lines 1069-1076 */ }
pub enum RequestOperationDTO { /* lines 1078-1115 */ }

// Security bypass detection types
pub enum SystemRestoreTarget { /* lines 645-649 */ }
pub struct AddressBookMetadata { /* lines 652-657 */ }
pub struct CanisterMethod { /* lines 659-663 */ }
pub enum CallExternalCanisterResourceTarget { /* lines 665-670 */ }
pub enum SnapshotOperation { /* lines 672-678 */ }
```

### Step 9: Update Main orbit.rs File

File: `daopad_backend/src/types/orbit.rs` (MODIFY - 50 lines remaining)
```rust
// PSEUDOCODE
//! Orbit Station type definitions
//!
//! This module re-exports all Orbit-related types from domain-specific submodules.
//! For new code, prefer importing from specific modules:
//! - `orbit_types::users` - User and group management
//! - `orbit_types::accounts` - Treasury accounts and balances
//! - `orbit_types::assets` - Asset definitions and operations
//! - `orbit_types::permissions` - Permissions and resources
//! - `orbit_types::requests` - Requests and operations
//! - `orbit_types::system` - System info and settings
//! - `orbit_types::external_canisters` - External canister management

pub mod orbit_types;

// Re-export everything for backward compatibility
// This allows existing code with `use crate::types::orbit::*` to keep working
pub use orbit_types::users::*;
pub use orbit_types::accounts::*;
pub use orbit_types::assets::*;
pub use orbit_types::permissions::*;
pub use orbit_types::requests::*;
pub use orbit_types::system::*;
pub use orbit_types::external_canisters::*;

// Keep any types that don't fit cleanly in other modules here
// (Should be minimal - maybe pagination types)
use candid::{CandidType, Deserialize};
use serde::Serialize;

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct PaginationInput {
    pub offset: Option<u64>,
    pub limit: Option<u64>,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct PaginationInputMinimal {
    pub offset: u64,
    pub limit: u64,
}

// Named rules (could go in permissions, but used across domains)
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct NamedRule {
    pub id: String,
    pub name: String,
    pub description: String,
    pub rule: RequestPolicyRule,
}
```

### Step 10: Update types/mod.rs

File: `daopad_backend/src/types/mod.rs` (MODIFY)
```rust
// PSEUDOCODE
pub mod governance;
pub mod kong_locker;
pub mod orbit;
pub mod orbit_types; // Add new module
pub mod storage;
```

## Testing Strategy

```bash
# Build to verify no compilation errors
cargo build --target wasm32-unknown-unknown --release -p daopad_backend

# Extract candid to ensure types are still exported correctly
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Deploy backend
./deploy.sh --network ic --backend-only

# Sync declarations
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# Test core operations still work
dfx canister --network ic call daopad_backend list_users '()'
dfx canister --network ic call daopad_backend list_accounts '()'
```

## Migration Path for Future

After this PR lands, gradually migrate imports:
```rust
// OLD (still works due to re-exports)
use crate::types::orbit::*;

// NEW (preferred - more specific)
use crate::types::orbit_types::users::{User, UserStatus};
use crate::types::orbit_types::accounts::{Account, AccountBalance};
```

## Exit Criteria

- ✅ All code compiles without errors
- ✅ `orbit.rs` reduced from 1,508 to ~50 lines (97% reduction!)
- ✅ No module exceeds 300 lines
- ✅ Clear domain separation
- ✅ Backend builds and deploys successfully
- ✅ All existing imports still work (backward compatible)

## Risk Mitigation

- **Import Hell**: Re-export everything from orbit.rs maintains compatibility
- **Circular Dependencies**: Careful module structure with clear hierarchy
- **Missing Types**: Use grep to verify all types are moved
- **Compile Errors**: Fix imports incrementally, module by module

## Expected Outcome

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Largest file | 1,508 lines | 300 lines | 80% reduction |
| File count | 1 | 8 | Better organization |
| Types per file | 172 | ~25 | 86% reduction |
| Import clarity | `use orbit::*` | Domain-specific | Much clearer |
| Compile impact | Everything recompiles | Domain isolation | Faster builds |
| Total LOC | 1,508 | 1,760 | +16% (acceptable) |

## Why This Matters

- **17 files** currently import this god object
- Every change to ANY type causes EVERYTHING to recompile
- Can't understand what types belong to what domain
- Merge conflicts on this file affect everyone
- After refactor: Changes to user types won't recompile asset code

## Next Steps After This PR

This refactoring enables:
1. Gradual migration to specific imports
2. Unit tests for type conversions
3. Better type safety with domain boundaries
4. Foundation for further backend improvements