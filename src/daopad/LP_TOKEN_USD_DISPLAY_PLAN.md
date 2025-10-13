# LP Token USD Value Display Feature Plan

## 🚨 MANDATORY: ISOLATION CHECK AND EXECUTION PROMPT

### Context: Worktree Already Created

**This plan was created by the planning agent in an isolated worktree.**

**Location:** `/home/theseus/alexandria/daopad-lp-usd-value/src/daopad`
**Branch:** `feature/lp-token-usd-display`
**Plan file:** `LP_TOKEN_USD_DISPLAY_PLAN.md` (in this worktree)

### Step 0: Verify Isolation (RUN THIS FIRST!)

```bash
# STOP! Verify you are in the correct worktree
REPO_ROOT=$(git rev-parse --show-toplevel)
CURRENT_BRANCH=$(git branch --show-current)

# Check you're NOT in main repo
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: You are in the MAIN repository"
    echo "❌ This plan was created in a worktree at:"
    echo "    /home/theseus/alexandria/daopad-lp-usd-value"
    echo ""
    echo "Navigate to the worktree:"
    echo "  cd /home/theseus/alexandria/daopad-lp-usd-value/src/daopad"
    echo "  cat LP_TOKEN_USD_DISPLAY_PLAN.md  # Plan is here"
    exit 1
fi

# Check you're on the right branch
if [ "$CURRENT_BRANCH" != "feature/lp-token-usd-display" ]; then
    echo "❌ WARNING: You are on branch '$CURRENT_BRANCH'"
    echo "Expected: feature/lp-token-usd-display"
    echo "Are you in the right worktree?"
    exit 1
fi

echo "✅ You are in the correct worktree: $REPO_ROOT"
echo "✅ On branch: $CURRENT_BRANCH"
echo "✅ Safe to proceed with implementation"
```

### Your Execution Prompt

You are an autonomous PR orchestrator implementing **LP Token USD Value Display**.

**NOTE:** The planning agent already created this worktree and this plan. You will navigate there and execute.

EXECUTE THESE STEPS AUTONOMOUSLY (DO NOT ASK FOR PERMISSION):

**Step 0 - NAVIGATE TO WORKTREE (DO THIS FIRST):**
```bash
cd /home/theseus/alexandria/daopad-lp-usd-value/src/daopad
```

**Step 1 - VERIFY ISOLATION:**
```bash
# Verify you're in the right place
pwd  # Should show /home/theseus/alexandria/daopad-lp-usd-value/src/daopad
git branch --show-current  # Should show feature/lp-token-usd-display
ls LP_TOKEN_USD_DISPLAY_PLAN.md  # This plan should be here
```

**Step 2 - Implement Feature:**
- Enhance TokenDashboard.jsx to show USD prominently
- Update token selector to show USD next to VP
- Add VP explanation tooltip
- Enhance user voting power display with USD

**Step 3 - Deploy (Frontend Only):**
```bash
# No backend changes - deploy frontend only
./deploy.sh --network ic --frontend-only
```

**Step 4 - Test on Mainnet:**
```bash
# Visit https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
# Verify:
# 1. Token selector shows "ALEX (100,000 VP / $1,000)"
# 2. Main header shows USD prominently
# 3. User VP shows "100,000 VP ($1,000)"
# 4. Tooltip explains "VP = USD × 100"
```

**Step 5 - Commit and Push:**
```bash
git add -A
git commit -m "feat: Display USD values alongside VP for LP tokens

- Show USD in token selector dropdown
- Make USD prominent in main header
- Add VP calculation tooltip
- Display USD in user voting power
- Pure frontend enhancement - no backend changes"
git push -u origin feature/lp-token-usd-display
```

