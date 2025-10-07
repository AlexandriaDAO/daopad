# Informational Module

## Display Only - Safe for Frontend

This module provides read-only data for UI display. No token operations.

### Purpose:
- Format data for frontend display
- Provide cached summaries
- Health and status monitoring

### Caching Policy:
- **5 minute cache acceptable** - Display only, staleness OK
- **Graceful degradation** - Return stale data on query failure

### Key Functions:
- `get_index_state_cached()` - Cached portfolio state
- `get_tvl_summary()` - TVL breakdown for UI
- `get_rebalancer_status()` - Timer and rebalancing status
- `get_health_status()` - System health metrics
- `portfolio_formatter()` - Format data for display

### Security Level: LOW
Display only, no financial impact.