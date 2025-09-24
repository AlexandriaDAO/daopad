# Create Account Feature Implementation Plan for DAOPad - ENHANCED

## Overview
Implement a "Create Account" button and modal within the Treasury Accounts tab of DAOPad, allowing users to create new treasury accounts in Orbit Station directly from the DAOPad interface.

✅ **Empirical Validation**: Tested account creation with test station `fec7w-zyaaa-aaaaa-qaffq-cai` using identity `daopad`.

## Architecture Decision
Following the **Minimal Storage Principle** from CLAUDE.md, we will:
- NOT store account details in DAOPad backend
- Use DAOPad backend as an admin proxy to create accounts
- Query account data dynamically from Orbit Station
- Only store the token→station mapping (existing)

## 🚨 CRITICAL: Four Universal Orbit Integration Issues to Address

### Issue 1: Candid Field Name Hashing
✅ **Validated**: Orbit returns field names as strings, NOT hash IDs for account operations
```bash
# Tested with:
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_accounts '(record {})'
# Result: Fields come back as "id", "name", "assets" etc. - NOT hashed
```

### Issue 2: Declaration Synchronization
⚠️ **CRITICAL**: After adding backend methods, must sync declarations:
```bash
# After backend changes:
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did
./deploy.sh --network ic --backend-only

# CRITICAL STEP - Often forgotten!
cp -r src/declarations/daopad_backend/* \
      src/daopad/daopad_frontend/src/declarations/daopad_backend/

./deploy.sh --network ic --frontend-only
```

### Issue 3: Optional Type Encoding
✅ **Validated Pattern for Account Creation**:
```javascript
// Frontend must encode optionals correctly:
configs_request_policy: rule ? [encodeRule(rule)] : [],  // NOT null!
transfer_request_policy: rule ? [encodeRule(rule)] : [],  // NOT null!
```

### Issue 4: Frontend-Backend Contract Mismatches
⚠️ **Type Mismatch Found**: Backend Quorum type is WRONG!
```rust
// WRONG - Current backend definition missing approvers field!
pub struct Quorum {
    pub min_approved: u32,  // WRONG TYPE: Should be u16!
}

// CORRECT - From Orbit spec.did:
pub struct Quorum {
    pub approvers: UserSpecifier,  // MISSING IN BACKEND!
    pub min_approved: u16,         // nat16, not u32!
}
```

## User Flow

### 1. Entry Point
- Location: `TokenDashboard.jsx` → Treasury Accounts tab
- Add "Create Account" button in `AccountsTable.jsx` header
- Button only visible when:
  - User has sufficient voting power (100+ VP)
  - Orbit Station exists for the token
  - User has permission to create accounts (check via backend)

### 2. Modal Dialog Structure
Create new component: `CreateAccountDialog.jsx` with 3-step wizard:

#### Step 1: Configuration
- **Asset Selection**:
  ✅ **Validated Asset Structure**:
  ```javascript
  // From test: Assets have UUID format
  // Example: "43e1f1c3-c75e-4f67-86fb-acb3e695a24d" (ALEX token)
  const assets = await backend.get_available_assets(tokenId);
  // Returns: { id: UUID, symbol: string, name: string, decimals: u8 }
  ```

- **Account Name**:
  - Text input with 64 character limit
  - Suggestions: "Main Treasury", "Operations Fund", "Development Fund"
  - Validation: Required, unique name check

#### Step 2: Permissions
Three permission settings, each with dropdown:
- **View Account** (read_permission)
- **Change Settings** (configs_permission)
- **Transfer Funds** (transfer_permission)

✅ **Validated Permission Structure**:
```javascript
// Tested permission encoding:
const permission = {
  auth_scope: { Public: null },     // Variant encoding
  users: [],                        // Empty array for no specific users
  user_groups: []                   // Empty array for no specific groups
};
```

Options for each:
- "No one" → `{ auth_scope: { Restricted: null }, users: [], user_groups: [] }`
- "Everyone" → `{ auth_scope: { Public: null }, users: [], user_groups: [] }`
- "Logged in users" → `{ auth_scope: { Authenticated: null }, users: [], user_groups: [] }`
- "High VP holders (100+ VP)" → Custom implementation using backend member list

#### Step 3: Approval Rules (Simplified)
Two rule configurations:
- **Change Settings Rule** (configs_request_policy)
- **Transfer Funds Rule** (transfer_request_policy)

⚠️ **CRITICAL FIX NEEDED - Quorum Structure**:
```rust
// CORRECT Quorum structure (verified via dfx):
pub struct Quorum {
    pub approvers: UserSpecifier,  // REQUIRED!
    pub min_approved: u16,         // nat16, not u32!
}

pub enum UserSpecifier {
    Any,
    Id(Vec<String>),      // User UUIDs
    Group(Vec<String>),   // Group UUIDs
}
```

Simplified options (hiding complexity):
- "Auto-approve" → `{ AutoApproved: null }`
- "Require 2 approvals" → `{ Quorum: { approvers: { Any: null }, min_approved: 2 } }`
- "Require 3 approvals" → `{ Quorum: { approvers: { Any: null }, min_approved: 3 } }`
- "Require 50% approval" → `{ QuorumPercentage: { approvers: { Any: null }, min_approved: 50 } }`
- "No rule" → `null` (sent as empty array `[]` in Candid)

### 3. Backend Implementation

#### 📝 CRITICAL TYPE FIXES Required

**File**: `/home/theseus/alexandria/daopad/src/daopad/daopad_backend/src/types/orbit.rs`

```rust
// FIX THESE TYPE DEFINITIONS - Currently WRONG!

// Add UserSpecifier enum (currently missing)
#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum UserSpecifier {
    Any,
    Id(Vec<String>),     // User UUIDs
    Group(Vec<String>),  // Group UUIDs
}

// Fix Quorum struct (currently missing approvers field)
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct Quorum {
    pub approvers: UserSpecifier,  // ADD THIS FIELD!
    pub min_approved: u16,         // CHANGE from u32 to u16!
}

// Fix QuorumPercentage struct (currently missing approvers field)
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct QuorumPercentage {
    pub approvers: UserSpecifier,  // ADD THIS FIELD!
    pub min_approved: u16,         // CHANGE from u32 to u16!
}

// RequestPolicyRule enum is correct, just needs the fixed structs above
```

#### New Backend Methods Required

**File**: `/home/theseus/alexandria/daopad/src/daopad/daopad_backend/src/api/orbit_accounts.rs` (new file)

```rust
use crate::types::orbit::*;
use candid::{CandidType, Principal};
use ic_cdk::{call, update};

#[update]
async fn create_treasury_account(
    token_id: Principal,
    account_config: CreateAccountConfig
) -> Result<CreateRequestResponse, String> {
    // Get station for token
    let station_id = get_station_for_token(token_id)
        .ok_or("No Orbit Station found for token")?;

    // Build AddAccountOperationInput with CORRECT types
    let add_account = AddAccountOperationInput {
        name: account_config.name,
        assets: account_config.asset_ids,
        metadata: account_config.metadata,
        read_permission: account_config.read_permission,
        configs_permission: account_config.configs_permission,
        transfer_permission: account_config.transfer_permission,
        configs_request_policy: account_config.configs_request_policy,
        transfer_request_policy: account_config.transfer_request_policy,
    };

    // Create request with AddAccount operation
    let request_input = CreateRequestInput {
        operation: RequestOperationInput::AddAccount(add_account),
        title: Some(format!("Create Account: {}", account_config.name)),
        summary: Some(format!("Creating treasury account '{}'", account_config.name)),
        execution_plan: None,
        expiration_dt: None,
        deduplication_key: None,
        tags: None,
    };

    // Call Orbit Station
    let result: Result<(CreateRequestResult,), _> =
        call(station_id, "create_request", (request_input,)).await;

    // Handle double-wrapped Result pattern
    match result {
        Ok((CreateRequestResult::Ok(response),)) => {
            Ok(CreateRequestResponse {
                request_id: response.request.id,
                status: format!("{:?}", response.request.status),
                auto_approved: matches!(response.request.status,
                    RequestStatusDTO::Approved | RequestStatusDTO::Completed { .. }),
                error: None,
            })
        }
        Ok((CreateRequestResult::Err(e),)) => {
            Err(format!("Orbit rejected request: {}", e))
        }
        Err((code, msg)) => {
            Err(format!("Cross-canister call failed: {:?} - {}", code, msg))
        }
    }
}

#[update]
async fn get_available_assets(
    token_id: Principal
) -> Result<Vec<AssetInfo>, String> {
    let station_id = get_station_for_token(token_id)
        .ok_or("No Orbit Station found for token")?;

    let result: Result<(ListAssetsResult,), _> =
        call(station_id, "list_assets", (ListAssetsInput {},)).await;

    match result {
        Ok((ListAssetsResult::Ok(response),)) => {
            Ok(response.assets.into_iter().map(|a| AssetInfo {
                id: a.id,
                symbol: a.symbol,
                name: a.name,
                decimals: a.decimals,
            }).collect())
        }
        Ok((ListAssetsResult::Err(e),)) => {
            Err(format!("Failed to list assets: {}", e))
        }
        Err((code, msg)) => {
            Err(format!("Cross-canister call failed: {:?} - {}", code, msg))
        }
    }
}

#[update]
async fn validate_account_name(
    token_id: Principal,
    name: String
) -> Result<bool, String> {
    // Check name length
    if name.is_empty() || name.len() > 64 {
        return Ok(false);
    }

    // Check for duplicate names
    let station_id = get_station_for_token(token_id)
        .ok_or("No Orbit Station found for token")?;

    let result: Result<(ListAccountsResult,), _> = call(
        station_id,
        "list_accounts",
        (ListAccountsInput {
            search_term: Some(name.clone()),
            paginate: None,
        },)
    ).await;

    match result {
        Ok((ListAccountsResult::Ok(response),)) => {
            // Check if any account has exact name match
            let exists = response.accounts.iter()
                .any(|a| a.name.eq_ignore_ascii_case(&name));
            Ok(!exists)
        }
        _ => Ok(true) // If we can't check, assume valid
    }
}

#[update]
async fn get_high_vp_members(
    token_id: Principal,
    min_vp: u64  // Default 100
) -> Result<Vec<Principal>, String> {
    // Query Kong Locker for high VP holders
    // Then get their Orbit user IDs
    // Implementation depends on Kong Locker integration

    // For now, return empty until Kong integration is complete
    Ok(vec![])
}
```

