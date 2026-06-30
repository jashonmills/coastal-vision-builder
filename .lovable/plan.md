# Fix: Beacon on Broadway images not loading

## Root cause

`src/routes/beacon-on-broadway.tsx` globs `@/assets/beacon/*.jpg`, but only `*.jpg.asset.json` pointer files exist there — the actual JPGs are on the Lovable CDN. The glob returns an empty object, so `photoUrls` is `[]` and nothing renders.

## Fix

Change the glob to load the pointer JSON files and pull each CDN `url` field.

```ts
const photoModules = import.meta.glob("@/assets/beacon/*.jpg.asset.json", {
  eager: true,
  import: "default",
}) as Record<string, { url: string }>;

const photoUrls: string[] = Object.entries(photoModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, mod]) => mod.url);
```

Everything downstream (`heroPhoto`, `galleryPhotos`, lightbox) keeps working unchanged.

## Verify

- Reload `/beacon-on-broadway`; hero + gallery thumbnails render.
- Open lightbox; navigation across all 18 photos works.
