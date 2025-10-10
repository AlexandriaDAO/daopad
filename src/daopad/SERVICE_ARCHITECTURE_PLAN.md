# Service Layer Architecture Refactoring

**Branch:** `feature/service-architecture`
**Worktree:** `/home/theseus/alexandria/daopad-service-architecture/src/daopad`
**Estimated Time:** 8-10 hours
**Complexity:** Medium
**Impact:** 🟡 **HIGH** - Better maintainability and testability

---

## 🚨 MANDATORY: ISOLATION CHECK AND EXECUTION PROMPT

### Context: Worktree Already Created

**Location:** `/home/theseus/alexandria/daopad-service-architecture/src/daopad`
**Branch:** `feature/service-architecture`
**Plan file:** `SERVICE_ARCHITECTURE_PLAN.md`

### Step 0: Verify Isolation (RUN THIS FIRST!)

```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
CURRENT_BRANCH=$(git branch --show-current)

if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: You are in the MAIN repository"
    echo "Navigate to: cd /home/theseus/alexandria/daopad-service-architecture/src/daopad"
    exit 1
fi

if [ "$CURRENT_BRANCH" != "feature/service-architecture" ]; then
    echo "❌ WARNING: You are on branch '$CURRENT_BRANCH'"
    echo "Expected: feature/service-architecture"
    exit 1
fi

echo "✅ Correct worktree: $REPO_ROOT"
echo "✅ On branch: $CURRENT_BRANCH"
```

---

## 📋 Executive Summary

**Problem:** Service files are massive and monolithic:
- `daopadBackend.js`: **1,268 lines** - All backend methods in one file
- `canisterService.js`: **827 lines** - All canister operations together
- No clear domain separation
- Hard to test individual features
- Difficult to navigate and maintain

**Solution:** Refactor into domain-driven service modules with clear separation of concerns.

**Result:** Clean architecture, testable services, easier maintenance, better developer experience.

---

## 🔍 Current State Analysis

### Massive Service Files

**`daopadBackend.js` (1,268 lines)** contains:
- Kong Locker integration (8 methods, ~150 lines)
- Token operations (4 methods, ~100 lines)
- Orbit Station operations (15+ methods, ~600 lines)
- DAO proposal system (8 methods, ~300 lines)
- Utility functions (~118 lines)

**All in ONE file!**

**`canisterService.js` (827 lines)** contains:
- Canister creation
- Canister management
- Cycles management
- Upgrade operations
- Snapshot management
- Method calling
- All IC management canister operations

**Impact:**
- Hard to find specific functionality
- Testing requires mocking entire service
- Merge conflicts frequent
- Violates Single Responsibility Principle

---

## 🎯 New Architecture

### Domain-Driven Service Structure

```
src/services/
├── backend/
│   ├── base/
│   │   └── BackendServiceBase.js     # Shared actor/identity logic
│   ├── kong-locker/
│   │   ├── KongLockerService.js      # Kong Locker operations
│   │   └── __tests__/
│   │       └── KongLockerService.test.js
│   ├── proposals/
│   │   ├── ProposalService.js        # DAO proposals
│   │   └── __tests__/
│   │       └── ProposalService.test.js
│   ├── orbit/
│   │   ├── OrbitRequestsService.js   # Request management
│   │   ├── OrbitMembersService.js    # Member management
│   │   ├── OrbitAccountsService.js   # Account/balance operations
│   │   ├── OrbitStationService.js    # Station setup/config
│   │   └── __tests__/
│   │       ├── OrbitRequestsService.test.js
│   │       ├── OrbitMembersService.test.js
│   │       └── ...
│   └── tokens/
│       ├── TokenService.js           # Token operations
│       └── __tests__/
│           └── TokenService.test.js
├── ic/
│   ├── base/
│   │   └── CanisterServiceBase.js    # Shared IC operations
│   ├── lifecycle/
│   │   ├── CanisterCreationService.js
│   │   ├── CanisterUpgradeService.js
│   │   └── CanisterSnapshotService.js
│   ├── management/
│   │   ├── CanisterControlService.js
│   │   ├── CyclesService.js
│   │   └── CanisterMethodService.js
│   └── __tests__/
│       └── ...
└── utils/
    ├── actorFactory.js               # Shared actor creation
    ├── errorParsers.js               # Error message parsing
    └── principalUtils.js             # Principal conversions
```

---

## 📁 Detailed File Changes

### NEW FILE 1: `src/services/backend/base/BackendServiceBase.js`

**Purpose:** Shared logic for all backend services

```javascript
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory, canisterId } from '../../../declarations/daopad_backend';

const DEFAULT_BACKEND_ID = 'lwsav-iiaaa-aaaap-qp2qq-cai';
const BACKEND_CANISTER_ID = canisterId ?? DEFAULT_BACKEND_ID;

export class BackendServiceBase {
  constructor(identity = null) {
    this.identity = identity;
    this.actor = null;
    this.lastIdentity = null;
  }

  async getActor() {
    // Cache actor but recreate if identity changed
    if (!this.actor || this.identity !== this.lastIdentity) {
      const isLocal = import.meta.env.VITE_DFX_NETWORK === 'local';
      const host = isLocal ? 'http://localhost:4943' : 'https://icp0.io';

      const agent = new HttpAgent({
        identity: this.identity,
        host,
      });

      if (isLocal) {
        await agent.fetchRootKey();
      }

      this.actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: BACKEND_CANISTER_ID,
      });

      this.lastIdentity = this.identity;
    }

    return this.actor;
  }

  /**
   * Wrap backend Result<T, String> responses
   */
  wrapResult(result) {
    if ('Ok' in result) {
      return { success: true, data: result.Ok };
    } else if ('Err' in result) {
      return { success: false, error: result.Err };
    }
    return { success: false, error: 'Invalid response format' };
  }

  /**
   * Wrap backend Option<T> responses
   */
  wrapOption(result) {
    if (Array.isArray(result) && result.length > 0) {
      return { success: true, data: result[0] };
    } else if (Array.isArray(result)) {
      return { success: true, data: null };
    }
    return { success: false, error: 'Invalid option format' };
  }

  /**
   * Convert to Principal (handles string/Principal/object)
   */
  toPrincipal(value) {
    if (!value) return null;
    if (value instanceof Principal) return value;
    if (typeof value === 'string') return Principal.fromText(value);
    if (typeof value.toText === 'function') return value;
    if (typeof value.toString === 'function') {
      try {
        return Principal.fromText(value.toString());
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Convert Principal to text
   */
  toText(principal) {
    if (!principal) return null;
    if (typeof principal === 'string') return principal;
    if (typeof principal.toText === 'function') return principal.toText();
    if (typeof principal.toString === 'function') return principal.toString();
    return String(principal);
  }
}
```

---

### NEW FILE 2: `src/services/backend/kong-locker/KongLockerService.js`

**Purpose:** All Kong Locker operations

```javascript
import { BackendServiceBase } from '../base/BackendServiceBase';

export class KongLockerService extends BackendServiceBase {
  /**
   * Register with Kong Locker
   */
  async register(kongLockerPrincipal) {
    try {
      const actor = await this.getActor();
      const principal = this.toPrincipal(kongLockerPrincipal);
      const result = await actor.register_with_kong_locker(principal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to register with Kong Locker:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get my Kong Locker canister
   */
  async getMyCanister() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_my_kong_locker_canister();
      return this.wrapOption(result);
    } catch (error) {
      console.error('Failed to get Kong Locker canister:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unregister from Kong Locker
   */
  async unregister() {
    try {
      const actor = await this.getActor();
      const result = await actor.unregister_kong_locker();
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to unregister Kong Locker:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * List all Kong Locker registrations (admin)
   */
  async listAllRegistrations() {
    try {
      const actor = await this.getActor();
      const result = await actor.list_all_kong_locker_registrations();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to list registrations:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get voting power for token
   */
  async getVotingPower(tokenId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.get_my_voting_power_for_token(tokenPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to get voting power:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Kong Locker positions
   */
  async getPositions() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_my_kong_locker_positions();
      return this.wrapOption(result);
    } catch (error) {
      console.error('Failed to get positions:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton factory
let instance = null;

export const getKongLockerService = (identity) => {
  if (!instance || instance.identity !== identity) {
    instance = new KongLockerService(identity);
  }
  return instance;
};

export default KongLockerService;
```

