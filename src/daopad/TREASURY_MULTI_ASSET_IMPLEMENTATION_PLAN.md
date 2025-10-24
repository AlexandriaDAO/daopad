# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-treasury-multi-asset/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-treasury-multi-asset/src/daopad`
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
   git commit -m "[Feature]: Treasury Multi-Asset Support - Display All Assets & Balances"
   git push -u origin feature/treasury-multi-asset
   gh pr create --title "[Feature]: Treasury Multi-Asset Support" --body "Implements TREASURY_MULTI_ASSET_IMPLEMENTATION_PLAN.md

## Summary
Adds complete multi-asset support to treasury tabs, displaying all assets (ICP, ALEX, etc.) with their individual balances for each treasury account.

## Changes
- Backend: New methods to fetch account assets and balances from Orbit Station
- Frontend: Enhanced TreasuryTab to display multiple assets per account
- Frontend: Asset breakdown visualization with portfolio distribution
- Tests: Playwright E2E tests verifying multi-asset data pipeline

## Testing
- All treasury E2E tests passing
- Multi-asset accounts display correctly
- Asset breakdown chart renders properly
- Balance data flows from backend → Redux → UI"
   ```
5. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view --json comments,reviews --jq '.reviews[-1].state'`
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

**Branch:** `feature/treasury-multi-asset`
**Worktree:** `/home/theseus/alexandria/daopad-treasury-multi-asset/src/daopad`

---

# Implementation Plan: Treasury Multi-Asset Support

## Problem Statement

Currently, the Treasury Tab fails to display:
1. **Multiple assets per account** - Orbit accounts can hold ICP, ALEX, and other tokens
2. **Individual asset balances** - Each asset has its own balance, decimals, and metadata
3. **Asset breakdown visualization** - Portfolio distribution across assets
4. **Complete data pipeline** - Backend → Redux → UI flow is broken

**Test Results:**
- Treasury Enhanced tests: 0/10 passing (0%)
- Basic treasury: 3/6 passing (50%)
- Issues: Asset breakdown, account balances, Redux state, accordion, charts all failing

## Research Findings: Orbit Station Treasury Architecture

### Data Structure (from `station.did`)

```rust
// Account can hold MULTIPLE assets
type Account = record {
  id : UUID;
  name : text;
  assets : vec AccountAsset;  // ← KEY: Vector of assets!
  addresses : vec AccountAddress;
  metadata : vec AccountMetadata;
  transfer_request_policy : opt RequestPolicyRule;
  configs_request_policy : opt RequestPolicyRule;
  last_modification_timestamp : TimestampRFC3339;
};

// Each asset in the account
type AccountAsset = record {
  asset_id : UUID;
  balance : opt AccountBalance;  // ← May be null if not fetched yet
};

// Balance details for an asset
type AccountBalance = record {
  account_id : UUID;
  asset_id : UUID;
  balance : nat;  // ← Raw balance (need to apply decimals)
  decimals : nat32;  // ← For display formatting
  last_update_timestamp : TimestampRFC3339;
  query_state : text;  // "fresh", "stale", "stale_refreshing"
};

// Asset metadata
type Asset = record {
  id : UUID;
  blockchain : text;
  standards : vec text;
  symbol : AssetSymbol;  // "ICP", "ALEX", etc.
  name : text;
  metadata : vec AssetMetadata;
  decimals : nat32;
};
```

### Available API Methods

```rust
// Get account with ALL assets (but balances may be null)
get_account : (input : GetAccountInput) -> (GetAccountResult) query;

// Fetch balances for specific accounts
fetch_account_balances : (input : FetchAccountBalancesInput) -> (FetchAccountBalancesResult);
// Input: { account_ids : vec UUID }
// Returns: { balances : vec opt AccountBalance }

// List all assets in the station
list_assets : (input : ListAssetsInput) -> (ListAssetsResult) query;

// Get specific asset details
get_asset : (input : GetAssetInput) -> (GetAssetResult) query;
```

