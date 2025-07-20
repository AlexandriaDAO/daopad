# Orbit Integration Guide for Daopad

This document provides comprehensive technical information for integrating Orbit station creation into the Daopad backend canister.

## Table of Contents

1. [Overview](#overview)
2. [Control Panel API Reference](#control-panel-api-reference)
3. [Integration Guide](#integration-guide)
4. [Station Deployment Process](#station-deployment-process)
5. [Code Examples](#code-examples)
6. [Technical Details](#technical-details)

## Overview

Orbit is a blockchain platform layer for the Internet Computer Protocol (ICP) that provides institutional-grade multi-custody wallets called "stations". Stations can be created and managed by any principal, including backend canisters.

### Key Components

- **Control Panel Canister**: Manages user registration and station deployment
  - Production ID: `5mxvd-qaaaa-aaaal-ajbkq-cai`
  - Handles authentication, quotas, and deployment orchestration
  
- **Station Canister**: The actual multi-custody wallet
  - Deployed dynamically by the control panel
  - Supports multi-user management, approval workflows, and asset management
  
- **Upgrader Canister**: Manages station lifecycle and upgrades
  - Deployed alongside each station
  - Acts as the station's controller

## Control Panel API Reference

### Production Canister IDs

```
Control Panel: 5mxvd-qaaaa-aaaal-ajbkq-cai
```

### Key Types

```candid
// Core identity types
type StationID = principal;
type UserIdentityID = principal;
type UUID = text;
type UserId = UUID;
type TimestampRFC3339 = text;

// Error handling
type ApiError = record {
  code : text;
  message : opt text;
  details : opt vec record { text; text };
};

// User and station types
type User = record {
  identity : principal;
  subscription_status : UserSubscriptionStatus;
  last_active : TimestampRFC3339;
};

type UserSubscriptionStatus = variant {
  Unsubscribed;
  Pending;
  Approved;
  Denylisted;
};

type UserStation = record {
  canister_id : StationID;
  name : text;
  labels : vec text;
};

// Deployment types
type DeployStationAdminUserInput = record {
  username : text;
  identity : principal;
};

type DeployStationInput = record {
  name : text;
  admins : vec DeployStationAdminUserInput;
  associate_with_caller : opt record {
    labels : vec text;
  };
  subnet_selection : opt SubnetSelection;
};

type SubnetSelection = variant {
  Subnet : record { subnet : principal; };
  Filter : SubnetFilter;
};

type SubnetFilter = record {
  subnet_type : opt text;
};
```

### Service Methods

#### 1. Register User
```candid
register_user : (RegisterUserInput) -> (RegisterUserResult);
```
Registers a new user (can be a canister) with the control panel.

```candid
type RegisterUserInput = record {
  station : opt UserStation;
};

type RegisterUserResult = variant {
  Ok : record { user : User; };
  Err : ApiError;
};
```

#### 2. Deploy Station
```candid
deploy_station : (DeployStationInput) -> (DeployStationResult);
```
Deploys a new station canister.

```candid
type DeployStationResult = variant {
  Ok : record { canister_id : StationID; };
  Err : ApiError;
};
```

#### 3. Check Deployment Eligibility
```candid
can_deploy_station : () -> (CanDeployStationResult) query;
```
Checks if the caller can deploy a station.

```candid
type CanDeployStationResponse = variant {
  NotAllowed : UserSubscriptionStatus;
  Allowed : nat64;
  QuotaExceeded;
};
```

#### 4. Manage User Stations
```candid
manage_user_stations : (ManageUserStationsInput) -> (ManageUserStationsResult);
```
Add, remove, or update stations associated with the user.

```candid
type ManageUserStationsInput = variant {
  Add : vec UserStation;
  Remove : vec StationID;
  Update : vec record {
    index : opt nat64;
    station : UserStation;
  };
};
```

## Integration Guide

### Making Inter-Canister Calls

To interact with the Orbit control panel from your backend canister, you'll need to make inter-canister calls.

#### 1. Add Dependencies

Update your `Cargo.toml`:
```toml
[dependencies]
candid = "0.10"
ic-cdk = "0.17"
serde = "1.0"
serde_bytes = "0.11"
```

#### 2. Define Types

Create the necessary type definitions in your canister:

```rust
use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ApiError {
    pub code: String,
    pub message: Option<String>,
    pub details: Option<Vec<(String, String)>>,
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct RegisterUserInput {
    pub station: Option<UserStation>,
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct UserStation {
    pub canister_id: Principal,
    pub name: String,
    pub labels: Vec<String>,
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct DeployStationInput {
    pub name: String,
    pub admins: Vec<DeployStationAdminUserInput>,
    pub associate_with_caller: Option<AssociateWithCallerInput>,
    pub subnet_selection: Option<SubnetSelection>,
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct DeployStationAdminUserInput {
    pub username: String,
    pub identity: Principal,
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct AssociateWithCallerInput {
    pub labels: Vec<String>,
}

#[derive(CandidType, Serialize, Deserialize)]
pub enum RegisterUserResult {
    Ok { user: User },
    Err(ApiError),
}

#[derive(CandidType, Serialize, Deserialize)]
pub enum DeployStationResult {
    Ok { canister_id: Principal },
    Err(ApiError),
}
```

#### 3. Make Inter-Canister Calls

```rust
use ic_cdk::call;

const CONTROL_PANEL_ID: &str = "5mxvd-qaaaa-aaaal-ajbkq-cai";

pub async fn register_with_control_panel() -> Result<User, String> {
    let control_panel = Principal::from_text(CONTROL_PANEL_ID)
        .map_err(|e| format!("Invalid principal: {}", e))?;
    
    let args = RegisterUserInput { station: None };
    
    let result: Result<(RegisterUserResult,), _> = call(
        control_panel,
        "register_user",
        (args,)
    ).await;
    
    match result {
        Ok((RegisterUserResult::Ok { user },)) => Ok(user),
        Ok((RegisterUserResult::Err(api_error),)) => Err(format!("API Error: {}", api_error.code)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}

pub async fn deploy_orbit_station(name: String, admins: Vec<(String, Principal)>) -> Result<Principal, String> {
    let control_panel = Principal::from_text(CONTROL_PANEL_ID)
        .map_err(|e| format!("Invalid principal: {}", e))?;
    
    let admin_inputs: Vec<DeployStationAdminUserInput> = admins
        .into_iter()
        .map(|(username, identity)| DeployStationAdminUserInput { username, identity })
        .collect();
    
    let args = DeployStationInput {
        name,
        admins: admin_inputs,
        associate_with_caller: Some(AssociateWithCallerInput { labels: vec![] }),
        subnet_selection: None,
    };
    
    let result: Result<(DeployStationResult,), _> = call(
        control_panel,
        "deploy_station",
        (args,)
    ).await;
    
    match result {
        Ok((DeployStationResult::Ok { canister_id },)) => Ok(canister_id),
        Ok((DeployStationResult::Err(api_error),)) => Err(format!("API Error: {}", api_error.code)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}
```

## Station Deployment Process

### Complete Deployment Flow

1. **User Registration** (if not already registered)
   - Call `register_user` to register the canister as a user
   - This is required before deploying stations

2. **Check Deployment Eligibility**
   - Call `can_deploy_station` to verify deployment is allowed
   - Check subscription status and quota

3. **Deploy Station**
   - Call `deploy_station` with:
     - Station name
     - Initial admin users (at least one required)
     - Optional: associate with caller
     - Optional: subnet selection

4. **Station Initialization**
   The control panel automatically:
   - Creates the station canister
   - Deploys an upgrader canister
   - Installs station code with initial configuration
   - Sets up controllers: [upgrader, NNS_ROOT]
   - Initializes with specified admins

5. **Post-Deployment**
   - Station is immediately ready for use
   - Can be accessed via the returned canister ID
   - Admins can manage through the Orbit web interface

### Station Configuration

Stations are initialized with one of three modes:

- **WithAllDefaults**: Complete setup with default policies, accounts, and assets
- **WithDefaultPolicies**: Custom accounts/assets but default approval policies  
- **Complete**: Fully custom configuration

### Required Parameters

- **name**: Station display name (e.g., "DAO Treasury")
- **admins**: At least one admin with:
  - username: Display name for the admin
  - identity: Principal ID of the admin

## Code Examples

### Complete Integration Example

```rust
use ic_cdk_macros::{update, query};

#[update]
async fn create_dao_with_orbit_wallet(dao_name: String) -> Result<DaoInfo, String> {
    // Step 1: Register this canister as a user (only needed once)
    let user = register_with_control_panel().await?;
    
    // Step 2: Check if we can deploy
    let can_deploy = check_deployment_eligibility().await?;
    match can_deploy {
        CanDeployStationResponse::Allowed(remaining) => {
            ic_cdk::println!("Can deploy {} more stations", remaining);
        }
        CanDeployStationResponse::NotAllowed(status) => {
            return Err(format!("Not allowed to deploy: {:?}", status));
        }
        CanDeployStationResponse::QuotaExceeded => {
            return Err("Deployment quota exceeded".to_string());
        }
    }
    
    // Step 3: Deploy the station
    let station_name = format!("{} Treasury", dao_name);
    let admin_principal = ic_cdk::caller(); // Or use specific DAO member principals
    
    let station_id = deploy_orbit_station(
        station_name.clone(),
        vec![("DAO Admin".to_string(), admin_principal)]
    ).await?;
    
    // Step 4: Store the station info
    let dao_info = DaoInfo {
        name: dao_name,
        orbit_station_id: station_id,
        created_at: ic_cdk::api::time(),
    };
    
    // Store in your canister's state...
    
    Ok(dao_info)
}
```

### Adding Members to Existing Station

After deployment, new members must be added through the station's governance system:

```rust
// This would be done through the Station canister API, not Control Panel
// Members with appropriate permissions can submit "add user" requests
// which go through the station's approval process
```

### Querying User Stations

```rust
pub async fn list_my_stations() -> Result<Vec<UserStation>, String> {
    let control_panel = Principal::from_text(CONTROL_PANEL_ID)
        .map_err(|e| format!("Invalid principal: {}", e))?;
    
    let args = ListUserStationsInput {
        filter_by_labels: None,
    };
    
    let result: Result<(ListUserStationsResult,), _> = call(
        control_panel,
        "list_user_stations",
        (args,)
    ).await;
    
    match result {
        Ok((ListUserStationsResult::Ok { stations },)) => Ok(stations),
        Ok((ListUserStationsResult::Err(api_error),)) => Err(format!("API Error: {}", api_error.code)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}
```

## Technical Details

### Cycle Requirements

- **Initial Station Cycles**: 1.5T cycles
- **Initial Upgrader Cycles**: 1.0T cycles  
- **Canister Creation**: 500B cycles
- **Total per deployment**: ~3T cycles

The control panel handles cycle management automatically.

### Subnet Selection

By default, stations deploy to the same subnet as the control panel. Options:

```rust
// Default (same subnet as control panel)
subnet_selection: None,

// Specific subnet
subnet_selection: Some(SubnetSelection::Subnet { 
    subnet: Principal::from_text("subnet_id").unwrap() 
}),

// Filter by type (e.g., "fiduciary" for high-replication subnets)
subnet_selection: Some(SubnetSelection::Filter(SubnetFilter {
    subnet_type: Some("fiduciary".to_string()),
})),
```

### Error Handling

Common error codes:
- `"UNAUTHORIZED"`: Caller not registered or not allowed
- `"QUOTA_EXCEEDED"`: Deployment limit reached
- `"INSUFFICIENT_CYCLES"`: Not enough cycles for deployment
- `"INVALID_INPUT"`: Malformed request parameters

### Security Considerations

1. **Controller Management**: Stations are controlled by their upgrader canister and NNS root
2. **Admin Permissions**: Initial admins have full control - choose carefully
3. **Anonymous Principals**: Cannot register or deploy stations
4. **Rate Limiting**: Enforced per user per day

### Best Practices

1. **Always check deployment eligibility** before attempting deployment
2. **Handle all error cases** - the API uses variant returns
3. **Store station IDs** securely in your canister's state
4. **Use descriptive station names** for easy identification
5. **Plan admin structure** carefully - initial admins have full control

### Integration Testing

For local testing:
1. Deploy a local instance of Orbit (see Orbit repo)
2. Use the local control panel canister ID instead of production
3. Test full deployment flow before mainnet deployment

This completes the technical documentation for integrating Orbit station creation into the Daopad backend canister.