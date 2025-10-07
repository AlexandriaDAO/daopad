# Portfolio Data Module

## Current Holdings Data

This module queries actual token balances held by the ICPI canister.

### Purpose:
- Query token balances from ledgers
- Calculate current portfolio value
- Track positions and holdings

### Caching Policy:
- **NEVER for critical paths** (mint/burn calculations)
- **30 second cache OK** for display only

### Key Functions:
- `get_token_balance_uncached()` - For critical operations
- `get_token_balance_cached()` - For display only
- `get_current_positions()` - Portfolio state
- `calculate_current_portfolio_value()` - Total value

### Security Level: IMPORTANT
Used by critical operations but also safe for display queries.