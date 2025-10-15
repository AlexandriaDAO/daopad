# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-fix-transfer-decode/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-fix-transfer-decode/src/daopad`
2. **Implement fixes** - Follow plan sections below
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
   git commit -m "fix: Transfer proposal decode error and asset selection with proper Orbit type mapping"
   git push -u origin feature/fix-transfer-decode-and-asset-selection
   gh pr create --title "Fix: Transfer Proposal Decode Error and Asset Selection" --body "Implements ENHANCED_FIX_TRANSFER_DECODE_AND_ASSET_SELECTION.md"
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

**Branch:** `feature/fix-transfer-decode-and-asset-selection`
**Worktree:** `/home/theseus/alexandria/daopad-fix-transfer-decode/src/daopad`

---

# Fix Transfer Proposal Decode Error and Asset Selection

## Executive Summary

Three critical issues prevent treasury transfers from working correctly:

1. **Decode Error**: Backend's `ErrorInfo` type doesn't match Orbit's `Error` type
   - Orbit returns `message: opt text` and `details: opt vec record { text; text }`
   - Backend expects `message: String` (required) with no `details` field
   - When Orbit returns error with null message or includes details, decode fails

2. **Asset Selection Bug**: Frontend picks first asset without proper context
   - Account may have multiple assets (ICP, DAO token, etc.)
   - Frontend uses `assets[0]` arbitrarily without checking balance or user intent
   - Each asset has different decimals, symbol, and balance
   - Amount conversion uses wrong asset's decimals

3. **Missing Asset Context**: Backend doesn't provide full asset metadata for transfers
   - Transfer operations need complete Asset details (symbol, decimals, standards)
   - Backend should query and enrich asset data from Orbit Station

## Orbit Station Architecture Deep Dive

### Core Type Definitions (orbit-reference/core/station/api/spec.did)

#### Asset Types
```candid
// Full asset definition with all metadata
type Asset = record {
  id : UUID;                    // e.g., "7802cbab-221d-4e49-b764-a695ea6def1a" for ICP
  blockchain : text;             // e.g., "icp"
  standards : vec text;          // e.g., ["icp_native", "icrc1"]
  symbol : AssetSymbol;          // e.g., "ICP"
  name : text;                   // e.g., "Internet Computer"
  metadata : vec AssetMetadata;  // Ledger canister IDs, etc.
  decimals : nat32;              // e.g., 8
};

// Asset reference within an account
type AccountAsset = record {
  asset_id : UUID;               // References Asset.id
  balance : opt AccountBalance;  // Optional, fetched separately
};

// Balance details with metadata
type AccountBalance = record {
  account_id : UUID;
  asset_id : UUID;
  balance : nat;                 // Raw amount
  decimals : nat32;              // For display formatting
  last_update_timestamp : TimestampRFC3339;
  query_state : text;            // "fresh" or "stale"
};
```

#### Account Structure
```candid
type Account = record {
  id : UUID;
  assets : vec AccountAsset;    // List of assets this account can hold
  addresses : vec AccountAddress;
  name : text;
  metadata : vec AccountMetadata;
  transfer_request_policy : opt RequestPolicyRule;
  configs_request_policy : opt RequestPolicyRule;
};
```

#### Transfer Operation Types
```candid
// Input for creating a transfer request
type TransferOperationInput = record {
  from_account_id : UUID;
  from_asset_id : UUID;         // Must match an asset in the account
  with_standard : text;          // e.g., "icp_native", "icrc1"
  amount : nat;                  // Raw amount (not divided by decimals)
  to : text;                     // Destination address
  fee : opt nat;
  metadata : vec record { text; text };
  network : opt text;
  memo : opt blob;
};

// Full transfer operation in the request
type TransferOperation = record {
  from_account : opt Account;   // Full account details
  from_asset : Asset;            // Full asset details (populated by Orbit)
  network : Network;
  input : TransferOperationInput;
  transfer_id : opt UUID;
  fee : opt nat;
};
```

#### Error Type (Critical for Decode Fix)
```candid
type Error = record {
  code : text;
  message : opt text;            // OPTIONAL - can be null
  details : opt vec record { text; text };  // OPTIONAL - additional context
};
```

### Key Insights from Research

1. **Asset-Account Relationship**:
   - Accounts have a list of `AccountAsset` references
   - Each `AccountAsset` points to a full `Asset` via `asset_id`
   - Balances are stored separately and fetched on-demand

2. **Transfer Requirements**:
   - Must specify both `from_account_id` AND `from_asset_id`
   - Asset must be registered in the account's asset list
   - Standard must match one of the asset's supported standards

3. **Query Patterns**:
   - `list_assets` - Get all registered assets in the station
   - `get_asset` - Get full details for a specific asset
   - `get_account` - Get account with asset references
   - `fetch_account_balances` - Update and get current balances

## Current State Analysis

### File Tree
```
daopad_backend/src/
├── api/
│   ├── orbit_transfers.rs     # ❌ ErrorInfo type mismatch
│   └── mod.rs                  # Exports CreateRequestResult
├── proposals/
│   └── treasury.rs             # Uses CreateRequestResult
└── ...

daopad_frontend/src/
├── components/
│   ├── orbit/
│   │   └── TransferRequestDialog.jsx  # ✅ Has asset prop with decimals
│   └── tables/
│       └── AccountsTable.jsx   # ❌ Picks assets[0] arbitrarily
└── services/
    └── DAOPadBackendService.js # Could add asset query methods
```

### Existing Implementations

#### Backend: ErrorInfo Type (orbit_transfers.rs:18-21)
```rust
#[derive(CandidType, Deserialize)]
pub struct ErrorInfo {
    pub code: String,
    pub message: String,  // ❌ NOT optional, should be Option<String>
    // ❌ MISSING: details field
}
```

#### Frontend: Asset Selection (AccountsTable.jsx:102)
```javascript
// Use first asset (could be enhanced to show asset picker)
const asset = assets[0];  // ❌ Arbitrary selection
```

## Implementation Plan

### Backend Changes

#### File: `daopad_backend/src/api/orbit_transfers.rs`

**MODIFY: Lines 17-21 - Fix ErrorInfo to match Orbit's Error type**

```rust
// PSEUDOCODE - BEFORE:
#[derive(CandidType, Deserialize)]
pub struct ErrorInfo {
    pub code: String,
    pub message: String,
}

// PSEUDOCODE - AFTER:
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ErrorInfo {
    pub code: String,
    pub message: Option<String>,  // ✅ Now optional to match Orbit
    pub details: Option<Vec<(String, String)>>,  // ✅ Add details field
}

// Also update error display logic (around line 50-60):
impl fmt::Display for ErrorInfo {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        // Handle optional message gracefully
        let msg = self.message.as_deref().unwrap_or("No message");

        // Include details if present
        if let Some(details) = &self.details {
            let details_str = details.iter()
                .map(|(k, v)| format!("{}: {}", k, v))
                .collect::<Vec<_>>()
                .join(", ");
            write!(f, "{} - {} [{}]", self.code, msg, details_str)
        } else {
            write!(f, "{} - {}", self.code, msg)
        }
    }
}
```

**ADD: New method to query assets for an account**

```rust
// PSEUDOCODE - Add after line 200:
#[update]
pub async fn get_account_with_assets(
    token_canister_id: Principal,
    account_id: String,
) -> Result<AccountWithAssets, String> {
    // Get station ID for this token
    let station_id = get_station_for_token(token_canister_id)
        .ok_or("No Orbit Station registered for this token")?;

    // Query account from Orbit
    let account_result: Result<(GetAccountResult,), _> = ic_cdk::call(
        station_id,
        "get_account",
        (GetAccountInput { account_id: account_id.clone() },)
    ).await;

    match account_result {
        Ok((GetAccountResult::Ok(account_data),)) => {
            // For each AccountAsset, fetch full Asset details
            let mut enriched_assets = vec![];

            for account_asset in account_data.account.assets {
                // Query full asset details
                let asset_result: Result<(GetAssetResult,), _> = ic_cdk::call(
                    station_id,
                    "get_asset",
                    (GetAssetInput { asset_id: account_asset.asset_id.clone() },)
                ).await;

                if let Ok((GetAssetResult::Ok(asset_data),)) = asset_result {
                    enriched_assets.push(AssetWithBalance {
                        asset: asset_data.asset,
                        balance: account_asset.balance,
                    });
                }
            }

            Ok(AccountWithAssets {
                account: account_data.account,
                assets: enriched_assets,
            })
        }
        Ok((GetAssetResult::Err(e),)) => {
            Err(format!("Failed to get account: {}", e))
        }
        Err(e) => {
            Err(format!("Call failed: {:?}", e))
        }
    }
}

// Add type definitions at top of file:
#[derive(CandidType, Deserialize)]
pub struct AccountWithAssets {
    pub account: Account,
    pub assets: Vec<AssetWithBalance>,
}

#[derive(CandidType, Deserialize)]
pub struct AssetWithBalance {
    pub asset: Asset,
    pub balance: Option<AccountBalance>,
}
```

**ADD: Method to list all available assets**

```rust
// PSEUDOCODE - Add after get_account_with_assets:
#[update]
pub async fn list_station_assets(
    token_canister_id: Principal,
) -> Result<Vec<Asset>, String> {
    let station_id = get_station_for_token(token_canister_id)
        .ok_or("No Orbit Station registered for this token")?;

    let result: Result<(ListAssetsResult,), _> = ic_cdk::call(
        station_id,
        "list_assets",
        (ListAssetsInput { paginate: None },)
    ).await;

    match result {
        Ok((ListAssetsResult::Ok(data),)) => Ok(data.assets),
        Ok((ListAssetsResult::Err(e),)) => Err(format!("Failed to list assets: {}", e)),
        Err(e) => Err(format!("Call failed: {:?}", e))
    }
}
```

### Frontend Changes

#### File: `daopad_frontend/src/components/tables/AccountsTable.jsx`

**MODIFY: Lines 86-134 - Intelligent asset selection with balance context**

```javascript
// PSEUDOCODE - Enhanced handleTransfer function:
const handleTransfer = async (account) => {
    debugLog('🔍 Transfer Button Clicked', () => {
        console.log('Account data:', safeStringify(account));
    });

    // Validate account structure
    if (!account.id) {
        console.error('❌ Account missing ID');
        toast.error('Invalid Account', {
            description: 'Account data is malformed. Please refresh the page.'
        });
        return;
    }

    // Get assets from account
    const assets = account.assets || [];

    debugLog('Asset Validation', () => {
        console.log(`Found ${assets.length} assets on account`);
        assets.forEach((a, i) => {
            const balance = a.balance?.balance || a.balance || 0n;
            console.log(`Asset ${i}: ${a.symbol || a.asset_id}, balance: ${balance}`);
        });
    });

    if (assets.length === 0) {
        console.error('❌ No assets found on account');
        toast.error('No Assets Available', {
            description: 'This account has no assets to transfer. Please add assets first.'
        });
        return;
    }

    // ✅ ENHANCED: Smart asset selection logic
    let selectedAsset = null;
    let selectionReason = '';

    // Strategy 1: If only one asset, use it
    if (assets.length === 1) {
        selectedAsset = assets[0];
        selectionReason = 'Only asset available';
    }
    // Strategy 2: Find asset with highest balance
    else {
        const assetWithHighestBalance = assets.reduce((max, curr) => {
            const maxBalance = max.balance?.balance || max.balance || 0n;
            const currBalance = curr.balance?.balance || curr.balance || 0n;
            return currBalance > maxBalance ? curr : max;
        }, assets[0]);

        const highestBalance = assetWithHighestBalance.balance?.balance || 0n;

        if (highestBalance > 0n) {
            selectedAsset = assetWithHighestBalance;
            selectionReason = 'Highest balance';
        } else {
            // All have zero balance, prefer known tokens
            const preferredAssets = ['ICP', 'ALEX', 'DAO'];
            selectedAsset = assets.find(a =>
                preferredAssets.includes(a.symbol)
            ) || assets[0];
            selectionReason = selectedAsset.symbol ?
                'Preferred token' : 'First available (all zero balance)';
        }
    }

    debugLog('Asset Selection', () => {
        console.log('Selected asset:', safeStringify(selectedAsset));
        console.log('Reason:', selectionReason);
        console.log('Other assets available:', assets.length - 1);
    });

    // Normalize asset structure with full metadata
    const normalizedAsset = {
        id: selectedAsset.id || selectedAsset.asset_id,
        symbol: selectedAsset.symbol || tokenSymbol || 'TOKEN',
        decimals: selectedAsset.decimals || 8,
        balance: selectedAsset.balance,
        name: selectedAsset.name,
        blockchain: selectedAsset.blockchain || 'icp',
        standards: selectedAsset.standards || ['icrc1'],
        // Store selection context for UI
        _selectionReason: selectionReason,
        _otherAssetsCount: assets.length - 1
    };

    // Validate asset has required ID
    if (!normalizedAsset.id) {
        console.error('❌ Asset missing ID:', selectedAsset);
        toast.error('Invalid Asset Data', {
            description: 'Asset is missing required ID. Please refresh the account data.'
        });
        return;
    }

    debugLog('Transfer Dialog Opening', () => {
        console.log('✅ Normalized asset:', safeStringify(normalizedAsset));
        console.log('✅ Validation passed, opening transfer dialog');
    });

    setTransferDialog({
        open: true,
        account,
        asset: normalizedAsset,
        availableAssets: assets  // Pass all assets for potential picker UI
    });
};
```

**ADD: Asset picker UI in TransferRequestDialog (optional enhancement)**

```javascript
// PSEUDOCODE - In TransferRequestDialog.jsx, add asset selector:
const TransferRequestDialog = ({ open, onClose, account, asset, availableAssets, ...props }) => {
    const [selectedAssetId, setSelectedAssetId] = useState(asset?.id);

    // If multiple assets available, show picker
    const showAssetPicker = availableAssets && availableAssets.length > 1;

    return (
        <Dialog open={open} onClose={onClose}>
            {/* ... existing dialog content ... */}

            {showAssetPicker && (
                <div className="asset-selector">
                    <label>Select Asset to Transfer:</label>
                    <select
                        value={selectedAssetId}
                        onChange={(e) => {
                            const newAsset = availableAssets.find(
                                a => (a.id || a.asset_id) === e.target.value
                            );
                            if (newAsset) {
                                setSelectedAssetId(e.target.value);
                                // Update amount field decimals
                                updateAssetContext(newAsset);
                            }
                        }}
                    >
                        {availableAssets.map(a => {
                            const id = a.id || a.asset_id;
                            const balance = a.balance?.balance || 0n;
                            const symbol = a.symbol || 'Unknown';
                            return (
                                <option key={id} value={id}>
                                    {symbol} - Balance: {formatBalance(balance, a.decimals || 8)}
                                </option>
                            );
                        })}
                    </select>
                    {asset._selectionReason && (
                        <small>Auto-selected: {asset._selectionReason}</small>
                    )}
                </div>
            )}

            {/* ... rest of dialog ... */}
        </Dialog>
    );
};
```

### Backend Service Enhancement

#### File: `daopad_frontend/src/services/DAOPadBackendService.js`

**ADD: Methods to query asset information**

```javascript
// PSEUDOCODE - Add new methods:
class DAOPadBackendService {
    // ... existing methods ...

    async getAccountWithAssets(tokenId, accountId) {
        try {
            const actor = await this.getActor();
            const result = await actor.get_account_with_assets(
                Principal.fromText(tokenId),
                accountId
            );

            if (result.Ok) {
                return {
                    success: true,
                    data: result.Ok
                };
            } else {
                return {
                    success: false,
                    error: result.Err
                };
            }
        } catch (error) {
            console.error('Failed to get account with assets:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async listStationAssets(tokenId) {
        try {
            const actor = await this.getActor();
            const result = await actor.list_station_assets(
                Principal.fromText(tokenId)
            );

            if (result.Ok) {
                return {
                    success: true,
                    data: result.Ok
                };
            } else {
                return {
                    success: false,
                    error: result.Err
                };
            }
        } catch (error) {
            console.error('Failed to list station assets:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}
```

## Testing Requirements

### Backend Testing

**Test 1: Verify ErrorInfo Structure**
```bash
# Check Candid interface after rebuild
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Should show:
# type ErrorInfo = record {
#   code : text;
#   message : opt text;
#   details : opt vec record { text; text };
# };
grep -A5 "type ErrorInfo" daopad_backend/daopad_backend.did
```

**Test 2: Test Asset Queries**
```bash
# Test list_station_assets
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_station_assets \
'(principal "ysy5f-2qaaa-aaaap-qkmmq-cai")'

# Expected: List of assets including ICP and ALEX
# variant { Ok = vec { record { id = "7802cbab..."; symbol = "ICP"; ... } } }

# Test get_account_with_assets
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai get_account_with_assets \
'(principal "ysy5f-2qaaa-aaaap-qkmmq-cai", "3f601869-e48e-49a1-92cb-32f55b308a18")'

# Expected: Account with enriched asset details
```

**Test 3: Create Transfer Proposal (End-to-End)**
```bash
export ALEX_TOKEN="ysy5f-2qaaa-aaaap-qkmmq-cai"

# Use daopad identity (has voting power)
dfx identity use daopad

# Create transfer with proper asset context
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai create_treasury_transfer_proposal \
'(
  principal "ysy5f-2qaaa-aaaap-qkmmq-cai",
  record {
    from_account_id = "3f601869-e48e-49a1-92cb-32f55b308a18";
    from_asset_id = "7802cbab-221d-4e49-b764-a695ea6def1a";  # ICP asset
    to = "2ljyd-77i5g-ix222-szy7a-ru4cu-ns4j7-kxc2z-oazam-igx3u-uwee6-yqe";
    amount = 100000000 : nat;  # 1 ICP (8 decimals)
    memo = null;
    title = "Test Transfer After Fix";
    description = "Testing with proper asset selection and error handling";
  }
)'

# Expected: (variant { Ok = 12345 : nat64 })
# NOT: IcCallFailed decode error
```

### Frontend Testing

**Test 4: Verify Smart Asset Selection**
```javascript
// In browser console after loading treasury page:

// 1. Check enhanced asset selection logic
const accounts = window.__REDUX_STATE__?.orbit?.accounts?.data;
const testAccount = Object.values(accounts || {})
  .flatMap(station => station.accounts || [])
  .find(acc => acc.assets?.length > 1);

if (testAccount) {
  // Simulate asset selection
  const assets = testAccount.assets;

  // Find asset with highest balance
  const selected = assets.reduce((max, curr) => {
    const maxBal = max.balance?.balance || 0n;
    const currBal = curr.balance?.balance || 0n;
    return currBal > maxBal ? curr : max;
  });

  console.log('Smart selection picked:', selected);
  console.log('Has balance:', selected.balance?.balance > 0n);
}

// 2. Test transfer button with multi-asset account
// Click Transfer on an account with multiple assets
// Verify: Correct asset selected based on balance
// Verify: Asset picker shown if implemented
```

**Test 5: Verify Error Handling**
```javascript
// Test error display with optional fields
try {
  // Trigger an error condition
  await createTransferWithInvalidData();
} catch (error) {
  // Should handle errors with:
  // - Optional message (might be null)
  // - Optional details array
  console.log('Error handled correctly:', error);
}
```

### Testing Commands Summary

```bash
# 1. Verify worktree
cd /home/theseus/alexandria/daopad-fix-transfer-decode/src/daopad
pwd  # Should show worktree path

# 2. Test Orbit API directly (baseline)
dfx identity use daopad
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_assets '(record { paginate = null })'
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai get_account '(record { account_id = "3f601869-e48e-49a1-92cb-32f55b308a18" })'

# 3. Build and deploy backend
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
./deploy.sh --network ic --backend-only

# 4. Sync declarations (CRITICAL)
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# 5. Test new backend methods
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_station_assets '(principal "ysy5f-2qaaa-aaaap-qkmmq-cai")'
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai get_account_with_assets '(principal "ysy5f-2qaaa-aaaap-qkmmq-cai", "3f601869-e48e-49a1-92cb-32f55b308a18")'

# 6. Deploy frontend
npm run build
./deploy.sh --network ic --frontend-only

# 7. End-to-end test
# Visit https://daopad.org
# Navigate to Treasury
# Click Transfer on multi-asset account
# Verify correct asset selection
```

## Success Criteria

- [ ] Backend build succeeds with new type definitions
- [ ] ErrorInfo type in .did file matches Orbit's Error type exactly
- [ ] list_station_assets returns all registered assets
- [ ] get_account_with_assets returns enriched asset data
- [ ] Transfer proposal creation succeeds without decode errors
- [ ] Frontend intelligently selects asset with balance
- [ ] Asset picker UI shows all available assets (if implemented)
- [ ] Transfer dialog shows correct decimals and symbol
- [ ] Error messages display correctly with optional fields
- [ ] Amount conversion uses selected asset's decimals

## Risk Assessment

### Low Risk
- ErrorInfo update: Additive change (adding optional fields)
- Asset query methods: New functionality, no breaking changes
- Frontend asset selection: Progressive enhancement

### Medium Risk
- Existing error handlers expecting non-optional message
  - **Mitigation**: Use `.unwrap_or_default()` pattern
- Performance impact of additional asset queries
  - **Mitigation**: Cache asset data in frontend

### High Risk
- None identified

## Architecture Improvements

This plan establishes proper separation of concerns:

1. **Orbit Station**: Source of truth for assets and accounts
2. **DAOPad Backend**: Admin proxy for protected queries, enriches data
3. **DAOPad Frontend**: Smart UI decisions based on complete data

The architecture now properly cross-references:
- Account → AccountAsset[] → Asset details
- Transfer needs both account_id AND asset_id
- Each asset has its own decimals and standards

## Future Enhancements

1. **Asset Management UI**:
   - Add/remove assets from accounts
   - Configure default assets per account

2. **Transfer History**:
   - Show historical transfers grouped by asset
   - Track gas fees per asset type

3. **Multi-Asset Transfers**:
   - Batch transfers of different assets
   - Optimize for transaction fees

4. **Asset Price Feeds**:
   - Integrate price oracles
   - Show USD value of balances and transfers

---

## Plan Checklist

- [x] Worktree created first
- [x] Orchestrator header embedded at top
- [x] Current state documented with actual code
- [x] Root causes identified with evidence from Orbit source
- [x] Implementation with detailed pseudocode
- [x] Cross-referenced with orbit-reference types
- [x] Testing strategy with specific commands
- [x] Success criteria clearly defined
- [x] Architecture properly mapped (Account → Asset relationships)

## Critical Cross-References

- **Asset Type**: `/home/theseus/alexandria/daopad/src/orbit-reference/core/station/api/spec.did:1073-1087`
- **Account Type**: `/home/theseus/alexandria/daopad/src/orbit-reference/core/station/api/spec.did:1257-1268`
- **AccountAsset Type**: `/home/theseus/alexandria/daopad/src/orbit-reference/core/station/api/spec.did:1244-1248`
- **Error Type**: `/home/theseus/alexandria/daopad/src/orbit-reference/core/station/api/spec.did:439-443`
- **TransferOperationInput**: `/home/theseus/alexandria/daopad/src/orbit-reference/core/station/api/spec.did:3180-3197`
- **list_assets API**: `/home/theseus/alexandria/daopad/src/orbit-reference/core/station/api/spec.did:5923`
- **get_account API**: `/home/theseus/alexandria/daopad/src/orbit-reference/core/station/api/spec.did:5883`