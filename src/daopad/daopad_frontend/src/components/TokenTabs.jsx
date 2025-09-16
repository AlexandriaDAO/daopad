import React, { useState, useEffect } from 'react';
import { DAOPadBackendService } from '../services/daopadBackend';
import { KongLockerService } from '../services/kongLockerService';
import TokenTabContent from './TokenTabContent';
import './TokenTabs.scss';

const TokenTabs = ({ identity }) => {
  const [tokens, setTokens] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tokenVotingPowers, setTokenVotingPowers] = useState({});
  const [userLPPositions, setUserLPPositions] = useState([]);

  useEffect(() => {
    loadTokensAndPowers();
  }, [identity]);

  const loadTokensAndPowers = async () => {
    if (!identity) return;

    setLoading(true);
    setError('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const kongLockerService = new KongLockerService(identity);

      // Get user's locked tokens
      const tokensResult = await daopadService.getMyLockedTokens();
      if (!tokensResult.success) {
        setError(tokensResult.error || 'Failed to load tokens');
        return;
      }

      const lockedTokens = tokensResult.data || [];
      if (lockedTokens.length === 0) {
        setError('No locked tokens found. Please lock some LP tokens in Kong Locker first.');
        return;
      }

      // Don't set tokens yet - wait until we have voting powers

      // Get user's Kong Locker canister
      const canisterResult = await daopadService.getMyKongLockerCanister();
      if (!canisterResult.success || !canisterResult.data) {
        setError('Kong Locker canister not found');
        return;
      }

      const lockCanisterPrincipal = canisterResult.data.toString();

      // Get LP positions to calculate per-token voting power
      const positionsResult = await kongLockerService.getLPPositions(lockCanisterPrincipal);
      if (positionsResult.success) {
        const positions = positionsResult.data || [];
        setUserLPPositions(positions);

        // Calculate voting power per token
        const votingPowers = {};
        lockedTokens.forEach(token => {
          const tokenPositions = positions.filter(pos =>
            pos.address_0 === token.canister_id || pos.address_1 === token.canister_id
          );

          const totalUsdValue = tokenPositions.reduce((sum, pos) => {
            // Calculate the USD value for this specific token in the position
            let tokenValue = 0;
            if (pos.address_0 === token.canister_id) {
              tokenValue += pos.usd_amount_0 || 0;
            }
            if (pos.address_1 === token.canister_id) {
              tokenValue += pos.usd_amount_1 || 0;
            }
            return sum + tokenValue;
          }, 0);

          votingPowers[token.canister_id] = Math.floor(totalUsdValue * 100);
        });

        setTokenVotingPowers(votingPowers);

        // Sort tokens by voting power (highest first)
        const sortedTokens = [...lockedTokens].sort((a, b) => {
          const powerA = votingPowers[a.canister_id] || 0;
          const powerB = votingPowers[b.canister_id] || 0;
          return powerB - powerA;
        });

        setTokens(sortedTokens);
      } else {
        // If we couldn't get voting powers, just set tokens as is
        setTokens(lockedTokens);
      }

    } catch (err) {
      console.error('Error loading tokens and powers:', err);
      setError('Failed to load token information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="token-tabs">
        <div className="loading-section">
          <div className="spinner"></div>
          <p>Loading your locked tokens...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="token-tabs">
        <div className="error-section">
          <div className="error-message">
            <h3>Unable to Load Tokens</h3>
            <p>{error}</p>
            <div className="error-actions">
              <button onClick={loadTokensAndPowers} className="retry-button">
                Try Again
              </button>
              <a
                href="https://konglocker.com"
                target="_blank"
                rel="noopener noreferrer"
                className="external-button"
              >
                Go to Kong Locker
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="token-tabs">
        <div className="empty-state">
          <h3>No Locked Tokens Found</h3>
          <p>You need to lock some LP tokens in Kong Locker to use DAOPad governance features.</p>
          <a
            href="https://konglocker.com"
            target="_blank"
            rel="noopener noreferrer"
            className="external-button primary"
          >
            Go to Kong Locker →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="token-tabs">
      <div className="tabs-header">
        <h2>Token Governance</h2>
      </div>

      <div className="tabs-navigation">
        {tokens.map((token, index) => (
          <button
            key={token.canister_id}
            className={`tab-button ${activeTab === index ? 'active' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            <div className="tab-content">
              <span className="token-symbol">{token.symbol}</span>
              <span className="token-chain">({token.chain})</span>
              {tokenVotingPowers[token.canister_id] !== undefined && (
                <span className="voting-power">
                  {tokenVotingPowers[token.canister_id].toLocaleString()} VP
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="tab-panel">
        {tokens[activeTab] && (
          <TokenTabContent
            token={tokens[activeTab]}
            identity={identity}
            votingPower={tokenVotingPowers[tokens[activeTab].canister_id] || 0}
            lpPositions={userLPPositions.filter(pos =>
              pos.address_0 === tokens[activeTab].canister_id ||
              pos.address_1 === tokens[activeTab].canister_id
            )}
            onRefresh={loadTokensAndPowers}
          />
        )}
      </div>
    </div>
  );
};

export default TokenTabs;