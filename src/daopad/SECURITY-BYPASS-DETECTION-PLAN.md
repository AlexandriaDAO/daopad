# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-security-bypass-detection/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-security-bypass-detection/src/daopad`
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
   git commit -m "feat: Add comprehensive security bypass detection"
   git push -u origin feature/security-bypass-detection
   gh pr create --title "Security: Comprehensive Bypass Detection for DAO Governance" --body "Implements SECURITY-BYPASS-DETECTION-PLAN.md

Closes 9 critical security gaps in governance bypass detection:
- P0: Controller manipulation via NativeSettings
- P0: Unrestricted external canister method calls
- P1: SystemRestore time-travel attacks
- P1: AddressBook whitelist injection
- P1: MonitorExternalCanister cycle drain
- P2: Snapshot operation state manipulation
- P2: NamedRule indirect bypasses
- P2: Remove operation governance gaps
- P3: Controller audit for added canisters

See plan for full details and testing methodology."
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

**Branch:** `feature/security-bypass-detection`
**Worktree:** `/home/theseus/alexandria/daopad-security-bypass-detection/src/daopad`

---

# Implementation Plan: Comprehensive Security Bypass Detection

## Executive Summary

**Task Type:** NEW FEATURE (additive security checks)

**Goal:** Detect 9 critical bypass scenarios that allow users to circumvent DAO governance without admin approval.

**Priority:** P0 - These are governance-breaking vulnerabilities that could allow complete takeover of treasury and controlled canisters.

---

## Current State Documentation

### Existing Security Check Architecture

**File:** `daopad_backend/src/api/orbit_security.rs` (1132 lines)

**Current Checks (8 categories):**
1. ✅ `check_admin_control` - User counts, backend admin status (lines 252-352)
2. ✅ `check_treasury_control` - Account/Asset Transfer/Create/Update (lines 354-411)
3. ✅ `check_governance_permissions` - Permission/Policy/User/Group management (lines 413-494)
4. ✅ `check_proposal_policies` - AutoApproval, bypass detection (lines 496-566)
5. ✅ `check_external_canisters` - Create/Change/Fund (lines 568-613)
6. ✅ `check_asset_management` - Create/Update/Delete (lines 615-660)
7. ✅ `check_system_configuration` - Upgrade, ManageSystemInfo, DR (lines 662-725)
8. ✅ `check_operational_permissions` - Request visibility (lines 727-752)

**Helper Functions:**
- `check_permission_by_resource` (lines 881-935) - Generic permission checker
- `analyze_policy_rule` (lines 943-1013) - Recursive policy analysis
- `analyze_quorum_approvers` (lines 1016-1044) - Approver validation

**Types:** `daopad_backend/src/types/orbit.rs` (1113 lines)
- Current: Basic Orbit types (User, Permission, RequestPolicy, etc.)
- Missing: Advanced operation types needed for new checks

---

## Security Gaps Discovered

### P0 - CRITICAL (Immediate Takeover)

#### 1. Controller Manipulation Bypass
**File:** Orbit spec line 784
```rust
ConfigureExternalCanisterOperationKind::NativeSettings {
  controllers: opt vec principal,  // ❌ Can add/remove controllers!
}
```
**Impact:** User with `ExternalCanister.Change` can add themselves as controller → complete canister control
**Current Detection:** Only checks if non-admins have Change permission
**Missing:** Warning that Change includes controller modification

#### 2. CallExternalCanister Unrestricted Access
**File:** Orbit spec lines 888-913
```rust
CallExternalCanisterOperationInput {
  execution_method: CanisterMethod,  // ❌ ANY method!
  arg: opt blob,  // ❌ ANY arguments!
}
```
**Impact:** Direct method calls bypass treasury governance (e.g., call `transfer()` on token canister)
**Current Detection:** None
**Missing:** Check for CallExternalCanister permissions

### P1 - HIGH (Governance Bypass)

#### 3. SystemRestore Time-Travel Attack
**File:** Orbit spec lines 625-639
```rust
SystemRestoreOperationInput {
  target: SystemRestoreTarget,  // RestoreStation or RestoreUpgrader
  snapshot_id: text,
}
```
**Impact:** Revert entire Station state → reverse executed transfers
**Current Detection:** None
**Missing:** Check for SystemRestore permissions

#### 4. AddressBook Whitelist Injection
**File:** Orbit spec lines 96-97, 440-454
```rust
RequestPolicyRule::AllowListedByMetadata(metadata)
AddAddressBookEntryOperationInput {
  metadata: vec AddressBookMetadata,
}
```
**Impact:** User adds their address with matching metadata → bypasses transfer approval
**Current Detection:** None
**Missing:** Correlation check between AllowListed policies and AddressBook permissions

#### 5. MonitorExternalCanister Cycle Drain
**File:** Orbit spec lines 866-874
```rust
MonitorExternalCanisterOperationInput {
  kind: Start { funding_strategy: Always(10_000_000_000_000) }  // Auto-fund forever!
}
```
**Impact:** Automatic recurring cycle transfers without approval
**Current Detection:** Only one-time Fund permission
**Missing:** Monitor permission check

