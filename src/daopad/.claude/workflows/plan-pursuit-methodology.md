# Plan-Pursuit Methodology

**Purpose:** Transform any feature request into an exhaustive implementation plan that a fresh agent can execute autonomously.

**When to use:** When user says "plan this feature" or "use plan-pursuit-methodology" mid-conversation.

**Output:** Exhaustive plan document + one-line prompt for implementing agent

---

## 🔀 Two Paths to Success

### Path A: Plan Mode (RECOMMENDED - System Enforced)

**User starts with:**
```
/plan
```

**Then user requests:**
```
Plan [feature] using @.claude/workflows/plan-pursuit-methodology.md
```

**Benefits:**
- ✅ **System enforced** - Agent physically CANNOT implement
- ✅ **Guaranteed separation** - No accidental execution
- ✅ **Reliable** - Works 100% of the time

**After planning:**
- User exits plan mode WITHOUT approving execution
- User starts fresh conversation with implementing agent

### Path B: Strong Instructions (FALLBACK - Agent Discipline)

**User requests directly (no /plan):**
```
Plan [feature] using @.claude/workflows/plan-pursuit-methodology.md
```

**Benefits:**
- ✅ Works in any conversation
- ✅ No mode switching needed

**Risks:**
- ⚠️ Relies on agent following instructions
- ⚠️ Agent might implement after user approves plan
- ⚠️ Not system-enforced

**Mitigation:** Very strong DO NOT IMPLEMENT instructions (see below)

---

## 🎯 Your Mission

You are a **planning agent**. Your job is to:

1. **Understand** the feature request completely
2. **Research** the existing codebase exhaustively
3. **Plan** every implementation detail
4. **Document** in a format that implementing agents can follow
5. **Return** a simple one-line prompt
6. **🚨 STOP - DO NOT IMPLEMENT 🚨**

**You do NOT implement**. You think, research, and plan.

---

## 📋 Planning Workflow

### Step 0: Create Worktree for Feature (FIRST STEP!)

**Before any planning, create an isolated worktree for this feature:**

```bash
# From main repo
cd /home/theseus/alexandria/daopad
git worktree add ../daopad-[FEATURE-NAME] -b feature/[feature-name] master
cd ../daopad-[FEATURE-NAME]/src/daopad

# Verify isolation
pwd  # Should show ../daopad-[FEATURE-NAME]/src/daopad
git branch --show-current  # Should show feature/[feature-name]
```

**Why create worktree BEFORE planning:**
- ✅ Plan lives on feature branch (not polluting master)
- ✅ Plan and implementation stay together
- ✅ No sync issues between main repo and worktree
- ✅ Multiple agents can plan in parallel without conflicts
- ✅ Self-contained feature branches (plan + code)
- ✅ Abandoned features don't leave orphaned plans in master

**After creating worktree, do ALL research and planning from within the worktree.**

### Step 1: Research the Codebase (30-60 minutes)

**Read everything relevant BEFORE planning:**

```bash
# Find all related files (check both backend and frontend)
rg "keyword" daopad_backend/ --files-with-matches
rg "keyword" daopad_frontend/ --files-with-matches

# Read existing implementations
# Use Read tool extensively - understand patterns

# Check Rust types and interfaces (backend)
rg "struct FeatureName\|type FeatureName" daopad_backend/

# Check React components and services (frontend)
rg "function\|const.*=.*\{" daopad_frontend/src/

# Understand the architecture
ls -R daopad_backend/src/ | head -50
ls -R daopad_frontend/src/ | head -50

# Check dependencies
rg "use.*feature" daopad_backend/
rg "import.*from" daopad_frontend/
```

**Critical:** Read code, don't guess. Understanding the current state is 80% of planning.

### Step 2: Document Current State

In your plan, include:

```markdown
## Current State

### File Tree (Relevant Sections)
\`\`\`
daopad_backend/
├── src/
│   ├── api/
│   │   ├── orbit.rs (will modify)
│   │   └── dao_transition.rs (unchanged)
│   └── types/
│       └── orbit.rs (unchanged)
daopad_frontend/
├── src/
│   ├── components/
│   │   └── TokenDashboard.jsx (will modify)
│   └── services/
│       └── daopadBackend.js (will modify)
\`\`\`

### Existing Implementations
- Backend: `get_orbit_data()` in `api/orbit.rs:45-67`
  - Currently does X
  - Returns type Y
  - Called by frontend service
- Frontend: `TokenDashboard` component in `components/TokenDashboard.jsx:100-200`
  - Displays treasury data
  - Uses daopadBackend service

### Dependencies
- Backend uses `ic_cdk` for canister calls
- Frontend uses React hooks and shadcn/ui components
- Orbit Station integration via candid interface

### Constraints
- Must maintain backward compatibility with frontend
- Cannot change public API signatures
- Must handle upgrade safety (minimal stable storage)
- Always deploy to mainnet (no local testing)
```

