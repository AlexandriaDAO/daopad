# Orbit Station Frontend Replication Analysis

## Executive Summary

This document analyzes the feasibility of replicating Orbit Station's frontend functionality within the DAOPad application. The analysis covers codebase size, functional areas, technical differences, and provides a phased implementation plan based on actual code distribution and reusability assessment.

## 📊 Codebase Analysis

### Orbit Station Frontend (Vue.js)
- **Total Lines of Code**: ~62,649 lines
- **Total Files**: 455 files (*.vue, *.ts, *.js, *.tsx, *.jsx)
- **Technology Stack**: Vue.js 3, TypeScript, Vite, Playwright + Vitest

**Detailed Breakdown by Directory:**
| Directory | Files | Lines of Code | Reusability | Primary Function |
|-----------|-------|---------------|-------------|------------------|
| components | 297 | 31,298 | **Reimplement** | UI Components & Layouts |
| generated | 32 | 8,201 | **Reuse/Wrap** | Auto-generated canister bindings |
| pages | 21 | 5,078 | **Reimplement** | Main Application Pages |
| locales | 3 | 4,219 | **Adapt** | Internationalization (JSON configs) |
| utils | 23 | 3,099 | **Port** | Utility Functions |
| composables | 16 | 2,057 | **Reimplement as Hooks** | Vue Composition Logic |
| mappers | 12 | 1,694 | **Port** | Data Transformation |
| services | 12 | 2,626 | **Port/Adapt** | Backend Integration |
| stores | 3 | 1,036 | **Reimplement as Redux** | State Management |
| testing | 101 | 7,849 | **Replace** | Playwright/Vitest → Jest/RTL |

**Key Files:**
- `station.service.ts`: 1,635 lines (41KB) - Main backend integration service
- Generated bindings: 8,201 lines - Canister interface definitions we can reuse

### DAOPad Frontend (React)
- **Total Lines of Code**: ~6,438 lines
- **Total Files**: 46 files
- **Technology Stack**: React 18, TypeScript, ShadCN UI, TailwindCSS, Redux Toolkit

**Current Size Comparison:**
- Orbit Station: 62,649 lines (455 files)
- DAOPad: 6,438 lines (46 files)
- **Scale Factor**: ~10x larger codebase

## 🔄 Code Distribution & Migration Strategy

### What We Must Reimplement (~42,433 LOC)
**Components (31,298 LOC)**: Vue → React + ShadCN patterns
- Form components → React Hook Form + Zod validation
- Layout primitives → ShadCN layout components
- Data display → ShadCN table/card components
- Interactive elements → ShadCN dialog/select/input

**Pages (5,078 LOC)**: Vue SFC → React functional components
- Route structure adaptation
- State management integration
- Component composition patterns

**Composables (2,057 LOC)**: Vue composition → React hooks
- Data fetching patterns
- State management abstractions
- Lifecycle management

### What We Can Reuse/Adapt (~20,216 LOC)

**Generated Bindings (8,201 LOC)**: Direct reuse with TypeScript interfaces
- Canister method definitions
- Type definitions for backend calls
- Auto-generated from .did files

**Locales (4,219 LOC)**: JSON adaptation
- Translation keys can be reused
- React-i18next implementation
- Locale-specific formatting

**Utils/Mappers (4,793 LOC)**: Function porting
- Pure functions can be directly ported
- Data transformation logic
- Validation utilities

**Services (2,626 LOC)**: Adaptation to React patterns
- API call abstractions
- Error handling patterns
- Cache management strategies

**Stores (1,036 LOC)**: Redux Toolkit slices
- State shape can be preserved
- Action patterns adaptation
- Selector logic migration

## 🎨 Vue → React + ShadCN Migration Patterns

### Component Translation Strategy

#### Layout Primitives
```vue
<!-- Orbit Vue Pattern -->
<div class="page-layout">
  <PageHeader :title="title" />
  <PageContent>
    <slot />
  </PageContent>
</div>
```

```jsx
// DAOPad React + ShadCN Pattern
<div className="min-h-screen bg-background">
  <PageHeader title={title} />
  <main className="container mx-auto py-6">
    {children}
  </main>
</div>
```

#### Form Components
```vue
<!-- Orbit Vue Pattern -->
<FormField>
  <FormLabel>{{ label }}</FormLabel>
  <FormInput v-model="value" :error="error" />
  <FormError :message="error" />
</FormField>
```

```jsx
// DAOPad React + ShadCN Pattern
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

#### Data Display
```vue
<!-- Orbit Vue Pattern -->
<DataTable :columns="columns" :data="data">
  <template #actions="{ row }">
    <RowActions :item="row" />
  </template>
</DataTable>
```

```jsx
// DAOPad React + ShadCN Pattern
<DataTable
  columns={columns}
  data={data}
  renderActions={(row) => <RowActions item={row} />}
/>
```

### Styling Migration: CSS Modules → TailwindCSS
- **Orbit**: CSS Modules with custom design tokens
- **DAOPad**: TailwindCSS + CSS variables for theming
- **Strategy**: Map Orbit's design tokens to Tailwind utilities

## 🧪 Testing Strategy Migration

### Current Orbit Testing (Playwright + Vitest)
- **E2E Tests**: Playwright for full user journeys
- **Unit Tests**: Vitest for component testing
- **Integration Tests**: Component + service integration
- **Coverage**: ~101 test files (7,849 LOC)

### Proposed DAOPad Testing (Jest + RTL)
```javascript
// Orbit Vitest Pattern
describe('UserManagement', () => {
  it('should create user', async () => {
    const wrapper = mount(UserForm)
    // Vue Testing Library patterns
  })
})
```

```javascript
// DAOPad Jest + RTL Pattern
describe('UserManagement', () => {
  it('should create user', async () => {
    render(<UserForm />)
    // React Testing Library patterns
    await user.click(screen.getByRole('button', { name: /create/i }))
  })
})
```

## 📅 Revised Phased Implementation Plan

### Phase 1: Foundation & Generated Bindings (Weeks 1-3)
**Scope**: ~12,000 lines (20% reuse, 80% new implementation)
**Effort Distribution**:
- Generated bindings integration: ~8,201 LOC (reuse with TS interfaces)
- Core layout primitives: ~2,000 LOC (ShadCN adaptation)
- Authentication foundation: ~1,500 LOC (React patterns)
- Testing setup: ~500 LOC (Jest + RTL configuration)

#### 1.1 Generated Bindings Integration
- [ ] Import and adapt canister type definitions
- [ ] Create React service layer around generated methods
- [ ] Implement error handling patterns
- [ ] Set up TypeScript strict mode compliance

**Orbit references**: `orbit-reference/apps/wallet/src/generated/station/index.d.ts`, `orbit-reference/apps/wallet/src/generated/station/station.did.ts`, `orbit-reference/apps/wallet/src/services/station.service.ts:1`, `orbit-reference/apps/wallet/src/utils/helper.utils.ts:53`

```ts
// React service layer pseudocode
import { HttpAgent } from '@dfinity/agent'
import { createActor, type _SERVICE } from '~/generated/station'
import { variantIs } from '~/utils/helper'

const agent = new HttpAgent({ host: env.IC_HOST })

export function createStationClient(stationId: Principal) {
  const actor = createActor(stationId, { agent })

  async function getUser(args: GetUserInput, verified = false) {
    const target = verified ? wrapVerified(actor) : actor
    const result = await target.get_user(args)
    if (variantIs(result, 'Err')) throw mapCanisterError(result.Err)
    return result.Ok
  }

  return {
    listUsers: (args) => unwrapOk(actor.list_users(args)),
    getUser,
    // replicate StationService methods one by one with shared unwrap helper
  }
}

