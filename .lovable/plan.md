## Issues

1. **No mobile logout.** Sign out only exists on `/account`, which isn't reachable from the mobile bottom nav when in admin or public mode.
2. **Admin invite is hard to find on mobile.** The `/admin/admins` page (with Invite admin form) already exists, but there's no tile for it in the mobile drawer's admin section.

## Changes

### 1. `src/components/MobileBentoDrawer.tsx`
- In the **admin manage** tile grid, add an **"Admins"** tile pointing to `/admin/admins` (shield icon).
- At the bottom of the drawer, when `user` is signed in, render a **"Sign out"** button (in both public and admin views) that calls `supabase.auth.signOut()` and closes the drawer. Place it directly under the "Signed in as …" line for the admin view, and as a new footer row for the public/account view.

### 2. `src/components/MobileBottomNav.tsx` (admin mode)
- Add a small **Account** link in the right slot or surface it via the drawer fallback so admins can reach sign-out without leaving admin. Simplest: when in admin and the drawer is the right-most slot is already replaced by the "Admin" jump, swap that jump for a **Menu** button (it's already an admin route) so the drawer — which will now contain the sign-out button — is always one tap away.

No backend changes. Admin invite functionality is already wired (`/admin/admins` + `inviteAdmin` server fn); we're only improving discoverability + adding logout.
