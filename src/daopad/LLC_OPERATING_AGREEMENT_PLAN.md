# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-llc-agreement/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-llc-agreement/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes only (no backend changes):
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "feat: Add LLC Operating Agreement tab (frontend-only)"
   git push -u origin feature/llc-operating-agreement
   gh pr create --title "Feature: LLC Operating Agreement Tab" --body "Implements LLC_OPERATING_AGREEMENT_PLAN.md"
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

**Branch:** `feature/llc-operating-agreement`
**Worktree:** `/home/theseus/alexandria/daopad-llc-agreement/src/daopad`

---

# Implementation Plan: LLC Operating Agreement Tab

## Overview
Create a new "Agreement" tab that generates a legal LLC Operating Agreement document from existing smart contract data. This is a FRONTEND-ONLY implementation that reuses existing backend endpoints.

## Key Architecture Decisions (LEARNED FROM FAILURE)

### ❌ What NOT to Do:
- DON'T create new backend aggregation endpoints (cross-canister calls fail)
- DON'T call Orbit Station directly from backend (parameter mismatches)
- DON'T duplicate data fetching logic
- DON'T create complex backend-to-frontend data flows

### ✅ What TO Do:
- DO reuse existing working endpoints
- DO assemble data in frontend (where errors are visible)
- DO hardcode static data (33 operation thresholds)
- DO focus on document generation, not data fetching

## Current State

### Existing Backend Endpoints (WORKING)
```typescript
// These already work and return data:
perform_security_check(stationId) // Returns admin users, security score, issues
get_request_policies_details(tokenId) // Returns all policies with descriptions
list_orbit_users(tokenId) // Returns users and groups
list_orbit_canisters(tokenId, {limit, offset}) // Returns external canisters
// list_orbit_accounts may not work on all stations - optional
```

### Existing Frontend Services
- `OrbitSecurityService` - Already fetches security data
- `OrbitAccountsService` - Handles treasury accounts
- `OrbitCanistersService` - Handles external canisters

### Current Tab Structure
`TokenDashboard.jsx` has 6 tabs in a grid-cols-6 layout:
- Treasury, Activity, Canisters, Security, Permissions, Settings

## Implementation (FRONTEND ONLY)

### 1. Add Operating Agreement Tab Trigger

#### File: `daopad_frontend/src/components/TokenDashboard.jsx`
```javascript
// PSEUDOCODE - Line ~450
// Change grid from 6 to 7 columns
<TabsList variant="executive" className="flex-1 grid grid-cols-7">
  // ... existing tabs ...
  <TabsTrigger variant="executive" value="agreement">Agreement</TabsTrigger>
</TabsList>

// PSEUDOCODE - Line ~530 (after permissions tab content)
<TabsContent value="agreement" className="mt-4">
  {activeTab === 'agreement' && (
    <OperatingAgreementTab
      tokenId={token.canister_id}
      stationId={orbitStation?.station_id}
      tokenSymbol={token.symbol}
      identity={identity}
    />
  )}
</TabsContent>
```

### 2. Create Operating Agreement Service

