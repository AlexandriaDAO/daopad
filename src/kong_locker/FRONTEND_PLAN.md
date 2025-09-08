# Kong Locker Frontend Plan

## Core Value Proposition

**One Sentence**: Transform your KongSwap LP tokens into permanent voting power for DAOs.

**Expanded**: Kong Locker lets you permanently lock your liquidity pool tokens from KongSwap in exchange for verifiable on-chain proof of commitment. This locked liquidity becomes your voting weight in DAOPad and any other DAO that values long-term commitment over short-term speculation.

## User Journey Overview

```
1. Connect Wallet → 2. Pay 5 ICP → 3. Get Lock Address → 4. Send LP Tokens → 5. Use in DAOs
```

## Page Structure & Flow

### 1. Landing Page (Not Connected)

**Hero Section**
- Headline: "Make Your Locked Liquidity Powerful"
- Subheading: "Permanently lock KongSwap LP tokens to gain voting power in DAOs"
- CTA: "Connect Wallet to Start"

**Three Value Props** (with icons)
1. **Permanent Commitment**: Lock forever, vote forever
2. **Verifiable On-Chain**: Transparent, auditable, trustless
3. **Universal API**: Use your locked liquidity across multiple DAOs

**How It Works** (4 steps with visuals)
1. Create your personal lock canister (5 ICP one-time fee)
2. Get your unique lock address
3. Send LP tokens from KongSwap
4. Use your voting power in DAOPad and other DAOs

**Security Section**
- "Why is it safe?"
  • Each lock canister is created exclusively for you
  • Payment is atomic - you can't pay without getting your canister
  • Your canister address is saved immediately and permanently
  • Once blackholed, NO ONE (not even us) can modify or access it
  • Tokens can NEVER be retrieved by anyone
- Link to smart contract code

### 2. Main App (Connected Wallet)

#### State A: No Lock Canister Yet

**Status Card**
```
┌─────────────────────────────────┐
│ Your Lock Canister Status       │
│ ────────────────────────        │
│ Status: Not Created              │
│                                  │
│ [Create Lock Canister - 5 ICP]  │
│                                  │
│ ℹ️ One-time fee to create your   │
│    personal lock address         │
└─────────────────────────────────┘
```

**Info Panel**
- What you're creating and why
- The 5 ICP covers: canister creation, permanent operation, KongSwap registration
- This is a one-time payment, no recurring fees

#### State B: Creating (After Payment)

**Status Card**
```
┌─────────────────────────────────┐
│ Creating Your Lock Canister...  │
│ ────────────────────────        │
│ ✅ Payment received              │
│ ✅ Canister created              │
│ ✅ Code installed                │
│ ✅ Address saved                 │
│ ⏳ Funding with ICP...           │
│ ⏳ Registering with KongSwap...  │
│ ⏳ Blackholing canister...       │
│                                  │
│ If any step shows ⚠️, you can    │
│ complete setup later             │
└─────────────────────────────────┘
```

#### State C: Lock Canister Ready

**Main Dashboard**
```
┌─────────────────────────────────┐
│ Your Lock Canister              │
│ ────────────────────────        │
│ Status: 🔒 Permanently Blackholed ✓│
│ Address: xxxxx-xxxxx-xxxxx      │
│ [Copy Address] [View Details]   │
│                                  │
│ Voting Power: 0                 │
│ (No LP tokens locked yet)       │
└─────────────────────────────────┘
```

**Details Modal (when clicking View Details):**
```
┌─────────────────────────────────┐
│ Lock Canister Security Details  │
│ ────────────────────────        │
│ ✅ Blackholed                   │
│    No controllers - permanent   │
│                                  │
│ ✅ Cycles: 792,000,000,000      │
│    Sufficient for ~3 years      │
│                                  │
│ ✅ Memory: 2.1 MB / 4 GB        │
│    Operating normally           │
│                                  │
│ Module Hash:                    │
│ 0x3f2a...9b1c                   │
│                                  │
│ This canister is autonomous     │
│ and cannot be modified.         │
│                                  │
│ [Close]                         │
└─────────────────────────────────┘
```

