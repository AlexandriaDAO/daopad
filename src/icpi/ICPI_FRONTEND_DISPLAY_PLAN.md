# ICPI Frontend Display Plan - Premium DeFi Interface

## Overview
This plan outlines the display architecture for the ICPI portfolio index using shadcn/ui components and a premium DeFi aesthetic inspired by leading protocols like Balancer, Curve, and Aave. The interface emphasizes dark themes, glass morphism, and sophisticated data visualization.

## Design System Foundation

### Core Design Principles
- **Dark-First Design**: Deep backgrounds with luminous accents
- **Glass Morphism**: Translucent cards with backdrop blur
- **Data Density**: Information-rich without clutter
- **Motion & Feedback**: Subtle animations for state changes
- **Professional Typography**: Monospace for numbers, Inter for UI

### Color Palette
```typescript
const colors = {
  // Primary Brand Colors
  primary: "hsl(142 70% 45%)",        // Emerald green
  primaryDark: "hsl(142 70% 35%)",

  // Background Layers
  background: {
    base: "hsl(222 47% 11%)",         // Deep navy
    elevated: "hsl(217 33% 17%)",     // Card background
    overlay: "hsl(217 33% 17% / 0.4)" // Glass effect
  },

  // Token Colors (Consistent Identity)
  tokens: {
    ALEX: "#8B5CF6",  // Purple
    ZERO: "#3B82F6",  // Blue
    KONG: "#F97316",  // Orange
    BOB: "#10B981",   // Green
    ICP: "#29ABE2",   // Cyan
    ckUSDT: "#26A17B" // Tether green
  },

  // Semantic Colors
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6"
}
```

## Component Architecture with shadcn/ui

### 1. Dashboard Header
```tsx
interface HeaderProps {
  principal: string;
  balance: string;
  tvl: number;
  onDisconnect: () => void;
}

// Implementation with shadcn components
<header className="border-b border-white/10 backdrop-blur-xl sticky top-0 z-50">
  <div className="container flex items-center justify-between py-4">
    <div className="flex items-center space-x-4">
      <Sparkles className="w-8 h-8 text-primary" />
      <h1 className="text-2xl font-bold">ICPI</h1>
      <Badge variant="outline" className="glass-effect">
        TVL: {formatNumber(tvl)}
      </Badge>
    </div>
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground">
        {shortenAddress(principal)}
      </span>
      <Button variant="outline" size="sm" onClick={onDisconnect}>
        Disconnect
      </Button>
    </div>
  </div>
</header>
```

### 2. Stats Grid Component
```tsx
// Using custom StatCard component built on shadcn Card
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard
    title="Portfolio Value"
    value={formatNumber(portfolioValue)}
    change={dailyChange}
    changeLabel="24h"
    icon={Wallet}
    loading={isLoading}
  />
  <StatCard
    title="Index Price"
    value={`$${indexPrice.toFixed(4)}`}
    change={priceChange}
    changeLabel="24h"
    icon={DollarSign}
  />
  <StatCard
    title="Total Supply"
    value={formatNumber(totalSupply)}
    icon={Coins}
  />
  <StatCard
    title="APY"
    value={`${apy.toFixed(2)}%`}
    icon={TrendingUp}
  />
</div>
```

### 3. Token Allocation Visualization
```tsx
// Premium chart component using Recharts with dark theme
interface AllocationChartProps {
  data: TokenAllocation[];
  height?: number;
}

const AllocationChart: React.FC<AllocationChartProps> = ({ data, height = 300 }) => {
  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Token Allocation</span>
          <BarChart3 className="w-5 h-5 text-muted-foreground" />
        </CardTitle>
        <CardDescription>
          Current index composition vs locked liquidity targets
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="token"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={renderCustomLabel}
            >
              {data.map((entry, index) => (
                <Cell key={entry.token} fill={colors.tokens[entry.token]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Allocation bars below chart */}
        <div className="space-y-3 mt-6">
          {data.map(token => (
            <AllocationBar
              key={token.symbol}
              token={token.symbol}
              current={token.currentPercent}
              target={token.targetPercent}
              value={token.value}
              deviation={token.deviation}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
```

### 4. Holdings Table with Actions
```tsx
// Advanced data table using shadcn Table components
const HoldingsTable = () => {
  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle>Token Holdings</CardTitle>
        <CardDescription>
          Detailed breakdown of portfolio positions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead>Token</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">Current %</TableHead>
              <TableHead className="text-right">Target %</TableHead>
              <TableHead className="text-right">Deviation</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map(holding => (
              <TableRow key={holding.token} className="border-white/5">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${colors.tokens[holding.token]}20` }}
                    >
                      <span className="text-xs font-bold">
                        {holding.token[0]}
                      </span>
                    </div>
                    <span className="font-medium">{holding.token}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {holding.balance.toFixed(4)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatNumber(holding.value)}
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-mono">{holding.currentPercent.toFixed(2)}%</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-mono text-muted-foreground">
                    {holding.targetPercent.toFixed(2)}%
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <DeviationBadge deviation={holding.deviation} />
                </TableCell>
                <TableCell>
                  <ActionIndicator action={holding.recommendedAction} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
```

### 5. Rebalancing Control Panel
```tsx
const RebalancingPanel = () => {
  const [isAutoRebalancing, setIsAutoRebalancing] = useState(true);

  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Rebalancing Engine</span>
          <Switch
            checked={isAutoRebalancing}
            onCheckedChange={setIsAutoRebalancing}
            className="data-[state=checked]:bg-primary"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Next Action Display */}
        <Alert className="border-primary/20 bg-primary/5">
          <Activity className="h-4 w-4" />
          <AlertTitle>Next Rebalance Action</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span>Action:</span>
                <Badge variant="outline">BUY ALEX</Badge>
              </div>
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-mono">100 ckUSDT</span>
              </div>
              <div className="flex justify-between">
                <span>Executes in:</span>
                <CountdownTimer targetTime={nextRebalance} />
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Manual Trigger */}
        <div className="flex gap-2">
          <Button
            variant="gradient"
            className="flex-1"
            onClick={handleManualRebalance}
            disabled={isRebalancing}
          >
            {isRebalancing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rebalancing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Execute Now
              </>
            )}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Manually trigger rebalancing</p>
                <p className="text-xs text-muted-foreground">
                  Estimated cost: ~0.01 ICP
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* History */}
        <Separator className="my-4" />
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recent Activity</h4>
          <ScrollArea className="h-[200px] pr-4">
            {rebalanceHistory.map((item, idx) => (
              <RebalanceHistoryItem key={idx} {...item} />
            ))}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