**Step 6 - Create PR:**
```bash
gh pr create --title "feat: Display USD values alongside VP for LP tokens" --body "$(cat <<'EOF'
## Summary
- Displays USD values alongside Voting Power (VP) throughout the UI
- Helps users understand VP = USD × 100 relationship
- No backend changes required - all data already available

## Changes
- Enhanced token selector to show USD values
- Made USD display more prominent in header
- Added tooltip explaining VP calculation
- Updated user VP displays to show USD equivalent

## Test Plan
- [x] Token selector shows VP and USD
- [x] Main header prominently displays USD value
- [x] User VP shows USD equivalent
- [x] Tooltip explains VP = USD × 100
- [x] Tested on mainnet at https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**YOUR CRITICAL RULES:**
- You MUST work in /home/theseus/alexandria/daopad-lp-usd-value/src/daopad (NOT main repo)
- Other agents ARE working in parallel - isolation is MANDATORY
- After sleep: IMMEDIATELY continue (no "should I check?" questions)
- Frontend-only changes - no backend modifications
- ONLY STOP when: approved or critical error

**START NOW with Step 0.**

---

## 📋 Current State Analysis

### Problem Statement

Users see "Voting Power" (VP) numbers like "100,000 VP" but don't understand:
1. What USD value this represents
2. The relationship: **VP = USD Value × 100**
3. Which LP positions contribute to their voting power
4. How much their LP tokens are actually worth

### Current Implementation

#### Backend (Already Complete - No Changes Needed)

**File:** `daopad_backend/src/kong_locker/voting.rs`
- **Lines 18-59**: `calculate_voting_power_for_token()` already queries KongSwap's `user_balances`
- Returns `UserBalancesReply::LP(LPReply)` containing:
  - `usd_balance` (f64) - Total USD value of entire LP position
  - `usd_amount_0` (f64) - USD value of token 0 side
  - `usd_amount_1` (f64) - USD value of token 1 side
- **Line 58**: Calculates VP = `(total_usd_value * 100.0) as u64`

**File:** `daopad_backend/src/types/kong_locker.rs`
- **Lines 8-26**: `LPReply` struct contains all USD fields
- Data is already available on every query

#### Frontend (Partial Implementation - Needs Enhancement)

**File:** `daopad_frontend/src/services/kongLockerService.js`
- **Lines 140-163**: `getLPPositions()` fetches LP data from KongSwap
- **Lines 165-176**: `calculateVotingPower()` implements VP = USD × 100
- **Line 148**: Extracts `reply.LP` which contains `usd_balance`

**File:** `daopad_frontend/src/components/TokenTabs.jsx`
- **Lines 58-79**: Fetches LP positions and calculates per-token voting power
- **Line 76**: Implements `Math.floor(totalUsdValue * 100)` - VP calculation
- **Line 205-208**: Passes filtered `lpPositions` to TokenDashboard
- Data is available but not prominently displayed

**File:** `daopad_frontend/src/components/TokenDashboard.jsx`
- **Line 281-288**: `formatUsdValue()` function exists ✓
- **Line 290-292**: `totalUsdValue` calculation exists ✓
- **Line 384**: Shows VP as "100,000" (prominent)
- **Line 386**: Shows USD as "$1,000 LP Value" (small, muted text) ❌
- **Line 349**: Token selector shows VP but NOT USD ❌
- **Line 551**: User VP shows "100,000 VP" but NOT USD ❌

### What's Working

✅ Backend queries KongSwap and returns USD values
✅ Frontend fetches LP positions with USD data
✅ VP calculation (USD × 100) is implemented
✅ USD value is displayed in one place (line 386)
✅ `formatUsdValue()` utility function exists

### What's Missing

❌ USD not shown in token selector dropdown (line 349)
❌ USD display is small/muted in main header (line 386)
❌ User voting power doesn't show USD equivalent (line 551)
❌ No explanation that VP = USD × 100
❌ No visual prominence for USD values

### File Structure

```
daopad_frontend/src/
├── components/
│   ├── TokenDashboard.jsx (WILL MODIFY - Lines 349, 384-386, 551)
│   └── TokenTabs.jsx (unchanged - already passes lpPositions)
├── services/
│   └── kongLockerService.js (unchanged - already has USD data)
└── ui/
    └── tooltip.jsx (WILL USE - for VP explanation)

# NO backend changes needed
daopad_backend/
└── src/
    └── kong_locker/
        └── voting.rs (unchanged - already provides USD data)
