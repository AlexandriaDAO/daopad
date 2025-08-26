import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useIdentity } from '../hooks/useIdentity';
import { OrbitStationService } from '../services/orbitStation';
import ProposalCard from './ProposalCard';
import ProposalDetailsModal from './ProposalDetailsModal';

const AlexandriaProposals = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  // Get authentication state from Redux
  const { isAuthenticated } = useSelector(state => state.auth);
  const { identity } = useIdentity();
  const [filter, setFilter] = useState({
    status: null,
    type: null,
    limit: 20,
    offset: 0
  });
  const [orbitService, setOrbitService] = useState(null);

  // Initialize orbit service when identity changes
  useEffect(() => {
    setOrbitService(new OrbitStationService(identity));
  }, [identity]);

  // Fetch proposals
  const fetchProposals = async () => {
    if (!orbitService) return;
    
    setLoading(true);
    setError(null);

    try {
      console.log('Loading proposals with filter:', filter);
      const result = await orbitService.listRequests(filter);
      
      if (result.success) {
        setProposals(result.data || []);
        console.log(`Loaded ${result.data?.length || 0} proposals`);
      } else {
        // Handle different error types
        if (result.error?.includes('user identity was not found')) {
          // User is authenticated but not registered in Orbit Station
          setError('Your account is not registered in the Alexandria DAO Orbit Station. Only registered DAO members can view proposals.');
        } else if (result.code === 'UNAUTHORIZED' || result.code === '401') {
          if (!isAuthenticated) {
            setError('Authentication required to view proposals. Please login with Internet Identity.');
          } else {
            setError('Access denied. You may not have permission to view these proposals.');
          }
        } else {
          setError(result.error || 'Failed to load proposals');
        }
      }
    } catch (err) {
      console.error('Error loading proposals:', err);
      setError(`Failed to connect to Alexandria DAO: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };


  // Fetch proposal details
  const fetchProposalDetails = async (proposalId) => {
    // For now, just show the proposal from the list
    const proposal = proposals.find(p => p.id === proposalId);
    if (proposal) {
      setSelectedProposal(proposal);
      setShowDetails(true);
    }
  };

  // Close details modal
  const closeDetails = () => {
    setShowDetails(false);
    setSelectedProposal(null);
  };

  // Handle filter changes
  const handleFilterChange = (newFilter) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  };


  // Fetch proposals when service is ready or filter changes
  useEffect(() => {
    if (orbitService) {
      fetchProposals();
    }
  }, [orbitService, filter]);

  return (
    <div className="alexandria-proposals">
      <div className="proposals-header">
        <h2>Alexandria DAO Proposals</h2>
      </div>

      {!isAuthenticated && (
        <div className="auth-notice">
          <p>Please login using the button in the header to view and interact with Alexandria DAO proposals.</p>
        </div>
      )}

      {isAuthenticated && (
        <div className="proposals-filters">
          <div className="filter-group">
            <label>Status:</label>
            <select 
              value={filter.status || ''} 
              onChange={(e) => handleFilterChange({ status: e.target.value || null })}
            >
              <option value="">All</option>
              <option value="Created">Created</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Completed">Completed</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          {error.includes('not registered') ? (
            <>
              <h3>Not a DAO Member</h3>
              <p>{error}</p>
              <p className="info-text">
                To become a member of Alexandria DAO and participate in governance:
              </p>
              <ul className="info-list">
                <li>Hold ALEX tokens in your wallet</li>
                <li>Stake ALEX tokens in the ICP Swap pool</li>
                <li>Contact the DAO administrators for registration</li>
              </ul>
            </>
          ) : (
            <>Error: {error}</>
          )}
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading proposals...</p>
        </div>
      ) : (
        <div className="proposals-list">
          {proposals.length === 0 ? (
            <div className="no-proposals">
              <p>No proposals found</p>
              {isAuthenticated && <p className="text-muted">Try adjusting your filters or check back later</p>}
            </div>
          ) : (
            proposals.map(proposal => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onClick={() => fetchProposalDetails(proposal.id)}
              />
            ))
          )}
        </div>
      )}

      {showDetails && selectedProposal && (
        <ProposalDetailsModal
          proposal={selectedProposal}
          onClose={closeDetails}
        />
      )}

      {proposals.length > 0 && (
        <div className="pagination">
          <button 
            onClick={() => handleFilterChange({ offset: Math.max(0, filter.offset - filter.limit) })}
            disabled={filter.offset === 0}
          >
            Previous
          </button>
          <span>Page {Math.floor(filter.offset / filter.limit) + 1}</span>
          <button 
            onClick={() => handleFilterChange({ offset: filter.offset + filter.limit })}
            disabled={proposals.length < filter.limit}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AlexandriaProposals;