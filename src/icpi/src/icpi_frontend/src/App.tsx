import { useState, useEffect } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import { HttpAgent, Actor, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { idlFactory as icpiIdlFactory } from 'declarations/ICPI/ICPI.did.js';
import { canisterId as icpiCanisterId } from 'declarations/ICPI';

import { Dashboard } from './components/Dashboard';
import { FullPageSkeleton } from './components/LoadingStates';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useIndexState, useRebalancerStatus, useTVLData, useUserBalance, useHoldings, useAllocation, useMintICPI, useRedeemICPI, useManualRebalance } from './hooks/useICPI';

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
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('');
  const [balance, setBalance] = useState('0');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mintAmount, setMintAmount] = useState('');
  const [redeemAmount, setRedeemAmount] = useState('');

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

  // Mock data for demonstration - will be replaced with real data
  const mockPortfolioData = {
    portfolioValue: indexState?.total_value || 46284.57,
    indexPrice: indexState?.index_price || 1.02,
    totalSupply: indexState?.total_supply || 45321,
    apy: 12.5,
    dailyChange: 2.4,
    priceChange: 2.4,
    tokens: [
      { symbol: 'ALEX', allocation: 48.57, value: 22500, change: 5.2 },
      { symbol: 'ICP', allocation: 25.74, value: 11900, change: -1.8 },
      { symbol: 'ZERO', allocation: 1.38, value: 640.89, change: 12.1 },
      { symbol: 'KONG', allocation: 0.11, value: 48.71, change: 8.3 },
      { symbol: 'BOB', allocation: 0.004, value: 2.05, change: 0.5 },
    ]
  };

  useEffect(() => {
    AuthClient.create({
      idleOptions: {
        idleTimeout: 1000 * 60 * 60 * 24 * 7, // 7 days in milliseconds
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
      fetchBalance();
    }
  }, [isAuthenticated, identity]);

  const login = async () => {
    if (!authClient) return;

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const identityProvider = isLocal
      ? 'http://localhost:4943'
      : 'https://identity.ic0.app';

    // 7 days in nanoseconds for maxTimeToLive
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
    return newActor;
  };

  const fetchBalance = async () => {
    if (!identity) return;

    try {
      const actor = createActor() as any;
      const account = {
        owner: identity.getPrincipal(),
        subaccount: []
      };
      const balanceNat = await actor.icrc1_balance_of(account);
      const formattedBalance = (Number(balanceNat) / Math.pow(10, 8)).toFixed(4);
      setBalance(formattedBalance);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance('0');
    }
  };

  const validatePrincipal = (principalText: string): boolean => {
    try {
      Principal.fromText(principalText);
      return true;
    } catch {
      return false;
    }
  };

  const handleTransfer = async () => {
    if (!identity || !amount || !destination) {
      setStatus('Please fill all fields');
      return;
    }

    if (!validatePrincipal(destination)) {
      setStatus('Invalid Principal ID');
      return;
    }

    setIsLoading(true);
    setStatus('');

    try {
      const actor = createActor() as any;
      const amountNat = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, 8)));

      const result = await actor.icrc1_transfer({
        to: {
          owner: Principal.fromText(destination),
          subaccount: []
        },
        fee: [],
        memo: [],
        from_subaccount: [],
        created_at_time: [],
        amount: amountNat
      });

      if (result && 'Ok' in result) {
        setStatus(`Transfer successful! Transaction: ${result.Ok}`);
        setAmount('');
        setDestination('');
        fetchBalance();
      } else if (result && 'Err' in result) {
        setStatus(`Transfer failed: ${JSON.stringify(result.Err)}`);
      } else {
        setStatus('Transfer failed: Unknown error');
      }
    } catch (error: any) {
      console.error('Transfer error:', error);
      setStatus(`Error: ${error.message || error}`);
    } finally {
      setIsLoading(false);
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
              variant="gradient"
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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-8 h-8 text-primary" />
                <h1 className="text-2xl font-bold">ICPI</h1>
              </div>
              <div className="hidden md:flex items-center space-x-1 text-sm">
                <span className="text-muted-foreground">TVL:</span>
                <span className="font-mono font-semibold text-gradient">
                  {formatNumber(indexStats.tvl)}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:block text-sm">
                <span className="text-muted-foreground">Wallet: </span>
                <span className="font-mono">{shortenAddress(principal, 6)}</span>
              </div>
              <Button onClick={logout} variant="outline" size="sm">
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Your Balance"
            value={`${balance} ICPI`}
            icon={Wallet}
          />
          <StatCard
            title="Index Price"
            value={`$${indexStats.price.toFixed(4)}`}
            change={indexStats.priceChange}
            changeLabel="24h"
            icon={DollarSign}
          />
          <StatCard
            title="Total Value Locked"
            value={formatNumber(indexStats.tvl)}
            change={5.8}
            changeLabel="7d"
            icon={Lock}
          />
          <StatCard
            title="APY"
            value={`${indexStats.apy}%`}
            icon={TrendingUp}
          />
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="portfolio" className="space-y-6">
          <TabsList className="grid w-full max-w-[500px] grid-cols-4">
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="mint">Mint</TabsTrigger>
            <TabsTrigger value="redeem">Redeem</TabsTrigger>
            <TabsTrigger value="transfer">Transfer</TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Token Allocation */}
              <Card className="lg:col-span-2 glass-effect">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Token Allocation</span>
                    <BarChart3 className="w-5 h-5 text-muted-foreground" />
                  </CardTitle>
                  <CardDescription>
                    Current index composition based on locked liquidity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {indexStats.tokens.map((token) => (
                      <div key={token.symbol} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-xs font-bold">{token.symbol[0]}</span>
                            </div>
                            <span className="font-medium">{token.symbol}</span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="font-mono">{formatNumber(token.value)}</span>
                            <span className={cn(
                              "text-xs font-medium",
                              token.change >= 0 ? "text-green-500" : "text-red-500"
                            )}>
                              {token.change >= 0 ? "+" : ""}{token.change}%
                            </span>
                          </div>
                        </div>
                        <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                            style={{ width: `${token.allocation}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Allocation</span>
                          <span>{token.allocation.toFixed(2)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Recent Activity</span>
                    <Activity className="w-5 h-5 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <ArrowUpRight className="w-4 h-4 text-green-500" />
                        <span>Minted</span>
                      </div>
                      <span className="font-mono">1000 ICPI</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <ArrowDownLeft className="w-4 h-4 text-red-500" />
                        <span>Redeemed</span>
                      </div>
                      <span className="font-mono">500 ICPI</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-blue-500" />
                        <span>Rebalanced</span>
                      </div>
                      <span className="text-xs text-muted-foreground">2h ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="mint" className="max-w-2xl mx-auto">
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle>Mint ICPI Tokens</CardTitle>
                <CardDescription>
                  Deposit ckUSDT to mint new ICPI index tokens
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="mint-amount">Amount (ckUSDT)</Label>
                  <div className="relative">
                    <Input
                      id="mint-amount"
                      type="number"
                      placeholder="0.00"
                      value={mintAmount}
                      onChange={(e) => setMintAmount(e.target.value)}
                      className="pr-16"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      ckUSDT
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You will receive: {mintAmount ? (parseFloat(mintAmount) / indexStats.price).toFixed(4) : '0.0000'} ICPI
                  </p>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  variant="gradient"
                  disabled={!mintAmount || parseFloat(mintAmount) <= 0}
                >
                  <Coins className="mr-2 h-5 w-5" />
                  Mint ICPI
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="redeem" className="max-w-2xl mx-auto">
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle>Redeem ICPI Tokens</CardTitle>
                <CardDescription>
                  Burn ICPI tokens to receive proportional underlying assets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="redeem-amount">Amount (ICPI)</Label>
                  <div className="relative">
                    <Input
                      id="redeem-amount"
                      type="number"
                      placeholder="0.00"
                      value={redeemAmount}
                      onChange={(e) => setRedeemAmount(e.target.value)}
                      className="pr-16"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      ICPI
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available: {balance} ICPI
                  </p>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  variant="outline"
                  disabled={!redeemAmount || parseFloat(redeemAmount) <= 0}
                >
                  <ArrowDownLeft className="mr-2 h-5 w-5" />
                  Redeem ICPI
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transfer" className="max-w-2xl mx-auto">
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle>Transfer ICPI Tokens</CardTitle>
                <CardDescription>
                  Send ICPI tokens to another principal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="0"
                      step="0.0001"
                      className="pr-16"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      ICPI
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available: {balance} ICPI
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destination">Recipient Principal ID</Label>
                  <Input
                    id="destination"
                    type="text"
                    placeholder="Enter recipient's Principal ID"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className={cn(
                      destination && !validatePrincipal(destination) && "border-red-500"
                    )}
                  />
                  {destination && !validatePrincipal(destination) && (
                    <p className="text-xs text-red-500">Invalid Principal ID</p>
                  )}
                </div>

                <Button
                  onClick={handleTransfer}
                  disabled={isLoading || !amount || !destination || !validatePrincipal(destination)}
                  className="w-full"
                  size="lg"
                  variant="gradient"
                >
                  {isLoading ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <ArrowUpRight className="mr-2 h-5 w-5" />
                      Send ICPI
                    </>
                  )}
                </Button>

                {status && (
                  <div className={cn(
                    "p-3 rounded-lg text-sm",
                    status.includes('success')
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  )}>
                    {status}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;