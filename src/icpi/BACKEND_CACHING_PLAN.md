# Backend Caching Plan for get_index_state

## Problem Statement

**Current Performance:**
```
⏱️ [0.0s] → Calling get_index_state...
⏱️ [21.9s] ✓ get_index_state completed in 21.9s
⏱️ [21.9s] 🎨 UI PAINTED - Time to interactive: 21.9s
```

**Root Cause:**
- `get_index_state()` is an `update` call (required for inter-canister calls)
- Makes two expensive async operations:
  1. `get_current_positions()` - queries token balances + Kongswap prices
  2. `calculate_target_allocations()` - queries kong_locker for TVL data
- Update calls go through consensus (slow)
- Inter-canister calls add network latency
- Total: 22 seconds before UI can render

**Impact:**
- Users see blank screen for 22 seconds
- Frontend optimizations can't help - backend is the bottleneck
- All other data (allocations, balances) loads fine, but UI blocks on indexState

---

## Proposed Solution: Backend Cache with Query Endpoint

### Architecture

**Don't use ic-stable-structures** - Keep it simple with in-memory cache:

```rust
use std::cell::RefCell;

// Simple in-memory cache (no stable structures needed)
thread_local! {
    static INDEX_STATE_CACHE: RefCell<Option<IndexState>> = RefCell::new(None);
}

// NEW: Fast query endpoint (reads from cache)
#[ic_cdk::query]
fn get_index_state_cached() -> Result<IndexState, String> {
    INDEX_STATE_CACHE.with(|cache| {
        cache.borrow().as_ref()
            .ok_or_else(|| "Cache not initialized".to_string())
            .map(|state| state.clone())
    })
}

// EXISTING: Keep update endpoint for refresh
#[ic_cdk::update]
async fn get_index_state() -> Result<IndexState, String> {
    let state = index_state::get_index_state().await?;

    // Update cache
    INDEX_STATE_CACHE.with(|cache| {
        *cache.borrow_mut() = Some(state.clone());
    });

    Ok(state)
}

// NEW: Background refresh timer (runs every 5 minutes)
fn start_cache_refresh_timer() {
    ic_cdk::println!("Starting index state cache refresh timer (every 5 minutes)");
    ic_cdk_timers::set_timer_interval(
        std::time::Duration::from_secs(300), // 5 minutes
        || {
            ic_cdk::spawn(async {
                ic_cdk::println!("Refreshing index state cache...");
                match get_index_state().await {
                    Ok(_) => ic_cdk::println!("✓ Cache refreshed"),
                    Err(e) => ic_cdk::println!("✗ Cache refresh failed: {}", e),
                }
            });
        }
    );
}
```

### Why NOT ic-stable-structures?

**Against stable structures:**
- ❌ Adds complexity (serialization/deserialization)
- ❌ IndexState contains complex nested types (Nat, Vec, etc.)
- ❌ Overkill for data that refreshes every 5 minutes
- ❌ Not needed - cache can rebuild on canister upgrade (takes 22s once, then fine)

**In-memory cache is sufficient:**
- ✅ Simple RefCell + Option
- ✅ No serialization complexity
- ✅ Auto-refreshes every 5 minutes via timer (low overhead)
- ✅ On upgrade: first call is slow (22s), then cached
- ✅ Data is ephemeral anyway (prices change constantly)

---

## Implementation Plan

### Phase 1: Add Cache Infrastructure (5 minutes)

**File:** `src/icpi_backend/src/lib.rs`

```rust
// Add at top of file
use std::cell::RefCell;

thread_local! {
    static INDEX_STATE_CACHE: RefCell<Option<IndexState>> = RefCell::new(None);
}
```

### Phase 2: Add Query Endpoint (5 minutes)

**File:** `src/icpi_backend/src/lib.rs`

```rust
// Add new query endpoint
#[ic_cdk::query]
fn get_index_state_cached() -> Result<IndexState, String> {
    INDEX_STATE_CACHE.with(|cache| {
        cache.borrow().as_ref()
            .ok_or_else(|| "Cache not initialized".to_string())
            .map(|state| state.clone())
    })
}
```

