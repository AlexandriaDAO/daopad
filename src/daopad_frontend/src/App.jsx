import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIdentity } from './hooks/useIdentity';
import { useLogout } from './hooks/useLogout';
import { setAuthSuccess, clearAuth, setAuthLoading, setAuthInitialized } from './features/auth/authSlice';
import { fetchBalances } from './state/balance/balanceThunks';
import { clearBalances } from './state/balance/balanceSlice';
import AlexandriaProposals from './components/AlexandriaProposals';
import './App.scss';

function App() {
  const [activeStep, setActiveStep] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [currentView, setCurrentView] = useState('home'); // 'home' or 'proposals'
  const dispatch = useDispatch();
  const { principal, isAuthenticated } = useSelector(state => state.auth);
  const { icpBalance, alexBalance, stakedAlexBalance, isLoading: balanceLoading } = useSelector(state => state.balance);
  const { login, identity } = useIdentity();
  const logout = useLogout();

  // Check authentication status on mount
  useEffect(() => {
    if (identity) {
      const principalText = identity.getPrincipal().toString();
      dispatch(setAuthSuccess(principalText));
      // Fetch balances when authenticated
      dispatch(fetchBalances(identity));
    } else {
      dispatch(clearAuth());
      dispatch(clearBalances());
    }
    dispatch(setAuthInitialized(true));
  }, [identity, dispatch]);

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

  return (
    <div className="app">
      <header>
        <div className="header-content">
          <div>
            <h1>DAOPad</h1>
            <p className="project-info">an Alexandria project</p>
            <p className="subtitle">Turn any ICRC1 token into a legally compliant DAO</p>
            <p className="subtitle-secondary">Control treasury, canisters, and real bank accounts through locked LP voting</p>
            <div className="view-toggle">
              <button 
                className={`view-btn ${currentView === 'home' ? 'active' : ''}`}
                onClick={() => setCurrentView('home')}
              >
                Home
              </button>
              <button 
                className={`view-btn ${currentView === 'proposals' ? 'active' : ''}`}
                onClick={() => setCurrentView('proposals')}
              >
                Alexandria Proposals
              </button>
            </div>
          </div>
          <div className="auth-section">
            {isAuthenticated ? (
              <div className="auth-info">
                <div className="balance-info">
                  {balanceLoading ? (
                    <span className="loading">Loading balances...</span>
                  ) : (
                    <>
                      <span className="balance">ICP: {icpBalance}</span>
                      <span className="balance">ALEX: {alexBalance}</span>
                      <span className="balance">Staked: {stakedAlexBalance}</span>
                      <button 
                        onClick={() => dispatch(fetchBalances(identity))} 
                        className="refresh-button"
                        title="Refresh balances"
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

      {currentView === 'home' ? (
        <>
          <section className="innovation-banner">
            <div className="banner-content">
              <strong>Key Innovation:</strong> DAOpad makes YOUR CANISTER the admin of Orbit Station.
              <br />
              No humans. No multi-sig risk. Just code executing community decisions.
            </div>
          </section>

          <section className="paths-section">
            <div className="path-card">
              <h3>Existing Token?</h3>
              <ul>
                <li>Free integration</li>
                <li>Keep your tokenomics</li>
                <li>Add DAO capabilities instantly</li>
              </ul>
              <button className="path-button primary">Connect Your Token</button>
            </div>
            <div className="path-card">
              <h3>New Project?</h3>
              <ul>
                <li>Fair launch on lbry.fun</li>
                <li>1% revenue share only</li>
                <li>Built-in community</li>
              </ul>
              <a href="https://lbry.fun" target="_blank" rel="noopener noreferrer" className="path-button secondary">
                Launch Your DAO →
              </a>
            </div>
          </section>

          <section className="how-it-works">
            <h2>How It Works</h2>
            <div className="flow-cards">
              <div className={`flow-card ${activeStep === 1 ? 'active' : ''}`} onClick={() => setActiveStep(activeStep === 1 ? null : 1)}>
                <div className="flow-header">
                  <span className="flow-icon">1</span>
                  <h3>Connect Your Token</h3>
                </div>
                {activeStep === 1 && (
                  <div className="flow-content">
                    <ul>
                      <li>Any ICRC1 token works - existing or new</li>
                      <li>DAOpad backend becomes Orbit Station admin</li>
                      <li>No migration needed, keep your current setup</li>
                      <li>Free for existing tokens, 1% for new launches via lbry.fun</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className={`flow-card ${activeStep === 2 ? 'active' : ''}`} onClick={() => setActiveStep(activeStep === 2 ? null : 2)}>
                <div className="flow-header">
                  <span className="flow-icon">2</span>
                  <h3>Lock LP Tokens for Voting Power</h3>
                </div>
                {activeStep === 2 && (
                  <div className="flow-content">
                    <ul>
                      <li>Provide liquidity on KongSwap and lock permanently</li>
                      <li>Locked value determines your voting weight</li>
                      <li>Create proposals: transfer funds, upgrade canisters, manage treasury</li>
                      <li>Proposals execute automatically when vote threshold met</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className={`flow-card ${activeStep === 3 ? 'active' : ''}`} onClick={() => setActiveStep(activeStep === 3 ? null : 3)}>
                <div className="flow-header">
                  <span className="flow-icon">3</span>
                  <h3>Form Legal Entity & Bank Account</h3>
                </div>
                {activeStep === 3 && (
                  <div className="flow-content">
                    <ul>
                      <li>Register Wyoming DAO LLC (we handle paperwork)</li>
                      <li>Open business bank account controlled by DAO votes</li>
                      <li>Transfer funds from treasury to bank via proposals</li>
                      <li>Sign contracts, hire employees, own property - all through voting</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="faq">
        <h3>Questions?</h3>
        <details>
          <summary>How is this different from other DAOs?</summary>
          <p>
            DAOpad eliminates human administrators. Your canister becomes the Orbit Station admin, 
            executing decisions automatically based on LP token votes. No multi-sig committees, 
            no trusted parties - just trustless code executing community will.
          </p>
        </details>
        <details>
          <summary>Why locked LP instead of regular tokens?</summary>
          <p>
            Locked liquidity providers can't dump. This creates aligned incentives - only those 
            permanently committed to the project get voting rights. It also satisfies legal requirements 
            for Wyoming DAOs where decision-makers must have long-term aligned interests.
          </p>
        </details>
        <details>
          <summary>Can existing projects use this?</summary>
          <p>
            Yes! Any ICRC1 token can integrate DAOpad for free. Keep your existing tokenomics, 
            just add DAO capabilities. New projects can launch through lbry.fun with a 1% revenue share.
          </p>
        </details>
        <details>
          <summary>How does the fiat bridge work?</summary>
          <p>
            Once your DAO forms a Wyoming LLC, it gets a real bank account. LP token holders vote 
            to transfer funds from the on-chain treasury to the bank. No intermediaries - your 
            votes directly control real-world finances.
          </p>
        </details>
        <details>
          <summary>Is this legal?</summary>
          <p>
            Yes. Wyoming recognizes DAO LLCs. Your DAO becomes a real legal entity 
            that can own property, hire employees, sign contracts, and operate like any business.
          </p>
        </details>
          </section>
        </>
      ) : (
        <AlexandriaProposals />
      )}

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