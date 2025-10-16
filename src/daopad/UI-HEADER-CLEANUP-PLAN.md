# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-ui-header-cleanup/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-ui-header-cleanup/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Backend changes:
     ```bash
     cargo build --target wasm32-unknown-unknown --release -p daopad_backend
     candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
     ./deploy.sh --network ic --backend-only
     cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
     ```
   - Frontend changes:
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "UI: Simplify header and add VP percentage display"
   git push -u origin feature/ui-header-cleanup
   gh pr create --title "UI: Simplify Header and Add VP Percentage Display" --body "Implements UI-HEADER-CLEANUP-PLAN.md"
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

**Branch:** `feature/ui-header-cleanup`
**Worktree:** `/home/theseus/alexandria/daopad-ui-header-cleanup/src/daopad`

---

# UI Header Cleanup and VP Percentage Display

## Problem Statement

### Issue 1: Bloated Main Header
The main app header is too wide and cluttered:
```jsx
<h1>DAOPad</h1>
<p>Token Governance Platform</p>
<p>Create treasuries and vote with your locked liquidity</p>
```

This creates excessive whitespace and makes the header unnecessarily tall. We only need "DAOPad".

### Issue 2: Missing VP Percentage
Current DAO header shows:
```
$10,214.48 LP Value
1,021,447 VP
⚠️ Pseudo-DAO
```

But doesn't show the user's percentage of total voting power (e.g., "23.5% of total VP"). This is important context for governance participation.

## Current State

### File: `daopad_frontend/src/routes/AppRoute.jsx` (Lines 171-176)

```jsx
<div className="space-y-1">
  <h1 className="text-3xl font-display text-executive-ivory tracking-wide">DAOPad</h1>
  <div className="h-px bg-executive-gold w-16"></div>
  <p className="text-executive-lightGray/80 font-serif text-sm uppercase tracking-widest">Token Governance Platform</p>
  <p className="text-xs text-executive-lightGray/60 italic">Create treasuries and vote with your locked liquidity</p>
</div>
```

**Problems:**
- Lines 174-175: Extra text that adds unnecessary height
- Creates too much vertical space in header
- Subtitle text is redundant (obvious from context)

### File: `daopad_frontend/src/components/TokenDashboard.jsx` (Lines 408-439)

```jsx
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
        <div className="text-lg font-mono cursor-help border-b border-dotted border-muted-foreground inline-block">
          {votingPower.toLocaleString()} VP
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Voting Power = USD Value × 100</p>
        <p className="text-xs text-muted-foreground">
          ${((votingPower || 0) / VP_TO_USD_RATIO).toLocaleString()} × 100 = {votingPower.toLocaleString()} VP
        </p>
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

**Missing:**
- No percentage display showing user's VP relative to total VP
- No way to fetch total voting power for the token

### Backend: No Public Method for Total VP

The backend has internal `get_total_voting_power_for_token()` in:
- `daopad_backend/src/proposals/treasury.rs:452`
- `daopad_backend/src/proposals/orbit_requests.rs:421`
- `daopad_backend/src/proposals/orbit_link.rs:317`

But these are NOT exposed as public update/query methods. We need to add one.

## Implementation Plan

### Step 1: Simplify Main Header (Frontend Only)

**File:** `daopad_frontend/src/routes/AppRoute.jsx`

**Change Lines 171-176:**

```jsx
// BEFORE:
<div className="space-y-1">
  <h1 className="text-3xl font-display text-executive-ivory tracking-wide">DAOPad</h1>
  <div className="h-px bg-executive-gold w-16"></div>
  <p className="text-executive-lightGray/80 font-serif text-sm uppercase tracking-widest">Token Governance Platform</p>
  <p className="text-xs text-executive-lightGray/60 italic">Create treasuries and vote with your locked liquidity</p>
</div>

// AFTER:
<div className="space-y-1">
  <h1 className="text-3xl font-display text-executive-ivory tracking-wide">DAOPad</h1>
  <div className="h-px bg-executive-gold w-16"></div>
