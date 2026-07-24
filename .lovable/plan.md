## Changes

**`src/lib/site-images.ts`**
- Remove the duplicate `galleryImg("Tent near lake.jpg", ...)` entry in `gallerySetups` (currently listed twice on consecutive lines).
- Investigate the broken image: the file in the `new-images` bucket may not exist at that exact filename/case. If a quick check shows a casing/extension mismatch, correct it; otherwise leave a single entry and note that the underlying storage file needs re-upload by admin.

**`src/routes/gallery.tsx`**
- In the setups section only, stop rendering the `<figcaption>` (or render nothing when the section key is `setups`). Equipment, Furniture, and Blueprints keep their captions.

No backend, admin, or other page changes.