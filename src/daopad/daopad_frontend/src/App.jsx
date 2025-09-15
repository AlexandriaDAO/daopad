import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIdentity } from './hooks/useIdentity';
import { useLogout } from './hooks/useLogout';
import { setAuthSuccess, clearAuth, setAuthLoading, setAuthInitialized } from './features/auth/authSlice';
import { fetchBalances } from './state/balance/balanceThunks';
import { clearBalances } from './state/balance/balanceSlice';
import {
  setKongLockerCanister,
  clearDaoState
} from './features/dao/daoSlice';
import { DAOPadBackendService } from './services/daopadBackend';

// Components
import KongLockerSetup from './components/KongLockerSetup';
import TokenTabs from './components/TokenTabs';

import './App.scss';

function App() {
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isCheckingKongLocker, setIsCheckingKongLocker] = useState(false);

  const dispatch = useDispatch();
  const { principal, isAuthenticated } = useSelector(state => state.auth);
  const { icpBalance, isLoading: balanceLoading } = useSelector(state => state.balance);
  const { kongLockerCanister } = useSelector(state => state.dao);
  const { login, identity } = useIdentity();
  const logout = useLogout();

  // Check authentication status on mount
  useEffect(() => {
    if (identity) {
      const principalText = identity.getPrincipal().toString();
      dispatch(setAuthSuccess(principalText));
      // Fetch balances when authenticated
      dispatch(fetchBalances(identity));
      checkKongLockerCanister();
    } else {
      dispatch(clearAuth());
      dispatch(clearBalances());
      dispatch(clearDaoState());
    }
    dispatch(setAuthInitialized(true));
  }, [identity, dispatch]);

  const checkKongLockerCanister = async () => {
    if (!identity) return;

    setIsCheckingKongLocker(true);
    try {
      const daopadService = new DAOPadBackendService(identity);
      const result = await daopadService.getMyKongLockerCanister();

      if (result.success && result.data) {
        // Convert Principal object to string
        const canisterString = typeof result.data === 'string' ? result.data : result.data.toString();
        dispatch(setKongLockerCanister(canisterString));
      }
    } catch (err) {
      console.error('Error checking Kong Locker canister:', err);
    } finally {
      setIsCheckingKongLocker(false);
    }
  };

  const handleLogin = async () => {
    dispatch(setAuthLoading(true));
    try {
      await login();
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      dispatch(setAuthLoading(false));
    }
  };

  const handleLogout = async () => {
    await logout();
    dispatch(clearAuth());
    dispatch(clearBalances());
    dispatch(clearDaoState());
  };

  const copyPrincipal = async () => {
    try {
      await navigator.clipboard.writeText(principal);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleKongLockerComplete = () => {
    // Kong Locker setup completed, component will automatically refresh
  };

  // Determine if we should show Kong Locker setup
  const shouldShowKongLockerSetup = isAuthenticated && !kongLockerCanister && !isCheckingKongLocker;

  return (
    <div className="app">
      <header>
        <div className="header-content">
          <div className="branding">
            <h1>DAOPad</h1>
            <p className="tagline">Token Governance Platform</p>
            <p className="subtitle">Create treasuries and vote with your locked liquidity</p>
          </div>

          <div className="auth-section">
            {isAuthenticated ? (
              <div className="auth-info">
                <div className="balance-info">
                  {balanceLoading ? (
                    <span className="loading">Loading balance...</span>
                  ) : (
                    <>
                      <span className="balance">ICP: {icpBalance}</span>
                      <button
                        onClick={() => dispatch(fetchBalances(identity))}
                        className="refresh-button"
                        title="Refresh balance"
                      >
                        ↻
                      </button>
                    </>
                  )}
                </div>
                <div className="principal-container">
                  <span className="principal">{principal.slice(0, 5)}...{principal.slice(-4)}</span>
                  <button
                    onClick={copyPrincipal}
                    className="copy-button"
                    title="Copy principal"
                  >
                    {copyFeedback ? '✓' : '⧉'}
                  </button>
                </div>
                {kongLockerCanister && (
                  <div className="kong-locker-indicator" title={`Kong Locker: ${kongLockerCanister}`}>
                    <span className="kong-locker-badge">🔒 Connected</span>
                  </div>
                )}
                <button onClick={handleLogout} className="auth-button logout">
                  Logout
                </button>
              </div>
            ) : (
              <button onClick={handleLogin} className="auth-button login">
                Connect with Internet Identity
              </button>
            )}
          </div>
        </div>
      </header>

      <main>
        {isAuthenticated ? (
          shouldShowKongLockerSetup ? (
            <div className="setup-container">
              <KongLockerSetup
                identity={identity}
                onComplete={handleKongLockerComplete}
              />
            </div>
          ) : (
            <TokenTabs
              identity={identity}
            />
          )
        ) : (
          <div className="welcome-section">
            <div className="welcome-content">
              <h2>Welcome to DAOPad</h2>
              <p>
                Create and manage token treasuries using your locked liquidity as voting power.
                Connect your Kong Locker to get started with governance.
              </p>
              <div className="features">
                <div className="feature">
                  <div className="feature-icon">🔒</div>
                  <h3>Lock LP Tokens</h3>
                  <p>Permanently lock your LP tokens in Kong Locker to gain voting power</p>
                </div>
                <div className="feature">
                  <div className="feature-icon">🏛️</div>
                  <h3>Create Treasuries</h3>
                  <p>Deploy Orbit Station treasuries for your tokens with governance controls</p>
                </div>
                <div className="feature">
                  <div className="feature-icon">🗳️</div>
                  <h3>Vote & Govern</h3>
                  <p>Use your locked value as voting power to control treasury operations</p>
                </div>
              </div>
              <button onClick={handleLogin} className="cta-button">
                Get Started
              </button>
            </div>
          </div>
        )}
      </main>

      <footer>
        <p>
          Built by <a href="https://lbry.fun" target="_blank" rel="noopener noreferrer">Alexandria</a> ·
          <a href="https://github.com/AlexandriaDAO/daopad" target="_blank" rel="noopener noreferrer">GitHub</a> ·
          <a href="https://x.com/alexandria_lbry" target="_blank" rel="noopener noreferrer">Twitter</a>
        </p>
      </footer>
    </div>
  );
}

export default App;