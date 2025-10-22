# Treasury E2E Tests - Usage Guide

## Overview
This directory contains Playwright E2E tests that verify the Treasury tab functionality works correctly with ICP authentication and real backend APIs.

## One-Time Human Setup

**Run once** to create auth credentials:
```bash
cd daopad_frontend
npx playwright test --headed e2e/setup/auth.setup.ts
```

Browser will open → Login with Internet Identity → Auth saved to `.auth/user.json`

## Running Tests

### Run all E2E tests:
```bash
cd daopad_frontend
npx playwright test
```

### Run specific test file:
```bash
npx playwright test e2e/treasury.spec.ts
```

### Run with UI (debugging):
```bash
npx playwright test --headed --debug
```

### Run smoke tests only:
```bash
npx playwright test e2e/minimal-smoke.spec.ts
```

## What the Tests Verify

### Smoke Tests (minimal-smoke.spec.ts)
1. ✅ App homepage loads
2. ✅ Auth state is loaded from storage
3. ✅ DAO page navigation works

### Treasury Tests (treasury.spec.ts)
1. ✅ Treasury tab loads without console errors
2. ✅ Treasury assets are displayed
3. ✅ Account balances show actual data
4. ✅ Asset symbols appear
5. ✅ Loading spinner disappears (no infinite loading)
6. ✅ Network errors handled gracefully
7. ✅ React errors caught by error boundary
8. ✅ Backend API calls succeed
9. ✅ Treasury data loads successfully

## Test Architecture

### Authentication
- **Playwright auto-loads** auth from `.auth/user.json` via `playwright.config.ts`
- Auth helper (`e2e/helpers/auth.ts`) just navigates to `/app`
- No manual cookie/localStorage injection needed

### Element Selectors
Tests use `data-testid` attributes added to components:
- `[data-testid="treasury-tab"]` - Treasury tab trigger
- `[data-testid="treasury-overview"]` - Main treasury container
- `[data-testid="treasury-account"]` - Each asset/account item
- `[data-testid="account-balance"]` - Balance display
- `[data-testid="loading-spinner"]` - Loading indicator

### Smart Waits
Tests use:
- `page.waitForLoadState('networkidle')` - Wait for all network requests
- `page.waitForSelector('[data-testid="..."]')` - Wait for specific elements
- `Promise.race([...])` - Wait for either success or error state
- `.catch()` on optional waits - Handle cases where elements don't appear

## Reading Test Results

### Terminal Output
```
Running 11 tests using 1 worker

  ✓ Smoke Tests - Verify Basics > can load app homepage (2.1s)
  ✓ Smoke Tests - Verify Basics > auth state is loaded (1.8s)
  ✓ Smoke Tests - Verify Basics > can navigate to DAO page (2.3s)
  ✓ Treasury Tab - E2E > should load Treasury tab without console errors (8.2s)
  ✓ Treasury Tab - E2E > should display treasury assets (7.1s)
  ...

11 passed (68.4s)
```

### JSON Results
```bash
cat test-results/results.json | jq '.suites[].specs[] | {
  title: .title,
  status: .tests[0].results[0].status,
  error: .tests[0].results[0].error.message
}'
```

### Screenshots (On Failure)
Playwright auto-captures:
- `test-results/treasury-failure-{timestamp}.png` - Full page screenshot
- `test-results/smoke-*.png` - Smoke test screenshots

### Console Logs
Tests capture:
- Browser console errors (logged to terminal)
- Network requests to backend APIs
- React component errors

## Troubleshooting

### "Authentication file not found"
→ Human needs to run setup once: `npx playwright test --headed e2e/setup/auth.setup.ts`

### "Element not found" or timeouts
→ Check if:
1. Frontend is deployed to correct URL (baseURL in config)
2. DAO canister ID is correct (`ysy5f-2qaaa-aaaap-qkmmq-cai` for Alexandria)
3. Backend APIs are working
4. Component structure changed (check data-testid attributes)

### "Page is blank/black"
→ Check:
1. Auth file exists and is valid
2. Frontend URL is correct
3. Console errors in test output

### Tests pass locally but fail in CI
→ Consider:
1. Longer timeouts for slower CI environment
2. Auth setup in CI (need to mock or use test identity)
3. Network issues with IC mainnet calls

## Extending Tests

### Adding New Tests
1. Add test to appropriate describe block
2. Use existing patterns for waits and assertions
3. Add data-testid attributes to new components if needed
4. Run locally to verify

### Adding New Data-TestID Attributes
In component files:
```tsx
<div data-testid="my-new-element">...</div>
```

Then in tests:
```typescript
await page.waitForSelector('[data-testid="my-new-element"]');
```

## Configuration

### playwright.config.ts
- **baseURL**: Frontend deployment URL
- **storageState**: Path to auth file (auto-loads)
- **timeout**: Global test timeout (120s)
- **retries**: Number of retries on failure

### Environment Variables
- `TEST_BASE_URL`: Override base URL
- `VITE_BACKEND_CANISTER_ID`: Backend canister ID

## Notes

- Tests run against **mainnet** (not local replica)
- ICP mainnet calls are slow - 30s timeouts needed
- Auth must be refreshed if delegation expires
- Don't commit `.auth/user.json` (it's in .gitignore)
