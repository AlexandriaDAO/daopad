import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIdentity } from './hooks/useIdentity';
import { useLogout } from './hooks/useLogout';
import { setAuthSuccess, clearAuth, setAuthInitialized } from './features/auth/authSlice';
import { fetchLpLockerData } from './state/lpLocker/lpLockerThunks';
import { clearLpLockerData } from './state/lpLocker/lpLockerSlice';
import LPLockerDashboard from './components/LPLockerDashboard';
import './App.scss';

function App() {
  const [copyFeedback, setCopyFeedback] = useState(false);
  const dispatch = useDispatch();
  const { principal, isAuthenticated } = useSelector(state => state.auth);
  const { icpBalance, isLoading: balanceLoading } = useSelector(state => state.lpLocker);
  const { login, identity } = useIdentity();
  const logout = useLogout();

  // Check authentication status on mount
  useEffect(() => {
    if (identity) {
      const principalText = identity.getPrincipal().toString();
      dispatch(setAuthSuccess(principalText));
      // Fetch LP locker data when authenticated
      dispatch(fetchLpLockerData(identity));
    } else {
      dispatch(clearAuth());
      dispatch(clearLpLockerData());
    }
    dispatch(setAuthInitialized(true));
  }, [identity, dispatch]);

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    dispatch(clearAuth());
    dispatch(clearLpLockerData());
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

  const refreshData = () => {
    if (identity) {
      dispatch(fetchLpLockerData(identity));
    }
  };

  return (
    <div className="app">
      <header>
        <div className="header-content">
          <div>
            <h1>LP Token Locker</h1>
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
                        onClick={refreshData} 
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

      <LPLockerDashboard />

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