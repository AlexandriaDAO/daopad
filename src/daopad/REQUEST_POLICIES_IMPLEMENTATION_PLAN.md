# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-request-policies/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-request-policies/src/daopad`
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
   git commit -m "feat: Display Request Policies in Security Tab"
   git push -u origin feature/request-policies-security
   gh pr create --title "feat: Display Request Policies in Security Tab" --body "Implements REQUEST_POLICIES_IMPLEMENTATION_PLAN.md"
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

**Branch:** `feature/request-policies-security`
**Worktree:** `/home/theseus/alexandria/daopad-request-policies/src/daopad`

---

# Implementation Plan: Display Request Policies in Security Tab

## 🔍 Current State Analysis

### What We Have Now:
1. **Backend**: `check_proposal_policies()` fetches and analyzes request policies
   - Located in: `daopad_backend/src/api/orbit_security.rs`
   - Returns security checks for policy bypasses and auto-approvals
   - Only reports HIGH-LEVEL issues (bypasses, auto-approvals count)

2. **Frontend**: SecurityDashboard shows aggregated security checks
   - Shows pass/fail for "Proposal Policies" category
   - No detailed view of individual request policies

3. **Orbit Station**: Has 30 request policies with different approval rules
   - Named rules: "Admin approval", "Operator approval"
   - Various operation types: Transfer, EditAccount, ManageSystemInfo, etc.
   - Different approval requirements per operation

### What's Missing:
- No display of individual request policies
- No way to see what each operation requires for approval
- No mapping between operations and their approval rules (like the Orbit UI shows)

## 📋 Implementation Tasks

### Task 1: Add Backend Method to Fetch Request Policies Details
**File**: `daopad_backend/src/api/orbit_security.rs` (ADD NEW METHOD)

```rust
// PSEUDOCODE - Add after existing check methods
#[ic_cdk::update]
pub async fn get_request_policies_details(station_id: Principal) -> Result<RequestPoliciesDetails, String> {
    // Fetch policies from Orbit
    let policies = fetch_policies(station_id).await?;

    // Fetch named rules to resolve names
    let named_rules = fetch_named_rules(station_id).await?;

    // Build response with resolved rule names
    let policies_with_names = policies.iter().map(|policy| {
        let rule_description = match &policy.rule {
            PolicyRule::AutoApproved => "No approval required",
            PolicyRule::NamedRule(id) => {
                // Find matching named rule
                named_rules.find(|r| r.id == id)
                    .map(|r| r.name)
                    .unwrap_or("Unknown rule")
            },
            PolicyRule::Quorum { min_approved, approvers } => {
                format!("{} approvals from {:?}", min_approved, approvers)
            },
            PolicyRule::QuorumPercentage { min_approved, approvers } => {
                format!("{}% approval from {:?}", min_approved, approvers)
            },
            PolicyRule::Allow(users) => {
                format!("Allowed for specific users")
            }
        };

        RequestPolicyInfo {
            operation: format_specifier(&policy.specifier),
            approval_rule: rule_description,
            specifier: policy.specifier,
            rule: policy.rule,
        }
    });

    Ok(RequestPoliciesDetails {
        policies: policies_with_names,
        total_count: policies.len(),
        auto_approved_count: count_auto_approved,
        bypass_count: count_bypasses,
    })
}

// Helper to fetch named rules
async fn fetch_named_rules(station_id: Principal) -> Result<Vec<NamedRule>, String> {
    let input = PaginationInput { limit: None, offset: None };
    let result = ic_cdk::call(station_id, "list_named_rules", (input,)).await?;
    // Extract named_rules from result
}

// Helper to format specifier for display
fn format_specifier(spec: &RequestSpecifier) -> String {
    match spec {
        Transfer { account_id } => format!("Transfer - {}", account_name),
        EditAccount { account_id } => format!("Edit Account - {}", account_name),
        AddUser => "Add user",
        EditUser => "Edit user",
        // ... all other operation types
    }
}
```

### Task 2: Add Types for Request Policies Details
**File**: `daopad_backend/src/types/orbit.rs` (ADD NEW TYPES)

```rust
// PSEUDOCODE - Add new types
#[derive(CandidType, Deserialize, Serialize)]
pub struct RequestPolicyInfo {
    pub operation: String,        // Human-readable operation name
    pub approval_rule: String,     // Human-readable approval requirement
    pub specifier: RequestSpecifier,  // Raw specifier for filtering
    pub rule: PolicyRule,          // Raw rule for analysis
}

#[derive(CandidType, Deserialize, Serialize)]
pub struct RequestPoliciesDetails {
    pub policies: Vec<RequestPolicyInfo>,
    pub total_count: usize,
    pub auto_approved_count: usize,
    pub bypass_count: usize,
}

// Add NamedRule type if not exists
#[derive(CandidType, Deserialize)]
pub struct NamedRule {
    pub id: String,
    pub name: String,
    pub rule: PolicyRule,
    pub description: Option<String>,
}
```

### Task 3: Create Request Policies Component for Frontend
**File**: `daopad_frontend/src/components/security/RequestPoliciesView.jsx` (NEW FILE)

```javascript
// PSEUDOCODE
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const RequestPoliciesView = ({ stationId, identity }) => {
    const [policies, setPolicies] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grouped'); // 'grouped' or 'list'

    useEffect(() => {
        fetchPolicies();
    }, [stationId]);

    const fetchPolicies = async () => {
        // Call backend to get policies
        const actor = await getActor(identity);
        const result = await actor.get_request_policies_details(stationId);

        if (result.Ok) {
            // Group policies by operation type
            const grouped = groupPoliciesByCategory(result.Ok.policies);
            setPolicies({
                raw: result.Ok.policies,
                grouped: grouped,
                stats: {
                    total: result.Ok.total_count,
                    autoApproved: result.Ok.auto_approved_count,
                    bypasses: result.Ok.bypass_count
                }
            });
        }
    };

    const groupPoliciesByCategory = (policies) => {
        // Group by operation category
        return {
            accounts: policies.filter(p => p.operation.includes('Account')),
            transfers: policies.filter(p => p.operation.includes('Transfer')),
            users: policies.filter(p => p.operation.includes('User')),
            system: policies.filter(p => p.operation.includes('System')),
            assets: policies.filter(p => p.operation.includes('Asset')),
            canisters: policies.filter(p => p.operation.includes('Canister')),
            governance: policies.filter(p =>
                p.operation.includes('Rule') ||
                p.operation.includes('Policy') ||
                p.operation.includes('Permission')
            ),
            other: policies.filter(p => /* not in above categories */)
        };
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Request Approval Policies
                </CardTitle>

                {/* Stats badges */}
                <div className="flex gap-2 mt-2">
                    <Badge variant="default">
                        {policies?.stats.total} Total Policies
                    </Badge>
                    {policies?.stats.autoApproved > 0 && (
                        <Badge variant="warning">
                            {policies?.stats.autoApproved} Auto-Approved
                        </Badge>
                    )}
                    {policies?.stats.bypasses > 0 && (
                        <Badge variant="destructive">
                            {policies?.stats.bypasses} Bypasses
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent>
                {/* View mode toggle */}
                <div className="flex justify-end mb-4">
                    <ToggleGroup value={viewMode} onValueChange={setViewMode}>
                        <ToggleGroupItem value="grouped">Grouped</ToggleGroupItem>
                        <ToggleGroupItem value="list">List</ToggleGroupItem>
                    </ToggleGroup>
                </div>

                {viewMode === 'grouped' ? (
                    // Grouped view by category
                    <div className="space-y-4">
                        {Object.entries(policies?.grouped || {}).map(([category, items]) => (
                            items.length > 0 && (
                                <div key={category}>
                                    <h4 className="font-semibold capitalize mb-2">
                                        {category} ({items.length})
                                    </h4>
                                    <div className="space-y-1">
                                        {items.map((policy, idx) => (
                                            <PolicyRow key={idx} policy={policy} />
                                        ))}
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                ) : (
                    // Simple list view
                    <div className="space-y-2">
                        {policies?.raw.map((policy, idx) => (
                            <PolicyRow key={idx} policy={policy} />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const PolicyRow = ({ policy }) => {
    const getApprovalIcon = () => {
        if (policy.approval_rule === "No approval required") {
            return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
        }
        if (policy.approval_rule.includes("Admin")) {
            return <Shield className="w-4 h-4 text-blue-500" />;
        }
        if (policy.approval_rule.includes("Operator")) {
            return <CheckCircle className="w-4 h-4 text-green-500" />;
        }
        return <Info className="w-4 h-4 text-gray-500" />;
    };

    return (
        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <div className="flex items-center gap-2">
                {getApprovalIcon()}
                <span className="font-medium">{policy.operation}</span>
            </div>
            <span className="text-sm text-gray-600">
                {policy.approval_rule}
            </span>
        </div>
    );
};

export default RequestPoliciesView;
```

