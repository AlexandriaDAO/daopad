# Comprehensive Research: All Ways Orbit Station Can Be Modified

## Overview
This document provides complete coverage of all modification mechanisms in Orbit Station, derived from analysis of the Candid specification at `/core/station/api/spec.did`. All 33 operation types and their configuration mechanisms have been documented for the Operating Agreement.

---

## 1. REQUEST TYPES THAT MODIFY STATION CONFIGURATION

### Complete List of 33 Operation Types

#### A. TREASURY MANAGEMENT (5 operations)

1. **Transfer** - Move funds from accounts to external addresses
   - Source: `TransferOperation` (spec.did line 353)
   - Modifies: Account balances, transfer history
   - Parameters:
     * from_account_id: UUID
     * from_asset_id: UUID
     * with_standard: text (e.g., "erc20", "icrc1")
     * amount: nat
     * to: text (destination address)
     * fee: opt nat (optional, uses default if not set)
     * network: opt Network (optional)
     * metadata: vec TransferMetadata (transaction tags/nonce)

2. **AddAccount** - Create new treasury account
   - Source: `AddAccountOperationInput` (spec.did line 407)
   - Modifies: Account list, asset mappings
   - Parameters:
     * name: text
     * assets: vec UUID
     * metadata: vec AccountMetadata
     * read_permission: Allow (Public/Authenticated/Restricted)
     * configs_permission: Allow
     * transfer_permission: Allow
     * configs_request_policy: opt RequestPolicyRule
     * transfer_request_policy: opt RequestPolicyRule

3. **EditAccount** - Modify account configuration
   - Source: `EditAccountOperationInput` (spec.did line 382)
   - Modifies: Account name, assets, permissions, policies
   - Parameters:
     * account_id: UUID
     * name: opt text
     * change_assets: opt ChangeAssets (ReplaceWith or Change variant)
     * read_permission: opt Allow
     * configs_permission: opt Allow
     * transfer_permission: opt Allow
     * configs_request_policy: opt RequestPolicyRuleInput (Set or Remove)
     * transfer_request_policy: opt RequestPolicyRuleInput

4. **AddAsset** - Add new supported asset (e.g., ICP, BTC, ETH)
   - Source: `AddAssetOperationInput` (spec.did line 2627)
   - Modifies: Asset registry
   - Parameters:
     * blockchain: text (e.g., "icp", "ethereum", "bitcoin")
     * standards: vec text (e.g., "icrc1", "erc20")
     * symbol: AssetSymbol (e.g., "ICP")
     * name: text (e.g., "Internet Computer")
     * metadata: vec AssetMetadata (logo, etc.)
     * decimals: nat32

5. **EditAsset** - Modify asset configuration
   - Source: `EditAssetOperationInput` (spec.did line 2649)
   - Modifies: Asset metadata, symbol, name
   - Parameters:
     * asset_id: UUID
     * name: opt text
     * blockchain: opt text
     * standards: opt vec text
     * symbol: opt AssetSymbol
     * change_metadata: opt ChangeMetadata (ReplaceAllBy/OverrideSpecifiedBy/RemoveKeys)

6. **RemoveAsset** - Remove asset from system
   - Source: `RemoveAssetOperationInput` (spec.did line 2682)
   - Modifies: Asset registry
   - Parameters:
     * asset_id: UUID

#### B. ADDRESS BOOK MANAGEMENT (3 operations)

7. **AddAddressBookEntry** - Add trusted address
   - Source: `AddAddressBookEntryOperationInput` (spec.did line 441)
   - Modifies: Address book entries
   - Parameters:
     * address_owner: text
     * address: text (e.g., "0x1234...")
     * address_format: text (e.g., "icp_account_identifier")
     * blockchain: text
     * metadata: vec AddressBookMetadata (KYC, risk scores, etc.)
     * labels: vec text (e.g., ["exchange", "kyc"])

8. **EditAddressBookEntry** - Modify address book entry
   - Source: `EditAddressBookEntryOperationInput` (spec.did line 473)
   - Modifies: Labels, metadata
   - Parameters:
     * address_book_entry_id: UUID
     * address_owner: opt text
     * labels: opt vec text
     * change_metadata: opt ChangeAddressBookMetadata

