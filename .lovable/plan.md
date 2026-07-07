## Why the quote is blank today

`createQuoteFromRequest` (in `src/lib/quotes.functions.ts`) only reads line items from `quote_requests.recommendation.picks`. Two failure modes hit this:

1. **Request came from the Contact / Request-a-Quote form** — that path never attaches a `recommendation`. `picks = []` → 0 line items → blank quote. (This is the request in your screenshot; `recommendation` is `null` in the DB.)
2. **Request came from the AI Tent Planner but the recommendation lives on `saved_recommendations`** (linked via `saved_recommendation_id`) — the current code never falls back to that row.

Even when a recommendation exists, matching is fragile: `item_id` mismatch drops the price to `$0` and lines get flagged `needs_pricing_review` silently.

## Fix

Rewrite `createQuoteFromRequest` to always try to produce a populated draft in this order:

1. **Use the attached plan** — `req.recommendation.picks` if present.
2. **Fall back to the linked saved plan** — if `req.saved_recommendation_id` is set, load `saved_recommendations.recommendation.picks`.
3. **AI draft fallback** — if still no picks, call the Lovable AI Gateway (same model/config as `generateRecommendation`) with:
   - the full `pricing_items` catalog (id, category, name, unit, notes, price),
   - event details from the request (type, date, guests, location, customer_note including any "Interested in: …" rentals list from the contact form),
   - a prompt that asks for a **draft quote**: pick items only from the catalog, one Canopy, appropriate Chairs/Tables, Options/Specialty as fit, and the right Delivery zone based on the location string.
   
   Response shape mirrors the planner's `picks[]` (`item_id`, `item_name`, `category`, `quantity`, `reason`) so downstream code is identical.

4. **Robust pricing match** for every pick:
   - exact `item_id` → catalog row,
   - else case-insensitive `name` match,
   - else keep the pick with `unit_price_cents = 0`, `needs_pricing_review = true`, and `reason` prefixed with `[Needs pricing]` so admin sees it clearly in the draft.

5. **Auto-Delivery** — if the AI/plan didn't include a Delivery line, add one by matching the request's `event_location` text against `Delivery` category names (Seaside, Cannon Beach, Astoria, …). No match → insert "Beyond listed locations" with `needs_pricing_review: true`.

6. Keep the existing venue-line prepend for `request_type === "venue"` and the totals / status update unchanged.

7. Log the source used (`plan | saved_plan | ai_draft`) to the server console for troubleshooting; nothing user-facing added on this pass.

## Files touched

- `src/lib/quotes.functions.ts` — rewrite the body of `createQuoteFromRequest`; add a small `draftPicksWithAI(req, pricing)` helper alongside it (server-only).

No schema, UI, or contract changes — the button, redirect to `/admin/quotes/$id/edit`, and admin edit page all work as-is; the draft they open just won't be empty anymore.

## Out of scope

- No changes to the customer-facing planner or contact form.
- No inventory-availability check on the draft (still just pricing catalog + quantities); real reservation happens on "Book & Reserve" in the quote editor as today.
- No changes to how quote totals, tax, cleaning, or delivery fees are calculated after the draft is created.