### P2 - MEDIUM (State Manipulation)

#### 6. Snapshot Operations
**File:** Orbit spec lines 935-974
- `SnapshotExternalCanister` - Force snapshots
- `RestoreExternalCanister` - Restore to compromised state
- `PruneExternalCanister` - Delete evidence
**Impact:** State manipulation of controlled canisters
**Current Detection:** None

#### 7. NamedRule Indirect Bypass
**File:** Orbit spec line 101, lines 1093-1098
```rust
RequestPolicyRule::NamedRule(UUID)
AddNamedRuleOperation / EditNamedRuleOperation
```
**Impact:** Change `NamedRule` from strict to `AutoApproved` → all policies using it bypass
**Current Detection:** None
**Missing:** Named rule management permission check

#### 8. Remove Operation Gaps
**File:** Orbit spec - multiple RemoveXxx operations
- `RemoveAsset` - Break accounts
- `RemoveUserGroup` - Orphan permissions
- `RemoveRequestPolicy` - Leave operations unprotected
- `RemoveNamedRule` - Break policies
**Impact:** DoS or governance holes
**Current Detection:** None

### P3 - LOW (Audit Gaps)

#### 9. Controller Audit for Added Canisters
**File:** Orbit spec lines 708-717
```rust
CreateExternalCanisterOperationKind::AddExisting {
  canister_id: principal,
}
```
**Impact:** Claim Station controls canister when other controllers exist
**Current Detection:** None

---

## Implementation Plan (Pseudocode)

### Phase 1: Backend Type Additions

**File:** `daopad_backend/src/types/orbit.rs` (MODIFY)

```rust
// PSEUDOCODE - Add missing types after line 517

// ===== SYSTEM RESTORE TYPES =====
#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum SystemRestoreTarget {
    RestoreStation,
    RestoreUpgrader,
}

// ===== ADDRESSBOOK TYPES (for correlation checks) =====
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct AddressBookMetadata {
    pub key: String,
    pub value: String,
}

// ===== EXTERNAL CANISTER CALL TYPES =====
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct CanisterMethod {
    pub canister_id: Principal,
    pub method_name: String,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum CallExternalCanisterResourceTarget {
    Any,
    Canister(Principal),
}

// ===== MONITORING TYPES =====
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum MonitoringStrategy {
    Always(u64),  // Cycles per funding
    BelowThreshold { min_cycles: u64 },
}

// ===== NAMED RULE TYPES =====
// Already have NamedRule(UUID) in RequestPolicyRule
// Just need to track operations

// ===== SNAPSHOT TYPES =====
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum SnapshotOperation {
    Snapshot,
    Restore,
    Prune,
}

// Update ResourceAction to include these new actions
// Update ExternalCanisterAction enum:
#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum ExternalCanisterAction {
    Create,
    Change(ExternalCanisterSpecifier),
    Configure(ExternalCanisterSpecifier),  // NEW - for NativeSettings
    Fund(ExternalCanisterSpecifier),
    Call(ExternalCanisterSpecifier),  // NEW - method calls
    Monitor(ExternalCanisterSpecifier),  // NEW - auto-funding
    Snapshot(ExternalCanisterSpecifier),  // NEW - snapshots
    Read(ExternalCanisterSpecifier),
    List,
}

// Update SystemAction enum:
#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum SystemAction {
    ManageSystemInfo,
    Upgrade,
    Restore,  // NEW - system restore
    Capabilities,
    SystemInfo,
}

// Update ResourceAction enum:
#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum ResourceAction {
    Create,
    Update(ResourceSpecifier),
    Delete(ResourceSpecifier),
    Read(ResourceSpecifier),
    Transfer(ResourceSpecifier),
    Remove(ResourceSpecifier),  // NEW - distinguish from Delete
    List,
}

// Add AddressBookAction enum:
#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum AddressBookAction {
    Create,
    Update(ResourceSpecifier),
    Remove(ResourceSpecifier),
    Read(ResourceSpecifier),
    List,
}

// Update Resource enum to include:
pub enum Resource {
    // ... existing variants ...
    AddressBook(AddressBookAction),  // Make sure this uses AddressBookAction
    NamedRule(ResourceAction),  // NEW - named rule management
}
```

### Phase 2: New Security Check Functions

**File:** `daopad_backend/src/api/orbit_security.rs` (MODIFY)

```rust
// PSEUDOCODE - Add after line 752 (after check_operational_permissions_impl)

// ===== CHECK CATEGORY 9: CONTROLLER MANIPULATION =====

fn check_controller_manipulation_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<crate::types::orbit::UserGroup>
) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Check ExternalCanister.Change permission
    // This is CRITICAL because Change includes NativeSettings which can modify controllers
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Controller Manipulation",
        "External Canister Change Access (includes controller modification)",
        |resource| matches!(resource, Resource::ExternalCanister(ExternalCanisterAction::Change(_))),
        Severity::Critical,
        "Non-admin groups can change external canister settings INCLUDING CONTROLLERS - allows complete canister takeover",
        "Restrict ExternalCanister.Change to Admin group only, or explicitly check NativeSettings operations",
    ));

    // Check ExternalCanister.Configure permission (if we distinguish it)
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Controller Manipulation",
        "External Canister Configure Access",
        |resource| matches!(resource, Resource::ExternalCanister(ExternalCanisterAction::Configure(_))),
        Severity::Critical,
        "Non-admin groups can configure external canister native settings including controllers",
        "Restrict ExternalCanister.Configure to Admin group only",
    ));

    checks
}

// ===== CHECK CATEGORY 10: EXTERNAL CANISTER CALLS =====

fn check_external_canister_calls_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<crate::types::orbit::UserGroup>
) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Check CallExternalCanister permission - HIGH RISK
    // Users can call ANY method with ANY arguments on controlled canisters
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "External Canister Execution",
        "External Canister Call Access",
        |resource| matches!(resource, Resource::ExternalCanister(ExternalCanisterAction::Call(_))),
        Severity::Critical,
        "Non-admin groups can execute arbitrary methods on external canisters - can bypass treasury governance",
        "Restrict CallExternalCanister to Admin group, or use granular per-method permissions",
    ));

    checks
}

// ===== CHECK CATEGORY 11: SYSTEM RESTORE =====

fn check_system_restore_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<crate::types::orbit::UserGroup>
) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Check System.Restore permission - TIME TRAVEL ATTACK
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "System Restore",
        "System Restore Access",
        |resource| matches!(resource, Resource::System(SystemAction::Restore)),
        Severity::Critical,
        "Non-admin groups can restore Station to previous snapshot - allows reversing executed operations",
        "Restrict System.Restore to Admin group only",
    ));

    checks
}

// ===== CHECK CATEGORY 12: ADDRESSBOOK WHITELIST INJECTION =====

fn check_addressbook_injection_impl(
    permissions: &Vec<Permission>,
    policies: &Vec<crate::types::orbit::RequestPolicy>,
    user_groups: &Vec<crate::types::orbit::UserGroup>
) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // First, check if any policies use AllowListedByMetadata
    let has_allowlisted_policies = policies.iter().any(|policy| {
        policy_uses_allowlisted_metadata(&policy.rule)
    });

    if !has_allowlisted_policies {
        // No AllowListed policies, so this attack vector doesn't apply
        checks.push(SecurityCheck {
            category: "AddressBook Injection".to_string(),
            name: "Whitelist Policy Detection".to_string(),
            status: CheckStatus::Pass,
            message: "No AllowListed policies detected".to_string(),
            severity: Some(Severity::None),
            details: None,
            recommendation: None,
        });
        return checks;
    }

    // If AllowListed policies exist, check AddressBook.Create permission
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "AddressBook Injection",
        "AddressBook Creation with AllowListed Policies",
        |resource| matches!(resource, Resource::AddressBook(AddressBookAction::Create)),
        Severity::High,
        "Non-admin groups can create address book entries that match AllowListed metadata - bypasses transfer approval",
        "Either: (1) Restrict AddressBook.Create to Admin, or (2) Remove AllowListedByMetadata policies",
    ));

    checks
}

fn policy_uses_allowlisted_metadata(rule: &RequestPolicyRule) -> bool {
    // PSEUDOCODE - Recursively check for AllowListedByMetadata
    match rule {
        RequestPolicyRule::AllowListedByMetadata(_) => true,
        RequestPolicyRule::AnyOf(rules) | RequestPolicyRule::AllOf(rules) => {
            rules.iter().any(|r| policy_uses_allowlisted_metadata(r))
        }
        RequestPolicyRule::Not(inner) => policy_uses_allowlisted_metadata(inner),
        _ => false,
    }
}

// ===== CHECK CATEGORY 13: MONITORING CYCLE DRAIN =====

fn check_monitoring_drain_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<crate::types::orbit::UserGroup>
) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Check ExternalCanister.Monitor permission
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Monitoring Cycle Drain",
        "External Canister Monitoring Access",
        |resource| matches!(resource, Resource::ExternalCanister(ExternalCanisterAction::Monitor(_))),
        Severity::High,
        "Non-admin groups can set up automatic cycle funding - enables recurring unauthorized transfers",
        "Restrict ExternalCanister.Monitor to Admin group only",
    ));

    checks
}

// ===== CHECK CATEGORY 14: SNAPSHOT OPERATIONS =====

fn check_snapshot_operations_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<crate::types::orbit::UserGroup>
) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Check Snapshot permission
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Snapshot Operations",
        "External Canister Snapshot Access",
        |resource| matches!(resource, Resource::ExternalCanister(ExternalCanisterAction::Snapshot(_))),
        Severity::Medium,
        "Non-admin groups can snapshot/restore/prune external canisters - enables state manipulation",
        "Restrict snapshot operations to Admin group only",
    ));

    checks
}

// ===== CHECK CATEGORY 15: NAMED RULE BYPASS =====

fn check_named_rule_bypass_impl(
    permissions: &Vec<Permission>,
    policies: &Vec<crate::types::orbit::RequestPolicy>,
    user_groups: &Vec<crate::types::orbit::UserGroup>
) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Check if any policies reference NamedRules
    let has_named_rules = policies.iter().any(|policy| {
        policy_uses_named_rules(&policy.rule)
    });

    if !has_named_rules {
        checks.push(SecurityCheck {
            category: "Named Rule Bypass".to_string(),
            name: "Named Rule Usage Detection".to_string(),
            status: CheckStatus::Pass,
            message: "No policies reference named rules".to_string(),
            severity: Some(Severity::None),
            details: None,
            recommendation: None,
        });
        return checks;
    }

    // If named rules are used, check who can edit them
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Named Rule Bypass",
        "Named Rule Modification with Active Policies",
        |resource| matches!(resource, Resource::NamedRule(ResourceAction::Update(_))),
        Severity::Medium,
        "Non-admin groups can edit named rules used in policies - enables indirect governance bypass",
        "Restrict NamedRule.Update to Admin group only",
    ));

    checks
}

fn policy_uses_named_rules(rule: &RequestPolicyRule) -> bool {
    // PSEUDOCODE - Recursively check for NamedRule references
    match rule {
        RequestPolicyRule::NamedRule(_) => true,
        RequestPolicyRule::AnyOf(rules) | RequestPolicyRule::AllOf(rules) => {
            rules.iter().any(|r| policy_uses_named_rules(r))
        }
        RequestPolicyRule::Not(inner) => policy_uses_named_rules(inner),
        _ => false,
    }
}

// ===== CHECK CATEGORY 16: REMOVE OPERATIONS =====

fn check_remove_operations_impl(
    permissions: &Vec<Permission>,
    user_groups: &Vec<crate::types::orbit::UserGroup>
) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Check Asset.Remove
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Remove Operations",
        "Asset Removal Access",
        |resource| matches!(resource, Resource::Asset(ResourceAction::Remove(_))),
        Severity::Medium,
        "Non-admin groups can remove assets - may break dependent accounts",
        "Restrict Asset.Remove to Admin group only",
    ));

    // Check UserGroup.Remove
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Remove Operations",
        "User Group Removal Access",
        |resource| matches!(resource, Resource::UserGroup(ResourceAction::Remove(_))),
        Severity::Medium,
        "Non-admin groups can remove user groups - may orphan permissions",
        "Restrict UserGroup.Remove to Admin group only",
    ));

    // Check RequestPolicy.Remove
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Remove Operations",
        "Request Policy Removal Access",
        |resource| matches!(resource, Resource::RequestPolicy(ResourceAction::Remove(_))),
        Severity::High,
        "Non-admin groups can remove request policies - may leave operations unprotected",
        "Restrict RequestPolicy.Remove to Admin group only",
    ));

    // Check NamedRule.Remove
    checks.push(check_permission_by_resource(
        permissions,
        user_groups,
        "Remove Operations",
        "Named Rule Removal Access",
        |resource| matches!(resource, Resource::NamedRule(ResourceAction::Remove(_))),
        Severity::Medium,
        "Non-admin groups can remove named rules - may break dependent policies",
        "Restrict NamedRule.Remove to Admin group only",
    ));

    checks
}
```

### Phase 3: Update Endpoints

**File:** `daopad_backend/src/api/orbit_security.rs` (MODIFY)

```rust
// PSEUDOCODE - Add new endpoints after line 171

/// Check controller manipulation: NativeSettings controller changes
#[ic_cdk::update]
pub async fn check_controller_manipulation(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = fetch_permissions(station_id).await.map_err(|e| {
        format!("Failed to fetch permissions: {}", e)
    })?;

    Ok(check_controller_manipulation_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check external canister call permissions
#[ic_cdk::update]
pub async fn check_external_canister_calls(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = fetch_permissions(station_id).await.map_err(|e| {
        format!("Failed to fetch permissions: {}", e)
    })?;

    Ok(check_external_canister_calls_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check system restore permissions
#[ic_cdk::update]
pub async fn check_system_restore(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = fetch_permissions(station_id).await.map_err(|e| {
        format!("Failed to fetch permissions: {}", e)
    })?;

    Ok(check_system_restore_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check addressbook injection with allowlisted policies
#[ic_cdk::update]
pub async fn check_addressbook_injection(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = fetch_permissions(station_id).await?;
    let policies_data = fetch_policies(station_id).await?;

    Ok(check_addressbook_injection_impl(&perms_data.permissions, &policies_data, &perms_data.user_groups))
}

/// Check monitoring cycle drain
#[ic_cdk::update]
pub async fn check_monitoring_drain(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = fetch_permissions(station_id).await?;

    Ok(check_monitoring_drain_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check snapshot operations
#[ic_cdk::update]
pub async fn check_snapshot_operations(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = fetch_permissions(station_id).await?;

    Ok(check_snapshot_operations_impl(&perms_data.permissions, &perms_data.user_groups))
}

/// Check named rule bypass
#[ic_cdk::update]
pub async fn check_named_rule_bypass(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = fetch_permissions(station_id).await?;
    let policies_data = fetch_policies(station_id).await?;

    Ok(check_named_rule_bypass_impl(&perms_data.permissions, &policies_data, &perms_data.user_groups))
}

/// Check remove operations
#[ic_cdk::update]
pub async fn check_remove_operations(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    let perms_data = fetch_permissions(station_id).await?;

    Ok(check_remove_operations_impl(&perms_data.permissions, &perms_data.user_groups))
}
```

### Phase 4: Update Aggregator Methods

**File:** `daopad_backend/src/api/orbit_security.rs` (MODIFY)

```rust
// PSEUDOCODE - Update perform_all_security_checks function (around line 763)

#[ic_cdk::update]
pub async fn perform_all_security_checks(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    // Call all 16 individual checks sequentially (was 8, now 16)

    // Existing 8 checks
    let admin_result = check_admin_control(station_id).await;
    let treasury_result = check_treasury_control(station_id).await;
    let governance_result = check_governance_permissions(station_id).await;
    let policies_result = check_proposal_policies(station_id).await;
    let canisters_result = check_external_canisters(station_id).await;
    let assets_result = check_asset_management(station_id).await;
    let system_result = check_system_configuration(station_id).await;
    let operational_result = check_operational_permissions(station_id).await;

    // NEW: 8 additional checks
    let controller_result = check_controller_manipulation(station_id).await;
    let calls_result = check_external_canister_calls(station_id).await;
    let restore_result = check_system_restore(station_id).await;
    let addressbook_result = check_addressbook_injection(station_id).await;
    let monitoring_result = check_monitoring_drain(station_id).await;
    let snapshot_result = check_snapshot_operations(station_id).await;
    let namedrule_result = check_named_rule_bypass(station_id).await;
    let remove_result = check_remove_operations(station_id).await;

    // Combine all checks
    let mut all_checks = Vec::new();

    // Add existing 8 categories (keep existing error handling)
    // ... existing code ...

    // Add new 8 categories with error handling
    match controller_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Controller Manipulation",
            "Controller Manipulation",
            Severity::Critical,
            e
        )),
    }

    match calls_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "External Canister Calls",
            "External Canister Calls",
            Severity::Critical,
            e
        )),
    }

    match restore_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "System Restore",
            "System Restore",
            Severity::Critical,
            e
        )),
    }

    match addressbook_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "AddressBook Injection",
            "AddressBook Injection",
            Severity::High,
            e
        )),
    }

    match monitoring_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Monitoring Cycle Drain",
            "Monitoring Cycle Drain",
            Severity::High,
            e
        )),
    }

    match snapshot_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Snapshot Operations",
            "Snapshot Operations",
            Severity::Medium,
            e
        )),
    }

    match namedrule_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Named Rule Bypass",
            "Named Rule Bypass",
            Severity::Medium,
            e
        )),
    }

    match remove_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Remove Operations",
            "Remove Operations",
            Severity::Medium,
            e
        )),
    }

    Ok(all_checks)
}
```

### Phase 5: Update Risk Weights

**File:** `daopad_backend/src/api/orbit_security.rs` (MODIFY)

