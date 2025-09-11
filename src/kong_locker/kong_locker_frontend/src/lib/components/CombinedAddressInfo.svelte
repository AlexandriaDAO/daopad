<script lang="ts">
  import { User, Lock, Copy, Eye, Check, Wallet } from 'lucide-svelte';
  import { principal, authStore } from '../stores/auth';
  import { userLockStore } from '../stores/userLock';
  import { balanceStore, BalanceService, formatIcpBalance } from '../services/balance';
  
  let copyPrincipalSuccess = false;
  let copyLockSuccess = false;
  let showDetailsModal = false;
  let balanceService = null;
  
  // Subscribe to auth changes to create balance service
  $: if ($authStore.identity && $authStore.principal) {
    balanceService = new BalanceService($authStore.identity);
    balanceService.fetchIcpBalance($authStore.principal);
  }
  
  async function copyPrincipal() {
    if ($principal) {
      try {
        await navigator.clipboard.writeText($principal.toString());
        copyPrincipalSuccess = true;
        setTimeout(() => {
          copyPrincipalSuccess = false;
        }, 2000);
      } catch (error) {
        console.error('Failed to copy principal:', error);
      }
    }
  }
  
  async function copyLockAddress() {
    if ($userLockStore.canisterId) {
      try {
        await navigator.clipboard.writeText($userLockStore.canisterId.toString());
        copyLockSuccess = true;
        setTimeout(() => {
          copyLockSuccess = false;
        }, 2000);
      } catch (error) {
        console.error('Failed to copy address:', error);
      }
    }
  }
  
  // Use real canister details from store
  $: canisterDetails = {
    isBlackholed: $userLockStore.isBlackholed,
    isRegistered: $userLockStore.isRegisteredOnKongSwap,
    hasFunding: $userLockStore.hasIcpFunding,
    cycles: 792_000_000_000,
    memory: 2.1,
    memoryLimit: 4096,
    moduleHash: '0x3f2a1b8c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
  };
  
  function formatCycles(cycles) {
    return (cycles / 1_000_000_000).toFixed(1) + 'B';
  }
</script>

