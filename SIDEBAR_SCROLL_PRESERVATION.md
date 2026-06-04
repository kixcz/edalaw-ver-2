# Sidebar Scroll Position Preservation

## Feature Implemented

Added automatic scroll position preservation to the sidebar navigation, so your scroll position is maintained when navigating between pages.

## How It Works

### 1. **Save Scroll Position**
- Before navigation starts, the current scroll position is saved to `localStorage`
- Uses Inertia's `router.on('start')` event listener
- Saves the pixel offset from the top of the sidebar

### 2. **Restore Scroll Position**
- After the new page loads, the saved scroll position is restored
- Uses Inertia's page component change detection
- Automatically scrolls back to where you were before navigation

## Technical Implementation

### Files Modified
- `resources/js/components/app-sidebar.tsx`

### Key Changes

**1. Added React Hooks:**
```typescript
import { useEffect, useRef } from 'react';
const sidebarRef = useRef<HTMLDivElement>(null);
```

**2. Save Position on Navigation Start:**
```typescript
useEffect(() => {
    const handleStart = () => {
        if (sidebarRef.current) {
            const scrollTop = sidebarRef.current.scrollTop;
            localStorage.setItem('sidebarScrollPosition', scrollTop.toString());
        }
    };

    router.on('start', handleStart);

    return () => {
        router.off('start', handleStart);
    };
}, []);
```

**3. Restore Position on Page Load:**
```typescript
useEffect(() => {
    const savedPosition = localStorage.getItem('sidebarScrollPosition');
    if (savedPosition && sidebarRef.current) {
        const scrollTop = parseInt(savedPosition, 10);
        setTimeout(() => {
            if (sidebarRef.current) {
                sidebarRef.current.scrollTop = scrollTop;
            }
        }, 0);
    }
}, [page.component]);
```

**4. Attached Ref to Sidebar:**
```typescript
<Sidebar ref={sidebarRef} collapsible="icon" variant="inset">
```

## User Experience

### Before:
- Scroll down in sidebar to find a menu item
- Click the menu item
- Page loads and sidebar scrolls back to top ❌
- Have to scroll down again to find next desired item

### After:
- Scroll down in sidebar to find a menu item
- Click the menu item
- Page loads and sidebar maintains scroll position ✅
- Can easily navigate to nearby items without re-scrolling

## Benefits

1. **Improved Navigation Efficiency** - No need to re-scroll after each page change
2. **Better UX for Long Menus** - Especially helpful for roles with many menu items (jail officers, super admins)
3. **Persistent Across Sessions** - Uses localStorage, so position is maintained even if you refresh
4. **Automatic & Seamless** - Works transparently without any user interaction needed

## Storage Details

- **Storage Key:** `sidebarScrollPosition`
- **Storage Type:** `localStorage`
- **Data Format:** String (pixel offset as number)
- **Example Value:** `"250"` (meaning scrolled 250px from top)

## Build Output

```
Build completed successfully
```

## Testing Checklist

- [x] Scroll down in sidebar
- [x] Click on a menu item
- [x] Verify scroll position is maintained after page load
- [x] Navigate to multiple pages
- [x] Verify position persists across navigations
- [x] Refresh the page
- [x] Verify position is restored even after refresh

## Browser Compatibility

Works in all modern browsers that support:
- `localStorage` (IE8+)
- `useRef` and `useEffect` React hooks
- Inertia.js router events

## Notes

- The scroll position is stored globally (not per-route)
- Last position before navigation is always saved
- Position is automatically cleared/overwritten on next navigation
- No manual cleanup needed - localStorage handles it automatically
