## Goal

Show each panorama exactly like it looks in the phone's gallery — no spherical warp, no cylindrical warp, no curved black bars. Just the raw image, cropped to a fixed frame, that the user drags left/right (and up/down when zoomed in) to explore.

## Approach

Delete the Three.js implementation entirely and replace it with a plain 2D image viewer. Because the image is rendered as pixels on a flat plane, straight lines stay straight by definition — nothing to distort.

### How the viewer works

- Fixed-aspect frame (16:9) with `overflow: hidden`.
- The panorama is rendered as a single `<img>` (or a canvas draw) positioned absolutely inside the frame.
- On load, the image is scaled so its **height fills the frame** and the natural width overflows horizontally — that gives a flat, floor-to-ceiling crop with the extra width available for horizontal panning. No black bars.
- State: `scale` (1 = fit-height baseline, up to ~3) and `offsetX` / `offsetY` translation. On pointer drag we update offsets. On wheel / pinch we update scale around the pointer position.
- Offsets are clamped to the image edges so the user can never drag past the panorama into empty space (no black gutters left/right, no black bars top/bottom).
- Vertical drag is only active when the current scaled image is taller than the frame (i.e. zoomed in). At baseline zoom the image is exactly frame-height, so vertical dragging is a no-op — the panorama is effectively horizontal-only, matching the user's mental model.

### Controls

- Drag with mouse or finger to pan.
- Mouse wheel or pinch to zoom (clamped, e.g. 1x – 3x).
- Fullscreen button (kept from current viewer).
- Small "Reset view" button that returns to fit-height, offset = 0.
- Bottom badge updated to "Drag to pan • Scroll to zoom".

### Scene config

Simplify `src/components/VirtualTour/scenes.ts` — no more `haov` or `tilt`; those were projection parameters. Each scene just needs `id`, `label`, `description`, `image`. Backward-compatible: leave the fields typed as optional so nothing else in the codebase breaks if it references them.

### File changes

- Delete `src/components/VirtualTour/CylindricalViewer.tsx`.
- Add `src/components/VirtualTour/FlatPanoramaViewer.tsx` — the new viewer described above. Pure React + DOM, no Three.js.
- Update `src/components/VirtualTour/VirtualTour.tsx` to import `FlatPanoramaViewer` and pass `scene.image` + `scene.label`.
- Update `src/components/VirtualTour/scenes.ts` to drop `haov` / `tilt` from the type (keep the five scenes as-is).
- Remove the `three` and `@types/three` dependencies from `package.json` since nothing else uses them (verify with a quick codebase search during implementation; if anything else imports `three`, leave the packages installed).

### Technical details

- Pointer handling uses `pointerdown` / `pointermove` / `pointerup` with `setPointerCapture` — one code path for mouse, touch, and pen; no separate touch handlers.
- Zoom-around-cursor math: after changing scale, adjust `offsetX/Y` so the pixel under the cursor stays under the cursor. Standard formula: `offset = cursor - (cursor - offset) * (newScale / oldScale)`.
- Clamping runs after every drag/zoom step. Given frame size `(W, H)`, scaled image size `(iW*s, iH*s)`, valid offset range is `[W - iW*s, 0]` × `[H - iH*s, 0]` (or centered when the scaled image is smaller than the frame in that axis, which only happens for the vertical axis at baseline zoom).
- ResizeObserver on the frame recomputes the baseline scale when the container resizes (initial mount, window resize, fullscreen enter/exit).
- Image loaded via a plain `<img loading="eager" decoding="async">`; while it loads we show the existing "Loading view" spinner. On error we show the existing error state.

### Out of scope

- Auto-rotate / auto-pan.
- Sharing zoom/pan state via URL.
- Hotspots (none of the current scenes use them).

## Where it appears

Same two spots as today: the `<VirtualTour />` section on `/beacon-on-broadway` and the standalone `/virtual-tour` route. No route or copy changes.
