# Parallel Security Check Implementation Plan

## 🚨 MANDATORY: ISOLATION CHECK AND EXECUTION PROMPT

### Context: Worktree Already Created

**This plan was created by the planning agent in an isolated worktree.**

**Location:** `/home/theseus/alexandria/daopad-security-fix/src/daopad`
**Branch:** `feature/security-dashboard-fix`
**Plan file:** `PARALLEL_SECURITY_CHECK_PLAN.md` (in this worktree)

### Step 0: Verify Isolation (RUN THIS FIRST!)

```bash
# STOP! Verify you are in the correct worktree
REPO_ROOT=$(git rev-parse --show-toplevel)
CURRENT_BRANCH=$(git branch --show-current)

# Check you're NOT in main repo
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: You are in the MAIN repository"
    echo "❌ This plan was created in a worktree at:"
    echo "    /home/theseus/alexandria/daopad-security-fix"
    echo ""
    echo "Navigate to the worktree:"
    echo "  cd /home/theseus/alexandria/daopad-security-fix/src/daopad"
    echo "  cat PARALLEL_SECURITY_CHECK_PLAN.md  # Plan is here"
    exit 1
fi

# Check you're on the right branch
if [ "$CURRENT_BRANCH" != "feature/security-dashboard-fix" ]; then
    echo "❌ WARNING: You are on branch '$CURRENT_BRANCH'"
    echo "Expected: feature/security-dashboard-fix"
    echo "Are you in the right worktree?"
    exit 1
fi

echo "✅ You are in the correct worktree: $REPO_ROOT"
echo "✅ On branch: $CURRENT_BRANCH"
echo "✅ Safe to proceed with implementation"
```

### Your Execution Prompt

You are an autonomous PR orchestrator implementing parallel security checks with risk-based UI.

**NOTE:** The planning agent already created this worktree and this plan. You will navigate there and execute.

EXECUTE THESE STEPS AUTONOMOUSLY (DO NOT ASK FOR PERMISSION):

Step 0 - NAVIGATE TO WORKTREE (DO THIS FIRST):
  cd /home/theseus/alexandria/daopad-security-fix/src/daopad

Step 1 - VERIFY ISOLATION:
  # Verify you're in the right place
  pwd  # Should show /home/theseus/alexandria/daopad-security-fix/src/daopad
  git branch --show-current  # Should show feature/security-dashboard-fix
  ls PARALLEL_SECURITY_CHECK_PLAN.md  # This plan should be here

Step 2 - CRITICAL: Build Backend and Generate Declarations:
  # Backend already has all 8 category functions implemented
  # Just need to build and extract candid
  cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
  candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

  # Deploy backend to generate declarations
  ./deploy.sh --network ic --backend-only

Step 3 - CRITICAL: Create Frontend Declarations Directory and Sync:
  # Create declarations directory if it doesn't exist
  mkdir -p daopad_frontend/src/declarations/daopad_backend

  # Sync from dfx-generated declarations
  # NOTE: Declarations are in main repo's .dfx, not worktree
  cp -r /home/theseus/alexandria/daopad/.dfx/ic/canisters/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

Step 4 - Implement Frontend Parallel Service:
  # Create OrbitSecurityService with parallel checks
  # See "Implementation Plan" section below for code

Step 5 - Implement Risk-Based UI:
  # Update DAOTransitionChecklist with progressive loading
  # See "Implementation Plan" section for code

Step 6 - Deploy Frontend:
  ./deploy.sh --network ic --frontend-only

Step 7 - Test on Mainnet:
  # Visit https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
  # Navigate to Security tab
  # Verify progressive loading and risk-based display

Step 8 - Commit and Push:
  git add -A
  git commit -m "Fix Security Dashboard: Sync declarations and implement parallel checks with risk-based UI"
  git push -u origin feature/security-dashboard-fix

Step 9 - Create PR:
  gh pr create --title "Fix Security Dashboard: Parallel Checks with Risk-Based UI" --body "$(cat <<'EOF'
## Summary
- ✅ Fix missing declarations (root cause of 'is not a function' error)
- ✅ Implement parallel security check loading (8 category endpoints)
- ✅ Add progressive UI showing checks as they complete
- ✅ Risk-based display (Critical → High → Medium → Low → Passing)
- ✅ Decentralization score with visual progress indicator

## Technical Changes
- **Frontend Declarations:** Generated and synced from backend
- **OrbitSecurityService:** New parallel check orchestrator
- **DAOTransitionChecklist:** Risk-based collapsible UI
- **Progressive Loading:** Shows results as they arrive

## Testing
- ✅ Backend functions tested with dfx
- ✅ Declarations synced to frontend
- ✅ Frontend deployed and tested on mainnet
- ✅ Security tab loads without errors
- ✅ All 8 categories display correctly

See PARALLEL_SECURITY_CHECK_PLAN.md for full details.
EOF
)"

YOUR CRITICAL RULES:
- You MUST work in /home/theseus/alexandria/daopad-security-fix/src/daopad (NOT main repo)
- Other agents ARE working in parallel - isolation is MANDATORY
- After sleep: IMMEDIATELY continue (no "should I check?" questions)
- Run candid-extractor after backend changes
- Sync declarations from MAIN REPO's .dfx to worktree frontend
- ONLY STOP when: approved or critical error

START NOW with Step 0.

---

## 📊 Problem Analysis

### Root Cause: Missing Frontend Declarations

**Error:** `TypeError: r.perform_security_check is not a function`

**Investigation:**
```bash
# ✅ Backend has function
grep "perform_security_check" daopad_backend/src/api/orbit_security.rs
# Result: Function exists at line 864

# ✅ Candid includes function
grep "perform_security_check" daopad_backend/daopad_backend.did
# Result: perform_security_check : (principal) -> (Result_26);

# ❌ Frontend declarations DON'T EXIST
ls daopad_frontend/src/declarations/daopad_backend/
# Result: No such file or directory
```

**Diagnosis:** Classic declaration sync bug. Backend deployed but frontend never got the generated TypeScript/JavaScript bindings.

### Secondary Issue: Monolithic Approach Inefficiency

The backend already has 8 category-based check functions:
1. `check_admin_control`
2. `check_treasury_control`
3. `check_governance_permissions`
4. `check_proposal_policies`
5. `check_external_canisters`
6. `check_asset_management`
7. `check_system_configuration`
8. `check_operational_permissions`

But the frontend only calls `perform_security_check` which:
- Waits for ALL checks sequentially
- No progress indication
- All-or-nothing result
- Slow perceived performance

**Opportunity:** Call all 8 endpoints in parallel, show progressive results.

---

## 🏗️ Current State

### Backend (daopad_backend/src/api/orbit_security.rs - 1124 lines)

**✅ ALREADY IMPLEMENTED:**
- 8 category-based check endpoints (lines 88-161)
- `perform_security_check` wrapper function (line 864)
- `EnhancedSecurityDashboard` response type with:
  - `decentralization_score` (0-100)
  - `overall_status` (secure/critical/high_risk/etc.)
  - `checks` (all security checks)
  - `critical_issues` (filtered criticals)
  - `recommended_actions` (how to fix)
- Risk scoring algorithm with severity weighting
- 25+ individual security checks across 8 categories

**✅ Backend is feature-complete!** No backend changes needed.

### Frontend

**❌ MISSING:**
- Declarations directory doesn't exist
- Cannot call any backend functions
- Security tab crashes with "is not a function"

**📦 EXISTS BUT NEEDS ENHANCEMENT:**
- `SecurityDashboard.jsx` - Basic structure exists
- `DAOTransitionChecklist.jsx` - Needs risk-based UI
- `daopadBackend.js` - Has performSecurityCheck but unused

---

## 🔧 Implementation Plan

### Phase 1: CRITICAL - Generate and Sync Declarations (30 mins)

#### File 1: Build Backend and Extract Candid

**Location:** From worktree `/home/theseus/alexandria/daopad-security-fix/src/daopad`

```bash
# Build backend (backend code is unchanged, just regenerating artifacts)
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked

# Extract candid interface
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Verify candid has all functions
grep "check_admin_control\|check_treasury_control\|perform_security_check" daopad_backend/daopad_backend.did
# Expected: All 9 functions listed (8 category + 1 wrapper)
```

#### File 2: Deploy Backend to Generate Declarations

```bash
# Deploy backend (this generates declarations in .dfx)
./deploy.sh --network ic --backend-only

# Expected output:
# - Backend canister deployed: lwsav-iiaaa-aaaap-qp2qq-cai
# - Declarations generated in /home/theseus/alexandria/daopad/.dfx/ic/canisters/daopad_backend/
```

**CRITICAL NOTE:** The worktree doesn't have its own .dfx directory. Declarations are generated in the MAIN repo's .dfx. We must copy from there.

#### File 3: Create Declarations Directory and Sync

```bash
# Create frontend declarations directory
mkdir -p daopad_frontend/src/declarations/daopad_backend

# Copy from MAIN REPO's .dfx (not worktree)
cp -r /home/theseus/alexandria/daopad/.dfx/ic/canisters/daopad_backend/* \
     daopad_frontend/src/declarations/daopad_backend/

# Verify sync worked
ls -la daopad_frontend/src/declarations/daopad_backend/
# Expected: daopad_backend.did.js, daopad_backend.did.d.ts, index.js, etc.

# Verify perform_security_check is in declarations
grep "perform_security_check" daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js
# Expected: Function signature found
```

**Why this fixes the error:**
- Frontend imports from `../../declarations/daopad_backend`
- Actor is created from these declarations
- Now `actor.perform_security_check()` will exist
- Error disappears immediately

### Phase 2: Parallel Check Service (1-2 hours)

#### File 1: `daopad_frontend/src/services/backend/orbit/security/OrbitSecurityService.js` (MODIFY)

**Current:** Only has wrapper for monolithic performSecurityCheck
**Target:** Add parallel check orchestrator

**Add this code:**