```

---

## 🎯 Implementation Plan

### Overview

This is a **FRONTEND-ONLY** feature. All USD data already exists in the `lpPositions` array passed to TokenDashboard. We just need to display it prominently.

### Changes Required

1. **Token Selector Enhancement** (TokenDashboard.jsx:349)
2. **Main Header USD Prominence** (TokenDashboard.jsx:384-386)
3. **User VP Display with USD** (TokenDashboard.jsx:551)
4. **VP Explanation Tooltip** (New component/inline)

---

## 📝 Detailed Implementation (Pseudocode)

### File 1: `daopad_frontend/src/components/TokenDashboard.jsx` (MODIFY)

#### Change 1: Token Selector with USD (Line 343-355)

**Before:**
```javascript
<SelectItem key={t.canister_id} value={index.toString()}>
  <div className="flex items-center justify-between gap-2 w-full">
    <span>{t.symbol}</span>
    <span className="text-xs text-muted-foreground">
      {((tokenVotingPowers && tokenVotingPowers[t.canister_id]) || 0).toLocaleString()} VP
    </span>
  </div>
</SelectItem>
```

**After (PSEUDOCODE):**
```javascript
<SelectItem key={t.canister_id} value={index.toString()}>
  <div className="flex items-center justify-between gap-2 w-full">
    <span>{t.symbol}</span>
    <div className="flex flex-col items-end">
      <span className="text-xs font-mono">
        {((tokenVotingPowers && tokenVotingPowers[t.canister_id]) || 0).toLocaleString()} VP
      </span>
      <span className="text-xs text-muted-foreground">
        {/* Calculate USD for this token from lpPositions */}
        {(() => {
          // Filter positions for this token
          const tokenPositions = lpPositions.filter(pos =>
            pos.address_0 === t.canister_id || pos.address_1 === t.canister_id
          );
          // Sum USD values
          const tokenUsdValue = tokenPositions.reduce((sum, pos) =>
            sum + (pos.usd_balance || 0), 0
          );
          return formatUsdValue(tokenUsdValue);
        })()}
      </span>
    </div>
  </div>
</SelectItem>
```

**Key Points:**
- Shows both VP and USD for each token in dropdown
- Uses existing `lpPositions` data (no new queries)
- Uses existing `formatUsdValue()` function
- Maintains monospace font for numbers

#### Change 2: Main Header - Prominent USD Display (Line 382-394)

**Before:**
```javascript
{/* Voting Power */}
<div className="text-right flex-shrink-0">
  <div className="text-2xl font-mono font-bold">{votingPower.toLocaleString()}</div>
  <div className="text-xs text-muted-foreground">Voting Power</div>
  <div className="text-sm text-muted-foreground">{formatUsdValue(totalUsdValue)} LP Value</div>
  {orbitStation && daoStatus && (
    // DAO status badges
  )}
</div>
```

**After (PSEUDOCODE):**
```javascript
{/* Voting Power with Prominent USD */}
<div className="text-right flex-shrink-0">
  {/* Primary: USD Value */}
  <div className="text-2xl font-bold text-green-600">
    {formatUsdValue(totalUsdValue)}
  </div>
  <div className="text-xs text-muted-foreground">LP Value</div>

  {/* Secondary: VP with tooltip */}
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="text-lg font-mono cursor-help border-b border-dotted border-muted-foreground">
          {votingPower.toLocaleString()} VP
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Voting Power = USD Value × 100</p>
        <p className="text-xs text-muted-foreground">
          ${(votingPower / 100).toLocaleString()} × 100 = {votingPower.toLocaleString()} VP
        </p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>

  {orbitStation && daoStatus && (
    // DAO status badges (unchanged)
  )}
