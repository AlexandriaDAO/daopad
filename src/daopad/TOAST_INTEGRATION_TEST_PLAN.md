# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-toast-integration-test/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-toast-integration-test/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes:
     ```bash
     cd daopad_frontend
     npm run build
     cd ..
     ./deploy.sh --network ic --frontend-only
     ```
4. **Run integration test**:
   ```bash
     node daopad_frontend/test-toast-integration.mjs
     ```
5. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "feat: Add Toast Integration Tests and Cache-Busting

- Add automated toast API integration tests
- Force cache invalidation with service worker update
- Verify sonner toast API usage in production
- Add deployment verification script"
   git push -u origin feature/toast-integration-test
   gh pr create --title "feat: Toast Integration Tests and Cache-Busting" --body "Implements TOAST_INTEGRATION_TEST_PLAN.md

Adds automated testing to verify toast API fixes are properly deployed:
- Integration tests for toast API usage
- Cache-busting mechanism to force browser reload
- Deployment verification script
- Automated validation of sonner API compliance"
   ```
6. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view --json comments`
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

**Branch:** `feature/toast-integration-test`
**Worktree:** `/home/theseus/alexandria/daopad-toast-integration-test/src/daopad`

---

# Toast Integration Test and Cache-Busting Plan

## Problem Statement

**Issue:** Users report React error #31 when clicking transfer buttons, even after toast API fixes were deployed.

**Error Message:**
```
Error: Minified React error #31; visit https://reactjs.org/docs/error-decoder.html?invariant=31&args[]=object%20with%20keys%20%7Bvariant%2C%20title%2C%20description%7D
    at AccountsTable.jsx:84
```

**Root Cause:**
1. ✅ Code fix is correct (toast.error() syntax)
2. ❌ Browser cache serving old JavaScript bundles
3. ❌ No automated verification that deployed code matches source

## Current State

### Fixed Files (already merged)
All 11 files use correct sonner toast API:
- `daopad_frontend/src/components/tables/AccountsTable.jsx:84`
- `daopad_frontend/src/pages/RequestsPage.jsx:185,190`
- `daopad_frontend/src/components/orbit/AssetDialog.jsx:142`
- `daopad_frontend/src/components/orbit/ExternalCanisterDialog.jsx:112,186`
- `daopad_frontend/src/components/orbit/TransferDialog.jsx:123,130`
- `daopad_frontend/src/components/orbit/ExternalCanistersPage.jsx:117`
- `daopad_frontend/src/components/orbit/TransferRequestDialog.jsx:88,122`
- `daopad_frontend/src/components/orbit/OrbitRequestsList.jsx:87,94,100,116,123,129`
- `daopad_frontend/src/components/orbit/AssetsPage.jsx:117,122,131`
- `daopad_frontend/src/components/orbit/AccountSetupDialog.jsx:122,135`
- `daopad_frontend/src/components/orbit/requests/RequestDialog.jsx:99,111,129,139`

### Deployment Issue
**Observed:** Error stack shows `AppRoute-CiW-JL1V.js` (old hash)
**Expected:** Should load `AppRoute-ChqREScL.js` (new hash)
**Cause:** Browser cache + no cache-busting strategy

## Implementation Plan

### 1. Add Integration Test Script

**File:** `daopad_frontend/test-toast-integration.mjs` (NEW)

