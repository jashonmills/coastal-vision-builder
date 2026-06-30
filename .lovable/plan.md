## Add a Beacon on Broadway CTA inside the AI Planner

Add a friendly, non-blocking "Have you considered our Beacon venue?" callout in the Event Basics step of the planner. It mentions the Beacon as an option, links to the Beacon page (where users can request a quote), but does NOT interrupt the tent planning flow.

### Where it goes

`src/routes/ai-tent-planner.tsx`, inside Step 0 (`recommender.stepTitles.eventBasics`), rendered right under the Event Type / Date / Location fields — so it appears the moment a user starts entering basics.

### What it looks like

A compact card styled to match the Beacon page (sand-soft background, forest/gold accents), with:
- A small Beacon hero thumbnail (reuse one of the existing `@/assets/beacon/*.jpg.asset.json` pointers).
- Eyebrow: "Indoor venue option · Seaside, OR"
- Title: "Hosting in Seaside? Consider Beacon on Broadway"
- One line: "Our 2,800 sq ft indoor hall fits up to 150 guests — climate controlled, chairs and tables included."
- Two actions:
  - Primary: "Explore the Beacon" → `<Link to="/beacon-on-broadway">` (Beacon page already has Request a Quote built in).
  - Secondary: "Keep planning my tent" → dismisses the card (local `useState`, session-only).
- Small helper line under the actions: "You can do both — we'll quote the venue and any tent or rentals together."

### Smart visibility (lightweight, no schema changes)

Show the card by default in Step 0. Auto-highlight (subtle gold ring + "Recommended for your event" badge) when the user's input suggests Beacon is a strong fit:
- `location` contains "seaside" (case-insensitive), OR
- `guestCount` ≤ 150 AND `outdoor === "Indoors"`, OR
- `exposure` is "Yes, very exposed" with `guestCount` ≤ 150 (bad-weather backup).

Otherwise, render as a normal informational card. Never block the Next button, never change recommender logic.

### Dismissal

`useState` flag `beaconDismissed` (in-memory only, resets on reload). No persistence needed — keeps the change purely presentational.

### Files touched

- `src/routes/ai-tent-planner.tsx` — add the `<BeaconCallout />` block inside Step 0 and the dismissal state.
- `src/components/BeaconCallout.tsx` — new small presentational component (keeps the planner file tidy).
- `src/i18n/locales/en.json` — add the few new strings under `recommender.beaconCta.*`. Other locales fall back to English until translated (existing pattern).

### Out of scope

- No changes to `recommend()` logic or quote/request data model.
- No new database fields. Beacon inquiries already flow through the existing Beacon page → `BeaconQuoteModal` → `request_type: "venue"` pipeline.
- No changes to other locales beyond English (can be translated later).
