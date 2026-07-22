## Plan — Fillable Online Contracts

Let customers fill and sign the four existing contracts (Rental, Beacon Venue, Catering, Credit Card Auth) directly on the site, saving each completed submission as a PDF in Cloud Storage and emailing you a secure download link.

### 1. Storage & data

- New private storage bucket `contract-submissions` (admin-only via signed URLs).
- New table `public.contract_submissions`:
  - `id`, `created_at`, `contract_type` (rental/beacon/catering/cc-auth), `customer_name`, `customer_email`, `customer_phone`, `event_date`, `form_data` (jsonb — all field values), `typed_signature`, `signature_image_path` (storage path to PNG), `pdf_path` (storage path), `ip_address`, `user_agent`, `submitted_at`.
  - RLS: `INSERT` open to `anon` (public forms); `SELECT/UPDATE/DELETE` admin-only via `has_role`.
  - GRANTs: `INSERT` to `anon`, full to `authenticated` + `service_role`.

### 2. Shared form UI

- Add a **"Fill Out Online"** button next to each contract's Download button in `src/routes/rental-contract.tsx`.
- New route `/rental-contract/fill/$contractId` renders the correct form via a small component per contract:
  - `RentalContractForm`, `BeaconContractForm`, `CateringContractForm`, `CreditCardAuthForm`.
- Common fields captured for every contract: name, email, phone, event date, event address, itemized needs / relevant fields per contract.
- Signature block (shared component `SignaturePad`):
  - Typed full legal name (required)
  - Drawn signature via HTML5 canvas (required) — captured as PNG data URL
  - "I have read and agree" checkbox, date auto-stamped
- Zod validation client + server; disable submit until valid; honeypot + basic rate-limit check on server.

### 3. Credit Card Authorization — PCI-safe fields only

- Collect: cardholder name, billing zip, card brand (dropdown), **last 4 digits only**, authorized amount, authorization date range.
- Explicit inline disclaimer: "Do NOT enter full card number here — we'll contact you by phone to collect the full number securely."
- Server-side regex rejects any 13-19 digit sequence in free-text fields.

### 4. Server submission flow

New server route `POST /api/public/contracts/submit`:
1. Validate payload with Zod (per-contract schema).
2. Reject if free-text contains a full-length card number pattern.
3. Upload signature PNG to `contract-submissions/{id}/signature.png`.
4. Generate a filled PDF server-side using `pdf-lib` (Worker-compatible, pure JS): render the contract's static clauses + the customer's filled fields + typed name + signature image + timestamp.
5. Upload PDF to `contract-submissions/{id}/contract.pdf`.
6. Insert the row into `contract_submissions` via `supabaseAdmin`.
7. Create a 7-day signed URL for the PDF.
8. Call `sendAdminEmail` with new template `admin-contract-submission` → your inbox gets:
   - Contract type, customer summary, event date
   - "View signed contract PDF" button → signed URL
   - "View signature only" link
9. Also fire `sendCustomerAcknowledgement`-style auto-reply thanking them and confirming receipt (no PDF attached; link expires).
10. Return `{ ok: true }`; the page shows a success state ("Contract received — check your inbox for confirmation").

### 5. Email template

New `src/lib/email-templates/admin-contract-submission.tsx`:
- Brand header, contract title, submitter block (name / email / phone / event date), summary of key fields, prominent CTA button linking to the signed PDF URL, note that the link expires in 7 days.
- Registered in `src/lib/email-templates/registry.ts`.

### 6. Admin viewer (light)

- Simple admin page `/admin/contract-submissions` listing submissions with filters (contract type, date) and a "Download PDF" link (generates a fresh signed URL on click via a `requireSupabaseAuth` server function).

### 7. Packages

- Add `pdf-lib` (pure JS, Worker-compatible) for PDF generation.
- No native canvas — signature drawing uses the browser's HTML5 canvas; PNG is uploaded as-is.

### 8. Out of scope for this pass

- Full digital-signature legal certification (DocuSign-style audit trail beyond IP + timestamp).
- Storing full credit card numbers (explicitly excluded — Stripe integration would be a separate follow-up).
- Editing of already-submitted contracts.

### Verification

- Submit each of the four contracts end-to-end in the preview.
- Confirm PDF renders correctly, admin email arrives with a working signed link, customer gets the acknowledgement, row appears in the database.