**Action Section**
```
┌─────────────────────────────────┐
│ Lock Your LP Tokens             │
│ ────────────────────────        │
│ 1. Go to KongSwap               │
│ 2. Find your LP positions       │
│ 3. Send to your lock address    │
│                                  │
│ [Open KongSwap] [Show Guide]    │
└─────────────────────────────────┘
```

#### State D: Has Locked Liquidity

**Dashboard**
```
┌─────────────────────────────────┐
│ Your Locked Liquidity           │
│ ────────────────────────        │
│ Lock Address: xxxxx-xxxxx       │
│                                  │
│ Total Voting Power: 1,234       │
│ ────────────────────────        │
│ Locked Positions:               │
│ • ICP/ckUSDT: $500              │
│ • ICP/KONG: $300                │
│                                  │
│ [Use in DAOPad] [Lock More]     │
└─────────────────────────────────┘
```

### 3. Error Recovery (Hidden Unless Needed)

**Only shown if silent health check detects incomplete setup:**

```
┌─────────────────────────────────┐
│ ⚠️ Setup Incomplete              │
│ ────────────────────────        │
│ Your lock canister needs final  │
│ setup steps completed.          │
│                                  │
│ [Complete Setup]                │
│                                  │
│ This is safe and won't affect   │
│ any existing locks.             │
└─────────────────────────────────┘
```

**Note**: KongSwap registration must be complete before sending LP tokens.
If not registered, KongSwap will automatically block transfers.

## Backend Function Mapping

### Primary User Flow Functions

1. **`create_lock_canister()`**
   - Triggered by: "Create Lock Canister" button
   - Pre-check: User has approved 5 ICP and doesn't already have a canister
   - Success: Store canister ID, move to State C
   - Failure: Check error type, possibly show recovery option
   - Error: "You already have a lock canister" → Show existing canister instead
   - Error: "Payment failed: InsufficientAllowance" → "Please approve 5 ICP first"

2. **`get_my_lock_canister()`**
   - Called on: Every page load when connected
   - Determines: Which state to show (A, C, or D)
   - If returns canister: Hide create button, show canister status
   - If returns none: Show create flow

