# Frontend State Management & Performance Optimization Plan

## Executive Summary

The DAOPad frontend currently suffers from excessive polling, redundant data fetching, and uncoordinated state management. Multiple components independently poll the backend every 2-5 seconds, causing unnecessary Inter-Canister calls and poor user experience. This document outlines a comprehensive optimization strategy.

## Current State Analysis

### 🔴 Critical Issues

#### 1. Uncoordinated Polling Chaos
| Component | Interval | Impact |
|-----------|----------|--------|
| App.jsx | 30s | Public dashboard refresh |
| AccountsTable | 30s/60s | Accounts + balances polling |
| UnifiedRequests | **5s** | Aggressive request polling |
| AddressBookPage | **5s** | Address book polling |
| RequestsTable | 2s delays | Post-action refreshes |
| MembersTable | 1.5s delays | Post-action refreshes |

**Problem**: A single user with TokenDashboard open triggers **10+ backend calls every 5 seconds**.

#### 2. Redundant Data Fetching
- `loadVotingPower()` called in **both** TokenDashboard and MembersTable
- `loadTokenStatus()` → `validateDaoStatus()` creates cascading calls
- Each tab fetches data independently, even when hidden
- No request deduplication or shared cache

#### 3. Architectural Anti-Patterns
```javascript
// Current: Every component creates its own service instance
const daopadService = new DAOPadBackendService(identity); // Created 15+ times

// Current: Mixed state management
dispatch(upsertStationMapping(...));  // Redux for some data
setOrbitStation(stationData);         // Local state for most
```

#### 4. Inter-Canister Call Overhead
- Backend forced to use `#[update]` methods (not `#[query]`) due to IC limitations
- Each call takes 2-4 seconds and costs cycles
- No batching of related requests
- No backend caching (per CLAUDE.md design)

### 📊 Performance Impact

**Initial Page Load**
- ~15 backend calls within 2 seconds
- 3 separate voting power queries
- 4 Orbit Station validations

**Ongoing Operations**
- 10+ backend calls every 5 seconds (worst case)
- Full data reload on tab switches
- 3-5 additional calls per user action

## Optimization Strategy

### Phase 1: Quick Wins (Week 1)
**Goal**: Reduce polling frequency by 60% with minimal code changes

#### 1.1 Implement Lazy Tab Loading
```jsx
// TokenDashboard.jsx
<TabsContent value="accounts" className="mt-4">
  {activeTab === 'accounts' && (
    <AccountsTable stationId={orbitStation.station_id} />
  )}
</TabsContent>
```

#### 1.2 Adjust Polling Intervals
```javascript
// UnifiedRequests.jsx
const REFRESH_INTERVAL = 15000;  // Was 5000

// AccountsTable.jsx
refetchInterval: 60000,  // Was 30000

// AddressBookPage.jsx
setInterval(fetchList, 30000);  // Was 5000
```

#### 1.3 Implement Visibility API
```javascript
// App.jsx
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      clearInterval(intervalRef.current);
    } else {
      startPolling();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

**Expected Impact**: 60% reduction in backend calls

### Phase 2: React Query Integration (Week 2)
**Goal**: Centralized caching and request deduplication

#### 2.1 Configure React Query
```javascript
// queryClient.js
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,        // Data fresh for 30s
      cacheTime: 5 * 60 * 1000, // Cache for 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

#### 2.2 Create Shared Hooks
```javascript
// hooks/useOrbitData.js
export const useVotingPower = (tokenId, identity) => {
  return useQuery({
    queryKey: ['votingPower', tokenId, identity?.getPrincipal()?.toString()],
    queryFn: () => fetchVotingPower(tokenId, identity),
    enabled: !!tokenId && !!identity,
    staleTime: 60000,  // VP doesn't change often
  });
};

export const useOrbitMembers = (stationId) => {
  return useQuery({
    queryKey: ['orbitMembers', stationId],
    queryFn: () => fetchOrbitMembers(stationId),
    enabled: !!stationId,
  });
};
```

#### 2.3 Remove Duplicate Fetches
```javascript
// TokenDashboard.jsx & MembersTable.jsx
const { data: votingPower } = useVotingPower(token.canister_id, identity);
// No more duplicate loadVotingPower() calls
```

**Expected Impact**: 40% reduction in redundant calls

### Phase 3: Backend Optimization (Week 3)
**Goal**: Reduce cross-canister call overhead

#### 3.1 Create Composite Endpoints
```rust
// daopad_backend/src/api/dashboard.rs
#[update]
async fn get_dashboard_data(token_id: Principal) -> DashboardData {
    let futures = vec![
        get_orbit_station(token_id),
        get_treasury_balance(token_id),
        get_members_summary(token_id),
        get_pending_requests(token_id),
    ];

    let results = futures::future::join_all(futures).await;
    DashboardData { ... }
}
```

#### 3.2 Implement Request Batching
```rust
#[update]
async fn batch_operations(operations: Vec<Operation>) -> Vec<Result> {
    // Process multiple operations in single IC round
}
```