## Current State Analysis

### Backend (`daopad_backend/`)

**Files to modify:**
- `src/api/orbit_accounts.rs` - Add multi-asset methods
- `src/types.rs` - Add AccountAsset, AccountBalance types

**Current issues:**
- No method to fetch account assets
- No method to fetch balances for multiple assets
- No type definitions for multi-asset data

### Frontend (`daopad_frontend/`)

**Files to modify:**
- `src/components/treasury/TreasuryTab.tsx` - Main treasury display
- `src/components/treasury/AccountCard.tsx` (NEW) - Multi-asset account card
- `src/components/treasury/AssetBreakdown.tsx` (NEW) - Portfolio chart
- `src/store/slices/treasurySlice.ts` - Redux state for multi-asset
- `src/services/DAOPadBackendService.ts` - Service methods

**Current issues:**
- TreasuryTab assumes single asset per account
- No component for displaying multiple assets
- No portfolio visualization
- Redux state doesn't support multi-asset structure

### Testing (`daopad_frontend/e2e/`)

**Files to modify:**
- `treasury-enhanced.spec.ts` - All 10 failing tests

**Current issues:**
- Tests expect multi-asset data but backend doesn't provide it
- No verification of asset breakdown display
- No Redux state assertions for multi-asset data

---

## Implementation Plan

### Phase 1: Backend - Multi-Asset Data Fetching

#### File: `daopad_backend/src/types.rs` (MODIFY)

Add Orbit Station types:

```rust
// PSEUDOCODE

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AccountAsset {
    pub asset_id: String,  // UUID
    pub balance: Option<AccountBalance>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AccountBalance {
    pub account_id: String,
    pub asset_id: String,
    pub balance: Nat,
    pub decimals: u32,
    pub last_update_timestamp: String,  // RFC3339
    pub query_state: String,  // "fresh" | "stale" | "stale_refreshing"
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Asset {
    pub id: String,
    pub blockchain: String,
    pub standards: Vec<String>,
    pub symbol: String,
    pub name: String,
    pub metadata: Vec<AssetMetadata>,
    pub decimals: u32,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AssetMetadata {
    pub key: String,
    pub value: String,
}

// Enhanced Account type
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct OrbitAccount {
    pub id: String,
    pub name: String,
    pub assets: Vec<AccountAsset>,  // ← NEW: Multiple assets
    pub addresses: Vec<AccountAddress>,
    pub metadata: Vec<AccountMetadata>,
    pub transfer_request_policy: Option<RequestPolicyRule>,
    pub configs_request_policy: Option<RequestPolicyRule>,
    pub last_modification_timestamp: String,
}
```

#### File: `daopad_backend/src/api/orbit_accounts.rs` (MODIFY)

Add methods to fetch multi-asset data:

```rust
// PSEUDOCODE

#[update]
pub async fn get_treasury_account_details(
    token_id: Principal,
    account_id: String,
) -> Result<OrbitAccount, String> {
    // 1. Get station ID for this token
    let station_id = get_station_for_token(token_id)?;

    // 2. Call Orbit's get_account to get full account with assets
    let result: CallResult<(GetAccountResult,)> = ic_cdk::call(
        station_id,
        "get_account",
        (GetAccountInput { account_id: account_id.clone() },)
    ).await;

    match result {
        Ok((GetAccountResult::Ok(account_data),)) => {
            // 3. If balances are null, call fetch_account_balances
            let account = account_data.account;

            if account.assets.iter().any(|a| a.balance.is_none()) {
                // Fetch fresh balances
                let balance_result: CallResult<(FetchAccountBalancesResult,)> = ic_cdk::call(
                    station_id,
                    "fetch_account_balances",
                    (FetchAccountBalancesInput {
                        account_ids: vec![account_id.clone()]
                    },)
                ).await;

                // Merge balances into account assets
                // Return enhanced account
            }

            Ok(account)
        }
        Ok((GetAccountResult::Err(err),)) => Err(format!("Orbit error: {:?}", err)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}

#[query]
pub async fn list_treasury_assets(
    token_id: Principal,
) -> Result<Vec<Asset>, String> {
    // 1. Get station ID for this token
    let station_id = get_station_for_token(token_id)?;

    // 2. Call Orbit's list_assets
    let result: CallResult<(ListAssetsResult,)> = ic_cdk::call(
        station_id,
        "list_assets",
        (ListAssetsInput {
            // Filter params if needed
        },)
    ).await;

    match result {
        Ok((ListAssetsResult::Ok(assets_data),)) => Ok(assets_data.assets),
        Ok((ListAssetsResult::Err(err),)) => Err(format!("Orbit error: {:?}", err)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}

#[update]
pub async fn get_treasury_accounts_with_balances(
    token_id: Principal,
) -> Result<Vec<OrbitAccount>, String> {
    // 1. List all accounts
    let accounts = list_treasury_accounts(token_id).await?;

    // 2. For each account, fetch full details with balances
    let mut detailed_accounts = Vec::new();
    for account in accounts {
        let detailed = get_treasury_account_details(token_id, account.id).await?;
        detailed_accounts.push(detailed);
    }

    Ok(detailed_accounts)
}
```

#### Testing Backend (BEFORE frontend work)

```bash
# 1. Build and deploy backend
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
./deploy.sh --network ic --backend-only

# 2. Test with dfx (use test station fec7w-zyaaa-aaaaa-qaffq-cai)
export TEST_TOKEN="ysy5f-2qaaa-aaaap-qkmmq-cai"  # ALEX token
export BACKEND="lwsav-iiaaa-aaaap-qp2qq-cai"

# Test list_treasury_assets
dfx canister --network ic call $BACKEND list_treasury_assets "(principal \"$TEST_TOKEN\")"
# Expected: List of assets with ICP, ALEX symbols

# Test get_treasury_accounts_with_balances
dfx canister --network ic call $BACKEND get_treasury_accounts_with_balances "(principal \"$TEST_TOKEN\")"
# Expected: Accounts with assets array, each asset having balance data

# Verify response structure matches types:
# - Each account has assets: Vec<AccountAsset>
# - Each asset has asset_id and balance: Option<AccountBalance>
# - Balance has balance (Nat), decimals (u32), symbol, etc.

# 3. Sync declarations
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
```

---

### Phase 2: Frontend - Redux State Management

#### File: `daopad_frontend/src/store/slices/treasurySlice.ts` (MODIFY)

Update Redux state for multi-asset:

```typescript
// PSEUDOCODE

interface AccountAsset {
  asset_id: string;
  balance: AccountBalance | null;
}

interface AccountBalance {
  account_id: string;
  asset_id: string;
  balance: bigint;
  decimals: number;
  last_update_timestamp: string;
  query_state: 'fresh' | 'stale' | 'stale_refreshing';
}

interface Asset {
  id: string;
  blockchain: string;
  standards: string[];
  symbol: string;
  name: string;
  metadata: Array<{ key: string; value: string }>;
  decimals: number;
}

interface TreasuryAccount {
  id: string;
  name: string;
  assets: AccountAsset[];  // ← NEW: Multiple assets!
  addresses: Array<{ address: string; format: string }>;
  // ... other fields
}

interface TreasuryState {
  accounts: TreasuryAccount[];
  availableAssets: Asset[];  // ← NEW: All assets in station
  loading: boolean;
  error: string | null;
}

// Thunks
export const fetchTreasuryAccounts = createAsyncThunk(
  'treasury/fetchAccounts',
  async (tokenId: string) => {
    const backend = await DAOPadBackendService.getActor();

    // Fetch accounts with all assets and balances
    const accounts = await backend.get_treasury_accounts_with_balances(
      Principal.fromText(tokenId)
    );

    // Fetch all available assets
    const assets = await backend.list_treasury_assets(
      Principal.fromText(tokenId)
    );

    return { accounts, assets };
  }
);

// Selectors
export const selectAccountAssets = (state: RootState, accountId: string) => {
  const account = state.treasury.accounts.find(a => a.id === accountId);
  return account?.assets || [];
};

export const selectAssetBreakdown = (state: RootState) => {
  // Calculate total value per asset across all accounts
  const breakdown: Record<string, { symbol: string; total: bigint; decimals: number }> = {};

  state.treasury.accounts.forEach(account => {
    account.assets.forEach(asset => {
      if (asset.balance) {
        const key = asset.asset_id;
        if (!breakdown[key]) {
          breakdown[key] = {
            symbol: getAssetSymbol(state, asset.asset_id),
            total: 0n,
            decimals: asset.balance.decimals,
          };
        }
        breakdown[key].total += asset.balance.balance;
      }
    });
  });

  return Object.values(breakdown);
};
```

