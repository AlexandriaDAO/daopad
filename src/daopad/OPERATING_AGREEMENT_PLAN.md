# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-operating-agreement/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-operating-agreement/src/daopad`
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
   git commit -m "feat: Add Operating Agreement generation tab for DAO LLCs"
   git push -u origin feature/operating-agreement
   gh pr create --title "Feature: Operating Agreement Tab for DAO LLCs" --body "Implements OPERATING_AGREEMENT_PLAN.md

## Summary
- Adds new Operating Agreement tab to token dashboard
- Generates LLC operating agreement from smart contract configuration
- Includes all governance rules, permissions, request policies, and security settings
- Supports PDF/Markdown export for legal compliance

## Key Components
- Backend: Aggregates Orbit Station configuration data
- Frontend: Operating Agreement tab with formatted legal document
- Export: PDF and Markdown download options

Closes #[ISSUE_NUMBER_IF_EXISTS]"
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

**Branch:** `feature/operating-agreement`
**Worktree:** `/home/theseus/alexandria/daopad-operating-agreement/src/daopad`

---

# Implementation Plan: Operating Agreement Tab

## Task Classification

**NEW FEATURE**: Build new Operating Agreement tab that generates LLC operating agreements from smart contract configuration data.

## Context

DAOPad is for DAO LLCs where:
- Smart contracts **ARE** the operating agreement
- The operating agreement documents what the smart contracts enforce
- This creates a legally-binding document from on-chain governance rules

The operating agreement should include all information describing:
- **WHO** controls the treasury (admins, members, voting power)
- **WHAT** operations are allowed (transfer, user management, system upgrades)
- **HOW** decisions are made (request policies, voting thresholds, approval rules)
- **WHEN** actions can be executed (timeframes, expiration)
- **SECURITY** posture (the entire Security tab analysis)

## Current State

### File Tree (Before)
```
daopad_frontend/src/
├── components/
│   ├── TokenDashboard.jsx         # Main dashboard with 6 tabs
│   ├── security/
│   │   ├── SecurityDashboard.jsx  # Security tab (16 checks)
│   │   └── ...
│   └── ...
├── services/backend/orbit/
│   └── security/
│       └── OrbitSecurityService.js  # Security data fetching
└── ...

daopad_backend/src/
├── api/
│   ├── security/                  # Security check implementations
│   └── orbit_users.rs             # User/group queries
├── proposals/
│   └── types.rs                   # 33 Orbit operation types with thresholds
└── ...
```

### File Tree (After)
```
daopad_frontend/src/
├── components/
│   ├── TokenDashboard.jsx         # MODIFY: Add 7th tab "Operating Agreement"
│   ├── operating-agreement/       # NEW DIRECTORY
│   │   ├── OperatingAgreementTab.jsx       # Main component
│   │   ├── AgreementDocument.jsx           # Formatted legal document
│   │   ├── AgreementSection.jsx            # Reusable section component
│   │   └── agreementTemplates.js           # Legal text templates
│   └── ...
├── services/backend/
│   └── OrbitAgreementService.js   # NEW: Aggregate data for agreement
└── utils/
    ├── pdfGenerator.js            # NEW: PDF export
    └── agreementFormatter.js       # NEW: Format data for legal doc

daopad_backend/src/
├── api/
│   └── operating_agreement.rs     # NEW: Aggregate all config data
└── ...
```

### Existing Implementations

#### Current Tabs (TokenDashboard.jsx:446-529)
```javascript
<TabsList className="grid grid-cols-6">
  <TabsTrigger value="accounts">Treasury</TabsTrigger>
  <TabsTrigger value="activity">Activity</TabsTrigger>
  <TabsTrigger value="canisters">Canisters</TabsTrigger>
  <TabsTrigger value="security">Security</TabsTrigger>
  <TabsTrigger value="permissions">Permissions</TabsTrigger>
  <TabsTrigger value="settings">Settings</TabsTrigger>
</TabsList>
```

#### Security Data Available (OrbitSecurityService.js:212-323)
- 16 security checks (admin control, treasury control, governance, policies, etc.)
- Risk scoring (0-100)
- Critical issues and recommendations
- Request policies details

#### Governance Types Available (proposals/types.rs:74-186)
- 33 Orbit request types
- Risk-based voting thresholds (30%-90%)
- Voting duration (24-72 hours)
- Operation categories:
  - Treasury (75%): Transfer, AddAccount, EditAccount
  - User Management (50%): AddUser, EditUser, RemoveUser
  - Governance (70%): EditPermission, AddRequestPolicy
  - System (90%): SystemUpgrade, SystemRestore
  - Canisters (60%): CreateExternalCanister, CallExternalCanister
  - Assets (40%): AddAsset, EditAsset
  - Address Book (30%): AddAddressBookEntry

#### Orbit Station Data Available (from spec.did)
- **Users**: UUID, name, status, groups, identities, last_modification_timestamp
- **UserGroups**: UUID, name, members
- **Permissions**: Resource-based access control (Account, User, Permission, Request, etc.)
- **Request Policies**: Specifier + Rule (AutoApproved, Quorum, QuorumPercentage, AllowListed, etc.)
- **Accounts**: Treasury accounts with balances
- **External Canisters**: Controlled canisters with permissions

### Dependencies and Constraints

1. **Backend limitations**:
   - Cross-canister queries must use `#[update]` not `#[query]`
   - Must be admin to query protected Orbit data
   - Backend is sole admin in proper DAO setup

