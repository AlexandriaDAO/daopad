# Orbit Station Migration Status Guide

## Overview

This guide helps you determine if your Orbit Station is ready for DAOPad treasury operations. The migration involves configuring account transfer policies from Quorum-based approvals to AutoApproved execution.

## The Three Migration Stages

### Stage 1: Fresh Orbit Station (NOT Ready)

**Status**: Policies require specific user/quorum approvals
**Action Required**: Complete AutoApproved setup
**Risk**: Treasury operations will be stuck in "Pending" state

**How to Identify**:
```bash
dfx canister --network ic call ORBIT_STATION_ID list_accounts '(record {})'
```

Look for account policies showing:
```
transfer_request_policy = variant {
  Quorum = record {
    approvers = ...;
    min_approved = ...;
  }
}
```
OR
```
transfer_request_policy = variant {
  QuorumPercentage = record {
    min_approved = ...;
  }
}
```

**What This Means**: Accounts need manual approval from specific users/groups. Since DAOPad backend is the only admin, it cannot approve its own requests (Orbit enforces separation of duties).

---

### Stage 2: Migration In Progress (NOT Ready)

**Status**: AutoApproved policy change requests created but pending approval
**Action Required**: Approve the policy change requests in Orbit UI
**Risk**: Policies won't take effect until approved

**How to Identify**:
```bash
dfx canister --network ic call ORBIT_STATION_ID list_requests '(record {
  statuses = opt vec { variant { Created }; variant { Pending } };
})'
```

Look for requests with:
```
operation = variant {
  EditAccount = record {
    ...
    transfer_request_policy = opt variant { AutoApproved };
    ...
  }
}
```

**What This Means**: Someone (or automated script) has created requests to change account policies to AutoApproved, but they haven't been approved yet. You need to approve these in the Orbit UI.

