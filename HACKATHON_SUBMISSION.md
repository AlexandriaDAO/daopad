# DAOpad

DAOpad turns any ICRC1 token into a legally compliant DAO capable of controlling (1) treasury management, (2) canister maintenance,
and (3) fiat off-ramps via locked liqidity provider voting.

## Core Innovation
DAOpad decentralizes Orbit Station by replacing human admins with a canister controlled by locked-LP token voting. Your token LPs become the collective admin - no single point of failure, no trusted parties. Once set up, every treasury decision, from canister upgrades to fiat withdrawals, require on-chain consensus.

## Key Features
• **Trustless Orbit Admin**: The DAOpad canister becomes the Orbit Station admin, executing decisions only after token holder votes
• **Locked Liquidity Governance**: KongSwap LP tokens grant voting power proportional to permanently locked value
• **DAO-Controlled Banking**: Token votes trigger fiat transfers to the DAO's legal bank account
• **Wyoming DAO LLC**: Full legal entity with EIN, bank accounts, and contract signing authority
• **Universal Compatibility**: Works with any existing ICRC1 token - free for established projects
• **Optional Launchpad**: New projects can fair-launch with 1% fee, existing tokens integrate at no cost

## Architecture

### Technical Stack
```
Token Holders (ICRC1)
    ↓ votes
DAOpad Backend Canister (Admin)
    ↓ executes
Orbit Station (Treasury & Operations)
    ↓ manages
- IC Canisters (dApps, smart contracts)
- Fiat Bank Accounts (via Wyoming LLC)
- Legal Contracts & Property
```

### Core Components
- **DAOpad Backend**: Rust canister that aggregates votes and executes Orbit admin operations
- **Orbit Station**: Manages treasury, canisters, and multi-sig operations
- **KongSwap Integration**: Reads locked LP positions for voting weight calculation
- **Legal Bridge**: Wyoming registered agent handles LLC formation and banking

### Security Model
- No single admin can compromise the DAO
- All operations require on-chain token holder consensus
- Orbit Station provides additional multi-sig security layer
- Legal entity bound by on-chain governance rules

## Roadmap & Milestones

### Phase 1: Foundation (Completed)
✓ Orbit Station integration
✓ ICRC1 token support
✓ Basic voting mechanism
✓ Alexandria DAO pilot implementation
✓ Locked-LP voting periods

### Phase 2: Governance
- Proposal creation interface
- Customizable DAO rules
- Delegation mechanisms
- Emergency pause functionality
- Blackholed LP Locking Canister

### Phase 3: Banking Bridge
- Wyoming LLC automation
- Bank API integration
- KYC/AML compliance layer
- Fiat transfer execution

## Use Cases

**DeFi Protocols**: Manage protocol treasury with community oversight and pay real-world expenses
**Gaming DAOs**: Own game IP, hire developers, distribute revenues to LP token holders
**Investment Clubs**: Legally compliant venture investing with based on collective decision making of LPs
**Coffee Shop**: IRL Buisiness where the DAO owns property/equiptment and manages payroll

## Technical Implementation

### Smart Contract Methods
```rust
// Core governance functions
register_as_orbit_operator() -> Creates Orbit user
create_proposal(operation: OrbitOperation) -> Proposal
vote_on_proposal(proposal_id: String, vote: bool)
execute_proposal(proposal_id: String) -> Executes if passed

// Treasury operations
transfer_icp(amount: u64, recipient: Principal)
upgrade_canister(canister_id: Principal, wasm: Vec<u8>)
initiate_fiat_transfer(amount: USD, bank_details: String)
```

### Voting Mechanism
- Voting power = Locked LP token value in KongSwap
- Proposals require quorum (configurable, default 20%)
- Time-locked voting periods (default 48 hours)
- Executed automatically when passed

## Differentiators

| Feature | Traditional DAO | DAOpad |
|---------|----------------|---------|
| Admin Control | Human multi-sig | Autonomous canister |
| Legal Status | Unclear | Wyoming LLC |
| Banking | No | Yes, DAO-controlled |
| Token Support | Platform-specific | Any ICRC1 |
| Setup Cost | High + lawyers | 1% or free |
| Fiat Operations | Through trustees | Direct control |

## Team & Development

Built during IC Hackathon leveraging:
- Orbit's battle-tested treasury infrastructure
- KongSwap's liquidity mechanisms  
- Internet Computer's canister architecture
- Wyoming's DAO-friendly legal framework

## Demo & Testing

**Mainnet Deployment**: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/ (will launch under DAOPad.org)
**Mainnet Launchpad V0.1**: https://lbry.fun
**Parent Project and First Live DAO** https://lbry.app

**Github/Documentation**: 
- [DAOPad](https://github.com/AlexandriaDAO/daopad)
- [Lbry.fun Launchpad](https://github.com/AlexandriaDAO/lbry.fun)
- [Core App](https://github.com/AlexandriaDAO/core)

## Impact

The #1 use case for blockchain today, as proven by BTC dominance, is as money itself. The rest of crypto could be characterized as a zero-sum game, just shuffling money around the sale of digital experiences, with no gateway to the 'real' world.

DAOpad eliminates the gap between on-chain initiatives and real-world operations. For the first time, token holders can directly control bank accounts, sign contracts, and operate legal entities without intermediaries. This isn't just another DAO tool - it's the bridge that gives blockchain organizations the tools of traditional corporations.