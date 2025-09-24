# DAOPad Frontend Code Optimization Plan

## Executive Summary
This plan outlines a systematic approach to reduce the DAOPad frontend codebase by ~25% (800-1000 lines) while improving maintainability and performance. The optimization focuses on eliminating duplication, consolidating services, and removing dead code without losing any functionality.

## Current Frontend Structure

```
src/
├── components/           (60+ files, ~3500 lines)
├── services/            (8 files, ~900 lines)
├── hooks/               (9 files, ~300 lines)
├── features/            (3 slices, ~400 lines)
├── state/               (2 files, ~150 lines)
├── pages/               (3 files, ~250 lines)
├── providers/           (2 files, ~150 lines)
├── declarations/        (auto-generated)
├── utils/               (4 files, ~200 lines)
└── ui/                  (22 files, ~500 lines)

Total: 131 files, ~6500 lines of code
```

## Identified Issues

### 1. Service Layer Duplication
- **orbitStation.js** (150 lines): Direct IC calls to Orbit
- **orbitStationService.js** (120 lines): Wrapper around orbitStation.js
- **orbit/stationClient.js** (180 lines): Another Orbit client implementation
- **orbit/stationService.js** (250 lines): High-level Orbit operations
- **orbit/stationQueries.js** (200 lines): React Query hooks for Orbit

**Total redundancy**: ~500 lines of overlapping functionality

### 2. Component Code Duplication
- Table logic repeated in AccountsTable, MembersTable, RequestsTable
- Status badge logic duplicated across 5+ components
- Loading states implemented separately in 10+ components
- Action button patterns repeated in 8+ components

### 3. State Management Fragmentation
- Redux for auth, dao, station, balance
- React Query for some server state
- Local component state scattered throughout
- No clear separation of concerns

### 4. Unused/Dead Code
- testOrbitCall.jsx (35 lines)
- ReactQueryDemo.jsx (45 lines)
- OrbitStationTest.jsx (40 lines)
- lp_lock_frontend/ directory (20 lines)
- daopad_frontend/src/ duplicate structure (10 lines)
- setupTests.js (5 lines - no tests exist)
- tests/App.test.jsx (15 lines - not maintained)

### 5. Redundant UI Components
- calendar.jsx (45 lines) - never used
- popover.jsx (35 lines) - used once, can use tooltip
- radio-group.jsx (40 lines) - never used
- separator.jsx (15 lines) - used twice, can use CSS
- progress.jsx (30 lines) - used once, can use skeleton

---

## Optimization Plan

### 1. Service Layer Consolidation
**Target: ~300 lines reduction**

#### Current Structure
```
services/
├── orbitStation.js          (150 lines)
├── orbitStationService.js   (120 lines)
├── orbit/
│   ├── stationClient.js     (180 lines)
│   ├── stationQueries.js    (200 lines)
│   └── stationService.js    (250 lines)
```

#### Proposed Structure
```
services/
├── orbit.js                 (400 lines - unified service)
└── orbit/
    └── queries.js           (150 lines - React Query hooks only)
```

#### Pseudocode Implementation
```javascript
// services/orbit.js - Unified Orbit Service
class OrbitService {
  constructor() {
    this.actor = null
    this.stationId = null
  }

  // Low-level API calls (from orbitStation.js)
  async call(method, args) {
    if (!this.actor) throw new Error('Not initialized')
    return await this.actor[method](...args)
  }

  // High-level operations (from stationService.js)
  async createTransfer(data) {
    validateTransferData(data)
    const request = transformToOrbitRequest(data)
    return await this.call('create_request', [request])
  }

  // Station management (from orbitStationService.js)
  async setActiveStation(stationId) {
    this.stationId = stationId
    this.actor = await createActor(stationId)
  }

  // Common queries (deduplicated)
  async listRequests(filters) {
    return await this.call('list_requests', [filters])
  }

  async listAccounts() {
    return await this.call('list_accounts', [{}])
  }
}

export const orbitService = new OrbitService()

// services/orbit/queries.js - React Query Hooks
export function useOrbitRequests(stationId) {
  return useQuery({
    queryKey: ['orbit', 'requests', stationId],
    queryFn: () => orbitService.listRequests({ stationId }),
    staleTime: 30000
  })
}

export function useOrbitAccounts(stationId) {
  return useQuery({
    queryKey: ['orbit', 'accounts', stationId],
    queryFn: () => orbitService.listAccounts({ stationId }),
    staleTime: 60000
  })
}
```

**Functionality Impact**: ✅ NONE - All capabilities preserved

---

### 2. Component Decomposition
**Target: ~200 lines reduction through reusability**

