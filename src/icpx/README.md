# ICPX Backend - Security-First Architecture

## Overview

ICPX is a decentralized index fund on the Internet Computer that automatically rebalances based on locked liquidity in Kongswap pools. This repository contains the refactored backend with a security-first architecture.

## Architecture

The backend is organized by security boundaries rather than functional domains:

```
src/
├── 1_CRITICAL_OPERATIONS/    # 🔴 Highest security - mint, burn, rebalance
├── 2_CRITICAL_DATA/          # 🔴 Financial calculations
├── 3_KONG_LIQUIDITY/         # 🟡 External liquidity reference
├── 4_TRADING_EXECUTION/      # 🟠 DEX interactions
├── 5_INFORMATIONAL/          # 🟢 Display and caching
└── 6_INFRASTRUCTURE/         # ⚪ Shared utilities
```

## Key Features

- **Two-Phase Minting**: Secure minting with snapshot validation
- **Proportional Burning**: Fair redemption based on holdings
- **Automated Rebalancing**: Hourly rebalancing based on Kong liquidity
- **Security-First Design**: Clear separation of critical and non-critical code
- **Comprehensive Validation**: All external data validated at trust boundaries

## Prerequisites

- [DFX SDK](https://internetcomputer.org/docs/current/developer-docs/setup/install) (latest version)
- Rust toolchain with `wasm32-unknown-unknown` target
- Node.js and npm (for candid generation)

## Installation

1. **Install DFX**:
```bash
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
```

2. **Install Rust target**:
```bash
rustup target add wasm32-unknown-unknown
```

3. **Clone and enter directory**:
```bash
cd /home/theseus/alexandria/daopad/src/icpx
```

## Local Development

1. **Start local replica**:
```bash
dfx start --clean
```

2. **Deploy canister**:
```bash
dfx deploy icpx_backend
```

3. **Generate Candid interface**:
```bash
cargo test
dfx generate
```

## Testing

### Unit Tests
```bash
cargo test
```

### Integration Tests (with local replica)
```bash
dfx start --clean --background
dfx deploy
npm test
dfx stop
```

## API Endpoints

### Minting Operations

- `initiate_mint(amount: Nat) -> Result<String>`: Start a mint request
- `complete_mint(mint_id: String) -> Result<Nat>`: Complete pending mint

### Burning Operations

- `burn_icpx(amount: Nat) -> Result<BurnResult>`: Burn ICPX for underlying tokens

### Rebalancing

- `perform_rebalance() -> Result<String>`: Execute portfolio rebalancing

### Queries

- `get_portfolio_display() -> PortfolioDisplay`: Get cached portfolio state
- `get_portfolio_value() -> Result<Nat>`: Get live portfolio value
- `get_icpx_supply() -> Result<Nat>`: Get validated ICPX supply
- `get_target_allocations() -> Result<Vec<(String, f64)>>`: Get target percentages

### Admin Functions

- `pause_canister() -> Result<()>`: Pause all operations
- `resume_canister() -> Result<()>`: Resume operations
- `set_admin(Principal) -> Result<()>`: Transfer admin rights

## Configuration

Update constants in `src/6_INFRASTRUCTURE/constants.rs`:

- Token canister IDs
- Minimum amounts for mint/burn
- Rebalancing parameters
- Validation thresholds

## Security Considerations

1. **Critical Operations**: All minting and burning operations are isolated in `1_CRITICAL_OPERATIONS`
2. **Validation**: External data validated in `2_CRITICAL_DATA/validation`
3. **No Caching**: Critical calculations never use cached data
4. **Atomic Snapshots**: State captured before deposits to prevent manipulation
5. **Fail-Safe**: Operations continue on partial failures (e.g., burn redemptions)

## Deployment to Mainnet

1. **Update canister IDs** in `constants.rs`
2. **Review security parameters**
3. **Run security audit**
4. **Deploy with cycles**:
```bash
dfx deploy --network ic --with-cycles 1000000000000
```

## Monitoring

Check canister health:
```bash
dfx canister --network ic call icpx_backend health_check
```

View logs:
```bash
dfx canister --network ic logs icpx_backend
```

## Migration from Old Architecture

See `ICPX_PLAN.md` for detailed migration strategy:

1. Deploy new canister alongside old
2. Pause old canister
3. Migrate state
4. Update frontend to point to new canister
5. Monitor for 48 hours
6. Decommission old canister

## Testing Minting Flow

```bash
# Start mint
dfx canister call icpx_backend initiate_mint '(1000000)'

# Complete mint (use returned mint_id)
dfx canister call icpx_backend complete_mint '("mint_12345")'
```

## Testing Burning Flow

```bash
# First transfer ICPX to backend (automatic burn)
# Then call burn_icpx
dfx canister call icpx_backend burn_icpx '(100000000)'
```

## Troubleshooting

### Canister not building
```bash
cargo clean
cargo build --target wasm32-unknown-unknown --release
```

### DFX errors
```bash
dfx stop
dfx start --clean
```

### Import errors in Rust
Ensure all module paths in `lib.rs` match the actual directory names.

## Contributing

1. Follow the security-first architecture
2. Add tests for all critical functions
3. Update documentation for API changes
4. Run security audit before mainnet deployment

## License

[License details]

## Contact

[Contact information]

## Audit Status

⚠️ **This code has not been audited. Use at your own risk.**

Planned audits:
- [ ] Internal security review
- [ ] External audit firm
- [ ] Community bug bounty

## References

- [ICPX_PLAN.md](./ICPX_PLAN.md) - Detailed architecture documentation
- [Internet Computer Docs](https://internetcomputer.org/docs)
- [ICRC-1 Token Standard](https://github.com/dfinity/ICRC-1)