```javascript
// PSEUDOCODE - implementing agent will write real code

import { OrbitServiceBase } from '../OrbitServiceBase';

export class OrbitSecurityService extends OrbitServiceBase {
    constructor(identity) {
        super('daopad_backend', identity);
    }

    /**
     * Perform all 8 security checks in parallel and aggregate results
     * Progressive callback allows UI to update as each check completes
     */
    async performComprehensiveSecurityCheck(stationId, progressCallback = null) {
        const categories = [
            { name: 'admin_control', method: 'check_admin_control', priority: 1 },
            { name: 'treasury_control', method: 'check_treasury_control', priority: 1 },
            { name: 'governance_permissions', method: 'check_governance_permissions', priority: 1 },
            { name: 'proposal_policies', method: 'check_proposal_policies', priority: 2 },
            { name: 'external_canisters', method: 'check_external_canisters', priority: 2 },
            { name: 'asset_management', method: 'check_asset_management', priority: 3 },
            { name: 'system_configuration', method: 'check_system_configuration', priority: 3 },
            { name: 'operational_permissions', method: 'check_operational_permissions', priority: 3 },
        ];

        const actor = await this.getActor();
        const stationPrincipal = this.toPrincipal(stationId);

        // Call all checks in parallel
        const checkPromises = categories.map(async (category) => {
            try {
                const result = await actor[category.method](stationPrincipal);

                // Handle Result<Vec<SecurityCheck>, String>
                if ('Ok' in result) {
                    const checks = result.Ok.map(check => ({
                        category: check.category,
                        name: check.name,
                        status: Object.keys(check.status)[0], // Pass/Warn/Fail/Error
                        message: check.message,
                        severity: check.severity && check.severity.length > 0
                            ? Object.keys(check.severity[0])[0]
                            : 'None',
                        details: check.details && check.details.length > 0
                            ? check.details[0]
                            : null,
                        recommendation: check.recommendation && check.recommendation.length > 0
                            ? check.recommendation[0]
                            : null,
                    }));

                    // Notify progress callback
                    if (progressCallback) {
                        progressCallback({
                            category: category.name,
                            checks,
                            completed: true,
                        });
                    }

                    return { category: category.name, checks, error: null };
                } else {
                    const error = result.Err;
                    console.error(`Check ${category.name} failed:`, error);

                    if (progressCallback) {
                        progressCallback({
                            category: category.name,
                            checks: [],
                            completed: true,
                            error,
                        });
                    }

                    return { category: category.name, checks: [], error };
                }
            } catch (err) {
                console.error(`Error calling ${category.method}:`, err);

                if (progressCallback) {
                    progressCallback({
                        category: category.name,
                        checks: [],
                        completed: true,
                        error: err.message,
                    });
                }

                return { category: category.name, checks: [], error: err.message };
            }
        });

        // Wait for all checks to complete
        const results = await Promise.all(checkPromises);

        // Aggregate all checks
        const allChecks = results.flatMap(r => r.checks);

        // Calculate risk score client-side
        const dashboard = this.calculateRiskScore(stationPrincipal, allChecks);

        return {
            success: true,
            data: dashboard,
        };
    }

    /**
     * Calculate risk score and build dashboard from checks
     * Mirrors backend logic but runs client-side for parallel aggregation
     */
    calculateRiskScore(stationId, checks) {
        const weights = {
            Critical: 30.0,
            High: 20.0,
            Medium: 10.0,
            Low: 5.0,
            None: 0.0,
        };

        let score = 100.0;
        const criticalIssues = [];
        const recommendedActions = [];

        checks.forEach(check => {
            if (check.status === 'Fail') {
                const penalty = weights[check.severity] || 0;
                score -= penalty;

                if (check.severity === 'Critical' || check.severity === 'High') {
                    criticalIssues.push(check);
                }

                if (check.recommendation) {
                    recommendedActions.push(check.recommendation);
                }
            } else if (check.status === 'Warn') {
                const penalty = (weights[check.severity] || 0) * 0.5;
                score -= penalty;
            }
        });

        score = Math.max(0, Math.min(100, Math.round(score)));

        const overallStatus = score < 30 ? 'critical'
            : score < 60 ? 'high_risk'
            : score < 85 ? 'medium_risk'
            : 'secure';

        const riskSummary = score < 30
            ? `NOT A DAO - ${criticalIssues.length} critical issues prevent community governance`
            : score < 60
            ? `PARTIAL DAO - ${criticalIssues.length} issues allow admin bypass`
            : score < 85
            ? 'MOSTLY DECENTRALIZED - Minor issues remain'
            : 'TRUE DAO - Full community governance';

        return {
            station_id: stationId,
            overall_status: overallStatus,
            decentralization_score: score,
            last_checked: Date.now(),
            checks,
            risk_summary: riskSummary,
            critical_issues: criticalIssues,
            recommended_actions: [...new Set(recommendedActions)], // Deduplicate
        };
    }

    // Legacy monolithic method (keep for backward compatibility)
    async performSecurityCheck(stationId) {
        const actor = await this.getActor();
        const stationPrincipal = this.toPrincipal(stationId);
        const result = await actor.perform_security_check(stationPrincipal);

        if ('Ok' in result) {
            const dashboard = result.Ok;
            return {
                success: true,
                data: {
                    station_id: dashboard.station_id,
                    overall_status: dashboard.overall_status,
                    decentralization_score: Number(dashboard.decentralization_score),
                    last_checked: Number(dashboard.last_checked),
                    checks: dashboard.checks.map(check => ({
                        category: check.category,
                        name: check.name,
                        status: Object.keys(check.status)[0],
                        message: check.message,
                        severity: check.severity && check.severity.length > 0
                            ? Object.keys(check.severity[0])[0]
                            : 'None',
                        details: check.details && check.details.length > 0 ? check.details[0] : null,
                        recommendation: check.recommendation && check.recommendation.length > 0
                            ? check.recommendation[0]
                            : null,
                    })),
                    risk_summary: dashboard.risk_summary,
                    critical_issues: dashboard.critical_issues.map(issue => ({
                        category: issue.category,
                        name: issue.name,
                        status: Object.keys(issue.status)[0],
                        message: issue.message,
                        severity: issue.severity && issue.severity.length > 0
                            ? Object.keys(issue.severity[0])[0]
                            : 'None',
                        details: issue.details && issue.details.length > 0 ? issue.details[0] : null,
                        recommendation: issue.recommendation && issue.recommendation.length > 0
                            ? issue.recommendation[0]
                            : null,
                    })),
                    recommended_actions: dashboard.recommended_actions,
                },
            };
        } else {
            return {
                success: false,
                message: result.Err,
            };
        }
    }
}
```