</div>
```

**Result:** Removes 2 lines of text, reduces header height significantly.

### Step 2: Add Backend Method for Total Voting Power

**File:** `daopad_backend/src/api/governance_config.rs`

Add new public query method:

**PSEUDOCODE:**
```rust
/// Get total voting power for a token across all Kong Locker users
///
/// This sums up the voting power of all registered users for a specific token.
/// Used by frontend to show user's VP as a percentage of total.
#[query]
pub async fn get_total_voting_power_for_token(
    token_canister_id: Principal
) -> Result<u64, String> {
    // Import the calculation function from proposals module
    use crate::kong_locker::voting::calculate_voting_power_for_token;
    use crate::storage::state::KONG_LOCKER_PRINCIPALS;

    // Get all registered Kong Locker principals
    let all_kong_lockers = KONG_LOCKER_PRINCIPALS.with(|principals| {
        principals
            .borrow()
            .iter()
            .map(|(_, locker)| locker.0)
            .collect::<Vec<Principal>>()
    });

    // Calculate total voting power across all registered users
    let mut total_power = 0u64;

    for kong_locker in all_kong_lockers {
        // Get voting power for this specific token
        match calculate_voting_power_for_token(kong_locker, token_canister_id).await {
            Ok(power) => total_power += power,
            Err(_) => continue, // Skip users with errors (e.g., no LP positions)
        }
    }

    Ok(total_power)
}
```

**Update:** `daopad_backend/src/api/mod.rs`

Add export:
```rust
pub use governance_config::{
    // existing exports...
    get_total_voting_power_for_token,
};
```

**Result:** New backend method `get_total_voting_power_for_token` available to frontend.

### Step 3: Add Frontend Service Method

**File:** `daopad_frontend/src/services/daopadBackend.js`

Add method to DAOPadBackendService class (after `getMyVotingPowerForToken`, around line 304):

**PSEUDOCODE:**
```javascript
async getTotalVotingPowerForToken(tokenCanisterId) {
  try {
    const actor = await this.getActor();
    const result = await actor.get_total_voting_power_for_token(tokenCanisterId);
    if ('Ok' in result) {
      return { success: true, data: Number(result.Ok) };
    } else {
      return { success: false, error: result.Err };
    }
  } catch (error) {
    console.error('Failed to get total voting power for token:', error);
    return { success: false, error: error.message };
  }
}
```

**Result:** Frontend can now call `getTotalVotingPowerForToken()`.

### Step 4: Update TokenDashboard to Display VP Percentage

**File:** `daopad_frontend/src/components/TokenDashboard.jsx`

**4A: Add State for Total VP (around line 62)**

```javascript
const [totalVotingPower, setTotalVotingPower] = useState(null);
const [loadingTotalVP, setLoadingTotalVP] = useState(false);
```

**4B: Add Load Function (after `loadVotingPower`, around line 118)**

**PSEUDOCODE:**
```javascript
const loadTotalVotingPower = async () => {
  if (!identity || !token) return;

  setLoadingTotalVP(true);
  try {
    const daopadService = new DAOPadBackendService(identity);
    const tokenPrincipal = Principal.fromText(token.canister_id);
    const result = await daopadService.getTotalVotingPowerForToken(tokenPrincipal);
    if (result.success) {
      setTotalVotingPower(result.data);
    }
  } catch (err) {
    console.error('Failed to load total voting power:', err);
  } finally {
    setLoadingTotalVP(false);
  }
};
```

**4C: Call in useEffect (update line 74)**

```javascript
useEffect(() => {
  loadTokenStatus();
  loadVotingPower();
  loadTokenMetadata();
  loadTotalVotingPower(); // ADD THIS LINE
}, [token]);
```

**4D: Add Percentage Calculation Helper (around line 297)**

```javascript
const vpPercentage = useMemo(() => {
  if (!votingPower || !totalVotingPower || totalVotingPower === 0) {
    return null;
  }
  return ((votingPower / totalVotingPower) * 100).toFixed(2);
}, [votingPower, totalVotingPower]);
```

**4E: Update VP Display (Lines 415-430)**

**PSEUDOCODE:**
```jsx
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
```

**Result:** Display shows:
```
$10,214.48
LP Value
1,021,447 VP
23.5% of total VP    <- NEW!
⚠️ Pseudo-DAO
```

## Testing Requirements

### Phase 1: Backend Testing (10 min)

```bash
# Build and extract candid
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Verify method exists in DID
grep "get_total_voting_power_for_token" daopad_backend/daopad_backend.did

# Deploy backend
./deploy.sh --network ic --backend-only

# Test the new method
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai get_total_voting_power_for_token '(principal "aaaaa-aa")'
# Should return: (variant { Ok = <number> })
```

### Phase 2: Frontend Testing (10 min)

```bash
# Sync declarations
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# Build and deploy frontend
npm run build
./deploy.sh --network ic --frontend-only

# Manual UI testing:
# 1. Navigate to https://daopad.org
# 2. Check main header - should only show "DAOPad" with gold line
# 3. Go to any DAO (e.g., ALEX)
# 4. Check DAO header - should show VP percentage below VP number
# 5. Hover over VP - tooltip should show total network VP
```

### Phase 3: Visual Verification (5 min)

**Main Header - BEFORE:**
```
DAOPad
━━━━
Token Governance Platform
Create treasuries and vote with your locked liquidity
```

**Main Header - AFTER:**
```
DAOPad
━━━━
```

**DAO Header - BEFORE:**
```
$10,214.48
LP Value
1,021,447 VP
⚠️ Pseudo-DAO
```

**DAO Header - AFTER:**
```
$10,214.48
LP Value
1,021,447 VP
23.5% of total VP    <- NEW!
⚠️ Pseudo-DAO
```

## Success Criteria

1. ✅ Main header shows only "DAOPad" with gold underline
2. ✅ No "Token Governance Platform" or subtitle text
3. ✅ Header height significantly reduced
4. ✅ Backend method `get_total_voting_power_for_token` exists and works
5. ✅ DAO header shows VP percentage (e.g., "23.5% of total VP")
6. ✅ Tooltip shows total network VP
7. ✅ Percentage updates when switching between tokens
8. ✅ Graceful handling when total VP is 0 or unavailable

## Files Modified

**Backend:**
- `daopad_backend/src/api/governance_config.rs` - Add new query method
- `daopad_backend/src/api/mod.rs` - Export new method
- `daopad_backend/daopad_backend.did` - Auto-generated

**Frontend:**
- `daopad_frontend/src/routes/AppRoute.jsx` - Simplify header
- `daopad_frontend/src/components/TokenDashboard.jsx` - Add VP percentage
- `daopad_frontend/src/services/daopadBackend.js` - Add service method
- `daopad_frontend/src/declarations/daopad_backend/*` - Auto-synced

## Rollback Plan

If issues arise:
1. Main header: Revert lines 171-176 in AppRoute.jsx
2. VP percentage: Comment out lines in TokenDashboard.jsx
3. Backend method: Can remain (doesn't break anything if unused)

## Notes

- Main header cleanup is purely cosmetic, no risk
- VP percentage is additive, doesn't break existing functionality
- Backend method is a query (read-only), safe to add
- Total VP calculation uses same logic as proposals (battle-tested)
- Percentage shows user's governance influence at a glance
- Helps users understand their voting weight in the DAO
