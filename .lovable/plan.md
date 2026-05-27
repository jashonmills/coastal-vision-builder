# Plan

Two independent additions. No backend changes, no business-logic changes.

## 1. Accessibility Font Chooser (floating button + panel)

**New files**
- `src/components/AccessibilityFontButton.tsx` — floating button + popover panel, all logic colocated.
- `src/hooks/useAccessibilityFont.ts` — reads/writes `localStorage["pacificNorthPreferredFont"]`, sets `--accessibility-font` CSS var on `document.documentElement`, applies on mount before paint.

**Edits**
- `src/styles.css` — `@import` Google Fonts (Atkinson Hyperlegible, Lexend, Inter) and `@font-face` for OpenDyslexic from a CDN (gutenberg/jsDelivr). Add `body { font-family: var(--accessibility-font, <current site font stack>); }` so the variable cascades, leaving headings/brand marks untouched where they set their own font.
- `src/components/SiteLayout.tsx` — mount `<AccessibilityFontButton />` once so it appears on every page.

**Behavior**
- Bottom-left fixed, 24px inset, z-index above nav. Deep navy bg, cream icon (lucide `Accessibility`), seafoam focus ring.
- Click toggles a Radix Popover panel anchored above the button (shadcn `Popover` already in project).
- Panel: title "Text Accessibility", description, RadioGroup with 5 options (Default, OpenDyslexic, Atkinson Hyperlegible, Lexend, Verdana — Inter omitted per "Recommended active options"). Each option preview-rendered in its own font. Selection applies immediately and persists. "Reset to Default" button. Close X. Escape closes, focus returns to button. `aria-expanded`, `aria-controls`, proper RadioGroup semantics.
- If OpenDyslexic `@font-face` fails to load (detect via `document.fonts.check`), disable that option with "Available soon" note.
- Selected font drives `--accessibility-font`; body and descendants that don't explicitly set `font-family` (forms, modals, AI Tent Planner, popup, quote forms, translated content) inherit it. Logo/brand display fonts are untouched.
- Mobile: panel `max-width: calc(100vw - 32px)`.

## 2. AI Tent Planner Popup — Top Illustration

**Edit only**
- `src/components/AITentPlannerPopup.tsx` — insert a new illustration block between the "NEW FREE TOOL" badge and the headline. All existing text/CTAs/structure preserved.

**Illustration approach**
- Inline SVG component (no asset generation needed) composed of three layered groups within one horizontal band:
  - Left: faded watercolor-wash tree silhouette (low-opacity sage/seafoam path).
  - Center: line-art high-peak sailcloth tent with 3 peaks, tiny pennant flags, thin navy strokes, faint guy lines.
  - Right: small blueprint inset — bordered square, 4 round tables as circles with chair tick marks, dimension lines with arrowheads, small "20'×20'" label.
  - Background: very faint blueprint grid (CSS background or SVG `<pattern>`), pale gold/sand accent rule.
- Colors pulled from existing tokens (navy, cream, seafoam, sand, gold) — kept low-contrast so headline remains dominant.
- Sizing: ~full popup width, ~140px tall on desktop, ~110px on mobile, with breathing room above headline. Does not push CTA off-screen.
- `aria-hidden="true"` (decorative).

## Out of scope
- No text-to-speech, no audio, no AI changes.
- No i18n key changes (panel labels are UI chrome; can be added to en.json + other locales if desired — will include English-only by default unless you want translations too).
- No changes to planner logic or quote flow.

## Open question
Add the panel strings ("Text Accessibility", option labels, "Reset to Default") to all 10 locale files, or English-only for now?
