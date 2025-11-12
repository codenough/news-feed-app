# Color Palette & Theme System Documentation

## Overview

This news feed application uses a semantic color system that supports both light and dark modes. The color palette is defined using CSS custom properties (variables) that can be easily customized and switched between themes.

## Core Brand Colors

### Light Mode
- **Deep Ocean Blue** (`#0A74DA`) - Primary brand color for CTAs, active states, and links
- **Vivid Coral** (`#F05C3B`) - Accent color for breaking news, highlights, and alerts

### Dark Mode
- **Lighter Blue** (`#5BA7ED`) - Adjusted primary color for better visibility on dark backgrounds
- **Brighter Coral** (`#FF7B5C`) - Enhanced accent color for dark mode

## Semantic Color Variables

### Background Colors
```css
--color-bg-page              /* Main page background */
--color-bg-card              /* Card/component backgrounds */
--color-bg-navbar            /* Navigation bar background */
--color-bg-sidebar           /* Sidebar background */
--color-bg-action-primary    /* Primary button background */
--color-bg-breaking-news     /* Breaking news badge background */
```

### Text Colors
```css
--color-text-primary         /* Main text content */
--color-text-secondary       /* Secondary text, captions */
--color-text-tertiary        /* Metadata, timestamps */
--color-text-on-primary      /* Text on primary colored backgrounds */
--color-text-on-accent       /* Text on accent colored backgrounds */
--color-text-read            /* Read articles indicator */
```

### Border & Divider Colors
```css
--color-border-default       /* Default borders and dividers */
--color-border-card-hover    /* Card border on hover state */
```

### Icon Colors
```css
--color-icon-default         /* Default icon color */
--color-icon-active          /* Active/selected icon color */
--color-icon-highlight       /* Highlighted icon color */
```

### State Colors
```css
--color-state-active         /* Active element state */
--color-state-hover          /* Hover state color */
--color-state-focus          /* Focus state color */
--color-state-unread-indicator  /* Unread count badge */
```

## Usage Examples

### In Components (SCSS)
```scss
.my-component {
  background-color: var(--color-bg-card);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-default);

  &:hover {
    border-color: var(--color-brand-primary);
  }
}
```

### In Components (Inline Styles)
```html
<div [style.background-color]="'var(--color-bg-card)'"
     [style.color]="'var(--color-text-primary)'">
  Content
</div>
```

## Theme Switching

### Using the ThemeService

```typescript
import { inject } from '@angular/core';
import { ThemeService } from './services/theme.service';

export class MyComponent {
  themeService = inject(ThemeService);

  // Toggle between light and dark
  toggleTheme() {
    this.themeService.toggleTheme();
  }

  // Set specific theme
  setDarkMode() {
    this.themeService.setTheme('dark');
  }

  // Get current theme
  getCurrentTheme() {
    return this.themeService.theme();
  }
}
```

### Using the ThemeToggleComponent

Add the toggle button to your navigation:

```typescript
import { ThemeToggleComponent } from './components/theme-toggle.component';

@Component({
  // ...
  imports: [ThemeToggleComponent],
  template: `
    <nav>
      <!-- Other navigation items -->
      <app-theme-toggle />
    </nav>
  `
})
```

## NG-ZORRO Customizations

The following NG-ZORRO components are pre-styled to use the semantic color system:

- **Buttons** - Primary and default button styles
- **Cards** - Background, borders, and hover effects
- **Menus** - Navigation menu styling with active states
- **Layout** - Header, sider, and content area backgrounds
- **Badges** - Unread indicators
- **Tags** - Blue and red tag variants
- **Lists** - Item styling and hover states
- **Inputs** - Form controls with focus states
- **Dropdowns** - Menu styling
- **Modals** - Dialog styling
- **Tabs** - Tab navigation with active indicators
- **Pagination** - Page number styling
- **Skeleton** - Loading state animations

## Utility Classes

### Breaking News Badge
```html
<span class="breaking-news">Breaking</span>
```

### Unread Indicator
```html
<span class="unread-indicator"></span>
```

### Read Article Styling
```html
<article class="read-article">
  <!-- Article content appears dimmed -->
</article>
```

## Customization

To modify the color palette:

1. Edit the CSS variables in `src/styles.scss`
2. Update both `:root` (light mode) and `[data-theme="dark"]` (dark mode)
3. The changes will automatically apply to all components using these variables

### Example: Changing Primary Color
```css
:root {
  --color-brand-primary: #1890ff; /* New blue shade */
}

[data-theme="dark"] {
  --color-brand-primary: #69c0ff; /* Lighter version for dark mode */
}
```

## Browser Support

The color system uses modern CSS features:
- **CSS Custom Properties** - Supported in all modern browsers
- **`color-mix()`** - For hover/focus states (fallback needed for older browsers)
- **`data-theme` attribute** - For theme switching

### Fallback for color-mix()

If you need to support older browsers, replace `color-mix()` with pre-calculated values:

```css
/* Instead of: */
--color-state-hover: color-mix(in srgb, var(--color-brand-primary) 85%, black);

/* Use: */
--color-state-hover: #0962b8;
```

## Performance

- Theme preferences are saved to `localStorage`
- Theme changes are applied instantly using CSS variables
- No component re-renders needed when switching themes
- System preference detection on first load

## Accessibility

- All color combinations meet WCAG 2.1 AA contrast requirements
- Focus states are clearly visible
- Theme toggle includes proper ARIA labels
- Dark mode respects system preferences by default