```rust
// PSEUDOCODE - Update RiskWeights struct (around line 61)

struct RiskWeights {
    critical_admin_control: f64,
    critical_treasury: f64,
    critical_governance: f64,
    critical_controller_manipulation: f64,  // NEW
    critical_external_calls: f64,  // NEW
    critical_system_restore: f64,  // NEW
    high_proposal_bypass: f64,
    high_addressbook_injection: f64,  // NEW
    high_monitoring_drain: f64,  // NEW
    medium_external_canisters: f64,
    medium_system_config: f64,
    medium_snapshot_ops: f64,  // NEW
    medium_named_rules: f64,  // NEW
    medium_remove_ops: f64,  // NEW
    low_operational: f64,
}

impl Default for RiskWeights {
    fn default() -> Self {
        RiskWeights {
            critical_admin_control: 25.0,  // Reduced to make room
            critical_treasury: 20.0,
            critical_governance: 15.0,
            critical_controller_manipulation: 15.0,  // NEW - highest risk
            critical_external_calls: 10.0,  // NEW - direct bypass
            critical_system_restore: 10.0,  // NEW - time travel
            high_proposal_bypass: 5.0,
            high_addressbook_injection: 3.0,  // NEW
            high_monitoring_drain: 2.0,  // NEW
            medium_external_canisters: 2.0,
            medium_system_config: 1.0,
            medium_snapshot_ops: 1.0,  // NEW
            medium_named_rules: 1.0,  // NEW
            medium_remove_ops: 1.0,  // NEW
            low_operational: 0.5,
        }
    }
}

// Update calculate_risk_score to handle new severities
// (around line 1060)
fn calculate_risk_score(checks: &Vec<SecurityCheck>) -> (u8, String, Vec<SecurityCheck>, Vec<String>) {
    let weights = RiskWeights::default();
    let mut score = 100.0;
    let mut critical_issues = Vec::new();
    let mut recommended_actions = Vec::new();

    for check in checks {
        // Match check category + severity to apply correct weight
        let deduction = match (&check.category.as_str(), &check.status, &check.severity) {
            // Critical checks
            ("Admin Control", CheckStatus::Fail, Some(Severity::Critical)) => weights.critical_admin_control,
            ("Treasury Control", CheckStatus::Fail, Some(Severity::Critical)) => weights.critical_treasury,
            ("Governance Control", CheckStatus::Fail, Some(Severity::Critical)) => weights.critical_governance,
            ("Controller Manipulation", CheckStatus::Fail, Some(Severity::Critical)) => weights.critical_controller_manipulation,
            ("External Canister Execution", CheckStatus::Fail, Some(Severity::Critical)) => weights.critical_external_calls,
            ("System Restore", CheckStatus::Fail, Some(Severity::Critical)) => weights.critical_system_restore,

            // High checks
            (_, CheckStatus::Fail, Some(Severity::High)) => {
                // Categorize by check name for specific weights
                if check.category.contains("AddressBook") {
                    weights.high_addressbook_injection
                } else if check.category.contains("Monitoring") {
                    weights.high_monitoring_drain
                } else {
                    weights.high_proposal_bypass
                }
            }

            // Medium checks
            (_, CheckStatus::Fail, Some(Severity::Medium)) => {
                if check.category.contains("Snapshot") {
                    weights.medium_snapshot_ops
                } else if check.category.contains("Named Rule") {
                    weights.medium_named_rules
                } else if check.category.contains("Remove") {
                    weights.medium_remove_ops
                } else {
                    weights.medium_external_canisters
                }
            }

            // Warnings
            (_, CheckStatus::Warn, Some(Severity::Low)) => weights.low_operational * 0.5,
            (_, CheckStatus::Warn, _) => weights.medium_system_config * 0.3,

            _ => 0.0,
        };

        score -= deduction;

        // Collect critical issues
        if matches!(check.status, CheckStatus::Fail) &&
           matches!(check.severity, Some(Severity::Critical) | Some(Severity::High)) {
            critical_issues.push(check.clone());
            if let Some(rec) = &check.recommendation {
                if !recommended_actions.contains(rec) {
                    recommended_actions.push(rec.clone());
                }
            }
        }
    }

    score = score.max(0.0).min(100.0);
    let score_u8 = score as u8;

    let summary = if score < 30.0 {
        format!("NOT A DAO - {} critical issues prevent community governance", critical_issues.len())
    } else if score < 60.0 {
        format!("PARTIAL DAO - {} issues allow admin bypass of community", critical_issues.len())
    } else if score < 85.0 {
        "MOSTLY DECENTRALIZED - Minor issues remain".to_string()
    } else {
        "TRUE DAO - Full community governance".to_string()
    };

    (score_u8, summary, critical_issues, recommended_actions)
}
```

### Phase 6: Frontend Service Integration

**File:** `daopad_frontend/src/services/backend/orbit/security/OrbitSecurityService.js` (MODIFY)

```javascript
// PSEUDOCODE - Update performComprehensiveSecurityCheck method

async performComprehensiveSecurityCheck(stationId, onProgress) {
    try {
        // Define all 16 categories (was 8)
        const categories = [
            // Existing 8
            { key: 'admin_control', method: 'check_admin_control' },
            { key: 'treasury_control', method: 'check_treasury_control' },
            { key: 'governance_permissions', method: 'check_governance_permissions' },
            { key: 'proposal_policies', method: 'check_proposal_policies' },
            { key: 'external_canisters', method: 'check_external_canisters' },
            { key: 'asset_management', method: 'check_asset_management' },
            { key: 'system_configuration', method: 'check_system_configuration' },
            { key: 'operational_permissions', method: 'check_operational_permissions' },

            // NEW: 8 additional categories
            { key: 'controller_manipulation', method: 'check_controller_manipulation' },
            { key: 'external_canister_calls', method: 'check_external_canister_calls' },
            { key: 'system_restore', method: 'check_system_restore' },
            { key: 'addressbook_injection', method: 'check_addressbook_injection' },
            { key: 'monitoring_drain', method: 'check_monitoring_drain' },
            { key: 'snapshot_operations', method: 'check_snapshot_operations' },
            { key: 'named_rule_bypass', method: 'check_named_rule_bypass' },
            { key: 'remove_operations', method: 'check_remove_operations' },
        ];

        // Execute all 16 checks sequentially with progress callbacks
        for (const category of categories) {
            const result = await this.actor[category.method](stationId);

            if (onProgress) {
                onProgress({
                    category: category.key,
                    checks: result.Ok || [],
                    completed: true,
                });
            }
        }

        // Get full dashboard with scoring
        const dashboard = await this.actor.perform_security_check(stationId);

        return {
            success: true,
            data: dashboard.Ok,
        };

    } catch (error) {
        console.error('Security check failed:', error);
        return {
            success: false,
            error: error.message,
        };
    }
}
```

### Phase 7: Frontend UI Updates

**File:** `daopad_frontend/src/components/security/SecurityDashboard.jsx` (MODIFY)

