# Performance Optimization Plan for DAOPad Frontend

## 🚨 MANDATORY: ISOLATION CHECK AND EXECUTION PROMPT

### Context: Worktree Already Created

**This plan was created by the planning agent in an isolated worktree.**

**Location:** `/home/theseus/alexandria/daopad-performance/src/daopad`
**Branch:** `feature/performance-optimization`
**Plan file:** `PERFORMANCE_OPTIMIZATION_PLAN.md` (in this worktree)

### Step 0: Verify Isolation (RUN THIS FIRST!)

```bash
# STOP! Verify you are in the correct worktree
REPO_ROOT=$(git rev-parse --show-toplevel)
CURRENT_BRANCH=$(git branch --show-current)

# Check you're NOT in main repo
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: You are in the MAIN repository"
    echo "❌ This plan was created in a worktree at:"
    echo "    /home/theseus/alexandria/daopad-performance"
    echo ""
    echo "Navigate to the worktree:"
    echo "  cd /home/theseus/alexandria/daopad-performance/src/daopad"
    echo "  cat PERFORMANCE_OPTIMIZATION_PLAN.md  # Plan is here"
    exit 1
fi

# Check you're on the right branch
if [ "$CURRENT_BRANCH" != "feature/performance-optimization" ]; then
    echo "❌ WARNING: You are on branch '$CURRENT_BRANCH'"
    echo "Expected: feature/performance-optimization"
    echo "Are you in the right worktree?"
    exit 1
fi

echo "✅ You are in the correct worktree: $REPO_ROOT"
echo "✅ On branch: $CURRENT_BRANCH"
echo "✅ Safe to proceed with implementation"
```

### Your Execution Prompt

You are an autonomous performance optimization expert implementing comprehensive frontend optimizations for DAOPad.

**NOTE:** The planning agent already created this worktree and this plan. You will navigate there and execute.

EXECUTE THESE STEPS AUTONOMOUSLY (DO NOT ASK FOR PERMISSION):

Step 0 - NAVIGATE TO WORKTREE (DO THIS FIRST):
  cd /home/theseus/alexandria/daopad-performance/src/daopad

Step 1 - VERIFY ISOLATION:
  # Verify you're in the right place
  pwd  # Should show /home/theseus/alexandria/daopad-performance/src/daopad
  git branch --show-current  # Should show feature/performance-optimization
  ls PERFORMANCE_OPTIMIZATION_PLAN.md  # This plan should be here

Step 2 - Implement Performance Optimizations:
  - Phase 1: React rendering optimizations (memoization, hooks)
  - Phase 2: Bundle optimization and code splitting
  - Phase 3: Network and caching layer
  - Phase 4: State management improvements
  - Phase 5: Asset and resource optimization

Step 3 - Build and Deploy:
  cd daopad_frontend
  npm run build
  cd ..
  ./deploy.sh --network ic --frontend-only

Step 4 - Performance Testing:
  # Test Core Web Vitals at deployed URL
  # Measure bundle size improvements
  # Verify reduced re-renders

Step 5 - Commit and Push:
  git add -A
  git commit -m "feat: Comprehensive frontend performance optimizations"
  git push -u origin feature/performance-optimization

Step 6 - Create PR:
  gh pr create --title "Frontend Performance Optimization Suite" --body "[Details from plan]"

YOUR CRITICAL RULES:
- You MUST work in /home/theseus/alexandria/daopad-performance/src/daopad (NOT main repo)
- Other agents ARE working in parallel - isolation is MANDATORY
- After sleep: IMMEDIATELY continue (no "should I check?" questions)
- Focus on measurable performance improvements
- ONLY STOP when: approved or critical error

START NOW with Step 0.

---

## Current State Analysis

### Performance Baseline Metrics

#### Bundle Size Analysis
```
Current dist size: 8.5MB total
Largest chunks:
- AppRoute-*.js: 441KB (main app logic)
- vendor-dfinity-*.js: 298KB (IC dependencies)
- vendor-react-*.js: 175KB (React core)
- index-*.js: 162KB (entry point)
- vendor-ui-*.js: 83KB (UI components)
```

