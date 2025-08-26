import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useIdentity } from '../hooks/useIdentity';
import { OrbitStationService } from '../services/orbitStation';
import { DAOPadBackendService } from '../services/daopadBackend';
import ProposalCard from './ProposalCard';
import ProposalDetailsModal from './ProposalDetailsModal';

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

  // Initialize services when identity changes
  useEffect(() => {
    setOrbitService(new OrbitStationService(identity));
    setDaopadService(new DAOPadBackendService(identity));
  }, [identity]);

  // Check registration status when DAOPad service is ready
  useEffect(() => {
    const checkRegistration = async () => {
      if (!daopadService || !isAuthenticated) {
        setRegistrationStatus(null);
        setLoading(false);
        return;
      }
      
      setCheckingRegistration(true);
      try {
        const result = await daopadService.checkRegistrationStatus();
        console.log('Registration status check result:', result);
        if (result.success) {
          setRegistrationStatus(result.data);
          // If registered, proceed to fetch proposals
          if (result.data.is_registered && orbitService) {
            await fetchProposals();
          } else {
            setLoading(false);
          }
        } else {
          console.error('Failed to check registration:', result.error);
          setError(`Failed to check registration status: ${result.error}`);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error checking registration status:', err);
        setError(`Failed to check registration status: ${err.message}`);
        setLoading(false);
      } finally {
        setCheckingRegistration(false);
      }
    };

    checkRegistration();
  }, [daopadService, orbitService, isAuthenticated]);
  
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
        setError(result.error || 'Failed to load proposals');
      }
    } catch (err) {
      console.error('Error loading proposals:', err);
      setError(`Failed to connect to Alexandria DAO: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

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

  // Re-fetch proposals when filter changes (only if registered)
  useEffect(() => {
    if (registrationStatus?.is_registered && orbitService) {
      fetchProposals();
    }
  }, [filter, registrationStatus?.is_registered]);

  // Render authentication prompt
  if (!isAuthenticated) {
    return (
      <div className="alexandria-proposals">
        <div className="proposals-header">
          <h2>Alexandria DAO Proposals</h2>
        </div>
        <div className="auth-notice" style={{
          backgroundColor: '#e7f3ff',
          border: '1px solid #b3d9ff',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center',
          margin: '20px 0'
        }}>
          <h3>🔒 Authentication Required</h3>
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
        <div className="loading-container" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '20px'
          }}></div>
          <p>Checking registration status...</p>
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
          <div className="error-message" style={{
            backgroundColor: '#ffebee',
            border: '1px solid #ffcdd2',
            color: '#c62828',
            padding: '15px',
            borderRadius: '6px',
            margin: '10px 0'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="registration-required" style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          padding: '30px',
          borderRadius: '10px',
          margin: '20px 0',
          textAlign: 'center'
        }}>
          <h3>🎯 DAO Membership Required</h3>
          <p>To view and participate in Alexandria DAO proposals, you need to be registered as an Orbit Station operator.</p>
          
          <div className="stake-info" style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            margin: '20px 0',
            border: '1px solid #e0e0e0'
          }}>
            <h4>Your Staking Status:</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' }}>
              <span>Current Staked ALEX:</span>
              <strong>{userStake.toLocaleString()} ALEX</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' }}>
              <span>Required for Registration:</span>
              <strong>{requiredStake.toLocaleString()} ALEX</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' }}>
              <span>Status:</span>
              <strong style={{ color: canRegister ? '#27ae60' : '#e74c3c' }}>
                {canRegister ? '✅ Eligible' : '❌ Insufficient Stake'}
              </strong>
            </div>
          </div>

          {canRegister ? (
            <div>
              <p style={{ color: '#27ae60', fontWeight: 'bold', marginBottom: '15px' }}>
                🎉 Congratulations! You meet the requirements and can register now.
              </p>
              <button 
                className="register-button"
                onClick={handleRegisterForOrbit} 
                disabled={registering}
                style={{
                  backgroundColor: '#27ae60',
                  color: 'white',
                  border: 'none',
                  padding: '15px 30px',
                  borderRadius: '8px',
                  cursor: registering ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  opacity: registering ? 0.7 : 1
                }}
              >
                {registering ? '🔄 Registering...' : '🚀 Register as DAO Member'}
              </button>
            </div>
          ) : (
            <div>
              <p style={{ color: '#e74c3c', fontWeight: 'bold', marginBottom: '15px' }}>
                You need {(requiredStake - userStake).toLocaleString()} more staked ALEX to register.
              </p>
              <div style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
                <p><strong>To get more staked ALEX:</strong></p>
                <ol style={{ paddingLeft: '20px' }}>
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
    );
  }

  // User is registered - show proposals interface
  return (
    <div className="alexandria-proposals">
      <div className="proposals-header">
        <h2>Alexandria DAO Proposals</h2>
      </div>

      {/* Registration Success Banner */}
      <div className="registration-success" style={{
        backgroundColor: '#d4edda',
        border: '1px solid #c3e6cb',
        color: '#155724',
        padding: '12px 20px',
        borderRadius: '6px',
        margin: '10px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <strong>✅ Registered DAO Member</strong>
          <span style={{ marginLeft: '10px', fontSize: '14px', opacity: 0.8 }}>
            You can now view and interact with DAO proposals
          </span>
        </div>
        {registrationStatus?.user_name && (
          <span style={{ fontSize: '14px', fontFamily: 'monospace' }}>
            {registrationStatus.user_name}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="proposals-filters" style={{
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '8px',
        margin: '15px 0'
      }}>
        <div className="filter-group">
          <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Status:</label>
          <select 
            value={filter.status || ''} 
            onChange={(e) => handleFilterChange({ status: e.target.value || null })}
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              marginRight: '20px'
            }}
          >
            <option value="">All</option>
            <option value="Created">Created</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Completed">Completed</option>
            <option value="Failed">Failed</option>
          </select>
          
          <button 
            onClick={() => fetchProposals()}
            style={{
              padding: '8px 15px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message" style={{
          backgroundColor: '#ffebee',
          border: '1px solid #ffcdd2',
          color: '#c62828',
          padding: '15px',
          borderRadius: '6px',
          margin: '10px 0'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="loading-container" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '20px'
          }}></div>
          <p>Loading proposals...</p>
        </div>
      ) : (
        /* Proposals List */
        <div className="proposals-list">
          {proposals.length === 0 ? (
            <div className="no-proposals" style={{
              textAlign: 'center',
              padding: '40px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              margin: '20px 0'
            }}>
              <p style={{ fontSize: '18px', marginBottom: '10px' }}>📋 No proposals found</p>
              <p className="text-muted" style={{ color: '#6c757d' }}>
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
        <div className="pagination" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          margin: '20px 0',
          padding: '20px'
        }}>
          <button 
            onClick={() => handleFilterChange({ offset: Math.max(0, filter.offset - filter.limit) })}
            disabled={filter.offset === 0}
            style={{
              padding: '10px 15px',
              backgroundColor: filter.offset === 0 ? '#e9ecef' : '#007bff',
              color: filter.offset === 0 ? '#6c757d' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: filter.offset === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            ← Previous
          </button>
          <span>Page {Math.floor(filter.offset / filter.limit) + 1}</span>
          <button 
            onClick={() => handleFilterChange({ offset: filter.offset + filter.limit })}
            disabled={proposals.length < filter.limit}
            style={{
              padding: '10px 15px',
              backgroundColor: proposals.length < filter.limit ? '#e9ecef' : '#007bff',
              color: proposals.length < filter.limit ? '#6c757d' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: proposals.length < filter.limit ? 'not-allowed' : 'pointer'
            }}
          >
            Next →
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AlexandriaProposals;