# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-asset-management/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-asset-management/src/daopad`
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
   git commit -m "feat: Add asset management and multi-asset treasury support"
   git push -u origin feature/asset-management
   gh pr create --title "Feature: Asset Management and Multi-Asset Treasury Support" --body "Implements PLAN-asset-management.md"
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

**Branch:** `feature/asset-management`
**Worktree:** `/home/theseus/alexandria/daopad-asset-management/src/daopad`

---

# Implementation Plan: Asset Management & Multi-Asset Treasury Support

## Problem Statement

Currently, the transfer UI hardcodes "ALEX" as the asset name even when treasuries hold ICP or other tokens. Users cannot:
1. Add or remove supported assets from treasuries
2. View actual asset balances when creating transfers
3. Select which asset to transfer from multi-asset accounts

**Example Issue:** "Alexandria Reserves (ALEX)" displays ICP balance, but UI shows "Amount (ALEX)"

## Current State

### File Tree (Relevant Files)
```
daopad_backend/src/
├── api/
│   ├── orbit.rs                    # Station registry
│   ├── orbit_accounts.rs           # Account queries (has Asset types)
│   ├── orbit_transfers.rs          # Transfer logic
│   └── proposals.rs                # Proposal creation
├── types/
│   └── orbit.rs                    # Orbit type definitions
└── lib.rs                          # Canister entry points

daopad_frontend/src/
├── components/orbit/
│   └── TransferRequestDialog.jsx   # Transfer UI (line 202: hardcoded asset.symbol)
├── pages/
│   └── DashboardPage.jsx           # Treasury overview
└── services/
    └── daopadBackend.js            # Backend service wrapper
```

### Existing Transfer Flow (daopad_frontend/src/components/orbit/TransferRequestDialog.jsx:54-330)
1. **TransferRequestDialog** receives:
   - `account` - Treasury account with ID and balance
   - `asset` - Asset info with `{ id, symbol, decimals }`
   - `tokenId` - DAO token Principal (not treasury asset!)

2. **Issue at line 202**: `Propose a transfer from {account.name} ({asset.symbol})`
   - `account.name` = "Alexandria Reserves"
   - `asset.symbol` = Comes from prop, but doesn't match actual treasury contents

3. **Backend call at line 159**: `backend.createTreasuryTransferProposal()`
   - Sends `from_account_id` and `from_asset_id`
   - But no asset selection UI exists!

### Orbit Station Asset Architecture (Tested with dfx)

**Assets in Test Station** (`fec7w-zyaaa-aaaaa-qaffq-cai`):
```candid
// list_assets output shows:
{
  id: "7802cbab-221d-4e49-b764-a695ea6def1a",
  symbol: "ICP",
  name: "Internet Computer",
  blockchain: "icp",
  standards: vec { "icp_native"; "icrc1" },
  decimals: 8,
  metadata: vec {
    { key: "ledger_canister_id", value: "ryjl3-tyaaa-aaaaa-aaaba-cai" },
    { key: "index_canister_id", value: "qhbym-qaaaa-aaaaa-aaafq-cai" }
  }
}
```

**Accounts with Multi-Asset Support**:
```candid
// list_accounts shows accounts can have multiple assets:
Account {
  id: "3f601869-e48e-49a1-92cb-32f55b308a18",
  name: "Alexandria Reserves",
  assets: vec {
    AccountAsset {
      asset_id: "7802cbab-221d-4e49-b764-a695ea6def1a",  // ICP
      balance: opt AccountBalance {
        balance: 670_803_848,  // 6.70803848 ICP
        decimals: 8,
        query_state: "stale"
      }
    }
    // Could have more assets here!
  }
}
```

### Orbit Asset Management Operations (from orbit-reference)

**1. AddAsset** - Add new supported asset:
```candid
type AddAssetOperationInput = record {
  blockchain : text;        // e.g., "icp", "ethereum"
  standards : vec text;     // e.g., ["icrc1"], ["erc20"]
  symbol : AssetSymbol;     // e.g., "ALEX", "ICP"
  name : text;              // e.g., "Alexandria Token"
  metadata : vec AssetMetadata;  // Ledger/index canister IDs
  decimals : nat32;         // e.g., 8
};
```

**2. EditAsset** - Modify existing asset:
```candid
type EditAssetOperationInput = record {
  asset_id : UUID;
  name : opt text;
  blockchain : opt text;
  standards : opt vec text;
  symbol : opt AssetSymbol;
  change_metadata : opt ChangeMetadata;
};

type ChangeMetadata = variant {
  ReplaceAllBy : vec AssetMetadata;
  OverrideSpecifiedBy : vec AssetMetadata;
  RemoveKeys : vec text;
};
```

**3. RemoveAsset** - Remove asset from station:
```candid
type RemoveAssetOperationInput = record {
  asset_id : UUID;
};
```

**4. List Assets** - Query all supported assets:
```candid
list_assets : (ListAssetsInput) -> (ListAssetsResult) query;
```

**5. Account Asset Queries**:
- `list_accounts` returns `Account.assets: vec AccountAsset`
- Each `AccountAsset` has `asset_id` and optional `balance`
- Frontend must join with asset list to get symbol/decimals

## Implementation Plan

### Phase 1: Backend Asset Management API

#### 1.1 Asset CRUD Operations (NEW FILE: `daopad_backend/src/api/orbit_assets.rs`)

```rust
// PSEUDOCODE
use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::update;

#[derive(CandidType, Deserialize)]
pub struct AddAssetInput {
    pub blockchain: String,
    pub standards: Vec<String>,
    pub symbol: String,
    pub name: String,
    pub metadata: Vec<AssetMetadata>,
    pub decimals: u32,
}

#[derive(CandidType, Deserialize)]
pub struct AssetMetadata {
    pub key: String,
    pub value: String,
}

#[update]
pub async fn add_treasury_asset(
    token_canister_id: Principal,
    asset_input: AddAssetInput,
) -> Result<String, String> {
    // 1. Get station ID for token
    let station_id = get_orbit_station_for_token(token_canister_id)?;

    // 2. Create Orbit AddAsset request
    let operation = RequestOperation::AddAsset(AddAssetOperationInput {
        blockchain: asset_input.blockchain,
        standards: asset_input.standards,
        symbol: asset_input.symbol,
        name: asset_input.name,
        metadata: asset_input.metadata,
        decimals: asset_input.decimals,
    });

    let result: CallResult<(CreateRequestResult,)> = ic_cdk::call(
        station_id,
        "create_request",
        (CreateRequestInput {
            operation,
            title: Some(format!("Add {} Asset", asset_input.symbol)),
            summary: Some(format!("Add support for {} ({}) token", asset_input.name, asset_input.symbol)),
            execution_plan: Some(RequestExecutionSchedule::Immediate),
        },)
    ).await;

    match result {
        Ok((CreateRequestResult::Ok(response),)) => {
            let request_id = response.request.id.clone();

            // 3. CRITICAL: Auto-create proposal for governance
            use crate::proposals::{ensure_proposal_for_request, OrbitRequestType};

            ensure_proposal_for_request(
                token_canister_id,
                request_id.clone(),
                OrbitRequestType::AddAsset,  // 40% threshold
            ).await?;

            Ok(request_id)
        }
        Ok((CreateRequestResult::Err(err),)) => Err(format!("Orbit error: {}", err)),
        Err(e) => Err(format!("Call failed: {:?}", e)),
    }
}

#[update]
pub async fn edit_treasury_asset(
    token_canister_id: Principal,
    asset_id: String,
    name: Option<String>,
    metadata: Option<Vec<AssetMetadata>>,
) -> Result<String, String> {
    // Similar pattern: create_request → ensure_proposal_for_request
    // Use OrbitRequestType::EditAsset (40% threshold)
}

#[update]
pub async fn remove_treasury_asset(
    token_canister_id: Principal,
    asset_id: String,
) -> Result<String, String> {
    // Similar pattern: create_request → ensure_proposal_for_request
    // Use OrbitRequestType::RemoveAsset (40% threshold)
}

#[update]
pub async fn list_treasury_assets(
    token_canister_id: Principal,
) -> Result<Vec<Asset>, String> {
    let station_id = get_orbit_station_for_token(token_canister_id)?;

    let result: CallResult<(ListAssetsResult,)> = ic_cdk::call(
        station_id,
        "list_assets",
        (ListAssetsInput { paginate: None },)
    ).await;

    match result {
        Ok((ListAssetsResult::Ok(response),)) => Ok(response.assets),
        Ok((ListAssetsResult::Err(err),)) => Err(format!("Error: {}", err)),
        Err(e) => Err(format!("Call failed: {:?}", e)),
    }
}
```

**Register in `daopad_backend/src/api/mod.rs`**:
```rust
pub mod orbit_assets;
```

**Export in `daopad_backend/src/lib.rs`**:
```rust
use api::orbit_assets::{
    add_treasury_asset, edit_treasury_asset,
    remove_treasury_asset, list_treasury_assets
};
```

#### 1.2 Enhanced Transfer with Asset Selection (MODIFY: `daopad_backend/src/api/orbit_transfers.rs`)

```rust
// PSEUDOCODE - Add to existing file

#[derive(CandidType, Deserialize)]
pub struct AccountAssetInfo {
    pub account_id: String,
    pub account_name: String,
    pub assets: Vec<AssetBalanceInfo>,
}

#[derive(CandidType, Deserialize)]
pub struct AssetBalanceInfo {
    pub asset_id: String,
    pub symbol: String,
    pub decimals: u32,
    pub balance: u64,
    pub balance_formatted: String,
}

#[update]
pub async fn get_account_assets(
    token_canister_id: Principal,
    account_id: String,
) -> Result<AccountAssetInfo, String> {
    let station_id = get_orbit_station_for_token(token_canister_id)?;

    // 1. Get account details
    let account_result: CallResult<(GetAccountResult,)> = ic_cdk::call(
        station_id,
        "get_account",
        (GetAccountInput { account_id: account_id.clone() },)
    ).await;

    let account = match account_result {
        Ok((GetAccountResult::Ok(response),)) => response.account,
        _ => return Err("Failed to get account".to_string()),
    };

    // 2. Get all assets to map IDs to symbols
    let assets_result: CallResult<(ListAssetsResult,)> = ic_cdk::call(
        station_id,
        "list_assets",
        (ListAssetsInput { paginate: None },)
    ).await;

    let all_assets = match assets_result {
        Ok((ListAssetsResult::Ok(response),)) => response.assets,
        _ => return Err("Failed to list assets".to_string()),
    };

    // 3. Create asset map
    let asset_map: HashMap<String, Asset> = all_assets
        .into_iter()
        .map(|a| (a.id.clone(), a))
        .collect();

    // 4. Build response with balances
    let mut asset_balances = Vec::new();
    for account_asset in account.assets {
        if let Some(asset_info) = asset_map.get(&account_asset.asset_id) {
            let balance_nat = account_asset.balance
                .map(|b| b.balance)
                .unwrap_or(Nat::from(0u64));

            let balance_u64 = balance_nat.0.to_u64().unwrap_or(0);
            let balance_formatted = format_balance(balance_u64, asset_info.decimals);

            asset_balances.push(AssetBalanceInfo {
                asset_id: account_asset.asset_id.clone(),
                symbol: asset_info.symbol.clone(),
                decimals: asset_info.decimals,
                balance: balance_u64,
                balance_formatted,
            });
        }
    }

    Ok(AccountAssetInfo {
        account_id: account.id,
        account_name: account.name,
        assets: asset_balances,
    })
}

fn format_balance(amount: u64, decimals: u32) -> String {
    let divisor = 10u64.pow(decimals);
    let whole = amount / divisor;
    let frac = amount % divisor;
    format!("{}.{:0width$}", whole, frac, width = decimals as usize)
}
```

### Phase 2: Frontend Asset Management UI

#### 2.1 Asset Management Dialog (NEW FILE: `daopad_frontend/src/components/orbit/AssetManagementDialog.jsx`)

```javascript
// PSEUDOCODE
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/ui/data-table';
import { Plus, Trash2, Edit } from 'lucide-react';

export function AssetManagementDialog({ open, onOpenChange, tokenId, identity }) {
  const [assets, setAssets] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (open) loadAssets();
  }, [open]);

  async function loadAssets() {
    const backend = new DAOPadBackendService(identity);
    const result = await backend.listTreasuryAssets(Principal.fromText(tokenId));
    if (result.success) setAssets(result.data);
  }

  async function handleAddAsset(formData) {
    const backend = new DAOPadBackendService(identity);
    const result = await backend.addTreasuryAsset(
      Principal.fromText(tokenId),
      {
        blockchain: formData.blockchain,
        standards: [formData.standard],
        symbol: formData.symbol,
        name: formData.name,
        decimals: parseInt(formData.decimals),
        metadata: [
          { key: "ledger_canister_id", value: formData.ledgerCanisterId },
          { key: "index_canister_id", value: formData.indexCanisterId || "" }
        ]
      }
    );

    if (result.success) {
      toast.success('Asset Add Proposal Created', {
        description: 'Community will vote on adding this asset'
      });
      setShowAddForm(false);
      loadAssets();
    }
  }

  const columns = [
    { header: 'Symbol', accessorKey: 'symbol' },
    { header: 'Name', accessorKey: 'name' },
    { header: 'Blockchain', accessorKey: 'blockchain' },
    { header: 'Standards', cell: ({ row }) => row.original.standards.join(', ') },
    { header: 'Decimals', accessorKey: 'decimals' },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleEdit(row.original)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="destructive" onClick={() => handleRemove(row.original.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage Treasury Assets</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Asset
          </Button>

          {showAddForm && (
            <AddAssetForm onSubmit={handleAddAsset} onCancel={() => setShowAddForm(false)} />
          )}

          <DataTable columns={columns} data={assets} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddAssetForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    blockchain: 'icp',
    standard: 'icrc1',
    symbol: '',
    name: '',
    decimals: '8',
    ledgerCanisterId: '',
    indexCanisterId: ''
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4 border p-4 rounded">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Blockchain</Label>
          <Input value={formData.blockchain} onChange={(e) => setFormData({...formData, blockchain: e.target.value})} />
        </div>
        <div>
          <Label>Standard</Label>
          <Input value={formData.standard} onChange={(e) => setFormData({...formData, standard: e.target.value})} />
        </div>
        <div>
          <Label>Symbol</Label>
          <Input value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value})} required />
        </div>
        <div>
          <Label>Name</Label>
          <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
        </div>
        <div>
          <Label>Decimals</Label>
          <Input type="number" value={formData.decimals} onChange={(e) => setFormData({...formData, decimals: e.target.value})} required />
        </div>
        <div>
          <Label>Ledger Canister ID</Label>
          <Input value={formData.ledgerCanisterId} onChange={(e) => setFormData({...formData, ledgerCanisterId: e.target.value})} required />
        </div>
        <div className="col-span-2">
          <Label>Index Canister ID (Optional)</Label>
          <Input value={formData.indexCanisterId} onChange={(e) => setFormData({...formData, indexCanisterId: e.target.value})} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit">Create Proposal</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
```

