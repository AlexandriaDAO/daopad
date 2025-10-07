# Kong Liquidity Module

## External Reference Data

This module queries locked liquidity data from Kong Locker to calculate target allocations.

### Purpose:
- Query lock canisters from Kong Locker
- Get LP positions from Kongswap
- Calculate target portfolio allocations based on locked liquidity

### Caching Policy:
- **1 hour cache acceptable** - External data changes slowly

### Key Functions:
- `get_all_lock_canisters()` - Discover lock canisters
- `get_lp_positions()` - Query LP token positions
- `calculate_target_allocations()` - Compute target weights
- `calculate_external_tvl_targets()` - Aggregate TVL targets

### Security Level: MEDIUM
Reference data for portfolio targets, not direct token operations.