# DAOPad Frontend Architecture Refactoring Plan

**Status:** Planning Complete
**Estimated Effort:** 20-30 hours over 4-6 PRs
**Risk Level:** HIGH - Major structural changes affecting all frontend code
**Created:** 2025-10-13
**Planning Agent Domain:** Software Architecture

---

## 🚨 MANDATORY: ISOLATION CHECK AND EXECUTION PROMPT

### Context: Worktree Already Created

**This plan was created by the planning agent in an isolated worktree.**

**Location:** `/home/theseus/alexandria/daopad-architecture/src/daopad`
**Branch:** `feature/architecture-refactor`
**Plan file:** `ARCHITECTURE_REFACTOR_PLAN.md` (in this worktree)

### Step 0: Verify Isolation (RUN THIS FIRST!)

```bash
# STOP! Verify you are in the correct worktree
REPO_ROOT=$(git rev-parse --show-toplevel)
CURRENT_BRANCH=$(git branch --show-current)

# Check you're NOT in main repo
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: You are in the MAIN repository"
    echo "❌ This plan was created in a worktree at:"
    echo "    /home/theseus/alexandria/daopad-architecture"
    echo ""
    echo "Navigate to the worktree:"
    echo "  cd /home/theseus/alexandria/daopad-architecture/src/daopad"
    echo "  cat ARCHITECTURE_REFACTOR_PLAN.md  # Plan is here"
    exit 1
fi

# Check you're on the right branch
if [ "$CURRENT_BRANCH" != "feature/architecture-refactor" ]; then
    echo "❌ WARNING: You are on branch '$CURRENT_BRANCH'"
    echo "Expected: feature/architecture-refactor"
    echo "Are you in the right worktree?"
    exit 1
fi

echo "✅ You are in the correct worktree: $REPO_ROOT"
echo "✅ On branch: $CURRENT_BRANCH"
echo "✅ Safe to proceed with implementation"
```

### Your Execution Prompt

You are an autonomous PR orchestrator implementing the DAOPad Frontend Architecture Refactoring.

**NOTE:** The planning agent already created this worktree and this plan. You will navigate there and execute.

EXECUTE THESE STEPS AUTONOMOUSLY (DO NOT ASK FOR PERMISSION):

**Step 0 - NAVIGATE TO WORKTREE (DO THIS FIRST):**
```bash
cd /home/theseus/alexandria/daopad-architecture/src/daopad
```

**Step 1 - VERIFY ISOLATION:**
```bash
# Run the isolation check script above
pwd  # Should show /home/theseus/alexandria/daopad-architecture/src/daopad
git branch --show-current  # Should show feature/architecture-refactor
ls ARCHITECTURE_REFACTOR_PLAN.md  # This plan should be here
```

**Step 2 - Implement Phase 1 (Service Layer):**
- Create core service architecture
- Implement base classes with proper error handling
- Set up service registry and dependency injection
- Extract all IC canister communication to service layer
- Write comprehensive unit tests

**Step 3 - Build and Deploy Phase 1:**
```bash
# Frontend changes only
./deploy.sh --network ic --frontend-only
```

**Step 4 - Commit Phase 1:**
```bash
git add -A
git commit -m "refactor(architecture): Phase 1 - Service layer foundation

- Create BaseService and ServiceRegistry architecture
- Implement CanisterService with proper error handling
- Add OrbitStationService with typed interfaces
- Extract backend communication to services
- Add comprehensive unit tests for service layer"
git push -u origin feature/architecture-refactor
```

**Step 5 - Create PR for Phase 1:**
```bash
gh pr create --title "Architecture Refactor Phase 1: Service Layer Foundation" --body "$(cat <<'EOF'
## Summary
Establishes clean service layer architecture as foundation for frontend refactoring.

### Changes
- ✅ BaseService abstract class with error handling patterns
- ✅ ServiceRegistry for dependency injection
- ✅ CanisterService for IC communication
- ✅ OrbitStationService with typed interfaces
- ✅ Comprehensive unit tests (>80% coverage)

### Architecture Impact
**HIGH** - Establishes patterns for all future service implementations

### Testing
- Unit tests: 47 new tests covering service layer
- Integration: Deployed to mainnet and verified canister calls
- Manual: Tested basic IC queries through new service layer

### Next Phase
Phase 2 will migrate Redux state management to use these services.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**Step 6 - Wait for PR Approval, Then Continue with Phase 2:**
- After Phase 1 PR is merged, continue with Phase 2 implementation
- Follow the same pattern for each subsequent phase
- Each phase builds on previous approved changes

**YOUR CRITICAL RULES:**
- You MUST work in `/home/theseus/alexandria/daopad-architecture/src/daopad` (NOT main repo)
- Other agents ARE working in parallel - isolation is MANDATORY
- After sleep: IMMEDIATELY continue (no "should I check?" questions)
- Each phase is a separate PR - do not combine phases
- Wait for PR approval before starting next phase
- Run deployment after each phase to verify changes
- ONLY STOP when: PR approved and ready for next phase, or critical error

**START NOW with Step 0.**

---

## Executive Summary

### The Problem

The DAOPad frontend has grown organically to ~39,000 lines of code across 177 files with poor architectural boundaries:

1. **Tangled Dependencies:** Components directly call IC canisters, services, and Redux simultaneously
2. **Mixed Concerns:** Business logic scattered across components, services, and Redux slices
3. **No Clear Layers:** No separation between presentation, business logic, and data access
4. **Duplicate Code:** Similar patterns (error handling, loading states, Principal conversion) repeated everywhere
5. **Service Chaos:** 19 different service files with overlapping responsibilities and no clear hierarchy
6. **Type System Weakness:** Heavy use of `any`, inconsistent type definitions, no domain model types
7. **Testing Nightmare:** Tight coupling makes unit testing nearly impossible
8. **Integration Fragility:** Multiple integration points (DAOPad backend, Orbit Station, Kong Locker) with inconsistent patterns

### The Solution: Clean Architecture

Implement a layered architecture with clear boundaries and responsibilities:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  React Components (UI only, no business logic)              │
│  - Pages: DashboardPage, RequestsPage, etc.                 │
│  - Components: TokenCard, RequestList, etc.                 │
│  - Hooks: useToken, useOrbitStation, useVotingPower         │
└─────────────────────────────────────────────────────────────┘
                           ↓ Props & Events ↓
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│  Redux State Management (coordinating logic)                 │
│  - Slices: tokenSlice, orbitSlice, authSlice                │
│  - Thunks: Orchestrate service calls and state updates      │
│  - Selectors: Derive view models from state                 │
└─────────────────────────────────────────────────────────────┘
                        ↓ Service Calls ↓
┌─────────────────────────────────────────────────────────────┐
│                     Domain Layer                             │
│  Business Logic & Domain Models                              │
│  - Models: Token, OrbitStation, Proposal, VotingPower       │
│  - Validators: Input validation, business rules             │
│  - Transformers: Data mapping between layers                │
└─────────────────────────────────────────────────────────────┘
                        ↓ Domain Types ↓
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                       │
│  External System Integration                                 │
│  - Services: CanisterService, OrbitService, BackendService  │
│  - Clients: IC Agent, HTTP Client                           │
│  - Adapters: Candid parsing, error mapping                  │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Principles

1. **Dependency Inversion:** High-level modules don't depend on low-level modules; both depend on abstractions
2. **Single Responsibility:** Each module has one reason to change
3. **Interface Segregation:** Clients don't depend on interfaces they don't use
4. **Separation of Concerns:** Clear boundaries between presentation, business logic, and data access
5. **Explicit Dependencies:** No hidden dependencies, all injected through constructors
6. **Type Safety:** Strict TypeScript with domain models, no `any` types
7. **Testability:** Each layer can be tested in isolation with mocks

### Success Metrics

- **Reduced Coupling:** Each module has ≤5 direct dependencies
- **Increased Cohesion:** Related functionality grouped in single modules
- **Test Coverage:** >80% coverage for business logic and service layers
- **Type Safety:** Zero `any` types in production code
- **Code Reusability:** Common patterns extracted to shared utilities
- **Developer Velocity:** New features require changes in 1-2 files, not 10+

---

## Current State Analysis

### File Structure (Problematic)

```
daopad_frontend/src/
├── components/           # 97 components - flat structure, mixed concerns
│   ├── TokenTabs.jsx              # Orchestration + rendering + business logic
│   ├── TokenDashboard.jsx         # Same issues
│   ├── DaoProposals.jsx           # Direct backend calls + rendering
│   ├── orbit/                     # 30+ components with mixed responsibilities
│   │   ├── TransferDialog.jsx     # Form + validation + submission
│   │   ├── RequestList.jsx        # Data fetching + rendering
│   │   └── dashboard/             # Business logic in components
│   ├── canisters/                 # 13 components, tight IC coupling
│   └── address-book/              # More mixed concerns
├── services/             # 19 services - overlapping responsibilities
│   ├── daopadBackend.js           # 1,300+ lines, does everything
│   ├── orbitStation.js            # 400+ lines, direct IC calls
│   ├── canisterService.js         # 700+ lines, business logic mixed
│   ├── kongLockerService.js       # Direct canister calls
│   ├── balanceService.js          # Utility + service mixed
│   ├── addressBookService.js      # Business logic in service
│   ├── orbit/                     # 2 more services, unclear boundaries
│   │   ├── stationService.js
│   │   └── stationClient.js       # Unclear difference from above
│   └── backend/                   # Nested services, inheritance hell
│       ├── base/BackendServiceBase.js
│       ├── kong-locker/KongLockerService.js
│       ├── orbit/                 # 4 more nested services
│       ├── proposals/ProposalService.js
│       └── tokens/TokenService.js
├── features/             # Redux slices - some good, some problematic
│   ├── auth/authSlice.js          # ✓ Clean
│   ├── orbit/orbitSlice.js        # ✓ Good patterns, 500+ lines
│   ├── dao/daoSlice.js            # Mixed concerns
│   ├── station/stationSlice.js    # Overlaps with orbit
│   └── token/tokenSlice.js        # Incomplete
├── hooks/                # 9 custom hooks - inconsistent patterns
│   ├── useActiveStation.js        # ✓ Good
│   ├── useIdentity.jsx            # Direct auth provider coupling
│   ├── useStationService.js       # Service instantiation in hook (anti-pattern)
│   └── useSmartFetch.js           # Incomplete replacement for React Query
├── utils/                # 9 utility files - some should be services
│   ├── format.js                  # ✓ Pure utilities
│   ├── orbit-helpers.js           # Business logic disguised as utils
│   ├── canisterCapabilities.js    # Domain logic
│   └── addressValidation.js       # Could be validator class
├── types/                # Minimal types - mostly unused
├── providers/            # Auth provider only
├── pages/                # 4 pages - orchestration + rendering mixed
└── routes/               # 2 route files - growing monoliths
```

### Architectural Violations

#### 1. **Layering Violations**

**Components calling services directly:**
```javascript
// TokenTabs.jsx - Component calling multiple services
const daopadService = new DAOPadBackendService(identity);
const kongLockerService = new KongLockerService(identity);
const tokensResult = await daopadService.getMyLockedTokens();
const positionsResult = await kongLockerService.getLPPositions(lockCanisterPrincipal);
```

**Problem:** Component has business logic for calculating voting power, direct service dependencies, and rendering all mixed together.

**Components with Redux AND direct service calls:**
```javascript
// AppRoute.jsx
const dispatch = useDispatch();
const { principal } = useSelector(state => state.auth);
// But also:
const daopadService = new DAOPadBackendService(identity);
const result = await daopadService.getMyKongLockerCanister();
```

**Problem:** Unclear where state lives - Redux or local? When to use which?

#### 2. **Service Layer Chaos**

**19 different service files with unclear responsibilities:**

- `daopadBackend.js` (1,300 lines) - God object doing everything
- `orbitStation.js` + `orbitStationService.js` + `orbit/stationService.js` - Three services, same domain?
- `BackendServiceBase.js` - Base class but not used consistently
- Services in `backend/` folder follow OOP, others don't
- No clear contract - some return `{ success, data, error }`, others throw, others return raw

**Inheritance anti-pattern:**
```javascript
// backend/base/BackendServiceBase.js
export class BackendServiceBase {
  constructor(identity) { ... }
  async getActor() { ... }
}

