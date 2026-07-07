# 360° Virtual Tour — Beacon on Broadway

## Library choice
Use **pannellum** loaded from its CDN (single JS + CSS file, ~50KB gz, no build config), wrapped in a small typed React component. Reasons:
- `react-pannellum` on npm is thinly maintained and pulls the same underlying lib; the CDN + thin wrapper avoids version drift and lets us keep TypeScript strict.
- Pannellum handles equirectangular panoramas, click-drag, pinch-zoom, fullscreen, and auto-load out of the box — exactly what's asked.
- No Three.js scene to maintain; SSR-safe because we mount only on the client.

If any uploaded image turns out to be a "partial panorama" rather than a full 360° equirectangular, pannellum still renders it in `equirectangular` mode with horizontal field-of-view configured per scene — we set `haov`/`vaov` per image so it doesn't stretch.

## Assets
Register the five uploaded panoramas as Lovable Assets (JSON pointers under `src/assets/tour/`) so they get CDN-served, not bundled:

| Scene tab | Source upload | Notes |
| --- | --- | --- |
| Main Hall (Center) | `1000032366.jpg` | primary wide interior |
| North End | `1000032368.jpg` | beamed ceiling, stair rail |
| South End | `1000032370.jpg` | window wall + bar cabinet |
| Side Bar | `1000032372.jpg` | white built-ins, bar counter |
| Skylight (bonus) | `1000032378.jpg` | shown as a 5th tab, optional — say the word to drop it |

Placeholder fallback paths (`/assets/hall-center.jpg` etc.) also honored — if a matching file exists in `public/assets/`, it overrides the uploaded asset, so you can drop in higher-res versions later without a code change.

## Files to add / edit

```text
src/components/VirtualTour/
  PannellumViewer.tsx     ← client-only wrapper, injects CDN <script>/<link> once
  VirtualTour.tsx         ← tabs + viewer container, handles active scene state
  scenes.ts               ← scene config array (id, label, image url, haov, initial yaw/pitch/hfov)
src/assets/tour/
  hall-center.jpg.asset.json
  hall-north.jpg.asset.json
  hall-south.jpg.asset.json
  hall-side-bar.jpg.asset.json
  (hall-skylight.jpg.asset.json)
src/routes/beacon-on-broadway.tsx   ← insert <VirtualTour /> section
src/routes/virtual-tour.tsx         ← standalone page with the same component + SEO head()
```

No new npm dependency — pannellum loads via CDN inside `PannellumViewer` with a small promise-based loader guarded by a module-level singleton so React StrictMode double-mounts don't double-load.

## Component behavior

- **Tabs**: horizontal pill row on desktop, horizontal scroll on mobile. Active tab is styled with the site's primary token; matches the existing PageHero look on that route.
- **Viewer**: 16:9 rounded card, `min-height: 480px` desktop / `320px` mobile, dark bg while loading, skeleton shimmer until pannellum's `load` event fires.
- **Auto-load**: `autoLoad: true` in pannellum config, no click-to-start.
- **Controls**: default pannellum HUD kept — zoom +/−, fullscreen. Compass and hotspot debug disabled.
- **No hotspots / walking arrows** per spec.
- **Scene switching**: re-instantiate the viewer on scene change (simplest, avoids `loadScene` race with autoload). Previous viewer destroyed in cleanup.
- **Accessibility**: tabs use `role="tablist"` + arrow-key nav; the viewer canvas gets an `aria-label` describing the current scene; a fallback `<noscript>` shows the still image.
- **SSR safety**: `PannellumViewer` renders `null` on the server and hydrates on the client (`useEffect` mount + `typeof window` guard).

## Where it appears
1. **Embedded** on `/beacon-on-broadway` as a new "Take a 360° tour" section between the hero and existing gallery.
2. **Standalone** route `/virtual-tour` for direct linking / sharing, with its own `head()` (title, description, og image = center scene).

## Out of scope (ask if wanted)
- Cross-scene hotspots ("click here to jump to bar")
- VR / stereoscopic mode
- Auto-rotate on idle
- Analytics events per scene view

## Technical notes
- Pannellum CDN pinned: `https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.{js,css}` (SRI hashes added).
- Types: a tiny local `pannellum.d.ts` declares `window.pannellum.viewer(...)` — no `@types/pannellum` package needed.
- No changes to auth, DB, or server functions.
