## Goal

Replace the lightweight inventory we shipped last turn with a real rental-operations foundation. This round delivers schema + seed data + admin UI. Quotes, rental_events, customers, and check-in/check-out workflows are scaffolded conceptually but their UIs are deferred to a follow-up round (per your scope answer).

## Scope this round

In:
- Rename existing `public.inventory_items` → `public.pricing_items` (no data loss)
- Drop the placeholder `inventory_master_items` and `inventory_reservations` from last turn (replaced by the proper schema)
- New `public.inventory_categories` (12 seeded)
- New `public.inventory_items` master table (full spec, 14 seeded)
- Expand `public.inventory_transactions` with `from_status`, `to_status`, plus the full transaction-type enum
- Add `customer_id` + `pdf_url` columns to `saved_recommendations`
- Admin UI: `/admin/inventory` dashboard, `/admin/inventory/$id` item detail, reusable Adjust Quantity modal
- Update existing references (`/inventory` page, `/admin` pricing tab, recommender) to the renamed `pricing_items` table

Out (deferred):
- `rental_events`, `rental_event_items`, `quotes`, `quote_items`, `customers` tables
- Check-out / check-in routes
- Reservation lifecycle (the master table tracks `reserved_quantity` manually for now; reservation-creation workflow ships when `rental_events` does)
- Planner availability awareness, chat live inventory lookups (the chat keeps its preloaded knowledge base)
- Status snapshots cron, reports, mobile-optimized admin

## Database changes (single migration)

```text
1. RENAME TABLE  public.inventory_items → public.pricing_items
                 (RLS policies + GRANTs travel with the table)

2. DROP TABLE   public.inventory_reservations
   DROP TABLE   public.inventory_master_items  (CASCADE drops the FK from inventory_transactions)

3. CREATE TABLE public.inventory_categories
   (name, slug UNIQUE, description, sort_order, active)
   + admin-only RLS + service_role grant + public SELECT
   (public SELECT so planner/chat can read category list later)

4. CREATE TABLE public.inventory_items  (the new master)
   Columns from your spec:
     name, slug UNIQUE, sku, category_id FK, item_type,
     description, short_description, unit_label, default_quantity_unit,
     total_owned_quantity, available_quantity, reserved_quantity,
     checked_out_quantity, cleaning_quantity, maintenance_quantity,
     damaged_missing_quantity,
     replacement_cost_cents, default_rental_price_cents,
     cleaning_fee_cents, beach_cleaning_fee_cents,
     setup_required, requires_cleaning, requires_anchoring,
     beach_compatible, wind_sensitive,
     active, visible_to_planner, visible_to_chat,
     admin_notes, deleted_at
   CHECK constraints: every *_quantity ≥ 0, item_type IN (...)
   Indexes: category_id, item_type, active, slug
   RLS: admins full CRUD; anon+authenticated SELECT only rows where
        visible_to_chat=true OR visible_to_planner=true AND deleted_at IS NULL

5. RECREATE  public.inventory_transactions  with full spec:
     inventory_item_id FK → inventory_items
     transaction_type (full enum: add_stock, remove_stock, adjust_count,
       reserve, release_reservation, check_out, check_in,
       move_to_cleaning, mark_cleaned_available, move_to_maintenance,
       return_from_maintenance, mark_damaged, mark_missing,
       recover_missing, retire_item, admin_correction)
     quantity, from_status, to_status,
     related_event_id, related_quote_id, related_recommendation_id, related_order_id,
     notes, created_by
   Admin-only RLS.

6. ALTER TABLE  public.saved_recommendations
   ADD COLUMN customer_id UUID, ADD COLUMN pdf_url TEXT

7. SEED categories (12) + items (14) with the spec'd defaults
   (all quantities = 0, active=true, planner/chat flags as spec'd,
    beach_compatible/requires_cleaning/etc. set per your item-by-item list).
```

`Available = total_owned - reserved - checked_out - cleaning - maintenance - damaged_missing` is enforced in application code (in the adjust-quantity transaction handler) — not as a generated column, since admin overrides may temporarily violate it.

## Application changes

### Rename fallout (existing pricing list)
- `src/routes/inventory.tsx` — `.from("inventory_items")` → `.from("pricing_items")`
- `src/routes/admin.tsx` — inventory tab (admin pricing editor) → `pricing_items`
- `src/lib/recommender.functions.ts` — query → `pricing_items`
- Update labels in the admin pricing tab from "Inventory" → "Pricing"

### New admin UI

**`src/routes/admin.inventory.tsx`** — rewrite the page we shipped last turn:
- Summary cards: Total items, Owned units, Available, Reserved, Checked out, Cleaning, Maintenance, Damaged/Missing, Low-availability count
- Filter bar: category, item type, active/inactive, planner-visible, chat-visible, text search
- Table columns: Item, Category, Type, Owned, Available, Reserved, Out, Cleaning, Maint, Damaged, Active, Actions (View / Edit / Adjust / Add stock / Archive)
- Bulk "Add item" modal (full field set)
- Row-level "Adjust quantity" opens the shared modal

**`src/routes/admin.inventory.$id.tsx`** — new item detail page:
- Header: item name, type, category, active toggle, archive
- Quantity breakdown card (7 buckets + computed Available)
- Pricing/fees panel (replacement cost, rental price, cleaning fee, beach cleaning fee)
- Rules panel (requires_cleaning, requires_anchoring, beach_compatible, wind_sensitive, setup_required)
- Visibility panel (visible_to_planner, visible_to_chat)
- Admin notes (textarea)
- Transaction history table (last 50 transactions)
- Buttons: Edit / Adjust Quantity / Add Stock / Move to Cleaning / Move to Maintenance / Mark Damaged / Mark Missing / Archive
- Upcoming reservations panel renders an empty state with "Reservations ship with the rental_events module."

**`src/components/admin/AdjustQuantityModal.tsx`** — reusable, used from both routes:
- Inputs: adjustment_type, quantity (>0), from_status, to_status, notes
- Adjustment types: add_stock, remove_stock, adjust_count, move_status, mark_damaged, mark_missing, mark_cleaned_available, move_to_maintenance, return_from_maintenance, admin_correction
- Client-side validation:
  - Quantity must be positive integer
  - Moving from a status requires that status to have ≥ quantity
  - "Available" is computed, not directly editable except via add_stock / remove_stock / adjust_count
- On submit: single RPC-free flow — update `inventory_items` quantity columns + insert `inventory_transactions` row in one supabase transaction-pattern (two awaited calls; admin gets toast on failure). Stretch: wrap in a Postgres function `apply_inventory_adjustment` to make it atomic. Decision: ship as two ordered calls now, function follows in the rental_events round.

### Admin warnings panel
Surfaced at the top of `/admin/inventory`:
- "X items have owned=0 and are visible to planner/chat" (your spec'd warning)
- "X items have a negative available quantity" (data integrity)

### Saved recommendations
- New columns added but no UI changes this round. Quote-request modal continues to work.

## Security

- `inventory_items` SELECT: public for rows where `(visible_to_planner OR visible_to_chat) AND deleted_at IS NULL AND active`. INSERT/UPDATE/DELETE: admin only.
- `inventory_categories` SELECT: public. Writes: admin only.
- `inventory_transactions`: admin only for all operations.
- `pricing_items`: keeps its existing RLS (public SELECT, admin writes).
- `saved_recommendations`: unchanged.

All new tables get explicit GRANTs (authenticated + service_role; anon SELECT only on the two public-readable tables).

## Files

Migration:
- `supabase/migrations/<ts>_rental_ops_foundation.sql` — all 7 steps above

New code:
- `src/routes/admin.inventory.$id.tsx`
- `src/components/admin/AdjustQuantityModal.tsx`
- `src/components/admin/InventorySummaryCards.tsx`
- `src/lib/inventory.ts` — shared types + `computeAvailable()` + `validateAdjustment()`

Rewritten:
- `src/routes/admin.inventory.tsx` (full rebuild against the new schema)

Touched (rename fallout):
- `src/routes/inventory.tsx`
- `src/routes/admin.tsx`
- `src/lib/recommender.functions.ts`

## Acceptance for this round

- [ ] Existing `/inventory` pricing page still renders identically (now reading from `pricing_items`)
- [ ] `/admin` "Inventory" tab now labeled "Pricing", still works
- [ ] `/admin/inventory` dashboard shows 14 seeded items across 12 categories with zero quantities and correct flags
- [ ] Filters (category, type, active, planner-visible, chat-visible, search) all work
- [ ] Clicking an item opens `/admin/inventory/$id` with full detail
- [ ] Adjust-quantity modal validates from/to status and quantity, writes a transaction row, updates buckets
- [ ] Item history table shows the transaction immediately
- [ ] Warnings panel flags planner-visible items with owned=0
- [ ] `saved_recommendations` has new `customer_id` and `pdf_url` columns
- [ ] All non-admin users get blocked from admin routes and from writes via RLS

## Follow-up rounds

1. `rental_events` + `rental_event_items` + check-out/check-in routes (consumes the transaction types we're already defining)
2. `customers` + `quotes` + `quote_items`, and wire the quote-request flow to create real quote rows
3. Planner/chat live inventory awareness (`visible_to_planner`/`visible_to_chat` flags already exist for this)
4. Reports + status snapshots + mobile admin polish
