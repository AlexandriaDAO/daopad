# Frontend Update Plan - ICPI Mint/Burn Fixes

## Overview
This document summarizes the backend changes deployed to mainnet (canister: `ehyav-lqaaa-aaaap-qqc2a-cai`) and outlines the frontend updates needed to support the new mint/burn features.

## Backend Changes Deployed (2025-09-30)

### 1. Enhanced MintStatus Enum
**New Status Variants Added:**
```typescript
type MintStatus =
  | { Pending: null }
  | { CollectingFee: null }
  | { CollectingDeposit: null }
  | { Calculating: null }
  | { Refunding: null }              // NEW: Refund in progress
  | { Minting: null }
  | { Complete: bigint }
  | { Failed: string }
  | { FailedRefunded: string }       // NEW: Failed but deposit refunded
  | { FailedNoRefund: string }       // NEW: Failed and refund also failed
  | { Expired: null }
```

**What Changed:**
- Added automatic refund mechanism for failed mints
- Users now get their deposit back (minus fee) if TVL calculation fails
- Three new states to track refund progress and outcomes

### 2. Removed Zero-Supply Special Case
**What Changed:**
- No longer treats initial mint differently from subsequent mints
- Always uses proportional formula: `new_icpi = (deposit * supply) / tvl`
- Requires canister to be seeded with initial ICPI and tokens before first user mint

**Impact on Frontend:**
- No special UI handling needed for "first mint"
- All mints follow the same flow

### 3. ckUSDT Included in Burn Redemptions
**What Changed:**
- Burning ICPI now returns ckUSDT in addition to tracked tokens (ALEX, ZERO, KONG, BOB)
- Users receive proportional share of ALL canister holdings, including ckUSDT balance
- BurnResult now includes ckUSDT in `successful_transfers` or `failed_transfers`

**Example BurnResult:**
```typescript
{
  successful_transfers: [
    ["ckUSDT", 5000000n],  // NEW: 5 ckUSDT returned
    ["ALEX", 12500000n],
    ["ZERO", 8300000n],
    ["KONG", 4200000n],
    ["BOB", 1100000n]
  ],
  failed_transfers: [],
  icpi_burned: 100000000n
}
```

### 4. Fee Documentation Clarified
**No Frontend Change Required:**
- Fee remains 1 ckUSDT (1,000,000 units with 6 decimals)
- Just documentation improvement in backend code

---

## Frontend Updates Needed

### Priority 1: Update Type Definitions

**File:** `src/icpi_frontend/src/hooks/useICPI.ts` or type definitions file

```typescript
// Update MintStatus type to include new variants
export type MintStatus =
  | { Pending: null }
  | { CollectingFee: null }
  | { CollectingDeposit: null }
  | { Calculating: null }
  | { Refunding: null }              // ADD THIS
  | { Minting: null }
  | { Complete: bigint }
  | { Failed: string }
  | { FailedRefunded: string }       // ADD THIS
  | { FailedNoRefund: string }       // ADD THIS
  | { Expired: null };
```

### Priority 2: Update Mint Status Display

**File:** Wherever mint status is displayed (likely in a minting component)

**Add handling for new statuses:**

```typescript
function getMintStatusDisplay(status: MintStatus): { message: string; type: 'info' | 'success' | 'error' | 'warning' } {
  if ('Pending' in status) return { message: 'Mint pending...', type: 'info' };
  if ('CollectingFee' in status) return { message: 'Collecting fee...', type: 'info' };
  if ('CollectingDeposit' in status) return { message: 'Collecting deposit...', type: 'info' };
  if ('Calculating' in status) return { message: 'Calculating ICPI amount...', type: 'info' };

  // NEW: Add refunding status
  if ('Refunding' in status) return {
    message: 'Refunding your deposit...',
    type: 'warning'
  };

  if ('Minting' in status) return { message: 'Minting ICPI tokens...', type: 'info' };
  if ('Complete' in status) return {
    message: `Successfully minted ${formatICPI(status.Complete)} ICPI`,
    type: 'success'
  };

  // NEW: Differentiate between refunded and non-refunded failures
  if ('FailedRefunded' in status) return {
    message: `Mint failed: ${status.FailedRefunded}. Your deposit has been refunded (fee was kept).`,
    type: 'warning'
  };

  if ('FailedNoRefund' in status) return {
    message: `Mint failed: ${status.FailedNoRefund}. CRITICAL: Please contact support.`,
    type: 'error'
  };

  if ('Failed' in status) return {
    message: `Mint failed: ${status.Failed}`,
    type: 'error'
  };

  if ('Expired' in status) return { message: 'Mint expired', type: 'error' };

  return { message: 'Unknown status', type: 'info' };
}
```

