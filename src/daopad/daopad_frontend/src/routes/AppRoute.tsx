import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useIdentity } from '../hooks/useIdentity';
import { setAuthSuccess, clearAuth, setAuthInitialized } from '../features/auth/authSlice';
import { fetchBalances } from '../state/balance/balanceThunks';
import { clearBalances } from '../state/balance/balanceSlice';
import {
  setKongLockerCanister,
  clearDaoState,
  fetchPublicDashboard
} from '../features/dao/daoSlice';
import { getKongLockerService } from '../services/backend';

// Components
import KongLockerSetup from '../components/KongLockerSetup';
import TokenTabs from '../components/TokenTabs';
import PublicStatsStrip from '../components/PublicStatsStrip';
import PublicActivityFeed from '../components/PublicActivityFeed';
import TreasuryShowcase from '../components/TreasuryShowcase';
import RouteErrorBoundary from '../components/errors/RouteErrorBoundary';
import AppHeader from '../components/AppHeader';
import { Toaster } from '@/components/ui/toaster';

function AppRoute() {
  const [isCheckingKongLocker, setIsCheckingKongLocker] = useState(false);
  const intervalRef = useRef(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector(state => state.auth);
  const { kongLockerCanister } = useSelector(state => state.dao);
  const publicStats = useSelector(state => state.dao.publicDashboard.stats);
  const { identity } = useIdentity();

  // Check authentication status on mount and when identity changes
  useEffect(() => {
    console.log('[AppRoute] Auth useEffect triggered, identity:', !!identity);
    if (identity) {
      const principalText = identity.getPrincipal().toString();
      console.log('[AppRoute] User authenticated:', principalText);
      dispatch(setAuthSuccess(principalText));
      // Fetch balances when authenticated
      dispatch(fetchBalances(identity));
      checkKongLockerCanister();
    } else {
      console.log('[AppRoute] No identity, clearing auth state');
      dispatch(clearAuth());
      dispatch(clearBalances());
      dispatch(clearDaoState());
    }
    dispatch(setAuthInitialized(true));
  }, [identity, dispatch]);

  // Load public data for logged-out users with proper cleanup and visibility handling
  useEffect(() => {
    const startPolling = () => {
      if (!isAuthenticated) {
        // Always dispatch on initial load for anonymous users
        dispatch(fetchPublicDashboard());

        // Only start polling interval if document is visible
        // This prevents unnecessary API calls when tab is in background
        if (!document.hidden) {
          intervalRef.current = setInterval(() => {
            if (!document.hidden) {
              dispatch(fetchPublicDashboard());
            }
          }, 30000);
        }
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
    console.log('[AppRoute] checkKongLockerCanister called, identity:', !!identity);
    if (!identity) {
      console.log('[AppRoute] No identity, skipping Kong Locker check');
      return;
    }

    setIsCheckingKongLocker(true);
    try {
      const kongLockerService = getKongLockerService(identity);
      console.log('[AppRoute] Calling getMyCanister...');
      const result = await kongLockerService.getMyCanister();

      console.log('[AppRoute] Kong Locker result:', result);

      if (result.success && result.data) {
        // Convert Principal object to string
        const canisterString = typeof result.data === 'string' ? result.data : result.data.toString();
        console.log('[AppRoute] Setting Kong Locker canister:', canisterString);
        dispatch(setKongLockerCanister(canisterString));
      } else {
        console.log('[AppRoute] No Kong Locker data in result');
      }
    } catch (err) {
      console.error('[AppRoute] Error checking Kong Locker canister:', err);
    } finally {
      setIsCheckingKongLocker(false);
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
      {/* Unified header with authentication */}
      <AppHeader />

    <main className="container mx-auto px-4 py-8">
      {isAuthenticated ? (
        // AUTHENTICATED USER PATH
        shouldShowKongLockerSetup ? (
          <div className="max-w-2xl mx-auto">
            <KongLockerSetup
              identity={identity}
              onComplete={handleKongLockerComplete}
            />
          </div>
        ) : (
          <TokenTabs identity={identity} />
        )
      ) : (
        // ANONYMOUS USER PATH - Show public dashboard
        <div className="space-y-8">
          {/* Stats overview */}
          <section>
            <PublicStatsStrip />
          </section>

          {/* Active proposals feed */}
          <section>
            <PublicActivityFeed />
          </section>

          {/* Treasury showcase */}
          <section>
            <TreasuryShowcase onSelectToken={(tokenId) => navigate(`/dao/${tokenId}`)} />
          </section>
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