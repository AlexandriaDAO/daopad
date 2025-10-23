# DAOPad Frontend

## E2E Testing with Playwright

### First Time Setup

Before running E2E tests, you need to authenticate once:

```bash
# Option 1: Use convenience script (recommended)
./setup-auth.sh

# Option 2: Run setup test directly
npx playwright test e2e/manual-auth-setup.spec.ts --headed
```

See [PLAYWRIGHT_AUTH_SETUP.md](./PLAYWRIGHT_AUTH_SETUP.md) for detailed instructions.

### Running Tests

```bash
npm run test:e2e              # Run all E2E tests
npm run test:e2e:headed       # See browser while testing
npm run test:e2e:debug        # Debug mode
```

### Test Coverage

- Treasury integration (treasury.spec.ts)
- Public dashboard (app-route.spec.ts)
- More tests coming soon...

For comprehensive testing guidelines, see [PLAYWRIGHT_TESTING_GUIDE.md](./PLAYWRIGHT_TESTING_GUIDE.md).

## Development

This is the DAOPad frontend application built with React and deployed to the Internet Computer.

See the main project documentation for build and deployment instructions.