### 4. Frontend Components Structure

```
components/
├── orbit/
│   ├── CreateAccountDialog.jsx       # Main modal container
│   ├── account-wizard/
│   │   ├── AccountWizard.jsx         # 3-step wizard controller
│   │   ├── AccountConfigStep.jsx     # Step 1: Name & Assets
│   │   ├── AccountPermissionsStep.jsx # Step 2: Permissions
│   │   └── AccountRulesStep.jsx      # Step 3: Approval rules
│   └── utils/
│       └── accountHelpers.js         # Permission & rule builders
```

#### 📝 Frontend Service Implementation

**File**: `/home/theseus/alexandria/daopad/src/daopad/daopad_frontend/src/services/daopadBackend.js`

```javascript
async createTreasuryAccount(tokenId, accountConfig) {
  try {
    const actor = await this.getActor();

    // Build permission objects with correct encoding
    const encodePermission = (permission) => ({
      auth_scope: permission.authScope,  // Already a variant object
      users: permission.users || [],
      user_groups: permission.userGroups || []
    });

    // Build rule objects with CORRECT Quorum structure
    const encodeRule = (rule) => {
      if (!rule) return null;

      if (rule.type === 'AutoApproved') {
        return { AutoApproved: null };
      }

      if (rule.type === 'Quorum') {
        return {
          Quorum: {
            approvers: { Any: null },  // REQUIRED field!
            min_approved: rule.minApproved
          }
        };
      }

      if (rule.type === 'QuorumPercentage') {
        return {
          QuorumPercentage: {
            approvers: { Any: null },  // REQUIRED field!
            min_approved: rule.minPercent
          }
        };
      }

      return null;
    };

    const config = {
      name: accountConfig.name,
      asset_ids: accountConfig.assetIds,
      metadata: [],  // Start with no metadata
      read_permission: encodePermission(accountConfig.readPermission),
      configs_permission: encodePermission(accountConfig.configsPermission),
      transfer_permission: encodePermission(accountConfig.transferPermission),
      configs_request_policy: accountConfig.configsRule
        ? [encodeRule(accountConfig.configsRule)] : [],  // Wrap in array for Option
      transfer_request_policy: accountConfig.transferRule
        ? [encodeRule(accountConfig.transferRule)] : []  // Wrap in array for Option
    };

    const result = await actor.create_treasury_account(tokenId, config);

    if ('Ok' in result) {
      return {
        success: true,
        data: result.Ok
      };
    } else {
      return {
        success: false,
        error: result.Err || 'Failed to create account'
      };
    }
  } catch (error) {
    console.error('Error creating treasury account:', error);
    return {
      success: false,
      error: error.message || 'Failed to create account'
    };
  }
}
```

