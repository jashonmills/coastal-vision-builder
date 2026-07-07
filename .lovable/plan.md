# Admin Email Notifications

Send an email to **info@pacificnorthrentals.com** every time a customer submits a form on the site, in addition to the existing admin dashboard entry. The email domain `notify.pacificnorthrentals.com` is already verified — no DNS work needed.

## Triggers covered

1. **Contact form / Request a Quote** (`/contact`) — via `createQuoteRequest`
2. **AI Tent Planner "Request Quote"** on a saved plan — via `requestQuoteForRecommendation` (and the modal flow in `RequestQuoteModal`)
3. **Beacon on Broadway venue inquiry** (also `createQuoteRequest`, `request_type: "venue"`)
4. **AI Tent Planner save/submit** — when a customer saves a recommendation from `/ai-tent-planner`, send the full plan (headline, picks, weather notes, blueprint + perspective images) to admin

## What each email contains

- **Quote request email**: customer name/email/phone/preferred contact, event type/date/location/guest count, customer note, and — when the request originated from the AI planner — the full recommendation summary and a link to the admin quote-request page.
- **AI planner submission email**: recommendation headline, recommended tent, complete equipment checklist grouped by category, weather notes, event details, and the blueprint + perspective images embedded inline (they're already generated and stored on `saved_recommendations`).
- **Beacon venue inquiry email**: same shape as the quote request, flagged as a Beacon inquiry in the subject.

All emails go to a single admin address (`info@pacificnorthrentals.com`), sent from `notify.pacificnorthrentals.com`.

## Implementation

1. Run the email infrastructure setup (queues, cron, send log, suppression, unsubscribe) and scaffold the transactional email routes and starter templates.
2. Add three React Email templates in `src/lib/email-templates/`:
   - `admin-quote-request.tsx`
   - `admin-venue-inquiry.tsx`
   - `admin-planner-submission.tsx`
   Register them in `src/lib/email-templates/registry.ts`.
3. Add a small server helper `sendAdminEmail(templateName, data, idempotencyKey)` that posts to the internal `/lovable/email/transactional/send` route with service-role auth. Admin email is a server-side constant (`info@pacificnorthrentals.com`).
4. Wire it into existing server functions **after** the DB insert succeeds, so email failure never blocks the submission:
   - `createQuoteRequest` (rental → quote-request template, venue → venue-inquiry template)
   - `requestQuoteForRecommendation` (quote-request template, includes plan details fetched from the saved row)
   - `saveRecommendation` (planner-submission template, includes blueprint/perspective images)
5. Idempotency keys derived from the row id + template name so retries don't duplicate.
6. Every send is logged to `email_send_log` — visible for troubleshooting.

## Notes

- No changes to public form UX. Users still see the same success screen.
- No customer-facing confirmation emails in this scope (only admin notifications). Say the word if you also want a "we got your request" reply back to the customer — that's a separate template.
- Email domain is already verified, so sends start immediately after this ships.
