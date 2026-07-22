## Plan

Restructure the desktop nav in `src/components/SiteLayout.tsx`:

1. **Rentals dropdown** — add Beacon on Broadway at the end:
  - Tent Rentals
  - Inventory & Pricing
  - AI Event Recommender
  - Beacon on Broadway (moved from Services)
2. **Rename Services → Catering** — collapse the dropdown into a single top-level link:
  - Replace the `nav.services` group with `{ labelKey: "nav.catering", to: "/catering" }`.
  - Removes the "All Services" (`/services`) and "Events" (`/events`) entries entirely from the nav (routes themselves stay in place; only the nav references are dropped).

No changes to the mobile bento drawer or footer in this pass (user asked about the tabs / top nav). If you want the mobile drawer and footer updated to match, say so and I'll extend the plan.

&nbsp;

add sub tab called venue and add the beacon under venue