### Priority 3: Update Burn Results Display

**File:** Wherever burn results are displayed (likely in a burning/redemption component)

**Add ckUSDT to the displayed tokens:**

```typescript
function BurnResultDisplay({ result }: { result: BurnResult }) {
  return (
    <div>
      <h3>Burn Complete</h3>
      <p>Burned: {formatICPI(result.icpi_burned)} ICPI</p>

      <h4>Tokens Received:</h4>
      <ul>
        {result.successful_transfers.map(([symbol, amount]) => (
          <li key={symbol}>
            {/* NEW: Handle ckUSDT with proper decimals (6) vs others (8) */}
            {symbol === 'ckUSDT'
              ? formatCkUSDT(amount)  // Format with 6 decimals
              : formatToken(amount, symbol)  // Format with 8 decimals
            } {symbol}
          </li>
        ))}
      </ul>

      {result.failed_transfers.length > 0 && (
        <>
          <h4>Failed Transfers:</h4>
          <ul>
            {result.failed_transfers.map(([symbol, amount, error]) => (
              <li key={symbol} className="error">
                {symbol === 'ckUSDT' ? formatCkUSDT(amount) : formatToken(amount, symbol)} {symbol} - {error}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
```

### Priority 4: Add Decimal Formatting Utilities

**File:** Utility functions file

```typescript
// ckUSDT uses 6 decimals
export function formatCkUSDT(amount: bigint): string {
  const decimals = 6;
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  return `${whole}.${fraction.toString().padStart(decimals, '0')}`;
}

// Most other tokens use 8 decimals
export function formatToken(amount: bigint, symbol: string): string {
  const decimals = 8;  // ALEX, ZERO, KONG, BOB all use 8
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  return `${whole}.${fraction.toString().padStart(decimals, '0')}`;
}

// ICPI uses 8 decimals like ICP
export function formatICPI(amount: bigint): string {
  return formatToken(amount, 'ICPI');
}
```

### Priority 5: Update Burn Preview/Calculation

**Optional Enhancement:** Show estimated ckUSDT + tokens before burning

```typescript
async function calculateBurnPreview(icpiAmount: bigint): Promise<{
  ckusdt: bigint;
  tokens: Array<{ symbol: string; amount: bigint }>;
}> {
  // Query canister's current holdings
  const totalSupply = await actor.icrc1_total_supply();

  // Query ckUSDT balance of ICPI canister
  const ckusdtBalance = await ckusdtActor.icrc1_balance_of({
    owner: ICPI_CANISTER_PRINCIPAL,
    subaccount: []
  });

  // Query tracked token balances
  const alexBalance = await alexActor.icrc1_balance_of({ owner: ICPI_CANISTER_PRINCIPAL, subaccount: [] });
  const zeroBalance = await zeroActor.icrc1_balance_of({ owner: ICPI_CANISTER_PRINCIPAL, subaccount: [] });
  const kongBalance = await kongActor.icrc1_balance_of({ owner: ICPI_CANISTER_PRINCIPAL, subaccount: [] });
  const bobBalance = await bobActor.icrc1_balance_of({ owner: ICPI_CANISTER_PRINCIPAL, subaccount: [] });

  // Calculate proportional amounts: (icpiAmount / totalSupply) * balance
  const proportion = Number(icpiAmount) / Number(totalSupply);

  return {
    ckusdt: BigInt(Math.floor(Number(ckusdtBalance) * proportion)),
    tokens: [
      { symbol: 'ALEX', amount: BigInt(Math.floor(Number(alexBalance) * proportion)) },
      { symbol: 'ZERO', amount: BigInt(Math.floor(Number(zeroBalance) * proportion)) },
      { symbol: 'KONG', amount: BigInt(Math.floor(Number(kongBalance) * proportion)) },
      { symbol: 'BOB', amount: BigInt(Math.floor(Number(bobBalance) * proportion)) }
    ]
  };
}
```

---

## Testing Checklist

