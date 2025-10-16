# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-vp-percentage/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-vp-percentage/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes:
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "feat: Display ownership percentage next to LP dollar value"
   git push -u origin feature/vp-percentage-display
   gh pr create --title "[Feature]: Display ownership percentage next to LP dollar value" --body "Implements PLAN-vp-percentage-display.md"
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

**Branch:** `feature/vp-percentage-display`
**Worktree:** `/home/theseus/alexandria/daopad-vp-percentage/src/daopad`

---

# Implementation Plan: VP Percentage Display Enhancement

## Current State

### File Structure
```
daopad_frontend/src/
├── components/
│   └── TokenDashboard.jsx (MODIFY)
├── routes/
│   └── AppRoute.jsx (no changes)
└── index.html (no changes - browser title only)
```

### Current Implementation

**File:** `daopad_frontend/src/components/TokenDashboard.jsx`

**Lines 321-326:** VP percentage calculation
```javascript
const vpPercentage = useMemo(() => {
  if (!votingPower || !totalVotingPower || totalVotingPower === 0) {
    return null;
  }
  return ((votingPower / totalVotingPower) * 100).toFixed(2);
}, [votingPower, totalVotingPower]);
```

**Lines 436-480:** Current header display structure
```jsx
{/* Voting Power with Prominent USD */}
<div className="text-right flex-shrink-0">
  {/* Primary: USD Value */}
  <div className="text-2xl font-bold text-green-600">
    {formatUsdValue(totalUsdValue)}
  </div>
  <div className="text-xs text-muted-foreground">LP Value</div>

  {/* Secondary: VP with percentage and tooltip */}
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="space-y-1">
          <div className="text-lg font-mono cursor-help border-b border-dotted border-muted-foreground inline-block">
            {votingPower.toLocaleString()} VP
          </div>
          {vpPercentage && (
            <div className="text-sm text-muted-foreground">
              {vpPercentage}% of total VP
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Voting Power = USD Value × 100</p>
        <p className="text-xs text-muted-foreground">
          ${((votingPower || 0) / VP_TO_USD_RATIO).toLocaleString()} × 100 = {votingPower.toLocaleString()} VP
        </p>
        {totalVotingPower && (
          <p className="text-xs text-muted-foreground mt-1">
            Total network VP: {totalVotingPower.toLocaleString()}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>

  {orbitStation && daoStatus && (
    <div className="mt-2">
      {daoStatus === 'real' && <Badge className="bg-green-100 text-green-800">✓ Decentralized</Badge>}
      {daoStatus === 'pseudo' && <Badge className="bg-yellow-100 text-yellow-800">⚠️ Pseudo-DAO</Badge>}
      {daoStatus === 'invalid' && <Badge className="bg-red-100 text-red-800">✗ Invalid</Badge>}
    </div>
  )}
</div>
```

### User Requirements

