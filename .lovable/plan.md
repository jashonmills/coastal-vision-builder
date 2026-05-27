# Redesign Recommendation Layout (Stacked, Full-Width)

## Where the change happens

Two files render the proposal:

1. `src/components/RecommendationViewer.tsx` — the on-screen "PDF Viewer" modal (this is what the screenshot shows).
2. `src/lib/recommendation-pdf.ts` — the actual jsPDF download/print output.

Both currently split Event Details and Recommended Setup. The jsPDF version already stacks them but renders Event Details as 14 single-row entries (too tall). The on-screen viewer uses an explicit `lg:grid-cols-[0.9fr_1.1fr]` two-column section — this is what's making the left column end while the right column scrolls forever.

## Changes

### 1. `RecommendationReport` in `RecommendationViewer.tsx`

- Remove the two-column wrapper `<section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">`.
- Move the "Event Blueprint" intro/diagram + caption to render an "equipment summary" line below the caption (e.g. "1× Canopy · 10× Tables · 55× Chairs …" derived from `recommendation.picks`).
- New stacked order:
  1. Header / logo / brand
  2. Headline + summary
  3. Event Blueprint section (intro line + diagram + caption + equipment summary line)
  4. **Event Details** — full-width compact grid, 2 columns on print/desktop, 1 column on narrow mobile:
     - Use `grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2`
     - Each row: muted label left, bold value right, light divider beneath
     - Wrap section in `break-inside-avoid print:break-inside-avoid`
  5. **Recommended Setup** — full width, grouped by category. Each item is a compact row:
     - `grid grid-cols-[44px_1fr]` with circular quantity badge on the left, bold name + muted description on the right
     - Cream background (`bg-secondary/35`), rounded, subtle border, tight padding
     - `break-inside-avoid` on each category block and item
  6. Weather & Setup Notes (already full-width, keep, add `break-inside-avoid`)
  7. Disclaimer

### 2. `buildRecommendationPdf` in `recommendation-pdf.ts`

- Replace the current 14-row vertical Event Details list with a 2-column grid (7 rows × 2 cols), drawing label (muted) above value (bold navy) in each cell, with a thin divider below each row. Recompute `detailsBlockH` accordingly.
- Add an "equipment summary" line (one-liner derived from picks) right under the blueprint caption.
- Keep existing page-break helpers (`ensureSpace`, "keep heading with first item"). Confirm `break` reservations for: section heading + first item, category heading + first item, weather heading + first note.
- Reduce equipment row vertical padding slightly (smaller badge, tighter line-height) to match the screen card.

### 3. Page-break / print CSS

Add Tailwind print utilities (`print:break-inside-avoid`, `print:break-after-avoid`) on:
- Event Details grid container
- Each Recommended Setup category block
- Each equipment row
- Weather & Setup Notes block

No changes to data, server functions, i18n, or routing.

## Acceptance

- No side-by-side Event Details / Recommended Setup anywhere.
- Event Details renders as a compact 2-column grid (full width).
- Recommended Setup spans full width below Event Details, with compact rows.
- Downloaded PDF mirrors the on-screen layout and breaks cleanly across pages.
