# KongSwap Design System Style Guide
> For LP Locker Frontend (konglocker.org) Visual Redesign

## Overview
KongSwap uses a unique "Paper Document Swiss Minimalist" design aesthetic combined with modern gradient accents. This guide extracts their complete design system for reuse in the LP Locker frontend.

## Color Palette

### Primary Colors (Paper Theme)
```css
--paper-white: #FAFAF9;        /* Main background */
--ink-black: #000000;          /* Primary text */
--document-gray: #F5F5F4;      /* Card backgrounds */
--border-gray: #E5E5E4;        /* Borders and dividers */
--text-secondary: #525252;     /* Secondary text */
```

### Action Colors
```css
--action-blue: #1E40AF;        /* Primary buttons and links */
--success-green: #10b981;      /* Success states */
--warning-amber: #f59e0b;      /* Warning states */
--error-red: #ef4444;          /* Error states */
```

### Dark/Professional Theme
```css
--dark-navy: #1a1a2e;          /* Dark backgrounds */
--deep-blue: #16213e;          /* Card backgrounds in dark mode */
--ocean-blue: #0f3460;         /* Accent surfaces */
--royal-purple: #533483;       /* Premium/special features */
```

### Gradient & Accent Colors
```css
--gradient-start: #667eea;     /* Purple-blue gradient start */
--gradient-end: #764ba2;       /* Purple gradient end */
--cyan-accent: #00d4ff;        /* Bright accent for special elements */
--lime-green: #84cc16;         /* KongSwap signature lime */
```

## Typography System

### Font Stack
```css
--font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
--font-serif: Georgia, 'Times New Roman', serif;  /* Document headers */
--font-mono: 'Courier New', Courier, monospace;   /* Code/addresses */
```

### Font Sizes
```css
--text-xs: 0.625rem;    /* 10px - tiny labels */
--text-sm: 0.75rem;     /* 12px - small text */
--text-base: 0.875rem;  /* 14px - body text */
--text-lg: 1rem;        /* 16px - large body */
--text-xl: 1.125rem;    /* 18px - small headers */
--text-2xl: 1.5rem;     /* 24px - section headers */
--text-3xl: 2rem;       /* 32px - page headers */
--text-4xl: 2.5rem;     /* 40px - hero text */
```

### Font Weights
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

## Component Patterns

### Swiss Paper Button
```css
.button-swiss {
  background: var(--paper-white);
  color: var(--ink-black);
  border: 2px solid var(--ink-black);
  padding: 0.5rem 1.5rem;
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all 0.2s ease;
  cursor: pointer;
}

.button-swiss:hover {
  background: var(--ink-black);
  color: var(--paper-white);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.button-swiss:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

### Professional Card
```css
.card-professional {
  background: var(--paper-white);
  border: 1px solid var(--border-gray);
  border-radius: 0; /* Sharp corners for document feel */
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s ease;
}

.card-professional:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

### Gradient Accent Card
```css
.card-gradient {
  background: linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%);
  color: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
}
```

### Form Inputs
```css
.input-swiss {
  background: var(--paper-white);
  border: 1px solid var(--border-gray);
  border-bottom: 2px solid var(--ink-black);
  padding: 0.75rem 1rem;
  font-family: var(--font-primary);
  font-size: var(--text-base);
  transition: all 0.2s ease;
}

.input-swiss:focus {
  outline: none;
  border-bottom-color: var(--action-blue);
  background: white;
  box-shadow: 0 2px 8px rgba(30, 64, 175, 0.1);
}
```

### Status Badges
```css
.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 2px;
}

.badge-success {
  background: var(--success-green);
  color: white;
}

.badge-warning {
  background: var(--warning-amber);
  color: white;
}

.badge-error {
  background: var(--error-red);
  color: white;
}

.badge-info {
  background: var(--action-blue);
  color: white;
}
```

## Animations & Transitions

### Standard Transitions
```css
--transition-fast: 0.15s ease;
--transition-base: 0.2s ease;
--transition-slow: 0.3s ease;
```

### Shimmer Animation (Progress/Loading)
```css
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.shimmer {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.3) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}
```

### Pulse Animation (Status Indicators)
```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.pulse {
  animation: pulse 2s infinite;
}
```

### Spin Animation (Loading)
```css
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  animation: spin 1s linear infinite;
}
```

## Layout System

### Container Widths
```css
--container-sm: 640px;
--container-md: 850px;
--container-lg: 1200px;
--container-xl: 1440px;
```

### Spacing Scale
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### Border Radius
```css
--radius-none: 0;
--radius-sm: 2px;
--radius-base: 4px;
--radius-lg: 8px;
--radius-xl: 12px;
--radius-full: 9999px;
```

## Dark Mode Adaptations

### Dark Theme Variables
```css
.dark-theme {
  --bg-primary: var(--dark-navy);
  --bg-secondary: var(--deep-blue);
  --bg-accent: var(--ocean-blue);
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
  --border-color: rgba(255, 255, 255, 0.1);
}
```

## Implementation Guidelines

### 1. **Paper Document Feel**
- Use sharp corners (no border-radius) for main containers
- Implement subtle drop shadows to create paper layering
- Use serif fonts for headers to enhance document aesthetic
- Keep backgrounds light with high contrast text

### 2. **Swiss Minimalism**
- Embrace white space - don't crowd elements
- Use bold, geometric layouts
- Implement strong typography hierarchy
- Limit color usage - primarily black on white

### 3. **Modern Accents**
- Add gradient backgrounds sparingly for special features
- Use the lime green (#84cc16) for important CTAs
- Implement smooth transitions on all interactive elements
- Add shimmer effects to loading states

### 4. **Professional DAO Interface**
- Use the dark theme colors for governance sections
- Implement status badges for different states
- Create clear visual hierarchy with typography
- Use consistent spacing throughout

## Example Component: LP Position Card

```css
.lp-position-card {
  /* Swiss paper base */
  background: var(--paper-white);
  border: 1px solid var(--border-gray);
  padding: var(--space-6);
  margin-bottom: var(--space-4);
  transition: var(--transition-base);
  
  /* Subtle depth */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.lp-position-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.lp-position-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 2px solid var(--ink-black);
}

.lp-position-header h3 {
  font-family: var(--font-serif);
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--ink-black);
  margin: 0;
}

.pool-badge {
  background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
  color: white;
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.position-metric {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-gray);
}

.position-metric .label {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.position-metric .value {
  font-family: var(--font-mono);
  font-weight: var(--font-semibold);
  color: var(--ink-black);
}

.position-metric.highlight .value {
  color: var(--action-blue);
  font-size: var(--text-lg);
}
```

## Mobile Responsiveness

### Breakpoints
```css
--screen-sm: 640px;
--screen-md: 768px;
--screen-lg: 1024px;
--screen-xl: 1280px;
```

### Mobile Adaptations
- Stack cards vertically on small screens
- Increase touch targets to minimum 44px
- Simplify navigation to hamburger menu
- Reduce font sizes by 10-15% on mobile
- Remove hover effects on touch devices

## Accessibility Considerations

- Maintain WCAG AA contrast ratios (4.5:1 for normal text)
- Provide focus indicators on all interactive elements
- Use semantic HTML and ARIA labels
- Ensure keyboard navigation works smoothly
- Add skip links for screen readers

## Summary

The KongSwap design system combines:
1. **Swiss minimalist paper document aesthetic** as the foundation
2. **Modern gradient accents** for visual interest
3. **Professional typography** with clear hierarchy
4. **Subtle animations** for polish
5. **Dark mode support** for different contexts

This creates a unique, professional interface that stands out while maintaining excellent usability. The LP Locker frontend should adopt these patterns while maintaining its own identity as a specialized LP tracking service.