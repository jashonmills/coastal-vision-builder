## Problem
Totals on the quote editor are wrong:
- Delivery items (e.g. "Cannon Beach $150") are bucketed into Subtotal instead of the **Delivery** row.
- Cleaning fees aren't applied automatically — the admin has to remember to add them per item.
- Tax stays $0 even when the Beacon venue is on the quote (Seaside charges lodging tax on venue rentals).

## Fix

### 1. Reclassify totals at compute time (no schema change to items)
Update `recomputeQuoteTotals()` in `src/lib/quotes.functions.ts` to sort lines into buckets by category instead of dumping everything into `subtotal_cents`:
- `Delivery` category → sum into `delivery_fee_cents`
- Categories matching `*Cleaning Fee*` or item name containing "Cleaning Fee" → sum into `cleaning_fee_cents`
- Everything else → `subtotal_cents`

`total = subtotal + delivery + cleaning + tax − discount` stays the same, so the Total figure won't double-count.

The Totals sidebar Delivery / Cleaning inputs become **read-only displays** when auto-derived from line items, with a small "Auto from line items" hint. Discount and Tax remain editable. (Manual override stays available via the line item, which is the source of truth.)

### 2. Auto-cleaning by default (toggle per quote)
- Migration: add `cleaning_auto boolean not null default true` to `quotes`.
- In `recomputeQuoteTotals`, when `cleaning_auto=true` AND any canopy/chair/table line exists, ensure matching `Cleaning Fee - Beach` line items are present (insert/update; quantity mirrors the parent line's qty for chairs/tables; size-matched for canopies — 10x10 → "10x10" cleaning fee, etc.). Remove auto-cleaning lines when toggled off or when the parent is deleted; mark them with `reason = "Auto: coastal cleaning"` and a flag column `is_auto boolean default false` on `quote_items` so we know which rows to manage.
- Add a "Coastal cleaning fee (auto)" checkbox in the Totals sidebar that flips `cleaning_auto`.

### 3. Oregon / Seaside lodging tax for Beacon
- Migration: add `lodging_tax_rate_bps integer not null default 1000` (10.00%) on a new singleton `site_settings` row (or reuse `site_content` key `lodging_tax_rate_bps`). Configurable from Pricing & Content later.
- In `recomputeQuoteTotals`, when any line has `category = 'Venue'` and the venue is Beacon (item name starts with "Beacon"), set `tax_cents = round(sum(beacon_venue_line_totals) * rate)`. Otherwise `tax_cents = 0` (Oregon has no general sales tax).
- Tax row in the Totals sidebar shows the rate inline: `Tax (Seaside lodging 10%)` and becomes read-only when auto-derived; falls back to editable when no Beacon line is present.

### 4. UX polish
- Tooltip on Delivery/Cleaning/Tax rows explaining the auto rule.
- After Add Line / Save Line / Delete Line, `recomputeQuoteTotals` already runs — totals refresh without extra clicks.

## Files touched
- `supabase/migrations/<new>.sql` — `quotes.cleaning_auto`, `quote_items.is_auto`, `site_content` row for lodging tax rate.
- `src/lib/quotes.functions.ts` — rewrite `recomputeQuoteTotals` with bucketing + auto-cleaning sync + Beacon tax; call it after item insert/update/delete (already wired).
- `src/routes/admin.quotes_.$id.edit.tsx` — Totals sidebar: read-only Delivery/Cleaning/Tax when auto, "Coastal cleaning fee" toggle, rate label on Tax row.

## Out of scope (ask before adding)
- Tax rate UI in Pricing & Content (will default to 10% silently for now).
- Inland-event detection (we'll keep the toggle as the single source of truth instead of guessing from address).