### Step 3: Plan Implementation Details

**Use PSEUDOCODE for both backend and frontend:**

```markdown
## Implementation Plan

### Backend File 1: `daopad_backend/src/api/new_feature.rs` (NEW FILE)

\`\`\`rust
// PSEUDOCODE - implementing agent will write real code

pub struct FeatureState {
    field1: SomeType,  // Discover actual type by testing
    field2: OtherType,
}

#[update]  // Must be update for cross-canister calls
pub async fn execute_feature(param: InputType) -> Result<OutputType> {
    // 1. Validate input
    validate_input(param)?;

    // 2. Query Orbit Station
    // NOTE: Test actual return type with:
    // dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai <method> '(args)'
    let data = ic_cdk::call(station_id, "method", (args)).await?;

    // 3. Process data
    let result = process_data(data);

    // 4. Return
    Ok(result)
}
\`\`\`

### Frontend File 2: `daopad_frontend/src/components/NewFeature.jsx` (NEW FILE)

\`\`\`javascript
// PSEUDOCODE - implementing agent will write real code

import { useEffect, useState } from 'react';
import { daopadBackend } from '../services/daopadBackend';
import { Button } from './ui/button';

export function NewFeature({ tokenId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const executeFeature = async () => {
        setLoading(true);
        try {
            // Call backend method
            const result = await daopadBackend.execute_feature(tokenId);

            // Handle Result wrapper
            if (result && 'Ok' in result) {
                setData(result.Ok);
            } else if (result && 'Err' in result) {
                console.error(result.Err);
            }
        } catch (error) {
            console.error('Failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <Button onClick={executeFeature} disabled={loading}>
                Execute Feature
            </Button>
            {data && <div>{/* Display data */}</div>}
        </div>
    );
}
\`\`\`

### Backend File 3: `daopad_backend/src/lib.rs` (MODIFY)

**Before:**
\`\`\`rust
// Lines 45-67 (current implementation)
mod api;
// existing modules
\`\`\`

**After:**
\`\`\`rust
// Add new module
mod api;
mod new_feature;  // Add this line
// existing modules
\`\`\`
```

### Step 4: Specify Testing Requirements

```markdown
## Testing Strategy

### Type Discovery (Before Implementation)
\`\`\`bash
# Discover Orbit Station API types
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai __get_candid_interface_tmp_hack

# Test actual calls with test station
export TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"
dfx canister --network ic call $TEST_STATION <method> '(test_args)'
# Read error messages - they reveal expected types
\`\`\`

### Build and Deploy Process
\`\`\`bash
# Backend changes require candid extraction
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did

# Deploy backend
./deploy.sh --network ic --backend-only

# CRITICAL: Sync declarations to frontend
cp -r src/declarations/daopad_backend/* src/daopad/daopad_frontend/src/declarations/daopad_backend/

# Deploy frontend
./deploy.sh --network ic --frontend-only
\`\`\`

### Unit Tests Required
- Test `validate_input()` with valid/invalid inputs
- Test `process_data()` edge cases
- Test error handling paths
- Test React component rendering
- Test service integration

### Integration Tests Required
- Deploy to mainnet (no local testing)
- Call feature end-to-end
- Verify expected behavior
\`\`\`bash
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai <method> '(args)'
# Expected output: ...

# Test frontend at https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
\`\`\`
```

### Step 5: Estimate Scope

```markdown
## Scope Estimate

### Files Modified
- **New files:** 3 (new_feature.rs, NewFeature.jsx, tests)
- **Modified files:** 4 (lib.rs, TokenDashboard.jsx, daopadBackend.js, App.jsx)

### Lines of Code
- **Backend:** ~150 lines (Rust implementation)
- **Frontend:** ~100 lines (React component)
- **Tests:** ~150 lines
- **Net:** +400 lines

### Complexity
- **Low:** Pure functions, clear logic
- **Medium:** Async calls, error handling, React state management
- **High:** Cross-canister calls, Orbit Station integration

### Time Estimate
- Implementation: 3-4 hours
- Testing on mainnet: 1-2 hours
- Review iteration: 30-60 minutes
- **Total:** 5-7 hours
```

