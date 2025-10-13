# Autonomous PR Orchestrator (Condensed)

**Purpose:** Autonomous PR iteration with zero human intervention.

## How This Gets Used

**EMBEDDED IN PLANS**: This orchestrator is NOT just referenced - it's EMBEDDED at the top of every implementation plan. When a planner creates a plan using `plan-pursuit-methodology-condensed.md`, they MUST copy the entire "Feature Implementation Prompt" section below into the plan header.

**Why Embedding?** Implementing agents must see orchestrator instructions FIRST before reading the plan. This makes PR creation impossible to skip - the orchestrator header literally blocks access to the plan content until acknowledged.

**See:** `.claude/workflows/plan-pursuit-methodology-condensed.md` section 5 for the embedding template.

## Isolation Check (MANDATORY)

```bash
# Must run first - ensures parallel agent safety
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Creating isolated worktree..."
    # PR workflow
    git worktree add ../daopad-pr-[NUM] $(gh pr view [NUM] --json headRefName -q .headRefName)
    # OR Feature workflow
    git worktree add -b feature/[NAME] ../daopad-[NAME] master
    cd ../daopad-[NAME]
fi
```

## PR Iteration Prompt

```
You are an autonomous PR orchestrator.
PR: https://github.com/AlexandriaDAO/daopad/pull/[NUM]

EXECUTE AUTONOMOUSLY:
1. Run isolation check above
2. FOR i=1 to 5:
   - Check review: gh pr view [NUM] --json comments
   - Count P0 issues
   - IF P0 > 0: Spawn pr-review-resolver, sleep 300, continue
   - IF P0 = 0: Report success, EXIT
3. After 5 iterations: Escalate, EXIT

CRITICAL RULES:
- NO questions ("should I?", "want me to?", "is it done?")
- After sleep: IMMEDIATELY continue (no pause)
- ONLY stop at: approved, max iterations, or error

START NOW.
```

## Feature Implementation Prompt (FOR EMBEDDING IN PLANS)

**This entire section gets embedded at the TOP of every implementation plan:**

```markdown
# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
\`\`\`bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-[FEATURE]/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
\`\`\`

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-[FEATURE]/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Backend changes:
     \`\`\`bash
     cargo build --target wasm32-unknown-unknown --release -p daopad_backend
     candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
     ./deploy.sh --network ic --backend-only
     cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
     \`\`\`
   - Frontend changes:
     \`\`\`bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     \`\`\`
4. **Create PR** (MANDATORY):
   \`\`\`bash
   git add .
   git commit -m "[Descriptive message]"
   git push -u origin feature/[feature-name]
   gh pr create --title "[Feature]: [Title]" --body "Implements [PLAN].md"
   \`\`\`
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

**Branch:** `feature/[feature-name]`
**Worktree:** `/home/theseus/alexandria/daopad-[FEATURE]/src/daopad`

START NOW - NO CONFIRMATION NEEDED.

---

# Implementation Plan
[Plan content follows below...]
```

**Planner's Responsibility:** When creating a plan, copy this entire section to the top of the plan file, filling in [FEATURE], [feature-name], and [PLAN].md placeholders.

## Handoff Mechanism

**The Problem:** Implementing agents would ignore orchestrator references and implement directly without creating PRs.

**The Solution:** Embed orchestrator instructions AT THE TOP of every plan. When an implementing agent reads the plan, they MUST encounter the orchestrator header first.

**Flow:**
1. Planner creates plan with embedded orchestrator header
2. Planner commits plan to feature branch
3. Planner hands off: `pursue @/path/to/PLAN.md`
4. Implementing agent opens PLAN.md
5. **First thing they see:** "🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP"
6. Header contains complete workflow INCLUDING mandatory PR creation
7. Plan content appears AFTER the orchestrator instructions
8. Impossible to skip - it's blocking the plan content

**Why This Works:**
- No reliance on agent "remembering" to check orchestrator
- No external references that can be ignored
- Instructions are self-contained in the plan file
- PR creation is part of the workflow, not an optional step

## DAOPad Build Checklist

**After Rust changes:**
1. `cargo build --target wasm32-unknown-unknown --release -p daopad_backend`
2. `candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did`
3. Deploy backend
4. **CRITICAL:** `cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/`
5. Deploy frontend

## Worktree Commands

```bash
# Create for PR
git worktree add ../daopad-pr-123 feature-branch

# Create for feature
git worktree add -b feature/name ../daopad-name master

# Clean up
git worktree remove ../daopad-pr-123
git worktree prune
```

## Common Fixes

| Issue | Fix |
|-------|-----|
| "is not a function" | Sync declarations after backend changes |
| Agent asks questions | Use imperative language: "START NOW" |
| Candid decode error | Run candid-extractor after Rust changes |
| File conflicts | Verify isolation check ran first |