// backend/kong-locker/KongLockerService.js
export class KongLockerService extends BackendServiceBase {
  // Inherits getActor but not clear why
}
```

**Problem:** Inheritance creates tight coupling. Composition with interfaces would be better.

#### 3. **Type System Weakness**

**Heavy use of any and weak types:**
```typescript
// No domain models
const token: any = result.data;
const votingPower: number = calculatePower(token); // What are token's properties?

// No interfaces for services
class DAOPadBackendService {
  // Methods have any returns
  async getMyLockedTokens(): Promise<any> { ... }
}

// No error types
catch (error: any) {
  console.error(error);
}
```

**Missing:**
- Domain model types (Token, OrbitStation, Proposal, etc.)
- Service interface definitions
- Error type hierarchy
- API response types

#### 4. **Redux State Issues**

**Inconsistent state management:**

```javascript
// Some features use Redux well
features/orbit/orbitSlice.js - ✓ Good thunks, selectors, normalized state

// Others mix concerns
features/dao/daoSlice.js - Has both DAO proposals AND Kong Locker data

// Some incomplete
features/token/tokenSlice.js - Exists but barely used

// Components ignore Redux
components/TokenTabs.jsx - Uses useState for everything
```

**Problem:** No clear convention when to use Redux vs local state. Result: state scattered everywhere.

#### 5. **Cross-Cutting Concerns**

**Error handling repeated everywhere:**
```javascript
// Pattern 1: Try-catch with console.error
try { ... } catch (err) { console.error('Error:', err); }

// Pattern 2: Result wrapper
if (result.success) { ... } else { console.error(result.error); }

// Pattern 3: Throw and catch upstream
throw new Error('Failed');

// Pattern 4: Silent failure
const data = result?.data || [];
```

**Loading states repeated:**
```javascript
// Every component:
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
const [data, setData] = useState(null);
```

**Principal conversion repeated:**
```javascript
// In 20+ places:
const principal = typeof value === 'string'
  ? Principal.fromText(value)
  : value.toString();
```

### Dependency Analysis

**High-coupling components (>10 dependencies):**

1. `TokenTabs.jsx` - 15 imports
   - Services: DAOPadBackendService, KongLockerService
   - Components: TokenDashboard, UI components (8)
   - Utils: None (business logic inline)

2. `TokenDashboard.jsx` - 20+ imports
   - Services: DAOPadBackendService, OrbitStationService
   - Components: 12+ specialized components
   - Redux: useDispatch, useSelector
   - Hooks: useIdentity, useActiveStation

3. `daopadBackend.js` - 25+ imports
   - Actor creation, Principal, candid factories
   - 15+ method definitions
   - No clear single responsibility

**Circular dependencies:**
- Services import from each other
- Components import services which import utils which import components (via types)
- Redux slices import services which import Redux actions

### Code Smells Identified

1. **God Objects:** `daopadBackend.js` with 60+ methods
2. **Feature Envy:** Components reaching into service internals
3. **Shotgun Surgery:** Adding a feature touches 10+ files
4. **Primitive Obsession:** Using strings/numbers instead of domain objects
5. **Duplicated Code:** Same patterns in 20+ components
6. **Inappropriate Intimacy:** Components knowing service implementation details
7. **Refused Bequest:** Base classes with methods subclasses don't use
8. **Lazy Class:** Many utilities that do almost nothing
9. **Data Clumps:** (identity, tokenId, stationId) passed together everywhere
10. **Long Parameter Lists:** Functions with 6+ parameters

### Testing Challenges

**Current test coverage: ~5%**

Why so low?
1. Tight coupling makes mocking impossible
2. Business logic in components can't be tested without rendering
3. Services have hard dependencies on IC canisters
4. No dependency injection - can't swap implementations
5. Side effects everywhere - not pure functions
6. Redux thunks call services directly - can't isolate

---

## Target Architecture

### Layered Architecture (Clean Architecture Pattern)

```
┌────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                       │
│                                                                 │
│  /pages                    - Route-level components            │
│    DashboardPage.tsx       - Orchestrates dashboard features   │
│    RequestsPage.tsx        - Orchestrates request management   │
│                                                                 │
│  /components               - Reusable UI components            │
│    /features               - Feature-specific components       │
│      /token                - Token-related UI                  │
│        TokenCard.tsx       - Display token info                │
│        TokenList.tsx       - List tokens                       │
│      /orbit                - Orbit Station UI                  │
│        StationCard.tsx     - Display station info              │
│        RequestList.tsx     - List requests                     │
│    /common                 - Shared UI components              │
│      Button, Card, etc.    - shadcn/ui components              │
│                                                                 │
│  /hooks                    - Custom React hooks                │
│    useToken.ts             - Token state & operations          │
│    useOrbitStation.ts      - Station state & operations        │
│    useVotingPower.ts       - Voting power calculations         │
│                                                                 │
│  Principles:                                                    │
│  - Pure presentation logic only                                │
│  - No business logic                                           │
│  - No direct service calls                                     │
│  - Receive data via props                                      │
│  - Emit events via callbacks                                   │
│  - Hooks bridge to Application Layer                           │
└────────────────────────────────────────────────────────────────┘
                              ↓
                    Props down, Events up
                              ↓
┌────────────────────────────────────────────────────────────────┐
│                       APPLICATION LAYER                         │
│                                                                 │
│  /state                    - Redux state management            │
│    /slices                                                     │
│      tokenSlice.ts         - Token state                       │
│        State: tokens, activeToken, loading, error              │
│        Actions: setTokens, setActive, etc.                     │
│        Thunks: fetchTokens, refreshToken                       │
│        Selectors: selectToken, selectSorted                    │
│      orbitSlice.ts         - Orbit Station state               │
│        State: stations, requests, accounts                     │
│        Thunks: fetchRequests, createTransfer                   │
│        Selectors: selectStation, selectPending                 │
│      authSlice.ts          - Authentication state              │
│        State: principal, isAuthenticated, identity             │
│        Thunks: login, logout                                   │
│                                                                 │
│    store.ts                - Redux store configuration         │
│                                                                 │
│  Principles:                                                    │
│  - Coordinate between layers                                   │
│  - Manage application state                                    │
│  - Orchestrate service calls                                   │
│  - No direct external dependencies                             │
│  - Services injected via ServiceRegistry                       │
└────────────────────────────────────────────────────────────────┘
                              ↓
                   Service interface calls
                              ↓
┌────────────────────────────────────────────────────────────────┐
│                         DOMAIN LAYER                            │
│                                                                 │
│  /domain                                                        │
│    /models                 - Domain entities                   │
│      Token.ts              - Token entity                      │
│        class Token {                                           │
│          id: Principal                                         │
│          symbol: string                                        │
│          votingPower: VotingPower                              │
│          orbitStation?: OrbitStation                           │
│        }                                                       │
│      OrbitStation.ts       - Station entity                    │
│        class OrbitStation {                                    │
│          id: Principal                                         │
│          name: string                                          │
│          requests: Request[]                                   │
│          accounts: Account[]                                   │
│        }                                                       │
│      Proposal.ts           - Proposal entity                   │
│      VotingPower.ts        - Value object                      │
│                                                                 │
│    /validators             - Business rules                    │
│      TokenValidator.ts     - Validate token operations         │
│      TransferValidator.ts  - Validate transfers                │
│      ProposalValidator.ts  - Validate proposals                │
│                                                                 │
│    /transformers           - Data transformation               │
│      OrbitTransformer.ts   - Map Orbit responses to domain     │
│      TokenTransformer.ts   - Map backend responses to domain   │
│                                                                 │
│  Principles:                                                    │
│  - Business logic here                                         │
│  - No external dependencies                                    │
│  - Pure functions where possible                               │
│  - Rich domain models (not anemic)                             │
│  - Validators return Result<T, Error>                          │
└────────────────────────────────────────────────────────────────┘
                              ↓
                      Domain model types
                              ↓
┌────────────────────────────────────────────────────────────────┐
│                     INFRASTRUCTURE LAYER                        │
│                                                                 │
│  /services                 - External integrations             │
│    /interfaces             - Service contracts                 │
│      ICanisterService.ts   - IC canister operations            │
│      IOrbitService.ts      - Orbit Station operations          │
│      IBackendService.ts    - DAOPad backend operations         │
│                                                                 │
│    /implementations                                            │
│      CanisterService.ts    - IC Agent wrapper                  │
│        - createActor()                                         │
│        - callCanister()                                        │
│        - queryCanister()                                       │
│      OrbitStationService.ts - Orbit integration                │
│        - listRequests()                                        │
│        - createTransfer()                                      │
│        - approveRequest()                                      │
│      DAOPadBackendService.ts - Backend integration             │
│        - getTokens()                                           │
│        - createProposal()                                      │
│        - vote()                                                │
│      KongLockerService.ts  - Kong Locker integration           │
│        - getVotingPower()                                      │
│        - getLPPositions()                                      │
│                                                                 │
│    /clients                - Low-level clients                 │
│      ICAgentClient.ts      - IC Agent setup                    │
│      HttpClient.ts         - HTTP requests (if needed)         │
│                                                                 │
│    /adapters               - External format adaptation        │
│      CandidAdapter.ts      - Candid parsing                    │
│      OrbitAdapter.ts       - Orbit response mapping            │
│                                                                 │
│  /errors                   - Error handling                    │
│    BaseError.ts            - Base error class                  │
│    CanisterError.ts        - IC-specific errors                │
│    OrbitError.ts           - Orbit-specific errors             │
│    ValidationError.ts      - Validation failures               │
│    ErrorHandler.ts         - Global error handling             │
│                                                                 │
│  /lib                      - Third-party wrappers              │
│    ServiceRegistry.ts      - Dependency injection container    │
│                                                                 │
│  Principles:                                                    │
│  - Implement service interfaces                                │
│  - Handle external communication                               │
│  - Map external data to domain models                          │
│  - Error handling and retry logic                              │
│  - No business logic (transformation only)                     │
└────────────────────────────────────────────────────────────────┘
```

### Service Architecture (Infrastructure Layer Detail)

```typescript
// ==================== SERVICE INTERFACES ====================

