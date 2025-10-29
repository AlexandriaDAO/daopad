import React from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, User } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider/IIProvider';

interface DaoLayoutProps {
  token: any;
  orbitStation: any;
  votingPower?: number;
  loadingVotingPower?: boolean;
  refreshVotingPower?: () => void;
  children: React.ReactNode;
  isEquityStation?: boolean;
}

export default function DaoLayout({
  token,
  orbitStation,
  votingPower = 0,
  loadingVotingPower = false,
  refreshVotingPower,
  children,
  isEquityStation = false
}: DaoLayoutProps) {
  const location = useLocation();
  const { identity } = useAuth();
  const pathParts = location.pathname.split('/').filter(Boolean);

  const userPrincipal = identity?.getPrincipal()?.toText();

  // Defensive check: ensure we have a base route ID
  if (pathParts.length === 0) {
    console.error('[DaoLayout] Invalid path:', location.pathname);
    return <Navigate to="/app" replace />;
  }

  // Use URL param as source of truth (not derived state)
  const baseRouteId = pathParts[0];
  const currentTab = pathParts.length > 1 ? pathParts[pathParts.length - 1] : baseRouteId;
  const isOverview = pathParts.length === 1;

  // Build stable tab links using URL param
  const tabLinks = {
    overview: `/${baseRouteId}`,
    agreement: `/${baseRouteId}/agreement`,
    treasury: `/${baseRouteId}/treasury`,
    equity: `/${baseRouteId}/equity`,
    activity: `/${baseRouteId}/activity`,
    canisters: `/${baseRouteId}/canisters`,
    invoices: `/${baseRouteId}/invoices`,
    settings: `/${baseRouteId}/settings`
  };

  return (
    <div className="min-h-screen bg-executive-charcoal text-executive-lightGray">
      {/* Executive letterhead gold trim line */}
      <div className="h-1 bg-gradient-to-r from-transparent via-executive-gold to-transparent"></div>

      {/* Header with token info */}
      <header className="border-b border-executive-mediumGray bg-executive-darkGray">
        <div className="container mx-auto px-4 lg:px-6 max-w-7xl">
          {/* Back button row with user info */}
          <div className="py-4 flex justify-between items-center flex-wrap gap-2">
            <Link to="/app" className="text-executive-gold hover:text-executive-goldLight inline-flex items-center gap-2">
              ← Back to Dashboard
            </Link>
            {userPrincipal && (
              <div className="flex items-center gap-2 text-xs text-executive-lightGray/70">
                <User className="h-3 w-3" />
                <span className="font-mono">{userPrincipal.slice(0, 20)}...{userPrincipal.slice(-10)}</span>
              </div>
            )}
          </div>

          {/* Main header content - responsive grid */}
          <div className="pb-6 grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
            {/* Left: Token info */}
            <div>
              <h1 className="text-2xl md:text-3xl font-display text-executive-ivory tracking-wide">
                {token.name}
              </h1>
              <div className="h-px bg-executive-gold w-16 mt-2"></div>
              <p className="text-xs md:text-sm text-executive-lightGray/70 mt-2 font-mono break-all">
                {token.canister_id}
              </p>
            </div>

            {/* Center: Orbit Station status */}
            {orbitStation && (
              <div className="flex flex-col items-start lg:items-center">
                <p className="text-xs text-green-600 font-mono break-all">
                  ✓ Treasury: {orbitStation.station_id}
                </p>
              </div>
            )}

            {/* Right: Voting power */}
            {votingPower > 0 && (
              <div className="flex items-center gap-2 lg:justify-end">
                <Badge variant={votingPower >= 10000 ? "default" : "secondary"}>
                  {loadingVotingPower ? "Loading VP..." : `${votingPower.toLocaleString()} VP${votingPower >= 10000 ? " ✓" : ""}`}
                </Badge>
                {refreshVotingPower && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshVotingPower}
                    disabled={loadingVotingPower}
                    className="h-6 w-6 p-0"
                    title="Refresh voting power"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingVotingPower ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="border-b border-executive-mediumGray bg-executive-darkGray">
        <div className="container mx-auto px-4 lg:px-6 max-w-7xl">
          {/* Mobile: Scrollable tabs | Desktop: Flex wrap */}
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="inline-flex sm:flex sm:flex-wrap gap-1 min-w-full sm:min-w-0">
              <TabButton to={tabLinks.overview} active={isOverview}>
                Overview
              </TabButton>
              <TabButton to={tabLinks.agreement} active={currentTab === 'agreement'}>
                Agreement
              </TabButton>
              <TabButton to={tabLinks.treasury} active={currentTab === 'treasury'}>
                Treasury
              </TabButton>
              {isEquityStation && (
                <TabButton to={tabLinks.equity} active={currentTab === 'equity'}>
                  Equity
                </TabButton>
              )}
              <TabButton to={tabLinks.activity} active={currentTab === 'activity'}>
                Activity
              </TabButton>
              <TabButton to={tabLinks.canisters} active={currentTab === 'canisters'}>
                Canisters
              </TabButton>
              <TabButton to={tabLinks.invoices} active={currentTab === 'invoices'}>
                Invoices
              </TabButton>
              <TabButton to={tabLinks.settings} active={currentTab === 'settings'}>
                Settings
              </TabButton>
            </div>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <main className="container mx-auto px-4 lg:px-6 max-w-7xl py-8">
        {children}
      </main>

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
  );
}

interface TabButtonProps {
  to: string;
  active: boolean;
  children: React.ReactNode;
}

function TabButton({ to, active, children }: TabButtonProps) {
  return (
    <Link
      to={to}
      className={`
        whitespace-nowrap px-4 py-3 text-sm font-medium transition-all
        rounded-t-md border-b-2
        ${active
          ? 'bg-executive-mediumGray/30 border-executive-gold text-executive-gold'
          : 'border-transparent text-executive-lightGray/70 hover:text-executive-gold hover:bg-executive-mediumGray/10 hover:border-executive-gold/50'
        }
      `}
    >
      {children}
    </Link>
  );
}
