## Goals

When a signed-in customer signs a contract from their account, the flow should:

1. **Pre-populate every possible field** from the linked quote (dates, times, location, guest count, items, customer info).
2. **Render the full contract terms inline** above the signature block, not just a link.
3. **Pick the correct contract type** for the quote (Beacon venue / Rental / Catering) instead of always defaulting to `rental-contract`.
4. **Expose the Credit Card Authorization** from the account, alongside the main contract.

UI/wiring only. No schema changes, no changes to `submitContract`, no changes to the admin side.

## Changes

### 1. Smart contract-type detection helper — `src/lib/contracts/detect-type.ts` (new)

Small pure helper `detectContractTypesForQuote(quote, items) → { primary: 'rental-contract'|'beacon-contract'|'catering-contract', all: string[] }`.

Heuristics from existing quote data:
- Beacon: any item name/category matches "beacon" (case-insensitive) → primary `beacon-contract`.
- Catering: any item category matches `catering` / `menu` / `bar` / `chef` / `buffet` → primary `catering-contract`.
- Else → `rental-contract`.
- `all` always includes the primary plus `credit-card-authorization`; Beacon or Catering quotes with rental items also include `rental-contract`.

### 2. `src/routes/account.quote.$id.tsx` — replace the single "Sign Rental Contract" button with a small `<ContractActions>` block

- Compute `detectContractTypesForQuote(quote, items)`.
- Render primary contract as the prominent gold button (label from `CONTRACT_LABEL`), and each additional contract (rental if applicable + Credit Card Authorization) as secondary outline buttons.
- Every link passes `params={{ contractId }}` and `search={{ quoteId: quote.id }}` (unchanged shape — `validateSearch` already accepts it).

### 3. `src/routes/account.index.tsx` — Contracts tab: add "Sign a new contract" section

Above the existing signed-contracts list, add four small tiles linking to each contract with no `quoteId` (blank-slate signing still works for standalone Credit Card Auth). Reuses `CONTRACT_LABEL`.

### 4. `src/routes/rental-contract.fill.$contractId.tsx` — deep prefill + inline terms

**a. Deeper prefill.** Extend the `useEffect` that runs on `quoteQuery.data`:
- Fetch also passes `items` — already returned by `getMyQuote`. Populate:
  - `customer_name`, `customer_email`, `customer_phone` (existing).
  - `billing_address` ← `quote.event_location` when empty (best guess; user can edit).
  - `event_type`, `event_date`, `event_location`, `guest_count`, `guest_count_estimated` (catering schema).
  - `delivery_date` ← `event_date`; `pickup_date` ← `event_date` (defaults; editable).
  - `rental_items` ← formatted list from `items` (`- {qty} × {name}` one per line, capped to `maxLength`).
  - `menu_selection` ← same formatted list for catering schema.
  - `event_start_time` / `event_end_time` left blank unless we ever store them (we don't today).
- Keep the existing "prev-wins" merge so anything the user has typed is preserved.

**b. Inline contract text.** Below the header (still above the form), render `doc.sections` — the same paragraphs shown on the hub page — inside a collapsible/scrollable panel titled "Full contract terms". Default open on desktop, collapsed on mobile (`<details>` element for a11y). The existing "Read the full contract text" outbound link stays as a fallback for a print/download view.

**c. Agree checkbox** copy updated to reference "the terms shown above" so it's clear the terms are on-page.

### 5. Credit Card Authorization gets a small notice

At the top of the `credit-card-authorization` fill page (detect by `schema.id`), show a subtle info panel: "For your security, only the last 4 digits are collected online. We'll call to capture the full card details before your event." (The schema already collects only last 4 — this just makes it explicit.)

## Out of scope

- Storing/serving event start/end times from quotes (they don't exist on `quotes` today).
- New DB columns, new server functions, changes to PDF rendering, admin UI.
- Payment processing / real card capture (this remains a manual authorization form).

## Verification

- Typecheck.
- Manual: from `/account/quote/:id`, buttons match the quote type; clicking through pre-fills customer, event, dates, and item list; the full contract terms are visible on the fill page; Credit Card Authorization is reachable from both the quote view and the Contracts tab.