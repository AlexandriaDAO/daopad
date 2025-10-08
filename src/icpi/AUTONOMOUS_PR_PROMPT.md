# 🤖 Autonomous PR Orchestrator - Ready-to-Use Prompts

**Purpose**: Copy these prompts directly to Claude Code for autonomous PR iteration with zero human intervention.

---

## ⚡ COPY THIS PROMPT → Test PR #4 Iteration

```
You are an autonomous PR orchestrator.

PR: https://github.com/AlexandriaDAO/daopad/pull/4
Main Repo: /home/theseus/alexandria/daopad/src/icpi

EXECUTE THESE STEPS AUTONOMOUSLY (DO NOT ASK FOR PERMISSION):

Step 1 - Create Isolated Worktree:
  cd /home/theseus/alexandria/daopad/src/icpi
  git worktree add ../icpi-pr-4 icpi-to-icpx-refactor-v2
  cd ../icpi-pr-4
  pwd  # Confirm you're in ../icpi-pr-4

Step 2 - Iteration Loop (Max 5 iterations):
  FOR i = 1 to 5:
    a. Check review: gh pr view 4 --json comments --jq '.comments[-1].body'
    b. Count P0 blocking issues
    c. IF P0 > 0:
       - Report: "📊 Iteration [i]/5: Found [X] P0 issues"
       - Spawn pr-review-resolver: "Fix all P0 issues in https://github.com/AlexandriaDAO/daopad/pull/4"
       - Wait: sleep 240 (4 minutes for GitHub Actions)
       - Continue to iteration [i+1]
    d. IF P0 = 0:
       - Report: "✅ SUCCESS: PR approved after [i] iterations"
       - EXIT

  IF iteration 5 AND P0 > 0:
    - Report: "⚠️ ESCALATE: 5 iterations complete, [X] P0 issues remain"
    - List remaining issues
    - EXIT

CRITICAL RULES:
- DO NOT ask "Should I proceed?" or "Is this correct?" - just execute
- DO NOT wait for human confirmation - proceed automatically
- DO report progress after each iteration
- DO spawn fresh pr-review-resolver subagent each iteration
- ONLY STOP when: approved, 5 iterations complete, or critical error

START NOW with Step 1 (create worktree).
```

## ⚡ COPY THIS PROMPT → Implement New Feature

```
You are an autonomous PR orchestrator.

Feature: Implement Zone 3 Kong liquidity integration
Main Repo: /home/theseus/alexandria/daopad/src/icpi
Base Branch: master

EXECUTE THESE STEPS AUTONOMOUSLY (DO NOT ASK FOR PERMISSION):

Step 1 - Create Isolated Worktree:
  cd /home/theseus/alexandria/daopad/src/icpi
  git worktree add -b feature/zone-3-kong-liquidity ../icpi-zone3 master
  cd ../icpi-zone3
  pwd  # Confirm you're in ../icpi-zone3

Step 2 - Implement Feature:
  - Implement complete Zone 3 functionality
  - Build: cargo build --target wasm32-unknown-unknown --release
  - Test basic compilation and structure

Step 3 - Push and Create PR:
  git add -A
  git commit -m "[Feature description]"
  git push -u origin feature/zone-3-kong-liquidity
  gh pr create --title "Zone 3: Kong Liquidity Integration" --body "[Description]"

Step 4 - Iteration Loop (Max 5 iterations):
  FOR i = 1 to 5:
    a. Get PR number from created PR
    b. Wait 240 seconds for initial GitHub Actions review
    c. Check review: gh pr view [PR_NUM] --json comments --jq '.comments[-1].body'
    d. Count P0 issues
    e. IF P0 > 0:
       - Report: "📊 Iteration [i]/5: Found [X] P0 issues"
       - Spawn pr-review-resolver to fix
       - Wait 240 seconds
       - Continue
    f. IF P0 = 0:
       - Report: "✅ SUCCESS: PR approved"
       - EXIT

CRITICAL RULES:
- DO NOT ask for permission at any step
- DO proceed through all steps automatically
- DO report progress only
- ONLY STOP when: approved, 5 iterations, or critical error

START NOW with Step 1.
```

---

## 🌳 Git Worktree Quick Reference

### Why Use Worktrees?
- **Problem**: `git checkout` in Terminal 1 changes files in Terminal 2
- **Solution**: Each agent works in separate directory
- **Benefit**: Run 5+ agents in parallel on different features

