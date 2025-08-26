# Frontend Implementation Plan: Alexandria Orbit Station Integration

## Overview
Direct frontend integration with Alexandria Orbit Station (fec7w-zyaaa-aaaaa-qaffq-cai), bypassing backend proxy due to IC architectural constraints (query methods cannot make inter-canister calls).

## Architecture Decision
- **Direct Integration**: Frontend → Orbit Station (no backend proxy)
- **Authentication**: Optional Internet Identity for enhanced features
- **Public Access**: View-only operations should work without authentication

## Implementation Steps

### Phase 1: Core Setup (Day 1)

#### 1.1 Add Orbit Station Interface
```javascript
// src/daopad_frontend/src/services/orbitStation.js
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory as OrbitIDL } from '../declarations/orbit_station';

const ORBIT_STATION_ID = "fec7w-zyaaa-aaaaa-qaffq-cai";

export class OrbitStationService {
  constructor(identity = null) {
    this.agent = new HttpAgent({ 
      identity,
      host: 'https://ic0.app'
    });
    
    this.actor = Actor.createActor(OrbitIDL, {
      agent: this.agent,
      canisterId: ORBIT_STATION_ID,
    });
  }
  
  async listRequests(filter = {}) {
    try {
      const input = {
        requester_ids: [],
        approver_ids: [],
        statuses: filter.status ? [filter.status] : [],
        operation_types: filter.type ? [{ [filter.type]: null }] : [],
        expiration_from_dt: [],
        expiration_to_dt: [],
        created_from_dt: filter.fromDate ? [filter.fromDate] : [],
        created_to_dt: filter.toDate ? [filter.toDate] : [],
        paginate: [{ offset: [0], limit: [100] }],
        sort_by: [{ CreationDt: { Desc: null } }],
        only_approvable: false,
        with_evaluation_results: false
      };
      
      const result = await this.actor.list_requests(input);
      
      if ('Ok' in result) {
        return {
          success: true,
          data: result.Ok.requests,
          total: result.Ok.total,
          next_offset: result.Ok.next_offset
        };
      } else {
        return {
          success: false,
          error: result.Err.message || 'Failed to fetch requests'
        };
      }
    } catch (error) {
      console.error('Failed to list requests:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

#### 1.2 Generate Orbit Station Declarations
```bash
# Download Orbit Station candid interface
dfx canister --network ic metadata fec7w-zyaaa-aaaaa-qaffq-cai candid:service > orbit_station.did

# Generate JS declarations
dfx generate --network ic fec7w-zyaaa-aaaaa-qaffq-cai
```

### Phase 2: Authentication Layer (Day 1-2)

#### 2.1 Update Internet Identity Integration
```javascript
// src/daopad_frontend/src/services/auth.js
import { AuthClient } from '@dfinity/auth-client';

export class AuthService {
  constructor() {
    this.authClient = null;
    this.identity = null;
    this.principal = null;
  }
  
  async init() {
    this.authClient = await AuthClient.create();
    if (await this.authClient.isAuthenticated()) {
      this.identity = this.authClient.getIdentity();
      this.principal = this.identity.getPrincipal();
    }
  }
  
  async login() {
    await this.authClient.login({
      identityProvider: 'https://identity.ic0.app',
      onSuccess: () => {
        this.identity = this.authClient.getIdentity();
        this.principal = this.identity.getPrincipal();
      }
    });
  }
  
  async logout() {
    await this.authClient.logout();
    this.identity = null;
    this.principal = null;
  }
  
  isAuthenticated() {
    return this.identity !== null;
  }
}
```

### Phase 3: React Components (Day 2)

#### 3.1 Proposals List Component
```jsx
// src/daopad_frontend/src/components/AlexandriaProposals.jsx
import React, { useState, useEffect } from 'react';
import { OrbitStationService } from '../services/orbitStation';
import { useAuth } from '../hooks/useAuth';