```javascript
// PSEUDOCODE
import { readFileSync } from 'fs';
import { glob } from 'glob';

async function testToastSyntax() {
  // Find all JSX files in components/
  const files = glob.sync('src/**/*.{jsx,tsx}');

  let errors = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf8');

    // Check for old shadcn/ui toast syntax
    const oldSyntax = /toast\(\{\s*(variant|title|description):/g;
    const matches = content.matchAll(oldSyntax);

    for (const match of matches) {
      // Verify it's not a comment or in a different context
      if (!isInComment(match.index, content)) {
        errors.push({
          file: file,
          line: getLineNumber(match.index, content),
          match: match[0]
        });
      }
    }

    // Verify correct sonner syntax is present if useToast is imported
    if (content.includes('useToast')) {
      // Should have toast.error(), toast.success(), etc.
      const hasSonnerSyntax = /toast\.(error|success|warning|info)\(/.test(content);

      if (!hasSonnerSyntax && content.includes('toast(')) {
        errors.push({
          file: file,
          type: 'missing-sonner-syntax',
          message: 'File imports useToast but doesn\'t use sonner API'
        });
      }
    }
  }

  // Report results
  if (errors.length > 0) {
    console.error('❌ Toast API errors found:');
    errors.forEach(err => console.error(err));
    process.exit(1);
  } else {
    console.log('✅ All toast API calls use correct sonner syntax');
  }
}

function isInComment(index, content) {
  // Check if match is inside // comment or /* */ block
  // PSEUDOCODE logic here
}

function getLineNumber(index, content) {
  // Count newlines before index
  return content.substring(0, index).split('\n').length;
}

testToastSyntax();
```

### 2. Add Cache-Busting Mechanism

**File:** `daopad_frontend/public/service-worker.js` (NEW)

```javascript
// PSEUDOCODE
const CACHE_VERSION = 'v2'; // Increment on each deploy
const CACHE_NAME = `daopad-${CACHE_VERSION}`;

self.addEventListener('install', (event) => {
  // Force immediate activation
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // Delete old caches
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );

  // Take control immediately
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network-first strategy for JS bundles
  if (event.request.url.includes('/assets/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the new version
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(event.request);
        })
    );
  }
});
```

### 3. Register Service Worker

**File:** `daopad_frontend/src/main.jsx` (MODIFY)

```javascript
// PSEUDOCODE - Add after ReactDOM.render
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('SW registered:', registration);

        // Check for updates every 5 minutes
        setInterval(() => {
          registration.update();
        }, 5 * 60 * 1000);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}
```

### 4. Add Deployment Verification Script

**File:** `daopad_frontend/verify-deployment.mjs` (NEW)

```javascript
// PSEUDOCODE
import https from 'https';

async function verifyDeployment() {
  const url = 'https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io';

  // Fetch index.html
  const html = await fetch(url).then(r => r.text());

  // Extract JS bundle hash from script tags
  const scriptMatch = html.match(/AppRoute-([a-zA-Z0-9]+)\.js/);

  if (!scriptMatch) {
    console.error('❌ Could not find AppRoute bundle in deployed HTML');
    process.exit(1);
  }

  const deployedHash = scriptMatch[1];

  // Read local dist/index.html
  const localHtml = readFileSync('dist/index.html', 'utf8');
  const localMatch = localHtml.match(/AppRoute-([a-zA-Z0-9]+)\.js/);

  if (!localMatch) {
    console.error('❌ Could not find AppRoute bundle in local build');
    process.exit(1);
  }

  const localHash = localMatch[1];

  if (deployedHash === localHash) {
    console.log(`✅ Deployment verified! Bundle hash: ${deployedHash}`);
  } else {
    console.error(`❌ Deployment mismatch!`);
    console.error(`   Deployed: AppRoute-${deployedHash}.js`);
    console.error(`   Local:    AppRoute-${localHash}.js`);
    console.error(`   → Browser may be caching old version`);
    console.error(`   → Users should hard refresh (Ctrl+Shift+R)`);
    process.exit(1);
  }
}

verifyDeployment();
```

### 5. Update Vite Config for Better Cache Busting

**File:** `daopad_frontend/vite.config.js` (MODIFY)

```javascript
// PSEUDOCODE
export default defineConfig({
  // Existing config...

  build: {
    rollupOptions: {
      output: {
        // Add timestamp to chunk names for better cache busting
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}[extname]`
      }
    }
  }
});
```

### 6. Update package.json Scripts

**File:** `daopad_frontend/package.json` (MODIFY)

```json
// PSEUDOCODE
{
  "scripts": {
    "build": "vite build",
    "test:toast": "node test-toast-integration.mjs",
    "verify:deployment": "node verify-deployment.mjs",
    "prebuild": "npm run test:toast"
  }
}
```

## Testing Strategy

### Pre-Deployment Tests
```bash
cd daopad_frontend

