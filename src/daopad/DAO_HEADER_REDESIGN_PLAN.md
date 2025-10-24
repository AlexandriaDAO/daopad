# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-header-redesign/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-header-redesign/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes:
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[UI]: Redesign DAO header with responsive navigation and real token names"
   git push -u origin feature/header-redesign
   gh pr create --title "[UI]: Redesign DAO Header & Navigation" --body "Implements DAO_HEADER_REDESIGN_PLAN.md

## Summary
- ✅ Display real token names (from metadata) instead of canister ID prefix
- ✅ Responsive navigation tabs (mobile + desktop)
- ✅ Unified styling using shadcn Tabs component
- ✅ Better spacing and layout (no excessive whitespace)
- ✅ Mobile-first design with proper wrapping

## Test Plan
- [ ] Manual: Verify /dao/ysy5f-2qaaa-aaaap-qkmmq-cai shows 'ALEX DAO' not 'YSY5F DAO'
- [ ] Manual: Test mobile view (tabs wrap or scroll)
- [ ] Manual: Test desktop view (proper spacing)
- [ ] Playwright: Run e2e/dao-header.spec.ts (NEW test file)"
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

**Branch:** `feature/header-redesign`
**Worktree:** `/home/theseus/alexandria/daopad-header-redesign/src/daopad`

---

# Implementation Plan

## Problem Statement

The DAO dashboard header has several UX issues:
1. **Wrong token name**: Shows "YSY5F DAO" (first 5 chars of canister ID) instead of real token name
2. **Mobile overflow**: Tabs don't wrap, overflow off screen
3. **Poor tab styling**: Simple border-bottom, not button-like
4. **Excessive whitespace**: Desktop layout has too much empty space
5. **Code duplication**: DaoLayout uses custom tabs, TokenDashboard uses shadcn Tabs

## Current State Documentation

### File Tree (Affected Files)

```
daopad_frontend/src/
├── routes/
│   └── DaoRoute.tsx                 # MODIFY - fetch real token metadata
├── components/
│   └── dao/
│       └── DaoLayout.tsx            # MODIFY - redesign header + tabs
└── e2e/
    └── dao-header.spec.ts           # NEW - Playwright test
```

### Existing Implementation

**File**: `daopad_frontend/src/routes/DaoRoute.tsx` (lines 91-103)
```typescript
// Current: Falls back to first 5 chars of canister ID
if (metadataResult.success && metadataResult.data) {
  setToken({
    canister_id: tokenId,
    symbol: metadataResult.data.symbol || tokenId.slice(0, 5).toUpperCase(), // ❌
    name: metadataResult.data.name || 'Token'                                 // ❌
  });
} else {
  // Fallback for anonymous or failed metadata
  setToken({
    canister_id: tokenId,
    symbol: tokenId.slice(0, 5).toUpperCase(), // ❌ This creates "YSY5F"
    name: 'Token'
  });
}
```

**File**: `daopad_frontend/src/components/dao/DaoLayout.tsx` (lines 88-112)
```tsx
{/* Current tabs: Simple flex layout, no wrapping */}
<nav className="border-b border-executive-mediumGray bg-executive-darkGray">
  <div className="container mx-auto px-4">
    <div className="flex gap-2">  {/* ❌ No wrap, overflows on mobile */}
      <TabLink to={`/dao/${tokenId}`} active={isOverview}>
        Overview
      </TabLink>
      {/* ... 5 more tabs ... */}
    </div>
  </div>
</nav>

{/* Custom TabLink component (lines 139-154) */}
function TabLink({ to, active, children }: TabLinkProps) {
  return (
    <Link
      to={to}
      className={`
        px-4 py-3 border-b-2 transition-colors  {/* ❌ Minimal styling */}
        ${active ? 'border-executive-gold text-executive-gold' : '...'}
      `}
    >
      {children}
    </Link>
  );
}
```

**File**: `daopad_frontend/src/components/TokenDashboard.tsx` (lines 425-433)
```tsx
{/* Better implementation: Uses shadcn Tabs */}
<TabsList variant="executive" className="flex-1 grid grid-cols-5">
  <TabsTrigger variant="executive" value="agreement">Agreement</TabsTrigger>
  <TabsTrigger variant="executive" value="accounts">Treasury</TabsTrigger>
  {/* ... */}
</TabsList>
```

### Dependencies and Constraints

1. **Token metadata is already fetched** in DaoRoute.tsx (line 45-58) but fallback is too aggressive
2. **shadcn Tabs component** exists and is already used in TokenDashboard
3. **ICRC-1 token standard**: `symbol` = short (3-6 chars), `name` = full name
4. **Anonymous users**: Metadata fetch can fail, need graceful fallback
5. **Responsive breakpoints**: Tailwind `sm:` (640px), `md:` (768px), `lg:` (1024px)

