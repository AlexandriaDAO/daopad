import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { HttpAgent, Actor } from "@dfinity/agent";
import { idlFactory } from '../../../declarations/daopad_backend';

function ProposalsTab() {
  const { principal, isAuthenticated } = useSelector(state => state.auth);
  const { stakedAlexBalance } = useSelector(state => state.balance);
  const [actor, setActor] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creatingProposal, setCreatingProposal] = useState(false);
  const [newPoolCanisterId, setNewPoolCanisterId] = useState('');
  const [acceptingProposal, setAcceptingProposal] = useState({});

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

  const validateCanisterId = (id) => {
    // Basic validation for Principal format
    const principalRegex = /^[a-z0-9]{5}(-[a-z0-9]{5})*-cai$/;
    return principalRegex.test(id.trim());
  };

  const createProposal = async () => {
    if (!actor || !newPoolCanisterId.trim()) return;
    
    const trimmedId = newPoolCanisterId.trim();
    if (!validateCanisterId(trimmedId)) {
      alert("Invalid canister ID format. Example: xxxxx-xxxxx-xxxxx-xxxxx-cai");
      return;
    }

    try {
      setCreatingProposal(true);
      const result = await actor.create_proposal(trimmedId);
      
      if (result.Ok !== undefined) {
        alert(`Proposal created successfully! ID: ${result.Ok}`);
        setNewPoolCanisterId('');
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
        <h2>lbryfun Pool Proposals</h2>
        <p>Loading pool proposals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="proposals-tab">
        <h2>lbryfun Pool Proposals</h2>
        <p className="error">Error: {error}</p>
        <button onClick={loadProposals}>Retry</button>
      </div>
    );
  }

  const canAcceptProposals = parseFloat(stakedAlexBalance) > 0;

  return (
    <div className="proposals-tab">
      <h2>lbryfun Pool Proposals</h2>
      
      {isAuthenticated && (
        <div className="create-proposal-section">
          <h3>Propose an lbryfun Pool</h3>
          <div className="proposal-form">
            <input
              type="text"
              placeholder="Enter pool canister ID (e.g. xxxxx-xxxxx-xxxxx-xxxxx-cai)"
              value={newPoolCanisterId}
              onChange={(e) => setNewPoolCanisterId(e.target.value)}
              disabled={creatingProposal}
            />
            <button 
              onClick={createProposal}
              disabled={creatingProposal || !newPoolCanisterId.trim()}
            >
              {creatingProposal ? "Creating..." : "Create Proposal"}
            </button>
          </div>
          <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
            Enter the canister ID of the primary token from an active lbryfun pool
          </small>
        </div>
      )}

      <div className="proposals-list">
        <h3>Pool Proposals</h3>
        
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
                  {proposal.token_info && proposal.token_info.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {proposal.token_info[0].logo_url && proposal.token_info[0].logo_url.length > 0 && (
                        <img 
                          src={proposal.token_info[0].logo_url[0]} 
                          alt={proposal.token_info[0].symbol}
                          style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <div>
                        <h4>{proposal.token_info[0].name} ({proposal.token_info[0].symbol})</h4>
                        <small style={{ color: '#666' }}>{formatPrincipal(proposal.pool_canister_id)}</small>
                      </div>
                    </div>
                  ) : (
                    <h4>Pool: {proposal.pool_canister_id}</h4>
                  )}
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(proposal.status) }}
                  >
                    {getStatusText(proposal.status)}
                  </span>
                </div>
                
                <div className="proposal-details">
                  <p><strong>ID:</strong> #{proposal.id}</p>
                  <p><strong>Proposer:</strong> {formatPrincipal(proposal.proposer)}</p>
                  <p><strong>Created:</strong> {formatTimestamp(proposal.created_at)}</p>
                  
                  {proposal.token_info && proposal.token_info.length > 0 && (
                    <>
                      {proposal.token_info[0].description && proposal.token_info[0].description.length > 0 && (
                        <p style={{ marginTop: '10px' }}>
                          <strong>Description:</strong><br />
                          <span style={{ fontSize: '0.9em', color: '#666' }}>
                            {proposal.token_info[0].description[0]}
                          </span>
                        </p>
                      )}
                      <p><strong>Total Supply:</strong> {formatTokenAmount(proposal.token_info[0].total_supply, proposal.token_info[0].decimals)}</p>
                    </>
                  )}
                  
                  {proposal.accepted_by && proposal.accepted_by.length > 0 && (
                    <>
                      <p><strong>Accepted by:</strong> {formatPrincipal(proposal.accepted_by[0])}</p>
                      <p><strong>Accepted at:</strong> {formatTimestamp(proposal.accepted_at[0])}</p>
                    </>
                  )}
                  
                </div>

                {(proposal.status && (proposal.status.Pending !== undefined || proposal.status === 'Pending')) && isAuthenticated && (
                  <div className="proposal-actions">
                    <button
                      onClick={() => acceptProposal(proposal.id)}
                      disabled={!canAcceptProposals || acceptingProposal[proposal.id]}
                      className="accept-button"
                    >
                      {acceptingProposal[proposal.id] ? "Processing..." : "Accept Proposal"}
                    </button>
                    {!canAcceptProposals && (
                      <small>Requires staked ALEX</small>
                    )}
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProposalsTab;