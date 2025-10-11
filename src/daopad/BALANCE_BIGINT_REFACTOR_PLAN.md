# Balance BigInt Refactor - Implementation Plan

## 🚨 MANDATORY: ISOLATION CHECK AND EXECUTION PROMPT

### Context: Worktree Already Created

**This plan was created by the planning agent in an isolated worktree.**

**Location:** `/home/theseus/alexandria/daopad-balance-refactor/src/daopad`
**Branch:** `feature/balance-bigint-refactor`
**Plan file:** `BALANCE_BIGINT_REFACTOR_PLAN.md` (in this worktree)

### Step 0: Verify Isolation (RUN THIS FIRST!)

```bash
# STOP! Verify you are in the correct worktree
REPO_ROOT=$(git rev-parse --show-toplevel)
CURRENT_BRANCH=$(git branch --show-current)

# Check you're NOT in main repo
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: You are in the MAIN repository"
    echo "❌ This plan was created in a worktree at:"
    echo "    /home/theseus/alexandria/daopad-balance-refactor"
    echo ""
    echo "Navigate to the worktree:"
    echo "  cd /home/theseus/alexandria/daopad-balance-refactor/src/daopad"
    echo "  cat BALANCE_BIGINT_REFACTOR_PLAN.md  # Plan is here"
    exit 1
fi

# Check you're on the right branch
if [ "$CURRENT_BRANCH" != "feature/balance-bigint-refactor" ]; then
    echo "❌ WARNING: You are on branch '$CURRENT_BRANCH'"
    echo "Expected: feature/balance-bigint-refactor"
    echo "Are you in the right worktree?"
    exit 1
fi

echo "✅ You are in the correct worktree: $REPO_ROOT"
echo "✅ On branch: $CURRENT_BRANCH"
echo "✅ Safe to proceed with implementation"
```

### Your Execution Prompt

You are an autonomous PR orchestrator implementing the Balance BigInt Refactor.

**NOTE:** The planning agent already created this worktree and this plan. You will navigate there and execute.

EXECUTE THESE STEPS AUTONOMOUSLY (DO NOT ASK FOR PERMISSION):

**Step 0 - NAVIGATE TO WORKTREE (DO THIS FIRST):**
```bash
cd /home/theseus/alexandria/daopad-balance-refactor/src/daopad
```

**Step 1 - VERIFY ISOLATION:**
```bash
pwd  # Should show /home/theseus/alexandria/daopad-balance-refactor/src/daopad
git branch --show-current  # Should show feature/balance-bigint-refactor
ls BALANCE_BIGINT_REFACTOR_PLAN.md  # This plan should be here
```

**Step 2 - Implement Phase 1 (Core Utilities):**
- Create `/src/utils/format.js` with all BigInt conversion utilities
- Create `/src/utils/format.test.js` with comprehensive tests
- Create `/src/types/balance.js` with JSDoc type definitions

**Step 3 - Implement Phase 2 (Redux Selectors):**
- Create `/src/features/orbit/orbitSelectors.js` with memoized selectors
- Create `/src/features/orbit/orbitSelectors.test.js`

**Step 4 - Implement Phase 3 (Component Refactoring):**
- Fix `AccountsTable.jsx` (remove local formatBalance, use selector)
- Fix `TransferRequestDialog.jsx` (use selector for balance data)
- Update remaining 10 components importing `@/utils/format`

**Step 5 - Implement Phase 4 (Error Boundaries):**
- Create `/src/components/common/BalanceErrorBoundary.jsx`
- Wrap critical components with error boundary

**Step 6 - Test and Deploy:**
```bash
# Frontend only (no backend changes)
./deploy.sh --network ic --frontend-only

# Test on mainnet
# Visit: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
# Verify: No BigInt errors in console, balances display correctly
```

**Step 7 - Commit and Push:**
```bash
git add -A
git commit -m "feat: Rearchitect balance handling with BigInt utilities

- Create format.js with safe BigInt conversion
- Add Redux selectors for memoized balance formatting
- Refactor 12+ components to use consistent patterns
- Add error boundaries for resilience
- Fix TypeError: can't convert BigInt to number

Closes #[issue-number]"

git push -u origin feature/balance-bigint-refactor
```

**Step 8 - Create PR:**
```bash
gh pr create --title "feat: Rearchitect balance handling with BigInt utilities" --body "$(cat <<'EOF'
## Summary
Fixes the BigInt conversion error and rearchitects balance handling across the frontend.

## Root Cause
- Backend returns `candid::Nat` as JavaScript BigInt
- Frontend performed unsafe arithmetic: `BigInt / number` → TypeError
- 12 components imported non-existent `/src/utils/format.js`
- No consistent pattern for handling IC's native BigInt types

## Solution: Three-Layer Architecture

### Layer 1: Core Utilities (NEW)
- `/src/utils/format.js` - Safe BigInt conversion functions
  - `bigintToFloat()`, `formatBalance()`, `parseBalanceInput()`
  - Error handling with 0n fallbacks
- `/src/types/balance.js` - JSDoc type definitions

### Layer 2: Redux Selectors (NEW)
- `/src/features/orbit/orbitSelectors.js` - Memoized transformations
  - Pre-format balances at selector level
  - Keep raw BigInt in Redux, format only for display
  - `selectAccountBalances()`, `selectAccountById()`

### Layer 3: Component Updates (REFACTOR)
- Removed all local `formatBalance` implementations
- Imported selectors instead of utilities
- Use pre-formatted data: `account.balanceFormatted`
- Added error boundaries for resilience

## Files Changed
**New Files:**
- `/src/utils/format.js` (150 lines)
- `/src/utils/format.test.js` (200 lines)
- `/src/features/orbit/orbitSelectors.js` (120 lines)
- `/src/features/orbit/orbitSelectors.test.js` (150 lines)
- `/src/components/common/BalanceErrorBoundary.jsx` (50 lines)
- `/src/types/balance.js` (40 lines)

**Modified Files:**
- 12 components importing `@/utils/format`
- `AccountsTable.jsx` - Removed local formatBalance
- `TransferRequestDialog.jsx` - Use selector for balance data

## Testing
- ✅ Unit tests for format.js (80%+ coverage)
- ✅ Integration tests for selectors
- ✅ Manual testing on mainnet
- ✅ No BigInt errors in console
- ✅ All balances display correctly

## Performance
- Memoized selectors prevent unnecessary recalculations
- Format only when needed for display
- No re-renders on unrelated state changes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**YOUR CRITICAL RULES:**
- You MUST work in `/home/theseus/alexandria/daopad-balance-refactor/src/daopad` (NOT main repo)
- Other agents ARE working in parallel - isolation is MANDATORY
- After sleep: IMMEDIATELY continue (no "should I check?" questions)
- Frontend-only deploy (no backend changes)
- ONLY STOP when: approved or critical error

**START NOW with Step 0.**

---

## Current State Analysis

### Problem Summary

**Immediate Error:**
```
TypeError: can't convert BigInt to number
    O AccountsTable.jsx:74