### Setup Worktree for PR #4
```bash
# From main repo
cd /home/theseus/alexandria/daopad/src/icpi
git worktree add ../icpi-pr-4 icpi-to-icpx-refactor-v2
cd ../icpi-pr-4

# Start agent in worktree
claude
> PR: https://github.com/AlexandriaDAO/daopad/pull/4
> Iterate autonomously until approved. Start now.
```

### Setup Worktree for New Feature
```bash
# From main repo
cd /home/theseus/alexandria/daopad/src/icpi
git worktree add -b feature/zone-3 ../icpi-zone3 master
cd ../icpi-zone3

# Start agent in worktree
claude
> Feature: Implement Zone 3 Kong liquidity integration
> Create PR and iterate autonomously. Start now.
```

### List and Clean Up Worktrees
```bash
# See all active worktrees
git worktree list

# Remove worktree after PR merged
git worktree remove ../icpi-pr-4

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

**Recommended cleanup for ICPI project**:
```bash
# You probably want to keep:
# - master (base branch)
# - icpi-to-icpx-refactor-v2 (active PR #4)

# Delete any other local branches unless actively working on them
git branch | grep -v "master\|icpi-to-icpx-refactor-v2" | xargs git branch -D
```

### Should You Delete Branches Not in Main?

**It depends**:

✅ **DELETE if**:
- Merged to master (no longer needed)
- Abandoned work (decided not to pursue)
- Experimental branches (testing something)

❌ **KEEP if**:
- Active PR (like your PR #4 branch)
- Work in progress
- Not yet reviewed/merged

**For your current state**:
```bash
# Your branches:
master                              ← KEEP (base branch)
icpi-to-icpx-refactor-v2           ← KEEP (active PR #4)

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

INPUT: https://github.com/AlexandriaDAO/daopad/pull/4
MAIN_REPO: /home/theseus/alexandria/daopad/src/icpi

WORKFLOW (EXECUTE AUTONOMOUSLY):

1. Setup Isolation:
   - Detect if already in worktree (check pwd vs git rev-parse --show-toplevel)
   - If NOT in worktree: Create one for this PR
   - Extract branch: gh pr view 4 --json headRefName
   - Create: git worktree add ../icpi-pr-4 [branch-name]
   - Move to worktree: cd ../icpi-pr-4

2. Iteration Loop (Max 5 iterations):
   FOR i = 1 to 5:
     a. Check review: gh pr view 4 --json comments --jq '.comments[-1].body'
     b. Count P0 issues in review
     c. IF P0 > 0:
        - Report: "Iteration [i]/5: Found [X] P0 issues"
        - Spawn pr-review-resolver: "Fix all P0 issues in PR 4"
        - Wait 4 minutes: sleep 240
        - Continue to next iteration
     d. IF P0 = 0:
        - Report: "✅ SUCCESS: PR approved after [i] iterations"
        - EXIT

   IF iteration 5 AND P0 > 0:
     - Report: "⚠️ ESCALATE: 5 iterations complete, [X] P0 issues remain"
     - EXIT

CRITICAL RULES:
- DO NOT ask questions like "Should I proceed?"
- DO NOT wait for confirmation
- DO report progress after each iteration
- DO use git worktrees for parallel safety
- DO spawn fresh pr-review-resolver each iteration
- DO wait 240 seconds (4 min) for GitHub Actions between iterations
- ONLY STOP at: approval, max iterations, or critical error

START IMMEDIATELY. First action: Setup worktree or detect existing worktree.
```

---

## 🔍 Diagnosis of Current Issue

**Agent behavior**: Stopped and asked "Should I proceed?"

**Why this happened**:
1. ❌ Prompt didn't explicitly say "DO NOT ASK QUESTIONS"
2. ❌ Didn't emphasize "autonomous" strongly enough
3. ❌ Didn't structure as imperative commands

**Fix**:
Add explicit commands:
- "DO NOT ask for permission"
- "Proceed autonomously through all steps"
- "ONLY STOP when [conditions]"

---

## 📝 Corrected Simple Prompt

Copy this to the agent that's currently waiting:

```
DO NOT ask questions. Proceed autonomously:

1. Implement Zone 3 Kong liquidity integration completely
2. Build and test: cargo build --release
3. Push: git push -u origin feature/zone-3-kong-liquidity
4. Create PR: gh pr create --title "Zone 3: Kong Liquidity Integration"
5. Wait 4 minutes for GitHub Actions review
6. Check review for P0 issues
7. If P0 found: spawn pr-review-resolver, iterate
8. If approved: report success

Start immediately with step 1 (implement Zone 3).
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

**Want me to save the improved imperative version?**