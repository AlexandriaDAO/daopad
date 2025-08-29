import React, { useState, useEffect } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import './App.css';

// Canister IDs
const LP_LOCKING_BACKEND_ID = '7zv6y-5qaaa-aaaar-qbviq-cai'; // Backend for LP tracking
const KONG_BACKEND_ID = '2ipq2-uqaaa-aaaar-qailq-cai';
const ICP_LEDGER_ID = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

function App() {
  const [authClient, setAuthClient] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [identity, setIdentity] = useState(null);
  const [principal, setPrincipal] = useState('');
  const [lpAddress, setLpAddress] = useState('');
  const [votingPower, setVotingPower] = useState(0);
  const [allVotingPowers, setAllVotingPowers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lpLockActor, setLpLockActor] = useState(null);
  const [kongActor, setKongActor] = useState(null);
  const [icpBalance, setIcpBalance] = useState(0);
  const [isRegisteredWithKong, setIsRegisteredWithKong] = useState(false);

  // Initialize
  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    const client = await AuthClient.create();
    setAuthClient(client);
    
    const isAuth = await client.isAuthenticated();
    if (isAuth) {
      handleAuthenticated(client);
    }
  };

  const handleAuthenticated = async (client) => {
    const identity = client.getIdentity();
    setIdentity(identity);
    setIsAuthenticated(true);
    
    const principalText = identity.getPrincipal().toText();
    setPrincipal(principalText);
    
    // Create agent
    const agent = new HttpAgent({
      identity,
      host: 'https://ic0.app',
    });
    
    // Create LP Locking actor
    const lpActor = Actor.createActor(lpLockingIdlFactory, {
      agent,
      canisterId: LP_LOCKING_BACKEND_ID,
    });
    setLpLockActor(lpActor);
    
    // Create KongSwap actor
    const kongActor = Actor.createActor(kongIdlFactory, {
      agent,
      canisterId: KONG_BACKEND_ID,
    });
    setKongActor(kongActor);
    
    // Load data
    await loadData(lpActor, identity.getPrincipal());
  };

  const loadData = async (actor, userPrincipal) => {
    setLoading(true);
    try {
      // Get LP address
      const addressResult = await actor.get_my_lp_address();
      if ('Ok' in addressResult) {
        setLpAddress(addressResult.Ok);
      }
      
      // Get voting power
      const power = await actor.get_my_voting_power();
      setVotingPower(Number(power));
      
      // Get all voting powers
      const allPowers = await actor.get_all_voting_powers();
      setAllVotingPowers(allPowers);
      
      // Check KongSwap registration
      if (kongActor) {
        try {
          const result = await kongActor.user_balances(userPrincipal.toText());
          if ('Ok' in result) {
            setIsRegisteredWithKong(true);
          } else if ('Err' in result && result.Err.includes('User not found')) {
            setIsRegisteredWithKong(false);
          }
        } catch (e) {
          console.log('Error checking KongSwap registration:', e);
        }
      }
      
      // Get ICP balance
      const icpLedgerActor = Actor.createActor(icpLedgerIdlFactory, {
        agent: new HttpAgent({ identity, host: 'https://ic0.app' }),
        canisterId: ICP_LEDGER_ID,
      });
      
      const account = { owner: userPrincipal, subaccount: [] };
      const balance = await icpLedgerActor.icrc1_balance_of(account);
      setIcpBalance(Number(balance) / 100000000);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage(`Error loading data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!authClient) return;
    
    await authClient.login({
      identityProvider: 'https://identity.ic0.app',
      onSuccess: () => handleAuthenticated(authClient),
      onError: (error) => {
        console.error('Login failed:', error);
        setMessage('Login failed');
      },
    });
  };

  const handleLogout = async () => {
    if (!authClient) return;
    await authClient.logout();
    setIsAuthenticated(false);
    setPrincipal('');
    setLpAddress('');
    setVotingPower(0);
    setLpLockActor(null);
  };

  const handleRegister = async () => {
    if (!lpLockActor) return;
    
    setLoading(true);
    setMessage('');
    try {
      const result = await lpLockActor.register_for_lp_locking();
      if ('Ok' in result) {
        setLpAddress(result.Ok);
        setMessage(`Registered! Your LP address: ${result.Ok}`);
      } else {
        setMessage(`Error: ${result.Err}`);
      }
    } catch (error) {
      setMessage(`Failed to register: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterWithKongSwap = async () => {
    if (!lpLockActor) return;
    
    setLoading(true);
    setMessage('');
    try {
      const result = await lpLockActor.register_with_kongswap();
      if ('Ok' in result) {
        setMessage(result.Ok);
        setIsRegisteredWithKong(true);
      } else {
        setMessage(`Error: ${result.Err}`);
      }
    } catch (error) {
      setMessage(`Failed to register with KongSwap: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncVotingPower = async () => {
    if (!lpLockActor) return;
    
    setLoading(true);
    setMessage('');
    try {
      const result = await lpLockActor.sync_my_voting_power();
      if ('Ok' in result) {
        const newPower = Number(result.Ok);
        setVotingPower(newPower);
        setMessage(`Voting power synced: ${newPower}`);
        
        // Reload all voting powers
        const allPowers = await lpLockActor.get_all_voting_powers();
        setAllVotingPowers(allPowers);
      } else {
        setMessage(`Error: ${result.Err}`);
      }
    } catch (error) {
      setMessage(`Failed to sync: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = async (address) => {
    await navigator.clipboard.writeText(address);
    setMessage('Address copied to clipboard!');
    setTimeout(() => setMessage(''), 3000);
  };

  const formatPrincipal = (p) => {
    if (!p) return '';
    const str = p.toString ? p.toString() : p;
    return `${str.slice(0, 5)}...${str.slice(-4)}`;
  };

  return (
    <div className="app">
      <header>
        <div className="header-content">
          <h1>🔐 LP Token Locker</h1>
          <p>Lock your KongSwap LP tokens for DAO governance</p>
        </div>
        <div className="auth-section">
          {isAuthenticated ? (
            <div className="user-info">
              <span className="principal">{formatPrincipal(principal)}</span>
              <span className="voting-power">🗳️ Voting Power: {votingPower}</span>
              <button onClick={handleLogout} className="btn-logout">Logout</button>
            </div>
          ) : (
            <button onClick={handleLogin} className="btn-login">
              Connect with Internet Identity
            </button>
          )}
        </div>
      </header>

      {isAuthenticated ? (
        <div className="main-content">
          <div className="info-section">
            <h2>Your Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Principal:</label>
                <code>{principal}</code>
              </div>
              <div className="info-item">
                <label>ICP Balance:</label>
                <span>{icpBalance.toFixed(4)} ICP</span>
              </div>
              <div className="info-item">
                <label>KongSwap Status:</label>
                <span className={isRegisteredWithKong ? 'status-registered' : 'status-not-registered'}>
                  {isRegisteredWithKong ? '✓ Registered' : '✗ Not Registered'}
                </span>
              </div>
            </div>
          </div>

          <div className="lp-address-section">
            <h2>LP Lock Address</h2>
            {lpAddress ? (
              <>
                <p>Send your KongSwap LP tokens to this address to lock them:</p>
                <div className="address-display">
                  <code>{lpAddress}</code>
                  <button onClick={() => copyAddress(lpAddress)} className="btn-copy">
                    Copy
                  </button>
                </div>
              </>
            ) : (
              <div className="not-registered">
                <p>You need to register to get your LP lock address</p>
                <button onClick={handleRegister} className="btn-primary" disabled={loading}>
                  {loading ? 'Registering...' : 'Register for LP Locking'}
                </button>
              </div>
            )}
          </div>

          <div className="actions-section">
            <h2>Actions</h2>
            <div className="action-buttons">
              {!isRegisteredWithKong && (
                <button onClick={handleRegisterWithKongSwap} className="btn-secondary" disabled={loading}>
                  Register with KongSwap (0.001 ICP)
                </button>
              )}
              <button onClick={handleSyncVotingPower} className="btn-primary" disabled={loading || !lpAddress}>
                {loading ? 'Syncing...' : 'Sync Voting Power'}
              </button>
            </div>
          </div>

          {message && (
            <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}

          <div className="voting-powers-section">
            <h2>All LP Holders</h2>
            {allVotingPowers.length > 0 ? (
              <div className="powers-list">
                <div className="powers-header">
                  <span>User</span>
                  <span>Voting Power</span>
                  <span>Address</span>
                </div>
                {allVotingPowers.map((item, index) => (
                  <div key={index} className="power-item">
                    <span className="user">{formatPrincipal(item[0])}</span>
                    <span className="power">{item[1].toString()}</span>
                    <span className="address">{item[2].slice(0, 8)}...</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No LP holders yet</p>
            )}
          </div>

          <div className="instructions">
            <h3>How to Lock LP Tokens</h3>
            <ol>
              <li>Connect your wallet with Internet Identity</li>
              <li>Register to get your unique LP lock address</li>
              <li>Register with KongSwap if you haven't already (costs 0.001 ICP)</li>
              <li>Provide liquidity on KongSwap to receive LP tokens</li>
              <li>Send your LP tokens to your LP lock address</li>
              <li>Click "Sync Voting Power" to update your governance weight</li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="connect-prompt">
          <h2>Welcome to LP Token Locker</h2>
          <p>Connect your wallet to start locking LP tokens for DAO governance</p>
          <button onClick={handleLogin} className="btn-primary">
            Connect with Internet Identity
          </button>
        </div>
      )}
    </div>
  );
}

// IDL Factory for LP Locking Backend
const lpLockingIdlFactory = ({ IDL }) => {
  return IDL.Service({
    'get_address': IDL.Func([], [IDL.Text], ['query']),
    'get_all_voting_powers': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat, IDL.Text))], ['query']),
    'get_my_lp_address': IDL.Func([], [IDL.Variant({
      'Ok': IDL.Text,
      'Err': IDL.Text,
    })], ['query']),
    'get_my_voting_power': IDL.Func([], [IDL.Nat], ['query']),
    'register_for_lp_locking': IDL.Func([], [IDL.Variant({
      'Ok': IDL.Text,
      'Err': IDL.Text,
    })], []),
    'register_with_kongswap': IDL.Func([], [IDL.Variant({
      'Ok': IDL.Text,
      'Err': IDL.Text,
    })], []),
    'sync_my_voting_power': IDL.Func([], [IDL.Variant({
      'Ok': IDL.Nat,
      'Err': IDL.Text,
    })], []),
  });
};

// IDL Factory for KongSwap
const kongIdlFactory = ({ IDL }) => {
  return IDL.Service({
    'user_balances': IDL.Func([IDL.Text], [IDL.Variant({
      'Ok': IDL.Vec(IDL.Record({})), // Simplified
      'Err': IDL.Text,
    })], ['query']),
  });
};

// IDL Factory for ICP Ledger
const icpLedgerIdlFactory = ({ IDL }) => {
  const Account = IDL.Record({
    'owner': IDL.Principal,
    'subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  
  return IDL.Service({
    'icrc1_balance_of': IDL.Func([Account], [IDL.Nat], ['query']),
  });
};

export default App;