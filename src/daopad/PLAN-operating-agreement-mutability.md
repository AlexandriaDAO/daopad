# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-operating-agreement-mutability/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-operating-agreement-mutability/src/daopad`
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
   git commit -m "[Feature]: Operating Agreement Mutability Conditions"
   git push -u origin feature/operating-agreement-mutability
   gh pr create --title "[Feature]: Operating Agreement Mutability Conditions" --body "Implements PLAN-operating-agreement-mutability.md"
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

**Branch:** `feature/operating-agreement-mutability`
**Worktree:** `/home/theseus/alexandria/daopad-operating-agreement-mutability/src/daopad`

---

# Implementation Plan: Operating Agreement Mutability Conditions

## Current State Documentation

### Existing Files
- `daopad_frontend/src/components/operating-agreement/AgreementDocument.tsx` (885 lines)
  - Renders the Operating Agreement as a legal document
  - Article III (lines 340-372): Shows voting thresholds table
  - Uses `OPERATION_THRESHOLDS` constant for data

- `daopad_frontend/src/constants/operationThresholds.ts` (66 lines)
  - Hardcoded array of 35 operations with thresholds
  - Maps to backend `OrbitRequestType` enum
  - Missing mutability conditions

- `daopad_backend/src/proposals/types.rs` (200+ lines)
  - `OrbitRequestType` enum with 35 operations
  - `voting_threshold()` method returns risk-based percentages
  - `voting_duration_hours()` method for deliberation periods

### Research Findings (from ORBIT_STATION_MODIFICATIONS.md)
The Explore agent discovered 35 total ways to modify Orbit Station:
1. **Treasury Management** (6 operations)
2. **Address Book** (3 operations)
3. **User & Group Management** (5 operations)
4. **Governance & Permissions** (7 operations)
5. **External Canister Management** (9 operations)
6. **System Management** (4 operations)

Each operation modifies specific aspects of the Operating Agreement:
- Treasury operations change balance, accounts, assets
- User operations change membership and roles
- Policy operations change voting rules
- Permission operations change who can do what
- System operations change core configuration

## Implementation Requirements

### Goal
Transform Article III from "Voting Thresholds by Operation Type" to "Conditions for Amending Operating Agreement", showing:
1. What each operation changes in the agreement
2. Required voting thresholds
3. Who can propose changes
4. How changes take effect
5. Examples of what each operation modifies

### New Section Structure
```
ARTICLE III: CONDITIONS FOR AMENDING OPERATING AGREEMENT

3.1 Amendment Authority
- All amendments require community voting
- Only token holders with voting power can propose
- Backend executes approved amendments autonomously

3.2 Amendment Categories and Requirements
[For each of 35 operations, show:]
- What it modifies in the agreement
- Required approval threshold
- Voting duration
- Example use cases
- Affected articles/sections

3.3 Amendment Process
- Proposal creation
- Voting period
- Execution mechanism
- Effective date

3.4 Immutable Provisions
- Core DAO structure
- Smart contract control
- Decentralized governance requirement
```

## Implementation Plan (PSEUDOCODE)

### Step 1: Enhance operationThresholds.ts with Mutability Data
**File:** `daopad_frontend/src/constants/operationThresholds.ts` (MODIFY)
```typescript
// PSEUDOCODE
export interface OperationThreshold {
  name: string;
  threshold: number;
  risk: string;
  duration: number;
  // NEW FIELDS:
  category: 'Treasury' | 'Governance' | 'System' | 'Users' | 'Assets' | 'External' | 'Address Book';
  modifies: string[];  // What sections of agreement it changes
  proposerRequirement: string;  // Who can propose this change
  effectiveWhen: string;  // When changes take effect
  examples: string[];  // Real-world use cases
}

export const OPERATION_THRESHOLDS: OperationThreshold[] = [
  {
    name: 'System Upgrade',
    threshold: 90,
    risk: 'CRITICAL',
    duration: 72,
    category: 'System',
    modifies: [
      'Article VII: Technical Infrastructure',
      'Article IX: Disaster Recovery',
      'Core canister code'
    ],
    proposerRequirement: 'Any member with 100+ voting power',
    effectiveWhen: 'Immediately upon execution',
    examples: [
      'Upgrading to new Orbit Station version',
      'Patching critical security vulnerabilities',
      'Adding new system capabilities'
    ]
  },
  // ... repeat for all 35 operations
];

// NEW HELPER FUNCTIONS
export function getOperationsByCategory(category: string): OperationThreshold[] {
  return OPERATION_THRESHOLDS.filter(op => op.category === category);
}

export function getAffectedArticles(operation: string): string[] {
  const op = OPERATION_THRESHOLDS.find(o => o.name === operation);
  return op?.modifies || [];
}
```

