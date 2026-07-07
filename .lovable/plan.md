## Goal

On mobile only, drop the 360° iframe/panorama viewer and show the four uploaded panoramic photos as plain images the way the phone gallery renders them. Desktop keeps the existing Panoee iframe embed exactly as it is today.

## Approach

1. **Upload the 4 panoramas as CDN assets** via `lovable-assets create` from `/mnt/user-uploads/1000032366-2.jpg`, `1000032368-2.jpg`, `1000032370-2.jpg`, `1000032372-2.jpg`, saving pointer JSON to `src/assets/tour/mobile-pano-1.jpg.asset.json` … `mobile-pano-4.jpg.asset.json`.

2. **Add mobile branch to `src/components/VirtualTour/VirtualTour.tsx`:**
   - Import `useIsMobile` (already exists at `src/hooks/use-mobile.tsx`).
   - When `isMobile === true`, render a simple vertical stack of `<img>` tags — one per panorama, each with an optional caption (Main Hall, North End, South End, Side Bar). No wrapper viewer, no iframe, no pan/zoom controls, no fixed aspect-ratio box that squishes them. Just:
     ```
     <img src={pano.url} alt={pano.label}
          className="w-full h-auto rounded-xl" loading="lazy" />
     ```
     so the browser renders each panorama at its natural aspect (very wide), letting the user pinch/scroll like any other photo in the gallery.
   - When `isMobile === false` (or `undefined` on SSR), render the existing iframe block unchanged.
   - Keep the `devicemotion` listener only on the desktop branch (it targets the iframe).
   - Guard against SSR hydration mismatch by returning the desktop markup until `useIsMobile()` resolves on the client — `useIsMobile` already uses `useEffect` so first client render matches SSR.

3. **No changes** to:
   - `FlatPanoramaViewer.tsx`, `scenes.ts` — left in place, still available if we ever want the desktop pan/zoom fallback.
   - `/virtual-tour` route metadata, hero, or copy.
   - Desktop tour experience on `/beacon-on-broadway` and `/virtual-tour`.

## Files

- Create: `src/assets/tour/mobile-pano-1.jpg.asset.json` … `mobile-pano-4.jpg.asset.json` (via `lovable-assets` CLI, no binaries in repo)
- Edit: `src/components/VirtualTour/VirtualTour.tsx`

## Result

On a phone, `/virtual-tour` and the Beacon page's tour section become a clean scrollable list of the four wide panoramic photos, viewable exactly like the native gallery — no cropped iframe, no broken mobile layout. Desktop is untouched.
