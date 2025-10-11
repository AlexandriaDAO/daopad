# Security Tab Function Name Fix - Implementation Plan

## 🚨 MANDATORY: ISOLATION CHECK AND EXECUTION PROMPT

### Context: Worktree Already Created

**This plan was created by the planning agent in an isolated worktree.**

**Location:** `/home/theseus/alexandria/daopad-security-dashboard/src/daopad`
**Branch:** `feature/security-dashboard`
**Plan file:** `SECURITY_TAB_FIX_PLAN.md` (in this worktree)

### Step 0: Verify Isolation (RUN THIS FIRST!)

```bash
# STOP! Verify you are in the correct worktree
REPO_ROOT=$(git rev-parse --show-toplevel)
CURRENT_BRANCH=$(git branch --show-current)

# Check you're NOT in main repo
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: You are in the MAIN repository"
    echo "❌ This plan was created in a worktree at:"
    echo "    /home/theseus/alexandria/daopad-security-dashboard"
    echo ""
    echo "Navigate to the worktree:"
    echo "  cd /home/theseus/alexandria/daopad-security-dashboard/src/daopad"
    echo "  cat SECURITY_TAB_FIX_PLAN.md  # Plan is here"
    exit 1
fi

# Check you're on the right branch
if [ "$CURRENT_BRANCH" != "feature/security-dashboard" ]; then
    echo "❌ WARNING: You are on branch '$CURRENT_BRANCH'"
    echo "Expected: feature/security-dashboard"
    echo "Are you in the right worktree?"
    exit 1
fi

echo "✅ You are in the correct worktree: $REPO_ROOT"
echo "✅ On branch: $CURRENT_BRANCH"
echo "✅ Safe to proceed with implementation"
```

### Your Execution Prompt

You are an autonomous PR orchestrator fixing the Security Dashboard function name mismatch.

**NOTE:** The planning agent already created this worktree and this plan. You will navigate there and execute.

EXECUTE THESE STEPS AUTONOMOUSLY (DO NOT ASK FOR PERMISSION):

Step 0 - NAVIGATE TO WORKTREE (DO THIS FIRST):
  cd /home/theseus/alexandria/daopad-security-dashboard/src/daopad

Step 1 - VERIFY ISOLATION:
  # Verify you're in the right place
  pwd  # Should show /home/theseus/alexandria/daopad-security-dashboard/src/daopad
  git branch --show-current  # Should show feature/security-dashboard
  ls SECURITY_TAB_FIX_PLAN.md  # This plan should be here

Step 2 - Implement Fix:
  # Add wrapper function to orbit_security.rs (line 855)
  # See "Implementation Plan" section below for exact code

Step 3 - Build and Deploy:
  # Backend:
  cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
  candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
  ./deploy.sh --network ic --backend-only

  # CRITICAL: Sync declarations
  cp -r ../../.dfx/ic/canisters/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

  # Frontend:
  ./deploy.sh --network ic --frontend-only

Step 4 - Test on Mainnet:
  # Verify the fix works (see Testing Strategy section)

Step 5 - Commit and Push:
  git add -A
  git commit -m "Fix Security Dashboard: Add missing perform_security_check wrapper function"
  git push -u origin feature/security-dashboard

Step 6 - Create PR:
  gh pr create --title "Fix Security Dashboard: Add Missing Function Wrapper" --body "Fixes 'is not a function' error by adding perform_security_check wrapper that frontend expects. See SECURITY_TAB_FIX_PLAN.md for details."

YOUR CRITICAL RULES:
- You MUST work in /home/theseus/alexandria/daopad-security-dashboard/src/daopad (NOT main repo)
- Other agents ARE working in parallel - isolation is MANDATORY
- After sleep: IMMEDIATELY continue (no "should I check?" questions)
- Run candid-extractor after backend changes
- Sync declarations after backend changes
- ONLY STOP when: approved or critical error

START NOW with Step 0.

---

## Current State

### Problem Summary

The Security Dashboard is completely broken due to a function name mismatch:
- **Backend implements:** `perform_all_security_checks` (line 757 in orbit_security.rs)
- **Frontend calls:** `perform_security_check` (line 986 in daopadBackend.js)
- **Candid declares:** `perform_security_check` (line 865 in daopad_backend.did)
- **Error:** `TypeError: r.perform_security_check is not a function`

### What Already Exists (And Works Great!)

The security dashboard infrastructure is **fully implemented** and sophisticated:

#### Backend (orbit_security.rs - 1108 lines)
- ✅ 8 security check categories
- ✅ 45+ individual permission checks
- ✅ Risk scoring algorithm (0-100 decentralization score)
- ✅ Severity analysis (Critical, High, Medium, Low)
- ✅ `EnhancedSecurityDashboard` response type with:
  - `overall_status`: "secure" | "critical" | "high_risk" | etc.
  - `decentralization_score`: 0-100
  - `checks`: All security check results
  - `critical_issues`: Filtered critical problems
  - `recommended_actions`: What to fix