9. **RemoveAddressBookEntry** - Remove address from book
   - Source: `RemoveAddressBookEntryOperationInput` (spec.did line 490)
   - Modifies: Address book
   - Parameters:
     * address_book_entry_id: UUID

#### C. USER AND GROUP MANAGEMENT (6 operations)

10. **AddUser** - Add new member to station
    - Source: `AddUserOperationInput` (spec.did line 495)
    - Modifies: User list, member roles
    - Parameters:
      * name: text
      * identities: vec principal (IC principals)
      * groups: vec UUID (group membership)
      * status: UserStatus (Active/Inactive)

11. **EditUser** - Modify user configuration
    - Source: `EditUserOperationInput` (spec.did line 518)
    - Modifies: User status, groups, identities
    - Parameters:
      * id: UUID
      * name: opt text
      * identities: opt vec principal
      * groups: opt vec UUID
      * status: opt UserStatus
      * cancel_pending_requests: opt bool

12. **RemoveUser** - Covered under EditUser (set Inactive status)
    - Alternative: Create new RemoveUser variant if separate operation

13. **AddUserGroup** - Create user group
    - Source: `AddUserGroupOperationInput` (spec.did line 541)
    - Modifies: Group list
    - Parameters:
      * name: text

14. **EditUserGroup** - Modify user group
    - Source: `EditUserGroupOperationInput` (spec.did line 553)
    - Modifies: Group name
    - Parameters:
      * user_group_id: UUID
      * name: text

15. **RemoveUserGroup** - Delete user group
    - Source: `RemoveUserGroupOperationInput` (spec.did line 565)
    - Modifies: Group list
    - Parameters:
      * user_group_id: UUID

#### D. GOVERNANCE & PERMISSIONS (6 operations)

16. **AddRequestPolicy** - Create approval policy
    - Source: `AddRequestPolicyOperationInput` (spec.did line 992)
    - Modifies: Request policies
    - Parameters:
      * specifier: RequestSpecifier (which operations this applies to)
      * rule: RequestPolicyRule (how to evaluate approval)

17. **EditRequestPolicy** - Modify approval policy
    - Source: `EditRequestPolicyOperationInput` (spec.did line 1006)
    - Modifies: Policies
    - Parameters:
      * policy_id: UUID
      * specifier: opt RequestSpecifier
      * rule: opt RequestPolicyRule

18. **RemoveRequestPolicy** - Delete approval policy
    - Source: `RemoveRequestPolicyOperationInput` (spec.did line 1020)
    - Modifies: Policies
    - Parameters:
      * policy_id: UUID

19. **EditPermission** - Modify resource access control
    - Source: `EditPermissionOperationInput` (spec.did line 976)
    - Modifies: Who can access what resources
    - Parameters:
      * resource: Resource (which resource: Account, User, System, etc.)
      * auth_scope: opt AuthScope (Public/Authenticated/Restricted)
      * users: opt vec UUID (specific users allowed)
      * user_groups: opt vec UUID (groups allowed)

20. **AddNamedRule** - Create reusable policy rule
    - Source: `AddNamedRuleOperationInput` (spec.did line 2118)
    - Modifies: Named rules registry
    - Parameters:
      * name: text
      * description: opt text
      * rule: RequestPolicyRule

21. **EditNamedRule** - Modify named policy rule
    - Source: `EditNamedRuleOperationInput` (spec.did line 2134)
    - Modifies: Named rules
    - Parameters:
      * named_rule_id: UUID
      * name: opt text
      * description: opt opt text
      * rule: opt RequestPolicyRule

22. **RemoveNamedRule** - Delete named rule
    - Source: `RemoveNamedRuleOperationInput` (spec.did line 2152)
    - Modifies: Named rules
    - Parameters:
      * named_rule_id: UUID

#### E. EXTERNAL CANISTER MANAGEMENT (8 operations)

23. **CreateExternalCanister** - Create or import external canister
    - Source: `CreateExternalCanisterOperationInput` (spec.did line 729)
    - Modifies: External canister list
    - Variants:
      * CreateNew: Create new canister with initial cycles and subnet selection
      * AddExisting: Add already-created canister
    - Parameters:
      * kind: CreateExternalCanisterOperationKind
      * name: text
      * description: opt text
      * labels: opt vec text
      * metadata: opt vec ExternalCanisterMetadata
      * permissions: ExternalCanisterPermissionsCreateInput
      * request_policies: ExternalCanisterRequestPoliciesCreateInput

24. **ConfigureExternalCanister** - Modify canister settings
    - Source: `ConfigureExternalCanisterOperationInput` (spec.did line 787)
    - Modifies: Canister configuration, native IC settings
    - Variants:
      * Settings: Modify Orbit settings (name, labels, permissions, policies)
      * SoftDelete: Remove from Orbit (keep on IC)
      * Delete: Remove from Orbit and IC (irreversible)
      * NativeSettings: IC canister settings (memory_allocation, compute_allocation, etc.)
    - Parameters:
      * canister_id: principal
      * kind: ConfigureExternalCanisterOperationKind

25. **ChangeExternalCanister** - Install/upgrade canister code
    - Source: `ChangeExternalCanisterOperationInput` (spec.did line 658)
    - Modifies: Canister WASM and state
    - Install modes: install, reinstall, upgrade
    - Parameters:
      * canister_id: principal
      * mode: CanisterInstallMode
      * module: blob (WASM code)
      * module_extra_chunks: opt WasmModuleExtraChunks
      * arg: opt blob (init argument)

26. **FundExternalCanister** - Send cycles to canister
    - Source: `FundExternalCanisterOperationInput` (spec.did line 809)
    - Modifies: Canister cycle balance
    - Parameters:
      * canister_id: principal
      * kind: FundExternalCanisterOperationKind (Send)
      * cycles: nat64

27. **MonitorExternalCanister** - Enable/configure cycle monitoring
    - Source: `MonitorExternalCanisterOperationInput` (spec.did line 866)
    - Modifies: Monitoring configuration
    - Strategies:
      * BelowThreshold: Fund when cycles drop below threshold
      * BelowEstimatedRuntime: Fund based on estimated runtime
      * Always: Fund at fixed intervals
    - Parameters:
      * canister_id: principal
      * kind: MonitorExternalCanisterOperationKind (Start/Stop)
      * funding_strategy: MonitorExternalCanisterStrategyInput
      * cycle_obtain_strategy: opt CycleObtainStrategyInput

28. **CallExternalCanister** - Execute method on external canister
    - Source: `CallExternalCanisterOperationInput` (spec.did line 888)
    - Modifies: External canister state
    - Parameters:
      * validation_method: opt CanisterMethod (pre-execution validation)
      * execution_method: CanisterMethod (method to execute)
      * arg: opt blob (argument)
      * execution_method_cycles: opt nat64 (cycles attached)

29. **SnapshotExternalCanister** - Create canister snapshot
    - Source: `SnapshotExternalCanisterOperationInput` (spec.did line 935)
    - Modifies: Snapshot storage
    - Parameters:
      * canister_id: principal
      * replace_snapshot: opt text (snapshot ID to replace)
      * force: bool (snapshot even if canister fails to stop)

30. **RestoreExternalCanister** - Restore canister from snapshot
    - Source: `RestoreExternalCanisterOperationInput` (spec.did line 950)
    - Modifies: Canister state (restored from snapshot)
    - Parameters:
      * canister_id: principal
      * snapshot_id: text

31. **PruneExternalCanister** - Delete canister resources
    - Source: `PruneExternalCanisterOperationInput` (spec.did line 961)
    - Modifies: Canister storage, snapshots
    - Prune targets:
      * chunk_store: Remove stored WASM chunks
      * snapshot: Remove specific snapshot
      * state: Remove canister state
    - Parameters:
      * canister_id: principal
      * prune: variant { chunk_store; snapshot : text; state }

#### F. SYSTEM MANAGEMENT (3 operations)

32. **SystemUpgrade** - Upgrade Orbit Station or Upgrader canister
    - Source: `SystemUpgradeOperationInput` (spec.did line 611)
    - Modifies: Orbit code, backup snapshots
    - Targets: UpgradeStation, UpgradeUpgrader
    - Parameters:
      * target: SystemUpgradeTarget
      * module_checksum: Sha256Hash
      * arg_checksum: opt Sha256Hash
      * take_backup_snapshot: opt bool

33. **SystemRestore** - Restore from backup snapshot
    - Source: `SystemRestoreOperationInput` (spec.did line 630)
    - Modifies: Station state (restored from snapshot)
    - Targets: RestoreStation, RestoreUpgrader
    - Parameters:
      * target: SystemRestoreTarget
      * snapshot_id: text

34. **ManageSystemInfo** - Modify system configuration
    - Source: `ManageSystemInfoOperationInput` (spec.did line 2187)
    - Modifies: Station name, cycle strategies, snapshot limits
    - Parameters:
      * name: opt text
      * cycle_obtain_strategy: opt CycleObtainStrategyInput
      * max_station_backup_snapshots: opt nat64
      * max_upgrader_backup_snapshots: opt nat64

35. **SetDisasterRecovery** - Configure emergency recovery
    - Source: `SetDisasterRecoveryOperationInput` (spec.did line 648)
    - Modifies: Disaster recovery committee
    - Parameters:
      * committee: opt DisasterRecoveryCommittee
        * user_group_id: UUID (committee members)
        * quorum: nat16 (approvals needed)

---

## 2. REQUEST POLICY SYSTEM

### RequestPolicyRule Types (spec.did lines 92-102)

All operations can be protected with flexible approval rules:

1. **AutoApproved** - No approval needed, execute immediately
2. **Quorum** - Minimum number of users must approve
   - approvers: UserSpecifier (Any/Id/Group)
   - min_approved: nat16
3. **QuorumPercentage** - Percentage of users must approve
   - Similar to Quorum but percentage-based
4. **AllowListedByMetadata** - Allow if user has specific metadata
5. **AllowListed** - Allow only specific users
6. **AnyOf** - Multiple rules: any one can approve (OR logic)
7. **AllOf** - Multiple rules: all must approve (AND logic)
8. **Not** - Inverts a rule logic

### RequestPolicyCallerPrivileges (spec.did lines 22-29)

Per-policy privileges:
- can_edit: Can modify this policy
- can_delete: Can remove this policy

---

## 3. PERMISSION SYSTEM

### Resource Types that Can Be Protected (spec.did lines 2446-2459)

Nine categories of resources, each with specific actions:

1. **Permission** - Access control itself
   - Actions: Read, Update

2. **Account** - Treasury accounts
   - Actions: List, Create, Read (specific), Update (specific), Transfer (specific)

3. **AddressBook** - Trusted addresses
   - Actions: List, Create, Read, Update, Delete

4. **ExternalCanister** - External canisters
   - Actions: List, Create, Change, Read, Fund, Call

5. **Notification** - System messages
   - Actions: List, Update (specific)

6. **Request** - Approval requests
   - Actions: List, Read (specific)

7. **RequestPolicy** - Approval policies
   - Actions: List, Create, Read, Update, Delete

8. **System** - System operations
   - Actions: SystemInfo, Capabilities, ManageSystemInfo, Upgrade

9. **User** - Station members
   - Actions: List, Create, Read (specific), Update (specific)

10. **UserGroup** - Member groups
    - Actions: List, Create, Read, Update, Delete

11. **Asset** - Supported assets
    - Actions: List, Create, Read, Update, Delete

12. **NamedRule** - Reusable rules
    - Actions: List, Create, Read, Update, Delete

### Authorization Scopes (spec.did lines 2350-2357)

Each resource has an AuthScope controlling access:

1. **Public** - No authentication required
2. **Authenticated** - Any IC user can access
3. **Restricted** - Only specific users/groups

### Allow Structure (spec.did lines 2340-2347)

```candid
type Allow = record {
  auth_scope : AuthScope;
  users : vec UUID;
  user_groups : vec UUID;
};
```

Specifies who can access a specific resource and action.