```

### 6. TVL Monitor Component
```tsx
const TVLMonitor = () => {
  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle>Locked Liquidity Sources</CardTitle>
        <CardDescription>
          {lockCanisters.length} lock canisters tracked
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tvlData.map(token => (
            <div key={token.symbol} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <TokenIcon token={token.symbol} />
                  <span className="font-medium">{token.symbol}</span>
                  <Badge variant="secondary" className="text-xs">
                    {token.poolCount} pools
                  </Badge>
                </div>
                <span className="font-mono text-gradient">
                  {formatNumber(token.tvlUSD)}
                </span>
              </div>
              <Progress
                value={token.percentage}
                className="h-2"
                indicatorClassName="bg-gradient-to-r from-green-400 to-emerald-500"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{token.lockCanisters} canisters</span>
                <span>{token.percentage.toFixed(2)}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
```

## Tab Navigation Structure
```tsx
<Tabs defaultValue="portfolio" className="space-y-6">
  <TabsList className="grid w-full grid-cols-5 glass-effect">
    <TabsTrigger value="portfolio">
      <PieChart className="w-4 h-4 mr-2" />
      Portfolio
    </TabsTrigger>
    <TabsTrigger value="mint">
      <Plus className="w-4 h-4 mr-2" />
      Mint
    </TabsTrigger>
    <TabsTrigger value="redeem">
      <Minus className="w-4 h-4 mr-2" />
      Redeem
    </TabsTrigger>
    <TabsTrigger value="analytics">
      <TrendingUp className="w-4 h-4 mr-2" />
      Analytics
    </TabsTrigger>
    <TabsTrigger value="history">
      <History className="w-4 h-4 mr-2" />
      History
    </TabsTrigger>
  </TabsList>

  <TabsContent value="portfolio">
    <PortfolioDashboard />
  </TabsContent>

  <TabsContent value="mint">
    <MintInterface />
  </TabsContent>

  <TabsContent value="redeem">
    <RedeemInterface />
  </TabsContent>

  <TabsContent value="analytics">
    <AnalyticsDashboard />
  </TabsContent>

  <TabsContent value="history">
    <TransactionHistory />
  </TabsContent>
</Tabs>
```

## Real-Time Data Management

### React Query Configuration
```typescript
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

// Custom hooks with optimistic updates
export const useIndexState = () => {
  return useQuery({
    queryKey: ['indexState'],
    queryFn: () => actor.get_index_state(),
    refetchInterval: 30_000,
  });
};

export const useRebalancerStatus = () => {
  return useQuery({
    queryKey: ['rebalancerStatus'],
    queryFn: () => actor.get_rebalancer_status(),
    refetchInterval: 10_000, // More frequent for countdown
  });
};

export const useTVLData = () => {
  return useQuery({
    queryKey: ['tvlData'],
    queryFn: () => actor.get_tvl_summary(),
    staleTime: 5 * 60_000, // 5 minutes
  });
};
```

### WebSocket Integration (Future)
```typescript
// For real-time updates when available
const useICPWebSocket = () => {
  useEffect(() => {
    const ws = new WebSocket('wss://icp-ws.example.com');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'REBALANCE_EXECUTED') {
        queryClient.invalidateQueries(['indexState']);
        toast.success('Rebalance executed successfully');
      }

      if (data.type === 'PRICE_UPDATE') {
        queryClient.setQueryData(['prices'], data.prices);
      }
    };

    return () => ws.close();
  }, []);
};
```

## Loading & Error States

### Skeleton Loading
```tsx
const PortfolioSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="glass-effect">
          <CardContent className="p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card className="glass-effect">
      <CardContent className="p-6">
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  </div>
);
```

### Error Boundary
```tsx
const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <Card className="glass-effect border-red-500/20">
    <CardContent className="p-12 text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <Button onClick={resetErrorBoundary} variant="outline">
        Try again
      </Button>
    </CardContent>
  </Card>
);
```

## Responsive Breakpoints
```css
/* Tailwind Config */
screens: {
  'xs': '475px',
  'sm': '640px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1280px',
  '2xl': '1536px',
}

/* Component Responsive Classes */
.stats-grid {
  @apply grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4;
}

.dashboard-layout {
  @apply grid grid-cols-1 lg:grid-cols-3 gap-6;
}

.table-container {
  @apply overflow-x-auto lg:overflow-visible;
}
```

## Performance Optimizations

### Code Splitting
```typescript
// Lazy load heavy components
const AnalyticsChart = lazy(() => import('./components/AnalyticsChart'));
const TransactionHistory = lazy(() => import('./components/TransactionHistory'));

// Route-based splitting
const routes = [
  {
    path: '/portfolio',
    component: lazy(() => import('./pages/Portfolio')),
  },
  {
    path: '/analytics',
    component: lazy(() => import('./pages/Analytics')),
  },
];
```

### Virtual Scrolling
```tsx
// For large lists
import { VirtualList } from '@tanstack/react-virtual';