// Base service interface - all services implement this
interface IService {
  readonly name: string;
  initialize(): Promise<void>;
  dispose(): Promise<void>;
}

// Canister service interface - IC operations
interface ICanisterService extends IService {
  createActor<T>(canisterId: string, idlFactory: IDL.InterfaceFactory): Promise<ActorSubclass<T>>;
  call<T>(method: string, args: unknown[], canisterId: string): Promise<Result<T, CanisterError>>;
  query<T>(method: string, args: unknown[], canisterId: string): Promise<Result<T, CanisterError>>;
}

// Orbit Station service interface
interface IOrbitService extends IService {
  // Requests
  listRequests(stationId: Principal, filters: RequestFilters): Promise<Result<Request[], OrbitError>>;
  getRequest(stationId: Principal, requestId: string): Promise<Result<Request, OrbitError>>;
  createTransferRequest(stationId: Principal, params: TransferParams): Promise<Result<Request, OrbitError>>;
  approveRequest(stationId: Principal, requestId: string): Promise<Result<void, OrbitError>>;
  rejectRequest(stationId: Principal, requestId: string, reason: string): Promise<Result<void, OrbitError>>;

  // Accounts
  listAccounts(stationId: Principal, filters: AccountFilters): Promise<Result<Account[], OrbitError>>;
  getAccountBalance(stationId: Principal, accountId: string): Promise<Result<Balance, OrbitError>>;

  // Canisters
  listCanisters(stationId: Principal, filters: CanisterFilters): Promise<Result<ExternalCanister[], OrbitError>>;
  getCanisterStatus(stationId: Principal, canisterId: Principal): Promise<Result<CanisterStatus, OrbitError>>;
}

// DAOPad backend service interface
interface IBackendService extends IService {
  // Tokens
  getMyLockedTokens(): Promise<Result<Token[], BackendError>>;
  getOrbitStationForToken(tokenId: Principal): Promise<Result<Principal | null, BackendError>>;

  // Proposals
  getActiveProposalForToken(tokenId: Principal): Promise<Result<Proposal | null, BackendError>>;
  createProposal(params: ProposalParams): Promise<Result<Proposal, BackendError>>;
  voteOnProposal(proposalId: string, vote: Vote): Promise<Result<void, BackendError>>;

  // Voting Power
  getMyVotingPowerForToken(tokenId: Principal): Promise<Result<VotingPower, BackendError>>;
}

// Kong Locker service interface
interface IKongLockerService extends IService {
  getMyCanister(): Promise<Result<Principal, KongLockerError>>;
  getAllVotingPowers(): Promise<Result<Map<Principal, VotingPower>, KongLockerError>>;
  getLPPositions(canisterId: Principal): Promise<Result<LPPosition[], KongLockerError>>;
}

// ==================== SERVICE IMPLEMENTATIONS ====================

// Base service with common functionality
abstract class BaseService implements IService {
  abstract readonly name: string;
  protected identity: Identity | null = null;
  protected isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await this.onInitialize();
    this.isInitialized = true;
  }

  async dispose(): Promise<void> {
    if (!this.isInitialized) return;
    await this.onDispose();
    this.isInitialized = false;
  }

  protected abstract onInitialize(): Promise<void>;
  protected abstract onDispose(): Promise<void>;

  protected ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(`${this.name} not initialized. Call initialize() first.`);
    }
  }
}

// Canister service implementation
class CanisterService extends BaseService implements ICanisterService {
  readonly name = 'CanisterService';
  private agent: HttpAgent | null = null;
  private actorCache = new Map<string, ActorSubclass<any>>();

  constructor(private identityProvider: () => Identity | null) {
    super();
  }

  protected async onInitialize(): Promise<void> {
    this.identity = this.identityProvider();
    if (!this.identity) {
      throw new Error('Identity required for CanisterService');
    }

    const isLocal = import.meta.env.VITE_DFX_NETWORK === 'local';
    const host = isLocal ? 'http://localhost:4943' : 'https://icp0.io';

    this.agent = new HttpAgent({ identity: this.identity, host });

    if (isLocal) {
      await this.agent.fetchRootKey();
    }
  }

  protected async onDispose(): Promise<void> {
    this.agent = null;
    this.actorCache.clear();
  }

  async createActor<T>(
    canisterId: string,
    idlFactory: IDL.InterfaceFactory
  ): Promise<ActorSubclass<T>> {
    this.ensureInitialized();

    const cacheKey = canisterId;
    if (this.actorCache.has(cacheKey)) {
      return this.actorCache.get(cacheKey)!;
    }

    const actor = Actor.createActor<T>(idlFactory, {
      agent: this.agent!,
      canisterId: Principal.fromText(canisterId),
    });

    this.actorCache.set(cacheKey, actor);
    return actor;
  }

  async call<T>(
    method: string,
    args: unknown[],
    canisterId: string
  ): Promise<Result<T, CanisterError>> {
    try {
      this.ensureInitialized();
      const result = await ic_cdk.call(Principal.fromText(canisterId), method, args);
      return Result.ok(result as T);
    } catch (error) {
      return Result.err(new CanisterError(
        `Call to ${method} failed`,
        error instanceof Error ? error : new Error(String(error))
      ));
    }
  }

  async query<T>(
    method: string,
    args: unknown[],
    canisterId: string
  ): Promise<Result<T, CanisterError>> {
    try {
      this.ensureInitialized();
      const result = await ic_cdk.query(Principal.fromText(canisterId), method, args);
      return Result.ok(result as T);
    } catch (error) {
      return Result.err(new CanisterError(
        `Query to ${method} failed`,
        error instanceof Error ? error : new Error(String(error))
      ));
    }
  }
}

// Orbit Station service implementation
class OrbitStationService extends BaseService implements IOrbitService {
  readonly name = 'OrbitStationService';

  constructor(
    private canisterService: ICanisterService,
    private orbitAdapter: OrbitAdapter
  ) {
    super();
  }

  protected async onInitialize(): Promise<void> {
    await this.canisterService.initialize();
  }

  protected async onDispose(): Promise<void> {
    // Nothing to dispose
  }

  async listRequests(
    stationId: Principal,
    filters: RequestFilters
  ): Promise<Result<Request[], OrbitError>> {
    this.ensureInitialized();

    try {
      const actor = await this.canisterService.createActor<OrbitStationActor>(
        stationId.toText(),
        orbitStationIdlFactory
      );

      const response = await actor.list_requests({
        statuses: filters.statuses ? [filters.statuses] : [],
        operation_types: filters.operationTypes ? [filters.operationTypes] : [],
        paginate: filters.paginate ? [{
          offset: [BigInt(filters.paginate.offset)],
          limit: [BigInt(filters.paginate.limit)]
        }] : [],
        // ... other filters
      });

      // Parse Orbit's double-wrapped Result
      if ('Ok' in response) {
        const inner = response.Ok;
        if ('Ok' in inner) {
          const requests = inner.Ok.requests.map(r =>
            this.orbitAdapter.toRequest(r)
          );
          return Result.ok(requests);
        } else if ('Err' in inner) {
          return Result.err(this.orbitAdapter.toError(inner.Err));
        }
      }

      return Result.err(new OrbitError('Invalid response structure'));
    } catch (error) {
      return Result.err(new OrbitError(
        'Failed to list requests',
        error instanceof Error ? error : new Error(String(error))
      ));
    }
  }

  // ... other methods following same pattern
}

// ==================== SERVICE REGISTRY (DI CONTAINER) ====================

class ServiceRegistry {
  private services = new Map<string, IService>();
  private singletons = new Map<string, IService>();

  // Register a service factory
  register<T extends IService>(
    name: string,
    factory: () => T,
    singleton = true
  ): void {
    if (this.services.has(name)) {
      throw new Error(`Service ${name} already registered`);
    }

    if (singleton) {
      const instance = factory();
      this.singletons.set(name, instance);
    } else {
      this.services.set(name, { factory } as any);
    }
  }

  // Get a service instance
  get<T extends IService>(name: string): T {
    if (this.singletons.has(name)) {
      return this.singletons.get(name) as T;
    }

    const serviceEntry = this.services.get(name);
    if (!serviceEntry) {
      throw new Error(`Service ${name} not found`);
    }

    return (serviceEntry as any).factory() as T;
  }

  // Initialize all singletons
  async initializeAll(): Promise<void> {
    await Promise.all(
      Array.from(this.singletons.values()).map(s => s.initialize())
    );
  }

  // Dispose all singletons
  async disposeAll(): Promise<void> {
    await Promise.all(
      Array.from(this.singletons.values()).map(s => s.dispose())
    );
  }
}

// Global service registry instance
export const serviceRegistry = new ServiceRegistry();

// Setup function called at app startup
export function setupServices(identityProvider: () => Identity | null): void {
  // Register services with dependencies
  serviceRegistry.register(
    'CanisterService',
    () => new CanisterService(identityProvider),
    true
  );

  serviceRegistry.register(
    'OrbitStationService',
    () => new OrbitStationService(
      serviceRegistry.get<ICanisterService>('CanisterService'),
      new OrbitAdapter()
    ),
    true
  );

  serviceRegistry.register(
    'DAOPadBackendService',
    () => new DAOPadBackendService(
      serviceRegistry.get<ICanisterService>('CanisterService')
    ),
    true
  );

  serviceRegistry.register(
    'KongLockerService',
    () => new KongLockerService(
      serviceRegistry.get<ICanisterService>('CanisterService')
    ),
    true
  );
}
```

### Domain Model Types

```typescript
// ==================== VALUE OBJECTS ====================