---

### NEW FILE 3: `src/services/backend/proposals/ProposalService.js`

**Purpose:** DAO proposal operations

```javascript
import { BackendServiceBase } from '../base/BackendServiceBase';

export class ProposalService extends BackendServiceBase {
  /**
   * Create DAO transition proposal
   */
  async createProposal(tokenId, stationId, options = {}) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const stationPrincipal = this.toPrincipal(stationId);

      const proposalOptions = {
        title: options.title || 'DAO Transition Proposal',
        description: options.description || '',
        voting_period_hours: options.votingPeriodHours || 168, // 1 week
      };

      const result = await actor.create_dao_transition_proposal(
        tokenPrincipal,
        stationPrincipal,
        proposalOptions
      );
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to create proposal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Vote on proposal
   */
  async vote(proposalId, vote) {
    try {
      const actor = await this.getActor();
      const voteVariant = vote === 'yes' ? { Yes: null } : { No: null };
      const result = await actor.vote_on_proposal(proposalId, voteVariant);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to vote:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get proposal details
   */
  async getProposal(proposalId) {
    try {
      const actor = await this.getActor();
      const result = await actor.get_proposal(proposalId);
      return this.wrapOption(result);
    } catch (error) {
      console.error('Failed to get proposal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * List active proposals
   */
  async listActive() {
    try {
      const actor = await this.getActor();
      const result = await actor.list_active_proposals();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to list proposals:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get active proposal for token
   */
  async getActiveForToken(tokenId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.get_active_proposal_for_token(tokenPrincipal);
      return this.wrapOption(result);
    } catch (error) {
      console.error('Failed to get active proposal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute proposal (finalize result)
   */
  async execute(proposalId) {
    try {
      const actor = await this.getActor();
      const result = await actor.execute_proposal(proposalId);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to execute proposal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get proposal votes
   */
  async getVotes(proposalId) {
    try {
      const actor = await this.getActor();
      const result = await actor.get_proposal_votes(proposalId);
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get votes:', error);
      return { success: false, error: error.message };
    }
  }
}

export const getProposalService = (identity) => {
  return new ProposalService(identity);
};

export default ProposalService;
```

---

### NEW FILE 4: `src/services/backend/orbit/OrbitRequestsService.js`

**Purpose:** Orbit request management

```javascript
import { BackendServiceBase } from '../base/BackendServiceBase';
import { parseOrbitResult } from '../../utils/errorParsers';

export class OrbitRequestsService extends BackendServiceBase {
  /**
   * List requests with filters
   */
  async listRequests(stationId, filters = {}) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);

      const requestInput = {
        statuses: filters.statuses || [],
        deduplication_keys: filters.deduplicationKeys || [],
        tags: filters.tags || [],
        only_approvable: filters.onlyApprovable || false,
        created_from: filters.createdFrom || null,
        created_to: filters.createdTo || null,
        expiration_from: filters.expirationFrom || null,
        expiration_to: filters.expirationTo || null,
        sort_by: filters.sortBy || null,
        page: filters.page || 0,
        limit: filters.limit || 20,
      };

      const result = await actor.list_orbit_requests(stationPrincipal, requestInput);
      return parseOrbitResult(result);
    } catch (error) {
      console.error('Failed to list requests:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get request details
   */
  async getRequest(stationId, requestId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.get_orbit_request(stationPrincipal, requestId);
      return parseOrbitResult(result);
    } catch (error) {
      console.error('Failed to get request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create transfer request
   */
  async createTransfer(stationId, params) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);

      const transferParams = {
        from_account_id: params.fromAccountId,
        to: params.to,
        amount: params.amount,
        metadata: params.metadata || [],
        deduplication_keys: params.deduplicationKeys || [],
        tags: params.tags || [],
      };

      const result = await actor.create_transfer_request(stationPrincipal, transferParams);
      return parseOrbitResult(result);
    } catch (error) {
      console.error('Failed to create transfer:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Approve request
   */
  async approve(stationId, requestId, reason = null) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);

      const approvalInput = {
        request_id: requestId,
        reason: reason ? [reason] : [],
      };

      const result = await actor.approve_orbit_request(stationPrincipal, approvalInput);
      return parseOrbitResult(result);
    } catch (error) {
      console.error('Failed to approve request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reject request
   */
  async reject(stationId, requestId, reason = null) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);

      const rejectionInput = {
        request_id: requestId,
        reason: reason || 'Rejected by user',
      };

      const result = await actor.reject_orbit_request(stationPrincipal, rejectionInput);
      return parseOrbitResult(result);
    } catch (error) {
      console.error('Failed to reject request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel request (before approval)
   */
  async cancel(stationId, requestId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.cancel_orbit_request(stationPrincipal, requestId);
      return parseOrbitResult(result);
    } catch (error) {
      console.error('Failed to cancel request:', error);
      return { success: false, error: error.message };
    }
  }
}

export const getOrbitRequestsService = (identity) => {
  return new OrbitRequestsService(identity);
};

export default OrbitRequestsService;
```

