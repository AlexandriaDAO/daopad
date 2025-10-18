# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-treasury-rules/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-treasury-rules/src/daopad`
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
   git commit -m "[Feature]: Enhanced Operating Agreement Treasury Rules"
   git push -u origin feature/treasury-rules
   gh pr create --title "[Feature]: Enhanced Operating Agreement Treasury Rules" --body "Implements TREASURY_RULES_PLAN.md"
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

**Branch:** `feature/treasury-rules`
**Worktree:** `/home/theseus/alexandria/daopad-treasury-rules/src/daopad`

---

# Implementation Plan: Treasury Management Rules for Operating Agreement

## Executive Summary

**Task Type:** NEW FEATURE
**Goal:** Enhance the LLC Operating Agreement Article V (Treasury Management) to include:
- List of treasury accounts with current balances
- Transfer restrictions and approval requirements
- Address book entries (authorized recipients for recurring payments)
- Who can initiate vs approve transfers
- Clear explanation of governance over treasury operations

**Current State:** Article V is a generic placeholder with only voting thresholds.
**Target State:** Comprehensive, legally-binding treasury rules derived from Orbit Station on-chain data.

---

## Current State Documentation

### File Structure
```
daopad_frontend/src/
├── components/
│   └── operating-agreement/
│       ├── OperatingAgreementTab.tsx      # Main tab component
│       └── AgreementDocument.tsx          # Document renderer (MODIFY)
├── services/
│   └── backend/
│       └── OrbitAgreementService.ts       # Data fetcher (MODIFY)
└── utils/
    └── agreementExport.ts                 # Markdown export (MODIFY)

daopad_backend/src/
└── api/
    ├── orbit.rs                           # Core Orbit APIs (USE EXISTING)
    ├── orbit_accounts.rs                  # Account queries (USE EXISTING)
    └── orbit_transfers.rs                 # Transfer queries (USE EXISTING)
```

### Existing Backend Methods (Already Available)
```rust
// In orbit.rs
list_orbit_accounts(token_id: Principal) -> Result<Vec<Account>, String>
fetch_orbit_account_balances(station_id: Principal, account_ids: Vec<String>) -> Result<Vec<AccountBalance>, String>

// In orbit_transfers.rs
get_account_assets(token_id: Principal, account_id: String) -> Result<AccountAssetInfo, String>
```

### Existing Orbit Data Available (Via dfx Testing)
From `list_accounts` API:
```candid
{
  accounts: Vec<{
    id: String,
    name: String,
    assets: Vec<{
      asset_id: String,
      balance: Option<{
        balance: Nat,
        decimals: u32
      }>
    }>,
    transfer_request_policy: Option<{
      AutoApproved | Quorum | QuorumPercentage | NamedRule
    }>,
    configs_request_policy: Option<...>,
    addresses: Vec<{
      address: String,
      format: String  // "icrc1_account" | "icp_account_identifier"
    }>
  }>,
  privileges: Vec<{
    id: String,
    can_transfer: bool,
    can_edit: bool
  }>
}
```

From `list_address_book_entries` API:
```candid
{
  address_book_entries: Vec<{
    id: String,
    address_owner: String,
    address: String,
    blockchain: String,
    metadata: Vec<{key: String, value: String}>
  }>
}
```

### Current Article V (Lines 377-398 of AgreementDocument.tsx)
```jsx
<section className="mb-8">
  <h2>ARTICLE V: TREASURY MANAGEMENT</h2>
  <p>
    <strong>5.1 Treasury Control.</strong> All treasury operations
    require {75}% approval from voting members.
  </p>
  <p>
    <strong>5.2 Asset Management.</strong> The Company may hold and
    manage multiple digital assets as approved by member vote.
  </p>
  <p>
    <strong>5.3 Transfer Authority.</strong> Fund transfers require
    a {48} hour voting period to ensure adequate deliberation.
  </p>
</section>
```

**Problem:** No specific accounts, balances, or permission details.

---

## Implementation Plan (Pseudocode)

### Part 1: Backend - Add Treasury Data Endpoint

**File:** `daopad_backend/src/api/orbit.rs` (ADD NEW METHOD)

```rust
// PSEUDOCODE
#[derive(CandidType, Deserialize, Serialize)]
pub struct TreasuryAccountDetails {
    pub account_id: String,
    pub account_name: String,
    pub assets: Vec<AssetBalanceInfo>,  // Reuse from orbit_transfers.rs
    pub transfer_policy: String,  // "AutoApproved", "75% Quorum", "Admin only", etc.
    pub config_policy: String,
    pub can_transfer: bool,  // Backend's permission
    pub can_edit: bool,
    pub addresses: Vec<AccountAddress>,
}

#[derive(CandidType, Deserialize, Serialize)]
pub struct AccountAddress {
    pub address: String,
    pub format: String,  // "ICRC-1" or "ICP Account ID"
}

#[derive(CandidType, Deserialize, Serialize)]
pub struct AddressBookEntry {
    pub id: String,
    pub name: String,  // From metadata if present
    pub address: String,
    pub blockchain: String,
    pub purpose: Option<String>,  // From metadata "purpose" key
}

#[derive(CandidType, Deserialize, Serialize)]
pub struct TreasuryManagementData {
    pub accounts: Vec<TreasuryAccountDetails>,
    pub address_book: Vec<AddressBookEntry>,
    pub backend_privileges_summary: String,  // "Can transfer from X accounts, edit Y accounts"
}

#[update]
pub async fn get_treasury_management_data(
    token_id: Principal
) -> Result<TreasuryManagementData, String> {
    // 1. Get station for token
    let station_id = get_orbit_station_for_token(token_id)
        .ok_or("No Orbit Station found")?;

    // 2. List all accounts
    let accounts_result: Result<(ListAccountsResult,), _> = ic_cdk::call(
        station_id,
        "list_accounts",
        (ListAccountsInput { search_term: None, paginate: None },)
    ).await;

    let accounts_data = match accounts_result {
        Ok((ListAccountsResult::Ok { accounts, privileges, .. },)) => {
            // 3. For each account, enrich with asset details
            let mut treasury_accounts = Vec::new();

            for account in accounts {
                // 3a. Parse transfer policy
                let transfer_policy = format_policy(&account.transfer_request_policy);
                let config_policy = format_policy(&account.configs_request_policy);

                // 3b. Get backend privileges for this account
                let priv = privileges.iter().find(|p| p.id == account.id);
                let can_transfer = priv.map_or(false, |p| p.can_transfer);
                let can_edit = priv.map_or(false, |p| p.can_edit);

                // 3c. Get asset balances (already formatted)
                let assets = match get_account_assets_internal(station_id, account.id.clone()).await {
                    Ok(asset_info) => asset_info.assets,
                    Err(_) => vec![]
                };

                // 3d. Format addresses for display
                let addresses = account.addresses.iter().map(|a| {
                    AccountAddress {
                        address: a.address.clone(),
                        format: match a.format.as_str() {
                            "icrc1_account" => "ICRC-1".to_string(),
                            "icp_account_identifier" => "ICP Account ID".to_string(),
                            other => other.to_string()
                        }
                    }
                }).collect();

                treasury_accounts.push(TreasuryAccountDetails {
                    account_id: account.id,
                    account_name: account.name,
                    assets,
                    transfer_policy,
                    config_policy,
                    can_transfer,
                    can_edit,
                    addresses,
                });
            }

            treasury_accounts
        }
        _ => return Err("Failed to list accounts".to_string())
    };

    // 4. Get address book entries
    let address_book_result: Result<(ListAddressBookResult,), _> = ic_cdk::call(
        station_id,
        "list_address_book_entries",
        (ListAddressBookInput { ids: None, addresses: None, paginate: None },)
    ).await;

    let address_book = match address_book_result {
        Ok((ListAddressBookResult::Ok { address_book_entries, .. },)) => {
            address_book_entries.iter().map(|entry| {
                // Extract name from metadata if present
                let name = entry.metadata.iter()
                    .find(|m| m.key == "name")
                    .map(|m| m.value.clone())
                    .unwrap_or_else(|| entry.address_owner.clone());

                let purpose = entry.metadata.iter()
                    .find(|m| m.key == "purpose")
                    .map(|m| m.value.clone());

                AddressBookEntry {
                    id: entry.id.clone(),
                    name,
                    address: entry.address.clone(),
                    blockchain: entry.blockchain.clone(),
                    purpose,
                }
            }).collect()
        }
        _ => vec![]
    };

    // 5. Generate summary of backend's privileges
    let transfer_count = accounts_data.iter().filter(|a| a.can_transfer).count();
    let edit_count = accounts_data.iter().filter(|a| a.can_edit).count();
    let backend_summary = format!(
        "DAOPad backend can initiate transfers from {} account(s) and edit {} account(s)",
        transfer_count, edit_count
    );

    Ok(TreasuryManagementData {
        accounts: accounts_data,
        address_book,
        backend_privileges_summary: backend_summary,
    })
}

// HELPER: Format policy for human reading
fn format_policy(policy: &Option<RequestPolicyRule>) -> String {
    match policy {
        None => "No policy configured".to_string(),
        Some(RequestPolicyRule::AutoApproved) => "Auto-Approved".to_string(),
        Some(RequestPolicyRule::Quorum { min_approved, .. }) => {
            format!("Requires {} approver(s)", min_approved)
        }
        Some(RequestPolicyRule::QuorumPercentage { min_approved, .. }) => {
            format!("Requires {}% approval", min_approved)
        }
        Some(RequestPolicyRule::NamedRule { id, .. }) => {
            format!("Named rule: {}", id)
        }
    }
}

// HELPER: Internal version of get_account_assets (no #[update] decorator)
async fn get_account_assets_internal(
    station_id: Principal,
    account_id: String
) -> Result<AccountAssetInfo, String> {
    // Copy implementation from orbit_transfers.rs get_account_assets
    // but use station_id directly instead of looking it up
    // ... (implementation details)
}
```

