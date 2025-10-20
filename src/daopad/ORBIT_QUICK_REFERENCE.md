# Quick Reference: Orbit Station Modifications & DAOPad Governance

## 35 Total Operations Modifying Orbit Station

### By Category

#### Treasury & Assets (6)
1. Transfer - 75%
2. AddAccount - 75%
3. EditAccount - 75%
4. AddAsset - 40%
5. EditAsset - 40%
6. RemoveAsset - 40%

#### Address Book (3)
7. AddAddressBookEntry - 30%
8. EditAddressBookEntry - 30%
9. RemoveAddressBookEntry - 30%

#### Users & Groups (5)
10. AddUser - 50%
11. EditUser - 50%
12. AddUserGroup - 50%
13. EditUserGroup - 50%
14. RemoveUserGroup - 50%

#### Governance & Permissions (7)
15. AddRequestPolicy - 70%
16. EditRequestPolicy - 70%
17. RemoveRequestPolicy - 70%
18. EditPermission - 70%
19. AddNamedRule - 70%
20. EditNamedRule - 70%
21. RemoveNamedRule - 70%

#### External Canisters (9)
22. CreateExternalCanister - 60%
23. ConfigureExternalCanister - 60%
24. ChangeExternalCanister - 60%
25. FundExternalCanister - 60%
26. MonitorExternalCanister - 60%
27. CallExternalCanister - 60%
28. SnapshotExternalCanister - 60%
29. RestoreExternalCanister - 60%
30. PruneExternalCanister - 60%

#### System (4)
31. SystemUpgrade - 90%
32. SystemRestore - 90%
33. ManageSystemInfo - 70%
34. SetDisasterRecovery - 70%

#### Emergency (1)
35. Unspecified emergency recovery mechanisms

---

## Voting Thresholds

| Threshold | Risk Level | Operations |
|-----------|---|---|
| 90% | CRITICAL | System code upgrades |
| 75% | HIGH | Fund transfers, account changes |
| 70% | MEDIUM-HIGH | Governance rules, policies, permissions |
| 60% | MEDIUM | External canister operations |
| 50% | MEDIUM-LOW | User and group management |
| 40% | LOW | Asset registry management |
| 30% | VERY LOW | Address book operations |

---

## Permission Resources

12 resource types can be controlled:
1. Permission (Read, Update)
2. Account (List, Create, Read, Update, Transfer)
3. AddressBook (List, Create, Read, Update, Delete)
4. ExternalCanister (List, Create, Change, Read, Fund, Call)
5. Notification (List, Update)
6. Request (List, Read)
7. RequestPolicy (List, Create, Read, Update, Delete)
8. System (SystemInfo, Capabilities, ManageSystemInfo, Upgrade)
9. User (List, Create, Read, Update)
10. UserGroup (List, Create, Read, Update, Delete)
11. Asset (List, Create, Read, Update, Delete)
12. NamedRule (List, Create, Read, Update, Delete)

Each with AuthScope: Public, Authenticated, or Restricted

---

## Request Policy Rules

8 rule types for approval conditions:
1. AutoApproved - No approval
2. Quorum - Min number of users
3. QuorumPercentage - Percentage of users
4. AllowListedByMetadata - User metadata match
5. AllowListed - Specific users only
6. AnyOf - Multiple rules (OR)
7. AllOf - Multiple rules (AND)
8. Not - Inverts logic

---

## Cycle Management

How Orbit obtains cycles:
1. Disabled - Manual funding only
2. MintFromNativeToken - CMC: ICP → Cycles
3. WithdrawFromCyclesLedger - Ledger balance

External canister monitoring strategies:
1. BelowThreshold - Fund when cycles drop
2. BelowEstimatedRuntime - Fund by runtime estimate
3. Always - Fixed interval funding

---

## Disaster Recovery

Committee-based emergency recovery:
- committee: DisasterRecoveryCommittee
  - user_group_id: UUID
  - quorum: nat16 (approvals needed)

---

## Key Principles

1. **All modifications go through DAOPad governance**
   - Create Orbit request
   - Auto-create DAOPad proposal
   - Community votes using Kong Locker voting power
   - Execute if threshold reached

2. **Voting power = Locked LP value (USD) × 100**
   - Liquid democracy: value-based voting
   - Changes with token price
   - Real skin in the game

3. **Thresholds are risk-based**
   - Higher risk = higher threshold
   - System upgrades: 90% (most critical)
   - Address book: 30% (least critical)

4. **No role bloat**
   - Backend is sole Orbit admin
   - All operations require community approval
   - No human admins creating roles "for show"

5. **Extensible without schema changes**
   - Metadata key-value pairs on all resources
   - Named rules for reusable policies
   - Future additions without breaking changes

---

## Source File Locations

### Orbit Station Spec
`/src/orbit-reference/core/station/api/spec.did` - 3504 lines

### DAOPad Governance
`/src/daopad/daopad_backend/src/proposals/types.rs` - OrbitRequestType enum
`/src/daopad/daopad_backend/src/proposals/orbit_requests.rs` - ensure_proposal_for_request()

### Reference Documents
`/src/daopad/ORBIT_STATION_MODIFICATIONS.md` - Complete operation details
`/src/daopad/DAOPAD_GOVERNANCE_MAPPING.md` - Governance mapping

