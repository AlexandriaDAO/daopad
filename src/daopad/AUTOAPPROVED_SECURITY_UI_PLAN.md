# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-autoapproved-complete/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-autoapproved-complete/src/daopad`
2. **Merge PR #73** - Cherry-pick the backend function first
3. **Implement feature** - Follow plan sections below
4. **Build & Deploy**:
   ```bash
   # Backend
   cargo build --target wasm32-unknown-unknown --release -p daopad_backend
   candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
   ./deploy.sh --network ic --backend-only

   # Sync declarations
   cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

   # Frontend
   npm run build
   ./deploy.sh --network ic --frontend-only
   ```
5. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Feature]: Complete AutoApproved Setup with Security Tab Integration"
   git push -u origin feature/autoapproved-complete
   gh pr create --title "[Feature]: AutoApproved Setup - Complete Implementation" --body "Implements complete AutoApproved setup feature with Security tab integration.

## What This Does
Users discover and configure AutoApproved policies through Settings > Security tab.

## Components
- Backend: create_autoapprove_all_accounts() + account status check
- Frontend: Setup wizard in Security dashboard
- Integration: Status detection → guided setup → verification

Supersedes PRs #72 (docs only) and #73 (backend only)."
   ```
6. **Iterate autonomously**:
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

**Branch:** `feature/autoapproved-complete`
**Worktree:** `/home/theseus/alexandria/daopad-autoapproved-complete/src/daopad`

---

# Complete AutoApproved Setup Feature Implementation

## Task Classification
**NEW FEATURE**: Complete AutoApproved setup with Security tab integration

## Problem Statement

**User Pain**: When users create treasury proposals, transfers get stuck "Pending" forever with no explanation why.

**Root Cause**: Orbit Station requires AutoApproved policies for DAOPad's architecture (backend is sole admin, can't approve its own requests).

**Current Gaps**:
- ❌ Users don't know AutoApproved setup is required
- ❌ No status detection (is it configured?)
- ❌ No guided setup flow
- ❌ No error messages explaining stuck transfers

## Current State (Master Branch)

### Backend Files

**`daopad_backend/src/api/orbit_security.rs`** (1956 lines)
- Line 649-673: `check_proposal_policies_impl()` - INCORRECTLY treats AutoApproved as "warning"
- Line 1165-1363: `perform_all_security_checks()` - Aggregates 16 security checks
- Missing: Account AutoApproved status check
- Missing: Correct messaging about AutoApproved being required

**`daopad_backend/src/types/orbit.rs`** (existing types)
- Line 332-340: `Account` struct with `transfer_request_policy` field
- Line 317-329: `RequestPolicyRule` enum including `AutoApproved` variant
- Missing: `EditAccountOperationInput` (exists in PR #73)
- Missing: `ChangeAssets` enum (exists in PR #73)

**`daopad_backend/src/api/orbit_accounts.rs`** (288 lines)
- Line 69-90: Disabled `create_treasury_account()` - requires proposals
- Line 163-274: `check_backend_status()` - Checks if backend is Orbit member
- Missing: `create_autoapprove_all_accounts()` function (exists in PR #73)

### Frontend Files

**`daopad_frontend/src/components/security/SecurityDashboard.tsx`** (428 lines)
- Line 1-11: Imports including security service, checklist, policies view
- Line 12: Props: `stationId, tokenSymbol, identity, tokenId`
- Line 41-86: `fetchSecurityStatus()` - Calls backend security check
- Line 95-133: Loading state with progress indicators (16 checks)
- Line 295-428: Renders security score, checks, admin removal actions
- Missing: AutoApproved setup wizard integration

**`daopad_frontend/src/services/backend/orbit/security/OrbitSecurityService.ts`** (exists)
- Service layer for security checks
- Missing: Method to check account AutoApproved status

**Missing File**: `daopad_frontend/src/components/security/AutoApprovedSetupWizard.tsx`
- Needs to be created entirely

### Integration Points

**Security Dashboard Flow** (current):
1. User opens Settings > Security
2. Dashboard calls `perform_security_check(stationId)`
3. Backend runs 16 checks, returns score
4. Frontend displays score + critical issues
5. Shows admin removal actions if needed

**New Flow** (after this feature):
1-4. Same as above
5. **NEW**: Check if accounts have AutoApproved
6. **NEW**: If NOT configured, show setup wizard
7. **NEW**: User clicks "Configure" → calls backend function
8. **NEW**: Guide user to approve in Orbit UI
9. **NEW**: User rechecks → wizard disappears if done

## Implementation Plan

### Part 1: Merge PR #73 Changes

**Cherry-pick from PR #73 branch:**

```bash
# In worktree, fetch and cherry-pick PR #73 commits
git fetch origin feature/autoapproved-automation
git cherry-pick <commit-hash>  # The commit with create_autoapprove_all_accounts
```

**Files from PR #73 to include:**
- `daopad_backend/src/types/orbit.rs`: EditAccountOperationInput, ChangeAssets
- `daopad_backend/src/api/orbit_accounts.rs`: create_autoapprove_all_accounts()

### Part 2: Backend - Fix Security Check Messaging

**File**: `daopad_backend/src/api/orbit_security.rs`

**Location**: Line 649-673 in `check_proposal_policies_impl()`

**Current Code** (WRONG):
```rust
// Line 649-673
if auto_approved_count > 0 {
    checks.push(SecurityCheck {
        category: "Request Policies".to_string(),
        name: "Auto-Approval Policies".to_string(),
        status: CheckStatus::Warn,  // WRONG
        message: format!("{} policies are auto-approved (development mode)", auto_approved_count),
        severity: Some(Severity::Low),
        details: Some(format!("Auto-approved policies skip all voting - OK for testing, but should be changed for production")),
        recommendation: Some("Before going live, change auto-approved policies to require Admin approval".to_string()),
        related_permissions: None,
    });
} else {
    checks.push(SecurityCheck {
        category: "Request Policies".to_string(),
        name: "Auto-Approval Policies".to_string(),
        status: CheckStatus::Pass,
        message: "No auto-approved policies (production-ready)".to_string(),
        severity: Some(Severity::None),
        details: None,
        recommendation: None,
        related_permissions: None,
    });
}
```

**New Code** (CORRECT - flip the logic):
```rust
// PSEUDOCODE: Fix the security check to treat AutoApproved as GOOD
fn check_proposal_policies_impl(policies: &Vec<RequestPolicy>) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();
    let mut auto_approved_count = 0;

    // ... existing counting logic ...

    // CORRECTED: AutoApproved is GOOD for DAOPad architecture
    if auto_approved_count > 0 {
        checks.push(SecurityCheck {
            category: "Request Policies".to_string(),
            name: "Auto-Approval Policies".to_string(),
            status: CheckStatus::Pass,  // CORRECTED
            message: format!("{} policies use AutoApproved (liquid democracy mode)", auto_approved_count),
            severity: Some(Severity::None),  // Not a problem
            details: Some(
                "AutoApproved policies enable DAOPad's liquid democracy architecture. \
                 Community votes in DAOPad (50%+ threshold, 7-day period), then Orbit \
                 executes automatically. Backend cannot approve its own requests \
                 (separation of duties), so AutoApproved is required.".to_string()
            ),
            recommendation: None,  // No action needed - this is correct
            related_permissions: None,
        });
    } else {
        // WARN if NOT using AutoApproved (unusual for DAOPad)
        checks.push(SecurityCheck {
            category: "Request Policies".to_string(),
            name: "Auto-Approval Policies".to_string(),
            status: CheckStatus::Warn,
            message: "No auto-approved policies detected".to_string(),
            severity: Some(Severity::Low),
            details: Some(
                "DAOPad typically uses AutoApproved policies for request operations. \
                 Without AutoApproved, requests may require redundant manual approval \
                 in Orbit UI.".to_string()
            ),
            recommendation: Some(
                "Check if AutoApproved is needed for your account transfer policies. \
                 See Security tab for account-specific status.".to_string()
            ),
            related_permissions: None,
        });
    }

    checks
}
```

### Part 3: Backend - Add Account AutoApproved Status Check

**File**: `daopad_backend/src/api/orbit_security.rs`

**Location**: Add new function after existing checks (around line 1363)

**PSEUDOCODE**:
```rust
// NEW CHECK CATEGORY: Treasury Setup - Account AutoApproved Status

/// Check if treasury accounts have AutoApproved transfer policies
/// This is CRITICAL for DAOPad liquid democracy to work
#[ic_cdk::update]
pub async fn check_account_autoapproved_status(
    station_id: Principal
) -> Result<Vec<SecurityCheck>, String> {
    // 1. Fetch accounts from Orbit Station
    let accounts = fetch_accounts(station_id).await?;

    // 2. Analyze AutoApproved status
    Ok(check_account_autoapproved_impl(&accounts))
}

fn check_account_autoapproved_impl(accounts: &Vec<Account>) -> Vec<SecurityCheck> {
    let mut checks = Vec::new();

    // Categorize accounts
    let mut autoapproved_accounts = Vec::new();
    let mut non_autoapproved_accounts = Vec::new();

    for account in accounts {
        match &account.transfer_request_policy {
            Some(RequestPolicyRule::AutoApproved) => {
                autoapproved_accounts.push(account.name.clone());
            },
            _ => {
                non_autoapproved_accounts.push(account.name.clone());
            }
        }
    }

    // Determine status
    if non_autoapproved_accounts.is_empty() {
        // ALL accounts configured - GOOD
        checks.push(SecurityCheck {
            category: "Treasury Setup".to_string(),
            name: "Account AutoApproved Status".to_string(),
            status: CheckStatus::Pass,
            message: format!(
                "All {} account(s) configured with AutoApproved policies",
                autoapproved_accounts.len()
            ),
            severity: Some(Severity::None),
            details: Some(
                "Treasury accounts are ready for liquid democracy. \
                 Community votes in DAOPad, backend executes approved operations. \
                 No manual Orbit approval needed.".to_string()
            ),
            recommendation: None,
            related_permissions: None,
        });
    } else {
        // SOME accounts NOT configured - CRITICAL
        checks.push(SecurityCheck {
            category: "Treasury Setup".to_string(),
            name: "Account AutoApproved Status".to_string(),
            status: CheckStatus::Fail,
            message: format!(
                "{} account(s) NOT configured - treasury operations will fail",
                non_autoapproved_accounts.len()
            ),
            severity: Some(Severity::Critical),
            details: Some(format!(
                "Accounts needing setup: {}\n\n\
                 WHY THIS MATTERS:\n\
                 - Backend creates transfer requests after community vote passes\n\
                 - Backend CANNOT approve its own requests (Orbit separation of duties)\n\
                 - Without AutoApproved, requests stuck 'Pending' forever\n\
                 - Users see failed transfers with no explanation\n\n\
                 SECURITY NOTE:\n\
                 This is NOT a security risk. Real governance happens in DAOPad \
                 (50%+ vote required). AutoApproved just tells Orbit to execute \
                 after the vote passes.",
                non_autoapproved_accounts.join(", ")
            )),
            recommendation: Some(
                "Use the setup wizard below to configure AutoApproved policies.".to_string()
            ),
            related_permissions: None,
        });
    }

    checks
}

