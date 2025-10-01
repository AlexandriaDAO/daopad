import { useState, useEffect } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import { HttpAgent, Actor, Identity } from '@dfinity/agent';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';

import { idlFactory as icpiIdlFactory } from 'declarations/icpi_backend/icpi_backend.did.js';
import { canisterId as icpiCanisterId } from 'declarations/icpi_backend';

import { Button } from './components/ui/button';
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
  useActualAllocations,
  useMintICPI,
  useRedeemICPI,
  useManualRebalance,
  useUserWalletBalances,
  useTransferToken,
  UserTokenBalance,
  QUERY_KEYS
} from './hooks/useICPI';
import { SendTokenModal } from './components/SendTokenModal';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});

function AppContent() {
  const queryClient = useQueryClient()
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [principal, setPrincipal] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [balance, setBalance] = useState('0');
  const [actor, setActor] = useState<Actor | null>(null);
  const [agent, setAgent] = useState<HttpAgent | null>(null);
  const [autoRebalance, setAutoRebalance] = useState(true);
  const [sendModalToken, setSendModalToken] = useState<UserTokenBalance | null>(null);

  // Use React Query hooks
  const { data: indexState, isLoading: indexLoading } = useIndexState(actor);
  const { data: rebalancerStatus } = useRebalancerStatus(actor);
  const { data: tvlData } = useTVLData(actor);
  const { data: userBalance } = useUserBalance(actor, principal);
  const { data: holdings } = useHoldings(actor);
  const { data: allocations } = useAllocation(actor);
  const { data: actualAllocations } = useActualAllocations(actor, icpiCanisterId, agent);

  const mintMutation = useMintICPI(actor);
  const redeemMutation = useRedeemICPI(actor);
  const rebalanceMutation = useManualRebalance(actor);

  // Wallet balance hooks
  const { data: walletBalances, isLoading: balancesLoading } = useUserWalletBalances(
    actor,
    principal,
    agent
  );
  const transferMutation = useTransferToken(agent);

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

    // Create authenticated agent with explicit polling configuration
    const newAgent = new HttpAgent({
      identity,
      host,
      // Increase ingress expiry to 5 minutes for long-running update calls
      ingressExpiryMs: 5 * 60 * 1000,
    });

    if (isLocal) {
      newAgent.fetchRootKey().catch(console.error);
    }

    // Log agent details for debugging
    console.log('Creating actor with authenticated agent, host:', host, 'canisterId:', icpiCanisterId);

    // Use authenticated actor (needed for update calls like get_index_state)
    const newActor = Actor.createActor(icpiIdlFactory, {
      agent: newAgent,
      canisterId: icpiCanisterId,
    });

    setAgent(newAgent);
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

  console.log('Auth state:', { isAuthenticated, actor: !!actor, identity: !!identity, principal });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000000]">
        <div className="w-full max-w-sm border border-[#1f1f1f] bg-[#0a0a0a] p-6">
          <div className="space-y-4">
            <h1 className="text-xl font-mono text-white tracking-wider">ICPI</h1>
            <p className="text-xs font-mono text-[#999999]">
              Internet Computer Portfolio Index
            </p>
            <Button
              onClick={login}
              className="w-full"
              size="sm"
              variant="primary"
            >
              CONNECT WALLET
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for Dashboard - no mock data, fail visibly if data unavailable
  // Note: rebalancerStatus is optional as it may timeout, don't block UI on it
  if (!indexState || !actualAllocations || balancesLoading) {
    console.log('Loading state:', {
      indexState: !!indexState,
      actualAllocations: !!actualAllocations,
      rebalancerStatus: !!rebalancerStatus,
      balancesLoading,
      indexLoading,
    });
    return <FullPageSkeleton />;
  }

  const portfolioData = {
    portfolioValue: indexState.total_value,
    indexPrice: 1.0, // TODO: Calculate from total_value / total_supply when we add total_supply
    totalSupply: 0, // TODO: Query from ICPI token canister
    apy: 0, // TODO: Calculate from historical data
    dailyChange: 0, // TODO: Calculate from historical data
    priceChange: 0, // TODO: Calculate from historical data
  };

  const rebalancingData = {
    nextRebalance: new Date(Date.now() + 3600000), // TODO: Get from rebalancer status
    nextAction: rebalancerStatus?.next_action || null,
    history: rebalancerStatus?.history || [],
    isRebalancing: rebalanceMutation.isLoading,
    autoEnabled: autoRebalance,
  };

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

  const handleSendToken = (symbol: string) => {
    const token = walletBalances?.find(t => t.symbol === symbol);
    if (token) {
      setSendModalToken(token);
    }
  };

  const handleTransferSubmit = async (recipient: string, amount: string) => {
    if (!sendModalToken) return;

    await transferMutation.mutateAsync({
      tokenCanisterId: sendModalToken.canisterId,
      recipient,
      amount,
      decimals: sendModalToken.decimals,
    });
  };

  const handleRefreshBalances = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_WALLET_BALANCES] })
  };

  if (indexLoading) {
    return <FullPageSkeleton />;
  }

  return (
    <>
      <Dashboard
        principal={principal}
        balance={balance}
        tvl={portfolioData.portfolioValue}
        portfolioData={portfolioData}
        allocations={actualAllocations}
        rebalancingData={rebalancingData}
        userICPIBalance={parseFloat(balance)}
        userUSDTBalance={userBalance?.ckusdt || 0}
        tokenHoldings={holdings || []}
        walletBalances={walletBalances || []}
        onDisconnect={logout}
        onMint={handleMint}
        onRedeem={handleRedeem}
        onManualRebalance={handleManualRebalance}
        onToggleAutoRebalance={setAutoRebalance}
        onSendToken={handleSendToken}
        onRefreshBalances={handleRefreshBalances}
      />
      {sendModalToken && (
        <SendTokenModal
          token={sendModalToken}
          userPrincipal={principal}
          onClose={() => setSendModalToken(null)}
          onSend={handleTransferSubmit}
        />
      )}
    </>
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