## 🧪 Testing Commands

### Test Asset Listing
```bash
dfx identity use daopad
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_assets '(record {})'
# Returns assets with UUIDs like "43e1f1c3-c75e-4f67-86fb-acb3e695a24d"
```

### Test Account Creation (Validated ✅)
```bash
dfx identity use daopad
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai create_request '(record {
  operation = variant {
    AddAccount = record {
      name = "Test Treasury Account";
      assets = vec { "43e1f1c3-c75e-4f67-86fb-acb3e695a24d" };
      metadata = vec {};
      read_permission = record {
        auth_scope = variant { Public };
        users = vec {};
        user_groups = vec {};
      };
      configs_permission = record {
        auth_scope = variant { Authenticated };
        users = vec {};
        user_groups = vec {};
      };
      transfer_permission = record {
        auth_scope = variant { Authenticated };
        users = vec {};
        user_groups = vec {};
      };
      configs_request_policy = opt variant { AutoApproved };
      transfer_request_policy = opt variant {
        Quorum = record {
          min_approved = 2 : nat16;   # MUST be nat16!
          approvers = variant { Any }  # REQUIRED field!
        }
      };
    }
  };
  title = opt "Create Test Treasury";
  summary = opt "Creating a test treasury account";
  execution_plan = null;
  expiration_dt = null;
  deduplication_key = null;
  tags = null;
})'
```

✅ **Actual Response** (Successfully tested):
```
variant {
  Ok = record {
    request = record {
      id = "4e057ce6-824e-4aa0-9f79-2fff20db25a2";
      status = variant { Approved };
      // Request was auto-approved due to admin privileges
    }
  }
}
```

### Debug Failed Requests
```bash
# Check request status
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai get_request \
  '(record { request_id = "REQUEST_ID_HERE" })'

# List recent requests to debug
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_requests \
  '(record {
    statuses = opt vec { variant { Failed } };
    limit = opt 10
  })'
```

## Implementation Phases

### Phase 1: Basic Account Creation (MVP) - WITH FIXES
1. ⚠️ **FIX BACKEND TYPES FIRST** - Update Quorum/QuorumPercentage structs
2. Create dialog with 3-step wizard UI
3. Implement backend `create_treasury_account` method
4. Support basic permissions (Public/Authenticated only)
5. Support simple rules (Auto-approve, Quorum with Any approvers)
6. Single asset (current token) only
7. ⚠️ **SYNC DECLARATIONS** after backend changes

### Phase 2: Enhanced Permissions
1. Add high VP holder permission option
2. Implement `get_high_vp_members` backend method
3. Add member selection UI for custom groups
4. Add validation for permission consistency

### Phase 3: Advanced Features
1. Multi-asset support
2. Complex rule builder (AllOf, AnyOf, specific user/group approvers)
3. Account templates (pre-configured common setups)
4. Batch account creation

## Integration Points

### With Existing Code
1. **AccountsTable.jsx**: Add Create Account button to header
2. **orbitStation.js**: Add service methods for account creation
3. **daopadBackend.js**: Add new backend method calls (with CORRECT type encoding)
4. **TokenDashboard.jsx**: Handle dialog state and refresh

### With Orbit Station
1. Use existing `orbit_station.did` interface
2. Call `create_request` with `AddAccount` operation type
3. Handle async request creation and status tracking
4. Auto-refresh accounts table after successful creation

## Error Handling

### Validation Errors
- Empty or invalid account name
- No assets selected
- Inconsistent permission settings
- Invalid approval rules (e.g., min_approved > total users)

### Backend Errors
- Orbit Station not found for token
- Insufficient permissions to create account
- Network/cross-canister call failures
- Orbit Station request rejection

⚠️ **Common Error Pattern**:
```javascript
// If you see "Record is missing key [approvers]"
// It means the Quorum type is missing the approvers field!
// Fix: Add approvers: { Any: null } to Quorum/QuorumPercentage
```

### User Feedback
- Loading states during backend calls
- Clear error messages with suggested fixes
- Success notification with request ID
- Link to view request in Orbit Station