2. **Data aggregation**:
   - Operating agreement needs data from MULTIPLE sources:
     - Security checks (16 checks)
     - User list with groups
     - All request policies
     - Permission settings
     - Account configurations
     - Governance proposal types and thresholds
   - Single endpoint for performance: `get_operating_agreement_data(station_id)`

3. **Legal compliance**:
   - Must be accurate to on-chain state (no fabrication)
   - Timestamp of generation
   - All voting thresholds explicitly stated
   - All admin identities listed
   - All request policies enumerated

4. **Export formats**:
   - Markdown (for editing/review)
   - PDF (for filing with state/secretary)
   - HTML (for web display)

## Implementation Plan

### Backend: Aggregate Operating Agreement Data

#### NEW: `daopad_backend/src/api/operating_agreement.rs`
```rust
// PSEUDOCODE
use candid::{CandidType, Deserialize, Principal};
use ic_cdk::update;
use crate::types::orbit::*;
use crate::storage::state::TOKEN_ORBIT_STATIONS;
use crate::proposals::types::OrbitRequestType;

/// Complete operating agreement data aggregated from Orbit Station
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct OperatingAgreementData {
    // Metadata
    pub generated_at: u64,  // Timestamp
    pub station_id: String,
    pub token_symbol: String,
    pub daopad_version: String,

    // Organization Info
    pub llc_name: Option<String>,  // E.g., "ALEX Treasury DAO LLC"
    pub jurisdiction: Option<String>,  // E.g., "Wyoming"

    // Members & Control
    pub users: Vec<UserWithRoles>,  // All users with group memberships
    pub user_groups: Vec<UserGroupDetail>,  // Admin, Operator, custom groups
    pub admins: Vec<MemberIdentity>,  // Who has admin rights
    pub total_members: u32,

    // Governance Rules
    pub request_policies: Vec<RequestPolicyDetail>,  // All policies with readable descriptions
    pub voting_thresholds: Vec<OperationThreshold>,  // All 33 operations with %
    pub proposal_durations: Vec<OperationDuration>,  // How long votes last

    // Security Posture
    pub security_score: u8,  // 0-100 from security checks
    pub security_status: String,  // "secure", "medium_risk", etc.
    pub critical_issues: Vec<String>,  // Any security problems
    pub is_truly_decentralized: bool,  // Backend-only admin?

    // Treasury Configuration
    pub accounts: Vec<AccountSummary>,  // All treasury accounts
    pub total_asset_types: u32,
    pub external_canisters: Vec<CanisterSummary>,

    // Permissions
    pub permissions: Vec<PermissionDetail>,  // Resource-based permissions
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct UserWithRoles {
    pub id: String,
    pub name: String,
    pub identities: Vec<String>,  // Principal IDs
    pub groups: Vec<String>,  // Group names
    pub status: String,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct RequestPolicyDetail {
    pub operation: String,  // "Transfer", "AddUser", etc.
    pub description: String,  // Human-readable rule
    pub approval_rule: String,  // "AutoApproved", "Quorum(1/3)", etc.
    pub risk_level: String,  // "Critical", "High", "Medium", "Low"
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct OperationThreshold {
    pub operation: String,
    pub threshold_percentage: u8,  // 30-90
    pub voting_duration_hours: u64,  // 24-72
    pub rationale: String,  // Why this threshold?
}

/// Main endpoint: Get all data needed for operating agreement
#[update]
pub async fn get_operating_agreement_data(
    token_canister_id: Principal,
) -> Result<OperatingAgreementData, String> {
    let caller = ic_cdk::caller();

    // 1. Get station ID
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
            .ok_or_else(|| "No Orbit Station linked".to_string())
    })?;

    // 2. Parallel data fetching (call all concurrently)
    let (users_result, groups_result, policies_result, security_result) = tokio::join!(
        list_users_for_agreement(station_id),
        list_user_groups(station_id),
        get_all_request_policies(station_id),
        perform_security_check(station_id),
    );

    // 3. Parse results
    let users = users_result?;
    let groups = groups_result?;
    let policies = policies_result?;
    let security = security_result?;

    // 4. Identify admins
    let admin_group_id = "00000000-0000-4000-8000-000000000000";
    let admins = users.iter()
        .filter(|u| u.groups.iter().any(|g| g.id == admin_group_id))
        .map(|u| MemberIdentity {
            name: u.name.clone(),
            identities: u.identities.clone(),
        })
        .collect();

    // 5. Get token metadata
    let token_metadata = get_token_metadata(token_canister_id).await?;

    // 6. Build operation thresholds from OrbitRequestType enum
    let voting_thresholds = build_operation_thresholds();

    // 7. Format policies for legal doc
    let policy_details = format_request_policies(policies);

    // 8. Get treasury accounts
    let accounts = list_accounts(station_id).await?;

    // 9. Assemble complete data
    Ok(OperatingAgreementData {
        generated_at: ic_cdk::api::time(),
        station_id: station_id.to_text(),
        token_symbol: token_metadata.symbol,
        daopad_version: env!("CARGO_PKG_VERSION").to_string(),

        llc_name: Some(format!("{} Treasury DAO LLC", token_metadata.symbol)),
        jurisdiction: Some("Wyoming".to_string()),  // Default, user can edit

        users: format_users(users),
        user_groups: groups,
        admins,
        total_members: users.len() as u32,

        request_policies: policy_details,
        voting_thresholds,
        proposal_durations: build_operation_durations(),

        security_score: security.decentralization_score,
        security_status: security.overall_status,
        critical_issues: security.critical_issues,
        is_truly_decentralized: admins.len() == 1 && admins[0].identities.contains(&DAOPAD_BACKEND_ID),

        accounts: summarize_accounts(accounts),
        total_asset_types: accounts.len() as u32,
        external_canisters: list_external_canisters(station_id).await?,

        permissions: list_permissions(station_id).await?,
    })
}

/// Helper: Build all operation thresholds from types.rs enum
fn build_operation_thresholds() -> Vec<OperationThreshold> {
    vec![
        // System Operations (90%)
        OperationThreshold {
            operation: "System Upgrade".to_string(),
            threshold_percentage: 90,
            voting_duration_hours: 72,
            rationale: "Critical operation requiring supermajority consensus".to_string(),
        },
        OperationThreshold {
            operation: "System Restore".to_string(),
            threshold_percentage: 90,
            voting_duration_hours: 72,
            rationale: "Emergency recovery requiring supermajority approval".to_string(),
        },

        // Treasury Operations (75%)
        OperationThreshold {
            operation: "Transfer".to_string(),
            threshold_percentage: 75,
            voting_duration_hours: 48,
            rationale: "High-risk financial operation requiring strong majority".to_string(),
        },
        OperationThreshold {
            operation: "Add Account".to_string(),
            threshold_percentage: 75,
            voting_duration_hours: 48,
            rationale: "Treasury expansion requiring strong approval".to_string(),
        },

        // ... Continue for all 33 operation types ...

        // Address Book (30%)
        OperationThreshold {
            operation: "Add Address Book Entry".to_string(),
            threshold_percentage: 30,
            voting_duration_hours: 24,
            rationale: "Low-risk administrative operation".to_string(),
        },
    ]
}

/// Helper: Format request policies into human-readable descriptions
fn format_request_policies(policies: Vec<RequestPolicy>) -> Vec<RequestPolicyDetail> {
    policies.iter().map(|p| {
        let (description, risk) = describe_policy(p);
        RequestPolicyDetail {
            operation: format_specifier(&p.specifier),
            description,
            approval_rule: format_rule(&p.rule),
            risk_level: risk,
        }
    }).collect()
}

fn describe_policy(policy: &RequestPolicy) -> (String, String) {
    // Convert technical policy into legal language
    match &policy.rule {
        RequestPolicyRule::AutoApproved => (
            "Automatically approved without review".to_string(),
            "High".to_string()
        ),
        RequestPolicyRule::Quorum(q) => (
            format!("Requires {} of {} approvers from {}",
                q.min_approved,
                q.approvers.len(),
                describe_user_specifier(&q.approvers)
            ),
            "Medium".to_string()
        ),
        // ... handle all rule types ...
    }
}

/// Helper functions for other data aggregation
async fn list_users_for_agreement(station_id: Principal) -> Result<Vec<User>, String> {
    // Call Orbit's list_users
    let result: (ListUsersResult,) = ic_cdk::call(
        station_id,
        "list_users",
        (ListUsersInput {
            search_term: None,
            statuses: None,
            groups: None,
            paginate: None,
        },)
    ).await.map_err(|e| format!("Failed to list users: {:?}", e))?;

    match result.0 {
        ListUsersResult::Ok { users, .. } => Ok(users),
        ListUsersResult::Err(e) => Err(format!("Orbit error: {}", e)),
    }
}

// Similar helpers for:
// - list_user_groups()
// - get_all_request_policies()
// - perform_security_check()
// - list_accounts()
// - list_external_canisters()
// - list_permissions()
```

