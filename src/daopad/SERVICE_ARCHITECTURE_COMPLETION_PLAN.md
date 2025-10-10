# Service Architecture Refactoring - Completion Plan

**Branch:** `feature/service-refactor-completion`
**Worktree:** `/home/theseus/alexandria/daopad-service-refactor-completion/src/daopad`
**Status:** Phase 1 ✅ Complete (PR #10 merged) | Phase 2-3 Pending
**Created:** 2025-10-10

---

## 📊 Current State Analysis

### ✅ What's Merged (PR #10)

**Commit**: `34d073c` - "refactor: Service architecture refactoring - Domain-driven backend services"

**Files Created** (11 files, ~1,484 lines):
```
daopad_frontend/src/services/
├── backend/
│   ├── base/
│   │   └── BackendServiceBase.js          ✅ (96 lines)
│   ├── kong-locker/
│   │   └── KongLockerService.js           ✅ (95 lines)
│   ├── proposals/
│   │   └── ProposalService.js             ✅ (122 lines)
│   ├── orbit/
│   │   ├── OrbitRequestsService.js        ✅ (136 lines)
│   │   ├── OrbitMembersService.js         ✅ (197 lines)
│   │   └── OrbitAccountsService.js        ✅ (153 lines)
│   ├── tokens/
│   │   └── TokenService.js                ✅ (75 lines)
│   ├── utils/
│   │   └── errorParsers.js                ✅ (72 lines)
│   ├── UnifiedBackendService.js           ✅ (270 lines)
│   └── index.js                           ✅ (26 lines)
├── utils/
│   └── errorParsers.js                    ✅ (symlink/copy)
└── MIGRATION_NOTES.md                     ✅ (226 lines)
```

**Critical Fixes Applied**:
- ✅ Fixed import paths (../../utils/ → ../utils/)
- ✅ Added UnifiedBackendService to index.js exports
- ✅ Removed singleton pattern from KongLockerService

### 🔴 What's Still Pending

**Old Monolithic Service** (Still Exists):
- `daopad_frontend/src/services/daopadBackend.js` - **41KB, 1,268 lines**
- ❌ Not removed yet (intentionally - backward compatibility)

**Components Using Old Service** (26 files):
```
Services (2):
├── addressBookService.js
└── canisterService.js

Redux Slices (3):
├── features/dao/daoSlice.js
├── features/orbit/orbitSlice.js
└── features/token/tokenSlice.js

Pages (1):
└── pages/PermissionsPage.jsx

Components (19):
├── components/tables/MembersTable.jsx
├── components/tables/RequestsTable.jsx
├── components/permissions/PermissionDetails.jsx
├── components/permissions/PermissionEditDialog.jsx
├── components/permissions/PermissionsTable.jsx
├── components/permissions/UserGroupsList.jsx
├── components/security/SecurityDashboard.jsx
├── components/orbit/account-wizard/AccountConfigStep.jsx
├── components/orbit/CreateAccountDialog.jsx
├── components/orbit/OrbitRequestsList.jsx.disabled
├── components/orbit/TransferRequestDialog.jsx
├── components/orbit/UnifiedRequests.jsx
├── components/DaoProposals.jsx
├── components/DAOSettings.jsx
├── components/JoinMemberButton.jsx
├── components/KongLockerSetup.jsx
├── components/MembershipStatus.jsx
├── components/TokenDashboard.jsx
├── components/TokenTabs.jsx
└── routes/AppRoute.jsx
```

### 📋 Missing Methods Analysis

The following methods from `daopadBackend.js` are **NOT** in `UnifiedBackendService`:

**Critical Missing Methods** (9):
1. `getBackendPrincipal()` - Get backend canister principal (utility)
2. `cleanupExpiredProposals()` - Admin function to cleanup (proposals domain)
3. `getUserPendingRequests(tokenId, userPrincipal)` - Get user's pending requests (orbit requests)
4. `getPredefinedGroups()` - Get predefined user groups (orbit members)
5. `batchApproveRequests(tokenId, requestIds)` - Batch approve (orbit requests)
6. `verifySoleAdmin(tokenId)` - Check if user is sole admin (orbit members)
7. `healthCheck()` - Backend health check (utility)
8. `getTokenMetadata(tokenCanisterId)` - Static method for token metadata (tokens)
9. `testBackendIntegration(payload)` - Test backend connection (utility)

**Additional Missing Orbit Methods** (~30+):
- Permission management (~10 methods)
- Security checks (~9 methods)
- External canister operations (~8 methods)
- Governance configuration (~5 methods)

---

## 🎯 Completion Strategy

### Phase 2A: Complete UnifiedBackendService (Priority 1)

**Goal**: Add all missing methods to maintain 100% backward compatibility

**Step 1: Add Missing Utility Methods**
```javascript
// In UnifiedBackendService or new UtilityService

async getBackendPrincipal() {
  const actor = await this.getActor();
  return { success: true, data: await actor.get_backend_principal() };
}

async healthCheck() {
  try {
    const actor = await this.getActor();
    const result = await actor.health_check();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async testBackendIntegration(payload = {}) {
  // Implementation from daopadBackend.js lines 731-746
}

static async getTokenMetadata(tokenCanisterId) {
  // Implementation from daopadBackend.js lines 660-730
}
```

**Step 2: Extend OrbitMembersService**
```javascript
// Add to OrbitMembersService

async getPredefinedGroups() {
  const actor = await this.getActor();
  const result = await actor.get_predefined_groups();
  return { success: true, data: result };
}

async verifySoleAdmin(stationId) {
  const actor = await this.getActor();
  const stationPrincipal = this.toPrincipal(stationId);
  const result = await actor.verify_sole_admin(stationPrincipal);
  return this.wrapResult(result);
}
```

**Step 3: Extend OrbitRequestsService**
```javascript
// Add to OrbitRequestsService

async getUserPendingRequests(stationId, userPrincipal) {
  const actor = await this.getActor();
  const stationPrincipal = this.toPrincipal(stationId);
  const principal = this.toPrincipal(userPrincipal);
  const result = await actor.get_user_pending_requests(stationPrincipal, principal);
  return this.wrapResult(result);
}

async batchApproveRequests(stationId, requestIds) {
  const actor = await this.getActor();
  const stationPrincipal = this.toPrincipal(stationId);
  // Batch approval logic from daopadBackend.js lines 522-548
}
```

**Step 4: Extend ProposalService**
```javascript
// Add to ProposalService

async cleanupExpiredProposals() {
  const actor = await this.getActor();
  const result = await actor.cleanup_expired_proposals();
  return this.wrapResult(result);
}
```

**Step 5: Update UnifiedBackendService**
Add all new methods to the facade to maintain API compatibility.

### Phase 2B: Create Additional Services (Priority 2)

**1. OrbitPermissionsService** (~250 lines)
```javascript
// services/backend/orbit/OrbitPermissionsService.js

export class OrbitPermissionsService extends BackendServiceBase {
  async listPermissions(stationId, resources = null)
  async getPermission(stationId, resource)
  async requestPermissionChange(stationId, resource, authScope, userGroups, users)
  async verifyPermissions(stationId)
  async checkUserPermission(stationId, userId, resource)
  async checkVotingPermission(stationId, userPrincipal, votingPower)
  async createVotingPermission(stationId, resource, minVotingPower, description)
  async grantSelfPermissions(stationId)
  async getUserPermissions(stationId, userId)
  async listPermissionsForResources(stationId, resources)
}
```

**2. OrbitSecurityService** (~200 lines)
```javascript
// services/backend/orbit/OrbitSecurityService.js

export class OrbitSecurityService extends BackendServiceBase {
  async checkAdminControl(stationId)
  async checkAssetManagement(stationId)
  async checkBackendStatus(stationId)
  async checkExternalCanisters(stationId)
  async checkGovernancePermissions(stationId)
  async checkOperationalPermissions(stationId)
  async checkProposalPolicies(stationId)
  async checkSystemConfiguration(stationId)
  async checkTreasuryControl(stationId)
}
```

**3. OrbitCanisterService** (~350 lines)
```javascript
// services/backend/orbit/OrbitCanisterService.js

export class OrbitCanisterService extends BackendServiceBase {
  async listCanisters(stationId, filters)
  async getCanister(stationId, canisterId)
  async createCanisterRequest(stationId, operationInput, title, summary)
  async changeCanisterRequest(stationId, operationInput, title, summary)
  async configureCanisterRequest(stationId, operationInput, title, summary)
  async fundCanisterRequest(stationId, operationInput, title, summary)
  async monitorCanisterRequest(stationId, operationInput, title, summary)
  async snapshotCanisterRequest(stationId, operationInput, title, summary)
  async pruneCanisterSnapshotsRequest(stationId, operationInput, title, summary)
  async restoreCanisterRequest(stationId, operationInput, title, summary)
  async callCanisterMethodRequest(stationId, externalCanisterId, methodInput, title, summary)
  async getCanisterSnapshots(stationId, canisterId)
  async getCanisterStatus(canisterId)
}
```

**4. OrbitGovernanceService** (~150 lines)
```javascript
// services/backend/orbit/OrbitGovernanceService.js

export class OrbitGovernanceService extends BackendServiceBase {
  async getSystemInfo(stationId)
  async getGovernanceStats(stationId)
  async getProposalConfig(stationId, proposalType)
  async getVotingThresholds(stationId)
  async getDefaultVotingThresholds()
  async setVotingThresholds(stationId, thresholds)
  async initializeDefaultThresholds(stationId)
  async getHighVpMembers(stationId, minVotingPower)
  async hasProposalPassed(stationId, proposalType, yesVotes, noVotes, totalVp)
}
```

**5. UtilityService** (~100 lines)
```javascript
// services/backend/utility/UtilityService.js

export class UtilityService extends BackendServiceBase {
  async getBackendPrincipal()
  async healthCheck()
  async testBackendIntegration(payload)
  static async getTokenMetadata(tokenCanisterId)
}
```

### Phase 2C: Component Migration (Priority 3)

**Migration Strategy**: Batch migration by domain

**Batch 1: Redux Slices** (3 files - Critical path)
```
Priority: HIGHEST - Affects entire app state management

features/dao/daoSlice.js          (Proposals + Kong Locker)
features/orbit/orbitSlice.js      (Orbit operations)
features/token/tokenSlice.js      (Token operations)

Impact: High - All components depend on these
Complexity: Medium - Need to update thunks and actions
```

**Batch 2: Core Services** (2 files)
```
Priority: HIGH - Other services depend on these

services/addressBookService.js    (Address book operations)
services/canisterService.js       (IC canister operations)

Impact: Medium - Used by orbit and canister components
Complexity: Medium - Need to refactor service patterns
```

**Batch 3: DAO & Governance** (3 files)
```
Priority: HIGH - Core DAO functionality

components/DaoProposals.jsx       (Proposal creation/voting)
components/DAOSettings.jsx        (DAO configuration)
components/KongLockerSetup.jsx    (Kong Locker integration)

Impact: High - Core DAO features
Complexity: Low-Medium - Direct service calls
```

**Batch 4: Membership** (3 files)
```
Priority: MEDIUM - User management

components/JoinMemberButton.jsx   (Join DAO)
components/MembershipStatus.jsx   (Membership display)
components/tables/MembersTable.jsx (Member management)

Impact: Medium - User onboarding
Complexity: Low - Simple service calls
```

**Batch 5: Orbit Requests** (3 files)
```
Priority: MEDIUM - Treasury operations

components/orbit/UnifiedRequests.jsx      (Request list/approval)
components/orbit/TransferRequestDialog.jsx (Create transfers)
components/tables/RequestsTable.jsx        (Request table)

Impact: Medium - Treasury management
Complexity: Medium - Complex request handling
```

**Batch 6: Orbit Accounts** (2 files)
```
Priority: MEDIUM - Account management

components/orbit/CreateAccountDialog.jsx           (Create accounts)
components/orbit/account-wizard/AccountConfigStep.jsx (Account wizard)

Impact: Medium - Account creation
Complexity: Medium - Multi-step wizard
```

**Batch 7: Permissions** (5 files)
```
Priority: LOW - Admin features

components/permissions/PermissionsTable.jsx     (List permissions)
components/permissions/PermissionDetails.jsx    (View details)
components/permissions/PermissionEditDialog.jsx (Edit permissions)
components/permissions/UserGroupsList.jsx       (Manage groups)
pages/PermissionsPage.jsx                       (Permissions page)

Impact: Low - Admin only
Complexity: Medium - Permission management
```

**Batch 8: Misc Components** (4 files)
```
Priority: LOW - UI/Navigation

components/TokenDashboard.jsx     (Token overview)
components/TokenTabs.jsx          (Tab navigation)
components/security/SecurityDashboard.jsx (Security checks)
routes/AppRoute.jsx               (App routing)

Impact: Low - Display/navigation
Complexity: Low - Minimal service usage
```

**Batch 9: Disabled Components** (1 file)
```
Priority: LOWEST - Not active

components/orbit/OrbitRequestsList.jsx.disabled

Impact: None - Currently disabled
Complexity: N/A - May need rewrite if re-enabled
```

### Phase 3: Cleanup & Optimization (Priority 4)

**Step 1: Verification**
```bash
# Verify no components import old service
grep -r "from.*daopadBackend" daopad_frontend/src/
# Should return 0 results

# Verify all imports use new services
grep -r "from.*services/backend" daopad_frontend/src/ | wc -l
# Should show 26+ imports
```

**Step 2: Remove Old Files**
```bash
# Backup first
cp daopad_frontend/src/services/daopadBackend.js /tmp/daopadBackend.js.backup

# Remove old service
rm daopad_frontend/src/services/daopadBackend.js

# Deploy and verify
./deploy.sh --network ic --frontend-only
```

**Step 3: Update Documentation**
```markdown
# Update files:
- README.md - Service architecture section
- CLAUDE.md - Service patterns
- MIGRATION_NOTES.md - Mark as complete
```

**Step 4: Add Tests**
```bash
# Create test files for each service
mkdir -p daopad_frontend/src/services/backend/__tests__/
mkdir -p daopad_frontend/src/services/backend/kong-locker/__tests__/
mkdir -p daopad_frontend/src/services/backend/proposals/__tests__/
mkdir -p daopad_frontend/src/services/backend/orbit/__tests__/
mkdir -p daopad_frontend/src/services/backend/tokens/__tests__/

# Write unit tests (50%+ coverage target)
```

---

## 📈 Success Metrics

### Phase 2A Completion Criteria
- [ ] All 9 missing methods added
- [ ] UnifiedBackendService 100% API compatible
- [ ] No breaking changes for existing components
- [ ] All methods tested manually

### Phase 2B Completion Criteria
- [ ] 5 additional services created
- [ ] ~1,050 lines of well-organized code
- [ ] All Orbit backend methods covered
- [ ] Exported from index.js

### Phase 2C Completion Criteria (Per Batch)
- [ ] All components in batch migrated
- [ ] Imports updated to new services
- [ ] Functionality verified on testnet
- [ ] No console errors or warnings
- [ ] Deployed to mainnet

### Phase 3 Completion Criteria
- [ ] Old daopadBackend.js removed
- [ ] All grep checks pass
- [ ] Documentation updated
- [ ] Unit tests added (50%+ coverage)
- [ ] Integration tests pass
- [ ] Production deployment successful

---

## 🚀 Execution Plan

### Week 1: Complete UnifiedBackendService
**Days 1-2**: Add 9 missing methods
**Days 3-4**: Test and verify backward compatibility
**Day 5**: Deploy and monitor

### Week 2: Additional Services
**Days 1-2**: Create OrbitPermissionsService, OrbitSecurityService
**Days 3-4**: Create OrbitCanisterService, OrbitGovernanceService
**Day 5**: Create UtilityService, update exports

### Week 3-4: Component Migration (Batches 1-3)
**Week 3 Days 1-2**: Redux Slices (Batch 1)
**Week 3 Days 3-4**: Core Services (Batch 2)
**Week 3 Day 5**: DAO & Governance (Batch 3)
**Week 4**: Continue migration batches

### Week 5: Cleanup & Testing
**Days 1-2**: Final migration batches
**Days 3-4**: Remove old files, update docs
**Day 5**: Testing and deployment

---

## ⚠️ Risk Mitigation

**Risk 1**: Breaking changes during migration
- **Mitigation**: Batch migration with testing between each batch
- **Rollback**: Keep old service until Phase 3

**Risk 2**: Missing methods discovered during migration
- **Mitigation**: Comprehensive analysis of all method usage
- **Solution**: Add to UnifiedBackendService as discovered

**Risk 3**: Performance degradation
- **Mitigation**: Monitor bundle size and runtime performance
- **Solution**: Optimize imports, lazy loading if needed

**Risk 4**: Test coverage gaps
- **Mitigation**: Add tests progressively with each service
- **Target**: 50%+ coverage before old service removal

---

## 📦 Deliverables

### Phase 2A Deliverables
1. Updated UnifiedBackendService with 9 missing methods
2. Updated service domain classes (4 files)
3. Updated index.js exports
4. Manual test report

### Phase 2B Deliverables
1. 5 new service files (~1,050 lines)
2. Updated UnifiedBackendService with new methods
3. Updated index.js exports
4. JSDoc documentation

### Phase 2C Deliverables (Per Batch)
1. Migrated component files
2. Updated imports
3. Deployment verification
4. Test reports

### Phase 3 Deliverables
1. Removed daopadBackend.js
2. Updated documentation (3 files)
3. Unit tests (10+ test files)
4. Final deployment report

---

## 🎯 Priority Matrix

```
High Priority, High Impact:
├── Complete UnifiedBackendService (Phase 2A)
├── Migrate Redux Slices (Batch 1)
└── Migrate Core Services (Batch 2)

High Priority, Medium Impact:
├── Create OrbitPermissionsService
├── Migrate DAO Components (Batch 3)
└── Migrate Membership Components (Batch 4)

Medium Priority, Medium Impact:
├── Create OrbitSecurityService
├── Create OrbitCanisterService
├── Migrate Orbit Requests (Batch 5)
└── Migrate Orbit Accounts (Batch 6)

Low Priority, Low Impact:
├── Create OrbitGovernanceService
├── Create UtilityService
├── Migrate Permissions (Batch 7)
└── Migrate Misc Components (Batch 8)
```

---

## 📊 Current vs. Target Architecture

### Current (Phase 1 Complete)
```
✅ New services created (8 services, ~1,242 lines)
✅ UnifiedBackendService (partial compatibility)
✅ Error parsers and utilities
❌ Old daopadBackend.js still in use (1,268 lines)
❌ 26 components using old service
❌ Missing 9 critical methods
❌ Missing 30+ Orbit methods
```

### Target (All Phases Complete)
```
✅ 13 domain services (~2,300 lines, organized)
✅ UnifiedBackendService (100% compatibility)
✅ 0 components using old service
✅ Old daopadBackend.js removed
✅ 50%+ test coverage
✅ Complete documentation
```

---

## 🛑 STOP - Ready for Optimizer Agent

**Status**: Plan complete, ready for implementation
**Next**: Use optimizer agent to execute Phase 2A
**Estimated Total Time**: 3-5 weeks for complete migration

---

**END OF COMPLETION PLAN**
