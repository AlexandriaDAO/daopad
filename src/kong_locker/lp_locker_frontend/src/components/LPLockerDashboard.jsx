import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIdentity } from '../hooks/useIdentity';
import { fetchLpLockerData } from '../state/lpLocker/lpLockerThunks';
import LockCanisterStatus from './LockCanisterStatus';
import LPTransferGuide from './LPTransferGuide';

const LPLockerDashboard = () => {
  const dispatch = useDispatch();
  const { identity, isAuthenticated } = useIdentity();
  const { 
    isLoading, 
    message, 
    error,
    icpBalance,
    votingPower,
    lockCanister,
    lockCanisterStatus
  } = useSelector(state => state.lpLocker);
  
  // State for modals
  const [showTransferGuide, setShowTransferGuide] = useState(false);
  

  const refreshData = () => {
    if (identity) {
      dispatch(fetchLpLockerData(identity));
    }
  };




  if (!isAuthenticated) {
    return (
      <div className="auth-notice">
        <p>Please connect with Internet Identity to access the LP Token Locker.</p>
      </div>
    );
  }

  return (
    <div className="lp-locker-dashboard">
      {message && (
        <div className="notification-banner success">
          <div className="notification-content">
            <span className="status-indicator success">✓</span>
            <p><strong>Success:</strong> {message}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="notification-banner error">
          <div className="notification-content">
            <span className="status-indicator error">✕</span>
            <p><strong>Error:</strong> {error}</p>
          </div>
        </div>
      )}

      {/* Quick Stats Banner */}
      <div className="quick-stats-banner">
        <div className="stat-item">
          <span className="stat-value">
            {votingPower || '0'}
          </span>
          <span className="stat-label">Voting Power</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{lockCanisterStatus === 'registered' ? '✅' : '⏳'}</span>
          <span className="stat-label">Lock Status</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">
            {lockCanister ? '1' : '0'}
          </span>
          <span className="stat-label">Lock Canister</span>
        </div>
      </div>

      <div className="dashboard-layout">
        {/* Sidebar - User Status & Controls */}
        <aside className="dashboard-sidebar">
          {/* Connection & Balance Status */}
          <div className="status-card">
            <h3>Account Status</h3>
            <div className="status-item">
              <span className="status-indicator connected">●</span>
              <span>Connected</span>
            </div>
            <div className="balance-display">
              <span className="balance-value">{icpBalance}</span>
              <span className="balance-label">ICP Balance</span>
              <button 
                onClick={refreshData} 
                className="refresh-btn"
                title="Refresh balance"
              >
                ↻
              </button>
            </div>
          </div>

          {/* KongSwap Link */}
          <div className="status-card">
            <h3>Add Liquidity</h3>
            <div className="action-group">
              <a 
                href="https://kongswap.io" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Open KongSwap →
              </a>
              <p className="help-text">
                Add liquidity on KongSwap to see your LP positions here.
              </p>
            </div>
          </div>

          {/* ADD this to sidebar (after existing status-card): */}
          <LockCanisterStatus />

        </aside>

        {/* Main Content - Lock Canister Info */}
        <main className="dashboard-main">
          <section className="positions-section">
            <header className="section-header">
              <h2>Lock Canister Management</h2>
              {lockCanister && (
                <span className="position-count">Status: {lockCanisterStatus}</span>
              )}
            </header>
            
            {lockCanister ? (
              <div className="lock-canister-info">
                <div className="info-card">
                  <h3>Your Lock Canister</h3>
                  <div className="canister-details">
                    <div className="detail-row">
                      <span className="label">Principal ID:</span>
                      <span className="value mono">{lockCanister}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Status:</span>
                      <span className="value">{lockCanisterStatus}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Voting Power:</span>
                      <span className="value">{votingPower || '0'}</span>
                    </div>
                  </div>
                  
                  {lockCanisterStatus === 'registered' ? (
                    <div className="action-section">
                      <h4>Next Steps</h4>
                      <p>Your lock canister is registered with KongSwap. You can now:</p>
                      <ol>
                        <li>Go to KongSwap and transfer LP tokens to your lock canister</li>
                        <li>LP tokens sent to this address will be locked permanently</li>
                        <li>Your voting power will update automatically</li>
                      </ol>
                      <button 
                        onClick={() => setShowTransferGuide(true)}
                        className="btn-primary"
                      >
                        Show Transfer Guide
                      </button>
                    </div>
                  ) : lockCanisterStatus === 'created' ? (
                    <div className="action-section">
                      <h4>Registration Required</h4>
                      <p>Your lock canister needs to be registered with KongSwap.</p>
                      <p>Send at least 1 ICP to your lock canister, then call the registration function.</p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🔒</div>
                <h3>No Lock Canister Yet</h3>
                <p>Create a lock canister to permanently lock your LP tokens and earn voting power.</p>
                <p className="warning-text">⚠️ Warning: Locked tokens cannot be retrieved!</p>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Transfer guide modal */}
      {showTransferGuide && (
        <div className="modal-overlay">
          <div className="modal-content">
            <LPTransferGuide
              lockCanister={lockCanister}
              onComplete={() => {
                setShowTransferGuide(false);
                refreshData(); // Refresh to update voting power
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default LPLockerDashboard;