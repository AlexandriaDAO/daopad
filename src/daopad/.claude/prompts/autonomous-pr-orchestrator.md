# 🤖 Autonomous PR Orchestrator - Ready-to-Use Prompts

**Purpose**: Copy these prompts directly to Claude Code for autonomous PR iteration with zero human intervention.

---

## 🚨 CRITICAL: ISOLATION REQUIREMENT

**YOU must work in an isolated worktree** because:
- Other Claude agents may be running in parallel on different features
- If YOU work in the main repo directory, YOU will conflict with them
- File changes from other agents will corrupt YOUR work
- Git checkouts by other agents will change YOUR files

**Safety**: The prompts below automatically create isolated worktrees for YOU.

---

## ⚡ COPY THIS PROMPT → Test PR Iteration

```
You are an autonomous PR orchestrator.

PR: https://github.com/AlexandriaDAO/daopad/pull/[PR_NUMBER]
Main Repo: /home/theseus/alexandria/daopad

EXECUTE THESE STEPS AUTONOMOUSLY (DO NOT ASK FOR PERMISSION):

Step 1 - Isolate Yourself (MANDATORY for safety):
  # YOU must check if you're in the main repo or a worktree
  REPO_ROOT=$(git rev-parse --show-toplevel)
  CURRENT_DIR=$(pwd)

  if [ "$REPO_ROOT" = "$CURRENT_DIR" ]; then
    # YOU are in the main repo - create YOUR isolated worktree
    echo "⚠️ Creating YOUR isolated worktree for safe parallel work..."
    cd /home/theseus/alexandria/daopad
    BRANCH=$(gh pr view [PR_NUMBER] --json headRefName -q .headRefName)
    git worktree add ../daopad-pr-[PR_NUMBER] $BRANCH
    cd ../daopad-pr-[PR_NUMBER]
  else
    # YOU are already in a worktree - safe to continue
    echo "✅ You are already isolated in: $CURRENT_DIR"
  fi

  pwd  # Confirm YOUR working directory

Step 2 - Iteration Loop (Max 5 iterations):
  FOR i = 1 to 5:
    a. Check review: gh pr view [PR_NUMBER] --json comments --jq '.comments[-1].body'
    b. Count P0 blocking issues
    c. IF P0 > 0:
       - Report: "📊 Iteration [i]/5: Found [X] P0 issues"
       - Spawn pr-review-resolver: "Fix all P0 issues in https://github.com/AlexandriaDAO/daopad/pull/[PR_NUMBER]"
       - Execute: sleep 300
       - After sleep completes, IMMEDIATELY go to step a (check review)
       - DO NOT report "waiting complete, should I continue?"
       - DO NOT ask "want to watch?" or "want me to check?"
       - Just loop back to step a
    d. IF P0 = 0:
       - Report: "✅ SUCCESS: PR approved after [i] iterations"
       - EXIT

  IF iteration 5 AND P0 > 0:
    - Report: "⚠️ ESCALATE: Max iterations reached"
    - List remaining P0 issues
    - Report: "Manual intervention required"
    - EXIT (do not ask "want to continue manually?")

YOUR CRITICAL RULES (YOU must follow these):
- YOU must NOT ask "Should I proceed?" or "Is this correct?" - just execute
- YOU must NOT ask "Want to watch?" or "Want me to report back?" - just continue
- YOU must NOT ask "is check done?" or "should I check now?" - just sleep and continue
- YOU must NOT wait for human confirmation - proceed automatically
- YOU must NOT pause after reporting - immediately continue to next step
- YOU must work in YOUR isolated worktree (other agents may be working in parallel)
- YOU must report progress ONLY (not questions)
- YOU must spawn fresh pr-review-resolver subagent each iteration
- YOU must execute sleep 300 commands without asking permission
- AFTER sleep: YOU must IMMEDIATELY continue (no "sleep done, continue?" questions)
- YOU ONLY STOP when: approved, 5 iterations complete, or critical error

START NOW with Step 1 (isolate yourself).
```

