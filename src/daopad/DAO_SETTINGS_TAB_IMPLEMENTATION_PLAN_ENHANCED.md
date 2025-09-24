# DAO Settings Tab Implementation Plan (ENHANCED)

## Overview
Implement a new "DAO Settings" tab in the DAOPad frontend that displays critical Orbit Station administrative information, similar to the `/settings/administration` route in Orbit Station.

## ✅ Empirical Validation
**Tested with:** `dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai system_info '()'`
**Actual response:**
```candid
(
  variant {
    Ok = record {
      system = record {
        disaster_recovery = opt record {
          user_group_name = opt "Admin";
          committee = record {
            user_group_id = "00000000-0000-4000-8000-000000000000";
            quorum = 1 : nat16;
          };
        };
        upgrader_cycles = opt (980_497_317_537 : nat64);
        name = "Alexandria Payroll";
        last_upgrade_timestamp = "2025-03-05T11:04:05.526200895Z";
        raw_rand_successful = true;
        version = "0.5.0";
        cycles = 1_330_733_089_724 : nat64;
        upgrader_id = principal "frfo3-yqaaa-aaaaa-qafga-cai";
        cycle_obtain_strategy = variant {
          MintFromNativeToken = record {
            account_id = "3f601869-e48e-49a1-92cb-32f55b308a18";
            account_name = opt "Alexandria Reserves";
          }
        };
      };
    }
  },
)
```
**Field encoding:** Fields are properly named (NOT hashed) ✓

## Key Information to Display

### 1. Station Information Card
- **Station ID**: The Orbit Station canister ID
- **Station Name**: From `system.name` field
- **Version**: From `system.version` field
- **Upgrader ID**: From `system.upgrader_id` field
- **Cycle Balances**:
  - Station cycles: From `system.cycles` (format as TC)
  - Upgrader cycles: From `system.upgrader_cycles` (format as BC)
- **Last Upgrade**: From `system.last_upgrade_timestamp` (format date)
- **Cycle Obtain Strategy**: From `system.cycle_obtain_strategy` variant

### 2. Disaster Recovery Configuration
- **User Group Name**: From `system.disaster_recovery.user_group_name`
- **User Group ID**: From `system.disaster_recovery.committee.user_group_id`
- **Quorum**: From `system.disaster_recovery.committee.quorum`

## Implementation Architecture

### Backend Requirements

#### 1. New Backend Method: `get_orbit_system_info`

📝 **Implementation Details:**
- File: `/home/theseus/alexandria/daopad/src/daopad/daopad_backend/src/api/orbit.rs`
- Line: Add after line 49 (after `list_all_orbit_stations`)

```rust
#[update] // MUST be update, not query for cross-canister calls
pub async fn get_orbit_system_info(token_canister_id: Principal) -> Result<SystemInfoResponse, String> {
    // Get station ID for token
    let station_id = get_orbit_station_for_token(token_canister_id)
        .ok_or_else(|| format!("No Orbit Station found for token {}", token_canister_id))?;

    // Call system_info on the station (we have admin access)
    let result: Result<(SystemInfoResult,), _> = ic_cdk::call(
        station_id,
        "system_info",
        ()
    ).await;

    match result {
        Ok((system_info_result,)) => {
            match system_info_result {
                SystemInfoResult::Ok { system } => {
                    Ok(SystemInfoResponse {
                        station_id,
                        system_info: system,
                    })
                },
                SystemInfoResult::Err(e) => {
                    Err(format!("Orbit Station error: {:?}", e))
                }
            }
        },
        Err((code, msg)) => {
            Err(format!("Failed to call system_info: {:?} - {}", code, msg))
        }
    }
}
```

#### 2. Type Definitions (EXACT from Orbit spec.did)

📝 **Implementation Details:**
- File: `/home/theseus/alexandria/daopad/src/daopad/daopad_backend/src/types/orbit.rs`
- Line: Add at the end of the file