function unwrapOk<T extends { Ok: unknown; Err?: unknown }>(response: T) {
  if ('Err' in response) throw mapCanisterError(response.Err)
  return response.Ok
}
```

#### 1.2 Core UI Infrastructure
- [ ] Implement PageLayout component with ShadCN
- [ ] Create form primitives using React Hook Form
- [ ] Set up error boundaries and loading states
- [ ] Implement notification/toast system

**Orbit references**: `orbit-reference/apps/wallet/src/components/PageLayout.vue:1`, `orbit-reference/apps/wallet/src/components/layouts/PageHeader.vue:1`, `orbit-reference/apps/wallet/src/components/DataLoader.vue:1`, `orbit-reference/apps/wallet/src/components/requests/RecentRequests.vue:1`, `orbit-reference/apps/wallet/src/composables/notifications.composable.ts:1`

```tsx
// React layout pseudocode (ShadCN + Tailwind)
import { Toaster, useToast } from '@/components/ui/toaster'
import { PageHeader } from '@/components/layout/PageHeader'

export function PageLayout({ title, breadcrumbs, actions, children }) {
  const { toast, dismiss } = useToast()
  return (
    <div className="min-h-screen bg-background">
      <AppToolbar />
      <main className="container mx-auto flex flex-col gap-6 py-6">
        <PageHeader title={title} breadcrumbs={breadcrumbs} actions={actions} />
        <ErrorBoundary fallback={<ErrorAlert />}>{children}</ErrorBoundary>
      </main>
      <Toaster onDismiss={dismiss} />
    </div>
  )
}

// DataLoader analogue
export function useDataLoader<T>(load: () => Promise<T>) {
  const [state, setState] = useState<{ data?: T; loading: boolean; error?: Error }>({ loading: true })
  useEffect(() => {
    let cancelled = false
    async function fetch() {
      try {
        const data = await load()
        if (!cancelled) setState({ data, loading: false })
      } catch (error) {
        if (!cancelled) setState({ error: error as Error, loading: false })
      }
    }
    fetch()
    return () => {
      cancelled = true
    }
  }, [load])
  return state
}
```

#### 1.3 Testing Infrastructure
- [ ] Configure Jest + React Testing Library
- [ ] Set up component testing patterns
- [ ] Implement mock service layer
- [ ] Create test utilities and fixtures

**Orbit references**: `orbit-reference/apps/wallet/src/test.utils.ts:1`, `orbit-reference/apps/wallet/src/components/requests/RequestList.spec.ts` (pattern), `orbit-reference/playwright.config.ts:1`

```ts
// Vitest helper → Jest/RTL pseudocode
// setupTests.ts
import '@testing-library/jest-dom'
import { server } from './test/msw-server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// example test mirroring Orbit's mount() patterns
test('renders user list', async () => {
  render(<UsersPage />)
  expect(await screen.findByText('Ada Lovelace')).toBeVisible()
})

// jest.config.ts
export default {
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}
```

**Validation Milestone**: Authentication flow with type-safe canister calls

### Phase 2: User Management & Services (Weeks 4-7)
**Scope**: ~18,000 lines (30% port, 70% reimplement)
**Effort Distribution**:
- User management components: ~8,000 LOC (Vue → React translation)
- Service layer adaptation: ~2,626 LOC (port with React patterns)
- Utils/mappers: ~4,793 LOC (direct port)
- State management: ~1,036 LOC (Redux Toolkit slices)
- Component testing: ~1,500 LOC (Jest + RTL)

#### 2.1 User Management System
- [ ] User profile components (React + ShadCN)
- [ ] User groups and permissions interface
- [ ] Address book functionality
- [ ] Role assignment workflows

**Orbit references**: `orbit-reference/apps/wallet/src/pages/UsersPage.vue:1`, `orbit-reference/apps/wallet/src/components/users/UserDialog.vue:1`, `orbit-reference/apps/wallet/src/components/users/UserForm.vue:1`, `orbit-reference/apps/wallet/src/composables/lists.composable.ts:1`, `orbit-reference/apps/wallet/src/stores/station.store.ts:120`

```tsx
// React UsersPage pseudocode
export function UsersPage() {
  const station = useStationService()
  const pagination = usePagination({ pageSize: 25 })
  const { data, loading, refresh } = usePolling(async () => {
    const response = await station.listUsers({
      offset: pagination.offset,
      limit: pagination.limit,
    })
    pagination.setTotal(response.total)
    return response.users
  }, 5000)

  return (
    <PageLayout title={t('pages.users.title')} actions={<CreateUserButton /> }>
      <RecentRequests domain="Users" onOpenChange={refresh.pause} />
      <DataTable
        columns={userColumns}
        data={data}
        loading={loading}
        renderActions={(user) => (
          <OpenUserDialog userId={user.id} readOnly={!user.can_edit} onToggleRefresh={refresh.toggle} />
        )}
      />
      <Pagination {...pagination.bindings} />
    </PageLayout>
  )
}

