## Fix translations for About venues section, Beacon, and Catering pages

### Problem
- The "More Than Tents" (Venues & Catering) section on About was only added to `en.json` and `de.json`, so the other 8 locales fall back and display English.
- `src/routes/beacon-on-broadway.tsx` and `src/routes/catering.tsx` use hardcoded English strings and never call `useTranslation` — they don't translate at all.

### Plan

**1. About page venues section**
- Add the `about.venues.*` keys (eyebrow, title, body, ctaBeacon, ctaCatering) to the 8 missing locales: `vi, es, fr, hi, ko, ru, tl, zh`, with proper translations matching the existing tone.

**2. Beacon on Broadway page**
- Add a `beacon.*` namespace to all 10 locale files covering: hero (eyebrow, title, subtitle, CTAs), about/story section, specs/features list, gallery heading, pricing/inquiry section, FAQ, and CTA footer.
- Refactor `src/routes/beacon-on-broadway.tsx` to use `useTranslation()` and replace hardcoded strings with `t('beacon.*')` calls. Also localize the route `head()` title/description by adding static SEO-friendly fallbacks (head runs before i18n in some cases — keep English title for SEO but body content fully translated).

**3. Catering page**
- Same treatment: add a `catering.*` namespace to all 10 locale files covering hero, menu categories, pricing tiers, service add-ons, FAQ, and CTAs.
- Refactor `src/routes/catering.tsx` to use `useTranslation()` for all visible copy.

### Technical notes
- Menu item names and prices stay as-is (proper nouns / numbers); only descriptive copy and labels get translated.
- No changes to routing, data, or images — translation-only refactor.
- Will verify by switching to Vietnamese in the live preview and screenshotting `/about`, `/beacon-on-broadway`, and `/catering`.
