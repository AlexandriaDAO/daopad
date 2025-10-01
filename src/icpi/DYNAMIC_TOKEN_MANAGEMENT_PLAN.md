# Simple Token Management Refactoring Plan

## Overview
The ICPI index currently has token references scattered across multiple files. This plan centralizes token management using a simple enum enhancement that maintains type safety while providing a single source of truth.

## Current Problems

### 1. Hardcoded Token Lists in Multiple Places
- **TVL Calculator**: `src/icpi_backend/src/tvl_calculator.rs:14-17` - Manual initialization
- **Index State**: `src/icpi_backend/src/index_state.rs:232-235` - Hardcoded array
- **Balance Tracker**: `src/icpi_backend/src/balance_tracker.rs:71-72` - Manual iteration
- **lib.rs**: `src/icpi_backend/src/lib.rs:132` - String array for API response
- **lib.rs**: `src/icpi_backend/src/lib.rs:190-207` - Token info construction
- **Frontend**: `src/icpi_frontend/src/components/AllocationChart.tsx:22-29` - Token colors

### 2. Why NOT Use Dynamic Management
- **Project Principle**: "We shouldn't use stable structures or persistent storage anywhere unless absolutely necessary because we're working with real tokens and real balances"
- **Over-Engineering**: Only 4 curated tokens that rarely change
- **Type Safety**: Enum provides compile-time guarantees
- **Simplicity**: ~20 lines vs 150+ for dynamic system

## Proposed Solution: Enhanced Enum

### Core Design Principles
1. **Single Source of Truth**: Enum provides one place to define tokens
2. **Type Safety**: Compile-time guarantees, no string typos
3. **Minimal Changes**: ~20 lines of code total
4. **No Storage Risk**: No stable structures that could corrupt
5. **Simple Deployment**: When tokens change, redeploy (safer for curated index)

## Implementation

### Step 1: Enhance TrackedToken Enum

#### 1.1 Add Single Source of Truth to Enum
```rust
// MODIFY: src/icpi_backend/src/types.rs (add after line 14)

impl TrackedToken {
    // Single source of truth for all tracked tokens
    pub const ALL: [TrackedToken; 4] = [
        TrackedToken::ALEX,
        TrackedToken::ZERO,
        TrackedToken::KONG,
        TrackedToken::BOB,
    ];

    pub fn all() -> &'static [TrackedToken] {
        &Self::ALL
    }

    pub fn all_vec() -> Vec<TrackedToken> {
        Self::ALL.to_vec()
    }

    // Existing methods remain unchanged...
}
```

### Step 2: Update TVL Calculator

```rust
// MODIFY: src/icpi_backend/src/tvl_calculator.rs (lines 14-17)

// REPLACE:
tvl_by_token.insert(TrackedToken::ALEX, Decimal::ZERO);
tvl_by_token.insert(TrackedToken::ZERO, Decimal::ZERO);
tvl_by_token.insert(TrackedToken::KONG, Decimal::ZERO);
tvl_by_token.insert(TrackedToken::BOB, Decimal::ZERO);

// WITH:
for token in TrackedToken::all() {
    tvl_by_token.insert(token.clone(), Decimal::ZERO);
}

// MODIFY: src/icpi_backend/src/tvl_calculator.rs (line 125)
// REPLACE:
for token in [TrackedToken::ALEX, TrackedToken::ZERO, TrackedToken::KONG, TrackedToken::BOB] {

// WITH:
for token in TrackedToken::all() {

// MODIFY: src/icpi_backend/src/tvl_calculator.rs (line 233)
// REPLACE:
for token in [TrackedToken::ALEX, TrackedToken::ZERO, TrackedToken::KONG, TrackedToken::BOB] {

// WITH:
for token in TrackedToken::all() {
```

### Step 3: Update Index State

```rust
// MODIFY: src/icpi_backend/src/index_state.rs (lines 232-235)

// REPLACE:
let tokens = vec![
    TrackedToken::ALEX,
    TrackedToken::ZERO,
    TrackedToken::KONG,
    TrackedToken::BOB,
];

// WITH:
let tokens = TrackedToken::all_vec();
```

### Step 4: Update lib.rs

```rust
// MODIFY: src/icpi_backend/src/lib.rs (line 132)

// REPLACE:
tracked_tokens: vec!["ALEX".to_string(), "ZERO".to_string(), "KONG".to_string(), "BOB".to_string()],

// WITH:
tracked_tokens: TrackedToken::all().iter().map(|t| t.to_symbol().to_string()).collect(),

// MODIFY: src/icpi_backend/src/lib.rs (lines 189-209)

// REPLACE the entire Vec creation:
let tokens = vec![
    TokenInfo {
        symbol: "ALEX".to_string(),
        canister_id: TrackedToken::ALEX.get_canister_id()?,
        decimals: TrackedToken::ALEX.get_decimals(),
    },
    // ... etc
];

// WITH:
let tokens: Vec<TokenInfo> = TrackedToken::all()
    .iter()
    .map(|token| {
        Ok(TokenInfo {
            symbol: token.to_symbol().to_string(),
            canister_id: token.get_canister_id()?,
            decimals: token.get_decimals(),
        })
    })
    .collect::<Result<Vec<_>, String>>()?;
```

### Step 5: Add Query Endpoint for Frontend

```rust
// ADD to src/icpi_backend/src/lib.rs (after get_token_info)

#[ic_cdk::query]
fn get_tracked_tokens() -> Vec<String> {
    TrackedToken::all().iter().map(|t| t.to_symbol().to_string()).collect()
}
```

