import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Link } from 'react-router-dom';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getProposalService, getTokenService } from '../services/backend';
import { KongLockerService } from '../services/backend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Token, VotingPower, LPPosition } from '../types';

interface TokenTabsProps {
  identity: Identity | null;
}

const TokenTabs: React.FC<TokenTabsProps> = ({ identity }) => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [tokenVotingPowers, setTokenVotingPowers] = useState<Record<string, number>>({});
  const [tokenStations, setTokenStations] = useState<Record<string, string>>({});  // tokenId -> stationId mapping
  const [userLPPositions, setUserLPPositions] = useState<LPPosition[]>([]);

  useEffect(() => {
    loadTokensAndPowers();
  }, [identity]);

  const loadTokensAndPowers = async (): Promise<void> => {
    if (!identity) return;

    setLoading(true);
    setError('');

    try {
      // Use TokenService for token operations
      const tokenService = getTokenService(identity);
      const kongLockerService = new KongLockerService(identity);

      // Get user's locked tokens (FROM TokenService)
      const tokensResult = await tokenService.getMyLockedTokens();
      if (!tokensResult.success) {
        setError(tokensResult.error || 'Failed to load tokens');
        return;
      }

      const lockedTokens = tokensResult.data || [];
      if (lockedTokens.length === 0) {
        setError('No locked tokens found. Please lock some LP tokens in Kong Locker first.');
        return;
      }

      // Get user's Kong Locker canister (FROM KongLockerService)
      const canisterResult = await kongLockerService.getMyCanister();
      if (!canisterResult.success || !canisterResult.data) {
        setError('Kong Locker canister not found');
        return;
      }

      const lockCanisterPrincipal = canisterResult.data.toString();

      // Get LP positions (FROM KongLockerService, no params) - for display only
      const positionsResult = await kongLockerService.getPositions();
      if (positionsResult.success) {
        const positions = positionsResult.data || [];
        setUserLPPositions(positions);
      }

      // Get voting power and station ID per token directly from backend
      const votingPowers: Record<string, number> = {};
      const stations: Record<string, string> = {};
      for (const token of lockedTokens) {
        try {
          const vpResult = await tokenService.getMyVotingPowerForToken(token.canister_id);
          if (vpResult.success && vpResult.data !== undefined) {
            votingPowers[token.canister_id] = Number(vpResult.data);
          } else {
            votingPowers[token.canister_id] = 0;
          }

          // Get station ID for this token
          const stationResult = await tokenService.getStationForToken(token.canister_id);
          if (stationResult.success && stationResult.data) {
            stations[token.canister_id] = stationResult.data.toString();
          }
        } catch (err) {
          console.error(`Failed to get voting power for ${token.symbol}:`, err);
          votingPowers[token.canister_id] = 0;
        }
      }

      setTokenVotingPowers(votingPowers);
      setTokenStations(stations);

      // Sort tokens by voting power (highest first)
      const sortedTokens = [...lockedTokens].sort((a, b) => {
        const powerA = votingPowers[a.canister_id] || 0;
        const powerB = votingPowers[b.canister_id] || 0;
        return powerB - powerA;
      });

      setTokens(sortedTokens);

    } catch (err) {
      console.error('Error loading tokens and powers:', err);
      setError('Failed to load token information');
    } finally {
      setLoading(false);
    }
  };

  const showOrbitDebugPanels = import.meta.env.VITE_SHOW_ORBIT_DEBUG === 'true';

  const OrbitStationTest = useMemo(() => {
    if (!showOrbitDebugPanels) return null;
    return React.lazy(() => import('./OrbitStationTest'));
  }, [showOrbitDebugPanels]);

  // ReactQueryDemo removed - migrated to Redux

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-executive-darkGray border-executive-gold/20">
        <CardHeader>
          <CardTitle className="text-executive-ivory">Unable to Load Tokens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{error}</p>
          <div className="flex gap-2">
            <Button onClick={loadTokensAndPowers} variant="outline">
              Try Again
            </Button>
            <Button asChild>
              <a
                href="https://konglocker.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Go to Kong Locker
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tokens.length === 0) {
    return (
      <Card className="bg-executive-darkGray border-executive-gold/20">
        <CardHeader>
          <CardTitle className="text-executive-ivory">No Locked Tokens Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            You need to lock some LP tokens in Kong Locker to use DAOPad governance features.
          </p>
          <Button asChild>
            <a
              href="https://konglocker.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Go to Kong Locker →
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-display text-executive-ivory tracking-wide">Your DAOs</h2>
        <div className="h-px bg-executive-gold w-16"></div>
      </div>

      {showOrbitDebugPanels && OrbitStationTest && (
        <Suspense
          fallback={(
            <Card className="bg-executive-darkGray border-executive-gold/20">
              <CardContent className="py-12 text-center text-sm text-executive-lightGray">
                Loading developer tools…
              </CardContent>
            </Card>
          )}
        >
          <div className="grid lg:grid-cols-2 gap-6">
            <OrbitStationTest />
          </div>
        </Suspense>
      )}

      {/* Grid of token cards linking to station routes */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tokens.map(token => {
          const votingPower = tokenVotingPowers[token.canister_id] || 0;
          const stationId = tokenStations[token.canister_id];
          const lpCount = userLPPositions.filter(pos =>
            pos.address_0 === token.canister_id ||
            pos.address_1 === token.canister_id
          ).length;

          // Skip tokens without a station (not set up yet)
          if (!stationId) return null;

          return (
            <Link
              key={token.canister_id}
              to={`/${stationId}`}
              className="block"
            >
              <Card className="bg-executive-darkGray border-executive-mediumGray hover:border-executive-gold transition-colors h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-executive-ivory">{token.symbol}</CardTitle>
                    {votingPower > 0 && (
                      <Badge className="bg-executive-gold/20 text-executive-gold border-executive-gold/30">
                        VP: {votingPower.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-executive-lightGray/70">{token.name}</p>
                  <p className="text-xs text-executive-lightGray/50 font-mono truncate">
                    {token.canister_id}
                  </p>
                  {lpCount > 0 && (
                    <p className="text-xs text-executive-gold/70">
                      {lpCount} LP position{lpCount > 1 ? 's' : ''}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default TokenTabs;
