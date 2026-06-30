## Goal
Make the quote intake system handle Beacon on Broadway venue inquiries — not just tent/recommendation requests — so Beacon CTAs land in the same Admin → Quote Requests pipeline.

## Changes

### 1. Database — add venue context to `quote_requests`
New migration adds two nullable columns (backwards compatible):
- `request_type text NOT NULL DEFAULT 'rental'` — values: `'rental'` (planner/tents) or `'venue'` (Beacon).
- `venue text` — e.g. `'beacon-on-broadway'`.
Add index on `request_type` for admin filtering.

### 2. Server function — `createVenueQuoteRequest`
Add to `src/lib/quotes.functions.ts`. Accepts: name, email, phone, preferred contact, event date, event type, guest count, message, venue slug. Inserts a `quote_requests` row with `request_type='venue'`, `venue='beacon-on-broadway'`, `recommendation=null`, `saved_recommendation_id=null`.

### 3. Beacon page — inline "Request the Venue" form
Replace the two `Link to="/contact"` CTAs in `src/routes/beacon-on-broadway.tsx` with a Beacon-specific quote form (modal or inline section near bottom). Fields: name, email, phone, event date, event type, guest count, message. On submit → calls `createVenueQuoteRequest` → shows success state ("We received your Beacon inquiry…"). Keeps phone CTA and "Contact Us" secondary link.

### 4. Contact page — also wire to backend
`src/routes/contact.tsx` currently just toggles `setSubmitted(true)` with no persistence. Wire its submit handler to `createQuoteRequest` (rental type) so general contact submissions also land in Admin → Quote Requests.

### 5. Admin — show venue/type in Quote Requests list
In `src/routes/admin.quote-requests.tsx`:
- Add a small badge column / inline tag: "Venue: Beacon" vs "Rental".
- Add a top filter tabs: All · Rental · Venue.
- In the request detail panel, show the venue name and message prominently when `request_type='venue'` (since there is no recommendation payload).

### 6. Admin dashboard
Add a "Beacon inquiries (new)" tile next to the existing "New Quote Requests" tile in `src/routes/admin.dashboard.tsx`, counting `request_type='venue' AND status='new'`.

## Out of scope
- Beacon-specific date availability calendar (future).
- Auto-assigning Beacon inquiries to a specific staff member.
- Email notifications (Resend deferred per earlier scope).

## Technical notes
- The new columns are nullable/defaulted, so all existing rows + flows keep working.
- `createVenueQuoteRequest` reuses the existing anon-insert RLS policy (`anyone insert quote request`) — no policy changes needed.
- Admin queries already select `*`, so the new columns surface automatically; only UI changes are needed for filtering/labeling.
