# Security Analysis: AutoApproved Orbit Policies

## Executive Summary

DAOPad uses Orbit Station's `AutoApproved` policy for treasury operations. This document explains why this is **secure by design** and addresses common security concerns.

**TL;DR**: The security layer is DAOPad's governance (Kong Locker voting with 50%+ thresholds and 7-day periods), not Orbit's approval mechanism. AutoApproved eliminates redundant approvals while maintaining strong security guarantees.

---

## Security Architecture

### Two-Layer Security Model

Traditional crypto governance often conflates two distinct security layers:

1. **Governance Layer**: Who decides what actions to take?
2. **Execution Layer**: Who can execute approved actions?

DAOPad cleanly separates these:

```
┌─────────────────────────────────────────────────────────┐
│ GOVERNANCE LAYER (DAOPad)                               │
│ - Kong Locker voting power (locked LP value × 100)      │
│ - Threshold-based approval (50%+, 70%, 90% by risk)     │
│ - Time-locked voting periods (7 days)                   │
│ - Transparent proposal tracking                         │
│ - Immutable vote records                                │
└─────────────────────────────────────────────────────────┘
                          ↓
              Vote passes threshold
                          ↓
┌─────────────────────────────────────────────────────────┐
│ EXECUTION LAYER (Orbit Station)                         │
│ - Backend submits approved action                       │
│ - AutoApproved policy executes immediately              │
│ - Treasury state changes atomically                     │
│ - On-chain audit trail                                  │
└─────────────────────────────────────────────────────────┘
```

### Why AutoApproved is Necessary

**The Separation of Duties Problem**:

Orbit Station's security model enforces that a user/canister CANNOT approve requests it creates (separation of duties). This is excellent for traditional multi-sig scenarios but creates an architectural mismatch with DAOPad:

```
Traditional Orbit:
User A creates request → Users B, C, D approve → Executes
✅ Separation enforced at Orbit layer

DAOPad with Quorum:
Backend creates request → Backend tries to approve → ❌ BLOCKED
                       → No other users exist → ❌ STUCK FOREVER
```

**Why we can't just add more users to Orbit**:

The DAO is the backend canister. There are no other "trusted users" to add. We could create dummy users, but that would be:
- Security theater (backend controls them anyway)
- Operationally fragile (managing multiple principals)
- Missing the point (governance already happened in DAOPad)

**The AutoApproved Solution**:

```
DAOPad Architecture:
Community votes (50%+ of voting power) → Backend submits to Orbit (AutoApproved) → Executes
✅ Separation enforced at DAOPad layer
✅ Orbit acts as execution engine, not governance
```

---

## Security Guarantees

### 1. Voting Power is Objective and Liquid

**Kong Locker Mechanism**:
- Users lock LP tokens **permanently** in individual, blackholed canisters
- Voting power = USD value of locked tokens × 100
- Value updated in real-time from market prices
- No way to unlock (true commitment)

**Why This is Secure**:
- Voting power reflects actual skin in the game (financial commitment)
- Cannot be gamed (tokens are burned, not just "staked")
- Liquid (changes with token value, reflecting market confidence)
- Objective (no human discretion in vote weighting)

**Compare to**:
- Token voting: Whales can dump after voting (no commitment)
- Plutocracy: 1 token = 1 vote (ignores value)
- NFT voting: 1 NFT = 1 vote (arbitrary, not value-based)

### 2. Threshold-Based Risk Management

DAOPad enforces different voting thresholds based on operation risk:

| Operation Type | Threshold | Rationale |
|----------------|-----------|-----------|
| System Upgrade/Restore | 90% | Catastrophic if misused |
| Treasury Transfer | 75% | High-value, irreversible |
| Edit Permissions | 70% | Security configuration |
| Canister Calls | 60% | Potential for harm |
| User Management | 50% | Lower risk, need agility |
| Asset Management | 40% | Mostly informational |
| Address Book | 30% | No direct treasury impact |

**Why This is Secure**:
- Critical operations require overwhelming consensus
- Impossible for minority to force risky actions
- Balances security with operational efficiency
- Thresholds based on actual risk analysis

### 3. Time-Locked Deliberation

**Voting Period**: 7 days (168 hours) for all proposals

**Why This is Secure**:
- Community has time to analyze proposals
- Prevents rushed/emotional decisions
- Allows opposition to mobilize
- Time for security review of code changes
- Mitigates flash-loan style attacks on governance

**Compare to**:
- No time lock: Instant execution (vulnerable to surprise attacks)
- Too short (<24h): Insufficient time for thorough review
- Too long (>14d): Governance paralysis, emergency response issues

