## The Beacon on Broadway — one-pager

A new top-level route `/beacon-on-broadway` that tells the story of Pacific North Events & Tents' owned venue in Seaside, Oregon, using ~10 photos pulled from their existing Wix gallery and hosted on our CDN.

### Source content (scraped)

**Venue facts** (from `/faq` and `/contact`):
- The Beacon – Seaside, 735 Broadway, Seaside, Oregon 97138 (mailing: PO Box 23)
- 2,800 sq ft, capacity 150 guests
- Included: (10) 6-ft rounds, (10) 5-ft rounds, (2) 8-ft banquets, 150 black padded chairs
- Central heat + A/C, elevator, ADA-accessible, refrigerator, microwave, chafing pans (no commercial kitchen, no in-house alcohol service)
- Street parking on Broadway + rear lot off Avenue A, ADA parking
- Drape installation available as add-on

**Pricing** (from `/faq`):
- Oct–Feb: $500/day, $750/2-day, any day
- Mar–Sept Mon–Thu: $500/day
- Mar–Sept weekend: $1,500 (Fri–Sat or Sat–Sun)
- $500 non-refundable deposit, $1M event insurance required (~$150–300)

**Use cases** (from `/gallery`, `/weddings-events`):
weddings, receptions, social gatherings, meet-and-greets, corporate trainings/seminars, film & photo shoots

**Booking line:** 503-717-5088 (Pacific North Events & Tents)

### Page structure (`/beacon-on-broadway`)

1. **Hero** — full-bleed exterior shot, eyebrow "Our Venue · Seaside, OR", H1 "The Beacon on Broadway", subhead pitching it as PNE&T's flagship event space on the Oregon Coast, dual CTAs: "Request a Quote" (primary, opens `RequestQuoteModal` with venue preselected via prop) + "Contact" (secondary, → `/contact`).
2. **Story** — short narrative paragraph weaving together the venue's role, neighborhood (Broadway, Seaside), and that PNE&T owns and operates it.
3. **At-a-glance facts strip** — 4 stat cards: 2,800 sq ft · 150 guests · Tables & 150 chairs included · ADA accessible.
4. **Photo gallery** — responsive masonry/grid of the 10 best interior + setup shots; reuses existing `Lightbox.tsx`.
5. **What's included** — two-column list (Furniture, Amenities) pulled from FAQ.
6. **Perfect for** — icon row: Weddings · Receptions · Corporate · Classes & Seminars · Film/Photoshoots · Private Parties.
7. **Pricing** — three pricing cards (off-season day, off-season 2-day, in-season weekend) with the deposit + insurance note underneath. Disclaimer chip: "Booked through Pacific North Events & Tents".
8. **Location** — address block (735 Broadway, Seaside, OR 97138), parking notes, embedded Google Maps iframe.
9. **CTA footer** — "Ready to book The Beacon?" with Request Quote (primary) + tel:5037175088 (secondary).

### Image migration

Download these from Wix's CDN and re-host as Lovable CDN assets (`lovable-assets create` → `.asset.json` pointers in `src/assets/beacon/`). Curated picks from the scraped gallery:

```
831eb6_98ab89c961f94fefb60c470fc5fd1226  (hero / exterior at sunset)
831eb6_00bfd7b7c6bd4b8db8fdf86338a5289b  (reception setup wide)
831eb6_4202ff4452464783828822174fced424  (chairs detail)
831eb6_8c756f3f14cb4a8c8e6033806e42c8ce  (seaside sunset from 12th)
831eb6_3252b92941d2479f94d914c059ba423d  (gallery interior 1)
831eb6_d5cf2ca1f4de4320b2730fb3e74110f1  (gallery interior 2)
831eb6_38617d31a8044412a8264ff86b009c52  (gallery wide)
831eb6_2bafeac5f64b4263964a9d9159869c26
831eb6_f08c756518c94314a8863cb65ebca736
831eb6_a13a0b5b9e694792a530d77b87c5da3d
831eb6_cb4ce7926d2146708e2ba60e14b218a4
831eb6_f7867d0596f3408a9022ec72d070eadd
```

Each is fetched at `w_1600` from `static.wixstatic.com/media/<id>/v1/fill/w_1600,q_85/<id>` and uploaded via the `lovable-assets` CLI; the resulting pointer JSONs are imported in the new page.

### Files

- `src/routes/beacon-on-broadway.tsx` — new route, full `head()` SEO + OG meta with hero as og:image.
- `src/assets/beacon/*.jpg.asset.json` — ~12 CDN pointers (binaries uploaded, never committed).
- `src/components/SiteLayout.tsx` — add "The Beacon" entry to desktop nav.
- `src/components/MobileBentoDrawer.tsx` — add "The Beacon" to the drawer menu.
- `src/routes/sitemap[.]xml.ts` — append `/beacon-on-broadway`.
- `src/i18n/locales/en.json` — add `nav.beacon` label (other locales fall through to English; full translation in a follow-up).
- `src/components/RequestQuoteModal.tsx` — accept an optional `defaultVenue` prop so the hero CTA preselects "The Beacon".

### Technical notes (for review)

- All content is hand-rewritten from scraped material; no Wix boilerplate ("I'm a paragraph…") carried over.
- Reuses existing tokens, `SiteLayout`, `PageHero`, `CTASection`, and `Lightbox` to stay on-brand with the rest of the site.
- No new tables, no server functions — pure presentation page.
- Google Maps embed via `iframe` with `loading="lazy"`; no API key needed.
