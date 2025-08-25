# Alexandria Orbit Station Integration Plan

## Overview

This document outlines the plan to integrate the Daopad application with the Alexandria DAO's Orbit Station to query and display governance proposals. The integration will allow users to view Alexandria DAO proposals through the Daopad interface without requiring individual authentication.

## Key Technical Confirmation

**Q: Can a locally deployed backend canister call mainnet canisters?**  
**A: Yes!** The existing Daopad backend already makes successful inter-canister calls to the mainnet Orbit Control Panel (`wdqqk-naaaa-aaaaa-774aq-cai`). We will use the same pattern to call the Alexandria Orbit Station (`fec7w-zyaaa-aaaaa-qaffq-cai`).

## Architecture

### Current State
- **Daopad Backend**: Rust canister that manages voting for lbryfun pools and creates DAOs via Orbit Control Panel
- **Daopad Frontend**: React application with Internet Identity authentication
- **Existing Integration**: Backend already calls mainnet Orbit Control Panel for station creation

### Proposed Architecture
```
Users → Daopad Frontend → Daopad Backend → Alexandria Orbit Station (Mainnet)
                              ↓
                         Local Cache
```

### Authentication Strategy

Since Orbit Station requires registered users for `list_requests` (even with "public" permissions), we'll use a **Backend Proxy Pattern**:

1. **One-time Setup**: Register the Daopad backend canister as a viewer in Alexandria Orbit Station
2. **Proxy Pattern**: Backend fetches proposals on behalf of all users
3. **No User Auth Required**: Frontend users don't need individual Orbit registration
4. **Caching**: Backend caches results to minimize inter-canister calls

## Implementation Phases

### Phase 1: Backend Integration Module

#### 1.1 Create Alexandria DAO Module
**File**: `src/daopad_backend/src/alexandria_dao.rs`

**Purpose**: Handle all interactions with Alexandria Orbit Station

**Key Functions**:
- `register_with_alexandria_station()` - One-time registration of backend as viewer
- `fetch_proposals()` - Query ManageSystemInfo requests
- `get_proposal_details()` - Fetch specific proposal information
- `cache_proposals()` - Store fetched data locally
- `is_cache_valid()` - Check if cached data is fresh

**Technical Details**:
- Use existing Orbit Station types from `src/orbit_station/orbit_station.did`
- Implement proper error handling for network failures
- Add retry logic for failed calls
- Cache TTL: 5 minutes (configurable)

#### 1.2 Update Main Backend Module
**File**: `src/daopad_backend/src/lib.rs`

**Changes**:
- Import alexandria_dao module
- Add storage for cached proposals
- Expose new query and update methods
- Add initialization for Alexandria Station ID

### Phase 2: Candid Interface Updates

#### 2.1 Define New Types
**File**: `src/daopad_backend/daopad_backend.did`

**New Types**:
```candid
type ProposalSummary = record {
    id: text;
    title: text;
    operation_type: text;
    status: text;
    created_at: text;
    approval_count: nat32;
    required_approvals: nat32;
};

type ProposalDetails = record {
    id: text;
    title: text;
    summary: opt text;
    operation_type: text;
    status: text;
    created_at: text;
    expiration_dt: opt text;
    requester: text;
    approvals: vec record { user_id: text; decided_at: text };
    rejections: vec record { user_id: text; decided_at: text };
    operation_details: text;  // JSON string of operation-specific data
};

type ProposalFilter = record {
    status: opt text;
    operation_type: opt text;
    from_date: opt text;
    to_date: opt text;
};
```

#### 2.2 Add New Service Methods
```candid
service : {
    // ... existing methods ...
    
    // Alexandria DAO Integration
    "register_backend_with_alexandria": () -> (variant { Ok: text; Err: text });
    "get_alexandria_proposals": (opt ProposalFilter) -> (variant { Ok: vec ProposalSummary; Err: text }) query;
    "get_proposal_details": (text) -> (variant { Ok: ProposalDetails; Err: text }) query;
    "refresh_alexandria_cache": () -> (variant { Ok: text; Err: text });
    "get_cache_status": () -> (record { last_updated: opt text; proposal_count: nat32 }) query;
}
```

### Phase 3: Frontend Components

#### 3.1 Service Layer
**File**: `src/daopad_frontend/src/services/alexandriaService.js`

**Functions**:
- `getProposals(filter)` - Fetch proposals from backend
- `getProposalDetails(id)` - Get detailed proposal information
- `refreshCache()` - Force cache refresh
- `getCacheStatus()` - Check cache freshness

#### 3.2 React Components

**Main Component**: `src/daopad_frontend/src/components/AlexandriaProposals.jsx`
- Display list of proposals
- Filter controls (status, type, date range)
- Auto-refresh timer (every 30 seconds)
- Loading states and error handling

**Proposal Card**: `src/daopad_frontend/src/components/ProposalCard.jsx`
- Compact view of proposal
- Status badge (Pending, Approved, Rejected, Executing, etc.)
- Approval progress bar
- Click to view details

