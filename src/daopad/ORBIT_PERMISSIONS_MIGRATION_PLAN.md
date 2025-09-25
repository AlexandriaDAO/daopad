# Orbit Permissions Migration Plan for DAOPad (UPDATED)

## ✅ COMPLETED WORK

### Phase 1: Permission Infrastructure - COMPLETE
- ✅ Backend query endpoints implemented:
  - `list_permissions` - Lists all permissions with filtering
  - `get_permission` - Gets details for specific permission
  - `list_user_groups` - Lists all user groups
  - `get_user_group` - Gets group details with members
  - `get_user_permissions` - Returns user's effective permissions
  - `check_user_permission` - Verifies if user has specific permission
- ✅ Frontend components created:
  - `PermissionsTable.jsx` - Displays all permissions with access level filtering
  - `UserGroupsList.jsx` - Shows groups with member details in dialogs
  - `PermissionDetails.jsx` - Detailed view of individual permissions
- ✅ Type definitions with PartialEq for Resource comparison
- ✅ Deployed to mainnet and tested

### Phase 2: Kong Locker Integration - COMPLETE
- ✅ Voting power tier calculation implemented:
  - `sync_voting_power_permissions` - Calculates VP tiers from Kong Locker
  - `get_user_voting_tier` - Returns user's tier (Whale/Dolphin/Member/None)
  - `check_voting_permission` - Verifies if user meets VP threshold
  - `create_voting_permission` - Creates VP-based permission rules
- ✅ Voting tiers defined:
  - **Whale**: 10,000+ VP (≥ $100 USD in locked LPs)
  - **Dolphin**: 1,000+ VP (≥ $10 USD)
  - **Member**: 100+ VP (≥ $1 USD)
  - **None**: < 100 VP
- ✅ Integration with Kong Locker registrations working
- ✅ Deployed to mainnet and tested

## 📋 REMAINING WORK

### Phase 3: UI Components for Voting Integration
**Goal**: Display voting power tiers and their relationship to permissions in the frontend

#### 3.1 Create VotingTierDisplay Component
Create `daopad_frontend/src/components/permissions/VotingTierDisplay.jsx`:
- Show user's current tier (Whale/Dolphin/Member/None)
- Display voting power amount
- Show tier benefits/permissions
- Visual indicator (whale emoji 🐋, dolphin 🐬, member badge, etc.)

#### 3.2 Add Voting Info to Security Dashboard
Enhance the existing Security Dashboard:
- Integrate voting tier display
- Show voting-based permission status
- Display sync status with Kong Locker
- Show if manual group assignment is needed

#### 3.3 Create Manual Sync Button
Build admin controls for VP synchronization:
- Button to trigger `sync_voting_power_permissions`
- Show results (whales/dolphins/members counts)
- Display list of manual actions needed
- Show placeholder group IDs that need manual creation

### Phase 4: Permission Request Management
**Goal**: Streamline permission change requests since we can't auto-update groups

#### 4.1 Permission Request Helper
Create simplified UI for permission changes:
- Pre-fill permission requests based on voting tiers
- Guide admin through manual group assignments
- Show which users should be in which groups
- Generate copy-paste commands for Orbit Station UI

#### 4.2 Voting-Based Permission Templates
Create pre-defined permission sets:
- Templates for each tier (Whale/Dolphin/Member)
- One-click request creation for common scenarios
- Batch permission updates for efficiency

### Phase 5: Monitoring & Reporting
**Goal**: Track permission status and voting power changes

#### 5.1 Permission Audit Log Display
Create audit visualization:
- Show recent permission change requests
- Track voting tier transitions
- Highlight users who moved between tiers
- Display manual interventions needed

#### 5.2 Voting Power Analytics
Build analytics dashboard:
- Chart showing VP distribution across users
- Tier membership over time
- Correlation between VP and DAO activity
- Identify users close to tier thresholds

## 🔧 TECHNICAL NOTES