### Task 4: Integrate Request Policies View into Security Dashboard
**File**: `daopad_frontend/src/components/security/SecurityDashboard.jsx` (MODIFY)

```javascript
// PSEUDOCODE - Add import at top
import RequestPoliciesView from './RequestPoliciesView';

// Add state for showing policies
const [showPolicies, setShowPolicies] = useState(false);

// In the render, add toggle button and conditional render
return (
    <div className="w-full space-y-4">
        {/* Toggle button for request policies */}
        <div className="flex justify-end">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPolicies(!showPolicies)}
            >
                {showPolicies ? 'Hide' : 'Show'} Request Policies
            </Button>
        </div>

        {/* Show request policies if toggled */}
        {showPolicies && (
            <RequestPoliciesView
                stationId={stationId}
                identity={identity}
            />
        )}

        {/* Existing components */}
        <AdminRemovalActions ... />
        <DAOTransitionChecklist ... />
    </div>
);
```

### Task 5: Add Service Method for Frontend
**File**: `daopad_frontend/src/services/backend/orbit/security/OrbitSecurityService.js` (ADD METHOD)

```javascript
// PSEUDOCODE - Add new method
async getRequestPoliciesDetails(stationId) {
    try {
        const actor = await this.getActor();
        const stationPrincipal = this.toPrincipal(stationId);
        const result = await actor.get_request_policies_details(stationPrincipal);

        if ('Ok' in result) {
            return {
                success: true,
                data: {
                    policies: result.Ok.policies.map(p => ({
                        operation: p.operation,
                        approvalRule: p.approval_rule,
                        specifier: p.specifier,
                        rule: p.rule
                    })),
                    totalCount: result.Ok.total_count,
                    autoApprovedCount: result.Ok.auto_approved_count,
                    bypassCount: result.Ok.bypass_count
                }
            };
        }
        return { success: false, error: result.Err };
    } catch (error) {
        console.error('Failed to get request policies:', error);
        return { success: false, error: error.message };
    }
}
```

## 🧪 Testing Requirements

```bash
# 1. Test backend method
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai get_request_policies_details '(principal "fec7w-zyaaa-aaaaa-qaffq-cai")'

# 2. Build and deploy backend
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
./deploy.sh --network ic --backend-only

# 3. Sync declarations (CRITICAL)
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# 4. Build and deploy frontend
npm run build
./deploy.sh --network ic --frontend-only

# 5. Verify in browser
# Navigate to Security tab for ALEX token
# Click "Show Request Policies"
# Verify all 30 policies are displayed with correct approval rules
```

## ✅ Success Criteria

1. All 30 request policies from Orbit Station are displayed
2. Each policy shows:
   - Operation name (human-readable)
   - Approval requirement (resolved from named rules)
3. Policies are grouped by category for easy viewing
4. Toggle to show/hide policies view
5. Visual indicators for different approval types (Admin, Operator, Auto-approved)
6. Statistics showing total, auto-approved, and bypass counts

## 🎯 Answer to Original Question

**Q: Do we take request policies into consideration in our security tab?**

**Current Answer**: Partially. We check for policy bypasses and auto-approvals in aggregate but don't show individual policies.

**After Implementation**: Yes, fully. Users will see all request policies with their approval requirements, exactly like in the Orbit UI.