**Types to Add:** (In `daopad_backend/src/types/orbit.rs`)
```rust
// PSEUDOCODE
#[derive(CandidType, Deserialize)]
pub struct ListAddressBookInput {
    pub ids: Option<Vec<String>>,
    pub addresses: Option<Vec<String>>,
    pub paginate: Option<PaginateInput>,
}

#[derive(CandidType, Deserialize)]
pub enum ListAddressBookResult {
    Ok {
        address_book_entries: Vec<AddressBookEntry>,
        next_offset: Option<u64>,
        total: u64,
        privileges: Vec<AddressBookPrivilege>,
    },
    Err(Error),
}

#[derive(CandidType, Deserialize)]
pub struct AddressBookEntry {
    pub id: String,
    pub address_owner: String,
    pub address: String,
    pub blockchain: String,
    pub metadata: Vec<Metadata>,
}

#[derive(CandidType, Deserialize)]
pub struct AddressBookPrivilege {
    pub id: String,
    pub can_edit: bool,
}

#[derive(CandidType, Deserialize)]
pub struct AccountPrivilege {
    pub id: String,
    pub can_transfer: bool,
    pub can_edit: bool,
}
```

### Part 2: Frontend Service - Fetch Treasury Data

**File:** `daopad_frontend/src/services/backend/OrbitAgreementService.ts` (MODIFY)