function OpenUserDialog({ userId, readOnly, onToggleRefresh }) {
  const dialog = useDialog()
  return (
    <Button onClick={dialog.open}>{readOnly ? t('terms.view') : t('terms.edit')}</Button>
    <UserDialog
      open={dialog.opened}
      userId={userId}
      mode={readOnly ? 'view' : 'edit'}
      onClose={dialog.close}
      onSubmitted={() => { dialog.close(); onToggleRefresh(false); }}
    />
  )
}
```

#### 2.2 Service Layer Migration
- [ ] Port station.service.ts to modular React services
- [ ] Implement caching strategies with React Query
- [ ] Error handling and retry logic
- [ ] Backend integration patterns

**Orbit references**: `orbit-reference/apps/wallet/src/services/station.service.ts:1`, `orbit-reference/apps/wallet/src/plugins/services.plugin.ts:1`, `orbit-reference/apps/wallet/src/utils/helper.utils.ts:53`, `orbit-reference/apps/wallet/src/core/logger.core.ts`

```ts
// React Query service wrapper pseudocode
import { createStationClient } from '@/services/stationClient'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useStationService() {
  const agent = useAgent()
  const stationId = useSelectedStation()
  return useMemo(() => createStationClient(agent, stationId), [agent, stationId])
}

export function useListUsersQuery(params) {
  const station = useStationService()
  return useQuery({
    queryKey: ['station', station.id, 'users', params],
    queryFn: async () => station.listUsers(params),
    staleTime: 5_000,
    retry: (failureCount, error) => shouldRetry(error) && failureCount < 3,
  })
}

export function useEditUserMutation() {
  const station = useStationService()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => station.editUser(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['station', station.id, 'users'] }),
    onError: (error) => logError('station.editUser', error),
  })
}
```

#### 2.3 State Management
- [ ] Create Redux slices from Pinia stores
- [ ] Implement selectors and action creators
- [ ] Set up middleware for async operations
- [ ] Integrate with React components

**Orbit references**: `orbit-reference/apps/wallet/src/stores/station.store.ts:1`, `orbit-reference/apps/wallet/src/stores/app.store.ts:1`, `orbit-reference/apps/wallet/src/workers/index.ts:1`

```ts
// Redux slice pseudocode derived from Pinia station.store
const initialState: StationState = {
  connectionStatus: 'disconnected',
  canisterId: Principal.anonymous().toText(),
  user: emptyUser(),
  privileges: [],
  configuration: emptyConfiguration(),
  notifications: { loading: false, items: [] },
}

export const stationSlice = createSlice({
  name: 'station',
  initialState,
  reducers: {
    setConnectionStatus(state, action: PayloadAction<ConnectionStatus>) {
      state.connectionStatus = action.payload
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload
    },
    reset(state) {
      Object.assign(state, initialState)
    },
  },
  extraReducers: builder => {
    builder.addCase(connectToStation.fulfilled, (state, action) => {
      state.connectionStatus = 'connected'
      state.canisterId = action.payload.stationId
      state.user = action.payload.user
      state.privileges = action.payload.privileges
    })
  },
})

