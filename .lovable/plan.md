## Incorporate the Beacon into admin bookings & scheduling

Right now a Beacon inquiry lands as a `quote_request` with `request_type: "venue"` and writes a scheduler event with `event_type: "venue_inquiry"` and color `#7c5cff`. That event type isn't registered in the scheduler's vocab, the Beacon never appears as a bookable thing in the calendar/quote tooling, and the quote/request detail screens don't surface "this is a venue inquiry" anywhere. This plan wires the Beacon end‑to‑end into the admin booking and scheduling flow without changing the customer-facing pages.

### 1. Make "Beacon" a first-class scheduler concept

In `src/lib/scheduler.functions.ts`:
- Add to `EVENT_TYPES`: `"venue_inquiry"`, `"venue_hold"`, `"venue_booked"`, `"venue_setup"`, `"venue_teardown"`.
- Add matching `EVENT_COLORS` (Beacon purple `#7c5cff` for inquiry/hold/booked, lighter shades for setup/teardown).

In `src/routes/admin.scheduler.tsx`:
- Extend `EVENT_TYPE_LABELS` with friendly labels ("Beacon Inquiry", "Beacon Hold", "Beacon Booked", "Beacon Setup", "Beacon Teardown").
- Add a `venue` filter chip group above the existing type filter: `All / Rentals / Beacon` that pre-filters by the venue event-type family. (Pure UI filter — no new fields.)
- In the event detail modal, when the event belongs to a venue inquiry/booking, show a "Venue: Beacon on Broadway" line and a deep link to the originating quote request or quote.

This keeps the existing scheduler intact and just teaches it about venue events.

### 2. Surface Beacon context in the quote-request detail page

In `src/routes/admin.quote-requests.$id.tsx`:
- When `req.request_type === "venue"`, render a prominent Beacon banner at the top (purple accent, MapPin icon, "Beacon on Broadway · 735 Broadway, Seaside, OR").
- Replace the single "Create Quote from This Plan" CTA with venue-aware actions:
  - **Rental request (today's behavior)**: unchanged.
  - **Venue request**: show three actions instead — `Place Hold on Date`, `Confirm Beacon Booking`, `Create Add-on Rental Quote`. The first two call new server fns (below). The third reuses `createQuoteFromRequest` so an inquiry can spawn a tent/rental quote tied to the same customer/date.
- Add an "Availability" panel: lists existing `venue_hold` / `venue_booked` events on the requested `event_date` so the admin can spot conflicts before holding.

### 3. New venue booking server functions

New file `src/lib/venue-bookings.functions.ts` (keeps Beacon logic out of inventory-heavy `bookings.functions.ts`):
- `placeVenueHold({ quote_request_id })` — inserts a `venue_hold` calendar event for the request's `event_date` (all-day), links it via `quote_request_id`, sets `quote_requests.status = "in_review"`, emits an `admin_notifications` row "Beacon hold placed for {customer}".
- `confirmVenueBooking({ quote_request_id })` — upgrades any existing `venue_hold` for that request to `venue_booked` (or inserts one), inserts paired `venue_setup` (event day −1, 14:00) and `venue_teardown` (event day +1, 10:00) events, sets `quote_requests.status = "quote_sent"` (or new `"venue_booked"` if we want to track it distinctly — see Technical notes), notifies admins.
- `releaseVenueBooking({ quote_request_id })` — soft-deletes the venue calendar events and reverts request status.
- `listVenueEventsOnDate({ date })` — used by the Availability panel.

All four use `requireSupabaseAuth`. No inventory transactions are involved; the Beacon isn't a counted item.

### 4. Quote editor: Beacon line + booking parity

In `src/routes/admin.quotes.$id.edit.tsx` and `src/lib/quotes.functions.ts`:
- When the source `quote_request.request_type === "venue"`, `createQuoteFromRequest` already runs; extend it to add a single non-inventory line item `"Beacon on Broadway — Venue Rental"` (pricing left blank, flagged "Needs pricing review") so the admin sees the venue in the line items.
- In `bookQuote` (`src/lib/bookings.functions.ts`): detect venue-only quotes (no resolvable inventory lines but tied to a venue request) and, instead of failing on empty `lines`, fall through to scheduler-only booking that calls the same `confirmVenueBooking` path. The result is `Book & Reserve` works for a Beacon-only quote without an empty-inventory error.

### 5. Admin dashboard tile

`src/routes/admin.dashboard.tsx` already has a "Beacon Inquiries" stat card. Add a second card next to it: "Beacon Holds / Booked (next 30 days)" sourced from a small extra count in `getAdminDashboard` (counts `venue_hold` + `venue_booked` events with `start_time` in the next 30 days).

### Technical notes

- **No schema changes required.** Venue holds/bookings live entirely in `rental_calendar_events` linked via `quote_request_id` / `quote_id`. Status on `quote_requests` reuses existing values; if we want a clean `"venue_booked"` status I'll add it as a small migration (one enum/check update) — flagging here so you can say yes/no.
- `EVENT_TYPES` is a `z.enum` in `scheduler.functions.ts`; adding values is safe because existing rows already use `"venue_inquiry"` (the original auto-created events will start rendering with their proper label after this change).
- Beacon detail strings (`"Beacon on Broadway"`, address) are centralized in one constant `BEACON_VENUE` re-exported from `venue-bookings.functions.ts` and consumed by the request page, quote editor, and scheduler modal — single source of truth.
- No customer-facing changes. `BeaconQuoteModal` and the Beacon page continue to write the same `quote_requests` rows.

### Files touched

- `src/lib/scheduler.functions.ts` — new event types + colors.
- `src/lib/venue-bookings.functions.ts` — new file, 4 server fns + `BEACON_VENUE` constant.
- `src/lib/bookings.functions.ts` — venue passthrough in `bookQuote`/`unbookQuote`.
- `src/lib/quotes.functions.ts` — add Beacon line item when seeding a venue quote.
- `src/lib/dashboard.functions.ts` — extra venue stat.
- `src/routes/admin.scheduler.tsx` — labels, venue filter, modal copy.
- `src/routes/admin.quote-requests.$id.tsx` — venue banner, venue actions, availability panel.
- `src/routes/admin.quotes.$id.edit.tsx` — venue-aware Book & Reserve button copy.
- `src/routes/admin.dashboard.tsx` — Beacon Holds/Booked tile.

### Out of scope

- Multi-venue support (only Beacon on Broadway for now; structure leaves room).
- Pricing rules for the Beacon (admin still sets price manually on the quote).
- Customer-facing changes to the Beacon page or modal.
- Stripe / payments / deposits.