---

## 4. REQUEST SPECIFIERS (Station Configuration Targets)

From spec.did lines 39-68, RequestSpecifier defines which operations each policy applies to:

```
AddAccount
AddUser
EditAccount : ResourceIds
EditUser : ResourceIds
Transfer : ResourceIds
AddAddressBookEntry
EditAddressBookEntry : ResourceIds
RemoveAddressBookEntry : ResourceIds
SystemUpgrade
SetDisasterRecovery
ChangeExternalCanister : ExternalCanisterId
FundExternalCanister : ExternalCanisterId
CreateExternalCanister
CallExternalCanister : CallExternalCanisterResourceTarget
EditPermission : ResourceSpecifier
AddRequestPolicy
EditRequestPolicy : ResourceIds
RemoveRequestPolicy : ResourceIds
AddUserGroup
EditUserGroup : ResourceIds
RemoveUserGroup : ResourceIds
ManageSystemInfo
AddAsset
EditAsset : ResourceIds
RemoveAsset : ResourceIds
AddNamedRule
EditNamedRule : ResourceIds
RemoveNamedRule : ResourceIds
```

---

## 5. CYCLE MANAGEMENT SYSTEM

### Cycle Obtain Strategies (spec.did lines 2199-2212)

How Orbit obtains cycles to operate and fund external canisters:

1. **Disabled** - No automatic cycle obtaining
2. **MintFromNativeToken**
   - Uses CMC to mint cycles from ICP
   - account_id: UUID (which treasury account has ICP)
3. **WithdrawFromCyclesLedger**
   - Uses Cycles Ledger balance
   - account_id: UUID (for receiving cycles)

### External Canister Monitoring Strategies (spec.did lines 842-848)

1. **BelowThreshold**
   - min_cycles: nat (threshold)
   - fund_cycles: nat (send when triggered)

2. **BelowEstimatedRuntime**
   - min_runtime_secs: nat64
   - fund_runtime_secs: nat64
   - max_runtime_cycles_fund: nat
   - fallback settings for when runtime unavailable

3. **Always**
   - Fund at fixed interval: nat (cycles per period)

---

## 6. DISASTER RECOVERY SYSTEM

### SetDisasterRecoveryOperation (spec.did lines 648-656)

Enables emergency recovery by a committee:

```candid
type DisasterRecoveryCommittee = record {
  user_group_id : UUID;      // Committee members
  quorum : nat16;             // Approvals needed for DR operations
};
```

DR operations are triggered when station becomes inaccessible:
- Can restore from snapshots
- Can recover from emergency committee approval
- Committee members must approve with specified quorum

---

## 7. SYSTEM INFO MANAGEMENT

### ManageSystemInfoOperation (spec.did lines 2187-2196)

Configurable system parameters:

1. **name** : text - Station display name
2. **cycle_obtain_strategy** : CycleObtainStrategyInput
   - How Orbit obtains cycles for operation
3. **max_station_backup_snapshots** : nat64
   - Rotation limit for station snapshots
   - Oldest snapshot deleted when limit reached
4. **max_upgrader_backup_snapshots** : nat64
   - Rotation limit for upgrader snapshots

### System Information Retrieved (spec.did lines 2235-2258)

Current system state includes:
- name: text
- version: text
- upgrader_id: principal
- cycles: nat64 (station balance)
- upgrader_cycles: opt nat64
- last_upgrade_timestamp: TimestampRFC3339
- raw_rand_successful: bool
- disaster_recovery: opt DisasterRecovery
- cycle_obtain_strategy: CycleObtainStrategy
- max_station_backup_snapshots: nat64
- max_upgrader_backup_snapshots: nat64

---

## 8. EXTERNAL CANISTER PERMISSIONS & POLICIES

### ExternalCanisterPermissions (spec.did lines 3096, 3109, 3153)

Separate permission system for external canisters:

1. **Permissions** - What users can do to the canister
   - List: Who can list it
   - Create: Who can create/add canisters
   - Change: Who can install code
   - Read: Who can read details
   - Fund: Who can send cycles
   - Call: Who can execute methods (with specific method targets)

