# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-treasury-ui-v2/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-treasury-ui-v2/src/daopad`
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
4. **Manual Browser Verification** (MANDATORY - Playwright cannot test authenticated features):
   ```bash
   # Open https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/treasury
   # Login with Internet Identity
   # Check F12 console for errors FIRST (most important!)
   # Verify:
   # 1. Accounts table loads without errors
   # 2. Each account shows asset count badge (e.g., "2 assets")
   # 3. Click account name row → expands to show asset breakdown
   # 4. Each asset displays: symbol (ICP/ALEX), name, balance with decimals, status
   # 5. Click again → collapses
   # 6. Transfer button still works
   # 7. Redux DevTools: accounts have assets[] array, assets metadata loaded
   ```
5. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Feature]: Treasury Multi-Asset UI - Expandable Asset Display

## Summary
Completes multi-asset treasury feature by adding UI to display all assets per account.

## Changes
- Updated AccountsTable with expandable rows for multi-asset accounts
- Click account row to expand/collapse asset breakdown
- Shows asset count badge, individual asset details with proper formatting
- Fetches asset metadata for symbol/name lookup
- Updated table columns for better multi-asset display

## Testing
- Manual browser verification completed (see plan for checklist)
- All assets display correctly with proper symbols and decimals
- Expansion/collapse works smoothly
- No console errors
- Transfer button works with multi-asset accounts

## Depends On
- PR #104 (merged) - Backend multi-asset support"
   git push -u origin feature/treasury-multi-asset-ui-v2
   gh pr create --title "[Feature]: Treasury Multi-Asset UI - Expandable Asset Display" --body "Implements TREASURY_MULTI_ASSET_UI_PLAN.md

## Summary
Completes the multi-asset treasury feature by updating the UI to display all assets per account (not just the first asset).

## What Users Will See
- **Before**: Only first asset balance shown, no way to see other assets
- **After**: Click account row → expands to show all assets with individual balances

## Changes Made
- Expandable table rows (click to expand/collapse)
- Asset count badge showing number of assets per account
- Individual asset breakdown with symbol, name, balance, and status
- Asset metadata fetching on page load
- Simplified table columns for multi-asset display

## Manual Testing Completed
- ✅ No console errors
- ✅ All assets display correctly
- ✅ Expansion/collapse works
- ✅ Transfer button works
- ✅ Redux state correct

## Dependencies
- Requires PR #104 (already merged) - backend multi-asset support
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

**Branch:** `feature/treasury-multi-asset-ui-v2`
**Worktree:** `/home/theseus/alexandria/daopad-treasury-ui-v2/src/daopad`
**Depends On:** PR #104 (already merged in master)

---

# Implementation Plan: Treasury Multi-Asset UI

## Problem Statement

**Current behavior**: AccountsTable.tsx line 276 displays `account.balanceFormatted` which shows **only the first asset's balance**.

```typescript
// Line 276 - PROBLEM: Only shows first asset
<TableCell className="text-right font-mono" data-testid="account-balance">
  {account.balanceFormatted}  // ← First asset only!
</TableCell>
```