**Resolution Steps**:
1. Open Orbit Station UI (https://orbit.dfinity.network or your custom UI)
2. Navigate to Requests → Pending
3. Find all EditAccount requests for policy changes
4. Approve each one (you may need admin privileges)
5. Wait for execution
6. Verify completion by re-running Stage 3 checks

---

### Stage 3: Production Ready (READY)

**Status**: All accounts show AutoApproved policies
**Action Required**: None - DAOPad is ready for treasury operations
**Risk**: None

**How to Identify**:
```bash
dfx canister --network ic call ORBIT_STATION_ID list_accounts '(record {})'
```

ALL accounts should show:
```
transfer_request_policy = variant { AutoApproved }
```

**What This Means**: DAOPad backend can create and execute treasury operations without getting stuck. The separation of duties enforcement happens at the DAOPad governance layer (Kong Locker voting), not at the Orbit layer.

**Verification Checklist**:
- [ ] All accounts show `AutoApproved` policy
- [ ] No pending policy change requests in Orbit
- [ ] Backend canister is registered as admin in Orbit groups
- [ ] Test transfer can be created and executes immediately

---

## Quick Status Check Script

Save this as `check_orbit_migration.sh`:

```bash
#!/bin/bash

ORBIT_STATION_ID="${1:-fec7w-zyaaa-aaaaa-qaffq-cai}"  # Default to test station

echo "Checking Orbit Station: $ORBIT_STATION_ID"
echo "========================================="

# Check account policies
echo ""
echo "1. Checking account policies..."
ACCOUNTS=$(dfx canister --network ic call $ORBIT_STATION_ID list_accounts '(record {})' 2>&1)

if echo "$ACCOUNTS" | grep -q "AutoApproved"; then
    AUTOAPPROVED_COUNT=$(echo "$ACCOUNTS" | grep -o "AutoApproved" | wc -l)
    echo "   ✅ Found $AUTOAPPROVED_COUNT AutoApproved accounts"
else
    echo "   ❌ No AutoApproved accounts found"
fi

if echo "$ACCOUNTS" | grep -q "Quorum"; then
    QUORUM_COUNT=$(echo "$ACCOUNTS" | grep -o "Quorum" | wc -l)
    echo "   ⚠️  Found $QUORUM_COUNT Quorum-based accounts (needs migration)"
fi

# Check pending policy change requests
echo ""
echo "2. Checking pending policy change requests..."
PENDING=$(dfx canister --network ic call $ORBIT_STATION_ID list_requests '(record {
  statuses = opt vec { variant { Created }; variant { Pending } };
})' 2>&1)

if echo "$PENDING" | grep -q "transfer_request_policy"; then
    echo "   ⚠️  Found pending policy change requests (approve in Orbit UI)"
else
    echo "   ✅ No pending policy change requests"
fi

# Determine stage
echo ""
echo "========================================="
if echo "$ACCOUNTS" | grep -q "Quorum" && ! echo "$PENDING" | grep -q "transfer_request_policy"; then
    echo "STAGE 1: Fresh Orbit - Needs AutoApproved setup"
elif echo "$PENDING" | grep -q "transfer_request_policy"; then
    echo "STAGE 2: Migration In Progress - Approve requests in Orbit UI"
elif echo "$ACCOUNTS" | grep -q "AutoApproved"; then
    echo "STAGE 3: Production Ready ✅"
else
    echo "UNKNOWN: Unable to determine migration stage"
fi
```

Usage:
```bash
chmod +x check_orbit_migration.sh
./check_orbit_migration.sh YOUR_ORBIT_STATION_ID
```

---

## Common Issues & Troubleshooting

### Issue: "Backend not authorized to create requests"

**Symptom**: Backend returns permission errors when trying to create Orbit requests

**Diagnosis**:
```bash
# Check if backend is in admin group
dfx canister --network ic call ORBIT_STATION_ID list_users '(record {})'

# Look for backend principal in admin group members
```

**Solution**: Add backend principal to admin group in Orbit UI:
1. Settings → Users → Add User
2. Enter backend principal: `lwsav-iiaaa-aaaap-qp2qq-cai`
3. Assign to "Admin" group (`00000000-0000-4000-8000-000000000000`)

---

### Issue: "Request created but stuck in Pending forever"

**Symptom**: Requests appear in Orbit but never execute

**Diagnosis**: You're in Stage 1 or Stage 2 (policies not yet AutoApproved)

**Solution**:
- If Stage 1: Create AutoApproved policy change requests (see setup guide)
- If Stage 2: Approve pending policy change requests in Orbit UI
- Verify with Stage 3 checks

---

### Issue: "Multiple accounts with different policies"

**Symptom**: Some accounts are AutoApproved, others are Quorum

**Diagnosis**: Incomplete migration - some account policies were changed but not all

**Solution**:
1. List all accounts:
   ```bash
   dfx canister --network ic call ORBIT_STATION_ID list_accounts '(record {})'
   ```
2. For each non-AutoApproved account, create policy change request:
   ```bash
   # Via Orbit UI: Settings → Accounts → [Account] → Edit Policy → AutoApproved
   ```
3. Approve all pending requests
4. Re-verify with Stage 3 checks

---

### Issue: "AutoApproved but requests still pending"

**Symptom**: Policies show AutoApproved but new requests don't auto-execute

**Diagnosis**: Likely a different issue (wrong account, wrong operation type, Orbit bug)

**Solution**:
1. Check which account the request is for:
   ```bash
   dfx canister --network ic call ORBIT_STATION_ID get_request '("REQUEST_ID")'
   ```
2. Verify that specific account has AutoApproved policy
3. Check request operation type (some operations may not support AutoApproved)
4. Check Orbit logs for errors
5. If persists, may need to manually approve as workaround

---

## Migration Checklist

Use this checklist to track your migration progress:

### Pre-Migration
- [ ] Orbit Station deployed and accessible
- [ ] DAOPad backend principal known
- [ ] Backend added as admin in Orbit Station
- [ ] All critical accounts identified (ICP, ckBTC, tokens, etc.)
- [ ] Backup of current Orbit configuration

### Stage 1 → Stage 2
- [ ] Create AutoApproved policy change request for each account
- [ ] Verify requests appear in Orbit pending list
- [ ] Document request IDs for tracking

### Stage 2 → Stage 3
- [ ] Approve all policy change requests in Orbit UI
- [ ] Wait for execution confirmation
- [ ] Verify all accounts show AutoApproved
- [ ] No pending policy change requests remain

### Post-Migration Verification
- [ ] Run quick status check script (shows Stage 3)
- [ ] Test: Create test transfer request via DAOPad
- [ ] Verify: Request auto-executes immediately
- [ ] Monitor: Check Orbit logs for errors
- [ ] Document: Record migration completion date

---

## Next Steps After Stage 3

Once you've reached Stage 3 (Production Ready):

1. **Test thoroughly**: Create small test transfers to verify auto-execution
2. **Monitor first operations**: Watch Orbit logs for any unexpected behavior
3. **Update documentation**: Record your specific Orbit Station ID and setup
4. **Train team**: Ensure developers understand AutoApproved architecture
5. **Plan governance**: Set up DAOPad voting thresholds and periods

See:
- `SECURITY_AUTOAPPROVED.md` - Security rationale and attack vectors
- `DEPLOYMENT_CHECKLIST.md` - Full deployment verification steps
- `AGENT_INSTRUCTIONS_ORBIT.md` - Developer guidelines for Orbit integration