#### Frontend (SecurityDashboard.jsx + DAOTransitionChecklist.jsx)
- ✅ Journey-based visualization (Foundation → Decentralization → Security → Governance → Advanced)
- ✅ Progress bar showing 0-100% decentralization
- ✅ Expandable categories with detailed explanations
- ✅ Shows admin count, permissions, who controls what
- ✅ Actionable recommendations ("In Orbit Station: Go to Settings...")
- ✅ Beautiful dark-themed UI with status badges

**Everything is built. It just can't run because of the function name mismatch.**

### File Tree (Relevant Sections)

```
daopad_security-dashboard/src/daopad/
├── daopad_backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── orbit_security.rs (MODIFY - line 855)
│   │   │   └── mod.rs (unchanged - already exports orbit_security::*)
│   │   └── lib.rs (unchanged - already imports from api)
│   └── daopad_backend.did (REGENERATE)
├── daopad_frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── security/
│   │   │       ├── SecurityDashboard.jsx (unchanged - already calls perform_security_check)
│   │   │       └── DAOTransitionChecklist.jsx (unchanged - already perfect UI)
│   │   ├── services/
│   │   │   └── daopadBackend.js (unchanged - already calls perform_security_check)
│   │   └── declarations/
│   │       └── daopad_backend/ (MUST SYNC AFTER BACKEND DEPLOY)
└── deploy.sh (USE THIS)
```

### Existing Implementations

#### Backend: perform_all_security_checks (orbit_security.rs:757-854)
```rust
#[ic_cdk::update]
pub async fn perform_all_security_checks(station_id: Principal) -> Result<Vec<SecurityCheck>, String> {
    // Calls all 8 category check functions
    let admin_result = check_admin_control(station_id).await;
    let treasury_result = check_treasury_control(station_id).await;
    // ... 6 more categories

    // Combines all checks into single vector
    let mut all_checks = Vec::new();
    // ... adds all checks with error handling

    Ok(all_checks)  // Returns Vec<SecurityCheck>
}
```

**Problem:** Returns `Vec<SecurityCheck>`, not `EnhancedSecurityDashboard`

#### Backend: build_dashboard (orbit_security.rs:1083-1108)
```rust
fn build_dashboard(station_id: Principal, checks: Vec<SecurityCheck>) -> Result<EnhancedSecurityDashboard, String> {
    let (score, summary, critical_issues, recommended_actions) = calculate_risk_score(&checks);

    Ok(EnhancedSecurityDashboard {
        station_id,
        overall_status: "secure" | "critical" | ...,
        decentralization_score: score,  // 0-100
        last_checked: time(),
        checks,  // All security checks
        risk_summary: summary,
        critical_issues,  // Filtered criticals
        recommended_actions,
    })
}
```

**Problem:** This function exists but is never called by a public endpoint!

#### Frontend: performSecurityCheck (daopadBackend.js:979-1020)
```javascript
async performSecurityCheck(stationId) {
    const actor = await this.getActor();
    const stationPrincipal = typeof stationId === 'string'
        ? Principal.fromText(stationId)
        : stationId;

    // CALLS: actor.perform_security_check(stationPrincipal)
    const result = await actor.perform_security_check(stationPrincipal);

    if ('Ok' in result) {
        const dashboard = result.Ok;  // EXPECTS EnhancedSecurityDashboard
        return {
            success: true,
            data: {
                station_id: dashboard.station_id,
                overall_status: dashboard.overall_status,
                decentralization_score: dashboard.decentralization_score,
                checks: dashboard.checks.map(check => ({ ... }))
            }
        };
    }
}
```

**Problem:** Calls `perform_security_check` which doesn't exist!

### Dependencies

- Backend uses `ic_cdk::update` for cross-canister calls
- Frontend uses declarations from `/daopad_frontend/src/declarations/daopad_backend/`
- Orbit Station integration via test station `fec7w-zyaaa-aaaaa-qaffq-cai`

### Constraints