## ⚡ COPY THIS PROMPT → Implement New Feature

```
You are an autonomous PR orchestrator.

Feature: [FEATURE_DESCRIPTION]
Main Repo: /home/theseus/alexandria/daopad
Base Branch: master

EXECUTE THESE STEPS AUTONOMOUSLY (DO NOT ASK FOR PERMISSION):

Step 1 - Isolate Yourself (MANDATORY for safety):
  # YOU must check if you're in the main repo or a worktree
  REPO_ROOT=$(git rev-parse --show-toplevel)
  CURRENT_DIR=$(pwd)

  if [ "$REPO_ROOT" = "$CURRENT_DIR" ]; then
    # YOU are in the main repo - create YOUR isolated worktree
    echo "⚠️ Creating YOUR isolated worktree for safe parallel work..."
    cd /home/theseus/alexandria/daopad
    git worktree add -b feature/[FEATURE_BRANCH] ../daopad-[FEATURE] master
    cd ../daopad-[FEATURE]
  else
    # YOU are already in a worktree - safe to continue
    echo "✅ You are already isolated in: $CURRENT_DIR"
  fi

  pwd  # Confirm YOUR working directory

Step 2 - Implement Feature:
  - Implement complete functionality (backend + frontend)

  For Backend changes:
  - Build: cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
  - Extract candid: candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did

  For Frontend changes:
  - Test build: cd daopad_frontend && npm run build

  Test compilation and structure

Step 3 - Deploy and Sync:
  # Deploy backend (if changed)
  ./deploy.sh --network ic --backend-only

  # CRITICAL: Sync declarations if backend changed
  cp -r src/declarations/daopad_backend/* src/daopad/daopad_frontend/src/declarations/daopad_backend/

  # Deploy frontend (if changed or declarations synced)
  ./deploy.sh --network ic --frontend-only

Step 4 - Push and Create PR:
  git add -A
  git commit -m "[Feature description]"
  git push -u origin feature/[FEATURE_BRANCH]
  gh pr create --title "[Feature Title]" --body "[Description]"

Step 5 - Iteration Loop (Max 5 iterations):
  FOR i = 1 to 5:
    a. Get PR number from created PR
    b. Execute: sleep 300
    c. Check review: gh pr view [PR_NUM] --json comments --jq '.comments[-1].body'
    d. Count P0 issues
    e. IF P0 > 0:
       - Report: "📊 Iteration [i]/5: Found [X] P0 issues"
       - Spawn pr-review-resolver to fix
       - Execute: sleep 300
       - After sleep, IMMEDIATELY go to step c (no questions)
    f. IF P0 = 0:
       - Report: "✅ SUCCESS: PR approved"
       - EXIT

YOUR CRITICAL RULES (YOU must follow these):
- YOU must NOT ask for permission at any step
- YOU must NOT ask "Want to watch?" or "Want me to report back when done?"
- YOU must NOT wait for user to say "continue" or "check is done"
- YOU must work in YOUR isolated worktree (other agents may be working in parallel)
- YOU must automatically sleep 300 seconds (5 minutes) after each push
- YOU must proceed through all steps automatically
- YOU must report progress ONLY (not questions)
- YOU must run candid-extractor after backend changes
- YOU must sync declarations after backend changes
- AFTER sleep: YOU must IMMEDIATELY continue to next step (no pause, no questions)
- YOU ONLY STOP when: approved, 5 iterations, or critical error

START NOW with Step 1 (isolate yourself).
```

---

## 🌳 Git Worktree Quick Reference

### Why Use Worktrees?
- **Problem**: `git checkout` in Terminal 1 changes files in Terminal 2
- **Solution**: Each agent works in separate directory
- **Benefit**: Run 5+ agents in parallel on different features

### Setup Worktree for PR
```bash
# From main repo root
cd /home/theseus/alexandria/daopad
git worktree add ../daopad-pr-123 feature-branch-name
cd ../daopad-pr-123

# Start agent in worktree
claude
> PR: https://github.com/AlexandriaDAO/daopad/pull/123
> Iterate autonomously until approved. Start now.
```