**Why Parallel:**
- 8 independent backend calls happen simultaneously
- Each returns when ready (no waiting for slowest)
- Progress callback updates UI as results arrive
- Perceived performance: "instant" for first results

### Phase 3: Progressive Risk-Based UI (2-3 hours)

#### File 1: `daopad_frontend/src/components/security/SecurityDashboard.jsx` (MODIFY)

**Changes:**
1. Use new `performComprehensiveSecurityCheck` with progress callback
2. Show progressive loading (categories appear as they complete)
3. Pass enriched data to DAOTransitionChecklist

**Replace fetchSecurityStatus:**

```javascript
// PSEUDOCODE - implementing agent will write real code

const [progressData, setProgressData] = useState({
    admin_control: null,
    treasury_control: null,
    governance_permissions: null,
    proposal_policies: null,
    external_canisters: null,
    asset_management: null,
    system_configuration: null,
    operational_permissions: null,
});
const [completedCount, setCompletedCount] = useState(0);

const fetchSecurityStatus = async () => {
    if (!stationId || !identity) return;

    setLoading(true);
    setError(null);
    setCompletedCount(0);
    setProgressData({
        admin_control: null,
        treasury_control: null,
        governance_permissions: null,
        proposal_policies: null,
        external_canisters: null,
        asset_management: null,
        system_configuration: null,
        operational_permissions: null,
    });

    try {
        const securityService = new OrbitSecurityService(identity);

        // Progress callback to update UI as checks complete
        const onProgress = (progress) => {
            setProgressData(prev => ({
                ...prev,
                [progress.category]: progress,
            }));
            setCompletedCount(prev => prev + 1);
        };

        const result = await securityService.performComprehensiveSecurityCheck(
            stationId,
            onProgress
        );

        if (result.success) {
            setSecurityData(result.data);
        } else {
            setError(result.message || 'Failed to verify security status');
        }
    } catch (err) {
        console.error('Security check failed:', err);
        setError('Failed to verify security status. Please try again.');
    } finally {
        setLoading(false);
    }
};

// Show progress during loading
if (loading) {
    return (
        <Card className="border shadow-sm">
            <CardContent className="py-8">
                <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                        <span className="text-gray-600">
                            Analyzing DAO security... ({completedCount}/8 checks complete)
                        </span>
                    </div>

                    {/* Show categories as they complete */}
                    <div className="max-w-md mx-auto space-y-2">
                        {Object.entries(progressData).map(([category, data]) => (
                            <div key={category} className="flex items-center gap-2 text-sm">
                                {data ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        <span className="text-gray-700">
                                            {category.replace(/_/g, ' ')} ✓
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-4 h-4 rounded-full border-2 border-gray-300 animate-pulse" />
                                        <span className="text-gray-400">
                                            {category.replace(/_/g, ' ')}
                                        </span>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
```

