# Orbit Station Operations to DAOPad Proposal Mapping

This document maps all 35+ Orbit Station modification operations to DAOPad's governance proposal system for the Operating Agreement.

## Overview

Each Orbit Station modification operation must:
1. Create a request in Orbit Station (if operation type requires it)
2. Auto-create a corresponding DAOPad proposal
3. Use Kong Locker voting power (USD value of locked LP × 100)
4. Meet DAOPad's risk-based voting threshold
5. Complete in DAOPad before Orbit backend can execute

---

## Mapping: Orbit Operations to OrbitRequestType Enum

**File**: `daopad_backend/src/proposals/types.rs` - `OrbitRequestType` enum

### 1. Treasury Operations

| Orbit Operation | DAOPad Type | Voting Threshold | Why |
|---|---|---|---|
| Transfer | Transfer | 75% | Moves funds externally |
| AddAccount | AddAccount | 75% | Creates fund container |
| EditAccount | EditAccount | 75% | Modifies fund rules |
| AddAsset | AddAsset | 40% | Enables new asset type |
| EditAsset | EditAsset | 40% | Modifies asset config |
| RemoveAsset | RemoveAsset | 40% | Disables asset |

**Rationale**: Fund transfers are high-risk, require 75%. Asset management is lower-risk infrastructure, 40%.

### 2. Address Book Operations

| Orbit Operation | DAOPad Type | Voting Threshold | Why |
|---|---|---|---|
| AddAddressBookEntry | AddressBookEntry | 30% | Lower risk, operational |
| EditAddressBookEntry | EditAddressBookEntry | 30% | Modifies labels/metadata |
| RemoveAddressBookEntry | RemoveAddressBookEntry | 30% | Removes trusted address |

**Rationale**: Address book is operational, not governance. 30% threshold appropriate.

### 3. User Management

| Orbit Operation | DAOPad Type | Voting Threshold | Why |
|---|---|---|---|
| AddUser | AddUser | 50% | New member changes voting power |
| EditUser | EditUser | 50% | Status/group changes |
| RemoveUserGroup | RemoveUserGroup | 50% | Group deletion affects permissions |
| AddUserGroup | AddUserGroup | 50% | New organizational unit |
| EditUserGroup | EditUserGroup | 50% | Group name/composition |

**Rationale**: Users/groups directly affect governance. 50% threshold ensures community agreement.

### 4. Governance & Permission Operations

| Orbit Operation | DAOPad Type | Voting Threshold | Why |
|---|---|---|---|
| AddRequestPolicy | AddRequestPolicy | 70% | Creates approval rules |
| EditRequestPolicy | EditRequestPolicy | 70% | Changes approval process |
| RemoveRequestPolicy | RemoveRequestPolicy | 70% | Removes approval rules |
| EditPermission | EditPermission | 70% | Changes resource access |
| AddNamedRule | AddNamedRule | 70% | Creates reusable policy |
| EditNamedRule | EditNamedRule | 70% | Modifies policy |
| RemoveNamedRule | RemoveNamedRule | 70% | Deletes policy |

**Rationale**: Governance rules are critical. 70% threshold protects against unilateral changes.

### 5. External Canister Operations

| Orbit Operation | DAOPad Type | Voting Threshold | Why |
|---|---|---|---|
| CreateExternalCanister | CreateExternalCanister | 60% | New application |
| ConfigureExternalCanister | ChangeExternalCanister | 60% | Modify settings |
| ChangeExternalCanister | CallExternalCanister | 60% | Upgrade code |
| FundExternalCanister | CallExternalCanister | 60% | Send cycles |
| MonitorExternalCanister | CallExternalCanister | 60% | Monitoring config |
| CallExternalCanister | CallExternalCanister | 60% | Execute methods |
| SnapshotExternalCanister | CallExternalCanister | 60% | Backup canister |
| RestoreExternalCanister | CallExternalCanister | 60% | Restore canister |
| PruneExternalCanister | CallExternalCanister | 60% | Delete resources |

**Rationale**: External canisters are medium-risk, 60% threshold. Changes to external systems need careful review.

### 6. System Management

| Orbit Operation | DAOPad Type | Voting Threshold | Why |
|---|---|---|---|
| SystemUpgrade | SystemUpgrade | 90% | Orbit code upgrade = highest risk |
| SystemRestore | SystemRestore | 90% | Snapshot restoration = highest risk |
| ManageSystemInfo | ManageSystemInfo | 70% | System configuration |
| SetDisasterRecovery | EditPermission | 70% | Emergency override setup |

**Rationale**: System operations are critical infrastructure. 90% for code upgrades (most critical). 70% for config.

---

## Risk-Based Voting Thresholds Summary

### Voting Duration

All proposals use same duration before vote deadline:
- Standard voting period: 7 days (604,800 seconds)
- Can be overridden per proposal type in config

### Threshold Levels

| Risk Level | Threshold | Operations |
|---|---|---|
| Critical (90%) | System code upgrades | SystemUpgrade, SystemRestore |
| High (75%) | Fund movements | Transfer, AddAccount, EditAccount |
| Medium-High (70%) | Governance changes | Permissions, Policies, Named Rules, System Config |
| Medium (60%) | External integrations | External canister operations |
| Medium-Low (50%) | User/group management | AddUser, EditUser, User Groups |
| Low (40%) | Asset registry | AddAsset, EditAsset, RemoveAsset |
| Very Low (30%) | Address book | Address book operations |

---

## Implementation Pattern in DAOPad

### Step 1: Create Orbit Request

```rust
// Backend calls Orbit Station
let request_id = orbit_station.create_request(
    RequestOperation::Transfer(...)
).await?;
```

### Step 2: Auto-Create DAOPad Proposal

```rust
use crate::proposals::{ensure_proposal_for_request, OrbitRequestType};

match ensure_proposal_for_request(
    token_canister_id,
    request_id.clone(),
    OrbitRequestType::Transfer,  // Maps to 75% threshold
).await {
    Ok(proposal_id) => {
        // Proposal created, voting can begin
        Ok(request_id)
    }
    Err(e) => {
        // GOVERNANCE VIOLATION if proposal creation fails
        Err(format!("GOVERNANCE VIOLATION: {}", e))
    }
}
```

### Step 3: Community Voting (via Kong Locker)

1. DAOPad fetches voting power from Kong Locker
   - Query: `kong_locker.get_all_voting_powers()` (query method)
   - Each principal has voting power = USD value of locked LP × 100

2. Users vote for/against proposal
   - Voting power weighted by locked tokens
   - Proposal tracks cumulative votes

3. When vote threshold reached
   - For Transfer (75%): `sum(votes_for) >= (total_voting_power × 0.75)`
   - Proposal can be approved

### Step 4: Execute Orbit Operation

```rust
// Once DAOPad proposal approved:
match orbit_station.approve_request(request_id).await {
    Ok(response) => {
        // Orbit executes the operation
        update_proposal_status(proposal_id, "completed");
    }
    Err(e) => {
        // Operation failed in Orbit
        update_proposal_status(proposal_id, "failed");
    }
}
```

---

## Special Cases

### Operations Without RequestSpecifier

These operations may not have direct Orbit RequestSpecifier but still need DAOPad proposals:

- **SnapshotExternalCanister** - No direct RequestSpecifier in Orbit
  - DAOPad type: CallExternalCanister (or new SnapshotExternalCanister)
  - Threshold: 60%

- **RestoreExternalCanister** - No direct RequestSpecifier in Orbit
  - DAOPad type: CallExternalCanister (or new RestoreExternalCanister)
  - Threshold: 60%

- **PruneExternalCanister** - No direct RequestSpecifier in Orbit
  - DAOPad type: CallExternalCanister (or new PruneExternalCanister)
  - Threshold: 60%

### Composite Operations

Some operations might involve multiple DAOPad governance checks:

- **EditAccount** (add/remove assets):
  - Primary: EditAccount (75%)
  - If adding new assets: might also need AddAsset (40%) if asset is new

- **EditPermission** (modify access):
  - EditPermission (70%)
  - Affects multiple resources

---

## Governance Rules Enforced

### Rule 1: No Bypassing
```rust
// If operation requires DAOPad proposal, it MUST be created
// Backend cannot directly approve Orbit requests
// Every modification goes through community voting
```

### Rule 2: Voting Thresholds are Minimum
```rust
// 75% means: sum(votes_for) >= (total_voting_power * 0.75)
// Must be measured at vote deadline, not start of voting
// Late votes from whales still count
```

### Rule 3: Voting Power from Kong Locker
```rust
// Each user's voting power = amount_locked_lp * usd_per_lp * 100
// Query from Kong Locker (read-only)
// Not modified by DAOPad
```

### Rule 4: Liquid Democracy
```rust
// Voting power changes with LP token value
// If token value drops 50%, voting power drops 50%
// Real skin in the game, not static roles
```

---

## Operating Agreement Language

### For Section 1: Management Operations

"All modifications to the Station treasury configuration, including account creation, asset registry changes, and fund transfers, require approval via DAOPad proposals using Kong Locker voting power, with thresholds ranging from 30% (operational changes) to 75% (fund transfers)."

### For Section 2: Governance

"Permission and policy modifications require 70% community approval to prevent unilateral control changes. System upgrades require 90% approval due to critical infrastructure impact."

### For Section 3: Emergency Recovery

"Disaster recovery committee setup requires 70% approval. Emergency recovery can be triggered by committee quorum vote without DAOPad voting if Station becomes inaccessible."

---

## Complete Operation Count

Total modifiable operations: 35

- Treasury: 6 ops (Transfer, Add/Edit Account, Add/Edit/Remove Asset)
- Address Book: 3 ops (Add/Edit/Remove Entry)
- Users: 5 ops (Add/Edit User, Add/Edit/Remove Group)
- Governance: 7 ops (Add/Edit/Remove Policy/Rule, Edit Permission)
- External Canisters: 9 ops (Create, Configure, Change, Fund, Monitor, Call, Snapshot, Restore, Prune)
- System: 4 ops (Upgrade, Restore, ManageInfo, DisasterRecovery)

All protected by DAOPad governance thresholds.

---

## File References

- **DAOPad Types**: `/src/daopad/daopad_backend/src/proposals/types.rs` - OrbitRequestType enum
- **Proposal Creation**: `/src/daopad/daopad_backend/src/proposals/orbit_requests.rs` - ensure_proposal_for_request()
- **Orbit Spec**: `/src/orbit-reference/core/station/api/spec.did` - All operation definitions
- **Voting**: Kong Locker voting power (external reference)

