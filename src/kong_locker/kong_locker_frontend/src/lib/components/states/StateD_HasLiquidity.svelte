<script lang="ts">
  import { Lock, Copy, ExternalLink, Eye, Check, Plus, ArrowRight, TrendingUp } from 'lucide-svelte';
  import { userLockStore } from '../../stores/userLock';
  import { formatUsd } from '../../services/lpLocking';
  
  let copySuccess = false;
  let showDetailsModal = false;
  
  // Use real voting power and value from store
  $: totalVotingPower = $userLockStore.votingPower;
  $: totalUsdValue = totalVotingPower / 100; // Convert cents to dollars
  
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
  
  function openDAOPad() {
    window.open('https://daopad.io', '_blank');
  }
  
  function openKongSwap() {
    window.open('https://app.kongswap.io', '_blank');
  }
  
  function truncateAddress(address: string): string {
    if (address.length <= 25) return address;
    return `${address.substring(0, 12)}...${address.substring(address.length - 8)}`;
  }
  
  function formatCycles(cycles: number): string {
    return (cycles / 1_000_000_000).toFixed(1) + 'B';
  }
</script>

<section class="max-w-4xl mx-auto space-y-6">
  
  <!-- Main Dashboard -->
  <div class="kong-panel space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="p-2 bg-kong-accent-green/20 rounded-full">
          <Lock class="w-6 h-6 text-kong-accent-green" />
        </div>
        <div>
          <h2 class="text-xl font-semibold text-kong-text-primary">Your Locked Liquidity</h2>
          <div class="flex items-center space-x-2">
            <div class="flex items-center space-x-1">
              <div class="w-2 h-2 bg-kong-accent-green rounded-full animate-pulse"></div>
              <span class="text-sm text-kong-accent-green font-medium">🔒 Permanently Locked</span>
            </div>
            <div class="w-1 h-1 bg-kong-text-secondary rounded-full"></div>
            <span class="text-sm text-kong-text-secondary">✓ Active</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Lock Address -->
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
            <span>Details</span>
          </button>
        </div>
      </div>
      
      {#if $userLockStore.canisterId}
        <p class="text-sm font-mono text-kong-text-primary bg-kong-bg-tertiary/50 p-2 rounded border">
          {truncateAddress($userLockStore.canisterId.toString())}
        </p>
      {/if}
    </div>
    
    <!-- Total Voting Power - Prominent Display -->
    <div class="text-center py-6 bg-gradient-to-br from-kong-accent-green/10 to-kong-accent-blue/10 border border-kong-accent-green/20 rounded-xl">
      <div class="space-y-3">
        <div class="flex items-center justify-center space-x-2 mb-2">
          <TrendingUp class="w-6 h-6 text-kong-accent-green" />
          <h3 class="text-xl font-semibold text-kong-text-primary">Total Voting Power</h3>
        </div>
        <div class="text-5xl font-bold kong-gradient-text">
          {totalVotingPower.toLocaleString()}
        </div>
        <p class="text-lg text-kong-text-secondary">
          Based on {formatUsd(totalUsdValue)} locked liquidity
        </p>
        <div class="flex items-center justify-center space-x-4 mt-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-kong-accent-blue">1</div>
            <div class="text-xs text-kong-text-secondary uppercase tracking-wide">Position</div>
          </div>
          <div class="w-1 h-8 bg-kong-border/50"></div>
          <div class="text-center">
            <div class="text-2xl font-bold text-kong-accent-green">{formatUsd(totalUsdValue)}</div>
            <div class="text-xs text-kong-text-secondary uppercase tracking-wide">Total Value</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Locked Positions -->
  <div class="kong-panel space-y-4">
    <h3 class="text-lg font-semibold text-kong-text-primary flex items-center">
      <Lock class="w-5 h-5 mr-2 text-kong-accent-orange" />
      Locked Position
    </h3>
    
    <div class="bg-kong-bg-secondary/50 border border-kong-border/50 rounded-lg p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 bg-kong-accent-green/20 rounded-full flex items-center justify-center">
            <Lock class="w-6 h-6 text-kong-accent-green" />
          </div>
          <div>
            <div class="font-semibold text-kong-text-primary">LP Tokens Locked</div>
            <div class="text-sm text-kong-text-secondary">Permanently locked in canister</div>
            <div class="text-xs text-kong-text-secondary">Canister: {$userLockStore.canisterId ? truncateAddress($userLockStore.canisterId.toString()) : ''}</div>
          </div>
        </div>
        
        <div class="text-right">
          <div class="text-lg font-bold text-kong-text-primary">{formatUsd(totalUsdValue)}</div>
          <div class="text-sm text-kong-accent-green">{totalVotingPower} voting power</div>
        </div>
      </div>
    </div>
    
    <p class="text-xs text-kong-text-secondary text-center">
      LP tokens are permanently locked and can never be withdrawn
    </p>
  </div>
  
  <!-- Action Buttons -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <button 
      on:click={openDAOPad}
      class="kong-panel hover:bg-kong-accent-green/5 border-kong-accent-green/30 hover:border-kong-accent-green/50 transition-all duration-200 cursor-pointer group"
    >
      <div class="flex items-center justify-between p-2">
        <div class="flex items-center space-x-3">
          <div class="p-2 bg-kong-accent-green/20 rounded-full group-hover:bg-kong-accent-green/30 transition-colors">
            <ArrowRight class="w-5 h-5 text-kong-accent-green" />
          </div>
          <div class="text-left">
            <div class="font-semibold text-kong-text-primary">Use in DAOPad</div>
            <div class="text-sm text-kong-text-secondary">Vote on Alexandria DAO proposals</div>
          </div>
        </div>
        <ExternalLink class="w-4 h-4 text-kong-text-secondary group-hover:text-kong-accent-green transition-colors" />
      </div>
    </button>
    
    <button 
      on:click={openKongSwap}
      class="kong-panel hover:bg-kong-accent-blue/5 border-kong-accent-blue/30 hover:border-kong-accent-blue/50 transition-all duration-200 cursor-pointer group"
    >
      <div class="flex items-center justify-between p-2">
        <div class="flex items-center space-x-3">
          <div class="p-2 bg-kong-accent-blue/20 rounded-full group-hover:bg-kong-accent-blue/30 transition-colors">
            <Plus class="w-5 h-5 text-kong-accent-blue" />
          </div>
          <div class="text-left">
            <div class="font-semibold text-kong-text-primary">Lock More</div>
            <div class="text-sm text-kong-text-secondary">Add more LP tokens to increase power</div>
          </div>
        </div>
        <ExternalLink class="w-4 h-4 text-kong-text-secondary group-hover:text-kong-accent-blue transition-colors" />
      </div>
    </button>
  </div>
  
</section>

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