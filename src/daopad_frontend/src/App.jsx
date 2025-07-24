import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIdentity } from './hooks/useIdentity';
import { useLogout } from './hooks/useLogout';
import { setAuthSuccess, clearAuth, setAuthLoading, setAuthInitialized } from './features/auth/authSlice';
import { fetchBalances } from './state/balance/balanceThunks';
import { clearBalances } from './state/balance/balanceSlice';
import ProposalsTab from './components/ProposalsTab';
import PoolDashboard from './components/PoolDashboard';
import './App.scss';

function App() {
  const [activeStep, setActiveStep] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [proposalPoolId, setProposalPoolId] = useState('');
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
            <p className="subtitle">Turn your local business into a community-owned entity</p>
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

      <nav className="tab-navigation">
        <button 
          className={`tab ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          Home
        </button>
        <button 
          className={`tab ${activeTab === 'pools' ? 'active' : ''}`}
          onClick={() => setActiveTab('pools')}
        >
          Pools
        </button>
        <button 
          className={`tab ${activeTab === 'proposals' ? 'active' : ''}`}
          onClick={() => setActiveTab('proposals')}
        >
          DAOs
        </button>
      </nav>

      {activeTab === 'home' && (
        <>
          <section className="intro">
            <p>
              Three steps. No lawyers. No fees except 1% revenue share. 
              Your community becomes real partners with voting rights and profit sharing.
            </p>
          </section>

      <section className="steps">
        <div className={`step ${activeStep === 1 ? 'active' : ''}`}>
          <div className="step-header" onClick={() => setActiveStep(activeStep === 1 ? null : 1)}>
            <span className="step-number">1</span>
            <h2>Launch on lbry.fun</h2>
            <span className="step-status">Ready now</span>
          </div>
          {activeStep === 1 && (
            <div className="step-content">
              <p>Create a dual-token system where community members become locked liquidity providers.</p>
              <ul>
                <li>Fair launch - no pre-mine, no VCs</li>
                <li>Community mints tokens with ICP</li>
                <li>Locked LPs can't sell but get all voting rights</li>
                <li>1% revenue to Alexandria ecosystem</li>
              </ul>
              <a href="https://lbry.fun" target="_blank" rel="noopener noreferrer" className="action-link">
                Go to lbry.fun →
              </a>
            </div>
          )}
        </div>

        <div className={`step ${activeStep === 2 ? 'active' : ''}`}>
          <div className="step-header" onClick={() => setActiveStep(activeStep === 2 ? null : 2)}>
            <span className="step-number">2</span>
            <h2>Set up Orbit wallet</h2>
            <span className="step-status">After token launch</span>
          </div>
          {activeStep === 2 && (
            <div className="step-content">
              <p>Create a multi-sig wallet controlled by your locked LP holders.</p>
              <ul>
                <li>Treasury management for your DAO</li>
                <li>Multi-approval for all transactions</li>
                <li>On-chain voting and execution</li>
                <li>Integrates with your lbry.fun token</li>
              </ul>
              <a href="https://orbit.global" target="_blank" rel="noopener noreferrer" className="action-link">
                Launch Orbit wallet →
              </a>
            </div>
          )}
        </div>

        <div className={`step ${activeStep === 3 ? 'active' : ''}`}>
          <div className="step-header" onClick={() => setActiveStep(activeStep === 3 ? null : 3)}>
            <span className="step-number">3</span>
            <h2>Form legal entity</h2>
            <span className="step-status">Requirements below</span>
          </div>
          {activeStep === 3 && (
            <div className="step-content">
              <p>Meet these requirements to form a real DAO LLC:</p>
              <div className="requirements">
                <div className="requirement">
                  <strong>Treasury:</strong> $5,000+ in DAO wallet
                </div>
                <div className="requirement">
                  <strong>Board:</strong> 5+ locked LP holders
                </div>
                <div className="requirement">
                  <strong>Approval:</strong> Alexandria DAO vote
                </div>
              </div>
              <p className="note">
                Once approved, we'll help you register as a Wyoming DAO LLC with a real bank account 
                that your on-chain treasury controls.
              </p>
            </div>
          )}
        </div>
      </section>


      <section className="faq">
        <h3>Questions?</h3>
        <details>
          <summary>What's the catch?</summary>
          <p>
            No catch. We take 1% of revenue through the lbry.fun protocol. 
            That's it. No hidden fees, no equity stake, no control.
          </p>
        </details>
        <details>
          <summary>Why locked liquidity?</summary>
          <p>
            Small businesses like LLCs cannot be liquid because that destroys the legal precedent 
            for having DAO leaders act with impartial interests. If someone can dump tokens, 
            their holdings shouldn't give them decision making power. Locked LPs are true long-term 
            partners who get all voting rights and revenue sharing. Regular token holders can trade 
            but don't vote or earn revenue.
          </p>
        </details>
        <details>
          <summary>What businesses work best?</summary>
          <p>
            Any business with a loyal community. Coffee shops, farms, tech incubators, 
            virtual ventures, maker spaces, local stores, service businesses. If people 
            care about your success, this model works.
          </p>
        </details>
        <details>
          <summary>Is this legal?</summary>
          <p>
            Yes. Wyoming recognizes DAO LLCs. Your DAO becomes a real legal entity 
            that can own property, hire employees, and operate like any business.
          </p>
        </details>
      </section>
        </>
      )}

      {activeTab === 'pools' && (
        <PoolDashboard onNavigateToProposal={(poolId) => {
          setProposalPoolId(poolId.toString());
          setActiveTab('proposals');
        }} />
      )}

      {activeTab === 'proposals' && (
        <ProposalsTab prefilledPoolId={proposalPoolId} />
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