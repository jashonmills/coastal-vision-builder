## Problem

The mobile bento drawer (`src/components/MobileBentoDrawer.tsx`) exposes only a subset of the site's public pages. Several routes reachable from the desktop header/footer are unreachable on mobile, notably:

- `/catering`
- `/rental-contract`
- `/virtual-tour`
- `/events`

## Plan

Extend the public sections of `MobileBentoDrawer.tsx` so every top-level public page is reachable.

1. Add a third bento block below "Explore" and "More" titled **"Services & Info"** containing:
   - Catering (`/catering`)
   - Virtual Tour (`/virtual-tour`)
   - Events (`/events`)
   - Rental Contract (`/rental-contract`)

   Center CTA in that block: "Contact" → `/contact` (Phone icon), consistent with the existing bento pattern (2×2 grid with a center circle).

2. Pick icons from `lucide-react` already in use where possible (e.g., `UtensilsCrossed` for Catering, `Compass` or `View` for Virtual Tour, `CalendarDays` for Events, `FileSignature` or `FileText` for Rental Contract). Use the same `tileBg` gradient palette style as existing tiles for visual consistency.

3. No changes to the bottom nav bar itself (`MobileBottomNav.tsx`) — the "Menu" button already opens the drawer, which is the intended pattern.

4. No changes to admin drawer, desktop header, routes, or business logic.

## Verification

- Open mobile viewport, tap Menu, confirm all four new tiles render and each Link navigates to the correct route and closes the drawer.
- Confirm the existing Explore/More blocks are untouched.