**Proposal Details Modal**: `src/daopad_frontend/src/components/ProposalDetailsModal.jsx`
- Full proposal information
- Operation details breakdown
- Approval/rejection history
- Timeline of events

#### 3.3 App Integration
**File**: `src/daopad_frontend/src/App.jsx`

**Changes**:
- Add third tab: "Alexandria DAO"
- Import AlexandriaProposals component
- Update navigation logic

### Phase 4: Styling

**File**: `src/daopad_frontend/src/App.scss`

**New Styles**:
- `.alexandria-proposals` - Main container
- `.proposal-card` - Individual proposal styling
- `.proposal-status-*` - Status-specific colors
- `.proposal-modal` - Detail view styling

## Configuration

### Environment Variables

```bash
# Backend Configuration
ALEXANDRIA_STATION_ID=fec7w-zyaaa-aaaaa-qaffq-cai
ORBIT_CONTROL_PANEL_ID=wdqqk-naaaa-aaaaa-774aq-cai
LBRYFUN_CANISTER_ID=oni4e-oyaaa-aaaap-qp2pq-cai
CACHE_TTL_SECONDS=300

# Frontend Configuration
VITE_AUTO_REFRESH_INTERVAL=30000
```

### Initialization Parameters

The backend `init` function will accept:
```rust
init(
    orbit_control_panel_id: Option<String>,  // existing
    lbryfun_canister_id: Option<String>,     // existing
    alexandria_station_id: Option<String>     // new
)
```

## Deployment Steps

### Local Development

1. **Deploy Backend**:
   ```bash
   dfx deploy daopad_backend --argument '(
     opt "wdqqk-naaaa-aaaaa-774aq-cai",
     opt "oni4e-oyaaa-aaaap-qp2pq-cai",
     opt "fec7w-zyaaa-aaaaa-qaffq-cai"
   )'
   ```

2. **Register Backend with Alexandria**:
   ```bash
   dfx canister call daopad_backend register_backend_with_alexandria
   ```

3. **Deploy Frontend**:
   ```bash
   npm run build
   dfx deploy daopad_frontend
   ```

### Production Deployment

1. Add backend canister as viewer in Alexandria Orbit Station
2. Deploy with mainnet canister IDs
3. Verify registration status
4. Test proposal fetching

## Error Handling

### Backend Errors
- **NOT_REGISTERED**: Backend needs to be registered with Alexandria Station
- **NETWORK_ERROR**: Inter-canister call failed
- **PERMISSION_DENIED**: Backend lacks necessary permissions
- **CACHE_EXPIRED**: Cache needs refresh

### Frontend Error States
- Connection errors: Display retry button
- Empty results: Show "No proposals found"
- Loading timeout: Show timeout message with refresh option

## Security Considerations

1. **Read-Only Access**: Backend only needs viewer permissions
2. **Rate Limiting**: Implement cache to prevent excessive mainnet calls
3. **Input Validation**: Validate all request IDs and filter parameters
4. **Error Information**: Don't expose sensitive error details to frontend

## Performance Optimization

1. **Caching Strategy**:
   - Cache proposals for 5 minutes
   - Invalidate cache on manual refresh
   - Store up to 100 most recent proposals

2. **Pagination**:
   - Fetch 20 proposals at a time
   - Implement infinite scroll or pagination

3. **Lazy Loading**:
   - Load proposal details on-demand
   - Don't fetch full details in list view

## Testing Plan

### Unit Tests
- Test Alexandria DAO module functions
- Test cache expiration logic
- Test error handling

### Integration Tests
- Test backend registration with mainnet
- Test proposal fetching
- Test cache refresh mechanism

### Frontend Tests
- Test component rendering
- Test filter functionality
- Test error states

## Future Enhancements

1. **Phase 5: Advanced Features**
   - Real-time updates via WebSocket/polling
   - Proposal search functionality
   - Export proposals to CSV
   - Proposal analytics dashboard

2. **Phase 6: User Participation**
   - Allow authenticated users to view their approval status
   - Direct links to Orbit Station for voting
   - Notification system for new proposals

3. **Phase 7: Multi-Station Support**
   - Query multiple Orbit Stations
   - Aggregate proposals from different DAOs
   - Cross-DAO analytics

## Maintenance

### Regular Tasks
- Monitor cache hit rates
- Check registration status
- Update Orbit Station DID if interface changes
- Review error logs

### Upgrade Path
- Version the alexandria_dao module
- Maintain backward compatibility
- Document breaking changes

## Success Metrics

- Successfully fetch and display Alexandria proposals
- Cache hit rate > 80%
- Page load time < 2 seconds
- Zero authentication errors for end users

## Timeline Estimate

- **Phase 1**: Backend Integration - 2 days
- **Phase 2**: Interface Updates - 1 day
- **Phase 3**: Frontend Components - 3 days
- **Phase 4**: Styling & Polish - 1 day
- **Testing & Deployment**: 2 days

**Total**: ~9 days

## Conclusion

This integration will provide Daopad users with seamless access to Alexandria DAO proposals without requiring individual authentication. The backend proxy pattern elegantly solves the authentication challenge while maintaining good performance through caching.