---

### NEW FILE 5: `src/services/utils/errorParsers.js`

**Purpose:** Parse Orbit Station's complex error responses

```javascript
/**
 * Parse Orbit's double-wrapped Result format
 * Orbit returns: Result::Ok(Result::Ok(T)) or Result::Ok(Result::Err(E))
 */
export const parseOrbitResult = (response) => {
  // Check for outer Result
  if (response?.Ok) {
    // Check inner Result
    if (response.Ok.Ok !== undefined) {
      return { success: true, data: response.Ok.Ok };
    } else if (response.Ok.Err !== undefined) {
      const errorMessage = formatOrbitError(response.Ok.Err);
      return { success: false, error: errorMessage };
    }
  } else if (response?.Err) {
    const errorMessage = formatOrbitError(response.Err);
    return { success: false, error: errorMessage };
  }

  // Fallback for simple format
  if (response?.success !== undefined) {
    return response;
  }

  return { success: false, error: 'Invalid response structure' };
};

/**
 * Format Orbit error objects into readable messages
 */
export const formatOrbitError = (errorRecord) => {
  if (!errorRecord || typeof errorRecord !== 'object') {
    return 'Orbit Station error';
  }

  // Get error message
  const message = Array.isArray(errorRecord.message) && errorRecord.message.length > 0
    ? errorRecord.message[0]
    : errorRecord.code || 'Unknown error';

  // Get error details
  const detailsVector = Array.isArray(errorRecord.details) && errorRecord.details.length > 0
    ? errorRecord.details[0]
    : [];

  if (Array.isArray(detailsVector) && detailsVector.length > 0) {
    const rendered = detailsVector
      .map((entry) => {
        if (Array.isArray(entry) && entry.length === 2) {
          const [key, value] = entry;
          return `${key}: ${value}`;
        }
        if (entry && typeof entry === 'object') {
          const keys = Object.keys(entry);
          if (keys.length === 2) {
            return keys.map((k) => `${k}: ${entry[k]}`).join(', ');
          }
        }
        return null;
      })
      .filter(Boolean)
      .join('; ');

    if (rendered) {
      return `${message} (${rendered})`;
    }
  }

  return message || 'Orbit Station error';
};
```

---

## 🧪 Testing Strategy

### Unit Tests for Services

**Example: `src/services/backend/kong-locker/__tests__/KongLockerService.test.js`**

