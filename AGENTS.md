# Project Notes

## Imagery

- Every photo shown on a public page resolves to a Lovable Cloud storage bucket or a CDN asset pointer under `src/assets` (`.asset.json`). Never reference external image URLs or leave binary copies in `public/`.
- On `/beacon-on-broadway` the hero photo is an explicit CDN import, deliberately kept out of the `src/assets/beacon/*` glob that builds the on-page gallery — changing the hero must not reorder or add gallery photos. Feature sections with their own photos (e.g. the Bridal Suite under `src/assets/bridal/*`) stay outside that glob too, so they never leak into the "Inside the hall" gallery.