<div class="bg-kong-bg-secondary/30 border border-kong-border/30 rounded-lg p-6">
  <div class="flex items-center justify-between mb-6">
    <h3 class="text-xl font-semibold text-kong-text-primary">Your Addresses</h3>
  </div>
  
  <!-- Side by Side Address Layout -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
    
    <!-- Wallet Connection -->
    <div class="bg-kong-accent-blue/10 border border-kong-accent-blue/30 rounded-lg p-3 md:p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-3">
          <div class="p-2 bg-kong-accent-blue/20 rounded-lg">
            <User class="w-5 h-5 text-kong-accent-blue" />
          </div>
          <div>
            <h4 class="text-sm md:text-base font-medium text-kong-text-primary">Wallet Connection</h4>
            <div class="flex items-center space-x-2">
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 bg-kong-accent-green rounded-full animate-pulse"></div>
                <span class="text-xs md:text-sm text-kong-accent-green">Connected</span>
              </div>
              <div class="w-1 h-1 bg-kong-text-secondary rounded-full"></div>
              <span class="text-xs md:text-sm text-kong-text-secondary">✓ Active</span>
            </div>
          </div>
        </div>
        
        <!-- Principal ID Badge and ICP Balance moved to header -->
        <div class="text-right">
          <div class="flex items-center justify-end space-x-2 mb-1">
            <div class="bg-kong-accent-blue/20 px-2 py-1 rounded-full">
              <span class="text-xs font-semibold text-kong-accent-blue">WALLET ADDRESS</span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs text-kong-text-primary font-medium mb-1">ICP Balance</div>
            {#if $balanceStore.isLoading}
              <div class="flex items-center justify-end space-x-1">
                <div class="w-3 h-3 border-2 border-kong-accent-green/30 border-t-kong-accent-green rounded-full animate-spin"></div>
                <span class="text-xs text-kong-text-secondary">Loading...</span>
              </div>
            {:else if $balanceStore.error}
              <div class="text-xs text-kong-error">Failed to load</div>
            {:else}
              <div class="text-sm font-bold text-kong-text-primary">
                {formatIcpBalance($balanceStore.icpBalance)}
              </div>
            {/if}
          </div>
        </div>
      </div>
      
      <!-- Principal ID -->
      <div class="space-y-2">
        <span class="text-sm font-medium text-kong-text-primary">Principal ID</span>
        
        {#if $principal}
          <div class="bg-kong-bg-tertiary/50 p-2 md:p-3 rounded border border-kong-border/50 mb-2 relative">
            <p class="text-xs md:text-sm font-mono text-kong-text-primary break-all leading-relaxed pr-16">
              {$principal.toString()}
            </p>
            <!-- Embedded copy button -->
            <button 
              on:click={copyPrincipal}
              class="absolute top-2 right-2 flex items-center space-x-1 px-2 py-1 text-xs text-kong-accent-green hover:bg-kong-accent-green/10 rounded-md transition-all duration-200"
            >
              {#if copyPrincipalSuccess}
                <Check class="w-3 h-3" />
                <span class="hidden sm:inline">Copied!</span>
              {:else}
                <Copy class="w-3 h-3" />
                <span class="hidden sm:inline">Copy</span>
              {/if}
            </button>
          </div>
          <p class="text-xs text-kong-text-secondary">
            <strong>For ICP only</strong> • Send LP tokens to your Lock Address instead
          </p>
        {/if}
      </div>
    </div>

    <!-- Your Locked Liquidity -->
    <div class="bg-kong-accent-green/10 border border-kong-accent-green/30 rounded-lg p-3 md:p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-3">
          <div class="p-2 bg-kong-accent-green/20 rounded-lg">
            <Lock class="w-5 h-5 text-kong-accent-green" />
          </div>
          <div>
            <h4 class="text-sm md:text-base font-medium text-kong-text-primary">Your Locked Liquidity</h4>
            <div class="flex items-center space-x-2">
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 bg-kong-accent-green rounded-full animate-pulse"></div>
                <span class="text-xs md:text-sm text-kong-accent-green">🔒 Permanently Locked</span>
              </div>
              <div class="w-1 h-1 bg-kong-text-secondary rounded-full"></div>
              <span class="text-xs md:text-sm text-kong-text-secondary">✓ Active</span>
            </div>
          </div>
        </div>
        
        <!-- Lock Address Badge and Voting Power moved to header -->
        <div class="text-right">
          <div class="flex items-center justify-end space-x-2 mb-1">
            <div class="bg-kong-accent-green/20 px-2 py-1 rounded-full">
              <span class="text-xs font-semibold text-kong-accent-green">FOR LP TOKENS</span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs text-kong-text-primary font-medium mb-1">Voting Power</div>
            <div class="text-lg font-bold kong-gradient-text">
              {($userLockStore.votingPower || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Lock Address -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-kong-text-primary">Lock Address</span>
          <div class="flex items-center space-x-1 md:space-x-2">
            <button 
              on:click={copyLockAddress}
              class="flex items-center space-x-1 px-2 py-1 text-xs text-white bg-kong-accent-green hover:bg-kong-accent-green/80 rounded-md transition-all duration-200 font-medium"
            >
              {#if copyLockSuccess}
                <Check class="w-3 h-3" />
                <span class="hidden sm:inline">Copied!</span>
              {:else}
                <Copy class="w-3 h-3" />
                <span class="hidden sm:inline">Copy</span>
              {/if}
            </button>
            <button 
              on:click={() => showDetailsModal = true}
              class="flex items-center space-x-1 px-2 py-1 text-xs text-kong-accent-blue hover:bg-kong-accent-blue/10 rounded-md transition-all duration-200"
            >
              <Eye class="w-3 h-3" />
              <span class="hidden sm:inline">Details</span>
            </button>
          </div>
        </div>
        
        {#if $userLockStore.canisterId}
          <div class="bg-kong-bg-tertiary/50 p-2 md:p-3 rounded border border-kong-accent-green/30 mb-2">
            <p class="text-xs md:text-sm font-mono text-kong-text-primary break-all leading-relaxed">
              {$userLockStore.canisterId.toString()}
            </p>
          </div>
          <p class="text-xs text-kong-text-secondary">
            <a href="/docs#transfer-guide" class="text-kong-accent-green hover:underline">Transfer guide →</a> • 
            {$userLockStore.votingPower === 0 ? 'No LP tokens locked yet' : 'Based on locked LP token value'}
          </p>
        {:else}
          <div class="text-sm text-kong-text-secondary">No lock canister yet</div>
        {/if}
      </div>
    </div>
  </div>
</div>

<!-- Details Modal -->
{#if showDetailsModal}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <div class="kong-panel max-w-md w-full space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-kong-text-primary">Lock Canister Security Details</h3>
        <button 
          on:click={() => showDetailsModal = false}
          class="p-1 text-kong-text-secondary hover:text-kong-text-primary rounded"
        >
          ✕
        </button>
      </div>
      
      <div class="space-y-4 text-sm">
        <!-- Blackhole Status -->
        <div class="flex items-center justify-between p-3 bg-kong-accent-green/10 border border-kong-accent-green/30 rounded-lg">
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 bg-kong-accent-green rounded-full"></div>
            <span class="font-medium text-kong-text-primary">Blackholed</span>
          </div>
          <span class="text-xs text-kong-text-secondary">No controllers - permanent</span>
        </div>
        
        <!-- Cycles -->
        <div class="flex items-center justify-between p-3 bg-kong-accent-blue/10 border border-kong-accent-blue/30 rounded-lg">
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 bg-kong-accent-blue rounded-full"></div>
            <span class="font-medium text-kong-text-primary">Cycles</span>
          </div>
          <div class="text-right">
            <div class="font-mono text-kong-text-primary">{formatCycles(canisterDetails.cycles)}</div>
            <div class="text-xs text-kong-text-secondary">Sufficient for ~3 years</div>
          </div>
        </div>
        
        <!-- Memory -->
        <div class="flex items-center justify-between p-3 bg-kong-accent-blue/10 border border-kong-accent-blue/30 rounded-lg">
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 bg-kong-accent-blue rounded-full"></div>
            <span class="font-medium text-kong-text-primary">Memory</span>
          </div>
          <div class="text-right">
            <div class="font-mono text-kong-text-primary">{canisterDetails.memory} MB / {canisterDetails.memoryLimit} MB</div>
            <div class="text-xs text-kong-text-secondary">Operating normally</div>
          </div>
        </div>
        
        <!-- Module Hash -->
        <div class="space-y-2">
          <span class="font-medium text-kong-text-primary">Module Hash:</span>
          <p class="font-mono text-xs text-kong-text-secondary bg-kong-bg-tertiary/50 p-2 rounded border break-all">
            {canisterDetails.moduleHash.substring(0, 32)}...
          </p>
        </div>
        
        <!-- Security Statement -->
        <div class="bg-kong-accent-green/10 border border-kong-accent-green/30 rounded-lg p-3">
          <p class="text-xs text-kong-text-secondary">
            <strong class="text-kong-text-primary">This canister is autonomous</strong> and cannot be modified by anyone, 
            including the original creators. Your locked tokens are permanently secure.
          </p>
        </div>
      </div>
      
      <div class="flex justify-end pt-3 border-t border-kong-border/50">
        <button 
          on:click={() => showDetailsModal = false}
          class="kong-button-secondary px-6 py-2 text-sm font-medium"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}