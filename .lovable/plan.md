# Role-Aware Bottom Navigation

Right now `MobileBottomNav` shows the same 5 items (Home, Rentals, Quote CTA, AI Planner, Menu) for every visitor regardless of who's logged in. We'll switch it to render one of three variants based on auth + role.

## Variants

**1. Public (signed out, or signed-in customer browsing public pages)**
- Home → `/`
- Rentals → `/tent-rentals`
- Center CTA: Get Quote → `/contact`
- AI Planner → `/ai-tent-planner`
- Menu (opens existing drawer)

**2. Admin (user has `admin` role)**
- Dashboard → `/admin/dashboard`
- Quotes → `/admin/quotes`
- Center CTA: Quote Requests → `/admin/quote-requests`
- Scheduler → `/admin/scheduler`
- Menu (drawer) — drawer will include Inventory, Pricing, Staff, Data Import, plus a "Switch to public site" link

**3. Account holder (signed in, non-admin)**
- Home → `/`
- My Quotes → `/account`
- Center CTA: New Quote → `/contact`
- Rentals → `/tent-rentals`
- Menu (drawer) with Sign out, AI Planner, etc.

## Selection logic

Inside `MobileBottomNav`:
- `const { user } = useAuth();`
- `const { isAdmin } = useIsAdmin();`
- If `isAdmin` AND pathname starts with `/admin` → admin variant
- Else if `isAdmin` AND on a public route → public variant, but show a small "Admin" pill in the menu button area linking to `/admin/dashboard` (so admins on the marketing site can jump back)
- Else if `user` (logged-in non-admin) → account variant
- Else → public variant

This way admins still see public nav while previewing marketing pages, but get the admin nav inside `/admin/*`. Account holders viewing their quote get account nav everywhere.

## Implementation

Single file change: `src/components/MobileBottomNav.tsx`.
- Extract three `items` arrays (`publicItems`, `adminItems`, `accountItems`) each with `{ to, labelKey, icon, exact }` plus a `centerCta` object (`{ to, labelKey, icon, ariaLabel }`).
- Pick the active set from the rules above.
- Render with the existing visual structure (2 items, center floating CTA, 2 items, menu button) — no style changes.
- Add new i18n keys under `nav.*`: `dashboard`, `quotes`, `quoteRequests`, `scheduler`, `myQuotes`, `newQuote`. Fall back to English strings inline if the i18n files aren't wired up for new keys yet.

No changes to `SiteLayout`, routes, or the drawer in this pass. The drawer contents can be tightened in a follow-up if you want role-specific menu items there too — say the word and I'll include it.

## Out of scope

- Restyling the bar
- Changing the drawer (`MobileBentoDrawer`) contents
- Desktop navigation
- Adding new routes
