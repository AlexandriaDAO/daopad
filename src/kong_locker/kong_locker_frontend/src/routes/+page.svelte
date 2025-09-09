<script lang="ts">
  import { onMount } from 'svelte';
  import { Loader } from 'lucide-svelte';
  import { authService, authStore, isAuthenticated, isAuthLoading, principal } from '../lib/stores/auth';
  import { userLockService, userState, userLockStore } from '../lib/stores/userLock';
  import { lpLockingService, lockingStatsStore, formatUsd, formatCount } from '../lib/services/lpLocking';
  
  import StatsPanel from '../lib/components/StatsPanel.svelte';
  import UserInfo from '../lib/components/UserInfo.svelte';
  import StateA_NoCanister from '../lib/components/states/StateA_NoCanister.svelte';
  import StateB_Creating from '../lib/components/states/StateB_Creating.svelte';
  import StateC_Ready from '../lib/components/states/StateC_Ready.svelte';
  import StateD_HasLiquidity from '../lib/components/states/StateD_HasLiquidity.svelte';
  import StateE_NeedsSetup from '../lib/components/states/StateE_NeedsSetup.svelte';
  
  // Reactive state for the demo
  let showGlow = false;
  
  // Initialize authentication and load user state
  onMount(async () => {
    // Initialize authentication
    try {
      await authService.init();
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    }
    
    // Load real statistics from backend
    try {
      await lpLockingService.fetchStats();
    } catch (error) {
      console.error('Failed to load locking stats:', error);
    }
    
    // Enable glow animation
    setTimeout(() => {
      showGlow = true;
    }, 1000);
  });
  
  // Track if initial load is complete
  let initialLoadComplete = false;
  
  // Load user lock state when authenticated
  $: if ($isAuthenticated && $principal) {
    // If this is the first time we're loading after auth, set loading state immediately
    if (!initialLoadComplete) {
      userLockStore.update(state => ({ ...state, isLoading: true }));
      initialLoadComplete = true;
    }
    userLockService.loadUserState($principal);
  } else if (!$isAuthenticated) {
    // Reset user lock state when logged out
    userLockService.reset();
    initialLoadComplete = false;
  }
  
  // Developer testing controls
  let showDebugPanel = false;
  
  // Enable debug panel in development (you can check for dev mode)
  $: if (typeof window !== 'undefined') {
    showDebugPanel = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');
  }
  
  // Connect/disconnect handler
  async function handleConnect() {
    if ($isAuthenticated) {
      await authService.logout();
    } else {
      try {
        await authService.login();
      } catch (error) {
        console.error('Login failed:', error);
      }
    }
  }
  
</script>

<svelte:head>
  <title>Kong Locker - LP Token Locking Service</title>
</svelte:head>

