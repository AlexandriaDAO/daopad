# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-fix-icp-auth-signatures/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-fix-icp-auth-signatures/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes only:
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "Fix: ICP authentication signature verification errors"
   git push -u origin feature/fix-icp-auth-signatures
   gh pr create --title "Fix: ICP Authentication Signature Verification" --body "Implements FIX_ICP_AUTH_SIGNATURES.md"
   ```
5. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view [NUM] --json comments`
     - Count P0 issues
     - IF P0 > 0: Fix immediately, commit, push, sleep 300s, continue
     - IF P0 = 0: Report success, EXIT
   - After 5 iterations: Escalate to human

## CRITICAL RULES
- ❌ NO questions ("should I?", "want me to?", "is it done?")
- ❌ NO skipping PR creation - it's MANDATORY
- ❌ NO stopping after implementation - create PR immediately
- ✅ After sleep: IMMEDIATELY continue (no pause)
- ✅ ONLY stop at: approved, max iterations, or error

**Branch:** `feature/fix-icp-auth-signatures`
**Worktree:** `/home/theseus/alexandria/daopad-fix-icp-auth-signatures/src/daopad`

---

# Implementation Plan: Fix ICP Authentication Signature Verification

## 🚨 The Problem: Invalid Signature Errors on All Authenticated Calls

### User Impact
When users authenticate and try to interact with DAOPad:
- ✅ Login succeeds
- ✅ User sees their principal
- ❌ **ALL backend calls fail** with: `HTTP 400: Invalid signature: EcdsaP256 signature could not be verified`
- ❌ Voting power shows 0
- ❌ Cannot create proposals
- ❌ Cannot view treasury data

### Error Example (from production logs)
```
[KongLockerService] Failed to get voting power: AgentCallError: Error while making call: Server returned an error:
  Code: 400 ()
  Body: Invalid signature: Invalid basic signature: EcdsaP256 signature could not be verified:
  public key 04f4982af4683383c2c35681268169fc73b7fb35933ad4f43f08f992e35d5eed6b...,
  signature ce91cc64cfc9403ec30551f1438c57c8fcfc6b7bd67d6765c05e6be7843ab822...,
  error: verification failed
```

---

## 🔍 Root Cause Analysis

### Current Configuration (BROKEN)

**File:** `daopad_frontend/src/providers/AuthProvider/IIProvider.tsx:85`
```typescript
derivationOrigin: "https://yj5ba-aiaaa-aaaap-qkmoa-cai.icp0.io"  // ❌ OLD/WRONG canister!
```

**Actual Frontend Canister** (from `canister_ids.json:9`):
```json
"daopad_frontend": {
  "ic": "l7rlj-6aaaa-aaaap-qp2ra-cai"  // ✅ CURRENT canister serving daopad.org
}
```

### The Mismatch

1. **User visits**: `https://daopad.org/`
2. **daopad.org is served by**: `l7rlj-6aaaa-aaaap-qp2ra-cai` (actual current frontend)
3. **IIProvider.tsx uses**: `yj5ba-aiaaa-aaaap-qkmoa-cai` (old/incorrect canister)
4. **Internet Identity issues delegation for**: `yj5ba-aiaaa-aaaap-qkmoa-cai`
5. **User makes authenticated call from**: `daopad.org` (served by `l7rlj-6aaaa-aaaap-qp2ra-cai`)
6. **IC Gateway validates signature**:
   - Sees delegation for canister `yj5ba-aiaaa-aaaap-qkmoa-cai`
   - Sees call from canister `l7rlj-6aaaa-aaaap-qp2ra-cai`
   - **MISMATCH** → Rejects signature as invalid

### Why This Persists

The `yj5ba-aiaaa-aaaap-qkmoa-cai` canister DOES serve an alternative origins file:
```bash
$ curl https://yj5ba-aiaaa-aaaap-qkmoa-cai.icp0.io/.well-known/ii-alternative-origins
{
  "alternativeOrigins": ["https://daopad.org", "https://konglocker.com", ...]
}
```

**BUT** the problem is:
- The delegation is for the WRONG canister
- Even though alternative origins are configured on the old canister
- The actual canister (`l7rlj-6aaaa-aaaap-qp2ra-cai`) doesn't have the alternative origins file

---

## ✅ The Solution: Three-Part Fix

### Part 1: Create Alternative Origins File
**File:** `daopad_frontend/public/.well-known/ii-alternative-origins` (NEW)
```json
{
  "alternativeOrigins": [
    "https://daopad.org",
    "https://www.daopad.org",
    "https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io",
    "http://localhost:8080",
    "http://localhost:3000"
  ]
}
```

**Why these origins?**
- `https://daopad.org` - Production custom domain
- `https://www.daopad.org` - WWW variant
- `https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io` - Canonical canister URL
- Localhost variants - Development testing

### Part 2: Configure Asset Serving
**File:** `daopad_frontend/public/.ic-assets.json`

**Current state (lines 1-34):**
```json
[
  {
    "match": ".well-known",
    "ignore": false
  },
  {
    "match": ".well-known/ic-domains",
    "headers": {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "text/plain"
    },
    "ignore": false
  },
  // ... other rules
]
```

**Add after line 13:**
```json
  {
    "match": ".well-known/ii-alternative-origins",
    "headers": {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json"
    },
    "ignore": false
  },
```

### Part 3: Update Derivation Origin
**File:** `daopad_frontend/src/providers/AuthProvider/IIProvider.tsx:85`

**Change FROM:**
```typescript
derivationOrigin: "https://yj5ba-aiaaa-aaaap-qkmoa-cai.icp0.io",  // ❌ OLD
```

**Change TO:**
```typescript
derivationOrigin: "https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io",  // ✅ CURRENT
```

---

## 📋 Implementation Steps (PSEUDOCODE)

### Step 1: Create Alternative Origins File
```bash
# Create the alternative origins file
cat > daopad_frontend/public/.well-known/ii-alternative-origins << 'EOF'
{
  "alternativeOrigins": [
    "https://daopad.org",
    "https://www.daopad.org",
    "https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io",
    "http://localhost:8080",
    "http://localhost:3000"
  ]
}
EOF

# Verify it exists
ls -la daopad_frontend/public/.well-known/
cat daopad_frontend/public/.well-known/ii-alternative-origins
```

### Step 2: Update .ic-assets.json
```typescript
// PSEUDOCODE: Edit daopad_frontend/public/.ic-assets.json
// Insert new rule after the ic-domains rule (after line 13)

old_content = [
  { "match": ".well-known", "ignore": false },
  { "match": ".well-known/ic-domains", "headers": {...}, "ignore": false },
  { "match": "**/*.js", ...}
]

new_rule = {
  "match": ".well-known/ii-alternative-origins",
  "headers": {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  },
  "ignore": false
}

// Insert new_rule after ic-domains rule
updated_content = [
  ...rules_before_js,
  new_rule,
  ...remaining_rules
]
```

### Step 3: Update IIProvider.tsx
```typescript
// PSEUDOCODE: Edit daopad_frontend/src/providers/AuthProvider/IIProvider.tsx:85

// Find the login method (around line 71-91)
const login = async (): Promise<void> => {
  // ... existing code ...

  await authClient.login({
    identityProvider: internetIdentityUrl,
    onSuccess: () => { /* ... */ },
    onError: (error?: string) => { /* ... */ },

    // CHANGE THIS LINE:
    derivationOrigin: "https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io",  // ✅ UPDATED

    maxTimeToLive: BigInt(7) * BigInt(24) * BigInt(3_600_000_000_000),
  });
};
```

---

## 🧪 Testing Strategy

### Test 1: Verify Alternative Origins File is Served
```bash
# After deployment, test that the file is accessible
curl -v "https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/.well-known/ii-alternative-origins"

# Expected response:
# HTTP/2 200
# Content-Type: application/json
# Access-Control-Allow-Origin: *
# {
#   "alternativeOrigins": ["https://daopad.org", ...]
# }

# If it returns HTML or 404, the deployment failed
```

### Test 2: Authentication Flow (Manual Browser Testing)
```bash
# 1. Clear all browser storage
#    - Open DevTools (F12)
#    - Application tab → Clear site data

# 2. Visit production URL
#    https://daopad.org/

# 3. Click "Connect" to authenticate
#    - Should redirect to Internet Identity
#    - Authenticate with your II

# 4. After login, check console (F12)
#    - Look for "[useVoting] VP fetch result:"
#    - Should show: { success: true, data: <your_vp> }
#    - Should NOT show "Invalid signature" errors

# 5. Navigate to a DAO page
#    https://daopad.org/fec7w-zyaaa-aaaaa-qaffq-cai

# 6. Verify:
#    - Page loads (no infinite loading)
#    - Voting power displays correctly
#    - No HTTP 400 errors in Network tab
```

### Test 3: Backend Service Calls
```bash
# Open browser console on authenticated session
# Manually trigger a Kong Locker VP fetch

# In console, run:
const identity = window.__IDENTITY__;  // If exposed by app
const service = new KongLockerService(identity);
const vp = await service.getVotingPower("cngnf-vqaaa-aaaar-qag4q-cai");
console.log("VP Result:", vp);

# Expected: { success: true, data: <number> }
# NOT: { success: false, error: "Invalid signature..." }
```

### Test 4: Cross-Domain Principal Consistency
```bash
# Test that principals are the same across domains

# 1. Login at https://daopad.org/
#    - Note your principal: e2mqm-f5kv2-wacvn-...

# 2. Login at https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/
#    - Should see the SAME principal

# If principals differ, derivation origin is still wrong
```

