## Problem

Clicking "Sign Contract" from `/account` navigates to `/rental-contract/fill/rental-contract?quoteId=...` but the page shown is the contracts hub (list of PDFs), not the signing form.

Root cause (confirmed in `src/routeTree.gen.ts`): TanStack Router treats `rental-contract.fill.$contractId.tsx` as a child of `rental-contract.tsx` because of flat dot-nesting. `src/routes/rental-contract.tsx` renders `ContractsHubPage` with no `<Outlet />`, so on any `/rental-contract/*` URL the child route matches but has nowhere to render — the hub renders instead.

## Fix

Convert `rental-contract` from a de-facto layout into a leaf sibling so both routes are independent:

1. Rename `src/routes/rental-contract.tsx` → `src/routes/rental-contract.index.tsx`. No code changes inside — `createFileRoute("/rental-contract")` stays valid (index files keep the parent's path).
2. Let the router plugin regenerate `src/routeTree.gen.ts`. After regen, `/rental-contract` and `/rental-contract/fill/$contractId` are sibling leaves; the signing form mounts.

## Verify

- Navigate to `/rental-contract` → still shows the contracts hub.
- From `/account` → Quotes tab → "Sign Contract" opens the fill form with the quote prefilled.
- Direct visit to `/rental-contract/fill/rental-contract` still works.
- Typecheck passes.

No other files need to change.