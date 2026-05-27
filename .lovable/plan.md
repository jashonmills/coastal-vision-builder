## Goal
Make the recommender result page match the reference: an input recap, a friendly review message, the recommended rental list (already exists), and a blueprint sketch in the same black-on-white top-down line-art style as the uploaded examples.

## Changes

### 1. `src/lib/recommender.functions.ts` — blueprint prompt + model
Rewrite the image prompt to lock in the reference style and pass concrete sizing/quantity context so the sketch reflects the actual recommendation, not a generic floor plan.

- Compute `blueprintContext` server-side from the picks: tent size (from the chosen Canopy item name, e.g. "20×40 Frame Tent"), table count + style (round vs banquet), chair count, dance-floor sections, plus presence of bar/DJ/stage.
- Replace the navy/white prompt with a precise sketch brief, e.g.:
  > "Top-down floor plan sketch, **black line art on plain white background**, hand-drafted blueprint style like an event-rental layout diagram. Render a single tent rectangle with rounded corners labeled with its dimensions. Inside: draw {N} {round|banquet} tables as simple top-down icons with chair rectangles around each, a {WxH} dance floor as a cross-hatched grid, and label the bar/DJ/stage if present. Add a short caption underneath in plain sans-serif: '{tent size} · {N} {table type} · {chair count} chairs[ · dance floor]'. No color, no shading, no people, no perspective — strictly schematic and clean."
- Upgrade image model from `google/gemini-2.5-flash-image` to `google/gemini-3.1-flash-image-preview` for sharper line work (still fast/cheap).
- Extend the tool-calling schema with two new fields the model already has context to produce:
  - `tent_size` (string, e.g. "20×40 Frame Tent")
  - `layout_caption` (string, the one-line caption to render under the sketch)
  Use these to drive the image prompt deterministically instead of relying only on `blueprint_prompt`.

### 2. `src/routes/recommender.tsx` — result layout

Insert two new blocks above the existing blueprint + recommended-setup cards:

**a. "We reviewed your event" intro card**  
Replaces the standalone headline card. Same gold sparkle, but copy reframed as a personal review note:
> "Thanks {firstName} — our team's AI reviewed your {eventType} for {guestCount} guests on {eventDate} at {location}. Here's what we'd recommend."
Followed by `recommendation.summary`.

**b. "Your event at a glance" recap**  
A compact 2-column grid of the user's answers (Event type, Date, Location, Guest count, Setup, Seating, Tables, Food, Dancing, Surface, Exposure, Sidewalls, After sunset, Extras chips, Rentals chips). Read-only chips/labels — gives the user confidence the AI used their inputs.

Update the blueprint card chrome to match the new sketch style:
- White background (not navy), thin border, small caption strip below showing `recommendation.layout_caption`.
- Header label stays: "Suggested Layout".

No changes to the form steps, mutation flow, or contact handoff.

## Out of scope
- Inventory page, navigation, other routes.
- Generating multiple alternative blueprints (single sketch only).
- Replacing AI image generation with SVG (keeps Gemini image model).
