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
  const [newDaoName, setNewDaoName] = useState('');
  const [acceptingProposal, setAcceptingProposal] = useState({});

  useEffect(() => {
    const setupActor = async () => {
      const isLocal = import.meta.env.VITE_DFX_NETWORK === "local";
      const host = isLocal ? "http://localhost:4943" : "https://ic0.app";
      
      const agent = new HttpAgent({ host });
      
      if (isLocal) {
        await agent.fetchRootKey();
      }
      
      const canisterId = import.meta.env.VITE_CANISTER_ID_DAOPAD_BACKEND || 
                        import.meta.env.VITE_DAOPAD_BACKEND_CANISTER_ID;
      
      const daopadActor = Actor.createActor(idlFactory, {
        agent,
        canisterId,
      });
      
      setActor(daopadActor);
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
      setProposals(result);
    } catch (error) {
      console.error("Failed to load proposals:", error);
      setError("Failed to load proposals");
    } finally {
      setLoading(false);
    }
  };

  const createProposal = async () => {
    if (!actor || !newDaoName.trim()) return;

    try {
      setCreatingProposal(true);
      const result = await actor.create_proposal(newDaoName.trim());
      
      if (result.Ok !== undefined) {
        alert(`Proposal created successfully! ID: ${result.Ok}`);
        setNewDaoName('');
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

  const getStatusColor = (status) => {
    if (status.Pending) return '#ff9800';
    if (status.Accepted) return '#4caf50';
    if (status.Executed) return '#2196f3';
    return '#666';
  };

  const getStatusText = (status) => {
    if (status.Pending) return 'Pending';
    if (status.Accepted) return 'Accepted';
    if (status.Executed) return 'Executed';
    return 'Unknown';
  };

  if (loading) {
    return (
      <div className="proposals-tab">
        <h2>DAO Proposals</h2>
        <p>Loading proposals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="proposals-tab">
        <h2>DAO Proposals</h2>
        <p className="error">Error: {error}</p>
        <button onClick={loadProposals}>Retry</button>
      </div>
    );
  }

  const canAcceptProposals = parseFloat(stakedAlexBalance) > 0;

  return (
    <div className="proposals-tab">
      <h2>DAO Proposals</h2>
      
      {isAuthenticated && (
        <div className="create-proposal-section">
          <h3>Create a New Proposal</h3>
          <div className="proposal-form">
            <input
              type="text"
              placeholder="Enter DAO name..."
              value={newDaoName}
              onChange={(e) => setNewDaoName(e.target.value)}
              disabled={creatingProposal}
            />
            <button 
              onClick={createProposal}
              disabled={creatingProposal || !newDaoName.trim()}
            >
              {creatingProposal ? "Creating..." : "Create Proposal"}
            </button>
          </div>
        </div>
      )}

      <div className="proposals-list">
        <h3>Active Proposals</h3>
        
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
                  <h4>{proposal.dao_name}</h4>
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
                  
                  {proposal.accepted_by && proposal.accepted_by.length > 0 && (
                    <>
                      <p><strong>Accepted by:</strong> {formatPrincipal(proposal.accepted_by[0])}</p>
                      <p><strong>Accepted at:</strong> {formatTimestamp(proposal.accepted_at[0])}</p>
                    </>
                  )}
                  
                  {proposal.station_id && proposal.station_id.length > 0 && (
                    <p><strong>Station ID:</strong> <code>{proposal.station_id[0]}</code></p>
                  )}
                </div>

                {proposal.status.Pending && isAuthenticated && (
                  <div className="proposal-actions">
                    <button
                      onClick={() => acceptProposal(proposal.id)}
                      disabled={!canAcceptProposals || acceptingProposal[proposal.id]}
                      className="accept-button"
                    >
                      {acceptingProposal[proposal.id] ? "Processing..." : "Accept & Create DAO"}
                    </button>
                    {!canAcceptProposals && (
                      <small>Requires staked ALEX</small>
                    )}
                  </div>
                )}

                {proposal.status.Executed && proposal.station_id && proposal.station_id.length > 0 && (
                  <div className="proposal-actions">
                    <a 
                      href={`https://orbitstation.org/station/${proposal.station_id[0]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="view-station-link"
                    >
                      View Station →
                    </a>
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