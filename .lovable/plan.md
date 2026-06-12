## Problem

The Event Blueprint always renders a rectangle, even when the recommendation is a 40' Hexagon Tent. The image prompt in `src/lib/recommender.functions.ts` literally says *"Draw the tent as a single rectangle outline"*, so shape and recommendation drift apart. The user also wants a second image showing a 3D perspective view of the same setup (similar in style to the reference renderings they uploaded — line-art 3D, not photographic).

## Changes

### 1. `src/lib/recommender.functions.ts` — shape-aware prompt + second 3D image

- Derive a `tentShape` from `recommendation.tent_size` (case-insensitive):
  - contains "hexagon" → `hexagon` (single hex, or 3-petal cluster if size mentions multiple 20x20s)
  - contains "marquee" / "pole" → `pole tent` (rectangular with two center peaks)
  - contains "high peak" / "frame" / "x" + digits → `frame tent` (rectangular outline)
  - festival/multi-tent strings → `multi-tent cluster`
  - fallback → `frame tent`
- Rewrite the blueprint prompt so the outer outline matches `tentShape` (e.g. *"Draw the tent footprint as a regular hexagon outline"* / *"…as two adjoining rectangles forming a pole tent"*), and include the shape name in the dimension label. Keep the strict black-line, top-down, schematic style.
- Add a **second** generation call (same model + endpoint) for `perspectiveImage`: hand-drafted black-line **3D isometric/axonometric** sketch of the same tent shape with tables/chairs/dance floor visible inside, plain white background, no color, in the style of the uploaded rental reference sketches (10x20 frame tent, 20x40 marquee, hexagon cluster). Run both image calls in parallel with `Promise.all` so total latency doesn't double.
- Return `{ recommendation, blueprintImage, perspectiveImage }`. Both nullable; failure of one must not block the other.

### 2. `src/routes/ai-tent-planner.tsx`

- Thread `perspectiveImage` through `result` state, into `RecommendationReport` props, the on-screen viewer block (render under the blueprint with caption "3D view"), and into the `saved_recommendations` insert payload (`perspective_image`).

### 3. `src/components/RecommendationViewer.tsx`

- Accept new optional `perspectiveImage` prop and render it directly under the existing blueprint image with a small "3D view" caption. Hide gracefully when null.

### 4. `src/lib/recommendation-pdf.ts`

- Accept `perspectiveImage` in `BuildArgs`. After the blueprint image block, if present, add the 3D render as a second image (same width treatment, caption "3D view"). Reuse existing `loadImageDataUrl` / pagination helpers so it flows onto a new page if it doesn't fit.

### 5. `src/routes/account.$id.tsx`

- Pass `data.perspective_image` into both `RecommendationViewer` instances alongside `blueprintImage`.

### 6. `src/lib/saved-recommendations.functions.ts`

- Add `perspective_image: z.string().nullable().optional()` to the schema and persist it in the insert payload.

### 7. Database migration

- `ALTER TABLE public.saved_recommendations ADD COLUMN perspective_image text;` (nullable, no GRANT changes needed — existing grants cover it).

## Technical notes

- Both AI image calls use the existing `google/gemini-3.1-flash-image-preview` model via `ai.gateway.lovable.dev` with the same auth + modalities shape already in use.
- No changes to recommender business logic (`recommend()` in `src/lib/recommender.ts`) — only to the rendered visuals.
- No UI/layout changes outside surfacing the second image.

## Out of scope

- Changing the AI recommendation model or the tent-sizing rules.
- Re-styling the existing blueprint viewer card beyond adding the second image slot.