</div>
```

**Key Points:**
- USD is now PRIMARY (larger, prominent)
- VP is SECONDARY with tooltip explanation
- Tooltip explains VP = USD × 100 with example
- Uses existing Tooltip components from shadcn/ui
- Dotted underline indicates hover for more info

#### Change 3: User VP Display with USD (Line 546-562)

**Before:**
```javascript
{loadingVP ? (
  <div className="text-muted-foreground">Loading voting power...</div>
) : userVotingPower !== null ? (
  <div className="space-y-2">
    <div className={userVotingPower >= 10000 ? 'text-green-600' : 'text-red-600'}>
      Your voting power: <strong>{userVotingPower.toLocaleString()} VP</strong>
    </div>
    {userVotingPower < 10000 && (
      <Badge variant="destructive">
        Need {(10000 - userVotingPower).toLocaleString()} more VP
      </Badge>
    )}
    <div className="text-xs text-muted-foreground">
      Minimum 10,000 VP required to propose station linking
    </div>
  </div>
) : null}
```

**After (PSEUDOCODE):**
```javascript
{loadingVP ? (
  <div className="text-muted-foreground">Loading voting power...</div>
) : userVotingPower !== null ? (
  <div className="space-y-2">
    {/* Show VP with USD equivalent */}
    <div className={userVotingPower >= 10000 ? 'text-green-600' : 'text-red-600'}>
      Your voting power: <strong>{userVotingPower.toLocaleString()} VP</strong>
      <span className="text-sm ml-2">
        ({formatUsdValue(userVotingPower / 100)})
      </span>
    </div>

    {/* If insufficient VP, show USD needed too */}
    {userVotingPower < 10000 && (
      <div className="space-y-1">
        <Badge variant="destructive">
          Need {(10000 - userVotingPower).toLocaleString()} more VP
        </Badge>
        <div className="text-xs text-muted-foreground">
          That's {formatUsdValue((10000 - userVotingPower) / 100)} more LP value needed
        </div>
      </div>
    )}

    {/* Explanation text */}
    <div className="text-xs text-muted-foreground">
      Minimum 10,000 VP ({formatUsdValue(100)}) required to propose station linking
    </div>
  </div>
) : null}
```

**Key Points:**
- Shows both VP and USD for user's voting power
- When showing "need X more VP", also shows USD equivalent
- Makes minimum requirement clearer ($100 USD)
- Uses existing `userVotingPower` state (no new queries)

#### Change 4: Vote Button Display (Line 514-525)

**Before:**
```javascript
<Button
  onClick={() => handleVote(true)}
  disabled={voting}
  className="flex-1 bg-green-600 hover:bg-green-700"
>
  {voting ? 'Voting...' : `Vote Yes (${userVotingPower?.toLocaleString()} VP)`}
</Button>
```

**After (PSEUDOCODE):**
```javascript
<Button
  onClick={() => handleVote(true)}
  disabled={voting}
  className="flex-1 bg-green-600 hover:bg-green-700"
>
  {voting ? 'Voting...' : (
    <span>
      Vote Yes ({userVotingPower?.toLocaleString()} VP / {formatUsdValue((userVotingPower || 0) / 100)})
    </span>
  )}
</Button>
```

**Key Points:**
- Vote buttons show both VP and USD
- Helps users understand weight of their vote
- Same pattern for "Vote No" button

---

## 🧪 Testing Strategy

### Type Discovery (Not Needed)
**Reason:** All types already exist. No backend changes. Using existing `lpPositions` data.

### Build and Deploy Process

```bash
# Since this is FRONTEND-ONLY, no backend build needed

# Deploy frontend only
cd /home/theseus/alexandria/daopad-lp-usd-value/src/daopad
./deploy.sh --network ic --frontend-only