const TransactionList = ({ transactions }) => {
  const parentRef = useRef();

  const rowVirtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-[400px] overflow-auto">
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {rowVirtualizer.getVirtualItems().map(virtualItem => (
          <TransactionRow
            key={virtualItem.key}
            transaction={transactions[virtualItem.index]}
            style={{
              transform: `translateY(${virtualItem.start}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
};
```

## Accessibility Features

### ARIA Implementation
```tsx
<Card
  role="region"
  aria-label="Portfolio Overview"
  className="glass-effect"
>
  <CardHeader>
    <CardTitle id="portfolio-title">Portfolio Value</CardTitle>
  </CardHeader>
  <CardContent>
    <div
      aria-labelledby="portfolio-title"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="text-3xl font-bold">
        {formatNumber(portfolioValue)}
      </span>
    </div>
  </CardContent>
</Card>
```

### Keyboard Navigation
```typescript
const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for quick actions
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openCommandPalette();
      }

      // Tab navigation
      if (e.key === 'Tab') {
        // Handle custom tab behavior
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
};
```

## Testing Strategy

### Component Testing
```typescript
// Using React Testing Library
describe('StatCard', () => {
  it('displays formatted value correctly', () => {
    render(
      <StatCard
        title="TVL"
        value={1234567.89}
        change={2.5}
        changeLabel="24h"
      />
    );

    expect(screen.getByText('$1.23M')).toBeInTheDocument();
    expect(screen.getByText('+2.5%')).toBeInTheDocument();
  });

  it('shows loading skeleton when loading prop is true', () => {
    render(<StatCard title="TVL" value={0} loading={true} />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });
});
```

### E2E Testing
```typescript
// Using Playwright
test('complete mint flow', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Connect Wallet');
  await page.fill('[name=amount]', '100');
  await page.click('text=Mint ICPI');

  await expect(page.locator('.toast-success')).toContainText(
    'Successfully minted'
  );
});
```

## Deployment Configuration

### Environment Variables
```typescript
// .env.production
VITE_IC_HOST=https://icp-api.io
VITE_CANISTER_ID_BACKEND=ehyav-lqaaa-aaaap-qqc2a-cai
VITE_CANISTER_ID_TOKEN=es7ry-kyaaa-aaaap-qqczq-cai
VITE_ENABLE_ANALYTICS=true
```

### Build Optimization
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui', 'lucide-react'],
          'chart-vendor': ['recharts'],
        },
      },
    },
    minify: 'terser',
    sourcemap: false,
  },
});
```

## Implementation Roadmap

### Week 1: Foundation
- [x] Set up shadcn/ui components
- [x] Configure dark theme and design tokens
- [x] Build core layout structure
- [x] Implement authentication flow

### Week 2: Data Layer
- [ ] Set up React Query
- [ ] Create data fetching hooks
- [ ] Implement state management
- [ ] Add WebSocket support

### Week 3: Features
- [ ] Build portfolio dashboard
- [ ] Create mint/redeem interfaces
- [ ] Implement rebalancing controls
- [ ] Add transaction history

### Week 4: Polish
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Error handling
- [ ] Analytics integration

### Week 5: Testing & Deploy
- [ ] Unit test coverage
- [ ] E2E test suite
- [ ] Performance testing
- [ ] Production deployment

## Conclusion

This enhanced display plan leverages shadcn/ui's component library with a premium DeFi aesthetic to create a sophisticated interface for the ICPI protocol. The dark theme, glass morphism effects, and data-rich visualizations provide users with professional-grade portfolio management tools that rival leading DeFi platforms.

The implementation prioritizes:
- **Visual Excellence**: Premium aesthetics that convey trust and sophistication
- **Performance**: Optimized rendering and data fetching
- **Accessibility**: Full keyboard and screen reader support
- **Developer Experience**: Type-safe, testable, maintainable code

This architecture ensures the ICPI frontend delivers an exceptional user experience worthy of a premium DeFi protocol.