export const connectToStation = createAsyncThunk('station/connect', async (stationId: Principal) => {
  const station = await services.station.withStationId(stationId)
  const [user, privileges] = await Promise.all([
    station.getUser({ user_id: /* current */ }),
    station.listPermissions({ /* ... */ }),
  ])
  startWorkers(stationId)
  return { stationId: stationId.toText(), user, privileges }
})
```

**Validation Milestone**: Complete user CRUD operations with permissions

### Phase 3: Asset Management & Treasury (Weeks 8-12)
**Scope**: ~20,000 lines (25% port, 75% reimplement)
**Effort Distribution**:
- Asset management components: ~10,000 LOC (complex Vue → React)
- Account management: ~6,000 LOC (form-heavy components)
- External canister integration: ~2,500 LOC (service adaptation)
- Component testing: ~1,500 LOC

#### 3.1 Asset Management Interface
- [ ] Asset listing with ShadCN Table
- [ ] Asset detail views and metadata
- [ ] Transfer workflows with form validation
- [ ] Balance tracking and history

**Orbit references**: `orbit-reference/apps/wallet/src/pages/AssetsPage.vue:1`, `orbit-reference/apps/wallet/src/components/assets/AssetDialog.vue:1`, `orbit-reference/apps/wallet/src/components/assets/AssetForm.vue:1`, `orbit-reference/apps/wallet/src/components/accounts/TransferDialog.vue:1`, `orbit-reference/apps/wallet/src/composables/notifications.composable.ts:1`

```tsx
// React asset list pseudocode
export function AssetsPage() {
  const station = useStationService()
  const pagination = usePagination({ pageSize: 50 })
  const assetsQuery = useQuery({
    queryKey: ['station', station.id, 'assets', pagination.page],
    queryFn: () => station.listAssets({ offset: pagination.offset, limit: pagination.limit }),
    refetchInterval: 5000,
  })

  return (
    <PageLayout title={t('pages.assets.title')} actions={<CreateAssetButton /> }>
      <RecentRequests domain="Assets" />
      <DataTable
        columns={assetColumns}
        data={assetsQuery.data?.assets ?? []}
        loading={assetsQuery.isFetching}
        renderActions={(asset) => (
          <AssetDialogTrigger
            assetId={asset.id}
            readOnly={!asset.permissions.can_edit}
            onSaved={() => assetsQuery.refetch()}
          />
        )}
      />
      <Pagination {...pagination.bindings} />
    </PageLayout>
  )
}

function AssetDialogTrigger({ assetId, readOnly, onSaved }) {
  const dialog = useDialog()
  return (
    <>
      <Button onClick={dialog.open}>{readOnly ? t('terms.view') : t('terms.edit')}</Button>
      <AssetDialog
        open={dialog.opened}
        assetId={assetId}
        mode={readOnly ? 'view' : 'edit'}
        onClose={dialog.close}
        onSubmitSuccess={(request) => {
          enqueueOperationToast(request)
          onSaved()
        }}
      />
    </>
  )
}
```

#### 3.2 Account Management
- [ ] Multi-account interface
- [ ] Account creation workflows
- [ ] Permission configuration
- [ ] Transaction history views

**Orbit references**: `orbit-reference/apps/wallet/src/pages/AccountsPage.vue:1`, `orbit-reference/apps/wallet/src/components/accounts/AccountSetupAction.vue`, `orbit-reference/apps/wallet/src/components/accounts/TransferDialog.vue:1`, `orbit-reference/apps/wallet/src/mappers/accounts.mapper.ts`

```tsx
// React account overview pseudocode
export function AccountsPage() {
  const station = useStationService()
  const pagination = usePagination({ pageSize: 20 })
  const accountsQuery = useQuery({
    queryKey: ['station', station.id, 'accounts', pagination.page],
    queryFn: () => station.listAccounts({ offset: pagination.offset, limit: pagination.limit }),
    refetchInterval: 5000,
  })

  return (
    <PageLayout title={t('pages.accounts.title')} actions={<AccountSetupButton /> }>
      <RecentRequests domain="Accounts" />
      <DataTable
        data={accountsQuery.data?.accounts ?? []}
        columns={accountColumns}
        onRowClick={(account) => navigate(`/accounts/${account.id}`)}
        renderActions={(account) => (
          <TransferDialogTrigger account={account} disabled={!account.permissions.can_transfer} />
        )}
      />
      <Pagination {...pagination.bindings} />
    </PageLayout>
  )
}