### Step 2: Create MutabilitySection Component
**File:** `daopad_frontend/src/components/operating-agreement/MutabilitySection.tsx` (NEW)
```javascript
// PSEUDOCODE
import { OPERATION_THRESHOLDS, getOperationsByCategory } from '../../constants/operationThresholds';

export const MutabilitySection = ({ data, tokenSymbol }) => {
  const categories = [
    { name: 'Treasury', description: 'Modify treasury accounts, assets, and transfers' },
    { name: 'Governance', description: 'Change voting rules, permissions, and policies' },
    { name: 'System', description: 'Upgrade system, manage disaster recovery' },
    { name: 'Users', description: 'Add/remove members, change roles' },
    { name: 'Assets', description: 'Configure supported assets' },
    { name: 'External', description: 'Manage external canister integrations' },
    { name: 'Address Book', description: 'Update trusted addresses' }
  ];

  return (
    <section>
      <h2>ARTICLE III: CONDITIONS FOR AMENDING OPERATING AGREEMENT</h2>

      {/* 3.1 Amendment Authority */}
      <div>
        <h3>3.1 Amendment Authority</h3>
        <p>This Operating Agreement is a living document that reflects the on-chain state of the {tokenSymbol} Treasury DAO. Amendments are executed through smart contracts according to the following principles:</p>
        <ul>
          <li>All amendments require community approval through weighted voting</li>
          <li>Voting power is determined by locked LP token value</li>
          <li>The DAOPad backend serves as the sole executor of approved amendments</li>
          <li>No individual can unilaterally modify agreement terms</li>
        </ul>
      </div>

      {/* 3.2 Amendment Categories and Requirements */}
      <div>
        <h3>3.2 Amendment Categories and Requirements</h3>
        <p>The following operations can modify this agreement, each with specific approval requirements:</p>

        {categories.map(category => (
          <div key={category.name}>
            <h4>{category.name} Operations</h4>
            <p>{category.description}</p>
            <table>
              <thead>
                <tr>
                  <th>Operation</th>
                  <th>Modifies</th>
                  <th>Threshold</th>
                  <th>Duration</th>
                  <th>Examples</th>
                </tr>
              </thead>
              <tbody>
                {getOperationsByCategory(category.name).map(op => (
                  <tr key={op.name}>
                    <td>{op.name}</td>
                    <td>
                      <ul>
                        {op.modifies.map(m => <li>{m}</li>)}
                      </ul>
                    </td>
                    <td>{op.threshold}%</td>
                    <td>{op.duration}h</td>
                    <td>
                      <ul>
                        {op.examples.map(e => <li>{e}</li>)}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* 3.3 Amendment Process */}
      <div>
        <h3>3.3 Amendment Process</h3>
        <ol>
          <li><strong>Proposal Creation:</strong> Any token holder with sufficient voting power creates an on-chain proposal</li>
          <li><strong>Voting Period:</strong> Community members vote during the designated period (24-72 hours)</li>
          <li><strong>Threshold Check:</strong> Proposal passes if yes votes exceed the required threshold</li>
          <li><strong>Automatic Execution:</strong> DAOPad backend executes the amendment in Orbit Station</li>
          <li><strong>Agreement Update:</strong> This document automatically reflects the new on-chain state</li>
        </ol>
      </div>

      {/* 3.4 Immutable Provisions */}
      <div>
        <h3>3.4 Immutable Provisions</h3>
        <p>The following core principles cannot be amended without deploying new smart contracts:</p>
        <ul>
          <li>Decentralized governance through voting (cannot become centralized)</li>
          <li>Smart contract execution of decisions (cannot revert to manual processes)</li>
          <li>Voting power based on locked liquidity (cannot change to arbitrary allocation)</li>
          <li>Transparency of all operations on-chain (cannot hide transactions)</li>
          <li>Wyoming DAO LLC legal structure (requires new entity formation to change)</li>
        </ul>
      </div>
    </section>
  );
};
```

### Step 3: Update AgreementDocument.tsx to Use New Section
**File:** `daopad_frontend/src/components/operating-agreement/AgreementDocument.tsx` (MODIFY)
```javascript
// PSEUDOCODE
import { MutabilitySection } from './MutabilitySection';

const AgreementDocument = ({ data, tokenSymbol, stationId }) => {
  // ... existing code ...

  return (
    <div className="prose prose-lg max-w-none font-serif">
      {/* ... existing sections ... */}

      {/* REPLACE Article III with new MutabilitySection */}
      <MutabilitySection data={data} tokenSymbol={tokenSymbol} />

      {/* Renumber subsequent articles */}
      {/* Article IV becomes Article V, etc. */}

      {/* ... rest of document ... */}
    </div>
  );
};
```