class Principal {
  constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new ValidationError('Invalid principal format');
    }
  }

  static fromText(text: string): Principal {
    return new Principal(text);
  }

  toText(): string {
    return this.value;
  }

  equals(other: Principal): boolean {
    return this.value === other.value;
  }

  private isValid(value: string): boolean {
    // Principal validation logic
    return /^[a-z0-9-]{5,27}$/.test(value);
  }
}

class VotingPower {
  constructor(
    public readonly value: number,
    public readonly source: 'lp_tokens' | 'locked_tokens',
    public readonly calculatedAt: Date
  ) {
    if (value < 0) {
      throw new ValidationError('Voting power cannot be negative');
    }
  }

  isGreaterThan(other: VotingPower): boolean {
    return this.value > other.value;
  }

  add(other: VotingPower): VotingPower {
    return new VotingPower(
      this.value + other.value,
      this.source,
      new Date()
    );
  }
}

// ==================== ENTITIES ====================

class Token {
  constructor(
    public readonly id: Principal,
    public readonly symbol: string,
    public readonly name: string,
    public readonly decimals: number,
    public votingPower: VotingPower | null = null,
    public orbitStation: OrbitStation | null = null
  ) {}

  hasOrbitStation(): boolean {
    return this.orbitStation !== null;
  }

  canCreateProposal(minimumVotingPower: number): boolean {
    return this.votingPower !== null && this.votingPower.value >= minimumVotingPower;
  }

  updateVotingPower(votingPower: VotingPower): void {
    this.votingPower = votingPower;
  }

  linkOrbitStation(station: OrbitStation): void {
    this.orbitStation = station;
  }
}

class OrbitStation {
  constructor(
    public readonly id: Principal,
    public readonly name: string,
    public readonly tokenId: Principal,
    public requests: Request[] = [],
    public accounts: Account[] = []
  ) {}

  getPendingRequests(): Request[] {
    return this.requests.filter(r => r.status === 'Created' || r.status === 'Processing');
  }

  getTotalBalance(): Balance {
    return this.accounts.reduce(
      (total, account) => total.add(account.balance),
      Balance.zero()
    );
  }

  addRequest(request: Request): void {
    this.requests.push(request);
  }

  updateRequest(requestId: string, updates: Partial<Request>): void {
    const index = this.requests.findIndex(r => r.id === requestId);
    if (index !== -1) {
      this.requests[index] = { ...this.requests[index], ...updates };
    }
  }
}

class Request {
  constructor(
    public readonly id: string,
    public readonly stationId: Principal,
    public readonly operationType: OperationType,
    public status: RequestStatus,
    public readonly createdAt: Date,
    public readonly expiresAt: Date | null,
    public readonly requester: Principal,
    public approvals: Approval[] = []
  ) {}

  isPending(): boolean {
    return this.status === 'Created' || this.status === 'Processing';
  }

  isExpired(): boolean {
    return this.expiresAt !== null && this.expiresAt < new Date();
  }

  canApprove(userId: Principal, requiredApprovals: number): boolean {
    return this.isPending() &&
           !this.isExpired() &&
           !this.hasApprovalFrom(userId) &&
           this.approvals.length < requiredApprovals;
  }

  addApproval(approval: Approval): void {
    if (this.hasApprovalFrom(approval.approver)) {
      throw new ValidationError('User already approved this request');
    }
    this.approvals.push(approval);
  }

  private hasApprovalFrom(userId: Principal): boolean {
    return this.approvals.some(a => a.approver.equals(userId));
  }
}

class Proposal {
  constructor(
    public readonly id: string,
    public readonly tokenId: Principal,
    public readonly title: string,
    public readonly description: string,
    public status: ProposalStatus,
    public readonly createdBy: Principal,
    public readonly createdAt: Date,
    public readonly votingEnds: Date,
    public votes: Vote[] = []
  ) {}

  isActive(): boolean {
    return this.status === 'Active' && this.votingEnds > new Date();
  }

  getTotalVotingPower(): number {
    return this.votes.reduce((sum, vote) => sum + vote.votingPower.value, 0);
  }

  getVotesFor(): number {
    return this.votes
      .filter(v => v.choice === 'For')
      .reduce((sum, vote) => sum + vote.votingPower.value, 0);
  }

  getVotesAgainst(): number {
    return this.votes
      .filter(v => v.choice === 'Against')
      .reduce((sum, vote) => sum + vote.votingPower.value, 0);
  }

  hasVoted(userId: Principal): boolean {
    return this.votes.some(v => v.voter.equals(userId));
  }

  addVote(vote: Vote): void {
    if (!this.isActive()) {
      throw new ValidationError('Proposal is not active');
    }
    if (this.hasVoted(vote.voter)) {
      throw new ValidationError('User already voted on this proposal');
    }
    this.votes.push(vote);
  }
}

// ==================== TYPE DEFINITIONS ====================

type RequestStatus =
  | 'Created'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'
  | 'Processing'
  | 'Completed'
  | 'Failed';

type ProposalStatus =
  | 'Draft'
  | 'Active'
  | 'Passed'
  | 'Rejected'
  | 'Expired'
  | 'Executed';

type OperationType =
  | 'Transfer'
  | 'AddAccount'
  | 'EditAccount'
  | 'CreateExternalCanister'
  | 'ChangeExternalCanister'
  | 'CallExternalCanister'
  | 'AddUser'
  | 'EditUser'
  | 'SystemUpgrade';

interface Approval {
  approver: Principal;
  approvedAt: Date;
  statusReason: string | null;
}

interface Vote {
  voter: Principal;
  choice: 'For' | 'Against' | 'Abstain';
  votingPower: VotingPower;
  votedAt: Date;
}

interface Account {
  id: string;
  name: string;
  balance: Balance;
  blockchain: 'IC' | 'Ethereum' | 'Bitcoin';
}

interface Balance {
  amount: bigint;
  decimals: number;
  symbol: string;
}
```

### Redux Integration with Services

```typescript
// ==================== TOKEN SLICE WITH SERVICE INJECTION ====================

// tokenSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { serviceRegistry } from '@/lib/ServiceRegistry';
import { IBackendService, IKongLockerService } from '@/services/interfaces';
import { Token, VotingPower } from '@/domain/models';

// State shape
interface TokenState {
  tokens: Record<string, Token>; // Normalized by ID
  activeTokenId: string | null;
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: TokenState = {
  tokens: {},
  activeTokenId: null,
  loading: false,
  error: null,
};

// ==================== ASYNC THUNKS ====================

// Fetch all tokens for current user
export const fetchTokens = createAsyncThunk(
  'token/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      // Get services from registry
      const backendService = serviceRegistry.get<IBackendService>('DAOPadBackendService');
      const kongLockerService = serviceRegistry.get<IKongLockerService>('KongLockerService');

      // Fetch locked tokens
      const tokensResult = await backendService.getMyLockedTokens();
      if (!tokensResult.isOk()) {
        return rejectWithValue(tokensResult.error.message);
      }

      const tokens = tokensResult.value;

      // Fetch voting powers in parallel
      const votingPowersResult = await kongLockerService.getAllVotingPowers();
      if (votingPowersResult.isOk()) {
        const votingPowers = votingPowersResult.value;

        // Enrich tokens with voting power
        tokens.forEach(token => {
          const vp = votingPowers.get(token.id);
          if (vp) {
            token.updateVotingPower(vp);
          }
        });
      }

      // Fetch Orbit Station links in parallel
      await Promise.all(
        tokens.map(async token => {
          const stationResult = await backendService.getOrbitStationForToken(token.id);
          if (stationResult.isOk() && stationResult.value) {
            // Create OrbitStation entity (simplified - would fetch more data)
            const station = new OrbitStation(
              stationResult.value,
              `${token.symbol} Treasury`,
              token.id
            );
            token.linkOrbitStation(station);
          }
        })
      );

      return tokens;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch tokens'
      );
    }
  }
);

// Refresh single token
export const refreshToken = createAsyncThunk(
  'token/refresh',
  async (tokenId: string, { rejectWithValue }) => {
    try {
      const backendService = serviceRegistry.get<IBackendService>('DAOPadBackendService');
      const kongLockerService = serviceRegistry.get<IKongLockerService>('KongLockerService');

      // Fetch voting power
      const principal = Principal.fromText(tokenId);
      const vpResult = await backendService.getMyVotingPowerForToken(principal);

      if (!vpResult.isOk()) {
        return rejectWithValue(vpResult.error.message);
      }

      return { tokenId, votingPower: vpResult.value };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to refresh token'
      );
    }
  }
);

// ==================== SLICE ====================

