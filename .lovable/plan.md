# Full Customer Account Loop: Planner → Quote → Contract

Goal: any customer who starts an AI Tent Planner (or receives a quote / signs a contract) can see everything for their event in one place at `/account`, and admins have a clean pipeline to build the quote and get it back to them.

## Current state (verified)

- `saved_recommendations` has `user_id` (FK `auth.users`), status enum, and timestamps. The planner only saves when a user is already signed in — **guests lose their plan on refresh**.
- `quotes` links to `saved_recommendation_id` and stores `customer_email`, but has **no `user_id`** — the account page cannot query them.
- `contract_submissions` stores `customer_email` only — **no `user_id`, no `quote_id`**, and RLS SELECT is admin-only, so customers cannot see their own signed contracts.
- `/account` only lists recommendations. No quotes tab, no contracts tab. Contracts are only reachable from the standalone `/rental-contract` page.

## What we'll build

### 1. Planner → sign-up handoff (public → authed)

- After the AI Planner finishes, if the visitor is **not** signed in, show a "Save this plan to your account" step (email + password / Google) inline instead of the current silent skip. Stash the generated `input`, `recommendation`, `blueprint_image`, `perspective_image`, and `contact` in `sessionStorage` under a single key.
- Signup/login page reads the pending plan from `sessionStorage`, calls `saveRecommendation`, clears the key, and lands on `/account`.
- Signed-in users keep today's silent auto-save behavior.

### 2. Data-model changes (one migration)

- `quotes`: add `customer_user_id uuid` (nullable, FK `auth.users(id) ON DELETE SET NULL`) + index. Backfill from `saved_recommendations.user_id` where linked, else by matching `lower(customer_email)` against `profiles.email` (or the auth email view).
- `quote_items`: no schema change; new SELECT policy so a user can read items for a quote they own.
- `contract_submissions`: add `customer_user_id uuid` (nullable, FK) + `quote_id uuid` (nullable, FK `quotes(id) ON DELETE SET NULL`) + indexes. Backfill user_id by email match.
- New/updated RLS (in addition to existing admin policies):
  - `quotes` SELECT for `authenticated` where `customer_user_id = auth.uid()` OR `lower(customer_email) = lower(auth.jwt() ->> 'email')`.
  - `quote_items` SELECT for `authenticated` where the parent quote passes the same check (via `EXISTS`).
  - `contract_submissions` SELECT for `authenticated` where `customer_user_id = auth.uid()` OR email match.
  - Keep existing admin-manage policies intact.
- Signed download links for quote PDFs and signed contract PDFs are already generated via server functions; those stay admin-issued but the server fn will now also issue a link when the caller is the owning customer.

### 3. Server functions (all `requireSupabaseAuth`)

- `listMyQuotes()` — returns quotes the signed-in user owns, joined with a lightweight `quote_items` count and totals; includes signed PDF URL when available.
- `listMyContracts()` — returns the user's contract submissions with contract type, status (signed/pending), signed PDF signed URL (7-day, same helper we already use in admin email), and linked `quote_id`.
- `getMyQuote(id)` — single quote + items for the account detail view.
- `startContractForQuote(quoteId, contractType)` — creates a pre-filled `contract_submissions` draft (or returns the draft id) so we can jump to `/rental-contract/fill/$contractId` with the quote's data prefilled.
- Update `createQuote` / `sendQuote` in `src/lib/quotes.functions.ts` so any newly created quote sets `customer_user_id` from the source recommendation's `user_id`, or by email lookup if the recommendation isn't linked.
- Update `submitContract` in `src/lib/contracts/submit.functions.ts` so signed-in submissions stamp `customer_user_id` (and `quote_id` when the URL carries `?quote=`).

### 4. `/account` page rebuild

Convert the single-list page into three tabs (URL search param `tab=plans|quotes|contracts`, default `plans`):

- **Plans** — existing recommendations list, unchanged behavior.
- **Quotes** — cards per quote: quote #, event date/type, total, status (Draft / Sent / Approved / Booked), "View quote PDF" button (signed URL), "Sign rental contract" button when a signable contract type applies and no signed contract exists yet.
- **Contracts** — cards per submission: contract type, status (Pending signature / Signed on <date>), "Continue signing" (drafts) or "Download signed PDF" (signed). "Start new contract" dropdown seeded from `contract_type` list.

Add a summary strip at the top showing counts (e.g. "2 plans · 1 quote awaiting review · 1 contract to sign").

### 5. Admin quote flow (small touch-ups)

- On the admin quote builder (`admin.quotes_.$id.edit.tsx`), keep today's build/send, and when marking as "sent" also update the linked `saved_recommendations.status` to `quote_sent` (already partially wired — verify + fix gaps).
- When sending the customer quote email, include a **"View & sign in your account"** CTA linking to `/account?tab=quotes` (and a direct sign-contract link when a contract is required).
- Admin bell / notifications continue to fire on planner submission and quote request (existing behavior preserved).

### 6. Contract flow adjustments

- `/rental-contract/fill/$contractId` accepts an optional `?quote=<id>` search param. When present and the signed-in user owns the quote, prefill customer name/email/phone/event date from the quote, and set `quote_id` on submit.
- After a customer submits a contract, redirect to `/account?tab=contracts` with a success toast.
- Admin submission email already includes the signed PDF link — no change.

## Verification checklist (run after build)

1. Guest completes planner → prompted to create account → after signup lands on `/account` with the plan saved.
2. Signed-in customer requests a quote from a plan → status shows "Quote requested"; admin sees the request in `/admin/quote-requests`.
3. Admin builds and sends a quote → customer sees it under `/account?tab=quotes` and receives the acknowledgement + quote email with the "View in account" link.
4. Customer opens the quote, clicks "Sign rental contract" → lands on the fill page prefilled from the quote → submits → shows in `/account?tab=contracts` as Signed.
5. Admin sees the new contract submission and the linked quote reference in the admin contract list.

## Technical details

- Migration is additive (new columns + policies); no destructive changes. Backfill runs in the same migration.
- Route file layout stays flat (`src/routes/account.index.tsx`, `account.$id.tsx`); the tabbed layout is a component swap inside `account.index.tsx` driven by `validateSearch`.
- All new list/detail server fns are `.middleware([requireSupabaseAuth])` and called from `_authenticated`-safe pages only.
- Signed PDF URLs use the existing helper in `src/lib/contracts/submit.functions.ts` / quote email pipeline — TTL 7 days, regenerated on each account page view.
- No changes to Lovable Cloud auth providers, email domain setup, or existing admin RLS.

## Out of scope

- Payments / deposits (the `quotes` table already has Stripe columns but there's no UI plan here — separate ask).
- Marketing emails or bulk notifications.
- Multi-user shared accounts (each customer has their own auth user).
