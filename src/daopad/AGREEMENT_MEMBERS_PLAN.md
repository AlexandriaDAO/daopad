# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-agreement-members/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-agreement-members/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes only (no backend changes needed):
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "feat: Add member governance section to LLC Operating Agreement

- Display all DAO members with their roles and permissions
- Show managing partners (admins) who can modify the agreement
- List operators, members, and inactive users
- Include principal IDs for on-chain verification
- Update Article II to reflect actual governance structure"
   git push -u origin feature/agreement-members-section
   gh pr create --title "Feature: Member Governance Section in Operating Agreement" --body "Implements AGREEMENT_MEMBERS_PLAN.md

## Changes
- Enhanced LLC Operating Agreement to display all DAO members
- Added Article II Section 2.2: Managing Partners (Admins)
- Added Article II Section 2.3: Operators
- Added Article II Section 2.4: General Members
- Shows member status (Active/Inactive) and on-chain principal IDs
- Provides legal clarity on who has authority to modify the agreement

## Legal Significance
Admins in the Orbit Station have full control to change smart contract rules, so the operating agreement must explicitly state this to be legally accurate. This update ensures the document reflects the actual on-chain governance structure."
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

**Branch:** `feature/agreement-members-section`
**Worktree:** `/home/theseus/alexandria/daopad-agreement-members/src/daopad`

---

# Implementation Plan: LLC Operating Agreement Member Governance Section

## Executive Summary

**Objective**: Enhance the LLC Operating Agreement (Agreement Tab) to display all DAO members with their roles and permissions, making it legally clear who has authority to modify the agreement.

**Why**: The current agreement mentions "admin control" and "operator users" but doesn't list individual members. Since admins have full authority to change the smart contracts (and thus the operating agreement), the document must explicitly state who these managing partners are for legal accuracy.

**Scope**: Frontend-only changes to display member information already available via existing backend APIs.

---

## Current State Analysis

### Verified via Research & DFX Testing

#### File Structure
```
daopad_frontend/src/
├── components/
│   ├── operating-agreement/
│   │   ├── AgreementDocument.jsx        # Main agreement document (MODIFY)
│   │   └── OperatingAgreementTab.jsx    # Tab wrapper (no changes)
│   ├── TokenDashboard.jsx               # Already queries members (reference)
│   └── security/
│       └── SecurityDashboard.jsx        # Shows security checks (reference)
├── services/
│   ├── backend/
│   │   └── OrbitAgreementService.js     # Fetches agreement data (no changes)
│   └── orbitStation.js                  # Has getAllMembersWithRoles() (reference)
```

#### Existing Backend APIs (No Changes Needed)
1. **`list_orbit_users(token_canister_id: Principal)`**
   - Backend: `daopad_backend/src/api/orbit_users.rs:19-47`
   - Already called by `OrbitAgreementService.getAgreementData()` (line 34)
   - Returns: `Vec<UserDTO>` with `id`, `name`, `groups`, `identities`, `status`

2. **Data Flow (Confirmed Working)**:
   ```
   OperatingAgreementTab.jsx:26
     ↓ calls
   OrbitAgreementService.getAgreementData() (line 34)
     ↓ calls backend
   daopad_backend.list_orbit_users()
     ↓ calls Orbit
   orbit_station.list_users()
     ↓ returns
   data.users = [{ id, name, status, groups[], identities[] }]
   ```

#### DFX Verification (Test Station: fec7w-zyaaa-aaaaa-qaffq-cai)
```bash
# Confirmed working - returns 8 users with full data
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_users '(...)'
```

**Sample Data Structure**:
```javascript
{
  id: "93f658a5-1c93-4266-b2a0-ff3b02e9d3a9",
  name: "Alexandria",
  status: { Active: null },
  groups: [
    { id: "00000000-0000-4000-8000-000000000001", name: "Operator" },
    { id: "00000000-0000-4000-8000-000000000000", name: "Admin" }
  ],
  identities: [principal "hyz4y-os6bb-hhjab-qexwc-yioil-gvprf-py7g5-yr4oa-44fb3-wuijv-sqe"]
}
```