#### Component Analysis
- **171 total React/JS files**
- **63 files using .map() operations** (potential optimization targets)
- **225 array operations** across 71 files
- **Largest components:**
  - TokenDashboard.jsx: 697 lines (needs splitting)
  - RequestOperationView.jsx: 577 lines
  - ExternalCanisterDialog.jsx: 574 lines
  - Multiple 400+ line components

#### Current Optimization State
- **Limited memoization:** Only 56 useMemo/useCallback instances across 22 files
- **Minimal lazy loading:** Only 2 files using React.lazy (App.jsx, TokenTabs.jsx)
- **No data fetching library:** No React Query, SWR, or similar
- **Basic caching:** Custom useSmartFetch hook with 30s stale time
- **Polling intervals:** 15-second refresh in UnifiedRequests
- **No virtual scrolling** for long lists
- **Limited code splitting:** Basic vendor chunks only

### Architecture Issues

#### Rendering Performance
1. **Unnecessary re-renders:** Components lack proper memoization
2. **Large component trees:** 600+ line components render everything
3. **Missing React.memo:** Most components not wrapped
4. **Inefficient lists:** No virtualization for large data sets
5. **No key optimization:** Potential index-based keys

#### Network Performance
1. **Sequential loading:** No parallel queries
2. **No request batching:** Each IC call is separate
3. **Missing cache layer:** Re-fetches on every mount
4. **No optimistic updates:** UI waits for backend
5. **Large payloads:** No pagination in some areas

#### Bundle Performance
1. **Monolithic chunks:** Large AppRoute bundle (441KB)
2. **No route splitting:** All routes in single chunk
3. **Vendor bloat:** All UI components loaded upfront
4. **Missing tree shaking:** Importing entire libraries
5. **No dynamic imports:** Components always loaded

#### State Management
1. **Redux everywhere:** Even for local state
2. **Normalized state missing:** Duplicated data
3. **No selector memoization:** Recalculating derived state
4. **Large state updates:** Replacing entire slices
5. **Missing middleware:** No persistence or caching

---

## Implementation Plan

### Phase 1: React Rendering Optimizations

#### File 1: `daopad_frontend/src/hooks/useOptimizedCallback.js` (NEW)

```javascript
// PSEUDOCODE - Optimized callback hook with dependency tracking

import { useCallback, useRef } from 'react';

export function useOptimizedCallback(callback, deps = []) {
    const callbackRef = useRef(callback);
    const depsRef = useRef(deps);

    // Only update if deps actually changed
    if (!shallowEqual(deps, depsRef.current)) {
        callbackRef.current = callback;
        depsRef.current = deps;
    }

    return useCallback((...args) => {
        return callbackRef.current(...args);
    }, []);  // Empty deps, stable reference
}

function shallowEqual(a, b) {
    // Implement shallow equality check
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}
```

#### File 2: `daopad_frontend/src/components/TokenDashboard.jsx` (MODIFY)

```javascript
// PSEUDOCODE - Split large component and add memoization

// Before: 697 lines monolithic component
// After: Split into smaller memoized sub-components

import React, { memo, useMemo, useCallback } from 'react';
import { useOptimizedCallback } from '../hooks/useOptimizedCallback';

// Extract sub-components
const TokenHeader = memo(({ token, metadata }) => {
    // Render token header
    return <div>...</div>;
});

const TokenMetrics = memo(({ votingPower, lpPositions }) => {
    // Render metrics section
    const totalValue = useMemo(() => {
        return calculateTotalValue(lpPositions);
    }, [lpPositions]);

    return <div>...</div>;
});

const TokenActions = memo(({ onRefresh, onPropose }) => {
    // Action buttons
    return <div>...</div>;
});

// Main component with optimizations
const TokenDashboard = memo(function TokenDashboard({
    token,
    tokens,
    activeTokenIndex,
    onTokenChange,
    tokenVotingPowers,
    identity,
    votingPower,
    lpPositions,
    onRefresh
}) {
    // Memoize expensive computations
    const processedData = useMemo(() => {
        return processTokenData(token, votingPower);
    }, [token?.canister_id, votingPower]);

    // Optimize callbacks
    const handleRefresh = useOptimizedCallback(() => {
        onRefresh?.();
    }, [onRefresh]);

    // Split rendering into sub-components
    return (
        <div>
            <TokenHeader token={token} metadata={tokenMetadata} />
            <TokenMetrics votingPower={votingPower} lpPositions={lpPositions} />
            <Suspense fallback={<TabSkeleton />}>
                <LazyTabContent activeTab={activeTab} />
            </Suspense>
            <TokenActions onRefresh={handleRefresh} />
        </div>
    );
});

export default TokenDashboard;
```

