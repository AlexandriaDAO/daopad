# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-autoapproved-docs/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-autoapproved-docs/src/daopad`
2. **Implement documentation** - Follow plan sections below
3. **Commit changes**:
   ```bash
   git add .
   git commit -m "[Docs]: Comprehensive Orbit Station AutoApproved requirement documentation"
   git push -u origin feature/document-orbit-autoapproved
   ```
4. **Create PR** (MANDATORY):
   ```bash
   gh pr create --title "[Docs]: Orbit Station AutoApproved Setup Requirements" --body "Implements comprehensive documentation for Orbit Station's AutoApproved policy requirement.

## Summary
- Explains why AutoApproved policies are required for DAOPad architecture
- Provides migration status checking guide
- Documents security rationale
- Adds agent instructions for future development
- Creates deployment checklist

Closes issue: Missing critical Orbit setup documentation that would have prevented deployment confusion."
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

**Branch:** `feature/document-orbit-autoapproved`
**Worktree:** `/home/theseus/alexandria/daopad-autoapproved-docs/src/daopad`

---

# Implementation Plan: Orbit Station AutoApproved Documentation

## Task Classification
**DOCUMENTATION**: Adding comprehensive documentation to explain critical Orbit Station setup requirements

## Current State

### Existing Files
- **CLAUDE.md** (line 1-50): Has deployment info, repository structure, design principles
  - Missing: Critical upfront explanation of AutoApproved requirement
  - Needs: New section before "Design Principles" explaining the fundamental limitation

- **docs/ directory**: Does NOT exist - must be created

- **Backend code**: References AutoApproved in `orbit_security.rs:1-1956`
  - Line 605-673: Detects AutoApproved as "warning for dev"
  - Missing: Function to create AutoApproved requests
  - Missing: Documentation explaining WHY it's required

### The Documentation Gap
The current codebase has:
✅ Security checks that detect AutoApproved policies
❌ NO explanation of why AutoApproved is required
❌ NO setup instructions for new deployments
❌ NO migration guide for checking readiness
❌ NO security justification document
❌ NO agent instructions for future development

This gap causes:
- Developers implementing features that get stuck in "Pending"
- Confusion about why backend can't approve its own requests
- No clear path from fresh Orbit Station → DAOPad-ready

## Implementation Plan

### File 1: Update CLAUDE.md

**Location**: `/home/theseus/alexandria/daopad/src/daopad/CLAUDE.md`
**Action**: INSERT new section after line 46 (before "## 🏗️ Design Principles")

```markdown
## ⚠️ CRITICAL: Orbit Station Setup Requirements

### The AutoApproved Policy Requirement

**Fundamental Limitation**: Orbit Station enforces separation of duties - a user/canister CANNOT approve requests it creates itself.

**DAOPad Architecture**: Backend canister (`lwsav-iiaaa-aaaap-qp2qq-cai`) is the ONLY admin. All Orbit operations are created BY the backend (acting as proxy for users who vote in DAOPad).

**The Problem**:
```
User votes in DAOPad → Backend creates Orbit request (as itself)
                     → Backend tries to approve (BLOCKED - separation of duties)
                     → Request stuck in "Pending" forever
                     → No other users exist in Orbit to approve
```

**The Solution**: Configure ALL Orbit account policies to `AutoApproved` during initial setup. This tells Orbit to trust the backend and auto-execute requests upon creation.

**Security**: NOT a concern because:
- Real governance happens in DAOPad (Kong Locker voting, 50%+ threshold, 7-day periods)
- Orbit approval would be redundant (same entity creates & approves)
- Backend is already trusted by design (it's the DAO's canister)
- AutoApproved is a first-class Orbit feature for this exact use case
- Community votes BEFORE backend submits to Orbit

**Analogy**: Think of Orbit like a gun safe:
- Traditional Orbit: Multiple people must enter codes to open (Quorum)
- DAOPad: Community votes on whether to open it (50%+ threshold), THEN backend opens it (AutoApproved)

The security is in the voting process, not in having multiple people turn the key.