#### File: `daopad_frontend/src/services/backend/OrbitAgreementService.js` (NEW)
```javascript
// PSEUDOCODE
import { OrbitSecurityService } from './orbit/security/OrbitSecurityService';
import { BackendServiceBase } from './base/BackendServiceBase';
import { Principal } from '@dfinity/principal';

export class OrbitAgreementService extends BackendServiceBase {
  // Reuse existing services
  async getAgreementData(tokenId, stationId) {
    try {
      const actor = await this.getActor();

      // 1. Get security data (admins, score, issues)
      const securityResult = await actor.perform_security_check(
        Principal.fromText(stationId)
      );

      // 2. Get request policies
      const policiesResult = await actor.get_request_policies_details(
        Principal.fromText(tokenId)
      );

      // 3. Get users and groups
      const usersResult = await actor.list_orbit_users(
        Principal.fromText(tokenId)
      );

      // 4. Try to get external canisters (optional)
      let canistersResult = null;
      try {
        canistersResult = await actor.list_orbit_canisters(
          Principal.fromText(tokenId),
          { limit: [100], offset: [] }
        );
      } catch (e) {
        console.log('Canisters not available');
      }

      return {
        success: true,
        data: {
          security: securityResult.Ok || {},
          policies: policiesResult.Ok || {},
          users: usersResult.Ok || [],
          canisters: canistersResult?.Ok?.Ok || null,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

### 3. Operation Thresholds (Static Data)

#### File: `daopad_frontend/src/constants/operationThresholds.js` (NEW)
```javascript
// PSEUDOCODE - Hardcoded from backend proposals/types.rs
export const OPERATION_THRESHOLDS = [
  // Critical (90%)
  { name: 'System Upgrade', threshold: 90, risk: 'CRITICAL', duration: 72 },
  { name: 'System Restore', threshold: 90, risk: 'CRITICAL', duration: 72 },
  { name: 'Set Disaster Recovery', threshold: 90, risk: 'CRITICAL', duration: 24 },
  { name: 'Manage System Info', threshold: 90, risk: 'CRITICAL', duration: 24 },

  // Treasury (75%)
  { name: 'Transfer', threshold: 75, risk: 'HIGH', duration: 48 },
  { name: 'Add Account', threshold: 75, risk: 'HIGH', duration: 48 },
  { name: 'Edit Account', threshold: 75, risk: 'HIGH', duration: 48 },

  // Governance (70%)
  { name: 'Edit Permission', threshold: 70, risk: 'HIGH', duration: 24 },
  { name: 'Add Request Policy', threshold: 70, risk: 'HIGH', duration: 24 },
  { name: 'Edit Request Policy', threshold: 70, risk: 'HIGH', duration: 24 },
  { name: 'Remove Request Policy', threshold: 70, risk: 'HIGH', duration: 24 },

  // Canisters (60%)
  { name: 'Create External Canister', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },
  { name: 'Configure External Canister', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },
  { name: 'Change External Canister', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },
  { name: 'Call External Canister', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },
  { name: 'Fund External Canister', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },
  { name: 'Monitor External Canister', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },
  { name: 'Snapshot External Canister', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },
  { name: 'Restore External Canister', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },
  { name: 'Prune External Canister', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },

  // Automation (60%)
  { name: 'Add Named Rule', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },
  { name: 'Edit Named Rule', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },
  { name: 'Remove Named Rule', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },

  // Users (50%)
  { name: 'Add User', threshold: 50, risk: 'MEDIUM', duration: 24 },
  { name: 'Edit User', threshold: 50, risk: 'MEDIUM', duration: 24 },
  { name: 'Remove User', threshold: 50, risk: 'MEDIUM', duration: 24 },
  { name: 'Add User Group', threshold: 50, risk: 'MEDIUM', duration: 24 },
  { name: 'Edit User Group', threshold: 50, risk: 'MEDIUM', duration: 24 },
  { name: 'Remove User Group', threshold: 50, risk: 'MEDIUM', duration: 24 },

  // Assets (40%)
  { name: 'Add Asset', threshold: 40, risk: 'LOW', duration: 24 },
  { name: 'Edit Asset', threshold: 40, risk: 'LOW', duration: 24 },
  { name: 'Remove Asset', threshold: 40, risk: 'LOW', duration: 24 },

  // Address Book (30%)
  { name: 'Add Address Book Entry', threshold: 30, risk: 'LOW', duration: 24 },
  { name: 'Edit Address Book Entry', threshold: 30, risk: 'LOW', duration: 24 },
  { name: 'Remove Address Book Entry', threshold: 30, risk: 'LOW', duration: 24 },
];

export const getRiskColor = (risk) => {
  switch(risk) {
    case 'CRITICAL': return 'text-red-600';
    case 'HIGH': return 'text-orange-600';
    case 'MEDIUM-HIGH': return 'text-yellow-600';
    case 'MEDIUM': return 'text-blue-600';
    case 'LOW': return 'text-green-600';
    default: return 'text-gray-600';
  }
};
```

### 4. Agreement Document Component

#### File: `daopad_frontend/src/components/operating-agreement/AgreementDocument.jsx` (NEW)
```javascript
// PSEUDOCODE
import React from 'react';
import { Card, CardContent } from '../ui/card';
import { OPERATION_THRESHOLDS, getRiskColor } from '../../constants/operationThresholds';

