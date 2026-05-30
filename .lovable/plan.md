# Fix admin sub-routes not rendering

## Root cause

`src/routes/admin.tsx` serves two conflicting purposes:

1. The `/admin` page that renders the Pricing / Gallery / Site Images / Site Text tabs.
2. The implicit parent layout for every `admin.*.tsx` child route (`/admin/dashboard`, `/admin/quote-requests`, `/admin/inventory`, `/admin/pricing`, `/admin/scheduler`, `/admin/data-import`, etc.).

A TanStack Router parent route must render `<Outlet />` for its children to appear. `admin.tsx` doesn't — it renders `PricingAdmin` and friends directly. Result: every `/admin/*` URL matches the child route but only the parent's UI shows on screen, which is exactly the "every pill goes to the same screen" symptom.

## Fix

Split `admin.tsx` into a layout + an index page:

1. **Create `src/routes/admin.index.tsx`** — move the entire current `AdminPage` (auth gate, ClaimAdmin, `AdminTabs active="admin"`, the pricing/gallery/images/text tab UI, all the `PricingAdmin`, `GalleryAdmin`, `ImagesAdmin`, `TextAdmin`, `ImageSlotRow`, `CaptionEditor`, `TextSlotRow`, `PricingRow` components) into this new file under `createFileRoute("/admin/")`.

2. **Replace `src/routes/admin.tsx`** with a minimal layout:

   ```tsx
   import { createFileRoute, Outlet } from "@tanstack/react-router";

   export const Route = createFileRoute("/admin")({
     component: () => <Outlet />,
   });
   ```

   No auth gate here — each child page already runs its own `useAuth` + `useIsAdmin` check (and the new index page will too), matching the existing pattern.

3. **Update the import in `admin.index.tsx`** so it still imports `AdminTabs` from `./admin.quote-requests` (unchanged).

That's the entire change — pure routing/layout split, no business-logic edits, no styling changes. After this, `/admin` renders the pricing/content tabs and `/admin/dashboard`, `/admin/quote-requests`, `/admin/inventory`, etc. each render their own page as intended.

## Verification

- Visit `/admin` → see Pricing / Gallery / Site Images / Site Text tabs (current behavior).
- Click Dashboard pill → `/admin/dashboard` renders the dashboard page.
- Click Quote Requests, Quotes, Inventory pills → each renders its own page.
- Data Import and Scheduler links → render their own pages.
