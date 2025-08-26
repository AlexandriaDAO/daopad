# Complete Orbit Station User Registration Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Complete Type Definitions](#complete-type-definitions)
4. [Inter-Canister Interfaces](#inter-canister-interfaces)
5. [Implementation Code](#implementation-code)
6. [Candid Interface Definitions](#candid-interface-definitions)
7. [Constants and Configuration](#constants-and-configuration)
8. [Implementation Plan](#implementation-plan)
9. [Testing Guide](#testing-guide)

## Overview

This document provides complete implementation details for allowing users with 1,000+ staked ALEX tokens to automatically register as operators in the Alexandria DAO Orbit Station.

### Key Components
- **DAOPad Backend** (`lwsav-iiaaa-aaaap-qp2qq-cai`): Admin of Orbit Station
- **Orbit Station** (`fec7w-zyaaa-aaaaa-qaffq-cai`): DAO governance platform
- **ICP Swap** (`54fqz-5iaaa-aaaap-qkmqa-cai`): Holds ALEX staking data
- **ALEX Token** (`ysy5f-2qaaa-aaaap-qkmmq-cai`): Governance token

## Architecture

### Registration Flow
1. User clicks "Register for DAO Access" in frontend
2. Backend verifies user has ≥1,000 staked ALEX tokens
3. Backend creates an AddUser request in Orbit Station
4. Request auto-approves (backend is admin)
5. User gains access to view/interact with proposals

### Key Requirements
- **Minimum Stake**: 1,000 ALEX tokens (100,000,000,000 e8s)
- **Auto-Approval**: DAOPad backend must be admin of Orbit Station
- **User Limit**: 1-10 principals per user, max 25 groups

## Complete Type Definitions

### Core Request Types

```rust
use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;
use std::collections::HashMap;

// Timestamp type alias
pub type TimestampRfc3339 = String; // RFC3339 formatted timestamp

// UUID type (for user/group IDs)
pub type UUID = String; // Hyphenated format: "00000000-0000-4000-8000-000000000000"

// ========== CREATE REQUEST TYPES ==========

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct CreateRequestInput {
    /// The operation to be performed (REQUIRED)
    pub operation: RequestOperationInput,
    /// The request title (OPTIONAL) - max 100 chars
    pub title: Option<String>,
    /// The request summary (OPTIONAL) - max 500 chars
    pub summary: Option<String>,
    /// When the request should be executed if approved (OPTIONAL)
    pub execution_plan: Option<RequestExecutionScheduleDTO>,
    /// When the request expires if still pending (OPTIONAL)
    pub expiration_dt: Option<TimestampRfc3339>,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum RequestExecutionScheduleDTO {
    Immediate,
    Scheduled { execution_time: TimestampRfc3339 },
}

// ========== USER OPERATION TYPES ==========

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct AddUserOperationInput {
    /// The user display name (REQUIRED) - max 50 characters
    pub name: String,
    /// The principals associated with the user (REQUIRED) - 1 to 10 principals
    pub identities: Vec<Principal>,
    /// The groups the user should be added to (REQUIRED) - can be empty, max 25 groups
    pub groups: Vec<String>, // UUIDs as hyphenated strings
    /// The user status (REQUIRED)
    pub status: UserStatusDTO,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum UserStatusDTO {
    Active,
    Inactive,
}

// ========== REQUEST OPERATION ENUM ==========

#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum RequestOperationInput {
    Transfer(TransferOperationInput),
    AddAccount(AddAccountOperationInput),
    EditAccount(EditAccountOperationInput),
    AddAddressBookEntry(AddAddressBookEntryOperationInput),
    EditAddressBookEntry(EditAddressBookEntryOperationInput),
    RemoveAddressBookEntry(RemoveAddressBookEntryOperationInput),
    AddUser(AddUserOperationInput), // ← This is what we need
    EditUser(EditUserOperationInput),
    AddUserGroup(AddUserGroupOperationInput),
    EditUserGroup(EditUserGroupOperationInput),
    RemoveUserGroup(RemoveUserGroupOperationInput),
    SystemUpgrade(SystemUpgradeOperationInput),
    SystemRestore(SystemRestoreOperationInput),
    SetDisasterRecovery(SetDisasterRecoveryOperationInput),
    ChangeExternalCanister(ChangeExternalCanisterOperationInput),
    CreateExternalCanister(CreateExternalCanisterOperationInput),
    ConfigureExternalCanister(ConfigureExternalCanisterOperationInput),
    CallExternalCanister(CallExternalCanisterOperationInput),
    FundExternalCanister(FundExternalCanisterOperationInput),
    MonitorExternalCanister(MonitorExternalCanisterOperationInput),
    SnapshotExternalCanister(SnapshotExternalCanisterOperationInput),
    RestoreExternalCanister(RestoreExternalCanisterOperationInput),
    PruneExternalCanister(PruneExternalCanisterOperationInput),
    EditPermission(EditPermissionOperationInput),
    AddRequestPolicy(AddRequestPolicyOperationInput),
    EditRequestPolicy(EditRequestPolicyOperationInput),
    RemoveRequestPolicy(RemoveRequestPolicyOperationInput),
    ManageSystemInfo(ManageSystemInfoOperationInput),
    AddAsset(AddAssetOperationInput),
    EditAsset(EditAssetOperationInput),
    RemoveAsset(RemoveAssetOperationInput),
    AddNamedRule(AddNamedRuleOperationInput),
    EditNamedRule(EditNamedRuleOperationInput),
    RemoveNamedRule(RemoveNamedRuleOperationInput),
}

// Note: Define only the operation input types you need. For AddUser, we only need AddUserOperationInput above.
// Other operation input types would be defined similarly if needed.

// ========== RESPONSE TYPES ==========

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct CreateRequestResponse {
    /// The request that was created
    pub request: RequestDTO,
    /// The privileges of the caller
    pub privileges: RequestCallerPrivilegesDTO,
    /// Additional information about the request
    pub additional_info: RequestAdditionalInfoDTO,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct RequestDTO {
    pub id: String, // UUID as hyphenated string
    pub title: String,
    pub summary: Option<String>,
    pub operation: RequestOperationDTO, // Note: Different from Input
    pub requested_by: String, // User UUID
    pub approvals: Vec<RequestApprovalDTO>,
    pub created_at: TimestampRfc3339,
    pub status: RequestStatusDTO,
    pub expiration_dt: TimestampRfc3339,
    pub execution_plan: RequestExecutionScheduleDTO,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum RequestStatusDTO {
    Created,
    Approved,
    Rejected,
    Cancelled { reason: Option<String> },
    Scheduled { scheduled_at: TimestampRfc3339 },
    Processing { started_at: TimestampRfc3339 },
    Completed { completed_at: TimestampRfc3339 },
    Failed { reason: Option<String> },
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct RequestApprovalDTO {
    pub user_id: String,
    pub decided_at: TimestampRfc3339,
    pub decision: RequestApprovalStatusDTO,
    pub reason: Option<String>,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum RequestApprovalStatusDTO {
    Approved,
    Rejected,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct RequestCallerPrivilegesDTO {
    pub id: String,
    pub can_approve: bool,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct RequestAdditionalInfoDTO {
    pub id: String,
    pub requester_name: String,
    pub approvers: Vec<DisplayUserDTO>,
    pub evaluation_result: Option<RequestEvaluationResultDTO>,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct DisplayUserDTO {
    pub id: String,
    pub name: String,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct RequestEvaluationResultDTO {
    // Simplified - actual structure contains rule evaluation details
}

// Note: RequestOperationDTO is the response version with full operation details
#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum RequestOperationDTO {
    AddUser(AddUserOperationDTO),
    // ... other variants
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct AddUserOperationDTO {
    pub user_id: Option<String>,
    pub input: AddUserOperationInput,
}

// ========== ERROR TYPES ==========

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct ApiErrorDTO {
    pub code: String,
    pub message: String,
    pub details: Option<HashMap<String, String>>,
}

// Common error codes:
// - "IDENTITY_ALREADY_HAS_USER": Principal already associated with another user
// - "USER_NOT_FOUND": User does not exist
// - "UNAUTHORIZED": Caller lacks permission
// - "VALIDATION_ERROR": Input validation failed
```

### Pagination Types

```rust
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct PaginationInput {
    pub offset: Option<u64>,
    pub limit: Option<u16>,
}
```

## Inter-Canister Interfaces

### ICP Swap Canister Interface

```rust
// For canister: 54fqz-5iaaa-aaaap-qkmqa-cai

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct Stake {
    pub amount: candid::Nat, // Amount staked in e8s
    pub time: u64,            // Timestamp when staked (nanoseconds)
}

// Get stake for a principal
pub async fn get_alex_stake(user_principal: Principal) -> Result<Option<Stake>, String> {
    let icp_swap_id = Principal::from_text("54fqz-5iaaa-aaaap-qkmqa-cai")
        .map_err(|e| format!("Invalid ICP Swap ID: {:?}", e))?;
    
    let result: Result<(Option<Stake>,), _> = ic_cdk::call(
        icp_swap_id,
        "get_stake",
        (user_principal,)
    ).await;

    match result {
        Ok((stake_opt,)) => Ok(stake_opt),
        Err((code, msg)) => Err(format!("Get stake failed: {:?} - {}", code, msg))
    }
}

// Check if user has minimum stake (1,000 ALEX = 100,000,000,000 e8s)
pub async fn check_minimum_stake(user_principal: Principal) -> Result<bool, String> {
    const MINIMUM_STAKE_E8S: u128 = 100_000_000_000; // 1,000 ALEX
    
    let stake_opt = get_alex_stake(user_principal).await?;
    
    match stake_opt {
        Some(stake) => {
            // Convert Nat to u128 for comparison
            let amount_str = stake.amount.to_string();
            let amount = amount_str.parse::<u128>()
                .map_err(|e| format!("Failed to parse stake amount: {}", e))?;
            Ok(amount >= MINIMUM_STAKE_E8S)
        },
        None => Ok(false),
    }
}
```

### Orbit Station Interface

```rust
// For canister: fec7w-zyaaa-aaaaa-qaffq-cai

pub async fn create_user_in_orbit(
    user_name: String,
    user_principal: Principal,
    is_admin: bool,
) -> Result<String, String> {
    let orbit_station_id = Principal::from_text("fec7w-zyaaa-aaaaa-qaffq-cai")
        .map_err(|e| format!("Invalid Orbit Station ID: {:?}", e))?;
    
    // Determine groups based on role
    let groups = if is_admin {
        vec!["00000000-0000-4000-8000-000000000000".to_string()] // Admin group UUID
    } else {
        vec![] // No groups for basic users
    };
    
    // Create the add user operation
    let add_user_op = AddUserOperationInput {
        name: user_name,
        identities: vec![user_principal],
        groups,
        status: UserStatusDTO::Active,
    };
    
    // Create the request
    let create_request = CreateRequestInput {
        operation: RequestOperationInput::AddUser(add_user_op),
        title: Some("Add user via DAOPad".to_string()),
        summary: Some("Automated user registration through DAOPad backend".to_string()),
        execution_plan: Some(RequestExecutionScheduleDTO::Immediate),
        expiration_dt: None, // No expiration
    };
    
    // Make the inter-canister call
    let result: Result<(Result<CreateRequestResponse, ApiErrorDTO>,), _> =
        ic_cdk::call(orbit_station_id, "create_request", (create_request,)).await;
    
    match result {
        Ok((Ok(response),)) => {
            // Return the request ID
            Ok(response.request.id)
        },
        Ok((Err(api_error),)) => {
            // Handle specific error codes
            match api_error.code.as_str() {
                "IDENTITY_ALREADY_HAS_USER" => {
                    Err("User already registered in Orbit Station".to_string())
                },
                _ => Err(format!("Orbit API Error [{}]: {}", api_error.code, api_error.message))
            }
        },
        Err((rejection_code, msg)) => {
            Err(format!("Inter-canister call failed: {:?} - {}", rejection_code, msg))
        }
    }
}
```

## Implementation Code

### Complete Backend Implementation

```rust
// File: src/daopad_backend/src/lib.rs

use std::cell::RefCell;
use std::collections::HashMap;
use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::{init, query, update};

// Import the types from alexandria_dao module
mod alexandria_dao;

// ========== STATE MANAGEMENT ==========

#[derive(CandidType, Deserialize, Clone)]
pub struct RegistrationInfo {
    pub request_id: String,
    pub timestamp: u64,
    pub staked_amount: u128,
    pub user_name: String,
}

thread_local! {
    // Track registered users to prevent duplicates
    static REGISTERED_USERS: RefCell<HashMap<Principal, RegistrationInfo>> = 
        RefCell::new(HashMap::new());
    
    // Store Alexandria Station ID
    static ALEXANDRIA_STATION_ID: RefCell<Option<String>> = RefCell::new(None);
    
    // Configuration
    static MINIMUM_STAKE: RefCell<u128> = RefCell::new(100_000_000_000); // 1,000 ALEX in e8s
}

// ========== INITIALIZATION ==========

#[init]
fn init(alexandria_station_id: Option<String>) {
    if let Some(station_id) = alexandria_station_id {
        ALEXANDRIA_STATION_ID.with(|id| *id.borrow_mut() = Some(station_id));
    }
}

// ========== MAIN REGISTRATION FUNCTION ==========

#[update]
async fn register_as_orbit_operator() -> Result<RegistrationResult, String> {
    // Get caller's principal
    let caller = ic_cdk::caller();
    
    // Check if anonymous
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }
    
    // Check if already registered
    let existing = REGISTERED_USERS.with(|users| {
        users.borrow().get(&caller).cloned()
    });
    
    if let Some(info) = existing {
        return Ok(RegistrationResult::AlreadyRegistered {
            request_id: info.request_id,
            registered_at: info.timestamp,
        });
    }
    
    // Check staking balance
    let stake_info = get_alex_stake(caller).await
        .map_err(|e| format!("Failed to check stake: {}", e))?;
    
    let staked_amount = match stake_info {
        Some(stake) => {
            let amount_str = stake.amount.to_string();
            amount_str.parse::<u128>()
                .map_err(|e| format!("Failed to parse stake amount: {}", e))?
        },
        None => 0u128,
    };
    
    // Check minimum stake requirement
    let min_stake = MINIMUM_STAKE.with(|s| *s.borrow());
    if staked_amount < min_stake {
        return Ok(RegistrationResult::InsufficientStake {
            current: staked_amount,
            required: min_stake,
        });
    }
    
    // Generate user name (first 5 and last 3 of principal)
    let principal_text = caller.to_text();
    let user_name = format!(
        "DAO Member {}...{}",
        &principal_text[..5.min(principal_text.len())],
        &principal_text[principal_text.len().saturating_sub(3)..]
    );
    
    // Create user in Orbit Station
    let request_id = create_user_in_orbit(
        user_name.clone(),
        caller,
        false, // Not admin by default
    ).await?;
    
    // Record registration
    let registration_info = RegistrationInfo {
        request_id: request_id.clone(),
        timestamp: ic_cdk::api::time(),
        staked_amount,
        user_name,
    };
    
    REGISTERED_USERS.with(|users| {
        users.borrow_mut().insert(caller, registration_info);
    });
    
    Ok(RegistrationResult::Success {
        request_id,
        message: "Successfully registered as Orbit operator".to_string(),
    })
}

// ========== QUERY FUNCTIONS ==========

#[query]
fn check_registration_status() -> RegistrationStatus {
    let caller = ic_cdk::caller();
    
    let registration = REGISTERED_USERS.with(|users| {
        users.borrow().get(&caller).cloned()
    });
    
    let min_stake = MINIMUM_STAKE.with(|s| *s.borrow());
    
    match registration {
        Some(info) => RegistrationStatus {
            is_registered: true,
            request_id: Some(info.request_id),
            staked_amount: info.staked_amount,
            required_stake: min_stake,
            user_name: Some(info.user_name),
        },
        None => RegistrationStatus {
            is_registered: false,
            request_id: None,
            staked_amount: 0,
            required_stake: min_stake,
            user_name: None,
        }
    }
}

#[query]
fn get_required_stake_amount() -> u128 {
    MINIMUM_STAKE.with(|s| *s.borrow())
}

#[query]
fn list_registered_users() -> Vec<(String, RegistrationInfo)> {
    REGISTERED_USERS.with(|users| {
        users.borrow()
            .iter()
            .map(|(principal, info)| (principal.to_text(), info.clone()))
            .collect()
    })
}

// ========== ADMIN FUNCTIONS ==========

#[update]
fn set_minimum_stake(amount: u128) -> Result<String, String> {
    // Only allow canister controllers to change this
    let caller = ic_cdk::caller();
    
    // In production, add proper authorization check here
    // For now, we'll allow any non-anonymous principal
    if caller == Principal::anonymous() {
        return Err("Unauthorized".to_string());
    }
    
    MINIMUM_STAKE.with(|s| *s.borrow_mut() = amount);
    Ok(format!("Minimum stake updated to {} e8s", amount))
}

// ========== TYPE DEFINITIONS ==========

#[derive(CandidType, Deserialize)]
pub enum RegistrationResult {
    Success {
        request_id: String,
        message: String,
    },
    AlreadyRegistered {
        request_id: String,
        registered_at: u64,
    },
    InsufficientStake {
        current: u128,
        required: u128,
    },
}

#[derive(CandidType, Deserialize)]
pub struct RegistrationStatus {
    pub is_registered: bool,
    pub request_id: Option<String>,
    pub staked_amount: u128,
    pub required_stake: u128,
    pub user_name: Option<String>,
}
```

### Validation Functions

```rust
// Validation utilities

pub fn validate_principal(principal: &Principal) -> Result<(), String> {
    if *principal == Principal::anonymous() {
        return Err("Anonymous principal not allowed".to_string());
    }
    Ok(())
}

pub fn validate_user_name(name: &str) -> Result<(), String> {
    if name.is_empty() || name.len() > 50 {
        return Err("User name must be 1-50 characters".to_string());
    }
    Ok(())
}

pub fn validate_principals(identities: &[Principal]) -> Result<(), String> {
    if identities.is_empty() || identities.len() > 10 {
        return Err("Must have 1-10 identities".to_string());
    }
    
    for identity in identities {
        validate_principal(identity)?;
    }
    
    Ok(())
}

pub fn format_e8s_to_alex(e8s: u128) -> String {
    let alex = e8s as f64 / 100_000_000.0;
    format!("{:.2} ALEX", alex)
}
```

## Candid Interface Definitions

### Complete .did File

```candid
// File: src/daopad_backend/daopad_backend.did

// ========== BASIC TYPES ==========

type TimestampRFC3339 = text;

type UserStatus = variant {
    Active;
    Inactive;
};

// ========== OPERATION INPUTS ==========

type AddUserOperationInput = record {
    name : text;
    identities : vec principal;
    groups : vec text;
    status : UserStatus;
};

type RequestExecutionSchedule = variant {
    Immediate;
    Scheduled : record { execution_time : TimestampRFC3339 };
};

type RequestOperationInput = variant {
    AddUser : AddUserOperationInput;
    // Other operations omitted for brevity
};

type CreateRequestInput = record {
    operation : RequestOperationInput;
    title : opt text;
    summary : opt text;
    execution_plan : opt RequestExecutionSchedule;
    expiration_dt : opt TimestampRFC3339;
};

// ========== API TYPES ==========

type ApiError = record {
    code : text;
    message : text;
    details : opt vec record { text; text };
};

type RequestStatus = variant {
    Created;
    Approved;
    Rejected;
    Cancelled : record { reason : opt text };
    Scheduled : record { scheduled_at : TimestampRFC3339 };
    Processing : record { started_at : TimestampRFC3339 };
    Completed : record { completed_at : TimestampRFC3339 };
    Failed : record { reason : opt text };
};

// ========== DAOPAD TYPES ==========

type RegistrationResult = variant {
    Success : record {
        request_id : text;
        message : text;
    };
    AlreadyRegistered : record {
        request_id : text;
        registered_at : nat64;
    };
    InsufficientStake : record {
        current : nat;
        required : nat;
    };
};

type RegistrationStatus = record {
    is_registered : bool;
    request_id : opt text;
    staked_amount : nat;
    required_stake : nat;
    user_name : opt text;
};

type RegistrationInfo = record {
    request_id : text;
    timestamp : nat64;
    staked_amount : nat;
    user_name : text;
};

// ========== SERVICE INTERFACE ==========

service : {
    // Registration functions
    register_as_orbit_operator : () -> (RegistrationResult);
    check_registration_status : () -> (RegistrationStatus) query;
    get_required_stake_amount : () -> (nat) query;
    list_registered_users : () -> (vec record { text; RegistrationInfo }) query;
    
    // Admin functions
    set_minimum_stake : (nat) -> (Result_1);
    
    // Existing functions
    health_check : () -> (text) query;
    get_backend_principal : () -> (text) query;
    get_alexandria_station_id : () -> (opt text) query;
    set_alexandria_station_id : (text) -> ();
    
    // Alexandria integration
    get_alexandria_config : () -> (AlexandriaConfig) query;
    get_alexandria_proposals : () -> (Result_2) query;
    get_cache_status : () -> (record { opt text; nat32 }) query;
    refresh_cache : () -> (Result_1);
};

type Result_1 = variant { Ok : text; Err : text };
type Result_2 = variant { Ok : vec ProposalSummary; Err : text };

type AlexandriaConfig = record {
    station_canister_id : text;
    backend_principal : text;
    frontend_url : text;
};

type ProposalSummary = record {
    id : text;
    title : text;
    operation_type : text;
    status : text;
    created_at : text;
    approval_count : nat32;
    required_approvals : nat32;
};
```

## Constants and Configuration

```rust
// Canister IDs
pub const ORBIT_STATION_ID: &str = "fec7w-zyaaa-aaaaa-qaffq-cai";
pub const ICP_SWAP_ID: &str = "54fqz-5iaaa-aaaap-qkmqa-cai";
pub const ALEX_TOKEN_ID: &str = "ysy5f-2qaaa-aaaap-qkmmq-cai";
pub const DAOPAD_BACKEND_ID: &str = "lwsav-iiaaa-aaaap-qp2qq-cai";
pub const DAOPAD_FRONTEND_ID: &str = "l7rlj-6aaaa-aaaaa-qaffq-cai";

// Staking Requirements
pub const MINIMUM_STAKE_ALEX: u64 = 1_000; // 1,000 ALEX tokens
pub const MINIMUM_STAKE_E8S: u128 = 100_000_000_000; // 1,000 ALEX in e8s (10^8 decimals)

// Group UUIDs
pub const ADMIN_GROUP_UUID: &str = "00000000-0000-4000-8000-000000000000";

// Validation Limits
pub const MAX_USER_NAME_LENGTH: usize = 50;
pub const MAX_IDENTITIES_PER_USER: usize = 10;
pub const MAX_GROUPS_PER_USER: usize = 25;
pub const MAX_REQUEST_TITLE_LENGTH: usize = 100;
pub const MAX_REQUEST_SUMMARY_LENGTH: usize = 500;

// Timing
pub const REQUEST_PROCESSING_INTERVAL_SECONDS: u64 = 5; // Orbit processes requests every ~5 seconds
```

## Implementation Plan

### Phase 1: Backend Core (Days 1-2)
- [ ] Add all type definitions to `alexandria_dao.rs`
- [ ] Implement ICP Swap interface for staking checks
- [ ] Implement Orbit Station interface for user creation
- [ ] Add validation functions

### Phase 2: Registration Logic (Days 3-4)
- [ ] Implement `register_as_orbit_operator` function
- [ ] Add state management for tracking registrations
- [ ] Implement duplicate prevention
- [ ] Add query functions for status checks

### Phase 3: Frontend Integration (Days 5-6)
- [ ] Add registration button to AlexandriaProposals component
- [ ] Implement registration flow in frontend
- [ ] Add loading states and error handling
- [ ] Display registration status

### Phase 4: Testing (Days 7-8)
- [ ] Test with various staking amounts
- [ ] Test duplicate registration prevention
- [ ] Test error cases
- [ ] Verify Orbit Station integration

### Phase 5: Deployment (Day 9)
- [ ] Deploy backend updates
- [ ] Deploy frontend updates
- [ ] Test on mainnet
- [ ] Monitor initial registrations

## Testing Guide

### Test Scenarios

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Valid Registration | Principal with 1,000 ALEX staked | Success with request_id |
| Insufficient Stake | Principal with 999 ALEX staked | InsufficientStake error |
| Duplicate Registration | Same principal twice | AlreadyRegistered response |
| Anonymous User | Anonymous principal | "Authentication required" error |
| Over-staked User | Principal with 10,000 ALEX | Success with request_id |
| Invalid Principal | Already registered in Orbit | "IDENTITY_ALREADY_HAS_USER" error |

### Test Commands

```bash
# Check registration status
dfx canister --network ic call daopad_backend check_registration_status

# Register as operator
dfx canister --network ic call daopad_backend register_as_orbit_operator

# Get required stake
dfx canister --network ic call daopad_backend get_required_stake_amount

# List all registered users (admin)
dfx canister --network ic call daopad_backend list_registered_users
```

### Expected Responses

```candid
// Successful registration
(
  variant {
    Success = record {
      request_id = "550e8400-e29b-41d4-a716-446655440000";
      message = "Successfully registered as Orbit operator";
    }
  }
)

// Insufficient stake
(
  variant {
    InsufficientStake = record {
      current = 50_000_000_000 : nat;
      required = 100_000_000_000 : nat;
    }
  }
)

// Already registered
(
  variant {
    AlreadyRegistered = record {
      request_id = "550e8400-e29b-41d4-a716-446655440000";
      registered_at = 1699564800000000000 : nat64;
    }
  }
)
```

## Error Handling

### Common Error Codes and Handling

```rust
pub fn handle_orbit_error(error_code: &str) -> String {
    match error_code {
        "IDENTITY_ALREADY_HAS_USER" => {
            "This principal is already registered with another user".to_string()
        },
        "USER_NOT_FOUND" => {
            "User not found in Orbit Station".to_string()
        },
        "UNAUTHORIZED" => {
            "You don't have permission to perform this action".to_string()
        },
        "VALIDATION_ERROR" => {
            "Invalid input data provided".to_string()
        },
        "RATE_LIMITED" => {
            "Too many requests, please try again later".to_string()
        },
        _ => format!("Orbit error: {}", error_code)
    }
}
```

## Notes for Implementation

1. **Auto-Approval**: Since DAOPad backend is admin, AddUser requests will auto-approve and execute immediately
2. **Request Processing**: Orbit processes requests every ~5 seconds via timer
3. **Principal Uniqueness**: Each principal can only be associated with one user
4. **Group Assignment**: Basic users get empty groups array, admins get admin group UUID
5. **Name Format**: "DAO Member {first-5}...{last-3}" of principal for auto-generated names
6. **Persistence**: Registration info is stored in canister state and survives upgrades (with proper migration)
7. **Rate Limiting**: Consider implementing rate limiting to prevent spam registrations
8. **Monitoring**: Log all registration attempts for audit trail

## Complete Working Example

```rust
// Complete example showing the full registration flow

pub async fn complete_registration_example() -> Result<(), String> {
    // 1. Get caller
    let caller = ic_cdk::caller();
    
    // 2. Validate not anonymous
    if caller == Principal::anonymous() {
        return Err("Must be authenticated".to_string());
    }
    
    // 3. Check stake
    let stake_result = get_alex_stake(caller).await?;
    let staked = match stake_result {
        Some(stake) => {
            let amount_str = stake.amount.to_string();
            amount_str.parse::<u128>().unwrap_or(0)
        },
        None => 0
    };
    
    // 4. Verify minimum
    if staked < 100_000_000_000 {
        return Err(format!(
            "Insufficient stake. Have: {}, need: 100000000000",
            staked
        ));
    }
    
    // 5. Create username
    let principal_text = caller.to_text();
    let username = format!(
        "DAO Member {}...{}",
        &principal_text[..5],
        &principal_text[principal_text.len()-3..]
    );
    
    // 6. Register in Orbit
    let orbit_station = Principal::from_text("fec7w-zyaaa-aaaaa-qaffq-cai")?;
    
    let add_user = AddUserOperationInput {
        name: username,
        identities: vec![caller],
        groups: vec![], // Basic user
        status: UserStatusDTO::Active,
    };
    
    let request = CreateRequestInput {
        operation: RequestOperationInput::AddUser(add_user),
        title: Some("Auto-registration via DAOPad".to_string()),
        summary: Some("User has 1000+ staked ALEX".to_string()),
        execution_plan: Some(RequestExecutionScheduleDTO::Immediate),
        expiration_dt: None,
    };
    
    let result: Result<(Result<CreateRequestResponse, ApiErrorDTO>,), _> =
        ic_cdk::call(orbit_station, "create_request", (request,)).await;
    
    match result {
        Ok((Ok(response),)) => {
            println!("Success! Request ID: {}", response.request.id);
            Ok(())
        },
        Ok((Err(api_error),)) => {
            Err(format!("API Error: {} - {}", api_error.code, api_error.message))
        },
        Err((code, msg)) => {
            Err(format!("Call failed: {:?} - {}", code, msg))
        }
    }
}
```

This document provides everything needed for a fresh agent to implement the complete user registration system.