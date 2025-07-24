import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { HttpAgent, Actor } from "@dfinity/agent";
import { idlFactory } from '../../../declarations/daopad_backend';

function ProposalsTab({ prefilledPoolId }) {
  const { principal, isAuthenticated } = useSelector(state => state.auth);
  const { stakedAlexBalance } = useSelector(state => state.balance);
  const [actor, setActor] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creatingProposal, setCreatingProposal] = useState(false);
  const [newPoolId, setNewPoolId] = useState('');
  const [acceptingProposal, setAcceptingProposal] = useState({});
  const [expandedOperatorForm, setExpandedOperatorForm] = useState({});
  const [orbitPrincipal, setOrbitPrincipal] = useState('');
  const [joiningAsOperator, setJoiningAsOperator] = useState({});

  useEffect(() => {
    const setupActor = async () => {
      try {
        const isLocal = import.meta.env.VITE_DFX_NETWORK === "local";
        const host = isLocal ? "http://localhost:4943" : "https://ic0.app";
        
        console.log("Setting up actor, isLocal:", isLocal);
        
        const agent = new HttpAgent({ host });
        
        if (isLocal) {
          await agent.fetchRootKey();
        }
        
        const canisterId = import.meta.env.VITE_CANISTER_ID_DAOPAD_BACKEND || 
                          import.meta.env.VITE_DAOPAD_BACKEND_CANISTER_ID ||
                          "ucwa4-rx777-77774-qaada-cai"; // Hardcoded fallback for local dev
        
        console.log("Backend canister ID:", canisterId);
        
        if (!canisterId) {
          throw new Error("Backend canister ID not found in environment variables");
        }
        
        const daopadActor = Actor.createActor(idlFactory, {
          agent,
          canisterId,
        });
        
        setActor(daopadActor);
        console.log("Actor created successfully");
      } catch (error) {
        console.error("Failed to setup actor:", error);
        setError("Failed to connect to backend");
        setLoading(false);
      }
    };
    
    setupActor();
  }, []);

  useEffect(() => {
    if (actor) {
      loadProposals();
    }
  }, [actor]);

  useEffect(() => {
    if (prefilledPoolId) {
      setNewPoolId(prefilledPoolId);
    }
  }, [prefilledPoolId]);

  const loadProposals = async () => {
    if (!actor) return;
    
    try {
      setLoading(true);
      setError(null);
      const result = await actor.list_proposals();
      console.log("Proposals loaded:", result);
      setProposals(result);
    } catch (error) {
      console.error("Failed to load proposals:", error);
      setError("Failed to load proposals");
    } finally {
      setLoading(false);
    }
  };

  const validatePoolId = (id) => {
    // Validate that it's a positive integer
    const poolId = parseInt(id.trim());
    return !isNaN(poolId) && poolId >= 0;
  };

  const createProposal = async () => {
    if (!actor || !newPoolId.trim()) return;
    
    const trimmedId = newPoolId.trim();
    if (!validatePoolId(trimmedId)) {
      alert("Invalid pool ID. Please enter a number (e.g., 1, 2, 3...)");
      return;
    }

    try {
      setCreatingProposal(true);
      const poolId = parseInt(trimmedId);
      const result = await actor.create_proposal(poolId);
      
      if (result.Ok !== undefined) {
        alert(`Proposal created successfully! ID: ${result.Ok}`);
        setNewPoolId('');
        loadProposals();
      } else if (result.Err) {
        alert(`Error: ${result.Err}`);
      }
    } catch (error) {
      console.error("Failed to create proposal:", error);
      alert("Failed to create proposal: " + error.message);
    } finally {
      setCreatingProposal(false);
    }
  };

  const acceptProposal = async (proposalId) => {
    if (!actor) return;

    const balance = parseFloat(stakedAlexBalance);
    if (balance <= 0) {
      alert("You need staked ALEX to accept proposals!");
      return;
    }

    try {
      setAcceptingProposal({ ...acceptingProposal, [proposalId]: true });
      
      const result = await actor.accept_proposal(proposalId, stakedAlexBalance);
      
      if (result.Ok) {
        alert(result.Ok);
        loadProposals();
      } else if (result.Err) {
        alert(`Error: ${result.Err}`);
      }
    } catch (error) {
      console.error("Failed to accept proposal:", error);
      alert("Failed to accept proposal: " + error.message);
    } finally {
      setAcceptingProposal({ ...acceptingProposal, [proposalId]: false });
    }
  };

  const handleJoinAsOperator = async (stationId, proposalId) => {
    if (!orbitPrincipal || !orbitPrincipal.trim()) {
      alert("Please enter your Orbit principal");
      return;
    }

    try {
      setJoiningAsOperator(prev => ({ ...prev, [proposalId]: true }));
      
      const result = await actor.add_me_to_station(stationId, orbitPrincipal.trim());
      
      if (result.Ok) {
        alert(`Success! ${result.Ok}\n\nYou can now access this station in Orbit UI at:\nhttps://orbitstation.org/station/${stationId}`);
        setOrbitPrincipal('');
        setExpandedOperatorForm(prev => ({ ...prev, [proposalId]: false }));
      } else if (result.Err) {
        alert(`Error: ${result.Err}`);
      } else {
        alert("Unexpected response from server");
      }
    } catch (error) {
      console.error("Failed to join as operator:", error);
      alert("Failed to join as operator: " + error.message);
    } finally {
      setJoiningAsOperator(prev => ({ ...prev, [proposalId]: false }));
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(Number(timestamp) / 1000000); // Convert nanoseconds to milliseconds
    return date.toLocaleString();
  };

  const formatPrincipal = (principal) => {
    const str = principal.toString();
    return `${str.slice(0, 5)}...${str.slice(-4)}`;
  };

  const formatTokenAmount = (amount, decimals) => {
    // Handle BigInt conversion
    const amountStr = amount.toString();
    const divisor = Math.pow(10, decimals);
    const value = Number(amountStr) / divisor;
    
    // For very large numbers, use exponential notation
    if (value > 1e15) {
      return value.toExponential(2);
    }
    
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const getStatusColor = (status) => {
    console.log("Status object:", status);
    if (status && (status.Pending !== undefined || status === 'Pending')) return '#ff9800';
    if (status && (status.Accepted !== undefined || status === 'Accepted')) return '#4caf50';
    if (status && (status.Executed !== undefined || status === 'Executed')) return '#2196f3';
    return '#666';
  };

  const getStatusText = (status) => {
    console.log("Status for text:", status);
    if (status && (status.Pending !== undefined || status === 'Pending')) return 'Pending';
    if (status && (status.Accepted !== undefined || status === 'Accepted')) return 'Accepted';
    if (status && (status.Executed !== undefined || status === 'Executed')) return 'Executed';
    return 'Unknown';
  };

  if (loading) {
    return (
      <div className="proposals-tab">
        <h2>DAOs</h2>
        <p>Loading pool proposals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="proposals-tab">
        <h2>DAOs</h2>
        <p className="error">Error: {error}</p>
        <button onClick={loadProposals}>Retry</button>
      </div>
    );
  }

  const canAcceptProposals = parseFloat(stakedAlexBalance) > 0;

  return (
    <div className="proposals-tab">
      <h2>DAOs</h2>
      
      {isAuthenticated && (
        <div className="create-proposal-section">
          <h3>Propose a New DAO</h3>
          <div className="proposal-form">
            <input
              type="number"
              placeholder="Enter LbryFun pool ID (e.g. 1, 2, 3...)"
              value={newPoolId}
              onChange={(e) => setNewPoolId(e.target.value)}
              disabled={creatingProposal}
              min="0"
            />
            <button 
              onClick={createProposal}
              disabled={creatingProposal || !newPoolId.trim()}
            >
              {creatingProposal ? "Creating..." : "Create Proposal"}
            </button>
          </div>
          <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
            Enter the pool ID from LbryFun to create a DAO proposal
          </small>
        </div>
      )}

      <div className="proposals-list">
        <h3>Active DAOs</h3>
        
        {!canAcceptProposals && parseFloat(stakedAlexBalance) === 0 && (
          <div className="stake-notice">
            <p>⚠️ You need staked ALEX to accept proposals. Current staked balance: {stakedAlexBalance}</p>
          </div>
        )}

        {proposals.length === 0 ? (
          <p>No proposals yet. Be the first to create one!</p>
        ) : (
          <div className="proposals-grid">
            {proposals.map((proposal) => (
              <div key={proposal.id} className="proposal-card">
                <div className="proposal-header">
                  {proposal.pool_info && proposal.pool_info.length > 0 ? (
                    <div>
                      <h4>
                        {proposal.pool_info[0].primary_token_symbol} / {proposal.pool_info[0].secondary_token_symbol}
                      </h4>
                      <small style={{ color: '#666' }}>
                        {proposal.pool_info[0].primary_token_name}
                      </small>
                      {proposal.pool_info[0].pool_creation_failed && (
                        <small style={{ color: '#f44336', display: 'block' }}>
                          ⚠️ Pool creation failed
                        </small>
                      )}
                    </div>
                  ) : (
                    <h4>Pool ID: #{proposal.lbryfun_pool_id}</h4>
                  )}
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(proposal.status) }}
                  >
                    {getStatusText(proposal.status)}
                  </span>
                </div>
                
                <div className="proposal-details">
                  <p><strong>Proposal ID:</strong> #{proposal.id}</p>
                  <p><strong>LbryFun Pool ID:</strong> #{proposal.lbryfun_pool_id}</p>
                  <p><strong>Proposer:</strong> {formatPrincipal(proposal.proposer)}</p>
                  <p><strong>Created:</strong> {formatTimestamp(proposal.created_at)}</p>
                  
                  {proposal.pool_info && proposal.pool_info.length > 0 && (
                    <>
                      <p><strong>Max Supply:</strong> {formatTokenAmount(proposal.pool_info[0].primary_token_max_supply, 8)}</p>
                      <p><strong>Halving:</strong> {proposal.pool_info[0].halving_step}%</p>
                      <p><strong>Pool Created:</strong> {proposal.pool_info[0].pool_created_at > 0 ? formatTimestamp(proposal.pool_info[0].pool_created_at) : 'Not yet'}</p>
                    </>
                  )}
                  
                  {proposal.accepted_by && proposal.accepted_by.length > 0 && (
                    <>
                      <p><strong>Accepted by:</strong> {formatPrincipal(proposal.accepted_by[0])}</p>
                      <p><strong>Accepted at:</strong> {formatTimestamp(proposal.accepted_at[0])}</p>
                    </>
                  )}
                  
                  {proposal.station_id && proposal.station_id.length > 0 && (
                    <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
                      <p><strong>🚀 Orbit Station Created!</strong></p>
                      <p style={{ fontSize: '0.85em', marginTop: '5px' }}>
                        Station ID: {proposal.station_id[0]}
                      </p>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                        <a 
                          href={`https://orbitstation.org/station/${proposal.station_id[0]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#2196f3' }}
                        >
                          View in Orbit →
                        </a>
                        {isAuthenticated && (
                          <button
                            onClick={() => setExpandedOperatorForm(prev => ({ ...prev, [proposal.id]: !prev[proposal.id] }))}
                            style={{ 
                              background: 'none', 
                              border: '1px solid #2196f3', 
                              color: '#2196f3', 
                              padding: '2px 10px', 
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            {expandedOperatorForm[proposal.id] ? 'Cancel' : 'Join as Operator'}
                          </button>
                        )}
                      </div>
                      
                      {expandedOperatorForm[proposal.id] && (
                        <div style={{ marginTop: '15px', borderTop: '1px solid #ddd', paddingTop: '15px' }}>
                          <p style={{ fontSize: '0.9em', marginBottom: '10px' }}>
                            Add yourself as an operator to help manage this DAO:
                          </p>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder="Enter your Orbit principal"
                              value={orbitPrincipal}
                              onChange={(e) => setOrbitPrincipal(e.target.value)}
                              disabled={joiningAsOperator[proposal.id]}
                              style={{
                                flex: 1,
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid #ccc'
                              }}
                            />
                            <button
                              onClick={() => handleJoinAsOperator(proposal.station_id[0], proposal.id)}
                              disabled={joiningAsOperator[proposal.id] || !orbitPrincipal.trim()}
                              style={{
                                padding: '8px 16px',
                                borderRadius: '4px',
                                backgroundColor: joiningAsOperator[proposal.id] || !orbitPrincipal.trim() ? '#ccc' : '#2196f3',
                                color: 'white',
                                border: 'none',
                                cursor: joiningAsOperator[proposal.id] || !orbitPrincipal.trim() ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {joiningAsOperator[proposal.id] ? 'Joining...' : 'Join'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                </div>

                <div className="voting-section">
                  <div className="voting-progress">
                    <div className="progress-bar-container">
                      <div className="progress-bar" style={{ width: '65%' }}></div>
                    </div>
                    <div className="progress-text">
                      <span>65% Approved</span>
                      <span style={{ fontSize: '0.85em', color: '#666' }}>13 of 20 votes</span>
                    </div>
                  </div>
                  
                  {(proposal.status && (proposal.status.Pending !== undefined || proposal.status === 'Pending')) && isAuthenticated && (
                    <div className="proposal-actions">
                      <h4>Cast Your Vote</h4>
                      <div className="vote-buttons">
                        <button
                          onClick={() => acceptProposal(proposal.id)}
                          disabled={!canAcceptProposals || acceptingProposal[proposal.id]}
                          className="vote-button accept-button"
                        >
                          {acceptingProposal[proposal.id] ? "Processing..." : "✓ Accept"}
                        </button>
                        <button
                          onClick={() => alert('Reject functionality coming soon!')}
                          disabled={!canAcceptProposals}
                          className="vote-button reject-button"
                        >
                          ✗ Reject
                        </button>
                      </div>
                      {!canAcceptProposals && (
                        <small style={{ marginTop: '10px', display: 'block' }}>Requires staked ALEX to vote</small>
                      )}
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProposalsTab;