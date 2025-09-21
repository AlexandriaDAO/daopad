import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { DAOPadBackendService } from '../services/daopadBackend';
import { KongLockerService } from '../services/kongLockerService';
import TokenTabContent from './TokenTabContent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';

const TokenTabs = ({ identity }) => {
  const [tokens, setTokens] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tokenVotingPowers, setTokenVotingPowers] = useState({});
  const [userLPPositions, setUserLPPositions] = useState([]);

  useEffect(() => {
    loadTokensAndPowers();
  }, [identity]);

  const loadTokensAndPowers = async () => {
    if (!identity) return;

    setLoading(true);
    setError('');

    try {
      const daopadService = new DAOPadBackendService(identity);
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
        const votingPowers = {};
        lockedTokens.forEach(token => {
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

  const ReactQueryDemo = useMemo(() => {
    if (!showOrbitDebugPanels) return null;
    return React.lazy(() => import('./ReactQueryDemo'));
  }, [showOrbitDebugPanels]);

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
      <div>
        <h2 className="text-3xl font-display text-executive-ivory">Token Governance</h2>
      </div>

      {showOrbitDebugPanels && OrbitStationTest && ReactQueryDemo && (
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
            <ReactQueryDemo />
          </div>
        </Suspense>
      )}

      <Card className="bg-executive-darkGray border-executive-gold/20">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="token-select" className="text-sm font-medium mb-2 block">
                Select Token:
              </Label>
              <Select
                value={activeTab.toString()}
                onValueChange={(value) => setActiveTab(Number(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tokens.map((token, index) => (
                    <SelectItem key={token.canister_id} value={index.toString()}>
                      {token.symbol} ({token.chain}) - {(tokenVotingPowers[token.canister_id] || 0).toLocaleString()} VP
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {tokens[activeTab] && (
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <Badge variant="default">{tokens[activeTab].symbol}</Badge>
                  <Badge variant="outline">{tokens[activeTab].chain}</Badge>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Voting Power</div>
                  <div className="text-xl font-bold font-mono">
                    {(tokenVotingPowers[tokens[activeTab].canister_id] || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        {tokens[activeTab] && (
          <TokenTabContent
            token={tokens[activeTab]}
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
