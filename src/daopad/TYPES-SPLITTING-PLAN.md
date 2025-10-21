# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-types-refactor/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-types-refactor/src/daopad`
2. **Implement refactoring** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes only (TypeScript types refactoring):
     ```bash
     cd daopad_frontend
     npm run type-check
     npm run build
     cd ..
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Refactor]: Split monolithic types into domain modules"
   git push -u origin refactor/orbit-types-splitting
   gh pr create --title "[Refactor]: Split monolithic types into domain modules" --body "Implements TYPES-SPLITTING-PLAN.md - Splits 56 types from single file into 8 domain modules"
   ```
5. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view [NUM] --json comments`
     - Count P0 issues
     - IF P0 > 0: Fix immediately, commit, push, sleep 300s, continue
     - IF P0 = 0: Report success, EXIT
   - After 5 iterations: Escalate to human

## CRITICAL RULES
- ❌ NO questions ("should I?", "want me to?", "is it done?")
- ❌ NO skipping PR creation - it's MANDATORY
- ❌ NO stopping after implementation - create PR immediately
- ✅ After sleep: IMMEDIATELY continue (no pause)
- ✅ ONLY stop at: approved, max iterations, or error

**Branch:** `refactor/orbit-types-splitting`
**Worktree:** `/home/theseus/alexandria/daopad-types-refactor/src/daopad`

---

# Implementation Plan: Types Domain Splitting

## 📊 Metrics

### Current State:
- **Single file**: `types/index.ts` - 443 lines
- **Mixed concerns**: 56 exported types/interfaces all in one file
- **Import complexity**: Every import gets ALL types

### Target State:
- **8 domain modules**: Each ~50-80 lines
- **Clear separation**: One domain per file
- **Selective imports**: Import only what you need
- **Index barrel export**: Clean re-exports

## 📁 New Structure

```
types/
├── index.ts              # Barrel exports (20 lines)
├── balance.ts            # Existing (keep as-is)
├── global.d.ts           # Existing (keep as-is)
├── token.types.ts        # Token & metadata types (40 lines)
├── proposal.types.ts     # Proposal & voting types (60 lines)
├── orbit.types.ts        # Orbit station core types (50 lines)
├── request.types.ts      # Request & approval types (80 lines)
├── canister.types.ts     # Canister management types (70 lines)
├── user.types.ts         # User & permission types (60 lines)
├── account.types.ts      # Account & treasury types (50 lines)
└── common.types.ts       # Shared utility types (30 lines)
```

## 🔧 Type Distribution

### `token.types.ts`
```typescript
// PSEUDOCODE - Move from index.ts
export interface Token { ... }
export interface TokenMetadata { ... }
```

### `proposal.types.ts`
```typescript
// PSEUDOCODE - Move from index.ts
export interface Proposal { ... }
export type ProposalStatus = ...
export interface VotingPower { ... }
export interface ServiceResponse<T> { ... }
```

### `orbit.types.ts`
```typescript
// PSEUDOCODE - Move from index.ts
export interface OrbitStation { ... }
export interface Balance { ... }
export type ResourceSpecifier = ...
export type AuthScope = ...
```

### `request.types.ts`
```typescript
// PSEUDOCODE - Move from index.ts
export interface OrbitRequest { ... }
export interface RequestApproval { ... }
export type RequestStatus = ...
export type RequestOperation = ...
export interface TransferOperation { ... }
export interface AddUserOperation { ... }
export interface EditUserOperation { ... }
// ... all operation types
```

### `canister.types.ts`
```typescript
// PSEUDOCODE - Move from index.ts
export interface CanisterMethod { ... }
export type CanisterKind = ...
export type SubnetSelection = ...
export interface CreateExternalCanisterOperation { ... }
export interface CallExternalCanisterOperation { ... }
export interface ChangeExternalCanisterOperation { ... }
export type CanisterInstallMode = ...
export interface Canister { ... }
export interface ExternalCanister { ... }
```

### `user.types.ts`
```typescript
// PSEUDOCODE - Move from index.ts
export interface User { ... }
export interface UserGroup { ... }
export type UserSpecifier = ...
export interface EditPermissionOperation { ... }
export type Resource = ...
export interface Permission { ... }
export interface RequestPolicy { ... }
export type RequestPolicyRule = ...
export interface AddRequestPolicyOperation { ... }
export interface EditRequestPolicyOperation { ... }
export interface RemoveRequestPolicyOperation { ... }
```

### `account.types.ts`
```typescript
// PSEUDOCODE - Move from index.ts
export interface Account { ... }
export interface Asset { ... }
export type AccountPermission = ...
export interface AddAccountOperation { ... }
export interface EditAccountOperation { ... }
export interface AddressBookEntry { ... }
export interface AddAddressBookEntryOperation { ... }
export type MetadataChange = ...
export interface EditAddressBookEntryOperation { ... }
export interface RemoveAddressBookEntryOperation { ... }
```

### `common.types.ts`
```typescript
// PSEUDOCODE - Move from index.ts
export type Result<T, E> = { Ok: T } | { Err: E };
export interface PaginationInput { ... }
export interface Pagination { ... }
export type ListRequestsOperationType = ...
export interface PrivilegesResult { ... }
```

### `index.ts` (Barrel exports)
```typescript
// PSEUDOCODE - New clean barrel file
export * from './balance';
export * from './token.types';
export * from './proposal.types';
export * from './orbit.types';
export * from './request.types';
export * from './canister.types';
export * from './user.types';
export * from './account.types';
export * from './common.types';
```

## 📝 Implementation Steps

### Step 1: Create New Type Files
1. Create 8 new `.types.ts` files in the types directory
2. Move related types from `index.ts` to their domain files
3. Add proper imports where types reference each other

### Step 2: Update Original index.ts
1. Remove all moved type definitions
2. Replace with barrel exports
3. Keep backward compatibility (all exports still available)

### Step 3: Update Import Statements (7 files)
Files that need import updates:
1. `services/backend/base/BackendServiceBase.ts`
2. `services/daopadBackend.ts`
3. `features/token/tokenSlice.ts`
4. `components/DaoProposals.tsx`
5. `components/ProposalCard.tsx`
6. `components/ProposalDetailsModal.tsx`
7. `components/TokenTabs.tsx`

Change from:
```typescript
// OLD
import { Token, Proposal, OrbitStation } from '../types';
```

To (optional - for optimization):
```typescript
// NEW - More specific imports
import { Token } from '../types/token.types';
import { Proposal } from '../types/proposal.types';
import { OrbitStation } from '../types/orbit.types';
```

Or keep as-is (barrel exports maintain compatibility):
```typescript
// ALSO WORKS - No change needed
import { Token, Proposal, OrbitStation } from '../types';
```

## 🧪 Testing Requirements

### Type Checking:
```bash
cd daopad_frontend
npm run type-check  # Must pass with no errors
```

### Build Test:
```bash
npm run build  # Must succeed
```

### Import Verification:
- All existing imports must continue working
- No TypeScript errors in any component
- IntelliSense must work for all types

## ✅ Success Criteria

1. **Zero functionality changes** - Pure refactoring
2. **All types preserved** - 56 types still exported
3. **Backward compatible** - Existing imports work
4. **Clean separation** - Each file has single domain
5. **Build success** - TypeScript and build pass
6. **Better maintainability** - Easy to find types

## 🚫 Common Pitfalls

1. **Circular dependencies** - Use `import type` when needed
2. **Missing exports** - Verify all 56 types still exported
3. **Import paths** - Use relative paths correctly
4. **Type references** - Some types reference others, handle imports

## 📊 Final Metrics

- **Files created**: 8 new domain type files
- **Lines redistributed**: 443 lines → 8 files (~50-80 each)
- **Import sites updated**: 0-7 (optional optimization)
- **Type safety**: 100% preserved
- **Bundle size**: No change (types compile away)

---

**Note**: This is a PURE REFACTORING. No logic changes, no new types, no deleted types. Just reorganization for better maintainability and developer experience.