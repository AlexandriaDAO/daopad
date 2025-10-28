# Traditional LLC Implementation Plan

## Executive Summary
Enable traditional LLC governance alongside existing DAO (Kong Locker) governance. LLC stations use equity-based voting where members hold percentage ownership tracked by our backend, rather than token-based voting power. Members can acquire equity by accepting offers approved by existing equity holders (75% threshold), with payment in ckUSDC going directly to the Orbit Station treasury.

**Key Innovation**: Reuse existing TOKEN_ORBIT_STATIONS mapping by using UUID-generated Principals for LLCs (not real token canisters). Type detection via LLC_CONFIGS lookup. No UI separation needed - same proposal/voting flow with different VP source.

## Architecture
- **Backend**: Equity tracking + whitelist management + LLC ID generation
- **Admin**: Equity-based voting (reuses existing vote infrastructure)
- **Orbit Station**: Treasury + execution (unchanged)

### Key Design: Unified Station Registry
- **Reuse TOKEN_ORBIT_STATIONS** for both DAO and LLC stations
- **LLC IDs**: Random UUID Principals (not real token canisters)
- **DAO IDs**: Real token canister Principals
- **Type detection**: Check if Principal exists in LLC_CONFIGS
- **Benefits**: No UI separation needed, same data flow for both types

## Storage Structures

### Backend (Stable Memory - New)
```rust
// Memory IDs: 5, 6, 7, 8
LLC_CONFIGS: StableBTreeMap<StorablePrincipal, LLCConfig>  // llc_id → config
LLC_EQUITY_HOLDERS: StableBTreeMap<EquityHolderKey, u32>  // (llc_id, holder) → basis points
LLC_WHITELIST: StableBTreeMap<StorablePrincipal, ()>  // Authorized creators
LLC_NAME_TO_ID: StableBTreeMap<String, StorablePrincipal>  // Enforce unique names

// Note: LLC stations ALSO stored in TOKEN_ORBIT_STATIONS (llc_id → station_id)
// Note: Reverse mapping in STATION_TO_TOKEN works the same (station_id → llc_id)

struct LLCConfig {
    llc_id: Principal,        // UUID-based identifier (stable, unchanging)
    name: String,             // Mutable LLC name (for display)
    station_id: Principal,    // Linked Orbit Station
    creator: Principal,
    created_at: u64,
}

struct EquityHolderKey {
    llc_id: Principal,
    holder: Principal,
}

impl Storable for EquityHolderKey {
    // Encode as: llc_id bytes + holder bytes
}
```

### Backend (Stable Memory - Existing, Reused)
```rust
// These existing mappings handle BOTH DAO and LLC stations
TOKEN_ORBIT_STATIONS: StableBTreeMap<StorablePrincipal, StorablePrincipal>
  // For DAO: token_id → station_id
  // For LLC: llc_id → station_id

STATION_TO_TOKEN: StableBTreeMap<StorablePrincipal, StorablePrincipal>
  // For DAO: station_id → token_id
  // For LLC: station_id → llc_id
```

### Admin (Stable Memory - New)
```rust
// Memory IDs: TBD (check admin/src/storage/memory.rs)
LLC_EQUITY_OFFERS: StableBTreeMap<String, EquityOffer>
LLC_OFFER_VOTES: StableBTreeMap<(String, StorablePrincipal), VoteChoice>

struct EquityOffer {
    offer_id: String,
    station_id: Principal,
    offeree: Principal,
    equity_basis_points: u32,  // e.g., 1000 = 10%
    ckusdc_amount: u64,
    proposer: Principal,
    status: OfferStatus,
    created_at: u64,
    expires_at: u64,
    yes_votes_bp: u32,  // Total basis points voting yes
    no_votes_bp: u32,
}

enum OfferStatus { Proposed, Approved, Executed, Expired }
```

## Backend Methods

### Whitelist Management
- `add_to_llc_whitelist(principal)` - Admin-only (caller check)
- `remove_from_llc_whitelist(principal)` - Admin-only
- `is_whitelisted(principal)` → bool - Query
- `list_whitelisted()` → Vec<Principal> - Query

