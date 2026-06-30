## Add a Catering page and link it from the Services dropdown

### New route: `/catering`

Create `src/routes/catering.tsx` — a single full-length page that recreates the brochure. Uses `SiteLayout` + `PageHero` + `CTASection` like the Beacon page for consistency.

Sections, top to bottom:

1. **Hero** — "Pacific North Catering — Taking your catered event above expectations." Phone, address (1475 N. Roosevelt, Seaside, OR 97138), email.
2. **Buffet Menu ($25/$30 pp)** — three menu cards side-by-side:
   - Menu 1 Taco Bar (main / sides / fixings)
   - Menu 2 Tailgater (main / sides / salad)
   - Menu 3 Pasta Bar (choose two mains / sides / choose one salad)
3. **Silver Buffet ($30/$35 pp)** — salad, entrée (7 options), starch + vegetable sides, hors d'oeuvres upgrade list (+$5 pp each).
4. **Gold Buffet ($40/$45 pp)** — salad, entrée (9 options), starch + vegetable sides, chef-attended station (6 options), hors d'oeuvres upgrade list.
5. **Bartending Services** — copy verbatim from brochure; note bundled with food catering only.
6. **Pricing footnote** — 2-hour service, 100-person base, +$5 pp for 50–99, excludes staff/linens/delivery/service charge, prices subject to change.
7. **Cross-promo cards** — Rentals (link to `/services`) and Beacon on Broadway (link to `/beacon-on-broadway`), mirroring the brochure's back-cover layout.
8. **CTA** — phone + email button row pointing at `tel:5037175088` and `mailto:info@pacificnorthcatering.com`.

`head()` sets a Catering-specific title, description, og:title, og:description.

### Header dropdown

In `src/components/SiteLayout.tsx` (line 40–47), add a fourth child to the Services dropdown:

```ts
{ to: "/catering", labelKey: "nav.catering", descKey: "navDesc.catering" },
```

Add the two new i18n keys (`nav.catering`, `navDesc.catering`) to `src/i18n/locales/en.json` so the dropdown label/description render.

### Out of scope

- No changes to mobile bento drawer, footer, or other pages.
- No new images uploaded — the page uses typography + existing gallery photos (`pickPhotos`) for atmosphere; the brochure's embedded food shots aren't imported as project assets.
- No booking/quote flow wiring for catering — CTAs are tel/mailto only. Can add a CateringQuoteModal later if you want lead capture.
