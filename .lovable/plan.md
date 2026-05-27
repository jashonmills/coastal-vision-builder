# Quote workflow: from planner to admin-reviewed quote

Goal: turn "Request Quote" into an internal admin workflow. The database — not email — is the source of truth. The current Pricing editor stays as the pricing catalog and becomes the price source for quote line items. Inventory stays separate as the operational stock system.

This plan is scoped to "Phase 1 + Phase 2": schema, admin inbox, quote builder, customer trigger wiring. Stripe and mobile technician flows are stubbed (columns reserved) but not built.

---

## 1. Database changes (one migration)

Three new tables + one mapping table. Lookups use existing `pricing_items` and `inventory_items`. RLS: customers can insert their own quote requests; only admins read/write quotes.

```text
quote_requests
  id, user_id (nullable), customer_id (nullable),
  saved_recommendation_id (nullable),
  customer_name, customer_email, customer_phone,
  preferred_contact_method ('email' | 'phone' | 'text'),
  event_type, event_date, event_location, guest_count,
  planner_input jsonb, recommendation jsonb, pdf_url,
  status ('new'|'in_review'|'quote_created'|'quote_sent'|'booked'|'closed'|'archived'),
  admin_notes, created_at, updated_at

quotes
  id, quote_request_id (nullable), saved_recommendation_id (nullable),
  quote_number (auto, e.g. Q-2026-0001),
  customer_name, customer_email, customer_phone,
  event_type, event_date, event_location, guest_count,
  status ('draft'|'sent'|'approved'|'booked'|'cancelled'),
  subtotal_cents, delivery_fee_cents, cleaning_fee_cents,
  discount_cents, tax_cents, total_cents,
  customer_notes, internal_notes, terms,
  sent_at, approved_at, booked_at,
  -- reserved for future Stripe phase (nullable, unused now):
  deposit_amount_cents, amount_paid_cents, payment_status,
  stripe_customer_id, stripe_payment_intent_id, stripe_invoice_id,
  created_at, updated_at

quote_items
  id, quote_id, pricing_item_id (nullable), inventory_item_id (nullable),
  category, name, description,
  quantity, unit, unit_price_cents, line_total_cents,
  needs_pricing_review (bool),  -- planner item with no pricing match
  sort_order, created_at, updated_at

pricing_inventory_mappings
  id, pricing_item_id, inventory_item_id (nullable),
  recommendation_keyword (text), active (bool), created_at, updated_at
```

RLS policies (with explicit GRANTs):
- `quote_requests`: anon + authenticated can INSERT (customer submission); admin reads/updates all.
- `quotes`, `quote_items`, `pricing_inventory_mappings`: admin only.
- Customers do NOT read their own quote — they receive a link or email.

Quote number generator: small Postgres function + sequence `quote_number_seq`, formatted `Q-{YYYY}-{0000}`.

Seed `pricing_inventory_mappings` so the planner's known item names match existing pricing rows (20x40 Frame Tent, Round Table, Folding Chair, Dance Floor, Stage, Portable Bar, Chafing Dish, Canopy Wall, Cleaning Fee - Beach, Seaside Delivery, etc.).

## 2. Customer-side wiring (existing "Request Quote" buttons)

Audit and rewire every existing "Request Quote" trigger so they call a new helper `createQuoteRequest({ savedRecommendationId, contact, ... })`:
- Planner result page
- Saved plan card
- Plan preview / PDF viewer modal
- Bottom CTA under PDF preview

The helper:
1. Inserts a `quote_requests` row with status `new`, snapshotting planner input + recommendation JSON + pdf_url.
2. Updates the linked `saved_recommendations` row (`quote_requested_at`, status).
3. Shows confirmation UI: "Got it — our team will review and send a quote shortly." No pricing is shown.
4. (Optional, if email infra is enabled) sends an admin notification email. Email is notification only — the DB row is the source of truth.

A clear human-in-the-loop note is added near the request button:
"Your planner result is a starting recommendation. Our team will review your event details and send a final quote."

## 3. Admin: Quote Requests inbox

New routes:
- `/admin/quote-requests` — list view
- `/admin/quote-requests/$id` — detail view

