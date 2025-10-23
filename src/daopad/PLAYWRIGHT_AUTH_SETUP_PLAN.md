# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-playwright-auth-setup/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-playwright-auth-setup/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - No backend changes needed
   - Frontend changes only if adding convenience scripts:
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Setup]: Playwright Authentication Setup Guide and Improvements"
   git push -u origin feature/playwright-auth-setup
   gh pr create --title "[Setup]: Playwright Authentication Setup Guide" --body "Implements PLAYWRIGHT_AUTH_SETUP_PLAN.md - Adds documentation and convenience scripts for Playwright authentication setup"
   ```
5. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view [NUM] --json comments`
     - Count P0 issues
     - IF P0 > 0: Fix immediately, commit, push, sleep 300s, continue
     - IF P0 = 0: Report success, EXIT
   - After 5 iterations: Escalate to human

## CRITICAL RULES
- ❌ NO questions ("should I?", "want me to?", "is it done?")
- ❌ NO skipping PR creation - it's MANDATORY
- ❌ NO stopping after implementation - create PR immediately
- ✅ After sleep: IMMEDIATELY continue (no pause)
- ✅ ONLY stop at: approved, max iterations, or error

**Branch:** `feature/playwright-auth-setup`
**Worktree:** `/home/theseus/alexandria/daopad-playwright-auth-setup/src/daopad`

---

# Implementation Plan: Playwright Authentication Setup

## Task Classification
**SETUP/DOCUMENTATION**: Provide easy authentication setup for Playwright E2E tests

## Current State

### Existing Infrastructure ✅

The Playwright authentication infrastructure is **already implemented** but not yet executed:

**Files:**
```
daopad_frontend/
├── e2e/
│   ├── setup/
│   │   └── auth.setup.ts              # Auth setup project
│   ├── helpers/
│   │   └── auth.ts                    # Auth helper functions
│   ├── manual-auth-setup.spec.ts      # Interactive manual login test
│   ├── treasury.spec.ts               # Uses authenticateForTests()
│   └── app-route.spec.ts
├── playwright.config.ts                # Config (no storageState yet)
└── .auth/                              # ❌ DOESN'T EXIST YET (gitignored)
    └── user.json                       # ❌ WILL BE CREATED ON FIRST RUN
```

**Current Flow:**
1. `e2e/manual-auth-setup.spec.ts` - Opens browser, waits for user to login, saves session
2. `e2e/helpers/auth.ts` - `authenticateForTests()` loads saved session
3. Tests use `authenticateForTests(page)` in `beforeEach`
4. `.auth/user.json` stores Internet Identity delegation chains

**Package.json Scripts:**
```json
{
  "test:e2e:setup": "playwright test e2e/setup/auth.setup.ts --headed",
  "test:e2e": "playwright test",
  "test:e2e:headed": "playwright test --headed",
  "test:e2e:debug": "playwright test --debug"
}
```

**Gitignore Status:** `.auth/` is already in `/home/theseus/alexandria/daopad/.gitignore` ✅

### Current Auth Setup Flow

**Existing Implementation (auth.setup.ts):**
```typescript
// EXISTING CODE
import { test as setup } from '@playwright/test';
import { setupAuthentication } from '../helpers/auth';

setup('authenticate', async ({ page }) => {
  await setupAuthentication(page);
});
```

**Existing Helper (helpers/auth.ts):**
```typescript
// EXISTING CODE
export async function setupAuthentication(page: Page) {
  await page.goto('/');
  await page.click('text=Connect Wallet');
  console.log('Please login with Internet Identity...');
  await page.waitForSelector('[data-testid="user-menu"]', {
    timeout: 120000
  });
  await page.context().storageState({ path: '.auth/user.json' });
  console.log('Authentication saved to .auth/user.json');
}

export async function authenticateForTests(page: Page) {
  // Auth already loaded by Playwright - just navigate
  await page.goto('/app', { waitUntil: 'networkidle' });
  // ... verification logic ...
}
```

### Manual Auth Setup (More User-Friendly)

The `manual-auth-setup.spec.ts` provides better UX with detailed instructions:

```typescript
// EXISTING CODE - Lines 1-85
test('manual auth setup', async ({ page, context }) => {
  test.setTimeout(300000); // 5 minutes
  console.log('🔐 Opening browser for manual authentication...');
  console.log('Instructions:');
  console.log('1. Browser will open to the DAOPad app');
  console.log('2. Click "Connect Wallet"');
  console.log('3. Login with your Internet Identity');
  console.log('4. Wait for the dashboard to load');
  // ... waits for login, saves to .auth/user.json ...
});
```

### Problem Statement

**Current Issue:**
- User wants to run Playwright tests but authentication isn't set up
- `.auth/user.json` doesn't exist yet
- Existing setup requires running a test file manually
- No clear documentation on the setup process

**User Request:**
> "What's the easiest way to set it up such that I could log in on the browser and playwright could use my account?"

**Answer:** Run the existing `manual-auth-setup.spec.ts` test once.

## Implementation Plan

Since the infrastructure exists, this is a **DOCUMENTATION + CONVENIENCE** task, not a code rewrite.

### Phase 1: Create Setup Documentation

**File:** `daopad_frontend/PLAYWRIGHT_AUTH_SETUP.md` (NEW)

```markdown
// PSEUDOCODE - Create comprehensive setup guide

# Playwright Authentication Setup Guide

## Quick Start (First Time Setup)

### Step 1: Run Manual Authentication Setup
Open a browser, log in with Internet Identity, and save your session:

\`\`\`bash
cd daopad_frontend
npx playwright test e2e/manual-auth-setup.spec.ts --headed
\`\`\`

**What happens:**
1. Browser opens to DAOPad app
2. Console shows instructions
3. Click "Connect Wallet" button
4. Log in with your Internet Identity
5. Wait for authentication to complete (Logout button appears)
6. Session automatically saves to `.auth/user.json`
7. Browser closes

**Expected Output:**
\`\`\`
🔐 Opening browser for manual authentication...
Instructions:
1. Browser will open to the DAOPad app
2. Click "Connect Wallet"
3. Login with your Internet Identity
...
✅ Authentication detected!
🎉 Authentication saved to .auth/user.json
\`\`\`

### Step 2: Run Tests
Once authentication is saved, all tests will use your session automatically:

\`\`\`bash
npx playwright test                # Run all tests
npx playwright test --headed       # See browser
npx playwright test --debug        # Debug mode
\`\`\`

## How It Works

1. **One-time setup:** `manual-auth-setup.spec.ts` saves your II session to `.auth/user.json`
2. **Auto-loading:** Playwright config loads `.auth/user.json` for all subsequent tests
3. **Persistent:** Session persists until you delete `.auth/user.json` or it expires

## File Structure
\`\`\`
.auth/
└── user.json          # Your saved Internet Identity session (gitignored)

e2e/
├── setup/
│   └── auth.setup.ts  # Alternative setup method (less user-friendly)
├── helpers/
│   └── auth.ts        # Helper functions (authenticateForTests, setupAuthentication)
└── manual-auth-setup.spec.ts  # 👈 USE THIS for first-time setup
\`\`\`

## Troubleshooting

### "No .auth/user.json found"
Run the manual setup:
\`\`\`bash
npx playwright test e2e/manual-auth-setup.spec.ts --headed
\`\`\`

### "Session expired" or "Not authenticated" errors
Delete the old session and re-authenticate:
\`\`\`bash
rm -rf .auth/
npx playwright test e2e/manual-auth-setup.spec.ts --headed
\`\`\`

### Want to use a different identity?
Delete `.auth/user.json` and run setup again:
\`\`\`bash
rm .auth/user.json
npx playwright test e2e/manual-auth-setup.spec.ts --headed
\`\`\`

## Advanced: Automated Setup (Headless)

For CI/CD or automated setups, use `auth.setup.ts`:
\`\`\`bash
npm run test:e2e:setup
\`\`\`

**Note:** This is less user-friendly for first-time setup because it doesn't show detailed instructions.
```

### Phase 2: Add Convenience Script

**File:** `daopad_frontend/setup-auth.sh` (NEW)

```bash
// PSEUDOCODE - Convenience script for auth setup

#!/bin/bash
set -e

echo "=================================================="
echo "Playwright Authentication Setup"
echo "=================================================="
echo ""

# Check if .auth/user.json already exists
if [ -f ".auth/user.json" ]; then
    echo "⚠️  Authentication already configured (.auth/user.json exists)"
    echo ""
    read -p "Do you want to re-authenticate? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing authentication. Exiting."
        exit 0
    fi
    echo "Removing old authentication..."
    rm -rf .auth/
fi

echo "Starting manual authentication setup..."
echo ""
echo "🔐 A browser will open. Please:"
echo "   1. Click 'Connect Wallet'"
echo "   2. Log in with your Internet Identity"
echo "   3. Wait for authentication to complete"
echo ""
echo "The session will be saved automatically."
echo ""
read -p "Press Enter to continue..."

# Run the manual auth setup
npx playwright test e2e/manual-auth-setup.spec.ts --headed

# Verify it worked
if [ -f ".auth/user.json" ]; then
    echo ""
    echo "=================================================="
    echo "✅ SUCCESS! Authentication configured."
    echo "=================================================="
    echo ""
    echo "You can now run Playwright tests:"
    echo "  npx playwright test"
    echo "  npx playwright test --headed"
    echo "  npx playwright test --debug"
    echo ""
else
    echo ""
    echo "=================================================="
    echo "❌ ERROR: Authentication setup failed"
    echo "=================================================="
    echo ""
    echo ".auth/user.json was not created."
    echo "Please try again or check the error messages above."
    exit 1
fi
```

Make executable:
```bash
chmod +x daopad_frontend/setup-auth.sh
```

### Phase 3: Update Main README

**File:** `daopad_frontend/README.md` (MODIFY - if exists)

Or create a new section in the existing README:

```markdown
// PSEUDOCODE - Add E2E testing section

## E2E Testing with Playwright

### First Time Setup

Before running E2E tests, you need to authenticate once:

\`\`\`bash
# Option 1: Use convenience script (recommended)
./setup-auth.sh

# Option 2: Run setup test directly
npx playwright test e2e/manual-auth-setup.spec.ts --headed
\`\`\`

See [PLAYWRIGHT_AUTH_SETUP.md](./PLAYWRIGHT_AUTH_SETUP.md) for detailed instructions.

### Running Tests

\`\`\`bash
npm run test:e2e              # Run all E2E tests
npm run test:e2e:headed       # See browser while testing
npm run test:e2e:debug        # Debug mode
\`\`\`

### Test Coverage
- Treasury integration (treasury.spec.ts)
- Public dashboard (app-route.spec.ts)
- More tests coming soon...
```

### Phase 4: Improve Error Messages (Optional)

**File:** `daopad_frontend/e2e/helpers/auth.ts` (MODIFY)

Add better error handling:

```typescript
// PSEUDOCODE - Enhance authenticateForTests with better errors

export async function authenticateForTests(page: Page) {
  // Check if .auth/user.json exists before navigating
  const authFilePath = '.auth/user.json';

  // Try to read auth file (Playwright config should have loaded it)
  // If it doesn't exist, show helpful error
  const fs = require('fs');
  const path = require('path');

  if (!fs.existsSync(path.join(__dirname, '../..', authFilePath))) {
    throw new Error(
      '\n❌ Authentication not configured!\n\n' +
      'Please run the authentication setup first:\n' +
      '  npx playwright test e2e/manual-auth-setup.spec.ts --headed\n\n' +
      'Or use the convenience script:\n' +
      '  ./setup-auth.sh\n\n' +
      'See PLAYWRIGHT_AUTH_SETUP.md for details.'
    );
  }

  // Auth already loaded by Playwright - just navigate
  await page.goto('/app', { waitUntil: 'networkidle' });

  // Verify auth was actually loaded
  const authPresent = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    return keys.some(k => k.includes('identity') || k.includes('ic-') || k.includes('delegation'));
  });

  if (!authPresent) {
    console.warn('⚠️  Warning: No IC identity found in localStorage');
    console.warn('    Session may have expired. Try re-running setup:');
    console.warn('    npx playwright test e2e/manual-auth-setup.spec.ts --headed');
  }

  await page.waitForTimeout(2000);
}
```

### Phase 5: Update playwright.config.ts (Optional)

**File:** `daopad_frontend/playwright.config.ts` (MODIFY)

Add storageState configuration:

```typescript
// PSEUDOCODE - Add storageState to config if .auth/user.json exists

import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');
const hasAuth = fs.existsSync(authFile);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],

  use: {
    baseURL: process.env.TEST_BASE_URL || 'https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Auto-load auth if available
    ...(hasAuth ? { storageState: authFile } : {})
  },

  projects: [
    // Setup project (runs first, creates .auth/user.json)
    // Only include if auth doesn't exist yet
    ...(hasAuth ? [] : [{
      name: 'setup',
      testMatch: /.*\.setup\.ts/
    }]),

    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-logging', '--v=1']
        }
      },
      // Depend on setup only if auth doesn't exist
      ...(hasAuth ? {} : { dependencies: ['setup'] })
    },
  ],

  timeout: 120000,
});
```

## Testing Plan

### Test the Setup Process

1. **Clean slate test:**
   ```bash
   cd daopad_frontend
   rm -rf .auth/
   ./setup-auth.sh
   # Manually log in when browser opens
   # Verify .auth/user.json is created
   ```

2. **Verify tests use auth:**
   ```bash
   npx playwright test e2e/treasury.spec.ts --headed
   # Should NOT show login prompt
   # Should be already authenticated
   ```

3. **Test convenience script:**
   ```bash
   ./setup-auth.sh
   # Should detect existing auth
   # Should ask before re-authenticating
   ```

4. **Test error handling:**
   ```bash
   rm .auth/user.json
   npx playwright test e2e/treasury.spec.ts
   # Should show helpful error message
   # Should tell user to run setup
   ```

### Verification Checklist

- [ ] `PLAYWRIGHT_AUTH_SETUP.md` created with comprehensive guide
- [ ] `setup-auth.sh` created and executable
- [ ] README updated with E2E testing section
- [ ] Error messages improved in `helpers/auth.ts`
- [ ] `playwright.config.ts` auto-detects auth file
- [ ] Manual setup works (browser opens, user logs in, session saves)
- [ ] Tests automatically use saved session
- [ ] Convenience script detects existing auth
- [ ] Error messages helpful when auth missing

## Deliverables

1. **Documentation:**
   - `PLAYWRIGHT_AUTH_SETUP.md` - Comprehensive setup guide
   - Updated `README.md` - E2E testing quick start

2. **Convenience Tools:**
   - `setup-auth.sh` - Interactive setup script
   - Improved error messages in `helpers/auth.ts`

3. **Configuration:**
   - Updated `playwright.config.ts` - Auto-load auth

## Success Criteria

**User can:**
1. Run `./setup-auth.sh` or the manual setup test
2. Log in once with Internet Identity
3. Run all E2E tests without re-authenticating
4. Get clear error messages if auth is missing
5. Re-authenticate easily by deleting `.auth/user.json`

**Developer experience:**
- Setup takes < 2 minutes
- Clear instructions at every step
- No confusion about how to authenticate
- Easy to switch identities

## Implementation Notes

**No Code Changes to Existing Tests:**
- Current `manual-auth-setup.spec.ts` works perfectly ✅
- Current `helpers/auth.ts` functions work ✅
- Tests already use `authenticateForTests()` correctly ✅

**Changes Are Additive:**
- New documentation files
- New convenience script
- Enhanced error messages
- Improved config auto-detection

**Maintains Existing Patterns:**
- Still uses `.auth/user.json` for storage
- Still uses Internet Identity
- Still uses Playwright's `storageState`
- Still works with existing test suite

## Timeline

**Estimated Implementation:** 30-45 minutes
1. Write documentation: 15 min
2. Create convenience script: 10 min
3. Update config/helpers: 10 min
4. Test setup process: 10 min

## Dependencies

**None** - All infrastructure exists:
- ✅ Playwright installed
- ✅ Manual auth setup test exists
- ✅ Helper functions exist
- ✅ Tests use authentication
- ✅ `.auth/` gitignored

**Only Missing:**
- Documentation
- Convenience script
- Better error messages
