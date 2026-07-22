Update the catering page buffet section to match the Silver/Gold format: remove the "Menu 1 · / Menu 2 · / Menu 3 ·" prefixes from the three buffet card titles and strip the menu names from the section pricing badge so only the two price tiers remain.

Changes:
1. `src/routes/catering.tsx`
   - Change buffet card titles:
     - "Menu 1 · Taco Bar" → "Taco Bar"
     - "Menu 2 · Tailgater" → "Tailgater"
     - "Menu 3 · Pasta Bar" → "Pasta Bar"

2. `src/i18n/locales/en.json`
   - Update `catering.buffet.pricing` from:
     ```
     Taco Bar & Tailgater — 50–99 guests: $40/pp | 100+ guests: $35/pp
     Pasta Bar — 50–99 guests: $30/pp | 100+ guests: $25/pp
     ```
     to:
     ```
     50–99 guests: $40/pp | 100+ guests: $35/pp
     50–99 guests: $30/pp | 100+ guests: $25/pp
     ```

This keeps the two existing price tiers while making the buffet section layout consistent with the Silver and Gold buffet sections.