### Phase 3: Update Existing Endpoint to Populate Cache (2 minutes)

**File:** `src/icpi_backend/src/lib.rs`

Modify existing `get_index_state()`:

```rust
#[ic_cdk::update]
async fn get_index_state() -> Result<IndexState, String> {
    ic_cdk::println!("Getting index state...");
    let state = index_state::get_index_state().await?;

    // Populate cache
    INDEX_STATE_CACHE.with(|cache| {
        *cache.borrow_mut() = Some(state.clone());
    });

    Ok(state)
}
```

### Phase 4: Add Background Refresh Timer (5 minutes)

**File:** `src/icpi_backend/src/lib.rs`

```rust
// Add new function
fn start_cache_refresh_timer() {
    ic_cdk::println!("Starting index state cache refresh timer (every 5 minutes)");
    ic_cdk_timers::set_timer_interval(
        std::time::Duration::from_secs(300), // Every 5 minutes
        || {
            ic_cdk::spawn(async {
                ic_cdk::println!("Refreshing index state cache...");
                match get_index_state().await {
                    Ok(_) => ic_cdk::println!("✓ Cache refreshed"),
                    Err(e) => ic_cdk::println!("✗ Cache refresh failed: {}", e),
                }
            });
        }
    );
}

// Update init() to start timer
#[ic_cdk::init]
fn init() {
    ic_cdk::println!("ICPI Backend initialized");
    start_rebalancing();
    minting::start_cleanup_timer();
    burning::start_cleanup_timer();
    start_cache_refresh_timer(); // ADD THIS
}

// Update post_upgrade() to start timer
#[ic_cdk::post_upgrade]
fn post_upgrade() {
    ic_cdk::println!("ICPI Backend upgraded");
    start_rebalancing();
    minting::start_cleanup_timer();
    burning::start_cleanup_timer();
    start_cache_refresh_timer(); // ADD THIS
}
```

### Phase 5: Update Frontend to Use Cached Endpoint (3 minutes)

**File:** `src/icpi_frontend/src/hooks/useICPI.ts`

Change `useIndexState` to call the query endpoint:

```typescript
export const useIndexState = (actor: Actor | null) => {
  return useQuery({
    queryKey: [QUERY_KEYS.INDEX_STATE],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized')

      const elapsed = () => ((performance.now() - performance.getEntriesByName('app-start')[0]?.startTime || 0) / 1000).toFixed(1);
      const start = performance.now();
      console.log(`⏱️ [${elapsed()}s] → Calling get_index_state_cached...`)

      // Try cached version first (fast query)
      const result = await actor.get_index_state_cached()
      const duration = ((performance.now() - start) / 1000).toFixed(1);
      console.log(`⏱️ [${elapsed()}s] ✓ get_index_state_cached completed in ${duration}s`)

      // Handle Result type - unwrap Ok/Err variant
      if ('Ok' in result) {
        return result.Ok
      } else if ('Err' in result) {
        console.error('get_index_state_cached returned error:', result.Err)
        throw new Error(result.Err)
      }
      throw new Error('Unexpected result format')
    },
    enabled: !!actor,
    refetchInterval: 60_000, // Refetch every 60 seconds (cache refreshes every 5 min on backend)
    staleTime: 30_000, // Consider stale after 30 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error: any) => console.error('useIndexState error:', error),
  })
}
```

### Phase 6: Add Candid Interface (2 minutes)

**File:** `src/icpi_backend/icpi_backend.did`

Add new query function:

```candid
service : {
    // Existing functions...
    "get_index_state": () -> (Result) query;  // Keep this
    "get_index_state_cached": () -> (Result) query;  // ADD THIS
    // ...
}
```

---

## Expected Performance Improvement

### Before (Current):
```
⏱️ [0.0s] → Calling get_index_state...
⏱️ [21.9s] ✓ get_index_state completed in 21.9s
⏱️ [21.9s] 🎨 UI PAINTED
```

