# DAO Settings Tab Implementation Plan

## Overview
Implement a new "DAO Settings" tab in the DAOPad frontend that displays critical Orbit Station administrative information, similar to the `/settings/administration` route in Orbit Station.

## Key Information to Display

### 1. Station Information Card
- **Station ID**: The Orbit Station canister ID (`fec7w-zyaaa-aaaaa-qaffq-cai`)
- **Station Name**: The configured name for the station (e.g., "Alexandria Payroll")
- **Overridden Status**: Whether the name has been overridden from default
- **Cycle Obtain Strategy**: How the station obtains cycles (e.g., "Mint from ICP account 'Alexandria Reserves'")
- **Version**: Station version (e.g., "0.5.0")
- **Upgrader ID**: The upgrader canister ID
- **Cycle Balances**:
  - Station cycles (e.g., 1.497 TC)
  - Upgrader cycles (e.g., 980.497 BC)

### 2. Disaster Recovery Configuration
- **User Group**: Admin group name
- **User Group ID**: UUID of the disaster recovery committee (e.g., `00000000-0000-4000-8000-000000000000`)
- **Quorum**: Number required for disaster recovery (typically 1)

### 3. Station Changes/Upgrades
- Recent system upgrade requests
- Configuration change history

## Implementation Architecture

### Backend Requirements

#### 1. New Backend Method: `get_orbit_system_info`
```rust
// daopad_backend/src/api/orbit.rs
#[update]
pub async fn get_orbit_system_info(token_canister_id: Principal) -> Result<OrbitSystemInfo, String> {
    // 1. Get station ID for token
    // 2. Call station.system_info() as admin
    // 3. Transform and return relevant data
}
```

#### 2. Type Definitions
```rust
// daopad_backend/src/types/orbit.rs
#[derive(CandidType, Serialize, Deserialize)]
pub struct OrbitSystemInfo {
    pub station_id: Principal,
    pub name: String,
    pub version: String,
    pub upgrader_id: Principal,
    pub cycles: Nat64,
    pub upgrader_cycles: Option<Nat64>,
    pub cycle_obtain_strategy: CycleObtainStrategy,
    pub disaster_recovery: Option<DisasterRecoveryInfo>,
    pub last_upgrade_timestamp: String,
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct DisasterRecoveryInfo {
    pub user_group_name: Option<String>,
    pub user_group_id: String,
    pub quorum: u64,
}

#[derive(CandidType, Serialize, Deserialize)]
pub enum CycleObtainStrategy {
    MintFromNativeToken { account_name: String },
    WithdrawFromCyclesLedger { account_name: String },
    Disabled,
}
```

### Frontend Requirements

#### 1. New Component: `DAOSettings.jsx`
```jsx
// daopad_frontend/src/components/DAOSettings.jsx
- Main container component for the settings tab
- Fetches system info from backend
- Displays loading/error states
- Renders subcomponents
```

#### 2. Subcomponents

##### `StationInfoCard.jsx`
```jsx
// daopad_frontend/src/components/orbit/StationInfoCard.jsx
- Display station details
- Copy-to-clipboard for IDs
- Cycle balance formatting
- Version display
```

##### `DisasterRecoveryCard.jsx`
```jsx
// daopad_frontend/src/components/orbit/DisasterRecoveryCard.jsx
- Show disaster recovery configuration
- Display user group and quorum
- Warning if not configured
```

#### 3. Service Integration
```javascript
// daopad_frontend/src/services/daopadBackend.js
export const getOrbitSystemInfo = async (tokenCanisterId) => {
  const result = await actor.get_orbit_system_info(Principal.fromText(tokenCanisterId));
  return result;
};
```

#### 4. Tab Integration in TokenDashboard
```jsx
// Update TokenTabs.jsx
tabs: [
  { id: 'treasury', label: 'Treasury' },
  { id: 'members', label: 'Members' },
  { id: 'requests', label: 'Requests' },
  { id: 'settings', label: 'DAO Settings' }  // NEW
]

// Add case in TokenDashboard.jsx
{activeTab === 'settings' && <DAOSettings orbitStation={orbitStation} />}
```

## Implementation Steps

### Phase 1: Backend Implementation
1. Add `system_info` method to Orbit Station candid interface (orbit_station.did)
2. Create type definitions for system info structures
3. Implement `get_orbit_system_info` backend method
4. Test with dfx using test station

### Phase 2: Frontend Components
1. Create `DAOSettings.jsx` main component
2. Build `StationInfoCard.jsx` for station details
3. Build `DisasterRecoveryCard.jsx` for DR configuration
4. Add service method for fetching system info

### Phase 3: Integration
1. Add "DAO Settings" tab to TokenTabs
2. Integrate DAOSettings component into TokenDashboard
3. Add proper loading and error states
4. Implement copy-to-clipboard for IDs

### Phase 4: Polish
1. Format cycle balances properly (TC, BC units)
2. Add tooltips for technical terms
3. Style with existing shadcn/ui components
4. Test all functionality on mainnet

## UI Components to Reuse

From existing codebase:
- `Card`, `CardHeader`, `CardTitle`, `CardContent` (shadcn/ui)
- `Table`, `TableBody`, `TableCell`, `TableRow` (for structured data)
- `Badge` for status indicators (e.g., "Overridden")
- `Button` with copy icon for clipboard functionality
- `Alert` for warnings (e.g., DR not configured)

## Testing Strategy

1. **Backend Testing**:
   - Test `get_orbit_system_info` with test station
   - Verify all fields are properly populated
   - Test error handling for non-existent stations

2. **Frontend Testing**:
   - Verify data loads correctly
   - Test copy-to-clipboard functionality
   - Ensure graceful handling of missing data
   - Test responsive design

## Security Considerations

1. **Access Control**:
   - System info contains sensitive data (cycle balances, upgrader ID)
   - Backend acts as admin proxy to fetch protected data
   - Consider adding user permission checks

2. **Data Exposure**:
   - Only expose necessary information
   - Don't expose internal configuration details
   - Sanitize any user-facing strings

## Future Enhancements

1. **Configuration Management**:
   - Add ability to update station name (requires proposal)
   - Configure cycle obtain strategy
   - Manage disaster recovery settings

2. **Monitoring**:
   - Cycle balance alerts
   - Upgrade history timeline
   - System health indicators

3. **Advanced Features**:
   - Export configuration
   - Backup/restore settings
   - Multi-station comparison

## Success Criteria

1. Users can view all critical station information in one place
2. Data loads quickly without errors
3. UI is consistent with existing DAOPad design
4. Copy functionality works for all IDs
5. Responsive on mobile devices
6. Graceful handling of missing/optional data

## Notes

- Orbit Station restricts `system_info` to admins/members
- DAOPad backend must act as admin proxy to fetch data
- All cross-canister calls must be in update methods, not queries
- Consider caching strategy if data doesn't change frequently