### Setup Worktree for New Feature
```bash
# From main repo root
cd /home/theseus/alexandria/daopad
git worktree add -b feature/member-management ../daopad-members master
cd ../daopad-members

# Start agent in worktree
claude
> Feature: Implement member management for Orbit Station
> Create PR and iterate autonomously. Start now.
```

### List and Clean Up Worktrees
```bash
# See all active worktrees
git worktree list

# Remove worktree after PR merged
git worktree remove ../daopad-pr-123

# Prune stale references
git worktree prune
```

---

## 🧹 Branch Cleanup Guide

### Before Starting: Clean Up Stale Branches

**Check what branches exist**:
```bash
git branch -a  # All branches (local + remote)
```

**Delete local branches not in remote**:
```bash
# List branches not in master
git branch --merged master  # Safe to delete
git branch --no-merged master  # Check these manually

# Delete old local branches
git branch -d old-branch-name

# Force delete if needed (unmerged)
git branch -D old-branch-name
```

**Recommended cleanup for DAOPad project**:
```bash
# You probably want to keep:
# - master (base branch)
# - active-pr-branch (if working on PR)

# Delete any other local branches unless actively working on them
git branch | grep -v "master\|active-pr-branch" | xargs git branch -D
```

### Should You Delete Branches Not in Master?

**It depends**:

✅ **DELETE if**:
- Merged to master (no longer needed)
- Abandoned work (decided not to pursue)
- Experimental branches (testing something)

❌ **KEEP if**:
- Active PR branch
- Work in progress
- Not yet reviewed/merged

**For your current state**:
```bash
# Your branches:
master                                ← KEEP (base branch)
feature/your-active-pr             ← KEEP (active PR)

# Remote branches you're not using locally are fine - ignore them
```

**Start fresh**:
```bash
# Clean slate before autonomous workflow
git checkout master
git pull origin master
git branch -D any-old-branches  # If any exist

# Now ready to run autonomous orchestrator!
```

---

## 🎯 Full Autonomous Prompt (Verbose Version)

Use this if the simple prompts don't work:

```
You are an autonomous PR orchestrator. Execute the full review-fix-review cycle without asking for confirmation.

INPUT: https://github.com/AlexandriaDAO/daopad/pull/[PR_NUMBER]
MAIN_REPO: /home/theseus/alexandria/daopad

WORKFLOW (EXECUTE AUTONOMOUSLY):

1. Setup Isolation:
   - Detect if already in worktree (check pwd vs git rev-parse --show-toplevel)
   - If NOT in worktree: Create one for this PR from main repo root
   - Extract branch: BRANCH=$(gh pr view [PR_NUMBER] --json headRefName -q .headRefName)
   - Create: cd /home/theseus/alexandria/daopad && git worktree add ../daopad-pr-[PR_NUMBER] $BRANCH
   - Move to worktree: cd ../daopad-pr-[PR_NUMBER]

2. Build Process (for fixes):
   Backend changes:
   - cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
   - candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did
   - ./deploy.sh --network ic --backend-only
   - cp -r src/declarations/daopad_backend/* src/daopad/daopad_frontend/src/declarations/daopad_backend/

   Frontend changes:
   - cd daopad_frontend && npm run build
   - cd .. && ./deploy.sh --network ic --frontend-only

3. Iteration Loop (Max 5 iterations):
   FOR i = 1 to 5:
     a. Check review: gh pr view [PR_NUMBER] --json comments --jq '.comments[-1].body'
     b. Count P0 issues in review
     c. IF P0 > 0:
        - Report: "Iteration [i]/5: Found [X] P0 issues"
        - Spawn pr-review-resolver: "Fix all P0 issues in PR [PR_NUMBER]"
        - Execute: sleep 300
        - After sleep, IMMEDIATELY go to step a (no questions)
     d. IF P0 = 0:
        - Report: "✅ SUCCESS: PR approved after [i] iterations"
        - EXIT

   IF iteration 5 AND P0 > 0:
     - Report: "⚠️ ESCALATE: Max iterations reached"
     - List remaining P0 issues
     - Report: "Manual intervention required"
     - EXIT (do not ask "want to continue manually?")

YOUR CRITICAL RULES (YOU must follow these):
- YOU must NOT ask questions like "Should I proceed?"
- YOU must NOT ask "Want to watch?" or "Want me to report back when done?"
- YOU must NOT ask "is check done?" or "should I check now?"
- YOU must NOT wait for confirmation
- YOU must NOT pause after reporting - immediately continue
- YOU must work in YOUR isolated worktree (other agents may be working in parallel)
- YOU must report progress ONLY (not questions)
- YOU must spawn fresh pr-review-resolver subagent each iteration
- YOU must wait 300 seconds (5 min) for GitHub Actions between iterations
- YOU must run candid-extractor after backend Rust changes
- YOU must sync declarations after backend changes
- AFTER sleep: YOU must IMMEDIATELY continue (no "sleep done, continue?" questions)
- YOU ONLY STOP at: approval, max iterations, or critical error

START IMMEDIATELY. First action: Setup worktree or detect existing worktree.
```

