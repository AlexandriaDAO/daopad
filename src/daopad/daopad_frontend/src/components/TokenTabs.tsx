import React, { useState, useEffect, useMemo, Suspense } from 'react';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getProposalService } from '../services/backend';
import { KongLockerService } from '../services/backend';
import TokenDashboard from './TokenDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import type { Token, VotingPower, LPPosition } from '../types';

interface TokenTabsProps {
  identity: Identity | null;
}

const TokenTabs: React.FC<TokenTabsProps> = ({ identity }) => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [tokenVotingPowers, setTokenVotingPowers] = useState<Record<string, VotingPower[]>>({});
  const [userLPPositions, setUserLPPositions] = useState<LPPosition[]>([]);

  useEffect(() => {
    loadTokensAndPowers();
  }, [identity]);

  const loadTokensAndPowers = async (): Promise<void> => {
    if (!identity) return;

    setLoading(true);
    setError('');

    try {
      const daopadService = getProposalService(identity);
      const kongLockerService = new KongLockerService(identity);

      // Get user's locked tokens
      const tokensResult = await daopadService.getMyLockedTokens();
      if (!tokensResult.success) {
        setError(tokensResult.error || 'Failed to load tokens');
        return;
      }

      const lockedTokens = tokensResult.data || [];
      if (lockedTokens.length === 0) {
        setError('No locked tokens found. Please lock some LP tokens in Kong Locker first.');
        return;
      }

      // Don't set tokens yet - wait until we have voting powers

      // Get user's Kong Locker canister
      const canisterResult = await daopadService.getMyKongLockerCanister();
      if (!canisterResult.success || !canisterResult.data) {
        setError('Kong Locker canister not found');
        return;
      }

      const lockCanisterPrincipal = canisterResult.data.toString();

      // Get LP positions to calculate per-token voting power
      const positionsResult = await kongLockerService.getLPPositions(lockCanisterPrincipal);
      if (positionsResult.success) {
        const positions = positionsResult.data || [];
        setUserLPPositions(positions);

        // Calculate voting power per token
        const votingPowers: Record<string, VotingPower[]> = {};
        lockedTokens.forEach((token: Token) => {
          const tokenPositions = positions.filter(pos =>
            pos.address_0 === token.canister_id || pos.address_1 === token.canister_id
          );

          // Use the total USD value of the entire LP position (both sides combined)
          const totalUsdValue = tokenPositions.reduce((sum, pos) => {
            return sum + (pos.usd_balance || 0);
          }, 0);

          votingPowers[token.canister_id] = Math.floor(totalUsdValue * 100);
        });

        setTokenVotingPowers(votingPowers);

        // Sort tokens by voting power (highest first)
        const sortedTokens = [...lockedTokens].sort((a, b) => {
          const powerA = votingPowers[a.canister_id] || 0;
          const powerB = votingPowers[b.canister_id] || 0;
          return powerB - powerA;
        });

        setTokens(sortedTokens);
      } else {
        // If we couldn't get voting powers, just set tokens as is
        setTokens(lockedTokens);
      }

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


      <div>
        {tokens[activeTab] && (
          <TokenDashboard
            token={tokens[activeTab]}
            tokens={tokens}
            activeTokenIndex={activeTab}
            onTokenChange={setActiveTab}
            tokenVotingPowers={tokenVotingPowers}
            identity={identity}
            votingPower={tokenVotingPowers[tokens[activeTab].canister_id] || 0}
            lpPositions={userLPPositions.filter(pos =>
              pos.address_0 === tokens[activeTab].canister_id ||
              pos.address_1 === tokens[activeTab].canister_id
            )}
            onRefresh={loadTokensAndPowers}
          />
        )}
      </div>
    </div>
  );
};

export default TokenTabs;