```

**Root Cause:**
- Backend returns `candid::Nat` (becomes JavaScript BigInt)
- Frontend performs unsafe arithmetic: `amount / Math.pow(10, decimals)`
- BigInt divided by number = TypeError crash

**Architectural Issues:**
1. **Missing Infrastructure**: 12 files import non-existent `@/utils/format.js`
2. **Duplicate Logic**: Each component reimplements BigInt conversion differently
3. **No Type Safety**: No JSDoc types for BigInt handling
4. **Redux Inefficiency**: Raw BigInt stored, converted on every render
5. **No Error Boundaries**: One BigInt error crashes entire component tree

### Files Importing Non-Existent `@/utils/format`

```
12 files total:
├── pages/
│   ├── DashboardPage.jsx (formatBalance, formatDateTime, formatPrincipalShort)
│   └── RequestsPage.jsx (formatDateTime, formatPrincipalShort)
├── components/orbit/
│   ├── AssetsPage.jsx (formatBalance)
│   ├── TransferDialog.jsx (formatBalance, formatAddress)
│   ├── ExternalCanistersPage.jsx (formatAddress)
│   ├── dashboard/
│   │   ├── TreasuryOverview.jsx (formatBalance, formatPrincipalShort)
│   │   └── ActivityFeed.jsx (formatDateTime, formatPrincipalShort, formatBalance)
│   ├── requests/
│   │   ├── RequestOperationView.jsx (formatPrincipalShort, formatBalance)
│   │   ├── RequestList.jsx (formatDateTime, formatPrincipalShort)
│   │   └── RequestDialog.jsx (formatDateTime, formatPrincipalShort)
│   └── request-policies/
│       ├── RuleBuilder.jsx (formatPrincipalShort)
│       └── RequestPolicyForm.jsx (formatPrincipalShort)
```

### Current File Structure

```
daopad_frontend/src/
├── utils/
│   ├── addressValidation.js ✅ exists
│   ├── canisterCapabilities.js ✅ exists
│   ├── orbit-helpers.js ✅ exists
│   ├── requestDomains.js ✅ exists
│   ├── serialization.js ✅ exists
│   └── format.js ❌ MISSING (12 files importing)
├── features/
│   └── orbit/
│       ├── orbitSlice.js ✅ exists (599 lines - Redux state management)
│       └── orbitSelectors.js ❌ MISSING (needed for memoization)
├── components/
│   ├── tables/
│   │   └── AccountsTable.jsx ⚠️ HAS BUG (line 74 - BigInt crash)
│   ├── orbit/
│   │   └── TransferRequestDialog.jsx ⚠️ HAS BUG (line 115 - unsafe conversion)
│   └── common/ ❌ MISSING (need error boundary)
└── types/ ❌ MISSING (need JSDoc definitions)
```

### Problem Code Examples

**AccountsTable.jsx:74 (CRASHING)**
```javascript
const formatBalance = (accountId) => {
  const balance = balances[accountId];
  if (!balance) return 'N/A';

  const amount = balance.balance || 0;  // This is BigInt!
  const decimals = balance.decimals || 8;
  const displayAmount = (amount / Math.pow(10, decimals)).toFixed(4);  // ❌ BigInt / number
  return `${displayAmount} ${tokenSymbol || ''}`;
};
```

**TransferRequestDialog.jsx:115 (UNSAFE)**
```javascript
const maxAmount = account.balance
  ? (parseFloat(account.balance) / Math.pow(10, asset.decimals)).toFixed(asset.decimals)  // ⚠️ parseFloat on BigInt
  : '0';
```

### Backend Type Definition

**From `/src/daopad_backend/src/types/orbit.rs:239`**
```rust
pub struct AccountBalance {
    pub account_id: String,
    pub asset_id: String,
    pub balance: candid::Nat,  // ← This becomes BigInt in JavaScript
    pub decimals: u32,
    pub last_update_timestamp: String,
    pub query_state: String,
}
```

---

## Proposed Architecture

### Design Principles

1. **Convert at the Edge**: Store BigInt in Redux, convert only for display
2. **Fail Safely**: Never crash on invalid balances (0n fallback)
3. **Single Source of Truth**: One utility file, one conversion pattern
4. **Type Documentation**: JSDoc everywhere for BigInt types
5. **Performance First**: Memoized selectors, minimal re-renders

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 1: UTILITY CORE                     │
│  /src/utils/format.js - Pure functions for BigInt handling  │
│  /src/types/balance.js - JSDoc type definitions             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   LAYER 2: REDUX SELECTORS                   │
│  /src/features/orbit/orbitSelectors.js - Memoized balance   │
│                    transformations                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  LAYER 3: REACT COMPONENTS                   │
│  Custom hooks + error boundaries for safe consumption       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Backend (Rust)                    Frontend (JavaScript)
┌──────────────┐                  ┌────────────────────────────┐
│ candid::Nat  │──────decode───→  │       BigInt               │
│ (128/256bit) │                  │  (native JavaScript)       │
└──────────────┘                  └────────────────────────────┘
                                              │
                                              ├──→ Redux Store (raw BigInt)
                                              │
                                              ├──→ Selector Layer
                                              │    ├─ bigintToFloat()
                                              │    ├─ formatBalance()
                                              │    └─ Memoization
                                              │
                                              └──→ Components (formatted strings)
                                                   └─ "5.00 ICP"
```