---

### Phase 3: Frontend - Multi-Asset Display Components

#### File: `daopad_frontend/src/components/treasury/AccountCard.tsx` (NEW)

Create component to display account with multiple assets:

```typescript
// PSEUDOCODE

interface AccountCardProps {
  account: TreasuryAccount;
  assets: Asset[];  // All available assets for symbol lookup
}

export function AccountCard({ account, assets }: AccountCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Calculate total value (need price oracle for USD - use placeholder)
  const totalAssets = account.assets.length;

  return (
    <Card>
      <CardHeader onClick={() => setExpanded(!expanded)}>
        <div className="flex justify-between">
          <div>
            <h3>{account.name}</h3>
            <p className="text-sm text-gray-500">{totalAssets} assets</p>
          </div>
          <ChevronIcon expanded={expanded} />
        </div>
      </CardHeader>

      {expanded && (
        <CardContent>
          {/* Asset list */}
          <div className="space-y-2">
            {account.assets.map(accountAsset => {
              const asset = assets.find(a => a.id === accountAsset.asset_id);
              const balance = accountAsset.balance;

              return (
                <div key={accountAsset.asset_id} className="flex justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <AssetIcon symbol={asset?.symbol} />
                    <div>
                      <div className="font-medium">{asset?.name}</div>
                      <div className="text-sm text-gray-500">{asset?.symbol}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    {balance ? (
                      <>
                        <div className="font-medium">
                          {formatBalance(balance.balance, balance.decimals)} {asset?.symbol}
                        </div>
                        <div className="text-sm text-gray-500">
                          {balance.query_state === 'fresh' ? '✓ Fresh' : '⏱ Updating...'}
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-400">Loading...</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Account addresses */}
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Addresses</h4>
            {account.addresses.map((addr, idx) => (
              <div key={idx} className="text-xs font-mono text-gray-600">
                {addr.format}: {addr.address}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Helper function
function formatBalance(balance: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const integerPart = balance / divisor;
  const fractionalPart = balance % divisor;

  return `${integerPart}.${fractionalPart.toString().padStart(decimals, '0').slice(0, 2)}`;
}
```

#### File: `daopad_frontend/src/components/treasury/AssetBreakdown.tsx` (NEW)

Create portfolio distribution chart:

```typescript
// PSEUDOCODE

import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface AssetBreakdownProps {
  accounts: TreasuryAccount[];
  assets: Asset[];
}

export function AssetBreakdown({ accounts, assets }: AssetBreakdownProps) {
  // Calculate breakdown
  const breakdown = useMemo(() => {
    const totals: Record<string, { symbol: string; total: bigint; decimals: number }> = {};

    accounts.forEach(account => {
      account.assets.forEach(accountAsset => {
        if (accountAsset.balance) {
          const assetInfo = assets.find(a => a.id === accountAsset.asset_id);
          const key = assetInfo?.symbol || accountAsset.asset_id;

          if (!totals[key]) {
            totals[key] = {
              symbol: key,
              total: 0n,
              decimals: accountAsset.balance.decimals,
            };
          }
          totals[key].total += accountAsset.balance.balance;
        }
      });
    });

    return Object.entries(totals).map(([symbol, data]) => ({
      name: symbol,
      value: Number(data.total) / (10 ** data.decimals),  // Convert to decimal for chart
    }));
  }, [accounts, assets]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Portfolio Distribution</h3>

      <PieChart width={400} height={300}>
        <Pie
          data={breakdown}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
        >
          {breakdown.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>

      {/* Asset list */}
      <div className="mt-4 space-y-2">
        {breakdown.map((item, idx) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <span>{item.name}</span>
            </div>
            <span className="font-medium">{item.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### File: `daopad_frontend/src/components/treasury/TreasuryTab.tsx` (MODIFY)

Update main treasury tab to use multi-asset components:

```typescript
// PSEUDOCODE

export function TreasuryTab({ tokenId }: { tokenId: string }) {
  const dispatch = useDispatch();
  const { accounts, availableAssets, loading, error } = useSelector(
    (state: RootState) => state.treasury
  );

  useEffect(() => {
    dispatch(fetchTreasuryAccounts(tokenId));
  }, [tokenId, dispatch]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Treasury Accounts</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accounts list */}
        <div className="space-y-4">
          {accounts.map(account => (
            <AccountCard
              key={account.id}
              account={account}
              assets={availableAssets}
            />
          ))}
        </div>

        {/* Portfolio visualization */}
        <div>
          <AssetBreakdown accounts={accounts} assets={availableAssets} />
        </div>
      </div>
    </div>
  );
}
```

---

### Phase 4: Playwright E2E Testing

#### Testing Requirements (MANDATORY)

**See**: `PLAYWRIGHT_TESTING_GUIDE.md` section "For Plan Writers"

**Step 1: Manual Browser Verification (BEFORE Playwright)**

```bash
# After deploying frontend, manually verify in browser:
# 1. Open https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/treasury
# 2. Login with Internet Identity
# 3. Check browser console for errors (F12)
# 4. Verify:
#    - Accounts load
#    - Each account shows multiple assets (ICP, ALEX, etc.)
#    - Balances display correctly with decimals
#    - Asset breakdown chart renders
#    - Accordion expand/collapse works
#    - No console errors
```

**Step 2: Console Error Inspection Commands**

```bash
# After any test failure, run these commands to inspect:

# 1. Check last test screenshots
ls -lt daopad_frontend/test-results/ | head -20

# 2. View HTML report
cd daopad_frontend && npx playwright show-report