#### A. Common DataTable Component
```javascript
// components/common/DataTable.jsx
function DataTable({
  columns,      // Column definitions
  data,         // Data array
  loading,      // Loading state
  onRowClick,   // Row click handler
  actions,      // Action buttons config
  emptyMessage  // Empty state message
}) {
  if (loading) return <TableSkeleton columns={columns} />
  if (!data?.length) return <EmptyState message={emptyMessage} />

  return (
    <Table>
      <TableHeader>
        {columns.map(col => (
          <TableHead key={col.key}>{col.label}</TableHead>
        ))}
      </TableHeader>
      <TableBody>
        {data.map(row => (
          <TableRow onClick={() => onRowClick?.(row)}>
            {columns.map(col => (
              <TableCell>
                {col.render ? col.render(row) : row[col.key]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// Usage in AccountsTable.jsx (reduces from 150 to 50 lines)
function AccountsTable({ accounts }) {
  const columns = [
    { key: 'name', label: 'Account' },
    { key: 'balance', label: 'Balance', render: row => formatBalance(row.balance) },
    { key: 'actions', label: '', render: row => <TransferButton account={row} /> }
  ]

  return <DataTable columns={columns} data={accounts} />
}
```

#### B. StatusBadge Component
```javascript
// components/common/StatusBadge.jsx
const STATUS_CONFIGS = {
  created: { color: 'blue', label: 'Created' },
  processing: { color: 'yellow', label: 'Processing' },
  completed: { color: 'green', label: 'Completed' },
  failed: { color: 'red', label: 'Failed' },
  rejected: { color: 'gray', label: 'Rejected' }
}

function StatusBadge({ status, size = 'sm' }) {
  const config = STATUS_CONFIGS[status] || { color: 'gray', label: status }
  return (
    <Badge variant={config.color} size={size}>
      {config.label}
    </Badge>
  )
}
```

#### C. ActionBar Component
```javascript
// components/common/ActionBar.jsx
function ActionBar({
  title,
  actions = [],  // [{ label, onClick, icon, variant }]
  filters,       // Optional filter component
  search         // Optional search config
}) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h2>{title}</h2>
      <div className="flex gap-2">
        {search && <SearchInput {...search} />}
        {filters}
        {actions.map(action => (
          <Button
            key={action.label}
            onClick={action.onClick}
            variant={action.variant}
          >
            {action.icon} {action.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
```

**Functionality Impact**: ✅ NONE - Enhanced reusability and consistency

---

### 3. State Management Simplification
**Target: ~150 lines reduction**

#### Current State Management
```javascript
// Redux: auth, dao, station, balance slices (400 lines)
// React Query: Some server state
// Local State: Scattered throughout components
```

#### Proposed Architecture
```javascript
// Remove balance slice entirely - use React Query
// balanceSlice.js - DELETE (80 lines)
// balanceThunks.js - DELETE (70 lines)

// Simplify station slice
// features/station/stationSlice.js
const stationSlice = createSlice({
  name: 'station',
  initialState: {
    activeStationId: null  // Only UI state
  },
  reducers: {
    setActiveStation: (state, action) => {
      state.activeStationId = action.payload
    }
  }
})

// Use React Query for all server state
function useBalance(accountId) {
  return useQuery({
    queryKey: ['balance', accountId],
    queryFn: () => orbitService.getBalance(accountId),
    staleTime: 10000  // Refresh every 10s
  })
}
```

**Functionality Impact**:
- ❌ **Lost**: Redux DevTools time-travel for balance state
- ✅ **Gained**: Automatic cache invalidation
- ✅ **Gained**: Built-in loading/error states from React Query
- ✅ **Gained**: Simpler data flow

---

### 4. Dead Code Removal
**Target: ~170 lines immediate removal**

| File | Lines | Functionality Loss |
|------|-------|-------------------|
| `testOrbitCall.jsx` | 35 | ✅ NONE - Test file not used |
| `ReactQueryDemo.jsx` | 45 | ✅ NONE - Demo component |
| `OrbitStationTest.jsx` | 40 | ✅ NONE - Test component |
| `lp_lock_frontend/` | 20 | ✅ NONE - Unused directory |
| `daopad_frontend/src/` | 10 | ✅ NONE - Duplicate structure |
| `setupTests.js` | 5 | ⚠️ Jest test setup (no tests exist) |
| `tests/App.test.jsx` | 15 | ⚠️ Single test file (not maintained) |

**Total**: 170 lines removed
**Functionality Impact**: No production functionality lost. Testing infrastructure removed but wasn't being used.

---

### 5. Hook Consolidation
**Target: ~50 lines reduction**

#### Current Hooks
```javascript
// hooks/useActiveStation.js (20 lines)
// hooks/useStationService.js (25 lines)
// hooks/useOrbitData.js (30 lines)
```

#### Consolidated Hook
```javascript
// hooks/useOrbit.js - Single unified hook
function useOrbit() {
  const { activeStationId } = useSelector(state => state.station)
  const queryClient = useQueryClient()

  // Combine all Orbit-related queries
  const requests = useQuery({
    queryKey: ['orbit', 'requests', activeStationId],
    queryFn: () => orbitService.listRequests(activeStationId),
    enabled: !!activeStationId
  })

  const accounts = useQuery({
    queryKey: ['orbit', 'accounts', activeStationId],
    queryFn: () => orbitService.listAccounts(activeStationId),
    enabled: !!activeStationId
  })

  // Combine all mutations
  const createTransfer = useMutation({
    mutationFn: (data) => orbitService.createTransfer(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['orbit', 'requests'])
      queryClient.invalidateQueries(['orbit', 'accounts'])
    }
  })

  return {
    stationId: activeStationId,
    requests,
    accounts,
    createTransfer,
    isReady: !!activeStationId,
    refetchAll: () => queryClient.invalidateQueries(['orbit'])
  }
}

// Usage - Much simpler!
function MyComponent() {
  const { requests, createTransfer, isReady } = useOrbit()
  // ...
}
```

**Functionality Impact**: ✅ NONE - Enhanced developer experience

---

### 6. UI Component Library Audit
**Target: ~165 lines reduction**

| Component | Used In | Lines | Remove? | Impact if Removed |
|-----------|---------|-------|---------|-------------------|
| `calendar.jsx` | NONE | 45 | ✅ Yes | ✅ NONE |
| `popover.jsx` | 1 component | 35 | ✅ Yes | Use Tooltip instead (slightly less positioning options) |
| `radio-group.jsx` | NONE | 40 | ✅ Yes | ✅ NONE |
| `separator.jsx` | 2 places | 15 | ✅ Yes | Use CSS borders (no semantic HTML) |
| `progress.jsx` | 1 place | 30 | ✅ Yes | Use skeleton loader (different visual) |
| `switch.jsx` | 2 places | 25 | ❌ No | Would need checkbox refactor |
| `textarea.jsx` | 3 places | 20 | ❌ No | Forms would break |

**Total Removal**: 165 lines
**Functionality Impact**:
- Popover → Tooltip: Slightly less flexible positioning
- Separator → CSS: Loss of semantic HTML divider
- Progress → Skeleton: Different loading visualization

---

## Implementation Priority

### Phase 1: Quick Wins (1 day)
```bash
# 1. Delete dead code
rm src/testOrbitCall.jsx
rm src/ReactQueryDemo.jsx
rm src/OrbitStationTest.jsx
rm -rf src/lp_lock_frontend/
rm -rf src/daopad_frontend/src/
rm src/setupTests.js
rm -rf src/tests/

# 2. Remove unused UI components
rm src/components/ui/calendar.jsx
rm src/components/ui/popover.jsx
rm src/components/ui/radio-group.jsx
rm src/components/ui/separator.jsx
rm src/components/ui/progress.jsx

# 3. Update imports where needed
```
**Impact**: ~335 lines removed immediately

### Phase 2: Hook Consolidation (1 day)
```javascript
// 1. Create hooks/useOrbit.js
// 2. Update all components to use unified hook
// 3. Delete old hooks
```
**Impact**: ~50 lines removed, cleaner imports

### Phase 3: Service Layer (2 days)
```javascript
// 1. Create services/orbit.js
// 2. Move React Query hooks to services/orbit/queries.js
// 3. Update all imports
// 4. Delete old service files
```
**Impact**: ~300 lines removed, cleaner architecture

### Phase 4: Component Refactor (3 days)
```javascript
// 1. Create components/common/ directory
// 2. Implement DataTable, StatusBadge, ActionBar
// 3. Refactor existing components to use common ones
// 4. Remove duplication
```
**Impact**: ~200 lines removed, better maintainability

### Phase 5: State Management (2 days)
```javascript
// 1. Remove balance state management
// 2. Simplify Redux usage
// 3. Migrate to React Query for server state
```
**Impact**: ~150 lines removed, simpler data flow

---

## Success Metrics

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Total Lines | ~6500 | ~5500 | -15% |
| File Count | 131 | 100 | -24% |
| Service Files | 8 | 2 | -75% |
| Component Files | 60+ | 45 | -25% |
| Duplicate Code | ~15% | <5% | -67% |
| Bundle Size | ~800KB | ~650KB | -19% |

---

## Risk Mitigation

1. **Testing**: Test each phase independently before moving to next
2. **Version Control**: Create branch for each phase
3. **Rollback Plan**: Keep old code commented for 1 week
4. **Documentation**: Update docs as changes are made
5. **Team Review**: Get approval before major consolidations

---

## Expected Benefits

### Developer Experience
- 🚀 Faster development with reusable components
- 🎯 Clear service boundaries
- 📚 Less code to maintain
- 🔍 Easier to find functionality

### Performance
- ⚡ Smaller bundle size
- 🏃 Faster build times
- 💾 Better caching with React Query
- 🔄 Reduced re-renders

### Maintainability
- 📦 Single source of truth for Orbit operations
- 🧩 Modular component architecture
- 🎨 Consistent UI patterns
- 🐛 Easier debugging with simplified state

---

## Conclusion

This optimization plan will reduce the codebase by ~1000 lines (15%) while improving maintainability and developer experience. The phased approach ensures minimal disruption and allows for course correction. All changes preserve existing functionality except where explicitly noted (test infrastructure that wasn't being used).

The biggest wins come from:
1. Service layer consolidation (-300 lines)
2. Component decomposition (-200 lines)
3. Dead code removal (-170 lines)
4. UI component audit (-165 lines)
5. State management simplification (-150 lines)

Total estimated reduction: **985 lines** with significantly improved code organization.