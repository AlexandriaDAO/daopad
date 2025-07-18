import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIdentity } from './hooks/useIdentity';
import { useLogout } from './hooks/useLogout';
import { setAuthSuccess, clearAuth, setAuthLoading, setAuthInitialized } from './features/auth/authSlice';
import './App.scss';

function App() {
  const [activeStep, setActiveStep] = useState(null);
  const dispatch = useDispatch();
  const { principal, isAuthenticated } = useSelector(state => state.auth);
  const { login, identity } = useIdentity();
  const logout = useLogout();

  // Check authentication status on mount
  useEffect(() => {
    if (identity) {
      const principalText = identity.getPrincipal().toString();
      dispatch(setAuthSuccess(principalText));
    } else {
      dispatch(clearAuth());
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
  };

  return (
    <div className="app">
      <header>
        <div className="header-content">
          <div>
            <h1>Partnership DAO</h1>
            <p className="subtitle">Turn your local business into a community-owned entity</p>
          </div>
          <div className="auth-section">
            {isAuthenticated ? (
              <div className="auth-info">
                <span className="principal">{principal.slice(0, 8)}...{principal.slice(-8)}</span>
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

      <section className="current-daos">
        <h3>Active Partnership DAOs</h3>
        <p className="coming-soon">First cohort launching Q1 2025</p>
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
            Locked LPs can't dump tokens. They're true long-term partners. 
            In exchange, they get all voting rights and revenue sharing. 
            Regular token holders can trade but don't vote.
          </p>
        </details>
        <details>
          <summary>What businesses work best?</summary>
          <p>
            Any business with a loyal community. Coffee shops, farms, maker spaces, 
            local stores, service businesses. If people care about your success, 
            this model works.
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

      <footer>
        <p>
          Built by <a href="https://alexandria.org" target="_blank" rel="noopener noreferrer">Alexandria</a> · 
          <a href="https://github.com/AlexandriaDAO" target="_blank" rel="noopener noreferrer">GitHub</a> · 
          <a href="mailto:contact@alexandria.org">Contact</a>
        </p>
      </footer>
    </div>
  );
}

export default App;