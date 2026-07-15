## Plan

Update the Beacon on Broadway page copy so it no longer mentions linens, matching the request to take linens off under Beacon.

### Changes

1. **Beacon story paragraph**
   - Current: "…same team that handles our tents, tables, linens, and coordination across the Oregon Coast."
   - Update to: "…same team that handles our tents, tables, and coordination across the Oregon Coast."

2. **Beacon included section body**
   - Current: "Need linens, lighting, or a bar package? We'll add it from our in-house inventory."
   - Update to: "Need lighting or a bar package? We'll add it from our in-house inventory."

3. **Locales**
   - Apply the same two edits to every supported locale file under `src/i18n/locales/`: `en.json`, `zh.json`, `fr.json`, `tl.json`, `ru.json`, `ko.json`, `hi.json`, `de.json`, `es.json`, `vi.json`.
   - Keep the translations natural in each language (remove only the linens reference and adjust surrounding punctuation/grammar as needed).

### Verification

- Run the build/typecheck to confirm no JSON syntax errors.
- Spot-check the Beacon page preview to confirm both sentences no longer mention linens.