import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIdentity } from '../hooks/useIdentity';
import { syncVotingPower, registerWithKongSwap, fetchLpLockerData } from '../state/lpLocker/lpLockerThunks';

const LPLockerDashboard = () => {
  const dispatch = useDispatch();
  const { identity, isAuthenticated } = useIdentity();
  const { 
    votingPower, 
    allVotingPowers,
    lpPositions,
    isRegisteredWithKong, 
    isLoading, 
    isSyncing, 
    message, 
    error,
    icpBalance 
  } = useSelector(state => state.lpLocker);
  
  const [isRegistering, setIsRegistering] = useState(false);

  const refreshData = () => {
    if (identity) {
      dispatch(fetchLpLockerData(identity));
    }
  };

  const handleSyncVotingPower = async () => {
    if (!identity) return;
    dispatch(syncVotingPower(identity));
  };

  const handleRegisterWithKong = async () => {
    if (!identity) return;
    setIsRegistering(true);
    try {
      await dispatch(registerWithKongSwap(identity));
    } finally {
      setIsRegistering(false);
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
            ${lpPositions ? lpPositions.reduce((sum, p) => sum + p.usd_balance, 0).toFixed(2) : '0.00'}
          </span>
          <span className="stat-label">Total LP Value</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{lpPositions ? lpPositions.length : 0}</span>
          <span className="stat-label">LP Positions</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">
            {lpPositions ? lpPositions.reduce((sum, p) => sum + p.balance, 0).toFixed(4) : '0.0000'}
          </span>
          <span className="stat-label">Total LP Tokens</span>
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

          {/* Registration Status */}
          <div className="status-card">
            <h3>KongSwap Status</h3>
            <div className="registration-status">
              <span className={`status-indicator ${isRegisteredWithKong ? 'registered' : 'pending'}`}>
                {isRegisteredWithKong ? '●' : '○'}
              </span>
              <span>{isRegisteredWithKong ? 'Registered' : 'Not Registered'}</span>
            </div>
            
            {!isRegisteredWithKong ? (
              <div className="action-group">
                <button 
                  onClick={handleRegisterWithKong}
                  disabled={!identity || isRegistering}
                  className={`btn-primary ${isRegistering ? 'loading' : ''}`}
                >
                  {isRegistering ? 'Registering...' : 'Register (0.001 ICP)'}
                </button>
                <p className="help-text">
                  Register with KongSwap to start providing liquidity that can be locked forever.
                </p>
              </div>
            ) : (
              <div className="action-group">
                <a 
                  href="https://kongswap.io" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  Open KongSwap →
                </a>
              </div>
            )}
          </div>

          {/* Sync Control */}
          <div className="status-card">
            <h3>Data Management</h3>
            <button 
              onClick={handleSyncVotingPower} 
              disabled={!identity || isSyncing}
              className={`btn-primary ${isSyncing ? 'loading' : ''}`}
            >
              {isSyncing ? 'Syncing...' : 'Sync LP Positions'}
            </button>
            <p className="help-text">
              Sync your LP positions from KongSwap to view current USD values of your locked liquidity.
            </p>
          </div>
        </aside>

        {/* Main Content - LP Positions Table */}
        <main className="dashboard-main">
          <section className="positions-section">
            <header className="section-header">
              <h2>Your LP Positions</h2>
              {lpPositions && lpPositions.length > 0 && (
                <span className="position-count">{lpPositions.length} position{lpPositions.length !== 1 ? 's' : ''}</span>
              )}
            </header>
            
            {lpPositions && lpPositions.length > 0 ? (
              <>
                <div className="positions-table-container">
                  <table className="positions-table">
                  <thead>
                    <tr>
                      <th>Pool Details</th>
                      <th>LP Balance</th>
                      <th>USD Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lpPositions.map((position, index) => (
                      <tr key={index} className="position-row">
                        <td className="pool-cell">
                          <div className="pool-info">
                            <div className="pool-pair">{position.symbol_0}/{position.symbol_1}</div>
                            <div className="pool-name">{position.name}</div>
                            <div className="token-breakdown">
                              <span className="token-detail">{position.symbol_0}: {position.amount_0.toFixed(4)} (${position.usd_amount_0.toFixed(2)})</span>
                              <span className="token-detail">{position.symbol_1}: {position.amount_1.toFixed(4)} (${position.usd_amount_1.toFixed(2)})</span>
                            </div>
                            <span className="lp-token-id">ID: {position.lp_token_id}</span>
                          </div>
                        </td>
                        <td className="balance-cell">
                          <span className="balance-value">{position.balance.toFixed(6)}</span>
                        </td>
                        <td className="value-cell">
                          <span className="total-value">${position.usd_balance.toFixed(2)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
                
                {/* Mobile Cards View */}
                <div className="mobile-positions">
                  {lpPositions.map((position, index) => (
                    <div key={index} className="mobile-position-card">
                      <div className="position-header">
                        <div className="pool-info">
                          <div className="pool-pair">{position.symbol_0}/{position.symbol_1}</div>
                          <div className="pool-name">{position.name}</div>
                        </div>
                        <div className="total-value">${position.usd_balance.toFixed(2)}</div>
                      </div>
                      
                      <div className="position-details">
                        <div className="detail-item">
                          <div className="label">LP Balance</div>
                          <div className="value">{position.balance.toFixed(6)}</div>
                        </div>
                        <div className="detail-item">
                          <div className="label">{position.symbol_0}</div>
                          <div className="value">{position.amount_0.toFixed(4)} (${position.usd_amount_0.toFixed(2)})</div>
                        </div>
                        <div className="detail-item">
                          <div className="label">{position.symbol_1}</div>
                          <div className="value">{position.amount_1.toFixed(4)} (${position.usd_amount_1.toFixed(2)})</div>
                        </div>
                        <div className="detail-item">
                          <div className="label">LP Token ID</div>
                          <div className="value">{position.lp_token_id}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3>No LP Positions Yet</h3>
                <p>Add liquidity on KongSwap to see positions here</p>
                <a 
                  href="https://kongswap.io" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  Go to KongSwap
                </a>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Community Stats - Collapsible Section */}
      <section className="community-stats-section">
        <details className="community-stats">
          <summary className="stats-toggle">
            <h3>Community LP Activity</h3>
            <span className="toggle-icon">▼</span>
          </summary>
          <div className="stats-content">
            {allVotingPowers.length > 0 ? (
              <div className="community-lp-list">
                <div className="list-header">
                  <span>Principal</span>
                  <span>LP Token Count</span>
                </div>
                {allVotingPowers.slice(0, 10).map((entry, index) => (
                  <div key={index} className="list-item">
                    <span className="principal">{entry.principal.slice(0, 8)}...{entry.principal.slice(-6)}</span>
                    <span className="power">{Number(entry.voting_power).toLocaleString()}</span>
                  </div>
                ))}
                {allVotingPowers.length > 10 && (
                  <p className="list-note">Showing top 10 out of {allVotingPowers.length} participants</p>
                )}
                <div className="community-note">
                  <p><strong>Note:</strong> LP token counts vary by pool. Higher counts don't necessarily mean higher USD value since different pools have different token values.</p>
                </div>
              </div>
            ) : (
              <p className="no-data">No community data available.</p>
            )}
          </div>
        </details>
      </section>
    </div>
  );
};

export default LPLockerDashboard;