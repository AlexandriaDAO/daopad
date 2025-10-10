import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIdentity } from '../hooks/useIdentity';
import { useLogout } from '../hooks/useLogout';
import { setAuthSuccess, clearAuth, setAuthLoading, setAuthInitialized } from '../features/auth/authSlice';
import { fetchBalances } from '../state/balance/balanceThunks';
import { clearBalances } from '../state/balance/balanceSlice';
import {
  setKongLockerCanister,
  clearDaoState,
  fetchPublicDashboard
} from '../features/dao/daoSlice';
import { DAOPadBackendService } from '../services/daopadBackend';

// Components
import KongLockerSetup from '../components/KongLockerSetup';
import TokenTabs from '../components/TokenTabs';
import PublicStatsStrip from '../components/PublicStatsStrip';
import PublicActivityFeed from '../components/PublicActivityFeed';
import TreasuryShowcase from '../components/TreasuryShowcase';
import RouteErrorBoundary from '../components/errors/RouteErrorBoundary';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Toaster } from '@/components/ui/toaster';

function AppRoute() {
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isCheckingKongLocker, setIsCheckingKongLocker] = useState(false);
  const intervalRef = useRef(null);

  const dispatch = useDispatch();
  const { principal, isAuthenticated } = useSelector(state => state.auth);
  const { icpBalance, isLoading: balanceLoading } = useSelector(state => state.balance);
  const { kongLockerCanister } = useSelector(state => state.dao);
  const publicStats = useSelector(state => state.dao.publicDashboard.stats);
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

  // Load public data for logged-out users with proper cleanup and visibility handling
  useEffect(() => {
    const startPolling = () => {
      if (!isAuthenticated && !document.hidden) {
        dispatch(fetchPublicDashboard());

        intervalRef.current = setInterval(() => {
          dispatch(fetchPublicDashboard());
        }, 30000);
      }
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else if (!isAuthenticated) {
        // Resume polling when tab becomes visible
        stopPolling(); // Clear any existing interval first
        startPolling();
      }
    };

    if (!isAuthenticated) {
      startPolling();
    } else {
      stopPolling();
    }

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, dispatch]);

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

  const handleReset = () => {
    // Optionally refetch data or reset route state
    console.log('Route error boundary reset');
  };

  return (
    <RouteErrorBoundary onReset={handleReset}>
      <div className="min-h-screen bg-executive-charcoal text-executive-lightGray">
      {/* Executive letterhead gold trim line */}
      <div className="h-1 bg-gradient-to-r from-transparent via-executive-gold to-transparent"></div>

      <header className="border-b border-executive-mediumGray bg-executive-darkGray">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-display text-executive-ivory tracking-wide">DAOPad</h1>
            <div className="h-px bg-executive-gold w-16"></div>
            <p className="text-executive-lightGray/80 font-serif text-sm uppercase tracking-widest">Token Governance Platform</p>
            <p className="text-xs text-executive-lightGray/60 italic">Create treasuries and vote with your locked liquidity</p>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {balanceLoading ? (
                    <span className="text-sm text-muted-foreground">Loading balance...</span>
                  ) : (
                    <>
                      <span className="text-sm font-mono text-executive-gold">ICP: {icpBalance}</span>
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
                  <Badge className="bg-executive-mediumGray border-executive-gold/30 text-executive-goldLight" title={`Kong Locker: ${kongLockerCanister}`}>
                    🔒 Connected
                  </Badge>
                )}
                <Button className="border-executive-gold/30 text-executive-goldLight hover:bg-executive-gold/10 hover:border-executive-gold" variant="outline" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            ) : (
              <Button className="bg-executive-gold text-executive-charcoal hover:bg-executive-goldLight font-serif" onClick={handleLogin}>
                Connect with Internet Identity
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Experimental Warning Banner */}
      <div className="bg-yellow-50 border-b border-yellow-200">
        <div className="container mx-auto px-4 py-3">
          <Alert className="border-yellow-400 bg-transparent p-0 rounded-none">
            <AlertDescription className="text-sm text-yellow-800">
              <span className="font-semibold">⚠️ Experimental Product:</span> This platform is currently in testing. Feel free to explore and play around (everything's free!), but expect changes as we improve the system. No real funds are at risk during this experimental phase.
            </AlertDescription>
          </Alert>
        </div>
      </div>

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
          {/* Executive seal watermark effect */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center opacity-5">
              <div className="w-64 h-64 border-8 border-executive-gold rounded-full flex items-center justify-center">
                <span className="text-6xl font-display">DAO</span>
              </div>
            </div>
            <div className="relative space-y-4">
              <h2 className="text-5xl font-display text-executive-ivory tracking-wider">Welcome to DAOPad</h2>
              <div className="flex items-center justify-center gap-4">
                <div className="h-px bg-executive-gold/50 w-24"></div>
                <span className="text-executive-gold text-lg">◆</span>
                <div className="h-px bg-executive-gold/50 w-24"></div>
              </div>
              <p className="text-xl text-executive-lightGray/90 max-w-2xl mx-auto font-serif leading-relaxed">
                Create and manage token treasuries using your locked liquidity as voting power.
              </p>
            </div>
          </div>

          {/* Live stats strip */}
          <PublicStatsStrip />

          {/* Activity sections */}
          <div className="grid md:grid-cols-2 gap-8 text-left">
            <PublicActivityFeed />
            <TreasuryShowcase />
          </div>

          {/* Update existing cards with live counts */}
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-executive-darkGray/50 border border-executive-gold/20 p-6 rounded space-y-4">
              <div className="text-5xl text-executive-gold">🔒</div>
              <h3 className="text-xl font-serif text-executive-ivory">Lock LP Tokens</h3>
              <p className="text-executive-lightGray/70 text-sm leading-relaxed">
                Permanently lock your LP tokens in Kong Locker to gain voting power
              </p>
              {publicStats && (
                <Badge className="bg-executive-gold/20 text-executive-goldLight border-executive-gold/30">
                  {publicStats.participants} participants
                </Badge>
              )}
            </div>
            <div className="bg-executive-darkGray/50 border border-executive-gold/20 p-6 rounded space-y-4">
              <div className="text-5xl text-executive-gold">🏛️</div>
              <h3 className="text-xl font-serif text-executive-ivory">Create Treasuries</h3>
              <p className="text-executive-lightGray/70 text-sm leading-relaxed">
                Deploy Orbit Station treasuries for your tokens with governance controls
              </p>
              {publicStats && (
                <Badge className="bg-executive-gold/20 text-executive-goldLight border-executive-gold/30">
                  {publicStats.treasuries} treasuries
                </Badge>
              )}
            </div>
            <div className="bg-executive-darkGray/50 border border-executive-gold/20 p-6 rounded space-y-4">
              <div className="text-5xl text-executive-gold">🗳️</div>
              <h3 className="text-xl font-serif text-executive-ivory">Vote & Govern</h3>
              <p className="text-executive-lightGray/70 text-sm leading-relaxed">
                Use your locked value as voting power to control treasury operations
              </p>
              {publicStats && (
                <Badge className="bg-executive-gold/20 text-executive-goldLight border-executive-gold/30">
                  {publicStats.activeProposals} active votes
                </Badge>
              )}
            </div>
          </div>
          <Button size="lg" className="bg-executive-gold text-executive-charcoal hover:bg-executive-goldLight font-serif px-8 py-6 text-lg" onClick={handleLogin}>
            Get Started
          </Button>
        </div>
      )}
    </main>

    <Toaster />
    <footer className="border-t border-executive-gold/20 mt-16 bg-executive-darkGray">
      <div className="container mx-auto px-4 py-6 text-center">
        <div className="h-px bg-executive-gold/30 w-32 mx-auto mb-4"></div>
        <p className="text-xs text-executive-lightGray/60 font-serif tracking-wider uppercase">
          Built by <a href="https://lbry.fun" target="_blank" rel="noopener noreferrer" className="text-executive-gold/70 hover:text-executive-gold transition-colors">Alexandria</a> ·
          <a href="https://github.com/AlexandriaDAO/daopad" target="_blank" rel="noopener noreferrer" className="text-executive-gold/70 hover:text-executive-gold transition-colors ml-2">GitHub</a> ·
          <a href="https://x.com/alexandria_lbry" target="_blank" rel="noopener noreferrer" className="text-executive-gold/70 hover:text-executive-gold transition-colors ml-2">Twitter</a>
        </p>
      </div>
    </footer>
      </div>
    </RouteErrorBoundary>
  );
}

export default AppRoute;