# Verify deployment
echo "Frontend deployed to: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io"
```

### Manual Testing on Mainnet

**Test URL:** https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io

#### Test Case 1: Token Selector Shows USD
1. Navigate to DAOPad UI
2. Open token selector dropdown
3. **Verify:** Each token shows VP and USD on two lines
4. **Example:** "ALEX" shows "100,000 VP" and "$1,000.00"

#### Test Case 2: Main Header - Prominent USD
1. Select any token
2. Look at top-right header section
3. **Verify:**
   - USD value is large (text-2xl) and green
   - VP is smaller (text-lg) with dotted underline
   - Hovering VP shows tooltip
4. **Tooltip should say:** "Voting Power = USD Value × 100"

#### Test Case 3: User VP Shows USD
1. In propose/vote section, check your voting power
2. **Verify:** Shows "Your voting power: 100,000 VP ($1,000.00)"
3. If VP < 10,000:
   - **Verify:** Shows "Need X more VP" AND "That's $X more LP value needed"
   - **Verify:** Minimum requirement shows "(100.00)"

#### Test Case 4: Vote Buttons Show USD
1. On active proposal
2. Check vote button text
3. **Verify:** "Vote Yes (100,000 VP / $1,000.00)"

#### Test Case 5: Responsive Layout
1. Resize browser window
2. **Verify:** USD displays don't break layout
3. **Verify:** Tooltip still works on mobile

#### Test Case 6: Zero Balances
1. Test with user who has 0 VP
2. **Verify:** Shows "$0.00" not "NaN" or "undefined"

#### Test Case 7: Large Numbers
1. Test with user who has high VP (e.g., 1,000,000 VP)
2. **Verify:** Shows "$10,000.00" with proper comma formatting
3. **Verify:** No overflow in layouts

### Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| No LP positions | Shows "$0.00" and "0 VP" |
| Loading state | Shows skeleton/spinner (existing) |
| lpPositions undefined | Gracefully shows $0.00 |
| Multiple tokens | Each shows correct USD for its positions |
| Tooltip on mobile | Tap to show (mobile-friendly) |

---

## 📊 Scope Estimate

### Files Modified

**Modified files:** 1
- `daopad_frontend/src/components/TokenDashboard.jsx`

**New files:** 0 (using existing components)

**Backend changes:** 0 (all data already available)

### Lines of Code

- **Frontend modifications:** ~60 lines
  - Token selector: ~15 lines (add USD display)
  - Main header: ~20 lines (enhance USD prominence + tooltip)
  - User VP: ~15 lines (add USD equivalent)
  - Vote buttons: ~10 lines (add USD to buttons)
- **Net:** +60 lines (mostly display logic)

### Complexity

- **Low:** Pure display enhancements using existing data
- **Medium:** Tooltip integration, responsive layout
- **High:** None

### Time Estimate

- Implementation: 1-2 hours
- Testing on mainnet: 30 minutes
- Review iteration: 15-30 minutes
- **Total:** 2-3 hours

---

## 🔑 Critical Implementation Notes

### 🚨 ISOLATION IS MANDATORY

**The implementing agent MUST work in an isolated worktree because:**
- Other agents are working in parallel in the main repo
- File changes from other agents will corrupt your work
- Git operations by other agents will change your files
- The orchestrator prompt above ENFORCES this with exit checks

### No Backend Changes Needed

**Key Principle:** All USD data already exists in `lpPositions` array.

```javascript
// lpPositions is already available in TokenDashboard props
// Each position has:
lpPosition.usd_balance      // Total USD value (what we need!)
lpPosition.usd_amount_0     // USD value of token 0
lpPosition.usd_amount_1     // USD value of token 1
```

**Don't:**
- ❌ Add new backend endpoints
- ❌ Modify Rust code
- ❌ Run candid-extractor
- ❌ Deploy backend

**Do:**
- ✅ Use existing `lpPositions` prop
- ✅ Use existing `formatUsdValue()` function
- ✅ Use existing `totalUsdValue` calculation
- ✅ Deploy frontend only

### Use Existing Components

**Already available:**
```javascript
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
```

**Don't create new components.** TokenDashboard already imports these.

### Responsive Layout

**Test on both desktop and mobile:**
- Token selector: USD should fit in dropdown width
- Main header: USD shouldn't break flex layout
- Tooltips: Should work on touch devices

### Number Formatting

**Always use existing `formatUsdValue()`:**
```javascript
// Line 281-288 already defines this
const formatUsdValue = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};
```

**Don't reinvent number formatting.**

### LP Positions Filtering

**Pattern already exists** (TokenTabs.jsx:205-208):
```javascript
lpPositions={userLPPositions.filter(pos =>
  pos.address_0 === tokens[activeTab].canister_id ||
  pos.address_1 === tokens[activeTab].canister_id
)}
```

**Use this same pattern when calculating USD per token.**

---

## ✅ Success Criteria

### Must Have

- [x] Token selector dropdown shows VP and USD for each token
- [x] Main header displays USD prominently (larger than VP)
- [x] VP has tooltip explaining "VP = USD × 100"
- [x] User voting power shows VP and USD equivalent
- [x] Minimum VP requirement shows USD equivalent ($100)
- [x] Vote buttons show VP and USD
- [x] All number formatting uses `formatUsdValue()`
- [x] No layout breakage on mobile/desktop
- [x] Works with zero balances (shows $0.00)

### Nice to Have (Future Enhancements)

- [ ] LP positions breakdown table showing each position
- [ ] Historical USD value chart
- [ ] USD value change indicators (+/- since last check)
- [ ] Export LP positions with USD values

---

## 🚀 Deployment Steps

### Pre-Deployment Checklist

- [ ] All changes in `TokenDashboard.jsx` only
- [ ] No backend modifications
- [ ] Tested locally if possible (though mainnet is primary)
- [ ] Verified isolation (in worktree, not main repo)

### Deployment Commands

```bash
# From worktree directory
cd /home/theseus/alexandria/daopad-lp-usd-value/src/daopad