## Implementation Plan (PSEUDOCODE)

### 1. Backend: Ensure Token Metadata is Available (NO CHANGES NEEDED)

✅ **Already implemented**: DaoRoute.tsx fetches metadata via `tokenService.getTokenMetadata()`

### 2. Frontend: Fix Token Name Fallback Logic

**File**: `daopad_frontend/src/routes/DaoRoute.tsx` (MODIFY lines 91-103)

```typescript
// PSEUDOCODE: Better fallback logic
if (metadataResult.success && metadataResult.data) {
  // ✅ Use real metadata
  setToken({
    canister_id: tokenId,
    symbol: metadataResult.data.symbol,        // "ALEX" not "YSY5F"
    name: metadataResult.data.name             // "Alexandria DAO" not "Token"
  });
} else {
  // ✅ Fallback: Use canister ID for symbol but show "DAO" not partial ID
  const shortId = tokenId.slice(0, 8); // Show more chars for clarity
  setToken({
    canister_id: tokenId,
    symbol: shortId.toUpperCase(),
    name: `${shortId.toUpperCase()} DAO`  // "YSY5F-2Q DAO" - clearer fallback
  });
}
```

### 3. Frontend: Redesign DaoLayout Header

**File**: `daopad_frontend/src/components/dao/DaoLayout.tsx` (MODIFY lines 34-86)