#### File 2: `daopad_frontend/src/components/security/DAOTransitionChecklist.jsx` (MAJOR ENHANCEMENT)

**Keep existing structure but enhance with:**
1. Risk-based grouping (Critical → High → Medium → Low → Passing)
2. Collapsible sections with counts
3. Decentralization score display
4. Recommended actions card

**Add before return statement:**

```javascript
// PSEUDOCODE - implementing agent will write real code

// Group checks by risk level
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
        } else if ((check.status === 'Fail' || check.status === 'Warn') &&
                   (check.severity === 'Medium' || check.severity === 'Low')) {
            groups.medium.push(check);
        } else if (check.status === 'Warn') {
            groups.low.push(check);
        } else if (check.status === 'Pass') {
            groups.passing.push(check);
        }
    });

    return groups;
}, [securityData]);

const [expandedSections, setExpandedSections] = useState({
    critical: true,  // Always expanded
    high: false,
    medium: false,
    low: false,
    passing: false,
});

const toggleSection = (section) => {
    setExpandedSections(prev => ({
        ...prev,
        [section]: !prev[section],
    }));
};
```

**Replace return JSX with risk-based sections:**

```javascript
// PSEUDOCODE - implementing agent will write real code

return (
    <div className="space-y-4">
        {/* BIG SCORE DISPLAY */}
        <Card className={`border-2 ${getScoreColorClass(securityData.decentralization_score)}`}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <h2 className="text-3xl font-bold mb-2">
                            {securityData.decentralization_score}% Decentralized
                        </h2>
                        <p className="text-lg font-semibold mb-2">
                            {getScoreLabel(securityData.decentralization_score)}
                        </p>
                        <p className="text-sm opacity-80">
                            {securityData.risk_summary}
                        </p>
                    </div>
                    <div className="ml-6">
                        {/* Circular progress indicator */}
                        <div className="relative w-24 h-24">
                            <svg className="transform -rotate-90 w-24 h-24">
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="40"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    className="text-gray-200"
                                />
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="40"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 40}`}
                                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - securityData.decentralization_score / 100)}`}
                                    className={getScoreColor(securityData.decentralization_score)}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xl font-bold">
                                    {securityData.decentralization_score}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* CRITICAL RISKS - Always visible, red */}
        {groupedChecks.critical.length > 0 && (
            <RiskSection
                title="🚨 CRITICAL RISKS - Immediate Action Required"
                checks={groupedChecks.critical}
                expanded={true}
                alwaysExpanded={true}
                colorClass="border-red-500 bg-red-50"
                badgeClass="bg-red-100 text-red-800"
                description="These issues prevent true DAO governance. Individual admins can bypass community."
            />
        )}

        {/* HIGH RISKS - Collapsed by default, orange */}
        {groupedChecks.high.length > 0 && (
            <RiskSection
                title="⚠️ HIGH RISKS - Significant Concerns"
                checks={groupedChecks.high}
                expanded={expandedSections.high}
                onToggle={() => toggleSection('high')}
                colorClass="border-orange-500 bg-orange-50"
                badgeClass="bg-orange-100 text-orange-800"
                description="These issues create backdoors that could undermine governance."
            />
        )}

        {/* MEDIUM RISKS - Collapsed, yellow */}
        {groupedChecks.medium.length > 0 && (
            <RiskSection
                title="⚠️ MEDIUM RISKS - Review Recommended"
                checks={groupedChecks.medium}
                expanded={expandedSections.medium}
                onToggle={() => toggleSection('medium')}
                colorClass="border-yellow-500 bg-yellow-50"
                badgeClass="bg-yellow-100 text-yellow-800"
                description="These configurations may need adjustment for production."
            />
        )}

        {/* PASSING CHECKS - Hidden by default, green */}
        {groupedChecks.passing.length > 0 && (
            <RiskSection
                title={`✓ ${groupedChecks.passing.length} Checks Passing`}
                checks={groupedChecks.passing}
                expanded={expandedSections.passing}
                onToggle={() => toggleSection('passing')}
                colorClass="border-green-500 bg-green-50"
                badgeClass="bg-green-100 text-green-800"
                description="These settings are secure and properly configured."
            />
        )}

        {/* RECOMMENDED ACTIONS */}
        {securityData.recommended_actions && securityData.recommended_actions.length > 0 && (
            <Card className="border-2 border-blue-500 bg-blue-50">
                <CardHeader>
                    <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Next Steps to Full Decentralization
                    </h3>
                </CardHeader>
                <CardContent className="space-y-3">
                    {securityData.recommended_actions.map((action, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                                {idx + 1}
                            </div>
                            <p className="text-sm text-blue-900 flex-1">{action}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>
        )}

        {/* REFRESH BUTTON */}
        <div className="flex justify-end">
            <Button onClick={onRefresh} variant="outline">
                Refresh Analysis
            </Button>
        </div>
    </div>
);

// Helper components
const RiskSection = ({ title, checks, expanded, onToggle, alwaysExpanded, colorClass, badgeClass, description }) => (
    <Card className={`border-2 ${colorClass}`}>
        <CardHeader
            className={`cursor-pointer hover:opacity-80 ${alwaysExpanded ? '' : ''}`}
            onClick={alwaysExpanded ? undefined : onToggle}
        >
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <p className="text-sm mt-1 opacity-80">{description}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${badgeClass}`}>
                        {checks.length} {checks.length === 1 ? 'issue' : 'issues'}
                    </span>
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
                    <CheckItem key={idx} check={check} />
                ))}
            </CardContent>
        )}
    </Card>
);

