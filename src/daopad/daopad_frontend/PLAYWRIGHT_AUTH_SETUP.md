# Playwright Authentication Setup Guide

## Quick Start (First Time Setup)

### Step 1: Run Manual Authentication Setup

Open a browser, log in with Internet Identity, and save your session:

```bash
cd daopad_frontend
npx playwright test e2e/manual-auth-setup.spec.ts --headed
```

**What happens:**
1. Browser opens to DAOPad app
2. Console shows instructions
3. Click "Connect Wallet" button
4. Log in with your Internet Identity
5. Wait for authentication to complete (Logout button appears)
6. Session automatically saves to `.auth/user.json`
7. Browser closes

**Expected Output:**
```
🔐 Opening browser for manual authentication...
Instructions:
1. Browser will open to the DAOPad app
2. Click "Connect Wallet"
3. Login with your Internet Identity
4. Wait for the dashboard to load
...
✅ Authentication detected!
🎉 Authentication saved to .auth/user.json
```

### Step 2: Run Tests

Once authentication is saved, all tests will use your session automatically:

```bash
npx playwright test                # Run all tests
npx playwright test --headed       # See browser
npx playwright test --debug        # Debug mode
```

## How It Works

1. **One-time setup:** `manual-auth-setup.spec.ts` saves your II session to `.auth/user.json`
2. **Auto-loading:** Playwright config loads `.auth/user.json` for all subsequent tests
3. **Persistent:** Session persists until you delete `.auth/user.json` or it expires

## File Structure

```
.auth/
└── user.json          # Your saved Internet Identity session (gitignored)

e2e/
├── setup/
│   └── auth.setup.ts  # Alternative setup method (less user-friendly)
├── helpers/
│   └── auth.ts        # Helper functions (authenticateForTests, setupAuthentication)
└── manual-auth-setup.spec.ts  # 👈 USE THIS for first-time setup
```

## Troubleshooting

### "No .auth/user.json found"

Run the manual setup:
```bash
npx playwright test e2e/manual-auth-setup.spec.ts --headed
```

### "Session expired" or "Not authenticated" errors

Delete the old session and re-authenticate:
```bash
rm -rf .auth/
npx playwright test e2e/manual-auth-setup.spec.ts --headed
```

### Want to use a different identity?

Delete `.auth/user.json` and run setup again:
```bash
rm .auth/user.json
npx playwright test e2e/manual-auth-setup.spec.ts --headed
```

## Advanced: Automated Setup (Headless)

For CI/CD or automated setups, use `auth.setup.ts`:
```bash
npm run test:e2e:setup
```

**Note:** This is less user-friendly for first-time setup because it doesn't show detailed instructions.

## Why This Approach?

**Internet Identity Delegation Chains:**
- II uses cryptographic delegation to create browser-specific sessions
- These delegations are stored in browser localStorage
- Playwright captures the entire browser state including these delegations
- The saved `.auth/user.json` contains all necessary delegation data
- When tests load this state, they're authenticated as your II

**Security:**
- `.auth/user.json` is gitignored (never committed to version control)
- Session is local to your machine
- Expires based on II's standard session timeout
- Same security model as using the app in a regular browser

## Available Test Scripts

```bash
npm run test:e2e              # Run all E2E tests
npm run test:e2e:headed       # See browser while testing
npm run test:e2e:debug        # Debug mode with Playwright Inspector
npm run test:e2e:setup        # Run auth setup (headless)
```

## Next Steps

After authentication is set up:
1. Run tests: `npx playwright test`
2. Check test results in `test-results/` directory
3. View HTML report: `npx playwright show-report`
4. Debug failing tests: `npx playwright test --debug`

For more information on writing E2E tests, see `PLAYWRIGHT_TESTING_GUIDE.md`.
