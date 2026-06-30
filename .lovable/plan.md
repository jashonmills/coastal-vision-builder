## Reorganize the Gallery into clear categories

Right now the gallery is one long mixed grid (scenic shots → folding chairs → blueprints all jumbled). I'll group every image into a category and render the gallery as labeled sections, with category filter chips replacing the current `all / coastal / reception / lighting` chips.

### Categories

1. **Event Setups** — past events, tents up, full scenes
   - All "View 1–10", "Tent in backyard", "Tent near lake", "Small Ceremony setup", "20' Tent with windows", "20x60 Tent", "20x40 round with dance floor", "10x20 frame tent seating for 16", "marq. underside", and the 5 unlabeled photo files (`1051-1`, `331`, `2e19a1a8…`, `67dac2ff…`, `c0e876c7…`)

2. **Bar & Equipment** — bar-related and standalone gear
   - Professional bar, Portable Bar 1/2/3, Fill and Chill, 55 gallon water barrel, Patio heater, Ion BT Speaker

3. **Tables & Chairs** — furniture
   - Black Chair, White Chair, Fruitwood folding chair, 60 round table, 8' table

4. **Blueprints & Floor Plans** — all hand-drawn layouts
   - Pulled from the existing `sketchImages` list (the 14 floor-plan sketches already in `src/lib/site-images.ts`)

### Changes

- **`src/lib/site-images.ts`** — split `galleryImages` into four exported arrays (`gallerySetups`, `galleryEquipment`, `galleryFurniture`, `galleryBlueprints`). Blueprints reuse the existing `sketchImages` entries so we don't duplicate URLs. Keep `galleryImages` as the concatenation for backward compatibility / lightbox.
- **`src/routes/gallery.tsx`** — replace the current filter chips with category chips: `All / Event Setups / Bar & Equipment / Tables & Chairs / Blueprints`. When `All` is selected, render each category as its own labeled section (h2 + masonry grid) so the page reads as grouped sections instead of one mixed wall. When a specific category is selected, show just that group. Lightbox indices stay correct against the currently shown list.
- Drop the old keyword-based `tagsFor` helper — it's replaced by explicit categorization.

### Out of scope

- No new uploads, no renames in the storage bucket, no changes to other pages using `photoImages` / `sketchImages` / `productImages`.
- The `.heic` file stays where it is (Event Setups); we already flagged it may not render in some browsers.
