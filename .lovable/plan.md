# Make the site fully editable by admins

Goal: signed-in admins can edit inventory, gallery images, site text, and key site images (logo, hero, backgrounds) — both inline on the page and via a dedicated admin dashboard.

## 1. Roles (admin gate)

- New enum `app_role` (`admin`, `user`) and table `user_roles (user_id, role)` with RLS.
- `has_role(_user_id, _role)` SECURITY DEFINER function (avoids recursive RLS).
- Seed your account as admin (you'll tell me the email, or first signup gets promoted manually via a one-off insert).
- `useIsAdmin()` hook reading `user_roles` for the current session.

## 2. Editable content storage

Two new tables (all writes restricted to admins via `has_role`; public read):

- `site_content (key text pk, value jsonb, updated_at)` — stores text snippets and image URLs keyed by slot (e.g. `home.hero.title`, `home.hero.image`, `about.intro`, `services.tent.description`).
- `gallery_images (id, url, caption, sort_order, created_at)` — gallery photos.

Inventory already exists (`inventory_items`) — add admin INSERT/UPDATE/DELETE RLS policies (currently public-read only).

Storage: reuse existing public `images` bucket; add admin-only write policies.

## 3. Admin dashboard (`/admin`)

Protected by `_authenticated` + admin role check. Tabs:

- **Inventory** — table view; add/edit/delete rows (name, category, price, unit, notes, sort_order).
- **Gallery** — grid; upload (drag & drop), reorder, caption, delete.
- **Site images** — slots for logo, each page's hero, section backgrounds; click to replace via upload.
- **Site text** — list of all registered text slots with inline editors.

## 4. Inline editing on public pages

When signed in as admin, render:

- `<EditableText slot="home.hero.title">` — falls back to default copy; click to edit (popover with textarea + save).
- `<EditableImage slot="home.hero.image">` — hover overlay with "Replace" button → upload to `images` bucket → save URL to `site_content`.
- Floating "Admin mode" toggle in the corner so admins can preview as visitors.

Non-admins see the rendered content with zero edit affordances. Default copy stays hardcoded as fallback so the site never looks empty if a slot is unset.

## 5. Wire-up across existing pages

Convert hardcoded headings, paragraphs, and hero/background images on:
`index.tsx`, `about.tsx`, `services.tsx`, `tent-rentals.tsx`, `events.tsx`, `gallery.tsx`, `inventory.tsx`, `contact.tsx`, and `SiteLayout` (logo) — into `<EditableText>` / `<EditableImage>` slots backed by `site_content`.

Gallery page reads from `gallery_images` table. Inventory page already reads from `inventory_items` — no display change, just admin writes.

## 6. Header link

Add "Admin" link in header (visible to admins only) next to "Account".

---

## Technical notes

- Server functions (`createServerFn` + `requireSupabaseAuth`) for all admin mutations; admin check via `has_role` inside the handler.
- Public reads of `site_content` and `gallery_images` go through `supabaseAdmin` in a public server fn (no PII) so visitors don't need a session.
- Image uploads go directly from browser to Supabase Storage (`images` bucket) using the user's session; saved URL is then written to the relevant table via server fn.
- All slot keys live in a single `src/lib/content-slots.ts` registry so the admin "Site text" tab can enumerate them.
- Designed so adding a new editable slot later = add a key to the registry + drop `<EditableText slot="...">` in the JSX.

Tell me the email address that should be the first admin and I'll seed it in the migration.