### Step 6: Update Candid Interface

```candid
// ADD to src/icpi_backend/icpi_backend.did (after get_token_info)

get_tracked_tokens : () -> (vec text) query;
```

### Step 7: Update Frontend to Query Tokens

```typescript
// ADD to src/icpi_frontend/src/hooks/useICPI.ts

export const useTrackedTokens = (actor: Actor | null) => {
  return useQuery({
    queryKey: ['trackedTokens'],
    queryFn: async () => {
      if (!actor) return ['ALEX', 'ZERO', 'KONG', 'BOB']; // Fallback
      return await actor.get_tracked_tokens();
    },
    staleTime: 5 * 60_000, // Cache for 5 minutes
  });
};
```

### Step 8: Dynamic Token Colors in Frontend

```tsx
// MODIFY: src/icpi_frontend/src/components/AllocationChart.tsx

// REPLACE TOKEN_COLORS constant with:
const getTokenColor = (token: string): string => {
  const colors: Record<string, string> = {
    ALEX: '#8B5CF6',
    ZERO: '#3B82F6',
    KONG: '#F97316',
    BOB: '#10B981',
  };
  return colors[token] || '#888888'; // Fallback gray
};

// Update Cell components to use:
fill={getTokenColor(entry.name)}
```

## Deployment Steps

1. **Update Backend**:
   - Add `TrackedToken::all()` method to types.rs
   - Update all hardcoded token references to use `TrackedToken::all()`
   - Add `get_tracked_tokens` query endpoint
   - Deploy: `./deploy.sh --network ic`

2. **Test Backend**:
   ```bash
   # Query tracked tokens
   dfx canister call icpi_backend get_tracked_tokens --network ic
   ```

3. **Update Frontend**:
   - Add `useTrackedTokens` hook
   - Replace hardcoded TOKEN_COLORS with function
   - Deploy frontend

## How to Add/Remove Tokens

### To Add a New Token (e.g., "CHAT")

1. **Add to Enum** (`src/icpi_backend/src/types.rs`):
```rust
pub enum TrackedToken {
    ALEX,
    ZERO,
    KONG,
    BOB,
    CHAT,  // NEW
}

impl TrackedToken {
    pub const ALL: [TrackedToken; 5] = [  // Update count
        TrackedToken::ALEX,
        TrackedToken::ZERO,
        TrackedToken::KONG,
        TrackedToken::BOB,
        TrackedToken::CHAT,  // NEW
    ];

    pub fn to_symbol(&self) -> &str {
        match self {
            // ... existing ...
            TrackedToken::CHAT => "CHAT",  // NEW
        }
    }

    pub fn get_canister_id(&self) -> Result<Principal, String> {
        match self {
            // ... existing ...
            TrackedToken::CHAT => Principal::from_text("xxxxx-xxxxx-xxxxx-xxxxx-cai")  // NEW
                .map_err(|e| format!("Invalid principal: {}", e)),
        }
    }

    pub fn get_decimals(&self) -> u8 {
        match self {
            // ... existing ...
            TrackedToken::CHAT => 8,  // NEW
        }
    }
}
```

2. **Update Frontend Colors** (`src/icpi_frontend/src/components/AllocationChart.tsx`):
```tsx
const getTokenColor = (token: string): string => {
  const colors: Record<string, string> = {
    ALEX: '#8B5CF6',
    ZERO: '#3B82F6',
    KONG: '#F97316',
    BOB: '#10B981',
    CHAT: '#EC4899',  // NEW - Pink
  };
  return colors[token] || '#888888';
};
```

3. **Deploy**: `./deploy.sh --network ic`

### To Remove a Token (e.g., remove "BOB")

1. **Remove from Enum** (`src/icpi_backend/src/types.rs`):
```rust
pub enum TrackedToken {
    ALEX,
    ZERO,
    KONG,
    // BOB removed
}

impl TrackedToken {
    pub const ALL: [TrackedToken; 3] = [  // Update count
        TrackedToken::ALEX,
        TrackedToken::ZERO,
        TrackedToken::KONG,
        // BOB removed
    ];

    // Remove BOB from all match statements
}
```

2. **Deploy**: `./deploy.sh --network ic`

3. **Frontend automatically adapts** via `get_tracked_tokens()` query

## Important Considerations

### What Happens to Existing Holdings When Removing a Token?

The plan needs to address this. When removing a token:

1. **Before Removal** - Execute a final rebalance to sell the token:
```rust
// Add a manual function to liquidate a specific token
#[ic_cdk::update]
async fn liquidate_token(token: TrackedToken) -> Result<String, String> {
    // Sell all holdings of this token for ckUSDT
    let balance = balance_tracker::get_token_balance(&token).await?;
    if balance > 0 {
        // Execute swap to ckUSDT
        kongswap::swap_tokens_for_usdt(token, balance).await?;
    }
    Ok(format!("Liquidated {} tokens", token.to_symbol()))
}
```

2. **Then Remove** - Update enum and redeploy

### What About User Redemptions?

When users redeem ICPI tokens, they should only receive the currently tracked tokens. This already works correctly because redemption uses `TrackedToken::all()`.

## Summary

This simple refactoring:
- **Adds ~20 lines** of code (vs 150+ for dynamic system)
- **Maintains type safety** with compile-time enum
- **Single source of truth** via `TrackedToken::all()`
- **No stable storage risks** - follows project principles
- **Easy to add/remove tokens** - just update enum and redeploy

The key insight: For a curated index with 4-5 tokens that rarely change, the safety and simplicity of compile-time configuration outweighs the convenience of runtime management.