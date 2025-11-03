# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-security-refactor/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-security-refactor/src/daopad`
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
   git commit -m "refactor: Break up orbit_security.rs (2053 lines) into 5 focused modules"
   git push -u origin feature/refactor-orbit-security
   gh pr create --title "Refactor: Break up orbit_security.rs god file into focused modules" --body "Implements PHASE1_REFACTOR_SECURITY.md"
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

**Branch:** `feature/refactor-orbit-security`
**Worktree:** `/home/theseus/alexandria/daopad-security-refactor/src/daopad`

---

# Implementation Plan: Break Up orbit_security.rs

## Current State

**File**: `daopad_backend/src/api/orbit_security.rs`
- **Lines**: 2,053 (LARGEST FILE IN CODEBASE)
- **Endpoints**: 20 `#[ic_cdk::update]` functions
- **Mixed Concerns**:
  - API endpoints (lines 117-268, 1171-1484)
  - Data fetching (lines 281-340, 1441-1547)
  - Business logic (lines 353-1169, 1382-1440)
  - Utility functions (lines 1548-1946)
  - Dashboard orchestration (lines 1949-2053)

**Functions by Category**:
1. **Check Endpoints** (16 endpoints): admin_control, treasury_control, governance_permissions, etc.
2. **Fetch Functions** (5): fetch_users, fetch_permissions, fetch_policies, fetch_system_info, fetch_accounts
3. **Implementation Functions** (16): check_*_impl functions with business logic
4. **Utility Functions** (15): format_resource, format_user_action, analyze_policy_rule, etc.
5. **Dashboard Functions** (2): perform_all_security_checks, perform_security_check

## Target State

Break into 5 focused modules in the SAME `api/` directory:
```
daopad_backend/src/api/
├── orbit_security.rs              (150 lines) - Just endpoints, delegates to modules
├── security/
│   ├── mod.rs                      (20 lines)  - Module exports
│   ├── admin_checks.rs             (400 lines) - Admin control & backend status
│   ├── governance_checks.rs        (450 lines) - Permissions & policy checks
│   ├── treasury_checks.rs          (400 lines) - Asset & account security
│   ├── system_checks.rs            (400 lines) - External canisters & system config
│   └── security_utils.rs           (350 lines) - Shared utilities & risk analysis
```

**Net Change**: +117 lines (2053 → 2170) - Small increase from module structure, but MUCH more maintainable

## Implementation Steps

### Step 1: Create Module Structure

Create directory and mod.rs:
```rust
// daopad_backend/src/api/security/mod.rs
// PSEUDOCODE
pub mod admin_checks;
pub mod governance_checks;
pub mod treasury_checks;
pub mod system_checks;
pub mod security_utils;

// Re-export commonly used types
pub use security_utils::{SecurityCheck, CheckStatus, Severity, EnhancedSecurityDashboard};
```

### Step 2: Extract Admin Checks Module

File: `daopad_backend/src/api/security/admin_checks.rs` (NEW - 400 lines)
```rust
// PSEUDOCODE
use super::security_utils::{SecurityCheck, CheckStatus, Severity, create_check};
use crate::types::orbit::{UserDTO, ListUsersInput, ListUsersResult};
use candid::Principal;

const ADMIN_GROUP_ID: &str = "00000000-0000-4000-8000-000000000000";
const OPERATOR_GROUP_ID: &str = "00000000-0000-4000-8000-000000000001";

// Move fetch_users here
pub async fn fetch_users(station_id: Principal) -> Result<Vec<UserDTO>, String> {
    // Move lines 281-298 here
}

// Move check_admin_control_layer here
pub fn check_admin_control_layer(users: &Vec<UserDTO>, backend_principal: Principal) -> Vec<SecurityCheck> {
    // Move lines 353-463 here
}

// Add new orchestration function
pub async fn check_admin_control(station_id: Principal, backend_principal: Principal) -> Result<Vec<SecurityCheck>, String> {
    let users = fetch_users(station_id).await?;
    Ok(check_admin_control_layer(&users, backend_principal))
}
```

### Step 3: Extract Governance Checks Module

