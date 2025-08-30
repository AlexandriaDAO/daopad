import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIdentity } from '../hooks/useIdentity';
import { syncVotingPower, registerWithKongSwap } from '../state/lpLocker/lpLockerThunks';

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
    error 
  } = useSelector(state => state.lpLocker);
  
  const [isRegistering, setIsRegistering] = useState(false);

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
        <div className="message-banner">
          <p>{message}</p>
        </div>
      )}

      {error && (
        <div className="error-banner">
          <p>Error: {error}</p>
        </div>
      )}

      <div className="dashboard-sections">

        {/* LP Summary Section */}
        <section className="dashboard-card">
          <h2>Your LP Summary</h2>
          <div className="voting-power-display">
            <span className="power-value">{votingPower.toLocaleString()}</span>
            <span className="power-label">Total LP Balance</span>
          </div>
          
          <button 
            onClick={handleSyncVotingPower} 
            disabled={!identity || isSyncing}
            className="action-button primary"
          >
            {isSyncing ? 'Syncing...' : 'Sync LP Positions'}
          </button>
          
          <p className="help-text">
            Sync your LP positions from KongSwap. This tracks all your liquidity pool tokens.
          </p>
        </section>

        {/* LP Position Details Section */}
        <section className="dashboard-card">
          <h2>Your LP Positions</h2>
          {lpPositions && lpPositions.length > 0 ? (
            <div className="lp-positions-list">
              {lpPositions.map((position, index) => (
                <div key={index} className="lp-position-card">
                  <div className="position-header">
                    <h3>{position.symbol_0}/{position.symbol_1}</h3>
                    <span className="pool-name">{position.name}</span>
                  </div>
                  <div className="position-details">
                    <div className="detail-row">
                      <span className="label">LP Balance:</span>
                      <span className="value">{position.balance.toFixed(6)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">{position.symbol_0}:</span>
                      <span className="value">{position.amount_0.toFixed(4)} (${position.usd_amount_0.toFixed(2)})</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">{position.symbol_1}:</span>
                      <span className="value">{position.amount_1.toFixed(4)} (${position.usd_amount_1.toFixed(2)})</span>
                    </div>
                    <div className="detail-row total">
                      <span className="label">Total Value:</span>
                      <span className="value">${position.usd_balance.toFixed(2)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">LP Token ID:</span>
                      <span className="value">{position.lp_token_id}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="positions-summary">
                <p>Total Positions: {lpPositions.length}</p>
                <p>Combined USD Value: ${lpPositions.reduce((sum, p) => sum + p.usd_balance, 0).toFixed(2)}</p>
              </div>
            </div>
          ) : (
            <p className="no-data">No LP positions found. Provide liquidity on KongSwap and sync to see your positions.</p>
          )}
        </section>

        {/* KongSwap Registration Section */}
        <section className="dashboard-card">
          <h2>KongSwap Registration</h2>
          <div className="registration-status">
            <span className={`status-badge ${isRegisteredWithKong ? 'registered' : 'not-registered'}`}>
              {isRegisteredWithKong ? 'Registered' : 'Not Registered'}
            </span>
          </div>
          
          {!isRegisteredWithKong && (
            <div className="registration-actions">
              <button 
                onClick={handleRegisterWithKong}
                disabled={!identity || isRegistering}
                className="action-button secondary"
              >
                {isRegistering ? 'Registering...' : 'Register with KongSwap (0.001 ICP)'}
              </button>
              <p className="help-text">
                You need to register with KongSwap before you can provide liquidity. This costs 0.001 ICP.
              </p>
            </div>
          )}

          {isRegisteredWithKong && (
            <div className="registered-actions">
              <a 
                href="https://kongswap.io" 
                target="_blank" 
                rel="noopener noreferrer"
                className="action-button secondary"
              >
                Open KongSwap →
              </a>
              <p className="help-text">
                Great! You're registered. Provide liquidity on KongSwap, then sync your voting power here.
              </p>
            </div>
          )}
        </section>

        {/* All Voting Powers Section */}
        <section className="dashboard-card">
          <h2>Community Voting Power</h2>
          {allVotingPowers.length > 0 ? (
            <div className="voting-powers-list">
              <div className="list-header">
                <span>Principal</span>
                <span>Voting Power</span>
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
            </div>
          ) : (
            <p className="no-data">No voting power data available.</p>
          )}
        </section>
      </div>

      {/* How It Works Section */}
      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Register with KongSwap</h3>
            <p>Pay 0.001 ICP to register your account with the KongSwap decentralized exchange.</p>
          </div>
          
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Provide Liquidity</h3>
            <p>Go to KongSwap and provide liquidity to earn LP tokens. These represent your share of the pool.</p>
          </div>
          
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Sync Voting Power</h3>
            <p>Your LP tokens automatically provide voting power. Just sync here to update your governance weight.</p>
          </div>
          
          <div className="step-card">
            <div className="step-number">4</div>
            <h3>Participate in Governance</h3>
            <p>Use your voting power to participate in Alexandria DAO governance and influence protocol decisions.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LPLockerDashboard;