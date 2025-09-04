# KongSwap Design System Style Guide
> Comprehensive Analysis for LP Locker Frontend Implementation

## Overview
KongSwap uses a **dark theme with bright lime green accents** as its primary visual identity. The UI is built on a foundation of dark navy backgrounds with strategic use of bright lime green (`#00D68F`) and blue accents. This guide provides the actual implementation details extracted from KongSwap's frontend codebase.

## Technology Stack

### Frontend Framework
- **Svelte** - Primary frontend framework
- **SvelteKit** - Full-stack framework with SSR
- **TypeScript** - Type safety throughout
- **TailwindCSS** - Utility-first styling with extensive customization
- **Vite** - Build tool and dev server

### Key Libraries
- **Lucide Svelte** - Icon system
- **Chart.js** + **D3** - Data visualization
- **Canvas Confetti** - Celebration effects
- **Three.js** - 3D effects (limited usage)

## Actual Color System

### Core Colors (Most Frequently Used)
These are the colors that dominate the KongSwap interface:

```css
/* Background Colors - Dark navy theme */
--bg-primary: #0C0F17;         /* Primary background (RGB: 9 12 23) */
--bg-secondary: #141925;       /* Secondary panels (RGB: 26 32 50) */ 
--bg-tertiary: #1D2433;        /* Card backgrounds (RGB: 24 28 42) */

/* Text Colors */
--text-primary: #F9FAFB;       /* Primary text (RGB: 255 255 255) */
--text-secondary: #B0B6C5;     /* Secondary text (RGB: 176 182 197) */
--text-disabled: #6B7280;      /* Disabled states (RGB: 107 114 128) */

/* Brand Colors - The lime green the user mentioned! */
--accent-green: #00D68F;       /* Success/primary accent (RGB: 0 214 143) */
--accent-blue: #3B82F6;        /* Info/secondary accent (RGB: 59 130 246) */
```

### Semantic Color Mapping
```css
/* Success States - The dominant lime green */
--semantic-success: #00D68F;      /* Bright lime green */
--semantic-success-hover: #00B87A; /* Darker on hover */

/* Error States */
--semantic-error: #F43F5E;        /* Red for errors */
--semantic-error-hover: #E11D48;   /* Darker red on hover */

/* Warning States */
--semantic-warning: #F59E0B;      /* Orange for warnings */
--semantic-warning-hover: #D97706; /* Darker orange on hover */

/* Info States */
--semantic-info: #3B82F6;         /* Blue for info */
--semantic-info-hover: #2563EB;    /* Darker blue on hover */
```

## Typography System

### Font Stack (Actual Implementation)
```css
/* Primary font family from KongSwap */
font-family: 'Exo 2', 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Alternative fonts used */
--font-alumni: "Space Grotesk", sans-serif;
--font-play: "Press Start 2P", monospace;  /* Retro gaming text */
--font-mono: 'Roboto Mono', 'Fira Code', Courier, monospace;
```

### Font Sizes (TailwindCSS Scale)
```css
--text-xs: 0.75rem;     /* 12px */
--text-sm: 0.875rem;    /* 14px */
--text-base: 1rem;      /* 16px - primary body text */
--text-lg: 1.125rem;    /* 18px */
--text-xl: 1.25rem;     /* 20px */
--text-2xl: 1.5rem;     /* 24px */
--text-3xl: 1.875rem;   /* 30px */
--text-4xl: 2.25rem;    /* 36px */
```