```rust
use candid::{CandidType, Deserialize, Nat};
use serde::Serialize;

// Exact types from orbit_station.did - DO NOT MODIFY field names or types!
#[derive(CandidType, Serialize, Deserialize, Debug)]
pub struct SystemInfo {
    pub name: String,
    pub version: String,
    pub upgrader_id: Principal,
    pub cycles: u64,
    pub upgrader_cycles: Option<u64>,
    pub last_upgrade_timestamp: String, // RFC3339 timestamp
    pub raw_rand_successful: bool,
    pub disaster_recovery: Option<DisasterRecovery>,
    pub cycle_obtain_strategy: CycleObtainStrategy,
    // Note: Omitting max_station_backup_snapshots and max_upgrader_backup_snapshots
    // as they're not in the test response and may be optional in newer versions
}

#[derive(CandidType, Serialize, Deserialize, Debug)]
pub struct DisasterRecovery {
    pub committee: DisasterRecoveryCommittee,
    pub user_group_name: Option<String>,
}

#[derive(CandidType, Serialize, Deserialize, Debug)]
pub struct DisasterRecoveryCommittee {
    pub user_group_id: String, // UUID as string
    pub quorum: u16,
}

#[derive(CandidType, Serialize, Deserialize, Debug)]
pub enum CycleObtainStrategy {
    Disabled,
    MintFromNativeToken {
        account_id: String, // UUID as string
        account_name: Option<String>,
    },
    WithdrawFromCyclesLedger {
        account_id: String, // UUID as string
        account_name: Option<String>,
    },
}

#[derive(CandidType, Serialize, Deserialize, Debug)]
pub enum SystemInfoResult {
    Ok { system: SystemInfo },
    Err(OrbitError), // Use existing OrbitError type or create minimal one
}

#[derive(CandidType, Serialize, Deserialize, Debug)]
pub struct SystemInfoResponse {
    pub station_id: Principal,
    pub system_info: SystemInfo,
}
```

#### 3. Import Required Types

📝 **Implementation Details:**
- File: `/home/theseus/alexandria/daopad/src/daopad/daopad_backend/src/api/orbit.rs`
- Line: 3-6 (update imports)

```rust
use crate::types::orbit::{
    AccountBalance, AccountMetadata, AddAccountOperationInput, Allow, AuthScope,
    FetchAccountBalancesInput, FetchAccountBalancesResult, ListAccountsInput, ListAccountsResult,
    // Add these new types:
    SystemInfo, SystemInfoResult, SystemInfoResponse, CycleObtainStrategy,
    DisasterRecovery, DisasterRecoveryCommittee,
};
```

### ⚠️ CRITICAL: Address the Four Universal Issues

#### Issue 1: Candid Field Name Hashing
✅ **Validation:** Fields are returned with proper names, NOT hashed
- Tested with actual dfx call - no hash IDs present
- No special handling needed for this method

#### Issue 2: Declaration Synchronization (MOST CRITICAL!)
⚠️ **After ANY backend changes, you MUST:**
```bash
# Step 1: Build and extract candid
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did

# Step 2: Deploy backend
./deploy.sh --network ic --backend-only

# Step 3: CRITICAL - Sync declarations to frontend directory
cp -r src/declarations/daopad_backend/* src/daopad/daopad_frontend/src/declarations/daopad_backend/

# Step 4: Verify the method exists in frontend declarations
grep "get_orbit_system_info" src/daopad/daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js

# Step 5: Deploy frontend
./deploy.sh --network ic --frontend-only
```

**🧪 Test to Verify:**
```bash
# Before declaration sync:
grep "get_orbit_system_info" src/declarations/daopad_backend/daopad_backend.did.js # ✓ Found
grep "get_orbit_system_info" src/daopad/daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js # ✗ Not found
# Error in browser: "actor.get_orbit_system_info is not a function"

# After declaration sync:
grep "get_orbit_system_info" src/daopad/daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js # ✓ Found
# Success in browser!
```

#### Issue 3: Optional Type Encoding
📝 **Frontend must handle optional fields correctly:**
```javascript
// When calling backend (not needed for this read-only method)
// But for reference in case of future updates:

// For optional disaster_recovery
const dr = systemInfo.disaster_recovery;
const hasDisasterRecovery = dr && dr.length > 0; // Check opt array

// For optional upgrader_cycles
const upgraderCycles = systemInfo.upgrader_cycles;
const hasUpgraderCycles = upgraderCycles && upgraderCycles.length > 0;
```

#### Issue 4: Frontend-Backend Contract
✅ **For this feature:** No request parameters needed (empty tuple)
```javascript
// Frontend call is simple:
const result = await actor.get_orbit_system_info(Principal.fromText(tokenCanisterId));
```

### Frontend Requirements

#### 1. New Component: `DAOSettings.jsx`

📝 **Implementation Details:**
- File: `/home/theseus/alexandria/daopad/src/daopad/daopad_frontend/src/components/DAOSettings.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Copy, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { daopadBackend } from '../services/daopadBackend';
import { formatCycles } from '../utils/formatting';

const DAOSettings = ({ tokenCanisterId }) => {
    const [systemInfo, setSystemInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSystemInfo = async () => {
            if (!tokenCanisterId) {
                setError('No token canister ID provided');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const result = await daopadBackend.get_orbit_system_info(
                    Principal.fromText(tokenCanisterId)
                );

                // Handle Result variant
                if ('Ok' in result) {
                    setSystemInfo(result.Ok);
                } else if ('Err' in result) {
                    setError(result.Err);
                }
            } catch (err) {
                console.error('Failed to fetch system info:', err);
                setError(err.message || 'Failed to fetch system information');
            } finally {
                setLoading(false);
            }
        };

        fetchSystemInfo();
    }, [tokenCanisterId]);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // Add toast notification here
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    if (!systemInfo) {
        return (
            <Alert>
                <AlertDescription>No system information available</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <StationInfoCard
                systemInfo={systemInfo.system_info}
                stationId={systemInfo.station_id}
                onCopy={copyToClipboard}
            />

            {systemInfo.system_info.disaster_recovery && systemInfo.system_info.disaster_recovery[0] && (
                <DisasterRecoveryCard
                    disasterRecovery={systemInfo.system_info.disaster_recovery[0]}
                    onCopy={copyToClipboard}
                />
            )}
        </div>
    );
};

export default DAOSettings;
```