#### Current Agreement Document Display (AgreementDocument.jsx)

**Article II: Members and Voting Power (Lines 90-117)**
- Shows: "Admin Control: {count}", "Operator Users: {names}", "Total Users: {count}"
- MISSING: Individual member listings with roles and permissions
- MISSING: Explicit statement about admin authority to modify agreement

**Helper Functions (Lines 10-27)**:
- `getAdmins()`: Extracts admin count from security checks (vague)
- `getOperators()`: Filters users by operator group (only names, no details)

---

## Legal & Governance Context

### Why This Matters

**From Wyoming DAO LLC Law**:
- Operating agreements must accurately reflect governance structure
- If the smart contracts allow admins to unilaterally change rules, the agreement MUST state this
- "Code is law" requires the legal document to describe what the code actually does

**Current Problem**:
- Agreement says admins exist but doesn't list them individually
- Doesn't explicitly state that admins can modify the agreement
- Someone reading the document can't verify on-chain who has this authority

**Solution**:
- List all managing partners (admins) with their principal IDs
- State explicitly: "Managing partners have full authority to modify this agreement through smart contract governance"
- Show operators, general members, and inactive users for complete governance transparency

---

## Implementation Plan (PSEUDOCODE)

### Step 1: Enhance Member Categorization Helpers

**File**: `daopad_frontend/src/components/operating-agreement/AgreementDocument.jsx`

**NEW FUNCTIONS** (Add after line 27):

```javascript
// PSEUDOCODE

// Group constants (from Orbit Station spec)
const ADMIN_GROUP_ID = "00000000-0000-4000-8000-000000000000";
const OPERATOR_GROUP_ID = "00000000-0000-4000-8000-000000000001";

// Helper: Categorize users by their highest role
const categorizeMembers = (users) => {
  if (!users || users.length === 0) return {
    admins: [],
    operators: [],
    members: [],
    inactive: []
  };

  const categories = {
    admins: [],
    operators: [],
    members: [],
    inactive: []
  };

  users.forEach(user => {
    // Check status first
    const isActive = user.status?.Active !== undefined;

    if (!isActive) {
      categories.inactive.push(user);
      return;
    }

    // Categorize by groups (highest role wins)
    const groupIds = user.groups?.map(g => g.id) || [];

    if (groupIds.includes(ADMIN_GROUP_ID)) {
      categories.admins.push(user);
    } else if (groupIds.includes(OPERATOR_GROUP_ID)) {
      categories.operators.push(user);
    } else {
      categories.members.push(user); // Active but no special groups
    }
  });

  return categories;
};

// Helper: Format principal for display (truncate middle)
const formatPrincipal = (principal) => {
  if (!principal) return 'Unknown';
  const str = principal.toString();
  if (str.length <= 20) return str;
  return `${str.slice(0, 10)}...${str.slice(-7)}`;
};

// Helper: Get role display names from groups
const getRoleDisplay = (groups) => {
  if (!groups || groups.length === 0) return 'Member';

  const roles = groups.map(g => g.name).join(', ');
  return roles;
};
```

### Step 2: Replace Article II Content

**Current**: Lines 90-117 (summary stats only)

**NEW**: Detailed member sections

```jsx
// PSEUDOCODE

<section className="mb-8">
  <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
    ARTICLE II: MEMBERS AND GOVERNANCE STRUCTURE
  </h2>

  <div className="mt-4 space-y-3">
    <p>
      <strong>2.1 Membership Basis.</strong> Membership and voting power is determined by
      holding Kong Locker voting power for the {tokenSymbol} token.
      Voting power equals the USD value of permanently locked LP tokens
      multiplied by 100.
    </p>

    {(() => {
      const categories = categorizeMembers(data.users);

      return (
        <>
          {/* 2.2 Managing Partners (Admins) */}
          <div className="mt-6">
            <p>
              <strong>2.2 Managing Partners (Administrators).</strong> The following
              individuals have full administrative authority over the Company's smart
              contracts and may unilaterally modify this Operating Agreement through
              on-chain governance actions:
            </p>

            {categories.admins.length > 0 ? (
              <div className="pl-4 mt-3 space-y-2">
                {categories.admins.map((admin, i) => (
                  <div key={admin.id} className="py-2 border-l-2 border-blue-400 pl-3">
                    <div className="font-semibold">{admin.name}</div>
                    <div className="text-sm text-gray-600">
                      Role: {getRoleDisplay(admin.groups)}
                    </div>
                    <div className="text-xs font-mono text-gray-500">
                      Principal: {formatPrincipal(admin.identities?.[0])}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pl-4 mt-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                ⚠️ No administrators found. This may indicate an error in governance setup.
              </div>
            )}

            <p className="mt-3 text-sm italic text-gray-600">
              Note: Managing partners can create, approve, and execute all types of
              requests including system upgrades, treasury transfers, and permission changes.
              All smart contract modifications by managing partners are recorded on the
              Internet Computer blockchain for permanent verification.
            </p>
          </div>

          {/* 2.3 Operators */}
          {categories.operators.length > 0 && (
            <div className="mt-6">
              <p>
                <strong>2.3 Operators.</strong> The following members have operational
                permissions to propose and manage day-to-day treasury activities, subject
                to approval thresholds defined in Article III:
              </p>
              <div className="pl-4 mt-3 space-y-2">
                {categories.operators.map((op, i) => (
                  <div key={op.id} className="py-2 border-l-2 border-green-400 pl-3">
                    <div className="font-semibold">{op.name}</div>
                    <div className="text-sm text-gray-600">
                      Role: {getRoleDisplay(op.groups)}
                    </div>
                    <div className="text-xs font-mono text-gray-500">
                      Principal: {formatPrincipal(op.identities?.[0])}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2.4 General Members */}
          {categories.members.length > 0 && (
            <div className="mt-6">
              <p>
                <strong>2.4 General Members.</strong> The following individuals are
                registered members with voting rights proportional to their Kong Locker
                voting power:
              </p>
              <div className="pl-4 mt-3 space-y-2">
                {categories.members.map((member, i) => (
                  <div key={member.id} className="py-2 border-l-2 border-gray-400 pl-3">
                    <div className="font-semibold">{member.name}</div>
                    <div className="text-sm text-gray-600">
                      Role: Member
                    </div>
                    <div className="text-xs font-mono text-gray-500">
                      Principal: {formatPrincipal(member.identities?.[0])}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2.5 Inactive Members */}
          {categories.inactive.length > 0 && (
            <div className="mt-6">
              <p>
                <strong>2.5 Inactive Members.</strong> The following members are currently
                inactive and do not have operational or voting permissions:
              </p>
              <div className="pl-4 mt-3 space-y-2">
                {categories.inactive.map((inactive, i) => (
                  <div key={inactive.id} className="py-2 border-l-2 border-red-400 pl-3 opacity-60">
                    <div className="font-semibold">{inactive.name}</div>
                    <div className="text-sm text-gray-600">
                      Status: Inactive
                    </div>
                    <div className="text-xs font-mono text-gray-500">
                      Principal: {formatPrincipal(inactive.identities?.[0])}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2.6 Total Membership Stats */}
          <div className="mt-6 p-4 bg-gray-50 rounded">
            <p>
              <strong>2.6 Current Membership Summary:</strong>
            </p>
            <ul className="list-disc pl-8 mt-2 space-y-1">
              <li>Managing Partners (Admins): {categories.admins.length}</li>
              <li>Operators: {categories.operators.length}</li>
              <li>General Members: {categories.members.length}</li>
              <li>Inactive Members: {categories.inactive.length}</li>
              <li><strong>Total Registered: {data.users?.length || 0}</strong></li>
            </ul>
          </div>

          {/* 2.7 Voting Rights */}
          <div className="mt-6">
            <p>
              <strong>2.7 Voting Rights.</strong> Each member's voting weight
              is proportional to their Kong Locker voting power. Proposals are
              executed when the required threshold defined in Article III is reached.
              Members must have active status and voting power greater than zero to
              participate in governance votes.
            </p>
          </div>
        </>
      );
    })()}
  </div>
</section>
```

### Step 3: Update Article VII (Amendments)

