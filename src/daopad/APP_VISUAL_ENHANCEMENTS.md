# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-visual-flair/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-visual-flair/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes only:
     ```bash
     cd /home/theseus/alexandria/daopad-visual-flair/src/daopad
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "feat: Add subtle visual enhancements to /app route

- Add golden accents and gradients to cards and headers
- Implement hover effects and subtle animations
- Add decorative elements (dividers, corner accents)
- Maintain premium professional aesthetic
- Enhance visual hierarchy without sacrificing readability

🤖 Generated with Claude Code (https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
   git push -u origin feature/app-visual-enhancements
   gh pr create --title "feat: Add Visual Enhancements to /app Route" --body "Implements APP_VISUAL_ENHANCEMENTS.md

## Summary
- Adds subtle golden accents and gradients throughout /app route pages
- Implements professional hover effects and micro-animations
- Enhances visual hierarchy with decorative elements
- Maintains premium feel consistent with homepage

## Changes
- Enhanced DashboardPage with golden accents on metric cards
- Added hover effects and gradients to all cards
- Implemented corner accents and decorative dividers
- Enhanced AddressBookPage and other pages with subtle flair
- Updated PageLayout with optional golden header treatment

## Testing
- [ ] Verify visual consistency across all /app pages
- [ ] Test hover effects and animations
- [ ] Check dark mode compatibility
- [ ] Validate no regression in functionality
- [ ] Deploy to mainnet IC and verify live

🤖 Generated with Claude Code"
   ```
5. **Iterate autonomously**:
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

**Branch:** `feature/app-visual-enhancements`
**Worktree:** `/home/theseus/alexandria/daopad-visual-flair/src/daopad`

---

# Implementation Plan: Subtle Visual Enhancements for /app Route

## Current State Analysis

### Homepage (/) Styling Features
**File:** `daopad_frontend/src/routes/Homepage.jsx`

The homepage showcases premium executive styling:
- **Golden trim header:** Line 24 - `<div className="h-1 bg-gradient-to-r from-transparent via-executive-gold to-transparent"></div>`
- **Animated timeline:** Lines 56-126 - Golden connection line with pulsing dots
- **Glowing effects:** Line 100 - `<div className="absolute inset-0 bg-executive-gold/20 blur-xl animate-pulse"></div>`
- **Golden badges:** Line 31 - `className="bg-executive-gold/20 text-executive-goldLight border-executive-gold/30"`
- **Gradient cards:** Line 224 - `className="bg-gradient-to-br from-executive-gold/10 to-executive-darkGray/50 border-2 border-executive-gold/50"`
- **Decorative dividers:** Lines 276-278 - Horizontal lines with diamond separator
- **Custom animations:** Lines 131-160 - Fade-in sequences, pulse effects
- **Executive watermark:** Lines 268-272 - Subtle background circular seal

**Color Palette (tailwind.config.cjs:54-64):**
```javascript
executive: {
  charcoal: '#1a1a1a',    // Main background
  darkGray: '#2d2d2d',    // Card background
  mediumGray: '#3a3a3a',  // Borders
  lightGray: '#e8e8e8',   // Text
  ivory: '#f8f6f1',       // Headings
  gold: '#d4af37',        // Primary accent
  goldLight: '#e6c757',   // Hover states
  goldDark: '#b8941f',    // Dark accents
}
```

### /app Route Current State
**Files:**
- `daopad_frontend/src/routes/AppRoute.jsx` (Header - already has golden trim at line 167)
- `daopad_frontend/src/pages/DashboardPage.jsx`
- `daopad_frontend/src/pages/AddressBookPage.jsx`
- `daopad_frontend/src/pages/RequestsPage.jsx`
- `daopad_frontend/src/pages/PermissionsPage.jsx`

**Current Issues:**
1. **Flat cards:** Standard shadcn/ui cards with no gradients or golden accents
2. **No hover effects:** Static buttons and cards
3. **Plain headers:** Card headers lack decorative elements
4. **No micro-animations:** Missing subtle transitions
5. **Bland metric cards:** DashboardPage metric cards (lines 154-182) are plain
6. **No visual hierarchy:** Everything has equal visual weight
7. **Missing golden accents:** No use of executive-gold colors except in header

## Design Goals

### Principles
1. **Subtle, not flashy:** Enhancements should feel discovered, not imposed
2. **Professional first:** Never sacrifice readability or usability
3. **Consistent with brand:** Use existing executive color palette
4. **Performance conscious:** Lightweight CSS-only effects
5. **Accessibility maintained:** All changes must preserve contrast ratios

### Enhancement Categories
1. **Golden Accents:** Strategic use of gold borders, dividers, and highlights
2. **Gradients:** Subtle background gradients on interactive elements
3. **Hover Effects:** Smooth transitions on cards and buttons
4. **Micro-animations:** Fade-ins and gentle pulses
5. **Decorative Elements:** Corner accents, dividers, and borders

## Implementation Plan

### 1. Create Reusable Styled Components

**File:** `daopad_frontend/src/components/ui/executive-card.jsx` (NEW)

```javascript
// PSEUDOCODE
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { cn } from '@/lib/utils';

// Enhanced card with golden accent option
export function ExecutiveCard({ children, variant = 'default', hover = true, className, ...props }) {
  return (
    <Card className={cn(
      // Base styles
      "relative overflow-hidden",

      // Variant styles
      variant === 'gold' && [
        "border-executive-gold/30",
        "bg-gradient-to-br from-executive-gold/5 to-transparent"
      ],
      variant === 'gold-highlight' && [
        "border-executive-gold/50",
        "bg-gradient-to-br from-executive-gold/10 to-executive-darkGray/50"
      ],

      // Hover effects
      hover && "transition-all duration-300 hover:border-executive-gold/50 hover:shadow-lg hover:shadow-executive-gold/10",

      className
    )} {...props}>
      {/* Corner accent - top left golden corner */}
      {variant === 'gold' || variant === 'gold-highlight' ? (
        <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-executive-gold/30"></div>
      ) : null}

      {children}
    </Card>
  );
}

// Enhanced card header with optional decorative divider
export function ExecutiveCardHeader({ children, showDivider = false, className, ...props }) {
  return (
    <CardHeader className={cn(
      "relative",
      className
    )} {...props}>
      {children}

      {/* Decorative golden divider */}
      {showDivider && (
        <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-executive-gold/30 to-transparent"></div>
      )}
    </CardHeader>
  );
}
```

### 2. Enhanced Metric Cards Component

**File:** `daopad_frontend/src/pages/DashboardPage.jsx` (MODIFY)

**Current Code (lines 278-335):**
```javascript
function MetricCard({ title, value, icon: Icon, trend, description, loading }) {
  // Basic card with icon
  return (
    <Card>
      <CardContent className="p-6">
        // Plain content
      </CardContent>
    </Card>
  );
}
```

**Enhanced Version:**
```javascript
// PSEUDOCODE
function MetricCard({ title, value, icon: Icon, trend, description, loading }) {
  if (loading) {
    return (
      <Card className="relative overflow-hidden animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-br from-executive-gold/5 to-transparent"></div>
        <CardContent className="p-6">
          <Loader2 className="w-5 h-5 animate-spin text-executive-gold/50" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden group transition-all duration-300 hover:border-executive-gold/50 hover:shadow-lg hover:shadow-executive-gold/10">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-executive-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      {/* Top left corner accent */}
      <div className="absolute top-0 left-0 w-6 h-6 border-l border-t border-executive-gold/20"></div>

      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-executive-ivory">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>

          {/* Icon with gradient background on hover */}
          <div className={cn(
            "p-3 rounded-lg transition-all duration-300",
            trend > 0 ? "bg-green-50 group-hover:bg-green-100" :
            trend < 0 ? "bg-red-50 group-hover:bg-red-100" :
            "bg-executive-gold/10 group-hover:bg-executive-gold/20"
          )}>
            <Icon className={cn(
              "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
              trend > 0 ? "text-green-600" :
              trend < 0 ? "text-red-600" :
              "text-executive-gold"
            )} />
          </div>
        </div>

        {/* Trend indicator with animation */}
        {trend !== undefined && trend !== 0 && (
          <div className="flex items-center gap-1 mt-2 animate-fade-in">
            {trend > 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className={cn(
              "text-xs font-medium",
              trend > 0 ? "text-green-600" : "text-red-600"
            )}>
              {Math.abs(trend)}%
            </span>
            <span className="text-xs text-muted-foreground">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 3. Enhanced PageLayout Component

**File:** `daopad_frontend/src/components/orbit/PageLayout.jsx` (MODIFY)

**Add golden header treatment:**
```javascript
// PSEUDOCODE
export function PageLayout({ title, description, actions, children, goldHeader = false }) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className={cn(
        "relative",
        goldHeader && "pb-6"
      )}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className={cn(
              "text-3xl font-display tracking-wide",
              goldHeader ? "text-executive-ivory" : ""
            )}>
              {title}
            </h1>

            {/* Decorative golden underline */}
            {goldHeader && (
              <div className="h-px w-24 bg-gradient-to-r from-executive-gold via-executive-gold/50 to-transparent"></div>
            )}

            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>

        {/* Bottom decorative line */}
        {goldHeader && (
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-executive-gold/20 via-executive-gold/10 to-transparent"></div>
        )}
      </div>

      {/* Page Content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}
```

### 4. Enhanced DashboardPage

**File:** `daopad_frontend/src/pages/DashboardPage.jsx` (MODIFY)

**Changes:**
1. Use ExecutiveCard for main content cards
2. Add hover effects to tab triggers
3. Add golden accents to section headers
4. Enhance quick actions buttons

```javascript
// PSEUDOCODE - Key sections to modify

// Line 148 - Update PageLayout
<PageLayout title="Dashboard" goldHeader={true}>

// Line 185 - Enhance Tabs styling
<Tabs defaultValue="treasury" className="space-y-4">
  <TabsList className="bg-executive-darkGray/50 border border-executive-gold/20">
    <TabsTrigger
      value="treasury"
      className="data-[state=active]:bg-executive-gold/20 data-[state=active]:text-executive-goldLight transition-all duration-200"
    >
      Treasury
    </TabsTrigger>
    // Repeat for other tabs
  </TabsList>

  // Content stays the same
</Tabs>

// Line 232 - Enhance Quick Actions Card
<ExecutiveCard variant="gold" hover={false}>
  <ExecutiveCardHeader showDivider={true}>
    <CardTitle className="text-base text-executive-ivory">Quick Actions</CardTitle>
  </ExecutiveCardHeader>
  <CardContent>
    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
      <Button
        variant="outline"
        className="justify-start group border-executive-gold/20 hover:border-executive-gold/50 hover:bg-executive-gold/10 transition-all duration-300"
        onClick={() => navigate('/transfers/new')}
      >
        <Wallet className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:scale-110" />
        New Transfer
      </Button>
      // Repeat for other buttons with hover effects
    </div>
  </CardContent>
</ExecutiveCard>
```

### 5. Enhanced AddressBookPage

**File:** `daopad_frontend/src/pages/AddressBookPage.jsx` (MODIFY)

**Add subtle enhancements to search bar and table container:**
```javascript
// PSEUDOCODE

// Wrap main content in ExecutiveCard
<ExecutiveCard variant="default" hover={false} className="mt-6">
  <CardContent className="p-6">
    {/* Enhanced search bar with golden focus ring */}
    <div className="flex items-center gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-executive-gold/50 w-4 h-4" />
        <Input
          type="text"
          placeholder="Search addresses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 border-executive-gold/20 focus:border-executive-gold focus:ring-executive-gold/30 transition-all duration-200"
        />
      </div>

      <Button
        variant="outline"
        className="border-executive-gold/30 hover:border-executive-gold hover:bg-executive-gold/10 transition-all duration-300"
        onClick={() => setDialogOpen(true)}
        disabled={!canCreate}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Address
      </Button>
    </div>

    {/* Table with hover effects */}
    <AddressBookTable
      entries={entries}
      privileges={privileges}
      className="[&_tr]:hover:bg-executive-gold/5 [&_tr]:transition-colors [&_tr]:duration-150"
    />
  </CardContent>
</ExecutiveCard>
```

### 6. Add Global Animations

**File:** `daopad_frontend/src/index.css` (MODIFY)

Add these animations to the global stylesheet:

```css
/* PSEUDOCODE - Add to end of file */

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fade-in-scale {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out;
}

.animate-fade-in-scale {
  animation: fade-in-scale 0.4s ease-out;
}

.animate-shimmer {
  animation: shimmer 2s linear infinite;
  background-size: 200% 100%;
}