```javascript
import { KongLockerService } from '../KongLockerService';
import { Principal } from '@dfinity/principal';

// Mock the backend actor
jest.mock('../../../../declarations/daopad_backend', () => ({
  idlFactory: {},
  canisterId: 'lwsav-iiaaa-aaaap-qp2qq-cai',
}));

describe('KongLockerService', () => {
  let service;
  let mockActor;

  beforeEach(() => {
    mockActor = {
      register_with_kong_locker: jest.fn(),
      get_my_kong_locker_canister: jest.fn(),
      get_my_voting_power_for_token: jest.fn(),
    };

    service = new KongLockerService(null);
    service.actor = mockActor;
  });

  describe('register', () => {
    it('should register with Kong Locker', async () => {
      const kongPrincipal = Principal.fromText('aaaaa-aa');
      mockActor.register_with_kong_locker.mockResolvedValue({ Ok: 'success' });

      const result = await service.register(kongPrincipal);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(mockActor.register_with_kong_locker).toHaveBeenCalledWith(kongPrincipal);
    });

    it('should handle registration errors', async () => {
      const kongPrincipal = Principal.fromText('aaaaa-aa');
      mockActor.register_with_kong_locker.mockResolvedValue({ Err: 'Already registered' });

      const result = await service.register(kongPrincipal);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Already registered');
    });
  });

  describe('getVotingPower', () => {
    it('should get voting power for token', async () => {
      const tokenId = 'token123';
      mockActor.get_my_voting_power_for_token.mockResolvedValue({ Ok: 1000 });

      const result = await service.getVotingPower(tokenId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(1000);
    });
  });
});
```

---

## 🚀 Deployment Process

### Step 1: Create Base Services

```bash
mkdir -p daopad_frontend/src/services/backend/base
mkdir -p daopad_frontend/src/services/utils

# Create BackendServiceBase.js
# Create errorParsers.js
# Create principalUtils.js
```

### Step 2: Create Domain Services

```bash
mkdir -p daopad_frontend/src/services/backend/kong-locker
mkdir -p daopad_frontend/src/services/backend/proposals
mkdir -p daopad_frontend/src/services/backend/orbit
mkdir -p daopad_frontend/src/services/backend/tokens

# Create each service file
```

### Step 3: Migrate Components (One Domain at a Time)

```bash
# Example: Migrate Kong Locker first
# 1. Update imports in components
# 2. Test functionality
# 3. Commit

# Then proposals, then orbit, etc.
```

### Step 4: Remove Old Files

```bash
# After ALL components migrated
rm daopad_frontend/src/services/daopadBackend.js
# Keep as reference until all migrated!
```

---

## ✅ Success Criteria

- [ ] All services split by domain
- [ ] Base classes reduce duplication
- [ ] Each service < 300 lines
- [ ] Unit tests for each service (50%+ coverage)
- [ ] All components use new services
- [ ] Old monolithic files removed
- [ ] Documentation for each service

---

## 🎯 Your Execution Prompt

You are an autonomous PR orchestrator implementing Service Architecture Refactoring.

**EXECUTE THESE STEPS AUTONOMOUSLY:**

**Step 0 - VERIFY ISOLATION:**
```bash
pwd  # ../daopad-service-architecture/src/daopad
git branch --show-current  # feature/service-architecture
```

**Step 1 - Create Base Services:**
```bash
mkdir -p daopad_frontend/src/services/backend/base
mkdir -p daopad_frontend/src/services/utils

# Create BackendServiceBase.js
# Create errorParsers.js
```

**Step 2 - Create Domain Services:**
```bash
# Create KongLockerService.js
# Create ProposalService.js
# Create OrbitRequestsService.js
# (+ others from plan)
```

**Step 3 - Migrate Components:**
```bash
# Update imports
# Test each domain
# Deploy: ./deploy.sh --network ic --frontend-only
```

**Step 4 - Remove Old Files:**
```bash
# After verification
rm daopad_frontend/src/services/daopadBackend.js
```

**Step 5 - Commit and PR:**
```bash
git add -A
git commit -m "refactor: Split services into domain modules"
git push -u origin feature/service-architecture
gh pr create --title "refactor: Service architecture refactoring" --body "[...]"
```

**START NOW with Step 0.**

---

**END OF PLAN**

🛑 **PLANNING AGENT - YOUR JOB IS DONE**
