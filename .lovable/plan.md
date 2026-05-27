## Goal
Replace the cluttered 8-link top nav with a clean, grouped header using dropdowns.

## New header structure

Primary visible items (desktop):
- **Home**
- **Rentals** ▾ (dropdown)
  - Tent Rentals
  - Inventory
  - Event Recommender
- **Services** ▾ (dropdown)
  - All Services
  - Events
- **Gallery**
- **About** ▾ (dropdown)
  - About Us
  - Contact

Right side (unchanged behavior, tighter):
- **Request a Quote** (primary pill button)

This collapses 8 links + 2 buttons down to 4 nav items + 1 CTA. The standalone "Find My Tent Size / Event Recommender" outlined button is removed from the header (it lives inside the Rentals dropdown and is still surfaced via the mobile bottom nav + CTASection).

## Implementation

**`src/components/SiteLayout.tsx`**
- Replace flat `navLinks` array with a grouped structure: `{ label, to?, children?: [{label, to, description?}] }`.
- Use shadcn `NavigationMenu` (already available in `src/components/ui/navigation-menu.tsx` — verify; if not, add via `bunx shadcn add navigation-menu`) for hover/focus dropdowns with proper a11y.
- Each dropdown panel: small padded card, 1 column, item shows label + optional one-line description in muted text.
- Active state: highlight the parent label when any child route is active (compare `useRouterState().location.pathname`).
- Keep "Request a Quote" CTA. Remove the separate "Event Recommender" outlined button.
- Mobile sheet: render groups as collapsible sections (group label as a non-link heading, children indented) instead of a long flat list. Keep the existing `MobileBottomNav` untouched.

**No changes** to routes, pages, or `MobileBottomNav`.

## Out of scope
Footer, logo, search, theme toggle.
