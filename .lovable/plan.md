## Goal
Replace the mailto: launcher on the "Email Customer" button with an in-app flow that composes a cover letter and emails the quote directly to the customer from the admin section — no external mail client involved.

## Flow (what admin sees)

1. Click **Email Customer** on a quote (`/admin/quotes/:id/edit`).
2. A dialog opens with:
   - **To** (prefilled with `quote.customer_email`, editable)
   - **Subject** (prefilled: `Your Pacific North Events Quote {quote_number}`)
   - **Cover letter** — AI-drafted on open, editable rich text (plain textarea)
   - **Quote summary preview** — read-only block showing line items, totals, event details, and a "View full quote" link to the public preview page
   - Buttons: **Regenerate cover letter**, **Cancel**, **Send email**
3. On Send: email is queued through the existing transactional pipeline and status toast confirms delivery. Quote status auto-advances to `sent` (same behavior as Mark Sent).

## Technical

### New customer-facing email template
- `src/lib/email-templates/customer-quote.tsx` — React Email component rendering:
  - Branded header (site name)
  - Cover letter paragraph(s) (preserves line breaks)
  - Event summary (type, date, location, guests)
  - Line-item table (item, qty, unit $, line $) with subtotal / delivery / cleaning / discount / tax / total
  - CTA button linking to `/admin/quotes/:id/preview` public URL (already used today)
  - Standard footer w/ unsubscribe token (reuse existing helper)
- Register in `src/lib/email-templates/registry.ts` as `customer-quote`.

### New server functions (`src/lib/quote-email.functions.ts`)
- `draftQuoteCoverLetter({ quoteId })` — `requireSupabaseAuth` + admin role check. Loads quote + line items, calls Lovable AI Gateway (`google/gemini-2.5-flash`) with quote context, returns `{ subject, coverLetter }` strings. No DB writes.
- `sendQuoteEmail({ quoteId, toEmail, subject, coverLetter })` — `requireSupabaseAuth` + admin role check. Loads quote + line items server-side (never trusts client for pricing), renders the `customer-quote` template via `sendAdminEmail` helper pattern (extend or reuse — see below), passing `recipient = toEmail`. Sets quote `status = 'sent'` and `sent_at = now()` if not already sent. Idempotency key: `quote-email:{quoteId}:{crypto.randomUUID()}` so admins can resend.

### Reuse existing send infrastructure
- `src/lib/email/send-admin.server.ts` already renders a registered template and enqueues to the `transactional_emails` pgmq queue with suppression, unsubscribe token, and logging. Generalize it slightly: rename intent from "admin" to "transactional" internally OR add a thin wrapper `sendTransactionalEmail()` that calls the same logic with an arbitrary recipient. No queue/worker changes needed — the existing dispatcher already handles the queue.

### UI changes
- `src/routes/admin.quotes_.$id.edit.tsx`:
  - Remove the `mailto:` onClick.
  - Add local state for dialog open + form fields + loading.
  - On open: call `draftQuoteCoverLetter` (show skeleton while loading).
  - On Send: call `sendQuoteEmail`, close dialog, toast success, invalidate quote query so status pill updates.
- New component `src/components/admin/EmailCustomerDialog.tsx` using existing shadcn `Dialog`, `Textarea`, `Input`, `Button` primitives.

### Out of scope
- No changes to inventory, pricing math, or the quote schema.
- No new DB tables (existing `email_send_log`, `email_unsubscribe_tokens`, `suppressed_emails`, `transactional_emails` queue cover this).
- Attachments (PDF) — not included; the email links to the preview page instead. Can be added later if desired.

## Files touched
- new: `src/lib/email-templates/customer-quote.tsx`
- new: `src/lib/quote-email.functions.ts`
- new: `src/components/admin/EmailCustomerDialog.tsx`
- edited: `src/lib/email-templates/registry.ts` (register template)
- edited: `src/lib/email/send-admin.server.ts` (export a generalized `sendTransactionalEmail`)
- edited: `src/routes/admin.quotes_.$id.edit.tsx` (wire dialog, remove mailto)
