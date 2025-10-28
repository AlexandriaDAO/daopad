# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-link-station-vp-check/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-link-station-vp-check/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes only:
     ```bash
     npm run build --prefix daopad_frontend
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "Fix: Enable Station Linking for Users with 10K+ VP on Unlinked Tokens"
   git push -u origin feature/link-station-vp-check
   gh pr create --title "Fix: Enable Station Linking for Users with 10K+ VP on Unlinked Tokens" --body "Implements LINK_STATION_VP_CHECK_PLAN.md

## Problem
When a token has locked liquidity but no Orbit Station linked, users see a generic message telling them to 'contact the DAO community' - even if they have sufficient voting power (10,000+ VP) to link a station themselves.

## Root Cause
DaoRoute.tsx lines 158-196 show a static message and ignore the user's voting power that's already being fetched by the useVoting hook (line 21). The component passes votingPower={0} to DaoLayout (line 163) instead of using the actual fetched value.

## Solution
- Display user's actual voting power on the 'no station' page
- Show 'Link Station' button when user has 10,000+ VP
- Reuse proven dialog logic from TokenTabs.tsx
- Provide clear feedback about VP threshold requirements

## Testing
- Manual verification on mainnet with test token
- Check VP display accuracy
- Verify link button appears at 10K+ VP threshold
- Test station linking flow end-to-end"
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

**Branch:** `feature/link-station-vp-check`
**Worktree:** `/home/theseus/alexandria/daopad-link-station-vp-check/src/daopad`

---

# Implementation Plan: Enable Station Linking for Users with 10K+ VP

## Problem Statement

When a token has locked liquidity in Kong Locker but no Orbit Station linked, the UI shows a generic "No Orbit Station Linked" message that tells users to "Contact the DAO community to initiate a station linking proposal."

However:
1. The backend already has station linking functionality (`propose_orbit_station_link`)
2. Users with 10,000+ VP can create station link proposals themselves
3. The frontend fetches the user's voting power but ignores it in the "no-station" state
4. TokenTabs.tsx already has working station link dialog logic

This creates a poor UX where users with sufficient VP don't know they can link stations themselves.

## Current State Analysis

### Files Involved

1. **daopad_frontend/src/routes/DaoRoute.tsx**
   - Lines 21: Fetches voting power via `useVoting(tokenId)` hook
   - Lines 158-196: Shows "no-station" error state
   - Line 163: Passes `votingPower={0}` to DaoLayout (BUG!)
   - Does not check VP threshold or show link button

2. **daopad_frontend/src/components/TokenTabs.tsx**
   - Lines 121-168: `handleLinkStation` function (working implementation)
   - Lines 248-253: "Link Another DAO" button
   - Lines 321-389: Link station dialog with form validation
   - Line 327: Mentions "at least 10,000 VP" requirement

3. **daopad_frontend/src/services/backend/tokens/TokenService.ts**
   - Lines 86-97: `proposeStationLink(tokenId, stationId)` method

4. **daopad_backend/src/proposals/orbit_link.rs**
   - Line 42: `MINIMUM_VP_FOR_PROPOSAL: u64 = 10_000`
   - Lines 45-50: VP check with error message

### Current Flow (Broken)

```
User visits /:tokenId (no station linked)
    ↓
DaoRoute.tsx loads token metadata
    ↓
useVoting hook fetches voting power (e.g., 15,000 VP)
    ↓
error === 'no-station' condition triggers (line 158)
    ↓
Shows static message "Contact the DAO community"
    ↓
Passes votingPower={0} to DaoLayout (line 163) ❌ BUG
    ↓
User with 15K VP doesn't know they can link station
```

## Implementation

### File 1: `daopad_frontend/src/routes/DaoRoute.tsx`

**Changes Required:**
1. Use actual `userVotingPower` from useVoting hook instead of hardcoded 0
2. Add state for link station dialog
3. Add VP threshold constant (10,000)
4. Replace static message with VP-aware UI
5. Show "Link Station" button when VP >= 10,000
6. Add station linking dialog (reuse TokenTabs pattern)

**Pseudocode:**

```typescript
// AFTER LINE 18 (state declarations)
const [showLinkDialog, setShowLinkDialog] = useState<boolean>(false);
const [linkStationId, setLinkStationId] = useState<string>('');
const [linkError, setLinkError] = useState<string>('');
const [linking, setLinking] = useState<boolean>(false);