2. **Request Policies** - Approval requirements
   - ChangeRequestPolicy: Approvals for code changes
   - FundRequestPolicy: Approvals for funding
   - CallRequestPolicy: Approvals for method calls

### ExternalCanisterCallPermission (spec.did lines 3036-3077)

Fine-grained control for CallExternalCanister operations:

1. **validation_method** - Optional validation method
   - Must return: Result { Ok : text; Err : text }
   - Used for argument validation and rendering
   - No : No validation
   - ValidationMethod : CanisterMethod

2. **execution_method** - Required execution method
   - CanisterMethod { canister_id, method_name }

3. **arg_checksum** - Optional argument validation
   - Sha256 hash of argument blob

---

## 9. DATA MODEL RELATIONSHIPS

### Key UUID References

Operations reference other entities by UUID:

- **user_id** : UUID - References user record
- **user_group_id** : UUID - References group record
- **account_id** : UUID - References treasury account
- **asset_id** : UUID - References asset definition
- **address_book_entry_id** : UUID - References trusted address
- **policy_id** : UUID - References request policy
- **named_rule_id** : UUID - References named rule
- **canister_id** : principal - References external canister
- **snapshot_id** : text - References canister snapshot

### Metadata Storage

Extensible metadata on multiple entities:

1. **AccountMetadata** - Key-value pairs on accounts
2. **AssetMetadata** - Key-value pairs on assets (logo URL, etc.)
3. **AddressBookMetadata** - Key-value pairs on addresses (KYC status, risk, etc.)
4. **ExternalCanisterMetadata** - Key-value pairs on canisters (app_id, etc.)

---

## 10. REQUEST LIFECYCLE & APPROVAL FLOW

### Request Status Progression (spec.did lines 280-299)

```
Created         → Initial state
   ↓
Approved        → Policy evaluated to approved
   ↓
Processing      → Executing
   ↓
Completed       → Success
   
OR

Created         → Initial state
   ↓
Rejected        → Policy evaluated to rejected
   ↓
Cancelled       → Manually cancelled
   ↓
Failed          → Execution failed
   ↓
Scheduled       → Queued for later execution
```

### Request Evaluation (spec.did lines 150-159)

Each request is evaluated against matching policies:

```candid
type RequestEvaluationResult = record {
  request_id : UUID;
  status : EvaluationStatus;  // Approved/Rejected/Pending
  policy_results : vec RequestPolicyRuleResult;
  result_reasons : opt vec EvaluationSummaryReason;
};
```

Evaluation reasons:
- ApprovalQuorum - Quorum met
- AllowList - Caller in allow list
- AllowListMetadata - Caller metadata matches
- AutoApproved - No approval needed

---

## 11. COMPLETE REQUEST SPECIFIER MAPPING

### System-Level Operations (7)

| Operation | Operation Type | Resource IDs | Configuration Impact |
|-----------|---|---|---|
| AddAccount | RequestSpecifier::AddAccount | - | Creates new treasury account |
| EditAccount | RequestSpecifier::EditAccount | account_id | Modifies account settings |
| Transfer | RequestSpecifier::Transfer | account_id | Moves funds |
| AddUser | RequestSpecifier::AddUser | - | Adds member |
| EditUser | RequestSpecifier::EditUser | user_id | Modifies member |
| AddAddressBookEntry | RequestSpecifier::AddAddressBookEntry | - | Adds trusted address |
| EditAddressBookEntry | RequestSpecifier::EditAddressBookEntry | address_book_entry_id | Modifies address |
| RemoveAddressBookEntry | RequestSpecifier::RemoveAddressBookEntry | address_book_entry_id | Removes address |
| SystemUpgrade | RequestSpecifier::SystemUpgrade | - | Upgrades Orbit code |
| SetDisasterRecovery | RequestSpecifier::SetDisasterRecovery | - | Configures emergency recovery |
| ManageSystemInfo | RequestSpecifier::ManageSystemInfo | - | Modifies system settings |
| AddAsset | RequestSpecifier::AddAsset | - | Adds supported asset |
| EditAsset | RequestSpecifier::EditAsset | asset_id | Modifies asset |
| RemoveAsset | RequestSpecifier::RemoveAsset | asset_id | Removes asset |
| AddUserGroup | RequestSpecifier::AddUserGroup | - | Creates user group |
| EditUserGroup | RequestSpecifier::EditUserGroup | user_group_id | Modifies group |
| RemoveUserGroup | RequestSpecifier::RemoveUserGroup | user_group_id | Removes group |
| AddNamedRule | RequestSpecifier::AddNamedRule | - | Creates reusable rule |
| EditNamedRule | RequestSpecifier::EditNamedRule | named_rule_id | Modifies rule |
| RemoveNamedRule | RequestSpecifier::RemoveNamedRule | named_rule_id | Removes rule |
| AddRequestPolicy | RequestSpecifier::AddRequestPolicy | - | Creates approval policy |
| EditRequestPolicy | RequestSpecifier::EditRequestPolicy | policy_id | Modifies policy |
| RemoveRequestPolicy | RequestSpecifier::RemoveRequestPolicy | policy_id | Removes policy |
| EditPermission | RequestSpecifier::EditPermission | resource | Modifies access control |

