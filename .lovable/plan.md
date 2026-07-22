## Goal

Give admins full control (upload, replace, delete, edit caption/alt, reorder) over every image rendered on public pages — not just the gallery. Currently all images are hardcoded in `src/lib/site-images.ts` and must be changed via code.

## Current state (verified)

- `src/lib/site-images.ts` is the single source of truth for images, split into 7 groups: `gallerySetups`, `galleryEquipment`, `galleryFurniture`, `sketchImages` (=`galleryBlueprints`), `productImages`, `photoImages`, and `cateringCalloutImage`.
- Consumers: `gallery.tsx`, `inventory.tsx`, `ServicesCallouts.tsx`, plus helpers `heroImage()` / `pickPhoto()` / `pickPhotos()` used across many pages.
- Two public storage buckets already exist: `images` and `new-images`.
- A `gallery_images` table exists but is minimal (`id, url, caption, sort_order, created_at`) and unused by the site.

## Approach

Replace the hardcoded arrays with a database-backed catalog managed by admins, keeping the same `SiteImage` shape and helper API so consumer pages don't have to change.

### 1. Database

New migration:
- Drop/replace the underused `gallery_images` table with `public.site_images`:
  - `id uuid pk`, `category text` (enum-like: `gallery_setups`, `gallery_equipment`, `gallery_furniture`, `blueprints`, `products`, `photos`, `catering_callout`), `bucket text`, `file text`, `url text`, `alt text`, `caption text`, `sort_order int`, `created_at`, `updated_at`.
  - Public `SELECT` policy (anon + authenticated); `INSERT/UPDATE/DELETE` restricted to admins via existing `has_role(auth.uid(), 'admin')`.
  - Standard GRANTs.
- Seed the table from the current `site-images.ts` contents so nothing changes visually on first load.

### 2. Data access

- `src/lib/site-images.functions.ts` — public server fn `listSiteImages()` returning grouped `SiteImage[]` by category.
- `src/hooks/use-site-images.ts` — `useSuspenseQuery` wrapper that returns the same shape as today's exports.
- Refactor `src/lib/site-images.ts` to expose the seed data as `DEFAULT_SITE_IMAGES` (fallback when DB is empty) and keep the `SiteImage` type + `pickPhoto`/`pickPhotos` helpers unchanged (helpers accept an array arg or read from context).
- Update consumers (`gallery.tsx`, `inventory.tsx`, `ServicesCallouts.tsx`, any callers of `heroImage`/`pickPhoto*`) to read from the hook instead of the static export.

### 3. Admin UI — `/admin/images`

New route `src/routes/admin.images.tsx`:
- Tabs for each category (Setups, Bar & Equipment, Furniture, Blueprints, Products, Photos, Catering callout).
- Per-image row: thumbnail, alt text (editable), caption (editable), sort order, Delete button.
- "Upload images" button — multi-file uploader that pushes to the `new-images` bucket via `supabase.storage`, then inserts rows via an admin server fn.
- Drag-to-reorder (or up/down arrows) writing back `sort_order`.
- Replace-file action per row (upload new file, updates `file`/`url`).
- All mutations go through `src/lib/site-images.functions.ts` admin fns using `requireSupabaseAuth` + `has_role` check, then `supabaseAdmin` for writes.
- Link the page from the admin sidebar/dashboard.

### 4. Cleanup

- Remove hardcoded `img(...)` / `galleryImg(...)` arrays from `site-images.ts` once the DB seed is verified, keeping only the type + helpers.
- Leave the two `.asset.json` CDN assets (`sony-ult10`, `cafe-lights`) reachable — seed their URLs directly into `site_images` rows so admins can delete/replace them like any other.

## Out of scope

- Editing text/copy on public pages (already covered elsewhere).
- Changing which categories exist or how the gallery filters render.
- Reworking the AI-generated blueprint on `/recommender`.

## Technical notes

- Uploads write to the existing public `new-images` bucket; RLS on `storage.objects` will get an admin-only INSERT/DELETE policy for that bucket.
- Public reads stay cache-friendly: `listSiteImages` runs in the loader via `ensureQueryData`, so SSR renders with the latest set.
- Fallback to `DEFAULT_SITE_IMAGES` if the DB query returns empty (safety net during the first deploy).