## Security Considerations

1. **Permission Validation**: Ensure user has rights to create accounts
2. **Input Sanitization**: Validate all text inputs, especially account name
3. **Rule Consistency**: Verify approval rules make sense (e.g., quorum ≤ total members)
4. **Admin Rights**: DAOPad backend must maintain admin status in Orbit Station

## Testing Strategy

### Manual Testing on Mainnet
1. Test with test station: `fec7w-zyaaa-aaaaa-qaffq-cai` ✅ Validated
2. Verify request creation with different permission combinations
3. Test error cases (invalid inputs, permission denied)
4. Confirm account appears in table after approval

### Test Cases
1. ✅ Create basic account (public permissions, no rules) - TESTED
2. ✅ Create restricted account (authenticated users) - TESTED
3. ✅ Create account with approval rules (Quorum with approvers) - TESTED
4. Attempt creation without permissions (should fail)
5. Create account with long name (test truncation)

## UI/UX Considerations

### Visual Design
- Use shadcn/ui components matching existing tables
- Stepper component showing 3 steps with progress
- Clear labels and tooltips explaining each option
- Preview/summary before submission

### User Guidance
- Tooltips explaining permission implications
- Examples of good account names
- Warning when setting restrictive permissions
- Clear indication this creates a request (not immediate)

### Accessibility
- Keyboard navigation through wizard steps
- Screen reader friendly labels
- Clear focus indicators
- Proper ARIA attributes

## Documentation Updates

### User Documentation
- Add section to user guide about treasury account creation
- Explain permission model and approval rules
- Provide common configuration templates

### Developer Documentation
- Update CLAUDE.md with new backend methods
- Document account creation flow
- Add troubleshooting section for common issues

## Success Metrics

1. **Functionality**: Users can create accounts without leaving DAOPad
2. **Usability**: 3-step wizard completed in under 2 minutes
3. **Reliability**: 95% success rate for valid requests
4. **Adoption**: 50% of DAOs create at least one custom account

## Future Enhancements

1. **Templates**: Pre-configured account setups for common use cases
2. **Bulk Operations**: Create multiple accounts at once
3. **Import/Export**: Save and share account configurations
4. **Audit Trail**: Track who created which accounts and when
5. **Smart Defaults**: AI-suggested configurations based on DAO type

## Implementation Priority

1. **High Priority**:
   - ⚠️ **FIX BACKEND TYPES** (Quorum/QuorumPercentage structs)
   - Basic 3-step wizard UI
   - Backend account creation method
   - Simple permissions (Public/Authenticated)
   - ⚠️ **Declaration sync process**
   - Integration with existing AccountsTable

2. **Medium Priority**:
   - High VP holder permissions
   - Complex approval rules
   - Asset validation and selection
   - Error handling and retry logic

3. **Low Priority**:
   - Templates and presets
   - Multi-asset support
   - Advanced rule builder
   - Bulk operations

## Notes for Implementation

### ✅ Empirically Validated Orbit Types
- Use `AddAccountOperationInput` type structure from `orbit-reference/core/station/api/spec.did`
- ⚠️ **Quorum MUST include approvers field** - verified via dfx testing
- ⚠️ **min_approved MUST be nat16 (u16 in Rust)** - not u32!
- Follow patterns from successful test requests

### Key Differences from Original Plan
- ✅ **Fixed incorrect Quorum/QuorumPercentage types** - missing approvers field
- ✅ **Fixed incorrect min_approved type** - should be u16, not u32
- ✅ **Added UserSpecifier enum** - required for approvers field
- ✅ **Validated all operations with dfx** - no guessing!
- ✅ **Added declaration sync reminder** - critical step often missed

### Backend Considerations
- All methods must be `#[update]` not `#[query]` for cross-canister calls
- Request creation is async - need loading states
- Account won't appear immediately - it's a request that needs approval
- Consider auto-approving for high VP users (future enhancement)

## Conclusion

This enhanced plan provides empirically validated implementation details for account creation in DAOPad. All type definitions have been tested against the actual Orbit Station API, and critical bugs in the original type definitions have been identified and fixed. The implementation follows the minimal storage principle while ensuring type safety and proper error handling.

⚠️ **CRITICAL FIRST STEP**: Fix the backend type definitions for Quorum and QuorumPercentage before implementing any frontend code!