### Step 6: Embed Mandatory Isolation Check and Orchestrator

**Your plan MUST start with an embedded orchestrator prompt, not just reference it:**

```markdown
## 🚨 MANDATORY: ISOLATION CHECK AND EXECUTION PROMPT

### Context: Worktree Already Created

**This plan was created by the planning agent in an isolated worktree.**

**Location:** `/home/theseus/alexandria/daopad-[FEATURE]/src/daopad`
**Branch:** `feature/[feature-name]`
**Plan file:** `FEATURE_NAME_PLAN.md` (in this worktree)

### Step 0: Verify Isolation (RUN THIS FIRST!)

\`\`\`bash
# STOP! Verify you are in the correct worktree
REPO_ROOT=$(git rev-parse --show-toplevel)
CURRENT_BRANCH=$(git branch --show-current)

# Check you're NOT in main repo
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: You are in the MAIN repository"
    echo "❌ This plan was created in a worktree at:"
    echo "    /home/theseus/alexandria/daopad-[FEATURE]"
    echo ""
    echo "Navigate to the worktree:"
    echo "  cd /home/theseus/alexandria/daopad-[FEATURE]/src/daopad"
    echo "  cat FEATURE_NAME_PLAN.md  # Plan is here"
    exit 1
fi

# Check you're on the right branch
if [ "$CURRENT_BRANCH" != "feature/[feature-name]" ]; then
    echo "❌ WARNING: You are on branch '$CURRENT_BRANCH'"
    echo "Expected: feature/[feature-name]"
    echo "Are you in the right worktree?"
    exit 1
fi

echo "✅ You are in the correct worktree: $REPO_ROOT"
echo "✅ On branch: $CURRENT_BRANCH"
echo "✅ Safe to proceed with implementation"
\`\`\`

### Your Execution Prompt

You are an autonomous PR orchestrator implementing [FEATURE].

**NOTE:** The planning agent already created this worktree and this plan. You will navigate there and execute.

EXECUTE THESE STEPS AUTONOMOUSLY (DO NOT ASK FOR PERMISSION):

Step 0 - NAVIGATE TO WORKTREE (DO THIS FIRST):
  cd /home/theseus/alexandria/daopad-[FEATURE]/src/daopad

Step 1 - VERIFY ISOLATION:
  # Verify you're in the right place
  pwd  # Should show /home/theseus/alexandria/daopad-[FEATURE]/src/daopad
  git branch --show-current  # Should show feature/[feature-name]
  ls FEATURE_NAME_PLAN.md  # This plan should be here

Step 2 - Implement Feature:
  [Summary of implementation steps from plan]

Step 3 - Build and Deploy:
  # Backend (if modified):
  cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
  candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
  ./deploy.sh --network ic --backend-only

  # CRITICAL: Sync declarations
  cp -r ../../.dfx/ic/canisters/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

  # Frontend (if modified):
  ./deploy.sh --network ic --frontend-only

Step 4 - Commit and Push:
  git add -A
  git commit -m "[Feature description]"
  git push -u origin feature/[FEATURE]

Step 5 - Create PR:
  gh pr create --title "[Title]" --body "[Detailed description]"

YOUR CRITICAL RULES:
- You MUST work in /home/theseus/alexandria/daopad-[FEATURE]/src/daopad (NOT main repo)
- Other agents ARE working in parallel - isolation is MANDATORY
- After sleep: IMMEDIATELY continue (no "should I check?" questions)
- Run candid-extractor after backend changes
- Sync declarations after backend changes
- ONLY STOP when: approved or critical error

START NOW with Step 0.
\`\`\`

### Checkpoint Strategy

This feature can be implemented in [1 PR / 2 PRs / 3 PRs]:

**Option 1: Single PR** (if feature is cohesive)
- Implement all components (backend + frontend)
- Test comprehensively on mainnet
- Create one PR with complete feature

**Option 2: Checkpoint PRs** (if feature has logical phases)
- PR #1: Backend implementation
- PR #2: Frontend implementation
- PR #3: Integration and polish

Choose based on feature complexity and review feedback.
```

### Step 7: Critical Reminders

