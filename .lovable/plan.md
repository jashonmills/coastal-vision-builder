## Goal

When an admin clicks **Email** on a generated quote, open their default mail app (Outlook, etc.) with the To, Subject, **and body** all pre-filled — template greeting + quote line items + totals in plain text. Admin then just hits Send in Outlook.

This replaces the current in-app "Email Customer" dialog on the quote edit page with a `mailto:` launcher. Same treatment for the "Email" button on the quote-request page.

## Approach

`mailto:` bodies are plain text only and URL-encoded. Length is limited (~2000 chars is the safe ceiling across mail clients), so we generate a clean, compact plain-text version of the quote — not the HTML template.

### 1. New helper: `src/lib/quote-email-mailto.ts`
Pure client helper (no server call) exporting:
- `buildQuoteMailto({ quote, items, customer })` → returns `mailto:...?subject=...&body=...`
- Body format (plain text):

```text
Hi {customerName},

Thank you for your quote request with Pacific North Events & Tents.
Based on the details you provided, here is your estimated quote:

Event:    {eventType}
Date:     {eventDate}
Location: {eventLocation}
Guests:   {guestCount}

--- Line Items ---
{qty} x {name} .......... ${lineTotal}
{qty} x {name} .......... ${lineTotal}
...

Subtotal:  ${subtotal}
Delivery:  ${delivery}    (omit if 0)
Cleaning:  ${cleaning}    (omit if 0)
Discount: -${discount}    (omit if 0)
Tax:       ${tax}         (omit if 0)
TOTAL:     ${total}

This quote is valid for 30 days. Reply to this email with any
questions or to confirm your booking.

— Pacific North Events & Tents
  pacificnorthrentals.com
```

- All values are properly `encodeURIComponent`-ed. Line breaks use `\r\n` (Outlook-friendly).
- If the encoded URL exceeds ~1800 chars, we truncate the line-items list and append `…and {n} more items (see attached quote).` so the mail app still opens.

### 2. Quote edit page — `src/routes/admin.quotes_.$id.edit.tsx`
- Remove the `EmailCustomerDialog` mount and the "Email Customer" dialog trigger.
- Replace with a plain `<a href={mailtoHref}>Email Customer</a>` button (styled identically to today's button) that uses `buildQuoteMailto` with the already-loaded quote + items + customer data.
- Keep the "mark as sent" behavior: attach an `onClick` that fires the existing `sendQuoteEmail` status-update mutation logic — but strip out the queued-send call and only update `quotes.status = 'sent'` and log an `admin_notifications` row. Extract that into a new server fn `markQuoteEmailed({ quote_id })` in `src/lib/quote-email.functions.ts` so we don't rely on the mail actually being sent (Outlook is out of our control).
- Keep `invalidateOpsQueries(qc)` after the status update.

### 3. Quote-request page — `src/routes/admin.quote-requests_.$id.tsx`
Update the existing `mailto:` (line 192) to include a short body:

```text
Hi {customerName},

Thanks for reaching out to Pacific North Events & Tents about your
{eventType} on {eventDate} in {eventLocation}.

We're preparing your quote now and will follow up shortly. In the
meantime, feel free to reply with any questions.

— Pacific North Events & Tents
```

Use the same `encodeURIComponent` helper.

### 4. Cleanup
- `EmailCustomerDialog.tsx`, `sendQuoteEmail` server fn, and `customer-quote` email template are no longer wired to a UI trigger. Leave them in place (unused) rather than delete — the user may still want the in-app path later. Add a one-line comment at the top of `EmailCustomerDialog.tsx` marking it unused.
- `src/lib/quote-email.functions.ts`: keep `draftQuoteCoverLetter` and `sendQuoteEmail` exports untouched; add the new `markQuoteEmailed` server fn.

## Out of scope
- No changes to the email template, queue, DNS, or infrastructure.
- No attachment/PDF generation (mailto can't attach files).
- No changes to the customer-facing quote page.

## Files touched
- Create: `src/lib/quote-email-mailto.ts`
- Edit: `src/lib/quote-email.functions.ts` (add `markQuoteEmailed`)
- Edit: `src/routes/admin.quotes_.$id.edit.tsx` (mailto button, drop dialog)
- Edit: `src/routes/admin.quote-requests_.$id.tsx` (richer mailto body)
- Edit: `src/components/admin/EmailCustomerDialog.tsx` (add unused-comment header only)
