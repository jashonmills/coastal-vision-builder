
# Full Rental Operating System — Closing the Loop

Goal: turn the existing admin islands into one connected workflow:
**Quote sent/booked → inventory reserved → calendar events auto-created → job sheet for warehouse → check-out → check-in → damage/return reconciled.** Staff management included. Payments deferred.

## Phase 1 — Quote → Reservation + Scheduler (the core wire-up)

**Database (migration):**
- Add `staff` table: name, email, phone, role, active, color, notes.
- Add `quote_returns` table: quote_id, item_id, returned_qty, damaged_qty, missing_qty, condition_notes, returned_by, returned_at — for post-event reconciliation.
- Add helpful indexes on `inventory_transactions(related_quote_id)`, `rental_calendar_events(quote_id, start_time)`.
- GRANTs + RLS for both tables (admin-only).

**Server functions (`src/lib/quotes.functions.ts`, `scheduler.functions.ts`):**
- New `reserveQuoteInventory(quoteId)`: for each `quote_items` row with an `inventory_item_id`, increment `inventory_items.reserved_quantity` and insert an `inventory_transactions` row (`transaction_type='reserve'`, `related_quote_id`). Idempotent — skips if already reserved for this quote.
- New `releaseQuoteInventory(quoteId)`: reverse the above (used when a quote is cancelled or unbooked).
- New `createQuoteCalendarEvents(quoteId)`: auto-create `delivery` + `pickup` calendar events linked to `quote_id`, defaulting to event_date − 1 / event_date + 1. Skip if events already exist for that quote_id+type.
- Hook `sendQuote` (or new `bookQuote`) to call both. Add a "Book / Confirm" action button on the quote edit/preview screen.

**UI:**
- Quote edit/preview: add "Reserve inventory & schedule" button + status indicators ("Reserved ✓ • 2 events on calendar").
- Show reservation conflicts inline (uses existing `getQuoteItemsAvailability`).

## Phase 2 — Job Sheet + Check-out/Check-in

**New route `src/routes/admin.quotes.$id.job-sheet.tsx`:**
- Header: customer, event date, location, contact, assigned staff.
- Line items table: item, qty reserved, qty checked-out, qty returned, qty damaged.
- Per-line and bulk actions:
  - **Check out** → moves qty `reserved → checked_out`, writes `inventory_transactions`.
  - **Check in** → moves qty `checked_out → cleaning` (or `available` if `requires_cleaning=false`), opens a damage/missing input.
  - **Mark damaged/missing** → bumps `damaged_missing_quantity` and writes a `quote_returns` row tying damage to this quote.
- Print-friendly view for warehouse pick lists.

**Server functions (`scheduler.functions.ts` or new `job-sheet.functions.ts`):**
- `checkOutQuoteItem(quoteItemId, qty, staffId)`
- `checkInQuoteItem(quoteItemId, qty, damagedQty, missingQty, notes, staffId)`
- `completeQuote(quoteId)` → marks quote `completed`, ensures all checked-out qty is reconciled.

## Phase 3 — Staff Management

**New route `src/routes/admin.staff.tsx`:**
- CRUD list for staff (name, role, contact, color, active).
- Pill added to `AdminTabs`.

**Scheduler integration:**
- Replace the free-form `assigned_to` uuid input with a staff picker on calendar events.
- Job sheet: assign staff to a job (uses the linked calendar events' `assigned_to`).
- Calendar view: color events by staff color; filter by staff.

## Phase 4 — Availability Conflict Guard

- In the quote editor, when an `inventory_item_id` line is added/edited, run a date-range availability check against:
  - Current `reserved_quantity` + `checked_out_quantity` of that item, and
  - Any other quote with overlapping `event_date` that already reserved this item.
- Show inline warning ("3 reserved on 2026-06-12 — only 2 available"). Don't block; warn.

## Out of scope (deferred)

- Stripe / payments (per user request).
- Public customer portal for quote view/accept/sign.
- Multi-day rental pricing math beyond what already exists.

## Technical notes

- All quantity movements go through a single helper that writes both the `inventory_items` counter update AND an `inventory_transactions` audit row in one DB call (RPC or wrapped in a serverFn) — no direct counter edits scattered across the codebase.
- Idempotency keys: `(related_quote_id, transaction_type)` uniqueness check before insert to prevent double-reservation on button mash.
- Every new serverFn uses `requireSupabaseAuth` + admin role check.
- Job sheet uses Suspense + `useSuspenseQuery` per the Query pattern.

## Suggested build order

1. Phase 1 migration + reserve/release/createEvents serverFns + Book button (unlocks everything).
2. Phase 2 job sheet + check-out/in (the daily warehouse tool).
3. Phase 3 staff (small, makes scheduling real).
4. Phase 4 conflict warnings (polish; prevents the bad path that #1 enabled).

Estimated to land the full loop: ~4 build iterations, each independently shippable.