function TransferDialogTrigger({ account, disabled }) {
  const dialog = useDialog()
  return (
    <>
      <Button onClick={dialog.open} disabled={disabled}>{t('terms.transfer')}</Button>
      <TransferDialog
        open={dialog.opened}
        account={account}
        asset={selectDefaultAsset(account)}
        onClose={dialog.close}
        onSubmitSuccess={(request) => enqueueOperationToast(request)}
      />
    </>
  )
}
```

#### 3.3 External Canister Management
- [ ] Canister discovery and registration
- [ ] Permission control interfaces
- [ ] Inter-canister call management
- [ ] Monitoring and health checks

**Orbit references**: `orbit-reference/apps/wallet/src/pages/ExternalCanisterListPage.vue:1`, `orbit-reference/apps/wallet/src/pages/ExternalCanisterDetailPage.vue:1`, `orbit-reference/apps/wallet/src/components/requests/operations/CallExternalCanisterOperation.vue`, `orbit-reference/apps/wallet/src/utils/helper.utils.ts:90`

```tsx
// React external canister list pseudocode
export function ExternalCanistersPage() {
  const station = useStationService()
  const { filters, setFilter } = useExternalCanisterFilters()
  const canistersQuery = useQuery({
    queryKey: ['station', station.id, 'external-canisters', filters],
    queryFn: () => station.listExternalCanisters({ filters }),
    refetchInterval: 5000,
  })

  return (
    <PageLayout title={t('pages.external_canisters.title')} actions={<CreateCanisterButton /> }>
      <RecentRequests domain="ExternalCanisters" />
      <div className="flex flex-col gap-4 lg:flex-row">
        <DataTable
          className="flex-1"
          data={canistersQuery.data?.canisters ?? []}
          columns={externalCanisterColumns}
          onRowClick={(item) => navigate(`/external-canisters/${item.canister_id.toText()}`)}
          renderActions={(item) => <ChevronButton onClick={() => navigate(...)} />}
        />
        <FilterCard filters={filters} onChange={setFilter} />
      </div>
    </PageLayout>
  )
}