---

## Implementation Details

### Phase 1: Core Utility Layer

#### File 1: `/src/utils/format.js` (NEW - ~150 lines)

```javascript
// PSEUDOCODE - Implementing agent will write real code

/**
 * @file Core formatting utilities for DAOPad
 * @description Safe BigInt conversions, number formatting, and display utilities
 */

// ============================================================================
// BIGINT UTILITIES
// ============================================================================

/**
 * Safely converts BigInt to float with decimal adjustment
 * @param {BigInt|string|number} balance - Raw balance value
 * @param {number} decimals - Token decimal places (e.g., 8 for ICP)
 * @returns {number} Float representation safe for display
 * @example
 * bigintToFloat(500000000n, 8) // Returns 5.0
 * bigintToFloat(0n, 8) // Returns 0
 * bigintToFloat(null, 8) // Returns 0 (safe fallback)
 */
export function bigintToFloat(balance, decimals = 8) {
  // 1. Validate and normalize input
  const safeBigInt = safeBalance(balance);

  // 2. Convert BigInt to Number
  // For large values, use division to prevent overflow
  // Example: 500000000n / 100000000n = 5n, then Number(5n) = 5
  const divisor = BigInt(Math.pow(10, decimals));
  const wholePart = Number(safeBigInt / divisor);
  const fractionalPart = Number(safeBigInt % divisor) / Math.pow(10, decimals);

  return wholePart + fractionalPart;
}

/**
 * Formats balance for display with symbol and options
 * @param {BigInt|string|number} balance - Raw balance value
 * @param {number} decimals - Token decimal places
 * @param {Object} [options] - Formatting options
 * @param {string} [options.symbol] - Token symbol (e.g., "ICP")
 * @param {number} [options.maxDecimals=4] - Max decimal places to show
 * @param {number} [options.minDecimals=2] - Min decimal places to show
 * @param {boolean} [options.compact=false] - Use compact notation (1.2M)
 * @returns {string} Formatted balance string
 * @example
 * formatBalance(500000000n, 8, { symbol: 'ICP' }) // "5.00 ICP"
 * formatBalance(1500000000000000n, 8, { compact: true }) // "15M"
 */
export function formatBalance(balance, decimals = 8, options = {}) {
  const {
    symbol = '',
    maxDecimals = 4,
    minDecimals = 2,
    compact = false,
  } = options;

  // 1. Convert to float
  const floatValue = bigintToFloat(balance, decimals);

  // 2. Handle compact notation for large numbers
  if (compact && floatValue >= 1_000_000) {
    return formatCompactNumber(floatValue) + (symbol ? ` ${symbol}` : '');
  }

  // 3. Format with fixed decimals
  const formatted = floatValue.toFixed(
    floatValue === 0 ? minDecimals : Math.min(maxDecimals, countSignificantDecimals(floatValue))
  );

  // 4. Add symbol
  return symbol ? `${formatted} ${symbol}` : formatted;
}

/**
 * Formats number in compact notation (1.2M, 500K)
 * @param {number} value - Numeric value
 * @returns {string} Compact representation
 */
function formatCompactNumber(value) {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000_000) {
    return `${sign}${(absValue / 1_000_000_000).toFixed(1)}B`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toFixed(1)}M`;
  }
  if (absValue >= 1_000) {
    return `${sign}${(absValue / 1_000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Parses user input (string) to BigInt for backend
 * @param {string} input - User-entered amount
 * @param {number} decimals - Token decimal places
 * @returns {BigInt} Balance in smallest unit
 * @throws {Error} If input is invalid
 * @example
 * parseBalanceInput("5.5", 8) // Returns 550000000n
 */
export function parseBalanceInput(input, decimals = 8) {
  // 1. Validate input
  const cleaned = input.trim();
  if (!cleaned || isNaN(cleaned)) {
    throw new Error('Invalid balance input');
  }

  // 2. Split into whole and fractional parts
  const [whole, fractional = '0'] = cleaned.split('.');

  // 3. Validate decimal places don't exceed token decimals
  if (fractional.length > decimals) {
    throw new Error(`Too many decimal places (max ${decimals})`);
  }

  // 4. Build BigInt
  const paddedFractional = fractional.padEnd(decimals, '0');
  const combined = whole + paddedFractional;

  return BigInt(combined);
}

/**
 * Validates balance value
 * @param {any} value - Value to check
 * @returns {boolean} True if valid balance
 */
export function isValidBalance(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'bigint') return value >= 0n;
  if (typeof value === 'number') return value >= 0 && !isNaN(value);
  if (typeof value === 'string') {
    try {
      BigInt(value);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Safely converts any value to BigInt with fallback
 * @param {any} value - Input value
 * @param {BigInt} [fallback=0n] - Fallback value
 * @returns {BigInt} Normalized BigInt
 */
export function safeBalance(value, fallback = 0n) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'bigint') return value;

  try {
    return BigInt(value);
  } catch (error) {
    console.error('Invalid balance value:', value, error);
    return fallback;
  }
}

// ============================================================================
// OTHER FORMAT UTILITIES
// ============================================================================

/**
 * Formats IC timestamp (nanoseconds) to readable date
 * @param {BigInt|string|number} nanos - IC timestamp in nanoseconds
 * @returns {string} Formatted date string
 */
export function formatDateTime(nanos) {
  // Convert nanoseconds to milliseconds
  const ms = Number(BigInt(nanos) / 1_000_000n);
  const date = new Date(ms);

  // Format: "Jan 1, 2024 12:00 PM"
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Shortens principal ID for display
 * @param {string} principal - Full principal ID
 * @param {number} [start=8] - Characters to show at start
 * @param {number} [end=6] - Characters to show at end
 * @returns {string} Shortened principal
 * @example
 * formatPrincipalShort("ryjl3-tyaaa-aaaaa-aaaba-cai") // "ryjl3-ty...aba-cai"
 */
export function formatPrincipalShort(principal, start = 8, end = 6) {
  if (!principal || principal.length <= start + end) return principal;
  return `${principal.slice(0, start)}...${principal.slice(-end)}`;
}

/**
 * Formats blockchain address (similar to principal)
 * @param {string} address - Full address
 * @returns {string} Shortened address
 */
export function formatAddress(address, start = 10, end = 8) {
  return formatPrincipalShort(address, start, end);
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Counts significant decimal places in a float
 * @private
 */
function countSignificantDecimals(value) {
  const str = value.toString();
  const decimalIndex = str.indexOf('.');
  if (decimalIndex === -1) return 0;

  // Count trailing non-zero decimals
  const decimals = str.slice(decimalIndex + 1);
  let count = 0;
  for (let i = decimals.length - 1; i >= 0; i--) {
    if (decimals[i] !== '0') {
      count = i + 1;
      break;
    }
  }
  return count;
}
```

#### File 2: `/src/utils/format.test.js` (NEW - ~200 lines)

```javascript
// PSEUDOCODE - Implementing agent will write real code

import {
  bigintToFloat,
  formatBalance,
  parseBalanceInput,
  isValidBalance,
  safeBalance,
  formatDateTime,
  formatPrincipalShort,
} from './format';

describe('bigintToFloat', () => {
  test('converts ICP balance (8 decimals)', () => {
    expect(bigintToFloat(100000000n, 8)).toBe(1.0);
    expect(bigintToFloat(500000000n, 8)).toBe(5.0);
    expect(bigintToFloat(550000000n, 8)).toBe(5.5);
  });

  test('handles zero balance', () => {
    expect(bigintToFloat(0n, 8)).toBe(0);
  });

  test('handles smallest unit (1 e8s)', () => {
    expect(bigintToFloat(1n, 8)).toBe(0.00000001);
  });

  test('handles large balances without overflow', () => {
    const trillion = 1000000000000000000n; // 10 billion ICP
    expect(bigintToFloat(trillion, 8)).toBe(10000000000);
  });

  test('handles invalid inputs with fallback', () => {
    expect(bigintToFloat(null, 8)).toBe(0);
    expect(bigintToFloat(undefined, 8)).toBe(0);
    expect(bigintToFloat('', 8)).toBe(0);
  });

  test('handles string inputs', () => {
    expect(bigintToFloat('100000000', 8)).toBe(1.0);
  });

  test('handles different decimal places', () => {
    expect(bigintToFloat(1000000000000000000n, 18)).toBe(1.0); // ERC-20 style
  });
});

describe('formatBalance', () => {
  test('formats with symbol', () => {
    expect(formatBalance(500000000n, 8, { symbol: 'ICP' })).toBe('5.00 ICP');
  });

  test('formats without symbol', () => {
    expect(formatBalance(500000000n, 8)).toBe('5.00');
  });

  test('respects maxDecimals option', () => {
    expect(formatBalance(555555555n, 8, { maxDecimals: 2 })).toBe('5.56');
  });

  test('uses compact notation for large numbers', () => {
    expect(formatBalance(1500000000000000n, 8, { compact: true })).toMatch(/15\.0M|15M/);
    expect(formatBalance(1500000000n, 8, { compact: true })).toMatch(/15\.0[K]?/);
  });

  test('handles zero balance', () => {
    expect(formatBalance(0n, 8, { symbol: 'ICP' })).toBe('0.00 ICP');
  });

  test('handles invalid inputs gracefully', () => {
    expect(formatBalance(null, 8, { symbol: 'ICP' })).toBe('0.00 ICP');
  });
});

describe('parseBalanceInput', () => {
  test('parses integer input', () => {
    expect(parseBalanceInput('5', 8)).toBe(500000000n);
  });

  test('parses decimal input', () => {
    expect(parseBalanceInput('5.5', 8)).toBe(550000000n);
    expect(parseBalanceInput('0.00000001', 8)).toBe(1n);
  });

  test('handles max decimals', () => {
    expect(parseBalanceInput('5.12345678', 8)).toBe(512345678n);
  });

  test('throws on too many decimals', () => {
    expect(() => parseBalanceInput('5.123456789', 8)).toThrow(/Too many decimal places/);
  });

  test('throws on invalid input', () => {
    expect(() => parseBalanceInput('', 8)).toThrow(/Invalid balance input/);
    expect(() => parseBalanceInput('abc', 8)).toThrow(/Invalid balance input/);
  });

  test('handles whitespace', () => {
    expect(parseBalanceInput('  5.5  ', 8)).toBe(550000000n);
  });
});

describe('isValidBalance', () => {
  test('validates BigInt', () => {
    expect(isValidBalance(100n)).toBe(true);
    expect(isValidBalance(0n)).toBe(true);
    expect(isValidBalance(-1n)).toBe(false); // Negative not valid
  });

  test('validates numbers', () => {
    expect(isValidBalance(100)).toBe(true);
    expect(isValidBalance(0)).toBe(true);
    expect(isValidBalance(-1)).toBe(false);
    expect(isValidBalance(NaN)).toBe(false);
  });

  test('validates strings', () => {
    expect(isValidBalance('100')).toBe(true);
    expect(isValidBalance('abc')).toBe(false);
  });

  test('rejects null/undefined', () => {
    expect(isValidBalance(null)).toBe(false);
    expect(isValidBalance(undefined)).toBe(false);
  });
});

describe('safeBalance', () => {
  test('returns BigInt as-is', () => {
    expect(safeBalance(100n)).toBe(100n);
  });

  test('converts valid strings', () => {
    expect(safeBalance('100')).toBe(100n);
  });

  test('returns fallback for invalid', () => {
    expect(safeBalance(null)).toBe(0n);
    expect(safeBalance(undefined)).toBe(0n);
    expect(safeBalance('abc')).toBe(0n);
  });

  test('respects custom fallback', () => {
    expect(safeBalance(null, 999n)).toBe(999n);
  });
});

describe('formatDateTime', () => {
  test('converts IC nanoseconds to date', () => {
    // Jan 1, 2024, 00:00:00 UTC = 1704067200000 ms
    const nanos = BigInt(1704067200000) * 1_000_000n;
    const formatted = formatDateTime(nanos);
    expect(formatted).toMatch(/Jan 1, 2024/);
  });

  test('handles current timestamp', () => {
    const now = BigInt(Date.now()) * 1_000_000n;
    const formatted = formatDateTime(now);
    expect(formatted).toBeTruthy();
    expect(formatted).toMatch(/202[0-9]/); // Year 2020+
  });
});

describe('formatPrincipalShort', () => {
  test('shortens long principal', () => {
    const principal = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
    const short = formatPrincipalShort(principal);
    expect(short).toBe('ryjl3-ty...aba-cai');
  });

  test('returns short principal as-is', () => {
    const principal = 'abc-def';
    expect(formatPrincipalShort(principal)).toBe(principal);
  });

  test('respects custom start/end', () => {
    const principal = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
    const short = formatPrincipalShort(principal, 4, 4);
    expect(short).toBe('ryjl...-cai');
  });
});
```

#### File 3: `/src/types/balance.js` (NEW - ~40 lines)

```javascript
// PSEUDOCODE - Implementing agent will write real code

/**
 * @file Type definitions for balance handling
 * @description JSDoc types for BigInt balance operations
 */

/**
 * Raw account balance from backend
 * @typedef {Object} RawAccountBalance
 * @property {string} account_id - UUID of account
 * @property {string} asset_id - UUID of asset
 * @property {BigInt} balance - Raw balance (from candid::Nat)
 * @property {number} decimals - Token decimal places
 * @property {string} last_update_timestamp - RFC3339 timestamp
 * @property {string} query_state - "fresh", "stale", or "stale_refreshing"
 */

/**
 * Formatted account balance for display
 * @typedef {Object} FormattedAccountBalance
 * @property {string} account_id
 * @property {string} asset_id
 * @property {BigInt} balance - Keep raw for recalculations
 * @property {number} balanceFloat - For sorting/comparisons
 * @property {string} balanceFormatted - For display (e.g., "5.00 ICP")
 * @property {number} decimals
 * @property {string} last_update_timestamp
 * @property {string} query_state
 */

/**
 * Balance formatting options
 * @typedef {Object} FormatOptions
 * @property {string} [symbol] - Token symbol (e.g., "ICP")
 * @property {number} [maxDecimals=4] - Max decimal places
 * @property {number} [minDecimals=2] - Min decimal places
 * @property {boolean} [compact=false] - Use compact notation (1.2M)
 */

// Export types (for JSDoc @type imports)
export {};
```

---

### Phase 2: Redux Selector Layer

#### File 4: `/src/features/orbit/orbitSelectors.js` (NEW - ~120 lines)

```javascript
// PSEUDOCODE - Implementing agent will write real code

import { createSelector } from '@reduxjs/toolkit';
import { formatBalance, bigintToFloat } from '@/utils/format';

/**
 * Base selector for accounts state
 * @param {Object} state - Redux state
 * @param {string} stationId - Station ID
 * @returns {Object} Accounts data for station
 */
const selectAccountsData = (state, stationId) =>
  state.orbit.accounts.data[stationId] || { accounts: [], total: 0, balances: {} };

/**
 * Base selector for assets (if available in state)
 * @param {Object} state - Redux state
 * @returns {Object} Assets mapping
 */
const selectAssets = (state) =>
  state.orbit.assets?.data || {};

/**
 * Memoized selector that formats all account balances for a station
 * @returns {Array<FormattedAccountBalance>} Accounts with formatted balances
 * @example
 * const accounts = useSelector(state => selectFormattedAccounts(state, stationId));
 * accounts.forEach(acc => console.log(acc.balanceFormatted)); // "5.00 ICP"
 */
export const selectFormattedAccounts = createSelector(
  [selectAccountsData, selectAssets, (state, stationId, tokenSymbol) => tokenSymbol],
  (accountsData, assets, tokenSymbol) => {
    const { accounts, balances } = accountsData;

    return accounts.map(account => {
      const balanceData = balances[account.id];

      if (!balanceData) {
        return {
          ...account,
          balanceFloat: 0,
          balanceFormatted: 'N/A',
        };
      }

      // Convert to float for sorting
      const balanceFloat = bigintToFloat(
        balanceData.balance,
        balanceData.decimals
      );

      // Format for display
      const balanceFormatted = formatBalance(
        balanceData.balance,
        balanceData.decimals,
        { symbol: tokenSymbol }
      );

      return {
        ...account,
        balance: balanceData.balance, // Keep raw BigInt
        decimals: balanceData.decimals,
        balanceFloat,
        balanceFormatted,
      };
    });
  }
);

/**
 * Selector for a single account by ID
 * @param {Object} state - Redux state
 * @param {string} stationId - Station ID
 * @param {string} accountId - Account ID
 * @returns {FormattedAccountBalance|null} Formatted account or null
 */
export const selectFormattedAccountById = createSelector(
  [selectFormattedAccounts, (state, stationId, accountId) => accountId],
  (accounts, accountId) => {
    return accounts.find(acc => acc.id === accountId) || null;
  }
);

/**
 * Selector for accounts with balance greater than threshold
 * Useful for transfer dialogs (only show funded accounts)
 * @param {Object} state - Redux state
 * @param {string} stationId - Station ID
 * @param {number} minBalance - Minimum balance (as float)
 * @returns {Array<FormattedAccountBalance>} Filtered accounts
 */
export const selectAccountsWithMinBalance = createSelector(
  [selectFormattedAccounts, (state, stationId, minBalance) => minBalance],
  (accounts, minBalance) => {
    return accounts.filter(acc => acc.balanceFloat >= minBalance);
  }
);

/**
 * Selector for total balance across all accounts for a station
 * @param {Object} state - Redux state
 * @param {string} stationId - Station ID
 * @param {string} tokenSymbol - Token symbol for formatting
 * @returns {string} Total formatted balance
 */
export const selectTotalBalance = createSelector(
  [selectFormattedAccounts],
  (accounts) => {
    const total = accounts.reduce((sum, acc) => sum + acc.balanceFloat, 0);

    // Use first account's decimals (assuming same asset)
    const decimals = accounts[0]?.decimals || 8;
    const totalBigInt = BigInt(Math.floor(total * Math.pow(10, decimals)));

    return formatBalance(totalBigInt, decimals);
  }
);

/**
 * Selector for accounts sorted by balance (descending)
 * @param {Object} state - Redux state
 * @param {string} stationId - Station ID
 * @returns {Array<FormattedAccountBalance>} Sorted accounts
 */
export const selectAccountsSortedByBalance = createSelector(
  [selectFormattedAccounts],
  (accounts) => {
    return [...accounts].sort((a, b) => b.balanceFloat - a.balanceFloat);
  }
);
```

#### File 5: `/src/features/orbit/orbitSelectors.test.js` (NEW - ~150 lines)

```javascript
// PSEUDOCODE - Implementing agent will write real code

import { selectFormattedAccounts, selectFormattedAccountById } from './orbitSelectors';

const mockState = {
  orbit: {
    accounts: {
      data: {
        'station-1': {
          accounts: [
            { id: 'acc-1', name: 'Main Account' },
            { id: 'acc-2', name: 'Reserve Account' },
          ],
          total: 2,
          balances: {
            'acc-1': {
              account_id: 'acc-1',
              asset_id: 'ICP',
              balance: 500000000n,
              decimals: 8,
              last_update_timestamp: '2024-01-01T00:00:00Z',
              query_state: 'fresh',
            },
            'acc-2': {
              account_id: 'acc-2',
              balance: 1000000000n,
              decimals: 8,
            },
          },
        },
      },
    },
    assets: {
      data: {
        'ICP': { symbol: 'ICP' },
      },
    },
  },
};

describe('selectFormattedAccounts', () => {
  test('formats all accounts with balances', () => {
    const result = selectFormattedAccounts(mockState, 'station-1', 'ICP');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'acc-1',
      balanceFloat: 5.0,
      balanceFormatted: '5.00 ICP',
    });
    expect(result[1]).toMatchObject({
      id: 'acc-2',
      balanceFloat: 10.0,
      balanceFormatted: '10.00 ICP',
    });
  });

  test('handles missing balances gracefully', () => {
    const stateWithoutBalance = {
      ...mockState,
      orbit: {
        ...mockState.orbit,
        accounts: {
          data: {
            'station-1': {
              accounts: [{ id: 'acc-no-balance', name: 'Empty' }],
              balances: {},
            },
          },
        },
      },
    };

    const result = selectFormattedAccounts(stateWithoutBalance, 'station-1', 'ICP');
    expect(result[0].balanceFormatted).toBe('N/A');
  });

  test('memoizes results (doesn't recalculate on unrelated state change)', () => {
    const result1 = selectFormattedAccounts(mockState, 'station-1', 'ICP');

    // Change unrelated state
    const newState = {
      ...mockState,
      orbit: {
        ...mockState.orbit,
        members: { unrelatedChange: true },
      },
    };

    const result2 = selectFormattedAccounts(newState, 'station-1', 'ICP');

    // Should return same reference (memoized)
    expect(result1).toBe(result2);
  });
});

describe('selectFormattedAccountById', () => {
  test('returns specific account by ID', () => {
    const result = selectFormattedAccountById(mockState, 'station-1', 'acc-1', 'ICP');

    expect(result).toMatchObject({
      id: 'acc-1',
      name: 'Main Account',
      balanceFormatted: '5.00 ICP',
    });
  });

  test('returns null for non-existent account', () => {
    const result = selectFormattedAccountById(mockState, 'station-1', 'nonexistent', 'ICP');
    expect(result).toBeNull();
  });
});
```

---

### Phase 3: Component Refactoring

#### File 6: `/src/components/tables/AccountsTable.jsx` (MODIFY)

**Current (lines 68-76):**
```javascript
const formatBalance = (accountId) => {
  const balance = balances[accountId];
  if (!balance) return 'N/A';

  const amount = balance.balance || 0;
  const decimals = balance.decimals || 8;
  const displayAmount = (amount / Math.pow(10, decimals)).toFixed(4);  // ❌ CRASH HERE
  return `${displayAmount} ${tokenSymbol || ''}`;
};
```

**After Refactor:**
```javascript
// REMOVE lines 68-76 entirely

// CHANGE imports (line 11-16):
import {
  fetchOrbitAccounts,
  selectOrbitAccounts,         // Keep
  selectOrbitAccountsLoading,  // Keep
  selectOrbitAccountsError,    // Keep
} from '@/features/orbit/orbitSlice';

// ADD new import:
import { selectFormattedAccounts } from '@/features/orbit/orbitSelectors';

// CHANGE selector (line 24-26):
const accounts = useSelector(state =>
  selectFormattedAccounts(state, stationId, tokenSymbol)
);

// CHANGE table cell (line 159-161):
<TableCell className="text-right font-mono">
  {account.balanceFormatted}  {/* Use pre-formatted value */}
</TableCell>
```

**Complete modified section:**
```javascript
// Import selector instead of local formatting
import { selectFormattedAccounts } from '@/features/orbit/orbitSelectors';

export default function AccountsTable({ stationId, identity, tokenId, tokenSymbol }) {
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ limit: 20, offset: 0 });

  // Use selector that returns pre-formatted accounts
  const accounts = useSelector(state =>
    selectFormattedAccounts(state, stationId, tokenSymbol)
  );
  const isLoading = useSelector(state =>
    selectOrbitAccountsLoading(state, stationId)
  );
  const error = useSelector(state =>
    selectOrbitAccountsError(state, stationId)
  );

  // ... rest of component unchanged ...

  // In table body:
  <TableCell className="text-right font-mono">
    {account.balanceFormatted}  {/* Already formatted by selector */}
  </TableCell>
}
```

#### File 7: `/src/components/orbit/TransferRequestDialog.jsx` (MODIFY)

**Current (line 114-116):**
```javascript
const maxAmount = account.balance
  ? (parseFloat(account.balance) / Math.pow(10, asset.decimals)).toFixed(asset.decimals)
  : '0';
```

**After Refactor:**
```javascript
// ADD import at top:
import { bigintToFloat } from '@/utils/format';

// REPLACE line 114-116:
const maxAmount = account.balance
  ? bigintToFloat(account.balance, asset.decimals).toFixed(asset.decimals)
  : '0';
```

#### Files 8-19: Batch Refactor Remaining Components (MODIFY)

**All 12 components importing `@/utils/format`:**

**Pattern to apply:**
1. **If only importing `formatDateTime`, `formatPrincipalShort`, `formatAddress`:**
   - Keep imports (these will exist in new format.js)
   - No other changes needed

2. **If importing `formatBalance`:**
   - REMOVE direct formatBalance import
   - ADD selector import: `import { selectFormattedAccounts } from '@/features/orbit/orbitSelectors'`
   - USE pre-formatted `account.balanceFormatted` from selector

**Files to update:**
```
1. pages/DashboardPage.jsx (imports formatBalance)
   - Use selector for account data

2. pages/RequestsPage.jsx (no formatBalance)
   - Keep as-is (only datetime/principal)

3. components/orbit/AssetsPage.jsx (imports formatBalance)
   - Use selector for formatted balances

4. components/orbit/TransferDialog.jsx (imports formatBalance)
   - Already fixed above

5. components/orbit/ExternalCanistersPage.jsx (no formatBalance)
   - Keep as-is (only formatAddress)

6. components/orbit/dashboard/TreasuryOverview.jsx (imports formatBalance)
   - Use selector for treasury totals

7. components/orbit/dashboard/ActivityFeed.jsx (imports formatBalance)
   - Use selector for transaction amounts

8. components/orbit/requests/RequestOperationView.jsx (imports formatBalance)
   - Use formatBalance directly (it now exists in format.js)

9-12. Other components (no formatBalance)
   - Keep as-is
```

---

### Phase 4: Error Boundary Layer

#### File 20: `/src/components/common/BalanceErrorBoundary.jsx` (NEW - ~50 lines)

```javascript
// PSEUDOCODE - Implementing agent will write real code

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Error boundary that catches BigInt conversion errors
 * Shows fallback UI instead of crashing entire component tree
 */
export class BalanceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Check if it's a BigInt-related error
    const isBigIntError = error.message?.includes('BigInt') ||
                          error.message?.includes('convert');

    return { hasError: true, error, isBigIntError };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console for debugging
    console.error('BalanceErrorBoundary caught error:', error, errorInfo);

    // Could send to error tracking service
    // if (window.Sentry) {
    //   Sentry.captureException(error);
    // }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <Alert variant="destructive">
            <AlertDescription>
              {this.state.isBigIntError
                ? 'Error displaying balance. Please refresh the page.'
                : 'An error occurred. Please try again.'}
            </AlertDescription>
          </Alert>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Loading state component for fallback
 */
export function BalanceLoadingState() {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="animate-pulse">Loading balances...</div>
    </div>
  );
}
```

**Usage in components:**
```javascript
import { BalanceErrorBoundary, BalanceLoadingState } from '@/components/common/BalanceErrorBoundary';

function SomePage() {
  return (
    <BalanceErrorBoundary fallback={<BalanceLoadingState />}>
      <AccountsTable />
      <TreasuryOverview />
    </BalanceErrorBoundary>
  );
}
```

---

## Testing Strategy

### Unit Testing

**Run after creating each file:**
```bash
cd /home/theseus/alexandria/daopad-balance-refactor/src/daopad/daopad_frontend

# Test format utilities
npm test src/utils/format.test.js

# Test selectors
npm test src/features/orbit/orbitSelectors.test.js

# Run all tests
npm test
```

### Integration Testing on Mainnet

**After deploying:**
```bash
# Deploy frontend
./deploy.sh --network ic --frontend-only

# Visit: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io

# Test scenarios:
1. Navigate to Accounts page
   ✅ All balances display without errors
   ✅ No "TypeError: can't convert BigInt" in console

2. Open Transfer dialog
   ✅ Account balances show correctly
   ✅ Max amount calculated properly

3. View Dashboard
   ✅ Treasury totals display
   ✅ Activity feed shows transaction amounts

4. Sort accounts by balance
   ✅ Sorting works (uses balanceFloat)

5. Test with zero balance account
   ✅ Shows "0.00 ICP" not blank

6. Test with very large balance
   ✅ Shows compact notation "1.2M ICP"
```

### Performance Testing

```bash
# Open React DevTools Profiler
# Trigger balance update in Redux
# Verify: Only affected components re-render (not entire tree)
```

---

## Scope Estimate

### Files Summary

**New Files: 6**
- `/src/utils/format.js` (150 lines)
- `/src/utils/format.test.js` (200 lines)
- `/src/types/balance.js` (40 lines)
- `/src/features/orbit/orbitSelectors.js` (120 lines)
- `/src/features/orbit/orbitSelectors.test.js` (150 lines)
- `/src/components/common/BalanceErrorBoundary.jsx` (50 lines)

**Modified Files: 14**
- `AccountsTable.jsx` (remove 9 lines, add 5 lines)
- `TransferRequestDialog.jsx` (change 3 lines)
- 12 components updating imports (1-2 lines each)

**Total Lines of Code:**
- New code: ~710 lines
- Modified code: ~30 lines
- Test code: ~350 lines
- **Net addition:** ~740 lines

### Complexity Assessment

- **Low Complexity:**
  - format.js utilities (pure functions)
  - Type definitions (JSDoc)

- **Medium Complexity:**
  - Redux selectors (memoization)
  - Component refactoring (import changes)
  - Test coverage

- **Low Risk:**
  - No backend changes
  - No breaking API changes
  - Incremental testing possible

### Time Estimate

- **Phase 1 (Core Utilities):** 2 hours
  - Write format.js
  - Write tests
  - Write type definitions

- **Phase 2 (Redux Selectors):** 1.5 hours
  - Write selectors
  - Write selector tests

- **Phase 3 (Component Refactoring):** 2 hours
  - Fix AccountsTable
  - Fix TransferRequestDialog
  - Update 12 components

- **Phase 4 (Error Boundaries):** 0.5 hours
  - Create error boundary
  - Add to critical components

- **Testing & Deployment:** 1 hour
  - Run unit tests
  - Deploy to mainnet
  - Integration testing
  - Fix any issues

**Total Estimated Time:** 7 hours

---

## Deployment Process

### No Backend Changes Required

**This is a FRONTEND-ONLY refactor:**
```bash
# Only deploy frontend
./deploy.sh --network ic --frontend-only
```

### Deployment Steps

1. **Verify implementation complete**
2. **Run all tests locally**
3. **Deploy frontend**
4. **Test on mainnet**
5. **Monitor for errors**

---

## Critical Implementation Notes

### ⚠️ ISOLATION IS MANDATORY

**The implementing agent MUST work in the isolated worktree:**
- Location: `/home/theseus/alexandria/daopad-balance-refactor/src/daopad`
- Branch: `feature/balance-bigint-refactor`
- Other agents ARE working in parallel in main repo
- File changes from other agents will corrupt your work

### DAOPad-Specific Requirements

#### Frontend-Only Deploy
```bash
# This refactor does NOT touch backend
./deploy.sh --network ic --frontend-only
```

#### No Candid Extraction Needed
- Backend not modified
- No type changes
- Skip candid-extractor step

#### Testing on Mainnet
```bash
# After deploy, test at:
https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io

# Check browser console for:
- No TypeError: can't convert BigInt
- All balances display correctly
- No "is not a function" errors
```

### Don't Guess - Verify

**Test utilities before integrating:**
```javascript
// In browser console after deploy:
import { formatBalance } from './utils/format.js';
formatBalance(500000000n, 8, { symbol: 'ICP' }); // Should return "5.00 ICP"
```

### Follow Existing Patterns

**React patterns:**
- Hooks for state management
- Redux selectors for derived data
- Error boundaries for resilience

**Import patterns:**
```javascript
// Use @ alias (configured in vite.config.js)
import { formatBalance } from '@/utils/format';
import { selectFormattedAccounts } from '@/features/orbit/orbitSelectors';
```

---

## Success Criteria

### Definition of Done

✅ **Functionality:**
- All 12 components display balances without TypeError
- Transfer dialog validates and displays balances correctly
- Sorting/filtering by balance works (uses balanceFloat)
- Zero balances show "0.00" not blank
- Large balances use compact notation

✅ **Code Quality:**
- Zero duplicate BigInt conversion logic
- All functions have JSDoc types
- Test coverage > 80% for format.js
- No console errors on mainnet

✅ **Performance:**
- No unnecessary re-renders (verified with React DevTools)
- Selectors properly memoized
- Initial render < 100ms

✅ **Maintainability:**
- Single source of truth for balance formatting
- Clear documentation in code comments
- Easy to add new balance display components
- Error boundaries prevent cascading failures

---

## Checkpoint Strategy

**This feature can be implemented in 1 PR:**

### Single PR Approach (Recommended)

**Branch:** `feature/balance-bigint-refactor`

**Commit sequence:**
1. Create core utilities (format.js, types)
2. Add Redux selectors
3. Refactor components
4. Add error boundaries
5. Add tests

**PR Title:** "feat: Rearchitect balance handling with BigInt utilities"

**PR Description:** (See embedded orchestrator prompt above)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Selector performance with 1000+ accounts | Low | Medium | Already using pagination (20 per page) |
| BigInt precision loss | Very Low | High | Extensive test coverage, use BigInt until final display |
| Breaking existing components | Low | High | Incremental testing, error boundaries |
| Missing edge cases in format.js | Low | Medium | Comprehensive unit tests |
| User confusion with compact notation | Very Low | Low | Only for values > 1M |

---

## Future Enhancements (Out of Scope)

**Nice-to-have features for later:**
1. WebWorker for very large datasets (1000+ accounts)
2. Real-time balance updates with WebSocket
3. Currency conversion (USD equivalent)
4. User preferences for decimal precision
5. Accessibility improvements (screen reader support)
6. Animated balance transitions

---

## Open Questions

1. **Decimal Precision:** Use 2 decimals for all tokens, or respect token-specific precision?
   - **Recommendation:** Respect token decimals (ICP=8, but allow others)

2. **Compact Notation Threshold:** When to switch to "1.2M" format?
   - **Recommendation:** > 1,000,000 (1 million)

3. **Error Logging:** Send BigInt errors to external monitoring?
   - **Recommendation:** No (keep simple for now, console.error sufficient)

4. **Redux State:** Store both raw and formatted balances in Redux?
   - **Recommendation:** Only raw BigInt (selectors format on-demand)

5. **Sorting:** Use `balanceFloat` or raw BigInt comparison?
   - **Recommendation:** `balanceFloat` (simpler, sufficient precision for sorting)

---

## Conclusion

**This refactor solves the immediate crash AND builds robust infrastructure:**

- **Immediate:** Fixes "can't convert BigInt to number" error
- **Short-term:** Creates missing `/src/utils/format.js` that 12 components need
- **Long-term:** Establishes patterns for all future balance displays

**Benefits:**
- ✅ No more BigInt crashes
- ✅ Consistent formatting across entire app
- ✅ Performance optimized with memoization
- ✅ Type-safe with JSDoc
- ✅ Error resilient with boundaries
- ✅ Easy to maintain and extend

**Estimated effort:** 7 hours total, 1 PR

---

🚀 **Ready to implement!** The orchestrator prompt at the top contains all execution instructions.
