import { useState, useEffect } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import { HttpAgent, Actor, Identity } from '@dfinity/agent';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Wallet, Shield, Lock, Sparkles } from 'lucide-react';

import { idlFactory as icpiIdlFactory } from 'declarations/ICPI/ICPI.did.js';
import { canisterId as icpiCanisterId } from 'declarations/ICPI';

import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Dashboard } from './components/Dashboard';
import { FullPageSkeleton } from './components/LoadingStates';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  useIndexState,
  useRebalancerStatus,
  useTVLData,
  useUserBalance,
  useHoldings,
  useAllocation,
  useMintICPI,
  useRedeemICPI,
  useManualRebalance
} from './hooks/useICPI';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      cacheTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});

function AppContent() {
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [principal, setPrincipal] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [balance, setBalance] = useState('0');
  const [actor, setActor] = useState<Actor | null>(null);
  const [autoRebalance, setAutoRebalance] = useState(true);

  // Use React Query hooks
  const { data: indexState, isLoading: indexLoading } = useIndexState(actor);
  const { data: rebalancerStatus } = useRebalancerStatus(actor);
  const { data: tvlData } = useTVLData(actor);
  const { data: userBalance } = useUserBalance(actor, principal);
  const { data: holdings } = useHoldings(actor);
  const { data: allocations } = useAllocation(actor);

  const mintMutation = useMintICPI(actor);
  const redeemMutation = useRedeemICPI(actor);
  const rebalanceMutation = useManualRebalance(actor);

  useEffect(() => {
    AuthClient.create({
      idleOptions: {
        idleTimeout: 1000 * 60 * 60 * 24 * 7, // 7 days
        disableDefaultIdleCallback: true,
        disableIdle: false,
      }
    }).then(async (client) => {
      setAuthClient(client);
      const isAuth = await client.isAuthenticated();
      if (isAuth) {
        const identity = client.getIdentity();
        setIdentity(identity);
        setPrincipal(identity.getPrincipal().toString());
        setIsAuthenticated(true);
      }
    });
  }, []);

  useEffect(() => {
    if (isAuthenticated && identity) {
      createActor();
    }
  }, [isAuthenticated, identity]);

  const login = async () => {
    if (!authClient) return;

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const identityProvider = isLocal ? 'http://localhost:4943' : 'https://identity.ic0.app';
    const weekInNanoSeconds = BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000);

    await authClient.login({
      identityProvider,
      maxTimeToLive: weekInNanoSeconds,
      onSuccess: () => {
        const identity = authClient.getIdentity();
        setIdentity(identity);
        setPrincipal(identity.getPrincipal().toString());
        setIsAuthenticated(true);
      },
    });
  };

  const logout = async () => {
    if (!authClient) return;
    await authClient.logout();
    setIdentity(null);
    setPrincipal('');
    setIsAuthenticated(false);
    setBalance('0');
    setActor(null);
  };

  const createActor = () => {
    if (!identity) throw new Error('Not authenticated');

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const host = isLocal ? 'http://localhost:4943' : 'https://icp-api.io';
    const agent = new HttpAgent({ identity, host });

    if (isLocal) {
      agent.fetchRootKey().catch(console.error);
    }

    const newActor = Actor.createActor(icpiIdlFactory, {
      agent,
      canisterId: icpiCanisterId,
    });
    setActor(newActor);
    fetchBalance(newActor);
    return newActor;
  };

  const fetchBalance = async (actorInstance?: any) => {
    if (!identity) return;
    const actorToUse = actorInstance || actor;
    if (!actorToUse) return;

    try {
      const account = {
        owner: identity.getPrincipal(),
        subaccount: []
      };
      const balanceNat = await actorToUse.icrc1_balance_of(account);
      const formattedBalance = (Number(balanceNat) / Math.pow(10, 8)).toFixed(4);
      setBalance(formattedBalance);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance('0');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-effect">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-primary/10 animate-float">
                <Sparkles className="w-12 h-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">
              Internet Computer Portfolio Index
            </CardTitle>
            <CardDescription className="text-base mt-2">
              A diversified index token backed by locked liquidity pools
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                Connect your wallet to access premium DeFi portfolio management
              </p>
            </div>
            <Button
              onClick={login}
              className="w-full"
              size="lg"
              variant="default"
            >
              <Wallet className="mr-2 h-5 w-5" />
              Connect Internet Identity
            </Button>
            <div className="flex items-center justify-center space-x-6 text-xs text-muted-foreground">
              <div className="flex items-center">
                <Shield className="w-3 h-3 mr-1" />
                Secure
              </div>
              <div className="flex items-center">
                <Lock className="w-3 h-3 mr-1" />
                Non-Custodial
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare data for Dashboard
  const portfolioData = {
    portfolioValue: indexState?.total_value || 46284.57,
    indexPrice: indexState?.index_price || 1.02,
    totalSupply: indexState?.total_supply || 45321,
    apy: 12.5,
    dailyChange: 2.4,
    priceChange: 2.4,
  };

  const mockAllocations = allocations || [
    { token: 'ALEX', value: 22500, currentPercent: 48.57, targetPercent: 50, deviation: -1.43 },
    { token: 'ZERO', value: 640, currentPercent: 1.38, targetPercent: 2, deviation: -0.62 },
    { token: 'KONG', value: 48, currentPercent: 0.11, targetPercent: 0.5, deviation: -0.39 },
    { token: 'BOB', value: 2, currentPercent: 0.004, targetPercent: 0.1, deviation: -0.096 },
  ];

  const mockHoldings = holdings || [
    { token: 'ALEX', balance: 1250.5, value: 22500, currentPercent: 48.57, targetPercent: 50, deviation: -1.43, recommendedAction: 'buy' as const },
    { token: 'ZERO', balance: 125.25, value: 640, currentPercent: 1.38, targetPercent: 2, deviation: -0.62, recommendedAction: 'buy' as const },
    { token: 'KONG', balance: 10.5, value: 48, currentPercent: 0.11, targetPercent: 0.5, deviation: -0.39, recommendedAction: 'buy' as const },
    { token: 'BOB', balance: 2.05, value: 2, currentPercent: 0.004, targetPercent: 0.1, deviation: -0.096, recommendedAction: 'buy' as const },
  ];

  const mockTvlData = tvlData || [
    { symbol: 'ALEX', tvlUSD: 22500, percentage: 48.57, poolCount: 2, lockCanisters: 3 },
    { symbol: 'ZERO', tvlUSD: 640, percentage: 1.38, poolCount: 1, lockCanisters: 1 },
    { symbol: 'KONG', tvlUSD: 48, percentage: 0.11, poolCount: 1, lockCanisters: 1 },
    { symbol: 'BOB', tvlUSD: 2, percentage: 0.004, poolCount: 1, lockCanisters: 1 },
  ];

  const mockRebalancingData = {
    nextRebalance: new Date(Date.now() + 3600000), // 1 hour from now
    nextAction: { type: 'buy' as const, token: 'ALEX', amount: 100, usdtAmount: 100 },
    history: [],
    isRebalancing: rebalanceMutation.isLoading,
    autoEnabled: autoRebalance,
  };

  const mockTokenHoldings = [
    { token: 'ALEX', amount: 100, value: 1000 },
    { token: 'ZERO', amount: 50, value: 250 },
    { token: 'KONG', amount: 10, value: 50 },
    { token: 'BOB', amount: 5, value: 10 },
  ];

  const handleMint = async (amount: number) => {
    await mintMutation.mutateAsync(amount);
    fetchBalance();
  };

  const handleRedeem = async (amount: number) => {
    await redeemMutation.mutateAsync(amount);
    fetchBalance();
  };

  const handleManualRebalance = async () => {
    await rebalanceMutation.mutateAsync();
  };

  if (indexLoading) {
    return <FullPageSkeleton />;
  }

  return (
    <Dashboard
      principal={principal}
      balance={balance}
      tvl={portfolioData.portfolioValue}
      portfolioData={portfolioData}
      allocations={mockAllocations}
      holdings={mockHoldings}
      tvlData={mockTvlData}
      rebalancingData={mockRebalancingData}
      userICPIBalance={parseFloat(balance)}
      userUSDTBalance={userBalance?.ckusdt || 1000}
      tokenHoldings={mockTokenHoldings}
      onDisconnect={logout}
      onMint={handleMint}
      onRedeem={handleRedeem}
      onManualRebalance={handleManualRebalance}
      onToggleAutoRebalance={setAutoRebalance}
    />
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;