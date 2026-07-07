Two email regressions to fix. Both live in the quote request / quote-send flow; neither requires DB or template shape changes.

## 1. Customer auto-reply ("bounce back") intermittently not sending

**Diagnosis.** The latest quote request (23:50 UTC today) shows the admin notification enqueued and sent, but the `customer-request-acknowledgement` row never appears in `email_send_log` at all — not even a `pending` row. No error was logged either. The earlier submission (22:51 UTC) worked. Suppression list is empty. The two `await`s in `createQuoteRequest` run sequentially before the handler returns, so if admin succeeds the customer ack should always run — the evidence is that the second call was silently not executed on that submission.

Two things make this fragile today:
- Both sends are inside a single `try` and awaited sequentially. If the admin call resolves and then the worker is torn down (or an unhandled rejection escapes), the customer ack never runs and there is no log to explain it.
- No log lines around the customer ack itself, so we can't tell whether it entered `sendCustomerAcknowledgement` or errored inside it.

**Fix.** In `src/lib/quotes.functions.ts` and `src/lib/saved-recommendations.functions.ts` (the two places that call both sends):

- Run the admin and customer emails with `Promise.allSettled` instead of sequential awaits, so one failing/hanging never blocks the other and both are guaranteed awaited before the handler returns.
- Log the intent/outcome of each: `[createQuoteRequest] scheduling admin+customer emails` before, and settled statuses after (fulfilled/rejected + reason).
- In `sendAdminEmail` (`src/lib/email/send-admin.server.ts`), add an entry log at the top (`[sendAdminEmail] start { templateName, recipient_redacted }`) so we can distinguish "never entered" from "entered and errored" next time.

No changes to templates, queue infra, RLS, or the auth webhook.

## 2. Quote email cover letter no longer contains pricing

The AI-drafted cover letter used to reference pricing. Today's system prompt in `draftQuoteCoverLetter` (`src/lib/quote-email.functions.ts`) explicitly forbids it:

```
- Do NOT list line items or totals — the email template renders those separately.
```

The line-items table below the letter still renders, but the letter itself no longer mentions any dollar figures.

**Fix.** In `src/lib/quote-email.functions.ts`:

- Update the system prompt so the AI includes a short pricing recap in the letter (subtotal, delivery/cleaning/discount/tax when non-zero, and the total), while still leaving the detailed line-items table to the template. Rule wording will be roughly: "Reference the quote total (and 2–3 of the largest line items by dollar amount) naturally in one paragraph; do not reproduce the full line-item table."
- Pass a small pre-formatted `pricing_summary` block into `context_summary` so the model doesn't have to compute anything: `subtotal_usd`, non-zero fee lines, `total_usd`, plus the top-3 line items sorted by `line_total_cents`.
- Update the fallback `defaultLetter` (used when `LOVABLE_API_KEY` is missing or the AI call fails) to also include the total, so pricing is present in the letter even without AI.

No template edits — `customer-quote.tsx` already renders letter + line items + totals correctly.

## Verification

- Submit a rental quote request from the site with a real customer email; confirm `email_send_log` shows both an `admin-quote-request` row and a `customer-request-acknowledgement` row, and server logs show both settled statuses.
- Open a draft quote in admin → Email Customer → confirm the auto-drafted cover letter mentions the total and at least one line item; regenerate a couple of times to confirm consistency; verify the totals table in the received email still renders correctly.
- Sanity-check the fallback path by temporarily forcing the AI call to fail (or reading the code) to confirm the `defaultLetter` now includes the total.

## Technical notes

- Files touched: `src/lib/quotes.functions.ts`, `src/lib/saved-recommendations.functions.ts`, `src/lib/email/send-admin.server.ts`, `src/lib/quote-email.functions.ts`.
- Not touched: `src/lib/email-templates/*`, auth webhook, pgmq queues, RLS, unsubscribe route, `EmailCustomerDialog.tsx`.