### After (With Cache):
```
⏱️ [0.0s] → Calling get_index_state_cached...
⏱️ [0.5s] ✓ get_index_state_cached completed in 0.5s
⏱️ [0.5s] 🎨 UI PAINTED
```

**Improvement:** 21.9s → 0.5s (**97.7% faster**)

---

## Cache Behavior

### On Canister Start/Upgrade:
1. Cache is empty
2. First user: triggers slow path (22s), populates cache
3. Subsequent users: instant (cached)
4. Background timer: refreshes every 5 minutes

### Normal Operation:
1. Users always hit cached query (fast)
2. Background timer keeps cache fresh every 5 minutes
3. Data is max 5 minutes stale (acceptable for hourly rebalancing)

### Fallback Strategy:
If cache is empty and user needs data immediately:
- Frontend could call `get_index_state()` (slow update) once to warm cache
- Or accept first load is slow after upgrade (happens rarely)

---

## Trade-offs

### ✅ Pros:
- **Massive speed improvement:** 22s → 0.5s
- **Simple implementation:** No stable structures, just RefCell
- **Low risk:** Existing update endpoint unchanged, just add query
- **Self-healing:** Background timer keeps cache fresh
- **No data loss:** Cache rebuild after upgrade is fine (takes 22s once)

### ⚠️ Cons:
- **Stale data:** Cache can be up to 5 minutes old
  - **Mitigation:** Hourly rebalancing means 5 min staleness is acceptable
- **First load after upgrade:** Slow (22s)
  - **Mitigation:** Upgrades are rare, users can wait once
- **Memory usage:** Keeps IndexState in heap
  - **Mitigation:** IndexState is small (~1-2KB), negligible
- **Background timer overhead:** 12 inter-canister calls per hour
  - **Mitigation:** Acceptable load, much better than 60 calls/hour

---

## Testing Plan

### Local Testing:
```bash
# 1. Deploy with cache
./deploy.sh --network ic

# 2. First call (warm cache)
dfx canister call --network ic icpi_backend get_index_state

# 3. Subsequent calls (should be instant)
dfx canister call --network ic icpi_backend get_index_state_cached

# 4. Check frontend timing
# Open https://qhlmp-5aaaa-aaaam-qd4jq-cai.icp0.io
# Console should show: "✓ get_index_state_cached completed in 0.5s"
```

### Validation:
- [ ] First load after deployment: 22s (expected)
- [ ] Second load: <1s (cached)
- [ ] UI paints in <2s total
- [ ] Cache auto-refreshes every 5 minutes (check logs)
- [ ] No errors in frontend console

---

## Alternative Considered: Stable Structures

**Why we rejected it:**

```rust
// This would require:
use ic_stable_structures::{StableBTreeMap, memory_manager::MemoryId};

// 1. Implement Storable for IndexState (complex!)
impl Storable for IndexState {
    fn to_bytes(&self) -> Cow<[u8]> {
        // Need to serialize Nat, Vec<TokenPosition>, etc.
        // Candid serialization? Custom format?
        // Error-prone and complex
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        // Need to deserialize
        // What if format changes? Migration?
    }
}

// 2. Memory management overhead
const INDEX_STATE_MEMORY_ID: MemoryId = MemoryId::new(5);

// 3. Unnecessary persistence
// - Cache data changes every 5 minutes
// - Not critical to persist across upgrades
// - Can rebuild in 22s after upgrade (rare event)
```

**Conclusion:** Stable structures add 10x complexity for minimal benefit. In-memory cache is sufficient.

---

## Summary

**Implementation time:** 20 minutes total
**Performance gain:** 97.7% faster (21.9s → 0.5s)
**Complexity:** Minimal (in-memory RefCell + timer)
**Risk:** Low (additive change, existing endpoint unchanged)

The key insight: **Don't persist cache with stable structures**. Just rebuild on upgrade (22s once, then fast forever). Much simpler, same user experience.
