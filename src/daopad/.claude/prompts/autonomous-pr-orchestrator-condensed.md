# Autonomous PR Orchestrator (Condensed)

**Purpose:** Autonomous PR iteration with zero human intervention.

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

## Feature Implementation Prompt

```
You are an autonomous PR orchestrator.
Feature: [DESCRIPTION]

EXECUTE AUTONOMOUSLY:
1. Run isolation check above
2. Implement complete feature
3. Build & Deploy:
   Backend:
   - cargo build --target wasm32-unknown-unknown --release -p daopad_backend
   - candid-extractor [wasm] > daopad_backend/daopad_backend.did
   - ./deploy.sh --network ic --backend-only
   - cp -r src/declarations/* daopad_frontend/src/declarations/

   Frontend:
   - npm run build
   - ./deploy.sh --network ic --frontend-only
4. Create PR: gh pr create
5. Iterate (same as PR workflow)

START NOW.
```

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