# Verify you're in the right place
pwd  # Should show daopad-lp-usd-value
git branch --show-current  # Should show feature/lp-token-usd-display

# Deploy frontend only (no backend changes)
./deploy.sh --network ic --frontend-only

# Verify deployment
echo "✅ Frontend deployed to: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io"
```

### Post-Deployment Verification

```bash
# Test on mainnet
open https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io

# Manual checklist:
# 1. Token selector shows USD ✓
# 2. Main header USD prominent ✓
# 3. Tooltip works on VP ✓
# 4. User VP shows USD ✓
# 5. Vote buttons show USD ✓
# 6. No console errors ✓
```

---

## 📚 Reference Documentation

### Related Files (Read-Only)

```
daopad_frontend/src/
├── services/kongLockerService.js
│   └── Lines 140-163: getLPPositions() - where USD data comes from
├── components/TokenTabs.jsx
│   └── Lines 58-79: Per-token VP calculation (already working)
└── components/ui/tooltip.jsx
    └── Tooltip component from shadcn/ui

daopad_backend/src/
└── kong_locker/voting.rs
    └── Lines 18-59: Backend VP calculation (reference only)
```

### Key Data Structures

**lpPositions (already available):**
```javascript
[
  {
    name: "ALEX/ICP",
    symbol: "ALEX/ICP",
    lp_token_id: 1,
    balance: 100.0,
    usd_balance: 1000.0,          // ← THIS IS WHAT WE DISPLAY
    chain_0: "IC",
    symbol_0: "ALEX",
    address_0: "ysy5f-2qaaa-aaaap-qkmmq-cai",
    amount_0: 500.0,
    usd_amount_0: 500.0,          // ← Also useful for breakdown
    chain_1: "IC",
    symbol_1: "ICP",
    address_1: "ryjl3-tyaaa-aaaaa-aaaba-cai",
    amount_1: 50.0,
    usd_amount_1: 500.0,          // ← Also useful for breakdown
    ts: 1234567890
  }
]
```

**Voting Power Calculation:**
```javascript
VP = usd_balance * 100

// Example:
// usd_balance = 1000.0
// VP = 1000.0 * 100 = 100,000
```

---

## 🎓 Implementation Philosophy

### Why Frontend-Only?

1. **Data Already Available:** KongSwap's `user_balances` returns USD values
2. **Backend Already Queries:** `calculate_voting_power_for_token()` uses `usd_balance`
3. **Frontend Already Has It:** `lpPositions` prop contains full LP data
4. **Pure Display Problem:** We just need to show what we already have

### Why No LP Positions Table (Yet)?

- Keep this PR focused and small
- USD display in existing locations is sufficient
- Breakdown table is nice-to-have for future PR
- Minimize risk and review surface area

### Why Tooltip for VP Explanation?

- Non-intrusive (doesn't clutter UI)
- Discoverable (dotted underline hints)
- Educational (explains formula with example)
- Standard UX pattern (hover for more info)

---

## 🛑 What NOT to Do

### Don't Modify Backend

❌ **Don't** add new Rust functions
❌ **Don't** modify `voting.rs` or `kong_locker.rs`
❌ **Don't** run `cargo build` or `candid-extractor`
❌ **Don't** deploy backend

**Why?** All USD data already flows to frontend. Backend is complete.

### Don't Create New Components

❌ **Don't** create new tooltip components
❌ **Don't** create new number formatting utilities
❌ **Don't** create new USD display components

**Why?** All components already exist in shadcn/ui and utils.

### Don't Add Complex Logic

❌ **Don't** add USD caching
❌ **Don't** add USD update polling
❌ **Don't** add historical USD tracking

**Why?** Keep it simple. Those are future enhancements.

### Don't Over-Engineer

❌ **Don't** add USD conversion to other currencies
❌ **Don't** add USD formatting preferences
❌ **Don't** add USD display settings

**Why?** USD from KongSwap is authoritative. No conversion needed.

---

## 📝 Commit Message Template

```
feat: Display USD values alongside VP for LP tokens

