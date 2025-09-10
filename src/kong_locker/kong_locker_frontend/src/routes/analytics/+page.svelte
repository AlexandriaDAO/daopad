<script lang="ts">
  import { onMount } from 'svelte';
  import { Loader, Eye, BarChart3, Users, DollarSign, Activity, ArrowLeft, RefreshCw } from 'lucide-svelte';
  import { analyticsService, type CanisterListItem, type SystemStats } from '../../lib/services/analytics';
  import type { LPReply } from '../../lib/services/kongSwapDirect';
  import LPPositionCard from '../../lib/components/LPPositionCard.svelte';
  import TokenBreakdown from '../../lib/components/TokenBreakdown.svelte';

  // State management
  let loading = true;
  let error = '';
  let canisterList: CanisterListItem[] = [];
  let systemStats: SystemStats | null = null;
  let refreshing = false;

  // Detail modal state
  let selectedCanister: CanisterListItem | null = null;
  let detailModalOpen = false;
  let detailLoading = false;
  let detailError = '';
  let detailPositions: LPReply[] = [];
  let detailSummary: any = null;
  
  // Token breakdown state
  let tokenBreakdown = new Map<string, {
    totalValue: number;
    lpPools: Set<string>;
    totalTokenAmount: number;
  }>();

  // Load analytics data
  async function loadAnalytics() {
    loading = true;
    error = '';
    
    try {
      // Load canister list (fast)
      canisterList = await analyticsService.getCanisterList();
      console.log(`Loaded ${canisterList.length} lock canisters`);
      
      // Load system stats (slower, with sample data)
      systemStats = await analyticsService.calculateSystemStats(20);
      console.log('System stats loaded:', systemStats);
      
      // Update token breakdown if available
      if (systemStats.tokenBreakdown) {
        tokenBreakdown = systemStats.tokenBreakdown;
      }
      
      // Optional: Preload popular canisters in background
      analyticsService.preloadTopCanisters(10);
      
    } catch (err) {
      console.error('Failed to load analytics:', err);
      error = err instanceof Error ? err.message : 'Failed to load analytics data';
    } finally {
      loading = false;
    }
  }

  // Refresh data
  async function refreshData() {
    refreshing = true;
    analyticsService.clearCache();
    await loadAnalytics();
    refreshing = false;
  }

  // Open detail modal for specific canister
  async function openCanisterDetails(canister: CanisterListItem) {
    selectedCanister = canister;
    detailModalOpen = true;
    detailLoading = true;
    detailError = '';
    detailPositions = [];
    
    try {
      const details = await analyticsService.getCanisterDetails(canister.lockCanister);
      detailPositions = details.positions;
      detailSummary = details;
      
      // Update the list item with fresh data
      const index = canisterList.findIndex(item => 
        item.lockCanister.toText() === canister.lockCanister.toText()
      );
      if (index >= 0) {
        canisterList[index] = {
          ...canisterList[index],
          status: details.positions.length > 0 ? 'active' : 'empty',
          lastQueried: Date.now(),
          cachedPositions: details.positions,
          cachedValue: details.totalUSD,
          cachedVotingPower: details.votingPower
        };
      }
      
      // Update token breakdown with fresh data from cache
      tokenBreakdown = analyticsService.getTokenBreakdownFromCache();
    } catch (err) {
      console.error('Failed to load canister details:', err);
      detailError = err instanceof Error ? err.message : 'Failed to load position details';
    } finally {
      detailLoading = false;
    }
  }

  // Close detail modal
  function closeModal() {
    detailModalOpen = false;
    selectedCanister = null;
  }

  // Format utilities
  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  function getStatusIcon(status: string): string {
    switch (status) {
      case 'active': return '🟢';
      case 'empty': return '🟡'; 
      case 'error': return '🔴';
      case 'loading': return '🔄';
      default: return '⚫';
    }
  }

  function getStatusText(status: string): string {
    switch (status) {
      case 'active': return 'Active';
      case 'empty': return 'No LP Tokens';
      case 'error': return 'Error';
      case 'loading': return 'Loading...';
      default: return 'Unknown';
    }
  }

  // Load data on mount
  onMount(loadAnalytics);
</script>