---

## 🎯 Success Criteria

### Critical (P0) - Must Pass
1. ✅ Alternative origins file served with correct headers
2. ✅ No "Invalid signature" errors in production logs
3. ✅ Voting power displays correctly for authenticated users
4. ✅ All authenticated canister calls succeed (no HTTP 400 errors)
5. ✅ Users can vote on proposals

### Important (P1) - Should Pass
1. ✅ Principal consistency across daopad.org and canister URL
2. ✅ No console errors during authentication flow
3. ✅ Page loads immediately (no infinite loading loops)

### Nice-to-Have (P2)
1. ✅ Localhost development still works
2. ✅ WWW variant works (www.daopad.org)

---

## 📂 File Summary

### Files to CREATE:
1. `daopad_frontend/public/.well-known/ii-alternative-origins` (NEW JSON file)

### Files to MODIFY:
1. `daopad_frontend/public/.ic-assets.json` (Add new rule for ii-alternative-origins)
2. `daopad_frontend/src/providers/AuthProvider/IIProvider.tsx` (Update derivation origin)

### Total Changes:
- **1 new file**
- **2 modified files**
- **~3 lines of JSON**
- **1 line TypeScript change**

---

## 🚨 Common Pitfalls & How to Avoid Them

### Pitfall 1: Alternative Origins File Not Served
**Symptom:** `curl` returns HTML instead of JSON

**Fix:** Ensure `.ic-assets.json` has the rule with correct Content-Type header

### Pitfall 2: Typo in Canister ID
**Symptom:** Still getting "Invalid signature" errors

**Fix:** Double-check canister ID in IIProvider.tsx matches `canister_ids.json`

### Pitfall 3: Cached Delegations
**Symptom:** Still broken after deploy

**Fix:** Clear browser localStorage and re-authenticate to get fresh delegation

### Pitfall 4: Forgot to Deploy
**Symptom:** Changes don't take effect

**Fix:** Remember to run `./deploy.sh --network ic --frontend-only` after building

---

## 📖 Reference Documentation

- [Internet Identity Specification - Derivation Origins](https://internetcomputer.org/docs/references/ii-spec)
- [ICP Custom Domains](https://internetcomputer.org/docs/building-apps/frontends/custom-domains/using-custom-domains)
- [agent-js HttpAgent Configuration](https://github.com/dfinity/agent-js/blob/main/packages/agent/src/agent/http/index.ts)

---

## 🎓 Why This Works

1. **Alternative Origins File**: Tells Internet Identity that `daopad.org` is an authorized alias for `l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io`
2. **Derivation Origin**: Ensures all delegations are issued for the correct canister principal
3. **IC Gateway Validation**: When a call comes in, the gateway verifies:
   - Delegation is for `l7rlj-6aaaa-aaaap-qp2ra-cai`
   - Call is from `daopad.org` (aliased to `l7rlj-6aaaa-aaaap-qp2ra-cai` via alternative origins)
   - **MATCH** → Signature is valid ✅

---

## 🔧 Troubleshooting Commands

```bash
# Verify canister ID serving daopad.org
curl -sI https://daopad.org/ | grep x-ic-canister-id

# Check alternative origins file
curl -s https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/.well-known/ii-alternative-origins | jq

# Check derivation origin in code
grep -n "derivationOrigin" daopad_frontend/src/providers/AuthProvider/IIProvider.tsx

# Verify canister_ids.json
cat ../../canister_ids.json | jq '.daopad_frontend'

# Test authenticated call (requires setup)
dfx canister --network ic --identity <your-identity> call lwsav-iiaaa-aaaap-qp2qq-cai get_my_voting_power_for_token '(principal "cngnf-vqaaa-aaaar-qag4q-cai")'
```

---

## ✅ Verification Checklist

Before marking this task complete, verify:

- [ ] Alternative origins file exists at `daopad_frontend/public/.well-known/ii-alternative-origins`
- [ ] Alternative origins file contains correct JSON with daopad.org
- [ ] `.ic-assets.json` has rule for `ii-alternative-origins` with JSON content-type
- [ ] `IIProvider.tsx` has correct derivation origin (`l7rlj-6aaaa-aaaap-qp2ra-cai`)
- [ ] Frontend built successfully
- [ ] Frontend deployed to IC mainnet
- [ ] Alternative origins file accessible via curl
- [ ] Can authenticate on daopad.org
- [ ] Voting power displays correctly
- [ ] No "Invalid signature" errors in console
- [ ] PR created and linked to this plan

---

**END OF PLAN**

**Worktree Location:** `/home/theseus/alexandria/daopad-fix-icp-auth-signatures/src/daopad`
**Implementing Agent:** Read the orchestrator header at the top - it's mandatory!
