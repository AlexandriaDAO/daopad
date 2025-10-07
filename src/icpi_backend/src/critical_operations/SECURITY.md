# Critical Operations Security Requirements

## ⚠️ HIGH SECURITY MODULE

This module contains functions that directly affect token balances and user funds.

### CRITICAL RULES:

1. **NEVER CACHE** - All data must be real-time
2. **ATOMIC OPERATIONS** - All operations must complete fully or rollback
3. **INPUT VALIDATION** - All inputs must be validated against whitelist
4. **AUDIT LOGGING** - All operations must be logged for audit
5. **RATE LIMITING** - All operations must be rate-limited

### Functions in this module:
- `mint_icpi_tokens()` - Creates new ICPI tokens
- `burn_icpi()` - Burns ICPI and returns underlying
- `execute_swap()` - Executes portfolio trades
- `transfer_to_user()` - Sends tokens to users
- `approve_kongswap_spending()` - Allows token spending

### Caching Policy:
**❌ NO CACHING EVER** - Functions will panic if cache detected

### Testing Requirements:
- 100% line coverage
- Integration tests for all paths
- Fuzzing for input validation
- Security audit before deployment

### Audit Checklist:
- [ ] All Principal inputs validated
- [ ] All Nat inputs checked for overflow
- [ ] No f64 in financial calculations
- [ ] Atomic operations verified
- [ ] Rate limiting implemented
- [ ] Audit logging complete
- [ ] Error handling tested
- [ ] Rollback tested