// AFTER LINE 20 (voting hook)
const MINIMUM_VP_FOR_LINKING = 10000;

// ADD NEW FUNCTION AFTER LINE 151 (after loadStation function)
const handleLinkStation = async () => {
  // Validate identity
  if (!identity) {
    setLinkError('Please authenticate first');
    return;
  }

  // Validate station ID
  if (!linkStationId.trim()) {
    setLinkError('Station ID is required');
    return;
  }

  // Validate principal format
  try {
    Principal.fromText(linkStationId.trim());
  } catch (err) {
    setLinkError('Invalid station ID format');
    return;
  }

  setLinking(true);
  setLinkError('');

  try {
    const tokenService = getTokenService(identity);
    const tokenPrincipal = Principal.fromText(tokenId);
    const stationPrincipal = Principal.fromText(linkStationId.trim());

    const result = await tokenService.proposeStationLink(tokenPrincipal, stationPrincipal);

    if (result.success) {
      // Success - reload page to show linked station
      setShowLinkDialog(false);
      setLinkStationId('');
      setLinkError('');

      // Redirect to station route
      window.location.href = `/${linkStationId.trim()}`;
    } else {
      setLinkError(result.error || 'Failed to create station link proposal');
    }
  } catch (err) {
    console.error('Error creating station link proposal:', err);
    setLinkError(err.message || 'An error occurred');
  } finally {
    setLinking(false);
  }
};