#### 2.2 Enhanced Transfer Dialog with Asset Selection (MODIFY: `daopad_frontend/src/components/orbit/TransferRequestDialog.jsx`)

**Changes at lines 54-70 (component props)**:
```javascript
// PSEUDOCODE - Change signature
export default function TransferRequestDialog({
  open,
  onOpenChange,
  account,      // Remove - fetch dynamically
  asset,        // Remove - select from dropdown
  tokenId,      // Keep - DAO token
  identity,
  onSuccess,
  votingPower = 0,
  initialAccountId, // NEW: Pre-select account by ID
}) {
  const [accountAssets, setAccountAssets] = useState(null);
  const [selectedAssetId, setSelectedAssetId] = useState(null);

  // Load account assets on open
  useEffect(() => {
    if (open && initialAccountId) {
      loadAccountAssets();
    }
  }, [open, initialAccountId]);

  async function loadAccountAssets() {
    const backend = new DAOPadBackendService(identity);
    const result = await backend.getAccountAssets(
      Principal.fromText(tokenId),
      initialAccountId
    );

    if (result.success) {
      setAccountAssets(result.data);
      // Auto-select first asset
      if (result.data.assets.length > 0) {
        setSelectedAssetId(result.data.assets[0].asset_id);
      }
    }
  }

  const selectedAsset = accountAssets?.assets.find(a => a.asset_id === selectedAssetId);
  const maxAmount = selectedAsset ? selectedAsset.balance_formatted : '0';
```

**Changes at lines 196-204 (dialog header)**:
```javascript
// PSEUDOCODE - Fix hardcoded asset reference
<DialogHeader>
  <DialogTitle>Create Transfer Proposal</DialogTitle>
  <DialogDescription>
    Propose a transfer from {accountAssets?.account_name || 'Treasury'}.
    {selectedAsset && ` Transfer ${selectedAsset.symbol} tokens.`}
    {' '}Community will vote on this proposal.
  </DialogDescription>
</DialogHeader>
```

**NEW: Asset selector dropdown (insert after description field, ~line 237)**:
```javascript
// PSEUDOCODE
<div>
  <Label htmlFor="asset">Asset to Transfer</Label>
  <Select value={selectedAssetId} onValueChange={setSelectedAssetId} disabled={isSubmitting}>
    <SelectTrigger id="asset">
      <SelectValue placeholder="Select asset" />
    </SelectTrigger>
    <SelectContent>
      {accountAssets?.assets.map(asset => (
        <SelectItem key={asset.asset_id} value={asset.asset_id}>
          <div className="flex justify-between items-center w-full">
            <span>{asset.symbol}</span>
            <span className="text-sm text-muted-foreground ml-4">
              Balance: {asset.balance_formatted}
            </span>
          </div>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  {accountAssets?.assets.length === 0 && (
    <Alert className="mt-2">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        No assets in this account. Add assets first via Asset Management.
      </AlertDescription>
    </Alert>
  )}
</div>
```

**Changes at lines 268-273 (amount label)**:
```javascript
// PSEUDOCODE - Use selected asset symbol
<Label htmlFor="amount">
  Amount ({selectedAsset?.symbol || 'tokens'})
  <span className="text-xs text-muted-foreground ml-2">
    Max: {maxAmount}
  </span>
</Label>
```

**Changes at lines 130-139 (build transfer details)**:
```javascript
// PSEUDOCODE - Use selected asset
const transferDetails = {
  from_account_id: accountAssets.account_id,
  from_asset_id: selectedAssetId,  // Use selected instead of prop
  to: data.to_address,
  amount: amountInSmallest,
  memo: data.memo || null,
  title: data.title,
  description: data.description
};
```

#### 2.3 Update Dashboard to Support Asset Management (MODIFY: `daopad_frontend/src/pages/DashboardPage.jsx`)

