import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Principal } from '@dfinity/principal';
import { OrbitStationService } from '../services/orbitStation';
import { LPLockingService } from '../services/lpLockingService';
import { DAOPadBackendService } from '../services/daopadBackend';
import ProposalCard from './ProposalCard';
import ProposalDetailsModal from './ProposalDetailsModal';
import './DaoProposals.scss';

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
      <div className="dao-proposals">
        <div className="no-dao-selected">
          <h3>No DAO Selected</h3>
          <p>Please select a DAO from the dashboard to view its proposals.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dao-proposals">
      <div className="proposals-header">
        <div className="dao-info">
          <h2>{getTokenName()} DAO Proposals</h2>
          <div className="dao-details">
            <span className="token-id">Token: {dao.token_canister.toString()}</span>
            {dao.station_canister[0] && (
              <span className="station-id">Station: {dao.station_canister[0].toString()}</span>
            )}
          </div>
        </div>
        
        <div className="filter-controls">
          <select
            value={filter.status || ''}
            onChange={(e) => setFilter({ ...filter, status: e.target.value || null })}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="Created">Created</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Completed">Completed</option>
            <option value="Failed">Failed</option>
          </select>
          
          <button onClick={() => fetchProposals()} className="refresh-button">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* LP Positions Section */}
      {lpPositions.length > 0 && (
        <div className="lp-positions-section">
          <h3>Your Locked LP Positions</h3>
          <div className="lp-positions-grid">
            {lpPositions.map((position, index) => (
              <div key={index} className="lp-position-card">
                <div className="position-header">
                  <span className="pool-pair">{position.symbol_0}/{position.symbol_1}</span>
                  <span className="usd-value">${position.usd_balance.toFixed(2)}</span>
                </div>
                <div className="position-details">
                  <div className="token-amounts">
                    <span>{position.symbol_0}: {position.amount_0.toFixed(4)}</span>
                    <span>{position.symbol_1}: {position.amount_1.toFixed(4)}</span>
                  </div>
                  <div className="lp-balance">
                    <span>LP Balance: {position.balance.toFixed(6)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="positions-summary">
            <strong>Total LP Value: ${lpPositions.reduce((sum, p) => sum + p.usd_balance, 0).toFixed(2)}</strong>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading proposals...</div>
      ) : error ? (
        <div className="error">
          <p>{error}</p>
          <button onClick={() => fetchProposals()}>Try Again</button>
        </div>
      ) : proposals.length === 0 ? (
        <div className="no-proposals">
          <h3>No Proposals Yet</h3>
          <p>This DAO doesn't have any proposals at the moment.</p>
        </div>
      ) : (
        <div className="proposals-grid">
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