File: `daopad_backend/src/api/security/governance_checks.rs` (NEW - 450 lines)
```rust
// PSEUDOCODE
use super::security_utils::{SecurityCheck, CheckStatus, Severity, create_check};
use crate::types::orbit::{Permission, RequestPolicy, RequestPolicyRule};

// Move fetch_permissions here
pub async fn fetch_permissions(station_id: Principal) -> Result<PermissionsData, String> {
    // Move lines 299-323 here
}

// Move fetch_policies here
pub async fn fetch_policies(station_id: Principal) -> Result<Vec<RequestPolicy>, String> {
    // Move lines 324-339 here
}

// Move check_governance_permissions_impl here
pub fn check_governance_permissions_impl(permissions: &Vec<Permission>, user_groups: &HashMap<Principal, Vec<String>>) -> Vec<SecurityCheck> {
    // Move lines 523-605 here
}

// Move check_proposal_policies_impl here
pub fn check_proposal_policies_impl(policies: &Vec<RequestPolicy>) -> Vec<SecurityCheck> {
    // Move lines 606-694 here
}

// Move check_permission_by_resource helper
fn check_permission_by_resource<F>(permissions: &Vec<Permission>, ...) -> Option<SecurityCheck> {
    // Move lines 1691-1758 here
}
```

### Step 4: Extract Treasury Checks Module

File: `daopad_backend/src/api/security/treasury_checks.rs` (NEW - 400 lines)
```rust
// PSEUDOCODE
use super::security_utils::{SecurityCheck, CheckStatus, Severity, create_check};
use crate::types::orbit::{AccountMinimal, Permission};

// Move fetch_accounts here
pub async fn fetch_accounts(station_id: Principal) -> Result<Vec<AccountMinimal>, String> {
    // Move lines 1441-1470 here
}

// Move check_treasury_control_impl here
pub fn check_treasury_control_impl(permissions: &Vec<Permission>, user_groups: &HashMap<Principal, Vec<String>>) -> Vec<SecurityCheck> {
    // Move lines 464-522 here
}

// Move check_asset_management_impl here
pub fn check_asset_management_impl(permissions: &Vec<Permission>, user_groups: &HashMap<Principal, Vec<String>>) -> Vec<SecurityCheck> {
    // Move lines 742-788 here
}

// Move check_account_autoapproved_impl here
pub fn check_account_autoapproved_impl(accounts: &Vec<AccountMinimal>) -> Vec<SecurityCheck> {
    // Move lines 1392-1440 here
}
```

### Step 5: Extract System Checks Module

File: `daopad_backend/src/api/security/system_checks.rs` (NEW - 400 lines)
```rust
// PSEUDOCODE
use super::security_utils::{SecurityCheck, CheckStatus, Severity, create_check};
use crate::types::orbit::{SystemInfoMinimal, Permission};

// Move fetch_system_info here
pub async fn fetch_system_info(station_id: Principal) -> Result<SystemInfoMinimal, String> {
    // Move lines 340-352 here
}

// Move check_external_canister_control_impl here
pub fn check_external_canister_control_impl(permissions: &Vec<Permission>, user_groups: &HashMap<Principal, Vec<String>>) -> Vec<SecurityCheck> {
    // Move lines 695-741 here
}

// Move check_system_configuration_impl here
pub fn check_system_configuration_impl(system_info: &SystemInfoMinimal, permissions: &Vec<Permission>, user_groups: &HashMap<Principal, Vec<String>>) -> Vec<SecurityCheck> {
    // Move lines 789-838 here
}

// Move all the new critical checks here
pub fn check_controller_manipulation_impl(...) -> Vec<SecurityCheck> {
    // Move lines 867-902 here
}
// And other system-level checks...
```

### Step 6: Extract Security Utils Module

File: `daopad_backend/src/api/security/security_utils.rs` (NEW - 350 lines)
```rust
// PSEUDOCODE
use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;

// Move all type definitions here
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum CheckStatus { Pass, Warn, Fail, Error }

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum Severity { None, Low, Medium, High, Critical }

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct SecurityCheck { /* lines 50-59 */ }

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct EnhancedSecurityDashboard { /* lines 62-71 */ }

// Move RiskWeights struct here (lines 74-112)

// Move all format_* functions here
pub fn format_resource_for_reference(resource: &Resource) -> String {
    // Move lines 1759-1774 here
}

pub fn format_resource_action(action: &ResourceAction) -> String {
    // Move lines 1775-1786 here
}

// Move risk calculation here
pub fn calculate_risk_score(checks: &Vec<SecurityCheck>) -> (u8, String, Vec<SecurityCheck>, Vec<String>) {
    // Move lines 1949-2026 here
}

// Move dashboard building here
pub fn build_dashboard(station_id: Principal, checks: Vec<SecurityCheck>) -> Result<EnhancedSecurityDashboard, String> {
    // Move lines 2027-2053 here
}

// Add helper to create checks consistently
pub fn create_check(category: &str, name: &str, status: CheckStatus, message: String, severity: Option<Severity>) -> SecurityCheck {
    SecurityCheck {
        category: category.to_string(),
        name: name.to_string(),
        status,
        message,
        severity,
        details: None,
        recommendation: None,
        related_permissions: None,
    }
}
```

