import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import TokenHeader from '../token/TokenHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface DaoLayoutProps {
  token: any;
  orbitStation: any;
  votingPower?: number;
  loadingVotingPower?: boolean;
  refreshVotingPower?: () => void;
  children: React.ReactNode;
}

export default function DaoLayout({
  token,
  orbitStation,
  votingPower = 0,
  loadingVotingPower = false,
  refreshVotingPower,
  children
}: DaoLayoutProps) {
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const currentTab = pathParts[pathParts.length - 1];
  const tokenId = token.canister_id;

  // Determine if we're on the overview (base DAO route)
  const isOverview = pathParts.length === 3 || currentTab === tokenId;

  return (
    <div className="min-h-screen bg-executive-charcoal text-executive-lightGray">
      {/* Executive letterhead gold trim line */}
      <div className="h-1 bg-gradient-to-r from-transparent via-executive-gold to-transparent"></div>

      {/* Header with token info */}
      <header className="border-b border-executive-mediumGray bg-executive-darkGray">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/app" className="text-executive-gold hover:text-executive-goldLight">
              ← Back to Dashboard
            </Link>
          </div>
          <div className="mt-4">
            <h1 className="text-3xl font-display text-executive-ivory tracking-wide">
              {token.symbol} DAO
            </h1>
            <div className="h-px bg-executive-gold w-16 mt-2"></div>
            <p className="text-sm text-executive-lightGray/70 mt-2 font-mono">
              {token.canister_id}
            </p>
            {orbitStation && (
              <>
                <p className="text-xs text-green-600 mt-1">
                  ✓ Treasury Station: {orbitStation.station_id}
                </p>
                {votingPower > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={votingPower >= 10000 ? "default" : "secondary"}>
                      {loadingVotingPower ? (
                        "Loading VP..."
                      ) : (
                        `${votingPower.toLocaleString()} VP${votingPower >= 10000 ? " ✓" : ""}`
                      )}
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
              </>
            )}
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <nav className="border-b border-executive-mediumGray bg-executive-darkGray">
        <div className="container mx-auto px-4">
          <div className="flex gap-2">
            <TabLink to={`/dao/${tokenId}`} active={isOverview}>
              Overview
            </TabLink>
            <TabLink to={`/dao/${tokenId}/agreement`} active={currentTab === 'agreement'}>
              Agreement
            </TabLink>
            <TabLink to={`/dao/${tokenId}/treasury`} active={currentTab === 'treasury'}>
              Treasury
            </TabLink>
            <TabLink to={`/dao/${tokenId}/activity`} active={currentTab === 'activity'}>
              Activity
            </TabLink>
            <TabLink to={`/dao/${tokenId}/canisters`} active={currentTab === 'canisters'}>
              Canisters
            </TabLink>
            <TabLink to={`/dao/${tokenId}/settings`} active={currentTab === 'settings'}>
              Settings
            </TabLink>
          </div>
        </div>
      </nav>

      {/* Tab content */}
      <main className="container mx-auto px-4 py-8">
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

interface TabLinkProps {
  to: string;
  active: boolean;
  children: React.ReactNode;
}

function TabLink({ to, active, children }: TabLinkProps) {
  return (
    <Link
      to={to}
      className={`
        px-4 py-3 border-b-2 transition-colors
        ${active
          ? 'border-executive-gold text-executive-gold'
          : 'border-transparent text-executive-lightGray/70 hover:text-executive-gold hover:border-executive-gold/50'
        }
      `}
    >
      {children}
    </Link>
  );
}