const AgreementDocument = ({ data, tokenSymbol, stationId }) => {
  const formatDate = () => new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const getAdmins = () => {
    // Extract admin users from security data
    return data.security?.checks?.find(c => c.name === 'Admin User Count')?.details || 'Backend only';
  };

  const getOperators = () => {
    // Extract operator users from users list
    return data.users?.filter(u =>
      u.groups?.some(g => g.name === 'Operator')
    ).map(u => u.name).join(', ') || 'None';
  };

  return (
    <div className="prose prose-lg max-w-none font-serif">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
        <h1 className="text-3xl font-bold mb-2">
          LIMITED LIABILITY COMPANY OPERATING AGREEMENT
        </h1>
        <h2 className="text-xl">
          {tokenSymbol} Treasury DAO LLC
        </h2>
        <p className="text-sm text-gray-600">
          Effective Date: {formatDate()}
        </p>
        <p className="text-xs text-gray-500">
          On-Chain Reference: Station {stationId}
        </p>
      </div>

      {/* Warning if not decentralized */}
      {data.security?.overall_status === 'high_risk' && (
        <div className="bg-red-50 border-2 border-red-300 p-4 mb-6">
          <h3 className="text-red-800 font-bold">⚠️ GOVERNANCE WARNING</h3>
          <p className="text-red-700">
            {data.security?.risk_summary}
          </p>
          <ul className="mt-2 list-disc pl-5">
            {data.security?.critical_issues?.map((issue, i) => (
              <li key={i} className="text-red-600">{issue.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Article I: Formation */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
          ARTICLE I: FORMATION AND PURPOSE
        </h2>
        <div className="mt-4 space-y-3">
          <p>
            <strong>1.1 Formation.</strong> The Company is organized as a
            limited liability company under the laws of Wyoming, with its
            operations governed entirely by smart contracts deployed on the
            Internet Computer blockchain.
          </p>
          <p>
            <strong>1.2 Smart Contract Governance.</strong> This Agreement
            and all governance actions are executed through immutable smart
            contracts at Orbit Station ID <code>{stationId}</code>, which
            serves as the authoritative source of truth for all Company operations.
          </p>
          <p>
            <strong>1.3 Purpose.</strong> The Company's purpose is to manage
            digital assets and execute transactions as directed by member
            voting through the DAOPad governance system.
          </p>
        </div>
      </section>

      {/* Article II: Members */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
          ARTICLE II: MEMBERS AND VOTING POWER
        </h2>
        <div className="mt-4 space-y-3">
          <p>
            <strong>2.1 Membership.</strong> Membership is determined by
            holding Kong Locker voting power for the {tokenSymbol} token.
            Voting power equals the USD value of permanently locked LP tokens
            multiplied by 100.
          </p>
          <p>
            <strong>2.2 Current Governance Structure:</strong>
          </p>
          <ul className="list-disc pl-8 space-y-2">
            <li><strong>Admin Control:</strong> {getAdmins()}</li>
            <li><strong>Operator Users:</strong> {getOperators()}</li>
            <li><strong>Total Users:</strong> {data.users?.length || 0}</li>
            <li><strong>Security Score:</strong> {data.security?.decentralization_score || 0}/100</li>
          </ul>
          <p>
            <strong>2.3 Voting Rights.</strong> Each member's voting weight
            is proportional to their Kong Locker voting power. Proposals are
            executed when the required threshold is reached.
          </p>
        </div>
      </section>

      {/* Article III: Voting Thresholds */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
          ARTICLE III: VOTING THRESHOLDS BY OPERATION TYPE
        </h2>
        <div className="mt-4">
          <p className="mb-4">
            <strong>3.1 Risk-Based Thresholds.</strong> Operations require
            different approval thresholds based on risk level:
          </p>

          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-400">
                <th className="text-left p-2">Operation</th>
                <th className="text-center p-2">Threshold</th>
                <th className="text-center p-2">Risk</th>
                <th className="text-center p-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              {OPERATION_THRESHOLDS.map((op, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="p-2">{op.name}</td>
                  <td className="text-center p-2 font-bold">{op.threshold}%</td>
                  <td className={`text-center p-2 font-bold ${getRiskColor(op.risk)}`}>
                    {op.risk}
                  </td>
                  <td className="text-center p-2">{op.duration}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Article IV: Request Policies */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
          ARTICLE IV: REQUEST POLICIES
        </h2>
        <div className="mt-4 space-y-3">
          <p>
            <strong>4.1 Active Policies.</strong> The following {data.policies?.total_count || 0} policies
            govern request approvals:
          </p>

          {data.policies?.policies?.slice(0, 10).map((policy, i) => (
            <div key={i} className="pl-4 py-2 border-l-2 border-gray-300">
              <p className="font-semibold">{policy.operation}</p>
              <p className="text-sm text-gray-600">→ {policy.approval_rule}</p>
            </div>
          ))}

          {(data.policies?.total_count || 0) > 10 && (
            <p className="text-sm text-gray-500 italic">
              ... and {data.policies.total_count - 10} more policies
            </p>
          )}

          {data.policies?.auto_approved_count > 0 && (
            <div className="bg-yellow-50 p-3 mt-4">
              <p className="text-yellow-800">
                ⚠️ {data.policies.auto_approved_count} policies are auto-approved
                (development mode)
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Article V: Treasury Management */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
          ARTICLE V: TREASURY MANAGEMENT
        </h2>
        <div className="mt-4 space-y-3">
          <p>
            <strong>5.1 Treasury Control.</strong> All treasury operations
            require {OPERATION_THRESHOLDS.find(o => o.name === 'Transfer')?.threshold}%
            approval from voting members.
          </p>
          <p>
            <strong>5.2 Asset Management.</strong> The Company may hold and
            manage multiple digital assets as approved by member vote.
          </p>
        </div>
      </section>

      {/* Article VI: External Canisters */}
      {data.canisters && (
        <section className="mb-8">
          <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
            ARTICLE VI: EXTERNAL CANISTER MANAGEMENT
          </h2>
          <div className="mt-4 space-y-3">
            <p>
              <strong>6.1 Managed Canisters.</strong> The Company controls {data.canisters.total || 0} external
              canisters:
            </p>
            {data.canisters.canisters?.map((c, i) => (
              <div key={i} className="pl-4">
                • {c.name || 'Unnamed'}: <code>{c.canister_id}</code>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Article VII: Amendment */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
          ARTICLE VII: AMENDMENTS AND DISPUTE RESOLUTION
        </h2>
        <div className="mt-4 space-y-3">
          <p>
            <strong>7.1 Amendments.</strong> This Agreement may only be
            amended through on-chain governance requiring {
              OPERATION_THRESHOLDS.find(o => o.name === 'Edit Request Policy')?.threshold
            }% member approval.
          </p>
          <p>
            <strong>7.2 Smart Contract Authority.</strong> In case of any
            conflict between this document and the on-chain state, the
            blockchain state at Station {stationId} prevails.
          </p>
          <p>
            <strong>7.3 Dispute Resolution.</strong> All disputes shall be
            resolved through member voting or, if necessary, binding arbitration
            under Wyoming law.
          </p>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t-2 border-gray-800 text-center">
        <p className="text-sm text-gray-600">
          This Operating Agreement is generated from on-chain data at {formatDate()}.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Blockchain verification: Query Orbit Station {stationId} on the Internet Computer
        </p>
      </div>
    </div>
  );
};

export default AgreementDocument;
```

### 5. Main Operating Agreement Tab

#### File: `daopad_frontend/src/components/operating-agreement/OperatingAgreementTab.jsx` (NEW)
```javascript
// PSEUDOCODE
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Download, FileText, RefreshCw } from 'lucide-react';
import { OrbitAgreementService } from '../../services/backend/OrbitAgreementService';
import AgreementDocument from './AgreementDocument';
import { generateMarkdown, downloadFile } from '../../utils/agreementExport';

const OperatingAgreementTab = ({ tokenId, stationId, tokenSymbol, identity }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAgreementData = async () => {
    if (!stationId || !identity) return;

    setLoading(true);
    setError(null);

    try {
      const service = new OrbitAgreementService(identity);
      const result = await service.getAgreementData(tokenId, stationId);

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load agreement data');
      }
    } catch (err) {
      setError('Failed to fetch agreement data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgreementData();
  }, [stationId, identity]);

  const handleExport = (format) => {
    if (!data) return;

    if (format === 'markdown') {
      const content = generateMarkdown(data, tokenSymbol, stationId);
      downloadFile(content, `${tokenSymbol}_operating_agreement.md`, 'text/markdown');
    } else if (format === 'print') {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>LLC Operating Agreement</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAgreementData}
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('markdown')}
                disabled={!data}
              >
                <Download className="mr-2 h-4 w-4" />
                Export MD
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('print')}
                disabled={!data}
              >
                <FileText className="mr-2 h-4 w-4" />
                Print/PDF
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              This legally-binding operating agreement is generated from your DAO's
              on-chain configuration. The smart contracts ARE the agreement - this
              document describes their current state for traditional legal compliance.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-2">Loading agreement data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Alert className="border-red-200">
          <AlertDescription className="text-red-600">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Agreement Document */}
      {data && !loading && (
        <Card className="print:border-0">
          <CardContent className="p-8">
            <AgreementDocument
              data={data}
              tokenSymbol={tokenSymbol}
              stationId={stationId}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OperatingAgreementTab;
```

### 6. Export Utilities

#### File: `daopad_frontend/src/utils/agreementExport.js` (NEW)
```javascript
// PSEUDOCODE
import { OPERATION_THRESHOLDS } from '../constants/operationThresholds';

export const generateMarkdown = (data, tokenSymbol, stationId) => {
  const formatDate = () => new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  let md = `# LIMITED LIABILITY COMPANY OPERATING AGREEMENT

## ${tokenSymbol} Treasury DAO LLC

**Effective Date:** ${formatDate()}
**On-Chain Reference:** Station ${stationId}

---

## ARTICLE I: FORMATION AND PURPOSE

**1.1 Formation.** The Company is organized as a limited liability company under the laws of Wyoming, with its operations governed entirely by smart contracts deployed on the Internet Computer blockchain.

**1.2 Smart Contract Governance.** This Agreement and all governance actions are executed through immutable smart contracts at Orbit Station ID \`${stationId}\`, which serves as the authoritative source of truth for all Company operations.

**1.3 Purpose.** The Company's purpose is to manage digital assets and execute transactions as directed by member voting through the DAOPad governance system.

## ARTICLE II: MEMBERS AND VOTING POWER

**2.1 Membership.** Membership is determined by holding Kong Locker voting power for the ${tokenSymbol} token.

**2.2 Current Governance:**
- Security Score: ${data.security?.decentralization_score || 0}/100
- Total Users: ${data.users?.length || 0}

## ARTICLE III: VOTING THRESHOLDS

| Operation | Threshold | Risk | Duration |
|-----------|-----------|------|----------|
${OPERATION_THRESHOLDS.map(op =>
  `| ${op.name} | ${op.threshold}% | ${op.risk} | ${op.duration}h |`
).join('\n')}

## ARTICLE IV: REQUEST POLICIES

Active Policies: ${data.policies?.total_count || 0}
${data.policies?.auto_approved_count > 0 ? `\n⚠️ ${data.policies.auto_approved_count} policies are auto-approved (development mode)\n` : ''}

${data.policies?.policies?.slice(0, 10).map(p =>
  `- **${p.operation}**: ${p.approval_rule}`
).join('\n')}

---

*Generated from on-chain data on ${formatDate()}*
`;

  return md;
};

export const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
```

### 7. Print Styles

#### File: `daopad_frontend/src/index.css` (APPEND)
```css
/* Print styles for Operating Agreement */
@media print {
  /* Hide everything except agreement content */
  body * {
    visibility: hidden;
  }

  .print\\:border-0 {
    border: 0 !important;
  }

  /* Show only the agreement document */
  #root .prose {
    visibility: visible;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }

  /* Professional document styling */
  .prose {
    font-family: 'Times New Roman', serif;
    font-size: 11pt;
    line-height: 1.6;
    color: black;
  }

  /* Page breaks */
  .prose section {
    page-break-inside: avoid;
  }

  .prose h2 {
    page-break-after: avoid;
  }
}
```

## Testing Requirements

```bash
# 1. Build frontend
cd /home/theseus/alexandria/daopad-llc-agreement/src/daopad
npm run build

# 2. Deploy frontend only
./deploy.sh --network ic --frontend-only

# 3. Test in browser
# - Navigate to token with linked Orbit Station
# - Click "Agreement" tab (7th tab)
# - Verify document loads with real data
# - Test "Export MD" button
# - Test "Print/PDF" button

# 4. Verify no backend changes needed
grep -r "get_operating_agreement_data" daopad_backend/  # Should return nothing
```

## Success Criteria

1. ✅ Agreement tab appears as 7th tab
2. ✅ Document loads using existing endpoints (no new backend code)
3. ✅ Shows all 33 operation thresholds
4. ✅ Displays current users, groups, policies
5. ✅ Export to Markdown works
6. ✅ Print/PDF styling is professional
7. ✅ Warning shown if DAO not decentralized
8. ✅ No cross-canister call errors

## Why This Will Work

1. **No new backend code** = No cross-canister call issues
2. **Reuses working endpoints** = Data already proven to load
3. **Static thresholds** = No need to query, just hardcode
4. **Frontend assembly** = Errors visible, easy to debug
5. **Focused goal** = Generate document, not reinvent data layer

## Common Pitfalls to Avoid

❌ DON'T create backend aggregation endpoint
❌ DON'T make new Orbit Station calls
❌ DON'T try to fetch data that doesn't exist
✅ DO use existing working endpoints
✅ DO hardcode static data
✅ DO focus on document formatting

---

**REMINDER**: After implementation, you MUST create the PR. No stopping, no questions, just execute and create PR.