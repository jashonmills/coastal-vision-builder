## Fix: Center "Recommender" pill clips text in bento drawer

The center floating circle (w-20 / 80px) renders the uppercase label `RECOMMENDER` on a single line, which overflows the circle and gets clipped (e.g. "RECOMMENDE"). Same risk for `SCHEDULER`/other longer center labels.

### Changes (single file: `src/components/MobileBentoDrawer.tsx`)

1. Shorten the explore center label from `Recommender` → `Planner` (matches the bottom-nav "Planner" label already used for the same route `/ai-tent-planner`, so wording stays consistent).
2. Make the center button label robust so no future label clips:
   - Add horizontal padding inside the circle (`px-1.5`).
   - Allow the label to wrap onto 2 lines with tighter leading (`leading-[1.05]`, `break-words`, `max-w-[68px]`).
   - Drop the font size one notch on long labels (`text-[9px]` when label length > 7) so words like "Scheduler" still fit cleanly.

No other components, routes, or translations change. Bottom-dock and tile labels are untouched.