const tokenSlice = createSlice({
  name: 'token',
  initialState,
  reducers: {
    setActiveToken(state, action: PayloadAction<string>) {
      state.activeTokenId = action.payload;
    },
    clearTokens(state) {
      state.tokens = {};
      state.activeTokenId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all tokens
      .addCase(fetchTokens.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTokens.fulfilled, (state, action) => {
        state.loading = false;
        state.tokens = action.payload.reduce((acc, token) => {
          acc[token.id.toText()] = token;
          return acc;
        }, {} as Record<string, Token>);

        // Set first token as active if none selected
        if (!state.activeTokenId && action.payload.length > 0) {
          state.activeTokenId = action.payload[0].id.toText();
        }
      })
      .addCase(fetchTokens.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Refresh token
      .addCase(refreshToken.fulfilled, (state, action) => {
        const { tokenId, votingPower } = action.payload;
        if (state.tokens[tokenId]) {
          state.tokens[tokenId].updateVotingPower(votingPower);
        }
      });
  },
});

// ==================== SELECTORS ====================

export const selectAllTokens = (state: RootState): Token[] =>
  Object.values(state.token.tokens);

export const selectActiveToken = (state: RootState): Token | null =>
  state.token.activeTokenId ? state.token.tokens[state.token.activeTokenId] : null;

export const selectTokenById = (state: RootState, tokenId: string): Token | null =>
  state.token.tokens[tokenId] || null;

export const selectTokensWithStations = (state: RootState): Token[] =>
  Object.values(state.token.tokens).filter(t => t.hasOrbitStation());

export const selectTokensSortedByVotingPower = (state: RootState): Token[] =>
  Object.values(state.token.tokens)
    .filter(t => t.votingPower !== null)
    .sort((a, b) => b.votingPower!.value - a.votingPower!.value);

export const { setActiveToken, clearTokens } = tokenSlice.actions;
export default tokenSlice.reducer;
```

### Component Structure (Presentation Layer)

```typescript
// ==================== CUSTOM HOOK (BRIDGE TO APPLICATION LAYER) ====================

// hooks/useToken.ts
import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useEffect } from 'react';
import {
  fetchTokens,
  refreshToken,
  selectActiveToken,
  selectAllTokens,
  setActiveToken
} from '@/state/slices/tokenSlice';

export function useToken() {
  const dispatch = useDispatch();
  const activeToken = useSelector(selectActiveToken);
  const allTokens = useSelector(selectAllTokens);
  const loading = useSelector((state: RootState) => state.token.loading);
  const error = useSelector((state: RootState) => state.token.error);

  // Load tokens on mount
  useEffect(() => {
    dispatch(fetchTokens());
  }, [dispatch]);

  // Actions
  const setActive = useCallback(
    (tokenId: string) => dispatch(setActiveToken(tokenId)),
    [dispatch]
  );

  const refresh = useCallback(
    (tokenId: string) => dispatch(refreshToken(tokenId)),
    [dispatch]
  );

  return {
    // State
    activeToken,
    allTokens,
    loading,
    error,

    // Actions
    setActive,
    refresh,
  };
}

// ==================== PRESENTATIONAL COMPONENTS ====================

// components/features/token/TokenCard.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Token } from '@/domain/models';

interface TokenCardProps {
  token: Token;
  isActive: boolean;
  onSelect: (tokenId: string) => void;
  onRefresh: (tokenId: string) => void;
}

export function TokenCard({ token, isActive, onSelect, onRefresh }: TokenCardProps) {
  return (
    <Card
      className={isActive ? 'border-executive-gold' : 'border-executive-mediumGray'}
      onClick={() => onSelect(token.id.toText())}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{token.symbol}</span>
          {token.hasOrbitStation() && (
            <Badge className="bg-executive-gold/20">
              Treasury Linked
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            {token.name}
          </div>

          {token.votingPower && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Voting Power:</span>
              <span className="font-mono text-executive-gold">
                {token.votingPower.value.toLocaleString()}
              </span>
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onRefresh(token.id.toText());
            }}
          >
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// components/features/token/TokenList.tsx
import React from 'react';
import { TokenCard } from './TokenCard';
import { Token } from '@/domain/models';

interface TokenListProps {
  tokens: Token[];
  activeTokenId: string | null;
  onSelectToken: (tokenId: string) => void;
  onRefreshToken: (tokenId: string) => void;
}

export function TokenList({
  tokens,
  activeTokenId,
  onSelectToken,
  onRefreshToken
}: TokenListProps) {
  if (tokens.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No locked tokens found. Lock some LP tokens in Kong Locker to get started.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tokens.map(token => (
        <TokenCard
          key={token.id.toText()}
          token={token}
          isActive={token.id.toText() === activeTokenId}
          onSelect={onSelectToken}
          onRefresh={onRefreshToken}
        />
      ))}
    </div>
  );
}

// ==================== PAGE COMPONENT (ORCHESTRATION) ====================

// pages/DashboardPage.tsx
import React from 'react';
import { useToken } from '@/hooks/useToken';
import { TokenList } from '@/components/features/token/TokenList';
import { OrbitStationDashboard } from '@/components/features/orbit/OrbitStationDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function DashboardPage() {
  const { activeToken, allTokens, loading, error, setActive, refresh } = useToken();

  if (loading && allTokens.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-display text-executive-ivory mb-4">
          Your Tokens
        </h2>
        <TokenList
          tokens={allTokens}
          activeTokenId={activeToken?.id.toText() || null}
          onSelectToken={setActive}
          onRefreshToken={refresh}
        />
      </section>

      {activeToken && activeToken.hasOrbitStation() && (
        <section>
          <h2 className="text-2xl font-display text-executive-ivory mb-4">
            Treasury Dashboard
          </h2>
          <OrbitStationDashboard station={activeToken.orbitStation!} />
        </section>
      )}
    </div>
  );
}
```

### Error Handling Architecture

```typescript
// ==================== ERROR BASE CLASSES ====================

// errors/BaseError.ts
export abstract class BaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  abstract toUserMessage(): string;

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      cause: this.cause?.message,
      stack: this.stack,
    };
  }
}

// errors/CanisterError.ts
export class CanisterError extends BaseError {
  constructor(
    message: string,
    cause?: Error,
    public readonly canisterId?: string
  ) {
    super(message, 'CANISTER_ERROR', cause);
  }

  toUserMessage(): string {
    if (this.message.includes('out of cycles')) {
      return 'The canister is out of cycles. Please top up the canister.';
    }
    if (this.message.includes('not authorized')) {
      return 'You are not authorized to perform this action.';
    }
    return 'Failed to communicate with the canister. Please try again.';
  }
}

// errors/OrbitError.ts
export class OrbitError extends BaseError {
  constructor(
    message: string,
    cause?: Error,
    public readonly orbitCode?: string
  ) {
    super(message, 'ORBIT_ERROR', cause);
  }

  toUserMessage(): string {
    if (this.orbitCode === 'UNAUTHORIZED') {
      return 'You do not have permission to access this Orbit Station.';
    }
    if (this.orbitCode === 'REQUEST_NOT_FOUND') {
      return 'The requested item was not found.';
    }
    if (this.orbitCode === 'INSUFFICIENT_APPROVALS') {
      return 'More approvals are needed before this action can complete.';
    }
    return 'Failed to communicate with Orbit Station. Please try again.';
  }
}

// errors/ValidationError.ts
export class ValidationError extends BaseError {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown
  ) {
    super(message, 'VALIDATION_ERROR');
  }

  toUserMessage(): string {
    return this.field
      ? `Invalid ${this.field}: ${this.message}`
      : this.message;
  }
}

// errors/BackendError.ts
export class BackendError extends BaseError {
  constructor(
    message: string,
    cause?: Error,
    public readonly endpoint?: string
  ) {
    super(message, 'BACKEND_ERROR', cause);
  }

  toUserMessage(): string {
    return 'Failed to communicate with DAOPad backend. Please try again.';
  }
}

// ==================== RESULT TYPE ====================

// types/Result.ts
export class Result<T, E extends Error> {
  private constructor(
    private readonly value: T | null,
    private readonly error: E | null
  ) {}

  static ok<T, E extends Error>(value: T): Result<T, E> {
    return new Result<T, E>(value, null);
  }

  static err<T, E extends Error>(error: E): Result<T, E> {
    return new Result<T, E>(null, error);
  }

  isOk(): this is { value: T } {
    return this.error === null;
  }

  isErr(): this is { error: E } {
    return this.error !== null;
  }

  unwrap(): T {
    if (this.error !== null) {
      throw this.error;
    }
    return this.value!;
  }

  unwrapOr(defaultValue: T): T {
    return this.error === null ? this.value! : defaultValue;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return this.error === null
      ? Result.ok(fn(this.value!))
      : Result.err(this.error);
  }

  mapErr<F extends Error>(fn: (error: E) => F): Result<T, F> {
    return this.error === null
      ? Result.ok(this.value!)
      : Result.err(fn(this.error));
  }

  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return this.error === null
      ? fn(this.value!)
      : Result.err(this.error);
  }
}

// ==================== GLOBAL ERROR HANDLER ====================

// errors/ErrorHandler.ts
import { BaseError } from './BaseError';
import { toast } from '@/hooks/use-toast';

class ErrorHandler {
  private handlers = new Map<string, (error: BaseError) => void>();

  register(errorCode: string, handler: (error: BaseError) => void): void {
    this.handlers.set(errorCode, handler);
  }

  handle(error: Error | BaseError): void {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('Error handled:', error);
    }

    // Send to error tracking service (Sentry, etc.)
    this.reportToService(error);

    // Handle with custom handler if available
    if (error instanceof BaseError) {
      const handler = this.handlers.get(error.code);
      if (handler) {
        handler(error);
        return;
      }
    }

    // Default: Show toast notification
    this.showErrorToast(error);
  }

  private showErrorToast(error: Error | BaseError): void {
    const message = error instanceof BaseError
      ? error.toUserMessage()
      : 'An unexpected error occurred. Please try again.';

    toast({
      variant: 'destructive',
      title: 'Error',
      description: message,
    });
  }

  private reportToService(error: Error): void {
    // Send to Sentry, LogRocket, etc.
    // Example: Sentry.captureException(error);
  }
}

export const errorHandler = new ErrorHandler();

// Setup custom handlers
errorHandler.register('CANISTER_ERROR', (error) => {
  // Custom handling for canister errors
  console.log('Canister error occurred:', error);
});

errorHandler.register('ORBIT_ERROR', (error) => {
  // Custom handling for Orbit errors
  console.log('Orbit error occurred:', error);
});
```

---

## Implementation Roadmap

### Phase 1: Service Layer Foundation (PR #1)
**Goal:** Establish clean service architecture with interfaces and dependency injection
**Files:** 15 new, 5 modified
**LOC:** +2,000 lines
**Time:** 8-10 hours
**Risk:** MEDIUM - New patterns, but isolated from existing code

**Tasks:**
1. Create service interfaces
   - `IService` base interface
   - `ICanisterService` for IC operations
   - `IOrbitService` for Orbit Station
   - `IBackendService` for DAOPad backend
   - `IKongLockerService` for Kong Locker

2. Implement `BaseService` abstract class
   - Lifecycle management (initialize/dispose)
   - Common error handling
   - Identity management

3. Implement `CanisterService`
   - Actor creation and caching
   - Call/query methods with error handling
   - Principal conversion utilities

4. Implement `ServiceRegistry`
   - Dependency injection container
   - Singleton management
   - Service initialization coordination

5. Create error type hierarchy
   - `BaseError` abstract class
   - `CanisterError`, `OrbitError`, `BackendError`, `ValidationError`
   - `ErrorHandler` singleton
   - `Result<T, E>` type

6. Write comprehensive tests
   - Unit tests for each service
   - Mock IC agent for testing
   - Error handling scenarios
   - Service registry behavior

**Success Criteria:**
- ✅ All service interfaces defined with TypeScript
- ✅ Base service implements lifecycle correctly
- ✅ CanisterService can create actors and make calls
- ✅ ServiceRegistry can register and retrieve services
- ✅ Error types compile and display user-friendly messages
- ✅ Tests achieve >80% coverage for service layer
- ✅ Deploy to mainnet and verify basic IC queries work

**Verification:**
```bash
# Build and deploy
./deploy.sh --network ic --frontend-only

# Test canister service
# Open browser console at https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
# Verify CanisterService can create actors and make queries
```

### Phase 2: Domain Models & Types (PR #2)
**Goal:** Create rich domain model types to replace primitive obsession
**Files:** 25 new, 0 modified
**LOC:** +1,500 lines
**Time:** 6-8 hours
**Risk:** LOW - Pure types, no runtime changes

**Tasks:**
1. Create value objects
   - `Principal` with validation
   - `VotingPower` with comparison methods
   - `Balance` with arithmetic operations
   - `Timestamp` with formatting

2. Create entity classes
   - `Token` with business methods
   - `OrbitStation` with request/account management
   - `Request` with approval logic
   - `Proposal` with voting logic
   - `Account`, `ExternalCanister`

3. Define type enums
   - `RequestStatus`, `ProposalStatus`
   - `OperationType`, `BlockchainType`
   - `VoteChoice`

4. Create validators
   - `TokenValidator` - validate token operations
   - `TransferValidator` - validate transfers
   - `ProposalValidator` - validate proposals
   - `PrincipalValidator` - validate principals

5. Create transformers
   - `OrbitTransformer` - map Orbit responses to domain
   - `TokenTransformer` - map backend responses to domain
   - `CandidTransformer` - parse Candid data

6. Write unit tests
   - Test value object validation
   - Test entity business logic
   - Test validator rules
   - Test transformer edge cases

**Success Criteria:**
- ✅ All domain types defined with TypeScript
- ✅ Value objects reject invalid inputs
- ✅ Entities have meaningful business methods
- ✅ Validators return clear error messages
- ✅ Transformers handle Orbit/backend data correctly
- ✅ Tests achieve >90% coverage for domain layer
- ✅ No breaking changes (types only)

**Verification:**
```bash
# Type check
npm run type-check

# Run tests
npm run test

# Build succeeds
npm run build
```

### Phase 3: Service Implementations (PR #3)
**Goal:** Implement concrete services using interfaces from Phase 1
**Files:** 10 new, 4 modified
**LOC:** +1,800 lines
**Time:** 10-12 hours
**Risk:** HIGH - Replaces existing service layer

**Tasks:**
1. Implement `OrbitStationService`
   - List/get requests with filters
   - Create transfer requests
   - Approve/reject requests
   - List accounts and balances
   - List/manage external canisters
   - Use `OrbitAdapter` for response parsing

2. Implement `DAOPadBackendService`
   - Get locked tokens
   - Get Orbit Station for token
   - Create/vote on proposals
   - Get voting power
   - Use domain model types

3. Implement `KongLockerService`
   - Get user's locker canister
   - Get all voting powers
   - Get LP positions
   - Calculate voting power from positions

4. Create adapters
   - `OrbitAdapter` - parse Orbit's double-wrapped Results
   - `CandidAdapter` - handle Candid field hashing
   - `PrincipalAdapter` - consistent Principal conversion

5. Update `ServiceRegistry` setup
   - Register all service implementations
   - Wire dependencies correctly
   - Initialize on app startup

6. Write integration tests
   - Test against mainnet canisters
   - Verify Orbit Station calls
   - Verify backend calls
   - Verify Kong Locker calls

**Success Criteria:**
- ✅ All services implement their interfaces
- ✅ Services return domain model types
- ✅ Adapters correctly parse Orbit responses
- ✅ ServiceRegistry wires dependencies correctly
- ✅ Integration tests pass against mainnet
- ✅ No breaking changes to Redux layer yet

**Verification:**
```bash
# Build and deploy
./deploy.sh --network ic --frontend-only

# Test service calls
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai get_my_locked_tokens '()'

# Verify in browser
# Open https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
# Open console, test serviceRegistry.get('DAOPadBackendService')
```

### Phase 4: Redux Migration (PR #4)
**Goal:** Update Redux slices to use new service layer
**Files:** 8 modified
**LOC:** -500 lines, +800 lines (net +300)
**Time:** 8-10 hours
**Risk:** HIGH - Changes state management patterns

**Tasks:**
1. Update `tokenSlice`
   - Use `IBackendService` and `IKongLockerService`
   - Return domain model `Token` objects
   - Update selectors for new types

2. Update `orbitSlice`
   - Use `IOrbitService`
   - Return domain model `Request`, `Account` objects
   - Update selectors for new types

3. Update `authSlice`
   - Already clean, minor updates

4. Update `daoSlice`
   - Split into `proposalSlice` (DAO proposals) and `kongLockerSlice`
   - Use domain model `Proposal` objects
   - Clarify responsibilities

5. Update `stationSlice`
   - Merge with `orbitSlice` or remove
   - Eliminate duplication

6. Remove old service files
   - Delete `daopadBackend.js` god object
   - Delete duplicate service files
   - Keep only `ServiceRegistry` and implementations

7. Update tests
   - Mock services instead of canisters
   - Test Redux thunks with mocked services
   - Test selectors with new types

**Success Criteria:**
- ✅ All Redux slices use service interfaces
- ✅ Thunks return domain model types
- ✅ Selectors work with new types
- ✅ No direct canister calls from Redux
- ✅ Old service files removed
- ✅ Tests pass with mocked services
- ✅ Deploy to mainnet and verify state management works

**Verification:**
```bash
# Build and deploy
./deploy.sh --network ic --frontend-only

# Test in browser
# Open https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
# Login with Internet Identity
# Verify tokens load correctly
# Verify Redux DevTools shows correct state shape
```

### Phase 5: Component Refactoring (PR #5)
**Goal:** Refactor components to be pure presentation with hooks
**Files:** 30 modified
**LOC:** -1,200 lines, +600 lines (net -600)
**Time:** 12-15 hours
**Risk:** MEDIUM - UI changes, visual regression possible

**Tasks:**
1. Create custom hooks
   - `useToken()` - bridge to tokenSlice
   - `useOrbitStation()` - bridge to orbitSlice
   - `useProposal()` - bridge to proposalSlice
   - `useVotingPower()` - combine token + Kong Locker
   - `useAuth()` - bridge to authSlice

2. Refactor major components
   - `TokenTabs` - remove business logic, use useToken()
   - `TokenDashboard` - pure presentation, receive props
   - `DaoProposals` - use useProposal(), pure rendering
   - `RequestList` - use useOrbitStation(), pure rendering
   - `TransferDialog` - use useOrbitStation(), form only

3. Create feature components
   - `features/token/TokenCard` - display token
   - `features/token/TokenList` - list tokens
   - `features/orbit/StationCard` - display station
   - `features/orbit/RequestList` - list requests
   - `features/orbit/AccountList` - list accounts
   - `features/proposal/ProposalCard` - display proposal
   - `features/proposal/ProposalList` - list proposals

4. Refactor pages
   - `DashboardPage` - orchestrate dashboard features
   - `RequestsPage` - orchestrate request management
   - `AddressBookPage` - already clean
   - `PermissionsPage` - minor updates

5. Remove component business logic
   - Extract to services or Redux thunks
   - Components only render and handle events
   - Pass data via props, emit via callbacks

6. Update component tests
   - Test components with mock props
   - Test hooks with mock Redux store
   - Test integration in pages

**Success Criteria:**
- ✅ Components are pure presentation
- ✅ All business logic in services or Redux
- ✅ Custom hooks bridge to Redux cleanly
- ✅ Components receive data via props
- ✅ Components emit events via callbacks
- ✅ No service instantiation in components
- ✅ Tests pass for components and hooks
- ✅ Deploy and verify UI works identically

**Verification:**
```bash
# Build and deploy
./deploy.sh --network ic --frontend-only

# Manual testing
# Open https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
# Test all user flows:
# - Login
# - View tokens
# - Select token
# - View Orbit Station
# - Create transfer request
# - Approve request
# - View proposals
# - Vote on proposal
```

### Phase 6: Cleanup & Documentation (PR #6)
**Goal:** Final cleanup, add comprehensive documentation
**Files:** 10 modified, 5 new (docs)
**LOC:** +500 lines (mostly docs)
**Time:** 6-8 hours
**Risk:** LOW - Documentation only

**Tasks:**
1. Remove dead code
   - Delete unused service files
   - Delete unused utilities
   - Delete commented code
   - Delete obsolete components

2. Consolidate utilities
   - Keep only pure utility functions
   - Move domain logic to validators
   - Create clear utility categories

3. Add JSDoc comments
   - Document all service interfaces
   - Document all domain model classes
   - Document all validators
   - Document all custom hooks

4. Create architecture docs
   - `ARCHITECTURE.md` - layer diagram and principles
   - `SERVICES.md` - service layer guide
   - `DOMAIN_MODELS.md` - domain model guide
   - `COMPONENTS.md` - component patterns guide
   - `TESTING.md` - testing strategy guide

5. Update README
   - Add architecture overview
   - Add developer onboarding
   - Add contribution guidelines

6. Final code review
   - Run linter and fix issues
   - Run type checker and fix issues
   - Ensure consistent formatting
   - Verify no `any` types remain

**Success Criteria:**
- ✅ No dead code or unused files
- ✅ Utilities are pure and well-organized
- ✅ All public APIs documented
- ✅ Architecture documentation complete
- ✅ Developer guides written
- ✅ Linter passes with no errors
- ✅ Type checker passes with strict mode
- ✅ Final deployment successful

**Verification:**
```bash
# Linter
npm run lint

# Type check
npm run type-check

# Build
npm run build

# Deploy
./deploy.sh --network ic --frontend-only

# Final manual test
# Verify all functionality works end-to-end
```

---

## Testing Strategy

### Unit Tests (Services & Domain)

**Framework:** Vitest
**Coverage Target:** >80% for service layer, >90% for domain layer

**Service Layer Tests:**
```typescript
// services/__tests__/CanisterService.test.ts
describe('CanisterService', () => {
  let service: ICanisterService;
  let mockAgent: MockHttpAgent;

  beforeEach(() => {
    mockAgent = new MockHttpAgent();
    service = new CanisterService(() => mockIdentity);
  });

  describe('createActor', () => {
    it('should create actor with correct canister ID', async () => {
      await service.initialize();
      const actor = await service.createActor('rrkah-fqaaa-aaaaa-aaaaq-cai', mockIdlFactory);
      expect(actor).toBeDefined();
      expect(mockAgent.createActor).toHaveBeenCalledWith(
        mockIdlFactory,
        expect.objectContaining({
          canisterId: Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai')
        })
      );
    });

    it('should cache actors by canister ID', async () => {
      await service.initialize();
      const actor1 = await service.createActor('rrkah-fqaaa-aaaaa-aaaaq-cai', mockIdlFactory);
      const actor2 = await service.createActor('rrkah-fqaaa-aaaaa-aaaaq-cai', mockIdlFactory);
      expect(actor1).toBe(actor2);
    });

    it('should throw if not initialized', async () => {
      await expect(
        service.createActor('rrkah-fqaaa-aaaaa-aaaaq-cai', mockIdlFactory)
      ).rejects.toThrow('not initialized');
    });
  });

  describe('call', () => {
    it('should return Ok result on success', async () => {
      await service.initialize();
      mockAgent.call.mockResolvedValue({ success: true });

      const result = await service.call('test_method', [], 'rrkah-fqaaa-aaaaa-aaaaq-cai');

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual({ success: true });
    });

    it('should return Err result on failure', async () => {
      await service.initialize();
      mockAgent.call.mockRejectedValue(new Error('Call failed'));

      const result = await service.call('test_method', [], 'rrkah-fqaaa-aaaaa-aaaaq-cai');

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(CanisterError);
    });
  });
});

// services/__tests__/OrbitStationService.test.ts
describe('OrbitStationService', () => {
  let service: IOrbitService;
  let mockCanisterService: MockCanisterService;
  let mockAdapter: MockOrbitAdapter;

  beforeEach(() => {
    mockCanisterService = new MockCanisterService();
    mockAdapter = new MockOrbitAdapter();
    service = new OrbitStationService(mockCanisterService, mockAdapter);
  });

  describe('listRequests', () => {
    it('should return requests on success', async () => {
      await service.initialize();
      mockCanisterService.createActor.mockResolvedValue(mockOrbitActor);
      mockOrbitActor.list_requests.mockResolvedValue({
        Ok: { Ok: { requests: [mockOrbitRequest], total: 1n } }
      });
      mockAdapter.toRequest.mockReturnValue(mockDomainRequest);

      const result = await service.listRequests(
        Principal.fromText('fec7w-zyaaa-aaaaa-qaffq-cai'),
        { statuses: ['Created'] }
      );

      expect(result.isOk()).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value[0]).toEqual(mockDomainRequest);
    });

    it('should return OrbitError on Orbit failure', async () => {
      await service.initialize();
      mockCanisterService.createActor.mockResolvedValue(mockOrbitActor);
      mockOrbitActor.list_requests.mockResolvedValue({
        Ok: { Err: { code: 'UNAUTHORIZED', message: 'Not authorized' } }
      });

      const result = await service.listRequests(
        Principal.fromText('fec7w-zyaaa-aaaaa-qaffq-cai'),
        {}
      );

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(OrbitError);
      expect(result.error.orbitCode).toBe('UNAUTHORIZED');
    });
  });
});
```

**Domain Layer Tests:**
```typescript
// domain/models/__tests__/Token.test.ts
describe('Token', () => {
  let token: Token;

  beforeEach(() => {
    token = new Token(
      Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai'),
      'ICP',
      'Internet Computer',
      8
    );
  });

  describe('hasOrbitStation', () => {
    it('should return false when no station linked', () => {
      expect(token.hasOrbitStation()).toBe(false);
    });

    it('should return true when station linked', () => {
      token.linkOrbitStation(mockOrbitStation);
      expect(token.hasOrbitStation()).toBe(true);
    });
  });

  describe('canCreateProposal', () => {
    it('should return false when no voting power', () => {
      expect(token.canCreateProposal(100)).toBe(false);
    });

    it('should return false when voting power below minimum', () => {
      token.updateVotingPower(new VotingPower(50, 'lp_tokens', new Date()));
      expect(token.canCreateProposal(100)).toBe(false);
    });

    it('should return true when voting power above minimum', () => {
      token.updateVotingPower(new VotingPower(150, 'lp_tokens', new Date()));
      expect(token.canCreateProposal(100)).toBe(true);
    });
  });
});

