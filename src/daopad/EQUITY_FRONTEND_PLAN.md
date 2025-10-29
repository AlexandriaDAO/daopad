# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-equity-frontend/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-equity-frontend/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes:
     ```bash
     cd daopad_frontend
     npm install
     npm run build
     cd ..
     ./deploy.sh --network ic --frontend-only
     ```
4. **Manual Browser Testing** (MANDATORY - See Testing Strategy section):
   - Open https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
   - Navigate to test station (fec7w-zyaaa-aaaaa-qaffq-cai)
   - Verify equity tab appears
   - Test all equity operations
   - Check console for errors
5. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "feat: Equity-Based Station Frontend (Part 2)

   Implements equity governance UI for Orbit Stations.

   Frontend Changes:
   - Equity tab with holders table and transfer UI
   - Conditional rendering based on is_equity_station()
   - Vote on equity transfer proposals
   - Execute approved transfers

   Testing: Manual browser testing on mainnet completed
   Backend: Part 1 already deployed and proven

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>"
   git push -u origin feature/equity-frontend
   gh pr create --title "feat: Equity-Based Station Frontend (Part 2)" --body "$(cat <<'EOF'
## Summary
Implements the frontend UI for equity-based governance stations (Part 2 of 2).

### What This Adds
- **Equity Tab**: Shows equity holders and their ownership percentages
- **Transfer Equity UI**: Form for proposing equity transfers
- **Active Proposals**: Display of equity transfer proposals with voting
- **Voting Interface**: Vote on equity transfer proposals
- **Execution Interface**: Execute approved transfers (buyers only)

### Architecture
- **Conditional Rendering**: Equity tab only shows for equity-enabled stations
- **AdminService Extension**: New methods for equity operations
- **DaoLayout Integration**: New tab added to existing layout
- **DaoEquity Component**: New route for equity tab content

### Testing
Manual browser testing completed on mainnet:
✅ Equity tab appears for equity stations
✅ Equity holders table displays correctly
✅ Transfer equity form works
✅ Voting on equity proposals works
✅ Execution of approved transfers works

### What Was Already Complete
- Backend (Part 1) - deployed and proven in production
- All equity methods available via Admin canister
- dfx testing completed in Part 1

### Risk Assessment
**Low Risk** - Frontend-only changes:
- Backend already proven and deployed
- No data migration needed
- Graceful fallback for non-equity stations
- Uses existing UI patterns and components

### Dependencies
- Requires backend from PR #137 (already merged)
- Admin canister methods: is_equity_station, get_equity_holders, etc.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
   ```
6. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view $(gh pr list --json number --jq '.[0].number') --json comments`
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

**Branch:** `feature/equity-frontend`
**Worktree:** `/home/theseus/alexandria/daopad-equity-frontend/src/daopad`

---

# Equity-Based Station Frontend Implementation (Part 2)

## Executive Summary

Implement the frontend UI for equity-based governance stations. Backend (Part 1) is already deployed and proven. This PR adds the "Equity" tab to station detail pages, showing equity holders, transfer proposals, and voting interface.

**Part 1 (Completed)**: Backend with dfx testing - merged in PR #137
**Part 2 (This PR)**: Frontend UI for equity governance

## Current State Documentation

### Frontend File Structure (Before Changes)

```
daopad_frontend/
├── src/
│   ├── routes/
│   │   ├── DaoRoute.tsx              # Parent route with Outlet
│   │   └── dao/
│   │       ├── DaoOverview.tsx       # Overview tab
│   │       ├── DaoAgreement.tsx      # Agreement tab
│   │       ├── DaoTreasury.tsx       # Treasury tab
│   │       ├── DaoActivity.tsx       # Activity tab
│   │       ├── DaoCanisters.tsx      # Canisters tab
│   │       ├── DaoSettings.tsx       # Settings tab
│   │       └── (NO DaoEquity.tsx yet)
│   ├── components/
│   │   └── dao/
│   │       └── DaoLayout.tsx         # Tab navigation (lines 120-150)
│   ├── services/
│   │   └── admin/
│   │       └── AdminService.ts       # Voting methods only
│   └── App.tsx                       # Router config (lines 31-38)
```

