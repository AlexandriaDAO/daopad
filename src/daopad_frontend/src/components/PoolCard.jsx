import React from 'react';
import { Principal } from '@dfinity/principal';

function PoolCard({ pool, onNavigateToProposal }) {
  const formatDate = (timestamp) => {
    // Convert nanoseconds to milliseconds
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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

  const handleCreateProposal = () => {
    if (onNavigateToProposal) {
      onNavigateToProposal(pool.id);
    } else {
      // Fallback: copy pool ID to clipboard
      navigator.clipboard.writeText(pool.id.toString()).then(() => {
        alert(`Pool ID ${pool.id} copied to clipboard! Go to the DAOs tab to create a proposal.`);
      }).catch(() => {
        alert(`Pool ID: ${pool.id} - Go to the DAOs tab and enter this ID to create a proposal.`);
      });
    }
  };

  return (
    <div className="pool-card paper">
      <div className="pool-header">
        <div className="token-pair">
          <div className="token-info">
            <h3>{pool.primary_token_symbol}</h3>
            <span className="token-name">{pool.primary_token_name}</span>
          </div>
          <span className="pair-separator">/</span>
          <div className="token-info">
            <h3>{pool.secondary_token_symbol}</h3>
            <span className="token-name">{pool.secondary_token_name}</span>
          </div>
        </div>
        <span className={`pool-status ${status.className}`}>
          {status.text}
        </span>
      </div>

      <div className="pool-details">
        <div className="detail-row">
          <span className="label">Pool ID:</span>
          <span className="value">#{pool.id}</span>
        </div>
        
        <div className="detail-row">
          <span className="label">Created:</span>
          <span className="value">{formatDate(pool.created_time)}</span>
        </div>

        {pool.pool_created_at > 0 && (
          <div className="detail-row">
            <span className="label">Pool Live:</span>
            <span className="value">{formatDate(pool.pool_created_at)}</span>
          </div>
        )}

        <div className="detail-row">
          <span className="label">Max Supply:</span>
          <span className="value">
            {(Number(pool.primary_token_max_supply) / 100000000).toLocaleString()}
          </span>
        </div>

        <div className="detail-row">
          <span className="label">Halving:</span>
          <span className="value">{pool.halving_step}%</span>
        </div>

        <div className="detail-row canister-ids">
          <span className="label">Canisters:</span>
          <div className="canister-list">
            <span className="canister-id" title="Primary Token">
              P: {pool.primary_token_id.toString().slice(0, 10)}...
            </span>
            <span className="canister-id" title="Secondary Token">
              S: {pool.secondary_token_id.toString().slice(0, 10)}...
            </span>
            <span className="canister-id" title="ICP Swap">
              Swap: {pool.icp_swap_canister_id.toString().slice(0, 10)}...
            </span>
          </div>
        </div>
      </div>

      <div className="pool-actions">
        {pool.isLive && (
          <>
            <button onClick={handleTrade} className="paper-button action-button">
              Trade on LbryFun
            </button>
            <button onClick={handleViewOnKong} className="paper-button action-button secondary">
              View on Kong
            </button>
          </>
        )}
        
        <button onClick={handleCreateProposal} className="paper-button action-button dao-button">
          Create DAO Proposal
        </button>
        
        {!pool.isLive && !pool.pool_creation_failed && (
          <div className="pending-message">
            Pool will go live after launch delay
          </div>
        )}
        {pool.pool_creation_failed && (
          <div className="failed-message">
            Pool creation failed - You can still create a DAO
          </div>
        )}
      </div>
    </div>
  );
}

export default PoolCard;