#### File 3: `daopad_frontend/src/components/VirtualizedList.jsx` (NEW)

```javascript
// PSEUDOCODE - Virtual scrolling for large lists

import { useVirtual } from '@tanstack/react-virtual';
import { useRef, memo } from 'react';

export const VirtualizedList = memo(({
    items,
    renderItem,
    itemHeight = 60,
    overscan = 5
}) => {
    const parentRef = useRef();

    const virtualizer = useVirtual({
        size: items.length,
        parentRef,
        estimateSize: useCallback(() => itemHeight, [itemHeight]),
        overscan
    });

    return (
        <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
            <div style={{ height: virtualizer.totalSize }}>
                {virtualizer.virtualItems.map(virtualRow => (
                    <div
                        key={virtualRow.index}
                        style={{
                            position: 'absolute',
                            top: virtualRow.start,
                            height: virtualRow.size
                        }}
                    >
                        {renderItem(items[virtualRow.index], virtualRow.index)}
                    </div>
                ))}
            </div>
        </div>
    );
});
```

### Phase 2: Bundle Optimization and Code Splitting

#### File 4: `daopad_frontend/vite.config.js` (MODIFY)

```javascript
// PSEUDOCODE - Enhanced Vite configuration for optimal bundling

export default defineConfig({
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    // More granular chunking strategy
                    if (id.includes('node_modules')) {
                        // Split vendor code by usage frequency
                        if (id.includes('@dfinity')) {
                            return 'vendor-dfinity';
                        }
                        if (id.includes('react') || id.includes('react-dom')) {
                            return 'vendor-react';
                        }
                        if (id.includes('@radix-ui')) {
                            // Split UI components by feature
                            if (id.includes('dialog')) return 'ui-dialogs';
                            if (id.includes('table')) return 'ui-tables';
                            return 'ui-core';
                        }
                        if (id.includes('redux')) {
                            return 'vendor-redux';
                        }
                        return 'vendor-misc';
                    }

                    // Split application code by feature
                    if (id.includes('/components/orbit/')) {
                        return 'feature-orbit';
                    }
                    if (id.includes('/components/canisters/')) {
                        return 'feature-canisters';
                    }
                    if (id.includes('/components/security/')) {
                        return 'feature-security';
                    }
                },
                // Optimize chunk names
                chunkFileNames: (chunkInfo) => {
                    const facadeModuleId = chunkInfo.facadeModuleId;
                    if (facadeModuleId) {
                        const name = facadeModuleId.split('/').pop().split('.')[0];
                        return `chunks/${name}-[hash].js`;
                    }
                    return 'chunks/[name]-[hash].js';
                }
            }
        },
        // Optimize CSS
        cssCodeSplit: true,
        // Better minification
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.debug']
            }
        }
    },

    // Add compression plugin
    plugins: [
        compression({
            algorithm: 'gzip',
            threshold: 10240  // 10KB
        }),
        compression({
            algorithm: 'brotliCompress',
            threshold: 10240
        })
    ]
});
```

#### File 5: `daopad_frontend/src/routes/LazyRoutes.jsx` (NEW)

```javascript
// PSEUDOCODE - Lazy loaded route components

import { lazy } from 'react';

// Lazy load all major routes
export const DashboardPage = lazy(() =>
    import(/* webpackChunkName: "dashboard" */ '../pages/DashboardPage')
);

export const RequestsPage = lazy(() =>
    import(/* webpackChunkName: "requests" */ '../pages/RequestsPage')
);

export const AddressBookPage = lazy(() =>
    import(/* webpackChunkName: "address-book" */ '../pages/AddressBookPage')
);

export const PermissionsPage = lazy(() =>
    import(/* webpackChunkName: "permissions" */ '../pages/PermissionsPage')
);

// Preload critical routes
export const preloadDashboard = () => {
    import('../pages/DashboardPage');
};

export const preloadRequests = () => {
    import('../pages/RequestsPage');
};
```

### Phase 3: Network and Caching Layer

#### File 6: `daopad_frontend/src/services/cache/QueryCache.js` (NEW)

```javascript
// PSEUDOCODE - Intelligent query caching system

class QueryCache {
    constructor() {
        this.cache = new Map();
        this.subscribers = new Map();
        this.gcTimer = null;
    }

    // Cache with TTL and automatic invalidation
    set(key, data, options = {}) {
        const { ttl = 30000, tags = [] } = options;

        const entry = {
            data,
            timestamp: Date.now(),
            ttl,
            tags,
            hitCount: 0
        };

        this.cache.set(key, entry);
        this.scheduleGC();

        // Notify subscribers
        this.notifySubscribers(key, data);
    }

    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // Check if expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }

        // Track usage for smart eviction
        entry.hitCount++;
        return entry.data;
    }

    // Invalidate by tag (e.g., all 'orbit' queries)
    invalidateByTag(tag) {
        for (const [key, entry] of this.cache.entries()) {
            if (entry.tags.includes(tag)) {
                this.cache.delete(key);
                this.notifySubscribers(key, null);
            }
        }
    }

    // Subscribe to cache updates
    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        this.subscribers.get(key).add(callback);

        // Return unsubscribe function
        return () => {
            const subs = this.subscribers.get(key);
            if (subs) {
                subs.delete(callback);
            }
        };
    }

    // Smart garbage collection
    scheduleGC() {
        if (this.gcTimer) return;

        this.gcTimer = setTimeout(() => {
            this.runGC();
            this.gcTimer = null;
        }, 60000);  // Run every minute
    }

    runGC() {
        const now = Date.now();
        const maxSize = 100;  // Max cache entries

        // Remove expired entries
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
            }
        }

        // If still over limit, remove least recently used
        if (this.cache.size > maxSize) {
            const sorted = Array.from(this.cache.entries())
                .sort((a, b) => a[1].hitCount - b[1].hitCount);

            for (let i = 0; i < sorted.length - maxSize; i++) {
                this.cache.delete(sorted[i][0]);
            }
        }
    }
}

export const queryCache = new QueryCache();
```

#### File 7: `daopad_frontend/src/hooks/useQuery.js` (NEW)

```javascript
// PSEUDOCODE - React Query-like hook with caching

import { useState, useEffect, useCallback, useRef } from 'react';
import { queryCache } from '../services/cache/QueryCache';

export function useQuery(key, fetcher, options = {}) {
    const {
        enabled = true,
        staleTime = 30000,
        cacheTime = 300000,
        retry = 3,
        retryDelay = 1000,
        onSuccess,
        onError,
        refetchInterval = null,
        refetchOnWindowFocus = true
    } = options;

    const [state, setState] = useState({
        data: null,
        error: null,
        isLoading: false,
        isFetching: false,
        isStale: false
    });

    const retryCount = useRef(0);
    const intervalRef = useRef(null);

    // Check cache first
    useEffect(() => {
        if (!enabled) return;

        const cachedData = queryCache.get(key);
        if (cachedData) {
            setState(prev => ({
                ...prev,
                data: cachedData,
                isStale: false
            }));
        } else {
            fetchData();
        }

        // Subscribe to cache updates
        const unsubscribe = queryCache.subscribe(key, (data) => {
            if (data) {
                setState(prev => ({ ...prev, data, isStale: false }));
            }
        });

        return unsubscribe;
    }, [key, enabled]);

    const fetchData = useCallback(async () => {
        setState(prev => ({
            ...prev,
            isLoading: !prev.data,
            isFetching: true
        }));

        try {
            const data = await fetcher();

            // Update cache
            queryCache.set(key, data, {
                ttl: cacheTime,
                tags: extractTags(key)
            });

            setState({
                data,
                error: null,
                isLoading: false,
                isFetching: false,
                isStale: false
            });

            onSuccess?.(data);
            retryCount.current = 0;
        } catch (error) {
            if (retryCount.current < retry) {
                retryCount.current++;
                setTimeout(() => fetchData(), retryDelay * retryCount.current);
            } else {
                setState(prev => ({
                    ...prev,
                    error,
                    isLoading: false,
                    isFetching: false
                }));
                onError?.(error);
            }
        }
    }, [key, fetcher]);

    // Refetch on interval
    useEffect(() => {
        if (refetchInterval && enabled) {
            intervalRef.current = setInterval(fetchData, refetchInterval);
            return () => clearInterval(intervalRef.current);
        }
    }, [refetchInterval, enabled]);

    // Refetch on window focus
    useEffect(() => {
        if (!refetchOnWindowFocus || !enabled) return;

        const handleFocus = () => {
            const age = Date.now() - queryCache.getAge(key);
            if (age > staleTime) {
                fetchData();
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [refetchOnWindowFocus, staleTime]);

    return {
        ...state,
        refetch: fetchData,
        invalidate: () => queryCache.invalidate(key)
    };
}
```

#### File 8: `daopad_frontend/src/services/BatchedICService.js` (NEW)

```javascript
// PSEUDOCODE - Batch IC canister calls

class BatchedICService {
    constructor() {
        this.pendingCalls = [];
        this.batchTimer = null;
        this.batchDelay = 50;  // 50ms batching window
    }

    // Queue a call for batching
    queueCall(canisterId, method, args) {
        return new Promise((resolve, reject) => {
            this.pendingCalls.push({
                canisterId,
                method,
                args,
                resolve,
                reject
            });

            this.scheduleBatch();
        });
    }

    scheduleBatch() {
        if (this.batchTimer) return;

        this.batchTimer = setTimeout(() => {
            this.executeBatch();
            this.batchTimer = null;
        }, this.batchDelay);
    }

    async executeBatch() {
        const batch = this.pendingCalls.splice(0);
        if (batch.length === 0) return;

        // Group by canister
        const grouped = batch.reduce((acc, call) => {
            if (!acc[call.canisterId]) {
                acc[call.canisterId] = [];
            }
            acc[call.canisterId].push(call);
            return acc;
        }, {});

        // Execute in parallel per canister
        const promises = Object.entries(grouped).map(async ([canisterId, calls]) => {
            try {
                // If canister supports batch operations
                if (this.supportsBatch(canisterId)) {
                    const results = await this.executeBatchCall(canisterId, calls);
                    calls.forEach((call, i) => call.resolve(results[i]));
                } else {
                    // Execute in parallel
                    const results = await Promise.all(
                        calls.map(call => this.executeSingleCall(call))
                    );
                    calls.forEach((call, i) => call.resolve(results[i]));
                }
            } catch (error) {
                calls.forEach(call => call.reject(error));
            }
        });

        await Promise.all(promises);
    }

    // Check if canister supports batch operations
    supportsBatch(canisterId) {
        // Check canister interface for batch methods
        return canisterBatchSupport[canisterId] || false;
    }
}

export const batchedIC = new BatchedICService();
```

### Phase 4: State Management Improvements

#### File 9: `daopad_frontend/src/features/selectors/memoizedSelectors.js` (NEW)

```javascript
// PSEUDOCODE - Memoized selectors with reselect

import { createSelector } from '@reduxjs/toolkit';

// Base selectors
const selectTokens = state => state.dao.tokens;
const selectStations = state => state.station.stations;
const selectRequests = state => state.orbit.requests;
const selectCurrentTokenId = state => state.dao.currentTokenId;

// Memoized computed selectors
export const selectCurrentToken = createSelector(
    [selectTokens, selectCurrentTokenId],
    (tokens, tokenId) => tokens.find(t => t.canister_id === tokenId)
);

export const selectActiveStation = createSelector(
    [selectStations, selectCurrentTokenId],
    (stations, tokenId) => stations[tokenId] || null
);

export const selectPendingRequests = createSelector(
    [selectRequests],
    (requests) => requests.filter(r =>
        r.status === 'Created' || r.status === 'Scheduled'
    )
);

export const selectRequestsByDomain = createSelector(
    [selectRequests, (state, domain) => domain],
    (requests, domain) => {
        if (domain === 'All') return requests;
        return requests.filter(r => r.domain === domain);
    }
);

// Complex selector with multiple dependencies
export const selectDashboardData = createSelector(
    [selectCurrentToken, selectActiveStation, selectPendingRequests],
    (token, station, pendingRequests) => ({
        token,
        station,
        pendingCount: pendingRequests.length,
        requiresAction: pendingRequests.some(r => r.requiresVote)
    })
);
```

#### File 10: `daopad_frontend/src/store/middleware/persistenceMiddleware.js` (NEW)

```javascript
// PSEUDOCODE - Redux persistence middleware

const STORAGE_KEY = 'daopad_state';
const PERSIST_WHITELIST = ['auth', 'dao', 'preferences'];

export const persistenceMiddleware = store => next => action => {
    const result = next(action);

    // Save to localStorage after state changes
    if (shouldPersist(action)) {
        const state = store.getState();
        const persistedState = {};

        PERSIST_WHITELIST.forEach(key => {
            if (state[key]) {
                persistedState[key] = state[key];
            }
        });

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
        } catch (e) {
            console.warn('Failed to persist state:', e);
        }
    }

    return result;
};

// Load persisted state on init
export const loadPersistedState = () => {
    try {
        const serialized = localStorage.getItem(STORAGE_KEY);
        if (!serialized) return undefined;

        const state = JSON.parse(serialized);

        // Validate and migrate if needed
        return migrateState(state);
    } catch (e) {
        console.warn('Failed to load persisted state:', e);
        return undefined;
    }
};

function shouldPersist(action) {
    // Don't persist on every action, only important ones
    return action.type.endsWith('/fulfilled') ||
           action.type.includes('update') ||
           action.type.includes('set');
}
```

### Phase 5: Asset and Resource Optimization

#### File 11: `daopad_frontend/src/components/LazyImage.jsx` (NEW)

```javascript
// PSEUDOCODE - Lazy loading images with intersection observer

import { useEffect, useRef, useState } from 'react';

export function LazyImage({
    src,
    placeholder,
    alt,
    className,
    threshold = 0.1,
    rootMargin = '50px'
}) {
    const [imageSrc, setImageSrc] = useState(placeholder);
    const [imageRef, setImageRef] = useState();
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        let observer;

        if (imageRef && imageSrc === placeholder) {
            observer = new IntersectionObserver(
                entries => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            setImageSrc(src);
                            observer.unobserve(imageRef);
                        }
                    });
                },
                { threshold, rootMargin }
            );
            observer.observe(imageRef);
        }

        return () => {
            if (observer && observer.unobserve) {
                observer.unobserve(imageRef);
            }
        };
    }, [imageRef, imageSrc, placeholder, src, threshold, rootMargin]);

    return (
        <img
            ref={setImageRef}
            src={imageSrc}
            alt={alt}
            className={`${className} ${isLoaded ? 'loaded' : 'loading'}`}
            onLoad={() => setIsLoaded(true)}
            loading="lazy"
        />
    );
}
```

#### File 12: `daopad_frontend/src/workers/dataProcessor.worker.js` (NEW)

```javascript
// PSEUDOCODE - Web Worker for heavy computations

// Process large datasets off the main thread
self.addEventListener('message', (event) => {
    const { type, data } = event.data;

    switch (type) {
        case 'PROCESS_VOTING_POWER':
            const result = calculateVotingPower(data);
            self.postMessage({ type: 'VOTING_POWER_RESULT', data: result });
            break;

        case 'AGGREGATE_TRANSACTIONS':
            const aggregated = aggregateTransactions(data);
            self.postMessage({ type: 'TRANSACTIONS_RESULT', data: aggregated });
            break;

        case 'FILTER_REQUESTS':
            const filtered = filterAndSortRequests(data.requests, data.filters);
            self.postMessage({ type: 'FILTERED_REQUESTS', data: filtered });
            break;
    }
});

function calculateVotingPower(positions) {
    // Heavy computation moved to worker
    return positions.reduce((total, position) => {
        const value = BigInt(position.amount) * BigInt(position.price);
        return total + value;
    }, BigInt(0));
}

function aggregateTransactions(transactions) {
    // Complex aggregation logic
    const grouped = {};
    for (const tx of transactions) {
        const key = `${tx.from}_${tx.to}`;
        if (!grouped[key]) {
            grouped[key] = {
                count: 0,
                totalAmount: BigInt(0),
                transactions: []
            };
        }
        grouped[key].count++;
        grouped[key].totalAmount += BigInt(tx.amount);
        grouped[key].transactions.push(tx);
    }
    return grouped;
}
```

#### File 13: `daopad_frontend/src/hooks/useWorker.js` (NEW)

```javascript
// PSEUDOCODE - Hook for using web workers

import { useEffect, useRef, useState } from 'react';

export function useWorker(workerPath) {
    const workerRef = useRef(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        workerRef.current = new Worker(workerPath);

        workerRef.current.addEventListener('message', (event) => {
            setResult(event.data);
            setLoading(false);
        });

        workerRef.current.addEventListener('error', (error) => {
            setError(error);
            setLoading(false);
        });

        return () => {
            workerRef.current?.terminate();
        };
    }, [workerPath]);

    const postMessage = (data) => {
        setLoading(true);
        setError(null);
        workerRef.current?.postMessage(data);
    };

    return { postMessage, result, error, loading };
}
```

---

## Testing Strategy

### Performance Metrics to Track

```javascript
// PSEUDOCODE - Performance monitoring setup

// Core Web Vitals tracking
export function trackWebVitals() {
    // Largest Contentful Paint
    new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            console.log('LCP:', entry.startTime);
            // Send to analytics
        }
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    // First Input Delay
    new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            const delay = entry.processingStart - entry.startTime;
            console.log('FID:', delay);
        }
    }).observe({ type: 'first-input', buffered: true });

    // Cumulative Layout Shift
    let clsValue = 0;
    new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
                clsValue += entry.value;
                console.log('CLS:', clsValue);
            }
        }
    }).observe({ type: 'layout-shift', buffered: true });
}
```

### Bundle Analysis Commands

```bash
# Analyze bundle size
npm run build
npx vite-bundle-visualizer

# Check for duplicates
npx duplicate-package-checker-webpack-plugin

# Measure performance
lighthouse https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io --view
```

### React DevTools Profiling

```javascript
// Enable profiling in development
if (process.env.NODE_ENV === 'development') {
    require('react-dom').unstable_enableSchedulerTracing = true;
}

// Profile specific interactions
import { unstable_trace as trace } from 'scheduler/tracing';

trace('token-dashboard-mount', performance.now(), () => {
    // Component mount logic
});
```

---

## Scope Estimate

### Files Modified
- **New files:** 13 (performance utilities, hooks, workers)
- **Modified files:** ~15 (major components, config files)
- **Test files:** 8 (performance tests)