### Existing Tab Pattern (DaoTreasury.tsx:1-50)

```typescript
// Current pattern used by all tabs:
export default function DaoTreasury() {
  const {
    token,
    orbitStation,
    identity,
    isAuthenticated,
    votingPower = 0,
    loadingVotingPower = false
  } = useOutletContext<any>();

  if (!orbitStation) {
    return <Alert>No station setup yet</Alert>;
  }

  return <div>Tab content...</div>;
}
```

### Existing Tab Navigation (DaoLayout.tsx:120-150)

```typescript
// Tabs are hardcoded in DaoLayout.tsx
<TabButton to={tabLinks.overview} active={isOverview}>Overview</TabButton>
<TabButton to={tabLinks.agreement} active={currentTab === 'agreement'}>Agreement</TabButton>
<TabButton to={tabLinks.treasury} active={currentTab === 'treasury'}>Treasury</TabButton>
// ... more tabs ...
// NO EQUITY TAB YET
```

### Admin Service Methods (AdminService.ts:52-108)

```typescript
// Current methods - NO equity methods yet:
- voteOnProposal(tokenId, orbitRequestId, vote)
- hasUserVoted(userId, tokenId, orbitRequestId)
- getUserVote(userId, tokenId, orbitRequestId)
- getProposal(tokenId, orbitRequestId)
- ensureProposalForRequest(tokenId, orbitRequestId, requestType)
```

### Backend Equity Methods Available (From Part 1)

Admin canister already has these methods deployed:
- `is_equity_station(station_id: Principal) -> bool`
- `get_equity_holders(station_id: Principal) -> Vec<(Principal, u8)>`
- `get_user_equity(station_id: Principal, user: Principal) -> u8`
- `create_equity_transfer_proposal(...) -> Result<String, String>`
- `vote_on_equity_transfer(proposal_id: String, approve: bool) -> Result<(), String>`
- `execute_equity_transfer(proposal_id: String) -> Result<(), String>`
- `get_equity_transfer_proposals(station_id: Principal) -> Vec<EquityTransferProposal>`
- `get_equity_transfer_proposal(proposal_id: String) -> Option<EquityTransferProposal>`

## Implementation Plan (PSEUDOCODE)

### 1. Extend AdminService (`daopad_frontend/src/services/admin/AdminService.ts`)

**ADD** new equity methods (append to existing class):

```typescript
// PSEUDOCODE - Do not copy literally

export class AdminService {
  // ... existing methods ...

  // ============================================================================
  // EQUITY METHODS
  // ============================================================================

  async isEquityStation(stationId: string): Promise<boolean> {
    const actor = await this.getActor();
    return await actor.is_equity_station(Principal.fromText(stationId));
  }

  async getEquityHolders(stationId: string): Promise<Array<[Principal, number]>> {
    const actor = await this.getActor();
    return await actor.get_equity_holders(Principal.fromText(stationId));
  }

  async getUserEquity(stationId: string, user: Principal): Promise<number> {
    const actor = await this.getActor();
    return await actor.get_user_equity(Principal.fromText(stationId), user);
  }

  async createEquityTransferProposal(
    stationId: string,
    buyer: Principal,
    percentage: number,
    ckusdcAmount: bigint,
    paymentDestination: { SellerAccount: string } | { StationTreasury: Principal }
  ): Promise<string> {
    const actor = await this.getActor();
    const result = await actor.create_equity_transfer_proposal(
      Principal.fromText(stationId),
      buyer,
      percentage,
      ckusdcAmount,
      paymentDestination
    );

    if ('Err' in result) {
      throw new Error(result.Err);
    }

    return result.Ok;
  }

  async voteOnEquityTransfer(proposalId: string, approve: boolean): Promise<void> {
    const actor = await this.getActor();
    const result = await actor.vote_on_equity_transfer(proposalId, approve);

    if ('Err' in result) {
      throw new Error(result.Err);
    }
  }

  async executeEquityTransfer(proposalId: string): Promise<void> {
    const actor = await this.getActor();
    const result = await actor.execute_equity_transfer(proposalId);

    if ('Err' in result) {
      throw new Error(result.Err);
    }
  }

  async getEquityTransferProposals(stationId: string): Promise<any[]> {
    const actor = await this.getActor();
    return await actor.get_equity_transfer_proposals(Principal.fromText(stationId));
  }

  async getEquityTransferProposal(proposalId: string): Promise<any | null> {
    const actor = await this.getActor();
    const result = await actor.get_equity_transfer_proposal(proposalId);
    return result.length > 0 ? result[0] : null;
  }
}
```

