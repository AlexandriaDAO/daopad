<script lang="ts">
  import { TrendingUp, Coins, DollarSign } from 'lucide-svelte';
  
  export let tokenData: Map<string, {
    totalValue: number;
    lpPools: Set<string>;
    totalTokenAmount: number;
  }> = new Map();
  export let totalValue: number = 0;
  
  // Convert map to sorted array for display
  $: sortedTokens = tokenData && tokenData.size > 0 
    ? Array.from(tokenData.entries())
        .map(([symbol, data]) => ({
          symbol,
          ...data,
          percentage: totalValue > 0 ? (data.totalValue / totalValue) * 100 : 0
        }))
        .sort((a, b) => b.totalValue - a.totalValue)
        .filter(token => token.totalValue > 0)
    : [];
  
  // Featured tokens to highlight
  const featuredTokens = ['ALEX', 'ZERO', 'ICP', 'ckUSDT', 'ckBTC'];
  
  // Check if token is featured
  function isFeatured(symbol: string): boolean {
    return featuredTokens.includes(symbol);
  }
  
  // Format large numbers
  function formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toFixed(2);
  }
  
  // Get color for token
  function getTokenColor(symbol: string): string {
    const colors: Record<string, string> = {
      'ALEX': 'text-purple-400',
      'ZERO': 'text-blue-400',
      'ICP': 'text-pink-400',
      'ckUSDT': 'text-green-400',
      'ckBTC': 'text-orange-400',
    };
    return colors[symbol] || 'text-kong-text-secondary';
  }
  
  // Get background color for token
  function getTokenBgColor(symbol: string): string {
    const colors: Record<string, string> = {
      'ALEX': 'bg-purple-900/20',
      'ZERO': 'bg-blue-900/20',
      'ICP': 'bg-pink-900/20',
      'ckUSDT': 'bg-green-900/20',
      'ckBTC': 'bg-orange-900/20',
    };
    return colors[symbol] || 'bg-kong-bg-secondary/50';
  }
</script>

<div class="kong-panel space-y-4">
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-semibold text-kong-text-primary flex items-center space-x-2">
      <Coins class="w-5 h-5 text-kong-accent-blue" />
      <span>Total Value Locked by Token</span>
    </h3>
    <div class="text-sm text-kong-text-secondary">
      {sortedTokens.length} tokens tracked
    </div>
  </div>
  
  {#if sortedTokens.length === 0}
    <div class="text-center py-8">
      <div class="text-kong-text-secondary">No token data available yet</div>
      <div class="text-xs text-kong-text-secondary mt-1">
        Check individual lock canisters to load token data
      </div>
    </div>
  {:else}
    <!-- Featured Tokens Grid -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {#each sortedTokens.filter(t => isFeatured(t.symbol)).slice(0, 5) as token}
        <div class="{getTokenBgColor(token.symbol)} border border-kong-border/50 rounded-lg p-3">
          <div class="flex items-center justify-between mb-2">
            <span class="font-semibold {getTokenColor(token.symbol)}">{token.symbol}</span>
            <span class="text-xs text-kong-text-secondary">{token.percentage.toFixed(1)}%</span>
          </div>
          <div class="text-xl font-bold text-kong-text-primary">
            ${formatNumber(token.totalValue)}
          </div>
          <div class="text-xs text-kong-text-secondary mt-1">
            {token.lpPools.size} LP {token.lpPools.size === 1 ? 'pool' : 'pools'}
          </div>
        </div>
      {/each}
    </div>
    
    <!-- Detailed Token List -->
    <div class="space-y-2">
      <h4 class="text-sm font-medium text-kong-text-secondary">All Tokens</h4>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-kong-border/50">
              <th class="text-left py-2 px-3 text-kong-text-secondary font-medium">Token</th>
              <th class="text-right py-2 px-3 text-kong-text-secondary font-medium">Value Locked</th>
              <th class="text-right py-2 px-3 text-kong-text-secondary font-medium">% of Total</th>
              <th class="text-right py-2 px-3 text-kong-text-secondary font-medium">LP Pools</th>
              <th class="text-left py-2 px-3 text-kong-text-secondary font-medium">Visual</th>
            </tr>
          </thead>
          <tbody>
            {#each sortedTokens as token}
              <tr class="border-b border-kong-border/30 hover:bg-kong-bg-secondary/30 transition-colors">
                <td class="py-2 px-3">
                  <span class="font-medium {isFeatured(token.symbol) ? getTokenColor(token.symbol) : 'text-kong-text-primary'}">
                    {token.symbol}
                  </span>
                </td>
                <td class="text-right py-2 px-3">
                  <span class="font-semibold text-kong-accent-green">
                    ${formatNumber(token.totalValue)}
                  </span>
                </td>
                <td class="text-right py-2 px-3 text-kong-text-secondary">
                  {token.percentage.toFixed(2)}%
                </td>
                <td class="text-right py-2 px-3 text-kong-text-secondary">
                  {token.lpPools.size}
                </td>
                <td class="py-2 px-3">
                  <div class="w-full bg-kong-bg-secondary rounded-full h-2 overflow-hidden">
                    <div 
                      class="h-full bg-gradient-to-r from-kong-accent-blue to-kong-accent-purple transition-all duration-300"
                      style="width: {Math.min(token.percentage, 100)}%"
                    ></div>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Summary Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-kong-border/50">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-kong-accent-blue/20 rounded-lg flex items-center justify-center">
          <DollarSign class="w-5 h-5 text-kong-accent-blue" />
        </div>
        <div>
          <div class="text-xs text-kong-text-secondary">Total Locked</div>
          <div class="text-lg font-bold text-kong-text-primary">${formatNumber(totalValue)}</div>
        </div>
      </div>
      
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-kong-accent-green/20 rounded-lg flex items-center justify-center">
          <Coins class="w-5 h-5 text-kong-accent-green" />
        </div>
        <div>
          <div class="text-xs text-kong-text-secondary">Unique Tokens</div>
          <div class="text-lg font-bold text-kong-text-primary">{sortedTokens.length}</div>
        </div>
      </div>
      
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-kong-accent-purple/20 rounded-lg flex items-center justify-center">
          <TrendingUp class="w-5 h-5 text-kong-accent-purple" />
        </div>
        <div>
          <div class="text-xs text-kong-text-secondary">Top Token</div>
          <div class="text-lg font-bold text-kong-text-primary">
            {sortedTokens[0]?.symbol || 'N/A'}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>