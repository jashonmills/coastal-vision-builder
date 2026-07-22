
## Problem

Two admin surfaces exist but aren't fully wired to the public site:

1. **Site Images library** (`/admin/site-images`) — the admin can upload, delete, reorder, and edit alt/caption in the `site_images` table, but every public page still reads a hardcoded list from `src/lib/site-images.ts` (Storage bucket URLs). So admin changes never appear on Gallery, Rentals, Inventory, About, Home, etc. There is also no "archive" concept — only hard delete.
2. **Editable text/images** — `EditableText` / `EditableImage` components and a `site_content` table exist, plus a slot registry in `src/lib/content-slots.ts`, but no page actually renders them, and there's no admin "Site Text" screen to browse/edit slots page by page.

## Plan

### A. Site Images — make admin the source of truth

1. **Add `archived boolean` + `updated_at` handling** to `public.site_images` via migration; default `false`; index on `(category, archived, sort_order)`.
2. **Rewrite `src/lib/site-images.ts`** to fetch from the `site_images` table (still exporting `gallerySetups`, `galleryEquipment`, `galleryFurniture`, `sketchImages`, `pickPhoto`, `pickPhotos`, `cateringCalloutImage`, type `SiteImage`) via a React Query hook + a small in-module cache. Keep the hardcoded list as a one-time seed fallback only if the table is empty for a category (safety net).
3. **Update every consumer** (`gallery.tsx`, `tent-rentals.tsx`, `inventory.tsx`, `services.tsx`, `about.tsx`, `events.tsx`, `catering.tsx`, `index.tsx`, `ServicesCallouts.tsx`) to use the new hook — signatures preserved so pages don't need structural changes.
4. **Extend `/admin/site-images`**:
   - Add **Archive / Unarchive** toggle (soft delete) alongside hard Delete.
   - Add **"Show archived"** filter chip per category.
   - Add **drag-and-drop reorder** (in addition to up/down arrows) using `@dnd-kit`.
   - Add **replace-image** button per card (keeps id, alt, caption, sort_order; swaps `url`/`file`).
   - Add **bulk upload** progress + per-file error surfacing (already partial).
   - Ensure every category the public site uses is present: `gallery_setups`, `gallery_equipment`, `gallery_furniture`, `gallery_uploads`, `blueprints`, `products`, `photos`, `catering_callout`, plus new `home_hero`, `about_photos`, `inventory_hero` as needed for hero backgrounds.
5. **Backfill** any category still missing rows by seeding from `src/lib/site-images.ts` in a one-shot migration (idempotent — only inserts if the category is empty).

### B. Site Text — one place to edit every string

1. **Expand `src/lib/content-slots.ts`** to cover every user-visible text field, grouped by page: Home, About, Gallery, Inventory, Rentals, Catering, Events, Contact, Beacon on Broadway, Virtual Tour, AI Planner, Rental Contract, Footer, Nav.
2. **Wire `<EditableText>` into each page** — replace static strings (or i18n lookups) with `<EditableText slot="page.section.field" fallback={t(...)}>`. Non-admins see the fallback (current i18n text) unchanged; admins see hover pencil + inline edit.
3. **Wire `<EditableImage>`** for hero backgrounds and marquee images already covered by the `IMAGE_SLOTS` registry.
4. **New admin page `/admin/site-text`** — grouped by page tab (Home / About / Gallery / ...), each slot rendered as a labeled textarea with a Save button, backed by `useSaveSlot`. Same data as inline editing, just centralized for bulk work.
5. Add a **"Site Text"** and confirm **"Site Images"** card on `/admin` index for discoverability.

### C. Nothing else changes

- No changes to auth, RLS (existing admin policies on `site_content` + `site_images` already cover it), quotes, email, or contracts.
- i18n JSON stays as the fallback source; DB overrides win when present.

## Technical notes

- Migration: `ALTER TABLE public.site_images ADD COLUMN archived boolean NOT NULL DEFAULT false;` + new index; seed missing categories via `INSERT ... WHERE NOT EXISTS`.
- Query key pattern: `["site-images", category, { archived }]`; public consumers always query `archived = false`.
- `EditableText` already reads from `useAllSiteContent()` which caches all slots in one query — no per-slot request cost.
- Bundle impact: `@dnd-kit/core` + `@dnd-kit/sortable` (~15KB gz), admin-only route.

## Out of scope

- Rich-text (WYSIWYG) editing — plain text / multiline only, matching existing `EditableText`.
- Versioning / audit history for slot edits.
- Per-locale editing (English only for now; other locales continue to use i18n JSON).