<div class="max-w-6xl mx-auto space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-4">
      <a 
        href="/" 
        class="flex items-center space-x-2 text-kong-text-secondary hover:text-kong-text-primary transition-colors"
      >
        <ArrowLeft class="w-4 h-4" />
        <span class="text-sm">Back to Kong Locker</span>
      </a>
    </div>
    <button 
      on:click={refreshData}
      disabled={refreshing}
      class="flex items-center space-x-2 px-3 py-2 text-sm bg-kong-accent-blue/20 text-kong-accent-blue border border-kong-accent-blue/30 rounded-lg hover:bg-kong-accent-blue/30 transition-colors disabled:opacity-50"
    >
      <RefreshCw class="w-4 h-4 {refreshing ? 'animate-spin' : ''}" />
      <span>Refresh</span>
    </button>
  </div>

  <!-- Page Header -->
  <div class="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8">
    <h1 class="text-4xl font-bold text-white mb-2">Kong Locker Analytics</h1>
    <p class="text-blue-100">Explore all locked liquidity across the platform</p>
  </div>

  {#if loading}
    <div class="kong-panel flex items-center justify-center py-12">
      <div class="flex items-center space-x-3">
        <Loader class="w-6 h-6 animate-spin text-kong-accent-blue" />
        <span class="text-kong-text-primary">Loading analytics data...</span>
      </div>
    </div>
  {:else if error}
    <div class="kong-panel bg-red-900/20 border-red-800">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-red-900/30 rounded-full flex items-center justify-center">
          <span class="text-red-400 text-sm">!</span>
        </div>
        <div>
          <h3 class="font-semibold text-red-400">Failed to Load Analytics</h3>
          <p class="text-sm text-red-300">{error}</p>
        </div>
      </div>
    </div>
  {:else}
    <!-- System Overview -->
    {#if systemStats}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="kong-panel text-center">
          <div class="flex items-center justify-center space-x-2 mb-2">
            <Users class="w-5 h-5 text-kong-accent-blue" />
            <span class="text-sm text-kong-text-secondary">Participants</span>
          </div>
          <div class="text-2xl font-bold text-kong-text-primary">{systemStats.totalCanisters}</div>
          <div class="text-xs text-kong-text-secondary">Lock Canisters</div>
        </div>
        
        <div class="kong-panel text-center">
          <div class="flex items-center justify-center space-x-2 mb-2">
            <DollarSign class="w-5 h-5 text-kong-accent-green" />
            <span class="text-sm text-kong-text-secondary">Est. Locked</span>
          </div>
          <div class="text-2xl font-bold text-kong-accent-green">${systemStats.estimatedTotalValue.toFixed(0)}</div>
          <div class="text-xs text-kong-text-secondary">USD Value</div>
        </div>
        
        <div class="kong-panel text-center">
          <div class="flex items-center justify-center space-x-2 mb-2">
            <BarChart3 class="w-5 h-5 text-kong-accent-orange" />
            <span class="text-sm text-kong-text-secondary">Avg. Position</span>
          </div>
          <div class="text-2xl font-bold text-kong-accent-orange">${(systemStats.estimatedTotalValue / systemStats.totalCanisters).toFixed(0)}</div>
          <div class="text-xs text-kong-text-secondary">Per User</div>
        </div>
        
        <div class="kong-panel text-center">
          <div class="flex items-center justify-center space-x-2 mb-2">
            <Activity class="w-5 h-5 text-kong-accent-purple" />
            <span class="text-sm text-kong-text-secondary">Health</span>
          </div>
          <div class="text-2xl font-bold text-kong-accent-purple">
            {Math.round((canisterList.filter(c => c.status !== 'error').length / canisterList.length) * 100)}%
          </div>
          <div class="text-xs text-kong-text-secondary">Operational</div>
        </div>
      </div>
    {/if}

    <!-- Token Breakdown -->
    {#if systemStats}
      <TokenBreakdown 
        tokenData={tokenBreakdown || new Map()} 
        totalValue={systemStats.estimatedTotalValue || 0}
      />
    {/if}

    <!-- Canister List -->
    <div class="kong-panel space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold text-kong-text-primary">
          All Lock Canisters ({canisterList.length})
        </h2>
        <div class="text-xs text-kong-text-secondary">
          💡 Click "View" to see detailed LP position breakdown
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-kong-border">
              <th class="text-left py-3 px-4 text-kong-text-secondary">User</th>
              <th class="text-left py-3 px-4 text-kong-text-secondary">Lock Canister</th>
              <th class="text-left py-3 px-4 text-kong-text-secondary">Status</th>
              <th class="text-left py-3 px-4 text-kong-text-secondary">Value</th>
              <th class="text-left py-3 px-4 text-kong-text-secondary">Action</th>
            </tr>
          </thead>
          <tbody>
            {#each canisterList as canister}
              <tr class="border-b border-kong-border/50 hover:bg-kong-bg-secondary/30 transition-colors">
                <td class="py-3 px-4">
                  <code class="text-kong-text-primary font-mono text-xs">{canister.userDisplay}</code>
                </td>
                <td class="py-3 px-4">
                  <code class="text-kong-text-primary font-mono text-xs">{canister.canisterDisplay}</code>
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center space-x-2">
                    <span>{getStatusIcon(canister.status)}</span>
                    <span class="text-kong-text-primary">{getStatusText(canister.status)}</span>
                  </div>
                  {#if canister.lastQueried}
                    <div class="text-xs text-kong-text-secondary mt-1">
                      Last checked: {new Date(canister.lastQueried).toLocaleTimeString()}
                    </div>
                  {/if}
                </td>
                <td class="py-3 px-4">
                  {#if canister.cachedValue !== undefined}
                    <div class="text-kong-accent-green font-semibold">${canister.cachedValue.toFixed(2)}</div>
                    <div class="text-xs text-kong-text-secondary">{canister.cachedVotingPower} voting power</div>
                  {:else}
                    <span class="text-kong-text-secondary">—</span>
                  {/if}
                </td>
                <td class="py-3 px-4">
                  <button
                    on:click={() => openCanisterDetails(canister)}
                    class="flex items-center space-x-1 px-3 py-1 bg-kong-accent-blue/20 text-kong-accent-blue border border-kong-accent-blue/30 rounded-md hover:bg-kong-accent-blue/30 transition-colors text-xs"
                  >
                    <Eye class="w-3 h-3" />
                    <span>View</span>
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      {#if canisterList.length === 0}
        <div class="text-center py-8">
          <div class="text-kong-text-secondary mb-2">No lock canisters found</div>
          <div class="text-xs text-kong-text-secondary">Users haven't created any lock canisters yet</div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Detail Modal -->
{#if detailModalOpen && selectedCanister}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <div class="kong-panel max-w-4xl w-full max-h-[90vh] overflow-y-auto space-y-4">
      <!-- Modal Header -->
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-kong-text-primary">LP Position Details</h3>
          <p class="text-sm text-kong-text-secondary">
            Lock Canister: <code class="font-mono">{selectedCanister.canisterDisplay}</code>
          </p>
        </div>
        <button 
          on:click={closeModal}
          class="p-2 text-kong-text-secondary hover:text-kong-text-primary rounded transition-colors"
        >
          ✕
        </button>
      </div>

      <!-- Loading State -->
      {#if detailLoading}
        <div class="flex items-center justify-center py-8">
          <div class="flex items-center space-x-3">
            <Loader class="w-6 h-6 animate-spin text-kong-accent-blue" />
            <span class="text-kong-text-primary">Loading LP positions...</span>
          </div>
        </div>
      {:else if detailError}
        <div class="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-red-900/30 rounded-full flex items-center justify-center">
              <span class="text-red-400 text-sm">!</span>
            </div>
            <div>
              <h4 class="font-semibold text-red-400">Failed to Load Positions</h4>
              <p class="text-sm text-red-300">{detailError}</p>
              {#if detailError.includes('User not found')}
                <p class="text-xs text-red-300 mt-1">
                  This lock canister may not be registered on KongSwap yet.
                </p>
              {/if}
            </div>
          </div>
        </div>
      {:else if detailPositions.length > 0}
        <!-- Position Summary -->
        <div class="bg-kong-bg-secondary/50 border border-kong-border/50 rounded-lg p-4">
          <h4 class="text-lg font-semibold text-kong-text-primary mb-3">Summary</h4>
          <div class="grid grid-cols-3 gap-4 text-center">
            <div>
              <div class="text-2xl font-bold text-kong-accent-blue">{detailPositions.length}</div>
              <div class="text-xs text-kong-text-secondary">LP Pools</div>
            </div>
            <div>
              <div class="text-2xl font-bold text-kong-accent-green">${detailSummary?.totalUSD.toFixed(2) || '0.00'}</div>
              <div class="text-xs text-kong-text-secondary">Total Value</div>
            </div>
            <div>
              <div class="text-2xl font-bold text-kong-accent-purple">{detailSummary?.votingPower.toLocaleString() || '0'}</div>
              <div class="text-xs text-kong-text-secondary">Voting Power</div>
            </div>
          </div>
        </div>

        <!-- Individual Positions -->
        <div class="space-y-3">
          <h4 class="text-lg font-semibold text-kong-text-primary">Individual LP Positions</h4>
          {#each detailPositions as position}
            <LPPositionCard 
              {position} 
              percentOfTotal={(position.usd_balance / detailSummary.totalUSD) * 100}
            />
          {/each}
        </div>
      {:else}
        <!-- No Positions -->
        <div class="text-center py-8">
          <div class="w-16 h-16 bg-kong-accent-orange/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span class="text-2xl">🔒</span>
          </div>
          <h4 class="text-lg font-semibold text-kong-text-primary mb-2">No LP Tokens Locked</h4>
          <p class="text-kong-text-secondary">
            This lock canister is registered on KongSwap but doesn't have any LP tokens yet.
          </p>
        </div>
      {/if}

      <!-- Modal Footer -->
      <div class="flex justify-end pt-4 border-t border-kong-border/50">
        <button 
          on:click={closeModal}
          class="kong-button-secondary px-6 py-2 text-sm font-medium"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}