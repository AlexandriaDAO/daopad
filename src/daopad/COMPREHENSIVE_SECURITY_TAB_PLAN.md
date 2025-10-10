# Comprehensive Security Tab & DAO Transition Analysis Plan

## Executive Summary

**Goal:** Transform the Security tab into a comprehensive DAO decentralization analysis tool that helps users "find the cracks" - identifying every centralization risk and showing a clear path to full decentralization.

**Current State:** 4 basic checks (Admin Control, Group Permissions, Request Policies, System Settings)
**Target State:** 45+ permission checks, detailed governance analysis, risk-based scoring, actionable recommendations

**Estimated Effort:** 8-10 hours over 2-3 PRs
**Complexity:** Medium-High (backend data enrichment + frontend UX redesign)

---

## 🎯 Problem Statement

### What's Wrong Now

1. **Incomplete Analysis**
   - Only checks 4 generic categories
   - Doesn't analyze individual permission assignments (45+ permission types)
   - Ignores voting power distribution
   - Doesn't check proposal quorum/threshold settings
   - Misses external canister control risks
   - No analysis of asset management permissions

2. **Poor UX**
   - Technical jargon (users don't understand "Group Permissions" vs actual risks)
   - All checks treated equally (no visual hierarchy by risk)
   - Hard to understand what each check means
   - No clear action items
   - Ugly explanations with walls of text

3. **No Risk Prioritization**
   - Critical issues (multiple admins) buried in list
   - Minor issues (disaster recovery settings) get same weight
   - Users can't quickly see "what's the biggest problem?"

### What Users Need

> "I want to see if my treasury is actually controlled by token holders or if there are backdoors where individuals can bypass the DAO."

Users need:
- **Quick Risk Assessment:** "Is this a real DAO or not?"
- **Risk Hierarchy:** Big problems shown prominently, details hidden but accessible
- **Action Items:** "Here's exactly what to fix and how"
- **Comprehensive Coverage:** Check EVERY permission, not just a few

---

## 📊 Current State Analysis

### File Tree (Relevant Sections)

```
daopad_backend/
├── src/
│   ├── api/
│   │   ├── orbit_security.rs (WILL MODIFY - expand checks)
│   │   ├── orbit_permissions.rs (unchanged - already has list_permissions)
│   │   ├── orbit_users.rs (unchanged)
│   │   └── orbit_requests.rs (unchanged)
│   └── types/
│       └── orbit.rs (MAY MODIFY - add new response types if needed)

daopad_frontend/
├── src/
│   ├── components/
│   │   └── security/
│   │       ├── SecurityDashboard.jsx (MINOR MODIFY - tab structure)
│   │       ├── DAOTransitionChecklist.jsx (MAJOR REWRITE - new UX)
│   │       └── PermissionsMatrix.jsx (unchanged - different purpose)
│   └── services/
│       └── daopadBackend.js (unchanged - already has performSecurityCheck)
```

### Current Implementation

**Backend: `orbit_security.rs`**
- Location: `daopad_backend/src/api/orbit_security.rs:72-155`
- Entry point: `perform_security_check(station_id: Principal)`
- Returns: `SecurityDashboard` with 4 checks:
  1. `verify_admin_only_control()` - Checks if backend is sole admin
  2. `verify_no_non_admin_permissions()` - Checks non-admin group permissions
  3. `verify_request_policies()` - Checks for auto-approved/bypass policies
  4. `verify_system_settings()` - Checks disaster recovery settings

**Frontend: `DAOTransitionChecklist.jsx`**
- Location: `daopad_frontend/src/components/security/DAOTransitionChecklist.jsx`
- Receives: `securityData` from backend
- Transforms: Hardcoded mapping from check names to user-friendly descriptions
- Displays: Progress bar, categorized checks (foundation/decentralization/security/governance/advanced)

**Data Flow:**
```
User clicks Security tab
  → SecurityDashboard.jsx fetches data
  → daopadBackend.performSecurityCheck(stationId)
  → Backend: perform_security_check() calls Orbit Station APIs
  → Backend: Runs 4 checks, returns SecurityDashboard
  → Frontend: DAOTransitionChecklist transforms & displays
```

### Limitations

1. **Backend:** Only queries `list_users`, `list_user_groups`, `list_permissions`, `list_request_policies`, `system_info`
2. **Backend:** Doesn't analyze individual permission assignments per resource
3. **Backend:** Doesn't check voting power or quorum settings
4. **Backend:** Treats all permissions generically (just "write" vs "read")
5. **Frontend:** Hardcoded transformation logic (not scalable to 45+ checks)
6. **Frontend:** No risk prioritization or visual hierarchy

---

## 🏗️ Proposed Architecture

### 🔥 CRITICAL LESSON LEARNED FROM IMPLEMENTATION

**❌ PROBLEM: Monolithic approach hits IC heap memory limits**
- Single `perform_security_check()` making 4+ inter-canister calls simultaneously
- Allocating 25+ SecurityCheck objects in one update call
- Result: "heap out of bounds" error on mainnet (IC0502)

**✅ SOLUTION: Category-based endpoint architecture**
- Split into 8 separate check endpoints (one per category)
- Frontend calls each endpoint sequentially or in small batches
- Aggregate results client-side for display
- Each check stays within IC memory limits

### Revised Architecture: Category-Based Endpoints

Instead of one monolithic `perform_security_check()`, implement:

```rust
// 8 separate, lightweight endpoints
#[update] async fn check_admin_control(station_id: Principal) -> Result<Vec<SecurityCheck>, String>
#[update] async fn check_treasury_control(station_id: Principal) -> Result<Vec<SecurityCheck>, String>
#[update] async fn check_governance_permissions(station_id: Principal) -> Result<Vec<SecurityCheck>, String>
#[update] async fn check_proposal_policies(station_id: Principal) -> Result<Vec<SecurityCheck>, String>
#[update] async fn check_external_canisters(station_id: Principal) -> Result<Vec<SecurityCheck>, String>
#[update] async fn check_asset_management(station_id: Principal) -> Result<Vec<SecurityCheck>, String>
#[update] async fn check_system_configuration(station_id: Principal) -> Result<Vec<SecurityCheck>, String>
#[update] async fn check_operational_permissions(station_id: Principal) -> Result<Vec<SecurityCheck>, String>

// Frontend-side aggregation function (JavaScript)
async function performComprehensiveSecurityCheck(stationId) {
  const categories = [
    'admin_control',
    'treasury_control',
    'governance_permissions',
    'proposal_policies',
    'external_canisters',
    'asset_management',
    'system_configuration',
    'operational_permissions'
  ];

  const allChecks = [];
  for (const category of categories) {
    const checks = await backend[`check_${category}`](stationId);
    allChecks.push(...checks);
  }

  // Calculate risk score client-side
  const dashboard = calculateRiskScore(allChecks);
  return dashboard;
}
```

**Benefits:**
- Each endpoint makes 0-2 inter-canister calls (manageable)
- Smaller memory footprint per call
- Progressive loading UX possible
- More modular and testable
- Avoids IC heap limits

### High-Level Approach

**Three-Tier Risk System:**

```
┌─────────────────────────────────────────────────────┐
│  CRITICAL RISKS (Red, Always Expanded)             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  ❌ Multiple admins bypass community governance    │
│  ❌ Non-admin groups can transfer treasury funds   │
│  ❌ Auto-approved policies skip all voting         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  ⚠️ MEDIUM RISKS (Yellow, Collapsible)             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  • Operator group can create/modify users          │
│  • External canister permissions too broad         │
│  • Asset management not restricted                 │
│  [Click to expand 8 more medium-risk items...]     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  ✓ LOW RISKS & DETAILS (Green/Gray, Hidden)        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  [Click to view 25 passing checks...]              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  📊 DECENTRALIZATION SCORE: 45%                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  Status: NOT A DAO - Individual admins have control │
│  Next Action: Remove non-DAOPad admins in Settings  │
└─────────────────────────────────────────────────────┘
```

### Comprehensive Check Categories

**1. ADMIN CONTROL LAYER** (Highest Priority)
- Multiple admins (CRITICAL if >1 admin)
- Non-backend admin identities (CRITICAL if any)
- Backend not admin (CRITICAL if backend missing)
- Admin group membership distribution

**2. TREASURY CONTROL** (High Priority)
- Account.Transfer permissions (who can move funds?)
- Account.Create permissions (who can create new accounts?)
- Account.Update permissions (who can modify accounts?)
- Account.Read permissions (is treasury visible?)
- Asset.Transfer/Update/Delete permissions
- ICP balance vs governance capability

**3. GOVERNANCE PERMISSIONS** (High Priority)
- Permission.Update access (who can change permissions?)
- RequestPolicy.Update access (who controls voting rules?)
- User.Create/Update (who can add new governors?)
- UserGroup.Create/Update (who controls voting power?)

**4. PROPOSAL POLICIES** (High Priority)
- Auto-approved policies (bypass all voting)
- AllowListed users (bypass voting)
- Non-admin group approvers (circumvent DAO)
- Quorum thresholds per operation type
- Timelock delays for critical operations

**5. EXTERNAL CANISTER CONTROL** (Medium Priority)
- ExternalCanister.Create (who can add canisters?)
- ExternalCanister.Change (who can modify them?)
- ExternalCanister.Fund (who allocates cycles?)
- Canister-specific permissions

**6. ASSET MANAGEMENT** (Medium Priority)
- Asset.Create/Update/Delete permissions
- AddressBook.Create/Update/Delete permissions
- NamedRule.Create/Update/Delete permissions

**7. SYSTEM CONFIGURATION** (Medium Priority)
- System.Upgrade access (who can upgrade Station?)
- System.ManageSystemInfo access
- Disaster recovery settings
- Cycle obtain strategy

**8. OPERATIONAL PERMISSIONS** (Low Priority)
- Request.Read/List visibility
- Notification.Create access
- User.Read/List visibility
- UserGroup.Read/List visibility

**9. VOTING POWER ANALYSIS** (High Priority - NEW!)
- Distribution: Is voting power concentrated or distributed?
- Quorum feasibility: Can proposals actually pass?
- Largest holder influence: Can one entity veto?
- Backend vs community balance

**10. MEMBER ANALYSIS** (Medium Priority - NEW!)
- Total member count
- Active vs inactive members
- Members with 100+ VP (can participate)
- Voting power concentration (Gini coefficient)

---

## 🔧 Implementation Plan

### Backend Changes

#### File 1: `daopad_backend/src/api/orbit_security.rs` (MAJOR EXPANSION)

**Current:** 4 checks (~560 lines)
**Target:** 10+ check categories with 45+ individual checks (~1200 lines)

**New Functions to Add:**

```rust
// PSEUDOCODE - implementing agent will write real code

// Enhanced main orchestrator
#[ic_cdk::update]
pub async fn perform_security_check(station_id: Principal) -> Result<EnhancedSecurityDashboard, String> {
    let mut checks = Vec::new();

    // Fetch ALL data upfront (parallel calls would be ideal but IC doesn't support easily)
    let users_data = fetch_all_users(station_id).await?;
    let permissions_data = fetch_all_permissions(station_id).await?;
    let policies_data = fetch_all_policies(station_id).await?;
    let system_data = fetch_system_info(station_id).await?;
    // NEW: Fetch voting power data from Kong Locker
    let voting_power_data = fetch_voting_power_distribution(station_id).await?;

    // Run comprehensive checks
    checks.extend(check_admin_control_layer(&users_data).await?);
    checks.extend(check_treasury_control(&permissions_data).await?);
    checks.extend(check_governance_permissions(&permissions_data).await?);
    checks.extend(check_proposal_policies(&policies_data).await?);
    checks.extend(check_external_canister_control(&permissions_data).await?);
    checks.extend(check_asset_management(&permissions_data).await?);
    checks.extend(check_system_configuration(&system_data, &permissions_data).await?);
    checks.extend(check_operational_permissions(&permissions_data).await?);
    checks.extend(check_voting_power_distribution(&voting_power_data).await?);
    checks.extend(check_member_analysis(&users_data, &voting_power_data).await?);

    // Calculate comprehensive risk score
    let risk_analysis = calculate_risk_score(&checks);

    Ok(EnhancedSecurityDashboard {
        station_id,
        overall_status: risk_analysis.status,
        decentralization_score: risk_analysis.score, // 0-100
        last_checked: time(),
        checks,
        risk_summary: risk_analysis.summary,
        critical_issues: risk_analysis.critical_issues,
        recommended_actions: risk_analysis.actions,
    })
}

// NEW: Admin control layer checks (expanded from existing)
async fn check_admin_control_layer(users: &UserData) -> Result<Vec<SecurityCheck>, String> {
    vec![
        check_multiple_admins(users)?,
        check_non_backend_admins(users)?,
        check_backend_is_admin(users)?,
        check_admin_group_membership(users)?,
        check_operator_group_size(users)?,
    ]
}

// NEW: Treasury control - CRITICAL checks
async fn check_treasury_control(perms: &PermissionsData) -> Result<Vec<SecurityCheck>, String> {
    vec![
        check_account_transfer_permissions(perms)?, // Who can move funds?
        check_account_create_permissions(perms)?,   // Who can create accounts?
        check_account_update_permissions(perms)?,   // Who can modify accounts?
        check_account_read_permissions(perms)?,     // Is treasury visible?
        check_asset_transfer_permissions(perms)?,   // Who can move assets?
        check_asset_delete_permissions(perms)?,     // Who can delete assets?
    ]
}

// NEW: Governance permissions - who controls the controls?
async fn check_governance_permissions(perms: &PermissionsData) -> Result<Vec<SecurityCheck>, String> {
    vec![
        check_permission_update_access(perms)?,     // CRITICAL: Who can change permissions?
        check_request_policy_update_access(perms)?, // CRITICAL: Who can change voting rules?
        check_user_create_access(perms)?,          // Who can add new governors?
        check_user_update_access(perms)?,          // Who can modify governor rights?
        check_usergroup_create_access(perms)?,     // Who can create voting groups?
        check_usergroup_update_access(perms)?,     // Who can modify groups?
        check_usergroup_delete_access(perms)?,     // Who can remove groups?
    ]
}

// NEW: Proposal policies - detailed analysis
async fn check_proposal_policies(policies: &PoliciesData) -> Result<Vec<SecurityCheck>, String> {
    let mut checks = Vec::new();

    // Analyze each operation type separately
    for operation_type in [
        "Account.Transfer", "Account.Create", "Account.Update",
        "ExternalCanister.Create", "ExternalCanister.Change",
        "Permission.Update", "RequestPolicy.Update",
        "User.Create", "User.Update",
        "System.Upgrade", "System.ManageSystemInfo"
    ] {
        checks.push(check_operation_policy(policies, operation_type)?);
    }

    checks
}

// NEW: External canister control
async fn check_external_canister_control(perms: &PermissionsData) -> Result<Vec<SecurityCheck>, String> {
    vec![
        check_canister_create_permissions(perms)?,
        check_canister_change_permissions(perms)?,
        check_canister_fund_permissions(perms)?,
        check_canister_read_permissions(perms)?,
    ]
}

// NEW: Asset management
async fn check_asset_management(perms: &PermissionsData) -> Result<Vec<SecurityCheck>, String> {
    vec![
        check_asset_create_permissions(perms)?,
        check_asset_update_permissions(perms)?,
        check_asset_delete_permissions(perms)?,
        check_addressbook_permissions(perms)?,
        check_namedrule_permissions(perms)?,
    ]
}

// NEW: System configuration
async fn check_system_configuration(system: &SystemData, perms: &PermissionsData) -> Result<Vec<SecurityCheck>, String> {
    vec![
        check_upgrade_permissions(perms)?,
        check_system_info_permissions(perms)?,
        check_disaster_recovery_settings(system)?,
        check_cycle_obtain_strategy(system)?,
    ]
}

// NEW: Operational permissions (low priority but comprehensive)
async fn check_operational_permissions(perms: &PermissionsData) -> Result<Vec<SecurityCheck>, String> {
    vec![
        check_request_read_permissions(perms)?,
        check_notification_permissions(perms)?,
        check_user_list_permissions(perms)?,
        check_usergroup_list_permissions(perms)?,
    ]
}

// NEW: Voting power analysis
async fn check_voting_power_distribution(vp_data: &VotingPowerData) -> Result<Vec<SecurityCheck>, String> {
    vec![
        check_voting_power_concentration(vp_data)?, // Gini coefficient
        check_quorum_feasibility(vp_data)?,         // Can proposals pass?
        check_largest_holder_influence(vp_data)?,   // Veto risk?
        check_backend_vs_community_balance(vp_data)?, // Backend dominance?
    ]
}

// NEW: Member analysis
async fn check_member_analysis(users: &UserData, vp: &VotingPowerData) -> Result<Vec<SecurityCheck>, String> {
    vec![
        check_total_member_count(users)?,
        check_active_member_ratio(users)?,
        check_voting_eligible_members(users, vp)?, // Members with 100+ VP
        check_member_diversity(users, vp)?,        // Concentration analysis
    ]
}

// NEW: Risk scoring algorithm
fn calculate_risk_score(checks: &Vec<SecurityCheck>) -> RiskAnalysis {
    // Weight each check by severity and category
    let weights = RiskWeights {
        critical_admin_control: 25.0,      // Multiple admins = instant fail
        critical_treasury: 20.0,           // Non-admin transfers = major risk
        critical_governance: 15.0,         // Permission manipulation = high risk
        high_proposal_bypass: 15.0,        // Auto-approve = high risk
        medium_external_canisters: 10.0,
        medium_asset_management: 5.0,
        medium_system_config: 5.0,
        low_operational: 5.0,
    };

    let mut score = 100.0; // Start at perfect
    let mut critical_issues = Vec::new();
    let mut recommended_actions = Vec::new();

    for check in checks {
        match (&check.status, &check.severity) {
            (CheckStatus::Fail, Some(Severity::Critical)) => {
                score -= weights.critical_admin_control;
                critical_issues.push(check.clone());
                if let Some(rec) = &check.recommendation {
                    recommended_actions.push(rec.clone());
                }
            },
            (CheckStatus::Fail, Some(Severity::High)) => {
                score -= weights.high_proposal_bypass;
                critical_issues.push(check.clone());
            },
            (CheckStatus::Warn, _) => {
                score -= weights.medium_external_canisters * 0.5;
            },
            _ => {}
        }
    }

    score = score.max(0.0).min(100.0);

    let status = if score < 30.0 {
        "critical" // Not a DAO
    } else if score < 60.0 {
        "high_risk" // Significant centralization
    } else if score < 85.0 {
        "medium_risk" // Some issues
    } else {
        "secure" // True DAO
    };

    RiskAnalysis {
        score: score as u8,
        status: status.to_string(),
        summary: generate_summary(score, &critical_issues),
        critical_issues,
        actions: recommended_actions,
    }
}

fn generate_summary(score: f64, issues: &Vec<SecurityCheck>) -> String {
    if score < 30.0 {
        format!("NOT A DAO - {} critical issues prevent community governance", issues.len())
    } else if score < 60.0 {
        format!("PARTIAL DAO - {} issues allow admin bypass of community", issues.len())
    } else if score < 85.0 {
        "MOSTLY DECENTRALIZED - Minor issues remain".to_string()
    } else {
        "TRUE DAO - Full community governance".to_string()
    }
}

// NEW: Helper to analyze individual permission
fn analyze_permission(perm: &Permission, critical_resources: &[Resource]) -> SecurityCheck {
    let is_critical = critical_resources.contains(&perm.resource);
    let non_admin_access = perm.allow.user_groups.iter()
        .any(|g| g != ADMIN_GROUP_ID);

    if is_critical && non_admin_access {
        SecurityCheck {
            category: format!("{:?}", extract_resource_category(&perm.resource)),
            name: format!("{:?} Permission", perm.resource),
            status: CheckStatus::Fail,
            message: format!("Non-admin groups have access"),
            severity: Some(Severity::Critical),
            details: Some(format!("Groups: {:?}", perm.allow.user_groups)),
            recommendation: Some(format!("Restrict to Admin group only")),
        }
    } else {
        // ... Pass or Warn logic
    }
}
```

**New Response Type:**

```rust
// Add to daopad_backend/src/api/orbit_security.rs

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct EnhancedSecurityDashboard {
    pub station_id: Principal,
    pub overall_status: String,
    pub decentralization_score: u8, // 0-100
    pub last_checked: u64,
    pub checks: Vec<SecurityCheck>,
    pub risk_summary: String,
    pub critical_issues: Vec<SecurityCheck>,
    pub recommended_actions: Vec<String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct RiskAnalysis {
    pub score: u8,
    pub status: String,
    pub summary: String,
    pub critical_issues: Vec<SecurityCheck>,
    pub actions: Vec<String>,
}

// Keep existing SecurityCheck type but use it more comprehensively
```

---

### Frontend Changes

#### File 1: `daopad_frontend/src/components/security/DAOTransitionChecklist.jsx` (MAJOR REWRITE)

**Current:** Hardcoded transformation logic, categories by "journey stage"
**Target:** Risk-based UI with visual hierarchy

**New Component Structure:**

```javascript
// PSEUDOCODE - implementing agent will write real React code

import { AlertCircle, Shield, TrendingUp, CheckCircle2 } from 'lucide-react';

const DAOTransitionChecklist = ({ securityData, stationId, tokenSymbol, onRefresh }) => {
    const [expandedSections, setExpandedSections] = useState({
        critical: true,    // Always expanded
        high: false,       // Collapsed by default
        medium: false,
        low: false,
        passing: false,
    });

    // Group checks by risk level (backend now provides this!)
    const groupedChecks = useMemo(() => {
        const groups = {
            critical: [], // Fail + Critical severity
            high: [],     // Fail + High severity
            medium: [],   // Fail/Warn + Medium severity
            low: [],      // Warn + Low severity
            passing: [],  // Pass
        };

        securityData.checks.forEach(check => {
            if (check.status === 'Fail' && check.severity === 'Critical') {
                groups.critical.push(check);
            } else if (check.status === 'Fail' && check.severity === 'High') {
                groups.high.push(check);
            } else if (check.status === 'Fail' || check.status === 'Warn') {
                groups.medium.push(check);
            } else if (check.status === 'Pass') {
                groups.passing.push(check);
            }
        });

        return groups;
    }, [securityData]);

    return (
        <div className="space-y-4">
            {/* BIG SCORE DISPLAY */}
            <DecentralizationScoreCard
                score={securityData.decentralization_score}
                status={securityData.overall_status}
                summary={securityData.risk_summary}
            />

            {/* CRITICAL ISSUES - Always visible, red, prominent */}
            {groupedChecks.critical.length > 0 && (
                <RiskSection
                    title="🚨 CRITICAL RISKS - Immediate Action Required"
                    checks={groupedChecks.critical}
                    level="critical"
                    expanded={true}
                    alwaysExpanded={true}
                    color="red"
                    description="These issues prevent true DAO governance. Individual admins can bypass community decisions."
                />
            )}

            {/* HIGH RISKS - Collapsed by default, orange */}
            {groupedChecks.high.length > 0 && (
                <RiskSection
                    title="⚠️ HIGH RISKS - Significant Concerns"
                    checks={groupedChecks.high}
                    level="high"
                    expanded={expandedSections.high}
                    onToggle={() => toggleSection('high')}
                    color="orange"
                    description="These issues create backdoors that could undermine governance."
                />
            )}

            {/* MEDIUM RISKS - Collapsed, yellow */}
            {groupedChecks.medium.length > 0 && (
                <RiskSection
                    title="⚠️ MEDIUM RISKS - Review Recommended"
                    checks={groupedChecks.medium}
                    level="medium"
                    expanded={expandedSections.medium}
                    onToggle={() => toggleSection('medium')}
                    color="yellow"
                    description="These configurations may need adjustment for production."
                />
            )}

            {/* PASSING CHECKS - Hidden by default, green */}
            {groupedChecks.passing.length > 0 && (
                <RiskSection
                    title={`✓ ${groupedChecks.passing.length} Checks Passing`}
                    checks={groupedChecks.passing}
                    level="passing"
                    expanded={expandedSections.passing}
                    onToggle={() => toggleSection('passing')}
                    color="green"
                    description="These settings are secure and properly configured."
                />
            )}

            {/* RECOMMENDED ACTIONS */}
            {securityData.recommended_actions.length > 0 && (
                <RecommendedActionsCard
                    actions={securityData.recommended_actions}
                    stationId={stationId}
                />
            )}

            {/* REFRESH BUTTON */}
            <div className="flex justify-end">
                <Button onClick={onRefresh} variant="outline">
                    Refresh Analysis
                </Button>
            </div>
        </div>
    );
};

// NEW: Decentralization score display
const DecentralizationScoreCard = ({ score, status, summary }) => {
    const getScoreColor = () => {
        if (score < 30) return 'text-red-600 bg-red-50 border-red-200';
        if (score < 60) return 'text-orange-600 bg-orange-50 border-orange-200';
        if (score < 85) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        return 'text-green-600 bg-green-50 border-green-200';
    };

    const getScoreLabel = () => {
        if (score < 30) return 'NOT A DAO';
        if (score < 60) return 'PARTIAL DAO';
        if (score < 85) return 'MOSTLY DECENTRALIZED';
        return 'TRUE DAO';
    };

    return (
        <Card className={`border-2 ${getScoreColor()}`}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <h2 className="text-3xl font-bold mb-2">
                            {score}% Decentralized
                        </h2>
                        <p className="text-lg font-semibold mb-2">
                            {getScoreLabel()}
                        </p>
                        <p className="text-sm opacity-80">
                            {summary}
                        </p>
                    </div>
                    <div className="ml-6">
                        <CircularProgress value={score} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// NEW: Risk section with collapsible checks
const RiskSection = ({ title, checks, level, expanded, onToggle, alwaysExpanded, color, description }) => {
    const colorClasses = {
        red: {
            border: 'border-red-500',
            bg: 'bg-red-50',
            text: 'text-red-900',
            icon: 'text-red-600',
        },
        orange: {
            border: 'border-orange-500',
            bg: 'bg-orange-50',
            text: 'text-orange-900',
            icon: 'text-orange-600',
        },
        yellow: {
            border: 'border-yellow-500',
            bg: 'bg-yellow-50',
            text: 'text-yellow-900',
            icon: 'text-yellow-600',
        },
        green: {
            border: 'border-green-500',
            bg: 'bg-green-50',
            text: 'text-green-900',
            icon: 'text-green-600',
        },
    };

    const colors = colorClasses[color] || colorClasses.yellow;

    return (
        <Card className={`border-2 ${colors.border}`}>
            <CardHeader
                className={`cursor-pointer ${colors.bg} ${alwaysExpanded ? '' : 'hover:opacity-80'}`}
                onClick={alwaysExpanded ? undefined : onToggle}
            >
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <h3 className={`text-lg font-bold ${colors.text}`}>
                            {title}
                        </h3>
                        <p className={`text-sm mt-1 ${colors.text} opacity-80`}>
                            {description}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className={colors.text}>
                            {checks.length} {checks.length === 1 ? 'issue' : 'issues'}
                        </Badge>
                        {!alwaysExpanded && (
                            <ChevronDown
                                className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
                            />
                        )}
                    </div>
                </div>
            </CardHeader>

            {(expanded || alwaysExpanded) && (
                <CardContent className="p-4 space-y-2">
                    {checks.map((check, idx) => (
                        <CheckItem key={idx} check={check} level={level} />
                    ))}
                </CardContent>
            )}
        </Card>
    );
};

// NEW: Individual check item with details
const CheckItem = ({ check, level }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
            <div
                className="cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <StatusIcon status={check.status} severity={check.severity} />
                            <h4 className="font-semibold">{check.name}</h4>
                        </div>
                        <p className="text-sm text-gray-700">{check.message}</p>
                    </div>
                    <ChevronRight
                        className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
                    />
                </div>
            </div>

            {expanded && (
                <div className="mt-3 pl-6 space-y-2 border-t pt-3">
                    {check.details && (
                        <div className="text-sm">
                            <span className="font-semibold">Details:</span>
                            <p className="text-gray-700 mt-1">{check.details}</p>
                        </div>
                    )}

                    {check.recommendation && (
                        <div className="text-sm">
                            <span className="font-semibold">How to Fix:</span>
                            <p className="text-gray-700 mt-1">{check.recommendation}</p>
                        </div>
                    )}

                    {check.category && (
                        <div className="text-xs text-gray-500">
                            Category: {check.category}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// NEW: Recommended actions card
const RecommendedActionsCard = ({ actions, stationId }) => {
    return (
        <Card className="border-blue-500 border-2 bg-blue-50">
            <CardHeader>
                <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Next Steps to Full Decentralization
                </h3>
            </CardHeader>
            <CardContent className="space-y-3">
                {actions.map((action, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {idx + 1}
                        </div>
                        <p className="text-sm text-blue-900 flex-1">{action}</p>
                    </div>
                ))}

                <div className="mt-4 pt-4 border-t border-blue-200">
                    <p className="text-xs text-blue-800">
                        💡 These changes must be made in your Orbit Station settings.
                        <a
                            href={`https://orbitstation.org/station/${stationId}/settings`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline ml-1"
                        >
                            Open Settings →
                        </a>
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};
```

---

## 🧪 Testing Strategy

### Type Discovery (Before Implementation)

```bash
# Use test station with admin access
export TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"

# Verify we can fetch all required data
dfx canister --network ic call $TEST_STATION list_users '(record { search_term = null; statuses = null; groups = null; paginate = null })'

dfx canister --network ic call $TEST_STATION list_permissions '(record { resources = null; paginate = null })'

dfx canister --network ic call $TEST_STATION list_request_policies '(record { limit = null; offset = null })'

dfx canister --network ic call $TEST_STATION system_info

# Test Kong Locker voting power query
dfx canister --network ic call eazgb-giaaa-aaaap-qqc2q-cai get_all_voting_powers
```

### Build and Deploy Process

```bash
# Backend changes require candid extraction
cd /home/theseus/alexandria/daopad/src/daopad

cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked

candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Deploy backend
./deploy.sh --network ic --backend-only

# CRITICAL: Sync declarations to frontend
cp -r ../declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# Deploy frontend
./deploy.sh --network ic --frontend-only
```

### Integration Tests Required

```bash
# Test comprehensive security check
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai perform_security_check '(principal "fec7w-zyaaa-aaaaa-qaffq-cai")'

# Verify response structure has new fields
# Expected: EnhancedSecurityDashboard with decentralization_score, risk_summary, etc.

# Test frontend at https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
# - Navigate to Security tab
# - Verify risk-based grouping
# - Verify score display
# - Verify expandable sections
# - Verify recommended actions
```

---

## 📏 Scope Estimate

### Files Modified
- **New files:** 0
- **Modified files:** 2 (orbit_security.rs, DAOTransitionChecklist.jsx)
- **Backend changes:** ~600 lines added/modified
- **Frontend changes:** ~400 lines added/modified

### Lines of Code
- **Backend:** ~1200 lines total (orbit_security.rs expanded from 560 to ~1200)
- **Frontend:** ~800 lines total (DAOTransitionChecklist.jsx rewritten)
- **Net:** +1000 lines

### Complexity
- **Medium:** Data aggregation and analysis logic (backend)
- **Medium:** Risk scoring algorithm (backend)
- **Medium:** New UI components with collapsible sections (frontend)
- **High:** Comprehensive permission analysis across 12 resource types

### Time Estimate
- **Phase 1 (Backend expansion):** 4-5 hours
  - Add all new check functions
  - Implement risk scoring
  - Test with dfx on test station
- **Phase 2 (Frontend rewrite):** 3-4 hours
  - New UI components
  - Risk-based grouping logic
  - Visual hierarchy
  - Test in browser
- **Phase 3 (Integration & polish):** 1-2 hours
  - Declaration sync
  - End-to-end testing
  - UX refinements
- **Total:** 8-11 hours over 2-3 PRs

---

## 🎯 Success Criteria

### User Experience

1. **Quick Assessment**
   - User sees decentralization score immediately
   - Status is clear: "NOT A DAO" vs "TRUE DAO"
   - Critical issues jump out visually (red, always expanded)

2. **Progressive Disclosure**
   - Big problems shown first, details hidden but accessible
   - Users can drill down into any check for explanation
   - Technical details available but not overwhelming

3. **Actionable**
   - Each failing check has concrete recommendation
   - "Next Steps" section shows exactly what to do
   - Links to Orbit Station settings where appropriate

### Technical Correctness

1. **Comprehensive Coverage**
   - All 45+ permissions analyzed (12 resource types × actions)
   - Proposal policies checked per operation type
   - Voting power distribution considered
   - Member analysis included

2. **Accurate Risk Assessment**
   - Critical issues (multiple admins, non-admin transfers) scored highest
   - Medium issues (development settings) weighted appropriately
   - Low issues (visibility permissions) minimally impact score
   - Score correlates with actual centralization risk

3. **Performance**
   - Security check completes in <5 seconds
   - Frontend renders smoothly with 45+ checks
   - Collapsible sections improve perceived performance

---

## 🚀 Handoff to Implementing Agent

**Plan Complete:** Comprehensive Security Tab & DAO Transition Analysis

**Document:** `COMPREHENSIVE_SECURITY_TAB_PLAN.md`

**Estimated:** 8-11 hours, 2-3 PRs

**Checkpoint Strategy:**

**✅ COMPLETED: Initial Implementation & Lessons Learned**
- ✅ Implemented comprehensive security checks (25+ checks across 8 categories)
- ✅ Created risk scoring algorithm with severity weighting
- ✅ Added EnhancedSecurityDashboard response type
- ✅ Deployed to mainnet and extracted candid
- ✅ Synced declarations to frontend
- ❌ **DISCOVERED:** Monolithic approach hits IC heap limits
- 📝 **LESSON:** Must use category-based endpoints instead

**PR #1: Refactor to Category-Based Endpoints (3-4 hours)**
- Refactor `orbit_security.rs` to expose 8 separate check endpoints
- Remove monolithic `perform_security_check()`
- Keep helper functions and check logic (already implemented!)
- Test each endpoint individually with dfx
- Deploy backend, sync declarations

**PR #2: Frontend Integration with Progressive Loading (3-4 hours)**
- Create frontend aggregation service to call all 8 endpoints
- Implement progressive loading UI (show checks as they load)
- Add client-side risk scoring calculation
- Rewrite `DAOTransitionChecklist.jsx` with risk-based UI
- Add new components (DecentralizationScoreCard, RiskSection, etc.)
- Test in browser
- Deploy frontend

**PR #3 (Optional): Polish & Refinements (1-2 hours)**
- Add caching to reduce repeated calls
- Implement parallel endpoint calls (Promise.all for independent checks)
- UX tweaks based on testing
- Documentation updates

**Current State:**
- Backend has complete check logic implemented but needs refactoring
- All helper functions are ready to use
- Need to split into 8 category-based endpoints
- Frontend integration pending

**Prompt for implementing agent:**

```
Pursue the @COMPREHENSIVE_SECURITY_TAB_PLAN.md - Refactor the existing monolithic security check into 8 category-based endpoints to avoid IC heap limits, then implement progressive loading frontend.
```

**Key Files:**
- Backend: `daopad_backend/src/api/orbit_security.rs` (already has all logic, just needs refactoring)
- Frontend: `daopad_frontend/src/components/security/DAOTransitionChecklist.jsx` (needs complete rewrite)
- Types: Already defined in orbit_security.rs (SecurityCheck, CheckStatus, Severity)

---

## 🛑 PLANNING AGENT - YOUR JOB IS DONE

DO NOT:
- ❌ Implement code
- ❌ Make edits
- ❌ Create PRs
- ❌ Deploy
- ❌ Ask "should I continue?" and then execute
- ❌ Use ExitPlanMode and then implement

The implementing agent will execute this plan in a fresh conversation.

**🛑 END CONVERSATION HERE 🛑**
