# Fix panorama distortion — swap to a cylindrical Three.js viewer

## Root cause
Pannellum only supports `equirectangular`, `cubemap`, and `multires` — there is **no cylindrical projection type**. Feeding a phone panorama (uniform-height cylindrical strip) into an equirectangular sphere is what curves the floor and ceiling beams. `haov`/`vaov` shrink the sphere slice used, but the projection stays spherical, so straight lines still bow. We need a real cylindrical projection.

Photo Sphere Viewer also lacks a still-image cylindrical adapter. The cleanest fix is a small **custom Three.js cylindrical viewer** — mapping the panorama to the inside of an open cylinder gives uniform vertical scale (straight horizontals stay straight), matches how phone panoramas were captured, and stays ~100 lines.

## Fix

### 1. Replace `PannellumViewer.tsx` with `CylindricalViewer.tsx` (Three.js)
- Add deps: `three`, `@types/three`.
- Load the panorama texture (`THREE.TextureLoader`, `colorSpace = SRGBColorSpace`).
- Build an **open-ended cylinder** (`CylinderGeometry(radius=5, radius=5, height, radialSegments=128, 1, openEnded=true)`), rotate normals inward (`scale.x = -1`), texture on `MeshBasicMaterial`.
- Set cylinder height from the image aspect: `height = 2π·radius · (imgH/imgW) · (haov/360)` so the image maps 1:1 without vertical stretch. Horizontal wrap length matches `haov` (e.g. 220°) via `Math.PI * 2 * (haov/360)` — segment the cylinder to that arc, not full circle.
- `PerspectiveCamera` at the cylinder center, `fov ≈ 75` initial.
- Drag-to-look with pointer events → adjust camera yaw (rotation.y) and pitch (rotation.x), pitch clamped to ~±25° so the viewer can't tilt into blank cylinder caps.
- Yaw clamped to the horizontal arc actually covered by the image (`± haov/2` around center) so the user can't spin past the edge into black.
- Wheel + pinch zoom → adjust `camera.fov` between 40°–90° (`updateProjectionMatrix()`).
- Fullscreen button overlay (top-right) using the Fullscreen API.
- ResizeObserver to keep the renderer sized to the container.
- Cleanup: dispose geometry, material, texture, renderer, remove listeners.

### 2. Update `scenes.ts`
Drop `vaov`/`yaw`/`pitch`/`hfov` fields, replace with:
- `haov` (kept, per-scene horizontal coverage — 220° for the wide panos, 200° for the side bar, 180° for the skylight looking up).
- Optional `tilt` in degrees (default 0; skylight uses +40 to angle up naturally).

### 3. `VirtualTour.tsx` stays the same
Only the viewer prop shape changes. Tabs, keyboard nav, description caption, aspect ratio card all keep working.

### 4. Remove pannellum bits
- Delete `pannellum.d.ts`.
- No more CDN script/CSS injection.

## Files touched
- `package.json` — add `three`, `@types/three`.
- `src/components/VirtualTour/CylindricalViewer.tsx` — new.
- `src/components/VirtualTour/PannellumViewer.tsx` — delete.
- `src/components/VirtualTour/pannellum.d.ts` — delete.
- `src/components/VirtualTour/scenes.ts` — trim fields.
- `src/components/VirtualTour/VirtualTour.tsx` — swap import + prop shape.

## What the user will see
Floor lines run straight left-to-right, wood beams stay level, the wide view still curves visually (that's the pano itself) but the viewer no longer adds fish-eye. Drag pans horizontally at natural speed; small vertical drag reveals a bit of ceiling/floor without dumping the user into empty space.

## Out of scope (ask if wanted)
- Auto-rotate on idle.
- Nadir/zenith caps (a subtle floor logo texture) — cylinder is open-ended by design.
- VR mode.