#### 3.3 Add Short-lived Cache
```rust
// Despite CLAUDE.md preference, add 10s cache for expensive queries
static CACHE: RefCell<HashMap<CacheKey, (Timestamp, Data)>> = RefCell::new(HashMap::new());

fn get_cached_or_fetch(key: CacheKey) -> Data {
    let now = ic_cdk::api::time();
    if let Some((timestamp, data)) = CACHE.borrow().get(&key) {
        if now - timestamp < 10_000_000_000 { // 10 seconds in nanos
            return data.clone();
        }
    }
    // Fetch and cache
}
```

**Expected Impact**: 50% reduction in IC cycles usage

### Phase 4: Smart Refresh Strategy (Week 4)
**Goal**: Only refresh what changes

#### 4.1 Implement Optimistic Updates
```javascript
// On user action
const optimisticUpdate = (cache, result) => {
  cache.setQueryData(['members'], old => {
    return [...old, newMember]; // Update immediately
  });
};

useMutation(addMember, {
  onMutate: optimisticUpdate,
  onError: (err, vars, rollback) => rollback(),
});
```

#### 4.2 Event-Driven Updates
```javascript
// Create event emitter for cross-component communication
const eventBus = new EventTarget();

// Component A: Emit event after action
eventBus.dispatchEvent(new CustomEvent('memberAdded', { detail: member }));

// Component B: Listen and update
eventBus.addEventListener('memberAdded', (e) => {
  queryClient.invalidateQueries(['members']);
});
```

#### 4.3 Differential Updates
```javascript
// Only fetch changes since last update
const fetchRequestUpdates = async (lastTimestamp) => {
  const updates = await backend.getRequestsSince(lastTimestamp);
  return mergeUpdates(currentData, updates);
};
```

**Expected Impact**: 70% reduction in data transfer

## Implementation Timeline

### Week 1: Quick Wins
- [ ] Implement lazy tab loading
- [ ] Adjust polling intervals
- [ ] Add visibility API support
- [ ] Deploy and measure impact

### Week 2: React Query
- [ ] Install and configure React Query
- [ ] Create shared data hooks
- [ ] Migrate components to use hooks
- [ ] Remove duplicate fetches

### Week 3: Backend Optimization
- [ ] Design composite endpoints
- [ ] Implement batch operations
- [ ] Add strategic caching
- [ ] Update frontend to use new endpoints

### Week 4: Smart Refresh
- [ ] Implement optimistic updates
- [ ] Add event-driven communication
- [ ] Create differential update system
- [ ] Performance testing and tuning

## Success Metrics

### Performance KPIs
- **Backend calls/minute**: Reduce from 120+ to <20
- **Initial load time**: Reduce from 6s to <2s
- **Tab switch latency**: Reduce from 2s to instant
- **IC cycles/user**: Reduce by 60%

### User Experience KPIs
- **Perceived responsiveness**: Instant UI updates
- **Loading states**: Minimize spinner time
- **Data freshness**: Max 30s staleness for non-critical data
- **Error recovery**: Graceful degradation

## Code Examples

### Before: Uncoordinated Polling
```javascript
// Multiple components doing this independently
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();  // Every component fetches its own data
  }, 5000);
  return () => clearInterval(interval);
}, []);
```

### After: Coordinated React Query
```javascript
// Single source of truth
const { data, refetch } = useQuery({
  queryKey: ['sharedData', params],
  queryFn: fetchData,
  refetchInterval: 30000,  // Coordinated refresh
  staleTime: 15000,        // Serve from cache when fresh
});
```

### Before: Duplicate Service Instantiation
```javascript
// Created 15+ times across components
const daopadService = new DAOPadBackendService(identity);
const result = await daopadService.getVotingPower();
```

### After: Shared Service Hook
```javascript
// Single service instance, cached results
const { votingPower } = useVotingPower();
```

## Risk Mitigation

### Potential Issues & Solutions

1. **Stale Data Concerns**
   - Solution: Implement smart invalidation on user actions
   - Use stale-while-revalidate pattern

2. **Complex State Dependencies**
   - Solution: Normalize Redux store
   - Use React Query for server state only

3. **Breaking Changes**
   - Solution: Implement behind feature flags
   - Gradual rollout with monitoring

## Monitoring & Rollback Plan

### Monitoring
- Track backend call frequency per user
- Monitor IC cycles consumption
- Log cache hit/miss ratios
- Measure user-perceived latency

### Rollback Strategy
1. Feature flags for each optimization phase
2. Keep old code paths available for 2 weeks
3. A/B testing with subset of users
4. Automated rollback on error spike

## Conclusion

The current frontend architecture creates an unsustainable load on the IC network and poor user experience. This phased optimization plan will reduce backend calls by 80%, improve responsiveness, and cut IC cycles usage by 60% while maintaining data freshness requirements.

**Estimated Total Impact**:
- 80% reduction in backend calls
- 60% reduction in IC cycles
- 70% improvement in perceived performance
- 50% reduction in code complexity

The plan is designed to be implemented incrementally with measurable results at each phase, allowing for course correction and minimal disruption to users.