3. **`get_detailed_canister_status()`** ✨ NEW
   - Called when: User clicks "View Details" (not on every page load - it's an update call)
   - Shows: Blackhole status, cycle balance (in details only), memory usage
   - Updates: Security badge confirmation
   - Cache: Results for 5 minutes to avoid excessive cycles

4. **`get_voting_power()`**
   - Called when: User has a lock canister
   - Updates: Voting power display
   - Frequency: On page load and after "Refresh" button

### Hidden Recovery Functions

5. **`complete_my_canister_setup()`**
   - Called silently: On page load if user has canister (background health check)
   - Only shown if: Returns actions taken (not "already configured")
   - UI: Small info banner with "Complete Setup" button
   - Never shown in normal flow
   - Prevents users from trying to send LP tokens before KongSwap registration

### Admin/Advanced Functions

6. **`get_all_lock_canisters()`**
   - Not shown to regular users
   - Could be on separate admin/stats page

## Key UX Decisions

### 1. Hide Complexity
- Users should NEVER see recovery functions unless needed
- Error states should be rare and handled gracefully
- Technical details hidden behind "Learn More" expandables

### 2. Clear Principal/Address Display
```
Your Lock Address: xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
[Copy Full Address] [QR Code] [View on IC Explorer]

⚠️ IMPORTANT: Only send LP tokens from KongSwap to this address
```

### 3. Status Feedback
- Creating: Show progress steps with spinners
- Ready: Big green checkmark
- Has Liquidity: Show amount and "Active" badge

### 4. KongSwap Integration Guide
- Screenshot showing where to find LP tokens
- Screenshot showing transfer interface
- Clear warning: "This is permanent - tokens cannot be recovered"

## Copy & Messaging Strategy

### Primary Messages
1. **Security**: "Your lock canister is blackholed - no one can ever retrieve the tokens"
2. **Purpose**: "Transform liquidity into governance power"
3. **Permanence**: "This is a one-way operation - lock with conviction"
4. **Value**: "Your commitment is rewarded with voting power"

### Warning Messages
- Before payment: "This costs 5 ICP and creates a permanent lock address"
- Before locking: "Once sent, LP tokens can NEVER be retrieved"
- After locking: "Your liquidity is now permanently locked and earning voting power"

## API & Integration Messaging

**For Developers Section** (separate page/modal)
```
Kong Locker provides a public API for any DAO to verify locked liquidity:

- get_voting_power(user): Get user's locked liquidity value
- get_all_lock_canisters(): List all lock addresses
- Fully on-chain, verifiable, and transparent

Integrate with Kong Locker to:
• Reward long-term supporters
• Prevent governance attacks
• Build commitment-based DAOs
```

## Technical Implementation Notes

### State Management
```typescript
interface UserState {
  wallet: ConnectedWallet | null;
  lockCanister: Principal | null;
  votingPower: bigint;  // Note: Backend returns cents, divide by 100 for display
  creationStatus: 'no-canister' | 'creating' | 'has-canister' | 'has-canister-needs-setup';
  setupComplete: boolean;
}
```

### Function Calls Flow
```typescript
// On page load
1. checkConnection()
2. if (connected) -> get_my_lock_canister()
3. if (hasCanister) {
   - get_voting_power()
   - complete_my_canister_setup() // Silent health check
   - if (health check returns actions) -> show subtle "Complete Setup"
}
4. if (no canister) -> show create flow

// On create button
1. Check get_my_lock_canister() again (prevent double creation)
2. approve 5 ICP (wallet interaction)
3. create_lock_canister()
4. if (success) -> store principal, update UI
5. if (error: "already have canister") -> refresh and show existing

// On View Details click
1. get_detailed_canister_status() // Only called on demand
2. Cache result for 5 minutes
```

## 🚨 EXISTING CODE MIGRATION INSTRUCTIONS

### What Currently Exists (ALREADY CLEANED UP)
The frontend has been simplified to these core working components that MUST be preserved:
1. **Authentication system** (`src/lib/stores/auth.ts`, `src/lib/components/UserInfo.svelte`)
2. **LP Locking service** (`src/lib/services/lpLocking.ts`)
3. **Statistics display** (lines 119-193 in `+page.svelte` - simplified version)
4. **Styling system** (`app.css` with Kong theme variables`)
5. **Simple hero with connect button** (lines 60-118 in `+page.svelte`)

Note: Redundant content has been removed. The page now only shows:
- Kong Locker branding and tagline
- Connect wallet button
- Statistics dashboard
- User info panel (when authenticated)

### Step-by-Step Migration Instructions

#### STEP 1: Extract Existing Components (DO NOT DELETE ORIGINALS YET)
```bash
# Create new component files:
src/lib/components/StatsPanel.svelte  # Extract lines 119-193 from +page.svelte (stats section)
src/lib/components/HeroSection.svelte # Extract lines 60-118 from +page.svelte (simplified hero)
# Note: HowItWorks.svelte not needed - redundant content already removed
```

#### STEP 2: Refactor +page.svelte to State Machine
Replace the entire `+page.svelte` with a new state-based implementation:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore, isAuthenticated } from '$lib/stores/auth';
  import { userLockStore } from '$lib/stores/userLock'; // NEW STORE
  import StateA_NoCanister from '$lib/components/states/StateA_NoCanister.svelte';
  import StateB_Creating from '$lib/components/states/StateB_Creating.svelte';
  import StateC_Ready from '$lib/components/states/StateC_Ready.svelte';
  import StateD_HasLiquidity from '$lib/components/states/StateD_HasLiquidity.svelte';
  import StatsPanel from '$lib/components/StatsPanel.svelte';
  
  // Determine current state based on stores
  $: currentState = determineState($authStore, $userLockStore);
  
  function determineState(auth, lock) {
    if (!auth.isAuthenticated) return 'not-connected';
    if (!lock.canisterId) return 'no-canister';
    if (lock.isCreating) return 'creating';
    if (lock.votingPower > 0) return 'has-liquidity';
    return 'ready';
  }
</script>

<!-- Keep stats always visible at top -->
<StatsPanel />

<!-- State-based content -->
{#if currentState === 'not-connected'}
  <StateA_NoCanister />
{:else if currentState === 'no-canister'}
  <StateA_NoCanister authenticated={true} />
{:else if currentState === 'creating'}
  <StateB_Creating />
{:else if currentState === 'ready'}
  <StateC_Ready />
{:else if currentState === 'has-liquidity'}
  <StateD_HasLiquidity />
{/if}
```

#### STEP 3: Create New Store for User Lock State
Create `src/lib/stores/userLock.ts`:
```typescript
import { writable, derived } from 'svelte/store';
import { lpLockingService } from '$lib/services/lpLocking';

interface UserLockState {
  canisterId: Principal | null;
  votingPower: number;
  isCreating: boolean;
  creationStep: string;
  error: string | null;
}

export const userLockStore = writable<UserLockState>({
  canisterId: null,
  votingPower: 0,
  isCreating: false,
  creationStep: '',
  error: null
});
```

#### STEP 4: Update Existing Services (ADD, don't replace)
In `src/lib/services/lpLocking.ts`, ADD these methods:
```typescript
// ADD to existing LPLockingService class:
async createLockCanister(): Promise<Principal> {
  // Implementation here
}

async getDetailedCanisterStatus(canisterId: Principal): Promise<any> {
  // Implementation here
}

async completeMyCanisterSetup(): Promise<any> {
  // Implementation here
}
```

#### STEP 5: Handle Existing Stats
The existing stats implementation in `lpLocking.ts` (lines 24-98) should be:
1. **KEPT AS-IS** for the global stats functionality
2. **IMPORTED** into the new `StatsPanel.svelte` component
3. **ENHANCED** with user-specific stats when authenticated

#### STEP 6: Clean Up After Verification
ONLY after verifying the new implementation works:
1. Remove old hero section from original file (already simplified)
2. ~~Remove old "How It Works" section~~ (already removed)
3. ~~Keep the footer as-is~~ (already removed)

### Critical Preservation Rules
1. **DO NOT DELETE** `auth.ts` - it's working and needed
2. **DO NOT DELETE** `UserInfo.svelte` - integrate it into State C/D
3. **DO NOT MODIFY** the existing service methods in `lpLocking.ts` - only ADD new ones
4. **KEEP** all styling from `app.css` - it defines the Kong theme

### Testing Checklist Before Removing Old Code
- [ ] Authentication still works
- [ ] Stats load and refresh correctly
- [ ] User info displays when authenticated
- [ ] All states render properly
- [ ] No console errors
- [ ] Theme/styling intact

## Success Metrics

1. **Time to First Lock**: How quickly users go from landing to locked LP
2. **Error Recovery Rate**: % of users who successfully use recovery functions
3. **Drop-off Points**: Where users abandon the process
4. **Support Tickets**: Minimize "stuck payment" issues

## Future Enhancements (Not MVP)

1. **Lock Statistics**: Total value locked, number of lockers, top positions
2. **Multi-Pool View**: Show all LP positions from KongSwap
3. **Integration Gallery**: Show all DAOs using Kong Locker
4. **Lock NFTs**: Visual representation of locked positions

## Questions for Refinement

1. Should we show USD value of locked positions?
2. Do we need a "Learn More" section about KongSwap LP tokens?
3. Should there be a confirmation modal before the 5 ICP payment?
4. How do we handle users who already have a lock canister from old system?
5. Should we show a preview of what voting power they'll get before locking?

---

## Next Steps

1. Review and refine this plan together
2. Create TypeScript interfaces matching backend
3. Design component hierarchy
4. Implement state management (Redux/Zustand)
5. Build UI components following style guide
6. Integrate with IC agent-js