1. ~~Remove "Token Governance" text~~ (Note: This text doesn't exist in UI - only in browser title at `index.html:7`. No action needed.)
2. Display ownership percentage next to the dollar LP value
3. Format: "$10,131.06 (12.5% ownership)"
4. Keep percentage calculation logic unchanged

## Implementation

### File: `daopad_frontend/src/components/TokenDashboard.jsx` (MODIFY)

**Location:** Lines 436-480

**Change:** Move percentage display from below VP to next to dollar value

```jsx
{/* Voting Power with Prominent USD */}
<div className="text-right flex-shrink-0">
  {/* Primary: USD Value with Ownership Percentage */}
  <div className="flex flex-col items-end gap-1">
    <div className="text-2xl font-bold text-green-600">
      {formatUsdValue(totalUsdValue)}
      {vpPercentage && (
        <span className="text-base font-normal text-muted-foreground ml-2">
          ({vpPercentage}%)
        </span>
      )}
    </div>
    <div className="text-xs text-muted-foreground">
      LP Value
      {vpPercentage && (
        <span className="ml-1">• {vpPercentage}% ownership</span>
      )}
    </div>
  </div>

  {/* Secondary: VP with tooltip */}
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="mt-2">
          <div className="text-lg font-mono cursor-help border-b border-dotted border-muted-foreground inline-block">
            {votingPower.toLocaleString()} VP
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Voting Power = USD Value × 100</p>
        <p className="text-xs text-muted-foreground">
          ${((votingPower || 0) / VP_TO_USD_RATIO).toLocaleString()} × 100 = {votingPower.toLocaleString()} VP
        </p>
        {totalVotingPower && (
          <p className="text-xs text-muted-foreground mt-1">
            Total network VP: {totalVotingPower.toLocaleString()}
          </p>
        )}
        {vpPercentage && (
          <p className="text-xs text-muted-foreground mt-1">
            Your ownership: {vpPercentage}% of total
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>

  {orbitStation && daoStatus && (
    <div className="mt-2">
      {daoStatus === 'real' && <Badge className="bg-green-100 text-green-800">✓ Decentralized</Badge>}
      {daoStatus === 'pseudo' && <Badge className="bg-yellow-100 text-yellow-800">⚠️ Pseudo-DAO</Badge>}
      {daoStatus === 'invalid' && <Badge className="bg-red-100 text-red-800">✗ Invalid</Badge>}
    </div>
  )}
</div>
```

**Key Changes:**
1. Move percentage from below VP to next to dollar value
2. Display format: "$10,131.06 (12.5%)" inline
3. Add secondary label: "LP Value • 12.5% ownership"
4. Keep VP display clean without percentage below it
5. Add ownership percentage to tooltip for additional context

## Testing

### Manual Testing
```bash
# 1. Build frontend
cd /home/theseus/alexandria/daopad-vp-percentage/src/daopad
npm run build

# 2. Deploy to mainnet
./deploy.sh --network ic --frontend-only

# 3. Visual verification (browser)
# Open: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
# Navigate to /app and login
# Verify:
#   - Dollar value shows percentage inline: "$10,131.06 (12.5%)"
#   - LP Value label shows: "LP Value • 12.5% ownership"
#   - VP number is clean without percentage below it
#   - Tooltip still shows ownership percentage
#   - No "Token Governance" text visible (it was never there)
```

### Expected Output
```
Before:
$10,131.06
LP Value
1,013,106 VP
12.5% of total VP
⚠️ Pseudo-DAO

After:
$10,131.06 (12.5%)
LP Value • 12.5% ownership
1,013,106 VP
⚠️ Pseudo-DAO
```

### Edge Cases
1. **No voting power:** Percentage should not display (already handled by `{vpPercentage && ...}`)
2. **Total VP is 0:** Calculation returns null, no display (already handled in useMemo)
3. **Very small percentages:** Format shows 2 decimal places (e.g., "0.05%")
4. **100% ownership:** Shows "100.00%"

## Implementation Checklist

- [ ] Worktree created at `/home/theseus/alexandria/daopad-vp-percentage/src/daopad`
- [ ] Isolation verified (not in main repo)
- [ ] Modified `TokenDashboard.jsx` lines 436-480
- [ ] Removed percentage from below VP display
- [ ] Added percentage next to dollar value
- [ ] Added percentage to LP Value label
- [ ] Preserved tooltip with ownership info
- [ ] Built frontend: `npm run build`
- [ ] Deployed to mainnet: `./deploy.sh --network ic --frontend-only`
- [ ] Visual verification in browser
- [ ] Committed changes with proper message
- [ ] Created PR with title and body
- [ ] PR URL returned to user

## Notes

1. **"Token Governance" removal:** This text only exists in `index.html:7` as the browser tab title. It's not visible UI text and doesn't take up whitespace. No changes needed.

2. **Calculation logic unchanged:** The `vpPercentage` calculation at lines 321-326 remains exactly the same.

3. **Total VP requirement:** The percentage calculation depends on `totalVotingPower` being loaded via `loadTotalVotingPower()` (lines 124-140). This is already working correctly.

4. **Frontend-only change:** No backend changes required. No candid extraction needed.

5. **Deployment:** Use `--frontend-only` flag to skip backend deployment.
