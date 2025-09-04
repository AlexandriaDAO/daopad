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
- Explain blackholed canisters (no admin, no backdoors)
- Link to smart contract code
- "Once locked, tokens can NEVER be retrieved by anyone"

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
│ ⏳ Setting up canister...        │
│ ⏳ Installing code...            │
│ ⏳ Registering with KongSwap...  │
│ ⏳ Blackholing canister...       │
│                                  │
│ This may take 10-30 seconds     │
└─────────────────────────────────┘
```

#### State C: Lock Canister Ready

**Main Dashboard**
```
┌─────────────────────────────────┐
│ Your Lock Canister              │
│ ────────────────────────        │
│ Status: ✅ Ready                 │
│ Address: xxxxx-xxxxx-xxxxx      │
│ [Copy Address] [View on IC]     │
│                                  │
│ Voting Power: 0                 │
│ (No LP tokens locked yet)       │
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

**Only shown if backend returns specific errors:**

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

## Backend Function Mapping

### Primary User Flow Functions

1. **`create_lock_canister()`**
   - Triggered by: "Create Lock Canister" button
   - Pre-check: User has approved 5 ICP
   - Success: Store canister ID, move to State C
   - Failure: Check error type, possibly show recovery option

2. **`get_my_lock_canister()`**
   - Called on: Every page load when connected
   - Determines: Which state to show (A, C, or D)

3. **`get_voting_power()`**
   - Called when: User has a lock canister
   - Updates: Voting power display
   - Frequency: On page load and after "Refresh" button

### Hidden Recovery Functions

4. **`complete_my_canister_setup()`**
   - Only shown if: create_lock_canister returns specific errors
   - Or if: get_my_lock_canister returns canister but operations fail
   - UI: Small warning banner with "Complete Setup" button
   - Never shown in normal flow

5. **`get_my_canister_status()`**
   - Called silently in background
   - If any status is false, may trigger recovery UI
   - User doesn't see this directly

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
  votingPower: bigint;
  creationStatus: 'none' | 'creating' | 'created' | 'error';
  errorType?: 'needs-completion' | 'payment-failed' | 'unknown';
}
```

### Function Calls Flow
```typescript
// On page load
1. checkConnection()
2. if (connected) -> get_my_lock_canister()
3. if (hasCanister) -> get_voting_power()
4. if (error) -> determine if recovery needed

// On create button
1. approve 5 ICP (wallet interaction)
2. create_lock_canister()
3. if (success) -> store principal, update UI
4. if (error && recoverable) -> show complete_my_canister_setup option
```

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