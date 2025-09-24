# Create Account Feature Implementation Plan for DAOPad

## Overview
Implement a "Create Account" button and modal within the Treasury Accounts tab of DAOPad, allowing users to create new treasury accounts in Orbit Station directly from the DAOPad interface.

## Architecture Decision
Following the **Minimal Storage Principle** from CLAUDE.md, we will:
- NOT store account details in DAOPad backend
- Use DAOPad backend as an admin proxy to create accounts
- Query account data dynamically from Orbit Station
- Only store the token→station mapping (existing)

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
  - Auto-populate with current token's asset ID from Orbit Station
  - Initially single-select (can extend to multi-select later)
  - Query available assets from Orbit Station via backend
- **Account Name**:
  - Text input with 64 character limit
  - Suggestions: "Main Treasury", "Operations Fund", "Development Fund"
  - Validation: Required, unique name check

#### Step 2: Permissions
Three permission settings, each with dropdown:
- **View Account** (read_permission)
- **Change Settings** (configs_permission)
- **Transfer Funds** (transfer_permission)

Options for each:
- "No one" → `{ auth_scope: { Restricted: null }, users: [], user_groups: [] }`
- "Everyone" → `{ auth_scope: { Public: null }, users: [], user_groups: [] }`
- "Logged in users" → `{ auth_scope: { Authenticated: null }, users: [], user_groups: [] }`
- "High VP holders (100+ VP)" → Custom implementation using backend member list

#### Step 3: Approval Rules (Simplified)
Two rule configurations:
- **Change Settings Rule** (configs_request_policy)
- **Transfer Funds Rule** (transfer_request_policy)

Simplified options (hiding complexity):
- "Auto-approve" → `{ AutoApproved: null }`
- "Require 2 approvals" → `{ Quorum: { min_approved: 2 } }`
- "Require 3 approvals" → `{ Quorum: { min_approved: 3 } }`
- "Require 50% approval" → `{ QuorumPercentage: { min_approved: { percent: 50 } } }`
- "No rule" → `null`

### 3. Backend Implementation

#### New Backend Methods Required

```rust
// In daopad_backend/src/api/orbit_accounts.rs (new file)

#[update]
async fn create_treasury_account(
    token_id: Principal,
    account_config: CreateAccountConfig
) -> Result<CreateRequestResponse, String>

#[update]
async fn get_available_assets(
    token_id: Principal
) -> Result<Vec<AssetInfo>, String>

#[update]
async fn validate_account_name(
    token_id: Principal,
    name: String
) -> Result<bool, String>

#[update]
async fn get_high_vp_members(
    token_id: Principal,
    min_vp: u64  // Default 100
) -> Result<Vec<Principal>, String>
```

#### Type Definitions
```rust
// In types/orbit.rs
pub struct CreateAccountConfig {
    pub name: String,
    pub asset_ids: Vec<String>,  // UUID strings
    pub read_permission: Allow,
    pub configs_permission: Allow,
    pub transfer_permission: Allow,
    pub configs_request_policy: Option<RequestPolicyRule>,
    pub transfer_request_policy: Option<RequestPolicyRule>,
}

pub struct AssetInfo {
    pub id: String,  // UUID
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
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

## Implementation Phases

### Phase 1: Basic Account Creation (MVP)
1. Create dialog with 3-step wizard UI
2. Implement backend `create_treasury_account` method
3. Support basic permissions (Public/Authenticated only)
4. Support simple rules (Auto-approve, Quorum only)
5. Single asset (current token) only

### Phase 2: Enhanced Permissions
1. Add high VP holder permission option
2. Implement `get_high_vp_members` backend method
3. Add member selection UI for custom groups
4. Add validation for permission consistency

### Phase 3: Advanced Features
1. Multi-asset support
2. Complex rule builder (AllOf, AnyOf, etc.)
3. Account templates (pre-configured common setups)
4. Batch account creation

## Integration Points

### With Existing Code
1. **AccountsTable.jsx**: Add Create Account button to header
2. **orbitStation.js**: Add service methods for account creation
3. **daopadBackend.js**: Add new backend method calls
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
- Invalid approval rules

### Backend Errors
- Orbit Station not found for token
- Insufficient permissions to create account
- Network/cross-canister call failures
- Orbit Station request rejection

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
1. Test with test station: `fec7w-zyaaa-aaaaa-qaffq-cai`
2. Verify request creation with different permission combinations
3. Test error cases (invalid inputs, permission denied)
4. Confirm account appears in table after approval

### Test Cases
1. Create basic account (public permissions, no rules)
2. Create restricted account (high VP holders only)
3. Create account with approval rules
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
   - Basic 3-step wizard UI
   - Backend account creation method
   - Simple permissions (Public/Authenticated)
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

### From Orbit Source Analysis
- Use `AddAccountOperationInput` type structure from `orbit-reference/core/station/api/spec.did`
- Follow Vue component patterns from `orbit-reference/apps/wallet/src/components/accounts/`
- Implement similar validation to `AccountSetupWizard.vue`
- Use `Allow` type with `auth_scope`, `users`, and `user_groups` fields

### Key Differences from Orbit UI
- Simplified rule builder (dropdown vs complex builder)
- VP-based permissions instead of individual user selection
- Auto-populate asset with current token
- Integrated into existing Treasury tab vs separate page

### Backend Considerations
- All methods must be `#[update]` not `#[query]` for cross-canister calls
- Request creation is async - need loading states
- Account won't appear immediately - it's a request that needs approval
- Consider auto-approving for high VP users (future enhancement)

## Conclusion

This plan provides a phased approach to implementing account creation in DAOPad, starting with an MVP that covers basic functionality and progressively adding more advanced features. The implementation follows the minimal storage principle, leveraging Orbit Station as the source of truth while providing a simplified, user-friendly interface tailored to DAO treasury management needs.