#### MODIFY: `daopad_backend/src/api/mod.rs`
```rust
// PSEUDOCODE
pub mod operating_agreement;  // NEW module
```

#### MODIFY: `daopad_backend/daopad_backend.did`
```candid
// PSEUDOCODE - Will be auto-generated by candid-extractor
type OperatingAgreementData = record {
  generated_at : nat64;
  station_id : text;
  token_symbol : text;
  daopad_version : text;
  llc_name : opt text;
  jurisdiction : opt text;
  users : vec UserWithRoles;
  user_groups : vec UserGroupDetail;
  admins : vec MemberIdentity;
  total_members : nat32;
  request_policies : vec RequestPolicyDetail;
  voting_thresholds : vec OperationThreshold;
  proposal_durations : vec OperationDuration;
  security_score : nat8;
  security_status : text;
  critical_issues : vec text;
  is_truly_decentralized : bool;
  accounts : vec AccountSummary;
  total_asset_types : nat32;
  external_canisters : vec CanisterSummary;
  permissions : vec PermissionDetail;
};

service : {
  get_operating_agreement_data : (principal) -> (variant {
    Ok : OperatingAgreementData;
    Err : text;
  });
}
```

### Frontend: Operating Agreement Tab

#### NEW: `daopad_frontend/src/components/operating-agreement/OperatingAgreementTab.jsx`
```javascript
// PSEUDOCODE
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import { Download, FileText, FilePdf } from 'lucide-react';
import { OrbitAgreementService } from '../../services/backend/OrbitAgreementService';
import AgreementDocument from './AgreementDocument';
import { generatePDF } from '../../utils/pdfGenerator';
import { generateMarkdown } from '../../utils/agreementFormatter';

const OperatingAgreementTab = ({ tokenId, stationId, tokenSymbol, identity }) => {
  const [agreementData, setAgreementData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (tokenId && identity) {
      loadAgreementData();
    }
  }, [tokenId, identity]);

  const loadAgreementData = async () => {
    setLoading(true);
    setError(null);

    try {
      const service = new OrbitAgreementService(identity);
      const result = await service.getOperatingAgreementData(tokenId);

      if (result.success) {
        setAgreementData(result.data);
      } else {
        setError(result.error || 'Failed to load operating agreement data');
      }
    } catch (err) {
      console.error('Error loading agreement data:', err);
      setError('Failed to load operating agreement data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportMarkdown = () => {
    if (!agreementData) return;

    const markdown = generateMarkdown(agreementData, tokenSymbol);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tokenSymbol}-Operating-Agreement-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!agreementData) return;

    setGenerating(true);
    try {
      await generatePDF(agreementData, tokenSymbol);
    } catch (err) {
      console.error('PDF generation failed:', err);
      setError('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!agreementData) return null;

  return (
    <div className="space-y-6">
      {/* Header with export options */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Operating Agreement</CardTitle>
              <CardDescription>
                Legally-binding document generated from on-chain governance configuration
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleExportMarkdown}
                variant="outline"
                size="sm"
              >
                <FileText className="w-4 h-4 mr-2" />
                Export Markdown
              </Button>
              <Button
                onClick={handleExportPDF}
                disabled={generating}
                size="sm"
              >
                <FilePdf className="w-4 h-4 mr-2" />
                {generating ? 'Generating...' : 'Export PDF'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Security warning if not decentralized */}
      {!agreementData.is_truly_decentralized && (
        <Alert variant="warning">
          <AlertDescription>
            ⚠️ This DAO is not fully decentralized. Multiple admins exist beyond the governance backend.
            Review the Security tab for details.
          </AlertDescription>
        </Alert>
      )}

      {/* Formatted operating agreement document */}
      <AgreementDocument data={agreementData} tokenSymbol={tokenSymbol} />
    </div>
  );
};

export default OperatingAgreementTab;
```