### 4. Transparent and Immutable

**DAOPad Governance Properties**:
- All proposals stored on-chain
- All votes recorded immutably
- Vote tallies publicly verifiable
- Execution tied to on-chain vote records
- Audit trail for all treasury operations

**Why This is Secure**:
- No secret voting or hidden actions
- Community can verify vote counts
- Historical record prevents revisionism
- Accountability for all participants

---

## Attack Vector Analysis

### Attack: "Rogue backend could execute unauthorized transfers"

**Claim**: Since Orbit is AutoApproved, backend could bypass governance.

**Rebuttal**:
- Backend code is open-source and auditable
- All backend methods that create Orbit requests MUST call `ensure_proposal_for_request()`
- This creates a DAOPad proposal automatically
- Request won't pass threshold without community votes
- Any backend upgrade that removes this check would:
  - Be visible in upgrade proposal code
  - Require 90% approval (System Upgrade threshold)
  - Trigger community alarm (obvious malicious change)

**Mitigation**:
- Code review of all backend updates
- 90% threshold for System Upgrade proposals
- Community monitoring of upgrade proposals
- Can blackhole backend after stable version (future option)

### Attack: "Attacker compromises backend canister"

**Claim**: If backend is compromised, AutoApproved allows instant drain.

**Rebuttal**:
- Backend is a Wasm canister (no private keys to steal)
- Only upgradeable via controller (must be DAO or NNS)
- Compromise requires either:
  - (A) Compromising controller (protected by governance)
  - (B) Finding Wasm vulnerability (affects all IC canisters)

**Mitigation**:
- Use NNS or DAO-controlled blackhole as controller
- Regular security audits of backend code
- Reproducible builds (verify deployed Wasm)
- Monitor backend for unexpected behavior
- Community can observe all treasury operations on-chain

### Attack: "Vote buying / governance attack"

**Claim**: Attacker buys 51% of voting power, drains treasury.

**Rebuttal**:
- Voting power = locked LP value, not transferable
- To gain 51%, attacker must:
  - Acquire 51% of circulating LP tokens
  - Lock them PERMANENTLY (cannot unlock to sell)
  - Wait 7 days for vote to pass
- Cost exceeds potential gain (treasury < 51% of total LP value)
- Attack makes their locked tokens worthless (destroys own value)

**Mitigation**:
- Treasury size < total voting power (economic incentive aligned)
- 7-day delay allows community to respond
- Higher thresholds (75%, 90%) for critical operations
- Can monitor for sudden voting power concentration

### Attack: "Frontend manipulation shows fake vote counts"

**Claim**: Malicious frontend could display incorrect vote tallies.

**Rebuttal**:
- Vote tallies stored on backend (not frontend)
- Anyone can query backend directly:
  ```bash
  dfx canister --network ic call daopad_backend get_proposal '("PROPOSAL_ID")'
  ```
- Community can verify votes independently
- Multiple frontends can be built (decentralized access)

**Mitigation**:
- Encourage users to verify critical proposals via dfx
- Build alternative frontends (redundancy)
- Publish vote verification tools
- On-chain data is source of truth (not frontend UI)

### Attack: "Time-delay allows front-running"

**Claim**: 7-day delay reveals plans to market (e.g., token buy before proposal passes).

**Rebuttal**:
- This is a feature, not a bug (transparency)
- Market can price in governance decisions
- Prevents insider trading (all info public)
- Alternative (secret voting) is worse (enables actual insider trading)

**Mitigation**:
- Accept this as inherent to transparent governance
- Use batch proposals for complex strategies
- Consider encrypted votes with delayed reveal (future enhancement)

---

## Comparison to Other DAOs

| DAO | Governance Model | Weakness | DAOPad Advantage |
|-----|------------------|----------|------------------|
| **Traditional Multi-Sig** | N of M signers | Human signers (single points of failure, key theft, social engineering) | Algorithmic execution, no private keys |
| **Token-Weighted Voting** | 1 token = 1 vote | Whales decide, no commitment | Voting power from permanently locked value |
| **NFT DAOs** | 1 NFT = 1 vote | Plutocracy, arbitrary weights | Objective value-based weighting |
| **Quorum-Based** | Fixed user group | Role bloat, static membership | Liquid voting power, no user management |
| **Pure Orbit** | Per-request approval | Redundant with DAOPad voting | Single governance layer (no redundancy) |

**DAOPad's Unique Position**:
- Objective voting power (locked LP value)
- Liquid democracy (power changes with value)
- Threshold-based risk management
- No user role complexity
- Separation of governance from execution

---

## Frequently Asked Questions (FAQ)