```javascript
// PSEUDOCODE - Update progressData state to include new categories

const [progressData, setProgressData] = useState({
    // Existing 8
    admin_control: null,
    treasury_control: null,
    governance_permissions: null,
    proposal_policies: null,
    external_canisters: null,
    asset_management: null,
    system_configuration: null,
    operational_permissions: null,

    // NEW: 8 additional
    controller_manipulation: null,
    external_canister_calls: null,
    system_restore: null,
    addressbook_injection: null,
    monitoring_drain: null,
    snapshot_operations: null,
    named_rule_bypass: null,
    remove_operations: null,
});

// Update loading message from "8 checks" to "16 checks"
// Line 87: change to ({completedCount}/16 checks complete)
```

**File:** `daopad_frontend/src/components/security/DAOTransitionChecklist.jsx` (MODIFY if exists)

```javascript
// PSEUDOCODE - Update category display logic to show new categories with proper labels

const categoryLabels = {
    // Existing
    'admin_control': 'Admin Control',
    'treasury_control': 'Treasury Control',
    'governance_permissions': 'Governance Permissions',
    'proposal_policies': 'Proposal Policies',
    'external_canisters': 'External Canisters',
    'asset_management': 'Asset Management',
    'system_configuration': 'System Configuration',
    'operational_permissions': 'Operational Permissions',

    // NEW
    'controller_manipulation': 'Controller Manipulation (P0)',
    'external_canister_calls': 'External Canister Calls (P0)',
    'system_restore': 'System Restore (P1)',
    'addressbook_injection': 'AddressBook Injection (P1)',
    'monitoring_drain': 'Monitoring Cycle Drain (P1)',
    'snapshot_operations': 'Snapshot Operations (P2)',
    'named_rule_bypass': 'Named Rule Bypass (P2)',
    'remove_operations': 'Remove Operations (P2)',
};

// Group checks by severity for display
const p0Checks = checks.filter(c =>
    c.category.includes('Controller') ||
    c.category.includes('Execution') ||
    c.category.includes('System Restore')
);

const p1Checks = checks.filter(c =>
    c.category.includes('AddressBook') ||
    c.category.includes('Monitoring')
);

const p2Checks = checks.filter(c =>
    c.category.includes('Snapshot') ||
    c.category.includes('Named Rule') ||
    c.category.includes('Remove')
);

// Display in sections: P0 (red), P1 (orange), P2 (yellow)
```

---

## Testing Plan

### Phase 1: Type Compilation
```bash
# In worktree
cargo build --target wasm32-unknown-unknown --release -p daopad_backend

# Expected: Compiles without errors
# If errors: Fix type definitions until clean build
```

### Phase 2: Candid Generation
```bash
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Verify new methods appear:
grep "check_controller_manipulation" daopad_backend/daopad_backend.did
grep "check_external_canister_calls" daopad_backend/daopad_backend.did
grep "check_system_restore" daopad_backend/daopad_backend.did
# ... etc for all 8 new methods
```

### Phase 3: Backend Deployment
```bash
./deploy.sh --network ic --backend-only

# Expected: Deployment succeeds
# Test with dfx:
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai check_controller_manipulation '(principal "fec7w-zyaaa-aaaaa-qaffq-cai")'
# Should return SecurityCheck array
```

### Phase 4: Declaration Sync
```bash
# CRITICAL: Sync frontend declarations
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# Verify:
grep "check_controller_manipulation" daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js
```

### Phase 5: Frontend Build
```bash
npm run build

# Expected: No TypeScript/build errors
# If errors: Check that new methods exist in declarations
```

### Phase 6: Frontend Deployment
```bash
./deploy.sh --network ic --frontend-only

# Visit: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
# Navigate to Security tab
# Expected: Shows "Analyzing DAO security... (0/16 checks complete)"
```

### Phase 7: End-to-End Validation

**Test Station:** `fec7w-zyaaa-aaaaa-qaffq-cai` (ALEX token - has admin access)

#### Test 1: Controller Manipulation Detection
```bash
# Set up test: Grant operator ExternalCanister.Change permission
# Expected: Dashboard shows CRITICAL issue: "Non-admin groups can change external canister settings INCLUDING CONTROLLERS"
```

#### Test 2: CallExternalCanister Detection
```bash
# Set up test: Grant operator CallExternalCanister permission
# Expected: Dashboard shows CRITICAL issue about arbitrary method execution
```

#### Test 3: AddressBook Injection Detection
```bash
# Set up test:
# 1. Create policy with AllowListedByMetadata
# 2. Grant operator AddressBook.Create
# Expected: Dashboard shows HIGH issue about whitelist poisoning
```

#### Test 4: Comprehensive Score Calculation
```bash
# With clean admin-only setup:
# Expected: Score 95-100, "TRUE DAO - Full community governance"

# With all bypass permissions granted:
# Expected: Score < 30, "NOT A DAO - X critical issues prevent community governance"
```

### Phase 8: Regression Testing

**Verify existing checks still work:**
```bash
# 1. Admin count check still works
# 2. Treasury control checks still work
# 3. Governance checks still work
# 4. Score calculation still accurate
# 5. Frontend progress display (now 16 instead of 8)
```

