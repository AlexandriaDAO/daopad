# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-service-consolidation/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-service-consolidation/src/daopad`
2. **Implement refactoring** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes only (no backend changes in this refactor):
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Refactor]: Service Layer Consolidation - 60% Code Reduction"
   git push -u origin refactor/service-consolidation
   gh pr create --title "[Refactor]: Service Layer Consolidation - 60% Code Reduction" --body "Implements SERVICE-CONSOLIDATION-PLAN.md - Reduces service code from 6,000 to 2,400 lines"
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

**Branch:** `refactor/service-consolidation`
**Worktree:** `/home/theseus/alexandria/daopad-service-consolidation/src/daopad`

---

# Implementation Plan: Service Layer Consolidation

## 📊 Expected Reduction Metrics

### Current State: 6,000 lines across fragmented services
- **Old Monolithic Services**: 3,641 lines
  - `daopadBackend.ts`: 1,234 lines (47 methods mixed)
  - `canisterService.ts`: 831 lines (20 canister operations)
  - `orbitStation.ts`: 440 lines (direct Orbit calls)
  - `addressBookService.ts`: 320 lines
  - Others: 816 lines

- **New Domain Services**: 2,351 lines (well-organized, to be enhanced)

### Target State: 2,400 lines (-60% reduction)
- **Domain Services Only**: ~2,400 lines
  - All functionality preserved
  - Proper type interfaces maintained
  - Single source of truth per domain
  - Zero duplicate actor creation

### Deleted Files (3,600+ lines removed):
1. `services/daopadBackend.ts` - DELETED
2. `services/canisterService.ts` - DELETED
3. `services/orbitStation.ts` - DELETED
4. `services/addressBookService.ts` - DELETED
5. `services/OrbitServiceBase.ts` - DELETED
6. `services/kongLockerService.ts` - DELETED (fully migrated)
7. `services/orbitStationService.ts` - DELETED

## 📁 Current Service Architecture

```
services/
├── backend/                    # KEEP & ENHANCE (2,351 lines)
│   ├── base/
│   │   └── BackendServiceBase.ts
│   ├── kong-locker/
│   │   └── KongLockerService.ts
│   ├── orbit/
│   │   ├── canisters/
│   │   │   └── OrbitCanisterService.ts
│   │   ├── governance/
│   │   │   └── OrbitGovernanceService.ts
│   │   ├── security/
│   │   │   └── OrbitSecurityService.ts
│   │   ├── users/
│   │   │   └── OrbitUserService.ts
│   │   ├── OrbitAccountsService.ts
│   │   └── OrbitRequestsService.ts
│   ├── proposals/
│   │   └── ProposalService.ts
│   ├── tokens/
│   │   └── TokenService.ts
│   ├── utility/
│   │   └── UtilityService.ts
│   └── OrbitAgreementService.ts
├── daopadBackend.ts            # DELETE (1,234 lines)
├── canisterService.ts          # DELETE (831 lines)
├── orbitStation.ts             # DELETE (440 lines)
├── addressBookService.ts       # DELETE (320 lines)
├── OrbitServiceBase.ts         # DELETE (305 lines)
├── kongLockerService.ts        # DELETE (232 lines)
├── balanceService.ts           # REFACTOR (117 lines)
├── orbitStationService.ts      # DELETE (90 lines)
└── auth.ts                     # KEEP AS-IS (72 lines)
```

## 🔧 Method Migration Mapping

### From `daopadBackend.ts` → Domain Services

#### To `KongLockerService` (5 methods):
- `registerWithKongLocker()` → Already exists
- `getMyKongLockerCanister()` → Already exists
- `unregisterKongLocker()` → Migrate
- `listAllKongLockerRegistrations()` → Migrate
- `getKongLockerFactoryPrincipal()` → Migrate

#### To `ProposalService` (7 methods):
- `proposeOrbitStationLink()` → Already exists
- `voteOnOrbitProposal()` → Already exists
- `getActiveProposalForToken()` → Already exists
- `listActiveProposals()` → Already exists
- `cleanupExpiredProposals()` → Migrate
- `getOrbitRequestProposal()` → Migrate
- `listOrbitRequestProposals()` → Migrate

#### To `OrbitAccountsService` (5 methods):
- `listOrbitAccounts()` → Already exists
- `fetchOrbitAccountBalances()` → Already exists
- `getAccountAssets()` → Migrate
- `createTreasuryAccount()` → Migrate
- `validateAccountName()` → Migrate

#### To `OrbitRequestsService` (8 methods):
- `listOrbitRequests()` → Already exists
- `getUserPendingRequests()` → Migrate
- `voteOnOrbitRequest()` → Migrate
- `createTransferRequest()` → Migrate
- `getTransferRequests()` → Migrate
- `approveTransferRequest()` → Migrate
- `rejectTransferRequest()` → Migrate
- `createTreasuryTransferProposal()` → Migrate

