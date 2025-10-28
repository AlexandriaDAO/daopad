import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useIdentity } from '../hooks/useIdentity';
import { useLogout } from '../hooks/useLogout';
import { setAuthSuccess, clearAuth, setAuthLoading, setAuthInitialized } from '../features/auth/authSlice';
import { fetchBalances } from '../state/balance/balanceThunks';
import { clearBalances } from '../state/balance/balanceSlice';
import {
  clearDaoState,
  fetchPublicDashboard
} from '../features/dao/daoSlice';

// Components
import PublicStatsStrip from '../components/PublicStatsStrip';
import TreasuryShowcase from '../components/TreasuryShowcase';
import RouteErrorBoundary from '../components/errors/RouteErrorBoundary';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Toaster } from '@/components/ui/toaster';
import { ThemeToggle } from '@/components/ui/theme-toggle';

function AppRoute() {
  const [copyFeedback, setCopyFeedback] = useState(false);
  const intervalRef = useRef(null);

  const navigate = useNavigate();
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
    } else {
      dispatch(clearAuth());
      dispatch(clearBalances());
      dispatch(clearDaoState());
    }
    dispatch(setAuthInitialized(true));
  }, [identity, dispatch]);

  // Load public data for all users with proper cleanup and visibility handling
  useEffect(() => {
    // Always fetch public data, but poll less frequently if authenticated
    const pollInterval = isAuthenticated ? 60000 : 30000; // 60s for auth, 30s for anon

    const startPolling = () => {
      // Always dispatch on initial load with error handling
      dispatch(fetchPublicDashboard())
        .unwrap()
        .catch((error) => {
          console.error('Failed to fetch public dashboard:', error);
          // Dashboard will show loading/empty state gracefully
        });

      // Only start polling interval if document is visible
      // This prevents unnecessary API calls when tab is in background
      if (!document.hidden) {
        intervalRef.current = setInterval(() => {
          if (!document.hidden) {
            dispatch(fetchPublicDashboard())
              .unwrap()
              .catch((error) => {
                console.error('Failed to fetch public dashboard (polling):', error);
                // Continue polling - transient failures shouldn't stop updates
              });
          }
        }, pollInterval);
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
      } else {
        // Resume polling when tab becomes visible
        stopPolling(); // Clear any existing interval first
        startPolling();
      }
    };

    startPolling();

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, dispatch]);

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
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
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
                        aria-label="Refresh ICP balance"
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
                    aria-label="Copy principal to clipboard"
                  >
                    {copyFeedback ? '✓' : '⧉'}
                  </Button>
                </div>
                {kongLockerCanister && (
                  <Badge className="bg-executive-mediumGray border-executive-gold/30 text-executive-goldLight" title={`Kong Locker: ${kongLockerCanister}`}>
                    🔒 Connected
                  </Badge>
                )}
                <Button
                  className="border-executive-gold/30 text-executive-goldLight hover:bg-executive-gold/10 hover:border-executive-gold"
                  variant="outline"
                  onClick={handleLogout}
                  aria-label="Logout from DAOPad"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <Button
                className="bg-executive-gold text-executive-charcoal hover:bg-executive-goldLight font-serif"
                onClick={handleLogin}
                aria-label="Connect with Internet Identity"
              >
                Connect with Internet Identity
              </Button>
            )}
          </div>
        </div>
      </header>

    <main className="container mx-auto px-4 py-8">
      {/* DEFAULT VIEW - Same for everyone (logged in or not) */}
      <div className="space-y-8">
        {/* Stats overview */}
        <section>
          <PublicStatsStrip />
        </section>

        {/* Treasury showcase - shows ALL treasuries */}
        <section>
          <TreasuryShowcase onSelectStation={(stationId) => navigate(`/${stationId}`)} />
        </section>
      </div>
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