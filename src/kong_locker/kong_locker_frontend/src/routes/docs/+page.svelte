<script lang="ts">
  import { onMount } from 'svelte';
  import { HttpAgent, Actor } from '@dfinity/agent';
  import { Principal } from '@dfinity/principal';
  import { Loader } from 'lucide-svelte';
  
  let activeSection = 'introduction';
  let copySuccess = '';
  
  // API call states
  let apiResults: { [key: string]: any } = {};
  let apiLoading: { [key: string]: boolean } = {};
  let apiErrors: { [key: string]: string } = {};
  let principalInput = '';
  
  // LP Locking Actor
  let lpLockingActor: any = null;
  
  const sections = [
    { id: 'introduction', title: 'Introduction', icon: '📚' },
    { id: 'overview', title: 'API Overview', icon: '🔍' },
    { id: 'query-functions', title: 'Query Functions', icon: '🔎' },
    { id: 'update-functions', title: 'Update Functions', icon: '✏️' },
    { id: 'types', title: 'Data Types', icon: '📊' },
    { id: 'examples', title: 'Integration Examples', icon: '💡' },
    { id: 'errors', title: 'Error Handling', icon: '⚠️' }
  ];
  
  // IDL for LP Locking canister
  const lpLockingIdl = ({ IDL }: any) => {
    const DetailedCanisterStatus = IDL.Record({
      'canister_id': IDL.Principal,
      'is_blackholed': IDL.Bool,
      'controller_count': IDL.Nat32,
      'cycle_balance': IDL.Nat,
      'memory_size': IDL.Nat,
      'module_hash': IDL.Opt(IDL.Vec(IDL.Nat8)),
    });
    
    return IDL.Service({
      // Query calls
      'get_total_positions_count': IDL.Func([], [IDL.Nat64], ['query']),
      'get_my_lock_canister': IDL.Func([], [IDL.Opt(IDL.Principal)], ['query']),
      'get_all_lock_canisters': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Principal))], ['query']),
      
      // Update calls (because they make inter-canister calls)
      'get_total_value_locked': IDL.Func([], [IDL.Variant({ 'Ok': IDL.Nat, 'Err': IDL.Text })], []),
      'get_voting_power': IDL.Func([IDL.Principal], [IDL.Variant({ 'Ok': IDL.Nat, 'Err': IDL.Text })], []),
      'get_all_voting_powers': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat))], []),
      'get_detailed_canister_status': IDL.Func([], [IDL.Variant({ 'Ok': DetailedCanisterStatus, 'Err': IDL.Text })], []),
      
      // Not for interactive use
      'create_lock_canister': IDL.Func([], [IDL.Variant({ 'Ok': IDL.Principal, 'Err': IDL.Text })], []),
      'complete_my_canister_setup': IDL.Func([], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
    });
  };
  
  // Initialize the actor
  onMount(async () => {
    const host = 'https://icp0.io';
    const agent = new HttpAgent({ host });
    
    lpLockingActor = Actor.createActor(lpLockingIdl, {
      agent,
      canisterId: 'eazgb-giaaa-aaaap-qqc2q-cai',
    });
    
    // Intersection observer for active section highlighting
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            activeSection = entry.target.id;
          }
        });
      },
      { threshold: 0.3 }
    );
    
    sections.forEach(section => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });
    
    return () => observer.disconnect();
  });
  
  // API call functions
  async function callGetMyLockCanister() {
    const key = 'get_my_lock_canister';
    apiLoading[key] = true;
    apiErrors[key] = '';
    
    try {
      const result = await lpLockingActor.get_my_lock_canister();
      apiResults[key] = result.length > 0 ? result[0].toText() : 'No lock canister found';
    } catch (error: any) {
      apiErrors[key] = error.message || 'Failed to call API';
    } finally {
      apiLoading[key] = false;
    }
  }
  
  async function callGetAllLockCanisters() {
    const key = 'get_all_lock_canisters';
    apiLoading[key] = true;
    apiErrors[key] = '';
    
    try {
      const result = await lpLockingActor.get_all_lock_canisters();
      apiResults[key] = result.map((pair: any) => ({
        user: pair[0].toText(),
        canister: pair[1].toText()
      }));
    } catch (error: any) {
      apiErrors[key] = error.message || 'Failed to call API';
    } finally {
      apiLoading[key] = false;
    }
  }
  
  async function callGetTotalPositionsCount() {
    const key = 'get_total_positions_count';
    apiLoading[key] = true;
    apiErrors[key] = '';
    
    try {
      const result = await lpLockingActor.get_total_positions_count();
      apiResults[key] = result.toString();
    } catch (error: any) {
      apiErrors[key] = error.message || 'Failed to call API';
    } finally {
      apiLoading[key] = false;
    }
  }
  
  async function callGetVotingPower() {
    const key = 'get_voting_power';
    
    if (!principalInput.trim()) {
      apiErrors[key] = 'Please enter a principal';
      return;
    }
    
    apiLoading[key] = true;
    apiErrors[key] = '';
    
    try {
      const principal = Principal.fromText(principalInput.trim());
      const result = await lpLockingActor.get_voting_power(principal);
      
      if ('Ok' in result) {
        const cents = Number(result.Ok);
        const usd = (cents / 100).toFixed(2);
        apiResults[key] = {
          cents: cents.toString(),
          usd: `$${usd}`
        };
      } else {
        apiResults[key] = { error: result.Err };
      }
    } catch (error: any) {
      apiErrors[key] = error.message || 'Failed to call API';
    } finally {
      apiLoading[key] = false;
    }
  }
  
  async function callGetAllVotingPowers() {
    const key = 'get_all_voting_powers';
    apiLoading[key] = true;
    apiErrors[key] = '';
    
    try {
      const result = await lpLockingActor.get_all_voting_powers();
      apiResults[key] = result.map((pair: any) => ({
        user: pair[0].toText(),
        votingPower: {
          cents: pair[1].toString(),
          usd: `$${(Number(pair[1]) / 100).toFixed(2)}`
        }
      }));
    } catch (error: any) {
      apiErrors[key] = error.message || 'Failed to call API';
    } finally {
      apiLoading[key] = false;
    }
  }
  
  async function callGetTotalValueLocked() {
    const key = 'get_total_value_locked';
    apiLoading[key] = true;
    apiErrors[key] = '';
    
    try {
      const result = await lpLockingActor.get_total_value_locked();
      
      if ('Ok' in result) {
        const cents = Number(result.Ok);
        const usd = (cents / 100).toFixed(2);
        apiResults[key] = {
          cents: cents.toString(),
          usd: `$${usd.toLocaleString()}`
        };
      } else {
        apiResults[key] = { error: result.Err };
      }
    } catch (error: any) {
      apiErrors[key] = error.message || 'Failed to call API';
    } finally {
      apiLoading[key] = false;
    }
  }
  
  async function callGetDetailedCanisterStatus() {
    const key = 'get_detailed_canister_status';
    apiLoading[key] = true;
    apiErrors[key] = '';
    
    try {
      const result = await lpLockingActor.get_detailed_canister_status();
      
      if ('Ok' in result) {
        const status = result.Ok;
        apiResults[key] = {
          canister_id: status.canister_id.toText(),
          is_blackholed: status.is_blackholed,
          controller_count: status.controller_count.toString(),
          cycle_balance: status.cycle_balance.toString(),
          memory_size: `${(Number(status.memory_size) / (1024 * 1024)).toFixed(2)} MB`,
          module_hash: status.module_hash.length > 0 ? 'Present' : 'None'
        };
      } else {
        apiResults[key] = { error: result.Err };
      }
    } catch (error: any) {
      apiErrors[key] = error.message || 'Failed to call API';
    } finally {
      apiLoading[key] = false;
    }
  }
  
  function scrollToSection(sectionId: string) {
    activeSection = sectionId;
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  
  async function copyCode(text: string, buttonId: string) {
    try {
      await navigator.clipboard.writeText(text);
      copySuccess = buttonId;
      setTimeout(() => copySuccess = '', 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
</script>

<div class="flex gap-8">
  <!-- Sidebar Navigation -->
  <aside class="w-64 sticky top-8 h-fit">
    <div class="bg-[#1a1b1f] rounded-2xl p-6 border border-gray-800">
      <h2 class="text-xl font-bold text-white mb-6">Documentation</h2>
      <nav class="space-y-2">
        {#each sections as section}
          <button
            on:click={() => scrollToSection(section.id)}
            class="w-full text-left px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2
                   {activeSection === section.id 
                     ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-400' 
                     : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}"
          >
            <span>{section.icon}</span>
            <span class="text-sm">{section.title}</span>
          </button>
        {/each}
      </nav>
    </div>
  </aside>

  <!-- Main Documentation Content -->
  <main class="flex-1 max-w-4xl">
    <!-- Back Button -->
    <div class="mb-4">
      <a 
        href="/" 
        class="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span class="text-sm">Back to Kong Locker</span>
      </a>
    </div>
    
    <!-- Header -->
    <div class="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-8">
      <h1 class="text-4xl font-bold text-white mb-2">Kong Locker API Documentation</h1>
      <p class="text-blue-100">Interactive guide for Kong Locker's canister backend</p>
      <div class="mt-4 flex gap-4">
        <span class="bg-white/20 px-3 py-1 rounded-full text-sm text-white">
          Canister ID: eazgb-giaaa-aaaap-qqc2q-cai
        </span>
        <span class="bg-white/20 px-3 py-1 rounded-full text-sm text-white">
          Network: IC Mainnet
        </span>
      </div>
      <div class="mt-4 bg-white/10 rounded-lg p-3">
        <p class="text-sm text-blue-100">
          ✨ <strong>Interactive:</strong> Click "Try it now" buttons to execute API calls directly from this documentation!
        </p>
      </div>
    </div>

    <!-- Introduction Section -->
    <section id="introduction" class="mb-12 bg-[#1a1b1f] rounded-2xl p-8 border border-gray-800">
      <h2 class="text-3xl font-bold text-white mb-6">📚 Introduction</h2>
      <div class="prose prose-invert max-w-none">
        <p class="text-gray-300 leading-relaxed mb-4">
          Kong Locker provides a trustless, permanent liquidity locking service for KongSwap LP tokens. 
          This interactive API documentation allows you to test and explore the Kong Locker canister methods directly.
        </p>
        <div class="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-4">
          <h3 class="text-lg font-semibold text-blue-400 mb-2">Key Features</h3>
          <ul class="list-disc list-inside text-gray-300 space-y-1">
            <li>Permanent, irreversible LP token locking</li>
            <li>Individual blackholed canisters for each user</li>
            <li>Automatic voting power calculation from locked positions</li>
            <li>Integration with KongSwap for real-time valuations</li>
            <li><strong>Interactive API testing</strong> - Try methods directly from this page!</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- API Overview Section -->
    <section id="overview" class="mb-12 bg-[#1a1b1f] rounded-2xl p-8 border border-gray-800">
      <h2 class="text-3xl font-bold text-white mb-6">🔍 API Overview</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-700">
              <th class="text-left py-3 px-4 text-gray-400">Method</th>
              <th class="text-left py-3 px-4 text-gray-400">Type</th>
              <th class="text-left py-3 px-4 text-gray-400">Interactive</th>
              <th class="text-left py-3 px-4 text-gray-400">Description</th>
            </tr>
          </thead>
          <tbody class="text-gray-300">
            <tr class="border-b border-gray-800">
              <td class="py-3 px-4 font-mono">get_my_lock_canister</td>
              <td class="py-3 px-4"><span class="bg-green-900/30 text-green-400 px-2 py-1 rounded text-xs">Query</span></td>
              <td class="py-3 px-4">✅ Yes</td>
              <td class="py-3 px-4">Get caller's lock canister</td>
            </tr>
            <tr class="border-b border-gray-800">
              <td class="py-3 px-4 font-mono">get_all_lock_canisters</td>
              <td class="py-3 px-4"><span class="bg-green-900/30 text-green-400 px-2 py-1 rounded text-xs">Query</span></td>
              <td class="py-3 px-4">✅ Yes</td>
              <td class="py-3 px-4">List all user-canister mappings</td>
            </tr>
            <tr class="border-b border-gray-800">
              <td class="py-3 px-4 font-mono">get_total_positions_count</td>
              <td class="py-3 px-4"><span class="bg-green-900/30 text-green-400 px-2 py-1 rounded text-xs">Query</span></td>
              <td class="py-3 px-4">✅ Yes</td>
              <td class="py-3 px-4">Count of unique lock positions</td>
            </tr>
            <tr class="border-b border-gray-800">
              <td class="py-3 px-4 font-mono">get_voting_power</td>
              <td class="py-3 px-4"><span class="bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded text-xs">Update</span></td>
              <td class="py-3 px-4">✅ Yes</td>
              <td class="py-3 px-4">Calculate user's voting power</td>
            </tr>
            <tr class="border-b border-gray-800">
              <td class="py-3 px-4 font-mono">get_all_voting_powers</td>
              <td class="py-3 px-4"><span class="bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded text-xs">Update</span></td>
              <td class="py-3 px-4">✅ Yes</td>
              <td class="py-3 px-4">Get all users' voting powers</td>
            </tr>
            <tr class="border-b border-gray-800">
              <td class="py-3 px-4 font-mono">get_total_value_locked</td>
              <td class="py-3 px-4"><span class="bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded text-xs">Update</span></td>
              <td class="py-3 px-4">✅ Yes</td>
              <td class="py-3 px-4">Total USD value locked</td>
            </tr>
            <tr class="border-b border-gray-800">
              <td class="py-3 px-4 font-mono">get_detailed_canister_status</td>
              <td class="py-3 px-4"><span class="bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded text-xs">Update</span></td>
              <td class="py-3 px-4">✅ Yes</td>
              <td class="py-3 px-4">Detailed canister information</td>
            </tr>
            <tr class="border-b border-gray-800">
              <td class="py-3 px-4 font-mono">create_lock_canister</td>
              <td class="py-3 px-4"><span class="bg-blue-900/30 text-blue-400 px-2 py-1 rounded text-xs">Update</span></td>
              <td class="py-3 px-4">❌ No</td>
              <td class="py-3 px-4">Create new lock canister</td>
            </tr>
            <tr class="border-b border-gray-800">
              <td class="py-3 px-4 font-mono">complete_my_canister_setup</td>
              <td class="py-3 px-4"><span class="bg-blue-900/30 text-blue-400 px-2 py-1 rounded text-xs">Update</span></td>
              <td class="py-3 px-4">❌ No</td>
              <td class="py-3 px-4">Complete partial setup</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Query Functions Section -->
    <section id="query-functions" class="mb-12 bg-[#1a1b1f] rounded-2xl p-8 border border-gray-800">
      <h2 class="text-3xl font-bold text-white mb-6">🔎 Query Functions</h2>
      
      <!-- get_my_lock_canister -->
      <div class="mb-8 bg-gray-900/50 rounded-lg p-6">
        <h3 class="text-xl font-bold text-white mb-3">get_my_lock_canister</h3>
        <p class="text-gray-400 mb-4">Returns the lock canister Principal for the calling user (anonymous in this case).</p>
        
        <div class="bg-black/50 rounded-lg p-4 mb-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm text-gray-500">Candid Interface</span>
          </div>
          <pre class="text-sm text-green-400 font-mono overflow-x-auto">get_my_lock_canister : () -> (opt principal) query;</pre>
        </div>
        
        <!-- Interactive Section -->
        <div class="bg-purple-900/20 border border-purple-800 rounded-lg p-4 mb-4">
          <div class="flex justify-between items-center mb-3">
            <h4 class="text-sm font-semibold text-purple-400">🎮 Try it now!</h4>
            <button 
              on:click={callGetMyLockCanister}
              disabled={apiLoading['get_my_lock_canister']}
              class="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            >
              {#if apiLoading['get_my_lock_canister']}
                <Loader class="w-4 h-4 animate-spin" />
                <span>Calling...</span>
              {:else}
                <span>Execute Call</span>
              {/if}
            </button>
          </div>
          
          {#if apiResults['get_my_lock_canister']}
            <div class="bg-black/50 rounded p-3 mt-3">
              <p class="text-xs text-gray-400 mb-1">Result:</p>
              <pre class="text-sm text-green-400 font-mono">{apiResults['get_my_lock_canister']}</pre>
            </div>
          {/if}
          
          {#if apiErrors['get_my_lock_canister']}
            <div class="bg-red-900/20 rounded p-3 mt-3">
              <p class="text-xs text-red-400">Error: {apiErrors['get_my_lock_canister']}</p>
            </div>
          {/if}
        </div>
      </div>

      <!-- get_all_lock_canisters -->
      <div class="mb-8 bg-gray-900/50 rounded-lg p-6">
        <h3 class="text-xl font-bold text-white mb-3">get_all_lock_canisters</h3>
        <p class="text-gray-400 mb-4">Returns all user-to-lock-canister mappings in the system.</p>
        
        <div class="bg-black/50 rounded-lg p-4 mb-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm text-gray-500">Candid Interface</span>
          </div>
          <pre class="text-sm text-green-400 font-mono overflow-x-auto">get_all_lock_canisters : () -> (vec record {`{ principal; principal }`}) query;</pre>
        </div>
        
        <!-- Interactive Section -->
        <div class="bg-purple-900/20 border border-purple-800 rounded-lg p-4 mb-4">
          <div class="flex justify-between items-center mb-3">
            <h4 class="text-sm font-semibold text-purple-400">🎮 Try it now!</h4>
            <button 
              on:click={callGetAllLockCanisters}
              disabled={apiLoading['get_all_lock_canisters']}
              class="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            >
              {#if apiLoading['get_all_lock_canisters']}
                <Loader class="w-4 h-4 animate-spin" />
                <span>Calling...</span>
              {:else}
                <span>Execute Call</span>
              {/if}
            </button>
          </div>
          
          {#if apiResults['get_all_lock_canisters']}
            <div class="bg-black/50 rounded p-3 mt-3 max-h-64 overflow-y-auto">
              <p class="text-xs text-gray-400 mb-1">Result ({apiResults['get_all_lock_canisters'].length} entries):</p>
              <pre class="text-sm text-green-400 font-mono">{JSON.stringify(apiResults['get_all_lock_canisters'].slice(0, 5), null, 2)}</pre>
              {#if apiResults['get_all_lock_canisters'].length > 5}
                <p class="text-xs text-gray-500 mt-2">... and {apiResults['get_all_lock_canisters'].length - 5} more</p>
              {/if}
            </div>
          {/if}
          
          {#if apiErrors['get_all_lock_canisters']}
            <div class="bg-red-900/20 rounded p-3 mt-3">
              <p class="text-xs text-red-400">Error: {apiErrors['get_all_lock_canisters']}</p>
            </div>
          {/if}
        </div>
      </div>

      <!-- get_total_positions_count -->
      <div class="mb-8 bg-gray-900/50 rounded-lg p-6">
        <h3 class="text-xl font-bold text-white mb-3">get_total_positions_count</h3>
        <p class="text-gray-400 mb-4">Returns the total number of unique lock positions (users with lock canisters).</p>
        
        <div class="bg-black/50 rounded-lg p-4 mb-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm text-gray-500">Candid Interface</span>
          </div>
          <pre class="text-sm text-green-400 font-mono">get_total_positions_count : () -> (nat64) query;</pre>
        </div>
        
        <!-- Interactive Section -->
        <div class="bg-purple-900/20 border border-purple-800 rounded-lg p-4 mb-4">
          <div class="flex justify-between items-center mb-3">
            <h4 class="text-sm font-semibold text-purple-400">🎮 Try it now!</h4>
            <button 
              on:click={callGetTotalPositionsCount}
              disabled={apiLoading['get_total_positions_count']}
              class="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            >
              {#if apiLoading['get_total_positions_count']}
                <Loader class="w-4 h-4 animate-spin" />
                <span>Calling...</span>
              {:else}
                <span>Execute Call</span>
              {/if}
            </button>
          </div>
          
          {#if apiResults['get_total_positions_count']}
            <div class="bg-black/50 rounded p-3 mt-3">
              <p class="text-xs text-gray-400 mb-1">Result:</p>
              <pre class="text-sm text-green-400 font-mono">Total positions: {apiResults['get_total_positions_count']}</pre>
            </div>
          {/if}
          
          {#if apiErrors['get_total_positions_count']}
            <div class="bg-red-900/20 rounded p-3 mt-3">
              <p class="text-xs text-red-400">Error: {apiErrors['get_total_positions_count']}</p>
            </div>
          {/if}
        </div>
      </div>
    </section>

    <!-- Update Functions Section -->
    <section id="update-functions" class="mb-12 bg-[#1a1b1f] rounded-2xl p-8 border border-gray-800">
      <h2 class="text-3xl font-bold text-white mb-6">✏️ Update Functions</h2>
      
      <!-- get_voting_power -->
      <div class="mb-8 bg-gray-900/50 rounded-lg p-6">
        <h3 class="text-xl font-bold text-white mb-3">get_voting_power</h3>
        <p class="text-gray-400 mb-4">Calculates voting power for a user based on their locked LP positions. Returns value in cents (USD * 100).</p>
        
        <div class="bg-orange-900/20 border border-orange-800 rounded-lg p-3 mb-4">
          <p class="text-sm text-orange-400">⚠️ Note: This is an update call because it queries KongSwap via inter-canister call.</p>
        </div>
        
        <div class="bg-black/50 rounded-lg p-4 mb-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm text-gray-500">Candid Interface</span>
          </div>
          <pre class="text-sm text-green-400 font-mono overflow-x-auto">get_voting_power : (principal) -> (variant {`{ Ok : nat; Err : text }`});</pre>
        </div>
        
        <!-- Interactive Section -->
        <div class="bg-purple-900/20 border border-purple-800 rounded-lg p-4 mb-4">
          <div class="mb-3">
            <h4 class="text-sm font-semibold text-purple-400 mb-2">🎮 Try it now!</h4>
            <div class="flex gap-2">
              <input
                type="text"
                bind:value={principalInput}
                placeholder="Enter principal (e.g., 2vxsx-fae)"
                class="flex-1 px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500"
              />
              <button 
                on:click={callGetVotingPower}
                disabled={apiLoading['get_voting_power']}
                class="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
              >
                {#if apiLoading['get_voting_power']}
                  <Loader class="w-4 h-4 animate-spin" />
                  <span>Calling...</span>
                {:else}
                  <span>Execute Call</span>
                {/if}
              </button>
            </div>
          </div>
          
          {#if apiResults['get_voting_power']}
            <div class="bg-black/50 rounded p-3 mt-3">
              <p class="text-xs text-gray-400 mb-1">Result:</p>
              <pre class="text-sm text-green-400 font-mono">{JSON.stringify(apiResults['get_voting_power'], null, 2)}</pre>
            </div>
          {/if}
          
          {#if apiErrors['get_voting_power']}
            <div class="bg-red-900/20 rounded p-3 mt-3">
              <p class="text-xs text-red-400">Error: {apiErrors['get_voting_power']}</p>
            </div>
          {/if}
        </div>
      </div>

      <!-- get_all_voting_powers -->
      <div class="mb-8 bg-gray-900/50 rounded-lg p-6">
        <h3 class="text-xl font-bold text-white mb-3">get_all_voting_powers</h3>
        <p class="text-gray-400 mb-4">Returns voting powers for all users with lock canisters.</p>
        
        <div class="bg-orange-900/20 border border-orange-800 rounded-lg p-3 mb-4">
          <p class="text-sm text-orange-400">⚠️ This call may take a few seconds as it queries multiple canisters.</p>
        </div>
        
        <div class="bg-black/50 rounded-lg p-4 mb-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm text-gray-500">Candid Interface</span>
          </div>
          <pre class="text-sm text-green-400 font-mono">get_all_voting_powers : () -> (vec record {`{ principal; nat }`});</pre>
        </div>
        
        <!-- Interactive Section -->
        <div class="bg-purple-900/20 border border-purple-800 rounded-lg p-4 mb-4">
          <div class="flex justify-between items-center mb-3">
            <h4 class="text-sm font-semibold text-purple-400">🎮 Try it now!</h4>
            <button 
              on:click={callGetAllVotingPowers}
              disabled={apiLoading['get_all_voting_powers']}
              class="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            >
              {#if apiLoading['get_all_voting_powers']}
                <Loader class="w-4 h-4 animate-spin" />
                <span>Calling...</span>
              {:else}
                <span>Execute Call</span>
              {/if}
            </button>
          </div>
          
          {#if apiResults['get_all_voting_powers']}
            <div class="bg-black/50 rounded p-3 mt-3 max-h-64 overflow-y-auto">
              <p class="text-xs text-gray-400 mb-1">Result ({apiResults['get_all_voting_powers'].length} users):</p>
              <pre class="text-sm text-green-400 font-mono">{JSON.stringify(apiResults['get_all_voting_powers'].slice(0, 5), null, 2)}</pre>
              {#if apiResults['get_all_voting_powers'].length > 5}
                <p class="text-xs text-gray-500 mt-2">... and {apiResults['get_all_voting_powers'].length - 5} more</p>
              {/if}
            </div>
          {/if}
          
          {#if apiErrors['get_all_voting_powers']}
            <div class="bg-red-900/20 rounded p-3 mt-3">
              <p class="text-xs text-red-400">Error: {apiErrors['get_all_voting_powers']}</p>
            </div>
          {/if}
        </div>
      </div>

      <!-- get_total_value_locked -->
      <div class="mb-8 bg-gray-900/50 rounded-lg p-6">
        <h3 class="text-xl font-bold text-white mb-3">get_total_value_locked</h3>
        <p class="text-gray-400 mb-4">Calculates the total USD value locked across all lock canisters.</p>
        
        <div class="bg-orange-900/20 border border-orange-800 rounded-lg p-3 mb-4">
          <p class="text-sm text-orange-400">⚠️ Makes multiple inter-canister calls - may take a few seconds.</p>
        </div>
        
        <div class="bg-black/50 rounded-lg p-4 mb-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm text-gray-500">Candid Interface</span>
          </div>
          <pre class="text-sm text-green-400 font-mono">get_total_value_locked : () -> (variant {`{ Ok : nat; Err : text }`});</pre>
        </div>
        
        <!-- Interactive Section -->
        <div class="bg-purple-900/20 border border-purple-800 rounded-lg p-4 mb-4">
          <div class="flex justify-between items-center mb-3">
            <h4 class="text-sm font-semibold text-purple-400">🎮 Try it now!</h4>
            <button 
              on:click={callGetTotalValueLocked}
              disabled={apiLoading['get_total_value_locked']}
              class="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            >
              {#if apiLoading['get_total_value_locked']}
                <Loader class="w-4 h-4 animate-spin" />
                <span>Calling...</span>
              {:else}
                <span>Execute Call</span>
              {/if}
            </button>
          </div>
          
          {#if apiResults['get_total_value_locked']}
            <div class="bg-black/50 rounded p-3 mt-3">
              <p class="text-xs text-gray-400 mb-1">Result:</p>
              <pre class="text-sm text-green-400 font-mono">{JSON.stringify(apiResults['get_total_value_locked'], null, 2)}</pre>
            </div>
          {/if}
          
          {#if apiErrors['get_total_value_locked']}
            <div class="bg-red-900/20 rounded p-3 mt-3">
              <p class="text-xs text-red-400">Error: {apiErrors['get_total_value_locked']}</p>
            </div>
          {/if}
        </div>
      </div>

      <!-- get_detailed_canister_status -->
      <div class="mb-8 bg-gray-900/50 rounded-lg p-6">
        <h3 class="text-xl font-bold text-white mb-3">get_detailed_canister_status</h3>
        <p class="text-gray-400 mb-4">Returns detailed information about the caller's lock canister, including blackhole status and cycle balance.</p>
        
        <div class="bg-black/50 rounded-lg p-4 mb-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm text-gray-500">Response Type</span>
          </div>
          <pre class="text-sm text-green-400 font-mono overflow-x-auto">{`type DetailedCanisterStatus = {
  canister_id: Principal;
  is_blackholed: bool;
  controller_count: nat32;
  cycle_balance: nat;
  memory_size: nat;
  module_hash: opt blob;
}`}</pre>
        </div>
        
        <!-- Interactive Section -->
        <div class="bg-purple-900/20 border border-purple-800 rounded-lg p-4 mb-4">
          <div class="flex justify-between items-center mb-3">
            <h4 class="text-sm font-semibold text-purple-400">🎮 Try it now!</h4>
            <button 
              on:click={callGetDetailedCanisterStatus}
              disabled={apiLoading['get_detailed_canister_status']}
              class="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            >
              {#if apiLoading['get_detailed_canister_status']}
                <Loader class="w-4 h-4 animate-spin" />
                <span>Calling...</span>
              {:else}
                <span>Execute Call</span>
              {/if}
            </button>
          </div>
          
          {#if apiResults['get_detailed_canister_status']}
            <div class="bg-black/50 rounded p-3 mt-3">
              <p class="text-xs text-gray-400 mb-1">Result:</p>
              <pre class="text-sm text-green-400 font-mono">{JSON.stringify(apiResults['get_detailed_canister_status'], null, 2)}</pre>
            </div>
          {/if}
          
          {#if apiErrors['get_detailed_canister_status']}
            <div class="bg-red-900/20 rounded p-3 mt-3">
              <p class="text-xs text-red-400">Error: {apiErrors['get_detailed_canister_status']}</p>
            </div>
          {/if}
        </div>
      </div>

      <!-- create_lock_canister (non-interactive) -->
      <div class="mb-8 bg-gray-900/50 rounded-lg p-6">
        <h3 class="text-xl font-bold text-white mb-3">create_lock_canister</h3>
        <p class="text-gray-400 mb-4">Creates a new lock canister for the caller. Requires 2 ICP approval.</p>
        
        <div class="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4">
          <p class="text-sm text-red-400">🔒 Important: This creates a permanently locked canister. LP tokens sent to it can NEVER be withdrawn.</p>
        </div>
        
        <div class="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3 mb-4">
          <p class="text-sm text-yellow-400">⚠️ This function is not available for interactive testing. It requires ICP payment and should be used through the main Kong Locker interface.</p>
        </div>
        
        <div class="bg-black/50 rounded-lg p-4 mb-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm text-gray-500">Why not interactive?</span>
          </div>
          <ul class="text-sm text-gray-300 list-disc list-inside space-y-1">
            <li>Requires 2 ICP payment approval</li>
            <li>Creates permanent, irreversible locks</li>
            <li>Each user can only have one lock canister</li>
            <li>Best used through the authenticated UI for safety</li>
          </ul>
        </div>
        
        <div class="bg-black/50 rounded-lg p-4 mb-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm text-gray-500">Process Flow</span>
          </div>
          <pre class="text-sm text-purple-400 font-mono overflow-x-auto">{`1. Take 2 ICP payment (atomic)
2. Create new canister
3. Install lock code
4. Fund with 1 ICP
5. Register on KongSwap
6. Blackhole canister (remove all controllers)
7. Return canister Principal`}</pre>
        </div>
        
        <div class="bg-black/50 rounded-lg p-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm text-gray-500">Integration Example</span>
          </div>
          <pre class="text-sm text-yellow-400 font-mono overflow-x-auto">{`// First, approve 2 ICP to the Kong Locker canister
const icpLedger = await createActor(ICP_LEDGER_ID);
await icpLedger.icrc2_approve({
  spender: { owner: KONG_LOCKER_ID, subaccount: [] },
  amount: 200_010_000n, // 2 ICP + fees
  fee: [10_000n],
  expires_at: [],
  memo: [],
  created_at_time: []
});

// Then create the lock canister
const result = await kongLocker.create_lock_canister();
if ('Ok' in result) {
  console.log("Lock canister created:", result.Ok.toText());
  // Now you can send LP tokens to this canister
} else {
  console.error("Failed:", result.Err);
}`}</pre>
        </div>
      </div>

      <!-- complete_my_canister_setup (non-interactive) -->
      <div class="mb-8 bg-gray-900/50 rounded-lg p-6">
        <h3 class="text-xl font-bold text-white mb-3">complete_my_canister_setup</h3>
        <p class="text-gray-400 mb-4">Completes setup for a partially created canister. Useful for recovery from failed creation.</p>
        
        <div class="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3 mb-4">
          <p class="text-sm text-yellow-400">⚠️ This function is not available for interactive testing. It's designed for recovery scenarios and should be used through the main interface.</p>
        </div>
        
        <div class="bg-black/50 rounded-lg p-4 mb-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm text-gray-500">What it checks and fixes</span>
          </div>
          <ul class="text-sm text-gray-300 list-disc list-inside space-y-1">
            <li>Installs code if missing</li>
            <li>Funds with 1 ICP if needed</li>
            <li>Registers on KongSwap if not registered</li>
            <li>Blackholes canister if still has controllers</li>
          </ul>
        </div>
        
        <div class="bg-black/50 rounded-lg p-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm text-gray-500">Example Response</span>
          </div>
          <pre class="text-sm text-blue-400 font-mono">{`// Success - actions taken
variant { Ok = "Completed setup: funded with 1 ICP, registered with KongSwap, blackholed canister" }

// Success - already configured
variant { Ok = "Canister already fully configured" }

// Error
variant { Err = "No lock canister found. Use create_lock_canister() first." }`}</pre>
        </div>
      </div>
    </section>

    <!-- Data Types Section -->
    <section id="types" class="mb-12 bg-[#1a1b1f] rounded-2xl p-8 border border-gray-800">
      <h2 class="text-3xl font-bold text-white mb-6">📊 Data Types</h2>
      
      <div class="mb-8 bg-gray-900/50 rounded-lg p-6">
        <h3 class="text-xl font-bold text-white mb-3">LPReply</h3>
        <p class="text-gray-400 mb-4">Represents LP token position data from KongSwap.</p>
        
        <div class="bg-black/50 rounded-lg p-4 mb-4">
          <pre class="text-sm text-green-400 font-mono overflow-x-auto">{`type LPReply = {
  name: text;           // "ICP/ckUSDT LP Token"
  symbol: text;         // "ICP_ckUSDT"
  lp_token_id: nat64;   // 1
  balance: float64;     // 100.5
  usd_balance: float64; // 2500.75
  
  // First token details
  chain_0: text;        // "IC"
  symbol_0: text;       // "ICP"
  address_0: text;      // "ryjl3-tyaaa-aaaaa-aaaba-cai"
  amount_0: float64;    // 50.25
  usd_amount_0: float64; // 1250.50
  
  // Second token details
  chain_1: text;        // "IC"
  symbol_1: text;       // "ckUSDT"
  address_1: text;      // "cngnf-vqaaa-aaaag-qcqfq-cai"
  amount_1: float64;    // 1250.25
  usd_amount_1: float64; // 1250.25
  
  ts: nat64;            // 1699564800000
}`}</pre>
        </div>
      </div>
      
      <div class="mb-8 bg-gray-900/50 rounded-lg p-6">
        <h3 class="text-xl font-bold text-white mb-3">UserBalancesReply</h3>
        <p class="text-gray-400 mb-4">Enum wrapper for balance responses from KongSwap.</p>
        
        <div class="bg-black/50 rounded-lg p-4">
          <pre class="text-sm text-green-400 font-mono">{`type UserBalancesReply = variant {
  LP: LPReply;  // Currently only LP tokens are supported
}`}</pre>
        </div>
      </div>
      
      <div class="mb-8 bg-gray-900/50 rounded-lg p-6">
        <h3 class="text-xl font-bold text-white mb-3">DetailedCanisterStatus</h3>
        <p class="text-gray-400 mb-4">Comprehensive status information about a lock canister.</p>
        
        <div class="bg-black/50 rounded-lg p-4">
          <pre class="text-sm text-green-400 font-mono overflow-x-auto">{`type DetailedCanisterStatus = {
  canister_id: principal;     // The lock canister's ID
  is_blackholed: bool;        // true if no controllers
  controller_count: nat32;    // Should be 0 when blackholed
  cycle_balance: nat;         // Remaining cycles
  memory_size: nat;           // Memory usage in bytes
  module_hash: opt blob;      // WASM module hash
}`}</pre>
        </div>
      </div>
    </section>

    <!-- Integration Examples Section -->
    <section id="examples" class="mb-12 bg-[#1a1b1f] rounded-2xl p-8 border border-gray-800">
      <h2 class="text-3xl font-bold text-white mb-6">💡 Integration Examples</h2>
      
      <div class="mb-8 bg-gray-900/50 rounded-lg p-6">
        <h3 class="text-xl font-bold text-white mb-3">Complete Lock Flow</h3>
        <p class="text-gray-400 mb-4">Full example of creating a lock and transferring LP tokens.</p>
        
        <div class="bg-black/50 rounded-lg p-4">
          <pre class="text-sm text-yellow-400 font-mono overflow-x-auto">{`import { Principal } from '@dfinity/principal';
import { createActor } from './actor';

async function lockLPTokens(amount: bigint) {
  const kongLocker = await createActor(KONG_LOCKER_ID);
  const icpLedger = await createActor(ICP_LEDGER_ID);
  const kongSwap = await createActor(KONG_SWAP_ID);
  
  // Step 1: Check if user already has a lock canister
  const existingCanister = await kongLocker.get_my_lock_canister();
  if (existingCanister.length > 0) {
    console.log("Using existing canister:", existingCanister[0].toText());
    const lockCanisterId = existingCanister[0];
    
    // Transfer LP tokens to existing canister
    await transferLPTokens(lockCanisterId, amount);
    return lockCanisterId;
  }
  
  // Step 2: Approve 2 ICP for new canister creation
  console.log("Approving 2 ICP...");
  await icpLedger.icrc2_approve({
    spender: { owner: Principal.fromText(KONG_LOCKER_ID), subaccount: [] },
    amount: 200_010_000n, // 2 ICP + fees
    fee: [10_000n],
    expires_at: [],
    memo: [],
    created_at_time: []
  });
  
  // Step 3: Create lock canister
  console.log("Creating lock canister...");
  const createResult = await kongLocker.create_lock_canister();
  
  if ('Err' in createResult) {
    throw new Error(createResult.Err);
  }
  
  const lockCanisterId = createResult.Ok;
  console.log("Lock canister created:", lockCanisterId.toText());
  
  // Step 4: Transfer LP tokens to lock canister
  await transferLPTokens(lockCanisterId, amount);
  
  // Step 5: Verify lock
  const votingPower = await kongLocker.get_voting_power(
    await getIdentity().getPrincipal()
  );
  
  if ('Ok' in votingPower) {
    const usdValue = Number(votingPower.Ok) / 100;
    console.log(\`Locked value: $\${usdValue.toFixed(2)}\`);
  }
  
  return lockCanisterId;
}`}</pre>
        </div>
      </div>
      
      <div class="mb-8 bg-gray-900/50 rounded-lg p-6">
        <h3 class="text-xl font-bold text-white mb-3">Voting Power Dashboard</h3>
        <p class="text-gray-400 mb-4">Example of displaying all users' voting powers.</p>
        
        <div class="bg-black/50 rounded-lg p-4">
          <pre class="text-sm text-yellow-400 font-mono overflow-x-auto">{`async function displayVotingPowerLeaderboard() {
  const kongLocker = await createActor(KONG_LOCKER_ID);
  
  // Get all voting powers
  const allPowers = await kongLocker.get_all_voting_powers();
  
  // Sort by voting power (descending)
  const sorted = allPowers.sort((a, b) => {
    const powerA = Number(a[1]);
    const powerB = Number(b[1]);
    return powerB - powerA;
  });
  
  // Display leaderboard
  console.log("🏆 Voting Power Leaderboard");
  console.log("===========================");
  
  sorted.slice(0, 10).forEach((entry, index) => {
    const [principal, power] = entry;
    const usdValue = Number(power) / 100;
    
    console.log(
      \`\${index + 1}. \${principal.toText().slice(0, 10)}... - $\${usdValue.toLocaleString()}\`
    );
  });
  
  // Calculate total
  const totalCents = allPowers.reduce((sum, entry) => {
    return sum + Number(entry[1]);
  }, 0);
  
  const totalUSD = totalCents / 100;
  console.log(\`\\nTotal Value Locked: $\${totalUSD.toLocaleString()}\`);
  console.log(\`Total Participants: \${allPowers.length}\`);
}`}</pre>
        </div>
      </div>
    </section>

    <!-- Error Handling Section -->
    <section id="errors" class="mb-12 bg-[#1a1b1f] rounded-2xl p-8 border border-gray-800">
      <h2 class="text-3xl font-bold text-white mb-6">⚠️ Error Handling</h2>
      
      <div class="mb-6">
        <h3 class="text-xl font-bold text-white mb-4">Common Errors</h3>
        
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-700">
                <th class="text-left py-3 px-4 text-gray-400">Error Message</th>
                <th class="text-left py-3 px-4 text-gray-400">Cause</th>
                <th class="text-left py-3 px-4 text-gray-400">Solution</th>
              </tr>
            </thead>
            <tbody class="text-gray-300">
              <tr class="border-b border-gray-800">
                <td class="py-3 px-4 font-mono text-red-400">"You already have a lock canister"</td>
                <td class="py-3 px-4">Attempting to create second canister</td>
                <td class="py-3 px-4">Use existing canister via get_my_lock_canister()</td>
              </tr>
              <tr class="border-b border-gray-800">
                <td class="py-3 px-4 font-mono text-red-400">"Payment failed: InsufficientAllowance"</td>
                <td class="py-3 px-4">ICP not approved</td>
                <td class="py-3 px-4">Approve 2 ICP before calling create_lock_canister</td>
              </tr>
              <tr class="border-b border-gray-800">
                <td class="py-3 px-4 font-mono text-red-400">"No lock canister found"</td>
                <td class="py-3 px-4">User hasn't created canister</td>
                <td class="py-3 px-4">Call create_lock_canister() first</td>
              </tr>
              <tr class="border-b border-gray-800">
                <td class="py-3 px-4 font-mono text-red-400">"User not found"</td>
                <td class="py-3 px-4">Not registered on KongSwap</td>
                <td class="py-3 px-4">Call complete_my_canister_setup()</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="bg-gray-900/50 rounded-lg p-6">
        <h3 class="text-xl font-bold text-white mb-3">Error Handling Best Practices</h3>
        
        <div class="bg-black/50 rounded-lg p-4">
          <pre class="text-sm text-yellow-400 font-mono overflow-x-auto">{`// Always wrap calls in try-catch and handle Result variants
async function safeGetVotingPower(principal: Principal) {
  try {
    const result = await kongLocker.get_voting_power(principal);
    
    if ('Ok' in result) {
      return { success: true, value: result.Ok };
    } else {
      // Handle specific errors
      if (result.Err.includes("No lock canister")) {
        return { success: false, error: "NOT_FOUND", message: result.Err };
      } else if (result.Err.includes("User not found")) {
        return { success: false, error: "NOT_REGISTERED", message: result.Err };
      } else {
        return { success: false, error: "UNKNOWN", message: result.Err };
      }
    }
  } catch (error) {
    // Network or other errors
    console.error("Call failed:", error);
    return { 
      success: false, 
      error: "NETWORK_ERROR", 
      message: error.message 
    };
  }
}`}</pre>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <div class="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-6 text-center">
      <p class="text-gray-400 mb-2">Kong Locker Interactive API Documentation v2.0</p>
      <p class="text-sm text-gray-500">
        Canister: <code class="bg-black/30 px-2 py-1 rounded">eazgb-giaaa-aaaap-qqc2q-cai</code>
      </p>
      <p class="text-sm text-gray-500 mt-2">
        Need help? Visit <a href="https://kongswap.io" class="text-blue-400 hover:text-blue-300">KongSwap.io</a>
      </p>
    </div>
  </main>
</div>

<style>
  /* Custom scrollbar for code blocks */
  pre::-webkit-scrollbar {
    height: 6px;
  }
  
  pre::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
  }
  
  pre::-webkit-scrollbar-thumb {
    background: rgba(100, 100, 100, 0.5);
    border-radius: 3px;
  }
  
  pre::-webkit-scrollbar-thumb:hover {
    background: rgba(100, 100, 100, 0.7);
  }
  
  /* Smooth transitions */
  * {
    scroll-behavior: smooth;
  }
</style>