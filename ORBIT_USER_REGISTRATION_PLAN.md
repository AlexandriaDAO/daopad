# Orbit Station User Registration Plan

## Overview
Implementation plan for allowing users with 1,000+ staked ALEX tokens to automatically register as operators in the Alexandria DAO Orbit Station.

## Architecture

### System Components
- **DAOPad Backend**: Admin of Orbit Station, handles registration logic
- **ICP Swap Canister** (`54fqz-5iaaa-aaaap-qkmqa-cai`): Holds staking data
- **Orbit Station** (`fec7w-zyaaa-aaaaa-qaffq-cai`): DAO governance platform
- **ALEX Token** (`ysy5f-2qaaa-aaaap-qkmmq-cai`): Governance token

### Registration Flow
1. User clicks "Register for DAO Access" button
2. Backend verifies user has ≥1,000 staked ALEX
3. Backend creates Orbit Station request to add user
4. Request auto-approves (backend is admin)
5. User gains access to view/interact with proposals

## Phase 1: Backend Core Implementation

### Location: `src/daopad_backend/src/alexandria_dao.rs`

#### 1.1 Add Orbit Station Types
- Import necessary types from Orbit documentation
- Define `AddUserOperationInput` structure
- Define `CreateRequestInput` structure
- Define `RequestOperationInput` enum
- Add error handling types

#### 1.2 Core User Addition Function
```
Function: add_user_to_orbit_station
Parameters:
  - user_principal: Principal
  - user_name: String
Returns: Result<String, String> (request_id or error)

Process:
1. Create AddUserOperationInput with user details
2. Wrap in RequestOperationInput::AddUser
3. Create CreateRequestInput with operation
4. Make inter-canister call to Orbit Station
5. Return request ID on success
```

## Phase 2: Staking Verification

### Location: `src/daopad_backend/src/lib.rs`

#### 2.1 Staking Balance Check
```
Function: check_alex_staking_balance
Parameters:
  - principal: Principal
Returns: Result<u64, String> (staked amount or error)

Process:
1. Call ICP Swap canister's get_stake method
2. Extract amount from response
3. Return staked balance
```

#### 2.2 Main Registration Endpoint
```
Function: register_as_orbit_operator (update call)
Parameters: None (uses caller)
Returns: Result<String, String>

Process:
1. Get caller's principal
2. Check staked ALEX balance
3. Verify balance ≥ 1,000 ALEX (100,000,000,000 e8s)
4. Generate username: "DAO Member {principal_short}"
5. Call add_user_to_orbit_station
6. Return success with request ID or error
```

## Phase 3: State Management & Deduplication

### 3.1 Registration Tracking
```
State Structure:
- REGISTERED_USERS: HashMap<Principal, RegistrationInfo>
- RegistrationInfo:
  - request_id: String
  - timestamp: u64
  - staked_amount: u64
```

### 3.2 Query Functions
```
Function: is_user_registered (query)
Parameters: principal: Principal
Returns: bool

Function: check_registration_status (query)
Parameters: None (uses caller)
Returns: RegistrationStatus
  - is_registered: bool
  - request_id: Option<String>
  - staked_amount: u64
  - required_stake: u64
```

### 3.3 Duplicate Prevention
- Check REGISTERED_USERS before creating new request
- Return existing registration if already registered
- Prevent multiple requests for same user

## Phase 4: Frontend Integration

### Location: `src/daopad_frontend/src/components/AlexandriaProposals.jsx`

#### 4.1 UI Components
- Registration button (shown when eligible but not registered)
- Registration status indicator
- Staking requirement message

#### 4.2 Registration Flow
```
handleRegisterForOrbit:
1. Show loading state
2. Call backend register_as_orbit_operator
3. Handle success:
   - Show success message
   - Refresh proposals list
   - Update UI state
4. Handle errors:
   - Insufficient stake: Show stake requirement
   - Already registered: Show status
   - Other errors: Display error message
```

#### 4.3 Conditional UI Display
```
If user not found error:
  If staked >= 1,000 ALEX:
    Show: "Register for DAO Access" button
  Else if staked > 0:
    Show: "You need {remaining} more staked ALEX"
  Else:
    Show: "Stake 1,000+ ALEX to access"
    
If registration pending:
  Show: "Registration processing..."
  
If registered:
  Show: Normal proposals view
```

## Phase 5: Candid Interface Updates

### Location: `src/daopad_backend/daopad_backend.did`

```candid
type RegistrationResult = variant {
  Ok : record { request_id: text };
  Err : text;
};

type RegistrationStatus = record {
  is_registered: bool;
  request_id: opt text;
  staked_amount: nat64;
  required_stake: nat64;
};

service : {
  register_as_orbit_operator : () -> (RegistrationResult);
  check_registration_status : () -> (RegistrationStatus) query;
  get_required_stake_amount : () -> (nat64) query;
}
```

## Phase 6: Testing Strategy

### 6.1 Test Cases
| Scenario | Expected Result |
|----------|----------------|
| User with 1,000 ALEX staked | Registration succeeds |
| User with 999 ALEX staked | Error: Insufficient stake |
| User with 10,000 ALEX staked | Registration succeeds |
| Already registered user | Error: Already registered |
| Anonymous caller | Error: Authentication required |
| User unstakes after registration | Remains registered (v1) |

### 6.2 Verification Steps
1. Register test user through DAOPad
2. Verify user appears in Orbit Station
3. Confirm user can view proposals
4. Test duplicate registration prevention
5. Verify registration data persistence

## Phase 7: Future Enhancements

### 7.1 Auto-Registration
- Monitor staking events via timer
- Automatically register when threshold reached
- Batch registration for efficiency

### 7.2 Dynamic Membership
- Deactivate users who unstake below threshold
- Reactivate on re-staking
- Grace period before deactivation

### 7.3 Admin Features
- Manual registration override
- Bulk user import
- Registration analytics dashboard
- Adjustable stake threshold

## Technical Requirements

### Dependencies
- Orbit Station API types
- ICP Swap interface
- ALEX token interface
- Inter-canister call capabilities

### Security Considerations
- Principal validation
- Stake verification before registration
- Rate limiting on registration attempts
- Audit trail of registrations

## Implementation Timeline

### Week 1
- [ ] Implement backend core functions
- [ ] Add Orbit Station types
- [ ] Test inter-canister calls

### Week 2
- [ ] Add staking verification
- [ ] Implement registration endpoint
- [ ] Add state management

### Week 3
- [ ] Frontend integration
- [ ] UI/UX improvements
- [ ] Error handling

### Week 4
- [ ] Testing & debugging
- [ ] Documentation
- [ fierce deployment

## Success Metrics
- Users with 1,000+ staked ALEX can self-register
- Registration completes within 5 seconds
- No duplicate registrations
- Clear error messages for ineligible users
- 100% of eligible users can access proposals

## Notes
- Initial version uses fixed 1,000 ALEX threshold
- Registration is permanent in v1 (no auto-removal)
- Admin requests auto-approve in Orbit Station
- Username format: "DAO Member {first-5-last-3-of-principal}"