/* Executive Card Shine Effect (on hover) */
.executive-card-shine::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(212, 175, 55, 0.1),
    transparent
  );
  transform: rotate(45deg);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.executive-card-shine:hover::after {
  opacity: 1;
  animation: shimmer 1.5s ease-in-out;
}
```

### 7. Enhanced Buttons (Global)

**File:** `daopad_frontend/src/components/ui/button.jsx` (MODIFY)

Add executive variant to button component:

```javascript
// PSEUDOCODE - Add to existing variants
const buttonVariants = cva(
  // Base styles...
  {
    variants: {
      variant: {
        // Existing variants...
        executive: cn(
          "bg-executive-gold text-executive-charcoal",
          "hover:bg-executive-goldLight",
          "border border-executive-goldDark",
          "transition-all duration-300",
          "hover:shadow-lg hover:shadow-executive-gold/30",
          "hover:scale-105 active:scale-100",
          "font-serif"
        ),
        "executive-outline": cn(
          "border-2 border-executive-gold/50 text-executive-goldLight",
          "hover:bg-executive-gold/10 hover:border-executive-gold",
          "transition-all duration-300",
          "hover:shadow-md hover:shadow-executive-gold/20"
        ),
      },
      // Rest of variants...
    }
  }
);
```

### 8. Enhanced Table Row Hover (AddressBookTable)

**File:** `daopad_frontend/src/components/address-book/AddressBookTable.jsx` (MODIFY)

```javascript
// PSEUDOCODE - Enhance table row styling

<DataTable
  // ...existing props
  className={cn(
    // Existing classes
    "[&_tbody_tr]:transition-colors [&_tbody_tr]:duration-200",
    "[&_tbody_tr:hover]:bg-executive-gold/5",
    "[&_tbody_tr:hover]:border-l-2 [&_tbody_tr:hover]:border-l-executive-gold/50"
  )}
/>
```

### 9. Enhanced Request Cards

**File:** `daopad_frontend/src/components/orbit/RecentRequests.jsx` (MODIFY)

```javascript
// PSEUDOCODE

// Wrap request items in enhanced cards with status-based golden accents
<ExecutiveCard
  variant={request.status === 'Approved' ? 'gold-highlight' : 'default'}
  hover={true}
  className="animate-fade-in"
>
  <CardContent className="p-4">
    {/* Request content with enhanced status badges */}
    <Badge className={cn(
      "transition-all duration-300",
      request.status === 'Approved' && "bg-executive-gold/20 text-executive-goldLight border-executive-gold/40",
      request.status === 'Pending' && "bg-yellow-500/20 text-yellow-300 border-yellow-500/40"
    )}>
      {request.status}
    </Badge>
  </CardContent>
</ExecutiveCard>
```

### 10. Loading States Enhancement

**File:** Create `daopad_frontend/src/components/ui/loading-shimmer.jsx` (NEW)

```javascript
// PSEUDOCODE

export function LoadingShimmer({ className }) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg bg-executive-darkGray/50",
      "before:absolute before:inset-0",
      "before:bg-gradient-to-r before:from-transparent before:via-executive-gold/10 before:to-transparent",
      "before:animate-shimmer",
      className
    )}>
      <div className="h-full w-full bg-executive-charcoal/80"></div>
    </div>
  );
}

