# ng-zorro Component Style Overrides

This directory contains organized, theme-aware style overrides for ng-zorro-antd components used throughout the Chronicle News Feed application.

## Structure

```
overrides/
├── _index.scss          # Main entry point, imports all override files
├── _buttons.scss        # Button component overrides
├── _inputs.scss         # Input and text field overrides
├── _dropdowns.scss      # Dropdown and menu overrides
├── _badges.scss         # Badge and tag overrides
└── _date-picker.scss    # Date picker overrides
```

## Purpose

All ng-zorro component styles are centralized here to:

1. **Maintain Consistency** - Single source of truth for component styling
2. **Theme Awareness** - All styles use CSS custom properties for light/dark theme support
3. **Easy Maintenance** - Component-specific overrides in dedicated files
4. **Prevent Duplication** - No need to override button styles in each component
5. **Scalability** - Easy to add new component overrides

## Usage

The entire override system is imported in `src/styles.scss`:

```scss
@import './styles/overrides/index';
```

## Theme Variables

All override styles use CSS custom properties defined in `src/styles.scss`:

### Light Theme
- Primary: `#639D75` (Sage Green)
- Accent: `#9D7563` (Terra Cotta)
- Text on Primary: Dark text for contrast

### Dark Theme
- Primary: `#FFEE8C` (Pastel Yellow)
- Accent: `#2E8B57` (Sea Green)
- Text on Primary: `#1A1A1A` (Dark text for contrast)

## Adding New Overrides

1. Create a new file: `_component-name.scss`
2. Add component-specific overrides using CSS custom properties
3. Import the file in `_index.scss`
4. Document any special cases or context-specific overrides

### Example:

```scss
// _new-component.scss
.ant-new-component {
  background-color: var(--color-bg-card);
  border-color: var(--color-border-default);
  color: var(--color-text-primary);

  &:hover {
    border-color: var(--color-brand-primary);
  }
}
```

## Component-Specific Context

Some components have context-specific styling needs:

- **News Card Actions** - Icon-only buttons with custom hover states
- **Article Menu** - Dropdown menu with custom item spacing
- **Source Buttons** - Sidebar navigation with active states
- **Filter Controls** - Button groups with toggle behavior

These are handled in the appropriate override files with specific class targeting.

## Best Practices

1. **Use CSS Custom Properties** - Always use theme variables, never hardcode colors
2. **Follow Specificity** - Keep selectors as simple as possible
3. **Document Exceptions** - Add comments for any !important flags or unusual patterns
4. **Test Both Themes** - Verify styles work in light and dark modes
5. **Mobile Responsive** - Include responsive considerations where needed

## Migration Guide

When moving component styles to global overrides:

1. Identify duplicate button/input/dropdown styles in components
2. Remove them from component-specific `.scss` files
3. Ensure override file covers the use case
4. Test the component still works correctly
5. Remove now-unused CSS classes

## Maintenance

- Review override files when adding new ng-zorro components
- Update theme variables if brand colors change
- Keep context-specific overrides minimal and documented
- Regular audit for unused or redundant styles
