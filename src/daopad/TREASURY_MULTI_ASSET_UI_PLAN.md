# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-treasury-ui/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-treasury-ui/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes only (backend already deployed in PR #104):
     ```bash
     cd daopad_frontend
     npm install
     npm run build
     cd ..
     ./deploy.sh --network ic --frontend-only
     ```
4. **Manual Browser Verification** (MANDATORY BEFORE Playwright):
   ```bash
   # Open https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/treasury
   # Login with Internet Identity
   # Check:
   # 1. Accounts table loads
   # 2. Each account row shows all assets (not just first)
   # 3. Click account name to expand/collapse asset details
   # 4. Each asset shows: symbol, balance with correct decimals
   # 5. No console errors (F12)
   # 6. Redux DevTools shows accounts with assets[] array
   ```
5. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Feature]: Treasury Multi-Asset UI - Display All Assets Per Account"
   git push -u origin feature/treasury-multi-asset-ui
   gh pr create --title "[Feature]: Treasury Multi-Asset UI" --body "Implements TREASURY_MULTI_ASSET_UI_PLAN.md

## Summary
Completes multi-asset treasury by updating UI to display all assets per account (not just first asset).

## Changes
- Updated AccountsTable to show expandable rows for multi-asset display
- Each account shows total portfolio value + individual asset breakdowns
- Click account name to expand/collapse asset details
- Proper formatting with symbols and decimals for each asset

## Testing
- Manual browser verification completed
- All assets displayed correctly
- Expansion/collapse works smoothly
- No console errors

## Depends On
- PR #104 (backend multi-asset support) - must be merged first
"
   ```
6. **Iterate autonomously**:
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

**Branch:** `feature/treasury-multi-asset-ui`
**Worktree:** `/home/theseus/alexandria/daopad-treasury-ui/src/daopad`
**Depends On:** PR #104 must be merged first (backend multi-asset support)

---

# Implementation Plan: Treasury Multi-Asset UI

## Problem Statement

Currently, AccountsTable only displays the **first asset** in each account's assets array:

```typescript
// Current behavior (orbitSelectors.ts:78)
const primaryAsset = existingAssets[0];  // Only shows first!
const balanceFormatted = formatBalance(balance, decimals, { symbol });
```

Users with accounts holding multiple assets (ICP + ALEX + others) only see one asset's balance. The data layer is complete (PR #104), but UI doesn't expose it.

## Current State Analysis

### File: `daopad_frontend/src/components/tables/AccountsTable.tsx`

**What Works:**
- Lines 48-59: `fetchOrbitAccounts` correctly fetches multi-asset data
- Lines 32-35: `selectFormattedAccounts` receives accounts with full `assets[]` array
- Lines 76-178: Transfer button has smart asset selection for multi-asset accounts
- Redux state has complete multi-asset data from backend

**What's Missing:**
- Table only shows single row per account (line 262-289)
- Only displays `account.balanceFormatted` (line 276) which is **first asset only**
- No way to see other assets in the account
- No expandable UI to show asset breakdown

### File: `daopad_frontend/src/features/orbit/orbitSelectors.ts`

**Current Logic (Lines 44-107):**
```typescript
// Takes first asset as "primary" for sorting/display
const primaryAsset = existingAssets[0];
const balanceFormatted = formatBalance(balance, decimals, { symbol });

return {
  ...account,
  balanceFormatted,  // Only shows first asset!
  assets: existingAssets,  // Full array exists but unused in UI
};
```

**What We Need:**
- Keep `balanceFormatted` for sorting (total portfolio value)
- Add formatted data for each individual asset
- UI components to display all assets

---

## Implementation Plan

### Phase 1: Update AccountsTable for Multi-Asset Display

#### File: `daopad_frontend/src/components/tables/AccountsTable.tsx` (MODIFY)

Add expandable row functionality:

```typescript
// PSEUDOCODE

import { ChevronDown, ChevronRight } from 'lucide-react';

