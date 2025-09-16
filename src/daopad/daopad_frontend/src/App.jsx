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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">DAOPad</h1>
            <p className="text-muted-foreground">Token Governance Platform</p>
            <p className="text-sm text-muted-foreground">Create treasuries and vote with your locked liquidity</p>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {balanceLoading ? (
                    <span className="text-sm text-muted-foreground">Loading balance...</span>
                  ) : (
                    <>
                      <span className="text-sm font-mono">ICP: {icpBalance}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dispatch(fetchBalances(identity))}
                        title="Refresh balance"
                      >
                        ↻
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">{principal.slice(0, 5)}...{principal.slice(-4)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyPrincipal}
                    title="Copy principal"
                  >
                    {copyFeedback ? '✓' : '⧉'}
                  </Button>
                </div>
                {kongLockerCanister && (
                  <Badge variant="secondary" title={`Kong Locker: ${kongLockerCanister}`}>
                    🔒 Connected
                  </Badge>
                )}
                <Button variant="outline" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            ) : (
              <Button onClick={handleLogin}>
                Connect with Internet Identity
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isAuthenticated ? (
          shouldShowKongLockerSetup ? (
            <div className="max-w-2xl mx-auto">
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
          <div className="max-w-4xl mx-auto text-center space-y-12">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold">Welcome to DAOPad</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Create and manage token treasuries using your locked liquidity as voting power.
                Connect your Kong Locker to get started with governance.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <div className="text-6xl">🔒</div>
                <h3 className="text-xl font-semibold">Lock LP Tokens</h3>
                <p className="text-muted-foreground">Permanently lock your LP tokens in Kong Locker to gain voting power</p>
              </div>
              <div className="space-y-4">
                <div className="text-6xl">🏛️</div>
                <h3 className="text-xl font-semibold">Create Treasuries</h3>
                <p className="text-muted-foreground">Deploy Orbit Station treasuries for your tokens with governance controls</p>
              </div>
              <div className="space-y-4">
                <div className="text-6xl">🗳️</div>
                <h3 className="text-xl font-semibold">Vote & Govern</h3>
                <p className="text-muted-foreground">Use your locked value as voting power to control treasury operations</p>
              </div>
            </div>
            <Button size="lg" onClick={handleLogin}>
              Get Started
            </Button>
          </div>
        )}
      </main>

      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Built by <a href="https://lbry.fun" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Alexandria</a> ·
            <a href="https://github.com/AlexandriaDAO/daopad" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a> ·
            <a href="https://x.com/alexandria_lbry" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Twitter</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;