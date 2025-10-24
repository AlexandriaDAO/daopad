# E2E Test Authentication Setup

## Overview

The Playwright E2E tests are split into two projects:
- **anonymous-parallel**: Tests that don't require authentication (run in parallel)
- **authenticated-serial**: Tests that require Internet Identity authentication (run serially)

## Authentication Setup

### Option 1: Manual Browser Authentication (Recommended)

1. Run the manual auth setup test:
```bash
npx playwright test manual-auth-setup --headed
```

2. When the browser opens:
   - Click "Connect Wallet"
   - Complete Internet Identity login
   - Wait for successful authentication

3. The auth state will be saved to `.auth/user.json` (gitignored)

### Option 2: Skip Authenticated Tests

If you only need to run anonymous tests:
```bash
npx playwright test --project=anonymous-parallel
```

### Option 3: Mock Authentication (Development)

Create a placeholder auth file:
```bash
mkdir -p .auth
echo '{"cookies":[],"origins":[]}' > .auth/user.json
```

Note: This will allow tests to run but they will fail at actual authentication steps.

## Test Execution

### Run All Tests
```bash
npx playwright test
# Runs both anonymous (parallel) and authenticated (serial) tests
```

### Run Only Anonymous Tests (Fast)
```bash
npx playwright test --project=anonymous-parallel
# All these tests pass without authentication
```

### Run Only Authenticated Tests
```bash
npx playwright test --project=authenticated-serial
# Requires .auth/user.json to exist
```

## Troubleshooting

### "Timeout waiting for authentication"
- Ensure `.auth/user.json` exists
- Re-run manual auth setup if expired

### Tests fail with "503 Service Unavailable"
- IC canister may be rate limiting
- Reduce worker count in playwright.config.ts

### Authentication persists between runs
- Delete `.auth/user.json` to reset
- Re-run manual auth setup

## CI/CD Setup

For CI environments, you'll need to either:
1. Mock authentication with test-specific auth tokens
2. Use a service account with persistent auth
3. Skip authenticated tests in CI

## Technical Details

- Internet Identity uses IndexedDB which cannot be shared between parallel workers
- Each worker process needs its own authentication session
- This is why authenticated tests must run serially