#### To `TokenService` (3 methods):
- `getOrbitStationForToken()` → Already exists
- `getAllOrbitStations()` → Already exists
- `getOrbitStationId()` → Migrate

#### To `OrbitSecurityService` (4 methods):
- `getAdminCount()` → Migrate
- `performSecurityCheck()` → Already exists
- `listPermissions()` → Migrate
- `requestPermissionChange()` → Migrate

#### To `UtilityService` (3 methods):
- `getBackendPrincipal()` → Already exists
- `healthCheck()` → Already exists
- `testBackendIntegration()` → Migrate

#### To New `OrbitAddressBookService` (Address book from addressBookService.ts):
- All methods from `addressBookService.ts`

### From `canisterService.ts` → `OrbitCanisterService` (20 methods)
All 20 methods migrate to `OrbitCanisterService`:
- `listCanisters()`, `getCanisterDetails()`, `getCanisterStatus()`
- `createCanister()`, `importCanister()`, `fundCanister()`
- `monitorCanister()`, `takeSnapshot()`, `restoreSnapshot()`
- `upgradeCanister()`, `callCanisterMethod()`, etc.

## 📝 Implementation Steps (PSEUDOCODE)

### Step 1: Enhance Domain Services

#### `backend/kong-locker/KongLockerService.ts` (ADD 3 methods)
```typescript
// PSEUDOCODE
class KongLockerService extends BackendServiceBase {
  // Existing methods stay...

  async unregisterKongLocker() {
    const actor = await this.getActor();
    const result = await actor.unregister_kong_locker();
    return this.wrapResult(result);
  }

  async listAllKongLockerRegistrations() {
    const actor = await this.getActor();
    const result = await actor.list_all_kong_locker_registrations();
    return this.wrapResult(result);
  }

  async getKongLockerFactoryPrincipal() {
    const actor = await this.getActor();
    const result = await actor.get_kong_locker_factory_principal();
    return this.wrapResult(result);
  }
}
```

#### `backend/proposals/ProposalService.ts` (ADD 3 methods)
```typescript
// PSEUDOCODE
class ProposalService extends BackendServiceBase {
  // Existing methods stay...

  async cleanupExpiredProposals() {
    const actor = await this.getActor();
    const result = await actor.cleanup_expired_proposals();
    return this.wrapResult(result);
  }

  async getOrbitRequestProposal(tokenId, requestId) {
    const actor = await this.getActor();
    const tokenPrincipal = this.toPrincipal(tokenId);
    const result = await actor.get_orbit_request_proposal(tokenPrincipal, requestId);
    return this.wrapResult(result);
  }

  async listOrbitRequestProposals(tokenId) {
    const actor = await this.getActor();
    const tokenPrincipal = this.toPrincipal(tokenId);
    const result = await actor.list_orbit_request_proposals(tokenPrincipal);
    return this.wrapResult(result);
  }
}
```

#### `backend/orbit/OrbitCanisterService.ts` (MERGE all canisterService.ts)
```typescript
// PSEUDOCODE - Merge all 20 methods from canisterService.ts
class OrbitCanisterService extends BackendServiceBase {
  // Keep existing listCanisters() and getCanister()

  // Add all 18 remaining methods from canisterService.ts:
  async getCanisterStatus(canisterId) {
    // Implementation from canisterService.ts
  }

  async createCanister(tokenId, config) {
    // Implementation from canisterService.ts
  }

  // ... all other methods
}
```

#### Create `backend/orbit/address-book/OrbitAddressBookService.ts` (NEW)
```typescript
// PSEUDOCODE
import { BackendServiceBase } from '../../base/BackendServiceBase';
import { parseOrbitResult } from '../../utils/errorParsers';

export class OrbitAddressBookService extends BackendServiceBase {
  async listAddressBookEntries(tokenId, filters = {}) {
    const actor = await this.getActor();
    const tokenPrincipal = this.toPrincipal(tokenId);
    const result = await actor.list_address_book_entries(tokenPrincipal, filters);
    return parseOrbitResult(result);
  }

  async addAddressBookEntry(tokenId, entry) {
    const actor = await this.getActor();
    const tokenPrincipal = this.toPrincipal(tokenId);
    const result = await actor.add_address_book_entry(tokenPrincipal, entry);
    return parseOrbitResult(result);
  }

  async updateAddressBookEntry(tokenId, entryId, updates) {
    const actor = await this.getActor();
    const tokenPrincipal = this.toPrincipal(tokenId);
    const result = await actor.update_address_book_entry(tokenPrincipal, entryId, updates);
    return parseOrbitResult(result);
  }

  async deleteAddressBookEntry(tokenId, entryId) {
    const actor = await this.getActor();
    const tokenPrincipal = this.toPrincipal(tokenId);
    const result = await actor.delete_address_book_entry(tokenPrincipal, entryId);
    return parseOrbitResult(result);
  }
}

export const getOrbitAddressBookService = (identity) => {
  return new OrbitAddressBookService(identity);
};
```

### Step 2: Update All Component Imports

#### Find and replace patterns:
```javascript
// PSEUDOCODE - Pattern replacements

// OLD:
import { DAOPadBackendService } from '../services/daopadBackend';
const backend = new DAOPadBackendService(identity);
await backend.registerWithKongLocker(principal);

// NEW:
import { getKongLockerService } from '../services/backend';
const service = getKongLockerService(identity);
await service.registerWithKongLocker(principal);

// OLD:
import { canisterService } from '../services/canisterService';
await canisterService.listCanisters(tokenId);

// NEW:
import { getOrbitCanisterService } from '../services/backend';
const service = getOrbitCanisterService(identity);
await service.listCanisters(tokenId);
```

### Step 3: Update Component Files (20+ files)

Components requiring updates:
1. `components/TokenDashboard.tsx` - 6 instances of DAOPadBackendService
2. `features/orbit/orbitSlice.ts` - 5 instances
3. `hooks/useVoting.ts` - 2 instances
4. `hooks/useProposal.ts` - 2 instances
5. `pages/PermissionsPage.tsx` - 1 instance
6. `routes/AppRoute.tsx` - 1 instance
7. `features/dao/daoSlice.ts` - 1 instance
8. `components/orbit/UnifiedRequests.tsx`
9. `components/DAOSettings.tsx`
10. `components/orbit/ExternalCanistersPage.tsx`
11. `components/canisters/CanistersTab.tsx`
12. `components/address-book/AddressBookDialog.tsx`
13. `pages/AddressBookPage.tsx`
14. All other components using services

### Step 4: Create Unified Service Index

#### `services/index.ts` (NEW)
```typescript
// PSEUDOCODE
// Single entry point for all services
export * from './backend';
export { auth } from './auth';

// Re-export all domain service getters
export {
  getKongLockerService,
  getProposalService,
  getOrbitRequestsService,
  getOrbitAccountsService,
  getTokenService,
  getUtilityService,
  getOrbitSecurityService,
  getOrbitCanisterService,
  getOrbitGovernanceService,
  getOrbitUserService,
  getOrbitAddressBookService,
  getOrbitAgreementService
} from './backend';
```

### Step 5: Delete Old Service Files

```bash
# PSEUDOCODE - Files to delete
rm services/daopadBackend.ts
rm services/canisterService.ts
rm services/orbitStation.ts
rm services/addressBookService.ts
rm services/OrbitServiceBase.ts
rm services/kongLockerService.ts
rm services/orbitStationService.ts

# Keep only:
# - services/backend/ (entire directory)
# - services/auth.ts
# - services/balanceService.ts (refactored)
# - services/orbitStation.did.ts (generated, keep)
# - services/utils/ (keep utilities)
# - services/orbit/ (if any non-duplicate utilities)
```

## 🧪 Testing Requirements

### Build Tests:
```bash
# Frontend build must succeed
npm run build

# No TypeScript errors
npm run type-check

# Deploy frontend only (no backend changes)
./deploy.sh --network ic --frontend-only
```

### Functionality Tests:
1. Kong Locker registration/unregistration
2. Proposal creation and voting
3. Treasury operations
4. Canister management
5. Address book CRUD
6. Security dashboard
7. Permissions management

### Type Safety Verification:
```typescript
// All service methods must maintain proper typing
// Example verification:
const service = getOrbitCanisterService(identity);
const result: ServiceResponse<Canister[]> = await service.listCanisters(tokenId);
// Result must be properly typed
```

## ✅ Success Criteria

1. **Code Reduction**: 3,600+ lines removed (60% reduction)
2. **No Functionality Loss**: All 47 DAOPadBackendService methods migrated
3. **Type Safety**: All TypeScript types preserved
4. **Single Source**: Each domain has one service class
5. **Clean Imports**: No more monolithic service imports
6. **Build Success**: Frontend builds and deploys without errors
7. **Zero Duplication**: No duplicate actor creation or error handling

## 🚫 Common Pitfalls to Avoid

1. **Don't forget identity propagation** - All services need identity parameter
2. **Maintain error handling** - Use parseOrbitResult consistently
3. **Keep Principal conversion** - Use toPrincipal() helper
4. **Test each migration** - Verify functionality after each service update
5. **Update all imports** - Use grep to find all usage locations

## 📊 Final Metrics

- **Files Deleted**: 7 files
- **Lines Removed**: ~3,600 lines
- **New Code Added**: ~200 lines (method migrations)
- **Net Reduction**: ~3,400 lines (57% reduction)
- **Import Statements Updated**: 20+ files
- **Services Consolidated**: 7 → 1 architecture

---

**Remember**: This is a REFACTORING task. Focus on DELETION and CONSOLIDATION, not addition. The goal is negative LOC with preserved functionality and improved maintainability.