// Helper: Fetch accounts from Orbit Station
async fn fetch_accounts(station_id: Principal) -> Result<Vec<Account>, String> {
    let input = ListAccountsInput {
        search_term: None,
        paginate: None,
    };

    let result: (ListAccountsResult,) = ic_cdk::call(
        station_id,
        "list_accounts",
        (input,)
    ).await.map_err(|e| format!("Failed to list accounts: {:?}", e))?;

    match result.0 {
        ListAccountsResult::Ok { accounts, .. } => Ok(accounts),
        ListAccountsResult::Err(e) => Err(format!("Orbit error: {}", e)),
    }
}
```

**Integration**: Add to `perform_all_security_checks()` around line 1173:

```rust
// PSEUDOCODE: Add new check to aggregator
pub async fn perform_all_security_checks(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    // ... existing 16 checks ...

    // NEW: Account AutoApproved status check
    let account_autoapproved_result = check_account_autoapproved_status(station_id).await;

    // ... existing combination logic ...

    // Add to combined results
    match account_autoapproved_result {
        Ok(checks) => all_checks.extend(checks),
        Err(ref e) => all_checks.push(create_error_check(
            "Treasury Setup",
            "Account AutoApproved Status",
            Severity::Critical,
            e
        )),
    }

    Ok(all_checks)
}
```

### Part 4: Frontend Service Layer

**File**: `daopad_frontend/src/services/backend/DAOPadBackendService.ts`

**Location**: Add method to service class

**PSEUDOCODE**:
```typescript
// Add method to call create_autoapprove_all_accounts
class DAOPadBackendService {
    // ... existing methods ...

