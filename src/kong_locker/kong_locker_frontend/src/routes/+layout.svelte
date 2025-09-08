<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  
  // Initialize any global state or services here
  onMount(() => {
    console.log('Kong Locker Frontend initialized');
  });
</script>

<main class="min-h-screen bg-gradient-page">
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <slot />
  </div>
</main>