export function useExternalCanisterFilters() {
  const [filters, setFilters] = useState({ search: '', labels: [] })
  const debounced = useDebouncedValue(filters, 300)
  return { filters: debounced, setFilter: (key, value) => setFilters(prev => ({ ...prev, [key]: value })) }
}
```

**Validation Milestone**: Complete treasury operations with multi-account support

### Phase 4: Governance & Advanced Features (Weeks 13-16)
**Scope**: ~12,000 lines (40% port, 60% reimplement)
**Effort Distribution**:
- Request management: ~6,000 LOC (workflow components)
- Approval rules engine: ~3,000 LOC (complex business logic)
- Dashboard and analytics: ~2,000 LOC (data visualization)
- Admin features: ~1,000 LOC (configuration interfaces)

#### 4.1 Request Management System
- [ ] Request creation workflows
- [ ] Approval pipeline interface
- [ ] Status tracking and notifications
- [ ] Audit trail and history

**Orbit references**: `orbit-reference/apps/wallet/src/pages/RequestsPage.vue:1`, `orbit-reference/apps/wallet/src/components/requests/RequestList.vue:1`, `orbit-reference/apps/wallet/src/components/requests/RequestDialog.vue:1`, `orbit-reference/apps/wallet/src/components/requests/operations/*`

```tsx
// React requests page pseudocode
export function RequestsPage() {
  const station = useStationService()
  const filters = useRequestFilters()
  const pagination = usePagination({ pageSize: 25 })
  const requestsQuery = useQuery({
    queryKey: ['station', station.id, 'requests', filters.value, pagination.page],
    queryFn: () => station.listRequests({
      filter: filters.value,
      pagination: { offset: pagination.offset, limit: pagination.limit },
    }),
    refetchInterval: 5000,
  })

  return (
    <PageLayout title={t('pages.requests.title')} actions={<ExportCsvButton filters={filters.value} /> }>
      <SplitLayout
        main={
          <RequestList
            loading={requestsQuery.isFetching}
            requests={requestsQuery.data?.requests ?? []}
            privileges={requestsQuery.data?.privileges ?? []}
            onOpen={(request) => openDialog(request.id)}
          />
        }
        sidebar={<RequestFilters filters={filters} onChange={filters.set} />}
      />
      <Pagination {...pagination.bindings} />
      <RequestDialog
        open={dialog.opened}
        requestId={dialog.requestId}
        onApproved={() => requestsQuery.refetch()}
      />
    </PageLayout>
  )
}
```

#### 4.2 Governance Rules Engine
- [ ] Policy configuration interface
- [ ] Rule builder with validation
- [ ] Threshold management
- [ ] Policy testing sandbox

**Orbit references**: `orbit-reference/apps/wallet/src/components/request-policies/RequestPolicyForm.vue:1`, `orbit-reference/apps/wallet/src/components/request-policies/rule/RuleBuilder.vue`, `orbit-reference/apps/wallet/src/components/requests/operations/AddRequestPolicyOperation.vue:1`

```tsx
// React rule builder pseudocode
export function RequestPolicyForm({ value, mode, onChange }) {
  const form = useForm({ defaultValues: value })

  return (
    <Form {...form}>
      <RuleSpecifierSelect
        disabled={mode === 'view'}
        value={form.watch('specifier')}
        onChange={(spec) => {
          form.setValue('specifier', spec)
          form.setValue('rule', undefined)
        }}
      />
      {form.watch('specifier') ? (
        <RuleBuilder
          disabled={mode === 'view'}
          specifier={form.watch('specifier')}
          value={form.watch('rule')}
          onChange={(rule) => form.setValue('rule', rule)}
        />
      ) : null}
      <Button type="submit" disabled={!form.formState.isValid || mode === 'view'}>
        {value?.id ? t('terms.save') : t('terms.create')}
      </Button>
    </Form>
  )
}

function RuleBuilder({ specifier, value, onChange, disabled }) {
  return (
    <Tabs defaultValue="quorum">
      <TabsList>
        <TabsTrigger value="quorum">{t('request_policies.quorum')}</TabsTrigger>
        <TabsTrigger value="threshold">{t('request_policies.threshold')}</TabsTrigger>
      </TabsList>
      <TabsContent value="quorum">
        <NumberField
          label={t('terms.min_approved')}
          value={value?.min_approved ?? 1}
          onChange={(n) => onChange({ ...value, min_approved: n })}
          disabled={disabled}
        />
        <ApproverPicker
          selected={value?.approvers ?? []}
          onChange={(approvers) => onChange({ ...value, approvers })}
          disabled={disabled}
        />
      </TabsContent>
    </Tabs>
  )
}
```

#### 4.3 Analytics Dashboard
- [ ] Treasury overview widgets
- [ ] Governance metrics
- [ ] Activity monitoring
- [ ] Performance dashboards

**Orbit references**: `orbit-reference/apps/wallet/src/pages/DashboardPage.vue:1`, `orbit-reference/apps/wallet/src/components/accounts/TransferBtn.vue:1`, `orbit-reference/apps/wallet/src/utils/helper.utils.ts:118`

```tsx
// React dashboard pseudocode
export function DashboardPage() {
  const station = useStationService()
  const assetsQuery = useQuery({
    queryKey: ['station', station.id, 'dashboard-assets'],
    queryFn: () => station.listDashboardAssets(),
    refetchInterval: 5000,
  })

  return (
    <PageLayout title={t('pages.dashboard.title')}>
      <RecentRequests domain="All" />
      <Card>
        <CardHeader>
          <CardTitle>{t('pages.dashboard.available_assets')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple">
            {(assetsQuery.data?.assets ?? []).map((asset) => (
              <AccordionItem key={asset.id} value={asset.id}>
                <AccordionTrigger>
                  <span>{asset.symbol}</span>
                  <span>{formatBalance(asset.totalBalance, asset.decimals)} {asset.symbol}</span>
                </AccordionTrigger>
                <AccordionContent>
                  <DataTable
                    columns={assetAccountColumns}
                    data={asset.accountAssets}
                    renderActions={(entry) => (
                      <TransferButton
                        account={entry.account}
                        asset={asset}
                        disabled={!entry.canTransfer}
                      />
                    )}
                    onRowClick={(row) => navigate(`/accounts/${row.account.id}/assets/${asset.id}`)}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
      <GovernanceMetrics cards={buildGovernanceMetrics(assetsQuery.data)} />
    </PageLayout>
  )
}
```

**Validation Milestone**: Complete governance workflow with automated testing

## 🎯 Migration Success Metrics

### Technical Quality Gates
- **Test Coverage**: >90% for all new components
- **Performance**: Page load times within 10% of current DAOPad
- **Accessibility**: WCAG 2.1 AA compliance
- **Type Safety**: 100% TypeScript strict mode compliance

### Functional Parity Milestones
- [ ] **Phase 1**: User authentication and basic navigation
- [ ] **Phase 2**: User management with permissions
- [ ] **Phase 3**: Complete treasury operations
- [ ] **Phase 4**: Full governance workflow

### Testing Milestones
- [ ] **Phase 1**: 100% service layer unit tests
- [ ] **Phase 2**: Integration tests for user flows
- [ ] **Phase 3**: E2E tests for treasury operations
- [ ] **Phase 4**: Complete test automation pipeline

## 🚀 Implementation Recommendations

### Development Strategy
1. **Start with generated bindings** - 8,201 LOC of immediate reuse
2. **Establish component translation patterns** early
3. **Implement service layer incrementally** - avoid big-bang migration
4. **Maintain testing discipline** - test each component as it's built

### Technical Priorities
1. **Type Safety First**: Leverage generated types throughout
2. **Component Reusability**: Build ShadCN component library
3. **Performance Optimization**: Use React.memo and proper state management
4. **Accessibility**: Implement ARIA patterns from the start

### Risk Mitigation
1. **Incremental Deployment**: Feature flags for gradual rollout
2. **Parallel Development**: Keep current DAOPad functional during migration
3. **User Testing**: Regular validation with actual DAO users
4. **Rollback Strategy**: Maintain ability to revert to current implementation

## 📈 Conclusion

The corrected analysis reveals a more manageable scope:

**Key Insights:**
- **Realistic Scope**: ~42k LOC new implementation + ~20k LOC adaptation
- **Significant Reuse**: 32% of codebase can be adapted rather than rewritten
- **Generated Bindings**: 8,201 LOC of immediate reuse for type safety
- **Testing Strategy**: Clear migration path from Playwright to Jest + RTL

**Updated Recommendation**: The 16-week phased approach is feasible with proper focus on reusable patterns and generated code leverage. The substantial generated bindings and utility code provide a strong foundation for rapid development.

**Success Factors:**
1. Early investment in component translation patterns
2. Aggressive reuse of generated types and utilities
3. Comprehensive testing strategy from Phase 1
4. Incremental validation with real DAO operations

The Apache 2.0 license enables this replication, and the phased approach minimizes risk while delivering incremental value to DAO users.