**Modify**: Lines 240-263 to reflect admin authority

```jsx
// PSEUDOCODE

<section className="mb-8">
  <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
    ARTICLE VII: AMENDMENTS AND DISPUTE RESOLUTION
  </h2>
  <div className="mt-4 space-y-3">
    <p>
      <strong>7.1 Amendment Authority.</strong> This Agreement may be amended in two ways:
    </p>
    <ul className="list-disc pl-8 space-y-2">
      <li>
        <strong>Smart Contract Governance:</strong> Managing Partners (listed in Article II,
        Section 2.2) have full authority to modify smart contract rules, which constitutes
        an amendment to this Operating Agreement. All such changes are recorded on the
        blockchain and automatically reflected in this document.
      </li>
      <li>
        <strong>Community Proposals:</strong> Non-administrative changes may be proposed
        through the DAOPad governance system, requiring {
          OPERATION_THRESHOLDS.find(o => o.name === 'Edit Request Policy')?.threshold || 70
        }% member approval based on voting power.
      </li>
    </ul>

    <p className="mt-4">
      <strong>7.2 Smart Contract Supremacy.</strong> In case of any
      conflict between this document and the on-chain state, the
      blockchain state at Station {stationId} prevails. This document is
      generated from on-chain data and serves as a human-readable representation
      of the smart contract rules.
    </p>

    <p>
      <strong>7.3 Dispute Resolution.</strong> All disputes shall be
      resolved through member voting or, if necessary, binding arbitration
      under Wyoming law.
    </p>
  </div>
</section>
```

---

## Testing Requirements

### Pre-Deployment Checks

1. **Frontend Build**:
   ```bash
   npm run build
   # Should complete without errors
   ```

2. **Visual Verification** (Browser):
   - Navigate to Agreement tab
   - Verify all members display with correct categorization
   - Check that admin warning appears if governance is centralized
   - Confirm principal IDs are properly truncated and readable

3. **Data Validation**:
   ```javascript
   // In browser console
   console.log('Agreement data:', agreementData);
   console.log('Categorized members:', categorizeMembers(agreementData.users));

   // Expected output:
   // {
   //   admins: [{ name: "DAO Canister", ... }],
   //   operators: [{ name: "Operator 1", ... }, ...],
   //   members: [],
   //   inactive: [{ name: "Inactive User", ... }]
   // }
   ```

### Post-Deployment Validation

1. **Mainnet Deploy**:
   ```bash
   ./deploy.sh --network ic --frontend-only
   ```

2. **Live Testing** (https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io):
   - Load ALEX token dashboard
   - Navigate to Agreement tab
   - Verify member data loads from backend
   - Check that all sections render correctly
   - Export agreement as Markdown and verify member sections are included

3. **Cross-Browser Check**:
   - Chrome: Member list rendering
   - Firefox: Principal ID formatting
   - Safari: Overall layout

---

## Edge Cases & Error Handling

### Scenario 1: No Members Returned
```javascript
// PSEUDOCODE
if (!data.users || data.users.length === 0) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
      <p className="text-yellow-800">
        ⚠️ No members found. This may indicate:
      </p>
      <ul className="list-disc pl-6 mt-2 text-sm">
        <li>Backend is not authorized to query Orbit Station</li>
        <li>Orbit Station ID is incorrect</li>
        <li>Network connectivity issues</li>
      </ul>
    </div>
  );
}
```

### Scenario 2: No Admins (Invalid Governance)
```javascript
// PSEUDOCODE
if (categories.admins.length === 0) {
  return (
    <div className="bg-red-50 border-2 border-red-300 p-4 rounded">
      <h3 className="text-red-800 font-bold">🚨 CRITICAL GOVERNANCE ERROR</h3>
      <p className="text-red-700">
        No administrators found in this DAO. This violates proper governance structure.
        The backend canister (lwsav-iiaaa-aaaap-qp2qq-cai) should be the sole admin.
      </p>
    </div>
  );
}
```

