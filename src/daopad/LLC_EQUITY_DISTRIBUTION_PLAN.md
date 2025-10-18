# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-equity-distribution/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-equity-distribution/src/daopad`
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
   git commit -m "[Feature]: Add equity distribution section to LLC Operating Agreement"
   git push -u origin feature/llc-equity-distribution
   gh pr create --title "[Feature]: LLC Equity Distribution Section" --body "Implements LLC_EQUITY_DISTRIBUTION_PLAN.md - Adds equity distribution section to Operating Agreement based on Kong Locker voting power"
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

**Branch:** `feature/llc-equity-distribution`
**Worktree:** `/home/theseus/alexandria/daopad-equity-distribution/src/daopad`

---

# Implementation Plan: LLC Equity Distribution Section

## Task Classification
**NEW FEATURE** - Adding equity distribution section to LLC Operating Agreement based on Kong Locker voting power data.

## Current State

### File Tree (Relevant Files)
```
daopad_backend/src/
├── api/
│   ├── governance_config.rs          # Has get_total_voting_power_for_token()
│   └── kong_locker.rs                # Has get_my_voting_power_for_token()
├── kong_locker/
│   ├── voting.rs                     # Has calculate_voting_power_for_token()
│   └── registration.rs               # User→Kong Locker mapping
└── lib.rs                            # Main export

daopad_frontend/src/
├── components/operating-agreement/
│   ├── AgreementDocument.tsx         # Main agreement document (MODIFY)
│   └── OperatingAgreementTab.tsx     # Tab wrapper
├── services/backend/
│   └── OrbitAgreementService.ts      # Data fetcher (MODIFY)
└── utils/
    └── agreementExport.ts            # Markdown export (MODIFY)
```

### Existing Implementations

#### Backend: `governance_config.rs:180-208`
```rust
// Exists: Get total voting power for all users
#[update]
pub async fn get_total_voting_power_for_token(
    token_canister_id: Principal
) -> Result<u64, String>
```

#### Backend: `kong_locker.rs:56-64`
```rust
// Exists: Get individual user's voting power
#[update]
pub async fn get_my_voting_power_for_token(
    token_canister_id: Principal
) -> Result<u64, String>
```

#### Backend: `kong_locker.rs:25-32`
```rust
// Exists: List all user→locker registrations
#[query]
pub fn list_all_kong_locker_registrations() -> Vec<(Principal, Principal)>
```

#### Frontend: `AgreementDocument.tsx:88-502`
Current sections:
- Article I: Formation
- Article II: Members and Governance (lines 150-304)
- Article III: Voting Thresholds (lines 306-340)
- Article IV: Request Policies (lines 342-375)
- Article V: Treasury Management (lines 377-398)
- Article VI: External Canisters (lines 400-425)
- Article VII: Amendments (lines 427-465)
- Article VIII: Dissolution (lines 467-484)

**MISSING**: Equity distribution section

### Dependencies and Constraints

1. **Kong Locker Integration**: Voting power = USD value of locked LP tokens × 100
2. **Calculation**: Must query KongSwap for each registered Kong Locker canister
3. **Performance**: Cross-canister calls in update methods (acceptable - not optimizing for speed)
4. **Data Freshness**: No caching - fresh data on every request
5. **Wyoming DAO LLC Compliance**: Document must reflect on-chain equity percentages

---

## Implementation Plan

### 1. Backend: New API Method

**File**: `daopad_backend/src/api/governance_config.rs` (MODIFY)

**Location**: Add after `get_total_voting_power_for_token()` function (after line 208)

```rust
// PSEUDOCODE
use candid::{CandidType, Deserialize};

#[derive(CandidType, Deserialize, Clone)]
pub struct VotingPowerEntry {
    pub user_principal: Principal,
    pub kong_locker_principal: Principal,
    pub voting_power: u64,
    pub equity_percentage: f64,  // Percentage of total (0-100)
}

#[derive(CandidType, Deserialize, Clone)]
pub struct AllVotingPowersResponse {
    pub entries: Vec<VotingPowerEntry>,
    pub total_voting_power: u64,
    pub total_holders: u32,
}

/// Get all voting powers for a token with equity percentages
///
/// Returns list of all Kong Locker holders with their voting power and equity percentage.
/// Only includes users with voting_power > 0.
#[update]
pub async fn get_all_voting_powers_for_token(
    token_canister_id: Principal
) -> Result<AllVotingPowersResponse, String> {
    use crate::kong_locker::voting::calculate_voting_power_for_token;
    use crate::storage::state::KONG_LOCKER_PRINCIPALS;

    // 1. Get all registered Kong Locker principals
    let all_registrations = KONG_LOCKER_PRINCIPALS.with(|principals| {
        principals
            .borrow()
            .iter()
            .map(|(user, locker)| (user.0, locker.0))
            .collect::<Vec<(Principal, Principal)>>()
    });

    // 2. Calculate voting power for each user
    let mut entries: Vec<VotingPowerEntry> = Vec::new();
    let mut total_power = 0u64;

    for (user_principal, kong_locker_principal) in all_registrations {
        // Get voting power for this specific token
        match calculate_voting_power_for_token(kong_locker_principal, token_canister_id).await {
            Ok(power) => {
                if power > 0 {
                    entries.push(VotingPowerEntry {
                        user_principal,
                        kong_locker_principal,
                        voting_power: power,
                        equity_percentage: 0.0, // Will calculate after total is known
                    });
                    total_power += power;
                }
            }
            Err(_) => continue, // Skip users with errors (e.g., no LP positions)
        }
    }

    // 3. Calculate equity percentages
    if total_power > 0 {
        for entry in entries.iter_mut() {
            entry.equity_percentage = (entry.voting_power as f64 / total_power as f64) * 100.0;
        }
    }

    // 4. Sort by voting power (highest first)
    entries.sort_by(|a, b| b.voting_power.cmp(&a.voting_power));

    Ok(AllVotingPowersResponse {
        total_holders: entries.len() as u32,
        total_voting_power: total_power,
        entries,
    })
}
```

**File**: `daopad_backend/src/lib.rs` (MODIFY)

**Location**: Add to exports in the `api` module section

```rust
// PSEUDOCODE
// In the governance_config module exports, add:
pub use governance_config::{
    // ... existing exports ...
    get_all_voting_powers_for_token,
    VotingPowerEntry,
    AllVotingPowersResponse,
};
```

---

### 2. Frontend: Update Agreement Service

**File**: `daopad_frontend/src/services/backend/OrbitAgreementService.ts` (MODIFY)

**Location**: In `getAgreementData()` method, add after canisters query (after line 50)

```javascript
// PSEUDOCODE

async getAgreementData(tokenId, stationId) {
  try {
    const actor = await this.getActor();

    // ... existing code for security, policies, users, canisters ...

    // 5. Get voting power distribution (NEW)
    let votingPowerResult = null;
    try {
      votingPowerResult = await actor.get_all_voting_powers_for_token(
        Principal.fromText(tokenId)
      );
    } catch (e) {
      console.log('Voting power data not available:', e.message);
    }

    // Extract and format data
    const data = {
      security: null,
      policies: null,
      users: [],
      canisters: null,
      votingPowers: null,  // NEW
      timestamp: Date.now()
    };

    // ... existing processing code ...

    // Process voting power data (NEW)
    if (votingPowerResult && votingPowerResult.Ok) {
      data.votingPowers = {
        entries: votingPowerResult.Ok.entries.map(entry => ({
          user_principal: entry.user_principal.toString(),
          kong_locker_principal: entry.kong_locker_principal.toString(),
          voting_power: Number(entry.voting_power),
          equity_percentage: entry.equity_percentage
        })),
        total_voting_power: Number(votingPowerResult.Ok.total_voting_power),
        total_holders: votingPowerResult.Ok.total_holders
      };
    }

    return {
      success: true,
      data: data
    };
  } catch (error) {
    // ... error handling ...
  }
}
```

---

### 3. Frontend: Add Equity Distribution Section to Agreement

**File**: `daopad_frontend/src/components/operating-agreement/AgreementDocument.tsx` (MODIFY)

**Location**: Add new Article after Treasury Management (Article V), before External Canisters (Article VI)

Insert at line 398 (after Article V closing tag, before Article VI):

```jsx
// PSEUDOCODE

// Helper: Format principal for display (reuse existing one)
const formatPrincipal = (principal) => {
  if (!principal) return 'Unknown';
  const str = principal.toString();
  if (str.length <= 20) return str;
  return `${str.slice(0, 10)}...${str.slice(-7)}`;
};

// Helper: Find user name from principal
const getUserNameFromPrincipal = (userPrincipal) => {
  const user = data.users?.find(u =>
    u.identities?.[0]?.toString() === userPrincipal
  );
  return user?.name || 'Unregistered Member';
};

// NEW ARTICLE: Equity Distribution
{data.votingPowers && data.votingPowers.total_holders > 0 && (
  <section className="mb-8">
    <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
      ARTICLE VI: EQUITY DISTRIBUTION
    </h2>
    <div className="mt-4 space-y-3">
      <p>
        <strong>6.1 Equity Basis.</strong> Member equity is determined by voting
        power derived from permanently locked liquidity pool (LP) tokens in Kong Locker
        canisters. Voting power equals the total USD value of locked LP tokens
        containing the {tokenSymbol} token, multiplied by 100.
      </p>

      <p>
        <strong>6.2 Current Equity Distribution.</strong> As of {formatDate()},
        the Company has {data.votingPowers.total_holders} equity holder
        {data.votingPowers.total_holders !== 1 ? 's' : ''} with total voting
        power of {data.votingPowers.total_voting_power.toLocaleString()}.
      </p>

      <div className="mt-4">
        <p className="font-semibold mb-3">Member Equity Breakdown:</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-400">
              <th className="text-left p-2">Member</th>
              <th className="text-left p-2">Principal</th>
              <th className="text-right p-2">Voting Power</th>
              <th className="text-right p-2">Equity %</th>
            </tr>
          </thead>
          <tbody>
            {data.votingPowers.entries.map((entry, i) => (
              <tr key={i} className="border-b border-gray-200">
                <td className="p-2">{getUserNameFromPrincipal(entry.user_principal)}</td>
                <td className="p-2">
                  <code className="text-xs bg-gray-100 px-1 rounded">
                    {formatPrincipal(entry.user_principal)}
                  </code>
                </td>
                <td className="text-right p-2 font-mono">
                  {entry.voting_power.toLocaleString()}
                </td>
                <td className="text-right p-2 font-bold">
                  {entry.equity_percentage.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-400 font-bold">
              <td className="p-2" colSpan={2}>TOTAL</td>
              <td className="text-right p-2 font-mono">
                {data.votingPowers.total_voting_power.toLocaleString()}
              </td>
              <td className="text-right p-2">100.00%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-4">
        <strong>6.3 Dynamic Equity.</strong> Equity percentages automatically
        adjust based on changes in locked LP token values and the addition or
        removal of liquidity by members. All equity calculations are performed
        on-chain and are verifiable at any time.
      </p>

      <p>
        <strong>6.4 Verification.</strong> Equity percentages can be independently
        verified by querying:
      </p>
      <ul className="list-disc pl-8 mt-2 space-y-1">
        <li>Kong Locker Factory: <code className="bg-gray-100 px-1 rounded text-sm">eazgb-giaaa-aaaap-qqc2q-cai</code></li>
        <li>KongSwap for LP positions: <code className="bg-gray-100 px-1 rounded text-sm">2ipq2-uqaaa-aaaar-qailq-cai</code></li>
        <li>DAOPad Backend for equity distribution: <code className="bg-gray-100 px-1 rounded text-sm">lwsav-iiaaa-aaaap-qp2qq-cai</code></li>
      </ul>
    </div>
  </section>
)}

// Update numbering for subsequent articles:
// - External Canisters: Article VI → Article VII
// - Amendments: Article VII → Article VIII
// - Dissolution: Article VIII → Article IX

{/* Article VII: External Canister Management */}
{data.canisters && data.canisters.total > 0 && (
  <section className="mb-8">
    <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
      ARTICLE VII: EXTERNAL CANISTER MANAGEMENT
    </h2>
    {/* ... existing canister content, update 6.1 to 7.1 ... */}
  </section>
)}

{/* Article VIII: Amendments and Dispute Resolution */}
<section className="mb-8">
  <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
    ARTICLE VIII: AMENDMENTS AND DISPUTE RESOLUTION
  </h2>
  {/* ... existing amendments content, update 7.1-7.3 to 8.1-8.3 ... */}
</section>

{/* Article IX: Dissolution */}
<section className="mb-8">
  <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
    ARTICLE IX: DISSOLUTION
  </h2>
  {/* ... existing dissolution content, update 8.1-8.2 to 9.1-9.2 ... */}
</section>
```

