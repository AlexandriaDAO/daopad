# Plan-Pursuit Methodology (Condensed)

**Purpose:** Transform feature requests into exhaustive implementation plans for autonomous execution.

## Task Classification

**NEW FEATURE**: Build new functionality → additive approach
**REFACTORING**: Improve existing code → subtractive + targeted fixes
**BUG FIX**: Restore broken behavior → minimal changes

## Workflow Steps

### 0. Create Worktree (MANDATORY FIRST STEP)
```bash
cd /home/theseus/alexandria/daopad
git worktree add ../daopad-[FEATURE] -b feature/[feature-name] master
cd ../daopad-[FEATURE]/src/daopad
```
All planning happens IN the worktree, not main repo.

### 1. Research (30-60 min)
```bash
# Find all related files
rg "keyword" daopad_backend/ daopad_frontend/ --files-with-matches
# Read existing implementations thoroughly
# Test Orbit APIs with dfx before implementing
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai <method> '(args)'
```

### 2. Document Current State
- File tree (before/after)
- Existing implementations with line numbers
- Dependencies and constraints
- For refactoring: list dead code, duplicates, complexity

### 3. Plan Implementation
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

### 4. Testing Requirements
```markdown
## Testing
- Type discovery: dfx canister --network ic call
- Build: cargo build --target wasm32-unknown-unknown
- Candid: candid-extractor (after Rust changes)
- Deploy: ./deploy.sh --network ic
- Sync declarations: cp -r src/declarations/* frontend/src/declarations/
```

### 5. Reference Orchestrator (TOP OF PLAN)
```markdown
## 🚨 EXECUTION

This plan uses: @.claude/prompts/autonomous-pr-orchestrator-condensed.md

**Worktree:** `/home/theseus/alexandria/daopad-[FEATURE]/src/daopad`
**Branch:** `feature/[feature-name]`
**Plan:** This file (`[PLAN].md`)

### For Implementing Agent:
1. Navigate to worktree above
2. Use orchestrator Feature Implementation Prompt
3. Follow plan sections below

[Implementation sections follow...]
```

### 6. Commit Plan & Handoff
```bash
git add [PLAN].md
git commit -m "Add implementation plan"
git push -u origin feature/[name]
```

**Final response:**
```
pursue @/home/theseus/alexandria/daopad-[FEATURE]/src/daopad/[PLAN].md
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
- [ ] Current state documented
- [ ] Implementation in pseudocode
- [ ] Testing strategy defined
- [ ] Orchestrator referenced (not embedded)
- [ ] Plan committed to feature branch
- [ ] Handoff command provided

## Critical Reminders

- **Test, don't guess**: Always verify with dfx first
- **Plan in worktree**: Never pollute main repo
- **Use pseudocode**: Implementer writes real code
- **One responsibility**: You plan, they implement
- **Isolation mandatory**: Multiple agents work in parallel

## Usage Modes

**Recommended (Plan Mode):**
```
/plan
Plan [feature] using @.claude/workflows/plan-pursuit-methodology-condensed.md
```
System enforces no implementation.

**Fallback (Direct):**
```
Plan [feature] using @.claude/workflows/plan-pursuit-methodology-condensed.md
```
Requires agent discipline to not implement.