const CheckItem = ({ check }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
            <div className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                check.status === 'Fail' ? 'bg-red-100 text-red-800' :
                                check.status === 'Warn' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                            }`}>
                                {check.status}
                            </span>
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
                            <span className="font-semibold text-blue-700">How to Fix:</span>
                            <p className="text-gray-700 mt-1">{check.recommendation}</p>
                        </div>
                    )}

                    <div className="text-xs text-gray-500">
                        Category: {check.category} | Severity: {check.severity}
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper functions
function getScoreColorClass(score) {
    if (score < 30) return 'border-red-500 bg-red-50 text-red-900';
    if (score < 60) return 'border-orange-500 bg-orange-50 text-orange-900';
    if (score < 85) return 'border-yellow-500 bg-yellow-50 text-yellow-900';
    return 'border-green-500 bg-green-50 text-green-900';
}

function getScoreColor(score) {
    if (score < 30) return 'text-red-600';
    if (score < 60) return 'text-orange-600';
    if (score < 85) return 'text-yellow-600';
    return 'text-green-600';
}

function getScoreLabel(score) {
    if (score < 30) return 'NOT A DAO';
    if (score < 60) return 'PARTIAL DAO';
    if (score < 85) return 'MOSTLY DECENTRALIZED';
    return 'TRUE DAO';
}
```

---

## 🧪 Testing Strategy

### Backend Verification (Already Complete)

```bash
# Backend functions already deployed and working
# Just verify declarations exist after sync

cd /home/theseus/alexandria/daopad-security-fix/src/daopad

# Check candid has all functions
grep "check_admin_control\|check_treasury\|perform_security_check" daopad_backend/daopad_backend.did

# Expected: 9 functions (8 category + 1 wrapper)
```

### Frontend Testing

```bash
# After declaration sync, test a single category check
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai check_admin_control '(principal "fec7w-zyaaa-aaaaa-qaffq-cai")'

# Expected output:
# (
#   variant {
#     Ok = vec {
#       record {
#         category = "Admin Control";
#         name = "Backend Admin Status";
#         status = variant { Pass };
#         message = "Backend is correctly configured as admin";
#         ...
#       };
#       ...
#     }
#   }
# )
```