### Step 7: Refactor Main orbit_security.rs File

File: `daopad_backend/src/api/orbit_security.rs` (MODIFY - 150 lines remaining)
```rust
// PSEUDOCODE
use candid::Principal;
use ic_cdk;

// Import all submodules
mod security;
use security::{
    admin_checks, governance_checks, treasury_checks, system_checks, security_utils,
    SecurityCheck, EnhancedSecurityDashboard
};

// API ENDPOINTS ONLY - Each delegates to appropriate module

#[ic_cdk::update]
pub async fn check_admin_control(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let backend_principal = ic_cdk::id();
    admin_checks::check_admin_control(station_id, backend_principal).await
}

#[ic_cdk::update]
pub async fn check_treasury_control(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = governance_checks::fetch_permissions(station_id).await?;
    Ok(treasury_checks::check_treasury_control_impl(&perms_data.permissions, &perms_data.user_groups))
}

#[ic_cdk::update]
pub async fn check_governance_permissions(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = governance_checks::fetch_permissions(station_id).await?;
    Ok(governance_checks::check_governance_permissions_impl(&perms_data.permissions, &perms_data.user_groups))
}

// ... Continue for all 20 endpoints, each just 3-5 lines ...

#[ic_cdk::update]
pub async fn perform_security_check(station_id: Principal) -> Result<EnhancedSecurityDashboard, String> {
    // Orchestrate all checks
    let mut all_checks = vec![];

    // Call each module's checks
    all_checks.extend(check_admin_control(station_id).await?);
    all_checks.extend(check_treasury_control(station_id).await?);
    all_checks.extend(check_governance_permissions(station_id).await?);
    // ... etc ...

    security_utils::build_dashboard(station_id, all_checks)
}
```

### Step 8: Update api/mod.rs

File: `daopad_backend/src/api/mod.rs` (MODIFY)
```rust
// PSEUDOCODE
// Add new security module
pub mod security;

// Existing exports remain the same
pub use orbit_security::*;  // Still exports all the endpoints
```

## Testing Strategy

```bash
# Build and extract candid
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Deploy backend
./deploy.sh --network ic --backend-only

# Sync declarations
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# Test all security endpoints still work
dfx canister --network ic call daopad_backend check_admin_control '(principal "fec7w-zyaaa-aaaaa-qaffq-cai")'
dfx canister --network ic call daopad_backend perform_security_check '(principal "fec7w-zyaaa-aaaaa-qaffq-cai")'

# Verify identical behavior to before refactoring
```

## Exit Criteria

- ✅ All 20 security endpoints still work identically
- ✅ `orbit_security.rs` reduced from 2053 to ~150 lines
- ✅ No file exceeds 450 lines
- ✅ Clear separation of concerns (endpoints/data/logic/utils)
- ✅ Backend builds and deploys successfully
- ✅ All existing tests pass

## Risk Mitigation

- **Import Issues**: Test each module compiles independently before final integration
- **Missing Functions**: Use `grep` to ensure all functions are moved, not lost
- **Circular Dependencies**: Keep utilities separate, data flows down only
- **Breaking Changes**: API surface remains identical, only internal structure changes

## Expected Outcome

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Largest file | 2,053 lines | 450 lines | 78% reduction |
| File count | 1 | 6 | Better organization |
| Functions per file | 60 | ~10 | 83% reduction |
| Merge conflicts | High | Low | Isolated changes |
| Testability | Poor | Good | Can test modules |
| Total LOC | 2,053 | 2,170 | +5.7% (acceptable for structure) |

## Next Steps After This PR

This refactoring enables future improvements:
1. Extract common Orbit client patterns (Phase 2)
2. Add unit tests for each module (Phase 2)
3. Apply same pattern to other god files (Phase 2-3)