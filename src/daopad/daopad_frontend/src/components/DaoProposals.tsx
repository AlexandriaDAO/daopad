import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Principal } from '@dfinity/principal';
import type { Identity } from '@dfinity/agent';
import { OrbitStationService } from '../services/backend';
import { getProposalService } from '../services/backend';
import ProposalCard from './ProposalCard';
import ProposalDetailsModal from './ProposalDetailsModal';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { OrbitRequest } from '../types';

// DAO structure based on backend responses
interface DAO {
  token_canister: Principal;
  station_canister: [Principal] | [];
  is_registered: boolean;
}

interface DaoProposalsProps {
  identity: Identity | null;
  dao: DAO | null;
}

interface FilterState {
  status: string | null;
  type: string | null;
  limit: number;
  offset: number;
}

interface RootState {
  auth: {
    isAuthenticated: boolean;
  };
}

interface VotingLoadingState {
  [proposalId: string]: 'approving' | 'rejecting' | 'approved' | 'rejected';
}

// LP Position structure (for display only - backend method doesn't exist yet)
interface LPPosition {
  symbol_0: string;
  symbol_1: string;
  amount_0: number;
  amount_1: number;
  balance: number;
  usd_balance: number;
}

const DaoProposals: React.FC<DaoProposalsProps> = ({ identity, dao }) => {
  const [proposals, setProposals] = useState<OrbitRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<OrbitRequest | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [lpPositions, setLpPositions] = useState<LPPosition[]>([]);
  const [lpLoading, setLpLoading] = useState<boolean>(false);
  const [votingLoading, setVotingLoading] = useState<VotingLoadingState>({}); // Track loading state per proposal
  const [filter, setFilter] = useState<FilterState>({
    status: null,
    type: null,
    limit: 20,
    offset: 0
  });

  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (dao?.station_canister?.[0] && identity && isAuthenticated) {
      fetchProposals();
      // Note: fetchLPPositions() disabled - backend method doesn't exist yet
      // TODO: Implement getMyLpPositions in getProposalService
    } else {
      setLoading(false);
      setProposals([]);
    }
  }, [dao, identity, isAuthenticated, filter]);

  // Disabled: Backend method getMyLpPositions doesn't exist yet
  // TODO: Implement this method in getProposalService when LP position tracking is added
  const fetchLPPositions = useCallback(async (): Promise<void> => {
    if (!identity || !isAuthenticated) {
      setLpPositions([]);
      return;
    }

    setLpLoading(true);
    try {
      // const daopadService = getProposalService(identity);
      // const result = await daopadService.getMyLpPositions();

      // Placeholder - method doesn't exist in backend yet
      setLpPositions([]);

      // if (result.success) {
      //   setLpPositions(result.data || []);
      // } else {
      //   console.error('Failed to fetch LP positions:', result.error);
      //   setLpPositions([]);
      // }
    } catch (err) {
      console.error('Error fetching LP positions:', err);
      setLpPositions([]);
    } finally {
      setLpLoading(false);
    }
  }, [identity, isAuthenticated]);

  const fetchProposals = useCallback(async (): Promise<void> => {
    if (!dao?.station_canister?.[0]) {
      setError('No station canister for this DAO');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create OrbitStationService with the DAO's station
      const orbitService = new OrbitStationService(identity, dao.station_canister[0]);
      const result = await orbitService.listRequests(filter);

      if (result.success) {
        setProposals(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch proposals');
      }
    } catch (err) {
      console.error('Error fetching proposals:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching proposals';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [dao, identity, filter]);

  const handleProposalClick = (proposal: OrbitRequest): void => {
    setSelectedProposal(proposal);
    setShowDetails(true);
  };

  const handleCloseDetails = (): void => {
    setShowDetails(false);
    setSelectedProposal(null);
  };

  const handleVote = async (proposalId: string, vote: boolean): Promise<void> => {
    if (!dao || !identity) return;

    // Set loading state immediately for instant feedback
    setVotingLoading(prev => ({ ...prev, [proposalId]: vote ? 'approving' : 'rejecting' }));

    try {
      const daopadService = getProposalService(identity);
      // Use voting method instead of direct approval
      const result = await daopadService.voteOnOrbitRequest(dao.token_canister, proposalId, vote);

      if (result.success) {
        // Set success state briefly
        setVotingLoading(prev => ({ ...prev, [proposalId]: vote ? 'approved' : 'rejected' }));

        // Refresh proposals in background
        setTimeout(async () => {
          await fetchProposals();
          if (showDetails) {
            handleCloseDetails();
          }
        }, 500);

      } else {
        alert(`❌ Failed to vote: ${result.error}`);
      }
    } catch (err) {
      console.error('Error voting on proposal:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`❌ Error: ${errorMessage}`);
    } finally {
      // Clear loading state after a short delay to show success feedback
      setTimeout(() => {
        setVotingLoading(prev => {
          const newState = { ...prev };
          delete newState[proposalId];
          return newState;
        });
      }, 1500);
    }
  };

  const handleApprove = async (proposalId: string): Promise<void> => {
    await handleVote(proposalId, true);
  };

  const handleReject = async (proposalId: string, reason?: string): Promise<void> => {
    await handleVote(proposalId, false);
  };

  const getTokenName = (): string => {
    // Could be enhanced to fetch actual token metadata
    const tokenId = dao?.token_canister?.toString();
    if (tokenId === '54fqz-5iaaa-aaaap-qkmqa-cai') return 'ALEX';
    return tokenId ? `${tokenId.slice(0, 5)}...${tokenId.slice(-4)}` : 'Unknown';
  };

  if (!dao) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <h3 className="text-xl font-semibold mb-2">No DAO Selected</h3>
            <p className="text-muted-foreground">Please select a DAO from the dashboard to view its proposals.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{getTokenName()} DAO Proposals</h2>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono text-xs">
              Token: {dao.token_canister.toString()}
            </Badge>
            {dao.station_canister[0] && (
              <Badge variant="outline" className="font-mono text-xs">
                Station: {dao.station_canister[0].toString()}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={filter.status || ''}
            onValueChange={(value) => setFilter({ ...filter, status: value || null })}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="Created">Created</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => fetchProposals()}>
            ↻ Refresh
          </Button>
        </div>
      </div>

      {lpPositions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Locked LP Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {lpPositions.map((position, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold">{position.symbol_0}/{position.symbol_1}</span>
                      <Badge variant="secondary">${position.usd_balance.toFixed(2)}</Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="font-mono">{position.symbol_0}: {position.amount_0.toFixed(4)}</div>
                      <div className="font-mono">{position.symbol_1}: {position.amount_1.toFixed(4)}</div>
                      <div className="font-mono">LP Balance: {position.balance.toFixed(6)}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-center pt-4 border-t">
              <Badge variant="default" className="text-sm">
                Total LP Value: ${lpPositions.reduce((sum, p) => sum + p.usd_balance, 0).toFixed(2)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => fetchProposals()} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : proposals.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <h3 className="text-xl font-semibold mb-2">No Proposals Yet</h3>
            <p className="text-muted-foreground">This DAO doesn't have any proposals at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onClick={handleProposalClick}
              onApprove={handleApprove}
              onReject={handleReject}
              canVote={dao.is_registered}
              isVotingLoading={votingLoading[proposal.id]}
            />
          ))}
        </div>
      )}

      {showDetails && selectedProposal && (
        <ProposalDetailsModal
          proposal={selectedProposal}
          onClose={handleCloseDetails}
          onApprove={handleApprove}
          onReject={handleReject}
          canVote={dao.is_registered}
        />
      )}
    </div>
  );
};

export default DaoProposals;