---

## 🔍 Diagnosis of Common Issues

### Issue: "is not a function" Error
**Cause**: Frontend using stale declarations after backend changes
**Fix**: Always sync after backend changes:
```bash
cp -r src/declarations/daopad_backend/* src/daopad/daopad_frontend/src/declarations/daopad_backend/
./deploy.sh --network ic --frontend-only
```

### Issue: Agent Stops and Asks Questions
**Cause**: Prompt not imperative enough
**Fix**: Use explicit commands:
- "DO NOT ask for permission"
- "Proceed autonomously through all steps"
- "ONLY STOP when [conditions]"

### Issue: Candid Decode Errors
**Cause**: Backend .did file not updated after Rust changes
**Fix**: Always run candid-extractor:
```bash
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did
```

---

## 📝 Quick Command Templates

### For Backend Feature:
```
DO NOT ask questions. Proceed autonomously:

1. Implement [FEATURE] in daopad_backend
2. Build: cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
3. Extract candid: candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did
4. Deploy: ./deploy.sh --network ic --backend-only
5. Sync declarations: cp -r src/declarations/daopad_backend/* src/daopad/daopad_frontend/src/declarations/daopad_backend/
6. Push: git push -u origin feature/[BRANCH]
7. Create PR: gh pr create --title "[FEATURE]"
8. Wait 5 minutes for review
9. If P0 found: spawn pr-review-resolver, iterate
10. If approved: report success

Start immediately with step 1.
```

### For Frontend Feature:
```
DO NOT ask questions. Proceed autonomously:

1. Implement [FEATURE] in daopad_frontend
2. Build test: cd daopad_frontend && npm run build
3. Deploy: ./deploy.sh --network ic --frontend-only
4. Test on https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
5. Push: git push -u origin feature/[BRANCH]
6. Create PR: gh pr create --title "[FEATURE]"
7. Wait 5 minutes for review
8. If P0 found: spawn pr-review-resolver, iterate
9. If approved: report success

Start immediately with step 1.
```

---

## 💡 Key Insight

**The prompt needs to be IMPERATIVE, not DESCRIPTIVE:**

❌ **Descriptive** (what it does):
> "The agent handles worktree creation, implementation, testing..."

✅ **Imperative** (what to do):
> "CREATE worktree. IMPLEMENT feature. PUSH code. DO NOT ask questions."

The updated prompt now uses:
- Command verbs (CREATE, IMPLEMENT, PUSH, ITERATE)
- Explicit prohibitions (DO NOT ask, ONLY STOP when)
- Clear start trigger (Start now, Start immediately)
- DAOPad-specific build steps (candid-extractor, declaration sync)

---

## 🚀 Ready to Run?

1. Copy the appropriate prompt
2. Replace placeholders ([PR_NUMBER], [FEATURE], etc.)
3. Paste to Claude Code
4. Watch it run autonomously

Remember: The agent will NOT ask questions. It will execute until done or blocked.