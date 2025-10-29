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
      } catch (err: any) {
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
    } catch (err: any) {
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
    } catch (err: any) {
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
    } catch (err: any) {
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
function ProposalCard({ proposal, userPrincipal, isAuthenticated, onVote, onExecute }: any) {
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
