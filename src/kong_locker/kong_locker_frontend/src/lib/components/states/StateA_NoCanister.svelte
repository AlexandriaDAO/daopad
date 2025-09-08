<script lang="ts">
  import { Lock, Wallet, AlertCircle } from 'lucide-svelte';
  import { isAuthenticated } from '../../stores/auth';
  import { userLockService, userLockStore } from '../../stores/userLock';
  import HeroSection from '../HeroSection.svelte';
  
  export let authenticated = false;
  export let showGlow = false;
  
  // If not authenticated, show the hero section
  $: showHero = !authenticated && !$isAuthenticated;
  
  async function handleCreateCanister() {
    await userLockService.createLockCanister();
  }
</script>

{#if showHero}
  <HeroSection {showGlow} />
{:else}
  <!-- Authenticated user with no canister -->
  <section class="max-w-lg mx-auto space-y-6">
    <!-- Status Card -->
    <div class="kong-panel space-y-4">
      <div class="flex items-center space-x-3 mb-4">
        <div class="p-2 bg-kong-accent-blue/20 rounded-full">
          <Lock class="w-6 h-6 text-kong-accent-blue" />
        </div>
        <div>
          <h2 class="text-xl font-semibold text-kong-text-primary">Your Lock Canister Status</h2>
          <p class="text-sm text-kong-text-secondary">Status: Not Created</p>
        </div>
      </div>
      
      <div class="border-t border-kong-border/50 pt-4">
        <button 
          on:click={handleCreateCanister}
          disabled={$userLockStore.isCreating}
          class="w-full kong-button-primary py-4 text-lg font-semibold kong-shine disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div class="flex items-center justify-center space-x-2">
            {#if $userLockStore.isCreating}
              <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>{$userLockStore.creationStep || 'Processing...'}</span>
            {:else}
              <Wallet class="w-5 h-5" />
              <span>Create Lock Canister - 2 ICP</span>
            {/if}
          </div>
        </button>
        
        
        <!-- Error Display -->
        {#if $userLockStore.error}
          <div class="mt-3 p-3 bg-kong-error/10 border border-kong-error/20 rounded-lg">
            <div class="flex items-start space-x-2">
              <AlertCircle class="w-4 h-4 text-kong-error mt-0.5 flex-shrink-0" />
              <div class="flex-1">
                <p class="text-sm text-kong-error">{$userLockStore.error}</p>
                <button 
                  on:click={userLockService.clearError}
                  class="text-xs text-kong-error/70 hover:text-kong-error mt-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </section>
{/if}