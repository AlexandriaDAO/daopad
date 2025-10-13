import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { OrbitStationService } from '../services/orbitStation';
import { DAOPadBackendService } from '../services/daopadBackend';
import ProposalCard from './ProposalCard';
import ProposalDetailsModal from './ProposalDetailsModal';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const DaoProposals = ({ identity, dao }) => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [lpPositions, setLpPositions] = useState([]);
  const [lpLoading, setLpLoading] = useState(false);
  const [votingLoading, setVotingLoading] = useState({}); // Track loading state per proposal
  const [filter, setFilter] = useState({
    status: null,
    type: null,
    limit: 20,
    offset: 0
  });

  const { isAuthenticated } = useSelector(state => state.auth);

  useEffect(() => {
    if (dao?.station_canister?.[0] && identity && isAuthenticated) {
      fetchProposals();
      fetchLPPositions();
    } else {
      setLoading(false);
      setProposals([]);
    }
  }, [dao, identity, isAuthenticated, filter]);

  const fetchLPPositions = useCallback(async () => {
    if (!identity || !isAuthenticated) {
      setLpPositions([]);
      return;
    }

    setLpLoading(true);
    try {
      const daopadService = new DAOPadBackendService(identity);
      const result = await daopadService.getMyLpPositions();

      if (result.success) {
        setLpPositions(result.data || []);
      } else {
        console.error('Failed to fetch LP positions:', result.error);
        setLpPositions([]);
      }
    } catch (err) {
      console.error('Error fetching LP positions:', err);
      setLpPositions([]);
    } finally {
      setLpLoading(false);
    }
  }, [identity, isAuthenticated]);

  const fetchProposals = useCallback(async () => {
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
      setError(err.message || 'An error occurred while fetching proposals');
    } finally {
      setLoading(false);
    }
  }, [dao, identity, filter]);

  const handleProposalClick = (proposal) => {
    setSelectedProposal(proposal);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedProposal(null);
  };

  const handleApprove = async (proposalId) => {
    // Set loading state immediately for instant feedback
    setVotingLoading(prev => ({ ...prev, [proposalId]: 'approving' }));
    
    try {
      const daopadService = new DAOPadBackendService(identity);
      const result = await daopadService.approveRequest(dao.token_canister, proposalId, "DAO approved via DAOPad");
      
      if (result.success) {
        // Set success state briefly
        setVotingLoading(prev => ({ ...prev, [proposalId]: 'approved' }));
        
        // Refresh proposals in background
        setTimeout(async () => {
          await fetchProposals();
          if (showDetails) {
            handleCloseDetails();
          }
        }, 500);
        
      } else {
        // Only show error if it's a real failure (not the APPROVAL_NOT_ALLOWED case)
        if (!result.error.includes("permission error, but operation completed")) {
          alert(`❌ Failed to approve: ${result.error}`);
        } else {
          // Still treat as success for UI purposes
          setVotingLoading(prev => ({ ...prev, [proposalId]: 'approved' }));
          setTimeout(async () => {
            await fetchProposals();
            if (showDetails) {
              handleCloseDetails();
            }
          }, 500);
        }
      }
    } catch (err) {
      console.error('Error approving proposal:', err);
      alert(`❌ Error: ${err.message}`);
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

  const handleReject = async (proposalId, reason) => {
    // Set loading state immediately for instant feedback
    setVotingLoading(prev => ({ ...prev, [proposalId]: 'rejecting' }));
    
    try {
      const daopadService = new DAOPadBackendService(identity);
      const result = await daopadService.rejectRequest(dao.token_canister, proposalId, reason || "DAO rejected via DAOPad");
      
      if (result.success) {
        // Set success state briefly
        setVotingLoading(prev => ({ ...prev, [proposalId]: 'rejected' }));
        
        // Refresh proposals in background
        setTimeout(async () => {
          await fetchProposals();
          if (showDetails) {
            handleCloseDetails();
          }
        }, 500);
        
      } else {
        // Only show error if it's a real failure (not the APPROVAL_NOT_ALLOWED case)
        if (!result.error.includes("permission error, but operation completed")) {
          alert(`❌ Failed to reject: ${result.error}`);
        } else {
          // Still treat as success for UI purposes
          setVotingLoading(prev => ({ ...prev, [proposalId]: 'rejected' }));
          setTimeout(async () => {
            await fetchProposals();
            if (showDetails) {
              handleCloseDetails();
            }
          }, 500);
        }
      }
    } catch (err) {
      console.error('Error rejecting proposal:', err);
      alert(`❌ Error: ${err.message}`);
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

  const getTokenName = () => {
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