### Minting Tests
- [ ] Test normal mint flow - verify all new statuses display correctly
- [ ] Test mint with insufficient ckUSDT - verify fee collection failure
- [ ] Test mint with insufficient approval - verify deposit collection failure
- [ ] Simulate TVL calculation failure (if possible) - verify refund status shows
- [ ] Check that `FailedRefunded` status displays user-friendly message
- [ ] Verify fee (1 ckUSDT) is still collected even on refunded failures

### Burning Tests
- [ ] Burn ICPI and verify ckUSDT appears in results
- [ ] Verify ckUSDT is formatted with 6 decimals (not 8)
- [ ] Verify other tokens (ALEX, ZERO, KONG, BOB) still appear correctly
- [ ] Check proportional calculation is accurate
- [ ] Test burn with small amounts (check dust threshold handling)
- [ ] Verify partial failures display correctly (some transfers succeed, some fail)

### Edge Cases
- [ ] Mint status polling - ensure new statuses don't break polling logic
- [ ] Burn with zero ckUSDT balance in canister - should only return tracked tokens
- [ ] Burn result history - ensure new ckUSDT field doesn't break old records
- [ ] Error messages are user-friendly and actionable

---

## Breaking Changes to Consider

### Candid Interface Change
The MintStatus enum has new variants, which is a **breaking change** in the Candid interface. This means:

1. **Existing pending mints** from before the upgrade may have compatibility issues
2. **Frontend must be updated** before users try to mint again
3. Consider adding a **migration notice** or **maintenance window**

### Recommended Deployment Strategy
1. ✅ Deploy backend (DONE - deployed to mainnet)
2. Update frontend type definitions
3. Update frontend UI components
4. Test thoroughly on mainnet with small amounts
5. Deploy frontend
6. Announce new features (automatic refunds, ckUSDT in burns)

---

## User-Facing Improvements to Highlight

### 1. Safer Minting
- **Automatic Refunds:** If minting fails after deposit collection, users automatically get their deposit back (minus the 1 ckUSDT fee)
- **Clear Status:** Users can see exactly what stage their mint is in
- **No Stuck Funds:** Refund mechanism prevents deposits from being locked in failed mints

### 2. Complete Burn Redemption
- **Full Value Return:** Burning ICPI now returns ckUSDT holdings in addition to tracked tokens
- **No Value Loss:** Users receive proportional share of ALL canister assets
- **Transparent Results:** Clear breakdown of exactly what tokens were received

### 3. Simpler Mint Logic
- **Consistent Formula:** All mints use the same proportional calculation
- **No Special Cases:** Same user experience whether it's the first mint or the 1000th

---

## Constants Reference

```typescript
// Canister IDs (Mainnet)
export const ICPI_CANISTER = 'ehyav-lqaaa-aaaap-qqc2a-cai';      // ICPI Backend
export const CKUSDT_CANISTER = 'cngnf-vqaaa-aaaar-qag4q-cai';    // ckUSDT Token
export const FEE_RECIPIENT = 'e454q-riaaa-aaaap-qqcyq-cai';      // Fee Collection

// Token Canisters
export const ALEX_CANISTER = 'ysy5f-2qaaa-aaaap-qkmmq-cai';      // 8 decimals
export const ZERO_CANISTER = 'b3d2q-ayaaa-aaaap-qqcfq-cai';      // 8 decimals
export const KONG_CANISTER = 'xnjld-hqaaa-aaaar-qah4q-cai';      // 8 decimals
export const BOB_CANISTER = '7pail-xaaaa-aaaas-aabmq-cai';       // 8 decimals

// Decimals
export const CKUSDT_DECIMALS = 6;
export const ICPI_DECIMALS = 8;
export const TOKEN_DECIMALS = 8;  // ALEX, ZERO, KONG, BOB

// Fee
export const MINT_BURN_FEE = 1_000_000n;  // 1.0 ckUSDT (6 decimals)
```

---

## Summary

**Backend deployed:** ✅ All 4 critical fixes live on mainnet
**Frontend status:** ⏳ Needs updates to support new features
**Priority:** High - Users should not mint until frontend is updated
**Estimated effort:** 2-4 hours for frontend updates + testing

**Next Steps:**
1. Update type definitions in frontend
2. Add UI handling for new mint statuses (especially refund states)
3. Add ckUSDT to burn results display
4. Test thoroughly with small amounts on mainnet
5. Deploy frontend updates