### Station Linking
- `create_llc_station(name: String, station_id: Principal)` → Principal
  - Check: Caller is whitelisted
  - Check: Name is unique (LLC_NAME_TO_ID doesn't contain name)
  - Check: Station not already linked (TOKEN_ORBIT_STATIONS + STATION_TO_TOKEN)
  - Check: Backend is admin of station (reuse verify_backend_is_admin)
  - Generate: llc_id = random UUID Principal
  - Store: LLC_CONFIGS[llc_id] = LLCConfig {...}
  - Store: LLC_NAME_TO_ID[name] = llc_id
  - Store: TOKEN_ORBIT_STATIONS[llc_id] = station_id
  - Store: STATION_TO_TOKEN[station_id] = llc_id
  - Store: LLC_EQUITY_HOLDERS[(llc_id, creator)] = 10000 (100%)
  - Return: llc_id

- `update_llc_name(llc_id: Principal, new_name: String)`
  - Check: Caller is creator or has majority equity
  - Check: New name is unique
  - Update: LLC_CONFIGS[llc_id].name = new_name
  - Update: LLC_NAME_TO_ID mappings (remove old, add new)

### Equity Queries
- `get_llc_equity(llc_id, holder)` → u32 - Query basis points
- `get_llc_equity_holders(llc_id)` → Vec<(Principal, u32)> - Query all holders
- `get_llc_config(llc_id)` → LLCConfig - Query config
- `get_llc_by_name(name)` → Option<LLCConfig> - Query by name
- `is_llc_station(id)` → bool - Check if ID is LLC (not DAO token)

### Equity Offers
- `create_equity_offer(llc_id, offeree, equity_bp, ckusdc_amount)`
  - Check: Caller has ≥ 10% equity (1000 bp)
  - Check: Equity offer ≥ 1% (100 bp minimum)
  - Check: Equity offer won't exceed caller's current equity
  - Generate: offer_id (UUID string)
  - Call: admin.create_equity_offer_proposal(offer)
  - Return: offer_id

- `execute_equity_offer(offer_id)`
  - Check: Offer status = Approved
  - Check: Caller = offeree
  - Note: Payment verified manually (MVP - offeree sends ckUSDC, then calls this)
  - Calculate: Dilute all existing holders proportionally
  - Store: New holder equity (or add to existing if already holder)
  - Update: Offer status → Executed
  - Call: admin.mark_offer_executed(offer_id)

## Admin Methods

### Equity Offer Proposals
- `create_equity_offer_proposal(offer)` - Backend-only caller check
  - Store: LLC_EQUITY_OFFERS[offer_id] = offer
  - Set: expires_at = now + 7 days

- `vote_on_equity_offer(offer_id, approve)`
  - Query: Backend for caller's equity percentage
  - Store: Vote with equity basis points
  - Calculate: Total yes/no votes (in basis points)
  - Check: 75% threshold (7500 bp of total equity)
  - If passed: Update offer status → Approved

- `get_equity_offer(offer_id)` → EquityOffer - Query
- `list_equity_offers(station_id)` → Vec<EquityOffer> - Query active offers

### Integration with Existing Voting
- `get_user_voting_power_for_token(id, user)` - id can be token_id OR llc_id
  - Query: backend.is_llc_station(id)
  - If DAO (false): Query Kong Locker VP (existing logic)
  - If LLC (true): Query backend.get_llc_equity(id, user) → basis points
  - Return: VP (for LLC, convert bp to VP: bp * 100 for display consistency)

### Type Detection Logic
```rust
// In admin canister when calculating voting power
let is_llc = backend.is_llc_station(id).await?;

if is_llc {
    // LLC equity-based voting
    let equity_bp = backend.get_llc_equity(id, user).await?;
    let vp = (equity_bp as u64) * 100; // Convert bp to VP for consistency
    return Ok(vp);
} else {
    // DAO Kong Locker voting (existing logic)
    return get_kong_locker_vp(id, user).await;
}
```

## Equity Dilution Math

### Example: Selling 20% to new member
```rust
// Before: Creator = 10000 bp (100%)
// Offer: 2000 bp (20%) to Alice

// After execution:
// Creator = 10000 * (10000 - 2000) / 10000 = 8000 bp (80%)
// Alice = 2000 bp (20%)

// General formula for dilution:
for holder in existing_holders {
    new_equity = current_equity * (10000 - offered_equity) / 10000
}
```

### Code Pattern
```rust
let offered_bp = offer.equity_basis_points;
let holders = get_all_holders(station_id);

for (holder, current_bp) in holders {
    let diluted_bp = (current_bp as u64 * (10000 - offered_bp as u64)) / 10000;
    LLC_EQUITY_HOLDERS.insert((station_id, holder), diluted_bp as u32);
}

// Add new holder
LLC_EQUITY_HOLDERS.insert((station_id, offeree), offered_bp);
```

## Key Flows

### 1. Create LLC Station
```
Whitelisted User → create_llc_station("Acme Corp", station_id)
  ↓
Backend → validates whitelist, name uniqueness, station admin
  ↓
Backend → generates llc_id (UUID Principal)
  ↓
Backend → stores in TOKEN_ORBIT_STATIONS + LLC_CONFIGS + LLC_NAME_TO_ID
  ↓
Backend → allocates 100% equity (10000 bp) to creator
  ↓
Returns llc_id to user
```

### 2. Equity Offer Lifecycle
```
Member (10%+) → create_equity_offer(llc_id, alice, 2000bp, 1000ckUSDC)
  ↓
Backend → validates (10% min, 1% offer min, within proposer equity)
  ↓
Backend → generates offer_id, calls admin.create_equity_offer_proposal()
  ↓
Admin → stores proposal, expires in 7 days
  ↓
Equity Holders → vote_on_equity_offer(offer_id, true/false)
  ↓
Admin → queries backend for each voter's equity, tallies votes in bp
  ↓
Admin → checks 75% threshold (7500 bp of total 10000 bp)
  ↓
Offer status → Approved
  ↓
Alice → manually sends 1000 ckUSDC to Orbit Station treasury
  ↓
Alice → execute_equity_offer(offer_id)
  ↓
Backend → validates approved status, dilutes all holders proportionally
  ↓
Backend → adds Alice with 2000 bp (or increases if already holder)
  ↓
Backend → marks offer as Executed
```

### 3. Regular Operations (Treasury/User Mgmt)
```
LLC Member → create_orbit_request_with_proposal(llc_id, operation)
  ↓
Backend → creates Orbit request (reuses existing DAO logic)
  ↓
Backend → calls admin.create_proposal() (reuses existing DAO logic)
  ↓
Admin → creates proposal (same structure as DAO proposals)
  ↓
Members → vote_on_proposal(llc_id, request_id, vote)
  ↓
Admin → get_user_voting_power_for_token(llc_id, voter)
  ↓ (NEW TYPE DETECTION LOGIC)
Admin → backend.is_llc_station(llc_id) → true
  ↓
Admin → backend.get_llc_equity(llc_id, voter) → equity_bp
  ↓
Admin → converts bp to VP (bp * 100), tallies votes
  ↓
75% threshold reached → admin.submit_request_approval(Approved)
  ↓
Orbit Station executes operation (same as DAO)
```

## Frontend Changes

### Station Detail Page
- Badge: "DAO" vs "LLC" governance type
- LLC section: "Equity Holders" table (Principal, Percentage)
- LLC section: "Create Equity Offer" button (if 10%+ equity)
- LLC section: "Active Equity Offers" list

### Equity Offer UI
- Form: Offeree principal, equity %, ckUSDC amount
- Vote buttons: Yes/No with equity weight displayed
- Offer status: Proposed/Approved/Executed/Expired
- Payment instructions: "Send X ckUSDC to station treasury, then execute"

### Voting UI (Existing)
- Display equity % instead of VP for LLC stations
- Same vote interface, different power source

## Edge Cases & Validation

### LLC Station Creation
- ✅ Only whitelisted principals can create
- ✅ LLC name must be globally unique (check LLC_NAME_TO_ID)
- ✅ Backend must be admin of Orbit Station before linking
- ✅ Station can't already be linked (check both TOKEN_ORBIT_STATIONS and STATION_TO_TOKEN)
- ✅ Generate random UUID Principal for llc_id
- ✅ Allocate 100% equity (10000 bp) to creator

### Equity Offer Creation
- ✅ Proposer has ≥ 10% equity (1000 bp)
- ✅ Offered equity ≥ 1% (100 bp minimum) to prevent dust
- ✅ Offered equity ≤ proposer's current equity
- ✅ Offer expires after 7 days if not executed or approved
- ✅ No cancellation - must wait for expiry

### Offer Execution
- ✅ Only offeree can execute
- ✅ Offer must be "Approved" status (75% equity voted yes)
- ✅ Payment verification: Manual trigger (MVP) - trust offeree paid
- ✅ Dilution math: Use u64 for intermediate calculations, cast to u32 for storage
- ✅ Handle case where offeree already has equity (add to existing)

### Voting on Equity Offers
- ✅ 75% threshold of **total equity** (7500 bp out of 10000 bp)
- ✅ One vote per holder per offer
- ✅ Can't vote if no equity in that LLC
- ✅ Vote weight = equity basis points

### Regular Operations (Treasury/User Management)
- ✅ Same proposal flow as DAO stations
- ✅ Voting power from equity (backend.get_llc_equity) not Kong Locker
- ✅ Type detection via backend.is_llc_station()
- ✅ Operation-specific thresholds same as DAO (30%-90% depending on risk)

## Testing Checklist

### Backend Tests
- [ ] Whitelist management (add/remove/check)
- [ ] Link LLC station (whitelist check, admin verification)
- [ ] Equity queries (get_llc_equity, get_holders)
- [ ] Create offer (10% minimum, validation)
- [ ] Execute offer (dilution math verification)

### Admin Tests
- [ ] Create equity offer proposal
- [ ] Vote on equity offer (equity-weighted)
- [ ] 75% threshold calculation
- [ ] Offer expiry (7 days)
- [ ] Integration: get_user_voting_power routes to backend for LLC

### Integration Tests
- [ ] Full flow: whitelist → link → offer → vote → execute
- [ ] Dilution math: multiple holders, multiple offers
- [ ] Regular operations with equity voting (transfer, add user)
- [ ] Mixed scenario: Some DAO stations, some LLC stations

### Mainnet Testing
- [ ] Use test station `fec7w-zyaaa-aaaaa-qaffq-cai`
- [ ] Whitelist test identity
- [ ] Link as LLC station
- [ ] Create equity offer (20% for 1000 ckUSDC)
- [ ] Vote with multiple accounts (simulate equity holders)
- [ ] Execute offer, verify dilution
- [ ] Test treasury transfer with equity voting

## Implementation Order

1. **Backend storage** (memory.rs, state.rs, types/storage.rs)
2. **Backend whitelist** (api/llc_whitelist.rs)
3. **Backend station linking** (api/llc_stations.rs)
4. **Backend equity tracking** (api/llc_equity.rs)
5. **Admin storage** (storage/memory.rs, storage/state.rs, proposals/llc_types.rs)
6. **Admin equity offers** (proposals/llc_equity_offers.rs)
7. **Integration**: get_user_voting_power routing (admin/src/kong_locker/voting.rs)
8. **Backend execute offer** (api/llc_equity.rs - execute_equity_offer)
9. **Candid updates** (both .did files)
10. **Deploy & test**
11. **Frontend** (separate PR after backend stable)

## Design Decisions (Finalized)

### 1. Payment Verification
- ✅ **MVP**: Manual trigger - offeree sends ckUSDC manually, then calls execute_equity_offer()
- No automatic payment detection in v1
- Future enhancement: Automated listener checking station treasury balance changes

### 2. Offer Cancellation
- ✅ **No cancellation mechanism** - offers auto-expire after 7 days
- Keeps implementation simple
- Prevents proposer from backing out after favorable votes
- If offer needs to change, create new offer after expiry

### 3. Minimum Equity Per Holder
- ✅ **100 bp (1%) minimum** per equity offer
- Prevents dust accounts and spam offers
- Keeps equity holder count manageable
- Reasonable threshold for meaningful participation

### 4. Creator Minimum Equity
- ✅ **No minimum required** - creator can sell 100% equity and exit
- Standard LLC behavior - full ownership transferability
- Allows complete exit scenarios
- LLC governance continues with remaining equity holders

### 5. Station Type Detection
- ✅ **Reuse TOKEN_ORBIT_STATIONS** for both DAO and LLC
- LLC IDs are UUID-generated Principals (not real token canisters)
- Type detection: `LLC_CONFIGS.contains_key(id)` → is LLC, else DAO
- Clean architecture: No UI separation needed, unified data flow
- LLC names stored separately in LLC_CONFIGS (mutable)
- Name uniqueness enforced via LLC_NAME_TO_ID mapping

### Key Implementation Notes
- Equity stored in basis points (10000 = 100%) for precision
- 75% approval threshold for equity offers
- 10% minimum equity to create offers
- 7-day offer expiry (same as regular proposals)
- Dilution math uses u64 intermediate calculations → u32 storage
