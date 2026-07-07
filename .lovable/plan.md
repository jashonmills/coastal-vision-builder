## Goal

Auto-send the acknowledgement email ("Thanks for reaching out … we're preparing your quote now …") to the customer immediately after any quote/planner request is submitted — no human in the loop. The manual pricing email (from Quote edit → Email Customer) is unchanged.

## Trigger points to wire

All three server-side entry points that currently notify the admin with `sendAdminEmail`:

1. `src/lib/quotes.functions.ts` — `createQuoteRequest` (rentals / catering / generic contact) around line 135.
2. `src/lib/venue-bookings.functions.ts` — Beacon venue quote request around line 28.
3. `src/lib/saved-recommendations.functions.ts` — AI Tent Planner submission (line 76) and "Request quote from saved plan" (line 201).

Every site follows the same pattern: insert row → notify admin → **new**: notify customer.

## Approach

### 1. New customer email template
Create `src/lib/email-templates/customer-request-acknowledgement.tsx` — a branded React Email template with:
- Greeting: "Hi {customerName},"
- Body:
  > "Thanks for reaching out to Pacific North Events & Tents about your **{eventType}** on **{eventDate}**{eventLocation ? " in " + eventLocation : ""}. We're preparing your quote now and will follow up shortly. In the meantime, feel free to reply with any questions."
- Sign-off: "— Pacific North Events & Tents · pacificnorthrentals.com"
- Same visual style as the existing `customer-quote` template (white body, navy heading, plain container).

Register as `customer-request-acknowledgement` in `src/lib/email-templates/registry.ts`.

Variants: the template accepts an optional `requestType` ("rental" | "beacon" | "catering" | "planner") that lightly adjusts the wording, e.g. Beacon becomes "your event at Beacon on Broadway". One template, small conditional copy — no separate templates per channel.

### 2. New helper: `sendCustomerAcknowledgement(args)`
Add to `src/lib/email/send-admin.server.ts` (colocated with `sendAdminEmail` / `sendTransactionalEmail`):

```ts
export async function sendCustomerAcknowledgement(args: {
  requestId: string;
  recipient: string;           // customer_email
  customerName: string;
  eventType?: string | null;
  eventDate?: string | null;
  eventLocation?: string | null;
  requestType: "rental" | "beacon" | "catering" | "planner";
}): Promise<void>
```

Internally calls `sendTransactionalEmail` with:
- `templateName: "customer-request-acknowledgement"`
- `recipient: args.recipient`
- `idempotencyKey: "customer-ack-" + args.requestId`  → guarantees exactly-one send even on retries
- `templateData: { ...args }`

Failures are logged and swallowed (same pattern as `sendAdminEmail`) so a bad customer email address never blocks the submission flow.

### 3. Wire into the three call sites
In each entry point, immediately after the existing `await sendAdminEmail(...)`, add a parallel `await sendCustomerAcknowledgement(...)`:

- `quotes.functions.ts` `createQuoteRequest`: pull `requestType` from `data.request_type` (defaults to `"rental"`; `"venue"` → `"beacon"` per existing schema); recipient is `data.customer_email`.
- `venue-bookings.functions.ts` beacon request creation (~line 28): `requestType: "beacon"`.
- `saved-recommendations.functions.ts` planner submission (line 76): `requestType: "planner"`.
- `saved-recommendations.functions.ts` plan → quote request (line 201): `requestType: "rental"` (or map from stored plan).

For the catering channel, verify whether it goes through `createQuoteRequest` (expected — `contact.tsx` / `catering.tsx` post via the shared modal). If it uses a distinct path, add the call there too. This is a read-only check during implementation, not a new endpoint.

### 4. Suppression + throttling
`sendTransactionalEmail` already checks `suppressed_emails` and uses the pgmq queue with idempotency, so a spam-clicking customer only receives one acknowledgement per `request_id`. No new tables or migrations needed.

## Out of scope
- No changes to the admin notification email.
- No changes to the manual quote email flow (mailto: Outlook launcher).
- No new endpoints, cron, or DNS work.
- No copy for a separate "denied/cancelled" auto-email.

## Files touched
- Create: `src/lib/email-templates/customer-request-acknowledgement.tsx`
- Edit: `src/lib/email-templates/registry.ts`
- Edit: `src/lib/email/send-admin.server.ts` (add `sendCustomerAcknowledgement`)
- Edit: `src/lib/quotes.functions.ts` (createQuoteRequest)
- Edit: `src/lib/venue-bookings.functions.ts` (beacon request creation)
- Edit: `src/lib/saved-recommendations.functions.ts` (both planner + plan-quote sites)
