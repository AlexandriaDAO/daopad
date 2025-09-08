<script lang="ts">
  import { onMount } from 'svelte';
  import { Loader } from 'lucide-svelte';
  import { authService, authStore, isAuthenticated, isAuthLoading, principal } from '../lib/stores/auth';
  import { userLockService, userState, userLockStore } from '../lib/stores/userLock';
  import { lpLockingService } from '../lib/services/lpLocking';
  
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

<div class="min-h-screen space-y-12">
  <!-- Navigation Bar -->
  <div class="fixed top-4 right-4 z-50 flex items-center gap-3">
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

  <!-- Keep stats always visible at top -->
  <StatsPanel />
  
  <!-- User Info Panel (shown when authenticated) -->
  {#if $isAuthenticated}
    <section class="max-w-sm mx-auto">
      <UserInfo />
    </section>
  {/if}
  
  <!-- State-based content -->
  {#if $userState === 'loading'}
    <!-- Loading state - show skeleton or spinner -->
    <section class="max-w-lg mx-auto">
      <div class="kong-panel text-center space-y-4">
        <Loader class="w-8 h-8 animate-spin mx-auto text-kong-accent-green" />
        <p class="text-sm text-kong-text-secondary">Loading your lock canister status...</p>
      </div>
    </section>
  {:else if $userState === 'not-connected'}
    <StateA_NoCanister {showGlow} />
  {:else if $userState === 'no-canister'}
    <StateA_NoCanister authenticated={true} {showGlow} />
  {:else if $userState === 'creating'}
    <StateB_Creating />
  {:else if $userState === 'ready'}
    <StateC_Ready />
  {:else if $userState === 'has-liquidity'}
    <StateD_HasLiquidity />
  {:else if $userState === 'needs-setup'}
    <StateE_NeedsSetup />
  {/if}
  
  <!-- Show error if any -->
  {#if $userLockStore.error}
    <section class="max-w-lg mx-auto">
      <div class="kong-panel bg-kong-error/10 border-kong-error/20 text-center">
        <p class="text-sm text-kong-error">{$userLockStore.error}</p>
        <button 
          on:click={userLockService.clearError}
          class="text-xs text-kong-error/70 hover:text-kong-error mt-2"
        >
          Dismiss
        </button>
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