```tsx
// PSEUDOCODE: Improved header with better spacing
return (
  <div className="min-h-screen bg-executive-charcoal text-executive-lightGray">
    {/* Gold trim line (keep as-is) */}
    <div className="h-1 bg-gradient-to-r from-transparent via-executive-gold to-transparent"></div>

    {/* REDESIGNED HEADER */}
    <header className="border-b border-executive-mediumGray bg-executive-darkGray">
      <div className="container mx-auto px-4 lg:px-6 max-w-7xl"> {/* ✅ Add max-width */}
        {/* Back button row */}
        <div className="py-4">
          <Link to="/app" className="text-executive-gold hover:text-executive-goldLight inline-flex items-center gap-2">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Main header content - responsive grid */}
        <div className="pb-6 grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">

          {/* Left: Token info */}
          <div>
            <h1 className="text-2xl md:text-3xl font-display text-executive-ivory tracking-wide">
              {token.name} {/* ✅ Full name: "Alexandria DAO" */}
            </h1>
            <div className="h-px bg-executive-gold w-16 mt-2"></div>
            <p className="text-xs md:text-sm text-executive-lightGray/70 mt-2 font-mono break-all">
              {token.canister_id}
            </p>
          </div>

          {/* Center: Orbit Station status */}
          {orbitStation && (
            <div className="flex flex-col items-start lg:items-center">
              <p className="text-xs text-green-600 font-mono break-all">
                ✓ Treasury: {orbitStation.station_id}
              </p>
            </div>
          )}

          {/* Right: Voting power */}
          {votingPower > 0 && (
            <div className="flex items-center gap-2 lg:justify-end">
              <Badge variant={votingPower >= 10000 ? "default" : "secondary"}>
                {loadingVotingPower ? "Loading VP..." : `${votingPower.toLocaleString()} VP${votingPower >= 10000 ? " ✓" : ""}`}
              </Badge>
              {refreshVotingPower && (
                <Button variant="ghost" size="sm" onClick={refreshVotingPower} disabled={loadingVotingPower} className="h-6 w-6 p-0">
                  <RefreshCw className={`h-3 w-3 ${loadingVotingPower ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>

    {/* Continue with tabs below... */}
```

### 4. Frontend: Replace Custom Tabs with shadcn Tabs

**File**: `daopad_frontend/src/components/dao/DaoLayout.tsx` (MODIFY lines 88-154)

```tsx
// PSEUDOCODE: Use shadcn Tabs component for consistency
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// In render function (replace lines 88-112):
{/* Tab navigation - REDESIGNED */}
<div className="border-b border-executive-mediumGray bg-executive-darkGray">
  <div className="container mx-auto px-4 lg:px-6 max-w-7xl">
    {/* Mobile: Scrollable tabs */}
    {/* Desktop: Grid layout tabs */}
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex sm:flex sm:flex-wrap gap-1 min-w-full sm:min-w-0">
        <TabButton to={`/dao/${tokenId}`} active={isOverview}>
          Overview
        </TabButton>
        <TabButton to={`/dao/${tokenId}/agreement`} active={currentTab === 'agreement'}>
          Agreement
        </TabButton>
        <TabButton to={`/dao/${tokenId}/treasury`} active={currentTab === 'treasury'}>
          Treasury
        </TabButton>
        <TabButton to={`/dao/${tokenId}/activity`} active={currentTab === 'activity'}>
          Activity
        </TabButton>
        <TabButton to={`/dao/${tokenId}/canisters`} active={currentTab === 'canisters'}>
          Canisters
        </TabButton>
        <TabButton to={`/dao/${tokenId}/settings`} active={currentTab === 'settings'}>
          Settings
        </TabButton>
      </div>
    </div>
  </div>
</div>

// Replace TabLink component (lines 139-154) with better styled version:
interface TabButtonProps {
  to: string;
  active: boolean;
  children: React.ReactNode;
}

function TabButton({ to, active, children }: TabButtonProps) {
  return (
    <Link
      to={to}
      className={`
        whitespace-nowrap px-4 py-3 text-sm font-medium transition-all
        rounded-t-md border-b-2
        ${active
          ? 'bg-executive-mediumGray/30 border-executive-gold text-executive-gold'
          : 'border-transparent text-executive-lightGray/70 hover:text-executive-gold hover:bg-executive-mediumGray/10 hover:border-executive-gold/50'
        }
      `}
    >
      {children}
    </Link>
  );
}
```

### 5. Frontend: Improve Main Content Area

**File**: `daopad_frontend/src/components/dao/DaoLayout.tsx` (MODIFY line 115)

```tsx
// PSEUDOCODE: Add max-width to content area
<main className="container mx-auto px-4 lg:px-6 max-w-7xl py-8"> {/* ✅ Match header max-width */}
  {children}
</main>
```

### 6. Testing: Create Playwright Test

**File**: `daopad_frontend/e2e/dao-header.spec.ts` (NEW FILE)

```typescript
// PSEUDOCODE: Test token name display and responsive tabs
import { test, expect } from '@playwright/test';

const BASE_URL = 'https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io';
const ALEX_TOKEN_ID = 'ysy5f-2qaaa-aaaap-qkmmq-cai';

test.describe('DAO Header & Navigation', () => {

  test('should display real token name instead of canister ID prefix', async ({ page }) => {
    // PSEUDOCODE:
    // 1. Navigate to /dao/ysy5f-2qaaa-aaaap-qkmmq-cai
    // 2. Wait for header to load
    // 3. Verify h1 contains "Alexandria" or "ALEX" (not "YSY5F")
    // 4. Verify canister ID is still shown (but not as title)

    await page.goto(`${BASE_URL}/dao/${ALEX_TOKEN_ID}`);

    const heading = page.locator('h1');
    await expect(heading).toBeVisible({ timeout: 15000 });

    const headingText = await heading.textContent();
    expect(headingText).not.toContain('YSY5F'); // ❌ Old behavior
    expect(headingText).toMatch(/ALEX|Alexandria/i); // ✅ New behavior

    // Canister ID should still be visible somewhere
    await expect(page.getByText(ALEX_TOKEN_ID)).toBeVisible();
  });

  test('should show all navigation tabs', async ({ page }) => {
    // PSEUDOCODE:
    // 1. Navigate to DAO page
    // 2. Verify all 6 tabs are visible (Overview, Agreement, Treasury, Activity, Canisters, Settings)

    await page.goto(`${BASE_URL}/dao/${ALEX_TOKEN_ID}`);

    await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Agreement' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Treasury' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Activity' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Canisters' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
  });

  test('should highlight active tab', async ({ page }) => {
    // PSEUDOCODE:
    // 1. Navigate to /dao/ysy5f.../treasury
    // 2. Verify Treasury tab has active styling
    // 3. Navigate to /dao/ysy5f.../settings
    // 4. Verify Settings tab has active styling, Treasury does not

    await page.goto(`${BASE_URL}/dao/${ALEX_TOKEN_ID}/treasury`);

    const treasuryTab = page.getByRole('link', { name: 'Treasury' });
    await expect(treasuryTab).toHaveClass(/border-executive-gold/);

    await page.goto(`${BASE_URL}/dao/${ALEX_TOKEN_ID}/settings`);

    const settingsTab = page.getByRole('link', { name: 'Settings' });
    await expect(settingsTab).toHaveClass(/border-executive-gold/);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // PSEUDOCODE:
    // 1. Set viewport to mobile size (375x667)
    // 2. Navigate to DAO page
    // 3. Verify tabs are scrollable (overflow-x-auto)
    // 4. Verify header stacks vertically

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/dao/${ALEX_TOKEN_ID}`);

    // All tabs should be visible (scrollable container)
    const tabContainer = page.locator('nav').first();
    await expect(tabContainer).toBeVisible();

    // Check if we can scroll to last tab
    const settingsTab = page.getByRole('link', { name: 'Settings' });
    await settingsTab.scrollIntoViewIfNeeded();
    await expect(settingsTab).toBeVisible();
  });
});
```

## Testing Requirements

### Manual Testing (BEFORE Playwright)

**Workflow**:
1. Deploy to mainnet: `./deploy.sh --network ic --frontend-only`
2. Open browser to: `https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai`
3. **Desktop view** (1920x1080):
   - [ ] Header shows "Alexandria DAO" or similar (NOT "YSY5F DAO")
   - [ ] Canister ID visible but not as title
   - [ ] Tabs display in single row
   - [ ] No excessive whitespace (content max-width ~1280px)
   - [ ] Clicking tabs navigates correctly
4. **Mobile view** (375x667):
   - [ ] Header stacks vertically
   - [ ] Tabs are scrollable horizontally
   - [ ] All 6 tabs accessible via scroll
   - [ ] Active tab highlighted
5. **Console errors**:
   ```bash
   # Open DevTools Console, filter for errors
   # Should see NO errors related to token metadata or rendering
   ```

### Exit Criteria

Stop iterating when:
- ✅ Token name shows real metadata (not canister ID prefix)
- ✅ Tabs wrap/scroll on mobile (no overflow)
- ✅ Desktop has reasonable max-width (no excessive whitespace)
- ✅ All 6 tabs clickable and highlight when active
- ✅ No console errors on page load
- ✅ Playwright tests pass (4/4)

### Playwright Test Execution

**After manual verification passes**:

```bash
cd daopad_frontend
npx playwright test e2e/dao-header.spec.ts --project=chromium

# Expected output:
# ✓ should display real token name instead of canister ID prefix (12s)
# ✓ should show all navigation tabs (8s)
# ✓ should highlight active tab (10s)
# ✓ should be responsive on mobile viewport (9s)
#
# 4 passed (39s)
```

### Iteration Loop

```bash
# ITERATION PATTERN:
for i in 1..5; do
  echo "Iteration $i"

  # 1. Fix issues from previous iteration
  vim daopad_frontend/src/components/dao/DaoLayout.tsx

  # 2. Deploy
  ./deploy.sh --network ic --frontend-only

  # 3. Manual check (10 min cooldown for IC deployment)
  sleep 600
  echo "Opening browser for manual test..."
  # Check: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/dao/ysy5f-2qaaa-aaaap-qkmmq-cai

  # 4. Check console errors
  echo "Open DevTools > Console. Any errors?"
  read -p "Continue? (y/n) " response
  [[ "$response" != "y" ]] && break

  # 5. Run Playwright
  cd daopad_frontend
  npx playwright test e2e/dao-header.spec.ts --project=chromium

  # 6. Evaluate
  if [[ all tests pass && no console errors ]]; then
    echo "✅ SUCCESS - All tests pass"
    break
  fi

  echo "Issues found, continuing to next iteration..."
done
```

### Common Console Errors to Check

```javascript
// ❌ BAD - Would indicate metadata fetch failing
"Failed to fetch token metadata"
"Cannot read property 'symbol' of undefined"
"TypeError: metadataResult.data is null"

// ✅ GOOD - No errors, or only warnings
// (no critical errors related to token display)
```

## Implementation Checklist

- [ ] Update DaoRoute.tsx fallback logic for better token names
- [ ] Redesign DaoLayout header with responsive grid
- [ ] Replace custom TabLink with better styled TabButton
- [ ] Add max-width constraints (max-w-7xl) to header and content
- [ ] Create Playwright test file (dao-header.spec.ts)
- [ ] Deploy to mainnet
- [ ] Manual verification (desktop + mobile)
- [ ] Run Playwright tests
- [ ] Fix any issues found
- [ ] Commit and push
- [ ] Create PR

## Success Metrics

**User Experience**:
- Token name is human-readable (not "YSY5F DAO")
- Mobile tabs don't overflow screen
- Desktop layout is balanced (not too wide)
- Tab navigation is clear and responsive

**Technical**:
- Zero console errors on page load
- 100% Playwright test pass rate (4/4)
- No layout shifts or hydration errors
- Consistent styling with TokenDashboard tabs

## Notes

- **Performance**: No impact expected (metadata already fetched, just using it better)
- **Accessibility**: Link elements with proper role, keyboard navigation works
- **Browser support**: Tailwind classes are widely supported (flexbox, grid)
- **Backwards compatibility**: All existing routes work, just better UX