export function AlexandriaProposals() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({});
  const { identity, isAuthenticated } = useAuth();
  
  useEffect(() => {
    loadProposals();
  }, [identity, filter]);
  
  async function loadProposals() {
    setLoading(true);
    setError(null);
    
    // Try with identity if available, otherwise anonymous
    const orbitService = new OrbitStationService(identity);
    const result = await orbitService.listRequests(filter);
    
    if (result.success) {
      setProposals(result.data);
    } else {
      // If failed and not authenticated, show login prompt
      if (!isAuthenticated) {
        setError('Some proposals may require authentication. Please login to see all proposals.');
      } else {
        setError(result.error);
      }
    }
    
    setLoading(false);
  }
  
  return (
    <div className="alexandria-proposals">
      <div className="proposals-header">
        <h2>Alexandria DAO Proposals</h2>
        {!isAuthenticated && (
          <div className="auth-notice">
            Login with Internet Identity for full access
          </div>
        )}
      </div>
      
      <ProposalFilters onFilterChange={setFilter} />
      
      {loading && <div className="loading">Loading proposals...</div>}
      {error && <div className="error">{error}</div>}
      
      <div className="proposals-list">
        {proposals.map(proposal => (
          <ProposalCard key={proposal.id} proposal={proposal} />
        ))}
      </div>
    </div>
  );
}
```

#### 3.2 Proposal Card Component
```jsx
// src/daopad_frontend/src/components/ProposalCard.jsx
export function ProposalCard({ proposal }) {
  const statusClass = `status-${proposal.status.toLowerCase()}`;
  
  return (
    <div className="proposal-card">
      <div className="proposal-header">
        <h3>{proposal.title}</h3>
        <span className={`status ${statusClass}`}>
          {proposal.status}
        </span>
      </div>
      
      <div className="proposal-meta">
        <span>Created: {formatDate(proposal.created_at)}</span>
        <span>Type: {formatOperationType(proposal.operation)}</span>
      </div>
      
      {proposal.summary && (
        <div className="proposal-summary">{proposal.summary}</div>
      )}
      
      <div className="proposal-voting">
        <div className="approvals">
          {proposal.approvals.length} approvals
        </div>
        {proposal.expiration_dt && (
          <div className="expiration">
            Expires: {formatDate(proposal.expiration_dt)}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Phase 4: State Management (Day 2-3)

#### 4.1 Redux/Context Setup
```javascript
// src/daopad_frontend/src/context/AlexandriaContext.jsx
import React, { createContext, useReducer, useContext } from 'react';

const AlexandriaContext = createContext();

const initialState = {
  proposals: [],
  loading: false,
  error: null,
  filter: {},
  selectedProposal: null,
  isAuthenticated: false,
  userPrivileges: []
};

function alexandriaReducer(state, action) {
  switch (action.type) {
    case 'SET_PROPOSALS':
      return { ...state, proposals: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_FILTER':
      return { ...state, filter: action.payload };
    case 'SET_AUTH':
      return { ...state, isAuthenticated: action.payload };
    default:
      return state;
  }
}

export function AlexandriaProvider({ children }) {
  const [state, dispatch] = useReducer(alexandriaReducer, initialState);
  
  return (
    <AlexandriaContext.Provider value={{ state, dispatch }}>
      {children}
    </AlexandriaContext.Provider>
  );
}
```

### Phase 5: Integration Points (Day 3)

#### 5.1 Main App Integration
```jsx
// src/daopad_frontend/src/App.jsx
import { AlexandriaProvider } from './context/AlexandriaContext';
import { AlexandriaProposals } from './components/AlexandriaProposals';

function App() {
  return (
    <AlexandriaProvider>
      <div className="app">
        {/* Existing components */}
        
        <Route path="/alexandria" component={AlexandriaProposals} />
        
        {/* Or as a tab */}
        <Tab label="Alexandria DAO">
          <AlexandriaProposals />
        </Tab>
      </div>
    </AlexandriaProvider>
  );
}
```

## Testing Strategy

### Public Access Testing
1. Load proposals without authentication
2. Verify read-only operations work
3. Test pagination and filtering

### Authenticated Testing
1. Login with Internet Identity
2. Verify enhanced features appear
3. Test user-specific operations

### Error Handling
1. Network failures
2. Authentication failures  
3. Permission errors
4. Invalid data handling

## Optimization Opportunities

### Caching Strategy
```javascript
// Use local storage for temporary caching
const CACHE_KEY = 'alexandria_proposals';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedProposals() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;
  
  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > CACHE_TTL) {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
  
  return data;
}

function cacheProposals(proposals) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    data: proposals,
    timestamp: Date.now()
  }));
}
```

### Pagination
```javascript
// Implement infinite scroll or pagination
const [page, setPage] = useState(0);
const [hasMore, setHasMore] = useState(true);
const ITEMS_PER_PAGE = 20;

async function loadMore() {
  const result = await orbitService.listRequests({
    ...filter,
    paginate: {
      offset: page * ITEMS_PER_PAGE,
      limit: ITEMS_PER_PAGE
    }
  });
  
  if (result.success) {
    setProposals(prev => [...prev, ...result.data]);
    setHasMore(result.data.length === ITEMS_PER_PAGE);
    setPage(prev => prev + 1);
  }
}
```

## Deployment Checklist

- [ ] Generate Orbit Station declarations
- [ ] Test public access without authentication
- [ ] Test authenticated access
- [ ] Implement error boundaries
- [ ] Add loading states
- [ ] Test on mainnet
- [ ] Add monitoring/analytics
- [ ] Document API integration

## Fallback Strategy

If public access doesn't work:
1. Show "Login Required" message prominently
2. Cache proposals after first authenticated load
3. Consider hybrid approach: public summary, detailed view requires auth

## Timeline

- **Day 1**: Core setup, service integration
- **Day 2**: Components and authentication
- **Day 3**: Testing and optimization
- **Total**: 3 days for MVP

## Next Steps

1. Verify Orbit Station's public access policy
2. Generate TypeScript declarations for type safety
3. Implement the service layer
4. Build UI components
5. Test with both authenticated and anonymous users