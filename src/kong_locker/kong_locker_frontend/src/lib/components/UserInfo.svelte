<script lang="ts">
  import { onMount } from 'svelte';
  import { User, LogOut, Wallet, Copy, Check } from 'lucide-svelte';
  import { authStore, authService, isAuthenticated, principal } from '../stores/auth';
  import { balanceStore, BalanceService, formatIcpBalance } from '../services/balance';
  
  let balanceService: BalanceService | null = null;
  let copySuccess = false;
  
  // Subscribe to auth changes to create balance service
  $: if ($authStore.identity && $authStore.principal) {
    balanceService = new BalanceService($authStore.identity);
    balanceService.fetchIcpBalance($authStore.principal);
  }
  
  async function handleLogout() {
    try {
      await authService.logout();
      balanceService = null;
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
  
  async function copyPrincipal() {
    if ($principal) {
      try {
        await navigator.clipboard.writeText($principal.toString());
        copySuccess = true;
        setTimeout(() => {
          copySuccess = false;
        }, 2000);
      } catch (error) {
        console.error('Failed to copy principal:', error);
      }
    }
  }
  
  function truncatePrincipal(principalStr: string): string {
    if (principalStr.length <= 20) return principalStr;
    return `${principalStr.substring(0, 10)}...${principalStr.substring(principalStr.length - 10)}`;
  }
</script>

{#if $isAuthenticated && $principal}
  <div class="kong-panel bg-kong-bg-secondary/80 backdrop-blur-sm">
    <!-- User Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center space-x-2">
        <div class="p-2 bg-kong-accent-green/20 rounded-full">
          <User class="w-5 h-5 text-kong-accent-green" />
        </div>
        <span class="text-sm font-semibold text-kong-text-primary">Connected</span>
      </div>
      <button 
        on:click={handleLogout}
        class="p-2 text-kong-text-secondary hover:text-kong-error hover:bg-kong-error/10 rounded-lg transition-all duration-200"
        title="Logout"
      >
        <LogOut class="w-4 h-4" />
      </button>
    </div>
    
    <!-- Principal -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs text-kong-text-secondary uppercase tracking-wide">Principal ID</span>
        <button 
          on:click={copyPrincipal}
          class="flex items-center space-x-1 px-2 py-1 text-xs text-kong-accent-green hover:bg-kong-accent-green/10 rounded-md transition-all duration-200"
          title="Copy Principal"
        >
          {#if copySuccess}
            <Check class="w-3 h-3" />
            <span>Copied!</span>
          {:else}
            <Copy class="w-3 h-3" />
            <span>Copy</span>
          {/if}
        </button>
      </div>
      <p class="text-sm font-mono text-kong-text-primary bg-kong-bg-tertiary/50 p-2 rounded-md border">
        {truncatePrincipal($principal.toString())}
      </p>
    </div>
    
    <!-- ICP Balance -->
    <div class="space-y-2 pt-3 border-t border-kong-border/50">
      <div class="flex items-center space-x-2">
        <Wallet class="w-4 h-4 text-kong-accent-blue" />
        <span class="text-xs text-kong-text-secondary uppercase tracking-wide">ICP Balance</span>
      </div>
      
      {#if $balanceStore.isLoading}
        <div class="flex items-center space-x-2">
          <div class="w-4 h-4 border-2 border-kong-accent-green/30 border-t-kong-accent-green rounded-full animate-spin"></div>
          <span class="text-sm text-kong-text-secondary">Loading...</span>
        </div>
      {:else if $balanceStore.error}
        <div class="text-sm text-kong-error">
          Failed to load balance
        </div>
        <button 
          on:click={() => balanceService?.fetchIcpBalance($principal)}
          class="text-xs text-kong-accent-green hover:text-kong-success-hover transition-colors"
        >
          Retry
        </button>
      {:else}
        <p class="text-sm font-semibold text-kong-text-primary">
          {formatIcpBalance($balanceStore.icpBalance)}
        </p>
        {#if $balanceStore.lastUpdated}
          <p class="text-xs text-kong-text-secondary">
            Updated: {$balanceStore.lastUpdated.toLocaleTimeString()}
          </p>
        {/if}
      {/if}
    </div>
    
    <!-- Refresh Button -->
    <div class="pt-3 border-t border-kong-border/50">
      <button 
        on:click={() => $principal && balanceService?.fetchIcpBalance($principal)}
        class="w-full px-3 py-2 text-xs font-medium text-kong-accent-green hover:bg-kong-accent-green/10 border border-kong-accent-green/30 hover:border-kong-accent-green/50 rounded-lg transition-all duration-200"
        disabled={$balanceStore.isLoading}
      >
        {$balanceStore.isLoading ? 'Refreshing...' : 'Refresh Balance'}
      </button>
    </div>
  </div>
{/if}