### Lines of Code
- **New utilities:** ~800 lines
- **Component optimizations:** ~500 lines modified
- **Configuration:** ~200 lines
- **Tests:** ~400 lines
- **Net addition:** +1,200 lines

### Complexity
- **Low:** Memoization hooks, lazy loading
- **Medium:** Bundle optimization, caching layer
- **High:** Worker integration, query batching

### Time Estimate
- Phase 1 (React optimizations): 3-4 hours
- Phase 2 (Bundle optimization): 2-3 hours
- Phase 3 (Network/caching): 4-5 hours
- Phase 4 (State management): 2-3 hours
- Phase 5 (Assets/resources): 2-3 hours
- Testing & validation: 3-4 hours
- **Total:** 16-22 hours

### Checkpoint Strategy

This feature should be implemented in **3 PRs**:

**PR #1: React Rendering Optimizations**
- Memoization improvements
- Component splitting
- Virtual scrolling
- Impact: 30-40% rendering improvement

**PR #2: Bundle & Network Optimization**
- Code splitting enhancements
- Caching layer implementation
- Request batching
- Impact: 50% bundle size reduction

**PR #3: Advanced Optimizations**
- Web Workers integration
- Asset optimization
- State management improvements
- Impact: Overall 2x performance gain

---

## Critical Implementation Notes

### 🚨 ISOLATION IS MANDATORY
**The implementing agent MUST work in the isolated worktree because:**
- Other agents are working in parallel in the main repo
- Performance changes affect many files
- Measurements need controlled environment

### Performance-Specific Requirements

#### Avoid Premature Optimization
**Profile first, optimize second:**
```bash
# Use React DevTools Profiler
# Record performance before changes
# Measure impact of each optimization
# Document improvements
```

#### Bundle Size Tracking
**Monitor bundle impact:**
```bash
# Before changes
du -sh daopad_frontend/dist/

# After each phase
npm run build
du -sh daopad_frontend/dist/
ls -la daopad_frontend/dist/assets/*.js | awk '{sum+=$5} END {print sum}'
```

#### Testing Strategy
1. Lighthouse CI scores before/after
2. React DevTools flamegraph comparison
3. Network waterfall analysis
4. Memory usage profiling
5. User-perceived performance testing

### Don't Break Existing Functionality
- Maintain all current features
- Preserve IC integration behavior
- Keep Redux state structure compatible
- Test all user flows after optimizations

### Do Follow Performance Best Practices
- Measure → Optimize → Measure
- Focus on user-perceived performance
- Prioritize critical rendering path
- Optimize for mobile devices
- Consider network conditions

---

## Success Criteria

### Measurable Goals
1. **Bundle Size**: Reduce main bundle by 40% (441KB → 265KB)
2. **LCP**: Under 2.5 seconds
3. **FID**: Under 100ms
4. **CLS**: Under 0.1
5. **Initial Load**: Under 3 seconds on 3G
6. **Re-render Count**: 50% reduction in unnecessary renders

### User Experience Goals
1. Instant feedback on interactions
2. Smooth scrolling on all lists
3. No jank during navigation
4. Fast subsequent page loads
5. Responsive on mobile devices

### Technical Goals
1. Proper code splitting by route
2. Effective caching strategy
3. Optimized state updates
4. Minimal memory leaks
5. Efficient resource loading

---

## 🚀 Handoff to Implementing Agent

**Plan Complete:** Frontend Performance Optimization

**Location:** `/home/theseus/alexandria/daopad-performance/src/daopad`
**Branch:** `feature/performance-optimization`
**Document:** `PERFORMANCE_OPTIMIZATION_PLAN.md` (committed to feature branch)

**Estimated:** 16-22 hours, 3 PRs

**The implementing agent should:**
1. Navigate to the worktree
2. Follow the phased implementation approach
3. Measure performance at each phase
4. Create separate PRs for reviewability
5. Document performance improvements

---

**END OF PLAN**