### Integration Test (Mainnet)

1. Deploy frontend: `./deploy.sh --network ic --frontend-only`
2. Navigate to: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
3. Connect wallet
4. Navigate to Security tab
5. **Expected behavior:**
   - No "is not a function" error ✓
   - Progressive loading indicator shows 0/8 → 8/8
   - Categories appear as checks complete
   - Decentralization score displays prominently
   - Critical risks section shows in red (if any)
   - Collapsible sections work
   - Recommended actions display
   - All 25+ checks visible across categories

---

## 📏 Scope Estimate

### Files Modified

- **New files:** 0
- **Modified files:** 3
  - `OrbitSecurityService.js` (add parallel orchestrator)
  - `SecurityDashboard.jsx` (add progressive loading)
  - `DAOTransitionChecklist.jsx` (add risk-based UI)

### Lines of Code

- **Frontend service:** +200 lines (parallel orchestrator + risk scoring)
- **SecurityDashboard:** +50 lines (progress UI)
- **DAOTransitionChecklist:** +300 lines (risk-based sections + helper components)
- **Net:** +550 lines

### Complexity

- **Low:** Declaration sync (just copy files)
- **Medium:** Parallel service with Promise.all
- **Medium:** Progressive loading UI
- **Medium:** Risk-based collapsible sections

### Time Estimate

- **Phase 1 (Declaration sync):** 30 minutes
  - Build backend
  - Deploy backend
  - Copy declarations
  - Verify sync
- **Phase 2 (Parallel service):** 1-2 hours
  - Implement parallel check method
  - Add progress callback
  - Test with dfx
- **Phase 3 (Risk-based UI):** 2-3 hours
  - Add progressive loading
  - Implement collapsible sections
  - Add score display
  - Test in browser
- **Total:** 4-6 hours in 1 PR

---

## ✅ Success Criteria

### Immediate Fix
- ✅ No "is not a function" error
- ✅ Security tab loads without crashing
- ✅ Backend methods callable from frontend

### Progressive Loading
- ✅ UI shows "0/8 checks complete" during loading
- ✅ Categories appear as they finish
- ✅ Perceived performance: <1 second to first result
- ✅ Total time: <5 seconds for all checks

### Risk-Based Display
- ✅ Critical issues displayed prominently in red
- ✅ High/Medium/Low risks in collapsible sections
- ✅ Passing checks hidden by default
- ✅ Decentralization score visible at top
- ✅ Recommended actions section shows next steps

### User Experience
- ✅ Users can quickly identify "is this a DAO?"
- ✅ Critical problems jump out visually
- ✅ Details accessible via expand/collapse
- ✅ Each check has explanation + recommendation
- ✅ Score correlates with actual centralization risk

---

## 🚀 Handoff to Implementing Agent

**Plan Complete:** Parallel Security Check with Risk-Based UI

**Location:** `/home/theseus/alexandria/daopad-security-fix/src/daopad`
**Branch:** `feature/security-dashboard-fix`
**Document:** `PARALLEL_SECURITY_CHECK_PLAN.md` (committed to feature branch)

**Estimated:** 4-6 hours, 1 PR

**Handoff instructions for implementing agent:**

```bash
# Navigate to the worktree where the plan lives
cd /home/theseus/alexandria/daopad-security-fix/src/daopad

# Read the plan
cat PARALLEL_SECURITY_CHECK_PLAN.md

# Then pursue it
# (The plan contains the full orchestrator prompt)
```

**Or use this one-line prompt:**

```
cd /home/theseus/alexandria/daopad-security-fix/src/daopad && pursue PARALLEL_SECURITY_CHECK_PLAN.md
```

**CRITICAL:**
- Plan is IN the worktree (not main repo)
- Plan is already committed to feature branch
- Implementing agent works in SAME worktree
- Plan and implementation stay together on feature branch
- Declarations MUST be synced from main repo's .dfx

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
