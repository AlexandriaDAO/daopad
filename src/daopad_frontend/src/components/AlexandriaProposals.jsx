import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useIdentity } from '../hooks/useIdentity';
import { OrbitStationService } from '../services/orbitStation';
import { DAOPadBackendService } from '../services/daopadBackend';
import ProposalCard from './ProposalCard';
import ProposalDetailsModal from './ProposalDetailsModal';
import './AlexandriaProposals.scss';

const AlexandriaProposals = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [checkingRegistration, setCheckingRegistration] = useState(false);
  
  // Get authentication state and balances from Redux
  const { isAuthenticated } = useSelector(state => state.auth);
  const { stakedAlexBalance } = useSelector(state => state.balance);
  const { identity } = useIdentity();
  
  const [filter, setFilter] = useState({
    status: null,
    type: null,
    limit: 20,
    offset: 0
  });
  const [orbitService, setOrbitService] = useState(null);
  const [daopadService, setDaopadService] = useState(null);

  // Combined effect for service initialization and registration check
  // This ensures registration is checked whenever identity/authentication changes
  useEffect(() => {
    // Clear everything when logging out
    if (!identity || !isAuthenticated) {
      setOrbitService(null);
      setDaopadService(null);
      setRegistrationStatus(null);
      setProposals([]);
      setLoading(false);
      return;
    }

    // Initialize services with new identity
    const newOrbitService = new OrbitStationService(identity);
    const newDaopadService = new DAOPadBackendService(identity);
    setOrbitService(newOrbitService);
    setDaopadService(newDaopadService);

    // Check registration status with the new services
    const checkRegistration = async () => {
      setCheckingRegistration(true);
      setLoading(true);
      try {
        const result = await newDaopadService.checkRegistrationStatus();
        console.log('Registration status check result:', result);
        if (result.success) {
          setRegistrationStatus(result.data);
          // Registration status is set, the effect watching registrationStatus will handle fetching proposals
        } else {
          console.error('Failed to check registration:', result.error);
          setError(`Failed to check registration status: ${result.error}`);
        }
      } catch (err) {
        console.error('Error checking registration status:', err);
        setError(`Failed to check registration status: ${err.message}`);
      } finally {
        setCheckingRegistration(false);
        setLoading(false);
      }
    };

    checkRegistration();
  }, [identity, isAuthenticated]); // Key dependencies: identity and isAuthenticated
  
  // Periodically re-check registration status to catch external changes
  useEffect(() => {
    if (!daopadService || !isAuthenticated) return;
    
    const interval = setInterval(async () => {
      try {
        const result = await daopadService.checkRegistrationStatus();
        if (result.success) {
          setRegistrationStatus(prevStatus => {
            // Only update if status actually changed
            if (prevStatus?.is_registered !== result.data.is_registered) {
              console.log('Registration status changed:', result.data);
              // If newly registered, fetch proposals
              if (result.data.is_registered && !prevStatus?.is_registered && orbitService) {
                fetchProposals();
              }
            }
            return result.data;
          });
        }
      } catch (err) {
        console.error('Failed to refresh registration status:', err);
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [daopadService, isAuthenticated, orbitService]);

  // Fetch proposals (only called when user is registered)
  const fetchProposals = useCallback(async () => {
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
        setError(result.error || 'Failed to load proposals');
      }
    } catch (err) {
      console.error('Error loading proposals:', err);
      setError(`Failed to connect to Alexandria DAO: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [orbitService, filter]);

  // Handle registration for Orbit access
  const handleRegisterForOrbit = async () => {
    if (!daopadService) return;

    setRegistering(true);
    setError(null);
    
    try {
      const result = await daopadService.registerAsOrbitOperator();
      console.log('Registration result:', result);

      if (result.success) {
        if ('Success' in result.data) {
          // Registration succeeded - wait a moment then check status
          setError(null);
          console.log('Registration successful, refreshing status...');
          
          // Wait 2 seconds for the registration to propagate
          setTimeout(async () => {
            const statusResult = await daopadService.checkRegistrationStatus();
            if (statusResult.success) {
              setRegistrationStatus(statusResult.data);
              // If registered, fetch proposals
              if (statusResult.data.is_registered && orbitService) {
                await fetchProposals();
              }
            }
          }, 2000);
        } else if ('AlreadyRegistered' in result.data) {
          setError('You are already registered');
          // Refresh status to ensure UI is in sync
          const statusResult = await daopadService.checkRegistrationStatus();
          if (statusResult.success) {
            setRegistrationStatus(statusResult.data);
          }
        } else if ('InsufficientStake' in result.data) {
          const current = Number(result.data.InsufficientStake.current) / 100_000_000;
          const required = Number(result.data.InsufficientStake.required) / 100_000_000;
          setError(`Insufficient stake: ${current.toFixed(2)} ALEX (need ${required.toLocaleString()})`);
        } else if ('Error' in result.data) {
          setError(`Registration failed: ${result.data.Error.message}`);
        }
      } else {
        setError(`Registration failed: ${result.error}`);
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(`Registration failed: ${err.message}`);
    } finally {
      setRegistering(false);
    }
  };

  // Fetch proposal details
  const fetchProposalDetails = async (proposalId) => {
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

  // Handle filter changes (only available when registered and viewing proposals)
  const handleFilterChange = (newFilter) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  };

  // Fetch proposals when registration status changes or filter changes
  useEffect(() => {
    if (registrationStatus?.is_registered && orbitService) {
      fetchProposals();
    }
  }, [registrationStatus?.is_registered, fetchProposals]);

  // Render authentication prompt
  if (!isAuthenticated) {
    return (
      <div className="alexandria-proposals">
        <div className="proposals-header">
          <h2>Alexandria DAO Proposals</h2>
        </div>
        <div className="auth-banner">
          <div className="auth-icon"></div>
          <h3>Authentication Required</h3>
          <p>Please login using the "Connect with Internet Identity" button in the header to view and interact with Alexandria DAO proposals.</p>
        </div>
      </div>
    );
  }

  // Render registration checking state
  if (checkingRegistration) {
    return (
      <div className="alexandria-proposals">
        <div className="proposals-header">
          <h2>Alexandria DAO Proposals</h2>
        </div>
        <div className="loading-state">
          <div className="spinner-container">
            <div className="spinner"></div>
          </div>
          <p className="loading-text">Checking registration status...</p>
        </div>
      </div>
    );
  }

  // Render registration required state
  if (!registrationStatus?.is_registered) {
    const requiredStake = 10000; // 10,000 ALEX
    const userStake = parseFloat(stakedAlexBalance || 0);
    const canRegister = userStake >= requiredStake;

    return (
      <div className="alexandria-proposals">
        <div className="proposals-header">
          <h2>Alexandria DAO Proposals</h2>
        </div>

        {error && (
          <div className="error-banner">
            <div className="error-icon"></div>
            <div className="error-content">
              <strong>Error</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="registration-banner">
          <div className="registration-header">
            <div className="registration-icon"></div>
            <h3>DAO Membership Required</h3>
            <p className="registration-subtitle">To view and participate in Alexandria DAO proposals, you need to be registered as an Orbit Station operator.</p>
          </div>
          
          <div className="stake-status-card">
            <h4>Your Staking Status</h4>
            <div className="stake-item">
              <span className="stake-label">Current Staked ALEX:</span>
              <span className="stake-value">{userStake.toLocaleString()} ALEX</span>
            </div>
            <div className="stake-item">
              <span className="stake-label">Required for Registration:</span>
              <span className="stake-value">{requiredStake.toLocaleString()} ALEX</span>
            </div>
            <div className="stake-item">
              <span className="stake-label">Status:</span>
              <span className={`stake-status ${canRegister ? 'status-eligible' : 'status-insufficient'}`}>
                {canRegister ? 'Eligible' : 'Insufficient Stake'}
              </span>
            </div>
          </div>

          <div className="registration-actions">
            {canRegister ? (
              <>
                <p className="register-success-message">
                  Congratulations! You meet the requirements and can register now.
                </p>
                <button 
                  className={`btn-register ${registering ? 'registering' : ''}`}
                  onClick={handleRegisterForOrbit} 
                  disabled={registering}
                >
                  {registering ? 'Registering...' : 'Register as DAO Member'}
                </button>
              </>
            ) : (
              <div className="insufficient-stake-info">
                <p className="shortage-message">
                  You need {(requiredStake - userStake).toLocaleString()} more staked ALEX to register.
                </p>
                <div className="stake-instructions">
                  <p>To get more staked ALEX:</p>
                  <ol>
                    <li>Go to <a href="https://app.icpswap.com/swap" target="_blank" rel="noopener noreferrer">ICP Swap</a></li>
                    <li>Swap ICP for more ALEX tokens</li>
                    <li>Stake your ALEX in the liquidity pool</li>
                    <li>Return here once you have {requiredStake.toLocaleString()} staked ALEX</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // User is registered - show proposals interface
  return (
    <div className="alexandria-proposals">
      <div className="proposals-header">
        <h2>Alexandria DAO Proposals</h2>
      </div>

      {/* Registration Success Banner */}
      <div className="member-status-banner">
        <div className="status-content">
          <div className="status-icon"></div>
          <div className="status-text">
            <strong>Registered DAO Member</strong>
            <span>You can now view and interact with DAO proposals</span>
          </div>
        </div>
        {registrationStatus?.user_name && (
          <span className="member-id">
            {registrationStatus.user_name}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="proposals-filters">
        <div className="filter-group">
          <label>Status</label>
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
        
        <button 
          className="btn-refresh"
          onClick={() => fetchProposals()}
        >
          Refresh
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <div className="error-icon"></div>
          <div className="error-content">
            <strong>Error</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner-container">
            <div className="spinner"></div>
          </div>
          <p className="loading-text">Loading proposals...</p>
        </div>
      ) : (
        /* Proposals List */
        <div className="proposals-list">
          {proposals.length === 0 ? (
            <div className="no-proposals">
              <div className="no-proposals-icon"></div>
              <p>No proposals found</p>
              <p className="text-muted">
                Try adjusting your filters or check back later for new proposals
              </p>
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

      {/* Proposal Details Modal */}
      {showDetails && selectedProposal && (
        <ProposalDetailsModal
          proposal={selectedProposal}
          onClose={closeDetails}
        />
      )}

      {/* Pagination */}
      {proposals.length > 0 && (
        <div className="pagination">
          <button 
            onClick={() => handleFilterChange({ offset: Math.max(0, filter.offset - filter.limit) })}
            disabled={filter.offset === 0}
          >
            ← Previous
          </button>
          <span className="page-info">Page {Math.floor(filter.offset / filter.limit) + 1}</span>
          <button 
            onClick={() => handleFilterChange({ offset: filter.offset + filter.limit })}
            disabled={proposals.length < filter.limit}
          >
            Next →
          </button>
        </div>
      )}

    </div>
  );
};

export default AlexandriaProposals;