## Plan: Make the mobile drawer role-aware and stop admin users being bounced to public pages

### What’s wrong right now
- The bottom nav was made admin-aware, but the drawer it opens (`MobileBentoDrawer`) is still hardcoded to public links.
- So inside admin, tapping the bottom-right menu opens tiles like Home, Tent Rentals, Services, public Inventory, Gallery, Events, About, Contact.
- That’s why it feels like the routing is broken: the drawer is literally sending you back to public pages.

### What I’ll change
1. **Make `MobileBentoDrawer` aware of auth + admin role**
   - Use the existing `useAuth()` and `useIsAdmin()` hooks.
   - Read the current pathname.
   - If the user is an admin and currently on `/admin/*`, render an admin drawer.
   - Otherwise keep the public drawer behavior.

2. **Replace public drawer tiles with admin tools while in admin**
   Admin drawer will include direct links to:
   - Dashboard → `/admin/dashboard`
   - Quote Requests → `/admin/quote-requests`
   - Quotes → `/admin/quotes`
   - Inventory → `/admin/inventory`
   - Scheduler → `/admin/scheduler`
   - Staff → `/admin/staff`
   - Pricing & Content → `/admin`
   - Data Import → `/admin/data-import`

3. **Keep a deliberate public escape hatch**
   - Add one clear “Public Site” / “View Site” action, instead of mixing public pages into the admin tools.
   - This prevents accidental bouncing while still letting an admin preview the customer-facing site.

4. **Update drawer labels/header by context**
   - Admin context: title like “Admin Tools” and subtitle focused on operations.
   - Public context: keep the current public menu.

5. **Clean up the current fragile drawer structure**
   - Remove the current forced tuple casts in the nav/drawer pattern where possible.
   - Keep styling consistent with the existing bento drawer, but make the routing correct first.

### Expected result
- When you are in `/admin/*`, the bottom-right menu opens admin tools, including Staff.
- Tapping drawer items from admin routes keeps you inside admin routes.
- Public pages still show public navigation.
- Admins browsing the public site still see the public menu, with an obvious way back to admin from the bottom nav.

### Files to update
- `src/components/MobileBentoDrawer.tsx`
- Possibly a small cleanup in `src/components/MobileBottomNav.tsx` only if needed to keep the admin/public behavior consistent.