// Use in loading states:
{loading ? (
  <LoadingShimmer className="h-32" />
) : (
  <ActualContent />
)}
```

## Files to Modify Summary

### New Files:
1. `daopad_frontend/src/components/ui/executive-card.jsx` - Enhanced card components
2. `daopad_frontend/src/components/ui/loading-shimmer.jsx` - Loading state component

### Modified Files:
1. `daopad_frontend/src/pages/DashboardPage.jsx` - Enhanced metric cards, tabs, quick actions
2. `daopad_frontend/src/pages/AddressBookPage.jsx` - Enhanced search, table, cards
3. `daopad_frontend/src/pages/RequestsPage.jsx` - Enhanced request cards and filters
4. `daopad_frontend/src/pages/PermissionsPage.jsx` - Enhanced permission cards
5. `daopad_frontend/src/components/orbit/PageLayout.jsx` - Golden header treatment
6. `daopad_frontend/src/components/orbit/RecentRequests.jsx` - Enhanced request cards
7. `daopad_frontend/src/components/ui/button.jsx` - Executive button variants
8. `daopad_frontend/src/components/address-book/AddressBookTable.jsx` - Enhanced row hover
9. `daopad_frontend/src/index.css` - Global animations

## Visual Design Principles Applied

### 1. Strategic Golden Accents
- **Corner accents:** Top-left corner golden L-shapes on important cards
- **Dividers:** Gradient horizontal rules with gold centerpieces
- **Borders:** Gold borders on hover states
- **Icons:** Gold-tinted icons for key actions

### 2. Subtle Gradients
- **Card backgrounds:** `from-executive-gold/5 to-transparent`
- **Hover states:** `from-executive-gold/10 to-executive-darkGray/50`
- **Loading states:** Animated gold shimmer effect

### 3. Smooth Transitions
- **Duration:** 200-300ms for most interactions
- **Easing:** `ease-out` for entrances, `ease-in-out` for transforms
- **Properties:** Colors, borders, shadows, scales

### 4. Hover Effects
- **Cards:** Border color shift + subtle shadow + gradient reveal
- **Buttons:** Scale to 105% + shadow enhancement
- **Icons:** Scale to 110% + color shift
- **Table rows:** Background tint + left border accent

### 5. Micro-animations
- **Fade-in:** On mount for cards and sections
- **Pulse:** For loading states and important badges
- **Shimmer:** For skeleton loaders
- **Scale:** For interactive elements

## Testing Requirements

### Visual Testing
```bash
# After deployment, manually verify:
# 1. Navigate to /app route
# 2. Check each page:
#    - Dashboard: Metric cards show golden accents on hover
#    - Address Book: Search bar has golden focus ring, table rows have hover effect
#    - Requests: Request cards have status-based golden highlights
#    - Permissions: Permission cards have golden accents
# 3. Test interactions:
#    - Hover over cards - should see smooth border/shadow/gradient changes
#    - Hover over buttons - should see scale and shadow effects
#    - Click tabs - should see golden active state
#    - Focus inputs - should see golden ring
# 4. Verify animations:
#    - Cards should fade in on load
#    - Loading states should show shimmer effect
#    - Icons should scale on hover
```

### Accessibility Testing
```bash
# Verify contrast ratios maintained:
# - All text remains readable
# - Golden accents don't reduce contrast below WCAG AA
# - Focus states are clearly visible
# - Hover effects don't rely solely on color
```

### Performance Testing
```bash
# Verify no performance regression:
# - Animations are GPU-accelerated (transform/opacity only)
# - No layout thrashing from hover effects
# - Smooth 60fps animations
```

### Cross-browser Testing
```bash
# Test in:
# - Chrome/Edge (primary target)
# - Firefox
# - Safari
# Verify:
# - Gradients render correctly
# - Animations work smoothly
# - Hover effects function properly
```

### Dark Mode Testing
```bash
# Verify golden accents work in both themes:
# - Light mode: Golden accents visible but not overwhelming
# - Dark mode: Golden accents provide premium feel without eye strain
```

## Deployment Process

```bash
# 1. Verify you're in the worktree
pwd  # Should output: /home/theseus/alexandria/daopad-visual-flair/src/daopad

# 2. Build frontend
npm run build

# 3. Deploy to mainnet
./deploy.sh --network ic --frontend-only

# 4. Test live on IC
# Open: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/app
# Navigate through all pages and verify enhancements

# 5. If issues found, fix and redeploy
# Edit files -> npm run build -> ./deploy.sh --network ic --frontend-only
```

## Success Criteria

✅ **Visual Enhancements Applied:**
- [ ] Golden accents visible on key cards and headers
- [ ] Hover effects work smoothly on all interactive elements
- [ ] Animations are subtle and don't distract
- [ ] Loading states show shimmer effect

✅ **Professional Appearance Maintained:**
- [ ] Nothing looks "cheap" or overly flashy
- [ ] Color palette remains consistent with homepage
- [ ] Typography and spacing unchanged
- [ ] Functionality not impacted by styling changes

✅ **Technical Quality:**
- [ ] No console errors
- [ ] Animations run at 60fps
- [ ] No accessibility regressions
- [ ] Works in all major browsers

✅ **User Experience:**
- [ ] Visual hierarchy improved
- [ ] Interactive elements more discoverable
- [ ] Professional premium feel enhanced
- [ ] /app route feels connected to homepage aesthetic

## Notes

- All changes are purely visual - no functional changes
- CSS-only effects for maximum performance
- Gradual rollout: Can disable effects via class toggling if needed
- Mobile-first: All effects work on touch devices
- Reusable components: ExecutiveCard can be used throughout app

## Rollback Plan

If enhancements cause issues:

1. **Quick fix:** Remove `animate-*` classes to disable animations
2. **Partial rollback:** Revert to standard Card component, keep button enhancements
3. **Full rollback:** Revert entire PR and redeploy previous frontend

All changes are additive and non-breaking, so rollback is safe.
