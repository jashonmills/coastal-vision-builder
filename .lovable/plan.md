## Goal

Restrict the site to use only images from the Lovable Cloud `images` bucket, and surface the configuration sketch images on the Inventory page blended with the rental list so visitors can see real setup layouts.

## Findings (from inspecting the bucket)

The `images` bucket has 52 jpgs. They fall into three groups, distinguishable by share of near-white pixels:

- **Sketches / configuration diagrams** (~14 files, ≥50% white): hand-drawn top-down floor plans showing tent + table + chair + dance floor layouts (e.g. "1 - 20x60 Frame Tent, 8 - 60in Round Tables, 64 Chairs, 16 - 4x4 Dance Floor Sections"), plus multi-panel "Hexagon Tent Variation" reference sheets.
- **Product cutouts on white** (a few): single items like skirted buffet tables, speakers, etc.
- **Event photos** (the rest): real tent setups, weddings, festivals, catering.

I'll classify them at build time with a tiny script (whiteness ≥ 50% → sketch) and hand-verify the borderline files, then commit a typed manifest.

## Changes

### 1. Image manifest (single source of truth)

Create `src/lib/site-images.ts`:
- `BUCKET_BASE = ${VITE_SUPABASE_URL}/storage/v1/object/public/images`
- Exported arrays: `sketchImages[]`, `productImages[]`, `photoImages[]` — each entry `{ file, url, alt, caption? }`.
- Helpers: `heroImage()`, `pickPhotos(n, seed?)`, `pickSketches(n)`.

Captions for sketches come from a small lookup keyed by filename (e.g. "20×60 Frame Tent · 8 rounds · 64 chairs · 16 dance floor sections"). Files whose caption I cannot read confidently get a generic "Sample event layout".

### 2. Remove generated/stock assets, route everything through the manifest

- Delete the generated hero/section images under `src/assets/` (`hero-tent.jpg`, `wedding-tent.jpg`, `coastal-reception.jpg`, `evening-tent.jpg`, `festival-tents.jpg`, `corporate-event.jpg`, `private-party.jpg`) and remove their imports.
- Update the pages that use them — `index.tsx`, `events.tsx`, `gallery.tsx`, `services.tsx`, `tent-rentals.tsx`, `about.tsx`, `contact.tsx`, `recommender.tsx`, `SiteLayout.tsx` — to pull from the manifest instead. Same compositions, real photos.
- Gallery page becomes a masonry of `photoImages` only (no sketches there — sketches live on Inventory).

### 3. Inventory page: blend in the configuration sketches

`src/routes/inventory.tsx` today renders one big "Available for Rent" grid grouped by category. New structure:

```text
Inventory
├─ Intro
├─ Sample Setup Configurations            ← new band, full-width
│   └─ Sketch cards (image + caption + "Build this in the Recommender" link)
├─ Available for Rent                     ← existing categorized list
│   └─ After every 2nd category, inject 1 sketch card inline as a
│      "Layout idea" tile so sketches blend into the inventory flow
└─ CTA → Request a Quote
```

- The top "Sample Setup Configurations" band is a horizontally-scrollable row on mobile, 2–3 column grid on desktop, using `sketchImages`.
- The inline "Layout idea" tiles inside the category grid use the same card chrome as inventory items so the page reads as one merged experience.
- Each sketch card's caption parses the configuration line (tent size + tables + chairs + dance floor) into small badges where possible; otherwise shows the raw caption.

### 4. Recommender blueprint stays AI-generated

The Gemini-generated blueprint on the Recommender page is content the user explicitly asked for and isn't a stock image, so it stays. Everywhere else, only `images` bucket URLs render.

### 5. Lint guard (lightweight)

Add a comment header in `src/lib/site-images.ts` plus a short note in `README.md`: "All `<img>` and CSS background images on this site must resolve to a URL from `site-images.ts` (i.e. the `images` storage bucket). Exception: the AI-generated blueprint on `/recommender`."

## Technical details

- Classification script (one-off, run during the build turn): downloads each object via the public URL, computes whiteness on a 64×64 thumbnail, writes `src/lib/site-images.generated.ts` with the file lists. `site-images.ts` re-exports + decorates with captions/alt.
- Filenames stay as-is (Instagram-style numeric names); alt text + captions provide accessibility and SEO.
- No DB schema changes. No new routes. No new dependencies.
- `inventory_items` rows are not linked to sketch files — sketches are decorative/illustrative, not 1:1 with SKUs.

## Out of scope

- Uploading new images to the bucket.
- Linking specific sketches to specific inventory SKUs (can add later if you want a "this layout uses these items" mapping).
- Changing the Gallery to mix sketches in — sketches live on Inventory per your description.