### Q: Is AutoApproved secure?

**A**: Yes, when governance happens at a different layer. Orbit's AutoApproved is designed for exactly this use case (trusted admin with external governance). Security is in DAOPad's voting (50%+ thresholds, 7-day periods, locked LP voting power), not in Orbit re-approving what was already approved.

### Q: Why not use Orbit's built-in voting?

**A**: Orbit voting is user/role-based (static quorums). DAOPad needs value-based voting (liquid democracy with locked LP tokens). Orbit is an excellent execution engine but not designed for liquid voting power.

### Q: What if backend has a bug?

**A**: All backend upgrades require 90% governance approval. Bug fixes must pass community vote. Code is open-source and auditable before votes. Community can review proposed changes before approving upgrades.

### Q: Can backend be blackholed?

**A**: Yes, future enhancement. Once DAOPad is stable, backend controller can be set to blackhole (makes it immutable). But this prevents bug fixes, so must be very stable first. Likely path: DAO-controlled upgrade authority via NNS.

### Q: How is this different from centralization?

**A**: Backend is not "centralized" - it's a **deterministic smart contract** controlled by community governance. Compare:
- Centralized: CEO decides → instant execution (humans, discretion)
- DAOPad: Community votes (50%+) → 7-day wait → algorithmic execution (code, no discretion)

Backend is automation, not authority. Authority is voting power.

### Q: What if someone gets 51% voting power?

**A**: They must permanently lock 51% of LP tokens (worth more than any treasury). Attack cost exceeds gain. Plus:
- 7-day delay allows response
- Critical operations need 70-90% (higher bar)
- Attack destroys value of their locked tokens
- Community can observe concentration and respond

### Q: Why 7-day voting period?

**A**: Balances security with agility:
- Too short: Rushed decisions, insufficient review
- Too long: Governance paralysis, can't respond to time-sensitive issues
- 7 days: Time for analysis, discussion, opposition mobilization, security review

Can be adjusted via governance if needed.

### Q: Can we add more approvers to Orbit instead?

**A**: No good options:
- Add DAO members: But backend is the DAO (no distinct "members")
- Add dummy principals: Security theater (backend controls keys anyway)
- Add external parties: Defeats purpose of decentralization

AutoApproved + DAOPad governance is the architecturally correct solution.

### Q: What about emergency situations?

**A**: Emergency operations still require votes (7-day minimum). This is by design:
- Most "emergencies" are not time-critical (bugs, exploits detected early)
- True emergencies (hack in progress) likely can't be stopped by governance anyway
- Prevents abuse of "emergency powers" (common DAO failure mode)

Future: Could add emergency multisig for circuit breaker (pause operations), but NOT for execution (must still vote).

### Q: How do I verify security myself?

**A**: All on-chain and verifiable:

1. **Verify voting logic**:
   ```bash
   # Get proposal details
   dfx canister --network ic call daopad_backend get_proposal '("PROPOSAL_ID")'

   # Check voting power
   dfx canister --network ic call kong_locker get_all_voting_powers

   # Verify vote tallies match claimed thresholds
   ```

2. **Verify backend code**:
   - Code on GitHub (open source)
   - Build backend locally (reproducible builds)
   - Compare hash to deployed canister
   - Review `ensure_proposal_for_request()` enforcement

3. **Verify Orbit policies**:
   ```bash
   dfx canister --network ic call ORBIT_STATION_ID list_accounts '(record {})'
   # Should show AutoApproved for all accounts
   ```

4. **Monitor operations**:
   - Watch for unexpected backend behavior
   - Verify all treasury operations have corresponding proposals
   - Check audit trails match

---

## Conclusion

DAOPad's AutoApproved architecture is **secure by design** because:

1. ✅ Governance happens at DAOPad layer (objective, value-based voting)
2. ✅ Orbit is execution engine (no redundant approval needed)
3. ✅ Threshold-based risk management (90% for critical ops)
4. ✅ Time-locked deliberation (7 days to analyze)
5. ✅ Transparent and immutable (on-chain audit trail)
6. ✅ Economic incentives aligned (attack cost > gain)
7. ✅ No single points of failure (algorithmic, not human)

**The security is in the voting, not in having multiple people turn the same key.**

---

## Further Reading

- `ORBIT_MIGRATION_STATUS.md` - How to set up AutoApproved policies
- `DEPLOYMENT_CHECKLIST.md` - Verification steps for production
- `AGENT_INSTRUCTIONS_ORBIT.md` - Developer guidelines
- Orbit Station docs: https://github.com/dfinity/orbit
- Kong Locker design: `../../kong-locker-reference/CLAUDE.md`