# 1. Test toast syntax compliance
npm run test:toast
# Expected: ✅ All toast API calls use correct sonner syntax

# 2. Build with new cache-busting
npm run build
# Expected: dist/ contains files with timestamps

# 3. Verify service worker is included
ls -la dist/service-worker.js
# Expected: File exists
```

### Post-Deployment Tests
```bash
# 1. Deploy to mainnet
./deploy.sh --network ic --frontend-only

# 2. Verify deployment matches build
cd daopad_frontend
npm run verify:deployment
# Expected: ✅ Deployment verified! Bundle hash: [hash]

# 3. Manual browser test
# - Open: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io
# - Hard refresh: Ctrl+Shift+R (clears cache)
# - Open DevTools Console
# - Check: "SW registered:" message
# - Navigate to Treasury tab
# - Click transfer button on any account
# - Expected: Transfer dialog opens without errors
```

### Integration Test Verification
```bash
# In browser DevTools Console:

# 1. Check service worker is active
navigator.serviceWorker.getRegistration().then(reg => console.log('SW:', reg))
# Expected: ServiceWorkerRegistration object

# 2. Verify cache version
caches.keys().then(keys => console.log('Caches:', keys))
# Expected: ['daopad-v2']

# 3. Check loaded bundle hash
performance.getEntriesByType('resource')
  .find(e => e.name.includes('AppRoute'))
  .name
# Expected: Should match deployed hash

# 4. Test toast API directly
const { toast } = window.__TOAST_FOR_TESTING__
toast.error('Test error', { description: 'Should work' })
# Expected: Toast appears with error styling
```

## Success Criteria

- [ ] Integration test script passes locally
- [ ] Service worker registered successfully
- [ ] Cache version increments on deploy
- [ ] Deployment verification passes
- [ ] Browser loads correct bundle hash
- [ ] Transfer button opens dialog without errors
- [ ] Toast appears with correct sonner styling
- [ ] No React error #31 in console

## Files Modified

**New Files:**
- `daopad_frontend/test-toast-integration.mjs`
- `daopad_frontend/verify-deployment.mjs`
- `daopad_frontend/public/service-worker.js`

**Modified Files:**
- `daopad_frontend/src/main.jsx` (add SW registration)
- `daopad_frontend/vite.config.js` (improve cache busting)
- `daopad_frontend/package.json` (add test scripts)

## Deployment Instructions

```bash
# 1. Build with tests
cd daopad_frontend
npm run build

# 2. Verify build passed tests
# (prebuild script runs test:toast automatically)

# 3. Deploy
cd ..
./deploy.sh --network ic --frontend-only

# 4. Verify deployment
cd daopad_frontend
npm run verify:deployment

# 5. Announce to users
echo "📢 New version deployed. Please hard refresh (Ctrl+Shift+R) to clear cache."
```

## Rollback Plan

If issues occur:
```bash
# 1. Remove service worker
rm daopad_frontend/public/service-worker.js

# 2. Remove SW registration from main.jsx
# (Comment out navigator.serviceWorker.register)

# 3. Rebuild and redeploy
npm run build
./deploy.sh --network ic --frontend-only
```

## Future Improvements

1. **Add E2E tests** with Playwright to automate browser testing
2. **Add CI/CD checks** to run integration tests before merge
3. **Implement cache headers** at CDN level for better control
4. **Add version banner** in UI to show deployed version number
5. **Automated smoke tests** post-deployment

---

## Notes

- **Browser cache issue is common** when deploying frontend-only updates to IC canisters
- **Service workers** provide better cache control than relying on IC's CDN
- **Integration tests** prevent regressions by validating syntax automatically
- **Deployment verification** catches cache/sync issues before users report them