### 2. Add Equity Route (`daopad_frontend/src/routes/dao/DaoEquity.tsx` - NEW FILE)

Create new tab component following existing pattern:

```typescript
// PSEUDOCODE - Do not copy literally

import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Principal } from '@dfinity/principal';
import { getAdminService } from '../../services/admin/AdminService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, Check, X } from 'lucide-react';

export default function DaoEquity() {
  const {
    token,
    orbitStation,
    identity,
    isAuthenticated
  } = useOutletContext<any>();

  const [loading, setLoading] = useState(true);
  const [equityHolders, setEquityHolders] = useState<Array<[Principal, number]>>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [userEquity, setUserEquity] = useState<number>(0);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [error, setError] = useState<string>('');

  // Transfer form state
  const [buyerPrincipal, setBuyerPrincipal] = useState('');
  const [percentage, setPercentage] = useState('');
  const [ckusdcAmount, setCkusdcAmount] = useState('');
  const [paymentDestination, setPaymentDestination] = useState<'seller' | 'treasury'>('treasury');
  const [sellerAccount, setSellerAccount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch equity data on mount
  useEffect(() => {
    async function loadEquityData() {
      if (!orbitStation) {
        setLoading(false);
        return;
      }

      try {
        const adminService = getAdminService(identity);
        const stationId = orbitStation.station_id;

        // Parallel fetch
        const [holders, proposalsList] = await Promise.all([
          adminService.getEquityHolders(stationId),
          adminService.getEquityTransferProposals(stationId)
        ]);

        setEquityHolders(holders);
        setProposals(proposalsList);

        // Get user's equity if authenticated
        if (isAuthenticated && identity) {
          const userPrincipal = identity.getPrincipal();
          const equity = await adminService.getUserEquity(stationId, userPrincipal);
          setUserEquity(equity);
        }
      } catch (err) {
        console.error('Failed to load equity data:', err);
        setError(err.message || 'Failed to load equity data');
      } finally {
        setLoading(false);
      }
    }

    loadEquityData();
  }, [orbitStation, identity, isAuthenticated]);

  const handleCreateProposal = async () => {
    // Validation
    if (!buyerPrincipal.trim()) {
      setError('Buyer principal is required');
      return;
    }

    const pct = parseInt(percentage);
    if (isNaN(pct) || pct < 1 || pct > 100) {
      setError('Percentage must be between 1 and 100');
      return;
    }

    const amount = BigInt(ckusdcAmount || '0');
    if (amount < 0n) {
      setError('Amount cannot be negative');
      return;
    }

    if (paymentDestination === 'seller' && !sellerAccount.trim()) {
      setError('Seller account is required');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const adminService = getAdminService(identity);
      const buyer = Principal.fromText(buyerPrincipal.trim());

      const destination = paymentDestination === 'treasury'
        ? { StationTreasury: Principal.fromText(orbitStation.station_id) }
        : { SellerAccount: sellerAccount.trim() };

      const proposalId = await adminService.createEquityTransferProposal(
        orbitStation.station_id,
        buyer,
        pct,
        amount,
        destination
      );

      console.log('Proposal created:', proposalId);

      // Refresh proposals list
      const updated = await adminService.getEquityTransferProposals(orbitStation.station_id);
      setProposals(updated);

      // Close dialog and reset form
      setShowTransferDialog(false);
      setBuyerPrincipal('');
      setPercentage('');
      setCkusdcAmount('');
      setPaymentDestination('treasury');
      setSellerAccount('');
    } catch (err) {
      console.error('Failed to create proposal:', err);
      setError(err.message || 'Failed to create proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (proposalId: string, approve: boolean) => {
    try {
      const adminService = getAdminService(identity);
      await adminService.voteOnEquityTransfer(proposalId, approve);

      // Refresh proposals
      const updated = await adminService.getEquityTransferProposals(orbitStation.station_id);
      setProposals(updated);
    } catch (err) {
      console.error('Failed to vote:', err);
      setError(err.message || 'Failed to vote');
    }
  };

  const handleExecute = async (proposalId: string) => {
    try {
      const adminService = getAdminService(identity);
      await adminService.executeEquityTransfer(proposalId);

      // Refresh all data
      const [holders, proposalsList] = await Promise.all([
        adminService.getEquityHolders(orbitStation.station_id),
        adminService.getEquityTransferProposals(orbitStation.station_id)
      ]);

      setEquityHolders(holders);
      setProposals(proposalsList);

      // Update user equity
      if (isAuthenticated && identity) {
        const userPrincipal = identity.getPrincipal();
        const equity = await adminService.getUserEquity(orbitStation.station_id, userPrincipal);
        setUserEquity(equity);
      }
    } catch (err) {
      console.error('Failed to execute:', err);
      setError(err.message || 'Failed to execute transfer');
    }
  };

  if (!orbitStation) {
    return (
      <Alert className="bg-executive-mediumGray border-executive-gold/30">
        <AlertDescription className="text-executive-lightGray">
          This DAO does not have a treasury station set up yet.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-executive-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Equity Holders Table */}
      <Card className="bg-executive-darkGray border-executive-gold/20">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-executive-ivory">Equity Holders</CardTitle>
              <CardDescription className="text-executive-lightGray/70">
                Current ownership distribution
              </CardDescription>
            </div>
            {userEquity > 0 && isAuthenticated && (
              <Button
                onClick={() => setShowTransferDialog(true)}
                className="bg-executive-gold text-executive-charcoal hover:bg-executive-goldLight"
              >
                Transfer Equity
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-executive-lightGray">Principal</TableHead>
                <TableHead className="text-executive-lightGray text-right">Equity %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equityHolders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-executive-lightGray/60">
                    No equity holders found
                  </TableCell>
                </TableRow>
              ) : (
                equityHolders.map(([principal, pct]) => (
                  <TableRow key={principal.toText()}>
                    <TableCell className="font-mono text-executive-lightGray text-sm">
                      {principal.toText()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="bg-executive-gold/20 text-executive-gold">
                        {pct}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Active Proposals */}
      <Card className="bg-executive-darkGray border-executive-gold/20">
        <CardHeader>
          <CardTitle className="text-executive-ivory">Active Equity Transfer Proposals</CardTitle>
          <CardDescription className="text-executive-lightGray/70">
            Proposals require 75% approval from equity holders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {proposals.length === 0 ? (
            <p className="text-center text-executive-lightGray/60 py-8">
              No active proposals
            </p>
          ) : (
            proposals.map((proposal) => (
              <ProposalCard
                key={proposal.proposal_id}
                proposal={proposal}
                userPrincipal={identity?.getPrincipal()}
                isAuthenticated={isAuthenticated}
                onVote={handleVote}
                onExecute={handleExecute}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="bg-executive-darkGray border-executive-gold/20 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-executive-ivory">Transfer Equity</DialogTitle>
            <DialogDescription className="text-executive-lightGray">
              Create a proposal to transfer {userEquity}% of your equity. Requires 75% approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="buyer" className="text-executive-lightGray">
                Buyer Principal
              </Label>
              <Input
                id="buyer"
                value={buyerPrincipal}
                onChange={(e) => setBuyerPrincipal(e.target.value)}
                placeholder="Principal ID"
                className="bg-executive-mediumGray border-executive-gold/30 text-executive-ivory"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="percentage" className="text-executive-lightGray">
                  Percentage (1-{userEquity})
                </Label>
                <Input
                  id="percentage"
                  type="number"
                  min="1"
                  max={userEquity}
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  placeholder="20"
                  className="bg-executive-mediumGray border-executive-gold/30 text-executive-ivory"
                />
              </div>

              <div>
                <Label htmlFor="amount" className="text-executive-lightGray">
                  ckUSDC Amount
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  value={ckusdcAmount}
                  onChange={(e) => setCkusdcAmount(e.target.value)}
                  placeholder="1000"
                  className="bg-executive-mediumGray border-executive-gold/30 text-executive-ivory"
                />
              </div>
            </div>

            <div>
              <Label className="text-executive-lightGray">Payment Destination</Label>
              <div className="space-y-2 mt-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={paymentDestination === 'treasury'}
                    onChange={() => setPaymentDestination('treasury')}
                    className="text-executive-gold"
                  />
                  <span className="text-executive-lightGray">Station Treasury</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={paymentDestination === 'seller'}
                    onChange={() => setPaymentDestination('seller')}
                    className="text-executive-gold"
                  />
                  <span className="text-executive-lightGray">Seller Account</span>
                </label>
              </div>
            </div>

            {paymentDestination === 'seller' && (
              <div>
                <Label htmlFor="seller-account" className="text-executive-lightGray">
                  Seller Account Identifier
                </Label>
                <Input
                  id="seller-account"
                  value={sellerAccount}
                  onChange={(e) => setSellerAccount(e.target.value)}
                  placeholder="Account identifier"
                  className="bg-executive-mediumGray border-executive-gold/30 text-executive-ivory"
                />
              </div>
            )}

            <Alert className="bg-executive-charcoal/50 border-executive-gold/20">
              <AlertDescription className="text-executive-lightGray/70 text-sm">
                Note: Payment verification is manual (trust-based MVP). Buyer must send payment before executing.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTransferDialog(false);
                setError('');
              }}
              className="border-executive-gold/30 text-executive-lightGray hover:bg-executive-gold/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProposal}
              disabled={submitting}
              className="bg-executive-gold text-executive-charcoal hover:bg-executive-goldLight"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Proposal'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Proposal Card Component
function ProposalCard({ proposal, userPrincipal, isAuthenticated, onVote, onExecute }) {
  const status = proposal.status;
  const isProposed = 'Proposed' in status;
  const isApproved = 'Approved' in status;
  const isExecuted = 'Executed' in status;
  const isExpired = 'Expired' in status;

  const isBuyer = userPrincipal && proposal.buyer.toText() === userPrincipal.toText();
  const canExecute = isAuthenticated && isBuyer && isApproved;

  const statusColor = isExecuted
    ? 'bg-green-500/20 text-green-400'
    : isApproved
    ? 'bg-blue-500/20 text-blue-400'
    : isExpired
    ? 'bg-red-500/20 text-red-400'
    : 'bg-yellow-500/20 text-yellow-400';

  return (
    <Card className="bg-executive-mediumGray border-executive-gold/10">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-executive-lightGray/70 text-sm">Seller:</span>
                <span className="font-mono text-sm text-executive-lightGray">
                  {proposal.seller.toText().slice(0, 20)}...
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-executive-gold" />
                <span className="text-executive-lightGray/70 text-sm">Buyer:</span>
                <span className="font-mono text-sm text-executive-lightGray">
                  {proposal.buyer.toText().slice(0, 20)}...
                </span>
              </div>
            </div>
            <Badge className={statusColor}>
              {isProposed ? 'Proposed' : isApproved ? 'Approved' : isExecuted ? 'Executed' : 'Expired'}
            </Badge>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-executive-lightGray/70">Percentage:</span>
              <span className="ml-2 text-executive-gold font-semibold">{proposal.percentage}%</span>
            </div>
            <div>
              <span className="text-executive-lightGray/70">Amount:</span>
              <span className="ml-2 text-executive-lightGray">{proposal.ckusdc_amount.toString()} ckUSDC</span>
            </div>
          </div>

          {/* Vote Tally */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-executive-lightGray/70">Yes Votes:</span>
              <span className="text-green-400">{proposal.yes_votes_pct}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-executive-lightGray/70">No Votes:</span>
              <span className="text-red-400">{proposal.no_votes_pct}%</span>
            </div>
            <div className="h-2 bg-executive-charcoal rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{ width: `${proposal.yes_votes_pct}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          {isProposed && isAuthenticated && (
            <div className="flex gap-2">
              <Button
                onClick={() => onVote(proposal.proposal_id, true)}
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="mr-2 h-4 w-4" />
                Vote Yes
              </Button>
              <Button
                onClick={() => onVote(proposal.proposal_id, false)}
                size="sm"
                variant="outline"
                className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                <X className="mr-2 h-4 w-4" />
                Vote No
              </Button>
            </div>
          )}

          {canExecute && (
            <Button
              onClick={() => onExecute(proposal.proposal_id)}
              className="w-full bg-executive-gold text-executive-charcoal hover:bg-executive-goldLight"
            >
              Execute Transfer
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3. Update DaoLayout (`daopad_frontend/src/components/dao/DaoLayout.tsx`)

**MODIFY** to conditionally show equity tab (around lines 43-51 and 120-150):

```typescript
// PSEUDOCODE - Do not copy literally

// ADD new prop to interface (line 8-15):
interface DaoLayoutProps {
  token: any;
  orbitStation: any;
  votingPower?: number;
  loadingVotingPower?: boolean;
  refreshVotingPower?: () => void;
  children: React.ReactNode;
  isEquityStation?: boolean;  // ADD THIS
}

// MODIFY function signature (line 17-24):
export default function DaoLayout({
  token,
  orbitStation,
  votingPower = 0,
  loadingVotingPower = false,
  refreshVotingPower,
  children,
  isEquityStation = false  // ADD THIS with default
}: DaoLayoutProps) {
  // ... existing code ...

  // MODIFY tab links (around line 43-51):
  const tabLinks = {
    overview: `/${baseRouteId}`,
    agreement: `/${baseRouteId}/agreement`,
    treasury: `/${baseRouteId}/treasury`,
    equity: `/${baseRouteId}/equity`,  // ADD THIS
    activity: `/${baseRouteId}/activity`,
    canisters: `/${baseRouteId}/canisters`,
    invoices: `/${baseRouteId}/invoices`,
    settings: `/${baseRouteId}/settings`
  };

  // ... existing code ...

  // MODIFY tab navigation (around lines 126-147):
  <TabButton to={tabLinks.overview} active={isOverview}>
    Overview
  </TabButton>
  <TabButton to={tabLinks.agreement} active={currentTab === 'agreement'}>
    Agreement
  </TabButton>
  <TabButton to={tabLinks.treasury} active={currentTab === 'treasury'}>
    Treasury
  </TabButton>
  {/* ADD EQUITY TAB CONDITIONALLY */}
  {isEquityStation && (
    <TabButton to={tabLinks.equity} active={currentTab === 'equity'}>
      Equity
    </TabButton>
  )}
  <TabButton to={tabLinks.activity} active={currentTab === 'activity'}>
    Activity
  </TabButton>
  <TabButton to={tabLinks.canisters} active={currentTab === 'canisters'}>
    Canisters
  </TabButton>
  <TabButton to={tabLinks.invoices} active={currentTab === 'invoices'}>
    Invoices
  </TabButton>
  <TabButton to={tabLinks.settings} active={currentTab === 'settings'}>
    Settings
  </TabButton>
}
```

### 4. Update DaoRoute (`daopad_frontend/src/routes/DaoRoute.tsx`)

**MODIFY** to check equity status and pass to layout (around lines 16-40 and 416-436):

```typescript
// PSEUDOCODE - Do not copy literally

// ADD state variable (around line 29):
const [isEquityStation, setIsEquityStation] = useState<boolean>(false);

// MODIFY loadStation function (around line 40-200):
useEffect(() => {
  async function loadStation() {
    // ... existing loading logic ...

    try {
      // ... existing code for fetching token and station ...

      // After successful station load, check if equity station
      if (stationPrincipal) {
        const adminService = getAdminService(identity);
        const isEquity = await adminService.isEquityStation(stationPrincipal.toString()).catch(() => false);
        setIsEquityStation(isEquity);
      }

      // ... rest of existing code ...
    } catch (e) {
      // ... existing error handling ...
    }
  }

  loadStation();
}, [stationId, identity, isAuthenticated]);

// MODIFY layout render (around line 417-436):
return (
  <DaoLayout
    token={token}
    orbitStation={orbitStation}
    votingPower={userVotingPower}
    loadingVotingPower={loadingVP}
    refreshVotingPower={fetchVotingPower}
    isEquityStation={isEquityStation}  // ADD THIS
  >
    <Outlet context={{
      token,
      orbitStation,
      overviewStats,
      identity,
      isAuthenticated,
      votingPower: userVotingPower,
      loadingVotingPower: loadingVP,
      refreshVotingPower: fetchVotingPower,
      isEquityStation  // ADD THIS
    }} />
  </DaoLayout>
);
```

### 5. Update App.tsx Router (`daopad_frontend/src/App.tsx`)

**MODIFY** to add equity route (around lines 18 and 36):

```typescript
// PSEUDOCODE - Do not copy literally

// ADD import (line 18):
const DaoEquity = lazy(() => import('./routes/dao/DaoEquity'));

// ADD route (around line 36, after settings):
<Route path="/:stationId" element={<DaoRoute />}>
  <Route index element={<DaoOverview />} />
  <Route path="agreement" element={<DaoAgreement />} />
  <Route path="treasury" element={<DaoTreasury />} />
  <Route path="equity" element={<DaoEquity />} />  {/* ADD THIS */}
  <Route path="activity" element={<DaoActivity />} />
  <Route path="canisters" element={<DaoCanisters />} />
  <Route path="settings" element={<DaoSettings />} />
</Route>
```

## Testing Strategy

### Manual Browser Testing (MANDATORY)

**⚠️ CRITICAL**: No Playwright for this feature - authentication required for all equity operations.

#### Prerequisites

```bash
# Deploy frontend
./deploy.sh --network ic --frontend-only

# Test station details
export TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"
export FRONTEND_URL="https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io"
```

#### Test Sequence 1: Equity Tab Visibility

**Steps:**
1. Open browser to `$FRONTEND_URL`
2. Navigate to test station: `$FRONTEND_URL/$TEST_STATION`
3. Check tab navigation

**Expected:**
- ✅ "Equity" tab appears after "Treasury" tab
- ✅ Tab is clickable
- ✅ Other tabs still work

**If fails:**
- Check browser console for errors
- Verify `is_equity_station()` call in Network tab
- Check DaoRoute.tsx state: `isEquityStation` should be `true`

#### Test Sequence 2: Equity Holders Display

**Steps:**
1. Click "Equity" tab
2. View equity holders table

**Expected:**
- ✅ Table shows principals with equity percentages
- ✅ Total adds up to 100%
- ✅ Data matches dfx query: `dfx canister --network ic call odkrm-viaaa-aaaap-qp2oq-cai get_equity_holders '(principal "fec7w-zyaaa-aaaaa-qaffq-cai")'`

**If fails:**
- Check console for `getEquityHolders()` errors
- Verify admin actor creation
- Check candid types match backend

#### Test Sequence 3: Transfer Equity Form

**Steps:**
1. Authenticate with Internet Identity (use daopad identity)
2. Click "Equity" tab
3. Click "Transfer Equity" button
4. Fill form:
   - Buyer: `dfx identity get-principal` (from buyer identity)
   - Percentage: 10
   - Amount: 1000
   - Destination: Station Treasury
5. Submit

**Expected:**
- ✅ Dialog opens
- ✅ Form validates input
- ✅ Submission creates proposal
- ✅ Proposal appears in "Active Proposals" section

**If fails:**
- Check console for `createEquityTransferProposal()` errors
- Verify buyer principal format
- Check admin actor has correct identity

#### Test Sequence 4: Vote on Proposal

**Steps:**
1. Find newly created proposal in "Active Proposals"
2. Click "Vote Yes" button

**Expected:**
- ✅ Vote recorded
- ✅ "Yes Votes" percentage updates
- ✅ Status changes to "Approved" if >= 75%
- ✅ Vote buttons disappear (already voted)

**If fails:**
- Check console for `voteOnEquityTransfer()` errors
- Verify user has equity > 0
- Check proposal_id is correct

#### Test Sequence 5: Execute Transfer

**Steps:**
1. Switch to buyer identity in browser (login/logout)
2. Navigate back to equity tab
3. Find approved proposal
4. Click "Execute Transfer" button

**Expected:**
- ✅ Button only shows for buyer
- ✅ Execution succeeds
- ✅ Equity holders table updates
- ✅ Seller's % decreases, buyer's % increases
- ✅ Total still equals 100%

**If fails:**
- Check console for `executeEquityTransfer()` errors
- Verify caller is buyer
- Check proposal status is "Approved"

### Console Error Inspection

After EACH test sequence, check browser console:

```javascript
// Open DevTools (F12), run in console:
console.log('Errors:', window.__errors || []);

// Check for specific error patterns:
// 1. "actor.<method> is not a function" → Declaration sync bug (see CLAUDE.md)
// 2. "decode error" → Candid type mismatch
// 3. "call failed" → Backend method issue
// 4. "Not authenticated" → Identity issue
```

### Exit Criteria

**✅ All tests pass when:**
1. Equity tab appears for test station
2. Equity holders table displays correctly
3. Transfer proposal creation works
4. Voting updates proposal state
5. Execution transfers equity correctly
6. Total equity remains 100% after all operations
7. NO console errors

**If any test fails:**
1. Note which test sequence
2. Capture console errors
3. Check Network tab for failed requests
4. Fix issue
5. Redeploy: `./deploy.sh --network ic --frontend-only`
6. Repeat ALL test sequences from beginning

## Files Changed

**New Files:**
- `daopad_frontend/src/routes/dao/DaoEquity.tsx` (main equity tab component)

**Modified Files:**
- `daopad_frontend/src/services/admin/AdminService.ts` (add equity methods)
- `daopad_frontend/src/components/dao/DaoLayout.tsx` (add conditional equity tab)
- `daopad_frontend/src/routes/DaoRoute.tsx` (check equity status)
- `daopad_frontend/src/App.tsx` (add equity route)

**No Changes:**
- Backend canisters (already deployed in Part 1)
- Admin canister declarations (should already have equity types from Part 1)

## Success Criteria Summary

Frontend implementation is complete when:

1. All TypeScript code compiles without errors
2. `npm run build` succeeds
3. Deployment to mainnet succeeds
4. ALL 5 manual test sequences pass
5. No console errors in browser
6. Equity tab only appears for equity stations
7. All equity operations work end-to-end

## Risk Assessment

**Low Risk:**
- Frontend-only changes, no backend impact
- Backend already proven in Part 1
- Graceful fallback for non-equity stations
- Uses existing UI components and patterns
- No data migration needed

**Mitigation:**
- Manual testing on mainnet before PR
- Console error monitoring
- Exit criteria requires ALL tests to pass
- Can rollback frontend independently

## Notes for Implementation

1. **Declaration Sync Bug Prevention**:
   ```bash
   # Before implementing, verify declarations are current:
   ls -la src/declarations/admin/
   # Should contain equity methods from Part 1 backend deploy
   ```

2. **Identity Handling**:
   - AdminService needs identity for update calls
   - Use `getAdminService(identity)` consistently
   - Test both authenticated and anonymous states

3. **Candid Type Matching**:
   - Use exact types from backend (u8 for percentages, Principal for IDs)
   - Handle Result types: `if ('Err' in result) { ... }`
   - Optional types: `result.length > 0 ? result[0] : null`

4. **UI Patterns**:
   - Follow existing tab component structure (DaoTreasury.tsx)
   - Use executive theme colors (executive-gold, executive-charcoal, etc.)
   - Use shadcn/ui components (Card, Table, Dialog, etc.)

5. **Error Handling**:
   - Show errors in Alert components
   - Log to console for debugging
   - Clear errors on successful operations

6. **Loading States**:
   - Show Loader2 during async operations
   - Disable buttons while submitting
   - Update UI immediately after successful operations
