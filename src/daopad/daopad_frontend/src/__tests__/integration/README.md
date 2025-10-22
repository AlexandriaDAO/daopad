# Mainnet Integration Tests

## Purpose

Debug treasury loading issues by making **real mainnet calls** and logging full responses.

These tests help answer questions like:
- Why aren't treasury accounts loading in the UI?
- What exact data is the backend returning?
- Are BigInt values being handled correctly?
- What error messages are we getting from Orbit Station?
- How are the types structured in the actual responses?

## Usage

### Run All Integration Tests
```bash
cd daopad_frontend
npm run test:integration
```

Or use the alias:
```bash
npm run test:mainnet
```

### Run Specific Test File
```bash
npx vitest src/__tests__/integration/treasury-accounts.test.ts
```

### Watch Mode (Re-run on Changes)
```bash
npx vitest src/__tests__/integration --watch
```

## What These Tests Do

1. **Make Real HTTP Calls** - Connect to mainnet canisters (no mocking)
2. **Log Full Response Structures** - See exactly what the backend returns
3. **Show Exact Types** - Especially BigInt handling and conversions
4. **Display Error Messages** - With codes, details, and stack traces
5. **Test Edge Cases** - Invalid IDs, missing data, timeouts

## Test Categories

### List Accounts
- Fetch all treasury accounts for Alexandria DAO
- Test search term filtering
- Handle invalid token IDs

### Get Available Assets
- Fetch assets from Orbit Station
- Show asset metadata (symbol, decimals, standards)
- Display blockchain information

### Account with Assets
- Get specific account details with balances
- Show balance information and decimals
- Test asset enumeration

### Type Debugging
- Analyze BigInt handling and conversion
- Show Candid variant structure (Ok/Err)
- Display type information for all fields

### Error Scenarios
- Test timeout behavior
- Show network error handling
- Demonstrate exception structures

## Example Output

When tests run, you'll see output like:

```
📋 Testing: list_orbit_accounts
🔗 Connecting to mainnet...
✅ Connected to backend actor

=== RAW RESPONSE ===
{
  "Ok": {
    "accounts": [
      {
        "id": "a1b2c3d4-...",
        "name": "Main Treasury",
        "assets": [
          {
            "asset_id": "xyz123...",
            "balance": {
              "balance": "1000000000n",
              "decimals": 8
            }
          }
        ]
      }
    ],
    "total": "5"
  }
}
=== END RAW RESPONSE ===

✅ Success response
Accounts found: 5

📦 Account 1:
  ID: a1b2c3d4-...
  Name: Main Treasury
  Assets: 3
  Asset details:
    1. Asset ID: xyz123...
       Balance: 1000000000
       Balance type: bigint
       Decimals: 8
```

## Configuration

Test configuration is in:
- **Canister IDs**: `setup.ts` (mainnet production canisters)
- **Timeout**: `vite.config.ts` (`testTimeout: 60000`)
- **Scripts**: `package.json` (`test:integration`, `test:mainnet`)

### Current Mainnet Canisters

```typescript
BACKEND_CANISTER = 'lwsav-iiaaa-aaaap-qp2qq-cai'
ALEX_TOKEN_ID = 'ysy5f-2qaaa-aaaap-qkmmq-cai'
ORBIT_STATION_ID = 'fec7w-zyaaa-aaaaa-qaffq-cai'
```

## When to Use These Tests

### UI Not Loading Treasury Data
Run integration tests to see:
- Is the backend call succeeding?
- What exact data structure is returned?
- Are there any error codes?

### Type Errors in Console
Check the type debugging tests:
- How are BigInts being returned?
- Do we need to convert them?
- Are optional fields empty arrays or undefined?

### BigInt Conversion Issues
The type analysis test shows:
- Original BigInt values
- Conversion to Number
- Conversion to String
- Warnings for values too large for Number

### Error Messages Not Clear
Error scenario tests show:
- Network-level errors vs. application errors
- Orbit Station error codes and messages
- Exception structure from @dfinity/agent

## Comparison with Unit Tests

| Aspect | Unit Tests | Integration Tests |
|--------|-----------|-------------------|
| **Speed** | Milliseconds | 1-60 seconds |
| **Network** | None (mocked) | Real mainnet calls |
| **Data** | Fake/mocked | Actual canister state |
| **Purpose** | Logic testing | Debugging/validation |
| **Run** | Always (CI/CD) | Manually when debugging |

## Tips for Agents (AI)

When debugging UI issues:

1. **Run the integration tests first**
   ```bash
   npm run test:integration
   ```

2. **Check the raw response** - Look for the `=== RAW RESPONSE ===` sections

3. **Verify types** - Check if BigInt values need conversion

4. **Look for errors** - Search output for `❌` and `ERROR` markers

5. **Compare with frontend** - Does the UI code handle the exact structure returned?

## Common Issues Revealed by These Tests

### BigInt Not Converted
```javascript
// Backend returns: balance: 1000000000n (bigint)
// Frontend expects: balance: 1000000000 (number)
// Fix: Convert at source with Number(balance) or balance.toString()
```

### Optional Fields as Empty Arrays
```javascript
// Orbit returns: search_term: []
// TypeScript type: search_term?: string
// Fix: Check for empty array, not just undefined
```

### Nested Ok/Err Variants
```javascript
// Response structure: { Ok: { Ok: { data } } }
// Not just: { Ok: { data } }
// Fix: Handle double-wrapped responses
```

### Missing Error Details
```javascript
// Error has: code, message, details
// But details might be: [] or undefined
// Fix: Check both message and details array
```

## Adding New Tests

To test a new backend method:

1. Add the test to `treasury-accounts.test.ts` or create new file
2. Follow the pattern:
   ```typescript
   it('should test new method', async () => {
     const result = await backendActor.new_method(params);
     logResponse('METHOD NAME', result);

     // Check structure
     if ('Ok' in result) {
       console.log('✅ Success');
       // Log relevant fields
     } else if ('Err' in result) {
       console.log('❌ Error:', result.Err);
     }
   }, 60000);
   ```
3. Run the test to see actual output
4. Update frontend code to match actual structure

## Resources

- [Vitest Documentation](https://vitest.dev)
- [@dfinity/agent Documentation](https://agent-js.icp.xyz)
- [IC HTTP Queries](https://internetcomputer.org/docs/current/developer-docs/build/backend/call-functions)
- [Candid Types](https://internetcomputer.org/docs/current/references/candid-ref)

## Maintenance

These tests call mainnet directly, so:
- They may fail if canisters are being upgraded
- They depend on real data in Alexandria DAO treasury
- They require network connectivity
- They use production canister IDs

Update canister IDs in `setup.ts` if:
- Backend is redeployed to new canister
- Testing with a different DAO/token
- Switching between production and staging

## Future Enhancements

Planned additions:
- [ ] Proposal listing tests (Activity tab)
- [ ] Settings/security tests (Settings tab)
- [ ] Kong Locker voting power tests
- [ ] Request creation tests
- [ ] Balance fetching tests
- [ ] Test data snapshots for regression detection