```javascript
// PSEUDOCODE
export class OrbitAgreementService extends BackendServiceBase {
  async getAgreementData(tokenId, stationId) {
    try {
      const actor = await this.getActor();

      // ... existing calls for security, policies, users, canisters, votingPowers ...

      // NEW: Get treasury management data
      let treasuryResult = null;
      try {
        treasuryResult = await actor.get_treasury_management_data(
          Principal.fromText(tokenId)
        );
      } catch (e) {
        console.log('Treasury data not available:', e.message);
      }

      // Extract and format data
      const data = {
        security: null,
        policies: null,
        users: [],
        canisters: null,
        votingPowers: null,
        treasury: null,  // NEW
        timestamp: Date.now()
      };

      // ... existing processing for security, policies, users, etc. ...

      // Process treasury data (NEW)
      if (treasuryResult && treasuryResult.Ok) {
        data.treasury = {
          accounts: treasuryResult.Ok.accounts.map(acc => ({
            account_id: acc.account_id,
            account_name: acc.account_name,
            assets: acc.assets.map(asset => ({
              symbol: asset.symbol,
              decimals: asset.decimals,
              balance: asset.balance,
              balance_formatted: asset.balance_formatted
            })),
            transfer_policy: acc.transfer_policy,
            config_policy: acc.config_policy,
            can_transfer: acc.can_transfer,
            can_edit: acc.can_edit,
            addresses: acc.addresses
          })),
          address_book: treasuryResult.Ok.address_book.map(entry => ({
            id: entry.id,
            name: entry.name,
            address: entry.address,
            blockchain: entry.blockchain,
            purpose: entry.purpose ? entry.purpose[0] : null  // Unwrap Option
          })),
          backend_privileges_summary: treasuryResult.Ok.backend_privileges_summary
        };
      }

      return { success: true, data: data };
    } catch (error) {
      console.error('Failed to fetch agreement data:', error);
      return { success: false, error: error.message };
    }
  }
}
```

### Part 3: Frontend Document - Render Treasury Rules

**File:** `daopad_frontend/src/components/operating-agreement/AgreementDocument.tsx` (MODIFY)

Replace Article V (lines 377-398) with:

```jsx
// PSEUDOCODE
{/* Article V: Treasury Management */}
<section className="mb-8">
  <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
    ARTICLE V: TREASURY MANAGEMENT
  </h2>
  <div className="mt-4 space-y-3">
    <p>
      <strong>5.1 Treasury Control.</strong> All treasury operations
      require approval thresholds defined in Article III based on operation risk.
      Transfer operations require {OPERATION_THRESHOLDS.find(o => o.name === 'Transfer')?.threshold || 75}%
      voting power approval to execute.
    </p>

    {/* 5.2 Treasury Accounts */}
    {data.treasury && data.treasury.accounts.length > 0 && (
      <div className="mt-6">
        <p>
          <strong>5.2 Treasury Accounts.</strong> The Company maintains the following
          treasury accounts on the Internet Computer blockchain:
        </p>

        <div className="pl-4 mt-3 space-y-4">
          {data.treasury.accounts.map((account, i) => (
            <div key={account.account_id} className="border-l-4 border-blue-400 pl-4 py-2 bg-gray-50">
              <h4 className="font-bold text-lg">{account.account_name}</h4>

              {/* Account ID */}
              <div className="text-xs text-gray-500 font-mono mb-2">
                ID: {account.account_id}
              </div>

              {/* Assets and Balances */}
              {account.assets.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-semibold">Holdings:</p>
                  <ul className="list-disc pl-6 text-sm">
                    {account.assets.map((asset, j) => (
                      <li key={j}>
                        {asset.balance_formatted} {asset.symbol}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Transfer Policy */}
              <div className="mt-2">
                <p className="text-sm">
                  <span className="font-semibold">Transfer Approval:</span> {account.transfer_policy}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Configuration Changes:</span> {account.config_policy}
                </p>
              </div>

              {/* Addresses */}
              {account.addresses.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-semibold">Account Addresses:</p>
                  <ul className="list-none pl-2 text-xs font-mono">
                    {account.addresses.map((addr, k) => (
                      <li key={k} className="break-all">
                        {addr.format}: <code className="bg-white px-1">{addr.address}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )}

    {/* 5.3 Transfer Authorization */}
    <div className="mt-6">
      <p>
        <strong>5.3 Transfer Initiation and Approval.</strong>
      </p>
      <ul className="list-disc pl-8 mt-2 space-y-1">
        <li>
          <strong>Who Can Propose Transfers:</strong> {data.treasury?.backend_privileges_summary ||
          "Only authorized members with sufficient voting power can propose transfers"}
        </li>
        <li>
          <strong>Approval Process:</strong> All transfers require DAOPad community voting
          reaching the {OPERATION_THRESHOLDS.find(o => o.name === 'Transfer')?.threshold || 75}%
          threshold of total voting power. Voting period lasts {
            OPERATION_THRESHOLDS.find(o => o.name === 'Transfer')?.duration || 48
          } hours to ensure adequate deliberation.
        </li>
        <li>
          <strong>Execution:</strong> Once the voting threshold is reached, the DAOPad backend
          submits the approved request to Orbit Station for execution. The Orbit Station
          executes the transfer according to the account's configured policy.
        </li>
      </ul>
    </div>

    {/* 5.4 Authorized Recipients (Address Book) */}
    {data.treasury && data.treasury.address_book.length > 0 && (
      <div className="mt-6">
        <p>
          <strong>5.4 Authorized Payment Recipients.</strong> The Company maintains
          an address book of {data.treasury.address_book.length} authorized recipient(s)
          for recurring or pre-approved payments:
        </p>

        <table className="w-full border-collapse mt-3">
          <thead>
            <tr className="border-b-2 border-gray-400">
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Address</th>
              <th className="text-left p-2">Blockchain</th>
              <th className="text-left p-2">Purpose</th>
            </tr>
          </thead>
          <tbody>
            {data.treasury.address_book.map((entry, i) => (
              <tr key={entry.id} className="border-b border-gray-200">
                <td className="p-2">{entry.name}</td>
                <td className="p-2">
                  <code className="text-xs bg-gray-100 px-1 rounded break-all">
                    {entry.address.length > 30
                      ? `${entry.address.slice(0, 15)}...${entry.address.slice(-12)}`
                      : entry.address
                    }
                  </code>
                </td>
                <td className="p-2">{entry.blockchain}</td>
                <td className="p-2">{entry.purpose || 'General'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-sm text-gray-600 mt-2 italic">
          Note: Adding or modifying authorized recipients requires {
            OPERATION_THRESHOLDS.find(o => o.name === 'Add Address Book Entry')?.threshold || 30
          }% voting approval.
        </p>
      </div>
    )}

    {/* 5.5 Asset Management */}
    <p className="mt-4">
      <strong>5.5 Asset Management.</strong> The Company may hold and manage multiple
      digital assets across its treasury accounts as approved by member vote. Adding
      new assets or accounts requires {
        OPERATION_THRESHOLDS.find(o => o.name === 'Add Account')?.threshold || 40
      }% voting approval. Editing existing accounts requires the configured approval
      policy for that specific account.
    </p>

    {/* 5.6 Recurring Payments (Placeholder) */}
    <p className="mt-4">
      <strong>5.6 Recurring Payments.</strong> While the Company's Orbit Station
      supports scheduled and recurring transfers, no automated payment schedules are
      currently configured. Any future recurring payments (e.g., team salaries,
      service subscriptions) must be approved through the standard governance process
      before being configured in the treasury system.
    </p>
  </div>
</section>
```

### Part 4: Markdown Export - Update Treasury Section

**File:** `daopad_frontend/src/utils/agreementExport.ts` (MODIFY)

Replace Article V markdown generation (lines 77-83) with:

```javascript
// PSEUDOCODE
## ARTICLE V: TREASURY MANAGEMENT

**5.1 Treasury Control.** All treasury operations require approval thresholds defined in Article III based on operation risk. Transfer operations require ${OPERATION_THRESHOLDS.find(o => o.name === 'Transfer')?.threshold || 75}% voting power approval to execute.

${data.treasury && data.treasury.accounts.length > 0 ? `
**5.2 Treasury Accounts.** The Company maintains the following treasury accounts on the Internet Computer blockchain:

${data.treasury.accounts.map(acc => `
### ${acc.account_name}

- **Account ID**: \`${acc.account_id}\`
${acc.assets.length > 0 ? `- **Holdings**:
${acc.assets.map(asset => `  - ${asset.balance_formatted} ${asset.symbol}`).join('\n')}` : ''}
- **Transfer Approval**: ${acc.transfer_policy}
- **Configuration Changes**: ${acc.config_policy}
${acc.addresses.length > 0 ? `- **Account Addresses**:
${acc.addresses.map(addr => `  - ${addr.format}: \`${addr.address}\``).join('\n')}` : ''}
`).join('\n')}
` : ''}

**5.3 Transfer Initiation and Approval.**

- **Who Can Propose Transfers**: ${data.treasury?.backend_privileges_summary || "Only authorized members with sufficient voting power can propose transfers"}
- **Approval Process**: All transfers require DAOPad community voting reaching the ${OPERATION_THRESHOLDS.find(o => o.name === 'Transfer')?.threshold || 75}% threshold of total voting power. Voting period lasts ${OPERATION_THRESHOLDS.find(o => o.name === 'Transfer')?.duration || 48} hours.
- **Execution**: Once the voting threshold is reached, the DAOPad backend submits the approved request to Orbit Station for execution.

${data.treasury && data.treasury.address_book.length > 0 ? `
**5.4 Authorized Payment Recipients.** The Company maintains an address book of ${data.treasury.address_book.length} authorized recipient(s):

| Name | Address | Blockchain | Purpose |
|------|---------|------------|---------|
${data.treasury.address_book.map(entry =>
  `| ${entry.name} | \`${entry.address}\` | ${entry.blockchain} | ${entry.purpose || 'General'} |`
).join('\n')}

*Note: Adding or modifying authorized recipients requires ${OPERATION_THRESHOLDS.find(o => o.name === 'Add Address Book Entry')?.threshold || 30}% voting approval.*
` : ''}

**5.5 Asset Management.** The Company may hold and manage multiple digital assets across its treasury accounts as approved by member vote. Adding new assets or accounts requires ${OPERATION_THRESHOLDS.find(o => o.name === 'Add Account')?.threshold || 40}% voting approval.

**5.6 Recurring Payments.** While the Company's Orbit Station supports scheduled and recurring transfers, no automated payment schedules are currently configured. Any future recurring payments must be approved through the standard governance process.
```

---

## Testing Strategy

### Manual Testing Checklist

**Backend Testing:**
```bash
# 1. Build backend
cd /home/theseus/alexandria/daopad-treasury-rules/src/daopad
cargo build --target wasm32-unknown-unknown --release -p daopad_backend

# 2. Extract candid
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# 3. Verify new method in candid
grep "get_treasury_management_data" daopad_backend/daopad_backend.did

# 4. Deploy backend only
./deploy.sh --network ic --backend-only

# 5. Test with dfx (use ALEX token: bkyz2-fmaaa-aaaaa-qaaaq-cai)
dfx canister --network ic call daopad_backend get_treasury_management_data '(principal "bkyz2-fmaaa-aaaaa-qaaaq-cai")'

# Expected: Should return accounts array, address_book array, and summary string
```

**Frontend Testing:**
```bash
# 1. Sync declarations
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# 2. Verify method exists in declarations
grep "get_treasury_management_data" daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js

# 3. Build frontend
cd daopad_frontend
npm run build

# 4. Deploy frontend
cd ..
./deploy.sh --network ic --frontend-only

# 5. Manual UI test
# - Navigate to https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
# - Go to token with Orbit Station (ALEX or LBRY)
# - Click "Operating Agreement" tab
# - Verify Article V shows:
#   * Treasury account names
#   * Asset balances
#   * Transfer policies
#   * Address book entries (if any)
#   * No console errors
```

**Validation Criteria:**
- [ ] Backend compiles without errors
- [ ] Candid includes new method
- [ ] dfx test returns valid data structure
- [ ] Frontend declarations synced
- [ ] Operating Agreement UI renders Article V with real data
- [ ] Markdown export includes treasury details
- [ ] No "is not a function" errors in console
- [ ] All account balances display with correct decimals

---

## Dependencies and Constraints

