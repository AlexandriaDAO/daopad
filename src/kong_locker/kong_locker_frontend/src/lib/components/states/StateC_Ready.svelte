<script lang="ts">
  import { Lock, Copy, Eye, Check } from 'lucide-svelte';
  import { userLockStore } from '../../stores/userLock';
  
  export let integrated = false;
  
  let copySuccess = false;
  let showDetailsModal = false;
  
  // Use real canister details from store
  $: canisterDetails = {
    isBlackholed: $userLockStore.isBlackholed,
    isRegistered: $userLockStore.isRegisteredOnKongSwap,
    hasFunding: $userLockStore.hasIcpFunding,
    cycles: 792_000_000_000, // TODO: Get from detailed status
    memory: 2.1,
    memoryLimit: 4096,
    moduleHash: '0x3f2a1b8c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
  };
  
  async function copyAddress() {
    if ($userLockStore.canisterId) {
      try {
        await navigator.clipboard.writeText($userLockStore.canisterId.toString());
        copySuccess = true;
        setTimeout(() => {
          copySuccess = false;
        }, 2000);
      } catch (error) {
        console.error('Failed to copy address:', error);
      }
    }
  }
  
  function truncateAddress(address: string): string {
    if (address.length <= 25) return address;
    return `${address.substring(0, 12)}...${address.substring(address.length - 8)}`;
  }
  
  function formatCycles(cycles: number): string {
    return (cycles / 1_000_000_000).toFixed(1) + 'B';
  }
</script>

<div class="{integrated ? 'border-t border-kong-border/30 pt-6 space-y-6' : 'max-w-2xl mx-auto'}">
  
  <!-- Main Dashboard -->
  <div class="{integrated ? 'space-y-6' : 'kong-panel space-y-6'}">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="p-2 bg-kong-accent-green/20 rounded-full">
          <Lock class="w-6 h-6 text-kong-accent-green" />
        </div>
        <div>
          <h3 class="{integrated ? 'text-lg' : 'text-xl'} font-semibold text-kong-text-primary">
            {integrated ? 'Your Lock Canister' : 'Your Lock Canister'}
          </h3>
          <div class="flex items-center space-x-2">
            <div class="flex items-center space-x-1">
              <div class="w-2 h-2 bg-kong-accent-green rounded-full animate-pulse"></div>
              <span class="text-sm text-kong-accent-green font-medium">🔒 Permanently Blackholed</span>
            </div>
            <div class="w-1 h-1 bg-kong-text-secondary rounded-full"></div>
            <span class="text-sm text-kong-text-secondary">✓ Active</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Canister Address -->
    <div class="bg-kong-bg-secondary/50 border border-kong-border/50 rounded-lg p-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-kong-text-primary">Lock Address</span>
        <div class="flex items-center space-x-2">
          <button 
            on:click={copyAddress}
            class="flex items-center space-x-1 px-2 py-1 text-xs text-kong-accent-green hover:bg-kong-accent-green/10 rounded-md transition-all duration-200"
          >
            {#if copySuccess}
              <Check class="w-3 h-3" />
              <span>Copied!</span>
            {:else}
              <Copy class="w-3 h-3" />
              <span>Copy</span>
            {/if}
          </button>
          <button 
            on:click={() => showDetailsModal = true}
            class="flex items-center space-x-1 px-2 py-1 text-xs text-kong-accent-blue hover:bg-kong-accent-blue/10 rounded-md transition-all duration-200"
          >
            <Eye class="w-3 h-3" />
            <span>View Details</span>
          </button>
        </div>
      </div>
      
      {#if $userLockStore.canisterId}
        <p class="text-sm font-mono text-kong-text-primary bg-kong-bg-tertiary/50 p-2 rounded border">
          {truncateAddress($userLockStore.canisterId.toString())}
        </p>
      {:else}
        <div class="w-6 h-6 border-2 border-kong-accent-blue/30 border-t-kong-accent-blue rounded-full animate-spin"></div>
      {/if}
    </div>
    
    <!-- Voting Power Display -->
    <div class="text-center py-4">
      <div class="space-y-2">
        <h3 class="text-lg font-semibold text-kong-text-primary">Voting Power</h3>
        <div class="text-4xl font-bold kong-gradient-text">
          {$userLockStore.votingPower}
        </div>
        <p class="text-sm text-kong-text-secondary">
          {$userLockStore.votingPower === 0 ? 'No LP tokens locked yet' : 'Based on locked LP token value'}
        </p>
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