Problem:
- Users see "100,000 VP" but don't know what USD value it represents
- VP calculation (USD × 100) is not explained anywhere
- LP token value is shown only as small muted text

Solution:
- Show USD prominently in main header (larger than VP)
- Add VP tooltip explaining "VP = USD Value × 100"
- Display USD in token selector dropdown
- Show USD equivalent in user voting power
- Display USD in vote button labels

Implementation:
- Modified TokenDashboard.jsx only (frontend-only change)
- Uses existing lpPositions data (no new backend queries)
- Uses existing formatUsdValue() utility
- Uses shadcn/ui Tooltip component

Testing:
- Verified token selector shows VP and USD
- Verified main header displays USD prominently
- Verified VP tooltip explains calculation
- Verified user VP shows USD equivalent
- Verified vote buttons show USD
- Tested on mainnet at https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 🔄 Future Enhancements (Not in This PR)

### LP Positions Breakdown Table

**Location:** New tab in TokenDashboard
**Shows:**
- Each LP position (e.g., "ALEX/ICP")
- USD value of each side
- Total position USD value
- VP contribution (position USD × 100)

**Why Later:** Keeps this PR focused on core USD display

### Historical USD Tracking

**Feature:** Show USD value changes over time
**Requires:** Backend storage or external API
**Complexity:** Medium

### USD Value Alerts

**Feature:** Notify when LP value drops/rises significantly
**Requires:** Polling and notification system
**Complexity:** High

---

## ✅ Checklist for Complete Implementation

Before marking this PR as ready:

- [ ] **Isolation verified** - Working in worktree, not main repo
- [ ] **Token selector** - Shows VP and USD for each token
- [ ] **Main header** - USD is prominent (text-2xl, green)
- [ ] **VP tooltip** - Explains "VP = USD × 100" with example
- [ ] **User VP display** - Shows VP and USD equivalent
- [ ] **Minimum VP** - Shows USD equivalent ($100)
- [ ] **Vote buttons** - Show VP and USD
- [ ] **Number formatting** - Uses `formatUsdValue()` everywhere
- [ ] **Zero balances** - Shows $0.00 correctly
- [ ] **Large numbers** - Formatted with commas
- [ ] **Responsive** - Works on mobile and desktop
- [ ] **No console errors** - Clean browser console
- [ ] **Frontend deployed** - Using `./deploy.sh --network ic --frontend-only`
- [ ] **Tested on mainnet** - All test cases pass
- [ ] **Git committed** - Using proper commit message template
- [ ] **PR created** - With detailed description

---

## 🎯 Key Takeaways for Implementing Agent

1. **This is FRONTEND-ONLY** - Do not touch backend code
2. **Data already exists** - Use `lpPositions` prop in TokenDashboard
3. **Modify ONE file** - `TokenDashboard.jsx` only
4. **Use existing utilities** - `formatUsdValue()`, Tooltip component
5. **Test on mainnet** - Deploy with `--frontend-only` flag
6. **Work in worktree** - Isolation is mandatory

---

## 📞 Support and Questions

If blocked or uncertain:
1. Re-read "Current State Analysis" section
2. Check that `lpPositions` contains `usd_balance` field
3. Verify `formatUsdValue()` function exists (line 281)
4. Confirm Tooltip component is imported
5. Review pseudocode in "Detailed Implementation" section

**This is a straightforward display enhancement.** All the hard work (querying KongSwap, calculating VP) is already done. We're just making USD values visible to users.

---

**END OF PLAN**

**Reminder:** You are the PLANNING agent. Your job is done. Do NOT implement this feature. Hand off to implementing agent with the command below.
