import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Principal } from '@dfinity/principal';
import { AuthClient } from '@dfinity/auth-client';
import { Actor, HttpAgent } from '@dfinity/agent';
import kongSwapService from '../services/kongSwapService';
import './LPTokenLocker.scss';

// LP Lock Frontend canister configuration
const LP_LOCK_FRONTEND_ID = 'c6w56-taaaa-aaaai-atlma-cai';

// IDL factory for lp_lock_frontend canister
const lpLockFrontendIdlFactory = ({ IDL }) => {
  return IDL.Service({
    'get_my_deposit_address': IDL.Func([], [IDL.Text], ['query']),
    'check_my_lp_balance': IDL.Func([], [IDL.Variant({
      'Ok': IDL.Vec(IDL.Text),
      'Err': IDL.Text,
    })], []),
  });
};

const LPTokenLocker = () => {
  const [authClient, setAuthClient] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userPrincipal, setUserPrincipal] = useState('');
  const [derivedPrincipal, setDerivedPrincipal] = useState('');
  const [icpBalance, setIcpBalance] = useState(0);
  const [lpBalances, setLpBalances] = useState([]);
  const [registrationStatus, setRegistrationStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lpLockActor, setLpLockActor] = useState(null);

  // Initialize auth client
  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      const client = await AuthClient.create();
      setAuthClient(client);
      
      const isAuth = await client.isAuthenticated();
      setIsAuthenticated(isAuth);
      
      if (isAuth) {
        const identity = client.getIdentity();
        const principal = identity.getPrincipal().toText();
        setUserPrincipal(principal);
        
        // Create agent and actor for LP Lock Frontend
        const agent = new HttpAgent({
          identity,
          host: 'https://ic0.app',
        });
        
        if (process.env.NODE_ENV !== 'production') {
          await agent.fetchRootKey();
        }
        
        const actor = Actor.createActor(lpLockFrontendIdlFactory, {
          agent,
          canisterId: LP_LOCK_FRONTEND_ID,
        });
        setLpLockActor(actor);
        
        // Initialize KongSwap service with user's identity
        await kongSwapService.initialize(identity);
        
        // Get derived principal for LP locking
        await fetchDerivedPrincipal(actor);
        
        // Check registration and balances
        await checkRegistrationStatus(principal);
        await fetchBalances(principal);
      }
    } catch (err) {
      setError(`Failed to initialize: ${err.message}`);
    }
  };

  const handleLogin = async () => {
    if (!authClient) return;
    
    setLoading(true);
    try {
      await authClient.login({
        identityProvider: 'https://identity.ic0.app',
        onSuccess: async () => {
          setIsAuthenticated(true);
          const identity = authClient.getIdentity();
          const principal = identity.getPrincipal().toText();
          setUserPrincipal(principal);
          
          // Create agent and actor for LP Lock Frontend
          const agent = new HttpAgent({
            identity,
            host: 'https://ic0.app',
          });
          
          if (process.env.NODE_ENV !== 'production') {
            await agent.fetchRootKey();
          }
          
          const actor = Actor.createActor(lpLockFrontendIdlFactory, {
            agent,
            canisterId: LP_LOCK_FRONTEND_ID,
          });
          setLpLockActor(actor);
          
          // Initialize KongSwap service with user's identity
          await kongSwapService.initialize(identity);
          
          // Get derived principal and check status
          await fetchDerivedPrincipal(actor);
          await checkRegistrationStatus(principal);
          await fetchBalances(principal);
        },
        onError: (err) => {
          setError(`Login failed: ${err}`);
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDerivedPrincipal = async (actor) => {
    try {
      // Get the derived principal from the canister
      const actorToUse = actor || lpLockActor;
      if (!actorToUse) return;
      
      const derived = await actorToUse.get_my_deposit_address();
      setDerivedPrincipal(derived);
    } catch (err) {
      console.error('Failed to get derived principal:', err);
    }
  };

  const checkRegistrationStatus = async (principal) => {
    try {
      const result = await kongSwapService.checkKongSwapBalance(principal);
      
      if (result.notRegistered) {
        setRegistrationStatus('not_registered');
      } else if (result.success) {
        setRegistrationStatus('registered');
        setLpBalances(result.balances || []);
      }
    } catch (err) {
      console.error('Failed to check registration:', err);
    }
  };

  const fetchBalances = async (principal) => {
    try {
      // Check ICP balance
      const balance = await kongSwapService.getICPBalance(principal);
      setIcpBalance(Number(balance) / 100000000); // Convert e8s to ICP
      
      // Check LP balances if registered
      if (registrationStatus === 'registered') {
        const lpResult = await kongSwapService.checkKongSwapBalance(principal);
        if (lpResult.success) {
          setLpBalances(lpResult.balances || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch balances:', err);
    }
  };

  const handleRegister = async () => {
    if (!isAuthenticated) {
      setError('Please login first');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Check if user has enough ICP (need at least 0.001 ICP + fees)
      if (icpBalance < 0.0011) {
        setError('Insufficient ICP balance. You need at least 0.0011 ICP to register.');
        return;
      }

      const result = await kongSwapService.registerWithKongSwap();
      
      if (result.success) {
        setRegistrationStatus('registered');
        alert(result.message);
        
        // Refresh balances
        await fetchBalances(userPrincipal);
      } else {
        setError(`Registration failed: ${result.error}`);
      }
    } catch (err) {
      setError(`Registration error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkLockedLPTokens = async () => {
    if (!derivedPrincipal || !lpLockActor) return;
    
    setLoading(true);
    try {
      // Check LP balance of the derived principal
      const result = await lpLockActor.check_my_lp_balance();
      
      if (result.Ok) {
        const balances = result.Ok;
        if (balances.length > 0 && !balances[0].includes('No LP tokens')) {
          alert(`Locked LP Tokens:\n${balances.join('\n')}`);
        } else {
          alert('No LP tokens locked yet. Send LP tokens to your derived principal to lock them permanently.');
        }
      } else {
        setError(`Failed to check locked tokens: ${result.Err}`);
      }
    } catch (err) {
      setError(`Error checking locked tokens: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp-token-locker">
      <h2>LP Token Locker</h2>
      
      {!isAuthenticated ? (
        <div className="auth-section">
          <p>Connect your wallet to manage LP token locking</p>
          <button onClick={handleLogin} disabled={loading}>
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      ) : (
        <div className="locker-content">
          <div className="user-info">
            <h3>Account Information</h3>
            <p><strong>Your Principal:</strong> {userPrincipal}</p>
            <p><strong>ICP Balance:</strong> {icpBalance.toFixed(4)} ICP</p>
            <p><strong>Lock Address:</strong> {derivedPrincipal || 'Loading...'}</p>
            <p className="info-text">
              Send LP tokens to your Lock Address to permanently lock them
            </p>
          </div>

          <div className="registration-section">
            <h3>KongSwap Registration</h3>
            {registrationStatus === 'not_registered' ? (
              <div>
                <p className="warning">You need to register with KongSwap before you can receive LP tokens</p>
                <button onClick={handleRegister} disabled={loading}>
                  {loading ? 'Registering...' : 'Register with KongSwap (0.001 ICP)'}
                </button>
              </div>
            ) : registrationStatus === 'registered' ? (
              <div>
                <p className="success">✓ Registered with KongSwap</p>
                {lpBalances.length > 0 ? (
                  <div className="lp-balances">
                    <h4>Your LP Balances:</h4>
                    {lpBalances.map((lp, index) => (
                      <div key={index} className="lp-balance-item">
                        <span>{lp.symbol}:</span>
                        <span>{lp.balance} (${lp.usd_balance.toFixed(2)})</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No LP tokens in your wallet yet</p>
                )}
              </div>
            ) : (
              <p>Checking registration status...</p>
            )}
          </div>

          <div className="lock-section">
            <h3>Locked LP Tokens</h3>
            <p>LP tokens sent to your Lock Address are permanently locked and cannot be withdrawn.</p>
            <button onClick={checkLockedLPTokens} disabled={loading}>
              {loading ? 'Checking...' : 'Check Locked Tokens'}
            </button>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="instructions">
            <h3>How to Lock LP Tokens:</h3>
            <ol>
              <li>Register with KongSwap (one-time, costs 0.001 ICP)</li>
              <li>Provide liquidity on KongSwap to receive LP tokens</li>
              <li>Send LP tokens to your Lock Address shown above</li>
              <li>Tokens are permanently locked and count toward DAO governance</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default LPTokenLocker;