export default function AccountsTable({ stationId, identity, tokenId, tokenSymbol, votingPower }) {
  // ... existing state ...

  // NEW: Track which accounts are expanded
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  const toggleAccountExpansion = (accountId: string) => {
    setExpandedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  // ... existing code ...

  return (
    <Card>
      <CardHeader>
        {/* ... existing header ... */}
      </CardHeader>
      <CardContent>
        {/* ... existing search ... */}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Name</TableHead>
                <TableHead>Assets</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => {
                const isExpanded = expandedAccounts.has(account.id);
                const assetsCount = account.assets?.length || 0;

                return (
                  <React.Fragment key={account.id}>
                    {/* Main account row */}
                    <TableRow
                      data-testid="treasury-account"
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleAccountExpansion(account.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          {account.name || 'Unnamed Account'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {assetsCount} {assetsCount === 1 ? 'asset' : 'assets'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono" data-testid="account-total-value">
                        {calculateTotalValue(account.assets)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTransfer(account);
                          }}
                          disabled={!identity}
                        >
                          <ArrowUpRight className="w-4 h-4 mr-2" />
                          Transfer
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Expanded asset details */}
                    {isExpanded && account.assets && account.assets.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="bg-muted/30 p-0">
                          <div className="p-4 space-y-2">
                            <div className="text-sm font-medium text-muted-foreground mb-3">
                              Asset Breakdown
                            </div>
                            {account.assets.map((asset) => (
                              <div
                                key={asset.asset_id}
                                className="flex items-center justify-between py-2 px-3 rounded-md bg-background border"
                                data-testid="asset-detail-row"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-xs font-semibold">
                                      {getAssetIcon(asset)}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="font-medium" data-testid="asset-symbol">
                                      {getAssetSymbol(asset)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {getAssetName(asset)}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-mono" data-testid="asset-balance">
                                    {formatAssetBalance(asset)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {getBalanceStatus(asset)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions
function calculateTotalValue(assets) {
  // For now, show "Multi-Asset" label
  // Future: Calculate USD value when price oracle available
  if (!assets || assets.length === 0) return 'No assets';
  if (assets.length === 1) {
    const asset = assets[0];
    return formatAssetBalance(asset);
  }
  return 'Multi-Asset Portfolio';
}

function getAssetSymbol(asset) {
  // From Redux state or backend metadata
  return asset.symbol || asset.asset_id?.slice(0, 6) || 'UNKNOWN';
}

function getAssetName(asset) {
  return asset.name || 'Unknown Asset';
}

function getAssetIcon(asset) {
  // First letter of symbol for simple icon
  const symbol = getAssetSymbol(asset);
  return symbol.charAt(0).toUpperCase();
}

function formatAssetBalance(asset) {
  const balance = asset.balance?.balance || asset.balance || 0n;
  const decimals = asset.balance?.decimals || asset.decimals || 8;
  const symbol = getAssetSymbol(asset);

  if (typeof balance === 'bigint') {
    const divisor = 10n ** BigInt(decimals);
    const integerPart = balance / divisor;
    const fractionalPart = balance % divisor;
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0').slice(0, 2);
    return `${integerPart}.${fractionalStr} ${symbol}`;
  }

  return `0.00 ${symbol}`;
}

function getBalanceStatus(asset) {
  const queryState = asset.balance?.query_state || 'unknown';
  const timestamp = asset.balance?.last_update_timestamp;

  if (queryState === 'fresh') return '✓ Current';
  if (queryState === 'stale') return '⏱ Updating...';
  if (!asset.balance) return 'Loading...';
  return timestamp ? `Updated ${new Date(timestamp).toLocaleDateString()}` : '';
}
```

### Phase 2: Fetch Asset Metadata on Page Load

#### File: `daopad_frontend/src/components/tables/AccountsTable.tsx` (ADD)

Ensure asset symbols are available:

```typescript
// PSEUDOCODE

import { fetchTreasuryAssets } from '@/features/orbit/orbitSlice';

export default function AccountsTable({ stationId, identity, tokenId, tokenSymbol, votingPower }) {
  // ... existing code ...

  // NEW: Fetch asset metadata for symbol/name lookup
  useEffect(() => {
    if (tokenId) {
      dispatch(fetchTreasuryAssets({
        tokenId,
        identity: identity || null
      }));
    }
  }, [dispatch, tokenId, identity]);

  // Get asset metadata from Redux
  const availableAssets = useSelector(state => {
    const assetData = state.orbit.assets?.data?.[tokenId];
    return Array.isArray(assetData) ? assetData : [];
  });

  // ... rest of component ...
}
```

#### Update Helper Functions to Use Asset Metadata

```typescript
// PSEUDOCODE

function getAssetSymbol(asset, availableAssets) {
  // First try asset's own symbol
  if (asset.symbol) return asset.symbol;

  // Then lookup from metadata
  const metadata = availableAssets.find(a => a.id === asset.asset_id);
  if (metadata?.symbol) return metadata.symbol;

  // Fallback
  return asset.asset_id?.slice(0, 6) || 'UNKNOWN';
}

function getAssetName(asset, availableAssets) {
  if (asset.name) return asset.name;

  const metadata = availableAssets.find(a => a.id === asset.asset_id);
  if (metadata?.name) return metadata.name;

  return 'Unknown Asset';
}
```

### Phase 3: Update Selector for Better Multi-Asset Support

#### File: `daopad_frontend/src/features/orbit/orbitSelectors.ts` (MODIFY)

Add computed total value:

```typescript
// PSEUDOCODE

export const selectFormattedAccounts = createSelector(
  [selectAccountsData, selectAssets, (state, stationId, tokenSymbol) => tokenSymbol],
  (accountsData, assetsData, tokenSymbol) => {
    const { accounts } = accountsData;

    if (!accounts || accounts.length === 0) {
      return [];
    }

    return accounts.map(account => {
      const assets = account.assets || [];

      if (assets.length === 0) {
        return {
          ...account,
          balanceFloat: 0,
          balanceFormatted: 'No assets',
          assets: [],
          totalValueFormatted: 'No assets'
        };
      }

      // Calculate total value across all assets (for sorting)
      // For now, just use first asset as primary
      const primaryAsset = assets[0];
      const balance = primaryAsset.balance?.balance || 0n;
      const decimals = primaryAsset.decimals || 8;
      const balanceFloat = bigintToFloat(balance, decimals);

      // Format each asset with proper metadata
      const formattedAssets = assets.map(asset => {
        const assetId = asset.asset_id;
        const metadata = assetsData[assetId];

        return {
          ...asset,
          symbol: asset.symbol || metadata?.symbol || assetId.slice(0, 6),
          name: asset.name || metadata?.name || 'Unknown',
          decimals: asset.decimals || metadata?.decimals || 8,
        };
      });

      return {
        ...account,
        balance,
        decimals,
        balanceFloat,
        balanceFormatted: formatBalance(balance, decimals, { symbol: primaryAsset.symbol }),
        assets: formattedAssets,
        totalValueFormatted: assets.length === 1
          ? formatBalance(balance, decimals, { symbol: primaryAsset.symbol })
          : `${assets.length} assets`
      };
    });
  }
);
```

---

## Testing Requirements

### Manual Browser Verification (MANDATORY BEFORE Playwright)

**Since Treasury requires Internet Identity authentication, Playwright cannot automate these tests. You MUST verify manually in browser.**

```bash
# After deploying frontend:
# 1. Open https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/treasury
# 2. Login with Internet Identity
# 3. Open browser DevTools (F12)

# VERIFY:
✓ Accounts table loads without console errors
✓ Each account row shows asset count (e.g., "2 assets")
✓ Click account name → row expands showing asset breakdown
✓ Each asset shows:
  - Symbol (ICP, ALEX, etc.)
  - Name (Internet Computer, ALEX, etc.)
  - Balance with correct decimals
  - Status (✓ Current, ⏱ Updating..., etc.)
✓ Click again → row collapses
✓ Transfer button still works (opens dialog with correct asset)
✓ Redux DevTools shows:
  - orbit.accounts.data[stationId].accounts → array with assets[]
  - orbit.assets.data[tokenId] → array of asset metadata
✓ Network tab shows successful backend calls:
  - get_treasury_accounts_with_balances
  - list_treasury_assets
✓ Console has ZERO errors
```

### Console Error Inspection Commands

```bash
# After any deployment, check for errors:

# 1. Browser Console (F12)
# Look for:
# - ❌ Candid decode errors
# - ❌ "Cannot read property of undefined"
# - ❌ Type errors with BigInt
# - ❌ Failed network requests

# 2. Redux DevTools (install extension)
# Check:
# - orbit/fetchAccounts/fulfilled action exists
# - payload has accounts with assets[] array
# - orbit/fetchAssets/fulfilled action exists
# - payload has array of assets with id, symbol, name, decimals

# 3. Network Tab
# Verify:
# - lwsav-iiaaa-aaaap-qp2qq-cai calls return 200 OK
# - Response bodies have expected structure
# - No 500/400 errors
```

### Exit Criteria (When to Stop Iterating)

STOP iterating when ALL of these are true:
1. ✅ Manual browser check: All accounts load, assets display correctly
2. ✅ Expansion/collapse works smoothly
3. ✅ Console has ZERO errors (check with F12)
4. ✅ Redux DevTools shows correct state structure
5. ✅ Network tab: All backend calls succeed (200 OK)
6. ✅ Balance formatting is correct (decimals, symbols)
7. ✅ Transfer button still works with multi-asset selection

DO NOT STOP if:
- ❌ Console has any errors
- ❌ Assets not displaying
- ❌ Expansion not working
- ❌ Redux state malformed
- ❌ Backend calls failing

---

## File Changes Summary

### Modified Files
- `daopad_frontend/src/components/tables/AccountsTable.tsx` - Add expandable multi-asset rows
- `daopad_frontend/src/features/orbit/orbitSelectors.ts` - Add asset metadata merging

### No New Files
All changes are modifications to existing components.

---

## Success Criteria

1. ✅ Manual browser verification passes (all items checked)
2. ✅ No console errors
3. ✅ Redux state properly structured with multi-asset data
4. ✅ All assets per account visible when expanded
5. ✅ Balance formatting correct with proper decimals and symbols
6. ✅ Transfer button works correctly
7. ✅ PR created and passing code review

---

## Dependencies & Constraints

- **Depends On**: PR #104 (backend multi-asset support) - MUST be merged first
- **Test Station**: ALEX token `ysy5f-2qaaa-aaaap-qkmmq-cai` with station `fec7w-zyaaa-aaaaa-qaffq-cai`
- **Authentication**: Manual testing only (Playwright cannot automate II)
- **Deploy Target**: IC mainnet only (no local testing)
- **Backend**: Already deployed in PR #104, no backend changes needed

---

## Implementation Checklist

- [ ] Verify worktree isolation
- [ ] Add expandedAccounts state to AccountsTable
- [ ] Update table header (remove "Account ID", "Blockchain" columns, add "Assets", "Total Value")
- [ ] Modify table rows to be clickable for expansion
- [ ] Add ChevronDown/ChevronRight icons
- [ ] Implement asset breakdown display in expanded row
- [ ] Add helper functions for formatting
- [ ] Fetch asset metadata on mount with fetchTreasuryAssets
- [ ] Update selectors to merge asset metadata
- [ ] Build and deploy frontend
- [ ] Manual browser verification (all criteria)
- [ ] Check console for errors (F12)
- [ ] Verify Redux state structure
- [ ] Verify network calls succeed
- [ ] Create PR
- [ ] Iterate on review feedback