### Step 4: Add Backend Support for Mutability Metadata
**File:** `daopad_backend/src/api/legal.rs` (NEW)
```rust
// PSEUDOCODE
use crate::proposals::types::OrbitRequestType;

#[derive(CandidType, Deserialize)]
pub struct OperationMutabilityInfo {
    pub operation: String,
    pub category: String,
    pub modifies: Vec<String>,
    pub proposer_requirement: String,
    pub effective_when: String,
    pub examples: Vec<String>,
    pub threshold: u8,
    pub duration_hours: u64,
}

#[query]
pub fn get_operation_mutability_info() -> Vec<OperationMutabilityInfo> {
    // Return detailed mutability information for all operations
    vec![
        OperationMutabilityInfo {
            operation: "SystemUpgrade".to_string(),
            category: "System".to_string(),
            modifies: vec![
                "Article VII: Technical Infrastructure".to_string(),
                "Core canister code".to_string(),
            ],
            proposer_requirement: "Any member with 100+ voting power".to_string(),
            effective_when: "Immediately upon execution".to_string(),
            examples: vec![
                "Upgrading Orbit Station version".to_string(),
                "Patching vulnerabilities".to_string(),
            ],
            threshold: OrbitRequestType::SystemUpgrade.voting_threshold(),
            duration_hours: OrbitRequestType::SystemUpgrade.voting_duration_hours(),
        },
        // ... repeat for all 35 operations
    ]
}
```

### Step 5: Add Export Support for New Section
**File:** `daopad_frontend/src/utils/agreementExport.ts` (MODIFY)
```typescript
// PSEUDOCODE
// Update PDF/Word export to include the new mutability section
// Ensure proper formatting for legal document export

export const exportAgreement = (data, format) => {
  // ... existing code ...

  // Add new section to export
  if (format === 'pdf') {
    doc.addSection({
      title: 'ARTICLE III: CONDITIONS FOR AMENDING OPERATING AGREEMENT',
      content: generateMutabilityContent(data)
    });
  }

  // ... rest of export logic ...
};
```

## Testing Requirements

1. **Frontend Testing**:
   ```bash
   # Build and verify no TypeScript errors
   npm run build

   # Test locally if possible
   npm run dev
   ```

2. **Backend Testing**:
   ```bash
   # Build and generate candid
   cargo build --target wasm32-unknown-unknown --release -p daopad_backend
   candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

   # Deploy to IC
   ./deploy.sh --network ic --backend-only

   # Test new endpoint
   dfx canister --network ic call daopad_backend get_operation_mutability_info
   ```

3. **Integration Testing**:
   ```bash
   # Deploy frontend
   ./deploy.sh --network ic --frontend-only

   # Visit the Operating Agreement tab and verify:
   # - New Article III renders correctly
   # - All 35 operations are documented
   # - Categories group operations logically
   # - Export still works
   ```

## Validation Checklist

- [ ] All 35 Orbit operations documented with mutability conditions
- [ ] Each operation shows what it modifies in the agreement
- [ ] Voting thresholds match backend OrbitRequestType enum
- [ ] Amendment process clearly explained
- [ ] Immutable provisions identified
- [ ] Export functionality preserved
- [ ] No TypeScript/Rust compilation errors
- [ ] Responsive design maintained

## Risk Mitigation

1. **Data Accuracy**: Cross-reference with ORBIT_STATION_MODIFICATIONS.md
2. **Legal Compliance**: Ensure Wyoming DAO LLC requirements preserved
3. **User Experience**: Progressive disclosure - summary table with expandable details
4. **Performance**: Lazy load detailed descriptions if needed
5. **Backwards Compatibility**: Don't break existing proposal system

## Success Criteria

1. Operating Agreement clearly shows HOW it can be modified
2. All 35 operations documented with real-world examples
3. Users understand the governance process for changes
4. Legal document remains valid for Wyoming DAO LLC
5. Export produces professional, complete document

## Files to Modify/Create

1. **MODIFY**: `daopad_frontend/src/constants/operationThresholds.ts` - Add mutability metadata
2. **CREATE**: `daopad_frontend/src/components/operating-agreement/MutabilitySection.tsx` - New component
3. **MODIFY**: `daopad_frontend/src/components/operating-agreement/AgreementDocument.tsx` - Use new section
4. **CREATE**: `daopad_backend/src/api/legal.rs` - Backend support for mutability info
5. **MODIFY**: `daopad_frontend/src/utils/agreementExport.ts` - Update export logic

## Estimated Implementation Time

- Research and data compilation: ✅ DONE (via Explore agent)
- Frontend implementation: 2-3 hours
- Backend implementation: 1 hour
- Testing and refinement: 1 hour
- **Total**: 4-5 hours

## Notes for Implementer

1. The ORBIT_STATION_MODIFICATIONS.md file has complete technical details
2. Use DAOPAD_GOVERNANCE_MAPPING.md for threshold verification
3. Reference orbit-reference/core/station/api/spec.did for accuracy
4. Keep legal language clear but comprehensive
5. Test export functionality thoroughly - it must produce valid legal docs

This plan provides a complete redesign of Article III to show all conditions under which the Operating Agreement can change, transforming it from a static threshold table to a comprehensive guide on agreement mutability.