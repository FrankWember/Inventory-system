# Web Navigation - Responsive Sidebar

## Overview

The web version now features a professional sidebar navigation for desktop/tablet views (screen width ≥ 768px), while maintaining the bottom tab bar for mobile devices.

## Features

### Desktop View (≥768px width)
- **Sidebar Navigation**: Professional left-side navigation bar
  - App branding with logo and name
  - Icon + label navigation items
  - Active state highlighting
  - Version display in footer
  - 280px width (optimized for desktop)
  - Smooth hover effects

- **Content Area**: 
  - Full width content area next to sidebar
  - No bottom tab bar (hidden on desktop)
  - Better organization and spacing

### Mobile/Tablet View (<768px width)
- **Bottom Tab Navigation**: Traditional mobile navigation
  - Icon + label tabs at bottom
  - Safe area handling for notched devices
  - Active state highlighting

## How It Works

### Components

1. **`Sidebar.tsx`**
   - Main sidebar component
   - Receives current route and navigation handler
   - Displays app branding and navigation items
   - Fully responsive and accessible

2. **`ResponsiveLayout.tsx`**
   - Wrapper component that detects screen size
   - Shows sidebar on desktop (≥768px)
   - Passes through on mobile (<768px)
   - Handles window resize events

3. **`DesktopContainer.tsx`**
   - Optional container for max-width content
   - Centers content on very large screens
   - Configurable max-width (default 1200px)

4. **`web.css`**
   - Web-specific global styles
   - Scrollbar styling
   - Print media styles
   - Better typography

### App Structure

```
App.tsx
├── NavigationContainer
│   └── Stack Navigator
│       ├── MainTabs (wrapped in ResponsiveLayout)
│       │   └── Tab Navigator
│       │       ├── Dashboard
│       │       ├── Inventory
│       │       ├── Session
│       │       ├── Trends
│       │       └── Finances
│       ├── AddDrink
│       └── EditDrink
```

## Testing

### Test on Web

```bash
# Start the web server
npm run web

# Open in browser
# Navigate to: http://localhost:8081

# Test responsive behavior:
# 1. Open browser dev tools (F12)
# 2. Toggle device toolbar (Ctrl+Shift+M)
# 3. Test different screen sizes:
#    - Mobile (375px) - should show bottom tabs
#    - Tablet (768px) - should show sidebar
#    - Desktop (1024px+) - should show sidebar
```

### Breakpoint Testing

The breakpoint is set at **768px**:
- **< 768px**: Mobile layout with bottom tabs
- **≥ 768px**: Desktop layout with sidebar

## Color Scheme

The sidebar uses the updated minimalist palette:
- **Primary**: #5B8DC7 (Soft Blue)
- **Background**: #FFFFFF (White)
- **Border**: #E2E8F0 (Light Gray)
- **Text**: #0F172A (Dark Slate)
- **Active Background**: #E3EDF7 (Primary Light)

## Customization

### Change Breakpoint

Edit the `BREAKPOINT` constant in:
- `App.tsx` (line 20)
- `src/components/ResponsiveLayout.tsx` (line 12)
- `src/components/DesktopContainer.tsx` (line 11)

### Modify Sidebar Width

Edit `src/components/Sidebar.tsx`:
```typescript
const styles = StyleSheet.create({
  container: {
    width: 280, // Change this value (current: 280px)
    // ...
  }
})
```

### Update Navigation Items

Edit `src/components/Sidebar.tsx`:
```typescript
const navItems: NavItem[] = [
  // Add, remove, or reorder items here
  { name: 'Dashboard', label: 'Accueil', icon: 'home', iconOutline: 'home-outline' },
  // ...
]
```

## Benefits

1. **Professional Appearance**: Desktop users get a more polished, app-like experience
2. **Better Organization**: Sidebar provides more context and is easier to scan
3. **Responsive**: Automatically adapts to screen size
4. **Consistent**: Same navigation structure on all platforms
5. **Accessible**: Proper focus states and keyboard navigation
6. **Performant**: Minimal re-renders, efficient layout

## Known Limitations

- Sidebar is fixed at 240px width (not collapsible)
- No animations between layout changes (instant switch)
- Breakpoint is hard-coded (not user-configurable)

## Future Enhancements

Possible improvements:
- [ ] Collapsible sidebar with toggle button
- [ ] User preference to force mobile/desktop layout
- [ ] Smooth transition animations
- [ ] Sidebar theming options
- [ ] Mini sidebar mode (icons only)
- [ ] Customizable breakpoint in settings

## Deployment

When deploying to Vercel:
1. The web configuration in `app.json` includes all necessary metadata
2. PWA-ready with theme colors and display settings
3. Static export optimized for hosting
4. Custom CSS is bundled automatically

```bash
# Build for production
npx expo export --platform web

# Deploy to Vercel
vercel --prod
```

## Support

For issues or questions:
- Check browser console for errors
- Verify screen width detection is working
- Test on different browsers (Chrome, Firefox, Safari)
- Check mobile device orientation changes

## Version

Current version: 1.0.0 (displayed in sidebar footer)