### Scenario 3: Multiple Admins (Pseudo-DAO Warning)
```javascript
// PSEUDOCODE
if (categories.admins.length > 1) {
  const DAOPAD_BACKEND = 'lwsav-iiaaa-aaaap-qp2qq-cai';
  const nonBackendAdmins = categories.admins.filter(
    a => !a.identities?.some(id => id.toString() === DAOPAD_BACKEND)
  );

  if (nonBackendAdmins.length > 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-300 p-4 rounded mt-4">
        <h3 className="text-yellow-800 font-bold">⚠️ PSEUDO-DAO DETECTED</h3>
        <p className="text-yellow-700">
          This DAO has {nonBackendAdmins.length} human administrator(s) in addition to
          the backend canister. True decentralization requires removing human admins
          so that ALL governance decisions go through community voting.
        </p>
        <p className="text-sm mt-2">
          See the Security tab for admin removal actions.
        </p>
      </div>
    );
  }
}
```

### Scenario 4: Missing Principal IDs
```javascript
// PSEUDOCODE
const formatPrincipal = (principal) => {
  if (!principal) return (
    <span className="text-gray-400 italic">Principal not available</span>
  );
  // ... rest of formatting logic
};
```

---

## Success Criteria

### Feature Complete When:
- [ ] Agreement displays all members grouped by role (Admin, Operator, Member, Inactive)
- [ ] Each member shows: name, role(s), principal ID, status
- [ ] Article II explicitly states admins can modify the agreement
- [ ] Article VII explains two amendment pathways (admin vs community)
- [ ] Warning displays if governance is centralized (multiple admins)
- [ ] Frontend builds without errors
- [ ] Deploys successfully to mainnet
- [ ] No backend changes required (uses existing APIs)

### Legal Requirements Met:
- [ ] Document accurately reflects who has smart contract control
- [ ] Principal IDs enable on-chain verification of authority
- [ ] Admins are explicitly identified as managing partners
- [ ] Operating agreement can be used for Wyoming DAO LLC compliance

---

## Rollback Plan

**If Issues Arise**:
1. This is frontend-only - no backend or state changes
2. Rollback: Revert `AgreementDocument.jsx` to previous version
3. Redeploy: `./deploy.sh --network ic --frontend-only`
4. No data loss or governance disruption possible

**Safe to Deploy**: Yes - purely presentational changes to existing data

---

## Plan Checklist

- [x] Worktree created first
- [x] Orchestrator header EMBEDDED at top of plan
- [x] Current state documented with file paths and line numbers
- [x] Implementation in detailed pseudocode
- [x] Testing strategy defined (build, visual, deployment)
- [x] Edge cases and error handling specified
- [x] Success criteria enumerated
- [ ] Plan committed to feature branch
- [ ] Handoff command provided with PR creation

---

## Implementation Notes for Autonomous Agent

1. **NO Backend Changes**: All required data is already available via `data.users` from `OrbitAgreementService`

2. **Group ID Constants**: Use exact UUIDs from Orbit Station spec:
   - Admin: `00000000-0000-4000-8000-000000000000`
   - Operator: `00000000-0000-4000-8000-000000000001`

3. **Status Check**: User status is a variant: `{ Active: null }` or `{ Inactive: null }`

4. **Identity Display**: `identities` is an array, use `identities?.[0]` for primary principal

5. **Null Safety**: Always check for null/undefined before accessing nested properties

6. **Legal Language**: Use formal tone for operating agreement sections (see pseudocode)

7. **Visual Hierarchy**:
   - Admins: Blue left border
   - Operators: Green left border
   - Members: Gray left border
   - Inactive: Red left border, reduced opacity

8. **Deploy Command**: Frontend only, no backend deployment needed
   ```bash
   ./deploy.sh --network ic --frontend-only
   ```

---

## Final Handoff

This plan is complete and ready for autonomous implementation. The implementing agent should:

1. ✅ Verify worktree isolation
2. ✅ Implement the three pseudocode sections in `AgreementDocument.jsx`
3. ✅ Build and deploy frontend
4. ✅ Create PR immediately (don't ask, just do it)
5. ✅ Monitor for feedback and iterate

**No guesswork needed** - all types verified with dfx, all APIs confirmed working, all pseudocode provided.