---

### 4. Frontend: Update Markdown Export

**File**: `daopad_frontend/src/utils/agreementExport.ts` (MODIFY)

**Location**: Add equity section to markdown generation

```javascript
// PSEUDOCODE

export const generateMarkdown = (data, tokenSymbol, stationId) => {
  const formatDate = () => new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  let markdown = `# LIMITED LIABILITY COMPANY OPERATING AGREEMENT\n\n`;
  markdown += `## ${tokenSymbol} Treasury DAO LLC\n\n`;
  markdown += `Effective Date: ${formatDate()}\n`;
  markdown += `On-Chain Reference: Station ${stationId}\n\n`;

  // ... existing sections (Formation, Members, Voting Thresholds, Policies, Treasury) ...

  // NEW: Equity Distribution Section
  if (data.votingPowers && data.votingPowers.total_holders > 0) {
    markdown += `## ARTICLE VI: EQUITY DISTRIBUTION\n\n`;
    markdown += `### 6.1 Equity Basis\n\n`;
    markdown += `Member equity is determined by voting power derived from permanently locked liquidity pool (LP) tokens in Kong Locker canisters. Voting power equals the total USD value of locked LP tokens containing the ${tokenSymbol} token, multiplied by 100.\n\n`;

    markdown += `### 6.2 Current Equity Distribution\n\n`;
    markdown += `As of ${formatDate()}, the Company has ${data.votingPowers.total_holders} equity holder${data.votingPowers.total_holders !== 1 ? 's' : ''} with total voting power of ${data.votingPowers.total_voting_power.toLocaleString()}.\n\n`;

    markdown += `#### Member Equity Breakdown:\n\n`;
    markdown += `| Member | Principal | Voting Power | Equity % |\n`;
    markdown += `|--------|-----------|--------------|----------|\n`;

    data.votingPowers.entries.forEach(entry => {
      const userName = getUserNameFromPrincipal(entry.user_principal, data.users);
      markdown += `| ${userName} | \`${entry.user_principal}\` | ${entry.voting_power.toLocaleString()} | ${entry.equity_percentage.toFixed(2)}% |\n`;
    });

    markdown += `| **TOTAL** | - | **${data.votingPowers.total_voting_power.toLocaleString()}** | **100.00%** |\n\n`;

    markdown += `### 6.3 Dynamic Equity\n\n`;
    markdown += `Equity percentages automatically adjust based on changes in locked LP token values and the addition or removal of liquidity by members. All equity calculations are performed on-chain and are verifiable at any time.\n\n`;

    markdown += `### 6.4 Verification\n\n`;
    markdown += `Equity percentages can be independently verified by querying:\n\n`;
    markdown += `- Kong Locker Factory: \`eazgb-giaaa-aaaap-qqc2q-cai\`\n`;
    markdown += `- KongSwap for LP positions: \`2ipq2-uqaaa-aaaar-qailq-cai\`\n`;
    markdown += `- DAOPad Backend for equity distribution: \`lwsav-iiaaa-aaaap-qp2qq-cai\`\n\n`;
  }

  // Update subsequent article numbers (VI→VII, VII→VIII, VIII→IX)
  // ... existing sections with updated numbering ...

  return markdown;
};

// Helper function
const getUserNameFromPrincipal = (userPrincipal, users) => {
  const user = users?.find(u =>
    u.identities?.[0]?.toString() === userPrincipal
  );
  return user?.name || 'Unregistered Member';
};
```

---

## Testing Strategy

### 1. Backend Testing
```bash
# Switch to worktree
cd /home/theseus/alexandria/daopad-equity-distribution/src/daopad

# Build backend
cargo build --target wasm32-unknown-unknown --release -p daopad_backend

# Extract candid
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Verify new method in candid
grep "get_all_voting_powers_for_token" daopad_backend/daopad_backend.did

# Deploy backend
./deploy.sh --network ic --backend-only