```markdown
## Critical Implementation Notes

### 🚨 ISOLATION IS MANDATORY
**The implementing agent MUST work in an isolated worktree because:**
- Other agents are working in parallel in the main repo
- File changes from other agents will corrupt your work
- Git operations by other agents will change your files
- The orchestrator prompt above ENFORCES this with exit checks

### DAOPad-Specific Requirements

#### Candid Extraction (Backend Changes)
**ALWAYS run after Rust changes:**
\`\`\`bash
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did
\`\`\`

#### Declaration Sync (CRITICAL BUG FIX)
**Frontend uses different declarations path:**
\`\`\`bash
# After backend deploy, MUST sync:
cp -r src/declarations/daopad_backend/* src/daopad/daopad_frontend/src/declarations/daopad_backend/
# Without this, frontend gets "is not a function" errors!
\`\`\`

### Don't Guess Types
**ALWAYS test Orbit Station APIs before implementing:**
\`\`\`bash
# Use test station with admin access
export TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"
dfx canister --network ic call $TEST_STATION <method> '(args)'
# Read the actual return structure
\`\`\`

### Don't Skip Testing
Every change MUST be:
1. Built: `cargo build --target wasm32-unknown-unknown --release -p daopad_backend`
2. Extracted: `candid-extractor` (for backend changes)
3. Deployed: `./deploy.sh --network ic`
4. Tested: `dfx canister --network ic call`
5. Verified on frontend: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io

### Don't Modify Tests to Pass Code
If tests fail:
- ✅ Fix the CODE to meet test requirements
- ❌ Don't change tests to match broken code

### Do Follow Existing Patterns
Look for similar implementations and follow the same:
- Error handling style (Result types)
- React component patterns (hooks, state management)
- Service integration (frontend → backend)
- Module organization
```

---

## 📤 Final Output Format

**After creating the plan in the worktree:**

1. **Save the plan file** in the worktree (where you are now)
2. **Commit the plan to the feature branch**
3. **Return handoff message**

Your planning session should end with:

```markdown
---

## 🚀 Handoff to Implementing Agent

**Plan Complete:** [Feature Name]

**Location:** `/home/theseus/alexandria/daopad-[FEATURE]/src/daopad`
**Branch:** `feature/[feature-name]`
**Document:** `FEATURE_NAME_PLAN.md` (committed to feature branch)

**Estimated:** [X] hours, [Y] PRs

**Handoff instructions for implementing agent:**

\`\`\`bash
# Navigate to the worktree where the plan lives
cd /home/theseus/alexandria/daopad-[FEATURE]/src/daopad

# Read the plan
cat FEATURE_NAME_PLAN.md

# Then pursue it
# (The plan contains the full orchestrator prompt)
\`\`\`

**Or use this prompt:**

\`\`\`
cd /home/theseus/alexandria/daopad-[FEATURE]/src/daopad && pursue FEATURE_NAME_PLAN.md
\`\`\`

**CRITICAL**:
- Plan is IN the worktree (not main repo)
- Plan is already committed to feature branch
- Implementing agent works in SAME worktree
- Plan and implementation stay together on feature branch
```

**Then:**

1. Create the `FEATURE_NAME_PLAN.md` file with ALL the content
2. Commit it to the feature branch:
   ```bash
   git add FEATURE_NAME_PLAN.md
   git commit -m "Add implementation plan for [feature]"
   git push -u origin feature/[feature-name]
   ```
3. Return the handoff message above

---

## ✅ Checklist for Complete Plan

Before returning prompt, verify your plan has:

- [ ] **Current state analysis** - What exists now (backend + frontend)
- [ ] **File tree** - Before and after for both backend and frontend
- [ ] **Implementation details** - Pseudocode for Rust and React components
- [ ] **Type discovery** - Commands to test Orbit Station APIs
- [ ] **Testing strategy** - Build, deploy, and mainnet testing
- [ ] **Candid extraction** - Required for backend changes
- [ ] **Declaration sync** - Critical for frontend to see backend changes
- [ ] **Scope estimate** - Files modified, LOC, time
- [ ] **Embedded orchestrator** - Full isolation check and execution prompt at TOP of plan
- [ ] **Isolation enforcement** - Bash script that exits if not in worktree
- [ ] **Critical reminders** - Don't guess types, test everything, fix code not tests
- [ ] **Success criteria** - What "done" looks like

---

## 🎯 Example: Complete Planning Session

**User Request:**
```
Add member management feature for Orbit Station integration
Use @.claude/workflows/plan-pursuit-methodology.md
```