<div class="min-h-screen space-y-6">
  <!-- Navigation Bar -->
  <div class="fixed top-4 right-4 z-50 flex items-center gap-3">
    <!-- Analytics Button -->
    <a 
      href="/analytics" 
      class="bg-gray-800/90 hover:bg-gray-700/90 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all duration-200 shadow-lg flex items-center gap-2 border border-gray-700/50 hover:border-gray-600"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <span>Analytics</span>
    </a>
    
    <!-- Docs Button -->
    <a 
      href="/docs" 
      class="bg-gray-800/90 hover:bg-gray-700/90 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all duration-200 shadow-lg flex items-center gap-2 border border-gray-700/50 hover:border-gray-600"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
      <span>API Docs</span>
    </a>
    
    <!-- Connect/Disconnect Button -->
    <button 
      class="kong-button-primary px-4 py-2 text-sm font-semibold kong-shine disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
      on:click={handleConnect}
      disabled={$isAuthLoading}
    >
      {#if $isAuthLoading}
        <div class="flex items-center space-x-2">
          <Loader class="w-4 h-4 animate-spin" />
          <span>Connecting...</span>
        </div>
      {:else if $isAuthenticated}
        <span>Disconnect</span>
      {:else}
        <span>Connect Wallet</span>
      {/if}
    </button>
  </div>

  <!-- Unified Information Dashboard -->
  <div class="max-w-7xl mx-auto">
    <div class="kong-panel space-y-6">
      <!-- Dashboard Header -->
      <div class="flex items-center justify-between border-b border-kong-border/30 pb-4">
        <h2 class="text-xl font-semibold text-kong-text-primary">Kong Locker Dashboard</h2>
        <button 
          on:click={async () => {
            try {
              await lpLockingService.fetchStats();
            } catch (error) {
              console.error('Failed to refresh stats:', error);
            }
          }}
          class="flex items-center space-x-2 px-4 py-2 text-sm text-kong-accent-green hover:bg-kong-accent-green/10 border border-kong-accent-green/30 hover:border-kong-accent-green/50 rounded-lg transition-all duration-200"
          disabled={$lockingStatsStore.isLoading}
        >
          <svg class="w-4 h-4 {$lockingStatsStore.isLoading ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{$lockingStatsStore.isLoading ? 'Refreshing...' : 'Refresh Stats'}</span>
        </button>
      </div>
      
      <!-- Main Dashboard Grid -->
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        <!-- Global Statistics + User State -->
        <div class="xl:col-span-9 space-y-6">
          
          <!-- Global Statistics Row -->
          <div>
            <h3 class="text-lg font-semibold text-kong-text-primary mb-4 flex items-center">
              <svg class="w-5 h-5 mr-2 text-kong-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Platform Analytics
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- LP Positions Card -->
              <div class="bg-gradient-to-br from-kong-accent-blue/5 to-kong-accent-blue/10 border border-kong-accent-blue/20 rounded-lg p-6">
                <div class="flex items-center space-x-3 mb-4">
                  <div class="p-2 bg-kong-accent-blue/20 rounded-lg">
                    <svg class="w-6 h-6 text-kong-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h4 class="text-base font-medium text-kong-text-primary">LP Positions</h4>
                    <p class="text-sm text-kong-text-secondary">Unique locked positions</p>
                  </div>
                </div>
                {#if $lockingStatsStore.isLoading}
                  <div class="flex items-center">
                    <div class="w-6 h-6 border-2 border-kong-accent-blue/30 border-t-kong-accent-blue rounded-full animate-spin mr-3"></div>
                    <span class="text-kong-text-secondary">Loading...</span>
                  </div>
                {:else}
                  <div class="text-3xl font-bold text-kong-accent-blue">
                    {formatCount($lockingStatsStore.totalPositions)}
                  </div>
                {/if}
              </div>
              
              <!-- Total Value Locked Card -->
              <div class="bg-gradient-to-br from-kong-accent-green/5 to-kong-accent-green/10 border border-kong-accent-green/20 rounded-lg p-6">
                <div class="flex items-center space-x-3 mb-4">
                  <div class="p-2 bg-kong-accent-green/20 rounded-lg">
                    <svg class="w-6 h-6 text-kong-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <h4 class="text-base font-medium text-kong-text-primary">Total Value Locked</h4>
                    <p class="text-sm text-kong-text-secondary">USD value of locked LP tokens</p>
                  </div>
                </div>
                {#if $lockingStatsStore.isLoading}
                  <div class="flex items-center">
                    <div class="w-6 h-6 border-2 border-kong-accent-green/30 border-t-kong-accent-green rounded-full animate-spin mr-3"></div>
                    <span class="text-kong-text-secondary">Loading...</span>
                  </div>
                {:else}
                  <div class="text-3xl font-bold kong-gradient-text">
                    {formatUsd($lockingStatsStore.totalValueLocked)}
                  </div>
                {/if}
              </div>
            </div>
            {#if $lockingStatsStore.lastUpdated}
              <div class="text-center pt-3 mt-4 border-t border-kong-border/20">
                <p class="text-sm text-kong-text-secondary">
                  Last updated: {$lockingStatsStore.lastUpdated.toLocaleString()}
                </p>
              </div>
            {/if}
          </div>
          
          <!-- User State Content -->
          <div>
            {#if $userState === 'loading'}
              <!-- Loading state - integrated -->
              <div class="border-t border-kong-border/30 pt-6">
                <div class="text-center space-y-4">
                  <Loader class="w-8 h-8 animate-spin mx-auto text-kong-accent-green" />
                  <h3 class="text-lg font-semibold text-kong-text-primary">Loading Your Status</h3>
                  <p class="text-sm text-kong-text-secondary">Checking your lock canister status...</p>
                </div>
              </div>
            {:else if $userState === 'not-connected'}
              <StateA_NoCanister {showGlow} integrated={true} />
            {:else if $userState === 'no-canister'}
              <StateA_NoCanister authenticated={true} {showGlow} integrated={true} />
            {:else if $userState === 'creating'}
              <StateB_Creating integrated={true} />
            {:else if $userState === 'ready'}
              <StateC_Ready integrated={true} />
            {:else if $userState === 'has-liquidity'}
              <StateD_HasLiquidity integrated={true} />
            {:else if $userState === 'needs-setup'}
              <StateE_NeedsSetup integrated={true} />
            {/if}
          </div>
        </div>
        
        <!-- User Connection Info - Right Sidebar -->
        {#if $isAuthenticated}
          <div class="xl:col-span-3">
            <div class="bg-kong-bg-secondary/30 border border-kong-border/30 rounded-lg p-6 h-fit">
              <UserInfo />
            </div>
          </div>
        {/if}
        
      </div>
      
      <!-- Error Display -->
      {#if $lockingStatsStore.error}
        <div class="bg-kong-error/10 border-kong-error/20 border rounded-lg p-4">
          <div class="flex items-center justify-between">
            <p class="text-sm text-kong-error">{$lockingStatsStore.error}</p>
            <button 
              on:click={() => lpLockingService.clearError()}
              class="text-sm text-kong-error/70 hover:text-kong-error ml-4"
            >
              Dismiss
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
  
  <!-- User errors are now handled within the unified dashboard -->
  {#if $userLockStore.error}
    <section class="max-w-7xl mx-auto">
      <div class="bg-kong-error/10 border-kong-error/20 border rounded-lg p-4">
        <div class="flex items-center justify-between">
          <p class="text-sm text-kong-error">{$userLockStore.error}</p>
          <button 
            on:click={userLockService.clearError}
            class="text-sm text-kong-error/70 hover:text-kong-error ml-4"
          >
            Dismiss
          </button>
        </div>
      </div>
    </section>
  {/if}
  
  <!-- Developer Debug Panel (only in development) -->
  {#if showDebugPanel && $isAuthenticated}
    <section class="max-w-lg mx-auto mt-8">
      <div class="kong-panel bg-kong-accent-orange/5 border-kong-accent-orange/20 space-y-4">
        <h3 class="text-sm font-semibold text-kong-accent-orange">🛠️ Developer Debug Panel</h3>
        <p class="text-xs text-kong-text-secondary">Testing controls (only visible in development)</p>
        
        <div class="flex flex-col space-y-2">
          <p class="text-xs text-kong-text-secondary">Current State: <strong class="text-kong-text-primary">{$userState}</strong></p>
          
          <div class="flex space-x-2">
            <button 
              on:click={() => userLockService.enableMockData()}
              class="flex-1 px-3 py-2 text-xs font-medium text-kong-accent-green hover:bg-kong-accent-green/10 border border-kong-accent-green/30 hover:border-kong-accent-green/50 rounded-lg transition-all duration-200"
              disabled={$userLockStore.useMockData}
            >
              Enable Mock Data (State D)
            </button>
            
            <button 
              on:click={() => userLockService.disableMockData()}
              class="flex-1 px-3 py-2 text-xs font-medium text-kong-accent-blue hover:bg-kong-accent-blue/10 border border-kong-accent-blue/30 hover:border-kong-accent-blue/50 rounded-lg transition-all duration-200"
              disabled={!$userLockStore.useMockData}
            >
              Disable Mock Data
            </button>
          </div>
          
          <div class="text-xs text-kong-text-secondary">
            Mock Status: {$userLockStore.useMockData ? '✅ Enabled' : '❌ Disabled'}
          </div>
        </div>
      </div>
    </section>
  {/if}
</div>