List columns: Customer · Event Type · Event Date · Guest Count · Location · Recommended Tent · Status · Created · Actions (View, Create Quote, Mark Contacted, Archive).
Filters: status, date range, search by name/email.
"New" badge count exposed via a small hook for the admin nav.

Detail view sections:
- Customer info (name, email, phone, preferred contact)
- Event info (type, date, location, guest count + planner answers: surface, weather, seating, food, dancing, sidewalls, after sunset)
- Planner recommendation (tent size, layout, equipment checklist, weather/surface notes, blueprint preview, PDF link)
- Admin actions: **Create Quote from This Plan**, Mark In Review, Contact Customer (mailto), Archive

## 4. Admin: Quote Builder

New routes:
- `/admin/quotes` — list of all quotes (status filter, search by quote #, customer)
- `/admin/quotes/$id/edit` — builder

"Create Quote from This Plan" flow:
1. Insert `quotes` row with snapshot of customer + event info.
2. Walk the recommendation equipment checklist. For each entry, look up `pricing_inventory_mappings` by keyword → resolve `pricing_item_id` → insert a `quote_items` row with default unit price.
3. Unmatched entries become draft line items with `needs_pricing_review = true` and a "Needs pricing review" pill.
4. Set `quote_requests.status = 'quote_created'`.
5. Redirect admin to `/admin/quotes/$id/edit`.

Builder layout:
- Top: customer + event summary, quote number, status badge
- Middle: line-item table — Category · Item · Description · Qty · Unit · Unit Price · Line Total · Inventory · Actions (Edit, Remove, Duplicate, Link Pricing, Link Inventory)
- Inline "Add line item" with autocomplete against `pricing_items`; also "Add custom line item" (no pricing match)
- Right rail: totals (Subtotal, Delivery, Cleaning, Discount, Tax optional, Total), Internal notes, Customer notes, Terms
- Actions bar: Save Draft · Preview Quote · Send Quote · Mark Booked · Cancel

Inventory availability column: if the line is linked to an `inventory_items` row, show a small status pill computed from `computeAvailable()`:
- Available · Low availability (≤ 20% of owned) · Not enough available · Not configured (owned = 0) · Needs admin review (negative)
- Warnings never block save — admin can still send the quote.

## 5. Quote preview + send

`/admin/quotes/$id/preview` — invoice-style document (logo, quote #, dates, customer/event, line items, totals, notes, terms, CTA "Contact Us to Book"). Printable via browser print.

**Send Quote** action:
1. Update quote: `status = 'sent'`, `sent_at = now()`.
2. Update linked `quote_requests.status = 'quote_sent'`.
3. Email the customer using the existing email helper if available; otherwise a short stub that logs to console and shows "Mark as sent (email manually)" — Stripe/email infra is not required to ship the workflow.
4. Email subject: "Your Pacific North Events & Tents Quote". Body summarizes event + total + link to the preview URL.

## 6. Admin navigation update

Update the admin tab bar / shell to show: Dashboard · Quote Requests (with `new` count badge) · Quotes · Pricing · Inventory · Gallery · Site Images · Site Text. Pricing and Inventory keep their current routes.

A tiny admin dashboard widget set (counts: new requests, drafts, sent, items needing cleaning, items checked out) can be added on the existing `/admin` landing.

---

## Out of scope for this round

- Stripe checkout / deposits / payment links (columns reserved, no UI).
- Mobile technician check-out / check-in app.
- Auto-reserving inventory when a quote is sent — manual reservation only.
- Bulk customer messaging.

---

## Technical notes

- All new tables get explicit `GRANT` + RLS in the same migration.
- Quote number generator uses a Postgres sequence + trigger, not client-side.
- `pricing_inventory_mappings` is the matching layer — planner labels vary, so the agent seeds keywords ("frame tent", "round table 60", "folding chair white", "dance floor section", "stage 6x8", "portable bar", "chafing dish", "canopy wall 20", "water barrel", "beach cleaning", "delivery") and admins can extend it later from the Pricing screen.
- Money is stored as `*_cents` integers everywhere.
- Existing `saved_recommendations` already has `pdf_url`, `customer_id`, `quote_requested_at` — reused as-is.
- Customer-facing "Request Quote" buttons never display pricing.