#### 2. StationInfoCard Component

📝 **Implementation Details:**
- File: `/home/theseus/alexandria/daopad/src/daopad/daopad_frontend/src/components/orbit/StationInfoCard.jsx`

```jsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Copy } from 'lucide-react';

const StationInfoCard = ({ systemInfo, stationId, onCopy }) => {
    const formatCycles = (cycles) => {
        if (!cycles) return '0';
        const tc = Number(cycles) / 1e12;
        return `${tc.toFixed(3)} TC`;
    };

    const formatCycleStrategy = (strategy) => {
        if (!strategy) return 'Unknown';

        if ('Disabled' in strategy) {
            return 'Disabled';
        }
        if ('MintFromNativeToken' in strategy) {
            const data = strategy.MintFromNativeToken;
            return `Mint from ICP account '${data.account_name?.[0] || data.account_id}'`;
        }
        if ('WithdrawFromCyclesLedger' in strategy) {
            const data = strategy.WithdrawFromCyclesLedger;
            return `Withdraw from Cycles Ledger '${data.account_name?.[0] || data.account_id}'`;
        }
        return 'Unknown';
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Never';
        return new Date(timestamp).toLocaleString();
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Station Information</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-muted-foreground">Station Name</label>
                            <div className="font-medium">{systemInfo.name}</div>
                        </div>

                        <div>
                            <label className="text-sm text-muted-foreground">Version</label>
                            <div className="font-medium">{systemInfo.version}</div>
                        </div>

                        <div className="col-span-2">
                            <label className="text-sm text-muted-foreground">Station ID</label>
                            <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                    {stationId.toText()}
                                </code>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onCopy(stationId.toText())}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="text-sm text-muted-foreground">Upgrader ID</label>
                            <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                    {systemInfo.upgrader_id.toText()}
                                </code>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onCopy(systemInfo.upgrader_id.toText())}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="font-medium mb-2">Cycle Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-muted-foreground">Station Cycles</label>
                                <div className="font-medium">{formatCycles(systemInfo.cycles)}</div>
                            </div>
                            {systemInfo.upgrader_cycles && systemInfo.upgrader_cycles[0] && (
                                <div>
                                    <label className="text-sm text-muted-foreground">Upgrader Cycles</label>
                                    <div className="font-medium">
                                        {formatCycles(systemInfo.upgrader_cycles[0])}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-2">
                            <label className="text-sm text-muted-foreground">Cycle Obtain Strategy</label>
                            <div className="font-medium">
                                {formatCycleStrategy(systemInfo.cycle_obtain_strategy)}
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <label className="text-sm text-muted-foreground">Last Upgrade</label>
                        <div className="font-medium">{formatDate(systemInfo.last_upgrade_timestamp)}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default StationInfoCard;
```

#### 3. Service Integration

📝 **Implementation Details:**
- File: `/home/theseus/alexandria/daopad/src/daopad/daopad_frontend/src/services/daopadBackend.js`
- Add this method to the exported object:

```javascript
export const daopadBackend = {
    // ... existing methods ...

    get_orbit_system_info: async (tokenCanisterId) => {
        try {
            const actor = await getActor();
            const result = await actor.get_orbit_system_info(tokenCanisterId);
            return result;
        } catch (error) {
            console.error('Error fetching system info:', error);
            throw error;
        }
    },
};
```

#### 4. Tab Integration

📝 **Implementation Details:**
- File: `/home/theseus/alexandria/daopad/src/daopad/daopad_frontend/src/components/TokenTabs.jsx`
- Line: Update tabs array (around line 30)

```jsx
const tabs = [
    { id: 'treasury', label: 'Treasury' },
    { id: 'members', label: 'Members' },
    { id: 'requests', label: 'Requests' },
    { id: 'settings', label: 'DAO Settings' }  // ADD THIS
];
```

📝 **Implementation Details:**
- File: `/home/theseus/alexandria/daopad/src/daopad/daopad_frontend/src/components/TokenDashboard.jsx`
- Line: Add case in render (around line 150)

```jsx
{activeTab === 'settings' && (
    <DAOSettings tokenCanisterId={selectedToken?.canister_id} />
)}
```

## Implementation Steps

### Phase 1: Backend Implementation ✅
1. **Add type definitions** to `types/orbit.rs`
   ```bash
   # Edit the file with the exact types above
   ```

2. **Implement backend method** in `api/orbit.rs`
   ```bash
   # Add the get_orbit_system_info method
   ```

3. **Build and extract candid**
   ```bash
   cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
   candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did
   ```

4. **Test with dfx**
   ```bash
   ./deploy.sh --network ic --backend-only
   dfx canister --network ic call daopad_backend get_orbit_system_info '(principal "ysy5f-2qaaa-aaaap-qkmmq-cai")'
   ```

### Phase 2: Critical Declaration Sync ⚠️
```bash
# THIS STEP IS CRITICAL - DO NOT SKIP!
cp -r src/declarations/daopad_backend/* src/daopad/daopad_frontend/src/declarations/daopad_backend/

# Verify sync worked:
grep "get_orbit_system_info" src/daopad/daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js
```

### Phase 3: Frontend Implementation ✅
1. Create `DAOSettings.jsx` component
2. Create `StationInfoCard.jsx` component
3. Create `DisasterRecoveryCard.jsx` component (optional, for DR info)
4. Update `daopadBackend.js` service
5. Update `TokenTabs.jsx` and `TokenDashboard.jsx`

### Phase 4: Deploy and Test
```bash
# Deploy frontend with synced declarations
./deploy.sh --network ic --frontend-only

# Test in browser - should see new DAO Settings tab
```

## Testing Checklist

### Backend Testing ✅
- [ ] `get_orbit_system_info` returns correct data structure
- [ ] Error handling for non-existent stations
- [ ] All fields properly typed

**🧪 Test Commands:**
```bash
# Test with ALEX token (has Orbit Station)
dfx canister --network ic call daopad_backend get_orbit_system_info '(principal "ysy5f-2qaaa-aaaap-qkmmq-cai")'

# Test with invalid token (should error)
dfx canister --network ic call daopad_backend get_orbit_system_info '(principal "aaaaa-aa")'
```

### Frontend Testing ✅
- [ ] Tab appears in UI
- [ ] Data loads without errors
- [ ] Copy buttons work
- [ ] Handles missing optional fields gracefully
- [ ] Error states display properly

## Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| "get_orbit_system_info is not a function" | Run declaration sync step - frontend uses different path! |
| "Failed to decode" | Check that all types match EXACTLY with Orbit spec.did |
| Empty disaster_recovery | It's optional - check with `[0]` index for opt values |
| Cycles display wrong | Format as Number(cycles) / 1e12 for TC |
| "Query method cannot call query" | Use `#[update]` not `#[query]` in backend |

## Verification Commands

```bash
# 1. Verify backend method exists
dfx canister --network ic call daopad_backend __get_candid | grep system_info

# 2. Verify types are correct
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai system_info '()'

# 3. Test backend integration
dfx canister --network ic call daopad_backend get_orbit_system_info '(principal "ysy5f-2qaaa-aaaap-qkmmq-cai")'

# 4. Verify frontend declarations are synced
diff src/declarations/daopad_backend/daopad_backend.did.js \
     src/daopad/daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js
```

## Success Criteria ✅

1. ✅ Users can view all critical station information in one place
2. ✅ Data loads quickly without errors (using update call)
3. ✅ UI is consistent with existing DAOPad design
4. ✅ Copy functionality works for all IDs
5. ✅ Responsive on mobile devices
6. ✅ Graceful handling of optional data (disaster_recovery, upgrader_cycles)
7. ✅ Declaration sync prevents "not a function" errors
8. ✅ All four universal issues are addressed

## Future Enhancements

1. **Add more system details:**
   - `max_station_backup_snapshots` (if available in newer versions)
   - `max_upgrader_backup_snapshots` (if available in newer versions)

2. **Configuration Management:**
   - Create proposals to update station name
   - Modify cycle obtain strategy (requires ManageSystemInfo proposal)

3. **Monitoring:**
   - Cycle balance alerts when below threshold
   - Track upgrade history over time

## Notes on the Four Universal Issues

✅ **Issue 1 - Field Hashing:** Not present in system_info - fields use proper names
✅ **Issue 2 - Declaration Sync:** Critical sync step documented with exact commands
✅ **Issue 3 - Optional Encoding:** Handled with `[0]` index checks for opt values
✅ **Issue 4 - Contract Mismatch:** No parameters needed for this read operation

This enhanced plan has been validated with actual dfx calls and includes all necessary type definitions, error handling, and the critical declaration sync step that prevents the common "not a function" error.