### Required One-Time Setup

Before DAOPad can execute treasury operations, Orbit Station accounts MUST be configured:

**Manual Method** (via Orbit UI):
1. Open Orbit Station UI → Settings → Accounts
2. For each account, edit transfer policy → Select "AutoApproved"
3. Approve the policy change request
4. Verify all accounts show AutoApproved

**Automated Method** (future - function not yet implemented):
```bash
# This function doesn't exist yet but should be created
dfx canister --network ic call daopad_backend create_autoapprove_all_accounts \
  '(principal "TOKEN_CANISTER_ID")'
```

**Verification**:
```bash
# Check account policies
dfx canister --network ic call ORBIT_STATION_ID list_accounts '(record {})'

# Look for: transfer_request_policy = variant { AutoApproved }
# ✅ DAOPad-Ready:  variant { AutoApproved }
# ❌ NOT Ready:     variant { Quorum {...} } or variant { QuorumPercentage {...} }
```

### Migration Status Indicator

Check if Orbit is DAOPad-ready:
- **Stage 1** (Fresh Orbit): Policies require specific user approvals → Action: Complete AutoApproved setup
- **Stage 2** (In Progress): AutoApproved requests created but pending approval → Action: Approve in Orbit UI
- **Stage 3** (Ready): All accounts show AutoApproved policies → Status: Production ready

For detailed migration guide, see `docs/ORBIT_MIGRATION_STATUS.md`
```

### File 2: Create docs/ORBIT_MIGRATION_STATUS.md

**Location**: `/home/theseus/alexandria/daopad/src/daopad/docs/ORBIT_MIGRATION_STATUS.md`
**Action**: CREATE new file

**Content**: See full markdown content in plan (migration stages, verification commands, common issues, troubleshooting steps)

### File 3: Create docs/SECURITY_AUTOAPPROVED.md

**Location**: `/home/theseus/alexandria/daopad/src/daopad/docs/SECURITY_AUTOAPPROVED.md`
**Action**: CREATE new file

**Content**: See full markdown content in plan (security architecture explanation, attack vector analysis, comparison to other DAOs, FAQ)

### File 4: Create docs/AGENT_INSTRUCTIONS_ORBIT.md

**Location**: `/home/theseus/alexandria/daopad/src/daopad/docs/AGENT_INSTRUCTIONS_ORBIT.md`
**Action**: CREATE new file

**Content**: See full markdown content in plan (critical knowledge for AI agents, implementation patterns, red flags, testing checklist, common mistakes)

### File 5: Create docs/DEPLOYMENT_CHECKLIST.md

**Location**: `/home/theseus/alexandria/daopad/src/daopad/docs/DEPLOYMENT_CHECKLIST.md`
**Action**: CREATE new file

**Content**: See full markdown content in plan (pre-deployment verification, deployment steps, post-deployment testing, monitoring, rollback procedures)

## Testing Plan

Since this is documentation only, testing consists of:

1. **Verification Reading**: Read through each doc to ensure clarity and accuracy
2. **Link Checking**: Verify cross-references between docs work
3. **Command Validation**: Spot-check that bash commands are syntactically correct
4. **Completeness**: Ensure all sections from user's outline are covered

No deployment needed as these are markdown documentation files.

## Success Criteria

- [ ] CLAUDE.md updated with AutoApproved section before Design Principles
- [ ] docs/ directory created
- [ ] ORBIT_MIGRATION_STATUS.md created with 3-stage migration guide
- [ ] SECURITY_AUTOAPPROVED.md created with security justification
- [ ] AGENT_INSTRUCTIONS_ORBIT.md created with AI agent guidance
- [ ] DEPLOYMENT_CHECKLIST.md created with pre/post deployment steps
- [ ] All files use consistent terminology and cross-reference each other
- [ ] Plan committed to feature branch
- [ ] PR created with descriptive title and body

## Notes

- This is pure documentation work - no code changes
- All content should be in markdown format
- Use clear headers and code blocks for readability
- Cross-reference between documents for navigation
- Focus on clarity for both humans and AI agents