**Add Asset Management button (insert near line 150)**:
```javascript
// PSEUDOCODE
const [showAssetManagement, setShowAssetManagement] = useState(false);

// In the header section:
<div className="flex justify-between items-center">
  <h1>Dashboard</h1>
  <Button onClick={() => setShowAssetManagement(true)}>
    <Settings className="mr-2 h-4 w-4" />
    Manage Assets
  </Button>
</div>

<AssetManagementDialog
  open={showAssetManagement}
  onOpenChange={setShowAssetManagement}
  tokenId={activeStation.token_id}
  identity={identity}
/>
```

#### 2.4 Backend Service Methods (MODIFY: `daopad_frontend/src/services/daopadBackend.js`)

```javascript
// PSEUDOCODE - Add new methods

async addTreasuryAsset(tokenId, assetInput) {
  try {
    const actor = await this.getActor();
    const result = await actor.add_treasury_asset(tokenId, assetInput);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async editTreasuryAsset(tokenId, assetId, updates) {
  try {
    const actor = await this.getActor();
    const result = await actor.edit_treasury_asset(tokenId, assetId, updates);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async removeTreasuryAsset(tokenId, assetId) {
  try {
    const actor = await this.getActor();
    const result = await actor.remove_treasury_asset(tokenId, assetId);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async listTreasuryAssets(tokenId) {
  try {
    const actor = await this.getActor();
    const result = await actor.list_treasury_assets(tokenId);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async getAccountAssets(tokenId, accountId) {
  try {
    const actor = await this.getActor();
    const result = await actor.get_account_assets(tokenId, accountId);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### Phase 3: Testing Strategy

#### 3.1 Backend Testing
```bash
# Test station: fec7w-zyaaa-aaaaa-qaffq-cai
# Use daopad identity (has admin access)

# 1. List current assets
dfx canister --network ic call daopad_backend list_treasury_assets '(principal "ysy5f-2qaaa-aaaap-qkmmq-cai")'

# Expected: Returns ICP and ALEX assets

# 2. Test adding new asset (DOT example)
dfx canister --network ic call daopad_backend add_treasury_asset '(
  principal "ysy5f-2qaaa-aaaap-qkmmq-cai",
  record {
    blockchain = "polkadot";
    standards = vec { "native" };
    symbol = "DOT";
    name = "Polkadot";
    decimals = 10;
    metadata = vec {
      record { key = "ledger_canister_id"; value = "test-dot-ledger-id" }
    }
  }
)'

# Expected: Returns request_id, creates proposal

# 3. Test account asset query
dfx canister --network ic call daopad_backend get_account_assets '(
  principal "ysy5f-2qaaa-aaaap-qkmmq-cai",
  "3f601869-e48e-49a1-92cb-32f55b308a18"
)'

# Expected: Returns AccountAssetInfo with ICP balance

# 4. Verify proposal created
dfx canister --network ic call daopad_backend get_proposals '(principal "ysy5f-2qaaa-aaaap-qkmmq-cai")'

# Expected: Shows AddAsset proposal with 40% threshold
```

#### 3.2 Frontend Testing

**Test Asset Management Dialog**:
1. Navigate to Dashboard
2. Click "Manage Assets" button
3. Verify list shows ICP and ALEX
4. Click "Add Asset"
5. Fill form with test asset (use test canister IDs)
6. Submit → should create proposal
7. Verify success toast
8. Check proposals page for new AddAsset proposal

**Test Enhanced Transfer Dialog**:
1. Navigate to account with multiple assets
2. Click "Create Transfer"
3. Verify asset dropdown appears
4. Select different assets → verify max balance updates
5. Verify amount label shows correct symbol (e.g., "Amount (ICP)")
6. Create transfer → verify correct asset_id sent to backend

#### 3.3 Declaration Sync Verification
```bash
# CRITICAL: After backend deploy, sync declarations
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# Verify new methods exist in ALL 3 locations:
grep "add_treasury_asset" daopad_backend/daopad_backend.did
grep "add_treasury_asset" src/declarations/daopad_backend/daopad_backend.did.js
grep "add_treasury_asset" daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js

# All 3 must return matches!
```

#### 3.4 End-to-End Flow
1. **Add Asset**: Admin creates proposal to add DOT → Community votes (40%) → Approved → Asset available
2. **Fund Account**: Send DOT tokens to treasury account address
3. **Verify Balance**: Check account assets query shows DOT balance
4. **Create Transfer**: Select DOT from dropdown → Enter amount → Create proposal
5. **Vote & Execute**: Community votes (75% for transfer) → Executes on approval

## Success Criteria

- [ ] Backend can add/edit/remove assets via governance proposals
- [ ] Backend properly queries account assets with balances
- [ ] Frontend Asset Management dialog can CRUD assets
- [ ] Transfer dialog shows asset selector dropdown
- [ ] Transfer dialog displays correct asset symbol in labels
- [ ] Max amount updates when switching assets
- [ ] Backend receives correct `from_asset_id` in transfer proposals
- [ ] All asset operations require community voting (governance integration)
- [ ] Declarations synced across all 3 locations
- [ ] No hardcoded "ALEX" references in transfer UI

## Known Limitations

1. **No Asset Price Queries**: Current implementation shows raw balances, not USD values
2. **No Multi-Blockchain Support**: Only ICP assets tested
3. **Stale Balance Warning**: Orbit marks balances as "stale" until refresh
4. **No Asset Icons**: UI uses text symbols, no logo images

## Future Enhancements

1. **Asset Price Integration**: Query CoinGecko/ICPSwap for USD prices
2. **Multi-Account Transfers**: Select both source and destination accounts
3. **Asset Analytics**: Treasury composition pie chart, historical balances
4. **Automatic Asset Discovery**: Detect when tokens sent to treasury address
5. **Asset Metadata Management**: Upload logos, set display order

## Files Modified Summary

**Backend** (4 new methods, 1 new file):
- NEW: `daopad_backend/src/api/orbit_assets.rs` (asset CRUD)
- MODIFY: `daopad_backend/src/api/orbit_transfers.rs` (add `get_account_assets`)
- MODIFY: `daopad_backend/src/api/mod.rs` (register module)
- MODIFY: `daopad_backend/src/lib.rs` (export methods)

**Frontend** (1 new component, 2 modified):
- NEW: `daopad_frontend/src/components/orbit/AssetManagementDialog.jsx`
- MODIFY: `daopad_frontend/src/components/orbit/TransferRequestDialog.jsx` (asset selector)
- MODIFY: `daopad_frontend/src/pages/DashboardPage.jsx` (asset mgmt button)
- MODIFY: `daopad_frontend/src/services/daopadBackend.js` (5 new service methods)

**Total**: ~800 lines of new code, ~200 lines modified

## Deployment Sequence

1. **Backend First**:
   ```bash
   cargo build --target wasm32-unknown-unknown --release -p daopad_backend
   candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
   ./deploy.sh --network ic --backend-only
   ```

2. **Sync Declarations** (CRITICAL):
   ```bash
   cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
   ```

3. **Frontend Second**:
   ```bash
   npm run build
   ./deploy.sh --network ic --frontend-only
   ```

4. **Verification**:
   - Test asset list: `dfx canister --network ic call daopad_backend list_treasury_assets '(...)'`
   - Open frontend: Check console for errors
   - Navigate to Dashboard → Click "Manage Assets"
   - Create transfer → Verify asset dropdown works

---

**Implementation Notes**:
- All Orbit asset operations go through governance (proposals)
- Asset symbols are now dynamic, not hardcoded
- Frontend gracefully handles accounts with 0 assets
- Voting thresholds: AddAsset/EditAsset = 40%, RemoveAsset = 40%
- Backend is sole admin, so all calls succeed after voting passes