### External Canister Operations (7)

| Operation | Operation Type | Resource IDs | Configuration Impact |
|-----------|---|---|---|
| CreateExternalCanister | RequestSpecifier::CreateExternalCanister | - | Creates/imports canister |
| ChangeExternalCanister | RequestSpecifier::ChangeExternalCanister | canister_id | Installs/upgrades code |
| FundExternalCanister | RequestSpecifier::FundExternalCanister | canister_id | Sends cycles |
| CallExternalCanister | RequestSpecifier::CallExternalCanister | call_target | Executes method |
| SnapshotExternalCanister | (No direct RequestSpecifier) | canister_id | Creates snapshot |
| RestoreExternalCanister | (No direct RequestSpecifier) | canister_id | Restores from snapshot |
| PruneExternalCanister | (No direct RequestSpecifier) | canister_id | Deletes resources |

---

## 12. ARCHITECTURE NOTES

### Principle: Minimalist Storage

The Orbit Station design follows these principles relevant to modification:

1. **State Mutations**: All modifications to station configuration happen through typed operations
2. **Approval First**: Every modification can require approval before execution
3. **Snapshot Support**: Most system changes can be backed up and restored
4. **Extensible Metadata**: Raw key-value metadata allows future configuration without schema changes

### Immutable Operations

Once created, request records are immutable. Modification happens by creating new requests.

### Cascading Authorization

1. Permission defines who can initiate (create_request)
2. RequestPolicy defines who must approve (approve_request)
3. Disaster Recovery provides emergency override path

---

## 13. SOURCE REFERENCES

All definitions from: `/home/theseus/alexandria/daopad/src/orbit-reference/core/station/api/spec.did`

- RequestOperationType: Lines 1172-1241
- RequestSpecifier: Lines 39-68
- RequestPolicyRule: Lines 92-102
- Resource Types: Lines 2446-2459
- AuthScope: Lines 2350-2357
- Allow: Lines 2340-2347
- System Info: Lines 2235-2258
- Cycle Strategies: Lines 2199-2212, 842-848
- Disaster Recovery: Lines 641-656, 2261-2266
- All Operation Inputs: Lines 329-2196

---

## Summary: 35+ Ways to Modify Orbit Station

1. **Treasury Operations** (6): Transfer, Add/Edit Account, Add/Edit/Remove Asset
2. **Address Management** (3): Add/Edit/Remove Address Book Entry
3. **User Management** (5): Add/Edit User, Add/Edit/Remove User Group
4. **Governance** (7): Add/Edit/Remove Request Policy, Add/Edit/Remove Named Rule, Edit Permission
5. **External Canister Management** (8): Create, Configure, Change, Fund, Monitor, Call, Snapshot, Restore, Prune
6. **System Management** (3): System Upgrade, System Restore, Manage System Info
7. **Emergency** (1): Set Disaster Recovery

Plus configurable policies and permissions for each operation type, enabling fine-grained control over who can modify what and when.

