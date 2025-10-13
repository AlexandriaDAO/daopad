# Phase 1: Service Layer Foundation

**Status:** ✅ Complete (Updated after PR review)
**Date:** 2025-10-13
**PR:** #27

## Overview

This phase establishes a clean service layer architecture with proper dependency injection, error handling, and lifecycle management. It provides the foundation for all future service implementations and ensures consistent patterns across the application.

## Updates (Post-Review)

Based on comprehensive PR review feedback, the following improvements were made:

### ✅ Fixed Issues
1. **Removed broken call()/query() methods** from CanisterService
   - These methods had placeholder implementations that wouldn't work
   - The proper pattern is to use `createActor()` and call methods on the actor
   - Simplified interface to only expose working functionality

2. **Added resetServices() function**
   - Allows proper re-initialization when identity changes
   - Handles disposal and re-registration of all services
   - Addresses the identity update use case

3. **Added updateIdentity() method** to CanisterService
   - Allows updating identity without full service reset
   - Clears actor cache and recreates HTTP agent
   - Useful for login/logout scenarios

4. **Added integration tests**
   - Tests real actor creation with IC Agent
   - Verifies actor caching works correctly
   - Tests lifecycle and identity management

### 📝 Documentation Updates
- Clarified CanisterService API - only `createActor()` is production-ready
- Added usage examples with proper actor patterns
- Documented identity management approach
- Updated all code examples to reflect actual API

## Architecture

```
src/
├── lib/
│   ├── errors/                    # Error type hierarchy
│   │   ├── BaseError.ts           # Abstract base for all errors
│   │   ├── CanisterError.ts       # IC canister errors
│   │   ├── OrbitError.ts          # Orbit Station errors
│   │   ├── ValidationError.ts     # Validation failures
│   │   ├── BackendError.ts        # Backend errors
│   │   └── index.ts               # Exports
│   ├── types/
│   │   └── Result.ts              # Result<T, E> type with utilities
│   ├── ServiceRegistry.ts         # Dependency injection container
│   ├── setupServices.ts           # Service initialization
│   └── index.ts                   # Main exports
│
├── services/
│   ├── interfaces/                # Service contracts
│   │   ├── IService.ts            # Base interface
│   │   ├── ICanisterService.ts    # IC operations interface
│   │   └── index.ts
│   ├── base/
│   │   └── BaseService.ts         # Abstract service implementation
│   └── implementations/
│       ├── CanisterService.ts     # IC Agent wrapper
│       └── index.ts
```

## Key Components

### 1. Error Type Hierarchy

**BaseError** - Abstract base class for all application errors
- Provides structured error information
- Supports error chaining with `cause`
- Includes context for debugging
- Defines `getUserMessage()` for display

**Specific Error Types:**
- `CanisterError` - IC canister communication errors
- `OrbitError` - Orbit Station specific errors
- `ValidationError` - Input validation failures
- `BackendError` - DAOPad backend errors

Each error type:
- Maps technical errors to user-friendly messages
- Includes factory methods for common patterns
- Serializes to JSON for logging

### 2. Result Type

Railway-oriented programming pattern for error handling:

```typescript
type Result<T, E extends Error> =
  | { success: true; data: T }
  | { success: false; error: E };
```

**Utilities:**
- `Result.ok(data)` - Create success
- `Result.err(error)` - Create failure
- `Result.map()` - Transform success value
- `Result.andThen()` - Chain operations
- `Result.fromPromise()` - Convert promises
- `Result.all()` - Combine multiple results

**Benefits:**
- Forces explicit error handling
- Type-safe - compiler ensures checks
- Composable - chain operations cleanly
- No try/catch noise

### 3. Service Interfaces

**IService** - Base interface all services implement:
```typescript
interface IService {
  readonly name: string;
  initialize(): Promise<void>;
  dispose(): Promise<void>;
  isInitialized(): boolean;
}
```

**ICanisterService** - IC canister operations:
```typescript
interface ICanisterService extends IService {
  createActor<T>(canisterId: string, idlFactory): Promise<ActorSubclass<T>>;
  call<T>(method, args, canisterId): Promise<Result<T, CanisterError>>;
  query<T>(method, args, canisterId): Promise<Result<T, CanisterError>>;
  clearActorCache(): void;
}
```

### 4. BaseService

Abstract class providing common lifecycle management:

**Features:**
- Idempotent `initialize()` and `dispose()`
- Template methods for subclass customization
- Identity management
- Initialization state tracking
- Guard method `ensureInitialized()`

**Usage Pattern:**
```typescript
class MyService extends BaseService {
  readonly name = 'MyService';

  protected async onInitialize() {
    // Setup resources
  }

  protected async onDispose() {
    // Cleanup resources
  }

  async doSomething() {
    this.ensureInitialized(); // Throws if not ready
    // ... service logic
  }
}
```

### 5. CanisterService

Concrete implementation of `ICanisterService`:

**Features:**
- HTTP Agent management
- Actor creation and caching
- Environment-aware (local vs mainnet)
- Automatic root key fetching (local only)
- Structured error handling

**Caching Strategy:**
- Actors cached by canister ID
- Cache cleared on identity change
- Improves performance for repeated calls

### 6. ServiceRegistry

Dependency injection container:

**Features:**
- Singleton and transient service support
- Lazy initialization
- Automatic disposal
- Dependency resolution

**Usage:**
```typescript
// Setup (at app startup)
serviceRegistry.register(
  'CanisterService',
  () => new CanisterService(identityProvider),
  true // singleton
);

// Usage (anywhere in app)
const canisterService = serviceRegistry.get<ICanisterService>('CanisterService');
await canisterService.initialize();
const actor = await canisterService.createActor(id, factory);
```

## Testing

### Test Coverage

- **Result type:** 100% coverage
  - All utility methods
  - Success and error paths
  - Edge cases (empty arrays, errors)

- **CanisterError:** 100% coverage
  - User message mapping
  - Factory methods
  - Serialization

- **ServiceRegistry:** 100% coverage
  - Registration (singleton/transient)
  - Lifecycle management
  - Error handling

- **BaseService:** 100% coverage
  - Initialization flow
  - Disposal flow
  - Idempotency

### Running Tests

```bash
# Run all tests
npm run test

# Run with coverage
npm run test -- --coverage

# Watch mode
npm run test -- --watch
```

## Usage Patterns

### 1. Service Setup (App Initialization)

```typescript
// In main.tsx or App.tsx
import { setupServices, initializeServices } from '@/lib';

// Setup services
setupServices(() => authClient.getIdentity());

// After authentication
await initializeServices();
```

### 2. Using Services

```typescript
import { serviceRegistry } from '@/lib';
import { ICanisterService } from '@/services/interfaces';
import { idlFactory } from '@/declarations/my_canister';

async function callCanister() {
  const canisterService = serviceRegistry.get<ICanisterService>('CanisterService');

  // Create actor for the canister
  const actor = await canisterService.createActor<MyCanisterActor>(
    'rrkah-fqaaa-aaaaa-aaaaq-cai',
    idlFactory
  );

  // Call methods directly on the actor
  try {
    const result = await actor.my_method(arg1, arg2);
    console.log('Success:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### 3. Identity Management

```typescript
import { resetServices } from '@/lib';
import { ICanisterService } from '@/services/interfaces';

// When user logs in/out
async function handleLogin(newIdentity) {
  // Option 1: Reset all services
  await resetServices(() => newIdentity);

  // Option 2: Update just CanisterService
  const canisterService = serviceRegistry.get<ICanisterService>('CanisterService');
  await canisterService.updateIdentity(newIdentity);
}

// When user logs out
async function handleLogout() {
  await resetServices(() => null);
}
```

### 4. Error Handling with Try/Catch

```typescript
async function callCanister() {
  try {
    const actor = await canisterService.createActor(...);
    const result = await actor.my_method();
    console.log('Success:', result);
  } catch (error) {
    if (error instanceof CanisterError) {
      // Show user-friendly message
      showError(error.getUserMessage());

      // Log technical details
      console.error(error.toJSON());
    } else {
      // Unknown error
      showError('An unexpected error occurred');
    }
  }
}
```

## Benefits

### 1. Separation of Concerns
- Services handle external communication
- Errors handle failure cases
- Registry manages dependencies
- Clear boundaries between layers

### 2. Testability
- Services implement interfaces (mockable)
- Dependency injection enables substitution
- Result type makes tests explicit
- No hidden side effects

### 3. Type Safety
- Strict TypeScript throughout
- No `any` types
- Compiler enforces contracts
- Auto-completion in IDEs

### 4. Consistency
- All services follow same patterns
- Uniform error handling
- Predictable lifecycle
- Standard initialization

### 5. Maintainability
- Each file has single responsibility
- Clear documentation
- Comprehensive tests
- Easy to extend

## Migration Path

This phase is **non-breaking**. Existing code continues to work.

**Phase 2** will add domain models and types.
**Phase 3** will implement concrete services (Orbit, Backend, Kong Locker).
**Phase 4** will migrate Redux to use new services.
**Phase 5** will refactor components to use hooks.
**Phase 6** will remove old service files.

## Next Steps

After merging Phase 1:

1. **Phase 2:** Create domain model types
   - `Token`, `OrbitStation`, `Proposal` entities
   - Value objects: `Principal`, `VotingPower`, `Balance`
   - Validators and transformers

2. **Phase 3:** Implement concrete services
   - `OrbitStationService` with typed methods
   - `DAOPadBackendService` with domain types
   - `KongLockerService` for voting power
   - Adapters for Candid parsing

## Notes

- All services are lazy-initialized (created on first use)
- ServiceRegistry is a singleton - import and use anywhere
- Always call `initialize()` before using services
- Call `dispose()` on logout to clean up
- Use Result type for all operations that can fail
- Map technical errors to user messages with error types

## Files Added

**Infrastructure (9 files):**
- `lib/errors/BaseError.ts`
- `lib/errors/CanisterError.ts`
- `lib/errors/OrbitError.ts`
- `lib/errors/ValidationError.ts`
- `lib/errors/BackendError.ts`
- `lib/errors/index.ts`
- `lib/types/Result.ts`
- `lib/ServiceRegistry.ts`
- `lib/setupServices.ts`

**Services (5 files):**
- `services/interfaces/IService.ts`
- `services/interfaces/ICanisterService.ts`
- `services/interfaces/index.ts`
- `services/base/BaseService.ts`
- `services/implementations/CanisterService.ts`

**Tests (3 files):**
- `lib/types/__tests__/Result.test.ts`
- `lib/errors/__tests__/CanisterError.test.ts`
- `lib/__tests__/ServiceRegistry.test.ts`
- `services/base/__tests__/BaseService.test.ts`

**Total:** 17 new files, ~2,000 lines of code
