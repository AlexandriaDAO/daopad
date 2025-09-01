import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIdentity } from './hooks/useIdentity';
import { useLogout } from './hooks/useLogout';
import { setAuthSuccess, clearAuth, setAuthLoading, setAuthInitialized } from './features/auth/authSlice';
import { fetchBalances } from './state/balance/balanceThunks';
import { clearBalances } from './state/balance/balanceSlice';
import { 
  setLpPrincipal, 
  clearDaoState,
  setSelectedDao 
} from './features/dao/daoSlice';
import { DAOPadBackendService } from './services/daopadBackend';

// Components
import LpPrincipalSetup from './components/LpPrincipalSetup';
import DaoDashboard from './components/DaoDashboard';
import DaoProposals from './components/DaoProposals';
import TokenStationAdmin from './components/TokenStationAdmin';

import './App.scss';

function App() {
  const [activeStep, setActiveStep] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [currentView, setCurrentView] = useState('home'); // 'home', 'daos', 'proposals', 'admin'
  const [isCheckingLpPrincipal, setIsCheckingLpPrincipal] = useState(false);
  
  const dispatch = useDispatch();
  const { principal, isAuthenticated } = useSelector(state => state.auth);
  const { icpBalance, isLoading: balanceLoading } = useSelector(state => state.balance);
  const { lpPrincipal, selectedDao } = useSelector(state => state.dao);
  const { login, identity } = useIdentity();
  const logout = useLogout();

  // Check authentication status on mount
  useEffect(() => {
    if (identity) {
      const principalText = identity.getPrincipal().toString();
      dispatch(setAuthSuccess(principalText));
      // Fetch balances when authenticated
      dispatch(fetchBalances(identity));
      checkLpPrincipal();
    } else {
      dispatch(clearAuth());
      dispatch(clearBalances());
      dispatch(clearDaoState());
    }
    dispatch(setAuthInitialized(true));
  }, [identity, dispatch]);

  const checkLpPrincipal = async () => {
    if (!identity) return;
    
    setIsCheckingLpPrincipal(true);
    try {
      const daopadService = new DAOPadBackendService(identity);
      const result = await daopadService.getMyLpPrincipal();
      
      if (result.success && result.data) {
        dispatch(setLpPrincipal(result.data));
      }
    } catch (err) {
      console.error('Error checking LP principal:', err);
    } finally {
      setIsCheckingLpPrincipal(false);
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
    setCurrentView('home');
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

  const handleLpPrincipalComplete = () => {
    setCurrentView('daos');
  };

  const handleSelectDao = (dao) => {
    dispatch(setSelectedDao(dao));
    setCurrentView('proposals');
  };

  // Determine if we should show LP Principal setup
  const shouldShowLpSetup = isAuthenticated && !lpPrincipal && !isCheckingLpPrincipal && currentView === 'daos';

  return (
    <div className="app">
      <header>
        <div className="header-content">
          <div>
            <h1>DAOPad</h1>
            <p className="project-info">Decentralized DAO Platform</p>
            <p className="subtitle">Turn any ICRC1 token into a legally compliant DAO</p>
            <p className="subtitle-secondary">Control treasury, canisters, and real bank accounts through DAO voting</p>
            <div className="view-toggle">
              <button 
                className={`view-btn ${currentView === 'home' ? 'active' : ''}`}
                onClick={() => setCurrentView('home')}
              >
                Home
              </button>
              {isAuthenticated && (
                <>
                  <button 
                    className={`view-btn ${currentView === 'daos' ? 'active' : ''}`}
                    onClick={() => setCurrentView('daos')}
                  >
                    My DAOs
                  </button>
                  {selectedDao && (
                    <button 
                      className={`view-btn ${currentView === 'proposals' ? 'active' : ''}`}
                      onClick={() => setCurrentView('proposals')}
                    >
                      Proposals
                    </button>
                  )}
                  <button 
                    className={`view-btn ${currentView === 'admin' ? 'active' : ''}`}
                    onClick={() => setCurrentView('admin')}
                  >
                    Admin
                  </button>
                </>
              )}
            </div>
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
                {lpPrincipal && (
                  <div className="lp-principal-indicator" title={`LP: ${lpPrincipal}`}>
                    <span className="lp-badge">LP ✓</span>
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

      {currentView === 'home' ? (
        <>
          <section className="innovation-banner">
            <div className="banner-content">
              <strong>Multi-DAO Support:</strong> One LP principal, multiple DAOs!
              <br />
              Lock liquidity once, participate in all token DAOs based on your positions.
            </div>
          </section>

          <section className="paths-section">
            <div className="path-card">
              <h3>Join DAOs</h3>
              <ul>
                <li>Lock liquidity on KongSwap</li>
                <li>Set your LP principal once</li>
                <li>Auto-detect available DAOs</li>
                <li>Join multiple DAOs instantly</li>
              </ul>
              <button 
                className="path-button primary"
                onClick={() => isAuthenticated ? setCurrentView('daos') : handleLogin()}
              >
                {isAuthenticated ? 'View DAOs' : 'Connect Wallet'}
              </button>
            </div>
            <div className="path-card">
              <h3>Create a DAO</h3>
              <ul>
                <li>Deploy Orbit Station</li>
                <li>Link token to station</li>
                <li>LP holders auto-join</li>
                <li>Start governance</li>
              </ul>
              <a href="https://lbry.fun" target="_blank" rel="noopener noreferrer" className="path-button secondary">
                Launch Your DAO →
              </a>
            </div>
          </section>

          <section className="how-it-works">
            <h2>How Multi-DAO Works</h2>
            <div className="flow-cards">
              <div className={`flow-card ${activeStep === 1 ? 'active' : ''}`} onClick={() => setActiveStep(activeStep === 1 ? null : 1)}>
                <div className="flow-header">
                  <span className="flow-icon">1</span>
                  <h3>Lock Liquidity</h3>
                </div>
                {activeStep === 1 && (
                  <div className="flow-content">
                    <ul>
                      <li>Visit konglocker.org to lock LP tokens</li>
                      <li>Receive a unique LP principal</li>
                      <li>This represents ALL your locked positions</li>
                      <li>One principal works for all DAOs</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className={`flow-card ${activeStep === 2 ? 'active' : ''}`} onClick={() => setActiveStep(activeStep === 2 ? null : 2)}>
                <div className="flow-header">
                  <span className="flow-icon">2</span>
                  <h3>Set LP Principal</h3>
                </div>
                {activeStep === 2 && (
                  <div className="flow-content">
                    <ul>
                      <li>Enter your LP principal in DAOPad</li>
                      <li>System auto-detects your token positions</li>
                      <li>Shows all available DAOs</li>
                      <li>Set once, use everywhere</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className={`flow-card ${activeStep === 3 ? 'active' : ''}`} onClick={() => setActiveStep(activeStep === 3 ? null : 3)}>
                <div className="flow-header">
                  <span className="flow-icon">3</span>
                  <h3>Join & Participate</h3>
                </div>
                {activeStep === 3 && (
                  <div className="flow-content">
                    <ul>
                      <li>Join any DAO where you have locked tokens</li>
                      <li>Vote on proposals</li>
                      <li>Create new proposals</li>
                      <li>Manage treasury across multiple DAOs</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="faq">
            <h3>Questions?</h3>
            <details>
              <summary>What's new in Multi-DAO?</summary>
              <p>
                DAOPad now supports multiple DAOs! Lock liquidity for any token on KongSwap,
                and automatically join that token's DAO. One LP principal gives you access to
                all DAOs based on your locked positions.
              </p>
            </details>
            <details>
              <summary>How do I join multiple DAOs?</summary>
              <p>
                Lock liquidity for different tokens on konglocker.org. Set your LP principal
                once in DAOPad. The system auto-detects all your positions and shows available
                DAOs. Join any or all of them with one click!
              </p>
            </details>
          </section>
        </>
      ) : currentView === 'daos' ? (
        isAuthenticated ? (
          shouldShowLpSetup ? (
            <LpPrincipalSetup 
              identity={identity}
              onComplete={handleLpPrincipalComplete}
            />
          ) : (
            <DaoDashboard 
              identity={identity}
              onSelectDao={handleSelectDao}
            />
          )
        ) : (
          <div className="auth-required">
            <h3>Authentication Required</h3>
            <p>Please connect your wallet to view DAOs.</p>
            <button onClick={handleLogin} className="auth-button">
              Connect with Internet Identity
            </button>
          </div>
        )
      ) : currentView === 'proposals' ? (
        isAuthenticated && selectedDao ? (
          <DaoProposals 
            identity={identity}
            dao={selectedDao}
          />
        ) : (
          <div className="no-dao-selected">
            <h3>No DAO Selected</h3>
            <p>Please select a DAO from the dashboard to view proposals.</p>
            <button onClick={() => setCurrentView('daos')} className="nav-button">
              Go to DAOs
            </button>
          </div>
        )
      ) : currentView === 'admin' ? (
        isAuthenticated ? (
          <TokenStationAdmin identity={identity} />
        ) : (
          <div className="auth-required">
            <h3>Authentication Required</h3>
            <p>Admin functions require authentication.</p>
          </div>
        )
      ) : null}

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