### Font Weights
```css
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

## Component Patterns (Real KongSwap Implementation)

### Swap Button (Primary Component)
The main interactive element with gradient backgrounds and animations:

```css
.swap-button {
  /* Base styling */
  border-radius: var(--swap-button-roundness, 9999px);
  color: var(--swap-button-text-color, #FFFFFF);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  min-height: 64px;
  transition: all 150ms ease-out;
  
  /* Default gradient */
  background: linear-gradient(135deg, 
    var(--swap-button-primary-gradient-start, #4A7CFF) 0%, 
    var(--swap-button-primary-gradient-end, #3B6CE6) 100%);
}

.swap-button:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Success state - lime green gradients */
.button-ready {
  background: linear-gradient(135deg, 
    var(--swap-button-ready-glow-start, #00D68F) 0%, 
    var(--swap-button-ready-glow-end, #00B87A) 100%);
}

/* Error state */  
.button-error {
  background: linear-gradient(135deg, 
    var(--swap-button-error-gradient-start, #F43F5E) 0%, 
    var(--swap-button-error-gradient-end, #E11D48) 100%);
}
```

### Panel/Card System
KongSwap uses rounded panels with dark backgrounds:

```css
.kong-panel {
  background: rgb(var(--bg-secondary) / 1);
  border: 1px solid rgb(var(--ui-border) / 1);
  border-radius: var(--panel-roundness, 0.75rem); /* 12px */
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  transition: all 200ms ease;
}

.kong-panel:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}
```

### Gradient Text Effects (The Moving Gradients!)
```css
/* Text gradients that create the moving effect user mentioned */
.gradient-text {
  background: linear-gradient(135deg, 
    rgb(var(--accent-blue)) 0%, 
    rgb(var(--accent-green)) 100%);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  text-fill-color: transparent;
}

/* Examples from the codebase */
.prediction-percentage {
  background: linear-gradient(to right, 
    rgb(var(--accent-blue)) 0%, 
    rgb(var(--accent-green)) 100%);
  background-clip: text;
  color: transparent;
}
```

### Form Inputs (KongSwap Style)
```css
.kong-input {
  background: rgb(var(--bg-secondary) / 1);
  border: 1px solid rgb(var(--ui-border) / 1);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  font-family: 'Exo 2', sans-serif;
  font-size: 0.875rem;
  color: rgb(var(--text-primary) / 1);
  transition: all 200ms ease;
}

.kong-input:focus {
  outline: none;
  border-color: rgb(var(--accent-green) / 0.5);
  box-shadow: 0 0 0 3px rgb(var(--accent-green) / 0.1);
  background: rgb(var(--bg-tertiary) / 1);
}

.kong-input::placeholder {
  color: rgb(var(--text-secondary) / 0.7);
}
```

### Status Badges
```css
.kong-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 9999px;
  transition: all 150ms ease;
}

/* Success badge - lime green theme */
.badge-success {
  background: rgb(var(--accent-green) / 0.2);
  color: rgb(var(--accent-green) / 1);
  border: 1px solid rgb(var(--accent-green) / 0.3);
}

/* Error badge */
.badge-error {
  background: rgb(var(--semantic-error) / 0.2);
  color: rgb(var(--semantic-error) / 1);
  border: 1px solid rgb(var(--semantic-error) / 0.3);
}

/* Warning badge - orange */
.badge-warning {
  background: rgb(var(--semantic-warning) / 0.2);
  color: rgb(var(--semantic-warning) / 1);
  border: 1px solid rgb(var(--semantic-warning) / 0.3);
}
```

## Animations & Transitions (KongSwap Implementation)

### Standard Transitions
```css
/* From TailwindCSS config */
--transition-fast: 150ms ease-out;
--transition-base: 200ms ease-out;
--transition-slow: 300ms ease-out;
```

### Button Animations
```css
/* Scale animation for interactive elements */
@keyframes glow {
  0% { 
    filter: drop-shadow(0 0 2px rgb(var(--brand-primary) / 0.5)) brightness(0.95);
    opacity: 0.8;
    transform: scale(0.98);
  }
  50% { 
    filter: drop-shadow(0 0 5px rgb(var(--brand-primary) / 0.9)) brightness(1.1);
    opacity: 1;
    transform: scale(1.02);
  }
  100% { 
    filter: drop-shadow(0 0 2px rgb(var(--brand-primary) / 0.5)) brightness(0.95);
    opacity: 0.8;
    transform: scale(0.98);
  }
}

.kong-glow {
  animation: glow 2s ease-in-out infinite;
}
```

### Shine Animation (Button Effects)
```css
@keyframes shine {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(50%); }
}

.shine-effect {
  position: relative;
  overflow: hidden;
}

.shine-effect::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(255, 255, 255, 0.4) 50%, 
    transparent 100%);
  animation: shine 2s infinite linear;
}
```

### Loading States
```css
/* Shimmer for skeleton loading */
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

.kong-shimmer {
  position: relative;
  overflow: hidden;
  background: rgb(var(--bg-tertiary) / 1);
}

.kong-shimmer::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, 
    transparent 0%,
    rgb(var(--bg-secondary) / 0.8) 50%,
    transparent 100%);
  transform: translateX(-100%);
  animation: shimmer 2s infinite;
}

/* Spin animation for loading indicators */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.kong-spinner {
  animation: spin 1s linear infinite;
}
```

## Layout System (TailwindCSS Implementation)

### Container Widths
```css
/* From KongSwap's actual max-width usage */
--container-sm: 640px;   /* sm */
--container-md: 768px;   /* md */  
--container-lg: 1024px;  /* lg */
--container-xl: 1280px;  /* xl */
--container-2xl: 1536px; /* 2xl */

/* Most common container: max-w-7xl */
--container-7xl: 80rem;  /* 1280px - frequently used */
```

### Spacing Scale (TailwindCSS)
```css
/* Standard Tailwind spacing scale used throughout */
--space-0: 0;           /* 0px */
--space-1: 0.25rem;     /* 4px */
--space-2: 0.5rem;      /* 8px */
--space-3: 0.75rem;     /* 12px */
--space-4: 1rem;        /* 16px */
--space-6: 1.5rem;      /* 24px */
--space-8: 2rem;        /* 32px */
--space-12: 3rem;       /* 48px */
--space-16: 4rem;       /* 64px */
--space-24: 6rem;       /* 96px */
```

### Border Radius (Actual Usage)
```css
/* From KongSwap's theme configuration */
--radius-sm: 0.125rem;    /* 2px */
--radius-base: 0.25rem;   /* 4px */
--radius-md: 0.375rem;    /* 6px */
--radius-lg: 0.5rem;      /* 8px */
--radius-xl: 0.75rem;     /* 12px - most common */
--radius-2xl: 1rem;       /* 16px - panels & cards */
--radius-3xl: 1.5rem;     /* 24px */
--radius-full: 9999px;    /* buttons & badges */

/* Custom variables */
--swap-button-roundness: 90rem;  /* Nearly full rounded */
--panel-roundness: 0.5rem;       /* Panel corners */
```

## Theme System Implementation

### CSS Variable Architecture
KongSwap uses a sophisticated theme system with CSS variables:

```css
/* Base theme applied to :root */
:root {
  /* Background Colors */
  --bg-primary: 9 12 23;        /* #0C0F17 */
  --bg-secondary: 26 32 50;     /* #1A2032 */ 
  --bg-tertiary: 24 28 42;      /* #181C2A */

  /* Brand Colors */
  --brand-primary: 26 143 227;   /* #1A8FE3 */
  --brand-secondary: 56 190 201; /* #38BEC9 */

  /* Semantic Colors - The lime green dominance! */
  --semantic-success: 0 214 143;      /* #00D68F - The main lime green */
  --semantic-success-hover: 0 183 122; /* #00B77A - Darker on hover */
  --semantic-error: 244 63 94;        /* #F43F5E */
  --semantic-warning: 245 158 11;     /* #F59E0B - Orange accents */
  --semantic-info: 59 130 246;        /* #3B82F6 */

  /* UI Elements */
  --ui-border: 28 32 46;         /* #1C202E */
  --ui-border-light: 35 39 53;   /* #232735 */
  --ui-focus: 59 130 246;        /* #3B82F6 */
}

/* Usage in components */
.example {
  background: rgb(var(--bg-primary) / 1);
  color: rgb(var(--semantic-success) / 1);
  border: 1px solid rgb(var(--ui-border) / 0.5);
}
```

### Background Gradients
```css
/* Main page background gradient */
:root.dark .page-wrapper::before {
  background: linear-gradient(135deg, 
    #050813 0%, 
    #080b18 25%, 
    #0a0e1b 50%, 
    #080b18 75%, 
    #050813 100%);
}
```

## Implementation Guidelines (Real KongSwap Patterns)

### 1. **Dark Theme Foundation**
- Use the dark navy backgrounds (`#0C0F17`, `#1A2032`) as the primary foundation
- Ensure high contrast with white/light text (`#F9FAFB`)
- Implement subtle background gradients for depth
- Use rounded corners (8px-12px) for modern feel

### 2. **Lime Green Accent Strategy**
- Use `#00D68F` (lime green) as the primary accent color
- Apply lime green to success states, active elements, and CTAs
- Use orange `#F59E0B` sparingly for warnings and secondary highlights
- Create blue-to-green gradients for text effects and special elements

### 3. **Interactive Elements**
- Implement hover effects with `translateY(-2px)` and brightness filters
- Use scale animations (`scale(0.98)` to `scale(1.02)`) for button interactions
- Add glow effects with CSS filters and box-shadows
- Implement shine animations for premium interactions

### 4. **TailwindCSS Integration**
- Use utility classes with custom CSS variables: `bg-kong-bg-primary`
- Implement responsive design with standard Tailwind breakpoints
- Leverage Tailwind's spacing scale consistently
- Extend Tailwind config with custom animations and colors

### 5. **Component Architecture**
- Build reusable Svelte components with TypeScript
- Use CSS-in-JS patterns with CSS variables for theming  
- Implement consistent padding/margins using Tailwind classes
- Create variant-based component APIs (success, error, warning, info)

## Example Component: LP Position Card (KongSwap Style)

```svelte
<!-- LP Position Card Component -->
<div class="kong-lp-card">
  <!-- Card Header -->
  <div class="lp-card-header">
    <div class="flex items-center gap-3">
      <!-- Token pair images -->
      <div class="token-pair">
        <img src="{token0.logo}" alt="{token0.symbol}" class="token-image" />
        <img src="{token1.logo}" alt="{token1.symbol}" class="token-image -ml-2" />
      </div>
      
      <div>
        <h3 class="text-xl font-bold text-kong-text-primary">
          {token0.symbol}/{token1.symbol}
        </h3>
        <p class="text-sm text-kong-text-secondary">Liquidity Position</p>
      </div>
    </div>
    
    <!-- Status badge -->
    <div class="position-badge {position.isActive ? 'badge-success' : 'badge-warning'}">
      {position.isActive ? 'Active' : 'Inactive'}
    </div>
  </div>

  <!-- Metrics Grid -->
  <div class="grid grid-cols-2 gap-4 mb-4">
    <div class="metric-item">
      <p class="metric-label">Position Value</p>
      <p class="metric-value highlight">${formatCurrency(position.totalValue)}</p>
    </div>
    
    <div class="metric-item">
      <p class="metric-label">APR</p>
      <p class="metric-value text-kong-accent-green">{position.apr.toFixed(2)}%</p>
    </div>
  </div>

  <!-- Action Button -->
  <button class="kong-button-primary w-full">
    Manage Position
  </button>
</div>

<style>
  .kong-lp-card {
    @apply bg-kong-bg-secondary border border-kong-border rounded-xl p-6;
    @apply shadow-sm hover:shadow-lg transition-all duration-200;
    @apply hover:-translate-y-1;
  }

  .lp-card-header {
    @apply flex items-center justify-between mb-6 pb-4;
    @apply border-b border-kong-border;
  }

  .token-image {
    @apply w-10 h-10 rounded-full border-2 border-kong-bg-primary;
  }

  .position-badge {
    @apply px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide;
  }

  .metric-item {
    @apply bg-kong-bg-tertiary/30 rounded-lg p-3;
  }

  .metric-label {
    @apply text-xs text-kong-text-secondary uppercase tracking-wider mb-1;
  }

  .metric-value {
    @apply text-lg font-bold text-kong-text-primary;
  }

  .metric-value.highlight {
    @apply text-xl bg-gradient-to-r from-kong-accent-blue to-kong-accent-green;
    @apply bg-clip-text text-transparent;
  }

  .kong-button-primary {
    @apply bg-gradient-to-r from-kong-accent-green to-kong-success-hover;
    @apply text-white font-semibold py-3 px-6 rounded-xl;
    @apply hover:brightness-110 hover:-translate-y-0.5 transition-all duration-150;
    @apply focus:ring-2 focus:ring-kong-accent-green/50 focus:outline-none;
  }
</style>
```

## Mobile Responsiveness (TailwindCSS Breakpoints)

### Breakpoints (Actual Usage)
```css
/* Standard Tailwind breakpoints used in KongSwap */
--screen-sm: 640px;   /* Small devices */
--screen-md: 768px;   /* Medium devices (tablets) */
--screen-lg: 1024px;  /* Large devices */
--screen-xl: 1280px;  /* Extra large devices */
--screen-2xl: 1536px; /* 2X large devices */
```

### Mobile Adaptations (Real Implementation)
- **Grid Layouts**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` patterns
- **Typography**: Responsive text sizes like `text-sm sm:text-base md:text-lg`
- **Spacing**: Responsive padding/margins `p-4 md:p-6 lg:p-8`
- **Navigation**: Hamburger menu with mobile-first design
- **Touch Targets**: Minimum 44px for all interactive elements
- **Hover States**: Conditionally disabled on touch devices

## Accessibility Implementation

### WCAG AA Compliance
- **Contrast Ratios**: All color combinations tested for 4.5:1 minimum
- **Focus Indicators**: Visible focus rings on all interactive elements using `focus:ring-2`
- **Semantic HTML**: Proper use of headings, landmarks, and ARIA labels
- **Keyboard Navigation**: All functionality accessible via keyboard
- **Screen Reader Support**: Meaningful alt text and ARIA descriptions

### Focus Management
```css
/* Focus styles used throughout KongSwap */
.kong-focusable:focus {
  outline: none;
  ring: 2px rgb(var(--ui-focus) / 0.5);
  ring-offset: 2px;
  ring-offset-color: rgb(var(--bg-primary));
}
```

## Key Takeaways for LP Locker Implementation

Based on this comprehensive analysis of KongSwap's **actual** frontend implementation:

### 1. **Primary Color Scheme**
- **Dark navy backgrounds** (`#0C0F17`, `#1A2032`) - not paper white
- **Bright lime green accents** (`#00D68F`) - the dominant theme color
- **Orange highlights** (`#F59E0B`) - used sparingly for warnings
- **Blue-to-green gradients** for special text effects

### 2. **Technology Stack**
- **Svelte + SvelteKit** with TypeScript
- **TailwindCSS** with extensive customization
- **CSS-in-JS** with CSS variables for theming
- **Lucide icons** and modern animation libraries

### 3. **Visual Identity**
- **Modern dark theme** - not Swiss minimalist paper
- **Rounded corners** (8px-12px) for contemporary feel  
- **Gradient animations** and interactive effects
- **High contrast** text for accessibility

### 4. **Animation Philosophy**
- Subtle hover effects with `translateY` and `scale` transforms
- Glow and shine effects for premium interactions
- Gradient text effects with `background-clip: text`
- Loading states with shimmer animations

### 5. **Component Patterns**
- Reusable Svelte components with variant APIs
- TailwindCSS utility classes with semantic naming
- Consistent spacing and typography scales
- Interactive states with proper accessibility support

**Result**: A sophisticated, modern DeFi interface that prioritizes usability and visual appeal through strategic use of dark themes, lime green accents, and polished interactions - very different from the paper-themed aesthetic initially described.