### Current Architecture
- **Backend**: `daopad_backend` acts as sole admin of Orbit Station
- **Voting Calculation**: Works correctly, fetching from `KONG_LOCKER_PRINCIPALS` storage
- **Limitation**: Cannot programmatically create/edit groups in Orbit (API doesn't support it)
- **Workaround**: System calculates what *should* be, admin manually implements

### Key Files
- `/daopad_backend/src/api/voting_permissions.rs` - Voting tier logic (simplified for manual groups)
- `/daopad_backend/src/api/orbit_permissions.rs` - Permission queries (working)
- `/daopad_frontend/src/components/permissions/` - UI components (basic versions complete)
- `/daopad_backend/src/types/orbit.rs` - Type definitions with PartialEq

### Important Context
- Groups (Whale/Dolphin/Member) must be created manually in Orbit Station UI
- Group IDs returned as "manual-{name}" placeholders until created
- The backend calculates tiers but cannot enforce them automatically
- This is acceptable since only the backend canister is admin

## 🎯 IMPLEMENTATION GUIDE FOR NEW AGENT

### Start with Phase 3: UI Components
1. **VotingTierDisplay.jsx**
   ```jsx
   // Use the backend endpoints:
   const tier = await actor.get_user_voting_tier(tokenId, userPrincipal);
   // Display tier with appropriate visuals
   ```

2. **Integrate into Security Dashboard**
   - Add to existing `/components/security/SecurityDashboard.jsx`
   - Show voting power status alongside other security checks

3. **Manual Sync UI**
   ```jsx
   const syncResult = await actor.sync_voting_power_permissions(tokenId);
   // Display: syncResult.whales, dolphins, members counts
   // Show manual steps needed for group creation
   ```

### Phase 4: Simplify Manual Process
Since automation isn't possible, make the manual process smooth:
- Generate clear instructions for admin
- Provide copy-paste group names
- Show which users belong in which groups
- Create helper scripts for common operations

### Phase 5: Monitoring
Focus on visibility since we can't automate:
- Show what the system *wants* vs what's *actually* configured
- Highlight mismatches that need manual correction
- Track when users change tiers

## ⚠️ CRITICAL REMINDERS

1. **DO NOT** attempt to implement automatic group creation/editing - Orbit API doesn't support `AddUserGroup` or `EditUserGroup` operations
2. **DO NOT** modify the Kong Locker integration - it's working correctly
3. **USE** the existing test station: `fec7w-zyaaa-aaaaa-qaffq-cai` for testing
4. **REMEMBER** all changes go through the backend as admin - no direct user permissions
5. **EXPECT** manual group management - the system is advisory only

## 📝 KEY COMMANDS

```bash
# Deploy backend (already complete, but if changes needed)
cd /home/theseus/alexandria/daopad/src/daopad
./deploy.sh --network ic --backend-only

# Deploy frontend (after UI changes)
./deploy.sh --network ic --frontend-only

# Test voting tier
dfx canister --network ic call daopad_backend get_user_voting_tier \
  "(principal \"ysy5f-2qaaa-aaaap-qkmmq-cai\", principal \"user-principal\")"

# Sync voting powers (returns counts)
dfx canister --network ic call daopad_backend sync_voting_power_permissions \
  "(principal \"ysy5f-2qaaa-aaaap-qkmmq-cai\")"
```

## 🏁 SUCCESS CRITERIA

The migration is complete when:
1. ✅ Users can view their voting tier in the UI
2. ✅ Admins can see which users should be in which groups
3. ✅ Manual group assignment process is documented and smooth
4. ✅ Monitoring shows voting power distribution
5. ✅ Permission system works with manually-managed groups

## 📊 Current Status

- **Backend**: 100% complete, deployed to mainnet
- **Frontend**: Basic components complete, voting UI needed
- **Integration**: Calculating correctly, manual enforcement required
- **Next Step**: Build Phase 3 UI components to display voting tiers

The core integration is functional. The remaining work focuses on making the manual permission management process visible and manageable for the admin.