**Impact**: Users with accounts holding multiple assets (e.g., ICP + ALEX + DAO tokens) cannot see their complete portfolio. The data layer is complete (PR #104 merged), but the UI doesn't expose it.

**What exists but is unused**:
- `account.assets` array contains all assets (line 91)
- Redux has complete multi-asset data from backend
- Transfer button already handles multi-asset selection (lines 76-178)

---

## Current State Analysis

### File: `daopad_frontend/src/components/tables/AccountsTable.tsx`

**Lines 245-252**: Table header defines 5 columns
```typescript
<TableHead>Account Name</TableHead>
<TableHead>Account ID</TableHead>      // ← Will remove
<TableHead>Blockchain</TableHead>       // ← Will remove
<TableHead className="text-right">Balance</TableHead>  // ← Will change
<TableHead className="text-right">Actions</TableHead>
```

**Lines 262-289**: Single row per account (no expansion)
```typescript
accounts.map((account) => (
  <TableRow key={account.id}>
    <TableCell>{account.name}</TableCell>
    <TableCell>{account.id.slice(0, 8)}...</TableCell>
    <TableCell><Badge>{account.blockchain}</Badge></TableCell>
    <TableCell>{account.balanceFormatted}</TableCell>  // ← Problem!
    <TableCell><Button>Transfer</Button></TableCell>
  </TableRow>
))
```

**Lines 48-59**: Fetches multi-asset data correctly
```typescript
dispatch(fetchOrbitAccounts({
  stationId,
  identity: identity || null,
  tokenId,
  // ... correctly calls backend that returns accounts with assets[]
}));
```

**Missing**:
- State to track which accounts are expanded
- Chevron icons for expand/collapse
- Expanded row content showing asset breakdown
- Asset metadata fetch on mount

### File: `daopad_frontend/src/features/orbit/orbitSelectors.ts`

**Lines 44-107**: `selectFormattedAccounts` selector
```typescript
// Line 78: Takes ONLY first asset for display
const primaryAsset = existingAssets[0];
const balanceFormatted = formatBalance(balance, decimals, { symbol });

return {
  ...account,
  balanceFormatted,  // ← Only first asset
  assets: existingAssets,  // ← Full array available but unused in UI
};
```

**What we need**:
- Keep `balanceFormatted` for sorting/filtering
- Add per-asset formatting
- Asset metadata merging

---

## Implementation Plan

### Phase 1: Add Expandable Row State

#### File: `daopad_frontend/src/components/tables/AccountsTable.tsx` (MODIFY)

```typescript
// PSEUDOCODE

import { ChevronDown, ChevronRight } from 'lucide-react';

export default function AccountsTable({ stationId, identity, tokenId, tokenSymbol, votingPower }) {
  // ... existing state ...

  // NEW: Track expanded accounts
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());

  const toggleExpand = (accountId) => {
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

  // ... rest of existing code ...
}
```

### Phase 2: Fetch Asset Metadata on Mount

#### File: `daopad_frontend/src/components/tables/AccountsTable.tsx` (ADD)

```typescript
// PSEUDOCODE

import { fetchTreasuryAssets } from '@/features/orbit/orbitSlice';

export default function AccountsTable({ ... }) {
  // ... existing code ...

  // NEW: Fetch asset metadata for symbols/names
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
    const tokenAssets = state.orbit.assets?.data?.[tokenId];
    return Array.isArray(tokenAssets) ? tokenAssets : [];
  });

  // ... rest of component ...
}
```

### Phase 3: Update Table Structure

#### File: `daopad_frontend/src/components/tables/AccountsTable.tsx` (MODIFY)

```typescript
// PSEUDOCODE

// REPLACE lines 245-252 (table header)
<TableHeader>
  <TableRow>
    <TableHead>Account</TableHead>
    <TableHead>Assets</TableHead>
    <TableHead className="text-right">Portfolio Value</TableHead>
    <TableHead className="text-right">Actions</TableHead>
  </TableRow>
</TableHeader>

// REPLACE lines 262-289 (table body)
<TableBody>
  {accounts.length === 0 ? (
    <TableRow>
      <TableCell colSpan={4} className="text-center">
        No accounts found
      </TableCell>
    </TableRow>
  ) : (
    accounts.map((account) => {
      const isExpanded = expandedAccounts.has(account.id);
      const assetCount = account.assets?.length || 0;

      return (
        <React.Fragment key={account.id}>
          {/* Main row - clickable */}
          <TableRow
            onClick={() => toggleExpand(account.id)}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            data-testid="treasury-account"
          >
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span>{account.name || 'Unnamed Account'}</span>
              </div>
            </TableCell>

            <TableCell>
              <Badge variant="secondary">
                {assetCount} {assetCount === 1 ? 'asset' : 'assets'}
              </Badge>
            </TableCell>

            <TableCell className="text-right font-mono">
              {getPortfolioValue(account, availableAssets)}
            </TableCell>

            <TableCell className="text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation(); // Don't trigger row expansion
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
                  {account.assets.map((asset) => {
                    const metadata = getAssetMetadata(asset, availableAssets);
                    return (
                      <div
                        key={asset.asset_id}
                        className="flex items-center justify-between py-2 px-3 rounded-md bg-background border"
                        data-testid="asset-detail-row"
                      >
                        <div className="flex items-center gap-3">
                          {/* Asset icon */}
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-semibold">
                              {metadata.symbol.charAt(0).toUpperCase()}
                            </span>
                          </div>

                          {/* Asset name/symbol */}
                          <div>
                            <div className="font-medium" data-testid="asset-symbol">
                              {metadata.symbol}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {metadata.name}
                            </div>
                          </div>
                        </div>

                        {/* Balance */}
                        <div className="text-right">
                          <div className="font-mono" data-testid="asset-balance">
                            {formatAssetBalance(asset, metadata)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {getBalanceStatus(asset)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TableCell>
            </TableRow>
          )}
        </React.Fragment>
      );
    })
  )}
</TableBody>
```

### Phase 4: Add Helper Functions

#### File: `daopad_frontend/src/components/tables/AccountsTable.tsx` (ADD)

```typescript
// PSEUDOCODE

// Get asset metadata (symbol, name, decimals)
function getAssetMetadata(asset, availableAssets) {
  // Try asset's own metadata first
  if (asset.symbol && asset.name) {
    return {
      symbol: asset.symbol,
      name: asset.name,
      decimals: asset.decimals || 8
    };
  }

  // Lookup from available assets
  const metadata = availableAssets.find(a => a.id === asset.asset_id);
  if (metadata) {
    return {
      symbol: metadata.symbol || asset.asset_id.slice(0, 6),
      name: metadata.name || 'Unknown Asset',
      decimals: metadata.decimals || 8
    };
  }

  // Fallback
  return {
    symbol: asset.asset_id?.slice(0, 6) || 'UNKNOWN',
    name: 'Unknown Asset',
    decimals: 8
  };
}

// Format individual asset balance
function formatAssetBalance(asset, metadata) {
  const balance = asset.balance?.balance || asset.balance || 0n;
  const decimals = asset.balance?.decimals || metadata.decimals || 8;

  if (typeof balance === 'bigint') {
    const divisor = 10n ** BigInt(decimals);
    const integerPart = balance / divisor;
    const fractionalPart = balance % divisor;
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0').slice(0, 2);
    return `${integerPart}.${fractionalStr} ${metadata.symbol}`;
  }

  return `0.00 ${metadata.symbol}`;
}

// Get balance status text
function getBalanceStatus(asset) {
  const queryState = asset.balance?.query_state;

  if (queryState === 'fresh') return '✓ Current';
  if (queryState === 'stale') return '⏱ Updating...';
  if (queryState === 'stale_refreshing') return '🔄 Refreshing...';
  if (!asset.balance) return 'No balance data';

  return 'Unknown status';
}

// Calculate portfolio value for main row
function getPortfolioValue(account, availableAssets) {
  const assets = account.assets || [];

  if (assets.length === 0) {
    return <span className="text-muted-foreground">No assets</span>;
  }

  if (assets.length === 1) {
    const asset = assets[0];
    const metadata = getAssetMetadata(asset, availableAssets);
    return formatAssetBalance(asset, metadata);
  }

  // Multiple assets - show summary
  return (
    <span className="text-muted-foreground">
      Multi-asset portfolio
    </span>
  );
}
```

---

## Testing Requirements

### ⚠️ CRITICAL: Manual Browser Testing Only

**Playwright CANNOT test this feature** because Treasury requires Internet Identity authentication, which Playwright cannot automate (see PLAYWRIGHT_TESTING_GUIDE.md lines 56-76).

### Manual Browser Verification Workflow

```bash
# STEP 1: Deploy frontend
cd daopad_frontend
npm run build
cd ..
./deploy.sh --network ic --frontend-only

# STEP 2: Open browser
# URL: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai/treasury

# STEP 3: Login with Internet Identity

# STEP 4: Open DevTools (F12) and check console FIRST
# ✅ Zero errors = good
# ❌ Any errors = stop and fix

# STEP 5: Visual verification checklist
✓ Accounts table loads
✓ Each row shows:
  - Account name with chevron icon (collapsed state: ChevronRight)
  - Asset count badge (e.g., "2 assets")
  - Portfolio value or "Multi-asset portfolio"
  - Transfer button

✓ Click account row:
  - Chevron changes to ChevronDown
  - Row expands showing asset breakdown
  - Each asset shows:
    * Icon with first letter of symbol
    * Symbol (ICP, ALEX, etc.)
    * Name (Internet Computer, ALEX, etc.)
    * Balance with 2 decimals and symbol
    * Status (✓ Current, ⏱ Updating..., etc.)

✓ Click row again:
  - Collapses smoothly
  - Chevron returns to ChevronRight

✓ Transfer button:
  - Still works
  - Opens dialog with correct asset
  - Handles multi-asset accounts correctly

# STEP 6: Redux DevTools verification
✓ orbit.accounts.data[stationId].accounts → array with assets[] on each
✓ orbit.assets.data[tokenId] → array of asset metadata
✓ No undefined or null in critical paths

# STEP 7: Network tab verification
✓ get_treasury_accounts_with_balances → 200 OK
✓ list_treasury_assets → 200 OK
✓ No 500/400 errors
✓ Response bodies have expected structure
```

### Console Error Inspection

```bash
# After deployment, check browser console (F12):

# GOOD (no errors):
[Redux Action] orbit/fetchAccounts/pending
[Redux Action] orbit/fetchAccounts/fulfilled
[Redux Action] orbit/fetchAssets/fulfilled

# BAD (errors to fix):
❌ TypeError: Cannot read property 'balance' of undefined
❌ SyntaxError: Invalid BigInt syntax
❌ Candid decode error
❌ Failed to fetch
```

### Exit Criteria

**STOP iterating when ALL true:**
1. ✅ Console has ZERO errors (F12)
2. ✅ All accounts load and display
3. ✅ Expansion/collapse works smoothly
4. ✅ All assets display with correct symbols and balances
5. ✅ Transfer button works
6. ✅ Redux state correct (DevTools check)
7. ✅ Network calls succeed (200 OK)

**DO NOT STOP if:**
- ❌ Any console errors exist
- ❌ Assets not displaying
- ❌ Expansion broken
- ❌ Symbols/balances wrong
- ❌ Redux state malformed

---

## File Changes Summary

### Modified Files
- `daopad_frontend/src/components/tables/AccountsTable.tsx`
  - Add `expandedAccounts` state
  - Add `fetchTreasuryAssets` on mount
  - Update table header (4 columns instead of 5)
  - Replace table rows with expandable version
  - Add helper functions for formatting

### No New Files
All changes are modifications to existing components. No new files needed.

---

## Success Criteria

1. ✅ Manual browser verification passes (all checklist items)
2. ✅ Console has ZERO errors
3. ✅ Redux state correct structure
4. ✅ All assets visible when expanded
5. ✅ Balance formatting correct (decimals, symbols)
6. ✅ Transfer button works
7. ✅ PR created and approved

---

## Dependencies & Constraints

- **Depends On**: PR #104 (already merged) - backend multi-asset support with HashMap fixes
- **Test Station**: ALEX token `ysy5f-2qaaa-aaaap-qkmmq-cai` with station `fec7w-zyaaa-aaaaa-qaffq-cai`
- **Authentication**: Manual testing only (Playwright cannot automate II auth)
- **Deploy Target**: IC mainnet only
- **Backend**: No changes needed (already deployed)

---

## Implementation Checklist

- [ ] Verify worktree isolation
- [ ] Import ChevronDown, ChevronRight from lucide-react
- [ ] Add expandedAccounts useState
- [ ] Add toggleExpand function
- [ ] Add useEffect to fetch asset metadata
- [ ] Add availableAssets selector
- [ ] Update table header (4 columns)
- [ ] Replace table rows with expandable version
- [ ] Add asset detail rows in expanded state
- [ ] Add helper functions (getAssetMetadata, formatAssetBalance, getBalanceStatus, getPortfolioValue)
- [ ] Build frontend (npm run build)
- [ ] Deploy to IC (./deploy.sh --network ic --frontend-only)
- [ ] Manual browser verification (full checklist)
- [ ] Check console for errors (F12)
- [ ] Verify Redux state (DevTools)
- [ ] Verify network calls (200 OK)
- [ ] Create PR
- [ ] Iterate on review feedback
