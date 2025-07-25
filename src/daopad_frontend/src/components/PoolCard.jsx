import React, { useState, useEffect, useRef } from 'react';
import { Principal } from '@dfinity/principal';
import { useSelector } from 'react-redux';
import { HttpAgent, Actor } from "@dfinity/agent";
import { idlFactory } from '../../../declarations/daopad_backend';
import { lbryfunService } from '../services/lbryfunService';

// Custom hook for intersection observer
const useIsVisible = (ref) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    
    if (ref.current) observer.observe(ref.current);
    
    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [ref]);
  
  return isVisible;
};

function PoolCard({ pool }) {
  const { principal, isAuthenticated } = useSelector(state => state.auth);
  const { stakedAlexBalance } = useSelector(state => state.balance);
  const [poolStatus, setPoolStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [actor, setActor] = useState(null);
  const [enrichedData, setEnrichedData] = useState(null);
  const [tokenMetadata, setTokenMetadata] = useState({
    primary: null,
    secondary: null
  });
  const [showModal, setShowModal] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState({});
  const [operatorPrincipal, setOperatorPrincipal] = useState('');
  const [addingOperator, setAddingOperator] = useState(false);
  
  const cardRef = useRef(null);
  const isVisible = useIsVisible(cardRef);
  const formatDate = (timestamp) => {
    // Convert nanoseconds to milliseconds
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatTimeRemaining = (seconds) => {
    if (seconds <= 0) return 'Live now';
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds/60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds/3600)}h ${Math.floor((seconds%3600)/60)}m`;
    return `${Math.floor(seconds/86400)}d ${Math.floor((seconds%86400)/3600)}h`;
  };

  const formatNumber = (num) => {
    if (num >= 1e6) return `${(num/1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num/1e3).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const getPoolStatus = () => {
    if (pool.pool_creation_failed) {
      return { text: 'FAILED', className: 'status-failed' };
    }
    if (pool.isLive) {
      return { text: 'LIVE', className: 'status-live' };
    }
    return { text: 'PENDING', className: 'status-pending' };
  };

  const status = getPoolStatus();

  const handleTrade = () => {
    // Navigate to lbryfun trading interface
    const lbryfunUrl = `http://localhost:4943/?canisterId=lrtgb-fqaaa-aaaap-qp2qa-cai#/token/${pool.id}`;
    window.open(lbryfunUrl, '_blank');
  };

  const handleViewOnKong = () => {
    // Navigate to Kong interface
    // This would need the actual Kong URL for the pool
    alert('Kong integration coming soon!');
  };

  const copyCanisterId = async (canisterType, canisterId) => {
    try {
      await navigator.clipboard.writeText(canisterId.toString());
      setCopyFeedback({ ...copyFeedback, [canisterType]: true });
      setTimeout(() => {
        setCopyFeedback(prev => ({ ...prev, [canisterType]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  useEffect(() => {
    setupActor();
  }, []);

  useEffect(() => {
    if (actor) {
      fetchPoolStatus();
    }
  }, [actor]);

  // Load enriched data when card becomes visible
  useEffect(() => {
    if (isVisible && !enrichedData) {
      loadEnrichedData();
    }
  }, [isVisible]);

  const loadEnrichedData = async () => {
    try {
      // Get enhanced pool data
      const enhanced = await lbryfunService.getEnhancedPoolData(pool);
      setEnrichedData(enhanced);
      
      // Fetch token metadata
      const [primaryMeta, secondaryMeta] = await Promise.all([
        lbryfunService.getTokenMetadataCached(pool.primary_token_id),
        lbryfunService.getTokenMetadataCached(pool.secondary_token_id)
      ]);
      
      setTokenMetadata({
        primary: primaryMeta,
        secondary: secondaryMeta
      });
    } catch (error) {
      console.error('Error loading enriched data:', error);
    }
  };

  const setupActor = async () => {
    try {
      const isLocal = import.meta.env.VITE_DFX_NETWORK === "local";
      const host = isLocal ? "http://localhost:4943" : "https://ic0.app";
      const agent = new HttpAgent({ host });
      
      if (isLocal) {
        await agent.fetchRootKey();
      }
      
      const canisterId = import.meta.env.CANISTER_ID_DAOPAD_BACKEND || 
                        "ulvla-h7777-77774-qaacq-cai";
      
      const daopadActor = Actor.createActor(idlFactory, {
        agent,
        canisterId,
      });
      
      setActor(daopadActor);
    } catch (error) {
      console.error("Failed to setup actor:", error);
      setLoading(false);
    }
  };

  const fetchPoolStatus = async () => {
    try {
      setLoading(true);
      const status = await actor.get_pool_status(pool.id);
      setPoolStatus(status);
    } catch (error) {
      console.error("Failed to fetch pool status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!actor || !stakedAlexBalance || parseFloat(stakedAlexBalance) <= 0) {
      alert("You need staked ALEX to vote!");
      return;
    }

    try {
      setVoting(true);
      const result = await actor.vote(pool.id, stakedAlexBalance);
      
      if (result.Ok) {
        if (result.Ok.Voted) {
          alert(`Vote successful! Total votes: ${result.Ok.Voted.new_total.toFixed(2)}/20 ALEX`);
        } else if (result.Ok.DaoCreated) {
          alert(`DAO Created! Station ID: ${result.Ok.DaoCreated.station_id}\nTotal votes: ${result.Ok.DaoCreated.total_votes.toFixed(2)} ALEX`);
        }
        fetchPoolStatus(); // Refresh status
      } else if (result.Err) {
        alert(`Error: ${result.Err}`);
      }
    } catch (error) {
      console.error("Failed to vote:", error);
      alert("Failed to vote: " + error.message);
    } finally {
      setVoting(false);
    }
  };

  const handleAddOperator = async () => {
    if (!operatorPrincipal || !operatorPrincipal.trim()) {
      alert("Please enter an Orbit principal");
      return;
    }

    if (!poolStatus?.station_id || poolStatus.station_id.length === 0) {
      alert("No station ID found for this DAO");
      return;
    }

    try {
      setAddingOperator(true);
      const stationId = poolStatus.station_id[0];
      const result = await actor.add_me_to_station(stationId, operatorPrincipal.trim());
      
      if (result.Ok) {
        alert(`Success! ${result.Ok}\n\nThe operator can now access this station in Orbit UI at:\nhttps://orbitstation.org/station/${stationId}`);
        setOperatorPrincipal(''); // Clear input
      } else if (result.Err) {
        alert(`Error: ${result.Err}`);
      }
    } catch (error) {
      console.error("Failed to add operator:", error);
      alert("Failed to add operator: " + error.message);
    } finally {
      setAddingOperator(false);
    }
  };

  const handleCardClick = (e) => {
    // Don't open modal if clicking on voting button
    if (e.target.closest('.vote-button')) {
      return;
    }
    setShowModal(true);
  };

  return (
    <>
      <div className="pool-card-compact" ref={cardRef} onClick={handleCardClick}>
        {/* Pool ID */}
        <div className="pool-id">#{pool.id.toString()}</div>
        
        {/* Status badge */}
        <div className={`status-badge ${status.className}`}>
          {status.text}
        </div>
        
        {/* Token logos and symbols */}
        <div className="token-display">
          <div className="token-logos">
            {tokenMetadata.primary?.logo ? (
              <img 
                src={tokenMetadata.primary.logo} 
                alt={pool.primary_token_symbol}
                className="token-logo primary"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="token-logo-placeholder primary">
                {pool.primary_token_symbol.charAt(0)}
              </div>
            )}
            {tokenMetadata.secondary?.logo ? (
              <img 
                src={tokenMetadata.secondary.logo} 
                alt={pool.secondary_token_symbol}
                className="token-logo secondary"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="token-logo-placeholder secondary">
                {pool.secondary_token_symbol.charAt(0)}
              </div>
            )}
          </div>
          <div className="token-symbols">
            <span className="primary">{pool.primary_token_symbol}</span>
            <span className="separator">/</span>
            <span className="secondary">{pool.secondary_token_symbol}</span>
          </div>
        </div>

        {/* Compact metrics */}
        <div className="pool-metrics-compact">
          <div className="metric-item">
            <span className="value">{enrichedData?.tvl ? `$${formatNumber(enrichedData.tvl)}` : '-'}</span>
            <span className="label">TVL</span>
          </div>
          <div className="metric-item">
            <span className="value">{enrichedData?.supplyPercentage || '0'}%</span>
            <span className="label">Supply</span>
          </div>
        </div>

        {/* Time until live countdown */}
        {!pool.isLive && enrichedData?.timeUntilLive > 0 && (
          <div className="countdown-compact">
            <span className="countdown-icon">⏱</span>
            <span>{formatTimeRemaining(enrichedData.timeUntilLive)}</span>
          </div>
        )}

        {/* Voting section - always visible */}
        <div className="voting-section">
          {loading ? (
            <div className="loading-state">Loading...</div>
          ) : poolStatus && poolStatus.dao_created ? (
            <div className="dao-created-badge">
              <span>✅ DAO Created</span>
            </div>
          ) : (
            <>
              <div className="vote-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min((poolStatus?.current_votes || 0) / 20 * 100, 100)}%` }}></div>
                </div>
                <span className="progress-text">{poolStatus?.current_votes?.toFixed(1) || '0'}/20 ALEX</span>
              </div>
              {isAuthenticated && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVote();
                  }} 
                  className="vote-button"
                  disabled={voting || poolStatus?.has_user_voted || parseFloat(stakedAlexBalance) <= 0}
                >
                  {voting ? "Voting..." : 
                   poolStatus?.has_user_voted ? "Voted" :
                   parseFloat(stakedAlexBalance) <= 0 ? "Need ALEX" :
                   "Vote"}
                </button>
              )}
            </>
          )}
        </div>
        
        {/* Status messages */}
        {!pool.isLive && !pool.pool_creation_failed && (
          <div className="status-message pending">
            Pool pending launch
          </div>
        )}
        {pool.pool_creation_failed && (
          <div className="status-message failed">
            Pool failed - DAO available
          </div>
        )}
      </div>
      
      {/* Modal for full details */}
      {showModal && (
        <div className="pool-details-modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            <h3>{pool.primary_token_symbol}/{pool.secondary_token_symbol} Details</h3>
            
            <div className="details-section">
              <h4>Pool Information</h4>
              <div className="detail-row">
                <span>Pool ID:</span>
                <span>#{pool.id.toString()}</span>
              </div>
              <div className="detail-row">
                <span>Created:</span>
                <span>{formatDate(pool.created_time)}</span>
              </div>
              {pool.pool_created_at > 0 && (
                <div className="detail-row">
                  <span>Pool Live:</span>
                  <span>{formatDate(pool.pool_created_at)}</span>
                </div>
              )}
            </div>
            
            <div className="details-section">
              <h4>Token Details</h4>
              <div className="detail-row">
                <span>Primary Token:</span>
                <span>{pool.primary_token_name}</span>
              </div>
              <div className="detail-row">
                <span>Secondary Token:</span>
                <span>{pool.secondary_token_name}</span>
              </div>
              <div className="detail-row">
                <span>Max Supply:</span>
                <span>{formatNumber(Number(pool.primary_token_max_supply) / 100000000)}</span>
              </div>
            </div>
            
            <div className="details-section">
              <h4>Tokenomics</h4>
              <div className="detail-row">
                <span>Halving Step:</span>
                <span>{pool.halving_step.toString()}%</span>
              </div>
              <div className="detail-row">
                <span>Initial Reward:</span>
                <span>{(Number(pool.initial_reward_per_burn_unit) / 100000000).toFixed(2)} per burn</span>
              </div>
              <div className="detail-row">
                <span>Distribution:</span>
                <span>Every {pool.distribution_interval_seconds.toString()}s</span>
              </div>
            </div>
            
            <div className="details-section">
              <h4>Canister IDs</h4>
              <div className="canister-row">
                <span>Primary Token:</span>
                <div className="canister-value">
                  <code>{pool.primary_token_id.toString()}</code>
                  <button onClick={() => copyCanisterId('primary', pool.primary_token_id)}>📋</button>
                </div>
              </div>
              <div className="canister-row">
                <span>Secondary Token:</span>
                <div className="canister-value">
                  <code>{pool.secondary_token_id.toString()}</code>
                  <button onClick={() => copyCanisterId('secondary', pool.secondary_token_id)}>📋</button>
                </div>
              </div>
              <div className="canister-row">
                <span>Swap:</span>
                <div className="canister-value">
                  <code>{pool.icp_swap_canister_id.toString()}</code>
                  <button onClick={() => copyCanisterId('swap', pool.icp_swap_canister_id)}>📋</button>
                </div>
              </div>
              <div className="canister-row">
                <span>Tokenomics:</span>
                <div className="canister-value">
                  <code>{pool.tokenomics_canister_id.toString()}</code>
                  <button onClick={() => copyCanisterId('tokenomics', pool.tokenomics_canister_id)}>📋</button>
                </div>
              </div>
              <div className="canister-row">
                <span>Logs:</span>
                <div className="canister-value">
                  <code>{pool.logs_canister_id.toString()}</code>
                  <button onClick={() => copyCanisterId('logs', pool.logs_canister_id)}>📋</button>
                </div>
              </div>
            </div>
            
            {/* DAO/Orbit Station Section */}
            {poolStatus && poolStatus.dao_created && poolStatus.station_id && poolStatus.station_id.length > 0 && (
              <div className="details-section">
                <h4>Orbit Station</h4>
                <div className="canister-row">
                  <span>Station ID:</span>
                  <div className="canister-value">
                    <code>{poolStatus.station_id[0]}</code>
                    <button 
                      onClick={() => copyCanisterId('station', poolStatus.station_id[0])}
                      title={copyFeedback.station ? "Copied!" : "Copy Station ID"}
                    >
                      {copyFeedback.station ? '✓' : '📋'}
                    </button>
                  </div>
                </div>
                <div className="station-info">
                  <p>Use this Station ID to add yourself to the Orbit wallet</p>
                </div>
              </div>
            )}
            
            {/* Action buttons in modal */}
            <div className="modal-actions">
              {pool.isLive && (
                <>
                  <button onClick={handleTrade} className="action-button primary">
                    Trade on LbryFun
                  </button>
                  <button onClick={handleViewOnKong} className="action-button secondary">
                    View on Kong
                  </button>
                </>
              )}
              {poolStatus && poolStatus.dao_created && poolStatus.station_id && poolStatus.station_id.length > 0 && (
                <a 
                  href={`https://orbitstation.org/station/${poolStatus.station_id[0]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-button success"
                >
                  View DAO in Orbit →
                </a>
              )}
            </div>
            
            {/* Add Operator Section - Only show for DAOs that have been created */}
            {poolStatus && poolStatus.dao_created && poolStatus.station_id && poolStatus.station_id.length > 0 && (
              <div className="details-section operator-section">
                <h4>Add Operator</h4>
                <div className="operator-form">
                  <input
                    type="text"
                    placeholder="Enter Orbit principal (e.g., xxxxx-xxxxx-xxxxx-xxxxx-xxx)"
                    value={operatorPrincipal}
                    onChange={(e) => setOperatorPrincipal(e.target.value)}
                    disabled={addingOperator}
                    className="operator-input"
                  />
                  <button
                    onClick={handleAddOperator}
                    disabled={addingOperator || !operatorPrincipal.trim()}
                    className="action-button primary"
                  >
                    {addingOperator ? 'Adding...' : 'Add Operator'}
                  </button>
                </div>
                <p className="operator-help">
                  Add a principal as an operator to manage this DAO in Orbit Station.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default PoolCard;