# 3. Check for specific errors in test output
cat daopad_frontend/test-results/*/test-finished-*.log | grep -i "error\|failed"

# 4. Re-run single failing test with debug
cd daopad_frontend && npx playwright test treasury-enhanced.spec.ts:59 --debug
```

**Step 3: Exit Criteria (When to Stop Iterating)**

STOP iterating when ALL of these are true:
1. ✅ All 10 treasury-enhanced tests passing
2. ✅ Manual browser check shows: accounts load, multiple assets per account, balances correct, chart renders
3. ✅ Console has ZERO errors (check with F12 in browser)
4. ✅ Redux DevTools shows correct state: accounts have assets array, each asset has balance
5. ✅ Network tab shows: backend calls succeed, data flows through

DO NOT STOP if any console errors exist or if tests are flaky.

**Step 4: Test File Template**

#### File: `daopad_frontend/e2e/treasury-enhanced.spec.ts` (MODIFY)

```typescript
// PSEUDOCODE
import { test, expect } from '@playwright/test';
import { createDataVerifier } from './utils/dataVerifier';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Treasury Enhanced - Multi-Asset Data Pipeline', () => {
  let verifier: ReturnType<typeof createDataVerifier>;

  test.beforeEach(async ({ page }) => {
    verifier = createDataVerifier(page);
    await page.goto('/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/treasury');
    await page.waitForLoadState('networkidle');
  });

  test('should fetch treasury data with multiple assets', async ({ page }) => {
    // VERIFY: Backend returns accounts with assets array
    const backendData = await verifier.captureBackendCall('get_treasury_accounts_with_balances');
    expect(backendData).toBeDefined();
    expect(backendData.accounts).toBeInstanceOf(Array);

    // Each account should have assets array
    const firstAccount = backendData.accounts[0];
    expect(firstAccount.assets).toBeInstanceOf(Array);
    expect(firstAccount.assets.length).toBeGreaterThan(0);

    // Each asset should have asset_id and optional balance
    const firstAsset = firstAccount.assets[0];
    expect(firstAsset.asset_id).toBeTruthy();

    if (firstAsset.balance) {
      expect(firstAsset.balance.balance).toBeDefined();
      expect(firstAsset.balance.decimals).toBeGreaterThan(0);
    }
  });

  test('should update Redux with multi-asset data', async ({ page }) => {
    // VERIFY: Redux state has correct structure
    const reduxState = await verifier.getReduxState('treasury');

    expect(reduxState.accounts).toBeInstanceOf(Array);
    expect(reduxState.availableAssets).toBeInstanceOf(Array);

    const account = reduxState.accounts[0];
    expect(account.assets).toBeInstanceOf(Array);

    // Verify asset structure
    if (account.assets.length > 0) {
      const asset = account.assets[0];
      expect(asset.asset_id).toBeTruthy();
    }
  });

  test('should display multiple assets per account', async ({ page }) => {
    // VERIFY: UI renders all assets
    const accountCard = page.locator('[data-testid="account-card"]').first();
    await accountCard.click();  // Expand accordion

    // Check for asset rows
    const assetRows = accountCard.locator('[data-testid="asset-row"]');
    const assetCount = await assetRows.count();

    expect(assetCount).toBeGreaterThan(0);

    // Verify each asset shows: symbol, name, balance
    for (let i = 0; i < assetCount; i++) {
      const row = assetRows.nth(i);
      await expect(row.locator('[data-testid="asset-symbol"]')).toBeVisible();
      await expect(row.locator('[data-testid="asset-balance"]')).toBeVisible();
    }
  });

  test('should display asset breakdown chart', async ({ page }) => {
    // VERIFY: Chart renders with correct data
    const chart = page.locator('[data-testid="asset-breakdown-chart"]');
    await expect(chart).toBeVisible();

    // Check for pie chart elements
    const pieSlices = chart.locator('path[class*="recharts-pie"]');
    expect(await pieSlices.count()).toBeGreaterThan(0);

    // Verify legend shows asset symbols
    const legend = page.locator('[data-testid="asset-breakdown-legend"]');
    await expect(legend).toBeVisible();
  });

  test('should handle accounts with multiple assets correctly', async ({ page }) => {
    // VERIFY: Accounts with 2+ assets display all of them
    const accounts = await verifier.getReduxState('treasury.accounts');

    const multiAssetAccount = accounts.find(a => a.assets.length > 1);
    expect(multiAssetAccount).toBeDefined();

    // Find that account in UI
    const accountCard = page.locator(`[data-account-id="${multiAssetAccount.id}"]`);
    await accountCard.click();  // Expand

    const assetCount = await accountCard.locator('[data-testid="asset-row"]').count();
    expect(assetCount).toBe(multiAssetAccount.assets.length);
  });

  test('should show zero balance accounts correctly', async ({ page }) => {
    // VERIFY: Accounts with 0 balance still display
    const zeroBalanceRow = page.locator('[data-testid="asset-row"]', {
      has: page.locator('text=/0\\.00/')
    }).first();

    if (await zeroBalanceRow.count() > 0) {
      await expect(zeroBalanceRow).toBeVisible();
    }
  });

  test('should handle accordion expand/collapse', async ({ page }) => {
    // VERIFY: Accordion state toggles correctly
    const accountCard = page.locator('[data-testid="account-card"]').first();

    // Initially collapsed
    const assetList = accountCard.locator('[data-testid="asset-list"]');
    await expect(assetList).not.toBeVisible();

    // Click to expand
    await accountCard.locator('[data-testid="account-header"]').click();
    await expect(assetList).toBeVisible();

    // Click to collapse
    await accountCard.locator('[data-testid="account-header"]').click();
    await expect(assetList).not.toBeVisible();
  });

  // Additional tests for remaining 2 enhanced tests...
});
```

**Step 5: Iteration Loop**

```bash
# After each deploy, run this loop:

cd daopad_frontend

for i in {1..5}; do
  echo "=== Iteration $i ==="

  # 1. Run tests
  npx playwright test treasury-enhanced.spec.ts

  # 2. Check console errors in browser
  echo "Manual check: Open https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io and check F12 console"

  # 3. If tests pass AND no console errors, DONE!
  # 4. If tests fail, check:
  npx playwright show-report

  # 5. Fix issues and redeploy
  cd ..
  ./deploy.sh --network ic
  cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
  ./deploy.sh --network ic --frontend-only
  cd daopad_frontend

  sleep 10  # Let deployment settle
done
```

---

## File Changes Summary

### Backend Changes
- `daopad_backend/src/types.rs` - Add AccountAsset, AccountBalance, Asset types
- `daopad_backend/src/api/orbit_accounts.rs` - Add multi-asset methods

### Frontend Changes
- `daopad_frontend/src/store/slices/treasurySlice.ts` - Multi-asset Redux state
- `daopad_frontend/src/components/treasury/TreasuryTab.tsx` - Use new components
- `daopad_frontend/src/components/treasury/AccountCard.tsx` (NEW) - Multi-asset display
- `daopad_frontend/src/components/treasury/AssetBreakdown.tsx` (NEW) - Portfolio chart
- `daopad_frontend/src/services/DAOPadBackendService.ts` - Service methods

### Test Changes
- `daopad_frontend/e2e/treasury-enhanced.spec.ts` - Fix all 10 failing tests

---

## Success Criteria

1. ✅ All 10 treasury-enhanced E2E tests passing
2. ✅ Manual browser verification: All features working, no console errors
3. ✅ Backend methods tested with dfx, return correct multi-asset data
4. ✅ Frontend displays all assets per account with correct balances
5. ✅ Asset breakdown chart renders correctly
6. ✅ Redux state properly structured for multi-asset data
7. ✅ PR created and passing code review

---

## Dependencies & Constraints

- **Orbit Station API**: All methods verified against test station `fec7w-zyaaa-aaaaa-qaffq-cai`
- **Test Token**: ALEX token `ysy5f-2qaaa-aaaap-qkmmq-cai` has multiple treasury accounts
- **Chart Library**: Already installed (recharts) in daopad_frontend
- **Authentication**: Tests use storageState from `playwright/.auth/user.json`
- **Deploy Target**: IC mainnet only (no local testing)

---

## Implementation Checklist

- [ ] Backend types added
- [ ] Backend methods implemented
- [ ] Backend tested with dfx
- [ ] Backend deployed to IC
- [ ] Declarations synced
- [ ] Redux slice updated
- [ ] AccountCard component created
- [ ] AssetBreakdown component created
- [ ] TreasuryTab updated
- [ ] Frontend deployed to IC
- [ ] Manual browser verification (no console errors)
- [ ] E2E tests updated
- [ ] All tests passing
- [ ] PR created
- [ ] Code review approved