// REPLACE LINES 158-196 (no-station error UI)
if (error === 'no-station' && token) {
  const hasMinimumVP = userVotingPower >= MINIMUM_VP_FOR_LINKING;

  return (
    <DaoLayout
      token={token}
      orbitStation={null}
      votingPower={userVotingPower}  // ✅ Use actual VP, not 0
      loadingVotingPower={loadingVP}
      refreshVotingPower={fetchVotingPower}
    >
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-executive-darkGray border border-executive-gold/20 rounded-lg p-8 text-center space-y-6">
          <h2 className="text-2xl font-display text-executive-ivory mb-4">
            No Orbit Station Linked
          </h2>

          <p className="text-executive-lightGray/80">
            This token ({token.symbol}) has locked liquidity in Kong Locker but hasn't been linked to an Orbit Station yet.
          </p>

          {/* Voting Power Display */}
          <div className="bg-executive-charcoal/50 border border-executive-lightGray/10 rounded p-6">
            <div className="text-sm text-executive-lightGray/60 mb-2">Your Voting Power</div>
            {loadingVP ? (
              <div className="text-executive-gold text-2xl font-bold">Loading...</div>
            ) : (
              <div className="text-executive-gold text-3xl font-bold">
                {userVotingPower.toLocaleString()} VP
              </div>
            )}
            <div className="text-xs text-executive-lightGray/40 mt-2">
              Minimum required: {MINIMUM_VP_FOR_LINKING.toLocaleString()} VP
            </div>
          </div>

          {/* VP-Based Actions */}
          {hasMinimumVP ? (
            <>
              <p className="text-executive-lightGray/80">
                You have sufficient voting power to link this token to an Orbit Station and enable DAO governance.
              </p>
              <button
                onClick={() => setShowLinkDialog(true)}
                disabled={!isAuthenticated}
                className="px-6 py-3 bg-executive-gold text-executive-charcoal hover:bg-executive-goldLight rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Link Orbit Station
              </button>
            </>
          ) : (
            <>
              <p className="text-executive-lightGray/60 text-sm">
                To link an Orbit Station, you need at least {MINIMUM_VP_FOR_LINKING.toLocaleString()} VP.
                Increase your voting power by locking more LP tokens in Kong Locker.
              </p>
              <button
                onClick={() => window.location.href = 'https://konglocker.com'}
                className="px-6 py-2 bg-executive-gold/20 text-executive-gold border border-executive-gold/30 hover:bg-executive-gold/30 rounded font-semibold"
              >
                Go to Kong Locker
              </button>
            </>
          )}

          <div className="bg-executive-charcoal/50 border border-executive-lightGray/10 rounded p-4">
            <p className="text-xs text-executive-lightGray/40 font-mono break-all">
              Token ID: {token.canister_id}
            </p>
          </div>

          <button
            onClick={() => window.location.href = '/app'}
            className="text-executive-lightGray/60 hover:text-executive-gold underline text-sm"
          >
            Return to Dashboard
          </button>
        </div>
      </div>

      {/* Link Station Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="bg-executive-darkGray border-executive-gold/20">
          <DialogHeader>
            <DialogTitle className="text-executive-ivory">Link Orbit Station</DialogTitle>
            <DialogDescription className="text-executive-lightGray">
              Create a governance proposal to link an Orbit Station to {token.symbol}.
              This requires community approval via weighted voting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="station-id" className="text-executive-lightGray">
                Orbit Station Canister ID
              </Label>
              <Input
                id="station-id"
                value={linkStationId}
                onChange={(e) => setLinkStationId(e.target.value)}
                placeholder="e.g., fec7w-zyaaa-aaaaa-qaffq-cai"
                className="bg-executive-mediumGray border-executive-gold/30 text-executive-ivory"
              />
              <p className="text-xs text-executive-lightGray/60 mt-1">
                The Orbit Station canister to use for DAO governance
              </p>
            </div>

            <div className="bg-executive-charcoal/50 rounded p-3">
              <div className="text-xs text-executive-lightGray/60 space-y-1">
                <div className="flex justify-between">
                  <span>Token:</span>
                  <span className="font-mono">{token.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span>Your VP:</span>
                  <span className="text-executive-gold">{userVotingPower.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {linkError && (
              <Alert variant="destructive">
                <AlertDescription>{linkError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowLinkDialog(false);
                setLinkError('');
                setLinkStationId('');
              }}
              className="border-executive-gold/30 text-executive-lightGray hover:bg-executive-gold/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLinkStation}
              disabled={linking || !linkStationId.trim()}
              className="bg-executive-gold text-executive-charcoal hover:bg-executive-goldLight"
            >
              {linking ? 'Creating Proposal...' : 'Create Proposal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DaoLayout>
  );
}
```

**Imports to Add:**
```typescript
// At top of file with other imports
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
```

## Testing Plan

### Manual Testing on Mainnet

**Prerequisites:**
1. Token with locked liquidity but no station linked
2. Test account with varying VP levels

**Test Cases:**

1. **User with <10K VP (Insufficient)**
   ```bash
   # Visit unlinked token page
   # Expected: Shows VP, "Link Station" button disabled, message about needing more VP
   ```

2. **User with 10K+ VP (Sufficient)**
   ```bash
   # Visit unlinked token page
   # Expected: Shows VP, "Link Station" button enabled
   # Click button -> Dialog opens
   # Enter station ID -> Create proposal
   # Expected: Redirects to station page or shows success
   ```

3. **Unauthenticated User**
   ```bash
   # Visit unlinked token page without auth
   # Expected: Shows VP as 0, message about authentication
   ```

4. **VP Loading State**
   ```bash
   # On page load, VP should show "Loading..." until fetched
   ```

### Console Error Check
```bash
cd daopad_frontend
./deploy.sh --network ic --frontend-only

# Open browser console on unlinked token page
# Expected: No errors related to voting power or token service
```

### Deployment Workflow
```bash
cd /home/theseus/alexandria/daopad-link-station-vp-check/src/daopad

# 1. Build frontend
npm run build --prefix daopad_frontend

# 2. Deploy frontend only
./deploy.sh --network ic --frontend-only

# 3. Verify on mainnet
# Visit https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/[UNLINKED_TOKEN_ID]
```

## Success Criteria

✅ User's actual voting power is displayed on "no station" page
✅ "Link Station" button appears when VP >= 10,000
✅ Dialog allows entering station ID and creating proposal
✅ Clear feedback about VP requirements
✅ Smooth redirect to station page after successful link
✅ No console errors
✅ Works for authenticated and unauthenticated users
✅ Loading states handled gracefully

## Rollback Plan

If issues arise:
```bash
cd /home/theseus/alexandria/daopad
git checkout master
./deploy.sh --network ic --frontend-only
```

## Notes

- Backend already enforces 10,000 VP minimum (orbit_link.rs:42)
- TokenService.proposeStationLink already exists and works
- No backend changes needed - frontend-only fix
- Reuses proven patterns from TokenTabs.tsx
- Maintains existing error handling and validation