# Test the API (replace TOKEN_ID with actual token canister)
dfx canister --network ic call daopad_backend get_all_voting_powers_for_token '(principal "TOKEN_ID")'

# Expected output: AllVotingPowersResponse with entries, total_voting_power, total_holders
```

### 2. Declaration Sync (CRITICAL)
```bash
# MUST sync declarations before frontend deploy
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# Verify sync worked
grep "get_all_voting_powers_for_token" daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js
```

### 3. Frontend Testing
```bash
# Build frontend
npm run build

# Deploy frontend
./deploy.sh --network ic --frontend-only

# Manual testing:
# 1. Navigate to token dashboard
# 2. Click "Operating Agreement" tab
# 3. Verify "ARTICLE VI: EQUITY DISTRIBUTION" appears
# 4. Verify equity table shows correct percentages (sum = 100%)
# 5. Test markdown export includes equity section
# 6. Verify subsequent articles renumbered correctly (VII, VIII, IX)
```

### 4. Edge Cases
- **No voting power holders**: Section should not render
- **Single holder**: Shows 100% equity
- **Zero total power**: Should handle gracefully (no division by zero)
- **Unregistered users**: Shows "Unregistered Member" name
- **Error fetching VP data**: Falls back gracefully, shows rest of agreement

### 5. Wyoming DAO LLC Compliance
- Equity percentages must sum to 100%
- Must be verifiable on-chain
- Must update dynamically based on locked liquidity
- Must include verification instructions

---

## Post-Deployment Verification

1. **Check canister IDs match**:
   - Backend: `lwsav-iiaaa-aaaap-qp2qq-cai`
   - Frontend: `l7rlj-6aaaa-aaaaa-qaffq-cai`

2. **Verify on-chain data**:
   ```bash
   # Get ALEX token equity distribution
   dfx canister --network ic call daopad_backend get_all_voting_powers_for_token '(principal "ALEX_TOKEN_ID")'
   ```

3. **Frontend smoke test**:
   - Visit: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
   - Navigate to ALEX token dashboard
   - Check Operating Agreement tab
   - Verify equity distribution section appears
   - Export markdown and verify equity table included

4. **Calculation verification**:
   - Manually sum equity percentages (should = 100%)
   - Cross-check with Kong Locker data
   - Verify voting power = USD value × 100

---

## Checklist

- [ ] Worktree created: `/home/theseus/alexandria/daopad-equity-distribution/src/daopad`
- [ ] Backend API added: `get_all_voting_powers_for_token()`
- [ ] Backend types added: `VotingPowerEntry`, `AllVotingPowersResponse`
- [ ] Backend exported in `lib.rs`
- [ ] Frontend service updated: `OrbitAgreementService.ts`
- [ ] Frontend document updated: `AgreementDocument.tsx`
- [ ] Article numbering updated (VI→VII, VII→VIII, VIII→IX)
- [ ] Markdown export updated: `agreementExport.ts`
- [ ] Backend built and deployed
- [ ] Candid extracted
- [ ] Declarations synced (CRITICAL)
- [ ] Frontend built and deployed
- [ ] Equity section displays correctly
- [ ] Percentages sum to 100%
- [ ] Markdown export includes equity
- [ ] PR created with descriptive title/body
- [ ] All tests pass

---

## Success Criteria

✅ **Backend**: New API returns list of equity holders with percentages
✅ **Frontend**: Operating Agreement displays Article VI with equity table
✅ **Accuracy**: Equity percentages sum to exactly 100%
✅ **Compliance**: Document meets Wyoming DAO LLC requirements
✅ **Export**: Markdown export includes equity distribution
✅ **Numbering**: All subsequent articles correctly renumbered
✅ **Verification**: On-chain verification instructions included
✅ **Edge Cases**: Gracefully handles no holders, errors, unregistered users
✅ **PR Created**: Pull request submitted with proper description

---

## Notes

- **No caching**: Fresh data on every request (acceptable per CLAUDE.md)
- **Update methods**: Cross-canister calls require `#[update]`, not `#[query]`
- **Candid sync**: Always sync declarations after backend changes
- **Wyoming compliance**: Equity distribution must be verifiable on-chain
- **Dynamic**: Equity percentages update automatically based on LP values
- **Security**: All calculations happen on-chain, no frontend manipulation