#### NEW: `daopad_frontend/src/components/operating-agreement/AgreementDocument.jsx`
```javascript
// PSEUDOCODE
import React from 'react';
import { Card, CardContent } from '../ui/card';
import AgreementSection from './AgreementSection';

const AgreementDocument = ({ data, tokenSymbol }) => {
  const formatDate = (timestamp) => {
    return new Date(Number(timestamp) / 1_000_000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatIdentity = (identity) => {
    // Shorten principal IDs for readability
    if (identity.length > 20) {
      return `${identity.slice(0, 10)}...${identity.slice(-8)}`;
    }
    return identity;
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardContent className="p-8 space-y-8 font-serif text-gray-900">
        {/* Title */}
        <div className="text-center space-y-2 border-b-2 border-gray-800 pb-6">
          <h1 className="text-3xl font-bold uppercase tracking-wide">
            Operating Agreement
          </h1>
          <h2 className="text-2xl">
            {data.llc_name || `${tokenSymbol} Treasury DAO LLC`}
          </h2>
          <p className="text-sm text-gray-600">
            A {data.jurisdiction || 'Wyoming'} Limited Liability Company
          </p>
          <p className="text-xs text-gray-500">
            Generated: {formatDate(data.generated_at)}
          </p>
        </div>

        {/* Article I: Organization */}
        <AgreementSection
          article="I"
          title="Formation and Organization"
        >
          <p className="mb-4">
            This Operating Agreement (the "Agreement") of {data.llc_name} (the "Company")
            is entered into and shall be effective as of {formatDate(data.generated_at)}.
          </p>
          <p className="mb-4">
            The Company is organized as a Limited Liability Company pursuant to the laws of {data.jurisdiction}.
          </p>
          <p className="mb-4">
            The Company's governance is executed entirely through smart contracts deployed on the
            Internet Computer blockchain, specifically through Orbit Station ID:
            <code className="bg-gray-100 px-2 py-1 rounded mx-1 font-mono text-sm">
              {data.station_id}
            </code>
          </p>
          <p>
            This Operating Agreement constitutes the written documentation of the on-chain
            governance rules encoded in the smart contracts.
          </p>
        </AgreementSection>

        {/* Article II: Members */}
        <AgreementSection
          article="II"
          title="Members and Governance"
        >
          <h4 className="font-bold text-lg mb-3">Section 2.1: Members</h4>
          <p className="mb-4">
            The Company has {data.total_members} member(s) as of the date of this Agreement.
          </p>

          <h4 className="font-bold text-lg mb-3">Section 2.2: Administrative Control</h4>
          <p className="mb-4">
            The Company is governed by the following administrator(s):
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4">
            {data.admins.map((admin, idx) => (
              <li key={idx}>
                <strong>{admin.name}</strong>
                <ul className="list-none ml-6 mt-1 text-sm text-gray-700">
                  {admin.identities.map((identity, i) => (
                    <li key={i} className="font-mono">
                      Principal: {formatIdentity(identity)}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          {data.is_truly_decentralized ? (
            <div className="bg-green-50 border border-green-200 rounded p-4 my-4">
              <p className="text-green-800">
                ✓ <strong>True Decentralization:</strong> The sole administrator is the DAOPad governance backend,
                which executes only actions approved by community voting.
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 my-4">
              <p className="text-yellow-800">
                ⚠ <strong>Warning:</strong> Multiple administrators exist. This may allow
                actions to be taken without community approval. (Security Score: {data.security_score}/100)
              </p>
            </div>
          )}

          <h4 className="font-bold text-lg mb-3 mt-6">Section 2.3: Member Groups</h4>
          <p className="mb-4">
            Members are organized into the following groups:
          </p>
          <ul className="list-disc list-inside space-y-2">
            {data.user_groups.map((group, idx) => (
              <li key={idx}>
                <strong>{group.name}</strong> (UUID: <code className="text-xs">{group.id}</code>)
              </li>
            ))}
          </ul>
        </AgreementSection>

        {/* Article III: Voting and Proposals */}
        <AgreementSection
          article="III"
          title="Voting Rights and Governance Procedures"
        >
          <h4 className="font-bold text-lg mb-3">Section 3.1: Voting Power</h4>
          <p className="mb-4">
            Voting power is determined by the USD value of locked LP tokens in Kong Locker,
            calculated as: <strong>Voting Power = USD Value × 100</strong>
          </p>
          <p className="mb-4">
            All major decisions require community approval through on-chain voting proposals.
          </p>

          <h4 className="font-bold text-lg mb-3">Section 3.2: Operation Approval Thresholds</h4>
          <p className="mb-4">
            The following operations require the specified percentage of total voting power to approve:
          </p>

          <div className="space-y-6">
            {/* Group by threshold */}
            {[90, 75, 70, 60, 50, 40, 30].map(threshold => {
              const ops = data.voting_thresholds.filter(vt => vt.threshold_percentage === threshold);
              if (ops.length === 0) return null;

              return (
                <div key={threshold} className="border-l-4 border-gray-300 pl-4">
                  <h5 className="font-bold text-md mb-2">
                    {threshold}% Approval Required:
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {ops.map((op, idx) => (
                      <li key={idx}>
                        <strong>{op.operation}</strong>
                        <span className="text-gray-600"> — {op.voting_duration_hours}h voting period</span>
                        <p className="ml-6 text-gray-700 italic">{op.rationale}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </AgreementSection>

        {/* Article IV: Request Policies */}
        <AgreementSection
          article="IV"
          title="Request Policies and Approval Rules"
        >
          <p className="mb-4">
            The Company employs the following request policies to govern operations:
          </p>

          <div className="space-y-4">
            {data.request_policies.map((policy, idx) => (
              <div key={idx} className="border rounded p-4 bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-bold">{policy.operation}</h5>
                  <span className={`text-xs px-2 py-1 rounded ${
                    policy.risk_level === 'Critical' ? 'bg-red-100 text-red-800' :
                    policy.risk_level === 'High' ? 'bg-orange-100 text-orange-800' :
                    policy.risk_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {policy.risk_level} Risk
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{policy.description}</p>
                <p className="text-sm font-mono text-gray-600">
                  Rule: {policy.approval_rule}
                </p>
              </div>
            ))}
          </div>
        </AgreementSection>

        {/* Article V: Treasury Management */}
        <AgreementSection
          article="V"
          title="Treasury and Asset Management"
        >
          <h4 className="font-bold text-lg mb-3">Section 5.1: Treasury Accounts</h4>
          <p className="mb-4">
            The Company maintains {data.accounts.length} treasury account(s) for asset management.
          </p>

          <ul className="list-disc list-inside space-y-2 mb-4">
            {data.accounts.map((account, idx) => (
              <li key={idx}>
                <strong>{account.name}</strong>
                <span className="text-gray-600 text-sm ml-2">
                  ({account.asset_types.length} asset types)
                </span>
              </li>
            ))}
          </ul>

          <h4 className="font-bold text-lg mb-3">Section 5.2: Transfer Authority</h4>
          <p className="mb-4">
            All treasury transfers require {data.voting_thresholds.find(vt => vt.operation === 'Transfer')?.threshold_percentage}%
            voting power approval and are subject to the governance procedures defined in Article III.
          </p>
        </AgreementSection>

        {/* Article VI: External Canisters */}
        {data.external_canisters && data.external_canisters.length > 0 && (
          <AgreementSection
            article="VI"
            title="External Canister Management"
          >
            <p className="mb-4">
              The Company controls the following external smart contracts (canisters):
            </p>
            <ul className="list-disc list-inside space-y-2">
              {data.external_canisters.map((canister, idx) => (
                <li key={idx}>
                  <strong>{canister.name}</strong>
                  <code className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                    {canister.canister_id}
                  </code>
                </li>
              ))}
            </ul>
          </AgreementSection>
        )}

        {/* Article VII: Security and Compliance */}
        <AgreementSection
          article="VII"
          title="Security Posture and Compliance"
        >
          <h4 className="font-bold text-lg mb-3">Section 7.1: Decentralization Status</h4>
          <div className="mb-4 p-4 bg-gray-50 rounded">
            <p className="mb-2">
              <strong>Security Score:</strong> {data.security_score}/100
              <span className="ml-2 text-sm text-gray-600">({data.security_status})</span>
            </p>
            <p className="mb-2">
              <strong>Decentralization:</strong> {data.is_truly_decentralized ?
                'Fully Decentralized DAO' :
                'Partially Centralized (Multiple Admins)'}
            </p>
          </div>

          {data.critical_issues && data.critical_issues.length > 0 && (
            <>
              <h4 className="font-bold text-lg mb-3">Section 7.2: Security Issues</h4>
              <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
                <p className="font-bold text-red-800 mb-2">Critical Issues:</p>
                <ul className="list-disc list-inside space-y-1 text-red-700">
                  {data.critical_issues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <h4 className="font-bold text-lg mb-3">Section 7.3: On-Chain Verification</h4>
          <p className="mb-2">
            This operating agreement is automatically generated from on-chain governance configuration.
          </p>
          <p className="text-sm text-gray-600 font-mono">
            Station ID: {data.station_id}
            <br />
            Generated: {formatDate(data.generated_at)}
            <br />
            DAOPad Version: {data.daopad_version}
          </p>
        </AgreementSection>

        {/* Signature Block */}
        <div className="border-t-2 border-gray-800 pt-6 mt-8">
          <p className="text-sm text-gray-600 mb-8">
            This Operating Agreement is executed through smart contracts and does not require
            manual signatures. The on-chain state of the Orbit Station canister constitutes
            the authoritative version of this agreement.
          </p>

          <p className="text-xs text-gray-500 text-center">
            Generated by DAOPad v{data.daopad_version} | {formatDate(data.generated_at)}
            <br />
            Orbit Station: {data.station_id}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgreementDocument;
```

#### NEW: `daopad_frontend/src/components/operating-agreement/AgreementSection.jsx`
```javascript
// PSEUDOCODE
import React from 'react';

const AgreementSection = ({ article, title, children }) => {
  return (
    <section className="space-y-3">
      <h3 className="text-xl font-bold border-b border-gray-300 pb-2">
        <span className="text-gray-600">Article {article}:</span> {title}
      </h3>
      <div className="pl-4">
        {children}
      </div>
    </section>
  );
};

export default AgreementSection;
```

#### NEW: `daopad_frontend/src/services/backend/OrbitAgreementService.js`
```javascript
// PSEUDOCODE
import { BackendServiceBase } from './base/BackendServiceBase';

export class OrbitAgreementService extends BackendServiceBase {
  /**
   * Get complete operating agreement data
   * @param {string|Principal} tokenId - Token canister ID
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async getOperatingAgreementData(tokenId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.get_operating_agreement_data(tokenPrincipal);

      if ('Ok' in result) {
        // Transform data for frontend consumption
        const data = result.Ok;
        return {
          success: true,
          data: {
            ...data,
            // Convert any Principal types to strings
            station_id: data.station_id.toString(),
            admins: data.admins.map(admin => ({
              ...admin,
              identities: admin.identities.map(id => id.toString()),
            })),
          }
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to get operating agreement data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default OrbitAgreementService;
```

#### NEW: `daopad_frontend/src/utils/pdfGenerator.js`
```javascript
// PSEUDOCODE
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const generatePDF = async (agreementData, tokenSymbol) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Set font
  doc.setFont('times', 'normal');

  // Title
  doc.setFontSize(18);
  doc.setFont('times', 'bold');
  doc.text('OPERATING AGREEMENT', 105, 20, { align: 'center' });

  doc.setFontSize(16);
  doc.text(agreementData.llc_name || `${tokenSymbol} Treasury DAO LLC`, 105, 30, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('times', 'normal');
  doc.text(`A ${agreementData.jurisdiction || 'Wyoming'} Limited Liability Company`, 105, 38, { align: 'center' });

  // Add all sections with proper formatting
  let yPosition = 50;

  // Article I: Formation
  yPosition = addArticle(doc, 'I', 'Formation and Organization', yPosition);
  yPosition = addParagraph(doc,
    `This Operating Agreement of ${agreementData.llc_name} is effective as of ${formatDate(agreementData.generated_at)}.`,
    yPosition
  );

  // Article II: Members
  yPosition = addArticle(doc, 'II', 'Members and Governance', yPosition + 10);
  yPosition = addSection(doc, '2.1', 'Members', yPosition);
  yPosition = addParagraph(doc,
    `The Company has ${agreementData.total_members} member(s) as of this Agreement.`,
    yPosition
  );

  // ... Continue for all sections ...

  // Save PDF
  const filename = `${tokenSymbol}-Operating-Agreement-${Date.now()}.pdf`;
  doc.save(filename);
};

function addArticle(doc, article, title, yPos) {
  doc.setFontSize(14);
  doc.setFont('times', 'bold');
  doc.text(`Article ${article}: ${title}`, 20, yPos);
  return yPos + 8;
}

function addSection(doc, section, title, yPos) {
  doc.setFontSize(12);
  doc.setFont('times', 'bold');
  doc.text(`Section ${section}: ${title}`, 25, yPos);
  return yPos + 6;
}

function addParagraph(doc, text, yPos, indent = 25) {
  doc.setFontSize(11);
  doc.setFont('times', 'normal');
  const lines = doc.splitTextToSize(text, 170);
  doc.text(lines, indent, yPos);
  return yPos + (lines.length * 5) + 3;
}

function formatDate(timestamp) {
  return new Date(Number(timestamp) / 1_000_000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
```

#### NEW: `daopad_frontend/src/utils/agreementFormatter.js`
```javascript
// PSEUDOCODE
/**
 * Generate Markdown version of operating agreement
 */
export const generateMarkdown = (agreementData, tokenSymbol) => {
  const date = formatDate(agreementData.generated_at);

  let md = `# OPERATING AGREEMENT\n\n`;
  md += `## ${agreementData.llc_name || `${tokenSymbol} Treasury DAO LLC`}\n\n`;
  md += `*A ${agreementData.jurisdiction || 'Wyoming'} Limited Liability Company*\n\n`;
  md += `Generated: ${date}\n\n`;
  md += `---\n\n`;

  // Article I
  md += `## Article I: Formation and Organization\n\n`;
  md += `This Operating Agreement (the "Agreement") of ${agreementData.llc_name} `;
  md += `(the "Company") is entered into and shall be effective as of ${date}.\n\n`;
  md += `The Company is organized as a Limited Liability Company pursuant to the laws of ${agreementData.jurisdiction}.\n\n`;
  md += `**Orbit Station ID:** \`${agreementData.station_id}\`\n\n`;

  // Article II
  md += `## Article II: Members and Governance\n\n`;
  md += `### Section 2.1: Members\n\n`;
  md += `The Company has **${agreementData.total_members} member(s)** as of the date of this Agreement.\n\n`;

  md += `### Section 2.2: Administrative Control\n\n`;
  md += `The Company is governed by the following administrator(s):\n\n`;
  agreementData.admins.forEach(admin => {
    md += `- **${admin.name}**\n`;
    admin.identities.forEach(identity => {
      md += `  - Principal: \`${identity}\`\n`;
    });
  });
  md += `\n`;

  if (agreementData.is_truly_decentralized) {
    md += `✅ **True Decentralization:** The sole administrator is the DAOPad governance backend.\n\n`;
  } else {
    md += `⚠️ **Warning:** Multiple administrators exist. Security Score: ${agreementData.security_score}/100\n\n`;
  }

  // Article III
  md += `## Article III: Voting Rights and Governance Procedures\n\n`;
  md += `### Section 3.1: Voting Power\n\n`;
  md += `Voting Power = USD Value × 100\n\n`;

  md += `### Section 3.2: Operation Approval Thresholds\n\n`;
  [90, 75, 70, 60, 50, 40, 30].forEach(threshold => {
    const ops = agreementData.voting_thresholds.filter(vt => vt.threshold_percentage === threshold);
    if (ops.length > 0) {
      md += `#### ${threshold}% Approval Required:\n\n`;
      ops.forEach(op => {
        md += `- **${op.operation}** — ${op.voting_duration_hours}h voting period\n`;
        md += `  - *${op.rationale}*\n`;
      });
      md += `\n`;
    }
  });

  // Article IV
  md += `## Article IV: Request Policies and Approval Rules\n\n`;
  agreementData.request_policies.forEach(policy => {
    md += `### ${policy.operation} (${policy.risk_level} Risk)\n\n`;
    md += `${policy.description}\n\n`;
    md += `**Rule:** \`${policy.approval_rule}\`\n\n`;
  });

  // Article V
  md += `## Article V: Treasury and Asset Management\n\n`;
  md += `The Company maintains ${agreementData.accounts.length} treasury account(s):\n\n`;
  agreementData.accounts.forEach(account => {
    md += `- **${account.name}** (${account.asset_types.length} asset types)\n`;
  });
  md += `\n`;

  // Article VI
  if (agreementData.external_canisters && agreementData.external_canisters.length > 0) {
    md += `## Article VI: External Canister Management\n\n`;
    agreementData.external_canisters.forEach(canister => {
      md += `- **${canister.name}** (\`${canister.canister_id}\`)\n`;
    });
    md += `\n`;
  }

  // Article VII
  md += `## Article VII: Security Posture and Compliance\n\n`;
  md += `**Security Score:** ${agreementData.security_score}/100 (${agreementData.security_status})\n\n`;
  md += `**Decentralization:** ${agreementData.is_truly_decentralized ? 'Fully Decentralized DAO' : 'Partially Centralized'}\n\n`;

  if (agreementData.critical_issues && agreementData.critical_issues.length > 0) {
    md += `### Critical Issues:\n\n`;
    agreementData.critical_issues.forEach(issue => {
      md += `- ${issue}\n`;
    });
    md += `\n`;
  }

  // Footer
  md += `---\n\n`;
  md += `*Generated by DAOPad v${agreementData.daopad_version} | ${date}*\n\n`;
  md += `*Station ID: ${agreementData.station_id}*\n`;

  return md;
};

function formatDate(timestamp) {
  return new Date(Number(timestamp) / 1_000_000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
```

#### MODIFY: `daopad_frontend/src/components/TokenDashboard.jsx`
```javascript
// PSEUDOCODE

// Add import at top
import OperatingAgreementTab from './operating-agreement/OperatingAgreementTab';

// Change TabsList from grid-cols-6 to grid-cols-7 (line ~448)
<TabsList variant="executive" className="flex-1 grid grid-cols-7">
  <TabsTrigger variant="executive" value="accounts">Treasury</TabsTrigger>
  <TabsTrigger variant="executive" value="activity">Activity</TabsTrigger>
  <TabsTrigger variant="executive" value="canisters">Canisters</TabsTrigger>
  <TabsTrigger variant="executive" value="security">Security</TabsTrigger>
  <TabsTrigger variant="executive" value="permissions">Permissions</TabsTrigger>
  <TabsTrigger variant="executive" value="agreement">Agreement</TabsTrigger>  {/* NEW */}
  <TabsTrigger variant="executive" value="settings">Settings</TabsTrigger>
</TabsList>

// Add new TabsContent after permissions tab (after line ~523)
<TabsContent value="agreement" className="mt-4">
  {activeTab === 'agreement' && (
    <OperatingAgreementTab
      tokenId={token.canister_id}
      stationId={orbitStation.station_id}
      tokenSymbol={token.symbol}
      identity={identity}
    />
  )}
</TabsContent>
```

## Testing Requirements

### Backend Testing
```bash
# 1. Build Rust backend
cd /home/theseus/alexandria/daopad-operating-agreement/src/daopad
cargo build --target wasm32-unknown-unknown --release -p daopad_backend

# 2. Extract Candid interface
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# 3. Verify new method exists
grep "get_operating_agreement_data" daopad_backend/daopad_backend.did

# 4. Deploy backend
./deploy.sh --network ic --backend-only

# 5. Test with dfx
dfx canister --network ic call daopad_backend get_operating_agreement_data '(principal "YOUR_TOKEN_ID")'

# 6. Verify response contains:
# - generated_at timestamp
# - station_id
# - users with groups
# - voting_thresholds (all 33 operations)
# - request_policies
# - security_score
```

### Frontend Testing
```bash
# 1. Sync declarations
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# 2. Verify method in declarations
grep "get_operating_agreement_data" daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js

# 3. Build frontend
cd daopad_frontend
npm run build

# 4. Deploy frontend
cd ..
./deploy.sh --network ic --frontend-only

# 5. Manual UI testing:
# - Navigate to token dashboard
# - Click "Agreement" tab
# - Verify all sections render:
#   * Article I: Formation
#   * Article II: Members (with admin list)
#   * Article III: Voting thresholds (all 33 operations)
#   * Article IV: Request policies
#   * Article V: Treasury accounts
#   * Article VI: External canisters (if any)
#   * Article VII: Security status
# - Test Markdown export (downloads .md file)
# - Test PDF export (downloads .pdf file)
# - Verify security warnings if multiple admins
# - Check formatting is legal-document style
```

### Integration Testing
```bash
# Test with real Orbit Station
export TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"  # ALEX test station
export TEST_TOKEN="YOUR_TOKEN_ID"

# Call backend
dfx canister --network ic call daopad_backend get_operating_agreement_data "(principal \"$TEST_TOKEN\")"

# Verify data matches Orbit:
dfx canister --network ic call $TEST_STATION list_users '(record { search_term = null; statuses = null; groups = null; paginate = null })'

# Compare user counts, admin identities, etc.
```

## Success Criteria

1. **Backend endpoint works**:
   - ✅ `get_operating_agreement_data()` returns complete data
   - ✅ All 33 operation thresholds included
   - ✅ Users, groups, admins properly formatted
   - ✅ Request policies translated to human-readable descriptions
   - ✅ Security score calculated

2. **Frontend renders correctly**:
   - ✅ New "Agreement" tab visible
   - ✅ Legal document formatting (serif font, formal structure)
   - ✅ All 7 articles display with proper sections
   - ✅ Admin identities listed with principal IDs
   - ✅ Voting thresholds grouped by percentage
   - ✅ Security warnings if not decentralized

3. **Export functionality**:
   - ✅ Markdown export downloads valid .md file
   - ✅ PDF export generates proper legal document
   - ✅ Both formats include all articles
   - ✅ Timestamp and station ID in footer

4. **Data accuracy**:
   - ✅ Matches live Orbit Station state
   - ✅ Admin list matches Security tab
   - ✅ Request policies match Permissions tab
   - ✅ Security score matches Security tab

5. **Legal compliance**:
   - ✅ Professional legal document formatting
   - ✅ All governance rules explicitly stated
   - ✅ Voting thresholds with rationales
   - ✅ On-chain verification details (station ID, timestamp)
   - ✅ Suitable for filing with state authorities

## Implementation Checklist

- [ ] Backend: Create `operating_agreement.rs` with aggregation logic
- [ ] Backend: Implement all helper functions (users, groups, policies, etc.)
- [ ] Backend: Add endpoint to `lib.rs`
- [ ] Backend: Build and extract Candid
- [ ] Backend: Deploy and test with dfx
- [ ] Frontend: Create `OperatingAgreementTab.jsx`
- [ ] Frontend: Create `AgreementDocument.jsx` with legal formatting
- [ ] Frontend: Create `AgreementSection.jsx` component
- [ ] Frontend: Create `OrbitAgreementService.js`
- [ ] Frontend: Implement `pdfGenerator.js`
- [ ] Frontend: Implement `agreementFormatter.js` for Markdown
- [ ] Frontend: Modify `TokenDashboard.jsx` to add 7th tab
- [ ] Frontend: Sync declarations from backend
- [ ] Frontend: Build and deploy
- [ ] Test: Backend endpoint returns complete data
- [ ] Test: Frontend renders all 7 articles
- [ ] Test: Markdown export works
- [ ] Test: PDF export works
- [ ] Test: Data matches Orbit Station state
- [ ] Test: Security warnings display correctly
- [ ] Test: Works with different DAO configurations

## Critical Reminders

- **Test with real Orbit Station**: Use `fec7w-zyaaa-aaaaa-qaffq-cai` for validation
- **Sync declarations**: After backend deploy, MUST sync to frontend
- **Legal accuracy**: Document must reflect actual on-chain governance
- **All 33 operations**: Every operation type must have a threshold listed
- **Professional formatting**: Legal document style, not casual UI
- **Export quality**: PDF must be suitable for LLC filing

## Notes

- This is a NEW FEATURE (not refactoring) - purely additive
- No changes to existing Security, Permissions, or Treasury tabs
- Operating Agreement is read-only (no editing in UI)
- Generated from live on-chain state every time
- Suitable for Wyoming LLC operating agreement requirements
- Can be customized (LLC name, jurisdiction) but defaults to sensible values
