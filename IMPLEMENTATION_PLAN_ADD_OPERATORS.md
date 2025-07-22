# Implementation Plan: Adding Operators to Orbit Stations from Daopad Canister

## Executive Summary

This document outlines the implementation plan for enabling the Daopad canister to programmatically add users as operators to Orbit stations it creates. Currently, when Daopad creates a station, only the canister itself is set as admin, preventing human users from accessing these DAO treasuries through the Orbit UI.

**Problem**: Users cannot join or interact with stations created by the Daopad canister because there's no mechanism to add them as members.

**Solution**: Implement a function that allows the Daopad canister to add users as operators to its stations using Orbit's request-based system.

**Benefits**: 
- Enables collaborative DAO treasury management
- Maintains security through the canister's admin control
- Provides foundation for future voting-gated access

## Table of Contents

1. [Technical Background](#technical-background)
2. [System Architecture](#system-architecture)
3. [Implementation Guide](#implementation-guide)
4. [Code Examples](#code-examples)
5. [Testing Strategy](#testing-strategy)
6. [Security Considerations](#security-considerations)
7. [Future Enhancements](#future-enhancements)
8. [Appendices](#appendices)

## Technical Background

### Orbit Station Architecture

Orbit uses a two-level architecture for managing digital assets:

1. **Control Panel Canister**: 
   - Manages user registration and station deployment
   - Associates users with their accessible stations
   - Handles station lifecycle (deployment, tracking)

2. **Station Canisters**:
   - Individual smart contracts that hold and manage assets
   - Implement request-based operations with approval workflows
   - Maintain their own user database with groups and permissions

### Request-Based Operation System

All state-changing operations in Orbit stations follow a request pattern:

```
Create Request → Approval Process → Execution
```

Key components:
- **Request**: Contains the operation details (e.g., add user, transfer tokens)
- **Approval Policy**: Defines who must approve and quorum requirements
- **Execution**: Automatic once approval conditions are met

### User Groups and Permissions

Orbit stations have two predefined user groups:

1. **Admin Group** (ID: `00000000-0000-4000-8000-000000000000`)
   - Full control over station configuration
   - Can manage users, permissions, and policies
   - Can approve any request type

2. **Operator Group** (ID: `00000000-0000-4000-8000-000000000001`)
   - Operational access to the station
   - Can create and approve standard requests
   - Cannot modify station configuration

### Auto-Approval Mechanism

Requests can be automatically approved when:
1. The requester has approval permissions and meets policy requirements
2. The requester is the station controller or the request is self-directed
3. The approval policy allows automatic approval based on the requester's role

## System Architecture

### Component Interaction Diagram

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend  │────▶│ Daopad Canister  │────▶│ Orbit Station   │
│     App     │     │    (Admin)       │     │   Canister      │
└─────────────┘     └──────────────────┘     └─────────────────┘
      │                      │                         │
      │                      │                         │
      ▼                      ▼                         ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    User     │     │ Station Registry │     │  User Database  │
│  Principal  │     │   (Tracking)     │     │    (Groups)     │
└─────────────┘     └──────────────────┘     └─────────────────┘
```

### Add Operator Flow Sequence

```
User                Daopad              Station            Result
 │                    │                    │                 │
 ├─Request Add───────▶│                    │                 │
 │                    ├─Validate──────────▶│                 │
 │                    │                    │                 │
 │                    ├─Create Request────▶│                 │
 │                    │                    ├─Auto-Approve───▶│
 │                    │                    ├─Execute────────▶│
 │                    │◀───Success─────────┤                 │
 │◀───Confirmation────┤                    │                 │
 │                    │                    │                 │
```

### Data Structures

```rust
// Station tracking in Daopad
struct StationRecord {
    canister_id: Principal,
    name: String,
    created_at: u64,
    operators: Vec<Principal>,
}

// Request to add operator
struct AddOperatorRequest {
    station_id: Principal,
    operator_name: String,
    operator_principal: Principal,
}
```

## Implementation Guide

### Phase 1: Type Definitions

Add the following types to `orbit_integration.rs`:

```rust
// UUID type for group IDs
type UUID = [u8; 16];

// Predefined group IDs from Orbit
const ADMIN_GROUP_ID: UUID = [0, 0, 0, 0, 0, 0, 64, 0, 128, 0, 0, 0, 0, 0, 0, 0];
const OPERATOR_GROUP_ID: UUID = [0, 0, 0, 0, 0, 0, 64, 0, 128, 0, 0, 0, 0, 0, 0, 1];

// User status in the station
#[derive(CandidType, Serialize, Deserialize)]
enum UserStatusDTO {
    Active,
    Inactive,
}

// Operation to add a user
#[derive(CandidType, Serialize, Deserialize)]
struct AddUserOperationInput {
    name: String,
    identities: Vec<Principal>,
    groups: Vec<UUID>,
    status: UserStatusDTO,
}

// Request operation types
#[derive(CandidType, Serialize, Deserialize)]
enum RequestOperationInput {
    AddUser(AddUserOperationInput),
    // Other operation types would go here
}

// Execution schedule for requests
#[derive(CandidType, Serialize, Deserialize)]
enum RequestExecutionSchedule {
    Immediate,
    Scheduled { scheduled_at: String },
}

// Input for creating a request
#[derive(CandidType, Serialize, Deserialize)]
struct CreateRequestInput {
    operation: RequestOperationInput,
    title: Option<String>,
    summary: Option<String>,
    execution_plan: Option<RequestExecutionSchedule>,
    expiration_dt: Option<String>,
}

// Request creation response
#[derive(CandidType, Serialize, Deserialize)]
struct RequestDTO {
    id: String,
    status: RequestStatusDTO,
    // Other fields omitted for brevity
}

#[derive(CandidType, Serialize, Deserialize)]
enum RequestStatusDTO {
    Created,
    Approved,
    Rejected,
    Scheduled,
    Processing,
    Completed,
    Failed,
    Cancelled,
}

// Result types
type RequestResult = Result<RequestDTO, ApiError>;

#[derive(CandidType, Serialize, Deserialize)]
enum CreateRequestResult {
    Ok(RequestResult),
    Err(ApiError),
}
```

### Phase 2: Core Function Implementation

Add this function to `orbit_integration.rs`:

```rust
pub async fn add_operator_to_station(
    station_id: Principal,
    operator_name: String,
    operator_principal: Principal,
) -> Result<String, String> {
    // Create the add user operation
    let add_user_operation = AddUserOperationInput {
        name: operator_name.clone(),
        identities: vec![operator_principal],
        groups: vec![OPERATOR_GROUP_ID], // Add as operator
        status: UserStatusDTO::Active,
    };

    // Create the request input
    let request_input = CreateRequestInput {
        operation: RequestOperationInput::AddUser(add_user_operation),
        title: Some(format!("Add {} as operator", operator_name)),
        summary: Some(format!(
            "Adding user {} ({}) as an operator to the station",
            operator_name, operator_principal
        )),
        execution_plan: Some(RequestExecutionSchedule::Immediate),
        expiration_dt: None,
    };

    // Make the inter-canister call to create the request
    let result: Result<(CreateRequestResult,), _> = call(
        station_id,
        "create_request",
        (request_input,)
    ).await;

    match result {
        Ok((CreateRequestResult::Ok(Ok(request)),)) => {
            // Request created successfully
            // Since we're the admin, it should auto-approve and execute
            match request.status {
                RequestStatusDTO::Completed => {
                    Ok(format!("Successfully added {} as operator", operator_name))
                }
                RequestStatusDTO::Failed => {
                    Err(format!("Request failed to execute"))
                }
                status => {
                    Ok(format!("Request created with status: {:?}", status))
                }
            }
        }
        Ok((CreateRequestResult::Ok(Err(api_error)),)) => {
            Err(format!("Station API error: {} - {:?}", api_error.code, api_error.message))
        }
        Ok((CreateRequestResult::Err(api_error),)) => {
            Err(format!("Request creation error: {} - {:?}", api_error.code, api_error.message))
        }
        Err((code, msg)) => {
            Err(format!("Inter-canister call failed: {:?} - {}", code, msg))
        }
    }
}
```

### Phase 3: State Management

Add station tracking to maintain a registry of created stations:

```rust
use std::collections::HashMap;

thread_local! {
    // Map of station_id -> (name, created_at, operators)
    static CREATED_STATIONS: RefCell<HashMap<Principal, StationRecord>> = RefCell::new(HashMap::new());
}

#[derive(CandidType, Serialize, Deserialize, Clone)]
struct StationRecord {
    name: String,
    created_at: u64,
    operators: Vec<Principal>,
}

// Update the open_station function to track created stations
pub async fn open_station(station_name: String) -> Result<Principal, String> {
    // ... existing implementation ...
    
    // After successful creation, add to registry
    match result {
        Ok((DeployStationResult::Ok { canister_id },)) => {
            CREATED_STATIONS.with(|stations| {
                stations.borrow_mut().insert(
                    canister_id,
                    StationRecord {
                        name: station_name,
                        created_at: ic_cdk::api::time(),
                        operators: vec![],
                    }
                );
            });
            Ok(canister_id)
        }
        // ... error handling ...
    }
}

// Helper function to check if we created a station
fn is_our_station(station_id: &Principal) -> bool {
    CREATED_STATIONS.with(|stations| {
        stations.borrow().contains_key(station_id)
    })
}

// Update operator list when adding
fn record_operator_addition(station_id: &Principal, operator: Principal) {
    CREATED_STATIONS.with(|stations| {
        if let Some(record) = stations.borrow_mut().get_mut(station_id) {
            if !record.operators.contains(&operator) {
                record.operators.push(operator);
            }
        }
    });
}
```

### Phase 4: Public API Implementation

Add to `lib.rs`:

```rust
#[update]
async fn add_dao_operator(
    station_id: String,
    operator_principal: String,
    operator_name: String,
) -> Result<String, String> {
    // Parse and validate inputs
    let station_principal = Principal::from_text(&station_id)
        .map_err(|_| "Invalid station ID format".to_string())?;
    
    let operator = Principal::from_text(&operator_principal)
        .map_err(|_| "Invalid operator principal format".to_string())?;
    
    // Verify we created this station
    if !orbit_integration::is_our_station(&station_principal) {
        return Err("Station not found or not managed by this canister".to_string());
    }
    
    // Validate operator name
    if operator_name.is_empty() || operator_name.len() > 100 {
        return Err("Operator name must be between 1 and 100 characters".to_string());
    }
    
    // Call the integration function
    match orbit_integration::add_operator_to_station(
        station_principal,
        operator_name,
        operator
    ).await {
        Ok(message) => {
            orbit_integration::record_operator_addition(&station_principal, operator);
            Ok(message)
        }
        Err(e) => Err(e)
    }
}

#[query]
fn get_station_operators(station_id: String) -> Result<Vec<String>, String> {
    let station_principal = Principal::from_text(&station_id)
        .map_err(|_| "Invalid station ID format".to_string())?;
    
    orbit_integration::get_station_operators(&station_principal)
}
```

### Phase 5: Update Candid Interface

Add to `daopad_backend.did`:

```candid
type Result = variant { Ok : text; Err : text };
type Result_1 = variant { Ok : vec text; Err : text };

service : {
    // Existing methods...
    
    "add_dao_operator" : (text, text, text) -> (Result);
    "get_station_operators" : (text) -> (Result_1) query;
}
```

## Code Examples

### Complete Usage Example

```typescript
// Frontend code to add an operator
async function addOperatorToStation() {
    const stationId = "ryjl3-tyaaa-aaaaa-aaaba-cai";
    const operatorPrincipal = "2vxsx-fae"; // User's principal
    const operatorName = "Alice";
    
    try {
        const result = await daopadActor.add_dao_operator(
            stationId,
            operatorPrincipal,
            operatorName
        );
        
        if ('Ok' in result) {
            console.log("Success:", result.Ok);
            // User can now access the station through Orbit UI
        } else {
            console.error("Error:", result.Err);
        }
    } catch (error) {
        console.error("Failed to add operator:", error);
    }
}
```

### Error Handling Pattern

```rust
// Comprehensive error handling
pub async fn add_operator_with_retry(
    station_id: Principal,
    operator_name: String,
    operator_principal: Principal,
    max_retries: u8,
) -> Result<String, String> {
    let mut attempts = 0;
    
    loop {
        match add_operator_to_station(station_id, operator_name.clone(), operator_principal).await {
            Ok(result) => return Ok(result),
            Err(e) if attempts < max_retries => {
                attempts += 1;
                // Wait before retry (exponential backoff)
                let delay = 1_000_000_000u64 * (2u64.pow(attempts as u32));
                ic_cdk::api::call::Timer::sleep(delay).await;
                continue;
            }
            Err(e) => return Err(format!("Failed after {} attempts: {}", attempts + 1, e)),
        }
    }
}
```

### Batch Addition Example

```rust
// Add multiple operators in one go
pub async fn add_multiple_operators(
    station_id: Principal,
    operators: Vec<(String, Principal)>, // (name, principal)
) -> Vec<Result<String, String>> {
    let mut results = Vec::new();
    
    for (name, principal) in operators {
        let result = add_operator_to_station(
            station_id,
            name,
            principal
        ).await;
        results.push(result);
    }
    
    results
}
```

## Testing Strategy

### Local Testing with dfx

1. **Deploy local Orbit control panel and station**:
```bash
# Deploy control panel
dfx deploy orbit_control_panel --network local

# Note the canister ID for configuration
export CONTROL_PANEL_ID=<control-panel-id>
```

2. **Deploy daopad with local control panel**:
```bash
dfx deploy daopad_backend --argument '(opt "'$CONTROL_PANEL_ID'")'
```

3. **Test station creation**:
```bash
dfx canister call daopad_backend create_dao_treasury '("Test DAO")'
```

4. **Test adding operator**:
```bash
# Get your principal
dfx identity get-principal

# Add yourself as operator
dfx canister call daopad_backend add_dao_operator \
  '("station-canister-id", "your-principal", "Your Name")'
```

### Integration Test Scenarios

```rust
#[test]
async fn test_add_operator_success() {
    // Setup
    let station_id = create_test_station().await;
    let operator = Principal::anonymous();
    
    // Test
    let result = add_operator_to_station(
        station_id,
        "Test User".to_string(),
        operator
    ).await;
    
    // Assert
    assert!(result.is_ok());
    assert!(result.unwrap().contains("Successfully"));
}

#[test]
async fn test_add_operator_invalid_station() {
    // Test with non-existent station
    let fake_station = Principal::from_text("aaaaa-aa").unwrap();
    let result = add_dao_operator(
        fake_station.to_text(),
        Principal::anonymous().to_text(),
        "Test".to_string()
    ).await;
    
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not found"));
}

#[test]
async fn test_duplicate_operator() {
    // Setup
    let station_id = create_test_station().await;
    let operator = Principal::anonymous();
    
    // Add operator first time
    let _ = add_operator_to_station(station_id, "User".to_string(), operator).await;
    
    // Try to add again
    let result = add_operator_to_station(station_id, "User".to_string(), operator).await;
    
    // Should handle gracefully (success or specific error)
    assert!(result.is_ok() || result.unwrap_err().contains("already"));
}
```

### Manual Testing Checklist

- [ ] Deploy daopad canister locally
- [ ] Create a new station via daopad
- [ ] Note the station canister ID
- [ ] Call add_dao_operator with your principal
- [ ] Open Orbit wallet UI
- [ ] Add the station using "Join existing wallet"
- [ ] Verify you can access the station as operator
- [ ] Test creating a transfer request
- [ ] Verify operator permissions are correct

## Security Considerations

### Permission Validation

1. **Station Ownership Verification**:
   - Always verify the requesting canister created the station
   - Maintain immutable registry of created stations
   - Reject operations on unknown stations

2. **Input Validation**:
   - Validate all principal formats
   - Limit operator name length
   - Sanitize text inputs

3. **Rate Limiting**:
   ```rust
   thread_local! {
       static RATE_LIMIT: RefCell<HashMap<Principal, (u64, u8)>> = RefCell::new(HashMap::new());
   }
   
   fn check_rate_limit(caller: Principal) -> Result<(), String> {
       const MAX_CALLS_PER_HOUR: u8 = 10;
       const HOUR_IN_NANOS: u64 = 3_600_000_000_000;
       
       RATE_LIMIT.with(|limits| {
           let now = ic_cdk::api::time();
           let mut map = limits.borrow_mut();
           
           match map.get_mut(&caller) {
               Some((last_reset, count)) => {
                   if now - *last_reset > HOUR_IN_NANOS {
                       *last_reset = now;
                       *count = 1;
                       Ok(())
                   } else if *count >= MAX_CALLS_PER_HOUR {
                       Err("Rate limit exceeded".to_string())
                   } else {
                       *count += 1;
                       Ok(())
                   }
               }
               None => {
                   map.insert(caller, (now, 1));
                   Ok(())
               }
           }
       })
   }
   ```

### Threat Model

1. **Unauthorized Access**:
   - Risk: Malicious actor tries to add operators to stations they don't control
   - Mitigation: Station ownership verification

2. **Principal Spoofing**:
   - Risk: Attempting to add invalid or system principals
   - Mitigation: Principal validation and blacklist

3. **Denial of Service**:
   - Risk: Flooding the system with operator addition requests
   - Mitigation: Rate limiting per caller

4. **State Corruption**:
   - Risk: Inconsistent state between daopad and station
   - Mitigation: Atomic operations and state reconciliation

## Future Enhancements

### 1. Voting-Gated Operator Addition

```rust
// Pseudo-code for voting integration
pub async fn propose_add_operator(
    station_id: Principal,
    operator: Principal,
    operator_name: String,
    proposal_threshold: u8,
) -> Result<ProposalId, String> {
    // Create proposal
    let proposal = create_proposal(
        ProposalType::AddOperator { station_id, operator, operator_name },
        proposal_threshold
    ).await?;
    
    // Return proposal ID for tracking
    Ok(proposal.id)
}

pub async fn execute_approved_proposal(proposal_id: ProposalId) -> Result<(), String> {
    let proposal = get_proposal(proposal_id)?;
    
    if !proposal.is_approved() {
        return Err("Proposal not approved".to_string());
    }
    
    match proposal.proposal_type {
        ProposalType::AddOperator { station_id, operator, operator_name } => {
            add_operator_to_station(station_id, operator_name, operator).await
        }
        _ => Err("Invalid proposal type".to_string())
    }
}
```

### 2. Role-Based Permissions

```rust
#[derive(CandidType, Serialize, Deserialize)]
enum DaoRole {
    Treasurer,      // Full operator permissions
    Auditor,        // Read-only access
    Contributor,    // Limited transaction creation
}

pub async fn add_user_with_role(
    station_id: Principal,
    user: Principal,
    name: String,
    role: DaoRole,
) -> Result<String, String> {
    let groups = match role {
        DaoRole::Treasurer => vec![OPERATOR_GROUP_ID],
        DaoRole::Auditor => vec![create_custom_group("Auditor", READ_PERMISSIONS).await?],
        DaoRole::Contributor => vec![create_custom_group("Contributor", LIMITED_PERMISSIONS).await?],
    };
    
    // Add user with appropriate groups
    add_user_to_station_with_groups(station_id, name, user, groups).await
}
```

### 3. Batch Operations

```rust
pub async fn batch_add_operators(
    operations: Vec<AddOperatorRequest>,
) -> BatchResult {
    let mut results = BatchResult::new();
    
    for op in operations {
        let result = add_operator_to_station(
            op.station_id,
            op.operator_name,
            op.operator_principal
        ).await;
        
        match result {
            Ok(msg) => results.successes.push((op.operator_principal, msg)),
            Err(e) => results.failures.push((op.operator_principal, e)),
        }
    }
    
    results
}
```

### 4. Operator Removal

```rust
pub async fn remove_operator_from_station(
    station_id: Principal,
    operator_principal: Principal,
) -> Result<String, String> {
    // Create remove user request
    let request_input = CreateRequestInput {
        operation: RequestOperationInput::EditUser(EditUserOperationInput {
            user_id: get_user_id(station_id, operator_principal).await?,
            status: Some(UserStatusDTO::Inactive),
            // Other fields unchanged
        }),
        // ... rest of request
    };
    
    // Execute request
    // Update local registry
}
```

## Appendices

### Appendix A: Quick Reference

**Group IDs**:
```rust
ADMIN_GROUP_ID: [0, 0, 0, 0, 0, 0, 64, 0, 128, 0, 0, 0, 0, 0, 0, 0]
OPERATOR_GROUP_ID: [0, 0, 0, 0, 0, 0, 64, 0, 128, 0, 0, 0, 0, 0, 0, 1]
```

**UUID String Format**:
- Admin: "00000000-0000-4000-8000-000000000000"
- Operator: "00000000-0000-4000-8000-000000000001"

**Common Error Codes**:
- `STATION_NOT_FOUND`: Invalid station ID
- `PERMISSION_DENIED`: Caller lacks required permissions
- `USER_ALREADY_EXISTS`: Principal already associated with a user
- `INVALID_INPUT`: Malformed request data

### Appendix B: Troubleshooting

**"Failed to call station" Error**:
1. Verify station canister is running
2. Check station ID is correct
3. Ensure canister has sufficient cycles

**"Permission denied" Error**:
1. Verify daopad canister is admin of the station
2. Check request permissions in station settings
3. Ensure user management permissions are set correctly

**User can't access station after addition**:
1. Verify operator group exists in station
2. Check user status is Active
3. Ensure user refreshes their station list in UI
4. Verify principal matches exactly

### Appendix C: External References

- [Orbit Documentation](https://docs.orbitchain.io/)
- [Internet Computer Candid Reference](https://internetcomputer.org/docs/current/references/candid-ref)
- [Principal Format Specification](https://internetcomputer.org/docs/current/references/id-encoding-spec)

### Appendix D: Migration Guide

For existing daopad deployments that need to add this functionality:

1. **Upgrade Strategy**:
   ```bash
   # Build new version
   dfx build daopad_backend
   
   # Upgrade canister
   dfx canister install daopad_backend --mode upgrade
   ```

2. **State Migration**:
   - Existing stations remain unchanged
   - New tracking only applies to future stations
   - Consider batch import of existing stations

3. **Backward Compatibility**:
   - All existing functions remain unchanged
   - New functions are additive only
   - No breaking changes to public API

---

*Document Version: 1.0*  
*Last Updated: [Current Date]*  
*Author: Daopad Development Team*