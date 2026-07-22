## Plan

Add a labeled "Venue" section inside the Rentals dropdown containing Beacon on Broadway.

**Change in `src/components/SiteLayout.tsx`:**

1. Extend the `NavChild` type with an optional `heading?: string` marker (or use a discriminated union) so a child entry can render as a non-clickable section header instead of a link.
2. In the Rentals dropdown children, insert a heading entry `"Venue"` above the Beacon child so the dropdown reads:
   - Tent Rentals
   - Inventory & Pricing
   - AI Event Recommender
   - **Venue** (small uppercase section label, not clickable)
     - Beacon on Broadway
3. Update the dropdown render (lines ~130–144) to branch on heading entries: render a `<li>` with muted, uppercase, non-interactive text (e.g. `text-xs font-semibold uppercase tracking-wide text-muted-foreground px-3 pt-3 pb-1`) instead of a `<Link>`.
4. Add a `nav.venue` translation key (default "Venue") — use `t("nav.venue", { defaultValue: "Venue" })` inline so no locale file edits are required.

No other files affected. Mobile drawer and footer unchanged.