// domain/validators/__tests__/TransferValidator.test.ts
describe('TransferValidator', () => {
  let validator: TransferValidator;

  beforeEach(() => {
    validator = new TransferValidator();
  });

  describe('validateTransfer', () => {
    it('should return Ok for valid transfer', () => {
      const params = {
        to: Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai'),
        amount: 1000000n,
        token: 'ICP'
      };

      const result = validator.validateTransfer(params);
      expect(result.isOk()).toBe(true);
    });

    it('should return Err for zero amount', () => {
      const params = {
        to: Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai'),
        amount: 0n,
        token: 'ICP'
      };

      const result = validator.validateTransfer(params);
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.message).toContain('amount');
    });

    it('should return Err for invalid principal', () => {
      const params = {
        to: 'invalid-principal',
        amount: 1000000n,
        token: 'ICP'
      };

      const result = validator.validateTransfer(params);
      expect(result.isErr()).toBe(true);
      expect(result.error.field).toBe('to');
    });
  });
});
```

### Integration Tests (Services + Mainnet)

**Strategy:** Test against actual mainnet canisters during deployment

```typescript
// services/__tests__/integration/OrbitIntegration.test.ts
describe('Orbit Station Integration', () => {
  let service: IOrbitService;
  const TEST_STATION = Principal.fromText('fec7w-zyaaa-aaaaa-qaffq-cai');

  beforeAll(async () => {
    // Use daopad identity for testing
    const identity = await getTestIdentity('daopad');
    serviceRegistry.setup(identity);
    service = serviceRegistry.get<IOrbitService>('OrbitStationService');
    await service.initialize();
  });

  it('should list requests from test station', async () => {
    const result = await service.listRequests(TEST_STATION, {
      statuses: ['Created', 'Processing']
    });

    expect(result.isOk()).toBe(true);
    expect(Array.isArray(result.value)).toBe(true);

    if (result.value.length > 0) {
      const request = result.value[0];
      expect(request).toBeInstanceOf(Request);
      expect(request.id).toBeTruthy();
      expect(request.stationId.equals(TEST_STATION)).toBe(true);
    }
  });

  it('should handle unauthorized access gracefully', async () => {
    // Use identity without permissions
    const unauthorizedIdentity = await getTestIdentity('unauthorized');
    const unauthorizedService = new OrbitStationService(
      new CanisterService(() => unauthorizedIdentity),
      new OrbitAdapter()
    );

    const result = await unauthorizedService.listRequests(TEST_STATION, {});

    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(OrbitError);
    expect(result.error.orbitCode).toBe('UNAUTHORIZED');
  });
});
```

### Component Tests (React Testing Library)

```typescript
// components/features/token/__tests__/TokenCard.test.tsx
describe('TokenCard', () => {
  const mockToken = new Token(
    Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai'),
    'ICP',
    'Internet Computer',
    8
  );
  mockToken.updateVotingPower(new VotingPower(1000, 'lp_tokens', new Date()));

  it('should render token information', () => {
    const { getByText } = render(
      <TokenCard
        token={mockToken}
        isActive={false}
        onSelect={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(getByText('ICP')).toBeInTheDocument();
    expect(getByText('Internet Computer')).toBeInTheDocument();
    expect(getByText('1,000')).toBeInTheDocument();
  });

  it('should call onSelect when clicked', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <TokenCard
        token={mockToken}
        isActive={false}
        onSelect={onSelect}
        onRefresh={vi.fn()}
      />
    );

    fireEvent.click(container.firstChild!);
    expect(onSelect).toHaveBeenCalledWith('rrkah-fqaaa-aaaaa-aaaaq-cai');
  });

  it('should show treasury badge when station linked', () => {
    const tokenWithStation = new Token(
      Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai'),
      'ICP',
      'Internet Computer',
      8
    );
    tokenWithStation.linkOrbitStation(mockOrbitStation);

    const { getByText } = render(
      <TokenCard
        token={tokenWithStation}
        isActive={false}
        onSelect={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(getByText('Treasury Linked')).toBeInTheDocument();
  });
});

// hooks/__tests__/useToken.test.ts
describe('useToken', () => {
  it('should fetch tokens on mount', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useToken(), {
      wrapper: ReduxProvider
    });

    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.allTokens).toBeDefined();
  });

  it('should set active token', () => {
    const { result } = renderHook(() => useToken(), {
      wrapper: ReduxProvider
    });

    act(() => {
      result.current.setActive('rrkah-fqaaa-aaaaa-aaaaq-cai');
    });

    expect(result.current.activeToken?.id.toText()).toBe('rrkah-fqaaa-aaaaa-aaaaq-cai');
  });
});
```

### E2E Tests (Playwright - Optional, Future Work)

```typescript
// e2e/dashboard.spec.ts
test.describe('Dashboard', () => {
  test('should load tokens after login', async ({ page }) => {
    await page.goto('https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io');

    // Login with test identity
    await page.click('text=Connect with Internet Identity');
    // ... Internet Identity flow

    // Wait for tokens to load
    await page.waitForSelector('[data-testid="token-card"]');

    const tokenCards = await page.$$('[data-testid="token-card"]');
    expect(tokenCards.length).toBeGreaterThan(0);
  });

  test('should display Orbit Station dashboard', async ({ page }) => {
    // ... login flow

    // Select token with Orbit Station
    await page.click('[data-testid="token-card"]:has-text("Treasury Linked")');

    // Wait for station dashboard
    await page.waitForSelector('[data-testid="orbit-dashboard"]');

    expect(await page.textContent('[data-testid="station-name"]')).toBeTruthy();
  });
});
```

---

## Risk Assessment & Mitigation

### Risk 1: Breaking Changes During Migration
**Probability:** HIGH
**Impact:** HIGH
**Mitigation:**
- Implement in phases with separate PRs
- Each phase maintains backward compatibility
- Use feature flags for new architecture
- Comprehensive testing at each phase
- Deploy frequently to catch issues early
- Can roll back any single phase

### Risk 2: Type Migration Errors
**Probability:** MEDIUM
**Impact:** MEDIUM
**Mitigation:**
- Use TypeScript strict mode
- Gradual migration - new code uses new types
- Old code keeps working until refactored
- Comprehensive type tests
- IDE autocomplete catches errors early

### Risk 3: Service Registry Complexity
**Probability:** MEDIUM
**Impact:** MEDIUM
**Mitigation:**
- Start simple - singleton only
- Add features as needed
- Clear documentation and examples
- Standard DI pattern (not novel)
- Easy to debug with logging

### Risk 4: Performance Degradation
**Probability:** LOW
**Impact:** MEDIUM
**Mitigation:**
- Service layer adds minimal overhead
- Actor caching prevents redundant calls
- Redux remains same (already memoized)
- Monitor bundle size
- Lazy load services if needed

### Risk 5: Team Learning Curve
**Probability:** HIGH
**Impact:** LOW
**Mitigation:**
- Comprehensive documentation
- Examples for common patterns
- Code review feedback
- Pair programming sessions
- Gradual adoption (old patterns work during migration)

### Risk 6: Incomplete Migration
**Probability:** MEDIUM
**Impact:** MEDIUM
**Mitigation:**
- Clear roadmap with milestones
- Each phase is independently valuable
- Can pause between phases
- Old architecture still works
- No "big bang" rewrite

---

## Success Metrics

### Code Quality Metrics

**Before:**
- 177 files, ~39,000 lines
- Average file coupling: 12 dependencies
- God objects: 3 (>1000 lines each)
- Test coverage: ~5%
- Type safety: Heavy `any` usage
- Duplicate code: ~15% (estimated)

**After (Target):**
- 200+ files, ~38,000 lines (net -1000 after cleanup)
- Average file coupling: ≤5 dependencies
- God objects: 0 (largest file ~500 lines)
- Test coverage: >80% business logic
- Type safety: Zero `any` in production code
- Duplicate code: <5%

### Architecture Metrics

**Before:**
- Layering violations: Frequent (components calling canisters)
- Service responsibilities: Unclear (19 services, overlapping)
- Domain model: None (primitive obsession)
- Error handling: 4 different patterns
- State management: Mixed (Redux + local, unclear boundaries)

**After (Target):**
- Layering violations: None (enforced by types)
- Service responsibilities: Clear (4 services, distinct boundaries)
- Domain model: Rich (12+ entity classes, value objects)
- Error handling: Unified (Result type, typed errors)
- State management: Clear (Redux for shared, local for UI-only)

### Developer Velocity Metrics

**Before:**
- Feature adds: 10-15 files
- Bug fix investigation: 30-60 minutes (tracing through layers)
- New developer onboarding: 2+ weeks
- Test setup time: 20+ minutes (mocking canisters)

**After (Target):**
- Feature adds: 3-5 files (clear responsibilities)
- Bug fix investigation: 5-10 minutes (clear error traces)
- New developer onboarding: 3-5 days (documentation)
- Test setup time: 2-5 minutes (mock services, not canisters)

---

## Dependencies & Prerequisites

### Required Tools
- Node.js 18+
- npm or yarn
- dfx (IC SDK)
- TypeScript 5+
- Vitest (testing)
- Redux Toolkit
- React Testing Library

### Required Knowledge
- TypeScript advanced types
- React hooks patterns
- Redux Toolkit patterns
- Clean Architecture principles
- Dependency Injection
- SOLID principles
- Domain-Driven Design basics

### Existing Codebase Requirements
- Must maintain backward compatibility during migration
- Must not break existing functionality
- Must deploy to mainnet at each phase
- Must handle DAOPad backend API changes gracefully

---

## Alternative Approaches Considered

### Alternative 1: Keep Current Architecture + Add Types
**Pros:**
- Lower risk
- Faster implementation
- Minimal changes

**Cons:**
- Doesn't fix underlying issues
- Tech debt accumulates
- Types alone don't enforce architecture
- Still have layering violations

**Decision:** Rejected - Band-aid solution, doesn't address root causes

### Alternative 2: Full Rewrite from Scratch
**Pros:**
- Clean slate
- Perfect architecture from start
- No legacy constraints

**Cons:**
- Extremely high risk
- Months of work
- Feature freeze
- Hard to test in isolation
- All-or-nothing deployment

**Decision:** Rejected - Too risky, all-or-nothing approach

### Alternative 3: Gradual Refactoring (Strangler Fig Pattern)
**Pros:**
- Low risk - incremental changes
- Can stop at any phase
- Old and new coexist
- Deploy frequently
- Learn as we go

**Cons:**
- Takes longer overall
- Some temporary duplication
- Need to maintain both patterns briefly

**Decision:** **SELECTED** - Balances risk and progress

### Alternative 4: Micro-Frontends
**Pros:**
- Independent deployment
- Team autonomy
- Technology flexibility

**Cons:**
- Overkill for single team
- Adds complexity
- Performance overhead
- Shared state challenges

**Decision:** Rejected - Too complex for current team size

---

## Open Questions & Decisions Needed

### Question 1: Service Registry vs Context API
**Options:**
- A) Custom ServiceRegistry (DI container)
- B) React Context for service injection
- C) Simple singleton exports

**Recommendation:** A (Custom ServiceRegistry)
- More flexible
- Not tied to React
- Can use in Redux thunks
- Standard DI pattern

### Question 2: Keep Redux or Switch to React Query?
**Options:**
- A) Keep Redux + new services
- B) Migrate to React Query + Zustand
- C) Hybrid approach

**Recommendation:** A (Keep Redux)
- Already invested in Redux
- Works well with clean architecture
- React Query adds new patterns to learn
- Can evaluate React Query later if Redux proves insufficient

### Question 3: Domain Models - Classes vs Interfaces?
**Options:**
- A) Classes with methods (rich domain models)
- B) Interfaces + utility functions (data classes)
- C) Hybrid (entities are classes, value objects are types)

**Recommendation:** A (Classes with methods)
- Encapsulates business logic
- Self-documenting
- Easier to test
- More maintainable

### Question 4: Error Handling - Result Type vs Exceptions?
**Options:**
- A) Result<T, E> type (Rust-style)
- B) Exceptions (standard JS)
- C) Both (exceptions internally, Result at boundaries)

**Recommendation:** A (Result type)
- Forces error handling
- Type-safe
- No uncaught exceptions
- Explicit in function signatures

---

## Critical Implementation Notes

### DAOPad-Specific Requirements

#### Declaration Sync (CRITICAL BUG FIX)
**Frontend uses different declarations path:**
```bash
# After backend deploy, MUST sync:
cp -r src/declarations/daopad_backend/* src/daopad/daopad_frontend/src/declarations/daopad_backend/
# Without this, frontend gets "is not a function" errors!
```

#### Testing with Orbit Station
**ALWAYS test Orbit APIs before implementing:**
```bash
# Use test station with admin access
export TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"
dfx canister --network ic call $TEST_STATION <method> '(args)'
# Read the actual return structure
```

#### No Backwards Compatibility Needed
Per CLAUDE.md: "Don't worry about Backwards Compatibility... we can't break anything."
- Product isn't live
- No data in stable storage
- Liberal about breaking changes
- Goal: Remove all bloat and tech debt

#### Deploy to Mainnet Always
```bash
./deploy.sh --network ic  # Deploy everything

# Or separately:
./deploy.sh --network ic --backend-only
./deploy.sh --network ic --frontend-only
```

#### Minimal Storage Principle
"The ONLY thing we store is the token_canister_id:orbit_station_id mapping."
- Everything else queried dynamically
- No complex stable storage migrations
- Optimize for maintainability, not speed
- Can change what we display without backend changes

### Architecture Principles to Enforce

1. **Dependency Inversion:** High-level modules (components) don't depend on low-level modules (services); both depend on abstractions (interfaces)

2. **No Direct Canister Calls from Components:** Always go through service layer

3. **Redux for Shared State Only:** UI-only state (dialog open/closed, form inputs) stays in component local state

4. **Domain Models are Immutable:** Use factory methods and update methods that return new instances

5. **Services are Stateless:** All state in Redux or component local state

6. **Error Handling at Boundaries:** Services return Result types, components display errors

7. **Type Safety Everywhere:** No `any`, use `unknown` if truly dynamic, then type-guard

8. **Test Pyramid:** More unit tests, fewer integration tests, fewest E2E tests

---

## Checkpoint Strategy

This refactoring can be implemented in **6 PRs** (one per phase):

**PR #1: Service Layer Foundation**
- Service interfaces and base classes
- CanisterService implementation
- ServiceRegistry (DI container)
- Error type hierarchy
- Unit tests for service layer

**PR #2: Domain Models & Types**
- Value objects (Principal, VotingPower, etc.)
- Entity classes (Token, OrbitStation, Request, Proposal)
- Validators and transformers
- Unit tests for domain layer

**PR #3: Service Implementations**
- OrbitStationService implementation
- DAOPadBackendService implementation
- KongLockerService implementation
- Adapters for Candid and Orbit responses
- Integration tests against mainnet

**PR #4: Redux Migration**
- Update Redux slices to use services
- Replace old service calls with service registry
- Update selectors for new types
- Remove old service files
- Update Redux tests

**PR #5: Component Refactoring**
- Create custom hooks (useToken, useOrbitStation, etc.)
- Refactor components to pure presentation
- Create feature-specific components
- Update component tests
- Verify UI works identically

**PR #6: Cleanup & Documentation**
- Remove dead code
- Consolidate utilities
- Add JSDoc comments
- Write architecture documentation
- Final code review and deployment

Each PR is independently valuable and can be deployed to mainnet.

---

## 🚀 Handoff to Implementing Agent

**Plan Complete:** DAOPad Frontend Architecture Refactoring

**Location:** `/home/theseus/alexandria/daopad-architecture/src/daopad`
**Branch:** `feature/architecture-refactor`
**Document:** `ARCHITECTURE_REFACTOR_PLAN.md` (committed to feature branch)

**Estimated:** 50-60 hours over 6 PRs, HIGH risk

**Handoff instructions for implementing agent:**

```bash
# Navigate to the worktree where the plan lives
cd /home/theseus/alexandria/daopad-architecture/src/daopad

# Read the plan
cat ARCHITECTURE_REFACTOR_PLAN.md

# Then pursue it
# (The plan contains the full orchestrator prompt)
```

**Or use this prompt:**

```
cd /home/theseus/alexandria/daopad-architecture/src/daopad && pursue ARCHITECTURE_REFACTOR_PLAN.md
```

**CRITICAL:**
- Plan is IN the worktree (not main repo)
- Plan is already committed to feature branch
- Implementing agent works in SAME worktree
- Plan and implementation stay together on feature branch
- Each phase is a separate PR - don't combine
- Wait for PR approval before starting next phase
- Deploy to mainnet after each phase

---

## Final Checklist

- [x] **Current state analysis** - Analyzed all 177 files, identified architectural violations
- [x] **File tree** - Before (current mess) and after (clean layers) documented
- [x] **Implementation details** - Pseudocode for services, domain models, Redux, components
- [x] **Type discovery** - Commands to test Orbit Station APIs included
- [x] **Testing strategy** - Unit, integration, component tests defined
- [x] **Declaration sync** - Critical for frontend to see backend changes
- [x] **Scope estimate** - 6 phases, ~50-60 hours, 6 PRs
- [x] **Embedded orchestrator** - Full isolation check and execution prompt at top
- [x] **Isolation enforcement** - Bash script that exits if not in worktree
- [x] **Critical reminders** - Deploy to mainnet, no local testing, test everything
- [x] **Success criteria** - Metrics for code quality, architecture, developer velocity

---

**🛑 PLANNING AGENT - YOUR JOB IS DONE**

DO NOT:
- ❌ Write production code
- ❌ Create PRs
- ❌ Deploy to mainnet
- ❌ Implement the orchestrator workflow
- ❌ Start implementing even if user says "looks good"

YOUR ONLY JOB:
- ✅ Plan exhaustively (DONE)
- ✅ Document completely (DONE)
- ✅ Return handoff command (BELOW)

**🛑 END CONVERSATION HERE 🛑**

---