### Technical Constraints
1. **Query vs Update**: Treasury queries must use `#[update]` (cross-canister calls not allowed in `#[query]`)
2. **Declaration Sync**: Must manually copy declarations after backend changes
3. **Minimal Storage**: Following DAOPad's minimal storage principle - all data queried on-demand
4. **Orbit Admin**: Backend must be admin/operator in Orbit Station to query protected data

### External Dependencies
- Orbit Station API (already integrated)
- Kong Locker for voting power (already integrated)
- OPERATION_THRESHOLDS constant (already exists)

### Breaking Changes
- None - purely additive feature
- Existing Article V content is being enhanced, not removed
- Backward compatible with stations that have no accounts/address book

---

## Success Criteria

1. **Legally Binding Document**: Article V provides enough detail for legal compliance
2. **On-Chain Truth**: All treasury data pulled from Orbit Station, not hardcoded
3. **User Clarity**: Users can clearly see:
   - What accounts exist
   - How much money is in each
   - Who can do what (transfer/edit permissions)
   - What approval is required
   - Where money can be sent (address book)
4. **No Manual Updates**: Document auto-updates when treasury changes on-chain
5. **Export Quality**: Markdown export preserves all treasury details

---

## Deployment Instructions

Following DAOPad's deployment workflow:

```bash
# 1. Ensure in worktree
cd /home/theseus/alexandria/daopad-treasury-rules/src/daopad

# 2. Backend changes
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
./deploy.sh --network ic --backend-only

# 3. CRITICAL: Sync declarations
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# 4. Frontend changes
cd daopad_frontend
npm run build
cd ..
./deploy.sh --network ic --frontend-only

# 5. Verify deployment
dfx canister --network ic call daopad_backend get_treasury_management_data '(principal "bkyz2-fmaaa-aaaaa-qaaaq-cai")'
```

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Address book reveals sensitive info | Address book is already public in Orbit Station; operating agreement should reflect on-chain reality |
| Balances change during document view | Add timestamp notice; users can refresh to get latest |
| Backend not admin of station | Check privileges first; gracefully handle empty treasury data |
| Large account lists slow rendering | Paginate if >20 accounts; add loading states |
| Malformed Orbit responses | Wrap all calls in try-catch; show partial data if some calls fail |

---

## Future Enhancements (Out of Scope)

1. **Recurring Payment Detection**: Parse Orbit request history to show scheduled transfers
2. **Historical Balance Charts**: Show treasury growth over time
3. **Multi-Signature Tracking**: Display which admins have approved pending transfers
4. **Compliance Export**: Generate IRS/tax-ready balance reports
5. **Real-Time Updates**: WebSocket or polling for live balance changes

These would require additional Orbit API exploration and are deferred to future PRs.

---

## Appendix: Type Definitions Reference

### Backend Types (Add to `daopad_backend/src/types/orbit.rs`)

See Part 1 pseudocode for complete type definitions:
- `TreasuryAccountDetails`
- `AccountAddress`
- `AddressBookEntry`
- `TreasuryManagementData`
- `ListAddressBookInput`
- `ListAddressBookResult`
- `AccountPrivilege`

### Frontend Types (Inferred from Candid)

TypeScript will auto-generate these from candid-extractor output. Manual types not required.

---

## Plan Checklist

- [x] Worktree created first
- [x] Orchestrator header EMBEDDED at top of plan
- [x] Current state documented with file paths and line numbers
- [x] Implementation in pseudocode (backend + frontend)
- [x] Testing strategy defined with specific commands
- [x] Deployment instructions with critical sync step
- [ ] Plan committed to feature branch (NEXT STEP)
- [ ] Handoff command provided

---

**End of Plan**

The implementing agent will:
1. Read this plan (orchestrator at top forces isolation check)
2. Implement backend method `get_treasury_management_data`
3. Modify frontend service to fetch treasury data
4. Enhance AgreementDocument.tsx Article V
5. Update agreementExport.ts markdown generation
6. Test, deploy, sync declarations
7. Create PR automatically
8. Iterate on feedback until approved

No questions. Just execution.
