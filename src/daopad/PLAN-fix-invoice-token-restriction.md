# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-fix-invoice-token-restriction/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-fix-invoice-token-restriction/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes only:
     ```bash
     cd daopad_frontend
     npm run build
     cd ..
     ./deploy.sh --network ic --frontend-only
     ```
4. **Test on mainnet**:
   - Navigate to https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io
   - Login and access 6ULQE-QA DAO
   - Verify Invoices tab shows CreateInvoice UI (not "Coming Soon")
   - Test creating an invoice (use test amounts)
5. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "Fix: Remove token restriction on invoice functionality

- Remove incorrect token gate blocking custom DAOs from invoices
- Add collateral selector (ICP/ckUSDT) in CreateInvoice dialog
- Update balance display to show selected collateral balance
- Invoices are payment infrastructure, not token-specific features

Fixes issue where DAOs with custom tokens (like 6ULQE-QA) couldn't
create invoices even though invoices work with ICP/ckUSDT regardless
of the DAO's native token."
   git push -u origin feature/fix-invoice-token-restriction
   gh pr create --title "Fix: Remove Token Restriction on Invoice Functionality" --body "## Problem
DAOs with custom tokens (like \"6ULQE-QA\") are incorrectly blocked from creating invoices, even though invoices are token-agnostic payment infrastructure.

## Root Cause
The code incorrectly ties invoice support to the DAO's native token symbol, when invoices should be available to all DAOs regardless of their token.

## Solution
- Remove token gate in DaoInvoices.tsx
- Add collateral selector (ICP/ckUSDT) in CreateInvoice dialog
- Update balance display logic to show selected collateral balance

## Testing
Verified on mainnet with 6ULQE-QA DAO that invoices are now accessible and functional.

Implements PLAN-fix-invoice-token-restriction.md"
   ```
6. **Iterate autonomously**:
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

**Branch:** `feature/fix-invoice-token-restriction`
**Worktree:** `/home/theseus/alexandria/daopad-fix-invoice-token-restriction/src/daopad`

---

# Implementation Plan: Fix Invoice Token Restriction

## Problem Statement

**Current Behavior:**
- DAOs with custom tokens (e.g., "6ULQE-QA") see "Coming Soon" message on Invoices tab
- Invoice functionality is artificially gated by DAO's native token symbol
- Only ICP, ckUSDT, and USDT token DAOs can access invoices

**Why This Is Wrong:**
Invoices are **payment infrastructure**, not token-specific features. The workflow is:
1. Create Stripe payment link for $X USD
2. Someone pays via credit card
3. System converts USD → crypto (ICP or ckUSDT)
4. System sends crypto to treasury principal

**The DAO's native token is irrelevant** - invoices just get ICP/ckUSDT into the treasury.

## Current State Analysis

### File 1: `daopad_frontend/src/routes/dao/DaoInvoices.tsx`

**Lines 10-14: Token validation function**
```typescript
const isSupportedToken = (tokenSymbol?: string): boolean => {
  if (!tokenSymbol) return false;
  const symbol = tokenSymbol.toUpperCase();
  return symbol === 'ICP' || symbol === 'CKUSDT' || symbol === 'USDT';
};
```

**Lines 17-52: Conditional rendering of "Coming Soon" card**
- Blocks entire InvoicesPage component
- Shows misleading message about token support

**Lines 54-61: Pass-through to InvoicesPage**
- Only reached if token check passes

### File 2: `daopad_frontend/src/components/invoices/CreateInvoice.tsx`

**Lines 36-43: Auto-select collateral based on DAO token**
```typescript
const getCollateralForToken = (tokenSymbol?: string): 'ICP' | 'ckUSDT' => {
  if (!tokenSymbol) return 'ICP';
  const symbol = tokenSymbol.toUpperCase();
  return symbol === 'CKUSDT' || symbol === 'USDT' ? 'ckUSDT' : 'ICP';
};

const collateral = getCollateralForToken(token?.symbol);
```

**Problem:** No user choice - collateral is auto-determined by DAO token

### File 3: `daopad_frontend/src/pages/InvoicesPage.tsx`

**Lines 36-57: Balance loading based on token symbol**
```typescript
const tokenSymbol = token.symbol?.toUpperCase();
if (tokenSymbol === 'ICP') {
  // Load ICP balance
} else if (tokenSymbol === 'CKUSDT' || tokenSymbol === 'USDT') {
  // Load ckUSDT balance
} else {
  setCanisterBalance('Unsupported token');
}
```

**Problem:** Shows "Unsupported token" for custom tokens

## Implementation

### Change 1: Remove Token Gate (DaoInvoices.tsx)

**File:** `daopad_frontend/src/routes/dao/DaoInvoices.tsx`

**Action:** MODIFY - Delete lines 9-52 (entire token check and "Coming Soon" card)

**New implementation (PSEUDOCODE):**
```typescript
import { useOutletContext } from 'react-router-dom';
import InvoicesPage from '../../pages/InvoicesPage';

export default function DaoInvoices() {
  const { token, orbitStation, identity, isAuthenticated } = useOutletContext<any>();

  // All DAOs can use invoices - no token restriction
  return (
    <InvoicesPage
      token={token}
      orbitStation={orbitStation}
      identity={identity}
      isAuthenticated={isAuthenticated}
    />
  );
}
```

**Result:**
- File shrinks from 63 lines to ~15 lines
- No more token checking
- All DAOs can access InvoicesPage

### Change 2: Add Collateral Selector (CreateInvoice.tsx)

**File:** `daopad_frontend/src/components/invoices/CreateInvoice.tsx`

**Action:** MODIFY - Replace auto-selection with user choice

**New state (PSEUDOCODE):**
```typescript
// Add new state for collateral selection
const [collateral, setCollateral] = useState<'ICP' | 'ckUSDT'>('ICP');

// DELETE the getCollateralForToken function (lines 36-41)
// DELETE the auto-assignment: const collateral = ... (line 43)
```

**New UI section (PSEUDOCODE - add after description input, before payment token display):**
```typescript
{/* Collateral Selection */}
<div className="space-y-2">
  <Label>Payment Currency *</Label>
  <div className="grid grid-cols-2 gap-3">
    <Button
      type="button"
      variant={collateral === 'ICP' ? "default" : "outline"}
      onClick={() => setCollateral('ICP')}
      disabled={isCreating}
      className="flex items-center justify-center gap-2"
    >
      <div className={`w-3 h-3 rounded-full ${collateral === 'ICP' ? 'bg-white' : 'bg-gray-400'}`} />
      ICP
    </Button>
    <Button
      type="button"
      variant={collateral === 'ckUSDT' ? "default" : "outline"}
      onClick={() => setCollateral('ckUSDT')}
      disabled={isCreating}
      className="flex items-center justify-center gap-2"
    >
      <div className={`w-3 h-3 rounded-full ${collateral === 'ckUSDT' ? 'bg-white' : 'bg-gray-400'}`} />
      ckUSDT
    </Button>
  </div>
  <p className="text-xs text-gray-500">
    Choose which cryptocurrency to receive after USD payment conversion
  </p>
</div>
```

**Update payment token display section (lines 230-248):**
```typescript
{/* Payment Token Display - Update to show selected collateral */}
<div className="space-y-2">
  <Label>Selected Payment Currency</Label>
  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
    <div className={`px-2 py-1 rounded text-xs font-medium ${
      collateral === 'ICP'
        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
        : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    }`}>
      {collateral}
    </div>
    <span className="text-sm text-blue-800 dark:text-blue-200">
      {collateral === 'ICP' ? 'Internet Computer' : 'Chain Key USDT'}
    </span>
  </div>
  <p className="text-xs text-gray-500">
    USD payments will be converted to {collateral} and sent to the treasury account
  </p>
</div>
```

**Result:**
- Users explicitly choose ICP or ckUSDT
- No dependency on DAO's native token
- Clear UI for payment currency selection

### Change 3: Update Balance Display (InvoicesPage.tsx)

**File:** `daopad_frontend/src/pages/InvoicesPage.tsx`

**Action:** MODIFY - Remove token-based balance logic

**Option A: Show both balances (RECOMMENDED - PSEUDOCODE):**
```typescript
// Replace single balance state with dual balance
const [icpBalance, setIcpBalance] = useState<string>('Loading...');
const [ckusdtBalance, setCkusdtBalance] = useState<string>('Loading...');
const [isLoadingBalance, setIsLoadingBalance] = useState(false);

const loadCanisterBalances = async () => {
  if (!identity) return;

  try {
    setIsLoadingBalance(true);
    const invoiceService = getInvoiceService(identity);

    // Load ICP balance
    const icpResult = await invoiceService.getCanisterIcpBalance();
    if (icpResult.success) {
      const balance = Number(icpResult.data) / 100_000_000;
      setIcpBalance(`${balance.toFixed(8)} ICP`);
    } else {
      setIcpBalance('Error loading');
    }

    // Load ckUSDT balance
    const ckusdtResult = await invoiceService.getCanisterCkUsdtBalance();
    if (ckusdtResult.success) {
      const balance = Number(ckusdtResult.data) / 1_000_000;
      setCkusdtBalance(`${balance.toFixed(6)} ckUSDT`);
    } else {
      setCkusdtBalance('Error loading');
    }

  } catch (error) {
    console.error('Failed to load balances:', error);
    setIcpBalance('Error loading');
    setCkusdtBalance('Error loading');
  } finally {
    setIsLoadingBalance(false);
  }
};

// Update useEffect
useEffect(() => {
  loadCanisterBalances();
}, [identity]);  // Remove token dependency
```

**Update UI to show both balances (PSEUDOCODE):**
```typescript
{/* Info Cards - Update to show both balances */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {/* Canister ID Card */}
  <Card className="bg-executive-darkGray border-executive-mediumGray">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-executive-ivory text-lg">
        <Server className="h-5 w-5 text-executive-gold" />
        Backend Canister
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <p className="text-sm text-executive-lightGray/70">Canister ID:</p>
        <p className="font-mono text-sm text-executive-ivory bg-executive-mediumGray/30 p-2 rounded border">
          {canisterId}
        </p>
      </div>
    </CardContent>
  </Card>

  {/* ICP Balance Card */}
  <Card className="bg-executive-darkGray border-executive-mediumGray">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center justify-between text-executive-ivory text-lg">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-executive-gold" />
          ICP Balance
        </div>
        <Button
          onClick={loadCanisterBalances}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={isLoadingBalance}
        >
          <RefreshCw className={`h-4 w-4 ${isLoadingBalance ? 'animate-spin' : ''}`} />
        </Button>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-lg font-semibold text-executive-ivory">{icpBalance}</p>
    </CardContent>
  </Card>

  {/* ckUSDT Balance Card */}
  <Card className="bg-executive-darkGray border-executive-mediumGray">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-executive-ivory text-lg">
        <Wallet className="h-5 w-5 text-executive-gold" />
        ckUSDT Balance
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-lg font-semibold text-executive-ivory">{ckusdtBalance}</p>
    </CardContent>
  </Card>
</div>
```

**Result:**
- Shows both ICP and ckUSDT balances
- No "Unsupported token" errors
- Single refresh button updates both balances
- Works for all DAOs regardless of native token

## Testing Strategy

### Manual Testing on Mainnet (MANDATORY)

**Prerequisites:**
- Mainnet deployment: `./deploy.sh --network ic --frontend-only`
- Frontend URL: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io

**Test Case 1: Access Invoice Tab (6ULQE-QA DAO)**
```
1. Navigate to 6ULQE-QA DAO in production
2. Click "Invoices" tab in navigation
3. VERIFY: InvoicesPage renders (not "Coming Soon" card)
4. VERIFY: "Create Invoice" button visible
5. VERIFY: Both ICP and ckUSDT balance cards shown
```

**Test Case 2: Create Invoice with ICP**
```
1. Click "Create Invoice" button
2. Select amount: $25
3. VERIFY: ICP/ckUSDT radio buttons visible
4. Select: ICP
5. Enter receiver: (test principal)
6. Enter description: "Test invoice"
7. Click "Create Invoice"
8. VERIFY: No errors in browser console
9. VERIFY: Invoice created successfully or proper error message
10. VERIFY: Invoice appears in invoice list
```

**Test Case 3: Create Invoice with ckUSDT**
```
1. Click "Create Invoice" button
2. Select amount: $10
3. Select: ckUSDT
4. Enter receiver: (test principal)
5. Enter description: "ckUSDT test"
6. Click "Create Invoice"
7. VERIFY: No errors in browser console
8. VERIFY: Invoice created with ckUSDT collateral
```

**Test Case 4: Verify Other DAOs Still Work**
```
1. Navigate to ICP native DAO (if exists)
2. Access Invoices tab
3. VERIFY: No regressions
4. Navigate to ckUSDT native DAO (if exists)
5. Access Invoices tab
6. VERIFY: No regressions
```

### Console Error Checks

**After each deployment:**
```bash
# Open browser console (F12) on production
# Navigate to: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io

# Check for errors when accessing invoice tab:
# 1. Click Invoices tab
# 2. Look for red errors in console
# 3. Common issues:
#    - Component render errors
#    - Missing props errors
#    - API call failures

# Check CreateInvoice dialog:
# 1. Click "Create Invoice"
# 2. Verify dialog opens without errors
# 3. Test radio button clicks
# 4. Verify no React warnings
```

**Exit Criteria:**
- ✅ 6ULQE-QA DAO can access Invoices tab
- ✅ Invoice creation dialog opens successfully
- ✅ Collateral selector visible and functional
- ✅ Both balance cards display correctly
- ✅ No console errors during navigation
- ✅ Invoice creation works with test data
- ✅ No regressions on existing ICP/ckUSDT DAOs

### Iteration Loop

**IF tests fail:**
```bash
# 1. Identify specific failure
# 2. Check browser console for errors
# 3. Fix the issue in code
# 4. Rebuild: npm run build
# 5. Redeploy: ./deploy.sh --network ic --frontend-only
# 6. Wait 60 seconds for deployment
# 7. Hard refresh browser (Ctrl+Shift+R)
# 8. Re-run test cases
# 9. REPEAT until all tests pass
```

**STOP iterating when:**
- All test cases pass ✅
- No console errors ✅
- Invoice creation successful ✅

## File Change Summary

**Files Modified:** 3
**Files Created:** 0
**Files Deleted:** 0

**Net Lines of Code:**
- DaoInvoices.tsx: -48 lines (deletion of token gate)
- CreateInvoice.tsx: +35 lines (collateral selector UI)
- InvoicesPage.tsx: +20 lines (dual balance display)
- **Total: +7 lines** (minimal change for bug fix)

## Risk Assessment

**Low Risk:**
- Frontend-only changes
- No backend modifications
- No database migrations
- No type changes
- Additive feature (radio buttons)
- Subtractive feature (removing gate)

**Potential Issues:**
- Users might be confused by collateral choice → Mitigated by clear labels
- Balance display might take time to load → Already has loading state
- Invoice creation might fail for custom DAOs → Same backend logic, just UI change

**Rollback Plan:**
If issues occur, revert PR and redeploy previous version. No data loss risk.

## Success Criteria

**Definition of Done:**
1. ✅ DaoInvoices.tsx removes token restriction
2. ✅ CreateInvoice.tsx adds collateral selector
3. ✅ InvoicesPage.tsx shows both balances
4. ✅ All tests pass on mainnet
5. ✅ PR created with description and testing evidence
6. ✅ No console errors in production
7. ✅ 6ULQE-QA DAO can create invoices

**Validation:**
- Manual testing on 6ULQE-QA DAO ✅
- Visual inspection of UI ✅
- Console error check ✅
- Invoice creation smoke test ✅