    /**
     * Create AutoApproved policy change requests for all accounts
     * Returns array of request IDs that need approval in Orbit UI
     */
    async createAutoapproveAllAccounts(
        tokenId: Principal
    ): Promise<string[]> {
        const actor = await this.getActor();
        const result = await actor.create_autoapprove_all_accounts(tokenId);

        if ('Ok' in result) {
            return result.Ok;
        } else {
            throw new Error(result.Err);
        }
    }
}
```

### Part 5: Frontend - AutoApproved Setup Wizard Component

**File**: `daopad_frontend/src/components/security/AutoApprovedSetupWizard.tsx` (NEW)

**PSEUDOCODE**:
```typescript
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertTriangle, CheckCircle, ExternalLink, Loader2, Info } from 'lucide-react';
import { DAOPadBackendService } from '../../services/backend/DAOPadBackendService';
import { toast } from 'sonner';

interface Props {
    tokenId: Principal;
    stationId: Principal;
    onComplete: () => void;  // Callback to recheck status
}

const AutoApprovedSetupWizard: React.FC<Props> = ({ tokenId, stationId, onComplete }) => {
    const [step, setStep] = useState<'intro' | 'creating' | 'approving'>('intro');
    const [requestIds, setRequestIds] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleCreateRequests = async () => {
        setStep('creating');
        setError(null);

        try {
            const service = new DAOPadBackendService();
            const ids = await service.createAutoapproveAllAccounts(tokenId);

            setRequestIds(ids);
            setStep('approving');
            toast.success(`Created ${ids.length} policy change request(s)`);
        } catch (err) {
            console.error('Failed to create AutoApproved requests:', err);
            setError(err.message || 'Failed to create requests');
            setStep('intro');
            toast.error('Failed to create requests');
        }
    };

    const openOrbitStation = () => {
        window.open(`https://${stationId}.icp0.io`, '_blank');
    };

    if (step === 'intro') {
        return (
            <Card className="border-blue-200 bg-blue-50 mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-blue-600" />
                        AutoApproved Setup Required
                    </CardTitle>
                    <CardDescription>
                        Your treasury accounts need AutoApproved policies for DAOPad to work.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Educational content */}
                    <div className="bg-white rounded-lg p-4 space-y-2">
                        <h4 className="font-medium text-gray-900">What is AutoApproved?</h4>
                        <ul className="text-sm text-gray-700 space-y-1.5 list-disc list-inside">
                            <li><strong>Community votes first</strong> - 50%+ voting power required to execute</li>
                            <li><strong>Backend can't self-approve</strong> - Orbit's separation of duties prevents it</li>
                            <li><strong>AutoApproved executes after vote</strong> - No redundant approval needed</li>
                            <li><strong>Secure by design</strong> - Real governance is the community vote, not Orbit approval</li>
                        </ul>
                    </div>

                    {/* Security reassurance */}
                    <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800 text-sm">
                            <strong>Security verified:</strong> AutoApproved is documented as safe and required
                            for liquid democracy. See <code>docs/SECURITY_AUTOAPPROVED.md</code> for analysis.
                        </AlertDescription>
                    </Alert>

                    {/* Action buttons */}
                    <div className="flex gap-3">
                        <Button
                            onClick={handleCreateRequests}
                            className="flex-1"
                        >
                            Configure AutoApproved
                        </Button>
                        <Button
                            variant="outline"
                            onClick={openOrbitStation}
                            className="gap-2"
                        >
                            View Orbit
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Error display */}
                    {error && (
                        <Alert className="border-red-200 bg-red-50">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                                <strong>Error:</strong> {error}
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        );
    }

    if (step === 'creating') {
        return (
            <Card className="border-blue-200 bg-blue-50 mb-6">
                <CardContent className="py-8">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <p className="text-gray-700">Creating policy change requests...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (step === 'approving') {
        return (
            <Card className="border-orange-200 bg-orange-50 mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        Manual Approval Required
                    </CardTitle>
                    <CardDescription>
                        Created {requestIds.length} request(s). Now approve them in Orbit Station.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Explanation */}
                    <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-700">
                            Backend created the requests but <strong>can't approve them</strong> (Orbit's
                            separation of duties applies to policy changes too). Current policy holders
                            must approve via Orbit UI.
                        </p>
                    </div>

                    {/* Step-by-step guide */}
                    <ol className="space-y-3">
                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                                1
                            </span>
                            <div className="flex-1">
                                <p className="text-sm text-gray-700 mb-2">Open Orbit Station</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={openOrbitStation}
                                    className="gap-2"
                                >
                                    Open Orbit <ExternalLink className="h-3 w-3" />
                                </Button>
                            </div>
                        </li>

                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                                2
                            </span>
                            <p className="text-sm text-gray-700">
                                Navigate to <strong>Requests</strong> tab
                            </p>
                        </li>

                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                                3
                            </span>
                            <div className="flex-1">
                                <p className="text-sm text-gray-700">
                                    Approve each <strong>"Enable AutoApproved"</strong> request
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    ({requestIds.length} request{requestIds.length !== 1 && 's'} to approve)
                                </p>
                            </div>
                        </li>

                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                                4
                            </span>
                            <p className="text-sm text-gray-700">
                                Return here and recheck status
                            </p>
                        </li>
                    </ol>

                    {/* Action buttons */}
                    <div className="flex gap-3 pt-2">
                        <Button onClick={onComplete} className="flex-1">
                            I've Approved - Recheck Status
                        </Button>
                        <Button
                            variant="outline"
                            onClick={openOrbitStation}
                            className="gap-2"
                        >
                            Open Orbit <ExternalLink className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return null;
};

export default AutoApprovedSetupWizard;
```

### Part 6: Frontend - Integrate Wizard into Security Dashboard

**File**: `daopad_frontend/src/components/security/SecurityDashboard.tsx`

**Location**: After security score display (around line 295)

**PSEUDOCODE**:
```typescript
import AutoApprovedSetupWizard from './AutoApprovedSetupWizard';

const SecurityDashboard = ({ stationId, tokenSymbol, identity, tokenId }) => {
    // ... existing state and functions ...

    return (
        <div className="space-y-6">
            {/* Existing security score display */}
            {/* ... existing code ... */}

            {/* NEW: AutoApproved Setup Wizard */}
            {securityData && securityData.checks.some(check =>
                check.category === 'Treasury Setup' &&
                check.name === 'Account AutoApproved Status' &&
                check.status === 'Fail'
            ) && (
                <AutoApprovedSetupWizard
                    tokenId={tokenId}
                    stationId={stationId}
                    onComplete={fetchSecurityStatus}
                />
            )}

            {/* Existing admin removal and other sections */}
            {/* ... existing code ... */}
        </div>
    );
};
```

## Testing Plan

### Backend Testing
```bash
# 1. Build backend
cd /home/theseus/alexandria/daopad-autoapproved-complete/src/daopad
cargo build --target wasm32-unknown-unknown --release -p daopad_backend

# 2. Extract candid
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# 3. Verify new function in candid
grep "create_autoapprove_all_accounts" daopad_backend/daopad_backend.did
grep "check_account_autoapproved_status" daopad_backend/daopad_backend.did

# 4. Deploy backend
./deploy.sh --network ic --backend-only

# 5. Test account status check
dfx canister --network ic call daopad_backend check_account_autoapproved_status \
  '(principal "STATION_ID")'
# Should return: SecurityCheck showing which accounts need AutoApproved

# 6. Test create function
dfx canister --network ic call daopad_backend create_autoapprove_all_accounts \
  '(principal "TOKEN_ID")'
# Should return: Ok(vec { "request-id-1"; "request-id-2"; ... })
```

### Frontend Testing
```bash
# 1. Sync declarations (CRITICAL)
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# 2. Build frontend
cd daopad_frontend
npm run build

# 3. Deploy frontend
cd ..
./deploy.sh --network ic --frontend-only

# 4. Manual UI testing:
# - Navigate to Settings > Security
# - Wait for security check to complete
# - IF accounts NOT AutoApproved:
#   * See wizard with blue info card
#   * Click "Configure AutoApproved"
#   * See creating spinner
#   * See orange approval instructions card
#   * Open Orbit Station
#   * Approve requests
#   * Return and click "Recheck"
#   * Wizard should disappear
#   * Security score should improve
```

### Integration Testing
```bash
# End-to-end flow
1. Fresh Orbit Station with default policies (Quorum, not AutoApproved)
2. Open DAOPad Settings > Security
3. Security check shows: "X accounts NOT configured"
4. Wizard appears with blue card
5. Click "Configure AutoApproved" button
6. Backend creates EditAccount requests
7. Orange card shows approval instructions
8. User opens Orbit UI, finds requests
9. User approves each "Enable AutoApproved" request
10. User returns to DAOPad, clicks "Recheck"
11. Security check re-runs
12. All accounts now show AutoApproved
13. Wizard disappears
14. Security score increases
15. No critical issues remain
```

## Success Criteria

- [ ] PR #73 backend function merged into this branch
- [ ] Security check correctly identifies AutoApproved as GOOD
- [ ] New account status check detects unconfigured accounts
- [ ] Wizard appears when accounts need setup
- [ ] "Configure" button creates policy change requests
- [ ] Clear instructions guide Orbit UI approval
- [ ] Recheck updates security dashboard
- [ ] Wizard disappears when complete
- [ ] Security score improves after setup
- [ ] No TypeScript errors
- [ ] No Rust warnings
- [ ] Candid interface complete
- [ ] Declarations synced to frontend

## File Checklist

**Backend Changes**:
- [ ] `daopad_backend/src/types/orbit.rs` - Add EditAccountOperationInput, ChangeAssets (from PR #73)
- [ ] `daopad_backend/src/api/orbit_accounts.rs` - Add create_autoapprove_all_accounts() (from PR #73)
- [ ] `daopad_backend/src/api/orbit_security.rs` - Fix AutoApproved messaging (line 649-673)
- [ ] `daopad_backend/src/api/orbit_security.rs` - Add check_account_autoapproved_status()
- [ ] `daopad_backend/src/api/orbit_security.rs` - Integrate into perform_all_security_checks()
- [ ] `daopad_backend/daopad_backend.did` - Updated via candid-extractor

**Frontend Changes**:
- [ ] `daopad_frontend/src/components/security/AutoApprovedSetupWizard.tsx` - NEW FILE
- [ ] `daopad_frontend/src/components/security/SecurityDashboard.tsx` - Import and integrate wizard
- [ ] `daopad_frontend/src/services/backend/DAOPadBackendService.ts` - Add createAutoapproveAllAccounts()
- [ ] `daopad_frontend/src/declarations/daopad_backend/*` - Synced from backend

## Deployment Notes

### Candid Compatibility
Will show breaking change warning - type `yes` to proceed (per CLAUDE.md: "be liberal about edits")

### Post-Deployment Verification
```bash
# 1. Check backend function exists
dfx canister --network ic call daopad_backend --candid daopad_backend.did

# 2. Open frontend
open https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io

# 3. Navigate to Settings > Security
# 4. Verify wizard appears if needed
# 5. Test complete flow
```

## Related Work

- **PR #72**: Documentation only (can be closed as superseded)
- **PR #73**: Backend function only (merged into this PR)
- **This PR**: Complete feature with UI integration

## Notes

- This is the COMPLETE implementation users need
- Discoverable through Security tab (users naturally go there)
- Fits DAO transition narrative (moving to liquid democracy)
- No documentation hunting required
- Guided setup with clear next steps