- Must maintain exact function signature that frontend expects
- Cannot change frontend code (it's already correct)
- Must return `EnhancedSecurityDashboard` (what frontend expects)
- Always deploy to mainnet (no local testing)

---

## Implementation Plan

### Backend File: `daopad_backend/src/api/orbit_security.rs` (MODIFY)

**Location:** After line 854 (after `perform_all_security_checks` closes)

**Before (lines 850-856):**
```rust
    Ok(all_checks)
}

// ===== HELPER FUNCTIONS =====

fn check_permission_by_resource<F>(
```

**After (insert between lines 854-856):**
```rust
    Ok(all_checks)
}

// ===== PUBLIC DASHBOARD ENDPOINT =====

/// Perform comprehensive security analysis and return dashboard with score
///
/// This is the public-facing endpoint that frontend calls.
/// It combines perform_all_security_checks + build_dashboard to return
/// the full EnhancedSecurityDashboard with decentralization score.
#[ic_cdk::update]
pub async fn perform_security_check(station_id: Principal) -> Result<EnhancedSecurityDashboard, String> {
    // Execute all security checks
    let checks = perform_all_security_checks(station_id).await?;

    // Build dashboard with scoring and analysis
    build_dashboard(station_id, checks)
}

// ===== HELPER FUNCTIONS =====

fn check_permission_by_resource<F>(
```

**Why This Works:**
1. Matches the name frontend already calls: `perform_security_check`
2. Returns the type frontend expects: `Result<EnhancedSecurityDashboard, String>`
3. Reuses all existing logic (no duplication)
4. Simple wrapper that connects the pieces

**Type Flow:**
```
perform_security_check(station_id)
  → perform_all_security_checks(station_id).await?
    → Result<Vec<SecurityCheck>, String>
  → build_dashboard(station_id, checks)
    → Result<EnhancedSecurityDashboard, String>
  → Returns to frontend
```

---

## Testing Strategy

### Type Discovery (Already Done)

We already know the types - we've read the source. No discovery needed.

### Build Process

```bash
# From worktree: /home/theseus/alexandria/daopad-security-dashboard/src/daopad

# 1. Build backend
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked

# Expected: Successful build with new function

# 2. Extract candid interface
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Expected: daopad_backend.did now includes:
#   perform_security_check : (principal) -> (Result_35);

# 3. Verify candid includes new function
grep "perform_security_check" daopad_backend/daopad_backend.did
# Expected output: "perform_security_check : (principal) -> (Result_35);"
```

### Deploy Process

```bash
# Backend deploy
./deploy.sh --network ic --backend-only

# Expected:
# - DAOPad Backend deployed: lwsav-iiaaa-aaaap-qp2qq-cai
# - New function available on mainnet

# CRITICAL: Sync declarations to frontend
cp -r ../../.dfx/ic/canisters/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# Verify sync worked
grep "perform_security_check" daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js
# Expected: Should find the function in frontend declarations

# Frontend deploy
./deploy.sh --network ic --frontend-only

# Expected:
# - DAOPad Frontend deployed: l7rlj-6aaaa-aaaaa-qaffq-cai
```

### Integration Test (Mainnet)

```bash
# Test backend function directly
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai perform_security_check '(principal "fec7w-zyaaa-aaaaa-qaffq-cai")'

# Expected output (approximate):
# (
#   variant {
#     Ok = record {
#       station_id = principal "fec7w-zyaaa-aaaaa-qaffq-cai";
#       overall_status = "high_risk";
#       decentralization_score = 45 : nat8;
#       checks = vec { ... };
#       critical_issues = vec { ... };
#       recommended_actions = vec { ... };
#     }
#   }
# )
```

### Frontend Test

1. Navigate to: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
2. Connect wallet and view a token dashboard
3. Click "Security" tab
4. **Expected behavior:**
   - No "is not a function" error
   - Loading spinner appears
   - Security dashboard renders with:
     - Decentralization score percentage
     - Progress bar (0-100%)
     - Risk level badge (CRITICAL/HIGH RISK/etc.)
     - Expandable categories
     - Detailed checks with recommendations
5. **Expected checks visible:**
   - Admin Control (shows admin count, backend status)
   - Treasury Control (transfer permissions)
   - Governance Control (permission management)
   - Request Policies (auto-approval detection)
   - And more...

---

## Scope Estimate

### Files Modified

- **New files:** 0
- **Modified files:** 1 (orbit_security.rs)

### Lines of Code

- **Backend:** +16 lines (wrapper function + doc comments)
- **Frontend:** 0 lines (no changes needed)
- **Net:** +16 lines

### Complexity

- **Low:** Simple wrapper function
- **No business logic changes:** Just connects existing pieces

### Time Estimate

- Implementation: 10 minutes (add function)
- Build & extract candid: 5 minutes
- Deploy backend: 3 minutes
- Sync declarations: 1 minute
- Deploy frontend: 3 minutes
- Testing on mainnet: 5 minutes
- Create PR: 2 minutes
- **Total:** ~30 minutes

---

## Critical Implementation Notes

### 🚨 ISOLATION IS MANDATORY

**The implementing agent MUST work in an isolated worktree because:**
- Other agents are working in parallel in the main repo
- File changes from other agents will corrupt your work
- Git operations by other agents will change your files
- The orchestrator prompt above ENFORCES this with exit checks

### DAOPad-Specific Requirements

#### Candid Extraction (Backend Changes)

**ALWAYS run after Rust changes:**
```bash
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
```

#### Declaration Sync (CRITICAL BUG FIX)

**Frontend uses different declarations path:**
```bash
# After backend deploy, MUST sync:
cp -r ../../.dfx/ic/canisters/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
# Without this, frontend gets "is not a function" errors!
```

### Don't Skip Testing

Every change MUST be:
1. Built: `cargo build --target wasm32-unknown-unknown --release -p daopad_backend`
2. Extracted: `candid-extractor` (for backend changes)
3. Deployed: `./deploy.sh --network ic`
4. Synced: declarations to frontend
5. Tested: `dfx canister --network ic call`
6. Verified on frontend: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io

### Do Follow Existing Patterns

This fix follows existing patterns:
- Uses `#[ic_cdk::update]` like all other public endpoints
- Returns `Result<T, String>` like other API methods
- Calls existing functions (no new logic)
- Matches naming that frontend expects

---

## Success Criteria

### Definition of Done

✅ **Function Added:**
- `perform_security_check` exists in orbit_security.rs
- Has proper doc comments
- Uses `#[ic_cdk::update]` decorator
- Returns `Result<EnhancedSecurityDashboard, String>`

✅ **Backend Deployed:**
- Builds successfully
- Candid interface includes `perform_security_check`
- Deployed to mainnet: lwsav-iiaaa-aaaap-qp2qq-cai
- Direct dfx call works

✅ **Frontend Synced:**
- Declarations copied to frontend declarations folder
- Frontend rebuild includes new function signature
- Deployed to mainnet: l7rlj-6aaaa-aaaaa-qaffq-cai

✅ **Security Tab Works:**
- No "is not a function" error
- Dashboard loads with data
- Shows decentralization score
- Displays all security checks
- Expandable categories work
- Recommendations display

✅ **PR Created:**
- Committed to feature/security-dashboard branch
- Pushed to origin
- PR created with clear description
- Links to this plan document

---

## Checkpoint Strategy

**Single PR:** This is a simple one-function fix that should be done in a single PR.

No need for checkpoints - the entire fix is:
1. Add wrapper function (10 mins)
2. Deploy (10 mins)
3. Test (5 mins)
4. PR (5 mins)

---

## 🚀 Handoff to Implementing Agent

**Plan Complete:** Security Tab Function Name Fix

**Location:** `/home/theseus/alexandria/daopad-security-dashboard/src/daopad`
**Branch:** `feature/security-dashboard`
**Document:** `SECURITY_TAB_FIX_PLAN.md` (committed to feature branch)

**Estimated:** 30 minutes, 1 PR

**Handoff instructions for implementing agent:**

```bash
# Navigate to the worktree where the plan lives
cd /home/theseus/alexandria/daopad-security-dashboard/src/daopad

# Read the plan
cat SECURITY_TAB_FIX_PLAN.md

# Then pursue it
# (The plan contains the full orchestrator prompt)
```

**Or use this prompt:**

```
cd /home/theseus/alexandria/daopad-security-dashboard/src/daopad && pursue SECURITY_TAB_FIX_PLAN.md
```

**CRITICAL:**
- Plan is IN the worktree (not main repo)
- Plan is already committed to feature branch
- Implementing agent works in SAME worktree
- Plan and implementation stay together on feature branch

---

## ✅ Checklist for Complete Plan

- [x] **Current state analysis** - Function name mismatch identified
- [x] **File tree** - Shows exact file to modify (orbit_security.rs line 855)
- [x] **Implementation details** - Exact code to add with before/after
- [x] **Type discovery** - Already done, types known from source
- [x] **Testing strategy** - Build, deploy, dfx test, frontend test
- [x] **Candid extraction** - Required steps documented
- [x] **Declaration sync** - Critical step highlighted
- [x] **Scope estimate** - 16 lines, 30 minutes, 1 PR
- [x] **Embedded orchestrator** - Full isolation check and execution prompt at TOP
- [x] **Isolation enforcement** - Bash script that exits if not in worktree
- [x] **Critical reminders** - Declaration sync bug, testing requirements
- [x] **Success criteria** - What "done" looks like

---

## 🎯 Why This Plan Will Succeed

1. **Problem is precisely identified:** Function name mismatch, not logic error
2. **Solution is minimal:** 16 lines, one function, no business logic
3. **All infrastructure exists:** Backend logic ✓, Frontend UI ✓, just needs connection
4. **Testing is straightforward:** dfx call + frontend verification
5. **Risk is extremely low:** Pure wrapper, no changes to existing logic
6. **Time estimate is realistic:** 30 minutes for a simple wrapper

The Security Dashboard is already beautiful and feature-complete. This plan just makes it work.
