<script lang="ts">
  import { onMount } from 'svelte';
  import { Lock, Coins, TrendingUp, Shield, Sparkles } from 'lucide-svelte';
  
  // Reactive state for the demo
  let isConnected = false;
  let showGlow = false;
  
  // Demo statistics
  let stats = {
    totalLocked: 0,
    positionsCount: 0,
    totalValue: 0,
  };
  
  // Animate numbers on mount
  onMount(() => {
    // Animate stats
    const targetStats = {
      totalLocked: 1250000,
      positionsCount: 847,
      totalValue: 3420000,
    };
    
    // Simple animation
    setTimeout(() => {
      stats = targetStats;
    }, 500);
    
    // Enable glow animation
    setTimeout(() => {
      showGlow = true;
    }, 1000);
  });
  
  function handleConnect() {
    isConnected = !isConnected;
  }
  
  function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  }
  
  function formatCount(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }
</script>

<svelte:head>
  <title>Kong Locker - LP Token Locking Service</title>
</svelte:head>

<div class="min-h-screen space-y-12">
  <!-- Hero Section -->
  <section class="text-center space-y-8 py-12">
    <!-- Logo/Brand -->
    <div class="flex items-center justify-center space-x-3 mb-8">
      <div class="p-3 bg-gradient-button rounded-full {showGlow ? 'animate-glow' : ''}">
        <Lock class="w-8 h-8 text-white" />
      </div>
      <h1 class="text-4xl md:text-6xl font-bold font-exo">
        <span class="kong-gradient-text">Kong</span>
        <span class="text-kong-text-primary">Locker</span>
      </h1>
    </div>
    
    <!-- Tagline -->
    <div class="max-w-4xl mx-auto space-y-4">
      <h2 class="text-xl md:text-2xl text-kong-text-secondary font-space">
        Permanently lock your KongSwap LP tokens
      </h2>
      <p class="text-lg text-kong-text-secondary max-w-2xl mx-auto leading-relaxed">
        Generate immutable proof of liquidity commitment for governance systems. 
        Once locked, your LP tokens become permanent proof of your dedication to the protocol.
      </p>
    </div>
    
    <!-- CTA Buttons -->
    <div class="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
      <button 
        class="kong-button-primary px-8 py-4 text-lg font-semibold kong-shine"
        on:click={handleConnect}
      >
        {isConnected ? 'Connected ✨' : 'Connect Wallet'}
      </button>
      <button class="kong-button-secondary px-6 py-4">
        View Documentation
      </button>
    </div>
  </section>
  
  <!-- Statistics Dashboard -->
  <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div class="kong-panel text-center">
      <div class="flex items-center justify-center mb-3">
        <Coins class="w-8 h-8 text-kong-accent-green mr-2" />
        <h3 class="text-lg font-semibold text-kong-text-primary">Total Locked</h3>
      </div>
      <p class="text-3xl font-bold kong-gradient-text">
        {formatNumber(stats.totalLocked)}
      </p>
    </div>
    
    <div class="kong-panel text-center">
      <div class="flex items-center justify-center mb-3">
        <Shield class="w-8 h-8 text-kong-accent-blue mr-2" />
        <h3 class="text-lg font-semibold text-kong-text-primary">Positions</h3>
      </div>
      <p class="text-3xl font-bold text-kong-accent-blue">
        {formatCount(stats.positionsCount)}
      </p>
    </div>
    
    <div class="kong-panel text-center">
      <div class="flex items-center justify-center mb-3">
        <TrendingUp class="w-8 h-8 text-kong-warning mr-2" />
        <h3 class="text-lg font-semibold text-kong-text-primary">Total Value</h3>
      </div>
      <p class="text-3xl font-bold text-kong-warning">
        {formatNumber(stats.totalValue)}
      </p>
    </div>
  </section>
  
  <!-- Features Section -->
  <section class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <div class="kong-panel">
      <div class="flex items-center mb-4">
        <Lock class="w-6 h-6 text-kong-accent-green mr-3" />
        <h3 class="text-xl font-bold text-kong-text-primary">Permanent Locking</h3>
      </div>
      <p class="text-kong-text-secondary leading-relaxed">
        LP tokens are locked forever with no unlock mechanism. This creates genuine, 
        long-term commitment and prevents gaming governance systems.
      </p>
      <div class="mt-4 p-3 bg-kong-warning/10 border border-kong-warning/20 rounded-lg">
        <p class="text-sm text-kong-warning">
          ⚠️ Warning: Locked tokens cannot be recovered. This action is irreversible.
        </p>
      </div>
    </div>
    
    <div class="kong-panel">
      <div class="flex items-center mb-4">
        <Sparkles class="w-6 h-6 text-kong-accent-blue mr-3" />
        <h3 class="text-xl font-bold text-kong-text-primary">Proof Generation</h3>
      </div>
      <p class="text-kong-text-secondary leading-relaxed">
        Receive a unique Principal ID that represents your locked liquidity. 
        Use this proof in DAOPad and other governance systems to claim voting rights.
      </p>
      <div class="mt-4 flex items-center space-x-2">
        <span class="kong-badge-success">Trustless</span>
        <span class="kong-badge-success">Immutable</span>
        <span class="kong-badge-success">Verifiable</span>
      </div>
    </div>
  </section>
  
  <!-- How It Works -->
  <section class="kong-panel">
    <h2 class="text-2xl font-bold text-kong-text-primary mb-6 text-center">
      How Kong Locker Works
    </h2>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="text-center space-y-4">
        <div class="w-12 h-12 bg-gradient-button rounded-full flex items-center justify-center mx-auto">
          <span class="text-white font-bold">1</span>
        </div>
        <h3 class="text-lg font-semibold text-kong-text-primary">Connect & Select</h3>
        <p class="text-kong-text-secondary">
          Connect your wallet and select the KongSwap LP tokens you want to lock permanently.
        </p>
      </div>
      
      <div class="text-center space-y-4">
        <div class="w-12 h-12 bg-gradient-button rounded-full flex items-center justify-center mx-auto">
          <span class="text-white font-bold">2</span>
        </div>
        <h3 class="text-lg font-semibold text-kong-text-primary">Lock Forever</h3>
        <p class="text-kong-text-secondary">
          Transfer your LP tokens to Kong Locker. They will be locked permanently with no recovery possible.
        </p>
      </div>
      
      <div class="text-center space-y-4">
        <div class="w-12 h-12 bg-gradient-button rounded-full flex items-center justify-center mx-auto">
          <span class="text-white font-bold">3</span>
        </div>
        <h3 class="text-lg font-semibold text-kong-text-primary">Get Proof</h3>
        <p class="text-kong-text-secondary">
          Receive a unique LP Principal that proves your locked liquidity for governance participation.
        </p>
      </div>
    </div>
  </section>
  
  <!-- Footer -->
  <footer class="text-center py-8 text-kong-text-secondary">
    <p class="text-sm">
      Built with ❤️ for the Internet Computer ecosystem | 
      <a href="https://kongswap.io" class="text-kong-accent-green hover:text-kong-success-hover transition-colors">
        Powered by KongSwap
      </a>
    </p>
  </footer>
</div>