import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIdentity } from '../hooks/useIdentity';
import { useLogout } from '../hooks/useLogout';
import { setAuthLoading, setAuthSuccess, clearAuth } from '../features/auth/authSlice';
import { clearBalances } from '../state/balance/balanceSlice';
import { setKongLockerCanister, clearDaoState } from '../features/dao/daoSlice';
import { fetchBalances } from '../state/balance/balanceThunks';
import { getKongLockerService } from '../services/backend';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';

/**
 * AppHeader Component
 *
 * Unified header that appears on ALL pages of the application
 * Includes authentication controls, user info, and branding
 */
export default function AppHeader() {
  const [copyFeedback, setCopyFeedback] = useState(false);

  const dispatch = useDispatch();
  const { principal, isAuthenticated } = useSelector((state: any) => state.auth);
  const { icpBalance, isLoading: balanceLoading } = useSelector((state: any) => state.balance);
  const { kongLockerCanister } = useSelector((state: any) => state.dao);
  const { login, identity } = useIdentity();
  const logout = useLogout();

  const handleLogin = async () => {
    console.log('[AppHeader] Login initiated');
    dispatch(setAuthLoading(true));
    try {
      await login();
      console.log('[AppHeader] Login successful, checking for identity...');

      // Wait a bit for identity to be available
      setTimeout(async () => {
        if (identity) {
          console.log('[AppHeader] Identity available, setting auth and checking Kong Locker');
          const principalText = identity.getPrincipal().toString();
          dispatch(setAuthSuccess(principalText));
          dispatch(fetchBalances(identity));

          // Check Kong Locker
          try {
            const kongLockerService = getKongLockerService(identity);
            const result = await kongLockerService.getMyCanister();
            console.log('[AppHeader] Kong Locker result:', result);

            if (result.success && result.data) {
              const canisterString = typeof result.data === 'string' ? result.data : result.data.toString();
              console.log('[AppHeader] Setting Kong Locker:', canisterString);
              dispatch(setKongLockerCanister(canisterString));
            }
          } catch (err) {
            console.error('[AppHeader] Error checking Kong Locker:', err);
          }
        } else {
          console.log('[AppHeader] No identity after login');
        }
      }, 1000);
    } catch (error) {
      console.error('[AppHeader] Login failed:', error);
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

  return (
    <>
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
    </>
  );
}
