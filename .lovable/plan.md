## Fix: mobile phones still see the desktop 360° embed

### Problem
`VirtualTour` decides mobile vs. desktop with a JS `useIsMobileOrTablet` hook. On first render (SSR + before `useEffect` runs) it returns `false`, so the desktop iframe mounts first and only swaps to the raw panorama stack after hydration. On real phones this causes the wide iframe to render (and its 16/9 min-height + fixed embed width forces horizontal scroll), and any cached/older bundle never swaps at all.

### Fix
Replace the JS breakpoint hook with pure CSS responsive visibility so the correct view is chosen by the browser at paint time — no hook, no hydration flip.

- Render BOTH blocks in the JSX:
  - Mobile/tablet panorama stack wrapped in `<div className="lg:hidden">`
  - Desktop iframe block wrapped in `<div className="hidden lg:block">`
- Remove `useIsMobileOrTablet` hook entirely.
- Keep the `devicemotion` listener, but gate it by checking `window.matchMedia('(min-width: 1024px)').matches` inside the effect (still desktop-only, no re-render dependency).
- Leave the mobile `<img>` markup, captions, and helper text unchanged (matches the screenshot).
- Leave desktop iframe markup unchanged.

### Files
- `src/components/VirtualTour/VirtualTour.tsx` — swap JS breakpoint for `lg:hidden` / `hidden lg:block`, drop the hook, adjust the devicemotion effect.

### Note on the live site
After this change, the user should republish so the phone loads the new bundle (browser cache on the phone may still serve the old JS otherwise).
