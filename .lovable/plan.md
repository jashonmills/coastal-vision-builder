## Catering page — Platters sub-section

Instead of shrinking it down, we're going to just move it to the bottom of the screen as- Not all the way to the bottom, but right before bartending services. Right before bartending services as a add-on item

In `src/routes/catering.tsx`, on both the **Silver** buffet card (around lines 273–292) and the **Gold** buffet card (around lines 371–390):

1. **Shrink the Hors d'Oeuvres list** by removing `"Seasonal fruit tray"` from the bulleted items — it stays a per-piece $5/pp add-on list only.
2. **Append a Platters block** inside the same card, directly below the Hors d'Oeuvres list, so it reads as a related sub-section (smaller heading, thin divider above):
  - Heading: **Platters** (uses same `ChefHat` treatment, smaller `text-base` heading so hors d'oeuvres remains the primary block)
  - Note line: **$175 per platter · feeds up to 50 guests**
  - Bulleted items:
    - Seasonal fruit tray
   Structure sketch:
3. **i18n:** add three new keys under `catering.common` in every locale file (`en`, `es`, plus any other locales in `src/i18n/locales/`) — `platters`, `plattersNote`, `plattersFruitTray` — and reference them via `t(...)` instead of hardcoded strings. Mirror the existing hors d'oeuvres key pattern.
4. No changes to the top "fine print" pricing pills — fruit tray pricing is contained inside the new Platters block itself, matching the style used for hors d'oeuvres.

No pricing math, buffet inclusions, or other menu items change.