## Diagnosis: what's wired and what's not

Findings from tracing the admin surface end-to-end:

**Dashboard**
- `getAdminDashboard` (src/lib/dashboard.functions.ts) counts: new requests, in review, draft quotes, sent quotes, upcoming events (7d), unread notifs, venue new, venue booked/hold (30d).
- MISSING: no "Booked Quotes" KPI. Screenshot shows two BOOKED quotes but the dashboard never surfaces them.
- No aggregate for `needs_pricing_review` line items (from AI draft) — those quotes silently ship blank prices.
- Inventory alerts only flag `owned=0` or `damaged/missing>0` — misses **over-committed** (reserved > owned) and low stock.
- No refetch when other pages mutate — dashboard only polls every 60s and no page invalidates `["admin-dashboard"]` after booking/sending/checking-out.

**Scheduler / Bookings**
- `bookQuote` correctly moves inventory to reserved, creates delivery/pickup events, sets quote `status='booked'`.
- BUT it only reserves items that resolve to an `inventory_item_id` — either directly on the quote line or via `pricing_inventory_mappings`. AI-drafted quotes populate `pricing_item_id` only; if no mapping row exists, the booking silently reserves 0.
- No UI signal on the quote edit page that "N of M lines could not be reserved" — admin thinks it's booked, but inventory reserved_quantity didn't move.
- Dashboard "Events (7 days)" filter includes ALL event_types (quote_request notes inflate count). Should scope to operational types (delivery, pickup, check_out, check_in, venue_*).

**Inventory**
- Admin page reads directly from `inventory_items` via the browser client (uses admin RLS). Numeric columns are live.
- But because most booked quotes' lines aren't mapped, reserved counts stay at 0 despite bookings — no visible reservation link.
- The `Inventory Alerts` list on dashboard doesn't include "reserved > owned" or "planner-visible with 0 owned" (which the inventory page already computes locally as `plannerNoStock`). Duplicate logic, inconsistent surfacing.
- No cross-page invalidation: booking a quote does not refresh `["admin-inventory-items"]`.

**Quotes ↔ Pricing ↔ Inventory chain**
- `pricing_items` → `pricing_inventory_mappings` → `inventory_items` is the only bridge. If a pricing item lacks a mapping, booking is a no-op for that line.
- Nothing in the admin surfaces "these pricing items have no inventory mapping". Silent failure.

**Cross-page cache invalidation gaps** (React Query keys)
- `bookQuote` mutation invalidates: `quote-availability`, `quote-booking-status`. Does NOT invalidate: `admin-dashboard`, `admin-quotes`, `admin-inventory-items`, `calendar-events`.
- `unbookQuote`: same gaps.
- `sendQuote` / `sendQuoteEmail`: invalidates `admin-quote/[id]`. Does NOT touch `admin-dashboard` or `admin-quotes`.
- Result: the KPIs the user sees on Dashboard/Inventory/Scheduler drift out of sync until 60s poll or manual refresh.

---

## Plan — one focused pass to tighten the wiring

### 1. Dashboard KPIs
File: `src/lib/dashboard.functions.ts`, `src/routes/admin.dashboard.tsx`
- Add counts:
  - `bookedQuotes` — `quotes` where status='booked'
  - `approvedQuotes` — status='approved' (post-send acceptance)
  - `unmappedPricing` — count of `pricing_items` with `active=true` and no active row in `pricing_inventory_mappings` (only for pricing_items that would need inventory: category not in Delivery/Cleaning/Options-only lists — kept simple: any that has zero mapping rows)
  - `overCommittedInventory` — inventory rows where `reserved_quantity + checked_out_quantity + cleaning_quantity + maintenance_quantity + damaged_missing_quantity > total_owned_quantity`
- Add tiles: **Booked (all-time)**, **Approved**, **Over-committed items**, **Pricing items missing inventory link**. Scope "Events (7 days)" to operational event types only.
- Change `refetchInterval` → 30s and add a soft refresh button.

### 2. Cross-page cache invalidation
Everywhere a mutation changes booking/inventory/quote-state, invalidate the shared keys.
- Files: `src/routes/admin.quotes_.$id.edit.tsx`, `admin.quotes_.$id.job-sheet.tsx`, `admin.quote-requests_.$id.tsx`, `admin.scheduler.tsx`, `components/admin/EmailCustomerDialog.tsx`
- After `bookQuote` / `unbookQuote` / `sendQuote` / `sendQuoteEmail` / `checkOut` / `checkIn`, invalidate:
  - `["admin-dashboard"]`
  - `["admin-quotes"]`
  - `["admin-inventory-items"]`
  - `["calendar-events"]`
  - `["quote-booking-status", id]`
- Extract a tiny helper `invalidateOpsQueries(qc)` in `src/lib/admin-cache.ts` so every call site stays one-liner and consistent.

### 3. Surface silent booking failures
File: `src/lib/bookings.functions.ts`, `src/routes/admin.quotes_.$id.edit.tsx`
- `bookQuote` already knows `lines_reserved` vs quote line count. Return `unmapped_lines: Array<{ quote_item_id, name }>` (lines missing inventory mapping AND missing direct inventory_item_id).
- On the edit page, after book, if `unmapped_lines.length > 0` show a persistent warning banner with a link to map each pricing item on the Pricing page.
- Add a small `getQuoteBookingIntegrity` server fn used by the edit page to render the same banner on load when the quote is booked but some lines are unmapped.

### 4. Inventory ↔ pricing linkage visibility
File: `src/routes/admin.pricing.tsx` (add a column), `src/routes/admin.inventory.tsx`
- Pricing table: add "Inventory link" column showing the mapped inventory item name or a red "Unmapped" pill with a "Link…" action. (Editor UI already exists elsewhere — reuse.)
- Inventory table: add "In quotes (30d)" count column — number of active/booked quote lines pointing at this inventory item, so operators see demand.

### 5. Scheduler filter cleanup
File: `src/lib/dashboard.functions.ts`, `src/routes/admin.scheduler.tsx`
- Dashboard "Events (7 days)" and "Upcoming events" scoped to operational types (delivery, pickup, check_out, check_in, venue_hold, venue_booked, venue_setup, venue_teardown). Quote-request/quote-sent notes still show in the scheduler view but are excluded from the KPI.
- Scheduler page: add a legend + type filter chip row so admins can hide notes.

### 6. Ensure booking actually moves inventory for AI-drafted quotes
File: `src/lib/quotes.functions.ts` (draft AI path) and `src/lib/bookings.functions.ts`
- When `createQuoteFromRequest` writes quote_items, if the picked pricing_item has an active mapping, also copy `inventory_item_id` onto the quote_item at insert time (single query per batch). This avoids relying on the mapping table again at book time.
- Log unresolved picks so we can see them in server logs.

### 7. Notifications
File: `src/lib/notifications.functions.ts` (already exists)
- Emit `admin_notifications` rows on: new quote request (already), quote booked (new), quote emailed to customer (new), booking with unmapped lines (new — high-priority). This wires the "Unread Alerts" KPI to real activity.

---

## Files touched
- edited: `src/lib/dashboard.functions.ts` (new counts, event-type scope)
- edited: `src/routes/admin.dashboard.tsx` (new tiles, faster refresh, new alerts panel)
- new: `src/lib/admin-cache.ts` (shared invalidation helper)
- edited: `src/routes/admin.quotes_.$id.edit.tsx` (integrity banner, invalidations)
- edited: `src/routes/admin.quotes_.$id.job-sheet.tsx` (invalidations)
- edited: `src/routes/admin.quote-requests_.$id.tsx` (invalidations after venue actions)
- edited: `src/routes/admin.scheduler.tsx` (invalidations, type-filter chips)
- edited: `src/components/admin/EmailCustomerDialog.tsx` (invalidations after send)
- edited: `src/lib/bookings.functions.ts` (return `unmapped_lines`; notifications)
- edited: `src/lib/quotes.functions.ts` (copy inventory_item_id at draft-quote insert)
- edited: `src/routes/admin.pricing.tsx` (inventory-link column)
- edited: `src/routes/admin.inventory.tsx` (in-quotes demand column, cross-invalidate)
- edited: `src/lib/notifications.functions.ts` (new notification triggers)

## Out of scope for this pass
- Redesign of the scheduler calendar surface.
- Automatic pricing→inventory mapping (still admin-driven; we only expose the gap).
- PDF-attaching the quote email (previous plan noted this — separate ticket).
- Auth/RLS changes.