**Agent Actions:**

1. **Creates worktree (Step 0):**
```bash
cd /home/theseus/alexandria/daopad
git worktree add ../daopad-member-mgmt -b feature/member-management master
cd ../daopad-member-mgmt/src/daopad
```

2. **Researches codebase extensively...**

3. **Creates plan** `MEMBER_MANAGEMENT_PLAN.md` in worktree

4. **Commits plan:**
```bash
git add MEMBER_MANAGEMENT_PLAN.md
git commit -m "Add implementation plan for member management"
git push -u origin feature/member-management
```

5. **Responds with handoff:**

```markdown
✅ Plan Complete: Member Management Feature

Location: /home/theseus/alexandria/daopad-member-mgmt/src/daopad
Branch: feature/member-management
Document: MEMBER_MANAGEMENT_PLAN.md (committed)

- Current state analyzed (backend + frontend)
- Implementation strategy defined
- Test requirements specified
- Estimated: 5 hours, 2 PRs

**Handoff for implementing agent:**

cd /home/theseus/alexandria/daopad-member-mgmt/src/daopad && pursue MEMBER_MANAGEMENT_PLAN.md

🛑 PLANNING AGENT - YOUR JOB IS DONE
```

**The MEMBER_MANAGEMENT_PLAN.md file (in worktree) contains:**
- All research findings
- Complete implementation details for backend and frontend
- Testing requirements with mainnet deployment
- Candid extraction and declaration sync steps
- Embedded orchestrator prompt
- Everything implementing agent needs

---

## 🔑 Key Principles

1. **Create worktree FIRST** - Before any planning, isolate your work
2. **Plan lives with code** - Create plan in worktree (not main repo)
3. **Be exhaustive** - Better too much detail than too little
4. **Use pseudocode** - Implementing agent writes real code
5. **Don't guess** - Test and verify everything with dfx
6. **Show file structure** - Before/after is crucial for both backend and frontend
7. **Include build steps** - Candid extraction and declaration sync are critical
8. **Estimate scope** - LOC and time help set expectations
9. **Embed orchestrator** - Don't reference it, EMBED the full prompt with isolation check
10. **Commit the plan** - Push to feature branch before handing off
11. **Think, don't implement** - You're the planner, not the builder

---

## 📚 What You're NOT Doing

- ❌ Writing production code
- ❌ Creating PRs
- ❌ Deploying to mainnet
- ❌ Iterating on reviews
- ❌ Implementing the orchestrator workflow

Those are the implementing agent's job.

---

## 🎓 Meta-Level Understanding

**This methodology creates a clean handoff:**

```
Planning Agent (Any conversation, any context):
  Input: Feature request
  Process:
    1. Create isolated worktree
    2. Research + think + document IN WORKTREE
    3. Commit plan to feature branch
  Output: Plan on feature branch + handoff instructions
  🛑 THEN STOPS (does not implement)

Fresh Implementing Agent (New conversation, same worktree):
  Input: Navigate to worktree → read plan
  Process: Execute using orchestrator workflow
  Output: Working feature on mainnet + PR with plan + implementation
```