---

## Risk Analysis

### Implementation Risks

**Risk 1: Type Mismatches with Orbit**
- **Mitigation:** Test each permission resource type with dfx before deploying
- **Fallback:** Use existing Resource enum patterns that work

**Risk 2: Performance Degradation (16 checks vs 8)**
- **Impact:** ~2x longer dashboard load time
- **Mitigation:** Already designed with sequential execution + progress UI
- **Acceptable:** Security completeness > speed

**Risk 3: False Positives on Legitimate Permissions**
- **Example:** Station intentionally allows operators to call specific methods
- **Mitigation:** Severity levels (Critical/High/Medium) let users judge context
- **Future:** Add per-method granularity (not in this plan)

**Risk 4: Candid Decode Errors**
- **Cause:** Orbit types don't match our types
- **Mitigation:** Copy EXACT types from orbit-reference spec.did
- **Recovery:** Test with dfx first, fix types, redeploy

### Breaking Changes

**None.** This is purely additive:
- New check functions added
- Existing functions unchanged
- Frontend gracefully handles new categories
- Old checks still work identically

---

## Success Criteria

### Must Have (P0)
- ✅ All 8 new check functions compile and deploy
- ✅ Backend returns SecurityCheck arrays for all new methods
- ✅ Frontend displays 16 categories with progress
- ✅ Score calculation includes new weights
- ✅ No regression on existing 8 checks

### Should Have (P1)
- ✅ Clear severity labeling (P0/P1/P2) in UI
- ✅ Detailed recommendations for each bypass type
- ✅ Correlation checks (AddressBook + AllowListed, NamedRule + policies)

### Nice to Have (P2)
- Per-method CallExternalCanister granularity (future enhancement)
- Controller verification for AddExisting canisters (complex, defer)
- Real-time policy resolution for NamedRules (performance concern)

---

## Rollback Plan

If deployment fails or breaks existing functionality:

```bash
# In worktree
git reset --hard HEAD~1  # Undo last commit
./deploy.sh --network ic  # Redeploy previous version

# In main repo
cd /home/theseus/alexandria/daopad/src/daopad
git worktree remove ../daopad-security-bypass-detection
git branch -D feature/security-bypass-detection
```

---

## Future Enhancements (Out of Scope)

These bypass scenarios are detected but could be enhanced later:

1. **Granular CallExternalCanister** - Check per-method permissions
2. **Controller Audit** - Verify Station is actually controller of added canisters
3. **Policy Deep Resolution** - Resolve NamedRules to their actual rules
4. **Permission Dependency Graph** - Visualize attack paths
5. **Historical Analysis** - Track permission changes over time
6. **Automated Remediation** - One-click "Fix All P0 Issues"

---

## Documentation Updates

After PR approval, update:

1. **CLAUDE.md** - Add bypass detection to security section
2. **README** (if exists) - Mention 16-category security dashboard
3. **Frontend UI** - Add help tooltips explaining each bypass type

---

## Estimated Effort

- **Backend types:** 30 min (straightforward enum additions)
- **Backend checks:** 2 hours (8 new functions, careful copy-paste-adapt)
- **Backend aggregator:** 30 min (extend existing pattern)
- **Frontend service:** 15 min (add categories to array)
- **Frontend UI:** 15 min (update state, labels)
- **Testing:** 1.5 hours (build, deploy, test all scenarios)
- **Documentation:** 30 min (update this plan with results)

**Total:** ~5 hours for complete implementation

---

## Checklist Before Starting Implementation

- [ ] Worktree isolated at `/home/theseus/alexandria/daopad-security-bypass-detection/src/daopad`
- [ ] Read Orbit spec.did for exact type definitions
- [ ] Understand existing check_permission_by_resource pattern
- [ ] Test one new check with dfx before implementing all 8
- [ ] Have rollback plan ready
- [ ] Remember to sync declarations after backend deploy
- [ ] Update frontend progress counter from 8 to 16

---

## Implementation Order

**Critical Path:**
1. Types first (blocks everything else)
2. One check function as proof-of-concept
3. Test that one function end-to-end
4. Implement remaining 7 check functions
5. Update aggregators
6. Frontend integration
7. Full testing
8. Deploy
9. Create PR

**DO NOT:** Implement all 8 checks before testing the first one. Test incrementally.

---

## Final Notes for Implementing Agent

**Your autonomy scope:**
- ✅ Implement exactly as planned (no creativity needed)
- ✅ Fix compilation errors
- ✅ Adjust types if Orbit decode fails (test with dfx first)
- ✅ Create PR immediately after deployment succeeds
- ❌ Don't ask permission to proceed
- ❌ Don't skip PR creation
- ❌ Don't add features beyond this plan

**If you encounter blockers:**
1. Try to fix (max 30 min)
2. Document the blocker in PR description
3. Create PR anyway marking as draft
4. Escalate to human via PR comment

**Remember:** The goal is comprehensive bypass detection, not perfection. Ship it, get feedback, iterate.

---

END OF PLAN
