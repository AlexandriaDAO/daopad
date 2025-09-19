# DAO Transition Plan: From Pseudo-DAO to Full DAO

## Executive Summary
This document outlines the process for transitioning an Orbit Station treasury from a multi-admin setup to a true DAO where the DAOPad backend canister is the sole admin, executing decisions based on community voting.

## Current State vs. Target State

### Current State (Pseudo-DAO)
- Multiple human admins in Orbit Station
- DAOPad backend is one of many admins
- Decisions can be made outside of DAO voting
- Not truly decentralized

### Target State (Full DAO)
- DAOPad backend canister is the ONLY admin
- All decisions require community voting through DAOPad
- Fully decentralized governance
- No single human can make unilateral decisions

## Phase 1: Permission Setup

### Step 1.1: Grant DAOPad Canister Required Permissions
Before the DAOPad canister can manage users, it needs explicit permissions in Orbit Station.

**Required Permissions for DAOPad Backend:**
```
1. User(Update(Any))     - Edit any user's status/groups
2. User(Create)          - Add new users (for future members)
3. Permission(Update)    - Modify permissions as needed
4. RequestPolicy(Update) - Adjust approval requirements
5. System(ManageSystemInfo) - Update system settings
```

**Manual Process (One-Time Setup):**
1. Current admin logs into Orbit Station
2. Creates EditPermission request granting above permissions to DAOPad backend
3. Admins approve the request
4. Verify permissions are active

### Step 1.2: Implement Permission Management Functions
```rust
// Backend functions needed:
grant_self_permissions() -> Result<RequestId, Error>
verify_permissions() -> Result<PermissionStatus, Error>
```

## Phase 2: Admin Transition

### Step 2.1: Build User Management Interface
Create UI components that allow the DAOPad backend to:
- List all current admins
- Remove admin privileges from users
- Downgrade admins to regular members or operators
- Track transition progress

### Step 2.2: Execute Admin Removal
**Process:**
1. DAOPad backend creates EditUser requests for each human admin
2. Set their groups to exclude Admin group
3. Keep them as Operators if desired (view-only access)
4. Verify DAOPad backend remains as sole admin

**Safety Check:**
- Always verify DAOPad backend's admin status before removing others
- Implement rollback mechanism in case of errors

## Phase 3: Governance Configuration

### Step 3.1: Define Voting Parameters
```yaml
Treasury Operations:
  - Transfer funds: 50% approval threshold
  - Add new members: 30% approval threshold
  - Remove members: 60% approval threshold
  - Change permissions: 70% approval threshold
  - System upgrades: 80% approval threshold
```

### Step 3.2: Implement Proposal System
- Create proposal types matching Orbit Station operations
- Map voting results to Orbit Station requests
- Auto-execute approved proposals

## Phase 4: Verification & Testing

### Checklist:
- [ ] DAOPad backend is sole admin
- [ ] No human users have admin privileges
- [ ] All treasury operations require DAO votes
- [ ] Emergency recovery plan in place
- [ ] Audit trail enabled

---

## Orbit Station Integration

For detailed Orbit Station integration workflow and best practices, see:
**📚 CLAUDE.md - Section: "CRITICAL: Orbit Station Integration Workflow"**

The workflow ensures type-safe integration with Orbit Station by:
1. Researching exact types from source code
2. Testing with dfx before implementation
3. Creating exact type matches
4. Following proven patterns

---

## Emergency Recovery Plan

### If Something Goes Wrong:

1. **Recovery Canister:**
   - Deploy a recovery admin canister before transition
   - Grant it emergency admin rights
   - Use only if DAOPad backend fails

2. **Backup Admin:**
   - Keep ONE human admin initially
   - Remove only after 30 days of stable operation
   - Document their identity securely

3. **Rollback Procedure:**
   ```bash
   # Emergency restore admin rights
   dfx canister --network ic call recovery_canister restore_admin_rights
   ```

---

## Timeline

### Week 1: Permission Setup
- Grant DAOPad backend necessary permissions
- Test permission verification

### Week 2: Build Transition Tools
- Create admin removal interface
- Test in development environment

### Week 3: Execute Transition
- Remove human admins systematically
- Verify each step

### Week 4: Monitor & Stabilize
- Monitor DAO operations
- Address any issues
- Remove backup admin after stability confirmed

---

## Success Criteria

✅ The DAO is considered "fully transitioned" when:
1. DAOPad backend is the only admin in Orbit Station
2. All treasury operations require DAO votes
3. No single entity can make unilateral decisions
4. Emergency recovery mechanism is tested and ready
5. 30 days of stable operation completed

---

## Appendix: Required Backend Functions

```rust
// Priority 1: Permission Management
grant_self_permissions(permissions: Vec<Permission>) -> Result<RequestId>
check_permission_status() -> Result<PermissionList>

// Priority 2: User Management
list_all_admins() -> Result<Vec<User>>
remove_admin_role(user_id: UUID) -> Result<RequestId>
downgrade_to_operator(user_id: UUID) -> Result<RequestId>

// Priority 3: Verification
verify_sole_admin() -> Result<bool>
get_admin_count() -> Result<u32>

// Priority 4: Proposals
create_treasury_proposal(details: ProposalDetails) -> Result<ProposalId>
execute_approved_proposal(proposal_id: ProposalId) -> Result<RequestId>
```

---

*Document Version: 1.0*
*Last Updated: December 2024*
*Next Review: After first DAO transition*