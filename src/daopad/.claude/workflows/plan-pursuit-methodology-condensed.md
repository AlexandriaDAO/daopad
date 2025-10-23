# Plan-Pursuit Methodology (Condensed)

**Purpose:** Transform feature requests into exhaustive implementation plans for autonomous execution.

## Task Classification

**NEW FEATURE**: Build new functionality → additive approach
**REFACTORING**: Improve existing code → subtractive + targeted fixes
**BUG FIX**: Restore broken behavior → minimal changes

## Workflow Steps

### 1. Sync Main Repo Master (MANDATORY FIRST STEP)
```bash
# Ensure main repo master is up to date
cd /home/theseus/alexandria/daopad
git checkout master
git pull
```
**CRITICAL**: Main repo master is READ-ONLY. Never commit there. Only `git pull`.

### 2. Create Worktree (MANDATORY SECOND STEP)
```bash
cd /home/theseus/alexandria/daopad
git worktree add ../daopad-[FEATURE] -b feature/[feature-name] master
cd ../daopad-[FEATURE]/src/daopad
```
All planning happens IN the worktree, not main repo.

### 3. Research (30-60 min)
```bash
# Find all related files
rg "keyword" daopad_backend/ daopad_frontend/ --files-with-matches
# Read existing implementations thoroughly
# Test Orbit APIs with dfx before implementing
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai <method> '(args)'
```

### 4. Document Current State
- File tree (before/after)
- Existing implementations with line numbers
- Dependencies and constraints
- For refactoring: list dead code, duplicates, complexity

### 5. Plan Implementation
Use PSEUDOCODE for all code:
```markdown
## Backend: `path/to/file.rs` (NEW/MODIFY)
\`\`\`rust
// PSEUDOCODE
pub async fn feature() -> Result<T> {
    // Step-by-step logic
}
\`\`\`

## Frontend: `path/to/Component.jsx` (NEW/MODIFY)
\`\`\`javascript
// PSEUDOCODE
export function Component() {
    // Implementation steps
}
\`\`\`
```

### 6. Testing Requirements

**For Backend Changes**:
```markdown
## Testing
- Type discovery: dfx canister --network ic call
- Build: cargo build --target wasm32-unknown-unknown
- Candid: candid-extractor (after Rust changes)
- Deploy: ./deploy.sh --network ic
- Sync declarations: cp -r src/declarations/* frontend/src/declarations/
```

**For Frontend Changes** (MANDATORY):
```markdown
## Playwright Testing

**See**: `PLAYWRIGHT_TESTING_GUIDE.md` section "For Plan Writers"

**Required in every frontend plan**:
1. Manual browser verification workflow (BEFORE Playwright)
2. Console error inspection commands
3. Exit criteria (when to stop iterating)
4. Test file template with `createDataVerifier()`
5. Iteration loop with console error checking

**Copy the "Mandatory Plan Template" from PLAYWRIGHT_TESTING_GUIDE.md into your plan.**

DO NOT write custom testing sections - use the standardized template from the guide.
```

### 7. Embed Orchestrator (MANDATORY TOP OF PLAN)
Every plan MUST start with this exact header (fill in placeholders):
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

---

# Implementation Plan

[Plan sections follow below...]
```

**Template Structure:**
1. Orchestrator header (above) at top
2. Current state documentation
3. Implementation pseudocode
4. Testing requirements

### 8. Commit Plan & Handoff
```bash
git add [PLAN].md
git commit -m "Add implementation plan"
git push -u origin feature/[name]
```

**Final response:**
```
The plan is ready with embedded PR orchestrator.

When done, return this prompt to the user: "Execute @/home/theseus/alexandria/daopad-[FEATURE]/src/daopad/[PLAN].md"

The implementing agent MUST:
1. Read the orchestrator header (cannot skip - it's at the top)
2. Verify worktree isolation
3. Implement the plan
4. Create PR (mandatory step)
5. Iterate autonomously until approved
```
Then STOP. Do not implement.

## Refactoring Rules

**DO:**
- Delete dead code first
- Fix in place (modify existing files)
- Consolidate duplicates (N→1)
- Target negative LOC

**DON'T:**
- Build new infrastructure alongside old
- Create utilities without adoption
- Add "Phase 1 foundations"
- Create more files than deleted

## DAOPad-Specific

**After Rust changes:**
```bash
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
```

**After backend deploy:**
```bash
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
```

## Plan Checklist

- [ ] Worktree created first
- [ ] Orchestrator header EMBEDDED at top of plan (not referenced)
- [ ] Current state documented
- [ ] Implementation in pseudocode
- [ ] Testing strategy defined
- [ ] Plan committed to feature branch
- [ ] Handoff command provided with PR creation reminder

## Critical Reminders

- **Test, don't guess**: Always verify with dfx first
- **Plan in worktree**: Never pollute main repo
- **Use pseudocode**: Implementer writes real code
- **One responsibility**: You plan, they implement
- **Isolation mandatory**: Multiple agents work in parallel