**Benefits:**
- Planning agent can use lots of context researching
- Implementing agent starts fresh (no context pollution)
- Plan is complete (implementing agent doesn't need to ask questions)
- Plan and implementation live together on feature branch
- No master pollution with unimplemented plans
- Multiple agents can plan in parallel without conflicts
- Self-contained feature branches
- Reusable across ANY feature/project

---

## 🛑 FINAL INSTRUCTIONS: When You're Done Planning

**After saving and committing the plan to the feature branch**, your final message should be ONLY:

```
pursue @/home/theseus/alexandria/daopad-[FEATURE]/src/daopad/[PLAN_NAME].md
```

**That's it. No additional commentary, no explanations, just the pursue command.**

### Why This Format?

- User can copy-paste directly to implementing agent from ANY directory
- Plan contains ALL context (navigation, isolation checks, implementation steps)
- Implementing agent reads plan first, then navigates to worktree
- No manual cd required - the plan handles everything

### If User Says "Looks Good" or "Go Ahead"

**Still DO NOT implement!** Respond:

```
pursue @/home/theseus/alexandria/daopad-[FEATURE]/src/daopad/[PLAN_NAME].md
```

**Then STOP.**

### Why This Matters

Implementing in the same conversation:
- ❌ Uses up context window with planning research
- ❌ May miss details from the plan document
- ❌ Defeats purpose of fresh-agent execution
- ❌ Creates confusion about roles

Proper handoff:
- ✅ Planning agent uses context for research
- ✅ Implementing agent starts fresh with plan
- ✅ Clear separation of concerns
- ✅ Repeatable process

---

## 📖 Examples of Both Paths

### Example: Plan Mode (Recommended)

**User enters plan mode:**
```
/plan
```

**User requests:**
```
Plan member management for Orbit Station using @.claude/workflows/plan-pursuit-methodology.md
```

**Agent (Step 0):** Creates worktree
```bash
cd /home/theseus/alexandria/daopad
git worktree add ../daopad-member-mgmt -b feature/member-management master
cd ../daopad-member-mgmt/src/daopad
```

**Agent:** Researches, creates plan, commits it:
```bash
# Create MEMBER_MANAGEMENT_PLAN.md in worktree
git add MEMBER_MANAGEMENT_PLAN.md
git commit -m "Add implementation plan for member management"
git push -u origin feature/member-management
```

**Agent responds:**
```
✅ Plan Complete: Member Management for Orbit Station

Location: /home/theseus/alexandria/daopad-member-mgmt/src/daopad
Branch: feature/member-management
Document: MEMBER_MANAGEMENT_PLAN.md (committed)
Estimated: 5 hours, 2 PRs

Handoff for implementing agent:

cd /home/theseus/alexandria/daopad-member-mgmt/src/daopad && pursue MEMBER_MANAGEMENT_PLAN.md

---

🚨 PLANNING AGENT - YOUR JOB IS DONE

[... DO NOT implement list ...]

🛑 END CONVERSATION HERE 🛑
```

**User exits plan mode, starts new conversation in the worktree:**
```
cd /home/theseus/alexandria/daopad-member-mgmt/src/daopad
```
Then in Claude:
```
pursue MEMBER_MANAGEMENT_PLAN.md
```

**Fresh agent implements autonomously in same worktree** ✅

### Example: Without Plan Mode (Fallback)

**User requests mid-conversation:**
```
Plan the treasury transfer feature using @.claude/workflows/plan-pursuit-methodology.md
```

**Agent (Step 0):** Creates worktree and navigates to it

**Agent researches, creates plan, commits, responds:**
```
✅ Plan Complete: Treasury Transfer Feature

Location: /home/theseus/alexandria/daopad-treasury/src/daopad
Branch: feature/treasury-transfer
Document: TREASURY_TRANSFER_PLAN.md (committed)
Estimated: 4 hours, 1 PR

Handoff for implementing agent:

cd /home/theseus/alexandria/daopad-treasury/src/daopad && pursue TREASURY_TRANSFER_PLAN.md

---

🚨 PLANNING AGENT - YOUR JOB IS DONE
🛑 END CONVERSATION HERE 🛑
```

**User (hopefully!) starts new conversation in worktree:**
```bash
cd /home/theseus/alexandria/daopad-treasury/src/daopad
```
Then in Claude:
```
pursue TREASURY_TRANSFER_PLAN.md
```

**Fresh agent implements in same worktree** ✅

**Risk:** If user says "looks good, proceed" in same conversation, agent might implement despite warnings. Plan Mode eliminates this risk.

---

## 📝 Ready to Plan?

When user says: "Use plan-pursuit-methodology"

### Your Workflow:

0. **Create worktree for the feature** (FIRST STEP!)
   ```bash
   cd /home/theseus/alexandria/daopad
   git worktree add ../daopad-[FEATURE] -b feature/[feature-name] master
   cd ../daopad-[FEATURE]/src/daopad
   ```
1. Ask clarifying questions (if needed)
2. Research codebase exhaustively (Read, Grep, both backend and frontend)
3. Create exhaustive plan document **IN THE WORKTREE**
4. Commit plan to feature branch
   ```bash
   git add [PLAN_NAME].md
   git commit -m "Add implementation plan for [feature]"
   git push -u origin feature/[feature-name]
   ```
5. Return handoff message with worktree path
6. **🛑 STOP - Do not implement**

### If in Plan Mode:
- User will exit plan mode
- User will navigate to worktree
- User will start fresh conversation there
- Implementing agent will execute

### If NOT in Plan Mode:
- User should navigate to worktree
- User should start fresh conversation
- If user says "go ahead" → redirect to worktree + fresh conversation
- Do not implement under any circumstances

**START PLANNING.**